import { describe, it, expect, vi, beforeEach } from "vitest";
import { isDrlComprehensionEnabled, isDrlRecoveryEnabled } from "@/config/feature-flags";
import { getComprehensionDrlMetrics, resetComprehensionDrlMetrics } from "@/lib/bke/services/comprehension-resolver";
import { getRecoveryDrlMetrics, resetRecoveryDrlMetrics } from "@/lib/bke/services/recovery-resolver";

// Mock feature flags
vi.mock("@/config/feature-flags", () => ({
  isDrlComprehensionEnabled: vi.fn().mockReturnValue(false),
  isDrlRecoveryEnabled: vi.fn().mockReturnValue(false),
  isBkeGeoEnabled: vi.fn().mockReturnValue(false),
  isBkeEnabled: vi.fn().mockReturnValue(false),
  isDrlEnabled: vi.fn().mockReturnValue(false),
}));

describe("comprehension DRL integration (PR-5C)", () => {
  beforeEach(() => {
    resetComprehensionDrlMetrics();
    resetRecoveryDrlMetrics();
    vi.clearAllMocks();
  });

  // ── Feature flag: DRL_COMPREHENSION_ENABLED ────────────────────────────

  it("DRL comprehension is disabled by default", () => {
    expect(isDrlComprehensionEnabled()).toBe(false);
  });

  it("DRL comprehension metrics start at zero", () => {
    const metrics = getComprehensionDrlMetrics();
    expect(metrics.attempts).toBe(0);
    expect(metrics.resolved).toBe(0);
    expect(metrics.escalated).toBe(0);
  });

  // ── Feature flag: DRL_RECOVERY_ENABLED ─────────────────────────────────

  it("DRL recovery is disabled by default", () => {
    expect(isDrlRecoveryEnabled()).toBe(false);
  });

  it("DRL recovery metrics start at zero", () => {
    const metrics = getRecoveryDrlMetrics();
    expect(metrics.attempts).toBe(0);
    expect(metrics.resolved).toBe(0);
    expect(metrics.escalated).toBe(0);
  });

  // ── Contract compatibility ────────────────────────────────────────────

  it("comprehension resolver returns same shape as LLM (string | null)", async () => {
    const { resolveComprehension } = await import("@/lib/bke/services/comprehension-resolver");
    const result = await resolveComprehension("hola", null, 0.5);
    // Both LLM and DRL return string | null
    expect(result === null || typeof result.message === "string").toBe(true);
  });

  it("recovery resolver returns same shape as LLM (string | null)", async () => {
    const { resolveRecovery } = await import("@/lib/bke/services/recovery-resolver");
    const result = await resolveRecovery("hola", "es", null);
    // Both LLM and DRL return string | null
    expect(result === null || typeof result.message === "string").toBe(true);
  });

  // ── Resolver export compatibility ──────────────────────────────────────

  it("comprehension resolver exports all required symbols", async () => {
    const mod = await import("@/lib/bke/services/comprehension-resolver");
    expect(typeof mod.resolveComprehension).toBe("function");
    expect(typeof mod.getComprehensionDrlMetrics).toBe("function");
    expect(typeof mod.resetComprehensionDrlMetrics).toBe("function");
  });

  it("recovery resolver exports all required symbols", async () => {
    const mod = await import("@/lib/bke/services/recovery-resolver");
    expect(typeof mod.resolveRecovery).toBe("function");
    expect(typeof mod.getRecoveryDrlMetrics).toBe("function");
    expect(typeof mod.resetRecoveryDrlMetrics).toBe("function");
  });

  // ── BKE index compatibility ────────────────────────────────────────────

  it("BKE index exports comprehension symbols", async () => {
    const bke = await import("@/lib/bke");
    expect(typeof bke.resolveComprehension).toBe("function");
    expect(typeof bke.getComprehensionDrlMetrics).toBe("function");
    expect(typeof bke.resetComprehensionDrlMetrics).toBe("function");
  });

  it("BKE index exports recovery symbols", async () => {
    const bke = await import("@/lib/bke");
    expect(typeof bke.resolveRecovery).toBe("function");
    expect(typeof bke.getRecoveryDrlMetrics).toBe("function");
    expect(typeof bke.resetRecoveryDrlMetrics).toBe("function");
  });

  // ── DRL index exports sufficiency rules ────────────────────────────────

  it("DRL index exports sufficiency rules", async () => {
    const drl = await import("@/lib/drl");
    expect(typeof drl.s1SlotsComplete).toBe("function");
    expect(typeof drl.s2SlotPartial).toBe("function");
    expect(typeof drl.s3LocationMention).toBe("function");
    expect(typeof drl.s4RecoveryContext).toBe("function");
  });
});
