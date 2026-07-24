# Architectural Invariants — AITOS

> Invariants are statements that must remain true before, during, and after every operation.
> If a change violates an invariant, it must be rejected or elevated to an ADR.
> The AITOS Constitution (`docs/architecture/AITOS_CONSTITUTION.md`) defines additional invariants (INV-01..INV-20) that supersede these product invariants.

---

## 1. Identity invariants

### I1 — Phone is the primary identity

The WhatsApp phone number is the primary key for session state, conversations, and operational context.

- **Evidence**: `chat_sessions.phone` is PRIMARY KEY.
- **Source**: `src/lib/db/core/connection.ts`
- **Consequence**: No anonymous sessions. No token-based auth for end users.

### I2 — Bot phone is distinct from user phone

The system's own WhatsApp number (`BOT_PHONE`) is excluded from processing to prevent self-loops.

- **Evidence**: `phone === getBotPhone()` triggers skip in webhook.
- **Source**: `src/app/api/whatsapp/webhook/route.ts`

---

## 2. Decision invariants

### I3 — Policy decides before Output

Every externally visible action or message is decided by the policy engine before being rendered.

- **Evidence**: `handlePolicyPipeline()` is called after extraction and before any send.
- **Source**: `src/lib/services/lead.service.ts`

### I4 — Intent before Response

The system always determines intent before generating a response.

- **Evidence**: `core()` runs before `router()` and `policy()`.
- **Source**: `src/lib/ai/handler.ts`, `src/lib/services/lead.service.ts`

### I5 — Decision before Generation

The decision of what to do is complete before natural language generation begins.

- **Evidence**: `generateLLMResponse()` is called only after `policy()` returns a base response.
- **Source**: `src/lib/ai/handler.ts`

---

## 3. LLM invariants

### I6 — LLM is never the source of truth

The LLM provides extraction assistance and response refinement, but never authoritative business decisions.

- **Evidence**: `handler.ts` skips LLM when no placeholders; policy templates are primary.
- **Source**: `src/lib/ai/handler.ts`, `src/lib/services/extraction/extract-slots.ts`

### I7 — LLM failure is always recoverable

If the LLM times out, returns malformed output, or is unavailable, the system continues.

- **Evidence**: `llm-provider.ts` falls back Groq → null; extraction falls back regex → entity → null.
- **Source**: `src/lib/ai/llm-provider.ts`, `src/lib/services/extraction/extract-slots.ts`

### I8 — LLM never writes to persistence

The LLM layer performs only external HTTP calls and returns strings/structures.

- **Evidence**: No DB imports in `ai/providers/` or `llm-provider.ts`.
- **Source**: `src/lib/ai/llm-provider.ts`, `src/lib/ai/providers/*.ts`

---

## 4. State invariants

### I9 — Operational Model represents the truth

The canonical state of a booking is the set of slots and trip records, not the conversation text.

- **Evidence**: `chat_sessions.slots`, `trips` table.
- **Source**: `src/lib/db/core/connection.ts`, `src/lib/services/workflow/slot-workflow.ts`

### I10 — Slots have a status lifecycle

Every slot value carries a status that determines whether it can drive pricing or dispatch.

- **Statuses**: RAW → INFERRED → CONFIRMATION_PENDING → CONFIRMED.
- **Special**: USER_CORRECTED, USER_CONFIRMED.
- **Evidence**: `slot-state.ts` computes source/status from score and reason.
- **Source**: `src/lib/ai/slot-state.ts`

### I11 — Conversation state is single-valued per phone

At any moment, a phone has exactly one `conversational_state`.

- **Evidence**: `chat_sessions.conversational_state` column.
- **Source**: `src/lib/db/state-accessors.ts`

### I12 — Previous slots are preserved unless explicitly contradicted

Extraction merges with previous slots. A previous value is overridden only when the current message explicitly provides a different value.

- **Evidence**: Merge loop in `extraction-runner.ts` lines 433-444.
- **Source**: `src/lib/services/extraction/extraction-runner.ts`

---

## 5. Persistence invariants

### I13 — Services access DB only through the facade

All database writes from services go through `src/lib/db/database.ts`.

- **Evidence**: ADR-002.
- **Source**: `docs/adr/002-database-facade.md`
- **Known violations**: `services/learning/*.ts` imports `db/domains/learning.ts`.

### I14 — Webhook messages are idempotent

Every incoming message is tracked by `message_id` and processed at most once.

- **Evidence**: `processed_messages.message_id` PRIMARY KEY.
- **Source**: `src/app/api/whatsapp/webhook/route.ts`

### I15 — Every trip phase change is auditable

Trip lifecycle transitions are recorded in `trip_events`.

- **Evidence**: `trip_events` table with `event_type` and `occurred_at`.
- **Source**: `src/lib/db/core/connection.ts`

---

## 6. Operational invariants

### I16 — Price comes from tariffs, not from LLM

Public and driver prices are resolved from `tariffs` table.

- **Evidence**: `tariff-resolver.ts`, `pricing-engine.ts`.
- **Source**: `src/lib/services/pricing/tariff-resolver.ts`

### I17 — Dispatch follows escalation order

Driver offers proceed: principal → principal2 → broadcast → waiting_driver.

- **Evidence**: `dispatch.service.ts` levels.
- **Source**: `src/lib/services/dispatch/dispatch.service.ts`

### I18 — Assignment is atomic

Only one driver can accept a trip. Race conditions are prevented by optimistic lock.

- **Evidence**: `AssignWorkflowAtomic` in `dispatch-workflow.ts`.
- **Source**: `src/lib/services/dispatch/dispatch-workflow.ts`

### I19 — Human escalation is always available

When automation cannot proceed safely, the system escalates to human review.

- **Evidence**: `pending_human_review` state, admin notifications.
- **Source**: `src/lib/services/workflow/slot-workflow.ts`, `src/lib/services/admin/admin.service.ts`

---

## 7. Security invariants

### I20 — Webhook signature verified

Every WhatsApp webhook request must pass HMAC-SHA256 verification.

- **Evidence**: `verifySignature()` in webhook route.
- **Source**: `src/app/api/whatsapp/webhook/route.ts`

### I21 — Admin endpoints require API key

All `/api/bot/*` endpoints require `x-api-key` matching `ADMIN_API_KEY`.

- **Evidence**: `checkAdminAuth()`.
- **Source**: `src/lib/auth.ts`

### I22 — Cron endpoints require secret

All `/api/cron/*` endpoints require `Authorization: Bearer CRON_SECRET`.

- **Evidence**: `check-timeouts-handler.ts`, `recalculate-suggestions/route.ts`.
- **Source**: `src/lib/check-timeouts-handler.ts`, `src/app/api/cron/recalculate-suggestions/route.ts`

---

## 8. Language invariants

### I23 — Session language persists across turns

Once detected, language is stored in `chat_sessions.lang` and used as fallback.

- **Evidence**: `updateChatSessionLang()`.
- **Source**: `src/lib/services/lead.service.ts`

### I24 — Language detection does not override explicit context

Borderline language detection scores do not override an established session language.

- **Evidence**: `detectLangWithFallback()` threshold logic.
- **Source**: `src/lib/detect-lang.ts`

---

## 9. Invariant violation register

| Invariant | Status | Notes |
|-----------|--------|-------|
| I13 (facade-only DB access) | ⚠️ Partially violated | Learning domain bypasses facade |
| I8 (LLM no DB writes) | ✅ Clean | No violations known |
| I7 (LLM failure recoverable) | ✅ Clean | Triple fallback exists |
| I12 (preserve previous slots) | ⚠️ Under observation | Recent bugs in merge logic under diagnosis |

---

*Last updated: 2026-07-06*
