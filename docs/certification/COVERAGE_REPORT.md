# COVERAGE REPORT — AITOS
## Generated: 2026-07-08

---

## Coverage estimada por archivo (top 30 por criticidad)

| Archivo | Dominio | Tests | Cobertura est. |
|---|---|---|---|
| `ai/core.ts` | CORE | `core-intents.test.ts` (33 tests) | **ALTA (>85%)** |
| `ai/patterns.ts` | AI | `patterns.test.ts` (16 tests) | **ALTA** |
| `ai/router.ts` | Router | (testeado via integration) | **ALTA** |
| `ai/policy-reserva.ts` | Policy | `integration-scenarios`, `ait-033-equivalence` | **ALTA (>80%)** |
| `ai/policy-ahora.ts` | Policy | `policy-ahora.test.ts` (4 tests) | **MEDIA (~70%)** |
| `ai/guard.ts` | Guard | `guard.test.ts` (4 tests) | **ALTA** |
| `ai/handler.ts` | Handler | Testeado via integration | **MEDIA** |
| `ai/slot-confirmation.ts` | AI | `slot-confirmation-suggestion.test.ts` (13 tests) | **ALTA** |
| `extraction/extraction-runner.ts` | Extraction | `extraction-runner.test.ts` (24 tests) | **MEDIA (~70%)** |
| `extraction/comprehension-runner.ts` | Extraction | `comprehension-runner.test.ts` (9 tests) | **MEDIA** |
| `extraction/regex-extractor.ts` | Extraction | `regex-extractor.test.ts` (20 tests) | **ALTA** |
| `pricing/tariff-resolver.ts` | Pricing | `tariff-resolver.test.ts` (8 tests) | **MEDIA** |
| `pricing/commercial-pricing-engine.ts` | Pricing | `commercial-pricing-engine.test.ts` (11 tests) | **MEDIA** |
| `pricing/pricing-engine.ts` | Pricing | Testeado via tool-pricing | **MEDIA** |
| `trip-execution/trip-execution.service.ts` | Trip | `trip-execution.service.test.ts` (5 tests) | **MEDIA** |
| `trip-execution/now-execution.service.ts` | Trip | `now-execution.test.ts` (6 tests) | **MEDIA** |
| `dispatch/dispatch.service.ts` | Dispatch | `dispatch.service.test.ts` (24 tests) | **ALTA** |
| `dispatch/dispatch-workflow.ts` | Dispatch | `dispatch-workflow.test.ts` (12 tests) | **ALTA** |
| `dispatch/driver.service.ts` | Dispatch | Testeado via integration | **MEDIA (~60%)** |
| `workflow/slot-workflow.ts` | Workflow | `slot-workflow.test.ts` (9 tests) | **MEDIA** |
| `workflow/ambiguity-handler.ts` | Workflow | Testeado via simulate.int | **BAJA (~40%)** |
| `geo/location-resolver.ts` | Geo | `geo-engine.test.ts` (7 tests) | **MEDIA** |
| `learning/opportunity-engine.ts` | Learning | `opportunity-engine.test.ts` | **MEDIA** |
| `learning/fare-learning-engine.ts` | Learning | `fare-learning.test.ts` (17 tests) | **MEDIA** |
| `lead.service.ts` | Orchestrator | `lead-service.test.ts` (24 tests) | **MEDIA** |
| `survey.service.ts` | Survey | Solo simulate.int | **BAJA (<30%)** |
| `admin-commands.ts` | Admin | `admin-commands.test.ts` (8 tests) | **BAJA** |
| `timeouts.ts` | Cron | `timeouts.test.ts` | **BAJA** |
| `sender.ts` | WhatsApp | Testeado via integration | **BAJA** |
| `i18n/catalog.ts` | I18n | Sin tests dedicados | **BAJA** |

---

## Dominios críticos sin cobertura suficiente

| Dominio | Cobertura | Riesgo | Acción |
|---|---|---|---|
| **Survey** | <30% | ALTO — afecta post-trip experience | Agregar `survey.service.test.ts` |
| **Admin** | <30% | ALTO — afecta operaciones | Agregar tests CRUD |
| **Ambiguity-handler** | <40% | MEDIO — archivo más grande del sistema (786L) | Agregar unit tests |
| **Sender** | <40% | MEDIO — WhatsApp API, crítico | Agregar mock-based tests |
| **I18n** | <40% | BAJO — catalog, no lógica | Baja prioridad |
| **Timeouts** | <40% | MEDIO — afecta cron jobs | Agregar tests de escalación |
