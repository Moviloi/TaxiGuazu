# ARNÉS Framework — Cognitive Architecture v1.0

> **Nivel:** Arquitectónico — define la organización de los componentes cognitivos del framework.
> **Versión:** 1.0
> **Fecha:** 2026-07-22
> **Estado:** ACTIVE
>
> Este documento especifica cómo el ARNÉS Framework organiza sus componentes cognitivos
> para transformar misiones de ingeniería en resultados verificables.

---

## Índice

1. [Visión general](#1-visión-general)
2. [Los dos planos cognitivos](#2-los-dos-planos-cognitivos)
3. [Plano Estratégico: Mission Analyzer](#3-plano-estratégico-mission-analyzer)
4. [Plano Operacional: Director](#4-plano-operacional-director)
5. [Decision Engine](#5-decision-engine)
6. [Capa de Agentes](#6-capa-de-agentes)
7. [Flujo de información](#7-flujo-de-información)
8. [Límites arquitectónicos](#8-límites-arquitectónicos)
9. [Invariantes arquitectónicos](#9-invariantes-arquitectónicos)
10. [Relación con implementaciones existentes](#10-relación-con-implementaciones-existentes)

---

## 1. Visión general

### 1.1 Propósito de la arquitectura cognitiva

La arquitectura cognitiva de ARNÉS define **cómo piensa el framework**. No define cómo piensa el producto construido sobre él. La arquitectura cognitiva del producto es responsabilidad de la constitución de ese producto. Define cómo el framework procesa una misión de ingeniería: desde que se formula hasta que se verifica y se aprende de ella.

### 1.2 Los tres componentes estructurales

La arquitectura cognitiva de ARNÉS se organiza en tres componentes estructurales, orquestados por ARNÉS como infraestructura meta-framework:

```
ARNÉS (Orquestador — meta-framework)
    │
    ├──▶ MISSION ANALYZER (Plano Estratégico)
    │      ├── SDL (7 etapas) — Cognitive Engine de planificación DEEP
    │      └── LIGHT_PLANNER (4 etapas) — Cognitive Engine de planificación STANDARD/SHALLOW
    │
    └──▶ DIRECTOR (Plano Operacional)
           └── AEL (L1→L2→L3→L4) — Cognitive Engine de ejecución

Nota: Los Cognitive Engines (SDL, LIGHT_PLANNER, AEL) son invocados por
Primary Modes (PLAN, BUILD) a través de la Cognitive Invocation Layer.
Ver COGNITIVE_INVOCATION_LAYER.md.

┌─────────────────────────────────────────────────────────┐
│                  ARNÉS Cognitive Architecture            │
│                                                         │
│  ┌─────────────────────┐    ┌─────────────────────┐     │
│  │   MISSION ANALYZER  │    │      DIRECTOR        │     │
│  │   (Plano Estratégico)│───▶│  (Plano Operacional) │     │
│  │                     │    │                      │     │
│  │  ORIENT             │    │  L1 — Understanding  │     │
│  │  ANALYZE            │    │  L2 — Planning       │     │
│  │  EVALUATE           │    │  L3 — Execution      │     │
│  │  DECIDE             │    │  L4 — Closure        │     │
│  │  PLAN               │    │                      │     │
│  │  VERIFY             │    │                      │     │
│  │  DELIVER            │    │                      │     │
│  └─────────┬───────────┘    └──────────┬──────────┘     │
│            │                           │                 │
│            ▼                           ▼                 │
│  ┌─────────────────────────────────────────────────┐     │
│  │              DECISION ENGINE                     │     │
│  │  Transforma conocimiento en decisiones.          │     │
│  │  Transforma evidencia en conocimiento.           │     │
│  └─────────────────────┬───────────────────────────┘     │
│                        │                                 │
│                        ▼                                 │
│  ┌─────────────────────────────────────────────────┐     │
│  │              AGENT LAYER                         │     │
│  │  Discovery │ Architecture │ Implementation       │     │
│  │  Validation │ Memory │ Learning │ Governance     │     │
│  └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

Cada componente existe en uno de dos planos cognitivos. Ningún componente cruza planos.

### 1.3 Primary Modes y Cognitive Engines

El ARNÉS Framework separa la plataforma de entrada del usuario (Primary Modes) de las capacidades cognitivas del framework (Cognitive Engines):

- **Primary Modes** (ARNÉS, PLAN, BUILD): pertenecen a la plataforma OpenCode. Son puntos de entrada del usuario. No contienen lógica cognitiva propia. Delegan en Cognitive Engines a través de la Cognitive Invocation Layer.
- **Cognitive Engines** (SDL, LIGHT_PLANNER, AEL): son capacidades cognitivas independientes del framework. No pertenecen estructuralmente a ningún Primary Mode. Son invocados por modos autorizados.

El mapeo concreto entre modos y motores está definido en `COGNITIVE_INVOCATION_LAYER.md`.

### 1.4 Principio rector

```
El plano estratégico consume conocimiento y produce decisiones.
El plano operacional consume decisiones y produce evidencia.
El Decision Engine conecta ambos planos sin acoplarlos.
```

Este principio es arquitectónico, no organizacional. No es una sugerencia. Es una restricción estructural del framework.

---

## 2. Los dos planos cognitivos

### 2.1 Por qué dos planos

El trabajo de ingeniería tiene dos naturalezas cognitivas distintas:

| Dimensión | Plano Estratégico | Plano Operacional |
|---|---|---|
| **Pregunta que responde** | ¿Qué debemos hacer y por qué? | ¿Cómo lo hacemos? |
| **Unidad de trabajo** | La misión completa | Las tareas que componen la misión |
| **Horizonte temporal** | Largo plazo (múltiples misiones) | Corto plazo (esta misión) |
| **Incertidumbre** | Alta (contexto incompleto) | Baja (plan recibido) |
| **Tipo de razonamiento** | Abductivo (qué podría ser) | Deductivo (cómo ejecutar) |
| **Riesgo de error** | Mala estrategia | Mala implementación |

Mezclar ambos planos en un solo agente produce:
- Planificación interrumpida por detalles de implementación.
- Ejecución desviada por reconsideración estratégica.
- Ciclos infinitos de "pensar-hacer-repensar".

La separación en dos planos resuelve esto arquitectónicamente.

El orquestador ARNÉS no es un plano cognitivo. Es infraestructura del framework que aloja y gestiona el ciclo de vida de los dos planos.

### 2.2 El contrato entre planos

Los planos no se comunican informalmente. Se comunican mediante objetos cognitivos estructurados:

```
PLANO ESTRATÉGICO                    PLANO OPERACIONAL
       │                                    │
       │  ExecutionPlan (decisión)          │
       ├───────────────────────────────────▶│
       │                                    │
       │         ExecutionReport (evidencia)│
       │◀───────────────────────────────────┤
       │                                    │
```

No existe otro canal de comunicación entre planos. Cualquier información que no fluya a través de ExecutionPlan o ExecutionReport no existe para el otro plano.

---

## 3. Plano Estratégico: Mission Analyzer

### 3.1 Función

El Mission Analyzer es el componente cognitivo que opera en el plano estratégico. Su función: **transformar conocimiento en decisiones**.

El Mission Analyzer delega el razonamiento estratégico en Planning Engines. El framework soporta múltiples motores de planificación intercambiables: SDL (7 etapas) y LIGHT_PLANNER (4 etapas). El DecisionPackage selecciona cuál usar según la complejidad de la misión.

Recibe:
- Una misión (formulada por el usuario o detectada por el sistema).
- Conocimiento existente (documentación, memoria, reports previos, baseline).

El conocimiento existente se adquiere a través del Project Adapter (PROJECT_ADAPTER_ARCHITECTURE.md), que construye un Product Context conforme al PRODUCT_CONTEXT_CONTRACT.md.

Produce:
- Una decisión estructurada (ExecutionPlan).
- Un veredicto de ejecutabilidad (READY / NOT READY).

### 3.2 Flujo interno de razonamiento

El Mission Analyzer, cuando opera con el motor SDL, sigue un flujo de 7 etapas: ORIENT → ANALYZE → EVALUATE → DECIDE → PLAN → VERIFY → DELIVER. No es un pipeline rígido —puede iterar entre etapas— pero ninguna puede omitirse.

El motor LIGHT_PLANNER ejecuta un subconjunto: EVALUATE → DECIDE → PLAN → DELIVER.

```
ORIENT ──▶ ANALYZE ──▶ EVALUATE ──▶ DECIDE ──▶ PLAN ──▶ VERIFY ──▶ DELIVER
```

#### 3.2.1 ORIENT — Establecer contexto

**Propósito:** Entender qué misión se solicita, en qué contexto, con qué información disponible.

**Preguntas guía:**
- ¿Qué solicita el usuario o qué detecta el sistema?
- ¿En qué fase del ciclo de ingeniería nos encontramos?
- ¿Qué información está disponible?

**Entrada:** Mission Request, mensaje del usuario, evento del sistema.

**Salida:** Contexto de misión establecido (alcance preliminar).

#### 3.2.2 ANALYZE — Analizar impacto

**Propósito:** Determinar el alcance del cambio usando las fuentes de verdad del proyecto.

**Preguntas guía:**
- ¿Qué disposiciones, documentos, ADRs, componentes están impactados?
- ¿Cuál es el estado actual del proyecto (baseline, deuda, certificaciones)?
- ¿Qué evidencia existe de misiones anteriores?

**Entrada:** Misión contextualizada + documentación del proyecto.

**Salida:** Impact Analysis — alcance documentado del cambio.

#### 3.2.3 EVALUATE — Evaluar riesgos

**Propósito:** Evaluar riesgos, oportunidades y alineación estratégica.

**Preguntas guía:**
- ¿El cambio está alineado con la hoja de ruta?
- ¿Qué riesgos introduce? (deuda técnica, regresión, violación de principios)
- ¿Hay patrones de misiones anteriores que apliquen?
- ¿Se detectan insights estratégicos?

**Entrada:** Impact Analysis + ROADMAP + MEMORY + TECHNICAL_DEBT_BASELINE.

**Salida:** Evaluación estratégica con riesgos y recomendación preliminar.

#### 3.2.4 DECIDE — Determinar curso de acción

**Propósito:** Elegir el curso de acción entre las opciones disponibles.

**Opciones:**
- **CONTINUE:** Ejecutar según lo planificado.
- **IMPROVE:** El plan necesita refinamiento antes de ejecutar.
- **ESCALATE:** La decisión excede la autoridad del Mission Analyzer.
- **STOP:** La misión no debe ejecutarse.

**Entrada:** Evaluación estratégica.

**Salida:** Decisión con justificación.

#### 3.2.5 PLAN — Estructurar la ejecución

**Propósito:** Traducir la decisión en un ExecutionPlan estructurado que el Director pueda ejecutar sin reinterpretación.

**El ExecutionPlan contiene:**
- Objetivo principal.
- Estado actual según conocimiento disponible.
- Evidencia considerada (referencias a documentos, reports).
- Workflow recomendado (pasos para BUILD).
- Restricciones (invariantes a respetar).
- Criterios de éxito (condiciones medibles).
- Nivel de confianza.
- Indicador de escalamiento.

**Entrada:** Decisión.

**Salida:** ExecutionPlan estructurado (JSON).

#### 3.2.6 VERIFY — Verificar el plan

**Propósito:** Confirmar que el plan respeta invariantes, contratos y baseline. Verificar que es ejecutable por BUILD.

**Preguntas guía:**
- ¿El plan respeta todos los invariantes del framework?
- ¿Los criterios de éxito son medibles?
- ¿El plan es accionable sin ambigüedad?

**Entrada:** ExecutionPlan.

**Salida:** Plan verificado o marcado para revisión.

#### 3.2.7 DELIVER — Entregar al plano operacional

**Propósito:** Entregar el ExecutionPlan con estado READY o NOT READY.

**Formato de entrega:**
- Recommendation (lenguaje natural).
- ExecutionPlan (JSON estructurado).
- ExecutionStatus (READY | NOT READY).

**Si NOT READY:** Debe indicar exactamente qué evidencia falta.

### 3.3 Restricciones del plano estratégico

El Mission Analyzer **nunca**:

- Inspecciona código fuente.
- Ejecuta herramientas (bash, edit, write, grep, glob).
- Modifica archivos.
- Invoca subagentes operacionales.
- Produce Execution Reports.

El Mission Analyzer piensa. No ejecuta.

---

## 4. Plano Operacional: Director

### 4.1 Función

El Director es el componente cognitivo que opera en el plano operacional. Su función: **transformar decisiones en evidencia**.

Recibe:
- Un ExecutionPlan aprobado (READY).

Produce:
- Un ExecutionReport con evidencia verificable.

### 4.2 Ciclo de vida operacional

El Director opera bajo 4 restricciones de ciclo de vida (L1-L4):

```
L1: UNDERSTANDING ──▶ L2: OPERATIONAL PLANNING ──▶ L3: EXECUTION ──▶ L4: CLOSURE

Nota: Este L2 es planificación operacional (descomposición de tareas, selección
de capacidades, orden de ejecución). Es distinto de la planificación estratégica
realizada por SDL/LIGHT_PLANNER en el plano estratégico. El Director siempre
ejecuta L2 operacional — incluso en modo BUILD directo. Lo que se omite en ese
modo es la planificación estratégica, no la operacional.
```

#### 4.2.1 L1 — Understanding (Entender)

**Antes de actuar, el Director debe entender qué requiere la misión.**

Puede lograrlo mediante Discovery, Memory, razonamiento interno, o cualquier combinación. No hay un método prescrito.

#### 4.2.2 L2 — Operational Planning (Planificación Operacional)

**Antes de ejecutar cambios, el Director debe tener un plan operacional.**

El plan operacional define cómo se ejecutará la misión: descomposición en tareas, qué capacidades invocar, en qué orden, con qué dependencias. Es responsabilidad exclusiva del Director y es distinto de la planificación estratégica (qué construir, qué arquitectura usar) realizada por SDL/LIGHT_PLANNER.

El plan operacional puede ser tan simple como una acción única o tan complejo como un grafo de dependencias. Su forma es elección del Director. El plan debe satisfacer los invariantes para el resultado esperado.

Este L2 es siempre obligatorio. Incluso cuando el usuario invoca BUILD directamente (sin PLAN ni ExecutionPlan), el Director debe planificar operacionalmente la ejecución. Lo que se omite en ese escenario es la planificación estratégica — no la planificación operacional.

#### 4.2.3 L3 — Execution (Ejecutar)

**Los cambios deben aplicarse según el plan o una revisión justificada.**

El Director puede replanificar en cualquier momento si las condiciones cambian. Puede invocar cualquier capacidad, en cualquier orden, o ejecutarla internamente.

#### 4.2.4 L4 — Closure (Cerrar)

**Antes de cerrar, el Director debe verificar:**

- Todos los invariantes (I1-I6) se cumplen.
- Todos los contratos aplicables fueron honrados.
- El conocimiento digno de preservación fue registrado.
- El ExecutionReport está completo.

### 4.3 Soberanía del Director

Dentro de los límites del ExecutionPlan, el Director es soberano. Decide:

- Cómo descomponer el plan en tareas ejecutables.
- Qué capacidades invocar, en qué orden, en qué combinación.
- Si paralelizar o secuenciar.
- Cuándo detenerse, replanificar o abortar.
- Si ejecutar una capacidad internamente o delegar en un subagente.

El framework no prescribe ninguna de estas decisiones. La soberanía es total dentro de las fronteras del plan.

### 4.4 Restricciones del plano operacional

El Director **nunca**:

- Redefine los objetivos del ExecutionPlan.
- Cambia las prioridades establecidas en el plan.
- Produce una Recommendation estratégica.
- Produce un nuevo ExecutionPlan.
- Debate o cuestiona la estrategia del plano estratégico.
- Declara una misión CLOSED (eso es autoridad del Mission Analyzer).

Si el Director encuentra problemas durante la ejecución, los reporta como hallazgos en el ExecutionReport. No los resuelve cambiando la estrategia.

---

## 5. Decision Engine

### 5.1 Qué es el Decision Engine

El Decision Engine no es un agente ni una capacidad. Es el **mecanismo de transformación** que conecta los dos planos cognitivos. Su función es garantizar que la información que cruza la frontera entre planos es del tipo correcto y tiene el formato correcto.

**Existe un único Decision Engine en todo el ARNÉS Framework.** Pertenece exclusivamente al modo ARNÉS. No existen Decision Engines secundarios, ni dentro del Primary Mode PLAN, ni dentro del Primary Mode BUILD.

El Decision Engine es un componente lógico del Framework (Nivel 1). Su implementación concreta es ejercida por el agente ARNÉS (Nivel 2) durante el Scope Gate y la gestión del ciclo estratégico↔operacional.

### 5.1.1 Scope Gate de PLAN (entry adapter)

Cuando el usuario ingresa directamente por PLAN (sin pasar por ARNÉS), PLAN ejecuta un **Scope Gate reducido** que actúa como adaptador de entrada. Este Scope Gate:

- **Puede decidir:** `planning_engine` (SDL vs LIGHT_PLANNER) y `reasoning_depth`.
- **Nunca decide:** PLAN vs BUILD (el usuario ya eligió PLAN).
- **No es un Decision Engine.** Es un mecanismo de entrada que produce un DecisionPackage con `producer: PLAN`.

Cuando PLAN recibe un DecisionPackage producido por ARNÉS (`producer: ARNES`), **no ejecuta su Scope Gate.** El paquete se consume directamente sin reclasificación.

```
                  DECISION ENGINE
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
    ▼                  ▼                  ▼
Conocimiento       Decisión          Evidencia
(descriptivo)    (prescriptivo)    (verificable)
    │                  │                  │
    │         ┌────────┴────────┐         │
    │         │                 │         │
    ▼         ▼                 ▼         ▼
Mission     Execution        Execution   Review
Analyzer    Plan             Report      (Learning)
(Estratég.) (Estrat.→Oper.)  (Operac.)   (post-CLOSED)
```

### 5.2 Tipos de información

El Decision Engine reconoce tres tipos de información. Ningún otro tipo puede cruzar la frontera entre planos.

| Tipo | Naturaleza | Ejemplo | Productor | Consumidor |
|---|---|---|---|---|
| **Conocimiento** | Descriptivo | "El baseline muestra 21 ítems de deuda, 5 P1." | Documentación, Reports previos | Mission Analyzer |
| **Decisión** | Prescriptivo | "Ejecutar refactor del servicio de pricing con constraints X, Y, Z." | Mission Analyzer | Director |
| **Evidencia** | Verificable | "Tests: 47/47 PASS. Build: SUCCESS. Nuevo archivo: pricing-v2.service.ts." | Director | Mission Analyzer |

### 5.3 Ciclo de transformación

```
Conocimiento → [MISSION ANALYZER] → Decisión → [DIRECTOR] → Evidencia
                                                              │
                                                              ▼
                                              [MISSION ANALYZER] → Conocimiento (nuevo ciclo)
```

Cada iteración del ciclo produce nuevo conocimiento que alimenta la siguiente iteración. El framework **aprende** porque cada ciclo deja conocimiento que no existía antes.

### 5.4 Garantías del Decision Engine

El Decision Engine garantiza que:

1. **No hay fuga de tipos:** Una decisión nunca se interpreta como evidencia. Evidencia nunca se usa como decisión.
2. **No hay comunicación informal:** Toda información entre planos viaja en objetos cognitivos estructurados.
3. **No hay acoplamiento temporal:** El Mission Analyzer no espera al Director. El Director no consulta al Mission Analyzer durante la ejecución.
4. **La trazabilidad es inherente:** Cada ExecutionPlan referencia las decisiones que lo originaron. Cada ExecutionReport referencia el plan que ejecutó.

---

## 6. Capa de Agentes

### 6.1 Posición en la arquitectura

La capa de agentes está **debajo** del Director. Los agentes no toman decisiones estratégicas. No planifican misiones. Son herramientas especializadas que el Director invoca cuando agregan valor.

```
DIRECTOR (soberano dentro del ExecutionPlan)
    │
    ├── Invoca ──▶ Explorer      (Discovery)
    ├── Invoca ──▶ Architect     (Architecture)
    ├── Invoca ──▶ Implementer   (Implementation)
    ├── Invoca ──▶ Auditor       (Validation)
    ├── Invoca ──▶ Keeper        (Memory)
    ├── Invoca ──▶ Analyst       (Learning)
    └── Invoca ──▶ Governor      (Governance)
```

### 6.2 Independencia entre agentes

Los agentes son independientes entre sí. Ninguno requiere otro como prerrequisito. El Director decide las dependencias caso por caso.

Relaciones estructurales:
- **Architect** puede depender de **Explorer** si el Director proporciona estado del sistema (o el Director puede proveerlo internamente).
- **Implementer** puede recibir restricciones de **Architect** si el Director invoca Architect primero. El Director puede omitir Architect para cambios de bajo impacto.
- **Auditor** sigue a **Implementer** por requisito constitucional (Invariante F5). El Director decide si invocar el rol Auditor o validar internamente.
- **Keeper** y **Analyst** observan resultados. El Director decide cuándo.
- **Governor** se invoca solo para cambios de restricciones, conflictos o excepciones.

### 6.3 Contratos de agente

Cada agente opera bajo un contrato que define:

| Elemento del contrato | Descripción |
|---|---|
| **Must** | Lo que el agente debe hacer. Obligatorio. |
| **Must not** | Lo que el agente tiene prohibido hacer. |
| **Guarantees** | Lo que el agente garantiza al completar su trabajo. |

Los contratos completos de cada agente están definidos en `ael/government/roles/`.

---

## 7. Flujo de información

### 7.1 El camino completo de una misión

```
1. USUARIO presenta misión o problema
        │
        ▼
2. MISSION ANALYZER (Plano Estratégico)
   ┌─────────────────────────────────────────┐
   │ ORIENT → ANALYZE → EVALUATE → DECIDE    │
   │ → PLAN → VERIFY → DELIVER               │
   │                                         │
   │ Produce: ExecutionPlan + Status          │
   └─────────────────────────────────────────┘
        │
        ▼
3. USUARIO aprueba ("ok" / "hacelo")
         │
         ▼
4. DIRECTOR / AMC (Plano Operacional — Dominio AEL)
   ┌─────────────────────────────────────────┐
   │ AMC recibe ExecutionPlan                 │
   │    │                                     │
   │    └── Produce: MissionExecutionPlan     │
   │            │                             │
   │            ├── Selecciona capacidades    │
   │            ├── Define orden              │
   │            └── Justifica omisiones       │
   │                                         │
   │ L1 → L2 → L3 → L4                       │
   │                                         │
   │ Invoca agentes según necesidad.          │
   │ Produce: ExecutionReport                 │
   └─────────────────────────────────────────┘
        │
        ▼
5. MISSION ANALYZER consume ExecutionReport
        │
        ├── ¿Misión completa? ──▶ SÍ ──▶ 6. CLOSED
        │
        └── ¿Requiere otro ciclo? ──▶ Vuelve a 2
                │
                ▼
6. MISIÓN CLOSED
        │
        ▼
7. LEARNING (post-cierre)
   ┌─────────────────────────────────────────┐
   │ Analiza Execution Reports, decisiones,   │
   │ memoria. Produce: Review, recomendaciones│
   └─────────────────────────────────────────┘
```

### 7.2 Múltiples ciclos BUILD por misión

Una misión puede requerir múltiples ciclos BUILD antes de cerrarse:

```
Misión IN PROGRESS
    │
    ├── BUILD #1 → ExecutionReport #1
    │       │
    │       ▼
    │   SDL evalúa → nuevo ExecutionPlan
    │       │
    ├── BUILD #2 → ExecutionReport #2
    │       │
    │       ▼
    │   SDL evalúa → misión completa
    │       │
    └───────▼
    SDL declara CLOSED
```

Solo cuando el Mission Analyzer declara CLOSED, Learning puede ejecutarse. Learning nunca se ejecuta durante IN PROGRESS.

### 7.3 Información que cruza fronteras

| Frontera | Dirección | Vehículo | Tipo de información |
|---|---|---|---|
| Usuario → Framework | Entrada | Mission Request | Conocimiento (objetivo) |
| Estratégico → Operacional | ↓ | ExecutionPlan | Decisión |
| Operacional → Operacional | — | MissionExecutionPlan | Coordinación operacional |
| Operacional → Estratégico | ↑ | ExecutionReport | Evidencia |
| Estratégico → Estratégico | — | Review | Conocimiento (aprendido) |
| Operacional → Operacional | — | Invocación de agente | Instrucción táctica |

El orquestador ARNÉS no pertenece a ningún plano. Es infraestructura meta-framework que gestiona el ciclo de vida de ambos planos. Ver F-ADR-004.

---

## 8. Límites arquitectónicos

### 8.1 Límite Planificación / Ejecución

**La frontera más importante del framework.**

| Dimensión | Planificación (Plano Estratégico) | Ejecución (Plano Operacional) |
|---|---|---|
| **Pregunta** | ¿Qué? ¿Por qué? | ¿Cómo? |
| **Horizonte** | La misión y más allá | Las tareas inmediatas |
| **Herramientas** | Ninguna (solo lectura de documentos) | Todas (bash, edit, write, subagentes) |
| **Output** | ExecutionPlan + Recommendation | ExecutionReport |
| **Puede fallar** | Produciendo READY cuando debería ser NOT READY | Ejecutando incorrectamente |
| **Falla se detecta** | En el próximo ciclo (evidencia no cumple criterios) | En L4 (validación) |

**Regla de frontera:** El Director nunca planifica estratégicamente. El Mission Analyzer nunca ejecuta operacionalmente. Cruzar esta frontera constituye una violación arquitectónica.

### 8.2 Límite Ejecución / Verificación

La verificación es una capacidad más, no una fase separada. Sin embargo, tiene una propiedad especial: **autoridad de bloqueo**.

- **Auditor** puede bloquear el cierre del plano operacional si las compuertas de calidad fallan.
- El Director puede ejecutar verificación internamente o delegar en Auditor.
- La verificación no modifica el sistema. Solo observa y reporta.

### 8.3 Límite Framework / Producto

El framework no conoce el dominio del producto. El producto no conoce la mecánica del framework.

| El framework pregunta | El producto responde |
|---|---|
| ¿Pasaron los tests? | Sí/No (con evidencia) |
| ¿Compila el build? | Sí/No (con evidencia) |
| ¿Se cumplen los contratos? | Sí/No (con evidencia) |
| ¿Qué decisiones arquitectónicas aplican? | ADRs (documentos del producto) |

El framework impone **cómo** verificar. El producto define **qué** verificar.

### 8.4 Límite Misión / Aprendizaje

El aprendizaje ocurre **después** del cierre de misión, nunca durante. La frontera es explícita:

- **IN PROGRESS:** No se ejecuta Learning.
- **CLOSED:** Learning puede ejecutarse.

Esta frontera garantiza que Learning solo procesa conocimiento consolidado, no hipótesis ni evidencia parcial.

---

## 9. Invariantes arquitectónicos

Estos invariantes son propiedades estructurales que la arquitectura cognitiva garantiza. Una violación de cualquier invariante indica una falla en la arquitectura misma, no en una implementación particular.

### CA-1 — Separación de planos

**El Mission Analyzer y el Director residen en planos cognitivos distintos y no se solapan.**
No existe un agente que opere en ambos planos. No existe información que fluya entre planos fuera de ExecutionPlan y ExecutionReport.

### CA-2 — Tipos de información disjuntos

**Conocimiento, Decisión y Evidencia son tipos mutuamente excluyentes.**
Un ExecutionPlan nunca contiene evidencia. Un ExecutionReport nunca contiene decisiones. El Decision Engine rechaza cualquier objeto que viole esta restricción de tipos.

### CA-3 — Trazabilidad completa

**Para cada ExecutionReport, existe exactamente un ExecutionPlan que lo originó.**
Para cada ExecutionPlan, existe exactamente una Decisión que lo produjo. La cadena es ininterrumpida y verificable.

### CA-4 — Soberanía delimitada

**El Director es soberano dentro del ExecutionPlan. El Mission Analyzer es soberano dentro de la misión.**
Ninguno invade la soberanía del otro. El Director no redefine objetivos. El Mission Analyzer no instruye tácticas de ejecución.

### CA-5 — Cierre gobernado

**Solo el Mission Analyzer declara una misión CLOSED.**
El Director puede cerrar el ciclo operacional (L4). No puede cerrar la misión. Learning solo se ejecuta post-CLOSED.

### CA-6 — Acoplamiento mínimo

**Los agentes son independientes. Ninguno requiere otro como prerrequisito.**
El Director decide las dependencias caso por caso. El framework no impone un orden de invocación.

### CA-7 — Dominio de planificación multi-engine

**El dominio PLAN aloja múltiples motores de planificación intercambiables.**
Los motores de planificación (SDL, LIGHT_PLANNER, y cualquier motor adicional) producen ExecutionPlans de formato idéntico. El dominio AEL no distingue qué motor originó el plan que recibe. El Decision Engine selecciona el motor apropiado.

---

## 10. Relación entre especificación e implementación

### 10.1 Principio

Esta arquitectura cognitiva es una especificación. No prescribe una implementación concreta. Cualquier implementación que satisfaga los invariantes arquitectónicos (CA-1 a CA-7) y respete los contratos entre planos es una implementación válida del framework.

### 10.2 Separación de niveles

| Nivel | Contenido | Naturaleza |
|---|---|---|
| **Especificación** | Esta arquitectura, la Constitución, el modelo de objetos | Normativa — define qué debe cumplirse |
| **Implementación operacional** | Agentes, enforcement, runtime adapter | Ejecuta la especificación en una plataforma concreta |
| **Producto** | Código, ADRs, reglas de negocio, schema | Gobernado por el framework; independiente de él |

La especificación no referencia implementaciones concretas. La implementación declara qué versión de la especificación satisface.

### 10.3 Independencia del producto

El framework está diseñado para ser independiente de cualquier producto. Para construir un producto sobre ARNÉS se requiere:

1. Una constitución de producto que defina su dominio, comportamiento y principios.
2. Decisiones arquitectónicas del producto (ADRs).
3. Código fuente, tests, y esquema de datos propios del producto.

El framework no requiere modificaciones para gobernar un nuevo producto.

---

> *Versión 1.0. Especificación arquitectónica vinculante del ARNÉS Framework. Deriva su autoridad de la ARNÉS Constitution.*
