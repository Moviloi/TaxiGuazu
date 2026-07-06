# Engine Contracts — AITOS

> This document describes the contracts between engines. It does not describe implementations.
> Every contract includes: purpose, inputs, outputs, preconditions, postconditions, invariants, errors, fallbacks, and side effects.

---

## C1 — Conversation Engine

**Purpose**: Receive incoming messages from the channel, enforce infrastructure concerns, and hand off to the orchestrator.

**Owner**: `src/app/api/whatsapp/webhook/route.ts`, `src/app/api/bot/simulate/route.ts`

### Inputs
- HTTP request from Meta WhatsApp webhook OR admin simulation request
- Headers: `x-hub-signature-256` (webhook), `authorization` (simulate), `content-type`
- Body: WhatsApp payload structure OR `{ phone: string, text: string }`

### Outputs
- HTTP response (`200`, `401`, `429`, `500`)
- Side effect: normalized `(phone, text)` passed to `handleLeadMessage`

### Preconditions
- Environment variables `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `ADMIN_API_KEY` configured.

### Postconditions
- HMAC verified (webhook) OR admin key validated (simulate)
- Rate limit checked
- Message deduplicated via `processed_messages`
- Phone normalized (`+549...` → `+54...`)

### Invariants
- Conversation engine never contains business logic.
- Conversation engine never calls LLM.

### Errors
| Error | Cause | Fallback |
|-------|-------|----------|
| 401 Unauthorized | Invalid/missing HMAC | Reject request |
| 429 Too Many Requests | Rate limit exceeded | Reject request |
| 500 Config missing | Missing env var | Return 500 |

### Side effects
- Writes to `processed_messages`
- Writes to `connection_state` (rate limit counters)

---

## C2 — Intent Engine (CORE)

**Purpose**: Classify user intent and extract explicit facts deterministically from raw text.

**Owner**: `src/lib/ai/core.ts`

### Inputs
- `input: string` — user message
- `prevIntent?: Intent` — previous intent for context continuity

### Outputs
- `CoreDecision`:
  - `intent: Intent` (12 values: GREETING, BOOKING, NOW, EMERGENCY, CONSULTA, COMMERCIAL, PRE_BOOKING, POST_SERVICE, RESCHEDULE, INFORMATIONAL, AMBIGUOUS, UNKNOWN)
  - `facts: string[]` — extracted signals prefixed by type (`urgency:`, `query:`, `action:`, `passengers:`, `flight:`, `date:`, `time:`, `greeting:`, etc.)
  - `confidence: number` — classification confidence
  - `slotStability: SlotStabilityMap` — `locked` | `ambiguous` | `open`
  - `roleLock: RoleLock` — syntactically detected origin/destination
  - `slotAssignmentConfidence: SlotAssignmentConfidence` — confidence in role assignment
  - `lateral?: CoreLateral` — contextual enrichment
  - `purchaseIntent: "high" | "medium" | "low"`

### Preconditions
- Input is a non-empty string.

### Postconditions
- Output always contains a valid `CoreDecision`.
- If no facts extracted, intent is `AMBIGUOUS` with confidence 0.

### Invariants
- No LLM usage.
- No database access.
- No side effects.
- Pure function (request-scoped state reset externally).

### Errors
- Empty input → returns `AMBIGUOUS` with zero confidence.

### Fallbacks
- `prevIntent` context continuity for `PRE_BOOKING`.

### Side effects
- None.

---

## C3 — Router Engine

**Purpose**: Map `CoreDecision` to an `OutputType` and operational mode.

**Owner**: `src/lib/ai/router.ts`

### Inputs
- `core: CoreDecision`

### Outputs
- `FinalDecision`:
  - `decision: OutputType` — EXECUTE | ANSWER | CLARIFY | SAFE_FALLBACK
  - `mode: Mode` — AHORA | RESERVA
  - `core: CoreDecision`
  - `reason: string`

### Preconditions
- Valid `CoreDecision`.

### Postconditions
- Exactly one `OutputType` returned.

### Invariants
- No LLM usage.
- No database access.
- Pure function.

### Errors
- None. Always returns a decision.

### Fallbacks
- Low confidence → `SAFE_FALLBACK`.

### Side effects
- None.

---

## C4 — Context Engine

**Purpose**: Build session memory from persistent state and recent message history.

**Owner**: `src/lib/services/memory/memory.ts`, `src/lib/services/memory/context-memory.ts`

### Inputs
- `session: ChatSessionRow | null`
- `history: MessageRow[]`

### Outputs
- `Memory` object:
  - `sessionMemory: SessionMemory` — last intent, entities, origin/destination
  - `shortTermBuffer: ShortTermBuffer` — last N messages

### Preconditions
- Session loaded from DB by phone.

### Postconditions
- Memory reflects the latest known state.

### Invariants
- Memory is read-only input to downstream engines.
- History is secondary to persistent slots.

### Errors
- Null session → empty memory.

### Fallbacks
- None.

### Side effects
- None.

---

## C5 — Extraction Engine

**Purpose**: Convert user text into structured slots with confidence scores.

**Owner**: `src/lib/services/extraction/extraction-runner.ts`, `src/lib/services/extraction/extract-slots.ts`

### Inputs
- `phone: string`
- `text: string`
- `conversationId: number`
- `leadCore: CoreDecision`
- `history: any[]`
- `customerName: string | null`

### Outputs
- `ExtractionResult | null`:
  - `extractionNote?: string`
  - `workflowResult?: SlotConversationalContext`
  - `parsed?: TripExtraction`
  - `confidenceResult?: ExtractionResult`
  - `pricing?: PricingResult`
  - `prevSlotsEarly: Record<string, string>`
  - `multiRideBreakdown?: MultiRideBreakdown`

### Preconditions
- Conversation exists.
- Previous slots loaded.

### Postconditions
- Slots merged with previous values if current message does not explicitly contradict them.
- Pricing resolved if origin + destination available.
- Workflow state updated.

### Invariants
- Extraction never sends messages.
- Extraction never decides policy.
- Slot merge preserves non-contradictory previous values.

### Errors
- LLM timeout/malformed response → regex fallback → null.
- Pricing not found → pricing omitted.

### Fallbacks
- Regex extraction → entity extraction → LLM extraction → null.
- Previous slot values restored if current extraction is empty.

### Side effects
- Reads DB (`chat_sessions`, `places`, `aliases`, `tariffs`).
- Writes DB (`chat_sessions` slots, confidence, state).

---

## C6 — Geo Engine

**Purpose**: Resolve free-text location references to canonical places.

**Owner**: `src/lib/services/geo/geo-engine.ts`, `src/lib/services/geo/location-resolver.ts`

### Inputs
- Free-text location string (e.g., "aeropuerto", "hotel amerian")
- Optional context (country, nearby origin)

### Outputs
- `GeoResolutionResult`:
  - `place_id: string | null`
  - `canonical_name: string`
  - `zone_id: string | null`
  - `country: string`
  - `match_level: "alias" | "exact" | "fuzzy" | null`

### Preconditions
- Places and aliases loaded in DB.

### Postconditions
- Returns the best match or null.

### Invariants
- Never invents places.
- Fuzzy match threshold ≤ 3 Levenshtein distance.

### Errors
- No match → returns null.

### Fallbacks
- Alias exact → canonical exact → fuzzy → null.

### Side effects
- Reads DB (`places`, `aliases`, `zones`).

---

## C7 — Pricing Engine

**Purpose**: Calculate price for a given origin, destination, and passenger count.

**Owner**: `src/lib/services/pricing/pricing-engine.ts`, `src/lib/services/pricing/tariff-resolver.ts`, `src/lib/services/pricing/resolve-pricing-for-slots.ts`

### Inputs
- `origin: string`
- `destination: string`
- `passengers: number`
- Optional modifiers (promotions, provider adjustments, commercial rules)

### Outputs
- `PricingResult`:
  - `final_price: number`
  - `base_price: number`
  - `markup: number`
  - `adjustments: Adjustment[]`
  - `origin: ResolvedPlace`
  - `destination: ResolvedPlace`
  - `level: string`
  - `source: string`
  - `explanation: string[]`

### Preconditions
- Origin and destination must be resolvable to places or zones.
- Passengers between 1 and 6 (or up to 99 for multi-vehicle).

### Postconditions
- Returns a price or `final_price: 0` if no tariff found.

### Invariants
- Public price ≥ driver payout.
- Price comes from DB tariffs, not LLM.

### Errors
- Unknown origin/destination → `final_price: 0`.
- No tariff → `final_price: 0`.

### Fallbacks
- place→place (priority 1) → place→zone / zone→place (priority 2/3) → zone→zone (priority 4).

### Side effects
- Reads DB (`tariffs`, `places`, `zones`, `promotions`, `provider_adjustments`).

---

## C8 — Policy Engine

**Purpose**: Decide the system's response and any operational side effects based on intent, slots, pricing, and workflow state.

**Owner**: `src/lib/services/workflow/policy-pipeline.ts`, `src/lib/ai/policy-ahora.ts`, `src/lib/ai/policy-reserva.ts`

### Inputs
- `PolicyPipelineInput`:
  - `phone, text, conversation, history, customerName`
  - `leadCore: CoreDecision`
  - `extractionCtx: ExtractionContext | undefined`
  - `pricing?: ToolPricingOutput`
  - `workflowResult?: SlotConversationalContext`
  - `confidenceResult?: ExtractionResult`
  - `prevSlotsEarly: Record<string, string>`
  - `parsedData?: TripExtraction`
  - `domain: ConversationDomain`
  - `multiRideBreakdown?: MultiRideBreakdown`
  - `sessionLang?: Lang`

### Outputs
- Side effects: message sent, trip created, dispatch initiated, state updated.
- No direct return value (response sent via `sendAndPersist`).

### Preconditions
- Extraction completed or intentionally skipped.
- Policy input context valid.

### Postconditions
- Exactly one response path executed.
- All operational side effects consistent with policy decision.

### Invariants
- Policy is the only engine that triggers trip execution and dispatch.
- Policy never depends solely on LLM output.

### Errors
- Unexpected state → safe fallback message + admin notification.

### Fallbacks
- `SAFE_FALLBACK` → generic response + human escalation.

### Side effects
- Sends WhatsApp messages.
- Creates/updates trips.
- Initiates dispatch.
- Updates `chat_sessions.conversational_state`.

---

## C9 — Dispatch Engine

**Purpose**: Assign a confirmed trip to a driver through a multi-level escalation workflow.

**Owner**: `src/lib/services/dispatch/dispatch.service.ts`, `src/lib/services/dispatch/dispatch-workflow.ts`

### Inputs
- `trip_id: string`
- Trip details (origin, destination, price, payout)

### Outputs
- Dispatch events logged.
- WhatsApp offers sent to drivers.
- Trip state updated (`ASSIGNED`, `IN_PROGRESS`, `CLOSED`).

### Preconditions
- Trip exists and is `CONFIRMED`.
- Drivers exist in DB.

### Postconditions
- Exactly one driver accepts or all levels expire.

### Invariants
- Offer order: principal → principal2 → broadcast → waiting_driver.
- Timeout decreases per level: 1h → 30min → 8min → 3min.
- Atomic assignment prevents double acceptance.

### Errors
- No drivers available → escalate to human.
- Race condition → atomic optimistic lock handles it.

### Fallbacks
- Level 1 → Level 2 → Level 3 → waiting_driver → human escalation.

### Side effects
- Writes `dispatch_events`.
- Sends WhatsApp messages to drivers.
- Updates `trips.driver_phone`, `trips.trip_phase`.

---

## C10 — Trip Execution Engine

**Purpose**: Create and execute trips from confirmed slots.

**Owner**: `src/lib/services/trip-execution/trip-execution.service.ts`, `src/lib/services/trip-execution/now-execution.service.ts`

### Inputs
- Confirmed slots (origin, destination, passengers, scheduled_at, price)
- `phone`, `conversationId`, `customerName`, `lang`, `text`

### Outputs
- `TripRow` created in DB.
- For NOW trips: dispatch initiated.
- For FUTURO trips: `pending_human_review` state set.

### Preconditions
- Origin and destination confirmed.
- Pricing resolved (or explicitly missing).

### Postconditions
- Trip row exists in `trips`.
- Conversation linked to trip.

### Invariants
- Trip phase follows `DRAFT → QUOTED → CONFIRMED → ASSIGNED → IN_PROGRESS → CLOSED`.
- Every trip phase change is logged in `trip_events`.

### Errors
- Missing required slot → does not create trip, asks for clarification.

### Fallbacks
- Missing price → trip created with human review flag.

### Side effects
- Writes `trips`, `trip_events`, `trip_legs`, `trip_groups`.
- Links `conversations.trip_id`.

---

## C11 — Learning Engine

**Purpose**: Track events and adjust future opportunities/pricing based on outcomes.

**Owner**: `src/lib/services/learning/event-tracking.ts`, `src/lib/services/learning/opportunity-engine.ts`, `src/lib/services/learning/fare-learning-engine.ts`

### Inputs
- Events: intent detected, entity detected, suggestion accepted/rejected, trip completed, opportunity presented.

### Outputs
- Updated `learning_weights`.
- Opportunity recommendations for future conversations.
- Fare adjustment signals.

### Preconditions
- Event has session_id/phone.

### Postconditions
- Event persisted in relevant log table.

### Invariants
- Learning is read-only at decision time.
- Learning never overrides policy decisions.

### Errors
- DB unavailable → event dropped (logging, not critical path).

### Fallbacks
- None.

### Side effects
- Writes `f9_events`, `conversation_events`, `learning_weights`, `opportunity_log`, `decision_log`.

---

## C12 — LLM Layer

**Purpose**: Provide optional natural language extraction and response refinement.

**Owner**: `src/lib/ai/llm-provider.ts`, `src/lib/ai/providers/*.ts`, `src/lib/ai/llm-response.ts`

### Inputs
- Prompt string
- Optional model/provider preference

### Outputs
- String response OR parsed JSON OR null.

### Preconditions
- API key configured (GEMINI_API_KEY or GROQ_API_KEY).

### Postconditions
- Response returned within timeout (default 5000ms).

### Invariants
- LLM failure is always recoverable.
- LLM output is validated before use.

### Errors
- Timeout → try fallback provider → return null.
- Malformed JSON → catch and return null.

### Fallbacks
- Gemini → Groq → null.

### Side effects
- External HTTP calls only.

---

## C13 — Output / Sender Engine

**Purpose**: Deliver the final response to the user via WhatsApp Cloud API.

**Owner**: `src/lib/sender.ts`, `src/lib/services/shared/message-helpers.ts`

### Inputs
- `phone: string`
- `message: string` OR interactive button payload

### Outputs
- HTTP response from Meta API.

### Preconditions
- `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID` configured.

### Postconditions
- Message persisted in `messages`.

### Invariants
- Sender never decides what to say. It only delivers.

### Errors
- Meta API failure → log error, retry not handled automatically.

### Fallbacks
- None.

### Side effects
- External HTTP call to Meta.
- Writes `messages` table.

---

*Last updated: 2026-07-06*
