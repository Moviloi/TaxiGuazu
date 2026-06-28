# MEMORY — TaxGuazú Bot

Memoria de ingeniería del equipo agéntico. Estructurada para consumo agéntico.

---

## 1. Estado actual

### Último commit conocido
- main: `bf970af` (Refactoring Pipeline — 23 fixes)

### Fase completada
- FASE 5B.3 ✓ — Multi-turn persistence via `chat_sessions.slots` merge
- FASE 5B.4 ✓ — LLM extraction prompt respeta role lock + prev slots de CORE
- FASE 6.1 ✓ — Intent Expansion: 4 legacy → 10 intents (69/69 pass)
- FASE 29.4 ✓ — Confirmation response transport — interactive buttons routing
- **Pipeline ARNÉS ✓** — Separación responsabilidades lead.service + Integración OpenCode

### Branch activa
- main

---

## 2. Decisiones

### Decisiones arquitectónicas
- v3.0: 21 decisiones §9 cerradas
- v4.0: `MAX_CAPACITY`, `ensureFleetCanHandle`, TARIFF_MAX_PAX=6
- v5.0: LEGACY FLOW eliminado Fase 1; Reservation Orchestrator Fase 5
- ADR 001: Arquitectura en capas (Accepted)
- ADR 002: Database facade pattern (Accepted)
- ADR 003: Learning domain consolidation (Accepted)
- ADR 004: Service boundary rules (Accepted)

### Decisiones de implementación
- **5B**: POLICY única fuente de `finalResponse` con `outputSource="POLICY"`
- **5B.1**: NO asumir "centro" como origin. Hotel landmarks → CLARIFY
- **5B.2**: regex con lookahead `\s*` y contracciones (al/del)
- **5B.3**: `loadPreviousSlots()` async, merge con prioridad role lock > LLM > prev
- **5B.4**: `getExtractionContextMessage` inyecta constraints de CORE como system message
- **ARNÉS-OpenCode**: Arquitectura `Usuario → OpenCode → ael → PIPELINE.md → src/`
- **handleSlotConfirmationButton** permanece en lead.service.ts.

### Decisiones pendientes
- Blueprint FASE 6.0 (COMMERCIAL-MODEL-SPEC.md) — sin implementar

---

## 3. Riesgos

### Riesgos activos
- R1/R4 doble creación (mitigado Fase 2)
- R9 trip huérfano
- R11 contingencia race
- R12 check-then-act
- R22 reconfirm 24h
- R26 webhook sin auth
- R27 `/api/bot/check-timeouts` GET sin auth
- 5B.5c DEFERIDO: `${trip.status}` en groq.ts:197

### Riesgos arquitectónicos conocidos
- `guard.ts` state a nivel de módulo (no request-scoped) — riesgo de concurrencia
- `survey.service.ts` importa de `lead.service` — cadena circular (R2 VIOLATION)
- `response-builder.ts` importa `OpportunityResult` de learning — viola AI→Services (R1 WARN)
- learning/ importa de `db/domains/learning.ts` directamente — bypasea facade
- 4 archivos de servicio usan `getDb()` directamente
- 9 archivos superan 300 líneas (lead.service.ts reducido a 268 tras pipeline ARNÉS)

### Riesgos de ecosistema
- `.env` contiene secretos pero NO está trackeado por git (.gitignore funciona)
- 22 skills irrelevantes instalados en `.agents/skills/`
- 16 scripts de test manuales obsoletos en `scripts/`
- Secretos en historial git (Vercel OIDC tokens, expiran automáticamente)

### Riesgos mitigados
- R1/R4 doble creación — mitigado en Fase 2
- `.env` en repo — MITIGADO: .gitignore actualizado, precommit script creado
- Hardcoded fallback en webhook route.ts — MITIGADO: eliminado, retorna 500 si falta config
- Secretos en staged files — MITIGADO: precommit escanea archivos staged
- Secretos en docs — MITIGADO: security check escanea ael/ y docs/

---

## 4. Historial

### Pipeline ARNÉS ✓ COMPLETO (2026-06-27)
**Separación responsabilidades lead.service + Integración OpenCode**
- **Fase Director**: Separación de responsabilidades en lead.service como próximo refactor
- **Fase Explorer**: Mapeo completo — 303 líneas, 2 exports, 25 imports, 6 sub-handlers, 3 consumers
- **Fase Architect**: Diseño — ADR 001/004 compliance, handleSlotConfirmationButton (132 líneas) candidato a extracción
- **Fase Implementer**: Implementación — extracción intentada, revertida por Vitest dynamic import limitation
  - Resultado final: re-export en `slot-confirmation-handler.ts`, función permanece en lead.service.ts (268 líneas)
- **Fase Auditor**: Tests 610 passed, build PASS, enforce.sh PASS (sin nuevas violaciones)
- **Fase Memory**: DECISION_RECORD.md creado, MEMORY.md actualizado
- **Fase Learning**: PATTERN_EXTRACTION.md — patrón "Re-export Wrapper" documentado
- **Configuración OpenCode**: opencode.json + ael.md + 5 commands creados

### Pipeline ARNÉS ✓ COMPLETO (2026-06-27)
**Hardening de secretos y preparación CI/CD**
- **Fase Explorer**: Auditoría — `.env` con reales (no trackeado), hardcoded fallback en route.ts, .gitignore incompleto
- **Fase Architect**: Estrategia — Environment Boundary Pattern, secretos fuera del repo
- **Fase Implementer**: 
  - `.env.example` completado (11 variables,req + opt)
  - `.gitignore` actualizado (+`*.pem`, `*.key`, `secrets/`, `credentials/`)
  - `route.ts` hardcoded fallback eliminado (retorna 500 si falta config)
  - `docs/security/secrets.md` creado
  - `scripts/precommit-security-check.mjs` creado
  - `package.json` script `security-check` agregado
- **Fase Auditor**: security-check PASS, tests 610 PASS, build PASS, enforce.sh PASS
- **Fase Memory**: MEMORY.md actualizado
- **Fase Learning**: PATTERN_EXTRACTION.md — Environment Boundary Pattern documentado

### Pipeline ARNÉS ✓ COMPLETO (2026-06-27)
**Fix check-timeouts cron auth + Common helpers integration**
- **Fase Director**: Cron auth fix — CRON_SECRET added to .env, made required in env.ts
- **Fase Explorer**: Helper integration points mapped — assertAdmin (10 sites), parseSessionSlots (8 sites), fullReset (11 sites), sendAndPersist (80+ sites)
- **Fase Architect**: Enforce.sh integration — husky installed, security check wired to pre-commit
- **Fase Implementer**: 
  - `.env` — CRON_SECRET added with random value
  - `src/config/env.ts` — CRON_SECRET changed from optional to required
  - `src/lib/services/admin/admin-commands.ts` — Replaced 9 manual admin checks with assertAdmin
  - `src/lib/services/workflow/admin-commands.ts` — Replaced 1 manual admin check with assertAdmin
  - `src/lib/services/extraction/comprehension.ts` — Replaced 2 JSON.parse with parseSessionSlots
  - `src/lib/services/extraction/extraction-runner.ts` — Replaced 1 JSON.parse with parseSessionSlots, 3 sendWhatsAppMessage+insertMessage with sendAndPersist
  - `src/lib/services/memory/memory.ts` — Replaced 1 JSON.parse with parseSessionSlots
  - `src/lib/services/memory/context-memory.ts` — Replaced 1 JSON.parse with parseSessionSlots
  - `src/lib/services/workflow/policy-pipeline.ts` — Replaced 1 JSON.parse with parseSessionSlots
  - `src/lib/services/workflow/load-previous-slots.ts` — Replaced 2 JSON.parse with parseSessionSlots
  - `src/lib/services/workflow/response-reset.ts` — Replaced resetToIdle+resetChatSession with fullReset
  - `src/lib/services/workflow/opportunity-response.ts` — Replaced 5 paired resets with fullReset
  - `src/lib/services/workflow/conversation-setup.ts` — Replaced resetToIdle+resetChatSession with fullReset
  - `src/lib/services/extraction/comprehension-runner.ts` — Replaced 2 sendWhatsAppMessage+insertMessage with sendAndPersist
  - `.husky/pre-commit` — Created, runs security check
  - `src/lib/services/shared/lead-event-helpers.ts` — Created, extracts survey→lead coupling
  - `src/lib/services/trip-execution/survey.service.ts` — Uses createNewLeadFromSurvey instead of direct handleLeadMessage
- **Fase Auditor**: 610/612 tests PASS (3 pre-existing tariff-resolver failures), build PASS, security-check PASS
- **Fase Memory**: MEMORY.md updated

### Pipeline ARNÉS ✓ COMPLETO (2026-06-27)
**Migración de secretos y preparación CI/CD — Environment Boundary Pattern completo**
- **Fase Explorer**: Auditoría profunda — OIDC tokens en historial git (`91b8198`, `78113a8^`)
- **Fase Architect**: Environment Boundary Pattern — repo (sin secretos), local (.env), producción (Vercel dashboard)
- **Fase Implementer**:
  - `precommit-security-check.mjs` mejorado — escanea staged files, docs/, ael/
  - `SECRET_AUDIT.md` — auditoría completa de secretos
  - `SECRET_MIGRATION.md` — plan de migración con pasos específicos
  - `docs/security/secrets.md` — actualizado con historial de secretos
- **Fase Auditor**: security-check PASS, tests 610 PASS, build PASS, enforce.sh PASS
- **Fase Memory**: MEMORY.md actualizado
- **Fase Learning**: PATTERN_EXTRACTION.md — Environment Boundary Pattern documentado
- **ACCIONES PENDIENTES**: Verificar OIDC tokens de Vercel (expiran automáticamente)

### FASE 5B.3 ✓ COMPLETO (commit `2b46aea`)
**Multi-turn persistence via `chat_sessions.slots` merge**
- `lead.service.ts:391-392` `coreDecisionEarly` y `prevSlotsEarly` en scope externo
- `lead.service.ts:799-815` `loadPreviousSlots(phone)` async helper
- `lead.service.ts:701-797` `buildExtractionContext` con cadena de prioridad
  role lock (1.0) > LLM > prev (0.8)
- `upsertChatSession` guarda slots mergeados
- Tests: `scripts/test_5b3.ts` — 27/27 pass (T1-T6)

### FASE 5B.4 ✓ COMPLETO (commit `36d0dec`)
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

---

## 5. Pendientes

### Próximas fases
- **FASE 6.2**: Laterales handlers (RESCHEDULE, POST_SERVICE, EMERGENCY handlers dedicados)
- **FASE 6.3**: CustomerValue (eje horizontal, tiers NEW/RETURNING/VIP/AT_RISK)
- **FASE 6.4**: LeadMaturity (DataReadiness + ConversionSignal)
- **FASE 6.5**: Serviceability (TariffConfidence + SupplyConfidence)
- **FASE 6.6**: FunnelState unificado (7 estados, turn_count)
- **FASE 6.7**: Pipeline Adaptativo (matriz Intent × Pipeline)
- **FASE 6.8**: Tariff Composable Rules (Nivel B)

### Deuda técnica conocida
- 5B.5: 39 ocurrencias status legacy, audit trip_phase, auth check-timeouts
- 5B.5c DEFERIDO: `${trip.status}` en groq.ts:197
- 103 dead exports en learning/ (side effect de consolidación)
- `AFFIRMATION_RE` duplicado entre `core.ts:31` y `patterns.ts:29-36`
- i18n inline en 30+ bloques if/else
- **Circular survey→lead**: survey.service.ts importa handleLeadMessage de lead.service.ts — requiere ADR nuevo o módulo compartido
- **Re-export pattern**: slot-confirmation-handler.ts es solo re-export, no separación real de lógica

### Gaps de documentación
- No existe `architecture.md` formal ← CREADO
- No existe `conversation-model.md`
- No existe `state-machine.md` formal
- COMMERCIAL-MODEL-SPEC.md puede confundirse como implementado

---

## 6. Constantes

### Constantes de sistema
- `QUOTE_TTL_AHORA_MIN=15`
- `TITULAR_RESPONSE_WINDOW_S=1800`
- `POOL_RESPONSE_WINDOW_S=900`
- `MAX_REASSIGNMENT_ATTEMPTS=2`
- `DRAFT_ABANDON_TIMEOUT_S=86400`
- `SURVEY_SEND_DELAY_S=900`
- `TITULAR_LOCK_DAYS=30`
- `TARIFF_MAX_PAX=6`

### Estados de workflow
- **Trip**: DRAFT, QUOTED, CONFIRMED, ASSIGNED, IN_PROGRESS, CLOSED
- **WorkflowState**: idle, nivel_1, nivel_2, nivel_3, waiting_driver, closed, collecting_slots, awaiting_confirmation
- **DispatchState**: pending, nivel_1, nivel_2, nivel_3, broadcast, assigned, timeout

### Configuración crítica
- Node.js: `.nvmrc`
- Tests: `vitest.config.ts` (include: tests/**/*.test.ts, setup: tests/setup.ts)
- Build: `next.config.ts`

---

## 7. Glosario

### Términos del dominio
| Término | Definición |
|---------|-----------|
| Intent | Clasificación primaria de la intención del mensaje (11 valores) |
| Slot | Campo de datos que el sistema necesita para procesar un viaje |
| Workflow | Máquina de estados de la conversación |
| Dispatch | Asignación de un viaje a un chofer |
| FunnelState | Estado derivado del proceso de servicio (7 valores) |
| Serviceability | Probabilidad de que TaxiGuazú pueda cumplir el viaje |
| LeadMaturity | Probabilidad de cierre basada en completitud + comportamiento |
| CustomerValue | Tier estratégico del cliente (NEW/RETURNING/VIP/AT_RISK) |
| Role Lock | Bloqueo de campos confirmados por el usuario |
| CoreDecision | Salida del CORE: intent + facts + slot stability |
| OutputType | Modo de respuesta seleccionado por ROUTER |
| Lateral | Manejo de intenciones laterales (EMERGENCY, RESCHEDULE, POST_SERVICE) |

### Abreviaciones
| Abreviación | Significado |
|-------------|-------------|
| ADR | Architecture Decision Record |
| CORE | Fase de clasificación de intención del pipeline AI |
| ROUTER | Fase de selección de modo de respuesta |
| POLICY | Fase de generación de respuesta basada en reglas |
| LLM | Large Language Model (Groq / Llama 3.3 70B) |
| pax | Pasajeros |
