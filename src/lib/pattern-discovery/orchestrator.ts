/**
 * orchestrator.ts — Composition Root del pipeline de PD (PDE-1 §6.1)
 *
 * ÚNICO módulo que concreta implementaciones. Coordina:
 *   L(W) = Select_γ(Detect_γ(W))
 *   Select_γ = F₁ ∧ F₂ ∧ F₃ ∧ F₄
 *
 * R-DEP-5: orchestrator.ts es el ÚNICO módulo que puede importar
 * de módulos de implementación concretos.
 */

import { randomUUID, createHash } from 'crypto';
import type {
  PatternOrchestrator,
  PatternRun,
  ExecutionConfig,
  Watermark,
  RunStatus,
  RelationCandidate,
} from './types';
import { DefaultRelationDetector } from './detector';
import { DefaultAcceptanceEvaluator } from './acceptance';
import { DefaultInvariantCatalog } from './invariant-catalog';
import { DefaultMemoryReadAdapter } from './memory-read';
import { SqlPatternRepository } from './repository';
import { DefaultWatermarkManager } from './watermark';
import { projectMany } from './projection';
import { Pattern, needsNewVersion, createSupersededPair } from './pattern';

// ── DefaultOrchestrator ──

export class DefaultOrchestrator implements PatternOrchestrator {
  private detector: DefaultRelationDetector;
  private acceptance: DefaultAcceptanceEvaluator;
  private catalog: DefaultInvariantCatalog;
  private memoryRead: DefaultMemoryReadAdapter;
  private repository: SqlPatternRepository;
  private watermark: DefaultWatermarkManager;

  constructor(
    detector: DefaultRelationDetector,
    acceptance: DefaultAcceptanceEvaluator,
    catalog: DefaultInvariantCatalog,
    memoryRead: DefaultMemoryReadAdapter,
    repository: SqlPatternRepository,
    watermark: DefaultWatermarkManager,
  ) {
    this.detector = detector;
    this.acceptance = acceptance;
    this.catalog = catalog;
    this.memoryRead = memoryRead;
    this.repository = repository;
    this.watermark = watermark;
  }

  /**
   * Ejecuta el pipeline completo de Pattern Discovery.
   */
  async execute(config?: ExecutionConfig): Promise<PatternRun> {
    const runId = randomUUID();
    const triggeredAt = new Date().toISOString();
    const startedAt = new Date().toISOString();

    try {
      // 1. Leer watermark
      const wm = await this.watermark.read();

      // 2. Consultar MemoryRead
      const rawSnapshots = await this.memoryRead.getNewSnapshots(wm);

      // 3. Si no hay datos nuevos → abortar
      if (rawSnapshots.length === 0) {
        return this.buildRun(runId, triggeredAt, startedAt, 'aborted_no_data', wm, {
          durationMs: 0,
          relationsEvaluated: 0,
          memoryReadCalls: 1,
          snapshotsRead: 0,
        });
      }

      // 4. Proyectar 19→11
      const projected = projectMany(rawSnapshots);

      // Si hay windowOverride, filtrar por rango
      let windowSnapshots = projected;
      if (config?.windowOverride) {
        const { from, to } = config.windowOverride;
        if (from) {
          windowSnapshots = windowSnapshots.filter(s =>
            s.storedAt.toISOString() >= from
          );
        }
        if (to) {
          windowSnapshots = windowSnapshots.filter(s =>
            s.storedAt.toISOString() <= to
          );
        }
      }

      // 5. Leer datos existentes del catálogo
      const existingPatterns = await this.repository.readActivePatterns();
      const existingCandidates = await this.repository.readCandidates();
      const invariants = await this.catalog.getAll();

      // 6. Detectar relaciones candidatas (Detect_γ)
      const detectionConfig = config?.detectionConfig ?? {
        minSupport: 2,
        minConfidence: 0.5,
        enabledDimensions: ['intra', 'inter', 'cross'],
      };

      const candidates = this.detector.detect(windowSnapshots, detectionConfig);

      // 7. Evaluar Acceptance Contract (Select_γ = F₁ ∧ F₂ ∧ F₃ ∧ F₄)
      this.acceptance.setTotalCandidates(candidates.length);

      const acceptedPatterns: Pattern[] = [];
      const updatedCandidates: typeof existingCandidates = [];
      const deprecatedIds: string[] = [];

      for (const candidate of candidates) {
        const report = this.acceptance.evaluate(
          candidate,
          invariants,
          existingPatterns,
          windowSnapshots
        );

        // Verificar si pasa todos los filtros (F₁ ∧ F₂ ∧ F₃ ∧ F₄)
        const allPassed = report.F1_empirical.passed
          && report.F2_nonTrivial.passed
          && report.F3_independence.passed
          && report.F4_nonCoincidence.passed;

        if (allPassed) {
          // 8. Clasificar: Pattern aceptado
          const patternId = computeCandidateId(candidate);
          const existingVersion = existingPatterns.find(p => p.id === patternId);
          const newVersion = existingVersion ? existingVersion.version + 1 : 1;

          const pattern = new Pattern({
            relation: candidate.relation,
            confidence: candidate.confidence,
            evidence: candidate.evidence,
            dimension: candidate.dimension,
            acceptance: report,
            runId,
            producedAt: new Date().toISOString(),
            version: newVersion,
          });

          // Si ya existe, verificar versionado
          if (existingVersion) {
            if (needsNewVersion(existingVersion, pattern.confidence, pattern.evidence.snapshotCount)) {
              // Crear versión superseded y nueva
              const [superseded, active] = createSupersededPair(existingVersion, pattern);
              acceptedPatterns.push(superseded);
              acceptedPatterns.push(active);
              deprecatedIds.push(existingVersion.id);
            } else {
              // Equivalente → no crear nueva versión
              acceptedPatterns.push(new Pattern(existingVersion));
            }
          } else {
            acceptedPatterns.push(pattern);
          }
        } else if (report.F1_empirical.passed) {
          // Pasó F₁ pero no todos → candidato
          const candidateId = computeCandidateId(candidate);
          const existing = existingCandidates.find(c => c.id === candidateId);
          if (existing) {
            updatedCandidates.push({
              ...existing,
              lastSeenAt: new Date().toISOString(),
              observationCount: existing.observationCount + 1,
              bestConfidence: Math.max(existing.bestConfidence, candidate.confidence),
            });
          } else {
            updatedCandidates.push({
              id: candidateId,
              firstSeenAt: new Date().toISOString(),
              lastSeenAt: new Date().toISOString(),
              observationCount: 1,
              relation: candidate.relation,
              dimension: candidate.dimension,
              bestConfidence: candidate.confidence,
              bestEvidence: candidate.evidence,
            });
          }
        }
      }

      // 9. Persistir en repositorio
      if (!config?.dryRun) {
        await this.repository.writePatterns(acceptedPatterns);

        if (deprecatedIds.length > 0) {
          await this.repository.deprecatePatterns(deprecatedIds);
        }

        if (updatedCandidates.length > 0) {
          await this.repository.writeCandidates(updatedCandidates);
        }
      }

      // 10. Actualizar watermark
      const lastStoredAt = rawSnapshots.length > 0
        ? rawSnapshots[rawSnapshots.length - 1].storedAt.toISOString()
        : new Date().toISOString();

      const updatedWm = await this.watermark.update(lastStoredAt, rawSnapshots.length);

      // 11. Construir y persistir PatternRun
      const completedAt = new Date().toISOString();
      const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

      const run: PatternRun = {
        runId,
        triggeredAt,
        startedAt,
        completedAt,
        status: 'success',
        watermark: updatedWm,
        patterns: {
          accepted: acceptedPatterns.map(p => p.id),
          candidates: updatedCandidates.map(c => c.id),
          deprecated: deprecatedIds,
        },
        metrics: {
          durationMs,
          relationsEvaluated: candidates.length,
          memoryReadCalls: 1,
          snapshotsRead: rawSnapshots.length,
        },
      };

      if (!config?.dryRun) {
        await this.repository.writeRun(run);
      }

      return run;

    } catch (err) {
      // Nunca lanza — retorna PatternRun con status 'failed'
      const wm = await this.watermark.read().catch(() => ({
        lastStoredAt: null,
        lastRunAt: null,
        totalSnapshotsProcessed: 0,
      }));

      return this.buildRun(runId, triggeredAt, startedAt, 'failed', wm, {
        durationMs: 0,
        relationsEvaluated: 0,
        memoryReadCalls: 1,
        snapshotsRead: 0,
      });
    }
  }

  /**
   * Ejecuta en modo dry-run: mismo pipeline que execute() pero sin persistir nada.
   */
  async executeDryRun(config?: ExecutionConfig): Promise<PatternRun> {
    return this.execute({ ...config, dryRun: true });
  }

  /**
   * Construye un PatternRun con los valores dados.
   */
  private buildRun(
    runId: string,
    triggeredAt: string,
    startedAt: string,
    status: RunStatus,
    watermark: Watermark,
    metrics: { durationMs: number; relationsEvaluated: number; memoryReadCalls: number; snapshotsRead: number },
  ): PatternRun {
    return {
      runId,
      triggeredAt,
      startedAt,
      completedAt: new Date().toISOString(),
      status,
      watermark,
      patterns: { accepted: [], candidates: [], deprecated: [] },
      metrics,
    };
  }
}

/**
 * Computa un ID para un RelationCandidate (mismo scheme que Pattern.id).
 */
function computeCandidateId(candidate: RelationCandidate): string {
  const hash = createHash('sha256')
    .update(`${candidate.relation.description}::${candidate.dimension}`)
    .digest('hex');
  return hash.substring(0, 32);
}
