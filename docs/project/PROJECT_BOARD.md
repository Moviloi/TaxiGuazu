# PROJECT BOARD — AITOS
## Actualizado: 2026-07-10 | Etapa: Human Experience & Pilot Optimization

---

## Leyenda

| Prioridad | Significado |
|---|---|
| **P0** | Bloqueante — debe resolverse antes del próximo paso |
| **P1** | Alta — esta semana |
| **P2** | Media — este mes |
| **P3** | Baja — backlog |

---

## P0 — Bloqueantes

| ID | Tarea | Dominio | Estado | ADR | Origen |
|---|---|---|---|---|---|
| P0-01 | Rotar ADMIN_API_KEY (expuesta en chat) | Ops | READY | N/A | OPS1 | **BLOQUEA PILOTO** |
| P0-02 | Configurar SENTRY_DSN en Vercel | Ops | READY | N/A | OPS1 | **BLOQUEA PILOTO** |
| P0-04 | Seed de choferes reales en Turso | Ops | READY | N/A | OPS1 | **BLOQUEA PILOTO** |
| P0-03 | `connection_cache` sin CREATE TABLE — riesgo de runtime error | DB | READY | N/A | P3 Audit |

## P1 — Alta prioridad

| ID | Tarea | Dominio | Estado | ADR | Origen |
|---|---|---|---|---|---|
| P1-01 | ~~Implementar Conversation Interpreter (ADR-007)~~ | Pipeline | **DONE** | 007 | B3 | `3080686` |
| P1-02 | ~~Fix entity-extractor: guard para clarifications~~ | Extraction | **DONE** | N/A | B3 | `3080686` |
| P1-03 | Deshabilitar auto-insert de aliases con Levenshtein ≤3 | DB | READY | N/A | B3, GEO Audit |
| P1-04 | Cerrar fase-22 T2 (decisión de producto: ¿preservar origin en corrección parcial?) | Extraction | ADR_PENDING | N/A | S0 |
| P1-05 | `placeIdCache` nunca se invalida — agregar TTL | Geo | READY | N/A | P3 Audit |
| P1-06 | `is_principal2` nunca se escribe en código | DB | READY | N/A | P3 Audit |
| P1-07 | Configurar LOG_LEVEL=info en Vercel | Ops | READY | N/A | OPS1 |
| P1-08 | PAIR_BASE y CORRIDOR_PAIRS → migrar a tabla DB | Geo | READY | N/A | P3 Audit |
| P1-09 | ENTITY_CATALOG → migrar a tabla DB | Extraction | READY | N/A | P3 Audit |

## P2 — Media prioridad

| ID | Tarea | Dominio | Estado | ADR | Origen |
|---|---|---|---|---|---|
| P2-01 | Eliminar dual engine pricing v2 | Pricing | READY | N/A | P1 Audit |
| P2-02 | LRU cache para resolveLocation (aliases repetidos) | Geo | READY | N/A | Cache Audit |
| P2-03 | Dropear tablas dead: driver_invitations, transfer_priority | DB | READY | N/A | P3 Audit |
| P2-04 | Dropear 30 columnas fantasma (geo-catastral, zones metadata, drivers) | DB | READY | N/A | P3 Audit |
| P2-05 | DEBT-02: Eliminar acoplamiento survey→lead | Services | READY | N/A | DEBT Baseline |
| P2-06 | Completar i18n (15 strings restantes) | I18n | READY | N/A | DEBT Baseline |
| P2-07 | Fix 4 type/DDL mismatches | DB | READY | N/A | P3 Audit |
| P2-08 | Human Layer: templates con variación | UX | READY | N/A | UX Audit |
| P2-09 | Métricas de experiencia conversacional | UX | READY | N/A | UX Audit |
| P2-10 | Persistir `last_intent` en chat_sessions (1 columna) | DB/Pipeline | READY | N/A | E6/E9/E10 |
| P2-11 | ~~Conectar `purchaseIntent` de CORE a Policy (C1-C2 E11)~~ | Policy | **DONE** | N/A | E11 |
| P2-12 | Formalizar `post_booking` state (no resetear a idle) | Workflow | READY | N/A | E6 |
| P2-13 | Inferencia semántica en Conversation Interpreter | Pipeline | READY | 007 | E6 |
| P2-14 | ~~Exponer `urgency:` fact a Policy como señal independiente~~ | Policy | **DONE** | N/A | E11-B |
| P2-15 | ~~Conectar CI `classification.type` a decisiones (correction/cancel)~~ | Policy | **DONE** | 007 | E11-B |

## P3 — Baja prioridad

| ID | Tarea | Dominio | Estado | ADR | Origen |
|---|---|---|---|---|---|
| P3-01 | Hotspots >400L (7 archivos) | Refactor | READY | N/A | Quality Baseline |
| P3-02 | Cobertura en Survey y Admin | Testing | READY | N/A | Coverage Report |
| P3-03 | iguazu-knowledge: migrar 110+ líneas a Turso | Data | READY | N/A | P3 Audit |
| P3-04 | DEBT-04 a DEBT-11 (fragmentar DB facade, split services) | Refactor | READY | N/A | DEBT Baseline |
| P3-05 | FUT-01 a FUT-10 (features futuras) | Features | READY | N/A | BACKLOG |
| P3-06 | ~~Derivar `client_objective` (booking_urgent, inquiry_price, comparing_options)~~ | Pipeline | **DONE** | N/A | E6/E9/E10/E12 |
| P3-07 | Trip bundles en Turso (P0.17) | Data | READY | N/A | E6 |
| P3-08 | Smart fill: extraer múltiples slots simultáneamente | Extraction | READY | N/A | E6 |
| P3-09 | No preguntar passengers si pricing flat 1-4 | Policy | READY | N/A | E6 |
 
---

## DONE (desde RC1)

| ID | Tarea | Commit |
|---|---|---|---|
| D01 | Hardening P0: eliminar código zombie | c09a2c7 |
| D02 | Hardening P1: eliminar geo-engine, pricing ownership | c09a2c7 |
| D03 | Test recovery S0-S2 | c09a2c7 |
| D04 | Lead service refactor A2-A6 (752→264) | 08ce37e |
| D05 | Bug fix B2: post-booking zone | 08ce37e |
| D06 | Quality baseline v1.0 | 08ce37e |
| D07 | ADR-007: Conversation Interpreter | — |
| D08 | Conversation Interpreter implementado | 3080686 |
| D09 | Entity-extractor guard para clarifications | 3080686 |
| D10 | AEL-H1: Harness evolution (Keeper, Analyst, Director) | 11e6231 |
| D11 | E11 C1-C2: purchaseIntent conectado de CORE a Policy | — |
| D12 | E11-B P2-14: urgency expuesto a Policy como señal independiente | — |
| D13 | E11-B P2-15: CI classification.type conectado a decisiones Policy | — |
| D14 | E12 P3-06: Client Objective Model implementado (booking_urgent, inquiry_price, trust_check, etc.) | — |
| D15 | R1 Phase 1: Strategy Decision Refactor — computeStrategyDecision() centralizado con purchaseIntent, urgency, clientObjective, messageType → behaviorFlags. 6 flags migrados a policies con fallback. 875/876 tests, build, contratos. | — |
| D16 | R2 Phase 1: Conversation Speed Refactor — greetingLength, skipConfirmation, minimizeQuestions añadidos a StrategyDecision. Computados desde computeStrategyDecision(). Audit completa de 12 concerns speed. Coverage: 3/12 concerns centralizados. | — |
| D17 | R3 Phase 1: Conversation Tone Refactor — responseLength ("short"|"normal"|"detailed"), reassuranceNeeded (boolean), callToAction ("none"|"soft"|"direct") añadidos a StrategyDecision y computados en computeStrategyDecision(). Audit completa de 14 concerns tone. 3 campos centralizados. 875/876 tests, build, contratos. | — |
| D18 | R4 Phase 1: Field Priority Refactor — fieldAcquisitionMode ("skip"|"minimal"|"normal") + fieldPriority poblado en StrategyDecision. Audit completa de 20 concerns field priority. 2 campos centralizados. 873/876 tests (0 regresiones nuevas), build, contratos. | — |
| D19 | **R5 Phase 2 — StrategyDecision Activation**: eliminados 5 `??` fallbacks en policies (FB1-FB5). StrategyDecision es la ÚNICA fuente de verdad para all strategic fields. responseLength/reassuranceNeeded/callToAction inyectados en prompt LLM. greetingLength agregado a handler log. 875/876 tests (0 regresiones — única falla pre-existente no relacionada), build ✅, contratos ✅. | — |
| D20 | **ADR-008 — Conversational Decision Architecture**: Normative contract. Architecture Freeze declarado. Ownership único por concern. | — |
| D21 | **ARCHITECTURE_MILESTONE_v2.0**: Milestone histórico de la Serie R. | — |
| D22 | **D18 — Post-Freeze Compliance Audit**: 7 audits PASS. 0 contract violations. Architecture verified compliant with ADR-007. | — |
| D23 | **F1 — Architecture Integration Validation**: Pipeline completo verificado. StrategyDecision trace ✅. ADR-008 compliance ✅. 43/43 references correctas. 875/876 tests, build, contracts ✅. | — |
| D24 | **F2 — Documentation Synchronization**: Documentación sincronizada con el código. 8 auditorías completadas. | — |

---

## Dependencias

```
P0-01 ──→ (bloquea piloto)
P0-02 ──→ (bloquea piloto)
P1-09 ──→ P1-03 (entity catalog en DB alimenta al interpreter)
P2-01 ──→ P2-02 (sin v2, el pricing cache es más simple)
P2-12 ──→ D05 (post_booking state formaliza el fix B2 existente)
P2-13 ──→ D08 (inferencia semántica enriquece el Conversation Interpreter)
P2-14 ──→ D11 (urgency sigue el mismo patrón que purchaseIntent)
P2-15 ──→ D08 (classification.type existe pero no influye en decisiones)
```
