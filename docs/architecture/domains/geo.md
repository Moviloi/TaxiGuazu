# Dominio Geo — Modelo de Dominio

> Derivado de: `src/lib/services/geo/location-resolver.ts`, `geo-engine.ts` (DEPRECATED), `src/lib/db/domains/geo.ts`, tablas `places`, `aliases`, `zones`
> Fecha: 2026-07-04 · AIT-013

---

## 1. Propósito

Resolver texto libre de ubicación ("aeropuerto", "aduana argentina", "hotel falls") a un lugar canónico (`place_id` + `canonical_name`) y su zona asociada (`zone_id`).

---

## 2. Pipeline de Resolución

```
Texto del usuario
    │
    ▼
┌──────────────────────────────┐
│ 1. Alias exacto              │  LOWER match en tabla `aliases`
│    "argentine customs"       │  → JOIN `places` → place_id + canonical_name
│    confidence: "alias"       │  Fuente: findPlaceByAlias(normalize(text))
├──────────────────────────────┤
│ 2. Nombre exacto             │  LOWER match en `canonical_name` de `places`
│    "Aeropuerto IGR"          │  → place_id + canonical_name
│    confidence: "exact"       │  Fuente: findPlaceByName(normalize(text))
├──────────────────────────────┤
│ 3. Alias sin acentos         │  removeAccents() + LOWER match en `aliases`
│    "aeropuerto" → "aeropuerto"│  → place_id + canonical_name
│    confidence: "fuzzy"       │  Fuente: findPlaceByAlias(removeAccents(normalize(text)))
├──────────────────────────────┤
│ 4. Nombre sin acentos        │  removeAccents() + LOWER match en `canonical_name`
│    confidence: "fuzzy"       │  Fuente: findPlaceByName(removeAccents(normalize(text)))
├──────────────────────────────┤
│ 5. Sin resultado             │  → null. El texto pasa al LLM (ambiguity-interpreter)
│    confidence: "not_found"   │
└──────────────────────────────┘
```

**Nota:** El Levenshtein distance se usa en `database.ts::resolveAlias()` (entity-extractor), no en `location-resolver.ts`. Son dos paths de resolución separados.

### 2.1 Funciones

```typescript
interface ResolveLocationResult {
  place_id: string | null;
  canonical_name: string | null;
  display_name: string | null;
  zone_id: string | null;
  confidence: "alias" | "exact" | "fuzzy" | "not_found";
  candidates?: PlaceCandidate[];  // para desambiguación
}

resolveLocation(text: string): Promise<ResolveLocationResult>
resolveLocationToPlaceId(text: string): Promise<string | null>
```

---

## 3. Entidades del Dominio

### 3.1 Place (`places` table)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `place_id` | TEXT PK | Identificador único |
| `canonical_name` | TEXT | Nombre canónico (ej: "Aeropuerto IGR") |
| `official_name` | TEXT | Nombre oficial completo |
| `display_name` | TEXT | Nombre para mostrar al usuario |
| `google_maps_name` | TEXT | Nombre en Google Maps |
| `place_type` | TEXT | Tipo: airport, hotel, border, attraction, shopping, etc. |
| `city` | TEXT | Ciudad |
| `country` | TEXT | AR / BR / PY |
| `latitude` / `longitude` | REAL | Coordenadas GPS |
| `tourist_relevance_score` | INTEGER | Relevancia turística (1-10) |
| `zone_id` | TEXT | FK → `zones` |
| `active_status` | INTEGER | 1 = activo |

**Campos de catastro hotelero (2026-07-03):**

| Columna | Descripción |
|---------|-------------|
| `barrio` | Barrio del hotel |
| `corredor_vial` | Corredor vial |
| `estrellas` | Categoría (1-5) |
| `direccion` | Dirección física |
| `zona_turistica` | Zona turística |
| `avenida_principal` | Avenida principal más cercana |
| `acceso_principal` | Tipo de acceso |
| `referencias` | Referencias de ubicación |

### 3.2 Zone (`zones` table)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `zone_id` | TEXT PK | Identificador (ej: "ZONE_IGR_AIRPORT") |
| `zone_name` | TEXT | Nombre descriptivo |
| `country` | TEXT | AR / BR / PY |
| `area_group` | TEXT | Agrupación de área |
| `dispatch_priority` | INTEGER | Prioridad para dispatch |
| `base_eta_min` | INTEGER | ETA base en minutos |
| `surcharge_description` | TEXT | Descripción de recargo |
| `surcharge_pct` | REAL | Porcentaje de recargo |
| `active` | INTEGER | 0/1 |

### 3.3 Alias (`aliases` table)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK | |
| `place_id` | TEXT FK | → `places.place_id` |
| `alias` | TEXT | Texto alternativo (ej: "argentine customs") |
| `language` | TEXT | es / en / pt |

**⚠️ GAP: Sin índice en `place_id`** — El JOIN `aliases JOIN places` no tiene índice, impacto en performance a escala.

---

## 4. Búsqueda de Lugares

```typescript
interface PlaceCandidate {
  place_id: string;
  canonical_name: string;
  display_name: string;
  city: string;
  country: string;
  place_type: string;
  tourist_relevance_score: number;
  zone_id: string;
}

searchPlaces(searchText: string, limit?: number): Promise<PlaceCandidate[]>
```

- LIKE sobre `canonical_name` + JOIN con `aliases`
- Ordenado por: exact match primero → tourist_relevance_score DESC → alfabético
- **ADR-005 (AI-First):** SIN heurísticas de ranking en el SQL. El LLM decide entre candidatos.

---

## 5. Geo Engine (DEPRECATED)

`geo-engine.ts` está marcado DEPRECATED. Sus funciones fueron reemplazadas:

| Función legacy | Reemplazada por |
|---------------|-----------------|
| `resolveGeoRoute(slots)` | Siempre retorna MEDIUM (no-op) |
| `classifyTripLeg(origin, dest)` | Aún usado en `trip-execution.service.ts` |
| Zone resolution | `places.zone_id` + `location-resolver.ts` |

**Plan:** Eliminar `geo-engine.ts` cuando `classifyTripLeg` sea migrado a DB.

---

## 6. Reverse Geocode

```typescript
reverseGeocode(lat: number, lon: number): Promise<string>
```

- Usa **Nominatim** (OpenStreetMap) para resolver coordenadas GPS → dirección
- Rate limiting: 1 request/segundo (límite de Nominatim)
- Usado cuando el usuario envía ubicación de WhatsApp (`message.type === "location"`)

---

## 7. Zonas Operativas — Gaps

| Zona | Estado | Problema |
|------|--------|----------|
| `ADUANA_TN` (Aduana Tancredo Neves) | Existe | Genérica — no distingue lado AR vs BR |
| `aduana_AR` | **NO existe** | Necesaria para diferenciar recogida lado argentino (antes de migración) |
| `aduana_BR` | **NO existe** | Necesaria para diferenciar recogida lado brasileño (después de migración) |
| `ZONE_FOZ_ADUANA_BR` | Existe | Usada para Aduana Brasil |
| Zonas de shoppings PY | Parcial | Algunos shoppings no tienen zone_id asignado |

---

## 8. Funciones del Dominio

| Función | Archivo | Descripción |
|---------|---------|-------------|
| `resolveLocation(text)` | `location-resolver.ts` | Resolver texto a place (4 niveles) |
| `resolveLocationToPlaceId(text)` | `location-resolver.ts` | Solo place_id |
| `searchPlaces(text, limit)` | `db/domains/geo.ts` | Buscar lugares (para ambigüedad) |
| `findPlaceByAlias(alias)` | `db/domains/geo.ts` | JOIN aliases + places |
| `findPlaceByName(name)` | `db/domains/geo.ts` | Match exacto canonical_name |
| `getPlaceZone(placeId)` | `db/domains/geo.ts` | Obtener zone_id |
| `reverseGeocode(lat, lon)` | `reverse-geocode.ts` | GPS → dirección |
| `classifyTripLeg(origin, dest)` | `geo-engine.ts` | Clasificar tipo de trayecto |

---

## 9. Gaps

| Gap | Estado |
|-----|--------|
| **Sin índice en `aliases.place_id`** | Crítico para performance |
| **`geo-engine.ts` deprecated** | Migrar `classifyTripLeg` y eliminar |
| **Zonas aduana_AR / aduana_BR** | No existen — impacto operativo real |
| **Sin caché de lugares** | Cada resolución es query DB |
| **Aliases monolingües** | Corregido en AIT-002 (250 aliases trilingües) |
