# LEAD SERVICE REFACTOR 02 — Passenger Count Parser
## Misión A3 | Julio 2026

---

## Responsabilidad extraída

`parsePassengerCount` + `WORD_TO_NUM` — parseo determinístico de cantidad de pasajeros desde texto libre (capa regex del híbrido regex+LLM).

## Motivo de la elección

- **Dominio claro**: pertenece a Extraction (parseo de slots), no al orquestador.
- **Cero acoplamiento**: función pura, sin imports, sin efectos laterales, sin dependencias externas.
- **Riesgo nulo**: ningún consumer fuera de `handleLeadMessage`. La firma no cambió.
- **Mayor cohesión posible**: 72 líneas de una sola responsabilidad.

## Antes / Después

| Métrica | A1 (previo) | A2 (anterior) | **A3 (actual)** |
|---|---|---|---|
| **lead.service.ts** | 752 | 579 | **506** (−246, −33%) |
| **Funciones** | 3 | 2 | **1** (solo handleLeadMessage) |
| **Nuevos módulos** | — | 1 | **2** |

## Reducción acumulada

| Extracción | Líneas extraídas | Dominio |
|---|---|---|
| A2: `handleSlotConfirmationButton` | 172 | Workflow |
| A3: `parsePassengerCount` + `WORD_TO_NUM` | 72 | Extraction |
| **Total** | **244 / 752 (32%)** | — |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/lib/services/lead.service.ts` | −72 líneas, +1 import |
| `src/lib/services/extraction/passenger-count.ts` | **NUEVO** (72 líneas) |

## Validación

| Gate | Resultado |
|---|---|
| Build | ✅ PASS |
| Tests | 875/876 |
| Contratos | ✅ R1-R4 PASS |
| Regresiones | 0 |

## Próximos candidatos

| Candidato | Líneas | Prioridad |
|---|---|---|
| `awaiting_passenger` state handler | ~91 | **SIGUIENTE** |
| `awaiting_confirmation` state handler | ~69 | MEDIA |
| `slot_confirmation` text handler | ~97 | MEDIA |
