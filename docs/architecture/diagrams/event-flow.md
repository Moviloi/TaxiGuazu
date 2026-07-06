# Event Flow — AITOS

> How operational events flow through the system for learning and auditing.
> Source: `src/lib/services/learning/event-tracking.ts`, `src/lib/services/dispatch/dispatch.service.ts`, `src/lib/services/trip-execution/trip-execution.service.ts`.

---

## Event producers

| Producer | Events produced | Tables written |
|----------|----------------|----------------|
| `lead.service.ts` | `intent_detected`, `entity_detected` | `f9_events`, `conversation_events` |
| `extraction-runner.ts` | extraction success/failure | `conversation_f4_log` |
| `policy-pipeline.ts` | opportunity presented | `opportunity_log` |
| `trip-execution.service.ts` | `TripCreated`, `TripConfirmed` | `trip_events` |
| `dispatch.service.ts` | `DispatchInitiated`, `DispatchOffered`, `DispatchAccepted`, `DispatchAbandoned` | `dispatch_events` |
| `survey.service.ts` | survey responses | `conversion_outcomes` |
| `admin-commands.ts` | admin actions | `f9_admin_commands` |

---

## Event flow diagram

```mermaid
flowchart LR
    subgraph Conversation
        Lead["lead.service.ts"]
        Policy["policy-pipeline.ts"]
        Extraction["extraction-runner.ts"]
    end

    subgraph Execution
        Trip["trip-execution"]
        Dispatch["dispatch engine"]
        Survey["survey.service.ts"]
    end

    subgraph Learning
        Tracker["event-tracking.ts"]
        Opportunity["opportunity-engine.ts"]
        FareLearning["fare-learning-engine.ts"]
        Suggestion["suggestion-recalculator.ts"]
    end

    subgraph Storage
        F9["f9_events"]
        TripEvents["trip_events"]
        DispatchEvents["dispatch_events"]
        OppLog["opportunity_log"]
        DecisionLog["decision_log"]
        Weights["learning_weights"]
        Outcomes["conversion_outcomes"]
    end

    Lead -->|intent_detected| Tracker
    Lead -->|entity_detected| Tracker
    Extraction -->|comprehension_score| Tracker
    Policy -->|opportunity_presented| Opportunity
    Opportunity --> OppLog
    Opportunity --> DecisionLog
    Trip -->|TripCreated / TripConfirmed| TripEvents
    Trip --> Tracker
    Dispatch -->|Dispatch*| DispatchEvents
    Dispatch --> Tracker
    Survey --> Outcomes
    Tracker --> F9
    FareLearning --> Weights
    Suggestion --> Weights
    Outcomes --> FareLearning
    F9 --> Suggestion
```

---

## Learning feedback loop

```mermaid
flowchart TD
    A[Operation occurs] --> B[event-tracking.ts logs event]
    B --> C[f9_events / opportunity_log]
    C --> D[learning engine processes]
    D --> E[learning_weights updated]
    E --> F[opportunity-engine uses weights]
    F --> G[Future conversations get better offers]
```

---

*Last updated: 2026-07-06*
