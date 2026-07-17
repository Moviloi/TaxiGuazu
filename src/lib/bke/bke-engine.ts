// BKE Engine — Singleton factory del Business Knowledge Engine.
// PR-5A: Foundation — infraestructura base sin lógica de negocio activa.
// Patrón: LLMProvider (interfaz + singleton + logging).

import { log } from "@/lib/utils/logger";
import { isBkeEnabled } from "@/config/feature-flags";

export class BKEEngine {
  private static _instance: BKEEngine | null = null;

  /** Indica si el motor está operativo (feature flag). */
  readonly enabled: boolean;

  constructor() {
    this.enabled = isBkeEnabled();
    if (this.enabled) {
      log.info("[BKE]", { status: "enabled" });
    } else {
      log.info("[BKE]", { status: "disabled" });
    }
  }

  // ── Singleton ────────────────────────────────────────────────────────────

  static getInstance(): BKEEngine {
    if (!BKEEngine._instance) {
      BKEEngine._instance = new BKEEngine();
    }
    return BKEEngine._instance;
  }

  static resetInstance(): void {
    BKEEngine._instance = null;
  }

  // ── Consulta genérica (stub) ──────────────────────────────────────────────

  /** Resuelve cualquier consulta BKE. Retorna null cuando está deshabilitado. */
  async query<T>(_domain: string, _payload: unknown): Promise<{ data: T | null; source: string; confidence: number } | null> {
    if (!this.enabled) return null;
    // PR-5A: stub — implementación real en fases posteriores
    log.info("[BKE:query]", { domain: _domain, enabled: this.enabled });
    return null;
  }
}

/** Shorthand de acceso singleton */
export function getBKEEngine(): BKEEngine {
  return BKEEngine.getInstance();
}
