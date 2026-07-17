// DRL Assistance — motor central de asistencia DRL.
// PR-5D: Ejecuta todas las reglas DRL y produce un DrlAssistanceResult.
//
// Uso: antes de cada llamada LLM de Tipo A (C1, C2, C5):
//   const assistance = await runDrlAssistance(slots);
//   if (assistance) { prompt += assistance.text; }
//
// Las reglas se ejecutan secuencialmente (son síncronas y rápidas).
// Se registra el tiempo de ejecución para observabilidad.

import type { DRLInput } from "@/lib/drl/types";
import { completitudRule } from "@/lib/drl/rules/completitud";
import { consistenciaRule } from "@/lib/drl/rules/consistencia";
import { clasificacionRule } from "@/lib/drl/rules/clasificacion";
import { prioridadRule } from "@/lib/drl/rules/prioridad";
import { escalamientoRule } from "@/lib/drl/rules/escalamiento";
import type {
  DrlAssistanceResult,
  CompletitudAssistance,
  ConsistenciaAssistance,
  ClasificacionAssistance,
  PrioridadAssistance,
  EscalamientoAssistance,
  DrlEnrichmentText,
} from "@/lib/drl/assistance-types";
import { formatDrlEnrichment } from "@/lib/drl/assistance-types";
import { captureDRLEvent } from "@/lib/cognitive/collector";

// ─── Run all rules ─────────────────────────────────────────────────────────

export function runDrlAssistance(
  input: DRLInput,
  _target: "extraction" | "response" | "frustration",
): DrlAssistanceResult {
  const startTime = performance.now();

  // Ejecutar todas las reglas
  const completitudResult = completitudRule(input);
  const consistenciaResult = consistenciaRule(input);
  const clasificacionResult = clasificacionRule(input);
  const prioridadResult = prioridadRule(input);
  const escalamientoResult = escalamientoRule(input);

  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  // Extraer detalles
  const compDetails = (completitudResult?.details ?? {}) as Record<string, unknown>;
  const consDetails = (consistenciaResult?.details ?? {}) as Record<string, unknown>;
  const clasDetails = (clasificacionResult?.details ?? {}) as Record<string, unknown>;
  const prioDetails = (prioridadResult?.details ?? {}) as Record<string, unknown>;
  const escDetails = (escalamientoResult?.details ?? {}) as Record<string, unknown>;

  const completitud: CompletitudAssistance = {
    completenessRatio: (compDetails.completenessRatio as number) ?? 0,
    completenessLevel: (compDetails.completenessLevel as string) ?? "unknown",
    missingFields: (compDetails.missingFields as string[]) ?? [],
    confidence: completitudResult?.confidence ?? 0,
  };

  const consistencia: ConsistenciaAssistance = {
    hasConflicts: (consDetails.hasConflicts as boolean) ?? false,
    conflictCount: (consDetails.conflictCount as number) ?? 0,
    conflicts: (consDetails.conflicts as string[]) ?? [],
    severityLevel: (consDetails.severityLevel as string) ?? "none",
    confidence: consistenciaResult?.confidence ?? 0,
  };

  const clasificacion: ClasificacionAssistance = {
    extractionType: (clasDetails.extractionType as string) ?? "unknown",
    complexity: (clasDetails.complexity as string) ?? "unknown",
    priority: (clasDetails.priority as string) ?? "normal",
    confidence: clasificacionResult?.confidence ?? 0,
  };

  const prioridad: PrioridadAssistance = {
    suggestedNextField: (prioDetails.suggestedNextField as string) ?? null,
    pendingFields: (prioDetails.pendingFields as string[]) ?? [],
    acquisitionMode: (prioDetails.acquisitionMode as string) ?? "normal",
    confidence: prioridadResult?.confidence ?? 0,
  };

  const escalamiento: EscalamientoAssistance = {
    shouldEscalate: (escDetails.shouldEscalate as boolean) ?? false,
    escalateTo: (escDetails.escalateTo as string) ?? null,
    signals: (escDetails.signals as string[]) ?? [],
    confidence: escalamientoResult?.confidence ?? 0,
  };

  // Decisión global: si alguna regla dice ESCALATE → ESCALATE
  // Si alguna dice CLARIFY → CLARIFY
  // Si todas PROCEED → PROCEED
  const decisions = [completitudResult, consistenciaResult, clasificacionResult, prioridadResult, escalamientoResult]
    .filter(Boolean)
    .map(r => r!.decision);

  let decision: "PROCEED" | "CLARIFY" | "ESCALATE" | "HALT";
  if (decisions.some(d => d === "ESCALATE")) {
    decision = "ESCALATE";
  } else if (decisions.some(d => d === "CLARIFY")) {
    decision = "CLARIFY";
  } else if (decisions.every(d => d === "PROCEED")) {
    decision = "PROCEED";
  } else {
    decision = "PROCEED";
  }

  // Confianza global = promedio de confianzas
  const confidences = [completitudResult, consistenciaResult, clasificacionResult, prioridadResult, escalamientoResult]
    .filter(Boolean)
    .map(r => r!.confidence);
  const overallConfidence = confidences.length > 0
    ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100) / 100
    : 0;

  // PR-5F: Capturar evento DRL
  captureDRLEvent(executionTimeMs, true, {
    rule: `${_target}-assistance`,
    decision,
    confidence: overallConfidence,
    executionTimeMs,
    matchedRule: completitud.completenessLevel,
  });

  return {
    decision,
    overallConfidence,
    completitud,
    consistencia,
    clasificacion,
    prioridad,
    escalamiento,
    executionTimeMs,
  };
}

// ─── Helper: run + format ──────────────────────────────────────────────────

export function buildDrlEnrichment(
  input: DRLInput,
  target: "extraction" | "response" | "frustration",
): DrlEnrichmentText | null {
  const result = runDrlAssistance(input, target);
  const text = formatDrlEnrichment(result, target);
  return { text, raw: result };
}
