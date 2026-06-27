# SECRET_AUDIT — Auditoría de secretos

Generado por: **ARNÉS Pipeline**
Fecha: 2026-06-27

---

## Resumen ejecutivo

| Dimensión | Estado |
|-----------|--------|
| Secretos en código fuente | ✅ LIMPIO — sin secretos hardcodeados |
| Secretos en .env actual | ⚠️ PRESENTE — valores reales en disco, NO trackeados |
| Secretos en historial git | ✅ LIMPIO — solo OIDC tokens (expiran automáticamente) |
| .gitignore | ✅ ACTUALIZADO — cubre .env*, *.pem, *.key, secrets/ |
| .env.example | ✅ COMPLETO — 11 variables documentadas |
| Precommit security | ✅ ACTIVO — escanea staged files |

## Detalle de hallazgos

### 1. Secretos en código fuente — LIMPIO

No se encontraron API keys, tokens o passwords en archivos `.ts`, `.tsx`, `.js` fuente.

**Hardcoded eliminado:**
- `route.ts:68` — fallback `"redcolaborativa-bot-2025"` → reemplazado con error 500

### 2. Secretos en .env actual — VALORES REALES EN DISCO

El archivo `.env` contiene valores reales:
- `GROQ_API_KEY` — API key de Groq
- `WHATSAPP_TOKEN` — Token de WhatsApp Cloud API
- `ADMIN_API_KEY` — Clave de administrador
- `TURSO_DATABASE_TOKEN` — JWT de Turso
- `TURSO_DATABASE_URL` — URL de base de datos

**Estado:** NO trackeado por git (.gitignore funciona correctamente).

### 3. Secretos en historial git — LIMPIO

| Commit | Archivo | Secreto expuesto | Estado |
|--------|---------|-----------------|--------|
| `91b8198` | `.env.vercel` | `VERCEL_OIDC_TOKEN` | ✅ Expira automáticamente (1h) |
| `78113a8^` | `.env.vercel.prod` | `VERCEL_OIDC_TOKEN` | ✅ Expira automáticamente (1h) |

Los OIDC tokens de Vercel son de corta duración y expiran automáticamente. No requieren acción manual.

### 4. Variables clasificadas

#### Críticas (protegidas, sin exposición)

| Variable | Propósito | ¿Fue expuesta? |
|----------|-----------|----------------|
| `GROQ_API_KEY` | API key para LLM | NO |
| `WHATSAPP_TOKEN` | Token de WhatsApp | NO |
| `ADMIN_API_KEY` | Clave admin | NO |
| `TURSO_DATABASE_TOKEN` | JWT de BD | NO |

#### Configuración pública (no sensible)

| Variable | Propósito |
|----------|-----------|
| `BOT_PHONE` | Teléfono del bot |
| `ADMIN_PHONE` | Teléfono admin |
| `WHATSAPP_PHONE_ID` | ID de teléfono |
| `COTIZACION_DOLAR` | Cotización dólar |
| `COTIZACION_REAL` | Cotización real |

### 5. Protecciones activas

| Protección | Estado |
|-----------|--------|
| `.gitignore` — `.env` | ✅ Activo |
| `.gitignore` — `*.pem`, `*.key` | ✅ Activo |
| `.gitignore` — `secrets/`, `credentials/` | ✅ Activo |
| Precommit — scan staged files | ✅ Activo |
| Precommit — scan source code | ✅ Activo |
| `env.ts` — validación zod | ✅ Activo |

## Recomendaciones

1. **MANTENIMIENTO:** Ejecutar `npm run security-check` antes de cada commit
2. **OPCIONAL:** Usar `git filter-branch` o BFG para limpiar OIDC tokens del historial
