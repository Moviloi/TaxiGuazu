# Decision Architecture — AITOS

> How the system decides what to do next.
> This document explains the decision pipeline, the decision types, and the gates
> that prevent incorrect execution.

---

## 1. The decision hierarchy

Decisions in AITOS are layered. Each layer narrows the space of possible
actions.

```
Layer 1: Intent        (What does the user want?)
Layer 2: Output type   (What kind of response?)
Layer 3: Policy        (What exactly should happen?)
Layer 4: Execution     (Which side effects?)
```

A message must pass through all four layers before any action is taken.
Skipping a layer is an architectural violation.

---

## 2. Layer 1 — Intent classification

`core.ts` deterministically classifies the user's intent.

### Intents

| Intent | Meaning | Example trigger |
|--------|---------|-----------------|
| `GREETING` | Greeting or introduction | "hola", "buenas" |
| `BOOKING` | Future reservation request | "quiero reservar para mañana" |
| `NOW` | Immediate dispatch request | "necesito un auto ahora" |
| `RESCHEDULE` | Change an existing trip | "cambiar la hora" |
| `CONSULTA` | Question about service | "tienen sillas para bebés?" |
| `COMMERCIAL` | Commercial negotiation | "me hacen precio?" |
| `INFORMATIONAL` | General information | "donde queda cataratas" |
| `EMERGENCY` | Urgent lateral | "perdí mi valija" |
| `POST_SERVICE` | After-trip lateral | "ya llegué" |
| `PRE_BOOKING` | Before booking exploration | "cuánto sale" |
| `AMBIGUOUS` | Low confidence | Mixed or unclear signals |
| `UNKNOWN` | No intent detected | Nonsense or empty |

### Facts

Each intent is accompanied by facts:

| Fact | Example |
|------|---------|
| `origin` | "aeropuerto" |
| `destination` | "centro" |
| `passengers` | "4" |
| `datetime` | "mañana 9am" |
| `mode` | "AHORA" |
| `greeting` | true |
| `location_ambiguous` | true |

Source: `src/lib/ai/core.ts`, `src/lib/ai/types.ts`.

---

## 3. Layer 2 — Output type routing

`router.ts` maps the `CoreDecision` to an `OutputType`.

```
CoreDecision
      |
      v
+------------+
|   ROUTER   |
+------------+
      |
      +---> EXECUTE       (perform operation)
      +---> ANSWER        (respond with information)
      +---> CLARIFY       (ask a question)
      +---> SAFE_FALLBACK (low confidence recovery)
```

The router is a pure function. It has no side effects and no LLM dependency.
This means routing is fast, testable, and deterministic.

Source: `src/lib/ai/router.ts`.

---

## 4. Layer 3 — Policy

`policy-pipeline.ts` is the gate. It receives the routed decision and the
operational context, then produces a `PolicyOutput`.

### Inputs

- `FinalDecision` from router
- Extracted slots + confidence
- Pricing result
- Conversational state
- Session memory

### Outputs

- `finalResponse`: the message to send
- `needsGeo`: whether location resolution is required
- `needsSaveContext`: whether to persist context
- `needsAdminNotify`: whether to alert an operator
- `confirmationUI`: whether to show confirmation buttons
- `tripId`: if a trip was created
- `dispatch`: if dispatch was triggered

### Policy modes

| Mode | Decides |
|------|---------|
| `AHORA` | Immediate dispatch: execute fast, minimize back-and-forth |
| `RESERVA` | Future reservation: confirm details before committing |
| `CONSULTA` | Answer question using operational knowledge |
| `INFO` | General response without operational side effects |

Source: `src/lib/services/workflow/policy-pipeline.ts`,
`src/lib/ai/policy-ahora.ts`, `src/lib/ai/policy-reserva.ts`.

---

## 5. Layer 4 — Execution

If policy decides `EXECUTE`, the system performs side effects:

- Create or update a trip.
- Trigger dispatch (for `NOW`).
- Store a reservation (for `BOOKING`).
- Log events for learning.
- Notify admin if required.

Execution never happens without policy approval.

Source: `src/lib/services/trip-execution/trip-execution.service.ts`,
`src/lib/services/trip-execution/now-execution.service.ts`.

---

## 6. Decision gates

Several gates prevent incorrect execution.

### Comprehension gate

`comprehension.ts` evaluates how well the system understood the message.

```
FULL_CONTROL    -> system understood everything
CLARIFICATION   -> one detail is missing
RECOVERY        -> several details are missing, but intent is clear
ESCALATION      -> system cannot understand; human needed
```

If comprehension is `ESCALATION`, policy stops and routes to human escalation.

Source: `src/lib/services/extraction/comprehension.ts`,
`src/lib/services/extraction/comprehension-runner.ts`.

### Confidence gate

Each slot has a confidence score. Slots below threshold trigger clarification.

| Confidence | Behavior |
|------------|----------|
| High | Use directly |
| Medium | Ask for confirmation |
| Low | Treat as ambiguous |

Source: `src/lib/services/extraction/confidence.ts`.

### Slot confirmation gate

Before executing, the system confirms the operational slots with the customer.

```
origin + destination resolved
        |
        v
price calculated
        |
        v
passengers confirmed
        |
        v
awaiting_confirmation
        |
        v
EXECUTE on affirmation
```

Source: `src/lib/ai/slot-confirmation.ts`,
`src/lib/services/workflow/slot-workflow.ts`.

### Fleet gate

Before dispatch, the system checks that a vehicle can handle the trip.

```
passengers <= 6?
origin/destination in supported country?
driver available?
```

If not, the system escalates to a human.

Source: `src/lib/services/dispatch/fleet-validation.ts`.

---

## 7. Fallback chains

Decisions degrade gracefully when components fail.

### AI fallback

```
Gemini -> Groq -> deterministic template -> safe null
```

### Extraction fallback

```
regex -> entity -> LLM -> empty slots
```

### Pricing fallback

```
place->place -> place->zone -> zone->place -> zone->zone -> no price
```

### Comprehension fallback

```
FULL_CONTROL -> CLARIFICATION -> RECOVERY -> ESCALATION
```

Each fallback is a deliberate design choice, not an accident.

---

## 8. Decision examples

### Example 1: Direct quote

User: "cuanto sale del aeropuerto al centro"

1. Intent: `PRE_BOOKING`
2. Facts: origin="aeropuerto", destination="centro"
3. Router: `ANSWER`
4. Policy: resolve locations, calculate price, respond with quote
5. Execution: none

### Example 2: Immediate dispatch

User: "necesito un auto ya desde el hotel hasta el aeropuerto"

1. Intent: `NOW`
2. Facts: origin="hotel", destination="aeropuerto", mode="AHORA"
3. Router: `EXECUTE`
4. Policy: confirm slots, check fleet, create trip, trigger dispatch
5. Execution: trip created, dispatch initiated

### Example 3: Ambiguous location

User: "voy al centro"

1. Intent: `BOOKING`
2. Facts: destination="centro", `location_ambiguous: true`
3. Router: `CLARIFY`
4. Policy: present numbered place options
5. Execution: none; wait for user selection

### Example 4: Escalation

User: "no entiendo por qué no me responden"

1. Intent: `AMBIGUOUS`
2. Facts: frustration detected
3. Router: `SAFE_FALLBACK` or `ESCALATION`
4. Policy: notify admin with context
5. Execution: human handoff

---

## 9. Why decisions are deterministic where possible

The system uses deterministic rules for:

- Intent classification
- Output type routing
- Slot confirmation logic
- State machine transitions
- Tariff resolution
- Dispatch escalation

It uses probabilistic AI only for:

- Natural language understanding when regex/entity fails
- Ambiguity resolution among multiple candidates
- Response wording refinement

This split keeps the system testable, fast, and safe.

---

## 10. Invariants

1. **Policy decides before output generates.** No message bypasses policy.
2. **Intent before response.** The system always classifies before replying.
3. **Decision before generation.** The system decides what to do before choosing words.
4. **Execution requires explicit policy approval.** `EXECUTE` is not inferred from text.

Source: `docs/ai/INVARIANTS.md`.

---

## 11. Relationship to other documents

| Document | Relationship |
|----------|--------------|
| `docs/architecture/operational-model.md` | The model that decisions operate on |
| `docs/ai/DECISION_TREE.md` | Runtime decision tree for agents |
| `docs/ai/ARCHITECTURE_BIBLE.md` | Canonical rules and invariants |
| `docs/architecture/engines.md` | Engine-level decision responsibilities |

---

*Last updated: 2026-07-06*
*Authority: source code, ADRs, and tests*
