// Cognitive Metrics — Collector centralizado.
// PR-5F: Recolecta eventos cognitivos de todas las etapas del pipeline.
//
// Patrón: singleton module-level + event buffer circular.
// Límites: 10k eventos, 100 requests en memoria.
// Reset: getState() + resetState() para gestión del ciclo de vida.

import type {
  CognitiveStage,
  CognitiveEvent,
  CognitiveRequestMetrics,
  CognitiveMetricsState,
  BKEEventDetails,
  DRLEventDetails,
  LLMEventDetails,
  FallbackEventDetails,
  PipelineEventDetails,
} from "./types";

// ─── Constantes ──────────────────────────────────────────────────────────

const MAX_EVENTS = 10_000;
const MAX_REQUESTS = 100;

// ─── Estado mutable del collector ───────────────────────────────────────

interface InternalMetricsState {
  events: CognitiveEvent[];
  requests: CognitiveRequestMetrics[];
  totalEventsCaptured: number;
  lastResetAt: number;
  requestCounter: number;
}

let state: InternalMetricsState = {
  events: [],
  requests: [],
  totalEventsCaptured: 0,
  lastResetAt: Date.now(),
  requestCounter: 0,
};

// ─── Feature flags snapshot ─────────────────────────────────────────────

function getActiveFlags(): Record<string, boolean> {
  // No importamos directamente para evitar dependencias circulares.
  // Los flags se evalúan contra process.env en el momento del evento.
  return {
    BKE_ENABLED: process.env.BKE_ENABLED === "true",
    DRL_ENABLED: process.env.DRL_ENABLED === "true",
    BKE_GEO_ENABLED: process.env.BKE_GEO_ENABLED === "true",
    DRL_COMPREHENSION_ENABLED: process.env.DRL_COMPREHENSION_ENABLED === "true",
    DRL_RECOVERY_ENABLED: process.env.DRL_RECOVERY_ENABLED === "true",
    DRL_EXTRACTION_ASSISTANCE_ENABLED: process.env.DRL_EXTRACTION_ASSISTANCE_ENABLED === "true",
    DRL_RESPONSE_ASSISTANCE_ENABLED: process.env.DRL_RESPONSE_ASSISTANCE_ENABLED === "true",
    DRL_FRUSTRATION_ASSISTANCE_ENABLED: process.env.DRL_FRUSTRATION_ASSISTANCE_ENABLED === "true",
    BKE_ENTITY_ENABLED: process.env.BKE_ENTITY_ENABLED === "true",
    BKE_PRICING_ENABLED: process.env.BKE_PRICING_ENABLED === "true",
    BKE_MESSAGE_ENABLED: process.env.BKE_MESSAGE_ENABLED === "true",
  };
}

// ─── Event ID ────────────────────────────────────────────────────────────

let eventIdCounter = 0;
function nextEventId(): string {
  eventIdCounter++;
  return `ce-${Date.now()}-${eventIdCounter}`;
}

// ─── Funciones públicas ─────────────────────────────────────────────────

/**
 * Registra un evento cognitivo en el collector.
 * Sigue el principio de no-efecto-secundario: si el collector falla,
 * no afecta al flujo principal.
 */
export function captureEvent(
  stage: CognitiveStage,
  durationMs: number,
  success: boolean,
  details?: Record<string, unknown>,
): void {
  try {
    const event: CognitiveEvent = {
      id: nextEventId(),
      stage,
      timestamp: Date.now(),
      durationMs,
      success,
      activeFlags: getActiveFlags(),
      details,
    };

    state.events.push(event);
    state.totalEventsCaptured++;

    // Buffer circular: descartar eventos viejos si excede el límite
    if (state.events.length > MAX_EVENTS) {
      state.events = state.events.slice(-MAX_EVENTS);
    }
  } catch {
    // Silently ignore — sin efectos secundarios
  }
}

/**
 * Inicia el tracking de un request.
 * Retorna el requestId para usarlo en etapas posteriores.
 */
export function startRequest(requestId?: string, phone?: string): string {
  const id = requestId ?? `req-${Date.now()}-${++state.requestCounter}`;
  const metrics: CognitiveRequestMetrics = {
    requestId: id,
    phone,
    events: [],
    startTime: Date.now(),
    endTime: 0,
    totalDurationMs: 0,
    bkeCallCount: 0,
    drlCallCount: 0,
    groqCallCount: 0,
    geminiCallCount: 0,
    fallbackCount: 0,
  };
  state.requests.push(metrics);

  // Buffer circular para requests
  if (state.requests.length > MAX_REQUESTS) {
    state.requests = state.requests.slice(-MAX_REQUESTS);
  }

  return id;
}

/**
 * Finaliza el tracking de un request (actualiza endTime + totalDurationMs).
 */
export function endRequest(requestId: string): void {
  const req = state.requests.find(r => r.requestId === requestId);
  if (!req) return;
  req.endTime = Date.now();
  req.totalDurationMs = req.endTime - req.startTime;
}

/**
 * Asocia eventos a un request específico para su recuperación posterior.
 * NOTA: los eventos ya se capturan globalmente en `state.events`;
 * el request tracking es un índice adicional para consultas por request.
 */
export function linkEventToRequest(requestId: string, eventStage: CognitiveStage): void {
  const req = state.requests.find(r => r.requestId === requestId);
  if (!req) return;

  // Incrementar contadores por tipo
  const stageType = eventStage.split("_")[0];
  switch (stageType) {
    case "bke": req.bkeCallCount++; break;
    case "drl": req.drlCallCount++; break;
    case "groq": req.groqCallCount++; break;
    case "gemini": req.geminiCallCount++; break;
    case "fallback": req.fallbackCount++; break;
  }
}

/**
 * Retorna una copia del estado actual del collector.
 */
export function getCognitiveMetricsState(): CognitiveMetricsState {
  return {
    events: [...state.events],
    requests: [...state.requests],
    activeFlags: getActiveFlags(),
    lastResetAt: state.lastResetAt,
    totalEventsCaptured: state.totalEventsCaptured,
  };
}

/**
 * Resetea el estado del collector.
 */
export function resetCognitiveMetricsState(): void {
  state = {
    events: [],
    requests: [],
    totalEventsCaptured: 0,
    lastResetAt: Date.now(),
    requestCounter: 0,
  };
  eventIdCounter = 0;
}

// ─── Helpers para captura rápida por tipo de etapa ──────────────────────

export function captureBKEEvent(
  durationMs: number,
  success: boolean,
  details: BKEEventDetails,
): void {
  captureEvent(`bke_${details.domain}` as CognitiveStage, durationMs, success, details as unknown as Record<string, unknown>);
}

export function captureDRLEvent(
  durationMs: number,
  success: boolean,
  details: DRLEventDetails,
): void {
  captureEvent(
    details.rule.startsWith("comprehension") ? "drl_comprehension"
    : details.rule.startsWith("recovery") ? "drl_recovery"
    : details.rule.startsWith("extraction") ? "drl_extraction_assist"
    : details.rule.startsWith("response") ? "drl_response_assist"
    : details.rule.startsWith("frustration") ? "drl_frustration_assist"
    : "drl_comprehension",
    durationMs,
    success,
    details as unknown as Record<string, unknown>,
  );
}

export function captureLLMEvent(
  durationMs: number,
  success: boolean,
  details: LLMEventDetails,
): void {
  const stage = `${details.provider}_${details.operation}` as CognitiveStage;
  captureEvent(stage, durationMs, success, details as unknown as Record<string, unknown>);
}

export function captureFallbackEvent(
  durationMs: number,
  success: boolean,
  details: FallbackEventDetails,
): void {
  captureEvent("fallback_provider", durationMs, success, details as unknown as Record<string, unknown>);
}

export function capturePipelineEvent(
  durationMs: number,
  success: boolean,
  details: PipelineEventDetails,
): void {
  captureEvent(`pipeline_${details.pipeline}` as CognitiveStage, durationMs, success, details as unknown as Record<string, unknown>);
}
