# 05 — Extraction Phase

Extracción de slots mediante LLM + scoring de confianza por campo.

```mermaid
flowchart TD
    A[CoreDecision + Text] --> B[LLM Extraction]

    B --> C[TripExtraction Schema]

    C --> C1["origin (string)"]
    C --> C2["destination (string)"]
    C --> C3["passengers (number)"]
    C --> C4["scheduled_at (string)"]
    C --> C5["flight (string)"]
    C --> C6["price (number)"]
    C --> C7["urgency (enum)"]
    C --> C8["customer_name (string)"]

    C1 --> D[Slot Confidence Scoring]
    C2 --> D
    C3 --> D
    C4 --> D

    D --> E{overall_confidence}

    E -->|>= 0.7| F["proceed"]
    E -->|0.3 - 0.7| G["clarify"]
    E -->|< 0.3| H["fallback_regex"]

    F --> I[ExtractionResult]
    G --> I
    H --> I

    style F fill:#c8e6c9
    style G fill:#fff9c4
    style H fill:#ffccbc
```

## Confidence Scores por Slot

| Slot | Score 1.0 | Score 0.6 | Score 0.0 |
|------|-----------|-----------|-----------|
| origin | exact_alias_match | ambiguous_term | missing |
| destination | exact_alias_match | ambiguous_term | missing |
| passengers | direct_extraction | ambiguous_mention | missing |
| scheduled_at | valid_iso_date | relative_date_computed | missing |

## Referencia

- Schema: `src/lib/ai/extraction-schema.ts`
- Runner: `src/lib/services/extraction/extraction-runner.ts`
- Confidence: `src/lib/services/extraction/confidence.ts`
