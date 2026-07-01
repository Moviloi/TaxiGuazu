// CORE — extracción determinista de hechos explícitos.
// Reglas:
// - NO LLM.
// - NO inferencia de ubicación ("centro", "aeropuerto", "cerca" no se extraen como hechos).
// - NO responde al usuario.
// - NO decide modo AHORA/RESERVA.
// - NO completa datos faltantes.
// - Si no hay facts extraídos → intent = "AMBIGUOUS".
//
// slot stability + role lock:
// CORE detecta la estructura sintáctica del input ("estoy en X", "ir a Y",
// "desde X", "origen X y destino Y") y produce roleLock + slotStability.
// Esto es stateful semánticamente: una vez que un slot tiene rol fijo, no se reinterpreta.
// - "estoy en X" / "desde X" → origin = X (locked)
// - "ir a Y" / "voy a Y" → destination = Y (locked)
// - "origen X y|, destino Y" / "origen: X destino: Y" → ambos slots (locked)
// - Si el valor matchea términos ambiguos (centro, hotel) → stability = "ambiguous"
//   (el rol está fijo pero el valor necesita refinamiento).

import { AMBIGUOUS_LOCATION_RE } from "./patterns";
import type { CoreDecision, Intent, RoleLock, SlotStabilityMap, SlotAssignmentConfidence } from "./types";
import { applyLaterals } from "./laterals";

const URGENCY_RE = /\b(ahora|ya|inmediato|urgente|hoy|enseguida)\b/i;
const QUERY_RE = /\b(cu[aá]nto|cu[aá]l|c[oó]mo|d[oó]nde|qu[eé]|precio|tarifa|cuesta|sale|cu[aá]ndo|a qu[eé] hora)\b/i;
const ACTION_RE = /\b(agend[ao]|confirm[oa]|reserv[ao]|reservar|reservame|quiero|necesito|deseo|contrat[ao])\b/i;
const PAX_RE = /\b(?:somos?|viajamos?|hay|son|tenemos?)\s+(\d+)\b|\b(\d+)\s*(?:personas?|pax|pasajeros?)\b/i;
const FLIGHT_RE = /\b(?:vuelo\s*)?([A-Z]{2,3}\s?\d{2,4})\b/i;
const DATE_RE = /\b(hoy|ma[ñn]ana|pasado\s*ma[ñn]ana|esta\s*semana|pr[oó]xim[oa]s?\s*d[ií]as|el\s+(lunes|martes|mi[ée]rcoles|jueves|viernes|s[aá]bado|domingo)|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i;
const TIME_RE = /\b(?:a\s*las?\s*)?(\d{1,2}:\d{2}|\d{1,2}\s*(?:hs|horas|h))\b/i;
const AFFIRMATION_RE = /^(s[ií]|s[ií] confirmo|ok|okey|dale|confirmo|confirmado|de acuerdo|est[aá] bien|perfecto|mandale|adelante|listo|correcto|as[ií] est[aá] bien|est[aá] bien as[ií]|todo correcto|todo bien)(?![a-záéíóúñ])/i;

// 9 nuevos intents — patrones específicos
const GREETING_RE = /\b(hola|buenas|buen[oa]s?\s*(d[ií]as|tardes|noches)|qu[eé] tal|c[oó]mo est[áa]s|saludos|hey)\b/i;
const INFORMATIONAL_RE = /\b(horarios|funcionan|atienden|cu[aá]ndo\s+(abren|cierran)|d[óo]nde\s+(est[áa]n|queda[n]?)|tienen\s+(servicio|traslado|viaje)|c[óo]mo\s+(funciona|trabajan|llegar|ir))\b/i;
const COMMERCIAL_RE = /\b(cu[aá]nto\s+(cuesta|sale|vale|est[áa])|precio|tarifa|cotizaci[óo]n|presupuesto|a\s*cuanto|valor)\b/i;
const PRE_BOOKING_RE = /\b(estoy\s+viendo|estoy\s+pensando|consultar\s+(un\s+)?viaje|info\S*\s+(de\s+)?(un\s+)?viaje|qu[eé]\s+(me\s+)?recomiendas|sugiere|opciones)\b/i;
const BOOKING_RE = /\b(reserv[áa]r|confirm[áa]r|agendar|contratar)\b/i;
const NOW_RE = /\b(ahora|inmediato|urgente|enseguida|lo\s+antes\s+posible|necesito\s+ya|para\s+ahora|ya\s+mismo|al\s+toque)\b/i;
const RESCHEDULE_RE = /\b(reprogramar|cambiar\s+(\w+\s+)?(fecha|hora|reserva|viaje|turno)|modificar\s+(\w+\s+)?(reserva|viaje|fecha|hora|turno))\b/i;
const POST_SERVICE_RE = /\b(gracias\s+por\s+(el\s+)?viaje|excelente\s+servicio|muy\s+bue[nt][ao]|queja|reclamo|devoluci[óo]n|factura|comprobante)\b/i;
const EMERGENCY_RE = /\b(emergencia|ayuda\b|me\s+pas[óo]\s+algo|no\s+(llega|aparece|viene|encuentro)|chofer\s+no\s+(llega|aparece|viene)|perd[ií]\s+el\s+viaje|estoy\s+varad[ao])\b/i;
const CONSULTA_RE = /\b(consultar|consulta|informaci[oó]n|info)\b/i;

// Términos de ubicación que el CORE NO extrae como hechos (son ambiguos para el CORE).
// Definidos en patterns.ts — fuente única.

// patrones de estructura sintáctica para detectar role lock.
// El CORE no infiere semánticamente: solo respeta la sintaxis del input.
// El grupo capturado se detiene en conectores o verbos que indican otro slot.
// IMPORTANTE: en español "al" y "del" son palabras (contracciones) — no
// contienen espacio. El lookahead usa `\s*` para tolerar fin de string.
const ESTOY_EN_RE = /(?:estoy\s+en(?:\s+(?:el|la|los|las|al|del))?|estoy\s+ac[áa]\s+en(?:\s+(?:el|la|al))?|me\s+encuentro\s+en(?:\s+(?:el|la|al))?)\s+([a-záéíóúñ][a-záéíóúñ\s]{1,40}?)(?=\s*(?:desde|hasta|\bir\b|\bvoy\b|\bquiero\b|\bvamos\b|\bnecesito\b|pero|\by\b|[,;.!?]|$))/i;
const IR_A_RE = /\b(?:voy|ir|quiero\s+ir|vamos)\s+(?:a\s+(?:el|la|los|las)\s+|a\s+|al\s+|del\s+)?([a-záéíóúñ][a-záéíóúñ\s]{1,40}?)(?=\s*(?:desde|hasta|\ba\b\s+[a-záéíóúñ]{3,}|\bestoy\b|pero|\by\b|ahora\b|hoy\b|mañana\b|luego\b|después\b|esta\s+noche|[,;.!?]|$))/i;
const DESDE_RE = /(?:desde|partiendo\s+de|saliendo\s+de)\s+(?:el\s+|la\s+|los\s+|las\s+|al\s+|del\s+)?([a-záéíóúñ][a-záéíóúñ\s]{1,40}?)(?=\s*(?:hasta|\ba\b\s+(?:el|la|los|las)|\ba\b\s+[a-záéíóúñ]{3,}|\bvoy\b|\bir\b|\bquiero\b|\bvamos\b|\bnecesito\b|pero|\by\b|[,;.!?]|$))/i;
const HASTA_RE = /(?:hasta|hacia)\s+(?:el\s+|la\s+|los\s+|las\s+|al\s+|del\s+)?([a-záéíóúñ][a-záéíóúñ\s]{1,40}?)(?=\s*(?:desde|estoy|por|para|gracias|con|\ba\b\s+[a-záéíóúñ]{3,}|[,;.!?]|$))/i;

// v5.x: patrón "origen X y|, destino Y" / "origen: X destino: Y"
const ORIGEN_DESTINO_RE = /origen\s*:?\s*([a-záéíóúñ][a-záéíóúñ\s]{1,40}?)\s*(?:,|\by\b)?\s*destino\s*:?\s*([a-záéíóúñ][a-záéíóúñ\s]{1,40}?)(?=\s*(?:\bpor\b|\bpara\b|\bgracias\b|\by\b|$|[.,!?]))/i;

function detectStructure(input: string): {
  roleLock: RoleLock;
  slotStability: SlotStabilityMap;
  slotAssignmentConfidence: SlotAssignmentConfidence;
} {
  const roleLock: RoleLock = { origin: null, destination: null };
  const slotStability: SlotStabilityMap = { origin: "open", destination: "open" };
  const slotAssignmentConfidence: SlotAssignmentConfidence = { origin: 0, destination: 0 };

  // Prioridad: "estoy en X" (más específico, marca ubicación actual) > "desde X" (marca partida).
  // En español rioplatense, "estoy en el aeropuerto quiero ir al centro" es lo más natural.
  const estoyEn = input.match(ESTOY_EN_RE);
  if (estoyEn) {
    const value = cleanExtractedValue(estoyEn[1]);
    roleLock.origin = value;
    slotStability.origin = isValueAmbiguous(value) ? "ambiguous" : "locked";
    slotAssignmentConfidence.origin = 0.95; // "estoy en {X}" → certeza muy alta de que es origen
  }

  // "ir a Y" / "voy a Y" → destination
  const irA = input.match(IR_A_RE);
  if (irA) {
    const value = cleanExtractedValue(irA[1]);
    roleLock.destination = value;
    slotStability.destination = isValueAmbiguous(value) ? "ambiguous" : "locked";
    slotAssignmentConfidence.destination = 0.90; // "ir a {Y}" → certeza alta de que es destino
  }

  // "hasta Y" / "hacia Y" → destination. Solo asigna si IR_A no lo hizo.
  if (!roleLock.destination) {
    const hasta = input.match(HASTA_RE);
    if (hasta) {
      const value = cleanExtractedValue(hasta[1]);
      roleLock.destination = value;
      slotStability.destination = isValueAmbiguous(value) ? "ambiguous" : "locked";
      slotAssignmentConfidence.destination = 0.80; // "hasta {Y}" → certeza moderada-alta
    }
  }

  // "desde X" → origin. Solo asigna si "estoy en" no lo hizo.
  const desdeX = input.match(DESDE_RE);
  if (desdeX && !roleLock.origin) {
    const value = cleanExtractedValue(desdeX[1]);
    roleLock.origin = value;
    slotStability.origin = isValueAmbiguous(value) ? "ambiguous" : "locked";
    slotAssignmentConfidence.origin = 0.85; // "desde {X}" → certeza alta
  }

  // v5.x: "origen X y|, destino Y" / "origen: X destino: Y"
  const origenDestino = input.match(ORIGEN_DESTINO_RE);
  if (origenDestino) {
    const originValue = cleanExtractedValue(origenDestino[1]);
    const destValue = cleanExtractedValue(origenDestino[2]);
    if (!roleLock.origin) {
      roleLock.origin = originValue;
      slotStability.origin = isValueAmbiguous(originValue) ? "ambiguous" : "locked";
      slotAssignmentConfidence.origin = 0.95;
    }
    if (!roleLock.destination) {
      roleLock.destination = destValue;
      slotStability.destination = isValueAmbiguous(destValue) ? "ambiguous" : "locked";
      slotAssignmentConfidence.destination = 0.95;
    }
  }

  return { roleLock, slotStability, slotAssignmentConfidence };
}

function cleanExtractedValue(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").replace(/[.!?]+$/g, "");
}

function isValueAmbiguous(value: string): boolean {
  return AMBIGUOUS_LOCATION_RE.test(value);
}

export function core(input: string, prevIntent?: Intent): CoreDecision {
  const trimmed = (input ?? "").trim();
  if (!trimmed) {
    return {
      intent: "AMBIGUOUS",
      facts: [],
      confidence: 0,
      slotStability: { origin: "open", destination: "open" },
      roleLock: { origin: null, destination: null },
      slotAssignmentConfidence: { origin: 0, destination: 0 },
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
  if (p) {
    const paxVal = p[1] ?? p[2];
    if (paxVal) facts.push(`passengers:${paxVal}`);
  }

  const f = trimmed.match(FLIGHT_RE);
  if (f) facts.push(`flight:${f[1].replace(/\s+/g, "")}`);

  const d = trimmed.match(DATE_RE);
  if (d) facts.push(`date:${d[1].toLowerCase().replace(/\s+/g, "_")}`);

  const t = trimmed.match(TIME_RE);
  if (t) facts.push(`time:${t[1].replace(/\s+/g, "")}`);

  if (AMBIGUOUS_LOCATION_RE.test(trimmed)) {
    facts.push("location_ambiguous:true");
  }

  if (AFFIRMATION_RE.test(trimmed)) {
    facts.push("affirmation:true");
  }

  // 9 nuevos intents — extraer facts específicos
  const g = trimmed.match(GREETING_RE);
  if (g) facts.push(`greeting:${g[1].toLowerCase()}`);

  const inf = trimmed.match(INFORMATIONAL_RE);
  if (inf) facts.push(`informational:${inf[1].toLowerCase()}`);

  const com = trimmed.match(COMMERCIAL_RE);
  if (com) facts.push(`commercial:${com[1].toLowerCase()}`);

  const pb = trimmed.match(PRE_BOOKING_RE);
  if (pb) facts.push(`pre_booking:${pb[1].toLowerCase()}`);

  const b = trimmed.match(BOOKING_RE);
  if (b) facts.push(`booking:${b[1].toLowerCase()}`);

  const n = trimmed.match(NOW_RE);
  if (n) facts.push(`now:${n[1].toLowerCase()}`);

  const rs = trimmed.match(RESCHEDULE_RE);
  if (rs) facts.push(`reschedule:${rs[1].toLowerCase()}`);

  const ps = trimmed.match(POST_SERVICE_RE);
  if (ps) facts.push(`post_service:${ps[1].toLowerCase()}`);

  const em = trimmed.match(EMERGENCY_RE);
  if (em) facts.push(`emergency:${em[1].toLowerCase()}`);

  const cs = trimmed.match(CONSULTA_RE);
  if (cs) facts.push(`consulta:${cs[1].toLowerCase()}`);

  // detectar estructura sintáctica para role lock y confianza de asignación.
  const { roleLock, slotStability, slotAssignmentConfidence } = detectStructure(trimmed);
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
      slotAssignmentConfidence,
    };
  }

  const intent: Intent = classifyIntent(facts, slotStability);

  // FASE A3 Capa 2: contexto de intención previa
  const finalIntent: Intent = (prevIntent && prevIntent !== "AMBIGUOUS" && prevIntent !== "GREETING")
    ? (intent === "PRE_BOOKING"
        ? prevIntent
        : intent === prevIntent && (facts.some(f => f.startsWith("commercial:")) || facts.some(f => f.startsWith("consulta:")))
          ? "CONSULTA"
          : intent)
    : intent;

  confidence = computeConfidence(facts, finalIntent);

  const lateral = applyLaterals({ intent: finalIntent, facts, confidence, slotStability, roleLock, slotAssignmentConfidence });
  return { intent: finalIntent, facts, confidence, slotStability, roleLock, slotAssignmentConfidence, lateral };
}

function classifyIntent(facts: string[], slotStability?: SlotStabilityMap): Intent {
  const has = (prefix: string) => facts.some((f) => f.startsWith(prefix));
  const hasLocationAmbiguous = has("location_ambiguous:");

  // prioridad estricta de 1 (más alta) a 11 (más baja).

  // 1. Lateral intents (emergencia, reprogramación, post-servicio)
  if (has("emergency:")) return "EMERGENCY";
  if (has("reschedule:")) return "RESCHEDULE";
  if (has("post_service:")) return "POST_SERVICE";

  // 2. Greeting sin otras señales sustantivas (query genérica como "cómo estás" se incluye)
  if (has("greeting:") && !facts.some(f =>
    f.startsWith("action:") || f.startsWith("urgency:") ||
    f.startsWith("booking:") || f.startsWith("pre_booking:") || f.startsWith("now:") ||
    f.startsWith("commercial:") || f.startsWith("informational:") ||
    f.startsWith("passengers:") || f.startsWith("flight:") ||
    f.startsWith("date:") || f.startsWith("time:") || f.startsWith("affirmation:") ||
    f.startsWith("origin:") || f.startsWith("destination:") ||
    f.startsWith("location_ambiguous:")
  )) return "GREETING";

  // 3. Consulta explícita (solo si no hay señales operativas fuertes)
  if (has("consulta:") && !has("emergency:") && !has("reschedule:") && !has("post_service:") &&
      !has("booking:") && !has("pre_booking:") && !has("now:") && !has("urgency:")) {
    return "CONSULTA";
  }

  // 4. Continuation signals
  // "action:" genérico (como "confirmo") no es señal fuerte de booking nuevo
  if (has("affirmation:") || has("date:") || has("time:")) {
    if (has("booking:") || has("now:") || has("urgency:")) {
      if (has("now:") || has("urgency:")) return "NOW";
      return "BOOKING";
    }
    return "PRE_BOOKING";
  }

  // 5. Ambos roles fijados por sintaxis → booking o now
  if (
    slotStability?.origin &&
    slotStability.origin !== "open" &&
    slotStability?.destination &&
    slotStability.destination !== "open"
  ) {
    if (has("now:") || has("urgency:")) return "NOW";
    return "BOOKING";
  }

  // 6. Señales de acción
  if (has("now:") || has("urgency:")) return "NOW";
  if (has("booking:")) return "BOOKING";
  if (has("pre_booking:")) return "PRE_BOOKING";
  if (has("action:")) return "BOOKING";

  // 7. Señales de consulta
  if (has("commercial:")) return "COMMERCIAL";
  if (has("informational:")) return "INFORMATIONAL";
  if (has("query:")) return "COMMERCIAL";

  // 8. Señales implícitas de booking (pasajeros, vuelo)
  if (has("passengers:") || has("flight:")) return "BOOKING";

  // 9. Location ambiguous sin slots concretos → consulta
  if (hasLocationAmbiguous && !has("origin:") && !has("destination:")) {
    return "CONSULTA";
  }

  // 10. Greeting que coexiste con otras señales (fallback)
  if (has("greeting:")) return "GREETING";

  // 11. Default — mensaje válido pero sin intención operativa clara
  return "CONSULTA";
}

function computeConfidence(facts: string[], intent: Intent): number {
  if (intent === "AMBIGUOUS") return 0;

  let base = 0.4;
  if (intent === "GREETING") base = 0.3;
  if (intent === "CONSULTA") base = 0.4;
  if (intent === "INFORMATIONAL") base = 0.55;
  if (intent === "COMMERCIAL") base = 0.6;
  if (intent === "PRE_BOOKING") base = 0.7;
  if (intent === "BOOKING") base = 0.8;
  if (intent === "NOW") base = 0.85;
  if (intent === "RESCHEDULE") base = 0.7;
  if (intent === "POST_SERVICE") base = 0.5;
  if (intent === "EMERGENCY") base = 0.9;
  const explicitSignals = facts.filter(
    (f) =>
      f.startsWith("passengers:") ||
      f.startsWith("flight:") ||
      f.startsWith("date:") ||
      f.startsWith("time:") ||
      f.startsWith("urgency:") ||
      f.startsWith("action:") ||
      f.startsWith("query:") ||
      f.startsWith("greeting:") ||
      f.startsWith("informational:") ||
      f.startsWith("commercial:") ||
      f.startsWith("pre_booking:") ||
      f.startsWith("booking:") ||
      f.startsWith("now:") ||
      f.startsWith("reschedule:") ||
      f.startsWith("post_service:") ||
      f.startsWith("emergency:") ||
      f.startsWith("affirmation:"),
  ).length;
  const ambiguousSignals = facts.filter((f) => f.startsWith("location_ambiguous:")).length;

  const bonus = Math.min(explicitSignals * 0.1, 0.3);
  const penalty = ambiguousSignals * 0.2;

  return Math.max(0, Math.min(1, base + bonus - penalty));
}
