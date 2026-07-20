# KNOWLEDGE INVENTORY — AITOS

> Catálogo completo de documentos informativos en `docs/`.
> Identifica, clasifica y prioriza todo el conocimiento oficial del sistema.
> NO reemplaza `ADR_INDEX.md` — lo complementa con alcance más amplio.

---

## Propósito

Responder a la pregunta:

> *"¿Qué documentos debe leer un arquitecto o desarrollador para entender completamente cómo es AITOS, qué debe hacer y cómo debe evolucionar?"*

## Alcance

- **Incluye**: todos los archivos `.md` en `docs/` (265 archivos relevados)
- **Excluye**: `docs/security/` (secretos), `ael/`, `src/`, `.opencode/`, código fuente
- **Generado**: 2026-07-20
- **Metodología**: lectura de primeras líneas + clasificación por estado (vigente/histórico), autoridad (normativo/directivo/informativo/histórico), y prioridad de lectura (P1/P2/P3/REF)

---

## Resumen

| Categoría | Vigentes | Históricos |
|---|---|---|
| Identidad del Sistema | 2 | 0 |
| Decisiones Arquitectónicas (ADR) | 14 | 0 |
| Contratos del Ecosistema | 6 | 2* |
| Arquitectura General | 14 | 4* |
| Ingeniería Conversacional | 4 | 0 |
| Modelo Cognitivo | 1 | 0 |
| Mapas y Referencias | 9 | 0 |
| Diagramas Arquitectónicos | 25 | 0 |
| Modelos de Dominio | 5 | 0 |
| Especificación Funcional | 2 | 0 |
| Contexto AI (prompts) | 8 | 0 |
| Base de Conocimiento | 8 | 0 |
| Proyecto y Gestión | 11 | 0 |
| Operación | 3 | 0 |
| Calidad y Línea Base | 12 | 0 |
| Incidentes | 1 | 2 |
| Auditoría | 1 | 0 |
| Arquitectura Exploratoria Histórica (PR/CE) | 0 | 68 |
| Certificaciones Históricas | 0 | 69 |
| Historia Temprana (pre-v0) | 0 | 8 |
| Reverse Engineering / Otros | 0 | 1 |
| **TOTAL (archivos únicos)** | **~121** | **~144** |

> *Nota: archivos marcados con * aparecen en dos categorías (ej: FREEZE_V1 está en Contratos y en Arquitectura General). El total de archivos únicos es 265. Disminución desde 267 por eliminación de `PIPELINE_V2_PROPOSAL.md` y `CONVERSATION_PIPELINE_AUDIT.md` (info redefinida por CDA, migrada a Apéndice C del CDA).

---

## Navegación por Categorías

| # | Categoría | Documentos |
|---|---|---|
| [1](#1-identidad-del-sistema) | Identidad del Sistema | 2 |
| [2](#2-decisiones-arquitectónicas-adr) | Decisiones Arquitectónicas (ADR) | 14 |
| [3](#3-contratos-del-ecosistema) | Contratos del Ecosistema | 6 |
| [4](#4-arquitectura-general) | Arquitectura General | 14 |
| [5](#5-ingeniería-conversacional) | Ingeniería Conversacional | 4 |
| [6](#6-modelo-cognitivo) | Modelo Cognitivo | 1 |
| [7](#7-mapas-y-referencias) | Mapas y Referencias | 11 |
| [8](#8-diagramas-arquitectónicos) | Diagramas Arquitectónicos | 25 |
| [9](#9-modelos-de-dominio) | Modelos de Dominio | 5 |
| [10](#10-especificación-funcional) | Especificación Funcional | 2 |
| [11](#11-contexto-ai-prompts) | Contexto AI (prompts) | 8 |
| [12](#12-base-de-conocimiento) | Base de Conocimiento | 8 |
| [13](#13-proyecto-y-gestión) | Proyecto y Gestión | 11 |
| [14](#14-operación) | Operación | 3 |
| [15](#15-calidad-y-línea-base) | Calidad y Línea Base | 12 |
| [16](#16-incidentes) | Incidentes | 1 |
| [17](#17-auditoría) | Auditoría | 1 |
| [H](#h-documentos-históricos) | **(Apéndice)** Históricos | 146 |

---

## 1. Identidad del Sistema

Documentos que definen qué es AITOS, su propósito, misión y alcance.

| # | Ruta | Nombre | Estado | Autoridad | SSOT | Prioridad | Descripción |
|---|------|--------|--------|-----------|------|-----------|-------------|
| 1.1 | `docs/SYSTEM_BIBLE.md` | System Bible | ✅ Vigente | **Normativo** | ✅ Sí | **P1** | Constitución del sistema no-técnico. Define identidad, propósito superior, valores, modo de trabajo, y principios de evolución. Lectura obligatoria pre-arquitectura. |
| 1.2 | `docs/ROADMAP.md` | Roadmap | ✅ Vigente | Directivo | ❌ | **P2** | Hoja de ruta oficial del proyecto. Diferencia pasado, presente y futuro. Actualizado Jul 2026. |

---

## 2. Decisiones Arquitectónicas (ADR)

Decisiones arquitectónicas registradas formalmente. **Todas vigentes** — constituyen la fuente única de verdad arquitectónica.

| # | Ruta | Nombre | Estado | Autoridad | SSOT | Prioridad | Descripción |
|---|------|--------|--------|-----------|------|-----------|-------------|
| 2.1 | `docs/adr/001-layered-architecture.md` | ADR-001: Layered Architecture | ✅ Vigente | **Normativo** | ✅ Sí | **P1** | Dirección de dependencias estrictas entre capas. Define cómo se organiza todo el código y qué puede importar qué. |
| 2.2 | `docs/adr/002-database-facade.md` | ADR-002: Database Facade | ✅ Vigente | **Normativo** | ✅ Sí | **P2** | Todos los servicios acceden a DB mediante `database.ts`. Punto único de entrada para persistencia. Aceptado con gaps (Learning aún bypasses facade). |
| 2.3 | `docs/adr/003-learning-domain.md` | ADR-003: Learning Domain | ✅ Vigente | **Normativo** | ✅ Sí | **P2** | Learning es un dominio de primera clase con sus propias reglas de frontera. Crea módulos dedicados de aprendizaje. |
| 2.4 | `docs/adr/004-service-boundaries.md` | ADR-004: Service Boundaries | ✅ Vigente | **Normativo** | ✅ Sí | **P1** | Orden de dependencias estricto y prohibición de dependencias circulares. Guía refactors y creación de nuevos dominios. |
| 2.5 | `docs/adr/005-ai-first-interpretation.md` | ADR-005: AI-First Interpretation | ✅ Vigente | **Normativo** | ✅ Sí | **P1** | Prohibición de heuristic patches para interpretación context-sensitive. Usar LLM con datos crudos. Afecta ambigüedad, recovery y geo queries. |
| 2.6 | `docs/adr/006-schema-parity.md` | ADR-006: Schema Parity | ✅ Vigente | **Normativo** | ✅ Sí | **P2** | `initSchema()` debe reflejar la DB de producción real. Migration runner introducido. Todos los cambios de schema deben ser versionados y verificados. |
| 2.7 | `docs/adr/007-conversation-interpreter.md` | ADR-007: Conversation Interpreter | ✅ Vigente | **Normativo** | ✅ Sí | **P1** | Nueva etapa del pipeline entre CORE y Extraction para clasificar rol conversacional. Previene bug B3 y su familia. |
| 2.8 | `docs/adr/008-conversational-decision-architecture.md` | ADR-008: Decision Architecture | ✅ Vigente | **Normativo** | ✅ Sí | **P1** | `computeStrategyDecision()` es la única fuente de verdad para decisiones estratégicas. Architecture Freeze. Policies ya no reinterpretan señales. |
| 2.9 | `docs/adr/009-evidence-engine-architecture.md` | ADR-009: Evidence Engine | ✅ Vigente | **Normativo** | ✅ Sí | **P1** | Pipeline cognitivo de 7 capas congelado (Signal→Observation→Fact→Evidence→Knowledge→Belief→Decision). Base para capas cognitivas futuras. |
| 2.10 | `docs/adr/010-memory-architecture.md` | ADR-010: Memory Architecture | ✅ Vigente | **Normativo** | ✅ Sí | **P2** | Arquitectura de memoria del sistema. Define cómo se almacena y recupera conocimiento operacional. |
| 2.11 | `docs/adr/011-reflection-elimination.md` | ADR-011: Reflection Elimination | ✅ Vigente | **Normativo** | ✅ Sí | **P3** | Eliminación del módulo Reflection del pipeline cognitivo. Decisión de simplificación. |
| 2.12 | `docs/adr/012-cognitive-escalation-principle.md` | ADR-012: Cognitive Escalation | ✅ Vigente | **Normativo** | ✅ Sí | **P1** | Stack de 3 niveles: conocimiento determinístico → reglas → LLM. Prioridad del conocimiento explícito sobre generación. Modifica parcialmente ADR-005. |
| 2.13 | `docs/adr/013-conversation-decision-algorithm.md` | ADR-013: CDA Ratification | ✅ Vigente | **Normativo** | ✅ Sí | **P1** | Ratifica el Conversation Decision Algorithm como autoridad funcional normativa. Jerarquía: Implementation → CDA → Specification → ADR. 15 invariantes I-01 a I-15. |
| 2.14 | `docs/adr/014-experimental-layers-hygiene.md` | ADR-014: Experimental Hygiene | ✅ Vigente | **Normativo** | ✅ Sí | **P2** | Higiene de capas experimentales: mantiene Evidence Engine, elimina Pattern Discovery/BKE/DRL, protege hard-reset con flag. Reduce ~23% de src/. |

---

## 3. Contratos del Ecosistema

Contratos arquitectónicos que definen cómo opera el ecosistema de desarrollo PLAN↔BUILD.

| # | Ruta | Nombre | Estado | Autoridad | SSOT | Prioridad | Descripción |
|---|------|--------|--------|-----------|------|-----------|-------------|
| 3.1 | `docs/architecture/INTERFACE_FREEZE_V2.md` | Interface Freeze V2 | ✅ Vigente | **Normativo** | ✅ Sí | **P1** | Freeze vigente del ecosistema. Solo 2 interfaces visibles: PLAN y BUILD. 7 invariantes IF-01 a IF-07. Reemplaza V1 y DUAL_INTERFACE. |
| 3.2 | `docs/architecture/MISSION_PHASE_ARCHITECTURE.md` | Mission Phase Architecture | ✅ Vigente | **Normativo** | ✅ Sí | **P1** | Contrato cognitivo PLAN→BUILD. Modelo de 2 fases. 6 invariantes MP-01 a MP-06. |
| 3.3 | `docs/architecture/MISSION_CLOSURE_CONTRACT.md` | Mission Closure Contract | ✅ Vigente | **Normativo** | ✅ Sí | **P2** | Contrato de cierre de misión y trigger de Learning. 7 invariantes MC-01 a MC-07. |
| 3.4 | `docs/architecture/STRATEGIC_OPERATIONAL_CONTRACT.md` | Strategic/Operational Contract | ✅ Vigente | **Normativo** | ✅ Sí | **P1** | Formalización definitiva de la separación cognitiva PLAN↔BUILD. 10 invariantes SO-01 a SO-10. |
| 3.5 | `docs/architecture/DEVELOPMENT_ECOSYSTEM_ARCHITECTURE_FREEZE_V1.md` | Ecosystem Freeze V1 | ✅ Vigente (histórico como freeze anterior) | Informativo | ❌ | **P3** | Primer freeze del ecosistema de desarrollo. 19 invariantes. Reemplazado parcialmente por INTERFACE_FREEZE_V2 pero conserva valor histórico. |
| 3.6 | `docs/architecture/DUAL_INTERFACE_ARCHITECTURE.md` | Dual Interface Architecture | ✅ Vigente (histórico) | Informativo | ❌ | **P3** | Modelo de doble capa previo a Interface Freeze V2. Conservado como diseño intermedio. |

---

## 4. Arquitectura General

Documentos que describen la arquitectura del sistema, sus capas, componentes y principios de diseño.

| # | Ruta | Nombre | Estado | Autoridad | SSOT | Prioridad | Descripción |
|---|------|--------|--------|-----------|------|-----------|-------------|
| 4.1 | `docs/architecture/architecture.md` | Architecture Overview | ✅ Vigente | Directivo | ❌ | **P1** | Vista ejecutiva de la arquitectura. Punto de entrada para entender cómo está organizado el sistema. |
| 4.2 | `docs/architecture/ARCHITECTURE_MILESTONE_v3.0.md` | Architecture Milestone v3.0 | ✅ Vigente | **Normativo** | ✅ Sí | **P1** | Architecture Freeze V3 vigente. Documenta el milestone actual de la arquitectura. |
| 4.3 | `docs/architecture/ARCHITECTURE_BASELINE.md` | Architecture Baseline | ✅ Vigente | Directivo | ❌ | **P2** | Línea base arquitectónica. Snapshot del estado arquitectónico del sistema. |
| 4.4 | `docs/architecture/design-principles.md` | Design Principles | ✅ Vigente | Directivo | ❌ | **P1** | Principios de diseño derivados de ADRs. Guía para la toma de decisiones arquitectónicas. |
| 4.5 | `docs/architecture/bounded-contexts.md` | Bounded Contexts | ✅ Vigente | Directivo | ❌ | **P2** | Contextos delimitados reales derivados del código. Mapa de fronteras entre dominios. |
| 4.6 | `docs/architecture/system-overview.md` | System Overview | ✅ Vigente | Directivo | ❌ | **P1** | Vista de alto nivel del sistema completo. Describe el pipeline de principio a fin. |
| 4.7 | `docs/architecture/system-map.md` | System Map | ✅ Vigente | Directivo | ❌ | **P2** | Mapa operacional del sistema. Componentes y sus relaciones. |
| 4.8 | `docs/architecture/capability-map.md` | Capability Map | ✅ Vigente | Directivo | ❌ | **P2** | Mapa de capacidades de negocio del sistema. |
| 4.9 | `docs/architecture/engines.md` | Engines | ✅ Vigente | Directivo | ❌ | **P2** | Documentación detallada de los motores del sistema y cómo los ADRs moldean sus fronteras. |
| 4.10 | `docs/architecture/fractal-architecture.md` | Fractal Architecture | ✅ Vigente | Directivo | ❌ | **P3** | Patrones fractales en el sistema. Cómo se repiten patrones arquitectónicos en diferentes escalas. |
| 4.11 | `docs/architecture/drift-report.md` | Drift Report | ✅ Vigente | Directivo | ❌ | **P3** | Reporte de desviación arquitectónica. Documenta diferencias entre arquitectura deseada y real. |
| 4.12 | `docs/architecture/documentation-coverage.md` | Documentation Coverage | ✅ Vigente | Informativo | ❌ | **P3** | Matriz de cobertura documental. Identifica qué áreas están documentadas y cuáles tienen gaps. |
| 4.13 | `docs/architecture/dashboard.md` | Architecture Dashboard | ✅ Vigente | Informativo | ❌ | **P3** | Vista en vivo del estado arquitectónico. Métricas y estado de componentes. |
| 4.14 | `docs/architecture/metrics.md` | Architecture Metrics | ✅ Vigente | Informativo | ❌ | **P3** | Definiciones de métricas arquitectónicas. Cómo se miden calidad, cobertura y complejidad. |

---

## 5. Ingeniería Conversacional

Documentos que describen el pipeline conversacional, políticas, intenciones, estados y decisiones.

| # | Ruta | Nombre | Estado | Autoridad | SSOT | Prioridad | Descripción |
|---|------|--------|--------|-----------|------|-----------|-------------|
| 5.1 | `docs/architecture/decision-architecture.md` | Decision Architecture | ✅ Vigente | Directivo | ❌ | **P1** | Pipeline de decisiones y jerarquía. Cómo se toman decisiones conversacionales desde la interpretación hasta la ejecución. |
| 5.2 | `docs/architecture/conversation-pipeline.md` | Conversation Pipeline | ✅ Vigente | Directivo | ❌ | **P1** | Pipeline ADR-008 completo. Describe cada etapa del flujo conversacional. |
| 5.3 | `docs/architecture/strategy-decision.md` | Strategy Decision | ✅ Vigente | Directivo | ❌ | **P1** | Ciclo de vida de StrategyDecision (ADR-008). Define cómo se computan y resuelven las decisiones estratégicas. |
| 5.4 | `docs/architecture/operational-model.md` | Operational Model | ✅ Vigente | Directivo | ❌ | **P2** | Modelo operacional central. Describe cómo operan los componentes en runtime. |

---

## 6. Modelo Cognitivo

Documentos sobre el pipeline cognitivo, Evidence Engine, ontología y memoria.

| # | Ruta | Nombre | Estado | Autoridad | SSOT | Prioridad | Descripción |
|---|------|--------|--------|-----------|------|-----------|-------------|
| 6.1 | `docs/architecture/handler-context.md` | Handler Context | ✅ Vigente | Directivo | ❌ | **P2** | Enriquecimiento y propagación del contexto conversacional a través de los handlers. |

---

## 7. Mapas y Referencias

Documentos de referencia transversales: índices, glosarios, gobernanza y modelos de madurez.

| # | Ruta | Nombre | Estado | Autoridad | SSOT | Prioridad | Descripción |
|---|------|--------|--------|-----------|------|-----------|-------------|
| 7.1 | `docs/architecture/ADR_INDEX.md` | ADR Index | ✅ Vigente | **Normativo** | ✅ Sí | **P1** | Índice navegable de todas las ADRs. Agrupa por dominio y referencia documentos relacionados. Entrada principal a la arquitectura. |
| 7.2 | `docs/architecture/GOVERNANCE.md` | Documentation Governance | ✅ Vigente | **Normativo** | ✅ Sí | **P2** | Reglas de gobierno documental. Cómo agregar o actualizar ADRs y documentación. |
| 7.3 | `docs/architecture/glossary.md` | Glossary | ✅ Vigente | Directivo | ❌ | **P2** | Terminología unificada del sistema. Definiciones de todos los conceptos clave. |
| 7.4 | `docs/architecture/knowledge-map.md` | Knowledge Map | ✅ Vigente | Directivo | ❌ | **P2** | Mapa de organización del conocimiento del sistema. |
| 7.5 | `docs/architecture/maturity-model.md` | Maturity Model | ✅ Vigente | Directivo | ❌ | **P3** | Niveles de madurez por componente del sistema. |
| 7.6 | `docs/architecture/DIAGRAMS.md` | Diagrams Guide | ✅ Vigente | Directivo | ❌ | **P3** | Reglas del ciclo de vida de diagramas. Convenciones para mantener diagramas actualizados. |
| 7.7 | `docs/project/PROJECT_CONTEXT.md` | Project Context | ✅ Vigente | Directivo | ❌ | **P1** | Condensación del estado del proyecto en 14 secciones. Documento cognitivo para PLAN/SDL. NO reemplaza SPECs, ADRs ni Baseline. |
| 7.8 | `docs/project/CHANGELOG.md` | Changelog | ✅ Vigente | Informativo | ❌ | **P3** | Bitácora completa del proyecto. Cada entrada documenta PRs ejecutados. |
| 7.9 | `docs/project/PROJECT_BOARD.md` | Project Board | ✅ Vigente | Informativo | ❌ | **P2** | Tablero de tareas priorizadas (P0-P3). Estado actual de cada ítem. |
| 7.10 | `docs/architecture/maturity-model.md` | Maturity Model (ya enlistado) | ✅ Vigente | Directivo | ❌ | **P3** | (duplicado funcional — referenciado desde múltiples categorías) |
| 7.11 | `docs/architecture/metrics.md` | Metrics (ya enlistado) | ✅ Vigente | Informativo | ❌ | **P3** | (duplicado funcional — referenciado desde múltiples categorías) |

---

## 8. Diagramas Arquitectónicos

Diagramas Mermaid que describen visualmente el sistema. Todos vigentes.

| # | Ruta | Nombre | Prioridad | Descripción |
|---|------|--------|-----------|-------------|
| 8.1 | `docs/architecture/diagrams/01-system-overview.md` | System Overview | **P1** | Vista de alto nivel del pipeline completo. |
| 8.2 | `docs/architecture/diagrams/02-webhook-entry.md` | Webhook Entry | **P2** | Punto de entrada WhatsApp con validación y routing. |
| 8.3 | `docs/architecture/diagrams/03-core-phase.md` | Core Phase | **P1** | Detección determinista de intención, fase CORE. |
| 8.4 | `docs/architecture/diagrams/04-router-phase.md` | Router Phase | **P2** | Mapeo Intent→OutputType con reglas de confianza. |
| 8.5 | `docs/architecture/diagrams/05-extraction-phase.md` | Extraction Phase | **P1** | Extracción de slots via LLM con scoring. |
| 8.6 | `docs/architecture/diagrams/06-confidence-model.md` | Confidence Model | **P2** | Estados de certeza de slots y transiciones. |
| 8.7 | `docs/architecture/diagrams/07-policy-ahora.md` | Policy Ahora | **P2** | Flujo de ejecución inmediata. |
| 8.8 | `docs/architecture/diagrams/08-policy-reserva.md` | Policy Reserva | **P2** | Flujo de reserva multi-paso. |
| 8.9 | `docs/architecture/diagrams/09-location-resolution.md` | Location Resolution | **P2** | Pipeline de resolución de ubicación. |
| 8.10 | `docs/architecture/diagrams/10-tariff-resolution.md` | Tariff Resolution | **P2** | Resolución unificada de tarifas. |
| 8.11 | `docs/architecture/diagrams/11-operational-readiness.md` | Operational Readiness | **P2** | Datos mínimos que habilitan acciones del sistema. |
| 8.12 | `docs/architecture/diagrams/12-workflow-state-machine.md` | State Machine | **P1** | Máquina de estados conversacionales (7 estados). |
| 8.13 | `docs/architecture/diagrams/13-slot-confidence-evolution.md` | Slot Confidence | **P2** | Evolución de certeza de slots entre turnos. |
| 8.14 | `docs/architecture/diagrams/14-dispatch-flow.md` | Dispatch Flow | **P2** | Flujo de asignación de choferes (4 niveles de escalamiento). |
| 8.15 | `docs/architecture/diagrams/15-data-flow.md` | Data Flow | **P2** | Flujo completo de datos a través del sistema. |
| 8.16 | `docs/architecture/diagrams/16-policy-pipeline.md` | Policy Pipeline | **P1** | Orquestador real del flujo conversacional. |
| 8.17 | `docs/architecture/diagrams/17-strategy-decision-flow.md` | Strategy Decision Flow | **P1** | Ciclo de vida de StrategyDecision. |
| 8.18 | `docs/architecture/diagrams/18-handler-context-flow.md` | Handler Context Flow | **P2** | Enriquecimiento del contexto conversacional. |
| 8.19 | `docs/architecture/diagrams/19-module-dependency-map.md` | Module Dependency Map | **P2** | Dependencias reales entre módulos derivadas del código. |
| 8.20 | `docs/architecture/diagrams/dfd-levels.md` | DFD Levels | **P2** | Diagramas de flujo de datos Niveles 0-3. |
| 8.21 | `docs/architecture/diagrams/event-flow.md` | Event Flow | **P3** | Flujo de eventos operativos. |
| 8.22 | `docs/architecture/diagrams/runtime-flow.md` | Runtime Flow | **P1** | Flujo runtime end-to-end. |
| 8.23 | `docs/architecture/diagrams/sequence-diagrams.md` | Sequence Diagrams | **P2** | Diagramas de secuencia para escenarios clave. |
| 8.24 | `docs/architecture/diagrams/state-machines.md` | State Machines | **P2** | Máquinas de estado conversacional y dispatch. |
| 8.25 | `docs/architecture/diagrams/README.md` | Diagrams README | **P3** | Índice y guía de navegación del directorio de diagramas. |

---

## 9. Modelos de Dominio

Bounded contexts por dominio. Todos vigentes.

| # | Ruta | Nombre | Prioridad | Descripción |
|---|------|--------|-----------|-------------|
| 9.1 | `docs/architecture/domains/geo.md` | Geo Domain | **P2** | Modelo de dominio de geolocalización. Zonas, lugares, rutas. |
| 9.2 | `docs/architecture/domains/pricing.md` | Pricing Domain | **P2** | Modelo de dominio de tarifas y precios. Cálculo de costos. |
| 9.3 | `docs/architecture/domains/dispatch.md` | Dispatch Domain | **P2** | Modelo de dominio de asignación de viajes. |
| 9.4 | `docs/architecture/domains/session.md` | Session Domain | **P2** | Modelo de dominio de sesión conversacional. |
| 9.5 | `docs/architecture/domains/trip.md` | Trip Domain | **P2** | Modelo de dominio de viaje. Datos y ciclo de vida de un viaje. |

---

## 10. Especificación Funcional

Documentos que describen qué debe hacer el sistema y cómo debe comportarse.

| # | Ruta | Nombre | Estado | Autoridad | SSOT | Prioridad | Descripción |
|---|------|--------|--------|-----------|------|-----------|-------------|
| 10.1 | `docs/specifications/CONVERSATION_DECISION_ALGORITHM.md` | Conversation Decision Algorithm (CDA) | ✅ Vigente | **Normativo** | ✅ Sí | **P1** | **Single Source of Truth funcional.** Define el algoritmo de decisión conversacional. Jerarquía superior a Specification y ADR (ADR-013). |
| 10.2 | `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` | Functional Behavior Spec (FBS) | ✅ Vigente | **Normativo** | ❌ (subsidiario al CDA) | **P1** | Especificación funcional y comportamental. Verdad funcional canónica subordinada al CDA. |

---

## 11. Contexto AI (prompts)

Documentos del contexto de AI (`docs/ai/`) utilizados como referencia en prompts de agentes. Todos vigentes.

| # | Ruta | Nombre | Prioridad | Descripción |
|---|------|--------|-----------|-------------|
| 11.1 | `docs/ai/README.md` | AI Context Index | **P1** | Índice del contexto AI. Dirige a los agentes a la lectura requerida. |
| 11.2 | `docs/ai/ARCHITECTURE_BIBLE.md` | Architecture Bible | **P1** | Verdad arquitectónica canónica para agentes AI. |
| 11.3 | `docs/ai/ARCHITECTURE_RULES.md` | Architecture Rules | **P1** | Reglas arquitectónicas estrictas derivadas del código. |
| 11.4 | `docs/ai/INVARIANTS.md` | Invariants | **P1** | Invariantes arquitectónicas que deben mantenerse en todas las operaciones. |
| 11.5 | `docs/ai/ENGINE_CONTRACTS.md` | Engine Contracts | **P2** | Definiciones de contratos entre motores de AITOS. |
| 11.6 | `docs/ai/DECISION_TREE.md` | Decision Tree | **P2** | Árbol de decisión runtime derivado de la implementación real. |
| 11.7 | `docs/ai/QUALITY_GATE.md` | Quality Gate | **P2** | Checklist de calidad para modificaciones. |
| 11.8 | `docs/ai/COMMON_FAILURES.md` | Common Failures | **P3** | Referencia de errores comunes de agentes AI. |

---

## 12. Base de Conocimiento

Reglas de negocio por dominio. Todos vigentes.

| # | Ruta | Nombre | Prioridad | Descripción |
|---|------|--------|-----------|-------------|
| 12.1 | `docs/knowledge/README.md` | Knowledge Index | **P1** | Índice del directorio de conocimiento de negocio. |
| 12.2 | `docs/knowledge/business-rules.md` | Business Rules | **P1** | Reglas de negocio generales derivadas del código. |
| 12.3 | `docs/knowledge/pricing-rules.md` | Pricing Rules | **P2** | Reglas de tarifas y precios. |
| 12.4 | `docs/knowledge/geo-rules.md` | Geo Rules | **P2** | Reglas de geolocalización y zonas. |
| 12.5 | `docs/knowledge/dispatch-rules.md` | Dispatch Rules | **P2** | Reglas de asignación de viajes. |
| 12.6 | `docs/knowledge/fleet-rules.md` | Fleet Rules | **P2** | Reglas de flota de vehículos. |
| 12.7 | `docs/knowledge/learning-rules.md` | Learning Rules | **P3** | Reglas del sistema de aprendizaje. |
| 12.8 | `docs/knowledge/whatsapp-rules.md` | WhatsApp Rules | **P2** | Reglas del canal WhatsApp. |

---

## 13. Proyecto y Gestión

Documentos de gestión del proyecto. Todos vigentes.

| # | Ruta | Nombre | Prioridad | Descripción |
|---|------|--------|-----------|-------------|
| 13.1 | `docs/project/PROJECT_CONTEXT.md` | Project Context | **P1** | Estado actual condensado del proyecto (14 secciones). |
| 13.2 | `docs/project/PROJECT_BOARD.md` | Project Board | **P2** | Tablero de tareas P0-P3 con estados y prioridades. |
| 13.3 | `docs/project/CHANGELOG.md` | Changelog | **P3** | Bitácora completa de PRs ejecutados. |
| 13.4 | `docs/project/PROJECT_GOVERNANCE.md` | Project Governance | **P2** | Reglas de gobierno para la toma de decisiones del proyecto. |
| 13.5 | `docs/project/PROJECT_WORKFLOW.md` | Project Workflow | **P2** | Flujo de trabajo actual del proceso de desarrollo. |
| 13.6 | `docs/project/EXECUTION_PHASE.md` | Execution Phase | **P2** | Documento de fase de ejecución del proyecto. |
| 13.7 | `docs/project/CONVERSATION_IMPROVEMENT_PROCESS.md` | Conversation Improvement | **P2** | Proceso de mejora continua conversacional. |
| 13.8 | `docs/project/HUMAN_EXPERIENCE_CHARTER.md` | Human Experience Charter | **P2** | Carta de experiencia humana del sistema. |
| 13.9 | `docs/project/FUNCTIONAL_DASHBOARD.md` | Functional Dashboard | **P3** | Dashboard funcional del proyecto. |
| 13.10 | `docs/project/LEARNING_LOOP.md` | Learning Loop | **P3** | Ciclo de aprendizaje del proyecto. |
| 13.11 | `docs/project/PILOT_METRICS.md` | Pilot Metrics | **P3** | Métricas del piloto. |

---

## 14. Operación

Guías de operación, deploy y monitoreo. Todos vigentes.

| # | Ruta | Nombre | Prioridad | Descripción |
|---|------|--------|-----------|-------------|
| 14.1 | `docs/operations/PILOT_OPERATION_GUIDE.md` | Pilot Operation Guide | **P1** | Guía de operación del piloto. Deploy, configuración y monitoreo. |
| 14.2 | `docs/operations/PRODUCTION_CHECKLIST.md` | Production Checklist | **P2** | Checklist de auditoría de configuración de producción. |
| 14.3 | `docs/operations/MONITORING_DASHBOARD.md` | Monitoring Dashboard | **P2** | Especificación del dashboard de monitoreo. |

---

## 15. Calidad y Línea Base

Líneas base, registros de certificación, calidad y deuda técnica. Solo vigentes incluidas.

| # | Ruta | Nombre | Prioridad | Descripción |
|---|------|--------|-----------|-------------|
| 15.1 | `docs/certification/CERTIFICATION_REGISTRY.md` | Certification Registry | **P2** | Registro central de certificaciones. SSOT de certificaciones completadas. |
| 15.2 | `docs/certification/TECHNICAL_DEBT_BASELINE.md` | Technical Debt Baseline | **P2** | Línea base de deuda técnica v1.0. Referencia para medir evolución. |
| 15.3 | `docs/certification/QUALITY_BASELINE.md` | Quality Baseline | **P2** | Línea base de calidad v1.0. |
| 15.4 | `docs/certification/TEST_BASELINE.md` | Test Baseline | **P2** | Línea base del suite de tests v1.0. |
| 15.5 | `docs/certification/BASELINE.md` | System Baseline | **P2** | Línea base del sistema. Snapshot de identidad del sistema. |
| 15.6 | `docs/certification/SYSTEM_BASELINE_REPORT.md` | System Baseline Report | **P2** | Reporte de línea base del sistema. |
| 15.7 | `docs/certification/QA_GOVERNANCE.md` | QA Governance | **P2** | Reglas de gobierno del ciclo de vida de defectos CAT. |
| 15.8 | `docs/certification/EVIDENCE_ONTOLOGY.md` | Evidence Ontology | **P2** | Ontología cognitiva oficial para Architecture Freeze (ADR-009). |
| 15.9 | `docs/certification/MESSAGE_TAXONOMY.md` | Message Taxonomy | **P2** | Taxonomía completa de mensajes conversacionales. |
| 15.10 | `docs/certification/HUMAN_LAYER_ARCHITECTURE.md` | Human Layer Architecture | **P2** | Documento de referencia arquitectónica para separación Human/Operational. |
| 15.11 | `docs/certification/CONVERSATION_INTERPRETER_CONTRACT.md` | Conversation Interpreter Contract | **P2** | Documento de contrato de ADR-007 para Conversation Interpreter. |
| 15.12 | `docs/certification/CAT_CERTIFICATION_REGISTER.md` | CAT Certification Register | **P2** | Registro de campañas de certificación CAT. |

---

## 16. Incidentes

Reportes de incidentes y resolución.

| # | Ruta | Nombre | Prioridad | Descripción |
|---|------|--------|-----------|-------------|
| 16.1 | `docs/incidents/H-CAT2-001_RECOVERY_SLOT_LOSS.md` | H-CAT2-001: Recovery Slot Loss | **P2** | Incidente de pérdida de slots en estado RECOVERY. Resuelto en BUILD-AUDIT-1. Se conserva como registro. |

---

## 17. Auditoría

Reporte de auditoría sistémica completa.

| # | Ruta | Nombre | Prioridad | Descripción |
|---|------|--------|-----------|-------------|
| 17.1 | `docs/audit/AUDIT_REPORT_COMPLETE.md` | Complete Audit Report | **P2** | Auditoría sistémica completa de AITOS (Jul 2026). ~60 hallazgos clasificados. Referencia para línea base de auditoría. |

---

## H. Documentos Históricos (Apéndice)

Documentos que ya cumplieron su propósito. Se listan aquí para que quede constancia de su existencia pero **no deben leerse como fuente de verdad vigente**.

### H.1 Certificaciones Históricas (59 docs)

Estos documentos fueron certificaciones one-time de PRs, campañas de testing, o auditorías puntuales que ya cumplieron su ciclo de vida.

`docs/certification/` — históricos:
AITOS_ADAPTIVE_POLICY_AUDIT, AITOS_CONTEXT_PERSISTENCE_AUDIT, AITOS_CONVERSATIONAL_ALIGNMENT_AUDIT, AITOS_CONVERSATION_STRATEGY_DISCOVERY, AITOS_E11B_IMPLEMENTATION, AITOS_E11B_SEMANTIC_SIGNALS_AUDIT, AITOS_E12_IMPLEMENTATION, AITOS_HARNESS_EVOLUTION_AUDIT, AITOS_INTENT_MODEL_EVOLUTION_AUDIT, AITOS_KNOWLEDGE_GOVERNANCE_PROPOSAL, AITOS_SEMANTIC_POLICY_BRIDGE_AUDIT, ARCHITECTURAL_IMPACT_ANALYSIS, ARCHITECTURE_FINDINGS, ARCHITECTURE_RECOMMENDATION, BUG_AUDIT, CACHE_POLICY_ANALYSIS, CLEANUP_EXECUTION_REPORT, CLEANUP_PLAN, CONTEXT_LOSS_AUDIT, CONTEXT_LOSS_FIX, CONVERSATIONAL_UX_AUDIT, COVERAGE_REPORT, CX-1_CONVERSATION_EXPERIENCE_CERTIFICATION, DB_CODE_PARITY, DB_REAL_AUDIT, DISPATCH_RESOLUTION_AUDIT, ENTITY_EXTRACTION_BOUNDARIES, GEO_DOMAIN_REVERSE_ENGINEERING, GOVERNANCE_FREEZE, H0A_STAGING_HARDENING_AUDIT, H0C_SECRET_AUDIT, HARDCODE_AUDIT, HARDENING_P0_REPORT, HARNESS_ALIGNMENT_AUDIT, HARNESS_ALIGNMENT_IMPLEMENTATION, LEAD_SERVICE_FINAL_AUDIT, LEAD_SERVICE_REFACTOR_01, LEAD_SERVICE_REFACTOR_02, LEAD_SERVICE_REFACTOR_03, LEAD_SERVICE_REFACTOR_04, LEGACY_RESIDUALS, LOCATION_RESOLVER_AUDIT, MERGE_STRATEGY_ANALYSIS, MIDDLEWARE_DEFERRED_CLEANLY, NOMENCLATURE_AUDIT, OPENCODE_CONFIGURATION_ARCHITECTURE_AUDIT, PILOT_READINESS_GATE, PLAN_MODE_VISIBILITY_AUDIT, PR-CAT1_EXTERNAL_ACCEPTANCE_CAMPAIGN, PR-CATS-1_CONVERSATION_ACCEPTANCE_SUITE, PR-QA1_ARCHITECTURAL_CONSISTENCY_AUDIT, PR-QA2_RUNTIME_FLOW_TRACE, PR-QA2B_CONVERSATIONAL_STATE_FORENSICS, PR-QA3_S2A_SINGLE_CORE_CERTIFICATION, PR-QA3_S2B_HOTEL_ESTURION_TRACE, PR_VERIFY_STRATEGIC_DIRECTOR_LAYER, QA1_FUNCTIONAL_CERTIFICATION, RC1_RELEASE, REGRESSION_REPORT, RELEASE_READINESS, REPOSITORY_HARDENING_FINAL, REPOSITORY_HEALTH_REPORT, REPOSITORY_HYGIENE, SDL_CONTRACT_CERTIFICATION, SLOT_MERGE_BUG_AUDIT, STABILIZATION_MILESTONE, TEST_FAILURE_AUDIT, TEST_FIX_REPORT, TEST_RECOVERY_REPORT

### H.2 Exploración Arquitectónica Histórica (68 docs)

Series PR-*, CE-*, PDE-*, PAA-*, PBA-*, PD-IM-*, POA-*, IDA-*, IM-*, MOV-*, MRC-*, OP-*, ARR-*, S1A-*, FCER-*, REVERSE_ENGINEERING_REPORT, más varios docs pre-Freeze.

`docs/architecture/` — históricos:
ARCHITECTURE_ATLAS, ARCHITECTURE_MILESTONE_v2.0, ARCHITECTURE_STATUS, ARR-1_MEMORY_READINESS, CE-1_COGNITIVE_EFFICIENCY_AUDIT, CE-2_INEVITABILITY_CLASSIFICATION, CE-3A_BUSINESS_KNOWLEDGE_ENGINE, CE-3B_DETERMINISTIC_REASONING_LAYER, CE-4_MIGRATION_ROADMAP, CE-5_IMPLEMENTATION_READINESS, DECISION_OWNERSHIP_MATRIX, DEFERRED_MIDDLEWARE, FCER-1_FIRST_COGNITIVE_EVIDENCE_REPORT, IDA-1_INTERNAL_DEPENDENCY_AUDIT, IDA-2_DEPENDENCY_REFACTOR_EXECUTION, IM-0_MEMORY_IMPLEMENTATION_SCOPE, IM-1_CLOSURE_REPORT, MOV-1_MEMORY_OPERATIONAL_VALIDATION, MRC-1_MEMORY_READ_CONTRACT_ARCHITECTURE, OP-1_COGNITIVE_FEATURE_FLAG_ROLLOUT, PAA-1_PATTERN_ACCEPTANCE_AUDIT, PBA-1_PROJECTION_BOUNDARY_AUDIT, PD-IM-0_PATTERN_DISCOVERY_IMPLEMENTATION_SCOPE, PDE-1_PATTERN_DISCOVERY_EXECUTION_ARCHITECTURE, POA-1_PATTERN_ONTOLOGY_AUDIT, PR-10A_BOUNDARY_ONTOLOGY, PR-10B_BOUNDARY_MATHEMATICAL_MODEL, PR-10C_BOUNDARY_CONTRACT, PR-10D_BOUNDARY_EVOLUTION, PR-10E_BOUNDARY_MINIMALITY, PR-10F_BOUNDARY_SEMANTICS, PR-11_COGNITIVE_REALITY_ALIGNMENT, PR-12_CONVERSATIONAL_EXPERIENCE_AUDIT, PR-12A_DECISION_INTEGRATION_AUDIT, PR-12B_MPM-1_MEMORY_PERSISTENCE_MODEL_AUDIT, PR-12C_MCC-1_MEMORY_CONTRACT_CONSOLIDATION, PR-12D_MCR-1_MEMORY_CONTRACT_RESOLUTION, PR-12E_CNV-1_CONTRACT_NORMALIZATION_VALIDATION, PR-13_ATR-1_ARCHITECTURE_TRANSITION_READINESS, PR-7A_LEARNING_ONTOLOGY_AUDIT, PR-7B_LEARNING_MATHEMATICAL_MODEL, PR-7C_LEARNING_PARAMETER_SPACE_AND_EVIDENCE, PR-7D_LEARNING_CONTRACT_DERIVATION, PR-7E_LEARNING_IDENTITY_AUDIT, PR-7F_LEARNING_MINIMALITY_AUDIT, PR-7G_PATTERN_SEMANTICS_AUDIT, PR-8A_GOALS_ONTOLOGY_AUDIT, PR-8B_GOALS_MATHEMATICAL_MODEL, PR-8C_GOAL_IDENTITY, PR-8D_CONTRACT_DERIVATION, PR-8E_EVOLUTION_AUDIT, PR-8F_MINIMALITY_AUDIT, PR-8G_GOAL_SEMANTICS_AUDIT, PR-9A_PLANNING_ONTOLOGY_AUDIT, PR-9B_PLANNING_MATHEMATICAL_MODEL, PR-9C_PLANNING_IDENTITY, PR-9D_CONTRACT_DERIVATION, PR-9E_EVOLUTION_AUDIT, PR-9F_MINIMALITY_AUDIT, PR-9G_PLANNING_SEMANTICS_AUDIT, REVERSE_ENGINEERING_REPORT, S1A_GLOBAL_IRREDUCIBILITY_AUDIT

`docs/architecture/reverse-engineering/`:
architecture-graphs.md

### H.3 Historia Temprana pre-v0 (8 docs)

`docs/history/`:
README, agent-contracts, COMMERCIAL-MODEL-SPEC, counterproposal-colleague, proposal-claude, skills, synthesis-final, USECASES

### H.4 Incidentes Históricos (2 docs)

`docs/incidents/`:
INC-001_BUILD_FAILURE_PREVIEW_CONFIG_DRIFT, CAT2_RESULT_REPORT

---

## Documentos SSOT (Single Source of Truth)

Estos son los documentos que constituyen la fuente única de verdad para sus respectivos dominios. Un nuevo desarrollador debe leerlos primero.

| # | Documento | Dominio | ¿Qué define? |
|---|-----------|---------|--------------|
| 1 | `docs/specifications/CONVERSATION_DECISION_ALGORITHM.md` | Comportamiento funcional | Algoritmo de decisión conversacional — SSOT funcional (ADR-013) |
| 2 | `docs/adr/001-layered-architecture.md` | Arquitectura general | Dirección de dependencias entre capas |
| 3 | `docs/adr/004-service-boundaries.md` | Fronteras de servicio | Orden de dependencias y prohibición de circulares |
| 4 | `docs/adr/005-ai-first-interpretation.md` | Interpretación AI | Prohibición de heuristics |
| 5 | `docs/adr/007-conversation-interpreter.md` | Pipeline conversacional | Etapa de interpretación conversacional |
| 6 | `docs/adr/008-conversational-decision-architecture.md` | Decisiones estratégicas | `computeStrategyDecision()` como única fuente |
| 7 | `docs/adr/009-evidence-engine-architecture.md` | Pipeline cognitivo | 7 capas congeladas Signal→Decision |
| 8 | `docs/adr/012-cognitive-escalation-principle.md` | Prioridad de conocimiento | Stack determinístico → reglas → LLM |
| 9 | `docs/adr/013-conversation-decision-algorithm.md` | Autoridad funcional | Jerarquía Implementation → CDA → Spec → ADR |
| 10 | `docs/architecture/INTERFACE_FREEZE_V2.md` | Interfaces del ecosistema | Freeze vigente del ecosistema de desarrollo |
| 11 | `docs/architecture/MISSION_PHASE_ARCHITECTURE.md` | Ciclo de misión | Fases PLAN→BUILD |
| 12 | `docs/architecture/STRATEGIC_OPERATIONAL_CONTRACT.md` | Separación cognitiva | Contrato PLAN↔BUILD |
| 13 | `docs/architecture/ARCHITECTURE_MILESTONE_v3.0.md` | Arquitectura actual | Milestone arquitectónico vigente |
| 14 | `docs/architecture/ADR_INDEX.md` | Índice de ADRs | Navegador de decisiones arquitectónicas |
| 15 | `docs/SYSTEM_BIBLE.md` | Identidad del sistema | Propósito y valores de AITOS |

---

## Camino de Lectura para Nuevo Desarrollador

> Para entender AITOS completamente, leer en este orden:

### 🔴 P1 — Esencial (leer primero, en orden)

| Orden | Documento | Tiempo estimado | Por qué |
|-------|-----------|-----------------|---------|
| 1 | `docs/SYSTEM_BIBLE.md` | 10 min | Identidad y propósito del sistema. **Obligatorio pre-arquitectura.** |
| 2 | `docs/specifications/CONVERSATION_DECISION_ALGORITHM.md` | 20 min | SSOT funcional. Qué debe hacer el sistema. Referencia constante. |
| 3 | `docs/project/PROJECT_CONTEXT.md` | 15 min | Estado actual condensado del proyecto. Dónde estamos ahora. |
| 4 | `docs/adr/001-layered-architecture.md` | 10 min | Fundación arquitectónica: cómo se organiza el código. |
| 5 | `docs/adr/004-service-boundaries.md` | 10 min | Reglas de dependencias: qué puede importar qué. |
| 6 | `docs/adr/005-ai-first-interpretation.md` | 10 min | Principio de interpretación: por qué se usa LLM. |
| 7 | `docs/adr/007-conversation-interpreter.md` | 10 min | Pipeline: etapa de interpretación conversacional. |
| 8 | `docs/adr/008-conversational-decision-architecture.md` | 10 min | Cómo se toman decisiones estratégicas. Architecture Freeze. |
| 9 | `docs/adr/009-evidence-engine-architecture.md` | 10 min | Pipeline cognitivo de 7 capas. |
| 10 | `docs/adr/012-cognitive-escalation-principle.md` | 10 min | Stack de inteligencia: determinístico → reglas → LLM. |
| 11 | `docs/adr/013-conversation-decision-algorithm.md` | 10 min | Jerarquía documental: CDA > Spec > ADR. |
| 12 | `docs/architecture/STRATEGIC_OPERATIONAL_CONTRACT.md` | 10 min | Cómo opera el ecosistema PLAN↔BUILD. |
| 13 | `docs/architecture/INTERFACE_FREEZE_V2.md` | 10 min | Freeze vigente del ecosistema. |
| 14 | `docs/architecture/ARCHITECTURE_MILESTONE_v3.0.md` | 10 min | Milestone arquitectónico actual. |
| 15 | `docs/architecture/decision-architecture.md` | 15 min | Pipeline de decisiones conversacionales. |
| 16 | `docs/architecture/conversation-pipeline.md` | 10 min | Pipeline ADR-008 completo. |
| 17 | `docs/architecture/strategy-decision.md` | 10 min | Ciclo de vida de StrategyDecision. |
| 18 | `docs/ai/ARCHITECTURE_BIBLE.md` | 10 min | Verdad arquitectónica canónica para AI agents. |
| 19 | `docs/ai/ARCHITECTURE_RULES.md` | 10 min | Reglas arquitectónicas estrictas. |
| 20 | `docs/ai/INVARIANTS.md` | 10 min | Invariantes que siempre deben cumplirse. |
| 21 | `docs/architecture/diagrams/01-system-overview.md` | 5 min | Vista general del pipeline. |
| 22 | `docs/architecture/diagrams/05-extraction-phase.md` | 5 min | Extracción de slots. |
| 23 | `docs/architecture/diagrams/12-workflow-state-machine.md` | 5 min | Máquina de estados conversacionales. |
| 24 | `docs/architecture/diagrams/16-policy-pipeline.md` | 5 min | Orquestador del flujo. |
| 25 | `docs/architecture/diagrams/17-strategy-decision-flow.md` | 5 min | Flujo de StrategyDecision. |
| 26 | `docs/architecture/diagrams/runtime-flow.md` | 5 min | Flujo runtime completo. |
| 27 | `docs/architecture/system-overview.md` | 5 min | Vista de alto nivel. |
| 28 | `docs/architecture/design-principles.md` | 10 min | Principios de diseño. |

**Tiempo total estimado P1: ~4 horas**

### 🟡 P2 — Importante (segunda semana)

| Orden | Documento | Categoría |
|-------|-----------|-----------|
| 1 | `docs/architecture/ADR_INDEX.md` | Guía de navegación de ADRs |
| 2 | `docs/architecture/system-map.md` | Mapa de componentes |
| 3 | `docs/architecture/capability-map.md` | Capacidades del sistema |
| 4 | `docs/architecture/engines.md` | Motores del sistema |
| 5 | `docs/architecture/bounded-contexts.md` | Fronteras entre dominios |
| 6 | `docs/architecture/operational-model.md` | Modelo operacional |
| 7 | `docs/architecture/handler-context.md` | Contexto de handlers |
| 8 | `docs/knowledge/business-rules.md` | Reglas de negocio generales |
| 9 | `docs/knowledge/geo-rules.md` | Reglas de geolocalización |
| 10 | `docs/knowledge/pricing-rules.md` | Reglas de tarifas |
| 11 | `docs/knowledge/dispatch-rules.md` | Reglas de asignación |
| 12 | `docs/knowledge/fleet-rules.md` | Reglas de flota |
| 13 | `docs/knowledge/whatsapp-rules.md` | Reglas de WhatsApp |
| 14 | `docs/architecture/domains/geo.md` | Modelo de dominio Geo |
| 15 | `docs/architecture/domains/pricing.md` | Modelo de dominio Pricing |
| 16 | `docs/architecture/domains/dispatch.md` | Modelo de dominio Dispatch |
| 17 | `docs/architecture/domains/session.md` | Modelo de dominio Session |
| 18 | `docs/architecture/domains/trip.md` | Modelo de dominio Trip |
| 19 | `docs/architecture/GOVERNANCE.md` | Gobierno documental |
| 20 | `docs/architecture/glossary.md` | Glosario de términos |
| 21 | `docs/architecture/knowledge-map.md` | Mapa de conocimiento |
| 22 | `docs/architecture/ARCHITECTURE_BASELINE.md` | Línea base arquitectónica |
| 23 | `docs/certification/CERTIFICATION_REGISTRY.md` | Registro de certificaciones |
| 24 | `docs/certification/TECHNICAL_DEBT_BASELINE.md` | Deuda técnica |
| 25 | `docs/operations/PILOT_OPERATION_GUIDE.md` | Guía de operación |
| 26 | `docs/project/PROJECT_BOARD.md` | Estado de tareas |
| 27 | `docs/project/PROJECT_GOVERNANCE.md` | Gobierno del proyecto |
| 28 | `docs/adr/002-database-facade.md`, `003-learning-domain.md`, `006-schema-parity.md`, `010-memory-architecture.md`, `014-experimental-layers-hygiene.md` | ADRs complementarias |
| 29 | `docs/ROADMAP.md` | Hoja de ruta |
| 30 | Diagramas architecture/diagrams/ 02-04, 06-11, 13-15, 18-19, dfd, sequence, state-machines | Diagramas específicos |

**Tiempo total estimado P2: ~6-8 horas**

### 🟢 P3 — Contextual (primer mes)

- `docs/architecture/fractal-architecture.md` — patrones arquitectónicos
- `docs/architecture/drift-report.md` — desviaciones conocidas
- `docs/architecture/documentation-coverage.md` — cobertura documental
- `docs/architecture/maturity-model.md` — madurez por componente
- `docs/architecture/metrics.md` — definiciones de métricas
- `docs/architecture/dashboard.md` — dashboard arquitectónico
- `docs/architecture/DIAGRAMS.md` — reglas de diagramas
- `docs/certification/EVIDENCE_ONTOLOGY.md` — ontología cognitiva
- `docs/certification/MESSAGE_TAXONOMY.md` — taxonomía de mensajes
- `docs/certification/HUMAN_LAYER_ARCHITECTURE.md` — capa humana
- `docs/certification/QUALITY_BASELINE.md` — baseline de calidad
- `docs/certification/TEST_BASELINE.md` — baseline de tests
- `docs/certification/SYSTEM_BASELINE_REPORT.md` — baseline del sistema
- `docs/certification/BASELINE.md` — baseline general
- `docs/certification/QA_GOVERNANCE.md` — gobierno QA
- `docs/certification/CONVERSATION_INTERPRETER_CONTRACT.md` — contrato ADR-007
- `docs/certification/CAT_CERTIFICATION_REGISTER.md` — registro CAT
- `docs/knowledge/learning-rules.md` — reglas de aprendizaje
- `docs/project/CHANGELOG.md` — bitácora histórica
- `docs/project/EXECUTION_PHASE.md` — fase de ejecución
- `docs/project/CONVERSATION_IMPROVEMENT_PROCESS.md` — mejora continua
- `docs/project/HUMAN_EXPERIENCE_CHARTER.md` — experiencia humana
- `docs/operations/PRODUCTION_CHECKLIST.md` — checklist producción
- `docs/operations/MONITORING_DASHBOARD.md` — monitoreo
- `docs/incidents/H-CAT2-001_RECOVERY_SLOT_LOSS.md` — incidente recovery
- `docs/audit/AUDIT_REPORT_COMPLETE.md` — auditoría sistémica
- `docs/ai/ENGINE_CONTRACTS.md`, `DECISION_TREE.md`, `QUALITY_GATE.md`, `COMMON_FAILURES.md` — contexto AI
- `docs/project/FUNCTIONAL_DASHBOARD.md`, `LEARNING_LOOP.md`, `PILOT_METRICS.md` — gestión
- `docs/architecture/DEVELOPMENT_ECOSYSTEM_ARCHITECTURE_FREEZE_V1.md`, `DUAL_INTERFACE_ARCHITECTURE.md` — freeze anteriores
- `docs/adr/011-reflection-elimination.md` — ADR menor

### 🔵 REF — Referencia (cuando sea necesario)

- `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` — especificación funcional detallada
- `docs/project/PROJECT_WORKFLOW.md` — flujo de trabajo
- `docs/ai/README.md` — índice AI context
- Documentos históricos completos (Apéndice H)

---

## Métricas del Inventario

| Métrica | Valor |
|---------|-------|
| Archivos totales relevados | 265 |
| Documentos vigentes catalogados | ~121 |
| Documentos históricos identificados | ~144 |
| Documentos SSOT (Single Source of Truth) | 15 |
| Prioridad P1 (esencial) | ~28 documentos (~4h de lectura) |
| Prioridad P2 (importante) | ~30 documentos (~6-8h de lectura) |
| Prioridad P3 (contextual) | ~40 documentos |
| Prioridad REF (referencia) | ~30 documentos |
| Históricos (no leer) | ~146 documentos |

---

## Historial de actualizaciones del inventario

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-07-20 | Creación inicial (267 archivos, 15 SSOT). | PLAN (KNOWLEDGE_INVENTORY) |
| 2026-07-20 | **Enriquecimiento D2**: CDA v1.1 → Apéndice C con referencias CX-1 (21 casos C1-C21) y SLOT_MERGE_BUG_AUDIT. Eliminados `PIPELINE_V2_PROPOSAL.md` y `CONVERSATION_PIPELINE_AUDIT.md` (info redefinida/cubierta por CDA). | BUILD (KNOWLEDGE_INVENTORY) |
| 2026-07-20 | **Enriquecimiento D4**: ADR-012 §10 → referencias cruzadas a CE y PR-7 series. ADR-009 §7 → ontología de lenguajes cognitivos PR-7A. ADR-014 §5 → CE-3A/CE-3B como referencias redefinidas. | BUILD (KNOWLEDGE_INVENTORY) |

---

*Generado: 2026-07-20 | Metodología: rastreo completo + clasificación manual por estado, autoridad y prioridad.*
*Próxima actualización: cuando se agreguen o eliminen documentos significativos en docs/.*
