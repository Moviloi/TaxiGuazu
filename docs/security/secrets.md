# Secret Management — TaxiGuazú

## Regla fundamental

Los secretos nunca pertenecen al repositorio.

## Estructura de archivos

| Archivo | Versionado | Contenido |
|---------|:----------:|-----------|
| `.env` | ❌ | Claves reales para desarrollo local |
| `.env.example` | ✅ | Template con variables y rutas de consecución |
| `docs/ENV.md` | ✅ | Documentación completa de todas las variables |

## Variables requeridas (sin estas el bot no arranca)

| Variable | Origen |
|----------|--------|
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) |
| `WHATSAPP_TOKEN` | [developers.facebook.com](https://developers.facebook.com/apps/) → WhatsApp → API Setup |
| `WHATSAPP_PHONE_ID` | [developers.facebook.com](https://developers.facebook.com/apps/) → WhatsApp → API Setup |
| `WHATSAPP_VERIFY_TOKEN` | [developers.facebook.com](https://developers.facebook.com/apps/) → WhatsApp → Webhook |
| `WHATSAPP_APP_SECRET` | [developers.facebook.com](https://developers.facebook.com/apps/) → Settings → Basic |
| `BOT_PHONE` | Número WhatsApp del bot |
| `ADMIN_PHONE` | Número del administrador |
| `ADMIN_API_KEY` | Generado localmente (UUID o frase segura) |
| `CRON_SECRET` | Generado localmente (string aleatorio) |

Para la lista completa incluyendo opcionales, ver `docs/ENV.md`.

## Ambiente local

```bash
cp .env.example .env
# Editar .env con valores reales
npm run dev
```

## Producción (Vercel)

Configurar en [Vercel Dashboard](https://vercel.com) → Settings → Environment Variables.

NO usar `.env` en producción.

## Reglas de seguridad

1. **Nunca commitear `.env`** — está en `.gitignore`
2. **Nunca hardcodear secretos** — usar `process.env` o `getEnv()`
3. **Nunca loguear secretos** — `log.info()` nunca debe mostrar tokens
4. **Rotar periódicamente** — cada 90 días mínimo
5. **`.env.example` SÍ se versiona** — sin valores reales, solo template con rutas de consecución

## Auditoría

```bash
npm run security-check
```

Verifica:
- No hay secretos en código fuente
- No hay archivos `.env` trackeados
- No hay tokens hardcodeados

## Historial de secretos expuestos

| Commit | Archivo | Secreto | Estado |
|--------|---------|---------|--------|
| `91b8198` | `.env.vercel` | Vercel OIDC Token | ✅ Expira automáticamente (1h) |
| `78113a8^` | `.env.vercel.prod` | Vercel OIDC Token | ✅ Expira automáticamente (1h) |
