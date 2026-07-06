# State Machines — AITOS

> State machines derived from the actual code.
> Sources: `src/lib/services/workflow/slot-workflow.ts`, `src/lib/db/types.ts`, `src/lib/services/dispatch/dispatch-workflow.ts`.

---

## 1. Conversational State Machine

Source: `src/lib/services/workflow/slot-workflow.ts`, `src/lib/db/state-accessors.ts`

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> collecting_slots : new message with intent
    collecting_slots --> collecting_slots : incomplete slots
    collecting_slots --> slot_confirmation : slots ready, ask confirmation
    collecting_slots --> ambiguity_pending : ambiguous location
    collecting_slots --> awaiting_passenger : need passenger count
    collecting_slots --> awaiting_confirmation : price shown, ask confirm
    slot_confirmation --> awaiting_passenger : confirm + missing pax
    slot_confirmation --> awaiting_confirmation : confirm + price known
    slot_confirmation --> collecting_slots : change request
    awaiting_passenger --> awaiting_confirmation : pax + price known
    awaiting_passenger --> collecting_slots : negative/cancel
    awaiting_confirmation --> pending_human_review : affirmative + FUTURO
    awaiting_confirmation --> executing : affirmative + NOW
    awaiting_confirmation --> collecting_slots : negative
    ambiguity_pending --> collecting_slots : resolved / timeout
    pending_human_review --> [*]
    executing --> closed
    closed --> [*]
```

---

## 2. Slot Status Lifecycle

Source: `src/lib/ai/slot-state.ts`

```mermaid
stateDiagram-v2
    [*] --> RAW
    RAW --> INFERRED : score > 0
    INFERRED --> CONFIRMATION_PENDING : reason == ambiguous_term
    INFERRED --> CONFIRMED : score >= 1.0
    CONFIRMATION_PENDING --> CONFIRMED : user confirms
    CONFIRMATION_PENDING --> USER_CORRECTED : user corrects
    INFERRED --> USER_CORRECTED : correction detected
    CONFIRMED --> USER_CORRECTED : user changes value
    USER_CORRECTED --> CONFIRMED : new value accepted
    CONFIRMED --> [*]
    USER_CONFIRMED --> [*]
```

---

## 3. Trip Lifecycle

Source: `src/lib/db/types.ts`, `src/lib/services/trip-execution/trip-execution.service.ts`

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> QUOTED : price resolved
    QUOTED --> CONFIRMED : user confirms
    CONFIRMED --> ASSIGNED : driver accepts
    ASSIGNED --> IN_PROGRESS : driver marks en viaje
    IN_PROGRESS --> CLOSED : completed / cancelled
    CLOSED --> [*]
```

---

## 4. Dispatch State Machine

Source: `src/lib/services/dispatch/dispatch-workflow.ts`, `src/lib/services/dispatch/dispatch.service.ts`

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> nivel_1 : trip confirmed
    nivel_1 --> nivel_2 : timeout / rejected
    nivel_1 --> closed : driver accepted
    nivel_2 --> nivel_3 : timeout / rejected
    nivel_2 --> closed : driver accepted
    nivel_3 --> waiting_driver : timeout / rejected
    nivel_3 --> closed : driver accepted
    waiting_driver --> closed : driver accepted
    waiting_driver --> human_escalation : timeout
    closed --> [*]
    human_escalation --> [*]
```

---

## 5. Lead Message Handler Flow

Source: `src/lib/services/lead.service.ts`

```mermaid
stateDiagram-v2
    [*] --> ReceiveMessage
    ReceiveMessage --> Limpiar : text == ".limpiar"
    Limpiar --> [*]
    ReceiveMessage --> CommandShortcut : shortcut match
    CommandShortcut --> [*]
    ReceiveMessage --> AdminCommand : admin/driver command
    AdminCommand --> [*]
    ReceiveMessage --> SetupConversation
    SetupConversation --> OpportunityResponse : pending opportunity
    OpportunityResponse --> [*]
    SetupConversation --> Greeting : intent == GREETING
    Greeting --> [*]
    SetupConversation --> SlotConfirmation : slot buttons
    SlotConfirmation --> [*]
    SetupConversation --> AwaitingPassenger : state == awaiting_passenger
    AwaitingPassenger --> [*]
    SetupConversation --> AwaitingConfirmation : state == awaiting_confirmation
    AwaitingConfirmation --> [*]
    SetupConversation --> Ambiguity : ambiguity_pending
    Ambiguity --> [*]
    SetupConversation --> ComprehensionCheck
    ComprehensionCheck --> Extraction : not halted
    ComprehensionCheck --> HumanEscalation : ESCALATION
    Extraction --> Policy
    Policy --> Output
    Output --> [*]
```

---

*Last updated: 2026-07-06*
