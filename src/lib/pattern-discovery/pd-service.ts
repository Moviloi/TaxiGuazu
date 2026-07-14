/**
 * pd-service.ts — Entry Point público de Pattern Discovery (PD-IM-0 §2.12)
 *
 * Depende ÚNICAMENTE de PatternOrchestrator (interface en types.ts) y
 * de la implementación concreta en orchestrator.ts.
 *
 * R-DEP-6: pd-service.ts importa exclusivamente de types.ts y orchestrator.ts.
 */

import type { PatternRun, ExecutionConfig } from './types';
import { DefaultOrchestrator } from './orchestrator';

/**
 * Verifica si Pattern Discovery está habilitado vía variable de entorno.
 * Default: false.
 */
export function isPatternDiscoveryEnabled(): boolean {
  return process.env.PATTERN_DISCOVERY_ENABLED === 'true';
}

/**
 * Verifica si el modo dry-run está habilitado vía variable de entorno.
 * Default: false.
 */
function isDryRunEnabled(): boolean {
  return process.env.PATTERN_DISCOVERY_DRY_RUN === 'true';
}

// ── PatternDiscoveryService ──

export class PatternDiscoveryService {
  private orchestrator: DefaultOrchestrator;

  constructor(orchestrator: DefaultOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Punto de entrada único.
   *
   * 1. Verifica PATTERN_DISCOVERY_ENABLED.
   * 2. Si está deshabilitado, retorna run con status 'aborted_no_data'.
   * 3. Si está habilitado, delega en orchestrator.execute().
   *
   * Nunca lanza. Retorna PatternRun en todos los casos.
   */
  async discover(config?: ExecutionConfig): Promise<PatternRun> {
    if (!isPatternDiscoveryEnabled()) {
      return {
        runId: 'noop',
        triggeredAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: 'aborted_no_data',
        watermark: { lastStoredAt: null, lastRunAt: null, totalSnapshotsProcessed: 0 },
        patterns: { accepted: [], candidates: [], deprecated: [] },
        metrics: { durationMs: 0, relationsEvaluated: 0, memoryReadCalls: 0, snapshotsRead: 0 },
      };
    }

    // Precedencia: config.dryRun > PATTERN_DISCOVERY_DRY_RUN > false
    const effectiveDryRun = config?.dryRun ?? isDryRunEnabled();

    return this.orchestrator.execute({
      ...config,
      dryRun: effectiveDryRun,
    });
  }

  /**
   * Modo dry-run.
   *
   * No verifica el feature flag. No persiste nada.
   * La llamada explícita a este método tiene prioridad sobre
   * la variable de entorno PATTERN_DISCOVERY_DRY_RUN
   * (PD-IM-0 §2.13: discoverDryRun() > PATTERN_DISCOVERY_DRY_RUN).
   */
  async discoverDryRun(config?: ExecutionConfig): Promise<PatternRun> {
    return this.orchestrator.executeDryRun(config);
  }
}
