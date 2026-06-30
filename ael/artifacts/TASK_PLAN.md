# TASK_PLAN — P0: Bug LLM + G7 + GREETING corto

Generado por: **Director**
Fase del pipeline: `PLANNING`
Estado: `COMPLETE` (artifact generado)

---

## Goal

Corregir las 3 fallas críticas detectadas en la conversación de prueba del bot:

1. **Bug en validación LLM** — `!swapped` invertido en llm-response.ts rechaza respuestas válidas del LLM
2. **G7 bug** — Cuando el usuario escribe con typos ("queiro ira"), el sistema no puede extraer destino ni preguntar específicamente
3. **GREETING verboso** — La respuesta de bienvenida es demasiado larga

## Scope

### Archivos modificables
- `src/lib/ai/llm-response.ts` — Bug `!swapped` → `swapped` (P0.1) + relajar validación extractedIntent (P0.2a)
- `src/lib/ai/extraction-runner.ts` — Cuando coreDecisionEarly está activo, no re-validar contra regex de CORE (P0.2a)
- `src/lib/services/extraction/comprehension.ts` — getRecoveryMessage() consulta roleLock (P0.2b) + importa inferMissingFieldFromCore (P0.2c)
- `src/lib/ai/response-builder.ts` — inferMissingFieldFromCore ya existe (dormant), solo se importará
- Archivo de system prompt para GREETING (a localizar) (P0.3)

### Archivos NO modificables
- `docs/adr/*` — sin cambios
- `ael/*` — solo artifacts actualizables
- `src/lib/db/*` — sin cambios en DB
- `src/lib/services/pricing/*` — sin cambios
- `src/lib/services/geo/*` — sin cambios
- `src/lib/services/memory/*` — sin cambios

## Priority

**CRITICAL** — Bloquea la experiencia del usuario en la conversación de prueba. El bug `!swapped` hace que el LLM parezca peor de lo que realmente es.

## Phases

### Fase 1: Bug `!swapped` (P0.1)
- **Objetivo:** Corregir `!swapped` → `swapped` en llm-response.ts:93
- **Archivo:** `src/lib/ai/llm-response.ts`
- **Cambio:** `if (isSwapped && validation.hasBothPlaces && swapped)` — 1 línea
- **Criterio de éxito:** Tests de llm-response pasan

### Fase 2: Liberar Groq + comprehension (P0.2)
- **2a — Librear Groq:** En extraction-runner.ts, cuando `coreDecisionEarly`, relajar validación regex para permitir que el LLM clasifique IR_A/DESDE_A aunque el regex de CORE no matchee (por typos)
- **2b — getRecoveryMessage con roleLock:** En comprehension.ts, consultar leadCore.roleLock para preguntar específicamente "¿A dónde?" si origin detectado, "¿Desde dónde?" si destination detectado
- **2c — inferMissingFieldFromCore:** Importar y usar como fallback cuando Groq + roleLock no resuelven
- **Criterio de éxito:** `estoy en el aeropuerto y queiro ira al centro` → pregunta "¿A dónde?" o extrae destino

### Fase 3: GREETING corto (P0.3)
- **Objetivo:** Agregar regla en system prompt para que GREETING sea de 1-2 líneas
- **Archivo:** A localizar (template de system prompt para LLM)
- **Criterio de éxito:** `hola` → responde en ≤2 líneas

### Fase 4: Validación
- **Objetivo:** Tests + build + enforce pasan
- **Comandos:** `npm test`, `npm run build`, `bash ael/contracts/enforce.sh`
- **Criterio de éxito:** All PASS

## Constraints

- **R1:** No modificar contratos entre capas
- **R2:** No crear dependencias que violen ADR 001-004
- **R3:** No asumir implementación que no exista — verificar cada archivo antes de editarlo
- **No sobre-ingeniería:** Los cambios son puntuales, no refactors completos

## Success Criteria

1. Bug `!swapped` corregido (1 línea)
2. LLM puede clasificar intent aunque regex de CORE no matchee (typos)
3. `getRecoveryMessage()` pregunta específicamente por campo faltante
4. `inferMissingFieldFromCore()` activado como fallback
5. GREETING corto (≤2 líneas)
6. `npm test` — PASS
7. `npm run build` — PASS
8. `bash ael/contracts/enforce.sh` — PASS
