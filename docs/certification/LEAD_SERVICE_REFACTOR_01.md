# LEAD SERVICE REFACTOR 01 — Slot Confirmation Handler
## Misión A2 | Julio 2026

---

## Responsabilidad extraída

`handleSlotConfirmationButton` — manejo de botones interactivos durante la confirmación de slots (`slot_confirm`, `slot_change`, `change_origin`, `change_destination`, `change_passengers`, `change_scheduled_at`, `change_back`).

## Motivo de la elección

- **Frontera de dominio clara**: pertenece al dominio Workflow (confirmación de slots), no al orquestador.
- **Alta cohesión**: 172 líneas que manejan exclusivamente routing de botones de confirmación.
- **Bajo acoplamiento**: función ya exportada con interfaz limpia. Sin dependencias internas de `handleLeadMessage`.
- **Pocos consumers**: 4 call sites (3 en lead.service.ts, 1 en test e2e).
- **Dead params removidos**: `_history`, `_customerName`, `_leadCore` (3 params sin uso).

## Antes / Después

| Métrica | Antes | Después |
|---|---|---|
| **lead.service.ts** | 752 líneas | **579 líneas** (−173, −23%) |
| **Archivos** | 1 | 2 |
| **Imports en lead.service.ts** | 33 | 30 (−3) |
| **Dead params** | 3 | 0 |
| **Nuevo módulo** | — | `slot-confirmation-handler.ts` (172L) |
| **Tests** | 874/876 | 874/876 (=) |

## Reducción de acoplamiento

| Dependencia | Extraída de lead.service.ts |
|---|---|
| `buildFieldSelector`, `getSuggestionType` | ✅ Ya no importados |
| `logEvent` | ✅ Ya no importado |
| `ExtractionResult` (type) | ✅ Ya no importado |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/lib/services/lead.service.ts` | −173 líneas, +1 import, −4 imports, actualizados 3 call sites |
| `src/lib/services/workflow/slot-confirmation-handler.ts` | **NUEVO** (172 líneas) |
| `tests/integration/fase-20-slot-confirmation-flow.test.ts` | Import actualizado + firmas de call |
| `tests/e2e/improved-flows.test.ts` | Import actualizado + firma de call |
| `tests/integration/fase-29.2-slot-confirmation-routing.test.ts` | Import actualizado |

## Riesgos

| Riesgo | Estado |
|---|---|
| Regresiones | 0 |
| Romper flujo de confirmación | Descartado — 26 tests específicos pasan |
| Contratos | R1-R4 PASS |

## Próximos candidatos de extracción

| Candidato | Líneas | Prioridad |
|---|---|---|
| `parsePassengerCount` + `WORD_TO_NUM` | ~70 | ALTA — puro, sin dependencias |
| `awaiting_passenger` handler | ~91 | MEDIA — requiere extraer del medio de handleLeadMessage |
| `awaiting_confirmation` handler | ~69 | MEDIA — ídem |
| `slot_confirmation` text handler | ~97 | MEDIA — ídem |
