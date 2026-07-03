import { describe, it, expect } from "vitest";
import { isAffirmativeMessage, isNegativeMessage } from "@/lib/ai/patterns";

describe("patterns — S6a internacionalización", () => {

  // ── Afirmaciones ──

  it("sí → affirmativo", () => {
    expect(isAffirmativeMessage("sí")).toBe(true);
  });

  it("si → affirmativo (sin acento)", () => {
    expect(isAffirmativeMessage("si")).toBe(true);
  });

  it("sim → affirmativo (PT)", () => {
    expect(isAffirmativeMessage("sim")).toBe(true);
  });

  it("yes → affirmativo (EN)", () => {
    expect(isAffirmativeMessage("yes")).toBe(true);
  });

  it("yrs → affirmativo (EN typo)", () => {
    expect(isAffirmativeMessage("yrs")).toBe(true);
  });

  it("yeah → affirmativo (EN casual)", () => {
    expect(isAffirmativeMessage("yeah")).toBe(true);
  });

  it("yep → affirmativo (EN casual)", () => {
    expect(isAffirmativeMessage("yep")).toBe(true);
  });

  it("sim, confirmado → affirmativo", () => {
    expect(isAffirmativeMessage("sim, confirmado")).toBe(true);
  });

  it("yes, viajamos → affirmativo", () => {
    expect(isAffirmativeMessage("yes, viajamos")).toBe(true);
  });

  // ── Negaciones ──

  it("no → negativo", () => {
    expect(isNegativeMessage("no")).toBe(true);
  });

  it("não → negativo (PT)", () => {
    expect(isNegativeMessage("não")).toBe(true);
  });

  it("nao → negativo (PT sin tilde)", () => {
    expect(isNegativeMessage("nao")).toBe(true);
  });

  it("não, gracias → negativo", () => {
    expect(isNegativeMessage("não, gracias")).toBe(true);
  });

  // ── No falsos positivos ──

  it("nota → no es negativo", () => {
    expect(isNegativeMessage("nota")).toBe(false);
  });

  it("sí + no → no es negativo (afirma)", () => {
    expect(isNegativeMessage("sí")).toBe(false);
  });

  it("sim + não → no es negativo (afirma)", () => {
    expect(isNegativeMessage("sim")).toBe(false);
  });
});
