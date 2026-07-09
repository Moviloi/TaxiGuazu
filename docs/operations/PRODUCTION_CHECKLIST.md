# PRODUCTION CONFIGURATION AUDIT — AITOS RC1
## OPS1 | 2026-07-08

---

## Variables de entorno — Audit

| Variable | Requerida | En .env.example | En .env local | Zod validation | Estado |
|---|---|---|---|---|---|
| GROQ_API_KEY | ✅ | ✅ | ✅ | z.string().min(1) | OK |
| GEMINI_API_KEY | No | ✅ | ✅ (en .env) | z.string().optional() | OK |
| LLM_PROVIDER | No | ✅ | ✅ (en .env) | z.enum(["gemini","groq","fallback"]) | OK |
| WHATSAPP_TOKEN | ✅ | ✅ | ✅ | z.string().min(1) | OK |
| WHATSAPP_PHONE_ID | ✅ | ✅ | ✅ | z.string().min(1) | OK |
| WHATSAPP_VERIFY_TOKEN | ✅ | ✅ | ✅ | z.string().min(1) | OK |
| ADMIN_API_KEY | ✅ | ✅ | ✅ | z.string().min(1) | **WARNING** — key sin rotar |
| BOT_PHONE | ✅ | ✅ | ✅ | z.string().min(1) | OK |
| ADMIN_PHONE | ✅ | ✅ | ✅ | z.string().min(1) | OK |
| WHATSAPP_APP_SECRET | ✅ | ✅ | ✅ | z.string().min(1) | OK |
| TURSO_DATABASE_URL | No | ✅ | ✅ | z.string().optional() | OK |
| TURSO_DATABASE_TOKEN | No | ✅ | ✅ | z.string().optional() | OK |
| CRON_SECRET | ✅ | ✅ | ✅ | z.string().min(1) | OK |
| PRINCIPAL_2_PHONE | No | ✅ | ? | z.string().optional() | **WARNING** — no verificado |
| COTIZACION_DOLAR | No | ✅ | ? | No Zod check | **WARNING** — no verificado |
| COTIZACION_REAL | No | ✅ | ? | No Zod check | **WARNING** — no verificado |
| SENTRY_DSN | No | ✅ | ? | No Zod check | **ERROR** — sin configurar |
| LOG_LEVEL | No | No | No | No Zod check | **ERROR** — sin configurar |

---

## Secrets audit

| Secret | Expuesto en chat | Expuesto en .env | Expuesto en docs | Rotado | Estado |
|---|---|---|---|---|---|
| ADMIN_API_KEY | ✅ | ✅ | Redactado en docs | ❌ | **WARNING** — rotar antes de piloto |
| GROQ_API_KEY | No | ✅ | No | — | OK |
| WHATSAPP_TOKEN | No | ✅ | No | — | OK |
| TURSO_DATABASE_TOKEN | No | ✅ | No | — | OK |

---

## Servicios externos — Audit

| Servicio | Configurado | Última verificación | Estado |
|---|---|---|---|
| **Meta WhatsApp** | ✅ Webhook URL + token | No verificado en vivo | **WARNING** — verificar webhook responde |
| **Turso** | ✅ URL + Token | validate-schema-parity ✅ (local proxy) | OK |
| **Vercel** | ✅ Deploy automático desde main | Último deploy: c09a2c7 | OK |
| **Sentry** | ❌ SENTRY_DSN no configurado | SDK instalado pero sin DSN | **ERROR** — sin captura de errores |
| **Cron Jobs** | ✅ CRON_SECRET configurado | Endpoints: /api/cron/check-timeouts, /api/cron/recalculate-suggestions | OK |
| **Groq** | ✅ API Key configurada | Usado en tests (LLM extraction) | OK |
| **Gemini** | ⚠️ Quota exceeded en tests | Usado en transcription + ambiguity | **WARNING** — rate limit bajo |

---

## Logs audit

| Aspecto | Configurado | Estado |
|---|---|---|
| LOG_LEVEL | No configurado en .env ni Vercel | **ERROR** — sin visibilidad en producción |
| Structured logger | ✅ `src/lib/utils/logger.ts` implementado | OK |
| Sentry logging | ❌ Sin DSN | **ERROR** |
| Webhook request logging | ✅ [TRACE WEBHOOK MESSAGE] en route.ts | OK |
| Extraction logging | ✅ [OBSERVABILITY] logs en extraction-runner.ts | OK |

---

## Resumen

| Estado | Count |
|---|---|
| OK | 15 |
| WARNING | 5 |
| ERROR | 4 |
