# Glosario Unificado — TaxiGuazú

> Fuente canónica de terminología. Reemplaza `architecture.md` L169-185.
> Fecha: 2026-07-04 · AIT-015

---

## AI & Pipeline

| Término | Definición | Origen |
|---------|-----------|--------|
| **Intent** | Clasificación primaria de la intención del mensaje (12 valores: GREETING, BOOKING, NOW, EMERGENCY, CONSULTA, COMMERCIAL, PRE_BOOKING, POST_SERVICE, RESCHEDULE, INFORMATIONAL, AMBIGUOUS, UNKNOWN) | `ai/types.ts`, `ai/core.ts` |
| **CoreDecision** | Salida del CORE: intent + facts + confidence + roleLock + slotStability + purchaseIntent | `ai/types.ts` |
| **FinalDecision** | Salida del ROUTER: outputType + reason + core + mode | `ai/types.ts` |
| **OutputType** | Modo de respuesta: EXECUTE / ANSWER / CLARIFY / SAFE_FALLBACK | `ai/types.ts` |
| **PolicyOutput** | Salida de POLICY: finalResponse + metadata de ejecución (needsGeo, needsSaveContext, needsAdminNotify, confirmationUI) | `ai/types.ts` |
| **Role Lock** | Bloqueo de campos confirmados por el usuario — el LLM no los modifica | `ai/types.ts`, ADR-005 |
| **Lateral** | Intención lateral (EMERGENCY, RESCHEDULE, POST_SERVICE) que bypassa el flujo normal de reserva | `ai/laterals/` |
| **PurchaseIntent** | Nivel de intención de compra: high / medium / low. Usado para gatear llamadas LLM | `ai/core.ts` |
| **LLM Gate** | Decisión de llamar o no al LLM según purchaseIntent y presence de placeholders | `ai/handler.ts` L109-115 |

---

## Conversación

| Término | Definición | Origen |
|---------|-----------|--------|
| **ConversationalState** | Estado de la conversación: idle → collecting_slots → slot_confirmation → awaiting_passenger → awaiting_confirmation → executing → pending_human_review | `slot-workflow.ts`, `state-accessors.ts` |
| **Slot** | Campo de datos que el sistema necesita: origin, destination, passengers, scheduled_at, flight | `ai/types.ts` |
| **SlotStatus** | Certeza del slot: RAW → INFERRED → CONFIRMATION_PENDING → CONFIRMED → USER_CORRECTED → USER_CONFIRMED | `ai/slot-state.ts` |
| **SlotStability** | Estabilidad de los slots detectados: stable / unstable / ambiguous | `ai/types.ts` |
| **ConfidenceMap** | Mapa de confianza por aspecto: intent, origin, destination, passengers, date, time, mode, luggage | `ai/types.ts`, `extraction/confidence-map.ts` |
| **ComprehensionState** | Nivel de comprensión del sistema: FULL_CONTROL / CLARIFICATION / RECOVERY / ESCALATION | `extraction/comprehension.ts` |
| **First-turn gate** | Si es el primer mensaje, RECOVERY → CLARIFICATION y ESCALATION → RECOVERY (no escalar en primer turno) | `comprehension-runner.ts` |
| **ExtractionContext** | Contexto completo de extracción: slots + confidence + tariff + workflow state | `ai/extraction-prompt.ts` |

---

## Viaje (Trip)

| Término | Definición | Origen |
|---------|-----------|--------|
| **Trip** | Un traslado concreto entre origen y destino | `db/types.ts` (TripRow) |
| **TripPhase** | Fase del viaje: DRAFT → QUOTED → CONFIRMED → ASSIGNED → IN_PROGRESS → CLOSED | `db/types.ts` |
| **TripClosureReason** | Razón de cierre: completed / cancelled / cancelled_client / cancelled_driver / expired / failed / reassigned / system_cleanup | `db/types.ts` |
| **TemporalMode** | Modo temporal: NOW / FUTURE / UNKNOWN | `ai/types.ts` |
| **OperationalMode** | Modo operativo derivado: DISPATCH / RESERVATION / CLARIFY / INFO | `ai/types.ts` |
| **TripGroup** | Agrupación de viajes multi-etapa | `db/types.ts` |
| **TripLeg** | Un trayecto individual dentro de un TripGroup | `db/types.ts` |
| **MultiRideBreakdown** | Desglose de precios multi-etapa con hubs y descuentos | `db/types.ts` |

---

## Dispatch

| Término | Definición | Origen |
|---------|-----------|--------|
| **DispatchState** | Estado del dispatch: idle → nivel_1 → nivel_2 → nivel_3 → waiting_driver → closed | `dispatch-workflow.ts` |
| **Nivel 1** | Oferta al chofer principal (1h timeout) | `dispatch.service.ts` |
| **Nivel 2** | Oferta al principal 2 (30min timeout) | `dispatch.service.ts` |
| **Nivel 3** | Broadcast a todos los choferes (8min timeout) | `dispatch.service.ts` |
| **Waiting Driver** | Viaje no programado, broadcast directo (3min timeout) | `dispatch.service.ts` |
| **Broadcast** | Envío de oferta a múltiples choferes con filtros (tier, shift, país, payout) | `dispatch.service.ts` |
| **AssignWorkflowAtomic** | Asignación con optimistic lock para evitar race conditions | `dispatch-workflow.ts` |

---

## Pricing

| Término | Definición | Origen |
|---------|-----------|--------|
| **Tariff** | Regla de precio entre dos lugares/zones | `db/types.ts` (TariffRow) |
| **Resolution Priority** | Nivel de especificidad de la tarifa: 1 (place→place) a 4 (zone→zone) | `tariff-resolver.ts` |
| **Piso** | Costo mínimo que debe cubrir el viaje para ser rentable | `config/constants.ts` (MIN_MARGIN) |
| **Garantizado** | 85% del precio público — mínimo que recibe el chofer | `db/domains/trips.ts` |
| **Hub** | Lugar que es destino de un leg y origen del siguiente en multi-ride | `hub-discount.ts` |
| **Comisión** | Diferencia entre precio público y payout del chofer | `db/types.ts` |

---

## Geo

| Término | Definición | Origen |
|---------|-----------|--------|
| **Place** | Lugar geográfico con coordenadas, tipo, y zona | `db/types.ts` (PlaceRow) |
| **Zone** | Zona operativa que agrupa places para pricing y dispatch | `db/types.ts` (ZoneRow) |
| **Alias** | Nombre alternativo de un place en un idioma específico | `db/types.ts`, tabla `aliases` |
| **Resolución** | Proceso de mapear texto libre → place canónico (4 niveles: alias → exacto → fuzzy → null) | `location-resolver.ts` |
| **Reverse Geocode** | GPS → dirección vía Nominatim (OSM) | `reverse-geocode.ts` |

---

## Memoria & Aprendizaje

| Término | Definición | Origen |
|---------|-----------|--------|
| **SessionMemory** | Memoria de la sesión actual: último intent, entidades, origen/destino | `memory/memory.ts` |
| **ShortTermBuffer** | Últimos N mensajes de la conversación | `memory/memory.ts` |
| **ContextMemory** | Slots persistentes entre turnos con merge semántico | `memory/context-memory.ts` |
| **PredictiveRouting** | Predicción de intención y entidad basada en historial | `memory/predictive-routing.ts` |
| **Opportunity** | Oferta complementaria (promoción, paquete, descuento) | `learning/opportunity-engine.ts` |
| **Fare Learning** | Ajuste de pesos de tarifa según outcomes reales | `learning/fare-learning-engine.ts` |
| **SystemLoad** | Métricas de carga del sistema para ajustar ranking de oportunidades | `learning/system-load.ts` |

---

## Infraestructura

| Término | Definición | Origen |
|---------|-----------|--------|
| **Webhook** | Endpoint POST que recibe mensajes de Meta WhatsApp | `app/api/whatsapp/webhook/route.ts` |
| **Idempotency** | Mecanismo anti-duplicados: `processed_messages` con UNIQUE en message_id | `route.ts`, tabla `processed_messages` |
| **HMAC** | Firma SHA-256 del webhook verificada contra WHATSAPP_APP_SECRET | `route.ts` (verifySignature) |
| **Rate Limit** | Máximo 10 mensajes por teléfono en ventana de 60s | `route.ts` (checkRateLimit, AIT-005) |
| **Cron** | Jobs programados vía endpoint `/api/cron/check-timeouts` | `timeouts.ts` |
| **Housekeeping** | Limpieza de sesiones viejas, workflows estancados, trips expirados | `timeouts.ts` |

---

## Términos Deprecados

| Término | Reemplazado por | Nota |
|---------|----------------|------|
| ~~workflow_state~~ | conversational_state + dispatch_state | Columna eliminada |
| ~~f4_state~~ | comprehension_state | Renombrado |
| ~~trip_status~~ | trip_phase | Columna eliminada de conversations |
| ~~confirmed_fields~~ | slot_states | Columna eliminada |
| ~~alias_lookup~~ | aliases | Tabla reemplazada |
| ~~geo-engine zone resolution~~ | places.zone_id + location-resolver | Archivo marcado DEPRECATED |
