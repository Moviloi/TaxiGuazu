# Data Flow Diagrams — AITOS

> DFD levels 0-3 derived from the actual runtime flow.
> Source: `src/app/api/whatsapp/webhook/route.ts`, `src/lib/services/lead.service.ts`, `src/lib/services/extraction/extraction-runner.ts`, `src/lib/services/workflow/policy-pipeline.ts`.

---

## Level 0 — Context Diagram

```mermaid
flowchart LR
    User["👤 User<br/>WhatsApp"] -->|mensaje de texto| AITOS["🖥️ AITOS"]
    AITOS -->|respuesta| User
    AITOS -->|oferta de viaje| Driver["🚗 Driver<br/>WhatsApp"]
    Driver -->|aceptar/rechazar| AITOS
    AITOS -->|webhook events| Meta["Meta WhatsApp Cloud API"]
    Meta -->|webhook events| AITOS
    AITOS -->|queries/writes| Turso["Turso DB"]
    AITOS -->|LLM calls| Gemini["Gemini API"]
    AITOS -->|LLM fallback| Groq["Groq API"]
    AITOS -->|reverse geocode| Nominatim["Nominatim OSM"]
    Admin["👨‍💼 Admin"] -->|x-api-key| AdminAPI["Admin APIs"]
    AdminAPI --> AITOS
```

---

## Level 1 — System Decomposition

```mermaid
flowchart LR
    User -->|1. message| Webhook["WhatsApp Webhook"]
    Webhook -->|2. normalized (phone,text)| Lead["Lead Orchestrator"]
    Lead -->|3a. classify| CORE["CORE Engine"]
    Lead -->|3b. load context| Memory["Memory Engine"]
    Lead -->|3c. extract slots| Extraction["Extraction Engine"]
    Extraction -->|resolve places| Geo["Geo Engine"]
    Extraction -->|resolve price| Pricing["Pricing Engine"]
    Extraction -->|update state| Workflow["Workflow Engine"]
    Lead -->|4. decide| Policy["Policy Engine"]
    Policy -->|5a. create trip| Trip["Trip Execution"]
    Trip -->|6. assign| Dispatch["Dispatch Engine"]
    Policy -->|5b. render| Output["Output Engine"]
    Output -->|7. send| Sender["WhatsApp Sender"]
    Sender --> User
    Dispatch -->|offer| Driver
    Driver -->|response| Webhook
    Policy -->|events| Learning["Learning Engine"]
    Learning -->|opportunities| Policy
    Lead -->|read/write| DB[("Turso DB")]
    Extraction -.->|fallback| LLM["LLM Layer"]
    Output -.->|refine| LLM
```

---

## Level 2 — Extraction Flow

```mermaid
flowchart TD
    Text["User text"] --> Regex["regex-extractor.ts"]
    Regex -->|match| RawSlots["raw slots"]
    Regex -->|no match| Entity["entity-extractor.ts"]
    Entity -->|DB match| RawSlots
    Entity -->|no match| LLM["extract-slots.ts<br/>LLM fallback"]
    LLM -->|success| RawSlots
    LLM -->|fail| Empty["raw = null"]
    RawSlots --> Confidence["calculateSlotConfidence"]
    Empty -->|if affirmation + prevSlots| Promote["promote previous slots"]
    Promote --> Confidence
    Confidence --> Geo["resolvePricingForSlots<br/>→ Geo resolution"]
    Geo --> Pricing["Tariff lookup"]
    Pricing --> Merge["merge with previous slots"]
    Merge --> RoleLock["apply roleLock"]
    RoleLock --> Affirmation["affirmation override"]
    Affirmation --> SlotStates["buildSlotStates"]
    SlotStates --> Workflow["evaluateWorkflowTransition"]
    Workflow --> Persist["upsertChatSession"]
```

---

## Level 3 — Slot Merge Detail

```mermaid
flowchart TD
    Prev["previous slots<br/>chat_sessions.slots"] --> Merge["Merge function"]
    Current["current extraction<br/>confidenceResult.slots"] --> Merge
    Merge -->|key missing in current| KeepPrev["keep previous value"]
    Merge -->|key exists and explicit in text| UseCurrent["use current value"]
    Merge -->|key exists but not in text| KeepPrev
    KeepPrev --> OutputSlots["merged slots"]
    UseCurrent --> OutputSlots
    OutputSlots --> Status["compute status:<br/>RAW/INFERRED/CONFIRMATION_PENDING/CONFIRMED"]
    Status --> Write["write to chat_sessions"]
```

---

*Last updated: 2026-07-06*
