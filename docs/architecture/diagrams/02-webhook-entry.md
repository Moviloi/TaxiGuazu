# 02 — Webhook Entry

Punto de entrada de mensajes WhatsApp y routing inicial.

```mermaid
flowchart TD
    A[WhatsApp Cloud API] --> B[POST /api/whatsapp/webhook]

    B --> C[Verify Token]
    C -->|OK| D[Parse Body]
    C -->|FAIL| X[403 Forbidden]

    D --> E{Entry Type}

    E -->|button| F[Button Router]
    E -->|text| G[Text Handler]
    E -->|interactive| H[Interactive Handler]

    F --> I{Button ID Prefix}

    I -->|survey_| J[Survey Service]
    I -->|newtrip_| K[New Trip Response]
    I -->|slot_| L[Slot Confirmation]
    I -->|dispatch_| M[Dispatch Response]
    I -->|opp_| N[Opportunity Response]

    G --> O[Lead Handler]
    H --> O

    O --> P[Conversation Setup]
    P --> Q[Pipeline AI]
```

## Referencia

- Webhook: `src/app/api/whatsapp/webhook/route.ts`
- Button router: `src/app/api/whatsapp/webhook/route.ts:80-120`
- Lead handler: `src/lib/services/lead.service.ts`
