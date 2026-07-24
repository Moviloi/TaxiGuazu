# PR-7A — Pattern Discovery Ontology Audit

**Estado:** Borrador de auditoría  
**Fecha:** 2026-07-13  
**Driver:** Determinar si Pattern Discovery constituye una capa arquitectónica independiente o una función de transformación eliminable.

---

## Tabla de contenidos

1. [Metodología de auditoría](#1-metodología-de-auditoría)
2. [¿Qué es exactamente un Pattern?](#2-qué-es-exactamente-un-pattern)
3. [¿Pattern es conocimiento nuevo o derivado?](#3-pattern-es-conocimiento-nuevo-o-derivado)
4. [Unidad mínima producida por Pattern Discovery](#4-unidad-mínima-producida-por-pattern-discovery)
5. [Diferenciación ontológica: Pattern vs Belief, Decision, Goal](#5-diferenciación-ontológica-pattern-vs-belief-decision-goal)
6. [Operaciones exclusivas de Pattern Discovery](#6-operaciones-exclusivas-de-pattern-discovery)
7. [Operaciones explícitamente prohibidas](#7-operaciones-explícitamente-prohibidas)
8. [Invariantes que Pattern Discovery debe respetar](#8-invariantes-que-pattern-discovery-debe-respetar)
9. [Responsabilidades que NO deben migrar](#9-responsabilidades-que-no-deben-migrar)
10. [¿Pattern Discovery es capa cognitiva o función de transformación?](#10-pattern-discovery-es-capa-cognitiva-o-función-de-transformación)
11. [Intento de eliminación de Pattern Discovery](#11-intento-de-eliminación-de-pattern-discovery)
12. [Veredicto](#12-veredicto)

---

## 1. Metodología de auditoría

Esta auditoría aplica el mismo rigor que las auditorías PR-6A a PR-6F que eliminaron Reflection. Para determinar si Pattern Discovery merece existir como capa independiente, se evalúan cinco criterios:

| # | Criterio | Pregunta | ¿Reflection lo pasó? |
|---|----------|----------|---------------------|
| 1 | **Nuevo tipo de conocimiento** | ¿Pattern Discovery produce un tipo de conocimiento que no puede expresarse en el lenguaje de Memory? | ❌ No |
| 2 | **Diseño no determinista** | ¿Pattern Discovery involucra elecciones de diseño que no están determinadas por los datos de entrada? | ❌ No |
| 3 | **Ciclo de vida independiente** | ¿Pattern Discovery evoluciona a una velocidad o escala temporal distinta de sus capas vecinas? | ❌ No (débil) |
| 4 | **Consumidor externo** | ¿Pattern Discovery tiene al menos un consumidor fuera de sí mismo? | ❌ No |
| 5 | **Boundary contractual** | ¿Existe un cambio de lenguaje ontológico entre Memory y Pattern Discovery que justifique un contrato formal? | ❌ No |

Para que Pattern Discovery sea declarado capa independiente, debe pasar **todos** los criterios. Si falla alguno, se aplica el mismo principio que eliminó Reflection: la capa no se justifica.

---

## 2. ¿Qué es exactamente un Pattern?

### 2.1 Definición ontológica

Un **Pattern** es una generalización cognitiva que describe una relación recurrente entre campos del dominio cognitivo a través de una ventana temporal. No es un hecho sobre un turno específico sino una regularidad que emerge al observar múltiples turnos.

### 2.2 Propiedades esenciales

| Propiedad | Definición | Contraste con Memory |
|-----------|-----------|---------------------|
| **Cross-instance** | El Pattern requiere múltiples snapshots para su detección. Un solo snapshot nunca contiene un Pattern. | Memory opera turno a turno. |
| **Generalizante** | El Pattern aplica más allá de las instancias que lo generaron. "Cuando readiness baja, missingInfo crece" aplica a futuros turnos similares. | Memory solo conoce el turno N. |
| **Probabilístico** | El Pattern expresa tendencia, no certeza. Incluye confianza (0.85), frecuencia (3 de 5), umbrales ("tiende a"). | Memory expresa hechos con certeza boolean. |
| **Categorizado** | El Pattern pertenece a un tipo semántico: señal de abandono, patrón de confusión, indicador de estabilidad, etc. | Memory no categoriza — solo preserva. |
| **Estructurado** | El Pattern tiene un esquema definido con campos, relación, confianza, ventana, categoría. | Memory tiene un esquema de 11 campos fijos. |

### 2.3 Lo que un Pattern NO es

| No es | Porque |
|-------|--------|
| **Un hecho específico** | "readiness = 'partial' en turno 5" es un hecho de Memory, no un Pattern. |
| **Un diff entre turnos** | "readiness cambió de 'ready' a 'partial'" es δ, no un Pattern. |
| **Un compromiso** | "el sistema perseguirá resultado X" es un Goal, no un Pattern. |
| **Una acción** | "enviar mensaje de clarificación" es un paso de Planning, no un Pattern. |
| **Una regla operacional** | "si readiness < 'ready', trigger clarificación" es una policy rule, que puede estar INFORMADA por un Pattern pero no es el Pattern mismo. |

### 2.4 Formalización matemática preliminar

Un Pattern es una quíntupla:

```
Pattern = ⟨F, R, c, W, K⟩
```

Donde:
- **F** = {f₁, f₂, …, fₙ} ⊆ campos de ProjectedState (ej. {readiness, missingInfo})
- **R** = tipo de relación (correlación, secuencia temporal, tendencia, co-ocurrencia, etc.)
- **c** ∈ [0, 1] = confianza (frecuencia observada / total de observaciones)
- **W** = (start: turnNumber, end: turnNumber) = ventana temporal de observación
- **K** = categoría semántica (señal de abandono, patrón de confusión, ciclo de clarificación, etc.)

Esta formalización es **preliminar** y será refinada en PR-7B. Lo importante es que **ninguno de estos elementos existe en el lenguaje de Memory**.

---

## 3. ¿Pattern es conocimiento nuevo o derivado?

### 3.1 Paradoja aparente

Un Pattern es ambas cosas simultáneamente:

- **Derivado**: Los datos de entrada (ProjectedState[]) constriñen qué Patterns pueden existir. No se puede descubrir un Pattern que los datos no soporten. La fuente de verdad última son los snapshots de Memory.
- **Nuevo**: La FORMA del Pattern (generalización, confianza, categoría) no está presente en ningún snapshot individual. El Pattern existe a un nivel de abstracción superior.

### 3.2 Analogía con las capas del EE

Cada capa del Evidence Engine produce conocimiento **derivativamente nuevo**:

| Capa | Input | Output | ¿Nuevo? |
|------|-------|--------|---------|
| Signal | Message | Signal (objeto cognitivo) | Nuevo (primer objeto cognitivo) |
| Observation | Signal | Observation (validación temporal) | Nuevo (añade validez) |
| Fact | Observation | Facts (proposiciones atómicas) | Nuevo (extrae hechos) |
| Evidence | Facts | Evidence (grupo inmutable) | Nuevo (agrupa bajo una observación) |
| Knowledge | Evidence | Knowledge (campos estructurados) | Nuevo (consolida Facts en campos) |
| Belief | Knowledge | Belief (compromiso epistémico) | Nuevo (toma postura) |
| Decision | Belief | Decision (determinación cognitiva) | Nuevo (decide) |
| Memory | Decision | Snapshot (preservación) | Nuevo (persiste en el tiempo) |
| **Pattern Discovery** | **Snapshot[]** | **Pattern[]** | **Nuevo (generaliza a través del tiempo)** |

Cada flecha es una transformación que produce un tipo de conocimiento que NO existía en la capa anterior. Pattern Discovery continúa este patrón establecido.

### 3.3 Conclusión sobre novedad

El Pattern es **derivativamente nuevo** — exactamente como cada capa del EE produce conocimiento que es tanto derivado de su input como nuevo en su forma. No hay aquí una anomalía ontológica.

---

## 4. Unidad mínima producida por Pattern Discovery

### 4.1 Definición de Pattern como unidad atómica

La unidad mínima e irreducible que Pattern Discovery produce es:

```
Pattern {
  id: string,                    // UUID v4
  fields: string[],              // campos de ProjectedState involucrados
  relationship: RelationshipType, // tipo de relación detectada
  confidence: number,            // [0, 1] — qué tan confiable es el Pattern
  window: TemporalWindow,        // { startTurn, endTurn, conversationIds[] }
  category: PatternCategory,     // clasificación semántica
  metadata: {
    instancesDetected: number,
    firstObservedAt: timestamp,
    lastObservedAt: timestamp,
    sourceConversations: number  // de cuántas conversaciones se extrajo
  }
}
```

### 4.2 ¿Qué NO constituye una unidad mínima?

- **Un ChangeSet individual** no es un Pattern. Es un dato de entrada (o intermedio). δ produce ChangeSets; Pattern Discovery los consume internamente.
- **Una estadística agregada** (ej. "readiness promedio = 0.7") no es un Pattern si no expresa una RELACIÓN entre campos. Una media sin relación no es un patrón cognitivo.
- **Una regla operacional** no es la unidad de Pattern Discovery. La regla es la UNIDAD DE CONSUMO (Goals la usa), pero la unidad de PRODUCCIÓN es el Pattern.

### 4.3 Implicancia arquitectónica

El Pattern como unidad atómica establece el **contrato de salida** de Pattern Discovery. Cualquier consumidor (Goals, Analytics futuros) debe entender este contrato. Esto implica:

- Pattern debe tener un esquema estable antes de que Goals se diseñe.
- Pattern debe ser serializable (almacenable, transmisible).
- Pattern debe versionarse o tener metadatos de evolución.

---

## 5. Diferenciación ontológica: Pattern vs Belief, Decision, Goal

### 5.1 Tabla de diferencias fundamentales

| Dimensión | Belief | Decision | Pattern | Goal |
|-----------|--------|----------|---------|------|
| **Naturaleza** | Compromiso epistémico | Determinación cognitiva | Generalización probabilística | Compromiso directivo |
| **Temporalidad** | Turno único | Turno único | Cross-turn / cross-conversación | Hacia adelante (futuro) |
| **Fuerza epistémica** | Cierta (booleano) | Cierta (booleano) | Probabilística (confianza ∈ [0,1]) | Prescriptiva (no es verdad/falso) |
| **Sujeto** | "el sistema cree que X" | "el sistema decide que X" | "cuando A, B tiende a ocurrir" | "el sistema se compromete a lograr C" |
| **Categoría ontológica** | Postura | Determinación | Descripción de regularidad | Prescripción |
| **Lenguaje** | Factual (isValid, isWellFormed) | Factual (validInput, readiness) | Estadístico (correlación, tendencia) | Deóntico (debe, debería) |
| **Produce** | Creencias (7 campos) | Decisiones (7 campos) | Patrones (6+ campos) | Compromisos (Goal + objetivos) |
| **Consumido por** | Decision | Memory | Goals | Planning |

### 5.2 Los cuatro lenguajes

Cada entidad habla un lenguaje ontológico distinto:

```
Belief:   "el sistema cree que observationValid = true"      → LENGUAJE DE HECHO
Decision: "el sistema decide que readiness = 'partial'"       → LENGUAJE DE HECHO
Pattern:  "cuando readiness cae, missingInfo crece (c=0.85)"  → LENGUAJE DE TENDENCIA
Goal:     "el sistema debe clarificar antes de cotizar"      → LENGUAJE DE PRESCRIPCIÓN
```

**Belief y Decision** comparten el lenguaje de HECHO (difieren en fuerza epistémica).  
**Pattern** introduce el lenguaje de TENDENCIA (probabilístico, generalizante, cross-instance).  
**Goal** introduce el lenguaje de PRESCRIPCIÓN (directivo, deóntico, orientado a futuro).

El lenguaje de TENDENCIA no es reducible al lenguaje de HECHO. "Cuando A, B tiende a ocurrir (c=0.85)" no puede expresarse como un conjunto de hechos turno a turno. Es una generalización que trasciende las instancias particulares.

### 5.3 ¿Y δ?

δ (Changes) pertenece al lenguaje de HECHO. "readiness cambió de 'ready' a 'partial'" es un hecho sobre dos turnos. No es una generalización. No es probabilístico. No introduce un nuevo lenguaje.

Esto explica por qué δ/Reflection fue eliminado: operaba dentro del mismo lenguaje ontológico de Memory. Mientras que Pattern Discovery SÍ introduce un nuevo lenguaje.

---

## 6. Operaciones exclusivas de Pattern Discovery

### 6.1 Operaciones centrales (pertenecen solo a Pattern Discovery)

| Operación | Descripción | ¿Exclusiva? | ¿Quién más podría hacerla? |
|-----------|-------------|-------------|--------------------------|
| **Pattern detection** | Identificar relaciones entre campos a través de turnos y conversaciones | **SÍ** — Ninguna otra capa descubre patrones. | Goals podría, pero violaría SRP. |
| **Pattern selection** | Filtrar patrones por relevancia, confianza, categoría | **SÍ** — La selección requiere criterios que solo Pattern Discovery define. | Memory no tiene criterios de selección (M-9: no enrichment). |
| **Pattern categorization** | Asignar tipos semánticos (abandono, confusión, etc.) | **SÍ** — La categorización es interpretación cognitiva. | Goals podría categorizar, pero sería duplicación. |
| **Cross-conversation accumulation** | Combinar datos a través de conversaciones | **SÍ** — Ninguna otra capa opera cross-conversación. | Memory está particionada por conversación (M-6). |

### 6.2 Operaciones internas (preparación de datos dentro de Pattern Discovery)

| Operación | Descripción | ¿Podría ser externa? |
|-----------|-------------|---------------------|
| **δ computation** | Comparación semántica entre snapshots consecutivos | Podría ser librería compartida, pero 0 consumidores fuera de Pattern Discovery (PR-6F). Permanecerá interna. |

### 6.3 Implicancia arquitectónica

La existencia de 4 operaciones que solo Pattern Discovery puede realizar (y que ninguna capa existente realiza) demuestra que Pattern Discovery tiene un **propósito único y no duplicado**. Esto satisface SRP a nivel arquitectónico.

---

## 7. Operaciones explícitamente prohibidas

### 7.1 Prohibiciones por invariantes existentes

| Operación prohibida | Invariante violado | Severidad |
|---------------------|-------------------|-----------|
| **Escribir en Memory** | M-1 (append-only), M-3 (no feedback), I4-EE (no persistence) | **BLOQUEANTE** |
| **Escribir en DB operacional** | I4-EE (no persistence) | **BLOQUEANTE** |
| **Producir commitments** | Goals SRP — no definido formalmente pero implícito en pipeline | **ARQUITECTÓNICO** |
| **Producir planes** | Planning SRP — implícito en pipeline | **ARQUITECTÓNICO** |
| **Modificar campos de EE** | I6-EE (single authority) + ADR-009 Freeze | **BLOQUEANTE** |
| **Enviar mensajes** | I5-EE (no conversation impact) + Shadow Mode | **BLOQUEANTE** |
| **Consumir datos operacionales** | I6-EE (single authority — autoridad cognitiva viene de EE, no de datos operacionales) | **ARQUITECTÓNICO** |
| **Producir side effects** | Shadow Mode pattern — pure transformation | **ARQUITECTÓNICO** |

### 7.2 Prohibiciones por decisión arquitectónica

| Operación prohibida | Justificación |
|---------------------|---------------|
| **Sobrescribir políticas operacionales** | ADR-003: "Learning never overrides policy decisions". Las políticas operacionales (pricing, dispatch) son autoridad separada. |
| **Retroalimentar al pipeline cognitivo** | M-3 (no feedback a EE). Pattern Discovery nunca modifica cómo el EE procesa mensajes futuros. |
| **Almacenar estado interno entre invocaciones** | Sin decidir aún (pregunta 13 del milestone). Pero prohibido por defecto hasta que se demuestre necesidad. |

### 7.3 Principio general

Pattern Discovery es una capa **puramente cognitiva, de solo lectura respecto de Memory, sin efectos laterales**. Toda operación que viole estos tres principios está prohibida a menos que un ADR futuro demuestre necesidad.

---

## 8. Invariantes que Pattern Discovery debe respetar

### 8.1 Invariantes heredados de ADR-009 (EE Freeze) — 6 invariantes

| ID | Invariante | Cómo lo respeta Pattern Discovery |
|----|-----------|-------------------------|
| **I1-EE** | Pipeline completeness | Pattern Discovery no interrumpe el pipeline. Es un consumidor post-turno. |
| **I2-EE** | Immutability | Patterns son objetos inmutables (congelados post-construcción). |
| **I3-EE** | Temporal monotonicity | Pattern Discovery consume snapshots ordenados. No viola relaciones temporales. |
| **I4-EE** | No persistence | Pattern Discovery no escribe en ninguna DB operacional. (Patterns podrían persistirse en almacenamiento cognitivo, pero eso está por definirse.) |
| **I5-EE** | No conversation impact | Pattern Discovery corre en Shadow Mode. Nunca afecta la conversación. |
| **I6-EE** | Single authority | La autoridad de los Patterns proviene de los datos de Memory, no de estado operacional. |

### 8.2 Invariantes heredados de ADR-010 (Memory) — 14 invariantes

| ID | Invariante | Relevancia para Pattern Discovery |
|----|-----------|-------------------------|
| M-1 | Append-only | Pattern Discovery respeta que Memory es append-only. No escribe ni elimina. |
| M-2 | Read-only durante EE | Pattern Discovery no consulta Memory mientras el pipeline cognitivo corre. |
| M-3 | No feedback a EE | Pattern Discovery nunca retroalimenta Signal→Observation→Fact→Evidence→Knowledge→Belief→Decision. |
| M-4 | Turno completo | Pattern Discovery solo consume snapshots completos (Belief + Decision). |
| M-5 | Inmutable | Pattern Discovery no modifica snapshots. Los lee como datos inmutables. |
| M-6 | Particionado por conversación | Pattern Discovery respeta que conversationId es partition key. Acumula cross-conversación pero sin violar pertenencia. |
| M-7 | Monotónico | Pattern Discovery consume turnNumber en orden monótono creciente. |
| M-8 | Atómico | Pattern Discovery consume snapshots que contienen exactamente Belief + Decision. |
| M-9 | Sin enriquecimiento | Pattern Discovery no espera que Memory enriquezca datos. Los consume tal como fueron preservados. |
| M-10 | Estabilidad de proyección | Pattern Discovery depende de campos estables. Cualquier cambio en proyección requiere ADR. |
| M-11 | Sin estado operacional | Pattern Discovery no depende de estado interno de Memory. |
| M-12 | Sin defaults | Pattern Discovery no asume valores default para campos ausentes. |
| **M-13** | **Sin precomputación de deltas** | **Pattern Discovery internaliza δ.** Memory no computa diferencias. Pattern Discovery lo hace internamente. |
| M-14 | Separación temporal | Pattern Discovery respeta que storedAt ≠ receivedAt. Su temporalidad es cross-turn. |

### 8.3 Invariantes propuestos para Pattern Discovery (nuevos — L-1 a L-6)

Estos invariantes son **tentativos** y deben formalizarse en PR-7B. Se listan aquí para demostrar que Pattern Discovery tiene espacio para invariantes propios.

| ID | Invariante | Justificación |
|----|-----------|---------------|
| **L-1** | Read-only respecto de Memory | Pattern Discovery consume snapshots pero nunca los modifica, elimina, ni enriquece. |
| **L-2** | Patterns inmutables | Una vez producido, un Pattern no cambia. Nuevos datos producen nuevos Patterns, no mutan existentes. |
| **L-3** | Shadow Mode por defecto | Pattern Discovery nunca afecta la conversación. Feature flag controla activación. |
| **L-4** | Sin estado entre ventanas | Pattern Discovery no mantiene estado entre invocaciones (a menos que ADR futuro demuestre necesidad). |
| **L-5** | Dependencia exclusiva de Memory | Pattern Discovery solo consume ProjectedState[]. No depende de capas operacionales ni de Goals. |
| **L-6** | δ es interno | La comparación entre snapshots es función privada de Pattern Discovery. No expuesta contractualmente. |

---

## 9. Responsabilidades que NO deben migrar

### 9.1 Desde Goals (NO deben migrar a Pattern Discovery)

| Responsabilidad | Pertenece a | Razón |
|----------------|-------------|-------|
| **Selección de compromisos** | Goals | Pattern Discovery describe regularidades; Goals prescribe qué hacer. Son actos cognitivos distintos. |
| **Prescripción de resultados** | Goals | "El sistema debe lograr X" es un acto directivo. Pattern Discovery no tiene autoridad directiva. |
| **Decisión sobre qué acción tomar** | Goals | Pattern Discovery informa; Goals decide. |
| **Evaluación de éxito/fracaso** | Goals | Goals define métricas de éxito; Pattern Discovery descubre patrones — no evalúa. |

### 9.2 Desde Memory (NO deben migrar a Pattern Discovery)

| Responsabilidad | Pertenece a | Razón |
|----------------|-------------|-------|
| **Preservación de snapshots** | Memory | Memory persiste datos; Pattern Discovery los consume. Pattern Discovery no almacena — generaliza. |
| **Proyección de campos** | Memory | Qué campos pertenecen al contrato de Memory ya está definido (PR-5B). Pattern Discovery no redefine este contrato. |
| **Indexación temporal** | Memory | Memory ordena por turnNumber. Pattern Discovery consume el orden pero no lo administra. |
| **Particionado por conversación** | Memory | conversationId es partition key de Memory. Pattern Discovery puede ACRECENTAR entre conversaciones, pero no re-particionar. |
| **Garantía de completitud** | Memory | Memory garantiza que cada snapshot tiene Belief + Decision. Pattern Discovery asume esta garantía. |

### 9.3 Principio de no duplicación

Pattern Discovery no duplica responsabilidades de ninguna capa existente. La siguiente tabla muestra cobertura completa:

| Responsabilidad | EE | Memory | Pattern Discovery | Goals |
|-----------------|----|--------|----------|-------|
| Capturar mensajes | ✅ | ❌ | ❌ | ❌ |
| Validar temporalmente | ✅ | ❌ | ❌ | ❌ |
| Extraer hechos | ✅ | ❌ | ❌ | ❌ |
| Agrupar bajo observación | ✅ | ❌ | ❌ | ❌ |
| Consolidar en campos | ✅ | ❌ | ❌ | ❌ |
| Comprometerse epistémicamente | ✅ | ❌ | ❌ | ❌ |
| Determinar cognitivamente | ✅ | ❌ | ❌ | ❌ |
| Preservar turnos | ❌ | ✅ | ❌ | ❌ |
| Descubrir patrones | ❌ | ❌ | ✅ | ❌ |
| Seleccionar compromisos | ❌ | ❌ | ❌ | ✅ |

**No hay duplicación.** Cada responsabilidad pertenece exactamente a una capa.

---

## 10. ¿Pattern Discovery es capa cognitiva o función de transformación?

### 10.1 Aplicación de los 5 criterios

#### Criterio 1: ¿Produce un tipo de conocimiento NUEVO?

**Evaluación:** SÍ.

Memory produce ProjectedState (hechos puntuales, ciertos, por turno).  
Pattern Discovery produce Pattern (generalización cross-turn, probabilística, categorizada).

Ninguno de los elementos de un Pattern existe en el lenguaje de Memory:
- Confianza probabilística (c ∈ [0,1])
- Categorización semántica (señal de abandono, etc.)
- Relación entre campos (correlación, secuencia)
- Generalización cross-instance ("tiende a")

**Resultado: ✅ PASA**

#### Criterio 2: ¿Involucra elecciones de diseño NO DETERMINISTAS?

**Evaluación:** SÍ.

Dado un conjunto de ProjectedState[], hay MÚLTIPLES Patterns posibles. Pattern Discovery debe SELECCIONAR:
- ¿Qué umbral de confianza califica como patrón? (c ≥ 0.7 vs c ≥ 0.9)
- ¿Qué tipos de relación buscar? (solo correlación, o también secuencia, tendencia?)
- ¿Qué ventana temporal considerar? (últimos 10 turnos, últimos 100?)
- ¿Qué categorías asignar? (taxonomía de patrones)
- ¿Qué patrones son "interesantes" o "accionables"?

Estas elecciones no están determinadas por los datos. Requieren criterios de diseño. Esto es trabajo cognitivo.

**Contraste con δ (Reflection):** δ produce TODAS las diferencias. No hay selección. No hay umbrales. No hay categorización. Está completamente determinado por los datos.

**Resultado: ✅ PASA**

#### Criterio 3: ¿Tiene ciclo de vida INDEPENDIENTE?

**Evaluación:** SÍ.

- Memory evoluciona por turno (append por cada turno completado).  
- Pattern Discovery evoluciona por VENTANA o por CONVERSACIÓN (necesita acumular múltiples snapshots antes de producir Patterns).  
- Goals evoluciona por DECISIÓN (cada vez que el sistema debe elegir un curso de acción).

Estas tres velocidades son distintas:
```
Memory:   t₁, t₂, t₃, t₄, ...  (cada turno)
 Pattern Discovery: W₁, W₂, W₃, ...      (cada N turnos, o cada conversación)
Goals:    D₁, D₂, D₃, ...      (cuando hay que decidir)
```

La independencia temporal significa que los cambios en Pattern Discovery no afectan a Memory ni a Goals directamente, y viceversa.

**Resultado: ✅ PASA**

#### Criterio 4: ¿Tiene al menos un CONSUMIDOR fuera de sí mismo?

**Evaluación:** SÍ.

Goals es el consumidor directo de Patterns producidos por Pattern Discovery. Sin Pattern Discovery, Goals tendría que:
- Consumir ProjectedState[] directamente desde Memory
- Computar su propio δ
- Descubrir sus propios patrones
- Acumular datos cross-conversación

Esto violaría SRP de Goals (que debe ser selección de compromisos, no descubrimiento de patrones).

Además, el roadmap anticipa consumidores futuros (Analytics, Explainability).

**Resultado: ✅ PASA**

#### Criterio 5: ¿Existe un BOUNDARY CONTRACTUAL entre Memory y Pattern Discovery?

**Evaluación:** SÍ.

Memory habla el lenguaje de ProjectedState.  
Pattern Discovery habla el lenguaje de Pattern.

Estos son lenguajes distintos con:
- Primitivas distintas (fields vs pattern-relationship)
- Condiciones de validez distintas (completitud por turno vs confianza estadística)
- Compromisos epistémicos distintos (certeza booleana vs probabilidad)
- Esquemas distintos (11 campos fijos vs estructura de Pattern)

Para cruzar de Memory a Pattern Discovery, se requiere una TRANSFORMACIÓN que cambia la naturaleza del conocimiento. Esto ES un boundary contractual.

**Contraste con Memory→Reflection (eliminado):** Ambos hablaban el lenguaje de EE (State y Change son variaciones del mismo vocabulario). No había boundary.

**Resultado: ✅ PASA**

### 10.2 Resumen

| Criterio | ¿Pattern Discovery lo pasa? | ¿Reflection lo pasó? |
|----------|-------------------|---------------------|
| 1. Nuevo tipo de conocimiento | ✅ SÍ | ❌ NO |
| 2. Diseño no determinista | ✅ SÍ | ❌ NO |
| 3. Ciclo de vida independiente | ✅ SÍ | ❌ NO (débil) |
| 4. Consumidor externo | ✅ SÍ | ❌ NO |
| 5. Boundary contractual | ✅ SÍ | ❌ NO |

**Pattern Discovery pasa los 5 criterios. Reflection no pasó ninguno.**

---

## 11. Intento de eliminación de Pattern Discovery

Para cumplir con la instrucción de "intentar demostrar tanto su necesidad como su posible eliminación", se presentan los argumentos más fuertes CONTRA Pattern Discovery como capa independiente.

### 11.1 Argumento de eliminación: Patrones estáticos

**Premisa:** Si todos los patrones que el sistema necesita pueden ser predefinidos por desarrolladores humanos (reglas estáticas), entonces Pattern Discovery no descubre nada nuevo — solo monitorea condiciones conocidas.

**En este escenario:**
- Pattern Discovery sería un clasificador que detecta patrones conocidos (ej. "si readiness=partial por 3+ turnos → patrón de confusión")
- No habría descubrimiento dinámico
- Pattern Discovery sería una función de transformación, no una capa cognitiva
- Podría ser una librería dentro de Goals

**Contraargumento:** 
1. El roadmap de AITOS anticipa descubrimiento dinámico (ADR-003, ADR-009 §7, Architecture Milestone v3.0). Si se elimina el descubrimiento dinámico, se elimina una capacidad planificada del sistema.
2. Incluso con patrones estáticos, Pattern Discovery sigue produciendo un tipo de conocimiento (Pattern) que Goals no puede producir internamente sin cambiar su naturaleza. El lenguaje de Pattern sigue siendo distinto del lenguaje de Commitment.
3. El argumento de "reglas estáticas" prueba que Pattern Discovery podría ser MÁS SIMPLE, no que deba ser ELIMINADO.

**Veredicto:** Derrotado. La simplicidad funcional no invalida la necesidad arquitectónica.

### 11.2 Argumento de eliminación: Pattern Discovery como librería de Goals

**Premisa:** Pattern Discovery puede ser una función importable dentro del módulo de Goals, no una capa independiente. Goals llama a `discoverPatterns(memoryWindow)` como llamaría a cualquier helper.

**En este escenario:**
- No hay capa Pattern Discovery independiente
- Goals tiene un submódulo de pattern discovery
- Patterns no existen como entidades propias — son datos intermedios dentro de Goals

**Contraargumento:**
1. Goals absorbería dos responsabilidades: descubrir patrones Y seleccionar compromisos. Esto viola SRP. 
2. Patterns serían inaccesibles para otros consumidores potenciales (Analytics, Explainability).
3. Goals operaría a dos velocidades temporales (cross-conversación para patrones, per-conversación para decisiones), mezclando concerns.
4. El principio establecido en toda la arquitectura de AITOS es que cada tipo de conocimiento tiene su propia capa. Pattern es un tipo de conocimiento distinto.

**Veredicto:** Derrotado. La absorción por Goals viola SRP y el principio de separación por tipo de conocimiento.

### 11.3 Argumento de eliminación: Pattern Discovery no produce decisiones

**Premisa:** Pattern Discovery solo produce información (Patterns). No produce decisiones. Una capa que no produce decisiones no merece el estatus de "capa cognitiva" — es solo un procesador de datos.

**En este escenario:**
- Pattern Discovery es un middleware de datos, no una capa cognitiva
- Las capas cognitivas "reales" son EE (decide hechos) y Goals (decide acciones)
- Pattern Discovery es un transformador entre EE/Memory y Goals

**Contraargumento:**
1. El Evidence Engine tampoco produce "decisiones sobre acciones" — produce determinaciones cognitivas (readiness, validInput). ¿Dejamos de llamarlo capa cognitiva por eso?
2. "Cognitivo" no es sinónimo de "decisión sobre acciones". Cognitivo significa "relativo al conocimiento". Pattern discovery es innegablemente una operación cognitiva (identifica regularidades en datos pasados).
3. Memory tampoco produce decisiones — solo preserva. ¿Memory no es capa cognitiva? Por supuesto que lo es: es persistencia cognitiva.
4. La producción de decisiones no es el único criterio para ser capa cognitiva.

**Veredicto:** Derrotado. "Producir decisiones" no es un requisito para ser capa cognitiva.

### 11.4 Síntesis de eliminación

| Argumento | ¿Derrota a Pattern Discovery? | Razón |
|-----------|---------------------|-------|
| Patrones estáticos | ❌ No | Simplicidad funcional ≠ eliminación arquitectónica |
| Librería de Goals | ❌ No | Viola SRP y principio de separación por tipo de conocimiento |
| No produce decisiones | ❌ No | "Cognitivo" ≠ "productor de decisiones" |

**Pattern Discovery no puede ser eliminado con argumentos arquitectónicos sólidos.**

---

## 12. Veredicto

### 12.1 Decisión

**Pattern Discovery CONSTITUYE una capa arquitectónica independiente del pipeline cognitivo de AITOS.**

### 12.2 Resumen de evidencia

| Afirmación | Evidencia | Auditoría |
|------------|-----------|-----------|
| Pattern Discovery produce un nuevo tipo de conocimiento | Pattern es ontológicamente distinto de ProjectedState | PR-7A §2-5 |
| Pattern es derivativamente nuevo (como toda capa) | Sigue el mismo patrón de EE: derivado del input, nuevo en forma | PR-7A §3 |
| Pattern Discovery opera en un dominio cross-conversación único | Ninguna otra capa opera cross-conversación | PR-7A §6 |
| Pattern Discovery tiene operaciones exclusivas | Pattern detection, selection, categorization, accumulation | PR-7A §6 |
| Pattern Discovery respeta los 20 invariantes congelados | Mapeo completo contra I1-EE a I6-EE + M-1 a M-14 | PR-7A §8 |
| Pattern Discovery no duplica responsabilidades | Tabla de cobertura muestra 0 duplicación | PR-7A §9 |
| Pattern Discovery pasa los 5 criterios de capa cognitiva | ✅✅✅✅✅ (Reflection pasó 0/5) | PR-7A §10 |
| Pattern Discovery no puede eliminarse | 3 intentos de eliminación derrotados | PR-7A §11 |

### 12.3 Diferencia fundamental con Reflection

La razón por la que Pattern Discovery sobrevive donde Reflection cayó es:

**Reflection** = cambio de FORMA (State → Change) sin cambio de LENGUAJE.  
**Pattern Discovery** = cambio de LENGUAJE (hecho puntual → generalización probabilística).

El cambio de lenguaje ontológico es el marcador definitivo de una capa cognitiva genuina. Reflection no lo tenía. Pattern Discovery SÍ.

### 12.4 Próximos pasos

| Paso | Descripción | Prioridad |
|------|-------------|-----------|
| **PR-7B** | Formalizar los 6 invariantes propuestos (L-1 a L-6) y el contrato de entrada/salida de Pattern Discovery | **Inmediato** |
| **PR-7C** | Diseñar el canal de consulta Memory → Pattern Discovery (API de lectura de ventanas de snapshots) | **Alta** |
| **PR-7D** | Definir la taxonomía de RelationshipType y PatternCategory | **Alta** |
| **PR-7E** | Auditar coexistencia con Pattern Discovery operacional (ADR-003) | **Media** |

---

*Este documento es resultado de la auditoría ontológica PR-7A. No contiene código, no propone implementaciones, no diseña algoritmos. Es una demostración de necesidad arquitectónica desde primeros principios.*
