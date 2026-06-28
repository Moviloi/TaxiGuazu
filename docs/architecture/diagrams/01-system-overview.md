# 01 — System Overview

Pipeline principal de 5 fases del sistema TaxGuazú.

```mermaid
flowchart TD
    A[WhatsApp Webhook] --> B[Security + Parse]
    B --> C[Idempotencia Message ID]

    C --> D{Tipo de entrada}

    D -->|Botón| E[Button Router]
    D -->|Texto| F[Text Handler]

    E --> G[Lead Handler]
    F --> G

    G --> H[Conversation Setup]

    H --> H1[Cargar sesión]
    H --> H2[Historial]
    H --> H3[Estado viaje]
    H --> H4[Memoria]

    H4 --> I[CORE]

    I --> I1[Regex Facts]
    I --> I2[Intent Detection]
    I --> I3[Role Lock]
    I --> I4[Slot Stability]
    I --> I5[Confidence Score]

    I5 --> J[ROUTER]

    J --> J1[Intent → OutputType]

    J1 --> K{Modo Operativo}

    K -->|INFO| L[Policy Consulta]
    K -->|DISPATCH| M[Policy Ahora]
    K -->|RESERVATION| N[Policy Reserva]

    L --> O[PolicyOutput]
    M --> O
    N --> O

    O --> P[Guard]

    P --> P1[assertOutputSource]
    P --> P2[assertPipelineComplete]

    P --> Q[Send WhatsApp]
    Q --> R[Persist Response]
```

## Referencia

- Entry point: `src/app/api/whatsapp/webhook/route.ts`
- Pipeline: `src/lib/ai/handler.ts:70-89`
- Guard: `src/lib/ai/guard.ts`
