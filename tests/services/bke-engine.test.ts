import { describe, it, expect, beforeEach } from "vitest";
import { BKEEngine, getBKEEngine } from "@/lib/bke";
import { getDomainName as geoDomain } from "@/lib/bke/domains/geo";
import { getDomainName as msgDomain } from "@/lib/bke/domains/message";
import { getDomainName as entDomain } from "@/lib/bke/domains/entity";
import { getDomainName as prcDomain } from "@/lib/bke/domains/pricing";
import { isBkeEnabled } from "@/config/feature-flags";

describe("BKEEngine", () => {
  beforeEach(() => {
    BKEEngine.resetInstance();
    delete process.env.BKE_ENABLED;
  });

  it("singleton — getInstance returns the same instance", () => {
    const a = BKEEngine.getInstance();
    const b = BKEEngine.getInstance();
    expect(a).toBe(b);
  });

  it("singleton — resetInstance creates new instance", () => {
    const a = BKEEngine.getInstance();
    BKEEngine.resetInstance();
    const b = BKEEngine.getInstance();
    expect(a).not.toBe(b);
  });

  it("shorthand — getBKEEngine returns the singleton", () => {
    expect(getBKEEngine()).toBe(BKEEngine.getInstance());
  });

  it("disabled by default", () => {
    const engine = BKEEngine.getInstance();
    expect(engine.enabled).toBe(false);
  });

  it("enabled when BKE_ENABLED=true", () => {
    process.env.BKE_ENABLED = "true";
    const engine = new BKEEngine();
    expect(engine.enabled).toBe(true);
  });

  it("isBkeEnabled reads env var", () => {
    expect(isBkeEnabled()).toBe(false);
    process.env.BKE_ENABLED = "true";
    expect(isBkeEnabled()).toBe(true);
  });

  it("query returns null when disabled", async () => {
    const engine = BKEEngine.getInstance();
    const result = await engine.query("geo", { text: "test" });
    expect(result).toBeNull();
  });

  it("all four domain stubs exist", () => {
    expect(geoDomain()).toBe("geo");
    expect(msgDomain()).toBe("message");
    expect(entDomain()).toBe("entity");
    expect(prcDomain()).toBe("pricing");
  });

  it("BKE module imports are valid", async () => {
    const bke = await import("@/lib/bke");
    expect(typeof bke.BKEEngine).toBe("function");
    expect(typeof bke.getBKEEngine).toBe("function");
    expect(typeof bke.resolvePlace).toBe("function");
    expect(typeof bke.resolveMessage).toBe("function");
    expect(typeof bke.extractEntities).toBe("function");
    expect(typeof bke.estimatePrice).toBe("function");
  });
});
