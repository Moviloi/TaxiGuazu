# PR-12D / MCR-1 — Memory Contract Resolution Audit

> **Auditor:** Arquitecto de Software Senior especializado en resolución de contradicciones arquitectónicas  
> **Propósito:** Determinar si las 6 contradicciones contractuales identificadas en PR-12C pueden resolverse preservando la ontología de Memory  
> **Metodología:** Análisis de cada contradicción contra la ontología, ADR invariantes y contratos existentes  
> **Documentos auditados:** ADR-010, ADR-011, ARCHITECTURE_MILESTONE_v3.0, PR-7B, PR-7D, PR-12C (MCC-1)  
> **Fecha:** 2026-07-14

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Análisis por contradicción](#2-análisis-por-contradicción)
   - [α — C9 vs. M-6 / PR-7B](#α--c9-no-filtrar-por-conversationid-vs-m-6particionar-por-conversationid)
   - [β — MemorySnapshot vs. ProjectedState](#β--memorysnapshot-19-campos-vs-projectedstate-11-campos)
   - [γ — M-12 vs. 3 campos Memory-generados](#γ--m-12-sin-defaults-vs-campos-memory-generados)
   - [δ — turnNumber sin fuente en Write Contract](#δ--turnnumber-sin-fuente-en-el-write-contract)
   - [ε — C9 y dos conversationIds](#ε--c9-y-dos-conversationids)
   - [ζ — ADR-009 §7 vs. pipeline vigente](#ζ--adr-009-7-desactualizado-vs-pipeline-vigente)
3. [Matriz de resolución](#3-matriz-de-resolución)
4. [Veredicto final](#4-veredicto-final)

---

## 1. Resumen ejecutivo

Se analizaron las **6 contradicciones contractuales** identificadas en PR-12C/MCC-1. Se evaluó cada una contra 5 criterios:

1. ¿Contradicción real o ambigüedad?
2. ¿Resoluble modificando solo contratos/documentación?
3. ¿Requiere modificar la ontología de Memory?
4. ¿Requiere modificar otra capa?
5. ¿Puede resolverse sin afectar ADR-010?

**Resultado:** Las 6 contradicciones se resuelven mediante normalización contractual. Ninguna requiere modificar la ontología de Memory, añadir nuevas capas, alterar invariantes del EE ni cambiar responsabilidades fundamentales.

**Diagnóstico general:**

| Tipo | Cantidad | Contradicciones |
|------|----------|-----------------|
| Ambigüedad documental | 2 | α, δ |
| Contradicción contractual | 1 | β |
| Error documental | 3 | γ, ε, ζ |
| Deficiencia ontológica | 0 | — |

**Veredicto: SÍ, mediante normalización contractual.**

---

## 2. Análisis por contradicción

### α — C9 (no filtrar por conversationId) vs. M-6 (particionar por conversationId)

#### Enunciado

| Regla | Texto | Fuente |
|-------|-------|--------|
| C9 | `conversationId` used EXCLUSIVELY as partition key — **never for sorting, filtering, or semantic lookup** | ADR-010 §PR-5C (línea 355) |
| M-6 | Partitioned by conversation — `conversationId` is the **sole partition key** | ADR-010 §PR-5B (línea 244) |
| PR-7B §1.3 | La secuencia completa del sistema está **particionada por conversationId** | PR-7B §1.3 |
| PR-7D, P5-ML | conversationId está **disponible como clave de partición** | PR-7D §Contrato 1 (línea 86) |

#### Análisis

C9 dice "never for filtering." Pero una clave de partición existe precisamente para permitir consultas por ese identificador. Sin filtrar por `conversationId`, no es posible recuperar snapshots de una conversación específica, que es la operación fundamental que Pattern Discovery necesita (PR-7B §1.3).

El conflicto es entre la **intención** de C9 y su **redacción**. La intención es clara: "no uses el ID operacional `conversationId` para derivar significado cognitivo." Es un ID opaco, un token de partición. Pero la palabra "filtering" convierte una restricción sensata en una prohibición imposible.

**Prueba de intención:** ADR-010 §PR-5A (línea 143-144) dice:
> `conversationId: string` — Partition key (**not semantic**).

La frase "(not semantic)" revela la intención real: proteger el partition key de ser tratado como contenido cognitivo. No prohibir su uso para lo que toda partition key existe: recuperar datos de esa partición.

#### Diagnóstico

**Ambigüedad documental.** No es una contradicción real entre reglas — es una restricción mal redactada. C9 es excesivamente amplia e incluye "filtering" que contradice la naturaleza misma de una partition key.

#### Resolución

**Acción mínima:** Reescribir C9 para clarificar su intención real.

**Propuesta:**

> **C9** — The partition key `conversationId` (an operational opaque identifier) is used for data isolation. It MAY be used for partition-based queries (filtering by conversation, ordering by conversation). It MUST NOT be used for **semantic analysis, cognitive pattern extraction, or deriving meaning** about the conversation's content.

**Impacto:**
- Ontología de Memory: ✅ Sin cambios
- ADR-010: ✅ Modificación local de C9
- Otras capas: ✅ Sin impacto
- ADR invariantes: ✅ M-6 preservado
- Dependencias: ✅ Sin cambios en PR-7B, PR-7D

---

### β — MemorySnapshot (19 campos) vs. ProjectedState (11 campos)

#### Enunciado

| Regla | Texto | Fuente |
|-------|-------|--------|
| R1 | `PatternDiscovery.read(window) → **MemorySnapshot[]**` (19 campos) | ADR-010 §PR-5A (línea 62) |
| R2 | **Memory produce ProjectedState[].** PD consume ProjectedState[]. | Milestone v3.0 (líneas 189-190) |
| R3 | Pattern Discovery input: **ProjectedState[] desde Memory (11 campos analizables)** | Milestone v3.0 (línea 172) |
| R4 | **11 campos analizables** están presentes en cada snapshot | PR-7D §Contrato 1 (línea 96) |
| R5 | MemorySnapshot persistido con **19 campos (11 de Belief + 8 de Decision + metadatos)** | Milestone v3.0 (línea 159) |

#### Análisis

Este es el caso más complejo porque hay **tres afirmaciones aparentemente incompatibles** sobre el mismo flujo de datos:

| Afirmación | Qué Memory entrega | Campos |
|-----------|-------------------|--------|
| ADR-010 línea 62 | MemorySnapshot[] | 19 |
| Milestone v3.0 líneas 189-190 | ProjectedState[] | 11 |
| PR-7D Q4-ML | snapshot con 11 campos | 11 |

**Sin embargo,** estas afirmaciones NO son necesariamente contradictorias. Dependen de cómo se interprete "11 campos analizables":

- **Interpretación A:** "El snapshot contiene exactamente 11 campos" → Contradice ADR-010 (19 campos)
- **Interpretación B:** "El snapshot contiene campos, de los cuales 11 son analizables por Pattern Discovery" → Compatible con ADR-010 (19 campos total, 11 analizables)

La Milestone v3.0 apoya la Interpretación B: en su línea 159 dice "MemorySnapshot persistido con 19 campos" y en su línea 172 dice "Input: ProjectedState[] desde Memory (11 campos analizables)." Son dos afirmaciones en el mismo documento — describe el almacenamiento (19) y el consumo (11) como dos vistas diferentes del mismo dato.

**ADVERTENCIA:** La línea 189-190 del mismo documento dice "Memory produce ProjectedState[]." Si se lee literalmente, significaría que Memory NO produce MemorySnapshot[], sino ProjectedState[]. Esto contradice la línea 159 que dice Memory produce MemorySnapshot. **Dentro del mismo documento hay inconsistencia.**

Reconciliación posible: "Memory produce X para Y" donde:
- Para persistencia: MemorySnapshot (19 campos)
- Para consumo de PD: ProjectedState (los 11 campos analizables dentro del MemorySnapshot)

Esto requiere que la línea 189-190 se reinterprete como "Memory entrega ProjectedState[] a PD" — donde ProjectedState NO es un tipo distinto, sino la **vista analizable** del MemorySnapshot.

#### Diagnóstico

**Contradicción contractual.** No es ambigüedad: el Milestone v3.0 da dos respuestas contradictorias sobre qué entrega Memory (línea 159 vs. línea 189). ADR-010 da una tercera respuesta. Las contradicciones son reales pero resolubles sin cambio ontológico.

#### Resolución

**Acción mínima:** 

1. **En ADR-010:** El lifecycle (línea 62) se actualiza para especificar el tipo de retorno exacto de `read()`. Si `read()` retorna MemorySnapshot[] (19 campos), documentar que Pattern Discovery analiza un subconjunto de 11 campos. Esto es simple y preserva la información completa.

2. **En Milestone v3.0 (línea 189-190):** Cambiar "Memory produce ProjectedState[]" por "Memory produce MemorySnapshot[] (19 campos); Pattern Discovery analiza 11 campos analizables del snapshot."

3. **En PR-7B §1.1:** Cambiar "espacio producto de 11 campos analizables" por "espacio producto de 19 campos (11 analizables)."

4. **En PR-7D Q4-ML:** Cambiar "Los 11 campos analizables están presentes en cada snapshot" por "Los 11 campos analizables son un subconjunto de los 19 campos del MemorySnapshot."

**No se requiere crear un nuevo tipo ProjectedState.** Puede documentarse como "los campos analizables del MemorySnapshot" sin crear una estructura separada.

**Impacto:**
- Ontología de Memory: ✅ Sin cambios (MemorySnapshot preservado)
- ADR-010: ✅ Modificación local de lifecycle y referencias
- Otras capas: ✅ Cambios menores en PR-7B/PR-7D (actualizar referencias de 11→19 con subconjunto)
- ADR invariantes: ✅ M-10 preservado (projection stability = persistir los 19, analizar 11)
- Dependencias: ✅ PR-7B/PR-7D actualizaciones cosméticas

---

### γ — M-12 (sin defaults) vs. campos Memory-generados

#### Enunciado

| Regla | Texto | Fuente |
|-------|-------|--------|
| M-12 | **No defaults** — every field in the snapshot comes from Belief or Decision | ADR-010 §PR-5B (línea 246) |
| Item 2 | `memoryId` — snapshot identifier (**generated by Memory**) | ADR-010 §PR-5B (línea 180) |
| Item 3 | `turnNumber` — monotonic counter (**computed by Memory**) | ADR-010 §PR-5B (línea 181) |
| Item 4 | `storedAt` — timestamp of storage action | ADR-010 §PR-5B (línea 182) |
| Data flow (línea 335) | **Generates** memoryId + turnNumber + storedAt | ADR-010 §PR-5C (línea 335) |

#### Análisis

M-12 fue diseñado para evitar que Memory invente contenido cognitivo sintético. Su intención es: "no agregues campos cognitivos que no provengan del EE." Pero su redacción es tan amplia que prohíbe incluso los campos de metadata que Memory NECESITA generar para que el snapshot tenga identidad, orden y temporalidad.

**Contraejemplo:** memoryId es un UUID. Prohibir que Memory lo genere sería absurdo — el Belief no tiene un memoryId. Solo Memory sabe qué ID asignar a cada snapshot.

M-12 es un **invariante mal redactado**: su intención es correcta, su alcance es incorrecto.

**Prueba de intención:** El mismo ADR-010 incluye los 3 campos en la definición del snapshot y en la lista de "field belonging rules" (items 2-4 de 19) y dice explícitamente que Memory los genera (línea 335: "Generates memoryId + turnNumber + storedAt"). No hay intención de excluirlos. Solo M-12 no refleja esa intención.

#### Diagnóstico

**Error documental.** M-12 no captura correctamente la restricción que pretende imponer. No es una contradicción ontológica — es un error de especificación.

#### Resolución

**Acción mínima:** Reescribir M-12 para exceptuar explícitamente los campos de metadata.

**Propuesta (idéntica a la de ARR-1 §5.1 paso 1):**

> **M-12 — No default cognitive values.** Every cognitive field in the snapshot must originate from Belief or Decision. Memory-generated metadata fields (`memoryId`, `turnNumber`, `storedAt`) are excluded from this rule.

**Impacto:**
- Ontología de Memory: ✅ Sin cambios
- ADR-010: ✅ Modificación local de M-12
- Otras capas: ✅ Sin impacto
- ADR invariantes: ✅ M-12 preservado conceptualmente, corregido en alcance
- Dependencias: ✅ Sin cambios

---

### δ — turnNumber sin fuente en el Write Contract

#### Enunciado

| Regla | Texto | Fuente |
|-------|-------|--------|
| C1 | store() recibe **solo** Belief + Decision + conversationId | ADR-010 §PR-5C (línea 347) |
| M-7 | turnNumber **increases by exactly 1** per snapshot per conversation | ADR-010 §PR-5B (línea 245) |
| Dato | store() llamado con `store(belief, decision, conversation.id)` — 3 parámetros | ADR-010 §PR-5C (líneas 301-304) |
| Línea 335 | **Generates** memoryId + turnNumber + storedAt | ADR-010 §PR-5C (línea 335) |
| Ítem 3 | turnNumber — monotonic counter (**computed by Memory**) | ADR-010 §PR-5B (línea 181) |

#### Análisis

M-7 requiere que turnNumber exista y aumente en +1. C1 no lo incluye como parámetro. Pero el propio ADR-010 dice que Memory lo **genera** (línea 335) y lo **computa** (línea 181). No hay contradicción si Memory puede computar turnNumber internamente.

La pregunta es: ¿cómo computa Memory el turnNumber sin violar M-11 (no operational state)?

**Opción A — Leer del almacenamiento:** Memory lee el último snapshot almacenado para esa conversación, obtiene su turnNumber, y suma 1. Esto NO viola M-11 porque M-11 prohíbe "estado interno, cache o runtime" — no prohíbe leer el propio almacenamiento. Leer de la base de datos no es "estado interno."

**Opción B — Contador en memoria:** Memory mantiene un Map<conversationId, number> en memoria. Esto violaría M-11 si se interpreta estrictamente ("no operational state").

**Opción C — Parámetro externo:** El orquestador (lead.service.ts) pasa turnNumber como cuarto parámetro. Esto requeriría modificar C1.

**Opción A es la correcta.** Es la única que:
- Preserva M-11 (no operational state = no cache en memoria)
- Satisface M-7 (+1 exacto)
- No modifica C1 (store() recibe solo 3 parámetros)
- Es consistente con "computed by Memory" y "Generates"

El primer snapshot de una conversación debe tener turnNumber = 1. PR-7B §1.2 asume `turnNumber(sᵢ) = i`, confirmando que el primer snapshot es 1 (no 0).

M-2 dice "Read-only during EE execution — Memory is not queried while the pipeline runs." Pero la escritura ocurre DESPUÉS del EE (ADR-010 §PR-5C, línea 316: "AFTER runShadowCognition() completes"). Memory leer su propio almacenamiento para computar turnNumber durante la escritura es un acceso interno post-EE, no una consulta durante el pipeline. No viola M-2.

#### Diagnóstico

**Ambigüedad documental.** No hay contradicción real entre C1 y M-7 — hay una omisión de especificación sobre el mecanismo de cómputo de turnNumber. ADR-010 ya establece que Memory "genera" y "computa" turnNumber internamente (líneas 181, 335). Solo falta detallar el mecanismo.

#### Resolución

**Acción mínima:** Agregar la especificación del mecanismo de turnNumber en ADR-010.

**Propuesta:**

Agregar en M-7 (o en la descripción del data flow, después de línea 341):

> **M-7 (refinado):** turnNumber is computed by Memory at write time. For each conversation:
>   - The first snapshot receives `turnNumber = 1`.
>   - Each subsequent snapshot receives `turnNumber = lastTurnNumber + 1`.
>   - Memory determines `lastTurnNumber` by reading the most recent snapshot for that `conversationId` from its own storage.
>   - This read is internal to Memory's write operation and occurs AFTER the EE pipeline has completed (M-2 not applicable).

**Impacto:**
- Ontología de Memory: ✅ Sin cambios
- ADR-010: ✅ Refinamiento de M-7 + especificación del mecanismo
- Otras capas: ✅ Sin impacto
- ADR invariantes: ✅ M-7 refinado, M-11 preservado (no operational state = no cache), M-2 preservado (lectura post-EE)
- Dependencias: ✅ Sin cambios

---

### ε — C9 y dos conversationIds

#### Enunciado

| Regla | Texto | Fuente |
|-------|-------|--------|
| C9 | `conversationId` used EXCLUSIVELY as partition key — never for sorting, filtering, or semantic lookup | ADR-010 §PR-5C (línea 355) |
| Snapshot raíz | `conversationId: string` — partition key (from operational) | ADR-010 §PR-5B (línea 144) |
| Snapshot belief | `belief.conversationId: string \| null` — from EE (original conversation) | ADR-010 §PR-5B (línea 158) |

#### Análisis

El snapshot contiene dos campos con el mismo nombre base "conversationId" pero roles fundamentalmente diferentes:

| Campo | Tipo | Fuente | Rol | Nullable |
|-------|------|--------|-----|----------|
| `conversationId` (raíz) | `string` | Operacional `conversation.id` | Partition key | No |
| `belief.conversationId` | `string \| null` | EE (desde Knowledge) | Contenido cognitivo | Sí |

C9 regula "conversationId" sin calificar. Por contexto, debería referirse al partition key (el de la raíz), no a `belief.conversationId`. Pero:

1. **No es explícito**: La redacción no dice "the partition key `conversationId`" — dice "`conversationId`" que existe en dos lugares.
2. **Creíble aplicar al otro**: Un implementador podría pensar que C9 también protege a `belief.conversationId` de ser usado como clave de ordenamiento o filtro semántico — pero este campo SÍ es contenido cognitivo que Pattern Discovery podría necesitar analizar.

**La restricción correcta:** El partition key (raíz) es opaco y no debe usarse para análisis semántico. `belief.conversationId` es un campo cognitivo y debe tratarse como cualquier otro campo de Belief.

#### Diagnóstico

**Error documental.** C9 no especifica a qué `conversationId` se refiere. Hay dos candidatos en el mismo snapshot.

#### Resolución

**Acción mínima:** Clarificar en C9 que la restricción aplica al partition key, no a `belief.conversationId`.

**Propuesta:**

> **C9** — The partition key `conversationId` (operational identifier, received from the orchestrator) is used EXCLUSIVELY as partition key for data isolation. It must NOT be used for semantic analysis or cognitive pattern extraction. This restriction does NOT apply to `belief.conversationId`, which is a cognitive field that Pattern Discovery may analyze.

Adicionalmente, en la definición del snapshot (línea 144), renombrar el campo raíz para distinguirlo explícitamente:

> `partitionKey: string` — Partition key (operational conversation.id, not cognitive)

Esto elimina la ambigüedad onomástica. Si renombrar es demasiado disruptivo, al menos la documentación debe distinguirlos explícitamente.

**Impacto:**
- Ontología de Memory: ✅ Sin cambios ontológicos (campo renombrado en documentación, no en contrato)
- ADR-010: ✅ Clarificación de C9 + opcional renombre del campo raíz en documentación
- Otras capas: ✅ Sin impacto
- ADR invariantes: ✅ M-6 preservado (partition key sigue siendo conversationId)
- Dependencias: ✅ Sin cambios

---

### ζ — ADR-009 §7 desactualizado vs. pipeline vigente

#### Enunciado

| Regla | Texto | Fuente |
|-------|-------|--------|
| Pipeline en ADR-009 §7 | `Memory → **Reflection → Learning → Goals → Planning**` | ADR-009 §7 |
| Pipeline en ADR-011 §4.1 | `EE → Memory → **Pattern Discovery**` | ADR-011 §4.1 (líneas 171-174) |
| ADR-011 §4.2 | La tabla de capas futuras en ADR-009 §7 **se actualiza** | ADR-011 §4.2 (líneas 183-191) |

#### Análisis

ADR-011 §4.2 documenta explícitamente los cambios que deben aplicarse a ADR-009 §7:
- Eliminar la fila "Reflection"
- Pattern Discovery pasa a ser el sucesor inmediato de Memory
- Actualizar descripción de Pattern Discovery

**Estos cambios nunca se aplicaron al archivo** `009-evidence-engine-architecture.md` en disco.

No hay debate arquitectónico sobre qué pipeline es el correcto. ADR-011 fue aceptado y su §4.2 especifica con precisión los cambios. Es una **acción documental pendiente** — una tarea no ejecutada.

La ontología de Memory no está en cuestión. El pipeline correcto (EE → Memory → Pattern Discovery) está definido en ADR-010, ADR-011 y ARCHITECTURE_MILESTONE_v3.0. ADR-009 solo necesita reflejar este pipeline en su §7.

#### Diagnóstico

**Error documental.** Es una corrección autorizada pero no aplicada. No hay debate arquitectónico ni ontológico.

#### Resolución

**Acción mínima:** Aplicar los cambios documentados en ADR-011 §4.2 al archivo `009-evidence-engine-architecture.md`.

Cambios específicos (según ADR-011 §4.2):
1. Eliminar la fila "Reflection" de la tabla de capas futuras
2. Pattern Discovery pasa a ser el sucesor inmediato de Memory
3. Memory y Pattern Discovery se marcan como diseño futuro
4. Actualizar descripción de Pattern Discovery de `learn(reflections, outcomes)` a `learn(memoryWindow, outcomes)` con δ interna

**Impacto:**
- Ontología de Memory: ✅ Sin cambios
- ADR-010: ✅ Sin cambios
- ADR-009: ✅ Solo §7 (sin modificar invariantes I1-EE a I6-EE ni el freeze del EE)
- Otras capas: ✅ Sin impacto
- ADR invariantes: ✅ Sin cambios en invariantes del EE

---

## 3. Matriz de resolución

| ID | Diagnóstico | ¿Real? | Resolución | ¿Requiere cambio ontológico? | ¿Requiere cambio en otra capa? | ¿Resoluble sin ADR-010? | Acción documental |
|----|-------------|--------|------------|:---------------------------:|:-----------------------------:|:----------------------:|-------------------|
| **α** | Ambigüedad documental | No — C9 mal redactada | Reescribir C9: permitir consultas por partición, prohibir análisis semántico | ❌ No | ❌ No | ❌ No (C9 es de ADR-010) | ADR-010 |
| **β** | Contradicción contractual | Sí — pero resoluble | Definir que Read retorna MemorySnapshot[19]; PD analiza 11 | ❌ No | ✅ PR-7B/PR-7D (cosmético) | ❌ Parcial (también PR-7) | ADR-010 + Milestone + PR-7B/D |
| **γ** | Error documental | No — M-12 mal redactado | Reescribir M-12: exceptuar metadata | ❌ No | ❌ No | ❌ No (M-12 es de ADR-010) | ADR-010 |
| **δ** | Ambigüedad documental | No — mecanismo implícito | Refinar M-7: turnNumber = 1 + leer último + 1 | ❌ No | ❌ No | ❌ No (M-7 es de ADR-010) | ADR-010 |
| **ε** | Error documental | No — C9 ambiguo | Clarificar C9: partition key ≠ belief.conversationId | ❌ No | ❌ No | ❌ No (C9 es de ADR-010) | ADR-010 |
| **ζ** | Error documental | No — actualización pendiente | Aplicar ADR-011 §4.2 a ADR-009 §7 | ❌ No | ✅ ADR-009 §7 | ✅ Sí | ADR-009 |

### Observaciones clave

1. **Ninguna contradicción requiere modificar la ontología de Memory.** Los 5 contratos (Write, Persistence, Read, Projection, Identity) pueden coexistir con las definiciones ontológicas actuales.

2. **Solo β requiere cambios fuera de ADR-010** (PR-7B, PR-7D, Milestone v3.0) y son cambios cosméticos: actualizar referencias de "11 campos" a "19 campos con 11 analizables."

3. **Solo ζ requiere cambios fuera de ADR-010** (ADR-009 §7) y es una actualización ya autorizada por ADR-011 §4.2.

4. **Las 4 contradicciones restantes (α, γ, δ, ε) se resuelven exclusivamente con cambios locales en ADR-010** — reescribiendo reglas mal redactadas o refinando especificaciones.

5. **Todas las resoluciones preservan los invariantes existentes.** Ningún M-*, I*-MEM o I*-EE se modifica ni elimina.

### Cambios necesarios por documento

| Documento | Cambios | Contradicciones resueltas |
|-----------|---------|--------------------------|
| **ADR-010 — C9** | Reescribir para clarificar uso del partition key vs. análisis semántico | α, ε |
| **ADR-010 — M-12** | Agregar excepción para metadata Memory-generada | γ |
| **ADR-010 — M-7** | Refinar: valor inicial = 1, mecanismo = leer último + 1 | δ |
| **ADR-010 — lifecycle** | Actualizar: `read()` retorna MemorySnapshot[] (19 campos); PD analiza subconjunto | β |
| **ADR-010 — Snapshot def.** | Opcional: renombrar `conversationId` raíz a `partitionKey` en documentación | ε |
| **PR-7B §1.1** | "11 campos" → "19 campos (11 analizables)" | β |
| **PR-7D Q4-ML** | "11 campos" → "19 campos (11 analizables como subconjunto)" | β |
| **Milestone v3.0** | Línea 189-190: "ProjectedState" → "MemorySnapshot (19 campos, 11 analizables)" | β |
| **ADR-009 §7** | Aplicar cambios documentados en ADR-011 §4.2 | ζ |

---

## 4. Veredicto final

### SÍ, mediante normalización contractual.

**Justificación:**

Las 6 contradicciones identificadas en PR-12C/MCC-1 se analizaron contra la ontología de Memory, los invariantes ADR y los contratos existentes. El resultado:

| Dimensión | Verificación |
|-----------|-------------|
| **¿Alguna contradicción requiere modificar la ontología de Memory?** | ❌ No. Ninguna de las 6. |
| **¿Alguna requiere añadir nuevas capas?** | ❌ No. |
| **¿Alguna requiere nuevas responsabilidades para Memory?** | ❌ No. |
| **¿Alguna requiere modificar invariantes del EE (I1-EE a I6-EE)?** | ❌ No. |
| **¿Alguna requiere modificar invariantes de Memory (M-1 a M-14)?** | ❌ No. El único invariante modificado es M-12, que se **refina** (no se elimina ni se contradice) para exceptuar metadata. |
| **¿Alguna requiere cambiar la relación Memory → Pattern Discovery?** | ❌ No. Se clarifica que Read retorna 19 campos de los cuales PD analiza 11. |
| **¿Todas se resuelven con cambios en documentación/contratos?** | ✅ Sí. 4 se resuelven solo en ADR-010. 2 requieren actualizaciones cosméticas en documentos satélite. |

**Naturaleza de los cambios requeridos:**

- **3 reescrituras** de reglas mal redactadas (C9, M-12, distinción de conversationIds)
- **2 refinamientos** de especificaciones implícitas (turnNumber, relación 19/11 campos)
- **1 actualización** de un documento derivado (ADR-009 §7, ya autorizada)

Ningún cambio altera la arquitectura fundamental de Memory:
- Sigue siendo append-only, inmutable, basado en snapshots
- Sigue preservando Belief + Decision por turno
- Sigue sirviendo a Pattern Discovery como único consumidor
- Sigue operando en Shadow Mode, sin impacto conversacional
- Sigue respetando el EE freeze

**No se requiere rediseño arquitectónico. Se requiere normalización contractual — limpiar la redacción imprecisa, especificar lo implícito y aplicar una actualización ya autorizada.**

### Contraste con PR-12C/MCC-1

PR-12C identificó 6 contradicciones y concluyó "REQUIERE CONSOLIDACIÓN CONTRACTUAL." PR-12D/MCR-1 confirma ese diagnóstico pero demuestra que las contradicciones son resolubles sin cambio arquitectónico:

| Aspecto | PR-12C (MCC-1) | PR-12D (MCR-1) |
|---------|----------------|-----------------|
| Hallazgos | 6 contradicciones | 6 contradicciones confirmadas |
| Naturaleza | Contractualmente inconsistentes | Resolubles sin cambio ontológico |
| Veredicto | REQUIERE CONSOLIDACIÓN | SÍ, mediante normalización |
| Acción | No especificaba viabilidad | Demuestra viabilidad sin rediseño |

### Condiciones para la normalización

1. **No modificar** ningún invariante I*-EE, M-* o I*-MEM en su intención (solo refinar redacción)
2. **No modificar** la ontología de los 19 campos del MemorySnapshot
3. **No modificar** la responsabilidad fundamental de Memory (preservar, no interpretar)
4. **No crear** nuevas capas, tipos, interfaces o responsabilidades
5. **No romper** la compatibilidad con Pattern Discovery (los 11 campos analizables se preservan dentro de los 19)

Si estas 5 condiciones se cumplen, Memory puede alcanzar consistencia contractual completa mediante las acciones documentadas en la sección 3.

---

*Fin de PR-12D / MCR-1 — Memory Contract Resolution Audit*
