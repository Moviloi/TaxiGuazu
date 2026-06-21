// ARCHITECTURE NOTE (Phase C4): Dispatch workflow FSM (nivel_1/2/3, waiting_driver).
// Writes dispatch_state. This module is dispatch-only, no conversational logic.

import { getConversationById } from "@/lib/db/database";
import { getDispatchState, setDispatchState } from "@/lib/db/state-accessors";
import type { DispatchState } from "@/lib/ai/types";
import {
  getExpiredByState as getExpiredByStateFromDb,
  getStaleWorkflowsFromDb,
  assignWorkflowAtomic as assignWorkflowAtomicFromDb,
} from "@/lib/db/database";
import { log } from "@/lib/utils/logger";

const VALID_TRANSITIONS: Record<DispatchState, DispatchState[]> = {
  idle: ["nivel_1", "waiting_driver", "closed"],
  nivel_1: ["nivel_2", "closed"],
  nivel_2: ["nivel_3", "closed"],
  nivel_3: ["closed"],
  waiting_driver: ["closed"],
  closed: [],
};

export interface DispatchWorkflowContext {
  conversationId: number;
  phone: string;
  state: DispatchState;
}

function rowToContext(phone: string, convId: number, state: string | null): DispatchWorkflowContext {
  return {
    conversationId: convId,
    phone,
    state: (state || "idle") as DispatchState,
  };
}

async function transitionTo(phone: string, newState: DispatchState): Promise<void> {
  const current = await getDispatchState(phone);
  const allowed = VALID_TRANSITIONS[current];
  if (allowed && !allowed.includes(newState)) {
    log.warn(`[STATEMACHINE] Transición inválida: ${current} → ${newState}`);
  }
  await setDispatchState(phone, newState);
}

export async function getDispatchWorkflow(convId: number): Promise<DispatchWorkflowContext | null> {
  const conv = await getConversationById(convId);
  if (!conv) return null;
  const state = await getDispatchState(conv.phone);
  return rowToContext(conv.phone, convId, state);
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

export async function getExpiredByState(state: DispatchState, timeoutMs: number): Promise<DispatchWorkflowContext[]> {
  const rows = await getExpiredByStateFromDb(state, timeoutMs);
  return rows.map((row) => ({
    conversationId: row.conversationId,
    phone: row.phone,
    state: row.dispatchWorkflowState as DispatchState,
  }));
}

export async function getStaleWorkflows(timeoutMs: number): Promise<DispatchWorkflowContext[]> {
  const rows = await getStaleWorkflowsFromDb(timeoutMs);
  return rows.map((row) => ({
    conversationId: row.conversationId,
    phone: row.phone,
    state: row.dispatchWorkflowState as DispatchState,
  }));
}

export async function assignWorkflowAtomic(phone: string): Promise<boolean> {
  const ok = await assignWorkflowAtomicFromDb(phone);
  log.info(`[ASSIGN] rowsAffected=${ok ? 1 : 0} ok=${ok}`);
  return ok;
}
