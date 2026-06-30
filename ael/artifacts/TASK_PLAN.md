# TASK PLAN — Issue 6+7: Prompt philosophy + confirmación implícita

## Goal
Cerrar los gaps de confirmación implícita y hacer que `policyHint` modifique activamente el comportamiento del LLM de respuesta según el modo (AHORA vs RESERVA vs INFO).

## Scope
Archivos a modificar:
- `src/lib/ai/llm-response.ts` — policyHint como behavioral modifier real
- `src/lib/ai/types.ts` — si hace falta extender PolicyOutput
- `src/lib/services/workflow/policy-pipeline.ts` — hook de implicit confirmation en idle
- `src/lib/services/lead.service.ts` — manejar "sí" suelto en estados no-standard

Archivos solo lectura:
- `src/lib/ai/policy-ahora.ts`
- `src/lib/ai/policy-reserva.ts`
- `src/lib/ai/extraction-prompt.ts`
- `src/lib/ai/ambiguity-interpreter.ts`

## Priority
HIGH

## Analysis (from Explorer)

### Issue 6 — Prompt philosophy
- `extraction-prompt.ts` y `llm-response.ts` ya son behavioral: guían QUÉ hacer, no CÓMO decirlo exactamente
- `policyHint` se inyecta en `buildResponsePrompt()` como un string genérico:
  - AHORA: `"AHORA: ejecutar acción inmediata."`
  - RESERVA: `"RESERVA: ejecutar acción con confirmación obligatoria."`
  - Estos NO modifican el comportamiento real del LLM — son decorativos
- **Fix:** Convertir policyHint en behavioral guidelines diferentes por modo

### Issue 7 — Implicit confirmation
| Estado | Affirmation manejado? |
|--------|----------------------|
| `awaiting_confirmation` | ✅ (Issue 5 fix) |
| `slot_confirmation` | ✅ |
| `awaiting_passenger` | ✅ |
| `idle` | ❌ |
| `collecting_slots` | ❌ (sin prevSlotsLocation) |
| AHORA mode | ❌ (no usa awaiting_confirmation) |

- **Fix:** Agregar manejo de afirmación en idle (con prevSlots check) y en collecting_slots

## Phases

### Phase 1: Architect
Validar plan contra ADRs. Especial atención a:
- ADR 001 (capsulas vs monolitos) — el prompt upgrade no rompe capsulas
- ADR 004 (llamadas a db desde AI) — no aplica
- R5 implícito: "No atar las manos del LLM" — behavioral guidelines están OK

### Phase 2: Implementer — Issue 7 (implicit confirmation gaps)
1. En `lead.service.ts`, después del COMBINED_GREETING zone:
   - Detectar `isAffirmativeMessage(trimmed)` en estados `idle` o `collecting_slots`
   - Si hay session slots previos → tratar como confirmation implícita y redirigir a policy pipeline
2. En `policy-pipeline.ts`:
   - Asegurar que AHORA mode también pueda pasar por `awaiting_confirmation`
   - (Opcional, requiere más análisis)

### Phase 3: Implementer — Issue 6 (policyHint upgrade)
1. En `llm-response.ts:buildResponsePrompt()`:
   - Expandir `policyHint` a behavioral guidelines según el modo
   - AHORA: énfasis en inmediatez, sin preguntar de más
   - RESERVA: énfasis en claridad, opciones de horario
   - INFO: énfasis en informar, dirigir a booking si aplica

### Phase 4: Auditor
- `npm test` — todos los tests existentes deben seguir pasando
- `npm run build` — sin errores
- `bash ael/contracts/enforce.sh` — R1, R2, R3

### Phase 5: Memory
- Registrar decisión: prompt philosophy upgrade + implicit confirmation gaps

### Phase 6: Learning
- Extraer patrón: no relevante
