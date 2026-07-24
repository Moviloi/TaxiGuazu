# AITOS Cognitive Constitution — SYSTEM_VOCABULARY.md

> **Normative Vocabulary of the AI Transportation Operating System**
>
> Status: **DRAFT** — waiting for Constituent Assembly approval
> Supersedes: `docs/architecture/glossary.md`, `docs/ai/INVARIANTS.md` (terminology sections),
>             `docs/ai/ARCHITECTURE_BIBLE.md` (terminology), `docs/ai/DECISION_TREE.md` (terminology),
>             `docs/architecture/operational-model.md` (terminology),
>             `docs/architecture/decision-architecture.md` (terminology)
> Version: 1.0-draft
> Date: 2026-07-11
>
> ⚠️ **Constitutional Rule**: No document, code comment, commit message, ADR, or verbal
> communication within AITOS may use a term listed here in a meaning different from the one
> defined below. If a term is not listed here, it must be defined in an ADR before being used
> in any official capacity.

---

## Table of Contents

1. [Preamble — The Problem of Names](#1-preamble--the-problem-of-names)
2. [Structural Rules of This Document](#2-structural-rules-of-this-document)
3. [Domain 1: Foundation (Onto-epistemic)](#3-domain-1-foundation-onto-epistemic)
4. [Domain 2: Perception (Entrada y Observación)](#4-domain-2-perception-entrada-y-observación)
5. [Domain 3: Evidence (Registro y Creencia)](#5-domain-3-evidence-registro-y-creencia)
6. [Domain 4: Knowledge State (Conocimiento y Certeza)](#6-domain-4-knowledge-state-conocimiento-y-certeza)
7. [Domain 5: Cognitive Process (Cognición)](#7-domain-5-cognitive-process-cognición)
8. [Domain 6: Decision (Decisión y Compromiso)](#8-domain-6-decision-decisión-y-compromiso)
9. [Domain 7: Projection (Proyección Operacional)](#9-domain-7-projection-proyección-operacional)
10. [Domain 8: Business Domain (Negocio)](#10-domain-8-business-domain-negocio)
11. [Domain 9: Memory & Persistence](#11-domain-9-memory--persistence)
12. [Domain 10: Action & Infrastructure](#12-domain-10-action--infrastructure)
13. [Domain 11: Learning & Adaptation](#13-domain-11-learning--adaptation)
14. [Cross-Domain Relationship Map](#14-cross-domain-relationship-map)
15. [Register of Superseded and Obsolete Terms](#15-register-of-superseded-and-obsolete-terms)
16. [Contradictions Detected and Resolved](#16-contradictions-detected-and-resolved)
17. [Normative Rules of Terminology](#17-normative-rules-of-terminology)

---

## 1. Preamble — The Problem of Names

AITOS has been developed over months by multiple contributors, AI agents, and iterative
refinements. Each contributor brought implicit definitions. Each file was written with
assumptions about what words mean. The result is a **terminology debt** visible in three
symptoms:

1. **Overloading**: The same word means different things in different files (e.g., "confidence"
   means "source reliability" in extraction, "slot certainty" in types, and "overall system
   confidence" in the handler).
2. **Polysemy**: Different words are used for the same concept in different contexts
   (e.g., "workflow_state" / "conversational_state" / "status").
3. **Ghost concepts**: Some concepts drive real architectural decisions but exist in no
   document (e.g., "Cost of Error" is discussed in hallway conversations but never formalized).

This Ontology is the **vaccine** against terminology debt. Every term hereafter has one
meaning, one canonical definition, one place in the concept graph.

### 1.1 Reading this document

Each concept is defined with a uniform structure:

```
### Term (English)
- **Spanish**: Termino en español
- **Definition**: One-sentence normative definition.
- **Domain**: The domain this concept belongs to.
- **Category**: The kind of concept (Entity / Relationship / Property / Process / Signal /
  Store / Rule).
- **Relations**:
  - is-a: parent concept
  - part-of: aggregate concept
  - depends-on: prerequisite concept
  - produces: what this concept generates
  - consumes: what this concept needs
  - conflicts-with: concepts that must not overlap
- **Constraints**: Invariant rules that govern this concept.
- **Expressions in code**: Where this concept materializes in the current codebase.
- **Supersedes**: Previous terms that this concept replaces.
- **Notes**: Clarifications, design rationale, open questions.
```

---

## 2. Structural Rules of This Document

**R-ONT-001**: Every concept belongs to exactly one domain. Cross-domain relationships
are expressed in the `Relations` field, not by duplicating the concept.

**R-ONT-002**: Every concept has exactly one canonical English term. Spanish translations
are provided for clarity but are not normative. If a Spanish document uses a Spanish term
that maps to an English concept, the English concept governs.

**R-ONT-003**: If a concept name appears in the Oblivion section (Section 15), it is
deprecated. No new code, ADR, or document may use it without Constituent Assembly approval.

**R-ONT-004**: The ontology is **living**. Changes require an ADR that explicitly states
which concept is being modified, the old definition, the new definition, and the
architectural impact. Simple additions (new concepts that don't modify existing ones) can
be made by the Cognitive Architect without full ADR process.

**R-ONT-005**: If any code, document, or conversation uses a term in a way that contradicts
this ontology, it is **erroneous by definition**. The ontology is not descriptive of current
usage — it is **prescriptive** of future usage.

---

## 3. Domain 1: Foundation (Onto-epistemic)

> These are the foundational categories that everything else is built on. They are not
> directly implemented in code but form the conceptual bedrock.

### 3.1 Entity

- **Spanish**: Entidad
- **Definition**: Anything that exists in the AITOS universe — physical (a place, a driver),
  abstract (a conversation, a trip), or virtual (a slot value, an evidence record).
- **Domain**: Foundation
- **Category**: Category (meta-concept)
- **Relations**:
  - is-a: root concept (no parent)
  - subtypes: Agent, Passenger, Place, Trip, Message, Evidence, Decision
- **Constraints**: Every Entity must have a globally unique identity within its domain.
- **Expressions in code**: UUIDs, primary keys, entity classes.
- **Supersedes**: N/A (foundational)
- **Notes**: Entities are the "nouns" of the system. They persist, change state, and relate
  to each other. This is a deliberately broad definition to cover both physical and digital
  entities.

### 3.2 Property

- **Spanish**: Propiedad
- **Definition**: A characteristic or attribute of an Entity that can change over time.
- **Domain**: Foundation
- **Category**: Category (meta-concept)
- **Relations**:
  - is-a: root concept
  - examples: a slot's status, a trip's phase, a place's name
- **Constraints**: Properties do not exist independently — they always belong to an Entity.
- **Expressions in code**: column values, object fields, state variables.
- **Notes**: Distinction from Entity: a Property cannot be referenced independently. "The
  origin of trip #123" is a Property of Trip. "Place #456" (which happens to be the origin
  of trip #123) is an Entity.

### 3.3 Signal

- **Spanish**: Señal
- **Definition**: Any unit of information that can be perceived by the system, before any
  interpretation or processing.
- **Domain**: Foundation
- **Category**: Category (meta-concept)
- **Relations**:
  - is-a: root concept
  - subtypes: MessageSignal, TimeSignal, LocationSignal, SystemSignal
  - produces: Observation (when processed)
- **Constraints**: Signals are raw and unfiltered. They enter the system through a Channel.
  A signal has no certainty — it simply is.
- **Expressions in code**: HTTP request payload, webhook event, cron trigger.
- **Notes**: This is the **lowest level of abstraction**. At the Signal level, even the
  format is not guaranteed. The signal becomes an Observation after minimal parsing
  (structure validation, HMAC verification).

### 3.4 Channel

- **Spanish**: Canal
- **Definition**: A communication medium through which Signals enter or leave the system.
- **Domain**: Foundation
- **Category**: Category
- **Relations**:
  - is-a: Entity
  - consumes: Signal (inbound)
  - produces: Signal (outbound)
  - depends-on: Protocol
- **Constraints**: A Channel is defined by its protocol (WhatsApp Webhook, Cron, Admin API)
  and its direction (inbound/outbound). Each Channel has exactly one handler in the system.
- **Expressions in code**: `app/api/whatsapp/webhook/route.ts`, `app/api/cron/*/route.ts`,
  `app/api/bot/*/route.ts`
- **Supersedes**: The term "webhook" in the glossary was too narrow. Webhook is one Channel.
- **Notes**: Channels are the boundary of the system. Everything inside is AITOS; everything
  outside arrives or leaves via a Channel.

### 3.5 Agent

- **Spanish**: Agente
- **Definition**: An entity capable of making decisions and taking actions within the system.
- **Domain**: Foundation
- **Category**: Entity
- **Relations**:
  - is-a: Entity
  - subtypes: Passenger, Driver, SystemAgent (AI subsystems), HumanOperator (admin)
  - produces: Decision, Action
- **Constraints**: Every Agent has a scope of autonomy (what decisions it can make without
  escalation) and a scope of authority (what actions it can execute). An Agent cannot act
  outside its authority.
- **Expressions in code**: Not explicitly modeled as a unified concept in current code.
  Passengers exist as `chat_sessions.phone`, drivers exist as `drivers` table, system agents
  are implicit.
- **Supersedes**: Previous implicit usage where "agent" was used casually to mean "AI agent"
  or "driver".
- **Notes**: This is a new normative definition that elevates Agent from casual usage to a
  formal ontological category. Future architecture should make Agent boundaries explicit.

### 3.6 Knowledge

- **Spanish**: Conocimiento
- **Definition**: That which the system holds to be true at a given moment, composed of
  beliefs, data, and models.
- **Domain**: Foundation
- **Category**: Store (abstract)
- **Relations**:
  - is-a: root concept
  - subtypes: Evidence Store, Knowledge Base, Models
  - part-of: Knowledge State
  - conflicts-with: "Data" (data is a subset of knowledge, not a separate category)
- **Constraints**: Knowledge is always provisional. The system does not have access to
  ground truth — only to what it knows.
- **Expressions in code**: All persistent state: DB, memory stores, model parameters.
- **Notes**: This is an epistemic stance. AITOS does not claim to "know" the truth. It
  claims to have a Knowledge State that may or may not correspond to reality. This
  distinction is critical for error handling, escalation, and learning.

### 3.7 Data

- **Spanish**: Dato
- **Definition**: Structured information that the system can store and retrieve, originating
  either from perception (Signals) or from internal computation (Decisions).
- **Domain**: Foundation
- **Category**: Entity (abstract)
- **Relations**:
  - is-a: Knowledge
  - subtypes: Record, Configuration, Log
  - consumes: Signal, Decision
  - part-of: Evidence Store
- **Constraints**: Data is a subset of Knowledge. Data requires a schema. Data without a
  schema is just a Signal.
- **Expressions in code**: DB rows, JSON payloads, config files, env vars.
- **Supersedes**: Previous usage where "data" was used as a synonym for "information" or
  "knowledge".
- **Notes**: Think of Data as "Knowledge that fits in a schema." Not all Knowledge is Data
  (e.g., heuristics, model weights, prompt templates).

### 3.8 Truth

- **Spanish**: Verdad
- **Definition**: The actual state of the world outside the system. The system never has
  direct access to Truth — only to its Knowledge State.
- **Domain**: Foundation
- **Category**: Meta-concept (regulatory)
- **Relations**:
  - conflicts-with: Belief (a Belief approximates Truth but is never identical to it)
  - depends-on: Outcome (outcomes reveal discrepancies between Knowledge and Truth)
- **Constraints**: The system MUST NOT claim to know the Truth. It MUST always operate
  with epistemic humility: "I believe X with confidence C based on evidence E."
- **Expressions in code**: Not directly expressed. The concept is implicit in the
  I6 invariant (LLM is never the source of truth) and in the fallback architecture.
- **Supersedes**: All previous implicit uses of "truth" (e.g., "source of truth" in I6).
- **Notes**: This is the single most important epistemic concept. Violations of this
  principle (statements like "the system knows the user's intent") are the root cause of
  overconfidence bugs. The system does not KNOW — it BELIEVES, with evidence.

---

## 4. Domain 2: Perception (Entrada y Observación)

> How signals become observations. This is the system's sensory layer.

### 4.1 Message

- **Spanish**: Mensaje
- **Definition**: A Signal that originates from a human user (Passenger or Driver) through
  a conversational Channel.
- **Domain**: Perception
- **Category**: Signal (subtype)
- **Relations**:
  - is-a: Signal
  - part-of: Conversation (sequence of messages)
  - produces: Observation (after parsing)
  - from: Passenger or Driver Agent
- **Constraints**: Every Message must have a sender identity (phone number), a body (text),
  and a timestamp. Messages are immutable once recorded.
- **Expressions in code**: `messages` table, `WhatsAppMessage` type, webhook payload.
- **Supersedes**: Previous casual use of "message" to mean "webhook payload" or
  "internal event".
- **Notes**: A Message is a Signal at the moment it enters. The instant it passes validation
  (HMAC, rate limit, idempotency), it becomes an Observation.

### 4.2 Observation

- **Spanish**: Observación
- **Definition**: A Signal that has passed channel-level validation (format, authentication,
  rate limit, idempotency) and is ready for processing.
- **Domain**: Perception
- **Category**: Entity
- **Relations**:
  - is-a: Entity
  - consumes: Signal
  - produces: Evidence (after extraction), Fact (atomic unit)
  - part-of: Cognitive Cycle input
- **Constraints**: An Observation is the smallest unit of processing. It is guaranteed to
  be structurally valid but not semantically interpreted. An Observation is created exactly
  once per Signal (idempotency guarantee).
- **Expressions in code**: After webhook verification in `route.ts`, the hydrated payload
  before it enters `lead.service.ts`.
- **Supersedes**: Implicit concept — was not previously named. Various docs referred to
  "the message" at this stage, conflating it with the raw Signal.
- **Notes**: The transition from Signal → Observation is the system's first gate. If a
  Signal fails validation, it never becomes an Observation and is discarded or logged as
  a security event.

### 4.3 Fact

- **Spanish**: Hecho
- **Definition**: The smallest atomic unit of meaning extracted from an Observation—a
  single claim about the world (e.g., "origin equals Asunción", "passengers equals 3").
- **Domain**: Perception
- **Category**: Entity
- **Relations**:
  - is-a: Entity
  - part-of: Evidence (a set of facts)
  - depends-on: Observation
  - produces: Belief (when stored in Evidence Store)
- **Constraints**: A Fact must be self-contained ("origin=Asunción") and traceable to the
  Observation that produced it. A Fact is always qualified by Source and Confidence.
- **Expressions in code**: Individual slot values after extraction (e.g.,
  `{ slot: "origin", value: "Asunción", source: "LLM", score: 0.9 }`).
- **Supersedes**: Previous usage where "extracted data" was used as a collective term for
  what are now called Facts.
- **Notes**: Facts are the atoms of the cognitive system. They are the output of perception
  and the input to reasoning. Facts are not yet Beliefs — they become Beliefs when stored
  in the Evidence Store with a confidence assessment.

### 4.4 Source

- **Spanish**: Fuente
- **Definition**: The origin of a Fact, describing how it was obtained.
- **Domain**: Perception
- **Category**: Property (of Fact)
- **Relations**:
  - is-a: Property
  - consumes: Observation, Inference, Knowledge Base
  - subtypes: DirectExtraction, Inference, UserConfirmation, KnowledgeBaseLookup,
    DefaultValue, LLMInference
- **Constraints**: Every Fact must have exactly one Source. Sources are ordered by
  reliability (UserConfirmation > DirectExtraction > LLMInference > Inference >
  DefaultValue).
- **Expressions in code**: Extraction source types in `slot-state.ts`, extraction confidence
  scoring.
- **Supersedes**: Mix of "method", "origin", "extraction_type" in various docs.
- **Notes**: Source is critical for determining how much to trust a Fact. A Fact from
  UserConfirmation ("yes, that's correct") is epistemically stronger than a Fact from
  LLMInference ("I think this is what the user meant").

---

## 5. Domain 3: Evidence (Registro y Creencia)

> How facts become beliefs. The system's epistemic foundation.

### 5.1 Evidence

- **Spanish**: Evidencia
- **Definition**: A recorded set of Facts, each with its Source and Confidence, that
  supports or refutes a Belief about the world.
- **Domain**: Evidence
- **Category**: Entity
- **Relations**:
  - is-a: Entity
  - part-of: Evidence Store
  - consumes: Fact, Source, Confidence
  - produces: Belief (after aggregation)
  - depends-on: Observation
- **Constraints**: Evidence is immutable once recorded. New evidence can be added but
  existing evidence cannot be modified or deleted. Evidence always points to the Observation
  that generated it.
- **Expressions in code**: Currently implicit in slot states and confidence maps. There is
  NO dedicated Evidence Store in current code — evidence is collapsed into slot values.
- **Supersedes**: This is a NEW concept. Previous architecture had no dedicated Evidence
  concept — evidence was conflated with "slot" and "confidence."
- **Notes**: The absence of an Evidence Store is a critical architectural gap identified
  by Auditoría #06. Evidence should be a first-class entity, not a property of slots.
  ADR-013 is proposed to create it.

### 5.2 Belief

- **Spanish**: Creencia
- **Definition**: A proposition that the system holds to be true with a degree of
  Certainty, based on accumulated Evidence.
- **Domain**: Evidence
- **Category**: Entity
- **Relations**:
  - is-a: Entity (abstract)
  - depends-on: Evidence, Inference
  - produces: Decision (beliefs are inputs to decisions)
  - conflicts-with: Truth (a Belief approximates Truth but is not Truth)
  - subtypes: SlotBelief, IntentBelief, ContextBelief
- **Constraints**: Every Belief must be supported by at least one piece of Evidence.
  A Belief without Evidence is a Guess and must be labeled as such. A Belief must indicate
  its Certainty level.
- **Expressions in code**: Currently implicit — slot values in `chat_sessions.slots` are
  treated as Beliefs without explicit epistemic status.
- **Supersedes**: Previous use of "slot value" where it was treated as a fact rather than
  a belief.
- **Notes**: This is the CENTRAL epistemic concept. The difference between Belief and
  Truth is the difference between "the system thinks the origin is Asunción" and "the
  origin is Asunción." AITOS operates on Beliefs and must never confuse them with Truth.

### 5.3 Evidence Store

- **Spanish**: Almacén de Evidencia
- **Definition**: The canonical store of all Evidence collected across all Cognitive Cycles,
  organized by what proposition they support or refute.
- **Domain**: Evidence
- **Category**: Store
- **Relations**:
  - is-a: Store
  - part-of: Knowledge State
  - contains: Evidence entities
  - depends-on: Observation, Fact
  - produces: AggregatedEvidence (for Belief formation)
- **Constraints**: The Evidence Store is append-only. Evidence is never deleted or modified.
  The Evidence Store is the single source of truth for "what has the system perceived?"
  (not "what is true" — that doesn't exist).
- **Expressions in code**: **DOES NOT EXIST**. Currently, evidence is implicitly stored in
  `chat_sessions.slots` (a lossy compression).
- **Supersedes**: This is a NEW concept. It is the most important architectural gap
  identified across all six audits.
- **Notes**: Proposed by Auditoría #06. ADR-014 should specify its implementation. Without
  it, the system cannot distinguish between "we have evidence for Asunción" and "we have
  decided Asunción."

---

## 6. Domain 4: Knowledge State (Conocimiento y Certeza)

> The system's current understanding of the world, with all its uncertainties.

### 6.1 Knowledge State

- **Spanish**: Estado de Conocimiento
- **Definition**: The complete set of Beliefs, Evidence, active Hypotheses, and current
  Commitments that the system holds at a given moment.
- **Domain**: Knowledge State
- **Category**: Store (aggregate)
- **Relations**:
  - is-a: Store
  - contains: Evidence Store, Beliefs, Hypothesis Network, Active Commitments
  - depends-on: all Perception and Evidence domains
  - produces: every Decision
- **Constraints**: The Knowledge State is the SINGLE source of all decisions. No decision
  can be based on information not in the Knowledge State. The Knowledge State is volatile
  — it changes with every Cognitive Cycle.
- **Expressions in code**: Currently distributed across `chat_sessions` (slots, state),
  `SessionMemory`, `ContextMemory`, and implicit agent state. No unified representation.
- **Supersedes**: Previous notion of "session state" which was too narrow and conflated
  business state with knowledge state.
- **Notes**: This is the "mind" of AITOS at any moment. The goal of the Cognitive Cycle is
  to update the Knowledge State with new Observations. The goal of Decision is to project
  the Knowledge State into action.

### 6.2 Certainty

- **Spanish**: Certidumbre
- **Definition**: A measure of how confident the system is that a Belief corresponds to
  Truth, based on the weight and consistency of Evidence.
- **Domain**: Knowledge State
- **Category**: Property
- **Relations**:
  - is-a: Property (of Belief)
  - depends-on: Evidence, Confidence (of sources)
  - conflicts-with: Confidence (certainty is about the Belief; confidence is about the Source)
- **Constraints**: Certainty is always a value in [0, 1]. Certainty of 1.0 is reserved for
  mathematical truths and system invariants. Certainty about empirical facts (what the user
  wants, where they are going) can never reach 1.0.
- **Expressions in code**: Implicit in `score` fields and `confidence` fields. Currently
  conflated with Source Confidence. The `ConfidenceMap` in `ai/types.ts` is the closest
  existing concept but mixes certainty and confidence.
- **Supersedes**: Previous ambiguous use of "confidence" for both source reliability and
  belief certainty.
- **Notes**: This is a NEW DISTINCTION. In the current code, `confidence` in CoreDecision
  and `score` in extraction both try to express certainty but without a clear separation
  from source reliability.

### 6.3 Confidence

- **Spanish**: Confianza
- **Definition**: A measure of the reliability of a Source, based on historical accuracy
  of that source type and the specific conditions under which the Fact was produced.
- **Domain**: Knowledge State
- **Category**: Property
- **Relations**:
  - is-a: Property (of Source, of Fact)
  - depends-on: Source type, HistoricalAccuracy
  - produces: Certainty (as input — Certainty is derived from Confidence of supporting evidence)
  - conflicts-with: Certainty (see above)
- **Constraints**: Confidence is a property of the Source, not the Belief. A DirectExtraction
  from a clear user statement has Confidence ~0.95. An LLM inference has Confidence ~0.7.
- **Expressions in code**: `score` in extraction results, `source` in slot-state.ts.
- **Supersedes**: The gloss where "confidence" was used as both "how sure are we of the
  value" and "how reliable is the source."
- **Notes**: Think of it this way: Confidence answers "how likely is this source to be right
  in general?" Certainty answers "how likely is THIS SPECIFIC belief to be true?" Certainty
  is a function of Confidence plus corroboration.

### 6.4 Hypothesis

- **Spanish**: Hipótesis
- **Definition**: A proposition that the system is actively considering but does not yet
  hold as a Belief, pending further Evidence.
- **Domain**: Knowledge State
- **Category**: Entity
- **Relations**:
  - is-a: Entity (abstract)
  - depends-on: Evidence (partial or ambiguous)
  - produces: Belief (when confirmed), DiscardedHypothesis (when refuted)
  - part-of: Hypothesis Network
  - conflicts-with: Belief (a Hypothesis becomes a Belief when the system commits to it)
- **Constraints**: Hypotheses exist only when Evidence is ambiguous or incomplete. A
  Hypothesis must have a falsification condition — a clear criterion for when it should be
  discarded. A Hypothesis without a falsification condition is a prejudice.
- **Expressions in code**: Currently implicit in the ambiguity resolution flow
  (`ambiguity-handler.ts`). When the system detects multiple possible interpretations, it
  is effectively maintaining multiple Hypotheses.
- **Supersedes**: This is a NEW concept. Previous code handled ambiguity case-by-case
  without a unified Hypothesis concept.
- **Notes**: The Hypothesis Network is the system's ability to maintain multiple
  interpretations simultaneously. Example: "The user said 'centro' — Hypothesis 1: centro
  de Asunción. Hypothesis 2: centro de Encarnación." The system holds both until Evidence
  favors one.

### 6.5 Hypothesis Network

- **Spanish**: Red de Hipótesis
- **Definition**: A dynamic structure of active Hypotheses and their relationships
  (supporting, contradicting, mutually exclusive).
- **Domain**: Knowledge State
- **Category**: Store
- **Relations**:
  - is-a: Store
  - contains: Hypothesis entities
  - depends-on: Evidence Store (when evidence is ambiguous)
  - produces: Belief (when one hypothesis dominates), Clarification (when none dominates)
- **Constraints**: The Hypothesis Network is ephemeral — it exists only during a Cognitive
  Cycle and is resolved before Commitment. The network is a directed acyclic graph where
  edges represent "supports" or "contradicts" relationships.
- **Expressions in code**: **DOES NOT EXIST**. Current code resolves ambiguity in a single
  pass without maintaining competing hypotheses explicitly.
- **Supersedes**: This is a NEW concept. Proposed by Auditoría #06.
- **Notes**: This is the structure that enables the system to "think before deciding." Without
  it, the system selects the most likely interpretation immediately, without considering
  alternatives. This is the root cause of overconfidence bugs.

---

## 7. Domain 5: Cognitive Process (Cognición)

> How the system thinks. The processes and cycles that transform Perception into Decision.

### 7.1 Cognitive Cycle

- **Spanish**: Ciclo Cognitivo
- **Definition**: The complete process from receiving a Signal to updating the Knowledge
  State and generating a Decision. One Cognitive Cycle = one turn of the system.
- **Domain**: Cognitive Process
- **Category**: Process
- **Relations**:
  - is-a: Process
  - consumes: Signal (or Observation)
  - produces: Decision, Updated Knowledge State
  - parts: Perception Phase, Reasoning Phase, Commitment Phase, Projection Phase
  - depends-on: Knowledge State (previous cycle's output is this cycle's input)
- **Constraints**: Every external Signal triggers exactly one Cognitive Cycle. A cycle must
  complete within bounded time (latency SLAs). A cycle can end without a Decision if the
  system determines it cannot decide safely (Escalation).
- **Expressions in code**: The pipeline in `handler.ts` + `lead.service.ts` + extraction +
  policy + LLM generation. Currently implemented as a straight-line pipeline, not as a
  recursive cycle.
- **Supersedes**: Previous term "processing pipeline" or "handler flow" which was
  implementation-focused and missed the cognitive nature.
- **Notes**: The Cognitive Cycle is the HEART of AITOS. Every architectural decision should
  be evaluated by how it affects the Cognitive Cycle. The current implementation is a
  simplified linear version. Future versions should be recursive (multiple micro-cycles)
  and reflective (the system can reason about its own cycle).

### 7.2 Perception Phase

- **Spanish**: Fase de Percepción
- **Definition**: The phase of the Cognitive Cycle that transforms a Signal into Evidence.
- **Domain**: Cognitive Process
- **Category**: Process (subtype)
- **Relations**:
  - part-of: Cognitive Cycle
  - consumes: Signal
  - produces: Evidence
  - depends-on: Channel, Source classification
  - sequence: first phase of the cycle
- **Constraints**: The Perception Phase must complete within time budget T1 (strict).
  It must not call the LLM. It is purely deterministic.
- **Expressions in code**: Webhook handler, HMAC verification, rate limiting, idempotency
  check, basic message parsing.
- **Supersedes**: Previously called "validation" or "pre-processing".
- **Notes**: The Perception Phase is the system's sensory layer. It is stateless, fast, and
  deterministic. Its output is Evidence (structured facts from the Signal).

### 7.3 Reasoning Phase

- **Spanish**: Fase de Razonamiento
- **Definition**: The phase of the Cognitive Cycle that updates the Knowledge State by
  integrating new Evidence with existing Beliefs, generating Hypotheses, and resolving
  ambiguity.
- **Domain**: Cognitive Process
- **Category**: Process (subtype)
- **Relations**:
  - part-of: Cognitive Cycle
  - consumes: Evidence, Current Knowledge State
  - produces: Updated Knowledge State, Hypothesis Network
  - depends-on: All Knowledge State structures
  - sequence: second phase of the cycle
- **Constraints**: The Reasoning Phase is the MOST COMPLEX phase. It may use LLM, heuristics,
  or deterministic rules. It must converge — the phase ends when the Hypothesis Network is
  resolved or a Clarification path is determined.
- **Expressions in code**: Extraction runner, comprehension engine, slot workflow, intent
  detection, confidence computation. Currently distributed across multiple files with no
  unified "reasoning" concept.
- **Supersedes**: Previously called "processing" or "extraction + comprehension".
- **Notes**: This is where the "thinking" happens. The current architecture conflates
  reasoning with decision-making — they should be separate phases. Reasoning determines
  what is true; Commitment determines what to do about it.

### 7.4 Commitment Phase

- **Spanish**: Fase de Compromiso
- **Definition**: The phase of the Cognitive Cycle that decides which Beliefs to commit to
  (act upon) and which to leave as provisional.
- **Domain**: Cognitive Process
- **Category**: Process (subtype)
- **Relations**:
  - part-of: Cognitive Cycle
  - consumes: Knowledge State (from Reasoning Phase)
  - produces: Commitment, Operational Projection
  - depends-on: Certainty thresholds, Cost of Error, Strategic Posture
  - sequence: third phase of the cycle
- **Constraints**: A Commitment can be revoked but has a Cost. Commitments below the
  Certainty threshold must default to Clarification or Escalation. The Commitment Phase
  is where Epistemic Humility is enforced.
- **Expressions in code**: Currently implicit in the transition from extraction to policy.
  The `comprehensionState` (FULL_CONTROL, CLARIFICATION, RECOVERY, ESCALATION) is a
  primitive version of commitment levels.
- **Supersedes**: Previously mixed with "decision" — what is now Commitment was part of
  "the decision" without clear separation.
- **Notes**: This is a NEW PHASE. The current architecture jumps from extraction to policy
  without an explicit Commitment step. The Cost of Error is never computed. Adding this
  phase is critical for safety.

### 7.5 Projection Phase

- **Spanish**: Fase de Proyección
- **Definition**: The phase of the Cognitive Cycle that translates Commitments into an
  Operational Projection (what the system will do) and generates the external response.
- **Domain**: Cognitive Process
- **Category**: Process (subtype)
- **Relations**:
  - part-of: Cognitive Cycle
  - consumes: Commitment, Operational Model
  - produces: Operational Projection, Response
  - depends-on: Business rules, Templates
  - sequence: fourth and final phase of the cycle
- **Constraints**: The Projection Phase must not create new Commitments. It executes
  existing ones. If the projection fails (invalid trip, no available driver), the failure
  feeds back into the next Cognitive Cycle.
- **Expressions in code**: Policy engine, template rendering, LLM response generation.
- **Supersedes**: Previously called "execution" or "generation".
- **Notes**: The Projection Phase is about ACTION. It takes the abstract "what we believe
  and what we've decided" and turns it into concrete operations (update DB, send message,
  dispatch driver).

### 7.6 Cognitive Cycle Latency Budget

- **Spanish**: Presupuesto de Latencia del Ciclo Cognitivo
- **Definition**: The time allocated for each phase of the Cognitive Cycle, governing
  architecture decisions about what can use LLM and what must be deterministic.
- **Domain**: Cognitive Process
- **Category**: Property (meta)
- **Relations**:
  - depends-on: Channel requirements (WhatsApp expects <5s)
  - constrains: Phase implementation choices
- **Constraints**: Total cycle must complete within channel timeout. Perception Phase:
  <100ms. Reasoning Phase: <2s (or <5s if LLM required). Commitment Phase: <50ms. Projection
  Phase: <1s.
- **Expressions in code**: Not formalized. Implicit in timeout configurations.
- **Supersedes**: This is a NEW concept. Current architecture has implicit timeouts in
  various places but no unified budget.
- **Notes**: This budget is why the Triple Fallback exists — if LLM takes too long in
  Reasoning, the system must still complete the cycle within bounds.

---

## 8. Domain 6: Decision (Decisión y Compromiso)

> How the system commits to action.

### 8.1 Decision

- **Spanish**: Decisión
- **Definition**: A choice among alternatives that results in a Commitment.
- **Domain**: Decision
- **Category**: Entity (abstract)
- **Relations**:
  - is-a: Entity
  - depends-on: Knowledge State, Hypothesis Network
  - produces: Commitment, Action
  - part-of: Cognitive Cycle output
- **Constraints**: Every Decision must be traceable to the Evidence and Beliefs that
  motivated it. Every Decision must have a Cost of Error assessment. A decision made
  with zero Certainty is a guess and must be labeled as such.
- **Expressions in code**: `CoreDecision`, `FinalDecision` in `ai/types.ts`. The policy
  engine output.
- **Supersedes**: Previous use of "decision" as synonym for "output" or "response." Now
  Decision is the process of committing, not just the result.
- **Notes**: Decisions are the system's exercise of agency. The architecture should make
  every Decision auditable: "Given Evidence E, with Certainty C, considering Cost of Error
  X, the system decided D."

### 8.2 Commitment

- **Spanish**: Compromiso
- **Definition**: An irrevocable (or costly-to-revoke) choice to treat a Belief as true
  for operational purposes.
- **Domain**: Decision
- **Category**: Entity (abstract)
- **Relations**:
  - is-a: Entity
  - depends-on: Decision, Certainty threshold
  - produces: Operational Projection
  - conflicts-with: Hypothesis (a Commitment resolves a Hypothesis)
- **Constraints**: A Commitment is the system's "point of no return" for a given Cognitive
  Cycle. Commitments below the Certainty threshold are prohibited — the system must ask for
  clarification or escalate. Commitments can be rolled back (trip cancellation) but at a
  cost (user trust, operational cost, reputation).
- **Expressions in code**: Setting a slot to CONFIRMED status, changing trip_phase to
  CONFIRMED, dispatching a driver. Currently implicit — there is no explicit "commit"
  step in the code.
- **Supersedes**: This is a NEW concept. Previous architecture had no commitment concept
  — values moved through slot statuses without a formal commitment gate.
- **Notes**: Commitment is what separates Belief from Action. The system can believe many
  things but should commit to few. The Commitment gate is the system's primary safety
  mechanism.

### 8.3 Cost of Error

- **Spanish**: Costo del Error
- **Definition**: The estimated negative impact of making an incorrect Commitment —
  either a false positive (acting on a false belief) or a false negative (failing to act
  on a true belief).
- **Domain**: Decision
- **Category**: Property
- **Relations**:
  - depends-on: Commitment type, Business context
  - constrains: Certainty threshold for Commitment
  - part-of: Decision rationale
- **Constraints**: Cost of Error is always relative to the specific Decision context.
  Dispatching a driver to the wrong address (false positive) costs driver time and trust.
  Not dispatching when the user needs it (false negative) costs revenue and trust. Both
  costs must be estimated before Commitment.
- **Expressions in code**: **DOES NOT EXIST IN ANY FORM**. This is the single biggest gap
  in the current architecture.
- **Supersedes**: This is a NEW concept.
- **Notes**: The absence of Cost of Error means the system cannot rationally decide when
  to commit vs. when to ask for clarification. Every "confidence threshold" in the current
  code is arbitrary without Cost of Error weighting. Example: false positive cost for
  dispatching is $10 (driver payout + trust loss); false negative cost for not dispatching
  is $5 (lost revenue + user frustration). The Certainty threshold should be calibrated
  to minimize expected cost, not to meet an arbitrary number.

### 8.4 Certainty Threshold

- **Spanish**: Umbral de Certidumbre
- **Definition**: The minimum Certainty level required to make a Commitment of a given type.
- **Domain**: Decision
- **Category**: Rule
- **Relations**:
  - depends-on: Cost of Error, Strategic Posture
  - constrains: Commitment Phase
  - conflicts-with: Arbitrary thresholds (must be derived from Cost of Error, not intuition)
- **Constraints**: Thresholds must be calibrated per Decision type and per Strategic Posture.
  A threshold is a floating-point value in [0, 1]. Default threshold for operational
  Commitments: 0.85.
- **Expressions in code**: Implicit in the `comprehensionState` transitions. When
  comprehension is CLARIFICATION, the effective threshold is unmet.
- **Supersedes**: Previous use of "confidence threshold" in extraction and slot workflow
  without formal definition.
- **Notes**: Thresholds should be calibrated using Cost of Error. Current thresholds are
  heuristic. Formal calibration is a future improvement (post-MVP).

### 8.5 Strategic Posture

- **Spanish**: Postura Estratégica
- **Definition**: A parameter that adjusts the system's risk tolerance by modifying
  Certainty Thresholds and Cost of Error weights.
- **Domain**: Decision
- **Category**: State (meta)
- **Relations**:
  - is-a: Property (of the system)
  - depends-on: Context (hour, user history, business rules)
  - modifies: Certainty Threshold (up = conservative, down = aggressive)
  - values: CONSERVATIVE (high threshold, prefer clarification), BALANCED (default),
    AGGRESSIVE (lower threshold, prefer action)
- **Constraints**: Strategic Posture must never cause a safety-critical violation (e.g.,
  dispatching without confirmed origin). AGGRESSIVE mode should be used only in low-cost
  decisions.
- **Expressions in code**: **DOES NOT EXIST**. Current code has a single fixed posture
  (approximately BALANCED).
- **Supersedes**: This is a NEW concept.
- **Notes**: Strategic Posture is how the system adapts to context. At 3 AM with a known
  user, it might be more aggressive (user likely needs a ride now). With a new user asking
  a complex trip, it should be more conservative. This replaces heuristic "special cases"
  with a principled mechanism.

### 8.6 Intent

- **Spanish**: Intención
- **Definition**: A hypothesis about the user's goal, derived from the current Observation
  and the Knowledge State. The system's best guess at "what does the user want?"
- **Domain**: Decision
- **Category**: Hypothesis (subtype)
- **Relations**:
  - is-a: Hypothesis
  - depends-on: Observation, Knowledge State
  - produces: Decision type, Policy selection
  - conflicts-with: Previous assumption that Intent is a single classification.
- **Constraints**: Intent is a Hypothesis, not a Fact. Multiple Intents can coexist
  (e.g., BOOKING + QUERY_AVAILABILITY). The system must select the PRIMARY Intent for
  Commitment but can hold SECONDARY Intents as context. Intent must be re-evaluated every
  Cognitive Cycle.
- **Expressions in code**: `CoreDecision.intent` in `ai/types.ts`. Currently a single-value
  enum. The 11 values (GREETING, BOOKING, NOW, EMERGENCY, CONSULTA, COMMERCIAL, PRE_BOOKING,
  POST_SERVICE, RESCHEDULE, INFORMATIONAL, AMBIGUOUS) need to be reduced to ~6 (see below).
- **Supersedes**: Previous definition where Intent was "a classification of the message."
  Now Intent is "a hypothesis about the user's goal."
- **Notes**: This is a CRITICAL change. The current 11-value intent enum is too granular
  and creates overlapping categories (e.g., NOW vs. BOOKING — a ride request is always a
  booking, NOW only adds temporal immediacy). Proposed refined set:
  GREETING, BOOKING, QUERY, MANAGEMENT (reschedule/cancel), EMERGENCY, AMBIGUOUS.
  Temporal mode (NOW/FUTURE) and urgency are separate Properties, not Intent values.

### 8.7 Primary Intent

- **Spanish**: Intención Primaria
- **Definition**: The single Intent that drives the system's operational response for the
  current Cognitive Cycle.
- **Domain**: Decision
- **Category**: Property (of Decision)
- **Relations**:
  - part-of: Decision rationale
  - depends-on: Intent (as a hypothesis), Commitment
  - conflicts-with: Previous use of "intent" where it was always assumed to be singular
- **Constraints**: Exactly one Primary Intent per Cognitive Cycle. The Primary Intent
  determines which policy template and business flow to execute. Secondary Intents influence
  response generation but not operational flow.
- **Expressions in code**: Currently implicit — the `CoreDecision.intent` was always treated
  as singular. The distinction between Primary and Secondary is new.
- **Supersedes**: Previous "intent" which was implicitly singular.
- **Notes**: A user might say "I need a ride to the airport, and how much does it cost?"
  Primary Intent: BOOKING. Secondary Intent: QUERY (price). The system books the ride and
  includes the price in the response. Current architecture would classify this as BOOKING
  and lose the QUERY context.

---

## 9. Domain 7: Projection (Proyección Operacional)

> How the system represents operational reality based on its Knowledge State.

### 9.1 Operational Model

- **Spanish**: Modelo Operacional
- **Definition**: The abstract schema of what constitutes a valid transportation operation
  — the slots, their types, relationships, and validation rules.
- **Domain**: Projection
- **Category**: Model (static)
- **Relations**:
  - is-a: Model
  - contains: Slot definitions (origin, destination, passengers, scheduled_at, flight, etc.)
  - depends-on: Business domain knowledge (not on current Knowledge State)
  - produces: Operational Projection (when instantiated with values)
- **Constraints**: The Operational Model is STATIC. It does not change between Cognitive
  Cycles. It is the "schema" of a trip. Changes to the Operational Model require ADR
  approval.
- **Expressions in code**: `TripRow` type in `db/types.ts`, slot definitions in `ai/types.ts`,
  validation rules in `slot-workflow.ts`.
- **Supersedes**: Previous ambiguous use of "Operational Model" that conflated model
  (schema) with instance (specific trip values). The glossary defined it as "Representación
  canónica de un viaje mediante slots" which mixed schema and instance.
- **Notes**: This is a CORRECTION. The old definition mixed two things: (1) "what a trip
  looks like" (the model) and (2) "what this specific trip is" (the projection). These
  are now separated into Operational Model and Operational Projection.

### 9.2 Operational Projection

- **Spanish**: Proyección Operacional
- **Definition**: A read-only view of the Knowledge State expressed in terms of the
  Operational Model — the system's best current answer to "what is the trip?"
- **Domain**: Projection
- **Category**: Entity (derived)
- **Relations**:
  - is-a: View
  - depends-on: Knowledge State, Operational Model
  - produces: Business state updates (trips, dispatch)
  - conflicts-with: Evidence Store (Projection is a view; Evidence Store is the source)
- **Constraints**: The Operational Projection is READ-ONLY. It cannot be directly modified.
  It is computed fresh each Cognitive Cycle from the Evidence Store. Writing to the
  Operational Projection (e.g., updating trip table) must go through a Commitment gate.
- **Expressions in code**: Currently implicit — the slot values in `chat_sessions.slots`
  are a primitive projection. The `trips` table is a different kind of projection
  (committed projection).
- **Supersedes**: Previous concept of "the trip as it currently stands" which was conflated
  with both evidence and commitment.
- **Notes**: This is a NEW DISTINCTION. The current architecture treats `chat_sessions.slots`
  as both the evidence store and the projection. This causes problems: when a user corrects
  a slot, should we modify the "evidence" (which should be immutable) or the "projection"
  (which is a view)? The two should be separate.

### 9.3 Slot

- **Spanish**: Slot
- **Definition**: A field in the Operational Model that represents a specific property of a
  transportation operation (origin, destination, passengers, scheduled time, etc.).
- **Domain**: Projection
- **Category**: Entity (schema element)
- **Relations**:
  - is-a: Property definition
  - part-of: Operational Model
  - produces: Slot Value (when instantiated in a Projection)
  - depends-on: Business domain
- **Constraints**: Each Slot has a name, a type (string, number, datetime, reference), a
  validation rule, and a persistence rule (session-only vs. trip-bound). Slots can be
  REQUIRED (must be present for Commitment) or OPTIONAL.
- **Expressions in code**: Fields in `TripRow`, slot definitions in extraction prompts,
  state machine transitions in `slot-workflow.ts`.
- **Supersedes**: Previous definition where Slot was "un campo de datos que el sistema
  necesita" — which was circular and uninformative. Now Slot is explicitly a schema element
  of the Operational Model.
- **Notes**: In the new architecture, a Slot is NEVER a container of evidence. Evidence
  is stored in the Evidence Store. A Slot value in a Projection is a DERIVED view of
  evidence. This breaks the current tight coupling between slots and evidence.

### 9.4 Slot Value

- **Spanish**: Valor de Slot
- **Definition**: The value of a Slot in a specific Operational Projection, derived from
  the Evidence Store via a deterministic resolution function.
- **Domain**: Projection
- **Category**: Property (of Projection)
- **Relations**:
  - is-a: Property
  - part-of: Operational Projection
  - depends-on: Evidence Store, Resolution rules
  - conflicts-with: Direct evidence (slot value is a projection of evidence, not evidence itself)
- **Constraints**: A Slot Value must be accompanied by its Certainty. A Slot Value
  without Certainty is undefined. A Slot Value with Certainty below threshold must not be
  used for operational Commitments.
- **Expressions in code**: Currently stored directly in `chat_sessions.slots`. In the new
  architecture, this would be computed on-the-fly from the Evidence Store.
- **Supersedes**: Previous use of "slot" to mean both the field and its value.
- **Notes**: The separation between "Slot" (field), "Slot Value" (value in a projection),
  and "Evidence" (supporting facts) is the most important architectural decoupling
  proposed by this ontology. Current architecture conflates all three.

---

## 10. Domain 8: Business Domain (Negocio)

> The transportation business concepts that AITOS operationalizes.

### 10.1 Trip

- **Spanish**: Viaje
- **Definition**: A concrete transportation operation from an origin to one or more
  destinations, with a passenger, a price, and a lifecycle.
- **Domain**: Business
- **Category**: Entity
- **Relations**:
  - is-a: Entity (core business entity)
  - depends-on: Operational Projection (the trip is a committed projection)
  - part-of: TripGroup (when multi-leg)
  - contains: Origin, Destination, Passenger, Price, Schedule, Status (TripPhase)
  - produces: Dispatch, Revenue, Event history
- **Constraints**: A Trip must have at least one origin and one destination. A Trip must
  have exactly one passenger (the phone identity). A Trip must have a unique ID. A Trip's
  lifecycle is governed by TripPhase transitions.
- **Expressions in code**: `TripRow` in `db/types.ts`, `trips` table, `trip_events` table.
- **Supersedes**: Previous usage consistent. No change.
- **Notes**: The Trip is the central business entity. Everything in the system exists to
  create, manage, and complete Trips.

### 10.2 Trip Phase

- **Spanish**: Fase del Viaje
- **Definition**: The current stage in a Trip's lifecycle, from creation to closure.
- **Domain**: Business
- **Category**: Property (of Trip)
- **Relations**:
  - is-a: Property
  - consumes: A Trip entity
  - values: DRAFT → QUOTED → CONFIRMED → ASSIGNED → IN_PROGRESS → CLOSED
  - depends-on: Cognitive Cycle (phase transitions are Commitment outcomes)
- **Constraints**: Phase transitions are unidirectional (no going back) except CLOSED is
  terminal. Each transition must be recorded in `trip_events`. Certain transitions require
  external events (ASSIGNED → IN_PROGRESS requires driver confirmation).
- **Expressions in code**: `TripPhase` enum in `db/types.ts`, `trip_events` table.
- **Supersedes**: Previous term "trip_status" is obsolete. The glossary already notes this.
- **Notes**: Trip Phase is the BUSINESS lifecycle, distinct from conversational state or
  cognitive state.

### 10.3 Dispatch

- **Spanish**: Despacho
- **Definition**: The process of finding and assigning a Driver to a Trip.
- **Domain**: Business
- **Category**: Process
- **Relations**:
  - is-a: Process
  - consumes: Trip (with CONFIRMED or IN_PROGRESS phase)
  - produces: Driver assignment, Trip phase change (ASSIGNED)
  - depends-on: Driver availability, Trip details, Pricing
- **Constraints**: Dispatch follows the escalation protocol (principal → principal2 →
  broadcast). Assignment is atomic (one driver per trip). Dispatch must complete within
  time bounds (timeout-based escalation).
- **Expressions in code**: `dispatch.service.ts`, `dispatch-workflow.ts`, `driver_notifications`.
- **Supersedes**: Previous usage consistent. No change.
- **Notes**: Dispatch is a BUSINESS process, not a cognitive one. While the Cognitive Cycle
  decides whether to dispatch, the Dispatch process executes that decision.

### 10.4 Driver

- **Spanish**: Chofer
- **Definition**: An Agent capable of accepting and completing Trips.
- **Domain**: Business
- **Category**: Agent (subtype)
- **Relations**:
  - is-a: Agent
  - part-of: Driver fleet
  - depends-on: Tier, Shift, Country, Payout configuration
  - produces: Trip completion (with Passenger)
- **Constraints**: A Driver must be authenticated, have a valid shift and tier, and be
  available for dispatch. A Driver can only be assigned to one Trip at a time.
- **Expressions in code**: `drivers` table, driver validation in dispatch service.
- **Supersedes**: Previous occasional use of "driver" and "chofer" interchangeably. English
  term is now normative: "Driver".
- **Notes**: Driver is a subtype of Agent with specific business attributes.

### 10.5 Passenger

- **Spanish**: Pasajero
- **Definition**: A human Agent who requests and uses transportation services.
- **Domain**: Business
- **Category**: Agent (subtype)
- **Relations**:
  - is-a: Agent
  - identified-by: Phone number (I1)
  - consumes: Trip
  - produces: Message, Payment, Feedback
- **Constraints**: A Passenger is identified by their WhatsApp phone number. A Passenger may
  have multiple Trips. A Passenger's identity is session-persistent.
- **Expressions in code**: `chat_sessions.phone`, no dedicated `passengers` table.
- **Supersedes**: Previous occasional use of "user" or "cliente". The normative term is
  "Passenger".
- **Notes**: The system currently has no Passenger entity separate from chat_sessions.
  This is acceptable for MVP but a dedicated Passenger domain may be needed for CRM features.

### 10.6 Pricing

- **Spanish**: Precio
- **Definition**: The process of determining the public price and driver payout for a Trip.
- **Domain**: Business
- **Category**: Process
- **Relations**:
  - is-a: Process
  - consumes: Trip details (origin, destination, etc.)
  - produces: Price quote, Driver payout
  - depends-on: Tariff resolution, Discount rules
- **Constraints**: Pricing must follow tariff resolution priority (place→place highest,
  zone→zone lowest). Pricing must never use LLM. Pricing must cover minimum margin (Piso).
- **Expressions in code**: `pricing-engine.ts`, `tariff-resolver.ts`, `hub-discount.ts`.
- **Supersedes**: Previous usage consistent. No change.
- **Notes**: Pricing is a deterministic business process. The Cognitive Cycle decides
  WHEN to price (commitment gate), but the pricing itself is a business computation.

### 10.7 Tariff

- **Spanish**: Tarifa
- **Definition**: A rule that determines the price between two geographic entities (Places
  or Zones).
- **Domain**: Business
- **Category**: Entity
- **Relations**:
  - is-a: Entity (business rule)
  - part-of: Pricing
  - depends-on: Place, Zone
  - produces: Price
- **Constraints**: Tariffs have a resolution priority (1-4). A tariff is valid for a specific
  origin-destination pair. Tariffs can have temporal validity.
- **Expressions in code**: `TariffRow` in `db/types.ts`, tariff tables.
- **Supersedes**: Previous usage consistent. No change.
- **Notes**: Core business asset. The tariff database is the system's primary source of
  revenue logic.

### 10.8 Place

- **Spanish**: Lugar
- **Definition**: A geographic location with coordinates, type, and zone association,
  representable as an origin or destination.
- **Domain**: Business
- **Category**: Entity
- **Relations**:
  - is-a: Entity
  - part-of: Zone
  - depends-on: Geo data
  - produces: Resolvable location for pricing and dispatch
- **Constraints**: Every Place belongs to exactly one Zone. A Place has a type (city,
  neighborhood, landmark, etc.). A Place can have multiple Aliases (names in different
  languages).
- **Expressions in code**: `PlaceRow` in `db/types.ts`, `places` table, `aliases` table.
- **Supersedes**: Previous usage consistent. No change.
- **Notes**: Place resolution (text → Place) is a key system capability involving both
  deterministic (alias lookup) and probabilistic (LLM disambiguation) methods.

### 10.9 Zone

- **Spanish**: Zona
- **Definition**: An operational area that groups Places for pricing and dispatch purposes.
- **Domain**: Business
- **Category**: Entity
- **Relations**:
  - is-a: Entity
  - contains: Place
  - depends-on: Geo boundaries
  - produces: Zone-to-zone tariffs
- **Constraints**: Every Place belongs to exactly one Zone. Zones can overlap? (Current
  design says no — each place has one zone_id). Zone boundaries are manually maintained.
- **Expressions in code**: `ZoneRow` in `db/types.ts`, `zones` table.
- **Supersedes**: Previous usage consistent. No change.
- **Notes**: Zones are the geographic abstraction that makes pricing and dispatch tractable
  without needing exact coordinates for every operation.

---

## 11. Domain 9: Memory & Persistence

> How the system remembers across Cognitive Cycles.

### 11.1 Memory

- **Spanish**: Memoria
- **Definition**: The system's capacity to retain and retrieve information across Cognitive
  Cycles. Not a single store but a set of layered stores with different retention and
  access characteristics.
- **Domain**: Memory
- **Category**: Store (abstract)
- **Relations**:
  - is-a: Store
  - subtypes: Immediate Memory, Conversation Memory, Business State, Episodic Memory,
    Semantic Memory, Learning Memory
  - part-of: Knowledge State
  - depends-on: Persistence infrastructure
- **Constraints**: Each memory layer has different retention policy, access latency, and
  mutation rules. Lower layers are faster but more volatile. Higher layers are slower but
  more durable. Data flows between layers through consolidation processes.
- **Expressions in code**: Multiple stores: `memory.ts`, `context-memory.ts`, `chat_sessions`
  table, `trips` table, `learning/` models.
- **Supersedes**: All previous scattered use of "memory" as a single concept. Now Memory
  is a family of related concepts.
- **Notes**: This six-layer model replaces the current ad-hoc memory architecture. Current
  code has pieces of each layer but without the unified design, leading to data duplication
  and inconsistency.

### 11.2 Immediate Memory

- **Spanish**: Memoria Inmediata
- **Definition**: The current Cognitive Cycle's working data — the Observation being
  processed, active Hypotheses, and temporary computations.
- **Domain**: Memory
- **Category**: Store (subtype)
- **Relations**:
  - is-a: Memory
  - depends-on: Current Observation
  - produces: Evidence, Updated Knowledge State
  - retention: Volatile — exists only during one Cognitive Cycle
- **Constraints**: Immediate Memory is never persisted. It is the "scratch space" for the
  current cycle. Its contents are either discarded or consolidated into other memory layers
  at cycle end.
- **Expressions in code**: Local variables in `handler.ts`, `lead.service.ts`, extraction
  functions. Not a formal store.
- **Supersedes**: Previously implicit — was not recognized as a distinct memory layer.
- **Notes**: Recognition of Immediate Memory clarifies why some data "disappears" between
  cycles — it was never meant to persist. The system designer should explicitly decide
  what moves from Immediate to other layers.

### 11.3 Conversation Memory

- **Spanish**: Memoria de Conversación
- **Definition**: The record of the ongoing conversation between the system and a Passenger,
  including messages, detected intents, and turn-by-turn context.
- **Domain**: Memory
- **Category**: Store (subtype)
- **Relations**:
  - is-a: Memory
  - contains: Messages (recent), Detected intents, Turn context, Short-term slot values
  - depends-on: Conversation (ongoing sequence of Cognitive Cycles)
  - retention: Duration of the conversation session (typically 24h inactivity timeout)
- **Constraints**: Conversation Memory is per-phone. It is created when the first message
  arrives and destroyed after inactivity timeout. Its primary purpose is maintaining
  conversational coherence (referring to "it" from previous turn).
- **Expressions in code**: `SessionMemory` + `ShortTermBuffer` in `memory.ts`, `ContextMemory`
  in `context-memory.ts`.
- **Supersedes**: Previously scattered across `memory.ts` and `context-memory.ts` with
  unclear separation.
- **Notes**: The current code has THREE separate "conversation memory" implementations:
  `memory.ts` (immediate context), `context-memory.ts` (persistent slots), and
  `chat_sessions` (business state). These should be unified into one Conversation Memory
  layer.

### 11.4 Business State

- **Spanish**: Estado de Negocio
- **Definition**: The persisted operational state of all business entities (Trips, Drivers,
  Prices, etc.) that survive beyond conversation sessions.
- **Domain**: Memory
- **Category**: Store (subtype)
- **Relations**:
  - is-a: Memory
  - contains: Trip records, Driver records, Payment records, Configuration
  - depends-on: Database infrastructure
  - retention: Permanent (until explicitly deleted or archived)
- **Constraints**: Business State is the authoritative record for business operations.
  It is the only layer that external systems (accounting, admin dashboard) read. Changes
  to Business State require Commitments.
- **Expressions in code**: All database tables (`trips`, `drivers`, `prices`, `tariffs`,
  `chat_sessions`, `trip_events`, `processed_messages`).
- **Supersedes**: Previously called "database" or "persistence layer." Business State is
  a more precise term for the subset of DB that represents business facts.
- **Notes**: Not everything in the DB is Business State. Logs, for example, are Episodic
  Memory, not Business State. The distinction is often blurred in the current code.

### 11.5 Episodic Memory

- **Spanish**: Memoria Episódica
- **Definition**: The record of past Cognitive Cycles, Outcomes, and system events —
  the system's "autobiography."
- **Domain**: Memory
- **Category**: Store (subtype)
- **Relations**:
  - is-a: Memory
  - contains: Cycle logs, Decisions, Outcomes, Errors, Anomalies
  - depends-on: Every Cognitive Cycle (writes to it)
  - retention: Configurable (typically 90 days for logs, permanent for anomalies)
- **Constraints**: Episodic Memory is append-only and immutable. It is used for debugging,
  auditing, and learning. The system's learning layer reads Episodic Memory to detect
  patterns.
- **Expressions in code**: Log files, `trip_events` table (partial — mixes with Business
  State), error tracking.
- **Supersedes**: Previously called "logs" or "event log." The term "Episodic Memory"
  captures its cognitive function: it's how the system remembers its own history.
- **Notes**: AITOS currently has no unified Episodic Memory. Events are scattered across
  logs, `trip_events`, and implicit system state. A unified Episodic Memory would enable
  much richer learning and debugging.

### 11.6 Semantic Memory

- **Spanish**: Memoria Semántica
- **Definition**: The system's general knowledge about the world — geography, business rules,
  pricing logic, operational models — that does not depend on specific episodes.
- **Domain**: Memory
- **Category**: Store (subtype)
- **Relations**:
  - is-a: Memory
  - contains: Operational Model, Business rules, Tariff definitions, Place/Zone data,
    Prompt templates, Policy templates
  - depends-on: Engineering team (knowledge encoded during development)
  - retention: Permanent (changes through deployments, not through Cognitive Cycles)
- **Constraints**: Semantic Memory is modified through deployment, not through runtime
  system operation. It is the "compiled knowledge" of AITOS. Changes require engineering
  review and testing.
- **Expressions in code**: Static data (tariffs, places, zones), configuration files,
  prompt templates, policy templates, business rule implementations.
- **Supersedes**: Previously called "configuration" or "static data" or "knowledge base."
- **Notes**: Semantic Memory is what the system KNOWS ABOUT THE WORLD vs. what it REMEMBERS
  ABOUT ITS INTERACTIONS (Episodic) or ABOUT THE USER (Conversation). This is the layer
  that makes AITOS a "transportation expert" even before it talks to a passenger.

### 11.7 Learning Memory

- **Spanish**: Memoria de Aprendizaje
- **Definition**: The models, patterns, and adjusted parameters that result from the
  system's learning processes over time.
- **Domain**: Memory
- **Category**: Store (subtype)
- **Relations**:
  - is-a: Memory
  - contains: Fare learning weights, Opportunity rankings, Predictive routing patterns
  - depends-on: Episodic Memory (input for learning), Semantic Memory (initial state)
  - retention: Permanent (evolves through learning cycles)
- **Constraints**: Learning Memory is the ONLY mutable Semantic-like store. It represents
  the system's adaptation to its operational environment. Learning Memory must be
  versioned and revertible.
- **Expressions in code**: `learning/fare-learning-engine.ts` (weights),
  `learning/opportunity-engine.ts` (rankings), `memory/predictive-routing.ts` (patterns).
- **Supersedes**: Previously called "learning models" or "adaptive parameters."
- **Notes**: Learning Memory is the bridge between Episodic (what happened) and Semantic
  (what we know). It transforms patterns from episodes into updated knowledge.

---

## 12. Domain 10: Action & Infrastructure

> How the system acts and the infrastructure that supports it.

### 12.1 Action

- **Spanish**: Acción
- **Definition**: An externally visible effect produced by the system as the result of a
  Cognitive Cycle.
- **Domain**: Action
- **Category**: Entity (abstract)
- **Relations**:
  - is-a: Entity
  - depends-on: Decision, Commitment
  - subtypes: Response (message to user), DispatchOrder, DBWrite, AdminNotification,
    Escalation
- **Constraints**: Every Action must correspond to exactly one Decision. An Action must
  be logged in Episodic Memory. Actions are irreversible (though their effects may be
  compensable — cancellation compensates for booking).
- **Expressions in code**: `sendWhatsAppMessage()`, database writes, dispatch calls,
  admin notifications.
- **Supersedes**: Previously called "output" or "response." Action is broader — it includes
  non-communicative actions (DB writes, dispatch).
- **Notes**: Distinction from Projection: Projection is what the system PLANS to do.
  Action is what it actually DOES. A Projection can fail (e.g., dispatch fails because no
  driver available) and never become an Action.

### 12.2 Response

- **Spanish**: Respuesta
- **Definition**: An Action that communicates information back to the Passenger through
  the conversational Channel.
- **Domain**: Action
- **Category**: Action (subtype)
- **Relations**:
  - is-a: Action
  - depends-on: Policy output, LLM generation (optional)
  - produces: Message (outbound)
  - part-of: Conversation turn
- **Constraints**: A Response must be comprehensible to the Passenger. A Response must
  not be empty. A Response can be template-based (fast, deterministic) or LLM-generated
  (rich, contextual). The LLM generation is optional — templates are the default.
- **Expressions in code**: `generateLLMResponse()`, policy templates, `sendMessage()`.
- **Supersedes**: Previous usage consistent. No change.
- **Notes**: The system's "voice." The Policy Engine determines WHAT to say; the Response
  generation determines HOW to say it.

### 12.3 Triple Fallback

- **Spanish**: Triple Fallback
- **Definition**: The architectural pattern where any capability degrades through three
  layers: fast deterministic → heuristic/DB → LLM → safe fallback.
- **Domain**: Action
- **Category**: Pattern
- **Relations**:
  - is-a: Architectural pattern
  - applies-to: Extraction, Ambiguity resolution, Response generation
  - depends-on: I6, I7 (LLM invariants)
  - produces: Graceful degradation
- **Constraints**: Each layer must be independently testable. An upper layer must not
  assume the availability of a lower layer. The final fallback must always succeed (return
  a safe default, not crash).
- **Expressions in code**: Extraction (regex → entity → LLM), LLM provider (Groq → null),
  response generation (template → LLM).
- **Supersedes**: Previous documentation described Triple Fallback at the architectural
  level but current code implements it inconsistently (sometimes 2 layers, sometimes 3).
- **Notes**: The Triple Fallback is AITOS's core reliability pattern. It embodies the
  principle "never depend on any single component, especially the LLM." Its implementation
  should be audited for consistency.

### 12.4 Idempotency

- **Spanish**: Idempotencia
- **Definition**: The guarantee that processing the same Signal multiple times produces
  the same result as processing it once.
- **Domain**: Action
- **Category**: Property (of the system)
- **Relations**:
  - is-a: System property
  - depends-on: Signal identity (message_id)
  - constrains: Perception Phase (must check idempotency before creating Observation)
- **Constraints**: Idempotency is enforced by the `processed_messages` table with UNIQUE
  constraint on `message_id`. No Message should be processed more than once. Idempotency
  is checked BEFORE any business logic.
- **Expressions in code**: `processed_messages` table, early return in webhook handler.
- **Supersedes**: Previous usage consistent. No change.
- **Notes**: Idempotency is the system's first invariant after security. It is critical
  because WhatsApp can and does deliver duplicate webhooks.

### 12.5 Rate Limit

- **Spanish**: Límite de Tasa
- **Definition**: The constraint that a Passenger may not send more than a maximum number
  of Messages within a time window.
- **Domain**: Action
- **Category**: Rule
- **Relations**:
  - depends-on: Channel policy
  - constrains: Perception Phase
  - conflicts-with: Passenger urgency (rate limits may delay legitimate urgent messages)
- **Constraints**: Current limit: 10 messages per phone per 60-second window. Violations
  result in temporary suspension of processing (not rejection — the message is queued).
- **Expressions in code**: `checkRateLimit()` in webhook route.
- **Supersedes**: Previous usage consistent. No change.
- **Notes**: Rate limiting is a safety mechanism against runaway conversations and abuse.
  It should be sensitive to Emergency Intent (emergency messages may need different limits).

---

## 13. Domain 11: Learning & Adaptation

> How the system improves over time.

### 13.1 Outcome

- **Spanish**: Resultado
- **Definition**: The observed result of an Action, used to evaluate whether the system's
  Decision was correct.
- **Domain**: Learning
- **Category**: Entity
- **Relations**:
  - is-a: Entity
  - depends-on: Action, Reality (outside system)
  - produces: Feedback, Learning signal
  - part-of: Episodic Memory
- **Constraints**: An Outcome is the closest the system gets to "truth" — it's a record of
  what actually happened after an action. Outcomes are observable but not always available
  (e.g., did the passenger actually like the service?). Outcomes are always delayed relative
  to Decisions (credit assignment problem).
- **Expressions in code**: Trip completion events, driver acceptance/rejection, user
  corrections, session outcomes.
- **Supersedes**: Previously implicit. Was not formalized as a distinct concept.
- **Notes**: Without explicit Outcome tracking, the system cannot learn. Current code
  tracks some outcomes (trip closures) but does not feed them back into the Cognitive
  Cycle. The gap between "what the system decided" and "what actually happened" is the
  learning opportunity.

### 13.2 Feedback

- **Spanish**: Retroalimentación
- **Definition**: Information about an Outcome that can be used to adjust future Decisions.
- **Domain**: Learning
- **Category**: Signal (learning)
- **Relations**:
  - is-a: Signal
  - depends-on: Outcome
  - produces: Learning trigger
  - subtypes: Explicit feedback (user rating), Implicit feedback (user behavior),
    Operational feedback (driver accepted/rejected)
- **Constraints**: Feedback is always imperfect (user might not respond, driver might accept
  for wrong reasons). Feedback must be filtered for signal vs. noise before updating
  Learning Memory.
- **Expressions in code**: Trip closure reasons (CANCELLED_CLIENT, COMPLETED, etc.),
  driver acceptance timeouts.
- **Supersedes**: Previously implicit. The `fare-learning-engine.ts` uses a primitive form
  of feedback.
- **Notes**: Feedback is the raw material of learning. Without systematic feedback
  collection, the system cannot distinguish good Decisions from lucky outcomes.

### 13.3 Learning

- **Spanish**: Aprendizaje
- **Definition**: The process of updating Semantic Memory or Learning Memory based on
  patterns detected in Episodic Memory and Feedback.
- **Domain**: Learning
- **Category**: Process
- **Relations**:
  - is-a: Process
  - consumes: Episodic Memory, Feedback
  - produces: Updated Learning Memory, Updated Semantic Memory (rare)
  - depends-on: Sufficient data (no learning from single events)
- **Constraints**: Learning must be conservative (avoid overfitting to noise). Learning
  must be revertible (rollback capability). Learning should not happen during a Cognitive
  Cycle — it is an offline or background process.
- **Expressions in code**: `fare-learning-engine.ts` (batch update), `opportunity-engine.ts`
  (ranking adjustment), `predictive-routing.ts` (pattern detection).
- **Supersedes**: Previous use of "learning" as a catch-all for any adaptive behavior.
- **Notes**: True learning (pattern extraction from episodes) is distinct from
  within-conversation adaptation (which is handled by Conversation Memory and the normal
  Cognitive Cycle). Current code sometimes conflates the two.

### 13.4 Fare Learning

- **Spanish**: Aprendizaje de Tarifas
- **Definition**: The specific learning process that adjusts tariff weights based on
  observed acceptance and completion rates.
- **Domain**: Learning
- **Category**: Process (subtype)
- **Relations**:
  - is-a: Learning
  - consumes: Trip outcomes (completed, cancelled, driver rejected)
  - produces: Adjusted tariff weights
  - depends-on: Sufficient trip history
- **Constraints**: Fare Learning must not violate the Piso (minimum margin). Adjustments
  are bounded (max ±20% per period). Learning velocity is controlled to prevent oscillation.
- **Expressions in code**: `fare-learning-engine.ts`.
- **Supersedes**: Previous usage consistent. No change.
- **Notes**: Fare Learning is an example of Reinforcement Learning in AITOS. The system
  proposes a price, observes the outcome (accepted? driver found?), and adjusts. This is
  one of the most mature learning subsystems in the current codebase.

### 13.5 Opportunity Engine

- **Spanish**: Motor de Oportunidades
- **Definition**: A learning subsystem that ranks and recommends complementary offers
  (promotions, packages, discounts) based on context and historical acceptance.
- **Domain**: Learning
- **Category**: Process (subtype)
- **Relations**:
  - is-a: Process
  - consumes: Knowledge State, Historical outcomes
  - produces: Opportunity ranking
  - depends-on: Learning Memory (previous ranking effectiveness)
- **Constraints**: Opportunities must be non-interrupting (never block the primary flow).
  Opportunities must be relevant (context-dependent). The default is "no opportunity."
- **Expressions in code**: `opportunity-engine.ts`.
- **Supersedes**: Previous usage consistent. No change.
- **Notes**: The Opportunity Engine is a revenue optimization subsystem. It is orthogonal
  to the core Cognitive Cycle — it adds information to the Response but does not affect
  the Decision.

---

## 14. Cross-Domain Relationship Map

> How the concepts connect across domains. This is the "knowledge graph" of AITOS.

```
  [Channel] ──receives──> [Signal] ──becomes──> [Observation]
                                                    │
                                                    ▼
  [Source] ◄──qualifies── [Fact] ◄──extracted_from──┘
      │                      │
      ▼                      ▼
  [Confidence]          [Evidence] ◄──stored_in── [Evidence Store]
      │                      │
      └──────┬───────────────┘
             ▼
       [Belief] ◄──aggregated_from
          │
          ├──has──> [Certainty]
          ├──has──> [Hypothesis Network]
          │
          ▼
     [Knowledge State] ◄──updated_by── [Cognitive Cycle]
          │
          ├──feeds──> [Decision]
          │               │
          │               ├──has──> [Primary Intent]
          │               ├──has──> [Cost of Error]
          │               ├──has──> [Strategic Posture]
          │               │
          │               ▼
          │          [Commitment] ◄──gated_by── [Certainty Threshold]
          │               │
          │               ▼
          │     [Operational Projection] ◄──instantiated_from── [Operational Model]
          │               │
          │               ▼
          │           [Action] ──produces──> [Outcome]
          │               │                      │
          │               ▼                      ▼
          │          [Response]              [Feedback] ──feeds──> [Learning]
          │                                                              │
          └──────────────────────────────────────────────────────────────┘
                                (Learning updates Knowledge State)
```

### Key Domain Boundaries

| From | To | Via | Cardinality |
|------|-----|-----|------------|
| Perception | Evidence | Extraction | 1:N (one observation → many facts) |
| Evidence | Knowledge State | Integration | N:1 (many evidence → one belief) |
| Knowledge State | Decision | Commitment Gate | 1:1 (one decision per cycle) |
| Decision | Projection | Operational Model | 1:1 (one projection per decision) |
| Projection | Business | Execution | 1:N (one projection → many operations) |
| Memory | All | Persistence | M:N (all domains read/write memory) |
| Learning | Memory | Pattern extraction | 1:N (learning updates multiple memory layers) |

### Prohibited Cross-Domain Violations

The following cross-domain interactions are FORBIDDEN by this ontology:

1. **Business directly reads Evidence**: Business State must read Operational Projections,
   not raw Evidence. Evidence is for the cognitive system; Business State is for operations.
2. **Decision directly reads Perception**: Decisions must go through Knowledge State.
   No "skip the reasoning" paths.
3. **Learning writes to Semantic Memory**: Learning writes to Learning Memory only.
   Semantic Memory changes require ADR and deployment.
4. **LLM writes to Business State**: I8 invariant. LLM can contribute to Evidence Store
   (via extraction) but never directly to Business State.

---

## 15. Register of Superseded and Obsolete Terms

> Terms that must NOT be used in their old meaning. When you find these terms in existing
> code or documents, treat them as defective and in need of replacement.

### 15.1 Fully Obsolete Terms

| Obsolete Term | Domain | Replaced By | Reason for Obsolescence |
|--------------|--------|-------------|------------------------|
| `workflow_state` | Conversation | `conversational_state` | Already deprecated in glossary. Redundant with `conversational_state`. |
| `f4_state` | Conversation | `comprehension_state` | Cryptic name. Uninformative. |
| `trip_status` | Business | `trip_phase` | Already deprecated. Confuses "status" (any state) with "phase" (lifecycle stage). |
| `confirmed_fields` | Evidence | `slot_states` | Already deprecated. Misleading — fields are not "confirmed" per se; they have a status. |
| `alias_lookup` | Geo | `aliases` | Already deprecated. Implementation detail vs. concept. |
| `pipeline` | Cognitive | `Cognitive Cycle` | Mechanical metaphor. Misses the cognitive, recursive nature. |
| `pre-processing` | Cognitive | `Perception Phase` | Too narrow. Pre-processing is just validation. Perception includes all sensory input handling. |
| `post-processing` | Cognitive | `Projection Phase` | Too vague. Everything after decision is "post" — no information. |
| `confidence` (ambiguous) | Various | `Certainty` + `Confidence` | Split into two concepts. See Section 6.2 and 6.3. |
| `state` (unqualified) | Various | Specific state names | "State" must always be qualified: `conversational_state`, `trip_phase`, `slot_status`, `dispatch_state`. |
| `slot` (as evidence) | Evidence | `Evidence` + `Slot Value` | Slot is a schema element, not an evidence container. |
| `user` | Business | `Passenger` | "User" is too generic. AITOS has Passengers, Drivers, and Operators. |
| `client` | Business | `Passenger` | Inconsistent with English codebase convention. |
| `knowledge` (as absolute) | Foundation | `Knowledge State` | Knowledge is always a state, never a permanent truth. |
| `processing` (as phase) | Cognitive | `Reasoning Phase` | Too generic. Everything is "processing." |

### 15.2 Terms with Changed Meanings

| Term | Old Meaning | New Meaning |
|------|------------|-------------|
| `Intent` | A classification of the message (11-value enum) | A hypothesis about the user's goal, with Primary/Secondary distinction |
| `Memory` | A single concept (scattered implementations) | A family of 6 layered stores with distinct characteristics |
| `Operational Model` | "The canonical representation of a trip via slots" (conflated model + instance) | The STATIC schema of a trip (model). The instance is now `Operational Projection`. |
| `Slot` | A field the system needs — treated as evidence container | A schema element of the Operational Model |
| `Decision` | The output of the system | The process of committing, distinct from the action |
| `Confidence` | A single ambiguous measure of sureness | Source Confidence (reliability of source) vs. Certainty (belief strength) |
| `Engine` | Any specialized subsystem | A deterministic business process within a Bounded Context |
| `Hypothesis` | Not a formal concept | A proposition being actively considered, with falsification condition |
| `Truth` | What the system knows (implicit) | What is ACTUALLY the case, which the system never has direct access to |

---

## 16. Contradictions Detected and Resolved

> This section documents explicit contradictions found across source documents and how
> they are resolved by this ontology. Each resolution is authoritative.

### C1 — "What is the Operational Model?"

**Contradiction**: `docs/architecture/glossary.md` says "Representación canónica de un
viaje mediante slots." `docs/ai/INVARIANTS.md` I9 says "Operational Model represents the
truth." `docs/ai/ARCHITECTURE_BIBLE.md` uses it to mean "the schema of a trip." Three
different meanings for the same term.

**Resolution**: Operational Model is the STATIC SCHEMA. A specific trip's values are the
Operational Projection. I9 is amended: "The Operational Projection represents the truth
(epistemic truth, not absolute truth)." The glossary definition is superseded.

### C2 — "What is Intent?"

**Contradiction**: The code (`ai/types.ts`) defines 11 intent values, but ADR-005 says
AI should interpret ambiguous data — which implies intent is a fluid interpretation, not
a fixed classification. Additionally, the Conversational Principles audit found that
passengers express multiple intents in a single message, violating the single-intent model.

**Resolution**: Intent is a HYPOTHESIS (not a classification). Multiple intents can coexist
(Primary + Secondary). The 11 values are reduced to 6, with TemporalMode and Urgency
separated as independent properties.

### C3 — "What is Confidence?"

**Contradiction**: `ConfidenceMap` in `ai/types.ts` measures per-aspect confidence
(intent, origin, etc.). `score` in extraction measures source reliability. `CoreDecision.confidence`
measures overall confidence. These are three different things called by the same family of names.

**Resolution**: Two orthogonal concepts: Confidence (source reliability) and Certainty
(belief strength). `ConfidenceMap` becomes `CertaintyMap`. `score` remains as Confidence.
`CoreDecision.confidence` becomes `CoreDecision.certainty`.

### C4 — "What is the role of the LLM?"

**Contradiction**: I6 says "LLM is never the source of truth." But ADR-005 says "Let the
LLM decide" for ambiguity resolution. These seem contradictory — if the LLM decides, it
IS the source of truth for that decision.

**Resolution**: The LLM is a SOURCE OF EVIDENCE (like a sensor), not a source of COMMITMENT.
The LLM produces Facts (which go into the Evidence Store), but Commitments are made by
the Commitment Phase, which can consider LLM-provided Facts alongside other evidence.
This resolves the contradiction: LLM provides evidence; the system commits.

### C5 — "What is a Bounded Context?"

**Contradiction**: `docs/architecture/bounded-contexts.md` defines 8 bounded contexts
(Conversation, Extraction, Pricing, Geo, Trip, Dispatch, Learning, Memory). But the code
does not enforce bounded context boundaries — dependencies cross contexts freely (e.g.,
learning imports from db/domains, violating I13).

**Resolution**: The ontology defines domains (this document) which are CONCEPTUAL
boundaries. Bounded contexts (ADRs) are IMPLEMENTATION boundaries. They should align but
the ontology takes precedence when they conflict. A future ADR should realign bounded
contexts with these domains.

### C6 — "Does session mean conversation or data?"

**Contradiction**: `chat_sessions` table stores both conversation state AND business state
(slots, trip references). `SessionMemory` in `memory.ts` stores cognitive context.
"Session" is used to mean "conversation instance" in some places and "data container" in
others.

**Resolution**: "Session" is reserved for the Conversation instance (the interaction
between system and Passenger). Data containers are named by their content: `ConversationMemory`,
`EvidenceStore`, `BusinessState`. The `chat_sessions` table should be refactored into
Conversation Memory + Business State.

### C7 — "How many fallback layers?"

**Contradiction**: ARCHITECTURE_BIBLE describes "Triple Fallback" (deterministic → DB →
LLM → safe). But the actual code sometimes has 2 layers (extraction: regex → entity → LLM
has 3, but LLM provider only has 2: Groq → null; response has 2: template → LLM).

**Resolution**: Triple Fallback is a PATTERN, not a strict rule. Each capability should
have at least 2 layers, and critically dependent capabilities should have 3+. The safe
fallback (last layer) is mandatory for all capabilities. This is a looser but more
practical interpretation.

### C8 — "What is the system's identity?"

**Contradiction**: The glossary defines AITOS as "AI Transportation Operating System."
But `docs/ai/ARCHITECTURE_BIBLE.md` and `docs/SYSTEM_BIBLE.md` give different descriptions.
Some documents refer to the system as "GuazuTransfer" (the business name), others as
"AITOS" (the technical name).

**Resolution**: AITOS is the SYSTEM NAME (technical). GuazuTransfer is the BUSINESS
(currently the only tenant of AITOS). The ontology is about AITOS. If the system is ever
multi-tenant, GuazuTransfer becomes one Passenger domain. This resolves the identity
ambiguity and prepares for future generalization.

---

## 17. Normative Rules of Terminology

> These rules govern ALL communication about AITOS going forward.

**R-TERM-001**: Every technical discussion, commit message, code comment, ADR, and
document must use terms as defined in this ontology. Deviations are errors.

**R-TERM-002**: When a term has been superseded (Section 15), using the old term in its
old meaning is a terminology violation warranting correction.

**R-TERM-003**: "State" must always be qualified. Unqualified "state" is ambiguous and
prohibited in technical documentation. Use `conversational_state`, `trip_phase`,
`slot_status`, `dispatch_state`, `knowledge_state`, etc.

**R-TERM-004**: "Confidence" and "Certainty" are distinct terms. Using one to mean the
other is a terminology violation.

**R-TERM-005**: The system does not "know" anything. It "believes" with a degree of
"certainty" based on "evidence." The verb "know" is reserved for absolute truth (which
the system never has). Using "know" about system beliefs is a terminology violation.

**R-TERM-006**: "Truth" must not be used to describe system knowledge. Use "Knowledge
State" or "Belief." "Truth" refers to external reality that the system models but never
directly accesses.

**R-TERM-007**: LLM is a "source of evidence" not a "decision maker." The LLM provides
Facts. The system makes Decisions.

**R-TERM-008**: "Slot" refers to a schema element of the Operational Model. A slot WITH
A VALUE in a specific context is a "Slot Value" in an "Operational Projection." Do not
use "slot" to mean "evidence."

**R-TERM-009**: Every concept named in this ontology must be represented in the code
architecture within 6 months of ontology ratification. Concepts that exist only in this
document but have no code representation are "recognized gaps" (not yet implemented).

**R-TERM-010**: This ontology is the FIRST document of the Cognitive Constitution. All
subsequent constitutional documents (CONSTITUTION.md, ADRs, etc.) must reference this
ontology and use its terms. Any constitutional document that introduces a new concept
without defining it here must propose an amendment to this ontology.

---

*End of SYSTEM_VOCABULARY.md — Version 1.0-draft*

*Next step: Approval by Constituent Assembly, then proceed to 01-CONSTITUTION.md*
