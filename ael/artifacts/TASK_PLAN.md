# TASK PLAN — Language & Slot Context Fixes

## Goal
Corregir 3 bugs que causan pérdida de contexto de idioma y slots en el flujo de booking.

## Scope
Archivos a modificar:
- `src/lib/detect-lang.ts` — threshold de sessionLang override
- `src/lib/services/extraction/extraction-runner.ts` — merge de slots previos
- `src/lib/ai/core.ts` — DESDE_RE para "de"/"del"

Archivos solo lectura:
- `src/lib/ai/groq.ts` — verificar detectLang local (no requiere cambio)

## Fixes

| ID | Archivo | Líneas | Cambio | Riesgo |
|----|---------|--------|--------|--------|
| P0 | `extraction-runner.ts` | 433-439 | Merge restaura slot previo si LLM alucina (comparando contra texto del usuario) | Bajo |
| P1 | `detect-lang.ts` | 67 | `>= 0.5` → `> 0.5` para que sessionLang overridee borderline | Muy bajo |
| P1b | `detect-lang.ts` | 49 | Ídem en `resolveLang()` | Muy bajo |
| P2 | `core.ts` | 70 | `DESDE_RE` incluya `de` y `del` | Muy bajo |

## Priority
P0 > P1 > P1b > P2

## Phases
1. **Explorer** — Mapear estado actual de los 4 archivos
2. **Architect** — Validar que cambios no violen ADR 001-004 ni contratos
3. **Implementer** — Aplicar P0, P1, P1b, P2 en ese orden
4. **Auditor** — Verificar tests, build y enforce.sh
5. **Memory** — Registrar decisiones
6. **Learning** — Extraer patrones si aplica
