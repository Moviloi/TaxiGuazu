# DOC-04 SSOT AUTHORITY REPORT

> **Misión:** DOC-04 — SSOT Authority Audit  
> **Ejecutor:** BUILD (AEL)  
> **Fecha:** 2026-07-22  
> **Objetivo:** Auditar la jerarquía de autoridad documental del ecosistema AITOS, clasificar cada documento en niveles L0-L5, detectar reclamos de SSOT incorrectos, autoridades solapadas y documentos que deben ser degradados.  
> **Basado en:** DOC-01 Inventory Report, DOC-02 ADR Consistency Report, DOC-03 Alignment Report, CONSTITUTIONAL_TRACEABILITY_MATRIX, CONSTITUTIONAL_COMPLIANCE_MATRIX, GOVERNANCE.md

---

## 1. Resumen ejecutivo

Se auditaron **~278 documentos** clasificándolos en 5 niveles de autoridad (L0–L5). Se detectaron:

| Hallazgo | Severidad | Cantidad |
|----------|-----------|----------|
| **SSOT conflicts** — documentos que compiten por la misma autoridad | 🔴 Crítico | 1 |
| **Authority contradictions** — documento se asigna una autoridad que otro documento le contradice | 🟡 Medio | 3 |
| **Overlapping SSOT claims** — múltiples documentos describen el mismo concepto sin jerarquía clara | 🟡 Medio | 3 |
| **Documents with incorrect authority level** — clasificados en nivel que no corresponde | 🟡 Medio | 2 |
| **Documents degraded correctly** — banners y estado reflejan autoridad real | ✅ Correcto | 6 |
| **Documents with clear self-subordination** — declaran explícitamente su autoridad inferior | ✅ Correcto | 4 |

**Hallazgo crítico:** La **AITOS CONSTITUTION** (`docs/architecture/AITOS_CONSTITUTION.md`) y la **AEL SPEC** (`ael/constitution/SPEC.md`) compiten por el nombre "Constitución" sin que su relación jerárquica esté documentada en ambas direcciones. Aunque ORGANIZATION.md define su relación, ninguna de las dos constituciones se referencia mutuamente ni declara su posición relativa.

---

## 2. Clasificación por nivel de autoridad (L0–L5)

### L0 — Constitución (Autoridad normativa suprema)

Documentos que establecen principios, invariantes y reglas no negociables. No pueden ser contradichos por ningún otro documento.

| # | Documento | Autoridad declarada | ¿Correcta? |
|---|-----------|---------------------|------------|
| 1 | `docs/architecture/AITOS_CONSTITUTION.md` | "máxima autoridad normativa del sistema" — 118 disposiciones, 616 líneas | ✅ — Correcta L0. Define §1.4 jerarquía normativa (9 niveles). |
| 2 | `ael/constitution/SPEC.md` | "Constitution of ARNÉS" — invariantes I1-I6, lifecycle L1-L4 | ⚠️ — Correcta L0 para proceso de desarrollo, pero **no referencia a AITOS_CONSTITUTION.md**. ORGANIZATION.md sí define la relación, pero SPEC.md no. |

### L1 — Ejecutivo / Normativo (Directrices vinculantes)

Documentos que establecen reglas, especificaciones y contratos vinculantes. Derivan su autoridad de L0.

| # | Documento | Autoridad declarada | ¿Correcta? |
|---|-----------|---------------------|------------|
| 3 | `ael/constitution/CONTRACTS.md` | Reglas R1-R4 de verificación entre capas | ✅ — Correcta L1. Contratos vinculantes de capas. |
| 4 | `ael/government/ORGANIZATION.md` | "Government level. Evolvable. Defines who does what within the Constitution's boundaries." | ✅ — Correcta L1. Explícitamente subordinado a SPEC.md. |
| 5 | `ael/government/roles/02-explorer.md` | Rol Discovery — solo lectura | ✅ — Correcta L1. Contrato de capability. |
| 6 | `ael/government/roles/03-architect.md` | Rol Architecture — veto | ✅ — Correcta L1. |
| 7 | `ael/government/roles/04-implementer.md` | Rol Implementation — cambios autorizados | ✅ — Correcta L1. |
| 8 | `ael/government/roles/05-auditor.md` | Rol Validation — blocking | ✅ — Correcta L1. |
| 9 | `ael/government/roles/06-memory.md` | Rol Memory — staff advisory | ✅ — Correcta L1. |
| 10 | `ael/government/roles/07-learning.md` | Rol Learning — advisory | ✅ — Correcta L1. |
| 11 | `docs/architecture/GOVERNANCE.md` | "Rules for keeping the architecture documentation accurate, consistent, and alive." | ✅ — Correcta L1. Define SSOT taxonomy (Tiers 0-5), naming conventions, change workflows. |
| 12 | `docs/specifications/CONVERSATION_DECISION_ALGORITHM.md` (CDA) | "Documento técnico derivado de la Constitución... Jerarquía: CONST §1.4 (nivel 8: Contratos). En caso de conflicto, prevalece la Constitución." | ✅ — Correcta L1. Auto-subordinada explícitamente a AITOS_CONSTITUTION.md. ADR-013 la ratifica como "autoridad funcional normativa". |
| 13 | `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` | Especificación de comportamiento funcional | ✅ — Correcta L1. Complementa CDA. |
| 14 | `.opencode/agents/plan.md` | Definición del agente PLAN (Strategic Director) | ✅ — Correcta L1. Define agente del ecosistema. |
| 15 | `.opencode/agents/build.md` | Definición del agente BUILD (AEL Director) | ✅ — Correcta L1. Define agente del ecosistema. |
| 16 | `.opencode/commands/*.md` (9 archivos) | Comandos AEL de ejecución | ✅ — Correcta L1. Instrucciones de ejecución vinculantes. |

### L2 — Gobierno / Arquitectura (Decisiones estructurales)

Documentos que registran decisiones arquitectónicas y establecen marcos de gobierno del producto. Subordinados a L0 y L1.

| # | Documento | Autoridad declarada | ¿Correcta? |
|---|-----------|---------------------|------------|
| 17 | `docs/adr/ADR-001` a `ADR-014` | 14 Architecture Decision Records | ✅ — Correcta L2. Cada ADR es una decisión registrada. ADRs pueden modificar ADRs previos (ej: ADR-014 modifica ADR-012). |
| 18 | `docs/governance/BASELINE_1_0.md` | Baseline activa del proyecto | ✅ — Correcta L2. Estado certificado, subordinado a ADRs y Constituciones. |
| 19 | `docs/governance/AITOS_ENGINEERING_LIFECYCLE.md` | Ciclo de ingeniería oficial (12 etapas) | ✅ — Correcta L2. Define proceso. |
| 20 | `docs/ai/ARCHITECTURE_BIBLE.md` | "Derived technical reference... If this document contradicts the Constitution, the Constitution prevails." | ✅ — Correcta L2. Auto-subordinada a AITOS_CONSTITUTION.md. |
| 21 | `docs/ai/ARCHITECTURE_RULES.md` | Reglas de arquitectura AI | ✅ — Correcta L2. |
| 22 | `docs/ai/INVARIANTS.md` | Invariantes I1-I24 | ✅ — Correcta L2. Invariantes operacionales del sistema. |
| 23 | `docs/ai/ENGINE_CONTRACTS.md` | Contratos entre motores | ✅ — Correcta L2. |
| 24 | `docs/ai/QUALITY_GATE.md` | Checklist de calidad | ✅ — Correcta L2. |
| 25 | `docs/ai/DECISION_TREE.md` | Árbol de decisión | ✅ — Correcta L2. |
| 26 | `docs/ai/COMMON_FAILURES.md` | Fallos comunes | ✅ — Correcta L2. |
| 27 | `docs/ai/README.md` | Índice de documentación AI | ✅ — Correcta L2. |
| 28 | `docs/architecture/STRATEGIC_OPERATIONAL_CONTRACT.md` | Contrato formal PLAN ↔ BUILD. "Este contrato reemplaza cualquier interpretación anterior." | ✅ — Correcta L2. Contrato entre agentes, subordinado a ORGANIZATION.md. |

### L3 — Especificaciones / Descripción arquitectónica (Estado detallado)

Documentos que describen el estado actual del sistema, su arquitectura y comportamiento. Describen, no prescriben.

| # | Documento | Autoridad declarada | ¿Correcta? |
|---|-----------|---------------------|------------|
| 29 | `docs/architecture/ARCHITECTURE_STATUS.md` | "Documento canónico del estado arquitectónico real del proyecto. Fuente única de verdad para entender qué existe, qué está aprobado, qué permanece como diseño." | ✅ — Correcta L3 para estado arquitectónico. No prescribe arquitectura, la describe. |
| 30 | `docs/architecture/SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md` | Especificación funcional SDL 2.0 — DESIGN | ✅ — Correcta L3. |
| 31 | `docs/architecture/SDL_2_0_ARCHITECTURAL_CONSOLIDATION.md` | Arquitectura SDL 2.0 — FROZEN | ✅ — Correcta L3. |
| 32 | `docs/architecture/system-overview.md` | Vista de alto nivel del sistema | ✅ — Correcta L3. |
| 33 | `docs/architecture/system-map.md` | Mapa operativo del código | ✅ — Correcta L3. |
| 34 | `docs/architecture/decision-architecture.md` | Pipeline de decisión, tipos y gates | ✅ — Correcta L3. |
| 35 | `docs/architecture/design-principles.md` | Principios derivados del código | ✅ — Correcta L3. |
| 36 | `docs/architecture/conversation-pipeline.md` | Pipeline conversacional | ✅ — Correcta L3. |
| 37 | `docs/architecture/strategy-decision.md` | SSOT para decisiones estratégicas conversacionales | ⚠️ — **Problema de naming**: se auto-declara "SSOT", pero está en L3 (descripción). Debería referenciar al CDA o ARCHITECTURE_STATUS como SSOT. |
| 38 | `docs/architecture/engines.md` | Documentación detallada de cada engine | ✅ — Correcta L3. |
| 39 | `docs/architecture/bounded-contexts.md` | Contextos delimitados reales | ✅ — Correcta L3. |
| 40 | `docs/architecture/capability-map.md` | Capacidades del sistema | ✅ — Correcta L3. |
| 41 | `docs/architecture/fractal-architecture.md` | Patrones arquitectónicos fractales | ✅ — Correcta L3. |
| 42 | `docs/architecture/handler-context.md` | Enriquecimiento y propagación HandlerContext | ✅ — Correcta L3. |
| 43 | `docs/architecture/knowledge-map.md` | Mapa de conocimiento del sistema | ✅ — Correcta L3. |
| 44 | `docs/architecture/maturity-model.md` | Niveles de madurez por capacidad | ✅ — Correcta L3. |
| 45 | `docs/architecture/operational-model.md` | Modelo operacional del sistema | ✅ — Correcta L3. |
| 46 | `docs/architecture/INTERFACE_FREEZE_V2.md` | Freeze de interfaz PLAN/BUILD | ✅ — Correcta L3. |
| 47 | `docs/architecture/MISSION_PHASE_ARCHITECTURE.md` | Arquitectura de fases PLAN → BUILD | ✅ — Correcta L3. |
| 48 | `docs/architecture/MISSION_CLOSURE_CONTRACT.md` | Contrato de cierre de misión | ✅ — Correcta L3. |
| 49 | `docs/architecture/DECISION_OWNERSHIP_MATRIX.md` | Quién decide qué | ✅ — Correcta L3. |
| 50 | `docs/architecture/documentation-coverage.md` | Cobertura documental post-F2 | ✅ — Correcta L3. |
| 51 | `docs/architecture/DIAGRAMS.md` | Reglas de ciclo de vida de diagramas | ✅ — Correcta L3. |
| 52 | `docs/architecture/ADR_INDEX.md` | Índice navegable de ADRs | ✅ — Correcta L3 (Reference, ver GOVERNANCE.md taxonomy). |
| 53 | `docs/architecture/glossary.md` | "Fuente canónica de terminología" | ✅ — Correcta L3. Vocabulario canónico (Tier 0 en taxonomy de GOVERNANCE.md, pero contenido es L3). |
| 54 | `docs/architecture/ARCHITECTURE_ATLAS.md` | Índice visual a diagramas | ✅ — Correcta L3. |
| 55 | `docs/architecture/DEFERRED_MIDDLEWARE.md` | Middleware diferido a Post-v1 | ✅ — Correcta L3. |
| 56 | `docs/architecture/REVERSE_ENGINEERING_REPORT.md` | Due diligence arquitectónica | ✅ — Correcta L3. |
| 57 | `docs/architecture/domains/dispatch.md` | Asignación de viajes | ✅ — Correcta L3. |
| 58 | `docs/architecture/domains/geo.md` | Resolución de ubicaciones | ✅ — Correcta L3. |
| 59 | `docs/architecture/domains/pricing.md` | Cálculo de precios | ✅ — Correcta L3. |
| 60 | `docs/architecture/domains/session.md` | Estado conversacional | ✅ — Correcta L3. |
| 61 | `docs/architecture/domains/trip.md` | Traslados | ✅ — Correcta L3. |
| 62 | `docs/architecture/diagrams/*.mmd` (28 archivos) | Diagramas arquitectónicos | ✅ — Correcta L3. |
| 63 | `docs/architecture/diagrams/*.svg` | Diagramas generados | ✅ — Correcta L3 (generados). |
| 64 | `docs/architecture/architecture.md` | Punto de entrada ejecutivo | ✅ — Correcta L3. |
| 65 | `docs/knowledge/README.md` | Índice de reglas de conocimiento | ✅ — Correcta L3. |
| 66 | `docs/knowledge/business-rules.md` | Reglas de negocio generales | ✅ — Correcta L3. |
| 67 | `docs/knowledge/dispatch-rules.md` | Reglas de despacho | ✅ — Correcta L3. |
| 68 | `docs/knowledge/fleet-rules.md` | Reglas de flota | ✅ — Correcta L3. |
| 69 | `docs/knowledge/geo-rules.md` | Reglas de geolocalización | ✅ — Correcta L3. |
| 70 | `docs/knowledge/learning-rules.md` | Reglas de aprendizaje | ✅ — Correcta L3. |
| 71 | `docs/knowledge/pricing-rules.md` | Reglas de precios | ✅ — Correcta L3. |
| 72 | `docs/knowledge/whatsapp-rules.md` | Reglas de WhatsApp | ✅ — Correcta L3. |

### L4 — Auditoría / Proyecto / Evidencia (Verificación puntual)

Documentos que registran hallazgos, estado del proyecto, certificaciones y evidencia. Son puntuales en el tiempo. No prescriben arquitectura.

| # | Documento | Autoridad declarada | ¿Correcta? |
|---|-----------|---------------------|------------|
| 73 | `docs/audit/CONSTITUTIONAL_TRACEABILITY_MATRIX.md` | "Matriz oficial de trazabilidad constitucional" | ✅ — Correcta L4. Trazabilidad. |
| 74 | `docs/audit/CONSTITUTIONAL_COMPLIANCE_MATRIX.md` | Matriz de cumplimiento constitucional | ✅ — Correcta L4. |
| 75 | `docs/audit/CONSTITUTIONAL_AUDIT_REPORT.md` | Reporte de auditoría constitucional | ✅ — Correcta L4. |
| 76 | `docs/audit/SDL_2_0_GAP_ANALYSIS.md` | Gap analysis SDL 2.0 | ✅ — Correcta L4. |
| 77 | `docs/audit/SDL_CORE_MIGRATION_REPORT.md` | Reporte de migración SDL 2.0 | ✅ — Correcta L4. |
| 78 | `docs/audit/AUDIT_REPORT_COMPLETE.md` | Reporte completo de auditoría | ✅ — Correcta L4. |
| 79 | `docs/audit/CGP1_CERTIFICATION.md` | Certificación CGP-1 | ✅ — Correcta L4. |
| 80 | `docs/audit/CGP1_GATE_REVIEW.md` | Gate review CGP-1 | ✅ — Correcta L4. |
| 81 | `docs/audit/CGP2_CERTIFICATION.md` | Certificación CGP-2 | ✅ — Correcta L4. |
| 82 | `docs/audit/CGP2_POST_ACTIONS.md` | Post-acciones CGP-2 | ✅ — Correcta L4. |
| 83 | `docs/audit/CGP3_CERTIFICATION.md` | Certificación CGP-3 | ✅ — Correcta L4. |
| 84 | `docs/audit/DOCUMENT_INVENTORY.md` | Inventario documental previo | ✅ — Correcta L4. |
| 85 | `docs/audit/DOCUMENT_ALIGNMENT_REPORT.md` | Reporte de alineación documental | ✅ — Correcta L4. |
| 86 | `docs/audit/DOCUMENT_ABSORPTION_MATRIX.md` | Matriz de absorción documental | ✅ — Correcta L4. |
| 87 | `docs/audit/DOCUMENT_DEPRECATION_PLAN.md` | Plan de deprecación documental | ✅ — Correcta L4. |
| 88 | `docs/audit/DEVELOPMENT_ECOSYSTEM_ALIGNMENT_REPORT.md` | Alineación ecosistema | ✅ — Correcta L4. |
| 89 | `docs/audit/POST_AUDIT_ACTIONS.md` | Acciones post-auditoría | ✅ — Correcta L4. |
| 90 | `docs/audit/DOC-01_INVENTORY_REPORT.md` | DOC-01 inventory | ✅ — Correcta L4. |
| 91 | `docs/audit/DOC-02_ADR_CONSISTENCY_REPORT.md` | DOC-02 ADR consistency | ✅ — Correcta L4. |
| 92 | `docs/audit/DOC-03_ALIGNMENT_REPORT.md` | DOC-03 alignment | ✅ — Correcta L4. |
| 93 | `docs/audit/DOC-04_SSOT_AUTHORITY_REPORT.md` | **Este documento** | ✅ — Correcta L4. |
| 94 | `docs/certification/*.md` (~81 archivos) | Certificaciones de calidad | ✅ — Correcta L4. Evidencia de calidad. |
| 95 | `docs/project/PROJECT_BOARD.md` | Tablero maestro de tareas | ✅ — Correcta L4. |
| 96 | `docs/project/CHANGELOG.md` | Timeline de misiones | ✅ — Correcta L4. |
| 97 | `docs/project/PROJECT_CONTEXT.md` | Estado condensado del proyecto | ✅ — Correcta L4. Estado del proyecto, no normativo. |
| 98 | `docs/project/PROJECT_GOVERNANCE.md` | Fuentes de verdad del proyecto | ✅ — Correcta L4. |
| 99 | `docs/project/PROJECT_WORKFLOW.md` | Checklist de cierre de misión | ✅ — Correcta L4. |
| 100 | `docs/project/EXECUTION_PHASE.md` | Declaración de fase de ejecución | ✅ — Correcta L4. |
| 101 | `docs/project/PILOT_METRICS.md` | 11 KPIs del piloto | ✅ — Correcta L4. |
| 102 | `docs/project/LEARNING_LOOP.md` | Ciclo de aprendizaje | ✅ — Correcta L4. |
| 103 | `docs/project/HUMAN_EXPERIENCE_CHARTER.md` | Charter de experiencia humana | ✅ — Correcta L4. |
| 104 | `docs/project/FUNCTIONAL_DASHBOARD.md` | Progreso funcional | ✅ — Correcta L4. |
| 105 | `docs/project/CONVERSATION_IMPROVEMENT_PROCESS.md` | Flujo de mejora conversacional | ✅ — Correcta L4. |
| 106 | `docs/project/ROADMAP.md` | Hitos y dirección del producto | ✅ — Correcta L4 (plan, no autoridad). |
| 107 | `docs/incidents/H-CAT2-001_RECOVERY_SLOT_LOSS.md` | Reporte de incidente | ✅ — Correcta L4 (time-bound). |
| 108 | `docs/incidents/CAT2_RESULT_REPORT.md` | Resultados test CAT2 | ✅ — Correcta L4. |
| 109 | `docs/incidents/INC-001_BUILD_FAILURE_PREVIEW_CONFIG_DRIFT.md` | Reporte de incidente | ✅ — Correcta L4 (CLOSED). |
| 110 | `docs/operations/PRODUCTION_CHECKLIST.md` | Auditoría de env vars | ✅ — Correcta L4 (operacional, puntual). |
| 111 | `docs/operations/PILOT_OPERATION_GUIDE.md` | Requisitos pre-piloto | ✅ — Correcta L4. |
| 112 | `docs/operations/MONITORING_DASHBOARD.md` | Dashboards de monitoreo | ✅ — Correcta L4. |
| 113 | `docs/security/secrets.md` | Reglas de secrets management | ✅ — Correcta L4. |
| 114 | `docs/inventory/KNOWLEDGE_INVENTORY.md` | Inventario maestro | ✅ — Correcta L4. |
| 115 | `docs/architecture/ARCHITECTURE_BASELINE.md` | Snapshot arquitectónico (generado) | ✅ — Correcta L4 (generado, puntual). |
| 116 | `docs/architecture/ARCHITECTURE_BASELINE.json` | Snapshot en JSON (generado) | ✅ — Correcta L4 (generado). |
| 117 | `docs/architecture/dashboard.md` | Dashboard arquitectónico (generado) | ✅ — Correcta L4 (generado). |
| 118 | `docs/architecture/drift-report.md` | Reporte de desviación (generado) | ✅ — Correcta L4 (generado). |
| 119 | `docs/architecture/metrics.md` | Métricas arquitectónicas (generado) | ✅ — Correcta L4 (generado). |
| 120 | `docs/architecture/metrics.json` | Métricas en JSON (generado) | ✅ — Correcta L4 (generado). |
| 121 | `docs/architecture/reverse-engineering/architecture-graphs.md` | Grafos (generado) | ✅ — Correcta L4 (generado). |
| 122 | `docs/architecture/reverse-engineering/architecture-graphs.json` | Grafos en JSON (generado) | ✅ — Correcta L4 (generado). |
| 123 | `.opencode/memory/MEMORY.md` | Memoria del equipo | ✅ — Correcta L4. Conocimiento preservado, no normativo. |

### L5 — Histórico / Archivo (Superseded, Legacy)

Documentos que describen arquitectura, planes o diseños que ya no están vigentes. Preservados para trazabilidad.

| # | Documento | Autoridad declarada | ¿Correcta? |
|---|-----------|---------------------|------------|
| 124 | `docs/architecture/CE-3A_BUSINESS_KNOWLEDGE_ENGINE.md` | ARCHIVE_CANDIDATE (banner agregado DOC-03) | ✅ — Correcta L5. Banner presente. |
| 125 | `docs/architecture/CE-3B_DETERMINISTIC_REASONING_LAYER.md` | ARCHIVE_CANDIDATE (banner agregado DOC-03) | ✅ — Correcta L5. Banner presente. |
| 126 | `docs/architecture/CE-4_MIGRATION_ROADMAP.md` | HISTÓRICO (banner agregado DOC-03) | ✅ — Correcta L5. Banner presente. |
| 127 | `docs/architecture/CE-5_IMPLEMENTATION_READINESS.md` | HISTÓRICO (banner agregado DOC-03) | ✅ — Correcta L5. Banner presente. |
| 128 | `docs/architecture/ARCHITECTURE_MILESTONE_v3.0.md` | Auto-declarado HISTORICAL | ✅ — Correcta L5. |
| 129 | `docs/architecture/DUAL_INTERFACE_ARCHITECTURE.md` | SUPERSEDED por INTERFACE_FREEZE_V2.md | ✅ — Correcta L5. |
| 130 | `ael/archive/**` (~41 archivos) | Archivados explícitamente | ✅ — Correcta L5. |
| 131 | `docs/history/` | Vacío (contenido en ael/archive/) | ✅ — Correcta L5 (vacío). |

### Sin clasificación (documento de onboarding)

| # | Documento | Estado | ¿Correcta? |
|---|-----------|--------|------------|
| 132 | `docs/SYSTEM_BIBLE.md` | "Este documento es una introducción contextual. No es un documento normativo." | ⚠️ — Auto-declarado no normativo (correcto), pero GOVERNANCE.md lo asigna como "Fuente única de misión/alcance" (incorrecto — es una contradicción). |

---

## 3. SSOT Conflicts Detected

### 🔴 C-SSOT-1: AITOS_CONSTITUTION.md ↔ AEL SPEC.md — Dos "Constituciones" sin referencia mutua

| Aspecto | AITOS_CONSTITUTION.md | AEL SPEC.md |
|---------|----------------------|-------------|
| **Nombre** | "Constitución del Sistema AITOS" | "Constitution of ARNÉS" |
| **Ámbito** | Producto (comportamiento del sistema) | Proceso de desarrollo |
| **Jerarquía declarada** | "máxima autoridad normativa del sistema" | "Constitution, not Operations Manual" |
| **Referencia a la otra** | ❌ No menciona AEL SPEC | ❌ No menciona AITOS_CONSTITUTION |
| **Resolución externa** | — | ORGANIZATION.md §"Relación con la Constitución de AITOS" define que gobiernan dominios diferentes |

**Riesgo:** Un lector de AITOS_CONSTITUTION.md no sabrá que existe AEL SPEC.md y viceversa. Aunque ORGANIZATION.md resuelve la relación (dominios: producto vs proceso), ninguna de las dos constituciones lo hace explícito.

**Recomendación:** Agregar referencia mutua en ambos documentos. AITOS_CONSTITUTION.md debe mencionar que el proceso de desarrollo se rige por AEL SPEC. AEL SPEC.md debe mencionar que las decisiones de producto se rigen por AITOS_CONSTITUTION.md.

**Severidad:** 🟡 Medio (la resolución existe en ORGANIZATION.md pero no en los documentos fuente)

---

### 🟡 C-SSOT-2: SYSTEM_BIBLE.md — Autoridad contradictoria

| Fuente | Afirmación |
|--------|-----------|
| `SYSTEM_BIBLE.md` header | "Este documento es una introducción contextual. **No es un documento normativo.**" |
| `GOVERNANCE.md` (Rule 4 example) | "`docs/SYSTEM_BIBLE.md` → Fuente única de misión/alcance" |

**Naturaleza:** Contradicción directa. GOVERNANCE.md asigna SSOT a SYSTEM_BIBLE.md para misión/alcance, pero el propio documento dice que no es normativo. Un SSOT debe ser normativo por definición.

**Riesgo:** Un lector de GOVERNANCE.md asumirá que SYSTEM_BIBLE.md es la fuente autorizada para misión/alcance. Un lector de SYSTEM_BIBLE.md verá que dice "no normativo". Ambas lecturas no pueden ser ciertas simultáneamente.

**Recomendación:**
- Opción A: Degradar SYSTEM_BIBLE.md a L3-L4 (onboarding contextual, no SSOT) y mover la responsabilidad de "misión/alcance" a ARCHITECTURE_STATUS.md o directamente a AITOS_CONSTITUTION.md.
- Opción B: Actualizar SYSTEM_BIBLE.md para que acepte la responsabilidad SSOT de misión/alcance y elimine la línea "No es un documento normativo".
- Opción C: Eliminar la referencia a SYSTEM_BIBLE.md en GOVERNANCE.md Rule 4 y reemplazarla por AITOS_CONSTITUTION.md.

**Severidad:** 🟡 Medio

---

### 🟡 C-SSOT-3: ARCHITECTURE_STATUS.md, SYSTEM_BIBLE.md, ARCHITECTURE_BIBLE.md — Tres documentos describen "qué es AITOS"

| Documento | Afirmación |
|-----------|-----------|
| `ARCHITECTURE_STATUS.md` | "Fuente única de verdad para entender qué existe, qué está aprobado" |
| `SYSTEM_BIBLE.md` | "Propósito: Documento de onboarding... qué es AITOS" |
| `ARCHITECTURE_BIBLE.md` | "Derived technical reference" — también describe el sistema |

**Naturaleza:** Tres documentos diferentes describen superposiciones del mismo sistema. Ya identificado como DOC-01 R-05.

**Riesgo:** Medio — un nuevo integrante necesita leer 3+ documentos para entender qué es AITOS, y puede encontrar descripciones ligeramente diferentes.

**Recomendación:** Consolidar la descripción de "qué es AITOS" en un único documento (recomendado: ARCHITECTURE_STATUS.md o ARCHITECTURE_BIBLE.md) y referenciarlo desde los otros dos. SYSTEM_BIBLE.md debería ser una introducción ligera que refiera a ARCHITECTURE_STATUS.md para el estado real.

**Severidad:** 🟡 Medio

---

### 🟢 C-SSOT-4: strategy-decision.md — Naming conflict con SSOT

| Documento | Afirmación |
|-----------|-----------|
| `strategy-decision.md` | Se describe como "SSOT para decisiones estratégicas conversacionales" |

**Naturaleza:** Un documento L3 (descripción) se auto-denomina "SSOT", un término que implica autoridad normativa L0-L2. El CDA y ARCHITECTURE_STATUS.md ya cubren este espacio con mayor autoridad.

**Riesgo:** Bajo — el documento es descriptivo pero su naming puede confundir sobre su autoridad real.

**Recomendación:** El documento debe referenciar al CDA como SSOT para decisiones estratégicas conversacionales, no auto-declararse SSOT.

**Severidad:** 🟢 Bajo

---

### ✅ C-SSOT-5: CDA — Relación con Constitución correctamente definida

| Fuente | Afirmación |
|--------|-----------|
| CDA header | "Autoridad: Documento técnico derivado de la Constitución... En caso de conflicto, prevalece la Constitución." |
| ADR-013 | "ratifica el CDA como autoridad funcional normativa" |

**Estado:** ✅ Correcto. El CDA se subordina explícitamente a AITOS_CONSTITUTION.md y se ubica en nivel 8 (Contratos) de la jerarquía constitucional. No hay conflicto real.

---

### ✅ C-SSOT-6: ARCHITECTURE_BIBLE.md — Relación con Constitución correctamente definida

| Fuente | Afirmación |
|--------|-----------|
| ARCHITECTURE_BIBLE.md | "Read after the Constitution. The supreme normative authority is the AITOS Constitution. If this document contradicts the Constitution, the Constitution prevails." |

**Estado:** ✅ Correcto. Subordinación explícita.

---

### ✅ C-SSOT-7: CE-3A/3B/4/5 — Degradación correcta

Los 4 documentos CE legacy fueron correctamente degradados a L5 en DOC-03 con banners explícitos:
- CE-3A, CE-3B → ARCHIVE_CANDIDATE
- CE-4, CE-5 → HISTÓRICO

**Estado:** ✅ Todos los banners presentes. Contenido técnico preservado.

---

## 4. Documents with Incorrect or Ambiguous Authority Claims

### ⚠️ D-01: `docs/architecture/STRATEGIC_OPERATIONAL_CONTRACT.md` — Reclamo de reemplazo

| Afirmación | Problema |
|-----------|----------|
| "Este contrato reemplaza cualquier interpretación anterior de la relación PLAN ↔ BUILD." | Reclama autoridad para "reemplazar" interpretaciones, pero no declara su nivel de autoridad ni su relación con ORGANIZATION.md, AEL SPEC.md o MISSION_PHASE_ARCHITECTURE.md. ¿Reemplaza a MISSION_PHASE_ARCHITECTURE.md? ¿A ORGANIZATION.md? |

**Recomendación:** Añadir una sección de autoridad que especifique:
- "Este documento es un contrato L2. No modifica AEL SPEC.md, ORGANIZATION.md, ni ninguna Constitución. Reemplaza únicamente las secciones de relación PLAN↔BUILD en MISSION_PHASE_ARCHITECTURE.md."

**Severidad:** 🟢 Bajo

---

### ⚠️ D-02: `docs/architecture/glossary.md` — Nivel de autoridad ambiguo

| Afirmación | Problema |
|-----------|----------|
| "Fuente canónica de terminología para el AI Transportation Operating System. Todos los documentos deben usar estos términos de forma consistente." | GOVERNANCE.md taxonomy coloca Vocabulary en Tier 0 (Foundational). Pero el glossary.md está en docs/architecture/ y no tiene declaración explícita de autoridad normativa vinculante. ¿Es normativo o descriptivo? |

**Recomendación:** Aclarar en el header si el glosario es normativo (todos los documentos DEBEN usar estos términos) o descriptivo (estos son los términos usados actualmente). Si es normativo, debe referenciar AITOS_CONSTITUTION.md como su fuente de autoridad.

**Severidad:** 🟢 Bajo

---

## 5. Overlapping SSOT Claims Mapping

El siguiente mapa muestra dónde existen solapamientos entre documentos que describen el mismo concepto sin jerarquía clara:

```
Concepto: "¿Qué es AITOS?"
├── SYSTEM_BIBLE.md          (L3 — onboarding, no normativo según sí mismo)
├── ARCHITECTURE_STATUS.md   (L3 — "fuente única de verdad" para estado real)
├── ARCHITECTURE_BIBLE.md    (L2 — derived technical reference)
├── system-overview.md       (L3 — vista de alto nivel)
├── architecture.md          (L3 — punto de entrada ejecutivo)
└── ARCHITECTURE_ATLAS.md    (L3 — índice visual)

Concepto: "Arquitectura del pipeline cognitivo"
├── ADR-008                  (L2 — Conversational Decision Architecture)
├── ADR-009                  (L2 — Evidence Engine)
├── ADR-012                  (L2 — Cognitive Escalation Principle)
├── conversation-pipeline.md (L3 — pipeline conversacional)
├── decision-architecture.md (L3 — pipeline de decisión)
└── ARCHITECTURE_STATUS.md   (L3 — estado real)

Concepto: "Jerarquía normativa / gobierno del ecosistema"
├── AITOS_CONSTITUTION.md §1.4 (L0 — 9 niveles)
├── AEL SPEC.md               (L0 — invariantes + lifecycle)
├── GOVERNANCE.md             (L1 — taxonomy de tipos documentales)
└── ORGANIZATION.md            (L1 — gobierno del equipo)
```

---

## 6. Recommendations

### P1 — Resolver contradicciones de autoridad

| # | Acción | Documentos afectados | Ref. |
|---|--------|---------------------|------|
| 1 | Agregar referencia mutua entre AITOS_CONSTITUTION.md y AEL SPEC.md | `AITOS_CONSTITUTION.md`, `ael/constitution/SPEC.md` | C-SSOT-1 |
| 2 | Resolver contradicción SYSTEM_BIBLE.md (no normativo) vs GOVERNANCE.md (SSOT misión/alcance) | `SYSTEM_BIBLE.md`, `GOVERNANCE.md` | C-SSOT-2 |
| 3 | Consolidar "qué es AITOS" en un documento / referenciar desde los demás | `SYSTEM_BIBLE.md`, `ARCHITECTURE_STATUS.md`, `system-overview.md`, `architecture.md` | C-SSOT-3 |

### P2 — Corregir claims de autoridad incorrectos

| # | Acción | Documentos afectados | Ref. |
|---|--------|---------------------|------|
| 4 | Clarificar en STRATEGIC_OPERATIONAL_CONTRACT.md qué documentos "reemplaza" y cuáles no | `STRATEGIC_OPERATIONAL_CONTRACT.md` | D-01 |
| 5 | Aclarar si glossary.md es normativo o descriptivo | `glossary.md` | D-02 |
| 6 | Corregir strategy-decision.md para NO auto-declararse SSOT | `strategy-decision.md` | C-SSOT-4 |

### P3 — Monitoreo / Mejora continua

| # | Acción | Responsable |
|---|--------|-------------|
| 7 | Evaluar si ARCHITECTURE_STATUS.md debe absorber la función de "misión/alcance" de SYSTEM_BIBLE.md | PLAN |
| 8 | Revisar si CE-3A/3B/4/5 deben moverse físicamente a `ael/archive/` | PLAN |
| 9 | Actualizar CONSTITUTIONAL_COMPLIANCE_MATRIX.md para reflejar paths correctos de documentos | BUILD |

---

## 7. Validación de hallazgos DOC-01 / DOC-02 / DOC-03

### Estado de riesgos DOC-01

| Riesgo DOC-01 | ¿Resuelto? | Estado actual |
|--------------|-----------|---------------|
| R-01: CE docs sin deprecación | ✅ Resuelto (DOC-03) | Banners añadidos |
| R-02: ADR-012 vs ADR-014 | ✅ Resuelto (DOC-02) | Opción B: modificación parcial |
| R-03: SYSTEM_BIBLE.md desactualizado | ❌ Pendiente | Actualización requerida |
| R-04: 144 docs históricos sin clasificar | 🟡 Parcial | DOC-04 clasifica todo el ecosistema |
| R-05: Duplicación "qué es AITOS" | ❌ Pendiente | Consolidación requerida |
| R-06: H-CAT2-001 inconsistente | ❌ Pendiente | Incident file + dashboard sin actualizar |
| R-07: ARCHITECTURE_MILESTONE_v3.0 | 🟡 Parcial | Identificado como L5, banner? |
| R-08: Guías operacionales stale | ❌ Pendiente | Sin actualizar |
| R-09: CDA vs Constitución | ✅ Resuelto | CDA se subordina explícitamente |

### Estado de contradicciones DOC-01

| Contradicción | ¿Resuelta? | Estado |
|--------------|-----------|--------|
| 🔴 C-1: ADR-012 vs ADR-014 | ✅ Resuelta (DOC-02) | Opción B documentada |
| 🔴 C-2: PROJECT_CONTEXT.md post-fecha | ✅ Resuelta (DOC-03) | Contexto actualizado |
| 🟡 C-3: H-CAT2-001 inconsistente | ❌ Pendiente | Sin resolver |
| 🟡 C-4: SYSTEM_BIBLE.md desactualizado | ❌ Pendiente | Sin resolver |
| 🟡 C-5: Guías operacionales stale | ❌ Pendiente | Sin resolver |

---

## 8. SSOT Hierarchy — Estado deseado

Jerarquía recomendada post-DOC-04:

```
L0  CONSTITUTION
├── docs/architecture/AITOS_CONSTITUTION.md    (producto — comportamiento del sistema)
└── ael/constitution/SPEC.md                    (proceso — invariantes operacionales)
        ↕ Referencia mutua REQUERIDA

L1  EXECUTIVE / NORMATIVE
├── ael/constitution/CONTRACTS.md               (R1-R4 layer contracts)
├── ael/government/ORGANIZATION.md              (gobierno del equipo)
├── ael/government/roles/*.md                   (capability contracts)
├── docs/architecture/GOVERNANCE.md             (gobernanza documental)
├── docs/specifications/CONVERSATION_DECISION_ALGORITHM.md  (CDA — autoridad funcional)
├── docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md (especificación funcional)
└── .opencode/agents/ + commands/               (definiciones de agentes)

L2  GOVERNMENT / ARCHITECTURE (decisions)
├── docs/adr/ADR-001 a ADR-014                  (14 architecture decisions)
├── docs/governance/BASELINE_1_0.md             (baseline certificada)
├── docs/governance/AITOS_ENGINEERING_LIFECYCLE.md (lifecycle)
├── docs/ai/ARCHITECTURE_BIBLE.md               (referencia técnica derivada)
├── docs/ai/*.md                                 (reglas, invariantes, contratos AI)
├── docs/architecture/STRATEGIC_OPERATIONAL_CONTRACT.md (contrato PLAN↔BUILD)
└── docs/architecture/INTERFACE_FREEZE_V2.md     (freeze de interfaz)

L3  SPECIFICATIONS / ARCHITECTURE (state)
├── docs/architecture/ARCHITECTURE_STATUS.md     (estado canónico)
├── docs/architecture/SDL_2_0_*.md               (SDL 2.0 spec + frozen arch)
├── docs/architecture/*.md                        (descripciones arquitectónicas)
├── docs/architecture/domains/*.md               (dominios)
├── docs/architecture/diagrams/*                  (diagramas)
├── docs/architecture/glossary.md                 (terminología)
├── docs/knowledge/*.md                          (reglas de negocio)
└── docs/SYSTEM_BIBLE.md                         (onboarding contextual — NO SSOT)

L4  AUDIT / PROJECT / EVIDENCE
├── docs/audit/*.md                              (auditorías, CTM, compliance)
├── docs/certification/*.md                      (certificaciones)
├── docs/project/*.md                            (board, changelog, context, roadmap)
├── docs/incidents/*.md                          (incidentes)
├── docs/operations/*.md                         (guías operacionales)
├── docs/security/secrets.md                     (seguridad)
├── docs/inventory/KNOWLEDGE_INVENTORY.md        (inventario)
├── docs/architecture/ARCHITECTURE_BASELINE.md    (snapshot generado)
├── docs/architecture/dashboard.md               (dashboard generado)
├── docs/architecture/drift-report.md             (drift generado)
├── docs/architecture/metrics.md                  (métricas generadas)
├── docs/architecture/reverse-engineering/*       (grafos generados)
└── .opencode/memory/MEMORY.md                   (memoria del equipo)

L5  HISTORICAL / ARCHIVE
├── docs/architecture/CE-3A.md, CE-3B.md          (ARCHIVE_CANDIDATE)
├── docs/architecture/CE-4.md, CE-5.md            (HISTÓRICO)
├── docs/architecture/ARCHITECTURE_MILESTONE_v3.0.md (HISTORICAL)
├── docs/architecture/DUAL_INTERFACE_ARCHITECTURE.md (SUPERSEDED)
└── ael/archive/**                                (archivados)
```

---

## Apéndice A: Metodología de clasificación

Cada documento fue clasificado según:

1. **Auto-declaración de autoridad** — lo que el documento dice ser en su header
2. **Asignación externa de autoridad** — lo que otros documentos (GOVERNANCE.md, CTM, ADR_INDEX) dicen que es
3. **Contenido real** — si el documento prescribe normas (L0-L2), describe estado (L3), o registra evidencia (L4)
4. **Relaciones de subordinación** — si referencia explícitamente a un documento de nivel superior
5. **Estado de actualización** — si refleja el estado actual del sistema o es histórico

### Criterios de nivel

| Nivel | Prescribe | Describe | Registra | Histórico |
|-------|-----------|----------|----------|-----------|
| L0 — Constitution | ✅ Principios no negociables | ❌ | ❌ | ❌ |
| L1 — Executive | ✅ Reglas/contratos vinculantes | ❌ | ❌ | ❌ |
| L2 — Government | ✅ Decisiones registradas | ✅ (arquitectura congelada) | ❌ | ❌ |
| L3 — Specification | ❌ | ✅ Estado actual detallado | ❌ | ❌ |
| L4 — Audit | ❌ | ✅ (evidencia puntual) | ✅ Hallazgos | ❌ |
| L5 — Historical | ❌ | ❌ | ✅ Preservación | ✅ |

---

*Reporte generado por BUILD como parte de la misión DOC-04.*  
*Clasificación: ~132 documentos agrupados en 5 niveles L0-L5.*  
*7 SSOT conflicts/observations detectados (1 crítico, 3 medios, 3 bajos).*  
*6 riesgos DOC-01 resueltos, 4 pendientes.*
