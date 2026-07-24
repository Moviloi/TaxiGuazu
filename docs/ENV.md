# Variables de Entorno — TaxiGuazú Bot

Documentación completa de todas las variables de entorno del sistema.
Para el template de configuración, ver `.env.example`.

## LLM — Proveedores de Lenguaje

| Variable | Obligatoria | Proveedor | Panel de administración | Notas |
|----------|:-----------:|-----------|-------------------------|-------|
| `GROQ_API_KEY` | ✅ | Groq | [console.groq.com/keys](https://console.groq.com/keys) | API key para Llama 3.3 70B. Sin esta key el bot no funciona. |
| `GEMINI_API_KEY` | ❌ | Google | [aistudio.google.com/apikey](https://aistudio.google.com/app/apikey) | Gemini 2.0 Flash. Si no se configura, el sistema usa solo Groq. |
| `LLM_PROVIDER` | ❌ | — | — | `"gemini"` = solo Gemini, `"groq"` = solo Groq, `"fallback"` = Gemini con fallback a Groq. Default: `"fallback"`. |

## WhatsApp — Meta Cloud API

| Variable | Obligatoria | Panel de administración | Notas |
|----------|:-----------:|-------------------------|-------|
| `WHATSAPP_TOKEN` | ✅ | [developers.facebook.com](https://developers.facebook.com/apps/) → tu app → WhatsApp → API Setup | Token de acceso permanente. No expira a menos que se revoque manualmente. |
| `WHATSAPP_PHONE_ID` | ✅ | [developers.facebook.com](https://developers.facebook.com/apps/) → tu app → WhatsApp → API Setup | ID numérico del número de teléfono (ej: 123456789). |
| `WHATSAPP_VERIFY_TOKEN` | ✅ | [developers.facebook.com](https://developers.facebook.com/apps/) → tu app → WhatsApp → Configuración → Webhook | Lo elegís vos. Debe coincidir con el valor configurado en Meta. |
| `WHATSAPP_APP_SECRET` | ✅ | [developers.facebook.com](https://developers.facebook.com/apps/) → tu app → Settings → Basic | Se usa para verificar la firma HMAC de los requests entrantes. Seguridad del webhook. |
| `BOT_PHONE` | ✅ | — | Número del bot en formato internacional: `5491123456789`. Se usa para identificar mensajes propios. |
| `ADMIN_PHONE` | ✅ | — | Teléfono del administrador. Recibe notificaciones de errores, cotizaciones y comandos admin. |

## Seguridad

| Variable | Obligatoria | Notas |
|----------|:-----------:|-------|
| `ADMIN_API_KEY` | ✅ | Protege las rutas `/api/bot/*`. Se envía como header `x-api-key`. Usar un UUID o frase segura. ⚠️ Rotar si se expone. |
| `CRON_SECRET` | ✅ | Protege los endpoints `/api/cron/*`. String aleatorio seguro. |

## Base de Datos — Turso / SQLite

| Variable | Obligatoria | Panel de administración | Notas |
|----------|:-----------:|-------------------------|-------|
| `TURSO_DATABASE_URL` | ❌ | [turso.tech](https://turso.tech/) → Databases → tu DB | Si no se configura, el sistema usa SQLite local. URL de conexión libSQL. |
| `TURSO_DATABASE_TOKEN` | ❌ | [turso.tech](https://turso.tech/) → Databases → tu DB | Token de autenticación. Obligatorio solo si `TURSO_DATABASE_URL` está configurado. |

## Observabilidad — Sentry

| Variable | Obligatoria | Panel de administración | Notas |
|----------|:-----------:|-------------------------|-------|
| `SENTRY_DSN` | ❌ | [sentry.io](https://sentry.io/) → Projects → Settings → Client Keys (DSN) | Sin configurar, el SDK opera en modo silencioso (no envía, no crashea). |
| `SENTRY_TRACES_SAMPLE_RATE` | ❌ | — | Fracción de transacciones sampleadas (0.0 a 1.0). Default: 0.1. |

## Opcionales

| Variable | Obligatoria | Notas |
|----------|:-----------:|-------|
| `PRINCIPAL_2_PHONE` | ❌ | Teléfono adicional para notificaciones. Formato internacional. |
| `LOG_LEVEL` | ❌ | `"debug"`, `"info"`, `"warn"`, `"error"`. Default: `"info"`. |
| `COTIZACION_DOLAR` | ❌ | Referencia manual. El sistema obtiene cotizaciones automáticamente de dolarapi.com. No se lee desde process.env. |
| `COTIZACION_REAL` | ❌ | Referencia manual. Igual que COTIZACION_DOLAR. |

## Configuración en Vercel (Producción)

Las variables de entorno se configuran en el dashboard de Vercel:

→ [Vercel Dashboard](https://vercel.com) → tu proyecto → Settings → Environment Variables

Agregar cada variable de la sección "Obligatorias" individualmente. Usar los mismos valores que en `.env` local.

**Variables automáticas de Vercel (no configurar manualmente):**
- `VERCEL`, `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_GIT_*` — las setea Vercel automáticamente.

**Sincronización:**
```bash
# Descargar variables actuales de Vercel (solo lectura)
vercel env pull .env.vercel

# Subir variables locales a Vercel
vercel env add ADMIN_API_KEY production
```

## Seguridad

- **Nunca commitear `.env`** — está en `.gitignore`.
- **Nunca hardcodear secretos** — usar `process.env` o `getEnv()`.
- **Nunca loguear secretos** — `log.info()` nunca debe mostrar tokens.
- **Rotar periódicamente** — cada 90 días.
- **Validación runtime**: `src/config/env.ts` (Zod). Si una variable obligatoria falta, el sistema tira error al iniciar.

## Historial de cambios

| Fecha | Cambio |
|-------|--------|
| 2026-07-24 | Esquema profesional: eliminados `.env.build` y `.env.production`. Template `.env.example` reducido a rutas de consecución. |
| 2026-07-20 | ADR-014: eliminadas flags BKE, DRL, Pattern Discovery. |
