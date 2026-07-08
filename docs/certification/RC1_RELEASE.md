# RC1 — STABILIZATION RELEASE CANDIDATE
## 2026-07-08 | Branch: main

---

## 1. Resumen de todas las misiones

| Misión | Fecha | Descripción | Impacto |
|---|---|---|---|
| **P0** | Jul 08 | Hardening: eliminar código zombie (7 archivos, 5 funciones, 3 no-ops). Eliminar tool-geo, tool-dispatch, tool-fleet. Remover handleDriverAccept legacy. | −7 archivos, −5 funciones |
| **P1** | Jul 08 | Boundaries: eliminar geo-engine.ts (144L). Mover findTariffByPriority a pricing/tariff-repository.ts. Corregir ownership. | −1 archivo DEPRECATED, +1 módulo pricing |
| **S0** | Jul 08 | Test recovery: corregir 4 mocks tras P1 (tool-pricing, dispatch, fase-27, fase-29.2). | 875/876 tests |
| **S1** | Jul 08 | Auditar 15 tests históricos: 3 causas raíz, 14 mock rotos, 1 bug real. | BUG_AUDIT.md |
| **S2** | Jul 08 | Recuperar 14 tests (mock location-resolver + resolveGeoRoute). | 875/876 tests |
| **A2** | Jul 08 | Extraer handleSlotConfirmationButton (172L) → workflow/slot-confirmation-handler.ts | lead.service: 752→579 |
| **A3** | Jul 08 | Extraer parsePassengerCount + WORD_TO_NUM (72L) → extraction/passenger-count.ts | lead.service: 579→506 |
| **A4** | Jul 08 | Extraer handleAwaitingPassenger (90L) → workflow/awaiting-passenger-handler.ts | lead.service: 506→416 |
| **B1** | Jul 08 | Auditar bug pérdida de contexto: 5 fallos, causa raíz en executeNowTrip→idle | CONTEXT_LOSS_AUDIT.md |
| **B2** | Jul 08 | Fix pérdida de contexto: zona POST_BOOKING (+25L) | lead.service: 416→441 |

---

## 2. Arquitectura actual

### Estructura de dominios

```
src/lib/
├── ai/              ← CORE, Router, Policy, Guard, Patterns (25 files)
├── services/
│   ├── workflow/    ← slot-confirmation-handler, awaiting-passenger-handler,
│   │                  ambiguity-handler, policy-pipeline, slot-workflow
│   ├── extraction/  ← extraction-runner, extract-slots, passenger-count,
│   │                  confidence, regex-extractor, entity-extractor
│   ├── pricing/     ← pricing-engine, tariff-resolver, tariff-repository,
│   │                  commercial-pricing-engine, hub-discount, tour-resolver
│   ├── dispatch/    ← dispatch.service, dispatch-workflow, driver.service
│   ├── geo/         ← location-resolver (unified, deprecates geo-engine)
│   ├── trip-exec/   ← trip-execution.service, now-execution.service
│   ├── learning/    ← opportunity-engine, fare-learning, policy-engine
│   ├── memory/      ← context-memory, predictive-routing
│   ├── i18n/        ← catalog.ts (es/en/pt)
│   ├── admin/       ← admin-commands, admin.service
│   └── shared/      ← session-helpers, message-helpers
├── db/
│   ├── database.ts  ← facade (870L)
│   ├── core/        ← connection.ts (DDL), helpers.ts
│   └── domains/     ← trips, tours, geo, learning, dispatch-events
├── config/          ← env.ts, constants.ts
├── utils/           ← logger.ts
├── sender.ts        ← WhatsApp API
├── timeouts.ts      ← Cron jobs
├── detect-lang.ts   ← Language detection
└── pipeline.ts      ← processLead inner loop

ael/
├── constitution/    ← SPEC.md, CONTRACTS.md
├── government/      ← ORGANIZATION.md, roles/
├── contracts/       ← enforce.sh, diagnose.sh, CONTRACTS.md
├── artifacts/       ← BACKLOG.md, templates, diagnostic
└── archive/         ← superseded docs

.opencode/           ← agent prompts, commands, memory
```

### Métricas técnicas

| Métrica | Valor |
|---|---|
| Módulos TypeScript | ~125 |
| Líneas en src/lib/ | ~14,500 |
| Bounded contexts | 8 |
| Engines | 11 |
| ADRs | 6 |
| API Routes | 15 |
| DB Tables | 44 |
| Test files | 65 |
| Tests totales | 876 |

---

## 3. Métricas finales

| Gate | Resultado |
|---|---|
| **Build** | ✅ PASS (~8s) |
| **Tests** | ✅ 875/876 (99.9%) |
| **Contracts R1-R4** | ✅ PASS |
| **Schema Parity (44 tablas)** | ✅ 44/44 OK |
| **validate-knowledge (hashes)** | ✅ 11/11 |
| **validate-knowledge (Zod)** | ⚠️ 2/11 (diagnóstico, no gobernanza) |
| **lead.service.ts** | 752 → 441 (−41%) |
| **Archivos eliminados (zombie/legacy)** | 11 |
| **Nuevos módulos (refactor)** | 4 |
| **Archivos modificados totales** | 116 |

---

## 4. Riesgos abiertos

| Riesgo | Severidad |
|---|---|
| **ADMIN_API_KEY sin rotar** (expuesta en `.env`) | CRÍTICO |
| **116 archivos sin commit** (11 misiones completadas) | ALTO |
| **BACKLOG.md v3.12** desactualizado (sin changelog de P0-B2) | MEDIO |
| **fase-22 T2** (1 test falla — decisión de producto) | BAJO |
| **validate-knowledge Zod errors** (places.json types + escalation.json externalRefs) | BAJO |

---

## 5. Deuda técnica restante

| Prioridad | Items |
|---|---|
| **P1** | ADMIN_API_KEY rotation, backlog update, fase-22 decision |
| **P2** | DEBT-02/04/05/06/07/08/09/10/11, GAP-01-12, hotspots |
| **P3** | FUT-01-10, zombie DB columns, dead params |

---

## 6. Bug conocido

| Bug | Detalle | Estado |
|---|---|---|
| **fase-22-correction-flow T2** | origin preservado en corrección parcial. Test espera `null`, recibe valor. | Documentado en BUG_AUDIT.md. Requiere decisión de producto. |
| **Context loss post-confirmación** | executeNowTrip → idle causa pérdida de contexto en mensajes siguientes. | **FIX EN B2**: zona POST_BOOKING mitiga el caso. Riesgo residual bajo. |

---

## 7. Checklist de producción

| Item | Estado |
|---|---|
| Build compila sin errores | ✅ |
| Tests pasan (≥99%) | ✅ 875/876 |
| Contratos R1-R4 | ✅ |
| Schema sync DB↔Código | ✅ 44/44 |
| Sin código zombie activo | ✅ |
| Sin regresiones conocidas | ✅ |
| ADMIN_API_KEY rotada | ❌ (requiere acción manual) |
| LOG_LEVEL verificado en Vercel | ❓ Sin acceso |
| Sentry DSN configurado | ❌ Requiere `SENTRY_DSN` de Cristian |
| Backup DB antes de deploy | ❓ No verificado |

---

## 8. Veredicto

### A) Listo para pruebas manuales locales — ✅ SÍ
Build, tests, contratos, schema parity — todo verde. 875/876 tests.

### B) Listo para deploy de prueba — ✅ SÍ (con condiciones)
Condiciones: rotar ADMIN_API_KEY antes del deploy. Configurar SENTRY_DSN para captura de errores. Verificar LOG_LEVEL en Vercel.

### C) Listo para producción — ⚠️ NO TODAVÍA
Requisitos pendientes: ADMIN_API_KEY rotation, BACKLOG.md update, verificación de LOG_LEVEL en Vercel, Sentry DSN. El código está listo; la configuración de producción no.

---

## 9. Comando de commit propuesto

```bash
git add -A
git commit -m "release: RC1 stabilization baseline (P0-B2)

Hardening P0: remove 7 zombie files, 5 dead functions, 3 no-ops
Hardening P1: remove geo-engine.ts, move findTariffByPriority to pricing
Test Recovery S0-S2: fix 14 mock regressions, achieve 875/876 tests
Lead Service Refactor A2-A4: extract 334 lines into 3 modules (752→441)
Bug Fix B2: post-booking zone prevents context loss after confirmation"

git status  # debe quedar limpio
git push origin main  # sin force push
```
