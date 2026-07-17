// Cognitive Metrics — Tipos base del sistema de observabilidad CE-5.
// PR-5F: Cognitive Metrics & Observability.
//
// Define el modelo de datos para el Cognitive Escalation Principle:
//   BKE → DRL → Groq → Gemini → Fallback
//
// Cada etapa emite eventos estructurados; el agregador computa el Cognitive Budget.

// ─── Etapas del pipeline cognitivo ───────────────────────────────────────

export type CognitiveStage =
  | "bke_entity"
  | "bke_pricing"
  | "bke_message"
  | "bke_geo"
  | "drl_comprehension"
  | "drl_recovery"
  | "drl_extraction_assist"
  | "drl_response_assist"
  | "drl_frustration_assist"
  | "groq_extraction"
  | "groq_response"
  | "groq_ambiguity"
  | "gemini_extraction"
  | "gemini_response"
  | "gemini_ambiguity"
  | "fallback_ambiguity"
  | "fallback_provider"
  | "pipeline_extraction"
  | "pipeline_comprehension"
  | "pipeline_handler";

// ─── Evento cognitivo estructurado ───────────────────────────────────────

export interface CognitiveEvent {
  /** Identificador único del evento */
  id: string;
  /** Etapa del pipeline */
  stage: CognitiveStage;
  /** Timestamp Unix (ms) */
  timestamp: number;
  /** Duración en ms */
  durationMs: number;
  /** Indica si la etapa se completó exitosamente */
  success: boolean;
  /** Feature flags activos en el momento del evento */
  activeFlags: Record<string, boolean>;
  /** Metadatos específicos de la etapa */
  details?: Record<string, unknown>;
}

// ─── Eventos específicos por etapa ───────────────────────────────────────

export interface BKEEventDetails {
  domain: "entity" | "pricing" | "message" | "geo";
  query: string;
  resolutionSource: string;
  confidence: number;
  cached?: boolean;
}

export interface DRLEventDetails {
  rule: string;
  decision: "PROCEED" | "CLARIFY" | "ESCALATE" | "HALT";
  confidence: number;
  executionTimeMs: number;
  matchedRule?: string;
}

export interface LLMEventDetails {
  provider: "groq" | "gemini";
  model: string;
  operation: "extract" | "respond" | "interpret";
  inputTokens?: number;
  outputTokens?: number;
  isFallback: boolean;
  error?: string;
}

export interface FallbackEventDetails {
  from: string;
  to: string;
  reason: string;
  originalError?: string;
}

export interface PipelineEventDetails {
  pipeline: "extraction" | "comprehension" | "handler";
  phone?: string;
  intent?: string;
  slotsCount?: number;
  workflowState?: string;
}

// ─── Cognitive Budget (resultado agregado) ────────────────────────────────

export interface CognitiveBudget {
  /** Período (ventana de tiempo) */
  period: { since: number; until: number };

  // Conteos absolutos
  bkeHits: number;
  drlDecisions: number;
  groqCalls: number;
  geminiCalls: number;
  llmEscalations: number;
  llmAvoided: number;

  // Tasas de resolución
  bkeResolutionRate: number;  // bkeHits / (bkeHits + bkeMisses)
  drlResolutionRate: number;  // drlResolved / drlAttempts

  // Latencia por nivel (ms)
  latencyByLevel: {
    bke: { avg: number; p50: number; p95: number; max: number };
    drl: { avg: number; p50: number; p95: number; max: number };
    groq: { avg: number; p50: number; p95: number; max: number };
    gemini: { avg: number; p50: number; p95: number; max: number };
    fallback: { avg: number; p50: number; p95: number; max: number };
    total: { avg: number; p50: number; p95: number; max: number };
  };

  // Feature flags activos durante el período
  activeFlags: Record<string, boolean>;

  // Detalle por etapa
  stageBreakdown: Record<CognitiveStage, {
    calls: number;
    successRate: number;
    avgLatencyMs: number;
  }>;
}

// ─── Métricas por request ────────────────────────────────────────────────

export interface CognitiveRequestMetrics {
  requestId: string;
  phone?: string;
  events: CognitiveEvent[];
  startTime: number;
  endTime: number;
  totalDurationMs: number;

  // Conteos por tipo (cálculo rápido)
  bkeCallCount: number;
  drlCallCount: number;
  groqCallCount: number;
  geminiCallCount: number;
  fallbackCount: number;
}

// ─── Estado global del collector ─────────────────────────────────────────

export interface CognitiveMetricsState {
  /** Todos los eventos desde el último reset (máximo 10k) */
  events: CognitiveEvent[];
  /** Requests tracks (máximo 100) */
  requests: CognitiveRequestMetrics[];
  /** Feature flags snapshot */
  activeFlags: Record<string, boolean>;
  /** Timestamp del último reset */
  lastResetAt: number;
  /** Contador total de eventos (incluyendo los descartados) */
  totalEventsCaptured: number;
}
