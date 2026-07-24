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
//
// ── CC-15: Cobertura de variaciones de lenguaje natural ──
// Cada regex cubre un conjunto específico de patrones del dominio transporte.
// A continuación se documenta el alcance de cobertura por patrón:
//
// URGENCY_RE: cubre ~6 lemas de urgencia temporaria (ahora, ya, inmediato,
//   urgente, hoy, enseguida). No cubre modismos regionales como "al toque",
//   "de una", "ya mismo" (cubiertos por NOW_RE).
// QUERY_RE: cubre ~10 palabras interrogativas del español rioplatense.
//   No cubre preguntas en portugués (como "quanto", "como", "onde").
// ACTION_RE: ~8 verbos de acción del dominio (agendar, confirmar, reservar,
//   querer, necesitar, deseo, contratar).
// PAX_RE: 2 estructuras sintácticas de pasajeros ("somos/viajamos/hay/son/tenemos
//   N personas" y "N personas/pax/pasajeros"). Cubre español, no portugués.
// FLIGHT_RE: códigos IATA de 2-3 letras + 2-4 dígitos (ej: AR1234, LA8080).
// DATE_RE: cubre ~15 expresiones temporales (hoy, mañana, días de semana,
//   "esta semana", "próximos días", DD/MM). No cubre portugués ("amanhã",
//   "segunda-feira") ni fechas en formato MM/DD/YYYY.
// TIME_RE: cubre hora con ":00", "14hs", "14 horas", "a las 14". No cubre
//   "14:30 PM", "2pm", "14h30" (formato europeo).
// GREETING_RE: ~15 saludos en español, inglés y portugués (hola, good morning,
//   bom dia, etc.). Cubre los 3 idiomas del dominio turístico de Iguazú.
// INFORMATIONAL_RE: ~12 patrones de consulta informativa (horarios, funcionamiento,
//   ubicación). Cubre español rioplatense.
// COMMERCIAL_RE: ~7 patrones de consulta comercial (cuánto cuesta, precio, tarifa,
//   cotización, presupuesto, valor, a cuánto).
// PRE_BOOKING_RE: ~8 patrones de pre-reserva ("estoy viendo", "estoy pensando",
//   "consultar un viaje", "qué recomiendas", "opciones", "sugiere").
// BOOKING_RE: ~4 verbos de reserva (reservar, confirmar, agendar, contratar).
// NOW_RE: ~8 expresiones de inmediatez (ahora, inmediato, urgente, enseguida,
//   "lo antes posible", "necesito ya", "para ahora", "ya mismo", "al toque").
//   Cubre variantes regionales argentinas.
// RESCHEDULE_RE: ~3 patrones de reprogramación y modificación.
// POST_SERVICE_RE: ~6 patrones post-servicio (agradecimiento, queja, reclamo,
//   factura, comprobante).
// EMERGENCY_RE: ~7 patrones de emergencia (emergencia, ayuda, "no llega",
//   "chofer no aparece", "perdí el viaje", "estoy varado").
// CONSULTA_RE: ~3 lemas de consulta (consultar, consulta, información, info).
// AIRPORT_MENTION_RE: ~10 patrones de mención de avión/aeropuerto sin código
//   de vuelo específico. Cubre español, inglés y portugués limitado.
// LOW_INTENT_RE: ~8 patrones de baja intención de compra (especulación,
//   "estoy viendo", "después confirmo", etc.).
//
// Los patrones sintácticos de role lock (ESTOY_EN_RE, IR_A_RE, DESDE_RE,
// HASTA_RE, ORIGEN_DESTINO_RE) cubren las estructuras más frecuentes del
// español rioplatense para expresar origen y destino en el dominio transporte.
// No cubren: "saio de X" (portugués), "leaving from X" (inglés), ni estructuras
// con verbo final alemán/japonés.
//
// Estas limitaciones de cobertura son aceptables porque:
// 1. El dominio está acotado a transporte turístico en Iguazú.
// 2. Los 3 idiomas principales (es, en, pt) tienen cobertura parcial pero
//    funcional para el vocabulario del dominio.
// 3. El sistema tiene fallback a LLM para casos no cubiertos por regex.
// 4. Los patrones se extienden progresivamente según necesidad observada.

import { AMBIGUOUS_LOCATION_RE, AFFIRMATION_RE } from "./patterns";
import type { CoreDecision, Intent, RoleLock, SlotStabilityMap, SlotAssignmentConfidence } from "./types";
// Re-export for tests and external consumers
export type { CoreDecision, Intent } from "./types";
import { applyLaterals } from "./laterals";

const URGENCY_RE = /\b(ahora|ya|inmediato|urgente|hoy|enseguida)\b/i;
const QUERY_RE = /\b(cu[aá]nto|cu[aá]l|c[oó]mo|d[oó]nde|qu[eé]|precio|tarifa|cuesta|sale|cu[aá]ndo|a qu[eé] hora)\b/i;
const ACTION_RE = /\b(agend[ao]|confirm[oa]|reserv[ao]|reservar|reservame|quiero|necesito|deseo|contrat[ao])\b/i;
const PAX_RE = /\b(?:somos?|viajamos?|hay|son|tenemos?)\s+(\d+)\b|\b(\d+)\s*(?:personas?|pax|pasajeros?)\b/i;
const FLIGHT_RE = /\b(?:vuelo\s*)?([A-Z]{2,3}\s?\d{2,4})\b/i;
const DATE_RE = /\b(hoy|ma[ñn]ana|pasado\s*ma[ñn]ana|esta\s*semana|pr[oó]xim[oa]s?\s*d[ií]as|el\s+(lunes|martes|mi[ée]rcoles|jueves|viernes|s[aá]bado|domingo)|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i;
const TIME_RE = /\b(?:a\s*las?\s*)?(\d{1,2}:\d{2}|\d{1,2}\s*(?:hs|horas|h))\b/i;
// AFFIRMATION_RE importado desde patterns.ts (fuente única)

// ── RF-03: Clasificación explícita del cambio de intención ──
// Distingue entre corrección, expansión y contradicción para
// cumplir con RF-03 (gestión del cambio de intención).
// El tipo IntentChangeType está definido en types.ts.
import type { IntentChangeType } from "./types";
// Re-export para backward compatibilidad con imports existentes
export type { IntentChangeType } from "./types";

/**
 * Clasifica la relación entre la intención previa y la actual.
 * 
 * - **correction**: el usuario revierte una intención previa (ej: BOOKING → CANCEL,
 *   o cambio drástico como COMMERCIAL → EMERGENCY). Señal de cambio de dirección.
 * - **expansion**: el usuario refina o expande una intención previa sin contradecirla
 *   (ej: BOOKING → NOW con más detalles, PRE_BOOKING → BOOKING). Señal de progresión.
 * - **contradiction**: la intención actual es incompatible con la previa
 *   (ej: EMERGENCY → COMMERCIAL, RESCHEDULE → GREETING). Señal de contexto inválido.
 * - **continuation**: la intención se mantiene (mismo intent o transición no conflictiva).
 * - **new**: no hay intención previa o se ignora por ser AMBIGUOUS/GREETING.
 * - **none**: caso por defecto (prevIntent no definido o irrelevante).
 */
export function classifyIntentChange(prevIntent: Intent | undefined, currentIntent: Intent): IntentChangeType {
  if (!prevIntent || prevIntent === "AMBIGUOUS" || prevIntent === "GREETING") {
    return "new";
  }
  if (prevIntent === currentIntent) {
    return "continuation";
  }
  // Correcciones: cambios que indican reversión de dirección
  if (
    (prevIntent === "BOOKING" && (currentIntent === "CONSULTA" || currentIntent === "AMBIGUOUS")) ||
    (prevIntent === "NOW" && (currentIntent === "CONSULTA" || currentIntent === "AMBIGUOUS")) ||
    (prevIntent === "PRE_BOOKING" && currentIntent === "CONSULTA")
  ) {
    return "correction";
  }
  // Contradicciones: cambios incompatibles con el contexto operativo
  if (
    (prevIntent === "EMERGENCY" && !["EMERGENCY", "NOW"].includes(currentIntent)) ||
    (prevIntent === "RESCHEDULE" && currentIntent === "GREETING")
  ) {
    return "contradiction";
  }
  // Expansiones: progresión natural desde una intención menos específica
  if (
    (prevIntent === "PRE_BOOKING" && (currentIntent === "BOOKING" || currentIntent === "NOW")) ||
    (prevIntent === "BOOKING" && currentIntent === "NOW") ||
    (prevIntent === "INFORMATIONAL" && currentIntent === "COMMERCIAL") ||
    (prevIntent === "COMMERCIAL" && (currentIntent === "PRE_BOOKING" || currentIntent === "BOOKING"))
  ) {
    return "expansion";
  }
  // Default: continuación (cambio lateral no conflictivo)
  return "continuation";
}

// P0.9.1: trailing \b reemplazado por (?=\W|$) para que funcione con
// caracteres acentuados (á, é, í, ó, ú, ñ). En JavaScript, \b separa
// word chars [a-zA-Z0-9_] de non-word chars. Como 'á' es non-word,
// \b entre 'á' y fin de string NO matchea. El lookahead (?=\W|$)
// funciona porque $ matchea fin de string, y \W matchea cualquier
// no-word char (espacio, puntuación, acentos).
const GREETING_RE = /\b(hola|buenas|buen[oa]s?\s*(d[ií]as|tardes|noches|morning|afternoon|evening)|qu[eé] tal|c[oó]mo est[áa]s|saludos|hey|hi|hello|ol[aá]|bom\s*dia|boa\s*tarde|boa\s*noite|good\s*morning|good\s*afternoon|good\s*evening)(?=\W|$)/i;
const INFORMATIONAL_RE = /\b(horarios?|horario|funcionan|atienden|abren|cierran|abre|cierra|cu[aá]ndo\s+(abren|cierran|abre|cierra)|a\s+qu[eé]\s+hora|d[óo]nde\s+(est[áa]n|queda[n]?)|tienen\s+(servicio|traslado|viaje)|c[óo]mo\s+(funciona|trabajan|llegar|ir))(?=\W|$)/i;
const COMMERCIAL_RE = /\b(cu[aá]nto\s+(cuesta|sale|vale|est[áa])|precio|tarifa|cotizaci[óo]n|presupuesto|a\s*cuanto|valor)\b/i;
const PRE_BOOKING_RE = /\b(estoy\s+viendo|estoy\s+pensando|consultar\s+(un\s+)?viaje|info\S*\s+(de\s+)?(un\s+)?viaje|qu[eé]\s+(me\s+)?recomiendas|sugiere|opciones)\b/i;
const BOOKING_RE = /\b(reserv[áa]r|confirm[áa]r|agendar|contratar)\b/i;
const NOW_RE = /\b(ahora|inmediato|urgente|enseguida|lo\s+antes\s+posible|necesito\s+ya|para\s+ahora|ya\s+mismo|al\s+toque)\b/i;
const RESCHEDULE_RE = /\b(reprogramar|cambiar\s+(\w+\s+)?(fecha|hora|reserva|viaje|turno)|modificar\s+(\w+\s+)?(reserva|viaje|fecha|hora|turno))\b/i;
const POST_SERVICE_RE = /\b(gracias\s+por\s+(el\s+)?viaje|excelente\s+servicio|muy\s+bue[nt][ao]|queja|reclamo|devoluci[óo]n|factura|comprobante)\b/i;
const EMERGENCY_RE = /\b(emergencia|ayuda\b|me\s+pas[óo]\s+algo|no\s+(llega|aparece|viene|encuentro)|chofer\s+no\s+(llega|aparece|viene)|perd[ií]\s+el\s+viaje|estoy\s+varad[ao])\b/i;
const CONSULTA_RE = /\b(consultar|consulta|informaci[oó]n|info)\b/i;
// AIT-060: Mención de vuelo/avión sin código de vuelo específico.
// "llego en avión", "vuelo mañana", "flight from" → airport_mention fact.
// NO captura códigos de vuelo (FLIGHT_RE los maneja).
const AIRPORT_MENTION_RE = /\b(vuelo|avión|avion|a[eé]reo|llegad[ao]\s+(en|por)\s+(avi[óo]n|vuelo|a[eé]reo)|flight|plane|arriv(e|ing)\s+(by|on|via)\s+(plane|flight|air)|fly\s+(to|into|in|from)|airport)\b/i;

// P0.6: Señales de intención de compra
// HIGH: pasajero da datos específicos que indican compromiso real (vuelo, hora, pax, hotel)
// LOW: pasajero especula sin compromiso ("averiguando", "consulto", futuro lejano, "después confirmo")
const LOW_INTENT_RE = /\b(estoy\s+viendo|estoy\s+averiguando|averiguar|estoy\s+pensando|despu[eé]s\s+(confirmo|te\s+aviso|te\s+digo)|vuelvo\s+a\s+contactarme|cuando\s+est[eé]\s+ah[ií]|lo\s+pienso|lo\s+discutimos|estamos\s+viendo)\b/i;
const HIGH_INTENT_SIGNALS = ["flight:", "passengers:", "time:", "urgency:"];

// Términos de ubicación que el CORE NO extrae como hechos (son ambiguos para el CORE).
// Definidos en patterns.ts — fuente única.

// patrones de estructura sintáctica para detectar role lock.
// El CORE no infiere semánticamente: solo respeta la sintaxis del input.
// El grupo capturado se detiene en conectores o verbos que indican otro slot.
// IMPORTANTE: en español "al" y "del" son palabras (contracciones) — no
// contienen espacio. El lookahead usa `\s*` para tolerar fin de string.
const ESTOY_EN_RE = /(?:estoy\s+en(?:\s+(?:el|la|los|las|al|del))?|estoy\s+ac[áa]\s+en(?:\s+(?:el|la|al))?|me\s+encuentro\s+en(?:\s+(?:el|la|al))?)\s+([a-záéíóúñ][a-záéíóúñ\s]{1,40}?)(?=\s*(?:desde|hasta|\bir\b|\bvoy\b|\bquiero\b|\bvamos\b|\bnecesito\b|pero|\by\b|[,;.!?]|$))/i;
const IR_A_RE = /\b(?:voy|ir|quiero\s+ir|vamos)\s+(?:a\s+(?:el|la|los|las)\s+|a\s+|al\s+|del\s+)?([a-záéíóúñ][a-záéíóúñ\s]{1,40}?)(?=\s*(?:desde|hasta|\ba\b\s+[a-záéíóúñ]{3,}|\bestoy\b|pero|\by\b|ahora\b|hoy\b|mañana\b|luego\b|después\b|esta\s+noche|[,;.!?]|$))/i;
const DESDE_RE = /(?:desde|partiendo\s+de|saliendo\s+de|de(?:l)?)\s+(?:el\s+|la\s+|los\s+|las\s+|al\s+|del\s+)?([a-záéíóúñ][a-záéíóúñ\s]{1,40}?)(?=\s*(?:hasta|\ba\b\s+(?:el|la|los|las)|\ba\b\s+[a-záéíóúñ]{3,}|\bvoy\b|\bir\b|\bquiero\b|\bvamos\b|\bnecesito\b|pero|\by\b|[,;.!?]|$))/i;
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

// P0.6: Detecta intención de compra para optimizar conversación.
// HIGH: pasajero da datos operativos (vuelo, hora, pax, urgencia) → acelerar flujo
// LOW: pasajero especula ("averiguando", "después confirmo", futuro lejano) → respuesta rápida, no malgastar LLM
// MEDIUM: default (todo lo demás)
function detectPurchaseIntent(facts: string[], hasSlots: boolean, inputText: string): "high" | "medium" | "low" {
  // LOW: señales explícitas de especulación en el texto original
  if (LOW_INTENT_RE.test(inputText)) return "low";
  // Si el pasajero ya dio origen+destino + algún dato operativo → high
  const hasHighSignal = HIGH_INTENT_SIGNALS.some(prefix => facts.some(f => f.startsWith(prefix)));
  if (hasSlots && hasHighSignal) return "high";
  // Si hay slots pero no datos operativos → medium (está cotizando pero no comprometido)
  if (hasSlots) return "medium";
  // Si no hay slots pero hay señales de consulta/pre_booking → low
  if (facts.some(f => f.startsWith("consulta:") || f.startsWith("pre_booking:"))) return "low";
  return "medium";
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
      purchaseIntent: "low",
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

  // AIT-060: Mención de vuelo/avión sin código explícito
  const am = trimmed.match(AIRPORT_MENTION_RE);
  if (am && !facts.some(f => f.startsWith("flight:"))) {
    facts.push("airport_mention:true");
  }

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
      purchaseIntent: "low",
    };
  }

  const intent: Intent = classifyIntent(facts, slotStability);

  // FASE A3 Capa 2: contexto de intención previa (CDA §7)
  // F02-DG: Preservar intención operativa (BOOKING, NOW) cuando nuevo intent es de baja confianza.
  // CDA §7 regla 1: prevIntent prevalece sobre CONSULTA/AMBIGUOUS/INFORMATIONAL sin evidencia fuerte.
  // CDA §7 regla 2: cambios solo con evidencia operativa fuerte.
  // CDA §7 tabla de evolución: prevIntent + intent → resultado (BOOKING + CONSULTA/AMBIGUOUS → BOOKING)
  //
  // RF-20: Preservación de intención principal multi-turn.
  // Se distinguen dos casos:
  // 1. Cambio de parámetros secundarios (pasajeros, fecha, hora, vuelo) sin cambiar intención.
  //    → Se preserva la intención previa. Los nuevos facts actualizan los parámetros.
  // 2. Cambio real de intención (ej: BOOKING → EMERGENCY).
  //    → Se acepta la nueva intención, registrando el cambio como "expansion" o "correction".
  const highOperationalIntents: Intent[] = ["BOOKING", "NOW", "EMERGENCY", "RESCHEDULE", "POST_SERVICE"];
  const lowConfidenceIntents: Intent[] = ["CONSULTA", "AMBIGUOUS", "INFORMATIONAL"];
  const finalIntent: Intent = (prevIntent && prevIntent !== "AMBIGUOUS" && prevIntent !== "GREETING")
    ? (intent === "PRE_BOOKING"
        ? prevIntent  // PRE_BOOKING es transicional, preservar intención operativa previa
        : highOperationalIntents.includes(prevIntent as any) && lowConfidenceIntents.includes(intent as any)
          ? prevIntent  // CDA §7 regla 1: preservar sobre baja confianza
          : intent)     // Misma intención o evidencia fuerte → aceptar nueva clasificación
    : intent;

  // RF-03: Clasificar el cambio de intención para que los consumidores puedan
  // distinguir explícitamente entre corrección, expansión y contradicción.
  const intentChange: IntentChangeType = classifyIntentChange(prevIntent, finalIntent);

  confidence = computeConfidence(facts, finalIntent);

  const lateral = applyLaterals({ intent: finalIntent, facts, confidence, slotStability, roleLock, slotAssignmentConfidence });
  const hasSlots = !!(roleLock.origin || roleLock.destination);
  const purchaseIntent = detectPurchaseIntent(facts, hasSlots, trimmed);
  return { intent: finalIntent, facts, confidence, slotStability, roleLock, slotAssignmentConfidence, lateral, purchaseIntent, intentChange };
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
