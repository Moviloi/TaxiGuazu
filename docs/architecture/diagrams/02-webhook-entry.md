# 02 — Webhook Entry

> **Resumen:** Punto de entrada de WhatsApp: validaci�n de firma, idempotencia, detecci�n de choferes y routing de botones interactivos.


Punto de entrada de mensajes WhatsApp y routing inicial.

```mermaid
flowchart TD

    A[WhatsApp Cloud API] -->|POST| B[/api/whatsapp/webhook]

    subgraph SEC["Seguridad"]
        B --> C{GET verify?}
        C -->|Sí| D[hub.mode + hub.verify_token]
        D -->|OK| E[200 + hub.challenge]
        D -->|FAIL| F[403 Forbidden]

        C -->|No| G[HMAC-SHA256 signature check]
        G -->|OK| H[Parse rawBody]
        G -->|FAIL| I[401 Unauthorized]
    end

    H --> J[Extract message.from → normalizePhone]
    J --> K[Idempotencia: tryRegisterMessage]
    K -->|Duplicado| L[200 OK — ignorar]
    K -->|Nuevo| M{message.type}

    M -->|interactive| N[Button Router]
    M -->|text| O[Text Handler]
    M -->|other| P[200 OK — ignorar]

    N --> Q{buttonId prefix}

    Q -->|aceptar_| R[handleDriverButtonAccept]
    Q -->|realizado_| S[handleDriverCompleted]
    Q -->|enviaje_| T[handleDriverEnViaje]
    Q -->|rechazar_| U[rechazo logueado]
    Q -->|reconfirm_ok_ / reconfirm_no_| V[handleDriverReconfirm*]
    Q -->|comision_ok_ / comision_revision_| W[handleComision*]
    Q -->|tomar_lead_| X[handleDriverTakeLead]
    Q -->|contingencia_si_ / contingencia_no_| Y[handleContingencia*]
    Q -->|survey_| Z[handleSurveyResponse]
    Q -->|newtrip_| AA[handleNewTripResponse]
    Q -->|otro| AB[handleLeadMessage]

    O --> AC{¿Es admin bot group?}
    AC -->|Sí| AD[handleDriverResponse]
    AC -->|No| AE{¿Phone es chofer?}

    AE -->|Sí + acepto/yo estoy/yo voy/lo tomo| AF[handleDriverAccept]
    AE -->|Sí + "llegué"| AG[handleDriverArrived]
    AE -->|No| AH[handleLeadMessage]

    style E fill:#c8e6c9
    style I fill:#ffcdd2
    style L fill:#fff9c4
```

## Seguridad

| Capa | Qué hace | Referencia |
|------|---------|-----------|
| Verificación suscripción | Valida `hub.verify_token` en GET | `route.ts:61-76` |
| HMAC-SHA256 | Verifica firma `x-hub-signature-256` con `WHATSAPP_APP_SECRET` | `route.ts:33-49` |
| Idempotencia | `tryRegisterMessage(messageId)` — primer INSERT gana, segundos se ignoran | `route.ts:101-129` |

## Tipos de mensaje

| Tipo | Acción |
|------|--------|
| `interactive` | Routing por `button_reply.id` |
| `text` | Normalizar teléfono → detectar admin group / chofer / cliente |
| `audio`, `image`, `location`, etc. | Ignorado (retorna 200) — ver FUT-02, FUT-03 |

## Referencias

- Webhook: `src/app/api/whatsapp/webhook/route.ts`
- Button routing: `src/app/api/whatsapp/webhook/route.ts:134-229`
- Driver services: `src/lib/services/dispatch/driver.service.ts`
- Survey service: `src/lib/services/trip-execution/survey.service.ts`
---

## Diagramas relacionados

- [01-system-overview.md](01-system-overview.md) � system-overview
- [14-dispatch-flow.md](14-dispatch-flow.md) � dispatch-flow
