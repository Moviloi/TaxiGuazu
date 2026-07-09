# MONITORING DASHBOARD — AITOS Pilot
## Métricas clave para los primeros días

---

## Dashboard de salud del sistema

### Panel 1: Actividad conversacional (refresh: 1h)

| Métrica | Query / Fuente | Alerta si |
|---|---|---|
| **Conversaciones activas 24h** | `/api/bot/metrics` → `active_conversations_24h` | = 0 por > 4h |
| **Mensajes recibidos** | Count `messages` WHERE `created_at > now - 1h` | < 5 en hora pico |
| **Mensajes enviados por el bot** | Count `messages` WHERE `role='assistant'` AND `created_at > now - 1h` | = 0 por > 1h |
| **Idiomas detectados** | `chat_sessions.lang` distribution | [monitoreo informativo] |

### Panel 2: Pipeline de extracción (refresh: 1h)

| Métrica | Query / Fuente | Alerta si |
|---|---|---|
| **Extracciones exitosas** | `[EXTRACTION] textLen` logs count | < 50% de mensajes entrantes |
| **Fallbacks a regex** | `[OBSERVABILITY] PIPELINE_DECISION action=fallback_regex` count | > 15% |
| **Fallbacks a LLM** | `[EXTRACT] calling LLM` logs count | [monitoreo informativo] |
| **Multi-ride detections** | `multiRideBreakdown` present count | [monitoreo informativo] |
| **Pérdidas de contexto** | `[POST_BOOKING]` activations count | > 3 por día |

### Panel 3: Pricing (refresh: 4h)

| Métrica | Query / Fuente | Alerta si |
|---|---|---|
| **Cotizaciones exitosas** | `pricing.final_price > 0` count | < 60% de extracciones con ruta |
| **Tarifas no encontradas** | `level=not_found` count | > 20% |
| **Divergencias v2/v3** | `[PRICING] Divergence` logs count | [monitoreo informativo] |
| **Promociones aplicadas** | `source=promotion` count | [monitoreo informativo] |

### Panel 4: Dispatch (refresh: 1h)

| Métrica | Query / Fuente | Alerta si |
|---|---|---|
| **Trips en dispatch** | `dispatch_state != null AND dispatch_state != 'closed'` | > 5 acumulados |
| **Nivel 1 (principal)** | `dispatch_state = 'nivel_1'` | > 3 pendientes |
| **Broadcast activos** | `dispatch_state = 'nivel_3' OR dispatch_state = 'waiting_driver'` | > 5 sin resolver |
| **Aceptación de choferes** | `dispatch_events WHERE event_type = 'DispatchAccepted'` | < 30% de ofertas |
| **Escalaciones a admin** | `notifyAdmin` call count | > 5 por día |
| **Timeouts de dispatch** | `closeWorkflow(dispatch) with DispatchAbandoned` count | > 3 por día |

### Panel 5: Errores y excepciones (refresh: tiempo real)

| Métrica | Query / Fuente | Alerta si |
|---|---|---|
| **Errores en lead service** | Catch block in `handleLeadMessage` | > 0 |
| **Errores de pricing** | `[SLOT_CONFIRM] pricing error` logs | > 0 |
| **Errores de webhook** | `[WEBHOOK]` error logs | > 0 |
| **Perdida de estado de ambigüedad** | `[AMBIGUITY_STATE_LOST]` logs | > 0 |
| **Rate limiting** | HTTP 429 responses | > 0 |
| **Sentry issues** | Sentry dashboard (si configurado) | > 5 nuevos por día |

### Panel 6: Conversión (refresh: 4h)

| Métrica | Query / Fuente | Objetivo piloto |
|---|---|---|
| **Tasa de conversión 7d** | `/api/bot/metrics` → `conversion_rate_7d` | > 40% |
| **Viajes completados** | `trips WHERE status='completado'` count | > 0 |
| **Viajes cancelados** | `trips WHERE status='cancelado'` count | [monitoreo informativo] |
| **Encuestas respondidas** | `trips WHERE survey_sent=1 AND post_trip_response IS NOT NULL` | > 50% de viajes completados |
| **Re-engagement activados** | `checkReengagement` sent count | [monitoreo informativo] |

---

## Comandos de monitoreo rápido

```bash
# Verificar build y contratos
npm run build && bash ael/contracts/enforce.sh

# Verificar schema parity
npm run validate-schema-parity

# Ejecutar suite de tests
npm test

# Verificar métricas del bot (requiere ADMIN_API_KEY)
curl -H "x-api-key: $ADMIN_API_KEY" https://[vercel-url]/api/bot/metrics

# Verificar cron jobs (requiere CRON_SECRET)
curl -H "Authorization: Bearer $CRON_SECRET" https://[vercel-url]/api/cron/check-timeouts

# Revisar conversaciones activas
npx tsx scripts/query-conversations.ts  # (archivado — usar directamente Turso dashboard)
```
