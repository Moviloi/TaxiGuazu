# 08 — Policy RESERVA

Flujo de reserva multi-paso con confirmación obligatoria.

```mermaid
flowchart TD
    A[Policy Reserva] --> B{Estado Slots}

    B -->|Faltan datos| C[COLLECTING]

    C --> C1[Pedir origen]
    C --> C2[Pedir destino]
    C --> C3[Pedir fecha/hora]
    C --> C4[Pedir pasajeros]

    B -->|Slots completos| D[Evaluar certeza]

    D --> E{Ambigüedad}

    E -->|Sí| F[Confirmar ubicación]
    E -->|No| G[Resolver tarifa]

    G --> H{Tarifa}

    H -->|Existe| I[Resumen + Confirmación]
    H -->|No existe| J[Operador]

    I --> K{Usuario confirma}

    K -->|Sí| L[Crear viaje]
    K -->|No| M[Cancelar]

    style L fill:#c8e6c9
    style J fill:#ffccbc
    style M fill:#ffcdd2
```

## Decision Tree (Prioridad)

1. **Laterales** → EMERGENCY, RESCHEDULE, POST_SERVICE
2. **Booking acceptance** → awaiting_confirmation + affirmation
3. **Stable acknowledge** → origin + destination present, evaluar ambigüedad
4. **Confirmation with tariff** → askForConfirmation + tariff.matched
5. **Clarify during collection** → collecting_slots + clarifyField
6. **No-tariff confirmation** → awaiting_confirmation sin tariff
7. **ANSWER + tariff** → price info
8. **CLARIFY** → resolve next field
9. **EXECUTE without extraction** → gather missing data
10. **Default fallback** → safe fallback

## Output Properties

| Propiedad | Valor |
|-----------|-------|
| `outputSource` | `"POLICY"` |
| `requiresConfirmation` | `true` solo si EXECUTE |
| `requiresUserInput` | `true` si CLARIFY o EXECUTE+askForConfirmation |
| `needsGeo` | `true` si EXECUTE+askForConfirmation+tariff.matched |

## Referencia

- Policy: `src/lib/ai/policy-reserva.ts:139-271`
- Ambiguity detection: `src/lib/ai/policy-reserva.ts:18-47`
- Confirmation builder: `src/lib/ai/policy-reserva.ts:273-318`
