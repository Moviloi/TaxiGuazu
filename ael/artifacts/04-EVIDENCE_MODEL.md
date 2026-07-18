# AITOS Cognitive Constitution — 04-EVIDENCE_MODEL.md

> **Evidence Model of the AI Transportation Operating System**
>
> Status: **DRAFT** — first writing from Constitutional delegation
> Version: 1.0-draft
> Date: 2026-07-11
>
> ⚠️ This document belongs to **Level III-a (Contractual Authority)** of the AITOS
> Document Hierarchy (CONSTITUTION.md §6). It derives from CONSTITUTION.md (Level I-a),
> SYSTEM_VOCABULARY.md (Level I-b), and COGNITIVE_PRINCIPLES.md (Level II-a).
>
> This document does not redefine any term or principle from its source documents.
> It operationalizes them. Every rule herein is binding on Level IV documents
> (source code, prompts, configuration, runbooks). Violations are implementation debt
> managed under S-P9.

---

## Table of Contents

1. [Preamble — What This Model Is](#1-preamble--what-this-model-is)
2. [Nature of Evidence](#2-nature-of-evidence)
3. [Birth of Evidence](#3-birth-of-evidence)
4. [Anatomy of Evidence](#4-anatomy-of-evidence)
5. [Lifecycle of Evidence](#5-lifecycle-of-evidence)
6. [Relationships Between Evidence](#6-relationships-between-evidence)
7. [Composition and Aggregation](#7-composition-and-aggregation)
8. [Conflict and Precedence](#8-conflict-and-precedence)
9. [Evidence and Certainty](#9-evidence-and-certainty)
10. [Evidence and Belief](#10-evidence-and-belief)
11. [Evidence and Knowledge State](#11-evidence-and-knowledge-state)
12. [Evidence and Commitment](#12-evidence-and-commitment)
13. [Evidence and Learning](#13-evidence-and-learning)
14. [Preservation and Persistence](#14-preservation-and-persistence)
15. [Reconstruction from Evidence](#15-reconstruction-from-evidence)
16. [Traceability](#16-traceability)
17. [Invariants](#17-invariants)
18. [Permitted and Prohibited Operations](#18-permitted-and-prohibited-operations)
19. [Validity and Obsolescence](#19-validity-and-obsolescence)
20. [Delegation to Implementation Documents](#20-delegation-to-implementation-documents)

---

## 1. Preamble — What This Model Is

### 1.1 Purpose

This document specifies the **Evidence Model** of AITOS: the complete normative definition
of what Evidence is, how it is born, how it lives, how it relates to other cognitive
constructs, and how it is preserved.

The Evidence Model is the **epistemic foundation** of the system. Every Belief, Decision,
Commitment, and Action in AITOS derives its legitimacy from the Evidence that supports it.
Without a precise model of Evidence, the system cannot guarantee:

- That decisions are auditable (CONSTITUTION.md P-I5).
- That Beliefs are revisable (CONSTITUTION.md P-E4).
- That Evidence is immutable (CONSTITUTION.md S-P5).
- That the system operates on evidence, not intuition (CONSTITUTION.md S-P1).

### 1.2 Scope

This document governs:

1. **What constitutes Evidence** in AITOS — the boundary between raw Signals and epistemic content.
2. **How Evidence is structured** — its attributes, states, and relationships.
3. **How Evidence behaves** — its lifecycle, permitted transformations, and invariants.
4. **How Evidence interacts** — with Certainty, Belief, Knowledge, Commitment, and Learning.
5. **How Evidence is preserved** — persistence, reconstruction, and traceability.

This document does **NOT** govern:

- The technology used to store Evidence (databases, file systems, caches).
- The API through which Evidence is read or written.
- The specific algorithms for certainty computation or belief formation (those belong to
  CERTAINTY_CALCULUS.md and DECISION_MODEL.md respectively).
- The user interface or channel-specific representation of Evidence.

### 1.3 Authority hierarchy

| Source document | Relationship to this document |
|----------------|------------------------------|
| **CONSTITUTION.md** (Level I-a) | Source of supreme principles: S-P1 (Evidence-Based Operation), S-P5 (Evidence Immutability), S-P6 (Knowledge Preservation), P-I5 (Auditability), P-E1 (Evidence over Intuition), P-E4 (Revisability), P-E2 (Certainty is Continuous) |
| **SYSTEM_VOCABULARY.md** (Level I-b) | Source of all terminology: Evidence (5.1), Belief (5.2), Evidence Store (5.3), Fact (4.3), Source (4.4), Signal (3.3), Observation (4.2), Certainty (6.2), Confidence (6.3) |
| **COGNITIVE_PRINCIPLES.md** (Level II-a) | Source of cognitive principles that delegate to this document: CP-05 through CP-12, CP-20, CP-29, CP-30, CP-37, CP-38, CP-39 |
| **DECISION_MODEL.md** (Level III-b) | Sibling document — defines how Evidence feeds into commitment decisions |
| **CERTAINTY_CALCULUS.md** (Level III-d) | Sibling document — defines how Certainty is computed from Evidence |
| **COGNITIVE_ARCHITECTURE.md** (Level II-b) | Defines the cognitive components that consume and produce Evidence |
| **KNOWLEDGE_MODEL.md** (Level III-f) | Defines how Evidence integrates into the Knowledge State |

### 1.4 Reading this document

Each rule in this document follows a uniform structure:

```
### R-EM-NNN — Name of the rule

**Statement:** The normative rule.

**Guarantee:** What this rule ensures when followed.

**Rationale:** Why this rule exists, referencing superior documents.

**Source:** CONSTITUTION.md, SYSTEM_VOCABULARY.md, and/or COGNITIVE_PRINCIPLES.md references.

**Implementation delegation:** Which Level III or Level IV documents must concretize this rule.
```

---

## 2. Nature of Evidence

### 2.1 Operational definition

**R-EM-001 — Evidence as recorded observation**

> **Statement:** Evidence is a recorded set of one or more Facts, each with its Source and
> associated Confidence, that has been persisted in the Evidence Store and is available to
> support or refute Beliefs.

**Guarantee:** Every piece of Evidence in the system has a well-defined origin, a known
level of reliability, and is durably stored. No cognitive process operates on unregistered
information.

**Rationale:** The Constitution (3.2) establishes Evidence as the operational substitute
for Truth. SYSTEM_VOCABULARY.md (5.1) defines Evidence as a recorded set of Facts. This rule
operationalizes those definitions by establishing the minimum conditions under which
information qualifies as Evidence: it must be recorded, sourced, and persistently available.

**Source:** CONSTITUTION.md §3.2, SYSTEM_VOCABULARY.md §5.1, CP-05 (Frontera percepción/evidencia).

**Implementation delegation:** COGNITIVE_ARCHITECTURE.md (component that registers Evidence),
EVIDENCE_MODEL implementation (Evidence Store write path).

---

**R-EM-002 — Evidence is not truth**

> **Statement:** Evidence represents what the system has perceived, not what is true.
> No piece of Evidence, regardless of its Confidence or Source reliability, constitutes
> a guarantee of Truth.

**Guarantee:** The system never confuses its epistemic state (what it has recorded) with
the actual state of the world. This prevents overconfidence bugs and ensures epistemic
humility is maintained at the data level.

**Rationale:** CONSTITUTION.md §3.1 establishes that AITOS never has direct access to
Truth. Evidence is the closest approximation, but it is always provisional and fallible.

**Source:** CONSTITUTION.md §3.1, §3.5; SYSTEM_VOCABULARY.md §3.8.

**Implementation delegation:** DECISION_MODEL.md (threshold calibration must account for
the inherent fallibility of Evidence), CERTAINTY_CALCULUS.md (certainty must never reach
1.0 for empirical Evidence).

---

**R-EM-003 — Evidence exists independent of Belief**

> **Statement:** Evidence exists in the Evidence Store regardless of whether the system
> has formed a Belief based on it. Evidence is not destroyed, modified, or hidden when a
> Belief is revised or discarded.

**Guarantee:** The historical record of perceptions is preserved independently of the
system's current interpretation of those perceptions. This enables audit, re-interpretation,
and learning from past cycles.

**Rationale:** CP-08 (Inmutabilidad operativa de la Evidence) requires that no cognitive
process can alter recorded Evidence. This rule extends that principle: not only is Evidence
immutable, but it is also semantically independent of the Beliefs it may have generated.
A Belief that is later refuted does not retroactively invalidate the Evidence that
supported it — that Evidence remains valid as a record of what was perceived.

**Source:** CP-08, CP-39 (Mejora no destructiva), S-P5.

**Implementation delegation:** EVIDENCE_MODEL implementation (Evidence Store must not have
any operation that links Evidence deletion to Belief revision), KNOWLEDGE_MODEL.md.

---

### 2.2 Epistemic role of Evidence

**R-EM-004 — Evidence as the sole epistemic foundation**

> **Statement:** No Belief, Decision, Commitment, or Action in AITOS may exist without
> supporting Evidence. Evidence is the only admissible foundation for epistemic claims
> within the system.

**Guarantee:** The system never operates on intuition, guesses, defaults, or assumptions
that lack evidentiary support. Every epistemic claim is grounded in at least one piece of
recorded Evidence.

**Rationale:** CONSTITUTION.md S-P1 (Evidence-Based Operation) establishes that AITOS must
base every Belief, Decision, and Commitment on accumulated Evidence. CONSTITUTION.md P-E1
(Evidence over Intuition) prohibits any component from producing a Belief, Decision, or
Action without supporting Evidence. This rule elevates those constitutional mandates to
the Evidence Model level, making Evidence the exclusive epistemic currency.

**Source:** CONSTITUTION.md S-P1, P-E1, P-I1; CP-05, CP-17.

**Implementation delegation:** COGNITIVE_ARCHITECTURE.md (every cognitive phase must verify
Evidence support before proceeding), DECISION_MODEL.md (commitment gates must verify
Evidence sufficiency).

---

**R-EM-005 — Evidence as audit substrate**

> **Statement:** Every Decision in AITOS must be traceable to the specific pieces of
> Evidence that motivated it. The chain from Decision → Commitment → Belief → Evidence
> → Observation → Signal must be fully reconstructible.

**Guarantee:** Any decision can be audited to its perceptual origin. This enables
post-hoc analysis of correctness, identification of error sources, and continuous
improvement of the cognitive process.

**Rationale:** CONSTITUTION.md P-I5 (Auditability of Every Decision) requires that every
Commitment be traceable to the Evidence that motivated it. CP-09 (Trazabilidad
observacional) requires that every Evidence be traceable to the Signal that originated it.
Together they establish a complete audit chain from Decision to Signal.

**Source:** CONSTITUTION.md P-I5, CP-09, CP-29.

**Implementation delegation:** EVIDENCE_MODEL implementation (Evidence records must
include provenance chain), COGNITIVE_ARCHITECTURE.md (decision recording must link to
Evidence references).

---

## 3. Birth of Evidence

### 3.1 The perception cascade

Evidence does not appear spontaneously. It emerges through a cascade of transformations
that begin with a raw Signal and end with persisted Evidence in the Evidence Store.

The cascade has four stages:

```
Signal → Observation → Fact(s) → Evidence
```

Each stage is a transformation gate with specific rules.

**R-EM-006 — Signal stage (pre-evidence)**

> **Statement:** A Signal (SYSTEM_VOCABULARY.md 3.3) is raw information that enters the system
> through a Channel. At this stage, it has no epistemic status — it is neither Evidence
> nor non-Evidence. It is merely a unit of information awaiting processing.

**Guarantee:** Raw inputs are clearly distinguished from processed epistemic content.
No cognitive process can operate on raw Signals — they must first become Observations.

**Rationale:** SYSTEM_VOCABULARY.md defines Signal as "any unit of information that can be perceived
by the system, before any interpretation or processing." The Signal is the lowest level of
abstraction. Operating on Signals bypasses all validation and registration gates.

**Source:** SYSTEM_VOCABULARY.md §3.3, CP-05.

**Implementation delegation:** CHANNEL_ADAPTER.md (Signal reception), COGNITIVE_ARCHITECTURE.md
(Perception Phase gateway).

---

**R-EM-007 — Observation stage (validation gate)**

> **Statement:** A Signal becomes an Observation (SYSTEM_VOCABULARY.md 4.2) when it has passed
> channel-level validation: format verification, authentication, rate-limit check, and
> idempotency verification. An Observation is guaranteed to be structurally valid but not
> semantically interpreted.

**Guarantee:** Only structurally valid inputs enter the cognitive system. Malformed,
unauthorized, or duplicate Signals are filtered before any cognitive resources are
consumed.

**Rationale:** SYSTEM_VOCABULARY.md §4.2 defines Observation as "a Signal that has passed
channel-level validation." This gate protects the cognitive system from processing
invalid inputs. The Observation is the first entity that can be referenced in the
Evidence Store (as the source of Facts).

**Source:** SYSTEM_VOCABULARY.md §4.2, CP-07 (Determinismo perceptual).

**Implementation delegation:** CHANNEL_ADAPTER.md (validation rules per channel),
COGNITIVE_ARCHITECTURE.md (Perception Phase).

---

**R-EM-008 — Fact stage (extraction gate)**

> **Statement:** An Observation is decomposed into one or more Facts (SYSTEM_VOCABULARY.md 4.3)
> through extraction. Each Fact is an atomic claim about the world — a single proposition
> that can be true or false. Facts are the atoms of the epistemic system.

**Guarantee:** Observations are decomposed into their atomic epistemic units. A single
message ("I need a ride from Asunción to the airport at 5 PM") generates multiple Facts:
one for origin, one for destination, one for time. This decomposition enables granular
Certainty assessment and conflict resolution.

**Rationale:** SYSTEM_VOCABULARY.md §4.3 defines Fact as "the smallest atomic unit of meaning
extracted from an Observation." Facts are the output of perception and the input to the
Evidence Store. Each Fact carries its own Source and Confidence, enabling the system to
treat different parts of the same message with different levels of trust.

**Source:** SYSTEM_VOCABULARY.md §4.3, CP-06 (Registro antes de interpretación), CP-07.

**Implementation delegation:** COGNITIVE_ARCHITECTURE.md (extraction in Perception Phase),
EVIDENCE_MODEL implementation (Fact schema).

---

**R-EM-009 — Evidence stage (registration gate)**

> **Statement:** A Fact becomes Evidence when it is persisted in the Evidence Store. The
> act of registration — writing the Fact with its Source, Confidence, and provenance into
> the append-only Evidence Store — is what confers epistemic status upon it.

**Guarantee:** No information influences the system's cognition until it has been formally
registered as Evidence. The registration gate is the system's epistemic boundary: inside
the Evidence Store, information shapes Beliefs; outside, it has no cognitive impact.

**Rationale:** CP-05 (Frontera percepción/evidencia) establishes that a Signal becomes
Evidence only when registered in the Evidence Store. CP-06 (Registro antes de
interpretación) requires that registration occur before any interpretation. This means
the raw Fact (pre-interpretation) must be the first thing registered.

**Source:** CP-05, CP-06, SYSTEM_VOCABULARY.md §5.1.

**Implementation delegation:** EVIDENCE_MODEL implementation (Evidence Store write path),
COGNITIVE_ARCHITECTURE.md (registration as first step of Perception Phase).

---

### 3.2 Registration rules

**R-EM-010 — Registration before interpretation**

> **Statement:** The raw Facts extracted from an Observation must be registered in the
> Evidence Store BEFORE any interpretation, inference, or transformation is applied to
> them. Interpretation (entity resolution, disambiguation, cross-referencing) produces
> NEW Facts that are registered as separate Evidence, never as modifications of the
> original.

**Guarantee:** The original perceptual record is never lost. If interpretation introduces
errors, the raw Facts remain available for re-interpretation. This is the epistemic
equivalent of retaining the raw photograph before applying filters.

**Rationale:** CP-06 explicitly requires registration before interpretation. This
protects against a common failure mode: the system interprets a user's message, makes
an error in interpretation, and the original message is lost because only the
interpretation was stored.

**Source:** CP-06, S-P5.

**Implementation delegation:** COGNITIVE_ARCHITECTURE.md (Perception Phase pipeline must
register before reasoning), EVIDENCE_MODEL implementation (Evidence Store must distinguish
raw Facts from interpreted Facts).

---

**R-EM-011 — Deterministic registration**

> **Statement:** The registration of Facts as Evidence must be deterministic. The same
> Observation, processed under the same conditions, must produce the same set of Facts
> registered as Evidence. Non-deterministic components (LLMs, probabilistic models,
> external APIs) may not participate in the registration step.

**Guarantee:** The epistemic foundation of the system is stable and reproducible. Two
identical inputs produce identical Evidence. This is necessary for auditability,
debugging, and predictability.

**Rationale:** CP-07 (Determinismo perceptual) requires that Perception be deterministic.
The registration of raw Facts is part of Perception and must therefore be free of
non-deterministic components. LLM-based extraction may be used for interpretation
(post-registration), but the initial raw Fact registration must be based on deterministic
rules.

**Source:** CP-07, S-P4 (Deterministic Core).

**Implementation delegation:** COGNITIVE_ARCHITECTURE.md (deterministic extraction rules),
EVIDENCE_MODEL implementation (registration API must not accept non-deterministic sources
for raw Facts).

---

**R-EM-012 — Every Signal produces at least one Evidence**

> **Statement:** Every Observation that enters the system — including silence, timeouts,
> system events, and error conditions — must produce at least one Evidence record. There
> is no such thing as an epistemically silent event.

**Guarantee:** The system never ignores an event. Even the absence of expected information
(Signal silence) generates Evidence that feeds into the cognitive process. This prevents
the system from making decisions that ignore available information.

**Rationale:** CP-11 (Silencio como Evidence) requires that the absence of a response
be registered as Evidence. This rule generalizes that principle: every Observation,
regardless of content, generates Evidence. The only exception is a Signal that fails
channel-level validation — it never becomes an Observation and therefore produces no
Evidence.

**Source:** CP-11, S-P1.

**Implementation delegation:** COGNITIVE_ARCHITECTURE.md (timeout/silence detection),
EVIDENCE_MODEL implementation (Evidence types for silence and system events).

---

## 4. Anatomy of Evidence

### 4.1 Essential attributes

Every Evidence record in the Evidence Store must carry the following attributes. No
Evidence may exist without all essential attributes populated.

**R-EM-013 — Evidence identity**

> **Statement:** Every Evidence record must have a globally unique, immutable identifier
> assigned at registration time. This identifier must never be reused, even if the
> Evidence is later found to be incorrect or superseded.

**Guarantee:** Every piece of Evidence is uniquely referable. The identity is permanent
and independent of the Evidence's content, validity, or usefulness.

**Rationale:** Traceability (CP-09) and auditability (P-I5) require that Evidence be
individually referable. A mutable or reusable identity would break the audit chain.

**Source:** CP-09, P-I5, SYSTEM_VOCABULARY.md §3.1 (Entity identity constraint).

**Implementation delegation:** EVIDENCE_MODEL implementation (ID generation strategy must
guarantee global uniqueness and non-reuse).

---

**R-EM-014 — Fact content**

> **Statement:** Every Evidence record must contain the Fact or set of Facts that
> constitute its propositional content. Each Fact must be expressed as a proposition
> that can be evaluated as supported or refuted: a subject, a predicate, and an object
> (e.g., "origin = Asunción", "passengers ≥ 3", "intent = BOOKING").

**Guarantee:** The propositional content of Evidence is explicit and unambiguous. Two
Evidence records with the same Fact content are semantically comparable.

**Rationale:** SYSTEM_VOCABULARY.md §4.3 defines Fact as an atomic claim. The propositional
structure enables the system to compare, aggregate, and resolve conflicts between pieces
of Evidence that address the same subject.

**Source:** SYSTEM_VOCABULARY.md §4.3, §5.1.

**Implementation delegation:** EVIDENCE_MODEL implementation (Fact schema with
subject/predicate/object structure), KNOWLEDGE_MODEL.md (Fact indexing and conflict
detection).

---

**R-EM-015 — Source**

> **Statement:** Every Evidence record must declare its Source (SYSTEM_VOCABULARY.md 4.4) — the
> origin of the Fact, describing how it was obtained. The Source must be one of the
> canonical Source types: DirectExtraction, Inference, UserConfirmation,
> KnowledgeBaseLookup, DefaultValue, LLMInference, or SilenceDetection.

**Guarantee:** The reliability of every piece of Evidence can be assessed from its Source
type. The system knows whether a Fact came from explicit user confirmation, algorithmic
extraction, LLM inference, or default assumption.

**Rationale:** SYSTEM_VOCABULARY.md §4.4 defines Source types ordered by reliability. CP-38 (Ajuste
de confianza de fuente) requires that Source Confidence be adjusted based on historical
accuracy. Without explicit Source attribution, neither reliability ordering nor historical
adjustment is possible.

**Source:** SYSTEM_VOCABULARY.md §4.4, CP-38, CP-09.

**Implementation delegation:** EVIDENCE_MODEL implementation (Source type enumeration and
storage), DECISION_MODEL.md (Source-based weighting in belief formation).

---

**R-EM-016 — Confidence**

> **Statement:** Every Evidence record must carry a Confidence value (SYSTEM_VOCABULARY.md 6.3)
> that represents the reliability of its Source at the moment of registration. Confidence
> is a value in [0, 1] where higher values indicate greater expected reliability.

**Guarantee:** Each piece of Evidence carries an explicit assessment of its source
reliability. The system can distinguish between "the user explicitly confirmed this"
(Confidence ≈ 0.95) and "an LLM inferred this" (Confidence ≈ 0.70).

**Rationale:** SYSTEM_VOCABULARY.md §6.3 defines Confidence as "a measure of the reliability of a
Source." CP-38 requires historical adjustment of Confidence. The Confidence value at
registration time is the initial value, which may be adjusted later based on outcome
feedback (see §13).

**Source:** SYSTEM_VOCABULARY.md §6.3, CP-38, CP-37.

**Implementation delegation:** EVIDENCE_MODEL implementation (Confidence storage and
update mechanism), CERTAINTY_CALCULUS.md (use of Confidence in Certainty computation),
DECISION_MODEL.md (historical Confidence adjustment).

---

**R-EM-017 — Timestamp**

> **Statement:** Every Evidence record must carry two timestamps: (a) the time at which
> the originating Signal was received by the system (perception time), and (b) the time
> at which the Evidence was registered in the Evidence Store (registration time).

**Guarantee:** The temporal context of every piece of Evidence is known. This enables
temporal reasoning (what did the system know at time T?), certainty degradation (how old
is this Evidence?), and audit (when was this information registered?).

**Rationale:** CP-19 (Degradación temporal) requires that Certainty degrade over time
without confirming Evidence. Degradation requires knowing the age of Evidence. CP-09
requires traceability to the moment of perception.

**Source:** CP-19, CP-09, SYSTEM_VOCABULARY.md §4.1 (Message timestamp constraint).

**Implementation delegation:** EVIDENCE_MODEL implementation (timestamp storage),
CERTAINTY_CALCULUS.md (degradation function uses perception time).

---

**R-EM-018 — Provenance chain**

> **Statement:** Every Evidence record must carry references to its provenance: (a) the
> Observation ID from which it was extracted, (b) the Cognitive Cycle ID during which
> it was produced, and (c) any parent Evidence IDs if this Evidence was derived from
> other Evidence (e.g., through inference).

**Guarantee:** The complete ancestry of every piece of Evidence is reconstructible.
Evidence that is inferred from other Evidence can be traced back through its parents
to the original Observations.

**Rationale:** CP-09 (Trazabilidad observacional) requires that every Evidence be traceable
to the Signal that originated it. The provenance chain is the mechanism that satisfies
this requirement.

**Source:** CP-09, P-I5, CP-29.

**Implementation delegation:** EVIDENCE_MODEL implementation (provenance chain storage),
COGNITIVE_ARCHITECTURE.md (Cognitive Cycle ID generation and propagation).

---

**R-EM-019 — Certainty contribution metadata**

> **Statement:** Every Evidence record must carry metadata that enables Certainty
> computation for Beliefs that this Evidence supports or refutes. At minimum: the
> proposition(s) it addresses, whether it supports or refutes each proposition, and
> its effective weight for belief formation.

**Guarantee:** The Evidence Store is self-sufficient for Certainty computation. The
CERTAINTY_CALCULUS.md model can read Evidence records and compute Belief Certainty
without requiring external context about what each Evidence means.

**Rationale:** CP-18 (Certidumbre continua) requires that every Belief carry a Certainty
value. CP-20 (Actualización por Evidence) requires that new Evidence update the Certainty
of related Beliefs. Both depend on Evidence containing the metadata needed for Certainty
computation.

**Source:** CP-18, CP-20, P-E2.

**Implementation delegation:** CERTAINTY_CALCULUS.md (Certainty computation function),
EVIDENCE_MODEL implementation (support/refute indication and weight).

---

### 4.2 Optional attributes

**R-EM-020 — Optional attributes**

> **Statement:** Evidence records MAY carry additional attributes beyond the essential
> set, including: tags for categorization, natural language context (the raw text that
> contained the Fact), environmental metadata (channel conditions, network latency),
> and business-specific annotations. These optional attributes must never contradict,
> override, or substitute for the essential attributes.

**Guarantee:** The Evidence Model is extensible without compromising its core structure.
Additional context can be attached to Evidence without changing the fundamental epistemic
contract.

**Rationale:** Different cognitive phases and business domains may need additional context
about Evidence. However, the essential attributes (R-EM-013 through R-EM-019) are
sufficient for core epistemic operations. Optional attributes are auxiliary.

**Source:** S-P10 (Minimal Constitutional Scope — the model governs only what it must).

**Implementation delegation:** EVIDENCE_MODEL implementation (flexible attribute schema).

---

## 5. Lifecycle of Evidence

### 5.1 States

Evidence passes through a defined set of states during its lifetime. These states govern
what operations are permitted on the Evidence and how it participates in cognition.

**R-EM-021 — Evidence states**

> **Statement:** Every Evidence record exists in exactly one of the following states at
> all times:

> | State | Meaning | Entered by | Can transition to |
> |-------|---------|------------|-------------------|
> | **RAW** | Freshly registered, not yet consumed by any cognitive phase | Registration | ACTIVE, VOID |
> | **ACTIVE** | Available for belief formation, reasoning, and decision-making | First cognitive cycle that reads it | STALE, SUPERSEDED, ARCHIVED |
> | **STALE** | Temporarily degraded due to age without confirming Evidence | Time-based degradation crossing a threshold | ACTIVE (if re-confirmed), ARCHIVED |
> | **SUPERSEDED** | Replaced by newer Evidence that contradicts or overrides it | Conflict resolution (CP-10, §8 of this document) | ARCHIVED |
> | **ARCHIVED** | Moved to long-term storage; not in active cognitive working set | Explicit archival decision | (none — terminal) |
> | **VOID** | Determined to be invalid or erroneous at registration time; never entered cognition | Registration validation failure | (none — terminal) |

**Guarantee:** The state of every Evidence record is known and governs its cognitive
participation. No Evidence is in an ambiguous state. Transitions are explicit and
recorded.

**Rationale:** CP-08 (Inmutabilidad operativa) prohibits modification of Evidence, but
Evidence still needs a lifecycle that reflects its changing relevance and reliability
over time. States enable this without violating immutability: the Evidence record itself
never changes, but its state metadata is updated to reflect its current cognitive role.

**Source:** CP-08, CP-19, CP-31 (Archivo por relevancia), CP-10.

**Implementation delegation:** EVIDENCE_MODEL implementation (state machine with
immutable core + mutable state metadata), COGNITIVE_ARCHITECTURE.md (state transitions
triggered by cognitive phases).

---

### 5.2 State transition rules

**R-EM-022 — RAW → ACTIVE**

> **Statement:** Evidence transitions from RAW to ACTIVE when it is first read by a
> cognitive phase (Reasoning, Commitment, or Projection). This transition occurs
> automatically — no explicit action is required beyond the cognitive process accessing
> the Evidence.

**Guarantee:** Evidence is not cognitively inert. Once consumed, it becomes part of the
active epistemic landscape.

**Rationale:** RAW indicates Evidence that has been registered but not yet considered.
ACTIVE indicates Evidence that has entered the cognitive process. The transition is
automatic because the act of reading IS the act of considering.

**Source:** CP-05, CP-08.

**Implementation delegation:** COGNITIVE_ARCHITECTURE.md (first read triggers transition),
EVIDENCE_MODEL implementation (lazy transition on read).

---

**R-EM-023 — ACTIVE → STALE**

> **Statement:** Evidence transitions from ACTIVE to STALE when its age exceeds the
> degradation threshold for its type, without receiving confirming Evidence. The
> degradation threshold is defined by CERTAINTY_CALCULUS.md per Evidence type.

**Guarantee:** Old Evidence is not treated with the same epistemic weight as fresh
Evidence. The system naturally becomes less confident about aged information.

**Rationale:** CP-19 (Degradación temporal) requires continuous degradation of Certainty
over time. STALE state is the Evidence-level manifestation of this principle: old
Evidence is marked as less reliable.

**Source:** CP-19.

**Implementation delegation:** CERTAINTY_CALCULUS.md (degradation thresholds per Evidence
type), EVIDENCE_MODEL implementation (scheduled or on-read staleness detection).

---

**R-EM-024 — STALE → ACTIVE**

> **Statement:** Evidence transitions from STALE back to ACTIVE when new confirming
> Evidence is registered that corroborates the same proposition. The transition is
> automatic — the act of registering confirming Evidence triggers the reactivation.

**Guarantee:** Evidence that is re-confirmed through new information is restored to full
epistemic status. The system can recover confidence in previously degraded Evidence.

**Rationale:** Staleness is a function of time without confirmation. When confirmation
arrives, the temporal clock resets. This is consistent with CP-19, which requires
continuous degradation UNLESS new confirming Evidence arrives.

**Source:** CP-19, CP-20.

**Implementation delegation:** EVIDENCE_MODEL implementation (corroboration detection),
CERTAINTY_CALCULUS.md (degradation reset logic).

---

**R-EM-025 — ACTIVE → SUPERSEDED**

> **Statement:** Evidence transitions from ACTIVE to SUPERSEDED when conflict resolution
> (CP-10, §8 of this document) determines that another piece of Evidence or set of
> Evidence overrides it. The transition is recorded with a reference to the superseding
> Evidence and the reason for supersession.

**Guarantee:** When Evidence is contradicted by stronger Evidence, the original Evidence
is not destroyed or modified — it is marked as superseded with a link to what replaced it.
The epistemic record remains complete.

**Rationale:** CP-10 requires resolution of conflicting Evidence through epistemic rules.
Supersession is the evidence-level outcome of conflict resolution: one Evidence prevails,
the other is superseded. The original Evidence remains for audit (S-P5).

**Source:** CP-10, S-P5, CP-08.

**Implementation delegation:** DECISION_MODEL.md (conflict resolution rules),
EVIDENCE_MODEL implementation (supersession link storage and query).

---

**R-EM-026 — ACTIVE → ARCHIVED and STALE → ARCHIVED**

> **Statement:** Evidence transitions to ARCHIVED when the system determines it is no
> longer relevant for current cognitive operations but must be preserved for historical
> audit and potential future relevance. Archival criteria are defined per Evidence type
> and context.

**Guarantee:** The cognitive working set remains manageable, but no Evidence is ever
deleted. Archived Evidence can be retrieved if its relevance is re-established.

**Rationale:** CP-31 (Archivo por relevancia) permits moving Evidence from active memory
to inactive memory based on relevance. Archival is NOT deletion — it is a transition to
long-term, retrievable storage.

**Source:** CP-31, S-P6.

**Implementation delegation:** KNOWLEDGE_MODEL.md (archival and retrieval strategy),
EVIDENCE_MODEL implementation (archival mechanism that preserves retrievability).

---

**R-EM-027 — RAW → VOID**

> **Statement:** Evidence transitions from RAW to VOID when registration validation
> determines that the Evidence violates an invariant (R-EM-061 through R-EM-070) or
> when the originating Observation is determined to be invalid after registration
> (e.g., duplicate detection, security classification).

**Guarantee:** Invalid Evidence never enters the cognitive process. VOID Evidence is
preserved for audit (to document that an invalid registration was attempted) but is
never available for belief formation.

**Rationale:** The Evidence Store must maintain its integrity. Evidence that violates
invariants at registration time must be rejected before it can affect cognition. However,
the rejection itself must be recorded for audit and debugging.

**Source:** S-P5, S-P6, CP-08.

**Implementation delegation:** EVIDENCE_MODEL implementation (registration validation),
CHANNEL_ADAPTER.md (duplicate detection).

---

### 5.3 Immutability of the core

**R-EM-028 — Core immutability**

> **Statement:** The core attributes of an Evidence record (identity, Fact content, Source,
> Confidence at registration, timestamps, provenance chain) are immutable once registered.
> They cannot be modified, deleted, or retroactively altered by any process — cognitive,
> operational, or administrative.

**Guarantee:** The historical record of perceptions is inviolable. Once Evidence is
registered, its core content is fixed for the lifetime of the system. This is the
foundation of trust in the audit trail.

**Rationale:** CONSTITUTION.md S-P5 (Evidence Immutability) prohibits modification or
deletion of Evidence. CP-08 (Inmutabilidad operativa) extends this to cognitive processes.
This rule identifies which specific attributes are protected by immutability.

**Exceptions:** The only exception is a legal requirement (court order, passenger request
under data protection law). Such exceptions must be logged with the reason, authorization,
and the specific Evidence affected.

**Source:** S-P5, CP-08.

**Implementation delegation:** EVIDENCE_MODEL implementation (append-only store, no update
or delete operations for core attributes).

---

**R-EM-029 — Mutable metadata**

> **Statement:** The state of an Evidence record (RAW, ACTIVE, STALE, SUPERSEDED, ARCHIVED,
> VOID) and any optional attributes are mutable. However, every mutation must be recorded
> as an event associated with the Evidence, preserving the previous value and the reason
> for the change.

**Guarantee:** While Evidence state can change, the history of those changes is fully
preserved. The state machine transitions are auditable.

**Rationale:** The lifecycle of Evidence (§5.1) requires state transitions. These
transitions are not modifications of the Evidence's core content — they are changes to
its cognitive status. Recording each transition preserves auditability.

**Source:** S-P5 (immutability applies to core, not to metadata), P-I5 (auditability
requires recording changes).

**Implementation delegation:** EVIDENCE_MODEL implementation (state transition log,
event-sourced metadata).

---

## 6. Relationships Between Evidence

### 6.1 Structural relationships

**R-EM-030 — Evidence-proposition relationship**

> **Statement:** Every Evidence record addresses one or more propositions (subject-predicate
> pairs). Evidence that addresses the same proposition forms a virtual group that the
> cognitive system uses for belief formation. The group is not stored explicitly — it is
> derived from the propositions addressed.

**Guarantee:** The system can find all Evidence relevant to a specific proposition without
explicit grouping. The proposition structure enables automatic aggregation.

**Rationale:** Belief formation (CP-18, CP-20) requires aggregated consideration of all
Evidence relevant to a proposition. The propositional structure is the natural grouping
key.

**Source:** CP-18, CP-20, SYSTEM_VOCABULARY.md §4.3, §5.1.

**Implementation delegation:** EVIDENCE_MODEL implementation (proposition-based indexing),
CERTAINTY_CALCULUS.md (aggregation over Evidence groups).

---

**R-EM-031 — Evidence-evidence relationships**

> **Statement:** Evidence records may be explicitly linked through the following
> relationship types:

> | Relationship | Meaning | Example |
> |-------------|---------|---------|
> | **corroborates** | Evidence supports the same proposition as another Evidence | Two user messages both saying "Asunción" |
> | **contradicts** | Evidence supports a proposition that is incompatible with another Evidence's proposition | "origin = San Lorenzo" vs "origin = Asunción" |
> | **derives-from** | Evidence was produced by inference from another Evidence | "user is late" inferred from "estimated arrival is past scheduled time" |
> | **refines** | Evidence provides more specific information about a proposition addressed by another Evidence | "origin = Aeropuerto" vs "origin = Aeropuerto Internacional Silvio Pettirossi" |
> | **supersedes** | Evidence has been determined to override another Evidence in conflict resolution | Stronger-confidence Evidence overriding weaker |

**Guarantee:** The semantic relationships between pieces of Evidence are explicit and
machine-readable. The system can navigate the Evidence graph to understand how pieces
of Evidence relate to each other, which ones support the same conclusion, and which
ones conflict.

**Rationale:** SYSTEM_VOCABULARY.md (5.1, 6.5) and CP-10 (Resolución de Evidence conflictiva)
and CP-15 (Fusión conservadora) require the system to understand relationships between
pieces of Evidence. Explicit relationship types make these relationships computable.

**Source:** CP-10, CP-15, SYSTEM_VOCABULARY.md §5.1.

**Implementation delegation:** EVIDENCE_MODEL implementation (relationship storage and
traversal), COGNITIVE_ARCHITECTURE.md (relationship-aware reasoning),
KNOWLEDGE_MODEL.md (Hypothesis Network uses Evidence relationships).

---

**R-EM-032 — Implicit relationships**

> **Statement:** In addition to explicit links, Evidence relationships may be derived
> automatically from propositional content. Evidence that addresses the same subject
> with the same predicate is implicitly related (corroborating or contradicting based on
> object equality). These implicit relationships are computed, not stored.

**Guarantee:** The system can discover relationships between Evidence even when they
were not explicitly linked at registration time. The propositional structure serves as
the implicit relationship backbone.

**Rationale:** Registration may not know about all existing Evidence that relates to the
same proposition. Explicit linking at registration time would be incomplete and
brittle. Proposition-based implicit relationships ensure comprehensive relationship
coverage.

**Source:** CP-10, CP-20.

**Implementation delegation:** COGNITIVE_ARCHITECTURE.md (Reasoning Phase computes implicit
relationships), EVIDENCE_MODEL implementation (query by proposition).

---

## 7. Composition and Aggregation

### 7.1 Atomic and composite Evidence

**R-EM-033 — Atomic Evidence**

> **Statement:** Atomic Evidence is a single Fact addressing a single proposition. It is
> the smallest unit of Evidence that can be registered, referenced, and evaluated
> independently.

**Guarantee:** The system can reason about the smallest possible unit of information.
Atomic Evidence is the granularity at which conflicts are detected and resolved.

**Rationale:** SYSTEM_VOCABULARY.md §4.3 defines Fact as the smallest atomic unit of meaning.
Atomic Evidence is a Fact stored in the Evidence Store.

**Source:** SYSTEM_VOCABULARY.md §4.3.

**Implementation delegation:** EVIDENCE_MODEL implementation (atomic Evidence schema).

---

**R-EM-034 — Composite Evidence**

> **Statement:** Composite Evidence is a set of Atomic Evidence records that are logically
> grouped because they originated from the same Observation or inference operation.
> Composite Evidence has no independent epistemic status — its status is determined by
> its constituent Atomic Evidence records.

**Guarantee:** The system can reason about groups of related Evidence (e.g., all Facts
from a single user message) while maintaining the granularity of Atomic Evidence for
specific proposition evaluation.

**Rationale:** A single user message produces multiple Facts. Those Facts are related
(they came from the same Observation) but address different propositions. Composite
Evidence captures this grouping without losing atomic granularity.

**Source:** SYSTEM_VOCABULARY.md §4.3 (Fact is part of Evidence), CP-06.

**Implementation delegation:** EVIDENCE_MODEL implementation (grouping by Observation ID).

---

### 7.2 Aggregation rules

**R-EM-035 — Aggregation for belief formation**

> **Statement:** All Atomic Evidence addressing the same proposition MUST be aggregated
> during belief formation. The aggregation function combines Confidence values, accounts
> for corroboration and contradiction, and produces a single aggregated weight for the
> proposition. The aggregation function is defined in CERTAINTY_CALCULUS.md.

**Guarantee:** Belief formation considers ALL available Evidence for a proposition,
not just the most recent or most convenient. Aggregation is comprehensive and rule-based.

**Rationale:** CP-20 (Actualización por Evidence) requires that ALL relevant Evidence
be considered when updating Belief Certainty. No Evidence may be ignored.

**Source:** CP-20, CP-10, CP-18.

**Implementation delegation:** CERTAINTY_CALCULUS.md (aggregation function),
COGNITIVE_ARCHITECTURE.md (Reasoning Phase calls aggregation).

---

**R-EM-036 — Non-eliminative aggregation**

> **Statement:** Aggregation for belief formation must be non-eliminative: all Evidence
> that contributes to a proposition remains in the Evidence Store regardless of whether
> it was given low weight in the aggregation. No Evidence is removed because it was
> "outvoted" by stronger Evidence.

**Guarantee:** Disconfirming Evidence is preserved even when outweighed by stronger
Evidence. This enables re-evaluation if new Evidence arrives or if the aggregation rules
change.

**Rationale:** CP-39 (Mejora no destructiva) requires that learning and aggregation never
destroy prior knowledge. CP-15 (Fusión conservadora) requires that fusion preserve
information from all sources.

**Source:** CP-39, CP-15, CP-08.

**Implementation delegation:** EVIDENCE_MODEL implementation (Evidence Store is the
persistent record; aggregation is a read-time computation, not a write-time reduction).

---

## 8. Conflict and Precedence

### 8.1 Conflict detection

**R-EM-037 — Conflict definition**

> **Statement:** Two pieces of Evidence are in conflict when they address the same
> proposition and their objects are logically incompatible (different values for the same
> attribute, contradictory statements, mutually exclusive classifications).

**Guarantee:** The system can algorithmically detect when Evidence contradicts other
Evidence. Conflict is a well-defined, computable property.

**Rationale:** CP-10 (Resolución de Evidence conflictiva) requires conflict detection
as a prerequisite for resolution. SYSTEM_VOCABULARY.md defines the propositional structure that
makes conflict detection possible.

**Source:** CP-10, SYSTEM_VOCABULARY.md §4.3, §5.1.

**Implementation delegation:** COGNITIVE_ARCHITECTURE.md (Reasoning Phase conflict
detection), EVIDENCE_MODEL implementation (conflict query: "all Evidence for proposition
X with incompatible objects").

---

**R-EM-038 — Conflict scope**

> **Statement:** Conflict is evaluated within the scope of a single proposition. Evidence
> addressing different propositions (different subject or different predicate) cannot be
> in direct conflict, although they may be in indirect conflict through the cognitive
> system's understanding of domain relationships (e.g., "passengers = 1" and "vehicle =
> SUV" are not directly conflicting but may be contextually inconsistent if the system
> knows SUVs require minimum 2 passengers).

**Guarantee:** Conflict detection is precise and scoped. False conflicts (Evidence about
different things) are not reported. Contextual inconsistencies are handled by reasoning,
not by Evidence Model conflict detection.

**Rationale:** The Evidence Model defines direct conflict. Contextual inconsistency
belongs to the Reasoning Phase, which has access to domain knowledge and business rules.

**Source:** CP-10.

**Implementation delegation:** DECISION_MODEL.md (contextual inconsistency detection),
COGNITIVE_ARCHITECTURE.md (Reasoning Phase).

---

### 8.2 Conflict resolution

**R-EM-039 — Epistemic resolution rules**

> **Statement:** Conflict between Evidence addressing the same proposition MUST be resolved
> using epistemic rules, never using arbitrary rules. The following factors are considered,
> in this order of precedence:

> 1. **Source type reliability**: Evidence from a higher-reliability Source type (SYSTEM_VOCABULARY.md
>    §4.4 hierarchy) prevails over Evidence from a lower-reliability Source type.
> 2. **Confidence value**: Between Evidence of the same Source type, higher Confidence
>    prevails.
> 3. **Corroboration count**: Between Evidence with equal Source type and equal Confidence,
>    the proposition supported by more corroborating Evidence prevails.
> 4. **Recency**: Between Evidence with equal Source type, equal Confidence, and equal
>    corroboration, more recent Evidence prevails (as a tiebreaker, not as a primary rule).

**Guarantee:** Conflict resolution is principled, deterministic, and auditable. The
system does not resolve conflicts by arbitrary rules (first-come, last-write, random
selection). The resolution is based on epistemic weight.

**Rationale:** CP-10 explicitly prohibits arbitrary resolution rules and requires
epistemic resolution. CP-17 (Resolución por Evidence) prohibits resolution by non-epistemic
criteria. This rule defines the epistemic hierarchy.

**Source:** CP-10, CP-17, SYSTEM_VOCABULARY.md §4.4.

**Implementation delegation:** DECISION_MODEL.md (resolution algorithm),
CERTAINTY_CALCULUS.md (weighting function that incorporates these factors).

---

**R-EM-040 — Resolution does not delete**

> **Statement:** Conflict resolution determines which Evidence prevails for belief
> formation, but it does not modify, delete, or remove the losing Evidence from the
> Evidence Store. The losing Evidence is marked as SUPERSEDED (R-EM-025) with a
> reference to the prevailing Evidence and the reason for the resolution.

**Guarantee:** Even resolved conflicts preserve the full record. A future re-evaluation
may reach a different conclusion if new Evidence arrives or if the resolution rules change.

**Rationale:** S-P5 and CP-08 prohibit modification or deletion of Evidence. CP-10
requires resolution, not elimination. The SUPERSEDED state preserves the losing Evidence
for audit.

**Source:** CP-10, S-P5, CP-08.

**Implementation delegation:** EVIDENCE_MODEL implementation (SUPERSEDED state transition
with supersession link and reason).

---

### 8.3 Precedence

**R-EM-041 — Evidence precedence hierarchy**

> **Statement:** When Evidence is used for belief formation, the following precedence
> hierarchy determines which Evidence is considered first and carries the most weight:

> | Precedence | Condition | Behavior |
> |------------|-----------|----------|
> | **Highest** | User confirmation Evidence (Source = UserConfirmation) | Overrides all other Evidence for the same proposition, unless contradicted by a later UserConfirmation |
> | **High** | Direct extraction Evidence (Source = DirectExtraction) | Prevails over inferred Evidence |
> | **Medium** | Cross-referenced Evidence (Source = KnowledgeBaseLookup) | Prevails over LLM-produced Evidence |
> | **Low** | LLM-inferred Evidence (Source = LLMInference) | Lowest precedence among active Evidence |
> | **Lowest** | Default Value Evidence (Source = DefaultValue, SilenceDetection) | Used only when no other Evidence exists |

**Guarantee:** The system has a clear, predictable hierarchy for weighing Evidence.
User-confirmed information is always given the highest epistemic weight.

**Rationale:** SYSTEM_VOCABULARY.md §4.4 orders Sources by reliability. This rule operationalizes
that ordering as a precedence hierarchy for belief formation.

**Source:** SYSTEM_VOCABULARY.md §4.4, CP-10, CP-17.

**Implementation delegation:** CERTAINTY_CALCULUS.md (precedence-weighted aggregation),
DECISION_MODEL.md (threshold decisions consider precedence).

---

## 9. Evidence and Certainty

### 9.1 From Evidence to Certainty

**R-EM-042 — Certainty is a function of Evidence**

> **Statement:** The Certainty (SYSTEM_VOCABULARY.md 6.2) of a Belief is computed exclusively from
> the Evidence that supports or refutes it. Certainty is NOT an independent attribute of
> the Belief — it is a derived value, recomputed each time the relevant Evidence changes.

**Guarantee:** Certainty always reflects the current Evidence set. Stale Certainty
(Certainty that does not reflect all available Evidence) does not exist.

**Rationale:** CONSTITUTION.md §3.3.1 requires that "Certainty must be updated with each
new Evidence." CP-20 (Actualización por Evidence) requires that every new Evidence update
the Certainty of related Beliefs. This rule makes Certainty a derived function of
Evidence, not a stored value.

**Source:** CONSTITUTION.md §3.3.1, CP-20, P-E2.

**Implementation delegation:** CERTAINTY_CALCULUS.md (Certainty computation function),
COGNITIVE_ARCHITECTURE.md (automatic Certainty update when Evidence changes).

---

**R-EM-043 — Factors in Certainty computation**

> **Statement:** The Certainty of a Belief based on Evidence SHALL consider, at minimum:

> 1. **Confidence of each supporting Evidence** (R-EM-016): the reliability of each
>    Evidence's Source.
> 2. **Corroboration**: the number of independent Evidence records that support the same
>    proposition. More corroboration increases Certainty.
> 3. **Contradiction**: the presence and weight of Evidence that refutes the proposition.
>    Contradiction reduces Certainty.
> 4. **Age**: the time elapsed since each Evidence's perception time (R-EM-017). Older
>    Evidence has reduced impact.
> 5. **Source precedence** (R-EM-041): the hierarchical weight of each Evidence's Source.

**Guarantee:** Certainty computation is multi-factor, principled, and accounts for the
full epistemic reality: not just how much Evidence exists, but how reliable it is,
whether it's contradicted, and how old it is.

**Rationale:** CP-18, CP-19, CP-20, and CP-21 together establish that Certainty must be
continuous, time-sensitive, evidence-derived, and bounded. These five factors satisfy
all those requirements.

**Source:** CP-18, CP-19, CP-20, CP-21.

**Implementation delegation:** CERTAINTY_CALCULUS.md (detailed computation function
with weights for each factor).

---

**R-EM-044 — Certainty bounds**

> **Statement:** Certainty derived from Evidence about empirical facts (user intentions,
> locations, times, quantities) must never reach 1.0. An upper bound — the Epistemic
> Limit (CP-21) — is defined in CERTAINTY_CALCULUS.md. Certainty of 1.0 is reserved for
> formal truths (mathematical invariants, logical tautologies) that require no Evidence.

**Guarantee:** The system never expresses absolute certainty about empirical matters,
preserving epistemic humility at the mathematical level.

**Rationale:** CONSTITUTION.md §3.1 (Inaccessibility of Truth) and CP-21 (Límite
epistémico) require that empirical Certainty never reach 1.0. This rule ensures that
the Certainty computation function respects this bound.

**Source:** CP-21, CONSTITUTION.md §3.1.

**Implementation delegation:** CERTAINTY_CALCULUS.md (Epistemic Limit constant and
enforcement in computation).

---

### 9.2 Certainty update triggers

**R-EM-045 — Automatic Certainty recalculation**

> **Statement:** The Certainty of all Beliefs that depend on a given proposition MUST be
> automatically recalculated whenever:

> a) New Evidence is registered for that proposition.
> b) Existing Evidence for that proposition changes state (e.g., ACTIVE → STALE,
>    ACTIVE → SUPERSEDED).
> c) The degradation function advances the age of relevant Evidence.

**Guarantee:** Certainty is always current. No cognitive process operates on stale
Certainty.

**Rationale:** CP-20 requires that every new Evidence update the Certainty of related
Beliefs. CP-19 requires continuous degradation. Together they require automatic,
event-driven recalculation.

**Source:** CP-20, CP-19.

**Implementation delegation:** COGNITIVE_ARCHITECTURE.md (event-driven Certainty update),
CERTAINTY_CALCULUS.md (recalculation function).

---

## 10. Evidence and Belief

### 10.1 From Evidence to Belief

**R-EM-046 — Beliefs are derived from Evidence**

> **Statement:** Every Belief (SYSTEM_VOCABULARY.md 5.2) in AITOS is a proposition that the system
> holds with a degree of Certainty, derived from the accumulated Evidence for that
> proposition. A Belief must reference the Evidence from which it is derived.

**Guarantee:** All Beliefs are grounded in Evidence. There is no such thing as a Belief
without evidentiary support. The Evidence-to-Belief mapping is explicit and auditable.

**Rationale:** SYSTEM_VOCABULARY.md §5.2 defines Belief as depending on Evidence. CP-17
(Resolución por Evidence) requires that hypotheses be resolved into Beliefs exclusively
through Evidence accumulation. S-P1 requires that every Belief be based on Evidence.

**Source:** SYSTEM_VOCABULARY.md §5.2, CP-17, S-P1.

**Implementation delegation:** KNOWLEDGE_MODEL.md (Belief structure and Evidence reference),
COGNITIVE_ARCHITECTURE.md (Belief formation in Reasoning Phase).

---

**R-EM-047 — Belief formation threshold**

> **Statement:** A proposition transitions from Hypothesis to Belief when the Certainty
> derived from its supporting Evidence exceeds the Belief Formation Threshold, defined
> as the minimum Certainty at which the system treats a proposition as a working
> assumption. Below this threshold, the proposition remains a Hypothesis.

**Guarantee:** The system does not commit to propositions until sufficient Evidence has
accumulated. The threshold prevents premature belief formation.

**Rationale:** CP-13 (Hipótesis múltiples) requires maintaining multiple hypotheses when
Evidence is insufficient. CP-12 (Suficiencia mínima) requires operating with minimum
sufficient Evidence. The Belief Formation Threshold operationalizes these principles.

**Source:** CP-13, CP-12, CP-17.

**Implementation delegation:** DECISION_MODEL.md (Belief Formation Threshold definition),
CERTAINTY_CALCULUS.md (threshold comparison).

---

**R-EM-048 — Belief revision**

> **Statement:** A Belief MUST be revised when new Evidence changes the Certainty of the
> underlying proposition. Revision may mean:

> a) **Upward revision**: Certainty increases (Evidence corroborates the Belief).
> b) **Downward revision**: Certainty decreases (Evidence contradicts the Belief).
> c) **Abandonment**: Certainty falls below the Belief Formation Threshold and the
>    proposition reverts to Hypothesis or is discarded.
> d) **Replacement**: A competing proposition achieves higher Certainty and replaces the
>    current Belief.

**Guarantee:** Beliefs are always responsive to new Evidence. The system never "locks"
a Belief against contradictory Evidence.

**Rationale:** CONSTITUTION.md P-E4 (Revisability of Beliefs) requires that every Belief
be revisable when new Evidence arrives. CP-20 (Actualización por Evidence) requires
update on every new Evidence.

**Source:** P-E4, CP-20.

**Implementation delegation:** COGNITIVE_ARCHITECTURE.md (Reasoning Phase revision logic),
DECISION_MODEL.md (replacement criteria).

---

## 11. Evidence and Knowledge State

### 11.1 Evidence as the foundation of the Knowledge State

**R-EM-049 — The Evidence Store is the persistent foundation**

> **Statement:** The Evidence Store (SYSTEM_VOCABULARY.md 5.3) is the persistent, append-only
> foundation of the Knowledge State (SYSTEM_VOCABULARY.md 6.1). All other components of the
> Knowledge State — Beliefs, active Hypotheses, and Commitments — are derived from or
> depend on the Evidence Store.

**Guarantee:** The Evidence Store is the ground truth of what the system has perceived.
If the volatile parts of the Knowledge State are lost (system restart), the Evidence
Store alone is sufficient to reconstruct the Knowledge State.

**Rationale:** SYSTEM_VOCABULARY.md defines the Evidence Store as part of the Knowledge State and
as the single source of truth for "what has the system perceived?" CP-29 (Reconstrucción
desde Evidence) requires that the Operational Projection be reconstructible from the
Evidence Store alone.

**Source:** SYSTEM_VOCABULARY.md §5.3, CP-29, S-P6.

**Implementation delegation:** KNOWLEDGE_MODEL.md (Knowledge State structure depends on
Evidence Store), COGNITIVE_ARCHITECTURE.md (reconstruction from Evidence Store).

---

**R-EM-050 — The Hypothesis Network reads from Evidence**

> **Statement:** The Hypothesis Network (SYSTEM_VOCABULARY.md 6.5) reads from the Evidence Store
> to generate and maintain competing Hypotheses. Hypotheses are supported or refuted by
> Evidence. The Hypothesis Network does NOT write to the Evidence Store — it only reads.

**Guarantee:** The Evidence Store is the sole source for hypothesis formation. The
hypothesis generation process is a reader of Evidence, never a modifier.

**Rationale:** CP-13 (Hipótesis múltiples) requires hypotheses to be generated from
available Evidence. CP-08 prohibits cognitive processes from modifying Evidence.

**Source:** CP-13, CP-08, SYSTEM_VOCABULARY.md §6.5.

**Implementation delegation:** KNOWLEDGE_MODEL.md (Hypothesis Network reads from Evidence
Store), COGNITIVE_ARCHITECTURE.md (Reasoning Phase generates hypotheses from Evidence).

---

### 11.2 Evidence and State Reconstruction

**R-EM-051 — Reconstruction from Evidence alone**

> **Statement:** The Knowledge State must be fully reconstructible from the Evidence Store
> alone. After a system restart, the system must be able to:

> a) Read all relevant Evidence from the Evidence Store.
> b) Recompute all Beliefs and their Certainties from the Evidence (R-EM-042).
> c) Reconstruct the active Commitments from the Evidence.
> d) Derive the Operational Projection from the Commitments.
> e) Resume operations without data loss.

**Guarantee:** The system is resilient to failure. No volatile state is irreplaceable.
The Evidence Store is the single source of epistemic truth from which everything else
can be derived.

**Rationale:** CP-29 (Reconstrucción desde Evidence) and S-P6 (Knowledge Preservation)
require that the system never enter a state from which its accumulated Evidence and
active Commitments cannot be recovered.

**Source:** CP-29, S-P6.

**Implementation delegation:** KNOWLEDGE_MODEL.md (reconstruction algorithm),
COGNITIVE_ARCHITECTURE.md (startup recovery flow), EVIDENCE_MODEL implementation
(Evidence Store query for reconstruction).

---

## 12. Evidence and Commitment

### 12.1 Evidence as the gatekeeper

**R-EM-052 — Commitment requires sufficient Evidence**

> **Statement:** A Commitment (SYSTEM_VOCABULARY.md 8.2) may only be made when the accumulated
> Evidence for the relevant proposition(s) yields a Certainty equal to or above the
> Commitment Threshold for that type of Commitment. The Commitment Threshold is defined
> in DECISION_MODEL.md and varies by Commitment type and Strategic Posture.

**Guarantee:** No operational Commitment (trip creation, dispatch, price confirmation)
is made without sufficient Evidence to justify it. The Evidence Store is the gatekeeper
of safe operation.

**Rationale:** CP-22 (Compromiso explícito) requires explicit commitment based on
Certainty and Cost of Error. CP-23 (Umbral dinámico) requires dynamic thresholds based
on Cost of Error. This rule connects Evidence → Certainty → Commitment.

**Source:** CP-22, CP-23, CP-24, CONSTITUTION.md §3.4.

**Implementation delegation:** DECISION_MODEL.md (threshold definition),
COMMITMENT_MODEL.md (commitment gate calls Evidence Store to verify sufficiency).

---

**R-EM-053 — Commitment records reference Evidence**

> **Statement:** Every recorded Commitment must reference the specific Evidence records
> that motivated it. The commitment record must include: the Evidence IDs, the Certainty
> at commitment time, the Cost of Error assessment, and the Strategic Posture that
> modulated the threshold.

**Guarantee:** Every Commitment is fully auditable to its evidentiary basis. Post-hoc
analysis can determine whether a Commitment was justified given the Evidence available
at the time.

**Rationale:** CONSTITUTION.md P-I5 (Auditability) requires that every Commitment be
traceable to the Evidence that motivated it, the Certainty at decision time, the Cost
of Error estimate, and the Strategic Posture.

**Source:** P-I5, CP-22.

**Implementation delegation:** COMMITMENT_MODEL.md (commitment record schema with Evidence
references), COGNITIVE_ARCHITECTURE.md (commitment phase records the decision).

---

### 12.2 Evidence from Commitment outcomes

**R-EM-054 — Outcome Evidence**

> **Statement:** The outcome of every Commitment — whether it succeeded, failed, or was
> modified — must be registered as new Evidence in the Evidence Store. This outcome
> Evidence is linked to the Evidence that motivated the original Commitment.

**Guarantee:** The system closes the loop: decisions produce outcomes, outcomes become
Evidence, and Evidence improves future decisions.

**Rationale:** CP-37 (Retroalimentación por outcome) requires that every outcome be
registered as Evidence and used to adjust Source Confidence, Certainty calibration,
and Cost of Error estimates.

**Source:** CP-37, CP-38.

**Implementation delegation:** COGNITIVE_ARCHITECTURE.md (outcome registration),
DECISION_MODEL.md (calibration adjustment from outcomes), EVIDENCE_MODEL implementation
(outcome Evidence schema).

---

## 13. Evidence and Learning

### 13.1 Learning from Evidence outcomes

**R-EM-055 — Evidence drives Source Confidence adjustment**

> **Statement:** The Confidence assigned to a Source type (R-EM-016) MUST be adjusted
> based on the historical accuracy of Evidence from that Source. The adjustment mechanism:

> a) Compares the original Evidence (what the system believed) with outcome Evidence
>    (what actually happened).
> b) Increases Confidence for Sources whose Evidence consistently leads to correct outcomes.
> c) Decreases Confidence for Sources whose Evidence consistently leads to incorrect outcomes.
> d) Is gradual — a single incorrect outcome does not drastically change Confidence.
> e) Is context-sensitive — a Source may be reliable for one type of proposition
>    (e.g., location extraction) and unreliable for another (e.g., intent classification).

**Guarantee:** The system learns which Sources to trust over time. Source Confidence is
not static — it improves with experience.

**Rationale:** CP-38 (Ajuste de confianza de fuente) requires Confidence adjustment
based on historical accuracy. This rule defines the mechanism.

**Source:** CP-38, CP-37.

**Implementation delegation:** DECISION_MODEL.md (adjustment algorithm),
EVIDENCE_MODEL implementation (historical Confidence per Source per proposition type).

---

**R-EM-056 — Evidence drives Certainty calibration**

> **Statement:** The relationship between aggregated Evidence Confidence and actual outcome
> accuracy MUST be monitored and used to calibrate the Certainty computation function.
> If the system consistently overestimates or underestimates Certainty relative to
> outcomes, the computation function must be adjusted.

**Guarantee:** The system's certainty estimates improve over time. Systematic
overconfidence or underconfidence is detected and corrected.

**Rationale:** CP-37 (Retroalimentación por outcome) requires that outcome feedback
improve Certainty calibration. This is a meta-learning mechanism that operates on the
Certainty function itself.

**Source:** CP-37, CP-38.

**Implementation delegation:** CERTAINTY_CALCULUS.md (calibration adjustment),
DECISION_MODEL.md (calibration monitoring).

---

### 13.2 Non-destructive learning

**R-EM-057 — Learning adds Evidence, never modifies it**

> **Statement:** All learning in AITOS — pattern discovery, preference learning, confidence
> adjustment, calibration improvement — must take the form of adding NEW Evidence to the
> Evidence Store. No learning process may modify, delete, or retroactively correct existing
> Evidence.

**Guarantee:** Learning is additive, not destructive. The historical record is preserved
even as the system improves. Prior mistakes remain as Evidence for future audit and
analysis.

**Rationale:** CP-39 (Mejora no destructiva) requires that learning add new knowledge
without destroying prior knowledge. S-P5 prohibits modification of Evidence.

**Source:** CP-39, S-P5.

**Implementation delegation:** COGNITIVE_ARCHITECTURE.md (learning process writes new
Evidence), EVIDENCE_MODEL implementation (append-only invariant enforced).

---

## 14. Preservation and Persistence

### 14.1 The Evidence Store

**R-EM-058 — Evidence Store as canonical repository**

> **Statement:** The Evidence Store is the single, canonical, append-only repository of
> all Evidence in AITOS. There must be exactly one logical Evidence Store per AITOS
> instance. No Evidence may exist outside the Evidence Store.

**Guarantee:** The Evidence Store is the definitive record of all perceptions. There is
no "shadow evidence" stored in caches, logs, or component-specific stores that could
diverge from the canonical record.

**Rationale:** SYSTEM_VOCABULARY.md §5.3 defines the Evidence Store as "the canonical store of all
Evidence." CP-05 requires that Evidence be registered in the Evidence Store. Having
multiple stores would violate the principle of a single source of truth.

**Source:** SYSTEM_VOCABULARY.md §5.3, CP-05.

**Implementation delegation:** COGNITIVE_ARCHITECTURE.md (all components read from and
write to the same Evidence Store), EVIDENCE_MODEL implementation (single logical store).

---

**R-EM-059 — Append-only architecture**

> **Statement:** The Evidence Store MUST be append-only. The only write operation
> permitted is appending new Evidence records. The following operations are PROHIBITED:

> a) Update of existing Evidence records (core attributes).
> b) Deletion of Evidence records.
> c) Modification of Evidence identity or timestamps.
> d) Any operation that alters the historical record.

**Guarantee:** Once Evidence is registered, it is permanent. The historical record is
inviolable.

**Rationale:** S-P5 (Evidence Immutability) and CP-08 (Inmutabilidad operativa) require
append-only semantics. This rule makes the requirement explicit at the store level.

**Source:** S-P5, CP-08.

**Implementation delegation:** EVIDENCE_MODEL implementation (append-only enforcement at
the storage layer).

---

**R-EM-060 — Retention**

> **Statement:** Evidence must be retained for the maximum of: (a) the period required by
> applicable law, (b) no less than 180 days (CONSTITUTION.md §5.3.1), and (c) the
> duration of any active Commitment that depends on it. After the retention period,
> Evidence may be archived (R-EM-026) but never deleted.

**Guarantee:** Evidence is retained for as long as it has legal, operational, or epistemic
value. The 180-day floor ensures minimum availability for audit and learning.

**Rationale:** CONSTITUTION.md §5.3.1 establishes the 180-day minimum retention.
S-P6 requires that active Commitments remain recoverable — this means Evidence supporting
active Commitments must be retained.

**Source:** CONSTITUTION.md §5.3.1, S-P6.

**Implementation delegation:** EVIDENCE_MODEL implementation (retention policy enforcement),
KNOWLEDGE_MODEL.md (archival strategy).

---

## 15. Reconstruction from Evidence

### 15.1 Reconstruction principles

**R-EM-061 — Evidence sufficiency for reconstruction**

> **Statement:** The Evidence Store must contain sufficient information to reconstruct the
> complete Knowledge State (Beliefs, Commitments, Operational Projection) at any point
> in time. "Sufficient" means that given the Evidence Store and the deterministic rules
> of the system (Certainty computation, belief formation, commitment rules), the state
> can be recomputed without external information.

**Guarantee:** The system is self-sufficient for state reconstruction. No external
databases, caches, or logs are needed to recover from failure.

**Rationale:** CP-29 (Reconstrucción desde Evidence) requires full reconstruction from the
Evidence Store. S-P6 requires that the system never enter an unrecoverable state.

**Source:** CP-29, S-P6.

**Implementation delegation:** KNOWLEDGE_MODEL.md (reconstruction algorithm),
COGNITIVE_ARCHITECTURE.md (startup recovery flow).

---

**R-EM-062 — Deterministic reconstruction**

> **Statement:** The reconstruction process MUST be deterministic. Given the same Evidence
> Store, the system must reconstruct the same Knowledge State every time. Non-deterministic
> components (LLMs) must not participate in reconstruction.

**Guarantee:** Recovery is predictable and testable. Two restarts from the same Evidence
Store produce identical Knowledge States.

**Rationale:** Predictability and testability of recovery require determinism. CP-07
establishes determinism for perception; this rule extends it to reconstruction.

**Source:** CP-07 (by analogy — determinism in perception extends to reconstruction),
S-P4 (Deterministic Core).

**Implementation delegation:** COGNITIVE_ARCHITECTURE.md (reconstruction pipeline must be
free of LLM calls), KNOWLEDGE_MODEL.md (deterministic belief recomputation).

---

## 16. Traceability

### 16.1 Full provenance chain

**R-EM-063 — Five-level traceability**

> **Statement:** Every decision in AITOS must be traceable through five levels:

> ```
> Decision → Commitment → Belief(s) → Evidence → Observation → Signal
> ```

> Each level must reference the level below it. A decision records which Commitment(s)
> it produced. Each Commitment records which Belief(s) motivated it. Each Belief records
> which Evidence supports it. Each Evidence records which Observation produced it. Each
> Observation records which Signal it originated from.

**Guarantee:** The complete chain from system action to raw input is reconstructible.
Any decision can be audited to its perceptual origin.

**Rationale:** CONSTITUTION.md P-I5 requires traceability to Evidence. CP-09 requires
traceability of Evidence to Signal. Together they establish the five-level chain.

**Source:** P-I5, CP-09.

**Implementation delegation:** COMMITMENT_MODEL.md (commitment records reference Beliefs),
KNOWLEDGE_MODEL.md (Belief records reference Evidence IDs), EVIDENCE_MODEL implementation
(Evidence records reference Observation IDs), COGNITIVE_ARCHITECTURE.md (Observation
records reference Signal IDs), CHANNEL_ADAPTER.md (Signal records include channel context).

---

**R-EM-064 — Temporal traceability**

> **Statement:** The five-level traceability chain must support temporal queries: given a
> point in time T, what Evidence was available, what Beliefs were held, what Commitments
> were active, and what Decisions were made?

**Guarantee:** The system can reconstruct its epistemic state at any past moment. This
enables analysis of whether decisions were justified given the information available
at the time.

**Rationale:** Traceability (P-I5) is not just about the current state — it must support
historical analysis. CP-19 (temporal degradation) requires knowing the age of Evidence,
which implies temporal query capability.

**Source:** P-I5, CP-19, CP-09.

**Implementation delegation:** EVIDENCE_MODEL implementation (temporal query by timestamp),
KNOWLEDGE_MODEL.md (point-in-time state reconstruction).

---

### 16.2 Identity and cross-referencing

**R-EM-065 — Cross-system Evidence identity**

> **Statement:** If Evidence is referenced outside the Evidence Store (in logs, audit
> reports, operator dashboards, external systems), it must be referenced by its globally
> unique Evidence ID (R-EM-013). No other identifier may serve as a substitute for the
> Evidence ID.

**Guarantee:** Evidence references are unambiguous across the entire system. There is no
confusion about which specific piece of Evidence is being referenced.

**Rationale:** CP-09 requires traceability. A unique, universal identifier is the
foundation of traceability.

**Source:** CP-09, R-EM-013.

**Implementation delegation:** EVIDENCE_MODEL implementation (ID exposed through all
interfaces), audit system (references by ID).

---

## 17. Invariants

### 17.1 Structural invariants

**R-EM-066 — No Evidence without identity**

> **Statement:** Every Evidence record MUST have a unique identifier (R-EM-013). There is
> no such thing as unnamed Evidence.

**Verification:** Any operation that creates an Evidence record must fail if no unique
identifier is provided.

**Source:** R-EM-013, CP-09.

---

**R-EM-067 — No Evidence without Source**

> **Statement:** Every Evidence record MUST declare its Source (R-EM-015). Evidence
> without a Source is epistemically invalid — the system cannot assess its reliability.

**Verification:** Registration must reject any Evidence without a populated Source field.

**Source:** R-EM-015, SYSTEM_VOCABULARY.md §4.4.

---

**R-EM-068 — No Evidence without proposition**

> **Statement:** Every Evidence record MUST address at least one proposition
> (subject-predicate pair). Evidence with no propositional content is meaningless.

**Verification:** Registration must reject Evidence with empty propositional content.

**Source:** R-EM-014, SYSTEM_VOCABULARY.md §4.3.

---

**R-EM-069 — No circular provenance**

> **Statement:** The provenance chain of Evidence (R-EM-018) must never contain cycles.
> Evidence cannot be its own ancestor, directly or indirectly.

**Verification:** Registration of derived Evidence must verify that the parent Evidence
IDs do not form a cycle.

**Source:** R-EM-018, CP-09.

---

**R-EM-070 — Evidence Store never shrinks**

> **Statement:** The Evidence Store must never lose records. The total number of Evidence
> records in the Evidence Store must be monotonically non-decreasing over time.

**Verification:** Any operation that reduces the count of Evidence records is prohibited.
Archival moves records to a different logical store but preserves them.

**Source:** S-P5, CP-08.

---

### 17.2 Operational invariants

**R-EM-071 — No cognitive process writes outside the Evidence Store**

> **Statement:** No cognitive process (Perception, Reasoning, Commitment, Projection,
> Learning) may write information destined for epistemic use to any location other than
> the Evidence Store. Ephemeral working memory is exempt (caches, intermediate
> computation results that are not persisted).

**Verification:** All epistemic write operations in the system must target the Evidence
Store. Writes to other stores (databases, files, external APIs) must be traced back to
the Evidence Store as their source.

**Source:** CP-05, CP-08, SYSTEM_VOCABULARY.md §5.3.

---

**R-EM-072 — Evidence only enters through Perception**

> **Statement:** Evidence may only enter the Evidence Store through the Perception Phase of
> the Cognitive Cycle. No direct write path to the Evidence Store may bypass Perception.

**Verification:** The Evidence Store's write interface must only be callable from the
Perception Phase component. Exceptions: system migration procedures, which must be logged.

**Source:** CP-05 (Frontera percepción/evidencia), CP-06.

---

## 18. Permitted and Prohibited Operations

### 18.1 Permitted operations

**R-EM-073 — Permitted operations**

> **Statement:** The following operations are permitted on the Evidence Store:

> | Operation | Description | Constraint |
> |-----------|-------------|------------|
> | **APPEND** | Register new Evidence (RAW state) | Must include all essential attributes (R-EM-013 through R-EM-019) |
> | **READ_BY_ID** | Read a single Evidence record by ID | Any component with read access |
> | **READ_BY_PROPOSITION** | Read all Evidence addressing a proposition | Returns Evidence in all states except VOID |
> | **READ_BY_SOURCE** | Read all Evidence from a given Source | For audit and confidence adjustment |
> | **READ_BY_TIME_RANGE** | Read Evidence within a time window | For temporal analysis and reconstruction |
> | **READ_STATE_HISTORY** | Read the state transition history of an Evidence | For audit |
> | **TRANSITION_STATE** | Change the state of an Evidence | Must follow lifecycle rules (§5) |
> | **LINK** | Add a relationship link between two Evidence | Relationship type must be one of R-EM-031 |
> | **QUERY_FOR_RECONSTRUCTION** | Read all Evidence needed to reconstruct Knowledge State | Returns ACTIVE and STALE Evidence, ordered by proposition |

**Source:** R-EM-021 (lifecycle), R-EM-031 (relationships), CP-08 (immutability does not
prevent reads).

---

### 18.2 Prohibited operations

**R-EM-074 — Prohibited operations**

> **Statement:** The following operations are PROHIBITED on the Evidence Store:

> | Operation | Reason |
> |-----------|--------|
> | **UPDATE_CORE** | Modify core attributes (identity, fact content, Source, Confidence at registration, timestamps, provenance) | Violates S-P5, CP-08 |
> | **DELETE** | Remove an Evidence record | Violates S-P5, CP-08 |
> | **BULK_ARCHIVE_BY_AGE** — without verification | Archive Evidence based solely on age, without checking relevance to active Commitments | Violates S-P6 (may lose evidence needed for active operations) |
> | **TRANSITION_TO_ACTIVE** directly from ARCHIVED | Archived Evidence must go through ACTIVE → STALE → ACTIVE | Violates lifecycle rules (R-EM-021) |
> | **WRITE_OUTSIDE_PERCEPTION** | Write Evidence to the store from any phase other than Perception | Violates CP-05 |
> | **MERGE_OR_DEDUPLICATE** | Combine or remove "duplicate" Evidence records | Violates S-P5 — what appears as a duplicate may be a useful independent observation |
> | **RESOLVE_CONFLICT_BY_DELETION** | Delete conflicting Evidence instead of marking it SUPERSEDED | Violates S-P5 |

**Source:** S-P5, CP-08, CP-05, S-P6, R-EM-021.

---

## 19. Validity and Obsolescence

### 19.1 Validity criteria

**R-EM-075 — Evidence validity criteria**

> **Statement:** Evidence is valid for cognitive use if and only if ALL of the following
> conditions are met:

> 1. **Registration completeness**: All essential attributes (R-EM-013 through R-EM-019)
>    are populated and conform to their respective schemas.
> 2. **Proposition clarity**: The proposition addressed (subject-predicate) is unambiguous
>    and computable.
> 3. **Source legitimacy**: The Source is one of the canonical types.
> 4. **Provenance integrity**: The provenance chain is intact (no broken references to
>    parent Observations or parent Evidence).
> 5. **State eligibility**: The Evidence's state is not VOID.
> 6. **Temporal consistency**: Perception timestamp ≤ registration timestamp ≤ current time.

**Guarantee:** The system can programmatically determine whether any piece of Evidence is
fit for cognitive use.

**Source:** R-EM-013 through R-EM-019, R-EM-027 (VOID state).

---

### 19.2 Obsolescence criteria

**R-EM-076 — Evidence obsolescence criteria**

> **Statement:** Evidence is considered obsolete (not to be used for active belief
> formation) when ANY of the following conditions is met:

> 1. **State-based obsolescence**: The Evidence is in STALE, SUPERSEDED, ARCHIVED, or
>    VOID state.
> 2. **Degradation beyond threshold**: The Evidence's Certainty contribution has degraded
>    (CP-19) below the minimum threshold for belief formation, defined in
>    CERTAINTY_CALCULUS.md.
> 3. **Supersession**: The Evidence has been explicitly superseded by newer Evidence
>    (R-EM-025).
> 4. **Contextual obsolescence**: The Cognitive Cycle has moved to a context where the
>    proposition addressed by the Evidence is no longer relevant (e.g., the user's intent
>    has changed from BOOKING to CANCELLATION).

**Guarantee:** Obsolete Evidence does not participate in active belief formation,
preventing the system from making decisions based on outdated or superseded information.

**Source:** CP-19, R-EM-021 (states), R-EM-025 (supersession).

---

## 20. Delegation to Implementation Documents

### 20.1 Documents that concretize this model

The following Level III and Level IV documents are required to implement this Evidence
Model. Each document must be compatible with this model and may not contradict it.

| Document | What it concretizes from this model |
|----------|-------------------------------------|
| **COGNITIVE_ARCHITECTURE.md** (Level II-b) | Perception Phase pipeline (R-EM-006 to R-EM-012), Reasoning Phase Evidence consumption (R-EM-046 to R-EM-048), Commitment Phase Evidence gates (R-EM-052 to R-EM-054), Learning Phase Evidence production (R-EM-055 to R-EM-057), reconstruction flow (R-EM-061, R-EM-062) |
| **DECISION_MODEL.md** (Level III-b) | Conflict resolution algorithm (R-EM-039), Belief Formation Threshold (R-EM-047), Commitment Threshold calibration (R-EM-052), Source Confidence adjustment (R-EM-055), Certainty calibration (R-EM-056) |
| **CERTAINTY_CALCULUS.md** (Level III-d) | Certainty computation function from Evidence (R-EM-042 to R-EM-044), aggregation function (R-EM-035), degradation function (R-EM-023), Epistemic Limit (R-EM-044) |
| **COMMITMENT_MODEL.md** (Level III-c) | Commitment Evidence references (R-EM-053), outcome Evidence registration (R-EM-054) |
| **KNOWLEDGE_MODEL.md** (Level III-f) | Knowledge State structure based on Evidence Store (R-EM-049), Hypothesis Network reads from Evidence (R-EM-050), reconstruction algorithm (R-EM-061) |
| **CHANNEL_ADAPTER.md** (Level III-e) | Signal → Observation transformation (R-EM-006, R-EM-007), Channel-level validation |
| **ACTION_EXECUTOR.md** (Level III-g) | Outcome capture and registration as Evidence (R-EM-054) |
| **EVIDENCE_MODEL implementation** (Level IV — code) | Evidence Store (R-EM-058), append-only enforcement (R-EM-059), Evidence schema (R-EM-013 to R-EM-020), state machine (R-EM-021), relationship storage (R-EM-031), retention (R-EM-060), query operations (R-EM-073), prohibited operations enforcement (R-EM-074) |

### 20.2 Traceability matrix

| This document's rule | Source CP | Source Constitution | Implements for |
|----------------------|-----------|-------------------|----------------|
| R-EM-001 | CP-05 | §3.2, S-P1 | COGNITIVE_ARCHITECTURE.md |
| R-EM-002 | — | §3.1, §3.5 | DECISION_MODEL.md, CERTAINTY_CALCULUS.md |
| R-EM-003 | CP-08, CP-39 | S-P5 | KNOWLEDGE_MODEL.md |
| R-EM-004 | CP-05, CP-17 | S-P1, P-E1, P-I1 | COGNITIVE_ARCHITECTURE.md, DECISION_MODEL.md |
| R-EM-005 | CP-09, CP-29 | P-I5 | All implementation |
| R-EM-006 | CP-05 | — | CHANNEL_ADAPTER.md |
| R-EM-007 | CP-07 | — | CHANNEL_ADAPTER.md |
| R-EM-008 | CP-06, CP-07 | — | COGNITIVE_ARCHITECTURE.md |
| R-EM-009 | CP-05, CP-06 | — | EVIDENCE_MODEL implementation |
| R-EM-010 | CP-06 | S-P5 | COGNITIVE_ARCHITECTURE.md |
| R-EM-011 | CP-07 | S-P4 | COGNITIVE_ARCHITECTURE.md |
| R-EM-012 | CP-11 | S-P1 | COGNITIVE_ARCHITECTURE.md |
| R-EM-013 | CP-09 | P-I5 | EVIDENCE_MODEL implementation |
| R-EM-014 | — | — | EVIDENCE_MODEL implementation, KNOWLEDGE_MODEL.md |
| R-EM-015 | CP-38, CP-09 | — | EVIDENCE_MODEL implementation |
| R-EM-016 | CP-38, CP-37 | — | EVIDENCE_MODEL implementation, CERTAINTY_CALCULUS.md |
| R-EM-017 | CP-19, CP-09 | — | EVIDENCE_MODEL implementation |
| R-EM-018 | CP-09, CP-29 | P-I5 | EVIDENCE_MODEL implementation |
| R-EM-019 | CP-18, CP-20 | P-E2 | CERTAINTY_CALCULUS.md |
| R-EM-020 | — | S-P10 | EVIDENCE_MODEL implementation |
| R-EM-021 | CP-08, CP-19, CP-31, CP-10 | S-P5 | EVIDENCE_MODEL implementation |
| R-EM-022 | CP-05, CP-08 | — | COGNITIVE_ARCHITECTURE.md |
| R-EM-023 | CP-19 | — | CERTAINTY_CALCULUS.md |
| R-EM-024 | CP-19, CP-20 | — | EVIDENCE_MODEL implementation |
| R-EM-025 | CP-10, CP-08 | S-P5 | DECISION_MODEL.md |
| R-EM-026 | CP-31 | S-P6 | KNOWLEDGE_MODEL.md |
| R-EM-027 | — | S-P5, S-P6 | EVIDENCE_MODEL implementation |
| R-EM-028 | CP-08 | S-P5 | EVIDENCE_MODEL implementation |
| R-EM-029 | — | P-I5, S-P5 | EVIDENCE_MODEL implementation |
| R-EM-030 | CP-18, CP-20 | — | EVIDENCE_MODEL implementation, CERTAINTY_CALCULUS.md |
| R-EM-031 | CP-10, CP-15 | — | EVIDENCE_MODEL implementation |
| R-EM-032 | CP-10, CP-20 | — | COGNITIVE_ARCHITECTURE.md |
| R-EM-033 | — | — | EVIDENCE_MODEL implementation |
| R-EM-034 | CP-06 | — | EVIDENCE_MODEL implementation |
| R-EM-035 | CP-20, CP-10, CP-18 | — | CERTAINTY_CALCULUS.md |
| R-EM-036 | CP-39, CP-15, CP-08 | — | EVIDENCE_MODEL implementation |
| R-EM-037 | CP-10 | — | COGNITIVE_ARCHITECTURE.md |
| R-EM-038 | CP-10 | — | DECISION_MODEL.md |
| R-EM-039 | CP-10, CP-17 | — | DECISION_MODEL.md, CERTAINTY_CALCULUS.md |
| R-EM-040 | CP-10 | S-P5, CP-08 | EVIDENCE_MODEL implementation |
| R-EM-041 | CP-10, CP-17 | — | CERTAINTY_CALCULUS.md |
| R-EM-042 | CP-20 | §3.3.1, P-E2 | CERTAINTY_CALCULUS.md |
| R-EM-043 | CP-18, CP-19, CP-20, CP-21 | — | CERTAINTY_CALCULUS.md |
| R-EM-044 | CP-21 | §3.1 | CERTAINTY_CALCULUS.md |
| R-EM-045 | CP-20, CP-19 | — | COGNITIVE_ARCHITECTURE.md |
| R-EM-046 | CP-17 | S-P1 | KNOWLEDGE_MODEL.md |
| R-EM-047 | CP-13, CP-12, CP-17 | — | DECISION_MODEL.md, CERTAINTY_CALCULUS.md |
| R-EM-048 | P-E4, CP-20 | — | COGNITIVE_ARCHITECTURE.md |
| R-EM-049 | CP-29, CP-30 | S-P6 | KNOWLEDGE_MODEL.md |
| R-EM-050 | CP-13, CP-08 | — | KNOWLEDGE_MODEL.md |
| R-EM-051 | CP-29, CP-30 | S-P6 | KNOWLEDGE_MODEL.md |
| R-EM-052 | CP-22, CP-23, CP-24 | §3.4 | DECISION_MODEL.md, COMMITMENT_MODEL.md |
| R-EM-053 | CP-22 | P-I5 | COMMITMENT_MODEL.md |
| R-EM-054 | CP-37, CP-38 | — | COGNITIVE_ARCHITECTURE.md, DECISION_MODEL.md |
| R-EM-055 | CP-38, CP-37 | — | DECISION_MODEL.md |
| R-EM-056 | CP-37, CP-38 | — | CERTAINTY_CALCULUS.md |
| R-EM-057 | CP-39 | S-P5 | COGNITIVE_ARCHITECTURE.md |
| R-EM-058 | CP-05 | — | COGNITIVE_ARCHITECTURE.md |
| R-EM-059 | CP-08 | S-P5 | EVIDENCE_MODEL implementation |
| R-EM-060 | — | §5.3.1, S-P6 | EVIDENCE_MODEL implementation |
| R-EM-061 | CP-29, CP-30 | S-P6 | KNOWLEDGE_MODEL.md |
| R-EM-062 | CP-07 (by analogy), S-P4 | — | COGNITIVE_ARCHITECTURE.md |
| R-EM-063 | P-I5, CP-09 | — | Multiple (see §16) |
| R-EM-064 | P-I5, CP-19, CP-09 | — | EVIDENCE_MODEL implementation |
| R-EM-065 | CP-09 | — | EVIDENCE_MODEL implementation |
| R-EM-066 | R-EM-013 | — | EVIDENCE_MODEL implementation |
| R-EM-067 | R-EM-015 | — | EVIDENCE_MODEL implementation |
| R-EM-068 | R-EM-014 | — | EVIDENCE_MODEL implementation |
| R-EM-069 | R-EM-018 | — | EVIDENCE_MODEL implementation |
| R-EM-070 | CP-08 | S-P5 | EVIDENCE_MODEL implementation |
| R-EM-071 | CP-05, CP-08 | — | COGNITIVE_ARCHITECTURE.md |
| R-EM-072 | CP-05, CP-06 | — | EVIDENCE_MODEL implementation |
| R-EM-073 | — | — | EVIDENCE_MODEL implementation |
| R-EM-074 | S-P5, CP-08, CP-05, S-P6 | — | EVIDENCE_MODEL implementation |
| R-EM-075 | — | — | EVIDENCE_MODEL implementation |
| R-EM-076 | CP-19 | — | COGNITIVE_ARCHITECTURE.md |

---

## Appendix A — Concepts defined in this document vs. SYSTEM_VOCABULARY.md

This document does not redefine SYSTEM_VOCABULARY.md concepts. It refines them for the Evidence
Model context. The following table clarifies the relationship:

| Concept | Defined in SYSTEM_VOCABULARY.md | Refined in this document |
|---------|------------------------|--------------------------|
| **Evidence** | §5.1 — Recorded set of Facts with Source and Confidence | R-EM-001 (operational definition), R-EM-013 to R-EM-019 (essential attributes) |
| **Evidence Store** | §5.3 — Canonical store of all Evidence | R-EM-058 (single canonical store), R-EM-059 (append-only), R-EM-060 (retention) |
| **Fact** | §4.3 — Atomic unit of meaning | R-EM-008 (fact as extraction output), R-EM-014 (propositional structure) |
| **Source** | §4.4 — Origin of a Fact | R-EM-015 (Source as mandatory attribute), R-EM-041 (precedence hierarchy) |
| **Confidence** | §6.3 — Reliability of a Source | R-EM-016 (Confidence as attribute), R-EM-055 (historical adjustment) |
| **Certainty** | §6.2 — Confidence in a Belief | R-EM-042 to R-EM-045 (computation from Evidence) |
| **Belief** | §5.2 — Proposition held as true | R-EM-046 to R-EM-048 (formation from Evidence) |
| **Observation** | §4.2 — Validated Signal | R-EM-007 (Observation as gate), R-EM-008 (decomposition into Facts) |

---

## Appendix B — Response map

This appendix maps each question from the document's purpose (§1) to the rules that
answer it.

| Question | Answering rules |
|----------|----------------|
| ¿Qué es una evidencia desde el punto de vista operativo? | R-EM-001, R-EM-002, R-EM-003 |
| ¿Cómo nace una evidencia? | R-EM-006 to R-EM-012 |
| ¿Cuándo una observación se convierte en evidencia? | R-EM-009 |
| ¿Qué atributos posee? | R-EM-013 to R-EM-020 |
| ¿Cómo evoluciona? | R-EM-021 to R-EM-029 |
| ¿Qué relaciones puede tener con otras evidencias? | R-EM-030 to R-EM-032 |
| ¿Cómo se preserva? | R-EM-058 to R-EM-060, R-EM-070 |
| ¿Cómo participa en el razonamiento? | R-EM-030, R-EM-035, R-EM-037 to R-EM-041 |
| ¿Cómo participa en la construcción del conocimiento? | R-EM-046 to R-EM-051 |
| ¿Cómo participa en la toma de decisiones? | R-EM-052 to R-EM-054 |
| ¿Cómo participa en el aprendizaje? | R-EM-055 to R-EM-057 |

---

*Fin de 04-EVIDENCE_MODEL.md — Versión 1.0-draft*

> Este documento fue redactado a partir de CONSTITUTION.md (Level I-a), SYSTEM_VOCABULARY.md
> (Level I-b), y COGNITIVE_PRINCIPLES.md (Level II-a) siguiendo las delegaciones
> explícitas de CP §13.2 y la jerarquía documental de CONSTITUTION.md §6.
>
> Fecha: 2026-07-11
