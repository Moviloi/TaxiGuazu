# 07 — Policy AHORA

Flujo de ejecución inmediata. Stateless, sin LLM, sin confirmación.

```mermaid
flowchart TD
    A[Policy Ahora] --> B{Decision}

    B -->|EMERGENCY| C[buildLateralEmergencyResponse]
    B -->|RESCHEDULE| D[buildLateralRescheduleResponse]

    B -->|BOOKING| E[resolveNextRequiredField]

    E --> F{Field needed?}
    F -->|Yes + ambiguous| G[buildLocationConfirmationResponse]
    F -->|Yes + other| H[buildGenericClarify]
    F -->|No| I[buildNowDispatchResponse]

    B -->|ANSWER| J{tariff.matched?}
    J -->|Yes + price| K[buildPriceInfo]
    J -->|No| L[buildOperatorAssisted]

    B -->|CLARIFY| M[resolveNextRequiredField]
    M --> N[buildClarifyMessage]

    B -->|SAFE_FALLBACK| O[buildGenericSafeFallback]

    style I fill:#c8e6c9
    style K fill:#fff9c4
    style O fill:#ffcdd2
```

## Output Properties

| Propiedad | Valor | Descripción |
|-----------|-------|-------------|
| `outputSource` | `"POLICY"` | Siempre, enforced por guard |
| `needsGeo` | `false` | AHORA nunca hace geo resolution |
| `requiresConfirmation` | `false` | AHORA nunca pide confirmación |
| `requiresUserInput` | `true` solo si CLARIFY | |

## Referencia

- Policy: `src/lib/ai/policy-ahora.ts:75-141`
- Response builder: `src/lib/ai/response-builder.ts`
