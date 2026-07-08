# Design Principles — AITOS

> Principles derived from the code, with examples of how they are applied.
> These are not abstract ideals; they are observable patterns in the system.

---

## 1. Deterministic core, probabilistic edge

**Principle:** Classify, route, price, and dispatch deterministically. Use AI
only where ambiguity requires interpretation.

**Why:** Deterministic code is fast, testable, and fails predictably. AI is a
powerful fallback but an unreliable authority.

**Example:** `core.ts` classifies intent with regex and heuristics, not with an
LLM call.

```typescript
// src/lib/ai/core.ts
// Intent is detected by pattern matching, not by an LLM.
const intent = detectIntent(text);
```

The LLM is invoked later, only when extraction or response refinement needs it.

---

## 2. Policy decides before output generates

**Principle:** No response or action is produced without passing through the
policy layer.

**Why:** This prevents the LLM or any single engine from inventing actions.

**Example:** `lead.service.ts` always calls `handlePolicyPipeline()` before
building the final response.

```typescript
// src/lib/services/lead.service.ts
const policyOutput = await handlePolicyPipeline({
  coreDecision,
  extraction,
  pricing,
  workflow,
});
// Only policyOutput contains the response and side-effect metadata.
```

---

## 3. Operational model over conversation history

**Principle:** The business truth is the slot model, not the chat log.

**Why:** The same trip can be described in many ways. Slots make intent
portable across languages and channels.

**Example:** `chat_sessions.slots` stores origin, destination, passengers, and
price as structured data.

```typescript
// Conceptual representation of chat_sessions.slots
{
  origin: { value: "Aeropuerto IGR", placeId: "ar_igr_airport", status: "CONFIRMED" },
  destination: { value: "Hotel Amerian", placeId: "ar_amerian", status: "CONFIRMED" },
  passengers: { value: 4, status: "CONFIRMED" },
  price: { value: 45000, currency: "ARS" }
}
```

---

## 4. Triple fallback

**Principle:** Critical paths must have at least three layers: fast path,
heuristic/DB path, LLM path, and a safe null.

**Why:** External dependencies fail. The system must degrade gracefully.

**Example:** `extract-slots.ts` tries regex, then entity extraction, then LLM,
then returns empty slots.

```typescript
// src/lib/services/extraction/extract-slots.ts (conceptual)
let slots = extractWithRegex(text);
if (!slots.origin || !slots.destination) {
  slots = await extractWithEntity(text);
}
if (!slots.origin || !slots.destination) {
  slots = await extractWithLLM(text);
}
return slots ?? createEmptySlots();
```

---

## 5. Phone as identity

**Principle:** The WhatsApp phone number is the primary identity. There are no
anonymous sessions.

**Why:** Transportation is a high-trust service. The phone links the customer
to their trips, payments, and support history.

**Example:** `chat_sessions.phone` is the primary key.

```sql
-- src/lib/db/core/connection.ts
CREATE TABLE chat_sessions (
  phone TEXT PRIMARY KEY,
  slots TEXT,
  state TEXT,
  lang TEXT
);
```

---

## 6. Facade over raw database access

**Principle:** All services access the database through `database.ts`. No
service calls `getDb().execute()` directly.

**Why:** A single facade enforces consistency, typing, and testability.

**Example:** A service imports from the facade, not from a domain file.

```typescript
// Correct
import { findPlaceByAlias } from "@/lib/db/database";

// Incorrect — architectural violation
import { findPlaceByAlias } from "@/lib/db/domains/geo";
```

Known violations are documented as debt (DEBT-09).

---

## 7. Request-scoped state isolation

**Principle:** Each request has its own context. State must not leak between
concurrent requests.

**Why:** Serverless functions handle many requests in parallel. Shared module
state causes race conditions.

**Example:** `guard.ts` previously had module-level state. It was removed.
State is now passed explicitly or reset per request.

```typescript
// src/lib/ai/guard.ts
// Module-level state removed. Request state is reset per message.
export function resetRequestState() {
  // No-op: state is now explicitly passed or request-local.
}
```

---

## 8. Event log as source of learning

**Principle:** Every significant operational action emits an event. Events are
the input to learning.

**Why:** Without events, learning is guesswork. With events, decisions can be
measured and improved.

**Example:** Trip state transitions emit `trip_events`.

```typescript
// src/lib/services/trip-execution/trip-execution.service.ts (conceptual)
await insertTripEvent({
  tripId,
  eventType: "TripDriverAssigned",
  payload: { driverPhone, assignedAt }
});
```

---

## 9. Fail safe, not fail loud

**Principle:** When something fails, the system should degrade to a safe state,
not crash.

**Why:** A crashed webhook returns 500 and triggers retries. A safe fallback
returns a useful response or a human handoff.

**Example:** If both LLM providers fail, `llm-provider.ts` returns `null`, and
the caller uses a deterministic template.

```typescript
// src/lib/ai/llm-provider.ts (conceptual)
const response = await primary.generate(prompt)
  .catch(() => fallback.generate(prompt))
  .catch(() => null);
```

---

## 10. Explicit over implicit

**Principle:** State transitions, dependencies, and decisions must be visible
in the code.

**Why:** Implicit behavior is hard to debug and dangerous to change.

**Example:** Slot transitions are validated explicitly.

```typescript
// src/lib/services/workflow/slot-workflow.ts
export const VALID_SLOT_TRANSITIONS: Record<ConversationalState, ConversationalState[]> = {
  idle: ["collecting_slots"],
  collecting_slots: ["slot_confirmation", "ambiguity_pending"],
  // ...
};

export function canTransition(from: ConversationalState, to: ConversationalState) {
  return VALID_SLOT_TRANSITIONS[from]?.includes(to) ?? false;
}
```

---

## 11. Layered dependency direction

**Principle:** Higher layers import lower layers. Lower layers never import
higher layers.

**Why:** Circular dependencies make the system impossible to reason about.

**Example:** The dependency order is:

```
Config / Utils
      |
      v
Persistence (DB Facade)
      |
      v
AI / WhatsApp
      |
      v
Services
      |
      v
Lead Orchestrator
      |
      v
API Routes
```

Source: `docs/adr/001-layered-architecture.md`.

---

## 12. Language is data, not code

**Principle:** Translatable strings belong in catalogs and data files, not
hardcoded in logic.

**Why:** Business rules should not require code changes for a new translation.

**Example:** The i18n catalog in `src/lib/services/i18n/catalog.ts` separates
strings from policy logic.

```typescript
// src/lib/services/i18n/catalog.ts (conceptual)
export const catalog = {
  confirm: {
    summary: {
      es: "¿Confirmás el traslado de {origin} a {destination}?",
      pt: "Confirma o traslado de {origin} para {destination}?",
      en: "Confirm the transfer from {origin} to {destination}?"
    }
  }
};
```

---

## 13. Principle interactions

These principles reinforce each other:

- Deterministic core + policy gate = safe automation.
- Triple fallback + fail safe = resilience.
- Operational model + events = measurable learning.
- Facade + layered direction = maintainable code.

Violating one principle usually weakens others.

---

## 14. When to break a principle

Principles are strong defaults, not absolute laws. Break one only if:

1. The change is recorded in an ADR or decision record.
2. The violation is explicitly documented as technical debt.
3. The team understands the trade-off and accepts the risk.

---

## 15. Relationship to other documents

| Document | Relationship |
|----------|--------------|
| `docs/ai/ARCHITECTURE_BIBLE.md` | Canonical rules for agents |
| `docs/architecture/fractal-architecture.md` | Patterns that emerge from these principles |
| `docs/adr/001-layered-architecture.md` | Layering decision |
| `docs/adr/005-ai-first-interpretation.md` | AI-first interpretation principle |

---

*Last updated: 2026-07-06*
*Authority: source code and ADRs*
