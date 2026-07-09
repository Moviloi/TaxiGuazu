# QA1 FUNCTIONAL CERTIFICATION — RC1
## 2026-07-08 | 65 test files, 876 tests

---

## 1. Resumen de ejecución

| Gate | Resultado |
|---|---|
| Build | ✅ PASS |
| Tests (full suite) | 873/876 (99.7%) — 1 historical + 2 flaky e2e |
| Tests (individual) | 875/876 — e2e pass when run alone |
| Contracts R1-R4 | ✅ PASS |
| Schema Parity | ✅ 44/44 |
| Validate-knowledge (hashes) | ✅ 11/11 |

---

## 2. Escenarios NOW

| Escenario | Test automático | Cobertura |
|---|---|---|
| Aeropuerto → Hotel | ✅ `now-execution.test.ts` (6 tests) | ALTA |
| Hotel → Aeropuerto | ✅ `integration-scenarios.test.ts` Escenario B | ALTA |
| Ciudad → Cataratas | ✅ `integration-scenarios.test.ts` | MEDIA |
| Ciudad → Brasil | ⚠️ Parcial — `border-inference-pipeline.test.ts` (6 tests) | MEDIA |
| Ciudad → Paraguay | ⚠️ Parcial — border inference | BAJA |

## 3. Escenarios RESERVA

| Escenario | Test automático | Cobertura |
|---|---|---|
| Reserva simple | ✅ `integration-scenarios.test.ts` Escenario A | ALTA |
| Reserva con vuelo | ❌ Sin test dedicado | BAJA |
| Reserva ida y vuelta | ✅ `multi-leg` via hub-discount | MEDIA |
| Cambio de horario | ✅ `change_scheduled_at` en fase-20 | MEDIA |
| Cancelación | ✅ `awaiting_confirmation → negative → collecting_slots` | ALTA |

## 4. Escenarios MULTI LEG

| Escenario | Test automático | Cobertura |
|---|---|---|
| Hotel → Cataratas → Hotel | ✅ `hub-discount` auto-learn + multi-ride | MEDIA |
| Aeropuerto → Hotel → Cataratas | ⚠️ Sin test específico | BAJA |

## 5. Escenarios CORRECCIONES

| Escenario | Test automático | Cobertura |
|---|---|---|
| Cambiar origen | ✅ `fase-20` change_origin | ALTA |
| Cambiar destino | ✅ `fase-20` change_destination | ALTA |
| Cambiar pasajeros | ✅ `fase-20` change_passengers | ALTA |
| Responder "sí" | ✅ `patterns.test.ts` (afirmación) + `fase-25` | ALTA |
| Responder "ok" | ✅ `patterns.test.ts` (5 lenguajes) | ALTA |
| Responder mediante botones | ✅ `fase-20`, `fase-29.4` | ALTA |

## 6. Escenarios PRICING

| Escenario | Test automático | Cobertura |
|---|---|---|
| 1 pasajero | ✅ `tariff-resolver.test.ts`, `tool-pricing.test.ts` | ALTA |
| 4 pasajeros | ✅ (4p pricing) | ALTA |
| 6 pasajeros | ✅ (6p pricing) | ALTA |
| Tarifa inexistente | ✅ `tariff-resolver.test.ts` not_found | ALTA |
| Promociones | ✅ `commercial-pricing-engine.test.ts` (11 tests) | ALTA |
| Paquetes | ✅ `commercial-pricing-engine.test.ts` | ALTA |

## 7. Escenarios DISPATCH

| Escenario | Test automático | Cobertura |
|---|---|---|
| NOW dispatch | ✅ `dispatch.service.test.ts` (24 tests) + `now-execution` | ALTA |
| Reserva futura | ✅ `dispatch.service.test.ts` (scheduled path) | ALTA |
| Broadcast | ✅ `dispatch.service.test.ts` (broadcast) | ALTA |
| Timeout | ✅ `dispatch.service.test.ts` (escalation) + `timeouts.test.ts` | MEDIA |
| Reasignación | ✅ `fase-27` (contingency) | MEDIA |

---

## 8. Bugs encontrados

| Bug | Archivo | Severidad |
|---|---|---|
| fase-22 T2: origin preservado en corrección parcial | `correction-flow.test.ts` | BAJA — documentado, pendiente decisión |
| e2e flaky: improved-flows T1/T2 (mock interference) | `improved-flows.test.ts` | BAJA — pasan individualmente, fallan en suite |

---

## 9. Veredicto Final

| Criterio | Veredicto | Evidencia |
|---|---|---|
| **A) Arquitectónicamente estable** | ✅ SÍ | 8 bounded contexts, 6 ADRs, 0 circular deps nuevos |
| **B) Funcionalmente estable** | ✅ SÍ | 873/876 tests, 0 regresiones funcionales desde P0 |
| **C) Listo para piloto** | ✅ SÍ | Build ✅, contratos ✅, schema parity ✅, context loss fix ✅ |
| **D) Listo para producción** | ⚠️ CONDICIONAL | Requiere: ADMIN_API_KEY rotation, SENTRY_DSN, LOG_LEVEL verification |
