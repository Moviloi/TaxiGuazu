# ADR 009: Evidence Engine Architecture

**Status:** Accepted  
**Date:** 2026-07-13  
**Driver:** PR-3E — final audit and contractual freeze of the Evidence Engine cognitive pipeline.

---

## Context

The Evidence Engine was built incrementally across seven PRs:

| PR | Layer | Description |
|----|-------|-------------|
| PR-1/2A | Signal | First-class cognitive object for raw message capture |
| PR-2C | Observation | Validation wrapper with temporal invariant |
| PR-2D | Fact | Atomic propositions from Observation + Signal context |
| PR-2E | Evidence | Immutable collection of Facts under one Observation |
| PR-2F | Shadow Mode | Unified `runShadowCognition()` + `ShadowResult` container |
| PR-3A | Knowledge | Consolidated structured fields from Evidence Facts |
| PR-3B | Belief | Epistemic commitment derived from Knowledge |
| PR-3C | Decision | Cognitive determination derived from Belief |
| PR-3E | Final Audit | 7-layer audit + S-1/O-1 blocker resolution + Architecture Freeze |

After the 7-layer audit, 378 passing tests, zero contract violations, and resolution of the two temporal invariants (S-1, O-1), the architecture is mature enough to freeze.

---

## Decision

Adopt the Evidence Engine as the **foundational cognitive pipeline** of AITOS. The following architecture is frozen and serves as the base for all future cognitive generations (Memory, Reflection, Learning, Goals, Planning).

---

### 1. Definitive Pipeline

```
Message → Signal → Observation → Fact → Evidence → Knowledge → Belief → Decision
```

Each arrow represents a **pure transformation** that adds exactly one layer of cognitive abstraction. No layer may be skipped. No layer may be duplicated.

---

### 2. Layer Responsibilities

| Layer | Responsibility | Source File |
|-------|---------------|-------------|
| **Message** | Raw inbound message from WhatsApp/web. Channel, text, metadata. External to the Evidence Engine. | `handler.ts` (external) |
| **Signal** | First-class cognitive object. Captures raw content, channel, `receivedAt`, conversation ID. Immutable. Validates `receivedAt` is not in the future (S-1). | `signal.ts` |
| **Observation** | Validation wrapper. Applies temporal invariant: `validatedAt >= signal.receivedAt` (O-1). `fromSignal()` is the canonical factory. | `observation.ts` |
| **Fact** | Atomic proposition extracted from Observation + Signal context. Five structural facts always built. No semantic facts (origin, destination, intent) — those belong to future cognitive layers. | `fact.ts`, `build-fact.ts` |
| **Evidence** | Immutable collection of Facts under a single Observation. `type: 'user_input'`, `provenance: []`. Pure container with no enrichment. | `evidence.ts`, `build-evidence.ts` |
| **Knowledge** | Consolidated structured fields from Evidence Facts. First cognitive behavior: extracts `observationStatus`, `channel`, `hasContent`, `receivedAt`, `conversationId` from fact propositions by string pattern matching. Does NOT infer anything new. | `knowledge.ts`, `build-knowledge.ts` |
| **Belief** | Epistemic commitment: "the system believes that...". Derives `observationValid` (boolean) from `Knowledge.observationStatus`. Transfers channel, hasContent, receivedAt, conversationId. `isWellFormed` query for completeness. Does NOT infer intent, origin, or destination. | `belief.ts`, `build-belief.ts` |
| **Decision** | Cognitive determination: "the system decides that...". Derives `validInput` from `Belief.observationValid`, `readiness` (CognitiveReadiness) from `Belief.isWellFormed`. `missingInfo` auto-diagnosis of absent fields. `isDecided` shortcut query. Does NOT select policies, routes, or responses. | `decision.ts`, `build-decision.ts` |

---

### 3. Permitted Dependencies

Each layer may ONLY depend on:

- Its **immediate predecessor** in the pipeline (strict linear chain)
- **Shared value objects**: `Source`, `Confidence`, `Fact` (as a dependency of Knowledge, Belief, Decision)
- **Error types** from `errors.ts`
- The `@/lib/evidence` **barrel export** (`index.ts`)

Cross-layer dependencies are **FORBIDDEN**:

```
❌ Fact → Belief       (skips Evidence, Knowledge)
❌ Evidence → Decision (skips Knowledge, Belief)
❌ Signal → Knowledge  (skips Observation, Fact, Evidence)
```

The barrel export (`index.ts`) is the **only** public API. External consumers (pipeline, services, tests) MUST import from `@/lib/evidence`.

---

### 4. Architectural Invariants

| ID | Invariant | Enforced by |
|----|-----------|-------------|
| **I1-EE** | Pipeline completeness — every cognitive cycle produces all 8 layers (Message through Decision) or none. | `ShadowResult.isComplete()` |
| **I2-EE** | Immutability — every domain object is frozen (`Object.freeze()`) after construction. | Constructor post-freeze pattern |
| **I3-EE** | Temporal monotonicity — `validatedAt >= signal.receivedAt`; `receivedAt <= now()`. | `Observation.create()` O-1 check; `Signal.create()` S-1 check |
| **I4-EE** | No persistence — the Evidence Engine writes nothing to any database. | Code audit |
| **I5-EE** | No conversation impact — the pipeline never sends messages, never modifies conversational state, never affects the user experience. | Shadow Mode pattern |
| **I6-EE** | Single authority — each layer's meaning is defined by exactly one source. Observation meaning comes from Signal, not from conversation state. | Strict linear chain |

---

### 5. Pipeline Principles

#### Monotonicity
Each layer adds knowledge; never removes or contradicts. A Fact may state "user mentioned origin: IGR", but it does NOT assert "origin is IGR" — that is the role of downstream semantic layers. Knowledge consolidates facts without inferring. Belief interprets consolidation without deciding. Decision determines readiness without acting.

#### Immutability
All domain objects are frozen after construction. No setters. No mutable state. No internal caches. Every transformation produces a new object.

#### Shadow Mode
The full pipeline runs in parallel with the operational pipeline, invisible to the conversation. Feature flag `EVIDENCE_SHADOW_MODE` (environment variable, default `false`). When disabled, no cognitive objects are constructed. When enabled, objects are built and logged but never persisted or acted upon.

#### Builders Never Throw
The `build*` family (`buildSignal`, `buildObservation`, `buildFact`, `buildEvidence`, `buildKnowledge`, `buildBelief`, `buildDecision`) catches all domain errors and returns `null`. The entity classes provide a dual API:
- `create()` — throws typed errors on validation failure
- `tryCreate()` — returns `null` on validation failure

This ensures the pipeline never crashes due to cognitive construction errors.

#### Single Responsibility
Each layer does exactly one thing:
- **Signal**: capture the raw message
- **Observation**: validate temporally
- **Fact**: extract atomic propositions
- **Evidence**: group facts under one observation
- **Knowledge**: consolidate into structured fields
- **Belief**: take an epistemic stance
- **Decision**: determine cognitive readiness

#### Single Authority
Each layer's meaning is defined by exactly one source. `Observation` meaning comes from `Signal`, not from conversation state. `Evidence` meaning comes from `Observation` + `Facts`, not from the database. `Decision` meaning comes from `Belief`, not from policy rules.

---

### 6. Anticipatory Fields Pattern

Some entity fields exist to serve downstream layers that have not yet been built, or to serve layers in the pipeline's future (Memory, Reflection, Learning). These are **NOT dead code**. They are part of the architectural contract.

| Field | Defined In | Serves | Rationale |
|-------|-----------|--------|-----------|
| `evidenceId` | `Knowledge` | Evidence | Avoids reverse traversal from Knowledge → Evidence |
| `knowledgeId` | `Belief` | Knowledge | Avoids reverse traversal from Belief → Knowledge |
| `beliefId` | `Decision` | Belief | Avoids reverse traversal from Decision → Belief |
| `provenance` | `Evidence` | Future audit / Memory | Reserved for memory trace links |
| `signalReceivedAt` | `Observation` (validation param) | Temporal invariant | Not stored or serialized; validation-only context |
| (future) `memoryId` | Memory | Reflection | Will be populated when Memory layer is built |
| (future) `reflectionId` | Reflection | Learning | Will be populated when Reflection layer is built |

**Rule**: Removing any anticipatory field requires a new ADR with evidence that the downstream layer has been redesigned to not need it.

---

### 7. Criteria for Future Cognitive Layers

The Evidence Engine is frozen and serves as the **input contract** for the next cognitive generation. Each future layer must follow the same patterns (immutable, shadow mode, never-throw builders, single authority).

> **Nota PR-11/ADR-011:** El pipeline cognitivo futuro ha sido simplificado después de 7 auditorías arquitectónicas (PR-6 a PR-10). Reflection, Goals y Planning fueron eliminados como capas independientes. El pipeline vigente es: **Evidence Engine → Memory → Pattern Discovery** (3 capas). Ver ADR-011 §4.1 para el detalle completo.
>
> **Ontología de lenguajes cognitivos (PR-7A):** La serie PR-7 establece una distinción ontológica fundamental entre tres lenguajes cognitivos que los futuros ADRs de Pattern Discovery y Goals deberán formalizar: **lenguaje de HECHO** (factual, cierto, por turno — usado por EE y Memory), **lenguaje de TENDENCIA** (probabilístico, generalizante, cross-instance — propio de Pattern Discovery), y **lenguaje de PRESCRIPCIÓN** (directivo, deóntico — propio de Goals). Ver PR-7A §4.

| Layer | Precondition | Entry Point | Description |
|-------|-------------|-------------|-------------|
| **Memory** | Decision pipeline complete | `memoryService.store(belief, decision, conversationId)` → `MemorySnapshot` | Persists the cognitive state (Belief + Decision pair) as an immutable, append-only snapshot per turn. First layer that bridges cognitive → persistence. |
| **Pattern Discovery** | Memory populated for a conversation window | `discover(memoryWindow)` → `Pattern[]` | Analyzes historical Memory snapshots to extract recurrent patterns. Mathematical model: L: 𝒲 × Γ → 𝒫(𝒞). See PR-7 series. |

**Constraints for future layers**:
1. Each new layer MUST have its own ADR before implementation.
2. No layer may import from a layer more than one step ahead in the pipeline.
3. All layers MUST preserve the Shadow Mode pattern (feature flag, never throw, never affect conversation).
4. Anticipatory fields in the frozen engine MUST be consumed by the corresponding new layer.

---

### 8. File Map

```
src/lib/evidence/
├── index.ts              # Public API barrel export
├── types.ts              # Shared types, type guards
├── errors.ts             # Domain error hierarchy (18 error classes)
├── signal.ts             # Signal entity + create() / tryCreate()
├── observation.ts        # Observation entity + create() / tryCreate() / fromSignal()
├── source.ts             # Source value object
├── confidence.ts         # Confidence value object
├── fact.ts               # Fact entity + create()
├── evidence.ts           # Evidence entity + create()
├── knowledge.ts          # Knowledge entity + consolidate()
├── belief.ts             # Belief entity + fromKnowledge()
├── decision.ts           # Decision entity + fromBelief()
├── build-safe.ts         # Shared builder wrapper (catch → log → null)
├── build-signal.ts       # Signal builder
├── build-observation.ts  # Observation builder
├── build-fact.ts         # Fact builder
├── build-evidence.ts     # Evidence builder
├── build-knowledge.ts    # Knowledge builder
├── build-belief.ts       # Belief builder
├── build-decision.ts     # Decision builder
├── shadow-result.ts      # ShadowResult container
└── run-shadow-cognition.ts  # Pipeline orchestrator
```

---

## Consequences

### Positive
- **Foundation frozen**: The cognitive pipeline is stable and ready to serve as the base for Memory → Reflection → Learning → Goals → Planning.
- **Clear contracts**: Future implementors know exactly what each layer provides and expects.
- **Anticipatory fields justified**: No more "dead code" concerns about fields that exist for future layers.
- **Shadow Mode preserved**: The Evidence Engine has zero impact on the operational pipeline, enabling safe parallel development.

### Negative
- **Change cost**: Any modification to the frozen architecture requires an ADR with evidence and approval.
- **Linear constraint**: The strict linear dependency chain prevents optimization patterns (e.g., parallel fact building) without ADR.
- **Anticipatory field tax**: Fields like `evidenceId`, `knowledgeId`, `beliefId` must be maintained until their downstream layers are built.

---

## Related Documents

| Document | Relationship |
|----------|--------------|
| ADR-001 (Layered Architecture) | Evidence Engine lives in `src/lib/evidence/`, layered above Utils but below Services. |
| ADR-003 (Learning Domain) | Future Learning layer will build on the Evidence Engine's cognitive output. |
| ADR-004 (Service Boundaries) | Evidence Engine does not import any service layer module. |
| ADR-008 (Conversational Decision Architecture) | Complementary freeze — StrategyDecision governs operational decisions; Evidence Engine governs cognitive decisions. |
| `docs/architecture/ENGINES.md` | Evidence Engine category documentation. |
| `docs/architecture/knowledge-map.md` | How cognitive knowledge fits into the broader knowledge landscape. |
| `docs/project/CHANGELOG.md` | Implementation history (PR-2C through PR-3E). |
| `docs/architecture/PR-7A_LEARNING_ONTOLOGY_AUDIT.md` | Ontología de lenguajes cognitivos (hecho/tendencia/prescripción) — fundamento para Pattern Discovery y Goals. |
| `src/lib/evidence/` | All source code for the frozen pipeline. |
| `tests/unit/evidence/` | 378 tests across 19 files enforcing the frozen contracts. |

---

*Authority: This ADR is accepted and the Evidence Engine is officially in ARCHITECTURE FREEZE as of 2026-07-13.*
