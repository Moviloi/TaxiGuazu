/**
 * build-safe.ts — Helper genérico para builders del pipeline cognitivo
 *
 * PR-3D.1: Elimina el boilerplate repetido en todos los builders:
 *   - try/catch con logging homogéneo
 *   - never throw garantizado
 *   - serialización automática via toJSON
 *   - logging de error con contexto variable
 *
 * Cada builder mantiene su propio guard (null/undefined) antes de llamar
 * a buildSafe. buildSafe solo se encarga de la ejecución segura + logging.
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-3D.1
 */

import { log } from '@/lib/utils/logger';

/**
 * Ejecuta una función constructora de forma segura con logging homogéneo.
 *
 * @param factory — Función que construye el objeto (puede lanzar)
 * @param logTag — Tag para log de éxito: [EVIDENCE_{logTag}]
 * @param options — Opciones adicionales
 * @param options.errorMessage — Mensaje exacto para log.warn en fallo
 * @param options.errorContext — Contexto adicional para log.warn en fallo
 * @returns Resultado de factory, o null si factory lanza
 */
export function buildSafe<T>(
  factory: () => T,
  logTag: string,
  options?: {
    errorMessage?: string;
    errorContext?: Record<string, unknown>;
  },
): T | null {
  try {
    const result = factory();
    const payload =
      result !== null &&
      typeof result === 'object' &&
      'toJSON' in result &&
      typeof (result as any).toJSON === 'function'
        ? (result as any).toJSON()
        : result;
    log.info(`[EVIDENCE_${logTag}]`, payload);
    return result;
  } catch (e) {
    log.warn(
      options?.errorMessage ?? '[EVIDENCE] Failed to build',
      {
        error: e instanceof Error ? e.message : String(e),
        ...options?.errorContext,
      },
    );
    return null;
  }
}
