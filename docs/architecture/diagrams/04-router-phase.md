# 04 — Router Phase

Mapeo determinista de Intent → OutputType. Sin lógica de decisión.

```mermaid
flowchart LR
    A[CoreDecision]

    A --> B{Intent}

    B -->|NOW| C[EXECUTE]
    B -->|BOOKING| C
    B -->|PRE_BOOKING| C
    B -->|RESCHEDULE| C

    B -->|COMMERCIAL| D[ANSWER]
    B -->|INFORMATIONAL| D
    B -->|POST_SERVICE| D

    B -->|CONSULTA| E[CLARIFY]
    B -->|GREETING| E
    B -->|AMBIGUOUS| E

    B -->|Low Confidence| F[SAFE_FALLBACK]

    style C fill:#c8e6c9
    style D fill:#fff9c4
    style E fill:#ffccbc
    style F fill:#ffcdd2
```

## OutputType → Acción

| OutputType | Acción | Políticas que lo manejan |
|------------|--------|-------------------------|
| `EXECUTE` | Ejecutar viaje/despacho | Policy Ahora, Policy Reserva |
| `ANSWER` | Responder consulta | Policy Consulta |
| `CLARIFY` | Pedir más información | Policy Ahora, Policy Reserva |
| `SAFE_FALLBACK` | Respuesta segura genérica | Policy Ahora, Policy Reserva |

## Referencia

- Router: `src/lib/ai/router.ts:14-32`
- Handler: `src/lib/ai/handler.ts:70-89`
