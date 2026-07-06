# Architecture Rules — AITOS

> Strict rules derived from the code. Every AI agent must follow them.
> If you are about to break a rule, stop and ask for an ADR-level decision.

---

## 1. Pipeline rules

### R1 — Policy decides before Output generates

No message, action, or side effect may be produced without first passing through `policy-pipeline.ts`.

- **Why**: Output is a renderer. Policy is the decision authority.
- **Source**: `src/lib/ai/handler.ts`, `src/lib/services/workflow/policy-pipeline.ts`
- **Violation example**: Calling `sendWhatsAppMessage` directly from extraction logic.

### R2 — CORE runs before ROUTER

`core()` must always execute before `router()`. Router depends on `CoreDecision`.

- **Why**: Router has no language understanding. It only maps decisions to output types.
- **Source**: `src/lib/ai/core.ts`, `src/lib/ai/router.ts`, `src/lib/ai/handler.ts`

### R3 — Extraction never sends messages

`extraction-runner.ts` extracts slots and computes confidence. It does not send messages to the user.

- **Why**: Separation of extraction (read) from response (write).
- **Source**: `src/lib/services/extraction/extraction-runner.ts`

### R4 — Pricing never runs before Extraction

Pricing requires origin/destination/passengers. These come from extraction.

- **Why**: Pricing needs an operational model.
- **Source**: `src/lib/services/extraction/extraction-runner.ts`, `src/lib/services/pricing/resolve-pricing-for-slots.ts`

### R5 — Dispatch never runs before Pricing and Trip creation

Dispatch needs a confirmed trip with a price.

- **Why**: Drivers see payout. Payout comes from price.
- **Source**: `src/lib/services/dispatch/dispatch.service.ts`, `src/lib/services/trip-execution/trip-execution.service.ts`

---

## 2. AI layer rules

### R6 — LLM is optional, never required

The system must function if `GEMINI_API_KEY` and `GROQ_API_KEY` are both missing or both fail.

- **Why**: Operational availability cannot depend on external AI providers.
- **Source**: `src/lib/ai/llm-provider.ts`, `src/lib/ai/handler.ts`

### R7 — AI never imports Services

Files under `src/lib/ai/` may import:
- `src/lib/utils/*`
- `src/config/*`
- `src/lib/db/types.ts` (types only)
- `src/lib/services/i18n/*` (transversal, approved exception)

They must NOT import `src/lib/services/*` except i18n.

- **Why**: Preserves layered architecture.
- **Source**: `docs/adr/001-layered-architecture.md`
- **Known violations**: `src/lib/ai/response-builder.ts` imports `OpportunityResult` from learning.

### R8 — Deterministic classification is authoritative

When `core()` returns a high-confidence intent, do not override it with LLM output.

- **Why**: Deterministic classification is testable and predictable.
- **Source**: `src/lib/ai/core.ts`, `src/lib/ai/handler.ts`

### R9 — Laterals enrich, they do not decide

`ai/laterals/` adds metadata (`urgency`, `timeSensitivity`, etc.) but does not change intent or bypass policy.

- **Why**: Laterals are observability/enrichment, not control.
- **Source**: `src/lib/ai/laterals/handlers.ts`

---

## 3. Service layer rules

### R10 — Services import DB only through the facade

All database access from services must go through `src/lib/db/database.ts`.

- **Why**: Single point of control for queries, migrations, and testing.
- **Source**: `docs/adr/002-database-facade.md`
- **Known violations**: `src/lib/services/learning/*.ts` imports `db/domains/learning.ts` directly.

### R11 — Follow the service dependency order

```
i18n → Geo → Memory/Pricing → Learning → Extraction → Workflow → Dispatch → Trip-execution → Admin/Housekeeping → Lead
```

A service may import services above it in the chain. It may NOT import services below it.

- **Why**: Prevents circular dependencies and preserves reasoning order.
- **Source**: `docs/adr/004-service-boundaries.md`

### R12 — Only Lead orchestrates cross-service flows

No service file should import more than 3 other service domains. If it does, the orchestration likely belongs in `lead.service.ts`.

- **Why**: Lead is the single orchestrator. Everything else is an engine.
- **Source**: `src/lib/services/lead.service.ts`

### R13 — Extraction preserves previous slots

When merging new extraction with previous slots, only override when the new value is explicitly supported by the current message.

- **Why**: Prevents slot loss across turns.
- **Source**: `src/lib/services/extraction/extraction-runner.ts` lines 433-444

---

## 4. State rules

### R14 — Phone is the identity

All session state is keyed by phone. Never create anonymous sessions.

- **Why**: WhatsApp provides identity. No separate auth needed.
- **Source**: `src/lib/db/core/connection.ts` (`chat_sessions.phone` PRIMARY KEY)

### R15 — Slots are the operational model

The canonical operational state is the set of slots: `origin`, `destination`, `passengers`, `scheduled_at`, `flight`, `price`.

- **Why**: Conversation text is ephemeral. Slots persist and drive pricing/dispatch.
- **Source**: `src/lib/ai/extraction-schema.ts`, `src/lib/services/workflow/slot-workflow.ts`

### R16 — Every slot has a status

Slots move through `RAW → INFERRED → CONFIRMATION_PENDING → CONFIRMED`. User corrections produce `USER_CORRECTED` / `USER_CONFIRMED`.

- **Why**: Status determines whether a slot can drive pricing or dispatch.
- **Source**: `src/lib/ai/slot-state.ts`

### R17 — Reset is explicit

Only `.limpiar` command and `handleResponseReset` may clear session state.

- **Why**: Prevents accidental data loss.
- **Source**: `src/lib/services/lead.service.ts`, `src/lib/services/workflow/response-reset.ts`

---

## 5. Data rules

### R18 — No direct DB writes from CORE, ROUTER, or OUTPUT

Only Services and Lead may write to the database.

- **Why**: Core/router/output are decision/rendering layers.
- **Source**: `src/lib/ai/core.ts`, `src/lib/ai/router.ts`, `src/lib/ai/response-builder.ts`

### R19 — Idempotency for webhooks

Every incoming WhatsApp message must be registered in `processed_messages` before processing.

- **Why**: Meta retries webhooks. Duplicate processing causes duplicate charges/actions.
- **Source**: `src/app/api/whatsapp/webhook/route.ts`

### R20 — Rate limiting per phone

No more than 10 messages per phone per 60-second window.

- **Why**: Prevents abuse and runaway loops.
- **Source**: `src/app/api/whatsapp/webhook/route.ts` (`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`)

---

## 6. Response rules

### R21 — Responses come from templates first

Policy templates are the primary response source. LLM may refine but never replace policy decisions.

- **Why**: Deterministic responses for predictable operational states.
- **Source**: `src/lib/ai/handler.ts`, `src/lib/ai/policy-ahora.ts`, `src/lib/ai/policy-reserva.ts`

### R22 — Safe fallback exists for every output path

If policy cannot produce a response, use `SAFE_FALLBACK` and escalate to human.

- **Why**: The user must never be left without a response.
- **Source**: `src/lib/ai/router.ts`, `src/lib/ai/response-builder.ts`

### R23 — Output language follows session language

`detectLangWithFallback` determines language. Output must respect it.

- **Why**: Consistent user experience.
- **Source**: `src/lib/detect-lang.ts`, `src/lib/services/lead.service.ts`

---

## 7. Testing and documentation rules

### R24 — New rules need tests

Any new architectural rule must be accompanied by a test or enforcement script.

- **Why**: Rules that are not enforced are not real.
- **Source**: `tests/`, `ael/contracts/enforce.sh`

### R25 — New domains need ADRs

Changing service boundaries, dependency order, or core invariants requires a new ADR.

- **Why**: Preserves decision history.
- **Source**: `docs/adr/`

---

## 8. Quick reference: allowed vs forbidden

| Action | Allowed | Forbidden |
|--------|---------|-----------|
| Call LLM from extraction | ✅ fallback | ❌ as primary decision maker |
| Import `database.ts` from service | ✅ | — |
| Import `db/domains/*` from service | ❌ (violations exist) | ✅ |
| Import `services/i18n` from `ai/` | ✅ exception | — |
| Import `services/learning` from `ai/` | ❌ | ✅ |
| Send WhatsApp from `policy-pipeline.ts` | ✅ (via sendAndPersist) | — |
| Send WhatsApp from `core.ts` | ❌ | ✅ |
| Write to DB from `lead.service.ts` | ✅ | — |
| Write to DB from `extraction-runner.ts` | ❌ direct writes | ✅ |
| Clear session from `.limpiar` | ✅ | — |
| Clear session silently in extraction | ❌ | ✅ |

---

*Last updated: 2026-07-06*
