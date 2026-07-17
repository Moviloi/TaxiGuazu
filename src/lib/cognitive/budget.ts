// Cognitive Metrics — Budget Calculator.
// PR-5F: Calcula el Cognitive Budget a partir de los eventos recolectados.
//
// El Cognitive Budget mide:
// - BKE Hits: consultas resueltas por el Business Knowledge Engine
// - DRL Decisions: decisiones tomadas por las reglas determinísticas
// - LLM Escalations: veces que se escaló a un LLM
// - LLM Avoided: llamadas LLM que se evitaron gracias a BKE/DRL
// - Latencia por nivel: BKE, DRL, Groq, Gemini, Fallback
// - Tasas de resolución

import type { CognitiveBudget, CognitiveEvent, CognitiveStage } from "./types";

// ─── Calcular percentiles ────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function computeLatencyStats(values: number[]): { avg: number; p50: number; p95: number; max: number } {
  if (values.length === 0) return { avg: 0, p50: 0, p95: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    avg: Math.round(sum / sorted.length),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
  };
}

// ─── Determinar nivel de etapa ───────────────────────────────────────────

type Level = "bke" | "drl" | "groq" | "gemini" | "fallback" | "total";

function getLevel(stage: CognitiveStage): Level {
  if (stage.startsWith("bke")) return "bke";
  if (stage.startsWith("drl")) return "drl";
  if (stage.startsWith("groq")) return "groq";
  if (stage.startsWith("gemini")) return "gemini";
  if (stage.startsWith("fallback")) return "fallback";
  return "total";
}

// ─── Calcular Cognitive Budget ──────────────────────────────────────────

/**
 * Calcula el Cognitive Budget a partir de una lista de eventos.
 *
 * @param events — Lista de eventos cognitivos (pueden estar filtrados por tiempo)
 * @param since — Timestamp de inicio del período (opcional)
 * @param until — Timestamp de fin del período (opcional)
 */
export function calculateBudget(
  events: CognitiveEvent[],
  since?: number,
  until?: number,
): CognitiveBudget {
  // Filtrar por período si se especifica
  const filtered = events.filter(e => {
    if (since && e.timestamp < since) return false;
    if (until && e.timestamp > until) return false;
    return true;
  });

  // Conteos absolutos
  const bkeHits = filtered.filter(e => e.stage.startsWith("bke") && e.success).length;
  const bkeMisses = filtered.filter(e => e.stage.startsWith("bke") && !e.success).length;
  const drlDecisions = filtered.filter(e => e.stage.startsWith("drl")).length;
  const drlResolved = filtered.filter(e => e.stage.startsWith("drl") && e.success).length;
  const groqCalls = filtered.filter(e => e.stage.startsWith("groq")).length;
  const geminiCalls = filtered.filter(e => e.stage.startsWith("gemini")).length;
  const llmEscalations = filtered.filter(e => {
    // Escalamiento LLM = Gemini fallback o Groq usado después de DRL
    if (e.stage === "gemini_extraction" || e.stage === "gemini_response" || e.stage === "gemini_ambiguity") return true;
    if (e.stage === "fallback_provider") return true;
    // Groq calls que no son la primera opción
    if (e.stage === "groq_extraction" || e.stage === "groq_response") {
      const details = e.details as Record<string, unknown> | undefined;
      if (details?.isFallback === true) return true;
    }
    return false;
  }).length;

  // LLM Avoided = cuántas veces BKE o DRL resolvieron sin llegar a LLM
  // Se estima como: bkeHits (bke resolvió) + drlResolved (drl resolvió sin escalar)
  // menos aquellas donde DRL se usó como asistencia (no reemplazo)
  const llmAvoided = bkeHits + drlResolved;

  // Tasas
  const bkeTotal = bkeHits + bkeMisses;
  const bkeResolutionRate = bkeTotal > 0 ? Math.round((bkeHits / bkeTotal) * 10000) / 100 : 0;
  const drlTotal = filtered.filter(e => e.stage.startsWith("drl")).length;
  const drlResolutionRate = drlTotal > 0 ? Math.round((drlResolved / drlTotal) * 10000) / 100 : 0;

  // Latencia por nivel
  const latencyByLevel: Record<Level, number[]> = { bke: [], drl: [], groq: [], gemini: [], fallback: [], total: [] };
  for (const event of filtered) {
    const level = getLevel(event.stage);
    if (level !== "total") {
      latencyByLevel[level].push(event.durationMs);
    }
    latencyByLevel.total.push(event.durationMs);
  }

  // Stage breakdown
  const stageMap = new Map<CognitiveStage, { calls: number; successCount: number; totalLatency: number }>();
  for (const event of filtered) {
    const existing = stageMap.get(event.stage) ?? { calls: 0, successCount: 0, totalLatency: 0 };
    existing.calls++;
    if (event.success) existing.successCount++;
    existing.totalLatency += event.durationMs;
    stageMap.set(event.stage, existing);
  }

  const stageBreakdown = {} as Record<CognitiveStage, { calls: number; successRate: number; avgLatencyMs: number }>;
  for (const [stage, data] of stageMap.entries()) {
    stageBreakdown[stage] = {
      calls: data.calls,
      successRate: data.calls > 0 ? Math.round((data.successCount / data.calls) * 10000) / 100 : 0,
      avgLatencyMs: data.calls > 0 ? Math.round(data.totalLatency / data.calls) : 0,
    };
  }

  // Feature flags activos durante el período (del último evento)
  const activeFlags = filtered.length > 0 ? filtered[filtered.length - 1].activeFlags : {};

  const now = Date.now();
  return {
    period: {
      since: since ?? (filtered.length > 0 ? Math.min(...filtered.map(e => e.timestamp)) : now),
      until: until ?? now,
    },
    bkeHits,
    drlDecisions,
    groqCalls,
    geminiCalls,
    llmEscalations,
    llmAvoided,
    bkeResolutionRate,
    drlResolutionRate,
    latencyByLevel: {
      bke: computeLatencyStats(latencyByLevel.bke),
      drl: computeLatencyStats(latencyByLevel.drl),
      groq: computeLatencyStats(latencyByLevel.groq),
      gemini: computeLatencyStats(latencyByLevel.gemini),
      fallback: computeLatencyStats(latencyByLevel.fallback),
      total: computeLatencyStats(latencyByLevel.total),
    },
    activeFlags,
    stageBreakdown,
  };
}
