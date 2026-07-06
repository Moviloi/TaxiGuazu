# Geo Rules — AITOS

> Rules governing location resolution.
> Source: `src/lib/services/geo/location-resolver.ts`, `src/lib/services/geo/geo-engine.ts`.

---

## 1. Resolution levels

Location resolution proceeds in this order:

1. **Alias exact match** (case-insensitive, language-aware)
2. **Canonical name exact match**
3. **Fuzzy match** (Levenshtein distance ≤ 3)
4. **No match** → returns null

Source: `src/lib/services/geo/location-resolver.ts`

## 2. Place types

Allowed place types:

`airport`, `bus_terminal`, `border_crossing`, `border`, `attraction`, `shopping`, `hotel`, `resort`, `hostel`, `restaurant`, `casino`, `event_center`, `tourist_area`, `port`, `other`, `area`, `landmark`, `airbnb`, `bar`, `lodge`, `house`

Source: `src/lib/db/core/connection.ts` (`places` table CHECK constraint)

## 3. Ambiguous terms

- **GR-3.1**: Generic terms like "centro", "hotel", "aeropuerto" are flagged as ambiguous.
- **GR-3.2**: Ambiguous locations trigger interactive disambiguation.

Source: `src/lib/ai/patterns.ts`, `src/lib/services/workflow/ambiguity-handler.ts`

## 4. Reverse geocoding

- **GR-4.1**: GPS coordinates are resolved to addresses via Nominatim (OpenStreetMap).
- **GR-4.2**: Reverse geocoding is used for location messages only.

Source: `src/lib/services/geo/reverse-geocode.ts`

## 5. Zone model

- **GR-5.1**: Every place belongs to a zone.
- **GR-5.2**: Zones are used for pricing fallback and dispatch filtering.

Source: `src/lib/db/core/connection.ts` (`places.zone_id` → `zones`)

---

*Last updated: 2026-07-06*
