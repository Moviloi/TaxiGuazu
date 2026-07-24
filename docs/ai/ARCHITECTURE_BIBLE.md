# Architecture Bible — AI Transportation Operating System (AITOS)

> **Read after the Constitution.**
> This document is a derived technical reference for the AI Transportation Operating System.
> The supreme normative authority is the AITOS Constitution (`docs/architecture/AITOS_CONSTITUTION.md`).
> Every AI agent must read the Constitution first, then this document, before modifying any code in this repository.
> If this document contradicts the Constitution, the Constitution prevails. If it contradicts the code, the code prevails.

---

## 1. What the system is

The AI Transportation Operating System (AITOS) is a production system that converts ambiguous human language — received primarily via WhatsApp — into executable transportation logistics operations.

It is **not** a chatbot.
It is **not** a WhatsApp bot.
It is an operating system whose current primary channel happens to be WhatsApp.

The system performs these operations:

- Price quotes for transfers
- Future reservations (RESERVA)
- Immediate dispatch (AHORA)
- Multi-ride packages with hub discounts
- Driver assignment and escalation
- Real-time operational status tracking
- Post-service surveys
- Learning from outcomes to improve future decisions

Source: `src/lib/services/lead.service.ts`, `src/lib/ai/core.ts`, `src/lib/services/workflow/policy-pipeline.ts`

---

## 2. What must never break

The following invariants are non-negotiable. Any change that violates them must be rejected or accompanied by an explicit Architecture Decision Record (ADR).

### 2.1 Core invariants

| # | Invariant | Why it matters | Source |
|---|-----------|----------------|--------|
| 1 | **LLM is never the source of truth.** | The system must work when the LLM is unavailable, slow, or wrong. | `src/lib/ai/llm-provider.ts`, `src/lib/ai/handler.ts` |
| 2 | **Policy decides before Output generates.** | No response or action can occur without passing through the policy layer. | `src/lib/services/workflow/policy-pipeline.ts` |
| 3 | **Operational Model represents the truth, not the conversation.** | Slots (origin, destination, passengers, scheduled_at, price) are the canonical operational state. | `src/lib/db/state-accessors.ts`, `src/lib/ai/slot-state.ts` |
| 4 | **Phone is the primary identity.** | There are no anonymous sessions. The WhatsApp phone number is the identity provider. | `src/lib/db/core/connection.ts` (`chat_sessions.phone` PK) |
| 5 | **Conversation is not the business.** | The conversation is a channel. The business lives in the operational model, pricing, dispatch, and trip execution. | `src/lib/services/lead.service.ts` |
| 6 | **Deterministic Core, Probabilistic Edge.** | Classification, fact extraction, and routing must be deterministic. LLM and fuzzy matching live at the edges as fallbacks. | `src/lib/ai/core.ts`, `src/lib/ai/router.ts` |
| 7 | **Fail safe, not fail loud.** | Every external dependency has a fallback. The system degrades gracefully rather than crashing. | `src/lib/services/extraction/extract-slots.ts`, `src/lib/ai/llm-provider.ts` |
| 8 | **Intent before Response.** | The system always classifies intent before deciding what to say. | `src/lib/ai/handler.ts`, `src/lib/services/lead.service.ts` |
| 9 | **Context over History.** | Persistent slot context is preferred over full message history for decisions. | `src/lib/services/memory/context-memory.ts`, `src/lib/services/memory/memory.ts` |
| 10 | **Decision before Generation.** | The system decides what to do before generating natural language. | `src/lib/ai/handler.ts` flow: core → router → policy → (optional) LLM |

---

## 3. Architectural principles

These principles are derived from the code, not invented.

### 3.1 Layering

```
Config / Env
    ↓
Utils
    ↓
Persistence (DB Facade)
    ↓
AI (deterministic core)
    ↓
Services (domain engines)
    ↓
Lead (orchestrator)
    ↓
API Routes (thin HTTP adapters)
```

Source: `docs/adr/001-layered-architecture.md`, `docs/adr/002-database-facade.md`

### 3.2 Dependency direction

Services depend on each other in this order:

```
i18n  (leaf)
  ↓
Geo
  ↓
Memory / Pricing
  ↓
Learning
  ↓
Extraction
  ↓
Workflow
  ↓
Dispatch
  ↓
Trip-execution
  ↓
Admin / Housekeeping
  ↓
Lead (orchestrator)
```

Source: `docs/adr/004-service-boundaries.md`

### 3.3 Triple fallback

Critical paths implement three layers:

```
Fast deterministic → Heuristic/DB → LLM → Safe null/fallback
```

Examples:
- Extraction: `regex-extractor.ts` → `entity-extractor.ts` → `groq.ts` → empty slots
- LLM provider: `GeminiProvider` → `GroqProvider` → null
- Comprehension: `FULL_CONTROL` → `CLARIFICATION` → `RECOVERY` → `ESCALATION`
- Pricing: `place→place` → `place→zone/zone→place` → `zone→zone` → not_found

Source: `src/lib/services/extraction/extract-slots.ts`, `src/lib/ai/llm-provider.ts`, `src/lib/services/extraction/comprehension.ts`, `src/lib/services/pricing/tariff-resolver.ts`

### 3.4 Request-scoped state vs. session state

- **Request-scoped state** is reset at the start of every `handleLeadMessage` call (`resetRequestState()` in `src/lib/ai/guard.ts`).
- **Session state** is stored in `chat_sessions` keyed by phone and persists across turns.

Source: `src/lib/services/lead.service.ts`, `src/lib/db/core/connection.ts`

---

## 4. Responsibilities of each layer

### 4.1 Config (`src/config/`)

- `env.ts`: validates environment variables at runtime using Zod. Lazy validation via `getEnv()`.
- `constants.ts`: business constants (timeouts, margins, thresholds).

### 4.2 Utils (`src/lib/utils/`)

- Pure functions with no project dependencies.
- `logger.ts`: structured logging with level filtering.
- `clamp.ts`: numeric clamping.

### 4.3 Persistence (`src/lib/db/`)

- `database.ts`: facade with 60+ exported functions. **All services must import from here only.**
- `core/connection.ts`: Turso/SQLite connection, schema, migrations.
- `domains/*.ts`: domain-specific queries. **Should not be imported by services** (known violations exist).
- `types.ts`: TypeScript row types.

Source: `docs/adr/002-database-facade.md`

### 4.4 AI (`src/lib/ai/`)

- `core.ts`: deterministic intent classification + fact extraction + roleLock + slotStability.
- `router.ts`: maps `CoreDecision` to `OutputType`.
- `handler.ts`: entry point for the AI pipeline (CORE → ROUTER → POLICY → optional LLM).
- `policy-ahora.ts` / `policy-reserva.ts`: business response templates.
- `response-builder.ts`: reusable message builders.
- `slot-state.ts`: slot status lifecycle.
- `llm-provider.ts` / `providers/`: LLM abstraction with fallback.
- `laterals/`: contextual enrichment without modifying core.

### 4.5 Services (`src/lib/services/`)

- `extraction/`: slot extraction, confidence, comprehension.
- `pricing/`: tariff resolution, price calculation, commercial rules.
- `geo/`: place resolution, reverse geocoding.
- `dispatch/`: driver offer, broadcast, assignment workflow.
- `workflow/`: conversation state machine, policy pipeline, commands.
- `trip-execution/`: trip creation, now execution, surveys.
- `learning/`: opportunity engine, fare learning, event tracking.
- `memory/`: session memory, predictive routing, context merge.
- `admin/`: admin notifications and commands.
- `i18n/`: language catalog and translation.
- `lead.service.ts`: top-level orchestrator. The only file that imports across service boundaries.

### 4.6 API Routes (`src/app/api/`)

- Thin HTTP handlers. No business logic.
- `whatsapp/webhook/route.ts`: receives Meta WhatsApp events (HMAC verification, rate limit, idempotency).
- `bot/simulate/route.ts`: admin simulation endpoint.
- `bot/*`: admin dashboard APIs.
- `cron/*`: scheduled job endpoints.

---

## 5. Prohibited dependencies

These are architectural rules, not suggestions.

| Prohibition | Correct path | Violations known |
|-------------|--------------|------------------|
| AI imports Services | AI may only import Utils, Config, DB Types, and i18n (transversal) | `lib/ai/response-builder.ts` imports `OpportunityResult` from learning (DEBT-07) |
| Services import `db/domains/*` directly | Import from `database.ts` facade | `services/learning/*.ts` bypass facade |
| Services import each other out of order | Follow ADR-004 order | Some cross-service imports in `lead.service.ts` are intentional orchestration |
| Routes contain business logic | Delegate to Lead/Services | Currently clean |
| Output layer decides business outcomes | Policy decides, Output renders | Currently clean |
| LLM writes directly to DB | LLM only returns strings/structures | Currently clean |

Source: `docs/adr/001-layered-architecture.md`, `docs/adr/004-service-boundaries.md`, `docs/architecture/reverse-engineering/architecture-graphs.json`

---

## 6. Permanent decisions

These decisions are encoded in ADRs and must be treated as permanent unless a new ADR explicitly overrides them.

1. **Layered architecture** (ADR-001)
2. **Database facade pattern** (ADR-002)
3. **Learning as first-class domain** (ADR-003)
4. **Service boundaries and dependency order** (ADR-004)
5. **AI-first interpretation with deterministic core** (ADR-005)
6. **Schema parity between code and DB** (ADR-006)

Source: `docs/adr/`

---

## 7. Patterns in use

### 7.1 Slot-state lifecycle

```
RAW → INFERRED → CONFIRMATION_PENDING → CONFIRMED
                    ↓ USER_CORRECTED / USER_CONFIRMED
```

Source: `src/lib/ai/slot-state.ts`

### 7.2 Conversational state machine

```
idle → collecting_slots → slot_confirmation → awaiting_passenger → awaiting_confirmation → pending_human_review
        ↓                      ↓                    ↓                      ↓
   ambiguity_pending      (back to collecting)  (back to collecting)   executing
```

Source: `src/lib/services/workflow/slot-workflow.ts`

### 7.3 Dispatch state machine

```
idle → nivel_1 → nivel_2 → nivel_3 → waiting_driver → closed
```

Source: `src/lib/services/dispatch/dispatch-workflow.ts`

### 7.4 Trip lifecycle

```
DRAFT → QUOTED → CONFIRMED → ASSIGNED → IN_PROGRESS → CLOSED
```

Source: `src/lib/db/types.ts`

---

## 8. Failure modes the system expects

The system is designed to handle these failures without human intervention:

| Failure | Mitigation | Source |
|---------|------------|--------|
| LLM timeout | Fallback provider; if both fail, policy template is used | `src/lib/ai/llm-provider.ts` |
| LLM returns malformed JSON | `safeParse` catches it; regex fallback activates | `src/lib/services/extraction/extraction-runner.ts` |
| Unknown location | Fuzzy matching → ambiguity resolution → human escalation | `src/lib/services/geo/location-resolver.ts`, `src/lib/services/workflow/ambiguity-handler.ts` |
| No tariff found | Price omitted; trip proceeds to human review | `src/lib/services/pricing/resolve-pricing-for-slots.ts` |
| Driver rejects offer | Escalate to next dispatch level | `src/lib/services/dispatch/dispatch.service.ts` |
| Rate limit hit | Return 429; Meta retries | `src/app/api/whatsapp/webhook/route.ts` |
| Duplicate webhook | Idempotency via `processed_messages` UNIQUE | `src/app/api/whatsapp/webhook/route.ts` |
| Invalid signature | Return 401 | `src/app/api/whatsapp/webhook/route.ts` |

---

## 9. How to modify this system safely

Before any change, answer these questions:

1. Does the change preserve the invariants in section 2?
2. Does the change follow the dependency order in section 3.2?
3. Does the change go through Policy before Output?
4. Does the change avoid making the LLM a required dependency?
5. Does the change avoid direct DB writes outside the facade?
6. Does the change avoid introducing circular dependencies?
7. Does the change update tests and documentation?
8. If it changes an ADR, has a new ADR been written?

If the answer to any of questions 1-6 is "no", the change must be rejected or redesigned.

---

## 10. Reading order for AI agents

After the Constitution (`docs/architecture/AITOS_CONSTITUTION.md`), read in this order:

1. `docs/ai/ARCHITECTURE_RULES.md` — strict rules
2. `docs/ai/ENGINE_CONTRACTS.md` — engine contracts
3. `docs/ai/INVARIANTS.md` — all invariants
4. `docs/ai/DECISION_TREE.md` — runtime decision tree
5. `docs/ai/QUALITY_GATE.md` — checklist for changes
6. `docs/ai/COMMON_FAILURES.md` — mistakes to avoid
7. `docs/architecture/glossary.md` — canonical terminology
8. `docs/adr/*.md` — architecture decisions
9. `docs/architecture/reverse-engineering/architecture-graphs.md` — dependency graphs

---

*Last updated: 2026-07-21*
*Authority: derived from the AITOS Constitution (`docs/architecture/AITOS_CONSTITUTION.md`). Source code, ADRs, and database schema are the technical ground truth.*
