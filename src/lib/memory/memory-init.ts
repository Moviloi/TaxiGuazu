/**
 * memory-init.ts — Inicialización del MemoryService
 *
 * IM-1: Memory Implementation (PR-13/ATR-1)
 * Arquitectura: ADR-010 (Cognitive Memory Architecture)
 *
 * Encapsula la inicialización del MemoryService con su storage concreto.
 * Esta es la ÚNICA función del módulo Memory que depende de la DB.
 * El resto del módulo es puramente cognitivo y no tiene dependencias
 * de infraestructura.
 *
 * Uso desde orquestador:
 *   import { getDefaultMemoryService } from '@/lib/memory';
 *   const service = getDefaultMemoryService();
 *   await service.store({ ... });
 */

import { getDb } from '@/lib/db/core/connection';
import { SqliteMemoryStorage } from './memory-storage';
import { MemoryService } from './memory-service';

let _defaultMemoryService: MemoryService | null = null;

/**
 * Retorna la instancia singleton del MemoryService con storage Turso/libSQL.
 * Inicialización lazy: la DB se conecta en la primera llamada.
 */
export function getDefaultMemoryService(): MemoryService {
  if (!_defaultMemoryService) {
    const db = getDb();
    const storage = new SqliteMemoryStorage(db);
    _defaultMemoryService = new MemoryService(storage);
  }
  return _defaultMemoryService;
}
