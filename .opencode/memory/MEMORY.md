# Anchored Summary

## Goal
- Complete and deploy the frozen geo-tariff dataset (ASE 32 + ASE 33) into Turso DB, purge legacy column debt from schema and service layer, then audit the delivered TARIFARIO TRASLADOS.xlsx against the live DB to determine if a tariff restructuring pass is needed before updating. Build tours + waiting_rates tables for round trips and additional waiting services.

## Constraints & Preferences
- Only the final DB result matters; the theoretical zone modelling process is irrelevant once the data is in Turso
- Legacy columns `price_4p`, `price_6p`, `base_price_4p`, `base_price_6p` must be fully replaced, not kept as backward compat â€” no fallback chains anywhere
- Turso DB has old schema (extra columns `piso_4p`, `piso_6p`, `piso_4p_low`, `piso_6p_low`, `garantizado_4p`, `garantizado_6p` not in current `CREATE TABLE`) â€” any mutation the seed does must satisfy all `NOT NULL` constraints of the live remote table
- TARIFARIO TRASLADOS.xlsx is the single source of truth for commercial pricing; the DB must mirror it exactly
- Tours (ida y vuelta con espera) go into separate `tours` table with all-inclusive pricing, waypoints, wait_hours
- Waiting rates (Hora de espera) go into `waiting_rates` table per zone/country
- Key differentiator for table routing: whether a trip has waiting time or a return leg, not whether it's "shopping" vs "sightseeing"
- `tariffs` stays clean: one-way trips only (Solo ida), modality='one_way'
- Architecture: hybrid (tariffs + tours + waiting_rates) â€” least wiring complexity, no changes to existing resolver

## Progress
### Done
- **Schema purge** â€” `connection.ts`: removed `price_4p`, `price_6p`, `base_price_4p`, `base_price_6p` from `CREATE TABLE tariffs`; added `ALTER TABLE tariffs DROP COLUMN` for all four legacy columns; added missing `ALTER TABLE tariffs ADD COLUMN` for `public_price_4p/6p`, `driver_price_4p/6p`, `active`, `origin_place_id`, `destination_place_id`, `origin_zone_id`, `destination_zone_id`
- **Types purge** â€” `types.ts`: removed `price_4p`, `price_6p`, `base_price_4p`, `base_price_6p` from `TariffRow`; `database.ts`: `getTariffById()` returns `driver_price_4p/6p` instead of legacy `base_price_4p/6p`
- **Service layer purge** â€” all `?? row.price_4p` / `?? row.base_price_6p` fallback chains eliminated from `tariff-resolver.ts`, `trips.ts`, `database.ts`, `admin-commands.ts`, `dispatch.service.ts`
- **Seed data cleanup** â€” `seed-data.ts`: removed `price_4p`, `price_6p` from INSERT; added `piso_4p`, `piso_6p` (aliased to `driver4p`/`driver6p`) to satisfy live Turso schema's `NOT NULL` constraint on the old columns
- **Seed executed against Turso** â€” Full dataset live in Turso: 19 zones, 37 places, 158 aliases, 122 tariffs
- **Tests updated** â€” `tariff-resolver.test.ts` and `dispatch.service.test.ts`: mocks use only `public_price_4p/6p`, `driver_price_4p/6p`, `resolution_priority`; no legacy fields
- **Validation** â€” 591/591 tests PASS, `npm run build` PASS, `enforce.sh` PASS
- **TARIFARIO TRASLADOS.xlsx analyzed** â€” 77 data rows classified: 49 solo ida, 24 tours (ida y vuelta), 4 waiting rates (adicional)
- **Schema extensions** â€” Added `tours` and `waiting_rates` tables to `connection.ts` with proper CHECK constraints and FK references
- **New interfaces** â€” `TourRow`, `WaitingRateRow` added to `types.ts`
- **Domain modules** â€” `domains/tours.ts` (CRUD: getTourById, listActiveTours, findTour, insertTour, updateTour, deleteTour) and `domains/waitingRates.ts` (CRUD: getWaitingRateById, listActiveWaitingRates, findWaitingRateByZone, insertWaitingRate, updateWaitingRate)
- **Tour resolver** â€” `services/pricing/tour-resolver.ts` with `resolveTour()` (by text) and `resolveTourByPlaceIds()` (by ID), returning `TourMatch` with prices, driver payout, waypoints, wait_hours
- **CRUD script** â€” `scripts/tarifario-crud.ts`: reads TARIFARIO TRASLADOS.xlsx, classifies each row (tariff/tour/waiting_rate), resolves to Turso place/zone IDs, upserts with `INSERT OR IGNORE` and UPDATE by geo IDs then text fallback; cargÃ³ `.env` manualmente para funcionar con `npx tsx`
- **Turso populated** â€” 29 zones, 214 places (all with zone_id assigned), 37 active tariffs (all with Excel prices), 22 tours, 4 waiting rates
- **CRUD mapping correction** â€” Fixed place_ids/zone_ids from `puerto_iguazu_centro` â†’ `ar_centro_iguazu_area`, `foz_centro` â†’ `br_centro_foz_area`, `ZONE_IGR_CENTRO` â†’ `CENTRO`, etc. to match Turso convention (`{country}_{type}_{name}`)
- **Orphans deleted** â€” 51 legacy tariffs without prices + 2 corrupt entries (empty origin, test data) â†’ soft-deleted
- **37 final tariffs** â€” all with `public_price_4p/6p` and `driver_price_4p/6p` from Excel. Reference zones by `zone_id` directly (no place_id usage)
- **Load masivo de places (114 nuevos)** â€” Basado en listado exhaustivo del usuario: hoteles, hostels, airbnbs, restaurantes, atracciones, landmarks, organizados por zona. Todos los 214 places tienen `zone_id` asignado.
- **MigraciÃ³n tabla places** â€” CHECK constraints relajados: `city` sin restricciÃ³n, `country` sin restricciÃ³n, `place_type` expandido con `area`, `landmark`, `airbnb`, `bar`, `border`, `lodge`, `house`.
- **DistribuciÃ³n final por zona**: CENTRO(58), CDE_MICROCENTRO(28), FOZ_CENTRO(25), FOZ_HOTEIS(18), CATARATAS(7), LD_SAN_IGNACIO(6), LD_MOCONA(6), ACCESO_RUTA12(6), LD_WANDA(5), ITAIPU(5), HITO_Y_COSTANERA(5), CATARATAS_BR(5), y 17 zonas mÃ¡s con 1-4 places cada una.
- **Hardening completado (2026-06-29)**:
  - CHECK `resolution_priority BETWEEN 1 AND 4` aplicado vÃ­a triggers + CREATE TABLE
  - CHECK `crosses_border IN (0,1)` aplicado vÃ­a triggers + CREATE TABLE
  - Modality NO restringida (valores diversos en espaÃ±ol)
  - Ãndices creados: `places(zone_id)`, `places(place_type)`, `tariffs(active,resolution_priority)`
  - `connection.ts` sincronizado con DB real (operational_zone, NOT NULLs, CHECKs)
  - 4 triggers de integridad creados y verificados
  - Data audit: 0 referencias huÃ©rfanas en tarifas activas
- **Build fixes (2026-06-29)**:
  - `connection.ts:506,512`: libSQL `Row` type casts via `as unknown as Array<{...}>` (TS no puede inferir schema de Row)
  - `geo-engine.ts`: `ZoneExpansionResult` re-exportado (habÃ­a sido eliminado accidentalmente en refactor; `context-memory.ts` lo necesita)
  - `driver.service.ts:545`: bug `tariff`â†’`tariffMatch` (variable no definida) + `id`â†’`tariffId` (propiedad incorrecta para `TariffV2Match`)
- **Test fixes (2026-06-29)**:
  - `geo-engine.test.ts`: 6 tests adaptados â€” `resolveGeoRoute` ya no retorna zone IDs ni subzones; retorna `null` zones + `"MEDIUM"` routeType
  - Mocks agregados a 3 test files: `findPlaceByAlias`, `findPlaceByName`, `findTariffByPriority`, `queryOne`
  - Mocks de `display-name`, `location-resolver`, `db/core/helpers` agregados a `fase-29-quote-enforcement.test.ts` y `fase-29.2-slot-confirmation-routing.test.ts`
- **Commit + push completado (2026-06-29)** â€” `95de807`, 58 files, 3366++/1039--, push a `origin/main` exitoso
- **Security check integrado** â€” Hook pre-commit ejecutÃ³ `scripts/precommit-security-check.mjs` automÃ¡ticamente, PASS sin secretos
- **P4: Structured text handler for slot_confirmation state (2026-06-29)** â€” AÃ±adido handler en `lead.service.ts` que detecta cuando el usuario estÃ¡ en estado `slot_confirmation` y envÃ­a texto en vez de botones:
  - Afirmaciones ("sÃ­", "confirmo") â†’ redirige a `slot_confirm`
  - Negaciones/correcciones ("no", "cambiar") â†’ redirige a `slot_change`
  - ExtracciÃ³n via `leadCore.roleLock` para frases completas ("estoy en X quiero ir a Y")
  - Regex simples para patrones como "al centro" (SIMPLE_DEST_RE), "desde el hotel" (SIMPLE_ORIGIN_RE)
  - Fallback: recuerda al usuario usar los botones
  - 50 tests, 591 tests PASS, 0 errores TS en lead.service.ts

### In Progress
- (ninguno)

### Open
- **P5: Geo alias resolution en slot_confirmation text handler** â€” Integrar `resolveAlias()` en P4 para resolver raw values a nombres canÃ³nicos antes de mostrar confirmaciÃ³n. No crÃ­tico porque `resolvePricingForSlots()` resuelve alias downstream al confirmar.

### Blocked
- (none)

## Hardening (2026-06-29)
- **CHECK resolution_priority (1-4)** via triggers + in CREATE TABLE
- **CHECK crosses_border (0,1)** via triggers + in CREATE TABLE
- **Ãndices creados**: `idx_places_zone_id`, `idx_places_place_type`, `idx_tariffs_active_resolution`
- **connection.ts sincronizado**: `operational_zone` en places, NOT NULL constraints, `crosses_border` CHECK, place_type CHECK expandido
- **Modality**: NO se agregÃ³ CHECK â€” datos tienen valores diversos en espaÃ±ol; se mantiene TEXT sin restricciÃ³n para compatibilidad futura

## Key Decisions
- **Legacy columns dropped, not deprecated** â€” The original plan treated them as "preserved for backward compat". User explicitly wants full replacement. `ALTER TABLE ... DROP COLUMN` used for existing DBs; no fallback `??` chains remain anywhere.
- **Hybrid model for tariff data** â€” Three tables instead of one: `tariffs` (one-way), `tours` (round trips with waiting), `waiting_rates` (hourly charges). This minimized wiring changes (no changes to existing resolver) and keeps each table's schema clean.
- **Trip type determines table, not shopping/sightseeing** â€” The user clarified that what matters is whether a service involves waiting/return (â†’ `tours`) or is a simple transfer (â†’ `tariffs`). "Adicional" (hourly waiting) â†’ `waiting_rates`.
- **CRUD script uses destination text mapping** â€” 59 normalized keys resolve Excel Spanish text to zone/place IDs, handling accents, edge cases ("excepto" â†’ ACCESO not FONDO), and multi-origin resolution.
- **`piso_4p/6p` columns survived** â€” Turso DB has old columns not in the current `CREATE TABLE`. Seed must provide values for them or every `INSERT OR IGNORE` is silently skipped.
- **Triggers instead of ALTER TABLE ADD CHECK** â€” SQLite/libSQL no soporta `ALTER TABLE ADD CHECK` en tablas existentes. Se usaron triggers `BEFORE INSERT/UPDATE` para enforce `resolution_priority BETWEEN 1 AND 4` y `crosses_border IN (0,1)`. Nuevas DBs obtienen los CHECK nativos desde `CREATE TABLE`.
- **Modality NO restringida** â€” La columna `modality` en tariffs tiene valores diversos en espaÃ±ol (`'Ida y Vuelta con Espera'`, `'X tramo'`, `'Solo ida'`, etc.) heredados del sistema legacy. NO se agregÃ³ CHECK porque romperÃ­a datos existentes y la evoluciÃ³n futura (`tour`, `hourly` sigue siendo posible).
- **Sin FK en tariffs** â€” Confirmado como decisiÃ³n arquitectÃ³nica: las tarifas son aristas del grafo, no propietarias de los nodos. La integridad referencial se maneja en la capa de aplicaciÃ³n.
- **Schema sync connection.ts** â€” `connection.ts` se sincronizÃ³ con la DB real: se agregÃ³ `operational_zone TEXT` a places, NOT NULL constraints faltantes, CHECK de `place_type` expandido, y `crosses_border NOT NULL DEFAULT 0 CHECK(...)` en tariffs.
- **`as unknown as` para libSQL Row casts** â€” El driver libSQL/Turso expone filas como tipo `Row` genÃ©rico sin propiedades de schema. Para casts a tipos especÃ­ficos (`Array<{origin: string, destination: string, ...}>`), se requiere `as unknown as Array<...>` en lugar de `as Array<...>` porque TS no puede verificar que un `Row` tenga esas propiedades. Esto es un pattern necesario en todo el cÃ³digo que interactÃºa con libSQL.
- **`tariff`â†’`tariffMatch` en driver.service.ts** â€” Bug introducido durante refactor del mÃ³dulo de pricing: la variable local se llamaba `tariff` cuando el import de `findTariff` fue reemplazado por `resolveTariff` que retorna `TariffV2Match` (con `tariffId`, `price`, `matched`). Se corrigiÃ³ tanto el nombre de variable como la propiedad de `id`â†’`tariffId`.
- **Zone resolution vive en location-resolver.ts, no en geo-engine.ts** â€” El geo-engine perdiÃ³ `SUBZONE_MAP`, `NODE_ZONE_MAP`, `resolveZones()` y `computeRouteType()` porque esa lÃ³gica ahora vive en `location-resolver.ts` con lookups a la DB (tabla `places` con `zone_id`). `resolveGeoRoute()` ahora retorna `zone: null` + `routeType: "MEDIUM"` siempre para mantener compatibilidad de interfaz.
- **`ZoneExpansionResult` redefinido en geo-engine.ts** â€” El tipo se eliminÃ³ accidentalmente durante la limpieza de mapa legacy. `context-memory.ts` lo importa. Se redefiniÃ³ con `ExpansionProbabilities` y `ExpansionNode` internos para mantener la interfaz pÃºblica sin exponer tipos internos.

## Relevant Files
- `TARIFARIO TRASLADOS.xlsx` (repo root): 77 rows, 12 columns, source of all commercial prices
- `src/lib/db/core/connection.ts`: Final schema + `tours` + `waiting_rates` tables
- `src/lib/db/types.ts`: `TourRow`, `WaitingRateRow` interfaces
- `src/lib/db/domains/tours.ts`: Tour CRUD
- `src/lib/db/domains/waitingRates.ts`: Waiting rate CRUD
- `src/lib/services/pricing/tour-resolver.ts`: Tour resolution logic
- `scripts/tarifario-crud.ts`: Excel -> DB migration script with full mapping
- `src/lib/services/geo/geo-engine.ts`: `ZoneExpansionResult` re-exportado, maps legacy eliminados, `resolveGeoRoute()` simplificada
- `src/lib/services/dispatch/driver.service.ts`: Bug `tariff`->`tariffMatch` corregido en `handleContingenciaSi()`
- `src/lib/db/core/connection.ts:506,512`: Type casts `as unknown as` para libSQL Row
- `tests/services/geo-engine.test.ts`: Tests adaptados a nueva interfaz sin zones/subzones
- `tests/integration/fase-27-contingency-readiness.test.ts`: Mocks completados (findPlaceByAlias, findPlaceByName, findTariffByPriority, queryOne)
- `tests/services/dispatch.service.test.ts`: Mocks completados + location-resolver mock
- `tests/integration/fase-29-quote-enforcement.test.ts`: Mocks de display-name, location-resolver, db/core/helpers
- `tests/integration/fase-29.2-slot-confirmation-routing.test.ts`: Mocks de display-name, location-resolver, db/core/helpers

(End of file - total 105 lines)


## Learning Patterns

### Pattern: libSQL Row type casting
- Trigger: Cualquier db.execute() que retorna rows y necesita castear a un tipo conocido.
- Pattern: Usar 'as unknown as Array<{col1: type, col2: type, ...}>' - el paso intermedio unknown es necesario porque libSQL Row no tiene propiedades de schema y TS rechazaria 'as Array<T>' directo.
- Scope: Todo archivo que importe de @libsql/client y acceda a result.rows.
- Files: connection.ts, database.ts, domains/*.ts, y cualquier modulo que haga queries raw.

### Pattern: Refactor de funcion con cambio de tipo de retorno
- Trigger: Reemplazar una funcion (ej: findTariff() que retorna {id, price}) por otra con tipo diferente (ej: resolveTariff() que retorna {tariffId, price, matched}).
- Risk: Todas las variables locales y las propiedades accedidas deben actualizarse. Es facil dejar un tariff.id cuando ahora es tariffMatch.tariffId.
- Mitigation: Despues del refactor, buscar TODAS las referencias a la funcion reemplazada con grep -r "oldFuncName" src/ y verificar que ningun import zombie quede. Luego buscar el nombre de variable anterior (ej: tariff.) en los archivos modificados.

### Pattern: Adaptar tests en lugar de restaurar comportamiento legacy
- Trigger: Cuando la funcionalidad cambia (ej: geo-engine ya no resuelve zones), los tests que verificaban el comportamiento antiguo deben reflejar el nuevo, no mockear el comportamiento viejo.
- Approach: Actualizar asserts para que esperen los nuevos valores (null, default, etc.) y documentar en el test por que el comportamiento cambio.
- Benefit: Los tests documentan el comportamiento actual, no el idealizado. Si en el futuro se restaura la resolucion de zones en geo-engine, los tests se actualizaran de nuevo.

### Pattern: Mocks en tests de integracion - dependencias deep
- Trigger: Tests de integracion que mockean multiples capas (services, db, utils).
- Pattern: Cada mock debe cubrir todas las funciones que el codigo bajo test importa de ese modulo. Si faltan, el test falla con TypeError: module_1.funcName is not a function.
- Common misses: findPlaceByAlias, findPlaceByName, findTariffByPriority, queryOne en modulos DB; display-name, location-resolver en servicios de geo.
- Mitigation: Ejecutar el test individualmente con npx vitest run tests/path/to/test.ts y observar el primer error de mock faltante. Agregar y repetir.

### Pattern: SETUP_TEARDOWN para chequeo de state
- Trigger: Tests que verifican slots confirmados, valores de DB, o cambios de estado despues de una operacion.
- Note: Los tests actuales usan afterAll para restaurar state via SETUP_TEARDOWN. Si un test modifica getConnectionValue/setConnectionValue, el cleanup debe ocurrir en afterEach o afterAll dependiendo de si los tests comparten estado.
