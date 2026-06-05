# MEMORY — v5.0 FASE 5B.x (Bot TaxiGuazú)

## Estado actual (Jun 4, 2026)

### FASE 5B.3 ✓ COMPLETO (commit `2b46aea`, pusheado a main)
**Multi-turn persistence via `chat_sessions.slots` merge**
- `lead.service.ts:391-392` `coreDecisionEarly` y `prevSlotsEarly` en scope externo
- `lead.service.ts:799-815` `loadPreviousSlots(phone)` async helper
- `lead.service.ts:701-797` `buildExtractionContext` con cadena de prioridad
  role lock (1.0) > LLM > prev (0.8)
- `upsertChatSession` guarda slots mergeados
- Tests: `scripts/test_5b3.ts` — 27/27 pass (T1-T6)

### FASE 5B.4 ✓ COMPLETO (commit `36d0dec`, pusheado a main)
**LLM extraction prompt respeta role lock + prev slots de CORE**
- `src/lib/ai/extraction-prompt.ts`:
  - Tipo `ExtractionContext { roleLock?, slotStability?, prevSlots? }`
  - `getExtractionContextMessage(ctx)` genera system message con:
    `CORE_ROLE_LOCK`, `CORE_STABILITY`, `PREV_SLOTS_PERSISTIDOS`
  - Filtra valores vacíos y stability='open' (default)
- `src/lib/ai/groq.ts`:
  - `generateGroqExtraction(userText, history, customerName?, ctx?)`
  - Inyecta system message de CORE entre prompt base y metadata idioma
  - Backward compatible (si ctx es undefined, no agrega message)
- `src/lib/services/lead.service.ts:401-410`:
  - `core(text)` y `loadPreviousSlots(phone)` movidos ANTES del LLM call
  - 4to arg `extractionContext` se pasa al LLM
- Tests: `scripts/test_5b4.ts` — 27/27 pass (T1-T8)

### FASE 6.1 ✓ COMPLETO
**Intent Expansion: 4 legacy → 10 intents**
- `types.ts`: Intent type expandido de 4 a 11 valores (9 nuevos + AMBIGUOUS + STATEFUL legacy)
- `core.ts`: 9 nuevos regex (GREETING_RE, INFORMATIONAL_RE, COMMERCIAL_RE, PRE_BOOKING_RE, BOOKING_RE, NOW_RE, RESCHEDULE_RE, POST_SERVICE_RE, EMERGENCY_RE) + classifyIntent con prioridad 1-10 + computeConfidence actualizado
- `router.ts`: mapIntentToOutput con switch para 11 intents, razón simplificada
- `lead.service.ts`: early return para laterals (EMERGENCY, RESCHEDULE, POST_SERVICE) antes del flujo de extracción
- Tests: `scripts/test_6_1.ts` — 69/69 pass (T001-T112)
- Regression: test_5b2/5b3/5b4 (27/27 each) + test_role_lock — todos OK

## Branch info
- main: `36d0dec` (5B.4) ← latest (FASE 6.1 sin commitear)

## Pendiente
- **FASE 6.2**: Laterales handlers (RESCHEDULE, POST_SERVICE, EMERGENCY handlers dedicados)
- **FASE 6.3**: CustomerValue (eje horizontal, tiers NEW/RETURNING/VIP/AT_RISK)
- **FASE 6.4**: LeadMaturity (DataReadiness + ConversionSignal)
- **FASE 6.5**: Serviceability (TariffConfidence + SupplyConfidence)
- **FASE 6.6**: FunnelState unificado (7 estados, turn_count)
- **FASE 6.7**: Pipeline Adaptativo (matriz Intent × Pipeline)
- **FASE 6.8**: Tariff Composable Rules (Nivel B)
- 5B.5: 39 ocurrencias status legacy, audit trip_phase, auth check-timeouts

## Decisiones arquitectónicas
- v3.0: 21 decisiones §9 cerradas
- v4.0: `MAX_CAPACITY`, `ensureFleetCanHandle`, TARIFF_MAX_PAX=6
- v5.0: LEGACY FLOW eliminado Fase 1; Reservation Orchestrator Fase 5
- **5B**: POLICY única fuente de `finalResponse` con `outputSource="POLICY"`
- **5B.1**: NO asumir "centro" como origin. Hotel landmarks → CLARIFY
- **5B.2**: regex con lookahead `\s*` y contracciones (al/del)
- **5B.3**: `loadPreviousSlots()` async, merge con prioridad role lock > LLM > prev
- **5B.4**: `getExtractionContextMessage` inyecta约束 de CORE como system message

## Constantes críticas
- `QUOTE_TTL_AHORA_MIN=15`, `TITULAR_RESPONSE_WINDOW_S=1800`
- `POOL_RESPONSE_WINDOW_S=900`, `MAX_REASSIGNMENT_ATTEMPTS=2`
- `DRAFT_ABANDON_TIMEOUT_S=86400`, `SURVEY_SEND_DELAY_S=900`
- `TITULAR_LOCK_DAYS=30`, `TARIFF_MAX_PAX=6`

## Estados workflow
- Trip: DRAFT, QUOTED, CONFIRMED, ASSIGNED, IN_PROGRESS, CLOSED
- WorkflowState: idle, nivel_1, nivel_2, nivel_3, waiting_driver, closed,
  collecting_slots, awaiting_confirmation

## Riesgos pendientes
- R1/R4 doble creación (mitigado Fase 2)
- R9 trip huérfano, R11 contingencia race, R12 check-then-act
- R22 reconfirm 24h, R26 webhook sin auth, R27 `/api/bot/check-timeouts` GET sin auth
- 5B.5c DEFERIDO: `${trip.status}` en groq.ts:197
