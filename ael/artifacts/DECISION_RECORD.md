# DECISION RECORD — Language & Slot Context Fixes

## Context
Usuario reportó que el idioma no persiste en el chat, las confirmaciones se pierden y el contexto se reinicia entre turnos. Auditoría identificó 3 causas raíz que fueron corregidas.

## Decisiones

### D1: Threshold de sessionLang > 0.5 en vez de >= 0.5
**Archivo:** `detect-lang.ts:67,49`
**Problema:** "hotel" en texto español da confidence exacta 0.5 (1 keyword × 0.2 + 0.3 base) → detecta inglés sin consultar sessionLang.
**Decisión:** Cambiar threshold a `> 0.5` para que confianza borderline (0.5) caiga al fallback de sessionLang.
**Alternativa descartada:** Sacar "hotel" de listas EN. Riesgo: no detectar usuarios que solo dicen "hotel" en inglés sin otras keywords.
**Fundamento:** El contexto de sesión debe prevalecer en casos borderline. Usuarios ingleses que escriben "hotel" + otra palabra (ej: "hotel booking") dan confidence > 0.5.

### D2: Merge de slots previos restaura valor si LLM alucina
**Archivo:** `extraction-runner.ts:433-444`
**Problema:** Cuando LLM devuelve un slot con valor diferente al previo, el merge no distinguía entre alucinación y cambio legítimo del usuario.
**Decisión:** Si el slot previo y el nuevo difieren, verificar si el valor nuevo aparece en el texto del usuario. Si no aparece, es alucinación → restaurar slot previo.
**Alternativa descartada:** Siempre dar prioridad al slot previo. Riesgo: usuario cambia de opinión pero el sistema ignora el nuevo valor.
**Alternativa descartada:** Siempre dar prioridad al LLM. Riesgo: alucinaciones en cada turno pierden el contexto.

### D3: DESDE_RE incluye "de" y "del"
**Archivo:** `core.ts:70`
**Problema:** Usuarios dicen "del aeropuerto" (sin "desde") y el patrón no captura origen.
**Decisión:** Agregar `de(?:l)?` al alternation de DESDE_RE.
**Riesgo:** Falsos positivos mínimos — "de" es común en español pero el lookahead restringe a contextos de destino/verbo.

## Estado Post-Fix
- Idioma: sessionLang overridea detección borderline
- Slots: merge preserva valores previos cuando LLM alucina
- Origen: "del aeropuerto" ahora se captura como origen
