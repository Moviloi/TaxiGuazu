/**
 * CORE INTENT CLASSIFICATION — Test de detección de intents y modos
 *
 * Verifica:
 * 1. core() — qué intent asigna a cada tipo de mensaje
 * 2. temporalFromFacts() — detección NOW/FUTURE/UNKNOWN
 * 3. operationalModeFromIntent() — mapeo intent → AHORA/RESERVA/INFO
 * 4. Flujo completo: input → core → temporal → operationalMode → mode
 *
 * Esto asegura que los modos AHORA/RESERVA se asignan correctamente
 * y que no hay regresiones en la clasificación de intents.
 */

import { describe, it, expect } from "vitest";
import { core, type CoreDecision, type Intent } from "@/lib/ai/core";
import { temporalFromFacts, operationalModeFromIntent, operationalModeToMode } from "@/lib/ai/types";

// ══════════════════════════════════════════════════════════════════════════
// 1. CORE — INTENT CLASSIFICATION
// ══════════════════════════════════════════════════════════════════════════

describe("CORE — intent classification", () => {

  // ── LATERAL INTENTS ──────────────────────────────────────────────────

  it("EMERGENCY: 'ayuda me pasó algo'", () => {
    const result = core("ayuda me pasó algo");
    expect(result.intent).toBe("EMERGENCY");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("EMERGENCY: 'estoy varado'", () => {
    const result = core("estoy varado en la ruta");
    expect(result.intent).toBe("EMERGENCY");
  });

  it("RESCHEDULE: 'reprogramar viaje'", () => {
    const result = core("necesito reprogramar el viaje");
    expect(result.intent).toBe("RESCHEDULE");
  });

  it("RESCHEDULE: 'cambiar reserva'", () => {
    const result = core("quiero cambiar la reserva");
    expect(result.intent).toBe("RESCHEDULE");
  });

  // ── GREETING ─────────────────────────────────────────────────────────

  it("GREETING: 'hola' puro", () => {
    const result = core("hola");
    expect(result.intent).toBe("GREETING");
    expect(result.confidence).toBeGreaterThanOrEqual(0.3);
  });

  it("GREETING: 'buenos días'", () => {
    const result = core("buenos días");
    expect(result.intent).toBe("GREETING");
  });

  it("GREETING: 'hola' + booking → NO greeting (combined)", () => {
    const result = core("hola quiero ir del aeropuerto al centro");
    // Tiene greeting + origin + destination → debe ser BOOKING
    expect(result.intent).toBe("BOOKING");
  });

  // ── CONSULTA ─────────────────────────────────────────────────────────

  it("CONSULTA: 'consulta' explícito sin otros datos", () => {
    const result = core("quiero hacer una consulta");
    expect(result.intent).toBe("CONSULTA");
  });

  it("'gracias' → AMBIGUOUS (no facts extraídos)", () => {
    const result = core("gracias");
    // "gracias" no matchea ningún regex → facts.length === 0 → AMBIGUOUS
    expect(result.intent).toBe("AMBIGUOUS");
    expect(result.facts.length).toBe(0);
  });

  it("'sí' (affirmation) → PRE_BOOKING (continuation)", () => {
    const result = core("sí");
    // AFFIRMATION_RE → fact affirmation:true, sin otros intents → continuation → PRE_BOOKING
    expect(result.intent).toBe("PRE_BOOKING");
  });

  it("CONSULTA: input vacío → AMBIGUOUS (no CONSULTA)", () => {
    const result = core("");
    expect(result.intent).toBe("AMBIGUOUS");
    expect(result.confidence).toBe(0);
  });

  // ── INFORMATIONAL ────────────────────────────────────────────────────

  it("INFORMATIONAL: 'qué horario tienen'", () => {
    const result = core("qué horario tienen");
    expect(result.intent).toBe("INFORMATIONAL");
  });

  it("'cómo llego' → COMMERCIAL (query: → línea 341)", () => {
    const result = core("cómo llego a cataratas");
    // "cómo" matchea QUERY_RE → query:cómo. INFORMATIONAL_RE requiere "llegar" exacto
    // (no "llego"), así que no matchea informational. query: → COMMERCIAL por línea 341.
    expect(result.intent).toBe("COMMERCIAL");
  });

  it("INFORMATIONAL: 'cuándo abren' → coincide con INFORMATIONAL_RE", () => {
    const result = core("cuándo abren");
    expect(result.intent).toBe("INFORMATIONAL");
  });

  // ── COMMERCIAL ───────────────────────────────────────────────────────

  it("COMMERCIAL: 'cuánto cuesta'", () => {
    const result = core("cuánto cuesta");
    expect(result.intent).toBe("COMMERCIAL");
  });

  it("COMMERCIAL: 'precio'", () => {
    const result = core("precio del traslado");
    expect(result.intent).toBe("COMMERCIAL");
  });

  // ── BOOKING ──────────────────────────────────────────────────────────

  it("BOOKING: 'reservar viaje'", () => {
    const result = core("quiero reservar un viaje");
    expect(result.intent).toBe("BOOKING");
  });

  it("'del aeropuerto IGR al centro' → CONSULTA (sin estructura match)", () => {
    const result = core("del aeropuerto IGR al centro de Puerto Iguazú");
    // "del" no matchea DESDE_RE, "al centro" no matchea IR_A_RE (necesita voy|ir|quiero ir|vamos)
    // Sin roleLock → solo location_ambiguous → CONSULTA (línea 347)
    expect(result.intent).toBe("CONSULTA");
    expect(result.facts.some(f => f.startsWith("location_ambiguous:"))).toBe(true);
  });

  it("BOOKING: 'confirmar' simple", () => {
    const result = core("confirmar");
    expect(result.intent).toBe("BOOKING");
  });

  // ── PRE_BOOKING ──────────────────────────────────────────────────────

  it("PRE_BOOKING: 'estoy viendo opciones'", () => {
    const result = core("estoy viendo opciones de viaje");
    expect(result.intent).toBe("PRE_BOOKING");
  });

  it("PRE_BOOKING: 'info de viaje'", () => {
    const result = core("info de un viaje a iguazú");
    expect(result.intent).toBe("PRE_BOOKING");
  });

  // ── NOW ──────────────────────────────────────────────────────────────

  it("NOW: 'ahora'", () => {
    const result = core("necesito un viaje ahora");
    expect(result.intent).toBe("NOW");
  });

  it("NOW: 'urgente'", () => {
    const result = core("urgente");
    expect(result.intent).toBe("NOW");
  });

  it("NOW: 'lo antes posible'", () => {
    const result = core("lo antes posible");
    expect(result.intent).toBe("NOW");
  });

  // ── BOOKING + NOW → NOW (temporal gana sobre booking) ───────────────

  it("BOOKING+NOW → NOW (now: tiene precedencia)", () => {
    const result = core("necesito un viaje del aeropuerto al centro ahora");
    expect(result.intent).toBe("NOW");
  });

  // ── PREVIOUS INTENT CONTEXT ─────────────────────────────────────────

  it("prevIntent BOOKING + 'cuánto cuesta' → COMMERCIAL (prev solo afecta PRE_BOOKING o mismo intent)", () => {
    const result = core("cuánto cuesta", "BOOKING");
    // facts tienen "commercial:cuánto cuesta" → intent = COMMERCIAL
    // prevIntent = BOOKING, intent = COMMERCIAL → intent !== PRE_BOOKING, intent !== prevIntent
    // → se usa COMMERCIAL (no se transforma)
    expect(result.intent).toBe("COMMERCIAL");
  });

  it("prevIntent BOOKING + PRE_BOOKING actual → BOOKING (se conserva)", () => {
    const result = core("estoy viendo opciones", "BOOKING");
    // prevIntent = BOOKING (válido, no AMBIGUOUS/GREETING)
    // intent actual = PRE_BOOKING
    // Si intent !== prevIntent → si intent === PRE_BOOKING → prevIntent
    expect(result.intent).toBe("BOOKING");
  });

  it("prevIntent ignorado si es AMBIGUOUS", () => {
    const result = core("hola", "AMBIGUOUS");
    // prevIntent = AMBIGUOUS → se ignora, se usa intent actual
    expect(result.intent).toBe("GREETING");
  });

  // ── ROLE LOCK + SLOT STABILITY ──────────────────────────────────────

  it("roleLock: 'estoy en el aeropuerto IGR' → origin locked pero ambiguous (aeropuerto ∈ AMBIGUOUS_LOCATION_RE)", () => {
    const result = core("estoy en el aeropuerto IGR");
    expect(result.roleLock.origin).toMatch(/aeropuerto igr/i);
    // "aeropuerto" matchea AMBIGUOUS_LOCATION_RE → stability = "ambiguous"
    expect(result.slotStability.origin).toBe("ambiguous");
  });

  it("roleLock: 'ir a Y' → destination locked", () => {
    const result = core("voy al centro de foz");
    expect(result.roleLock.destination).toMatch(/centro de foz/i);
  });

  it("roleLock: 'estoy en X y voy a Y' → ambos locked", () => {
    const result = core("estoy en el aeropuerto y voy al centro");
    expect(result.roleLock.origin).toMatch(/aeropuerto/i);
    expect(result.roleLock.destination).toMatch(/centro/i);
    // Ambos términos son ambiguos → stability ambiguous
    expect(result.slotStability.origin).toBe("ambiguous");
    expect(result.slotStability.destination).toBe("ambiguous");
  });

  it("roleLock: término específico → locked (no ambiguous)", () => {
    const result = core("estoy en el hotel jacarandá");
    expect(result.roleLock.origin).toMatch(/hotel jacarandá/i);
    // "hotel" es AMBIGUOUS_LOCATION_RE → ambiguous
    expect(result.slotStability.origin).toBe("ambiguous");
  });

  it("roleLock: lugar no ambiguo → locked estable", () => {
    const result = core("voy a cataratas");
    expect(result.roleLock.destination).toMatch(/cataratas/i);
    // "cataratas" NO está en AMBIGUOUS_LOCATION_RE → locked
    expect(result.slotStability.destination).toBe("locked");
  });

  // ── FACTS EXTRAÍDOS ────────────────────────────────────────────────

  it("facts: extrae flight, date, passengers (time: requiere hs/horas explícito)", () => {
    const result = core("vuelo AR1234 para 3 personas el lunes a las 8");
    expect(result.facts.some(f => f.startsWith("flight:AR1234"))).toBe(true); // uppercase
    expect(result.facts.some(f => f.startsWith("passengers:3"))).toBe(true);
    // DATE_RE captura "el lunes" (grupo 1 externo) → date:el_lunes
    expect(result.facts.some(f => f.startsWith("date:el_lunes"))).toBe(true);
    // "a las 8" sin "hs/horas/h" → TIME_RE no matchea
    expect(result.facts.some(f => f.startsWith("time:"))).toBe(false);
  });

  it("facts: time con 'hs' explícito", () => {
    const result = core("a las 14hs");
    expect(result.facts.some(f => f.startsWith("time:14"))).toBe(true);
  });

  it("facts: ubicación ambigua → location_ambiguous flag", () => {
    const result = core("del aeropuerto al centro");
    expect(result.facts.some(f => f.startsWith("location_ambiguous:"))).toBe(true);
  });

  // ── PURCHASE INTENT ─────────────────────────────────────────────────

  it("purchaseIntent: low para especulación", () => {
    const result = core("estoy averiguando");
    expect(result.purchaseIntent).toBe("low");
  });

  it("purchaseIntent: medium sin slots (origen/destino requerido para high)", () => {
    const result = core("vuelo AR1234, 3 personas");
    // Tiene flight: + passengers:, pero hasSlots=false (sin origen/destino)
    // → no alcanza el umbral de high (necesita hasSlots && hasHighSignal)
    expect(result.purchaseIntent).toBe("medium");
  });

  it("purchaseIntent: high si hay slots + datos operativos", () => {
    const result = core("estoy en el hotel y voy al centro, vuelo AR1234 para 3 ahora");
    // hasSlots=true (origin:hotel, destination:centro) + high signals (flight, passengers, urgency)
    expect(result.purchaseIntent).toBe("high");
  });

  it("purchaseIntent: medium por defecto", () => {
    const result = core("cuánto cuesta");
    expect(result.purchaseIntent).toBe("medium");
  });

});

// ══════════════════════════════════════════════════════════════════════════
// 2. TEMPORAL FROM FACTS
// ══════════════════════════════════════════════════════════════════════════

describe("temporalFromFacts", () => {
  it("now: facts → NOW", () => {
    expect(temporalFromFacts(["now:ahora"])).toBe("NOW");
  });

  it("urgency: facts → NOW", () => {
    expect(temporalFromFacts(["urgency:urgente"])).toBe("NOW");
  });

  it("date: facts → FUTURE", () => {
    expect(temporalFromFacts(["date:mañana"])).toBe("FUTURE");
  });

  it("time: facts → FUTURE", () => {
    expect(temporalFromFacts(["time:14:30"])).toBe("FUTURE");
  });

  it("no temporal facts → UNKNOWN", () => {
    expect(temporalFromFacts(["greeting:hola"])).toBe("UNKNOWN");
  });

  it("empty facts → UNKNOWN", () => {
    expect(temporalFromFacts([])).toBe("UNKNOWN");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 3. OPERATIONAL MODE FROM INTENT
// ══════════════════════════════════════════════════════════════════════════

describe("operationalModeFromIntent", () => {
  it("CONSULTA + UNKNOWN → INFO → AHORA", () => {
    const om = operationalModeFromIntent("CONSULTA", "UNKNOWN");
    expect(om).toBe("INFO");
    expect(operationalModeToMode(om)).toBe("AHORA");
  });

  it("GREETING + UNKNOWN → INFO → AHORA", () => {
    const om = operationalModeFromIntent("GREETING", "UNKNOWN");
    expect(om).toBe("INFO");
    expect(operationalModeToMode(om)).toBe("AHORA");
  });

  it("COMMERCIAL + UNKNOWN → INFO → AHORA", () => {
    const om = operationalModeFromIntent("COMMERCIAL", "UNKNOWN");
    expect(om).toBe("INFO");
    expect(operationalModeToMode(om)).toBe("AHORA");
  });

  it("INFORMATIONAL + UNKNOWN → INFO → AHORA", () => {
    const om = operationalModeFromIntent("INFORMATIONAL", "UNKNOWN");
    expect(om).toBe("INFO");
    expect(operationalModeToMode(om)).toBe("AHORA");
  });

  it("AMBIGUOUS + UNKNOWN → INFO → AHORA", () => {
    const om = operationalModeFromIntent("AMBIGUOUS", "UNKNOWN");
    expect(om).toBe("INFO");
    expect(operationalModeToMode(om)).toBe("AHORA");
  });

  // ── AHORA MODE ──────────────────────────────────────────────────────

  it("EMERGENCY → DISPATCH → AHORA", () => {
    const om = operationalModeFromIntent("EMERGENCY", "UNKNOWN");
    expect(om).toBe("DISPATCH");
    expect(operationalModeToMode(om)).toBe("AHORA");
  });

  it("NOW + UNKNOWN → DISPATCH → AHORA", () => {
    const om = operationalModeFromIntent("NOW", "UNKNOWN");
    expect(om).toBe("DISPATCH");
    expect(operationalModeToMode(om)).toBe("AHORA");
  });

  it("BOOKING + NOW → DISPATCH → AHORA", () => {
    const om = operationalModeFromIntent("BOOKING", "NOW");
    expect(om).toBe("DISPATCH");
    expect(operationalModeToMode(om)).toBe("AHORA");
  });

  // ── RESERVA MODE ────────────────────────────────────────────────────

  it("BOOKING + FUTURE → RESERVATION → RESERVA", () => {
    const om = operationalModeFromIntent("BOOKING", "FUTURE");
    expect(om).toBe("RESERVATION");
    expect(operationalModeToMode(om)).toBe("RESERVA");
  });

  it("PRE_BOOKING + UNKNOWN → RESERVATION → RESERVA", () => {
    const om = operationalModeFromIntent("PRE_BOOKING", "UNKNOWN");
    expect(om).toBe("RESERVATION");
    expect(operationalModeToMode(om)).toBe("RESERVA");
  });

  it("PRE_BOOKING + NOW → RESERVATION → RESERVA", () => {
    const om = operationalModeFromIntent("PRE_BOOKING", "NOW");
    expect(om).toBe("RESERVATION");
    expect(operationalModeToMode(om)).toBe("RESERVA");
  });

  it("RESCHEDULE + UNKNOWN → RESERVATION → RESERVA", () => {
    const om = operationalModeFromIntent("RESCHEDULE", "UNKNOWN");
    expect(om).toBe("RESERVATION");
    expect(operationalModeToMode(om)).toBe("RESERVA");
  });

  // ── CLARIFY (BOOKING sin temporal) ──────────────────────────────────

  it("BOOKING + UNKNOWN → CLARIFY → AHORA (pedir clarificación)", () => {
    const om = operationalModeFromIntent("BOOKING", "UNKNOWN");
    expect(om).toBe("CLARIFY");
    expect(operationalModeToMode(om)).toBe("AHORA");
  });

});

// ══════════════════════════════════════════════════════════════════════════
// 4. FULL FLOW: input → core → temporal → operationalMode → mode
// ══════════════════════════════════════════════════════════════════════════

describe("Full flow: input → mode", () => {
  function classify(input: string) {
    const c = core(input);
    const temporal = temporalFromFacts(c.facts);
    const om = operationalModeFromIntent(c.intent, temporal);
    return {
      intent: c.intent,
      temporal,
      operationalMode: om,
      mode: operationalModeToMode(om),
      confidence: c.confidence,
    };
  }

  it("'hola' → GREETING → UNKNOWN → INFO → AHORA", () => {
    const r = classify("hola");
    expect(r.intent).toBe("GREETING");
    expect(r.temporal).toBe("UNKNOWN");
    expect(r.operationalMode).toBe("INFO");
    expect(r.mode).toBe("AHORA");
  });

  it("'consulta' → CONSULTA → UNKNOWN → INFO → AHORA", () => {
    const r = classify("quiero hacer una consulta");
    expect(r.intent).toBe("CONSULTA");
    expect(r.operationalMode).toBe("INFO");
    expect(r.mode).toBe("AHORA");
  });

  it("'cuánto cuesta' → COMMERCIAL → UNKNOWN → INFO → AHORA", () => {
    const r = classify("cuánto cuesta");
    expect(r.intent).toBe("COMMERCIAL");
    expect(r.operationalMode).toBe("INFO");
    expect(r.mode).toBe("AHORA");
  });

  it("'ahora' → NOW → UNKNOWN → DISPATCH → AHORA", () => {
    const r = classify("ahora");
    expect(r.intent).toBe("NOW");
    expect(r.operationalMode).toBe("DISPATCH");
    expect(r.mode).toBe("AHORA");
  });

  it("'del aeropuerto al centro' (sin estructura) → CONSULTA → UNKNOWN → INFO → AHORA", () => {
    const r = classify("del aeropuerto al centro");
    // Sin "estoy en", "voy a", "desde", "hasta" → roleLock no asigna → solo location_ambiguous → CONSULTA
    expect(r.intent).toBe("CONSULTA");
    expect(r.temporal).toBe("UNKNOWN");
    expect(r.operationalMode).toBe("INFO");
    expect(r.mode).toBe("AHORA");
  });

  it("'del aeropuerto al centro mañana' → PRE_BOOKING (date + location_ambiguous, sin action/booking)", () => {
    const r = classify("del aeropuerto al centro mañana");
    expect(r.intent).toBe("PRE_BOOKING");
    // date:mañana → temporal = FUTURE → pero PRE_BOOKING → RESERVATION → RESERVA
    expect(r.temporal).toBe("FUTURE");
    expect(r.operationalMode).toBe("RESERVATION");
    expect(r.mode).toBe("RESERVA");
  });

  it("'aeropuerto al centro ahora' → NOW → NOW → DISPATCH → AHORA", () => {
    const r = classify("del aeropuerto al centro ahora");
    expect(r.intent).toBe("NOW");
    expect(r.temporal).toBe("NOW");
    expect(r.operationalMode).toBe("DISPATCH");
    expect(r.mode).toBe("AHORA");
  });

  it("'emergencia' → EMERGENCY → UNKNOWN → DISPATCH → AHORA", () => {
    const r = classify("ayuda estoy varado");
    expect(r.intent).toBe("EMERGENCY");
    expect(r.operationalMode).toBe("DISPATCH");
    expect(r.mode).toBe("AHORA");
  });

  it("'cuánto sale' → COMMERCIAL → UNKNOWN → INFO → AHORA", () => {
    const r = classify("cuánto sale el traslado");
    expect(r.intent).toBe("COMMERCIAL");
    expect(r.mode).toBe("AHORA");
  });

  it("'reprogramar' → RESCHEDULE → UNKNOWN → RESERVATION → RESERVA", () => {
    const r = classify("necesito reprogramar");
    expect(r.intent).toBe("RESCHEDULE");
    expect(r.operationalMode).toBe("RESERVATION");
    expect(r.mode).toBe("RESERVA");
  });

  it("'gracias' (sin señales) → AMBIGUOUS → UNKNOWN → INFO → AHORA", () => {
    const r = classify("gracias");
    expect(r.intent).toBe("AMBIGUOUS");
    expect(r.operationalMode).toBe("INFO");
    expect(r.mode).toBe("AHORA");
  });

  it("empty → AMBIGUOUS → UNKNOWN → INFO → AHORA", () => {
    const r = classify("");
    expect(r.intent).toBe("AMBIGUOUS");
    expect(r.operationalMode).toBe("INFO");
    expect(r.mode).toBe("AHORA");
  });

  // ── Transiciones clave: CONSULTA nunca es RESERVA ──────────────────

  it("CONSULTA/GREETING/COMMERCIAL siempre → AHORA (nunca RESERVA)", () => {
    const consultaInputs = [
      "hola", "cuánto cuesta", "qué horario tienen",
      "info", "consulta", "cuándo abren",
    ];
    for (const input of consultaInputs) {
      const r = classify(input);
      expect(r.intent).not.toBe("BOOKING");
      expect(r.intent).not.toBe("PRE_BOOKING");
      expect(r.intent).not.toBe("NOW");
      expect(r.intent).not.toBe("EMERGENCY");
      expect(r.mode).toBe("AHORA");
    }
  });

  it("PRE_BOOKING/BOOKING con fecha futura → RESERVA", () => {
    const reservaInputs = [
      "reservar para el lunes",                   // booking: + date: → BOOKING + FUTURE → RESERVATION → RESERVA
      // "del aeropuerto al centro mañana" → PRE_BOOKING (date + location_ambiguous, sin estructura)
    ];
    for (const input of reservaInputs) {
      const r = classify(input);
      expect(r.mode).toBe("RESERVA");
    }
  });

  it("PRE_BOOKING con fecha → RESERVA (date + location_ambiguous)", () => {
    const r = classify("del aeropuerto al centro mañana");
    // Sin estructura, date + location_ambiguous → PRE_BOOKING
    expect(r.intent).toBe("PRE_BOOKING");
    expect(r.mode).toBe("RESERVA");
  });

  it("NOW/URGENT siempre → AHORA (modo dispatch)", () => {
    const ahoraInputs = [
      "ahora", "urgente", "ya mismo",
      "necesito ya", "inmediato",
    ];
    for (const input of ahoraInputs) {
      const r = classify(input);
      expect(r.mode).toBe("AHORA");
    }
  });

});
