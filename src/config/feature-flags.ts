// FEATURE FLAGS — Cognitive Stack flags (deprecated).
//
// BUILD misión OLA 4.3+4.5: módulos BKE/DRL/Pattern Discovery removidos.
// Ver ADR-014 para contexto.
//
// Las funciones se mantienen como stubs que retornan false para no romper
// imports que pudieran existir. Se eliminarán en OLA 5 cuando se verifique
// que ningún consumidor las referencia.
//
// Patrón: COGNITIVE_MEMORY_ENABLED (process.env, zod-documented, optional).

/** @deprecated BKE fue removido en BUILD OLA 4.5. Retorna false. */
export function isBkeEnabled(): boolean {
  return false;
}

/** @deprecated DRL fue removido en BUILD OLA 4.5. Retorna false. */
export function isDrlEnabled(): boolean {
  return false;
}

/** @deprecated BKE.geo — módulo removido. Retorna false. */
export function isBkeGeoEnabled(): boolean {
  return false;
}

/** @deprecated DRL Comprehension — módulo removido. Retorna false. */
export function isDrlComprehensionEnabled(): boolean {
  return false;
}

/** @deprecated DRL Recovery — módulo removido. Retorna false. */
export function isDrlRecoveryEnabled(): boolean {
  return false;
}

/** @deprecated DRL Extraction — módulo removido. Retorna false. */
export function isDrlExtractionAssistanceEnabled(): boolean {
  return false;
}

/** @deprecated DRL Response — módulo removido. Retorna false. */
export function isDrlResponseAssistanceEnabled(): boolean {
  return false;
}

/** @deprecated DRL Frustration — módulo removido. Retorna false. */
export function isDrlFrustrationAssistanceEnabled(): boolean {
  return false;
}

/** @deprecated BKE Entity — módulo removido. Retorna false. */
export function isBkeEntityEnabled(): boolean {
  return false;
}

/** @deprecated BKE Pricing — módulo removido. Retorna false. */
export function isBkePricingEnabled(): boolean {
  return false;
}

/** @deprecated BKE Message — módulo removido. Retorna false. */
export function isBkeMessageEnabled(): boolean {
  return false;
}
