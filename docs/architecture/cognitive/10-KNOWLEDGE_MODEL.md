# AITOS Cognitive Constitution — 10-KNOWLEDGE_MODEL.md

> **Knowledge Model of the AI Transportation Operating System**
>
> Status: **DRAFT** — first writing from Constitutional delegation
> Version: 1.0-draft
> Date: 2026-07-12
>
> ⚠️ This document belongs to **Level III-f (Contractual Authority)** of the AITOS
> Document Hierarchy (CONSTITUTION.md §6). It derives from CONSTITUTION.md (Level I-a),
> SYSTEM_VOCABULARY.md (Level I-b), COGNITIVE_PRINCIPLES.md (Level II-a), EVIDENCE_MODEL.md
> (Level III-a), DECISION_MODEL.md (Level III-b), COMMITMENT_MODEL.md (Level III-c),
> and CERTAINTY_CALCULUS.md (Level III-d).
>
> This document defines the **conceptual model** of Knowledge: what it is, how it is
> born, how it evolves, how it is corrected, how it is invalidated, how it is preserved,
> and how it participates in Decisions, Commitments, and Learning. It does not define
> data structures, storage mechanisms, algorithms, or implementation. It prescribes
> **what** the Knowledge Model must achieve and **why**, not **how** it must be built.
>
> Every rule herein is binding on Level IV documents. Violations are implementation debt
> managed under S-P9.

---

## Table of Contents

1. [Preamble — What This Model Is](#1-preamble--what-this-model-is)
2. [Nature of Knowledge](#2-nature-of-knowledge)
3. [Knowledge vs. Evidence, Belief, Certainty, Data](#3-knowledge-vs-evidence-belief-certainty-data)
4. [Knowledge State Architecture](#4-knowledge-state-architecture)
5. [Birth of Knowledge](#5-birth-of-knowledge)
6. [Knowledge Types](#6-knowledge-types)
7. [Temporal Knowledge](#7-temporal-knowledge)
8. [Contextual Knowledge](#8-contextual-knowledge)
9. [Knowledge Composition and Inheritance](#9-knowledge-composition-and-inheritance)
10. [Knowledge Fragmentation](#10-knowledge-fragmentation)
11. [Knowledge Evolution and Revision](#11-knowledge-evolution-and-revision)
12. [Knowledge Correction](#12-knowledge-correction)
13. [Knowledge Invalidation](#13-knowledge-invalidation)
14. [Knowledge Preservation and Archiving](#14-knowledge-preservation-and-archiving)
15. [Knowledge Reconstruction](#15-knowledge-reconstruction)
16. [Consistency and Contradiction](#16-consistency-and-contradiction)
17. [Incomplete Knowledge](#17-incomplete-knowledge)
18. [Conflicting Knowledge](#18-conflicting-knowledge)
19. [Knowledge and Decision](#19-knowledge-and-decision)
20. [Knowledge and Commitment](#20-knowledge-and-commitment)
21. [Knowledge and Learning](#21-knowledge-and-learning)
22. [Knowledge and Conversation Memory](#22-knowledge-and-conversation-memory)
23. [Knowledge and Strategic Projection](#23-knowledge-and-strategic-projection)
24. [Knowledge Traceability](#24-knowledge-traceability)
25. [Invariants](#25-invariants)
26. [Delegation to Implementation Documents](#26-delegation-to-implementation-documents)

---

## 1. Preamble — What This Model Is

### 1.1 Purpose

This document specifies the **Knowledge Model** of AITOS: the complete conceptual
definition of Knowledge as a cognitive construct — what it is, what it contains, how it
is structured, how it changes over time, and how it participates in every cognitive
function of the system.

The Knowledge Model is the **epistemic fabric** of the system. It is the organized body
of everything AITOS believes, remembers, and commits to. Every interaction, every
decision, every action is an expression of the Knowledge State.

### 1.2 Scope

This document governs:

1. **What Knowledge is** — its nature, its distinction from Evidence, Belief, Certainty,
   and Data.
2. **How Knowledge is organized** — the structure of the Knowledge State, its layers,
   its components, their relationships.
3. **How Knowledge is born** — from Evidence, through integration and consolidation.
4. **How Knowledge changes** — evolution, revision, correction, invalidation.
5. **How Knowledge is preserved** — archiving, persistence, reconstruction.
6. **How Knowledge maintains integrity** — consistency, contradiction avoidance,
   incomplete knowledge, conflicting knowledge.
7. **How Knowledge participates** — in Decisions, Commitments, Learning, Conversation,
   and Strategic Projection.
8. **How Knowledge is traced** — provenance, audit, lineage.

This document does **NOT** govern:

- The Evidence Store or Evidence lifecycle (see EVIDENCE_MODEL.md).
- The mathematical computation of Certainty (see CERTAINTY_CALCULUS.md).
- The Decision lifecycle or alternatives (see DECISION_MODEL.md).
- The Commitment state machine and lifecycle (see COMMITMENT_MODEL.md).
- The execution of Actions (see ACTION_EXECUTOR.md).
- The conversational channel adaptation (see CHANNEL_ADAPTER.md).
- The integrated Cognitive Cycle flow (see COGNITIVE_ARCHITECTURE.md).
- The specific data structures, databases, caches, algorithms, or code used to
  implement the Knowledge Model.

### 1.3 Authority hierarchy

| Source document | Relationship to this document |
|---|---|
| **CONSTITUTION.md** (Level I-a) | Source of supreme principles: §3 (Epistemic Stance), S-P6 (Knowledge Preservation), S-P5 (Evidence Immutability), P-I5 (Auditability), P-E1 (Evidence over Intuition), P-E4 (Revisability), S-P8 (Preservation over operation) |
| **SYSTEM_VOCABULARY.md** (Level I-b) | Source of all terminology: Knowledge (3.6), Knowledge State (6.1), Belief (5.2), Evidence (5.1), Hypothesis (6.4), Certainty (6.2), Confidence (6.3), Memory (11.1), Commitment (8.2), Decision (8.1), Operational Projection (9.2) |
| **COGNITIVE_PRINCIPLES.md** (Level II-a) | Source of cognitive principles: CP-27 (Proyección derivada), CP-28 (Proyección de solo lectura), CP-29 (Reconstrucción desde Evidence), CP-30 (Preservación del estado cognitivo), CP-31 (Archivo por relevancia), CP-39 (Mejora no destructiva) |
| **EVIDENCE_MODEL.md** (Level III-a) | Defines the Evidence Store as the foundation of the Knowledge State; sibling document |
| **DECISION_MODEL.md** (Level III-b) | Defines how Decisions consume and produce Knowledge; sibling document |
| **COMMITMENT_MODEL.md** (Level III-c) | Defines how Commitments are part of the Knowledge State; sibling document |
| **CERTAINTY_CALCULUS.md** (Level III-d) | Defines how Certainty qualifies Knowledge; sibling document |

### 1.4 Reading this document

Each rule in this document follows this uniform format:

```
### R-KM-NNN — Name of the rule

**Enunciado:** The normative statement.

**Derivación Constitucional:** Source principles from CONSTITUTION.md,
SYSTEM_VOCABULARY.md, COGNITIVE_PRINCIPLES.md, or sibling Level III documents.

**Justificación:** Why this rule exists — the reasoning behind it.

**Implicaciones Cognitivas:** What this rule means for the cognitive architecture.

**Impacto Conversacional:** The observable improvement in user experience.

**Verificación:** How to test compliance with this rule.

**Delegación:** Which Level IV document(s) receive the implementation mandate.
```

---

## 2. Nature of Knowledge

### R-KM-001 — Knowledge is the organized epistemic state

**Enunciado:** Knowledge is the organized body of Beliefs, Evidence references, active
Hypotheses, and Commitments that the system holds at a given moment, structured by
their semantic relationships. It is the system's internal model of the world.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §3.6 (Knowledge definition: "that which the
system holds to be true at a given moment, composed of beliefs, data, and models");
SYSTEM_VOCABULARY.md §6.1 (Knowledge State: "complete set of Beliefs, Evidence, active
Hypotheses, and current Commitments"); CONSTITUTION.md §3.5.4 ("The system's knowledge
is provisional").

**Justificación:** Knowledge is not a single thing — it is an organized aggregate. The
system knows that "the origin is Asunción" not as an isolated fact but as part of a
network: it knows because the user said so (Evidence), it knows with some Certainty,
it knows in the context of a conversation, it knows that this Belief relates to other
Beliefs about the trip. Knowledge is the entire organized structure, not any single
element.

**Implicaciones Cognitivas:**
- Knowledge is always structured, never atomic.
- The structure includes: what the system believes, why it believes it, how strongly,
  and how each belief relates to others.
- Knowledge is the system's complete epistemic state at a moment in time.

**Impacto Conversacional:** El sistema responde con coherencia porque no maneja datos
aislados sino un modelo integrado: sabe el origen, el destino, la tarifa, y cómo se
relacionan. El usuario no repite información porque el sistema retiene la estructura
completa, no piezas sueltas.

**Verificación:** ¿Existe algún elemento cognitivo (Belief, Evidence, Hypothesis,
Commitment) que opere fuera de la estructura organizada del Knowledge State? Si sí
→ violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define cómo se estructura el Knowledge State
en el Ciclo Cognitivo).

---

### R-KM-002 — Knowledge is provisional

**Enunciado:** All Knowledge held by the system is provisional. No Belief, no
Hypothesis, no Commitment is permanent. Every element of the Knowledge State is subject
to revision when new Evidence arrives.

**Derivación Constitucional:** CONSTITUTION.md §3.5.4 ("The system's knowledge is
provisional — all Beliefs are subject to revision when new Evidence arrives");
CONSTITUTION.md §3.1 (Inaccessibility of Truth); P-E4 (Revisability).

**Justificación:** The system does not have access to Truth. It operates on an
evidence-based model of the world. Since new Evidence can always arrive, the Knowledge
State must always be revisable. Knowledge that cannot be revised is indistinguishable
from dogma, and dogma is incompatible with evidence-based operation.

**Implicaciones Cognitivas:**
- No component of the Knowledge State is immune to revision.
- Revision requires new Evidence — the system cannot revise Knowledge without
  epistemic grounds.
- The provisional nature of Knowledge applies to all levels: Beliefs, Hypotheses,
  Commitments, and even what the system "knows" about its own processes.

**Impacto Conversacional:** El sistema se corrige cuando se le proporciona nueva
información. No se aferra a creencias incorrectas. El usuario siente que el sistema
"entiende" cuando le corrige, porque el conocimiento es revisable por diseño.

**Verificación:** ¿Existe algún elemento del Knowledge State que no pueda ser revisado
por llegada de nueva Evidence? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo de revisión por nueva
Evidence).

---

### R-KM-003 — Knowledge is derived from Evidence

**Enunciado:** Every element of the Knowledge State — every Belief, every active
Hypothesis, every Commitment — must be traceable to at least one piece of Evidence in
the Evidence Store. Knowledge without Evidence is not Knowledge; it is speculation.

**Derivación Constitucional:** CONSTITUTION.md §3.2 ("Every Belief must be supported
by Evidence"); S-P1 (Evidence-Based Operation); P-E1 (Evidence over Intuition);
EVIDENCE_MODEL.md R-EM-049 (Evidence Store as foundation of Knowledge State).

**Justificación:** The Evidence Store is the only source of epistemic legitimacy.
If the system holds a Belief without supporting Evidence, that Belief is a guess. If
it makes a Commitment without Evidence, that Commitment is arbitrary. Knowledge must
always have a demonstrable evidentiary foundation.

**Implicaciones Cognitivas:**
- The Evidence Store is the epistemic root of the Knowledge State.
- Every Belief points back to the Evidence that supports it.
- Every Hypothesis is grounded in ambiguous or incomplete Evidence.
- Every Commitment is justified by the accumulated Evidence.

**Impacto Conversacional:** El sistema nunca inventa información. Todo lo que "sabe"
tiene una razón de ser. El usuario puede confiar en que las afirmaciones del sistema
están fundamentadas, no son alucinaciones.

**Verificación:** Seleccionar cualquier Belief activo y verificar que exista al menos
una Evidence en el Evidence Store que lo respalde. Si no → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo Evidence → Knowledge State),
EVIDENCE_MODEL implementation (garantiza que el Evidence Store sea consultable).

---

### R-KM-004 — Knowledge is the single source of cognitive authority

**Enunciado:** The Knowledge State is the single source of all Decisions, Commitments,
Actions, and external communications. No cognitive process may operate on information
that is not part of the Knowledge State.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §6.1 ("The Knowledge State is the SINGLE
source of all decisions. No decision can be based on information not in the Knowledge
State"); CP-27 (Proyección derivada); CP-28 (Proyección de solo lectura).

**Justificación:** If the system could operate on information outside the Knowledge
State, that information would be epistemically unaccountable: it would have no Evidence
trace, no Certainty assessment, no relationship to other Beliefs. This would violate
S-P1 because the system would be making decisions based on unknown foundations.

**Implicaciones Cognitivas:**
- Every cognitive operation reads from the Knowledge State.
- No component can bypass the Knowledge State to access raw input.
- External information (user messages, system events) enters the Knowledge State only
  through the Evidence → Knowledge pipeline.

**Impacto Conversacional:** El sistema opera con consistencia porque toda decisión se
basa en el mismo cuerpo de conocimiento. No hay decisiones "sorpresa" que ignoren lo
que el sistema ya sabe.

**Verificación:** ¿Existe alguna ruta cognitiva que tome decisiones basadas en
información fuera del Knowledge State? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el Knowledge State como único
input/output del Ciclo Cognitivo).

---

## 3. Knowledge vs. Evidence, Belief, Certainty, Data

### R-KM-005 — Knowledge vs. Evidence

**Enunciado:** Evidence is the immutable, atomic record of a perceived Fact with its
Source and Confidence. Knowledge is the interpreted, aggregated, structured state
derived from Evidence. Evidence is the raw material; Knowledge is the refined product.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §5.1 (Evidence: "recorded set of Facts, each
with its Source and Confidence"); SYSTEM_VOCABULARY.md §3.6 (Knowledge: "that which the system
holds to be true at a given moment, composed of beliefs, data, and models");
EVIDENCE_MODEL.md R-EM-049 (Evidence Store as persistent foundation of Knowledge
State).

**Justificación:** Evidence and Knowledge operate at different levels of abstraction.
Evidence is persistent, immutable, and atomic — a single recorded Fact. Knowledge is
volatile, interpretative, and structured — what the system currently believes given all
the Evidence it has. The distinction prevents conflating "what was perceived" with
"what is believed."

**Implicaciones Cognitivas:**
- Evidence exists independently of interpretation.
- Knowledge is the system's current interpretation of all accumulated Evidence.
- Evidence can be complete while Knowledge is incomplete (the system has data but
  hasn't integrated it).
- Knowledge can be revised without modifying Evidence (new interpretation of existing
  Facts).

**Impacto Conversacional:** El sistema distingue entre "lo que el usuario dijo" y
"lo que el sistema entiende." Cuando hay ambigüedad, el sistema sabe que tiene
Evidence (las palabras del usuario) pero no tiene Knowledge (no sabe qué significan).
Esto produce respuestas más honestas: "Entiendo lo que dijo pero necesito más
contexto."

**Verificación:** ¿Existe algún caso donde el sistema trate una Evidence como
conocimiento definitivo no revisable? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define la naturaleza inmutable de la Evidence),
COGNITIVE_ARCHITECTURE.md (define la integración Evidence → Knowledge).

---

### R-KM-006 — Knowledge vs. Belief

**Enunciado:** A Belief is a proposition held with Certainty within the Knowledge
State. Knowledge is the complete organized body of all Beliefs plus their supporting
Evidence references, active Hypotheses, and Commitments. A Belief is a unit of
Knowledge; Knowledge is the entire epistemic structure.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §5.2 (Belief: "a proposition that the system
holds to be true with a degree of Certainty, based on accumulated Evidence");
SYSTEM_VOCABULARY.md §3.6 (Knowledge: "composed of beliefs, data, and models").

**Justificación:** Treating Knowledge as just "a set of Beliefs" misses the structure
that makes Knowledge useful. A Belief is the "what" — but Knowledge also includes the
"why" (Evidence), the "how confidently" (Certainty), the "what if" (Hypotheses), and
the "what next" (Commitments). Separating Belief from Knowledge allows the system to
reason about its own epistemic structure.

**Implicaciones Cognitivas:**
- Beliefs are the propositional content of Knowledge.
- Knowledge includes meta-information about Beliefs: provenance, certainty,
  relationships.
- One can update a Belief without restructuring Knowledge, but not vice versa.

**Impacto Conversacional:** El sistema no solo sabe "cuál es el origen" — también sabe
"por qué lo cree" y "con qué seguridad." Cuando el usuario pregunta "¿estás seguro?"
el sistema puede responder genuinamente en lugar de afirmar ciegamente.

**Verificación:** ¿Puede el sistema distinguir entre lo que "cree" y la evidencia que
lo respalda? Si no → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define la estructura Belief dentro del
Knowledge State).

---

### R-KM-007 — Knowledge vs. Certainty

**Enunciado:** Certainty is a property of Beliefs within the Knowledge State. Knowledge
is WHAT the system holds; Certainty is HOW STRONGLY it holds it. No Belief exists
without Certainty, and no Certainty exists without a Belief to qualify.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §6.2 (Certainty: "a property of Belief");
CERTAINTY_CALCULUS.md R-CC-001 (Certainty is a property of every Belief);
CONSTITUTION.md §3.3.1 (every Belief carries a Certainty value).

**Justificación:** Certainty and Knowledge are inseparable but distinct. Confusing them
leads to two errors: treating high Certainty as Truth (epistemic overreach) or treating
Knowledge as Certainty (reducing what the system knows to just a number). Certainty
qualifies Knowledge; it does not replace it.

**Implicaciones Cognitivas:**
- Every Belief in the Knowledge State carries a Certainty.
- Certainty is derived from Evidence via the Certainty Calculus.
- Knowledge without Certainty is not actionable — the system cannot decide how to use it.
- Certainty without Knowledge (a number without a proposition) is meaningless.

**Impacto Conversacional:** El sistema comunica su conocimiento con el nivel apropiado
de confianza. No dice "sé que es Asunción" cuando su Certeza es 0.6 — dice "parece ser
Asunción." La gradación natural de la confianza se refleja en el lenguaje.

**Verificación:** ¿Existe algún Belief en el Knowledge State que no tenga una Certainty
asociada? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS.md (define cómo se asigna y mantiene la Certainty
de cada Belief en el Knowledge State).

---

### R-KM-008 — Knowledge vs. Data

**Enunciado:** Data is a structured subset of Knowledge that conforms to a schema.
All Data is Knowledge, but not all Knowledge is Data. Heuristics, inferred relationships,
active Hypotheses, and context-dependent interpretations are Knowledge without being Data.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §3.7 (Data: "structured information that the
system can store and retrieve"; "is-a: Knowledge"; "Data is a subset of Knowledge");
SYSTEM_VOCABULARY.md §3.6 (Knowledge: "composed of beliefs, data, and models").

**Justificación:** If Knowledge were equated with Data, the system would only be able
to express what fits in schemas. Inferred knowledge (e.g., "the user might be going
to the airport because they mentioned a flight"), tentative interpretations, and
relational knowledge are all valid Knowledge that may not fit a rigid schema.

**Implicaciones Cognitivas:**
- Schema-conforming Knowledge is Data; schema-free Knowledge is not.
- The system must handle both Data and non-Data Knowledge.
- Decisions can use non-Data Knowledge but must flag it appropriately.

**Impacto Conversacional:** El sistema aprovecha conocimiento que no cabe en esquemas
rígidos — como inferencias, contexto, y relaciones sutiles. La conversación se siente
más natural porque el sistema usa "sentido común" además de datos estructurados.

**Verificación:** ¿Existe algún mecanismo que impida al sistema mantener conocimiento
que no quepa en un esquema predefinido? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define la representación de conocimiento no
estructurado en el Knowledge State).

---

## 4. Knowledge State Architecture

### R-KM-009 — The Knowledge State has two layers: Active and Archive

**Enunciado:** The Knowledge State is conceptually organized into two layers:
(1) **Active Knowledge** — the set of Beliefs, Evidence references, active Hypotheses,
and Commitments that are immediately available for cognitive processing; and
(2) **Archived Knowledge** — preserved Knowledge that has been moved out of active
processing but remains recoverable.

**Derivación Constitucional:** CP-30 (Preservación del estado cognitivo — el sistema
debe preservar su Knowledge State a través de los ciclos); CP-31 (Archivo por relevancia
— la información puede archivarse cuando su relevancia es baja).

**Justificación:** The system accumulates Knowledge over time. Not all Knowledge is
needed for every cognitive cycle. Having two layers allows the system to operate
efficiently on what matters now while preserving what may matter later. This is not a
storage optimization — it is a cognitive necessity: the system cannot deliberate over
all Knowledge it has ever acquired in every cycle.

**Implicaciones Cognitivas:**
- Active Knowledge is the operational Knowledge State used in each Cognitive Cycle.
- Archived Knowledge is preserved but not loaded into active processing by default.
- Transfer between layers is governed by relevance, not by time alone.
- Archiving does not delete or modify Knowledge — it relocates it.

**Impacto Conversacional:** El sistema responde rápidamente porque solo procesa el
conocimiento relevante para la conversación actual. Pero si el usuario retoma un tema
anterior, el sistema puede recuperar el contexto archivado. La conversación se siente
fluida sin perder memoria de largo plazo.

**Verificación:** ¿Existe algún escenario donde conocimiento relevante para el ciclo
actual esté fuera de la capa activa? Si sí → violación en el mecanismo de activación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo de activación/archivo entre
capas).

---

### R-KM-010 — Active Knowledge is recomputed, not cached

**Enunciado:** Active Knowledge is a derived state, recomputed at the beginning of each
Cognitive Cycle from the Evidence Store and Archived Knowledge. It is not a persistent
cache that survives independently of its sources.

**Derivación Constitucional:** CP-29 (Reconstrucción desde Evidence — el Knowledge
State debe poder reconstruirse desde el Evidence Store); CP-30 (el ciclo N comienza
con el Knowledge State del ciclo N-1).

**Justificación:** If Active Knowledge were treated as an independent persistent state,
it could diverge from the Evidence that grounds it. The system must ensure that Active
Knowledge always reflects the current Evidence. Recomputation guarantees this without
requiring explicit synchronization mechanisms.

**Implicaciones Cognitivas:**
- Each Cognitive Cycle starts with a fresh recomputation of Active Knowledge.
- The recomputation uses: Evidence Store, Archived Knowledge, and the previous
  Cognitive Cycle's output (Commitments, Projections).
- The recomputation is deterministic given the same inputs.
- Performance optimizations (e.g., partial recomputation) are permitted only if they
  produce identical results.

**Impacto Conversacional:** El sistema nunca opera con información desactualizada.
Cada interacción comienza con el estado de conocimiento más reciente. El usuario no
experimenta contradicciones como "antes sabías que mi origen era X" porque el
conocimiento siempre está actualizado.

**Verificación:** ¿Existe algún escenario donde Active Knowledge refleje un estado
anterior que no sea consistente con el Evidence Store actual? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el proceso de recomputación del
Active Knowledge).

---

### R-KM-011 — The Knowledge State includes six conceptual components

**Enunciado:** The Knowledge State, in both its Active and Archive layers, is composed
of six conceptual components:

1. **Beliefs** — propositions held with Certainty, each traced to supporting Evidence.
2. **Evidence references** — pointers to the Evidence Store entries that ground each
   Belief.
3. **Active Hypotheses** — propositions under evaluation, with their supporting and
   contradicting Evidence.
4. **Commitments** — promises made (informational or operational) that constrain
   future actions.
5. **Semantic relationships** — the network of connections between Beliefs
   (implication, exclusion, refinement, dependence, corroboration).
6. **Temporal context** — the temporal scope of each Knowledge element (when it was
   formed, when it was last confirmed, when it expires).

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §6.1 (Knowledge State: "complete set of
Beliefs, Evidence, active Hypotheses, and current Commitments"); CERTAINTY_CALCULUS.md
R-CC-021 (propagación a través de relaciones semánticas); CP-30 (contenido del
Knowledge State).

**Justificación:** These six components are necessary and sufficient for the system to
reason about the world. Beliefs provide the "what." Evidence references provide the
"why." Hypotheses provide the "what if." Commitments provide the "what next."
Semantic relationships provide the "how connected." Temporal context provides the
"when."

**Implicaciones Cognitivas:**
- Each component has distinct lifecycle rules defined in its governing document.
- Components are interdependent: removing a Belief affects Commitments that depend on
  it; adding Evidence may create new Hypotheses.
- The system must maintain the integrity of all six components across cycles.

**Impacto Conversacional:** El sistema tiene una comprensión rica y multidimensional
de la conversación. No solo sabe los valores de los slots — sabe cómo se relacionan,
por qué los cree, qué alternativas considera, y qué ha prometido hacer. Esto permite
respuestas naturalmente contextualizadas.

**Verificación:** ¿El Knowledge State puede expresar los seis componentes? Si alguno
no tiene representación → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define la representación de cada componente).

---

## 5. Birth of Knowledge

### R-KM-012 — Knowledge is born from Evidence

**Enunciado:** Knowledge enters the Knowledge State exclusively through Evidence. A
Signal is received, transformed into an Observation, from which Facts are extracted.
These Facts become Evidence in the Evidence Store. Only then can they contribute to
Knowledge.

**Derivación Constitucional:** EVIDENCE_MODEL.md R-EM-001 (Signal → Observation →
Fact → Evidence pipeline); R-EM-049 (Evidence Store as foundation of Knowledge
State); CP-05 (Evidence pipeline).

**Justificación:** The Evidence pipeline is the only epistemically valid path for new
Knowledge. Bypassing it would mean the system "knows" something that has no evidentiary
foundation — a guess. The birth of Knowledge must be traceable to a specific input
event.

**Implicaciones Cognitivas:**
- Knowledge cannot be injected directly into the Knowledge State.
- Every piece of Knowledge has a birth certificate: the Evidence that created it.
- Knowledge born from multiple Evidence items tracks all of them.

**Impacto Conversacional:** El sistema recuerda el origen de cada cosa que sabe.
Cuando el usuario pregunta "¿por qué crees que voy al aeropuerto?" el sistema puede
responder "porque mencionaste un vuelo." La transparencia genera confianza.

**Verificación:** Seleccionar cualquier Belief en el Knowledge State y verificar que
exista una cadena ininterrumpida hasta una Evidence del Evidence Store. Si no →
violación.

**Delegación:** EVIDENCE_MODEL.md (define el pipeline Signal → Observation → Fact →
Evidence).

---

### R-KM-013 — Knowledge can be born from a single Evidence or from aggregation

**Enunciado:** A Belief may be formed from a single piece of Evidence (sufficiently
strong) or from the aggregation of multiple Evidence items that corroborate each other.
The birth mechanism depends on the Certainty achieved, not on the number of Evidence
items.

**Derivación Constitucional:** EVIDENCE_MODEL.md R-EM-042 (aggregation of Evidence
produces Certainty); CERTAINTY_CALCULUS.md (agregación de certeza desde múltiples fuentes).

**Justificación:** One strong Evidence (e.g., "I am at the airport" — DirectExtraction,
high Confidence) can be sufficient to form a Belief. Multiple weak Evidence items
(e.g., user mentioned "flight" and "terminal" and "gate") can also aggregate to form
the same Belief. The system does not require a minimum number of Evidence items.

**Implicaciones Cognitivas:**
- A Belief traces back to one or more Evidence items.
- The aggregation function is monotonic: more Evidence never reduces the Certainty
  of a Belief (though it may change relative Certainty between competing Beliefs).
- The Knowledge State records whether a Belief was formed by single Evidence or
  aggregation.

**Impacto Conversacional:** El sistema es flexible: puede formar una creencia con una
sola afirmación clara del usuario o con múltiples pistas sutiles. No exige
información redundante, pero tampoco ignora corroboración.

**Verificación:** ¿Puede el sistema formar una Belief válida usando una sola Evidence
de alta confianza? ¿Puede formarla agregando múltiples Evidence de baja confianza? Si
no a ambas → violación.

**Delegación:** CERTAINTY_CALCULUS.md (define la agregación para formación de Beliefs).

---

### R-KM-014 — Knowledge birth creates a knowledge record

**Enunciado:** When a Belief enters the Knowledge State, a knowledge record is created
that includes: the proposition, the supporting Evidence references, the initial
Certainty, the birth time (Cognitive Cycle), the Source types, and the initial semantic
relationships with existing Beliefs.

**Derivación Constitucional:** CP-30 (preservación del estado cognitivo); EVIDENCE_MODEL.md
R-EM-049 (Knowledge State structure); CONSTITUTION.md P-I5 (Auditability).

**Justificación:** Without a birth record, Knowledge has no provenance. The system would
not be able to explain why it believes what it believes, when it started believing it,
or how the Belief relates to other Knowledge. This violates P-I5 and prevents effective
error correction.

**Implicaciones Cognitivas:**
- Every Belief has a birth record with timestamp and cycle ID.
- Initial semantic relationships are computed at birth (e.g., "origin" and "destination"
  are mutually exclusive when referring to the same location).
- The birth record is immutable; corrections create new records.

**Impacto Conversacional:** El sistema puede explicar la historia de su conocimiento.
"Supe que el origen era el aeropuerto desde que usted dijo 'voy al aeropuerto' en el
mensaje anterior." Esta trazabilidad hace que el sistema sea comprensible y
auditable.

**Verificación:** ¿Existe algún Belief en el Knowledge State que no tenga registro de
nacimiento completo? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define la estructura del registro de
nacimiento).

---

### R-KM-015 — Knowledge cannot be born from internal generation without Evidence

**Enunciado:** The system cannot generate new Knowledge through internal processes
(reasoning, inference, deduction) without basing that generation on Evidence. Every
inferred Belief must be traceable to at least one Evidence item that justifies the
inference.

**Derivación Constitucional:** CP-13 (Hipótesis múltiples — las hipótesis se generan
desde Evidence disponible); CP-15 (Fusión conservadora — la fusión debe preservar
información); S-P1 (Evidence-Based Operation).

**Justificación:** Inference is a valid cognitive operation, but an inference that
creates new Knowledge must have a clear evidentiary basis. For example, inferring
"the user is going to the airport" from "the user mentioned a flight" is valid because
there is Evidence ("mentioned a flight"). Inferring it without any Evidence is
speculation.

**Implicaciones Cognitivas:**
- Inferred Knowledge is labeled as such, with the inference chain documented.
- The Evidence that grounds the inference is the first link in the chain.
- Pure deduction from existing Beliefs (e.g., "if origin = A and destination ≠ A,
  then the trip is not circular") does not require new Evidence but must be traced
  to the Evidence that grounds the premises.

**Impacto Conversacional:** El sistema distingue entre información que el usuario
dio explícitamente e información que el sistema infirió. "Usted me dijo que va al
aeropuerto" vs. "Como mencionó un vuelo, asumo que va al aeropuerto." Esta
distinción es clave para la transparencia.

**Verificación:** ¿Existe algún Belief inferido cuya cadena de inferencia no sea
completamente trazable a Evidence? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el proceso de inferencia y su
trazabilidad).

---

## 6. Knowledge Types

### R-KM-016 — Propositional Knowledge

**Enunciado:** Propositional Knowledge is Knowledge that the system holds about a
specific fact or state of affairs: "the origin is Asunción," "the user wants a
transfer," "the price is 50,000 Gs." It is Knowledge **that** something is the case.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §5.2 (Belief definition); SYSTEM_VOCABULARY.md §3.6
(Knowledge definition); CONSTITUTION.md §3.2 (Evidence-based Beliefs).

**Justificación:** Propositional Knowledge is the most fundamental type — it is what
the system believes about the world. All other Knowledge types (relational, procedural,
etc.) depend on or refine Propositional Knowledge.

**Implicaciones Cognitivas:**
- Propositional Knowledge is expressed as a proposition with a truth value (degree of
  Certainty).
- Every Belief in the Knowledge State is a unit of Propositional Knowledge.
- Propositional Knowledge is the primary input to Decisions.

**Impacto Conversacional:** El sistema sabe hechos concretos sobre el usuario y el
viaje. "Sé que su origen es San Lorenzo y su destino el aeropuerto." Afirma hechos
con precisión.

**Verificación:** ¿Todo Belief en el Knowledge State es expresable como una
proposición? Si no → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define la representación de Propositional
Knowledge).

---

### R-KM-017 — Relational Knowledge

**Enunciado:** Relational Knowledge is Knowledge about how propositions relate to each
other: implication (A implies B), exclusion (A and B cannot both be true), refinement
(B is a more specific type of A), dependence (B requires A), corroboration (A and B
point to the same conclusion), and temporal ordering (A precedes B).

**Derivación Constitucional:** CERTAINTY_CALCULUS.md R-CC-021 (tabla de relaciones
semánticas); CP-13 (Hipótesis múltiples); SYSTEM_VOCABULARY.md §6.5 (Hypothesis Network).

**Justificación:** The system does not just hold isolated facts — it organizes them
into a network of relationships. Relational Knowledge is what makes the Knowledge
State more than a bag of Beliefs. It enables the system to reason, to propagate
Certainty, and to detect contradictions.

**Implicaciones Cognitivas:**
- Relational Knowledge is part of the semantic relationships component of the
  Knowledge State.
- Relationships are first-class Knowledge elements, not metadata.
- When a Belief is added, its relationships to existing Beliefs are computed.
- When a Belief is removed, its relationships are removed with it.

**Impacto Conversacional:** El sistema entiende cómo se relacionan los conceptos. Sabe
que "origen" y "destino" no pueden ser el mismo lugar, que "aeropuerto" implica
"vuelo," que "recogerme en casa" y "llevarme al trabajo" son dos etapas del mismo
viaje. Esto permite respuestas lógicamente coherentes.

**Verificación:** ¿Existe algún par de Beliefs relacionados semánticamente cuya
relación no esté representada en el Knowledge State? Si sí → violación (la relación
debe ser computable).

**Delegación:** CERTAINTY_CALCULUS.md (define la propagación a través de relaciones),
COGNITIVE_ARCHITECTURE.md (define el cómputo de relaciones entre Beliefs).

---

### R-KM-018 — Contextual Knowledge

**Enunciado:** Contextual Knowledge is Knowledge that is valid only within a specific
context: a conversation session, a user interaction, a particular situation. It
includes the current conversation's history, detected intents, user preferences
expressed in this session, and situational parameters.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §11.3 (Conversation Memory); CP-30 (el
Knowledge State incluye contexto conversacional del ciclo actual); CP-04 (límite
temporal del ciclo cognitivo).

**Justificación:** Not all Knowledge is universally valid. "The user wants to go to
the airport" is true in this conversation but not in the next one. Contextual Knowledge
allows the system to maintain situation-specific understanding without confusing it
with permanent Knowledge.

**Implicaciones Cognitivas:**
- Contextual Knowledge has a scope: the conversation session or interaction.
- Contextual Knowledge is automatically archived when the context ends.
- Contextual Knowledge can override Propositional Knowledge within its scope.
- Contextual Knowledge is tagged with its scope identifier.

**Impacto Conversacional:** El sistema recuerda el contexto de la conversación actual
sin confundirlo con conocimiento general. "En esta conversación usted dijo que va al
aeropuerto, pero en general sabemos que usted viaja frecuentemente al centro." La
conversación se siente personalizada sin ser invasiva.

**Verificación:** ¿Existe algún Knowledge que dependa del contexto actual pero que no
tenga un identificador de alcance? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el ámbito contextual de cada elemento
de Knowledge), CHANNEL_ADAPTER.md (define los límites del contexto conversacional).

---

### R-KM-019 — Episodic Knowledge

**Enunciado:** Episodic Knowledge is Knowledge about past Cognitive Cycles, Outcomes,
and system events — the system's memory of its own history. It includes what happened,
what was decided, what was committed, and what resulted.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §11.5 (Episodic Memory: "record of past
Cognitive Cycles, Outcomes, and system events"); CP-37 (Outcome feedback); CP-38
(Learning from outcomes).

**Justificación:** The system learns from its own experience. To learn, it must
remember what happened. Episodic Knowledge provides the raw material for Learning:
patterns of success and failure, user behavior over time, operational outcomes.

**Implicaciones Cognitivas:**
- Episodic Knowledge is append-only and immutable (like Evidence).
- Each Cognitive Cycle produces an Episodic Knowledge record.
- Episodic Knowledge feeds the Learning process.
- Episodic Knowledge is not used for real-time decisions (it is too slow).

**Impacto Conversacional:** El sistema mejora con el uso porque recuerda interacciones
pasadas. No solo responde a la conversación actual — ha aprendido de cientos de
conversaciones anteriores. El usuario se beneficia de un sistema que "cada vez funciona
mejor."

**Verificación:** ¿El sistema preserva un registro de cada Ciclo Cognitivo completado?
Si no → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el registro episódico),
KNOWLEDGE_MODEL implementation (define la persistencia episódica).

---

### R-KM-020 — Semantic Knowledge

**Enunciado:** Semantic Knowledge is Knowledge about the world that does not depend on
specific episodes or conversations: geography, business rules, pricing logic,
operational models, policy templates. It is what the system "knows" before any
conversation begins.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §11.6 (Semantic Memory: "the system's general
knowledge about the world"); CP-30 (el Knowledge State persiste entre ciclos e incluye
conocimiento semántico).

**Justificación:** AITOS is a transportation operating system. It must know about
Asunción's geography, about tariff rules, about operational procedures — independently
of any specific trip. Semantic Knowledge is the baseline expertise that makes AITOS
useful from the first interaction.

**Implicaciones Cognitivas:**
- Semantic Knowledge is modified through deployment, not through runtime operation.
- Semantic Knowledge serves as the default when Contextual Knowledge is absent.
- Semantic Knowledge is persistent and shared across all conversations.
- Changes to Semantic Knowledge require engineering review.

**Impacto Conversacional:** El sistema es experto desde el primer mensaje. Sabe
distancias, tarifas, zonas, y reglas de negocio sin necesidad de "aprenderlas" en
cada conversación. El usuario recibe respuestas precisas e informadas inmediatamente.

**Verificación:** ¿Existe conocimiento del dominio (tarifas, geografía, reglas) que el
sistema deba poseer pero no esté en Semantic Knowledge? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL implementation (define la representación de Semantic
Knowledge).

---

### R-KM-021 — Procedural Knowledge

**Enunciado:** Procedural Knowledge is Knowledge about how to do things: operational
processes, decision protocols, escalation procedures, business workflows. It is
Knowledge **how**, not Knowledge **that**.

**Derivación Constitucional:** CP-01 (Ciclo Cognitivo completo); SYSTEM_VOCABULARY.md §12.2
(Action); SYSTEM_VOCABULARY.md §7.5 (Projection Phase).

**Justificación:** The system needs to know not just facts but procedures. How to
create a trip, how to dispatch a driver, how to escalate to a human operator, how to
handle a cancellation. Procedural Knowledge translates Propositional Knowledge into
action.

**Implicaciones Cognitivas:**
- Procedural Knowledge is part of the Knowledge State.
- It is invoked by Decisions to execute Commitments.
- It is modified through deployment (like Semantic Knowledge) or through Learning
  (for adaptive procedures).

**Impacto Conversacional:** El sistema sabe qué hacer con la información que recibe.
No solo entiende "el usuario quiere un viaje" — sabe cómo crear ese viaje, qué
información necesita, y qué pasos seguir. La conversación progresa sin titubeos
porque el sistema conoce el procedimiento.

**Verificación:** ¿Existe alguna operación que el sistema realice sin que haya un
Procedural Knowledge que la guíe? Si sí → violación.

**Delegación:** ACTION_EXECUTOR.md (define la ejecución de Procedural Knowledge),
COGNITIVE_ARCHITECTURE.md (define la invocación de procedimientos).

---

## 7. Temporal Knowledge

### R-KM-022 — All Knowledge has a temporal scope

**Enunciado:** Every element of the Knowledge State has a temporal scope: when it was
born, when it was last confirmed, when it expires (if applicable), and during which
time window it is valid.

**Derivación Constitucional:** CP-04 (límite temporal del ciclo cognitivo); CP-18
(certidumbre continua — la certidumbre decae sin confirmación); CP-20 (actualización
por Evidence).

**Justificación:** Knowledge without temporal scope is timeless, and timeless Knowledge
is dangerous. "The user wanted to go to the airport" is true at 10:00 but may be false
at 10:30. If the system does not track when Knowledge was acquired and when it expires,
it will act on stale information. Temporal scope is not metadata — it is constitutive
of Knowledge.

**Implicaciones Cognitivas:**
- Temporal scope includes: birth time, last confirmation time, expiry time, validity
  window.
- Knowledge expires if not reconfirmed within its validity window.
- Expired Knowledge is archived or marked STALE, not deleted.
- Temporal scope affects Certainty: older unconfirmed Knowledge has lower Certainty.

**Impacto Conversacional:** El sistema es consciente del tiempo. Sabe que "el usuario
dijo que iba al aeropuerto hace 10 minutos" es diferente de "el usuario lo dijo hace
3 horas." La conciencia temporal evita que el sistema actúe sobre información
desactualizada.

**Verificación:** ¿Existe algún elemento del Knowledge State que no tenga alcance
temporal completo? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el registro temporal de cada elemento),
CERTAINTY_CALCULUS.md (define la degradación temporal de la certidumbre).

---

### R-KM-023 — Knowledge has a validity window

**Enunciado:** Each type of Knowledge has a validity window — a period during which
the Knowledge is considered potentially current. The validity window varies by
Knowledge type: contextual Knowledge (conversation session), Propositional Knowledge
(until contradicted or expired), Semantic Knowledge (permanent, until revised by
deployment).

**Derivación Constitucional:** CP-31 (archivo por relevancia — incluye edad como
criterio); CERTAINTY_CALCULUS.md R-CC-010 (degradación de certeza por tiempo);
SYSTEM_VOCABULARY.md §11.3 (Conversation Memory retention).

**Justificación:** Different types of Knowledge have different shelf lives. A user's
statement in a conversation is valid for minutes or hours; a business rule is valid
for months or years. Applying a single validity window to all Knowledge would either
prematurely archive important Knowledge or retain stale Knowledge too long.

**Implicaciones Cognitivas:**
- Validity windows are defined per Knowledge type, not per instance.
- Within the validity window, Knowledge is ACTIVE.
- Outside the validity window, Knowledge is STALE and requires reconfirmation.
- Semantic Knowledge has indefinite validity (until deployment).

**Impacto Conversacional:** El sistema no retiene información más tiempo del
apropiado. No asume que una preferencia expresada hace semanas sigue siendo válida,
pero tampoco olvida lo que el usuario dijo hace cinco minutos.

**Verificación:** ¿Existe algún tipo de Knowledge sin una ventana de validez definida?
Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define ventanas de validez por tipo).

---

### R-KM-024 — Knowledge state at time T is reconstructible

**Enunciado:** The Knowledge State as it existed at any past time T must be
reconstructible from the Evidence Store and the archive of Knowledge records. This
is required for audit, error analysis, and learning.

**Derivación Constitucional:** CONSTITUTION.md P-I5 (Auditability); CP-29 (reconstrucción
desde Evidence); S-P6 (Knowledge Preservation).

**Justificación:** If the system cannot reconstruct what it knew at the time it made
a decision, it cannot audit that decision. Temporal reconstruction enables the system
to answer questions like "what did we know when we dispatched that driver?" without
relying on imperfect memory.

**Implicaciones Cognitivas:**
- The Evidence Store and archived Knowledge records constitute a temporal database.
- Reconstruction of past Knowledge State is a read-only operation.
- Reconstruction must be deterministic: given the same inputs, same result.

**Impacto Conversacional:** El sistema puede explicar decisiones pasadas con precisión.
Si un usuario reclama "¿por qué me enviaron el conductor equivocado?" el sistema puede
responder "en ese momento, sabíamos que su ubicación era X porque usted dijo Y."
La auditabilidad genera confianza.

**Verificación:** ¿Puede el sistema reconstruir qué Beliefs tenía activas en un ciclo
anterior específico? Si no → violación.

**Delegación:** EVIDENCE_MODEL.md (define la estructura temporal del Evidence Store),
COGNITIVE_ARCHITECTURE.md (define el proceso de reconstrucción temporal).

---

## 8. Contextual Knowledge

### R-KM-025 — Contextual Knowledge is scoped to a conversation session

**Enunciado:** Contextual Knowledge is Knowledge that belongs to a specific conversation
session between the system and a user. It is created within the session, is valid only
within the session, and is archived when the session ends.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §11.3 (Conversation Memory: "per-phone,
created when first message arrives, destroyed after inactivity timeout"); CP-30 (el
Knowledge State incluye contexto conversacional del ciclo actual).

**Justificación:** Conversations are independent epistemic events. What a user says in
one conversation should not automatically carry over to another conversation (unless
specifically learned as user preference). Scoping prevents cross-conversation contamination.

**Implicaciones Cognitivas:**
- Contextual Knowledge is tagged with a session identifier.
- The Cognitive Cycle within a session can access that session's Contextual Knowledge.
- A new session starts with only Semantic Knowledge and learned user preferences, not
  the previous session's Contextual Knowledge.

**Impacto Conversacional:** Cada conversación es independiente pero no parte de cero.
El sistema recuerda la conversación actual sin mezclarla con otras. Si el usuario
habla de un viaje hoy y otro mañana, el sistema no confunde los detalles.

**Verificación:** ¿Puede el contexto de una conversación contaminar el conocimiento
de otra conversación? Si sí → violación.

**Delegación:** CHANNEL_ADAPTER.md (define los límites de sesión), COGNITIVE_ARCHITECTURE.md
(define el aislamiento contextual entre sesiones).

---

### R-KM-026 — Contextual Knowledge overrides Semantic Knowledge within its scope

**Enunciado:** When Contextual Knowledge and Semantic Knowledge conflict within the
scope of a conversation, Contextual Knowledge prevails for that conversation. Semantic
Knowledge provides the default; Contextual Knowledge provides the specific.

**Derivación Constitucional:** CP-30 (el Knowledge State del ciclo incluye contexto
conversacional); R-KM-018 (Contextual Knowledge).

**Justificación:** A user may have preferences that differ from the system's defaults.
"If the user says they want to go to 'centro,' and the default assumption is 'Centro
de Asunción,' but the user is in Encarnación, the Contextual Knowledge (user's
location) should override the Semantic default." Contextual Knowledge represents
situation-specific truth.

**Implicaciones Cognitivas:**
- Semantic Knowledge is the baseline.
- Contextual Knowledge overrides within its session scope.
- Overriding does not modify Semantic Knowledge — it only affects this session.
- When Contextual Knowledge is removed (session ends), Semantic Knowledge is restored
  as the default.

**Impacto Conversacional:** El sistema se adapta al contexto específico de cada
conversación sin perder su conocimiento general. Si el usuario siempre va al centro
pero hoy dice "aeropuerto," el sistema no insiste con el centro.

**Verificación:** ¿Puede Contextual Knowledge contradecir Semantic Knowledge sin que
prevalezca en su ámbito? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define las reglas de precedencia entre
tipos de conocimiento).

---

### R-KM-027 — Contextual Knowledge is archived, not discarded, at session end

**Enunciado:** When a conversation session ends (timeout, explicit close), the
Contextual Knowledge is not deleted. It is archived as an Episodic Knowledge record
with the session metadata. It may be retrieved for learning or audit.

**Derivación Constitucional:** CP-31 (archivo por relevancia — preservación, no
eliminación); S-P6 (Knowledge Preservation); SYSTEM_VOCABULARY.md §11.5 (Episodic Memory).

**Justificación:** A conversation session contains valuable information about user
behavior, system performance, and decision outcomes. Discarding it at session end
would lose this information, violating S-P6. Archiving preserves it for Learning
while removing it from active processing.

**Implicaciones Cognitivas:**
- Session end triggers archiving of Contextual Knowledge.
- Archived sessions are recoverable but not active.
- Learning processes can scan archived sessions for patterns.

**Impacto Conversacional:** El sistema aprende de todas las conversaciones, no solo
de la actual. Cada interacción contribuye a mejorar el servicio, aunque esa
conversación específica ya haya terminado.

**Verificación:** ¿Existe algún escenario donde una sesión termine y su contexto se
pierda irreversiblemente? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el proceso de archivo al fin de
sesión).

---

## 9. Knowledge Composition and Inheritance

### R-KM-028 — Knowledge composes hierarchically

**Enunciado:** Knowledge elements can compose into higher-order Knowledge structures.
A trip Belief (origin, destination, time, price) is composed of simpler Beliefs.
The composed structure inherits properties from its components and adds emergent
properties.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §9.1 (Operational Model as schema);
SYSTEM_VOCABULARY.md §9.2 (Operational Projection as instantiation); CP-15 (Fusión
conservadora).

**Justificación:** The system reasons at multiple levels of abstraction. It needs to
know both "the user said 'airport'" (atomic Belief) and "the trip is confirmed"
(composed Knowledge). Composition allows the system to manage complexity by grouping
related Knowledge.

**Implicaciones Cognitivas:**
- Composition is explicit: the Knowledge State records which elements compose which.
- Composed Knowledge inherits the Certainty of its weakest component (but may have
  emergent Certainty from corroboration).
- Composition is not fusion — components remain individually accessible.
- Removing a component may invalidate the composed structure.

**Impacto Conversacional:** El sistema entiende el viaje como un todo integrado, no
como piezas sueltas. Sabe que el origen, destino, fecha y precio son parte del mismo
viaje, y actúa en consecuencia. La comprensión holística permite respuestas más
coherentes.

**Verificación:** ¿Puede el sistema navegar de un Knowledge compuesto a sus
componentes y viceversa? Si no → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define las relaciones de composición en el
Knowledge State).

---

### R-KM-029 — Knowledge inherits Certainty along composition paths

**Enunciado:** When Knowledge is composed hierarchically, Certainty propagates along
the composition paths. A composed Belief's Certainty is a function of its components'
Certainties. The function is conservative: the composed Certainty cannot exceed the
minimum Certainty of its essential components.

**Derivación Constitucional:** CERTAINTY_CALCULUS.md R-CC-021 (propagación por relaciones
semánticas); R-CC-012 (dependencia compositiva: Certainty(B) ≤ Certainty(A) si B
depende de A).

**Justificación:** If a trip Belief depends on knowing the origin and destination,
and the origin has Certainty 0.9 but the destination has Certainty 0.4, the composed
trip Belief should reflect the weaker component. Otherwise, the system would be
confident about a trip that has a highly uncertain destination.

**Implicaciones Cognitivas:**
- Composition inheritance is automatic, not requiring explicit calculation.
- Essential components (those without which the composed Knowledge is invalid) impose
  a ceiling on composed Certainty.
- Non-essential components (optional refinements) do not constrain composed Certainty.

**Impacto Conversacional:** El sistema expresa su confianza en el viaje completo de
manera honesta. "Estoy seguro del origen pero no del destino" se refleja en "tengo
el origen pero necesito confirmar el destino." No afirma el viaje completo si una
parte es incierta.

**Verificación:** ¿Existe algún caso donde un Knowledge compuesto tenga una Certainty
mayor que la de un componente esencial? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS.md (define las reglas de herencia por composición).

---

### R-KM-030 — Contextual Knowledge inherits from Semantic Knowledge defaults

**Enunciado:** When Contextual Knowledge is created without an explicit value, it
inherits the default value from Semantic Knowledge. Semantic Knowledge provides the
baseline; Contextual Knowledge provides the override.

**Derivación Constitucional:** R-KM-026 (Contextual Knowledge overrides Semantic
Knowledge); SYSTEM_VOCABULARY.md §11.6 (Semantic Memory as default knowledge).

**Justificación:** The system must have a default for every parameter. If the user
does not specify a destination, the system should not assume it knows — but it may
have a reasonable default based on the user's history or operational context. The
inheritance ensures the system always has something to work with.

**Implicaciones Cognitivas:**
- Semantic Knowledge acts as a fallback for missing Contextual Knowledge.
- The inheritance is explicit: the Knowledge State records that the value was inherited.
- If Contextual Knowledge later provides an explicit value, it overrides the inherited
  default.

**Impacto Conversacional:** El sistema tiene "sentido común" por defecto. Si el
usuario no especifica una zona, el sistema asume la más probable basada en el
contexto. Pero si el usuario luego especifica otra, el sistema la acepta sin
discutir.

**Verificación:** ¿Existe algún escenario donde el sistema carezca de un valor por
defecto y deba recurrir a adivinar? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el mecanismo de herencia de
defaults).

---

## 10. Knowledge Fragmentation

### R-KM-031 — Knowledge can fragment when Evidence is inconclusive

**Enunciado:** When Evidence is insufficient to resolve ambiguity, the Knowledge State
fragments into multiple competing interpretations. Each fragment contains a set of
Beliefs that are internally consistent but incompatible with other fragments.

**Derivación Constitucional:** CP-13 (Hipótesis múltiples — mantener múltiples hipótesis
simultáneas); SYSTEM_VOCABULARY.md §6.5 (Hypothesis Network).

**Justificación:** Fragmentation is not a failure — it is the correct response to
ambiguity. If the system cannot decide between "the user is going to the airport" and
"the user is going to the bus terminal," the Knowledge State represents both
possibilities. The fragments coexist until Evidence resolves the ambiguity.

**Implicaciones Cognitivas:**
- Each fragment is a self-consistent subset of the Knowledge State.
- Fragments share the Knowledge they agree on (e.g., the user wants a transfer).
- Fragments differ on the Knowledge they disagree on (e.g., destination).
- Fragments have a Certainty that reflects the Evidence for that interpretation.

**Impacto Conversacional:** Cuando el sistema no está seguro, no oculta la ambigüedad
ni elige al azar. Reconoce las alternativas y pide clarificación. "¿Va al aeropuerto
o a la terminal de ómnibus?" La fragmentación es la base cognitiva de la
clarificación.

**Verificación:** ¿Puede el sistema mantener múltiples interpretaciones incompatibles
simultáneamente sin resolver? Si no → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el manejo de fragmentación en el
Knowledge State).

---

### R-KM-032 — Fragments are resolved through Evidence accumulation

**Enunciado:** Fragments are resolved when new Evidence supports one interpretation
over others. Resolution is not elimination: the losing fragment is archived, not
deleted, and may be revisited if new Evidence changes the balance.

**Derivación Constitucional:** CP-14 (Resolución por evidencia); CP-15 (Fusión
conservadora — preservar información de ambas hipótesis); CP-39 (Mejora no destructiva).

**Justificación:** A resolved fragment represents a path the system considered and
rejected. That path may still contain useful information. For example, even after
resolving "the user is going to the airport," the Knowledge that "terminal" was
mentioned remains valuable for specifying which terminal.

**Implicaciones Cognitivas:**
- Resolution selects the dominant fragment for active operation.
- The losing fragment is preserved as Archived Knowledge.
- Information from the losing fragment that is compatible with the winner is
  reintegrated.
- A resolved fragment may be reactivated if contradictory Evidence arrives.

**Impacto Conversacional:** El sistema no descarta información útil cuando resuelve
ambigüedades. Aunque decida que el destino es "aeropuerto," recuerda que mencionó
"terminal" y pregunta "¿terminal nacional o internacional?" La resolución no es
destructiva.

**Verificación:** ¿Algún fragmento perdedor pierde información que podría ser útil?
Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el proceso de resolución de
fragmentos).

---

## 11. Knowledge Evolution and Revision

### R-KM-033 — Knowledge evolves by Evidence addition, not replacement

**Enunciado:** Knowledge evolves when new Evidence is added to the Evidence Store. The
new Evidence may strengthen, weaken, or contradict existing Beliefs. Knowledge is never
modified directly — it is recomputed from the updated Evidence Store.

**Derivación Constitucional:** CP-39 (Mejora no destructiva — agregar conocimiento
nuevo sin destruir conocimiento previo); S-P5 (Evidence Immutability);
EVIDENCE_MODEL.md R-EM-002 (append-only Evidence Store).

**Justificación:** Direct modification of Knowledge would violate the Evidence
Immutability principle because it would allow the system to "know" something different
without new Evidence. Evolution through Evidence addition ensures that all changes are
traceable, justified, and reversible.

**Implicaciones Cognitivas:**
- Knowledge evolution is indirect: add Evidence → recompute Knowledge.
- The system does not "change its mind" — it updates its Knowledge based on new
  Evidence.
- The previous Knowledge state remains reconstructible from the Evidence Store.
- Contradictions are resolved by the Evidence, not by arbitrary choice.

**Impacto Conversacional:** El sistema cambia de opinión de manera transparente. Si
el usuario dice "no, no voy al aeropuerto, voy al centro," el sistema no se contradice
— dice "entiendo, corrigiendo destino a centro." El cambio es explicable y está
fundamentado.

**Verificación:** ¿Existe algún mecanismo que modifique Knowledge directamente sin
pasar por el Evidence Store? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define el proceso de adición de Evidence),
COGNITIVE_ARCHITECTURE.md (define la recomputación por nueva Evidence).

---

### R-KM-034 — Revision requires explicit Evidence

**Enunciado:** Knowledge can only be revised when new Evidence is available that
warrants revision. The system cannot revise Knowledge arbitrarily, speculatively, or
preventively. The Evidence must be relevant to the Belief being revised.

**Derivación Constitucional:** P-E1 (Evidence over Intuition); CP-20 (actualización por
Evidence); CONSTITUTION.md §3.2 (toda Belief debe estar soportada por Evidence).

**Justificación:** Revision without Evidence is not revision — it is guessing. If the
system could revise Knowledge without new Evidence, it could produce arbitrary Beliefs.
Revision must be epistemically grounded: the Evidence that triggers it must have a
logical relationship to the Belief being revised.

**Implicaciones Cognitivas:**
- The Evidence that triggers a revision must be semantically related to the affected
  Beliefs.
- The system identifies affected Beliefs through the semantic relationship network.
- Revision is local: only Beliefs affected by the new Evidence are recomputed.
- Unaffected Beliefs remain unchanged.

**Impacto Conversacional:** El sistema solo cambia lo que debe cambiar. Si el usuario
corrige el destino, el sistema no "olvida" el origen. La revisión es quirúrgica:
solo se modifica lo que la nueva evidencia afecta, preservando el resto.

**Verificación:** ¿Existe algún escenario donde el Knowledge State se revise sin la
llegada de nueva Evidence relevante? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el proceso de revisión basada en
Evidence).

---

### R-KM-035 — Knowledge revision preserves the previous state

**Enunciado:** When Knowledge is revised, the previous Knowledge state is preserved in
the archive. The system does not "forget" what it previously knew — it preserves it
alongside the new revision.

**Derivación Constitucional:** CP-39 (Mejora no destructiva — el conocimiento previo
sigue siendo válido como registro histórico); S-P6 (Knowledge Preservation); S-P5
(Evidence Immutability).

**Justificación:** The previous Knowledge state contains the record of what the system
believed and why. This is essential for audit, learning (what was wrong and why), and
recovery (if the revision was mistaken). Preservation is not archival — it is
epistemic integrity.

**Implicaciones Cognitivas:**
- Each revision creates a new Knowledge state with a reference to the previous state.
- The archive preserves the chain of revisions.
- Revision does not delete — it adds a new perspective.
- The system can "undo" a revision by reverting to the previous state (supported by
  Evidence of the error).

**Impacto Conversacional:** El sistema no olvida lo que sabía antes. Si se corrige
equivocadamente (ej., el usuario dijo "no" pero era "no, gracias" no "no, otro
destino"), el sistema puede recuperar la creencia anterior. La corrección nunca es
destructiva.

**Verificación:** ¿Puede el sistema recuperar el estado de conocimiento anterior a
una revisión? Si no → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el versionado del Knowledge State).

---

## 12. Knowledge Correction

### R-KM-036 — Correction is a special case of revision

**Enunciado:** Correction is a revision triggered by contradictory Evidence that
invalidates a previous Belief. The old Belief is marked as SUPERSEDED, and a new
Belief is formed. The Evidence that caused the correction is linked to both the old
and new Beliefs.

**Derivación Constitucional:** EVIDENCE_MODEL.md R-EM-008 (Contradictory Evidence);
CP-10 (Resolución de conflictos); CP-20 (actualización por Evidence).

**Justificación:** Correction differs from normal revision in that it involves
overturning a previous Belief. The system must handle this carefully: the old Belief
is not deleted (it was valid given the Evidence at the time), but it is superseded.
The Evidence that caused the correction must trace to both old and new Beliefs to
maintain the audit trail.

**Implicaciones Cognitivas:**
- A corrected Belief transitions to SUPERSEDED status.
- The correcting Evidence is linked to both the old and new Belief.
- The correction is recorded as a revision in the Knowledge State history.
- The system does not apologize for the correction — it explains it.

**Impacto Conversacional:** Cuando el sistema se equivoca y es corregido, lo maneja
con naturalidad. "Disculpe, tenía entendido que iba al aeropuerto por su mención de
vuelo. Ahora que me dice que va al centro, corrijo el destino." La corrección es
transparente y educada.

**Verificación:** ¿Existe algún escenario de corrección donde el Belief anterior se
pierda sin registro de SUPERSEDED? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el proceso de corrección),
EVIDENCE_MODEL.md (define la Evidence contradictoria).

---

### R-KM-037 — Correction does not penalize the system

**Enunciado:** A correction is a normal cognitive operation, not a failure. The system
must not reduce its operational confidence or escalate unnecessarily solely because a
correction occurred. Corrections are evidence of epistemic health, not dysfunction.

**Derivación Constitucional:** CONSTITUTION.md §3.5.2 ("The system can be wrong");
P-E4 (Revisability); CP-37 (Outcome feedback — los outcomes retroalimentan el
conocimiento).

**Justificación:** If the system treated every correction as a failure, it would become
timid and escalate unnecessarily. "The user corrected the destination" is normal in
a conversation. The system should learn from corrections (why was the Belief wrong?)
but not treat them as errors. The Certainty of the source that produced the erroneous
Belief may be adjusted (per CP-38), but the system's operational posture should not
change.

**Implicaciones Cognitivas:**
- Correction does not trigger escalation by default.
- Correction triggers a learning signal: the source that produced the incorrect
  Belief may have its Confidence adjusted.
- Frequent corrections of the same type may indicate a systemic issue.
- Each correction is logged for audit but does not change strategic posture.

**Impacto Conversacional:** El sistema acepta correcciones con naturalidad. No se
pone "a la defensiva" ni pide disculpas excesivas. El usuario siente que puede
corregir al sistema sin generar una experiencia incómoda.

**Verificación:** ¿Existe algún mecanismo que degrade el comportamiento del sistema
(escalación, reducción de confianza operacional) tras una corrección normal? Si sí
→ violación.

**Delegación:** DECISION_MODEL.md (define cuándo una corrección afecta el Strategic
Posture), COMMITMENT_MODEL.md (define umbrales después de correcciones).

---

## 13. Knowledge Invalidation

### R-KM-038 — Knowledge is invalidated by Evidence, not by time

**Enunciado:** Knowledge is invalidated when contradictory Evidence makes the Belief
untenable. Time alone does not invalidate Knowledge — it degrades Certainty (per
CERTAINTY_CALCULUS.md) but does not invalidate. Only Evidence can invalidate.

**Derivación Constitucional:** CP-18 (certidumbre continua — la certidumbre decae pero
el conocimiento persiste); CP-20 (actualización por Evidence — solo Evidence actualiza
Beliefs); EVIDENCE_MODEL.md R-EM-008 (Contradictory Evidence).

**Justificación:** Invalidating Knowledge by time would mean the system "forgets"
without reason. Temporal decay of Certainty is a separate mechanism: the Belief becomes
less certain, but it remains Knowledge until contradicted. This preserves information
that may be valuable even if old.

**Implicaciones Cognitivas:**
- Invalidation requires Evidence that directly contradicts the Belief.
- A Belief without recent confirmation has low Certainty but is still Knowledge.
- Invalidation transitions the Belief to INVALIDATED status.
- An INVALIDATED Belief is archived with a link to the invalidating Evidence.

**Impacto Conversacional:** El sistema no descarta información simplemente porque
pasó el tiempo. Recuerda lo que el usuario dijo en el mensaje anterior aunque hayan
pasado varios minutos, pero con menor confianza. Solo descarta lo que es explícitamente
contradicho.

**Verificación:** ¿Existe algún mecanismo que invalide Knowledge sin que medie
Evidence contradictoria? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS.md (define la degradación temporal sin invalidación),
EVIDENCE_MODEL.md (define la Evidence contradictoria).

---

### R-KM-039 — Invalidated Knowledge is archived, not deleted

**Enunciado:** When a Belief is invalidated (transitioned to INVALIDATED status), it
is preserved in the Archived Knowledge layer. The Knowledge remains fully accessible,
including its proposition, its supporting Evidence, its birth record, and the Evidence
that invalidated it.

**Derivación Constitucional:** CP-31 (archivo no es eliminación); S-P6 (Knowledge
Preservation); CP-39 (mejora no destructiva).

**Justificación:** Invalidated Knowledge has high value: it shows what the system
previously believed and why it changed. This is essential for learning (patterns of
error), audit (why was a wrong decision made?), and recovery (if the invalidation was
itself mistaken).

**Implicaciones Cognitivas:**
- INVALIDATED is a permanent archival status.
- INVALIDATED Knowledge is not considered in active cognitive processing.
- INVALIDATED Knowledge can be reinstated if the invalidating Evidence is itself
  invalidated.
- The chain of invalidations is preserved (Knowledge → Invalidated by Evidence X →
  Evidence X invalidated by Evidence Y).

**Impacto Conversacional:** El sistema aprende de sus errores porque los recuerda.
No repite el mismo patrón de invalidación porque la historia completa está disponible
para el aprendizaje. El usuario se beneficia de un sistema que mejora con la
experiencia.

**Verificación:** ¿Existe algún mecanismo que elimine Knowledge invalidado en lugar
de archivarlo? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el manejo de Knowledge invalidado).

---

## 14. Knowledge Preservation and Archiving

### R-KM-040 — Active Knowledge is preserved across Cognitive Cycles

**Enunciado:** The Active Knowledge State at the end of a Cognitive Cycle is
transferred to the next cycle. The system does not start each cycle with an empty
Knowledge State. The transfer includes all six components of Knowledge (R-KM-011).

**Derivación Constitucional:** CP-30 (el Knowledge State se transfiere de un ciclo al
siguiente; el ciclo N comienza con el Knowledge State producido por el ciclo N-1);
S-P6 (Knowledge Preservation).

**Justificación:** If each cycle started from an empty Knowledge State, the system
would forget everything between turns. The user would have to repeat all information
in every message. Preservation across cycles is the foundation of conversational
continuity.

**Implicaciones Cognitivas:**
- The Cognitive Cycle takes the Knowledge State as input and produces an updated
  Knowledge State as output.
- The update is additive: new Knowledge is added, no Knowledge is removed (unless
  explicitly invalidated by Evidence).
- The system maintains the same Knowledge State across the entire conversation.

**Impacto Conversacional:** El sistema recuerda todo lo dicho en la conversación
actual. El usuario no tiene que repetir información. "Como mencionó antes, va al
aeropuerto — ¿confirma el horario?" La continuidad es la base de una conversación
natural.

**Verificación:** ¿Existe algún escenario donde información del ciclo anterior no esté
disponible en el ciclo siguiente? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo de transferencia entre
ciclos).

---

### R-KM-041 — Archiving is triggered by relevance, not by time alone

**Enunciado:** Knowledge is moved from Active to Archive based on relevance criteria,
not solely on age. Relevance is determined by: relationship to active Commitments,
recency of user reference, and likelihood of future use. Age is a factor but not the
determinant.

**Derivación Constitucional:** CP-31 (archivo por relevancia — edad, relevancia para
Commitments activos, completitud del ciclo); R-KM-022 (temporal scope).

**Justificación:** If archiving were based on time alone, Knowledge relevant to an
active trip would be archived while the trip is in progress. The system must keep
knowledge that is needed for current operations, regardless of age. Relevance is a
multifactorial assessment.

**Implicaciones Cognitivas:**
- Archiving criteria include: commitment relevance, user activity, contradiction
  status, and knowledge type.
- Knowledge relevant to an active Commitment is never archived until the Commitment
  is resolved.
- Knowledge explicitly referenced by the user in the current session is kept active.
- Archived Knowledge is indexed by relevance keywords for retrieval.

**Impacto Conversacional:** El sistema retiene información importante durante todo el
tiempo que sea necesaria, sin importar cuánto dure la conversación. No archiva el
destino mientras el viaje está en curso. La memoria activa está optimizada para la
situación actual.

**Verificación:** ¿Existe algún escenario donde Knowledge relevante para un compromiso
activo sea archivado? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el mecanismo de archivo con criterios
de relevancia).

---

### R-KM-042 — Archived Knowledge is fully retrievable

**Enunciado:** Archived Knowledge is preserved with complete fidelity. When retrieved,
it returns to Active Knowledge with its original proposition, Evidence references,
Certainty, temporal scope, and semantic relationships intact. Retrieval does not
modify the archived copy.

**Derivación Constitucional:** CP-31 (la información archivada debe poder recuperarse);
S-P6 (Knowledge Preservation); CP-29 (reconstrucción desde Evidence).

**Justificación:** An archive that returns incomplete Knowledge is a lossy archive,
which violates S-P6. Retrieval must restore the Knowledge element to its original
state, not a degraded version. Retrieval is a copy operation: the archive preserves
the original.

**Implicaciones Cognitivas:**
- Retrieval creates an Active copy from the Archive.
- The Archived original remains unchanged.
- Retrieval may trigger recomputation of Certainty if the Knowledge has aged.
- Archived Knowledge retrieved after a long period may have degraded Certainty (per
  CERTAINTY_CALCULUS.md).

**Impacto Conversacional:** El sistema puede retomar temas abandonados hace tiempo
con el mismo nivel de detalle. "Recuerdo que en marzo usted preguntó por tarifas al
aeropuerto — ¿quiere retomar eso?" La memoria de largo plazo es tan precisa como la
de corto plazo.

**Verificación:** ¿Puede la recuperación de Knowledge archivado devolver información
incompleta? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el proceso de recuperación desde
archivo).

---

## 15. Knowledge Reconstruction

### R-KM-043 — The Knowledge State is reconstructible from the Evidence Store

**Enunciado:** The entire Knowledge State — Active Beliefs, Certainties, Commitments,
and Operational Projection — must be fully reconstructible from the Evidence Store
and archived Knowledge records. After a system restart, the system must rebuild its
Knowledge State from these sources before processing new Signals.

**Derivación Constitucional:** CP-29 (reconstrucción desde Evidence); S-P6 (Knowledge
Preservation); EVIDENCE_MODEL.md R-EM-051 (reconstruction from Evidence alone);
EVIDENCE_MODEL.md R-EM-049 (Evidence Store as foundation of Knowledge State).

**Justificación:** The Evidence Store is the ground truth. If the volatile Knowledge
State is lost (crash, restart), the Evidence Store and archived records must be
sufficient to reconstruct exactly what the system knew. This ensures that no event,
no commitment, no decision is lost due to system failure.

**Implicaciones Cognitivas:**
- Reconstruction is a read-only process from the Evidence Store.
- Reconstruction follows this sequence: Evidence → Beliefs → Certainties →
  Commitments → Operational Projection.
- Reconstruction is deterministic: same Evidence Store, same result.
- Reconstruction must be complete before the system processes new input.

**Impacto Conversacional:** El sistema se recupera completamente de fallos sin perder
información. Si el sistema se reinicia, el usuario no tiene que repetir nada. La
conversación continúa exactamente donde quedó.

**Verificación:** ¿Puede el sistema reconstruir su Knowledge State completo desde el
Evidence Store y archivos? Si no → violación.

**Delegación:** EVIDENCE_MODEL.md (define la estructura de Evidence necesaria para
reconstrucción), COGNITIVE_ARCHITECTURE.md (define el proceso de reconstrucción post-
reinicio).

---

### R-KM-044 — Reconstruction is verifiable

**Enunciado:** The reconstruction process must include a verification step that
confirms the reconstructed Knowledge State is complete and consistent. If
reconstruction fails verification, the system must escalate before resuming
operation.

**Derivación Constitucional:** CP-29 (si la reconstrucción falla, escalar a operador
humano); S-P7 (Human Escalation); S-P6 (operar con estado incompleto es una falla).

**Justificación:** A partial or inconsistent reconstruction is worse than no
reconstruction: the system would operate with incorrect Knowledge, making wrong
decisions. Verification protects against this by checking completeness (all active
Commitments are present) and consistency (no contradictory Beliefs).

**Implicaciones Cognitivas:**
- Verification checks: all active Commitments reconstructed, no contradictory Beliefs
  in active set, all Beliefs have Certainty, all Beliefs trace to Evidence.
- If verification fails, the system enters a RECOVERY_FAILED state.
- In RECOVERY_FAILED, the system cannot process new Signals until the issue is
  resolved.
- RECOVERY_FAILED requires human operator intervention.

**Impacto Conversacional:** El sistema prefiere no operar a operar con información
incorrecta. Si algo salió mal en la recuperación, el usuario recibe un mensaje
honesto: "Estoy experimentando un problema técnico, un operador humano le asistirá."
La seguridad está por encima de la disponibilidad.

**Verificación:** ¿Existe algún escenario donde el sistema opere con un Knowledge
State reconstruido sin verificar? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el proceso de verificación post-
reconstrucción).

---

## 16. Consistency and Contradiction

### R-KM-045 — The Knowledge State must be internally consistent

**Enunciado:** The Active Knowledge State must be internally consistent at all times.
Consistency means: no two Beliefs in the active set can be contradictory unless they
are explicitly marked as competing fragments (R-KM-031). All relationships between
Beliefs must be correctly maintained.

**Derivación Constitucional:** CP-10 (Resolución de conflictos — el sistema debe
detectar y resolver contradicciones); CP-16 (coexistencia de intenciones — solo cuando
no son contradictorias); CERTAINTY_CALCULUS.md R-CC-021 (propagación por relaciones
semánticas).

**Justificación:** An inconsistent Knowledge State would produce inconsistent decisions.
If the system believes both "the origin is Asunción" and "the origin is Luque" without
recognizing the contradiction, it cannot reliably dispatch a driver. Consistency is
not optional — it is a precondition for rational operation.

**Implicaciones Cognitivas:**
- Consistency is checked after every Evidence addition.
- Contradictions are detected through the semantic relationship network.
- Contradictions result in fragmentation (two competing fragments) or invalidation
  (one Belief supersedes the other).
- Consistency does not require completeness — the system can have gaps without being
  inconsistent.

**Impacto Conversacional:** El sistema nunca se contradice. No dice primero "origen
Asunción" y luego "origen Luque" sin reconocer el conflicto. Si hay contradicción,
la maneja explícitamente: "Antes dijo Asunción, ahora dice Luque — ¿cuál es
correcto?" La consistencia genera confianza.

**Verificación:** ¿Puede el Knowledge State activo contener dos Beliefs contradictorias
sin que sean reconocidas como fragmentos competidores? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el proceso de verificación de
consistencia).

---

### R-KM-046 — Contradictions cannot be ignored

**Enunciado:** When a contradiction is detected in the Knowledge State, the system
must resolve it before proceeding with any Decision that depends on the affected
Beliefs. Ignoring a contradiction is not permitted — it must be addressed through
fragmentation, clarification, or escalation.

**Derivación Constitucional:** CP-10 (Resolución de conflictos); CP-14 (Resolución por
evidencia); CP-25 (Clarificación por pregunta directa — cuando el sistema no puede
resolver solo).

**Justificación:** A contradiction in the Knowledge State is a signal that the system's
model of the world is inconsistent with itself. Operating on a contradictory model
will produce unreliable decisions. The system must pause deliberation on the affected
propositions until the contradiction is resolved.

**Implicaciones Cognitivas:**
- Contradiction detection triggers a deliberation hold on affected Beliefs.
- Resolution paths: (a) Evidence favors one side → invalidation of the other;
  (b) Equipoise → fragmentation (multiple hypotheses); (c) System cannot resolve →
  clarification to user; (d) Cannot clarify → escalation.
- While a contradiction is unresolved, no Commitment dependent on the affected Beliefs
  can be made.

**Impacto Conversacional:** Cuando el sistema detecta una contradicción, no la ignora
ni elige una opción al azar. Pide clarificación: "Me dijo dos cosas diferentes —
¿podría confirmar?" El usuario aprecia que el sistema reconozca la inconsistencia y
pida ayuda en lugar de actuar incorrectamente.

**Verificación:** ¿Existe alguna ruta donde una contradicción no detectada o ignorada
permita tomar una decisión? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define los paths de resolución), COMMITMENT_MODEL.md
(define la restricción de Commitment durante contradicción).

---

## 17. Incomplete Knowledge

### R-KM-047 — The Knowledge State explicitly represents incompleteness

**Enunciado:** The Knowledge State must explicitly represent what it does not know.
Incomplete Knowledge is represented through: missing Beliefs (known unknowns),
Hypotheses (unknown with alternatives), and Knowledge gaps (identified areas where
Evidence is insufficient).

**Derivación Constitucional:** CONSTITUTION.md §3.5.3 ("The system does not have access
to the user's mind"); CP-13 (Hipótesis múltiples); P-I4 (Humility Before Uncertainty).

**Justificación:** The system does not know everything. Representing what it does NOT
know is as important as representing what it knows. Incompleteness representation
enables the system to ask the right questions, to avoid overconfidence, and to
escalate when necessary.

**Implicaciones Cognitivas:**
- Known unknowns: Beliefs that the system knows it needs but does not have (e.g.,
  destination not specified).
- Hypotheses: alternative Beliefs under consideration (competing interpretations).
- Knowledge gaps: the system knows it cannot know this without more Evidence.
- Incompleteness is not a defect — it is correctly represented epistemic state.

**Impacto Conversacional:** El sistema sabe lo que no sabe y actúa en consecuencia.
"No tengo el destino — ¿podría indicármelo?" No adivina ni asume. El usuario nunca
tiene que corregir suposiciones incorrectas porque el sistema no supone lo que no sabe.

**Verificación:** ¿Puede el sistema distinguir entre "sé que el destino es X" y "no
sé el destino"? Si no → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define la representación de
incompletitud).

---

### R-KM-048 — Knowledge gaps drive the conversation forward

**Enunciado:** The set of Knowledge gaps in the Knowledge State determines what
information the system needs to acquire next. The system prioritizes Knowledge gaps
based on the active Intent and the Critical Information Needs required to fulfill it.

**Derivación Constitucional:** CP-25 (Clarificación por pregunta directa — preguntar
cuando falta información); DECISION_MODEL.md R-DM-031 (Critical Information Needs
determine what information to seek).

**Justificación:** Knowledge gaps are not passive — they are active drivers of the
conversation. The system knows what it needs to know next and asks for it. This is
the cognitive basis for proactive questioning: the system doesn't ask randomly — it
asks what it needs to know to make the next Decision.

**Implicaciones Cognitivas:**
- Knowledge gaps are ranked by Critical Information Need priority.
- The system addresses gaps in priority order during the conversation.
- When a gap is filled, the Knowledge State is updated, and remaining gaps are
  re-evaluated.
- The conversational agent uses the prioritized gap list to formulate questions.

**Impacto Conversacional:** El sistema hace preguntas relevantes en el momento
adecuado. No bombardea al usuario con preguntas — pregunta lo que necesita saber
para avanzar. "¿A dónde va?" no es una pregunta genérica — es el sistema llenando
un vacío de conocimiento necesario para cotizar el viaje.

**Verificación:** ¿Existe algún mecanismo que identifique y priorice vacíos de
conocimiento? Si no → violación.

**Delegación:** DECISION_MODEL.md (define Critical Information Needs),
CHANNEL_ADAPTER.md (define la formulación de preguntas desde gaps).

---

## 18. Conflicting Knowledge

### R-KM-049 — Conflicting Knowledge is held as competing fragments

**Enunciado:** When two or more Beliefs are mutually exclusive (cannot all be true)
but are equally supported by available Evidence, the Knowledge State holds them as
competing fragments. No fragment is arbitrarily preferred. Each fragment is assigned
a Certainty based on its supporting Evidence.

**Derivación Constitucional:** CP-13 (Hipótesis múltiples); CP-16 (Coexistencia de
intenciones — solo cuando no son contradictorias); CERTAINTY_CALCULUS.md R-CC-021
(exclusión mutua: aumentar Certainty de una reduce la otra).

**Justificación:** When Evidence does not favor one interpretation, the system must
not arbitrarily choose one. Holding competing fragments preserves the epistemic
honesty of the system. The fragments remain until Evidence breaks the tie.

**Implicaciones Cognitivas:**
- Each fragment is self-consistent internally.
- Fragments share the Knowledge they agree on.
- Fragments are represented in the Hypothesis Network.
- No fragment is ever deleted — losing fragments are archived.

**Impacto Conversacional:** Cuando el sistema no está seguro entre dos opciones, no
elige una al azar. Reconoce la ambigüedad: "Puede ser que vaya al aeropuerto (mencionó
vuelo) o a la terminal (mencionó ómnibus) — ¿puede confirmar?" La incertidumbre se
comunica en lugar de ocultarse.

**Verificación:** ¿Existe algún mecanismo que resuelva fragmentos competidores sin
Evidence suficiente? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el manejo de fragmentos competidores).

---

### R-KM-050 — Conflicting Knowledge may be held across different time contexts

**Enunciado:** Knowledge from different time contexts (e.g., "user said airport
yesterday" vs. "user said center today") is not considered contradictory unless
both contexts are active simultaneously. Temporal context resolves apparent
contradictions.

**Derivación Constitucional:** R-KM-022 (temporal scope); R-KM-024 (Knowledge state
at time T is reconstructible); CP-04 (límite temporal del ciclo cognitivo).

**Justificación:** "The user wanted to go to the airport yesterday" and "the user
wants to go to the center today" are not contradictory — they refer to different time
contexts. The Knowledge State must distinguish between Beliefs that are contextually
compatible (different times, different conversations) and those that are contextually
contradictory (same time, same conversation).

**Implicaciones Cognitivas:**
- Temporal context is part of the Knowledge element, not metadata.
- Two Beliefs with different temporal scopes can coexist without triggering
  contradiction resolution.
- If two Beliefs have overlapping temporal scopes, they are evaluated for
  contradiction.

**Impacto Conversacional:** El sistema entiende que las preferencias cambian con el
tiempo. Si hoy el usuario va al centro y mañana al aeropuerto, el sistema no dice
"pero ayer dijo que iba al centro." La conciencia temporal evita confusiones.

**Verificación:** ¿Existe algún caso donde Beliefs de diferentes contextos temporales
sean tratados como contradictorios? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define la evaluación de contradicción con
contexto temporal).

---

## 19. Knowledge and Decision

### R-KM-051 — Decisions read from the Knowledge State

**Enunciado:** Every Decision reads the Knowledge State to obtain: the relevant Beliefs
with their Certainties, the active Commitments, the current Hypotheses, and the
Knowledge gaps. The Decision process does not access the Evidence Store directly — it
reads the interpreted Knowledge.

**Derivación Constitucional:** DECISION_MODEL.md R-DM-008 (precondiciones — Knowledge
State actualizado); SYSTEM_VOCABULARY.md §6.1 (Knowledge State produce toda Decisión);
CP-27 (Proyección derivada desde Knowledge State).

**Justificación:** The Knowledge State is the system's interpreted understanding. A
Decision needs the interpreted version (what does the system believe?), not the raw
Evidence (what Facts were recorded?). The Evidence-to-Knowledge pipeline ensures that
by the time a Decision is made, the Knowledge is already integrated, contextualized,
and qualified.

**Implicaciones Cognitivas:**
- Decisions operate on Beliefs, not raw Evidence.
- The Evidence Store is only accessed by the Knowledge formation process, not by
  Decisions.
- Decisions receive: Belief set, Certainties, Knowledge gaps, active Commitments.

**Impacto Conversacional:** Las decisiones del sistema están basadas en su comprensión
integrada de la situación, no en datos aislados. Si el sistema decide preguntar por
el destino, es porque su comprensión (no una regla rígida) indica que falta esa
información.

**Verificación:** ¿Existe alguna Decisión que acceda directamente al Evidence Store
sin pasar por el Knowledge State? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define la interfaz Decision ↔ Knowledge State),
COGNITIVE_ARCHITECTURE.md (define el flujo Knowledge → Decision en el Ciclo
Cognitivo).

---

### R-KM-052 — Decisions may create new Knowledge

**Enunciado:** A Decision, once executed, may produce new Knowledge that enters the
Knowledge State. The selection of a Decision alternative, the Commitment made, and the
resulting Operational Projection all become part of the Knowledge State as new Beliefs
or Commitments.

**Derivación Constitucional:** DECISION_MODEL.md R-DM-009 (postcondiciones: una
Decisión RESOLVED produce un Commitment y una Operational Projection);
COMMITMENT_MODEL.md; CP-27 (Proyección derivada).

**Justificación:** Decisions are not just consumers of Knowledge — they are producers.
When the system decides to create a trip, that decision becomes part of what the system
knows: "a trip was created," "the passenger is committed," "the driver is dispatched."
This self-referential Knowledge is essential for the system to reason about its own
actions.

**Implicaciones Cognitivas:**
- Decision outcomes are registered as new Knowledge.
- The Commitment becomes a new element in the Knowledge State.
- The Operational Projection becomes part of the Knowledge State.
- The Decision itself (what was decided, why, with what Certainty) becomes Episodic
  Knowledge.

**Impacto Conversacional:** El sistema sabe lo que ha hecho. Si el usuario pregunta
"¿ya creaste el viaje?" el sistema responde "sí, el viaje fue creado con origen
Asunción y destino Aeropuerto a las 14:00." La autoconciencia operacional es
transparente.

**Verificación:** ¿Existe alguna Decisión ejecutada cuyo resultado no esté registrado
como nuevo Knowledge en el Knowledge State? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el registro de resultados de decisión),
COMMITMENT_MODEL.md (define el Commitment como Knowledge).

---

### R-KM-053 — Knowledge gaps are Critical Information Needs for Decisions

**Enunciado:** The Knowledge gaps identified in the Knowledge State (R-KM-047)
constitute Critical Information Needs for any active Decision. A Decision cannot
proceed to COMMIT if there are unresolved Knowledge gaps that are material to the
Decision outcome.

**Derivación Constitucional:** DECISION_MODEL.md R-DM-031 (Critical Information Needs);
CP-25 (Clarificación por pregunta directa); CP-22 (Compromiso explícito).

**Justificación:** Deciding without essential Knowledge is guessing. The system must
identify what it needs to know before it can decide. Knowledge gaps that are critical
(CINs) must be resolved before a Commitment can be made. Non-critical gaps may remain
(perfect information is not required).

**Implicaciones Cognitivas:**
- The system distinguishes critical from non-critical Knowledge gaps.
- Critical gaps block the Decision from reaching COMMIT.
- The system attempts to fill critical gaps through clarification or Evidence
  gathering.
- If critical gaps cannot be filled, the Decision escalates.

**Impacto Conversacional:** El sistema no toma decisiones con información
insuficiente. Si necesita el destino para cotizar, pregunta por el destino antes
de dar un precio. No da presupuestos sin destino ni crea viajes sin origen.

**Verificación:** ¿Existe alguna Decisión que llegue a COMMIT con gaps críticos de
conocimiento sin resolver? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define CINs y su relación con Knowledge gaps),
COMMITMENT_MODEL.md (define el bloqueo del Gate por gaps críticos).

---

## 20. Knowledge and Commitment

### R-KM-054 — Commitments are Knowledge elements

**Enunciado:** A Commitment is a Knowledge element in the Knowledge State that
represents a promise made by the system. It is a first-class component of the
Knowledge State with its own lifecycle, Certainty, and Evidence trace.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §6.1 (Knowledge State contains "current
Commitments"); SYSTEM_VOCABULARY.md §8.2 (Commitment definition); COMMITMENT_MODEL.md
R-CM-001 (naturaleza del compromiso); CP-22 (Compromiso explícito).

**Justificación:** A Commitment is not an external artifact — it is part of what the
system knows. "I committed to creating a trip" is a piece of Knowledge. Without this
Knowledge, the system would not know what it has promised. Making Commitments first-
class Knowledge elements ensures they participate in all cognitive processes.

**Implicaciones Cognitivas:**
- Commitments are stored in the Knowledge State alongside Beliefs and Hypotheses.
- A Commitment references the Beliefs that justified it.
- A Commitment has a Certainty (the Certainty at the moment it was made).
- A Commitment affects future Decisions (the system must honor it).

**Impacto Conversacional:** El sistema sabe lo que ha prometido. Si el usuario dice
"me dijiste que el viaje estaba confirmado," el sistema verifica el Commitment y
responde "sí, el viaje está confirmado con salida a las 15:00." No hay promesas
olvidadas.

**Verificación:** ¿Existe algún Commitment en el sistema que no sea un elemento de
Knowledge en el Knowledge State? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define el Commitment como elemento del Knowledge
State).

---

### R-KM-055 — Commitments depend on the Beliefs that justified them

**Enunciado:** Every Commitment in the Knowledge State references the Beliefs whose
Certainty met the Commitment Threshold. If those Beliefs change (revision,
correction, invalidation), the Commitment must be re-evaluated.

**Derivación Constitucional:** COMMITMENT_MODEL.md R-CM-005 (Commitment Gate —
precondiciones de entrada); CERTAINTY_CALCULUS.md (umbral de compromiso);
CP-23 (Umbral dinámico).

**Justificación:** A Commitment is only valid while the Beliefs that justified it
remain valid. If new Evidence reduces the Certainty of those Beliefs below the
threshold, the Commitment is no longer justified. The system must detect this and
re-evaluate the Commitment.

**Implicaciones Cognitivas:**
- Each Commitment records its justifying Beliefs and their Certainties at commitment
  time.
- When a justifying Belief is revised, the Commitment is flagged for re-evaluation.
- Re-evaluation may reconfirm, modify, or revoke the Commitment.
- The re-evaluation follows the same Gate process as the original Commitment.

**Impacto Conversacional:** El sistema no mantiene compromisos basados en información
desactualizada. Si el usuario corrige el destino después de confirmado el viaje, el
sistema re-evalúa el compromiso: "Ha cambiado el destino — ¿desea modificar el viaje?"
Los compromisos son dinámicos, no estáticos.

**Verificación:** ¿Existe algún Commitment que permanezca activo después de que sus
Beliefs justificantes hayan sido invalidadas o reducidas? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define la re-evaluación de Commitments por cambio
de Beliefs).

---

## 21. Knowledge and Learning

### R-KM-056 — Learning produces new Knowledge without destroying old

**Enunciado:** Learning (CP-39) produces new Knowledge that is added to the Knowledge
State without modifying or removing existing Knowledge. The new Knowledge complements,
refines, or may contradict — but never replaces — existing Knowledge.

**Derivación Constitucional:** CP-39 (Mejora no destructiva — el aprendizaje agrega
conocimiento nuevo sin destruir conocimiento previo); S-P5 (Evidence Immutability);
S-P6 (Knowledge Preservation).

**Justificación:** Learning is additive, not subtractive. When the system learns a new
pattern, it adds this pattern as new Evidence and new Beliefs. The old pattern is not
deleted — it is preserved as historical Knowledge. This ensures the system can audit
its own learning trajectory and revert if necessary.

**Implicaciones Cognitivas:**
- Learning adds Evidence to the Evidence Store (learning outcomes are recorded as
  Evidence).
- Learning may create new Beliefs or modify Certainties of existing Beliefs.
- Learning never deletes Knowledge.
- The system can trace when a pattern was learned and what Evidence supported it.

**Impacto Conversacional:** El sistema mejora progresivamente sin perder su
conocimiento anterior. Lo que aprendió ayer sigue disponible para referencia, y lo
que aprende hoy se suma. El usuario se beneficia de un sistema que "sabe más" sin
volverse "olvidadizo."

**Verificación:** ¿Existe algún mecanismo de aprendizaje que elimine o reemplace
conocimiento en lugar de agregar? Si sí → violación.

**Delegación:** LEARNING_MODULE (cuando exista), COGNITIVE_ARCHITECTURE.md (define la
integración aprendizaje → Knowledge State).

---

### R-KM-057 — Learning outcomes update Certainty and Confidence

**Enunciado:** Learning from outcomes (CP-37, CP-38) may adjust the Certainty of
existing Beliefs and the Confidence of Sources. These adjustments are recorded as
new Evidence and processed through the normal Knowledge revision mechanism.

**Derivación Constitucional:** CP-37 (Outcome feedback — los outcomes retroalimentan
el conocimiento del sistema); CP-38 (Ajuste de confianza a través del tiempo);
CERTAINTY_CALCULUS.md R-CC-039 (recalibración por outcomes).

**Justificación:** The system learns from its mistakes and successes. When a Belief
leads to a successful outcome, its Certainty is reinforced. When it leads to a failure,
the Certainty is reduced, and the Source Confidence may be adjusted. These adjustments
must be transparent and traceable.

**Implicaciones Cognitivas:**
- Each outcome is recorded as Evidence.
- The Evidence feeds into the Certainty Calculus for the affected Beliefs.
- Source Confidence adjustments are recorded as Evidence about the Source.
- The learning signal is processed in the next Cognitive Cycle.

**Impacto Conversacional:** El sistema aprende de la experiencia. Si el sistema
constantemente malinterpreta "centro" como "centro de Asunción" cuando el usuario
está en Encarnación, ajusta su conocimiento. Con el tiempo, las interpretaciones
son más precisas.

**Verificación:** ¿Existe algún outcome que no se registre como Evidence y no
retroalimente el Knowledge State? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS.md (define la recalibración por outcomes),
COGNITIVE_ARCHITECTURE.md (define el flujo de feedback).

---

### R-KM-058 — Learning produces reusable Knowledge

**Enunciado:** Learning may extract patterns from Episodic Knowledge and produce
reusable Knowledge (user preferences, common routes, peak times). This reusable
Knowledge is stored in the Knowledge State as new Beliefs with appropriate Semantic
or Contextual scope.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §11.7 (Learning Memory); SYSTEM_VOCABULARY.md §13.3
(Learning: actualiza Learning Memory); CP-39 (aprendizaje acumulativo).

**Justificación:** The purpose of learning is to create Knowledge that makes future
interactions more efficient and accurate. Learning transforms patterns from episodes
into usable Knowledge: "this user often travels to the airport in the morning" becomes
a Belief that informs future conversations.

**Implicaciones Cognitivas:**
- Learning produces beliefs with a scope: user-specific (Contextual) or general
  (Semantic).
- User-specific learned Knowledge is associated with the user identifier.
- User-specific learned Knowledge is active in future conversations with that user.
- Learned Knowledge has lower Certainty than explicitly provided Knowledge and is
  clearly labeled as inferred.

**Impacto Conversacional:** El sistema personaliza la experiencia basándose en
patrones aprendidos. "Normalmente viaja al aeropuerto por la mañana — ¿es igual hoy?"
La personalización es respetuosa (etiquetada como inferida) y mejora con el uso.

**Verificación:** ¿Puede el sistema distinguir entre conocimiento explícitamente
proporcionado y conocimiento aprendido por inferencia? Si no → violación.

**Delegación:** LEARNING_MODULE (cuando exista), COGNITIVE_ARCHITECTURE.md (define
la integración de patrones aprendidos).

---

## 22. Knowledge and Conversation Memory

### R-KM-059 — Conversation Memory is a subset of Contextual Knowledge

**Enunciado:** Conversation Memory (SYSTEM_VOCABULARY.md §11.3) is the subset of Contextual
Knowledge that pertains specifically to the conversational exchange: messages sent and
received, detected intents per turn, turn-by-turn context, and short-term slot values.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §11.3 (Conversation Memory: "messages,
detected intents, turn-by-turn context, short-term slot values"); R-KM-018 (Contextual
Knowledge); CP-30 (el Knowledge State incluye contexto conversacional).

**Justificación:** Conversation Memory is not separate from the Knowledge State — it
is part of it. The distinction is one of focus: Conversation Memory captures the
conversational flow, while the broader Contextual Knowledge captures the interpreted
understanding. The conversation log is raw material; the Contextual Knowledge is the
interpreted product.

**Implicaciones Cognitivas:**
- Conversation Memory feeds into Contextual Knowledge through the Evidence → Knowledge
  pipeline.
- Each message generates Evidence that may update Contextual Knowledge.
- Conversation Memory is a record of what was said; Contextual Knowledge is what the
  system understood.
- Conversation Memory is preserved in Episodic Knowledge after session end.

**Impacto Conversacional:** El sistema recuerda la conversación no solo como un log
sino como comprensión. Sabe lo que se dijo (Conversation Memory) y lo que significó
(Contextual Knowledge). "Usted dijo 'aeropuerto' y entiendo que su destino es el
Aeropuerto Internacional Silvio Pettirossi."

**Verificación:** ¿Puede el sistema acceder tanto al registro textual de la
conversación como a la interpretación semántica? Si no → violación.

**Delegación:** CHANNEL_ADAPTER.md (define la interfaz entre canal conversacional y
Knowledge State), COGNITIVE_ARCHITECTURE.md (define el pipeline mensaje → Evidence →
Knowledge).

---

### R-KM-060 — Conversation Memory provides context for Knowledge interpretation

**Enunciado:** When the Knowledge State is updated with new Evidence from a
conversation turn, the Conversation Memory provides the context required for correct
interpretation: what was said before, what intents were active, what the user referred
to.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §11.3 (Conversation Memory); CP-30
(preservación del estado cognitivo); CP-06 (Facts are extracted from Observations).

**Justificación:** The same words can mean different things in different conversational
contexts. "Sí" can mean "yes, confirm the trip" or "yes, I am here." The Conversation
Memory provides the context that disambiguates. Without this context, Evidence
extraction would be unreliable.

**Implicaciones Cognitivas:**
- Each Evidence extraction consults Conversation Memory for context.
- Conversation Memory affects the extraction and interpretation of Facts.
- The context includes: previous turns, active intents, unresolved questions.
- Conversation Memory is read-only during Evidence extraction (it is not modified by
  the extraction process).

**Impacto Conversacional:** El sistema entiende pronombres, elipsis y referencias.
Si el usuario dice "allí" en el turno 3, el sistema sabe que "allí" se refiere al
destino mencionado en el turno 1. La conversación fluye naturalmente porque el
contexto se usa para interpretar.

**Verificación:** ¿Existe algún escenario donde la misma utterance produzca diferentes
interpretaciones sin que el contexto conversacional se use para resolver? Si sí →
violación.

**Delegación:** CHANNEL_ADAPTER.md (define el contexto conversacional), EVIDENCE_MODEL.md
(define la extracción contextualizada).

---

## 23. Knowledge and Strategic Projection

### R-KM-061 — Strategic Projection is a view of the Knowledge State

**Enunciado:** The Operational Projection (SYSTEM_VOCABULARY.md §9.2) is a derived, read-only
view of the Knowledge State. It represents the operational commitments that the system
has made, instantiated in the Operational Model schema. It has no independent
existence outside the Knowledge State.

**Derivación Constitucional:** CP-27 (Proyección derivada — la Operational Projection
debe derivarse exclusivamente del Knowledge State); CP-28 (Proyección de solo lectura
— es una vista del Knowledge State, no puede modificarse directamente).

**Justificación:** If the Operational Projection existed independently of the Knowledge
State, the system would have two sources of truth: what it knows (cognitively) and what
it has done (operationally). These could diverge. Making the Projection a derived view
ensures that it always reflects the current Knowledge State.

**Implicaciones Cognitivas:**
- The Operational Projection is recomputed from the Knowledge State in each Cognitive
  Cycle.
- The Projection cannot exist if the Knowledge State does not contain the supporting
  Commitments.
- The Projection is read-only: operational corrections must go through the cognitive
  cycle.
- The Projection is the bridge between cognitive Knowledge and operational reality.

**Impacto Conversacional:** Lo que el sistema sabe y lo que el sistema ha hecho
siempre están alineados. No hay viajes creados que el sistema "no recuerde" haber
creado. La coherencia entre conocimiento y operación es total.

**Verificación:** ¿Existe algún elemento de la Operational Projection que no sea
trazable directamente a un Commitment en el Knowledge State? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el proceso de derivación de la
Proyección), ACTION_EXECUTOR.md (define la ejecución de la Proyección).

---

### R-KM-062 — Strategic Projection does not create new Knowledge

**Enunciado:** The Operational Projection is a view, not a Knowledge producer. It does
not create new Beliefs or Commitments. Only the Cognitive Cycle, through Evidence →
Decision → Commitment, produces new Knowledge.

**Derivación Constitucional:** CP-28 (Proyección de solo lectura); CP-27 (Proyección
derivada); SYSTEM_VOCABULARY.md §7.5 (Projection Phase no crea nuevos Commitments).

**Justificación:** If the Projection could create Knowledge, the system could make
decisions outside the cognitive cycle. This would bypass the Commitment Gate, the
Certainty check, and the Evidence foundation. The Projection must be epistemically
sterile: it reflects what the system knows but does not add to it.

**Implicaciones Cognitivas:**
- The Projection phase reads the Knowledge State and produces a view.
- The Projection phase does not write to the Knowledge State.
- If the Projection detects inconsistencies (e.g., a trip in the database that has no
  corresponding Commitment), it signals an anomaly but does not correct it.
- Anomaly correction requires a new Cognitive Cycle.

**Impacto Conversacional:** El sistema no actúa por fuera de su proceso cognitivo.
Si hay una discrepancia entre lo que el sistema sabe y lo que la base de datos
muestra, el sistema la detecta y la reporta en lugar de modificarla silenciosamente.

**Verificación:** ¿Existe alguna ruta donde la Operational Projection modifique el
Knowledge State? Si sí → violación.

**Delegación:** ACTION_EXECUTOR.md (define la ejecución de acciones desde la
Proyección).

---

### R-KM-063 — Strategic Projection is the operational face of Knowledge

**Enunciado:** The Operational Projection presents the Knowledge State in operational
terms. While the Knowledge State contains Beliefs, Certainties, and Hypotheses, the
Projection contains committed trips, confirmed prices, and assigned drivers. It is the
translation of cognitive Knowledge into operational reality.

**Derivación Constitucional:** CP-27 (la Proyección es el puente entre el conocimiento
y la operación); SYSTEM_VOCABULARY.md §9.2 (Operational Projection: "what will happen based on
what the system knows").

**Justificación:** The system has two audiences: its own cognitive processes (which
operate on Beliefs and Certainties) and the external world (which operates on trips
and drivers). The Projection translates between these domains without losing the
epistemic foundation.

**Implicaciones Cognitivas:**
- The Projection is always accompanied by its epistemic context: "this trip exists
  because we had Certainty 0.85 that the user wanted it."
- The Projection exposes the Knowledge State's Certainty to operational systems.
- Operational systems can query the Projection for epistemic status, not just values.

**Impacto Conversacional:** El sistema puede explicar el fundamento epistémico de
cada operación. "El viaje fue creado con 85% de confianza porque el destino fue
inferido del contexto." La operación es transparente en su fundamento cognitivo.

**Verificación:** ¿Pueden los sistemas operacionales conocer el nivel de certidumbre
asociado a cada elemento de la Proyección? Si no → violación.

**Delegación:** ACTION_EXECUTOR.md (define la interfaz Proyección → ejecución),
COGNITIVE_ARCHITECTURE.md (define la exposición de certidumbre en la Proyección).

---

## 24. Knowledge Traceability

### R-KM-064 — Every Knowledge element is traceable to its origin

**Enunciado:** Every Belief, every Hypothesis, every Commitment in the Knowledge State
must be traceable to: the Evidence that created it, the Cognitive Cycle that processed
it, the Source that provided the Evidence, and the Certainty at the moment of creation.

**Derivación Constitucional:** CONSTITUTION.md P-I5 (Auditability); S-P1 (Evidence-
Based Operation); EVIDENCE_MODEL.md R-EM-020 (trazabilidad de Evidence a Observation).

**Justificación:** Traceability is the foundation of accountability. If the system
cannot trace a Belief to its origin, it cannot explain why it believes it. If it
cannot trace a Decision to its Knowledge basis, it cannot justify the Decision.
Complete traceability is not optional — it is constitutional.

**Implicaciones Cognitivas:**
- Each Knowledge element carries a provenance record.
- The provenance record is immutable after creation.
- Provenance includes: Evidence references, Cycle ID, Source, birth Certainty.
- Traceability chains are navigable in both directions (Knowledge → Evidence,
  Evidence → Knowledge).

**Impacto Conversacional:** El sistema puede responder "¿por qué crees eso?" con una
explicación completa. "Creo que el origen es Asunción porque en el mensaje anterior
usted dijo 'desde Asunción' (extracción directa, confianza alta)." La transparencia
genera confianza.

**Verificación:** Seleccionar cualquier Belief y verificar que sea completamente
trazable a su origen. Si no → violación.

**Delegación:** EVIDENCE_MODEL.md (define la trazabilidad Evidence → Knowledge),
COGNITIVE_ARCHITECTURE.md (define el registro de procedencia).

---

### R-KM-065 — Knowledge lineage is preserved across revisions

**Enunciado:** When Knowledge is revised (R-KM-034), the lineage from the original
Knowledge to the revised Knowledge is preserved. Each revision points to the previous
version and the Evidence that caused the revision.

**Derivación Constitucional:** CP-39 (mejora no destructiva); S-P6 (Knowledge
Preservation); EVIDENCE_MODEL.md R-EM-008 (Contradictory Evidence).

**Justificación:** Knowledge revision creates a family tree of Beliefs. The tree must
be preserved so the system can understand how its understanding evolved. Without
lineage, the system would see only the current state and lose the history of how it
arrived there.

**Implicaciones Cognitivas:**
- Each revision creates a child Knowledge element linked to the parent.
- The revision record includes: parent Knowledge, new Evidence, reason for revision.
- The lineage is two-way: parent → child (forward), child → parent (backward).
- Lineage is immutable: once recorded, it cannot be altered.

**Impacto Conversacional:** El sistema puede explicar la evolución de su comprensión.
"Originalmente entendí que iba al aeropuerto porque mencionó 'vuelo.' Luego usted
corrigió a 'centro,' y actualicé el destino." La historia del entendimiento está
disponible.

**Verificación:** ¿Puede el sistema reconstruir la línea de revisiones de cualquier
Belief? Si no → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el linaje de Knowledge).

---

## 25. Invariants

### I-KM-001 — The Evidence Store is always the foundation

The Evidence Store must always be sufficient to reconstruct the Knowledge State.
No Knowledge element may exist in the Knowledge State that is not supported by
Evidence in the Evidence Store.

**Derivación Constitucional:** R-EM-049, CP-29, S-P6.
**Violation:** System crash without recovery possible.

---

### I-KM-002 — The Knowledge State is always internally consistent

No two Beliefs in the Active Knowledge State may be contradictory unless explicitly
represented as competing fragments. Consistency is verified after every Evidence
addition.

**Derivación Constitucional:** CP-10, R-KM-045.
**Violation:** Contradictory decisions without detection.

---

### I-KM-003 — The Knowledge State is always the single source of decisions

No Decision may be based on information outside the Knowledge State. Every Decision
reads from the Knowledge State exclusively.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §6.1, R-KM-004.
**Violation:** Decision without Knowledge State basis.

---

### I-KM-004 — Knowledge is always provisional

No Belief, Commitment, or Hypothesis is permanent. All Knowledge is revisable upon
arrival of new Evidence.

**Derivación Constitucional:** CONSTITUTION.md §3.5.4, R-KM-002.
**Violation:** Knowledge that cannot be revised.

---

### I-KM-005 — Learning is always non-destructive

Learning must add Knowledge without removing or modifying existing Knowledge.
Knowledge changes only through Evidence addition, never through direct modification
or deletion.

**Derivación Constitucional:** CP-39, S-P5, R-KM-056.
**Violation:** Learning that replaces Knowledge.

---

### I-KM-006 — All Knowledge has complete provenance

Every element in the Knowledge State must have complete provenance: Evidence source,
birth time, Certainty at birth, and revision history.

**Derivación Constitucional:** P-I5, R-KM-064.
**Violation:** Knowledge element without full provenance.

---

### I-KM-007 — The Knowledge State transfers completely across cycles

Every element of the Knowledge State at the end of cycle N is available at the start
of cycle N+1. No Knowledge is lost between cycles except through explicit archiving
by relevance (CP-31).

**Derivación Constitucional:** CP-30, R-KM-040.
**Violation:** Information lost between cognitive cycles.

---

### I-KM-008 — Contextual Knowledge is scoped

Contextual Knowledge is scoped to its conversation session and expires when the
session ends. No Contextual Knowledge from one session leaks into another.

**Derivación Constitucional:** R-KM-025, SYSTEM_VOCABULARY.md §11.3.
**Violation:** Cross-session knowledge contamination.

---

### I-KM-009 — The Operational Projection is always derived

The Operational Projection is always a read-only view of the Knowledge State. It
cannot exist independently, cannot be modified directly, and cannot create new
Knowledge.

**Derivación Constitucional:** CP-27, CP-28, R-KM-061, R-KM-062.
**Violation:** Operational state that does not derive from Knowledge State.

---

### I-KM-010 — Knowledge is always temporally scoped

Every element of the Knowledge State has a temporal scope: birth time, last
confirmation time, expiry time, and validity window.

**Derivación Constitucional:** R-KM-022, R-KM-023.
**Violation:** Knowledge without temporal scope.

---

## 26. Delegation to Implementation Documents

The following documents receive implementation mandates from this model:

| Document | Responsibility |
|---|---|
| **COGNITIVE_ARCHITECTURE.md** (Level III-h) | Knowledge State structure, recomputation flow, revision mechanism, reconstruction process, archiving logic, consistency verification, fragment management, birth record, lineage tracking |
| **EVIDENCE_MODEL.md** (Level III-a) | Evidence pipeline that feeds the Knowledge State, Evidence Store structure for reconstruction, temporal Evidence querying |
| **CERTAINTY_CALCULUS.md** (Level III-d) | Certainty propagation through semantic relationships, inheritance by composition, temporal degradation of Certainty |
| **DECISION_MODEL.md** (Level III-b) | Critical Information Needs from Knowledge gaps, Decision ↔ Knowledge interface |
| **COMMITMENT_MODEL.md** (Level III-c) | Commitment as Knowledge element, re-evaluation on Belief change |
| **CHANNEL_ADAPTER.md** (Level III-e) | Conversation Memory ↔ Knowledge State interface, session scoping |
| **ACTION_EXECUTOR.md** (Level III-g) | Operational Projection execution, epistemic context exposure |
| **Level IV documents** | Data structures, storage mechanisms, APIs, algorithms, databases, caches that implement the conceptual Knowledge Model defined herein |

---

*End of 10-KNOWLEDGE_MODEL.md — Version 1.0-draft*

> Este documento especifica el modelo conceptual del conocimiento cognitivo de AITOS.
> Deriva de CONSTITUTION.md, SYSTEM_VOCABULARY.md, COGNITIVE_PRINCIPLES.md, EVIDENCE_MODEL.md,
> DECISION_MODEL.md, COMMITMENT_MODEL.md, y CERTAINTY_CALCULUS.md. No redefine ningún
> concepto ontológico ni principio constitucional.
>
> Fecha: 2026-07-12
