# ARNÉS Framework — Operational Workspace v1.0

> **Tipo:** Arquitectura operacional
> **Versión:** 1.0
> **Fecha:** 2026-07-22
> **Estado:** ACTIVE
> **Deriva de:** `COGNITIVE_ARCHITECTURE.md`, `PRODUCT_CONTEXT_CONTRACT.md`, `PROJECT_ADAPTER_ARCHITECTURE.md`, `RUNTIME_PROFILE_CONTRACT.md`, `DEPLOYMENT_BLUEPRINT_v1.0.0.md`
>
> Este documento define el entorno operativo donde los componentes de ARNÉS
> colaboran durante una misión dentro de OpenCode. No modifica el framework.
> Describe cómo los componentes ya diseñados operan juntos.

---

## Índice

1. [Arquitectura del Workspace](#1-arquitectura-del-workspace)
2. [Integración con OpenCode](#2-integración-con-opencode)
3. [Flujo operacional completo](#3-flujo-operacional-completo)
4. [El Workspace como contenedor efímero](#4-el-workspace-como-contenedor-efímero)
5. [Cambio de proyecto](#5-cambio-de-proyecto)
6. [Persistencia vs efimeridad](#6-persistencia-vs-efimeridad)
7. [Concurrencia y múltiples proyectos](#7-concurrencia-y-múltiples-proyectos)

---

## 1. Arquitectura del Workspace

### 1.1 Qué es el Operational Workspace

El **Operational Workspace** es el contenedor efímero que existe durante exactamente una misión ARNÉS. Agrupa todos los componentes operacionales necesarios para ejecutar una misión y los destruye al finalizar.

No es un directorio. No es un archivo. No es una base de datos. Es un **espacio lógico de ejecución** que la implementación (AEL) materializa usando los mecanismos de su plataforma (OpenCode).

### 1.2 Qué contiene

```
┌─────────────────────────────────────────────────────────┐
│                  OPERATIONAL WORKSPACE                   │
│                    (una misión)                          │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │   MISSION   │  │  PRODUCT    │  │   RUNTIME   │      │
│  │             │  │  CONTEXT    │  │   PROFILE   │      │
│  │ • Objetivo  │  │             │  │             │      │
│  │ • Estado    │  │ • 12 campos │  │ • Timeout   │      │
│  │ • Trigger   │  │ • ADRs      │  │ • Modelo    │      │
│  │             │  │ • Reglas    │  │ • Budget    │      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │
│         │                │                │              │
│         ▼                ▼                ▼              │
│  ┌─────────────────────────────────────────────┐        │
│  │           MISSION ANALYZER (PLAN)            │        │
│  │  ORIENT → ANALYZE → EVALUATE → DECIDE       │        │
│  │  → PLAN → VERIFY → DELIVER                  │        │
│  └─────────────────────┬───────────────────────┘        │
│                        │                                │
│                        ▼                                │
│  ┌─────────────────────────────────────────────┐        │
│  │              DIRECTOR (BUILD)                │        │
│  │  L1 → L2 → L3 → L4                          │        │
│  └─────────────────────┬───────────────────────┘        │
│                        │                                │
│         ┌──────────────┼──────────────┐                 │
│         ▼              ▼              ▼                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ EXPLORER │  │ARCHITECT │  │IMPLEMENT.│  ...          │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                         │
│  ┌─────────────────────────────────────────────┐        │
│  │            EXECUTION STATE                   │        │
│  │  • ExecutionPlan activo                      │        │
│  │  • ExecutionReport (en construcción)         │        │
│  │  • Hallazgos parciales                       │        │
│  │  • Estado de agentes                         │        │
│  └─────────────────────────────────────────────┘        │
│                                                         │
│  ┌─────────────────────────────────────────────┐        │
│  │            TEMPORARY MEMORY                  │        │
│  │  • Decisiones tácticas                       │        │
│  │  • Caché de lecturas                         │        │
│  │  • Resultados intermedios                    │        │
│  └─────────────────────────────────────────────┘        │
│                                                         │
│  ┌─────────────────────────────────────────────┐        │
│  │            PROJECT ADAPTER                   │        │
│  │  (activo solo durante ORIENT→DELIVER)        │        │
│  └─────────────────────────────────────────────┘        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 1.3 Qué NO contiene

El Workspace **no** contiene:

- ❌ El código fuente del producto (está en el filesystem del proyecto).
- ❌ Los documentos del framework (están en `docs/arnes/` y `ael/`).
- ❌ La memoria persistente del producto (está en `.opencode/memory/MEMORY.md`).
- ❌ La configuración permanente de la implementación (está en `ael/` y `.opencode/`).
- ❌ Secrets, credenciales, tokens.
- ❌ El historial de misiones anteriores.

---

## 2. Integración con OpenCode

### 2.1 Modelo de convivencia

OpenCode es el **host**. ARNÉS es un **modo de operación** dentro de OpenCode.

```
┌──────────────────────────────────────────────────┐
│                  OPENCODE                         │
│                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ MODO PLAN  │  │ MODO BUILD │  │MODO ARNÉS  │ │
│  │ (nativo)   │  │ (nativo)   │  │(governado) │ │
│  │            │  │            │  │            │ │
│  │ Planifica  │  │ Ejecuta    │  │ Planifica  │ │
│  │ sin        │  │ sin        │  │ y ejecuta  │ │
│  │ contratos  │  │ contratos  │  │ con        │ │
│  │ formales   │  │ formales   │  │ contratos  │ │
│  └────────────┘  └────────────┘  └─────┬──────┘ │
│                                        │        │
│                     ┌──────────────────┘        │
│                     ▼                           │
│              ┌─────────────┐                    │
│              │ WORKSPACE   │                    │
│              │ (efímero)   │                    │
│              └─────────────┘                    │
└──────────────────────────────────────────────────┘
```

### 2.2 Qué continúa siendo nativo de OpenCode

OpenCode mantiene sus modos nativos sin cambios:

| Modo | Comportamiento | Gobernanza |
|---|---|---|
| **PLAN (nativo)** | El usuario invoca PLAN sin ARNÉS. Planificación libre. | Sin contratos formales. Sin Product Context. Sin Runtime Profile. |
| **BUILD (nativo)** | El usuario invoca BUILD sin ARNÉS. Ejecución libre. | Sin enforcement de contratos. Sin trazabilidad obligatoria. |
| **PLAN + BUILD (nativo)** | El usuario alterna entre PLAN y BUILD manualmente. | Sin contrato PLAN→BUILD explícito. ExecutionPlan/Report opcionales. |

Estos modos **no desaparecen**. Siguen disponibles para trabajo rápido, exploratorio o no gobernado.

### 2.3 Qué agrega exactamente el modo ARNÉS

El modo ARNÉS agrega sobre los modos nativos:

| Capacidad | Modo nativo | Modo ARNÉS |
|---|---|---|
| **Product Context** | Implícito. El agente lee docs sueltos. | Formal. Cargado por el Project Adapter con 12 campos obligatorios. |
| **Runtime Profile** | Inexistente. | Activo. Timeout, modelo, presupuesto gobernados. |
| **Contrato PLAN→BUILD** | Opcional. | Obligatorio. ExecutionPlan estructurado → ExecutionReport. |
| **Trazabilidad** | Ad-hoc. | Completa. Decisión → Plan → Ejecución → Reporte → Verificación. |
| **Enforcement** | No se ejecuta. | Se ejecuta automáticamente en L4. Bloquea si falla. |
| **Estados de misión** | No definidos. | IN PROGRESS / CLOSED. Gobernados por SDL. |
| **Learning** | No disparado. | Disparado post-CLOSED. Solo procesa conocimiento consolidado. |
| **F-ADR** | No aplica. | Requerido para cambios arquitectónicos. |
| **Ciclo de vida** | Una interacción. | L1→L2→L3→L4 con verificación de invariantes. |

### 2.4 Cómo se activa el modo ARNÉS

El modo ARNÉS se activa cuando el usuario **selecciona un proyecto** y solicita una misión gobernada. La secuencia es:

1. Usuario indica: "Trabajar en AITOS usando ARNÉS."
2. OpenCode reconoce el modo ARNÉS.
3. Se crea un Workspace efímero.
4. El Project Adapter se activa → Product Context cargado.
5. El Runtime Profile se carga.
6. El Mission Analyzer (PLAN) comienza ORIENT.
7. A partir de aquí, la misión opera bajo gobernanza ARNÉS.

Si el usuario no especifica "usando ARNÉS", OpenCode opera en modo nativo.

---

## 3. Flujo operacional completo

### 3.1 Desde la selección del proyecto hasta el cierre de la misión

```
USUARIO
  │
  │ "Trabajar en [proyecto] usando ARNÉS."
  │
  ▼
┌─────────────────────────────────────────┐
│ 1. CREACIÓN DEL WORKSPACE               │
│                                         │
│ Se crea un contenedor efímero para      │
│ esta misión. Vacío al inicio.           │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 2. ACTIVACIÓN DEL PROJECT ADAPTER       │
│                                         │
│ DISCOVER: encuentra docs del proyecto.  │
│ LOAD: lee constitución, ADRs, reglas.   │
│ VALIDATE: verifica 12 campos obligat.   │
│ BUILD: construye el Product Context.    │
│ DELIVER: entrega al Mission Analyzer.   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 3. CARGA DEL RUNTIME PROFILE            │
│                                         │
│ LOAD: carga perfil (default/producto).  │
│ VALIDATE: verifica conformidad.         │
│ Perfil disponible para BUILD.           │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 4. MISSION ANALYZER (PLAN)              │
│                                         │
│ ORIENT: ¿qué misión? ¿qué producto?     │
│ ANALYZE: impacto según Product Context. │
│ EVALUATE: riesgos según Runtime Profile.│
│ DECIDE: CONTINUE / IMPROVE / STOP.      │
│ PLAN: produce ExecutionPlan.            │
│ VERIFY: ¿respeta invariantes?           │
│ DELIVER: ExecutionPlan + READY/NOT      │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 5. USUARIO APRUEBA                      │
│                                         │
│ "ok" / "hacelo"                         │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 6. DIRECTOR (BUILD)                     │
│                                         │
│ L1: entiende el ExecutionPlan.          │
│ L2: planifica ejecución táctica.        │
│ L3: ejecuta — invoca agentes según      │
│     Runtime Profile (modelo, timeout,   │
│     paralelismo, presupuesto).          │
│ L4: cierra — verifica invariantes I1-I6,│
│     ejecuta enforcement, produce        │
│     ExecutionReport.                    │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 7. AGENTES (invocados por BUILD)        │
│                                         │
│ Explorer: lee código (no modifica).     │
│ Architect: veta si viola ADRs.          │
│ Implementer: aplica cambios.            │
│ Auditor: verifica tests, build, contrat.│
│ Keeper: preserva conocimiento.          │
│ Governor: gestiona excepciones.         │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 8. ENTREGA DE EVIDENCIA                 │
│                                         │
│ ExecutionReport generado.               │
│ Contiene: resultados, hallazgos,        │
│ certificación (tests/build/contratos),  │
│ artefactos modificados.                 │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 9. MISSION ANALYZER EVALÚA              │
│                                         │
│ ¿Criterios de éxito cumplidos?          │
│   SÍ → declara CLOSED.                  │
│   NO → nuevo ExecutionPlan → vuelve a 6.│
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 10. CIERRE DE MISIÓN                    │
│                                         │
│ SDL declara CLOSED.                     │
│ Learning puede ejecutarse (post-cierre).│
│ Conocimiento preservado (Keeper).       │
│ Runtime Profile descartado.             │
│ Product Context descartado.             │
│ Project Adapter: DISCARD.               │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 11. DESTRUCCIÓN DEL WORKSPACE           │
│                                         │
│ El Workspace completo se destruye.      │
│ No queda estado residual.               │
│ La implementación (AEL) vuelve a idle.  │
│ OpenCode queda listo para otra misión.  │
└─────────────────────────────────────────┘
```

### 3.2 Ciclos múltiples de BUILD

Una misión puede requerir múltiples ciclos BUILD antes de cerrarse. El Workspace persiste entre ciclos:

```
Workspace creado
    │
    ├── PLAN → BUILD #1 → ExecutionReport #1
    │       │
    │       ▼
    │   SDL evalúa → nuevo ExecutionPlan
    │       │
    ├── PLAN → BUILD #2 → ExecutionReport #2
    │       │
    │       ▼
    │   SDL evalúa → misión completa
    │       │
    └───────▼
    SDL declara CLOSED
        │
        ▼
    Workspace destruido
```

**Regla:** El Workspace se mantiene durante todos los ciclos BUILD de una misma misión. Solo se destruye cuando el SDL declara CLOSED.

---

## 4. El Workspace como contenedor efímero

### 4.1 Componentes del Workspace

| Componente | Cuándo se carga | Cuándo se descarta | Contenido |
|---|---|---|---|
| **Mission** | Al crear el Workspace | Al declarar CLOSED | Objetivo, estado (IN PROGRESS/CLOSED), trigger. |
| **Product Context** | Durante ORIENT (vía Project Adapter) | Al declarar CLOSED | 12 campos obligatorios: identidad, constitución, ADRs, reglas, vocabulario, etc. |
| **Runtime Profile** | Durante PLAN | Al declarar CLOSED | Timeout, modelo, presupuesto, paralelismo, logging, feature flags. |
| **Project Adapter** | Durante ORIENT | Al declarar CLOSED (DISCARD) | Estado interno del adapter (mapa de fuentes, datos crudos). |
| **Execution State** | Durante PLAN (primer ExecutionPlan) | Al declarar CLOSED | ExecutionPlan activo, ExecutionReport en construcción, hallazgos parciales. |
| **Temporary Memory** | Durante BUILD | Al declarar CLOSED | Decisiones tácticas, caché de lecturas, resultados intermedios. |
| **Agent State** | Cuando BUILD invoca agentes | Al finalizar cada invocación | Estado interno de cada agente durante su ejecución. |

### 4.2 Qué información permanece viva durante la misión

Durante la misión, el Workspace mantiene viva:

- La identidad del producto (qué se está construyendo).
- Las restricciones arquitectónicas del producto (ADRs).
- La configuración de ejecución (timeout, modelo, presupuesto).
- El ExecutionPlan activo (qué hay que hacer).
- El ExecutionReport en construcción (qué se está logrando).
- Los hallazgos parciales (qué se descubrió).
- El estado de los agentes (quién está haciendo qué).

Toda esta información es accesible para el Mission Analyzer y el Director durante la misión. No es accesible fuera del Workspace.

### 4.3 Qué información se destruye al finalizar

Al declarar CLOSED, se destruye:

- El Workspace completo.
- El Product Context cargado.
- El Runtime Profile activo.
- El ExecutionPlan (ya ejecutado).
- El estado de los agentes.
- La memoria temporal.
- Los resultados intermedios.
- El estado del Project Adapter.

**No se destruye** (se preserva fuera del Workspace):

- El ExecutionReport (se entrega al SDL como evidencia).
- El conocimiento preservado por el Keeper (va a MEMORY.md).
- Los artefactos modificados (código, documentos — están en el producto).
- Las decisiones registradas (DECISION_RECORD, ADRs).
- Los patrones detectados por Learning (post-cierre).

### 4.4 El Workspace no constituye memoria permanente

El Workspace es estrictamente efímero. No sobrevive a la misión. Esto es deliberado:

- **Garantiza independencia:** el framework no "recuerda" productos entre misiones.
- **Evita contaminación:** una misión no hereda estado residual de la anterior.
- **Fuerza explicititud:** todo lo que debe preservarse debe ser explícitamente registrado por el Keeper.
- **Simplifica la implementación:** no hay que manejar persistencia del Workspace.

---

## 5. Cambio de proyecto

### 5.1 Principio

Cambiar de proyecto **nunca** modifica el Framework. Solo cambia qué Product Context, Project Adapter y Runtime Profile se cargan en el Workspace.

### 5.2 Secuencia de cambio

```
Workspace activo (Proyecto A: AITOS)
    │
    │ Usuario: "Cambiar a Proyecto B."
    │
    ▼
¿Hay misión activa en Proyecto A?
    │
    ├── SÍ → SDL debe declarar CLOSED primero.
    │         (o el usuario fuerza el cierre)
    │
    └── NO → Workspace destruido (si existía).
             │
             ▼
        Nuevo Workspace creado para Proyecto B.
             │
             ▼
        Project Adapter para Proyecto B activado.
        (diferente adapter si Proyecto B tiene
         estructura documental distinta)
             │
             ▼
        Product Context de Proyecto B cargado.
             │
             ▼
        Runtime Profile para Proyecto B cargado.
        (puede ser el default o uno específico)
             │
             ▼
        Nueva misión puede comenzar.
```

### 5.3 Qué cambia al cambiar de proyecto

| Elemento | ¿Cambia? | Detalle |
|---|---|---|
| **Framework (ARNÉS)** | ❌ No | La Constitución, arquitectura, objetos y gobernanza son idénticos. |
| **Implementación (AEL)** | ❌ No | Los agentes, comandos y herramientas son los mismos. |
| **Product Context** | ✅ Sí | Cada proyecto tiene su propia identidad, ADRs, reglas, vocabulario. |
| **Project Adapter** | ✅ Puede | Si el Proyecto B tiene estructura documental distinta, usa otro adapter. |
| **Runtime Profile** | ✅ Puede | El Proyecto B puede tener un perfil diferente (ej. más presupuesto). |
| **Producto** | ✅ Sí | Código, schema, tests, documentación — todo cambia. |

### 5.4 Concurrencia

- **Un solo Workspace activo por vez.** No hay dos misiones ARNÉS ejecutándose simultáneamente sobre proyectos distintos.
- **Un solo proyecto activo por Workspace.** Una misión opera sobre un producto a la vez.
- **Cambiar de proyecto requiere cerrar la misión actual.** No se puede tener una misión abierta en AITOS y empezar otra en otro proyecto.

---

## 6. Persistencia vs efimeridad

### 6.1 Tres planos de persistencia

```
┌─────────────────────────────────────────────────────────┐
│                   PERSISTENTE                            │
│  (sobrevive a todas las misiones)                       │
│                                                         │
│  FRAMEWORK (docs/arnes/)                                │
│    ARNES_CONSTITUTION.md, COGNITIVE_ARCHITECTURE.md,    │
│    COGNITIVE_OBJECT_MODEL.md, GOVERNANCE.md, ...        │
│                                                         │
│  IMPLEMENTACIÓN (ael/, .opencode/)                      │
│    SPEC.md, ORGANIZATION.md, CONTRACTS.md, roles/,      │
│    enforce.sh, agentes, comandos                        │
│                                                         │
│  PRODUCTO (AITOS)                                       │
│    src/, docs/architecture/, docs/adr/, schema.sql,     │
│    docs/knowledge/, package.json, tests/                │
│                                                         │
│  MEMORIA DEL PRODUCTO                                   │
│    .opencode/memory/MEMORY.md                           │
│    docs/project/CHANGELOG.md                            │
│    docs/certification/TECHNICAL_DEBT_BASELINE.md        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   EFÍMERO                                │
│  (destruido al finalizar cada misión)                   │
│                                                         │
│  WORKSPACE                                              │
│    • Mission                                             │
│    • Product Context (instancia cargada)                 │
│    • Runtime Profile (instancia cargada)                 │
│    • Project Adapter (estado interno)                    │
│    • Execution State (Plan activo, Reporte en constr.)   │
│    • Temporary Memory (caché, resultados intermedios)    │
│    • Agent State (estado de cada agente)                 │
│    • Evidence temporal (hallazgos no consolidados)       │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Regla de tránsito

> **Todo lo que debe sobrevivir a la misión debe ser explícitamente transferido del espacio efímero al espacio persistente antes de destruir el Workspace.**

Esta transferencia es responsabilidad del Director durante L4 (Closure) y del Keeper (Memory). Si algo no se transfiere, se pierde.

### 6.3 Qué se transfiere y cómo

| Desde (Workspace) | Hacia (Persistente) | Responsable | Mecanismo |
|---|---|---|---|
| ExecutionReport | SDL (como evidencia para el próximo ciclo) | Director | Output estructurado de BUILD |
| Decisiones significativas | DECISION_RECORD, ADRs | Keeper | Escritura en docs/ |
| Deuda descubierta | TECHNICAL_DEBT_BASELINE | Keeper | Actualización del baseline |
| Código modificado | src/ | Implementer | Git commit |
| Documentación actualizada | docs/ | Implementer | Escritura en archivos |
| Patrones detectados | Review (post-CLOSED) | Analyst (Learning) | Pattern report |
| Lecciones aprendidas | MEMORY.md | Keeper | Actualización de memoria |

---

## 7. Concurrencia y múltiples proyectos

### 7.1 ARNÉS con múltiples productos

ARNÉS está diseñado para construir cualquier producto. El Workspace refleja esto:

```
DÍA 1                      DÍA 2                      DÍA 3
─────                      ─────                      ─────
Workspace #1               Workspace #2               Workspace #3
Proyecto: AITOS            Proyecto: AITOS            Proyecto: NUEVO
Adapter: genérico          Adapter: genérico          Adapter: específico
Context: transporte        Context: transporte        Context: finanzas
Perfil: default            Perfil: default            Perfil: finanzas
                                                      (más presupuesto,
                                                       menos timeout)
```

Lo único que cambia entre días es qué se carga en el Workspace. El Framework, la Implementación y la plataforma (OpenCode) permanecen idénticos.

### 7.2 Convivencia con proyectos futuros

Para agregar un nuevo producto al ecosistema ARNÉS:

1. El producto provee su Product Context (12 campos obligatorios según `PRODUCT_CONTEXT_CONTRACT.md`).
2. Si su estructura documental es estándar, usa el adapter genérico. Si no, se crea un adapter específico.
3. Se define un Runtime Profile (o se usa el default).
4. El producto se registra en la configuración de la implementación.

**Nada de esto modifica el Framework.** ARNÉS no sabe que el nuevo producto existe. Solo sabe que hay un Product Context que cumple el contrato.

### 7.3 OpenCode como host multi-proyecto

OpenCode ya soporta trabajar con múltiples proyectos (basta con cambiar el directorio de trabajo). ARNÉS hereda esta capacidad:

- Cambiar de proyecto en OpenCode = cambiar el working directory.
- ARNÉS detecta el cambio y activa el adapter correspondiente.
- El Workspace anterior se destruye (si la misión estaba cerrada).
- El nuevo Workspace se crea con el contexto del nuevo proyecto.

---

> *El Operational Workspace es el entorno donde ARNÉS Framework cobra vida durante una misión. Es un contenedor efímero que agrupa el Product Context, el Runtime Profile, el estado de ejecución y los agentes, y los destruye completamente al finalizar. OpenCode permanece como host, con sus modos nativos intactos. ARNÉS se añade como un modo gobernado que agrega contratos formales, trazabilidad y enforcement. Cambiar de proyecto nunca modifica el Framework: solo cambia qué se carga en el Workspace.*
>
> *Versión 1.0. Documento de arquitectura operacional. No modifica el framework. Describe la colaboración de componentes ya diseñados.*
