# 12 — Workflow State Machine

> **Resumen:** M�quina de estados conversacionales con 7 estados y l�gica de expiraci�n de sesi�n.


Máquina de estados conversacionales del sistema.
Define 7 estados con transiciones validades por `VALID_SLOT_TRANSITIONS`.

```mermaid
stateDiagram-v2
    [*] --> idle

    idle --> collecting_slots: extracción con datos parciales
    idle --> awaiting_confirmation: extracción completa

    collecting_slots --> collecting_slots: nuevo turno con datos parciales
    collecting_slots --> slot_confirmation: ubicación ambigua
    collecting_slots --> awaiting_confirmation: todos los campos completos

    slot_confirmation --> collecting_slots: usuario corrige
    slot_confirmation --> awaiting_passenger: confirmó ubicación, falta pasajeros
    slot_confirmation --> awaiting_confirmation: confirmó + pasajeros OK
    slot_confirmation --> pending_human_review: corrección inviable requiere admin

    awaiting_passenger --> collecting_slots: usuario modifica datos
    awaiting_passenger --> awaiting_confirmation: pasajeros OK

    awaiting_confirmation --> collecting_slots: usuario modifica datos

    pending_human_review --> idle: resuelto por admin

    ambiguity_pending --> slot_confirmation: usuario responde opción
    ambiguity_pending --> idle: usuario cancela
    ambiguity_pending --> collecting_slots: usuario da nuevo input

    note right of idle
        Session expiry (>48h inactividad
        o trip vencido) → idle
    end note
```

## Detalle de Estados

| Estado | Significado | Transiciones válidas |
|--------|-------------|---------------------|
| `idle` | Sin conversación activa | → collecting_slots, awaiting_confirmation |
| `collecting_slots` | Recolectando datos del viaje | → collecting_slots, slot_confirmation, awaiting_confirmation |
| `slot_confirmation` | Confirmando ubicación ambigua | → collecting_slots, awaiting_passenger, awaiting_confirmation, pending_human_review |
| `awaiting_passenger` | Esperando número de pasajeros | → collecting_slots, awaiting_confirmation |
| `awaiting_confirmation` | Todos los datos, esperando OK | → collecting_slots |
| `pending_human_review` | Requiere intervención de admin | → idle |
| `ambiguity_pending` | Desambiguando ubicación con LLM | → slot_confirmation, idle, collecting_slots |

## Session Expiry

- **Inactividad >48h**: `checkSessionExpiry()` resetea a `idle` (`slot-workflow.ts:33-56`)
- **Trip vencido**: Si `scheduled_at` está en pasado, resetea sesión
- Ambos casos registran log y persisten el reset

## Referencias

- Type definition: `src/lib/ai/types.ts:17` — 7 estados literales
- State machine transitions: `src/lib/services/workflow/slot-workflow.ts:23-31`
- Session expiry: `src/lib/services/workflow/slot-workflow.ts:33-56`
- Evaluate transition: `src/lib/services/workflow/slot-workflow.ts:58-117`
- State accessors: `src/lib/db/state-accessors.ts`
---

## Diagramas relacionados

- [06-confidence-model.md](06-confidence-model.md) � confidence-model
- [13-slot-confidence-evolution.md](13-slot-confidence-evolution.md) � slot-confidence-evolution
- [16-policy-pipeline.md](16-policy-pipeline.md) � policy-pipeline
