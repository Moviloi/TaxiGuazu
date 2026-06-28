# 14 — Dispatch Flow

Flujo de ejecución de viaje y asignación a chofer.

```mermaid
flowchart TD
    A[Trip Created] --> B{Modo}

    B -->|AHORA| C[Broadcast Inmediato]
    B -->|RESERVA| D[Wait until scheduled_at]

    C --> E[Fleet Validation]
    D --> E

    E --> F{¿Hay choferes?}

    F -->|Sí| G[Broadcast a choferes]
    F -->|No| H[Escalation]

    G --> I{¿Alguien acepta?}

    I -->|Sí| J[Trip ASSIGNED]
    I -->|Timeout| K[Reassign / Escalate]

    J --> L[Trip IN_PROGRESS]
    L --> M[Trip CLOSED]

    H --> N[Operator Notification]

    style J fill:#c8e6c9
    style M fill:#c8e6c9
    style H fill:#ffccbc
    style N fill:#ffcdd2
```

## Estados del Viaje

```mermaid
stateDiagram-v2
    [*] --> DRAFT

    DRAFT --> QUOTED: tarifa calculada
    QUOTED --> CONFIRMED: usuario confirma
    CONFIRMED --> ASSIGNED: chofer acepta
    ASSIGNED --> IN_PROGRESS: viaje inicia
    IN_PROGRESS --> CLOSED: viaje completa
    CONFIRMED --> DRAFT: cancela/reprograma
```

## Referencia

- Dispatch service: `src/lib/services/dispatch/dispatch.service.ts`
- Fleet validation: `src/lib/services/dispatch/fleet-validation.ts`
- Trip execution: `src/lib/services/trip-execution/trip-execution.service.ts`
