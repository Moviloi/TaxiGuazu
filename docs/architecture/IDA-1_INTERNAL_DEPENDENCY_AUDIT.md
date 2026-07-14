# IDA-1 — Internal Dependency Audit

> **Fecha:** 2026-07-14  
> **Precedencia:** PD-IM-0 (Pattern Discovery Implementation Scope — 12 módulos)  
> **Driver:** Verificar que la estructura de dependencias internas entre los módulos de Pattern Discovery forma un DAG limpio, previo a la implementación  
> **Rol:** Arquitecto de Software — modularidad y dependencias internas

---

## Preámbulo

PD-IM-0 define 12 módulos en `src/lib/pattern-discovery/`. Antes de implementar, se audita exclusivamente el grafo de dependencias entre ellos.

**No se revisan responsabilidades, contratos, ni ontología.** Solo dependencias.

---

## Sección 1: Reconstrucción del grafo

### 1.1 Mapa de tipos

El primer paso es establecer DÓNDE se define cada tipo en PD-IM-0. Esta es la principal variable que determina el grafo de dependencias.

| Tipo | Definido en | Usado por (relevante para el grafo) |
|:-----|:-----------|:-------------------------------------|
| `Dimension` | `types.ts` | pattern, detector, acceptance, orchestrator |
| `PatternStatus` | `types.ts` | pattern |
| `RelationType` | `types.ts` | pattern (vía Relation) |
| `RunStatus` | `types.ts` | types (usado en PatternRun) |
| `Relation` | `types.ts` | pattern, detector, acceptance |
| `EvidenceWindow` | `types.ts` | pattern, detector, acceptance |
| `AcceptanceReport` | `types.ts` | pattern, acceptance |
| `Watermark` | `types.ts` | memory-read, repository, watermark |
| `ProjectedState` | **`projection.ts`** | detector, acceptance |
| `RelationCandidate` | **`detector.ts`** | acceptance |
| `DetectionConfig` | **`detector.ts`** | orchestrator |
| `Invariant` | **`invariant-catalog.ts`** | acceptance, repository |
| `Pattern` (class) | **`pattern.ts`** | acceptance, repository, orchestrator |
| `PatternRepository` | **`repository.ts`** | watermark, orchestrator |
| `MemoryReadAdapter` | **`memory-read.ts`** | orchestrator |
| `WatermarkManager` | **`watermark.ts`** | pd-service, orchestrator |
| `PatternOrchestrator` | **`orchestrator.ts`** | pd-service |
| `ExecutionConfig` | **`orchestrator.ts`** | (solo en orchestrator) |
| `PatternRun` | **no definido explícitamente** | orchestrator, pd-service, repository |
| `Candidate` | **no definido explícitamente** | repository |
| `PatternProps` | **no definido explícitamente** | pattern |
| `AcceptanceEvaluator` | **`acceptance.ts`** | orchestrator |
| `RelationDetector` | **`detector.ts`** | orchestrator |
| `InvariantCatalog` | **`invariant-catalog.ts`** | orchestrator |

### 1.2 Dependencias actuales (según PD-IM-0)

Lista completa de qué importa cada módulo para COMPILAR:

```
types.ts
  → ∅ (sin dependencias PD internas)
  → externo: ∅

pattern.ts
  → types.ts   (Relation, EvidenceWindow, Dimension, AcceptanceReport, PatternStatus)
  → externo: ∅

projection.ts
  → ∅ (sin dependencias PD internas — solo define tipos primitivos)
  → externo: MemorySnapshot (src/lib/memory/types.ts)

detector.ts
  → types.ts               (Relation, EvidenceWindow, Dimension)
  → projection.ts          (ProjectedState)
  → externo: ∅

acceptance.ts
  → types.ts               (AcceptanceReport)
  → detector.ts            (RelationCandidate)
  → invariant-catalog.ts   (Invariant)
  → pattern.ts             (Pattern — class type reference)
  → projection.ts          (ProjectedState)
  → externo: ∅

invariant-catalog.ts
  → ∅ (sin dependencias PD internas)
  → externo: ∅

memory-read.ts
  → types.ts               (Watermark)
  → externo: MemorySnapshot (src/lib/memory/types.ts)

repository.ts
  → types.ts               (Watermark)
  → pattern.ts             (Pattern — class type reference)
  → invariant-catalog.ts   (Invariant)
  → externo: ∅
  → NOTA: Candidate y PatternRun no están definidos explícitamente; si se definen en types.ts,
          estas dependencias a pattern.ts e invariant-catalog.ts desaparecen.

watermark.ts
  → types.ts               (Watermark)
  → repository.ts          (PatternRepository — interface, si delega persistencia en repo)
  → externo: ∅

orchestrator.ts (interface)
  → types.ts               (PatternRun)
  → detector.ts            (DetectionConfig, para ExecutionConfig)
  → externo: ∅

orchestrator.ts (implementación)
  → types.ts               (PatternRun, ExecutionConfig)
  → pattern.ts             (Pattern — construcción de instancias)
  → projection.ts          (projectMany)
  → detector.ts            (RelationDetector, detect)
  → acceptance.ts          (AcceptanceEvaluator, evaluate)
  → invariant-catalog.ts   (InvariantCatalog)
  → memory-read.ts         (MemoryReadAdapter)
  → repository.ts          (PatternRepository)
  → watermark.ts           (WatermarkManager)
  → externo: ∅

pd-service.ts
  → types.ts               (PatternRun)
  → orchestrator.ts         (PatternOrchestrator)
  → watermark.ts           (WatermarkManager)
  → externo: ∅

index.ts
  → ALL 11 módulos
```

### 1.3 Grafo de dependencias (actual)

```
                    types.ts (hub principal)
                   /    |    |    |    |    \
                  /     |    |    |    |     \
                 ↓      ↓    ↓    ↓    ↓      ↓
           pattern  detector  mem-read  watermark
              |       |    \      |       |
              |       |     \     |       |
              ↓       ↓      ↓    ↓       ↓
         acceptance  ←  detector  repository
              ↑                \      |
              |                 \     |
              |                  ↓    ↓
              |              orchestrator
              |                   |
              |                   ↓
              |              pd-service
              |                   |
              └──────── index ────┘
```

**Dependencias entre módulos (edges):**

| Desde | Hacia | Tipo | ¿Necesaria? |
|:------|:------|:----|:-----------:|
| pattern | types | type | ✅ |
| projection | ∅ (solo ext) | — | ✅ |
| detector | types | type | ✅ |
| detector | **projection** | **type** | ❌ **INNECESARIA** |
| acceptance | types | type | ✅ |
| acceptance | **detector** | **type** | ❌ **INNECESARIA** |
| acceptance | **invariant-catalog** | **type** | ❌ **INNECESARIA** |
| acceptance | **pattern** | **type** | ❌ **INNECESARIA** |
| acceptance | **projection** | **type** | ❌ **INNECESARIA** |
| invariant-catalog | ∅ | — | ✅ |
| memory-read | types | type | ✅ |
| repository | types | type | ✅ |
| repository | **pattern** | **type** | ❌ **INNECESARIA** |
| repository | **invariant-catalog** | **type** | ❌ **INNECESARIA** |
| watermark | types | type | ✅ |
| watermark | **repository** | **type** | ❌ **INNECESARIA** |
| orchestrator | types | type | ✅ |
| orchestrator | detector | type + class | ✅ (necesita implementación) |
| orchestrator | acceptance | type + class | ✅ (necesita implementación) |
| orchestrator | pattern | class | ✅ (necesita construir Patterns) |
| orchestrator | projection | function | ✅ (necesita projectMany) |
| orchestrator | invariant-catalog | class | ✅ (necesita InvariantCatalog) |
| orchestrator | memory-read | class | ✅ (necesita MemoryReadAdapter) |
| orchestrator | repository | class | ✅ (necesita PatternRepository) |
| orchestrator | watermark | class | ✅ (necesita WatermarkManager) |
| pd-service | types | type | ✅ |
| pd-service | orchestrator | class | ✅ (necesita PatternOrchestrator) |
| pd-service | **watermark** | **type** | ❌ **INNECESARIA** |

---

## Sección 2: Verificaciones

### 2.1 Ciclos

Búsqueda de caminos que retornen al nodo de origen:

```
Types → pattern → acceptance → detector → projection → ∅   TERMINA
Types → pattern → acceptance → invariant-catalog → ∅        TERMINA
Types → pattern → acceptance → projection → ∅               TERMINA
Types → pattern → repository → invariant-catalog → ∅        TERMINA
Types → detector → projection → ∅                           TERMINA
Types → memory-read → ∅                                     TERMINA
Types → repository → pattern → types                        NO ES CICLO (pattern→types es solo lectura, repository→pattern es solo lectura, types no retorna a repository)
```

**Verificación de ciclo formal:**

Para cada módulo M, verifico si existe un camino M → ... → M.

- `types` → solo pattern, detector, memory-read, repository, watermark. Ninguno retorna a types.
- `pattern` → types. Detiene. ✅
- `projection` → ∅. Detiene. ✅
- `detector` → types, projection. projection → ∅. Detiene. ✅
- `acceptance` → types, detector, invariant-catalog, pattern, projection. Todos terminan en ∅ o types (que no retorna). ✅
- `invariant-catalog` → ∅. ✅
- `memory-read` → types. Detiene. ✅
- `repository` → types, pattern, invariant-catalog. pattern → types. Detiene. ✅
- `watermark` → types, repository. repository → types, pattern, invariant-catalog. pattern → types. Detiene. ✅
- `orchestrator` → types, pattern, projection, detector, acceptance, invariant-catalog, memory-read, repository, watermark. Todos terminan. ✅
- `pd-service` → types, orchestrator, watermark. Todos terminan. ✅

**✅ No se detectan ciclos en el grafo.**

### 2.2 Capas

Identificación de capas por profundidad de dependencia:

```
Capa 0 (Foundation):     types.ts
Capa 1 (Entities):       pattern.ts, projection.ts, invariant-catalog.ts
Capa 2 (Data Access):    memory-read.ts
Capa 3 (Types dependientes):  repository.ts, detector.ts
Capa 4 (Processing):     acceptance.ts
Capa 5 (State):          watermark.ts
Capa 6 (Integration):    orchestrator.ts
Capa 7 (Entry):          pd-service.ts
Capa 8 (Export):         index.ts
```

**Violación detectada — acceptance.ts (Capa 4) debería depender de Capas ≤3.**

Estado actual: `acceptance.ts → detector.ts (Capa 3)` → OK en términos de capa. Pero `acceptance.ts → pattern.ts (Capa 1)` → OK (depende de capa inferior). `acceptance.ts → projection.ts (Capa 1)` → OK.

Las capas NO se violan en términos de dirección (las capas superiores dependen de inferiores). El problema no es de capas — es de **dispersión de tipos**.

**✅ No hay inversión de dependencias.** Todas las flechas apuntan de capas superiores a inferiores.

### 2.3 Causa raíz de las dependencias innecesarias

Cada dependencia marcada como ❌ INNECESARIA en §1.3 comparte la misma causa raíz:

> **Los tipos compartidos no están centralizados en `types.ts`. Están dispersos en los módulos de implementación.**

| Tipo | Definido en | Debería estar en |
|:-----|:-----------|:----------------|
| `ProjectedState` | projection.ts | **types.ts** |
| `RelationCandidate` | detector.ts | **types.ts** |
| `DetectionConfig` | detector.ts | **types.ts** |
| `Invariant` | invariant-catalog.ts | **types.ts** |
| `Pattern` (interface) | pattern.ts (class) | **types.ts** (interface) |
| `PatternRepository` | repository.ts | **types.ts** |
| `MemoryReadAdapter` | memory-read.ts | **types.ts** |
| `WatermarkManager` | watermark.ts | **types.ts** |
| `PatternOrchestrator` | orchestrator.ts | **types.ts** |
| `AcceptanceEvaluator` | acceptance.ts | **types.ts** |
| `RelationDetector` | detector.ts | **types.ts** |
| `InvariantCatalog` | invariant-catalog.ts | **types.ts** |
| `PatternRun` | no definido | **types.ts** |
| `Candidate` | no definido | **types.ts** |
| `ExecutionConfig` | orchestrator.ts | **types.ts** |

**Las dependencias no desaparecen, pero se consolidan en `types.ts`.**

Si todos los tipos compartidos están en `types.ts`:
- `acceptance.ts` solo importa de `types.ts` (en lugar de 4 módulos distintos)
- `detector.ts` solo importa de `types.ts` (en lugar de types + projection)
- `repository.ts` solo importa de `types.ts` (en lugar de 3 módulos distintos)
- `watermark.ts` solo importa de `types.ts` (en lugar de types + repository)
- `pd-service.ts` solo importa de `orchestrator.ts` (no necesita watermark)

---

## Sección 3: Grafo corregido

### 3.1 Correcciones aplicadas

1. **Mover `ProjectedState`, `RelationCandidate`, `DetectionConfig` a `types.ts`** → detector.ts deja de depender de projection.ts. acceptance.ts deja de depender de detector.ts y projection.ts.

2. **Mover `Invariant` a `types.ts`** → acceptance.ts y repository.ts dejan de depender de invariant-catalog.ts.

3. **Separar `Pattern` (interface) de `Pattern` (class)** → La interface va a `types.ts`. La clase en `pattern.ts` implementa la interface. acceptance.ts y repository.ts solo usan la interface → dependen de `types.ts`, no de `pattern.ts`.

4. **Mover `PatternRepository`, `MemoryReadAdapter`, `WatermarkManager`, `PatternOrchestrator`, `AcceptanceEvaluator`, `RelationDetector`, `InvariantCatalog`, `ExecutionConfig`, `PatternRun`, `Candidate` a `types.ts`** → Todas las referencias a interfaces se consolidan en types.ts.

5. **Eliminar `WatermarkManager` del constructor de `pd-service.ts`** → El orquestador ya gestiona watermark internamente. pd-service solo necesita `PatternOrchestrator`.

### 3.2 Grafo corregido

```
                    ┌─────────────────┐
                    │    types.ts     │  ← TODAS las interfaces y tipos compartidos
                    │   (hub único)   │
                    └────────┬────────┘
                   /     |    |    |    \
                  /      |    |    |     \
                 ↓       ↓    ↓    ↓      ↓
           pattern  projection  detector   acceptance
           (class)  (function)  (class)    (class)
              |
              |        ↓         ↓          ↓
              |   memory-read  invariant   repository
              |   (class)      -catalog    (class)
              |                (class)
              |                 
              |        ↓         ↓
              |    watermark   orchestrator ←──┘
              |    (class)     (class)        todos los
              |                   |            concretos
              |                   ↓            inyectados
              |              pd-service
              |              (class)
              |                   |
              └─── index ─────────┘
```

### 3.3 Dependencias corregidas

| Módulo | Dependencias PD internas | Justificación |
|:-------|:------------------------|:--------------|
| `types.ts` | ∅ | Foundation pura |
| `pattern.ts` | types.ts | Implementa Pattern interface |
| `projection.ts` | types.ts, externo (MemorySnapshot) | Usa ProjectedState de types |
| `detector.ts` | types.ts | Implementa RelationDetector |
| `acceptance.ts` | types.ts | Evaluador puro, sin dependencias de implementación |
| `invariant-catalog.ts` | types.ts | Implementa InvariantCatalog |
| `memory-read.ts` | types.ts, externo (MemorySnapshot) | Implementa MemoryReadAdapter |
| `repository.ts` | types.ts | Implementa PatternRepository |
| `watermark.ts` | types.ts | Implementa WatermarkManager, recibe repo por inyección |
| `orchestrator.ts` | types.ts, + pattern, projection, detector, acceptance, invariant-catalog, memory-read, repository, watermark (todos concretos) | Coordinador del pipeline — necesita todas las implementaciones |
| `pd-service.ts` | types.ts, orchestrator.ts | Punto de entrada |
| `index.ts` | types.ts + todos los que exporta | Barrel export |

---

## Sección 4: Módulos con acoplamiento alto

### 4.1 Punto crítico: orchestrator.ts

`orchestrator.ts` depende de **9 módulos concretos** (pattern, projection, detector, acceptance, invariant-catalog, memory-read, repository, watermark) + types.ts.

**Evaluación:** ⚠️ Acoplamiento alto, pero **justificado**.

El orquestador es el coordinador del pipeline `L(W) = Select_γ(Detect_γ(W))`. Por definición, necesita acceder a todos los pasos del pipeline. No hay forma de reducirlo sin añadir una capa de abstracción que no agrega valor (PBA-1 Modelo C fue refutado precisamente por esto).

**Riesgo:** El orquestador cambia cuando cualquier paso del pipeline cambia. Esto es esperado — es el "punto de cambio natural" para el flujo.

**Mitigación:** Uso de Inversión de Dependencias (inyección de interfaces desde types.ts). La implementación recibe los concretos por constructor, permitiendo testear el orquestador con mocks/stubs sin tener que importar las implementaciones reales.

### 4.2 Segundo punto: types.ts como hub

Con las correcciones, `types.ts` se convierte en el hub de tipos. Todos los módulos dependen de él.

**Evaluación:** ✅ **Aceptable y deseable.**

Un módulo de tipos compartidos es un patrón estándar en TypeScript. No hay riesgo de ciclo (types.ts no depende de nadie). Los cambios en types.ts requieren coordinación con todos los consumidores, pero esto es inherente a cualquier sistema de tipos compartidos.

### 4.3 Módulos con dependencia cero

`types.ts`, `invariant-catalog.ts` (después de corrección), `projection.ts` (solo externo).

**Evaluación:** ✅ Saludable. Los módulos sin dependencias PD internas son las unidades más estables y testables del sistema.

---

## Sección 5: Límites y reglas

### 5.1 Reglas de importación

Basado en el grafo corregido, se definen las siguientes reglas:

| Regla | Enunciado | Consecuencia de violación |
|:------|:----------|:-------------------------|
| **R-DEP-1** | Ningún módulo importa de `index.ts` (barrel). Todos importan del archivo específico. | Dependencia circular potencial. Acoplamiento innecesario. |
| **R-DEP-2** | `types.ts` no importa ningún módulo de PD. Es la fundación del DAG. | Ciclo en el grafo. Rechazo automático. |
| **R-DEP-3** | Los módulos de implementación (`detector`, `acceptance`, `repository`, `watermark`, `memory-read`, `invariant-catalog`) importan exclusivamente de `types.ts` y de módulos externos a PD. No importan entre sí. | Acoplamiento innecesario. Dispersión de tipos. |
| **R-DEP-4** | `pattern.ts` y `projection.ts` importan exclusivamente de `types.ts` y externos. No importan de otros módulos de implementación. | Acoplamiento innecesario. |
| **R-DEP-5** | `orchestrator.ts` es el ÚNICO módulo que puede importar de módulos de implementación concretos. | El orquestador es el punto de integración del pipeline. |
| **R-DEP-6** | `pd-service.ts` importa exclusivamente de `types.ts` y `orchestrator.ts`. No importa de ningún otro módulo de implementación. | Acoplamiento del punto de entrada con detalles internos. |
| **R-DEP-7** | Ningún módulo importa `index.ts`. `index.ts` exporta, no es importado por módulos internos. | Ciclo y acoplamiento. |

### 5.2 Diagrama de capas y dependencias permitidas

```
Capa       Módulos                    Puede importar de
──────────────────────────────────────────────────────────────────────
Foundation  types.ts                  ∅

Entity      pattern.ts                Foundation
            projection.ts             Foundation + External

Data        memory-read.ts            Foundation + External
Access      repository.ts             Foundation

Processing  detector.ts               Foundation
            acceptance.ts             Foundation
            invariant-catalog.ts      Foundation

State       watermark.ts              Foundation

Pipeline    orchestrator.ts           Foundation + Entity + Data
                                       + Processing + State

Entry       pd-service.ts             Foundation + Pipeline

Export      index.ts                  Foundation + Entity + Data
                                       + Processing + State + Pipeline + Entry
```

### 5.3 Dependencias prohibidas

```
❌ implementation-module → otro-implementation-module
   Ej: detector.ts → acceptance.ts (prohibido)
   Ej: repository.ts → pattern.ts (prohibido — usar interface de types.ts)

❌ types.ts → ningún módulo de PD (prohibido — rompe el DAG)

❌ index.ts → usado por módulos internos (prohibido)

❌ pd-service.ts → repository.ts, detector.ts, acceptance.ts, etc. (prohibido)

❌ acceptance.ts → detector.ts (prohibido — usar types.ts)
```

---

## Sección 6: Dependencias externas

### 6.1 Memoria externa requerida

| Módulo | Dependencia externa | Justificación |
|:-------|:--------------------|:--------------|
| `types.ts` | `MemorySnapshot` (src/lib/memory/types.ts) | Necesario para definir tipos que referencian MemorySnapshot |
| `projection.ts` | `MemorySnapshot` (src/lib/memory/types.ts) | `project(snapshot: MemorySnapshot)` |
| `memory-read.ts` | `MemorySnapshot` (src/lib/memory/types.ts) | `getNewSnapshots(): Promise<MemorySnapshot[]>` |

**No hay otras dependencias externas.** PD no depende de Evidence Engine, de servicios operacionales, ni de ninguna otra librería interna.

### 6.2 Direccionalidad con Memory

```
Memory (capa inferior) → types (MemorySnapshot)
   ↓                        ↓
   ↓              Pattern Discovery (consume MemorySnapshot)
   ↓                        ↓
   └─── tipos ─────────────┘
```

PD importa TIPOS de Memory pero Memory no importa nada de PD. La direccionalidad es correcta.

---

## Sección 7: Riesgos

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|:--:|:-------|:------------:|:-------:|:-----------|
| **R1** | Dispersión de tipos durante implementación (un tipo nuevo se define en un módulo incorrecto) | Alta | Medio | R-DEP-3: solo orchestrator puede importar implementaciones. El resto solo types.ts. Code review debe verificar. |
| **R2** | `orchestrator.ts` demasiado grande (importa 9 módulos) | Media | Medio | Mantener orchestrator como coordinador delgado. La lógica de cada paso vive en su módulo. orchestrator solo orquesta. |
| **R3** | `index.ts` exporta tipos desde módulos incorrectos | Media | Bajo | index.ts debe re-exportar de types.ts (no de los módulos de implementación). Los consumidores de PD solo ven types. |
| **R4** | Dependencia externa a MemorySnapshot cambia | Baja | Alto | Memory está freeze (IM-1 completada). MemorySnapshot[19] no cambia. Si cambia, PD se actualiza en un solo punto (projection.ts + types.ts). |

---

## Sección 8: Veredicto

### 8.1 Resumen de hallazgos

| Verificación | Resultado |
|:-------------|:---------:|
| **Ciclos en el grafo** | ✅ No se detectan ciclos (ni en el grafo actual ni en el corregido) |
| **Inversión de dependencias** | ✅ No hay inversión. Todas las flechas apuntan de capas superiores a inferiores. |
| **Capas** | ✅ Correctas. Foundation → Entity → Data Access → Processing → State → Pipeline → Entry → Export. |
| **Acoplamiento** | ⚠️ Alto en orchestrator.ts (justificado). Alto en types.ts después de corrección (deseable — es un hub de tipos). |
| **Dependencias innecesarias** | ❌ **7 dependencias identificadas**, todas causadas por tipos definidos en módulos incorrectos. |

### 8.2 Condición para el veredicto

El grafo ACTUAL definido en PD-IM-0 tiene dependencias innecesarias, pero NO tiene ciclos ni inversiones. Funcionaría, pero es frágil.

La corrección es simple y UNIFICADA: **centralizar TODOS los tipos compartidos en `types.ts`**. Esto elimina 7 dependencias innecesarias de un solo movimiento.

### 8.3 Cambios requeridos en PD-IM-0 antes de PD-IM-1

| # | Cambio | Módulos afectados | Dependencias eliminadas |
|:-:|:-------|:-----------------|:----------------------:|
| 1 | Mover `ProjectedState`, `RelationCandidate`, `DetectionConfig` a types.ts | projection, detector, acceptance | detector → projection, acceptance → detector/projection |
| 2 | Mover `Invariant` a types.ts | invariant-catalog | acceptance → invariant-catalog, repository → invariant-catalog |
| 3 | Separar Pattern interface (types.ts) de Pattern class (pattern.ts) | pattern, acceptance, repository | acceptance → pattern, repository → pattern |
| 4 | Mover `PatternRepository`, `MemoryReadAdapter`, `WatermarkManager`, `PatternOrchestrator`, `AcceptanceEvaluator`, `RelationDetector`, `InvariantCatalog`, `ExecutionConfig`, `PatternRun`, `Candidate` a types.ts | orchestrator, pd-service, watermark, repository | watermark → repository, pd-service → watermark |
| 5 | Eliminar WatermarkManager del constructor de pd-service | pd-service | pd-service → watermark |

### 8.4 Veredicto

> ## DEPENDENCY REFACTOR REQUIRED
>
> **El grafo actual tiene 7 dependencias innecesarias causadas por tipos definidos en módulos incorrectos.**
>
> **No hay ciclos ni inversión de capas. La estructura fundamental del DAG es correcta.** Pero las dependencias entre módulos de implementación (acceptance→detector, acceptance→pattern, repository→pattern, etc.) crean acoplamiento que no debería existir.
>
> **Corrección requerida antes de PD-IM-1:** Centralizar todos los tipos compartidos en `types.ts`. Este es un cambio puramente estructural — no altera responsabilidades, contratos ni ontología. Una vez aplicado, el grafo queda limpio y ready for implementation.
>
> Después de la corrección, el grafo final es:
> - **0 ciclos**
> - **0 inversiones de dependencia**
> - **1 hub de tipos** (types.ts)
> - **1 punto de integración** (orchestrator.ts)
> - **0 dependencias entre módulos de implementación**

---

*Fin de IDA-1 — Internal Dependency Audit*
