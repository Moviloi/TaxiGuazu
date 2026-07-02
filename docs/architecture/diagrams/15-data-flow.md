# 15 â€” Data Flow

> **Resumen:** Flujo completo de datos entre extracción, CORE, policy pipeline, pricing, dispatch y salida.


Flujo completo de datos a travÃ©s del sistema.

```mermaid
flowchart TD

    subgraph IN["Entrada"]
        A[Mensaje WhatsApp]
        B[Historial de mensajes]
        C[chat_sessions.slots]
        D[chat_sessions.state]
    end

    A --> E[Webhook route.ts]
    E --> F[lead.service.ts]

    F --> G[Extraction Pipeline]
    G --> H[ExtractionResult]
    H --> I[confidence.ts]
    I --> J[ConfidenceMap]
    J --> K[slot-state.ts]
    K --> L[SlotStateEntry]

    F --> M[CORE core.ts]
    M --> N[CoreDecision]
    N --> O[laterals/]
    O --> P[CoreLateral]

    F --> Q[policy-pipeline.ts]

    Q --> R[buildExtractionContext]
    R --> S[ExtractionContext]

    Q --> T[temporalFromFacts]
    T --> U[OperationalMode]
    U --> V[Mode AHORA/RESERVA]

    S --> W[operational-readiness.ts]
    W --> X{canPrepareQuote / canQuote / canDispatch}

    S --> Y[pricing-engine.ts]
    Y --> Z[PricingResult]

    Q --> AA[learning/opportunity-engine.ts]
    AA --> AB[OpportunityResult]

    Q --> AC[executeNowTrip]
    Q --> AD[processLead]

    AD --> AE[handler.ts]
    AE --> AF[policy-ahora.ts / policy-reserva.ts]
    AF --> AG[response-builder.ts]
    AG --> AH[PolicyOutput]

    AH --> AI[guard.ts]
    AI --> AJ[sendWhatsAppMessage]
    AJ --> AK[messages table]

    AC --> AL[trips table]

    style Q fill:#fff9c4
    style AC fill:#c8e6c9
    style AK fill:#c8e6c9
```

## Datos por Fase

| Fase | Input | Output | Almacena en |
|------|-------|--------|-------------|
| CORE | Texto | CoreDecision | memory (transient) |
| EXTRACTION | Texto + History | ExtractionResult | chat_sessions.slots |
| CONFIDENCE | Slots | ConfidenceMap | chat_sessions.confidence |
| SLOT STATE | ConfidenceMap + prev states | SlotStateEntry[] | chat_sessions.slots |
| POLICY PIPELINE | CoreDecision + ExtractionContext + Pricing | PolicyOutput | â€” (orquesta) |
| POLICY | HandlerContext | PolicyOutput | â€” (stateless) |
| DISPATCH | Trip + Fleet | Assignment | trips |
| OUTPUT | PolicyOutput | WhatsApp message | messages |
| LEARNING | Pricing + context | Opportunities | learning tables |

## Flujo de contexto

```mermaid
flowchart LR
    A[loadContext] --> B[mergeContext]
    B --> C[HandlerContext]
    C --> D[Policy]
    D --> E[saveContext]
```

## Referencias

- Context builder: `src/lib/services/workflow/build-extraction-context.ts`
- Context memory: `src/lib/services/memory/context-memory.ts`
- Policy pipeline: `src/lib/services/workflow/policy-pipeline.ts`
- Types: `src/lib/ai/types.ts`
---

## Diagramas relacionados

- [01-system-overview.md](01-system-overview.md) — system-overview
- [16-policy-pipeline.md](16-policy-pipeline.md) — policy-pipeline
- [09-location-resolution.md](09-location-resolution.md) — location-resolution
