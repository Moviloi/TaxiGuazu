# Knowledge Map — AITOS

> Where knowledge lives, how it is organized, and who owns each kind.
> This document is a map of the system's memory, not a list of facts.

---

## 1. Types of knowledge

AITOS manages several kinds of knowledge. Each kind has a different owner,
lifetime, and update frequency.

| Type | Owner | Lifetime | Update frequency |
|------|-------|----------|------------------|
| Commercial knowledge | Business | Months/years | Manual |
| Operational knowledge | Operations team | Months | Manual |
| Geographic knowledge | Geo team | Years | Manual |
| Policy knowledge | Product/AI team | Weeks | Manual |
| Runtime state | System | Minutes/hours | Automatic |
| Learned knowledge | System | Continuous | Automatic |
| Architectural knowledge | Engineering | Permanent | ADR-driven |

---

## 2. Commercial knowledge

What the business charges and under what conditions.

### Location

- `data/knowledge/commercial/calendar.json`
- `data/knowledge/commercial/surge-rules.json`
- `src/lib/services/pricing/*`
- `src/lib/db/domains/tariffs.ts`

### Contents

- Tariffs between places and zones.
- Holidays, seasons, and surge rules.
- Promotions and provider adjustments.
- Multi-ride hub discounts.

### Update pattern

Commercial knowledge is edited by humans and validated by tests.
Price changes must not require code deployment if they live in data files;
tariff changes in the database are applied through the CRUD or seed scripts.

---

## 3. Operational knowledge

How the business runs day to day.

### Location

- `data/knowledge/ops/operations.json`
- `data/knowledge/ops/migration.json`
- `data/knowledge/ops/pricing-rules.json`
- `src/lib/ai/taxiguazu-knowledge.ts` (loader)

### Contents

- Service descriptions and policies.
- Border crossing procedures.
- Fleet rules and capacity limits.
- Practical information for customers.

### Update pattern

Operational knowledge is extracted from prompts and code into JSON files.
This makes it editable without changing TypeScript or prompts.

---

## 4. Geographic knowledge

Where places are and what they are called.

### Location

- `data/knowledge/geo/places.json`
- `data/knowledge/geo/borders.json`
- `data/knowledge/geo/attractions.json`
- `src/lib/ai/iguazu-knowledge.ts` (loader)
- `src/lib/db/domains/geo.ts`
- Tables: `places`, `aliases`, `zones`

### Contents

- Canonical places with coordinates and zones.
- Aliases in Spanish, Portuguese, and English.
- Border crossing points.
- Tourist attractions and practical info.

### Update pattern

Geo knowledge is partially static (JSON) and partially dynamic (database).
New places and aliases are added to the database. Static context used in prompts
lives in JSON files.

---

## 5. Policy knowledge

How the system should behave in different situations.

### Location

- `data/knowledge/policies/reserva.json`
- `data/knowledge/policies/ahora.json`
- `data/knowledge/policies/escalation.json`
- `src/lib/ai/policy-reserva.ts`
- `src/lib/ai/policy-ahora.ts`
- `src/lib/services/extraction/comprehension-runner.ts`

### Contents

- Decision rules for RESERVA and AHORA modes.
- Frustration and escalation patterns.
- Admin notification templates.
- Response priorities.

### Update pattern

Policy rules are extracted from code into JSON for documentation and versioning.
The code still enforces the rules; the JSON is the readable source.

---

## 6. Runtime state

What the system knows about the current conversation and trip.

### Location

- `chat_sessions` — session slots and conversational state
- `conversations` — conversation metadata
- `messages` — message history
- `trips` — confirmed trips
- `dispatch_events` — dispatch lifecycle
- `connection_state` — rate limits, flags, transient state

### Contents

- Current slot values.
- Conversational state.
- Trip status and assigned driver.
- Rate-limit counters.
- Re-engagement flags.

### Update pattern

Runtime state is read and written automatically by the orchestrator and services.
It is request-scoped or session-scoped.

---

## 7. Learned knowledge

What the system learns from outcomes.

### Location

- `src/lib/services/learning/event-tracking.ts`
- `src/lib/services/learning/opportunity-engine.ts`
- `src/lib/services/learning/fare-learning-engine.ts`
- `src/lib/services/learning/suggestion-recalculator.ts`
- Tables: `learning_events`, `opportunities`, `trip_events`

### Contents

- Event history (trip created, driver assigned, completed, cancelled).
- Opportunity acceptance rates.
- Fare adjustment signals.
- Suggestion effectiveness.

### Update pattern

Learned knowledge is produced automatically by operational events.
It is read by the opportunity engine and fare learner to improve future
recommendations.

---

## 8. Architectural knowledge

Why the system is built the way it is.

### Location

- `docs/adr/` — Architecture Decision Records
- `docs/ai/ARCHITECTURE_BIBLE.md` — canonical rules for AI agents
- `docs/SYSTEM_BIBLE.md` — non-technical constitution
- `docs/architecture/` — all architecture documents
- `.opencode/memory/MEMORY.md` — anchored project memory

### Contents

- Permanent decisions.
- Invariants and principles.
- Known limitations and debt.
- Patterns and failure modes.

### Update pattern

Architectural knowledge is updated by engineers when decisions change.
ADRs are immutable once accepted; new decisions supersede old ones with a new
ADR.

---

## 9. Knowledge flow

```
Static knowledge (JSON + DB)
      |
      v
AI prompts and policy rules
      |
      v
Runtime extraction and decisions
      |
      v
Operational events
      |
      v
Learned knowledge
      |
      v
Opportunities and fare adjustments (feedback loop)
```

---

## 10. Knowledge ownership matrix

| Knowledge | Authoritative source | Edited by | Consumed by |
|-----------|---------------------|-----------|-------------|
| Prices | `tariffs` table + commercial JSON | Operations | Pricing engine |
| Places | `places` + `aliases` tables | Geo team | Geo engine |
| Service rules | `data/knowledge/ops/` | Product | Policy, prompts |
| Calendar/surge | `data/knowledge/commercial/` | Business | Pricing engine |
| Policies | `data/knowledge/policies/` | AI/Product | Policy layer |
| Session state | `chat_sessions` | System | Lead, memory |
| Trip state | `trips` + `dispatch_events` | System | Trip, dispatch |
| Learned weights | `learning_events` | System | Opportunity engine |

---

## 11. Anti-patterns

| Anti-pattern | Why it hurts | Correct path |
|--------------|-------------|--------------|
| Hardcoded prices in code | Requires deployment to change price | Use tariffs table or commercial JSON |
| Inline policies in if/else | Hard to review, inconsistent | Extract to `data/knowledge/policies/` |
| Place aliases in code | Cannot scale to new languages/places | Use `aliases` table |
| Heuristic ranking in SQL | Violates ADR-005 | Return raw candidates; let LLM interpret |
| Learned weights without events | Untraceable decisions | Log every learning event |

---

## 12. Relationship to other documents

| Document | Relationship |
|----------|--------------|
| `docs/architecture/operational-model.md` | How runtime knowledge is structured |
| `docs/architecture/decision-architecture.md` | How knowledge becomes decisions |
| `docs/architecture/capability-map.md` | What the system can do with this knowledge |
| `docs/adr/003-learning-domain.md` | Learning as first-class domain |
| `docs/adr/005-ai-first-interpretation.md` | AI-first interpretation over heuristics |

---

*Last updated: 2026-07-06*
*Authority: source code, data files, and database schema*
