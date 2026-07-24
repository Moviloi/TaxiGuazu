# DOC-05R SYSTEM BOUNDARY CLARIFICATION

> **Misión:** DOC-05R — System Boundary Clarification  
> **Ejecutor:** BUILD (AEL)  
> **Fecha:** 2026-07-22  
> **Objetivo:** Determinar formalmente los límites entre AITOS Product System y AITOS Development System, y resolver la ambigüedad conceptual entre AITOS_CONSTITUTION.md (L0 producto) y AEL SPEC.md (L0 desarrollo).  
> **Restricción:** 0 archivos modificados. Análisis puro.  
> **Analogía guía:** Un compilador no forma parte del software compilado. Un pipeline CI/CD no forma parte del producto desplegado.

---

## 1. Resumen ejecutivo

Existe una ambigüedad arquitectónica fundamental: el nombre "AITOS" se usa para referirse a **dos entidades distintas**:

| Entidad | También llamada | Ejemplo análogo |
|---------|----------------|-----------------|
| **AITOS Product System** | El sistema que corre en producción | El binario compilado |
| **AITOS Development System** | Las herramientas que construyen el sistema | El compilador + CI/CD |

**Veredicto:** SDL, AEL, PLAN, BUILD, OpenCode y todos los artefactos en `ael/` y `.opencode/` **no forman parte de AITOS Product System**. Son el **sistema de ingeniería** utilizado para diseñar, planificar, ejecutar y evolucionar el producto. La analogía del compilador es arquitectónicamente correcta.

**Implicación inmediata:** La clasificación L0-L5 propuesta en DOC-04 y DOC-05 debe separarse en **dos jerarquías paralelas**, cada una con su propio L0:

```
┌─────────────────────────────────────────────────────┐
│               AITOS ECOSYSTEM                        │
│                                                       │
│  ┌─────────────────────┐  ┌─────────────────────────┐│
│  │ AITOS PRODUCT       │  │ AITOS DEVELOPMENT       ││
│  │ (lo que corre)      │  │ (lo que construye)      ││
│  │                     │  │                         ││
│  │ L0: AITOS_CONSTITUTION│  │ L0: AEL SPEC            ││
│  │ L1: CDA, FBS        │  │ L1: ORGANIZATION,       ││
│  │ L2: ADRs             │  │     GOVERNANCE, CONTRACTS││
│  │ L3: ARCH_STATUS,     │  │ L2: Freezes, Contractos ││
│  │     SYSTEM_BIBLE     │  │ L3: MISSION_PHASE, etc. ││
│  │ L4: certification    │  │ L4: PROJECT_BOARD, etc. ││
│  │ L5: archived design  │  │ L5: archived process    ││
│  └─────────────────────┘  └─────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## 2. Análisis por documento

### 2.1 AITOS_CONSTITUTION.md — docs/architecture/AITOS_CONSTITUTION.md

| Pregunta | Respuesta |
|----------|-----------|
| **¿Pertenece al producto o al desarrollo?** | **PRODUCTO** |
| **Evidencia** | §1.2 Alcance: "aplicable a la totalidad del **sistema AITOS**, incluyendo comportamiento conversacional, razonamiento, toma de decisiones, gestión del conocimiento, reglas de negocio, procesos operativos, arquitectura del software, integración con servicios externos". §1.3: "describe el comportamiento esperado del **sistema** y no su implementación técnica". §1.3: "Ninguna tecnología, proveedor, modelo de inteligencia artificial o **arquitectura específica** forma parte de la presente Constitución." PC-04: "La Constitución describe el **producto oficial** y no su proceso de construcción." |
| **¿Gobierna el producto únicamente?** | **SÍ** — explícitamente excluye implementación técnica, tecnologías, y proceso de construcción |
| **¿Gobierna el proceso de desarrollo?** | **NO** — PC-04 lo prohíbe explícitamente ("No deberá contener referencias a versiones, iteraciones, fases, migraciones, experimentos, prototipos, estados de madurez ni cualquier otra evidencia del **proceso histórico de desarrollo**.") |
| **¿Contiene algo del desarrollo?** | ❌ **No debiera.** Si contiene referencias a SDL, AEL o el pipeline de desarrollo, sería una violación de su propio principio PC-04. |

### 2.2 AEL SPEC.md — ael/constitution/SPEC.md

| Pregunta | Respuesta |
|----------|-----------|
| **¿Pertenece al producto o al desarrollo?** | **DESARROLLO** |
| **Evidencia** | §1: "ARNÉS is a **constraint-based operating system for AI-assisted software engineering**. It governs the **evolution of AITOS** by enforcing what must always hold." §1: "Its sole purpose: **maximize engineering quality** while minimizing cost, time, context, and risk." ORGANIZATION.md: "La AEL SPEC define el **proceso de desarrollo**." |
| **¿Gobierna el producto únicamente?** | **NO** — gobierna el proceso de construcción, no el comportamiento del sistema. |
| **¿Gobierna el proceso de desarrollo?** | **SÍ** — define invariantes I1-I6, lifecycle L1-L4, capacidades, contratos de ejecución. |
| **Relación con AITOS_CONSTITUTION** | La AEL SPEC **no gobierna el producto**. Gobierna **cómo se construye** el producto. Es ortogonal. |

### 2.3 ORGANIZATION.md — ael/government/ORGANIZATION.md

| Pregunta | Respuesta |
|----------|-----------|
| **¿Pertenece al producto o al desarrollo?** | **DESARROLLO** |
| **Evidencia** | "Government level. Evolvable. Defines who does what within the Constitution's boundaries." §"Relación con la Constitución de AITOS": "La Constitución de AITOS define los principios, invariantes y gobernanza del **producto**. La AEL SPEC define el **proceso de desarrollo**. Este documento define quién puede hacer qué en el **ecosistema de desarrollo**." |
| **¿Ya resuelve la ambigüedad?** | **SÍ** — es el único documento que explícitamente separa producto de desarrollo. Pero está en ael/ (desarrollo) y no es referenciado por AITOS_CONSTITUTION.md. |

### 2.4 GOVERNANCE.md — docs/architecture/GOVERNANCE.md

| Pregunta | Respuesta |
|----------|-----------|
| **¿Pertenece al producto o al desarrollo?** | **DESARROLLO** |
| **Evidencia** | "Rules for keeping the architecture documentation accurate, consistent, and alive. This document is the contract between the **architecture team** and everyone who edits documentation." Describe procesos de documentación, no comportamiento del producto. |
| **Paradoja** | Está ubicado en `docs/architecture/` (directorio del producto) pero su contenido es 100% sobre el proceso de desarrollo documental. **Problema de ubicación**: debería estar en `ael/governance/` o en un directorio de gobernanza del desarrollo, no en `docs/architecture/`. |

### 2.5 MISSION_PHASE_ARCHITECTURE.md — docs/architecture/MISSION_PHASE_ARCHITECTURE.md

| Pregunta | Respuesta |
|----------|-----------|
| **¿Pertenece al producto o al desarrollo?** | **DESARROLLO** |
| **Evidencia** | "Contract cognitivo que reduce el **ecosistema de desarrollo** a dos únicas fases: PLAN (estratégico) y BUILD (operacional)." Define cómo PLAN y BUILD interactúan — esto es puramente sobre el proceso de desarrollo. |
| **Ubicación** | `docs/architecture/` — **misma paradoja que GOVERNANCE.md**. Contenido de desarrollo en directorio de producto. |

### 2.6 INTERFACE_FREEZE_V2.md — docs/architecture/INTERFACE_FREEZE_V2.md

| Pregunta | Respuesta |
|----------|-----------|
| **¿Pertenece al producto o al desarrollo?** | **DESARROLLO** |
| **Evidencia** | "Consolidar todo el **ecosistema de desarrollo AITOS** en una arquitectura de interfaz dual definitiva: PLAN y BUILD." IF-04: "BUILD implementa el contrato AEL internamente." Todo el documento describe la relación PLAN↔BUILD↔SDL↔AEL. |
| **Ubicación** | `docs/architecture/` — misma paradoja. |

### 2.7 Documentos .opencode/ (plan.md, build.md, commands/*.md)

| Pregunta | Respuesta |
|----------|-----------|
| **¿Pertenece al producto o al desarrollo?** | **DESARROLLO** |
| **Evidencia** | `plan.md`: "Eres PLAN, la interfaz estratégica de AITOS." `build.md`: "Eres BUILD, la interfaz operacional de AITOS." Ambos son **agentes de desarrollo** que ejecutan el proceso de ingeniería. No forman parte del producto desplegado. |
| **Relación** | Son los "actores" del Development System. Definen cómo se planifica y ejecuta el trabajo de construcción del producto. |

### 2.8 PROJECT_CONTEXT.md — docs/project/PROJECT_CONTEXT.md

| Pregunta | Respuesta |
|----------|-----------|
| **¿Pertenece al producto o al desarrollo?** | **DESARROLLO** (gestión de proyecto) |
| **Evidencia** | "Estado vigente condensado del proyecto." §4 "Misión activa." §10 "Deuda técnica." — todo sobre el estado del proyecto de desarrollo. |
| **Nota** | Contiene información DEL producto (state, architecture), pero el documento EN SÍ es una herramienta de gestión del proyecto de desarrollo. |

### 2.9 SYSTEM_BIBLE.md — docs/SYSTEM_BIBLE.md

| Pregunta | Respuesta |
|----------|-----------|
| **¿Pertenece al producto o al desarrollo?** | **PRODUCTO** (describe el producto, aunque es herramienta de onboarding) |
| **Evidencia** | "Propósito: Documento de onboarding y contexto para nuevos miembros del equipo." §1-4 describen qué es AITOS (el producto). §5 describe el modelo operacional (slots del producto). §6: jerarquía de autoridad del producto. |
| **Matiz** | Es un documento **sobre** el producto, usado **por** el desarrollo. Su contenido es producto, su propósito es desarrollo (onboarding). Es un documento **puente**. |

### 2.10 ARCHITECTURE_STATUS.md — docs/architecture/ARCHITECTURE_STATUS.md

| Pregunta | Respuesta |
|----------|-----------|
| **¿Pertenece al producto o al desarrollo?** | **PRODUCTO** |
| **Evidencia** | "Documento canónico del estado arquitectónico real del proyecto." Describe el pipeline real del sistema, componentes, ADRs, decisiones irreversibles, etc. Todo sobre la arquitectura del producto. |

---

## 3. Evaluación de la hipótesis del compilador

### Hipótesis original

> SDL/AEL/OpenCode = sistema de ingeniería (compilador)
> AITOS = producto compilado (sistema desplegado)
> Un compilador no forma parte del software compilado.

### Análisis

**A favor:** La analogía es sólida en los siguientes aspectos:

1. **Independencia conceptual**: SDL/AEL podrían reemplazarse por otro sistema de ingeniería sin cambiar el producto. AITOS_CONSTITUTION.md (PC-05: Independencia de implementación) explícitamente dice que las capacidades deben poder implementarse con diferentes tecnologías.

2. **Separación de ejecución**: PLAN nunca toca el código del producto (MP-01). BUILD lo modifica usando herramientas, pero las herramientas no son el producto.

3. **Ciclo de vida diferente**: El producto tiene su propio ciclo de vida (despliegue, operación, mantenimiento). El sistema de desarrollo tiene otro (planificación, ejecución, revisión).

4. **Dominios diferentes**: ORGANIZATION.md ya establece que la Constitución de AITOS gobierna el producto y AEL SPEC gobierna el proceso de desarrollo.

**En contra (matices importantes):**

1. **Acoplamiento fuerte**: SDL/AEL son **purpose-built** específicamente para AITOS. Un compilador de C puede compilar cualquier programa C. SDL/AEL solo sirven para construir AITOS. Esto crea la ilusión de que son parte del mismo sistema.

2. **Co-evolución**: Cuando AITOS cambia, SDL/AEL pueden necesitar cambiar (nuevos ADRs, nuevas capacidades). En un compilador tradicional, el compilador no cambia cuando cambia el programa.

3. **Documentación compartida**: DOCUMENTOS como ARCHITECTURE_STATUS.md contienen información sobre el producto pero son referenciados por el desarrollo. PROJECT_CONTEXT.md condensa estado de ambos.

### Veredicto

**La hipótesis del compilador es VÁLIDA pero debe ser calificada:**

> SDL/AEL son el **sistema de ingeniería especializado** de AITOS. No forman parte del producto AITOS, pero forman parte del **Ecosistema AITOS**. Están más cerca de un **framework de desarrollo in-house** que de un compilador genérico.

| Aspecto | Compilador genérico | SDL/AEL |
|---------|-------------------|---------|
| Propósito general | Compila cualquier programa | Solo construye AITOS |
| Independencia del producto | Total | Fuerte (puede reemplazarse pero no reusarse) |
| Co-evolución | Mínima | Alta |
| Relación | Externo | **Propietario pero externo al producto** |

---

## 4. Mapa de pertenencia definitivo

### 4.1 AITOS PRODUCT SYSTEM

Documentos que describen o prescriben el **comportamiento del sistema desplegado**:

| Nivel | Documentos | Función |
|-------|-----------|---------|
| **L0-P** | `docs/architecture/AITOS_CONSTITUTION.md` | Constitución del producto — 118 disposiciones sobre comportamiento del sistema |
| **L1-P** | `docs/specifications/CONVERSATION_DECISION_ALGORITHM.md` | Autoridad funcional normativa (CDA) |
| **L1-P** | `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` | Especificación de comportamiento funcional |
| **L2-P** | `docs/adr/ADR-001` a `ADR-014` | Decisiones arquitectónicas del producto |
| **L3-P** | `docs/architecture/ARCHITECTURE_STATUS.md` | Estado arquitectónico actual del producto |
| **L3-P** | `docs/architecture/glossary.md` | Terminología canónica del producto |
| **L3-P** | `docs/architecture/*.md` (system-overview, engines, bounded-contexts, etc.) | Descripciones arquitectónicas del producto |
| **L3-P** | `docs/architecture/domains/*.md` | Dominios del producto |
| **L3-P** | `docs/knowledge/*.md` | Reglas de negocio del producto |
| **L3-P** | `docs/architecture/diagrams/*.mmd` | Diagramas del producto |
| **L4-P** | `docs/certification/*.md` | Certificaciones de calidad del producto |
| **L5-P** | `docs/architecture/CE-3A.md`, `CE-3B.md`, `CE-4.md`, `CE-5.md` | Diseños históricos del producto |
| **—** | **Código fuente en `src/`** | La implementación misma del producto |
| **—** | **`schema/schema.sql`** | Esquema de base de datos del producto |

### 4.2 AITOS DEVELOPMENT SYSTEM

Documentos que describen o prescriben el **proceso de construcción, gobierno y evolución** del producto:

| Nivel | Documentos | Función |
|-------|-----------|---------|
| **L0-D** | `ael/constitution/SPEC.md` | Constitución del proceso de desarrollo — invariantes I1-I6, lifecycle L1-L4 |
| **L1-D** | `ael/constitution/CONTRACTS.md` | Reglas R1-R4 de enforcement entre capas de desarrollo |
| **L1-D** | `ael/government/ORGANIZATION.md` | Gobierno del equipo de desarrollo, roles, autoridad |
| **L1-D** | `ael/government/roles/*.md` | Contratos de cada capability de desarrollo |
| **L1-D** | `docs/architecture/GOVERNANCE.md` | **⚠️ Contenido de desarrollo, ubicado en docs/architecture/** — gobernanza documental |
| **L2-D** | `docs/architecture/INTERFACE_FREEZE_V2.md` | **⚠️ Contenido de desarrollo** — freeze de interfaces PLAN/BUILD |
| **L2-D** | `docs/architecture/MISSION_PHASE_ARCHITECTURE.md` | **⚠️ Contenido de desarrollo** — arquitectura PLAN→BUILD |
| **L2-D** | `docs/architecture/MISSION_CLOSURE_CONTRACT.md` | **⚠️ Contenido de desarrollo** — cierre de misión |
| **L2-D** | `docs/architecture/STRATEGIC_OPERATIONAL_CONTRACT.md` | **⚠️ Contenido de desarrollo** — contrato PLAN↔BUILD |
| **L2-D** | `docs/governance/BASELINE_1_0.md` | Baseline del proyecto de desarrollo |
| **L2-D** | `docs/governance/AITOS_ENGINEERING_LIFECYCLE.md` | Lifecycle del proceso de desarrollo |
| **L3-D** | `docs/architecture/SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md` | **⚠️** Especificación del SDL (desarrollo) |
| **L3-D** | `docs/architecture/SDL_2_0_ARCHITECTURAL_CONSOLIDATION.md` | **⚠️** Arquitectura congelada del SDL (desarrollo) |
| **L4-D** | `docs/project/PROJECT_BOARD.md` | Tablero de tareas del proyecto de desarrollo |
| **L4-D** | `docs/project/CHANGELOG.md` | Historial de cambios del proyecto de desarrollo |
| **L4-D** | `docs/project/PROJECT_CONTEXT.md` | Estado condensado del proyecto de desarrollo |
| **L4-D** | `docs/project/ROADMAP.md` | Hitos del proyecto de desarrollo |
| **L4-D** | `docs/audit/*.md` | Auditorías del proyecto (DOC-01 a DOC-05, CTM, compliance) |
| **L4-D** | `docs/incidents/*.md` | Incidentes del proyecto |
| **L4-D** | `docs/operations/*.md` | Guías operacionales del equipo |
| **L4-D** | `docs/security/secrets.md` | Políticas de seguridad del equipo |
| **L5-D** | `ael/archive/**` | Historial del proceso de desarrollo |
| **—** | **`opencode.json`** | Configuración del entorno de desarrollo |
| **—** | **`.opencode/agents/plan.md`** | Agente PLAN (interfaz estratégica) |
| **—** | **`.opencode/agents/build.md`** | Agente BUILD (interfaz operacional) |
| **—** | **`.opencode/commands/*.md`** | Comandos de ejecución del desarrollo |
| **—** | **`.opencode/memory/MEMORY.md`** | Memoria del equipo de desarrollo |

### 4.3 Documentos puente (contienen información de ambos)

| Documento | Contenido de producto | Contenido de desarrollo | Clasificación |
|-----------|----------------------|------------------------|---------------|
| `SYSTEM_BIBLE.md` | ✅ Describe el producto | ✅ Usado para onboarding del equipo | **Producto** (contenido) |
| `ARCHITECTURE_STATUS.md` | ✅ Estado del producto | ✅ Útil para el desarrollo | **Producto** (contenido) |
| `PROJECT_CONTEXT.md` | ✅ Estado del producto | ✅ Gestión del proyecto | **Desarrollo** (propósito) |
| `glossary.md` | ✅ Terminología del producto | ❌ — | **Producto** |

---

## 5. Diagnóstico: el problema de raíz

### 5.1 El nombre "AITOS" está sobrecargado

La palabra "AITOS" se usa para referirse a tres conceptos diferentes:

```
"AITOS" en el código fuente     → Product System
"AITOS" en AITOS_CONSTITUTION   → Product System (explícitamente)
"AITOS" en "AITOS Ecosystem"    → Product + Development (todo)
"AITOS" en AEL SPEC             → Product System (el ente que el desarrollo evoluciona)
"AITOS" en ORGANIZATION.md      → Ambos (según contexto)
"AITOS" en "Eres BUILD, la interfaz operacional de AITOS" → Ecosystem (porque BUILD pertenece al desarrollo)
```

**Esto genera confusión.** Cuando BUILD dice "interfaz operacional de AITOS", ¿es "de AITOS Product" o "de AITOS Ecosystem"? La respuesta correcta es **Ecosystem**, pero no está definida explícitamente.

### 5.2 Documentos de desarrollo en directorios de producto

Se identificaron **al menos 6 documentos** con contenido 100% de desarrollo ubicados en `docs/architecture/` (directorio del producto):

1. `GOVERNANCE.md` — gobernanza documental del equipo
2. `MISSION_PHASE_ARCHITECTURE.md` — arquitectura PLAN→BUILD
3. `MISSION_CLOSURE_CONTRACT.md` — cierre de misión
4. `INTERFACE_FREEZE_V2.md` — freeze de interfaces de desarrollo
5. `STRATEGIC_OPERATIONAL_CONTRACT.md` — contrato PLAN↔BUILD
6. `SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md` — SDL spec

**Problema:** La ubicación física implica pertenencia. Un lector que navegue `docs/architecture/` encontrará documentos de desarrollo mezclados con documentos de producto, reforzando la confusión sobre qué es producto y qué es desarrollo.

### 5.3 AEL SPEC no referencia a AITOS_CONSTITUTION y viceversa

Ya identificado en DOC-04 y DOC-05. Al no referenciarse mutuamente, perpetúan la percepción de que compiten por el mismo espacio.

---

## 6. La tercera capa: AITOS Ecosystem

### 6.1 Definición

**AITOS Ecosystem** es el contenedor conceptual que incluye:

1. **AITOS Product System** — el sistema desplegado que los clientes usan
2. **AITOS Development System** — las herramientas, procesos y agentes que construyen el producto

Ambos son parte de AITOS Ecosystem, pero **solo el Product System es "AITOS" en sentido estricto**.

### 6.2 Diagrama de límites

```
┌──────────────────────────────────────────────────────────────────┐
│                    AITOS ECOSYSTEM                                 │
│                                                                    │
│  ¿Qué es?  El conjunto completo de producto + herramientas         │
│  ¿Quién lo habita?  Usuarios, desarrolladores, agentes, ops        │
│  ¿Documento que lo define?  NO EXISTE EXPLÍCITAMENTE               │
│                                                                    │
│  ┌─────────────────────────────┐  ┌──────────────────────────────┐│
│  │ AITOS PRODUCT SYSTEM        │  │ AITOS DEVELOPMENT SYSTEM     ││
│  │                             │  │                              ││
│  │ Código en src/              │  │ Agentes en .opencode/        ││
│  │ Esquema en schema.sql       │  │ AEL en ael/                  ││
│  │ Comportamiento conversacional│  │ PLAN/BUILD interfaces       ││
│  │ Pricing, dispatch, etc.     │  │ Governance docs              ││
│  │                             │  │ Project tracking             ││
│  │ "El sistema"                │  │ "El equipo de ingeniería"    ││
│  └─────────────────────────────┘  └──────────────────────────────┘│
│                                                                    │
│  DOCUMENTOS PUENTE                                                 │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ SYSTEM_BIBLE.md (describe el producto, sirve al desarrollo)   │ │
│  │ PROJECT_CONTEXT.md (condensa producto + proyecto)             │ │
│  │ ARCHITECTURE_STATUS.md (describe producto, referencia del     │ │
│  │   desarrollo para entender el sistema)                        │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 ¿Existe ya documentado?

**Parcialmente.** El concepto de "ecosistema de desarrollo" aparece en:
- INTERFACE_FREEZE_V2.md: "ecosistema de desarrollo AITOS"
- ORGANIZATION.md: "ecosistema de desarrollo"
- MISSION_PHASE_ARCHITECTURE.md: "ecosistema de desarrollo"

Pero **no existe una declaración formal** del ecosistema como contenedor de producto + desarrollo.

---

## 7. Implicaciones para la jerarquía L0-L5

La jerarquía L0-L5 propuesta en DOC-04 y DOC-05 debe separarse en **dos jerarquías paralelas**:

### Jerarquía paralela propuesta

```
PRODUCT SYSTEM (P)                    DEVELOPMENT SYSTEM (D)
══════════════════                    ══════════════════════

L0-P  AITOS_CONSTITUTION.md           L0-D  AEL SPEC.md
      (comportamiento del producto)          (proceso de desarrollo)

L1-P  CDA, FBS                        L1-D  ORGANIZATION.md,
      (autoridad funcional)                  GOVERNANCE.md,
                                             CONTRACTS.md, roles/

L2-P  ADR-001..014                    L2-D  INTERFACE_FREEZE_V2,
      (decisiones arquitectónicas)           MISSION_PHASE_ARCHITECTURE,
                                             MISSION_CLOSURE_CONTRACT,
                                             STRATEGIC_OPERATIONAL_CONTRACT

L3-P  ARCHITECTURE_STATUS.md,         L3-D  SDL_2_0_* (specs del SDL)
      SYSTEM_BIBLE.md,
      descripciones arquitectónicas,
      glossary

L4-P  certifications                  L4-D  PROJECT_BOARD, CHANGELOG,
                                             PROJECT_CONTEXT, ROADMAP,
                                             audit/*, incidents/*

L5-P  CE-3A/3B/4/5                    L5-D  ael/archive/**
```

**Regla fundamental:** Ningún documento P puede contradecir a un documento D ni viceversa, pero **no compiten** — gobiernan dominios ontológicamente diferentes. La única relación es que D describe CÓMO se construye P.

---

## 8. Recomendaciones

### 8.1 Inmediatas (sin modificar archivos)

| # | Acción | Ref. |
|---|--------|------|
| 1 | **Aceptar** la separación formal: AITOS Product System ≠ AITOS Development System | Este documento |
| 2 | **Adoptar** la nomenclatura: Usar "AITOS Product" para el sistema desplegado y "AITOS Dev" para el sistema de ingeniería | — |
| 3 | **Clasificar** todo documento futuro como P (producto) o D (desarrollo) en su metadata | — |

### 8.2 Para futura ejecución (cuando se autoricen cambios)

| # | Acción | Prioridad |
|---|--------|-----------|
| 4 | Agregar en AITOS_CONSTITUTION.md: "El proceso de construcción y evolución de este producto se rige por el AITOS Development System, cuya constitución es AEL SPEC (ael/constitution/SPEC.md)." | P1 |
| 5 | Agregar en AEL SPEC.md: "Este documento gobierna el proceso de desarrollo del AITOS Product System, cuya constitución es AITOS_CONSTITUTION.md (docs/architecture/AITOS_CONSTITUTION.md)." | P1 |
| 6 | Agregar metadata de plano (Product/Development/Ecosystem) en cada documento para eliminar ambigüedad | P2 |
| 7 | Evaluar si documentos D ubicados en docs/architecture/ deben moverse a ael/ (ej: GOVERNANCE.md, MISSION_PHASE_ARCHITECTURE.md, INTERFACE_FREEZE_V2.md) | P2 |

### 8.3 Para la taxonomía documental

| # | Regla |
|---|-------|
| 8 | **Regla B-01**: Todo documento del Ecosistema AITOS debe declarar si pertenece al Plano Producto (P), Plano Desarrollo (D), o es un documento puente (B). |
| 9 | **Regla B-02**: La Constitución del Producto (AITOS_CONSTITUTION.md) no puede contener reglas de proceso de desarrollo. La Constitución del Desarrollo (AEL SPEC.md) no puede contener reglas de comportamiento del producto. |
| 10 | **Regla B-03**: Un documento puente (B) debe declarar qué partes de su contenido son P y cuáles D, o referenciar al documento fuente de cada plano. |

---

## 9. Riesgos si no se corrige la ambigüedad

### 🔴 R-B-01: Indefinición de autoridad (Alto)

Si no queda claro que AITOS_CONSTITUTION y AEL SPEC gobiernan planos diferentes, cualquier conflicto entre una regla de producto y una regla de proceso quedará sin marco de resolución.

**Ejemplo concreto:** Si AEL SPEC exigiera refactorizar un módulo (regla de proceso) y AITOS_CONSTITUTION exigiera preservar su comportamiento (regla de producto), ¿cuál prevalece? Con la separación clara, es obvio: preservar el comportamiento del producto. Sin ella, hay ambigüedad.

### 🟡 R-B-02: Duplicación de nomenclatura (Medio)

Al no distinguir entre AITOS Product y AITOS Ecosystem, documentos como "BUILD — interfaz operacional de AITOS" pueden interpretarse como "BUILD es parte del producto" cuando en realidad BUILD es parte del ecosistema de desarrollo.

### 🟡 R-B-03: Dificultad de onboarding (Medio)

Nuevos miembros del equipo leerán AITOS_CONSTITUTION.md esperando entender "el sistema", pero encontrarán una constitución que no menciona el proceso de desarrollo. Luego leerán AEL SPEC.md y encontrarán otra "constitución". Sin la separación de planos, asumirán que hay duplicidad o conflicto.

---

## Apéndice A: Resumen de respuestas a las preguntas del objetivo

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿AITOS_CONSTITUTION.md gobierna únicamente el producto? | **SÍ.** Explícitamente excluye implementación técnica y proceso de construcción (PC-04). |
| 2 | ¿AEL SPEC.md gobierna únicamente el proceso/sistema de desarrollo? | **SÍ.** Explícitamente define el proceso de ingeniería, no el comportamiento del producto. |
| 3 | ¿SDL y AEL tienen dependencia conceptual sobre AITOS o son herramientas externas de ingeniería? | **Son herramientas de ingeniería especializadas.** Dependen conceptualmente de AITOS (existen para construirlo), pero no forman parte del producto. Análogo a un framework in-house. |
| 4 | ¿Qué documentos pertenecen al producto? | Ver §4.1: AITOS_CONSTITUTION, CDA, FBS, ADRs, ARCHITECTURE_STATUS, descripciones arquitectónicas, glossary, knowledge rules, certifications, CE legacy docs. |
| 5 | ¿Qué documentos pertenecen al ecosistema de desarrollo? | Ver §4.2: AEL SPEC, CONTRACTS, ORGANIZATION, roles, GOVERNANCE, freezes, contracts, project docs, audits, .opencode/ agents, commands, memory. |
| 6 | ¿Existe una tercera capa "AITOS Ecosystem" que contenga ambos? | **SÍ, implícitamente.** No hay un documento que la defina formalmente, pero el concepto existe en INTERFACE_FREEZE_V2, ORGANIZATION y MISSION_PHASE_ARCHITECTURE. Es el contenedor que incluye Product System + Development System. |

---

*Reporte generado por BUILD como parte de la misión DOC-05R.*  
*10 documentos analizados. 2 planos identificados (Product + Development). 1 capa contenedora (Ecosystem). 7 recomendaciones emitidas.*  
*0 archivos modificados.*
