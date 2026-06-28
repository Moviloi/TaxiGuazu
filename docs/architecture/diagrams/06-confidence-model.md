# 06 — Confidence Model

Estados de certeza de slots y sus transiciones.

```mermaid
stateDiagram-v2
    [*] --> MISSING

    MISSING --> DETECTED: extracción sistema

    DETECTED --> INFERRED: contexto anterior/core

    DETECTED --> CONFIRMATION_PENDING: ambiguo

    INFERRED --> CONFIRMATION_PENDING: requiere validar

    CONFIRMATION_PENDING --> CONFIRMED: usuario acepta

    CONFIRMED --> CONFIRMED: persistencia

    CONFIRMATION_PENDING --> MISSING: reset
```

## Detalle de Estados

| Estado | Score | Significado | ¿Permite avanzar? |
|--------|-------|-------------|-------------------|
| `MISSING` | 0.0 | No extraído | ❌ No |
| `DETECTED` | 0.3-0.6 | Raw extraction del LLM | ⚠️ Requiere validación |
| `INFERRED` | 0.6-0.8 | Inferido de contexto | ⚠️ Requiere confirmación |
| `CONFIRMATION_PENDING` | 0.6 | Detectado pero no verificado | ⚠️ Requiere confirmación |
| `CONFIRMED` | 1.0 | Usuario confirmó explícitamente | ✅ Sí |

## Transiciones

```mermaid
flowchart LR
    A["MISSING (0.0)"] -->|"LLM extraction"| B["DETECTED (0.3-0.6)"]
    B -->|"context/core"| C["INFERRED (0.6-0.8)"]
    B -->|"ambiguous"| D["CONFIRMATION_PENDING (0.6)"]
    C -->|"needs validation"| D
    D -->|"user confirms"| E["CONFIRMED (1.0)"]
    D -->|"reset"| A
```

## Referencia

- Slot states: `src/lib/ai/slot-state.ts`
- Confidence scoring: `src/lib/services/extraction/confidence.ts`
- Thresholds: `src/config/constants.ts:42-43`
