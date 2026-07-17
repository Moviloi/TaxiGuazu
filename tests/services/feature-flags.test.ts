import { describe, it, expect } from "vitest";
import { isBkeEnabled, isDrlEnabled } from "@/config/feature-flags";

describe("feature-flags", () => {
  // ─── helper para tests ─────────────────────────────────────────────────
  function withEnv(key: string, value: string | undefined, fn: () => void) {
    const prev = process.env[key];
    try {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
      fn();
    } finally {
      if (prev === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prev;
      }
    }
  }

  // ─── BKE ────────────────────────────────────────────────────────────────

  it("isBkeEnabled default false", () => {
    withEnv("BKE_ENABLED", undefined, () => {
      expect(isBkeEnabled()).toBe(false);
    });
  });

  it("isBkeEnabled true when BKE_ENABLED=true", () => {
    withEnv("BKE_ENABLED", "true", () => {
      expect(isBkeEnabled()).toBe(true);
    });
  });

  it("isBkeEnabled false when BKE_ENABLED=false", () => {
    withEnv("BKE_ENABLED", "false", () => {
      expect(isBkeEnabled()).toBe(false);
    });
  });

  it("isBkeEnabled false for arbitrary value", () => {
    withEnv("BKE_ENABLED", "1", () => {
      expect(isBkeEnabled()).toBe(false);
    });
  });

  // ─── DRL ────────────────────────────────────────────────────────────────

  it("isDrlEnabled default false", () => {
    withEnv("DRL_ENABLED", undefined, () => {
      expect(isDrlEnabled()).toBe(false);
    });
  });

  it("isDrlEnabled true when DRL_ENABLED=true", () => {
    withEnv("DRL_ENABLED", "true", () => {
      expect(isDrlEnabled()).toBe(true);
    });
  });

  it("isDrlEnabled false when DRL_ENABLED=false", () => {
    withEnv("DRL_ENABLED", "false", () => {
      expect(isDrlEnabled()).toBe(false);
    });
  });

  // ─── independencia ────────────────────────────────────────────────────

  it("BKE and DRL flags are independent", () => {
    withEnv("BKE_ENABLED", "true", () => {
      withEnv("DRL_ENABLED", undefined, () => {
        expect(isBkeEnabled()).toBe(true);
        expect(isDrlEnabled()).toBe(false);
      });
    });
  });
});
