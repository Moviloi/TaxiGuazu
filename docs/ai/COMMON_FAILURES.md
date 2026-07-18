# Common Failures — AITOS

> Mistakes that AI agents commonly make when modifying this system.
> Read this after the Architecture Bible and Rules.

---

## 1. Bypassing the policy engine

### The mistake

Sending a WhatsApp message directly from extraction, workflow, or a new service without going through `handlePolicyPipeline`.

### Why it breaks
- Violates invariant: Policy decides before Output generates.
- Side effects become scattered and untestable.
- Bypasses learning event tracking and admin notifications.

### Correct pattern
- Build an `ExtractionContext`.
- Call `handlePolicyPipeline()`.
- Let Policy call `sendAndPersist()`.

### Source
- `src/lib/services/workflow/policy-pipeline.ts`
- `src/lib/services/shared/message-helpers.ts`

---

## 2. Using the LLM for business logic

### The mistake

Letting the LLM decide whether to create a trip, assign a driver, or apply a price.

### Why it breaks
- Violates invariant: LLM is never the source of truth.
- LLM output is non-deterministic and untestable.
- Failures become unrecoverable.

### Correct pattern
- LLM extracts strings/entities only.
- Policy and pricing engines make decisions using deterministic rules and DB lookups.

### Source
- `src/lib/ai/handler.ts`
- `src/lib/services/pricing/tariff-resolver.ts`

---

## 3. Writing directly to the database

### The mistake

Importing `getDb()` or `db/domains/*` from a service or AI file instead of using the facade.

### Why it breaks
- Violates ADR-002 (database facade).
- Makes testing harder.
- Scatters query logic.

### Correct pattern
- Add the query to `src/lib/db/database.ts`.
- Import only `database.ts` from services.

### Source
- `docs/adr/002-database-facade.md`
- `src/lib/db/database.ts`

---

## 4. Losing previous slot state

### The mistake

Overwriting `chat_sessions.slots` with only the slots extracted in the current turn.

### Why it breaks
- Previous origin/destination/passengers disappear.
- Conversation regresses to collecting slots.
- User frustration: "ya te dije eso".

### Correct pattern
- Merge new extraction with previous slots.
- Only override when current message explicitly contradicts previous value.

### Source
- `src/lib/services/extraction/extraction-runner.ts` lines 433-444
- `src/lib/services/memory/context-memory.ts`

---

## 5. Duplicating pricing logic

### The mistake

Computing a price with custom logic in a new service instead of calling `resolvePricingForSlots()`.

### Why it breaks
- Prices become inconsistent.
- Promotions and adjustments are bypassed.
- Driver payout may be wrong.

### Correct pattern
- Always call `resolvePricingForSlots({ origin, destination, passengers })`.

### Source
- `src/lib/services/pricing/resolve-pricing-for-slots.ts`

---

## 6. Breaking the deterministic core

### The mistake

Adding LLM calls or DB lookups inside `core.ts`.

### Why it breaks
- `core()` is a pure, deterministic function.
- Tests depend on this property.
- Latency and failure modes change unpredictably.

### Correct pattern
- Keep `core()` regex-based and side-effect-free.
- Put fuzzy/LLM logic in extraction or laterals.

### Source
- `src/lib/ai/core.ts`

---

## 7. Ignoring session language

### The mistake

Generating responses without considering `session.lang` or `detectLangWithFallback()`.

### Why it breaks
- User receives response in wrong language.
- Breaks trust in multilingual operations.

### Correct pattern
- Pass `sessionLang` to policy and response builders.
- Use `detectLangWithFallback(text, session?.lang)`.

### Source
- `src/lib/detect-lang.ts`
- `src/lib/services/lead.service.ts`

---

## 8. Introducing circular dependencies

### The mistake

Making service A import service B while B already imports A.

### Why it breaks
- Runtime errors in Next.js.
- Harder to test and reason about.
- Violates ADR-004.

### Correct pattern
- Move shared logic to a lower-level service or util.
- Use the dependency order: i18n → Geo → Memory/Pricing → Learning → Extraction → Workflow → Dispatch → Trip-execution → Admin → Lead.

### Source
- `docs/adr/004-service-boundaries.md`
- `docs/architecture/reverse-engineering/architecture-graphs.json`

---

## 9. Treating conversation text as truth

### The mistake

Making decisions based on raw conversation history instead of normalized slots.

### Why it breaks
- Text is ambiguous and unstable.
- Operational state drifts from conversation state.

### Correct pattern
- Normalize user input into slots.
- Use `chat_sessions.slots` and `slot_states` as canonical state.

### Source
- `src/lib/ai/slot-state.ts`
- `src/lib/services/memory/context-memory.ts`

---

## 10. Forgetting idempotency

### The mistake

Adding a new webhook handler or async job that does not protect against duplicate execution.

### Why it breaks
- Duplicate charges.
- Duplicate trips.
- Duplicate messages.

### Correct pattern
- Use `processed_messages` for webhooks.
- Use UNIQUE constraints for operations that must run once.

### Source
- `src/app/api/whatsapp/webhook/route.ts`
- `src/lib/db/core/connection.ts`

---

## 11. Mutating slots from Output

### The mistake

Changing slot values inside response builders or sender functions.

### Why it breaks
- Output becomes stateful.
- Breaks separation of concerns.
- Makes reasoning impossible.

### Correct pattern
- Slots are read-only in Output.
- Changes happen in Extraction, Workflow, or Policy.

### Source
- `src/lib/ai/response-builder.ts`
- `src/lib/sender.ts`

---

## 12. Skipping comprehension checks

### The mistake

Adding a fast path that goes from CORE directly to Extraction/Policy without `runComprehensionCheck`.

### Why it breaks
- Low-confidence inputs may trigger incorrect operational actions.
- Removes the safety gate for first-turn escalation.

### Correct pattern
- Always call `runComprehensionCheck()` after `core()` in the main flow.

### Source
- `src/lib/services/extraction/comprehension-runner.ts`
- `src/lib/services/lead.service.ts`

---

## 13. Making env vars required unnecessarily

### The mistake

Adding `.min(1)` to a new env var that is not strictly required for the system to function.

### Why it breaks
- Deployments fail if the var is missing.
- Optional features become hard dependencies.

### Correct pattern
- Mark optional integrations as `.optional()`.
- Document required vars clearly.

### Source
- `src/config/env.ts`
- `.env.example`

---

## 14. Adding synchronous long-running operations

### The mistake

Adding blocking DB loops or external API calls inside the main request path.

### Why it breaks
- Vercel functions timeout (default 10-15s).
- User receives no response.

### Correct pattern
- Move long-running work to cron endpoints.
- Keep main webhook path under 5 seconds.

### Source
- `src/app/api/cron/*`
- `src/lib/timeouts.ts`

---

## 15. Forgetting to update AI Context Pack

### The mistake

Changing invariants, contracts, or rules without updating `docs/ai/`.

### Why it breaks
- Future AI agents act on stale documentation.
- Documentation drifts from code.

### Correct pattern
- Update `INVARIANTS.md`, `ENGINE_CONTRACTS.md`, `ARCHITECTURE_RULES.md`, `DECISION_TREE.md` when behavior changes.

### Source
- `docs/ai/README.md`

---

*Last updated: 2026-07-06*
