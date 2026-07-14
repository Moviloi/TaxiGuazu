/**
 * watermark.ts — Watermark Manager (PDE-1 §2.4)
 *
 * Implementa WatermarkManager. Gestiona el estado de procesamiento
 * entre ejecuciones de PD.
 *
 * R-DEP-3: watermark.ts importa exclusivamente de types.ts y externos.
 * No importa de otros módulos de implementación.
 */

import type {
  WatermarkManager,
  Watermark,
  PatternRepository,
  MemoryReadAdapter,
} from './types';

// ── DefaultWatermarkManager ──

export class DefaultWatermarkManager implements WatermarkManager {
  private repo: PatternRepository;
  private memoryRead: MemoryReadAdapter;

  constructor(repo: PatternRepository, memoryRead: MemoryReadAdapter) {
    this.repo = repo;
    this.memoryRead = memoryRead;
  }

  /**
   * Lee el watermark actual del repositorio.
   * Si no existe (primera ejecución), retorna watermark con valores null.
   */
  async read(): Promise<Watermark> {
    return this.repo.readWatermark();
  }

  /**
   * Verifica si hay nuevos snapshots desde el último watermark.
   */
  async hasNewData(): Promise<boolean> {
    const watermark = await this.repo.readWatermark();
    const count = await this.memoryRead.countNewSnapshots(watermark);
    return count > 0;
  }

  /**
   * Actualiza el watermark tras una ejecución exitosa.
   *
   * @param lastStoredAt — storedAt del último snapshot procesado (ISO string)
   * @param snapshotsProcessed — cantidad de snapshots procesados en esta ejecución
   */
  async update(lastStoredAt: string, snapshotsProcessed: number): Promise<Watermark> {
    const current = await this.repo.readWatermark();

    const updated: Watermark = {
      lastStoredAt,
      lastRunAt: new Date().toISOString(),
      totalSnapshotsProcessed: current.totalSnapshotsProcessed + snapshotsProcessed,
    };

    await this.repo.writeWatermark(updated);
    return updated;
  }

  /**
   * Resetea el watermark (para testing o dry-run).
   */
  async reset(): Promise<void> {
    const resetWatermark: Watermark = {
      lastStoredAt: null,
      lastRunAt: null,
      totalSnapshotsProcessed: 0,
    };
    await this.repo.writeWatermark(resetWatermark);
  }
}
