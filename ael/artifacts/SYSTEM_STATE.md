# SYSTEM STATE — Language & Slot Context Fixes

## Target Files

### 1. `src/lib/detect-lang.ts` (74 líneas)

**Función `detectLangWithFallback()` — línea 62-74:**
```typescript
export function detectLangWithFallback(
  text: string,
  sessionLang?: string | null,
): Lang {
  const fast = detectExtendedLang(text);
  if (fast.confidence >= 0.5) {           // ← línea 67: threshold a cambiar
    return fast.lang === "pt" ? "pt" : fast.lang === "en" ? "en" : "es";
  }
  if (sessionLang && (sessionLang === "en" || sessionLang === "pt")) {
    return sessionLang;
  }
  return "es";
}
```

**Función `resolveLang()` — línea 43-57:**
```typescript
export function resolveLang(
  text: string,
  extractionResult?: { language?: string | null } | null,
): ExtendedLang {
  const fast = detectExtendedLang(text);
  if (fast.confidence >= 0.5) return fast.lang;  // ← línea 49: threshold a cambiar
  const llmLang = extractionResult?.language;
  if (typeof llmLang === "string" && LANG_GROUPS.some((g) => g.lang === llmLang)) {
    return llmLang as ExtendedLang;
  }
  return fast.lang;
}
```

**Función `detectExtendedLang()` — línea 22-39:**
```typescript
if (best.score === 0) return { lang: "es", confidence: 0.3 };
return { lang: best.lang, confidence: Math.min(0.3 + best.score * 0.2, 0.95) };
```
Con score=1 (ej: "hotel" en texto): confidence = 0.3 + 1*0.2 = 0.5

### 2. `src/lib/services/extraction/extraction-runner.ts` (592 líneas)

**Bloque `prevSlotsEarly` merge — líneas 433-439:**
```typescript
for (const [k, v] of Object.entries(prevSlotsEarly)) {
  if (v != null && String(v).trim() !== "") {
    if (!confidenceResult.slots[k]) {
      confidenceResult.slots[k] = { value: String(v), score: 0.8, reason: "previous_turn" };
    }
  }
}
```

**RoleLock override — líneas 440-459:**
```typescript
if (coreDecisionEarly.roleLock?.origin) {
  if (!confidenceResult.slots.origin || confidenceResult.slots.origin.score === 0 || confidenceResult.slots.origin.value == null) {
    confidenceResult.slots.origin = { value: coreDecisionEarly.roleLock.origin, score: 0.6, reason: "core_role_lock" };
  }
}
if (coreDecisionEarly.roleLock?.destination) {
  if (!confidenceResult.slots.destination || confidenceResult.slots.destination.score === 0 || confidenceResult.slots.destination.value == null) {
    confidenceResult.slots.destination = { value: coreDecisionEarly.roleLock.destination, score: 0.6, reason: "core_role_lock" };
  }
}
```

**Persistence gap — línea 559:**
```typescript
await upsertChatSession(phone, mergedWithMemory, mergedConfidence, workflowResult.state, workflowResult.clarifyField ?? undefined, JSON.stringify(slotStates));
```
Solo dentro de `if (parsed.success)`.

**tryFallbackExtraction — línea 574-589:** No llama a `upsertChatSession`.

### 3. `src/lib/ai/core.ts` (408 líneas)

**DESDE_RE — línea 70:**
```typescript
const DESDE_RE = /(?:desde|partiendo\s+de|saliendo\s+de)\s+(?:el\s+|la\s+|los\s+|las\s+|al\s+|del\s+)?([a-záéíóúñ][a-záéíóúñ\s]{1,40}?)(?=\s*(?:hasta|\ba\b\s+(?:el|la|los|las)|\ba\b\s+[a-záéíóúñ]{3,}|\bvoy\b|\bir\b|\bquiero\b|\bvamos\b|\bnecesito\b|pero|\by\b|[,;.!?]|$))/i;
```
Solo matchea: `desde`, `partiendo de`, `saliendo de`. NO matchea: `de`, `del`.

### 4. `src/lib/ai/groq.ts` (65 líneas) — SOLO LECTURA (verificar)

**detectLang local — líneas 12-20:**
```typescript
function detectLang(text: string): "es" | "en" | "pt" {
  const lower = text.toLowerCase();
  const ptMarkers = ["você", "obrigado", "bom dia", "boa tarde", "boa noite", "quanto custa", "valor", "por favor", "obrigada", "tudo bem", "por gentileza", "preciso", "gostaria"];
  const enMarkers = ["hello", "hi", "how much", "price", "airport", "booking", "tomorrow", "today", "please", "thanks", "help", "where", "hotel", "need", "i want", "how far"];
  if (ptMarkers.some(marker => lower.includes(marker))) return "pt";
  if (enMarkers.some(marker => lower.includes(marker))) return "en";
  return "es";
}
```
Esta función es independiente de `detect-lang.ts`. Se usa en `generateGroqExtraction()` línea 31 para definir `IDIOMA_DETECTADO` en el prompt de extracción. Contiene `"hotel"` en `enMarkers`.

**Decisión:** NO modificar groq.ts. El `IDIOMA_DETECTADO` en el prompt es una señal, no un bloqueo. Si el LLM recibe contexto de conversación en español y `IDIOMA_DETECTADO: EN`, igual puede extraer en español. El bug real está en `detectLangWithFallback()` (P1) que decide el idioma de respuesta.

## Tests Relacionados

Buscar tests en `tests/`:
- `tests/ai/core-intents.test.ts` — tests de CORE, incluye regex de origen/destino
- `tests/services/extraction-runner.test.ts` — tests del pipeline de extracción
- `tests/integration/fase-22-correction-flow.test.ts` — tests de corrección de slots
- `tests/policies/` — tests de políticas que usan slots
- Tests de detect-lang (si existen)

**Nota:** Los tests están actualmente rotos (67 suites fallan por problema de alias `@/` en vitest). No es responsivo a estos cambios.

## Riesgos Identificados

| Fix | Riesgo | Mitigación |
|-----|--------|------------|
| P0 (merge slots) | Falso positivo: restaurar slot viejo cuando usuario realmente cambió de opinión | Se compara contra texto del usuario; si el usuario mencionó el nuevo valor, se preserva |
| P1 (threshold) | Falso negativo: usuario inglés dice SOLO "hotel" → no detectado como inglés | sessionLang cubre sesiones existentes; otras palabras inglesas siguen funcionando |
| P2 (DESDE_RE) | Falso positivo: "de tal lugar" malinterpretado como origen | Lookahead limita a patrones de destino/verbo después |
