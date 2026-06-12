// F8: POLICY SIMULATION & GUARDRAILS — frozen (FASE A). Pipeline experimental F7→F8→F9.
// FUTURE RESPONSIBILITY: Simular políticas y aplicar guardrails de decisión.
// CURRENT STATUS: Cableado en learning-pipeline.service.ts como pipeline bloqueado. No modificar.
// MIGRATION NOTE: F8 usa f9-error para logging. Todo el pipeline se desbloquea junto.

import type { SafetyGuardrail, PolicyCondition } from "./f8-types";
import type { SystemLoad } from "./f7-types";

const HARDCODED_GUARDRAILS: SafetyGuardrail[] = [
  {
    id: "critical_load",
    name: "Carga crítica: bloquear ofertas de bajo valor",
    condition: [{ field: "driverAvailability", operator: "lte", value: 2 }],
    level: "critical",
    action: "block",
    message: "Sistema con carga crítica. Ofertas de bajo valor bloqueadas.",
  },
  {
    id: "high_escalation",
    name: "Escalación alta: forzar modo CLARIFICATION",
    condition: [{ field: "escalationRate", operator: "gt", value: 0.5 }],
    level: "warning",
    action: "override_f4",
    message: "Tasa de escalación alta. Forzando modo clarificación.",
  },
  {
    id: "revenue_drop",
    name: "Caída de revenue: desactivar descuentos agresivos",
    condition: [{ field: "revenueDrop", operator: "eq", value: true }],
    level: "warning",
    action: "disable_policy",
    message: "Caída de revenue detectada. Descuentos agresivos desactivados.",
  },
];

function matchGuardrailCondition(condition: PolicyCondition[], context: Record<string, unknown>): boolean {
  return condition.every((c) => {
    const value = context[c.field];
    switch (c.operator) {
      case "eq": return value === c.value;
      case "neq": return value !== c.value;
      case "gt": return typeof value === "number" && typeof c.value === "number" && value > c.value;
      case "gte": return typeof value === "number" && typeof c.value === "number" && value >= c.value;
      case "lt": return typeof value === "number" && typeof c.value === "number" && value < c.value;
      case "lte": return typeof value === "number" && typeof c.value === "number" && value <= c.value;
      default: return false;
    }
  });
}

export async function evaluateGuardrails(
  load: SystemLoad,
  escalationRate: number,
  revenueDrop: boolean,
): Promise<SafetyGuardrail[]> {
  const ctx: Record<string, unknown> = {
    driverAvailability: load.driversAvailable,
    queueLength: load.queueLength,
    peakTime: load.peakTime,
    escalationRate,
    revenueDrop,
  };

  return HARDCODED_GUARDRAILS.filter((g) => matchGuardrailCondition(g.condition, ctx));
}
