# Capability Map — AITOS

> What the system can do, organized by business capability rather than code module.
> Use this document to answer: "Can AITOS handle X?"

---

## 1. Capability vs module

A capability is something the business can do. A module is a file or service
that implements it.

This document focuses on capabilities because the implementation changes over
time. A capability map stays stable even when files are refactored.

| Capability | Modules involved (today) |
|------------|--------------------------|
| Receive WhatsApp messages | `webhook/route.ts`, `sender.ts` |
| Classify intent | `core.ts` |
| Resolve locations | `location-resolver.ts`, `geo-engine.ts` |
| Calculate price | `pricing-engine.ts`, `tariff-resolver.ts` |
| Assign drivers | `dispatch.service.ts`, `dispatch-workflow.ts` |

---

## 2. Capability groups

### 2.1 Ingestion

Receiving input from the outside world.

| Capability | Status | Notes |
|------------|--------|-------|
| Receive WhatsApp text | Implemented | Production channel |
| Receive WhatsApp audio | Implemented | Transcribed via Gemini |
| Receive WhatsApp location | Implemented | Reverse geocoded via Nominatim |
| Receive WhatsApp image | Implemented | Caption or fallback |
| Validate webhook signature | Implemented | HMAC with WHATSAPP_APP_SECRET |
| Rate limit by phone | Implemented | 10 msg / 60s sliding window |
| Deduplicate messages | Implemented | `processed_messages` UNIQUE |
| Simulate conversations | Implemented | Admin `/api/bot/simulate` |

### 2.2 Understanding

Converting ambiguous input into structured meaning.

| Capability | Status | Notes |
|------------|--------|-------|
| Classify intent deterministically | Implemented | 12 intents in `core.ts` |
| Extract slots with triple fallback | Implemented | regex -> entity -> LLM |
| Detect language | Implemented | fast detection + session persistence |
| Resolve places to canonical DB entries | Implemented | alias -> exact -> fuzzy |
| Handle ambiguous locations | Implemented | numbered options + LLM interpretation |
| Detect frustration | Implemented | FRUSTRATION_RE + escalation |
| Detect lateral intents | Implemented | emergency, reschedule, post-service |
| Context-aware retry | Implemented | resolved slot informs unresolved slot |

### 2.3 Pricing

Calculating what the customer pays.

| Capability | Status | Notes |
|------------|--------|-------|
| Resolve tariff by specificity | Implemented | 4 resolution priorities |
| Apply commercial rules | Implemented | promotions, adjustments |
| Calculate multi-ride packages | Implemented | hub discounts |
| Handle missing tariff | Implemented | quote without price, human review |
| Tour and waiting rates | Implemented | `tours` and `waiting_rates` tables |
| Surge pricing | Partial | rules exist, not wired to engine |

### 2.4 Conversation management

Managing the dialogue state.

| Capability | Status | Notes |
|------------|--------|-------|
| Slot confirmation flow | Implemented | buttons + structured text |
| Passenger count confirmation | Implemented | `awaiting_passenger` state |
| Ambiguity resolution flow | Implemented | `ambiguity_pending` state |
| Re-engagement of stale leads | Implemented | 30 min timeout |
| Greeting + request combo | Implemented | dual-message pattern |
| Multilingual responses | In progress | i18n catalog ~135 strings |
| Context memory merge | Implemented | `context-memory.ts` |

### 2.5 Execution

Performing operations once the customer confirms.

| Capability | Status | Notes |
|------------|--------|-------|
| Create future reservation | Implemented | `RESERVA` flow |
| Create immediate trip | Implemented | `AHORA` flow |
| Trigger dispatch | Implemented | 4 escalation levels |
| Assign driver atomically | Implemented | optimistic lock |
| Handle driver response | Implemented | accept/reject/contingencia |
| Track trip lifecycle | Implemented | `trip_events` |
| Track dispatch lifecycle | Implemented | `dispatch_events` |
| Post-service survey | Implemented | survey.service.ts |

### 2.6 Fleet and dispatch

Matching trips to drivers.

| Capability | Status | Notes |
|------------|--------|-------|
| Filter drivers by tier | Implemented | tier 1/2/3 |
| Filter drivers by shift | Implemented | day/night |
| Filter drivers by country | Implemented | AR/BR/PY |
| Validate capacity | Implemented | max 6 passengers |
| Broadcast offers | Implemented | nivel_3 |
| Escalate unassigned trips | Implemented | idle -> nivel_1 -> nivel_2 -> nivel_3 -> waiting_driver |

### 2.7 Learning and optimization

Improving future decisions.

| Capability | Status | Notes |
|------------|--------|-------|
| Log operational events | Implemented | trip events, dispatch events |
| Score opportunities | Implemented | opportunity engine |
| Track fare outcomes | Implemented | fare learning engine |
| Calculate system load | Implemented | system-load.ts |
| Recalculate suggestions | Implemented | suggestion-recalculator.ts |
| Run evals | Implemented | 25-case dataset + runner |

### 2.8 Observability and control

Understanding and managing the running system.

| Capability | Status | Notes |
|------------|--------|-------|
| Error tracking | Implemented | Sentry (requires DSN) |
| Admin simulation | Implemented | `/api/bot/simulate` |
| Admin metrics | Implemented | `/api/bot/metrics` |
| Schema parity validation | Implemented | `validate-schema-parity` |
| Knowledge validation | Implemented | `validate-knowledge` |
| Architecture drift detection | Implemented | `detect-drift.ts` |
| Contract enforcement | Implemented | `ael/contracts/enforce.sh` |

---

## 3. Capability maturity

| Capability group | Maturity | Evidence |
|------------------|----------|----------|
| Ingestion | High | Production webhook, HMAC, rate limit, idempotency |
| Understanding | High | Deterministic core, ambiguity resolution, evals |
| Pricing | Medium-High | Tariff resolution works; surge not wired |
| Conversation | High | Full state machine, re-engagement, i18n in progress |
| Execution | High | Trip + dispatch + survey implemented |
| Fleet/Dispatch | High | 4-level escalation, atomic assignment |
| Learning | Medium | Events logged; feedback loops not fully closed |
| Observability | Medium | Sentry + metrics; dashboards limited |

---

## 4. Capability boundaries

AITOS does not currently provide:

- Real-time GPS tracking of vehicles.
- Automated payment collection.
- Calendar-based driver availability.
- General-purpose chat outside transportation.
- Cross-channel continuity (web + WhatsApp same session).

These are intentional boundaries, not missing features.

---

## 5. How capabilities map to code

This map is a living reference. To find the current implementation of a
capability, use `docs/architecture/system-map.md` or the reverse-engineering
graphs in `docs/architecture/reverse-engineering/`.

---

## 6. Relationship to other documents

| Document | Relationship |
|----------|--------------|
| `docs/architecture/engines.md` | Engine-level view of capabilities |
| `docs/architecture/system-map.md` | "If I need to modify X, look at Y" |
| `docs/architecture/knowledge-map.md` | Knowledge that enables capabilities |
| `docs/architecture/maturity-model.md` | How capabilities evolve |

---

*Last updated: 2026-07-06*
*Authority: source code, tests, and backlog*
