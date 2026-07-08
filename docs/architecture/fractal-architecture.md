# Fractal Architecture — AITOS

> The same architectural patterns appear at many scales.
> Recognizing them makes the system easier to learn, refactor, and extend.

---

## 1. What is fractal architecture?

A fractal architecture is one where the same structural pattern repeats at
different levels of zoom.

In AITOS, the same decision-exec-fallback pattern appears in:

- A single function (extract slots)
- A service (pricing)
- A request (lead lifecycle)
- The whole system (channel -> AI -> services -> persistence)

Once you see the pattern, you can predict how an unfamiliar part of the code
behaves.

---

## 2. Pattern 1 — Triple fallback

> Fast deterministic -> heuristic/DB -> LLM -> safe null

### At micro scale: slot extraction

```
regex/entity -> fuzzy entity -> LLM -> empty slots
```

Source: `src/lib/services/extraction/extract-slots.ts`.

### At meso scale: location resolution

```
exact alias -> exact name -> fuzzy match -> ambiguity
```

Source: `src/lib/services/geo/location-resolver.ts`.

### At macro scale: AI provider

```
Gemini -> Groq -> deterministic template
```

Source: `src/lib/ai/llm-provider.ts`.

### At system scale: comprehension

```
FULL_CONTROL -> CLARIFICATION -> RECOVERY -> ESCALATION
```

Source: `src/lib/services/extraction/comprehension.ts`.

---

## 3. Pattern 2 — State machine

> Define valid states. Only valid transitions are allowed.

### At micro scale: slot status

```
RAW -> INFERRED -> CONFIRMATION_PENDING -> CONFIRMED
```

Source: `src/lib/ai/slot-state.ts`.

### At meso scale: conversational state

```
idle -> collecting_slots -> slot_confirmation -> awaiting_passenger
  -> awaiting_confirmation -> executing -> pending_human_review
```

Source: `src/lib/services/workflow/slot-workflow.ts`.

### At macro scale: trip lifecycle

```
DRAFT -> QUOTED -> CONFIRMED -> ASSIGNED -> IN_PROGRESS -> CLOSED
```

Source: `src/lib/db/types.ts`.

### At system scale: dispatch lifecycle

```
idle -> nivel_1 -> nivel_2 -> nivel_3 -> waiting_driver -> closed
```

Source: `src/lib/services/dispatch/dispatch-workflow.ts`.

---

## 4. Pattern 3 — Policy gate

> Decide before acting. Decide before speaking.

### At micro scale: slot confirmation

A slot is not used until it is confirmed or stable.

Source: `src/lib/ai/slot-confirmation.ts`.

### At meso scale: policy-pipeline

Every response passes through `handlePolicyPipeline()`.

Source: `src/lib/services/workflow/policy-pipeline.ts`.

### At macro scale: lead.service

The orchestrator calls CORE, then ROUTER, then POLICY, then optionally LLM.

Source: `src/lib/services/lead.service.ts`.

### Pattern statement

```
Input -> Classify -> Decide -> Gate -> Execute/Respond
```

---

## 5. Pattern 4 — Request-scoped isolation

> Each request gets its own context. Do not leak state between requests.

### At micro scale: extraction context

`ExtractionContext` carries slots, confidence, and workflow state for one turn.

Source: `src/lib/ai/extraction-prompt.ts`.

### At meso scale: guard reset

`resetRequestState()` clears request-scoped state at the start of each message.

Source: `src/lib/ai/guard.ts`, `src/lib/services/lead.service.ts`.

### At macro scale: webhook handler

Each webhook request is processed independently, with its own idempotency key.

Source: `src/app/api/whatsapp/webhook/route.ts`.

### Anti-pattern

Module-level variables shared between concurrent requests. This was present in
`guard.ts` and was removed (DEBT-03).

---

## 6. Pattern 5 — Facade over complexity

> Expose a stable interface; hide internal fragmentation.

### At micro scale: database.ts

`database.ts` is a facade over `db/core/`, `db/domains/`, and `db/types/`.

Source: `src/lib/db/database.ts`.

### At meso scale: pricing dual track

`pricing-engine.ts` hides the v2/v3 pricing complexity behind a stable result.

Source: `src/lib/services/pricing/pricing-engine.ts`.

### At macro scale: lead.service

`lead.service.ts` is the single orchestrator that hides the complexity of
fourteen engines from the API routes.

Source: `src/lib/services/lead.service.ts`.

---

## 7. Pattern 6 — Event as audit trail

> Every significant action produces an event.

### At micro scale: trip events

`trip_events` records created, assigned, reconfirmed, completed, cancelled.

Source: `src/lib/services/trip-execution/trip-execution.service.ts`.

### At meso scale: dispatch events

`dispatch_events` records offered, broadcasted, accepted, abandoned, contingency.

Source: `src/lib/services/dispatch/dispatch.service.ts`.

### At macro scale: learning events

`learning_events` records opportunities, suggestions, and outcomes.

Source: `src/lib/services/learning/event-tracking.ts`.

### Pattern statement

```
Action -> Event -> Learning -> Improved future action
```

---

## 8. Pattern 7 — Separation of conversation and operation

> The conversation is a channel. The operation is the truth.

### At micro scale: slots vs messages

`chat_sessions.slots` stores the operational truth.
`messages` stores the conversation history.

### At meso scale: state machines

Conversational state manages turn flow.
Trip state manages execution.

### At macro scale: architecture

The AI layer handles language.
The services layer handles operations.

This separation allows the same operational logic to be driven by WhatsApp,
a web form, or an API call.

---

## 9. Why fractals matter

1. **Faster onboarding.** New engineers recognize patterns instead of memorizing files.
2. **Safer refactoring.** A change that respects the fractal pattern is unlikely to break the system.
3. **Easier extension.** New features can reuse the same structural templates.
4. **Clearer reviews.** Reviewers can ask: "Does this follow the triple fallback pattern? Does it pass through a policy gate?"

---

## 10. Pattern checklist for new features

When adding a new feature, verify that it follows the established patterns:

- [ ] Does it use triple fallback where uncertainty exists?
- [ ] Does it define valid states and transitions?
- [ ] Does it pass through a policy gate before execution or response?
- [ ] Does it isolate request-scoped state?
- [ ] Does it expose a facade if internal complexity is high?
- [ ] Does it emit events for significant actions?
- [ ] Does it keep conversation separate from operational truth?

---

## 11. Relationship to other documents

| Document | Relationship |
|----------|--------------|
| `docs/architecture/design-principles.md` | Principles behind the patterns |
| `docs/ai/ARCHITECTURE_BIBLE.md` | Canonical rules for agents |
| `docs/architecture/engines.md` | Where patterns appear in engines |

---

*Last updated: 2026-07-06*
*Authority: source code and ADRs*
