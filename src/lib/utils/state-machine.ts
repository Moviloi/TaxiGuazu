import {
  getWorkflow as dbGetWorkflow,
  deleteWorkflow,
  getExpiredWorkflows as dbGetExpiredWorkflows,
  getExpiredWorkflowsByState as dbGetExpiredByState,
  closeWorkflow as dbCloseWorkflow,
  advanceWorkflowState as dbAdvanceState,
} from "@/lib/db/database";

export type WorkflowState = "idle" | "awaiting_slot" | "nivel_1" | "nivel_2" | "nivel_3" | "waiting_group" | "waiting_driver" | "waiting_preferred" | "waiting_backup" | "closed";

const VALID_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  idle: ["awaiting_slot", "nivel_1", "nivel_2", "nivel_3", "waiting_driver", "waiting_group"],
  nivel_1: ["nivel_2", "nivel_3"],
  nivel_2: ["nivel_3"],
  nivel_3: ["closed"],
  waiting_group: ["closed"],
  waiting_driver: ["closed"],
  awaiting_slot: ["closed"],
  waiting_preferred: ["nivel_3"],
  waiting_backup: ["nivel_3"],
  closed: [],
};

export interface WorkflowContext {
  conversationId: number;
  phone: string;
  state: WorkflowState;
  tripId: string | null;
  assignedDriverPhone: string | null;
  groupAskedAt: number | null;
  lastMessageAt: number;
}

function rowToContext(row: any): WorkflowContext {
  return {
    conversationId: row.conversation_id,
    phone: row.phone,
    state: row.state,
    tripId: row.trip_id || null,
    assignedDriverPhone: row.assigned_driver_phone || null,
    groupAskedAt: row.group_asked_at ? row.group_asked_at * 1000 : null,
    lastMessageAt: row.last_message_at * 1000,
  };
}

async function transitionTo(convId: number, phone: string, newState: WorkflowState): Promise<void> {
  const workflow = await dbGetWorkflow(convId);
  if (workflow) {
    const allowed = VALID_TRANSITIONS[workflow.state as WorkflowState];
    if (!allowed?.includes(newState)) {
      console.warn(`[STATEMACHINE] Transición inválida: ${workflow.state} → ${newState} (conv ${convId})`);
    }
  }
  await dbAdvanceState(convId, phone, newState);
}

export async function getWorkflow(convId: number): Promise<WorkflowContext | null> {
  const row = await dbGetWorkflow(convId);
  return row ? rowToContext(row) : null;
}

export async function advanceToSlotSelection(convId: number, phone: string): Promise<void> {
  await transitionTo(convId, phone, "awaiting_slot");
}

export async function advanceToNivel1(convId: number, phone: string): Promise<void> {
  await transitionTo(convId, phone, "nivel_1");
}

export async function advanceToNivel2(convId: number, phone: string): Promise<void> {
  await transitionTo(convId, phone, "nivel_2");
}

export async function advanceToNivel3(convId: number, phone: string): Promise<void> {
  await transitionTo(convId, phone, "nivel_3");
}

export async function advanceToWaitingDriver(convId: number, phone: string): Promise<void> {
  await transitionTo(convId, phone, "waiting_driver");
}

export async function advanceToGroup(convId: number, phone: string): Promise<void> {
  await transitionTo(convId, phone, "waiting_group");
}

export async function closeWorkflow(convId: number, driverPhone?: string): Promise<void> {
  await dbCloseWorkflow(convId, driverPhone);
}

export async function resetToIdle(convId: number): Promise<void> {
  await deleteWorkflow(convId);
}

export async function isWorkflowActive(convId: number): Promise<boolean> {
  const ctx = await getWorkflow(convId);
  return ctx !== null && ctx.state !== "closed";
}

export async function getExpiredGroupTimeouts(timeoutMs: number): Promise<WorkflowContext[]> {
  const rows = await dbGetExpiredWorkflows(timeoutMs);
  return rows.map(rowToContext);
}

export async function getExpiredByState(state: WorkflowState, timeoutMs: number): Promise<WorkflowContext[]> {
  const rows = await dbGetExpiredByState(state, timeoutMs);
  return rows.map(rowToContext);
}