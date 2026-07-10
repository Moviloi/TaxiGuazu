# System Map — TaxGuazú

Mapa operativo: "Si necesito modificar X, buscar Y".

---

## Por dominio funcional

| Necesito modificar... | Buscar en... | Notas |
|----------------------|-------------|-------|
| **Clasificación de intención** | `src/lib/ai/core.ts` | Regex + computeConfidence. 11 intents. |
| **Routing de respuesta** | `src/lib/ai/router.ts` | CoreDecision → OutputType. 46 líneas. |
| **Pipeline conversacional (ADR-008)** | `src/lib/ai/handler.ts` | CORE → Conversation Interpreter → Client Objective → StrategyDecision → Router → Policy → LLM. 179 líneas. |
| **StrategyDecision** | `src/lib/ai/conversation-strategy.ts` | computeStrategyDecision(). Función pura. 230 líneas. |
| **Conversation Interpreter** | `src/lib/ai/conversation-interpreter.ts` | Clasifica rol conversacional (MessageType). Función pura. 101 líneas. |
| **Client Objective** | `src/lib/ai/client-objective.ts` | computeClientObjective(). Sintetiza señales. 109 líneas. |
| **Política AHORA** | `src/lib/ai/policy-ahora.ts` | Respuesta inmediata. 153 líneas. |
| **Política RESERVA** | `src/lib/ai/policy-reserva.ts` | Reserva programada. 507 líneas — el mayor AI module. |
| **Builder de respuestas** | `src/lib/ai/response-builder.ts` | Generación de texto. i18n inline. 170 líneas. |
| **Prompt LLM** | `src/lib/ai/llm-response.ts` | Construcción del prompt con contexto de StrategyDecision. 389 líneas. |
| **Guard de pipeline** | `src/lib/ai/guard.ts` | Enforcement de orden. 91 líneas. |
| **Extracción de datos** | `src/lib/services/extraction/extraction-runner.ts` | Runner principal. 443 líneas — GOD FUNCTION. |
| **Comprensión** | `src/lib/services/extraction/comprehension.ts` | Scoring de comprensión. 165 líneas. |
| **Confianza** | `src/lib/services/extraction/confidence.ts` | Cálculo de confianza. 160 líneas. |
| **Patrones de texto** | `src/lib/ai/patterns.ts` | Affirmation/negation regex. 56 líneas. |
| **Schema de extracción** | `src/lib/ai/extraction-schema.ts` | Zod schema. 21 líneas. |
| **Prompt de extracción** | `src/lib/ai/extraction-prompt.ts` | Prompt para LLM. 78 líneas. |

---

## Por dominio de servicios

| Necesito modificar... | Buscar en... | Notas |
|----------------------|-------------|-------|
| **Workflow de conversación** | `src/lib/services/workflow/slot-workflow.ts` | State machine. 55 líneas. |
| **Pipeline de políticas** | `src/lib/services/workflow/policy-pipeline.ts` | Policy + trip execution. 387 líneas. |
| **Setup de conversación** | `src/lib/services/workflow/conversation-setup.ts` | Session init. 45 líneas. |
| **Contexto de extracción** | `src/lib/services/workflow/build-extraction-context.ts` | Builder con 7 parámetros. 50 líneas. |
| **Comandos** | `src/lib/services/workflow/command-shortcuts.ts` | Atajos de comando. 75 líneas. |
| **Reset de respuesta** | `src/lib/services/workflow/response-reset.ts` | Reset de estado. 50 líneas. |
| **Comandos admin** | `src/lib/services/workflow/admin-commands.ts` | Comandos admin en workflow. 65 líneas. |
| **Oportunidades** | `src/lib/services/workflow/opportunity-response.ts` | Respuesta a oportunidades. 70 líneas. |
| **Completeness** | `src/lib/services/workflow/evaluate-completeness.ts` | Evaluación de completitud. 40 líneas. |

---

## Por dominio de dispatch

| Necesito modificar... | Buscar en... | Notas |
|----------------------|-------------|-------|
| **Dispatch workflow** | `src/lib/services/dispatch/dispatch-workflow.ts` | Lógica de dispatch. 60 líneas. |
| **Dispatch service** | `src/lib/services/dispatch/dispatch.service.ts` | Servicio principal. 383 líneas. |
| **Driver service** | `src/lib/services/dispatch/driver.service.ts` | Servicio de choferes. 473 líneas. |
| **Fleet validation** | `src/lib/services/dispatch/fleet-validation.ts` | Validación de flota. 85 líneas. |
| **Shift utils** | `src/lib/services/dispatch/shift-utils.ts` | Utilidades de turno. 30 líneas. |

---

## Por dominio de pricing

| Necesito modificar... | Buscar en... | Notas |
|----------------------|-------------|-------|
| **Motor de precios** | `src/lib/services/pricing/pricing-engine.ts` | Cálculo principal. 104 líneas. |
| **Resolver de tarifas** | `src/lib/services/pricing/tariff-resolver.ts` | Resolución de tarifas. 113 líneas. |
| **Pricing comercial** | `src/lib/services/pricing/commercial-pricing-engine.ts` | Reglas comerciales. 171 líneas. |
| **Resolve pricing** | `src/lib/services/pricing/resolve-pricing-for-slots.ts` | Para slots. 30 líneas. |

---

## Por dominio de trip-execution

| Necesito modificar... | Buscar en... | Notas |
|----------------------|-------------|-------|
| **Trip execution** | `src/lib/services/trip-execution/trip-execution.service.ts` | Servicio principal. 173 líneas. |
| **Now execution** | `src/lib/services/trip-execution/now-execution.service.ts` | Ejecución inmediata. 95 líneas. |
| **Survey** | `src/lib/services/trip-execution/survey.service.ts` | Encuestas post-servicio. 60 líneas. ⚠️ Importa de lead.service. |

---

## Por dominio de learning

| Necesito modificar... | Buscar en... | Notas |
|----------------------|-------------|-------|
| **Opportunity engine** | `src/lib/services/learning/opportunity-engine.ts` | Evaluación de oportunidades. 222 líneas. |
| **Fare learning** | `src/lib/services/learning/fare-learning-engine.ts` | Aprendizaje de tarifas. 135 líneas. |
| **Learning utils** | `src/lib/services/learning/learning-utils.ts` | Helpers compartidos. 50 líneas. |
| **Event tracking** | `src/lib/services/learning/event-tracking.ts` | Logging de eventos. 55 líneas. |
| **Admin** | `src/lib/services/learning/admin.ts` | Comandos admin de learning. 45 líneas. |
| **Opportunity types** | `src/lib/services/learning/opportunity-types.ts` | Tipos de oportunidades. 30 líneas. |

---

## Por dominio de memoria

| Necesito modificar... | Buscar en... | Notas |
|----------------------|-------------|-------|
| **Memory** | `src/lib/services/memory/memory.ts` | Memoria de sesión. 50 líneas. |
| **Predictive routing** | `src/lib/services/memory/predictive-routing.ts` | Predicción de contexto. 109 líneas. |
| **Context memory** | `src/lib/services/memory/context-memory.ts` | Contexto de memoria. 137 líneas. |

---

## Por dominio de otros servicios

| Necesito modificar... | Buscar en... | Notas |
|----------------------|-------------|-------|
| **Geo engine** | `src/lib/services/geo/geo-engine.ts` | Resolución geográfica. 226 líneas. |
| **Location resolver** | `src/lib/services/geo/location-resolver.ts` | Resolución de ubicaciones. 65 líneas. |
| **i18n** | `src/lib/services/i18n/detect-lang.ts` | Detección de idioma. 10 líneas. |
| **Admin service** | `src/lib/services/admin/admin.service.ts` | Notificaciones admin. 80 líneas. |
| **Admin commands** | `src/lib/services/admin/admin-commands.ts` | Comandos admin. 463 líneas. |
| **Housekeeping** | `src/lib/services/housekeeping/timeouts.ts` | Cron jobs + limpieza. 219 líneas. |
| **Error logger** | _(no implementado)_ | Logger compartido planeado. |

---

## Por dominio de base de datos

| Necesito modificar... | Buscar en... | Notas |
|----------------------|-------------|-------|
| **Facade (acceso a datos)** | `src/lib/db/database.ts` | 63 funciones exportadas. 694 líneas. |
| **Conexión** | `src/lib/db/core/connection.ts` | SQLite/Turso + schema. 482 líneas. |
| **Helpers** | `src/lib/db/core/helpers.ts` | query(), queryOne(), levenshtein() |
| **Tipos** | `src/lib/db/types.ts` | Definiciones de tipos de filas |
| **Domains: trips** | `src/lib/db/domains/trips.ts` | CRUD de viajes. 341 líneas. |
| **Domains: learning** | `src/lib/db/domains/learning.ts` | Queries de aprendizaje. ⚠️ Bypasea facade. |
| **Domains: connection-state** | `src/lib/db/domains/connection-state.ts` | Estado de conexión WhatsApp |
| **State accessors** | `src/lib/db/state-accessors.ts` | Accesores de estado conversacional |

---

## Por dominio de configuración

| Necesito modificar... | Buscar en... | Notas |
|----------------------|-------------|-------|
| **Constants** | `src/config/constants.ts` | Constantes globales. 43 líneas. |
| **Env vars** | `src/config/env.ts` | Validación Zod de env vars |

---

## Por archivo de orquestación

| Necesito modificar... | Buscar en... | Notas |
|----------------------|-------------|-------|
| **Orquestador principal** | `src/lib/services/lead.service.ts` | 301 líneas, orquesta webhook → sub-handlers → policy-pipeline. ⚠️ High complexity. |
| **Pipeline de efectos** | `src/lib/pipeline.ts` | Executor de efectos (processLead). 109 líneas. |
| **Webhook entry** | `src/app/api/whatsapp/webhook/route.ts` | Punto de entrada HTTP |
| **Handler de IA** | `src/lib/ai/handler.ts` | Entry point del pipeline AI conversacional (ADR-008). 179 líneas. |

---

## Por tipo de cambio

| Tipo de cambio | Dónde empezar | Qué validar |
|---------------|---------------|-------------|
| **Nueva intención** | `ai/core.ts` + `ai/router.ts` | ADR 001 (AI no importa de Services) |
| **Nuevo slot** | `ai/extraction-schema.ts` + `ai/extraction-prompt.ts` + workflow | ADR 004 (dependency order) |
| **Nueva policy** | `ai/policy-*.ts` | ADR 001 (AI layer) |
| **Nuevo servicio** | `services/nuevo-servicio/` | ADR 004 (dependency order) |
| **Nueva query DB** | `db/domains/` o `db/database.ts` | ADR 002 (facade pattern) |
| **Nueva tabla** | `db/core/connection.ts` (schema) + `db/domains/nuevo.ts` + `db/database.ts` (facade) | ADR 002 |
| **Nuevo command admin** | `services/admin/admin-commands.ts` + `services/workflow/admin-commands.ts` | Tamaño del archivo |
| **Cambio en dispatch** | `services/dispatch/` | ADR 004 (dispatch depende de learning, pricing, geo) |
| **Cambio en pricing** | `services/pricing/` | ADR 004 (pricing depende de geo) |
| **Cambio en learning** | `services/learning/` | ADR 003 + ADR 004 (learning depende de pricing, memory) |
