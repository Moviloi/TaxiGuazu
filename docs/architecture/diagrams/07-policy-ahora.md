# 07 — Policy AHORA

> **Resumen:** Flujo de ejecuci�n inmediata: lateral intents, dispatch, respuestas informativas y fallback seguro.


Flujo de ejecución inmediata. Stateless, sin LLM en la decisión final.

```mermaid
flowchart TD
    A[Policy Ahora] --> B{Decision}

    B -->|EMERGENCY| C[buildLateralEmergencyResponse]
    B -->|RESCHEDULE| D[buildLateralRescheduleResponse]

    B -->|EXECUTE + BOOKING| E[resolveNextRequiredField]
    E --> F{Field needed?}
    F -->|Yes + ambiguous| G[buildLocationConfirmationResponse]
    F -->|Yes + other| H[buildGenericClarify]
    F -->|No| I[buildNowDispatchResponse]

    B -->|ANSWER| J{tariff.matched?}
    J -->|Yes + price| K[buildPriceInfo]
    J -->|No| L[ANSWER sin tarifa es/pt/en]

    B -->|CLARIFY| M[resolveNextRequiredField]
    M --> N[buildClarifyMessage]

    B -->|SAFE_FALLBACK| O[buildGenericSafeFallback]
    B -->|GREETING| P[buildGreeting]

    C --> OUT
    D --> OUT
    I --> OUT
    K --> OUT
    L --> OUT
    N --> OUT
    O --> OUT
    P --> OUT
    G --> OUT
    H --> OUT

    OUT[PolicyOutput]

    OUT --> Q{EMERGENCY/RESCHEDULE?}
    Q -->|Sí| R[needsAdminNotify=true]
    Q -->|No| S[needsAdminNotify=false]

    style I fill:#c8e6c9
    style K fill:#fff9c4
    style O fill:#ffcdd2
```

## Output Properties

| Propiedad | Valor | Descripción |
|-----------|-------|-------------|
| `outputSource` | `"POLICY"` | Siempre, enforced por guard |
| `mode` | `"AHORA"` | Siempre |
| `needsGeo` | `false` | AHORA no hace geo resolution |
| `requiresConfirmation` | `false` | AHORA no pide confirmación |
| `requiresUserInput` | `true` solo si CLARIFY | |
| `confirmationUI` | presente si ambigüedad | Botones interactivos |
| `needsAdminNotify` | `true` si EMERGENCY/RESCHEDULE | Notifica al titular |
| `adminNotifyBody` | string | Cuerpo de notificación admin |

## Lateral intents

| Intent | Respuesta | Admin notify |
|--------|-----------|--------------|
| EMERGENCY | `"🚨 Estamos notificando a nuestro equipo..."` | ✅ |
| RESCHEDULE | `"Entendido. Un operador va a revisar tu reserva..."` | ✅ |

## Referencias

- Policy: `src/lib/ai/policy-ahora.ts`
- Response builder: `src/lib/ai/response-builder.ts`
- Lateral responses: `src/lib/ai/policy-reserva.ts:buildLateralEmergencyResponse`
- Field resolver: `src/lib/ai/field-resolver.ts`
---

## Diagramas relacionados

- [08-policy-reserva.md](08-policy-reserva.md) � policy-reserva
- [04-router-phase.md](04-router-phase.md) � router-phase
- [16-policy-pipeline.md](16-policy-pipeline.md) � policy-pipeline
