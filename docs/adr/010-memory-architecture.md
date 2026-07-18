# ADR 010: Cognitive Memory Architecture

**Status:** Accepted — **IMPLEMENTACIÓN EN CURSO 🟡 (IM-1)**  
**Date:** 2026-07-13  
**Driver:** PR-5 (Memory Layer — conceptual design, semantic contract, and integration audit)  
**IM-1:** 2026-07-14 — Implementation started per ATR-1 (TRANSICIÓN A IMPLEMENTACIÓN) and IM-0 scope definition.

> **⚠️ Histórico:** Originalmente DISEÑO FUTURO ⏳ (PR-11A, 2026-07-13). El pipeline real era EE → Shadow Observer (output descartado). A partir de IM-1 (2026-07-14), Memory está siendo implementada según el alcance definido en IM-0.

---

## PR-5A: Architectural Design

### Context

The Evidence Engine (ADR-009) provides a complete cognitive pipeline: Message → Signal → Observation → Fact → Evidence → Knowledge → Belief → Decision. This pipeline runs in Shadow Mode, producing a `ShadowResult` that exists transiently in memory per turn. The next cognitive generation requires a persistence layer that bridges the cognitive pipeline to operational continuity across turns.

**Memory** is the first post-pipeline cognitive layer. It does not transform, enrich, or infer. It preserves.

### Problem Statement

The system currently has no mechanism to persist the cognitive output of a completed turn. The `ShadowResult` is built and discarded within the same request. The existing operational memory (`src/lib/services/memory/memory.ts`) is session-based context tracking (intent, entities, slots) — it is NOT a cognitive preservation layer.

Without a cognitive Memory layer (in the future design):
- Pattern Discovery has no historical data to analyze
- Cross-turn cognitive continuity is impossible
- The Evidence Engine's output is ephemeral

### Decision

Create a **Cognitive Memory** layer that preserves the completed cognitive cycle (Belief + Decision pair) as an immutable, append-only snapshot per conversation turn.

**Memory (futuro) runs AFTER the cognitive turn closes.** It is NOT part of the Evidence Engine pipeline. It does NOT produce cognition. It only preserves historical output.

### Inputs, Outputs, Responsibilities

| Aspect | Definition |
|--------|-----------|
| **Input** | Completed `ShadowResult` (Belief + Decision entities) + `conversationId` (partition key) |
| **Output** | Immutable `MemorySnapshot` persisted to storage |
| **Responsibility** | Preserve the cognitive state of each completed turn for downstream consumption by **Pattern Discovery** (futuro) |
| **Primary consumers** | Pattern Discovery (pattern extraction) — futuro |
| **NOT responsible for** | Producing cognition, enriching data, inferring patterns, affecting the pipeline, operational decisions |

### Boundaries

- **Memory does NOT depend on operational layers** (services, database facade for chat sessions, etc.)
- **Memory depends ONLY on** Belief + Decision (the last two layers of the Evidence Engine)
- **Memory serves future consumers** (Pattern Discovery) — but does NOT import from them
- **Memory has NO operational state**, no cognitive authority, no feedback to the Evidence Engine

### Lifecycle

```
Turn N:
  1. Message received → ...
  2. Evidence Engine runs (Shadow Mode) → ShadowResult with Belief + Decision
  3. Memory.store(belief, decision, conversationId) → MemorySnapshot ✓
  4. Operational pipeline continues (unaffected)
  5. End of turn N

Turn N+1 (future):
  1. PatternDiscovery.read(window) → MemorySnapshot[]
```

### Differentiation from Existing Operational Memory

| Aspect | Existing `buildMemory` (SessionMemory) | New Cognitive Memory |
|--------|---------------------------------------|---------------------|
| **Source** | ChatSessionRow + MessageRow (DB) | Belief + Decision (Evidence Engine) |
| **Content** | intent, entities, origin, destination, opportunity | observationValid, channel, readiness, missingInfo, facts |
| **Purpose** | Operational context for extraction/pipeline | Cognitive preservation for Reflection/Learning |
| **Volatility** | Per-session, mutable via upsert | Append-only, immutable per turn |
| **Consumer** | Core, extraction, comprehension | Pattern Discovery (futuro) |
| **Epistemic level** | Pre-cognitive (operational) | Post-cognitive (historical) |

### Differentiation from Knowledge/Belief/Decision

| Aspect | Knowledge | Belief | Decision | Memory |
|--------|-----------|--------|----------|--------|
| **Epistemic stance** | "sabe que" | "cree que" | "decide que" | "preserva que" |
| **Pipeline position** | Inside EE (stage 5) | Inside EE (stage 6) | Inside EE (stage 7) | After EE (post-turn) |
| **Mutability** | Immutable (in-memory) | Immutable (in-memory) | Immutable (in-memory) | Immutable (persisted) |
| **Volatility** | Ephemeral | Ephemeral | Ephemeral | Persistent |
| **Transform** | Consolidates | Interprets | Determines | Freezes |
| **Single turn?** | Yes | Yes | Yes | Yes (append-only across turns) |

### Dependencies

```
┌─────────────────────┐
│    Evidence Engine   │  (Frozen — ADR-009)
│  Belief → Decision   │
└────────┬────────────┘
         │ depends on
         ▼
┌─────────────────────┐
│       Memory         │  ← You are here (PR-5 — diseño futuro ⏳)
│  (persistence layer) │
└────────┬────────────┘
         │ serves (futuro)
         ▼
┌────────────────────────────┐
│   Pattern Discovery (PR-7)  │  (Diseño futuro — requiere implementación)
└────────────────────────────┘
```

Memory depends ONLY on Belief + Decision. It does NOT import from the full Evidence Engine barrel.

### Persistence Rules

- Append-only: one snapshot per completed cognitive turn
- Partition key: `conversationId` — exclusively for data isolation
- Immutable: once written, a snapshot is never modified
- Monotonic: snapshots accumulate in temporal order
- No enrichment: Memory does NOT add, derive, or infer new fields
- No defaults: every field in the snapshot MUST come from Belief or Decision, with the exception of metadata fields (memoryId, conversationId, turnNumber, storedAt) which are generated by Memory

### Risks

| ID | Risk | Severity | Status |
|----|------|----------|--------|
| R1 | Memory written before EE completes | High | Mitigated by invariant M-3 (no feedback) + orchestration (store only after Decision built) |
| R2 | `conversationId` used as semantic key instead of partition key | Medium | Mitigated by ADR-010 field rules: conversationId is partition-only |
| R3 | Semantic confusion with existing `SessionMemory` | Medium | Mitigated by naming convention (CognitiveMemorySnapshot vs SessionMemory) |
| R4 | Storage coupling (Memory forces DB dependency) | Medium | Mitigated by abstract persistence interface; storage is implementation detail |
| R5 | Silent projection drift (stored fields diverge from EE fields) | Low | Mitigated by snapshot field belonging rules (PR-5B) |
| R6 | `receivedAt` (Belief field) confused with `createdAt` (snapshot timestamp) | Low | Mitigated by explicit field naming + M-14 (temporal domain separation) |
| R7 | `missingInfo` growth over time interpreted as pattern by Pattern Discovery | Low | Accepted — Pattern Discovery's responsibility to interpret correctly |
| R8 | Semantic drift by enrichment (Memory adds inferred fields) | Low | Accepted — enforced by invariant M-9 (no enrichment) |

---

## PR-5B: Semantic Contract Audit

### Memory Snapshot Definition

A Memory snapshot is an immutable record of one completed cognitive turn. Its atomic unit is the **Belief + Decision pair** — both must be present for the snapshot to be valid.

### Atomic Unit

```
MemorySnapshot = {
  // Partition key (not semantic)
  // NOTE: This conversationId is the OPERATIONAL conversation ID from the orchestrator
  // (conversation.id from lead.service.ts). It is the partition key for storage and
  // MUST NOT be confused with belief.conversationId which is the EE's cognitive
  // identification of the conversation (may differ or be null).
  conversationId: string,

  // Snapshot metadata (M-14: temporal domain separation)
  memoryId: string,       // UUID v4, unique per snapshot
  turnNumber: number,     // Monotonic within conversation
  storedAt: Date,         // When Memory wrote the snapshot (NOT when EE ran)

  // Belief fields (11 belong)
  belief: {
    id: string,
    observationValid: boolean,
    channel: string | null,
    hasContent: boolean,
    receivedAt: string | null,      // from EE (timestamp of original message)
    conversationId: string | null,   // from EE (cognitive identification — may differ from partition key)
    isWellFormed: boolean,
    factCount: number,
  },

  // Decision fields (11 belong)
  decision: {
    id: string,
    validInput: boolean,
    hasContent: boolean,
    readiness: 'ready' | 'partial' | 'invalid',
    missingInfo: readonly string[],
    isDecided: boolean,
    factCount: number,
  },
}
```

### Field Belonging Rules

**11 fields BELONG to the snapshot:**
1. `conversationId` — partition key (operational conversationId from orchestrator, NOT belief.conversationId)
2. `memoryId` — snapshot identifier (generated by Memory)
3. `turnNumber` — monotonic counter (computed by Memory)
4. `storedAt` — timestamp of storage action (NOT receivedAt)
5. `belief.id` — Belief identifier
6. `belief.observationValid` — epistemic stance
7. `belief.channel` — communication channel
8. `belief.hasContent` — content presence
9. `belief.receivedAt` — original message timestamp
10. `belief.conversationId` — original conversation identifier
11. `belief.isWellFormed` — completeness flag
12. `belief.factCount` — fact count
13. `decision.id` — Decision identifier
14. `decision.validInput` — input validity
15. `decision.hasContent` — content presence
16. `decision.readiness` — cognitive readiness level
17. `decision.missingInfo` — auto-diagnosed absent fields
18. `decision.isDecided` — readiness shortcut
19. `decision.factCount` — fact count from Decision perspective

**14 fields are EXCLUDED from the snapshot:**
(Fields from intermediate EE layers that Memory must NOT preserve)
1. `signal.rawContent` — raw message content (operational, not cognitive)
2. `signal.metadata` — contextual metadata (not part of cognitive stance)
3. `observation.status` — intermediate validation (absorbed by Belief)
4. `observation.validatedAt` — intermediate timestamp (absorbed by temporal chain)
5. `facts[]` — individual fact propositions (represented by factCount, detail in Decision.facts)
6. `evidence.provenance` — reserved for future Memory trace (circular)
7. `evidence.createdAt` — intermediate timestamp
8. `knowledge.observationStatus` — absorbed by Belief.observationValid
9. `knowledge.evidenceId` — internal reference, irrelevant post-persist
10. `knowledge.isFullyConsolidated` — absorbed by Belief.isWellFormed
11. `belief.knowledgeId` — internal reference, irrelevant post-persist
12. `decision.beliefId` — internal reference, irrelevant post-persist
13. `decision.facts` — individual Fact objects (represented by factCount)
14. `decision.createdAt` — Decision timestamp (Memory uses storedAt, per M-14)

**Rule:** Any excluded field that becomes necessary for a downstream consumer (Pattern Discovery, futuro) requires a new ADR with evidence.

### Deduplication Analysis

> ⏳ Todos los consumidores listados son diseño futuro — ninguno existe como implementación.

| Downstream Layer (futuro) | Potential Duplication | Verdict |
|--------------------------|----------------------|---------|
| **Pattern Discovery** | Reads Memory snapshots for pattern extraction | No duplication — Memory stores, Pattern Discovery analyzes. Different responsibilities. |
| **SessionMemory** | Tracks slots, intent, entities per session | No duplication — SessionMemory is operational (mutates per turn). Memory is cognitive (append-only per turn). Different purposes. |

**Verdict:** 0 duplication with downstream layers.

### Invariants (14 total) — ⏳ Diseño futuro

> **Clasificación PR-11A:** Cada invariante se clasifica como **✅ verificable hoy** (principio de diseño aplicable sin implementación) o **⏳ requiere implementación** (depende de código, datos o infraestructura).

| ID | Invariant | Verificable hoy | Dependencia |
|----|-----------|:---------------:|-------------|
| **M-1** | Append-only — snapshots are never deleted or updated | ⏳ requiere implementación | Persistence layer |
| **M-2** | Read-only during EE execution — Memory is not queried while the pipeline runs | ⏳ requiere implementación | Orchestration sequence |
| **M-3** | No feedback to EE — Memory output never reaches EE layers | ✅ principio de diseño | Architectural boundary |
| **M-4** | Full turn only — snapshot is written only after Belief + Decision are both complete | ⏳ requiere implementación | `ShadowResult.isComplete` check |
| **M-5** | Immutable — once persisted, a snapshot's content never changes | ✅ patrón universal | Persistence layer + Object.freeze |
| **M-6** | Partitioned by conversation — `conversationId` is the sole partition key | ⏳ requiere implementación | Storage schema |
| **M-7** | Monotonic — turnNumber increases by exactly 1 per snapshot per conversation. Obtained by reading the last stored turnNumber for the same conversationId and incrementing by 1. For the first turn, turnNumber = 1. | ⏳ requiere implementación | Counter logic |
| **M-8** | Atomic snapshot — a snapshot contains EXACTLY one Belief + one Decision pair | ⏳ requiere implementación | Construction rule |
| **M-9** | No enrichment — Memory never adds, derives, transforms, or infers fields | ✅ principio de diseño | Code audit |
| **M-10** | Projection stability — persisted fields must match EE fields at time of snapshot | ⏳ requiere implementación | Field belonging rules |
| **M-11** | No operational state — Memory has no internal state, cache, or runtime | ✅ principio de diseño | Architectural design |
| **M-12** | No defaults — every field in the snapshot comes from Belief or Decision, with the exception of metadata fields (memoryId, conversationId, turnNumber, storedAt) which are generated by Memory | ⏳ requiere implementación | Construction rule |
| **M-13** | No delta precomputation — Memory does NOT compute diffs between consecutive snapshots | ✅ principio de diseño | Architectural boundary (Pattern Discovery's job) |
| **M-14** | Temporal domain separation — `storedAt` (Memory time) distinct from `receivedAt` (EE time) | ✅ principio de diseño | Field naming + documentation |

### New Risks (from PR-5B audit)

| ID | Risk | Severity | Status |
|----|------|----------|--------|
| **R9** | `timestamp` vs `receivedAt` confusion — implementor uses `storedAt` as if it were `receivedAt` | Medium | Mitigated by M-14 + explicit field naming |
| **R10** | Silent projection drift — EE field changes without Memory snapshot contract update | Low | Mitigated by M-10 + freeze: EE is frozen (ADR-009), Memory must be updated if EE changes |
| **R11** | Memory written before EE completes — attempted during EE execution | High | Mitigated by M-3 + orchestration: Memory.store() runs AFTER runShadowCognition() returns |
| **R13** | `missingInfo` growth over turns interpreted as degradation by Pattern Discovery | Low | Accepted — Pattern Discovery must distinguish persistent missingInfo from turn-specific |
| **R14** | Ontologic identity confusion with SessionMemory — developer conflates cognitive Memory with operational session | Medium | Mitigated by naming convention + ADR-010 documentation |

---

## PR-5C: Integration Contract with the Orchestrator (Diseño Futuro ⏳)

### Problem

The cognitive Memory layer (futuro) must integrate with the existing `lead.service.ts` orchestrator without:
1. Violating the Evidence Engine Architecture Freeze (ADR-009) — no modifications to `src/lib/evidence/`
2. Breaking the Shadow Mode pattern — zero operational impact
3. Creating coupling between the cognitive pipeline and operational services
4. Conflicting with the existing operational `buildMemory()` / `SessionMemory`

### Current Orchestration Flow (lead.service.ts, lines 76–90)

```
┌─────────────────────────────────────────────────────────┐
│  76: // ── ZONE: COGNITIVE SHADOW MODE ──               │
│  82: if (isEvidenceShadowModeEnabled()) {               │
│  83:   runShadowCognition({ text, phone, conversationId });│  ← output descartado
│  84: }                                                   │
│  85:                                                     │
│  86: // ── ZONE: MEMORY + COMPREHENSION + EXTRACTION ──  │
│  87: const session = await getChatSession(phone);        │
│  88: const memory = buildMemory(session, history);      │  ← operacional, NO cognitiva
│  89: const leadCore = core(text, ...);                   │
│  90: ...                                                  │
└─────────────────────────────────────────────────────────┘

**Problem:** `runShadowCognition()` returns a `ShadowResult` but the return value is currently **discarded**. The `buildMemory()` at line 88 is operational session memory, NOT cognitive Memory.

### Integration Point (diseño futuro — no implementado)

```
┌────────────────────────────────────────────────────────────┐
│  82: if (isEvidenceShadowModeEnabled()) {                   │
│  83:   const shadowResult = runShadowCognition({...});      │  ← Capture (was discard)
│  84: }                                                      │
│  85:                                                        │
│  86: // ── ZONE: COGNITIVE MEMORY PERSISTENCE ──            │
│  87: // After EE completes, before operational pipeline     │
│  88: if (isMemoryShadowModeEnabled() && shadowResult?.isComplete) {│
│  89:   memoryService.store(                                 │
│  90:     shadowResult.belief!,                              │
│  91:     shadowResult.decision!,                            │
│  92:     conversation.id,                                   │
│  93:   );                                                   │
│  94: }                                                      │
│  95:                                                        │
│  96: // ── ZONE: MEMORY + COMPREHENSION + EXTRACTION ──     │
│  97: const session = await getChatSession(phone);           │
│  98: const memory = buildMemory(session, history);         │
│  99: ...                                                     │
└────────────────────────────────────────────────────────────┘
```

**Rationale for this position:**
- **AFTER** `runShadowCognition()` completes → ensures the full cognitive cycle finished (M-4: full turn only)
- **BEFORE** `buildMemory()` + operational pipeline → preserves the cognitive state before any operational transformation
- **Same feature flag pattern** → `isMemoryShadowModeEnabled()` mirrors `isEvidenceShadowModeEnabled()`
- **No EE modification** → `src/lib/evidence/` is untouched
- **No operational impact** → Memory.store() is fire-and-forget, never throws

### Data Flow

```
runShadowCognition(input)
  │
  ├──► ShadowResult (captured, not discarded)
  │     ├── .belief      → MemorySnapshot.belief.*
  │     ├── .decision    → MemorySnapshot.decision.*
  │     ├── .isComplete  → guard: must be true to store
  │     └── (other fields) → NOT forwarded to Memory (per M-9, M-12)
  │
  ├──► memoryService.store(belief, decision, conversationId)
  │     ├── Uses conversationId as partition key (M-6)
  │     ├── Generates memoryId + turnNumber + storedAt
  │     ├── Projection: only 19 fields from the belonging rules
  │     ├── Never throws (Shadow Mode pattern)
  │     └── No enrichment (M-9)
  │
  └──► Operational pipeline continues (unaffected)
```

### Contract Rules

| Rule | Description | Enforcement |
|------|-------------|-------------|
| **C1** | Memory.store() receives ONLY `Belief` + `Decision` objects, NOT the full ShadowResult | Type signature |
| **C2** | Memory.store() is called ONLY after `shadowResult.isComplete === true` | Guard clause |
| **C3** | Memory.store() NEVER throws — uses try-catch internally | Builder pattern |
| **C4** | Memory.store() runs synchronously or fire-and-forget; never blocks the operational pipeline | Async pattern |
| **C5** | Memory does NOT import from `@/lib/evidence` barrel; it imports only `Belief` and `Decision` types | Import restriction |
| **C6** | Feature flag `COGNITIVE_MEMORY_ENABLED` (env var, default `false`) mirrors `EVIDENCE_SHADOW_MODE` | Feature flag |
| **C7** | `memoryService.store()` is the sole entry point — no other function writes to Memory | Architectural boundary |
| **C8** | Memory does NOT read from operational DB (chat_sessions, etc.) — only writes cognitive snapshots | Data source restriction |
| **C9** | `conversationId` used EXCLUSIVELY as partition key — never for semantic lookup, filtering by meaning, or cross-conversation analysis. Sorting and range queries within the same conversationId are permitted (they are structural, not semantic). | Field usage rule |
| **C10** | Memory implementation lives in `src/lib/memory/` (NOT `src/lib/evidence/`, NOT `src/lib/services/memory/`) | Directory isolation |

### Interaction with Existing `buildMemory()`

| Aspect | `buildMemory()` (operational) | `memoryService.store()` (cognitive) |
|--------|------------------------------|-------------------------------------|
| **Location** | `src/lib/services/memory/memory.ts` | `src/lib/memory/memory-service.ts` |
| **Source** | ChatSessionRow + MessageRow (DB) | Belief + Decision (EE in-memory) |
| **Timing** | After EE, before extraction | After EE, before operational memory |
| **Persistence** | No (in-memory object) | Yes (persisted snapshot) |
| **Feature flag** | None (always runs) | `COGNITIVE_MEMORY_ENABLED` |
| **Failure mode** | Never throws | Never throws (builder pattern) |

The two systems coexist. They have different sources, different purposes, and different consumers. The naming (`buildMemory` vs `memoryService`) is intentionally distinct to prevent confusion.

### Integration Invariants

| ID | Invariant | Source |
|----|-----------|--------|
| **I1-MEM** | Memory.store() runs iff `COGNITIVE_MEMORY_ENABLED=true` AND `shadowResult.isComplete` | C6 + C2 |
| **I2-MEM** | Memory.store() never blocks the operational pipeline beyond a configurable timeout | C4 |
| **I3-MEM** | No field from `ShadowResult` reaches Memory except those in `Belief` and `Decision` | C1 + M-9 |
| **I4-MEM** | Memory implementation is independent of `src/lib/evidence/` — no circular dependency | C5 |
| **I5-MEM** | Memory.store() produces exactly one snapshot per successful call | M-8 |
| **I6-MEM** | All 14 Memory invariants (M-1 through M-14) hold at the integration point | Design compliance |

### Verification Criteria (for future implementation PR)

- ✅ `isMemoryShadowModeEnabled()` returns `false` by default
- ✅ `memoryService.store()` never throws (wraps errors in log)
- ✅ Integration does NOT modify any file under `src/lib/evidence/`
- ✅ Integration does NOT modify existing `buildMemory()` behavior
- ✅ `runShadowCognition()` return value captured (was discarded)
- ✅ Feature flag `COGNITIVE_MEMORY_ENABLED` documented in env vars
- ✅ All 14 Memory invariants verifiable in code or tests
- ✅ Build compiles with zero regressions

---

## File Map (Conceptual — Future Implementation)

```
src/lib/memory/
├── index.ts              # Public API barrel export
├── types.ts              # MemorySnapshot, MemoryStore types
├── memory-service.ts     # store() entry point
├── memory-snapshot.ts    # MemorySnapshot entity
├── build-snapshot.ts     # Snapshot builder (Belief + Decision → Snapshot)
└── memory-storage.ts     # Persistence abstraction (interface)
```

---

## Consequences (Diseño Futuro ⏳)

### Positive
- **Clear integration point**: Memory.connect() is well-defined and isolated (futuro)
- **EE Freeze respected**: No modifications to the frozen Evidence Engine
- **Zero operational impact**: Shadow Mode pattern preserved end-to-end
- **Disambiguation**: Cognitive Memory is clearly separated from operational SessionMemory
- **Foundation for Pattern Discovery**: Memory provides the historical data Pattern Discovery needs (futuro)
- **14 invariants guard design integrity**: Every aspect of Memory is constrained

### Negative
- **Conceptual-only**: No implementation exists; integration contract is aspirational until coded
- **Operational `buildMemory()` not removed**: Two parallel "memory" systems coexist until a future consolidation
- **`COGNITIVE_MEMORY_ENABLED` flag tax**: Another environment variable to maintain (futuro)
- **`runShadowCognition()` return value is currently discarded**: Implementation PR must capture it

---

## Related Documents

| Document | Relationship |
|----------|--------------|
| ADR-009 (Evidence Engine Architecture) | Frozen pipeline that Memory depends on (futuro) |
| ADR-001 (Layered Architecture) | Memory lives in `src/lib/memory/`, above Evidence but below Services |
| ADR-003 (Learning Domain) | Existing operational Learning (NOT cognitive Pattern Discovery) |
| ADR-004 (Service Boundaries) | Memory does NOT import any service layer module |
| `docs/certification/EVIDENCE_ONTOLOGY.md` | Memory entity added to ontology |
| `src/lib/services/memory/memory.ts` | Existing operational memory (NOT cognitive Memory) |
| `src/lib/services/lead.service.ts` | Orchestrator where Memory would integrate (futuro) |
| `src/lib/evidence/run-shadow-cognition.ts` | Evidence Engine orchestrator that produces ShadowResult |
| `src/lib/evidence/shadow-result.ts` | ShadowResult container with Belief + Decision |

---

*Authority: This ADR describes a **diseño futuro ⏳** (conceptual). No code changes are authorized by this ADR. Implementation requires a separate PR with code, tests, and verification. Actualizado en PR-11A: clasificación de invariantes, renombramiento de consumidores, marcación explícita como futuro.*
