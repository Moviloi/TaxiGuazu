# GEO DOMAIN REVERSE ENGINEERING
## 2026-07-08 | Evidencia del código

---

## FASE 1 — Línea de tiempo

| Commit | Cambio |
|---|---|
| `ee1d415` (early) | `geo-engine.ts` creado con zone resolution, zone expansion, proximity scoring, `classifyTripLeg`, `resolveGeoRoute` |
| `65c2908` | Zone maps (SUBZONE_MAP, NODE_ZONE_MAP) movidos a DB (places/aliases). geo-engine marcado DEPRECATED pero conservado. |
| `95de807` | Tests adaptados: zone resolution returns null. Proximity scoring sobrevive como stub. |
| `c09a2c7` (RC1) | **geo-engine.ts ELIMINADO.** Exports migrados a `location-resolver.ts`. `resolveGeoRoute()` convertido en stub (siempre retorna zone=null, routeType="MEDIUM"). Proximity scoring preservado como algoritmo. |
| `08ce37e` (G1) | Estado actual. Sin cambios adicionales en GEO. |

**Conclusión**: geo-engine perdió la resolución de zonas (DB → places/aliases), perdió la expansión de zonas (SUBZONE_MAP, NODE_ZONE_MAP), y conservó `classifyTripLeg` + stub de proximidad. Todo migrado a location-resolver.ts.

---

## FASE 2 — Contrato actual de location-resolver

```typescript
// Entrada
resolveLocation(text: string)

// Salida
{
  place_id: string | null,       // ID del lugar en la DB
  canonical_name: string | null, // Nombre canónico resuelto
  zone_id: string | null,        // Zona del lugar
  confidence: "exact" | "alias" | "fuzzy" | "not_found"
}
```

**El campo `confidence` es un LABEL, no un score cuantitativo.** Indica el método de resolución usado, no la calidad del match. "fuzzy" puede significar simplemente que se encontró sin acentos.

---

## FASE 3 — Algoritmo real

```
resolveLocation("argentino")
  │
  ├─ normalize("argentino") → "argentino"
  ├─ findPlaceByAlias("argentino") → DB: SELECT p.* FROM aliases a JOIN places p WHERE LOWER(a.alias)=? AND active
  │   └─ NO MATCH → continúa
  ├─ findPlaceByName("argentino") → DB: SELECT * FROM places WHERE LOWER(canonical_name)=? AND active
  │   └─ NO MATCH → continúa
  ├─ removeAccents("argentino") → "argentino"
  ├─ findPlaceByAlias("argentino") → fuzzy alias (accent-insensitive)
  │   └─ NO MATCH → continúa
  ├─ findPlaceByName("argentino") → fuzzy name (accent-insensitive)
  │   └─ NO MATCH → continúa
  └─ return { place_id: null, canonical_name: null, zone_id: null, confidence: "not_found" }
```

**Nota**: `resolveLocation()` NO usa `resolveAlias()` (Levenshtein). Esas son dos funciones diferentes con propósitos distintos.

---

## FASE 4 — Confidence

**El mecanismo de confidence NO se perdió. Está en `confidence.ts:13-176`.**

```typescript
// confidence.ts — calculateSlotConfidence()
score = 1.0 para "exact_alias_match" (resolveAlias() devuelve alias exacto)
score = 0.6 para "ambiguous_term" (término ambiguo como "centro", "aeropuerto")
score = 0.6 para "fuzzy_alias_match" (resolveAlias() encontró por Levenshtein)
score = 0.0 para "unknown_location" (resolveAlias() no encontró nada)
score = 0.0 para "missing" (slot no extraído)
```

**Flujo completo**:
- `extraction-runner.ts` → `calculateSlotConfidence()` → `resolveAlias()` (Levenshtein) → asigna score 0.0-1.0
- `location-resolver.ts` → `resolveLocation()` → devuelve `confidence: "alias"|"exact"|"fuzzy"` (label, no score)
- **Son dos mecanismos independientes.** El score numérico (0.0-1.0) está en `confidence.ts`. El label está en `location-resolver.ts`.

---

## FASE 5 — Ownership de decisiones

```
Usuario: "argentino"
    │
    ├─ core() → intent=PRE_BOOKING, facts=["affirmation:true"]
    │
    ├─ [Si slotState = slot_confirmation]
    │   └─ handleSlotConfirmationText() → NO cambia destino (sin regex match)
    │       → fallback message ("Usá los botones") → destination sobrevive ✅
    │
    └─ [Si slotState ≠ slot_confirmation]
        └─ extraction-runner → extractSlots()
            ├─ regexExtractSlots("argentino") → null
            ├─ entityExtractSlots("argentino")
            │   ├─ KNOWN_HOTELS: "argentino" no matchea (no es "amerian")
            │   ├─ KNOWN_POIS: no matchea
            │   ├─ AIRPORT_CODE_RE: no matchea
            │   └─ resolveLocation("argentino") → fuzzy → "Aeropuerto IGR"
            │       └─ SIN marcadores → destination por default ⚠️
            │           → return { destination: "Aeropuerto IGR" }
            │
            ├─ calculateSlotConfidence → resolveAlias("Aeropuerto IGR") → score 1.0
            │
            └─ [MERGE PREVSLOTS] → restauraría "Hotel Amerian" en prevSlots
                └─ PERO si el entity extractor ya asignó destination,
                    el merge en extraction-runner:463 restaura el valor previo.
```

**¿Quién decide aceptar una ubicación?**
1. **Confidence** (`confidence.ts`) — produce un score 0.0-1.0 y un action (proceed/clarify/fallback_regex)
2. **Slot Workflow** (`slot-workflow.ts`) — evalúa el action y decide el próximo estado conversacional
3. **Policy** (`policy-reserva.ts`) — basado en el estado y los slots, decide la respuesta

**¿Quién simplemente resuelve?**
- `location-resolver.ts` — resuelve texto a place_id/canonical_name (sin scoring numérico)
- `resolveAlias()` en `database.ts` — resuelve texto a canonical_name (con Levenshtein + auto-insert)

---

## FASE 6 — Bug B3 — Traza completa

```
"argentino" (texto) entra a handleLeadMessage
  │
  ├─ core("argentino") → intent=PRE_BOOKING, facts=["affirmation:true"]
  ├─ slotState = "slot_confirmation" (asumiendo estado post-"hotel amerian")
  │
  ├─ handleSlotConfirmationText() → NO cambia destination
  │   → fallback → destination = "Hotel Amerian" (preservado)
  │
  │   ⚠️ PERO: si el estado es collecting_slots (porque hotel amerian
  │      no disparó slot_confirmation), el flujo es diferente:
  │
  └─ [colleting_slots path]
      ├─ comprehension → OK
      ├─ runExtractionPipeline → extractSlots("argentino")
      │   └─ entityExtractSlots("argentino") line 168
      │       → resolveLocation("argentino") → fuzzy match "Aeropuerto IGR"
      │       → line 189-198: SIN marcadores → destination = "Aeropuerto IGR"
      │
      ├─ calculateSlotConfidence → resolveAlias("Aeropuerto IGR") → score 1.0
      │
      ├─ prevSlotsEarly = { origin: "Aeropuerto IGR", destination: "Hotel Amerian" }
      │
      ├─ MERGE (line 457-468):
      │   ├─ confidenceResult.slots.destination = { value: "Aeropuerto IGR", score: 1.0 }
      │   ├─ prevSlotsEarly.destination = "Hotel Amerian"
      │   ├─ "Aeropuerto IGR" != "Hotel Amerian" → true
      │   ├─ !"argentino".includes("aeropuerto igr") → true
      │   └─ → RESTAURAR destination = "Hotel Amerian" (prevSlots) ✅
      │
      └─ PERO: si el entityExtractSlots NO devuelve destination (retorna null
         porque resolveLocation no encontró fuzzy match), entonces
         confidenceResult.slots.destination NO existe, y el merge inserta
         "Hotel Amerian" desde prevSlots. OK.
```

**El bug requiere que resolveLocation("argentino") devuelva fuzzy match.** Esto depende de si existe un alias con Levenshtein ≤ 3. Si "argentino" fuzzy-mathea "argentina" en algún alias, el resultado se asigna a destination.

Alternativamente, si `slotState` es `slot_confirmation`, el texto "argentino" NUNCA llega al entity extractor — se procesa en `handleSlotConfirmationText()` que preserva el destino correctamente.

---

## FASE 7 — Tipos de resolución (prioridad)

| # | Tipo | Implementación | Archivo | Criterio |
|---|---|---|---|---|
| 1 | Exact alias | `findPlaceByAlias(normalized)` | `location-resolver.ts:116` | LOWER(a.alias) = ? |
| 2 | Exact canonical | `findPlaceByName(normalized)` | `location-resolver.ts:118` | LOWER(canonical_name) = ? |
| 3 | Fuzzy alias | `findPlaceByAlias(noAccent)` | `location-resolver.ts:121` | Sin acentos |
| 4 | Fuzzy canonical | `findPlaceByName(noAccent)` | `location-resolver.ts:123` | Sin acentos |
| 5 | Levenshtein ≤3 | `resolveAlias()` | `database.ts:568-598` | Full scan + auto-insert |
| 6 | Entity patterns | `entityExtractSlots()` | `entity-extractor.ts` | Regex + DB |
| 7 | LLM extraction | `generateGroqExtraction()` | `groq.ts` | AI model |

---

## FASE 8 — Clarification

**No existe un mecanismo explícito de "pending clarification" a nivel de location resolver.** La clarification ocurre a nivel conversacional:
- `slot_confirmation` state + `buildSlotConfirmationMessage()` → muestra UI de confirmación
- `ambiguity-handler.ts` → resolución multi-turn de lugares ambiguos
- `extraction-runner.ts` merge → preserve/restore de slots previos

---

## FASE 9 — Dominio GEO: real vs ideal

**Responsabilidades actuales**:
- `location-resolver.ts`: resolver texto → place (4 niveles, sin score)
- `database.ts:resolveAlias()`: fuzzy matching con Levenshtein + auto-insert
- `confidence.ts`: scoring numérico (0.0-1.0) basado en `resolveAlias()`
- `entity-extractor.ts`: detección de patrones (hoteles, POIs, aeropuertos)

**Mezcla de responsabilidades**: `resolveAlias()` está en `database.ts` (capa DB) pero contiene lógica de fuzzy matching + auto-insert (lógica de negocio). `confidence.ts` está en `extraction/` (capa de extracción) pero contiene scoring de ubicaciones (lógica GEO).

**Decisiones fuera del dominio**: El entity-extractor (`extraction/`) asigna `destination` por default (línea 189-198). Esta decisión debería ser del pipeline de extracción, no del extractor de entidades.

---

## FASE 10 — Turso

El resolver usa `places` y `aliases`. Cada llamada a `resolveLocation()` hace hasta 4 queries. En un mensaje típico con pricing: `calculatePrice` llama 2× + `resolveTariff` llama 2× = 4 llamadas a `resolveLocation` = hasta 16 queries de DB para el mismo texto.

---

## Respuestas finales

### 1. ¿Dónde se perdió (o absorbió) el mecanismo de confidence?
**No se perdió.** Está en `confidence.ts:13-176`. Produce score 0.0-1.0 por slot usando `resolveAlias()`. El `confidence` field de `location-resolver.ts` (label "alias"|"exact"|"fuzzy") es un mecanismo DIFERENTE — un label cualitativo, no un score cuantitativo.

### 2. ¿Quién decide actualmente aceptar una ubicación?
**`confidence.ts` asigna el score. `slot-workflow.ts` decide el próximo estado. `policy-reserva.ts` decide la respuesta.** Location-resolver solo resuelve texto a place_id. No decide.

### 3. ¿El bug B3 pertenece al Location Resolver, al Entity Extractor, al pipeline de merge o a la arquitectura conversacional?
**Al Entity Extractor** (`entity-extractor.ts:189-198`) que asigna a `destination` por default cuando `resolveLocation()` encuentra un fuzzy match sin marcadores de origen/destino. Secundariamente, a `resolveAlias()` en `database.ts:586-598` que auto-inserta aliases con Levenshtein ≤3, creando nuevos aliases que luego son usados por el entity extractor.

### 4. ¿Qué responsabilidad está faltando realmente en el pipeline?
**Un guard pre-entity-extraction que verifique el estado conversacional.** Si el usuario está en `slot_confirmation` o `collecting_slots` con slots previos, el entity extractor no debería asignar un fuzzy match de una sola palabra a destination sin marcadores explícitos.

### 5. ¿Cuál es la causa raíz arquitectónica, no el síntoma?
**La cadena `resolveAlias() → auto-insert alias → entityExtractSlots() → default destination` forma un pipeline sin validación de estado conversacional.** El entity extractor opera como si cada mensaje fuera un nuevo turno de extracción, sin considerar que el usuario puede estar clarificando, corrigiendo o confirmando. La falta de un "contexto de extracción" que considere el estado conversacional hace que una palabra ambigua ("argentino") sea tratada como un nuevo destino. El merge de prevSlots mitiga pero no previene.
