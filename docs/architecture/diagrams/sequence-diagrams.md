# Sequence Diagrams — AITOS

> Sequence diagrams for key scenarios, derived from the actual call flow.
> Source: `src/app/api/whatsapp/webhook/route.ts`, `src/lib/services/lead.service.ts`, `src/lib/services/extraction/extraction-runner.ts`, `src/lib/services/workflow/policy-pipeline.ts`.

---

## 1. New Conversation

```mermaid
sequenceDiagram
    actor User
    participant Webhook as WhatsApp Webhook
    participant Lead as lead.service.ts
    participant Setup as conversation-setup.ts
    participant DB as Turso DB
    participant Core as ai/core.ts
    participant Policy as policy-pipeline.ts
    participant Sender as sender.ts

    User->>Webhook: "hola"
    Webhook->>Webhook: verify HMAC
    Webhook->>Webhook: check rate limit
    Webhook->>Webhook: deduplicate message_id
    Webhook->>Lead: handleLeadMessage(phone, text)
    Lead->>Setup: handleConversationSetup(phone, text)
    Setup->>DB: getOrCreateConversation(phone)
    DB-->>Setup: conversation
    Setup->>DB: getChatSession(phone)
    DB-->>Setup: session
    Setup-->>Lead: {conversation, history, customerName, workflow}
    Lead->>Core: core(text)
    Core-->>Lead: CoreDecision(intent=GREETING)
    Lead->>Policy: handlePolicyPipeline(...)
    Policy->>Sender: sendWhatsAppMessage(phone, greeting)
    Sender->>DB: insertMessage(conversation.id, "assistant", msg)
    Sender-->>User: "Hola, soy Cris de TaxiGuazú..."
```

---

## 2. Quote Request

```mermaid
sequenceDiagram
    actor User
    participant Lead as lead.service.ts
    participant Core as ai/core.ts
    participant Memory as memory.ts
    participant Extraction as extraction-runner.ts
    participant Geo as geo engine
    participant Pricing as pricing engine
    participant Policy as policy-pipeline.ts
    participant Sender as sender.ts

    User->>Lead: "cuanto sale del aeropuerto al hotel amerian"
    Lead->>Core: core(text)
    Core-->>Lead: CoreDecision(COMMERCIAL, facts)
    Lead->>Memory: buildMemory(session, history)
    Memory-->>Lead: Memory
    Lead->>Extraction: runExtractionPipeline(...)
    Extraction->>DB: loadPreviousSlots(phone)
    DB-->>Extraction: prevSlots
    Extraction->>Extraction: extractSlots(text)
    Extraction->>Geo: resolveAlias("aeropuerto")
    Geo-->>Extraction: IGR
    Extraction->>Geo: resolveAlias("hotel amerian")
    Geo-->>Extraction: Hotel Amerian
    Extraction->>Pricing: resolvePricingForSlots(origin, dest, pax)
    Pricing-->>Extraction: PricingResult
    Extraction->>DB: upsertChatSession(slots, state)
    Extraction-->>Lead: ExtractionResult
    Lead->>Policy: handlePolicyPipeline(...)
    Policy->>Sender: sendWhatsAppMessage(phone, quote)
    Sender-->>User: "El traslado de Aeropuerto IGR a Hotel Amerian cuesta $X ARS"
```

---

## 3. Reservation Confirmation

```mermaid
sequenceDiagram
    actor User
    participant Lead as lead.service.ts
    participant DB as Turso DB
    participant Core as ai/core.ts
    participant Policy as policy-pipeline.ts
    participant Trip as trip-execution.service.ts
    participant Sender as sender.ts

    User->>Lead: "si" (in awaiting_confirmation state)
    Lead->>DB: getChatSession(phone)
    DB-->>Lead: session with slots
    Lead->>Core: core("si")
    Core-->>Lead: CoreDecision(AFFIRMATION)
    Lead->>Policy: handlePolicyPipeline(...)
    Policy->>Trip: createTrip({slots, pricing})
    Trip->>DB: insert trips row
    Trip->>DB: insert trip_events
    Trip->>DB: update conversations.trip_id
    Policy->>Sender: sendWhatsAppMessage(phone, confirmation)
    Sender-->>User: "Tu reserva quedó registrada..."
```

---

## 4. Driver Assignment

```mermaid
sequenceDiagram
    actor Trip as Trip Execution
    participant Dispatch as dispatch.service.ts
    participant Fleet as fleet-validation.ts
    participant DB as Turso DB
    participant Sender as sender.ts
    actor Driver

    Trip->>Dispatch: initiateDispatch(trip)
    Dispatch->>Fleet: getEligibleDrivers(trip)
    Fleet->>DB: SELECT drivers
    DB-->>Fleet: driver list
    Fleet-->>Dispatch: eligible drivers
    Dispatch->>DB: insert dispatch_events DispatchInitiated
    Dispatch->>Sender: send offer to principal driver
    Sender->>Driver: "Nuevo viaje: ... ¿Aceptás?"
    Driver->>Webhook: "acepto"
    Webhook->>Dispatch: handleDriverAccept(phone, text)
    Dispatch->>DB: atomic assign driver
    Dispatch->>DB: insert DispatchAccepted event
    Dispatch->>Sender: notify user + driver
    Sender->>Trip: assignment confirmed
```

---

## 5. Human Escalation

```mermaid
sequenceDiagram
    actor User
    participant Lead as lead.service.ts
    participant Core as ai/core.ts
    participant Comprehension as comprehension-runner.ts
    participant Admin as admin.service.ts
    participant Sender as sender.ts

    User->>Lead: "tengo un problema grave"
    Lead->>Core: core(text)
    Core-->>Lead: CoreDecision(EMERGENCY)
    Lead->>Comprehension: runComprehensionCheck(...)
    Comprehension-->>Lead: ESCALATION
    Lead->>Policy: handlePolicyPipeline(...)
    Policy->>Admin: notifyAdmin(errMsg)
    Policy->>Sender: sendWhatsAppMessage(phone, safeMsg)
    Sender-->>User: "Un operador se va a comunicar..."
```

---

## 6. Context Resumption

```mermaid
sequenceDiagram
    actor User
    participant Lead as lead.service.ts
    participant DB as Turso DB
    participant Memory as memory.ts
    participant Extraction as extraction-runner.ts
    participant Policy as policy-pipeline.ts
    participant Sender as sender.ts

    User->>Lead: "del aeropuerto" (after previous quote)
    Lead->>DB: getChatSession(phone)
    DB-->>Lead: session with origin/destination
    Lead->>Memory: buildMemory(session, history)
    Memory-->>Lead: Memory
    Lead->>Extraction: runExtractionPipeline(...)
    Extraction->>DB: loadPreviousSlots(phone)
    DB-->>Extraction: prevSlots
    Extraction->>Extraction: extractSlots("del aeropuerto")
    Extraction->>Extraction: merge with prevSlots
    Extraction->>DB: upsertChatSession
    Extraction-->>Lead: ExtractionResult
    Lead->>Policy: handlePolicyPipeline(...)
    Policy->>Sender: sendWhatsAppMessage(phone, nextQuestion)
    Sender-->>User: "¿Cuántos pasajeros son?"
```

---

## 7. LLM Usage (Triple Fallback)

```mermaid
sequenceDiagram
    participant Extraction as extraction-runner.ts
    participant Regex as regex-extractor.ts
    participant Entity as entity-extractor.ts
    participant LLM as extract-slots.ts
    participant Gemini as GeminiProvider
    participant Groq as GroqProvider

    Extraction->>Regex: parseRouteFromText(text)
    Regex-->>Extraction: null
    Extraction->>Entity: extractEntities(text)
    Entity-->>Extraction: null
    Extraction->>LLM: extractSlots(text)
    LLM->>Gemini: generate(prompt)
    Gemini-->>LLM: timeout/error
    LLM->>Groq: generate(prompt)
    Groq-->>LLM: JSON response
    LLM->>LLM: safeParse JSON
    LLM-->>Extraction: TripExtraction
```

---

*Last updated: 2026-07-06*
