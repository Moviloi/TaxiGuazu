# FASE 6.0 — Especificación Técnica del Modelo Comercial TaxiGuazú

**Origen**: FASE 5B.7.5 — Arquitectura conceptual congelada.
**Estado**: Blueprint técnico. Sin código. Sin implementación.
**Próximo paso**: Fase 6.1+ de implementación.

---

## 1. MAPA COMPLETO DE DATOS

### 1.1 Intent

| Campo | Especificación |
|---|---|
| **Definición técnica** | Clasificación primaria de la intención del mensaje. Producida por CORE (reglas deterministas) + fallback IA si CORE no clasifica. |
| **INPUTS** | Texto del mensaje del usuario (`user_text`). |
| **SOURCE OF TRUTH** | `src/lib/ai/core.ts` (reglas regex). fallback: IA (solo si CORE retorna UNKNOWN). |
| **DEPENDENCIAS** | Ninguna (no depende de DB ni de historial). |
| **OUTPUT** | `{ intent: GREETING | INFORMATIONAL | COMMERCIAL | PRE_BOOKING | BOOKING | NOW | RESCHEDULE | POST_SERVICE | EMERGENCY | UNKNOWN, confidence: 0-1, facts: string[] }` |

**Valores UNKNOWN**: cuando CORE no puede clasificar y fallback IA tampoco → `intent: COMMERCIAL` (default seguro) + flag `ambiguous: true`.

### 1.2 Serviceability

| Campo | Especificación |
|---|---|
| **Definición técnica** | Probabilidad compuesta de que TaxiGuazú pueda cumplir el viaje al precio cotizado, en el tiempo requerido, con la calidad esperada. |
| **INPUTS** | `tariffMatch: { method, price, price4p, price6p, piso, tariffId }` | `fleet: { maxCapacity, availableDrivers[], maxPax }` | `driverEligibility: { count, byTier, byShift, byCountry }` | `margin: number` | `pax: number` | `origin: string` | `destination: string` | `timeToTrip: days` |
| **SOURCE OF TRUTH** | `tariffs` table, `drivers` table, `client_preferred_drivers` table, `package_prices` table. |
| **DEPENDENCIAS** | **TariffConfidence**: `matchTariff()`, `findTariff()`. **SupplyConfidence**: `getMaxFleetCapacity()`, `getAvailableDrivers()`, `validateFleetCanHandle()`, `broadcastTripToDrivers()` (eligibility logic), `timeouts.ts` (contingency). |
| **OUTPUT** | `{ score: 0-1, tariff: { method: "exact"|"composable"|"human"|"unknown", tariffId?: number, price?: number }, supply: { physical: 0-1, economic: 0-1, operational: 0-1, temporal: 0-1 } }` |

**Sub-componentes**:

| Sub | Definición | Cálculo |
|---|---|---|
| `tariff.method` | ¿Existe tarifa? | `exact` = match exacto en DB. `composable` = existe regla explícita que compone. `human` = no hay tarifa ni regla. `unknown` = datos insuficientes para evaluar. |
| `physical` | ¿Hay vehículo con capacidad? | `validateFleetCanHandle(pax)`. 1.0 si ok, 0.0 si no. |
| `economic` | ¿El chofer acepta el piso? | Ratio de choferes elegibles vs total disponibles. `eligible / total`. |
| `operational` | ¿Está en turno y país? | Ratio de choferes que pasan el filtro de turno+país sobre los que pasan economic. |
| `temporal` | ¿Puede llegar a tiempo? | Solo para AHORA: distancia estimada / velocidad promedio. Para programado: 1.0 (hay tiempo). |

**Combinación**: `Serviceability = tariff.weight * tariff.score + supply.weight * avg(physical, economic, operational, temporal)`.

**Pesos dinámicos por intent**:

| Intent | tariff.weight | supply.weight |
|---|---|---|
| NOW | 0.3 | 0.7 |
| BOOKING | 0.5 | 0.5 |
| PRE_BOOKING | 0.6 | 0.4 |
| COMMERCIAL | 0.7 | 0.3 |
| Resto | 0.5 | 0.5 |

### 1.3 LeadMaturity

| Campo | Especificación |
|---|---|
| **Definición técnica** | Probabilidad de cierre del evento actual, basada en completitud de datos operativos + señales de comportamiento. |
| **INPUTS** | **DataReadiness**: `slots: { origin, destination, passengers, scheduled_at, flight }`. **ConversionSignal**: `{ urgency, negativeSignals, customerHistory, engagementTurns, recencySeconds, hasComparatives }`. |
| **SOURCE OF TRUTH** | `chat_sessions.slots` (persistencia multi-turn), `core.ts` facts (urgency, negative signals), `conversations.last_message_at` (recencia), `trips` table (historial del cliente), `messages` table (engagement_turns). |
| **DEPENDENCIAS** | ExtractionResult (slots), CoreDecision (facts), ConversationRow (last_message_at), ChatSessionRow (turn_count), messages table (count). |
| **OUTPUT** | `{ score: 0-1, sub: { dataReadiness: 0-1, conversionSignal: 0-1 } }` |

**DataReadiness** = `avg(score de cada slot obligatorio)`. Exactamente el `overall_confidence` actual de `confidence.ts:129-132`, pero SIN incluir urgencia en mandatory fields. AHORA y Programado tienen los mismos mandatory fields (3: origin, destination, passengers). scheduled_at no es mandatorio para DataReadiness (es signal de ConversionSignal).

**ConversionSignal** = `f(urgency, negativeSignals, engagement, recency, history, comparatives)`.

| Signal | Peso | Valores |
|---|---|---|
| urgency | 0.3 | `ahora=1.0`, `pronto=0.7`, `programado=0.5`, `null=0.3` |
| negativeSignals | -0.3 | `true=-0.3`, `false=0.0` |
| engagement | 0.15 | `min(turns/5, 1.0)` — más turnos hasta un límite de 5 |
| recency | 0.1 | `1 - min(seconds/86400, 1)` — último mensaje hace <1h=1.0, >24h=0.0 |
| history | 0.15 | `returningCustomer=0.3`, `vip=0.5`, `new=0.0` (desde CustomerValue) |
| hasComparatives | -0.1 | `true=-0.1`, `false=0.0` |

**Combinación**: `ConversionSignal = max(0, min(1, sum(weightedSignals)))`.

**Fusión**: `LeadMaturity = 0.5 * DataReadiness + 0.5 * ConversionSignal`.

**INPUTS DISJUNTOS**:
- DataReadiness NO conoce: history, engagement, recency, comparatives, negative signals.
- ConversionSignal NO conoce: origin, destination, passengers, flight, scheduled_at.
- La única superposición aceptable: urgency aparece en ambos? **NO. Urgency es solo ConversionSignal.**

### 1.4 FunnelState

| Campo | Especificación |
|---|---|
| **Definición técnica** | Estado discreto del proceso de servicio. No es un score. Es un ENUM de 7 valores. |
| **INPUTS** | `workflowState: string` (desde `chat_sessions.workflow_state` o `conversation-workflow.state`), `turnCount: int` (nuevo campo en chat_sessions), `lastInteractionAt: unix timestamp` (desde `conversations.last_message_at` o `chat_sessions.updated_at`), `scoreTrend: "up"|"flat"|"down"` (cambio en DataReadiness en los últimos 2 turnos), `hasActiveTrip: boolean`. |
| **SOURCE OF TRUTH** | `chat_sessions` (workflow_state, turn_count, last_score_at, updated_at), `conversations` (last_message_at), `trips` (active trip check). |
| **DEPENDENCIAS** | ChatSessionRow (+ turn_count, last_score_at), ConversationRow, TripRow. |
| **OUTPUT** | `"NOT_STARTED" | "ENGAGED" | "STALLED" | "AWAITING_DECISION" | "ABANDONED" | "DISPATCHED" | "COMPLETED"` |

**Mapeo desde estado actual**:

- El modelo actual tiene 2 state machines paralelas: `slot-workflow.ts` (4 estados) + `conversation-workflow.ts` (8 estados).
- **FunnelState las unifica**: no es una tercera state machine, es un **derivado** que se computa desde ambas + nuevas columnas.
- No requiere cambios de schema en `chat_sessions.workflow_state` (sigue existiendo), solo agrega `turn_count` y `last_score_at`.

### 1.5 CustomerValue

| Campo | Especificación |
|---|---|
| **Definición técnica** | Tier estratégico del cliente basado en historial de viajes. Eje horizontal (no pertenece al funnel). |
| **INPUTS** | `lifetimeTrips: int`, `lifetimeValue: number`, `recencyDays: int`, `complaintCount: int`, `packageEligible: boolean`. |
| **SOURCE OF TRUTH** | `trips` table (por `phone`), `surveys` table (ratings), `conversations` table (recency). |
| **DEPENDENCIAS** | TripRow, SurveyRow. |
| **OUTPUT** | `"NEW" | "RETURNING" | "VIP" | "AT_RISK"` |

**Tiers**:

| Tier | lifetimeTrips | Paquete | complaintCount | recencyDays |
|---|---|---|---|---|
| VIP | ≥5 | — | 0 | <90 |
| RETURNING | ≥2 | O | — | <180 |
| NEW | 0 | — | — | — |
| AT_RISK | ≥2 | — | ≥1 | — |

**Cliente sin historial**: `NEW` (default safe).

---

## 2. MATRIZ INTENT × PIPELINE

### Leyenda

| Símbolo | Significado |
|---|---|
| ✅ | Obligatorio (debe computarse, bloquea dispatch si falla) |
| ◻ | Opcional (se computa si hay datos, no bloquea) |
| ⏳ | Diferible (se computa en background post-dispatch) |
| ⛔ | No se computa |
| 🚀 | Fast path permitido (bypaseo dimensiones no críticas) |

### Matriz

| INTENT | Serviceability | LeadMaturity | FunnelState | CustomerValue | Pipeline | Fast Path | Escalation Rule |
|---|---|---|---|---|---|---|---|
| **GREETING** | ⛔ | ◻ (para personalizar) | ◻ | ◻ | Solo CustomerValue si existe. Saludo directo. | 🚀 No computa nada. | Si intent=UNKNOWN + 2 turnos sin progreso → operador. |
| **INFORMATIONAL** | ⛔ | ✅ | ◻ | ◻ | LeadMaturity para decidir "responder breve" vs "escalar". Si LeadMaturity < 0.2 → escalar en 1 mensaje. | 🚀 Solo LeadMaturity. | Si LeadMaturity < 0.2 → operador. LeadMaturity ≥ 0.2 → responder sin push. |
| **COMMERCIAL** | ✅ | ✅ | ◻ | ◻ | Serviceability + LeadMaturity. Serviceability bloquea si < 0.3. | 🚀 No. | Si Serviceability < 0.3 → escalar a operador (no cotizar). Si Serviceability ≥ 0.3 + LeadMaturity ≥ 0.4 → cotizar. |
| **PRE_BOOKING** | ✅ | ✅ | ✅ | ◻ | Pipeline completo + FunnelState para decidir pursue. Serviceability bloquea. | 🚀 No. | Si Serviceability < 0.3 → escalar. Si FunnelState = STALLED → pursuit. |
| **BOOKING** | ✅ | ✅ | ✅ | ✅ | Pipeline completo. CustomerValue para priorización de dispatch. | 🚀 No. | Serviceability < 0.3: escalar y ofrecer alternativas. Serviceability ≥ 0.3: confirmation flow. |
| **NOW** | ✅ | ⏳ | ⏳ | ⏳ | Serviceability primero (rápido). LeadMaturity, FunnelState, CustomerValue se computan en background post-dispatch. | 🚀 Sí. Serviceability + dispatch. Resto diferido. | Serviceability < 0.5: escalar alerta a admin. Serviceability ≥ 0.5: dispatch inmediato. |
| **RESCHEDULE** | ⛔ (re-evaluar después) | ⛔ | ◻ (verificar trip activo) | ◻ | Cargar trip existente, modificar fecha/hora, re-evaluar Serviceability post-cambio. | 🚀 Solo se carga el trip existente. | Si trip no existe → escalar a operador. Si modificación exitosa → re-evaluar Serviceability. |
| **POST_SERVICE** | ⛔ | ⛔ | ◻ (verificar trip completado) | ✅ | Cargar trip completado. CustomerValue decide si ofrecer descuento, paquete o normal. | 🚀 Solo CustomerValue. | No aplica (es post-venta, no dispatch). |
| **EMERGENCY** | ⛔ | ⛔ | ✅ (verificar estado) | ◻ | Cargar trip activo, verificar estado, escalar alerta a admin + cliente. | 🚀 Alerta directa a operador. | Siempre escalar a operador + notificación urgente a admin. |

### Fast path: definición técnica

Fast path para NOW:
1. `core(text)` → detecta `intent: NOW`, extrae slots rápidos (origin via ESTOY_EN_RE, destination via IR_A_RE, pax via PAX_RE).
2. `Serviceability.fast()`: solo computa `physical` + `operational` (salta tariff, económico, temporal).
3. Si Serviceability ≥ 0.5: `broadcastTripToDrivers` inmediato.
4. En background (promesa diferida): computa `LeadMaturity`, `FunnelState`, `CustomerValue`, `Serviceability.complete()`.

**Tiempo objetivo del fast path**: <500ms desde que llega el mensaje hasta que se envía el broadcast.

---

## 3. MAPA DE RESPONSABILIDADES

### 3.1 Por dimensión

| Dimensión | IA | Reglas Determinísticas | Base de Datos | Operador Humano |
|---|---|---|---|---|
| **Intent** | Fallback solo si CORE retorna UNKNOWN (texto muy complejo o ambiguo). **IA NO clasifica por defecto.** | ✅ **Único decisor por defecto.** `core.ts` regex rule-based. Produce `intent` + `confidence` + `facts`. | 0 consultas. | 0. |
| **Tariff** (sub de Serviceability) | ✅ Extrae `origin`, `destination`, `passengers` del texto (via `generateGroqExtraction`). **NO calcula precio. NO compone tarifas.** | ✅ `matchTariff()` rule-based. Reglas de composición (Nivel B) son reglas explícitas configuradas por el operador. **Cero inferencia.** | ✅ `tariffs` table (origen, destino, precio, piso, garantizado, modality, crosses_border). | ✅ **Único decisor para nivel HUMAN.** El operador configura reglas COMPOSABLE en `tariff_composition_rules` (nueva tabla). |
| **Supply** (sub de Serviceability) | 0. | ✅ `validateFleetCanHandle()`, `getAvailableDrivers()`, `driverFloor()`, filtros de elegibilidad. | ✅ `drivers` (car_capacity, status, tier, shift, country, min_payout, acceptance_score, rating). `client_preferred_drivers`. `package_prices`. | 0. (Solo recibe notificaciones cuando Serviceability < 0.3) |
| **LeadMaturity** | ✅ IA extrae slots vía `generateGroqExtraction`. **NO computes maturity score. NO interpreta history.** | ✅ `confidence.ts` (DataReadiness). Nueva `computeConversionSignal()` (urgentes, negative signals, engagement, recency, history). | ✅ `chat_sessions.slots`. `conversations.last_message_at`. `trips` (history). `messages` (engagement). | 0. |
| **FunnelState** | 0. | ✅ Rule-based: `workflow_state` + `turnCount` + `lastInteractionAt` + `scoreTrend`. | ✅ `chat_sessions` (workflow_state, turn_count, last_score_at). `conversations.last_message_at`. | 0. (Solo consume del dashboard). |
| **CustomerValue** | 0. | ✅ Rule-based: queries historial, computa tier. | ✅ `trips` (lifetime). `surveys` (complaints). `conversations` (recency). | 0. (Solo consume). |
| **Dispatch** | 0. | ✅ `escalateTrip()`, `broadcastTripToDrivers()`, `offerToSpecificDriver()`. | ✅ `drivers.*`. `chat_sessions.workflow_state`. `trips.status`. | ✅ **Único decisor cuando Serviceability < 0.3 o EMERGENCY.** |

### 3.2 Regla de responsabilidad IA

**La IA solo hace 2 cosas**:
1. Extraer slots del texto (`generateGroqExtraction`).
2. Clasificar intent si CORE falla (solo como fallback).

**La IA NO hace**:
- Calcular scores.
- Componer tarifas.
- Decidir dispatch.
- Decidir pursuit.
- Decidir escalación.
- Interpretar historial del cliente.
- Decidir mensaje final (POLICY ya es rule-based).

**Cero ambigüedad**: si una decisión no está en la lista de arriba, no puede ser IA.

---

## 4. CONTRATO DE CADA DIMENSIÓN

### 4.1 Serviceability

| Campo | Especificación |
|---|---|
| **INPUT** | `{ origin, destination, passengers, urgency, timeToTrip?, customerTier? }` |
| **OUTPUT** | `{ score: 0-1, tariff: { method, price?, tariffId? }, supply: { physical, economic, operational, temporal } }` |
| **NULL POLICY** | Si `origin` o `destination` es null → Serviceability no se computa. Retorna `{ score: 0, tariff: { method: "unknown" }, supply: { physical: 0, economic: 0, operational: 0, temporal: 0 } }`. |
| **FALLBACK POLICY** | Si `matchTariff()` falla con error (excepción DB, timeout) → `tariff.method: "unknown"`, `tariff.price: null`. Si `getAvailableDrivers()` falla → `supply.physical: 0`. Serviceability.score usa los sub-scores disponibles y penaliza los fallidos con 0. **Nunca bloquear el flujo completo.** |

### 4.2 LeadMaturity

| Campo | Especificación |
|---|---|
| **INPUT** | `{ slots: { origin?, destination?, passengers?, scheduled_at?, flight? }, urgency?, negativeSignals?, history?, engagement?, recency?, comparatives? }` |
| **OUTPUT** | `{ score: 0-1, sub: { dataReadiness: 0-1, conversionSignal: 0-1 }, clarifyField?: string }` |
| **NULL POLICY** | Si `slots` es null o vacío → `dataReadiness: 0`. Si `history` no disponible (cliente nuevo) → `history: 0`. Si `engagement` no disponible (sin turn count) → `engagement: 0`. **Cada sub-score se computa con los datos disponibles.** |
| **FALLBACK POLICY** | Si `calculateSlotConfidence()` falla → `dataReadiness: 0`. Si `computeConversionSignal()` falla → `conversionSignal: 0`. LeadMaturity = 0.5 * dataReadiness + 0.5 * conversionSignal. **Siempre retorna un score aunque sea 0.** |

### 4.3 FunnelState

| Campo | Especificación |
|---|---|
| **INPUT** | `{ workflowState: string, turnCount: int, lastInteractionAt: unix_ts, scoreTrend: "up"|"flat"|"down", hasActiveTrip: boolean }` |
| **OUTPUT** | `"NOT_STARTED" | "ENGAGED" | "STALLED" | "AWAITING_DECISION" | "ABANDONED" | "DISPATCHED" | "COMPLETED"` |
| **NULL POLICY** | Si `workflowState` es null → `NOT_STARTED`. Si `turnCount` no existe (cliente sin chat_session) → `turnCount: 0`. |
| **FALLBACK POLICY** | Si no se puede determinar el estado por datos inconsistentes → `NOT_STARTED` (default safe). **Nunca "error".** |

### 4.4 CustomerValue

| Campo | Especificación |
|---|---|
| **INPUT** | `{ phone: string }` |
| **OUTPUT** | `{ tier: "NEW"|"RETURNING"|"VIP"|"AT_RISK", lifetimeTrips: int, lifetimeValue: number, recencyDays: int }` |
| **NULL POLICY** | Si `phone` es null → `NEW` (cliente anónimo). Si `trips` query falla → `NEW` (default safe). |
| **FALLBACK POLICY** | Si historial está vacío (nunca viajó) → `NEW`. Si historial existe pero incompleto → computar con los datos disponibles. **Nunca bloquear. Siempre retornar un tier.** |

---

## 5. MAPA DE TRANSICIONES DE FUNNELSTATE

### 5.1 Estados y transiciones

```
                    ┌─────────────────────────────────────────────────────┐
                    │                                                     │
                    ▼                                                     │
  NOT_STARTED ──► ENGAGED ──► AWAITING_DECISION ──► DISPATCHED ──► COMPLETED
                    │               │                      │
                    │               │                      │
                    ▼               ▼                      ▼
                 STALLED ─────► ABANDONED ◄───────────────┘
                    │               │
                    │               │ (si vuelve + confirma)
                    └───────────────┘
```

### 5.2 Transiciones detalladas

| Estado actual | Evento disparador | Siguiente estado | Timeout | Acción del bot |
|---|---|---|---|---|
| `NOT_STARTED` | Primer mensaje recibido | `ENGAGED` | — | Iniciar recolección de slots. |
| `ENGAGED` | `scoreTrend = "up"` (DataReadiness mejora entre turnos) | `ENGAGED` (se mantiene) | — | Continuar recolectando. Pedir próximo campo. |
| `ENGAGED` | `scoreTrend = "flat"` por ≥2 turnos consecutivos | `STALLED` | — | Cambiar estrategia: ofrecer ayuda o escalar. |
| `ENGAGED` | DataReadiness ≥ threshold (0.7) + sin campos por clarificar | `AWAITING_DECISION` | — | Mostrar resumen + pedir confirmación. |
| `ENGAGED` | Sin mensajes del cliente por >24h | `ABANDONED` | `24h` | Enviar re-engagement (1 mensaje). Si no responde en 24h más, cerrar. |
| `STALLED` | Nuevos datos del cliente (score sube) | `ENGAGED` | — | Continuar recolección. |
| `STALLED` | Sin mejora por 3 turnos | `ABANDONED` (o escalar a operador) | — | Escalar a operador con resumen. |
| `STALLED` | Cliente confirma explícitamente | `AWAITING_DECISION` | — | Mostrar resumen + pedir confirmación final. |
| `AWAITING_DECISION` | Cliente confirma (affirmation) | `DISPATCHED` | — | Iniciar dispatch (escalateTrip). |
| `AWAITING_DECISION` | Cliente corrige datos | `ENGAGED` | — | Volver a recolección. |
| `AWAITING_DECISION` | Sin respuesta del cliente por >24h | `ABANDONED` | `24h` | Enviar re-engagement. |
| `ABANDONED` | Cliente vuelve + confirma | `DISPATCHED` | — | Iniciar dispatch. |
| `ABANDONED` | Cliente vuelve sin confirmar | `ENGAGED` | — | Reactivar recolección. |
| `ABANDONED` | Sin respuesta por >48h | `ABANDONED` (se mantiene) | `48h` | Cerrar sesión. Limpiar `chat_sessions`. |
| `DISPATCHED` | Chofer acepta | `COMPLETED` | — | Notificar cliente + cerrar workflow. |
| `DISPATCHED` | Broadcast falla (0 choferes) | `ABANDONED` | — | Notificar admin + cliente. |
| `DISPATCHED` | Timeout de espera (>3min waiting_driver) | `ABANDONED` | `3min` | Ofrecer contingencia (2 vehículos). |
| `COMPLETED` | — (terminal) | — | — | No hay acción. |

### 5.3 Nuevas columnas en chat_sessions

Para soportar FunnelState se requieren:

| Columna | Tipo | Default | Propósito |
|---|---|---|---|
| `turn_count` | INTEGER | 0 | Contador de turnos (se incrementa por cada mensaje del usuario en la sesión). |
| `last_score_at` | INTEGER (unix_ts) | null | Timestamp de la última vez que el score mejoró. Se usa para `scoreTrend`. |
| `funnel_state` | TEXT | "NOT_STARTED" | Cache del estado actual de FunnelState. Se actualiza en cada turno. |

**No se eliminan las columnas existentes** (`workflow_state`, `slots`, `confidence`, etc.). FunnelState coexiste con `workflow_state` como un derivado computado, no como reemplazo inmediato.

---

## 6. MATRIZ DE FALLBACKS

| Escenario | Qué ocurre | Acción del bot | Acción del operador |
|---|---|---|---|
| **TariffConfidence = UNKNOWN** (datos insuficientes para evaluar) | Serviceability se computa con `tariff.method: "unknown"`. Serviceability.score penalizado. | Si Intent=BOOKING/NOW: escalar a operador. Si Intent=COMMERCIAL: no cotizar, pedir datos. | Notificado con "tarifa desconocida para ruta X". |
| **SupplyConfidence = UNKNOWN** (no se puede evaluar flota) | Serviceability se computa con `supply: { physical: 0, economic: 0, operational: 0, temporal: 0 }`. Serviceability.score = tariff.weight. | Proceder con tarifa como referencia. Escalar a admin si Intent=BOOKING/NOW. | Notificado con "disponibilidad desconocida para ruta X". |
| **CustomerValue inexistente** (cliente sin historial) | `tier: "NEW"`. CustomerValue no bloquea ninguna dimensión. | Trato estándar. Sin personalización. | No aplica. |
| **Cliente nuevo** (sin trips, sin history, sin rating) | CustomerValue = NEW. ConversionSignal.history = 0. | Proceso estándar. LeadMaturity solo usa DataReadiness + signals no-históricas. | No aplica. |
| **Historial vacío** (DB no tiene registros) | Todos los queries de historial retornan 0/null. CustomerValue = NEW. ConversionSignal.history = 0. | No hay impacto en dispatch. Solo falta personalización. | No aplica. |
| **Datos insuficientes** (origin o destination faltantes) | Serviceability no se computa (retorna score: 0). LeadMaturity solo tiene DataReadiness parcial. | Pedir dato faltante. No cotizar. No dispatchar. | No aplica (el bot pide el dato). |
| **IA no clasifica intent** (CORE fallback también falla) | `intent: COMMERCIAL` + `ambiguous: true`. Pipeline: COMMERCIAL con flag de ambigüedad. | Preguntar: "¿Querés cotizar un viaje o tenés una consulta?" | No aplica. |
| **Workflow inconsistente** (slot_workflow y conversation_workflow en estados incompatibles) | FunnelState se computa desde el estado más avanzado. Si hay trip activo → DISPATCHED. Si no → NOT_STARTED. | Reset parcial: reiniciar slot_workflow a idle, mantener conversation_workflow. Solo si hay inconsistencia grave. | Notificado con "inconsistencia de workflow para cliente X". |
| **Serviceability = 0** (sin tarifa, sin choferes, sin datos) | Bloquea dispatch. Cliente derivado a operador. | Mensaje: "Estamos revisando tu solicitud. Un operador te va a contactar." | Notificado con todos los datos disponibles + razón de Serviceability=0. |
| **Dispatch falla** (broadcast a 0 choferes) | FunnelState = ABANDONED. Trip queda en estado pendiente. | Mensaje al cliente: "No encontramos chofer disponible ahora. Un operador te va a contactar." | Notificado con trip_id, ruta, motivo del fallo (0 eligibles). |
| **Timeout de awaiting_confirmation** (>24h) | FunnelState = ABANDONED. Trip no se crea. `chat_sessions` se resetea parcialmente. | 1 mensaje de re-engagement: "¿Seguís necesitando el viaje?" Si no responde en 24h → cerrar. | Notificado con lead perdido por inactividad. |

---

## 7. DEPENDENCY GRAPH

### 7.1 Grafo de dependencias

```
       Intent
         │
         ▼
  ┌─────────────┐
  │ LeadMaturity │ ◄──── ExtractionResult, CoreDecision
  └──────┬──────┘
         │
         ▼
  ┌──────────────┐
  │ Serviceability│ ◄──── TariffMatchResult, FleetValidation, DriverEligibility
  └──────┬───────┘
         │
         ▼
  ┌─────────────┐
  │ FunnelState  │ ◄──── workflow_state, turn_count, last_interaction_at, scoreTrend
  └──────┬──────┘
         │
         ▼
  ┌───────────────┐
  │ CustomerValue  │ (independiente, eje horizontal)
  └───────┬───────┘
          │
          ▼
     ┌──────────┐
     │ Pipeline  │ (combina Intent + 4 dimensiones → decide acción)
     └─────┬────┘
           │
           ▼
      ┌──────────┐
      │ Dispatch  │
      └──────────┘
```

### 7.2 Dependencias fuertes (A debe existir antes de B)

| De | A | Razón |
|---|---|---|
| Intent | LeadMaturity | LeadMaturity usa `intent` para ponderar ConversionSignal. |
| Intent | Serviceability | Serviceability usa `intent` para pesos dinámicos (NOW vs BOOKING). |
| LeadMaturity (DataReadiness) | Serviceability | Serviceability necesita `origin`, `destination`, `passengers` (de slots) para cotizar. **Si no hay slots, Serviceability = 0.** |
| LeadMaturity (ConversionSignal) | FunnelState | FunnelState usa `turnCount` (engagement) y `scoreTrend` (cambio en DataReadiness) desde LeadMaturity. |
| CustomerValue | Pipeline | Pipeline usa `customerTier` para decidir priorización de dispatch. **Pero es débil: solo modula, no bloquea.** |
| FunnelState | Dispatch | FunnelState decide qué acción de dispatch ejecutar (broadcast vs offerToSpecific vs escalar). |

### 7.3 Dependencias débiles (pueden computarse en paralelo o en cualquier orden)

| De | A | Razón |
|---|---|---|
| CustomerValue | Serviceability | Solo afecta pesos de dispatch, no el cálculo de Serviceability. |
| CustomerValue | LeadMaturity | Solo afecta signal `history` en ConversionSignal. No es blocking. |
| CustomerValue | FunnelState | No tiene dependencia. |

### 7.4 Componentes independientes (pueden computarse en paralelo)

| Componente | Independiente de |
|---|---|
| CustomerValue | Serviceability, LeadMaturity, FunnelState, Intent |
| Intent | CustomerValue, FunnelState, Serviceability, LeadMaturity |

### 7.5 Acoplamientos a eliminar

1. **Serviceability depende de LeadMaturity para slots**. Acoplamiento fuerte: sin slots, Serviceability=0. **Solución**: pasar slots directamente desde la extracción (ya disponible antes de LeadMaturity). Serviceability debe recibir slots como input directo, no desde LeadMaturity.

2. **FunnelState depende de LeadMaturity para scoreTrend**. Acoplamiento medio: FunnelState necesita saber si hubo mejora en DataReadiness. **Solución**: FunnelState recibe `prevScore` + `currentScore` directamente desde DataReadiness, no desde LeadMaturity.

**Principio**: cada dimensión recibe inputs directos de sus fuentes de datos, NO desde otras dimensiones. Las dimensiones son consumidores de datos, no consumers de otras dimensiones (excepto Pipeline, que las consume a todas).

---

## 8. PLAN DE IMPLEMENTACIÓN

### Fase 6.1 — Identificador de Intents Expandido

| Campo | Especificación |
|---|---|
| **Objetivo** | Expandir `core.ts` de 4 intents a 9 intents (6 verticales + 3 laterales) con nuevos regex. |
| **Archivos afectados** | `src/lib/ai/core.ts` (regex nuevos + `classifyIntent`), `src/lib/ai/types.ts` (Intent enum), `src/lib/ai/router.ts` (mapeo a OutputType). |
| **Riesgo** | Bajo. Solo regex + router. No toca policies, dispatch, ni DB. |
| **Complejidad** | Baja. ~20 líneas de regex + ~10 líneas de routing. |
| **Criterio de aceptación** | Tests T1-T20: cada intent canónico clasifica correctamente desde texto de ejemplo. Tests de regresión: los 27 tests existentes de 5B.2-5B.4 siguen pasando. |
| **Dependencias** | Ninguna. |

### Fase 6.2 — Intent Laterales (RESCHEDULE, POST_SERVICE, EMERGENCY)

| Campo | Especificación |
|---|---|
| **Objetivo** | Detectar y rutear los 3 intents laterales. Crear handlers dedicados. |
| **Archivos afectados** | `src/lib/ai/core.ts` (regex), `src/lib/ai/router.ts` (nuevos mapeos), `src/lib/ai/handler.ts` (nuevo path lateral), `src/lib/services/lead.service.ts` (dispatch de laterales). |
| **Riesgo** | Medio. Laterales tocan lead.service.ts (entry point). Posible impacto en dispatch si EMERGENCY no escala correctamente. |
| **Complejidad** | Media. Requiere identificar y cargar trip existente para RESCHEDULE/EMERGENCY, y trip completado para POST_SERVICE. |
| **Criterio de aceptación** | Tests T21-T30: cada intent lateral identifica y maneja correctamente el flujo. RESCHEDULE carga trip existente. EMERGENCY escala a admin. POST_SERVICE ofrece post-venta. |
| **Dependencias** | Fase 6.1. |

### Fase 6.3 — CustomerValue (eje horizontal)

| Campo | Especificación |
|---|---|
| **Objetivo** | Computar tier de cliente basado en historial de trips. |
| **Archivos afectados** | Nuevo: `src/lib/services/customer-value.ts`. Modificado: `src/lib/services/lead.service.ts` (integración en contexto del handler). |
| **Riesgo** | Bajo. No toca dispatch, policies, ni IA. Solo consultas agregadas a DB. |
| **Complejidad** | Baja. ~50 líneas. 4 queries SQL (lifetime trips, lifetime value, complaints, recency). 1 función `computeCustomerValue(phone)`. |
| **Criterio de aceptación** | Tests T31-T38: clientes con 0, 2, 5+ trips, con/sin complaints, reciben tier correcto. Tests de regresión no rotos. |
| **Dependencias** | Fase 6.1 (para integrar tier en el contexto del handler en lead.service.ts). |

### Fase 6.4 — LeadMaturity (DataReadiness + ConversionSignal)

| Campo | Especificación |
|---|---|
| **Objetivo** | Unificar SlotScore existente (DataReadiness) con nuevo ConversionSignal. Crear `computeLeadMaturity()`. |
| **Archivos afectados** | Nuevo: `src/lib/services/lead-maturity.ts`. Modificado: `src/lib/services/confidence.ts` (refactor para exponer DataReadiness), `src/lib/services/lead.service.ts` (reemplazar `calculateSlotConfidence` por `computeLeadMaturity`). |
| **Riesgo** | Medio-Alto. Toea el flujo principal del bot (lead.service.ts). `computeLeadMaturity` reemplaza `calculateSlotConfidence` en el pipeline. |
| **Complejidad** | Media. ~80 líneas. DataReadiness es el `overall_confidence` actual. ConversionSignal es nuevo. |
| **Criterio de aceptación** | Tests T39-T55: DataReadiness mide solo slots. ConversionSignal mide solo no-slots. LeadMaturity compone ambos. Tests existentes 5B.2-5B.4 no rotos (DataReadiness debe ser idéntico al overall_confidence actual). |
| **Dependencias** | Fase 6.1, Fase 6.3 (ConversionSignal usa CustomerValue.history). |

### Fase 6.5 — Serviceability (TariffConfidence + SupplyConfidence)

| Campo | Especificación |
|---|---|
| **Objetivo** | Integrar Tariff match existente con Supply validation existente en un score compuesto. |
| **Archivos afectados** | Nuevo: `src/lib/services/serviceability.ts`. Modificado: `src/lib/services/fleet-validation.ts` (exponer sub-scores), `src/lib/services/tariff-matcher.ts` (exponer method + alternatives como TariffConfidence). |
| **Riesgo** | Alto. Toca dispatch (`fleet-validation.ts`), tariff engine (`tariff-matcher.ts`), y el flujo de confirmation en `lead.service.ts`. Serviceability puede bloquear dispatch si score < 0.3. |
| **Complejidad** | Alta. ~120 líneas + cambios en 2 servicios existentes. Requiere orquestación. |
| **Criterio de aceptación** | Tests T56-T75: cada sub-score (physical, economic, operational, temporal) se computa correctamente. Serviceability se combina con pesos dinámicos por intent. **Serviceability < 0.3 bloquea dispatch correctamente.** Tests existentes 5B.2-5B.4 + 5B.6.1-5B.6.3 no rotos. |
| **Dependencias** | Fase 6.1, Fase 6.4 (DataReadiness provee slots para tariff match). |

### Fase 6.6 — FunnelState unificado + turn_count

| Campo | Especificación |
|---|---|
| **Objetivo** | Crear FunnelState discreto de 7 estados. Agregar `turn_count` + `last_score_at` a `chat_sessions`. |
| **Archivos afectados** | Nuevo: `src/lib/services/funnel-state.ts`. Modificado: `src/lib/db/database.ts` (migración para agregar columnas), `src/lib/services/slot-workflow.ts` (emitir cambios de score para FunnelState). |
| **Riesgo** | Medio. Migración de DB (ADD COLUMN es seguro, no destructivo). Transición: FunnelState coexiste con workflow_state legacy. |
| **Complejidad** | Media. ~100 líneas + migración. |
| **Criterio de aceptación** | Tests T76-T90: cada estado de FunnelState se alcanza desde los disparadores correctos. Transiciones válidas e inválidas definidas. Timeouts funcionan. |
| **Dependencias** | Fase 6.4 (scoreTrend desde DataReadiness). |

### Fase 6.7 — Pipeline Adaptativo

| Campo | Especificación |
|---|---|
| **Objetivo** | Implementar pipeline adaptativo por intent usando la matriz Intent × Pipeline. |
| **Archivos afectados** | Modificado: `src/lib/services/lead.service.ts` (función `handleLeadMessage` — refactor del pipeline), `src/lib/ai/handler.ts` (pipeline adaptativo). |
| **Riesgo** | Alto. Refactor del punto de entrada principal del bot. Posible impacto en todos los flujos (AHORA, RESERVA, laterals). |
| **Complejidad** | Alta. ~150 líneas. Orquestación de 5 servicios (Core, LeadMaturity, Serviceability, FunnelState, CustomerValue). |
| **Criterio de aceptación** | Tests T91-T110: cada intent usa el pipeline correcto (fast path para NOW, full para BOOKING, etc.). Tests de regresión: todos los tests existentes (5B.2-5B.4, 5B.6.x) pasan. |
| **Dependencias** | Fase 6.1, 6.2, 6.3, 6.4, 6.5, 6.6. **Esta es la última fase de implementación, después de todas las demás.** |

### Fase 6.8 — Composable Tariff Rules (Nivel B)

| Campo | Especificación |
|---|---|
| **Objetivo** | Crear sistema de reglas explícitas para tarifas COMPOSABLE. Operador configura reglas. IA no compone. |
| **Archivos afectados** | Nuevo: `src/lib/services/tariff-composer.ts`, migración DB para `tariff_composition_rules`. Modificado: `src/lib/services/tariff-matcher.ts` (consulta reglas antes de retornar "not_found"). |
| **Riesgo** | Medio. No toca el pipeline principal. Solo el tariff engine. Operador debe configurar reglas. Sin reglas, las tarifas siguen siendo HUMAN. |
| **Complejidad** | Media. ~80 líneas + migración. |
| **Criterio de aceptación** | Tests T111-T120: reglas de composición se consultan y aplican correctamente. Si no hay regla → HUMAN. Si hay regla → COMPOSABLE con precio calculado. |
| **Dependencias** | Fase 6.5 (para integrar COMPOSABLE en Serviceability). **Puede ejecutarse en paralelo con 6.6-6.7.** |

### Resumen de fases

| Fase | Nombre | Esfuerzo | Riesgo | Depende de | Paralelizable |
|---|---|---|---|---|---|
| 6.1 | Intent expandido | XS | Bajo | — | Sí |
| 6.2 | Laterales | S | Medio | 6.1 | No |
| 6.3 | CustomerValue | XS | Bajo | 6.1 | Sí (con 6.2) |
| 6.4 | LeadMaturity | M | Medio-Alto | 6.1, 6.3 | No |
| 6.5 | Serviceability | M | Alto | 6.1, 6.4 | No |
| 6.6 | FunnelState | M | Medio | 6.4 | Sí (con 6.5, 6.8) |
| 6.7 | Pipeline Adaptativo | L | Alto | 6.1-6.6 | No |
| 6.8 | Tariff Composable Rules | M | Medio | 6.5 | Sí (con 6.6) |

---

## 9. AUDITORÍA DE COMPATIBILIDAD

### Componentes existentes

| Componente | Impacto | Decisión |
|---|---|---|
| **slot-workflow.ts** (4 estados: idle, collecting_slots, awaiting_confirmation, closed) | FunnelState (7 estados) lo reemplazará conceptualmente. slot-workflow sigue siendo el motor de transición de slots (DataReadiness). | **KEEP** — pero renombrado como "slot engine". Deja de ser el "workflow" principal. |
| **conversation-workflow.ts** (8 estados: idle, collecting_slots, awaiting_confirmation, nivel_1/2/3, waiting_driver, closed) | FunnelState reemplazará la mitad superior (pre-dispatch). La mitad inferior (nivel_1/2/3, waiting_driver) se mueve a FunnelState.DISPATCHED. | **MERGE** (parcial) — la lógica de niveles y waiting_driver sigue siendo necesaria para dispatch, pero el estado se expone como FunnelState.DISPATCHED. |
| **trip_phase** (5 valores: QUOTED, ASSIGNED, CLOSED, etc.) | FunnelState.COMPLETED mapea a trip_phase.CLOSED. FunnelState.DISPATCHED mapea a trip_phase.ASSIGNED. **No hay conflicto.** | **KEEP** — trip_phase sigue siendo el estado del viaje en DB. FunnelState es el estado del cliente en la conversación. Son complementarios. |
| **trips.status** (legacy: consulta, asignado_chofer, etc.) | FunnelState lo ignora. trip_phase ya lo reemplazó. | **DEPRECATE** — no se toca en esta fase, pero se marca como legacy. |
| **dispatch** (`escalateTrip`, `broadcastTripToDrivers`, `offerToSpecificDriver`) | Serviceability modula el dispatch (puede escalar antes o cambiar ruta). La lógica de dispatch existente sigue funcionando. | **KEEP** — pero Serviceability lo precede como gate opcional. |
| **tariff engine** (`matchTariff`, `findTariff`, `searchTariffs`) | Se expone `method` como TariffConfidence. Nivel COMPOSABLE se integra como consulta previa a `not_found`. | **KEEP** — con extensión menor (consulta reglas de composición). |
| **lead tracking** (`leads` table, `broadcastLeadToDrivers`) | CustomerValue y FunnelState reemplazarán la necesidad de la tabla `leads` (el estado del cliente se infiere de trips + chat_sessions). | **DEPRECATE** (Fase 7+) — la tabla `leads` tiene 2 callsites en `admin.service.ts`. Se depreca cuando FunnelState esté estable. |
| **confidence.ts** (calculateSlotConfidence) | Su lógica se mueve a `DataReadiness` dentro de `computeLeadMaturity`. La función `calculateSlotConfidence` se refactoriza pero su lógica se conserva. | **KEEP** — refactorizado como sub-componente de LeadMaturity. |
| **types.ts** (Intent, CoreDecision, ExtractionContext, HandlerContext) | Intent se expande de 4 a 9. ExtractionContext recibe nuevos campos opcionales (`serviceability`, `leadMaturity`, `funnelState`, `customerTier`). | **KEEP** — expandido. |
| **handler.ts** (handleMessage) | El pipeline adaptativo modifica cómo se llama, pero la función `handleMessage` sigue siendo el entry point. | **KEEP** — refactorizado internamente. |
| **lead.service.ts** (handleLeadMessage) | Punto principal de modificación. Recibe el pipeline adaptativo completo. | **KEEP** — refactorizado. |
| **system-prompt.ts / extraction-prompt.ts** | IA solo extrae slots. No cambia. | **KEEP** — sin cambios. |
| **groq.ts** (generateGroqExtraction, generateGroqReply) | generateGroqReply sigue siendo LEGACY_FLOW_BLOCKED. generateGroqExtraction no cambia. | **KEEP** — sin cambios. |

### Resumen de decisiones

| Decisión | Cantidad | Componentes |
|---|---|---|
| **KEEP** | 8 | slot-workflow, trip_phase, dispatch, tariff engine, confidence.ts, types.ts, handler.ts, groq.ts |
| **KEEP (refactorizado)** | 2 | lead.service.ts, conversation-workflow.ts |
| **KEEP (expandido)** | 2 | types.ts, handler.ts |
| **MERGE** | 1 | conversation-workflow.ts (parcial con FunnelState) |
| **DEPRECATE** | 2 | trips.status, leads table |

**Ningún componente se elimina en esta fase.** Todo lo existente sigue funcionando. Las nuevas dimensiones se agregan como capas adicionales, no como reemplazos.

---

## 10. VEREDICTO FINAL

### A. ¿El modelo congelado puede implementarse sin romper producción?

**Sí. Las 4 dimensiones canónicas se agregan como capas adicionales sobre el pipeline existente. No reemplazan nada. El pipeline actual (CORE → ROUTER → POLICY → OUTPUT) sigue funcionando idéntico para los modos AHORA y RESERVA actuales. Las nuevas dimensiones son inputs opcionales para la POLICY; si una dimensión no está disponible (fase de transición), la POLICY funciona con los datos actuales (slots + workflow_state).**

**Riesgo mitigation**: cada fase 6.x puede ser mergeada y puesta en producción independientemente, sin esperar a que las fases posteriores estén listas. La Fase 6.1 (intent expandido) no rompe nada porque el router actual mapea los 4 intents legacy; los nuevos intents usan los mismos mapeos. La Fase 6.7 (Pipeline Adaptativo) es la única fase que toca el flujo principal — pero incluso ella es un refactor controlado con tests de regresión.

### B. ¿Cuáles son los 3 mayores riesgos técnicos?

1. **R1 — Pipeline adaptativo roto para NOW.** Fast path para NOW bypasea dimensiones y sale directo a dispatch. Si el fast path se implementa incorrectamente (ej. bypasea Serviceability cuando debería computarla rápida), un cliente AHORA puede ser dispatchado sin verificar capacidad operativa → riesgo comercial. **Mitigación**: Serviceability.fast() debe ser implementado y testeados ANTES del pipeline adaptativo (Fase 6.5 antes que 6.7).

2. **R2 — conversionSignal superpuesto con DataReadiness.** Si la implementación de LeadMaturity no respeta inputs disjuntos, conversionSignal va a terminar incluyendo señales de slots (urgency, scheduled_at) → colapsa en el mismo error que SlotScore=LeadScore. **Mitigación**: enforce en el código que `computeConversionSignal()` recibe SOLO inputs no-slots. Tests que verifican que cambiar un slot no afecta conversionSignal.

3. **R3 — Migración de FunnelState inconsistente con workflow_state legacy.** FunnelState coexiste con las dos state machines legacy. Si la implementación de FunnelState no sincroniza correctamente con `slot_workflow` y `conversation_workflow`, los estados legacy y FunnelState divergen → dashboard inconsistente. **Mitigación**: FunnelState se computa como derivado (READ-ONLY respecto a las state machines) durante la Fase 6.6. No escribe sobre workflow_state. La divergencia se detecta con alertas.

### C. ¿Cuál debería ser la primera fase de build?

**Fase 6.1 — Intent Expandido.**

**Razones**:
- **Riesgo más bajo**: solo toca `core.ts`, `types.ts`, `router.ts`. No toca DB, no toca dispatch, no toca policies.
- **Base para todo lo demás**: Serviceability, LeadMaturity, FunnelState, CustomerValue y pipeline adaptativo dependen del Intent para sus pesos dinámicos y paths.
- **Valor inmediato**: aunque el resto no esté implementado, tener 9 intents (en vez de 4) mejora la precisión del routing. Ej: INFORMATIONAL ya no cae en COMMERCIAL.
- **Rapidez**: ~30 líneas de regex + tests. Se implementa y mergea en 1 sesión.

**Razón por la que NO Fase 6.2** (laterales): los laterales requieren Fase 6.1 para clasificar, Y requieren cambios en lead.service.ts (entry point) que tienen más riesgo. Mejor hacer primero lo fácil (6.1) y después lo que toca el entry point (6.2+).

**Razón por la que NO Fase 6.3** (CustomerValue): CustomerValue no tiene dependencia de Intent, pero su integración en el pipeline (lead.service.ts) requiere que el pipeline exista. CustomerValue sin pipeline no aporta valor al bot — solo al dashboard. Por eso va después de 6.1 pero puede ir en paralelo con 6.2.

### D. ¿Qué componente NO debe tocarse todavía?

**Dispatcher** (`escalateTrip`, `broadcastTripToDrivers`, `offerToSpecificDriver` en `admin.service.ts` y `lead.service.ts:649-701`).

**Razones**:
- El dispatcher actual funciona correctamente para los casos actuales (AHORA, RESERVA, urgente, programado). Tocar el dispatcher antes de que Serviceability esté implementada (Fase 6.5) y el pipeline adaptativo (Fase 6.7) es premature — Serviceability va a modular el dispatcher, pero la modularización debe definirse después de tener el score.
- El dispatcher tiene 7 callsites y es el hot path de producción. Cambiarlo temprano introduce riesgo sin beneficio.
- **No tocar**: `admin.service.ts` (broadcast, offer), `lead.service.ts:649-701` (escalateTrip). Tampoco `timeouts.ts` (contingencia).

---

### Fin de la especificación técnica FASE 6.0

**Próximo paso**: Fase 6.1 — implementación de Intent Expandido en `core.ts`.
