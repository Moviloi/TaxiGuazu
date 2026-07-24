# PROJECT CONTEXT — AITOS

> Estado vigente condensado del proyecto. Lectura única para que PLAN/SDL comprenda el estado global sin necesidad de inspeccionar múltiples documentos.
>
> **Este documento NO reemplaza ADR, SPEC, RF, RNF, Baseline, Architecture, Knowledge ni Changelog. Lo condensa para referencia rápida.**
>
> **Actualizado:** 2026-07-22 | **Última misión:** AITOS POST-ARNÉS AUDIT — Fase 0 Limpieza de contexto

---

## 1. Identidad del proyecto

| Atributo | Valor |
|----------|-------|
| **Nombre** | AITOS — TaxiGuazú Conversational System |
| **Stack** | Next.js 15 + TypeScript + Turso (libSQL) |
| **Propósito** | Chatbot conversacional para reserva de taxis vía WhatsApp |
| **Canales** | WhatsApp Cloud API (único canal en producción) |
| **Modelo de inteligencia** | Cognitive Escalation Principle (ADR-012). Implementación BKE/DRL removida por ADR-014. Futuras capas determinísticas sujetas a evaluación post-v1. |
| **Estado del deploy** | LOCALHOST (staging bloqueado por 4 P0, ver §9) |
| **Arquitectura** | Layered (ADR-001), 2 capas de ecosistema: PLAN (estratégico, visible) → BUILD (operacional, visible). SDL y AEL son implementaciones internas. |

---

## 2. Estado actual

| Indicador | Valor |
|-----------|-------|
| **Build** | ✅ PASS (~40s compile, 7/7 static pages) |
| **Contracts R1-R4** | ✅ PASS (enforce.sh) |
| **Tests** | 🟡 1653/1657 PASS (4 pre-existing: T1 LLM timeout, T2 Vitest mock compat, T3 DRL geo assertion regresión, T4 memory-integration timeout — ver PRD-04) |
| **Deuda resuelta** | 19 items (P0+P1) |
| **Deuda pendiente** | 21 items (5 P1, 10 P2, 6 P3) + 10 H0A (4 bloquean) |
| **ADRs** | 14 vigentes (001–014), todos ACCEPTED. ADR-014 eliminó BKE/DRL/Pattern Discovery (~5800 líneas). |
| **Architecture Freeze** | V3 activo (ADR-008, ADR-009, ADR-012, ADR-013) |
| **Fase del roadmap** | Fase 0: Staging Readiness — desbloqueo y estabilización |
| **Piloto** | 🟡 BLOQUEADO (P0-01 a P0-04 pendientes) |

### 2.1 Pipeline real del sistema

```
Webhook → CORE → Conversation Interpreter → StrategyDecision → Policies → LLM → Response
                                                                               ↓
                                                                   Evidence Engine (Shadow Mode)
                                                                               ↓
                                                         Memory (IM-1, COGNITIVE_MEMORY_ENABLED=false)
```

El pipeline cognitivo post-EE (Memory → Pattern Discovery) no está activo. ShadowResult se descarta por defecto.

---

## 3. Objetivo vigente

**Preparar el sistema certificado (Architecture Freeze V3, Serie CE, CDA) para despliegue progresivo en staging y posterior piloto con usuarios reales.**

Objetivos específicos:
1. Cerrar condiciones identificadas en RRR-1.
2. Resolver bloqueos P0 que impiden staging.
3. Implementar correcciones de conformidad con CDA (QA-3 Sprint 3).
4. Alcanzar certificación funcional (CAT-1 a CAT-10).
5. Iniciar piloto controlado.

---

## 4. Misión activa

**AITOS POST-ARNÉS AUDIT — Fase 0: Limpieza de contexto.** Serie de correcciones rápidas para alinear documentación viva con el estado real del proyecto post-estabilización de ARNÉS Framework.

| Misión | Descripción | Estado |
|--------|-------------|--------|
| DOC-01 a DOC-06 | Auditoría documental completa del ecosistema | ✅ COMPLETED (2026-07-22) |
| BUILD-AUDIT-1 | Auditoría sistémica + higiene de código | ✅ COMPLETED (2026-07-20) |
| QA-3 Sprint 3 | CDA Conformance Implementation | ✅ COMPLETED (BUILD-AUDIT-1) |
| P1 Fixes FASE 2 | P1-03/05/08/09 cerrados | ✅ COMPLETED |
| KNOWLEDGE_INVENTORY | SSOT Enrichment D2/D4 | ✅ COMPLETED |
| ARNÉS Framework v1.1.0 | Certificación y maintenance mode | ✅ COMPLETED |
| AITOS POST-ARNÉS AUDIT | Auditoría de alineación constitucional | ⏳ FASE 0 — Limpieza de contexto |

### 4.1 Pendientes inmediatos (Staging Readiness)

| ID | Tarea | Prioridad | Estado |
|----|-------|-----------|--------|
| P0-02 | Configurar SENTRY_DSN en Vercel | P0 | READY — bloquea piloto |
| PRD-03 | Completar .env.example (flags shadow mode) | P0 | READY — bloquea staging |
| PRD-04 | Estabilizar 4 tests fallidos (T1-T4) | P0 | READY — bloquea staging |
| P1-04 | Cerrar fase-22 T2: ADR sobre preservar origin | P1 | ADR_PENDING |
| P1-06 | is_principal2: implementar write o eliminar | P1 | PARTIAL |

---

## 5. Baseline actual

| Documento | Fecha | Estado |
|-----------|-------|--------|
| **Conversational Decision Algorithm (CDA)** | 2026-07-17 | ✅ CERTIFIED (ADR-013) |
| **Architecture Freeze V3** | 2026-07-16 | ✅ ACTIVO |
| **Cognitive Escalation Principle (ADR-012)** | 2026-07-15 | ✅ ACEPTADO |
| **Evidence Engine Freeze (ADR-009)** | 2026-07-13 | ✅ ACTIVO |
| **Conversational Decision Freeze (ADR-008)** | 2026-07-13 | ✅ ACTIVO |
| **ARCHITECTURE_BASELINE** (snapshot) | 2026-07-06 | ✅ Vigente |
| **TECHNICAL_DEBT_BASELINE** | 2026-07-08 | ✅ Vigente (revisado 2026-07-17) |
| **Strategic vs Operational Contract** | 2026-07-19 | ✅ Vigente |
| **Mission Phase Architecture** | 2026-07-19 | ✅ Vigente |
| **Mission Closure Contract** | 2026-07-19 | ✅ Vigente |

---

## 6. Estado arquitectónico

### 6.1 Capas del sistema

| Capa | Estado | Documento |
|------|--------|-----------|
| **PLAN** (Strategic Director) | ✅ Visible, solo planificación | `.opencode/agents/plan.md` |
| **BUILD** (ARNÉS Director) | ✅ Visible, solo ejecución | `.opencode/agents/build.md` |
| **SDL** (implementación PLAN) | 🔒 Interno | Contrato SDL |
| **AEL** (implementación BUILD) | 🔒 Interno | SPEC, CONTRATS, ORGANIZATION |
| **Pipeline conversacional** | ✅ Implementado | Código fuente |
| **Evidence Engine** | 🔒 Freeze (ADR-009) | `src/lib/evidence/` (20 archivos, 378 tests) |
| **Memory** (cognitiva) | 🟡 IM-1 parcial (7 archivos, flag false) | ADR-010 |
| **Pattern Discovery** | 🟡 Concepto futuro post-v1 | PR-7, ADR-014 |
| **Operational Learning** | ✅ Implementado (15 archivos) | ADR-003 |

### 6.2 Capas eliminadas

| Capa | Eliminada en |
|------|-------------|
| BKE (código) | ADR-014 (principio preservado como diseño conceptual en ADR-012) |
| DRL (código) | ADR-014 (principio preservado como diseño conceptual en ADR-012) |
| Reflection | ADR-011, PR-6 |
| Goals (cognitivo) | PR-8 |
| Planning (cognitivo) | PR-9 |
| Boundary | PR-10 |

### 6.3 Interface Freeze V2 (PR-INTERFACE-FREEZE-1)

- Solo **PLAN** y **BUILD** son interfaces visibles.
- SDL es implementación interna de PLAN.
- AEL es implementación interna de BUILD.
- 6 subagentes `ael-*` preservados como capacidades de BUILD.

### 6.4 Contrato PLAN ↔ BUILD (PR-SDL-AEL-CONTRACT-1)

| | PLAN | BUILD |
|---|------|-------|
| **Consume** | Conocimiento (documentación, reports, memoria) | Decisiones (Execution Plan) |
| **Produce** | Decisiones (Recommendation, EP, Status) | Evidencia (Execution Report) |
| **Nunca** | Inspecciona código, audita, ejecuta herramientas | Planifica, redefine objetivos, produce EP |

---

## 7. RF conocidos

Basados en `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` y el CDA (ADR-013):

| ID | RF | Estado | Última validación |
|----|----|--------|-------------------|
| **RF-01** | Recepción de mensajes | ✅ Implementado | — |
| **RF-02** | Clasificación de intención (12 intents) | ✅ Implementado | CAT-1 (S1, S6, S12) ✅ |
| **RF-03** | Extracción de slots progresiva | ✅ Implementado | CAT-1 (S8) ✅ |
| **RF-04** | Resolución geográfica | ✅ Implementado | CAT-1 (S11) ✅ |
| **RF-05** | Cotización de tarifas | ✅ Implementado | CAT-1 (S4) ✅ |
| **RF-06** | Despacho a conductores | ✅ Implementado | — |
| **RF-07** | Confirmación de usuario | ✅ Implementado | CAT-1 (S8) 🟡 PARCIAL |
| **RF-08** | Gestión de ambigüedad geográfica | ✅ Implementado | CAT-1 (S3, S9, S13) 🟡 PARCIAL |
| **RF-09** | Actualización incremental de slots | ✅ Implementado | CAT-1 (S2, S5) 🟡 PARCIAL |
| **RF-10** | Post-venta (encuesta) | ✅ Implementado | — |

### 7.1 Desviaciones funcionales abiertas

| ID | Descripción | RF violado | Prioridad |
|----|-------------|------------|-----------|
| **F01-DG** | Ambiguity se activa sin verificar clarify_field | RF-08, CDA §6 | P0 |
| **F02-DG** | Intención no preservada al cambiar de BOOKING a CONSULTA | RF-09, CDA §7 | P0 |
| **F03-DG** | Merge de contexto no ejecutado cuando hay ambigüedad | CDA §2 paso 7 | P0 |
| **H-CAT2-001** | RECOVERY state pierde slots confirmados | RF-09 | P1 |

---

## 8. RNF conocidos

| ID | RNF | Estado |
|----|-----|--------|
| **RNF-01** | Determinismo del núcleo (CORE sin LLM) | ✅ Implementado |
| **RNF-02** | LLM opcional (Cognitive Escalation Principle) | 🟡 Diferido — flags BKE/DRL deprecadas por ADR-014. Principio a re-evaluar post-v1. |
| **RNF-03** | Triple fallback (cognitivo → LLM → Plantilla) | 🟡 Diferido — implementación BKE/DRL removida por ADR-014. |
| **RNF-04** | Phone como identidad de conversación | ✅ Implementado |
| **RNF-05** | Sin escritura directa desde AI (solo policies) | ✅ Implementado |
| **RNF-06** | Idempotencia en webhook | ✅ Implementado |
| **RNF-07** | Tiempo de respuesta (<5000ms) | 🟡 Parcial (timeouts LLM conocidos) |
| **RNF-08** | Política antes de output | ✅ Implementado |
| **RNF-09** | Schema Parity (schema.sql como SSOT) | ✅ Implementado |

---

## 9. Riesgos

| ID | Riesgo | Severidad | Estado |
|----|--------|-----------|--------|
| **R1** | ShadowResult descartado por defecto — Memory no recibe datos | 🟡 MEDIA | Aceptado (flag false) |
| **R2** | 4 P0 bloquean piloto (API key, SENTRY_DSN, seed choferes, CREATE TABLE) | 🔴 ALTA | Tareas en READY, sin ejecutar |
| **R3** | 1 test pre-existing failure (fase-22 T2) bloquea CI/CD 100% verde | 🟡 MEDIA | P1-04 pendiente de decisión |
| **R4** | Pattern Discovery bug (repository.ts) — runtime error si se activa | 🔴 ALTA | NO ACTIVAR (flag false) |
| **R5** | Coexistencia Operational Learning / Pattern Discovery — confusión ontológica | 🟡 MEDIA | Mitigado por PR-11A |
| **R6** | Operational Learning sin contratos formales | 🟡 MEDIA | Futura formalización |
| **R7** | Goals/Planning eliminadas, funciones persisten en Operational Learning | 🟡 MEDIA | Riesgo latente |

---

## 10. Deuda técnica

### 10.1 Bloqueante (P0, impide staging/piloto)

| ID | Descripción | Dominio |
|----|-------------|---------|
| P0-01 | Rotar ADMIN_API_KEY (expuesta en chat) | Ops |
| P0-02 | Configurar SENTRY_DSN en Vercel | Ops |
| P0-03 | `connection_cache` sin CREATE TABLE — riesgo runtime error | DB |
| P0-04 | Seed de choferes reales en Turso | Ops |

### 10.2 Funcional (P0, desviaciones CDA)

| ID | Descripción | Dominio |
|----|-------------|---------|
| F01-DG | Ambiguity sin verificar clarify_field (QA3-S3-01) | Pipeline |
| F02-DG | Intención no preservada (QA3-S3-02) | Pipeline |
| F03-DG | Merge bypass por ambigüedad (QA3-S3-03) | Pipeline |
| H-CAT2-001 | RECOVERY slot loss (QA3-S3-05) | Pipeline |

### 10.3 Estructural (P1-P3)

| Prioridad | Items | Dominios |
|-----------|-------|----------|
| **P1** (5) | P1-03 a P1-09 | DB, Geo, Extraction, Ops |
| **P2** (10) | DEBT-04 a DEBT-11, GAPs, Pricing dual engine | DB, Lead, I18n, Pricing |
| **P3** (6) | Hotspots >400L, cobertura tests, zombie columns | Varios |

### 10.4 H0A (Staging Hardening Audit)

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| H0A-01 | 11 feature flags sin documentar en `.env.example` | **P0 (BLOQUEA STAGING)** |
| H0A-02 | 4 tests fallando | **P0 (BLOQUEA STAGING)** |
| H0A-04 | ADMIN_API_KEY expuesta | **P0 (BLOQUEA PILOTO)** |
| H0A-03 | Sin middleware centralizado | DIFERIDO Post-v1 |
| H0A-05 | 3 shadow flags sin función wrapper | P2 |
| H0A-06 | SENTRY_DSN no configurado | P1 |
| H0A-07 | Memory no conectada al pipeline | P2 |
| H0A-08 | Pattern Discovery bug | P1 |
| H0A-09 | LOG_LEVEL no configurado | P2 |
| H0A-10 | Pre-commit hooks no activos | P3 |

---

## 11. Incidentes abiertos

| ID | Descripción | Estado | Documento |
|----|-------------|--------|-----------|
| **H-CAT2-001** | RECOVERY state pierde slots confirmados al entrar en score 0.40–0.64, repitiendo preguntas ya respondidas. Violación de RF-09 y 8 reglas del CDA. | **OPEN** | `docs/incidents/H-CAT2-001_RECOVERY_SLOT_LOSS.md` |
| **CAT-2 Report** | 6/6 PASS funcionales pero 3 hallazgos documentados. H-CAT2-001 abierto. CAT-2 en estado CONDITIONAL. | **CONDITIONAL** | `docs/incidents/CAT2_RESULT_REPORT.md` |

### 11.1 Incidentes cerrados

| ID | Descripción | Resolución |
|----|-------------|------------|
| **INC-001** | Build failure por preview config drift (env vars faltantes) | Configuration drift corregido. No requirió cambios de código. |

---

## 12. Certificaciones

### 12.1 Estado general

| Artefacto | Estado | Observación |
|-----------|--------|-------------|
| **Arquitectura** (Freeze V3) | ✅ CERTIFIED | — |
| **ADRs** (001–013) | ✅ CERTIFIED | Todos ACCEPTED |
| **Conversation Decision Algorithm** | ✅ CERTIFIED | ADR-013 ratificado |
| **QA Governance** | ✅ CERTIFIED | Reglas formales |
| **Functional Behavior Specification** | 🟡 CONDITIONAL | 2 ambigüedades + 3 desviaciones pendientes |
| **CATS-1** (test suite invariante) | ✅ CERTIFIED | 26/26 tests PASS |
| **CAT-1** (aceptación externa) | 🟡 CONDITIONAL | 11/13 PASS, 2 timeouts, 3 hallazgos |
| **CAT-2** (persistencia contexto) | 🟡 CONDITIONAL | 6/6 PASS, H-CAT2-001 OPEN |
| **CAT-3 a CAT-10** | ⏳ NOT STARTED | Planificadas |

### 12.2 Milestones

| Milestone | Fecha | Estado |
|-----------|-------|--------|
| RC1 | 2026-07-08 | ✅ COMPLETED |
| Architecture Milestone v2.0 | 2026-07-13 | ✅ COMPLETED |
| PR-3E (EE Freeze) | 2026-07-13 | ✅ COMPLETED |
| Architecture Milestone v3.0 | 2026-07-13 | ✅ COMPLETED |
| RRR-1 | 2026-07-16 | 🟡 READY WITH CONDITIONS |
| PR-H0A (Staging Hardening) | 2026-07-16 | 🟡 4 BLOQUEOS |
| PR-CAT1 | 2026-07-17 | 🟡 ACEPTABLE CON HALLAZGOS |
| CDA Certification (ADR-013) | 2026-07-17 | ✅ CERTIFIED |
| QA-3 Sprint 1 (GREETING fix) | 2026-07-17 | ✅ COMPLETED |
| QA-3 Sprint 2A (Core fix) | 2026-07-17 | ✅ COMPLETED |
| QA-3 Sprint 2B (CDA design) | 2026-07-17 | ✅ COMPLETED |
| PR-INTERFACE-FREEZE-1 | 2026-07-19 | ✅ COMPLETED |
| PR-SDL-AEL-CONTRACT-1 | 2026-07-19 | ✅ COMPLETED |

---

## 13. Knowledge consolidado

### 13.1 Decisiones arquitectónicas clave

| Decisión | Documento | Fecha |
|----------|-----------|-------|
| Pipeline cognitivo final: EE → Memory → Pattern Discovery | PR-11 | 2026-07-13 |
| Reflection eliminado como capa | ADR-011 | 2026-07-13 |
| Learning operacional preservado; cognitivo renombrado a Pattern Discovery | PR-7E, PR-11A | 2026-07-13 |
| Goals/Planning eliminados como capas cognitivas | PR-8, PR-9 | 2026-07-13 |
| Solo PLAN y BUILD visibles (Interface Freeze V2) | INTERFACE_FREEZE_V2 | 2026-07-19 |
| PLAN consume conocimiento, produce decisiones; BUILD consume decisiones, produce evidencia | STRATEGIC_OPERATIONAL_CONTRACT | 2026-07-19 |
| Conversational Decision Algorithm como autoridad funcional normativa | ADR-013 | 2026-07-17 |
| Mission Closure: Learning solo después de declaración CLOSED de SDL | MISSION_CLOSURE_CONTRACT | 2026-07-19 |

### 13.2 Patrones del ecosistema

| Patrón | Descripción |
|--------|-------------|
| **PLAN → BUILD → ciclo** | Toda misión sigue el flujo PLAN produce EP → BUILD ejecuta → PLAN evalúa → ciclo hasta Mission Complete |
| **Execution Plan como único contrato** | BUILD solo recibe EP estructurado. No hay instrucciones informales. |
| **Execution Report como única respuesta** | BUILD solo produce ER. No hay recomendaciones estratégicas. |
| **No code changes without BUILD** | PLAN nunca escribe código. Toda modificación pasa por BUILD. |
| **Shadow Mode para nuevas capacidades** | Evidence Engine y Memory operan en shadow mode con flag false por defecto. |
| **Feature flags para capacidades cognitivas** | EVIDENCE_SHADOW_MODE, COGNITIVE_MEMORY_ENABLED, EVIDENCE_SHADOW_LOGGING — todas false por defecto. |
| **Architecture Freeze progresivo** | ADR-008 (R5), ADR-009 (PR-3E), ADR-012, ADR-013, ADR-014. Cada freeze es acumulativo. |
| **Capas eliminadas por ADR-014** | BKE, DRL, Pattern Discovery: código removido (~5800 líneas). Principios preservados como diseño conceptual. |

---

## 14. Próximo objetivo

**Desbloquear AITOS para staging.** Resolver los bloqueos operacionales pendientes: SENTRY_DSN, .env.example, estabilización de tests, y limpieza de documentación viva.

Pasos inmediatos (Fase 0 — BUILD directo):
1. Actualizar PROJECT_CONTEXT.md a estado actual. ✅ (esta misión)
2. Compactar PROJECT_BOARD.md (remover ruido REMOVED).
3. Documentar shadow flags activas en .env.example.

Próximas fases:
4. Configurar SENTRY_DSN en Vercel.
5. Estabilizar 4 tests (PRD-04).
6. Resolver P1-04 (ADR) y P1-06 (is_principal2).
7. Higiene: eliminar stubs BKE/DRL, dropear tablas dead.

---

## Reglas de mantenimiento

### Cuándo se actualiza este documento

Este documento se actualiza **al inicio de cada nueva misión de PLAN** y **al final de cada misión de BUILD** que modifique el estado del proyecto. Es responsabilidad de PLAN asegurar que PROJECT_CONTEXT.md refleje el estado actual antes de producir un nuevo Execution Plan.

### Qué dispara una actualización

- **Nueva misión**: PLAN verifica que PROJECT_CONTEXT.md está actualizado antes de planificar.
- **Tarea completada en BUILD**: PROJECT_BOARD actualizado → PROJECT_CONTEXT puede requerir actualización si cambia el estado general.
- **Nuevo ADR**: Agregar a §6 (estado arquitectónico) y §13 (knowledge).
- **Nuevo incidente**: Agregar a §11.
- **Nueva certificación**: Actualizar §12.
- **Cambio en deuda**: Actualizar §10.
- **Cambio en riesgo**: Actualizar §9.

### Qué NO se actualiza aquí

Este documento **no reemplaza** las fuentes de verdad:

| Información | Fuente de verdad |
|-------------|------------------|
| Detalle arquitectónico completo | `docs/architecture/ARCHITECTURE_STATUS.md` |
| Decisiones arquitectónicas detalladas | ADRs (001–013) |
| Roadmap completo | `docs/ROADMAP.md` |
| Deuda técnica detallada | `docs/certification/TECHNICAL_DEBT_BASELINE.md` |
| Tareas y prioridades | `docs/project/PROJECT_BOARD.md` |
| Historial de cambios | `docs/project/CHANGELOG.md` |
| RF/RNF detallados | `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` |
| Contratos arquitectónicos | `docs/architecture/MISSION_PHASE_ARCHITECTURE.md`, `docs/architecture/MISSION_CLOSURE_CONTRACT.md`, `docs/architecture/STRATEGIC_OPERATIONAL_CONTRACT.md`, `docs/architecture/INTERFACE_FREEZE_V2.md` |
| Certificaciones detalladas | `docs/certification/CERTIFICATION_REGISTRY.md` |

### Formato de actualización

Cada actualización debe:
1. Cambiar la fecha en el encabezado.
2. Indicar la misión que disparó la actualización.
3. Modificar solo las secciones afectadas.
4. No duplicar información de las fuentes de verdad — referenciarlas.

---

*Fin de PROJECT_CONTEXT.md — Creado en PR-SDL-4A (2026-07-19)*
