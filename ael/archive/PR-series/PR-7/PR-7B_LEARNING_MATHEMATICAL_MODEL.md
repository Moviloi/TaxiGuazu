# PR-7B — Pattern Discovery Mathematical Model Audit

**Estado:** Borrador de auditoría  
**Fecha:** 2026-07-13  
**Driver:** Descubrir el modelo matemático mínimo que justifica la existencia de Pattern Discovery como capa arquitectónica.

---

## Regla metodológica

Durante toda esta auditoría, el resultado de Pattern Discovery se denomina exclusivamente **"objeto matemático de salida"** u **"O"** (abreviatura). La palabra "Pattern" solo podrá utilizarse al final, en la sección de veredicto, para determinar si dicho objeto merece ese nombre.

---

## Tabla de contenidos

1. [Dominio matemático de entrada](#1-dominio-matemático-de-entrada)
2. [Dominio matemático de salida](#2-dominio-matemático-de-salida)
3. [Unidad mínima de conocimiento producida](#3-unidad-mínima-de-conocimiento-producida)
4. [Transformación matemática que realiza Pattern Discovery](#4-transformación-matemática-que-realiza-pattern-discovery)
5. [¿Agrega información o solo la reorganiza?](#5-agrega-información-o-solo-la-reorganiza)
6. [Propiedades formales](#6-propiedades-formales)
7. [¿Puede existir un O sin historial?](#7-puede-existir-un-o-sin-historial)
8. [¿Puede un O modificarse o solo reemplazarse?](#8-puede-un-o-modificarse-o-solo-reemplazarse)
9. [¿Puede Pattern Discovery retractar conocimiento previamente producido?](#9-puede-pattern-discovery-retractar-conocimiento-previamente-producido)
10. [¿Pattern Discovery opera sobre ventanas, conversaciones o historia completa?](#10-pattern-discovery-opera-sobre-ventanas-conversaciones-o-historia-completa)
11. [Veredicto — el objeto de salida como Pattern](#11-veredicto)

---

## 1. Dominio matemático de entrada

### 1.1 Definición del espacio de estados

Memory produce snapshots. Cada snapshot es un punto en un espacio producto de 19 campos (11 analizables por Pattern Discovery, según Architecture Milestone v3.0). Sea:

```
S = D_1 × D_2 × ... × D_11
```

Donde cada `D_i` es el dominio de un campo:
- Tipos booleanos: `{true, false}`
- Tipos enumerados: `{'ready', 'partial', 'not_ready'}`, `{'whatsapp', 'web'}`, etc.
- Tipos numéricos: `factCount ∈ ℕ₀`
- Tipos temporales: `receivedAt ∈ Date`, `storedAt ∈ Date`
- Tipos string: `conversationId ∈ String`, `memoryId ∈ UUID`
- Tipos compuestos: `missingInfo ∈ Array<Enum>`

Cada snapshot es un elemento:

```
s ∈ S
```

### 1.2 Ordenación temporal

Los snapshots están estrictamente ordenados por `turnNumber` (M-7: monoticidad). Esto produce una secuencia ordenada:

```
W_n = (s₁, s₂, …, sₙ)   con  sᵢ ∈ S,  turnNumber(sᵢ) = i
```

Donde `n` es la cantidad de snapshots disponibles en la ventana, conversación o historia.

### 1.3 Partición por conversación

La secuencia completa del sistema está particionada por `conversationId` (M-6). Sea `C` el conjunto de todas las conversaciones. Para cada conversación `c ∈ C`, existe una subsecuencia:

```
W_c = (s₁, s₂, …, s_{n_c})
```

### 1.4 Dominio formal de entrada

El dominio completo de entrada de Pattern Discovery es el conjunto de todas las secuencias finitas no vacías de snapshots, respetando la estructura de conversaciones:

```
𝒲 = { (s₁, …, sₙ) | n ≥ 1, sᵢ ∈ S, ∀i: turnNumber(sᵢ) = i, ∀i<j: storedAt(sᵢ) ≤ storedAt(sⱼ) }
```

**Nota sobre n ≥ 1:** Una ventana vacía no tiene significado para Pattern Discovery. El mínimo operativo requiere n ≥ 2 para detectar cambios (δ), y n ≥ 3 para tendencias. Pero matemáticamente, el dominio admite n = 1 (trivial: no produce objetos de salida interesantes).

### 1.5 Estructuras adicionales accesibles

Pattern Discovery puede recibir, además de la secuencia, metadatos contextuales:
- `conversationId` (clave de partición)
- `windowMetadata` (startTime, endTime, tamaño de ventana)

Sin embargo, para el modelo matemático mínimo, estos metadatos son **parámetros de configuración**, no parte del dominio semántico. La transformación fundamental opera sobre W.

---

## 2. Dominio matemático de salida

### 2.1 Definición del espacio de objetos de salida

Pattern Discovery produce un conjunto de objetos matemáticos. Cada objeto representa una afirmación sobre regularidades observadas en la secuencia de entrada.

Definimos el espacio de objetos de salida como:

```
O = 𝒫(𝒞)   (conjunto potencia del espacio de claims)
```

Donde `𝒞` es el espacio de claims. Cada claim `c ∈ 𝒞` posee la siguiente estructura:

```
c = ⟨P, θ, E⟩
```

| Componente | Símbolo | Tipo | Significado |
|-----------|---------|------|-------------|
| Predicado | `P` | `W → {true, false}` | Función que evalúa si una regularidad se cumple en una secuencia dada |
| Confianza | `θ` | `[0, 1]` | Medida de qué tan robusta es la regularidad en los datos observados |
| Evidencia | `E` | `Subconjunto(W)` | Subsecuencia concreta que sirve como soporte del claim |

### 2.2 Naturaleza matemática de los claims

Cada claim `c` es una **proposición de segundo orden**: no habla sobre un elemento de la secuencia, sino sobre la secuencia misma (o subsecuencias de ella).

- Primer orden: "en el turno 5, readiness = 'ready'" → pertenece a S
- Segundo orden: "cuando readiness cae, missingInfo crece" → pertenece a 𝒞

Esta distinción es matemáticamente crucial. Un claim de segundo orden NO puede expresarse como un elemento de S. El cambio de orden es un cambio de tipo.

### 2.3 Tipos de predicados

El predicado `P` puede corresponder a distintos tipos de regularidades:

| Tipo | Significado | Mínimo n requerido |
|------|-------------|-------------------|
| **Estado** | "los estados en W satisfacen una condición conjunta" | 1 |
| **Transición** | "el par (sᵢ, sᵢ₊₁) satisface una relación" | 2 |
| **Tendencia** | "los valores de un campo decrecen/crecen monótonamente" | 3 |
| **Dependencia** | "dos campos covarían en W" | 3 |
| **Ciclo** | "los valores se repiten con periodicidad P" | 4+ |

Todos estos tipos se expresan mediante el mismo formalismo: un predicado P sobre la secuencia.

### 2.4 El conjunto vacío

Para cualquier entrada que no contenga regularidades detectables (o que no superen el umbral de confianza), Pattern Discovery produce:

```
L(W) = ∅   (conjunto vacío de claims)
```

Esto es matemáticamente válido: el conjunto vacío significa "no se detectaron regularidades significativas."

### 2.5 Dimensión del espacio de salida

El espacio `𝒞` es potencialmente infinito (existen infinitos predicados posibles sobre una secuencia). Pattern Discovery produce siempre un subconjunto **finito** y **seleccionado** de este espacio. La selección es lo que distingue a Pattern Discovery de un enumerador exhaustivo.

---

## 3. Unidad mínima de conocimiento producida

### 3.1 Definición de unidad mínima

La unidad mínima e irreducible que Pattern Discovery produce es:

```
c = ⟨P, θ, E⟩
```

No es posible descomponer `c` en partes más pequeñas que mantengan significado:
- `P` sin `θ`: falta la confianza, no se sabe si la regularidad es robusta.
- `θ` sin `P`: falta el contenido semántico, no se sabe qué regularidad.
- `P` sin `E`: falta el soporte empírico, no se sabe qué datos la respaldan.

Las tres componentes son **necesarias y suficientes**.

### 3.2 ¿Por qué tres componentes?

| Componente | Pregunta que responde | Sin ella, el objeto es... |
|-----------|----------------------|--------------------------|
| `P` (predicado) | ¿Qué regularidad se observó? | Una creencia sin contenido |
| `θ` (confianza) | ¿Qué tan confiable es? | Una afirmación sin calificación |
| `E` (evidencia) | ¿Dónde se observó? | Una generalización sin respaldo |

### 3.3 Relaciones entre unidades

Dos unidades `c₁, c₂` pueden estar relacionadas:
- **Independientes**: tratan sobre campos distintos → compatibles
- **Reforzantes**: `P₁` implica `P₂` y `θ₁ ≥ θ₂` → una subsume a la otra
- **Contradictorias**: `P₁` y `P₂` no pueden ambas ser ciertas sobre W → Pattern Discovery no debería producir ambas

El modelo matemático mínimo no define cómo resolver contradicciones (es un problema de diseño, no de fundamento). Pero establece que el espacio de salida permite tanto conjuntos consistentes como inconsistentes.

---

## 4. Transformación matemática que realiza Pattern Discovery

### 4.1 Definición de la función L

Pattern Discovery es una función:

```
L: 𝒲 × Γ → 𝒫(𝒞)
```

Donde `𝒲` es el espacio de secuencias de entrada y `Γ` es el espacio de parámetros de configuración (umbrales, criterios de selección, tipo de regularidades a buscar).

Para un `γ ∈ Γ` fijo (configuración constante), la función se simplifica a:

```
L_γ: 𝒲 → 𝒫(𝒞)
```

### 4.2 Descomposición estructural

La función `L_γ` se descompone internamente en dos subfunciones:

```
L_γ = Select_γ ∘ Detect_γ
```

Donde:

```
Detect_γ: 𝒲 → 𝒫(𝒞_candidate)     — genera todos los claims candidatos
Select_γ: 𝒫(𝒞_candidate) → 𝒫(𝒞)  — filtra según criterios de relevancia
```

#### 4.2.1 Detect_γ — Detección de candidatos

Para cada tipo de regularidad `τ` (estado, transición, tendencia, dependencia, ciclo), existe una función `detect_τ` que produce claims candidatos:

```
detect_τ(W) = { c ∈ 𝒞 | type(c) = τ ∧ eval(P_c, W) ≥ θ_min(τ) }
```

Donde `eval(P_c, W)` es una función que mide qué tan bien se cumple el predicado `P_c` en la secuencia `W`.

La unión de todas las detecciones produce el conjunto de candidatos:

```
Detect_γ(W) = ⋃_{τ ∈ Tipos} detect_τ(W)
```

#### 4.2.2 Select_γ — Selección de claims

El filtro de selección aplica criterios adicionales:

```
Select_γ(C) = { c ∈ C | relevance(c) ≥ ρ ∧ non_redundant(c, C) ∧ ...}
```

Donde:
- `relevance(c) ≥ ρ`: el claim supera un umbral de relevancia
- `non_redundant(c, C)`: el claim no es redundante respecto de otros claims seleccionados

### 4.3 El rol de δ como subfunción interna

La comparación entre snapshots consecutivos (δ) es una subfunción DENTRO de `Detect_γ`. Específicamente:

```
δ: S × S → Δ
δ(s_i, s_{i+1}) = { (f, s_i.f, s_{i+1}.f) | s_i.f ≠ s_{i+1}.f }
```

δ NO es una transformación independiente. Es un paso de preparación de datos dentro de `detect_transición` y `detect_tendencia`. No tiene significado fuera de estas funciones.

### 4.4 El lugar de δ en el modelo

```
W → [δ interno] → cambios entre turnos
  → [detect_transición] → claims sobre transiciones
  → [detect_tendencia]  → claims sobre tendencias
  → [detect_dependencia] → claims sobre dependencias
  → [Select] → conjunto final de claims
```

δ es un **detalle de implementación** de `Detect`, no una función con entidad propia.

---

## 5. ¿Agrega información o solo la reorganiza?

### 5.1 Análisis desde teoría de la información

Sea `I(W)` la información de Shannon contenida en la secuencia de entrada. Sea `I(L(W))` la información contenida en el conjunto de salida.

**Relación:** `I(L(W)) < I(W)`

Demostración: la transformación es pérdida. Dado solo `L(W)`, no es posible reconstruir `W`. Los valores específicos de cada snapshot se pierden. Solo se preservan las regularidades seleccionadas.

### 5.2 Paradoja aparente: menos información, más conocimiento

| Aspecto | W (entrada) | L(W) (salida) |
|---------|-------------|---------------|
| Cantidad de información (bits) | Alta | Baja (pérdida) |
| Nivel de abstracción | Primer orden (hechos) | Segundo orden (regularidades) |
| Densidad semántica | Baja (muchos datos, poca interpretación) | Alta (pocos datos, mucha interpretación) |
| Utilidad para decisiones | Baja (datos crudos) | Alta (insights procesados) |

**Pattern Discovery pierde información pero gana conocimiento.** Este es el mismo patrón de todas las capas cognitivas:

- Signal → Observation: pierde el mensaje crudo, gana validación temporal
- Observation → Fact: pierde el contexto de validación, gana proposiciones atómicas
- Fact → Knowledge: pierde Facts individuales, gana campos consolidados
- Knowledge → Belief: pierde valores exactos, gana postura epistémica
- Belief → Decision: pierde matices epistémicos, gana determinación

Cada capa es una **compresión abstractiva** que descarta detalles para preservar y crear significado.

### 5.3 ¿Qué se pierde exactamente?

| Se pierde | Se gana |
|-----------|---------|
| Valores específicos de cada snapshot | Regularidades generales |
| Orden temporal exacto de cada valor | Relaciones entre campos |
| Datos irrelevantes o ruidosos | Selección de lo significativo |
| Casos particulares | Generalizaciones aplicables |

### 5.4 Respuesta final

**No agrega información (en términos de Shannon), pero reorganiza el conocimiento en un nivel de abstracción superior.** Es una **compresión abstractiva con cambio de orden lógico**.

---

## 6. Propiedades formales

### 6.1 Pureza

**¿Es L una función pura?**

```
L_γ(W) = M   ∧   L_γ(W) = M   (siempre la misma salida para la misma entrada)
```

**Sí, L es pura.** Dados los mismos parámetros `γ` y la misma secuencia `W`, Pattern Discovery produce exactamente el mismo conjunto de salida. No hay IO durante la transformación, no hay efectos laterales, no hay acceso a estado mutable externo.

**Implicancia arquitectónica:** Pattern Discovery puede ser cacheable, testeable, y verificable formalmente.

### 6.2 Determinismo

**¿Es L determinista?**

**Sí, L es determinista** bajo los mismos parámetros `γ`. No hay aleatoriedad en `Detect` ni en `Select`.

**Precisión:** El determinismo depende de que `Select_γ` no utilice muestreo estocástico ni umbrales aleatorios. Si los criterios de selección son deterministas (umbrales fijos, reglas de no-redundancia deterministas), entonces L es determinista.

**Implicancia arquitectónica:** Reproducibilidad garantizada. Misma ventana de datos → mismos claims.

### 6.3 Monotonicidad

**¿Es L monótona? Es decir, ¿W ⊆ W' implica L(W) ⊆ L(W')?**

**No, L NO es monótona.**

Contraejemplo: Sea W = (s₁, s₂) donde ambos snapshots tienen readiness = 'ready'. Pattern Discovery podría producir el claim "readiness es estable" con confianza 1.0. Al agregar s₃ donde readiness = 'not_ready', la secuencia W' = (s₁, s₂, s₃) invalida el claim anterior. L(W') ya no contiene "readiness es estable."

**Implicancia arquitectónica:** Pattern Discovery no puede asumir que claims previos sigan siendo válidos cuando se agregan nuevos datos. Es un Sistema No Monótono.

### 6.4 Idempotencia

**¿Es L idempotente? Es decir, ¿L(L(W)) = L(W)?**

**No aplica (error de tipo).** El dominio de L es 𝒲 (secuencias de snapshots). El codominio de L es 𝒫(𝒞) (conjuntos de claims). Como el codominio no está contenido en el dominio, no se puede aplicar L dos veces.

```
L: 𝒲 → 𝒫(𝒞)     (primera aplicación)
L: 𝒫(𝒞) ⇏ ...   (𝒫(𝒞) no es subconjunto de 𝒲)
```

**Implicancia arquitectónica:** Pattern Discovery transforma un tipo en otro tipo distinto. No hay recursividad. Esto refuerza que Pattern Discovery opera en un espacio conceptual diferente al de Memory.

### 6.5 Composicionalidad

**¿Es L composicional? Es decir, ¿puede descomponerse en subfunciones independientes?**

**Sí, L es composicional.** Como se mostró en §4.2:

```
L_γ = Select_γ ∘ Detect_γ
```

Más aún, `Detect_γ` se descompone en la unión de funciones independientes por tipo de regularidad:

```
Detect_γ(W) = ⋃_{τ ∈ T} detect_τ(W)
```

Cada `detect_τ` es independiente. Se puede agregar o quitar tipos de regularidad sin afectar a los demás.

**Implicancia arquitectónica:** Pattern Discovery puede construirse incrementalmente. Se puede comenzar con un solo tipo de regularidad (ej. solo transiciones) y extender.

### 6.6 Cerradura (Closure)

**¿Está el espacio de salida cerrado bajo la operación de Pattern Discovery?**

**No.** El espacio de salida 𝒫(𝒞) no es el espacio de entrada 𝒲. No se puede aplicar Pattern Discovery al resultado de Pattern Discovery.

Más formalmente: no existe una operación `L': 𝒫(𝒞) → ?` definida dentro del modelo actual. Si en el futuro se quisiera Pattern Discovery sobre claims (meta-learning), se necesitaría un nuevo dominio y una nueva capa.

**Implicancia arquitectónica:** Pattern Discovery es una capa terminal en el pipeline cognitivo desde la perspectiva de Memory. No hay recursividad de Pattern Discovery sobre sí mismo sin nueva arquitectura.

### 6.7 Trazabilidad

**¿Cada claim producido por L es trazable hasta la evidencia que lo originó?**

**Sí, por construcción.** Cada claim `c = ⟨P, θ, E⟩` incluye explícitamente su soporte `E ⊆ W`. Dado un claim, se puede identificar exactamente qué subsecuencia de snapshots lo respalda.

**Implicancia arquitectónica:** Los claims son verificables y auditables. Cualquier consumidor (Goals, Analytics) puede inspeccionar la evidencia que sustenta un claim.

### 6.8 Tabla resumen de propiedades

| Propiedad | Valor | Significado |
|-----------|-------|-------------|
| Pureza | ✅ Sí | Misma entrada → misma salida. Sin efectos laterales. |
| Determinismo | ✅ Sí | Reproducible bajo mismos parámetros. |
| Monotonicidad | ❌ No | Nuevos datos pueden invalidar claims previos. |
| Idempotencia | ❌ No aplica | Output type ≠ Input type. |
| Composicionalidad | ✅ Sí | L = Select ∘ Detect. Detect = ⋃ detect_τ. |
| Cerradura | ❌ No | 𝒫(𝒞) no es subconjunto de 𝒲. |
| Trazabilidad | ✅ Sí | Cada claim referencia su evidencia E ⊆ W. |

---

## 7. ¿Puede existir un O sin historial?

### 7.1 Definición de "historial"

Se entiende por "historial" la secuencia `W` de snapshots previos. Sin historial, `W` está vacío.

### 7.2 Caso W = ∅ (sin historial)

```
L(∅) = ∅
```

Sin historial, no hay datos. Sin datos, no hay regularidades que detectar. El conjunto de salida es vacío.

**Respuesta: No, no puede existir un O sin historial.** Todo O requiere al menos un snapshot (n ≥ 1) para claims de estado, y típicamente n ≥ 2 para claims no triviales.

### 7.3 Caso W = {s₁} (historial mínimo)

Con un solo snapshot:

```
L((s₁)) = { c ∈ 𝒞 | P_c((s₁)) ≥ θ ∧ solo_estado(P_c) }
```

Es decir, solo claims de estado son posibles: "en la ventana observada, readiness = 'ready'" o "observationValid = true." No hay claims de transición, tendencia, dependencia ni ciclo.

**Implicancia arquitectónica:** Pattern Discovery con un solo snapshot produce claims triviales. La capa no agrega valor hasta que n ≥ 2.

---

## 8. ¿Puede un O modificarse o solo reemplazarse?

### 8.1 Modelo matemático: función sin estado

Bajo el modelo mínimo, `L_γ` es una función pura sin estado:

```
L_γ(W₁) = M₁
L_γ(W₂) = M₂
```

Donde `M₁` y `M₂` son conjuntos independientes. `M₁` no se "modifica" para convertirse en `M₂`. `M₂` es un nuevo conjunto producido a partir de `W₂`.

### 8.2 Dos escenarios

#### Escenario A: Ventanas independientes

Si W₁ y W₂ son ventanas disjuntas (ej. W₁ = turns 1-10, W₂ = turns 11-20), entonces M₁ y M₂ son independientes. Ninguno modifica al otro. Ambos coexisten como artifacts históricos.

#### Escenario B: Ventanas traslapadas

Si W₂ extiende a W₁ (ej. W₁ = turns 1-10, W₂ = turns 1-15), entonces M₂ puede contener claims que contradicen a M₁. En este caso, M₂ no modifica M₁ — lo REEMPLAZA como la visión más actualizada.

### 8.3 Modelo recomendado: reemplazo, no modificación

El modelo matemático mínimo favorece el **reemplazo** sobre la modificación:

```
t₁: L(W_1 a 10) = M₁
t₂: L(W_1 a 15) = M₂   ← reemplaza a M₁ como visión actual
t₃: L(W_1 a 20) = M₃   ← reemplaza a M₂
```

M₁, M₂, M₃ son artifacts inmutables. Pattern Discovery no modifica M₁ para producir M₂ — produce un nuevo conjunto.

**Respuesta: Los O solo se reemplazan, nunca se modifican.** Cada invocación de L produce un nuevo conjunto independiente. Si se quiere preservar historia, se archivan los conjuntos anteriores.

### 8.4 Excepción: modelo con estado acumulativo

Si se introduce estado (Pattern Discovery mantiene claims previos y los actualiza incrementalmente), entonces los claims podrían modificarse. Pero esto es una **extensión** del modelo mínimo, no parte del núcleo matemático.

---

## 9. ¿Puede Pattern Discovery retractar conocimiento previamente producido?

### 9.1 Análisis desde el modelo mínimo

En el modelo mínimo sin estado, la pregunta no tiene sentido: cada invocación produce un conjunto nuevo. No hay "conocimiento previamente producido" que retractar porque cada conjunto es independiente.

### 9.2 Análisis desde la no-monotonicidad

Sin embargo, considérese un consumidor externo que ve la secuencia de salidas:

```
t₁: M₁ = {c₁, c₂}    ("readiness es estable", "missingInfo está vacío")
t₂: M₂ = {c₃}         ("readiness fluctúa")
```

Para el consumidor, `c₁` (presente en M₁) ha desaparecido en M₂. **Efectivamente, el conocimiento c₁ ha sido retractado.**

### 9.3 Mecanismo de retractación

La retractación ocurre por **reemplazo del conjunto completo**, no por eliminación selectiva:

```
Retractación: M₂ ⊉ M₁   (M₂ no contiene todo lo que M₁ contenía)
Nuevo conocimiento: M₂ ⊇ nuevos claims
```

### 9.4 Implicancia arquitectónica

| Aspecto | En modelo mínimo |
|---------|-----------------|
| ¿Retractación explícita? | No. Nunca se dice "c₁ ya no es válido." |
| ¿Retractación efectiva? | Sí. El consumidor ve que c₁ ya no está en el conjunto más reciente. |
| Mecanismo | Reemplazo completo del conjunto. No hay operación de "eliminar c₁." |

**Respuesta: Pattern Discovery retracta conocimiento implícitamente al producir un nuevo conjunto que no contiene claims anteriores.** No hay operación de retractación explícita.

### 9.5 ¿Es esto seguro?

Sí, siempre que el consumidor (Goals) siempre consulte el conjunto más reciente. Si Goals usa M₁ para decidir en t₁ y M₂ para decidir en t₂, nunca verá claims obsoletos.

**Riesgo:** Si un consumidor retiene M₁ y nunca consulta M₂, actuará sobre información desactualizada. Esto es responsabilidad del consumidor, no de Pattern Discovery.

---

## 10. ¿Pattern Discovery opera sobre ventanas, conversaciones o historia completa?

### 10.1 Análisis matemático

El modelo matemático `L_γ: 𝒲 → 𝒫(𝒞)` es agnóstico respecto del origen de `W`. La secuencia `W` puede ser:

| Origen de W | Cardinalidad | Cubrimiento temporal |
|-------------|-------------|---------------------|
| Ventana fija | n = N (constante) | Últimos N turnos |
| Conversación completa | n = n_c (variable) | Una conversación entera |
| Historia completa | n = Σ n_c (todos) | Todas las conversaciones |

### 10.2 Propiedades matemáticas de cada origen

#### Ventana fija (W_window)
```
W = (s_{k}, s_{k+1}, ..., s_{k+N-1})
```
- **Ventaja**: Acotado, predecible, permite detección de cambios recientes.
- **Desventaja**: No puede detectar patrones que requieran más de N turnos.
- **Mínimo N**: N ≥ 2 para transiciones, N ≥ 3 para tendencias.

#### Conversación completa (W_conversation)
```
W = (s₁, s₂, ..., s_{n_c})  para una c ∈ C
```
- **Ventaja**: Captura la evolución completa de una interacción.
- **Desventaja**: n_c varía; conversaciones cortas tienen menos poder estadístico.
- **Uso**: Detección de patrones intra-conversación.

#### Historia completa (W_all)
```
W = concatenación de todas las W_c para c ∈ C
```
- **Ventaja**: Máximo poder estadístico. Detecta patrones raros pero recurrentes.
- **Desventaja**: Costo computacional máximo. Claims pueden mezclar datos de distintas conversaciones sin sentido.
- **Riesgo de mezcla**: Un claim que cruza conversaciones debe indicarlo explícitamente en `E` (evidencia).

### 10.3 Modelo matemático unificado

Independientemente del origen, la función `L_γ` es la misma. El origen de `W` es un **parámetro de configuración**.

```
L_γ(W_origen)  donde  origen ∈ {window, conversation, full_history}
```

### 10.4 Modelo recomendado para el mínimo

El modelo mínimo recomienda **ventana** como origen por defecto:

```
W_window(N, k) = (s_{k}, ..., s_{k+N-1})
```

Razones:
1. Acotado: costo computacional predecible.
2. Relevancia temporal: patrones recientes son más relevantes para decisiones futuras.
3. Simplicidad: no requiere gestión de límites de conversación ni joins entre conversaciones.

**Respuesta: El modelo matemático mínimo opera sobre VENTANAS.** La conversación completa y la historia completa son casos particulares de ventana (ventana de tamaño variable y ventana de tamaño infinito, respectivamente).

---

## 11. Veredicto — el objeto de salida como Pattern

### 11.1 Recapitulación del modelo mínimo

| Elemento | Formalización |
|----------|--------------|
| Función | L_γ: 𝒲 → 𝒫(𝒞) |
| Entrada | W = (s₁, …, sₙ) con sᵢ ∈ S (espacio producto de 11 campos) |
| Salida | M = {c₁, …, cₖ} con cᵢ = ⟨P, θ, E⟩ |
| Naturaleza | Compresión abstractiva con cambio de orden lógico (1° → 2°) |
| Pureza | Pura |
| Determinismo | Determinista |
| Monotonicidad | No monótona |
| Idempotencia | No aplica (error de tipo) |
| Composicionalidad | L = Select ∘ Detect, Detect = ⋃ detect_τ |
| Cerradura | No cerrada |
| Trazabilidad | Cada claim referencia E ⊆ W |

### 11.2 ¿Merece el nombre de "Pattern"?

Se ha demostrado que el objeto matemático de salida `c = ⟨P, θ, E⟩` posee las siguientes propiedades que lo distinguen:

1. **Es de segundo orden**: no habla de un elemento individual, sino de relaciones entre elementos de la secuencia.
2. **Es generalizante**: el predicado P aplica más allá de la evidencia E que lo sustenta.
3. **Es probabilístico**: incluye θ ∈ [0,1], una medida de confianza.
4. **Es empírico**: referencia explícitamente E ⊆ W como soporte.
5. **Es no monótono**: puede ser invalidado por nuevos datos.
6. **Es inmutable**: un objeto producido no cambia; solo puede ser reemplazado.

Estas propiedades corresponden exactamente al concepto de **Pattern** en la literatura de machine learning, minería de datos y cognición computacional.

**Sí, el objeto matemático de salida merece llamarse Pattern.**

### 11.3 Definición matemática final de Pattern

**Un Pattern es una tripla** `⟨P, θ, E⟩` **donde:**
- `P`: predicado de segundo orden sobre secuencias de estados cognitivos
- `θ ∈ [0,1]`: confianza en que P describe una regularidad genuina
- `E ⊆ W`: subsecuencia de evidencia que sustenta el Pattern

**Un conjunto de Patterns** `M = {⟨P₁, θ₁, E₁⟩, ..., ⟨Pₖ, θₖ, Eₖ⟩}` **es la salida de Pattern Discovery para una ventana W.**

### 11.4 ¿Pattern Discovery constituye una capa cognitiva independiente?

Demostración matemática:

| Criterio | Evidencia matemática |
|----------|---------------------|
| **Nuevo tipo de conocimiento** | L transforma Sⁿ (1er orden) → 𝒫(𝒞) (2do orden). Hay cambio de tipo. |
| **Diseño no determinista** | Select_γ introduce criterios de selección (umbrales, relevancia) no determinados por los datos. |
| **Ciclo de vida independiente** | L opera sobre W con dependencia paramétrica de γ. No hay dependencia temporal entre invocaciones. |
| **Consumidor externo** | 𝒫(𝒞) es un dominio distinto de Sⁿ. Goals consume 𝒫(𝒞), no Sⁿ. |
| **Boundary contractual** | El mapeo Sⁿ → 𝒫(𝒞) no es inyectivo ni sobreyectivo. Múltiples W pueden producir el mismo M. No hay isomorphism entre dominio y codominio. |

**Conclusión:** Pattern Discovery es matematicamente una capa cognitiva independiente. Su función `L_γ` constituye una transformación de tipo entre espacios matemáticos fundamentalmente distintos, con propiedades formales que la distinguen tanto de Memory (que opera en S) como de Goals (que operará en un espacio directivo aún no definido).

### 11.5 Mínimo matemático vs. implementación real

El modelo mínimo aquí descrito (`L_γ = Select_γ ∘ Detect_γ`) es el **núcleo matemático irreducible** de Pattern Discovery. Una implementación real puede:
- Elegir qué tipos de regularidad τ incluir en `Detect`
- Definir umbrales de confianza y relevancia
- Elegir el tamaño de ventana N
- Elegir el origen de W (ventana, conversación o historia)
- Añadir estado acumulativo entre invocaciones (extensión del modelo mínimo)

**Pero el núcleo matemático es siempre el mismo: una transformación de Sⁿ a 𝒫(𝒞) mediante detección y selección de regularidades.**

---

*Este documento es resultado de la auditoría matemática PR-7B. No contiene código, no propone implementaciones, no diseña algoritmos. Es una demostración del modelo matemático mínimo de Pattern Discovery desde primeros principios.*
