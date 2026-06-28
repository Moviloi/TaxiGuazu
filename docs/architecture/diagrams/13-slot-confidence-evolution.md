# 13 — Slot Confidence Evolution

Evolución de certeza de slots entre turnos de conversación.

```mermaid
sequenceDiagram
    participant U as Usuario
    participant C as CORE
    participant R as Resolver
    participant P as POLICY

    U->>C: estoy en aeropuerto quiero ir al centro

    C->>C: origin=aeropuerto
    C->>C: destination=centro
    C->>C: roleLock aplicado

    C->>R: resolver ubicaciones

    R->>R: aeropuerto = ambiguo
    R->>R: centro = zona válida

    R-->>P: extractionContext

    P->>P: RESERVA

    P-->>U:
        Tengo origen aeropuerto
        y destino centro.
        ¿A qué hora necesitás el viaje?
```

## Evolución Típica

### Turno 1: "estoy en el aeropuerto quiero ir al centro"

| Slot | Value | Score | Status | Reason |
|------|-------|-------|--------|--------|
| origin | "aeropuerto" | 0.6 | CONFIRMATION_PENDING | ambiguous_term |
| destination | "centro" | 0.6 | CONFIRMATION_PENDING | ambiguous_term |
| passengers | null | 0.0 | MISSING | missing |
| **overallConfidence** | **0.4** | | | → action: clarify |

### Turno 2: "4 personas, a las 10"

| Slot | Value | Score | Status | Reason |
|------|-------|-------|--------|--------|
| origin | "aeropuerto" | 0.6 | CONFIRMATION_PENDING | (se preserva) |
| destination | "centro" | 0.6 | CONFIRMATION_PENDING | (se preserva) |
| passengers | 4 | 1.0 | INFERRED | direct_extraction |
| scheduled_at | "10:00" | 0.8 | INFERRED | time_parsed |
| **overallConfidence** | **0.75** | | | → action: proceed |

### Turno 3: "sí, correcto" (confirma ubicaciones)

| Slot | Value | Score | Status | Reason |
|------|-------|-------|--------|--------|
| origin | "aeropuerto" | 1.0 | CONFIRMED | USER_CONFIRMED |
| destination | "centro" | 1.0 | CONFIRMED | USER_CONFIRMED |
| passengers | 4 | 1.0 | INFERRED | (se preserva) |
| scheduled_at | "10:00" | 0.8 | INFERRED | (se preserva) |
| **overallConfidence** | **1.0** | | | → proceed → cotización |

## Referencia

- Confidence scoring: `src/lib/services/extraction/confidence.ts`
- Slot states: `src/lib/ai/slot-state.ts`
- Thresholds: `src/config/constants.ts:42-43`
