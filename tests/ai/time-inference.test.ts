/**
 * TIME INFERENCE — Test de heurística AIT-061
 *
 * Verifica el árbol de decisión de 3 pasos:
 *   1. Usuario ya dio hora explícita → no inferir
 *   2. Destino con horario conocido → sugerir pickup, requiere confirmación
 *   3. Sin destino con horario conocido → no inferir
 *
 * También verifica:
 *   - No-regresión: relative_date_computed (existente) sigue en INFERRED
 *   - Affirmation: inferred_opening_hours + hasAffirmation → CONFIRMED
 *   - Integración: inferPickupTime → buildSlotStates → CONFIRMATION_PENDING
 *   - Helpers: getInferableDestinations, getPickupForDestination
 *   - 0 as any, 0 naming violations
 */

import { describe, it, expect } from "vitest";
import { buildSlotStates } from "@/lib/ai/slot-state";
import { inferPickupTime, getInferableDestinations, getPickupForDestination } from "@/lib/services/extraction/time-inference";

// ══════════════════════════════════════════════════════════════════════════
// ÁRBOL DE DECISIÓN — PASO 1: Usuario ya dio hora explícita
// ══════════════════════════════════════════════════════════════════════════

describe("Árbol de decisión — Paso 1: scheduled_at con hora explícita", () => {
  it("currentScheduledAt con T (ISO datetime) → confidence explicit, no inferir", () => {
    const result = inferPickupTime(
      "Parque Nacional Iguazú (Lado Argentino)",
      ["date:manana"],
      "2026-07-06T10:00:00",
    );
    expect(result.confidence).toBe("explicit");
    expect(result.inferredTime).toBeNull();
    expect(result.triggeredBy).toBeNull();
    expect(result.requiresConfirmation).toBe(false);
    expect(result.displayReason).toBeNull();
  });

  it("currentScheduledAt con T + destino sin horario → explicit (no importa el destino)", () => {
    const result = inferPickupTime(
      "Hotel Iguazú",
      ["date:hoy"],
      "2026-07-05T14:30:00",
    );
    expect(result.confidence).toBe("explicit");
    expect(result.inferredTime).toBeNull();
    expect(result.requiresConfirmation).toBe(false);
  });

  it("currentScheduledAt sin T (date-only) NO es explícito → puede inferir", () => {
    // "2026-07-06" es date-only (viene de relative_date_computed)
    // El usuario no puso hora → el sistema puede inferir
    const result = inferPickupTime(
      "Parque Nacional Iguazú (Lado Argentino)",
      ["date:manana"],
      "2026-07-06",
    );
    expect(result.confidence).toBe("inferred");
    expect(result.inferredTime).toBe("07:45");
    expect(result.requiresConfirmation).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// ÁRBOL DE DECISIÓN — PASO 2: Destino con horario conocido
// ══════════════════════════════════════════════════════════════════════════

describe("Árbol de decisión — Paso 2: Destino con horario conocido", () => {
  it("Parque Nacional Iguazú (Lado Argentino) → 07:45, requiere confirmación", () => {
    const result = inferPickupTime(
      "Parque Nacional Iguazú (Lado Argentino)",
      ["date:manana"],
      null,
    );
    expect(result.confidence).toBe("inferred");
    expect(result.inferredTime).toBe("07:45");
    expect(result.triggeredBy).toBe("Parque Nacional Iguazú (Lado Argentino)");
    expect(result.requiresConfirmation).toBe(true);
    expect(result.displayReason).toContain("08:00");
  });

  it("Parque Nacional do Iguaçu (Lado Brasileño) → 08:45", () => {
    const result = inferPickupTime(
      "Parque Nacional do Iguaçu (Lado Brasileño)",
      ["date:manana"],
      null,
    );
    expect(result.confidence).toBe("inferred");
    expect(result.inferredTime).toBe("08:45");
    expect(result.triggeredBy).toBe("Parque Nacional do Iguaçu (Lado Brasileño)");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("Parque das Aves (Foz do Iguaçu) → 08:15", () => {
    const result = inferPickupTime(
      "Parque das Aves (Foz do Iguaçu)",
      ["date:hoy"],
      null,
    );
    expect(result.confidence).toBe("inferred");
    expect(result.inferredTime).toBe("08:15");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("Minas de Wanda → 07:15", () => {
    const result = inferPickupTime("Minas de Wanda", ["date:manana"], null);
    expect(result.inferredTime).toBe("07:15");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("San Ignacio Miní → 07:15", () => {
    const result = inferPickupTime("San Ignacio Miní", ["date:manana"], null);
    expect(result.inferredTime).toBe("07:15");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("Saltos del Moconá → 09:15", () => {
    const result = inferPickupTime("Saltos del Moconá", ["date:manana"], null);
    expect(result.inferredTime).toBe("09:15");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("Marco das Três Fronteiras (Brasil) → 14:45", () => {
    const result = inferPickupTime(
      "Marco das Três Fronteiras (Brasil)",
      ["date:manana"],
      null,
    );
    expect(result.inferredTime).toBe("14:45");
    expect(result.displayReason).toContain("mar-dom");
  });

  it("currentScheduledAt date-only + destino conocido → infiere (combina después)", () => {
    // El pipeline combinará "2026-07-06" (date) + "07:45" (time)
    const result = inferPickupTime(
      "Parque Nacional Iguazú (Lado Argentino)",
      [],
      "2026-07-06",
    );
    expect(result.confidence).toBe("inferred");
    expect(result.inferredTime).toBe("07:45");
    // currentScheduledAt no-null cuenta como "tiene fecha"
    expect(result.requiresConfirmation).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// ÁRBOL DE DECISIÓN — PASO 3: Sin destino con horario conocido
// ══════════════════════════════════════════════════════════════════════════

describe("Árbol de decisión — Paso 3: Sin destino con horario conocido", () => {
  it("destination null → none", () => {
    const result = inferPickupTime(null, ["date:manana"], null);
    expect(result.confidence).toBe("none");
    expect(result.inferredTime).toBeNull();
    expect(result.requiresConfirmation).toBe(false);
  });

  it("Destino no listado en atracciones → none", () => {
    const result = inferPickupTime("Hotel Iguazú", ["date:manana"], null);
    expect(result.confidence).toBe("none");
    expect(result.inferredTime).toBeNull();
  });

  it("Destino aeropuerto → none (no tiene horario de apertura como atracción)", () => {
    const result = inferPickupTime("Aeropuerto IGR (Cataratas del Iguazú)", ["date:hoy"], null);
    expect(result.confidence).toBe("none");
    expect(result.inferredTime).toBeNull();
  });

  it("Sin date fact ni scheduled_at → none (no hay contexto de fecha)", () => {
    const result = inferPickupTime(
      "Parque Nacional Iguazú (Lado Argentino)",
      ["greeting:hi"],
      null,
    );
    expect(result.confidence).toBe("none");
    expect(result.inferredTime).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// PRINCIPIO: SUGERIR, NO DECIDIR
// ══════════════════════════════════════════════════════════════════════════

describe("Principio — sugerir, no decidir", () => {
  it("Inferred requiere confirmación", () => {
    const result = inferPickupTime(
      "Parque Nacional Iguazú (Lado Argentino)",
      ["date:manana"],
      null,
    );
    expect(result.confidence).toBe("inferred");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("Explicit NO requiere confirmación (usuario ya especificó hora)", () => {
    const result = inferPickupTime(
      "Parque Nacional Iguazú (Lado Argentino)",
      ["date:manana"],
      "2026-07-06T10:00:00",
    );
    expect(result.confidence).toBe("explicit");
    expect(result.requiresConfirmation).toBe(false);
  });

  it("None NO requiere confirmación (no hay inferencia)", () => {
    const result = inferPickupTime(null, ["date:manana"], null);
    expect(result.confidence).toBe("none");
    expect(result.requiresConfirmation).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════

describe("getInferableDestinations", () => {
  it("Devuelve 7 atracciones con horario fijo", () => {
    const dests = getInferableDestinations();
    expect(dests).toHaveLength(7);
    expect(dests).toContain("Parque Nacional Iguazú (Lado Argentino)");
    expect(dests).toContain("Parque Nacional do Iguaçu (Lado Brasileño)");
    expect(dests).toContain("Parque das Aves (Foz do Iguaçu)");
    expect(dests).toContain("Minas de Wanda");
    expect(dests).toContain("San Ignacio Miní");
    expect(dests).toContain("Saltos del Moconá");
    expect(dests).toContain("Marco das Três Fronteiras (Brasil)");
  });
});

describe("getPickupForDestination", () => {
  it("Conocido → devuelve pickup", () => {
    expect(getPickupForDestination("Parque Nacional Iguazú (Lado Argentino)")).toBe("07:45");
    expect(getPickupForDestination("Marco das Três Fronteiras (Brasil)")).toBe("14:45");
  });

  it("Desconocido → null", () => {
    expect(getPickupForDestination("Hotel Iguazú")).toBeNull();
  });

  it("Vacío → null", () => {
    expect(getPickupForDestination("")).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// SLOT-STATE: scheduled_at — inferred_opening_hours vs relative_date_computed
// ══════════════════════════════════════════════════════════════════════════

describe("buildSlotStates — scheduled_at: inferred_opening_hours", () => {
  it("inferred_opening_hours → CONFIRMATION_PENDING", () => {
    const slots = {
      scheduled_at: { value: "2026-07-06T07:45:00", score: 0.8, reason: "inferred_opening_hours" },
    };
    const result = buildSlotStates(slots, null, false, false, {});
    expect(result.scheduled_at).toBeDefined();
    expect(result.scheduled_at!.status).toBe("CONFIRMATION_PENDING");
    expect(result.scheduled_at!.source).toBe("SYSTEM_INFERRED");
    expect(result.scheduled_at!.value).toBe("2026-07-06T07:45:00");
  });

  it("inferred_opening_hours + hasAffirmation → CONFIRMED", () => {
    const slots = {
      scheduled_at: { value: "2026-07-06T07:45:00", score: 0.8, reason: "inferred_opening_hours" },
    };
    const result = buildSlotStates(slots, null, false, true, {});
    expect(result.scheduled_at).toBeDefined();
    expect(result.scheduled_at!.status).toBe("CONFIRMED");
    expect(result.scheduled_at!.source).toBe("USER_CONFIRMED");
  });

  it("inferred_opening_hours con value null → no se incluye (filtrado por L25)", () => {
    const slots = {
      scheduled_at: { value: null, score: 0.8, reason: "inferred_opening_hours" },
    };
    const result = buildSlotStates(slots, null, false, false, {});
    expect(result.scheduled_at).toBeUndefined();
  });

  it("inferred_opening_hours + prev CONFIRMED + value sin cambio + sin hasAffirmation → preserva CONFIRMED", () => {
    const prevStates = {
      scheduled_at: { value: "2026-07-06T07:45:00", source: "USER_CONFIRMED", status: "CONFIRMED" },
    };
    const slots = {
      scheduled_at: { value: "2026-07-06T07:45:00", score: 0.8, reason: "inferred_opening_hours" },
    };
    const result = buildSlotStates(slots, prevStates, false, false, {});
    // El bloque "preserve prev" (L50-54) se ejecuta ANTES que el nuevo bloque,
    // y como prev.status === "CONFIRMED" y !hasCorrection && !hasAffirmation,
    // el resultado es CONFIRMED (preservado), no CONFIRMATION_PENDING.
    expect(result.scheduled_at!.status).toBe("CONFIRMED");
    expect(result.scheduled_at!.source).toBe("USER_CONFIRMED");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// NO-REGRESIÓN: relative_date_computed (existente)
// ══════════════════════════════════════════════════════════════════════════

describe("No-regresión — relative_date_computed sigue en INFERRED", () => {
  it("relative_date_computed (score 0.8) → INFERRED (mismo comportamiento que antes)", () => {
    const slots = {
      origin: { value: "Hotel Iguazú", score: 1.0, reason: "exact_alias_match" },
      destination: { value: "Centro", score: 1.0, reason: "exact_alias_match" },
      passengers: { value: 2, score: 1.0, reason: "direct_extraction" },
      scheduled_at: { value: "2026-07-06", score: 0.8, reason: "relative_date_computed" },
    };
    const result = buildSlotStates(slots, null, false, false, {});
    expect(result.scheduled_at).toBeDefined();
    // relative_date_computed NO es "inferred_opening_hours" → pasa por score > 0 → INFERRED
    expect(result.scheduled_at!.status).toBe("INFERRED");
    expect(result.scheduled_at!.source).toBe("SYSTEM_INFERRED");
    expect(result.scheduled_at!.value).toBe("2026-07-06");
  });

  it("relative_date_computed + prev CONFIRMED + sin cambios → preserva CONFIRMED", () => {
    const prevStates = {
      scheduled_at: { value: "2026-07-06", source: "USER_CONFIRMED", status: "CONFIRMED" },
    };
    const slots = {
      scheduled_at: { value: "2026-07-06", score: 0.8, reason: "relative_date_computed" },
    };
    const result = buildSlotStates(slots, prevStates, false, false, {});
    expect(result.scheduled_at!.status).toBe("CONFIRMED");
  });

  it("scheduled_at con score 1.0, reason 'valid_iso_date' → CONFIRMED (score >= 1.0)", () => {
    const slots = {
      scheduled_at: { value: "2026-07-06T10:00:00", score: 1.0, reason: "valid_iso_date" },
    };
    const result = buildSlotStates(slots, null, false, false, {});
    expect(result.scheduled_at!.status).toBe("CONFIRMED");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// INTEGRACIÓN: inferPickupTime → slot-state → CONFIRMATION_PENDING
// ══════════════════════════════════════════════════════════════════════════

describe("Integración — inferPickupTime + buildSlotStates", () => {
  it("Destino conocido + date fact → infiere → scheduled_at CONFIRMATION_PENDING", () => {
    // Paso 1: Inferir hora
    const inference = inferPickupTime(
      "Parque Nacional Iguazú (Lado Argentino)",
      ["date:manana"],
      null,
    );
    expect(inference.confidence).toBe("inferred");
    expect(inference.inferredTime).toBe("07:45");

    // Paso 2: Simular pipeline — combinar date + inferred time
    // En el pipeline real, extraction-runner combina la fecha computada
    // (de calculateSlotConfidence) con la hora inferida.
    // Acá construimos el slot manualmente como lo haría el pipeline.
    const combinedDatetime = `2026-07-06T${inference.inferredTime}:00`;

    const slots = {
      origin: { value: "Hotel Iguazú", score: 1.0, reason: "exact_alias_match" },
      destination: { value: "Parque Nacional Iguazú (Lado Argentino)", score: 1.0, reason: "exact_alias_match" },
      passengers: { value: 2, score: 1.0, reason: "direct_extraction" },
      scheduled_at: { value: combinedDatetime, score: 0.8, reason: "inferred_opening_hours" },
    };

    // Paso 3: Construir slot states
    const result = buildSlotStates(slots, null, false, false, {});

    // Paso 4: Verificar que scheduled_at requiere confirmación
    expect(result.scheduled_at).toBeDefined();
    expect(result.scheduled_at!.status).toBe("CONFIRMATION_PENDING");
    expect(result.scheduled_at!.source).toBe("SYSTEM_INFERRED");
    expect(result.scheduled_at!.value).toBe("2026-07-06T07:45:00");
  });

  it("Destino conocido + date-only scheduled_at → infiere → CONFIRMATION_PENDING", () => {
    // Simula: usuario dijo "mañana al parque", calculateSlotConfidence
    // produjo scheduled_at = "2026-07-06" (relative_date_computed).
    // El pipeline llama a inferPickupTime que ve date-only → puede inferir.
    const inference = inferPickupTime(
      "Parque Nacional Iguazú (Lado Argentino)",
      [],
      "2026-07-06",
    );
    expect(inference.confidence).toBe("inferred");
    expect(inference.inferredTime).toBe("07:45");

    // Pipeline combina: date "2026-07-06" + time "07:45"
    const combined = `2026-07-06T${inference.inferredTime}:00`;
    expect(combined).toBe("2026-07-06T07:45:00");

    const slots = {
      scheduled_at: { value: combined, score: 0.8, reason: "inferred_opening_hours" },
    };
    const result = buildSlotStates(slots, null, false, false, {});
    expect(result.scheduled_at!.status).toBe("CONFIRMATION_PENDING");
  });

  it("Destino SIN horario conocido + date fact → no infiere → scheduled_at queda como estaba", () => {
    // El usuario dice fecha pero el destino no tiene horario conocido
    const inference = inferPickupTime(
      "Hotel Iguazú",
      ["date:manana"],
      null,
    );
    expect(inference.confidence).toBe("none");
    expect(inference.inferredTime).toBeNull();

    // En el pipeline, scheduled_at se queda con relative_date_computed
    // (el pipeline NO modifica scheduled_at porque no hay inferencia)
    const slots = {
      scheduled_at: { value: "2026-07-06", score: 0.8, reason: "relative_date_computed" },
    };
    const result = buildSlotStates(slots, null, false, false, {});
    // No hay inferred_opening_hours → comportamiento existing: INFERRED
    expect(result.scheduled_at!.status).toBe("INFERRED");
    expect(result.scheduled_at!.reason).toBeUndefined(); // SlotStateEntry no tiene reason
  });

  it("Usuario da hora explícita → no infiere → scheduled_at CONFIRMED (score 1.0)", () => {
    const inference = inferPickupTime(
      "Parque Nacional Iguazú (Lado Argentino)",
      ["date:manana"],
      "2026-07-06T10:00:00",
    );
    expect(inference.confidence).toBe("explicit");
    expect(inference.inferredTime).toBeNull();

    // scheduled_at con ISO datetime parseable → score 1.0 → CONFIRMED
    const slots = {
      scheduled_at: { value: "2026-07-06T10:00:00", score: 1.0, reason: "valid_iso_date" },
    };
    const result = buildSlotStates(slots, null, false, false, {});
    expect(result.scheduled_at!.status).toBe("CONFIRMED");
  });

  it("Múltiples slots + inferred_opening_hours → solo scheduled_at es CONFIRMATION_PENDING, resto sigue normal", () => {
    const slots = {
      origin: { value: "Hotel Iguazú", score: 1.0, reason: "exact_alias_match" },
      destination: { value: "Parque Nacional Iguazú (Lado Argentino)", score: 1.0, reason: "exact_alias_match" },
      passengers: { value: 2, score: 1.0, reason: "direct_extraction" },
      scheduled_at: { value: "2026-07-06T07:45:00", score: 0.8, reason: "inferred_opening_hours" },
    };
    const result = buildSlotStates(slots, null, false, false, {});

    // Origin y destination: score 1.0 → CONFIRMED
    expect(result.origin!.status).toBe("CONFIRMED");
    expect(result.destination!.status).toBe("CONFIRMED");
    expect(result.passengers!.status).toBe("CONFIRMED");
    // scheduled_at: inferred_opening_hours → CONFIRMATION_PENDING
    expect(result.scheduled_at!.status).toBe("CONFIRMATION_PENDING");
  });
});
