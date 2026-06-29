# SYSTEM_STATE — Sincronización Grafo de Zonas

Generado por: **Explorer**
Fase del pipeline: `EXPLORING`
Estado: `COMPLETE`

---

## Archivos relevantes

### `src/lib/db/core/connection.ts` (398 líneas)
- **Path completo:** `src/lib/db/core/connection.ts`
- **Líneas relevantes:** 129-145 (tariffs CREATE), 190-213 (zones/places CREATE), 348 (idx_tariffs_route)
- **Dependencias:** importa de `@/config/constants`, `@libsql/client`, `fs`, `path`
- **Dependientes:** importado por `src/lib/db/database.ts`, `scripts/seed-data.ts`
- **Tests:** no tiene tests directos
- **Estado:** Schema actual NO coincide con el diseño congelado. Faltan columnas: `public_price_4p`, `driver_price_4p`, `driver_price_6p`, `resolution_priority`, `display_name`, `surcharge_description`, `surcharge_pct`. CHECK constraints en places son demasiado restrictivas.

### `src/lib/db/types.ts` (311 líneas)
- **Path completo:** `src/lib/db/types.ts`
- **Líneas relevantes:** TariffRow (154-175), PlaceRow, ZoneRow
- **Dependencias:** standalone (types puros)
- **Dependientes:** importado por toda la capa DB + services
- **Tests:** no tiene tests directos
- **Estado:** TariffRow tiene `price_4p`, `base_price_4p` pero NO tiene `public_price_4p`, `driver_price_4p`, `resolution_priority`. PlaceRow tiene `operational_zone` en vez de `zone_id`.

### `scripts/seed-data.ts` (143 líneas)
- **Path completo:** `scripts/seed-data.ts`
- **Líneas relevantes:** 3-11 (ZONES), 13-26 (PLACES), 28-67 (ALIASES), 69-91 (TARIFFS)
- **Dependencias:** importa `getDb`, `ensureSchema` de `db/core/connection.ts`
- **Tests:** no tiene tests, se ejecuta manualmente
- **Estado:** Seed actual tiene 7 zonas, 12 places, 40 aliases, 20 tarifas. Necesita expandirse a ~18 zonas, ~30 places, ~150 aliases, ~60+ tarifas con precios reales.

### `src/lib/db/domains/trips.ts` (341 líneas)
- **Path completo:** `src/lib/db/domains/trips.ts`
- **Líneas relevantes:** 375 (findTariffRow query)
- **Dependencias:** importa de `db/core/helpers.ts`, `db/types.ts`
- **Dependientes:** `db/database.ts` facade
- **Estado:** findTariffRow usa query con `LOWER(origin)` y `LOWER(destination)`. Debe cambiarse a single query con resolution_priority.

### `src/lib/services/pricing/tariff-resolver.ts` (136 líneas)
- **Path completo:** `src/lib/services/pricing/tariff-resolver.ts`
- **Líneas relevantes:** 61-80 (resolveTariff con L1-L4), 111-130 (resolveBatch con L1-L4)
- **Dependencias:** importa `findTariff`, `findTariffRow`, `getOperationalZone` de `database.ts`
- **Dependientes:** `pricing-engine.ts`, `commercial-pricing-engine.ts`
- **Tests:** `tests/services/tariff-resolver.test.ts`
- **Estado:** Lógica secuencial con 4 queries. Debe unificarse en single query con ORDER BY resolution_priority.

### `src/lib/services/geo/location-resolver.ts` (~80 líneas)
- **Path completo:** `src/lib/services/geo/location-resolver.ts`
- **Líneas relevantes:** retorna `operational_zone` en ResolveLocationResult
- **Dependencias:** importa de `database.ts`
- **Dependientes:** `tariff-resolver.ts`, `pricing-engine.ts`
- **Estado:** retorna `operational_zone` → debe retornar `zoneId`

### `src/lib/services/geo/geo-engine.ts` (~110 líneas)
- **Path completo:** `src/lib/services/geo/geo-engine.ts`
- **Líneas relevantes:** 69 (mapa de pesos: mabu, itaipu, etc.), 97 (asignación a Z_HOTEL_ZONE)
- **Dependencias:** importa de `database.ts`
- **Dependientes:** `extraction/entity-extractor.ts`
- **Estado:** Mapa de zonas incompleto (solo Z_HOTEL_ZONE como zona genérica). Debe expandirse a ~18 zonas.

### `src/lib/config/entity-catalog.ts` (142 líneas)
- **Path completo:** `src/lib/config/entity-catalog.ts`
- **Líneas relevantes:** 12-97 (catalog entries: Rafain, Madero, Itaipu, Cataratas, etc.)
- **Dependencias:** standalone
- **Dependientes:** `extraction/entity-extractor.ts`, `geo-engine.ts`
- **Estado:** Faltan entidades: Recanto, Tupa Lodge, Saltos Monday, Costa del Sol, Mabu Thermas, etc.

### `src/lib/services/extraction/entity-extractor.ts` (~30 líneas)
- **Path completo:** `src/lib/services/extraction/entity-extractor.ts`
- **Líneas relevantes:** 15 (patrón mabu)
- **Dependencias:** standalone
- **Dependientes:** `extraction/extraction-runner.ts`
- **Estado:** Solo tiene patrón Mabu. Faltan patrones para Recanto, Tupa Lodge, etc.

### `src/lib/ai/display-name.ts` (~30 líneas)
- **Path completo:** `src/lib/ai/display-name.ts`
- **Líneas relevantes:** query a `official_name` con fallback a `canonical_name`
- **Dependencias:** importa de `database.ts`
- **Dependientes:** `response-builder.ts`, `policy-*.ts`
- **Estado:** No consulta `display_name` column. Debe priorizarlo.

### `src/lib/services/pricing/pricing-engine.ts` (~100 líneas)
- **Path completo:** `src/lib/services/pricing/pricing-engine.ts`
- **Líneas relevantes:** referencias a `price_4p`, `base_price_4p`, `operational_zone`
- **Dependencias:** `tariff-resolver.ts`, `location-resolver.ts`, `database.ts`
- **Dependientes:** `policy-pipeline.ts`, `lead.service.ts`
- **Estado:** Referencia nombres legacy. Debe actualizar a `public_price_4p`, `zone_id`.

### `src/lib/services/pricing/commercial-pricing-engine.ts` (~60 líneas)
- **Path completo:** `src/lib/services/pricing/commercial-pricing-engine.ts`
- **Líneas relevantes:** referencias a `base_price_4p`
- **Estado:** Similar a pricing-engine.ts, referencias legacy.

## Tests afectados

| Test | Archivo | Risk |
|------|---------|------|
| tariff-resolver | `tests/services/tariff-resolver.test.ts` | ALTO — la lógica de resolución cambia completamente |
| geo-engine | `tests/services/geo-engine.test.ts` | MEDIO — mapa de zonas expandido |
| location-resolver | `tests/services/location-resolver.test.ts` | MEDIO — retorna zoneId en vez de operational_zone |
| pricing-engine | `tests/services/pricing-engine.test.ts` | ALTO — columnas renombradas |
| display-name | `tests/ai/display-name.test.ts` | BAJO — solo agrega columna |
| seed | `scripts/seed-data.ts` | BAJO — script manual, sin tests |

## Divergencias código↔documentación

| Documento dice | Código hace | Severidad |
|---------------|------------|-----------|
| Schema tariffs tiene public_price_4p, driver_price_4p, resolution_priority | Schema actual tiene price_4p, base_price_4p, sin resolution_priority | ALTA |
| Places tiene zone_id, display_name, CHECK constraints relajadas | Places actual tiene operational_zone, sin display_name, CHECK restrictivo | ALTA |
| 18 zonas operativas con nombres y surcharges | Seed actual tiene 7 zonas legacy sin surcharges | ALTA |
| Matriz de precios reales (32k-240k AR$) | Seed actual tiene precios placeholder (5k-28k AR$) | ALTA |
| Single query con ORDER BY resolution_priority | findTariffRow usa 4 queries secuenciales | MEDIA |

## Dependencias cruzadas

```
pricing-engine.ts → [5 imports]
  ├── tariff-resolver.ts → database.ts → db/core/connection.ts
  ├── location-resolver.ts → database.ts
  └── database.ts (facade)

tariff-resolver.ts → [3 imports]
  ├── database.ts (findTariff, findTariffRow, getOperationalZone)
  └── types.ts

seed-data.ts → [2 imports]
  ├── db/core/connection.ts (getDb, ensureSchema)
  └── (ejecución directa, sin facade)
```

## Riesgos identificados

- **Riesgo 1:** Seed-data con matriz de 60+ tarifas puede tener errores de precio → mitigado: usar SOLO valores del documento congelado, verificar con stakeholder.
- **Riesgo 2:** Cambiar CHECK constraints en places puede requerir DROP y recreation de tabla para DB existente → mitigado: ALTER TABLE para relajar, no recrear.
- **Riesgo 3:** Tests de tariff-resolver actuales (591 tests en total) podrían fallar con la nueva lógica single query → mitigado: ejecutar después del cambio y corregir.
- **Riesgo 4:** La DB Turso actual tiene 0 filas en tablas geo, pero Tabla location_aliases tiene 120 filas huérfanas → mitigado: backup antes de DROP.
