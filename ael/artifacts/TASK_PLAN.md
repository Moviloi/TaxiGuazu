# TASK PLAN — FUT-01: i18n framework real (es/pt)

**Status: IN PROGRESS**
**Priority: HIGH (P1)**
**Effort: M (~105 strings en ~10 archivos)**

## Goal

Crear un framework de traducción centralizado y traducir al portugués todos los mensajes al usuario. Brasileños reciben español hoy — el sistema detecta idioma pero responde hardcodeado en español.

## Scope

### Archivos a crear:
- `src/lib/services/i18n/catalog.ts` — Catálogo centralizado con TODAS las traducciones (es → pt)
- `src/lib/services/i18n/t.ts` — Función `t(key, lang)` simple para lookup

### Archivos a modificar:
- `src/lib/ai/types.ts` — Extender Lang (si hace falta)
- `src/lib/ai/response-builder.ts` — Reemplazar strings hardcodeados con t()
- `src/lib/ai/slot-confirmation.ts` — Usar `lang` param (hoy lo recibe pero lo ignora)
- `src/lib/timeouts.ts` — Agregar `lang` y traducir mensajes (re-engagement, driver, notificaciones)
- `src/lib/services/lead.service.ts` — Reemplazar strings hardcodeados con t()
- `src/lib/services/workflow/ambiguity-handler.ts` — Reemplazar strings en finalizeAmbiguity, handleAmbiguityResponse
- `src/lib/ai/handler.ts` — buildSafeFallback traducido
- `src/lib/ai/disambiguation-templates.ts` — Expandir catálogo de traducciones existente (ya tiene patrón)
- `src/lib/ai/policy-reserva.ts` — Strings ya tienen `lang`, migrar a catálogo central
- `src/lib/ai/policy-ahora.ts` — Idem

### Archivos NO modificados:
- `src/lib/detect-lang.ts` — Ya funciona, no tocar
- `src/lib/db/` — Sin cambios
- `src/app/api/` — Sin cambios (el lang ya se resuelve en servicios)
- `src/config/` — Sin cambios

## Design

### Translation Catalog (`src/lib/i18n/catalog.ts`)

```typescript
type Lang = "es" | "en" | "pt";

type TranslationValue = string | ((...args: any[]) => string);

interface TranslationCatalog {
  [key: string]: Record<Lang, TranslationValue>;
}
```

Estructura plana con keys semánticas agrupadas por categoría:
- `greeting.intro`, `greeting.withName`
- `clarify.origin`, `clarify.destination`, `clarify.time`, `clarify.passengers`
- `price.quote` — `"El traslado de {origin} a {destination} cuesta ${price} ARS."`
- `confirmation.summary`, `confirmation.ask`
- `reengagement.idle`, `reengagement.collecting`, `reengagement.generic`
- `error.fallback`, `error.escalation`, `error.global`
- `dispatch.searching`
- `booking.confirmed`, `booking.confirmedNoPrice`
- etc.

### t() function

```typescript
export function t(key: string, lang: Lang, params?: Record<string, string>): string {
  const entry = CATALOG[key];
  if (!entry) return `[MISSING:${key}]`;
  const value = entry[lang] ?? entry.es; // fallback a español
  if (typeof value === "function") return value(params);
  return params ? interpolate(value, params) : value;
}
```

### Prioridad de traducción
1. **Portugués (pt)** — objetivo principal (brasileños)
2. Español (es) — base, ya existe
3. Inglés (en) — secundario, menos urgente

### Flujo de lang
El `lang` ya se detecta en múltiples puntos vía `detectLeadLang(text)`. Muchas funciones ya lo reciben como parámetro. Donde no llega, se agrega como parámetro (timeouts.ts, handler.ts, etc.).

## Phases

### Phase 1: Framework (catalog.ts + t.ts)
1. Crear `src/lib/i18n/t.ts` con función `t(key, lang, params?)`
2. Crear `src/lib/i18n/catalog.ts` con TODAS las ~105 strings agrupadas por categoría
3. Traducir cada string al portugués
4. Verificar: import limpio, sin dependencias circulares

### Phase 2: Wire en response-builder.ts y slot-confirmation.ts
1. `response-builder.ts` — Reemplazar ~15 strings hardcodeados con `t()`
2. `slot-confirmation.ts` — Activar el `lang` param que ya recibe pero ignora (~7 strings)
3. `ambiguity-handler.ts` — finalizeAmbiguity, handleAmbiguityResponse

### Phase 3: Wire en timeouts.ts
1. Agregar `lang` param a checkReengagement(), checkReconfirmacion24hs(), etc.
2. El lang se puede detectar del phone del lead (o pasar como config)
3. Traducir ~10 strings entre re-engagement, driver, notificaciones

### Phase 4: Wire en lead.service.ts y handler.ts
1. `lead.service.ts` — Reemplazar ~12 strings hardcodeados en handleLeadMessage, handleSlotConfirmationButton
2. `handler.ts` — buildSafeFallback (detectar lang del contexto)
3. `policy-reserva.ts` y `policy-ahora.ts` — migrar strings existentes a catalog.ts (ya tienen lang param)

### Phase 5: Auditor
- `npm test` — todos los tests deben pasar (mocks de t() necesarios)
- `npm run build` — sin errores
- `bash ael/contracts/enforce.sh` — R1-R4

### Phase 6: Memory
- Registrar decisión FUT-01

## Archivos de test a modificar
- Múltiples test files mockean detect-lang — verificar que no se rompan con el nuevo import de t()
- Los tests existentes que verifican strings literales en español deben seguir pasando (es=default)
- timeouts.test.ts: verificar que los strings de re-engagement sigan funcionando con lang="es"

## Strings por archivo (estimado)
| Archivo | Strings | Ya tiene lang? |
|---------|---------|----------------|
| src/lib/ai/response-builder.ts | ~25 | Sí (mayoría) |
| src/lib/ai/slot-confirmation.ts | ~7 | Sí (ignorado) |
| src/lib/timeouts.ts | ~10 | NO |
| src/lib/services/lead.service.ts | ~12 | NO (mayoría) |
| src/lib/services/workflow/ambiguity-handler.ts | ~8 | Sí (parcial) |
| src/lib/ai/handler.ts | ~1 | NO |
| src/lib/ai/disambiguation-templates.ts | ~15 | Sí (con traducciones parciales) |
| src/lib/ai/policy-reserva.ts | ~18 | Sí |
| src/lib/ai/policy-ahora.ts | ~2 | Sí |
| **Total** | **~98** | |
