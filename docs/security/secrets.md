# Secret Management — TaxGuazú

## Regla fundamental

Los secretos nunca pertenecen al repositorio. Ni en el Product System ni en el Control Plane.

## Variables de entorno

### Requeridas (sin estas el bot no arranca)

| Variable | Origen | Descripción |
|----------|--------|-------------|
| `GROQ_API_KEY` | console.groq.com | API key para Llama 3.3 70B |
| `WHATSAPP_TOKEN` | developers.facebook.com | Token de acceso permanente |
| `WHATSAPP_PHONE_ID` | developers.facebook.com | ID del número de teléfono |
| `WHATSAPP_VERIFY_TOKEN` | Configurado en Meta webhook | Token de verificación del webhook |
| `BOT_PHONE` | Número WhatsApp del bot | Teléfono del bot |
| `ADMIN_PHONE` | Número del administrador | Teléfono admin |
| `ADMIN_API_KEY` | Generado localmente | Clave para rutas admin (`/api/admin/*`) |

### Opcionales

| Variable | Origen | Descripción |
|----------|--------|-------------|
| `WHATSAPP_APP_SECRET` | developers.facebook.com | Secreta para verificar firma del webhook |
| `PRINCIPAL_2_PHONE` | Configurado | Teléfono principal adicional |
| `TURSO_DATABASE_URL` | turso.io | URL de la base de datos |
| `TURSO_DATABASE_TOKEN` | turso.io | Token de autenticación Turso |
| `COTIZACION_DOLAR` | Configurado | Cotización del dólar |
| `COTIZACION_REAL` | Configurado | Cotización del real |

## Ambiente local

```bash
# 1. Copiar el template
cp .env.example .env

# 2. Completar con valores reales
# Editar .env con tu editor favorito

# 3. Verificar que arranca
npm run dev
```

## Producción (Vercel)

Los secretos se configuran en el dashboard de Vercel:
- Settings → Environment Variables
- Agregar cada variable individualmente
- NO usar `.env` en producción

## Reglas de seguridad

1. **Nunca commitear `.env`** — ya está en `.gitignore`
2. **Nunca hardcodear secretos** — usar `process.env` o `getEnv()`
3. **Nunca loguear secretos** — `log.info()` nunca debe mostrar tokens
4. **Rotar periódicamente** — cada 90 días mínimo
5. **Usar `.env.example`** — para documentar qué variables existen

## Variables excluidas de .gitignore

`.env.example` SÍ se versiona (sin valores reales). Todo lo demás con `.env` se ignora.

## Auditoría periódica

Ejecutar antes de cada commit:

```bash
npm run security-check
```

Esto verifica:
- No hay secretos en código fuente
- No hay archivos `.env` trackeados
- No hay tokens hardcodeados
- No hay secretos en archivos staged para commit

## Historial de secretos

### Secretos previamente expuestos en git

| Commit | Archivo | Secreto | Estado |
|--------|---------|---------|--------|
| `91b8198` | `.env.vercel` | Vercel OIDC Token | ✅ Expira automáticamente |
| `78113a8^` | `.env.vercel.prod` | Vercel OIDC Token | ✅ Expira automáticamente |

Los OIDC tokens de Vercel son de corta duración (1h) y expiran automáticamente. No requieren acción manual.

### Para limpiar el historial (opcional)

Usar BFG Repo Cleaner o `git filter-branch`. Requiere aprobación del owner.
