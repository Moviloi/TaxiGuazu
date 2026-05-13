import {
  getWorkflow as dbGetWorkflow,
  deleteWorkflow,
  getExpiredWorkflows as dbGetExpiredWorkflows,
  closeWorkflow as dbCloseWorkflow,
  advanceWorkflowToGroup,
} from "@/lib/db/database";

export type WorkflowState = "idle" | "waiting_group" | "closed";

export interface WorkflowContext {
  conversationId: number;
  phone: string;
  state: WorkflowState;
  tripId?: string;
  assignedDriverPhone?: string;
  groupAskedAt?: number;
  lastMessageAt: number;
}

function rowToContext(row: any): WorkflowContext {
  return {
    conversationId: row.conversation_id,
    phone: row.phone,
    state: row.state,
    tripId: row.trip_id,
    assignedDriverPhone: row.assigned_driver_phone,
    groupAskedAt: row.group_asked_at ? row.group_asked_at * 1000 : undefined,
    lastMessageAt: row.last_message_at * 1000,
  };
}

export async function getWorkflow(convId: number): Promise<WorkflowContext | undefined> {
  const row = await dbGetWorkflow(convId);
  return row ? rowToContext(row) : undefined;
}

export async function advanceToGroup(convId: number, phone: string): Promise<void> {
  await advanceWorkflowToGroup(convId, phone);
}

export async function closeWorkflow(convId: number, driverPhone?: string): Promise<void> {
  await dbCloseWorkflow(convId, driverPhone);
}

export async function resetToIdle(convId: number): Promise<void> {
  await deleteWorkflow(convId);
}

export async function isWorkflowActive(convId: number): Promise<boolean> {
  const ctx = await getWorkflow(convId);
  return ctx !== undefined && ctx.state !== "closed";
}

export async function getExpiredGroupTimeouts(timeoutMs: number): Promise<WorkflowContext[]> {
  const rows = await dbGetExpiredWorkflows(timeoutMs);
  return rows.map(rowToContext);
}
