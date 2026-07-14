# PR-12C / MCC-1 — Memory Contract Consolidation Audit

> **Auditor:** Arquitecto de Software Senior especializado en Design by Contract  
> **Propósito:** Determinar si toda la especificación contractual de Memory puede consolidarse en un único modelo consistente  
> **Metodología:** Reconstrucción de contratos distribuidos — extraer cada contrato de todos los documentos, verificar consistencia, identificar contradicciones  
> **Documentos auditados:** ADR-010 (010-memory-architecture.md), ADR-011 (011-reflection-elimination.md), ARCHITECTURE_MILESTONE_v3.0.md, ARCHITECTURE_STATUS.md, PR-7A…PR-7E, ARR-1 (ARR-1_MEMORY_READINESS.md), PR-12B (MPM-1)  
> **Fecha:** 2026-07-14

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Mapa completo de contratos](#2-mapa-completo-de-contratos)
3. [Contradicciones encontradas](#3-contradicciones-encontradas)
4. [Contratos ausentes](#4-contratos-ausentes)
5. [Recomendación de consolidación documental](#5-recomendación-de-consolidación-documental)
6. [Veredicto final](#6-veredicto-final)

---

## 1. Resumen ejecutivo

Se reconstruyeron los **5 contratos** que definen la arquitectura de Memory a partir de 8 documentos distribuidos. Se verificó la consistencia interna de cada contrato y la consistencia transversal entre contratos y documentos.

**Resultado: 6 contradicciones contractuales encontradas.** Ninguna es una diferencia menor de redacción. Todas son incompatibilidades reales entre reglas que un implementador no puede satisfacer simultáneamente.

Además, **3 de los 5 contratos no existen como especificación formal**: el Read Contract, el Projection Contract y el Identity Contract carecen de definición suficiente para guiar una implementación.

**Veredicto: REQUIERE CONSOLIDACIÓN CONTRACTUAL**

---

## 2. Mapa completo de contratos

### 2.1 Estructura de los 5 contratos

```
┌─────────────────────────────────────────────────────────────┐
│                     MEMORY CONTRACT                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────────┐                   │
│  │  WRITE        │───▶│  PERSISTENCE     │                   │
│  │  (C1-C10)     │    │  (M-1 a M-14)    │                   │
│  └──────────────┘    └────────┬─────────┘                   │
│                               │                             │
│                               ▼                             │
│  ┌──────────────┐    ┌──────────────────┐    ┌────────────┐ │
│  │  READ         │◀───│  PROJECTION      │◀───│  IDENTITY  │ │
│  │  (ausente)    │    │  (ausente)       │    │  (ausente) │ │
│  └──────────────┘    └──────────────────┘    └────────────┘ │
│                                                             │
│  Dependencias:                                               │
│  Write → Persistence (produce datos que Persistence almacena)│
│  Persistence → Read (almacena datos que Read recupera)       │
│  Read → Projection (recupera datos que Projection transforma)│
│  Identity → todos (subyace a escritura, persistencia, lectura)│
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Contrato 1 — Write Contract

| Aspecto | Especificación actual | Fuente |
|---------|----------------------|--------|
| **Responsabilidad** | Persistir estado cognitivo de un turno completado | ADR-010 §PR-5A (línea 40) |
| **Entry point** | `memoryService.store(belief, decision, conversationId)` | ADR-010 §PR-5C (líneas 301-304) |
| **Inputs** | Belief objeto, Decision objeto, conversationId string | ADR-010 C1 |
| **Guard** | `shadowResult.isComplete === true` | ADR-010 C2 |
| **Feature flag** | `COGNITIVE_MEMORY_ENABLED` (default false) | ADR-010 C6 |
| **Excepción** | Nunca lanza (try-catch interno) | ADR-010 C3 |
| **Bloqueo** | Fire-and-forget, nunca bloquea pipeline | ADR-010 C4 |
| **Importación** | No importa barrel de evidence; solo Belief y Decision types | ADR-010 C5 |
| **Entry point único** | `memoryService.store()` es el único punto de escritura | ADR-010 C7 |
| **Fuente de datos** | No lee de DB operacional | ADR-010 C8 |
| **ConversationId** | Usado exclusivamente como partition key | ADR-010 C9 |
| **Ubicación** | `src/lib/memory/memory-service.ts` | ADR-010 C10 |
| **Produce** | 1 snapshot por llamada exitosa | ADR-010 I5-MEM |

**Dependencias:** Belief + Decision types (importadas), conversationId (operacional, no de EE)

**Consumidores de este contrato:** El orquestador (`lead.service.ts`), a través de la zona de integración post-EE

### 2.3 Contrato 2 — Persistence Contract

| Aspecto | Especificación actual | Fuente |
|---------|----------------------|--------|
| **Responsabilidad** | Preservar el snapshot sin transformación, enriquecimiento ni inferencia | ADR-010 §PR-5A (línea 40) |
| **Unidad atómica** | Belief + Decision pair (ambos obligatorios) | ADR-010 §PR-5B (línea 137) |
| **Campos persistidos** | 19: 4 metadata + 8 Belief + 7 Decision | ADR-010 §PR-5B (líneas 141-173) |
| **Campos excluidos** | 14 de capas intermedias del EE | ADR-010 §PR-5B (líneas 199-214) |
| **Régimen** | Append-only | M-1 |
| **Inmutabilidad** | Una vez persistido, nunca cambia | M-5 |
| **Partición** | Solo conversationId como partition key | M-6 |
| **Monotonicidad** | turnNumber +1 por snapshot por conversación | M-7 |
| **Atomicidad** | Exactamente 1 Belief + 1 Decision por snapshot | M-8 |
| **Sin enriquecimiento** | Memory nunca agrega, deriva, transforma o infiere | M-9 |
| **Estabilidad de proyección** | Campos persistidos deben coincidir con EE al momento del snapshot | M-10 |
| **Sin estado operacional** | Memory no tiene estado interno, cache ni runtime | M-11 |
| **Sin defaults** | Todo campo del snapshot proviene de Belief o Decision | M-12 |
| **Sin precomputación** | Memory no computa diffs entre snapshots | M-13 |
| **Separación temporal** | storedAt ≠ receivedAt | M-14 |

**Dependencias:** Write Contract (produce los datos), Almacenamiento (abstracto)

**Consumidores de este contrato:** Read Contract

### 2.4 Contrato 3 — Read Contract

| Aspecto | Especificación actual | Fuente |
|---------|----------------------|--------|
| **Responsabilidad** | Servir snapshots a Pattern Discovery | ADR-010 §PR-5A (línea 41) |
| **Entrada** | `window` (no especificado) | ADR-010 §PR-5A (línea 57) |
| **Salida** | `MemorySnapshot[]` (según ADR-010) o `ProjectedState[]` (según Milestone) | Contradicción |
| **Método** | `PatternDiscovery.read(window)` — solo conceptual | ADR-010 §PR-5A (línea 57) |
| **Precondiciones semánticas** | 6 precondiciones (P1-ML a P6-ML) | PR-7D §Contrato 1 (líneas 81-87) |
| **Postcondiciones semánticas** | 4 postcondiciones (Q1-ML a Q4-ML) | PR-7D §Contrato 1 (líneas 89-96) |
| **Invariantes semánticos** | 4 invariantes (I1-ML a I4-ML) | PR-7D §Contrato 1 (líneas 98-105) |
| **Información obligatoria** | Secuencia ordenada, conversationId, turnNumber, storedAt | PR-7D §Contrato 1 (líneas 109-119) |
| **Causas de rechazo** | Ventana vacía, snapshot incompleto, turnNumber no monótono, conversationId ausente, snapshot no inmutable | PR-7D §Contrato 1 (líneas 130-138) |

**Ausencias críticas:**
- Sin firma de método definida (parámetros, tipos, retorno)
- Sin criterios de filtro especificados
- Sin paginación o límites
- Sin orden definido (ascendente/descendente)
- Sin proyección definida (19 o 11 campos)
- Sin interface que concrete las pre/postcondiciones semánticas

**Dependencias:** Persistence Contract

**Consumidores de este contrato:** Pattern Discovery (a través del Contrato 1 de PR-7D)

### 2.5 Contrato 4 — Projection Contract

| Aspecto | Especificación actual | Fuente |
|---------|----------------------|--------|
| **Responsabilidad** | Determinar qué campos del MemorySnapshot son visibles para Pattern Discovery | Implícito, no formalizado |
| **Entrada** | MemorySnapshot (19 campos) | ADR-010 |
| **Salida** | ¿ProjectedState (11 campos)? ¿MemorySnapshot (19)? | Contradicción |
| **Regla de proyección** | No definida | — |
| **Momento de proyección** | ¿Al escribir? ¿Al leer? | — |
| **Incluye** | No especificado | — |
| **Excluye** | No especificado (además de los 14 ya excluidos de EE) | — |

**Estado: CONTRATO AUSENTE.** Existe como concepto ontológico (ProjectedState aparece en Milestone v3.0 y ADR-011), pero no como especificación formal de qué campos se proyectan ni cómo.

**Dependencias:** Persistence Contract → Read Contract

**Consumidores de este contrato:** Pattern Discovery (recibe los datos proyectados)

### 2.6 Contrato 5 — Identity Contract

| Aspecto | Especificación actual | Fuente |
|---------|----------------------|--------|
| **Responsabilidad** | Definir identidad, unicidad, equivalencia y versionado de snapshots | Implícito, no formalizado |
| **Identificador primario** | memoryId (UUID v4, único por snapshot) | ADR-010 §PR-5B (línea 147) |
| **Identificador lógico** | (conversationId, turnNumber) — único dentro de una conversación | Derivado de M-6 + M-7 |
| **Equivalencia entre snapshots** | No definida. ¿Dos snapshots con mismos campos cognitivos son equivalentes? | — |
| **Versionado** | No existe. Los snapshots son inmutables (M-5). No hay versiones de un mismo snapshot. | M-5 |
| **Fusión/Resolución** | No definida. No hay merging. | — |
| **Reglas de reemplazo** | No definidas. Si un snapshot existe en (convId, turn), ¿se reemplaza o es error? | — |

**Estado: CONTRATO AUSENTE.** Las reglas de identidad están implícitas en los invariantes M-5, M-6 y M-7, pero no constituyen un contrato de identidad formal. No se definen equivalencias, reglas de reemplazo ni resolución de conflictos.

**Dependencias:** Todos los contratos

**Consumidores de este contrato:** Write Contract (genera identidad), Persistence Contract (preserva identidad), Read Contract (recupera por identidad), Projection Contract (proyecta identidad)

---

## 3. Contradicciones encontradas

### 3.1 Contradicción α — C9 vs. M-6 (Write vs. Read)

**Regla 1 (C9):**
> `conversationId` used EXCLUSIVELY as partition key — **never for sorting, filtering, or semantic lookup**.
> — ADR-010 §PR-5C, C9

**Regla 2 (M-6):**
> Partitioned by conversation — `conversationId` is the **sole partition key**.
> — ADR-010 §PR-5B, M-6

**Regla 3 (Read Contract, implícita de PR-7B §1.3):**
> La secuencia completa del sistema está **particionada por conversationId**.
> — PR-7B §1.3

**Regla 4 (PR-7D Contrato 1, P5-ML):**
> conversationId está **disponible como clave de partición**.
> — PR-7D §Contrato 1

**Naturaleza de la contradicción:**

C9 dice literalmente "never for **filtering**." Pero el Read Contract (y Pattern Discovery) necesita filtrar snapshots por conversationId para recuperar la ventana de una conversación específica. Sin filtrar por conversationId, Pattern Discovery recibe todos los snapshots de todas las conversaciones.

La palabra "filtering" en C9 es incompatible con la operación fundamental que Pattern Discovery realiza: seleccionar snapshots de una conversación.

**Posibles interpretaciones:**

| Interpretación | Problema |
|---------------|----------|
| "filtering" prohíbe filtrar → Read no puede usar conversationId | Read Contract no puede funcionar |
| "filtering" significa "no usar conversationId para filtros semánticos" | La redacción no hace esta distinción |
| C9 aplica solo al Write Contract | El texto no dice esto; está en C1-C10 |

**Impacto:** No es posible implementar simultáneamente C9 (no filtrar por conversationId) y M-6/PR-7B (particionar y consultar por conversationId).

---

### 3.2 Contradicción β — MemorySnapshot vs. ProjectedState (Read vs. Projection)

**Regla 1 (ADR-010, lifecycle):**
> PatternDiscovery.read(window) → **MemorySnapshot[]**
> — ADR-010 §PR-5A (línea 57)

**Regla 2 (Milestone v3.0, boundaries):**
> Memory produce **ProjectedState[]**. PD consume **ProjectedState[]**.
> — ARCHITECTURE_MILESTONE_v3.0 (líneas 189-190)

**Regla 3 (PR-7D Contrato 1, Q4-ML):**
> Los **11 campos analizables** están presentes en cada snapshot.
> — PR-7D §Contrato 1 (línea 96)

**Regla 4 (ADR-010, snapshot definition):**
> MemorySnapshot tiene **19 campos**: 4 metadata + 8 Belief + 7 Decision.
> — ADR-010 §PR-5B (líneas 141-173)

**Naturaleza de la contradicción:**

| Documento | Lo que Memory entrega | Campos |
|-----------|----------------------|--------|
| ADR-010 §PR-5A | MemorySnapshot[] | **19** |
| Milestone v3.0 (line 189) | ProjectedState[] | **11** |
| PR-7D Contrato 1 (Q4-ML) | Snapshot con 11 campos | **11** |

El mismo canal de comunicación (Memory → Pattern Discovery) está especificado con dos tipos diferentes y tres conteos diferentes. No es una diferencia de opinión: ADR-010 dice explícitamente MemorySnapshot (con 19 campos) y la Milestone dice explícitamente ProjectedState (con 11 campos). Ambos documentos describen el mismo flujo de datos.

**Impacto:** Un implementador no puede saber qué datos debe devolver el Read Contract. Si devuelve 19 campos, viola la Milestone y PR-7D. Si devuelve 11, viola ADR-010.

---

### 3.3 Contradicción γ — M-12 vs. los 3 campos Memory-generados (Persistence vs. sí mismo)

**Regla 1 (M-12):**
> **No defaults** — every field in the snapshot comes from Belief or Decision.
> — ADR-010 §PR-5B, M-12

**Regla 2 (Field belonging rules, items 2-4):**
> 2. `memoryId` — snapshot identifier (**generated by Memory**)
> 3. `turnNumber` — monotonic counter (**computed by Memory**)
> 4. `storedAt` — timestamp of storage action (**NOT receivedAt**)
> — ADR-010 §PR-5B (líneas 180-182)

**Regla 3 (Data flow, línea 335):**
> **Generates** memoryId + turnNumber + storedAt
> — ADR-010 §PR-5C (línea 335)

**Naturaleza de la contradicción:**

M-12 dice "todo campo proviene de Belief o Decision." El mismo documento declara que 3 campos son "generated by Memory," "computed by Memory," y "timestamp of storage action" — ninguno proviene de Belief o Decision. Es una contradicción directa entre un invariante y la definición del snapshot en el mismo documento.

**El documento reconoce implícitamente la contradicción** al listar los 3 campos como "pertenecientes" al snapshot (items 2-4 de 19) y simultáneamente afirmar que todo campo debe venir de Belief o Decision.

**Impacto:** Si M-12 se aplica estrictamente, memoryId, turnNumber y storedAt no pueden existir. Esto hace que el snapshot no tenga identidad, orden ni temporalidad. Memory no puede funcionar sin violar su propio invariante.

---

### 3.4 Contradicción δ — turnNumber sin fuente en el Write Contract (Write vs. Persistence)

**Regla 1 (C1):**
> Memory.store() receives ONLY `Belief` + `Decision` objects, NOT the full ShadowResult.
> — ADR-010 §PR-5C, C1

**Regla 2 (Parámetros de store, línea 301-304):**
> `memoryService.store( shadowResult.belief!, shadowResult.decision!, conversation.id )`
> — ADR-010 §PR-5C (líneas 301-304)

**Regla 3 (M-7):**
> turnNumber **increases by exactly 1** per snapshot per conversation.
> — ADR-010 §PR-5B, M-7

**Regla 4 (Field belonging, item 3):**
> turnNumber — monotonic counter (**computed by Memory**).
> — ADR-010 §PR-5B (línea 181)

**Naturaleza de la contradicción:**

El Write Contract especifica 3 parámetros: Belief, Decision, conversationId. Pero el Persistence Contract requiere turnNumber (exactamente +1). El mismo ADR dice que turnNumber es "computed by Memory." Pero:

1. **Memory no recibe turnNumber** en los parámetros de store() (C1)
2. **Memory no puede recibirlo del exterior** porque no está en los parámetros
3. **Memory no puede deducirlo de Belief o Decision** porque no está en esos objetos
4. **Memory debe calcularlo** de alguna fuente externa

La fuente de turnNumber puede ser:
- **(A)** Leer el último turnNumber del almacenamiento → Memory necesita un método de lectura interna
- **(B)** Mantener un contador en memoria → viola M-11 (no operational state)
- **(C)** Recibirlo como parámetro adicional → viola C1 (store recibe solo Belief + Decision + conversationId)
- **(D)** Derivarlo de un timestamp → viola M-7 (exactamente +1)

Ninguna opción es consistente con todos los invariantes.

**Impacto:** M-7 es un invariante que no puede satisfacerse dada la firma de store() definida en C1.

---

### 3.5 Contradicción ε — C9 y el rol del conversationId (Write vs. Identity)

**Regla 1 (C9):**
> `conversationId` used EXCLUSIVELY as partition key — **never for sorting, filtering, or semantic lookup**.
> — ADR-010 §PR-5C, C9

**Regla 2 (Snapshot definition, línea 144):**
> `conversationId: string` — **Partition key** (not semantic).
> — ADR-010 §PR-5B (línea 143-144)

**Regla 3 (Snapshot definition, línea 158):**
> `belief.conversationId: string | null` — from EE (original conversation).
> — ADR-010 §PR-5B (línea 158)

**Naturaleza de la contradicción:**

El snapshot contiene **dos** conversationIds:

| Campo | Tipo | Fuente | Rol | ¿Nullable? |
|-------|------|--------|-----|-----------|
| `conversationId` (raíz) | `string` | Operacional (`conversation.id`) | Partition key | No |
| `belief.conversationId` (dentro de belief) | `string \| null` | EE (desde Knowledge) | Contenido cognitivo | Sí |

C9 regula el primero, pero su redacción ("conversationId") es ambigua. No distingue si la restricción aplica a ambos o solo al de partición. Un implementador podría:

- Aplicar C9 al partition key → lo aísla, no permite filtros semánticos → correcto
- Aplicar C9 a ambos → belief.conversationId no puede usarse para lookup semántico → incorrecto (es un campo cognitivo)

Además, C9 dice "never for sorting" pero M-7 requiere sorting por turnNumber. No está claro si C9 intenta decir "no ordenes por conversationId" o "no ordenes por ningún campo."

**Impacto:** La ambigüedad entre los dos conversationIds combinada con la prohibición genérica de C9 puede llevar a implementaciones incorrectas.

---

### 3.6 Contradicción ζ — Pipeline futuro inconsistente entre ADR-009 y ADR-010/011 (Herencia documental)

**Regla 1 (ADR-009 §7 — NO actualizado):**
```
Memory → Reflection → Learning → Goals → Planning
```
— ADR-009 §7 (no actualizado desde ADR-011)

**Regla 2 (ADR-011 §4.1 — actualizado):**
```
EE → Memory → Pattern Discovery
```
— ADR-011 §4.1 (líneas 171-174)

**Regla 3 (ADR-010 §PR-5A — actualizado):**
> Primary consumers: **Pattern Discovery** (futuro)
> — ADR-010 §PR-5A (línea 41)

**Regla 4 (ARCHITECTURE_MILESTONE_v3.0 — actualizado):**
```
Memory → Pattern Discovery
```
— ARCHITECTURE_MILESTONE_v3.0 (línea 190)

**Naturaleza de la contradicción:**

ADR-009 (Evidence Engine Architecture) es el documento fundacional del que Memory depende. Su §7 describe las capas futuras como incluyendo Reflection, Learning (operacional), Goals y Planning. Pero:

- **ADR-011** eliminó Reflection como capa cognitiva (línea 139: "Reflection deja de existir como capa arquitectónica")
- **ADR-011** estableció que el pipeline futuro es EE → Memory → Pattern Discovery (línea 172)
- **PR-8/PR-9** eliminaron Goals y Planning como capas cognitivas

ADR-009 §7 **no fue actualizado.** ADR-011 §4.2 (líneas 183-191) documenta que ADR-009 §7 "se actualiza" pero el archivo en disco (`009-evidence-engine-architecture.md`) retiene el pipeline original.

**Impacto:** Un implementador que consulte ADR-009 (documento fundacional) diseñará Memory asumiendo que existen Reflection, Learning, Goals y Planning como consumidores. Esto lleva a sobrediseño o diseño incompatible con el pipeline real.

---

### 3.7 Resumen de contradicciones

| ID | Contrato A | Contrato B | Naturaleza | Severidad | Documentos involucrados |
|----|-----------|-----------|------------|-----------|------------------------|
| **α** | Write (C9) | Read (M-6, PR-7B) | C9 prohíbe filtrar por conversationId; Read necesita filtrar por conversationId | 🔴 Crítica | ADR-010, PR-7B, PR-7D |
| **β** | Read (ADR-010) | Projection (Milestone v3.0) | Read devuelve MemorySnapshot[19]; Projection espera ProjectedState[11] | 🔴 Crítica | ADR-010, Milestone v3.0, PR-7B, PR-7D |
| **γ** | Persistence (M-12) | Persistence (definición) | M-12: "todo de Belief/Decision"; 3 campos son Memory-generated | 🔴 Crítica | ADR-010 |
| **δ** | Write (C1) | Persistence (M-7) | store() no recibe turnNumber; M-7 requiere turnNumber | 🟠 Alta | ADR-010 |
| **ε** | Write (C9) | Identity (implícita) | Dos conversationIds, C9 no distingue cuál regula | 🟡 Media | ADR-010 |
| **ζ** | ADR-009 §7 (legado) | ADR-011 §4.1 (vigente) | Pipeline futuro distinto entre documento fundacional y documentos derivados | 🟡 Media | ADR-009, ADR-011, Milestone v3.0 |

---

## 4. Contratos ausentes

### 4.1 Estado de completitud por contrato

| Contrato | Estado | Fragmentos existentes |
|----------|--------|----------------------|
| **Write Contract** | 🟡 Incompleto | C1-C10 definidos, pero turnNumber no tiene fuente (contradicción δ) |
| **Persistence Contract** | 🟡 Incompleto | M-1 a M-14 definidos, pero M-12 es autocontradictorio (contradicción γ) |
| **Read Contract** | 🔴 **AUSENTE** | Solo línea conceptual + pre/postcondiciones semánticas sin interfaz concreta |
| **Projection Contract** | 🔴 **AUSENTE** | Concepto ontológico (ProjectedState) existe, pero especificación de proyección 19→11 es inexistente |
| **Identity Contract** | 🔴 **AUSENTE** | memoryId existe como identificador, pero no hay reglas formales de identidad, equivalencia, versionado o reemplazo |

### 4.2 Especificación de lo que falta

#### Read Contract — Elementos mínimos requeridos

| Elemento | Estado actual |
|----------|--------------|
| Firma del método `read()` o `getSnapshots()` | ❌ Ausente |
| Parámetros de consulta (conversationId obligatorio; rango de turnNumber opcional; límite opcional) | ❌ Ausente |
| Tipo de retorno: ¿MemorySnapshot[] o ProjectedState[]? | ❌ Contradicción β |
| Ordenamiento (ascendente por defecto) | ❌ Ausente |
| Paginación (límite máximo, offset, cursor) | ❌ Ausente |
| Proyección permitida (¿campos completos? ¿subconjunto?) | ❌ Ausente |
| Política de error (snapshots no encontrados, conversationId inválido, etc.) | ❌ Ausente |

#### Projection Contract — Elementos mínimos requeridos

| Elemento | Estado actual |
|----------|--------------|
| Lista de los 11 campos que constituyen ProjectedState | ❌ Ausente (solo inferible) |
| Regla de proyección MemorySnapshot → ProjectedState | ❌ Ausente |
| Momento de proyección (¿write-time? ¿read-time? ¿en Memory? ¿en Pattern Discovery?) | ❌ Ausente |
| Invariantes de la proyección (¿pérdida de información aceptada? ¿biyectividad?) | ❌ Ausente |

#### Identity Contract — Elementos mínimos requeridos

| Elemento | Estado actual |
|----------|--------------|
| Identidad primaria (memoryId es UUID único, pero no hay regla de garantía) | 🟡 Implícito |
| Identidad lógica ((conversationId, turnNumber) es único, pero no formalizado) | 🟡 Implícito |
| Equivalencia entre snapshots (¿cuándo dos snapshots son el mismo?) | ❌ Ausente |
| Reglas de reemplazo (¿el snapshot en (convId, turn) puede reemplazarse?) | ❌ Ausente |
| Reglas de versionado (¿existe versionado? ¿cómo se detectan cambios?) | ❌ Ausente |
| Reglas de merge/fusión (¿qué pasa si dos fuentes producen el mismo turn?) | ❌ Ausente |

---

## 5. Recomendación de consolidación documental

### 5.1 Estructura documental mínima

Para que la arquitectura de Memory sea contractualmente consistente, se recomienda:

```
Architecture of Memory — Contrato Unificado
├── 1. Write Contract (C1-C10, actualizado)
│   ├── Firma: store(belief, decision, conversationId, [turnNumber?])
│   ├── Guards: isComplete + feature flag
│   ├── Invariantes: C1-C10 + (nuevo: fuente de turnNumber)
│   └── Contradicciones resueltas: δ, γ, ε
│
├── 2. Persistence Contract (M-1 a M-14, corregido)
│   ├── M-12 actualizado: excepción explícita para metadata
│   ├── M-7 refinado: fuente y valor inicial de turnNumber
│   └── Contradicciones resueltas: γ, δ
│
├── 3. Read Contract (NUEVO)
│   ├── Firma: readSnapshots(conversationId, options?)
│   ├── Retorno: MemorySnapshot[] o ProjectedState[] (UNIFICAR con β)
│   ├── Filtros: por conversationId (obligatorio), rango turnNumber (opcional)
│   ├── Límites: máximo por consulta, paginación
│   ├── Orden: ascendente por turnNumber
│   └── Contradicciones resueltas: α, β
│
├── 4. Projection Contract (NUEVO)
│   ├── Definición de ProjectedState: lista explícita de los 11 campos
│   ├── Regla de proyección 19→11
│   ├── Invariantes de la proyección
│   └── Contradicciones resueltas: β
│
└── 5. Identity Contract (NUEVO)
    ├── Identidad primaria: memoryId (UUID v4, único)
    ├── Identidad lógica: (conversationId, turnNumber)
    ├── Reglas de equivalencia
    ├── Reglas de reemplazo (no existe reemplazo, es append-only)
    ├── Reglas de versionado (no existe versionado en modelo mínimo)
    └── Contradicciones resueltas: ε
```

### 5.2 Correcciones documentales requeridas

| Documento | Corrección | Contradicción resuelta |
|-----------|-----------|------------------------|
| **ADR-010** | Corregir M-12 (excepción para metadata) | γ |
| **ADR-010** | Especificar fuente de turnNumber y valor inicial en M-7 | δ |
| **ADR-010** | Unificar el contrato de lectura: definir interfaz Read | α, β |
| **ADR-010** | Resolver C9: aclarar que partition key NO prohíbe consultas por partición | α, ε |
| **ADR-010** | Distinguir explícitamente los dos conversationIds (partition key vs. belief.conversationId) | ε |
| **ADR-010** | Corregir conteos de campos (8 Belief, 7 Decision, 19 total) | β |
| **ADR-010** | Agregar Projection Contract y definir los 11 campos del ProjectedState | β |
| **ADR-010** | Agregar Identity Contract formal | ε |
| **ADR-009 §7** | Actualizar al pipeline vigente: EE → Memory → Pattern Discovery | ζ |
| **Milestone v3.0** | Unificar terminología: MemorySnapshot vs ProjectedState | β |

### 5.3 Prioridad de consolidación

| Orden | Contrato | Depende de | Acción |
|-------|----------|-----------|--------|
| 1 | Persistence (M-12) | — | Corregir M-12 (ARR-1 B1, MPM-1 D6) |
| 2 | Projection | Persistence | Definir los 11 campos del ProjectedState y la proyección 19→11 (MPM-1 D1) |
| 3 | Read | Projection | Definir interfaz concreta de consulta (ARR-1 B2, MPM-1 D5) |
| 4 | Write | Persistence, Read | Actualizar C1-C10: resolver turnNumber (MPM-1 D3+D4), resolver C9 (MPM-1 D7) |
| 5 | Identity | Todos | Formalizar reglas de identidad de snapshot |
| 6 | Documental | Todos | Actualizar ADR-009 §7, unificar terminología entre documentos |

---

## 6. Veredicto final

### REQUIERE CONSOLIDACIÓN CONTRACTUAL

**Justificación:**

La arquitectura de Memory está especificada en **8 documentos** que contienen **5 contratos** distribuidos. De esos 5 contratos:

| Contrato | Estado | ¿Puede implementarse? |
|----------|--------|----------------------|
| **Write Contract** | 🟡 Incompleto | No — turnNumber sin fuente (δ) |
| **Persistence Contract** | 🟡 Incompleto | No — M-12 contradictorio (γ) |
| **Read Contract** | 🔴 Ausente | No — no hay interfaz definida (α, β) |
| **Projection Contract** | 🔴 Ausente | No — proyección 19→11 no especificada (β) |
| **Identity Contract** | 🔴 Ausente | No — no hay reglas formales (ε) |

Se verificaron **6 contradicciones contractuales**, de las cuales **2 son críticas** (α y β) porque impiden determinar qué datos fluyen entre Memory y Pattern Discovery, y **2 son graves** (γ y δ) porque hacen que invariantes sean imposibles de satisfacer simultáneamente.

**Ninguno de los 5 contratos puede implementarse de forma aislada sin resolver al menos una contradicción.** Y ningún contrato puede implementarse en conjunto con los demás sin resolver las 6 contradicciones.

**La dispersión documental no es el problema principal.** El problema es que los contratos, tal como están definidos, son **incompatibles entre sí**. No es una cuestión de juntar documentos en un solo archivo — es una cuestión de resolver contradicciones lógicas entre reglas.

### Desglose por tipo de problema

| Tipo | Cantidad | Descripción |
|------|----------|-------------|
| Contratos ausentes | 3 (Read, Projection, Identity) | No existe especificación suficiente para implementar |
| Contratos incompletos | 2 (Write, Persistence) | Existen pero tienen contradicciones internas |
| Contradicciones cross-document | 4 (α, β, ε, ζ) | Dos documentos dicen cosas diferentes sobre el mismo aspecto |
| Contradicciones intra-document | 2 (γ, δ) | El mismo documento se contradice a sí mismo |

### Camino a la consistencia contractual

Se requieren **6 acciones** para alcanzar un estado contractualmente consistente:

1. **Corregir M-12** (ADR-010) — agregar excepción para metadata
2. **Definir ProjectedState** (ADR-010) — lista explícita de 11 campos y proyección 19→11
3. **Definir Read Contract** (ADR-010) — interfaz concreta con parámetros, retorno, paginación
4. **Resolver turnNumber** (ADR-010) — fuente y valor inicial en M-7; actualizar C1 si es necesario
5. **Resolver C9** (ADR-010) — aclarar que partition key puede usarse para consultas por partición; distinguir los dos conversationIds
6. **Actualizar ADR-009 §7** — reflejar el pipeline vigente

Después de estas 6 correcciones, todos los contratos de Memory pueden expresarse en un único documento (ADR-010) con 5 sub-contratos consistentes.

---

*Fin de PR-12C / MCC-1 — Memory Contract Consolidation Audit*
