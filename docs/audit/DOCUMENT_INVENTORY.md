# Documentary Baseline Inventory — AITOS

> CGP-0: Constitutional Governance Program — Baseline
> Generado: 2026-07-20
> Propósito: Fotografía completa del estado documental actual del proyecto.
> Restricción: Solo observación. No modificación. No corrección.

---

## 1. Resumen ejecutivo

Se relevaron **~260 documentos activos** distribuidos en 18 directorios de `docs/`, más 52 archivos en `ael/`, más 17 archivos de configuración y agentes en `.opencode/` y raíz.

La documentación de AITOS presenta **sobredensidad documental**: múltiples documentos definen el mismo dominio (conversación, arquitectura, QA) desde diferentes órbitas, sin jerarquía explícita de autoridad en muchos casos.

Se identificaron **4 duplicaciones documentales potenciales**, **~50 documentos candidatos a revisión** (históricos, draft, experimentales, legacy), y **5 riesgos iniciales** que deberán abordarse en CGP-1.

| Métrica | Valor |
|---------|-------|
| Total documentos `docs/` | ~193 |
| Total documentos `ael/` | 52 |
| Total documentos `.opencode/` (sin node_modules) | 17 |
| Total documentos raíz (config, README) | 17 |
| **Total aproximado** | **~260** |
| Directorios en `docs/` | 16 + 3 subdirectorios |
| Extensiones | `.md` (99%), `.sh`, `.json`, `.jsonc`, `.ts`, `.mjs`, `.svg`, `.mmd` |
| Documentos candidatos a revisión | ~50 |
| Duplicaciones detectadas | 4 |
| Riesgos identificados | 5 |

---

## 2. Distribución por categorías

| Categoría | Directorio | Archivos | Estado predominante |
|-----------|-----------|----------|---------------------|
| **Constitucionales** | `docs/` (raíz), `docs/architecture/` | 3 | Vigente |
| **Especificaciones** | `docs/specification/`, `docs/specifications/` | 2 | Vigente / Normativo |
| **Decisiones Arquitectónicas** | `docs/adr/` | 14 | 12 Accepted, 2 Extended |
| **Arquitectura** | `docs/architecture/` | ~70 | Mixto (vigente + histórico + draft) |
| **Certificación / QA** | `docs/certification/` | ~50 | Mixto (histórico + vigente) |
| **Proyecto** | `docs/project/` | 11 | Vigente |
| **IA Context Pack** | `docs/ai/` | 7 | Vigente |
| **Conocimiento** | `docs/knowledge/` | 7 | Vigente |
| **Incidentes** | `docs/incidents/` | 3 | Vigente (1 abierto) |
| **Operaciones** | `docs/operations/` | 3 | Vigente |
| **Historia** | `docs/history/` | 8 | Histórico |
| **Seguridad** | `docs/security/` | 1 | Vigente |
| **Inventario** | `docs/inventory/` | 1 | Vigente |
| **Auditoría** | `docs/audit/` | 1 | Vigente |
| **Ecosistema AEL** | `ael/` | 52 | Mixto (vigente + draft + histórico) |
| **Agentes / Prompts** | `.opencode/agents/`, `.opencode/commands/` | 12 | Vigente |
| **Configuración raíz** | `/` | 17 | Vigente |

---

## 3. Inventario completo

### 3.1 Documentos Constitucionales y de Identidad

| # | Ruta | Propósito | Estado | Categoría |
|---|------|-----------|--------|-----------|
| 1 | `docs/SYSTEM_BIBLE.md` | "Non-technical constitution" del sistema. Describe propósito, principios y comportamiento esperado en lenguaje accesible. | VIGENTE | Constitucional |
| 2 | `docs/architecture/AITOS_CONSTITUTION.md` | Constitución funcional y arquitectónica. Marco normativo superior. Define principios, RF, RNF, invariantes, contratos. | VIGENTE | Constitucional / Normativo |
| 3 | `README.md` | Descripción técnica del proyecto: stack, scripts, variables de entorno, arquitectura `src/`. | VIGENTE | Identidad técnica |

### 3.2 Especificaciones Funcionales

| # | Ruta | Propósito | Estado | Categoría |
|---|------|-----------|--------|-----------|
| 4 | `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` | Fuente de verdad funcional. Describe comportamiento esperado, RF, RNF, principios conversacionales (P1-P10), pipeline, invariantes I-C1 a I-C12. (1746 líneas) | VIGENTE (normativo) | Especificación |
| 5 | `docs/specifications/CONVERSATION_DECISION_ALGORITHM.md` | Algoritmo de decisión conversacional normativo. 11 pasos, I-01 a I-15, reglas de merge, prioridades. Ratificado por ADR-013. (1088 líneas) | VIGENTE / CERTIFIED | Especificación / Normativo |

### 3.3 Architecture Decision Records

| # | Ruta | Decisión | Estado |
|---|------|----------|--------|
| 6 | `docs/adr/001-layered-architecture.md` | Strict layered dependency direction | ACCEPTED |
| 7 | `docs/adr/002-database-facade.md` | DB access through database.ts | ACCEPTED (with gaps) |
| 8 | `docs/adr/003-learning-domain.md` | Learning is first-class bounded context | ACCEPTED |
| 9 | `docs/adr/004-service-boundaries.md` | Strict dependency order, no circular deps | ACCEPTED (with gaps) |
| 10 | `docs/adr/005-ai-first-interpretation.md` | LLM with raw data, no heuristic patches | ACCEPTED |
| 11 | `docs/adr/006-schema-parity.md` | initSchema() must reflect production DB | EXTENDED |
| 12 | `docs/adr/007-conversation-interpreter.md` | New pipeline stage between CORE and Extraction | ACCEPTED |
| 13 | `docs/adr/008-conversational-decision-architecture.md` | computeStrategyDecision() is SSOT. Frozen. | ACCEPTED (frozen) |
| 14 | `docs/adr/009-evidence-engine-architecture.md` | 7-layer cognitive pipeline (Signal→Decision). Frozen. | ACCEPTED (frozen) |
| 15 | `docs/adr/010-memory-architecture.md` | Cognitive memory architecture (14 invariants M-1 to M-14) | ACCEPTED (0% implementado) |
| 16 | `docs/adr/011-reflection-elimination.md` | Reflection eliminated as independent layer | ACCEPTED |
| 17 | `docs/adr/012-cognitive-escalation-principle.md` | BKE → DRL → Groq → Gemini stack | ACCEPTED |
| 18 | `docs/adr/013-conversation-decision-algorithm.md` | CDA ratified as normative functional authority | ACCEPTED |
| 19 | `docs/adr/014-experimental-layers-hygiene.md` | Remove Pattern Discovery, BKE, DRL; keep EE shadow | ACCEPTED |

### 3.4 Arquitectura (docs/architecture/)

#### 3.4.1 Contratos Arquitectónicos

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 20 | `docs/architecture/MISSION_CLOSURE_CONTRACT.md` | Learning trigger contract: only after SDL declares CLOSED | VIGENTE |
| 21 | `docs/architecture/MISSION_PHASE_ARCHITECTURE.md` | PLAN→BUILD two-phase architecture contract | VIGENTE |
| 22 | `docs/architecture/STRATEGIC_OPERATIONAL_CONTRACT.md` | PLAN↔BUILD information contract (knowledge→decision→evidence) | VIGENTE |
| 23 | `docs/architecture/DUAL_INTERFACE_ARCHITECTURE.md` | OpenCode platform + AITOS ecosystem coexistence | VIGENTE |
| 24 | `docs/architecture/INTERFACE_FREEZE_V2.md` | Only PLAN and BUILD visible. SDL/AEL internal. | VIGENTE (frozen) |

#### 3.4.2 Documentos de Estado Arquitectónico

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 25 | `docs/architecture/ARCHITECTURE_STATUS.md` | Documento canónico del estado arquitectónico real. 15 secciones. Document inventory incluido. | VIGENTE |
| 26 | `docs/architecture/ADR_INDEX.md` | Index navegable de los 14 ADR + gaps conocidos | VIGENTE |
| 27 | `docs/architecture/ARCHITECTURE_BASELINE.md` | Snapshot arquitectónico (2026-07-06) | VIGENTE |
| 28 | `docs/architecture/ARCHITECTURE_ATLAS.md` | Mapa arquitectónico detallado | VIGENTE |
| 29 | `docs/architecture/ARCHITECTURE_MILESTONE_v2.0.md` | Milestone v2.0 — histórico | HISTÓRICO |
| 30 | `docs/architecture/ARCHITECTURE_MILESTONE_v3.0.md` | Milestone v3.0 — vigente | VIGENTE |
| 31 | `docs/architecture/GOVERNANCE.md` | Reglas de gobierno arquitectónico | VIGENTE |
| 32 | `docs/architecture/DECISION_OWNERSHIP_MATRIX.md` | Quién decide qué | VIGENTE |
| 33 | `docs/architecture/DEVELOPMENT_ECOSYSTEM_ARCHITECTURE.md` | Freeze V1 del ecosistema | LEGACY/ARCHIVO |
| 34 | `docs/architecture/DEFERRED_MIDDLEWARE.md` | Decisión consciente: middleware diferido a post-v1 | VIGENTE |

#### 3.4.3 Mapas y Modelos

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 35 | `docs/architecture/system-map.md` | Mapa del sistema completo | VIGENTE |
| 36 | `docs/architecture/capability-map.md` | Mapa de capacidades | VIGENTE |
| 37 | `docs/architecture/knowledge-map.md` | Mapa de conocimiento | VIGENTE |
| 38 | `docs/architecture/engines.md` | Motores del sistema | VIGENTE |
| 39 | `docs/architecture/maturity-model.md` | Modelo de madurez | VIGENTE |
| 40 | `docs/architecture/design-principles.md` | Principios de diseño derivados de ADRs | VIGENTE |
| 41 | `docs/architecture/fractal-architecture.md` | Arquitectura fractal | VIGENTE |
| 42 | `docs/architecture/bounded-contexts.md` | Contextos delimitados | VIGENTE |
| 43 | `docs/architecture/operational-model.md` | Modelo operacional | VIGENTE |
| 44 | `docs/architecture/decision-architecture.md` | Arquitectura de decisión | VIGENTE |
| 45 | `docs/architecture/strategy-decision.md` | Decisión estratégica | VIGENTE |
| 46 | `docs/architecture/conversation-pipeline.md` | Pipeline conversacional | VIGENTE |
| 47 | `docs/architecture/glossary.md` | Glosario arquitectónico | VIGENTE |
| 48 | `docs/architecture/architecture.md` | Documento de arquitectura (base) | VIGENTE |
| 49 | `docs/architecture/handler-context.md` | Contexto del handler | VIGENTE |
| 50 | `docs/architecture/system-overview.md` | Visión general del sistema | VIGENTE |
| 51 | `docs/architecture/drift-report.md` | Reporte de desviación arquitectónica | VIGENTE |
| 52 | `docs/architecture/documentation-coverage.md` | Cobertura documental | VIGENTE |
| 53 | `docs/architecture/dashboard.md` | Dashboard arquitectónico | VIGENTE |
| 54 | `docs/architecture/metrics.md` | Métricas arquitectónicas | VIGENTE |
| 55 | `docs/architecture/metrics.json` | Métricas en JSON | VIGENTE |

#### 3.4.4 PR Series — Auditorías Conceptuales (histórico/futuro)

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 56 | `docs/architecture/PR-7A..7G_LEARNING_*` (7 docs) | Pattern Discovery design (from PR-7) | DISEÑO FUTURO / HISTÓRICO |
| 57 | `docs/architecture/PR-8A..8G_GOALS_*` (7 docs) | Goals elimination audit | HISTÓRICO (capa eliminada) |
| 58 | `docs/architecture/PR-9A..9G_PLANNING_*` (7 docs) | Planning elimination audit | HISTÓRICO (capa eliminada) |
| 59 | `docs/architecture/PR-10A..10F_BOUNDARY_*` (6 docs) | Boundary elimination audit | HISTÓRICO (entidad eliminada) |
| 60 | `docs/architecture/PR-11_COGNITIVE_REALITY_ALIGNMENT.md` | Cognitive Reality Alignment | HISTÓRICO |
| 61 | `docs/architecture/PR-12_*` (5 docs) | Conversational Experience Audit series | VIGENTE / DISEÑO |
| 62 | `docs/architecture/PR-13_ATR-1_ARCHITECTURE_TRANSITION.md` | Architecture Transition | VIGENTE |
| 63 | `docs/architecture/S1A_GLOBAL_IRREDUCIBILITY_AUDIT.md` | Global Irreducibility Audit | HISTÓRICO |
| 64 | `docs/architecture/REVERSE_ENGINEERING_REPORT.md` | Reporte de reverse engineering | VIGENTE |
| 65 | `docs/architecture/CE-1_COGNITIVE_EFFICIENCY_AUDIT.md` | Cognitive Efficiency Audit | VIGENTE (baseline) |
| 66 | `docs/architecture/CE-2_INEVITABILITY_CLASSIFICATION.md` | Inevitability Classification | VIGENTE |
| 67 | `docs/architecture/CE-3A_BUSINESS_KNOWLEDGE_ENGINE.md` | Business Knowledge Engine design | DISEÑO |
| 68 | `docs/architecture/CE-3B_DETERMINISTIC_REASONING_LAYER.md` | Deterministic Reasoning Layer design | DISEÑO |
| 69 | `docs/architecture/CE-4_MIGRATION_ROADMAP.md` | Migration roadmap | DISEÑO FUTURO |
| 70 | `docs/architecture/CE-5_IMPLEMENTATION_READINESS.md` | Implementation Readiness | DISEÑO |
| 71 | `docs/architecture/ARR-1_MEMORY_READINESS.md` | Memory Readiness | DISEÑO |
| 72 | `docs/architecture/FCER-1_FIRST_COGNITIVE_EVIDENCE_REPORT.md` | First Cognitive Evidence Report | DISEÑO |
| 73 | `docs/architecture/IDA-1_INTERNAL_DEPENDENCY_AUDIT.md` | Internal Dependency Audit | VIGENTE |
| 74 | `docs/architecture/IDA-2_DEPENDENCY_REFACTOR_EXECUTION.md` | Dependency Refactor Execution | VIGENTE |
| 75 | `docs/architecture/IM-0_MEMORY_IMPLEMENTATION_SCOPE.md` | Memory Implementation Scope | DISEÑO |
| 76 | `docs/architecture/IM-1_CLOSURE_REPORT.md` | Memory IM-1 Closure Report | DISEÑO |
| 77 | `docs/architecture/MOV-1_MEMORY_OPERATIONAL_VALIDATION.md` | Memory Operational Validation | DISEÑO |
| 78 | `docs/architecture/MRC-1_MEMORY_READ_CONTRACT_ARCHITECTURE.md` | Memory Read Contract Architecture | DISEÑO |
| 79 | `docs/architecture/OP-1_COGNITIVE_FEATURE_FLAG_ROLLOUT.md` | Cognitive Feature Flag Rollout | DISEÑO |
| 80 | `docs/architecture/PAA-1_PATTERN_ACCEPTANCE_AUDIT.md` | Pattern Acceptance Audit | DISEÑO |
| 81 | `docs/architecture/PBA-1_PROJECTION_BOUNDARY_AUDIT.md` | Projection Boundary Audit | DISEÑO |
| 82 | `docs/architecture/PDE-1_PATTERN_DISCOVERY_EXECUTION.md` | Pattern Discovery Execution | DISEÑO |
| 83 | `docs/architecture/PD-IM-0_PATTERN_DISCOVERY_IMPLEMENTATION.md` | PD Implementation Scope | DISEÑO |
| 84 | `docs/architecture/POA-1_PATTERN_ONTOLOGY_AUDIT.md` | Pattern Ontology Audit | DISEÑO |

#### 3.4.5 Diagramas

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 85 | `docs/architecture/DIAGRAMS.md` | Índice de diagramas | VIGENTE |
| 86-113 | `docs/architecture/diagrams/` (28 archivos) | Diagramas: mmd, svg, md descriptivos | VIGENTE |
| 114 | `docs/architecture/diagrams/README.md` | Guía de diagramas | VIGENTE |

#### 3.4.6 Dominios

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 115 | `docs/architecture/domains/dispatch.md` | Dispatch domain | VIGENTE |
| 116 | `docs/architecture/domains/geo.md` | Geo domain | VIGENTE |
| 117 | `docs/architecture/domains/pricing.md` | Pricing domain | VIGENTE |
| 118 | `docs/architecture/domains/session.md` | Session domain | VIGENTE |
| 119 | `docs/architecture/domains/trip.md` | Trip domain | VIGENTE |

#### 3.4.7 Reverse Engineering

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 120 | `docs/architecture/reverse-engineering/` (3 archivos) | Reportes de reverse engineering | VIGENTE |

### 3.5 Certificación / QA

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 121 | `docs/certification/CERTIFICATION_REGISTRY.md` | Registro central de certificación. SSOT de estado de certificación. | VIGENTE |
| 122 | `docs/certification/QA_GOVERNANCE.md` | Reglas de gobernanza QA | VIGENTE |
| 123 | `docs/certification/TECHNICAL_DEBT_BASELINE.md` | Línea base de deuda técnica | VIGENTE |
| 124 | `docs/certification/H0A_STAGING_HARDENING_AUDIT.md` | Staging Hardening Audit (7 áreas) | VIGENTE |
| 125 | `docs/certification/CAT_CERTIFICATION_REGISTER.md` | CAT certification register | VIGENTE |
| 126 | `docs/certification/QA1_FUNCTIONAL_CERTIFICATION.md` | QA1 Functional Certification | HISTÓRICO |
| 127 | `docs/certification/CX-1_CONVERSATION_EXPERIENCE_CERTIFICATION.md` | CX-1 Certification | HISTÓRICO |
| 128-178 | `docs/certification/` (~50 restantes) | Auditorías: BUG_AUDIT, CONTEXT_LOSS, CLEANUP, COVERAGE, DB, etc. | MIXTO (mayoría históricos puntuales) |

### 3.6 Proyecto

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 179 | `docs/project/PROJECT_CONTEXT.md` | Estado vigente condensado del proyecto | VIGENTE |
| 180 | `docs/project/PROJECT_BOARD.md` | Tablero de tareas y prioridades | VIGENTE |
| 181 | `docs/project/CHANGELOG.md` | Historial de cambios | VIGENTE |
| 182 | `docs/project/HUMAN_EXPERIENCE_CHARTER.md` | Carta de experiencia humana | VIGENTE |
| 183 | `docs/project/PROJECT_GOVERNANCE.md` | Gobernanza del proyecto | VIGENTE |
| 184 | `docs/project/PROJECT_WORKFLOW.md` | Workflow del proyecto | VIGENTE |
| 185 | `docs/project/PILOT_METRICS.md` | Métricas del piloto | VIGENTE |
| 186 | `docs/project/LEARNING_LOOP.md` | Ciclo de aprendizaje | VIGENTE |
| 187 | `docs/project/CONVERSATION_IMPROVEMENT_PROCESS.md` | Proceso de mejora conversacional | VIGENTE |
| 188 | `docs/project/EXECUTION_PHASE.md` | Fase de ejecución | VIGENTE |
| 189 | `docs/project/FUNCTIONAL_DASHBOARD.md` | Dashboard funcional | VIGENTE |
| 190 | `docs/ROADMAP.md` | Roadmap del proyecto | VIGENTE |

### 3.7 IA Context Pack

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 191 | `docs/ai/README.md` | Índice y orden de lectura del Context Pack | VIGENTE |
| 192 | `docs/ai/ARCHITECTURE_BIBLE.md` | "Minimum required context" para IA. Principios, capas, dependencias prohibidas. | VIGENTE |
| 193 | `docs/ai/ARCHITECTURE_RULES.md` | Reglas estrictas derivadas del código | VIGENTE |
| 194 | `docs/ai/ENGINE_CONTRACTS.md` | Contratos entre motores: inputs, outputs, invariantes | VIGENTE |
| 195 | `docs/ai/INVARIANTS.md` | Enunciados que deben permanecer verdaderos | VIGENTE |
| 196 | `docs/ai/DECISION_TREE.md` | Árbol de decisión en tiempo de ejecución | VIGENTE |
| 197 | `docs/ai/QUALITY_GATE.md` | Checklist para cada modificación | VIGENTE |
| 198 | `docs/ai/COMMON_FAILURES.md` | Errores a evitar | VIGENTE |

### 3.8 Conocimiento

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 199 | `docs/knowledge/README.md` | Índice del knowledge pack | VIGENTE |
| 200 | `docs/knowledge/business-rules.md` | Reglas de negocio | VIGENTE |
| 201 | `docs/knowledge/dispatch-rules.md` | Reglas de dispatch | VIGENTE |
| 202 | `docs/knowledge/fleet-rules.md` | Reglas de flota | VIGENTE |
| 203 | `docs/knowledge/geo-rules.md` | Reglas geográficas | VIGENTE |
| 204 | `docs/knowledge/learning-rules.md` | Reglas de aprendizaje | VIGENTE |
| 205 | `docs/knowledge/pricing-rules.md` | Reglas de pricing | VIGENTE |
| 206 | `docs/knowledge/whatsapp-rules.md` | Reglas de WhatsApp | VIGENTE |

### 3.9 Incidentes

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 207 | `docs/incidents/H-CAT2-001_RECOVERY_SLOT_LOSS.md` | Incidente: pérdida de slots RECOVERY | ABIERTO |
| 208 | `docs/incidents/CAT2_RESULT_REPORT.md` | CAT-2 result report. CONDITIONAL (H-CAT2-001 abierto) | CONDITIONAL |
| 209 | `docs/incidents/INC-001_BUILD_FAILURE_PREVIEW_CONFIGURATION.md` | Build failure por configuration drift | CERRADO |

### 3.10 Operaciones

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 210 | `docs/operations/MONITORING_DASHBOARD.md` | Dashboard de monitoreo | VIGENTE |
| 211 | `docs/operations/PILOT_OPERATION_GUIDE.md` | Guía de operación del piloto | VIGENTE |
| 212 | `docs/operations/PRODUCTION_CHECKLIST.md` | Checklist de producción | VIGENTE |

### 3.11 Historia

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 213 | `docs/history/README.md` | Índice de documentos históricos | HISTÓRICO |
| 214 | `docs/history/USECASES.md` | Casos de uso históricos | HISTÓRICO |
| 215 | `docs/history/agent-contracts.md` | Contratos de agente previos | HISTÓRICO |
| 216 | `docs/history/COMMERCIAL-MODEL-SPEC.md` | Especificación de modelo comercial | HISTÓRICO |
| 217 | `docs/history/counterproposal-colleague.md` | Contrapropuesta histórica | HISTÓRICO |
| 218 | `docs/history/proposal-claude.md` | Propuesta Claude | HISTÓRICO |
| 219 | `docs/history/skills.md` | Skills documentadas | HISTÓRICO |
| 220 | `docs/history/synthesis-final.md` | Síntesis final histórica | HISTÓRICO |

### 3.12 Seguridad

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 221 | `docs/security/secrets.md` | Gestión de secretos | VIGENTE |

### 3.13 Inventario

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 222 | `docs/inventory/KNOWLEDGE_INVENTORY.md` | Catálogo de 265 documentos informativos en docs/ | VIGENTE |

### 3.14 Auditoría

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 223 | `docs/audit/AUDIT_REPORT_COMPLETE.md` | Reporte de auditoría completo (previo a CGP) | VIGENTE |

### 3.15 Ecosistema AEL

#### Constitución y Contratos

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 224 | `ael/constitution/SPEC.md` | ARNÉS Operational Specification. Invariantes I1-I6, lifecycle L1-L4, capabilities, principles. | VIGENTE |
| 225 | `ael/constitution/CONTRACTS.md` | Reglas formales de verificación (R1-R4) con enforcement scripts | VIGENTE |
| 226 | `ael/contracts/CONTRACTS.md` | REDIRECT a ael/constitution/CONTRACTS.md (backward compat) | REDIRECT |
| 227 | `ael/contracts/enforce.sh` | Script de enforcement de contratos | VIGENTE |
| 228 | `ael/contracts/diagnose.sh` | Script de diagnóstico | VIGENTE |

#### Gobierno

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 229 | `ael/government/ORGANIZATION.md` | Estructura organizacional AEL | VIGENTE |
| 230 | `ael/government/roles/02-explorer.md` | Rol Explorer | VIGENTE |
| 231 | `ael/government/roles/03-architect.md` | Rol Architect | VIGENTE |
| 232 | `ael/government/roles/04-implementer.md` | Rol Implementer | VIGENTE |
| 233 | `ael/government/roles/05-auditor.md` | Rol Auditor | VIGENTE |
| 234 | `ael/government/roles/06-memory.md` | Rol Memory | VIGENTE |
| 235 | `ael/government/roles/07-learning.md` | Rol Learning | VIGENTE |

#### Artifacts

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 236 | `ael/artifacts/01-CONSTITUTION.md` | Constitución Nivel I-a | DRAFT |
| 237 | `ael/artifacts/03-COGNITIVE_PRINCIPLES.md` | Principios cognitivos Nivel II-a (1706 líneas) | DRAFT |
| 238 | `ael/artifacts/04-EVIDENCE_MODEL.md` | Modelo de evidencia | DRAFT |
| 239 | `ael/artifacts/05-DECISION_MODEL.md` | Modelo de decisión | DRAFT |
| 240 | `ael/artifacts/06-COMMITMENT_MODEL.md` | Modelo de compromiso | DRAFT |
| 241 | `ael/artifacts/07-CERTAINTY_CALCULUS.md` | Cálculo de certidumbre | DRAFT |
| 242 | `ael/artifacts/08-CHANNEL_ADAPTER.md` | Adaptador de canal | DRAFT |
| 243 | `ael/artifacts/09-ACTION_EXECUTOR.md` | Ejecutor de acciones | DRAFT |
| 244 | `ael/artifacts/10-KNOWLEDGE_MODEL.md` | Modelo de conocimiento | DRAFT |
| 245 | `ael/artifacts/11-COGNITIVE_ARCHITECTURE.md` | Arquitectura cognitiva | DRAFT |
| 246-257 | `ael/artifacts/` (12 archivos restantes) | DESIGN_SPEC, DECISION_RECORD, BACKLOG, auditorías, etc. | MIXTO (DRAFT / VIGENTE) |

#### Archivo AEL

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 258 | `ael/archive/01-director.md` | Documentación previa del Director | ARCHIVADO |
| 259 | `ael/archive/AGENTS.md` | Documentación previa de agentes | ARCHIVADO |
| 260 | `ael/archive/FAILURE.md` | Modos de fallo previos | ARCHIVADO |
| 261 | `ael/archive/HANDOFF.md` | Protocolo de handoff previo | ARCHIVADO |
| 262 | `ael/archive/INTEGRATION.md` | Integración previa | ARCHIVADO |
| 263 | `ael/archive/PIPELINE.md` | Pipeline de 7 fases (reemplazado por L1-L4) | ARCHIVADO |

### 3.16 Agentes y Configuración

| # | Ruta | Propósito | Estado |
|---|------|-----------|--------|
| 264 | `.opencode/agents/plan.md` | Prompt de PLAN (94 líneas) | VIGENTE |
| 265 | `.opencode/agents/build.md` | Prompt de BUILD (98 líneas) | VIGENTE |
| 266 | `.opencode/memory/MEMORY.md` | Memoria del equipo | VIGENTE |
| 267 | `.opencode/commands/ael-design.md` | Comando de diseño AEL | VIGENTE |
| 268 | `.opencode/commands/ael-diagnose.md` | Comando de diagnóstico AEL | VIGENTE |
| 269 | `.opencode/commands/ael-enforce.md` | Comando de enforcement AEL | VIGENTE |
| 270 | `.opencode/commands/ael-explore.md` | Comando de exploración AEL | VIGENTE |
| 271 | `.opencode/commands/ael-implement.md` | Comando de implementación AEL | VIGENTE |
| 272 | `.opencode/commands/ael-learn.md` | Comando de aprendizaje AEL | VIGENTE |
| 273 | `.opencode/commands/ael-plan.md` | Comando de planificación AEL | VIGENTE |
| 274 | `.opencode/commands/ael-remember.md` | Comando de memoria AEL | VIGENTE |
| 275 | `.opencode/commands/ael-validate.md` | Comando de validación AEL | VIGENTE |
| 276 | `opencode.json` | Configuración de agentes (PLAN, BUILD, 6 subagentes) | VIGENTE |

---

## 4. Documentos candidatos a revisión

### 4.1 Documentos con señales de legacy / obsolete

| # | Ruta | Señal | Motivo |
|---|------|-------|--------|
| L1 | `docs/architecture/ARCHITECTURE_MILESTONE_v2.0.md` | "v2.0", milestone | Histórico. v3.0 ya existe. |
| L2 | `docs/architecture/DEVELOPMENT_ECOSYSTEM_ARCHITECTURE.md` | Contiene "FREEZE_V1" en nombre original | Reemplazado por INTERFACE_FREEZE_V2 |
| L3 | `docs/architecture/ARCHITECTURE_BASELINE.md` | Snapshot 2026-07-06 | Posiblemente reemplazado por ARCHITECTURE_STATUS.md |
| L4 | `docs/architecture/PR-7A..7G_LEARNING_*` (7 docs) | Pre-PR-11A | Corregidos por PR-11A. Renombrados a Pattern Discovery. |
| L5 | `docs/architecture/PR-8A..8G_GOALS_*` (7 docs) | Capa eliminada | Goals eliminado por decisión arquitectónica. |
| L6 | `docs/architecture/PR-9A..9G_PLANNING_*` (7 docs) | Capa eliminada | Planning eliminado por decisión arquitectónica. |
| L7 | `docs/architecture/PR-10A..10F_BOUNDARY_*` (6 docs) | Entidad eliminada | Boundary eliminado. |
| L8 | `docs/architecture/S1A_GLOBAL_IRREDUCIBILITY_AUDIT.md` | PR cerrado | Hallazgo raíz ya resuelto. |
| L9 | `docs/history/` (8 docs) | Directorio completo | Contenido histórico: propuestas, síntesis, skills previas. |
| L10 | `ael/archive/` (6 docs) | Directorio completo | Reemplazado por SPEC.md y Capability Contracts. |

### 4.2 Documentos en estado DRAFT

| # | Ruta | Señal | Motivo |
|---|------|-------|--------|
| D1 | `ael/artifacts/01-CONSTITUTION.md` | DRAFT, Level I-a | Diseño constitucional no ratificado |
| D2 | `ael/artifacts/03-COGNITIVE_PRINCIPLES.md` | DRAFT v1.0-draft | Principios cognitivos no ratificados (1706 líneas) |
| D3 | `ael/artifacts/04-EVIDENCE_MODEL.md` a `11-COGNITIVE_ARCHITECTURE.md` (8 docs) | DRAFT | Modelos cognitivos no ratificados |
| D4 | `docs/architecture/CE-3A_BUSINESS_KNOWLEDGE_ENGINE.md` | Diseño | Diseño futuro sin implementación |
| D5 | `docs/architecture/CE-3B_DETERMINISTIC_REASONING_LAYER.md` | Diseño | Diseño futuro sin implementación |
| D6 | `docs/architecture/CE-4_MIGRATION_ROADMAP.md` | Diseño futuro | Plan de migración |
| D7 | `docs/architecture/CE-5_IMPLEMENTATION_READINESS.md` | Diseño | Readiness de implementación |
| D8 | `docs/architecture/ADR-010_memory-architecture.md` | 0% implementado | Diseño conceptual sin código. 14 invariantes no verificables. |

### 4.3 Documentos EXPERIMENTALES

| # | Ruta | Señal | Motivo |
|---|------|-------|--------|
| E1 | `docs/architecture/MRC-1_MEMORY_READ_CONTRACT_ARCHITECTURE.md` | "MRC" | Diseño experimental de memoria |
| E2 | `docs/architecture/IM-0_MEMORY_IMPLEMENTATION_SCOPE.md` | "IM-0" | Scope experimental |
| E3 | `docs/architecture/MOV-1_MEMORY_OPERATIONAL_VALIDATION.md` | "MOV" | Validación experimental |
| E4 | `docs/architecture/OP-1_COGNITIVE_FEATURE_FLAG_ROLLOUT.md` | "OP-1" | Rollout experimental |
| E5 | `docs/architecture/PAA-1_PATTERN_ACCEPTANCE_AUDIT.md` | "PAA" | Pattern Discovery experimental |
| E6 | `docs/architecture/PD-IM-0_PATTERN_DISCOVERY_IMPLEMENTATION.md` | "PD-IM" | PD experimental |
| E7 | `docs/architecture/POA-1_PATTERN_ONTOLOGY_AUDIT.md` | "POA" | Ontología experimental |
| E8 | `docs/architecture/PBA-1_PROJECTION_BOUNDARY_AUDIT.md` | "PBA" | Boundary experimental |
| E9 | `docs/architecture/PDE-1_PATTERN_DISCOVERY_EXECUTION.md` | "PDE" | PD execution experimental |
| E10 | `docs/architecture/ARR-1_MEMORY_READINESS.md` | "ARR" | Memory readiness experimental |
| E11 | `docs/architecture/FCER-1_FIRST_COGNITIVE_EVIDENCE_REPORT.md` | "FCER" | Cognitive evidence experimental |

### 4.4 Documentos con ambigüedad de autoridad

| # | Ruta | Señal | Motivo |
|---|------|-------|--------|
| A1 | `docs/SYSTEM_BIBLE.md` | "Non-technical constitution" | Compite con AITOS_CONSTITUTION.md como documento constitucional |
| A2 | `docs/ai/ARCHITECTURE_BIBLE.md` | "Minimum required context" | Afirma ser "minimum required", pero describe principios y reglas que también están en la Constitución |
| A3 | `docs/ai/INVARIANTS.md` | Invariantes del Context Pack | Posible duplicación con invariantes de la Constitución y CDA |
| A4 | `docs/architecture/ARCHITECTURE_STATUS.md` | §12 tiene su propio inventario documental | Compite con KNOWLEDGE_INVENTORY.md |

---

## 5. Posibles duplicaciones documentales

| Documento A | Documento B | Posible relación |
|------------|------------|------------------|
| `docs/architecture/AITOS_CONSTITUTION.md` | `docs/SYSTEM_BIBLE.md` | Ambos pretenden ser documentos constitucionales. SYSTEM_BIBLE.md es informal; AITOS_CONSTITUTION es normativo. |
| `docs/architecture/AITOS_CONSTITUTION.md` (RF-01 a RF-19) | `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` (§3 RF-01 a RF-10) | Constitución reescribe RFs de la FBS. La FBS es la fuente original; la Constitución debería ser la autoridad. |
| `docs/architecture/AITOS_CONSTITUTION.md` (I-C1 a I-C12) | `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` (§20 I-C1 a I-C12) | Duplicación exacta de invariantes conversacionales. |
| `docs/architecture/AITOS_CONSTITUTION.md` (I-01 a I-15) | `docs/specifications/CONVERSATION_DECISION_ALGORITHM.md` (§4 I-01 a I-15) | Duplicación exacta de invariantes del CDA. |
| `docs/architecture/AITOS_CONSTITUTION.md` (CC-01 a CC-11) | `ael/artifacts/03-COGNITIVE_PRINCIPLES.md` (CP-01 a CP-48) | Ambas definen principios cognitivos en diferentes niveles de granularidad. |
| `docs/architecture/AITOS_CONSTITUTION.md` (RNF-A01 a RNF-A17) | `docs/ai/ARCHITECTURE_BIBLE.md` + `docs/ai/ARCHITECTURE_RULES.md` | Requisitos arquitectónicos definidos en ambos lugares. |
| `docs/architecture/ARCHITECTURE_STATUS.md` (§12) | `docs/inventory/KNOWLEDGE_INVENTORY.md` | Ambos contienen inventarios documentales. ARCHITECTURE_STATUS.md tiene 50+ documentos. KNOWLEDGE_INVENTORY.md tiene 265 archivos. |
| `ael/constitution/CONTRACTS.md` | `ael/contracts/CONTRACTS.md` | REDIRECT intencional por backward compatibility. No es duplicación real. |
| `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` (singular) | `docs/specifications/CONVERSATION_DECISION_ALGORITHM.md` (plural) | Los dos directorios `docs/specification/` y `docs/specifications/` coexisten con convención de nomenclatura inconsistente. |

---

## 6. Riesgos iniciales

### A. Riesgo de contradicción normativa

| ID | Riesgo | Severidad | Descripción |
|----|--------|-----------|-------------|
| R-A1 | Constitución vs FBS | ALTA | La Constitución define RF-01 a RF-19. La FBS define RF-01 a RF-10 con contenidos diferentes. Si ambos son normativos, hay contradicción. |
| R-A2 | Constitución vs CDA | ALTA | La Constitución duplica I-01 a I-15 del CDA. Si una actualización modifica solo uno de los dos documentos, se genera divergencia. |
| R-A3 | Constitución vs SYSTEM_BIBLE | MEDIA | SYSTEM_BIBLE.md se presenta como "constitution no técnica" pero su estado es informal. La Constitución es formal. Ambigüedad sobre cuál prevalece. |
| R-A4 | ARCHITECTURE_STATUS.md vs realidad | MEDIA | ARCHITECTURE_STATUS.md contiene un inventario documental en §12 que puede no reflejar el estado actual tras la creación de la Constitución. |

### B. Riesgo de documento huérfano

| ID | Riesgo | Severidad | Descripción |
|----|--------|-----------|-------------|
| R-B1 | PR-7 series (Learning→Pattern Discovery) | MEDIA | 7 documentos renombrados pero no actualizados en contenido. Reflejan diseño Pre-PR-11A. |
| R-B2 | PR-8/PR-9/PR-10 series | BAJA | Capas eliminadas. Los documentos existen como registro histórico pero no se referencian desde ningún índice activo. |
| R-B3 | CE-4_MIGRATION_ROADMAP.md | BAJA | Plan de migración de un sistema que ahora promulga atemporalidad constitucional. |
| R-B4 | ael/artifacts/ | MEDIA | 10 documentos en DRAFT que definen principios cognitivos no ratificados. No hay trazabilidad desde la Constitución hacia estos artifacts. |

### C. Riesgo de conocimiento perdido

| ID | Riesgo | Severidad | Descripción |
|----|--------|-----------|-------------|
| R-C1 | Duplicación de invariantes | ALTA | I-C1 a I-C12 aparecen en 3 documentos (FBS, CDA, Constitución). Si se actualiza uno, los otros quedan inconsistentes. |
| R-C2 | RFs en múltiples fuentes | ALTA | Constitución y FBS definen RFs. No hay SSOT claro de los requisitos funcionales. |
| R-C3 | docs/ai/ARCHITECTURE_BIBLE.md como "minimum context" | MEDIA | Este documento afirma ser el mínimo necesario para IA, pero si la Constitución es la autoridad suprema, el Context Pack debería referenciarla. |

### D. Riesgo de referencia obsoleta

| ID | Riesgo | Severidad | Descripción |
|----|--------|-----------|-------------|
| R-D1 | ARCHITECTURE_STATUS.md §12 | MEDIA | El inventario documental dentro de ARCHITECTURE_STATUS.md puede no incluir AITOS_CONSTITUTION.md ni la refactorización reciente. |
| R-D2 | KNOWLEDGE_INVENTORY.md | MEDIA | Catálogo de 265 archivos. No incluye archivos creados durante CGP-0 (AITOS_CONSTITUTION.md, DOCUMENT_INVENTORY.md). |
| R-D3 | README.md | BAJA | Describe stack técnico y variables de entorno, pero no referencias a la Constitución ni documentos normativos. |

### E. Riesgo de autoridad ambigua

| ID | Riesgo | Severidad | Descripción |
|----|--------|-----------|-------------|
| R-E1 | Conversación: ¿Constitución, FBS o CDA? | ALTA | Para una regla conversacional, ¿se consulta la Constitución (CC, RF, INV), la FBS (P1-P10, I-C1-I-C12), o el CDA (I-01-I-15, pipeline)? Las tres son documentos normativos sin jerarquía explícita. |
| R-E2 | Arquitectura: ¿ADR_INDEX, ARCHITECTURE_STATUS o Constitución? | ALTA | Para una decisión arquitectónica, ¿se consulta el ADR_INDEX (14 ADR), ARCHITECTURE_STATUS.md (15 secciones), o la Constitución (RNF-A, contratos)? |
| R-E3 | QA: ¿CERTIFICATION_REGISTRY, QA_GOVERNANCE o la Constitución? | MEDIA | Para certificación, ¿CERTIFICATION_REGISTRY.md es SSOT o QA_GOVERNANCE.md? La Constitución menciona jerarquía pero no referencia explícita. |
| R-E4 | Development ecosystem: ¿SPEC.md, CONTRACTS.md o la Constitución? | MEDIA | La Constitución no incluye reglas del ecosistema de desarrollo (I1-I6, R1-R4). Estos quedan en ael/constitution/. ¿Qué nivel de autoridad tiene SPEC.md vs la Constitución? |

---

## 7. Jerarquía documental actual (mapeada)

Actualmente, la autoridad documental se organiza informalmente así:

```
Nivel 1: Constitución (AITOS_CONSTITUTION.md)
         ├── Propósito, alcance, principios (PC)
         ├── Constituciones Cognitivas (CC)
         ├── Requerimientos Funcionales (RF)
         ├── Requerimientos No Funcionales (RNF-A, RNF-C)
         ├── Reglas de Decisión (RD)
         ├── Heurísticas Cognitivas (H)
         ├── Invariantes (INV)
         └── Contratos (CON)

Nivel 2: Especificaciones
         ├── FUNCTIONAL_BEHAVIOR_SPECIFICATION.md (fuente de RF/RNF/I-C/FBS)
         └── CONVERSATION_DECISION_ALGORITHM.md (fuente de I-01/reglas merge/pipeline)

Nivel 3: Decisiones Arquitectónicas
         └── ADR_INDEX.md → 14 ADRs en docs/adr/

Nivel 4: Arquitectura del Sistema
         ├── ARCHITECTURE_STATUS.md (estado real)
         ├── ARCHITECTURE_BASELINE.md (snapshot)
         ├── ARCHITECTURE_ATLAS.md (mapa detallado)
         ├── Contratos (MC, MP, SO, DI, IF)
         ├── Mapas (system-map, capability-map, knowledge-map...)
         └── Diagramas

Nivel 5: Calidad y Certificación
         ├── CERTIFICATION_REGISTRY.md (SSOT certificación)
         ├── QA_GOVERNANCE.md (reglas QA)
         ├── TECHNICAL_DEBT_BASELINE.md (deuda)
         ├── CAT_CERTIFICATION_REGISTER.md (CAT campaigns)
         └── Auditorías históricas en docs/certification/

Nivel 6: Proyecto
         ├── PROJECT_CONTEXT.md (estado condensado)
         ├── PROJECT_BOARD.md (tareas)
         ├── CHANGELOG.md (historial)
         └── ROADMAP.md (plan futuro)

Nivel 7: Conocimiento y Reglas
         ├── docs/knowledge/ (reglas de negocio)
         ├── docs/ai/ (Context Pack para IA)
         └── docs/inventory/KNOWLEDGE_INVENTORY.md (catálogo)

Nivel 8: Ecosistema AEL
         ├── ael/constitution/SPEC.md (operación del ecosistema)
         ├── ael/constitution/CONTRACTS.md (R1-R4)
         ├── ael/government/ (roles y organización)
         └── ael/artifacts/ (drafts cognitivos)

Nivel 9: Operaciones e Incidentes
         ├── docs/operations/
         └── docs/incidents/
```

**Problemas identificados en la jerarquía:**
1. La Constitución duplica contenido de FBS y CDA sin establecer autoridad explícita
2. SYSTEM_BIBLE.md no está integrado en la jerarquía
3. ARCHITECTURE_STATUS.md compite con la Constitución como fuente de verdad arquitectónica
4. El ecosistema AEL (SPEC.md) no está relacionado jerárquicamente con la Constitución
5. KNOWLEDGE_INVENTORY.md no referencias los documentos creados en CGP-0

---

## 8. Recomendaciones para CGP-1

### 8.1 Acciones inmediatas recomendadas

1. **Resolver jerarquía entre Constitución y FBS**: Determinar si la Constitución reemplaza a la FBS como fuente de RFs, o si la FBS sigue siendo la fuente detallada y la Constitución la normativa resumida.

2. **Resolver jerarquía entre Constitución y CDA**: El CDA es un documento normativo ratificado por ADR-013. La Constitución duplica sus invariantes. Decidir si la Constitución cita al CDA por referencia o mantiene las invariantes copiadas.

3. **Integrar SYSTEM_BIBLE.md**: Determinar si SYSTEM_BIBLE.md debe actualizarse para ser una introducción no técnica a la Constitución, o si debe eliminarse/reemplazarse.

4. **Consolidar ARCHITECTURE_STATUS.md**: Actualizar §12 para incluir la Constitución y este inventario. Asegurar que ARCHITECTURE_STATUS.md refleje la nueva jerarquía.

5. **Clasificar PR series**: Determinar si los 27+ documentos PR-7/8/9/10 deben archivarse explícitamente en `ael/archive/` o mantenerse como trazabilidad histórica.

### 8.2 Acciones diferidas (CGP-2+)

6. **Revisar ael/artifacts/**: Los 10+ documentos DRAFT deben evaluarse: ¿se integran en la Constitución, se ratifican como normativos, o se archivan como diseño conceptual?

7. **Integrar docs/ai/ Context Pack**: El ARCHITECTURE_BIBLE.md y su pack deben alinearse con la Constitución como autoridad suprema.

8. **Consolidar directorios specification/ y specifications/**: La coexistencia de `docs/specification/` (singular) y `docs/specifications/` (plural) es una anomalía de nomenclatura.

9. **Evaluar KNOWLEDGE_INVENTORY.md vs ARCHITECTURE_STATUS.md §12**: Dos inventarios documentales que compiten.

10. **Resolver naming de documentos CE**: Los documentos CE-1 a CE-5 tienen nombres inconsistentes (algunos tienen estado VIGENTE, otros DISEÑO) y deben clasificarse unívocamente.

---

> **Fin de DOCUMENT_INVENTORY.md — Baseline para CGP-1.**
>
> Este documento representa una fotografía del estado documental actual. No prescribe
> correcciones ni eliminaciones. Es la línea base objetiva para las decisiones de
> gobierno constitucional que se tomarán en CGP-1 y sucesivas.
