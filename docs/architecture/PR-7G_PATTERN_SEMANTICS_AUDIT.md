# PR-7G — Pattern Semantics Audit

**Estado:** Documento de auditoría ontológica  
**Fecha:** 2026-07-13  
**Driver:** Determinar ontológicamente si R9-R12 (selección por θ_min, relevancia, no-redundancia, categorización) son propiedades intrínsecas del Pattern, dependientes del Goal, contractuales, o eliminables.

---

## Regla metodológica

Esta auditoría aplica **argumentos ontológicos exclusivamente**. No se aceptan:
- SRP, CCP, CRP ni ningún principio SOLID (son de diseño, no de ontología).
- Conveniencia, rendimiento, volumen de datos, ni argumentos prácticos.
- Preferencias estéticas o analogías no ontológicas.
- Suposiciones sobre implementación de Goals.

Solo cuenta una pregunta: **ontológicamente, ¿a qué pertenece esta propiedad?**
- **A:** Es propiedad intrínseca del Pattern → pertenece a Pattern Discovery.
- **B:** Es propiedad dependiente del Goal → pertenece a Goals.
- **C:** Es contractual (pertenece a la frontera Pattern Discovery→Goals).
- **D:** No debería existir (eliminar).

---

## Tabla de contenidos

1. [Fundamento ontológico: ¿Qué es un Pattern?](#1-fundamento-ontológico)
2. [Las 10 preguntas ontológicas](#2-las-10-preguntas-ontológicas)
3. [Análisis por responsabilidad](#3-análisis-por-responsabilidad)
   - [3.1 R9 — Selección por θ_min](#31-r9--selección-por-θ_min)
   - [3.2 R10 — Selección por relevancia](#32-r10--selección-por-relevancia)
   - [3.3 R11 — Selección por no-redundancia](#33-r11--selección-por-no-redundancia)
   - [3.4 R12 — Categorización τ](#34-r12--categorización-τ)
4. [Refutación de PR-7F](#4-refutación-de-pr-7f)
5. [Veredicto](#5-veredicto)
6. [Implicancias arquitectónicas](#6-implicancias-arquitectónicas)
7. [Anexo: Mapa de pertenencia ontológica](#7-anexo-mapa-de-pertenencia-ontológica)

---

## 1. Fundamento ontológico

### 1.1 Definición aceptada

De PR-7B, el Pattern (objeto matemático de salida de Pattern Discovery) es:

```
c = ⟨P, θ, E⟩
```

Donde:
- **P**: predicado de segundo orden sobre W^k (describre una regularidad observada)
- **θ**: confianza = |E|/|W^k_τ| (medida de robustez de la regularidad)
- **E**: subconjunto de W^k que soporta P (evidencia empírica)

### 1.2 ¿Qué ES un Pattern ontológicamente?

Un Pattern es una **proposición descriptiva sobre el estado cognitivo observado**. Afirma que "en los datos observados W, existe una regularidad P sustentada por evidencia E con confianza θ."

Características ontológicas fundamentales:

1. **Es un hecho sobre datos.** Su verdad o falsedad depende exclusivamente de W.
2. **Es de segundo orden.** No habla de un snapshot individual, sino de relaciones entre múltiples snapshots.
3. **Es empírico.** Está respaldado por E ⊆ W^k.
4. **Es cuantificable.** θ es una medida objetiva de su frecuencia en los datos.
5. **Es independiente de consumidores.** El Pattern no necesita que nadie lo use para existir.

### 1.3 Principio ontológico fundamental

> **Un Pattern es lo que ES, no para qué SIRVE.**

La utilidad del Pattern (relevancia), la decisión de reportarlo (θ_min), su unicidad relativa a un consumidor (no-redundancia funcional), y su interpretación semántica (categoría interpretativa) son propiedades de la **RELACIÓN entre el Pattern y un consumidor**, no del Pattern mismo.

---

## 2. Las 10 preguntas ontológicas

### P1: ¿P puede existir sin θ?

No. θ es la medida de qué tan frecuente es la regularidad en los datos. Sin θ, P es solo una especulación sin soporte cuantitativo. **θ es intrínseco al Pattern.**

### P2: ¿θ puede existir sin P?

No. θ es siempre θ de ALGO. El "algo" es P. **P es intrínseco.**

### P3: ¿E puede existir sin P?

No. E ⊆ W^k es evidencia de P. Sin P, E es solo un subconjunto arbitrario de W. **E es intrínseco.**

### P4: ¿Los tres componentes (P, θ, E) son ontológicamente inseparables?

Sí. La tríada ⟨P, θ, E⟩ es la unidad mínima de conocimiento de segundo orden:
- P dice "qué"
- θ dice "cuánto"
- E dice "dónde"

Si se separan, pierden su función cognitiva. Son inseparables.

### P5: ¿El Pattern cambia si cambia su consumidor?

No. Un Pattern es un hecho sobre W. El consumidor (Goals) no modifica W. **El Pattern es ontológicamente independiente de Goals.**

### P6: ¿El Pattern cambia si cambia el PRODUCTOR (γ)?

Sí — pero solo porque otro γ podría detectar otro P o calcular otro θ. El Pattern c = ⟨P, θ, E⟩ producido por un γ dado es inmutable. Otro γ produce otro Pattern. Pero γ no es parte de c (PR-7D §1). **γ afecta qué Patterns existen, no define al Pattern.**

### P7: ¿La verdad del Pattern depende de su utilidad?

No. Un Pattern puede ser verdadero (describe correctamente una regularidad en W) pero inútil (no sirve para ninguna decisión). La verdad es intrínseca (A); la utilidad es extrínseca (B).

### P8: ¿Dos Patterns con el mismo P son el mismo Pattern ontológico?

Sí — si P₁ = P₂ (afirman la misma regularidad), son el mismo Pattern ontológico, incluso si tienen diferente θ o E (por detección desde diferentes mecanismos). **La identidad del Pattern está en P.**
Matización: dos Patterns con el mismo P pero diferente E son el mismo Pattern con diferente soporte empírico. La identidad del PATTERN está en P. La identidad de la INSTANCIA está en ⟨P, θ, E⟩.

### P9: ¿Un Pattern tiene categoría por naturaleza?

Depende de qué entendemos por "categoría":
- **Categoría descriptiva (matemática)**: Sí. P tiene una forma matemática: estado (P sobre un snapshot), transición (P sobre pares), tendencia (P sobre secuencias), dependencia (P sobre correlaciones). Esta forma es **intrínseca** a cómo P está construido.
- **Categoría interpretativa (semántica)**: No. "Esto es una señal de abandono" requiere un marco de referencia externo al Pattern.

### P10: ¿La redundancia entre Patterns es intrínseca o extrínseca?

Dos niveles:
- **Redundancia estricta** (P₁ = P₂): intrínseca. Dos claims idénticos son redundantes independientemente del consumidor.
- **Redundancia funcional** (P₁ ≠ P₂ pero mismo efecto en Goals): extrínseca. Depende de qué decisiones toma Goals con cada Pattern.

---

## 3. Análisis por responsabilidad

### 3.1 R9 — Selección por θ_min

**Definición (PR-7F):** Filtrar candidatos con θ ≥ θ_min.

#### 3.1.1 Análisis ontológico

θ_min NO es parte de la definición del Pattern. El Pattern c = ⟨P, θ, E⟩ existe con su θ calculado. θ_min es un UMBRAL que determina si c entra en el conjunto de salida M.

**Ontológicamente, θ_min controla la FRONTERA DEL CONJUNTO M, no la definición de c.**

Comparación:
- **θ > 0**: condición intrínseca. Un Pattern sin evidencia (θ = 0) no es un Pattern. El mínimo ontológico es |E| ≥ 1.
- **θ_min >> 0**: condición extrínseca. Decide qué Patterns son "dignos de reportar."

#### 3.1.2 Pregunta ontológica P7

La utilidad del Pattern (¿vale la pena reportarlo?) es extrínseca. Pero θ_min no es directamente una utilidad — es un filtro de calidad basado en confianza.

Sin embargo, la pregunta ontológica clave es: **¿θ_min puede determinarse sin conocer a Goals?**

Sí — parcialmente. Se puede establecer θ_min = ε > 0 sin saber nada de Goals (todo Pattern tiene al menos alguna evidencia). Pero cualquier θ_min > ε requiere una decisión sobre qué tan confiable debe ser un Pattern para ser considerado, y eso depende del riesgo que Goals esté dispuesta a aceptar.

#### 3.1.3 Veredicto

**C — Contractual.** θ_min pertenece a la frontera Pattern Discovery → Goals.

- **ε (θ > |E| ≥ 1):** intrínseco al Pattern (A). Un Pattern sin evidencia no es Pattern.
- **θ_min configurable:** contractual (C). Ni Pattern Discovery ni Goals pueden fijarlo unilateralmente.
  - Si Pattern Discovery lo fija sin consultar a Goals: Pattern Discovery decide el riesgo aceptable → violación ontológica (Pattern Discovery no tiene contexto de decisión).
  - Si Goals lo fija sin coordinar con Pattern Discovery: Goals puede pedir θ_min tan alto que Pattern Discovery nunca produzca Patterns, o tan bajo que el volumen sea inmanejable.

Del modelo matemático (PR-7C §A.1.1): θ_min ∈ Γ_select ⊆ Γ. Γ es parte de la definición de L. Esto sugiere que θ_min SÍ es parte de Pattern Discovery. Pero PR-7D §A.5 establece que γ es INVISIBLE para Goals en el contrato de consumo. Si θ_min está en Γ y Goals no puede verlo, entonces Pattern Discovery decide unilateralmente qué Patterns Reportar.

**La corrección ontológica:** θ_min debe ser un parámetro NEGOCIABLE entre Pattern Discovery y Goals. Esto lo convierte en contractual (C), no en propiedad exclusiva de ninguna capa.

---

### 3.2 R10 — Selección por relevancia

**Definición (PR-7F):** Filtrar por criterios de importancia.

#### 3.2.1 Análisis ontológico

Relevancia es una RELACIÓN entre el Pattern y un contexto de decisión. No es una propiedad del Pattern mismo.

Demostración ontológica:

> Pattern c₁: "cuando readiness cae, missingInfo crece, θ = 0.85"
>
> Pregunta: ¿Es relevante?
> - Para detectar abandono de usuario: SÍ
> - Para decidir precio de transferencia: NO
> - Para evaluar rendimiento del sistema: NO
> - Para mejorar UI del formulario: QUIZÁ

El MISMO Pattern tiene diferente relevancia según el CONTEXTO. Esto prueba que la relevancia no es intrínseca.

**Contraargumento potencial:** "Podemos definir relevancia intrínseca como θ alto + E extenso."

Respuesta: Esto no es "relevancia" — es "robustez estadística." La robustez es intrínseca (está en θ y |E|). La relevancia es QUÉ TANTO IMPORTA esa robustez para una decisión.

**Argumento ontológico adicional:** Si la relevancia fuera intrínseca, dos observadores con diferentes objetivos clasificarían el mismo Pattern igual. Pero esto no ocurre. La relevancia es OBSERVADOR-DEPENDIENTE.

#### 3.2.2 ¿Puede Pattern Discovery computar relevancia?

Pattern Discovery puede computar una HEURÍSTICA de relevancia (ej. "Patterns con θ > 0.9 y que involucren readiness"). Pero esta heurística:
- No es relevancia ontológica (es un proxy estadístico)
- Requiere conocer qué campos le importan a Goals, violando el aislamiento ontológico
- Es frágil: si Goals cambia sus prioridades, la heurística queda obsoleta

#### 3.2.3 Veredicto

**B — Goals.** La relevancia es ontológicamente dependiente del consumidor.

PR-7F acierta completamente en este punto. R10 debe moverse a Goals.

---

### 3.3 R11 — Selección por no-redundancia

**Definición (PR-7F):** Eliminar candidatos duplicados o subsumidos.

#### 3.3.1 Dos tipos de redundancia

| Tipo | Definición | ¿Intrínseca? |
|------|-----------|:------------:|
| **Estructural** | P₁ = P₂ (mismo predicado) | ✅ SÍ |
| **Lógica** | P₁ ⇒ P₂ (uno subsume al otro) | ⚠️ PARCIAL |
| **Funcional** | Goals tomaría misma decisión con ambos | ❌ NO |

#### 3.3.2 Análisis de redundancia estructural

Si dos Patterns producidos por Pattern Discovery tienen P₁ = P₂, ontológicamente son el MISMO Pattern (misma afirmación sobre el mundo). La redundancia es intrínseca porque:
- La identidad del Pattern está en P (P8)
- Dos claims idénticos sobre la misma W son el mismo hecho
- Ningún consumidor podría necesitar ambos — afirman lo mismo

**Límite del argumento:** Si P₁ = P₂ pero E₁ ≠ E₂ (diferente evidencia), los Patterns no son idénticos en contenido empírico. Pero desde el punto de vista de lo que AFIRMAN sobre el mundo, son redundantes.

#### 3.3.3 Análisis de redundancia lógica

P₁ ⇒ P₂ significa que P₁ es más específico que P₂. Ejemplo:
- P₁: "readiness drops AND missingInfo grows"
- P₂: "readiness drops"

Si P₁ es verdadero, P₂ automáticamente lo es. Ontológicamente:
- La relación lógica P₁ ⇒ P₂ existe en los Patterns mismos (es intrínseca)
- Pero LA DECISIÓN de eliminar P₂ depende de si el consumidor necesita el caso general además del específico

Algunos consumidores quieren SOLO el Pattern más específico (más informativo). Otros quieren AMBOS (el general captura una tendencia más amplia; el específico captura un caso concreto).

#### 3.3.4 Análisis de redundancia funcional

P₁ ≠ P₂ pero ambos llevarían a Goals a tomar la misma decisión. Ejemplo:
- P₁: "readiness drops, θ = 0.9"
- P₂: "missingInfo grows, θ = 0.9"

Ambos podrían trigger "ofrecer ayuda" en Goals. Pero son Patterns DIFERENTES sobre campos diferentes.

Esta redundancia es puramente funcional y depende de la lógica de decisión de Goals. Es extrínseca.

#### 3.3.5 Veredicto

**A/B — Dividido.** La redundancia estructural (mismo P) pertenece a Pattern Discovery (A). La redundancia funcional pertenece a Goals (B). La redundancia lógica (subsunción) tiene aspectos intrínsecos (la relación existe en los Patterns) y extrínsecos (la decisión de eliminar depende del consumidor) — se clasifica como contractual (C) o Goals (B) según el diseño, pero ONTOLÓGICAMENTE la decisión de eliminar por subsunción es del consumidor.

| Subtipo | ¿Intrínseco? | Pertenece a |
|---------|:-----------:|:-----------:|
| P₁ = P₂ (estricta) | ✅ Sí | A — Pattern Discovery |
| P₁ ⇒ P₂ (subsunción) | ❌ No (decisión) | B — Goals |
| Funcional (mismo efecto) | ❌ No | B — Goals |

PR-7F trata R11 como si TODA la no-redundancia fuera extrínseca. Esto es parcialmente correcto: la redundancia funcional y por subsunción sí son extrínsecas. Pero la redundancia estricta (mismo P) es intrínseca y debe permanecer en Pattern Discovery.

---

### 3.4 R12 — Categorización τ

**Definición (PR-7F):** Asignar tipo semántico a cada regularidad.

#### 3.4.1 La ambigüedad de τ

El símbolo τ aparece en dos contextos diferentes dentro de los documentos PR-7:

| Contexto | Significado de τ | Naturaleza |
|----------|-----------------|------------|
| PR-7B §2.3 | Tipo de regularidad: estado, transición, tendencia, dependencia, ciclo | **DESCRIPTIVA** — describe la forma matemática de P |
| PR-7D §193 | "Goals necesita saber qué tipo de claim es" | **DESCRIPTIVA** — obligatoria en el contrato Pattern Discovery→Goals |
| PR-7F R12 | "tipo semántico" | **INTERPRETATIVA** — asigna significado a la regularidad |

Hay DOS conceptos ontológicamente diferentes usando el mismo símbolo τ.

#### 3.4.2 τ descriptivo (forma matemática)

El tipo de regularidad (estado/transición/tendencia/dependencia) es una propiedad INTRÍNSECA del Pattern porque:
- Describe la ESTRUCTURA MATEMÁTICA de P (su aridad, su tipo de relación)
- Un predicado que compara sᵢ y s_{i+1} ES una transición, independientemente de quién lo mire
- No requiere contexto externo para su clasificación
- Ya está en el contrato Pattern Discovery→Goals como información obligatoria (PR-7D §193)

**Demostración ontológica:** Dado P, su tipo descriptivo se determina mecánicamente examinando su estructura. No hay ambigüedad. No depende de interpretación.

#### 3.4.3 τ interpretativo (significado semántico)

La categoría semántica (ej. "señal de abandono", "patrón de confusión", "indicador de clarificación") requiere:
- Conocimiento del dominio de negocio
- Marco de interpretación (¿qué significa "abandono"?)
- Contexto de decisión de Goals

Esta categorización es EXTRÍNSECA porque el mismo Pattern puede tener diferentes significados semánticos en diferentes contextos.

#### 3.4.4 ¿Cuál τ pretende mover PR-7F?

PR-7F §9.2 dice textualmente: "La categorización depende de la TAXONOMÍA DE GOALS, no de Pattern Discovery. Si Goals cambia su taxonomía, Pattern Discovery debe cambiar."

Esto se refiere τ INTERPRETATIVO (la taxonomía es de Goals). Pero PR-7F no distingue entre τ descriptivo e interpretativo, y sugiere mover AMBOS a Goals.

#### 3.4.5 Veredicto

**A/B — Dividido.**

| Tipo de τ | ¿Intrínseco? | Pertenece a |
|-----------|:-----------:|:-----------:|
| τ descriptivo (estado/transición/tendencia/dependencia) | ✅ Sí | **A — Pattern Discovery** |
| τ interpretativo (señal de abandono, confusión, etc.) | ❌ No | **B — Goals** |

PR-7F acierta en que el τ interpretativo debe moverse a Goals. Pero el τ descriptivo debe PERMANECER en Pattern Discovery porque es parte de la identidad matemática del Pattern.

**Nota importante:** PR-7D ya estableció τ descriptivo como OBLIGATORIO en el contrato Pattern Discovery→Goals. Eliminar τ descriptivo de Pattern Discovery rompería el contrato existente.

---

## 4. Refutación de PR-7F

### 4.1 Síntesis de PR-7F

PR-7F concluyó que R9-R12 deben moverse a Goals:
- R9 (θ_min) → Goals
- R10 (relevancia) → Goals
- R11 (no-redundancia) → Goals
- R12 (categorización) → Goals

### 4.2 Errores ontológicos de PR-7F

| Error | Descripción | Consecuencia |
|-------|-------------|--------------|
| **E1** | Tratar θ_min como propiedad exclusiva de Goals | θ_min es contractual; Pattern Discovery necesita un mínimo (ε > 0) y Goals provee el umbral configurable |
| **E2** | No distinguir redundancia estructural de funcional | La deduplicación por mismo P es intrínseca; moverla a Goals obligaría a Goals a deducir igualdad de Patterns, duplicando lógica |
| **E3** | No distinguir τ descriptivo de τ interpretativo | El τ descriptivo es parte de la identidad del Pattern; moverlo a Goals eliminaría información ontológica del contrato |
| **E4** | Usar argumentos de diseño (SRP, CCP) como si fueran ontológicos | La violación SRP no prueba pertenencia ontológica; solo prueba que hay responsabilidades mezcladas, no hacia dónde moverlas |
| **E5** | Asumir que lo que Goals "sabe mejor" es ontológicamente de Goals | "Goals sabe qué confianza necesita" no prueba que θ_min sea ontológicamente de Goals; solo que Goals debe tener influencia |

### 4.3 Aciertos ontológicos de PR-7F

| Acierto | Descripción | Confirmación |
|---------|-------------|:-----------:|
| **A1** | R10 (relevancia) debe estar en Goals | ✅ PR-7G confirma: B |
| **A2** | R12 interpretativa debe estar en Goals | ✅ PR-7G confirma: B (parcial) |
| **A3** | R11 funcional debe estar en Goals | ✅ PR-7G confirma: B (parcial) |
| **A4** | R9 es candidato a salir de Pattern Discovery | ⚠️ PR-7G matiza: C (contractual), no B (Goals) |
| **A5** | Pattern Discovery necesita simplificarse | ✅ Confirmado, pero la simplificación es menos radical |

### 4.4 El mapa correcto post-PR-7G

```
PR-7F decía:              PR-7G demuestra:
R9  → Goals (B)           R9  → Contractual (C)
R10 → Goals (B)           R10 → Goals (B)            ✅ CONFIRMADO
R11 → Goals (B)           R11 → A/B parcial           ⚠️ MATIZADO
R12 → Goals (B)           R12 → A/B parcial           ⚠️ MATIZADO
```

**PR-7F era demasiado agresivo en su simplificación.** El movimiento completo de R9-R12 a Goals no es ontológicamente correcto. La distribución correcta preserva partes de R11 y R12 en Pattern Discovery, y reconoce R9 como contractual.

---

## 5. Veredicto

### 5.1 Veredicto individual

| Responsabilidad | ID | Veredicto | ¿Refuta PR-7F? |
|----------------|:--:|:---------:|:--------------:|
| Selección por θ_min | R9 | **C — Contractual** | ✅ Sí, PR-7F dijo Goals (B); es contractual (C) |
| Selección por relevancia | R10 | **B — Goals** | ❌ No, PR-7F acertó |
| Selección por no-redundancia | R11 | **A/B — Dividido** (estructural: A; funcional: B) | ⚠️ Parcialmente — PR-7F trató solo B |
| Categorización τ | R12 | **A/B — Dividido** (descriptivo: A; interpretativo: B) | ⚠️ Parcialmente — PR-7F trató solo B |

### 5.2 Kernel de Pattern Discovery post-PR-7G

El kernel irreducible de Pattern Discovery, ajustado por PR-7G:

```
Kernel(Pattern Discovery) = {L_γ(W) = {⟨P, θ, E, τ_desc⟩ | P ∈ Detect_γ(W) 
                      ∧ E = support(P, W) 
                      ∧ θ = |E|/|W^k_τ| 
                      ∧ θ ≥ ε
                      ∧ NOT(∃P': P' ∈ Detect_γ(W) ∧ P' = P)}}
```

Donde:
- **ε**: umbral absoluto fijo (θ debe tener al menos alguna evidencia)
- **NOT(∃P': P' = P)**: deduplicación estructural (mismo P)

Pattern Discovery produce Patterns CON su tipo descriptivo (τ_desc). NO aplica:
- Filtro por θ_min configurable (lo hace Goals o el contrato)
- Filtro por relevancia (lo hace Goals)
- Eliminación por subsunción (lo hace Goals)
- Categorización interpretativa (la hace Goals)

### 5.3 ¿Cambia el veredicto de PR-7F (C: simplificable)?

**No cambia.** Pattern Discovery sigue siendo simplificable (C). Pero la simplificación es MENOS radical de lo que PR-7F propuso:

- PR-7F proponía: 18 responsabilidades → 6 en Pattern Discovery, 12 fuera o en Goals
- PR-7G propone: 18 responsabilidades → 8 en Pattern Discovery (R1-R8, + τ_desc, + dedup estructural), 3 en Goals (relevancia, subsunción, τ_interpretativo), 1 contractual (θ_min), 6 auxiliares (R14-R18)

| Propuesta | Responsabilidades en Pattern Discovery |
|-----------|:----------------------------:|
| PR-7F (kernel mínimo) | 6 (R1, R3, R7, R9, R13, R17) |
| PR-7G (kernel ontológico) | 8 (R1-R8 + dedup estructural + τ_desc) |

Pattern Discovery es simplificable — pero no hasta 6 responsabilidades. La deduplicación estructural y la categorización descriptiva son ontológicamente inseparables del Pattern.

---

## 6. Implicancias arquitectónicas

### 6.1 Para el contrato Pattern Discovery → Goals

El contrato de PR-7D debe ajustarse:

| Componente | Antes (PR-7D) | Después (PR-7G) | ¿Cambio? |
|-----------|---------------|-----------------|:--------:|
| P (predicado) | Obligatoria | Obligatoria | ❌ No |
| θ (confianza) | Obligatoria | Obligatoria | ❌ No |
| τ_desc (tipo descriptivo) | Obligatoria | Obligatoria | ✅ Se aclara: permanente |
| E (evidencia) | Opcional | Opcional | ❌ No |
| θ_min (umbral) | En γ (invisible) | Contractual (negociable) | ⚠️ Sí |
| τ_interpretativo | No especificado | No es responsabilidad de Pattern Discovery | ✅ Se elimina ambigüedad |
| Relevancia | R10 en Pattern Discovery | No es responsabilidad de Pattern Discovery | ✅ Se elimina |

### 6.2 Para la identidad de Pattern Discovery

PR-7E estableció 12/12 diferencias entre Learning ADR-003 (operacional) y PR-7 (cognitivo). PR-7G no altera esa conclusión.

PR-7G SÍ redefine el límite ontológico de Pattern Discovery cognitivo:
- Pattern Discovery produce `⟨P, θ, E, τ_desc⟩`
- Pattern Discovery NO produce "Patterns relevantes" ni "Patterns categorizados semánticamente"
- Pattern Discovery produce "Patterns crudos" con información estructural completa

### 6.3 Para Goals (cuando se diseñe)

Goals recibirá de Pattern Discovery:
1. Un conjunto M_raw de Patterns con ⟨P, θ, E, τ_desc⟩
2. Sin filtro por θ_min (aplica su propio umbral)
3. Sin filtro por relevancia (decide qué Patterns usar para sus decisiones)
4. Sin deduplicación por subsunción (decide si necesita el caso general y el específico)
5. Sin categorización interpretativa (asigna sus propias categorías semánticas)

Goals necesitará implementar:
- Filtro por θ_min (puede ser un parámetro de Goals o negociado contractualmente)
- Evaluación de relevancia
- Determinación de subsunción y redundancia funcional
- Asignación de categorías interpretativas

### 6.4 Lo que NO cambia

- El pipeline EE → Memory → Pattern Discovery → Goals → Planning (congelado)
- Las invariantes M-1 a M-14 de Memory
- Los 20 invariantes de Architecture Milestone v3.0
- ADR-011 (eliminación de Reflection)
- ADR-010 (Memory Integration Contract)

---

## 7. Anexo: Mapa de pertenencia ontológica

### 7.1 Propiedades intrínsecas del Pattern (A — Pattern Discovery)

| Propiedad | ¿Por qué es intrínseca? |
|-----------|------------------------|
| P (predicado) | Define qué regularidad se afirma |
| θ (confianza) | Medida objetiva de frecuencia en W |
| E (evidencia) | Soporte empírico del predicado |
| τ_desc (tipo matemático) | Describe la forma de P, independiente del consumidor |
| ε (θ mínimo absoluto) | Pattern sin evidencia no es Pattern |
| Dedup estructural (mismo P) | Dos claims idénticos son el mismo Pattern |

### 7.2 Propiedades extrínsecas del Pattern (B — Goals)

| Propiedad | ¿Por qué es extrínseca? |
|-----------|-------------------------|
| Relevancia | Siempre relativa a un contexto/objetivo |
| τ_interpretativo (categoría semántica) | Depende del marco de interpretación |
| Subsunción (eliminar P₂ si P₁ ⇒ P₂) | Depende de si Goals necesita ambos |
| Redundancia funcional (mismo efecto) | Depende de la lógica de decisión de Goals |

### 7.3 Propiedades contractuales (C — Pattern Discovery ↔ Goals)

| Propiedad | ¿Por qué es contractual? |
|-----------|--------------------------|
| θ_min configurable | Ni Pattern Discovery ni Goals pueden fijarlo unilateralmente sin afectar al otro |
| Volumen de M | Pattern Discovery produce; Goals consume. El balance es negociado. |

---

*Este documento es resultado de la auditoría ontológica PR-7G. Utiliza exclusivamente argumentos ontológicos y semánticos. No contiene código, interfaces, ni propuestas de implementación. Refuta parcialmente PR-7F basándose en la distinción entre propiedades intrínsecas y extrínsecas del Pattern.*
