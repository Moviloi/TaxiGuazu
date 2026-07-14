# PAA-1 — Pattern Acceptance Audit

> **Fecha:** 2026-07-14  
> **Precedencia:** POA-1 (Pattern Ontology — π = ⟨R, θ, E, D⟩), MRC-1, PBA-1, OP-1 (16 snapshots reales)  
> **Driver:** Determinar cuándo una relación observada merece convertirse en un Pattern válido — el Acceptance Contract de Pattern Discovery  
> **Rol:** Arquitecto Principal — epistemología de sistemas cognitivos

---

## Preámbulo

POA-1 estableció la **ontología** de Pattern: π = ⟨R, θ, E, D⟩. Sabemos *qué es* un Pattern.

Este documento establece la **epistemología** de Pattern: ¿cuándo SABEMOS que una relación observada ES un Pattern?

No es una pregunta técnica (¿qué algoritmo usar?) ni métrica (¿qué threshold configurar?). Es una pregunta **epistemológica**: ¿qué condiciones de justificación debe cumplir una observación para ser aceptada como conocimiento válido?

---

## Sección 1: Evaluación de criterios candidatos

Cinco criterios intuitivos se evalúan adversarialmente. Cada uno se intenta refutar con contraejemplos del sistema real (OP-1) o del dominio general. Si la refutación es exitosa, el criterio se descarta como condición suficiente (aunque pueda ser necesario).

---

### 1.1 Frecuencia — "Si R ocurre frecuentemente, es un Pattern"

**Enunciado:** Una relación que aparece en un alto porcentaje de snapshots es un Pattern.

**Intento de refutación:**

*Contraejemplo 1 — Invariante del diseño:*
En OP-1, `isDecided=1` aparece en 16/16 snapshots (frecuencia = 1.0). Es una regularidad perfecta. Pero NO es un Pattern descubierto — es una **invariante del diseño del EE**. El EE siempre completa la decisión antes de producir el snapshot. La frecuencia perfecta no revela nada; solo confirma que el sistema funciona como fue diseñado.

*Contraejemplo 2 — Propiedad universal:*
`memoryId ≠ null` aparece en 100% de los snapshots. Frecuencia perfecta. No es Pattern — es una restricción del esquema (NOT NULL en DB).

*Contraejemplo 3 — Frecuencia baja, Pattern valioso:*
Una relación R: "cuando readiness='partial', el lead nunca se decide" podría aparecer en 1 de 100 snapshots (frecuencia = 0.01). Pero es un Pattern altamente valioso — señala un estado crítico. La frecuencia baja oculta su importancia.

**✅ Refutación exitosa.** Frecuencia ni es necesaria (patrones raros existen) ni suficiente (invariantes son frecuentes pero no patrones). Frecuencia confunde **prevalencia** con **descubrimiento**.

---

### 1.2 Confianza — "Si θ > threshold, es un Pattern"

**Enunciado:** Una relación con alta confianza empírica es un Pattern.

**Intento de refutación:**

*Contraejemplo 1 — Confianza en invariante:*
En OP-1, `readiness='ready'` tiene θ = 1.0 (100% de confirmación empírica). Confianza perfecta. Pero es una propiedad del DISEÑO, no un descubrimiento. El θ alto mide la fidelidad del sistema a su propio diseño, no el valor cognitivo de la relación.

*Contraejemplo 2 — Confianza con n pequeño:*
Dos snapshots de la misma conversación muestran `channel='whatsapp'`. θ = 1.0 para "channel siempre es whatsapp." Pero n=2 es insuficiente para afirmar que esto es una propiedad general del sistema — es una sola conversación. La confianza mide consistencia en los datos observados, no la probabilidad de que la relación se sostenga en datos no observados.

*Contraejemplo 3 — Paradójico:*
θ = 0.5 puede ser un Pattern valioso: "50% de los leads con channel='web' abandonan antes del turn 2." La confianza baja NO implica que no sea Pattern — implica que el Pattern tiene una confianza moderada, pero sigue siendo informativo.

**✅ Refutación exitosa.** Confianza mide **robustez empírica**, no **validez epistemológica**. θ alto puede ocurrir en relaciones triviales. θ bajo puede ocurrir en relaciones valiosas.

---

### 1.3 Repetición — "Si R aparece ≥ k veces, es un Pattern"

**Enunciado:** Una relación observada al menos k veces en el conjunto de snapshots es un Pattern.

**Intento de refutación:**

*Contraejemplo 1 — Repetición de invariante:*
`turnNumber` es monotónico en 16/16 snapshots. Aparece 16 veces, k=16 holgadamente superado. Pero la monotonicidad de turnNumber es M-7 (invariante de diseño de Memory). No es Pattern.

*Contraejemplo 2 — Patrón único pero valioso:*
"Cuando turnNumber=3 Y leads=0, el lead nunca retorna." Esto puede ocurrir UNA sola vez (la única conversación que llegó a turn 3 con leads=0). k=1. Bajo cualquier threshold k≥2, este Pattern es rechazado. Pero es altamente informativo.

*Contraejemplo 3 — Arbitrariedad del threshold:*
¿k=3? ¿k=5? ¿k=10? Cualquier threshold fijo es arbitrario. No hay principio epistemológico que justifique que 3 repeticiones "prueban" algo que 2 no prueban. El número de repeticiones necesarias depende de la complejidad de la relación, la dimensionalidad, y la variabilidad de los datos.

**✅ Refutación exitosa.** Repetición es una medida de **soporte** (support count), no de validez. Ni necesaria (patrones únicos existen) ni suficiente (invariantes se repiten infinitamente).

---

### 1.4 Evidencia — "Si existe E que respalda R, es un Pattern"

**Enunciado:** Si existe una subsecuencia de snapshots E ⊆ W que confirma R, entonces R es un Pattern.

**Intento de refutación:**

*Contraejemplo 1 — Todo tiene evidencia:*
Toda relación observada tiene, por definición, alguna evidencia — fue observada en algún subconjunto de snapshots. El criterio es **tautológico**: "R es un Pattern cuando hay evidencia de R." Esto no agrega información — es la definición misma de observación.

*Contraejemplo 2 — Evidencia insuficiente:*
Dos snapshots de la MISMA conversación muestran `readiness='ready'`. Esto es evidencia E = [s₁, s₂]. Pero NO es evidencia de un Pattern cross-conversación — es evidencia de la trayectoria de una sola conversación. La evidencia existe pero es **inadecuada** para la dimensión del Pattern.

*Contraejemplo 3 — Evidencia sesgada:*
Tres snapshots de tres conversaciones, pero las tres son del mismo canal (web). La evidencia muestra R: "channel='web' → readiness='ready' en 3/3." Pero las conversaciones de WhatsApp y Email no están representadas. La evidencia es sesgada.

**✅ Refutación exitosa.** Evidencia es necesaria (sin ella no hay observación) pero no suficiente. La pregunta es si la evidencia es **ADEQUADA** — suficiente en tamaño, diversa en distribución, no sesgada.

---

### 1.5 Correlación — "Si dos variables correlacionan, es un Pattern"

**Enunciado:** Una covarianza estadística entre dos campos del snapshot es un Pattern.

**Intento de refutación:**

*Contraejemplo 1 — Correlación por diseño:*
`isDecided=true` correlaciona perfectamente con `readiness='ready'` en OP-1. r = 1.0. Correlación perfecta. Pero NO es un Pattern descubierto — es una correlación **impuesta por el diseño del EE**. El EE setea ambas variables simultáneamente cuando la decisión está completa.

*Contraejemplo 2 — Correlación espuria clásica:*
En una muestra pequeña, `belief_factCount` podría correlacionar con `storedAt` (la hora del día). Esto no refleja una relación real entre el número de facts y el momento de almacenamiento — es una coincidencia estadística. Sin control por variables confusoras, la correlación no es Pattern.

*Contraejemplo 3 — Correlación accidental por mezcla de poblaciones (Simpson's paradox):*
Agregando todas las conversaciones, `leads` y `readiness` podrían NO correlacionar. Pero separando por canal, DENTRO de cada canal, la correlación es fuerte y consistente. La correlación global es engañosa.

*Contraejemplo 4 — Correlación define R, no acepta R:*
R ES la correlación. Decir "R es un Pattern porque correlaciona" es decir "R es un Pattern porque R existe." Es una identidad, no una justificación.

**✅ Refutación exitosa.** Correlación describe **qué es R**, no **por qué R debe aceptarse**. R puede ser una correlación espuria, diseñada, accidental o engañosa.

---

### 1.6 Tabla de refutaciones

| Criterio | ¿Sobrevive como condición suficiente? | Razón de refutación |
|:---------|:-------------------------------------:|---------------------|
| **Frecuencia** | ❌ Refutado | Invariantes tienen frecuencia 1.0. Patrones raros existen. |
| **Confianza (θ)** | ❌ Refutado | θ mide robustez empírica, no validez epistemológica. Invariantes tienen θ=1.0. |
| **Repetición** | ❌ Refutado | Invariantes se repiten siempre. Patrones únicos existen. Threshold es arbitrario. |
| **Evidencia (E)** | ❌ Refutado | Toda observación tiene evidencia. La pregunta es si es ADECUADA. |
| **Correlación** | ❌ Refutado | Correlación define R, no justifica R. Correlaciones espurias, diseñadas, accidentales existen. |

**Conclusión:** Ningún criterio simple es suficiente. La aceptación requiere una **estructura de filtros múltiples**, donde cada filtro cubre una dimensión epistemológica distinta.

---

## Sección 2: El problema epistemológico

### 2.1 ¿Qué significa "conocer" un Pattern?

En epistemología clásica (Platón, *Teeteto*), el conocimiento se define como **creencia verdadera justificada** (JTB: Justified True Belief). Adaptando a nuestro dominio:

- **Creencia** = R es observada en los datos (existe evidencia E)
- **Verdad** = R realmente se cumple en el sistema real (no es artefacto)
- **Justificación** = tenemos razones para creer que R es genuina (no es coincidencia, no es diseñada, no es derivada)

El Acceptance Contract define la **justificación** — las condiciones bajo las cuales una observación R está suficientemente justificada para ser aceptada como Pattern.

### 2.2 Las cuatro dimensiones de justificación

| Dimensión | Pregunta epistemológica | Refutación que previene |
|:----------|------------------------|------------------------|
| **Empírica** | ¿Hay suficiente evidencia para creer en R? | Coincidencia con n pequeño |
| **Arquitectónica** | ¿Es R un descubrimiento genuino, no un artefacto del diseño? | Invariantes del sistema |
| **Lógica** | ¿Es R conocimiento primario, no derivado de otros Patterns? | Patrones redundantes |
| **Informativa** | ¿Es R significativa, no un producto del azar? | Correlaciones espurias |

Estas cuatro dimensiones son INDEPENDIENTES entre sí. Una relación puede fallar en una y pasar las otras tres. Debe pasar TODAS para ser aceptada.

---

## Sección 3: Los filtros epistemológicos

Cada filtro corresponde a una dimensión de justificación. Todos son condiciones necesarias. Ninguno es suficiente por sí solo.

---

### 3.1 Filtro 1 — Adecuación Empírica (F₁)

**Pregunta:** ¿La evidencia E es suficiente para sostener R?

**Subcondiciones:**

| ID | Condición | Define | Refutación que previene |
|:--:|-----------|:------:|------------------------|
| F₁-a | `|E| ≥ N_min` donde N_min depende de la dimensión D | Mínimo tamaño de evidencia | Coincidencia con 1-2 datos |
| F₁-b | Para D='cross': E debe contener ≥ C_min conversaciones distintas | Diversidad de conversaciones | Patrón de una sola conversación |
| F₁-c | Para D='inter': E debe contener ≥ T_min turnos distintos de la misma conversación | Profundidad temporal | Patrón de un solo turno |
| F₁-d | `θ ≥ θ_min` donde θ_min es el mínimo de confianza exigible | Mínima consistencia | Relación inestable |

**Justificación epistemológica (Hume, empirismo):** No podemos conocer una relación si no tenemos suficiente evidencia para distinguirla del ruido. El tamaño de E define el poder de distinguir señal de ruido.

**Valores umbral (arquitectónicos, no implementación):**

```
         N_min  C_min  T_min  θ_min
D='intra'    3      1      1    0.6
D='inter'    3      1      2    0.6
D='cross'    5      2      1    0.5
```

*Nota:* Estos valores son restricciones epistemológicas mínimas, no thresholds de implementación. Pattern Discovery puede usar umbrales más estrictos, pero nunca más laxos.

---

### 3.2 Filtro 2 — No-Trivialidad Arquitectónica (F₂)

**Pregunta:** ¿Es R una relación genuinamente emergente, no una consecuencia del diseño del sistema?

**Subcondiciones:**

| ID | Condición | Refutación que previene |
|:--:|-----------|------------------------|
| F₂-a | R no es una invariante del EE (Evidence Engine) | Invariantes de diseño del EE |
| F₂-b | R no es una invariante de Memory (M-1 a M-14) | Invariantes de la capa de persistencia |
| F₂-c | R no es una invariante del contrato (C-1 a C-10) | Invariantes del contrato de integración |
| F₂-d | R no es una invariante del esquema de DB | Restricciones de esquema (NOT NULL, FK, etc.) |
| F₂-e | R no es una tautología del dominio (`leads ≥ 0`) | Propiedades lógicamente necesarias del dominio |

**Justificación epistemológica (Popper, demarcación):** Para que una proposición sea científica (o cognitiva), debe ser FALSABLE — debe poder ser refutada por nuevos datos. Una invariante del diseño NO es falsable: si mañana `isDecided=true` no implicara `readiness='ready'`, el sistema estaría ROTO, no se habría "refutado un Pattern." Las invariantes pertenecen al diseño, no al descubrimiento.

**Mecanismo de exclusión:**

Pattern Discovery debe poseer un **catálogo de invariantes conocidas** contra el cual cotejar cada R candidata. Este catálogo incluye:

```
# Catálogo de invariantes (no exhaustivo)
# Evidence Engine
EE-I1: isDecided=true → readiness='ready'
EE-I2: isComplete=true → isDecided existe
EE-I3: (campos de estado interno del EE)

# Memory (M-1 a M-14)
M-1:  Append-only (snapshots no se modifican ni eliminan)
M-5:  memoryId único por snapshot
M-6:  Particionado por conversationId
M-7:  turnNumber monotónico +1
M-8:  storedAt > createdAt (si createdAt existiera)
M-12: Sin defaults, todo campo proviene de Belief/Decision
M-13: Sin delta precomputado

# Esquema DB (constraints)
DB-I1: memoryId NOT NULL
DB-I2: conversationId NOT NULL
DB-I3: storedAt NOT NULL
...
```

**Caso de borde:** Algunas relaciones están PARCIALMENTE determinadas por el diseño. Por ejemplo, `turnNumber` es monotónico por M-7, pero la RELACIÓN entre `turnNumber` y otras variables (ej. `readiness` se mantiene estable a través de turnos) NO es una invariante — el EE no garantiza que `readiness` se mantenga. Esta relación pasa F₂.

---

### 3.3 Filtro 3 — Independencia Lógica (F₃)

**Pregunta:** ¿Es R conocimiento primario, o es consecuencia lógica de otros Patterns ya aceptados?

**Subcondiciones:**

| ID | Condición | Refutación que previene |
|:--:|-----------|------------------------|
| F₃-a | R no es una conjunción de Patterns existentes (R ≠ R₁ ∧ R₂) | Patrones compuestos que no agregan información |
| F₃-b | R no es una implicación transitiva de Patterns existentes (si R₁ → R₂ y R₂ → R₃, entonces R₁ → R₃ no es nuevo) | Cadenas deductivas que no son descubrimientos |
| F₃-c | R no es una especialización de un Pattern existente sin nuevo contenido empírico | Patrones derivados sin valor adicional |

**Justificación epistemológica (Spinoza, coherentismo):** El conocimiento debe ser COHERENTE — no debe contradecir otros conocimientos aceptados. Pero además, debe ser INDEPENDIENTE — no debe ser deducible de otros conocimientos sin nueva evidencia. Si R es consecuencia lógica de Patterns ya aceptados, R no constituye nuevo conocimiento — es solo una reformulación.

**Caso de aplicación:**

Si PD ya aceptó:
- Pattern A: `channel='whatsapp' → factCount ≥ 1` (θ=0.85)
- Pattern B: `factCount ≥ 1 → readiness='ready'` (θ=0.90)

Entonces:
- R candidata: `channel='whatsapp' → readiness='ready'`
- Evaluación: R es transitivamente deducible de A+B. NO es conocimiento nuevo.
- Veredicto: ❌ Falla F₃. No se acepta como Pattern independiente.

Pero ATENCIÓN: Si la confianza observada de R (θ_R) es SIGNIFICATIVAMENTE DISTINTA de la confianza deducida (θ_A × θ_B = 0.765), entonces R puede revelar información nueva. Por ejemplo, si θ_R = 0.95 (más alto que el producto de A y B), entonces la relación directa es más fuerte que la cadena — revela que hay un factor adicional que A+B no capturan. En ese caso, R PASA F₃.

**Regla F₃:** R falla F₃ si y solo si:
1. R es lógicamente deducible de Patterns ya aceptados, Y
2. θ_R ≈ θ_deducido (dentro de un margen de tolerancia)

Si θ_R difiere significativamente, R pasa F₃ porque aporta información no contenida en los Patterns previos.

#### 3.3.1 Parámetros congelados de F₃ para PD-IM-1

| Parámetro | Valor arquitectónico | Definición |
|:----------|:--------------------:|:-----------|
| **Profundidad máxima de deducción** | `k ≤ 3` | R es deducible si existe una cadena de implicaciones transitivas `P₁ → P₂ → ... → P_k → R` con `k ≤ 3` pasos, donde cada paso comparte al menos una variable con el siguiente (`P_i.variables ∩ P_{i+1}.variables ≠ ∅`). |
| **δ — tolerancia de confianza** | `δ = 0.1` | `θ_R ≈ θ_deducido` se evalúa como `|θ_R - θ_deducido| ≤ δ`. Si la diferencia supera δ, R revela información no contenida en la cadena deductiva y pasa F₃. |
| **Variables(R)** | `Variables(R) = { x | x es una variable libre en la representación de R }` | Las variables de una relación R son los campos de `ProjectedState` involucrados en la relación (ej. para `channel='whatsapp' → factCount≥1`, `Variables(R) = {channel, factCount}`). |
| **Catálogo vacío** | F₃ es vacuamente cierto | Si no hay Patterns activos en el catálogo al momento de la evaluación, no existe ninguna cadena deductiva posible. R pasa F₃ por definición. |

**Estos parámetros están congelados para PD-IM-1. No son configurables en esta versión.** Profundidades mayores (k > 3) o tolerancias diferentes (δ ≠ 0.1) pueden explorarse en iteraciones futuras como mejora algorítmica, requiriendo revisión arquitectónica.

---

### 3.4 Filtro 4 — No-Coincidencia (F₄)

**Pregunta:** ¿Es R improbable de observar por azar, dada la distribución base de los datos?

**Subcondiciones:**

| ID | Condición | Refutación que previene |
|:--:|-----------|------------------------|
| F₄-a | P(R | H₀) < α, donde H₀ es "no existe relación entre las variables" | Correlación espuria |
| F₄-b | El lift de R > L_min (cuánto más probable es R que la línea base) | Relación trivial (lift ≈ 1.0) |
| F₄-c | Corrección por múltiples comparaciones aplicada (Bonferroni, FDR, etc.) | Falso positivo por exploración exhaustiva |

**Justificación epistemológica (Fisher, inferencia estadística):** No podemos aceptar R como Pattern si es plausiblemente explicable por azar. El filtro F₄ cuantifica la "plausibilidad del azar" y rechaza R cuando esta es demasiado alta.

**Mecanismo conceptual:**

1. **Base rate (`P(V₁)`):** Probabilidad de observar un valor particular de la variable V₁.
   - Ejemplo: `P(channel='whatsapp') = 0.58` (7 de 12 conversaciones)

2. **Joint probability (`P(V₁, V₂)`):** Probabilidad de observar ambos valores juntos.
   - Ejemplo: `P(channel='whatsapp', factCount≥1) = 0.50`

3. **Expected under independence (`P(V₁) × P(V₂)`):** Probabilidad si las variables fueran independientes.
   - Ejemplo: `P(channel='whatsapp') × P(factCount≥1) = 0.58 × 0.75 = 0.435`

4. **Lift:** `P(V₁, V₂) / (P(V₁) × P(V₂))`
   - Si lift = 1.0: variables independientes (no hay Pattern)
   - Si lift > 1.0: correlación positiva (posible Pattern)
   - Si lift < 1.0: correlación negativa (posible Pattern inverso)

5. **Significancia estadística:** P-value o similar, corregido por número de relaciones evaluadas.

**Caso de aplicación en OP-1:**

Con 11 campos analizables por PD, hay C(11,2) = 55 pares de variables posibles. Si evaluamos 55 relaciones, esperamos ~3 con p < 0.05 por azar (55 × 0.05 ≈ 2.75). Sin corrección, aceptaríamos falsos positivos.

F₄ requiere corrección por múltiples comparaciones. El método específico (Bonferroni, FDR, etc.) no se define aquí — es decisión de implementación. Pero la EXIGENCIA de corrección es epistemológica: sin ella, el Acceptance Contract aceptaría relaciones que son producto del número de pruebas, no de una relación genuina.

#### 3.4.1 Parámetros congelados de F₄ para PD-IM-1

| Parámetro | Valor arquitectónico | Definición |
|:----------|:--------------------:|:-----------|
| **Universo de comparaciones** | Ejecución actual | La corrección por múltiples comparaciones se aplica sobre el conjunto de **todas las relaciones candidatas evaluadas en la ejecución actual de PD**. Cada invocación de PD es un experimento independiente. Las ejecuciones previas tienen su propia corrección; no se acumulan. |
| **n** | `n = |RelationCandidate[] producidas por Detect_γ(W)|` | Número de relaciones candidatas generadas por `Detect_γ` en esta ejecución, **antes de aplicar cualquier filtro** F₁-F₄. `α_corregido = α / n`. |
| **α** | `α = 0.05` | Tasa de falso positivo nominal. Valor estándar científico. |
| **Método oficial para PD-IM-1** | **Bonferroni** | Corrección: `α_corregido = α / n`. Simple, conservador, computacionalmente trivial. Un candidato pasa F₄ si `p_valor < α_corregido`. |
| **Métodos alternativos** | Fuera del alcance de PD-IM-1 | FDR, Benjamini-Hochberg, Holm-Bonferroni, y otros métodos adaptativos pueden implementarse en futuras iteraciones como mejora algorítmica, sin requerir cambio arquitectónico. |

**Estos parámetros están congelados para PD-IM-1. No son configurables en esta versión.** El universo de comparaciones (ejecución actual) evita que n crezca indefinidamente entre ejecuciones. Bonferroni provee una corrección conservadora suficiente para el volumen actual (n ≤ ~55 pares con 11 campos).

---

## Sección 4: Necesidad vs. Suficiencia

### 4.1 Condiciones necesarias

Son necesarias porque si CUALQUIER filtro falla, la relación NO puede ser un Pattern válido:

| Filtro | Si falla → |
|:-------|------------|
| **F₁ — Adecuación Empírica** | La evidencia es insuficiente. R podría ser coincidencia. |
| **F₂ — No-Trivialidad Arquitectónica** | R es un artefacto del diseño. No hay descubrimiento. |
| **F₃ — Independencia Lógica** | R es derivable de Patterns existentes. No agrega conocimiento. |
| **F₄ — No-Coincidencia** | R es plausiblemente espuria. Podría ser azar. |

**Demostración de necesidad (por contradicción):**

Supongamos que R es aceptada como Pattern válido PERO falla F₂. Esto significa que R es una invariante del diseño (ej. `isDecided=true → readiness='ready'`). Pero entonces R no es DESCUBIERTA — es CONOCIDA A PRIORI por el diseño del sistema. Un Pattern válido debe ser descubierto empíricamente (ontología POA-1: "relación NO TRIVIAL"). Contradicción. ∴ F₂ es necesario.

Análogamente para F₁, F₃, F₄.

### 4.2 Condiciones suficientes

**Teorema de suficiencia:** Si R pasa los cuatro filtros (F₁ ∧ F₂ ∧ F₃ ∧ F₄), entonces R es un Pattern válido.

**Demostración (constructiva):**

1. Si R pasa F₁: existe evidencia suficiente para sostener R. No es coincidencia con n pequeño.
2. Si R pasa F₂: R no es un artefacto del diseño. Es una relación genuinamente emergente.
3. Si R pasa F₃: R no es derivable de Patterns conocidos. Es conocimiento primario.
4. Si R pasa F₄: R no es explicable por azar. Es estadísticamente significativa.

Bajo estas cuatro condiciones, R es:
- **Creencia** (observada empíricamente) ← F₁
- **Verdad** (no artefacto, no azar) ← F₂ + F₄
- **Justificada** (no derivada, evidencia suficiente) ← F₁ + F₃

∴ R cumple JTB. Es conocimiento válido. Es un Pattern. ∎

**Precaución:** La suficiencia es epistemológica, no metafísica. Un Pattern aceptado puede ser refutado por nuevos datos (P-I7: no-monotonía). La suficiencia significa "suficientemente justificado para ser tratado como conocimiento válido DADA LA EVIDENCIA ACTUAL."

### 4.3 ¿Qué pasa si R pasa 3 de 4 filtros?

| Combinación | ¿Es Pattern? | Riesgo |
|:------------|:------------:|--------|
| ✅F₁ ✅F₂ ✅F₃ ❌F₄ | ❌ No | Falso positivo por azar |
| ✅F₁ ✅F₂ ❌F₃ ✅F₄ | ❌ No | Patrón redundante (no agrega conocimiento) |
| ✅F₁ ❌F₂ ✅F₃ ✅F₄ | ❌ No | Falso positivo por diseño (invariante) |
| ❌F₁ ✅F₂ ✅F₃ ✅F₄ | ❌ No | Falso positivo por muestra pequeña |

En TODOS los casos, al menos un filtro falla, y el riesgo de falso positivo es inaceptable. La aceptación requiere los cuatro.

---

## Sección 5: Falsos positivos y falsos negativos

### 5.1 Falsos positivos (Type I Error)

Aceptar R como Pattern cuando no debería serlo.

| Tipo | Causa | Filtro que lo previene | Riesgo residual |
|:-----|:------|:----------------------|:---------------:|
| **Coincidencia estadística** | R ocurre por azar en la muestra | F₄ (no-coincidencia) | Mínimo con α bien calibrado |
| **Invariante no catalogada** | R es un invariante del diseño no incluido en el catálogo F₂ | F₂ (catálogo exhaustivo) | Moderado — requiere mantener el catálogo |
| **Sesgo de selección** | La muestra E está sesgada (ej. solo conversaciones web) | F₁ (diversidad de conversaciones) | Bajo — F₁-b requiere C_min conversaciones |
| **P-hacking accidental** | Múltiples relaciones evaluadas sin correción | F₄-c (corrección por comparaciones múltiples) | Mínimo con corrección |
| **Simpson's paradox** | Relación global que se invierte en subgrupos | F₁ (desagregación por canal) | Moderado — requiere que PD evalúe subgrupos |
| **Causalidad inversa** | R dice X→Y pero es Y→X | Ninguno (Pattern no requiere causalidad) | Aceptado — Pattern es relación, no causalidad |

**Riesgo residual aceptado:** La causalidad inversa no se previene porque Pattern Discovery detecta RELACIONES, no causalidades. Es responsabilidad de Learning (capa superior) determinar direccionalidad causal.

### 5.2 Falsos negativos (Type II Error)

Rechazar R como Pattern cuando debería serlo.

| Tipo | Causa | Mitigación |
|:-----|:------|:-----------|
| **Patrón raro pero real** | R aparece en pocos snapshots pero es genuino | F₁ usa N_min bajo (3 para intra/inter). Patrones con n=1-2 pueden promoverse manualmente. |
| **Patrón con θ bajo pero informativo** | R tiene θ=0.5 pero es valioso (ej. 50% de leads abandonan) | F₁-d usa θ_min=0.5-0.6. Patrones con θ inferior pueden registrarse como "candidatos." |
| **Patrón que contradice Patterns existentes** | R contradice F₃ por ser inconsistente con Patterns previos | F₃ prueba deducción, no consistencia. R puede contradecir Patterns previos (P-I7: no-monotonía). |
| **Catálogo incompleto** | F₂ excluye una relación que NO es invariante (falso negativo de F₂) | El catálogo debe ser auditado periódicamente. Relaciones excluidas por error pueden reintegrarse. |

**Riesgo residual aceptado:** Patrones con n < N_min o θ < θ_min no se aceptan automáticamente pero pueden conservarse como **CANDIDATOS** — relaciones observadas pero no suficientemente justificadas. Un proceso separado (revisión periódica, acumulación de datos) puede promover candidatos a Patterns cuando la evidencia madura.

### 5.3 Tabla de riesgos

| Concepto | Type I (falso positivo) | Type II (falso negativo) |
|:---------|:----------------------:|:------------------------:|
| **Riesgo** | Aceptar invariante como Pattern | Rechazar Pattern genuino |
| **Costo** | Ruido en el catálogo. Decisiones sub-óptimas basadas en falsas relaciones. | Oportunidad perdida. Conocimiento no capitalizado. |
| **Asimetría** | **Este contrato prioriza evitar falsos positivos.** Es peor actuar sobre una falsa relación que ignorar una real. | Los candidatos preservan la observación. No hay pérdida permanente. |

**Principio de asimetría:** En sistemas cognitivos, es más costoso actuar sobre una falsa creencia que ignorar una verdadera. El Acceptance Contract está diseñado con sesgo conservador: prefiere rechazar candidatos dudosos que aceptar relaciones no justificadas.

---

## Sección 6: Exclusión de invariantes — mecanismo

### 6.1 ¿Qué es una invariante?

Una invariante es una proposición que es VERDADERA EN TODO ESTADO VÁLIDO DEL SISTEMA por diseño, no por descubrimiento. No puede ser falsada por nuevos datos porque si lo fuera, el sistema estaría en un estado inválido (bug).

### 6.2 Catálogo de invariantes

Toda relación R debe ser cotejada contra:

#### EE Invariants (Evidence Engine)

| ID | Invariante | Excluye Pattern como R |
|:--:|------------|:----------------------:|
| EE-I1 | `decision_isComplete=true → decision_isDecided≠null` | `isComplete → isDecided` |
| EE-I2 | `decision_readiness='ready' ↔ decision_isDecided=true` | `readiness ↔ isDecided` |
| EE-I3 | `belief_observationCount ≥ 0` | `observationCount ≥ 0` |
| EE-I4 | `turnNumber ≥ 1` | `turnNumber ≥ 1` |
| EE-I5 | Toda relación que sea consecuencia directa de una regla del EE (ADR-009) | Cualquier relación que el EE garantice |

#### Memory Invariants (M-1 a M-14, de ADR-010)

| ID | Invariante | Excluye Pattern como R |
|:--:|------------|:----------------------:|
| M-1 | Append-only | `snapshots no se modifican` |
| M-5 | `memoryId` único | `memoryId ≠ otro memoryId` (trivial) |
| M-6 | Particionado por `conversationId` | `conversationId es clave de partición` |
| M-7 | turnNumber +1 por snapshot | `turnNumber es monotónico` |
| M-12 | Sin defaults (todo campo proviene de Belief/Decision) | `no hay campos con valor por defecto` |

#### Contract Invariants (C-1 a C-10, de ADR-010)

| ID | Invariante | Excluye Pattern como R |
|:--:|------------|:----------------------:|
| C-8 | Memory no lee DB operacional | `Memory no accede a tablas operacionales` |
| C-9 | `conversationId` solo como partition key | `conversationId no se usa para búsqueda semántica` |

#### Schema Invariants

| ID | Invariante | Excluye Pattern como R |
|:--:|------------|:----------------------:|
| DB-I1 | `memoryId NOT NULL` | `memoryId no es null` |
| DB-I2 | `conversationId NOT NULL` | `conversationId no es null` |
| DB-I3 | `storedAt NOT NULL` | `storedAt no es null` |

### 6.3 Casos fronterizos

**Relación parcialmente determinada por diseño:**

`readiness` y `isDecided` están vinculados por el diseño del EE (EE-I2). PERO su relación con terceras variables (ej. `channel`, `factCount`) no está determinada por diseño. Un Pattern como `channel='whatsapp' → readiness='ready'` NO es una invariante — emerge del comportamiento del usuario, no del diseño del sistema.

**Regla F₂ para casos fronterizos:** Una relación R está excluida por F₂ si y solo si existe una invariante I tal que I → R (I implica R lógicamente). Si I solo restringe POSIBLES valores de R pero no los determina completamente, R no está excluida.

- `EE-I2 → (isDecided ↔ readiness)` — cualquier Pattern que exprese esta relación está excluido.
- `EE-I2 → (readiness → channel)` — FALSO. EE-I2 no implica nada sobre channel. No excluido.

### 6.4 Mantenimiento del catálogo

El catálogo de invariantes NO es estático. Cuando se agregan nuevas invariantes al sistema (nuevas reglas del EE, nuevas constraints de DB, nuevos contratos), el catálogo debe actualizarse. Esta es una responsabilidad arquitectónica de cada capa (EE, Memory, etc.) notificar a PD sobre nuevas invariantes.

**Mecanismo:** Cualquier cambio en ADR-009 (EE), ADR-010 (Memory), o ADR-011 (pipeline) que introduzca una nueva invariante DEBE actualizar el catálogo de F₂ en el Acceptance Contract.

---

## Sección 7: Exclusión de coincidencias — mecanismo

### 7.1 ¿Qué es una coincidencia?

Una coincidencia es una relación R que aparece en los datos observados E pero NO existe en el sistema real. Es un falso positivo generado por:

1. **Muestra pequeña:** Con pocos datos, cualquier relación puede aparecer por azar.
2. **Múltiples comparaciones:** Al evaluar muchas relaciones, algunas pasarán el threshold por azar.
3. **Variable confusora:** Z causa tanto X como Y, generando una correlación espuria X↔Y.

### 7.2 Mecanismo de exclusión

#### Paso 1: Establecer hipótesis nula

Para cada relación R (que relaciona variables V₁, V₂):

```
H₀: V₁ y V₂ son independientes en el sistema real.
H₁: V₁ y V₂ NO son independientes (R es una relación genuina).
```

#### Paso 2: Calcular estadístico observado

Dependiendo del tipo de variables:

- **Ambas categóricas:** χ² test, G-test, o Fisher's exact test
- **Una numérica, una categórica:** ANOVA, t-test, o Mann-Whitney U
- **Ambas numéricas:** Correlación de Pearson o Spearman

No se especifica aquí un método particular — es decisión de implementación. Pero el Acceptance Contract requiere que exista un método estadístico que evalúe `P(observación | H₀)`.

#### Paso 3: Corregir por múltiples comparaciones

Sea `k = número de relaciones evaluadas en una ventana W`. α_individual se ajusta a:

```
α_corregido = α_objetivo / k   (Bonferroni)
```
O mediante FDR (False Discovery Rate) u otro método de corrección.

#### Paso 4: Aceptar o rechazar

Si `p_valor_corregido < α_objetivo` → R pasa F₄.
Si `p_valor_corregido ≥ α_objetivo` → R falla F₄ (posible coincidencia).

### 7.3 Casos especiales

**Relaciones con lift = 1.0:** Independencia perfecta. F₄ falla automáticamente — no hay relación que descubrir.

**Relaciones con lift muy alto pero n pequeño:** F₁ (adecuación empírica) protege contra esto al requerir N_min.

**Relaciones que solo aparecen en 1 conversación:** Para D='cross', F₁-b requiere C_min ≥ 2. Una relación observada en una sola conversación no puede ser cross-conversación.

---

## Sección 8: El Acceptance Contract

### 8.1 Definición formal

> **Una relación observada R es aceptada como Pattern válido si y solo si pasa los cuatro filtros epistemológicos:**
>
> ```
> Accept(R) ↔ F₁(R) ∧ F₂(R) ∧ F₃(R) ∧ F₄(R)
> ```
>
> **Donde:**
> - **F₁ (Adecuación Empírica):** |E| ≥ N_min(D) ∧ Diversidad(D) ∧ θ ≥ θ_min(D)
> - **F₂ (No-Trivialidad Arquitectónica):** R ∉ Catálogo de Invariantes ∧ ∄ I: I → R
> - **F₃ (Independencia Lógica):** ¬∃{π₁...πₙ}: {π₁...πₙ} ⊢ R con θ equivalente
> - **F₄ (No-Coincidencia):** P(R | H₀) < α_corregido ∧ lift(R) > L_min

### 8.2 Resumen de condiciones

| Filtro | ¿Qué mide? | Condición | Si falla → |
|:-------|:-----------|:----------|:-----------|
| **F₁** | Suficiencia de la evidencia | |E,N,Diversidad,θ ≥ umbrales| Coincidencia con muestra pequeña |
| **F₂** | Genuinidad del descubrimiento | R no es invariante conocida | Artefacto del diseño |
| **F₃** | Primacía del conocimiento | R no es deducible de Patterns existentes | Conocimiento redundante |
| **F₄** | Significancia estadística | R no es explicable por azar | Correlación espuria |

### 8.3 ¿Qué NO define este contrato?

| No define | Razón |
|:----------|:-------|
| **El valor de α** | Depende de la tolerancia al riesgo del sistema. α=0.05 es estándar científico, pero puede ser más estricto. |
| **El método de corrección** | Bonferroni, FDR, o métodos adaptativos. Elección de implementación. |
| **El test estadístico exacto** | Depende del tipo de variables y su distribución. |
| **El N_min exacto** | Umbrales sugeridos en §3.1 pero pueden refinarse empíricamente. |
| **La prioridad entre Patterns** | Pattern Discovery acepta. Learning prioriza. |
| **El formato de almacenamiento** | Ontología ya definida: π = ⟨R, θ, E, D⟩. El almacenamiento es capa futura. |
| **La acción a tomar** | Pattern describe. Goals prescribe. |

### 8.4 El Acceptance Contract en el pipeline

```
MemorySnapshot[] (19 campos)
  → PD.project() → 11 campos analizables
    → PD.detect() → {R₁, R₂, ..., Rₙ} (relaciones candidatas)
      → PD.filter(F₁) → sobreviven relaciones con evidencia suficiente
        → PD.filter(F₂) → sobreviven relaciones no invariantes
          → PD.filter(F₃) → sobreviven relaciones no derivadas
            → PD.filter(F₄) → sobreviven relaciones no-azar
              → PD.produce() → {π₁, π₂, ..., πₖ} (Patterns aceptados)
                → Pattern[] disponibles para consumidores
```

### 8.5 Estado de no-aceptación

Las relaciones que NO pasan todos los filtros NO son descartadas automáticamente. Existen tres estados:

| Estado | Filtros pasados | Significado | Acción |
|:-------|:---------------:|:------------|:-------|
| **Pattern** | F₁ ∧ F₂ ∧ F₃ ∧ F₄ | Conocimiento válido | Almacenar y exponer |
| **Candidato** | F₁ sin F₂/F₃/F₄ | Relación observada pero no justificada | Conservar para re-evaluación futura con más datos |
| **Descartado** | ¬F₁ | Evidencia insuficiente para sostener cualquier afirmación | Eliminar (no cumple ni el mínimo empírico) |

El estado **Candidato** es crucial: preserva observaciones que podrían convertirse en Patterns cuando madure la evidencia. Pattern Discovery puede re-evaluar candidatos periódicamente.

---

## Sección 9: Ejemplos aplicados a OP-1

### Ejemplo A: `readiness='ready' → isDecided=true`

| Filtro | Evaluación | ¿Pasa? |
|:-------|:-----------|:------:|
| **F₁** | n=16, conversaciones=12, θ=1.0 | ✅ |
| **F₂** | EE-I2: invariante del diseño del EE | ❌ |
| **F₃** | No aplica (ya falló F₂) | — |
| **F₄** | No aplica (ya falló F₂) | — |
| **VEREDICTO** | **NO es Pattern.** Es una invariante del diseño. | ❌ |

### Ejemplo B: `turnNumber aumenta → readiness se mantiene`

| Filtro | Evaluación | ¿Pasa? |
|:-------|:-----------|:------:|
| **F₁** | n=3+2+2 (conversaciones multi-turno). n=7 snapshots multi-turn. θ=1.0 en esos 7. ✅ N_min=3, Diversidad=3 conversaciones. | ✅ |
| **F₂** | No es invariante. M-7 garantiza que turnNumber aumenta, pero NO garantiza que readiness se mantenga. El EE podría cambiar readiness entre turnos. | ✅ |
| **F₃** | No hay Patterns previos de los cuales deducir esto. Es conocimiento primario. | ✅ |
| **F₄** | P(turnNumber aumenta ∧ readiness estable | H₀): con 7 datos multi-turn, la probabilidad de que readiness se mantenga ESTABLE por azar en TODOS es baja. Correlación significativa. Para n=7, si readiness variara aleatoriamente en un 40% de los casos, P(7 estable | H₀) ≈ 0.4⁷ ≈ 0.0016. Con 55 comparaciones (C₁₁²), α_corregido = 0.05/55 ≈ 0.0009. 0.0016 > 0.0009 → **borde**. Pasa si se usa FDR, falla si se usa Bonferroni estricto. | ⚠️ Borde |
| **VEREDICTO** | **CANDIDATO por ahora.** F₄ en límite. Se necesita más datos multi-turn para confirmar. | ⚠️ |

### Ejemplo C: `channel='whatsapp' → factCount≥1` (hipotético, no en OP-1)

| Filtro | Evaluación | ¿Pasa? |
|:-------|:-----------|:------:|
| **F₁** | Supongamos n=28, conversaciones=12, θ=0.85. Cumple todos los umbrales. | ✅ |
| **F₂** | No es invariante. El EE no garantiza relación entre channel y factCount. | ✅ |
| **F₃** | No hay Patterns previos de channel/factCount. Independiente. | ✅ |
| **F₄** | Base rate: P(channel=whatsapp)=0.58, P(factCount≥1)=0.75. Esperado: 0.435. Observado: 0.50. Lift=1.15. Con n=28, χ² test produce p < 0.05. Corregido por 55 comparaciones, p podría ser > 0.0009. Depende de la fuerza de la relación. | ⚠️ |
| **VEREDICTO** | **CANDIDATO o PATTERN** dependiendo de p-valor exacto. Si supera F₄, es Pattern. | ⚠️/✅ |

### Ejemplo D: `belief_observationCount > 0 → le leads_count > 0` (hipotético)

| Filtro | Evaluación | ¿Pasa? |
|:-------|:-----------|:------:|
| **F₁** | Supongamos n=20, θ=1.0. | ✅ |
| **F₂** | ¿Es invariante? Si observationCount > 0 significa que se observaron facts sobre el lead. leads_count cuenta los leads detectados. NO hay garantía de diseño de que observar facts implique detectar leads. Son mecanismos distintos del EE. | ✅ |
| **F₃** | Independiente de otros Patterns. | ✅ |
| **F₄** | Si la correlación es perfecta (θ=1.0) con n=20, P(20/20 | H₀) es extremadamente baja. Pasa. | ✅ |
| **VEREDICTO** | **PATTERN.** Relación descubierta, no trivial, con evidencia suficiente y significativa. | ✅ |

---

## Sección 10: Veredicto

### 10.1 ¿Cuándo una relación deja de ser una observación y pasa a ser un Pattern cognitivo válido?

> **Una relación R deja de ser una observación y se convierte en un Pattern cognitivo válido cuando pasa simultáneamente los cuatro filtros epistemológicos del Acceptance Contract:**
>
> 1. **F₁ — Adecuación Empírica:** Existe evidencia suficiente en tamaño, diversidad y consistencia.
> 2. **F₂ — No-Trivialidad Arquitectónica:** R no es una invariante del diseño del sistema.
> 3. **F₃ — Independencia Lógica:** R no es deducible de Patterns ya aceptados.
> 4. **F₄ — No-Coincidencia:** R no es explicable por azar estadístico.
>
> ```
> Accept(R) ↔ F₁(R) ∧ F₂(R) ∧ F₃(R) ∧ F₄(R)
> ```
>
> **Si alguno falla, R sigue siendo una observación (candidato o descartado). Si todos pasan, R es un Pattern.**

### 10.2 Criterios refutados

| Criterio | ¿Es condición suficiente? | ¿Es condición necesaria? | Estado |
|:---------|:------------------------:|:------------------------:|:-------|
| Frecuencia | ❌ No | ✅ Sí (F₁ exige n mínimo) | Necesario pero no suficiente |
| Confianza θ | ❌ No | ✅ Sí (F₁ exige θ ≥ θ_min) | Necesario pero no suficiente |
| Repetición | ❌ No | ⚠️ Parcialmente (F₁ exige n mínimo) | Necesario pero insuficiente (y el umbral es dimensional, no fijo) |
| Evidencia E | ❌ No | ✅ Sí (F₁ exige que E exista y sea adecuada) | Necesario pero no suficiente |
| Correlación | ❌ No | ✅ Sí (define R, no la acepta) | Define R, no justifica R |

### 10.3 Responsabilidades derivadas del Acceptance Contract

| # | Responsabilidad | Propietario |
|:-:|-----------------|:-----------:|
| AC-R1 | Mantener el catálogo de invariantes (F₂) actualizado con cada cambio arquitectónico | Arquitecto de cada capa (EE, Memory, contrato) |
| AC-R2 | No aceptar Patterns que fallen cualquiera de los 4 filtros | Pattern Discovery |
| AC-R3 | Preservar candidatos (F₁ sí, F₂/F₃/F₄ no) para re-evaluación futura | Pattern Discovery |
| AC-R4 | No descartar relaciones que pasan F₁ aunque fallen los demás filtros — conservar como candidatos | Pattern Discovery |
| AC-R5 | No usar α sin corrección por múltiples comparaciones | Pattern Discovery |
| AC-R6 | Reportar en cada Pattern cuáles filtros se aplicaron y con qué valores | Pattern Discovery |

### 10.4 Invariantes agregadas a POA-1

| ID | Invariante | Fundamento |
|:--:|------------|:-----------|
| **P-I10** | **Cuatro filtros** — Todo Pattern aceptado debe pasar F₁ ∧ F₂ ∧ F₃ ∧ F₄ | Acceptance Contract §8 |
| **P-I11** | **Catálogo vivo** — El catálogo de invariantes (F₂) es parte del contrato y debe mantenerse | Si el catálogo está desactualizado, F₂ no puede operar correctamente |
| **P-I12** | **Corrección por comparaciones** — F₄ requiere corrección por número de relaciones evaluadas | Sin corrección, F₄ permite falsos positivos por exploración exhaustiva |
| **P-I13** | **Conservación de candidatos** — Relaciones que pasan F₁ pero fallan F₂/F₃/F₄ se conservan como candidatos | Preserva observaciones que pueden madurar con más datos |
| **P-I14** | **Asimetría conservadora** — El contrato prefiere falsos negativos (rechazar Pattern genuino) sobre falsos positivos (aceptar relación espuria) | Es más costoso actuar sobre una falsa creencia que ignorar una verdadera |

### 10.5 Implicancias para Pattern Discovery

1. **Pattern Discovery NO es un detector de correlaciones.** Es un sistema epistemológico que produce conocimiento justificado.

2. **Pattern Discovery debe implementar los 4 filtros.** Omitir cualquiera viola el Acceptance Contract.

3. **El catálogo de invariantes debe ser mantenido por cada capa.** Esto requiere un mecanismo de notificación cuando se introducen nuevas invariantes.

4. **Los candidatos son tan importantes como los Patterns.** Representan conocimiento potencial que puede madurar.

5. **El Acceptance Contract es previo a cualquier implementación.** Pattern Discovery debe diseñarse contra estos filtros, no al revés.

---

*Fin de PAA-1 — Pattern Acceptance Audit*
*Sobreviene como el Acceptance Contract del pipeline cognitivo*
