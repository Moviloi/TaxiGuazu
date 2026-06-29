# Anchored Summary

## Goal
- Complete and deploy the frozen geo-tariff dataset (ASE 32 + ASE 33) into Turso DB, purge legacy column debt from schema and service layer, then audit the delivered TARIFARIO TRASLADOS.xlsx against the live DB to determine if a tariff restructuring pass is needed before updating. Build tours + waiting_rates tables for round trips and additional waiting services.

## Constraints & Preferences
- Only the final DB result matters; the theoretical zone modelling process is irrelevant once the data is in Turso
- Legacy columns `price_4p`, `price_6p`, `base_price_4p`, `base_price_6p` must be fully replaced, not kept as backward compat — no fallback chains anywhere
- Turso DB has old schema (extra columns `piso_4p`, `piso_6p`, `piso_4p_low`, `piso_6p_low`, `garantizado_4p`, `garantizado_6p` not in current `CREATE TABLE`) — any mutation the seed does must satisfy all `NOT NULL` constraints of the live remote table
- TARIFARIO TRASLADOS.xlsx is the single source of truth for commercial pricing; the DB must mirror it exactly
- Tours (ida y vuelta con espera) go into separate `tours` table with all-inclusive pricing, waypoints, wait_hours
- Waiting rates (Hora de espera) go into `waiting_rates` table per zone/country
- Key differentiator for table routing: whether a trip has waiting time or a return leg, not whether it's "shopping" vs "sightseeing"
- `tariffs` stays clean: one-way trips only (Solo ida), modality='one_way'
- Architecture: hybrid (tariffs + tours + waiting_rates) — least wiring complexity, no changes to existing resolver

## Progress
### Done
- **Schema purge** — `connection.ts`: removed `price_4p`, `price_6p`, `base_price_4p`, `base_price_6p` from `CREATE TABLE tariffs`; added `ALTER TABLE tariffs DROP COLUMN` for all four legacy columns; added missing `ALTER TABLE tariffs ADD COLUMN` for `public_price_4p/6p`, `driver_price_4p/6p`, `active`, `origin_place_id`, `destination_place_id`, `origin_zone_id`, `destination_zone_id`
- **Types purge** — `types.ts`: removed `price_4p`, `price_6p`, `base_price_4p`, `base_price_6p` from `TariffRow`; `database.ts`: `getTariffById()` returns `driver_price_4p/6p` instead of legacy `base_price_4p/6p`
- **Service layer purge** — all `?? row.price_4p` / `?? row.base_price_6p` fallback chains eliminated from `tariff-resolver.ts`, `trips.ts`, `database.ts`, `admin-commands.ts`, `dispatch.service.ts`
- **Seed data cleanup** — `seed-data.ts`: removed `price_4p`, `price_6p` from INSERT; added `piso_4p`, `piso_6p` (aliased to `driver4p`/`driver6p`) to satisfy live Turso schema's `NOT NULL` constraint on the old columns
- **Seed executed against Turso** — Full dataset live in Turso: 19 zones, 37 places, 158 aliases, 122 tariffs
- **Tests updated** — `tariff-resolver.test.ts` and `dispatch.service.test.ts`: mocks use only `public_price_4p/6p`, `driver_price_4p/6p`, `resolution_priority`; no legacy fields
- **Validation** — 591/591 tests PASS, `npm run build` PASS, `enforce.sh` PASS
- **TARIFARIO TRASLADOS.xlsx analyzed** — 77 data rows classified: 49 solo ida, 24 tours (ida y vuelta), 4 waiting rates (adicional)
- **Schema extensions** — Added `tours` and `waiting_rates` tables to `connection.ts` with proper CHECK constraints and FK references
- **New interfaces** — `TourRow`, `WaitingRateRow` added to `types.ts`
- **Domain modules** — `domains/tours.ts` (CRUD: getTourById, listActiveTours, findTour, insertTour, updateTour, deleteTour) and `domains/waitingRates.ts` (CRUD: getWaitingRateById, listActiveWaitingRates, findWaitingRateByZone, insertWaitingRate, updateWaitingRate)
- **Tour resolver** — `services/pricing/tour-resolver.ts` with `resolveTour()` (by text) and `resolveTourByPlaceIds()` (by ID), returning `TourMatch` with prices, driver payout, waypoints, wait_hours
- **CRUD script** — `scripts/tarifario-crud.ts`: reads TARIFARIO TRASLADOS.xlsx, classifies each row (tariff/tour/waiting_rate), resolves to Turso place/zone IDs, upserts with `INSERT OR IGNORE` and UPDATE by geo IDs then text fallback; cargó `.env` manualmente para funcionar con `npx tsx`
- **Turso populated** — 29 zones, 214 places (all with zone_id assigned), 37 active tariffs (all with Excel prices), 22 tours, 4 waiting rates
- **CRUD mapping correction** — Fixed place_ids/zone_ids from `puerto_iguazu_centro` → `ar_centro_iguazu_area`, `foz_centro` → `br_centro_foz_area`, `ZONE_IGR_CENTRO` → `CENTRO`, etc. to match Turso convention (`{country}_{type}_{name}`)
- **Orphans deleted** — 51 legacy tariffs without prices + 2 corrupt entries (empty origin, test data) → soft-deleted
- **37 final tariffs** — all with `public_price_4p/6p` and `driver_price_4p/6p` from Excel. Reference zones by `zone_id` directly (no place_id usage)
- **Load masivo de places (114 nuevos)** — Basado en listado exhaustivo del usuario: hoteles, hostels, airbnbs, restaurantes, atracciones, landmarks, organizados por zona. Todos los 214 places tienen `zone_id` asignado.
- **Migración tabla places** — CHECK constraints relajados: `city` sin restricción, `country` sin restricción, `place_type` expandido con `area`, `landmark`, `airbnb`, `bar`, `border`, `lodge`, `house`.
- **Distribución final por zona**: CENTRO(58), CDE_MICROCENTRO(28), FOZ_CENTRO(25), FOZ_HOTEIS(18), CATARATAS(7), LD_SAN_IGNACIO(6), LD_MOCONA(6), ACCESO_RUTA12(6), LD_WANDA(5), ITAIPU(5), HITO_Y_COSTANERA(5), CATARATAS_BR(5), y 17 zonas más con 1-4 places cada una.
- **Hardening completado (2026-06-29)**:
  - CHECK `resolution_priority BETWEEN 1 AND 4` aplicado vía triggers + CREATE TABLE
  - CHECK `crosses_border IN (0,1)` aplicado vía triggers + CREATE TABLE
  - Modality NO restringida (valores diversos en español)
  - Índices creados: `places(zone_id)`, `places(place_type)`, `tariffs(active,resolution_priority)`
  - `connection.ts` sincronizado con DB real (operational_zone, NOT NULLs, CHECKs)
  - 4 triggers de integridad creados y verificados
  - Data audit: 0 referencias huérfanas en tarifas activas
 
### In Progress
- (ninguno)

### Open
- (ninguno)

### Blocked
- (none)

## Hardening (2026-06-29)
- **CHECK resolution_priority (1-4)** via triggers + in CREATE TABLE
- **CHECK crosses_border (0,1)** via triggers + in CREATE TABLE
- **Índices creados**: `idx_places_zone_id`, `idx_places_place_type`, `idx_tariffs_active_resolution`
- **connection.ts sincronizado**: `operational_zone` en places, NOT NULL constraints, `crosses_border` CHECK, place_type CHECK expandido
- **Modality**: NO se agregó CHECK — datos tienen valores diversos en español; se mantiene TEXT sin restricción para compatibilidad futura

## Key Decisions
- **Legacy columns dropped, not deprecated** — The original plan treated them as "preserved for backward compat". User explicitly wants full replacement. `ALTER TABLE ... DROP COLUMN` used for existing DBs; no fallback `??` chains remain anywhere.
- **Hybrid model for tariff data** — Three tables instead of one: `tariffs` (one-way), `tours` (round trips with waiting), `waiting_rates` (hourly charges). This minimized wiring changes (no changes to existing resolver) and keeps each table's schema clean.
- **Trip type determines table, not shopping/sightseeing** — The user clarified that what matters is whether a service involves waiting/return (→ `tours`) or is a simple transfer (→ `tariffs`). "Adicional" (hourly waiting) → `waiting_rates`.
- **CRUD script uses destination text mapping** — 59 normalized keys resolve Excel Spanish text to zone/place IDs, handling accents, edge cases ("excepto" → ACCESO not FONDO), and multi-origin resolution.
- **`piso_4p/6p` columns survived** — Turso DB has old columns not in the current `CREATE TABLE`. Seed must provide values for them or every `INSERT OR IGNORE` is silently skipped.
- **Triggers instead of ALTER TABLE ADD CHECK** — SQLite/libSQL no soporta `ALTER TABLE ADD CHECK` en tablas existentes. Se usaron triggers `BEFORE INSERT/UPDATE` para enforce `resolution_priority BETWEEN 1 AND 4` y `crosses_border IN (0,1)`. Nuevas DBs obtienen los CHECK nativos desde `CREATE TABLE`.
- **Modality NO restringida** — La columna `modality` en tariffs tiene valores diversos en español (`'Ida y Vuelta con Espera'`, `'X tramo'`, `'Solo ida'`, etc.) heredados del sistema legacy. NO se agregó CHECK porque rompería datos existentes y la evolución futura (`tour`, `hourly` sigue siendo posible).
- **Sin FK en tariffs** — Confirmado como decisión arquitectónica: las tarifas son aristas del grafo, no propietarias de los nodos. La integridad referencial se maneja en la capa de aplicación.
- **Schema sync connection.ts** — `connection.ts` se sincronizó con la DB real: se agregó `operational_zone TEXT` a places, NOT NULL constraints faltantes, CHECK de `place_type` expandido, y `crosses_border NOT NULL DEFAULT 0 CHECK(...)` en tariffs.

## Relevant Files
- `TARIFARIO TRASLADOS.xlsx` (repo root): 77 rows, 12 columns, source of all commercial prices
- `src/lib/db/core/connection.ts`: Final schema + `tours` + `waiting_rates` tables
- `src/lib/db/types.ts`: `TourRow`, `WaitingRateRow` interfaces
- `src/lib/db/domains/tours.ts`: Tour CRUD
- `src/lib/db/domains/waitingRates.ts`: Waiting rate CRUD
- `src/lib/services/pricing/tour-resolver.ts`: Tour resolution logic
- `scripts/tarifario-crud.ts`: Excel → DB migration script with full mapping
