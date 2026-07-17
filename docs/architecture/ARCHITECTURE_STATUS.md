# ARCHITECTURE STATUS — AITOS

> Documento canónico del estado arquitectónico real del proyecto.
> Fuente única de verdad para entender qué existe, qué está aprobado, qué permanece como diseño.
>
> **Actualizado:** 2026-07-16 | **Misión:** PR-H0A — Staging Hardening Audit | **ADR count:** 12 (001–012)

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Convenciones](#2-convenciones)
3. [Pipeline real del sistema](#3-pipeline-real-del-sistema)
4. [Inventario completo de ADR](#4-inventario-completo-de-adr)
5. [Inventario completo de componentes](#5-inventario-completo-de-componentes)
6. [Estado del pipeline operacional](#6-estado-del-pipeline-operacional)
7. [Estado del pipeline cognitivo](#7-estado-del-pipeline-cognitivo)
8. [Decisiones irreversibles](#8-decisiones-irreversibles)
9. [Arquitectura futura (sin implementar)](#9-arquitectura-futura-sin-implementar)
10. [Riesgos abiertos](#10-riesgos-abiertos)
11. [Deuda técnica arquitectónica](#11-deuda-técnica-arquitectónica)
12. [Inventario completo de documentos](#12-inventario-completo-de-documentos)
13. [Estado del roadmap](#13-estado-del-roadmap)
14. [Estado de cada milestone](#14-estado-de-cada-milestone)
15. [Glosario de estados](#15-glosario-de-estados)

---

## 1. Resumen ejecutivo

AITOS es un sistema conversacional para TaxiGuazu construido sobre Next.js 15 + TypeScript + Turso (libSQL). Su arquitectura comprende dos planos diferenciados:

| Plano | Estado | Descripción |
|---|---|---|
| **Operacional (presente)** | ✅ Implementado | Pipeline conversacional completo, Evidence Engine (frozen), Operational Learning, pricing, dispatch, etc. |
| **Cognitivo (futuro)** | 🟡 Parcial | Memory (ADR-010) — 🟡 IM-1 implementado (7 archivos, 45 tests). Pattern Discovery — 🟡 PD-IM-1 implementado (12 archivos, ⚠️ bug conocido). |

**Pipeline real hoy:**
```
Webhook → CORE → Conversation Interpreter → StrategyDecision → Policies → LLM → Response
                                                                           ↓
                                                               Evidence Engine (Shadow Mode)
                                                                           ↓
                                                         Memory (IM-1, si COGNITIVE_MEMORY_ENABLED)
```

**Arquitectura congelada:**
- Conversational Decision Architecture (ADR-008) — Freeze desde R5
- Evidence Engine (ADR-009) — Freeze desde PR-3E
- Cognitive Escalation Principle (ADR-012) — Architecture Freeze V3

**Ciclo de vida actual:** Staging Hardening → ACTIVA (post-RRR-1).
**Deuda técnica:** 21 items (5 P1 + 10 P2 + 6 P3) + 10 items H0A (4 P0 bloquean staging).
**Piloto:** Bloqueado por 4 tareas P0 (rotación de API key, SENTRY_DSN, seed choferes, CREATE TABLE faltante). Middleware (H0A-03) diferido a Post-v1 — **No bloquea v1.0 / Version Zero.** Ver `docs/architecture/DEFERRED_MIDDLEWARE.md`.
**RRR-1 Verdict:** 🟡 READY FOR STAGING WITH CONDITIONS. Build ✅ (39.9s compile, 7/7 pages). Tests 1653/1657 PASS ✅. Contratos R1-R4 PASS ✅. 4 condiciones documentadas en PROJECT_BOARD (Pending before Production).
**H0A Verdict:** 🟡 3 HALLASZGOS BLOQUEAN STAGING (flags sin documentar, tests fallando, key expuesta). 1 hallazgo diferido a Post-v1 (middleware — H0A-03). 3 hallazgos no bloquean. Documento: `docs/certification/H0A_STAGING_HARDENING_AUDIT.md`.

---

## 2. Convenciones

### 2.1 Estados de componente

| Estado | Símbolo | Significado |
|---|---|---|
| Implementado | ✅ | Código existe en producción y está operativo |
| Implementado parcialmente | 🟡 | Código existe pero con gaps documentados |
| Diseño aprobado (freeze) | 🔒 | Implementado y congelado; cambios requieren ADR |
| Diseño en elaboración | 📝 | Diseño conceptual avanzado; sin código |
| Eliminado | ❌ | Eliminado como capa arquitectónica |
| Reemplazado | 🔄 | Reemplazado por otro componente |
| Obsoleto | 🗑️ | Ya no se usa, pendiente de limpieza |

### 2.2 Clasificación temporal

| Símbolo | Significado |
|---|---|
| **PRESENTE** | Existe en el código hoy |
| **FUTURO** ⏳ | Diseño conceptual, no existe como código |
| **LEGADO** | Existió, ya no se mantiene |
| **HISTÓRICO** | Decisión pasada, documentada para trazabilidad |

### 2.3 Fuentes de verificación

Cada afirmación indica su origen: ADR, PR, commit, o archivo de código.

---

## 3. Pipeline real del sistema

### 3.1 Pipeline conversacional (operacional)

```
Webhook HTTP (WhatsApp Cloud API)
    │
    ▼
[API Route] src/app/api/whatsapp/webhook/route.ts
    │  ── HMAC verification (WhatsApp signature)
    │  ── Rate limiting
    │  ── Idempotency
    │
    ▼
[Handler] src/lib/ai/handler.ts (179 L)
    │  ── CORE: intent detection (12 intents)
    │  ── ConversationInterpreter: message type classification
    │  ── ClientObjective: compute booking urgency, intent type
    │  ── computeStrategyDecision(): 8+ strategic fields
    │  ── Router: origin/destination → domain routing
    │  ── LLM call (Gemini → Groq fallback)
    │
    ▼
[Pipeline Orchestrator] src/lib/pipeline.ts
    │  ── Coordinates extraction, policies, response
    │
    ▼
[Lead Service] src/lib/services/lead.service.ts (301 L)
    │  ── Main orchestrator
    │  ── Slot workflow state machine
    │  ── Policy execution (Reserva / Ahora)
    │  ── Trip execution
    │  ── Shadow cognition integration
    │
    ▼
[Response] WhatsApp message sent via src/lib/sender.ts
```

### 3.2 Pipeline cognitivo (real — shadow mode)

```
[Handler] → Signal → Observation → Fact → Evidence → Knowledge → Belief → Decision
                                                                                ↓
                                                                    runShadowCognition()
                                                                                ↓
                                                                        ShadowResult
                                                                                ↓
                                                            (output descartado en lead.service.ts:83)
```

**El pipeline cognitivo post-EE no existe.** El `ShadowResult` se construye pero su valor de retorno nunca se captura ni almacena. Memory (ADR-010) y Pattern Discovery (PR-7) son diseño futuro sin implementación.

### 3.3 Pipeline cognitivo (diseñado — no implementado)

```
EE (implementado) → Memory (futuro ⏳) → Pattern Discovery (futuro ⏳)
```

### 3.4 Modelo de inteligencia oficial (aprobado en ADR-012 — no implementado)

A partir de ADR-012, el modelo de inteligencia que debe gobernar la arquitectura es:

```
Business Knowledge Engine (N0) → Deterministic Reasoning Layer (N1) → Groq (N2a) → Gemini (N2b) → Fallback estático
```

| Nivel | Capa | Responsabilidad | Estado |
|:-----:|------|----------------|--------|
| **N0** | Business Knowledge Engine | Conocer: consulta a fuentes de verdad existentes | ✅ Implementado (PR-5A, PR-5E, PR-5E.1) |
| **N1** | Deterministic Reasoning Layer | Decidir: reglas determinísticas sobre datos del BKE | ✅ Implementado (PR-5B, PR-5C, PR-5D) |
| **N2a** | Groq (llama-3.3-70b) | Generar/extraer/comprender semánticamente | 🔴 No operativo (rate limit 429) |
| **N2b** | Gemini (gemini-2.0-flash) | Generar/extraer/comprender semánticamente | 🔴 No operativo (sin API key) |
| **Fallback** | Plantilla estática (BKE.obtenerMensaje) | Responder cuando todos los niveles fallan | 🟡 Parcial (templates existen, sin DRL) |

**Documentos**: ADR-012, CE-1, CE-2, CE-3A, CE-3B, CE-4, CE-5 (PR-5A a PR-5G).
**Implementación**: ✅ COMPLETADA — Serie CE certificada (PR-5G, 2026-07-16). Ver ADR-012 Sección 9 para desviaciones documentadas.

---

## 4. Inventario completo de ADR

| ADR | Título | Estado | Freeze | Implementación | Temporal | Dependencias |
|---|---|---|---|---|---|---|
| **001** | Layered Architecture | ✅ Accepted | No | Presente (con refactors pendientes) | PRESENTE | — |
| **002** | Database Facade Pattern | ✅ Accepted | No | 🟡 Parcial (Learning bypasses facade) | PRESENTE | ADR-001 |
| **003** | Learning Domain Architecture | ✅ Accepted | No | 🟡 Parcial (8 módulos sin implementar) | PRESENTE + FUTURO | ADR-001, ADR-002 |
| **004** | Service Boundary Rules | ✅ Accepted | No | 🟡 Parcial (violaciones conocidas) | PRESENTE | ADR-001 |
| **005** | AI-First Interpretation | ✅ Accepted | No | ✅ Implementado + enforcement R4 | PRESENTE | — |
| **006** | Schema Parity | 🔄 Extended | No | ✅ Implementado (44/44, 0 drift) | PRESENTE | — |
| **007** | Conversation Interpreter | ✅ Accepted | No | ✅ Implementado (commit 3080686) | PRESENTE | — |
| **008** | Conversational Decision Architecture | ✅ ACCEPTED | 🔒 **FREEZE** | ✅ En efecto (frozen desde R5) | PRESENTE | ADR-001, ADR-004 |
| **009** | Evidence Engine Architecture | ✅ Accepted | 🔒 **FREEZE** | ✅ Implementado (378 tests) | PRESENTE | ADR-001, ADR-003, ADR-004, ADR-008 |
| **010** | Cognitive Memory Architecture | ✅ Accepted | No | ⏳ **0% implementado** (diseño conceptual) | **FUTURO** ⏳ | ADR-009 |
| **011** | Reflection Elimination | ✅ Accepted | No | ❌ Sin código (eliminación de capa nunca implementada) | **HISTÓRICO / FUTURO** | ADR-009, ADR-010 |
| **012** | Cognitive Escalation Principle | ✅ Accepted | No | ✅ Implementado (PR-5A a PR-5G) | PRESENTE | CE-1, CE-2, CE-3A, CE-3B, CE-4 |

### 4.1 ADR pendientes o en riesgo

| Issue | Detectado en | Impacto |
|---|---|---|
| ADR-002: Learning importa de `db/domains/learning` directamente, no de `database.ts` | ADR_INDEX.md | Violación de facade pattern |
| ADR-004: `ai/response-builder.ts` importa `OpportunityResult` de learning | ADR_INDEX.md | Violación de service boundary |
| ADR-004: 11 archivos >300 líneas (`lead.service.ts`, `policy-reserva.ts`, `extraction-runner.ts`, etc.) | System-map.md, ADR-004 | God functions, SRP violado |

---

## 5. Inventario completo de componentes

### 5.1 Capas arquitectónicas (presente)

| Capa | Estado | Ubicación | L | Fuente | ADR |
|---|---|---|---|---|---|
| **API Routes** | ✅ Implementado | `src/app/api/` | ~8 routes | Código | ADR-001 |
| **Router (CORE)** | ✅ Implementado | `src/lib/ai/router.ts` | — | Código | ADR-001 |
| **Conversation Handler** | ✅ Implementado | `src/lib/ai/handler.ts` | 179 | Código | ADR-001 |
| **Conversation Interpreter** | ✅ Implementado | `src/lib/ai/conversation-interpreter.ts` | 100 | Código | ADR-007 |
| **Strategy Decision** | 🔒 Freeze | `src/lib/ai/conversation-strategy.ts` | — | Código | ADR-008 |
| **Client Objective** | ✅ Implementado | `src/lib/ai/client-objective.ts` | — | Código | E12 |
| **LLM Providers** | ✅ Implementado | `src/lib/ai/providers/` | 3 files | Código | ADR-001 |
| **Policies** | ✅ Implementado | `src/lib/ai/policy-*.ts` | 2 policies | Código | ADR-001 |
| **Entity Extraction** | ✅ Implementado | `src/lib/services/extraction/` | ~12 files | Código | ADR-001 |
| **Slot Workflow** | ✅ Implementado | `src/lib/services/workflow/` | ~15 files | Código | ADR-001 |
| **Pricing Engine** | ✅ Implementado | `src/lib/services/pricing/` | ~8 files | Código | ADR-001 |
| **Geo Services** | ✅ Implementado | `src/lib/services/geo/` | 2 files | Código | ADR-001 |
| **Dispatch** | ✅ Implementado | `src/lib/services/dispatch/` | 5 files | Código | ADR-001 |
| **Trip Execution** | ✅ Implementado | `src/lib/services/trip-execution/` | 3 files | Código | ADR-001 |
| **I18n** | 🟡 Parcial | `src/lib/services/i18n/` | 2 files (~135 strings) | Código | ADR-004 |
| **Operational Memory** | ✅ Implementado | `src/lib/services/memory/` | 3 files | Código | ADR-001 |
| **Lead Service** | ✅ Implementado | `src/lib/services/lead.service.ts` | 301 L | Código | ADR-001 |
| **Admin** | ✅ Implementado | `src/lib/services/admin/` | 2 files | Código | ADR-001 |
| **Shared** | ✅ Implementado | `src/lib/services/shared/` | 6 files | Código | ADR-001 |
| **DB Facade** | ✅ Implementado | `src/lib/db/database.ts` | 809 L | Código | ADR-002 |
| **DB Core** | ✅ Implementado | `src/lib/db/core/` | 2 files | Código | ADR-002 |
| **DB Domains** | ✅ Implementado | `src/lib/db/domains/` | 7 files | Código | ADR-002 |
| **Utils** | ✅ Implementado | `src/lib/utils/` | 2 files | Código | ADR-001 |
| **Config** | ✅ Implementado | `src/config/` | 3 files | Código | ADR-001 |
| **Auth** | ✅ Implementado | `src/lib/auth.ts` | — | Código | ADR-001 |

### 5.2 Evidence Engine (presente — frozen)

| Componente | Estado | Archivos | Tests | Fuente | ADR |
|---|---|---|---|---|---|
| **Signal** | 🔒 Freeze | `src/lib/evidence/signal.ts` | ✅ | Código | ADR-009 |
| **Observation** | 🔒 Freeze | `src/lib/evidence/observation.ts` | ✅ | Código | ADR-009 |
| **Fact** | 🔒 Freeze | `src/lib/evidence/fact.ts` | ✅ | Código | ADR-009 |
| **Evidence** | 🔒 Freeze | `src/lib/evidence/evidence.ts` | ✅ | Código | ADR-009 |
| **Knowledge** | 🔒 Freeze | `src/lib/evidence/knowledge.ts` | ✅ | Código | ADR-009 |
| **Belief** | 🔒 Freeze | `src/lib/evidence/belief.ts` | ✅ | Código | ADR-009 |
| **Decision** | 🔒 Freeze | `src/lib/evidence/decision.ts` | ✅ | Código | ADR-009 |
| **Builders** | 🔒 Freeze | `src/lib/evidence/build-*.ts` | ✅ | Código | ADR-009 |
| **Shadow Result** | 🔒 Freeze | `src/lib/evidence/shadow-result.ts` | ✅ | Código | ADR-009 |
| **Shadow Cognition** | 🔒 Freeze | `src/lib/evidence/run-shadow-cognition.ts` | ✅ | Código | ADR-009 |
| **Types** | 🔒 Freeze | `src/lib/evidence/types.ts` | ✅ | Código | ADR-009 |

**Total:** 20 archivos, 378 tests. Pipeline completo: Message → Signal → Observation → Fact → Evidence → Knowledge → Belief → Decision.

### 5.3 Operational Learning (presente)

| Componente | Estado | Archivo | Fuente | ADR |
|---|---|---|---|---|
| **Learning Types** | ✅ Implementado | `src/lib/services/learning/types.ts` | Código | ADR-003 |
| **Learning Pipeline** | ✅ Implementado | `src/lib/services/learning/learning-pipeline.service.ts` | Código | ADR-003 |
| **Learning Utils** | ✅ Implementado | `src/lib/services/learning/learning-utils.ts` | Código | ADR-003 |
| **Fare Learning Engine** | ✅ Implementado | `src/lib/services/learning/fare-learning-engine.ts` | Código | ADR-003 |
| **Opportunity Engine** | ✅ Implementado | `src/lib/services/learning/opportunity-engine.ts` (257 L) | Código | ADR-003 |
| **Opportunity Types** | ✅ Implementado | `src/lib/services/learning/opportunity-types.ts` | Código | ADR-003 |
| **Policy Engine** | ✅ Implementado | `src/lib/services/learning/policy-engine.ts` | Código | ADR-003 |
| **Suggestion Recalculator** | ✅ Implementado | `src/lib/services/learning/suggestion-recalculator.ts` | Código | ADR-003 |
| **Learning Routing** | ✅ Implementado | `src/lib/services/learning/routing.ts` | Código | ADR-003 |
| **System Load** | ✅ Implementado | `src/lib/services/learning/system-load.ts` | Código | ADR-003 |
| **Event Tracking** | ✅ Implementado | `src/lib/services/learning/event-tracking.ts` | Código | ADR-003 |
| **Learning Objectives** | ✅ Implementado | `src/lib/services/learning/objectives.ts` | Código | ADR-003 |
| **Learning Economics** | ✅ Implementado | `src/lib/services/learning/economics.ts` | Código | ADR-003 |
| **Learning Admin** | ✅ Implementado | `src/lib/services/learning/admin.ts` | Código | ADR-003 |
| **Adaptation** | ✅ Implementado | `src/lib/services/learning/adaptation.ts` | Código | ADR-003 |

**Total:** 15 archivos. Madurez: Nivel 3-4 (Automated/Adaptive).

### 5.4 Capas cognitivas futuras (no implementadas)

| Componente | Estado | Ubicación propuesta | Fuente | ADR |
|---|---|---|---|---|
| **Memory** | 🟡 Implementado parcialmente | `src/lib/memory/` — **7 archivos** | ADR-010, IM-1 | ADR-010 |
| **Pattern Discovery** | 🟡 Implementado parcialmente | `src/lib/pattern-discovery/` — **12 archivos** | PR-7A…PR-7G, PD-IM-1 | PR-7 |

### 5.5 Capas eliminadas

| Capa | Estado | Decisión | Fuente |
|---|---|---|---|
| **Reflection** | ❌ Eliminada | Absorbida como δ interna de Pattern Discovery | ADR-011, PR-6A…PR-6F |
| **Goals (cognitivo)** | ❌ Eliminada | Funciones prescriptivas persisten en Operational Learning | PR-8A…PR-8G |
| **Planning (cognitivo)** | ❌ Eliminada | Instrucciones → sistema operacional directamente | PR-9A…PR-9G |
| **Boundary** | ❌ Eliminada | Era función identidad; API pública de Pattern Discovery | PR-10A…PR-10F |

---

## 6. Estado del pipeline operacional

### 6.1 Qué existe

| Componente | Produce | Consume | Implementado |
|---|---|---|---|
| **Webhook** | Mensaje de WhatsApp | HTTP POST | ✅ `src/app/api/whatsapp/webhook/route.ts` |
| **CORE** | Intent (12 tipos), purchaseIntent | Mensaje crudo | ✅ `src/lib/ai/core.ts` |
| **Conversation Interpreter** | MessageType (12 tipos) | Intent + estado | ✅ `src/lib/ai/conversation-interpreter.ts` |
| **Client Objective** | ClientObjective (9 tipos) | Intent, purchaseIntent, messageType | ✅ `src/lib/ai/client-objective.ts` |
| **Strategy Decision** | StrategyDecision (8+ campos) | Señales múltiples | 🔒 `src/lib/ai/conversation-strategy.ts` |
| **Policies** | Decisiones de negocio | StrategyDecision | ✅ `src/lib/ai/policy-*.ts` |
| **Entity Extraction** | Slots extraídos | Mensaje + contexto | ✅ `src/lib/services/extraction/` |
| **Slot Workflow** | Estado de slots confirmados | Slots extraídos | ✅ `src/lib/services/workflow/` |
| **Pricing** | Cotización | Slots + tarifas | ✅ `src/lib/services/pricing/` |
| **Dispatch** | Asignación de conductor | Trip confirmado | ✅ `src/lib/services/dispatch/` |
| **Trip Execution** | Trip ejecutado | Trip + dispatch | ✅ `src/lib/services/trip-execution/` |
| **Survey** | Encuesta post-viaje | Trip completado | ✅ `src/lib/services/trip-execution/survey.service.ts` |
| **Admin** | Comandos administrativos | Mensaje de admin | ✅ `src/lib/services/admin/` |
| **Evidence Engine** | ShadowResult (descartado) | Mensaje del handler | 🔒 `src/lib/evidence/` |

### 6.2 Qué NO existe

- **Memory cognitiva** (ADR-010) — 🟡 7 archivos en `src/lib/memory/` (IM-1, COGNITIVE_MEMORY_ENABLED=false)
- **Pattern Discovery** — 🟡 12 archivos en `src/lib/pattern-discovery/` (PD-IM-1, PATTERN_DISCOVERY_ENABLED=false, bug conocido en repository.ts)
- **Middleware centralizado (`middleware.ts`)** — ❌ No existe. Decisión consciente de **Version Zero**. La validación permanece local a cada endpoint (HMAC en webhook, API key check inline en rutas admin). Sin tráfico real, la centralización es sobreingeniería. Ver `docs/architecture/DEFERRED_MIDDLEWARE.md`.
- **API cognitiva** (`getPatterns()`) — no diseñada
- **Conexión EE → Memory** — `ShadowResult` descartado en `lead.service.ts:83`
- **Goal/Planning cognitivo** — eliminados en PR-8/PR-9
- **Reflection** — eliminado en ADR-011

---

## 7. Estado del pipeline cognitivo

### 7.1 Capas existentes como diseño solamente

| Capa | Estado de diseño | Implementación | Consumidor |
|---|---|---|---|
| **Memory** (ADR-010) | 🟡 Implementado parcialmente. 14 invariantes (M-1 a M-14). Feature flag `COGNITIVE_MEMORY_ENABLED` (default false). Integración en lead.service.ts capturando ShadowResult. | 🟡 **IM-1** — 7 archivos en `src/lib/memory/`, 45 tests, Build ✅, Contratos ✅ | Futuro: Pattern Discovery |
| **Pattern Discovery** (PR-7) | 🟡 Implementado parcialmente. Detector, repositorio SQLite, evaluador de acceptance contract. Modelo matemático cerrado (PR-7A+7B+7C). Feature flag `PATTERN_DISCOVERY_ENABLED` (default false). | 🟡 **PD-IM-1** — 12 archivos en `src/lib/pattern-discovery/`, ⚠️ Bug en `repository.ts` (parseo `acceptance_json` incorrecto) — NO ACTIVAR | No definido (consumidores eliminados) |

### 7.2 Capas congeladas

| Capa | Freeze desde | Documento |
|---|---|---|
| **Evidence Engine** | PR-3E (2026-07-13) | ADR-009 |
| **Conversational Decision Architecture** | R5 (2026-07-13) | ADR-008 |

### 7.3 Capas que nunca comenzaron

| Capa | Estado | Causa |
|---|---|---|
| **Memory** | 🟡 Implementado parcialmente (IM-1) | 7 archivos, 45 tests, feature flag COGNITIVE_MEMORY_ENABLED=false |
| **Pattern Discovery** | 🟡 Implementado parcialmente (PD-IM-1) | 12 archivos, ⚠️ bug conocido, PATTERN_DISCOVERY_ENABLED=false |
| **API cognitiva** | ⏳ Sin comenzar | Depende de Pattern Discovery |

---

## 8. Decisiones irreversibles

Estas decisiones arquitectónicas están consolidadas y no se revertirán sin un ADR con evidencia.

| Decisión | Documento | Fecha | Naturaleza |
|---|---|---|---|
| **Reflection eliminado como capa independiente** | ADR-011, PR-6A…PR-6F | 2026-07-13 | Eliminación arquitectónica |
| **Pattern Discovery reemplaza el Learning cognitivo** | PR-7A…PR-7G, PR-11A | 2026-07-13 | Renombre semántico |
| **Operational Learning permanece vigente** | ADR-003, PR-7E | 2026-07-13 | Confirmación de existencia |
| **Goals eliminado como capa cognitiva** | PR-8A…PR-8G | 2026-07-13 | Eliminación arquitectónica |
| **Planning eliminado como capa cognitiva** | PR-9A…PR-9G | 2026-07-13 | Eliminación arquitectónica |
| **Boundary eliminado como entidad** | PR-10A…PR-10F | 2026-07-13 | Eliminación arquitectónica |
| **Memory permanece como diseño futuro** | ADR-010, PR-11A | 2026-07-13 | Congelamiento de diseño |
| **EE permanece congelado** | ADR-009, PR-3E | 2026-07-13 | Freeze arquitectónico |
| **Conversational Decision Architecture congelada** | ADR-008 | 2026-07-13 | Freeze arquitectónico |
| **Pipeline cognitivo final: EE → Memory → Pattern Discovery** | PR-11 | 2026-07-13 | Documentación del pipeline futuro |
| **Nombre compartido "Learning" resuelto: cognitivo→Pattern Discovery, operacional preservado** | PR-11A | 2026-07-13 | Renombre documental |
| **Documentación separada en presente/futuro** | PR-11A, PR-11B | 2026-07-14 | Alineamiento documental |
| **Cognitive Escalation Principle** | ADR-012 | 2026-07-15 | Modelo oficial de inteligencia: BKE → DRL → Groq → Gemini |

---

## 9. Arquitectura futura (sin implementar)

### 9.1 Pipeline cognitivo futuro

```
EE (existe) → Memory (IM-1 🟡 implementado parcialmente) → Pattern Discovery (0%)
```

### 9.2 Componentes que aún no existen

| Componente | Dependencia | Prioridad | Nota |
|---|---|---|---|
| `src/lib/memory/` (7 archivos) | EE (existe) | 🟡 IM-1 (2026-07-14) | 14 invariantes. 45 tests. Build ✅, Contratos ✅. COGNITIVE_MEMORY_ENABLED=false. |
| `src/lib/pattern-discovery/` (12 archivos) | Memory | 🟡 PD-IM-1 (2026-07-16) | ⚠️ Bug en repository.ts (parseo acceptance_json). PATTERN_DISCOVERY_ENABLED=false. NO ACTIVAR. |
| `COGNITIVE_MEMORY_ENABLED` feature flag | Memory | 🟡 IM-1 (2026-07-14) | Implementado. Default false. Mismo patrón Shadow Mode. |
| API `getPatterns()` | Pattern Discovery | ⏳ Pospuesta | Consumidor no definido |
| Memory → Pattern Discovery contract | Ambos | ⏳ Pospuesta | Definido en PR-7D |

### 9.3 Estado de implementación

1. **Memory (IM-1):** ✅ Implementada (2026-07-14). 7 archivos en `src/lib/memory/`. Feature flag `COGNITIVE_MEMORY_ENABLED=false`.
2. **Pattern Discovery (PD-IM-1):** 🟡 Implementada (2026-07-16). 12 archivos en `src/lib/pattern-discovery/`. Feature flag `PATTERN_DISCOVERY_ENABLED=false`. ⚠️ Bug en `repository.ts` — NO ACTIVAR en staging.
3. **Pipeline cognitivo completo (EE → Memory → PD):** 🟡 Parcial (EE ✅, Memory 🟡, PD 🟡 con bug conocido).

---

## 10. Riesgos abiertos

### 10.1 Riesgos activos (reales, documentados)

| ID | Riesgo | Severidad | Fuente | Mitigación |
|---|---|---|---|---|
| **R1** | ShadowResult capturado condicionalmente — solo cuando COGNITIVE_MEMORY_ENABLED=true | 🟡 MEDIA | IM-1 | ShadowResult se captura cuando EVIDENCE_SHADOW_MODE=true y se persiste cuando COGNITIVE_MEMORY_ENABLED=true. Por defecto sigue descartado. |
| **R2** | Memory implementada parcialmente (IM-1) — Pattern Discovery puede diseñarse contra interfaz real | 🟢 BAJA | ARCHITECTURE_MILESTONE_v3.0 R4 | Memory existe como storage. PD puede comenzar diseño contra interfaz real. |
| **R3** | Coexistencia Operational Learning / Pattern Discovery — riesgo de confusión ontológica | ALTA | PR-7E, PR-11 D7 | Resuelto por PR-11A (renombre documental). Vigilar en código futuro. |
| **R4** | 1 test pre-existing failure (fase-22 T2, no relacionado) | MEDIA | PROJECT_BOARD, ROADMAP | P1-04 pendiente de decisión de producto. |
| **R5** | 4 P0 bloquean piloto (API key + SENTRY_DSN + seed choferes + CREATE TABLE) | ALTA | PROJECT_BOARD P0-01..P0-04 | Tareas en READY, requieren ejecución. |
| **R6** | Operational Learning no tiene contratos formales | MEDIA | ADR-003 | Clasificación C en PR-11 (existe en código, no como capa cognitiva). Formalizar en futuro PR. |
| **R7** | 8/14 invariantes de Memory no verificables sin código | MEDIA | PR-11 D6, ADR-010 | Aceptado como diseño conceptual. Se verificarán al implementar. |
| **R8** | Goals/Planning eliminadas como capas, pero sus funciones persisten sin modelar en Operational Learning | MEDIA | S1A Hallazgo 4, PR-11 D8 | Riesgo latente. No requiere acción inmediata. |

### 10.2 Riesgos mitigados o cerrados

| ID | Riesgo | Resolución | Fuente |
|---|---|---|---|
| ~~R anterior~~ | Learning cognitivo confundido con operacional | ✅ PR-11A renombró cognitivo → Pattern Discovery | PR-7E, PR-11A |
| ~~R anterior~~ | Documentación describía futuro como presente | ✅ PR-11A/PR-11B separaron presente/futuro | PR-11, PR-11A |

---

## 11. Deuda técnica arquitectónica

### 11.1 Deuda documentada (21 items)

| ID | Tarea | Prioridad | Dominio | Fuente |
|---|---|---|---|---|
| P1-03 | Deshabilitar auto-insert de aliases con Levenshtein ≤3 | P1 | DB | P3 Audit |
| P1-04 | Cerrar fase-22 T2 (decisión de producto: preservar origin?) | P1 | Extraction | S0 |
| P1-05 | `placeIdCache` nunca se invalida — agregar TTL | P1 | Geo | P3 Audit |
| P1-06 | `is_principal2` nunca se escribe en código | P1 | DB | P3 Audit |
| P1-07 | Configurar LOG_LEVEL=info en Vercel | P1 | Ops | OPS1 |
| P1-08 | PAIR_BASE y CORRIDOR_PAIRS → migrar a tabla DB | P1 | Geo | P3 Audit |
| P1-09 | ENTITY_CATALOG → migrar a tabla DB | P1 | Extraction | P3 Audit |
| P2-01…P2-15 | Múltiples items | P2 | Varios | PROJECT_BOARD |
| P3-01…P3-09 | Múltiples items | P3 | Varios | PROJECT_BOARD |

**Deuda que BLOQUEA:**
- P1-01 (1 test fallando) — ver PROJECT_BOARD
- DEBT-02 (survey→lead acoplamiento)
- DEBT-06 (i18n incompleto)
- DEBT-09 (DB audit)
- I1.2 (updateTripTariff)

### 11.2 Violaciones arquitectónicas conocidas

| Violación | Severidad | Ubicación | ADR |
|---|---|---|---|
| Learning bypasses DB facade | MEDIA | `db/domains/learning.ts` → consumo directo | ADR-002 |
| response-builder importa de learning | MEDIA | `ai/response-builder.ts` → `OpportunityResult` | ADR-004 |
| 3 dependencias circulares | ALTA | Detectado en baseline | ADR-001 |
| 4 violaciones de capa | MEDIA | Detectado en baseline | ADR-001 |
| 8 archivos huérfanos | BAJA | Detectado en baseline | — |
| 11 archivos >300 líneas | MEDIA | `lead.service.ts`, `policy-reserva.ts`, `extraction-runner.ts`, etc. | ADR-004 |

---

## 12. Inventario completo de documentos

### 12.1 ADRs

| Documento | Estado | Clasificación |
|---|---|---|
| `docs/adr/001-layered-architecture.md` | ✅ Vigente | PRESENTE |
| `docs/adr/002-database-facade.md` | ✅ Vigente | PRESENTE |
| `docs/adr/003-learning-domain.md` | ✅ Vigente | PRESENTE |
| `docs/adr/004-service-boundaries.md` | ✅ Vigente | PRESENTE |
| `docs/adr/005-ai-first-interpretation.md` | ✅ Vigente | PRESENTE |
| `docs/adr/006-schema-parity.md` | ✅ Vigente | PRESENTE |
| `docs/adr/007-conversation-interpreter.md` | ✅ Vigente | PRESENTE |
| `docs/adr/008-conversational-decision-architecture.md` | ✅ Vigente (frozen) | PRESENTE |
| `docs/adr/009-evidence-engine-architecture.md` | ✅ Vigente (frozen) | PRESENTE |
| `docs/adr/010-memory-architecture.md` | ✅ Vigente | FUTURO ⏳ |
| `docs/adr/011-reflection-elimination.md` | ✅ Vigente | HISTÓRICO / FUTURO |
| `docs/adr/012-cognitive-escalation-principle.md` | ✅ Vigente | PRESENTE (decisión) + FUTURO (implementación) |

### 12.2 Documentos arquitectónicos clave

| Documento | Estado | Clasificación |
|---|---|---|
| `docs/architecture/ARCHITECTURE_STATUS.md` | ✅ **Vigente (este documento)** | PRESENTE / FUTURO |
| `docs/architecture/ARCHITECTURE_MILESTONE_v2.0.md` | 📜 Histórico | HISTÓRICO |
| `docs/architecture/ARCHITECTURE_MILESTONE_v3.0.md` | ✅ Vigente | PRESENTE / FUTURO (PR-11A actualizado) |
| `docs/architecture/ADR_INDEX.md` | ✅ Vigente | PRESENTE |
| `docs/architecture/ARCHITECTURE_BASELINE.md` | ✅ Vigente (snapshot 2026-07-06) | PRESENTE |
| `docs/architecture/ARCHITECTURE_ATLAS.md` | ✅ Vigente | PRESENTE |
| `docs/architecture/system-map.md` | ✅ Vigente | PRESENTE |
| `docs/architecture/capability-map.md` | ✅ Vigente | PRESENTE |
| `docs/architecture/GOVERNANCE.md` | ✅ Vigente | PRESENTE |
| `docs/architecture/maturity-model.md` | ✅ Vigente | PRESENTE |
| `docs/architecture/PR-11_COGNITIVE_REALITY_ALIGNMENT.md` | ✅ Vigente | HISTÓRICO (PR-11) |
| `docs/ROADMAP.md` | ✅ Vigente | PRESENTE / FUTURO |
| `docs/architecture/CE-1_COGNITIVE_EFFICIENCY_AUDIT.md` | ✅ Vigente | PRESENTE (baseline) |
| `docs/architecture/CE-2_INEVITABILITY_CLASSIFICATION.md` | ✅ Vigente | PRESENTE (clasificación) |
| `docs/architecture/CE-3A_BUSINESS_KNOWLEDGE_ENGINE.md` | ✅ Vigente | FUTURO (diseño) |
| `docs/architecture/CE-3B_DETERMINISTIC_REASONING_LAYER.md` | ✅ Vigente | FUTURO (diseño) |
| `docs/architecture/CE-4_MIGRATION_ROADMAP.md` | ✅ Vigente | FUTURO (plan) |
| `docs/SYSTEM_BIBLE.md` | ✅ Vigente | PRESENTE |

### 12.3 PR series — auditorías conceptuales

| Documento | Estado | Clasificación |
|---|---|---|
| `PR-7A_LEARNING_ONTOLOGY_AUDIT.md` | ✅ Vigente (PR-11A corregido) | DISEÑO FUTURO |
| `PR-7B_LEARNING_MATHEMATICAL_MODEL.md` | ✅ Vigente (PR-11A corregido) | DISEÑO FUTURO |
| `PR-7C_LEARNING_PARAMETER_SPACE_AND_EVIDENCE.md` | ✅ Vigente (PR-11A corregido) | DISEÑO FUTURO |
| `PR-7D_LEARNING_CONTRACT_DERIVATION.md` | ✅ Vigente (PR-11A corregido) | DISEÑO FUTURO |
| `PR-7E_LEARNING_IDENTITY_AUDIT.md` | ✅ Vigente (PR-11A corregido) | DISEÑO FUTURO + PRESENTE |
| `PR-7F_LEARNING_MINIMALITY_AUDIT.md` | ✅ Vigente (PR-11A corregido) | DISEÑO FUTURO |
| `PR-7G_PATTERN_SEMANTICS_AUDIT.md` | ✅ Vigente (PR-11A corregido) | DISEÑO FUTURO |
| `PR-8A…PR-8G_GOALS_*` | 🗃️ Archivo | HISTÓRICO (capa eliminada) |
| `PR-9A…PR-9G_PLANNING_*` | 🗃️ Archivo | HISTÓRICO (capa eliminada) |
| `PR-10A…PR-10F_BOUNDARY_*` | 🗃️ Archivo | HISTÓRICO (entidad eliminada) |
| `S1A_GLOBAL_IRREDUCIBILITY_AUDIT.md` | ✅ Vigente | HISTÓRICO (hallazgo raíz) |

### 12.4 Documentos de proyecto

| Documento | Estado |
|---|---|
| `docs/project/PROJECT_BOARD.md` | ✅ Vigente (actualizado 2026-07-16) |
| `docs/project/CHANGELOG.md` | ✅ Vigente |
| `docs/project/HUMAN_EXPERIENCE_CHARTER.md` | ✅ Vigente |
| `docs/project/PROJECT_GOVERNANCE.md` | ✅ Vigente |
| `docs/project/PROJECT_WORKFLOW.md` | ✅ Vigente |
| `docs/project/PILOT_METRICS.md` | ✅ Vigente |
| `docs/project/LEARNING_LOOP.md` | ✅ Vigente |
| `docs/project/CONVERSATION_IMPROVEMENT_PROCESS.md` | ✅ Vigente |

### 12.5 Certificaciones (60 archivos)

| Rango | Clasificación |
|---|---|
| `docs/certification/` (60 archivos) | 🗃️ Archivo histórico — certificaciones puntuales (QA, audits, hardening, releases) |
| `docs/certification/TECHNICAL_DEBT_BASELINE.md` | ✅ Vigente (referencia activa de deuda, actualizado H0A) |
| `docs/certification/ONTOLOGY.md` | ✅ Vigente (ontología del sistema) |
| `docs/certification/H0A_STAGING_HARDENING_AUDIT.md` | ✅ Vigente (2026-07-16, 7 áreas auditadas) |

### 12.6 Otros documentos

| Documento | Estado |
|---|---|
| `docs/ai/` | ✅ Vigente |
| `docs/knowledge/` | ✅ Vigente |
| `docs/operations/` | ✅ Vigente |
| `docs/security/` | ✅ Vigente |
| `docs/history/` | 🗃️ Archivo histórico (propuestas, síntesis, skills) |
| `ael/constitution/SPEC.md` | ✅ Vigente |
| `ael/constitution/CONTRACTS.md` | ✅ Vigente |
| `ael/government/ORGANIZATION.md` | ✅ Vigente |
| `ael/government/roles/` | ✅ Vigente |

---

## 13. Estado del roadmap

### 13.1 Fases

| Fase | Estado | Duración estimada |
|---|---|---|
| **Architecture & Stabilization** | ✅ CERRADA | Completada |
| **Staging Hardening** | 🟡 **ACTIVA** (post-RRR-1) | 1 sem (Fase 0) |
| **Human Experience & Pilot Optimization** | ⏳ Pendiente (post-Staging Hardening) | 1-2 sem (Fase 1) |
| Fase 2: Refactorización Arquitectónica | ⏳ Pendiente | 2-4 sem |
| Fase 3: Calidad y Experiencia | ⏳ Pendiente | 3-6 sem |
| Fase 4: Observabilidad | ⏳ Pendiente | 4-8 sem |
| Fase 5: Escalabilidad (condicional) | ⏳ Pendiente | futuro |

### 13.2 Dominios en evolución

| Dominio | Fase actual | Próximo |
|---|---|---|
| Lead Service | Fase 2 — Split god orchestrator | — |
| Extraction | Fase 2 — Unificar corrección de slots | — |
| Learning (operacional) | Fase 3 — Formalizar feedback loop | — |
| Survey, Admin | Fase 3 — Cobertura de tests | — |
| I18n, Observability | Fase 4 | — |

### 13.3 Architecture Freeze activo (desde R5)

- NO agregar nuevos tipos/interfaces/campos entre capas sin ADR
- NO crear nuevos puntos de lectura de señales originales sin pasar por StrategyDecision
- NO introducir nuevos patrones de fallback híbrido
- NO modificar firmas de funciones públicas en `types.ts` sin ADR

### 13.4 Evidence Engine Freeze (desde PR-3E)

- `src/lib/evidence/` completo congelado (Signal→Decision)
- Builders, Shadow mode, errores, API pública congelados
- Precondición para nuevas capas: ADR con especificación completa

### 13.5 Dominios congelados (NO se tocan)

Pricing, Geo, Dispatch, CORE, Policy (Reserva/Ahora), **Evidence Engine**

---

## 14. Estado de cada milestone

| Milestone | Estado | Fecha | Documento principal |
|---|---|---|---|
| **RC1** — Release Candidate | ✅ COMPLETED | 2026-07-08 | `c09a2c7` |
| **G1** — Stabilization Milestone | ✅ COMPLETED | 2026-07-08 | `08ce37e` |
| **QA1** — Functional Certification | ✅ COMPLETED | 2026-07-08 | `docs/certification/QA1_FUNCTIONAL_CERTIFICATION.md` |
| **OPS1** — Production Readiness | 🟡 BLOQUEADO (4 P0) | 2026-07-08 | `docs/certification/RELEASE_READINESS.md` |
| **RC2** — Conversation Interpreter | ✅ COMPLETED | 2026-07-08 | `3080686` |
| **R5 Phase 2** — StrategyDecision Activation | ✅ COMPLETED | 2026-07-13 | ADR-008 |
| **Architecture Milestone v2.0** | ✅ COMPLETED | 2026-07-13 | `ARCHITECTURE_MILESTONE_v2.0.md` |
| **PR-3E** — Evidence Engine Architecture Freeze | ✅ COMPLETED | 2026-07-13 | ADR-009 |
| **PR-5A+B+C** — Memory Architectural Design | ✅ COMPLETED | 2026-07-13 | ADR-010 |
| **PR-6A…G** — Reflection Elimination | ✅ COMPLETED | 2026-07-13 | ADR-011 |
| **Architecture Milestone v3.0** | ✅ COMPLETED | 2026-07-13 | `ARCHITECTURE_MILESTONE_v3.0.md` |
| **PR-7A…G** — Pattern Discovery Design | ✅ COMPLETED | 2026-07-13 | 7 documentos PR-7 |
| **PR-8A…G** — Goals Elimination | ✅ COMPLETED | 2026-07-13 | 7 documentos PR-8 |
| **PR-9A…G** — Planning Elimination | ✅ COMPLETED | 2026-07-13 | 7 documentos PR-9 |
| **PR-10A…F** — Boundary Elimination | ✅ COMPLETED | 2026-07-13 | 6 documentos PR-10 |
| **S1A** — Global Irreducibility Audit | ✅ COMPLETED | 2026-07-13 | `S1A_GLOBAL_IRREDUCIBILITY_AUDIT.md` |
| **PR-11** — Cognitive Reality Alignment | ✅ COMPLETED | 2026-07-13 | `PR-11_COGNITIVE_REALITY_ALIGNMENT.md` |
| **PR-11A** — Documentary Realignment | ✅ COMPLETED | 2026-07-13 | Corrección de ADR-010, ADR-011, ROADMAP, PR-7A…G |
| **PR-11B** — Architecture Status Audit | ✅ COMPLETED | 2026-07-14 | **Este documento** |
| **RRR-1** — Release Readiness Review | ✅ COMPLETED | 2026-07-16 | Verdict: 🟡 READY FOR STAGING WITH CONDITIONS. Build ✅, Tests 1653/1657 ✅, Contratos ✅. |
| **PR-H0A** — Staging Hardening Audit | ✅ COMPLETED | 2026-07-16 | 7 áreas auditadas. 4 hallazgos bloquean staging. `docs/certification/H0A_STAGING_HARDENING_AUDIT.md` |

---

## 15. Glosario de estados

Para evitar ambigüedad, estos son los significados exactos de cada clasificación temporal usada en este documento:

| Término | Significado |
|---|---|
| **PRESENTE** | El componente existe en el código fuente actual. Puede tener gaps documentados. |
| **FUTURO ⏳** | El componente NO existe como código. Existe solo como diseño conceptual en documentos. |
| **HISTÓRICO** | El componente existió o fue considerado. Está documentado para trazabilidad. No existe ni existirá en su forma original. |
| **LEGADO** | El componente existe pero está en desuso. Será eliminado o reemplazado. |

---

*Fin de ARCHITECTURE_STATUS.md — Actualizado por PR-H0A (Staging Hardening Audit)*
