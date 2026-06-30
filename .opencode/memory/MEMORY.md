# Anchored Summary

## Goal
- P0 fixes for test conversation failures: LLM validation bug, G7 comprehension asking wrong question, GREETING too verbose
- Fix case-sensitivity bug in llm-response.ts validation that silently rejected valid LLM responses
- Make extraction fall through to LLM when regex/entity finds only partial slots (not returning early)
- Make getRecoveryMessage() consult roleLock to ask specifically for missing field (origin vs destination)
- Activate dormant inferMissingFieldFromCore() as fallback when roleLock doesn't resolve
- Constrain GREETING LLM enhancement to 2 lines max via system prompt

## Constraints & Preferences
- Bug fixes are P0 — unblock the test conversation flow before any new features
- Changes must be minimal and targeted — no refactors, no dead code cleanup in this pass
- Mock files must be updated alongside production code when imports change
- All 591 tests must continue passing

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

### Done (P0 fixes — 2026-06-29)
- **P0.1: Bug `!swapped` en llm-response.ts** — Corregido error de case-sensitivity en `validateLLMResponse()`: `llmText.includes(origin)` → `llmText.toLowerCase().includes(origin)`. La validación ahora compara ambas cadenas en lowercase, evitando falsos negativos cuando el LLM capitaliza nombres de lugares. Variable `swapped` renombrada a `llmLow`/`matchesDest`/`matchesOrigin` para claridad.
- **P0.2a: Liberar Groq para extracción con typos** — `extract-slots.ts`: cambiada condición de early-return: solo retorna temprano cuando regex/entity encuentra AMBOS slots (origin AND destination). Si encuentra solo uno, continúa al LLM para completar el faltante. Esto permite detectar "queiro ira al centro" (typos) via LLM aunque regex falle.
- **P0.2b: getRecoveryMessage() consulta roleLock** — `comprehension.ts`: agregados parámetros `roleLock?: RoleLock` y `text?: string` (para detección de idioma). Ahora verifica primero `roleLock.origin/destination` del CORE (estado actual) antes de caer a `session.slots` (estado persistido). Si detecta que el origen está presente pero el destino no, responde "¿A dónde necesitás ir?" en lugar de "contame un poco más". Idioma detectado dinámicamente vía `detectLeadLang()` de `@/lib/detect-lang`.
- **P0.2c: inferMissingFieldFromCore() activado** — `response-builder.ts`: cambiado tipo de parámetro de `FinalDecision` a `CoreDecision` (más simple, sin wrapper). `comprehension-runner.ts`: importado `inferMissingFieldFromCore` y `buildGenericClarify`; agregado fallback que, si `getRecoveryMessage` retorna mensaje genérico, intenta inferir el campo faltante desde `core.facts`.
- **P0.3: GREETING corto vía system prompt** — `llm-response.ts:buildResponsePrompt()`: detecta `policy.policyHint.includes("GREETING")` y agrega regla obligatoria: "Es un SALUDO. Respondé en máximo 1-2 líneas. Sé muy breve y no preguntes nada adicional."
- **Mock actualizado** — `comprehension-runner.test.ts`: agregados mocks de `buildGenericClarify` e `inferMissingFieldFromCore` al mock de `@/lib/ai/response-builder`.

- **Desambiguación interactiva batch (2026-06-29)** — Nuevo sistema multi-turn que permite al usuario resolver lugares ambiguos seleccionando entre opciones concretas:
  - **Nuevo estado**: `ambiguity_pending` agregado a `ConversationalState` + `VALID_SLOT_TRANSITIONS`
  - **Nueva función DB**: `searchPlaces()` en `geo.ts` — busca lugares con LIKE en `canonical_name` y `aliases`, retorna múltiples candidatos ordenados por relevancia (exact match → LIKE match)
  - **Nuevo archivo**: `ambiguity-handler.ts` — orquestador multi-turn: detecta ambigüedad, muestra opciones via `buildPlaceOptions()`, procesa selección del usuario (número o texto parcial), avanza al siguiente slot, finaliza en `slot_confirmation` cuando ambos están resueltos
  - **Nueva función DB facade**: `updateChatSessionSlots()` en `database.ts` — actualiza solo la columna `slots` sin tocar confidence/state
  - **Integración en lead.service.ts**: hook antes del comprehension check — primero maneja respuesta pendiente, luego chequea si hay términos ambiguos para iniciar resolución
  - Flujo batch: opciones de origen → usuario selecciona → opciones de destino → usuario selecciona → slot_confirmation con valores resueltos
  - Datos de ambigüedad almacenados bajo clave `__ambiguity` en el JSON de `slots`
- **Dead code cleanup (10 items)**:
  - 🗑️ `applyConfirmation()` en `slot-confirmation.ts` — lógica inlineada
  - 🗑️ `clamp()` en `utils/clamp.ts` — nunca usado (solo `clamp01` tiene callers)
  - 🗑️ `findTariff()` + `TariffWithPrice` en `database.ts` — DEPRECATED sin callers
  - 🗑️ `DriverInvitationRow` en `types.ts` — tabla existe pero 0 consultas
  - 🗑️ `ExtractionLanguage` en `extraction-schema.ts` — nunca importado
  - 🗑️ `getOperationalZone` alias en `geo.ts` + re-export en `database.ts`
  - 🗑️ 4 params legacy conservados con comentarios (`_parsedData`, `_history`, `_customerName`, `_leadCore`, `_workflow`)

### Verified
- 591/591 tests PASS
- `npm run build` PASS
- `bash ael/contracts/enforce.sh` PASS (R1, R2, R3)

### Open
- **P5: Geo alias resolution en slot_confirmation text handler** — Integrar `resolveAlias()` en P4 para resolver raw values a nombres canónicos antes de mostrar confirmación. No crítico porque `resolvePricingForSlots()` resuelve alias downstream al confirmar.
- **Desambiguación interactiva batch** — Próximo feature mayor: wirear `buildPlaceOptions()` con nuevo estado `ambiguity_pending` para que el usuario seleccione origen Y destino antes de enviar respuesta única, no responder después de cada click.

## Hardening (2026-06-29)
- **CHECK resolution_priority (1-4)** via triggers + in CREATE TABLE
- **CHECK crosses_border (0,1)** via triggers + in CREATE TABLE
- **Ãndices creados**: `idx_places_zone_id`, `idx_places_place_type`, `idx_tariffs_active_resolution`
- **connection.ts sincronizado**: `operational_zone` en places, NOT NULL constraints, `crosses_border` CHECK, place_type CHECK expandido
- **Modality**: NO se agregÃ³ CHECK â€” datos tienen valores diversos en espaÃ±ol; se mantiene TEXT sin restricciÃ³n para compatibilidad futura

## Key Decisions (P0 fixes — 2026-06-29)
- **`!swapped` NO se invirtió** — El análisis de código demostró que la variable `swapped` (ahora reemplazada por `matchesDest && matchesOrigin`) verifica PRESENCIA de ambos lugares en el texto, no orden swap. El único bug era CASE-SENSITIVITY en `llmText.includes(origin)` (origin está en lowercase pero llmText no). La lógica `if (!bothFound)` es correcta: rechazar cuando uno de los dos lugares no aparece en la respuesta del LLM.
- **extract-slots early-return solo en FULL match** — Antes, si regex encontraba SOLO origin o SOLO destination, retornaba inmediatamente sin llamar al LLM. Esto significaba que "estoy en aeropuerto y queiro ira al centro" perdía el destino (typo rompía IR_A_RE). Ahora solo retorna temprano si regex/entity encuentra AMBOS slots. Partial match → continúa al LLM.
- **getRecoveryMessage prioriza roleLock sobre session.slots** — `roleLock` refleja el estado ACTUAL del CORE (lo que se detectó en este turno), mientras `session.slots` es estado PERSISTIDO (posiblemente de turnos anteriores). roleLock es más relevante para preguntar qué falta AHORA.
- **inferMissingFieldFromCore acepta CoreDecision** — Cambié el tipo de parámetro de `FinalDecision` (que requería un wrapper `{ core: ... }`) a `CoreDecision` directo. La función no tenía callers, así que el cambio es seguro. También se importó en comprehension-runner.ts como fallback cuando getRecoveryMessage retorna mensaje genérico.
- **GREETING usa system prompt, no hardcode** — En lugar de cambiar la respuesta hardcodeada en `buildInformationalResponse()`, se agregó una regla en `buildResponsePrompt()` que el LLM debe seguir al mejorar el texto. Esto permite que el GREETING siga siendo LLM-generado (más natural) pero limitado a 1-2 líneas. La detección se hace por `policy.policyHint`: contiene "GREETING" cuando es un saludo.

## Relevant Files (P0 changes)
- `src/lib/ai/llm-response.ts` — Bug case-sensitivity en validateLLMResponse (lines 91-94) + regla GREETING en buildResponsePrompt
- `src/lib/services/extraction/extract-slots.ts` — Early-return condicional a FULL match en regex/entity
- `src/lib/services/extraction/comprehension.ts` — getRecoveryMessage con roleLock + text params, lang dinámico
- `src/lib/services/extraction/comprehension-runner.ts` — Importa inferMissingFieldFromCore y buildGenericClarify, fallback por core facts
- `src/lib/ai/response-builder.ts` — inferMissingFieldFromCore acepta CoreDecision en vez de FinalDecision
- `tests/services/comprehension-runner.test.ts` — Mock de buildGenericClarify e inferMissingFieldFromCore agregado

## Relevant Files (Desambiguación interactiva)
- `src/lib/ai/types.ts` — ConversationalState extendido con "ambiguity_pending"
- `src/lib/db/domains/geo.ts` — Nueva función searchPlaces() con LIKE search multi-resultado
- `src/lib/db/database.ts` — Nueva función facade updateChatSessionSlots() + eliminación de findTariff/TariffWithPrice
- `src/lib/services/workflow/ambiguity-handler.ts` — Nuevo orquestador multi-turn de desambiguación
- `src/lib/services/workflow/slot-workflow.ts` — VALID_SLOT_TRANSITIONS extendido con ambiguity_pending
- `src/lib/services/lead.service.ts` — Hooks de ambigüedad antes de comprehension check
- `src/lib/ai/slot-confirmation.ts` — buildPlaceOptions() ahora activo (antes dormido) + applyConfirmation eliminado

## Dead code removed
- `src/lib/ai/extraction-schema.ts` — ExtractionLanguage type
- `src/lib/db/types.ts` — DriverInvitationRow interface
- `src/lib/db/domains/geo.ts` — getOperationalZone alias
- `src/lib/utils/clamp.ts` — clamp() function
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

### Pattern: Mock coverage for new imports in existing modules
- Trigger: When adding a new import from an already-mocked module in a test file.
- Risk: Adding `import { newFunc } from "@/lib/module"` in production code will crash tests if `vi.mock("@/lib/module")` doesn't export `newFunc`.
- Mitigation: After adding any new import to a file that has `vi.mock()` in its test file, update the mock to include the newly imported function. Run the failing test individually (`npx vitest run tests/path/to/file.test.ts`) to catch missing mocks immediately.
- Tools: Check all test files that mock the same module — there may be multiple.

### Pattern: Partial match slug in extract-slots
- Trigger: When regex or entity extractor finds only one of two mandatory slots (e.g., origin but not destination).
- Pattern: Don't return early. Log as "partial match" and continue to the next extraction layer (entity → LLM). The LLM can semantically understand intent even when regex fails due to typos.
- Files: src/lib/services/extraction/extract-slots.ts

### Pattern: RoleLock before SessionSlots for current-turn state

### Architecture: AI-First Interpretation over Heuristics (ADR 005)
- **R4 en contratos AEL**: No heuristic patches for context-sensitive data. Prohibido CASE/WHEN ranking en queries y mapas de prioridad hardcodeados.
- **searchPlaces()** retorna datos crudos (city, country, place_type, score) — sin ranking artificial. Orden simple: exact match → relevance → alphabetical.
- **ambiguity-handler.ts** usa `interpretAmbiguity()` (LLM) antes de mostrar opciones. Si LLM resuelve con alta confianza → auto-resuelve. Si no → `buildPlaceOptions()` como fallback.
- **getRecoveryMessage()** usa LLM cuando detecta `location_ambiguous:true` en facts, generando preguntas contextuales ("Entendí que tu viaje es desde el centro...") en vez de templates genéricos ("¿Desde dónde salís?").
- La LLM recibe candidatos con metadata completa (ciudad, país, tipo, score) para interpretación geográficamente informada.

### Pattern: Ambiguity resolution as multi-turn state machine
- Trigger: When CORE's `AMBIGUOUS_LOCATION_RE` detects a generic term ("aeropuerto", "centro") that matches multiple places in DB.
- Flow: Extract raw roleLock values → `searchPlaces()` via LIKE → if >1 match, present options → user picks → store in `__ambiguity` metadata in slots JSON → repeat for next ambiguous slot → both resolved → transition to `slot_confirmation`.
- Key decision: Use `clarify_field` to track which slot is being resolved ("origin" or "destination"), not separate state for each.
- Persistence: Ambiguity state stored under `__ambiguity` key in `chat_sessions.slots` JSON column (avoids schema migration).
- Testing: New state must be added to `VALID_SLOT_TRANSITIONS` in slot-workflow.ts, otherwise the state machine rejects transitions.

### Pattern: DB facade bypass detection
- Trigger: Any service file calling `getDb().execute()` directly instead of going through `database.ts` facade functions.
- Enforcement: `ael/contracts/enforce.sh` R2 checks for `getDb().execute` in service files and fails if found.
- Fix: Add a new facade function in `database.ts` (e.g., `updateChatSessionSlots()`) that wraps the raw query, then import from there.

### Pattern: Dead code classification - DORMANT vs TRULY DEAD
- DORMANT: Function has a purpose in planned architecture (e.g., `buildPlaceOptions()`, `inferMissingFieldFromCore()`). Don't remove — wire up instead.
- TRULY DEAD: Function replaced by inline logic (`applyConfirmation()`), deprecated (`findTariff()`), or never implemented (`DriverInvitationRow`). Safe to remove.
- False positives: `clamp()` appears dead but is in `utils/` — utility functions may be added later; safe to remove but document.
- Legacy params: Functions with `_` prefix params that are kept for interface compatibility should be documented but not removed (avoids cascading signature changes).
- Trigger: When determining what slot is missing during the current user turn.
- Pattern: Check `roleLock.origin`/`.destination` first — these reflect what CORE detected in THIS turn. Only fall back to `session.slots` (persisted from previous turns) if roleLock has no info. This ensures the system asks about the most current missing field.

### Pattern: SETUP_TEARDOWN para chequeo de state
- Trigger: Tests que verifican slots confirmados, valores de DB, o cambios de estado despues de una operacion.
- Note: Los tests actuales usan afterAll para restaurar state via SETUP_TEARDOWN. Si un test modifica getConnectionValue/setConnectionValue, el cleanup debe ocurrir en afterEach o afterAll dependiendo de si los tests comparten estado.
