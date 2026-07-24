# DOC-06 ECOSYSTEM BOUNDARY REPORT

> **Misión:** DOC-06 — Ecosystem Boundary Governance  
> **Ejecutor:** BUILD (AEL)  
> **Fecha:** 2026-07-22  
> **Objetivo:** Definir formalmente los tres niveles del Ecosistema AITOS, clasificar toda la documentación existente dentro de ellos, detectar documentos mal ubicados, resolver ambigüedades terminológicas, y proponer reglas de frontera.  
> **Precedido por:** DOC-04 (SSOT Authority), DOC-05 (SSOT Governance), DOC-05R (System Boundary Clarification)  
> **Restricción:** 0 archivos modificados, 0 archivos movidos, 0 archivos renombrados.

---

## 1. Resumen ejecutivo

Se analizaron **>100 documentos** del Ecosistema AITOS para clasificarlos dentro de tres niveles formales:

| Nivel | Definición | Contiene |
|-------|-----------|----------|
| **AITOS Ecosystem** | Contenedor total del sistema de producto + sistema de desarrollo | Ambos subsistemas + su documentación puente |
| **AITOS Product System** | Sistema desplegado que los clientes usan | Código en `src/`, esquema, ADRs de producto, CDA, constituciones cognitivas |
| **AITOS Development System** | Sistema de ingeniería que construye el producto | Agentes (PLAN, BUILD), AEL, procesos, gobernanza, project tracking |

**Hallazgos principales:**

| # | Hallazgo | Severidad |
|---|----------|-----------|
| 1 | **7 documentos** del Development System están ubicados físicamente en `docs/architecture/` (directorio del Product System) | 🔴 Alta |
| 2 | **"AITOS" se usa con 3 significados distintos** sin distinción explícita | 🔴 Alta |
| 3 | **2 agentes** (PLAN, BUILD) se auto-describen como "de AITOS" cuando deberían decir "del Ecosistema AITOS" | 🟡 Media |
| 4 | **No existe un documento** que formalmente defina el Ecosistema como contenedor | 🟡 Media |
| 5 | **4 documentos** contienen referencias cruzadas que cruzan planos sin declararlo | 🟢 Baja |

---

## 2. Modelo de sistemas recomendado

### 2.1 Diagrama conceptual

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    AITOS ECOSYSTEM                                         │
│                                                                            │
│  Propósito: Contenedor total. Incluye todo lo relacionado con AITOS.      │
│  Autoridad: No tiene un documento único. Es el dominio conceptual.        │
│  Habitantes: Usuarios del producto + Ingenieros del desarrollo.           │
│                                                                            │
│  ┌──────────────────────────────────┐  ┌────────────────────────────────┐ │
│  │ AITOS PRODUCT SYSTEM             │  │ AITOS DEVELOPMENT SYSTEM       │ │
│  │                                  │  │                                │ │
│  │  ¿Qué es?                        │  │  ¿Qué es?                      │ │
│  │  Sistema que los clientes usan   │  │  Sistema que construye el      │ │
│  │  para reservar taxis vía WhatsApp│  │  producto. Agentes, procesos,   │ │
│  │                                  │  │  gobernanza.                   │ │
│  │  ¿Quién lo gobierna?             │  │                                │ │
│  │  AITOS_CONSTITUTION.md           │  │  ¿Quién lo gobierna?           │ │
│  │                                  │  │  AEL SPEC.md                   │ │
│  │  ¿Dónde vive?                    │  │                                │ │
│  │  src/, schema/, docs/adr/,       │  │  ¿Dónde vive?                  │ │
│  │  docs/architecture/ (parcial),   │  │  ael/, .opencode/,             │ │
│  │  docs/specifications/,           │  │  docs/project/, docs/audit/,   │ │
│  │  docs/specification/             │  │  docs/governance/,             │ │
│  │                                  │  │  docs/operations/,             │ │
│  │  ¿Qué NO es?                     │  │  docs/security/,               │ │
│  │  No incluye SDL, AEL, PLAN,     │  │  docs/incidents/               │ │
│  │  BUILD, OpenCode, ni procesos    │  │                                │ │
│  │  de ingeniería.                  │  │  ¿Qué NO es?                   │ │
│  └──────────────────────────────────┘  │  No es el producto. No corre   │ │
│                                        │  en producción. Los clientes   │ │
│                                        │  nunca interactúan con él.     │ │
│                                        └────────────────────────────────┘ │
│                                                                            │
│  DOCUMENTOS PUENTE                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ SYSTEM_BIBLE.md    (contiene P, sirve a D — onboarding del equipo)    │ │
│  │ ARCHITECTURE_STATUS.md (describe P, es referencia para D)            │ │
│  │ PROJECT_CONTEXT.md (condensa P + D para visión unificada)            │ │
│  │ glossary.md       (terminología P, usada por D)                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Principio de pertenencia

> **Un documento pertenece al sistema cuyo comportamiento describe o prescribe.**
> - Si describe cómo funciona el producto (conversación, pricing, dispatch) → **Product System**
> - Si describe cómo se construye el producto (procesos, agentes, gobernanza) → **Development System**
> - Si describe la relación entre ambos o existe para servir a ambos → **Ecosystem** (documento puente)

### 2.3 Relación entre niveles

```
ECOSYSTEM (contiene)
├── PRODUCT SYSTEM (el "qué") — gobernado por AITOS_CONSTITUTION
└── DEVELOPMENT SYSTEM (el "cómo") — gobernado por AEL SPEC

Los dos subsistemas son ORTOGONALES:
- No compiten por autoridad
- No se contradicen (gobiernan dominios diferentes)
- El Product System es el fin; el Development System es el medio
```

---

## 3. Clasificación documental

### 3.1 AITOS PRODUCT SYSTEM

Documentos que describen o prescriben el **comportamiento del sistema desplegado**.

| Nivel | Documento | Ruta | Motivo |
|-------|-----------|------|--------|
| **L0-P** | **AITOS CONSTITUTION** | `docs/architecture/AITOS_CONSTITUTION.md` | Constitución del producto. Define principios, cognitivas, RF, RNF, invariantes y contratos de producto. PC-04 explícitamente excluye proceso de desarrollo. |
| **L1-P** | **CDA** (Conversation Decision Algorithm) | `docs/specifications/CONVERSATION_DECISION_ALGORITHM.md` | Autoridad funcional normativa. Describe el algoritmo conversacional que el producto debe ejecutar. |
| **L1-P** | **FBS** (Functional Behavior Specification) | `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` | Especificación de comportamiento funcional del producto. |
| **L2-P** | **ADR-001 a ADR-014** | `docs/adr/*.md` | Decisiones arquitectónicas del producto (layered arch, DB facade, cognitive escalation, etc.). |
| **L3-P** | **ARCHITECTURE_STATUS.md** | `docs/architecture/ARCHITECTURE_STATUS.md` | Estado arquitectónico actual del producto. Describe qué existe. |
| **L3-P** | **ARCHITECTURE_ATLAS.md** | `docs/architecture/ARCHITECTURE_ATLAS.md` | Índice visual de diagramas del producto. |
| **L3-P** | **architecture.md** | `docs/architecture/architecture.md` | Punto de entrada ejecutivo a la documentación del producto. |
| **L3-P** | **system-overview.md** | `docs/architecture/system-overview.md` | Vista de alto nivel del producto. |
| **L3-P** | **system-map.md** | `docs/architecture/system-map.md` | Mapa operativo del código del producto. |
| **L3-P** | **decision-architecture.md** | `docs/architecture/decision-architecture.md` | Pipeline de decisión del producto. |
| **L3-P** | **design-principles.md** | `docs/architecture/design-principles.md` | Principios derivados del código del producto. |
| **L3-P** | **conversation-pipeline.md** | `docs/architecture/conversation-pipeline.md` | Pipeline conversacional del producto. |
| **L3-P** | **strategy-decision.md** | `docs/architecture/strategy-decision.md` | Implementación de StrategyDecision (código del producto). |
| **L3-P** | **engines.md** | `docs/architecture/engines.md` | Documentación de engines del producto. |
| **L3-P** | **bounded-contexts.md** | `docs/architecture/bounded-contexts.md` | Contextos delimitados del producto. |
| **L3-P** | **capability-map.md** | `docs/architecture/capability-map.md` | Capacidades del producto. |
| **L3-P** | **fractal-architecture.md** | `docs/architecture/fractal-architecture.md` | Patrones del producto. |
| **L3-P** | **handler-context.md** | `docs/architecture/handler-context.md` | HandlerContext del producto. |
| **L3-P** | **knowledge-map.md** | `docs/architecture/knowledge-map.md` | Mapa de conocimiento del producto. |
| **L3-P** | **maturity-model.md** | `docs/architecture/maturity-model.md` | Madurez del producto. |
| **L3-P** | **operational-model.md** | `docs/architecture/operational-model.md` | Modelo operacional del producto. |
| **L3-P** | **glossary.md** | `docs/architecture/glossary.md` | Terminología canónica del producto. |
| **L3-P** | **DECISION_OWNERSHIP_MATRIX.md** | `docs/architecture/DECISION_OWNERSHIP_MATRIX.md` | Quién decide qué en el producto. |
| **L3-P** | **documentation-coverage.md** | `docs/architecture/documentation-coverage.md` | Cobertura documental del producto. |
| **L3-P** | **DIAGRAMS.md** | `docs/architecture/DIAGRAMS.md` | Reglas de diagramas del producto. |
| **L3-P** | **DEFERRED_MIDDLEWARE.md** | `docs/architecture/DEFERRED_MIDDLEWARE.md` | Middleware diferido post-v1 del producto. |
| **L3-P** | **REVERSE_ENGINEERING_REPORT.md** | `docs/architecture/REVERSE_ENGINEERING_REPORT.md` | Due diligence del codebase del producto. |
| **L3-P** | **domains/** (5 files) | `docs/architecture/domains/` | Dominios del producto (dispatch, geo, pricing, session, trip). |
| **L3-P** | **diagrams/** (28 files) | `docs/architecture/diagrams/` | Diagramas del producto. |
| **L4-P** | **ARCHITECTURE_BASELINE.md** | `docs/architecture/ARCHITECTURE_BASELINE.md` | Snapshot generado del producto. |
| **L4-P** | **dashboard.md** | `docs/architecture/dashboard.md` | Dashboard generado del producto. |
| **L4-P** | **drift-report.md** | `docs/architecture/drift-report.md` | Drift generado del producto. |
| **L4-P** | **metrics.md / metrics.json** | `docs/architecture/metrics.md` | Métricas generadas del producto. |
| **L5-P** | **CE-1, CE-2** | `docs/architecture/CE-*.md` | Auditorías de eficiencia cognitiva del producto (baseline vigente). |
| **L5-P** | **CE-3A, CE-3B, CE-4, CE-5** | `docs/architecture/CE-*.md` | Diseños históricos del producto (ARCHIVE_CANDIDATE/HISTÓRICO). |
| **L5-P** | **ARCHITECTURE_MILESTONE_v3.0.md** | `docs/architecture/ARCHITECTURE_MILESTONE_v3.0.md` | Hito histórico del producto. |
| **L5-P** | **DUAL_INTERFACE_ARCHITECTURE.md** | `docs/architecture/DUAL_INTERFACE_ARCHITECTURE.md` | Superseded del producto. |
| **L5-P** | **FCER-1, S1A, PR-11, PR-12*, PR-13, ARR-1, IDA-*, IM-*, MOV-1, MRC-1, OP-1, PAA-1, PBA-1, PD-IM-0, PDE-1, POA-1** | `docs/architecture/*.md` | Auditorías, diseños e implementation reports del producto cognitivo (todos contenido de producto). |
| **—** | **`src/`** | Código fuente | La implementación misma del producto. |
| **—** | **`schema/`** | Schema | Esquema de base de datos del producto. |

### 3.2 AITOS DEVELOPMENT SYSTEM

Documentos que describen o prescriben el **proceso de construcción del producto**.

| Nivel | Documento | Ruta | Motivo |
|-------|-----------|------|--------|
| **L0-D** | **AEL SPEC.md** | `ael/constitution/SPEC.md` | Constitución del proceso de desarrollo. Define invariantes I1-I6, lifecycle L1-L4, capabilities. "governs the evolution of AITOS" (no el producto en sí). |
| **L1-D** | **AEL CONTRACTS.md** | `ael/constitution/CONTRACTS.md` | Reglas R1-R4 de enforcement entre capas de desarrollo. |
| **L1-D** | **ORGANIZATION.md** | `ael/government/ORGANIZATION.md` | Gobierno del equipo de desarrollo. Roles, autoridad, doctrina. Explicitamente distingue producto de desarrollo. |
| **L1-D** | **roles/ (6 files)** | `ael/government/roles/*.md` | Contratos de cada capability de desarrollo (explorer, architect, implementer, auditor, memory, learning). |
| **L1-D** | **GOVERNANCE.md ⚠️** | `docs/architecture/GOVERNANCE.md` | **⚠️ Contenido D, ruta P.** Gobernanza documental del equipo de desarrollo. |
| **L2-D** | **INTERFACE_FREEZE_V2.md ⚠️** | `docs/architecture/INTERFACE_FREEZE_V2.md` | **⚠️ Contenido D, ruta P.** Freeze de interfaces PLAN/BUILD. "ecosistema de desarrollo AITOS". |
| **L2-D** | **MISSION_PHASE_ARCHITECTURE.md ⚠️** | `docs/architecture/MISSION_PHASE_ARCHITECTURE.md` | **⚠️ Contenido D, ruta P.** Arquitectura PLAN→BUILD del desarrollo. |
| **L2-D** | **MISSION_CLOSURE_CONTRACT.md ⚠️** | `docs/architecture/MISSION_CLOSURE_CONTRACT.md` | **⚠️ Contenido D, ruta P.** Contrato de cierre de misión del desarrollo. |
| **L2-D** | **STRATEGIC_OPERATIONAL_CONTRACT.md ⚠️** | `docs/architecture/STRATEGIC_OPERATIONAL_CONTRACT.md` | **⚠️ Contenido D, ruta P.** Contrato PLAN↔BUILD del desarrollo. |
| **L2-D** | **BASELINE_1_0.md** | `docs/governance/BASELINE_1_0.md` | Baseline certificada del proyecto de desarrollo. |
| **L2-D** | **AITOS_ENGINEERING_LIFECYCLE.md** | `docs/governance/AITOS_ENGINEERING_LIFECYCLE.md` | Lifecycle oficial del proceso de desarrollo. |
| **L3-D** | **SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md ⚠️** | `docs/architecture/SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md` | **⚠️ Contenido D, ruta P.** Especificación del Strategic Director Layer (SDL). |
| **L3-D** | **SDL_2_0_ARCHITECTURAL_CONSOLIDATION.md ⚠️** | `docs/architecture/SDL_2_0_ARCHITECTURAL_CONSOLIDATION.md` | **⚠️ Contenido D, ruta P.** Consolidación arquitectónica del SDL. |
| **L4-D** | **PROJECT_BOARD.md** | `docs/project/PROJECT_BOARD.md` | Tablero de tareas del proyecto de desarrollo. |
| **L4-D** | **CHANGELOG.md** | `docs/project/CHANGELOG.md` | Historial de cambios del desarrollo. |
| **L4-D** | **PROJECT_CONTEXT.md** | `docs/project/PROJECT_CONTEXT.md` | Estado condensado del proyecto de desarrollo (contiene info de producto). |
| **L4-D** | **ROADMAP.md** | `docs/project/ROADMAP.md` | Hitos del proyecto de desarrollo. |
| **L4-D** | **PROJECT_GOVERNANCE.md** | `docs/project/PROJECT_GOVERNANCE.md` | Fuentes de verdad del proyecto de desarrollo. |
| **L4-D** | **PROJECT_WORKFLOW.md** | `docs/project/PROJECT_WORKFLOW.md` | Checklist de cierre del desarrollo. |
| **L4-D** | **EXECUTION_PHASE.md** | `docs/project/EXECUTION_PHASE.md` | Fase de ejecución del desarrollo. |
| **L4-D** | **PILOT_METRICS.md** | `docs/project/PILOT_METRICS.md` | KPIs del piloto del desarrollo. |
| **L4-D** | **LEARNING_LOOP.md** | `docs/project/LEARNING_LOOP.md` | Ciclo de aprendizaje del desarrollo. |
| **L4-D** | **HUMAN_EXPERIENCE_CHARTER.md** | `docs/project/HUMAN_EXPERIENCE_CHARTER.md` | Charter de experiencia humana del desarrollo. |
| **L4-D** | **FUNCTIONAL_DASHBOARD.md** | `docs/project/FUNCTIONAL_DASHBOARD.md` | Progreso funcional del desarrollo. |
| **L4-D** | **CONVERSATION_IMPROVEMENT_PROCESS.md** | `docs/project/CONVERSATION_IMPROVEMENT_PROCESS.md` | Flujo de mejora del desarrollo. |
| **L4-D** | **DOC-01 a DOC-06, CTM, compliance, audits** | `docs/audit/*.md` | Auditorías del proyecto de desarrollo. |
| **L4-D** | **CGP certifications, SDL gap, migration, post-audit** | `docs/audit/*.md` | Certificaciones y análisis del desarrollo. |
| **L4-D** | **KNOWLEDGE_INVENTORY.md** | `docs/inventory/KNOWLEDGE_INVENTORY.md` | Inventario maestro del desarrollo. |
| **L4-D** | **H-CAT2-001, INC-001, CAT2_RESULT** | `docs/incidents/*.md` | Incidentes del proyecto de desarrollo. |
| **L4-D** | **PRODUCTION_CHECKLIST.md, PILOT_OPERATION_GUIDE.md, MONITORING_DASHBOARD.md** | `docs/operations/*.md` | Guías operacionales del equipo de desarrollo. |
| **L4-D** | **secrets.md** | `docs/security/secrets.md` | Políticas de seguridad del equipo de desarrollo. |
| **L5-D** | **ael/archive/** (41 files) | `ael/archive/**` | Historial del proceso de desarrollo (pipeline anterior, ontologías archivadas). |
| **—** | **plan.md** | `.opencode/agents/plan.md` | Agente PLAN del desarrollo. |
| **—** | **build.md** | `.opencode/agents/build.md` | Agente BUILD del desarrollo. |
| **—** | **commands/*.md** (9 files) | `.opencode/commands/` | Comandos de ejecución del desarrollo. |
| **—** | **MEMORY.md** | `.opencode/memory/MEMORY.md` | Memoria del equipo de desarrollo. |
| **—** | **opencode.json** | `opencode.json` | Configuración del entorno de desarrollo. |

### 3.3 AITOS ECOSYSTEM — Documentos puente

Documentos que pertenecen al nivel Ecosystem porque contienen información de ambos subsistemas o existen para servir a la relación entre ellos.

| Documento | Ruta | Contenido P | Contenido D | Clasificación |
|-----------|------|-------------|-------------|---------------|
| **SYSTEM_BIBLE.md** | `docs/SYSTEM_BIBLE.md` | ✅ Describe el producto entero | ✅ Sirve para onboarding del equipo | **Ecosystem (puente P→D)** |
| **ARCHITECTURE_STATUS.md** | `docs/architecture/ARCHITECTURE_STATUS.md` | ✅ Estado del producto | ✅ Es referencia para el desarrollo | **Ecosystem (puente P→D)** — aunque su contenido principal es P |
| **PROJECT_CONTEXT.md** | `docs/project/PROJECT_CONTEXT.md` | ✅ Condensa estado del producto | ✅ Es herramienta de gestión del desarrollo | **Ecosystem (puente)** — explícitamente diseñado para unificar |

---

## 4. Documentos mal ubicados

### 4.1 Development System en directorio del Product System

Se identificaron **7 documentos** con contenido 100% de Development System ubicados en `docs/architecture/`, que es el directorio canónico de documentación arquitectónica del Product System:

| Documento en `docs/architecture/` | Contenido real | Sistema correcto | Impacto |
|------------------------------------|----------------|------------------|---------|
| **GOVERNANCE.md** | Reglas de gobernanza documental del equipo | **Development System** | Un lector que busca arquitectura del producto encuentra reglas de documentación del equipo |
| **INTERFACE_FREEZE_V2.md** | Freeze de interfaces PLAN/BUILD (desarrollo) | **Development System** | Describe la relación entre agentes de desarrollo, no componentes del producto |
| **MISSION_PHASE_ARCHITECTURE.md** | Arquitectura PLAN→BUILD (desarrollo) | **Development System** | Define cómo el equipo construye el producto, no cómo funciona el producto |
| **MISSION_CLOSURE_CONTRACT.md** | Contrato de cierre de misión (desarrollo) | **Development System** | Define cuándo el equipo considera completa una tarea |
| **STRATEGIC_OPERATIONAL_CONTRACT.md** | Contrato PLAN↔BUILD (desarrollo) | **Development System** | Define qué hace cada agente de desarrollo |
| **SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md** | Especificación del SDL (desarrollo) | **Development System** | Define cómo PLAN (agente de desarrollo) debe operar |
| **SDL_2_0_ARCHITECTURAL_CONSOLIDATION.md** | Consolidación arquitectónica del SDL | **Development System** | Arquitectura interna de un agente de desarrollo |

**Problema:** `docs/architecture/` es el directorio donde un lector busca documentación del **producto** (cómo funciona, cómo está estructurado, qué decisiones se tomaron). Encontrar aquí documentos sobre procesos de desarrollo genera confusión sobre qué es producto y qué es desarrollo.

**Solución futura (no implementar ahora):** Estos documentos deberían moverse a `ael/` (ej: `ael/governance/GOVERNANCE.md`, `ael/architecture/INTERFACE_FREEZE_V2.md`, etc.).

### 4.2 Matriz de ubicación correcta vs actual

| Directorio | Propósito actual | Propósito correcto | Documentos mal ubicados |
|------------|-----------------|-------------------|------------------------|
| `docs/architecture/` | Arquitectura del producto | **Solo Product System** | 7 documentos D (GOVERNANCE, INTERFACE_FREEZE_V2, MISSION_PHASE_ARCHITECTURE, MISSION_CLOSURE_CONTRACT, STRATEGIC_OPERATIONAL_CONTRACT, SDL_2_0_*) |
| `docs/adr/` | ADRs del producto | **Solo Product System** | ✅ Correcto |
| `docs/specifications/` | Especificaciones del producto | **Solo Product System** | ✅ Correcto |
| `docs/specification/` | Especificación funcional | **Solo Product System** | ✅ Correcto |
| `docs/ai/` | Documentación AI del producto | **Solo Product System** | ✅ Correcto |
| `docs/knowledge/` | Reglas de negocio del producto | **Solo Product System** | ✅ Correcto |
| `docs/certification/` | Certificaciones del producto | **Solo Product System** | ✅ Correcto |
| `ael/` | Desarrollo (AEL) | **Solo Development System** | ✅ Correcto |
| `.opencode/` | Configuración de desarrollo | **Solo Development System** | ✅ Correcto |
| `docs/project/` | Gestión de proyecto | **Solo Development System** | ✅ Correcto |
| `docs/governance/` | Gobernanza del desarrollo | **Solo Development System** | ✅ Correcto |
| `docs/audit/` | Auditorías del desarrollo | **Solo Development System** | ✅ Correcto (aunque algunas contienen info de producto) |
| `docs/incidents/` | Incidentes del desarrollo | **Solo Development System** | ✅ Correcto |
| `docs/operations/` | Guías operacionales | **Solo Development System** | ✅ Correcto |
| `docs/security/` | Seguridad del desarrollo | **Solo Development System** | ✅ Correcto |
| `docs/inventory/` | Inventario del desarrollo | **Solo Development System** | ✅ Correcto |

---

## 5. Ambigüedades terminológicas

### 5.1 "AITOS" sin calificar — 3 significados detectados

| Significado | Contexto | Ejemplos |
|-------------|----------|----------|
| **AITOS = Product System** | Cuando se habla del comportamiento, arquitectura o código del sistema que los clientes usan | "AITOS es un sistema inteligente especializado en la gestión integral de servicios de transporte" (AITOS_CONSTITUTION §1.6). "AITOS is an operating system for transportation logistics" (SYSTEM_BIBLE §2). |
| **AITOS = Development System** | Cuando se habla del nombre del proyecto o equipo de desarrollo | "AEL opera en BUILD phase" (SPEC). "Régimen: AITOS Baseline 1.0" (SDL_2_0_*). |
| **AITOS = Ecosystem** | Cuando se usa como contenedor que incluye producto + desarrollo | "Eres BUILD, la interfaz operacional de AITOS" (build.md). "Ecosistema de desarrollo AITOS" (INTERFACE_FREEZE_V2). |

### 5.2 Referencias específicas con ambigüedad

| Documento | Línea | Frase | Significado actual | Significado correcto |
|-----------|-------|-------|-------------------|---------------------|
| `.opencode/agents/build.md` | 24 | "Eres BUILD, la interfaz operacional de AITOS." | AITOS = Ecosystem? Product? | **Ecosystem** — BUILD es un agente del Development System que sirve al Ecosystem |
| `.opencode/agents/plan.md` | 16 | "Eres PLAN, la interfaz estratégica de AITOS." | AITOS = Ecosystem? Product? | **Ecosystem** — PLAN es un agente del Development System que sirve al Ecosystem |
| `ael/constitution/SPEC.md` | 12 | "ARNÉS is a constraint-based operating system for AI-assisted software engineering. It governs the evolution of AITOS" | AITOS = Product System (lo que se evoluciona) | **Product System** — correcto, el Development System evoluciona el Product System |
| `ael/constitution/SPEC.md` | 177 | "This document is the Constitution of ARNÉS." | Implícitamente la constitución del desarrollo | **Development System** — correcto |
| `docs/architecture/GOVERNANCE.md` | 1 | "Documentation Governance — AITOS" | AITOS = Ecosystem? | **Ecosystem** — la gobernanza documental aplica a ambos sistemas |
| `docs/architecture/INTERFACE_FREEZE_V2.md` | 12 | "Consolidar todo el ecosistema de desarrollo AITOS" | AITOS califica a "ecosistema de desarrollo" | **Ecosystem** — correcto: "ecosistema de desarrollo AITOS" |
| `docs/governance/BASELINE_1_0.md` | — | "AITOS Baseline 1.0" | AITOS = Ecosystem (baseline del proyecto) | **Ecosystem** — la baseline certifica estado de ambos sistemas |
| `docs/architecture/AITOS_CONSTITUTION.md` | 22 | "Constitución del Sistema AITOS" | AITOS = Product System | **Product System** — correcto, aunque §1.2 dice "totalidad del sistema AITOS" que podría interpretarse como Ecosystem |
| `SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md` | 3 | "Strategic Director Layer" | SDL = parte del desarrollo | **Development System** — correcto, SDL es agente de desarrollo |
| `docs/project/PROJECT_CONTEXT.md` | 15 | "Nombre: AITOS — TaxiGuazú Conversational System" | AITOS = Product System (el nombre del producto) | **Product System** — correcto |

### 5.3 Análisis

La ambigüedad más crítica está en los **headers de los agentes PLAN y BUILD**. Ambos dicen ser "la interfaz [estratégica/operacional] de AITOS". Un lector no iniciado interpretará "AITOS" como el producto (el bot de WhatsApp). Pero PLAN y BUILD no son interfaces del producto — son interfaces del **sistema de desarrollo**. La frase correcta sería:

> "Eres PLAN, la interfaz estratégica del **Ecosistema AITOS**."

> "Eres BUILD, la interfaz operacional del **Ecosistema AITOS**."

Esto aclara que no son parte del producto que el cliente usa, sino del ecosistema que lo construye.

---

## 6. Convenciones de nombres recomendadas

### 6.1 Nombres oficiales de los tres niveles

| Nombre oficial | Abreviatura | Uso | Ejemplo |
|---------------|-------------|-----|---------|
| **AITOS Ecosystem** | Ecosystem | Contenedor total. Usar cuando se habla del conjunto producto+desarrollo. | "El AITOS Ecosystem contiene el producto y las herramientas que lo construyen." |
| **AITOS Product System** | Product System | El sistema desplegado. Usar cuando se habla del comportamiento, código o arquitectura que los clientes usan. | "AITOS_CONSTITUTION.md es la constitución del AITOS Product System." |
| **AITOS Development System** | Development System | El sistema de ingeniería. Usar cuando se habla de procesos, agentes, herramientas y gobernanza de construcción. | "AEL SPEC.md es la constitución del AITOS Development System." |

### 6.2 Reglas de uso

| # | Regla | Explicación |
|---|-------|-------------|
| **N-01** | **"AITOS" a secas = Product System** | Cuando no se califica, "AITOS" se refiere al Product System (el sistema que los clientes usan). Esto es consistente con el uso actual en AITOS_CONSTITUTION.md y SYSTEM_BIBLE.md. |
| **N-02** | **"Ecosistema AITOS" cuando se incluye Development** | Cuando se habla de agentes, procesos o herramientas, usar "Ecosistema AITOS" o "AITOS Ecosystem". |
| **N-03** | **Agentes: "del Ecosistema AITOS"** | PLAN y BUILD deben describirse como interfaces "del Ecosistema AITOS", no "de AITOS". |
| **N-04** | **ADRs: siempre son del Product System** | Los ADRs registran decisiones arquitectónicas del producto. No existen ADRs del sistema de desarrollo. Si el Development System requiere una decisión arquitectónica, se documenta como contrato o freeze, no como ADR. |
| **N-05** | **Proyecto: "AITOS Ecosystem" o "AITOS project"** | PROJECT_CONTEXT, PROJECT_BOARD, CHANGELOG hablan del proyecto que abarca ambos sistemas. Usar "AITOS Ecosystem project" o simplemente "proyecto AITOS". |
| **N-06** | **"AITOS Development System" no se abrevia como "AITOS"** | Para evitar ambigüedad, el Development System siempre se menciona con su nombre completo o como "sistema de desarrollo". No decir "AITOS" refiriéndose al Development System. |

### 6.3 Formato de metadata recomendado

Para documentos futuros (o cuando se actualicen existentes), se recomienda incluir en el header:

```
> **Sistema:** AITOS Product System | AITOS Development System | AITOS Ecosystem
> **Nivel:** L0 | L1 | L2 | L3 | L4 | L5
> **Naturaleza:** Normativo | Descriptivo
```

Esto permite a cualquier lector identificar inmediatamente:
- ¿Esto describe el producto o el proceso de construcción?
- ¿Qué nivel de autoridad tiene?
- ¿Prescribe reglas o describe estado?

---

## 7. Cambios necesarios futuros

> ⚠️ **ADVERTENCIA:** Los siguientes cambios son recomendaciones para futuras misiones de edición. No se ejecutan en DOC-06.

### P1 — Corrección de ambigüedad en agentes

| # | Documento | Cambio | Ref. |
|---|-----------|--------|------|
| 1 | `.opencode/agents/build.md` | "Eres BUILD, la interfaz operacional de AITOS" → "Eres BUILD, la interfaz operacional del Ecosistema AITOS" | §5.3 |
| 2 | `.opencode/agents/plan.md` | "Eres PLAN, la interfaz estratégica de AITOS" → "Eres PLAN, la interfaz estratégica del Ecosistema AITOS" | §5.3 |

### P2 — Corrección de ubicación física (mover a ael/)

| # | Documento | Ruta actual (incorrecta) | Ruta correcta | Ref. |
|---|-----------|--------------------------|---------------|------|
| 3 | GOVERNANCE.md | `docs/architecture/GOVERNANCE.md` | `ael/governance/GOVERNANCE.md` | §4.1 |
| 4 | INTERFACE_FREEZE_V2.md | `docs/architecture/INTERFACE_FREEZE_V2.md` | `ael/governance/INTERFACE_FREEZE_V2.md` | §4.1 |
| 5 | MISSION_PHASE_ARCHITECTURE.md | `docs/architecture/MISSION_PHASE_ARCHITECTURE.md` | `ael/contracts/MISSION_PHASE_ARCHITECTURE.md` | §4.1 |
| 6 | MISSION_CLOSURE_CONTRACT.md | `docs/architecture/MISSION_CLOSURE_CONTRACT.md` | `ael/contracts/MISSION_CLOSURE_CONTRACT.md` | §4.1 |
| 7 | STRATEGIC_OPERATIONAL_CONTRACT.md | `docs/architecture/STRATEGIC_OPERATIONAL_CONTRACT.md` | `ael/contracts/STRATEGIC_OPERATIONAL_CONTRACT.md` | §4.1 |
| 8 | SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md | `docs/architecture/SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md` | `ael/architecture/SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md` | §4.1 |
| 9 | SDL_2_0_ARCHITECTURAL_CONSOLIDATION.md | `docs/architecture/SDL_2_0_ARCHITECTURAL_CONSOLIDATION.md` | `ael/architecture/SDL_2_0_ARCHITECTURAL_CONSOLIDATION.md` | §4.1 |

### P3 — Actualización de referencias cruzadas

| # | Documento | Cambio | Ref. |
|---|-----------|--------|------|
| 10 | AITOS_CONSTITUTION.md | Agregar en header: "El AITOS Development System (AEL SPEC) gobierna el proceso de construcción de este producto." | DOC-05 |
| 11 | AEL SPEC.md | Agregar en header: "Este documento gobierna el AITOS Development System. El AITOS Product System se rige por AITOS_CONSTITUTION.md." | DOC-05 |
| 12 | ORGANIZATION.md | Agregar nota: "Los documentos de gobernanza del Development System ubicados en docs/architecture/ serán migrados a ael/ en futura misión." | §4.1 |
| 13 | ARCHITECTURE_STATUS.md | Agregar en header: "Este documento describe el AITOS Product System. Para documentación del Development System, ver ael/." | §3.1 |

---

## 8. Riesgos si se mantiene la frontera actual

### 🔴 R-06-01: Confusión ontológica permanente (Alto)

Si 7 documentos del Development System permanecen en `docs/architecture/`, la confusión entre producto y desarrollo se perpetúa. Cada nuevo miembro del equipo leerá GOVERNANCE.md pensando que describe reglas arquitectónicas del producto, cuando en realidad describe procesos de documentación del equipo.

**Probabilidad:** Alta (ocurre con cada nuevo integrante)
**Impacto:** Medio (confusión temporal, no daño funcional)

### 🔴 R-06-02: Ambigüedad en la comunicación (Alto)

Cuando BUILD dice "interfaz operacional de AITOS", y AITOS_CONSTITUTION dice "AITOS es un sistema inteligente...", un oyente externo asume que BUILD es parte del sistema inteligente. Esto es incorrecto. En discusiones técnicas, esta ambigüedad genera malentendidos sobre responsabilidades y límites del sistema.

**Probabilidad:** Alta (ocurre en toda comunicación externa o documentación)
**Impacto:** Medio (confusión conceptual, no funcional)

### 🟡 R-06-03: Mantenimiento incorrecto (Medio)

Un ingeniero que modifica GOVERNANCE.md (desarrollo) pero lo encuentra en `docs/architecture/` puede asumir que sigue las reglas de ADR (cambios arquitectónicos del producto), cuando en realidad GOVERNANCE.md debería seguir las reglas de AEL (cambios de proceso). Puede aplicar el proceso de cambio incorrecto.

**Probabilidad:** Media
**Impacto:** Medio (proceso incorrecto, no daño al producto)

### 🟡 R-06-04: Dificultad para auditar la separación (Medio)

Si en el futuro se necesita certificar que "el Development System no afecta al Product System" (por ejemplo, para una auditoría de seguridad o compliance), la mezcla de documentos dificulta demostrar la separación.

**Probabilidad:** Baja (auditoría externa poco probable)
**Impacto:** Alto (no poder demostrar separación)

### 🟢 R-06-05: Inercia de la mezcla (Bajo)

Cada nuevo documento de desarrollo que se crea en `docs/architecture/` (siguiendo el precedente de los 7 existentes) refuerza la mala práctica. Sin una regla explícita, la tendencia es seguir la ubicación existente.

**Probabilidad:** Media
**Impacto:** Bajo (cada nuevo documento mal ubicado se suma al problema)

---

## Apéndice A: Mapa de ruta de directorios

```
RUTA ACTUAL (con mezcla)                    RUTA CORRECTA (propuesta)
════════════════════════                     ═══════════════════════

PRODUCT SYSTEM                               PRODUCT SYSTEM
├── docs/architecture/                       ├── docs/architecture/
│   ├── AITOS_CONSTITUTION.md  ✅            │   ├── AITOS_CONSTITUTION.md
│   ├── ARCHITECTURE_STATUS.md ✅            │   ├── ARCHITECTURE_STATUS.md
│   ├── strategy-decision.md   ✅            │   ├── strategy-decision.md
│   ├── bounded-contexts.md    ✅            │   ├── bounded-contexts.md
│   ├── ... (arch desc)        ✅            │   ├── ... (arch desc)
│   ├── ⚠️ GOVERNANCE.md       ❌            │   └── (solo producto)
│   ├── ⚠️ MISSION_PHASE_*.md  ❌            │
│   ├── ⚠️ INTERFACE_FREEZE*.md❌            │   ⚠️ 7 docs deben moverse
│   ├── ⚠️ MISSION_CLOSURE*.md ❌               a ael/
│   ├── ⚠️ STRATEGIC_OP*.md    ❌
│   └── ⚠️ SDL_2_0_*.md        ❌
│
├── docs/adr/                    ✅          ├── docs/adr/
├── docs/specifications/         ✅          ├── docs/specifications/
├── docs/specification/          ✅          ├── docs/specification/
├── docs/ai/                     ✅          ├── docs/ai/
├── docs/knowledge/              ✅          ├── docs/knowledge/
├── docs/certification/          ✅          ├── docs/certification/
└── src/ + schema/               ✅          └── src/ + schema/

DEVELOPMENT SYSTEM                           DEVELOPMENT SYSTEM
├── ael/                          ✅         ├── ael/
│   ├── constitution/             ✅         │   ├── constitution/
│   ├── government/               ✅         │   ├── government/
│   └── archive/                  ✅         │   ├── archive/
│                                            │   ├── governance/      ← MOVED
├── docs/project/                 ✅         │   │   └── GOVERNANCE.md
├── docs/governance/              ✅         │   ├── contracts/       ← MOVED
├── docs/audit/                   ✅         │   │   ├── MISSION_PHASE_ARCHITECTURE.md
├── docs/incidents/               ✅         │   │   ├── MISSION_CLOSURE_CONTRACT.md
├── docs/operations/              ✅         │   │   └── STRATEGIC_OPERATIONAL_CONTRACT.md
├── docs/security/                ✅         │   ├── architecture/    ← MOVED
├── docs/inventory/               ✅         │   │   ├── SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md
│                                            │   │   ├── SDL_2_0_ARCHITECTURAL_CONSOLIDATION.md
├── .opencode/                    ✅         │   │   └── INTERFACE_FREEZE_V2.md
│   ├── agents/                   ✅         │   └── ... (futuros)
│   ├── commands/                 ✅         │
│   └── memory/                   ✅         ├── docs/project/
│                                            ├── docs/governance/
ECOSYSTEM                                    ├── docs/audit/
├── docs/SYSTEM_BIBLE.md          ✅         ├── docs/incidents/
├── docs/project/PROJECT_CONTEXT  ✅ (puente)├── docs/operations/
├── docs/architecture/ARCH_STATUS ✅ (puente)├── docs/security/
│                                            ├── docs/inventory/
│                                            └── .opencode/
```

---

## Apéndice B: Conclusión de la Serie DOC

Con DOC-06 se completa la serie de misiones DOC (Documentation Audit & Alignment):

| Misión | Logro principal | Documento generado |
|--------|----------------|-------------------|
| **DOC-01** | Inventario completo (~260 docs) + 5 contradicciones identificadas | `DOC-01_INVENTORY_REPORT.md` |
| **DOC-02** | ADR-012/ADR-014 resuelto (Opción B: modificación parcial) | `DOC-02_ADR_CONSISTENCY_REPORT.md` |
| **DOC-03** | 6 archivos alineados post-ADR-014 (banners, estados actualizados) | `DOC-03_ALIGNMENT_REPORT.md` |
| **DOC-04** | Clasificación SSOT L0-L5 + 7 conflictos de autoridad detectados | `DOC-04_SSOT_AUTHORITY_REPORT.md` |
| **DOC-05** | Jerarquía documental definitiva, 7 documentos analizados, 7 reglas de autoridad | `DOC-05_SSOT_GOVERNANCE_REPORT.md` |
| **DOC-05R** | Separación formal Product System vs Development System (analogía del compilador) | `DOC-05R_SYSTEM_BOUNDARY_CLARIFICATION.md` |
| **DOC-06** | Tres niveles (Ecosystem/Product/Development), clasificación completa, 7 docs mal ubicados, convenciones de nombres | `DOC-06_ECOSYSTEM_BOUNDARY_REPORT.md` |

---

*Reporte generado por BUILD como parte de la misión DOC-06.*  
*>100 documentos clasificados en 3 niveles. 7 documentos mal ubicados identificados. 3 ambigüedades terminológicas resueltas. 6 reglas de nomenclatura propuestas. 13 cambios recomendados.*  
*0 archivos modificados, 0 archivos movidos, 0 archivos renombrados.*
