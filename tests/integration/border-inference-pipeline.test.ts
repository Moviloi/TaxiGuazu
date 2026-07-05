/**
 * AIT-062 INTEGRACIÓN — Pipeline de inferencia de frontera
 *
 * Verifica el flujo completo:
 *   inferBorderSide() → buildSlotStates()
 *
 * produce el slot destination con reason "inferred_border_crossing"
 * y status CONFIRMATION_PENDING cuando el usuario menciona "aduana"
 * sin especificar lado y el contexto permite inferirlo.
 *
 * Diferencia clave con border-inference.test.ts: este test pasa por
 * buildSlotStates() REAL (no simula sus slots internos),
 * mockeando solo la DB que necesita getPlaceCountry().
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildSlotStates } from "@/lib/ai/slot-state";
import { inferBorderSide } from "@/lib/services/extraction/border-inference";

// ── Mock DB ──────────────────────────────────────────────────────────────
// getPlaceCountry → queryOne → query → getDb().execute()
const mockDb = { execute: vi.fn() };
vi.mock("@/lib/db/core/connection", () => ({
  getDb: () => mockDb,
  ensureSchema: vi.fn(),
}));

function mockCountry(canonicalName: string, country: string) {
  mockDb.execute.mockResolvedValueOnce({
    rows: [{ country }],
  });
}

describe("AIT-062 Pipeline: inferBorderSide → buildSlotStates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T1: aduana destino + origen AR → destination inferido → CONFIRMATION_PENDING", async () => {
    // ── Paso 1: inferBorderSide ───────────────────────────────────────
    mockCountry("Hotel Iguazú", "Argentina");

    const inference = await inferBorderSide(
      "aduana", 0.0, "unknown_location",
      "Hotel Iguazú", 1.0, "exact_alias_match",
      null,
    );

    expect(inference.confidence).toBe("inferred");
    expect(inference.inferredCountry).toBe("AR");
    expect(inference.borderName).toContain("Aduana Argentina");
    expect(inference.requiresConfirmation).toBe(true);

    // ── Paso 2: Simular el slot replacement que extraction-runner hace ──
    // (Ver extraction-runner.ts ~L406-416)
    const slots = {
      destination: {
        value: inference.borderName,
        score: 0.8,
        reason: "inferred_border_crossing",
      },
      origin: {
        value: "Hotel Iguazú",
        score: 1.0,
        reason: "exact_alias_match",
      },
    };

    // ── Paso 3: buildSlotStates ─────────────────────────────────────────
    const result = buildSlotStates(slots, null, false, false, {});

    // ── Verificación FINAL ──────────────────────────────────────────────
    expect(result.destination).toBeDefined();
    expect(result.destination!.value).toBe(inference.borderName);
    expect(result.destination!.status).toBe("CONFIRMATION_PENDING");
    expect(result.destination!.source).toBe("SYSTEM_INFERRED");

    // origin no afectado (score 1.0 → CONFIRMED)
    expect(result.origin!.status).toBe("CONFIRMED");
  });

  it("T2: aduana destino + airport IGR → destination inferido → CONFIRMATION_PENDING", async () => {
    const inference = await inferBorderSide(
      "aduana", 0.0, "unknown_location",
      null, 0.0, "",
      "IGR",
    );

    expect(inference.confidence).toBe("inferred");
    expect(inference.borderName).toContain("Argentina");

    const slots = {
      destination: {
        value: inference.borderName,
        score: 0.8,
        reason: "inferred_border_crossing",
      },
    };

    const result = buildSlotStates(slots, null, false, false, {});
    expect(result.destination!.status).toBe("CONFIRMATION_PENDING");
    expect(result.destination!.source).toBe("SYSTEM_INFERRED");
  });

  it("T3: aduana destino + origen BR → no inferir → destination preserva unknown_location", async () => {
    mockCountry("Foz do Iguaçu", "Brasil");

    const inference = await inferBorderSide(
      "aduana", 0.0, "unknown_location",
      "Foz do Iguaçu", 1.0, "exact_alias_match",
      null,
    );

    expect(inference.confidence).toBe("none");
    expect(inference.borderName).toBeNull();

    // Pipeline NO modifica destination (confidence none)
    const slots = {
      destination: {
        value: "aduana",
        score: 0.0,
        reason: "unknown_location",
      },
      origin: {
        value: "Foz do Iguaçu",
        score: 1.0,
        reason: "exact_alias_match",
      },
    };

    const result = buildSlotStates(slots, null, false, false, {});
    // unknown_location + score 0 + not inferred_border_crossing → RAW
    expect(result.destination!.status).toBe("RAW");
    expect(result.destination!.value).toBe("aduana");
    expect(result.origin!.status).toBe("CONFIRMED");
  });

  it("T4: aduana destino + origen AR + affirmation → CONFIRMED", async () => {
    mockCountry("Puerto Iguazú", "Argentina");

    const inference = await inferBorderSide(
      "aduana", 0.0, "unknown_location",
      "Puerto Iguazú", 1.0, "exact_alias_match",
      null,
    );

    expect(inference.inferredCountry).toBe("AR");

    const slots = {
      destination: {
        value: inference.borderName,
        score: 0.8,
        reason: "inferred_border_crossing",
      },
      origin: {
        value: "Puerto Iguazú",
        score: 1.0,
        reason: "exact_alias_match",
      },
    };

    // buildSlotStates con hasAffirmation=true
    const result = buildSlotStates(slots, null, false, true, {});

    // Usuario confirmó → CONFIRMED
    expect(result.destination!.status).toBe("CONFIRMED");
    expect(result.destination!.source).toBe("USER_CONFIRMED");
    expect(result.destination!.value).toContain("Argentina");
    expect(result.origin!.status).toBe("CONFIRMED");
  });

  it("T5: aduana destino + origen AR + prev CONFIRMED + sin cambios → preserva CONFIRMED", async () => {
    mockCountry("Hotel Iguazú", "Argentina");

    const inference = await inferBorderSide(
      "aduana", 0.0, "unknown_location",
      "Hotel Iguazú", 1.0, "exact_alias_match",
      null,
    );

    const prevStates = {
      destination: {
        value: String(inference.borderName),
        source: "USER_CONFIRMED" as const,
        status: "CONFIRMED" as const,
      },
    };

    const slots = {
      destination: {
        value: inference.borderName,
        score: 0.8,
        reason: "inferred_border_crossing",
      },
    };

    const result = buildSlotStates(slots, prevStates, false, false, {});
    expect(result.destination!.status).toBe("CONFIRMED");
    expect(result.destination!.source).toBe("USER_CONFIRMED");
  });

  it("T6: aduana como origen + destino AR → origin inferido → CONFIRMATION_PENDING", async () => {
    mockCountry("Puerto Iguazú", "Argentina");

    const inference = await inferBorderSide(
      "Puerto Iguazú", 1.0, "exact_alias_match",  // destination = AR
      "aduana", 0.0, "unknown_location",           // origin = aduana
      null,
    );

    expect(inference.confidence).toBe("inferred");
    expect(inference.inferredCountry).toBe("AR");

    // extraction-runner detecta que origin es aduana → reemplaza origin
    const slots = {
      destination: {
        value: "Puerto Iguazú",
        score: 1.0,
        reason: "exact_alias_match",
      },
      origin: {
        value: inference.borderName,
        score: 0.8,
        reason: "inferred_border_crossing",
      },
    };

    const result = buildSlotStates(slots, null, false, false, {});
    expect(result.origin!.status).toBe("CONFIRMATION_PENDING");
    expect(result.origin!.source).toBe("SYSTEM_INFERRED");
    expect(result.origin!.value).toContain("Aduana Argentina");
    expect(result.destination!.status).toBe("CONFIRMED");
  });
});
