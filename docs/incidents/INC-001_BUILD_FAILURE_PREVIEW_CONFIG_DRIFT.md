# INC-001: Build Failure en Preview por Configuration Drift

## Metadatos

| Campo | Valor |
|---|---|
| **ID** | INC-001 |
| **Fecha** | 2026-07-18 |
| **Clasificación** | Configuration Drift de Infraestructura |
| **Severidad** | Media (build blocker en Preview, Production no afectado) |
| **Estado** | Cerrado |

## Commit afectado

`32811ba78d5a25805bad738036ad94d49c74b6d6` — branch `qa-3/architectural-sanitization`

## Entorno afectado

**Preview** de Vercel. Production no presentó el error.

## Síntoma observado

Build fallido durante la fase `Collecting page data` de `next build`:

```
Error: ❌ Variables de entorno faltantes o inválidas:
- GROQ_API_KEY: Invalid input
- WHATSAPP_TOKEN: Invalid input
- ADMIN_API_KEY: Invalid input
- CRON_SECRET: Invalid input

[Error: Failed to collect page data for /api/bot/check-timeouts]
```

## Causa inmediata

Cuatro variables de entorno (`GROQ_API_KEY`, `WHATSAPP_TOKEN`, `ADMIN_API_KEY`, `CRON_SECRET`) no estaban definidas en el entorno Preview de Vercel. El módulo `src/config/env.ts` las requiere como obligatorias (`z.string().min(1)`) y el flujo de build las valida al evaluar la cadena de imports que comienza en `src/app/api/bot/check-timeouts/route.ts` y pasa por `src/lib/services/admin/admin.service.ts`.

## Causa raíz operativa

Las cuatro variables fueron configuradas originalmente solo en el entorno **Production** de Vercel y nunca se agregaron al entorno **Preview**. Esto generó un **Configuration Drift** entre entornos: Production tenía las variables necesarias, Preview no.

## Evidencia

1. **Log de build fallido** (Vercel, 2026-07-18 05:25 UTC-3):
   ```
   2026-07-18T08:25:43.619Z  Error: ❌ Variables de entorno faltantes o inválidas:
   2026-07-18T08:25:43.619Z  - GROQ_API_KEY: Invalid input
   2026-07-18T08:25:43.620Z  - WHATSAPP_TOKEN: Invalid input
   2026-07-18T08:25:43.620Z  - ADMIN_API_KEY: Invalid input
   2026-07-18T08:25:43.620Z  - CRON_SECRET: Invalid input
   ```

2. **Listado de env vars en Vercel** (antes de la corrección):
   - `GROQ_API_KEY` → Production ✅ | Preview ❌
   - `WHATSAPP_TOKEN` → Production ✅ | Preview ❌
   - `ADMIN_API_KEY` → Production ✅ | Preview ❌
   - `CRON_SECRET` → Production ✅ | Preview ❌

3. **Deploy Preview fallido**:
   - URL: `https://taxi-guazu-n9tlxqrg6-movilois-projects.vercel.app`
   - Status: ● Error
   - Branch: `qa-3/architectural-sanitization`

## Acción correctiva realizada

Se agregaron las cuatro variables faltantes al entorno **Preview** de Vercel para el branch `qa-3/architectural-sanitization`, usando los mismos valores existentes en Production:

| Variable | Acción |
|---|---|
| `GROQ_API_KEY` | Agregada a Preview |
| `WHATSAPP_TOKEN` | Agregada a Preview |
| `ADMIN_API_KEY` | Agregada a Preview |
| `CRON_SECRET` | Agregada a Preview |

**Scope actual:** Las variables quedaron vinculadas al branch `qa-3/architectural-sanitization` únicamente (no aplican a todos los Preview branches).

## Validación posterior

- **Deploy ID:** `dpl_4kHJuuU3cKQUuiHgEvaXCNK97weG`
- **URL Preview:** `https://taxi-guazu-4rn73j1ur-movilois-projects.vercel.app`
- **Status:** ● Ready ✅
- **Fase `Collecting page data`:** Completada sin errores ✅
- **Nuevos errores:** Ninguno ✅
- **Build completo:** Exitoso en ~1m ✅

## Estado final

**Cerrado.** El incidente se clasifica y resuelve como **Configuration Drift de infraestructura**. No requiere cambios de código, ADR ni refactors arquitectónicos.

---

## Nota técnica (contexto, no acción)

La validación de env vars se ejecuta en top-level desde `src/lib/services/admin/admin.service.ts:10` (`export const ADMIN_PHONE = getEnv().ADMIN_PHONE`), lo que hace que cualquier ausencia de variables en el schema Zod sea un **build-killer** durante `Collecting page data`. Este comportamiento es el esperado por diseño: el fail-fast evita que un servicio opere con configuración incompleta en runtime. El incidente se debió a que la configuración del entorno Preview no reflejaba la del entorno Production.
