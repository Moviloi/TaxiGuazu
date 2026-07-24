# PR-8B — Goals Mathematical Model Audit

**Estado:** Borrador de auditoría matemática  
**Fecha:** 2026-07-13  
**Driver:** Determinar si Goals posee un modelo matemático mínimo que justifique existencia como capa independiente, o si su kernel es trivial y absorbible.

---

## Regla metodológica

Esta auditoría sigue el mismo protocolo que PR-7B (modelo matemático de Learning):

1. Se define el dominio de entrada de Goals.
2. Se define el dominio de salida.
3. Se define la transformación matemática que Goals realizaría.
4. Se analiza si la transformación constituye un cambio de orden lógico.
5. Se analizan las propiedades formales de la transformación.
6. Se determina si el kernel matemático es suficientemente complejo para justificar una capa.

**No se aceptan modelos inflados.** Si la transformación se reduce a operaciones de conjunto (filtro, unión, ordenación), no constituye un kernel de capa.

---

## Tabla de contenidos

1. [Dominio matemático de entrada](#1-dominio-matemático-de-entrada)
2. [Dominio matemático de salida](#2-dominio-matemático-de-salida)
3. [Transformación matemática de Goals](#3-transformación-matemática-de-goals)
4. [Descomposición atómica](#4-descomposición-atómica)
5. [¿Agrega información o solo la reorganiza?](#5-agrega-información-o-solo-la-reorganiza)
6. [Propiedades formales](#6-propiedades-formales)
7. [Kernel mínimo](#7-kernel-mínimo)
8. [Comparación con Learning](#8-comparación-con-learning)
9. [Veredicto](#9-veredicto)

---

## 1. Dominio matemático de entrada

### 1.1 Desde Learning: Patterns

El dominio de entrada principal de Goals es el conjunto de Patterns producido por Learning:

```
M = L_γ(W) = {c₁, c₂, ..., cₖ}  con  k ≥ 0
c_i = ⟨P_i, θ_i, E_i, τ_i⟩ ∈ 𝒞
```

Donde:
- `𝒞` es el espacio de claims (PR-7B §2)
- `P_i` es un predicado de segundo orden sobre W^k
- `θ_i ∈ [0, 1]` es la confianza
- `E_i ⊆ W^k` es la evidencia
- `τ_i` es el tipo descriptivo (estado/transición/tendencia/dependencia)

### 1.2 Desde el estado cognitivo actual

Goals necesitaría también el estado cognitivo actual para determinar relevancia:

```
s_current = ⟨belief_current, decision_current⟩
```

Donde:
- `belief_current`: Belief del turno actual (observationValid, channel, etc.)
- `decision_current`: Decision del turno actual (validInput, readiness, missingInfo)

Este estado está disponible en Memory (último snapshot) o directamente desde el ShadowResult.

### 1.3 Dominio de entrada completo

```
X = 𝒫(𝒞) × 𝒮
```

Donde:
- `𝒫(𝒞)`: conjunto potencia de Patterns (desde Learning)
- `𝒮`: espacio de estados cognitivos actuales (último snapshot)

### 1.4 Cardinalidad del dominio

| Componente | Cardinalidad | Notas |
|-----------|:-----------:|-------|
| `𝒫(𝒞)` | 2^{|𝒞|} | Potencialmente infinito (𝒞 es infinito: existen infinitos predicados posibles) |
| `𝒮` | Finito (producto de 11 campos) | Cada campo tiene dominio finito |

En la práctica, para una ventana típica de 10-20 turnos, |M| suele ser pequeño (5-20 Patterns). Pero matemáticamente el dominio es grande.

---

## 2. Dominio matemático de salida

### 2.1 Definición del espacio de Goals

Goals produciría un conjunto de commitments:

```
G = {g₁, g₂, ..., gₘ}  con  m ≥ 0
g = ⟨intention, priority, rationale⟩
```

### 2.2 Componentes de un Goal

| Componente | Símbolo | Tipo | Significado |
|-----------|---------|------|-------------|
| Intención | `intention` | `Intention` | Estado deseado o acción abstracta |
| Prioridad | `priority` | `{high, medium, low}` o `[0, 1]` | Importancia relativa |
| Justificación | `rationale` | `𝒫(𝒞)` o `𝒞` | Pattern(s) que justifican este Goal |

### 2.3 Naturaleza del espacio de intenciones

El espacio `Intention` es un conjunto de categorías predefinidas:

```
Intention = {
    "clarify_origin",
    "clarify_destination",
    "clarify_passengers",
    "clarify_schedule",
    "confirm_booking",
    "offer_assistance",
    "request_confirmation",
    "resolve_ambiguity",
    "maintain_engagement",
    "handle_cancellation",
    ...
}
```

**Este es un conjunto FINITO y ESTÁTICO.** No se descubre, no se aprende, no evoluciona. Es una taxonomía definida por el diseñador del sistema.

### 2.4 Comparación ontológica

Comparemos la salida de Goals con la de Learning:

| Dimensión | Pattern (Learning) | Goal (Goals) |
|-----------|-------------------|--------------|
| Naturaleza | Descubierto de los datos | Asignado por reglas |
| Cardinalidad del espacio | Infinito (infinitos predicados) | Finito (intenciones predefinidas) |
| Dependencia de datos | Total (derivado de W) | Parcial (derivado de Patterns + estado) |
| Orden lógico | Segundo orden | Segundo orden |
| Novedad | Nueva regularidad no conocida antes | Nueva combinación de categorías conocidas |

**Hallazgo:** Mientras que Learning descubre regularidades imprevistas (su espacio de salida es infinito), Goals solo selecciona entre categorías predefinidas (su espacio de salida es finito). Goals no descubre — asigna.

---

## 3. Transformación matemática de Goals

### 3.1 Definición de la función G

Goals, si existiera como capa, realizaría la siguiente transformación:

```
G: 𝒫(𝒞) × 𝒮 → 𝒫(𝒢)

G(M, s) = {g | g = interpret(c, s) ∧ c ∈ M ∧ relevant(c, s)}
```

Donde:
- `relevant: 𝒞 × 𝒮 → {true, false}`: determina si un Pattern es relevante dado el estado actual
- `interpret: 𝒞 × 𝒮 → 𝒢`: convierte un Pattern relevante en un Goal

### 3.2 Descomposición en operaciones

La función G se descompone en:

```
G(M, s) = prioritize(
             categorize(
                 dedup(
                     filter(M, s)
                 )
             )
          )
```

| Operación | Símbolo | Función | Tipo |
|-----------|---------|---------|------|
| Filtro por relevancia | `filter(M, s) = {c ∈ M | relevant(c, s)}` | Seleccionar subconjunto | **Operación de conjunto** |
| Dedup funcional | `dedup(M') = max_by_θ(M') / unique_by_effect(M')` | Eliminar redundantes | **Operación de conjunto** |
| Categorización | `categorize(M') = {⟨c, τ_interpretativo(c)⟩ | c ∈ M'}` | Etiquetar | **Operación de etiquetado** |
| Priorización | `prioritize(M'') = sorted(M'', priority_fn)` | Ordenar | **Operación de ordenación** |
| Generación de Goal | `goal(c, s) = ⟨intention(c, s), priority(c, s), {c}⟩` | Transformar Pattern en Goal | **Operación de formato** |

### 3.3 ¿Es G una función determinista?

Sí, si `relevant`, `interpret`, `priority_fn` son deterministas (y deberían serlo):

```
∀(M₁, s₁) = (M₂, s₂) → G(M₁, s₁) = G(M₂, s₂)
```

### 3.4 ¿Es G una función pura?

Depende de si las funciones auxiliares acceden a estado externo:
- `relevant(c, s)`: debe ser pura (solo depende de c y s)
- `interpret(c, s)`: debe ser pura
- `priority_fn(c, s)`: debe ser pura

Si todas son puras, G es pura. Pero esto es una decisión de diseño, no una propiedad matemática inevitable.

### 3.5 Hallazgo crítico

**La transformación G es una COMPOSICIÓN DE FUNCIONES DE CONJUNTO Y ETIQUETADO.** No hay:
- Cambio de orden lógico (Patterns son segundo orden; Goals también)
- Compresión abstractiva (no se reduce dimensionalidad)
- Descubrimiento (no se encuentra nada nuevo; se asignan categorías predefinidas)
- Generación de información no presente en el input (Goals no agrega nada que no esté ya en los Patterns)

---

## 4. Descomposición atómica

### 4.1 Responsabilidades atómicas

Siguiendo el mismo método que PR-7F (descomposición atómica), las responsabilidades de Goals serían:

| ID | Responsabilidad | Descripción | Depende de |
|----|----------------|-------------|------------|
| G1 | Recepción de M | Recibir conjunto de Patterns desde Learning | — |
| G2 | Lectura de estado actual s | Obtener último snapshot cognitivo | — |
| G3 | Filtro por relevancia | Determinar qué Patterns importan ahora | G1, G2 |
| G4 | Dedup funcional | Eliminar Patterns que llevarían al mismo Goal | G3 |
| G5 | Categorización interpretativa | Asignar tipo semántico (abandono, confusión, etc.) | G3 |
| G6 | Priorización | Ordenar Goals por importancia | G5 |
| G7 | Generación de Commitment | Ensamblar ⟨intention, priority, rationale⟩ | G5, G6 |
| G8 | Ensamblaje de salida | Producir G = {g₁, ..., gₘ} | G7 |

### 4.2 Naturaleza de cada responsabilidad

| ID | Responsabilidad | ¿Es transformación ontológica? | ¿O es operación mecánica? |
|----|----------------|:-----------------------------:|:-------------------------:|
| G1 | Recepción de M | ❌ No | ✅ Mecánica (input) |
| G2 | Lectura de estado s | ❌ No | ✅ Mecánica (input) |
| G3 | Filtro por relevancia | ❌ No | ✅ Reglas condicionales |
| G4 | Dedup funcional | ❌ No | ✅ Operación de conjunto |
| G5 | Categorización interpretativa | ❌ No | ✅ Asignación por reglas |
| G6 | Priorización | ❌ No | ✅ Ordenación por criterio |
| G7 | Generación de Commitment | ❌ No | ✅ Formato de salida |
| G8 | Ensamblaje de salida | ❌ No | ✅ Agregación |

**Hallazgo:** Ninguna responsabilidad de Goals constituye una transformación ontológica. Todas son operaciones mecánicas sobre datos.

### 4.3 Contraste con Learning

| Responsabilidad de Learning | ¿Transformación ontológica? |
|----------------------------|:---------------------------:|
| R1: Recepción de W | ❌ No (input) |
| R3-R6: Detección (estado, transición, tendencia, dependencia) | ✅ **SÍ** (descubrimiento de regularidades) |
| R7: Cómputo de θ | ✅ **SÍ** (medida probabilística) |
| R8: Ensamblaje de E | ✅ **SÍ** (vinculación Pattern→datos) |
| R13: Ensamblaje ⟨P,θ,E⟩ | ✅ **SÍ** (unidad cognitiva de segundo orden) |

**Learning tiene 4 responsabilidades que son transformaciones ontológicas** (detección, confianza, evidencia, ensamblaje). **Goals tiene 0.**

---

## 5. ¿Agrega información o solo la reorganiza?

### 5.1 Análisis de contenido informativo

**Input de Goals:** Patterns c = ⟨P, θ, E, τ⟩ que contienen:
- Qué regularidad se observó (P)
- Con qué confianza (θ)
- Con qué evidencia (E)
- De qué tipo matemático es (τ)

**Output de Goals:** Goals g = ⟨intention, priority, rationale⟩ que contienen:
- Qué intención se deriva (intention)
- Con qué prioridad (priority)
- Justificación basada en Patterns (rationale)

### 5.2 ¿Agrega información?

La intención `intention` es una CATEGORÍA ASIGNADA, no descubierta. Ejemplo:
- Pattern: "cuando readiness cae, missingInfo crece, θ=0.85"
- Intención asignada: "clarificar origen"

La asignación `Pattern → Intention` sigue una REGLA:
```
IF readiness_drops AND missingInfo_grows THEN intention = "clarify_missing_info"
```

Esta regla es **conocida antes de ejecutar Goals**. No se descubre durante la ejecución. Goals solo APLICA la regla. No hay ganancia informativa.

**Comparación con Learning:**
Learning DESCUBRE que "cuando readiness cae, missingInfo crece" - esto NO se conocía antes de ejecutar Learning. La regularidad emerge de los datos. Hay ganancia informativa real.

### 5.3 ¿Pérdida de información?

Goals DESCARTARÍA información:
- Patterns irrelevantes (por definición: se filtran)
- Evidencia detallada (E no se transmite a Planning)
- Confianza (θ no se transmite a Planning)
- Tipo descriptivo (τ no se transmite a Planning)

**Hallazgo:** Goals FILTRA información. Esto puede ser útil (simplificar el input de Planning), pero no es una transformación ontológica. Es una operación de reducción de dimensionalidad.

### 5.4 Veredicto del análisis informativo

**Goals no agrega información nueva. Solo reorganiza, filtra y etiqueta información existente.** Toda la información que produce Goals está contenida (implícitamente) en los Patterns de entrada más las reglas de interpretación.

---

## 6. Propiedades formales

### 6.1 Propiedades analizadas (mismo marco que PR-7B §6)

| Propiedad | ¿Goals la cumple? | Demostración |
|-----------|:-----------------:|--------------|
| **Pureza** (sin side effects) | ✅ Sí (diseñable) | G puede ser función pura si relevant/interpret/priority son puras |
| **Determinismo** (misma entrada → misma salida) | ✅ Sí | Si relevant/interpret/priority son deterministas |
| **Monotonicidad** (más Patterns → más Goals) | ❌ No | Más Patterns no implica más Goals (pueden ser irrelevantes o duplicados) |
| **Idempotencia** (G(G(M)) = G(M)) | ✅ Sí (esperada) | Goals sobre Goals no produce cambios |
| **Composicionalidad** (G(M₁ ∪ M₂) = G(M₁) ∪ G(M₂)) | ❌ No | La dedup y priorización global afectan el resultado |
| **Cerradura** (G(M) ⊆ 𝒢 cerrado) | ✅ Sí | 𝒢 es un conjunto finito de intenciones |
| **Trazabilidad** (cada Goal → Pattern origen) | ✅ Sí (diseñable) | rationale preserva la vinculación |

### 6.2 Comparación con Learning (PR-7B)

| Propiedad | Learning | Goals | Diferencia |
|-----------|:--------:|:-----:|:----------:|
| Pureza | ✅ | ✅ | Igual |
| Determinismo | ✅ | ✅ | Igual |
| Monotonicidad | ❌ | ❌ | Igual |
| Idempotencia | N/A | ✅ | Diferente (Learning no es idempotente) |
| Composicionalidad | ✅ | ❌ | Diferente |
| Cerradura | ❌ | ✅ | Diferente |
| Trazabilidad | ✅ | ✅ | Igual |

**Hallazgo:** Las propiedades de Goals son MÁS DÉBILES que las de Learning. Goals es cerrado (salida predecible y acotada), pero no composicional (el orden importa). Learning es no-cerrado (puede descubrir infinitos patrones) pero composicional.

### 6.3 Implicancia

El hecho de que Goals sea CERRADO (𝒢 es finito y predecible) significa que su comportamiento puede ser completamente especificado por reglas. No hay sorpresa. No hay descubrimiento. Una máquina de estados finitos puede modelar Goals.

Learning es NO-CERRADO: puede descubrir regularidades imprevistas. Esto justifica su complejidad y su existencia como capa.

---

## 7. Kernel mínimo

### 7.1 Definición del kernel

El kernel de Goals sería el conjunto mínimo de operaciones sin las cuales Goals no puede producir su output.

```
Kernel(Goals) = {filter_by_relevance, interpret_to_intention, prioritize}
```

Sin filtro: Goals produciría Goals incluso para Patterns irrelevantes (ineficiente, pero funcional).
Sin interpretación: Goals no podría producir intenciones (no funcional).
Sin priorización: Goals produciría Goals sin orden (funcional pero incompleto).

### 7.2 Reducción del kernel

**¿Puede `interpret_to_intention` reducirse a una lookup table?**

Sí:
```
intention = lookup_table[pattern_type + state_context]
```

Donde:
- `pattern_type` combina τ (descriptivo) + campos involucrados
- `state_context` es el estado actual (readiness, missingInfo, etc.)

Esta lookup table es:
- Finita (número finito de combinaciones)
- Estática (definida en diseño, no aprendida)
- Determinista (misma entrada → misma salida)

**Hallazgo:** El kernel de Goals se reduce a una look-up table predefinida. No hay algoritmo de inferencia, no hay modelo probabilístico, no hay descubrimiento.

### 7.3 Contraste con el kernel de Learning

| Aspecto | Kernel de Learning (PR-7F) | Kernel de Goals |
|---------|---------------------------|-----------------|
| Operaciones | Detección, cómputo de θ, ensamblaje de E | Filtro, interpretación, priorización |
| Naturaleza | Algorítmica (detecta regularidades en datos) | Declarativa (aplica reglas predefinidas) |
| Complejidad | O(|W|^k) dependiente del tamaño de datos | O(|M|) dependiente del número de Patterns |
| Descubrimiento | ✅ Sí (encuentra lo imprevisto) | ❌ No (solo asigna categorías conocidas) |
| Espacio de salida | Infinito (𝒞 es infinito) | Finito (𝒢 es finito) |

---

## 8. Comparación con Learning

### 8.1 Tabla de dimensiones matemáticas

| Dimensión | Learning | Goals |
|-----------|----------|-------|
| Input | W (secuencia de snapshots, primer orden) | M (conjunto de Patterns, segundo orden) |
| Output | ⟨P, θ, E⟩ (Patterns, segundo orden) | ⟨intention, priority, rationale⟩ (segundo orden) |
| Cambio de orden | 1° → 2° (cambio de orden real) | 2° → 2° (sin cambio de orden) |
| Descubrimiento | ✅ Sí | ❌ No |
| Espacio de salida | Infinito | Finito |
| Kernel | Algorítmico (detección) | Declarativo (lookup table) |
| Compresión abstractiva | ✅ Sí (PR-7B §5) | ❌ No |

### 8.2 ¿Existe un modelo matemático mínimo no trivial?

Learning tiene un modelo matemático rico:
```
L_γ(W) = {⟨P, θ, E⟩ | P ∈ Detect_γ(W) ∧ θ = |E|/|W^k_τ| ∧ E = support(P, W)}
```

Este modelo requiere:
- Detección: función de búsqueda en espacio de predicados
- Confianza: medida probabilística
- Evidencia: vinculación Pattern → datos

Goals tendría un modelo trivial:
```
G(M, s) = {⟨intention(c, s), priority(c, s), {c}⟩ | c ∈ M ∧ relevant(c, s)}
```

Este modelo solo requiere:
- Filtro: función booleana sobre Patterns
- Interpretación: lookup table Pattern → Intention
- Priorización: función de ordenación

**No hay modelo matemático mínimo no trivial.** La transformación de Goals es una tubería de filtrado + etiquetado.

---

## 9. Veredicto

### 9.1 Síntesis

| Hallazgo | Sección | Impacto |
|----------|---------|---------|
| Goals no cambia el orden lógico (2° → 2°) | §1-2 | ❌ Sin transformación de orden |
| El espacio de salida es finito y predecible | §2.4 | ❌ Sin descubrimiento |
| La transformación G es composición de operaciones de conjunto | §3.2 | ❌ Sin complejidad algorítmica |
| Ninguna responsabilidad de Goals es transformación ontológica | §4.2 | ❌ Solo operaciones mecánicas |
| Goals no agrega información nueva | §5 | ❌ Sin ganancia informativa |
| El kernel de Goals se reduce a una lookup table | §7 | ❌ Sin kernel algorítmico |
| Goals no tiene modelo matemático no trivial | §8 | ❌ Modelo trivial |

### 9.2 Veredicto

**Veredicto: Goals NO posee un modelo matemático mínimo que justifique su existencia como capa independiente.**

A diferencia de Learning, cuyo modelo L: 𝒲 × Γ → 𝒫(𝒞) requiere detección algorítmica, cómputo probabilístico y evidencia empírica, el modelo de Goals se reduce a:

```
G(M, s) = lookup(filter(M, s))
```

Donde:
- `filter` es una función booleana (relevancia)
- `lookup` es una tabla predefinida (Pattern → Intention)
- `sort` es una función de ordenación (prioridad)

**Esto no es una capa. Es una función de transformación de datos.** Como δ (zipWith) en Reflection, el kernel de Goals puede ser una función INTERNA de Planning.

### 9.3 Confirmación de PR-8A

PR-8A concluyó: **D — Goals debe eliminarse.**

PR-8B refuerza esta conclusión desde el modelo matemático:
- Goals no tiene un modelo matemático con la riqueza de Learning.
- Su kernel es trivial (filtro + lookup + ordenación).
- No hay cambio de orden lógico.
- No hay descubrimiento.
- No hay compresión abstractiva.

**La capa Goals es matemáticamente innecesaria.**

---

*Este documento es resultado de la auditoría matemática PR-8B. Sigue la misma metodología que PR-7B para Learning. No contiene código, no propone implementaciones, no diseña algoritmos. Es una demostración de que Goals carece de un modelo matemático mínimo que justifique su existencia como capa arquitectónica independiente.*
