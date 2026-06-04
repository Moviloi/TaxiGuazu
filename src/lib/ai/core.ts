// CORE — extracción determinista de hechos explícitos.
// Reglas:
// - NO LLM.
// - NO inferencia de ubicación ("centro", "aeropuerto", "cerca" no se extraen como hechos).
// - NO responde al usuario.
// - NO decide modo AHORA/RESERVA.
// - NO completa datos faltantes.
// - Si no hay facts extraídos → intent = "AMBIGUOUS".

import type { CoreDecision, Intent } from "./types";

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

export function core(input: string): CoreDecision {
  const trimmed = (input ?? "").trim();
  if (!trimmed) {
    return { intent: "AMBIGUOUS", facts: [], confidence: 0 };
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

  if (facts.length === 0) {
    return { intent: "AMBIGUOUS", facts: [], confidence: 0 };
  }

  const intent: Intent = classifyIntent(facts);
  confidence = computeConfidence(facts, intent);

  return { intent, facts, confidence };
}

function classifyIntent(facts: string[]): Intent {
  const has = (prefix: string) => facts.some((f) => f.startsWith(prefix));
  const hasLocationAmbiguous = has("location_ambiguous:");

  if (has("affirmation:") || has("date:") || has("time:")) {
    if (has("action:") || has("urgency:")) return "ACTION";
    return "STATEFUL";
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
