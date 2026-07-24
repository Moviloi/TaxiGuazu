// ARCHITECTURE NOTE: This module manages conversational slot-collection states
// via conversational_state (chat_sessions column).
//
// ── INV-18: Interpretación del campo esperado ──
// El campo `clarifyField` se determina en evaluateWorkflowTransition() a partir
// del `extractionResult.clarify_field`, que a su vez es establecido por:
//   1. extract-slots.ts / extraction-schema.ts → determina qué campo falta
//      según el domain (booking o ahora) y los slots actuales.
//   2. completeness-engine → evalúa si los slots existentes son suficientes
//      para proceder, identificando el campo prioritario faltante.
//   3. resolveSimpleFieldGap (field-resolver.ts) → mapeo explícito de gaps.
//
// La interpretación del campo esperado NO está centralizada en slot-workflow
// porque el conocimiento sobre qué campo falta reside en el motor de extracción
// (extraction-schema) y el motor de completitud (completeness-engine).
// slot-workflow solo PERSISTE y COMUNICA el clarifyField entre turnos.
//
// Flujo:
//   extract-slots determina campo faltante → extraction-schema.clarify_field
//   → extraction-runner pasa al workflow → slot-workflow PERSISTE en DB
//   → próximo turno: handler/lead-service LEE de DB y usa resolveSimpleFieldGap
//
// Esta distribución es INTENCIONAL: cada capa tiene el conocimiento necesario
// (extraction → qué extraer, completeness → qué falta, workflow → estado).

import { getChatSession, resetChatSession } from "@/lib/db/database";
import { getConversationalState, setConversationalState } from "@/lib/db/state-accessors";
import { getActiveTripByPhone } from "@/lib/db/database";
import { SESSION_INACTIVITY_48H_S } from "@/config/constants";
import type { ExtractionResult } from "@/lib/ai/extraction-schema";
import type { ConversationalState } from "@/lib/ai/types";
import { log } from "@/lib/utils/logger";

export interface SlotConversationalContext {
  state: ConversationalState;
  clarifyField: string | null;
  overallConfidence: number;
  action: ExtractionResult["action"];
  askForConfirmation: boolean;
}

const VALID_SLOT_TRANSITIONS: Record<ConversationalState, ConversationalState[]> = {
  idle: ["collecting_slots", "awaiting_confirmation"],
  collecting_slots: ["collecting_slots", "slot_confirmation", "awaiting_confirmation"],
  slot_confirmation: ["collecting_slots", "awaiting_passenger", "awaiting_confirmation", "pending_human_review"],
  awaiting_passenger: ["collecting_slots", "awaiting_confirmation"],
  awaiting_confirmation: ["collecting_slots"],
  pending_human_review: ["idle"],
  ambiguity_pending: ["slot_confirmation", "idle", "collecting_slots"],
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
): Promise<SlotConversationalContext> {
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

  // Step 2: Get current conversational state
  const currentState = await getConversationalState(phone);

  // Step 3: Determine new state based on confidence
  let newState: ConversationalState;
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
  await setConversationalState(phone, newState, clarifyField ?? undefined);

  return {
    state: newState,
    clarifyField,
    overallConfidence: extractionResult.overall_confidence,
    action: extractionResult.action,
    askForConfirmation,
  };
}
