/**
 * types.ts — Tipos compartidos del Evidence Engine
 *
 * Arquitectura Freeze V2 | EVIDENCE_MODEL R-EM-001 a R-EM-020
 * Define los tipos literales, uniones discriminadas y constantes
 * compartidas por todos los módulos del dominio Evidence.
 *
 * Fuentes: ONTOLOGY §3.3-3.4 (Channel, Signal), §4.2-4.4 (Observation, Fact, Source),
 *          §5.1 (Evidence), §6.3 (Confidence), EVIDENCE_MODEL.md R-EM-015, R-EM-016
 */

// ---------------------------------------------------------------------------
// 3.4 Channel (ONTOLOGY §3.4)
// ---------------------------------------------------------------------------

/**
 * Canales de entrada del sistema.
 * ONTOLOGY §3.4: WhatsApp Webhook, Cron, Admin API
 */
export type ChannelType = 'whatsapp' | 'webhook' | 'cron' | 'admin_api';

export const CHANNEL_TYPES: readonly ChannelType[] = [
  'whatsapp',
  'webhook',
  'cron',
  'admin_api',
] as const;

/**
 * Type guard para ChannelType.
 * Retorna true si el valor es un ChannelType válido.
 */
export function isChannelType(value: unknown): value is ChannelType {
  return CHANNEL_TYPES.includes(value as ChannelType);
}

// ---------------------------------------------------------------------------
// 3.3 Signal subtypes (ONTOLOGY §3.3)
// ---------------------------------------------------------------------------

/**
 * Subtipos de Signal según su origen perceptual.
 */
export type SignalSubtype = 'message' | 'time' | 'location' | 'system';

export const SIGNAL_SUBTYPES: readonly SignalSubtype[] = [
  'message',
  'time',
  'location',
  'system',
] as const;

export function isSignalSubtype(value: unknown): value is SignalSubtype {
  return SIGNAL_SUBTYPES.includes(value as SignalSubtype);
}

// ---------------------------------------------------------------------------
// 4.2 Observation validation status (ONTOLOGY §4.2 + R-EM-007)
// ---------------------------------------------------------------------------

/**
 * Resultado de la validación channel-level de un Signal.
 * R-EM-007: Un Signal pasa a ser Observation cuando supera
 * validación de formato, autenticación, rate-limit e idempotencia.
 */
export type ObservationValidationStatus =
  | 'valid'
  | 'invalid_format'
  | 'unauthorized'
  | 'rate_limited'
  | 'duplicate';

export const OBSERVATION_VALIDATION_STATUSES: readonly ObservationValidationStatus[] =
  ['valid', 'invalid_format', 'unauthorized', 'rate_limited', 'duplicate'] as const;

export function isObservationValidationStatus(
  value: unknown,
): value is ObservationValidationStatus {
  return OBSERVATION_VALIDATION_STATUSES.includes(
    value as ObservationValidationStatus,
  );
}

// ---------------------------------------------------------------------------
// 4.3 Fact types (ONTOLOGY §4.3 + R-EM-008)
// ---------------------------------------------------------------------------

/**
 * Tipos de hechos atómicos reconocibles por el sistema.
 * Cada FactType representa una categoría de proposición atómica.
 */
export type FactType =
  | 'origin'
  | 'destination'
  | 'pickup_time'
  | 'passenger_count'
  | 'flight_number'
  | 'urgency'
  | 'affirmation'
  | 'greeting'
  | 'name'
  | 'contact_phone'
  | 'vehicle_type'
  | 'fare_type'
  | 'note'
  | 'commercial_query'
  | 'informational_query'
  | 'emergency'
  | 'reschedule'
  | 'correction'
  | 'ambiguity'
  | 'airport_mention'
  | 'unknown';

export const FACT_TYPES: readonly FactType[] = [
  'origin',
  'destination',
  'pickup_time',
  'passenger_count',
  'flight_number',
  'urgency',
  'affirmation',
  'greeting',
  'name',
  'contact_phone',
  'vehicle_type',
  'fare_type',
  'note',
  'commercial_query',
  'informational_query',
  'emergency',
  'reschedule',
  'correction',
  'ambiguity',
  'airport_mention',
  'unknown',
] as const;

export function isFactType(value: unknown): value is FactType {
  return FACT_TYPES.includes(value as FactType);
}

// ---------------------------------------------------------------------------
// 4.4 Source types (ONTOLOGY §4.4 + R-EM-015)
// ---------------------------------------------------------------------------

/**
 * Tipos canónicos de fuente de origen de un Fact.
 * ONTOLOGY §4.4: Las fuentes definen el método por el cual
 * un hecho fue obtenido, ordenadas por fiabilidad.
 */
export type SourceType =
  | 'direct_extraction'
  | 'inference'
  | 'user_confirmation'
  | 'knowledge_base_lookup'
  | 'default_value'
  | 'llm_inference'
  | 'silence_detection';

export const SOURCE_TYPES: readonly SourceType[] = [
  'direct_extraction',
  'inference',
  'user_confirmation',
  'knowledge_base_lookup',
  'default_value',
  'llm_inference',
  'silence_detection',
] as const;

export function isSourceType(value: unknown): value is SourceType {
  return SOURCE_TYPES.includes(value as SourceType);
}

/**
 * Fiabilidad intrínseca de cada SourceType (0-1).
 * ONTOLOGY §4.4: Las fuentes tienen un peso de fiabilidad.
 * Valores según EVIDENCE_MODEL R-EM-016 + análisis de precisión.
 */
export const SOURCE_RELIABILITY: Record<SourceType, number> = {
  user_confirmation: 0.95,
  direct_extraction: 0.85,
  knowledge_base_lookup: 0.90,
  inference: 0.70,
  llm_inference: 0.65,
  silence_detection: 0.40,
  default_value: 0.30,
};

// ---------------------------------------------------------------------------
// 5.1 Evidence types (ONTOLOGY §5.1)
// ---------------------------------------------------------------------------

/**
 * Clasificación del tipo de Evidence según su origen epistémico.
 */
export type EvidenceType =
  | 'user_input'
  | 'system_inference'
  | 'backend_response'
  | 'outcome';

export const EVIDENCE_TYPES: readonly EvidenceType[] = [
  'user_input',
  'system_inference',
  'backend_response',
  'outcome',
] as const;

export function isEvidenceType(value: unknown): value is EvidenceType {
  return EVIDENCE_TYPES.includes(value as EvidenceType);
}

// ---------------------------------------------------------------------------
// Guards: JSON serialization helpers
// ---------------------------------------------------------------------------

/**
 * Type guard para verificar que un valor es un objeto plano (Record).
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard para verificar que un valor es un string no vacío.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
