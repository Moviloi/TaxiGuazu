# PATTERN EXTRACTION — Language & Slot Context Fixes

## 1. Patrón: Falsos positivos en detección de idioma por palabras multilingües

**Observación:** `detectExtendedLang()` asigna score +1 por cada keyword encontrada en el texto. Palabras que existen en múltiples idiomas (hotel EN/ES/FR/DE/IT/PT, aeroporto PT/IT, airport EN/FR/DE) pueden causar detección incorrecta.

**Términos comunes en múltiples idiomas en `detect-lang.ts:6-11`:**

| Término | EN | ES | PT | FR | DE | IT |
|---------|:--:|:--:|:--:|:--:|:--:|:--:|
| hotel | ✅ | (implícito) | (implícito) | ✅ | ✅ | ✅ |
| airport | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| aéroport | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| aeroporto | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |

**Patrón identificado:** Cuando `score = 1`, confidence = 0.5 exacto. Cualquier palabra que exista en otra lista puede dar falso positivo si el usuario solo usa esa palabra como keyword detectada.

**Acción futura:** Para cualquier palabra borderline, considerar: (a) umbral > 0.5 para sessionLang override, (b) verificar si la palabra aparece en listas de otros idiomas y descontar.

## 2. Patrón: Merge de slots previos sin verificar alucinación

**Observación:** El patrón `if (!confidenceResult.slots[k])` se usaba en 1 lugar del código (`extraction-runner.ts:435`). Ahora corregido con verificación de texto.

**Patrón similar en roleLock (líneas 446-464):**
```typescript
if (!confidenceResult.slots.origin || confidenceResult.slots.origin.score === 0 || ...)
```
Este bloque YA maneja correctamente el caso: solo sobreescribe si el slot no existe, tiene score 0, o valor null. No necesita fix porque roleLock solo se aplica cuando CORE detectó estructura sintáctica explícita (mayor confianza que LLM para ese slot).

**Lección:** La condición `!confidenceResult.slots[k]` es demasiado débil cuando el LLM puede alucinar valores. Cualquier merge futuro debe verificar: (a) el slot existe en el LLM, (b) el valor es consistente con el input del usuario, (c) el slot previo no tiene un valor más confiable.

## 3. Patrón: Regex que no cubren lenguaje natural rioplatense

**Observación:** Los patrones de CORE (`core.ts:68-74`) fueron diseñados para español formal pero no cubren variantes coloquiales:

| Expresión coloquial | Intención | ¿Capturada? |
|---------------------|-----------|:-----------:|
| "del aeropuerto" | origen | ❌ (ahora ✅ con P2) |
| "de capital" | origen | ❌ (ahora ✅ con P2) |
| "para el centro" | destino | ❌ |
| "me dejás en..." | destino | ❌ |
| "necesito ir a..." | destino | ✅ (IR_A_RE con "necesito") |
| "te busco en..." | origen | ❌ |

**Acción futura:**
- `PARA_RE = /para\s+(?:el\s+|la\s+)?([a-záéíóúñ\s]{1,40}?)(?=\s*(?:desde|por|gracias|$))/i` — cubrir "para el centro"
- `DEJAR_RE = /(?:me\s+dej[áa]s\s+(?:en|sobre)\s+|dej[áa]me\s+(?:en|sobre)\s+|te\s+busco\s+(?:en|sobre)\s+)([a-záéíóúñ\s]{1,40}?)(?=\s*(?:por|gracias|$))/i` — cubrir "me dejás en X"

## 4. Patrón: Slots no persistidos en rutas alternas

**Observación:** `upsertChatSession` se llama en:
- `extraction-runner.ts:559` ✅ (dentro de `parsed.success`)
- `tryFallbackExtraction()`: ❌ NO llama a `upsertChatSession`

**Impacto:** Si la extracción LLM falla (JSON inválido, timeout) y el fallback regex encuentra origen+destino, esos slots no se persisten en DB. En el siguiente turno, `loadPreviousSlots()` retorna {} y el contexto se pierde.

**Solución pendiente:** Agregar `upsertChatSession` en `tryFallbackExtraction()` o en la línea 574-589 después del fallback exitoso. Actualmente fuera de scope de este pipeline.

## Resumen

| # | Patrón | Archivos | Severidad |
|---|--------|----------|-----------|
| 1 | Palabras multilingües en detección de idioma | `detect-lang.ts` | Media (mitigado por P1) |
| 2 | Merge de slots sin verificar alucinación | `extraction-runner.ts` | Alta (corregido por P0) |
| 3 | Regex incompletas para español coloquial | `core.ts` | Media (parcial corregido por P2) |
| 4 | Slots no persistidos en fallback | `extraction-runner.ts` | Alta (pendiente) |
