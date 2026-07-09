# LOCATION RESOLVER AUDIT — AITOS
## 2026-07-08

---

## Algoritmo

`resolveLocation(text)` en `location-resolver.ts:109-126`:

1. `findPlaceByAlias(normalized)` — exact match en `aliases JOIN places`
2. `findPlaceByName(normalized)` — exact match en `places.canonical_name`
3. `findPlaceByAlias(noAccent)` — fuzzy alias (accent-insensitive)
4. `findPlaceByName(noAccent)` — fuzzy name (accent-insensitive)

**Retorno**: `{ place_id, canonical_name, zone_id, confidence }` donde confidence ∈ `{alias, exact, fuzzy, not_found}`.

## ¿Existe score/ranking? NO. Es binario: match o no match. No hay ranking de candidatos.

## ¿Existe threshold? NO. Cualquier match (incluso Levenshtein ≤3) se acepta.

## ¿Existe fuzzy? SÍ — `resolveAlias()` en `database.ts:568-572` hace full scan de `aliases` + `levenshtein(a.alias, term) <= 3`. Si match, auto-inserta nuevo alias.

## ¿Quién decide? El location-resolver decide. No delega en LLM ni en el caller.

## Consumidores:
- `tariff-resolver.ts` (2× por pricing)
- `pricing-engine.ts` (2× por pricing)
- `entity-extractor.ts` (fallback fuzzy)
- `ambiguity-handler.ts` (búsqueda de candidatos)
- `tour-resolver.ts` (resolución de tours)
- `hub-discount.ts` (resolución de places en multi-ride)

**Problema**: `resolveLocation` se llama hasta 4× por mensaje para el MISMO texto (pricing-engine llama 2× + tariff-resolver llama 2×).

**Problema**: El fuzzy matching con Levenshtein ≤3 + auto-insert es la causa raíz del bug B3 ("argentino" → Aeropuerto IGR).
