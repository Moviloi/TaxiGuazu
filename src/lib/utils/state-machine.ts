import {
  getWorkflow as dbGetWorkflow,
  deleteWorkflow,
  getExpiredWorkflows as dbGetExpiredWorkflows,
  getExpiredWorkflowsByState as dbGetExpiredByState,
  closeWorkflow as dbCloseWorkflow,
  advanceWorkflowState as dbAdvanceState,
} from "@/lib/db/database";

export type WorkflowState = "idle" | "awaiting_slot" | "waiting_preferred" | "waiting_backup" | "waiting_group" | "closed";

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

export async function getWorkflow(convId: number): Promise<WorkflowContext | null> {
  const row = await dbGetWorkflow(convId);
  return row ? rowToContext(row) : null;
}

export async function advanceToSlotSelection(convId: number, phone: string): Promise<void> {
  await dbAdvanceState(convId, phone, "awaiting_slot");
}

export async function advanceToPreferred(convId: number, phone: string): Promise<void> {
  await dbAdvanceState(convId, phone, "waiting_preferred");
}

export async function advanceToBackup(convId: number, phone: string): Promise<void> {
  await dbAdvanceState(convId, phone, "waiting_backup");
}

export async function advanceToGroup(convId: number, phone: string): Promise<void> {
  await dbAdvanceState(convId, phone, "waiting_group");
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
