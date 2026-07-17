// DRL Rule — Consistencia: detecta conflictos lógicos entre slots.
// CE-3B §3.2: Consistencia lógica entre valores de una sesión.
// PR-5A: Foundation — stub.
// PR-5D: Implementación real — detección de conflictos semánticos.

import type { DRLRule, DRLRuleResult, DRLInput } from "@/lib/drl/types";

export interface ConsistenciaDetails {
  hasConflicts: boolean;
  conflictCount: number;
  conflicts: string[];
  /** Conflictos categorizados por severidad */
  severityLevel: "none" | "low" | "medium" | "high";
}

// ─── Validaciones de consistencia ──────────────────────────────────────────

interface ConflictCheck {
  severity: "low" | "medium" | "high";
  message: string;
}

function checkOriginDestinationConflict(slots: Record<string, unknown>): ConflictCheck | null {
  const origin = String(slots.origin ?? "").toLowerCase().trim();
  const destination = String(slots.destination ?? "").toLowerCase().trim();

  if (!origin || !destination) return null;
  if (origin === destination) {
    return {
      severity: "high",
      message: `Origen y destino son iguales: "${origin}"`,
    };
  }

  // Detectar sinónimos de misma ubicación
  const synonyms = new Map<string, string[]>([
    ["iguazú", ["puerto iguazú", "iguazu", "pto iguazu", "pto iguazú"]],
    ["foz", ["foz do iguaçu", "foz do iguacu", "iguazu brasil"]],
    ["cataratas", ["cataratas del iguazú", "parque nacional iguazú", "iguazu falls"]],
    ["aeropuerto", ["aeropuerto iguazú", "aeropuerto internacional de puerto iguazú", "aep", "aeropuerto mayo pupa"]],
    ["cd", ["ciudad del este", "cde", "py"]],
  ]);

  for (const [, aliases] of synonyms) {
    const originIsSynonym = aliases.some(a => origin.includes(a) || a.includes(origin));
    const destIsSynonym = aliases.some(a => destination.includes(a) || a.includes(destination));
    if (originIsSynonym && destIsSynonym && origin !== destination) {
      // Misma categoría semántica — ejemplo, "cataratas" y "parque nacional iguazú"
      // Esto es un warning leve, no necesariamente conflicto
      return {
        severity: "low",
        message: `Origen y destino referencian ubicaciones relacionadas: "${origin}" vs "${destination}"`,
      };
    }
  }

  return null;
}

function checkDateConflict(slots: Record<string, unknown>): ConflictCheck | null {
  const scheduledAt = String(slots.scheduled_at ?? "").trim();
  if (!scheduledAt) return null;

  // Intentar parsear fecha
  const parsed = new Date(scheduledAt);
  if (isNaN(parsed.getTime())) {
    // No es una fecha parseable — warning leve
    return {
      severity: "low",
      message: `Fecha/hora no parseable: "${scheduledAt}"`,
    };
  }

  const now = new Date();
  // Si la fecha está en el pasado (más de 1 hora de tolerancia)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  if (parsed < oneHourAgo) {
    return {
      severity: "high",
      message: `Fecha/hora en el pasado: "${scheduledAt}"`,
    };
  }

  return null;
}

function checkPassengerCountConflict(slots: Record<string, unknown>): ConflictCheck | null {
  const passengers = slots.passengers;

  if (passengers === undefined || passengers === null) return null;

  const count = typeof passengers === "number" ? passengers : Number(passengers);

  if (isNaN(count)) {
    return {
      severity: "low",
      message: `Número de pasajeros no numérico: "${passengers}"`,
    };
  }

  if (count <= 0) {
    return {
      severity: "high",
      message: `Número de pasajeros inválido: ${count}`,
    };
  }

  if (count > 20) {
    return {
      severity: "medium",
      message: `Número de pasajeros inusualmente alto: ${count}`,
    };
  }

  return null;
}

function checkUrgencyDateConflict(slots: Record<string, unknown>, _conversationState?: string): ConflictCheck | null {
  // Si hay urgency "ahora" pero también scheduled_at futura → conflicto
  const urgency = String(slots.urgency ?? "").toLowerCase().trim();
  const scheduledAt = String(slots.scheduled_at ?? "").trim();

  if (!urgency || !scheduledAt) return null;

  if (urgency === "ahora" || urgency === "urgente") {
    const parsed = new Date(scheduledAt);
    if (!isNaN(parsed.getTime())) {
      const now = new Date();
      const diffHours = (parsed.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (diffHours > 3) {
        return {
          severity: "medium",
          message: `Urgencia "ahora" pero scheduled_at está a ${Math.round(diffHours)}h en el futuro`,
        };
      }
    }
  }

  return null;
}

// ─── Regla principal ───────────────────────────────────────────────────────

export const consistenciaRule: DRLRule<DRLInput, DRLRuleResult> = (input) => {
  const { slots, conversationState } = input;

  // Ejecutar todas las validaciones
  const checks = [
    { check: checkOriginDestinationConflict(slots), label: "origin_destination" },
    { check: checkDateConflict(slots), label: "date" },
    { check: checkPassengerCountConflict(slots), label: "passengers" },
    { check: checkUrgencyDateConflict(slots, conversationState), label: "urgency_date" },
  ];

  const conflicts: string[] = [];
  let maxSeverity: "none" | "low" | "medium" | "high" = "none";

  for (const { check } of checks) {
    if (check) {
      conflicts.push(check.message);
      const severityOrder = ["low", "medium", "high"] as const;
      const currentIdx = severityOrder.indexOf(check.severity);
      const maxIdx = severityOrder.indexOf(maxSeverity !== "none" ? maxSeverity : "low");
      if (currentIdx > maxIdx) {
        maxSeverity = check.severity;
      }
    }
  }

  const hasConflicts = conflicts.length > 0;

  // Decisión basada en severidad de conflictos
  let passed: boolean;
  let decision: "PROCEED" | "CLARIFY" | "ESCALATE";
  let confidence: number;
  let reason: string;

  if (!hasConflicts) {
    passed = true;
    decision = "PROCEED";
    confidence = 1.0;
    reason = "Sin conflictos detectados entre slots";
  } else if (maxSeverity === "low") {
    passed = true;
    decision = "PROCEED";
    confidence = 0.85;
    reason = `Conflictos leves detectados: ${conflicts.join("; ")}`;
  } else if (maxSeverity === "medium") {
    passed = false;
    decision = "CLARIFY";
    confidence = 0.5;
    reason = `Conflictos de severidad media: ${conflicts.join("; ")}`;
  } else {
    // high
    passed = false;
    decision = "ESCALATE";
    confidence = 0.2;
    reason = `Conflictos de alta severidad: ${conflicts.join("; ")}`;
  }

  const details: ConsistenciaDetails = {
    hasConflicts,
    conflictCount: conflicts.length,
    conflicts,
    severityLevel: maxSeverity,
  };

  return {
    ruleFamily: "consistencia",
    ruleName: "consistencia-logica",
    passed,
    decision,
    reason,
    confidence,
    details: details as unknown as Record<string, unknown>,
  };
};
