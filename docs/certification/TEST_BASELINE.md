# TEST BASELINE v1.0 — AITOS
## Generated: 2026-07-08

---

## Resumen

| Métrica | Valor |
|---|---|
| Test files | 65 |
| Tests totales | 876 |
| Pass | 859 (98.1%) |
| Fail | 17 (1.9%) |
| Skip | 0 |
| Flaky | ~5 (timeouts intermitentes) |
| Tiempo total | ~74s |
| Framework | Vitest 4.1.8 |

---

## Distribución por categoría

| Categoría | Archivos | Tests (est.) |
|---|---|---|
| **AI** (core, guard, patterns, slot, etc.) | 10 | ~60 |
| **Services** (dispatch, extraction, pricing, etc.) | 18 | ~200 |
| **Integration** (fase-*, corrected-flows, mode, etc.) | 28 | ~400 |
| **E2E** | 1 | 1 |
| **Policies** (equivalence) | 1 | 17 |
| **Unit** (suggestion-learning) | 2 | ~35 |
| **Tools** (pricing) | 1 | 13 |
| **Simulate** (integration) | 1 | 1 |

---

## Fallas detalladas

| # | Archivo | Test | Tipo | Severidad |
|---|---|---|---|---|
| 1 | `fase-22-correction-flow.test.ts` | T2: destination USER_CORRECTED, origin mantiene estado anterior | HISTÓRICO | MEDIA |
| 2-5 | `fase-27-contingency-readiness.test.ts` | T1-T2: contingency dispatch readiness | HISTÓRICO (timeout) | BAJA |
| 6-9 | `fase-29-quote-enforcement.test.ts` | T1-T4: quote enforcement | HISTÓRICO (timeout) | BAJA |
| 10-14 | `fase-29.2-slot-confirmation-routing.test.ts` | T1-T6: slot confirmation routing | HISTÓRICO (timeout) | BAJA |
| 15 | `dispatch.service.test.ts` | passengers > 4 → contingency offer sent | HISTÓRICO (timeout) | BAJA |
| 16-17 | `dispatch.service.test.ts` | waiting driver contingency | HISTÓRICO (timeout) | BAJA |
| 18-19 | `tool-pricing.test.ts` | equivalence tests (timeout) | HISTÓRICO (timeout) | BAJA |
| 20 | `tool-pricing.test.ts` | promotion detection → source='promotion' | NUEVO (regresión) | MEDIA |
| 21 | `ait-064-suggestion-learning.test.ts` | learning weights DB dependency | HISTÓRICO | BAJA |

---

## Dominios sin cobertura suficiente

| Dominio | Estado | Recomendación |
|---|---|---|
| **Survey** | Sin tests dedicados (solo simulate.int) | Agregar `survey.service.test.ts` |
| **Admin** | `admin-commands.test.ts` (8 tests) | Básico. Agregar coverage de CRUD operations |
| **Geo** | `geo-engine.test.ts` (7 tests) | OK para funciones exportadas |
| **Learning** | `ait-064-suggestion-learning.test.ts` (21 tests) | Coverage en suggestion engine. Falta en opportunity y fare learning |
