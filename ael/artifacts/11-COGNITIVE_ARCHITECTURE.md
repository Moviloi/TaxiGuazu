# AITOS Cognitive Constitution — 11-COGNITIVE_ARCHITECTURE.md

> **Cognitive Architecture of the AI Transportation Operating System**
>
> Status: **DRAFT** — first writing from Constitutional delegation
> Version: 1.0-draft
> Date: 2026-07-12
>
> ⚠️ This document belongs to **Level III-h (Contractual Authority)** of the AITOS
> Document Hierarchy (CONSTITUTION.md §6). It derives from CONSTITUTION.md (Level I-a),
> SYSTEM_VOCABULARY.md (Level I-b), COGNITIVE_PRINCIPLES.md (Level II-a), EVIDENCE_MODEL.md
> (Level III-a), DECISION_MODEL.md (Level III-b), COMMITMENT_MODEL.md (Level III-c),
> CERTAINTY_CALCULUS.md (Level III-d), and KNOWLEDGE_MODEL.md (Level III-f).
>
> This document does NOT create new concepts, redefined existing models, introduce
> ontological terms, specify business rules, describe implementation, or prescribe
> technology. Its sole function is to **integrate** all cognitive models into a
> coherent architecture: defining how they interact, what each produces and consumes,
> what boundaries separate them, and what invariants govern the whole.
>
> Every rule herein is binding on Level IV documents. Violations are implementation debt
> managed under S-P9.

---

## Table of Contents

1. [Preamble — What This Architecture Is](#1-preamble--what-this-architecture-is)
2. [Logical Architecture Overview](#2-logical-architecture-overview)
3. [Component Responsibilities](#3-component-responsibilities)
4. [Contracts Between Models](#4-contracts-between-models)
5. [The Complete Cognitive Flow](#5-the-complete-cognitive-flow)
6. [Phase 1: Perception — Signal to Evidence](#6-phase-1-perception--signal-to-evidence)
7. [Phase 2: Reasoning — Evidence to Knowledge](#7-phase-2-reasoning--evidence-to-knowledge)
8. [Phase 3: Commitment — Knowledge to Commitment](#8-phase-3-commitment--knowledge-to-commitment)
9. [Phase 4: Projection — Commitment to Action](#9-phase-4-projection--commitment-to-action)
10. [Learning Feedback Loop](#10-learning-feedback-loop)
11. [Dependencies and Boundaries](#11-dependencies-and-boundaries)
12. [Integration Points](#12-integration-points)
13. [Coordination Rules](#13-coordination-rules)
14. [Propagation Rules](#14-propagation-rules)
15. [Conceptual Synchronization Rules](#15-conceptual-synchronization-rules)
16. [Reconstruction Rules](#16-reconstruction-rules)
17. [Observability Rules](#17-observability-rules)
18. [Evolution Rules](#18-evolution-rules)
19. [Architectural Invariants](#19-architectural-invariants)
20. [Delegation to Implementation Documents](#20-delegation-to-implementation-documents)

---

## 1. Preamble — What This Architecture Is

### 1.1 Purpose

This document specifies the **Cognitive Architecture** of AITOS: the complete logical
organization of the system's cognitive components, their responsibilities, the contracts
between them, the end-to-end flow of information from perception to action, and the
invariants that govern the whole.

The Cognitive Architecture is the **blueprint of the mind** of AITOS. It defines how the
Evidence Model, Decision Model, Commitment Model, Certainty Calculus, Knowledge Model,
Channel Adapter, and Action Executor integrate into a unified cognitive system.

### 1.2 Scope

This document governs:

1. **Logical architecture** — the components of the cognitive system and their
   organization.
2. **Component responsibilities** — what each component does and does not do.
3. **Contracts between models** — the interfaces through which models interact.
4. **The complete cognitive flow** — how information moves from Signal to Action.
5. **Dependencies** — what each component requires from others.
6. **Boundaries** — where each model starts and ends.
7. **Integration points** — where models connect and hand off.
8. **Coordination rules** — how models interact without coupling.
9. **Propagation rules** — how information flows through the system.
10. **Synchronization rules** — how conceptual consistency is maintained.
11. **Reconstruction rules** — how the system recovers from failure.
12. **Observability rules** — how cognitive processes are monitored.
13. **Evolution rules** — how the architecture grows.
14. **Architectural invariants** — properties that must always hold.

This document does **NOT** govern:

- The Evidence lifecycle or Evidence Store structure (see EVIDENCE_MODEL.md).
- The Decision space or Decision lifecycle (see DECISION_MODEL.md).
- The Commitment state machine or lifecycle (see COMMITMENT_MODEL.md).
- The Certainty computation, propagation, or aggregation (see CERTAINTY_CALCULUS.md).
- The Knowledge State structure or Knowledge types (see KNOWLEDGE_MODEL.md).
- The Channel adaptation or conversation memory structure (see CHANNEL_ADAPTER.md).
- The Action execution or operational projection (see ACTION_EXECUTOR.md).
- Any business rule, domain logic, or transportation operation.
- Any implementation technology, data structure, algorithm, or infrastructure.

### 1.3 Authority hierarchy

| Source document | Relationship to this document |
|---|---|
| **CONSTITUTION.md** (Level I-a) | Source of supreme principles: §3 (Epistemic Stance), S-P1 (Evidence-Based Operation), S-P4 (Deterministic Core), S-P5 (Evidence Immutability), S-P6 (Knowledge Preservation), S-P7 (Human Escalation), S-P8 (Preservation over operation), P-I1 (Evidence Primacy), P-I4 (Humility Before Uncertainty), P-I5 (Auditability) |
| **SYSTEM_VOCABULARY.md** (Level I-b) | Source of all terminology: Cognitive Cycle (7.1), all four phases (7.2-7.5), Knowledge State (6.1), Evidence Store (5.3), Decision (8.1), Commitment (8.2), Operational Projection (9.2), Action (12.1), Learning (13.3) |
| **COGNITIVE_PRINCIPLES.md** (Level II-a) | Source of all cognitive principles: CP-01 through CP-39, especially those governing cycle structure, perception, reasoning, commitment, projection, interaction, and learning |
| **EVIDENCE_MODEL.md** (Level III-a) | Defines Evidence lifecycle consumed by the architecture; sibling document |
| **DECISION_MODEL.md** (Level III-b) | Defines Decision process consumed by the Commitment Phase; sibling document |
| **COMMITMENT_MODEL.md** (Level III-c) | Defines Commitment lifecycle consumed by the Projection Phase; sibling document |
| **CERTAINTY_CALCULUS.md** (Level III-d) | Defines Certainty as the qualifier flowing through all phases; sibling document |
| **KNOWLEDGE_MODEL.md** (Level III-f) | Defines Knowledge State that is the central hub of the architecture; sibling document |
| **CHANNEL_ADAPTER.md** (Level III-e) | Defines the perception interface from channels; sibling document |
| **ACTION_EXECUTOR.md** (Level III-g) | Defines the action execution from projection; sibling document |

### 1.4 Reading this document

Each rule in this document follows this uniform format:

```
### R-CA-NNN — Name of the rule

**Enunciado:** The normative architectural statement.

**Derivación Constitucional:** Source principles and model rules.

**Justificación:** Why this architectural rule exists.

**Implicaciones Arquitectónicas:** What this rule means for component design.

**Impacto Conversacional:** The observable improvement in user experience.

**Verificación:** How to test compliance.

**Delegación:** Which document(s) receive the implementation mandate.
```

---

## 2. Logical Architecture Overview

### R-CA-001 — The cognitive architecture has seven logical components

**Enunciado:** The cognitive architecture of AITOS is composed of seven logical
components, each defined by a Level III document:

| # | Component | Governing Document | Primary Function |
|---|---|---|---|
| 1 | **Channel Adapter** | CHANNEL_ADAPTER.md | Perceive Signals from external channels; present Responses |
| 2 | **Evidence Engine** | EVIDENCE_MODEL.md | Transform Signals into Evidence; maintain the Evidence Store |
| 3 | **Certainty Calculus** | CERTAINTY_CALCULUS.md | Compute and propagate Certainty for all Beliefs |
| 4 | **Knowledge State** | KNOWLEDGE_MODEL.md | Maintain the organized body of Beliefs, Hypotheses, Commitments |
| 5 | **Reasoning Engine** | DECISION_MODEL.md | Generate Hypotheses, resolve ambiguity, prepare Decisions |
| 6 | **Commitment Gate** | COMMITMENT_MODEL.md | Gate Commitments by Certainty Threshold and Cost of Error |
| 7 | **Action Executor** | ACTION_EXECUTOR.md | Translate Commitments into Actions; execute Projections |

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §7.1 (Cognitive Cycle phases); CP-01 (ciclo
completo — toda unidad de trabajo debe completar las cuatro fases); CP-02 (secuencia
estricta); delegaciones de todos los Level III documentos a COGNITIVE_ARCHITECTURE.md.

**Justificación:** These seven components are the minimum necessary to satisfy the
Cognitive Cycle defined in SYSTEM_VOCABULARY.md §7.1 and the principles defined in
COGNITIVE_PRINCIPLES.md. Each component has a single responsibility and a single
governing document. No component can be removed without breaking the cycle. No
additional component is needed for cognitive completeness.

**Implicaciones Arquitectónicas:**
- Each component is defined by exactly one Level III document.
- Each component has a clear boundary and a single responsibility.
- Components interact through well-defined contracts (see Section 4).
- No component can assume knowledge of another component's internal state.
- All seven components must be present for the cognitive system to be complete.

**Impacto Conversacional:** La arquitectura está completa porque cubre todas las
funciones cognitivas necesarias. El usuario nunca encuentra un "hueco" donde el
sistema no sepa qué hacer — desde percibir el mensaje hasta ejecutar la acción,
cada paso está gobernado por un componente con una responsabilidad clara.

**Verificación:** ¿Existe alguna función cognitiva necesaria que no esté asignada a uno
de los siete componentes? Si sí → brecha arquitectónica.

**Delegación:** Cada componente se delega a su documento Level III correspondiente.

---

### R-CA-002 — The cognitive flow follows four sequential phases

**Enunciado:** The seven components operate within four sequential phases that
constitute the Cognitive Cycle (SYSTEM_VOCABULARY.md §7.1). Each phase consumes the output
of the previous phase and produces the input for the next:

```
Signal → [Perception Phase] → Evidence → [Reasoning Phase] → Knowledge State
  → [Commitment Phase] → Commitment → [Projection Phase] → Action
```

The seven components map to these phases as follows:

| Phase | Components Involved | Input | Output |
|---|---|---|---|
| **Perception** | Channel Adapter → Evidence Engine | Signal | Evidence (in Evidence Store) |
| **Reasoning** | Knowledge State + Certainty Calculus + Reasoning Engine | Evidence | Updated Knowledge State |
| **Commitment** | Commitment Gate + Decision Model | Knowledge State | Commitment |
| **Projection** | Action Executor + Knowledge State | Commitment | Action (Response + Operational Projection) |

**Derivación Constitucional:** CP-01 (ciclo completo); CP-02 (secuencia estricta);
CP-03 (completitud por fase); SYSTEM_VOCABULARY.md §7.2-7.5 (definición de cada fase).

**Justificación:** The four-phase sequence is not arbitrary — each phase transforms
information into a form that the next phase requires. Perception converts raw Signals
into structured Evidence. Reasoning converts Evidence into interpreted Knowledge.
Commitment converts Knowledge into actionable commitments. Projection converts
Commitments into real-world Actions. Breaking this sequence would produce actions
without epistemic foundation.

**Implicaciones Arquitectónicas:**
- The phases are strictly sequential: no phase can begin before the previous phase
  completes.
- Each phase has a completion criterion (CP-03).
- Components may participate in multiple phases, but each phase has a primary
  responsible component.
- The flow is unidirectional: information moves forward; feedback loops are handled
  by the Learning cycle, not by phase reversal.

**Impacto Conversacional:** El sistema procesa mensajes de principio a fin sin
saltos ni atajos. Cada mensaje del usuario pasa por el mismo proceso cognitivo
completo, garantizando que ninguna información se pierde ni se salta pasos críticos
como la verificación de certidumbre antes de actuar.

**Verificación:** ¿Existe alguna ruta donde la información pase de una fase a otra no
adyacente (saltándose una fase intermedia)? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el secuenciador de fases).

---

### R-CA-003 — The architecture is layered vertically by epistemic distance

**Enunciado:** The seven components are organized in three vertical layers by their
distance from raw perception:

1. **Sensory Layer** (closest to input): Channel Adapter, Evidence Engine
2. **Cognitive Layer** (interpretation and decision): Knowledge State, Certainty
   Calculus, Reasoning Engine, Commitment Gate
3. **Executive Layer** (closest to output): Action Executor

Each layer may only interact with its adjacent layer. The Sensory Layer does not
access the Executive Layer directly. The Executive Layer does not access the Sensory
Layer directly.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §14 (Prohibited Cross-Domain Violations:
"Decision directly reads Perception" is prohibited; "Business directly reads Evidence"
is prohibited); CP-28 (proyección de solo lectura — la Proyección no modifica el
Knowledge State).

**Justificación:** Layering by epistemic distance enforces the principle that
information must be progressively interpreted before it can drive action. Raw Signals
(Sensory) must be interpreted into Evidence before they enter cognition. Cognitive
results must be committed before they drive execution. Skipping layers would allow
raw perceptions to drive actions without cognitive processing, violating S-P1.

**Implicaciones Arquitectónicas:**
- The Sensory Layer writes to the Evidence Store and stops.
- The Cognitive Layer reads from the Evidence Store and writes to the Knowledge State.
- The Executive Layer reads from the Knowledge State (via Commitments) and produces
  Actions.
- No layer bypasses another: the Executive Layer cannot read raw Evidence.
- The Learning feedback loop is an exception: it feeds outcomes back to the Cognitive
  Layer, but always through the Evidence Store (outcomes become Evidence).

**Impacto Conversacional:** El sistema nunca actúa sobre información no procesada.
No hay respuestas basadas en "eso dijo el usuario" sin pasar por interpretación y
verificación. La respuesta final siempre refleja el procesamiento cognitivo completo.

**Verificación:** ¿Existe alguna ruta donde la capa ejecutiva acceda directamente a
datos de la capa sensorial sin pasar por la capa cognitiva? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define los gates entre capas).

---

## 3. Component Responsibilities

### R-CA-004 — Channel Adapter responsibility

**Enunciado:** The Channel Adapter is responsible for: (a) receiving raw Signals from
external channels, (b) verifying authenticity (HMAC, rate limiting, idempotency),
(c) classifying the Source and Channel of the Signal, (d) delivering the verified
Signal to the Evidence Engine, (e) receiving Responses from the Action Executor, and
(f) delivering Responses to the appropriate channel in the appropriate format.

The Channel Adapter does NOT extract meaning, interpret intent, or perform any
cognitive operation on the Signal.

**Derivación Constitucional:** CP-05 (frontera percepción/evidencia); CP-07
(determinismo perceptual); SYSTEM_VOCABULARY.md §7.2 (Perception Phase); CHANNEL_ADAPTER.md
(responsabilidad del adaptador).

**Justificación:** The Channel Adapter is the system's sensory organ. Its job is to
receive and verify, not to understand. Separating reception from interpretation
ensures that the raw Signal is preserved before any cognitive processing occurs
(CP-06: registro antes de interpretación).

**Implicaciones Arquitectónicas:**
- The Channel Adapter is the only component with external I/O responsibility.
- It has no access to the Knowledge State, Evidence Store, or any cognitive structure.
- It produces verified Signals; it does not produce Evidence.
- It consumes formatted Responses; it does not produce content.

**Impacto Conversacional:** El sistema recibe y entrega mensajes de forma confiable
sin alterar su contenido. La integridad del mensaje original se preserva antes de
cualquier interpretación.

**Verificación:** ¿Realiza el Channel Adapter alguna operación cognitiva (extracción,
clasificación, inferencia) sobre el Signal? Si sí → violación de responsabilidad.

**Delegación:** CHANNEL_ADAPTER.md (define la interfaz de canal).

---

### R-CA-005 — Evidence Engine responsibility

**Enunciado:** The Evidence Engine is responsible for: (a) receiving verified Signals
from the Channel Adapter, (b) transforming Signals into Observations and Facts,
(c) registering Facts as Evidence in the Evidence Store with Source attribution,
Confidence, and full traceability, (d) managing the append-only lifecycle of the
Evidence Store, and (e) providing read access to the Evidence Store for the Cognitive
Layer.

The Evidence Engine does NOT form Beliefs, compute Certainty, make Decisions, or
generate Responses.

**Derivación Constitucional:** CP-05 (frontera percepción/evidencia); CP-06 (registro
antes de interpretación); CP-08 (inmutabilidad); EVIDENCE_MODEL.md R-EM-001 a R-EM-003
(pipeline y registro).

**Justificación:** The Evidence Engine is the gatekeeper of epistemic integrity. It
ensures that only properly registered Evidence enters the cognitive system. By
separating Evidence formation from Belief formation, the architecture guarantees
that all downstream cognition operates on a complete and immutable record of what
was perceived.

**Implicaciones Arquitectónicas:**
- The Evidence Engine is the only component that writes to the Evidence Store.
- All other components read from the Evidence Store but never write.
- The Evidence Engine operates deterministically (CP-07).
- The Evidence Engine has no knowledge of Beliefs, Decisions, or Commitments.

**Impacto Conversacional:** El sistema preserva un registro inmutable de todo lo que
el usuario dice. Nunca "pierde" un mensaje ni modifica lo dicho. Esto permite
auditar cualquier decisión hasta el mensaje original.

**Verificación:** ¿Existe algún componente que escriba en el Evidence Store sin pasar
por el Evidence Engine? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define el pipeline y almacén).

---

### R-CA-006 — Knowledge State responsibility

**Enunciado:** The Knowledge State component is responsible for: (a) maintaining the
organized set of Beliefs, Evidence references, active Hypotheses, Commitments,
semantic relationships, and temporal context, (b) providing a unified read interface
for all cognitive components, (c) managing the Active and Archive layers, (d) ensuring
consistency across all Knowledge elements, and (e) supporting temporal reconstruction
of past states.

The Knowledge State does NOT compute Certainty, make Decisions, generate Hypotheses,
or execute Actions.

**Derivación Constitucional:** KNOWLEDGE_MODEL.md R-KM-001 (naturaleza del
conocimiento); R-KM-009 (capas Active y Archive); R-KM-011 (seis componentes);
CP-30 (preservación entre ciclos).

**Justificación:** The Knowledge State is the central hub of the cognitive architecture.
Every component reads from it or writes to it. Centralizing all Knowledge in a single
logical component ensures consistency and prevents the fragmentation of epistemic
authority across multiple components.

**Implicaciones Arquitectónicas:**
- The Knowledge State is read by: Reasoning Engine, Commitment Gate, Action Executor.
- The Knowledge State is written by: Reasoning Engine (Beliefs, Hypotheses),
  Commitment Gate (Commitments).
- The Knowledge State is the single source of truth for "what the system knows."
- All components access the Knowledge State through its defined interface.

**Impacto Conversacional:** Todo lo que el sistema sabe está unificado y es
consistente. No hay información contradictoria entre componentes porque todos leen
del mismo Knowledge State. El usuario recibe respuestas coherentes.

**Verificación:** ¿Existe algún componente que mantenga su propio estado cognitivo
fuera del Knowledge State? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define la estructura y gestión del Knowledge
State).

---

### R-CA-007 — Certainty Calculus responsibility

**Enunciado:** The Certainty Calculus component is responsible for: (a) computing the
Certainty of each Belief from its supporting Evidence and Source Confidence, (b)
propagating Certainty changes through the semantic relationship network, (c) managing
Certainty degradation over time, (d) supporting Certainty recovery through
reconfirmation, (e) providing Certainty values for the Commitment Gate, and (f)
recalibrating from outcome feedback.

The Certainty Calculus does NOT form Beliefs, make Decisions, or gate Commitments.
It computes Certainty; it does not decide what to do with it.

**Derivación Constitucional:** CERTAINTY_CALCULUS.md R-CC-001 (propiedad de toda
Belief); R-CC-021 (propagación); R-CC-039 (recalibración); CP-18 (certidumbre
continua); CP-19 (degradación).

**Justificación:** Certainty is a specialized computation that requires its own
component because: (a) it is used by multiple other components (Reasoning, Commitment,
Learning), (b) it has complex propagation rules through the semantic network, and
(c) it requires recalibration from outcomes. Isolating it prevents duplication of
computation logic.

**Implicaciones Arquitectónicas:**
- The Certainty Calculus reads from the Knowledge State (Beliefs, relationships).
- The Certainty Calculus writes Certainty values to the Knowledge State.
- The Certainty Calculus is invoked by: Reasoning Engine (when Beliefs change),
  Commitment Gate (when evaluating threshold), Learning (when recalibrating).

**Impacto Conversacional:** El sistema expresa confianza de manera consistente. Todas
las creencias tienen un nivel de certidumbre bien definido, y cuando una creencia
cambia, las creencias relacionadas se actualizan automáticamente. No hay Beliefs
"huérfanas" con certidumbre desactualizada.

**Verificación:** ¿Existe algún Belief en el Knowledge State cuya certidumbre no haya
sido computada por el Certainty Calculus? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS.md (define el cómputo, propagación y
recalibración).

---

### R-CA-008 — Reasoning Engine responsibility

**Enunciado:** The Reasoning Engine is responsible for: (a) reading new Evidence from
the Evidence Store, (b) integrating it into the Knowledge State by forming, updating,
or invalidating Beliefs, (c) generating and maintaining multiple Hypotheses when
Evidence is ambiguous, (d) resolving Hypotheses through Evidence accumulation, (e)
identifying Knowledge gaps and Critical Information Needs, and (f) preparing the
Knowledge State for the Commitment Phase.

The Reasoning Engine does NOT make Commitments, execute Actions, or generate external
Responses. It prepares the epistemic foundation; it does not decide what to do.

**Derivación Constitucional:** CP-13 (Hipótesis múltiples); CP-14 (condición de
falsación); CP-15 (fusión conservadora); CP-16 (coexistencia de intenciones); CP-17
(resolución por Evidence); SYSTEM_VOCABULARY.md §7.3 (Reasoning Phase).

**Justificación:** Reasoning is the most complex cognitive operation. It must be
isolated from Commitment to prevent the system from biasing its interpretation toward
a desired action. Separating "what is true" (Reasoning) from "what to do about it"
(Commitment) is the architectural expression of epistemic humility (CONSTITUTION.md
§3.5).

**Implicaciones Arquitectónicas:**
- The Reasoning Engine reads from: Evidence Store, Knowledge State.
- The Reasoning Engine writes to: Knowledge State (Beliefs, Hypotheses, relationships).
- The Reasoning Engine invokes: Certainty Calculus (to compute/update Certainties).
- The Reasoning Engine operates before the Commitment Gate in the cycle sequence.

**Impacto Conversacional:** El sistema primero entiende antes de actuar. No "decide"
lo que el usuario quiere basándose en suposiciones — primero interpreta la evidencia,
considera alternativas, y solo entonces pasa a la decisión. Esto evita acciones
precipitadas basadas en interpretaciones incorrectas.

**Verificación:** ¿Existe algún camino donde el sistema tome una decisión operacional
sin que el Reasoning Engine haya procesado la nueva Evidence? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el proceso de razonamiento y formación de
hipótesis).

---

### R-CA-009 — Commitment Gate responsibility

**Enunciado:** The Commitment Gate is responsible for: (a) evaluating the Knowledge
State against the Commitment Threshold for each active Decision, (b) comparing the
Certainty of relevant Beliefs against the threshold derived from Cost of Error and
Strategic Posture, (c) producing a Commitment when the threshold is met, (d) selecting
CLARIFY when the threshold is not met but the gap can be resolved through user
interaction, (e) selecting ESCALATE when the threshold is not met and the system
cannot resolve the gap, (f) recording the Commitment with full traceability, and (g)
updating the Knowledge State with the new Commitment.

The Commitment Gate does NOT form Beliefs, generate Hypotheses, compute Certainty,
or execute Actions. It gates Commitment; it does not create content.

**Derivación Constitucional:** COMMITMENT_MODEL.md R-CM-005 (Commitment Gate);
DECISION_MODEL.md R-DM-008 (precondiciones); CP-22 (Compromiso explícito); CP-23
(Umbral dinámico); CP-24 (Costo de error); CP-25 (Clarificación por pregunta directa).

**Justificación:** The Commitment Gate is the safety mechanism of the cognitive
architecture. It ensures that no operational Commitment is made without sufficient
epistemic justification. By isolating gating from reasoning, the architecture
guarantees that the threshold evaluation is not biased by the reasoning process.

**Implicaciones Arquitectónicas:**
- The Commitment Gate reads from: Knowledge State (Beliefs, Certainties).
- The Commitment Gate writes to: Knowledge State (Commitments).
- The Commitment Gate invokes: Certainty Calculus (threshold comparison).
- The Commitment Gate receives: Cost of Error and Strategic Posture from the Decision
  Model.
- The Commitment Gate is invoked after the Reasoning Engine completes.

**Impacto Conversacional:** El sistema nunca se compromete con información insuficiente.
Si no está suficientemente seguro, pide clarificación o deriva a un humano. El usuario
nunca experimenta acciones incorrectas basadas eninterpretaciones débiles.

**Verificación:** ¿Existe algún Commitment activo en el Knowledge State que no haya
pasado por el Commitment Gate? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define el Gate y el lifecycle del compromiso).

---

### R-CA-010 — Action Executor responsibility

**Enunciado:** The Action Executor is responsible for: (a) reading Commitments from
the Knowledge State, (b) deriving the Operational Projection from active Commitments,
(c) generating the external Response to the user through the Channel Adapter, (d)
executing operational Actions (database writes, dispatch, notifications) that
correspond to Commitments, (e) recording the outcome of each Action as new Evidence,
and (f) reporting execution results back to the cognitive layer.

The Action Executor does NOT make Commitments, form Beliefs, or compute Certainty.
It executes; it does not decide.

**Derivación Constitucional:** CP-27 (Proyección derivada); CP-28 (Proyección de solo
lectura); CP-35 (Explicación antes de acción); SYSTEM_VOCABULARY.md §7.5 (Projection Phase);
ACTION_EXECUTOR.md (responsabilidades del ejecutor).

**Justificación:** Separating execution from decision prevents the system from
"deciding by doing." The Action Executor takes a Commitment and makes it real. If
execution were combined with decision, the system could commit implicitly through
action without passing through the Commitment Gate.

**Implicaciones Arquitectónicas:**
- The Action Executor reads from: Knowledge State (Commitments).
- The Action Executor writes to: Evidence Store (outcome Evidence), external systems.
- The Action Executor invokes: Channel Adapter (to send Response).
- The Action Executor is the final phase of the Cognitive Cycle.
- The Action Executor produces outcome Evidence that feeds back into the Learning
  loop.

**Impacto Conversacional:** El sistema hace lo que dice que va a hacer. No hay
acciones no autorizadas ni decisiones implícitas. Cada acción está respaldada por
un Commitment explícito que el usuario puede verificar.

**Verificación:** ¿Existe alguna acción externa que no esté respaldada por un
Commitment explícito en el Knowledge State? Si sí → violación.

**Delegación:** ACTION_EXECUTOR.md (define la ejecución de acciones desde
Commitments).

---

## 4. Contracts Between Models

### R-CA-011 — Channel Adapter → Evidence Engine contract

**Enunciado:** The Channel Adapter delivers a `VerifiedSignal` to the Evidence Engine.
The contract requires:

- **Channel Adapter provides:** VerifiedSignal with raw content, channel metadata,
  Source classification, timestamp, and idempotency key.
- **Evidence Engine guarantees:** Registered Evidence in the Evidence Store with
  full traceability, or a registration failure signal.
- **Boundary:** The Channel Adapter does not interpret the Signal content. The
  Evidence Engine does not access the channel.

**Derivación Constitucional:** CP-05 (frontera percepción/evidencia); CP-06 (registro
antes de interpretación); CP-07 (determinismo perceptual); CHANNEL_ADAPTER.md y
EVIDENCE_MODEL.md (responsabilidades respectivas).

**Justificación:** A clear contract between reception and registration ensures that
the raw Signal is preserved before any interpretation occurs. The Channel Adapter
cannot refuse a Signal based on content; the Evidence Engine cannot modify the
channel metadata.

**Implicaciones Arquitectónicas:**
- The contract is one-way: Channel Adapter → Evidence Engine.
- Both components are in the Sensory Layer.
- Failure in either component results in cycle abortion with escalation.

**Impacto Conversacional:** Todo mensaje que llega se registra antes de interpretarse.
El sistema nunca "pierde" un mensaje porque el registro es anterior al procesamiento.

**Verificación:** ¿Existe algún flujo donde el Evidence Engine reciba un Signal sin
los metadatos completos del canal? Si sí → violación del contrato.

**Delegación:** CHANNEL_ADAPTER.md (define el formato de VerifiedSignal),
EVIDENCE_MODEL.md (define el registro de Evidence).

---

### R-CA-012 — Evidence Engine → Cognitive Layer contract

**Enunciado:** The Evidence Engine provides read-only access to the Evidence Store for
the Reasoning Engine and other cognitive components. The contract requires:

- **Evidence Engine provides:** Deterministic query interface by proposition, time
  range, Source, and Confidence. Returns Evidence records with full provenance.
- **Cognitive Layer guarantees:** Read-only access — no component modifies or deletes
  Evidence. Every read is traced for auditability.
- **Boundary:** The Evidence Engine does not know which component is reading or why.
  The cognitive components do not write to the Evidence Store.

**Derivación Constitucional:** CP-08 (inmutabilidad); EVIDENCE_MODEL.md R-EM-049
(Evidence Store como fundación); R-EM-050 (Hypothesis Network reads only).

**Justificación:** The Evidence Store is append-only. The contract enforces this by
providing only read operations to the cognitive layer. Any write must go through the
Evidence Engine, which only appends.

**Implicaciones Arquitectónicas:**
- The Evidence Store is the single source of perceived truth.
- All cognitive components read from the same Evidence Store.
- Read operations are deterministic and idempotent.
- Write operations are append-only and exclusively through the Evidence Engine.

**Impacto Conversacional:** La base de todo lo que el sistema sabe es sólida e
inmutable. No hay riesgo de que procesos cognitivos modifiquen o corrompan la
evidencia original.

**Verificación:** ¿Existe alguna operación de escritura en el Evidence Store desde
un componente cognitivo? Si sí → violación del contrato.

**Delegación:** EVIDENCE_MODEL.md (define la interfaz de solo lectura).

---

### R-CA-013 — Knowledge State → Cognitive Components contract

**Enunciado:** The Knowledge State provides a unified read/write interface for all
cognitive components. The contract requires:

- **Knowledge State provides:** A structured query interface for Beliefs (by
  proposition, certainty range, temporal scope), active Hypotheses, Commitments,
  and semantic relationships. Provides atomic update operations for Beliefs,
  Hypotheses, and Commitments.
- **Cognitive Components guarantee:** Every write includes provenance (which component,
  which cycle, based on which Evidence). Reads are used only for their intended
  cognitive purpose.
- **Boundary:** The Knowledge State does not validate the epistemic validity of
  writes (that is the responsibility of each component). Components do not access
  each other's internal state through the Knowledge State.

**Derivación Constitucional:** KNOWLEDGE_MODEL.md R-KM-004 (única fuente de autoridad
cognitiva); R-KM-051 (Decisiones leen del Knowledge State); CP-30 (preservación entre
ciclos).

**Justificación:** The Knowledge State is the hub of the cognitive architecture. A
single interface prevents fragmentation and ensures all components operate on the
same epistemic reality.

**Implicaciones Arquitectónicas:**
- The Knowledge State interface is the most heavily used contract.
- Reads are more frequent than writes (the Knowledge State is read by every component).
- Writes are validated for format but not for epistemic content.
- The Knowledge State maintains consistency invariants across all elements.

**Impacto Conversacional:** Todos los componentes cognitivos comparten la misma
comprensión de la situación. No hay discrepancias entre lo que el sistema "cree"
(Reasoning) y lo que el sistema "decide" (Commitment).

**Verificación:** ¿Existe algún componente cognitivo que mantenga su propia copia del
estado cognitivo en lugar de leer del Knowledge State? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define la interfaz del Knowledge State).

---

### R-CA-014 — Commitment Gate → Action Executor contract

**Enunciado:** The Commitment Gate delivers a `FormedCommitment` to the Action
Executor. The contract requires:

- **Commitment Gate provides:** A Commitment record with: type (informational/
  operational), the Beliefs and Certainties that justified it, the Cost of Error
  assessment, the Strategic Posture at commitment time, and the trace ID linking
  to the originating Evidence.
- **Action Executor guarantees:** The Commitment is executed or a failure is reported.
  The execution outcome is recorded as new Evidence.
- **Boundary:** The Commitment Gate does not verify execution (that is the Executor's
  responsibility). The Action Executor does not question the Commitment's validity.

**Derivación Constitucional:** COMMITMENT_MODEL.md R-CM-005 (Commitment Gate);
CP-27 (Proyección derivada); CP-35 (Explicación antes de acción).

**Justificación:** The contract between Commitment and Execution must be explicit and
unambiguous. The Commitment says "what to do and why." The Executor says "done" or
"failed." There is no feedback loop between them during the cycle — execution does
not modify the Commitment.

**Implicaciones Arquitectónicas:**
- The contract is one-way: Commitment Gate → Action Executor.
- The Action Executor reports outcomes as new Evidence (not as Commitment feedback).
- Execution failure does not revoke the Commitment (revocation requires a new cycle).

**Impacto Conversacional:** El sistema ejecuta los compromisos de manera confiable.
Si algo falla en la ejecución, el usuario recibe una explicación clara porque la
falla se registra como evidencia que alimenta el siguiente ciclo.

**Verificación:** ¿Existe alguna ruta donde el Action Executor modifique un Commitment
en lugar de ejecutarlo o reportar falla? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define el Commitment), ACTION_EXECUTOR.md
(define la ejecución).

---

### R-CA-015 — Action Executor → Channel Adapter contract

**Enunciado:** The Action Executor delivers a `FormattedResponse` to the Channel
Adapter for delivery to the user. The contract requires:

- **Action Executor provides:** Response content, target channel, target user,
  response type, and correlation ID linking to the Cognitive Cycle.
- **Channel Adapter guarantees:** Delivery attempt to the target channel, or a
  delivery failure report.
- **Boundary:** The Action Executor does not format for specific channels (it produces
  channel-agnostic content). The Channel Adapter does not modify the response content.

**Derivación Constitucional:** CHANNEL_ADAPTER.md (definición del adaptador);
CP-33 (acompañamiento continuo); SYSTEM_VOCABULARY.md §12.2 (Response).

**Justificación:** Separating content generation (Action Executor) from channel
formatting (Channel Adapter) allows the same cognitive content to be delivered
through any channel without cognitive reprocessing.

**Implicaciones Arquitectónicas:**
- The Action Executor produces semantic content, not channel-specific formatting.
- The Channel Adapter adds channel-specific formatting (WhatsApp markup, SMS length
  limits, etc.).
- Delivery failure is reported as Evidence for the next cycle.

**Impacto Conversacional:** El mismo contenido cognitivo se entrega correctamente
sin importar el canal. El usuario recibe el mensaje que el sistema decidió enviar,
formateado apropiadamente para su canal.

**Verificación:** ¿Modifica el Channel Adapter el contenido semántico de la respuesta?
Si sí → violación. ¿Incluye el Action Executor formato específico de canal? Si sí →
violación.

**Delegación:** CHANNEL_ADAPTER.md (define el formateo por canal), ACTION_EXECUTOR.md
(define la generación de contenido).

---

## 5. The Complete Cognitive Flow

### R-CA-016 — The cognitive flow has six stages

**Enunciado:** The complete cognitive flow from Signal reception to Action execution
progresses through six sequential stages:

```
Stage 1 — RECEPTION:    Channel receives Signal → verifies → delivers VerifiedSignal
Stage 2 — REGISTRATION:  Evidence Engine transforms Signal → registers Evidence
Stage 3 — REASONING:     Reasoning Engine reads Evidence → updates Knowledge State
Stage 4 — GATING:        Commitment Gate evaluates Certainty → produces Commitment
Stage 5 — PROJECTION:    Action Executor reads Commitment → derives Projection
Stage 6 — EXECUTION:     Action Executor executes Actions → sends Response → records Outcome
```

Each stage completes fully before the next begins. No stage may be skipped,
reordered, or executed in parallel with another.

**Derivación Constitucional:** CP-01 (ciclo completo); CP-02 (secuencia estricta);
CP-03 (completitud por fase); SYSTEM_VOCABULARY.md §7.1 (Cognitive Cycle).

**Justificación:** The six-stage flow is the operationalization of the four-phase
Cognitive Cycle (SYSTEM_VOCABULARY.md §7.1) with the addition of stage-level granularity that
maps directly to component responsibilities. Stage 1-2 = Perception Phase. Stage 3 =
Reasoning Phase. Stage 4 = Commitment Phase. Stage 5-6 = Projection Phase.

**Implicaciones Arquitectónicas:**
- Each stage is owned by a single primary component.
- Each stage has a well-defined input and output.
- Stages are sequential and synchronous within a single Cognitive Cycle.
- The flow is linear for the main cycle; feedback loops (learning) are asynchronous.

**Impacto Conversacional:** Cada mensaje sigue un flujo predecible y completo desde
que llega hasta que el sistema responde. No hay "cortocircuitos" donde el sistema
responda sin haber pasado por todas las etapas cognitivas.

**Verificación:** ¿Existe algún flujo donde una etapa se ejecute fuera de secuencia
o se omita? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el secuenciador del flujo).

---

### R-CA-017 — Each stage has a completion criterion

**Enunciado:** Each of the six stages has a specific completion criterion. The cycle
cannot advance to the next stage until the current stage's criterion is met:

| Stage | Completion Criterion |
|---|---|
| RECEPTION | Signal verified, idempotency checked, rate limit checked, or failure escalated |
| REGISTRATION | Evidence registered in Evidence Store, or registration failure escalated |
| REASONING | Knowledge State updated with new Evidence, Hypotheses resolved or identified as unresolvable, or reasoning timeout escalated |
| GATING | COMMIT produced, or CLARIFY determined, or ESCALATE determined |
| PROJECTION | Operational Projection derived from Commitment, or projection failure identified |
| EXECUTION | Response sent, operational Actions executed, Outcome recorded, or execution failure reported |

**Derivación Constitucional:** CP-03 (completitud por fase — cada fase tiene un
criterio de completitud definido); CP-04 (límite temporal — si no se completa en el
tiempo, escalar).

**Justificación:** Without explicit completion criteria, a stage could produce partial
output and the cycle would advance with incomplete information. Each criterion defines
what "done" means for that stage and prevents the system from operating on incomplete
cognitive products.

**Implicaciones Arquitectónicas:**
- Each stage's completion criterion is evaluated by the cycle sequencer.
- If a stage cannot complete, the cycle must escalate or abort (per CP-04).
- Partial completion is always treated as failure for that stage.

**Impacto Conversacional:** El sistema nunca avanza con información incompleta.
Si algo no se puede completar (ej., no se puede registrar la evidencia), el sistema
escala a un humano en lugar de continuar con datos incompletos.

**Verificación:** ¿Existe algún escenario donde el ciclo cognitivo avance a la
siguiente etapa sin que la etapa actual haya cumplido su criterio de completitud?
Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el evaluador de completitud).

---

### R-CA-018 — The flow may terminate early under defined conditions

**Enunciado:** The cognitive flow may terminate before reaching EXECUTION under three
conditions only:

1. **ESCALATION**: The Commitment Gate determines that Certainty is insufficient and
   the gap cannot be resolved through clarification. The system escalates to a human
   operator and records the escalation as an outcome.
2. **CLARIFICATION**: The Commitment Gate determines that Certainty is insufficient
   but the gap can be resolved through user interaction. The system generates a
   clarification question and awaits further Evidence.
3. **ABORT**: A stage fails to meet its completion criterion within the temporal
   limit (CP-04). The system preserves the Knowledge State, records the abort as
   Evidence, and escalates.

In all three cases, the Knowledge State is preserved. No partial action is taken.

**Derivación Constitucional:** CP-04 (límite temporal); DECISION_MODEL.md R-DM-014
(abstención); R-DM-015 (escalamiento); COMMITMENT_MODEL.md R-CM-020 (escalación);
S-P7 (Human Escalation).

**Justificación:** Early termination is not failure — it is the correct cognitive
response to insufficient information or processing capacity. The system must be
designed to terminate safely when it cannot complete the cycle. Terminating without
action is constitutionally superior to taking action without sufficient foundation.

**Implicaciones Arquitectónicas:**
- Early termination preserves the Knowledge State for resumption.
- The termination reason is recorded as Evidence.
- CLARIFICATION termination pauses the cycle; a new Signal resumes it.
- ESCALATION and ABORT terminate the cycle permanently for this Signal.

**Impacto Conversacional:** Si el sistema no puede procesar un mensaje de manera
segura, lo dice honestamente en lugar de hacer algo incorrecto. "No entendí bien su
solicitud, un operador le asistirá" es mejor que una acción equivocada.

**Verificación:** ¿Existe algún escenario donde el ciclo termine temprano sin
preservar el Knowledge State o sin registrar la causa? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define condiciones de abstención y escalamiento),
COMMITMENT_MODEL.md (define la escalación desde el Gate).

---

## 6. Phase 1: Perception — Signal to Evidence

### R-CA-019 — Perception is deterministic and stateless

**Enunciado:** The Perception Phase (Stages 1-2) must be deterministic (same Signal
produces same Evidence) and stateless (no dependency on previous cycles). It is the
only phase with these constraints.

**Derivación Constitucional:** CP-07 (determinismo perceptual — la Percepción no
puede depender de componentes no deterministas); CP-05 (frontera percepción/evidencia);
SYSTEM_VOCABULARY.md §7.2 (Perception Phase: "purely deterministic," "stateless," "must not
call the LLM").

**Justificación:** The Perception Phase is the foundation of the entire cognitive
system. If it is non-deterministic, all downstream phases operate on unstable
foundations. If it has state, it could introduce bias from previous perceptions.
Determinism and statelessness guarantee that every Signal is evaluated independently
and identically.

**Implicaciones Arquitectónicas:**
- The Channel Adapter and Evidence Engine are the only components with deterministic
  requirements.
- No LLM, no probabilistic model, no heuristic with random variation is permitted
  in this phase.
- State from previous cycles (Knowledge State) is not accessible during Perception.
- The output of Perception (Evidence) is the only bridge to the cognitive layer.

**Impacto Conversacional:** El mismo mensaje siempre produce el mismo registro. El
sistema es predecible y justo: no interpreta el mismo mensaje de manera diferente
según el estado de ánimo o el contexto previo.

**Verificación:** ¿Existe algún componente no determinista en la fase de Percepción?
Si sí → violación.

**Delegación:** CHANNEL_ADAPTER.md (define el proceso determinista de verificación),
EVIDENCE_MODEL.md (define el registro determinista de Evidence).

---

### R-CA-020 — The Evidence Store is written once per cycle

**Enunciado:** In each Cognitive Cycle, the Evidence Engine writes exactly one batch
of Evidence records corresponding to the Signal received. No other component writes
to the Evidence Store during the cycle. Writes are atomic: either all Evidence from
the Signal is registered, or none is.

**Derivación Constitucional:** EVIDENCE_MODEL.md R-EM-002 (append-only); CP-08
(inmutabilidad — ningún proceso cognitivo puede modificar la Evidence); CP-05
(frontera — el registro es el acto que otorga ciudadanía epistémica).

**Justificación:** The Evidence Store is the single source of epistemic truth. If
multiple components wrote to it during a cycle, the store would contain Evidence not
derived from the original Signal, breaking the traceability chain. Atomicity ensures
that the cycle either has all the Evidence from the Signal or none — no partial
registration.

**Implicaciones Arquitectónicas:**
- The Evidence Engine is the sole writer to the Evidence Store.
- Writes occur only during the Perception Phase.
- All Evidence from a Signal is written atomically.
- Failure to write any Evidence record causes the entire batch to fail.

**Impacto Conversacional:** Cada mensaje del usuario produce un conjunto completo y
consistente de evidencia. No hay casos donde "parte del mensaje" esté registrada y
otra parte no.

**Verificación:** ¿Existe algún escenario donde la Evidence Store contenga Evidence
de un ciclo sin que se haya registrado el batch completo? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define el registro atómico de Evidence).

---

## 7. Phase 2: Reasoning — Evidence to Knowledge

### R-CA-021 — Reasoning starts by reading new Evidence

**Enunciado:** The Reasoning Phase begins by reading all new Evidence registered in the
current cycle from the Evidence Store. It then integrates this Evidence into the
Knowledge State by: forming new Beliefs, updating existing Beliefs, generating
Hypotheses, resolving contradictions, and identifying Knowledge gaps.

**Derivación Constitucional:** CP-13 (Hipótesis múltiples); CP-17 (resolución por
Evidence); CP-20 (actualización por Evidence); KNOWLEDGE_MODEL.md R-KM-033 (el
conocimiento evoluciona por adición de Evidence).

**Justificación:** The Reasoning Engine cannot form Beliefs without Evidence. Reading
new Evidence at the start of the phase guarantees that all Reasoning is grounded in
the current cycle's perception. The order of operations (read Evidence → update
Knowledge → generate Hypotheses → resolve) is designed to maximize the use of
available information before making epistemic commitments.

**Implicaciones Arquitectónicas:**
- The Reasoning Engine reads all new Evidence from the Evidence Store.
- The Reasoning Engine reads the current Knowledge State.
- The Reasoning Engine writes updated Beliefs, new Hypotheses, and resolved
  contradictions to the Knowledge State.
- The Reasoning Engine invokes the Certainty Calculus for all new and updated
  Beliefs.

**Impacto Conversacional:** Cada nuevo mensaje se integra con lo que el sistema ya
sabe. El usuario no repite información porque el sistema actualiza su comprensión
en cada ciclo, no comienza desde cero.

**Verificación:** ¿Existe algún caso donde el Reasoning Engine forme Beliefs sin leer
primero la nueva Evidence del ciclo? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el proceso de razonamiento), KNOWLEDGE_MODEL.md
(define la integración Evidence → Beliefs).

---

### R-CA-022 — The Certainty Calculus is invoked after every Knowledge update

**Enunciado:** Whenever the Reasoning Engine creates or updates a Belief in the
Knowledge State, it must invoke the Certainty Calculus to compute or recompute the
Certainty of that Belief. The Certainty Calculus propagates the change through all
semantically related Beliefs.

**Derivación Constitucional:** CERTAINTY_CALCULUS.md R-CC-004 (certeza en toda
Belief); R-CC-021 (propagación por relaciones semánticas); R-CC-022 (la propagación
no crea Evidence); CP-18 (certidumbre continua).

**Justificación:** Certainty is not optional or decorative — it is constitutive of
every Belief. When a Belief changes, its Certainty must be recomputed from the
underlying Evidence. Related Beliefs must have their Certainty updated through
propagation. This ensures the Knowledge State is always internally consistent in
terms of epistemic confidence.

**Implicaciones Arquitectónicas:**
- Every Belief write to the Knowledge State triggers a Certainty computation.
- The Certainty Calculus reads the Belief's supporting Evidence and the semantic
  relationship network.
- Propagation is automatic and synchronous with the Belief update.
- The Certainty Calculus does not write to the Knowledge State directly — it returns
  Certainty values that the Reasoning Engine writes.

**Impacto Conversacional:** Todas las creencias del sistema tienen un nivel de
confianza actualizado y consistente. No hay Beliefs con certidumbre desactualizada
que puedan llevar a decisiones incorrectas.

**Verificación:** ¿Existe alguna Belief actualizada cuya certidumbre no se haya
recomputado? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS.md (define el cómputo y propagación).

---

### R-CA-023 — Hypothesis generation precedes resolution

**Enunciado:** The Reasoning Engine must generate all plausible Hypotheses from the
available Evidence before attempting to resolve any of them. Resolution occurs only
after the Hypothesis set is complete for the current Evidence.

**Derivación Constitucional:** CP-13 (Hipótesis múltiples — generar todas las
interpretaciones plausibles antes de resolver); CP-17 (resolución por Evidence — no
por orden de llegada).

**Justificación:** Generating Hypotheses before attempting resolution prevents
premature commitment to a single interpretation. If the system generates one
Hypothesis and immediately tries to confirm it, it will interpret all subsequent
Evidence to favor that Hypothesis (confirmation bias). Generating all Hypotheses
first ensures each is evaluated against the same Evidence.

**Implicaciones Arquitectónicas:**
- Hypothesis generation is a distinct sub-phase within Reasoning.
- Resolution is a subsequent sub-phase.
- Generated Hypotheses are stored in the Knowledge State as active Hypotheses.
- Only after generation completes does resolution begin.

**Impacto Conversacional:** Cuando el sistema no está seguro, considera todas las
opciones antes de decidir. No se casa con la primera interpretación. Esto resulta
en preguntas de clarificación más inteligentes: "¿Va al aeropuerto o a la terminal?"

**Verificación:** ¿Existe algún flujo donde se resuelva una Hipótesis antes de
generar el conjunto completo de Hipótesis? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el proceso de generación y resolución de
hipótesis).

---

### R-CA-023-A — Transition event: Reasoning → Commitment handoff

**Enunciado:** The transition from Phase 2 (Reasoning) to Phase 3 (Commitment) is
triggered by a discrete handoff event. The Reasoning Phase completes when:
1. All new Evidence has been read and integrated into the Knowledge State.
2. All active Beliefs have updated Certainty values.
3. All plausible Hypotheses have been generated and resolved (or marked as
   unresolvable with identified Critical Information Needs).
4. Consistency verification (R-CA-044) has passed.
5. The Knowledge State is written with the final Reasoning output.

At this point, the Commitment Gate receives control. The handoff contract includes:
- **Reasoning Engine provides:** Updated Knowledge State with Beliefs, Certainties,
  resolved Hypotheses, unresolved CINs, and any CLARIFY or ESCALATE recommendations.
- **Commitment Gate guarantees:** Evaluation of every active Decision against
  Commitment Threshold, producing COMMIT, CLARIFY, or ESCALATE for each.

**Boundary:** The Reasoning Engine does not participate in the Commitment Phase.
The Commitment Gate does not re-open Reasoning. If new Evidence arrives during
Commitment, it is queued for the next Cognitive Cycle.

**Derivación Constitucional:** R-CA-021 (Reasoning starts by reading Evidence);
R-CA-044 (consistency verification at Reasoning completion); CP-01 (Evidence-Based
Operation — el razonamiento debe completarse antes del compromiso).

**Justificación:** Without an explicit handoff, the boundary between "what is true"
(Reasoning) and "what to do about it" (Commitment) is blurred. The handoff enforces
that all reasoning completes before commitment begins, preventing premature decisions.

**Impacto Conversacional:** El sistema completa su análisis antes de decidir. No hay
decisiones basadas en razonamiento incompleto.

**Verificación:** ¿Existe algún camino donde el Commitment Gate evalúe decisiones
antes de que el Reasoning Engine haya completado su fase? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el Commitment Gate y la evaluación de
Decisiones).

---

## 8. Phase 3: Commitment — Knowledge to Commitment

### R-CA-024 — The Commitment Gate evaluates all active Decisions

**Enunciado:** The Commitment Gate evaluates every active Decision in the Knowledge
State against the Commitment Threshold. For each Decision, the Gate compares the
Certainty of the relevant Beliefs against the threshold (derived from Cost of Error
and Strategic Posture) and produces one of three outcomes: COMMIT, CLARIFY, or
ESCALATE.

**Derivación Constitucional:** COMMITMENT_MODEL.md R-CM-005 (Commitment Gate —
precondiciones de entrada); CP-22 (Compromiso explícito); CP-23 (Umbral dinámico);
CP-24 (Costo de error).

**Justificación:** The Commitment Gate is the single point where epistemic quality
meets operational action. It must evaluate all active Decisions because multiple
Decisions may coexist (CP-16). Each Decision has its own threshold based on its own
Cost of Error. The Gate does not prioritize — it evaluates each independently.

**Implicaciones Arquitectónicas:**
- The Commitment Gate reads all active Decisions from the Knowledge State.
- For each Decision, it reads the relevant Beliefs and their Certainties.
- For each Decision, it reads the Cost of Error and Strategic Posture.
- The Gate produces a Commitment record for COMMIT outcomes, a Clarification request
  for CLARIFY, or an Escalation request for ESCALATE.

**Impacto Conversacional:** Cada decisión se evalúa individualmente con su propio
estándar. Una consulta de precio puede aprobarse con menos certidumbre que un
despacho de conductor. El umbral correcto para cada tipo de decisión produce un
comportamiento conversacional natural: no trata todas las decisiones igual.

**Verificación:** ¿Existe algún flujo donde una decisión genere una acción operacional
sin pasar por el Commitment Gate? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define el proceso de gating), DECISION_MODEL.md
(define los umbrales por tipo de decisión).

---

### R-CA-025 — CLARIFY pauses the cycle; COMMIT advances it

**Enunciado:** When the Commitment Gate produces a CLARIFY outcome, the Cognitive
Cycle pauses after generating a clarification question. The system waits for a new
Signal from the user. The Knowledge State is preserved with the current Beliefs and
Hypotheses. When the new Signal arrives, a new cycle begins with the preserved
Knowledge State as input.

When the Gate produces a COMMIT outcome, the cycle advances to the Projection Phase.

**Derivación Constitucional:** CP-25 (Clarificación por pregunta directa); CP-34
(no-repregunta — no preguntar lo que ya se sabe); COMMITMENT_MODEL.md R-CM-006
(transición COMMITTED).

**Justificación:** CLARIFY is not a terminal state — it is a pause. The system has
done its reasoning but needs more Evidence. Pausing preserves all the cognitive work
done and allows the next cycle to continue from where this one left off. This avoids
repetition (CP-34) and makes clarification efficient.

**Implicaciones Arquitectónicas:**
- CLARIFY produces a ClarificationRequest that is passed to the Action Executor.
- The ClarificationRequest contains: what is known, what is missing, and the question.
- The Knowledge State is frozen in its current state for the next cycle.
- COMMIT produces a Commitment that advances the cycle.

**Impacto Conversacional:** Cuando el sistema necesita más información, pregunta
exactamente lo que necesita sin repetir lo que ya sabe. "Tengo el origen como
Asunción — ¿cuál es el destino?" es más eficiente que "¿cuál es el origen y el
destino?"

**Verificación:** ¿En un flujo CLARIFY, se preserva el Knowledge State completo
para el siguiente ciclo? Si no → violación.

**Delegación:** COMMITMENT_MODEL.md (define CLARIFY y COMMIT), DECISION_MODEL.md
(define la formulación de preguntas de clarificación).

---

### R-CA-026 — ESCALATE terminates the cycle with human handoff

**Enunciado:** When the Commitment Gate produces an ESCALATE outcome, the Cognitive
Cycle terminates with a human operator handoff. The system generates an escalation
record containing: the full Knowledge State, the Evidence that was available, the
Reasoning that was performed, the Decisions that could not be resolved, and the
reason for escalation.

**Derivación Constitucional:** S-P7 (Human Escalation); COMMITMENT_MODEL.md R-CM-020
(escalación); DECISION_MODEL.md R-DM-015 (escalamiento); CP-04 (límite temporal).

**Justificación:** ESCALATE is the system's acknowledgment of its epistemic limits.
It is not a failure mode — it is a safety mechanism. The escalation record must be
complete enough for the human operator to understand the situation without having
to repeat the entire conversation.

**Implicaciones Arquitectónicas:**
- ESCALATE produces an EscalationRecord with full cognitive context.
- The EscalationRecord is stored as Evidence (for audit and learning).
- The human operator receives the context and can continue the conversation.
- The cycle terminates; no further processing occurs for this Signal.

**Impacto Conversacional:** Cuando el sistema no puede resolver una situación,
entrega el contexto completo a un operador humano. El usuario no tiene que repetir
nada. "No estoy seguro de haber entendido bien — le transferiré a un operador que
tiene toda la información de nuestra conversación."

**Verificación:** ¿Incluye el escalation record el Knowledge State completo y la
cadena de razonamiento? Si no → violación.

**Delegación:** COMMITMENT_MODEL.md (define el proceso de escalación).

---

## 9. Phase 4: Projection — Commitment to Action

### R-CA-027 — Projection derives the Operational Projection from Commitments

**Enunciado:** The Action Executor reads all active Commitments from the Knowledge
State and derives the Operational Projection: the set of operational actions that
must be taken to fulfill the Commitments. The Projection is a read-only view — it
does not modify the Commitments or create new ones.

**Derivación Constitucional:** CP-27 (Proyección derivada — la Operational Projection
se deriva exclusivamente del Knowledge State); CP-28 (Proyección de solo lectura —
no puede modificarse directamente); SYSTEM_VOCABULARY.md §9.2 (Operational Projection is a
read-only view).

**Justificación:** The Operational Projection is the bridge between cognition and
operation. It translates "what we committed to" (cognitive) into "what we need to
do" (operational). Keeping it read-only prevents operational actions from creating
new cognitive state without going through the cycle.

**Implicaciones Arquitectónicas:**
- The Action Executor reads Commitments from the Knowledge State.
- The Action Executor derives the Projection from Commitments + Operational Model.
- The Projection is ephemeral — it exists only for the duration of the cycle.
- The Projection does not persist in the Knowledge State (only Commitments persist).

**Impacto Conversacional:** Cada acción operacional está directamente vinculada a
un compromiso cognitivo. No hay acciones "huérfanas" que el sistema no pueda
explicar. "Creé el viaje porque usted confirmó el destino."

**Verificación:** ¿Existe alguna Operational Projection que no se derive directamente
de un Commitment activo? Si sí → violación.

**Delegación:** ACTION_EXECUTOR.md (define la derivación de la Proyección).

---

### R-CA-028 — Projection generates a Response and records the Outcome

**Enunciado:** The Action Executor produces two outputs from each Cognitive Cycle:
(1) a **Response** to the user (conversational message), and (2) an **Outcome
record** that captures the result of executing the Projection. The Outcome is
registered as new Evidence in the Evidence Store for the Learning loop.

**Derivación Constitucional:** CP-33 (acompañamiento continuo); CP-35 (Explicación
antes de acción); CP-37 (retroalimentación por outcome); CP-37 (todo outcome debe
registrarse como Evidence).

**Justificación:** Every cognitive cycle produces both communication and operational
reality. The Response communicates to the user what happened; the Outcome record
feeds the Learning loop. Without the Outcome, the system cannot learn from its
actions. Both outputs are mandatory.

**Implicaciones Arquitectónicas:**
- The Response is sent through the Channel Adapter.
- The Outcome is written to the Evidence Store (as Evidence).
- The Outcome references the originating Cognitive Cycle and Commitments.
- The Outcome is processed in the next cycle or asynchronously by the Learning
  component.

**Impacto Conversacional:** El sistema no solo hace — también dice lo que hizo y
aprende del resultado. "Su viaje fue creado (Response). El viaje se completó
satisfactoriamente (Outcome). La próxima vez, el sistema recordará su preferencia
(Learning)."

**Verificación:** ¿Existe algún ciclo cognitivo que no produzca tanto un Response
como un Outcome? Si sí → violación.

**Delegación:** ACTION_EXECUTOR.md (define la generación de Response y registro de
Outcome), EVIDENCE_MODEL.md (define el esquema de Outcome como Evidence).

---

## 10. Learning Feedback Loop

### R-CA-029 — Learning is asynchronous and cross-cycle

**Enunciado:** Learning is not part of the main Cognitive Cycle. It operates
asynchronously, processing Outcomes from completed cycles to extract patterns,
adjust Source Confidence, recalibrate the Certainty Calculus, and update the
Knowledge State (via new Evidence). Learning operates on multiple cycles, not within
a single cycle.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §13.3 (Learning — "no aprende durante un
Ciclo Cognitivo, es un proceso offline o de background"); CP-37 (retroalimentación
por outcome); CP-38 (ajuste de confianza); CP-39 (mejora no destructiva).

**Justificación:** If Learning were part of the main cycle, two problems arise: (a)
the cycle would be too slow to meet latency budgets, and (b) the system would be
learning from outcomes that haven't fully materialized yet. Asynchronous Learning
allows outcomes to mature (e.g., was the trip completed? was the user satisfied?)
before they influence the Knowledge State.

**Implicaciones Arquitectónicas:**
- Learning reads Outcomes from the Evidence Store after they are registered.
- Learning produces new Evidence (learned patterns, adjusted confidences).
- The new Evidence is registered through the Evidence Engine (not directly).
- The next Cognitive Cycle will read the new Evidence and update its Knowledge
  State accordingly.
- Learning has its own cycle that is independent of the Cognitive Cycle.

**Impacto Conversacional:** El sistema mejora con el uso sin ralentizar las
conversaciones. Aprende de cada viaje completado, cada corrección del usuario, cada
resultado. Con el tiempo, las conversaciones son más fluidas porque el sistema
conoce mejor al usuario y las rutas comunes.

**Verificación:** ¿Existe algún proceso de aprendizaje que modifique el Knowledge
State durante un Cognitive Cycle activo? Si sí → violación.

**Delegación:** LEARNING_MODULE (cuando exista), EVIDENCE_MODEL.md (define el
registro de outcomes como Evidence).

---

### R-CA-030 — Learning writes through the Evidence Engine

**Enunciado:** Learning does not write directly to the Knowledge State or the Evidence
Store. It produces new Evidence (learned patterns, adjusted Source Confidence values,
recalibrated parameters) that is registered through the Evidence Engine, following the
same pipeline as any other Evidence.

**Derivación Constitucional:** CP-08 (inmutabilidad — ningún proceso cognitivo
modifica la Evidence Store); CP-39 (mejora no destructiva — el aprendizaje agrega
Evidence, no modifica la existente); S-P5 (Evidence Immutability).

**Justificación:** If Learning bypassed the Evidence Engine, it would create Evidence
without the standard pipeline (Source attribution, Confidence, traceability). This
would break the epistemic chain. By routing through the Evidence Engine, Learning
produces first-class Evidence that can be traced, audited, and reasoned about like
any other Evidence.

**Implicaciones Arquitectónicas:**
- Learning produces Evidence records with Source type "LEARNING."
- The Evidence is registered through the Evidence Engine.
- The next Cognitive Cycle processes this Evidence like any other.
- The Knowledge State is updated by the Reasoning Engine when it reads the new
  Evidence.

**Impacto Conversacional:** El aprendizaje es transparente y trazable. El sistema
puede explicar qué aprendió y por qué. "Aprendí que usted suele viajar al aeropuerto
los lunes por la mañana basado en los últimos 3 viajes."

**Verificación:** ¿Existe alguna ruta donde Learning modifique directamente el
Knowledge State sin pasar por el Evidence Engine? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define el registro de Evidence de aprendizaje).

---

## 11. Dependencies and Boundaries

### R-CA-031 — Component dependencies are strictly acyclic

**Enunciado:** The dependencies between the seven components form a Directed Acyclic
Graph (DAG). No circular dependencies exist between components at the architectural
level. The dependency direction follows the cognitive flow:

```
Channel Adapter → Evidence Engine → Knowledge State ← Certainty Calculus
                                       ↓
                                Reasoning Engine
                                       ↓
                                Commitment Gate
                                       ↓
                                Action Executor
                                       ↓
                                Channel Adapter (Response)
```

The only feedback path is through the Evidence Store (outcomes → new Evidence →
next cycle), which does not create a circular dependency because it crosses cycle
boundaries.

**Derivación Constitucional:** CP-02 (secuencia estricta — cada fase consume el
output de la anterior); R-CA-003 (capas por distancia epistémica); SYSTEM_VOCABULARY.md §14
(prohibited cross-domain violations).

**Justificación:** Circular dependencies would make the architecture impossible to
reason about, test, or evolve. A change in one component could ripple unpredictably
through the system. The DAG structure ensures that each component's behavior depends
only on components that precede it in the flow, making the cognitive process
deterministic and auditable.

**Implicaciones Arquitectónicas:**
- No component depends on a component that depends on it.
- The Channel Adapter has zero dependencies on cognitive components.
- The Knowledge State is the most depended-upon component (4 dependents).
- The Action Executor depends only on the Commitment Gate and Knowledge State.
- Cyclical behavior (learning) crosses cycle boundaries, breaking the cycle.

**Impacto Conversacional:** El sistema es predecible porque el flujo de información
es siempre hacia adelante. No hay "bucles" donde la misma información se procese
múltiples veces dentro del mismo ciclo. La respuesta es rápida y determinista.

**Verificación:** ¿Existe alguna dependencia circular entre los siete componentes?
Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el grafo de dependencias).

---

### R-CA-032 — Each component has exclusive responsibility for its domain

**Enunciado:** No two components share the same responsibility. Each cognitive
function is assigned to exactly one component:

| Function | Responsible Component |
|---|---|
| Signal reception and verification | Channel Adapter |
| Evidence registration and storage | Evidence Engine |
| Belief formation and maintenance | Knowledge State |
| Certainty computation and propagation | Certainty Calculus |
| Hypothesis generation and resolution | Reasoning Engine |
| Commitment gating and lifecycle | Commitment Gate |
| Action execution and projection | Action Executor |

**Derivación Constitucional:** R-CA-004 a R-CA-010 (responsabilidades individuales);
CP-01 (ciclo completo asigna cada fase); SYSTEM_VOCABULARY.md §7.2-7.5 (responsabilidades
por fase).

**Justificación:** Overlapping responsibilities would create ambiguity: when a
function is needed, two components might claim it, or neither. Exclusive assignment
makes each component the authoritative source for its function. Questions like "who
computes Certainty?" have exactly one answer.

**Implicaciones Arquitectónicas:**
- Each component is the single source of truth for its function.
- Cross-cutting concerns (e.g., traceability) are implemented by each component for
  its domain, not by a shared component.
- If a function is needed by multiple components, it belongs in the Knowledge State
  (the shared hub).

**Impacto Conversacional:** No hay ambigüedad sobre qué hace cada parte del sistema.
Cada aspecto del comportamiento cognitivo tiene un dueño claro. Esto produce un
sistema predecible y consistente.

**Verificación:** ¿Existe alguna función cognitiva que no tenga un componente
responsable exclusivo? Si sí → brecha de responsabilidad. ¿Existe alguna función
con más de un componente responsable? Si sí → superposición.

**Delegación:** Cada componente se delega a su documento Level III correspondiente.

---

### R-CA-033 — Components communicate only through defined contracts

**Enunciado:** Components never access each other's internal state. All communication
occurs through the defined contracts (R-CA-011 to R-CA-015) or through the shared
Knowledge State interface. Direct component-to-component calls beyond the contracts
are prohibited.

**Derivación Constitucional:** R-CA-004 a R-CA-010 (responsabilidades — cada
componente tiene su dominio); R-CA-031 (DAG de dependencias); SYSTEM_VOCABULARY.md §14
(prohibited cross-domain violations).

**Justificación:** Direct access to another component's internal state would create
coupling that makes the architecture fragile. A change in one component could break
others. Contract-based communication insulates components: as long as the contract
is maintained, the internal implementation can change freely.

**Implicaciones Arquitectónicas:**
- Components have public interfaces (contracts) and private internals.
- No component reads another component's private state.
- The Knowledge State is the only component with a shared state interface.
- Contracts are documented and versioned.

**Impacto Conversacional:** El sistema es robusto porque los componentes están
aislados. Un problema en un componente no se propaga a otros. Si el cálculo de
certidumbre falla, el resto del sistema puede continuar con valores previos.

**Verificación:** ¿Existe algún componente que acceda al estado interno de otro
componente fuera de los contratos definidos? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define los contratos entre componentes).

---

## 12. Integration Points

### R-CA-034 — There are exactly five integration points

**Enunciado:** The cognitive architecture has exactly five integration points where
components hand off information:

| # | Integration Point | From | To | Information Transferred |
|---|---|---|---|---|
| IP-1 | **Signal Handoff** | Channel Adapter | Evidence Engine | VerifiedSignal |
| IP-2 | **Evidence Read** | Evidence Engine | Reasoning Engine | Evidence records |
| IP-3 | **Commitment Handoff** | Commitment Gate | Action Executor | FormedCommitment |
| IP-4 | **Response Handoff** | Action Executor | Channel Adapter | FormattedResponse |
| IP-5 | **Outcome Feedback** | Action Executor | Evidence Engine | Outcome Evidence |

All other inter-component interaction occurs through the shared Knowledge State.

**Derivación Constitucional:** R-CA-011 a R-CA-015 (contratos); CP-02 (secuencia
estricta); SYSTEM_VOCABULARY.md §7.2-7.5 (fases del ciclo).

**Justificación:** Explicit integration points make the architecture measurable and
testable. Each IP can be verified independently: is the correct information being
passed? Is it complete? Is it on time? Without explicit IPs, the handoffs between
components are implicit and unverifiable.

**Implicaciones Arquitectónicas:**
- Each IP has a defined information schema.
- Each IP is logged for observability.
- Failure at any IP triggers the cycle's error handling.
- IPs are the only points where components outside the Knowledge State interact.

**Impacto Conversacional:** Cada transición entre componentes es visible y medible.
Si algo sale mal, se sabe exactamente dónde: "el Signal llegó al Evidence Engine
(IP-1 ok), pero el Commitment no llegó al Action Executor (IP-3 falló)."

**Verificación:** ¿Existe algún handoff entre componentes que no esté definido como
uno de los cinco IPs? Si sí → violación (handoff no gobernado).

**Delegación:** COGNITIVE_ARCHITECTURE.md (define los IPs y sus esquemas).

---

### R-CA-035 — The Knowledge State is the central integration hub

**Enunciado:** The Knowledge State is the central integration point for all cognitive
components. The Reasoning Engine writes Beliefs and Hypotheses to it. The Certainty
Calculus writes Certainty values to it. The Commitment Gate writes Commitments to it.
The Action Executor reads Commitments from it.

**Derivación Constitucional:** KNOWLEDGE_MODEL.md R-KM-004 (única fuente de autoridad
cognitiva); R-KM-051 (Decisiones leen del Knowledge State); SYSTEM_VOCABULARY.md §6.1
(Knowledge State produce toda Decisión).

**Justificación:** Without a central hub, components would communicate peer-to-peer,
creating a network of dependencies that is hard to manage. The Knowledge State pattern
reduces the number of connections from O(n²) to O(n), making the architecture
scalable and maintainable.

**Implicaciones Arquitectónicas:**
- The Knowledge State is the single shared data structure.
- All cognitive components read from and write to it.
- The Knowledge State interface must be stable and well-documented.
- The Knowledge State is the source of truth for the system's epistemic state.

**Impacto Conversacional:** Todos los componentes cognitivos comparten la misma
comprensión de la situación. No hay versiones divergentes de la realidad entre
componentes. El usuario experimenta coherencia total.

**Verificación:** ¿Existe algún par de componentes cognitivos que se comuniquen
directamente sin pasar por el Knowledge State? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define la interfaz del Knowledge State).

---

## 13. Coordination Rules

### R-CA-036 — The Cognitive Cycle is coordinated by a sequencer

**Enunciado:** A cycle sequencer governs the execution of the Cognitive Cycle. The
sequencer: (a) invokes each stage in order, (b) verifies completion criteria before
advancing, (c) enforces temporal limits per stage, (d) manages error handling
(escalation/abort), and (e) preserves the Knowledge State across cycles.

**Derivación Constitucional:** CP-01 (ciclo completo); CP-02 (secuencia estricta);
CP-03 (completitud por fase); CP-04 (límite temporal).

**Justificación:** Without an explicit sequencer, the cycle's coordination is
implicit in the code flow, making it hard to verify, test, or modify. An explicit
sequencer makes the cycle's governance visible and auditable.

**Implicaciones Arquitectónicas:**
- The sequencer is not a separate component — it is a coordination function within
  the architecture.
- The sequencer does not perform cognitive operations — it orchestrates them.
- The sequencer enforces the DAG of dependencies (R-CA-031).
- The sequencer implements the timing budget (SYSTEM_VOCABULARY.md §7.6).

**Impacto Conversacional:** El ciclo cognitivo es confiable y predecible. Cada
mensaje sigue exactamente el mismo proceso, garantizando que ningún paso se omita
y que el sistema responda dentro del tiempo esperado.

**Verificación:** ¿Existe algún camino donde el ciclo cognitivo se ejecute sin pasar
por el secuenciador? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el secuenciador).

---

### R-CA-037 — Error handling follows the preservation hierarchy

**Enunciado:** When an error occurs at any stage of the Cognitive Cycle, the system
follows this hierarchy of responses:

1. **Preserve Knowledge State**: Always. The current Knowledge State is frozen.
2. **Record Error as Evidence**: The error is registered as Evidence with full
   context.
3. **Attempt Recovery**: If the error is transient (timeout, network), retry within
   the stage's temporal budget.
4. **Escalate**: If recovery is impossible or the budget is exhausted, escalate to
   the appropriate level (user clarification or human operator).
5. **Abort**: If escalation is not possible (systemic failure), abort the cycle
   and trigger system-level recovery.

**Derivación Constitucional:** S-P8 (Preservation over operation — preservar el
conocimiento es prioritario); S-P6 (Knowledge Preservation); S-P7 (Human Escalation);
CP-04 (límite temporal).

**Justificación:** In case of error, the system's first priority is to preserve what
it knows (S-P6). The second priority is to record what happened (audit). The third
is to continue operation if possible. The last is to abort safely. This hierarchy
ensures the system never loses Knowledge even in failure scenarios.

**Implicaciones Arquitectónicas:**
- The Knowledge State is always preserved before any error handling.
- Error records are Evidence with full traceability.
- Recovery is time-bounded (CP-04).
- Escalation produces a human-readable context package.

**Impacto Conversacional:** Cuando algo sale mal, el sistema no pierde el contexto.
"Ocurrió un error, pero he guardado toda la información de nuestra conversación.
Puede continuar cuando esté listo." El usuario no pierde su lugar.

**Verificación:** ¿Existe algún escenario de error donde el Knowledge State no se
preserve? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el manejo de errores del ciclo).

---

### R-CA-038 — Multiple intents are handled by parallel evaluation

**Enunciado:** When the Reasoning Engine detects multiple user intents in a single
Signal (CP-16), each intent follows the Cognitive Cycle independently from the
Commitment Gate onward. The Perception and Reasoning phases are shared; the
Commitment Gate evaluates each intent separately.

**Derivación Constitucional:** CP-16 (coexistencia de intenciones); SYSTEM_VOCABULARY.md §8.6
(Intent), §8.7 (Primary Intent).

**Justificación:** Multiple intents share the same Evidence and Knowledge State but
may have different Commitment outcomes. One intent may be ready for COMMIT while
another needs CLARIFY. Parallel evaluation allows each intent to proceed at its own
pace while sharing the cognitive foundation.

**Implicaciones Arquitectónicas:**
- The Perception and Reasoning phases produce a single enriched Knowledge State.
- The Commitment Gate evaluates each active intent independently.
- Each intent produces its own Commitment or Clarification.
- The Action Executor combines the results into a single coherent Response.

**Impacto Conversacional:** Si el usuario dice "quiero un viaje al aeropuerto y
¿cuánto cuesta?" el sistema procesa ambas intenciones: confirma el destino y
proporciona el precio en una sola respuesta. No obliga al usuario a hacer dos
preguntas separadas.

**Verificación:** ¿Existe algún escenario donde el sistema detecte múltiples
intenciones pero solo procese una? Si sí → violación de CP-16.

**Delegación:** DECISION_MODEL.md (define el manejo de intenciones múltiples).

---

## 14. Propagation Rules

### R-CA-039 — Evidence propagates forward only

**Enunciado:** Evidence flows in one direction: from Perception to Reasoning.
Evidence never flows backward (from Reasoning to Perception) within the same cycle.
Once Evidence is registered, it is immutable and its interpretation belongs to
subsequent phases.

**Derivación Constitucional:** CP-05 (frontera percepción/evidencia); CP-08
(inmutabilidad — la Evidence no puede ser modificada por procesos cognitivos);
R-CA-002 (fases secuenciales).

**Justificación:** If Evidence could flow backward, the Perception Phase would be
modified by the Reasoning Phase, creating an epistemic loop where interpretations
change the record of what was perceived. Forward-only flow preserves the integrity
of the original perception.

**Implicaciones Arquitectónicas:**
- The Evidence Store is written once per cycle and read-only thereafter.
- The Reasoning Phase reads Evidence but never writes to the Evidence Store.
- New interpretations of Evidence produce new Beliefs, not new Evidence.

**Impacto Conversacional:** Lo que el usuario dijo se preserva exactamente como fue
dicho. El sistema puede reinterpretarlo, pero no puede cambiar el registro de lo que
se dijo. Esto evita confusiones y revisiones históricas.

**Verificación:** ¿Existe algún flujo donde la fase de Razonamiento modifique la
Evidence registrada en la fase de Percepción? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define la inmutabilidad de Evidence).

---

### R-CA-040 — Certainty propagates through the semantic network

**Enunciado:** When the Certainty of any Belief changes, the change propagates
automatically through all semantically related Beliefs in the Knowledge State. The
propagation follows the relationship types defined in the Certainty Calculus
(implication, dependence, exclusion, refinement, corroboration).

**Derivación Constitucional:** CERTAINTY_CALCULUS.md R-CC-021 (propagación por
relaciones semánticas); R-CC-022 (propagación no crea Evidence); KNOWLEDGE_MODEL.md
R-KM-017 (Relational Knowledge).

**Justificación:** Beliefs in the Knowledge State are interconnected. A change in one
Belief affects others through semantic relationships. If propagation did not occur,
the Knowledge State would become inconsistent: one Belief could have high Certainty
while a dependent Belief retained low Certainty.

**Implicaciones Arquitectónicas:**
- Propagation is triggered by any write to Belief Certainty in the Knowledge State.
- Propagation is synchronous within the cycle.
- Propagation follows the semantic relationship graph.
- Propagation cannot violate epistemic limits (R-CC-027).

**Impacto Conversacional:** Todas las creencias del sistema están sincronizadas. Si
el sistema se vuelve más seguro del origen, automáticamente ajusta la certidumbre
de las creencias relacionadas (destino, ruta, precio). No hay Beliefs inconsistentes.

**Verificación:** ¿Existe algún cambio de Certainty que no se propague a las Beliefs
relacionadas? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS.md (define las reglas de propagación).

---

### R-CA-041 — Knowledge gaps propagate to the Commitment Gate

**Enunciado:** Knowledge gaps identified by the Reasoning Engine are propagated to
the Commitment Gate as Critical Information Needs (CINs). The Commitment Gate uses
CINs to determine whether CLARIFY is appropriate: if the threshold is not met and
CINs exist, the Gate produces CLARIFY.

**Derivación Constitucional:** DECISION_MODEL.md R-DM-031 (Critical Information
Needs); KNOWLEDGE_MODEL.md R-KM-048 (Knowledge gaps drive the conversation);
R-KM-053 (Knowledge gaps are CINs para Decisiones).

**Justificación:** The connection between "what we don't know" and "what we should
ask" must be explicit. Knowledge gaps identified during Reasoning are the raw
material for clarification during Commitment. Without explicit propagation, the
Commitment Gate would not know what information is missing.

**Implicaciones Arquitectónicas:**
- Knowledge gaps are stored in the Knowledge State.
- The Commitment Gate reads Knowledge gaps when evaluating CLARIFY.
- CINs are prioritized by impact on the active Decision.
- The Action Executor receives CINs to formulate clarification questions.

**Impacto Conversacional:** Las preguntas del sistema son relevantes porque se
basan en lo que realmente necesita saber. "¿Cuál es el destino?" no es una pregunta
genérica — es una CIN identificada por el Reasoning Engine porque sin el destino
no se puede completar el viaje.

**Verificación:** ¿Existe algún CLARIFY del Commitment Gate que no esté basado en
CINs identificadas por el Reasoning Engine? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define CINs), COMMITMENT_MODEL.md (define el uso
de CINs en el Gate).

---

## 15. Conceptual Synchronization Rules

### R-CA-042 — The Knowledge State is synchronized at each phase boundary

**Enunciado:** The Knowledge State is read and written at phase boundaries. Between
phase boundaries, the Knowledge State is stable (no component modifies it). The
sequence is:

1. End of Perception: Knowledge State is read by Reasoning Engine.
2. End of Reasoning: Knowledge State is written by Reasoning Engine.
3. End of Reasoning: Knowledge State is read by Commitment Gate.
4. End of Commitment: Knowledge State is written by Commitment Gate.
5. End of Commitment: Knowledge State is read by Action Executor.
6. End of Cycle: Knowledge State is preserved for the next cycle.

**Derivación Constitucional:** CP-30 (el Knowledge State se transfiere entre ciclos);
KNOWLEDGE_MODEL.md R-KM-040 (Active Knowledge se preserva entre ciclos).

**Justificación:** If multiple components modified the Knowledge State simultaneously,
consistency would be impossible. Phase-boundary synchronization ensures that each
component sees a consistent view and that writes from one phase are visible to the
next.

**Implicaciones Arquitectónicas:**
- The Knowledge State has read and write windows corresponding to phases.
- Reads see the state as of the last phase boundary.
- Writes are buffered until the phase completes.
- Concurrent writes within a phase are not permitted.

**Impacto Conversacional:** El sistema mantiene una visión coherente de la situación
en todo momento. No hay "carreras" entre componentes que produzcan estados
inconsistentes.

**Verificación:** ¿Existe algún escenario donde dos componentes modifiquen el
Knowledge State concurrentemente dentro de la misma fase? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define la sincronización del Knowledge State).

---

### R-CA-043 — Temporal consistency is maintained across cycles

**Enunciado:** The Knowledge State at the start of cycle N is the Knowledge State at
the end of cycle N-1, plus any new Evidence that arrived between cycles (from
Learning, timeouts, or external events). The system never starts a cycle with an
empty or incomplete Knowledge State.

**Derivación Constitucional:** CP-30 (el ciclo N comienza con el Knowledge State del
ciclo N-1); KNOWLEDGE_MODEL.md R-KM-040 (preservación entre ciclos); KNOWLEDGE_MODEL.md
R-KM-022 (alcance temporal).

**Justificación:** Temporal consistency is essential for coherent conversation. If
cycle N starts with a Knowledge State that does not reflect the outcomes of cycle
N-1, the system appears to have forgotten what just happened. The Knowledge State
is the system's continuous memory across cycles.

**Implicaciones Arquitectónicas:**
- Each cycle begins by loading the previous cycle's Knowledge State.
- Inter-cycle Evidence (learning, timeouts) is added before the cycle begins.
- The cycle sequencer verifies temporal continuity.
- A cycle cannot begin until the previous cycle's Knowledge State is confirmed
  preserved.

**Impacto Conversacional:** El sistema recuerda todo lo que ocurrió en la
conversación. No hay "perdón, ¿qué estábamos hablando?" entre turnos. La conversación
fluye naturalmente porque el conocimiento se acumula.

**Verificación:** ¿Existe algún ciclo que comience con un Knowledge State que no sea
el resultado del ciclo anterior? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo de continuidad entre
ciclos).

---

### R-CA-044 — Consistency verification occurs at Reasoning completion

**Enunciado:** At the completion of the Reasoning Phase, before the Commitment Gate
is invoked, the Knowledge State is verified for internal consistency: no
contradictory Beliefs in the active set, all Certainties are current, all Evidence
references are valid. If inconsistency is detected, the Reasoning Engine must resolve
it before the cycle can advance.

**Derivación Constitucional:** KNOWLEDGE_MODEL.md R-KM-045 (consistencia interna);
R-KM-046 (las contradicciones no se ignoran); CP-10 (Resolución de conflictos).

**Justificación:** The Commitment Gate must evaluate a consistent Knowledge State.
If contradictions exist, the Gate cannot determine which Belief to use for threshold
evaluation. Verifying consistency at Reasoning completion catches issues before they
reach the Gate, where they would cause an erroneous ESCALATE or false COMMIT.

**Implicaciones Arquitectónicas:**
- Consistency verification is a mandatory step at the Reasoning→Commitment boundary.
- Verification checks: contradiction detection, Certainty freshness, Evidence
  validity.
- If inconsistencies are found, the Reasoning Engine must re-enter its phase.
- The cycle cannot advance until consistency is confirmed.

**Impacto Conversacional:** El sistema solo actúa sobre creencias consistentes. No
hay decisiones basadas en información contradictoria. Si hay una contradicción, se
resuelve antes de actuar.

**Verificación:** ¿Existe algún escenario donde el Commitment Gate reciba un
Knowledge State inconsistente? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define la verificación de consistencia).

---

## 16. Reconstruction Rules

### R-CA-045 — Reconstruction restores the full Knowledge State

**Enunciado:** After a system restart, the reconstruction process must restore the
complete Knowledge State: all active Beliefs with their Certainties, all active
Commitments, all active Hypotheses, and the temporal context. The reconstruction
reads from the Evidence Store and archived Knowledge records.

**Derivación Constitucional:** CP-29 (reconstrucción desde Evidence); S-P6 (Knowledge
Preservation); KNOWLEDGE_MODEL.md R-KM-043 (reconstrucción desde Evidence Store);
EVIDENCE_MODEL.md R-EM-051 (reconstruction from Evidence alone).

**Justificación:** The system must survive restarts without losing cognitive context.
If a restart occurs mid-conversation, the system must resume with the same Knowledge
State it had before the restart. Reconstruction guarantees this by deriving all
Knowledge from the persistent Evidence Store.

**Implicaciones Arquitectónicas:**
- Reconstruction is the first process after restart, before any cycle begins.
- Reconstruction reads all relevant Evidence from the Evidence Store.
- Reconstruction replays the Evidence → Belief → Certainty → Commitment derivation.
- Reconstruction is deterministic: same Evidence Store = same Knowledge State.
- System cannot process new Signals until reconstruction is complete and verified.

**Impacto Conversacional:** El sistema se recupera completamente de reinicios. Si el
sistema se cae mientras el usuario está conversando, al recuperarse continúa como si
nada hubiera pasado. El usuario no pierde el contexto ni tiene que repetir
información.

**Verificación:** ¿Puede el sistema reconstruir su Knowledge State completo desde el
Evidence Store después de un reinicio? Si no → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define el algoritmo de reconstrucción),
EVIDENCE_MODEL.md (define el acceso al Evidence Store para reconstrucción).

---

### R-CA-046 — Reconstruction follows the same sequence as the cognitive flow

**Enunciado:** The reconstruction process follows the same sequence as the normal
cognitive flow: Evidence → Beliefs → Certainties → Commitments → Operational
Projection. It does not skip steps or use shortcuts. The result must be identical
to the Knowledge State that existed at the time of the last completed cycle.

**Derivación Constitucional:** CP-29 (reconstrucción desde Evidence — la Proyección
debe poder reconstruirse completamente); EVIDENCE_MODEL.md R-EM-051 (reconstruction
steps a-e).

**Justificación:** If reconstruction used shortcuts, it could produce a Knowledge
State that is similar but not identical to the original. Shortcuts could miss Beliefs
that were formed through complex reasoning, or create Beliefs that never existed.
Following the same sequence guarantees identical results.

**Implicaciones Arquitectónicas:**
- Reconstruction invokes the Evidence Engine, Reasoning Engine, and Certainty
  Calculus in sequence.
- Reconstruction skips the Commitment Gate (Commitments are restored from archived
  records).
- Reconstruction is a batch process (no user interaction).
- Reconstruction verifies its output against the last saved Knowledge State snapshot
  (if available).

**Impacto Conversacional:** La reconstrucción es exacta, no aproximada. El sistema
recupera exactamente lo que sabía, no una versión degradada. La experiencia del
usuario es idéntica a antes del reinicio.

**Verificación:** ¿El proceso de reconstrucción produce un Knowledge State idéntico
al del ciclo anterior? Si no → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el proceso de reconstrucción).

---

### R-CA-047 — Verification gates the reconstructed state

**Enunciado:** After reconstruction, the Knowledge State must pass verification before
the system begins processing new Signals. Verification checks: (a) all active
Commitments are present and consistent, (b) no contradictory Beliefs in the active
set, (c) all Beliefs have valid Certainty values, (d) all Beliefs trace to Evidence,
(e) temporal context is continuous.

**Derivación Constitucional:** KNOWLEDGE_MODEL.md R-KM-044 (reconstruction is
verifiable); CP-29 (si la reconstrucción falla, escalar).

**Justificación:** An incorrect reconstruction is worse than no reconstruction — the
system would make decisions based on wrong Knowledge. Verification provides the
safety check. If it fails, the system escalates to a human operator rather than
operating on potentially incorrect Knowledge.

**Implicaciones Arquitectónicas:**
- Verification is automatic after reconstruction.
- If verification passes, the system resumes normal operation.
- If verification fails, the system enters RECOVERY_FAILED state.
- In RECOVERY_FAILED, no new Signals are processed.
- Human operator intervention is required to resolve the recovery failure.

**Impacto Conversacional:** El sistema prefiere no operar a operar incorrectamente.
Si la recuperación falla, un operador humano recibe el contexto completo para
asistir al usuario.

**Verificación:** ¿Existe algún escenario donde el sistema opere con un Knowledge
State reconstruido sin verificar? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el proceso de verificación post-
reconstrucción).

---

## 17. Observability Rules

### R-CA-048 — Every Cognitive Cycle is observable

**Enunciado:** Every Cognitive Cycle produces an observability record containing:
the Signal received, the Evidence registered, the Beliefs formed, the Certainties
computed, the Decision(s) evaluated, the Commitment(s) made (or CLARIFY/ESCALATE),
the Actions executed, and the Outcome recorded. The record is stored in Episodic
Memory.

**Derivación Constitucional:** P-I5 (Auditability); CP-09 (trazabilidad
observacional); CP-37 (retroalimentación por outcome — registrar todo outcome como
Evidence).

**Justificación:** If the system is not observable, it cannot be audited, debugged,
or improved. The observability record is the complete cognitive transcript of what
the system did and why. Every decision can be traced back through the cycle to the
original Signal.

**Implicaciones Arquitectónicas:**
- Each cycle generates a single observability record.
- The record is structured (not free text) for queryability.
- The record is stored in Episodic Memory (SYSTEM_VOCABULARY.md §11.5).
- The record is immutable once written.
- The record is accessible for audit, debugging, and learning.

**Impacto Conversacional:** Toda decisión del sistema es explicable. Si el usuario
pregunta "¿por qué hiciste eso?", el sistema puede consultar su registro de
observabilidad y responder con precisión.

**Verificación:** ¿Existe algún Cognitive Cycle que no produzca un registro de
observabilidad completo? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el formato del registro de
observabilidad).

---

### R-CA-049 — Each component exposes its state for observation

**Enunciado:** Each of the seven components exposes, through the observability
system, its current state and its contribution to the current Cognitive Cycle.
The exposure includes: input received, output produced, decisions made within the
component, and any errors encountered.

**Derivación Constitucional:** P-I5 (Auditability); R-CA-048 (ciclo observable);
CP-09 (trazabilidad).

**Justificación:** A cycle-level observability record shows what happened but not
why each component behaved as it did. Component-level observability enables deep
debugging: "the Commitment Gate produced ESCALATE because the Certainty was 0.6
and the threshold was 0.85."

**Implicaciones Arquitectónicas:**
- Each component has a standard observability interface.
- The interface exposes: input, output, internal state (as relevant), errors.
- Component observability is always-on (not configurable).
- Observability data is not used for cognitive processing.

**Impacto Conversacional:** Cuando algo no funciona como se espera, los operadores
técnicos pueden ver exactamente qué pasó dentro de cada componente. Esto permite
diagnósticos rápidos y mejora continua.

**Verificación:** ¿Existe algún componente que no exponga su estado interno para
observabilidad? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define la interfaz de observabilidad por
componente).

---

## 18. Evolution Rules

### R-CA-050 — The architecture evolves through Level III document updates

**Enunciado:** Changes to the cognitive architecture must be made by updating the
corresponding Level III document(s), not by modifying the architecture directly.
A change that affects component responsibilities, contracts, or flow requires
updating this document. A change that affects a single model's internal behavior
requires updating that model's document.

**Derivación Constitucional:** CONSTITUTION.md §6 (Document Hierarchy); §7
(Governance); S-P9 (Constitutional Integrity — toda violación debe documentarse).

**Justificación:** The document hierarchy is the governance structure of the cognitive
system. Bypassing it (changing architecture without changing documents) creates drift
between the specification and the implementation. Document-first evolution ensures
that the architecture remains a reliable source of truth.

**Implicaciones Arquitectónicas:**
- Changes to component responsibilities require R-CA update.
- Changes to contracts between models require R-CA update.
- Changes to cognitive flow require R-CA update.
- Changes within a single component require that component's Level III update.
- All changes must be approved through the governance process (CONSTITUTION.md §7).

**Impacto Conversacional:** El sistema evoluciona de manera gobernada y predecible.
Los cambios se planifican, documentan y verifican antes de implementarse. El usuario
experimenta mejoras graduales sin cambios disruptivos.

**Verificación:** ¿Existe algún cambio en la arquitectura que no esté reflejado en
los documentos Level III? Si sí → violación de gobierno.

**Delegación:** CONSTITUTION.md (define el proceso de gobierno para cambios).

---

### R-CA-051 — New capabilities are added as component extensions, not new components

**Enunciado:** New cognitive capabilities must be added as extensions to existing
components, not as new components in the architecture. An extension adds new
functionality within a component's existing responsibility without changing the
component's contract with other components.

**Derivación Constitucional:** R-CA-001 (siete componentes); R-CA-032 (cada
componente tiene responsabilidad exclusiva); CONSTITUTION.md §6 (jerarquía
documental).

**Justificación:** If every new capability required a new component, the architecture
would grow without bound, becoming unmanageable. The seven components are designed
to be stable and comprehensive. New capabilities (e.g., a new type of Reasoning,
a new Source type) are extensions within existing components.

**Implicaciones Arquitectónicas:**
- New capabilities are internal to a component.
- Component contracts remain stable across extensions.
- Extensions may require updates to the component's Level III document.
- If a capability does not fit any existing component, it indicates a gap in the
  architecture (requires governance review).

**Impacto Conversacional:** El sistema puede crecer en capacidades sin cambiar su
arquitectura fundamental. Las mejoras se integran suavemente, sin cambios bruscos
en el comportamiento.

**Verificación:** ¿Existe alguna nueva capacidad cognitiva que no pueda asignarse a
ninguno de los siete componentes existentes? Si sí → posible brecha arquitectónica
que requiere revisión de gobierno.

**Delegación:** Cada componente define su mecanismo de extensión en su documento
Level III.

---

## 19. Architectural Invariants

### I-CA-001 — The Cognitive Cycle is always complete

Every unit of work that transforms a Signal into an Action must pass through all
four phases (Perception → Reasoning → Commitment → Projection) in strict sequence.
No phase may be skipped, reordered, or executed in parallel.

**Derivación Constitucional:** CP-01, CP-02, CP-03.
**Violation:** Action without complete cognitive processing.

---

### I-CA-002 — The Evidence Store is always the foundation

Every Belief in the Knowledge State must be traceable to at least one piece of
Evidence in the Evidence Store. No Knowledge element exists without evidentiary
foundation. The Evidence Store is the epistemic root of all cognition.

**Derivación Constitucional:** S-P1, CP-05, R-EM-049.
**Violation:** Belief without Evidence support.

---

### I-CA-003 — The Commitment Gate always gates

No operational Action may be executed without passing through the Commitment Gate.
The Gate evaluates Certainty against threshold and produces COMMIT, CLARIFY, or
ESCALATE. No bypass paths exist.

**Derivación Constitucional:** CP-22, R-CM-005, S-P7.
**Violation:** Action without Commitment Gate evaluation.

---

### I-CA-004 — The Knowledge State is always preserved

The Knowledge State at the end of each cycle is fully available at the start of the
next cycle. No Knowledge is lost between cycles. After a restart, the Knowledge
State is fully reconstructed from the Evidence Store before any cycle begins.

**Derivación Constitucional:** CP-30, S-P6, CP-29.
**Violation:** Knowledge loss between cycles or after restart.

---

### I-CA-005 — Components never bypass layers

The Sensory Layer never accesses the Executive Layer directly. The Executive Layer
never accesses the Sensory Layer directly. All communication flows through the
Cognitive Layer and the Knowledge State.

**Derivación Constitucional:** R-CA-003, SYSTEM_VOCABULARY.md §14 (prohibited violations).
**Violation:** Direct Sensory-Executive communication.

---

### I-CA-006 — The Operational Projection is always derived

The Operational Projection is always a read-only view of the Knowledge State. It
cannot exist independently of the Commitments that justify it. It cannot be modified
directly. It cannot create new Knowledge.

**Derivación Constitucional:** CP-27, CP-28, R-KM-061, R-KM-062.
**Violation:** Operational state that does not derive from Knowledge State.

---

### I-CA-007 — Learning never writes directly to the Knowledge State

Learning produces new Evidence that is registered through the Evidence Engine. It
does not write directly to the Knowledge State or modify existing Knowledge. Changes
to the Knowledge State occur through the normal Evidence → Reasoning pipeline in
subsequent cycles.

**Derivación Constitucional:** CP-39, S-P5, R-CA-030.
**Violation:** Learning that bypasses the Evidence Engine.

---

### I-CA-008 — The architecture has exactly seven components

No additional cognitive components may be added to the architecture. New capabilities
are extensions within existing components. The seven components (Channel Adapter,
Evidence Engine, Knowledge State, Certainty Calculus, Reasoning Engine, Commitment
Gate, Action Executor) are necessary and sufficient.

**Derivación Constitucional:** R-CA-001, R-CA-051.
**Violation:** New component without governance review.

---

### I-CA-009 — Every cycle is observable

Each Cognitive Cycle produces a complete observability record. Each component
exposes its state for observation. The observability record is immutable and stored
in Episodic Memory.

**Derivación Constitucional:** P-I5, CP-09, R-CA-048, R-CA-049.
**Violation:** Cycle without complete observability record.

---

### I-CA-010 — Every Commitment is explicitly justified

Every Commitment in the Knowledge State includes the Certainty that justified it,
the Cost of Error used to set the threshold, and the Strategic Posture at commitment
time. No Commitment exists without explicit justification.

**Derivación Constitucional:** COMMITMENT_MODEL.md R-CM-001, DECISION_MODEL.md R-DM-009.
**Violation:** Commitment without explicit justification.

---

## 20. Delegation to Implementation Documents

The following documents receive implementation mandates from this architecture:

| Document | Responsibility |
|---|---|
| **CHANNEL_ADAPTER.md** (Level III-e) | Signal verification, Source classification, Response formatting per channel, Conversation Memory structure |
| **EVIDENCE_MODEL.md** (Level III-a) | Evidence pipeline, Evidence Store implementation, append-only lifecycle, Evidence read interface for cognitive layer |
| **KNOWLEDGE_MODEL.md** (Level III-f) | Knowledge State structure, Active/Archive layers, consistency verification, temporal scope, reconstruction algorithm |
| **CERTAINTY_CALCULUS.md** (Level III-d) | Certainty computation, propagation through semantic network, degradation, recalibration from outcomes |
| **DECISION_MODEL.md** (Level III-b) | Reasoning Engine process, Hypothesis generation/resolution, Critical Information Needs, Strategic Posture, Cost of Error |
| **COMMITMENT_MODEL.md** (Level III-c) | Commitment Gate logic, lifecycle states, threshold evaluation, CLARIFY/ESCALATE/COMMIT outcomes |
| **ACTION_EXECUTOR.md** (Level III-g) | Operational Projection derivation, Action execution, Response generation, Outcome recording |
| **Level IV documents** | Cycle sequencer implementation, component communication infrastructure, observability system, reconstruction orchestrator, temporal budget watchdog |

---

*End of 11-COGNITIVE_ARCHITECTURE.md — Version 1.0-draft*

> Este documento especifica la arquitectura cognitiva de AITOS: la organización
> lógica de los siete componentes, sus responsabilidades, contratos, flujo,
> dependencias, límites, puntos de integración, reglas de coordinación,
> propagación, sincronización, reconstrucción, observabilidad y evolución.
>
> Deriva exclusivamente de CONSTITUTION.md, SYSTEM_VOCABULARY.md, COGNITIVE_PRINCIPLES.md,
> EVIDENCE_MODEL.md, DECISION_MODEL.md, COMMITMENT_MODEL.md, CERTAINTY_CALCULUS.md,
> y KNOWLEDGE_MODEL.md. No redefine ningún concepto ontológico ni introduce nuevos
> modelos. Su función es integrar, no crear.
>
> Fecha: 2026-07-12
