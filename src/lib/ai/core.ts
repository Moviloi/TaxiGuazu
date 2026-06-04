// CORE — extracción determinista de hechos explícitos.
// Reglas:
// - NO LLM.
// - NO inferencia de ubicación ("centro", "aeropuerto", "cerca" no se extraen como hechos).
// - NO responde al usuario.
// - NO decide modo AHORA/RESERVA.
// - NO completa datos faltantes.
// - Si no hay facts extraídos → intent = "AMBIGUOUS".
//
// v5.0 FASE 5B.2 (slot stability + role lock):
// CORE detecta la estructura sintáctica del input ("estoy en X", "ir a Y",
// "desde X") y produce roleLock + slotStability. Esto es stateful
// semánticamente: una vez que un slot tiene rol fijo, no se reinterpreta.
// - "estoy en X" / "desde X" → origin = X (locked)
// - "ir a Y" / "voy a Y" → destination = Y (locked)
// - Si el valor matchea términos ambiguos (centro, hotel) → stability = "ambiguous"
//   (el rol está fijo pero el valor necesita refinamiento).

import type { CoreDecision, Intent, RoleLock, SlotStabilityMap } from "./types";

const URGENCY_RE = /\b(ahora|ya|inmediato|urgente|hoy|enseguida)\b/i;
const QUERY_RE = /\b(cu[aá]nto|cu[aá]l|c[oó]mo|d[oó]nde|qu[eé]|precio|tarifa|cuesta|sale|cu[aá]ndo|a qu[eé] hora)\b/i;
const ACTION_RE = /\b(agend[ao]|confirm[oa]|reserv[ao]|quiero|necesito|deseo|contrat[ao])\b/i;
const PAX_RE = /\b(\d+)\s*(personas?|pax|pasajeros?)\b/i;
const FLIGHT_RE = /\b(?:vuelo\s*)?([A-Z]{2,3}\s?\d{2,4})\b/i;
const DATE_RE = /\b(hoy|ma[ñn]ana|pasado\s*ma[ñn]ana|esta\s*semana|pr[oó]xim[oa]s?\s*d[ií]as|el\s+(lunes|martes|mi[ée]rcoles|jueves|viernes|s[aá]bado|domingo)|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i;
const TIME_RE = /\b(?:a\s*las?\s*)?(\d{1,2}:\d{2}|\d{1,2}\s*(?:hs|horas|h))\b/i;
const AFFIRMATION_RE = /^(s[ií]|s[ií] confirmo|ok|okey|dale|confirmo|confirmado|de acuerdo|est[aá] bien|perfecto|mandale|adelante|listo)\b/i;

// Términos de ubicación que el CORE NO extrae como hechos (son ambiguos para el CORE).
// La policy AHORA o RESERVA puede tratarlos por separado.
const AMBIGUOUS_LOCATION_TERMS = /\b(centro|microcentro|ciudad|aeropuerto|puerto|la ciudad|cerca|zona|alrededores)\b/i;

// v5.0 FASE 5B.2: patrones de estructura sintáctica para detectar role lock.
// El CORE no infiere semánticamente: solo respeta la sintaxis del input.
// El grupo capturado se detiene en conectores o verbos que indican otro slot.
// IMPORTANTE: en español "al" y "del" son palabras (contracciones) — no
// contienen espacio. El lookahead usa `\s*` para tolerar fin de string.
const ESTOY_EN_RE = /(?:estoy\s+en(?:\s+(?:el|la|los|las|al|del))?|estoy\s+ac[áa]\s+en(?:\s+(?:el|la|al))?|me\s+encuentro\s+en(?:\s+(?:el|la|al))?)\s+([a-záéíóúñ][a-záéíóúñ\s]{1,40}?)(?=\s*(?:desde|hasta|\bir\b|\bvoy\b|\bquiero\b|\bvamos\b|\bnecesito\b|pero|\by\b|[,;.!?]|$))/i;
const IR_A_RE = /\b(?:voy|ir|quiero\s+ir|vamos)\s+(?:a\s+(?:el|la|los|las)\s+|a\s+|al\s+|del\s+)?([a-záéíóúñ][a-záéíóúñ\s]{1,40}?)(?=\s*(?:desde|hasta|\bestoy\b|pero|\by\b|[,;.!?]|$))/i;
const DESDE_RE = /(?:desde|partiendo\s+de|saliendo\s+de)\s+(?:el\s+|la\s+|los\s+|las\s+|al\s+|del\s+)?([a-záéíóúñ][a-záéíóúñ\s]{1,40}?)(?=\s*(?:hasta|a\s+(?:el|la|los|las)|\bvoy\b|\bir\b|\bquiero\b|\bvamos\b|\bnecesito\b|pero|\by\b|[,;.!?]|$))/i;

function detectStructure(input: string): { roleLock: RoleLock; slotStability: SlotStabilityMap } {
  const roleLock: RoleLock = { origin: null, destination: null };
  const slotStability: SlotStabilityMap = { origin: "open", destination: "open" };

  // Prioridad: "estoy en X" (más específico, marca ubicación actual) > "desde X" (marca partida).
  // En español rioplatense, "estoy en el aeropuerto quiero ir al centro" es lo más natural.
  const estoyEn = input.match(ESTOY_EN_RE);
  if (estoyEn) {
    const value = cleanExtractedValue(estoyEn[1]);
    roleLock.origin = value;
    slotStability.origin = isValueAmbiguous(value) ? "ambiguous" : "locked";
  }

  // "ir a Y" / "voy a Y" → destination
  const irA = input.match(IR_A_RE);
  if (irA) {
    const value = cleanExtractedValue(irA[1]);
    roleLock.destination = value;
    slotStability.destination = isValueAmbiguous(value) ? "ambiguous" : "locked";
  }

  // "desde X" → origin. Solo asigna si "estoy en" no lo hizo.
  // Patrón: "voy a Y desde X" — X es origin.
  const desdeX = input.match(DESDE_RE);
  if (desdeX && !roleLock.origin) {
    const value = cleanExtractedValue(desdeX[1]);
    roleLock.origin = value;
    slotStability.origin = isValueAmbiguous(value) ? "ambiguous" : "locked";
  }

  return { roleLock, slotStability };
}

function cleanExtractedValue(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").replace(/[.!?]+$/g, "");
}

function isValueAmbiguous(value: string): boolean {
  return AMBIGUOUS_LOCATION_TERMS.test(value);
}

export function core(input: string): CoreDecision {
  const trimmed = (input ?? "").trim();
  if (!trimmed) {
    return {
      intent: "AMBIGUOUS",
      facts: [],
      confidence: 0,
      slotStability: { origin: "open", destination: "open" },
      roleLock: { origin: null, destination: null },
    };
  }

  const facts: string[] = [];
  let confidence = 0;

  const u = trimmed.match(URGENCY_RE);
  if (u) facts.push(`urgency:${u[1].toLowerCase()}`);

  const q = trimmed.match(QUERY_RE);
  if (q) facts.push(`query:${q[1].toLowerCase()}`);

  const a = trimmed.match(ACTION_RE);
  if (a) facts.push(`action:${a[1].toLowerCase()}`);

  const p = trimmed.match(PAX_RE);
  if (p) facts.push(`passengers:${p[1]}`);

  const f = trimmed.match(FLIGHT_RE);
  if (f) facts.push(`flight:${f[1].replace(/\s+/g, "")}`);

  const d = trimmed.match(DATE_RE);
  if (d) facts.push(`date:${d[1].toLowerCase().replace(/\s+/g, "_")}`);

  const t = trimmed.match(TIME_RE);
  if (t) facts.push(`time:${t[1].replace(/\s+/g, "")}`);

  if (AMBIGUOUS_LOCATION_TERMS.test(trimmed)) {
    facts.push("location_ambiguous:true");
  }

  if (AFFIRMATION_RE.test(trimmed)) {
    facts.push("affirmation:true");
  }

  // v5.0 FASE 5B.2: detectar estructura sintáctica para role lock.
  const { roleLock, slotStability } = detectStructure(trimmed);
  if (roleLock.origin) facts.push(`origin:${roleLock.origin}`);
  if (roleLock.destination) facts.push(`destination:${roleLock.destination}`);
  if (slotStability.origin !== "open") facts.push(`origin_stability:${slotStability.origin}`);
  if (slotStability.destination !== "open") facts.push(`destination_stability:${slotStability.destination}`);

  if (facts.length === 0) {
    return {
      intent: "AMBIGUOUS",
      facts: [],
      confidence: 0,
      slotStability,
      roleLock,
    };
  }

  const intent: Intent = classifyIntent(facts, slotStability);
  confidence = computeConfidence(facts, intent);

  return { intent, facts, confidence, slotStability, roleLock };
}

function classifyIntent(facts: string[], slotStability?: SlotStabilityMap): Intent {
  const has = (prefix: string) => facts.some((f) => f.startsWith(prefix));
  const hasLocationAmbiguous = has("location_ambiguous:");

  if (has("affirmation:") || has("date:") || has("time:")) {
    if (has("action:") || has("urgency:")) return "ACTION";
    return "STATEFUL";
  }
  // v5.0 FASE 5B.2: si el role lock detectó origin Y destination (ambos roles
  // fijados por sintaxis), el intent es ACTION — el policy usa el formato
  // "Perfecto, tengo origen en X..." para pedir refinamiento.
  if (
    slotStability?.origin &&
    slotStability.origin !== "open" &&
    slotStability?.destination &&
    slotStability.destination !== "open"
  ) {
    return "ACTION";
  }
  // Si hay location_ambiguous y NO hay slots concretos de origen/destino,
  // downgradear a AMBIGUOUS para forzar clarificación en la policy.
  if (hasLocationAmbiguous && !has("origin:") && !has("destination:")) {
    return "AMBIGUOUS";
  }
  if (has("action:") || has("urgency:")) return "ACTION";
  if (has("query:")) return "QUERY";
  if (has("passengers:") || has("flight:")) return "ACTION";
  return "AMBIGUOUS";
}

function computeConfidence(facts: string[], intent: Intent): number {
  let base = 0.4;
  if (intent === "ACTION") base = 0.7;
  if (intent === "QUERY") base = 0.6;
  if (intent === "STATEFUL") base = 0.8;
  if (intent === "AMBIGUOUS") return 0;

  const explicitSignals = facts.filter(
    (f) =>
      f.startsWith("passengers:") ||
      f.startsWith("flight:") ||
      f.startsWith("date:") ||
      f.startsWith("time:") ||
      f.startsWith("urgency:") ||
      f.startsWith("action:") ||
      f.startsWith("query:"),
  ).length;
  const ambiguousSignals = facts.filter((f) => f.startsWith("location_ambiguous:")).length;

  const bonus = Math.min(explicitSignals * 0.1, 0.3);
  const penalty = ambiguousSignals * 0.2;

  return Math.max(0, Math.min(1, base + bonus - penalty));
}
