// DRL Assistance Types — resultado estructurado del DRL para enriquecer prompts LLM.
// PR-5D: Tipos compartidos entre los resolvers de asistencia.
//
// Cada "DrlAssistanceResult" contiene los resultados de todas las reglas DRL
// ejecutadas antes de una llamada LLM de Tipo A (Inevitable).

import type { DRLDecisionType } from "@/lib/drl/types";

// ─── Resultados de reglas individuales (formato compacto) ──────────────────

export interface CompletitudAssistance {
  completenessRatio: number;
  completenessLevel: string;
  missingFields: string[];
  confidence: number;
}

export interface ConsistenciaAssistance {
  hasConflicts: boolean;
  conflictCount: number;
  conflicts: string[];
  severityLevel: string;
  confidence: number;
}

export interface ClasificacionAssistance {
  extractionType: string;
  complexity: string;
  priority: string;
  confidence: number;
}

export interface PrioridadAssistance {
  suggestedNextField: string | null;
  pendingFields: string[];
  acquisitionMode: string;
  confidence: number;
}

export interface EscalamientoAssistance {
  shouldEscalate: boolean;
  escalateTo: string | null;
  signals: string[];
  confidence: number;
}

// ─── Resultado agregado ────────────────────────────────────────────────────

export interface DrlAssistanceResult {
  /** Decisión global agregada */
  decision: DRLDecisionType;
  /** Confianza global */
  overallConfidence: number;
  /** Resultados de reglas individuales */
  completitud: CompletitudAssistance;
  consistencia: ConsistenciaAssistance;
  clasificacion: ClasificacionAssistance;
  prioridad: PrioridadAssistance;
  escalamiento: EscalamientoAssistance;
  /** Tiempo de evaluación DRL en ms */
  executionTimeMs: number;
}

// ─── Texto de enriquecimiento formateado ───────────────────────────────────

export interface DrlEnrichmentText {
  /** Texto estructurado listo para inyectar en el prompt del LLM */
  text: string;
  /** Resultado completo (para logging/telemetría) */
  raw: DrlAssistanceResult;
}

/**
 * Formatea el resultado DRL como texto estructurado para el prompt del LLM.
 * Formato: secciones con prefijos "DRL_" para fácil identificación.
 * No genera lenguaje natural — solo datos estructurados.
 */
export function formatDrlEnrichment(
  result: DrlAssistanceResult,
  target: "extraction" | "response" | "frustration",
): string {
  const lines: string[] = [];
  lines.push(`=== DRL ASSISTANCE (${target.toUpperCase()}) ===`);

  // Decisión global
  lines.push(`DRL_DECISION: ${result.decision}`);
  lines.push(`DRL_CONFIDENCE: ${(result.overallConfidence * 100).toFixed(0)}%`);
  lines.push(`DRL_EVALUATION_MS: ${result.executionTimeMs}`);

  // Completitud
  const c = result.completitud;
  lines.push(`DRL_COMPLETITUD: ratio=${(c.completenessRatio * 100).toFixed(0)}% level=${c.completenessLevel}`);
  if (c.missingFields.length > 0) {
    lines.push(`DRL_MISSING_FIELDS: ${c.missingFields.join(", ")}`);
  }

  // Consistencia
  const cs = result.consistencia;
  lines.push(`DRL_CONSISTENCIA: hasConflicts=${cs.hasConflicts} severity=${cs.severityLevel}`);
  if (cs.hasConflicts && cs.conflicts.length > 0) {
    lines.push(`DRL_CONFLICTS: ${cs.conflicts.join(" | ")}`);
  }

  // Clasificación
  const cl = result.clasificacion;
  lines.push(`DRL_CLASIFICACION: type=${cl.extractionType} complexity=${cl.complexity} priority=${cl.priority}`);

  // Prioridad
  const p = result.prioridad;
  lines.push(`DRL_PRIORIDAD: next=${p.suggestedNextField ?? "none"} mode=${p.acquisitionMode}`);
  if (p.pendingFields.length > 0) {
    lines.push(`DRL_PENDING_FIELDS: ${p.pendingFields.join(", ")}`);
  }

  // Escalamiento
  const e = result.escalamiento;
  if (e.shouldEscalate) {
    lines.push(`DRL_ESCALAMIENTO: escalateTo=${e.escalateTo} signals=${e.signals.join(",")}`);
  }

  // Cierre
  lines.push(`=== END DRL ASSISTANCE ===`);

  return lines.join("\n");
}
