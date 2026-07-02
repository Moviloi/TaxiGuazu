# 11 — Operational Readiness

> **Resumen:** Qu� datos m�nimos habilitan cada acci�n: preparar cotizaci�n, cotizar y despachar.


Qué datos habilitan qué acciones del sistema.

```mermaid
flowchart TD

    A[ExtractionContext] --> B{Acción}

    B --> C1[canPrepareQuote]
    C1 --> C2{origin + destination?}
    C2 -->|Sí| C3[✓ prepare quote]
    C2 -->|No| C4[✗ blockedBy: missing_origin / missing_destination]

    B --> Q1[canQuote]
    Q1 --> Q2{origin CONFIRMED + destination CONFIRMED + passengers?}
    Q2 -->|Sí| Q3[✓ quote]
    Q2 -->|No| Q4[✗ blockedBy: origin_pending / destination_pending / missing_passengers]

    B --> D1[canDispatch]
    D1 --> D2{origin CONFIRMED + destination CONFIRMED + passengers + scheduled_at?}
    D2 -->|Sí| D3[✓ dispatch]
    D2 -->|No| D4[✗ blockedBy: missing_origin / origin_pending / missing_destination / destination_pending / missing_passengers / missing_time]

    B --> P1[Conversation Phase]
    P1 --> P2{dispatchReady.allowed?}
    P2 -->|Sí| P3[READY_TO_DISPATCH]
    P2 -->|No + pending| P4[SLOT_CONFIRMATION]
    P2 -->|No| P5[QUOTE / NEEDS_PASSENGERS / DATA_COLLECTION]

    style C3 fill:#c8e6c9
    style Q3 fill:#c8e6c9
    style D3 fill:#c8e6c9
    style C4 fill:#ffcdd2
    style Q4 fill:#ffcdd2
    style D4 fill:#ffcdd2
```

## Funciones

| Función | Requiere | Devuelve |
|---------|----------|----------|
| `canPrepareQuote` | origin + destination | `{allowed, blockedBy[]}` |
| `canQuote` | origin CONFIRMED + destination CONFIRMED + passengers | `{allowed, blockedBy[]}` |
| `canDispatch` | quote reqs + (scheduled_at si no es NOW) | `{allowed, blockedBy[]}` |

## blockedBy reasons

| Reason | Significado |
|--------|-------------|
| `no_extraction_context` | No hay extractionCtx |
| `missing_origin` | Sin origen |
| `origin_pending` | Origen no está CONFIRMED |
| `missing_destination` | Sin destino |
| `destination_pending` | Destino no está CONFIRMED |
| `missing_passengers` | Sin pasajeros |
| `missing_time` | Reserva futura sin scheduled_at |

## Nota importante

`canDispatch` **no verifica tariff**. La distinción PLACE vs ZONE se resuelve en `tariff-resolver.ts` (single query con `resolution_priority`), no en operational readiness.

## Referencias

- Operational readiness: `src/lib/ai/operational-readiness.ts`
- Field resolver: `src/lib/ai/field-resolver.ts`
- Conversation phase log: `src/lib/services/workflow/policy-pipeline.ts:301-324`
---

## Diagramas relacionados

- [16-policy-pipeline.md](16-policy-pipeline.md) � policy-pipeline
- [10-tariff-resolution.md](10-tariff-resolution.md) � tariff-resolution
- [12-workflow-state-machine.md](12-workflow-state-machine.md) � workflow-state-machine
