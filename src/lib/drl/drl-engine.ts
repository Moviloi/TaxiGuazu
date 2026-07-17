// DRL Engine — Singleton factory del Deterministic Reasoning Layer.
// PR-5A: Foundation — infraestructura base sin lógica de negocio activa.
// Patrón: LLMProvider (interfaz + singleton + logging).

import { log } from "@/lib/utils/logger";
import { isDrlEnabled } from "@/config/feature-flags";
import type { DRLDecision, DRLInput, DRLRule } from "./types";

export class DRLEngine {
  private static _instance: DRLEngine | null = null;
  private _rules: Map<string, DRLRule> = new Map();

  readonly enabled: boolean;

  constructor() {
    this.enabled = isDrlEnabled();
    if (this.enabled) {
      log.info("[DRL]", { status: "enabled" });
    } else {
      log.info("[DRL]", { status: "disabled" });
    }
  }

  // ── Singleton ────────────────────────────────────────────────────────────

  static getInstance(): DRLEngine {
    if (!DRLEngine._instance) {
      DRLEngine._instance = new DRLEngine();
    }
    return DRLEngine._instance;
  }

  static resetInstance(): void {
    DRLEngine._instance = null;
  }

  // ── Registro de reglas ───────────────────────────────────────────────────

  registerRule(name: string, rule: DRLRule): void {
    this._rules.set(name, rule);
    log.info("[DRL:register]", { rule: name, enabled: this.enabled });
  }

  getRegisteredRules(): string[] {
    return Array.from(this._rules.keys());
  }

  // ── Evaluación ───────────────────────────────────────────────────────────

  async evaluate(input: DRLInput): Promise<DRLDecision | null> {
    if (!this.enabled) return null;

    const results = [];
    for (const [_name, rule] of this._rules) {
      const result = rule(input);
      if (result) {
        results.push(result);
      }
    }

    // PR-5A: stub de agregación — reglas reales + weighting en fases posteriores
    const passedAll = results.every((r) => r.passed);
    const avgConfidence = results.length > 0
      ? results.reduce((s, r) => s + r.confidence, 0) / results.length
      : 1.0;

    return {
      decision: results.length === 0 ? "PROCEED" : passedAll ? "PROCEED" : "CLARIFY",
      reason: results.length === 0
        ? "No rules registered — proceeding by default"
        : passedAll
          ? "All rules passed"
          : "One or more rules failed",
      confidence: avgConfidence,
      ruleResults: results,
      context: {
        slotCount: Object.keys(input.slots).length,
        requiredSlotCount: input.requiredSlots.length,
        completenessRatio: input.requiredSlots.length > 0
          ? Object.keys(input.slots).filter((k) => input.slots[k] !== undefined && input.slots[k] !== null).length / input.requiredSlots.length
          : 1.0,
        hasConflicts: results.some((r) => r.decision === "HALT"),
      },
      escalateTo: null,
    };
  }
}

/** Shorthand de acceso singleton */
export function getDRLEngine(): DRLEngine {
  return DRLEngine.getInstance();
}
