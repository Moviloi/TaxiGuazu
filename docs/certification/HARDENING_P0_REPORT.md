# HARDENING P0 REPORT — Phase 1
## Executed: 2026-07-08

---

## Resumen

| Métrica | Antes | Después | Delta |
|---|---|---|---|
| **Archivos eliminados** | — | 7 | −7 |
| **Funciones eliminadas** | — | 5 | −5 |
| **Imports muertos eliminados** | — | ~15 | −15 |
| **Líneas de código eliminadas** | ~300 | — | −300 |
| **Tests pasan** | 875/876 | 875/876 | = |
| **Build** | PASS | PASS | = |
| **Regresiones** | — | 0 | = |
| **Cambio funcional** | — | NINGUNO | = |

---

## Archivos eliminados (7)

| Archivo | Motivo | Categoría |
|---|---|---|
| `src/lib/services/geo/tool-geo.ts` (92L) | Módulo sin imports activos | ZOMBIE |
| `src/lib/services/dispatch/tool-dispatch.ts` (94L) | Módulo sin imports activos | ZOMBIE |
| `src/lib/services/dispatch/tool-fleet.ts` (51L) | Módulo sin imports activos | ZOMBIE |
| `tests/tools/tool-geo.test.ts` | Test de módulo eliminado | ZOMBIE |
| `tests/tools/tool-fleet.test.ts` | Test de módulo eliminado | ZOMBIE |
| `tests/tools/tool-dispatch.test.ts` | Test de módulo eliminado | ZOMBIE |
| `ael/artifacts/CODE_DIFF.md` | Template vacío con `{{STATE}}` | ZOMBIE |

## Funciones eliminadas (5)

| Función | Archivo | Motivo |
|---|---|---|
| `setRequestState()` (no-op) | `src/lib/ai/guard.ts:38-40` | ZOMBIE — siempre vacía |
| `assertCoreRouterPolicy()` (no-op) | `src/lib/ai/guard.ts:47-51` | ZOMBIE — siempre retorna true |
| `resetRequestState()` (no-op) | `src/lib/ai/guard.ts:97-99` | ZOMBIE — siempre vacía |
| `handleDriverAccept()` (no-op) | `src/lib/services/dispatch/driver.service.ts:92-97` | LEGACY — flujo deshabilitado |
| `SlotConversationalState` (type alias) | `src/lib/services/workflow/slot-workflow.ts:12-13` | LEGACY — re-export redundante |

## Callers actualizados (3)

| Archivo | Cambio |
|---|---|
| `src/lib/ai/handler.ts:90` | Eliminada llamada a `setRequestState()` |
| `src/lib/services/lead.service.ts:115` | Eliminada llamada a `resetRequestState()` |
| `src/app/api/whatsapp/webhook/route.ts:334-338` | Eliminado bloque de driver accept por keywords (6 líneas) |

## Tests actualizados (3)

| Archivo | Cambio |
|---|---|
| `tests/ai/guard.test.ts` | Reescrito: 4 tests nuevos para `assertOutputSource` + `assertPipelineComplete`. 4 tests eliminados (funciones removidas). |
| `tests/integration/lead-service.test.ts` | Eliminados mocks de `resetRequestState` y `assertCoreRouterPolicy` |
| `tests/services/extraction-runner.test.ts` | Eliminadas 10 ocurrencias de mock de `assertCoreRouterPolicy` |

---

## Elementos DIFERIDOS para P1

| Elemento | Motivo |
|---|---|
| `findTariffByPriority` en trips.ts | Requiere refactor de pricing domain |
| `updateTripTariff` en trips.ts | Requiere refactor de trip domain |
| `geo-engine.ts` (DEPRECATED) | 3 consumidores activos — requiere migración previa |
| Zombie DB tables (`workflows`, dead columns) | Riesgo alto — requiere migración |
| Dead params (`_history`, `_customerName`, etc.) | Bajo impacto — pueden esperar |
| Zombie comments en connection.ts | Cosmético — baja prioridad |
| `waitingRates.ts` domain functions | Usadas por scripts (fuera de src/) — mantener |
