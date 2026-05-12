export type WorkflowState = "idle" | "waiting_admin" | "waiting_group" | "closed";

export interface WorkflowContext {
  conversationId: number;
  phone: string;
  state: WorkflowState;
  tripId?: string;
  assignedDriverPhone?: string;
  adminAskedAt?: number;
  groupAskedAt?: number;
  lastMessageAt: number;
}

const workflows = new Map<number, WorkflowContext>();

export function getWorkflow(convId: number): WorkflowContext | undefined {
  return workflows.get(convId);
}

export function setWorkflow(convId: number, ctx: WorkflowContext): void {
  workflows.set(convId, ctx);
}

export function clearWorkflow(convId: number): void {
  workflows.delete(convId);
}

export function advanceToAdmin(convId: number, tripId: string): void {
  const existing = workflows.get(convId);
  workflows.set(convId, {
    ...(existing || {}),
    conversationId: convId,
    state: "waiting_admin",
    tripId,
    adminAskedAt: Date.now(),
    lastMessageAt: Date.now(),
  } as WorkflowContext);
}

export function advanceToGroup(convId: number): void {
  const existing = workflows.get(convId);
  workflows.set(convId, {
    ...(existing || {}),
    state: "waiting_group",
    groupAskedAt: Date.now(),
    lastMessageAt: Date.now(),
  } as WorkflowContext);
}

export function closeWorkflow(convId: number, driverPhone?: string): void {
  const existing = workflows.get(convId);
  workflows.set(convId, {
    ...(existing || {}),
    state: "closed",
    assignedDriverPhone: driverPhone,
    lastMessageAt: Date.now(),
  } as WorkflowContext);
}

export function resetToIdle(convId: number): void {
  workflows.delete(convId);
}

export function isWorkflowActive(convId: number): boolean {
  const ctx = workflows.get(convId);
  return ctx !== undefined && ctx.state !== "closed";
}

export function getExpiredAdminTimeouts(timeoutMs: number): WorkflowContext[] {
  const now = Date.now();
  const expired: WorkflowContext[] = [];
  for (const ctx of workflows.values()) {
    if (ctx.state === "waiting_admin" && ctx.adminAskedAt) {
      if (now - ctx.adminAskedAt > timeoutMs) {
        expired.push(ctx);
      }
    }
  }
  return expired;
}

export function getExpiredGroupTimeouts(timeoutMs: number): WorkflowContext[] {
  const now = Date.now();
  const expired: WorkflowContext[] = [];
  for (const ctx of workflows.values()) {
    if (ctx.state === "waiting_group" && ctx.groupAskedAt) {
      if (now - ctx.groupAskedAt > timeoutMs) {
        expired.push(ctx);
      }
    }
  }
  return expired;
}