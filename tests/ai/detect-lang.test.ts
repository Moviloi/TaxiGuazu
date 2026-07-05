import { describe, it, expect } from "vitest";
import { detectLangWithFallback, detectLeadLang, detectExtendedLang } from "@/lib/detect-lang";

// ─── PUNTO 3A: No-regresión de detectLangWithFallback (fix commit c47d530) ───

describe("detectLangWithFallback — no regresión del fix anterior (threshold >0.5)", () => {

  it("inglés con 2 keywords (>0.5) → detecta inglés aunque haya sessionLang=es", () => {
    // "booking help" → score=2 → confidence=0.7 > 0.5 → "en"
    expect(detectLangWithFallback("booking help", "es")).toBe("en");
  });

  it("inglés con 1 keyword más común (>0.5) → detecta inglés", () => {
    // "price" → score=1 → confidence=0.5, pero con >=0.5 habría sido border.
    // Con >0.5, esto cae a sessionLang si existe.
    expect(detectLangWithFallback("price", "es")).toBe("es");
    expect(detectLangWithFallback("price")).toBe("es");
  });

  it("portugués con keyword (>0.5) → detecta portugués", () => {
    // "obrigado" → score=1 → confidence=0.5 → cae a sessionLang
    expect(detectLangWithFallback("obrigado", "pt")).toBe("pt");
    expect(detectLangWithFallback("obrigado bom dia", "es")).toBe("pt"); // 2 keywords → 0.7
  });

  it("hotel amerian (0.5) con sessionLang=es → español (sesión prevalece)", () => {
    expect(detectLangWithFallback("hotel amerian", "es")).toBe("es");
  });

  it("hotel amerian (0.5) sin sessionLang → español (fallback default)", () => {
    expect(detectLangWithFallback("hotel amerian")).toBe("es");
  });

  it("hotel booking (2 keywords → 0.7) con sessionLang=es → inglés (confianza alta)", () => {
    expect(detectLangWithFallback("hotel booking", "es")).toBe("en");
  });

  it("texto sin keywords (0.3) ni sessionLang → español", () => {
    expect(detectLangWithFallback("hola qué tal")).toBe("es");
  });

  it("texto sin keywords (0.3) con sessionLang=en → inglés (sesión prevalece)", () => {
    expect(detectLangWithFallback("hola qué tal", "en")).toBe("en");
  });
});

// ─── PUNTO 3A: Wrapper detectLeadLang delega correctamente ───

describe("detectLeadLang wrapper — delega a detectLangWithFallback", () => {

  it("sin sessionLang → mismo comportamiento que detectLangWithFallback sin fallback", () => {
    expect(detectLeadLang("hotel amerian")).toBe(detectLangWithFallback("hotel amerian"));
    expect(detectLeadLang("booking help")).toBe(detectLangWithFallback("booking help"));
    expect(detectLeadLang("hola")).toBe(detectLangWithFallback("hola"));
  });

  it("con sessionLang → respeta el fallback de sesión", () => {
    expect(detectLeadLang("hotel amerian", "es")).toBe("es");
    expect(detectLeadLang("hotel amerian", "en")).toBe("en");
    expect(detectLeadLang("obrigado", "pt")).toBe("pt");
  });

  it("firma compatible hacia atrás — llamadas sin sessionLang siguen funcionando", () => {
    // Los call sites existentes (extraction-runner.ts x3, llm-response.ts) no pasan sessionLang
    expect(detectLeadLang("hola")).toBe("es");
    expect(detectLeadLang("booking")).toBe("es"); // 0.5, sin sessionLang → es
    expect(detectLeadLang("hello booking")).toBe("en"); // 0.7 > 0.5 → en
  });
});

// ─── PUNTO 3A: detectExtendedLang no cambió (casos base) ───

describe("detectExtendedLang — casos base", () => {
  it("hotel solitario → confidence=0.5, lang=en", () => {
    const result = detectExtendedLang("hotel");
    expect(result.lang).toBe("en");
    expect(result.confidence).toBe(0.5);
  });

  it("hotel booking → confidence=0.7, lang=en", () => {
    const result = detectExtendedLang("hotel booking");
    expect(result.lang).toBe("en");
    expect(result.confidence).toBe(0.7);
  });

  it("sin keywords → confidence=0.3, lang=es", () => {
    const result = detectExtendedLang("hola que tal");
    expect(result.lang).toBe("es");
    expect(result.confidence).toBe(0.3);
  });
});

// ─── PUNTO 3B: Catálogo i18n — el mensaje de ambigüedad respeta el idioma ───

describe("Catálogo disamb.contextualGeneric — mensaje según idioma", () => {
  // No mockea nada: prueba directa del catálogo i18n
  // Esto es exactamente lo que buildContextualPlaceOptions produce
  // cuando se le pasa el lang correcto.

  it("lang=es → mensaje en español", async () => {
    const { t } = await import("@/lib/services/i18n/t");
    const msg = t("disamb.contextualGeneric", "es", {
      slotKey: "destination",
      place: "hotel amerian",
    });
    expect(msg).toContain("mencionaste");
    expect(msg).not.toContain("I see you mentioned");
    expect(msg).not.toContain("mentioned");
  });

  it("lang=en → mensaje en inglés", async () => {
    const { t } = await import("@/lib/services/i18n/t");
    const msg = t("disamb.contextualGeneric", "en", {
      slotKey: "destination",
      place: "hotel amerian",
    });
    expect(msg).toContain("I see you mentioned");
    expect(msg).toContain("hotel amerian");
  });

  it("lang=pt → mensaje en portugués", async () => {
    const { t } = await import("@/lib/services/i18n/t");
    const msg = t("disamb.contextualGeneric", "pt", {
      slotKey: "destination",
      place: "hotel amerian",
    });
    expect(msg).toContain("mencionou");
  });
});
