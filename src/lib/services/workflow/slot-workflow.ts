// ARCHITECTURE NOTE (Phase C4): This module manages conversational slot-collection states
// via chat_sessions.workflow_state. The SAME column is also written by
// conversation-workflow.ts (dispatch states: nivel_1/2/3, waiting_driver).
// Both modules can overwrite each other's state — no mutex or coordination exists.
// Future: split workflow_state into conversational_state and dispatch_state columns.
// Until then, slot-workflow must NOT write dispatch states, and conversation-workflow
// must NOT write slot states. Review on any state transition change.

import { getChatSession, resetChatSession, updateChatSessionWorkflow } from "@/lib/db/database";
import { getActiveTripByPhone } from "@/lib/db/database";
import { SESSION_INACTIVITY_48H_S } from "@/config/constants";
import type { ExtractionResult } from "@/lib/ai/extraction-schema";
import { log } from "@/lib/utils/logger";

export type SlotWorkflowState = "idle" | "collecting_slots" | "awaiting_confirmation" | "closed";

export interface SlotWorkflowContext {
  state: SlotWorkflowState;
  clarifyField: string | null;
  overallConfidence: number;
  action: ExtractionResult["action"];
  askForConfirmation: boolean;
}

const VALID_SLOT_TRANSITIONS: Record<SlotWorkflowState, SlotWorkflowState[]> = {
  idle: ["collecting_slots", "closed"],
  collecting_slots: ["collecting_slots", "awaiting_confirmation", "closed"],
  awaiting_confirmation: ["collecting_slots", "closed"],
  closed: [],
};

async function checkSessionExpiry(phone: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);

  // Check if there's an active trip with scheduled_at in the past
  const trip = await getActiveTripByPhone(phone);
  if (trip && trip.scheduled_at && trip.scheduled_at < now) {
    log.info(`[SLOT_STATE] Trip ${trip.trip_id} expired, resetting session`);
    await resetChatSession(phone);
    return true;
  }

  // Check inactivity > 48h
  const session = await getChatSession(phone);
  if (session && session.updated_at) {
    const inactiveFor = now - session.updated_at;
    if (inactiveFor > SESSION_INACTIVITY_48H_S) {
      log.info(`[SLOT_STATE] Session stale (>48h inactivity), resetting`);
      await resetChatSession(phone);
      return true;
    }
  }

  return false;
}

export async function evaluateWorkflowTransition(
  phone: string,
  extractionResult: ExtractionResult,
): Promise<SlotWorkflowContext> {
  // Step 1: Check session expiry (resets if stale)
  const expired = await checkSessionExpiry(phone);
  if (expired) {
    return {
      state: "idle",
      clarifyField: null,
      overallConfidence: extractionResult.overall_confidence,
      action: extractionResult.action,
      askForConfirmation: false,
    };
  }

  // Step 2: Get current session (or start fresh)
  const session = await getChatSession(phone);
  const currentState: SlotWorkflowState = (session?.workflow_state as SlotWorkflowState) || "idle";

  // Step 3: Determine new state based on confidence
  let newState: SlotWorkflowState;
  let clarifyField: string | null = null;
  let askForConfirmation = false;

  if (extractionResult.action === "proceed") {
    // All mandatory fields have confidence >= 0.7
    if (currentState === "idle" || currentState === "collecting_slots") {
      newState = "awaiting_confirmation";
      askForConfirmation = true;
    } else {
      newState = currentState;
    }
  } else if (extractionResult.action === "clarify") {
    // Between 0.3 and 0.7 — stay collecting_slots
    newState = "collecting_slots";
    clarifyField = extractionResult.clarify_field || null;
  } else {
    // fallback_regex — below 0.3, go to collecting_slots if idle
    newState = currentState === "idle" ? "collecting_slots" : currentState;
    clarifyField = extractionResult.clarify_field || null;
  }

  // Validate transition
  const allowed = VALID_SLOT_TRANSITIONS[currentState];
  if (allowed && !allowed.includes(newState)) {
    log.warn(`[SLOT_STATE] Invalid transition: ${currentState} → ${newState}`);
    newState = currentState;
  }

  // Step 4: Persist
  await updateChatSessionWorkflow(phone, newState, clarifyField ?? undefined);

  return {
    state: newState,
    clarifyField,
    overallConfidence: extractionResult.overall_confidence,
    action: extractionResult.action,
    askForConfirmation,
  };
}
