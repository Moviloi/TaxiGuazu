import { describe, it, expect } from "vitest";
import { buildMemory, buildShortTermBuffer, buildSessionMemory, getEntityBias, extractEntities } from "@/lib/services/memory";
import { predictEntity, predictIntent, enrichComprehensionSignals, buildPredictedContext, computeMemoryBoost } from "@/lib/services/predictive-routing";
import type { ComprehensionSignals } from "@/lib/services/comprehension";

const emptyMsg = (i: number) => ({ id: i, conversation_id: 1, role: "user" as const, content: "", created_at: 1000 + i });

function msg(content: string, role: "user" | "assistant" = "user") {
  return { id: 1, conversation_id: 1, role, content, created_at: 1000 };
}

describe("F5 — Memory Layer", () => {
  describe("buildSessionMemory", () => {
    it("extracts last entities from all user messages", () => {
      const history = [msg("quiero ir a rafain"), msg("confirmo")];
      const mem = buildSessionMemory(null, history);
      expect(mem.lastEntities).toContain("rafain");
    });

    it("reads origin/destination from session slots", () => {
      const session: any = { slots: JSON.stringify({ origin: "Hotel Rafain", destination: "Aeropuerto" }) };
      const mem = buildSessionMemory(session, [emptyMsg(1)]);
      expect(mem.lastOrigin).toBe("Hotel Rafain");
      expect(mem.lastDestination).toBe("Aeropuerto");
    });

    it("reads f4_state from session", () => {
      const session: any = { f4_state: "CLARIFICATION" };
      const mem = buildSessionMemory(session, [emptyMsg(1)]);
      expect(mem.f4StateHistory).toContain("CLARIFICATION");
    });
  });

  describe("buildShortTermBuffer", () => {
    it("keeps last N messages", () => {
      const history = Array.from({ length: 10 }, (_, i) => emptyMsg(i));
      const buf = buildShortTermBuffer(history, 5);
      expect(buf.messages).toHaveLength(5);
    });

    it("preserves role and content", () => {
      const history = [msg("hola", "user"), msg("cómo estás", "assistant")];
      const buf = buildShortTermBuffer(history);
      expect(buf.messages[0].role).toBe("user");
      expect(buf.messages[1].content).toBe("cómo estás");
    });
  });

  describe("buildMemory", () => {
    it("combines session + shortTerm + semantic into Memory", () => {
      const session: any = { slots: "{}" };
      const history = [msg("quiero cataratas"), msg("dame precio")];
      const mem = buildMemory(session, history);
      expect(mem.sessionMemory.lastEntities).toContain("cataratas");
      expect(mem.shortTermMemory.messages).toHaveLength(2);
      expect(mem.semanticMemory.entityAssociations.cataratas).toBeDefined();
    });
  });

  describe("getEntityBias", () => {
    it("returns known associations from last entities", () => {
      const session: any = { slots: "{}" };
      const history = [msg("rafain"), msg("confirmo")];
      const mem = buildMemory(session, history);
      const bias = getEntityBias(mem);
      expect(bias).toContain("rafain");
      expect(bias).toContain("show");
      expect(bias).toContain("cena show");
    });

    it("deduplicates entities", () => {
      const session: any = { slots: "{}" };
      const history = [msg("rafain y cataratas")];
      const mem = buildMemory(session, history);
      const bias = getEntityBias(mem);
      const unique = new Set(bias);
      expect(bias.length).toBe(unique.size);
    });
  });
});

describe("F5 — Predictive Routing", () => {
  describe("predictEntity", () => {
    it("exact match → high confidence candidates", () => {
      const mem = buildMemory(null, [emptyMsg(1)]);
      const pred = predictEntity("quiero ir a rafain", mem);
      expect(pred.candidates).toContain("rafain");
      expect(pred.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("prefix match → finds candidates", () => {
      const mem = buildMemory(null, [emptyMsg(1)]);
      const pred = predictEntity("voy a cataratas", mem);
      expect(pred.candidates).toContain("cataratas");
      expect(pred.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("no match + no history → empty candidates", () => {
      const mem = buildMemory(null, [emptyMsg(1)]);
      const pred = predictEntity("hola cómo estás", mem);
      expect(pred.candidates).toEqual([]);
      expect(pred.confidence).toBe(0);
    });
  });

  describe("predictIntent", () => {
    it("show entity detected → BOOKING predicted", () => {
      const session: any = { slots: "{}" };
      const history = [msg("madero show")];
      const mem = buildMemory(session, history);
      const pred = predictIntent("madero show", "GREETING", mem);
      expect(pred.predictedIntent).toBe("BOOKING");
      expect(pred.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("no entity + prior intent → uses last intent", () => {
      const session: any = { slots: "{}" };
      const history = [msg("necesito viaje"), msg("dónde vas", "assistant"), msg("al aeropuerto")];
      const mem = buildMemory(session, history);
      const pred = predictIntent("al aeropuerto", "INFORMATIONAL", mem);
      // last entities empty, no show entity → falls to lastIntent path
      expect(pred.confidence).toBeGreaterThanOrEqual(0.3);
    });

    it("no history → falls back to coreIntent", () => {
      const mem = buildMemory(null, [emptyMsg(1)]);
      const pred = predictIntent("hola", "GREETING", mem);
      expect(pred.predictedIntent).toBe("GREETING");
    });
  });

  describe("enrichComprehensionSignals", () => {
    const base: ComprehensionSignals = { intentConfidence: 0.6, entityConfidence: 0.3, slotCompleteness: 0.2, extractionConfidence: 0.5, conversationStability: 0.7 };

    it("boosts intent + entity when predictions have high confidence", () => {
      const enriched = enrichComprehensionSignals(base, { candidates: ["rafain"], confidence: 0.85 }, { predictedIntent: "BOOKING", confidence: 0.82 });
      expect(enriched.intentConfidence).toBeGreaterThan(0.6);
      expect(enriched.entityConfidence).toBeGreaterThan(0.3);
      expect(enriched.f5Boost).toBeGreaterThan(0);
    });

    it("no boost when predictions have low confidence", () => {
      const enriched = enrichComprehensionSignals(base, { candidates: [], confidence: 0 }, { predictedIntent: "GREETING", confidence: 0.3 });
      expect(enriched.intentConfidence).toBe(0.6);
      expect(enriched.entityConfidence).toBe(0.3);
      expect(enriched.f5Boost).toBe(0);
    });

    it("caps boosted values at 1.0", () => {
      const high: ComprehensionSignals = { intentConfidence: 0.95, entityConfidence: 0.95, slotCompleteness: 1.0, extractionConfidence: 1.0, conversationStability: 1.0 };
      const enriched = enrichComprehensionSignals(high, { candidates: ["rafain"], confidence: 0.9 }, { predictedIntent: "BOOKING", confidence: 0.9 });
      expect(enriched.intentConfidence).toBeLessThanOrEqual(1.0);
      expect(enriched.entityConfidence).toBeLessThanOrEqual(1.0);
    });

    it("preserves non-boosted signals unchanged", () => {
      const enriched = enrichComprehensionSignals(base, { candidates: [], confidence: 0 }, { predictedIntent: "AMBIGUOUS", confidence: 0.2 });
      expect(enriched.slotCompleteness).toBe(0.2);
      expect(enriched.extractionConfidence).toBe(0.5);
      expect(enriched.conversationStability).toBe(0.7);
    });
  });

  describe("computeMemoryBoost", () => {
    it("repeated entities → 0.20 boost", () => {
      const boost = computeMemoryBoost({ lastEntities: ["rafain"], lastIntent: "BOOKING", lastOrigin: null, lastDestination: null, lastOpportunity: null, f4StateHistory: [] }, ["rafain"]);
      expect(boost).toBe(0.20);
    });

    it("new entities → 0.10 boost", () => {
      const boost = computeMemoryBoost({ lastEntities: ["cataratas"], lastIntent: null, lastOrigin: null, lastDestination: null, lastOpportunity: null, f4StateHistory: [] }, ["rafain"]);
      expect(boost).toBe(0.10);
    });

    it("no entity matches → 0 boost", () => {
      const boost = computeMemoryBoost({ lastEntities: [], lastIntent: null, lastOrigin: null, lastDestination: null, lastOpportunity: null, f4StateHistory: [] }, []);
      expect(boost).toBe(0);
    });
  });

  describe("buildPredictedContext", () => {
    it("combines entity prediction + intent prediction + bias", () => {
      const session: any = { slots: "{}" };
      const history = [msg("quiero ir a rafain cena show")];
      const mem = buildMemory(session, history);
      const ctx = buildPredictedContext("rafain cena show", "GREETING", mem);
      expect(ctx.entityPrediction.candidates).toContain("rafain");
      expect(ctx.intentPrediction.predictedIntent).toBe("BOOKING");
      expect(ctx.entityBias).toContain("rafain");
    });
  });
});
