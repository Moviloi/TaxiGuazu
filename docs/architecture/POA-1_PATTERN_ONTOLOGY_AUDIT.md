# POA-1 — Pattern Ontology Audit

> **Fecha:** 2026-07-14  
> **Precedencia:** Memory operacional (OP-1), MRC-1, PBA-1, PR-7B (modelo matemático), ADR-010  
> **Driver:** Determinar la ontología fundamental de Pattern ahora que Memory existe como sistema real  
> **Rol:** Arquitecto Principal — sistemas cognitivos y descubrimiento de patrones

---

## Preámbulo

Pattern Discovery será la próxima capa del pipeline cognitivo. Memory existe, está operacional, y acumula snapshots reales.

Este documento determina la **ontología fundamental de Pattern** — no cómo implementarlo, no cómo almacenarlo, no qué algoritmo usará. Sino: **¿qué ES un Pattern?**

Se evalúan definiciones candidatas. Cada una es sometida a refutación adversarial. Solo las que sobreviven constituyen la ontología.

---

## 1. Memoria del dominio

Antes de definir Pattern, establezco qué existe:

### 1.1 Infraestructura real

| Elemento | Estado | Evidencia |
|----------|:------:|-----------|
| `MemorySnapshot[19]` | ✅ Implementado | 19 campos inmutables. 16 snapshots reales en DB. |
| `MemoryRead` | ⏳ Diseñado | MRC-1: `querySnapshots()` → MemorySnapshot[]. |
| Projection Boundary | ✅ Auditado | PBA-1: PD proyecta internamente 19→11. Memory no transforma. |
| `CognitiveReadiness` | ✅ Definido | `'ready' | 'partial' | 'invalid'` |
| Feature flag | ✅ Operacional | `COGNITIVE_MEMORY_ENABLED=true` en producción. |

### 1.2 Datos observados (OP-1)

De 16 snapshots reales:
- **100%** `decision_readiness = 'ready'`
- **100%** `decision_is_decided = 1`
- **100%** `memory_id` UUID válido
- **100%** `belief_id` y `decision_id` no vacíos
- TurnNumber monotónico, sin duplicados

Estos datos imponen restricciones ontológicas: cualquier definición de Pattern debe poder distinguir entre **regularidades por diseño** (invariantes del EE/Memory) y **regularidades descubiertas** (patrones genuinos).

---

## 2. Evaluación de definiciones candidatas

Cada definición es evaluada adversarialmente. Se intenta refutar. Si la refutación es exitosa, la definición se descarta o se refina.

### 2.1 Definición α — "Un Pattern es una repetición"

**Enunciado:** Un Pattern es un elemento o valor que aparece más de una vez en el conjunto de snapshots.

**Intento de refutación:**
- `turnNumber` se repite en el sentido de que existe en cada snapshot. No es un Pattern — es un field de Metadata.
- `decision_is_decided = 1` aparece en 16/16 snapshots. Es una repetición. Pero ES por diseño (el EE siempre completa la decisión si produce `isComplete=true`). No es un descubrimiento.
- Dos snapshots con `channel='whatsapp'` — repetición. Pero es trivial (el canal no cambia durante una conversación).

**✅ Refutación exitosa.** Repetición es necesaria pero no suficiente. Un Pattern debe ser una repetición NO trivial (no por diseño, no por necesidad).

---

### 2.2 Definición β — "Un Pattern es una correlación"

**Enunciado:** Un Pattern es una covarianza entre dos o más campos del snapshot a través de múltiples snapshots.

**Intento de refutación:**
- `isDecided=true` correlaciona perfectamente con `readiness='ready'` en nuestros 16 snapshots. Pero es una correlación por DISEÑO del EE (cuando la decisión está completa, ambas flags se setean).
- `belief_observationValid=true` correlaciona con `belief_isWellFormed=true`. Probablemente también por diseño.
- Una correlación descubierta sería: `channel='whatsapp'` → `hasContent=true`. Esto NO es por diseño del EE — emerge del comportamiento del usuario. Es genuinamente descubierta.

**Refinamiento necesario:** Un Pattern es una correlación NO diseñada explícitamente en el EE o Memory.

**✅ Definición sobrevive con refinamiento.** Correlación es parte de la ontología, pero debe distinguirse correlación diseñada vs. correlación emergente.

---

### 2.3 Definición γ — "Un Pattern es una regularidad"

**Enunciado:** Un Pattern es una propiedad estable observada a través de múltiples snapshots.

**Intento de refutación:**
- "channel='whatsapp'" es estable en una conversación. Es una regularidad. Pero es una PROPIEDAD del snapshot, no una relación ENTRE snapshots.
- Una regularidad observacional no es un Pattern — es un DATO. El Pattern es la GENERALIZACIÓN que explica la regularidad.
- Regularidad = "todos los snapshots de esta conversación tienen channel='whatsapp'". Pattern = "los usuarios de esta conversación siempre usan WhatsApp" (que es trivialmente cierto — es el mismo usuario).

**Refinamiento necesario:** Regularidad es la MATERIA PRIMA del Pattern. El Pattern es la FORMALIZACIÓN de la regularidad como una proposición generalizable.

**✅ Definición sobrevive con refinamiento.** Regularidad ≠ Pattern. Pattern es la formalización de la regularidad.

---

### 2.4 Definición δ — "Un Pattern es una hipótesis"

**Enunciado:** Un Pattern es una proposición testeable sobre la relación entre campos del snapshot, que puede ser confirmada o refutada por nuevos snapshots.

**Intento de refutación:**
- Una hipótesis es EPISTÉMICA (sobre nuestro conocimiento). Un Pattern es ONTOLÓGICO (sobre la estructura de los datos).
- "Hipótesis: readiness se mantiene estable durante la conversación" — si se confirma con 100 snapshots, ¿deja de ser hipótesis y pasa a ser Pattern? ¿O sigue siendo hipótesis con alta confianza?
- El modelo PR-7B captura esto con θ (confianza). Un Pattern CON θ alto sigue siendo un Pattern, no deja de serlo. La confianza es un atributo, no un cambio de estado.

**✅ Refutación exitosa.** Pattern no es una hipótesis — es una proposición respaldada por evidencia, con confianza cuantificable. La hipótesis es el MECANISMO de descubrimiento, no la ONTOLOGÍA del resultado.

---

### 2.5 Definición ε — "Un Pattern es una propiedad emergente"

**Enunciado:** Un Pattern es una propiedad del CONJUNTO de snapshots que no existe en ningún snapshot individual.

**Intento de refutación:**
- "La secuencia tiene longitud 10" — es una propiedad del conjunto, emerge de tener 10 snapshots. Pero NO es un Pattern significativo.
- "La confianza de readiness crece monótonamente con turnNumber" — emerge del conjunto. NO está en ningún snapshot individual. SÍ es un Pattern significativo.
- Toda propiedad de conjunto es emergente. No toda propiedad emergente es un Pattern.

**Refinamiento necesario:** Emergencia es necesaria. Pero el Pattern debe ser una emergencia INFORMATIVA — que reduzca incertidumbre sobre el sistema.

**✅ Definición sobrevive con refinamiento.** Emergencia es el MODO DE EXISTENCIA del Pattern (existe en el conjunto, no en el individuo). Pero se necesita un criterio de informatividad.

---

### 2.6 Definición ζ — "Un Pattern es una compresión"

**Enunciado:** Un Pattern es una descripción del conjunto de snapshots que es más corta que la lista de snapshots individuales.

**Intento de refutación:**
- 10 snapshots con `isDecided=true`: "isDecided siempre true" comprime 10 bits en ~3 palabras. Es compresión. Es Pattern.
- 10 snapshots con valores aleatorios: no hay compresión. No hay Pattern.
- La compresión es una CONSECUENCIA del Pattern, no su ESENCIA. Un Pattern COMPRIME porque CAPTURA una regularidad. La regularidad es la causa, la compresión es el efecto.

**✅ Refutación exitosa.** Compresión es una MÉTRICA del valor del Pattern, no su definición ontológica.

---

### 2.7 Definición η — "Un Pattern es una relación entre variables"

**Enunciado:** Un Pattern es una relación matemática (función, correlación, implicación) entre dos o más campos del snapshot, observada a través de múltiples snapshots.

**Intento de refutación:**
- `if isDecided=true then readiness='ready'` — es una relación entre variables. Es un Pattern? O es una invariante del diseño?
- Necesitamos distinguir entre relaciones DISEÑADAS (el EE garantiza que si isDecided entonces readiness='ready') y relaciones EMERGENTES (si channel='whatsapp' entonces isDecided=true con 95% de confianza).
- La relación matemática es la FORMA del Pattern. La NO-TRIVIALIDAD es lo que lo califica como Pattern descubierto.

**Refinamiento necesario:** Un Pattern es una relación matemática NO TRIVIAL entre variables del snapshot, a través de snapshots. "No trivial" = "no garantizada por el diseño del sistema."

**✅ Definición sobrevive con refinamiento.** Es la más cercana a la ontología fundamental.

---

### 2.8 Tabla de refutaciones

| Definición | ¿Sobrevive? | Estado final |
|:-----------|:-----------:|--------------|
| α — Repetición | ❌ Refutada | Necesaria pero no suficiente |
| β — Correlación | ✅ Refinada | Correlación EMERGENTE, no diseñada |
| γ — Regularidad | ✅ Refinada | Regularidad formalizada como proposición |
| δ — Hipótesis | ❌ Refutada | Confunde mecanismo con ontología |
| ε — Emergencia | ✅ Refinada | Emergencia INFORMATIVA |
| ζ — Compresión | ❌ Refutada | Es métrica, no ontología |
| η — Relación | ✅ Refinada | Relación NO TRIVIAL entre variables |

---

## 3. Ontología mínima de Pattern

### 3.1 Definición fundamental

> **Un Pattern es una proposición de segundo orden que captura una relación no trivial entre variables del MemorySnapshot, observada a través de múltiples snapshots, con respaldo empírico cuantificable.**

### 3.2 Desglose de la definición

| Componente | Significado | Implicancia |
|------------|-------------|-------------|
| **Proposición de segundo orden** | Habla sobre el CONJUNTO de snapshots, no sobre un snapshot individual | No es un dato, es una generalización |
| **Relación no trivial** | No está garantizada por el diseño del EE, Memory, o sus invariantes | Descubierta, no diseñada |
| **Entre variables del MemorySnapshot** | Opera sobre los 11 campos analizables (proyectados internamente por PD) | Limitado al espacio de estados cognitivos |
| **A través de múltiples snapshots** | Requiere ≥ 2 snapshots como mínimo ontológico | n ≥ 2 (contra n ≥ 1 que permite Pattern trivial) |
| **Respaldo empírico cuantificable** | Tiene θ (confianza), support (soporte), lift (elevación) medibles | No es especulación — es evidencia |

### 3.3 Dimensiones del Pattern

Un Pattern puede existir en una o más de estas dimensiones:

```
Dimensión              Variables que relaciona       Mínimo ontológico
─────────────────────────────────────────────────────────────────────
Intra-snapshot         Dos campos del mismo snapshot  n = 2 snapshots
  (ej: readiness e     (ej: readiness → isDecided)    (necesita 2+ para
   isDecided)                                          medir consistencia)

Inter-snapshot         Mismo campo en turnos          n = 2 snapshots
  (ej: readiness       consecutivos                   (necesita 2 turnos
   a través de turnos) (ej: readiness se mantiene)     para detectar cambio)

Cross-conversación     Mismo patrón en distintas      n = 2 conversaciones
  (ej: canal y         conversaciones                 (necesita 2 convs
   readiness en       (ej: canal whatsapp →           para detectar
   distintas convs)    readiness 'ready' 95%)          divergencia)
```

### 3.4 Lo que un Pattern NO es

| No es | Por qué |
|-------|---------|
| Un MemorySnapshot individual | Primer orden. El Pattern es segundo orden. |
| Una invariante del sistema | M-1 a M-14 son por diseño. Patterns son descubiertos. |
| Una agregación (sum, count, avg) | Agregación es estadística descriptiva. Pattern es relacional. |
| Un goal o prescripción | Pattern describe lo que ES, no lo que DEBERÍA SER. |
| Una función de utilidad | Pattern no mide valor — mide regularidad. |
| Una predicción | Pattern puede USARSE para predecir, pero no ES una predicción. |
| Un cluster o segmentación | Cluster agrupa. Pattern relaciona. Son conceptos distintos. |

---

## 4. Unidad mínima de conocimiento

### 4.1 Definición formal

La unidad mínima e irreducible de conocimiento que Pattern Discovery produce es:

```
Π = ⟨R, θ, E, D⟩
```

| Componente | Símbolo | Tipo | Significado |
|------------|---------|------|-------------|
| **Relación** | `R` | `MemorySnapshot[] → {true, false}` | Predicado de segundo orden que evalúa si la relación se cumple en una secuencia dada |
| **Confianza** | `θ` | `[0, 1]` | Medida de robustez de la relación en los datos observados |
| **Evidencia** | `E` | `MemorySnapshot[]` | Subsecuencia concreta que respalda la relación |
| **Dimensión** | `D` | `{'intra', 'inter', 'cross'}` | Dimensión ontológica en la que existe el Pattern |

### 4.2 Justificación de los 4 componentes

| Componente | Pregunta que responde | ¿Es irreducible? |
|------------|-----------------------|:----------------:|
| `R` | ¿Qué relación se observó? | ✅ Sin ella, no hay contenido |
| `θ` | ¿Qué tan confiable es? | ✅ Sin ella, no hay calificación |
| `E` | ¿Dónde se observó? | ✅ Sin ella, no hay respaldo |
| `D` | ¿En qué dimensión existe? | ✅ Sin ella, no hay contexto ontológico |

**Diferenciación del modelo PR-7B:**

| Elemento | PR-7B | POA-1 | Razón del cambio |
|----------|:-----:|:-----:|------------------|
| Componentes | `⟨P, θ, E⟩` | `⟨R, θ, E, D⟩` | `P` → `R` (más específico: relación, no cualquier predicado). `D` es nuevo — los datos de OP-1 muestran que la dimensión ontológica es necesaria para interpretar el Pattern. |
| `D` como cuarta componente | Ausente | Presente | Un Pattern intra-snapshot (readiness→isDecided) es ontológicamente distinto de uno inter-snapshot (readiness crece con turnNumber). Sin `D`, no se puede distinguir. |

### 4.3 Ejemplos de Patterns

**Pattern intra-snapshot:**
```
R: readiness = 'ready' → isDecided = true
θ: 1.0 (100% de los snapshots)
E: [snapshots_1, snapshot_2, ...] (los 16 snapshots de OP-1)
D: 'intra'
Evaluación: ES trivial (invariante de diseño del EE). PD debe filtrarlo.
```

**Pattern inter-snapshot:**
```
R: turnNumber aumenta → readiness se mantiene en 'ready'
θ: 1.0
E: [snapshots de conv_224: turnos 1, 2, 3]
D: 'inter'
Evaluación: NO trivial en conversaciones multi-turno. Sujetos a refutación en conv más largas.
```

**Pattern cross-conversación (hipotético):**
```
R: channel = 'whatsapp' → factCount ≥ 1
θ: 0.85
E: [snapshots de 12 conversaciones distintas]
D: 'cross'
Evaluación: NO trivial. Emerge del comportamiento del usuario.
```

---

## 5. Responsabilidades

### 5.1 Responsabilidades de Pattern Discovery

| # | Responsabilidad | Fundamento ontológico |
|:-:|-----------------|----------------------|
| R1 | **Detectar relaciones** entre variables del snapshot a través de snapshots | La ontología define Pattern como relación. |
| R2 | **Cuantificar confianza** de cada relación detectada | Sin θ, un Pattern no tiene calificación. |
| R3 | **Preservar evidencia** que respalda cada Pattern | Sin E, un Pattern no es trazable. |
| R4 | **Clasificar dimensión** de cada Pattern (intra/inter/cross) | Sin D, un Pattern no tiene contexto ontológico. |
| R5 | **Filtrar relaciones triviales** (invariantes del diseño) | Un Pattern debe ser NO TRIVIAL. |
| R6 | **Producir un conjunto de Patterns** por ventana de análisis | La salida es un conjunto, no un elemento único. |
| R7 | **Ser no-monótono** — nuevos datos pueden invalidar Patterns previos | La ontología es empírica: nuevos datos la refinan. |

### 5.2 Responsabilidades que NO posee

| # | NO Responsabilidad | Por qué |
|:-:|--------------------|---------|
| N1 | **No decide acciones** | Pattern describe, no prescribe. Goals decide. |
| N2 | **No almacena Patterns** | Pattern Discovery produce. Almacenamiento es responsabilidad de una capa futura. |
| N3 | **No consume Patterns previos** | Cada invocación es independiente (L es función pura). |
| N4 | **No modifica Memory** | M-3: No feedback al EE. M-1: Append-only. |
| N5 | **No modifica el pipeline operacional** | Pattern Discovery es offline/batch. No corre en el path crítico. |
| N6 | **No garantiza completitud** | No promete encontrar TODOS los Patterns. Solo los que detecta y selecciona. |

---

## 6. Invariantes

| ID | Invariante | Tipo | Fundamento |
|:--:|------------|:----:|------------|
| **P-I1** | **Segundo orden** — Pattern es siempre una proposición sobre el CONJUNTO, no sobre un elemento | Ontológico | Sin esto, no hay distinción entre dato y Pattern |
| **P-I2** | **Empírico** — todo Pattern tiene evidencia E ⊆ W que lo respalda | Metodológico | Sin evidencia, un Pattern no es verificable |
| **P-I3** | **Cuantificado** — todo Pattern tiene θ ∈ [0,1] | Metodológico | Sin confianza, un Pattern no es accionable |
| **P-I4** | **Dimensional** — todo Pattern pertenece a exactamente una dimensión D | Ontológico | La dimensión es constitutiva del tipo de Pattern |
| **P-I5** | **No trivial** — ningún Pattern es una invariante del sistema (M*, C*, diseño del EE) | Calidad | Patterns triviales no son valiosos |
| **P-I6** | **Inmutable** — un Pattern producido no cambia; solo puede ser reemplazado por una nueva invocación | Técnico | Consistente con PR-7B §8 |
| **P-I7** | **No monótono** — nuevos datos pueden invalidar Patterns previos | Técnico | Consistente con PR-7B §6.3 |
| **P-I8** | **n ≥ 2** — ningún Pattern puede existir con menos de 2 snapshots | Ontológico | Un snapshot no puede tener relaciones inter o cross |
| **P-I9** | **Read-only sobre Memory** — Pattern Discovery nunca escribe en cognitive_memory_snapshots | Contractual | M-1: Append-only. PBA-1: Memory no transforma. |

---

## 7. Relación con MemorySnapshot

### 7.1 Cadena ontológica completa

```
Evidence Engine (produce) → Belief + Decision [1er orden, efímero]
  → Memory.store() → MemorySnapshot[19] [1er orden, persistido, inmutable]
    → MemoryRead.querySnapshots() → MemorySnapshot[] [1er orden, consultable]
      → Pattern Discovery (proyecta 19→11 internamente)
        → Pattern.Read(⟨R, θ, E, D⟩) [2do orden, producido por PD]
```

### 7.2 Mapeo MemorySnapshot → Pattern

| En MemorySnapshot | En Pattern | Cambio ontológico |
|-------------------|------------|-------------------|
| `turnNumber = 1` | `R: turnNumber y readiness covarían` | Dato individual → Relación general |
| `readiness = 'ready'` | `θ = 0.95` | Valor concreto → Medida de confianza |
| `channel = 'whatsapp'` | `E = [s₁, s₃, s₇]` | Propiedad de snapshot → Evidencia de Pattern |
| `conversationId = '224'` | `D = 'inter'` | Partición operacional → Dimensión ontológica |

### 7.3 Correspondencia formal

```
MemorySnapshot:    S = D₁ × D₂ × ... × D₁₁  (espacio producto, 1er orden)
Pattern:           Π = ⟨R, θ, E, D⟩          (proposición, 2do orden)

Pattern Discovery: L: MemorySnapshot[] → PatternSet
                   L(W) = {π₁, π₂, ..., πₖ}
```

Pattern Discovery NO produce MemorySnapshots. Produce Patterns. Son tipos ontológicamente distintos. Un Pattern no PUEDE ser almacenado en `cognitive_memory_snapshots` porque no es un snapshot — es una relación entre snapshots.

---

## 8. Evaluación del modelo PR-7B

### 8.1 ¿Sobrevive el modelo matemático previo?

**Sí, el núcleo matemático de PR-7B sobrevive.** La función `L_γ: 𝒲 → 𝒫(𝒞)` con `c = ⟨P, θ, E⟩` sigue siendo la formalización correcta de Pattern Discovery.

### 8.2 ¿Qué cambia con la existencia real de Memory?

| Aspecto | PR-7B (diseño conceptual) | POA-1 (post-Memory real) |
|---------|--------------------------|--------------------------|
| **Espacio S** | `D₁ × ... × D₁₁` (11 campos hipotéticos) | Los 11 campos son un subconjunto PROYECTADO de MemorySnapshot[19]. La proyección es interna de PD (PBA-1). El espacio es REAL, no hipotético. |
| **n mínimo** | n ≥ 1 (estado), n ≥ 2 (transiciones) | n ≥ 2 SIEMPRE. Datos de OP-1 muestran patterns intra-snapshot triviales con n=1 (no vale la pena detectarlos). |
| **Tipos de Pattern** | Estado, Transición, Tendencia, Dependencia, Ciclo | Se ADD la dimensión `D` que clasifica intra/inter/cross. Los tipos de PR-7B son subtipos DENTRO de cada dimensión. |
| **No-trivialidad** | No abordada explícitamente | P-I5: los Patterns deben ser NO TRIVIALES. Esto requiere filtrar invariantes del sistema. |
| **Relación con el EE** | Teórica (EE era diseño conceptual) | El EE es real y produce datos. Patterns intra-snapshot pueden ser invariantes del EE y deben filtrarse. |

### 8.3 ¿Qué se agrega respecto de PR-7B?

1. **Dimensión ontológica `D`.** PR-7B no distinguía entre patterns intra, inter, cross. POA-1 agrega esta clasificación porque los datos reales muestran que la dimensión es constitutiva del Pattern.

2. **Criterio de no-trivialidad.** PR-7B asumía que toda regularidad detectada es un Pattern. POA-1 reconoce que algunas regularidades son por diseño (invariantes del EE, invariantes M-1 a M-14) y deben filtrarse.

3. **Acoplamiento con MemoryRead.** PR-7B asumía acceso directo a snapshots. POA-1 (vía PBA-1) establece que PD recibe MemorySnapshot[] via MemoryRead y proyecta internamente.

### 8.4 ¿Qué cambia en el formalismo?

```
PR-7B:      c = ⟨P, θ, E⟩      (P = predicado genérico sobre W)
POA-1:      π = ⟨R, θ, E, D⟩   (R = relación entre variables, D = dimensión)
```

El cambio de `P` a `R` es semántico: no cualquier predicado, sino específicamente una RELACIÓN entre variables del snapshot. El cambio de 3 a 4 componentes refleja la necesidad ontológica de la dimensión.

---

## 9. Veredicto

### 9.1 Ontología mínima de Pattern

> **Un Pattern es una proposición de segundo orden `⟨R, θ, E, D⟩` donde `R` es una relación no trivial entre variables del MemorySnapshot, `θ` es la confianza, `E` es la evidencia, y `D` es la dimensión ontológica (intra-snapshot, inter-snapshot, o cross-conversación).**

### 9.2 Unidad mínima de conocimiento

```
π = ⟨R, θ, E, D⟩
```

Cuatro componentes necesarias y suficientes. Sin una, el Pattern está incompleto.

### 9.3 Relación con MemorySnapshot

```
MemorySnapshot[19] (1er orden, inmutables, operacional)
  → Pattern Discovery (proyecta 19→11, detecta relaciones)
    → Pattern ⟨R, θ, E, D⟩ (2do orden, producidos, no almacenados en Memory)
```

### 9.4 Modelo PR-7B

**El modelo PR-7B sobrevive como núcleo matemático.** Su formalismo `L_γ: 𝒲 → 𝒫(𝒞)` sigue siendo correcto. Las adiciones de POA-1 (dimensión `D`, no-trivialidad, acoplamiento con MemoryRead) son extensiones que el modelo conceptual de PR-7B no podía anticipar porque Memory no existía.

### 9.5 Estado de Pattern Discovery

Pattern Discovery tiene una ontología definida, invariantes, responsabilidades, y relación contractual con Memory. Está listo para diseño arquitectónico detallado cuando se decida avanzar.

---

*Fin de POA-1 — Pattern Ontology Audit*
