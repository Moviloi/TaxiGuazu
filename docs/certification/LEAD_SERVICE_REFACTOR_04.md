# LEAD SERVICE REFACTOR 04 — Awaiting Confirmation Handler
## Misión A5 | Julio 2026

---

## Responsabilidad extraída

`handleAwaitingConfirmation` — manejo del estado `awaiting_confirmation`. Confirmación de viaje (NOW o FUTURO), cancelación, y re-pregunta.

## Antes / Después

| Métrica | Original | A2 | A3 | A4 | **A5 (actual)** |
|---|---|---|---|---|---|
| **lead.service.ts** | 752 | 579 | 506 | 442 | **341** |
| **Reducción** | — | −23% | −33% | −41% | **−55%** |
| **Módulos extraídos** | 0 | 1 | 2 | 3 | **4** |
| **Dead params eliminados** | 3 | 3 | 3 | 3 | **3** |

## Reducción por extracción

| Extracción | Líneas | Dominio |
|---|---|---|
| A2: `handleSlotConfirmationButton` | 172 | Workflow |
| A3: `parsePassengerCount` + `WORD_TO_NUM` | 72 | Extraction |
| A4: `handleAwaitingPassenger` | 90 | Workflow |
| **A5: `handleAwaitingConfirmation`** | **70** | **Workflow** |
| **Total** | **404 / 752 (54%)** | — |

## Dependencias eliminadas de lead.service.ts

| Import | Eliminado |
|---|---|
| `executeNowTrip` | ✅ |
| `resolvePricingForSlots` | ✅ |

## Validación

| Gate | Resultado |
|---|---|
| Build | ✅ PASS |
| Tests | 875/876 (fase-22 T2 histórico) |
| Regresiones | 0 |

## Próximos candidatos

`lead.service.ts` en 341 líneas ya actúa casi puramente como orquestador. Los bloques restantes son:
- `slot_confirmation` text handler (~85 líneas) — último bloque >50 líneas
- Ambiguity handler zone (~25 líneas)
- Post-booking zone (~25 líneas, B2)
