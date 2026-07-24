# PR-7C — Pattern Discovery Parameter Space & Evidence Audit

**Estado:** Borrador de auditoría  
**Fecha:** 2026-07-13  
**Driver:** Cerrar el modelo matemático de Pattern Discovery antes de derivar contratos técnicos.  

---

## Regla

Este documento NO diseña APIs, interfaces, clases ni estructuras de código. Es exclusivamente un análisis matemático del espacio de parámetros Γ y del modelo de evidencia E.

---

## Tabla de contenidos

- [A. Espacio de parámetros Γ](#a-espacio-de-parámetros-γ)
  - [A.1 ¿Qué representa exactamente Γ?](#a1-qué-representa-exactamente-γ)
  - [A.2 ¿Pertenece al modelo matemático o al runtime?](#a2-pertenece-al-modelo-matemático-o-al-runtime)
  - [A.3 ¿Es fijo, configurable o aprendible?](#a3-es-fijo-configurable-o-aprendible)
  - [A.4 ¿Puede cambiar sin modificar Pattern Discovery?](#a4-puede-cambiar-sin-modificar-pattern-discovery)
  - [A.5 ¿Forma parte del contrato público?](#a5-forma-parte-del-contrato-público)
  - [A.6 ¿Debe versionarse?](#a6-debe-versionarse)
  - [A.7 ¿Puede existir más de un Γ simultáneamente?](#a7-puede-existir-más-de-un-γ-simultáneamente)
- [B. Modelo de evidencia](#b-modelo-de-evidencia)
  - [B.1 ¿Qué es exactamente E?](#b1-qué-es-exactamente-e)
  - [B.2 ¿Es un conjunto, secuencia o multiconjunto?](#b2-es-un-conjunto-secuencia-o-multiconjunto)
  - [B.3 ¿Puede haber múltiples evidencias equivalentes?](#b3-puede-haber-múltiples-evidencias-equivalentes)
  - [B.4 Relación de equivalencia entre evidencias](#b4-relación-de-equivalencia-entre-evidencias)
  - [B.5 Propiedades algebraicas](#b5-propiedades-algebraicas)
  - [B.6 Impacto en trazabilidad](#b6-impacto-en-trazabilidad)
  - [B.7 Impacto en deduplicación](#b7-impacto-en-deduplicación)
  - [B.8 Impacto en almacenamiento](#b8-impacto-en-almacenamiento)
- [C. Integración Γ × E en el modelo completo](#c-integración-γ--e-en-el-modelo-completo)

---

## A. Espacio de parámetros Γ

### A.1 ¿Qué representa exactamente Γ?

Γ es el espacio de parámetros que **selecciona una función específica** dentro de la familia de funciones que Pattern Discovery puede realizar. En el modelo de PR-7B:

```
L_γ: 𝒲 → 𝒫(𝒞)    con   γ ∈ Γ
```

Cada `γ` **elige un miembro** de la familia `{L_γ | γ ∈ Γ}`. Sin `γ`, la transformación está subdeterminada.

#### A.1.1 Composición interna de Γ

Γ es el producto cartesiano de subespacios de parámetros, cada uno responsable de un aspecto de la transformación:

```
Γ = Γ_detect × Γ_select × Γ_compute
```

| Subespacio | Rol | Elementos típicos |
|-----------|-----|-------------------|
| **Γ_detect** | Controla qué regularidades se buscan | Tipos de regularidad habilitados (τ), tamaños de ventana por tipo, umbrales mínimos por tipo |
| **Γ_select** | Controla qué claims sobreviven | Umbral de confianza mínimo (θ_min), umbral de relevancia (ρ), criterios de no-redundancia |
| **Γ_compute** | Controla cómo se miden las regularidades | Función de confianza (frecuencia, bayesiana, etc.), métrica de relevancia, función de agregación |

#### A.1.2 Γ no es un conjunto arbitrario

Γ tiene estructura. No cualquier combinación de valores es válida:

```
γ ∈ Γ  ⟺  γ_detect ∈ Γ_detect  ∧  γ_select ∈ Γ_select  ∧  γ_compute ∈ Γ_compute
                 ∧  consistent(γ_detect, γ_select, γ_compute)
```

Donde `consistent` asegura que los subespacios no se contradigan (ej. no pedir detección de tendencias si la ventana es menor a 3 turnos).

#### A.1.3 Γ define el comportamiento, no el contenido

```
γ controla CÓMO se detectan y seleccionan las regularidades.
W  controla QUÉ regularidades existen en los datos.
M  es el resultado de aplicar γ sobre W.
```

Γ y W son ortogonales: γ determina el método; W determina el contenido.

---

### A.2 ¿Pertenece Γ al modelo matemático o al runtime?

#### A.2.1 Pertenencia matemática

Γ pertenece al **modelo matemático** porque sin él la función L está subdeterminada. Formalmente:

- El modelo sin parámetros: `L: 𝒲 → 𝒫(𝒞)` — no especifica qué regularidades detectar ni cómo seleccionarlas. Es una función abstracta sin contenido operativo.
- El modelo con parámetros: `L: 𝒲 × Γ → 𝒫(𝒞)` — especifica completamente la transformación.

El modelo matemático REQUIERE Γ. No hay L sin γ.

#### A.2.2 Pertenencia al runtime

En ejecución, `γ` tiene un comportamiento distinto a `W`:

| Aspecto | W | γ |
|---------|---|----|
| Variabilidad | Cambia en cada invocación | Cambia solo entre despliegues |
| Origen | Memory (datos del sistema) | Configuración (operador humano o sistema) |
| Frecuencia de cambio | Alta (por turno/ventana) | Baja (por versión/despliegue) |
| Predictibilidad | Impredecible | Conocido y controlado |

#### A.2.3 Resolución

Γ pertenece al **modelo matemático** como parte del dominio de L, pero en runtime se comporta como **configuración estable** (no como dato variable).

```
En el modelo:     L: 𝒲 × Γ → 𝒫(𝒞)   (γ es parámetro formal)
En runtime:       γ se fija al iniciar; solo W varía
```

Esta dualidad es normal en modelos matemáticos de sistemas parametrizados (ej. en estadística: `f(x; μ, σ)` donde μ y σ son parámetros formales pero se fijan antes de observar x).

---

### A.3 ¿Es Γ fijo, configurable o aprendible?

#### A.3.1 Los tres regímenes

| Régimen | Significado | Ejemplo en Γ |
|---------|-------------|-------------|
| **Fijo** | No cambia nunca. Hardcodeado en la definición de L. | `γ_compute.funcion_de_confianza = frecuencia_relativa` |
| **Configurable** | Puede cambiar sin modificar la definición de L. Establecido por el operador. | `γ_detect.tipos = {transición, tendencia}` |
| **Aprendible** | Puede optimizarse a partir de datos (meta-learning). | `γ_select.θ_min = aprendido de outcomes históricos` |

#### A.3.2 Distribución recomendada por subespacio

| Subespacio | Recomendación | Justificación |
|-----------|--------------|---------------|
| Γ_detect | Configurable | El operador decide qué tipos de regularidad buscar. |
| Γ_select | Configurable | Los umbrales dependen del caso de uso (una app crítica necesita θ más alto). |
| Γ_compute | Fijo | La función de confianza debe ser estable para que los resultados sean comparables. |
| (Futuro) | Aprendible | Meta-learning es una extensión, no parte del modelo mínimo. |

#### A.3.3 Regla del modelo mínimo

En el modelo mínimo, Γ es **parcialmente fijo, parcialmente configurable**:

```
Γ = Γ_fijo × Γ_configurable

|Γ_fijo| ≥ 1   (al menos la función de confianza es fija)
|Γ_configurable| ≥ 1   (al menos un parámetro debe ser ajustable)
```

Nada en Γ es aprendible en el modelo mínimo. Eso pertenece a una capa superior (meta-learning).

---

### A.4 ¿Puede cambiar γ sin modificar Pattern Discovery?

#### A.4.1 Dependencia de la definición

Cambiar γ **no modifica la función L**, solo selecciona un miembro diferente de la familia:

```
γ₁ → L_{γ₁}: comportamiento A
γ₂ → L_{γ₂}: comportamiento B

Pero L (la función abstracta) es la misma.
```

Análogo matemático: `f(x) = a·x + b`. Cambiar `a` y `b` no modifica `f` como función afín; solo cambia sus parámetros.

#### A.4.2 Condición para cambio sin modificación

γ puede cambiar sin modificar Pattern Discovery SI Y SOLO SI γ es **configurable** (no fijo). Es decir:

```
γ ∈ Γ_configurable  →  cambio permitido sin modificar L
γ ∈ Γ_fijo          →  cambio requiere modificar L
```

#### A.4.3 Implicancia arquitectónica

Esto implica que la arquitectura de Pattern Discovery debe tener un **punto de inyección de configuración** explícitamente separado del código de la transformación. Este punto NO es una API ni una interfaz — es un **reconocimiento matemático** de que Γ_configurable existe y debe poder asignarse externamente.

---

### A.5 ¿Forma γ parte del contrato público?

#### A.5.1 Dos contratos, dos respuestas

| Contrato | ¿γ es parte? | ¿Quién lo ve? |
|----------|-------------|---------------|
| **Contrato de consumo** (Pattern Discovery → Goals) | **No.** Goals consume `M = L_γ(W)`. Goals no necesita saber qué γ produjo M, solo qué claims contiene M. | Goals |
| **Contrato de despliegue** (operador → Pattern Discovery) | **Sí.** El operador necesita saber qué γ está activo para predecir el comportamiento de Pattern Discovery. | Operador humano o sistema |

#### A.5.2 Justificación matemática

Desde el punto de vista del consumidor:

```
∀γ₁, γ₂ ∈ Γ:  si L_{γ₁}(W) = L_{γ₂}(W), entonces Goals no puede distinguir γ₁ de γ₂.
```

Goals solo observa el OUTPUT. γ es invisible a menos que afecte M. Si dos γ diferentes producen el mismo M para un W dado, son indistinguibles para el consumidor.

#### A.5.3 Resolución

γ NO forma parte del contrato público de consumo.
γ FORMA parte del contrato público de despliegue.

Esta distinción es importante: no toda la configuración de una capa debe exponerse a sus consumidores.

---

### A.6 ¿Debe versionarse γ?

#### A.6.1 Argumento a favor

Diferentes γ producen diferentes comportamientos de L. Sin versionado:

- No se puede reproducir un resultado pasado si no se sabe qué γ lo generó.
- No se puede hacer A/B testing sin identificar qué γ usó cada brazo.
- No se puede auditar: "¿qué configuración produjo este claim?"

#### A.6.2 Argumento en contra

Si γ es estable (cambia raramente), versionar es sobreingeniería. Un timestamp de despliegue basta.

#### A.6.3 Resolución

γ DEBE versionarse. No necesariamente con un sistema complejo (semver), pero al menos con un identificador único que permita:

```
γ_version_id = hash(γ)   (determinista, reproducible)
```

O, si se prefiere un enfoque más rico:

```
γ_version_id = v1.0, v1.1, v2.0, ...
```

El modelo matemático no prescribe el mecanismo de versionado, pero SÍ exige que **dos invocaciones con diferente γ** puedan distinguirse, y que **dos invocaciones con el mismo γ** produzcan el mismo resultado para el mismo W.

#### A.6.4 Implicancia en la salida

Cada conjunto de salida M debería poder asociarse con su γ (no necesariamente dentro de M, pero sí en el registro de invocación):

```
⟨γ, W, M⟩  trío trazable
```

Sin esto, la trazabilidad de M está incompleta (no se sabe qué configuración lo produjo).

---

### A.7 ¿Puede existir más de un γ simultáneamente?

#### A.7.1 Sí, y hay razones arquitectónicas para ello

| Escenario | γ₁ | γ₂ | Propósito |
|-----------|----|----|-----------|
| **Shadow mode** | γ_prod | γ_experimental | Probar nueva configuración sin afectar producción |
| **A/B testing** | γ_control | γ_tratamiento | Comparar comportamientos en diferentes conversaciones |
| **Multi-tenancy** | γ_segmento_A | γ_segmento_B | Diferentes configuraciones para diferentes usuarios |
| **Progressive rollout** | γ_v1 | γ_v2 | Migrar gradualmente de una configuración a otra |

#### A.7.2 Formalización

Múltiples γ simultáneos requieren:

```
Para cada conversación c ∈ C:
  γ_c = asignación(c)   (qué configuración se aplica a esta conversación)
  M_c = L_{γ_c}(W_c)   (resultado con esa configuración)
```

La función de asignación `asignación: C → Γ` puede ser:
- **Determinista**: basada en hash(conversationId) mod N
- **Explícita**: basada en etiqueta de segmento asociada a la conversación
- **Aleatoria**: basada en muestreo

#### A.7.3 Implicancia matemática

Múltiples γ simultáneos implican que NO hay una única función L_γ en el sistema. Hay MÚLTIPLES instancias de L con diferentes γ, potencialmente produciendo diferentes resultados para el mismo W.

Esto es matemáticamente válido: `L_{γ₁}(W)` y `L_{γ₂}(W)` son simplemente dos funciones diferentes aplicadas al mismo input.

#### A.7.4 Riesgo

Si Goals consume M de diferentes γ sin saberlo, puede recibir claims inconsistentes. **Goals debe saber qué γ produjo cada M**, o consumir solo M de un γ autorizado.

Esto refuerza A.6: γ debe ser trazable hasta la salida.

---

## B. Modelo de evidencia

### B.1 ¿Qué es exactamente E?

#### B.1.1 Definición

E es el **soporte empírico** de un claim c = ⟨P, θ, E⟩. Es la subestructura de la ventana W que satisface el predicado P y justifica la confianza θ.

#### B.1.2 Dependencia del tipo de claim

La ARIDAD de E depende del tipo de regularidad:

| Tipo de regularidad | Aridad | Elemento de evidencia e | Significado |
|--------------------|--------|------------------------|-------------|
| **Estado** | k=1 | e = sᵢ (un snapshot) | "este snapshot satisface la condición" |
| **Transición** | k=2 | e = (sᵢ, sᵢ₊₁) (par consecutivo) | "este par de snapshots satisface la relación" |
| **Tendencia** | k≥3 | e = (sᵢ, ..., sᵢ₊ₖ₋₁) (ventana de k) | "esta subsecuencia exhibe la tendencia" |
| **Dependencia** | k=2 | e = (sᵢ, sⱼ) (pares no necesariamente consecutivos) | "estos dos snapshots muestran covarianza entre campos" |

**Formalmente:** Para un claim de aridad k, cada elemento de evidencia `e` es un elemento de `W^k` (el conjunto de todas las k-tuplas extraíbles de W según la regla de extracción específica al tipo).

#### B.1.3 La regla de extracción

No todas las k-tuplas de W califican como evidencia. La regla de extracción `ε_τ` para el tipo `τ` define qué subconjunto de `W^k` se considera:

```
E_τ(W) = { e ∈ W^k | ε_τ(e) ∧ P(e) }
```

Donde `ε_τ` es la regla de muestreo del tipo τ:
- `ε_estado`: solo snapshots individuales → `{s₁, s₂, ..., sₙ}`
- `ε_transición`: solo pares consecutivos → `{(s₁,s₂), (s₂,s₃), ..., (sₙ₋₁,sₙ)}`
- `ε_dependencia`: todos los pares ordenados → `{(sᵢ,sⱼ) | i < j}`

#### B.1.4 E es un conjunto de testigos

Cada `e ∈ E` es un **testigo** de que el predicado P se cumple en una instancia concreta. La colección de testigos es lo que permite calcular θ (confianza) como la proporción de testigos que satisfacen la condición respecto del total de posibles testigos.

---

### B.2 ¿Es E un conjunto, secuencia o multiconjunto?

#### B.2.1 Análisis

| Estructura | ¿Aplica? | Problema |
|-----------|----------|----------|
| **Secuencia** | ❌ | El orden de los elementos de evidencia no es relevante. E no necesita preservar orden. |
| **Multiconjunto** | ❌ | Los duplicados no agregan información. Si el mismo par (s₅, s₆) se observa dos veces (imposible porque W es una secuencia), la segunda observación no agrega evidencia. |
| **Conjunto** | ✅ | Cada elemento de evidencia es único. La pertenencia es la operación relevante. |

#### B.2.2 Demostración de que E debe ser conjunto

Dado que W es una secuencia de snapshots distintos (cada snapshot tiene turnNumber único):

```
∀i ≠ j: sᵢ ≠ sⱼ   (M-5: inmutabilidad, M-7: turnNumber monótono)
```

Las k-tuplas extraídas de W también son únicas (cada tupla contiene al menos un snapshot con turnNumber único). Por lo tanto:

```
∀e₁, e₂ ∈ W^k: e₁ ≠ e₂ si difieren en al menos un snapshot
```

No puede haber elementos duplicados en E porque no hay elementos duplicados en W^k. Por lo tanto, E es un **conjunto**.

#### B.2.3 Formalización

```
E ⊆ W^k
E = {e ∈ W^k | ε_τ(e) ∧ P(e)}

|E| = count{e ∈ W^k | ε_τ(e) ∧ P(e)}
θ = |E| / |{e ∈ W^k | ε_τ(e)}|   (para confianza frecuentista)
```

Donde:
- `W^k` es el universo de elementos de aridad k extraíbles de W
- `ε_τ` filtra solo los elementos que tienen sentido para el tipo τ
- `P` selecciona aquellos que satisfacen la regularidad

---

### B.3 ¿Puede haber múltiples evidencias equivalentes?

#### B.3.1 Sí, por dos razones

**Razón 1: Diferentes subconjuntos, mismo P**

Dos subconjuntos diferentes de `W^k` pueden satisfacer el mismo predicado P:

```
Sean E₁, E₂ ⊆ W^k, con E₁ ≠ E₂.
Si ∀e ∈ E₁ ∪ E₂: P(e), entonces tanto E₁ como E₂ soportan el claim ⟨P, θ, E⟩.
```

Ejemplo: Para P = "readiness = 'ready'", E₁ = {s₁, s₃, s₅} y E₂ = {s₂, s₄, s₆} son diferentes pero ambos soportan P.

**Razón 2: Diferentes tamaños, mismo P y mismo θ**

Dos conjuntos de evidencia de diferente tamaño pueden producir el mismo θ:

```
Sean E₁, E₂ ⊆ W^k con |E₁| ≠ |E₂| pero |E₁|/N = |E₂|/N.
Ambos producen el mismo θ pero difieren en cantidad de evidencia.
```

Ejemplo: Para N=10, E₁ con 5 elementos y E₂ con 5 elementos diferentes producen θ = 0.5.

#### B.3.2 ¿Son realmente equivalentes?

Depende de qué se considere "equivalente":

- **Equivalentes para P**: ambos soportan el mismo predicado → SÍ
- **Equivalentes para θ**: ambos producen el mismo valor de confianza → SÍ si |E₁| = |E₂|
- **Equivalentes para el claim completo**: 
  - Si E₁ ≠ E₂: NO son equivalentes porque la evidencia difiere
  - Si solo P y θ importan al consumidor: SÍ son funcionalmente equivalentes

---

### B.4 Relación de equivalencia entre evidencias

#### B.4.1 Definición formal

Sean E₁, E₂ ⊆ W^k. Definimos la relación de equivalencia:

```
E₁ ∼_P E₂  ⟺  P(E₁) = P(E₂)  ∧  |E₁| = |E₂|
```

Donde `P(E)` se interpreta como "el predicado P se evalúa como verdadero para cada elemento de E."

(Por definición, P es verdadero para cada elemento de E si E fue construida como `{e ∈ W^k | ε_τ(e) ∧ P(e)}`. Así que `P(E₁) = P(E₂)` es siempre verdadero si E₁ y E₂ fueron construidas correctamente. La condición realmente relevante es `|E₁| = |E₂|`.)

#### B.4.2 Refinamiento necesario

La equivalencia anterior es demasiado débil. Una relación más útil:

```
E₁ ≡ E₂  ⟺  ∃P, τ, W:  E₁ = {e ∈ W^k | ε_τ(e) ∧ P(e)} ∧ E₂ = {e ∈ W^k | ε_τ(e) ∧ P(e)}
```

Es decir, E₁ y E₂ son equivalentes si son EL MISMO CONJUNTO definido por el mismo P y τ sobre la misma W.

Pero esto es la igualdad, no la equivalencia. Para una equivalencia genuina:

```
E₁ ∼ E₂  ⟺  ∀P, τ:  |{e ∈ E₁ | P(e)}| / |E₁| = |{e ∈ E₂ | P(e)}| / |E₂|
```

Dos conjuntos de evidencia son equivalentes si, para cualquier predicado P, producen la misma proporción de elementos que satisfacen P. Esto implica que E₁ y E₂ son **estadísticamente intercambiables** para cualquier cómputo de confianza.

#### B.4.3 Propiedades de ∼

```
Reflexividad:  E ∼ E                              ✅
Simetría:      E₁ ∼ E₂  ⇒  E₂ ∼ E₁               ✅
Transitividad: E₁ ∼ E₂ ∧ E₂ ∼ E₃  ⇒  E₁ ∼ E₃     ✅
```

∼ es una relación de equivalencia. Las clases de equivalencia particionan el espacio de evidencias en grupos de conjuntos estadísticamente intercambiables.

#### B.4.4 Clase canónica

Para cada clase de equivalencia, existe un **representante canónico**: el conjunto máximo de esa clase (la unión de todos los conjuntos equivalentes):

```
E_canonical(E) = {e ∈ W^k | P(e)}   (el conjunto de TODOS los elementos que satisfacen P)
```

Este representante es ÚNICO para cada par (P, W, τ). Cualquier E con el mismo P, W, τ es subconjunto del canónico.

**Implicancia:** Para un claim ⟨P, θ, E⟩ dado, la evidencia E siempre puede normalizarse a E_canonical, que es la evidencia completa (TODO lo que en W satisface P). Esto simplifica deduplicación y almacenamiento.

---

### B.5 Propiedades algebraicas

#### B.5.1 El espacio ℰ(W) como retículo

Sea `ℰ_τ(W) = {E ⊆ W^k | E = {e ∈ W^k | ε_τ(e) ∧ P(e)} para algún P}` el conjunto de todos los posibles conjuntos de evidencia de tipo τ sobre W.

**ℰ_τ(W) tiene estructura de RETÍCULO DISTRIBUTIVO**:

| Operación | Definición | Resultado |
|-----------|-----------|-----------|
| Unión | E₁ ∪ E₂ | Conjunto de elementos que satisfacen P₁ o P₂ |
| Intersección | E₁ ∩ E₂ | Conjunto de elementos que satisfacen P₁ y P₂ |
| Complemento | E^c = W^k \ E | Conjunto de elementos que NO satisfacen P |
| Inclusión | E₁ ⊆ E₂ | Todos los elementos de E₁ están en E₂ |
| Diferencia | E₁ \ E₂ | Elementos que satisfacen P₁ pero no P₂ |

#### B.5.2 Propiedades

| Propiedad | Fórmula | ¿Se cumple? |
|-----------|---------|-------------|
| Asociatividad | (E₁ ∪ E₂) ∪ E₃ = E₁ ∪ (E₂ ∪ E₃) | ✅ sí |
| Conmutatividad | E₁ ∪ E₂ = E₂ ∪ E₁ | ✅ sí |
| Idempotencia | E ∪ E = E, E ∩ E = E | ✅ sí |
| Absorción | E₁ ∪ (E₁ ∩ E₂) = E₁ | ✅ sí |
| Distributividad | E₁ ∩ (E₂ ∪ E₃) = (E₁ ∩ E₂) ∪ (E₁ ∩ E₃) | ✅ sí |
| Elemento neutro (unión) | ∅ ∪ E = E | ✅ sí |
| Elemento neutro (intersección) | W^k ∩ E = E | ✅ sí |

#### B.5.3 Cardinalidad y confianza

La confianza θ se define como una función sobre el retículo:

```
θ: ℰ_τ(W) → [0, 1]
θ(E) = |E| / |W^k_τ|
```

Donde `W^k_τ = {e ∈ W^k | ε_τ(e)}` es el universo de posibles elementos de evidencia de tipo τ.

Esta función es:
- **Monótona**: E₁ ⊆ E₂ ⇒ θ(E₁) ≤ θ(E₂) — pero solo si el universo es el mismo. Cuidado: θ depende del universo, no solo de E.
- **Aditiva**: si E₁ ∩ E₂ = ∅, entonces θ(E₁ ∪ E₂) = θ(E₁) + θ(E₂) — pero solo si el universo de ambos es el mismo.
- **Normalizada**: θ(W^k_τ) = 1, θ(∅) = 0.

#### B.5.4 Monotonicidad de θ (precaución)

θ NO es monótona en el sentido naive. Si se agregan nuevos snapshots a W (extendiendo la ventana), el universo `W^k_τ` cambia. θ puede subir o bajar aunque E crezca.

Ejemplo:
- W₁ = (s₁, s₂) con ambos 'ready': E = {s₁, s₂}, θ = 2/2 = 1.0
- W₂ = (s₁, s₂, s₃) con s₃ = 'not_ready': E = {s₁, s₂}, θ = 2/3 ≈ 0.67

Aunque E no cambió, θ bajó porque el universo cambió. Esto refuerza la no-monotonicidad de L (PR-7B §6.3).

---

### B.6 Impacto en trazabilidad

#### B.6.1 Trazabilidad directa

Dado un claim c = ⟨P, θ, E⟩ con E = {e₁, ..., eₘ}:

```
Para cada e ∈ E:
  e ∈ W^k            → e es trazable a elementos de la ventana original
  Cada elemento de e tiene memoryId y turnNumber → trazable a snapshots concretos
```

La trazabilidad es **elemento a elemento**: cada testigo e es direccionable individualmente.

#### B.6.2 Verificación independiente

Con E disponible, un verificador puede:

```
1. Recibir c = ⟨P, θ, E⟩
2. Para cada e ∈ E: verificar que P(e) = true
3. Calcular θ' = |E| / |W^k_τ| (si tiene acceso a W)
4. Verificar que θ' = θ
```

Sin E, el verificador solo puede confiar en que Pattern Discovery computó correctamente. Con E, puede verificar independientemente.

#### B.6.3 Trazabilidad sin E completa

Si no se preserva E completo, se pierde trazabilidad:

| Escenario | ¿Trazable? | Riesgo |
|-----------|-----------|--------|
| E completo preservado | ✅ Sí | — |
| Solo |E| preservado | ❌ Parcial | No se puede verificar cada elemento |
| Solo θ preservado | ❌ No | No se puede verificar nada |
| Nada preservado (solo P) | ❌ No | Claim no verificable |

#### B.6.4 Costo de trazabilidad

E es el componente más grande de un claim. Preservar E completo tiene costo:
- Almacenamiento: |E| × sizeof(reference)
- Transferencia: si E se transmite a Goals junto con c

Compensación: E puede ser **opcional** en el contrato de consumo (Goals no necesita E), pero debe ser **obligatorio** en el registro interno de Pattern Discovery (para auditoría).

---

### B.7 Impacto en deduplicación

#### B.7.1 Deduplicación basada en E

Dos claims:
```
c₁ = ⟨P₁, θ₁, E₁⟩
c₂ = ⟨P₂, θ₂, E₂⟩
```

| Caso | Relación | Acción |
|------|----------|--------|
| P₁ = P₂ ∧ E₁ = E₂ | DUPLICADO EXACTO | Eliminar uno |
| P₁ = P₂ ∧ E₁ ≠ E₂ | MISMO PREDICADO, DIFERENTE EVIDENCIA | Unificar: E = E₁ ∪ E₂, re-calcular θ |
| P₁ ≠ P₂ ∧ E₁ = E₂ | DIFERENTE PREDICADO, MISMA EVIDENCIA | Conservar ambos (son diferentes interpretaciones) |
| P₁ implica P₂ ∧ E₁ ⊆ E₂ | REDUNDANCIA | Conservar solo el más general o el más específico (decisión de Select_γ) |

#### B.7.2 Regla de deduplicación mínima

En el modelo mínimo, se aplica la regla más estricta:

```
c₁ y c₂ son duplicados si P₁ = P₂ ∧ |E₁| = |E₂| ∧ θ₁ = θ₂
```

Esto elimina solo duplicados perfectos. No intenta detectar redundancias semánticas ni unificar evidencias.

#### B.7.3 Unificación de evidencia como extensión

Una extensión posible (no parte del modelo mínimo) es la unificación:

```
c₁ = ⟨P, θ₁, E₁⟩
c₂ = ⟨P, θ₂, E₂⟩
→ c_unificado = ⟨P, θ_unificado, E₁ ∪ E₂⟩
```

Donde θ_unificado se recalcula sobre la evidencia combinada. Esto reduce el tamaño del conjunto de salida M pero requiere una decisión explícita en Select_γ.

---

### B.8 Impacto en almacenamiento

#### B.8.1 Estructura de almacenamiento

Cada claim c = ⟨P, θ, E⟩ requiere almacenar:

| Componente | Tamaño estimado | Naturaleza |
|-----------|----------------|-----------|
| P (predicado) | Pequeño (descripción de regularidad) | Casi fijo, independiente de |W| |
| θ (confianza) | 8 bytes (float64) | Fijo |
| E (evidencia) | |E| × tamaño_de_referencia | Crece con |W| |
| Metadatos | Pequeño (timestamps, ids) | Casi fijo |

#### B.8.2 Costo de E (referencias vs. inline)

| Estrategia | Costo por elemento e | Costo para |E|=100 | Recuperación |
|-----------|---------------------|----------|-------------|
| Referencia: `(memoryId, turnNumber)` | ~36 bytes (UUID 32 + int 4) | ~3.6 KB | Requiere consultar Memory |
| Referencia: `(conversationId, turnNumber)` | ~38 bytes (string 34 + int 4) | ~3.8 KB | Requiere consultar Memory |
| Inline: valores completos | ~200 bytes (11 campos) | ~20 KB | Autocontenido |

#### B.8.3 Compresión por evidencia canónica

Si E se normaliza a E_canonical = {e ∈ W^k | P(e)} (B.4.4), entonces:

```
E_canonical es determinista: dado W, P y τ, E es siempre el mismo conjunto máximos.
```

Esto permite que E NO se almacene explícitamente, sino que se RECONSTRUYA a partir de P y W si es necesario:

```
E_canonical(P, τ, W) = {e ∈ W^k | ε_τ(e) ∧ P(e)}
```

**Implicancia:** Almacenar E es REDUNDANTE si W y P están disponibles. E puede omitirse del almacenamiento permanente y recalcularse bajo demanda para auditoría.

**Riesgo:** Si W ya no está disponible (ventana descartada), E no puede reconstruirse. Se pierde trazabilidad.

#### B.8.4 Recomendación para el modelo mínimo

| Contexto | Almacenar E | No almacenar E |
|----------|-------------|-----------------|
| W disponible permanentemente | ✅ Optativo (reconstruible) | ✅ Eficiente |
| W descartable | ✅ Obligatorio | ❌ Pérdida de trazabilidad |
| Claims transmitidos a Goals | ❌ Goals no necesita E | ✅ |
| Claims archivados para auditoría | ✅ Obligatorio | ❌ |

El modelo mínimo define que E es **opcional en transmisión** pero debe ser **reconstruible** (ya sea porque W persiste o porque E se almacena).

---

## C. Integración Γ × E en el modelo completo

### C.1 Relación entre Γ y E

Γ y E interactúan a través de la función de confianza:

```
θ(E, γ) = γ_compute.funcion_de_confianza(E, W^k_τ)
```

Donde `γ_compute` (parte de Γ) determina CÓMO se calcula θ a partir de E. Diferentes γ_compute producen diferentes θ para el mismo E.

### C.2 La tríada completa

El modelo matemático completo de Pattern Discovery es:

```
L: 𝒲 × Γ → 𝒫(𝒞)

Donde:
  𝒲 = {secuencias ordenadas de snapshots}
  Γ = Γ_detect × Γ_select × Γ_compute
  𝒞 = {c = ⟨P, θ, E⟩ | P es predicado de aridad k, θ ∈ [0,1], E ⊆ W^k}
  
Y:
  L_γ(W) = Select_γ(Detect_γ(W))
  Detect_γ(W) = ⋃_{τ ∈ γ_detect.tipos} {⟨P, θ, E⟩ | P ∈ candidatos_τ(W, γ)}
  Select_γ(C) = {c ∈ C | θ(c) ≥ γ_select.θ_min ∧ relevante(c, γ_select)}
```

### C.3 Cierre del modelo matemático

Con la incorporación de Γ y E, el modelo matemático de Pattern Discovery está **completo**:

| Componente | Definido en | Estado |
|-----------|-------------|--------|
| L | PR-7B | ✅ |
| Input 𝒲 | PR-7B | ✅ |
| Output 𝒫(𝒞) | PR-7B | ✅ |
| Unidad mínima c = ⟨P, θ, E⟩ | PR-7B | ✅ |
| Propiedades formales | PR-7B | ✅ |
| Parámetros Γ | PR-7C (esta) | ✅ |
| Evidencia E | PR-7C (esta) | ✅ |
| Relación Γ × E | PR-7C (esta) | ✅ |

**Próximo paso:** PR-7D — derivar los contratos técnicos a partir de este modelo matemático completo.

---

*Este documento es resultado de la auditoría PR-7C. No contiene APIs, interfaces, clases ni estructuras de código. Es un análisis puramente matemático del espacio de parámetros y del modelo de evidencia de Pattern Discovery.*
