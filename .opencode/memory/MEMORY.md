# Anchored Summary

## Goal
- Crear sistema de evals (AIT-052) para medir calidad de respuestas del bot: dataset de 25 casos + runner que ejecuta `core()` + `router()` + FRUSTRATION_RE y reporta precisión
- Integrar Sentry (AIT-050) para captura de errores en producción sin DSN requerido para build

## Constraints & Preferences
- Dataset de evals sin IDs de planificación en exports de producción (solo en comentarios y BACKLOG.md)
- Sin `as any` en código de evals
- Dataset y runner en scripts/ (no mezclados con código de producción)
- Runner usa `npx tsx` (mismo patrón que validate-knowledge, validate-schema-parity)
- Si un caso de eval falla, NO arreglar el pipeline de producción — reportar primero (puede ser dataset mal diseñado o bug real)
- Todos los tests (771) y build deben pasar; AEL contracts green

## Progress
### Done (archived — see git log for full detail)
- Schema/tarifario/CRUD migration, 591 tests, Turso populated, hardening, build fixes (2026-06-29)
- Regex lookahead fix for "desde el centro a cataratas": DESDE_RE, IR_A_RE, HASTA_RE (core.ts)
- Phase A: Context loss fix — non-ambiguous slots persisted before ambiguity_pending
- Phase B: Triple-risk nodes + no numbered options — RISK_NODES, detectRiskNode(), buildContextualPlaceOptions()
- Phase C: Blog knowledge extraction — src/lib/ai/iguazu-knowledge.ts
- Phase D: DB aliases already cover all blog places

### Done (2026-06-30 — FIXES 1-5)
- **FIX 1 — rawOrigin/rawDest bug (ambiguity-handler.ts:207)**: `rawOrigin ?? rawDest ?? ""` → `isOrigin ? rawOrigin : rawDest`. Fixes "Entendí que vas a aeropuerto" when user said "desde el aeropuerto hasta el centro"
- **FIX 2 — Greeting with persona (response-builder.ts:141-147)**: "¡Hola! ¿En qué puedo ayudarte?" → "¡Hola! Soy Cris, de TaxiGuazú. Decime desde dónde y hacia dónde necesitás el traslado."
- **FIX 3 — Persona in extraction prompt (extraction-prompt.ts:20)**: "Eres un extractor de datos" → "Eres Cris, asistente virtual de TaxiGuazú en la Triple Frontera..."
- **FIX 4 — Context-aware retry (ambiguity-handler.ts + ambiguity-interpreter.ts)**: When LLM resolves one slot but not the other, retry the unresolved slot passing the resolved slot as context (e.g., origin="Aeropuerto IGR" → context to resolve "centro" as "Centro de Puerto Iguazú")
- **FIX 5 — Session row creation after .limpiar (ambiguity-handler.ts)**: All 4 `updateChatSessionSlots` calls changed to `upsertChatSession`. Root cause: after `.limpiar`, `chat_sessions` row is DELETED; UPDATE-only silently affects 0 rows; session is never re-created → slot_confirmation → pricing flow broken → bot responds "¿Desde dónde salís?"
- **FIX 6 — [object Object] en confirmación (lead.service.ts:370-371, 384-386)**: Los slots ahora son objetos `ConfirmedSlot` → `String(rawSlots.origin)` produce `"[object Object]"`. Fix: `rawSlots.origin?.value ?? rawSlots.origin` antes de interpolar. Tests 592/592 PASS.
- **Validation**: 592/592 tests PASS, `npm run build` PASS, `enforce.sh` PASS
- **Committed and pushed**: all 5 fixes in 2 commits (c953756 + 2b5362e) → Vercel auto-deploy
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

### Done (2026-06-30 — segunda parte: display_name, awaiting_passenger)
- **FIX 6b — String(rawSlots.origin) en lead.service.ts (2 locations)**: Mismo bug que FIX 6 pero en los calls que alimentan resolvePricingForSlots. Desbloquea pricing.
- **7d — Display_name poblado para 193 places en Turso**: Formato "Aeropuerto IGR (Argentina)", "Centro de Foz do Iguaçu (Brasil)". Seed-data.ts auto-genera display_name si es null.
- **7a — display_name en slots al resolver ambigüedad**: ConfirmedSlot.display?: string. 4 lugares en ambiguity-handler.ts y slot-confirmation.ts.
- **7e — .display ?? .value en mensajes al usuario**: lead.service.ts, ambiguity-handler.ts. Fix naming completo.
- **7b+7c — Nuevo estado awaiting_passenger**:
  - slot_confirmation muestra ambos precios (4p y 6p) + pregunta pasajeros
  - PAX_RE match → re-resuelve pricing → awaiting_confirmation
  - >6 pax → "máximo 6, contactanos"
  - Afirmativo sin cantidad → "¿Cuántos pasajeros?"
  - Negativo → collecting_slots
  - 7 archivos modificados

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

### Done (2026-06-30 — Issue 1: Cover con combined greeting+request)
- **Problema**: Usuario envía saludo + pedido en mismo mensaje ("hola quiero ir del aeropuerto al centro") → bot respondía solo con precio/confirmación sin presentarse.
- **Solución**: Nuevo hook en `lead.service.ts` (COMBINED GREETING + REQUEST) que detecta facts `greeting:` en intents no-GREETING. Primero envía intro corta vía `buildGreetingIntro()` y luego continúa flujo normal.
- **Implementación**:
  - `src/lib/ai/response-builder.ts:21-32` — `buildGreetingIntro(lang, customerName?)`: intro sin instrucciones de viaje
  - `src/lib/services/lead.service.ts:165-176` — Bloque COMBINED_GREETING entre GREETING_SHORTCUT y SLOT_CONFIRMATION_BUTTONS
- **Por qué no buildInformationalResponse("GREETING")**: Incluye "Decime desde dónde y hacia dónde", confuso cuando usuario ya dio origen y destino.
- **Tests**: 592/592 PASS, build PASS, enforce PASS

### Done (2026-06-30 — Issue 6+7)
- **Issue 7 — Implicit confirmation from idle**: Removido `convState !== "idle"` de extraction-runner.ts. Ahora afirmaciones como "sí" o "dale" son reconocidas incluso cuando el sistema está en estado idle, siempre que haya slots previos con origen+destino.
- **Issue 6 — Prompt philosophy upgrade**: Refactorizado buildResponsePrompt() en llm-response.ts. policyHint ya no es decorativo — ahora genera reglas específicas por modo (AHORA/RESERVA) + decisión (EXECUTE/ANSWER/CLARIFY). Behavioral guidelines, no scripts.
- **Validación**: 592/592 tests PASS, build PASS, enforce PASS

### Done (FUT-01 Fase 3 — 2026-07-02)
- **FUT-01 F3: slot-confirmation.ts migrado al catálogo i18n**: 7 strings hardcodeadas reemplazadas por `t("confirm.*", lang)`. `buildFieldSelector` y `buildPlaceOptions` también migradas. Bugfix: `_lang` era ignorado → ahora se usa correctamente. Bugfix: labels "origen"/"destino" en `buildPlaceOptions` siempre en español → ahora traducidas según `lang` vía `confirm.labelOrigin`/`confirm.labelDestination`.
- **Catalog.ts**: Completadas traducciones `en` para todas las keys `confirm.*`, `disamb.writeExact`, `disamb.writeExactWith`, `disamb.fieldSelector`, `commercial.prompt`. 3 nuevas entries: `confirm.labelOrigin`, `confirm.labelDestination`, `confirm.fieldSelectorPrompt`.
- **Enforce.sh**: R1 actualizado para permitir AI → services/i18n (servicio transversal).
- **Validación**: 680/680 tests PASS, build PASS, enforce PASS (R1-R4).

### Done (FUT-01 Fase 4 — 2026-07-02)
- **FUT-01 F4: ambiguity-handler.ts migrado al catálogo i18n**: ~8 grupos de strings reemplazados por `t()`:
  - `handleAmbiguityResponse`: `disamb.notFound`, `disamb.notFoundAlt` (3 casos inline ES/PT/EN → catálogo)
  - `finalizeAmbiguity`: mensaje de confirmación con valores resueltos → `finalize.summary` con `{origin, dest}`
  - `buildContextualPlaceOptions`: 4 ramas refactorizadas a catálogo:
    - Risk node fallback → `disamb.contextualOrigin` / `disamb.contextualDest`
    - Sin rawTerm → `disamb.noRawTerm`
    - Alta confianza → `disamb.contextualHigh`
    - Genérico → `disamb.contextualGeneric`
  - `_text` renombrado a `text` en `finalizeAmbiguity` y se usa `detectLeadLang(text)` para i18n.
- **Catalog.ts** completado:
  - `en` agregado a: `disamb.notFound`, `disamb.notFoundAlt`, `disamb.contextualOrigin`, `disamb.contextualDest`, `disamb.contextualHigh`, `disamb.contextualGeneric`, `disamb.noRawTerm`, `finalize.summary`
  - `disamb.contextualHigh` cambiado a usar `{slotKey, place}` (más genérico que anterior `{slotLabel, place}`)
  - PT actualizado en `disamb.contextualGeneric`, `disamb.noRawTerm`, `disamb.contextualHigh` para alinear con código en producción
- **Validación**: 680/680 tests PASS, build PASS, enforce PASS (R1-R4).

### Done (AIT-050 — 2026-07-05)
- **AIT-050 — Sentry integration**: `@sentry/nextjs@10.63.0` instalado con `--legacy-peer-deps`. `instrumentation.ts` con Sentry.init condicional (DSN opcional — modo silencioso si no hay DSN). `instrumentation-client.ts` creado (cliente, con `onRouterTransitionStart`). `next.config.ts` envuelto con `withSentryConfig` (silent sin DSN). Webhook envuelto con `wrapRouteHandlerWithSentry`. Endpoint `/api/sentry-test` de verificación. `sentry.server.config.ts` y `sentry.edge.config.ts` eliminados (App Router migration). Build clean sin DSN. Servidor arranca sin DSN. 771 tests, 0 regresiones. **Requiere `SENTRY_DSN` provisto por Cristian desde Sentry.io para activar captura en producción.**

### Done (AIT-052 — 2026-07-05)
- **AIT-052 — Sistema de evals**: Dataset de 25 casos en `scripts/eval-cases/dataset.ts` con 5 grupos obligatorios (CUSTOMS_EN, FRONTERA_PT, FRUST_TRUE/FP, AMBIGUOUS) + 15 regulares (booking ES/EN/PT, NOW, greeting, commercial, consulta, emergency, reschedule, post-service). Runner `scripts/run-evals.ts` que ejecuta `core()` + `router()` + FRUSTRATION_RE contra cada caso. Reporta tabla detallada por caso, resumen agregado (precisión intent 100%, output_type 100%, slot recall 90%, frustration 96%), y breakdown por tag. `npm run evals` script en package.json.
- **Resultado: 24/25 PASS (96%)** — único fallo: falso positivo conocido de FRUSTRATION_RE con "leé bien" en contexto de dirección. Gaps documentados: core() sin NLU EN/PT, POST_SERVICE no detectado, parsing "del X al Y" fusiona slots, frustración + extracción sin origin/destination.
- **Validación**: 771 tests PASS, build PASS, enforce PASS.

### Open
- **FUT-01 F5: Migrar policy-reserva.ts + policy-ahora.ts (~20 strings).**
- **FUT-01 F6: Agregar `lang` a timeouts.ts + migrar lead.service.ts + handler.ts.**
- **P5: Display_name en toda la cadena de mensajes** — Parcialmente resuelto (7a/7e cubre slot_confirmation y ambiguity). Pendiente: propagar display_name a mensajes de recovery y extracción.

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
- **Combined greeting+request: dual-message response pattern** — Cuando el usuario envía saludo + pedido en el mismo mensaje ("hola quiero ir del aeropuerto al centro"), el bot respondía solo con el mensaje de negocio (precio/confirmación) sin presentarse. Se agregó un nuevo hook en `lead.service.ts` que detecta la presencia de facts `greeting:` en mensajes cuyo intent NO es GREETING (pure greeting ya se manejaba aparte). Cuando se detecta, envía PRIMERO un mensaje corto de presentación ("¡Hola! Soy Cris, de TaxiGuazú.") y LUEGO continúa con el flujo normal para el mensaje de negocio. Implementación: `response-builder.ts` — nueva función `buildGreetingIntro(lang, customerName?)` (intro corta SIN instrucciones de viaje); `lead.service.ts` — nuevo bloque COMBINED GREETING + REQUEST entre GREETING_SHORTCUT y SLOT_CONFIRMATION_BUTTONS. No se usó `buildInformationalResponse("GREETING")` porque incluye instrucciones "Decime desde dónde y hacia dónde", confusas cuando el usuario ya dio origen y destino.

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

### Critical Bug Pattern: rawOrigin ?? rawDest ?? "" siempre retorna rawOrigin
- Trigger: Ambos slots son ambiguos pero solo uno está sin resolver. `rawOrigin ?? rawDest ?? ""` evalúa rawOrigin (no-null) aunque firstSlot sea destination.
- Fix: Usar `isOrigin ? rawOrigin : rawDest` para que coincida con el slot que se está preguntando.
- Archivo: `ambiguity-handler.ts:207`
- Síntoma: Bot dice "Entendí que vas a aeropuerto" cuando firstSlot es origin y rawOrigin="aeropuerto".

### Critical Bug Pattern: UPDATE-only silencioso tras DELETE (.limpiar)
- Trigger: `.limpiar` borra la fila de `chat_sessions`. Luego `updateChatSessionSlots()` ejecuta UPDATE que afecta 0 filas sin error. La sesión nunca se recrea.
- Síntoma: Bot ignora slots confirmados en turno anterior y vuelve a preguntar "¿Desde dónde salís?" en vez de dar precio.
- Fix: Usar `upsertChatSession(phone, slots, undefined, convState, undefined)` que hace INSERT+UPDATE, creando la fila si no existe.
- Archivo: `ambiguity-handler.ts` — 4 calls cambiados de `updateChatSessionSlots` a `upsertChatSession`.
- Regla aprendida: Cualquier función que modifique `chat_sessions` después de `.limpiar` debe ser INSERT+UPDATE, no solo UPDATE.

### Pattern: Bot persona desde el primer turno
- Trigger: Primer mensaje del usuario ("hola", "buenas", etc.) detectado como GREETING.
- Comportamiento: La respuesta incluye presentación ("Soy Cris, de TaxiGuazú") + pregunta tácita por ambos slots ("Decime desde dónde y hacia dónde").
- Fundamento: En los chats reales, Cristian se presenta naturalmente y el usuario responde con ambos lugares. Guía sin preguntar explícitamente paso a paso.
- Archivos: `response-builder.ts:141-147`

### Pattern: LLM necesita persona en TODOS los prompts
- Trigger: Cualquier llamada a LLM que procese input del usuario (extracción, interpretación, respuesta).
- Regla: El system prompt debe establecer quién es el asistente ("Cris, asistente virtual de TaxiGuazú en la Triple Frontera") para que el LLM entienda geografía, contexto y rol.
- Justificación: Sin persona, el LLM trata "centro" como genérico y no lo asocia con "Centro de Puerto Iguazú" cuando el origen es IGR.
- Archivo: `extraction-prompt.ts:20`

### Pattern: Context-aware retry para slots ambiguos
- Trigger: LLM resuelve un slot (ej. origin="Aeropuerto IGR") pero el otro queda ambiguo (ej. "centro").
- Comportamiento: En vez de preguntar al usuario, se reintenta el slot no resuelto pasando el resuelto como contexto adicional en el prompt.
- Prompt: "CONTEXTO ADICIONAL: El otro slot ya se resolvió como: {nombre del lugar resuelto}. Usá esta información para desambiguar el slot restante."
- Resultado: LLM infiere "centro" = "Centro de Puerto Iguazú" por coherencia geográfica, sin preguntar al usuario.
- Coincide con: Comportamiento de Cristian en chats reales (nunca pregunta por "centro" cuando ya sabe que el origen es aeropuerto IGR).
- Archivos: `ambiguity-interpreter.ts`, `ambiguity-handler.ts`

### Decision: Modo de operación del ARNES (2026-06-30) — SUPERSEDED
- ~~**Acordado:** A partir de ahora, el Director ejecuta el pipeline completo de 7 fases para TODO cambio que no sea trivial.~~

### Decision: Refactorización constitucional del ARNÉS (2026-07-07)
- **Acordado:** El pipeline de 7 fases fue reemplazado por la Constitución del ARNÉS (`ael/constitution/SPEC.md`).
- **Nuevo modelo:** El Director es un Mission Planner soberano. Decide qué capabilities usar, en qué orden, cuáles omitir. No hay fases fijas. No hay pipeline predefinido.
- **Estructura:** El ARNÉS se organiza en tres niveles: Constitución (`ael/constitution/`), Gobierno (`ael/government/`), Administración (scripts, templates, memoria).
- **Capabilities:** Discovery, Architecture, Implementation, Validation, Memory, Learning, Governance. Son herramientas, no pasos.
- **Fuentes de verdad:** Constitución (`ael/constitution/SPEC.md`, `CONTRACTS.md`) y Gobierno (`ael/government/ORGANIZATION.md`, `roles/`).
- **Documentos archivados:** PIPELINE.md, HANDOFF.md, FAILURE.md, AGENTS.md, 01-director.md → `ael/archive/`.
- **Cambios triviales:** Siguen exceptuados. El Director decide.

## Key Decisions (Issue 6+7 — 2026-06-30)
- **Issue 7: convState !== "idle" removido — slots previos como guard principal**: Se removió `convState !== "idle"` de dos guards en extraction-runner.ts (línea 186 y 255-258). La razón: si el usuario ya tiene slots previos con origen+destino y dice "sí" o "dale" estando en idle, la afirmación es válida — no necesita re-colección. La condición `hasPrevSlotsLocation` (requiere origin AND destination) sigue siendo el guard principal. Si no hay slots previos, la afirmación cae al flujo normal de extracción. Esto resuelve el bug donde afirmaciones implícitas se ignoraban después de un pricing exitoso.
- **Issue 6: policyHint como behavioral modifier, no etiqueta decorativa**: `policyHint` ("AHORA: ejecutar acción inmediata") era una etiqueta inyectada al prompt sin efecto real — el LLM recibía las mismas reglas base en todos los modos. Se refactorizó `buildResponsePrompt()` en `llm-response.ts` para generar reglas específicas por modo+decisión (6 combinaciones: AHORA+EXECUTE/ANSWER/CLARIFY, RESERVA+EXECUTE/ANSWER/CLARIFY). Filosofía: behavioral guidelines, no exact scripts. El LLM decide cómo decir, pero las reglas indican qué priorizar según el modo. policyHint pasó de decorativo a conductivo.

### Pattern: Silent data corruption at type/contract boundaries
- **Trigger**: Cambio de formato de dato en estructura compartida (ej: slot de `string` a `{value, resolvedBy}`) o cambio de comportamiento de DB function (ej: `updateChatSessionSlots` de upsert a update-only). Los consumidores downstream no se actualizan porque TypeScript no detecta el mismatch en runtime y JS no lanza error.
- **Comportamiento**: Sin error, sin warning — corrupción silenciosa.
  - `String(rawSlots.origin)` → `"[object Object]"`
  - `updateChatSessionSlots()` → UPDATE afecta 0 filas, sesión jamás recreada, bot se resetea
- **Causa raíz**: TypeScript borra los tipos en runtime. `String(object)` es JS válido. `UPDATE` con 0 filas es SQL válido. No hay contratos defensivos en fronteras entre módulos.
- **Mitigación sistemática**:
  1. Al cambiar tipo de un dato (string→objeto), buscar TODOS los consumidores con `grep -r "rawSlots\." src/` o el nombre de propiedad afectado.
  2. Patrón defensivo: `rawSlots.origin?.value ?? rawSlots.origin` — funciona con string legacy y objeto nuevo.
  3. Para DB: preferir `upsert*` sobre `update*` cuando la existencia del row es incierta. Si se usa `update*`, verificar `result.rowsAffected > 0`.
  4. Type guards runtime: `typeof rawSlots.origin === "string"` para ramas legacy.
- **Files**: `lead.service.ts:370-371,384-386` (FIX 6), `ambiguity-handler.ts` (FIX 5), `database.ts`

## Key Decisions (DEBT-01, DEBT-02, DEBT-03 — 2026-07-02)

- **DEBT-01 — AFFIRMATION_RE unificado (2026-07-02)**: Dos regex de afirmación diferentes en core.ts y patterns.ts, con patrones inconsistentes (core.ts tenía `listo`, `correcto`, `todo bien` que patterns.ts no tenía; patterns.ts tenía `sim`, `yes`, `sí dale` que core.ts no tenía). Un test de integración copiaba el regex inline. Se movió la definición unificada a patterns.ts como `export const AFFIRMATION_RE`, combinando todos los tokens de ambas versiones con boundary `(?![a-záéíóúñ])`. core.ts importa desde patterns, isAffirmativeMessage() usa el mismo export, y el test de integración importa desde patterns. 9 archivos de test mockeados recibieron AFFIRMATION_RE en sus vi.mock(). Archivos: `src/lib/ai/patterns.ts`, `src/lib/ai/core.ts`, `tests/integration/fase-25-no-legacy-confirmation.test.ts`.
- **DEBT-02 — Dependencia survey→lead documentada (2026-07-02)**: BACKLOG.md listaba "Cadena circular survey.service → lead.service" como deuda P1. El análisis reveló que NO es circular — es una cadena lineal `survey.service → lead-event-helpers → lead.service`. lead.service NO importa survey ni lead-event-helpers. El problema real es acoplamiento vertical (post-venta → preventa). Se documentó la dirección de dependencia en `lead-event-helpers.ts` con comentario explícito y solución futura sugerida (extraer lead-injection.service). Se actualizó BACKLOG.md para clarificar que no es circular. **T3 (2026-07-23)**: `lead-event-helpers.ts` eliminado — sin consumidores restantes. La dependencia survey→lead queda resuelta por eliminación del archivo puente. Archivos: `ael/artifacts/BACKLOG.md`.
- **DEBT-03 — Estado global eliminado de guard.ts (2026-07-02)**: guard.ts tenía 3 variables a nivel de módulo (`coreState`, `finalState`, `policyState`) compartidas entre requests concurrentes. Entre resetRequestState() y runExtractionPipeline() hay ~400 líneas con múltiples awaits donde otro request podía pisar el estado. Se eliminaron las 3 variables globales. assertCoreRouterPolicy() ahora retorna `true` siempre (su función era redundante con assertPipelineComplete que ya usa parámetros explícitos). setRequestState() y resetRequestState() son no-ops documentados. extraction-runner.ts se actualizó para no llamar assertCoreRouterPolicy(). Archivos: `src/lib/ai/guard.ts`, `src/lib/services/extraction/extraction-runner.ts`, `tests/services/extraction-runner.test.ts`. Verificación: 665 tests pasan, build ok, enforce R1-R4 ok.

### Pattern: Excluding idle from affirmation handling blocks implicit confirmation
- Trigger: Feature que filtra por `convState !== "idle"` para decidir si procesar o ignorar input del usuario.
- Risk: `idle` excluye demasiado — después de mostrar precio, el sistema puede estar en idle y el usuario afirmar naturalmente ("dale", "sí"). Excluir idle bloquea ese caso de uso aunque los slots con origen+destino estén presentes.
- Mitigation: Usar guards de datos (ej: `hasPrevSlotsLocation`, que verifica origin AND destination en slots previos) en lugar de guards de estado para controlar si un input debe procesarse. El estado idle no implica "sin contexto" — los slots persisten en la sesión y son suficientes para procesar una afirmación.
- Files: extraction-runner.ts

## Key Decisions (FUT-03 — 2026-07-02)

- **FUT-03 — Mensajes multimedia (location/image) ignorados silenciosamente**: `route.ts:232` cortaba cualquier mensaje sin `text.body`. Se agregaron dos branches antes del early-return: `message.type === "location"` → `reverseGeocode(lat, lon)` via Nominatim (OpenStreetMap) → dirección legible → `handleLeadMessage`; `message.type === "image"` → caption/fallback → `handleLeadMessage`. Nuevo archivo `src/lib/services/geo/reverse-geocode.ts` con rate limiting interno de 1.1s entre requests y fallback a coordenadas crudas si la API falla. No incluido en MVP: descarga/análisis de imágenes, envío de location de vuelta, tipos formales de WhatsApp webhook, integración con places de la DB. 665 tests pasan, build ok, enforce R1-R4 ok.

## Key Decisions (FUT-02 — 2026-07-02)

- **FUT-02 — Transcripción de audios WhatsApp implementada**: Antes los audios (voice notes) llegaban a route.ts y caían en el early-return por falta de `text.body`. Ahora se descargan, transcriben con Gemini 2.0 Flash multimodal y se inyectan como texto al pipeline de lead.
  - **Arquitectura corregida post-revisión AEL**: El plan original ponía `media-download.ts` y `audio-transcriber.ts` en `services/media/`. El Architect (subagente `ael-design`) observó que esto bypaseaba las capas WhatsApp y AI — `media-download.ts` haría HTTP calls a Meta Graph API fuera de `sender.ts` (capa WhatsApp), y `audio-transcriber.ts` importaría `@google/generative-ai` directo desde services saltando la capa AI. Se reestructuró:
    1. **WhatsApp layer** (`sender.ts`): nueva función `getMediaDownloadUrl(mediaId)` que usa `getToken()` y `axios.get()` existentes, manteniendo toda interacción con Meta Graph API dentro de la abstracción WhatsApp.
    2. **AI layer** (`src/lib/ai/transcribe.ts`): nueva función `transcribeAudio(buffer, mimeType)` que crea su propio `GoogleGenerativeAI` client dentro de la capa AI, con limpieza de MIME type (strips `; codecs=opus`). Fallback a `"🎤 [mensaje de voz]"` si Gemini falla o no hay API key.
    3. **Webhook layer** (`route.ts`): orquesta delgada — llama `getMediaDownloadUrl`, hace `fetch(url)` con Bearer token, llama `transcribeAudio`, llama `handleLeadMessage`. Sin lógica de negocio.
  - **Flujo completo**: audio message → Meta API media URL → download buffer → Gemini transcription → `handleLeadMessage(phone, text)` → pipeline normal de lead.
  - **Validación**: 676/676 tests PASS, build PASS, enforce R1-R4 PASS. "🎤 [mensaje de voz]" como fallback si la API de Gemini falla o expiró la URL de descarga.

## Relevant Files (FUT-03)

- `src/lib/services/geo/reverse-geocode.ts` — Nueva función reverseGeocode()
- `src/app/api/whatsapp/webhook/route.ts` — Location e image handlers

## Relevant Files (FUT-02)

- `src/lib/sender.ts` — Nueva función export `getMediaDownloadUrl(mediaId)` para obtener URL de descarga de media de Meta Graph API
- `src/lib/ai/transcribe.ts` — Nuevo archivo: `transcribeAudio(buffer, mimeType)` vía Gemini 2.0 Flash multimodal con limpieza de MIME type
- `src/app/api/whatsapp/webhook/route.ts` — Handler para `message.type === "audio"`: download → transcribe → handleLeadMessage, con fallback robusto

## Key Decisions (FUT-04 — 2026-07-02)

- **FUT-04 — Re-engagement de consultas estancadas implementado**: `checkTimeouts()` ahora incluye `checkReengagement()` que detecta leads idle > 30 min (STALE_LEAD_TIMEOUT_S=1800) en estados client-facing (`idle`, `collecting_slots`, `slot_confirmation`, `awaiting_passenger`).
  - **Flag-based dedup**: `setConnectionFlag("reengagement_+54911223344")` + `getConnectionValueFlag()` evita re-engagement duplicado en 24h. Sin flag → envía. Con flag → salta.
  - **Mensaje contextual por estado**:
    - `idle` + ambos slots completos → "¿Todavía necesitás el traslado de {origen} a {destino}? D"
    - `collecting_slots` + slots parciales → "¡Hola! ¿Necesitás ayuda con un traslado? Decime desde dónde..."
    - `slot_confirmation` → re-envía resumen + botones
    - `awaiting_passenger` → "¿Cuántos pasajeros son?"
    - Sin slots útiles → mensaje genérico
  - **Estados excluidos**: `ambiguity_pending` (en medio de desambiguación), `escalation` (humano involucrado), `awaiting_confirmation` (a punto de cerrar).
  - **Logs**: `[REENGAGEMENT] Enviado a ******3344 state=idle msg="..."`, `[REENGAGEMENT] 1 re-engagement(s) enviado(s)`.
  - **Validación**: 680/680 tests PASS, build PASS, enforce R1-R4 PASS.
  - **No implementado en FUT-04**: broadcast admin de leads estancados, schedule dinámico (siempre se ejecuta en cada tick), re-engagement vía botones interactivos.

## Relevant Files (FUT-04)

- `src/config/constants.ts` — `STALE_LEAD_TIMEOUT_S = 1800` (30 min en segundos)
- `src/lib/db/database.ts` — Nueva función `getStaleLeadConversations(cutoff: number)` que consulta leads en estados específicos con `last_interaction < cutoff`
- `src/lib/timeouts.ts` — Nueva función `checkReengagement()` llamada desde `checkTimeouts()`; orquesta: query → dedup → mensaje contextual → set flag
- `tests/services/timeouts.test.ts` — 4 nuevos tests para checkReengagement: contextual idle, skip por flag, sin leads, slots parciales
