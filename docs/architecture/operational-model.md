# Operational Model — AITOS

> The heart of the system: how human language becomes a transportation operation.
> This document explains the model that sits between the conversation and the database.

---

## 1. The central idea

Every customer message is an attempt to change the operational state.

The operational state is not the chat history. It is a small, structured model
of what the customer wants: a trip from A to B, for N passengers, at time T,
paying price P.

This model is called the **slot model**.

```
Conversation
      |
      v
Intent + Facts (CORE)
      |
      v
Slot Model (operational truth)
      |
      v
Policy Decision
      |
      +---> Response to customer
      +---> Trip / Dispatch / Learning
```

Source: `src/lib/services/lead.service.ts`, `src/lib/ai/core.ts`,
`src/lib/services/extraction/extraction-runner.ts`,
`src/lib/services/workflow/policy-pipeline.ts`.

---

## 2. The slot model

A trip is represented by a set of slots.

| Slot | Domain | Example value |
|------|--------|---------------|
| `origin` | Geo | `{ value: "Aeropuerto IGR", placeId: "ar_igr_airport" }` |
| `destination` | Geo | `{ value: "Hotel Amerian", placeId: "ar_amerian" }` |
| `passengers` | Integer | `4` |
| `scheduled_at` | Timestamp | `2026-07-07T09:30:00-03:00` |
| `price` | Money | `{ final_price: 45000, currency: "ARS" }` |
| `vehicle_type` | Enum | `standard` |
| `flight` | String | `"AR 1234"` |

Each slot progresses through a lifecycle of certainty:

```
RAW          -> value detected by regex/entity/LLM, not yet validated
INFERRED     -> validated against the geo/pricing model
CONFIRMATION_PENDING -> value is known, waiting for explicit customer confirmation
CONFIRMED    -> customer accepted or the system has enough evidence
USER_CORRECTED -> customer changed a previously confirmed value
USER_CONFIRMED -> customer explicitly approved the final value
```

Source: `src/lib/ai/slot-state.ts`, `src/lib/ai/extraction-schema.ts`.

---

## 3. Why slots are the truth

The same trip can be described in many ways:

- "I need a ride from the airport to the Amerian"
- "Desde IGR hasta el hotel Amerian"
- "Aeropuerto Puerto Iguazu -> Amerian"
- "Cheguei no aeroporto, vou pro hotel"

All of these map to the same slot model:

```
origin = Aeropuerto IGR
destination = Hotel Amerian
passengers = unknown
scheduled_at = now (if AHORA) or future (if RESERVA)
```

By translating language into slots, the system separates **what the customer
means** from **how they say it**. This separation is what allows AITOS to be
multilingual, robust to typos, and independent of the conversation channel.

---

## 4. Conversational state vs operational state

There are two kinds of state, and confusing them is a common source of bugs.

### Conversational state

Describes where the dialogue is. It is about turn management.

```
idle -> collecting_slots -> slot_confirmation -> awaiting_passenger
  -> awaiting_confirmation -> executing -> pending_human_review
```

A customer can be in `slot_confirmation` while the operational slots are
complete. The state tells the system what question to ask next; the slots tell
it what trip to build.

Source: `src/lib/services/workflow/slot-workflow.ts`, `src/lib/db/state-accessors.ts`.

### Operational state

Describes the trip itself. It is stored in `chat_sessions.slots` and in the
trip tables.

| Operational record | Storage | Purpose |
|--------------------|---------|---------|
| Draft slots | `chat_sessions.slots` | Work in progress during conversation |
| Confirmed trip | `trips` | Binding commitment to execute |
| Dispatch state | `dispatch_events` | Assignment lifecycle |
| Driver state | `drivers` | Fleet eligibility |

The conversational state can be lost and rebuilt from the operational state.
The opposite is not true.

---

## 5. The conversation-to-operation pipeline

### 5.1 Receive

A message arrives via WhatsApp webhook or simulation endpoint.
The system validates HMAC, rate limit, and idempotency before processing.

Source: `src/app/api/whatsapp/webhook/route.ts`.

### 5.2 Classify

`core.ts` deterministically classifies the intent of the message.

Intents include:

- `BOOKING` / `NOW` / `RESCHEDULE` — operational requests
- `GREETING` / `INFORMATIONAL` / `CONSULTA` — informational
- `EMERGENCY` / `POST_SERVICE` — laterals that bypass the normal flow
- `AMBIGUOUS` / `UNKNOWN` — low confidence

Source: `src/lib/ai/core.ts`, `src/lib/ai/types.ts`.

### 5.3 Extract

`extraction-runner.ts` converts text into slot candidates.

It uses a triple fallback:

```
regex/entity extraction
        |
        v
fuzzy entity + database lookup
        |
        v
LLM extraction (Gemini -> Groq -> null)
        |
        v
empty slots (safe null)
```

Source: `src/lib/services/extraction/extract-slots.ts`,
`src/lib/services/extraction/extraction-runner.ts`.

### 5.4 Resolve

Geo resolves free-text places to canonical places in the database.

```
exact alias match -> exact name match -> fuzzy match (Levenshtein <= 3) -> ambiguity
```

If a term matches multiple places ("centro" matches 7 places), the system
enters ambiguity resolution.

Source: `src/lib/services/geo/location-resolver.ts`,
`src/lib/services/workflow/ambiguity-handler.ts`.

### 5.5 Price

Pricing resolves tariffs by specificity:

```
place -> place
place -> zone
zone  -> place
zone  -> zone
not_found
```

Then commercial rules apply: promotions, provider adjustments, hub discounts
for multi-ride packages.

Source: `src/lib/services/pricing/tariff-resolver.ts`,
`src/lib/services/pricing/resolve-pricing-for-slots.ts`,
`src/lib/services/pricing/commercial-pricing-engine.ts`.

### 5.6 Decide

`policy-pipeline.ts` decides whether to execute, answer, or clarify.

Inputs:

- CoreDecision (intent + facts)
- Extracted slots + confidence
- Pricing result
- Conversational state

Outputs:

- `FinalDecision`: outputType (`EXECUTE`, `ANSWER`, `CLARIFY`, `SAFE_FALLBACK`)
- `PolicyOutput`: response + metadata

No message is sent without passing through policy.

Source: `src/lib/services/workflow/policy-pipeline.ts`.

### 5.7 Render

The response builder generates text in the customer's language.
The LLM can refine wording, but it cannot change the decision.

Source: `src/lib/ai/response-builder.ts`, `src/lib/ai/llm-response.ts`.

### 5.8 Execute

If the decision is `EXECUTE`, the system creates or updates a trip, triggers
dispatch, or stores a reservation.

Source: `src/lib/services/trip-execution/trip-execution.service.ts`,
`src/lib/services/trip-execution/now-execution.service.ts`.

---

## 6. State machines in the operational model

### 6.1 Trip lifecycle

```
DRAFT -> QUOTED -> CONFIRMED -> ASSIGNED -> IN_PROGRESS -> CLOSED
```

Each transition is triggered by an explicit event:

| Transition | Trigger |
|------------|---------|
| DRAFT -> QUOTED | Price calculated |
| QUOTED -> CONFIRMED | Customer confirms |
| CONFIRMED -> ASSIGNED | Driver assigned |
| ASSIGNED -> IN_PROGRESS | Driver starts trip |
| IN_PROGRESS -> CLOSED | Trip completed or cancelled |

Source: `src/lib/db/types.ts`, `src/lib/services/trip-execution/trip-execution.service.ts`.

### 6.2 Dispatch lifecycle

```
idle -> nivel_1 -> nivel_2 -> nivel_3 -> waiting_driver -> closed
```

Each level increases the pool of drivers and reduces the timeout:

| Level | Timeout | Action |
|-------|---------|--------|
| nivel_1 | 60 min | Offer to primary driver |
| nivel_2 | 30 min | Offer to secondary driver |
| nivel_3 | 8 min  | Broadcast to all eligible drivers |
| waiting_driver | 3 min | Trip is unscheduled, broadcast immediately |

Source: `src/lib/services/dispatch/dispatch-workflow.ts`,
`src/lib/services/dispatch/dispatch.service.ts`.

### 6.3 Conversational lifecycle

```
idle -> collecting_slots -> slot_confirmation -> awaiting_passenger
  -> awaiting_confirmation -> executing -> pending_human_review
```

State transitions are guarded by `VALID_SLOT_TRANSITIONS`. Invalid transitions
are rejected.

Source: `src/lib/services/workflow/slot-workflow.ts`.

---

## 7. Persistence rules

The operational model is persisted in layers:

1. **Session slots** live in `chat_sessions.slots` while the conversation is active.
2. **Confirmed trips** live in `trips`.
3. **Dispatch events** live in `dispatch_events`.
4. **Learning events** live in `trip_events`, `learning_events`, and opportunity tables.

The phone number is the identity. There are no anonymous sessions.

Source: `src/lib/db/core/connection.ts`, `src/lib/db/state-accessors.ts`.

---

## 8. Error handling in the operational model

| Problem | Operational behavior |
|---------|----------------------|
| Missing origin | Ask "Where from?" |
| Missing destination | Ask "Where to?" |
| Ambiguous place | Present numbered options |
| No tariff | Quote without price; send to human review |
| No driver | Escalate levels; notify admin if all fail |
| LLM timeout | Use deterministic template |
| Invalid transition | Log and recover to `idle` or `collecting_slots` |

Every error is mapped to a conversational action.

---

## 9. Invariants

1. **A trip cannot be confirmed without origin and destination.**
2. **A price cannot be fabricated.** If no tariff exists, the price slot remains empty.
3. **A response cannot bypass policy.** Every output is gated by `policy-pipeline.ts`.
4. **The LLM cannot write to the database.** It only produces strings and structures.
5. **The phone is the identity.** Sessions are keyed by phone.

Source: `docs/ai/INVARIANTS.md`.

---

## 10. Relationship to other documents

| Document | Relationship |
|----------|--------------|
| `docs/SYSTEM_BIBLE.md` | Why the operational model exists |
| `docs/architecture/decision-architecture.md` | How decisions are made on top of the model |
| `docs/architecture/knowledge-map.md` | Where the knowledge that feeds the model lives |
| `docs/architecture/domains/trip.md` | Deep dive into trip domain |
| `docs/architecture/domains/session.md` | Deep dive into session domain |
| `docs/architecture/domains/pricing.md` | Deep dive into pricing domain |
| `docs/architecture/domains/geo.md` | Deep dive into geo domain |
| `docs/architecture/domains/dispatch.md` | Deep dive into dispatch domain |

---

*Last updated: 2026-07-06*
*Authority: source code, ADRs, and database schema*
