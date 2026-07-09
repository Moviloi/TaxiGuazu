# PILOT OPERATION GUIDE — AITOS RC1
## OPS1 | 2026-07-08

---

## Antes del piloto (pre-requisitos críticos)

| # | Acción | Responsable | Estado |
|---|---|---|---|
| 1 | **Rotar ADMIN_API_KEY** — la key actual estuvo expuesta. Generar nueva en .env y Vercel. | Cristian | ❌ PENDIENTE |
| 2 | **Configurar SENTRY_DSN** en Vercel — obtener de Sentry.io → Projects → Client Keys. | Cristian | ❌ PENDIENTE |
| 3 | **Configurar LOG_LEVEL=info** en Vercel Production. | Cristian | ❌ PENDIENTE |
| 4 | **Verificar webhook** — enviar un mensaje de prueba a WhatsApp y confirmar que el bot responde. | Cristian | ❌ PENDIENTE |
| 5 | **Verificar HMAC** — confirmar que WHATSAPP_APP_SECRET está correcto y el webhook valida firmas. | Cristian | ❌ PENDIENTE |
| 6 | **Configurar cron jobs** en Vercel — endpoints /api/cron/check-timeouts y /api/cron/recalculate-suggestions con CRON_SECRET. | Cristian | ❌ PENDIENTE |
| 7 | **Backup de Turso** — snapshot de la DB antes del piloto. | Cristian | ❌ PENDIENTE |
| 8 | **Verificar números de prueba** — confirmar BOT_PHONE, ADMIN_PHONE, PRINCIPAL_2_PHONE. | Cristian | ❌ PENDIENTE |
| 9 | **Verificar precios** — confirmar que COTIZACION_DOLAR y COTIZACION_REAL están actualizados. | Cristian | ❌ PENDIENTE |
| 10 | **Cargar conductores** — seed de drivers en Turso con phones reales. | Cristian | ❌ PENDIENTE |

---

## Durante el piloto (monitoreo diario)

### Día 1-3: Observación pasiva

| Hora | Acción |
|---|---|
| Cada 2h | Revisar Sentry (si configurado) o logs de Vercel para errores |
| Cada 4h | Verificar que /api/bot/metrics responde (métrica de conversaciones activas) |
| Fin del día | Revisar lead.service.ts logs: [AWAITING_PASSENGER], [POST_BOOKING], [AMBIGUITY] |
| Fin del día | Contar: conversaciones iniciadas, cotizaciones, reservas, NOW ejecutados |

### Día 4-7: Interacción activa

| Hora | Acción |
|---|---|
| Cada 2h | Revisar dispatch state: ¿hay trips stuck en nivel_1/nivel_2? |
| Cada 4h | Verificar cron jobs: ¿checkTimeouts está ejecutando? |
| Fin del día | Revisar escalation: ¿se notificó al admin por falta de chofer? |
| Fin del día | Contar: aceptación de choferes, abandonos, surveys respondidas |

---

## Después del piloto (evaluación)

| # | Acción |
|---|---|
| 1 | Exportar métricas de /api/bot/metrics |
| 2 | Auditar conversaciones con errores (buscar "[SLOT_CONFIRM] pricing error", "[AMBIGUITY_STATE_LOST]") |
| 3 | Revisar conversaciones abandonadas (state=collecting_slots sin completion) |
| 4 | Verificar trip_events y dispatch_events — ¿se escribieron correctamente? |
| 5 | Entrevistar a Cristian: ¿el bot respondió como esperaba? ¿Qué falló? |
| 6 | Generar POST_PILOT_REPORT.md con hallazgos |
| 7 | Decidir: ¿seguir a producción completa o iterar? |

---

## Métricas a observar

| Métrica | Fuente | Objetivo piloto |
|---|---|---|
| Conversaciones iniciadas | /api/bot/metrics | > 10 por día |
| Cotizaciones exitosas (pricing > 0) | Extraction logs | > 70% de intentos |
| Reservas creadas (FUTURO) | trips table | > 3 por día |
| NOW ejecutados | trip_events (TripCreated) | > 2 por día |
| Errores | Sentry / Vercel logs | < 5% de mensajes |
| Fallbacks (regex pricing) | Extraction logs | < 10% de extracciones |
| Pérdidas de contexto | [POST_BOOKING] zone activaciones | 0 ideal, < 3 aceptable |
| Tiempo de respuesta | Vercel logs | < 5s p95 |
| Aceptación de choferes | dispatch_events (DispatchAccepted) | > 50% de broadcasts |
| Abandono | state=collecting_slots sin completion | < 30% |
| Escalación a admin | notifyAdmin calls | < 10% de conversaciones |
| Re-engagement | checkReengagement activations | < 5 por día |

---

## Riesgos operativos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| ADMIN_API_KEY comprometida | P0 | Rotar antes del piloto |
| Sin visibilidad de errores (sin Sentry) | P0 | Configurar SENTRY_DSN |
| Gemini rate limit (429 en tests) | P1 | Configurar fallback a Groq |
| Cron jobs no ejecutan en Vercel | P1 | Verificar CRON_SECRET y endpoints |
| Choferes no responden a broadcast | P1 | Monitorear dispatch_events; tener admin disponible |
| Usuario confirma y sistema pierde contexto | P1 | B2 fix mitiga; monitorear POST_BOOKING zone |
| Precios desactualizados (cotización dólar/real) | P2 | Actualizar COTIZACION_DOLAR/REAL semanalmente |
| Turso sin backup | P2 | Snapshot antes del piloto |
| Logs insuficientes en producción | P2 | Configurar LOG_LEVEL=info |
| Sin test de webhook en vivo | P3 | Enviar mensaje de prueba antes del piloto |
