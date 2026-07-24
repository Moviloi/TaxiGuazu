# AITOS Cognitive Constitution — 07-CERTAINTY_CALCULUS.md

> **Certainty Calculus of the AI Transportation Operating System**
>
> Status: **DRAFT** — first writing from Constitutional delegation
> Version: 1.0-draft
> Date: 2026-07-11
>
> ⚠️ This document belongs to **Level III-d (Contractual Authority)** of the AITOS
> Document Hierarchy (CONSTITUTION.md §6). It derives from CONSTITUTION.md (Level I-a),
> SYSTEM_VOCABULARY.md (Level I-b), COGNITIVE_PRINCIPLES.md (Level II-a), EVIDENCE_MODEL.md
> (Level III-a), DECISION_MODEL.md (Level III-b), and COMMITMENT_MODEL.md (Level III-c).
>
> This document defines the **conceptual model** of certainty computation, propagation,
> degradation, aggregation, and recalibration. It does not define formulas, algorithms,
> weights, percentages, code, APIs, or implementation. It prescribes **what** the
> certainty calculus must do and **why**, not **how** it must compute.
>
> Every rule herein is binding on Level IV documents. Violations are implementation debt
> managed under S-P9.

---

## Table of Contents

1. [Preamble — What This Model Is](#1-preamble--what-this-model-is)
2. [Nature of Certainty](#2-nature-of-certainty)
3. [Certainty vs. Confidence](#3-certainty-vs-confidence)
4. [Birth of Certainty](#4-birth-of-certainty)
5. [Factors Affecting Certainty](#5-factors-affecting-certainty)
6. [Certainty Degradation](#6-certainty-degradation)
7. [Certainty Recovery](#7-certainty-recovery)
8. [Propagation of Certainty](#8-propagation-of-certainty)
9. [Aggregation of Certainty](#9-aggregation-of-certainty)
10. [Revision and Recalibration](#10-revision-and-recalibration)
11. [Residual Uncertainty](#11-residual-uncertainty)
12. [Epistemic Limits](#12-epistemic-limits)
13. [Stability, Convergence, and Divergence](#13-stability-convergence-and-divergence)
14. [Certainty and Decision](#14-certainty-and-decision)
15. [Certainty and Commitment](#15-certainty-and-commitment)
16. [Certainty and Learning](#16-certainty-and-learning)
17. [False Certainty and False Doubt Prevention](#17-false-certainty-and-false-doubt-prevention)
18. [Persistence and Traceability](#18-persistence-and-traceability)
19. [Consistency of the Certainty Calculus](#19-consistency-of-the-certainty-calculus)
20. [Invariants](#20-invariants)
21. [Delegation to Implementation Documents](#21-delegation-to-implementation-documents)

---

## 1. Preamble — What This Model Is

### 1.1 Purpose

This document specifies the **Certainty Calculus** of AITOS: the complete conceptual
definition of how Certainty is born, how it changes, how it flows through the cognitive
system, how it is bounded, and how it participates in Decisions, Commitments, and
Learning.

The Certainty Calculus is the **mathematical conscience** of the system. It ensures that:

- Every Belief carries a well-founded degree of confidence.
- Every Decision is based on an explicit comparison between Certainty and threshold.
- Every Commitment freezes the Certainty that justified it.
- Every outcome feeds back to recalibrate the calculus.

This document does not prescribe formulas. It prescribes the epistemic behavior that
any implementation must satisfy.

### 1.2 Scope

This document governs:

1. **What Certainty is** — its nature, its distinction from Confidence, its role in
   the cognitive architecture.
2. **How Certainty is born** — from Evidence, through the five factors (R-EM-043).
3. **How Certainty changes** — degradation, recovery, revision, recalibration.
4. **How Certainty flows** — propagation through belief relationships, aggregation
   across evidence.
5. **How Certainty is bounded** — epistemic limits, residual uncertainty, minimum and
   maximum bounds.
6. **How Certainty participates** — in Decision (threshold comparison), in Commitment
   (freezing), in Learning (recalibration).
7. **How Certainty is preserved** — persistence, traceability, audit.
8. **How Certainty avoids error** — false certainty prevention, false doubt prevention.

This document does **NOT** govern:

- The storage or retrieval of Evidence (see EVIDENCE_MODEL.md).
- The state machine of Commitments (see COMMITMENT_MODEL.md).
- The evaluation of Decision alternatives (see DECISION_MODEL.md).
- The execution of Actions (see ACTION_EXECUTOR.md).
- The specific formulas, weights, or algorithms used to compute Certainty.
- The implementation of the calculus in code, databases, or APIs.

### 1.3 Authority hierarchy

| Source document | Relationship to this document |
|----------------|------------------------------|
| **CONSTITUTION.md** (Level I-a) | Source of supreme principles: §3.1 (Inaccessibility of Truth), §3.3 (Dual-domains of certainty), §3.4 (Epistemic Sufficiency Principle), P-E2 (Certainty Is Continuous), P-I4 (Humility Before Uncertainty), S-P1 (Evidence-Based Operation) |
| **SYSTEM_VOCABULARY.md** (Level I-b) | Source of all terminology: Certainty (6.2), Confidence (6.3), Belief (5.2), Evidence (5.1), Source (4.4), Hypothesis (6.4), Knowledge State (6.1), Certainty Threshold (8.4) |
| **COGNITIVE_PRINCIPLES.md** (Level II-a) | Source of cognitive principles: CP-18 (Certidumbre continua), CP-19 (Degradación temporal), CP-20 (Actualización por Evidence), CP-21 (Límite epistémico) |
| **EVIDENCE_MODEL.md** (Level III-a) | Defines the Evidence that feeds into Certainty: R-EM-042 (Certainty is a function of Evidence), R-EM-043 (Five factors), R-EM-044 (Epistemic bounds), R-EM-045 (Automatic recalculation) |
| **DECISION_MODEL.md** (Level III-b) | Defines how Certainty is used in Decisions: R-DM-010 (Sufficiency criterion), R-DM-014 (Certainty as primary variable), R-DM-015 (Multiple Evidence aggregation), R-DM-018 (Epistemic margin) |
| **COMMITMENT_MODEL.md** (Level III-c) | Defines how Certainty is used in Commitments: R-CM-016 (Threshold computation), R-CM-033 (Certainty at commitment time), R-CM-034 (Post-commitment degradation) |

### 1.4 Reading this document

Each rule in this document follows this uniform format:

```
### R-CC-NNN — Name of the rule

**Enunciado:** The normative statement.

**Derivación Constitucional:** References to source documents.

**Justificación:** Why this rule exists.

**Implicaciones Cognitivas:** How the system's behavior is affected.

**Impacto Conversacional:** What observable improvement this produces in the user experience.

**Verificación:** Binary criterion to determine if a change violates this rule.

**Delegación:** Which Level III or Level IV documents must concretize this rule.
```

---

## 2. Nature of Certainty

### R-CC-001 — Definition of Certainty

**Enunciado:** La Certainty (SYSTEM_VOCABULARY.md §6.2) es la medida de cuán confiado está el
sistema de que una Belief corresponde a la Verdad. Es un valor continuo, dinámico y
siempre imperfecto. La Certainty no es una propiedad almacenada de la Belief — es una
propiedad derivada, computada en cada ciclo a partir de la Evidence disponible.

**Derivación Constitucional:** CONSTITUTION.md §3.1 (Inaccessibility of Truth — la
Certainty nunca es Verdad); CONSTITUTION.md §3.3.1 (Internal domain — continua,
probabilística); P-E2 (Certainty Is Continuous); CP-18 (certidumbre continua);
SYSTEM_VOCABULARY.md §6.2 (Certainty como medida de confianza en la correspondencia con Verdad).

**Justificación:** La Constitución establece que AITOS no tiene acceso a la Verdad
(§3.1). Opera sobre creencias fundamentadas en Evidence. La Certainty es el mecanismo
que cuantifica cuán cerca está una Belief de la Verdad, dado lo que el sistema sabe.
No es un atributo fijo — cambia con cada nueva Evidence. No es binaria — es un espectro.
No es absoluta — siempre hay un margen de error.

**Implicaciones Cognitivas:**
- Toda Belief en el sistema tiene una Certainty calculada, nunca asignada.
- La Certainty se recalcula cada vez que cambia la Evidence relevante.
- La Certainty no se almacena como parte de la Belief — se deriva de la Evidence.
- El sistema nunca pregunta "¿es verdad?" — pregunta "¿cuál es la Certainty dado lo
  que sabemos?"
- La Certainty pertenece al dominio interno del sistema (§3.3.1). La comunicación al
  usuario puede simplificarla pero no distorsionarla.

**Impacto Conversacional:** El sistema nunca afirma nada con más seguridad de la que
su Evidence justifica. Cuando dice "entiendo que quieres ir al aeropuerto," esa
afirmación está respaldada por una Certainty calculada, no por una corazonada. El
usuario recibe información calibrada.

**Verificación:** ¿Existe alguna Belief en el sistema cuya Certainty sea asignada
manualmente en lugar de derivada de Evidence? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el momento del ciclo donde se
recalcula la Certainty), CERTAINTY_CALCULUS implementation (implementa el cálculo
derivado).

---

### R-CC-002 — Certainty is continuous, never binary

**Enunciado:** La Certainty de toda Belief debe ser un valor continuo. Ninguna Belief
puede tratarse como binaria (verdadero/falso, segura/insegura) en la capa cognitiva
interna. La simplificación a categorías discretas solo está permitida en la capa de
comunicación externa (CONSTITUTION.md §3.3.2).

**Derivación Constitucional:** P-E2 (Certainty Is Continuous); CP-18 (certidumbre
continua — "ninguna Belief puede tratarse como binaria en la capa cognitiva");
CONSTITUTION.md §3.3.1 (Internal epistemic rules — "Binary certainty is prohibited
in the cognitive layer").

**Justificación:** La certidumbre binaria es una ficción útil para la comunicación
humana pero un error epistémico. El mundo real no es blanco o negro — la intención
del usuario no es 0% o 100%. Forzar la certidumbre a valores binarios en la capa
cognitiva elimina información valiosa y puede llevar a decisiones incorrectas.

**Implicaciones Cognitivas:**
- Ninguna Belief puede existir sin un valor continuo de Certainty.
- Los estados cualitativos (CONFIRMED, SUSPECTED, REJECTED) son simplificaciones
  externas, no reemplazos del valor continuo interno.
- La transición entre "creer" y "no creer" no es un salto binario — es un cruce de
  umbral.
- El valor continuo permite comparaciones precisas: "la Belief A tiene más apoyo que
  la Belief B."

**Impacto Conversacional:** El sistema puede manejar matices. No trata una duda
pequeña como si fuera ignorancia total, ni una creencia fuerte como verdad absoluta.
La comunicación es más natural porque refleja la gradación natural del conocimiento
humano.

**Verificación:** ¿Existe algún componente cognitivo que trate la Certainty como un
valor binario (seguro/inseguro) en lugar de continuo? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define la representación continua de la
Certainty en el ciclo), CERTAINTY_CALCULUS implementation (opera exclusivamente con
valores continuos).

---

### R-CC-003 — Certainty is always provisional

**Enunciado:** Toda Certainty en el sistema es provisional. Puede aumentar, disminuir,
o desaparecer con nueva Evidence. Ninguna Certainty es permanente, ni siquiera la de
Beliefs con mucho apoyo. La provisionalidad es una propiedad fundamental, no un defecto.

**Derivación Constitucional:** P-E4 (Revisability of Beliefs); CONSTITUTION.md §3.5
("The system's knowledge is provisional — all Beliefs are subject to revision when
new Evidence arrives"); CP-20 (actualización por Evidence).

**Justificación:** Si la Certainty no fuera provisional, el sistema no podría corregir
errores. Una Belief con alta Certainty hoy puede ser refutada mañana por nueva
Evidence. La provisionalidad es la expresión operativa de la humildad epistémica
(P-I4): el sistema nunca está "completamente seguro" de nada empírico.

**Implicaciones Cognitivas:**
- Toda Certainty puede ser revisada. No hay Beliefs "congeladas" o "inmunes a revisión."
- La provisionalidad no implica inestabilidad: una Belief con alta Certainty y mucha
  Evidence corroborante requiere Evidence sustancial para cambiar.
- El sistema no debe esperar que la Certainty "se estabilice" permanentemente —
  debe estar preparado para revisarla.
- La provisionalidad es un incentivo para que el sistema busque confirmación periódica.

**Impacto Conversacional:** El sistema puede admitir errores y corregirlos. Si nueva
información muestra que estaba equivocado, ajusta su posición sin rigidez. El usuario
no experimenta un sistema terco que se aferra a creencias desactualizadas.

**Verificación:** ¿Existe algún mecanismo en el sistema que impida la revisión de una
Certainty, incluso con nueva Evidence relevante? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el proceso de revisión de Certainty
en cada ciclo), CERTAINTY_CALCULUS implementation (permite la actualización de
Certainty sin restricciones permanentes).

---

## 3. Certainty vs. Confidence

### R-CC-004 — Certainty and Confidence are distinct

**Enunciado:** El sistema distingue explícitamente entre Confidence (SYSTEM_VOCABULARY.md §6.3)
y Certainty (SYSTEM_VOCABULARY.md §6.2):

| Concepto | Confidence | Certainty |
|----------|-----------|-----------|
| **Pertenece a** | La Source de la Evidence | La Belief |
| **Mide** | Confiabilidad histórica de la fuente | Probabilidad de que la Belief corresponda a la Verdad |
| **Es** | Un input, relativamente estable | Un output, dinámico |
| **Cambia con** | Outcomes históricos de la Source | Nueva Evidence, tiempo, contexto |
| **Se usa para** | Ponderar Evidence en el cálculo de Certainty | Decidir si comprometerse |

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §6.2 (Certainty) y §6.3 (Confidence);
CP-18 (certidumbre continua — se construye a partir de Confidence de las fuentes);
CP-38 (ajuste de confianza de fuente — la Confidence se ajusta con outcomes).

**Justificación:** La confusión entre Confidence y Certainty fue identificada como una
de las principales fuentes de deuda terminológica en el sistema (SYSTEM_VOCABULARY.md preámbulo).
La Confidence responde "¿qué tan confiable es esta fuente?" La Certainty responde "¿qué
tan probable es que esta creencia sea correcta?" La segunda depende de la primera, pero
no son lo mismo. Una fuente confiable puede producir una creencia que luego es
contradicha por otra fuente igualmente confiable.

**Implicaciones Cognitivas:**
- Confidence es un atributo de la Source. Se almacena con cada Evidence.
- Certainty es un atributo derivado de la Belief. Se computa a partir de múltiples
  Evidence, cada una con su Confidence.
- La Certainty no es el promedio de Confidence — es una función que considera
  corroboración, contradicción, y otros factores (R-CC-007).
- La Confidence puede ajustarse con outcomes (aprendizaje); la Certainty se recalcula
  automáticamente.
- El sistema nunca usa Confidence directamente como Certainty.

**Impacto Conversacional:** El sistema no confunde "esto lo dijo una fuente confiable"
con "esto es verdad." Si una fuente confiable se equivoca, el sistema lo detecta por
la contradicción con otras fuentes, no porque la fuente pierda toda su confianza de
golpe. Las decisiones son más robustas.

**Verificación:** ¿Existe algún flujo donde la Confidence de una Source se use
directamente como Certainty de una Belief, sin pasar por el proceso de agregación?
Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define Confidence como atributo de Evidence),
CERTAINTY_CALCULUS implementation (implementa la función de Certainty que consume
Confidence como input, no como resultado).

---

### R-CC-005 — Confidence feeds Certainty, not vice versa

**Enunciado:** La Confidence de las fuentes es un input para el cálculo de Certainty.
La Certainty de las Beliefs nunca es un input para ajustar la Confidence de las fuentes.
La dirección es unidireccional: la Confidence contribuye a la Certainty, pero la
Certainty no modifica la Confidence.

**Derivación Constitucional:** CP-38 (ajuste de confianza de fuente — la Confidence se
ajusta por outcomes, no por Certainty); SYSTEM_VOCABULARY.md §6.3 (Confidence produce Certainty
como input).

**Justificación:** Si la Certainty pudiera modificar la Confidence, se crearía un ciclo
de retroalimentación positiva: "esta Belief tiene alta Certainty, por tanto su fuente
es confiable, por tanto la Belief debería tener más Certainty." Esto llevaría a
sobreconfianza. La Confidence debe ajustarse exclusivamente por outcomes observados
(CP-37), no por la Certainty que ayudó a producir.

**Implicaciones Cognitivas:**
- El flujo es: Evidence (con Confidence) → agregación → Certainty de Belief.
- La retroalimentación es: outcome → ajuste de Confidence de la Source.
- Cerrado el ciclo: outcome → Confidence → Certainty → decisión → outcome.
- No existe el camino inverso: Certainty → Confidence.

**Impacto Conversacional:** El sistema no entra en espirales de sobreconfianza. Una
creencia que parece muy segura no hace que el sistema sobrestime automáticamente la
confiabilidad de sus fuentes. Cada fuente se evalúa por sus resultados, no por las
creencias que produce.

**Verificación:** ¿Existe algún mecanismo donde la Certainty de una Belief modifique
la Confidence de las Sources que la produjeron? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el flujo unidireccional en el modelo de
decisión), CERTAINTY_CALCULUS implementation (implementa el cálculo sin
retroalimentación).

---

## 4. Birth of Certainty

### R-CC-006 — Certainty is born from Evidence

**Enunciado:** Toda Certainty nace de la Evidence registrada en el Evidence Store.
No existe Certainty sin Evidence. Si no hay Evidence para una proposición, no existe
Certainty — y sin Certainty, no existe Belief. La Certainty es la traducción epistémica
de la Evidence al lenguaje de la decisión.

**Derivación Constitucional:** R-EM-042 (Certainty is a function of Evidence);
CP-05 (frontera percepción/evidencia — solo la Evidence registrada tiene valor
epistémico); S-P1 (Evidence-Based Operation).

**Justificación:** La Evidence es el único fundamento admisible para cualquier
afirmación epistémica en AITOS (R-EM-004). La Certainty no puede originarse en
intuición, especulación, o valores por defecto no fundamentados. Si no hay Evidence,
la Certainty es cero y no debe existir una Belief.

**Implicaciones Cognitivas:**
- La Certainty se computa cuando existe al menos una Evidence relevante.
- Si no hay Evidence, la proposición permanece como Hypothesis (CP-13), no como Belief.
- La Certainty inicial se calcula a partir de la primera Evidence registrada.
- El momento de nacimiento de la Certainty es el momento en que la primera Evidence
  es leída por el proceso de Razonamiento.

**Impacto Conversacional:** El sistema no forma creencias sin fundamento. No dice
"creo que es X" a menos que tenga al menos una pieza de Evidence que lo respalde.
Esto elimina las "corazonadas" del sistema.

**Verificación:** ¿Existe alguna Belief en el sistema cuya Certainty se haya calculado
sin que exista al menos una Evidence relevante en el Evidence Store? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define la condición "Evidence presente" como
precondición del cálculo de Certainty), CERTAINTY_CALCULUS implementation (verifica la
existencia de Evidence antes de computar).

---

### R-CC-007 — Five contributing factors

**Enunciado:** El cálculo de Certainty para una proposición debe considerar, como
mínimo, los siguientes cinco factores definidos en EVIDENCE_MODEL.md R-EM-043:

| Factor | Qué mide | Efecto en Certainty |
|--------|----------|-------------------|
| **Confidence de cada Evidence** | Confiabilidad de la Source de cada Evidence (SYSTEM_VOCABULARY.md §6.3) | Mayor Confidence → mayor contribución a Certainty |
| **Corroboración** | Número de Evidence independientes que apoyan la misma proposición | Más corroboración → mayor Certainty (con efecto decreciente) |
| **Contradicción** | Presencia y peso de Evidence que refuta la proposición | Contradicción reduce Certainty (una fuerte contradicción puede anular múltiples corroboraciones) |
| **Edad** | Tiempo transcurrido desde la percepción de cada Evidence | Evidence más antigua tiene menor impacto en Certainty |
| **Precedencia de Source** | Jerarquía de confiabilidad del tipo de Source (R-EM-041) | Evidence de mayor precedencia (UserConfirmation) tiene más peso que Evidence de menor precedencia (LLMInference) |

**Derivación Constitucional:** R-EM-043 (Evidence and Certainty — five factors);
CP-18 (certidumbre continua — construida desde Confidence); CP-19 (degradación
temporal — edad); CP-20 (actualización por Evidence — corroboración y contradicción);
CP-10 (resolución de Evidence conflictiva — contradicción); SYSTEM_VOCABULARY.md §4.4
(precedencia de Source); CP-38 (ajuste de confianza).

**Justificación:** La certeza no es una función de un solo factor. Una Belief puede
tener mucha Evidence pero toda de fuentes de baja confianza (alta corroboración, baja
Confidence). O puede tener una sola Evidence de altísima confianza (confirmación del
usuario). O puede tener Evidence que se contradicen entre sí. Los cinco factores
capturan las dimensiones relevantes de la calidad epistémica de la Evidence.

**Implicaciones Cognitivas:**
- Todos los factores deben considerarse simultáneamente. Ninguno puede ignorarse.
- La corroboración tiene efecto decreciente: la décima Evidence confirmatoria aporta
  menos que la segunda.
- Una contradicción fuerte (alta Confidence, alta precedencia) puede reducir la
  Certainty más de lo que varias corroboraciones débiles la aumentaron.
- La edad no elimina la Evidence — reduce su peso. La Evidence antigua pero no
  contradicha sigue contribuyendo, pero menos que una reciente.
- La precedencia de Source es un ordenador: UserConfirmation > DirectExtraction >
  KnowledgeBaseLookup > LLMInference > DefaultValue.

**Impacto Conversacional:** El sistema pondera la información apropiadamente. Una
confirmación explícita del usuario pesa más que una inferencia del LLM. La
contradicción no se ignora. La información antigua se desvanece gradualmente. Las
decisiones reflejan la calidad real de la información disponible.

**Verificación:** ¿Existe algún cálculo de Certainty en el系统 que no considere
explícitamente los cinco factores? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS implementation (implementa la función de cinco
factores), EVIDENCE_MODEL implementation (provee los datos para cada factor).

---

### R-CC-008 — Initial Certainty from first Evidence

**Enunciado:** Cuando se registra la primera Evidence para una proposición, la
Certainty inicial se calcula exclusivamente a partir de esa Evidence: su Confidence,
su precedencia de Source, y su edad (percepción reciente, sin degradación). La
Certainty inicial es siempre menor que el Límite Epistémico (R-CC-027) y nunca alcanza
el máximo posible, porque una sola Evidence no puede proporcionar certidumbre máxima.

**Derivación Constitucional:** CP-18 (certidumbre continua — la primera Evidence
establece la línea base); CP-21 (límite epistémico — ni siquiera la primera Evidence
puede acercarse a 1.0); R-EM-042 (Certainty derivada de Evidence).

**Justificación:** La primera Evidence establece la línea base de la Belief. Si la
primera Evidence es una confirmación del usuario (UserConfirmation), la Certainty
inicial será alta pero no máxima. Si es una inferencia del LLM (LLMInference), será
moderada. Esta línea base es el punto de partida para todas las actualizaciones
posteriores.

**Implicaciones Cognitivas:**
- Una sola Evidence no puede producir la Certainty más alta posible.
- La Certainty inicial es proporcional a la Confidence de la Evidence y su precedencia.
- Si la primera Evidence es de baja calidad (DefaultValue), la Certainty inicial es
  baja y la Belief apenas supera el umbral de formación de creencia.
- La Certainty inicial no es definitiva — se actualiza con cada nueva Evidence.

**Impacto Conversacional:** El sistema no se vuelve "fanático" de una creencia por una
sola pieza de información. Incluso una confirmación explícita del usuario produce una
Certainty alta pero no absoluta, dejando espacio para correcciones.

**Verificación:** ¿Existe algún escenario donde la primera Evidence para una proposición
produzca una Certainty igual al Límite Epistémico o superior? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS implementation (define la función de Certainty
inicial con límite inferior al Epistémico).

---

## 5. Factors Affecting Certainty

### R-CC-009 — Effect of corroboration

**Enunciado:** La corroboración — múltiples Evidence independientes que apoyan la misma
proposición — aumenta la Certainty. Sin embargo, el aumento es decreciente: cada
Evidence adicional aporta menos incremento que la anterior. La función de corroboración
debe tener asíntota: por mucha Evidence que se acumule, la Certainty nunca alcanza el
Límite Epistémico (R-CC-027).

**Derivación Constitucional:** CP-20 (actualización por Evidence — toda Evidence se
considera); CP-21 (límite epistémico — la corroboración nunca lleva a certidumbre
absoluta); R-EM-035 (agregación para formación de creencias — non-eliminative,
corroboration-aware).

**Justificación:** La corroboración es señal de consistencia. Si múltiples fuentes
independientes dicen lo mismo, la confianza en esa proposición aumenta. Sin embargo,
llegar a 10 fuentes que dicen lo mismo no es el doble de confiable que llegar a 5.
Hay un punto de rendimientos decrecientes donde más corroboración aporta poco.
Además, ninguna cantidad de corroboración elimina la posibilidad de error sistémico
(todas las fuentes podrían estar equivocadas de la misma manera).

**Implicaciones Cognitivas:**
- Dos Evidence independientes que corroboran son significativamente más fuertes que una.
- Cinco Evidence independientes son más fuertes que dos, pero la diferencia es menor.
- La corroboración debe ser independiente: dos Evidence de la misma Observation no
  son corroboración real (son la misma información, repetida).
- La corroboración no elimina la contradicción: si hay una Evidence contradictoria,
  debe considerarse (R-CC-010).

**Impacto Conversacional:** El sistema valora la consistencia. Si varios mensajes del
usuario confirman el mismo origen, la confianza aumenta. Pero no se vuelve
excesivamente confiado solo porque el usuario lo repitió muchas veces. La comunicación
refleja esta confianza calibrada.

**Verificación:** ¿Existe algún cálculo de Certainty donde la corroboración tenga un
efecto lineal ilimitado (cada Evidence adicional aporta el mismo incremento)? Si sí →
violación.

**Delegación:** CERTAINTY_CALCULUS implementation (implementa función de corroboración
con rendimientos decrecientes y asíntota).

---

### R-CC-010 — Effect of contradiction

**Enunciado:** La contradicción — Evidence que refuta la proposición — reduce la
Certainty. El efecto de una contradicción depende de la fuerza de la Evidence
contradictoria (su Confidence y precedencia) y del peso de la Evidence corroborante
existente. Una contradicción fuerte puede reducir la Certainty drásticamente; una
débil puede tener efecto mínimo.

**Derivación Constitucional:** CP-10 (resolución de Evidence conflictiva — la
contradicción es el primer paso de la resolución); CP-20 (actualización por Evidence —
la Evidence contradictoria debe actualizar la Certainty); CP-17 (resolución por
Evidence — las contradicciones no se resuelven por orden de llegada).

**Justificación:** La contradicción es la señal más importante de que una creencia
puede ser incorrecta. Ignorar contradicciones o tratarlas con el mismo peso que la
corroboración llevaría a decisiones basadas en información incompleta. La contradicción
debe tener un efecto asimétrico: una sola contradicción fuerte puede tener más peso
que varias corroboraciones débiles.

**Implicaciones Cognitivas:**
- Una contradicción de alta precedencia (UserConfirmation: "no dije Asunción, dije San
  Lorenzo") tiene un efecto grande.
- Una contradicción de baja precedencia (LLMInference que sugiere otro valor) tiene
  un efecto moderado.
- Si la contradicción iguala o supera la fuerza de la corroboración, la Certainty cae
  por debajo del umbral de formación de creencia y la Belief puede colapsar.
- La contradicción entre Evidence de igual fuerza puede dejar la proposición en un
  estado de "indeterminación" — ninguna Belief se forma.

**Impacto Conversacional:** El sistema no ignora las correcciones del usuario. Si el
usuario dice "no, es San Lorenzo, no Asunción," el sistema ajusta su creencia
inmediatamente, incluso si había acumulado mucha Evidence a favor de Asunción. El
usuario siente que el sistema "escucha" las correcciones.

**Verificación:** ¿Existe algún cálculo de Certainty donde la contradicción no tenga
un efecto asimétrico (una contradicción fuerte pesa más que varias corroboraciones
débiles)? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS implementation (implementa función de contradicción
con asimetría epistémica), DECISION_MODEL.md (define la resolución de conflictos que
usa este efecto).

---

### R-CC-011 — Combined effect of corroboration and contradiction

**Enunciado:** Cuando existen simultáneamente Evidence corroborante y contradictoria
para la misma proposición, la Certainty resultante debe reflejar el balance neto entre
ambas, no un simple promedio ni una victoria de la mayoría. El balance debe considerar:

- La fuerza relativa de cada Evidence (Confidence × precedencia).
- El número relativo de Evidence en cada lado (con efecto decreciente en ambos).
- La posibilidad de que todas las Evidence de un lado compartan un error común
  (dependencia entre Evidence del mismo origen).

**Derivación Constitucional:** CP-10 (resolución de Evidence conflictiva — el balance
debe ser epistémico, no arbitrario); CP-15 (fusión conservadora — la información de
ambos lados se preserva); CP-20 (actualización por Evidence — ambos conjuntos se
consideran).

**Justificación:** La realidad rara vez es unánime. El sistema debe poder formar una
creencia incluso cuando hay Evidence contradictoria, siempre que el peso neto sea
suficiente. Pero también debe reconocer cuándo la contradicción es tan fuerte que
impide formar una creencia. El balance neto no es una resta simple — es una
comparación epistémica que considera la calidad y cantidad de cada lado.

**Implicaciones Cognitivas:**
- Si el balance neto está claramente a favor de una proposición, se forma la Belief
  con la Certainty correspondiente.
- Si el balance neto es cercano a equilibrado, la proposición permanece como Hypothesis
  (CP-13) hasta que llegue más Evidence.
- El sistema debe detectar dependencias entre Evidence (misma Observation, misma
  fuente) para no contar la misma información múltiples veces.
- El balance neto se refleja en la Certainty: si hay mucha corroboración débil y una
  contradicción fuerte, la Certainty puede ser media-baja.

**Impacto Conversacional:** El sistema maneja información contradictoria de forma
natural. Si el usuario da información inconsistente, el sistema no elige una versión
al azar — reconoce la incertidumbre y pide clarificación o procede con cautela. La
comunicación refleja esta ambigüedad de forma honesta.

**Verificación:** ¿Existe algún cálculo de Certainty que ignore la Evidence
contradictoria o la trate con el mismo peso lineal que la corroborante? Si sí →
violación.

**Delegación:** CERTAINTY_CALCULUS implementation (implementa la función de balance
neto), COGNITIVE_ARCHITECTURE.md (define cuándo el balance neto es suficiente para
formar creencia vs. mantener hipótesis).

---

### R-CC-012 — Effect of evidence quality (Confidence)

**Enunciado:** La Confidence de cada Evidence (SYSTEM_VOCABULARY.md §6.3) pondera su
contribución al cálculo de Certainty. Una Evidence con Confidence alta contribuye más
que una con Confidence baja, independientemente de la precedencia de Source. La
Confidence puede ajustarse con outcomes (CP-38), y ese ajuste se refleja en el cálculo
de Certainty de todas las Beliefs futuras que usen esa Evidence.

**Derivación Constitucional:** R-EM-016 (Confidence as attribute of Evidence);
CP-38 (ajuste de confianza de fuente — la Confidence se ajusta históricamente);
R-EM-043 (factor 1: Confidence of each supporting Evidence).

**Justificación:** No toda Evidence de una misma Source tiene la misma calidad. Un
LLM puede tener un buen día (alta Confidence) o un mal día (baja Confidence). Un
usuario puede estar seguro (alta Confidence) o dudoso (baja Confidence). La Confidence
captura esta variabilidad y permite que el cálculo de Certainty sea sensible a la
calidad específica de cada pieza de Evidence.

**Implicaciones Cognitivas:**
- La Confidence es un ponderador que multiplica la contribución de cada Evidence.
- Una Evidence con Confidence 0.9 contribuye casi con todo su peso.
- Una Evidence con Confidence 0.3 contribuye poco, incluso si su precedencia es alta.
- El ajuste de Confidence por outcomes es gradual (R-DM-042).
- El sistema no debe usar Confidence como único factor — los otros cuatro (R-CC-007)
  también deben considerarse.

**Impacto Conversacional:** El sistema aprende qué fuentes son más confiables. Si un
LLM produce errores frecuentes para cierto tipo de información, su Confidence se
reduce y el sistema confía menos en sus extracciones. El usuario se beneficia de un
sistema que mejora su calibración con la experiencia.

**Verificación:** ¿Existe algún cálculo de Certainty donde la Confidence de la Evidence
no pondere su contribución? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS implementation (implementa ponderación por
Confidence), DECISION_MODEL.md (define el ajuste histórico de Confidence).

---

### R-CC-013 — Effect of context on Certainty

**Enunciado:** El contexto conversacional y situacional puede modular la Certainty de
una Belief, pero solo dentro de límites definidos y con justificación explícita:

| Factor contextual | Efecto permitido | Justificación |
|-----------------|------------------|---------------|
| Hora del día | Una solicitud de viaje a la 1 AM tiene menor Certainty de ser para ahora que a las 3 PM (horario normal) | El contexto horario es información adicional que el sistema puede usar para calibrar |
| Historial del usuario | Un usuario recurrente puede tener mayor Certainty en sus patrones conocidos | El historial es Evidence acumulada sobre el comportamiento del usuario |
| Tipo de usuario | Un usuario nuevo tiene menor Certainty inicial que uno conocido | La falta de historial es información (ausencia de Evidence) |
| Canal de entrada | Un mensaje de WhatsApp puede tener diferente Certainty que uno de API | Diferentes canales tienen diferentes niveles de validación y autenticación |
| Strategic Posture | La Posture modifica los umbrales (no la Certainty misma) | La Certainty es un hecho epistémico; la Posture es una decisión de riesgo |

**Derivación Constitucional:** R-DM-034 (Conversational context as decision input —
el contexto afecta la interpretación de la Evidence); CP-36 (contexto mínimo — el
sistema debe usar el contexto disponible para inferir); SYSTEM_VOCABULARY.md §8.5 (Strategic
Posture).

**Justificación:** La misma Evidence puede tener diferente significado en diferentes
contextos. "Necesito un taxi" a las 8 AM en un día laboral tiene alta Certainty de ser
para ahora. El mismo mensaje a las 3 AM un domingo tiene menos Certainty. El contexto
es información que el sistema debe integrar en el cálculo de Certainty.

**Implicaciones Cognitivas:**
- El contexto no reemplaza a la Evidence — la modula.
- El contexto debe estar fundamentado en el Knowledge State, no en suposiciones.
- El efecto del contexto no puede ser tan grande que permita superar el Límite
  Epistémico sin Evidence directa.
- El contexto se aplica en el momento del cálculo de Certainty, no en el registro
  de Evidence.

**Impacto Conversacional:** El sistema entiende el contexto sin necesidad de que el
usuario lo explique. No preguntará "¿es para ahora?" si son las 8 AM y el usuario
dice "necesito un taxi." La conversación es más eficiente porque el contexto informa
la interpretación.

**Verificación:** ¿Existe algún mecanismo donde el contexto modifique la Certainty más
allá de lo que la Evidence directa justificaría, o sin una justificación explícita?
Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define cómo el contexto se integra en el Knowledge
State), CERTAINTY_CALCULUS implementation (implementa la modulación contextual).

---

### R-CC-014 — Effect of history on Certainty

**Enunciado:** El historial del usuario (viajes previos, preferencias conocidas,
patrones de comportamiento) constituye Evidence acumulada que puede aumentar la
Certainty de Beliefs consistentes con ese historial. Sin embargo, el historial nunca
puede prevalecer sobre la Evidence explícita del ciclo actual. Si la Evidence actual
contradice el historial, la Evidence actual tiene mayor peso.

**Derivación Constitucional:** CP-34 (no-repregunta — el sistema debe recordar
información previa); CP-36 (contexto mínimo — el historial es contexto que reduce
la necesidad de preguntar); CP-17 (resolución por Evidence — el historial es Evidence,
pero la evidencia actual tiene prioridad).

**Justificación:** El historial es una forma de Evidence acumulada a través del tiempo.
Si un usuario siempre viaja desde su casa a las 8 AM, y hoy dice "lo de siempre," la
Certainty de que el origen es su casa es alta. Pero si hoy el usuario dice explícitamente
"desde la oficina," esa Evidence explícita prevalece sobre el historial.

**Implicaciones Cognitivas:**
- El historial se almacena como Evidence en el Evidence Store (viajes previos,
  preferencias).
- La Certainty derivada del historial se combina con la Certainty de la Evidence actual.
- La Evidence actual siempre tiene mayor precedencia que el historial (por ser más
  reciente y más específica al contexto actual).
- El historial no debe usarse para "inventar" información que el usuario no ha
  proporcionado, solo para complementarla.

**Impacto Conversacional:** El sistema recuerda las preferencias del usuario sin
necesidad de que las repita. Pero si el usuario da información diferente hoy, el
sistema la acepta sin cuestionar. No hay rigidez basada en el pasado.

**Verificación:** ¿Existe algún mecanismo donde el historial prevalezca sobre la
Evidence explícita del ciclo actual? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define cómo el historial se registra como Evidence),
CERTAINTY_CALCULUS implementation (implementa la combinación historial + Evidence
actual con precedencia de la actual).

---

## 6. Certainty Degradation

### R-CC-015 — Certainty degrades with time

**Enunciado:** La Certainty de toda Belief sobre hechos empíricos debe degradarse
gradualmente con el paso del tiempo sin recibir Evidence confirmatoria. La degradación
no es opcional ni diferible. Tan pronto como el tiempo transcurre sin nueva Evidence,
la Certainty comienza a disminuir.

**Derivación Constitucional:** CP-19 (degradación temporal — "la certidumbre de toda
Belief debe degradarse gradualmente con el paso del tiempo sin recibir Evidence
confirmatoria"); CONSTITUTION.md §3.3.1 ("certainty must decay over time without
confirming Evidence"); R-EM-023 (ACTIVE → STALE).

**Justificación:** El mundo cambia. Una creencia sobre la ubicación del usuario, la
disponibilidad de un conductor, o la intención de un pasajero se vuelve menos confiable
con el tiempo porque el estado del mundo puede haber cambiado. Sin degradación, el
sistema operaría con creencias obsoletas como si fueran actuales.

**Implicaciones Cognitivas:**
- La degradación comienza inmediatamente después de la última confirmación.
- Es continua y gradual, no abrupta (no hay un "momento de expiración" binario).
- La tasa de degradación varía por tipo de Belief (R-CC-016).
- Si la Certainty degradada cae por debajo del umbral de compromiso, el sistema debe
  buscar reconfirmación antes de actuar sobre esa Belief.
- La degradación nunca lleva la Certainty a cero abruptamente — es asintótica.

**Impacto Conversacional:** El sistema no actúa sobre información desactualizada. Si
pasaron 10 minutos desde que el usuario dijo "voy al aeropuerto," el sistema puede
reconfirmar antes de despachar, especialmente si el destino es contextualmente sensible.
El usuario no experimenta acciones basadas en información obsoleta.

**Verificación:** ¿Existe alguna Belief en el sistema cuya Certainty no se degrade con
el tiempo? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS implementation (implementa la función de degradación
temporal), EVIDENCE_MODEL.md (define el timestamp de percepción como insumo).

---

### R-CC-016 — Degradation rate by belief type

**Enunciado:** La tasa de degradación de la Certainty debe ser proporcional a la
naturaleza temporal de la Belief. Beliefs sobre hechos intrínsecamente volátiles se
degradan más rápido que Beliefs sobre hechos estables:

| Tipo de Belief | Tasa de degradación | Ejemplo |
|---------------|--------------------|---------|
| **Ubicación en tiempo real** | Muy rápida (minutos) | "El usuario está en la ubicación X" |
| **Intención inmediata** | Rápida (minutos) | "El usuario quiere un taxi ahora" |
| **Intención futura** | Moderada (horas) | "El usuario quiere un taxi para las 5 PM" |
| **Datos del viaje confirmados** | Lenta (horas a días) | "El destino del viaje #123 es el aeropuerto" |
| **Información del usuario** | Muy lenta (días a semanas) | "El nombre del usuario es Juan" |
| **Preferencias del usuario** | Lenta (días a meses) | "El usuario prefiere vehículos grandes" |

**Derivación Constitucional:** CP-19 ("la tasa de degradación debe ser proporcional a
la naturaleza temporal de la Belief"); R-CM-034 (degradación operacional post-commitment);
DECISION_MODEL.md (define las tasas según Strategic Posture).

**Justificación:** No toda la información envejece al mismo ritmo. La ubicación del
usuario cambia en segundos; su nombre cambia en años. Usar la misma tasa de degradación
para ambos llevaría a: (a) degradar información estable demasiado rápido (pérdida de
información útil) o (b) degradar información volátil demasiado lento (decisiones
basadas en información desactualizada).

**Implicaciones Cognitivas:**
- La clasificación por tipo de Belief determina la tasa de degradación.
- La tasa puede ser modificada por la Strategic Posture: postura conservadora puede
  acelerar la degradación (más cautelosa).
- Beliefs sobre hechos ya comprometidos (Commitments) se degradan según R-CM-034.
- La degradación no es el único mecanismo de expiración — los Commitments también
  tienen ventanas temporales (R-CM-009).

**Impacto Conversacional:** El sistema recuerda lo que debe recordar y olvida lo que
debe olvidar al ritmo apropiado. No pregunta el nombre del usuario cada 5 minutos,
pero sí reconfirma la ubicación si pasó mucho tiempo. La memoria del sistema es
calibrada.

**Verificación:** ¿Existe alguna Belief en el sistema cuya tasa de degradación no
esté definida por su tipo? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS implementation (define las tasas por tipo de Belief),
DECISION_MODEL.md (define los modificadores por Strategic Posture).

---

### R-CC-017 — Degradation is asymptotic, not eliminative

**Enunciado:** La degradación de la Certainty es asintótica: se acerca a un valor
mínimo (el Residual de Incertidumbre, R-CC-026) sin alcanzarlo abruptamente. La
Certainty degradada nunca llega a cero si existió Evidence que la respaldara, porque
la Evidence histórica sigue existiendo aunque haya perdido peso. Solo la ausencia total
de Evidence produce Certainty cero.

**Derivación Constitucional:** CP-19 ("la degradación nunca lleva la certidumbre a 0
abruptamente — es un proceso continuo"); S-P5 (Evidence Immutability — la Evidence
persiste aunque su contribución se degrade); CP-08 (inmutabilidad operativa).

**Justificación:** Una Belief que alguna vez tuvo Evidence sigue teniendo algún valor
epistémico residual, aunque sea mínimo. La Evidence original no desaparece — solo se
vuelve menos relevante. Si la degradación llevara la Certainty a cero abruptamente,
el sistema perdería información valiosa: saber que "alguna vez el usuario dijo X" puede
ser útil aunque haya pasado mucho tiempo.

**Implicaciones Cognitivas:**
- La función de degradación se acerca asintóticamente a un valor residual.
- La Evidence nunca se elimina del Evidence Store (inmutable por S-P5).
- Una Belief con Certainty degradada puede recuperarse si llega nueva Evidence
  confirmatoria (R-CC-018).
- El valor residual es el mínimo que una Belief puede tener sin ser abandonada.
- Cuando la Certainty cae por debajo del umbral de formación de creencia, la Belief
  puede ser abandonada (revertida a Hypothesis), pero la Evidence subyacente persiste.

**Impacto Conversacional:** El sistema no "olvida" bruscamente. La transición de
"estar seguro" a "no estar seguro" es gradual, lo que evita cambios abruptos en el
comportamiento que confundirían al usuario.

**Verificación:** ¿Existe algún mecanismo de degradación que lleve la Certainty a cero
de forma abrupta o lineal hasta cero? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS implementation (implementa degradación asintótica
con valor residual).

---

## 7. Certainty Recovery

### R-CC-018 — Recovery by new confirming Evidence

**Enunciado:** La Certainty degradada puede recuperarse cuando llega nueva Evidence que
corrobora la misma proposición. La recuperación no restaura la Certainty al nivel
original inmediatamente — la lleva a un nivel consistente con la combinación de la
Evidence original (con peso reducido por edad) y la nueva Evidence (con peso completo).

**Derivación Constitucional:** CP-19 ("una nueva Evidence confirmatoria detiene la
degradación y restablece la certidumbre al nivel que la nueva Evidence justifica");
CP-20 (actualización por Evidence — la nueva Evidence actualiza la Certainty);
R-EM-024 (STALE → ACTIVE — la Evidence se reactiva con nueva confirmación).

**Justificación:** La recuperación no es un reset — es un nuevo cálculo que integra la
nueva Evidence con la existente (aunque la existente tenga menos peso por su edad). Si
el usuario reconfirma su destino después de una hora, la nueva Certainty será alta,
pero no necesariamente idéntica a la original si la Evidence original era débil.

**Implicaciones Cognitivas:**
- La recuperación detiene la degradación de la Belief.
- La nueva Evidence se integra con la existente; su Confidence y precedencia determinan
  el nuevo nivel.
- La recuperación puede ser parcial (la Certainty sube pero no al nivel máximo).
- Si la nueva Evidence es de alta calidad (UserConfirmation), la recuperación puede
  llevar la Certainty cerca del Límite Epistémico.

**Impacto Conversacional:** El sistema puede "recordar" información previa y
actualizarla con nueva confirmación. Si el usuario dice "sí, sigue siendo el aeropuerto,"
la confianza se restablece sin perder el contexto de la conversación anterior.

**Verificación:** ¿Existe algún mecanismo de recuperación que resetee la Certainty al
nivel original ignorando el tiempo transcurrido? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS implementation (implementa la función de
recuperación con integración de Evidence antigua y nueva).

---

### R-CC-019 — Recovery by explicit user confirmation

**Enunciado:** La confirmación explícita del usuario (Source = UserConfirmation) es el
mecanismo de recuperación más fuerte. Una confirmación explícita que corrobora una
proposición puede llevar la Certainty de esa Belief al nivel máximo permitido por el
Límite Epistémico (R-CC-027), superando cualquier degradación previa.

**Derivación Constitucional:** R-EM-041 (precedencia de Source — UserConfirmation es
la más alta); CP-18 (certidumbre continua — la confirmación explícita es la forma más
fuerte de Evidence); CONSTITUTION.md §3.3.2 (la comunicación externa debe reflejar la
interna).

**Justificación:** Cuando el usuario confirma explícitamente una información ("sí, el
origen es Asunción"), esa es la Evidence más fuerte que el sistema puede recibir. La
confianza en esa proposición debe acercarse al máximo posible — no porque el sistema
"sepa" la verdad, sino porque el usuario, que es la fuente de esa verdad, la ha
confirmado. Sin embargo, incluso la confirmación del usuario tiene un margen de error
(el usuario puede equivocarse, cambiar de opinión, o ser engañado).

**Implicaciones Cognitivas:**
- La confirmación explícita es la Evidence de mayor precedencia (R-EM-041).
- La confirmación explícita detiene la degradación inmediatamente.
- La recuperación por confirmación puede ser casi completa (cerca del Límite
  Epistémico).
- La confirmación implícita (silencio, ausencia de corrección) tiene menos peso
  (R-DM-020).

**Impacto Conversacional:** Cuando el usuario confirma algo explícitamente, el sistema
lo acepta con alta confianza. No sigue preguntando ni muestra dudas. La confirmación
del usuario es tomada en serio.

**Verificación:** ¿Existe algún mecanismo donde la confirmación explícita del usuario
no produzca la máxima recuperación de Certainty permitida epistémicamente? Si sí →
violación.

**Delegación:** CERTAINTY_CALCULUS implementation (implementa la máxima recuperación
para UserConfirmation), DECISION_MODEL.md (diferencia confirmación explícita de
implícita).

---

### R-CC-020 — Recovery does not erase degradation history

**Enunciado:** Aunque la Certainty se recupere, el historial de degradación de la
Belief se preserva. El sistema sabe que la Belief pasó por un período de degradación
y que fue recuperada. Este historial es información para la calibración futura: si una
Belief se degrada y recupera frecuentemente, puede indicar que la información necesita
confirmación más frecuente.

**Derivación Constitucional:** CP-39 (mejora no destructiva — el conocimiento de la
degradación pasada se preserva); S-P5 (Evidence Immutability — los eventos de
degradación son Evidence); P-I5 (auditabilidad — el historial de la Belief es trazable).

**Justificación:** La recuperación no borra el pasado. Si una Belief se ha degradado y
recuperado varias veces, eso es información sobre la estabilidad de esa creencia. El
sistema puede usar ese historial para ajustar la tasa de degradación futura o la
frecuencia de confirmación necesaria.

**Implicaciones Cognitivas:**
- Cada evento de degradación y recuperación se registra como metadato de la Belief.
- El historial puede influir en la tasa de degradación futura.
- Una Belief con múltiples ciclos de degradación/recuperación puede necesitar
  confirmaciones más frecuentes.
- El historial no afecta la Certainty actual — solo informa la calibración futura.

**Impacto Conversacional:** El sistema aprende patrones de estabilidad. Si el usuario
cambia frecuentemente de opinión sobre el destino, el sistema aprende a confirmar más
seguido. Si es consistente, el sistema confía más y pregunta menos.

**Verificación:** ¿Existe algún mecanismo de recuperación que elimine el registro
histórico de la degradación previa? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define el registro de eventos de la Belief),
CERTAINTY_CALCULUS implementation (preserva el historial de degradación/recuperación).

---

## 8. Propagation of Certainty

### R-CC-021 — Certainty propagates through belief relationships

**Enunciado:** Cuando dos Beliefs están relacionadas semánticamente (una implica a la
otra, la contradice, la refina, o depende de ella), los cambios de Certainty en una
deben propagarse a la otra. La propagación sigue las relaciones definidas en el
Knowledge State:

| Relación semántica | Efecto en la propagación |
|--------------------|--------------------------|
| **Implicación directa** | Si A implica B, un cambio en Certainty(A) afecta a Certainty(B) en la misma dirección |
| **Dependencia compositiva** | Si B depende de A (B requiere A), entonces Certainty(B) ≤ Certainty(A) |
| **Exclusión mutua** | Si A y B son mutuamente excluyentes, aumentar Certainty(A) reduce Certainty(B) |
| **Refinamiento** | Si B es un refinamiento de A (A: "origen en Asunción", B: "origen en Aeropuerto"), la Certainty de B se hereda de A y se modula por la precisión adicional |
| **Corroboración indirecta** | Si A y B son independientes pero apuntan a la misma conclusión, la Certainty de la conclusión se beneficia de ambas |

**Derivación Constitucional:** CP-18 (certidumbre continua — toda Belief tiene
Certainty); CP-20 (actualización por Evidence — las Beliefs relacionadas se actualizan);
R-EM-030 (Evidence-proposition relationship); R-EM-031 (Evidence-evidence relationships).

**Justificación:** Las creencias no existen en el vacío. Si el sistema cree que "el
origen es Asunción," esa creencia se relaciona con "el destino no puede ser el mismo
que el origen," "el viaje comienza en Asunción," "el conductor debe ir a Asunción."
Cambiar la primera sin propagar a las demás crearía un estado cognitivo inconsistente.

**Implicaciones Cognitivas:**
- La propagación es automática, no requiere decisión explícita.
- La propagación puede aumentar o disminuir la Certainty de las Beliefs relacionadas.
- La propagación no puede violar los límites epistémicos (R-CC-027).
- Las relaciones semánticas se definen en el Knowledge State (KNOWLEDGE_MODEL.md).
- Si la propagación produce una contradicción, se activa el mecanismo de resolución
  de conflictos (CP-10).

**Impacto Conversacional:** Las creencias del sistema son consistentes entre sí. No
dice una cosa sobre el origen y otra contradictoria sobre el destino. El usuario no
experimenta contradicciones internas en el comportamiento del sistema.

**Verificación:** ¿Existe algún cambio de Certainty en una Belief que no se propague
a las Beliefs relacionadas? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define las relaciones semánticas entre Beliefs),
CERTAINTY_CALCULUS implementation (implementa la propagación a través de la red de
Beliefs).

---

### R-CC-022 — Propagation does not create Evidence

**Enunciado:** La propagación de Certainty entre Beliefs relacionadas modifica la
Certainty de esas Beliefs, pero no crea nueva Evidence. La Belief destino puede verse
afectada en su Certainty, pero no adquiere nueva Evidence en el Evidence Store. La
propagación es un fenómeno cognitivo, no epistémico.

**Derivación Constitucional:** S-P5 (Evidence Immutability — la propagación no puede
crear Evidence falsa); R-EM-003 (Evidence exists independent of Belief); CP-08
(inmutabilidad operativa).

**Justificación:** Si la propagación creara Evidence, el sistema estaría "imaginando"
información. "Creo que el origen es Asunción, por tanto el viaje comienza en Asunción"
— la segunda es una inferencia válida, pero no es nueva Evidence sobre el mundo. Es
una consecuencia lógica de la primera. La Evidence solo puede venir de la percepción
(R-EM-006 a R-EM-009) o de Outcomes (R-CM-038).

**Implicaciones Cognitivas:**
- La propagación modifica la Certainty de Beliefs derivadas, no la Evidence.
- Las Beliefs derivadas deben referenciar la Belief fuente, no tener Evidence propia.
- Si la Belief fuente cambia, la Belief derivada se recalcula en el próximo ciclo.
- El Evidence Store permanece inmutable durante la propagación.

**Impacto Conversacional:** El sistema distingue entre lo que "sabe" (Evidence) y lo
que "infiere" (propagación). No presenta inferencias como si fueran hechos, a menos
que la inferencia sea tan segura que merezca comunicarse como tal.

**Verificación:** ¿Existe algún mecanismo de propagación que registre nueva Evidence
en el Evidence Store? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define Beliefs derivadas con referencia a Beliefs
fuente), CERTAINTY_CALCULUS implementation (propaga sin crear Evidence).

---

## 9. Aggregation of Certainty

### R-CC-023 — Aggregation over multiple Evidence

**Enunciado:** Cuando múltiples Evidence abordan la misma proposición, la Certainty
de la Belief se calcula mediante agregación de todas ellas. La agregación debe:

- Considerar TODA la Evidence disponible (ninguna se ignora).
- Ponderar cada Evidence por su Confidence, precedencia, y edad.
- Aplicar efecto de corroboración (decreciente) y contradicción (asimétrico).
- Producir un único valor de Certainty para la proposición.
- Ser determinista: misma Evidence produce misma Certainty.

**Derivación Constitucional:** R-EM-035 (Aggregation for belief formation — toda
Evidence se agrega); R-DM-015 (Multiple Evidence, single Certainty — la decisión se
basa en la Certainty agregada); CP-20 (actualización por Evidence — toda Evidence se
considera).

**Justificación:** Una Belief no puede basarse en una sola Evidence ignorando las
demás. La agregación reduce la información multidimensional (múltiples Evidence, cada
una con sus atributos) a un valor unificado que la decisión puede evaluar. La
agregación debe ser completa (toda la Evidence) y determinista (mismo input → mismo
output).

**Implicaciones Cognitivas:**
- La agregación ocurre durante el Razonamiento, antes del gate de decisión.
- La función de agregación no es una simple suma o promedio — es una función que
  implementa los cinco factores (R-CC-007).
- El resultado de la agregación es el único valor de Certainty que usa la decisión.
- La agregación no elimina la Evidence individual — el registro permanece.

**Impacto Conversacional:** Las decisiones del sistema reflejan toda la información
disponible, no solo la última información o la más conveniente. Esto da robustez y
consistencia.

**Verificación:** ¿Existe algún cálculo de Certainty que omita alguna Evidence
relevante del Evidence Store? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS implementation (implementa la función de agregación
completa y determinista), EVIDENCE_MODEL.md (provee el conjunto completo de Evidence
por proposición).

---

### R-CC-024 — Aggregation is non-eliminative

**Enunciado:** La agregación no elimina, modifica, ni descarta ninguna Evidence
individual. Toda la Evidence permanece en el Evidence Store, independientemente de
su peso en la agregación. La agregación es un cómputo en tiempo de lectura, no una
reducción en tiempo de escritura.

**Derivación Constitucional:** R-EM-036 (Non-eliminative aggregation — "all Evidence
that contributes to a proposition remains"); CP-39 (mejora no destructiva — no se
destruye conocimiento); S-P5 (Evidence Immutability).

**Justificación:** La agregación es una vista de la Evidence, no una transformación de
ella. Si la agregación eliminara Evidence con bajo peso, esa información se perdería
para futuros re-cálculos. Si llega nueva Evidence que cambia el balance, la Evidence
"descartada" debería estar disponible para la nueva agregación.

**Implicaciones Cognitivas:**
- La agregación es una función pura: mismo input produce mismo output, sin efectos
  secundarios.
- El Evidence Store contiene toda la Evidence, incluyendo la que tiene bajo peso.
- Nuevas agregaciones pueden re-evaluar Evidence previa si cambian las condiciones.
- La agregación no tiene estado — se computa cada vez que se necesita.

**Impacto Conversacional:** El sistema puede "reconsiderar" información previa si es
necesario. No descarta información que podría ser relevante en un contexto diferente.

**Verificación:** ¿Existe algún mecanismo de agregación que elimine Evidence del
Evidence Store como parte del proceso? Si sí → violación.

**Delegación:** EVIDENCE_MODEL implementation (el Evidence Store retiene toda la
Evidence), CERTAINTY_CALCULUS implementation (la agregación es una función pura sin
efectos secundarios).

---

### R-CC-025 — Aggregation over hypothesis networks

**Enunciado:** Cuando existen múltiples Hipótesis activas para una misma proposición
(CP-13), la agregación de Certainty debe considerar cada Hipótesis como un candidato.
Cada Hipótesis tiene su propia Certainty, computada a partir de la Evidence que la
apoya. La agregación no selecciona una Hipótesis — produce la Certainty de cada una,
y la decisión (vía DECISION_MODEL) determina si alguna tiene ventaja epistémica
suficiente (R-DM-018).

**Derivación Constitucional:** CP-13 (hipótesis múltiples — el sistema mantiene
múltiples Hipótesis activas); R-DM-018 (Multiple hypothesis handling — la decisión
solo ocurre cuando una Hipótesis tiene ventaja epistémica suficiente); R-EM-047
(Belief formation threshold).

**Justificación:** La agregación para el Hypothesis Network no elige un ganador —
calcula la Certainty de cada Hipótesis para que la decisión pueda compararlas.
Esto es consistente con CP-13 (mantener hipótesis múltiples) y CP-17 (resolver por
Evidence, no por preferencia).

**Implicaciones Cognitivas:**
- Cada Hipótesis tiene su propia agregación de Evidence.
- La agregación no favorece a ninguna Hipótesis — todas se calculan con la misma
  función.
- La comparación entre Hipótesis se basa en la diferencia de Certainty (margen
  epistémico).
- Si dos Hipótesis tienen Certainty similar, el sistema no decide (R-DM-018).

**Impacto Conversacional:** El sistema puede considerar múltiples interpretaciones
simultáneamente sin decidir prematuramente. Si el usuario dice una frase ambigua, el
sistema no elige una interpretación al azar — reconoce la ambigüedad y pide
clarificación. Esto reduce errores por interpretaciones apresuradas.

**Verificación:** ¿Existe algún mecanismo de agregación para el Hypothesis Network que
seleccione una Hipótesis en lugar de calcular la Certainty de todas? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el Hypothesis Network como estructura),
CERTAINTY_CALCULUS implementation (implementa agregación por Hipótesis sin selección).

---

## 10. Revision and Recalibration

### R-CC-026 — Continuous revision of Certainty

**Enunciado:** La Certainty de toda Belief debe revisarse continuamente: cada vez que
llega nueva Evidence, cada vez que la Evidence existente cambia de estado (ACTIVE →
STALE, ACTIVE → SUPERSEDED), y cada vez que avanza el reloj de degradación. No hay
"momentos de congelamiento" donde la Certainty no se revise.

**Derivación Constitucional:** CP-20 (actualización por Evidence — "toda nueva Evidence
debe actualizar la certidumbre de todas las Beliefs relacionadas"); R-EM-045 (Automatic
Certainty recalculation — tres triggers: nueva Evidence, cambio de estado, degradación).

**Justificación:** Si la Certainty no se revisa continuamente, el sistema opera con
información desactualizada. Una Belief que no se actualiza es una Belief congelada
(CP-20). La revisión continua es el mecanismo que mantiene el Knowledge State
sincronizado con la realidad percibida.

**Implicaciones Cognitivas:**
- La revisión se dispara por eventos (nueva Evidence, cambio de estado, tick de
  degradación).
- La revisión es automática: no requiere una decisión consciente del sistema.
- La revisión afecta a todas las Beliefs relacionadas con la Evidence cambiante.
- La revisión puede ocurrir dentro de un ciclo cognitivo (nueva Evidence del usuario)
  o entre ciclos (degradación por tiempo).

**Impacto Conversacional:** El sistema está siempre actualizado. No muestra
información desactualizada ni actúa sobre creencias obsoletas. La respuesta al usuario
siempre refleja el estado más reciente del conocimiento del sistema.

**Verificación:** ¿Existe algún intervalo donde la Certainty de una Belief no se revise
a pesar de que haya ocurrido un trigger de recalibración? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el sistema de eventos de
recalibración), CERTAINTY_CALCULUS implementation (implementa la función de revisión
invocable por eventos).

---

### R-CC-027 — Recalibration from outcomes

**Enunciado:** El cálculo de Certainty debe recalibrarse en función de los outcomes
observados (R-CM-038). La recalibración ajusta:

- **La Confidence de las fuentes** (CP-38): si una Source produce Evidence que lleva
  sistemáticamente a outcomes incorrectos, su Confidence se reduce.
- **La función de agregación**: si la Certainty estimada no se correlaciona con la
  tasa de aciertos real (subestimación o sobrestimación sistemática), la función de
  agregación debe recalibrarse.
- **Las tasas de degradación**: si las Beliefs de un tipo se degradan más rápido o
  más lento de lo que la realidad sugiere, las tasas se ajustan.

**Derivación Constitucional:** CP-37 (retroalimentación por outcome — el outcome
ajusta la calibración de certidumbre); CP-38 (ajuste de confianza de fuente); R-DM-041
(Outcome-driven calibration — la calibración ajusta Confidence, Costo de Error, umbral,
y margen epistémico); R-EM-056 (Source Confidence adjustment).

**Justificación:** Sin recalibración, el cálculo de Certainty nunca mejora. Si el
sistema sistemáticamente sobrestima su certeza (cree que está más seguro de lo que
realmente está), tomará decisiones riesgosas. Si la subestima, perderá oportunidades.
La recalibración por outcomes cierra el ciclo de aprendizaje.

**Implicaciones Cognitivas:**
- La recalibración es un proceso en segundo plano (no interrumpe el ciclo cognitivo).
- Se basa en outcomes registrados como Evidence.
- La recalibración es gradual — un solo outcome no cambia drásticamente la calibración.
- Los outcomes negativos tienen mayor peso que los positivos (R-DM-042).
- La recalibración puede revertirse si outcomes posteriores muestran que el ajuste
  fue incorrecto.

**Impacto Conversacional:** El sistema mejora con el tiempo. Un sistema que lleva un
mes operando tiene una calibración de certeza mejor que uno recién iniciado. El usuario
experimenta menos errores de sobreconfianza y menos dudas innecesarias a medida que
el sistema madura.

**Verificación:** ¿Existe algún parámetro del cálculo de Certainty que nunca se
recalibre en función de outcomes? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el mecanismo de recalibración),
EVIDENCE_MODEL.md (define el esquema de Evidence de outcome), CERTAINTY_CALCULUS
implementation (implementa la recalibración de parámetros).

---

## 11. Residual Uncertainty

### R-CC-028 — Residual uncertainty is irreducible

**Enunciado:** Toda Belief sobre hechos empíricos tiene un nivel de incertidumbre
residual que no puede eliminarse por más Evidence que se acumule. Este residual es
la expresión matemática de la inaccesibilidad de la Verdad (CONSTITUTION.md §3.1).
El residual es el mínimo teórico de incertidumbre que el sistema debe aceptar.

**Derivación Constitucional:** CONSTITUTION.md §3.1 (Inaccessibility of Truth — "no
amount of data, no improvement in AI, no increase in sensor quality will ever give
AITOS direct access to Truth"); P-I4 (Humility Before Uncertainty — "AITOS must never
express certainty it does not possess"); CP-21 (límite epistémico).

**Justificación:** Por definición constitucional, AITOS no tiene acceso a la Verdad.
Incluso con Evidence perfecta, el sistema solo puede aproximarse a la Verdad, nunca
alcanzarla. El residual de incertidumbre es la diferencia entre la mejor Certainty
posible y 1.0. No es un defecto — es una propiedad fundamental del diseño epistémico.

**Implicaciones Cognitivas:**
- La Certainty máxima posible para Beliefs empíricas es (Límite Epistémico), no 1.0.
- El residual de incertidumbre es (1.0 - Límite Epistémico).
- El sistema nunca debe actuar como si la incertidumbre residual no existiera.
- El residual aplica a toda Belief empírica, sin excepción.

**Impacto Conversacional:** El sistema nunca afirma nada con "absoluta certeza."
Incluso cuando está muy seguro, hay un margen de humildad. Esto evita la arrogancia
epistémica y prepara al usuario para la posibilidad de corrección.

**Verificación:** ¿Existe alguna Belief empírica en el sistema que pueda alcanzar
Certainty 1.0? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS implementation (define el Límite Epistémico y
garantiza que ninguna Belief empírica lo supere).

---

### R-CC-029 — Residual uncertainty is not ignorance

**Enunciado:** El residual de incertidumbre no es ignorancia. Una Belief con Certainty
cercana al Límite Epistémico tiene un conocimiento muy sólido, pero reconoce que existe
un margen de error irreducible. El sistema no debe tratar la incertidumbre residual
como "no saber" — debe tratarla como "saber con el máximo nivel de confianza posible,
reconociendo que la certeza absoluta no existe."

**Derivación Constitucional:** P-I4 (Humility Before Uncertainty — el sistema debe ser
humilde, no ignorante); CONSTITUTION.md §3.4 (Sufficiency, Not Certainty — el sistema
actúa con certidumbre suficiente, no con certidumbre absoluta).

**Justificación:** Hay una diferencia fundamental entre "no sé" (ignorancia) y "sé con
alta confianza pero reconozco un margen de error residual" (humildad epistémica). La
primera impide la acción; la segunda permite la acción con conciencia del riesgo. El
sistema debe poder actuar con alta confianza sin pretender certeza absoluta.

**Implicaciones Cognitivas:**
- El residual no es una excusa para la inacción.
- Si la Certainty está cerca del Límite Epistémico, el sistema puede y debe
  comprometerse (si el umbral lo permite).
- El residual es información para la comunicación: el sistema debe comunicar su
  certeza sin pretender absolutismo.
- El residual es el mismo para todas las Beliefs empíricas del mismo tipo, no varía
  por contexto.

**Impacto Conversacional:** El sistema comunica su conocimiento con confianza pero sin
arrogancia. "Su viaje está confirmado" es una afirmación segura, pero el sistema está
preparado para manejar correcciones si el usuario las necesita. La comunicación es
segura sin ser absoluta.

**Verificación:** ¿Existe algún flujo donde el residual de incertidumbre se use como
justificación para no actuar cuando la Certainty está por encima del umbral? Si sí →
violación.

**Delegación:** DECISION_MODEL.md (define que el umbral de compromiso está por debajo
del Límite Epistémico, permitiendo acción con incertidumbre residual), CERTAINTY_CALCULUS
implementation (define el residual como constante, no como variable).

---

## 12. Epistemic Limits

### R-CC-030 — The Epistemic Limit

**Enunciado:** Existe un Límite Epistémico superior para la Certainty de toda Belief
sobre hechos empíricos. Este límite es el valor máximo que la Certainty puede alcanzar,
y es estrictamente inferior a 1.0. La Certainty 1.0 está reservada exclusivamente para:

- Invariantes del sistema (ej.: "2 + 2 = 4").
- Definiciones ontológicas (ej.: "un viaje tiene un origen y un destino").
- Reglas constitucionales (ej.: "S-P5: la Evidence es inmutable").

**Derivación Constitucional:** CP-21 (límite epistémico — "la certidumbre de las
Beliefs sobre hechos empíricos no puede alcanzar 1.0"); CONSTITUTION.md §3.1
(Inaccessibility of Truth); R-EM-044 (Certainty bounds — "Certainty derived from
Evidence about empirical facts must never reach 1.0").

**Justificación:** El Límite Epistémico es la traducción operativa de la
inaccesibilidad de la Verdad. Si el sistema pudiera alcanzar 1.0 en una Belief
empírica, estaría pretendiendo acceso a la Verdad que la Constitución dice que no
tiene. El límite fuerza al sistema a mantener siempre un registro de humildad.

**Implicaciones Cognitivas:**
- Toda Belief empírica tiene un techo de Certainty.
- El techo no es alcanzable — es una asíntota.
- Las Beliefs formales (invariantes, definiciones) no tienen techo — pueden ser 1.0.
- El Límite Epistémico es el mismo para todas las Beliefs empíricas (no varía por
  tipo de Belief o contexto).
- El sistema debe verificar que ninguna Belief empírica supere el límite,
  independientemente de cuánta Evidence tenga.

**Impacto Conversacional:** El sistema nunca dice "estoy 100% seguro" sobre nada
relacionado con el mundo real. Incluso cuando está muy seguro, comunica su certeza
de forma calibrada. Esto prepara al usuario para la posibilidad (remota) de error y
construye confianza a largo plazo.

**Verificación:** ¿Existe alguna Belief empírica en el sistema cuya Certainty pueda
alcanzar o superar 1.0? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS implementation (define el valor del Límite
Epistémico y lo aplica como cota superior en toda función de agregación).

---

### R-CC-031 — Certainty floor

**Enunciado:** Existe un piso de Certainty para las Beliefs activas: cuando la
Certainty de una Belief cae por debajo del Umbral de Formación de Creencia (R-EM-047),
la Belief se abandona (revertida a Hypothesis o descartada). Por debajo de ese umbral,
no hay Belief — solo Hypothesis o ausencia de proposición.

**Derivación Constitucional:** CP-13 (hipótesis múltiples — las hipótesis existen por
debajo del umbral de creencia); R-EM-047 (Belief formation threshold — "a proposition
transitions from Hypothesis to Belief when Certainty exceeds the threshold");
R-EM-048c (Belief revision — Abandonment).

**Justificación:** No toda proposición con algo de Evidence merece ser una Belief. Si
la Certainty es muy baja, la proposición es apenas una posibilidad y debe tratarse
como Hypothesis. Definir un piso evita que el sistema tenga "micro-beliefs" con
Certainty muy baja que contaminen el razonamiento.

**Implicaciones Cognitivas:**
- El piso no es cero — es el Umbral de Formación de Creencia.
- Por debajo del piso, la proposición es Hypothesis o está inactiva.
- La Evidence subyacente persiste aunque la Belief se abandone.
- Una Belief abandonada puede recuperarse si nueva Evidence eleva la Certainty por
  encima del umbral.

**Impacto Conversacional:** El sistema no actúa sobre "corazonadas" débiles. Si apenas
tiene información, reconoce que no tiene una creencia formada y actúa en consecuencia
(pregunta, clarifica, o no responde). El usuario no recibe información falsamente
segura basada en evidencia mínima.

**Verificación:** ¿Existe alguna Belief activa en el sistema con una Certainty por
debajo del Umbral de Formación de Creencia? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el Umbral de Formación de Creencia),
CERTAINTY_CALCULUS implementation (verifica el piso antes de permitir la existencia
de la Belief).

---

## 13. Stability, Convergence, and Divergence

### R-CC-032 — Certainty stability

**Enunciado:** La Certainty de una Belief debe ser estable cuando no hay nueva Evidence.
Estabilidad no significa "no cambia" — significa que los únicos cambios son los
producidos por la degradación temporal continua. No debe haber fluctuaciones
espontáneas sin causa: misma Evidence + mismo tiempo = misma Certainty.

**Derivación Constitucional:** R-DM-050 (Deterministic decision outcome — mismo input,
mismo output); CP-07 (determinismo perceptual — por analogía, el cálculo de Certainty
también debe ser determinista); R-EM-045 (automatic recalculation — solo por triggers
definidos).

**Justificación:** Si la Certainty fluctuara sin causa, el sistema sería impredecible.
La misma conversación podría llevar a decisiones diferentes en diferentes momentos
porque la Certainty "cambió sola." La estabilidad es necesaria para la confiabilidad.

**Implicaciones Cognitivas:**
- El cálculo de Certainty es determinista: funciones puras sin estado oculto.
- Las únicas fuentes de cambio son: nueva Evidence, cambio de estado de Evidence,
  degradación temporal, y recalibración de parámetros.
- No hay componentes aleatorios o probabilísticos en el cálculo.
- La estabilidad no es rigidez: la Certainty cambia cuando debe cambiar.

**Impacto Conversacional:** El sistema es consistente. Si el usuario repite la misma
información en el mismo contexto, recibe la misma respuesta. No hay "hoy el sistema
está más seguro que ayer."

**Verificación:** ¿Existe algún componente no determinista en el cálculo de Certainty
(aleatoriedad, muestreo, variación por ejecución)? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS implementation (implementa el cálculo como función
pura y determinista).

---

### R-CC-033 — Convergence of Certainty

**Enunciado:** Cuando múltiples Evidence independientes y consistentes apoyan una
misma proposición, la Certainty debe converger hacia el Límite Epistémico (sin
alcanzarlo). La convergencia debe ser monotónica (cada nueva Evidence consistente
aumenta o mantiene la Certainty, nunca la reduce) mientras no haya contradicción.

**Derivación Constitucional:** CP-20 (actualización por Evidence — la Evidence
consistente aumenta la certidumbre); R-CC-009 (corroboración con rendimientos
decrecientes); R-EM-035 (agregación no eliminatoria).

**Justificación:** La convergencia es el comportamiento esperado de un sistema racional:
más información consistente produce más confianza. La monotonicidad garantiza que la
confianza no fluctúa erráticamente con nueva información consistente.

**Implicaciones Cognitivas:**
- Cada Evidence consistente adicional incrementa la Certainty (cada vez menos).
- La convergencia tiene una asíntota en el Límite Epistémico.
- Si llega Evidence contradictoria, la monotonicidad se rompe (la Certainty puede
  disminuir).
- La convergencia es más rápida al principio (primeras Evidence) y más lenta después.

**Impacto Conversacional:** El sistema gana confianza de forma natural a medida que
acumula información consistente. No tiene "saltos" de confianza inexplicables.

**Verificación:** ¿Existe algún escenario donde Evidence consistente reduzca la
Certainty (sin mediar contradicción)? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS implementation (implementa convergencia monotónica
con asíntota epistémica).

---

### R-CC-034 — Divergence of Certainty

**Enunciado:** Cuando la Evidence es contradictoria o ambigua, la Certainty puede
divergir: en lugar de converger hacia el Límite Epistémico, las múltiples Hipótesis
mantienen su Certainty en un rango medio-bajo sin que ninguna domine. La divergencia
es señal de que el sistema necesita más Evidence para resolver la ambigüedad.

**Derivación Constitucional:** CP-13 (hipótesis múltiples — la divergencia mantiene
activas múltiples hipótesis); R-DM-018 (Multiple hypothesis handling — la decisión
requiere ventaja epistémica); CP-17 (resolución por Evidence — no por tiempo ni
preferencia).

**Justificación:** No toda situación permite convergencia. Cuando la Evidence está
dividida, la Certainty de cada Hipótesis se mantiene en un nivel medio, sin que
ninguna alcance ventaja epistémica suficiente. Esto es normal y esperable — el sistema
no debe forzar la convergencia cuando la Evidence no la justifica.

**Implicaciones Cognitivas:**
- La divergencia es un estado cognitivo válido, no un error.
- Durante la divergencia, el sistema debe mantener múltiples Hipótesis.
- La divergencia se resuelve cuando nueva Evidence inclina la balanza.
- El sistema no debe "inventar" Evidence para resolver la divergencia.
- La divergencia prolongada puede activar escalamiento (CP-26).

**Impacto Conversacional:** El sistema reconoce cuándo no tiene suficiente información
para decidir. No fuerza una respuesta cuando la Evidence es ambigua. Pide clarificación
en lugar de adivinar.

**Verificación:** ¿Existe algún mecanismo que fuerce la convergencia (seleccionar una
Hipótesis) cuando la Evidence no proporciona ventaja epistémica suficiente? Si sí →
violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el manejo de la divergencia en el
Hypothesis Network), CERTAINTY_CALCULUS implementation (implementa el cálculo de
Certainty en ausencia de convergencia).

---

## 14. Certainty and Decision

### R-CC-035 — Certainty is the primary variable in Decision

**Enunciado:** La Certainty de las Beliefs relevantes es la variable primaria que la
Decisión evalúa para determinar si puede comprometerse (R-DM-014). La Decisión compara
la Certainty contra el umbral calculado (R-DM-010). No existe una "sensación" de
suficiencia separada del valor numérico de Certainty.

**Derivación Constitucional:** R-DM-014 (Certainty as primary decision variable);
CP-22 (compromiso explícito — la decisión se basa en el valor de certidumbre);
CONSTITUTION.md §3.4 (Epistemic Sufficiency Principle).

**Justificación:** La Constitución define la suficiencia en términos de certidumbre:
el nivel en el cual el costo esperado de actuar es menor que el costo esperado de no
actuar. La Certainty es el mecanismo que cuantifica esa comparación. Sin ella, la
decisión sería arbitraria.

**Implicaciones Cognitivas:**
- La decisión recibe la Certainty agregada (R-CC-023) como input principal.
- La comparación es: Certainty ≥ umbral_compromiso → COMMIT posible.
- Si la Certainty está por debajo del umbral, ninguna otra consideración puede forzar
  COMMIT.
- La decisión no modifica la Certainty — la consume para decidir.
- El resultado de la comparación se registra como parte de la Decisión (R-DM-031).

**Impacto Conversacional:** Las decisiones del sistema son consistentes y predecibles.
No hay sesgos de "hoy me siento más seguro." La certidumbre se computa de la misma
forma para todos los casos.

**Verificación:** ¿Existe alguna ruta de decisión COMMIT que no compare la Certainty
agregada contra un umbral calculado? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el proceso de comparación), CERTAINTY_CALCULUS
implementation (provee la función de comparación).

---

### R-CC-036 — Epistemic margin for hypothesis resolution

**Enunciado:** Cuando existen múltiples Hipótesis activas, la Decisión epistémica
(resolver una Hipótesis como Belief) requiere que la Hipótesis ganadora tenga una
Certainty suficientemente mayor que la competidora. Esta diferencia mínima es el
Margen Epistémico (R-DM-018). El Margen Epistémico evita que el sistema resuelva
hipótesis basándose en diferencias mínimas de Certainty que podrían deberse a
fluctuaciones normales.

**Derivación Constitucional:** R-DM-018 (Multiple hypothesis handling — "la decisión
solo puede ocurrir cuando una Hipótesis alcanza una ventaja epistémica suficiente");
CP-13 (hipótesis múltiples); CP-17 (resolución por Evidence).

**Justificación:** Si el sistema seleccionara una Hipótesis cuando su Certainty es
apenas 0.01 mayor que otra, sería propenso a errores por fluctuaciones mínimas. El
Margen Epistémico fuerza al sistema a esperar hasta que la ventaja sea significativa.

**Implicaciones Cognitivas:**
- El Margen Epistémico se define por tipo de decisión y Strategic Posture.
- Si ninguna Hipótesis tiene ventaja suficiente, la decisión es CLARIFY.
- El Margen Epistémico es una diferencia, no un valor absoluto.
- Un Margen Epistémico más alto produce decisiones más conservadoras.

**Impacto Conversacional:** El sistema evita "cambios de opinión" por diferencias
mínimas. Si la Evidence está casi igualmente dividida, pide clarificación en lugar de
elegir una opción. El usuario no experimenta decisiones arbitrarias.

**Verificación:** ¿Existe alguna ruta donde el sistema seleccione una Hipótesis sin
verificar que la diferencia de Certainty es al menos igual al Margen Epistémico? Si sí
→ violación.

**Delegación:** DECISION_MODEL.md (define los márgenes por tipo de decisión),
CERTAINTY_CALCULUS implementation (implementa la función de comparación con margen).

---

## 15. Certainty and Commitment

### R-CC-037 — Certainty freezes at commitment time

**Enunciado:** La Certainty que se registra en el Commitment es la Certainty agregada
en el momento exacto en que el Commitment Gate se abre (R-CM-015). Esta Certainty se
"congela" en el Commitment y no cambia aunque la Belief subyacente se actualice después.
El Commitment es un registro histórico: "en este momento, con esta Certainty, el sistema
se comprometió."

**Derivación Constitucional:** R-CM-033 (Certainty at commitment time — "la Certainty
se congela en el Commitment y no cambia"); CP-08 (inmutabilidad — el Commitment es un
registro inmutable); R-DM-024 (Commitment records reference the Decision — la Certainty
es parte del registro).

**Justificación:** La Certainty al momento del compromiso es un dato histórico esencial
para la auditoría. Si la Certainty cambiara después, el Commitment reflejaría una
realidad que no existía cuando se tomó la decisión. La Certainty congelada permite
responder: "¿con qué nivel de confianza se tomó este compromiso?"

**Implicaciones Cognitivas:**
- La Certainty en el Commitment es el valor en el momento del Gate.
- La Belief subyacente puede cambiar después (nueva Evidence), pero eso no modifica
  el Commitment (aunque puede llevar a revocación).
- El Commitment no "hereda" las actualizaciones de Certainty de la Belief.
- La diferencia entre la Certainty al compromiso y la Certainty actual es información
  de aprendizaje.

**Impacto Conversacional:** Los compromisos del sistema son estables. No cambian
retroactivamente porque llegó nueva información. La nueva información puede llevar a
nuevos compromisos, pero los compromisos pasados se mantienen como fueron tomados.

**Verificación:** ¿Existe algún mecanismo que actualice la Certainty registrada en un
Commitment después de su creación? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define la inmutabilidad de la Certainty en el
Commitment), CERTAINTY_CALCULUS implementation (provee el valor al momento del Gate).

---

### R-CC-038 — Post-commitment operational certainty

**Enunciado:** Aunque la Certainty registrada en el Commitment es inmutable, el sistema
mantiene una "Certainty operacional" separada que refleja la confianza actual en que
el Commitment sigue siendo correcto. Esta Certainty operacional se degrada con el
tiempo (R-CM-034) y puede activar alertas de re-evaluación si cae por debajo de un
umbral de alerta. La Certainty operacional no afecta el Commitment — solo informa
sobre su vigencia.

**Derivación Constitucional:** R-CM-034 (Post-commitment certainty degradation — la
certidumbre operacional se degrada independientemente); CP-19 (degradación temporal —
aplicada a Commitments); CP-20 (actualización por Evidence — la nueva evidence puede
confirmar o cuestionar un Commitment activo).

**Justificación:** Un Commitment activo puede volverse menos confiable con el tiempo
aunque el registro original permanezca. El sistema necesita un mecanismo para detectar
cuándo un Commitment necesita re-evaluación, sin violar la inmutabilidad del registro
original.

**Implicaciones Cognitivas:**
- La Certainty operacional comienza igual a la Certainty registrada.
- Se degrada según la misma función del tipo de Belief (R-CC-016).
- Si cae por debajo del umbral de alerta, se activa una alerta de re-evaluación.
- La re-evaluación puede: confirmar (renovar la Certainty), revocar, o modificar.
- La Certainty operacional no aparece en el registro del Commitment — es un metadato
  temporal.

**Impacto Conversacional:** El sistema mantiene sus compromisos actualizados. Si un
compromiso se vuelve dudoso por el paso del tiempo, el sistema lo re-evalúa antes de
ejecutar acciones basadas en él. El usuario no experimenta acciones basadas en
compromisos desactualizados.

**Verificación:** ¿Existe algún Commitment activo que no tenga una Certainty operacional
asociada que se degrade con el tiempo? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define la degradación operacional), CERTAINTY_CALCULUS
implementation (implementa la degradación de la Certainty operacional).

---

## 16. Certainty and Learning

### R-CC-039 — Outcome feedback recalibrates Certainty

**Enunciado:** Cada outcome (R-CM-038) retroalimenta el cálculo de Certainty en tres
niveles:

| Nivel | Qué se recalibra | Cómo |
|-------|------------------|------|
| **Source Confidence** | La Confidence de las fuentes que contribuyeron a la decisión | Si el outcome fue exitoso, la Confidence aumenta ligeramente. Si fue fallido, disminuye más significativamente. |
| **Agregación** | La función de agregación de Evidence | Si la Certainty estimada no correlaciona con la tasa de aciertos, la función se ajusta. |
| **Degradación** | Las tasas de degradación por tipo de Belief | Si las Beliefs de un tipo se degradan más rápido o lento de lo necesario, las tasas se ajustan. |

**Derivación Constitucional:** CP-37 (retroalimentación por outcome — el outcome
ajusta la calibración de certidumbre); CP-38 (ajuste de confianza de fuente — la
Confidence se ajusta por outcomes); R-DM-041 (Outcome-driven calibration); R-EM-056
(Source Confidence adjustment).

**Justificación:** Sin retroalimentación de outcomes, el cálculo de Certainty nunca
aprende de sus errores. Si el sistema está sistemáticamente sobreconfiado o
subconfiado, la recalibración por outcomes corrige el sesgo.

**Implicaciones Cognitivas:**
- Los outcomes negativos tienen mayor peso que los positivos (R-DM-042).
- La recalibración es gradual, no abrupta.
- La recalibración afecta a todas las Beliefs futuras que usen las mismas fuentes o
  el mismo tipo de agregación.
- La recalibración no modifica la Evidence pasada — ajusta los parámetros del cálculo.

**Impacto Conversacional:** El sistema mejora su calibración con la experiencia.
Con el tiempo, "sabe" cuándo está seguro y cuándo no, con mayor precisión. El usuario
experimenta un sistema que cada vez "acierta más" en su nivel de confianza.

**Verificación:** ¿Existe algún parámetro del cálculo de Certainty que no se recalibre
en función de outcomes? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el mecanismo de recalibración), EVIDENCE_MODEL.md
(define el esquema de Evidence de outcome), CERTAINTY_CALCULUS implementation (implementa
la recalibración de parámetros).

---

### R-CC-040 — Learning does not override Evidence

**Enunciado:** La recalibración por outcomes ajusta los parámetros del cálculo de
Certainty, pero nunca modifica, elimina, o invalida la Evidence original. La Confidence
de una Source puede reducirse por outcomes negativos, pero la Evidence que produjo
sigue siendo válida como registro histórico. La recalibración pertenece al futuro, no
al pasado.

**Derivación Constitucional:** CP-39 (mejora no destructiva — "el aprendizaje debe
agregar conocimiento nuevo sin destruir conocimiento previo"); S-P5 (Evidence
Immutability); CP-08 (inmutabilidad operativa).

**Justificación:** La recalibración no es una corrección retrospectiva. Si una Source
produjo Evidence que resultó incorrecta, eso no significa que la Evidence deba
borrarse — significa que el sistema debe confiar menos en esa Source en el futuro.
La Evidence original sigue siendo valiosa para auditoría y para entender qué pasó.

**Implicaciones Cognitivas:**
- La recalibración solo afecta a cálculos futuros.
- La Evidence original permanece en el Evidence Store con su Confidence original.
- La recalibración se aplica a nuevas Evidence de la misma Source.
- La recalibración no es un castigo — es un ajuste estadístico basado en desempeño.

**Impacto Conversacional:** El sistema aprende de sus errores sin "ocultar" el pasado.
Si cometió un error, el registro de ese error persiste para que el sistema (y los
operadores humanos) puedan aprender de él.

**Verificación:** ¿Existe algún mecanismo de recalibración que modifique o elimine
Evidence existente? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define la inmutabilidad del registro de Evidence),
CERTAINTY_CALCULUS implementation (la recalibración solo afecta parámetros futuros).

---

## 17. False Certainty and False Doubt Prevention

### R-CC-041 — Preventing false certainty

**Enunciado:** El sistema debe prevenir activamente la falsa certeza — situaciones
donde la Certainty es más alta de lo que la Evidence justifica. Los mecanismos de
prevención son:

1. **Límite Epistémico** (R-CC-030): Ninguna Belief empírica puede acercarse a 1.0.
2. **Asimetría de contradicción** (R-CC-010): Una contradicción fuerte tiene más peso
   que varias corroboraciones débiles.
3. **Degradación temporal** (R-CC-015): La Certainty se reduce con el tiempo.
4. **Detección de dependencias** (R-CC-011): Evidence del mismo origen no cuenta
   múltiples veces.
5. **Residual de incertidumbre** (R-CC-028): Siempre hay un margen de error irreducible.

**Derivación Constitucional:** CP-21 (límite epistémico); P-I4 (Humility Before
Uncertainty); CP-10 (resolución de Evidence conflictiva); CP-19 (degradación temporal).

**Justificación:** La falsa certeza es el error epistémico más peligroso del sistema.
Lleva a decisiones sin fundamento, compromisos prematuros, y pérdida de confianza del
usuario. La prevención debe ser múltiple y redundante para que ningún punto de falla
permita que una falsa certeza se forme.

**Implicaciones Cognitivas:**
- Todos los mecanismos de prevención operan simultáneamente.
- Ningún mecanismo solo es suficiente para prevenir la falsa certeza.
- Si a pesar de los mecanismos se detecta una falsa certeza (outcome negativo), la
  recalibración (R-CC-039) ajusta los parámetros para prevenir recurrencia.

**Impacto Conversacional:** El sistema es humilde por diseño. No dice "estoy seguro"
cuando no debería. El usuario puede confiar en que el nivel de confianza del sistema
está calibrado y no es exagerado.

**Verificación:** ¿Existe algún escenario donde los mecanismos de prevención de falsa
certeza puedan ser burlados (la Certainty supera lo que la Evidence justifica)? Si sí
→ violación.

**Delegación:** CERTAINTY_CALCULUS implementation (implementa los cinco mecanismos de
prevención), COGNITIVE_ARCHITECTURE.md (verifica la integridad de los mecanismos en
cada ciclo).

---

### R-CC-042 — Preventing false doubt

**Enunciado:** El sistema debe prevenir también la falsa duda — situaciones donde la
Certainty es más baja de lo que la Evidence justifica. Los mecanismos de prevención son:

1. **Corroboración** (R-CC-009): Múltiples Evidence consistentes aumentan la Certainty.
2. **Precedencia de Source** (R-CC-007): Evidence de fuentes confiables tiene peso
   adecuado.
3. **Recuperación por confirmación** (R-CC-019): La confirmación del usuario restaura
   la Certainty.
4. **Historial del usuario** (R-CC-014): Patrones conocidos refuerzan la Certainty.
5. **Contexto** (R-CC-013): El contexto puede aumentar la Certainty cuando es apropiado.

**Derivación Constitucional:** CP-12 (suficiencia mínima — el sistema debe operar con
la cantidad mínima de Evidence suficiente, sin esperar certidumbre completa);
P-E5 (Proportional Response — la respuesta debe ser proporcionada a la certidumbre);
CP-36 (contexto mínimo).

**Justificación:** La falsa duda es el opuesto de la falsa certeza. Si el sistema duda
cuando no debería, pierde oportunidades, pregunta innecesariamente, y frustra al
usuario. La prevención de la falsa duda asegura que el sistema confíe en su Evidence
cuando es suficiente.

**Implicaciones Cognitivas:**
- La falsa duda puede ocurrir cuando la degradación es demasiado agresiva.
- También puede ocurrir cuando el sistema ignora la corroboración o el contexto.
- La recalibración (R-CC-039) puede ajustar las tasas de degradación si se detecta
  falsa duda recurrente.
- La prevención de la falsa duda no debe relajar la prevención de la falsa certeza.

**Impacto Conversacional:** El sistema no pregunta innecesariamente. Si tiene suficiente
Evidence, confía y actúa. El usuario no se frustra con preguntas repetitivas o dudas
injustificadas.

**Verificación:** ¿Existe algún escenario donde el sistema dude (Certainty por debajo
del umbral) a pesar de tener Evidence suficiente y de alta calidad? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS implementation (implementa los mecanismos que
aseguran que la Certainty refleje toda la Evidence disponible, no solo la más reciente
o la más negativa).

---

### R-CC-043 — Balance between certainty and doubt

**Enunciado:** El cálculo de Certainty debe buscar un balance calibrado entre la
prevención de la falsa certeza (R-CC-041) y la prevención de la falsa duda (R-CC-042).
El principio rector es: **es preferible una falsa duda (preguntar de más) a una falsa
certeza (actuar incorrectamente).** Este sesgo conservador está definido por la
Constitución (S-P7) y no puede invertirse.

**Derivación Constitucional:** S-P7 (Human Escalation — "when in doubt, escalate rather
than make an unsupported commitment"); CONSTITUTION.md §2.3 ("AITOS errs on the side of
inaction when the consequences of action are uncertain"); P-I4 (Humility Before
Uncertainty).

**Justificación:** La Constitución es explícita: cuando hay duda, el sistema debe
equivocarse del lado de la precaución. Esto significa que el sesgo del cálculo de
Certainty debe estar ligeramente inclinado hacia la precaución (Certainty ligeramente
más baja que alta). Sin embargo, el sesgo no debe ser tan fuerte que genere falsa duda
sistemática.

**Implicaciones Cognitivas:**
- El sesgo conservador es un parámetro del cálculo de Certainty (configurable, pero
  con un mínimo de precaución).
- El sesgo no debe distorsionar la estimación — debe ser un factor pequeño.
- La recalibración por outcomes puede ajustar el sesgo: si hay demasiadas falsas dudas,
  puede reducirse ligeramente; si hay demasiadas falsas certezas, debe aumentarse.
- El sesgo nunca puede eliminarse completamente (por mandato constitucional).

**Impacto Conversacional:** El sistema es precavido pero no paralítico. Cuando tiene
duda, pregunta o clarifica en lugar de actuar incorrectamente. Pero no duda
sistemáticamente cuando la Evidence es clara. El usuario percibe un sistema responsable
que no toma riesgos innecesarios.

**Verificación:** ¿Existe algún mecanismo en el cálculo de Certainty que invierta el
sesgo conservador (falsa certeza preferible a falsa duda)? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS implementation (implementa el sesgo conservador como
parámetro calibrable con mínimo constitucional), DECISION_MODEL.md (define la relación
entre el sesgo y la Strategic Posture).

---

## 18. Persistence and Traceability

### R-CC-044 — Certainty is not persisted, it is recomputed

**Enunciado:** La Certainty de las Beliefs no se persiste como un valor almacenado.
La Certainty se recomputa en cada ciclo a partir de la Evidence persistida en el
Evidence Store. La persistencia de la Certainty sería redundante (la Evidence es la
fuente) y potencialmente peligrosa (la Certainty almacenada podría desincronizarse de
la Evidence).

**Derivación Constitucional:** R-EM-042 (Certainty is a function of Evidence — "it is
a derived value, recomputed each time the relevant Evidence changes"); S-P6 (Knowledge
Preservation — la Evidence se preserva, no la Certainty); CP-20 (actualización por
Evidence).

**Justificación:** Si la Certainty se persistiera como un valor separado, existiría el
riesgo de que el valor almacenado no refleje la Evidence actual. La computación en
cada ciclo garantiza que la Certainty siempre está sincronizada con la Evidence.

**Implicaciones Cognitivas:**
- La Certainty se computa en tiempo de lectura, no se almacena en tiempo de escritura.
- El costo computacional de recomputar es necesario para la integridad epistémica.
- La recomputación debe ser eficiente (la arquitectura debe soportar consultas rápidas
  de Evidence por proposición).
- Solo la Certainty congelada en Commitments (R-CC-037) se persiste (como registro
  histórico).

**Impacto Conversacional:** La Certainty del sistema siempre está actualizada. No hay
casos donde la confianza del sistema refleje un estado de conocimiento pasado.

**Verificación:** ¿Existe algún mecanismo que persista la Certainty de las Beliefs
activas como valor almacenado en lugar de recomputarla desde la Evidence? Si sí →
violación.

**Delegación:** EVIDENCE_MODEL implementation (provee consultas eficientes de Evidence
por proposición), COGNITIVE_ARCHITECTURE.md (define la recomputación en cada ciclo),
CERTAINTY_CALCULUS implementation (la función de cálculo no tiene estado persistente).

---

### R-CC-045 — Traceability of Certainty

**Enunciado:** El cálculo de Certainty debe ser completamente trazable: dado un valor
de Certainty, debe ser posible reconstruir:

- Qué Evidence contribuyó al cálculo (IDs de Evidence).
- Qué factores se aplicaron (Confidence, precedencia, edad, corroboración,
  contradicción).
- Qué parámetros se usaron (tasas de degradación, pesos de factores, Límite
  Epistémico).
- En qué momento se computó.

**Derivación Constitucional:** P-I5 (Auditability of Every Decision — la Certainty es
parte de la cadena de auditoría); R-DM-031 (Complete decision record — la Certainty
debe registrarse con todos sus fundamentos); CP-09 (trazabilidad observacional — por
analogía, la Certainty debe ser trazable).

**Justificación:** La auditabilidad de las decisiones (P-I5) requiere que la Certainty
que las fundamentó sea trazable hasta la Evidence que la produjo. Sin trazabilidad,
no se puede verificar si la Certainty fue calculada correctamente.

**Implicaciones Cognitivas:**
- La trazabilidad puede lograrse mediante el registro de los IDs de Evidence en la
  Decisión (R-DM-031).
- La trazabilidad no requiere almacenar el valor intermedio de la función — requiere
  almacenar los inputs.
- Los parámetros del cálculo (tasas, límites) deben estar disponibles en el momento
  de la auditoría.
- La trazabilidad debe ser posible para toda Certainty que haya fundamentado una
  Decisión o un Commitment.

**Impacto Conversacional:** (Infraestructura para auditoría — no visible directamente
al usuario, pero esencial para la confiabilidad del sistema a largo plazo.)

**Verificación:** ¿Existe alguna Certainty que haya fundamentado una Decisión COMMIT
cuyo cálculo no pueda trazarse hasta la Evidence y los parámetros usados? Si sí →
violación.

**Delegación:** DECISION_MODEL.md (define el registro de Evidence IDs en la Decisión),
EVIDENCE_MODEL.md (define el esquema de consulta de Evidence), CERTAINTY_CALCULUS
implementation (la función de cálculo debe ser invocable con trazabilidad).

---

## 19. Consistency of the Certainty Calculus

### R-CC-046 — Internal consistency

**Enunciado:** El cálculo de Certainty debe ser internamente consistente: no puede
producir resultados contradictorios para la misma Evidence en el mismo contexto. Si
dos Beliefs tienen la misma Evidence, la misma Confidence, la misma edad, y el mismo
contexto, deben tener la misma Certainty.

**Derivación Constitucional:** R-DM-050 (Deterministic decision outcome); CP-07
(determinismo perceptual — por analogía); S-P4 (Deterministic Core — la certeza debe
ser tan determinista como la percepción).

**Justificación:** La consistencia interna es el requisito mínimo de un sistema
racional. Si el cálculo es inconsistente, las decisiones serán impredecibles y el
sistema no será confiable.

**Implicaciones Cognitivas:**
- El cálculo es una función pura (mismo input → mismo output).
- No hay estado oculto que afecte el resultado.
- Las pruebas de consistencia deben ser automáticas y periódicas.
- Cualquier inconsistencia detectada debe escalarse como fallo del sistema.

**Impacto Conversacional:** El sistema es confiable. El usuario puede predecir cómo
responderá el sistema basándose en su experiencia previa.

**Verificación:** ¿Existe algún escenario donde el mismo conjunto de Evidence produzca
diferentes valores de Certainty? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS implementation (implementa el cálculo como función
pura y determinista), COGNITIVE_ARCHITECTURE.md (incluye pruebas de consistencia en
el ciclo de validación).

---

### R-CC-047 — Cross-model consistency

**Enunciado:** El cálculo de Certainty debe ser consistente con los otros modelos del
sistema:

- **Con EVIDENCE_MODEL**: La Certainty se deriva exclusivamente de Evidence registrada
  en el Evidence Store (R-EM-042). No puede usar información no registrada.
- **Con DECISION_MODEL**: La Certainty es la variable primaria de decisión (R-DM-014).
  La decisión compara Certainty contra umbral (R-DM-010).
- **Con COMMITMENT_MODEL**: La Certainty se congela en el Commitment (R-CM-033). La
  Certainty operacional se degrada independientemente (R-CM-034).
- **Con COGNITIVE_PRINCIPLES**: La Certainty respeta CP-18 (continua), CP-19
  (degradación), CP-20 (actualización), CP-21 (límite epistémico).

**Derivación Constitucional:** CONSTITUTION.md §6 (Jerarquía documental — los modelos
deben ser consistentes entre sí); R-H2 (Compatibilidad entre niveles).

**Justificación:** La consistencia entre modelos es necesaria para que el sistema
opere como un todo coherente. Si el cálculo de Certainty contradice el modelo de
Evidence, o el modelo de decisión usa la Certainty de forma diferente a como se
define aquí, el sistema será inconsistente.

**Implicaciones Cognitivas:**
- Cualquier cambio en el cálculo de Certainty debe verificarse contra los otros
  modelos.
- La verificación de consistencia debe ser parte del proceso de cambio.
- Si se detecta una inconsistencia, debe resolverse antes de implementar el cambio.

**Impacto Conversacional:** El comportamiento del sistema es coherente. No hay
contradicciones entre cómo el sistema "piensa" (ciertas) y cómo "decide" (umbrales)
o cómo "actúa" (compromisos).

**Verificación:** ¿Existe algún aspecto del cálculo de Certainty que contradiga los
modelos de Evidence, Decisión, Commitment, o Principios Cognitivos? Si sí → violación.

**Delegación:** AEL (verifica la consistencia entre modelos documentales),
COGNITIVE_ARCHITECTURE.md (define las pruebas de integración entre modelos).

---

## 20. Invariants

### R-CC-048 — No certainty without Evidence

**Enunciado:** Toda Certainty debe tener al menos un registro de Evidence que la
fundamente. No existe "Certainty por defecto" ni "Certainty por intuición."

**Verificación:** Una Belief con Certainty > 0 debe tener al menos una Evidence ID
asociada en su registro.

**Fuente:** R-EM-042, CP-05, S-P1.

---

### R-CC-049 — Certainty is always ≤ Epistemic Limit for empirical facts

**Enunciado:** La Certainty de toda Belief empírica debe ser siempre menor o igual
al Límite Epistémico. La Certainty 1.0 solo está permitida para verdades formales e
invariantes del sistema.

**Verificación:** Ninguna Belief empírica puede tener Certainty > Límite Epistémico.

**Fuente:** CP-21, R-EM-044, R-CC-030.

---

### R-CC-050 — Certainty is always ≥ 0

**Enunciado:** La Certainty nunca puede ser negativa. El rango válido es [0, Límite
Epistémico] para Beliefs empíricas, y [0, 1] para verdades formales.

**Verificación:** No existe Belief con Certainty negativa.

**Fuente:** CP-18 (rango [0, 1] para certidumbre continua).

---

### R-CC-051 — Deterministic certainty computation

**Enunciado:** Dado el mismo conjunto de Evidence, los mismos parámetros de cálculo,
y el mismo contexto, el sistema debe producir el mismo valor de Certainty.

**Verificación:** Dos ejecuciones con los mismos inputs producen el mismo output.

**Fuente:** R-DM-050, CP-07, S-P4.

---

### R-CC-052 — Certainty reflects all relevant Evidence

**Enunciado:** En todo momento, la Certainty de una Belief debe reflejar toda la
Evidence relevante disponible en el Evidence Store. No puede ignorar Evidence por
razones de eficiencia, orden de llegada, o preferencia.

**Verificación:** La Certainty de una Belief debe recalcularse cuando se agrega,
modifica (estado), o degrada cualquier Evidence relevante.

**Fuente:** CP-20, R-EM-045, R-CC-023.

---

### R-CC-053 — No circular certainty

**Enunciado:** El cálculo de Certainty no puede contener ciclos: ninguna Belief puede
depender directa o indirectamente de su propia Certainty. El grafo de dependencias
debe ser acíclico.

**Verificación:** No existe una Belief que dependa de sí misma a través de la
propagación de Certainty.

**Fuente:** CP-20 (actualización por Evidence — la dirección es de Evidence a Belief,
no al revés), R-CC-005 (Confidence → Certainty, no al revés).

---

## 21. Delegation to Implementation Documents

### 21.1 Documents that concretize this model

| Document | What it concretizes from this model |
|----------|-------------------------------------|
| **CERTAINTY_CALCULUS implementation** (Level IV) | Función de cálculo de Certainty (R-CC-006 a R-CC-014), función de degradación (R-CC-015 a R-CC-017), función de recuperación (R-CC-018 a R-CC-020), función de propagación (R-CC-021, R-CC-022), función de agregación (R-CC-023 a R-CC-025), recalibración (R-CC-026, R-CC-027), Límite Epistémico (R-CC-030), piso de certeza (R-CC-031), determinismo (R-CC-051) |
| **COGNITIVE_ARCHITECTURE.md** (Level II-b) | Momento del ciclo para recalcular Certainty (R-CC-001), sistema de eventos de recalibración (R-CC-026), Hypothesis Network (R-CC-025), verificación de consistencia (R-CC-046, R-CC-047) |
| **DECISION_MODEL.md** (Level III-b) | Comparación Certainty vs umbral (R-CC-035), Margen Epistémico (R-CC-036), recalibración por outcomes (R-CC-039), ajuste de Confidence de Source (R-CC-012) |
| **COMMITMENT_MODEL.md** (Level III-c) | Congelamiento de Certainty en Commitment (R-CC-037), degradación operacional (R-CC-038) |
| **EVIDENCE_MODEL.md** (Level III-a) | Evidence como fuente exclusiva de Certainty (R-CC-006), factores de Evidence (R-CC-007), persistencia de Evidence (R-CC-044), trazabilidad (R-CC-045) |
| **KNOWLEDGE_MODEL.md** (Level III-f) | Relaciones semánticas entre Beliefs (R-CC-021), Beliefs derivadas (R-CC-022), contexto y historial (R-CC-013, R-CC-014) |

### 21.2 Traceability matrix

| Rule | Source CP | Source CONSTITUTION | Source EVIDENCE_MODEL | Source DECISION_MODEL | Source COMMITMENT_MODEL | Implements for |
|------|-----------|-------------------|----------------------|----------------------|------------------------|----------------|
| R-CC-001 | CP-18 | §3.1, §3.3.1, P-E2 | R-EM-042 | — | — | COGNITIVE_ARCHITECTURE.md, CC implementation |
| R-CC-002 | CP-18 | P-E2, §3.3.1 | — | — | — | COGNITIVE_ARCHITECTURE.md, CC implementation |
| R-CC-003 | CP-20 | P-E4, §3.5 | — | — | — | COGNITIVE_ARCHITECTURE.md, CC implementation |
| R-CC-004 | CP-18, CP-38 | — | — | — | — | EVIDENCE_MODEL.md, CC implementation |
| R-CC-005 | CP-38, CP-37 | — | — | — | — | DECISION_MODEL.md, CC implementation |
| R-CC-006 | CP-05 | S-P1 | R-EM-042 | — | — | COGNITIVE_ARCHITECTURE.md, CC implementation |
| R-CC-007 | CP-18, CP-19, CP-20, CP-10 | — | R-EM-043 | — | — | CC implementation, EVIDENCE_MODEL implementation |
| R-CC-008 | CP-18, CP-21 | — | R-EM-042 | — | — | CC implementation |
| R-CC-009 | CP-20, CP-21 | — | R-EM-035 | — | — | CC implementation |
| R-CC-010 | CP-10, CP-20, CP-17 | — | — | — | — | CC implementation, DECISION_MODEL.md |
| R-CC-011 | CP-10, CP-15, CP-20 | — | — | — | — | CC implementation, COGNITIVE_ARCHITECTURE.md |
| R-CC-012 | CP-38 | — | R-EM-016, R-EM-043 | — | — | CC implementation, DECISION_MODEL.md |
| R-CC-013 | CP-36 | — | — | R-DM-034 | — | KNOWLEDGE_MODEL.md, CC implementation |
| R-CC-014 | CP-34, CP-36, CP-17 | — | — | — | — | EVIDENCE_MODEL.md, CC implementation |
| R-CC-015 | CP-19 | §3.3.1 | R-EM-023 | — | — | CC implementation, EVIDENCE_MODEL.md |
| R-CC-016 | CP-19 | — | — | — | R-CM-034 | CC implementation, DECISION_MODEL.md |
| R-CC-017 | CP-19 | — | — | — | — | CC implementation |
| R-CC-018 | CP-19, CP-20 | — | R-EM-024 | — | — | CC implementation |
| R-CC-019 | CP-18 | — | R-EM-041 | — | — | CC implementation, DECISION_MODEL.md |
| R-CC-020 | CP-39 | S-P5, P-I5 | — | — | — | EVIDENCE_MODEL.md, CC implementation |
| R-CC-021 | CP-18, CP-20 | — | R-EM-030, R-EM-031 | — | — | KNOWLEDGE_MODEL.md, CC implementation |
| R-CC-022 | CP-08 | S-P5 | R-EM-003 | — | — | KNOWLEDGE_MODEL.md, CC implementation |
| R-CC-023 | CP-20 | — | R-EM-035 | R-DM-015 | — | CC implementation, EVIDENCE_MODEL.md |
| R-CC-024 | CP-39 | S-P5 | R-EM-036 | — | — | EVIDENCE_MODEL implementation, CC implementation |
| R-CC-025 | CP-13 | — | R-EM-047 | R-DM-018 | — | COGNITIVE_ARCHITECTURE.md, CC implementation |
| R-CC-026 | CP-20 | — | R-EM-045 | — | — | COGNITIVE_ARCHITECTURE.md, CC implementation |
| R-CC-027 | CP-37, CP-38 | — | R-EM-056 | R-DM-041 | — | DECISION_MODEL.md, EVIDENCE_MODEL.md, CC implementation |
| R-CC-028 | CP-21 | §3.1 | R-EM-044 | — | — | CC implementation |
| R-CC-029 | CP-21 | §3.4, P-I4 | — | — | — | DECISION_MODEL.md, CC implementation |
| R-CC-030 | CP-21 | §3.1 | R-EM-044 | — | — | CC implementation |
| R-CC-031 | CP-13 | — | R-EM-047, R-EM-048 | — | — | DECISION_MODEL.md, CC implementation |
| R-CC-032 | CP-07 | S-P4 | — | R-DM-050 | — | CC implementation |
| R-CC-033 | CP-20 | — | R-EM-035 | — | — | CC implementation |
| R-CC-034 | CP-13, CP-17 | — | — | R-DM-018 | — | COGNITIVE_ARCHITECTURE.md, CC implementation |
| R-CC-035 | CP-22 | §3.4 | — | R-DM-014, R-DM-010 | — | DECISION_MODEL.md, CC implementation |
| R-CC-036 | CP-13, CP-17 | — | — | R-DM-018 | — | DECISION_MODEL.md, CC implementation |
| R-CC-037 | CP-08, CP-22 | — | — | R-DM-024 | R-CM-033 | COMMITMENT_MODEL.md, CC implementation |
| R-CC-038 | CP-19, CP-20 | — | — | — | R-CM-034 | COMMITMENT_MODEL.md, CC implementation |
| R-CC-039 | CP-37, CP-38 | — | R-EM-056 | R-DM-041 | — | DECISION_MODEL.md, EVIDENCE_MODEL.md, CC implementation |
| R-CC-040 | CP-39 | S-P5 | — | — | — | EVIDENCE_MODEL.md, CC implementation |
| R-CC-041 | CP-21, P-I4, CP-10, CP-19 | — | — | — | — | CC implementation, COGNITIVE_ARCHITECTURE.md |
| R-CC-042 | CP-12, P-E5, CP-36 | — | — | — | — | CC implementation |
| R-CC-043 | S-P7 | §2.3, P-I4 | — | — | — | CC implementation, DECISION_MODEL.md |
| R-CC-044 | CP-20 | S-P6 | R-EM-042 | — | — | EVIDENCE_MODEL implementation, COGNITIVE_ARCHITECTURE.md, CC implementation |
| R-CC-045 | CP-09 | P-I5 | — | R-DM-031 | — | DECISION_MODEL.md, EVIDENCE_MODEL.md, CC implementation |
| R-CC-046 | CP-07 | S-P4 | — | R-DM-050 | — | CC implementation, COGNITIVE_ARCHITECTURE.md |
| R-CC-047 | — | §6 | — | — | — | AEL, COGNITIVE_ARCHITECTURE.md |
| R-CC-048 | CP-05 | S-P1 | R-EM-042 | — | — | CC implementation |
| R-CC-049 | CP-21 | §3.1 | R-EM-044 | — | — | CC implementation |
| R-CC-050 | CP-18 | — | — | — | — | CC implementation |
| R-CC-051 | CP-07 | S-P4 | — | R-DM-050 | — | CC implementation |
| R-CC-052 | CP-20 | — | R-EM-045 | — | — | CC implementation |
| R-CC-053 | CP-20, CP-38 | — | — | — | — | CC implementation |

---

## Appendix — Summary of Delegations Received

This document concretizes the following delegations from higher-level documents:

### From COGNITIVE_PRINCIPLES.md (§13.2):

| CP | Principle | Concretized by |
|----|-----------|----------------|
| CP-18 | Certidumbre continua | R-CC-001, R-CC-002, R-CC-007, R-CC-008, R-CC-019, R-CC-023, R-CC-033, R-CC-049, R-CC-050 |
| CP-19 | Degradación temporal | R-CC-007, R-CC-015, R-CC-016, R-CC-017, R-CC-018, R-CC-034, R-CC-038 |
| CP-20 | Actualización por Evidence | R-CC-003, R-CC-007, R-CC-009, R-CC-010, R-CC-011, R-CC-018, R-CC-023, R-CC-026, R-CC-033, R-CC-044, R-CC-052, R-CC-053 |
| CP-21 | Límite epistémico | R-CC-008, R-CC-028, R-CC-029, R-CC-030, R-CC-041, R-CC-049 |

### From EVIDENCE_MODEL.md:

| EM Rule | Topic | Concretized by |
|---------|-------|----------------|
| R-EM-035 | Aggregation for belief formation | R-CC-023, R-CC-033 |
| R-EM-042 | Certainty is a function of Evidence | R-CC-001, R-CC-006, R-CC-008, R-CC-044, R-CC-048 |
| R-EM-043 | Five factors in Certainty computation | R-CC-007, R-CC-012 |
| R-EM-044 | Certainty bounds (Epistemic Limit) | R-CC-028, R-CC-030, R-CC-049 |
| R-EM-045 | Automatic Certainty recalculation | R-CC-026, R-CC-052 |
| R-EM-047 | Belief formation threshold | R-CC-025, R-CC-031 |
| R-EM-056 | Source Confidence adjustment | R-CC-027, R-CC-039 |

### From DECISION_MODEL.md:

| DM Rule | Topic | Concretized by |
|---------|-------|----------------|
| R-DM-010 | Sufficiency criterion | R-CC-035 |
| R-DM-014 | Certainty as primary decision variable | R-CC-035 |
| R-DM-015 | Multiple Evidence, single Certainty | R-CC-023 |
| R-DM-018 | Epistemic margin | R-CC-025, R-CC-036, R-CC-034 |
| R-DM-041 | Outcome-driven calibration | R-CC-027, R-CC-039 |
| R-DM-050 | Deterministic decision outcome | R-CC-032, R-CC-046, R-CC-051 |

### From COMMITMENT_MODEL.md:

| CM Rule | Topic | Concretized by |
|---------|-------|----------------|
| R-CM-033 | Certainty at commitment time | R-CC-037 |
| R-CM-034 | Post-commitment certainty degradation | R-CC-016, R-CC-038 |

---

*Fin de 07-CERTAINTY_CALCULUS.md — Versión 1.0-draft*

> Este documento fue redactado a partir de la delegación constitucional de
> COGNITIVE_PRINCIPLES.md (CP-18, CP-19, CP-20, CP-21), EVIDENCE_MODEL.md (R-EM-042
> a R-EM-045, R-EM-056), DECISION_MODEL.md (R-DM-010, R-DM-014, R-DM-015, R-DM-018,
> R-DM-041, R-DM-050), COMMITMENT_MODEL.md (R-CM-033, R-CM-034), y la terminología
> de SYSTEM_VOCABULARY.md.
>
> Este documento contiene 0 fórmulas matemáticas, 0 porcentajes, 0 pesos fijos,
> 0 algoritmos concretos, 0 referencias a implementación, 0 APIs, 0 clases, y
> 0 servicios. Es un modelo conceptual puro.
>
> Es un DRAFT hasta su ratificación mediante el proceso de gobierno de la Constitución
> (CONSTITUTION.md Sección 7.2).
> Fecha: 2026-07-11
