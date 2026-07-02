# 05 — Extraction Phase

> **Resumen:** Extracci�n de slots mediante LLM: schema de 9 campos, scoring de confianza y pipeline de 9 m�dulos.


Extracción de slots mediante LLM + scoring de confianza por campo.

```mermaid
flowchart TD

    subgraph IN["Input"]
        A[Texto usuario]
        B[History]
        C[Role Lock / Slot Stability]
        D[Previous Slots]
    end

    A --> RUNNER
    B --> RUNNER
    C --> RUNNER
    D --> RUNNER

    subgraph RUNNER["Extraction Pipeline"]
        RUN[extraction-runner.ts]
        RUN --> EX1[extract-slots.ts]
        RUN --> EX2[entity-extractor.ts]
        RUN --> EX3[regex-extractor.ts]
        RUN --> EX4[comprehension.ts]
        RUN --> EX5[comprehension-runner.ts]
        RUN --> EX6[confidence.ts]
        RUN --> EX7[confidence-map.ts]
        RUN --> EX8[format-confidence-note.ts]
        RUN --> EX9[slot-state.ts]
    end

    EX1 --> SCH[TripExtraction Schema]

    SCH --> S1["origin"]
    SCH --> S2["destination"]
    SCH --> S3["passengers"]
    SCH --> S4["scheduled_at"]
    SCH --> S5["flight"]
    SCH --> S6["price"]
    SCH --> S7["urgency"]
    SCH --> S8["customer_name"]
    SCH --> S9["language"]

    S1 --> SCORE[Slot Confidence Scoring]
    S2 --> SCORE
    S3 --> SCORE
    S4 --> SCORE
    S5 --> SCORE
    S6 --> SCORE
    S7 --> SCORE
    S8 --> SCORE

    SCORE --> E{overall_confidence}

    E -->|>= 0.7| F["action: proceed"]
    E -->|0.3 - 0.7| G["action: clarify"]
    E -->|< 0.3| H["action: fallback_regex"]

    F --> I[ExtractionResult]
    G --> I
    H --> I

    style F fill:#c8e6c9
    style G fill:#fff9c4
    style H fill:#ffccbc
```

## TripExtraction Schema

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `origin` | string | Origen del viaje |
| `destination` | string | Destino del viaje |
| `passengers` | number | Cantidad de pasajeros |
| `scheduled_at` | string | Fecha/hora ISO o relativa |
| `flight` | string | Número de vuelo |
| `price` | number | Precio mencionado por el usuario |
| `urgency` | enum | `now`, `today`, `future` |
| `customer_name` | string | Nombre del cliente |
| `language` | enum | `es`, `en`, `pt`, `fr`, `de`, `it`, `zh` |

## Confidence Dimensions

| Slot | Score 1.0 | Score 0.6 | Score 0.0 |
|------|-----------|-----------|-----------|
| origin | exact_alias_match | ambiguous_term / fuzzy_alias_match | unknown_location / missing |
| destination | exact_alias_match | ambiguous_term / fuzzy_alias_match | unknown_location / missing |
| passengers | direct_extraction | ambiguous_mention | missing |
| scheduled_at | valid_iso_date | relative_date_computed | missing |

## Pipeline de módulos

| Módulo | Función |
|--------|---------|
| `extraction-runner.ts` | Orquesta extracción LLM + regex |
| `extract-slots.ts` | Prepara prompt y parsea respuesta estructurada |
| `entity-extractor.ts` | Patrones específicos de entidades (hoteles, landmarks) |
| `regex-extractor.ts` | Fallback regex para slots |
| `comprehension.ts` | Evalúa calidad/comprensión del mensaje |
| `comprehension-runner.ts` | Runner de comprehension check |
| `confidence.ts` | Asigna scores por slot |
| `confidence-map.ts` | Mapa multidimensional de confianza |
| `slot-state.ts` | Determina status final (CONFIRMED, INFERRED, etc.) |

## Referencias

- Schema: `src/lib/ai/extraction-schema.ts`
- Runner: `src/lib/services/extraction/extraction-runner.ts`
- Confidence: `src/lib/services/extraction/confidence.ts`
- Slot state: `src/lib/ai/slot-state.ts`
- Thresholds: `src/config/constants.ts:44-45`
---

## Diagramas relacionados

- [06-confidence-model.md](06-confidence-model.md) � confidence-model
- [13-slot-confidence-evolution.md](13-slot-confidence-evolution.md) � slot-confidence-evolution
- [03-core-phase.md](03-core-phase.md) � core-phase
