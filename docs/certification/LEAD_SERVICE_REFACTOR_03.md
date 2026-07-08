# LEAD SERVICE REFACTOR 03 — Awaiting Passenger Handler
## Misión A4 | Julio 2026

---

## Responsabilidad extraída

`handleAwaitingPassenger` — manejo completo del estado conversacional `awaiting_passenger`. El usuario vio precios y se espera que indique cantidad de pasajeros. El handler cubre: parseo determinístico (regex), fallback LLM, validación de límite (≤6), resolución de pricing con passenger count real, transición de estado, y respuestas de re-pregunta.

## Antes / Después

| Métrica | Original | A2 | A3 | **A4 (actual)** |
|---|---|---|---|---|
| **lead.service.ts** | 752 | 579 | 506 | **416** |
| **Reducción acumulada** | — | −23% | −33% | **−45%** |
| **Funciones en lead.service** | 3 | 2 | 1 | **1** |
| **Nuevos módulos** | — | 1 | 2 | **3** |

## Reducción por extracción

| Extracción | Líneas | Dominio |
|---|---|---|
| A2: `handleSlotConfirmationButton` | 172 | Workflow |
| A3: `parsePassengerCount` + `WORD_TO_NUM` | 72 | Extraction |
| **A4: `handleAwaitingPassenger`** | **90** | **Workflow** |
| **Total** | **334 / 752 (44%)** | — |

## Dependencias eliminadas de lead.service.ts

| Import | Motivo |
|---|---|
| `extractSlots` | Solo usado en awaiting_passenger |
| `parsePassengerCount` | Solo usado en awaiting_passenger |
| `ExtractionContext` (type) | Solo usado en awaiting_passenger |

## Validación

| Gate | Resultado |
|---|---|
| Build | ✅ PASS |
| Tests | 875/876 (fase-22 T2 histórico) |
| Contratos | ✅ R1-R4 PASS |
| Regresiones | 0 |

## Próximo candidato

**`awaiting_confirmation` state handler** (~70 líneas). Es el siguiente bloque cohesivo más grande. Maneja: afirmación → executeNowTrip (NOW) o pending_human_review (FUTURO), negación → collecting_slots, re-pregunta.

lead.service.ts ahora está en 416 líneas, actuando principalmente como orquestador con 5 zonas de estado delegadas.
