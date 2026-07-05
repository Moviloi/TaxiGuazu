/**
 * AIT-060 — buildSlotStates: airport_code logic
 *
 * Verifies slot-state.ts behavior for airport_code:
 *   - explicit (score 1.0, reason "explicit") → CONFIRMED, USER_PROVIDED
 *   - inferred (score 0.8, reason "inferred") → CONFIRMATION_PENDING, SYSTEM_INFERRED
 *   - with hasAffirmation=true → CONFIRMED, USER_CONFIRMED
 *   - reason "user_confirmed" → CONFIRMED, USER_CONFIRMED
 *   - null value → omitted from result
 *
 * Extracted from airport-inference.test.ts which was deleted because
 * airport-inference.ts was dead code (unused by production).
 */

import { describe, it, expect } from "vitest";
import { buildSlotStates } from "@/lib/ai/slot-state";

describe("buildSlotStates — airport_code", () => {
  it("Código explícito (score 1.0, reason 'explicit') → CONFIRMED", () => {
    const slots = {
      airport_code: { value: "IGR", score: 1.0, reason: "explicit" },
    };
    const result = buildSlotStates(slots, null, false, false, {});
    expect(result.airport_code).toBeDefined();
    expect(result.airport_code!.status).toBe("CONFIRMED");
    expect(result.airport_code!.source).toBe("USER_PROVIDED");
    expect(result.airport_code!.value).toBe("IGR");
  });

  it("Código inferido (score 0.8, reason 'inferred') → CONFIRMATION_PENDING", () => {
    const slots = {
      airport_code: { value: "IGR", score: 0.8, reason: "inferred" },
    };
    const result = buildSlotStates(slots, null, false, false, {});
    expect(result.airport_code).toBeDefined();
    expect(result.airport_code!.status).toBe("CONFIRMATION_PENDING");
    expect(result.airport_code!.source).toBe("SYSTEM_INFERRED");
  });

  it("Código con hasAffirmation=true → CONFIRMED", () => {
    const slots = {
      airport_code: { value: "IGU", score: 0.8, reason: "inferred" },
    };
    const result = buildSlotStates(slots, null, false, true, {});
    expect(result.airport_code).toBeDefined();
    expect(result.airport_code!.status).toBe("CONFIRMED");
    expect(result.airport_code!.source).toBe("USER_CONFIRMED");
  });

  it("Código con reason 'user_confirmed' → CONFIRMED", () => {
    const slots = {
      airport_code: { value: "AGT", score: 1.0, reason: "user_confirmed" },
    };
    const result = buildSlotStates(slots, null, false, false, {});
    expect(result.airport_code).toBeDefined();
    expect(result.airport_code!.status).toBe("CONFIRMED");
    expect(result.airport_code!.source).toBe("USER_CONFIRMED");
  });

  it("airport_code sin valor (null) → no se incluye en resultado", () => {
    const slots = {
      airport_code: { value: null, score: 0.0, reason: "missing" },
    };
    const result = buildSlotStates(slots, null, false, false, {});
    expect(result.airport_code).toBeUndefined();
  });
});
