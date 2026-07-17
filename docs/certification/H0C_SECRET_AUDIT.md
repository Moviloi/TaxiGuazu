# PR-H0C — Secret Rotation & Credential Audit
## Generado: 2026-07-16 | Post-RRR-1

> **Propósito**: Inventariar, clasificar y gestionar todos los secretos del sistema.
> Cerrar el hallazgo P0-01 (ADMIN_API_KEY expuesta) y certificar el estado actual.
>
> **Misión**: PR-H0C (Secret Rotation & Credential Audit)
> **Base**: H0A-04 (ADMIN_API_KEY expuesta en chat), P0-01 (bloquea piloto)

---

## Resumen Ejecutivo

| Métrica | Valor |
|---|---|
| Secretos inventariados | 10 |
| Expuestos | 1 (ADMIN_API_KEY) |
| Sospechosos | 0 |
| Seguros | 8 |
| Pendientes de rotación | 1 (ADMIN_API_KEY) |
| Hardcoded en código | 1 (BOT_PHONE fallback) |
| `npm run security-check` | ✅ PASS — 0 secretos detectados |
| `.env` trackeado por git | ❌ No — correctamente ignorado |
| Secretos en historial git | 2 (OIDC tokens — ya expirados) |

---

## Inventario Completo de Secretos

### Clasificación

| # | Secreto | Origen | ¿Expuesto? | ¿Rotable? | Estado | Acción requerida |
|---|---|---|---|---|---|---|
| 1 | **ADMIN_API_KEY** | Generado localmente | ✅ **SÍ** — en conversación de chat | ✅ Sí | 🔴 **PENDIENTE ROTACIÓN** | Rotar inmediatamente en Vercel + .env local |
| 2 | **GROQ_API_KEY** | console.groq.com | ❌ No | ✅ Sí | 🟢 SEGURO | Ninguna |
| 3 | **GEMINI_API_KEY** | aistudio.google.com | ❌ No | ✅ Sí | 🟢 SEGURO | Ninguna |
| 4 | **WHATSAPP_TOKEN** | developers.facebook.com | ❌ No | ✅ Sí | 🟢 SEGURO | Ninguna |
| 5 | **WHATSAPP_APP_SECRET** | developers.facebook.com | ❌ No | ✅ Sí | 🟢 SEGURO | Ninguna |
| 6 | **WHATSAPP_VERIFY_TOKEN** | Configurado en Meta webhook | ❌ No (fallback hardcodeado reemplazado) | ✅ Sí | 🟢 SEGURO | Ninguna |
| 7 | **TURSO_DATABASE_TOKEN** | turso.io | ❌ No | ✅ Sí | 🟢 SEGURO | Ninguna |
| 8 | **CRON_SECRET** | Generado localmente | ❌ No | ✅ Sí | 🟢 SEGURO | Ninguna |
| 9 | **SENTRY_DSN** | sentry.io | ❌ No (no configurado) | N/A | ⚪ SIN VALOR | Configurar DSN (P0-02) |
| 10 | **BOT_PHONE** (fallback) | Hardcoded en route.ts:29 | ⚠️ **INFO DISCLOSURE** — número visible en código | N/A | 🟡 SOSPECHOSO | Reemplazar fallback con error |

---

## Hallazgos Detallados

### H0C-01 — ADMIN_API_KEY expuesta (P0-01)

**Estado**: 🔴 EXPUESTA — PENDIENTE DE ROTACIÓN

**Evidencia**:
- Documentado en PROJECT_BOARD como P0-01
- Documentado en PRODUCTION_CHECKLIST.md como WARNING
- Mencionado en H0A-04 como hallazgo bloqueante

**Riesgo**: CUALQUIERA que tenga acceso al historial de chat puede usar esta clave para:
- Acceder a `/api/bot/*` (simular conversaciones, ver métricas, etc.)
- Consultar datos operacionales del sistema

**Acción requerida (MANUAL — no automatizable)**:

```
1. Generar nuevo valor: UUID v4 o similar (ej: openssl rand -hex 32)
2. Actualizar en Vercel Production:  Settings → Environment Variables → ADMIN_API_KEY
3. Actualizar en Vercel Preview (si aplica)
4. Actualizar en .env local
5. Verificar que el valor anterior ya no funciona: curl -H "x-api-key: <OLD_KEY>" /api/bot/metrics → 401
6. Cerrar P0-01 en PROJECT_BOARD
```

**⚠️ No reutilizar el valor anterior bajo ninguna circunstancia.**

---

### H0C-02 — BOT_PHONE hardcoded como fallback

**Archivo**: `src/app/api/whatsapp/webhook/route.ts:29`
**Código**:
```typescript
function getBotPhone(): string {
  try { return getEnv().BOT_PHONE; } catch { return "+543757646645"; }
}
```

**Riesgo**: 🟡 BAJO — número telefónico filtrado en código fuente público.
- No es una credencial (no permite acceso al sistema)
- Es información de contacto operacional
- Visible en el repositorio público

**Recomendación**: Reemplazar el fallback con un error 500 (mismo patrón que WHATSAPP_VERIFY_TOKEN):
```typescript
function getBotPhone(): string {
  return getEnv().BOT_PHONE;
}
```
Esto fuerza que BOT_PHONE sea obligatorio en producción.

**Estado**: No se modifica en esta misión (requiere cambiar comportamiento).

---

### H0C-03 — Secretos en historial git (histórico)

| Commit | Archivo | Secreto | Estado |
|---|---|---|---|
| `91b8198` | `.env.vercel` | Vercel OIDC Token | ✅ Expirado automáticamente (1h) |
| `78113a8^` | `.env.vercel.prod` | Vercel OIDC Token | ✅ Expirado automáticamente (1h) |

**Riesgo**: 🟢 NULO — los OIDC tokens de Vercel expiran en 1 hora.
Documentado previamente en `docs/security/secrets.md` y `ael/artifacts/SECRET_AUDIT.md`.

**Recomendación**: Limpieza opcional del historial con BFG Repo Cleaner. No urgente.

---

### H0C-04 — Secrets check actual: PASSA

Ejecución de `npm run security-check`:

```
🔒 Security Check — Iniciando...
📋 Escaneando archivos fuente...
📋 Escaneando documentación...
📋 Verificando archivos trackeados...
📋 Verificando archivos staged...
✅ No se encontraron secretos en el código fuente.
✅ No hay archivos .env trackeados por git.
✅ No hay secretos en archivos staged.
```

**Hallazgo positivo**: El pre-commit hook `.husky/pre-commit` ejecuta este script automáticamente antes de cada commit. La protección está activa.

---

### H0C-05 — Verificación de lugares donde NO hay secretos

| Ubicación | ¿Hay secretos? | Verificación |
|---|---|---|
| `src/` (código fuente) | ❌ No | `process.env` usado correctamente |
| `tests/` (tests) | ❌ No | Solo flags booleanas mockeadas |
| `scripts/` (scripts) | ❌ No | Usan `process.env` o `getEnv()` |
| `docs/` (documentación) | ❌ No | Sin valores reales |
| `ael/` (control plane) | ❌ No | Sin valores reales |
| `README.md` | ❌ No | Solo nombres de variables |
| `.env.example` | ❌ No | Solo placeholders vacíos |
| `.gitignore` | ✅ Correcto | `.env`, `.env.*`, `*.pem`, `secrets/` ignorados |
| `instrumentation.ts` | ❌ No | Usa `process.env.SENTRY_DSN` |
| `next.config.ts` | ❌ No | Usa `process.env.SENTRY_DSN` |
| `.env` local | ⚠️ Valores reales | ❌ No trackeado por git ✅ |
| `.vercel/` | ❌ No | Solo metadatos de proyecto |

---

## Acciones Realizadas

| # | Acción | Estado | Detalle |
|---|---|---|---|
| 1 | Inventariar secretos | ✅ COMPLETO | 10 secretos identificados y clasificados |
| 2 | Ejecutar security-check | ✅ COMPLETO | PASS — 0 secretos detectados |
| 3 | Verificar git tracking | ✅ COMPLETO | 0 archivos .env trackeados |
| 4 | Buscar hardcoded secrets en src/ | ✅ COMPLETO | 0 encontrados (excepto BOT_PHONE fallback) |
| 5 | Buscar hardcoded secrets en tests/ | ✅ COMPLETO | 0 encontrados |
| 6 | Buscar hardcoded secrets en docs/ | ✅ COMPLETO | 0 encontrados |
| 7 | Verificar .gitignore | ✅ COMPLETO | Correcto — cubre .env, .pem, .key, secrets/ |
| 8 | Verificar historial git | ✅ COMPLETO | Solo OIDC tokens (expirados) |
| 9 | Verificar pre-commit hook | ✅ COMPLETO | `.husky/pre-commit` existe y ejecuta security-check |

---

## Pendientes (requieren intervención manual)

| # | Tarea | Dependencia | Prioridad | Guía |
|---|---|---|---|---|
| P-H0C-01 | **Rotar ADMIN_API_KEY** | Acceso a Vercel + .env local | 🔴 **P0 — Bloquea piloto** | Ver H0C-01 arriba |
| P-H0C-02 | **Configurar SENTRY_DSN** | Acceso a Sentry + Vercel | 🔴 P0 — Bloquea piloto | P0-02 existente |
| P-H0C-03 | **Reemplazar BOT_PHONE fallback** | Decisión técnica | 🟡 P2 | Cambiar route.ts:29 para lanzar error en vez de hardcodear |

---

## Riesgos Residuales

| Riesgo | Severidad | Mitigación |
|---|---|---|
| ADMIN_API_KEY no rotada a tiempo | 🔴 ALTA | Cualquier persona con acceso al chat histórico puede acceder a rutas admin |
| BOT_PHONE hardcodeado visible en repo público | 🟢 BAJA | Información de contacto, no credencial. Riesgo de spam |
| OIDC tokens en historial git | 🟢 NULA | Ya expirados (validez 1h). Solo riesgo si alguien clona el repo y busca tokens históricos |
| `.env` local con valores reales en disco del desarrollador | 🟡 MEDIA | Depende de la seguridad de la máquina local. Mitigado por .gitignore |

---

## Documentos Relacionados

- `docs/security/secrets.md` — Política de gestión de secretos
- `ael/artifacts/SECRET_AUDIT.md` — Auditoría previa (2026-06-27)
- `ael/artifacts/archive/SECRET_MIGRATION.md` — Plan de migración original
- `docs/operations/PRODUCTION_CHECKLIST.md` — Checklist de producción (OPS1)
- `docs/certification/H0A_STAGING_HARDENING_AUDIT.md` — H0A-04 hallazgo de exposición
- `docs/project/PROJECT_BOARD.md` — P0-01 (ADMIN_API_KEY rotation)

---

## Conclusión

El sistema tiene **buena higiene de secretos**: todas las credenciales se leen de `process.env` o `getEnv()`, ningún `.env` está trackeado, y el pre-commit hook verifica automáticamente antes de cada commit.

**La única acción crítica pendiente es la rotación de ADMIN_API_KEY** (P0-01), que debe realizarse manualmente en Vercel antes del piloto.

El hallazgo de BOT_PHONE hardcodeado como fallback es menor y no bloquea staging, pero debería corregirse en una misión futura.
