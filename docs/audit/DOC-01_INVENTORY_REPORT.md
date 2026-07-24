# DOC-01 INVENTORY REPORT

> **Misión:** DOC-01 — Inventario y clasificación documental  
> **Ejecutor:** BUILD (AEL)  
> **Fecha:** 2026-07-22  
> **Objetivo:** Auditar toda la documentación existente antes de realizar modificaciones  
> **Restricciones:** NO modificar, NO eliminar, NO renombrar archivos — solo analizar y reportar  

---

## 1. Resumen ejecutivo

Se analizaron **~260 documentos** en el ecosistema AITOS (GuazuTransfer-Web), distribuidos en 16 directorios bajo `docs/`, más los directorios `.opencode/` y `ael/`. 

El ecosistema documental se encuentra en un estado de **transición activa**: la arquitectura SDL 2.0 está congelada, la Constitución AITOS está vigente, y el CDA (Conversation Decision Algorithm) ha sido ratificado como autoridad normativa funcional. Sin embargo, persisten **documentos legacy** (BKE/DRL, Reflection, CE series), **contradicciones normativas no resueltas** (ADR-012 vs ADR-014), y **documentos huérfanos** cuyo plan de implementación fue cancelado.

**Hallazgos críticos:**
- **4 documentos** describen arquitecturas eliminadas (CE-3A, CE-3B, CE-4, CE-5) — código eliminado por ADR-014 pero documentos retenidos sin marca de deprecación
- **5 contradicciones activas** entre documentos (ver §6)
- **~144 documentos históricos** identificados por KNOWLEDGE_INVENTORY — la mayoría candidatos a archive
- **0 ocurrencias** de terminología "reflection" en documentos activos — correctamente aislada en archivos históricos
- **1 contradicción normativa** entre ADR-012 (BKE/DRL como arquitectura oficial) y ADR-014 (BKE/DRL eliminado del código)

---

## 2. Cantidad total de documentos analizados

| Directorio | Archivos | Notas |
|-----------|----------|-------|
| `docs/adr/` | 14 | ADR-001 a ADR-014 |
| `docs/ai/` | 8 | Contexto de agente AI, invariants, quality gates |
| `docs/architecture/` | 76 | + 1 subdir `domains/` (5), + 1 subdir `reverse-engineering/` (3) |
| `docs/architecture/diagrams/` | 28 | Diagramas Mermaid + SVG + markdown |
| `docs/audit/` | 17 | Auditorías, certificaciones CGP, CTM |
| `docs/certification/` | 81 | Certificaciones de calidad, reports de release |
| `docs/governance/` | 2 | AELC + Baseline 1.0 |
| `docs/incidents/` | 3 | Reportes de incidentes |
| `docs/inventory/` | 1 | KNOWLEDGE_INVENTORY.md |
| `docs/knowledge/` | 8 | Reglas de negocio operacionales |
| `docs/operations/` | 3 | Guías de producción |
| `docs/project/` | 12 | PROJECT_BOARD, CHANGELOG, etc. + ROADMAP.md |
| `docs/security/` | 1 | secrets.md |
| `docs/specification/` | 1 | FUNCTIONAL_BEHAVIOR_SPECIFICATION.md |
| `docs/specifications/` | 1 | CONVERSATION_DECISION_ALGORITHM.md (CDA) |
| `docs/history/` | 0 | **Vacío** — legacy movido a `ael/archive/` |
| `docs/` (root) | 1 | SYSTEM_BIBLE.md |
| **Subtotal docs/** | **~257** | |
| `.opencode/agents/` | 2 | plan.md + build.md |
| `.opencode/commands/` | 9 | Comandos AEL (explore, design, enforce, etc.) |
| `.opencode/memory/` | 1 | MEMORY.md |
| `ael/constitution/` | 2 | SPEC.md + CONTRACTS.md |
| `ael/government/` | 7 | ORGANIZATION.md + 6 roles (explorer, architect, implementer, auditor, memory, learning) |
| **Subtotal agentes/ael** | **21** | |
| **TOTAL ESTIMADO** | **~278** | Según KNOWLEDGE_INVENTORY: ~265 únicos (121 activos + 144 históricos) |

---

## 3. Inventario por categoría

### 3.1 Documentos constitucionales y de gobernanza (ACTIVE — autoridad normativa)

| # | Archivo | Propósito | Estado |
|---|---------|-----------|--------|
| 1 | `docs/architecture/AITOS_CONSTITUTION.md` | Marco normativo superior: 118 disposiciones | **OFICIAL** |
| 2 | `ael/constitution/SPEC.md` | Invariantes I1-I6, constraints L1-L4, capabilities | **ACTIVE** |
| 3 | `ael/constitution/CONTRACTS.md` | Reglas R1-R4 de verificación entre capas | **ACTIVE** |
| 4 | `ael/government/ORGANIZATION.md` | Roles, capacidades, autoridad, doctrina | **ACTIVE** |
| 5 | `ael/government/roles/02-explorer.md` | Rol Discovery — solo lectura | **ACTIVE** |
| 6 | `ael/government/roles/03-architect.md` | Rol Architecture — veto | **ACTIVE** |
| 7 | `ael/government/roles/04-implementer.md` | Rol Implementation — cambios autorizados | **ACTIVE** |
| 8 | `ael/government/roles/05-auditor.md` | Rol Validation — blocking | **ACTIVE** |
| 9 | `ael/government/roles/06-memory.md` | Rol Memory — staff advisory | **ACTIVE** |
| 10 | `ael/government/roles/07-learning.md` | Rol Learning — advisory | **ACTIVE** |
| 11 | `docs/governance/BASELINE_1_0.md` | Baseline activa del proyecto | **ACTIVE** |
| 12 | `docs/governance/AITOS_ENGINEERING_LIFECYCLE.md` | Ciclo de ingeniería oficial (12 etapas) | **ACTIVE** |
| 13 | `docs/architecture/GOVERNANCE.md` | Reglas de gobernanza documental | **ACTIVE** |

### 3.2 ADRs — Architecture Decision Records (14)

| # | ADR | Título | Status | Notas |
|---|-----|--------|--------|-------|
| 1 | ADR-001 | Layered Architecture | **ACCEPTED** | Fundacional |
| 2 | ADR-002 | Database Facade Pattern | **ACCEPTED** | Fundacional |
| 3 | ADR-003 | Learning Domain Architecture | **ACCEPTED** | Fundacional |
| 4 | ADR-004 | Service Boundary Rules | **ACCEPTED** | Fundacional |
| 5 | ADR-005 | AI-First Interpretation | **ACCEPTED** | Parcialmente reemplazado por ADR-012 |
| 6 | ADR-006 | Schema Parity | **EXTENDED** | DEBT-12 Fase C2+C3 |
| 7 | ADR-007 | Conversation Interpreter | **ACCEPTED** | Base del pipeline CDA |
| 8 | ADR-008 | Conversational Decision Architecture | **ACCEPTED** | Architecture Freeze v2.0 |
| 9 | ADR-009 | Evidence Engine Architecture | **ACCEPTED** | Architecture Freeze — foundational cognitive pipeline |
| 10 | ADR-010 | Cognitive Memory Architecture | **ACCEPTED** | Implementación en curso (IM-1) |
| 11 | ADR-011 | Elimination of Reflection Layer | **ACCEPTED** | Reflection eliminado como capa |
| 12 | ADR-012 | Cognitive Escalation Principle | **ACCEPTADO** | BKE→DRL→LLM (conceptual — código eliminado por ADR-014) |
| 13 | ADR-013 | Conversation Decision Algorithm Ratification | **ACCEPTADO** | **CDA ratificado como autoridad normativa funcional** |
| 14 | ADR-014 | Experimental Layers Hygiene | **ACCEPTADO** | BKE+DRL+Pattern Discovery removidos; EE+Collector retenidos |

### 3.3 Documentos de arquitectura activa (ACTIVE)

| # | Archivo | Propósito |
|---|---------|-----------|
| 1 | `SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md` | Especificación funcional SDL 2.0 — DESIGN |
| 2 | `SDL_2_0_ARCHITECTURAL_CONSOLIDATION.md` | Consolidación arquitectónica SDL 2.0 — FROZEN |
| 3 | `ARCHITECTURE_STATUS.md` | Estado arquitectónico real del proyecto — CANÓNICO |
| 4 | `ADR_INDEX.md` | Índice navegable de ADRs |
| 5 | `STRATEGIC_OPERATIONAL_CONTRACT.md` | Contrato formal PLAN ↔ BUILD |
| 6 | `MISSION_PHASE_ARCHITECTURE.md` | Arquitectura de fases PLAN → BUILD |
| 7 | `MISSION_CLOSURE_CONTRACT.md` | Contrato de cierre de misión |
| 8 | `INTERFACE_FREEZE_V2.md` | Freeze de interfaz PLAN/BUILD |
| 9 | `ARCHITECTURE_ATLAS.md` | Índice visual a diagramas |
| 10 | `glossary.md` | Glosario unificado — fuente canónica terminológica |
| 11 | `architecture.md` | Punto de entrada ejecutivo a documentación arquitectónica |
| 12 | `system-overview.md` | Vista de alto nivel del sistema |
| 13 | `system-map.md` | Mapa operativo del código |
| 14 | `decision-architecture.md` | Pipeline de decisión, tipos y gates |
| 15 | `design-principles.md` | Principios derivados del código |
| 16 | `conversation-pipeline.md` | Pipeline conversacional (ADR-008) |
| 17 | `strategy-decision.md` | SSOT para decisiones estratégicas conversacionales |
| 18 | `engines.md` | Documentación detallada de cada engine |
| 19 | `bounded-contexts.md` | Contextos delimitados reales |
| 20 | `capability-map.md` | Capacidades del sistema |
| 21 | `fractal-architecture.md` | Patrones arquitectónicos fractales |
| 22 | `handler-context.md` | Enriquecimiento y propagación HandlerContext |
| 23 | `knowledge-map.md` | Mapa de conocimiento del sistema |
| 24 | `maturity-model.md` | Niveles de madurez por capacidad |
| 25 | `operational-model.md` | Modelo operacional del sistema |
| 26 | `DUAL_INTERFACE_ARCHITECTURE.md` | **SUPERSEDED** por INTERFACE_FREEZE_V2.md |
| 27 | `DEFERRED_MIDDLEWARE.md` | Middleware diferido a Post-v1 |
| 28 | `DECISION_OWNERSHIP_MATRIX.md` | Quién decide qué |
| 29 | `documentation-coverage.md` | Cobertura documental post-F2 |
| 30 | `DIAGRAMS.md` | Reglas de ciclo de vida de diagramas |
| 31 | `REVERSE_ENGINEERING_REPORT.md` | Due diligence / architecture discovery |
| 32 | `ARCHITECTURE_BASELINE.md` | Snapshot arquitectónico (generado) |
| 33 | `dashboard.md` | Dashboard arquitectónico (generado) |
| 34 | `drift-report.md` | Reporte de desviación (generado) |
| 35 | `metrics.md` | Métricas arquitectónicas (generado) |
| 36 | `metrics.json` | Métricas en JSON (generado) |

### 3.4 Dominios (ACTIVE)

| Archivo | Dominio |
|---------|---------|
| `domains/dispatch.md` | Asignación de viajes |
| `domains/geo.md` | Resolución de ubicaciones |
| `domains/pricing.md` | Cálculo de precios (dual track v2 legacy + v3 frozen) |
| `domains/session.md` | Estado conversacional |
| `domains/trip.md` | Traslados |

### 3.5 Documentos de especificación (ACTIVE)

| Archivo | Propósito | Notas |
|---------|-----------|-------|
| `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` | Especificación de comportamiento funcional | Complementa CDA |
| `docs/specifications/CONVERSATION_DECISION_ALGORITHM.md` | **CDA** — algoritmo de decisión conversacional | Ratificado por ADR-013 como autoridad normativa funcional |

### 3.6 Documentos de auditoría (ACTIVE)

| Archivo | Propósito |
|---------|-----------|
| `CONSTITUTIONAL_TRACEABILITY_MATRIX.md` | **CTM** — trazabilidad disposiciones → documentos → ADRs → componentes → tests |
| `CONSTITUTIONAL_COMPLIANCE_MATRIX.md` | Matriz de cumplimiento constitucional |
| `CONSTITUTIONAL_AUDIT_REPORT.md` | Reporte de auditoría constitucional |
| `SDL_2_0_GAP_ANALYSIS.md` | Gap analysis SDL 2.0 (23 gaps, 4-mission plan) |
| `SDL_CORE_MIGRATION_REPORT.md` | Reporte de migración SDL 2.0 Core |
| `AUDIT_REPORT_COMPLETE.md` | Reporte completo de auditoría |
| `CGP1_CERTIFICATION.md` | Certificación CGP-1 |
| `CGP1_GATE_REVIEW.md` | Gate review CGP-1 |
| `CGP2_CERTIFICATION.md` | Certificación CGP-2 |
| `CGP2_POST_ACTIONS.md` | Post-acciones CGP-2 |
| `CGP3_CERTIFICATION.md` | Certificación CGP-3 |
| `DOCUMENT_INVENTORY.md` | Inventario documental previo |
| `DOCUMENT_ALIGNMENT_REPORT.md` | Reporte de alineación documental |
| `DOCUMENT_ABSORPTION_MATRIX.md` | Matriz de absorción documental |
| `DOCUMENT_DEPRECATION_PLAN.md` | Plan de deprecación documental |
| `DEVELOPMENT_ECOSYSTEM_ALIGNMENT_REPORT.md` | Alineación del ecosistema de desarrollo |
| `POST_AUDIT_ACTIONS.md` | Acciones post-auditoría |

### 3.7 Documentos de certificación (~81, muestras representativas)

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `SDL_CONTRACT_CERTIFICATION.md` | Certificación del contrato SDL | **ACTIVE** |
| `CERTIFICATION_REGISTRY.md` | Registro de certificaciones | **ACTIVE** |
| `TECHNICAL_DEBT_BASELINE.md` | Línea base de deuda técnica | **ACTIVE** |
| `QUALITY_BASELINE.md` | Línea base de calidad | **ACTIVE** |
| `TEST_BASELINE.md` | Línea base de tests | **ACTIVE** |
| `CX-1_CONVERSATION_EXPERIENCE_CERTIFICATION.md` | Certificación experiencia conversacional | **ACTIVE** |
| `PR-QA3_S2A_SINGLE_CORE_CERTIFICATION.md` | Certificación single core QA3 | **ACTIVE** |
| `PR-QA3_S2B_HOTEL_ESTURION_TRACE.md` | Trace Hotel Esturion QA3 | **ACTIVE** |
| `PR-CAT1_EXTERNAL_ACCEPTANCE_CAMPAIGN.md` | Campaña aceptación externa | **ACTIVE** |
| `PR-CATS-1_CONVERSATION_ACCEPTANCE_SUITE.md` | Suite aceptación conversacional | **ACTIVE** |
| `RELEASE_READINESS.md` | Madurez para release | **ACTIVE** |
| `STABILIZATION_MILESTONE.md` | Hito de estabilización | **ACTIVE** |
| `GOVERNANCE_FREEZE.md` | Freeze de gobernanza | **ACTIVE** |
| `REPOSITORY_HEALTH_REPORT.md` | Salud del repositorio | **ACTIVE** |
| *~67 más* | Varias certificaciones de calidad, reports de bug, etc. | **ACTIVE** |

### 3.8 Documentos de proyecto y operaciones (ACTIVE)

| Archivo | Propósito |
|---------|-----------|
| `PROJECT_BOARD.md` | Tablero maestro de tareas (P0-P3 + DONE + Sprints) |
| `CHANGELOG.md` | Timeline completo de misiones (867 líneas) |
| `PROJECT_CONTEXT.md` | Estado condensado del proyecto (14 secciones) |
| `PROJECT_GOVERNANCE.md` | Fuentes de verdad |
| `PROJECT_WORKFLOW.md` | Checklist de cierre de misión |
| `EXECUTION_PHASE.md` | Declaración de fase de ejecución |
| `PILOT_METRICS.md` | 11 KPIs del piloto |
| `LEARNING_LOOP.md` | Ciclo de aprendizaje del piloto |
| `HUMAN_EXPERIENCE_CHARTER.md` | Charter de experiencia humana |
| `FUNCTIONAL_DASHBOARD.md` | Progreso funcional |
| `CONVERSATION_IMPROVEMENT_PROCESS.md` | Flujo de mejora conversacional |
| `ROADMAP.md` | Hitos y dirección del producto |

### 3.9 Reglas de conocimiento (ACTIVE)

| Archivo | Dominio |
|---------|---------|
| `knowledge/README.md` | Índice de reglas de conocimiento |
| `business-rules.md` | Reglas de negocio generales |
| `dispatch-rules.md` | Reglas de despacho |
| `fleet-rules.md` | Reglas de flota |
| `geo-rules.md` | Reglas de geolocalización |
| `learning-rules.md` | Reglas de aprendizaje |
| `pricing-rules.md` | Reglas de precios |
| `whatsapp-rules.md` | Reglas de WhatsApp |

### 3.10 Guías operacionales e incidentes

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `operations/PRODUCTION_CHECKLIST.md` | Auditoría de variables de entorno | **ACTIVE** (potencialmente stale) |
| `operations/PILOT_OPERATION_GUIDE.md` | Requisitos pre-piloto | **ACTIVE** (potencialmente stale) |
| `operations/MONITORING_DASHBOARD.md` | Dashboards de monitoreo | **ACTIVE** |
| `incidents/INC-001_BUILD_FAILURE_PREVIEW_CONFIG_DRIFT.md` | Fallo de build preview | **CLOSED** |
| `incidents/H-CAT2-001_RECOVERY_SLOT_LOSS.md` | Pérdida de slots en RECOVERY | **OPEN** (aunque BOARD lo marca DONE) |
| `incidents/CAT2_RESULT_REPORT.md` | Resultados test aceptación CAT2 | **PASS** |
| `security/secrets.md` | Reglas de secrets management | **ACTIVE** |

---

## 4. Documentos potencialmente oficiales

### Fuentes de verdad del sistema (SSOT)

Basado en la jerarquía documental y referencias cruzadas, estos documentos constituyen la **fuente oficial** actual del sistema:

| Prioridad | Documento | Autoridad |
|-----------|-----------|-----------|
| **1** | `docs/architecture/AITOS_CONSTITUTION.md` | **Suprema** — 118 disposiciones que gobiernan todo el sistema |
| **2** | `docs/specifications/CONVERSATION_DECISION_ALGORITHM.md` | **Normativa funcional** — ratificada por ADR-013 |
| **3** | `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` | **Especificación funcional** — complementa CDA |
| **4** | `docs/adr/ADR-*.md` (14 decisiones) | **Decisiones arquitectónicas** — algunas activas, otras conceptuales |
| **5** | `ael/constitution/SPEC.md` | **Invariantes operacionales** I1-I6, L1-L4 |
| **6** | `ael/constitution/CONTRACTS.md` | **Contratos entre capas** R1-R4 |
| **7** | `ael/government/ORGANIZATION.md` | **Gobierno del equipo** — roles y autoridad |
| **8** | `docs/governance/BASELINE_1_0.md` | **Baseline activa** — estado certificado del proyecto |
| **9** | `docs/governance/AITOS_ENGINEERING_LIFECYCLE.md` | **Lifecycle oficial** — 12 etapas, 10 estados, 6 tipos de cambio |
| **10** | `docs/architecture/SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md` | **Especificación SDL 2.0** — DESIGN (pending impl) |
| **11** | `docs/architecture/SDL_2_0_ARCHITECTURAL_CONSOLIDATION.md` | **Arquitectura SDL 2.0** — FROZEN |
| **12** | `docs/architecture/ARCHITECTURE_STATUS.md` | **Estado arquitectónico** — documento canónico |
| **13** | `docs/audit/CONSTITUTIONAL_TRACEABILITY_MATRIX.md` | **CTM** — trazabilidad constitucional |
| **14** | `docs/architecture/glossary.md` | **Glosario** — terminología canónica |

### Agentes activos

| Documento | Propósito | Estado |
|-----------|-----------|--------|
| `.opencode/agents/plan.md` | PLAN — SDL 2.0 Strategic Director | **ACTIVE** |
| `.opencode/agents/build.md` | BUILD — AEL Operational Executor | **ACTIVE** |
| `.opencode/commands/*.md` (9) | Comandos AEL | **ACTIVE** |
| `.opencode/memory/MEMORY.md` | Memoria del equipo | **ACTIVE** |

---

## 5. Documentos legacy detectados

### 5.1 Candidatos a ARCHIVE (código eliminado, diseño retenido)

| Documento | Razón | Evidencia |
|-----------|-------|-----------|
| `CE-3A_BUSINESS_KNOWLEDGE_ENGINE.md` | BKE diseñado aquí pero código eliminado por ADR-014 | ADR-014 §2.5: "BKE + DRL — REMOVE" |
| `CE-3B_DETERMINISTIC_REASONING_LAYER.md` | DRL diseñado aquí pero código eliminado por ADR-014 | ADR-014 §2.5: "BKE + DRL — REMOVE" |
| `CE-4_MIGRATION_ROADMAP.md` | Roadmap de migración BKE/DRL — plan cancelado | ADR-014, CHANGELOG BUILD-AUDIT-1 |
| `CE-5_IMPLEMENTATION_READINESS.md` | Readiness para BKE/DRL — moot post ADR-014 | ADR-014 |
| `ARCHITECTURE_MILESTONE_v3.0.md` | Auto-declarado HISTORICAL | Línea 3: "Status: HISTORICAL" |
| `DUAL_INTERFACE_ARCHITECTURE.md` | Explícitamente supersedido por INTERFACE_FREEZE_V2.md | Línea 4: "Supersedes: DUAL_INTERFACE_ARCHITECTURE.md" en INTERFACE_FREEZE_V2 |

### 5.2 Documentos con terminología legacy

| Término | Archivos activos | Evaluación |
|---------|-----------------|------------|
| **reflection** | 213 matches (ADR-011, archivos PR-*, archive/) | **AISLADO** — solo en ADR-011 (eliminación) y archivos históricos. No aparece en documentos activos de agentes. ✅ |
| **BKE** | ~80 matches (CE-3A, CHANGELOG, PROJECT_BOARD, ADR-012, ADR-014) | **EN TRANSICIÓN** — código eliminado, diseño retenido. Documentos CE-3A/3B/4/5 deben marcarse como ARCHIVE_CANDIDATE. ⚠️ |
| **DRL** | ~70 matches (CE-3B, CHANGELOG, PROJECT_BOARD, ADR-012, ADR-014) | **EN TRANSICIÓN** — mismo estado que BKE. ⚠️ |
| **C3/C4/C6** | ~200 matches total (CE series, invariants I-C3/I-C4/I-C6, diagramas) | **ACTIVO** — son códigos de consumo LLM vigentes + invariantes activos. No legacy. ✅ |
| **cognitive pipeline** | 12 matches (ADR-009, ADR-010, ADR-011, ARCHITECTURE_STATUS) | **ACTIVO** — concepto fundacional congelado. ✅ |
| **CDA** | ~40+ matches | **ACTIVO** — especificación certificada por ADR-013. ✅ |
| **autonomous reasoning** | 0 matches | **NO ENCONTRADO** ✅ |
| **old memory / legacy memory** | 0 matches | **NO ENCONTRADO** ✅ |
| **SD-I1..SD-I6** | 29 matches (SDL_CONTRACT_CERTIFICATION, architecture freeze, etc.) | **ACTIVO** — 6 invariantes certificados del SDL. ✅ |

### 5.3 Archivos históricos en `ael/archive/`

El directorio `ael/archive/` contiene **~41 archivos** representando el modelo anterior de pipeline de 7 fases:

| Subdirectorio | Archivos | Contenido |
|---------------|----------|-----------|
| `PR-7/` | 7 | Learning ontology audit (archivado) |
| `PR-8/` | 8 | Goals ontology audit (archivado) |
| `PR-9/` | 7 | Planning ontology audit (archivado) |
| `PR-10/` | 6 | Boundary ontology audit (archivado) |
| `milestones/` | 2 | v1 freeze + v2 milestone |
| `history/` | 8 | Documentos históricos del proyecto |
| root | 5 | PIPELINE.md, HANDOFF.md, FAILURE.md, AGENTS.md, 01-director.md |

**Estado:** Correctamente archivados. No requieren acción inmediata.

---

## 6. Contradicciones encontradas

### 🔴 C-1: ADR-012 (Cognitive Escalation) vs ADR-014 (Experimental Layers Hygiene)

| Fuente | Afirmación |
|--------|-----------|
| ADR-012 (Aceptado 2026-07-15) | BKE → DRL → LLM es la arquitectura oficial. 7 principios, 5 fases de implementación. Architecture Freeze V3. |
| ADR-014 (Aceptado 2026-07-20) | BKE y DRL **eliminados del código**. 0 consumidores, 0 tests, 2,476 líneas muertas. |

**Naturaleza:** Contradicción normativa — ADR-012 declara BKE/DRL como arquitectura vigente; ADR-014 elimina su implementación. ADR-014 afirma preservar ADR-012 como "diseño conceptual", pero en la práctica la arquitectura real no tiene BKE/DRL.

**Riesgo:** Un lector de ADR-012 concluiría que BKE/DRL son la arquitectura actual; un lector de ADR-014 concluiría que fueron eliminados. ARCHITECTURE_STATUS.md aún referencia BKE/DRL como "Cognitive Escalation".

**Recomendación:** ADR-012 debe actualizarse con una nota de ADR-014 indicando que la implementación fue diferida a post-v1. CE-3A/3B/4/5 deben marcarse como ARCHIVE_CANDIDATE.

### 🔴 C-2: PROJECT_CONTEXT.md post-fecha vs ADR-014

| Fuente | Afirmación |
|--------|-----------|
| PROJECT_CONTEXT.md (2026-07-19) | "Modelo de inteligencia: BKE → DRL → Groq → Gemini". BKE/DRL listados como "Implementado (flags false)". |
| ADR-014 (2026-07-20) | BKE/DRL **removidos** — código eliminado (~2,500 líneas). |

**Naturaleza:** Desactualización por fecha. PROJECT_CONTEXT.md fue escrito un día antes de BUILD-AUDIT-1.

**Riesgo:** Bajo — la diferencia de fechas explica la contradicción. Pero PROJECT_CONTEXT.md es un documento de referencia activo.

**Recomendación:** Actualizar PROJECT_CONTEXT.md para reflejar el estado post ADR-014.

### 🟡 C-3: H-CAT2-001 — Estado del incidente

| Fuente | Afirmación |
|--------|-----------|
| PROJECT_BOARD.md | P1-11 marcado **DONE** |
| CHANGELOG.md (línea 34) | "H-CAT2-001 corregido en BUILD-AUDIT-1" |
| FUNCTIONAL_DASHBOARD.md | H-CAT2-001 listado como **OPEN** |
| `incidents/H-CAT2-001_RECOVERY_SLOT_LOSS.md` | Estado: **OPEN** |

**Naturaleza:** Inconsistencia de estado — la corrección está implementada pero 2 documentos (incident file + FUNCTIONAL_DASHBOARD) no se actualizaron.

**Riesgo:** Medio — puede llevar a confusiones sobre si el incidente está resuelto.

**Recomendación:** Actualizar incident file a CLOSED y FUNCTIONAL_DASHBOARD a DONE/RESOLVED.

### 🟡 C-4: SYSTEM_BIBLE.md desactualizado

| Fuente | Afirmación |
|--------|-----------|
| SYSTEM_BIBLE.md (2026-07-06) | "Pendiente de alineación completa con la Constitución". No menciona CDA, ADR-013, ni BKE/DRL removal. |
| Realidad actual (2026-07-22) | CDA ratificado como autoridad normativa. BKE/DRL removidos. SDL 2.0 implementado. |

**Naturaleza:** Staleness — el documento no se ha actualizado en 16 días, período en el que ocurrieron cambios fundamentales.

**Riesgo:** Alto — cualquier nuevo integrante que lea SYSTEM_BIBLE.md obtendrá una imagen incorrecta del sistema.

**Recomendación:** Actualizar SYSTEM_BIBLE.md para reflejar la arquitectura actual.

### 🟡 C-5: PILOT_OPERATION_GUIDE.md y PRODUCTION_CHECKLIST.md stale

| Fuente | Afirmación |
|--------|-----------|
| PILOT_OPERATION_GUIDE.md | 6 requisitos pre-piloto todos "PENDIENTE" |
| PRODUCTION_CHECKLIST.md | Auditoría de env vars (OPS1, 2026-07-08) |
| PROJECT_BOARD.md | P0-01 (key rotation) DONE, P0-04 (seed) DONE, P1-07 (LOG_LEVEL) DONE |

**Naturaleza:** Guías operacionales no reflejan el progreso real.

**Riesgo:** Bajo — documentos operacionales, no normativos.

**Recomendación:** Actualizar para reflejar estado actual.

---

## 7. Documentos con valor histórico recuperable

| Documento | Valor histórico | Riesgo de pérdida |
|-----------|----------------|-------------------|
| `CE-1_COGNITIVE_EFFICIENCY_AUDIT.md` | Inventario completo de consumo LLM (baseline de eficiencia) | Bajo — es la base de datos de consumo. Conservar como referencia. |
| `CE-2_INEVITABILITY_CLASSIFICATION.md` | Clasificación de inevitabilidad de cada punto LLM | Bajo — análisis válido independientemente de la implementación |
| `PR-11_COGNITIVE_REALITY_ALIGNMENT.md` | Resuelve divergencia entre arquitectura declarada, implementada y futura | **Alto** — documento clave para entender qué es real vs deseado |
| `FCER-1_FIRST_COGNITIVE_EVIDENCE_REPORT.md` | Primera evidencia empírica del pipeline cognitivo | Medio — datos de rendimiento histórico |
| `S1A_GLOBAL_IRREDUCIBILITY_AUDIT.md` | Intenta refutar la arquitectura cognitiva desde primeros principios | **Alto** — ejercicio de validación arquitectónica rigurosa |
| `REVERSE_ENGINEERING_REPORT.md` | Due diligence técnica del TaxiGuazu Bot | Medio — contexto histórico del codebase |
| `ADR-011` (Reflection Elimination) | Documenta la eliminación formal de Reflection | **Alto** — decisión arquitectónica importante, conservar como ADR |
| `ael/archive/PR-7/` a `PR-10/` | Ontologías Learning, Goals, Planning, Boundary | Medio — documentan diseño conceptual que fue descartado |
| `ael/archive/PIPELINE.md` etc. | Pipeline de 7 fases anterior | Bajo — reemplazado por modelo constitucional |
| `docs/history/` (vacío) | — | N/A — contenido movido a `ael/archive/history/` |

---

## 8. Riesgos documentales

| ID | Riesgo | Severidad | Impacto | Mitigación posible |
|----|--------|-----------|---------|-------------------|
| R-01 | **BKE/DRL documents sin deprecación explícita** (CE-3A, CE-3B, CE-4, CE-5) | 🔴 **Alto** | Un lector puede asumir que BKE/DRL son la arquitectura activa | Añadir banner de deprecación: "ARCHIVE CANDIDATE — código eliminado por ADR-014. Conservado como referencia conceptual." |
| R-02 | **Contradicción ADR-012 vs ADR-014 no resuelta** | 🔴 **Alto** | Confusión sobre el modelo de inteligencia actual | ADR-012 debe añadir nota de ADR-014. ARCHITECTURE_STATUS debe ser explícito. |
| R-03 | **SYSTEM_BIBLE.md desactualizado** | 🟡 **Medio** | Onboarding incorrecto de nuevos miembros | Actualizar para reflejar CDA, ADR-014, SDL 2.0 |
| R-04 | **144 documentos históricos sin clasificar** | 🟡 **Medio** | Ruido documental, dificulta encontrar información vigente | Ejecutar plan de deprecación (DOCUMENT_DEPRECATION_PLAN.md ya existe) |
| R-05 | **Duplicación funcional: múltiples documentos describen el mismo concepto** | 🟡 **Medio** | ARCHITECTURE_STATUS.md, SYSTEM_BIBLE.md, ARCHITECTURE_ATLAS.md, architecture.md, system-overview.md — todos describen "qué es AITOS" | Consolidar en una única fuente primaria |
| R-06 | **Incidente H-CAT2-001 con estado inconsistente** | 🟡 **Medio** | Posible confusión sobre si la corrección está validada | Cerrar incident file formalmente |
| R-07 | **ARCHITECTURE_MILESTONE_v3.0.md como HISTORICAL pero aún referenciado** | 🟢 **Bajo** | Describe un sistema futuro como si fuera actual | Marcar explícitamente como HISTORICAL en el filename o con banner visible |
| R-08 | **PILOT_OPERATION_GUIDE.md y PRODUCTION_CHECKLIST.md stale** | 🟢 **Bajo** | Listas de verificación no reflejan progreso | Actualizar a estado actual |
| R-09 | **CDA (ADR-013) vs Constitución: jurisdicción no definida** | 🟢 **Bajo** | CDA se declara "autoridad normativa funcional" pero la Constitución es "suprema" | La relación debe definirse: ¿CDA está subordinado a la Constitución? ¿Son complementarios? |

---

## 9. Recomendación inicial de clasificación

### KEEP (conservar como activo oficial)

| Documento | Razón |
|-----------|-------|
| Constitución AITOS | Autoridad suprema |
| AEL SPEC, CONTRACTS, ORGANIZATION + roles | Marco operacional del equipo |
| ADR-001 a ADR-014 (todos) | Decisiones arquitectónicas registradas |
| SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md | Especificación SDL 2.0 |
| SDL_2_0_ARCHITECTURAL_CONSOLIDATION.md | Arquitectura SDL 2.0 congelada |
| ARCHITECTURE_STATUS.md | Estado arquitectónico canónico |
| CDA (CONVERSATION_DECISION_ALGORITHM.md) | Autoridad normativa funcional |
| FBS (FUNCTIONAL_BEHAVIOR_SPECIFICATION.md) | Especificación funcional |
| CTM (CONSTITUTIONAL_TRACEABILITY_MATRIX.md) | Trazabilidad constitucional |
| BASELINE_1_0.md + AELC | Baseline y lifecycle |
| Glossary | Terminología canónica |
| PROJECT_BOARD.md, CHANGELOG.md, ROADMAP.md | Seguimiento del proyecto |
| KNOWLEDGE_INVENTORY.md | Inventario maestro |
| BUILD.md, PLAN.md, commands/*.md, MEMORY.md | Configuración de agentes |
| CE-1, CE-2 | Datos de consumo LLM (baseline vigente) |
| PR-11 (Reality Alignment) | Documento clave de alineamiento |
| S1A (Global Irreducibility Audit) | Validación arquitectónica rigurosa |
| audit/*.md (SDL gap analysis, migration report, CGP certifications) | Auditorías activas |
| certification/* (81 files) | Certificaciones de calidad |

### MIGRATE (requiere actualización o consolidación)

| Documento | Acción |
|-----------|--------|
| **PROJECT_CONTEXT.md** | Actualizar sección BKE/DRL post ADR-014 |
| **SYSTEM_BIBLE.md** | Alinear con Constitución, CDA, SDL 2.0, ADR-014 |
| **H-CAT2-001_RECOVERY_SLOT_LOSS.md** | Cerrar incidente formalmente |
| **FUNCTIONAL_DASHBOARD.md** | Marcar H-CAT2-001 como RESOLVED |
| **PILOT_OPERATION_GUIDE.md** | Actualizar checklist items completados |
| **PRODUCTION_CHECKLIST.md** | Actualizar env vars audit |
| **ARCHITECTURE_STATUS.md** | Añadir nota sobre ADR-014 y estado BKE/DRL |

### ARCHIVE (mover a `ael/archive/` o marcar como histórico)

| Documento | Razón |
|-----------|-------|
| **CE-3A_BUSINESS_KNOWLEDGE_ENGINE.md** | Código eliminado por ADR-014. Diseño conceptual preservado en ADR-012. |
| **CE-3B_DETERMINISTIC_REASONING_LAYER.md** | Código eliminado por ADR-014. |
| **CE-4_MIGRATION_ROADMAP.md** | Plan cancelado por ADR-014. |
| **CE-5_IMPLEMENTATION_READINESS.md** | Readiness para plan cancelado. |
| **ARCHITECTURE_MILESTONE_v3.0.md** | Auto-declarado HISTORICAL. Describe sistema futuro, no actual. |
| **DUAL_INTERFACE_ARCHITECTURE.md** | Superseded por INTERFACE_FREEZE_V2.md. |

### DELETE (solo después de revisión estratégica — requiere aprobación de PLAN)

| Documento | Razón |
|-----------|-------|
| **Ninguno recomendado en esta etapa** | Todos los documentos tienen algún valor, aunque sea histórico. La decisión de DELETE debe ser estratégica. |

### Nota sobre `docs/history/`

El directorio está **vacío**. El contenido fue movido a `ael/archive/history/`. Este directorio puede eliminarse o mantenerse como placeholder.

---

## Apéndice A: Mapa de términos legacy

```
reflection ──────────→ ADR-011 (eliminado como capa) ──→ archive/
BKE ─────────────────→ ADR-012 (diseño conceptual) ──→ código eliminado por ADR-014
                    → CE-3A (documento de diseño) ───→ ARCHIVE_CANDIDATE
DRL ─────────────────→ ADR-012 (diseño conceptual) ──→ código eliminado por ADR-014
                    → CE-3B (documento de diseño) ───→ ARCHIVE_CANDIDATE
C3/C4/C6 ────────────→ CE-1/CE-2 (consumo LLM) ─────→ ACTIVO (códigos vigentes)
                    → I-C3/I-C4/I-C6 (invariantes) ──→ ACTIVOS
CDA ─────────────────→ ADR-013 (ratificación) ───────→ ACTIVO (autoridad funcional)
cognitive pipeline ──→ ADR-009 (Evidence Engine) ────→ ACTIVO (congelado)
autonomous reasoning ─→ (no encontrado en docs/) ────→ N/A
old memory system ───→ (no encontrado en docs/) ─────→ N/A
SD-I1..SD-I6 ────────→ SDL_CONTRACT_CERTIFICATION ──→ ACTIVO (invariantes certificados)
```

---

## Apéndice B: Resumen de acciones recomendadas

| Prioridad | Acción | Documentos afectados | Dependencia |
|-----------|--------|---------------------|-------------|
| **P0** | Resolver contradicción ADR-012 ↔ ADR-014 | ADR-012, CE-3A, CE-3B, CE-4, CE-5, ARCHITECTURE_STATUS.md | Requiere decisión de PLAN |
| **P0** | Marcar CE-3A/3B/4/5 como ARCHIVE_CANDIDATE con banner | CE-3A, CE-3B, CE-4, CE-5 | Después de resolver P0 |
| **P1** | Actualizar SYSTEM_BIBLE.md | SYSTEM_BIBLE.md | — |
| **P1** | Actualizar PROJECT_CONTEXT.md (BKE/DRL) | PROJECT_CONTEXT.md | — |
| **P1** | Cerrar H-CAT2-001 formalmente | H-CAT2-001.md, FUNCTIONAL_DASHBOARD.md | — |
| **P2** | Actualizar guías operacionales | PILOT_OPERATION_GUIDE.md, PRODUCTION_CHECKLIST.md | — |
| **P2** | Consolidar documentos de "visión general" duplicados | ARCHITECTURE_ATLAS.md, system-overview.md, architecture.md, SYSTEM_BIBLE.md | Requiere decisión de PLAN |
| **P3** | Ejecutar plan de deprecación documental | Seguir DOCUMENT_DEPRECATION_PLAN.md existente | — |
| **P3** | Definir relación CDA ↔ Constitución | AITOS_CONSTITUTION.md, ADR-013 | Requiere decisión de PLAN |

---

*Reporte generado por BUILD como parte de la misión DOC-01. Ningún archivo fue modificado, eliminado o renombrado durante este análisis.*
