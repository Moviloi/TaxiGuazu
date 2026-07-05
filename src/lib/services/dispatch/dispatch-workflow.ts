// ARCHITECTURE NOTE (Phase C4): Dispatch workflow FSM (nivel_1/2/3, waiting_driver).
// Writes dispatch_state. This module is dispatch-only, no conversational logic.
//
// AIT-043: event logger — cada transición de dispatch_state escribe un evento
// en dispatch_events (append-only audit log). Ver cobertura en el comentario
// GAP-05 dentro de transitionTo().

import { getConversationById, getActiveTripByPhone, insertDispatchEvent } from "@/lib/db/database";
import { getDispatchState, setDispatchState } from "@/lib/db/state-accessors";
import type { DispatchState } from "@/lib/ai/types";
import type { DispatchEventType, DispatchEventLevel } from "@/lib/db/types";
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

async function transitionTo(phone: string, newState: DispatchState, eventType: DispatchEventType): Promise<void> {
  const current = await getDispatchState(phone);
  const allowed = VALID_TRANSITIONS[current];
  if (allowed && !allowed.includes(newState)) {
    log.warn(`[STATEMACHINE] Transición inválida: ${current} → ${newState}`);
  }
  await setDispatchState(phone, newState);

  // ── Event logger best-effort ──
  // GAP-05 (mismo patrón que trip_events): el INSERT y el setDispatchState
  // son auto-commit independientes. No se garantiza atomicidad.
  // La tabla dispatch_events es append-only; si el INSERT falla, el estado
  // ya fue cambiado sin auditoría.
  //
  // Cobertura actual: este bloque cubre TODAS las transiciones gestionadas
  // por transitionTo(). Las transiciones a "idle" desde resetToIdle()
  // se omiten (no generan evento). El bypass assignWorkflowAtomic()
  // se trata por separado (ver AIT-043 PASO E).
  if (newState !== "idle") {
    const trip = await getActiveTripByPhone(phone);
    if (trip) {
      // El nivel es el estado DESTINO si es un dispatch level,
      // o el estado ACTUAL (pre-transición) para transiciones a "closed".
      const level: DispatchEventLevel | null = (
        ["nivel_1", "nivel_2", "nivel_3", "waiting_driver"].includes(newState)
          ? newState as DispatchEventLevel
          : (["nivel_1", "nivel_2", "nivel_3", "waiting_driver"].includes(current)
            ? current as DispatchEventLevel
            : null)
      );
      await insertDispatchEvent(trip.trip_id, eventType, level, phone);
    }
  }
}

export async function getDispatchWorkflow(convId: number): Promise<DispatchWorkflowContext | null> {
  const conv = await getConversationById(convId);
  if (!conv) return null;
  const state = await getDispatchState(conv.phone);
  return rowToContext(conv.phone, convId, state);
}

export async function advanceToNivel1(_convId: number, phone: string): Promise<void> {
  await transitionTo(phone, "nivel_1", "DispatchInitiated");
}

export async function advanceToNivel2(_convId: number, phone: string): Promise<void> {
  await transitionTo(phone, "nivel_2", "DispatchOffered");
}

export async function advanceToNivel3(_convId: number, phone: string): Promise<void> {
  await transitionTo(phone, "nivel_3", "DispatchBroadcasted");
}

export async function advanceToWaitingDriver(_convId: number, phone: string): Promise<void> {
  await transitionTo(phone, "waiting_driver", "DispatchInitiated");
}

export async function closeWorkflow(convId: number, eventType: DispatchEventType): Promise<void> {
  const conv = await getConversationById(convId);
  if (!conv) return;
  await transitionTo(conv.phone, "closed", eventType);
}

export async function resetToIdle(convId: number): Promise<void> {
  const conv = await getConversationById(convId);
  if (!conv) return;
  // Transiciones a "idle" se omiten en transitionTo (newState === "idle").
  // El eventType es irrelevante, se pasa solo por completitud de firma.
  await transitionTo(conv.phone, "idle", "DispatchAbandoned");
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

export async function assignWorkflowAtomic(phone: string, driverPhone: string): Promise<boolean> {
  const ok = await assignWorkflowAtomicFromDb(phone, driverPhone);
  log.info(`[ASSIGN] rowsAffected=${ok ? 1 : 0} ok=${ok}`);
  return ok;
}
