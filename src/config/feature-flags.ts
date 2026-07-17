// FEATURE FLAGS — Cognitive Stack flags, default false.
// PR-5A: Foundation — todas las flags apuntan a false; el sistema opera idéntico.
//
// Patrón: COGNITIVE_MEMORY_ENABLED (process.env, zod-documented, optional).
// NO se agregan al schema de zod para mantener backward compatibility:
// son optativas y default false.

/** Habilita el Business Knowledge Engine (BKE). Default: false */
export function isBkeEnabled(): boolean {
  return process.env.BKE_ENABLED === "true";
}

/** Habilita el Deterministic Reasoning Layer (DRL). Default: false */
export function isDrlEnabled(): boolean {
  return process.env.DRL_ENABLED === "true";
}

/**
 * Habilita BKE.geo — reemplazo determinístico de C3 (interpretAmbiguity).
 * Default: false (comportamiento actual = LLM).
 * true: BKE + DRL resuelven desambiguación geo primero; LLM solo si fallan.
 */
export function isBkeGeoEnabled(): boolean {
  return process.env.BKE_GEO_ENABLED === "true";
}

/**
 * Habilita DRL para C4 (generateReinterpretResponse) — reinterpretación determinística.
 * Default: false (comportamiento actual = LLM).
 * true: DRL evalúa suficiencia primero; LLM solo si DRL no puede resolver.
 */
export function isDrlComprehensionEnabled(): boolean {
  return process.env.DRL_COMPREHENSION_ENABLED === "true";
}

/**
 * Habilita DRL para C6 (generateContextualRecovery) — recuperación contextual determinística.
 * Default: false (comportamiento actual = LLM).
 * true: DRL evalúa recuperación primero; LLM solo si DRL no puede resolver.
 */
export function isDrlRecoveryEnabled(): boolean {
  return process.env.DRL_RECOVERY_ENABLED === "true";
}

/**
 * PR-5D: Habilita DRL Assistance para C1 (generateGroqExtraction).
 * El DRL corre antes de la extracción y enriquece el prompt del LLM
 * con análisis de completitud, consistencia, clasificación y prioridad.
 * Default: false (comportamiento actual = extracción sin enriquecimiento).
 */
export function isDrlExtractionAssistanceEnabled(): boolean {
  return process.env.DRL_EXTRACTION_ASSISTANCE_ENABLED === "true";
}

/**
 * PR-5D: Habilita DRL Assistance para C2 (generateLLMResponse).
 * El DRL corre antes de generar la respuesta y enriquece el prompt del LLM
 * con análisis estructurado del contexto.
 * Default: false (comportamiento actual = respuesta sin enriquecimiento).
 */
export function isDrlResponseAssistanceEnabled(): boolean {
  return process.env.DRL_RESPONSE_ASSISTANCE_ENABLED === "true";
}

/**
 * PR-5D: Habilita DRL Assistance para C5 (generateFrustrationResponse).
 * El DRL corre antes de la respuesta de frustración y enriquece el prompt
 * con clasificación del tipo de frustración y contexto.
 * Default: false (comportamiento actual = frustración sin enriquecimiento).
 */
export function isDrlFrustrationAssistanceEnabled(): boolean {
  return process.env.DRL_FRUSTRATION_ASSISTANCE_ENABLED === "true";
}

/**
 * PR-5E: Habilita BKE Entity Domain.
 * Centraliza resolución de entidades, alias, catálogo y lugares conocidos.
 * Default: false (comportamiento actual = acceso directo a entity-extractor).
 */
export function isBkeEntityEnabled(): boolean {
  return process.env.BKE_ENTITY_ENABLED === "true";
}

/**
 * PR-5E: Habilita BKE Pricing Domain.
 * Centraliza tarifas, estimaciones y reglas de precio.
 * Default: false (comportamiento actual = acceso directo a pricing engine).
 */
export function isBkePricingEnabled(): boolean {
  return process.env.BKE_PRICING_ENABLED === "true";
}

/**
 * PR-5E: Habilita BKE Message Domain.
 * Centraliza mensajes reutilizables, plantillas y respuestas determinísticas.
 * Default: false (comportamiento actual = acceso directo a response-builder).
 */
export function isBkeMessageEnabled(): boolean {
  return process.env.BKE_MESSAGE_ENABLED === "true";
}
