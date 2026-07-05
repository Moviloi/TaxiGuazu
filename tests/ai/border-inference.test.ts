/**
 * BORDER INFERENCE — Test de heurística AIT-062
 *
 * Verifica el árbol de decisión de 3 países:
 *   1. AR o PY → inferir cruce unívocamente
 *   2. BR → ambiguo (2 cruces posibles) → no inferir
 *   3. Otro slot sin país + airport_code → inferir por código
 *
 * También verifica:
 *   - isBorderTerm helper
 *   - No-regresión: unknown_location preservado cuando no hay señal
 *   - Integración: inferBorderSide → buildSlotStates → CONFIRMATION_PENDING
 *   - Principio SUGERIR, NO DECIDIR (requiresConfirmation)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildSlotStates } from "@/lib/ai/slot-state";
import { inferBorderSide, isBorderTerm } from "@/lib/services/extraction/border-inference";
import type { BorderInferenceResult } from "@/lib/services/extraction/border-inference";

// ── Mock DB ──────────────────────────────────────────────────────────────
// getPlaceCountry → queryOne → query → getDb().execute()
const mockDb = { execute: vi.fn() };
vi.mock("@/lib/db/core/connection", () => ({
  getDb: () => mockDb,
  ensureSchema: vi.fn(),
}));

// ─── Test DB setup helpers ───────────────────────────────────────────────

function mockCountry(canonicalName: string, country: string) {
  mockDb.execute.mockResolvedValueOnce({
    rows: [{ country }],
  });
}

const HOTEL_AR = "Hotel Iguazú";       // Argentina
const HOTEL_BR = "Foz do Iguaçu";       // Brasil
const HOTEL_PY = "Ciudad del Este";    // Paraguay
const BORDER = "aduana";               // border term (unknown_location)
const AIR_IGR = "IGR";
const AIR_IGU = "IGU";
const AIR_AGT = "AGT";

const NONE_RESULT: BorderInferenceResult = {
  borderName: null, confidence: "none", inferredCountry: null,
  crossing: null, requiresConfirmation: false, sideKey: null,
};

// ══════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════

describe("isBorderTerm", () => {
  it('"aduana" → true', () => {
    expect(isBorderTerm("aduana")).toBe(true);
  });

  it('"customs" → true', () => {
    expect(isBorderTerm("customs")).toBe(true);
  });

  it('"custom" → true (singular)', () => {
    expect(isBorderTerm("custom")).toBe(true);
  });

  it('"alfândega" → true', () => {
    expect(isBorderTerm("alfândega")).toBe(true);
  });

  it('"border" → true', () => {
    expect(isBorderTerm("border")).toBe(true);
  });

  it('"aduana argentina" → true (substring match)', () => {
    expect(isBorderTerm("aduana argentina")).toBe(true);
  });

  it('"Hotel Iguazú" → false', () => {
    expect(isBorderTerm("Hotel Iguazú")).toBe(false);
  });

  it("null → false", () => {
    expect(isBorderTerm(null)).toBe(false);
  });

  it("undefined → false", () => {
    expect(isBorderTerm(undefined)).toBe(false);
  });

  it('"" → false', () => {
    expect(isBorderTerm("")).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// ÁRBOL DE DECISIÓN — AR directo (destino aduana, origen AR)
// ══════════════════════════════════════════════════════════════════════════

describe("Árbol de decisión — AR", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T1: destino=aduana + origen=AR → Aduana Argentina (Tancredo Neves)", async () => {
    mockCountry(HOTEL_AR, "Argentina");

    const result = await inferBorderSide(
      BORDER, 0.0, "unknown_location",     // destination = aduana
      HOTEL_AR, 1.0, "exact_alias_match",  // origin = AR
      null,
    );

    expect(result.confidence).toBe("inferred");
    expect(result.inferredCountry).toBe("AR");
    expect(result.borderName).toContain("Argentina");
    expect(result.borderName).toContain("Tancredo Neves");
    expect(result.crossing).toBe("tancredoNeves");
    expect(result.sideKey).toBe("border.ar");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("T2: destino=aduana + airport_code=IGR → Aduana Argentina (Tancredo Neves)", async () => {
    const result = await inferBorderSide(
      BORDER, 0.0, "unknown_location",
      null, 0.0, "",
      AIR_IGR,
    );

    expect(result.confidence).toBe("inferred");
    expect(result.inferredCountry).toBe("AR");
    expect(result.borderName).toContain("Argentina");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("T3: origen=aduana + destino=AR → Aduana Argentina (Tancredo Neves)", async () => {
    mockCountry(HOTEL_AR, "Argentina");

    const result = await inferBorderSide(
      HOTEL_AR, 1.0, "exact_alias_match",  // destination = AR
      BORDER, 0.0, "unknown_location",      // origin = aduana
      null,
    );

    expect(result.confidence).toBe("inferred");
    expect(result.inferredCountry).toBe("AR");
    expect(result.borderName).toContain("Argentina");
    expect(result.crossing).toBe("tancredoNeves");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// ÁRBOL DE DECISIÓN — PY directo (destino aduana, origen PY)
// ══════════════════════════════════════════════════════════════════════════

describe("Árbol de decisión — PY", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T4: destino=aduana + origen=PY → Aduana Paraguay (Puente Amistad)", async () => {
    mockCountry(HOTEL_PY, "Paraguay");

    const result = await inferBorderSide(
      BORDER, 0.0, "unknown_location",
      HOTEL_PY, 1.0, "exact_alias_match",
      null,
    );

    expect(result.confidence).toBe("inferred");
    expect(result.inferredCountry).toBe("PY");
    expect(result.borderName).toContain("Paraguay");
    expect(result.borderName).toContain("Puente de la Amistad");
    expect(result.crossing).toBe("puenteAmistad");
    expect(result.sideKey).toBe("border.py");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("T5: origen=aduana + destino=PY → Aduana Paraguay (Puente Amistad)", async () => {
    mockCountry(HOTEL_PY, "Paraguay");

    const result = await inferBorderSide(
      HOTEL_PY, 1.0, "exact_alias_match",  // destination = PY
      BORDER, 0.0, "unknown_location",      // origin = aduana
      null,
    );

    expect(result.confidence).toBe("inferred");
    expect(result.inferredCountry).toBe("PY");
    expect(result.borderName).toContain("Paraguay");
    expect(result.crossing).toBe("puenteAmistad");
  });

  it("T6: destino=aduana + airport_code=AGT → Aduana Paraguay (Puente Amistad)", async () => {
    const result = await inferBorderSide(
      BORDER, 0.0, "unknown_location",
      null, 0.0, "",
      AIR_AGT,
    );

    expect(result.confidence).toBe("inferred");
    expect(result.inferredCountry).toBe("PY");
    expect(result.borderName).toContain("Paraguay");
    expect(result.requiresConfirmation).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// ÁRBOL DE DECISIÓN — BR (ambiguo, no infiere)
// ══════════════════════════════════════════════════════════════════════════

describe("Árbol de decisión — BR (ambiguo)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T7: destino=aduana + origen=BR → no inferir (2 cruces posibles)", async () => {
    mockCountry(HOTEL_BR, "Brasil");

    const result = await inferBorderSide(
      BORDER, 0.0, "unknown_location",
      HOTEL_BR, 1.0, "exact_alias_match",
      null,
    );

    expect(result.confidence).toBe("none");
    expect(result.borderName).toBeNull();
    expect(result.inferredCountry).toBe("BR");
    expect(result.crossing).toBeNull();
    expect(result.requiresConfirmation).toBe(false);
  });

  it("T8: destino=aduana + airport_code=IGU → no inferir (2 cruces posibles)", async () => {
    const result = await inferBorderSide(
      BORDER, 0.0, "unknown_location",
      null, 0.0, "",
      AIR_IGU,
    );

    expect(result.confidence).toBe("none");
    expect(result.borderName).toBeNull();
    expect(result.inferredCountry).toBe("BR");
    expect(result.crossing).toBeNull();
    expect(result.requiresConfirmation).toBe(false);
  });

  it("T9: origen=aduana + destino=BR → no inferir", async () => {
    mockCountry(HOTEL_BR, "Brasil");

    const result = await inferBorderSide(
      HOTEL_BR, 1.0, "exact_alias_match",  // destination = BR
      BORDER, 0.0, "unknown_location",      // origin = aduana
      null,
    );

    expect(result.confidence).toBe("none");
    expect(result.borderName).toBeNull();
    expect(result.inferredCountry).toBe("BR");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// SIN SEÑAL — no inferir
// ══════════════════════════════════════════════════════════════════════════

describe("Sin señal → no inferir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T10: destino=aduana + origen score 0 + sin airport → none", async () => {
    const result = await inferBorderSide(
      BORDER, 0.0, "unknown_location",
      "some garbage", 0.0, "no_match",
      null,
    );

    expect(result).toEqual(NONE_RESULT);
  });

  it("T11: origen=aduana + destino score 0 + sin airport → none", async () => {
    const result = await inferBorderSide(
      null, 0.0, "",
      BORDER, 0.0, "unknown_location",
      null,
    );

    expect(result).toEqual(NONE_RESULT);
  });

  it("T12: sin border term → none (no entra al árbol)", async () => {
    const result = await inferBorderSide(
      HOTEL_AR, 1.0, "exact_alias_match",
      HOTEL_BR, 1.0, "exact_alias_match",
      null,
    );

    expect(result).toEqual(NONE_RESULT);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// PRINCIPIO: SUGERIR, NO DECIDIR
// ══════════════════════════════════════════════════════════════════════════

describe("Principio — sugerir, no decidir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inferred → requiresConfirmation = true", async () => {
    mockCountry(HOTEL_AR, "Argentina");

    const result = await inferBorderSide(
      BORDER, 0.0, "unknown_location",
      HOTEL_AR, 1.0, "exact_alias_match",
      null,
    );

    expect(result.confidence).toBe("inferred");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("none → requiresConfirmation = false", async () => {
    const result = await inferBorderSide(
      BORDER, 0.0, "unknown_location",
      null, 0.0, "",
      null,
    );

    expect(result.confidence).toBe("none");
    expect(result.requiresConfirmation).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// SLOT-STATE: destination / origin — inferred_border_crossing
// ══════════════════════════════════════════════════════════════════════════

describe("buildSlotStates — inferred_border_crossing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("destination con reason inferred_border_crossing → CONFIRMATION_PENDING", () => {
    const slots = {
      destination: {
        value: "Aduana Argentina (Puente Tancredo Neves)",
        score: 0.7,
        reason: "inferred_border_crossing",
      },
    };
    const result = buildSlotStates(slots, null, false, false, {});
    expect(result.destination).toBeDefined();
    expect(result.destination!.status).toBe("CONFIRMATION_PENDING");
    expect(result.destination!.source).toBe("SYSTEM_INFERRED");
    expect(result.destination!.value).toBe("Aduana Argentina (Puente Tancredo Neves)");
  });

  it("origin con reason inferred_border_crossing → CONFIRMATION_PENDING", () => {
    const slots = {
      origin: {
        value: "Aduana Paraguay (Puente de la Amistad)",
        score: 0.7,
        reason: "inferred_border_crossing",
      },
    };
    const result = buildSlotStates(slots, null, false, false, {});
    expect(result.origin).toBeDefined();
    expect(result.origin!.status).toBe("CONFIRMATION_PENDING");
    expect(result.origin!.source).toBe("SYSTEM_INFERRED");
  });

  it("inferred_border_crossing + hasAffirmation → CONFIRMED", () => {
    const slots = {
      destination: {
        value: "Aduana Argentina (Puente Tancredo Neves)",
        score: 0.7,
        reason: "inferred_border_crossing",
      },
    };
    const result = buildSlotStates(slots, null, false, true, {});
    expect(result.destination).toBeDefined();
    expect(result.destination!.status).toBe("CONFIRMED");
    expect(result.destination!.source).toBe("USER_CONFIRMED");
  });

  it("inferred_border_crossing con value null → no se incluye", () => {
    const slots = {
      destination: {
        value: null,
        score: 0.7,
        reason: "inferred_border_crossing",
      },
    };
    const result = buildSlotStates(slots, null, false, false, {});
    expect(result.destination).toBeUndefined();
  });

  it("inferred_border_crossing + prev CONFIRMED + value sin cambio → preserva CONFIRMED", () => {
    const prevStates = {
      destination: {
        value: "Aduana Argentina (Puente Tancredo Neves)",
        source: "USER_CONFIRMED" as const,
        status: "CONFIRMED" as const,
      },
    };
    const slots = {
      destination: {
        value: "Aduana Argentina (Puente Tancredo Neves)",
        score: 0.7,
        reason: "inferred_border_crossing",
      },
    };
    const result = buildSlotStates(slots, prevStates, false, false, {});
    expect(result.destination!.status).toBe("CONFIRMED");
    expect(result.destination!.source).toBe("USER_CONFIRMED");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// NO-REGRESIÓN: unknown_location preservado cuando border-inference no puede inferir
// ══════════════════════════════════════════════════════════════════════════

describe("No-regresión — unknown_location preservado cuando no hay inferencia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Sin border term → destination unknown_location sigue como antes", () => {
    const slots = {
      destination: { value: "mars", score: 0.0, reason: "unknown_location" },
    };
    const result = buildSlotStates(slots, null, false, false, {});
    // unknown_location y score 0 → RAW (comportamiento preexistente)
    // No debe cambiar a CONFIRMATION_PENDING porque no es inferred_border_crossing
    expect(result.destination).toBeDefined();
    expect(result.destination!.status).toBe("RAW");
  });

  it("BR ambiguo → destination con unknown_location + score 0 → RAW (no inferido)", () => {
    const slots = {
      destination: { value: "aduana", score: 0.0, reason: "unknown_location" },
    };
    const result = buildSlotStates(slots, null, false, false, {});
    // score 0, unknown_location, not inferred_border_crossing → RAW
    expect(result.destination!.status).toBe("RAW");
  });
});
