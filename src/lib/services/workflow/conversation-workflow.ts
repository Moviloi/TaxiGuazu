// ARCHITECTURE NOTE (Phase C4): Dispatch workflow FSM (nivel_1/2/3, waiting_driver).
// Writes chat_sessions.workflow_state — SAME column as slot-workflow.ts (conversational
// states: idle, collecting_slots, awaiting_confirmation). Both modules share this column
// with no mutex or coordination.
//
// Future: split into dispatch_state + conversational_state columns.
// Until then, do NOT add new states without checking the other module's transition map.
// This module is semi-frozen — dispatch changes only, no conversational logic.

import {
  getChatSession,
  getConversationById,
  setChatSessionWorkflowState,
  getExpiredByState as getExpiredByStateFromDb,
  getStaleWorkflowsFromDb,
  assignWorkflowAtomic as assignWorkflowAtomicFromDb,
} from "@/lib/db/database";
import { log } from "@/lib/utils/logger";

export type WorkflowState =
  | "idle"
  | "collecting_slots"
  | "awaiting_confirmation"
  | "post_trip_opportunity"
  | "nivel_1"
  | "nivel_2"
  | "nivel_3"
  | "waiting_driver"
  | "closed";

// Source of truth: chat_sessions.workflow_state
// La tabla `workflows` quedó sin callers activos y es candidata a DROP.
const VALID_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  idle: ["collecting_slots", "awaiting_confirmation", "nivel_1", "waiting_driver"],
  collecting_slots: ["awaiting_confirmation", "nivel_1", "waiting_driver"],
  awaiting_confirmation: ["nivel_1", "waiting_driver", "closed", "post_trip_opportunity"],
  post_trip_opportunity: ["idle", "closed"],
  nivel_1: ["nivel_2", "closed"],
  nivel_2: ["nivel_3", "closed"],
  nivel_3: ["closed"],
  waiting_driver: ["closed"],
  closed: [],
};

export interface WorkflowContext {
  conversationId: number;
  phone: string;
  state: WorkflowState;
}

function rowToContext(phone: string, convId: number, state: string | null): WorkflowContext {
  return {
    conversationId: convId,
    phone,
    state: (state || "idle") as WorkflowState,
  };
}

async function transitionTo(phone: string, newState: WorkflowState): Promise<void> {
  const session = await getChatSession(phone);
  const current = (session?.workflow_state || "idle") as WorkflowState;
  const allowed = VALID_TRANSITIONS[current];
  if (allowed && !allowed.includes(newState)) {
    log.warn(`[STATEMACHINE] Transición inválida: ${current} → ${newState}`);
  }
  await setChatSessionWorkflowState(phone, newState);
}

export async function getWorkflow(convId: number): Promise<WorkflowContext | null> {
  const conv = await getConversationById(convId);
  if (!conv) return null;
  const session = await getChatSession(conv.phone);
  if (!session) return null;
  return rowToContext(conv.phone, convId, session.workflow_state);
}

export async function advanceToNivel1(_convId: number, phone: string): Promise<void> {
  await transitionTo(phone, "nivel_1");
}

export async function advanceToNivel2(_convId: number, phone: string): Promise<void> {
  await transitionTo(phone, "nivel_2");
}

export async function advanceToNivel3(_convId: number, phone: string): Promise<void> {
  await transitionTo(phone, "nivel_3");
}

export async function advanceToWaitingDriver(_convId: number, phone: string): Promise<void> {
  await transitionTo(phone, "waiting_driver");
}

export async function closeWorkflow(convId: number): Promise<void> {
  const conv = await getConversationById(convId);
  if (!conv) return;
  await transitionTo(conv.phone, "closed");
}

export async function resetToIdle(convId: number): Promise<void> {
  const conv = await getConversationById(convId);
  if (!conv) return;
  await transitionTo(conv.phone, "idle");
}

export async function getExpiredByState(state: WorkflowState, timeoutMs: number): Promise<WorkflowContext[]> {
  const rows = await getExpiredByStateFromDb(state, timeoutMs);
  return rows.map((row) => ({
    conversationId: row.conversationId,
    phone: row.phone,
    state: row.workflowState as WorkflowState,
  }));
}

export async function getStaleWorkflows(timeoutMs: number): Promise<WorkflowContext[]> {
  const rows = await getStaleWorkflowsFromDb(timeoutMs);
  return rows.map((row) => ({
    conversationId: row.conversationId,
    phone: row.phone,
    state: row.workflowState as WorkflowState,
  }));
}

export async function assignWorkflowAtomic(phone: string): Promise<boolean> {
  const ok = await assignWorkflowAtomicFromDb(phone);
  log.info(`[ASSIGN] rowsAffected=${ok ? 1 : 0} ok=${ok}`);
  return ok;
}
