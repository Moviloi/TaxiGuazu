# Runtime Flow — AITOS

> End-to-end runtime flow from message arrival to response.
> Source: `src/lib/services/lead.service.ts`.

---

## Main runtime flow

```mermaid
flowchart TD
    Start([User sends message]) --> Webhook["WhatsApp Webhook<br/>route.ts"]

    Webhook --> HMAC{"HMAC valid?"}
    HMAC -->|No| Return401["Return 401"]
    HMAC -->|Yes| RateLimit{"Rate limit ok?"}

    RateLimit -->|No| Return429["Return 429"]
    RateLimit -->|Yes| Idempotency{"Already processed?"}

    Idempotency -->|Yes| Return200["Return 200"]
    Idempotency -->|No| Lead["lead.service.ts<br/>handleLeadMessage"]

    Lead --> Limpiar{"text == '.limpiar'?"}
    Limpiar -->|Yes| Reset["handleResponseReset()<br/>reset session"] --> End1([End])
    Limpiar -->|No| Command{"Command shortcut?"}

    Command -->|Yes| ExecCommand["Execute command"] --> End1
    Command -->|No| AdminCmd{"Admin/driver command?"}

    AdminCmd -->|Yes| ExecAdmin["Execute admin command"] --> End1
    AdminCmd -->|No| Setup["handleConversationSetup()"]

    Setup --> Opportunity{"Pending opportunity?"}
    Opportunity -->|Yes| OppResponse["handleOpportunityResponse()"] --> End1
    Opportunity -->|No| Core["core(text, prevIntent)"]

    Core --> Greeting{"intent == GREETING?"}
    Greeting -->|Yes| PolicyGreeting["handlePolicyPipeline()<br/>greeting response"] --> Send
    Greeting -->|No| SlotBtn{"Slot confirmation button?"}

    SlotBtn -->|Yes| HandleSlotBtn["handleSlotConfirmationButton()"] --> End1
    SlotBtn -->|No| SlotState{"state == slot_confirmation?"}

    SlotState -->|Yes| HandleSlotText["Handle text in confirmation"] --> End1
    SlotState -->|No| AwaitingPax{"state == awaiting_passenger?"}

    AwaitingPax -->|Yes| HandlePax["Parse passenger count<br/>resolve pricing"] --> End1
    AwaitingPax -->|No| AwaitingConf{"state == awaiting_confirmation?"}

    AwaitingConf -->|Yes| HandleConf["Confirm / cancel trip"] --> End1
    AwaitingConf -->|No| Ambiguity{"state == ambiguity_pending?"}

    Ambiguity -->|Yes| HandleAmb["handleAmbiguityResponse()"] --> End1
    Ambiguity -->|No| AmbFact{"location_ambiguous fact?"}

    AmbFact -->|Yes| StartAmb["startAmbiguityResolution()"] --> End1
    AmbFact -->|No| Comprehension["runComprehensionCheck()"]

    Comprehension --> Escalation{"comprehension == ESCALATION?"}
    Escalation -->|Yes| HumanEsc["Escalate to human"] --> Send
    Escalation -->|No| Extraction["runExtractionPipeline()"]

    Extraction -->|null| End1
    Extraction -->|result| Policy["handlePolicyPipeline()"]

    Policy --> TripExec{"Create/execute trip?"}
    TripExec -->|Yes| Trip["trip-execution.service.ts"] --> Dispatch
    TripExec -->|No| Send

    Dispatch --> Driver["Send offer to driver"]
    Policy --> Send["sendWhatsAppMessage()"]

    Send --> End1

    Send --> Persist["insertMessage()"]
    Persist --> End1
```

---

## Response generation flow

```mermaid
flowchart LR
    Policy["policy-pipeline.ts"] --> Decide{"What to do?"}
    Decide -->|Greet| Greeting["buildGreetingIntro()"]
    Decide -->|Clarify| Clarify["buildGenericClarify()"]
    Decide -->|Quote| Quote["price info template"]
    Decide -->|Confirm| Confirm["buildSlotConfirmationMessage()"]
    Decide -->|Execute| Execute["trip creation / dispatch"]
    Decide -->|Fallback| Fallback["buildGlobalErrorMessage()"]

    Greeting --> Output
    Clarify --> Output
    Quote --> Output
    Confirm --> Output
    Execute --> Output
    Fallback --> Output

    Output -->|optional| LLM["generateLLMResponse()<br/>refine wording"]
    LLM -->|fallback if fail| Output
    Output --> Sender["sendWhatsAppMessage()"]
```

---

*Last updated: 2026-07-06*
