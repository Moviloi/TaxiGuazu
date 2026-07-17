# PR-H0A — Staging Hardening Audit
## Generado: 2026-07-16 | Auditoría de readiness post-RRR-1

> **Propósito**: Auditoría completa de las 7 áreas identificadas en RRR-1 como condiciones para staging. No implementa cambios — solo descubre, clasifica y recomienda.
>
> **Misión**: PR-H0A (Staging Hardening Audit)
> **Base**: RRR-1 (Release Readiness Review) → Veredicto: **READY FOR STAGING WITH CONDITIONS
>
> **⚠️ Nota posterior (2026-07-16)**: H0A-03 (middleware) fue **diferido a Post-v1** por decisión arquitectónica consciente. Ver `docs/architecture/DEFERRED_MIDDLEWARE.md`. Este documento preserva los hallazgos originales de la auditoría; las referencias a H0A-03 como bloqueante han sido actualizadas para reflejar el diferimiento.**

---

## Resumen Ejecutivo

| Área | Hallazgos | Severidad | ¿Bloquea Staging? |
|---|---|---|---|
| **A1 — Memory Integration** | Gap de wiring: código listo, no conectado | Baja | NO (off por defecto) |
| **A2 — Pattern Discovery** | Bug de parseo + DB schema ausente | Alta | NO (off por defecto, NO activar) |
| **A3 — Feature Flags** | 17 variables sin documentar, 5 shadow/PD flags sin función wrapper | Media | SÍ (ops no puede configurar) |
| **A4 — Tests** | 4 fallas: 2 timeouts, 1 mock compat, 1 assertion | Media | SÍ (CI/CD nunca 100% verde) |
| **A5 — Security** | Sin middleware.ts, auth inline, sin CSP/CSRF | Alta | SÍ → **DIFERIDO a Post-v1** (ver `docs/architecture/DEFERRED_MIDDLEWARE.md`) |
| **A6 — Observability** | Sentry sin DSN, metrics básicas, sin tracing | Media | NO (post-staging) |
| **A7 — Deploy** | Build OK, schema OK, precommit existe | Baja | NO |

**Veredicto general**: 3 áreas bloquean staging (A3, A4; A5 originalmente blocking pero **diferido a Post-v1**; A2 como no-activar). Memory (A1) y Deploy (A7) están ready. Observability (A6) es post-staging.

---

## A1 — Memory Integration Gap

### Estado actual
- `MemoryService.store()` implementado en `src/lib/memory/memory-service.ts` ✅
- `MemorySnapshot.build()` implementado ✅
- `cognitive_memory_snapshots` tabla creada en `initSchema()` ✅
- `COGNITIVE_MEMORY_ENABLED=false` por defecto ✅

### Hallazgo crítico
- **`lead.service.ts` tiene CERO referencias a Memory**, MemoryService, buildMemory, o COGNITIVE_MEMORY_ENABLED
- ShadowResult se captura (`const shadowResult = await runShadowCognition(...)`) pero NUNCA se pasa a `memoryService.store()`
- La cadena `runShadowCognition()` → ShadowResult → Memory no existe en ejecución

### Causa raíz
No es un bug de código — es un **gap de integración** (wiring faltante). El código de Memory existe y funciona (45 tests PASS), pero nadie lo llama.

### Impacto
- `COGNITIVE_MEMORY_ENABLED=true` no tendría efecto — Memory nunca se ejecutaría
- No hay pérdida de datos porque está deshabilitado por defecto

### Recomendación
- **NO BLOQUEA STAGING** (off por defecto)
- PR futuro de integración: ~10 líneas en `lead.service.ts` post-`runShadowCognition()`
- Prioridad: PRD-01 (Pending before Production)

---

## A2 — Pattern Discovery Bug

### Estado actual
- `PATTERN_DISCOVERY_ENABLED` y `PATTERN_DISCOVERY_DRY_RUN` existen en `feature-flags.ts`
- `pattern-discovery/repository.ts` tiene 3 funciones: `writePattern()`, `readActivePatterns()`, `readPatternHistory()`
- **Todas deshabilitadas por defecto** (`false`)

### Hallazgo 1 — Bug de parseo en repository.ts
- **Línea 188** (`readActivePatterns`): `JSON.parse((r as any).acceptance_json)` 
- **Línea 204** (`readPatternHistory`): `JSON.parse((r as any).acceptance_json)`
- **Problema**: `writePatterns()` (línea 115) serializa el **Pattern completo** (tipo, predicado, confianza, evidencia) en `acceptance_json`, pero el read parsea esperando solo el campo `acceptance`
- El `JSON.parse` retorna `any` casteado a `Pattern[]` — en runtime el campo `acceptance` es un objeto raw, no una instancia de clase con `isAccepted()`

### Hallazgo 2 — DB schema ausente
- `repository.ts` ejecuta queries contra tablas `pattern_discovery_patterns` y `pattern_discovery_history`
- **Estas tablas NO EXISTEN en el schema** (`schema.sql` o `initSchema()`)
- Si `PATTERN_DISCOVERY_ENABLED=true`, cualquier write/read lanza runtime error por tabla inexistente

### Impacto
- **NO ACTIVAR** Pattern Discovery bajo ninguna circunstancia
- Bug de tipo silencioso + DB schema ausente = runtime error garantizado

### Recomendación
- **NO BLOQUEA STAGING** (off por defecto, prohibido activar)
- Requiere PR separado: (1) fix parseo, (2) crear tablas en schema.sql, (3) tests de integración
- Prioridad: PRD-02 (Pending before Production — BLOCKED)

---

## A3 — Feature Flag Census

### Estado actual
- 11 feature flags en `feature-flags.ts` + 5 shadow/PD flags + 1 operacional = 17 variables leídas via `process.env`
- 18 variables documentadas originalmente en `.env.example` (previo a PR-H0B)
- 3 shadow flags + 2 PD flags leídas directo de `process.env` sin función wrapper
- `process.env` leído en múltiples puntos sin funciones intermedias (violación de patrón)

### Hallazgo 1 — 17 variables sin documentar en `.env.example` (previo a PR-H0B)

De las siguientes variables leídas via `process.env.XXX` en el código fuente, **SOLO las 18 originales** estaban documentadas. El resto no aparecía en `.env.example`:

#### Feature flags de feature-flags.ts (11 funciones exportadas, NINGUNA documentada)

| Variable | Grupo | Default | Documentada (pre-H0B) |
|---|---|---|---|
| `BKE_ENABLED` | BKE | `false` | ❌ |
| `BKE_GEO_ENABLED` | BKE Geo | `false` | ❌ |
| `BKE_ENTITY_ENABLED` | BKE Entity | `false` | ❌ |
| `BKE_PRICING_ENABLED` | BKE Pricing | `false` | ❌ |
| `BKE_MESSAGE_ENABLED` | BKE Message | `false` | ❌ |
| `DRL_ENABLED` | DRL | `false` | ❌ |
| `DRL_COMPREHENSION_ENABLED` | DRL Comprehension | `false` | ❌ |
| `DRL_RECOVERY_ENABLED` | DRL Recovery | `false` (sin consumidores) | ❌ |
| `DRL_EXTRACTION_ASSISTANCE_ENABLED` | DRL Assistance | `false` | ❌ |
| `DRL_RESPONSE_ASSISTANCE_ENABLED` | DRL Assistance | `false` | ❌ |
| `DRL_FRUSTRATION_ASSISTANCE_ENABLED` | DRL Assistance | `false` | ❌ |

#### Shadow flags leídas directo de process.env (5 variables, NINGUNA documentada)

| Variable | Origen | Default | Documentada (pre-H0B) |
|---|---|---|---|
| `EVIDENCE_SHADOW_MODE` | `build-signal.ts` | `false` | ❌ |
| `EVIDENCE_SHADOW_LOGGING` | `run-shadow-cognition.ts` | `false` | ❌ |
| `COGNITIVE_MEMORY_ENABLED` | `memory-service.ts` | `false` | ❌ |
| `PATTERN_DISCOVERY_ENABLED` | `pd-service.ts` | `false` | ❌ |
| `PATTERN_DISCOVERY_DRY_RUN` | `pd-service.ts` | `false` | ❌ |

#### Otras variables operacionales (1, NO documentada)

| Variable | Origen | Default | Documentada (pre-H0B) |
|---|---|---|---|
| `LOG_LEVEL` | `logger.ts` | `"info"` (dev) / `"warn"` (prod) | ❌ |

**Total pre-H0B**: 18 variables documentadas en `.env.example`. 17 variables existentes en código NO documentadas.

**⚠️ CORRECCIÓN**: `DRL_GEO_ENABLED` no existe en el código fuente — fue incorrectamente listado en la versión inicial de esta auditoría. La flag geográfica correcta es `BKE_GEO_ENABLED`.

### Hallazgo 2 — 5 flags sin función wrapper en feature-flags.ts
**3 shadow flags** se leen directo de `process.env` sin función wrapper:
- `EVIDENCE_SHADOW_MODE` — leída en `build-signal.ts:62` (sin función wrapper)
- `EVIDENCE_SHADOW_LOGGING` — leída en `run-shadow-cognition.ts:35` (sin función wrapper)
- `COGNITIVE_MEMORY_ENABLED` — leída en `memory-service.ts:32` (sin función wrapper)

**2 Pattern Discovery flags** existen en `feature-flags.ts` como comentarios, NO como funciones exportables:
- `PATTERN_DISCOVERY_ENABLED` — leída en `pd-service.ts:18`
- `PATTERN_DISCOVERY_DRY_RUN` — leída en `pd-service.ts:26`

**Impacto**: estas 5 flags no pueden ser auditadas centralizadamente ni tienen documentación de default value, tipos o entorno recomendado.

### Hallazgo 3 — `DRL_RECOVERY_ENABLED` no funcional
- Existe en `feature-flags.ts` con default `false` (línea 42)
- **CERO consumidores** en el código — la funcionalidad de recovery no fue implementada
- Definirla no tiene ningún efecto sobre el sistema

### Hallazgo 4 — `COTIZACION_DOLAR` y `COTIZACION_REAL` no se leen de process.env
- Documentadas en `.env.example` y referenciadas en `timeouts.ts` como texto informativo
- **No se leen activamente** vía `process.env.COTIZACION_DOLAR` o `process.env.COTIZACION_REAL`
- El sistema obtiene cotizaciones automáticamente de `dolarapi.com`
- Marcar como "referencia manual — no leída por el sistema"

### Hallazgo 5 — Zod schema no valida flags
- `src/config/env.ts` define schema de 14 variables de entorno
- **CERO feature flags validadas** por Zod
- `COGNITIVE_MEMORY_ENABLED` y `EVIDENCE_SHADOW_MODE` mencionadas solo en comentarios

### Recomendación
- **BLOQUEA STAGING** — operadores no pueden configurar BKE/DRL/Evidence/Memory/PD
- PR para agregar TODAS las flags a `.env.example` con documentación
- Propuesta: migrar shadow mode flags y PD flags a función wrapper en `feature-flags.ts`
- Prioridad: PRD-03 (Pending before Production — READY)

---

## A4 — Failing Tests Classification

### 4 fallas confirmadas (1653/1657 PASS)

#### T1 — `tests/e2e/improved-flows.test.ts` — Timeout 5000ms
- **Síntoma**: Test de flujo conversacional completo excede timeout de 5000ms
- **Causa raíz**: El test dispara llamadas LLM reales (Groq/Gemini) sin mock — rate limits + latencia de red causan timeout
- **Clasificación**: **Timeout por dependencia externa**
- **Entorno**: Solo falla en CI o cuando rate limits activos
- **Fix**: Aumentar timeout a 15000ms O aislar con mocks

#### T2 — `tests/e2e/improved-flows.test.ts` — `vi.mocked(...).mockResolvedValue is not a function`
- **Síntoma**: `TypeError: vi.mocked(...).mockResolvedValue is not a function`
- **Causa raíz**: Incompatibilidad con Vitest 4.x — `vi.mocked()` cambió de API
- **Clasificación**: **Mock API incompatibility**
- **Fix**: Actualizar sintaxis: `vi.mocked(module.fn).mockResolvedValue(valor)` → usar `mockResolvedValueOnce` o wrapper compatible

#### T3 — `tests/integration/fase-22-correction-flow.test.ts` — Assertion regression
- **Síntoma**: `expected null but got 'Aeropuerto IGR'`
- **Causa raíz**: Cambio en DRL geo integration (PR-5G H-03) — ahora `resolveGeoAmbiguity` retorna `'Aeropuerto IGR'` donde antes retornaba `null`
- **Clasificación**: **Behavior regression por DRL geo activation**
- **Contexto**: El test espera que sin datos de entrada, el campo sea `null`. Con DRL geo habilitado en el test, ahora resuelve un nombre
- **Fix**: Decidir si el comportamiento nuevo es correcto (product decision) y actualizar assertion o test

#### T4 — `tests/integration/memory/memory-integration.test.ts` — Timeout 5000ms
- **Síntoma**: Test de integración de Memory excede timeout
- **Causa raíz**: El test importa `lead.service` que a su vez importa proveedores LLM → las dependencias LLM se inicializan (aunque no se usen) → timeout
- **Clasificación**: **Timeout por dependencia transitiva de LLM**
- **Fix**: Aislar imports — no importar `lead.service.ts` completo, solo las funciones de Memory, O aumentar timeout

### Clasificación consolidada
| Tipo | Cantidad | Tests afectados |
|---|---|---|
| ⏱ Timeout por LLM real | 2 | improved-flows, memory-integration |
| 🔧 Mock API compatibility | 1 | improved-flows (T2) |
| 📐 Assertion regression | 1 | fase-22-correction-flow |

### Recomendación
- **BLOQUEA STAGING** — CI/CD nunca 100% verde
- Fixes:
  - T1/T4: Aumentar timeout a 15000ms (fix rápido) O mock providers
  - T2: Actualizar sintaxis `vi.mocked` para Vitest 4
  - T3: Decisión de producto + actualizar assertion
- Prioridad: PRD-04 (Pending before Production — READY)

---

## A5 — Security Audit

### Estado actual
- **CERO middleware.ts** — no existe archivo en `src/` ni `src/middleware.ts`
- **Auth inline** en rutas individuales
- **Sin CSP** (Content Security Policy)
- **Sin CSRF** protection
- **Sin rate limiting centralizado**
- Webhook tiene HMAC validation + rate limiting inline
- Admin API key check inline

### 15 API routes auditadas (src/app/api/*/route.ts)
| Ruta | Auth | CSP | CSRF |
|---|---|---|---|
| `api/bot/metrics/cognitive` | ❌ | ❌ | ❌ |
| `api/bot/metrics` | ❌ | ❌ | ❌ |
| `api/bot/webhook` | ✅ (HMAC+rate) | ❌ | ❌ |
| `api/bot/leads` | ⚠️ (inline key) | ❌ | ❌ |
| Otras 11 rutas | ❌ | ❌ | ❌ |

### Hallazgo — precommit script de seguridad existe
- `scripts/precommit-security-check.mjs` — 188 líneas
- Detecta patrones: `process.env`, `API_KEY`, `secret`, `password`, `token`
- No se ejecuta automáticamente — no está en `pre-commit` hook

### Hallazgo — secrets.md documentado
- `docs/security/secrets.md` — 91 líneas
- Documenta ADMIN_API_KEY rotation emergency procedure
- Menciona que ADMIN_API_KEY fue expuesta en conversación de chat

### Riesgos
1. **ADMIN_API_KEY expuesta** en historial de chat — requiere rotación urgente (P0-01)
2. **Sin middleware centralizado** — cada ruta nueva debe implementar auth manualmente
3. **Sin CSP** — vulnerable a XSS
4. **Sin CSRF** — webhooks pueden ser replayed
5. **Sin rate limiting centralizado** — solo webhook tiene protección individual
6. **Rutas de métricas sin auth** — exposición de datos operacionales

### Recomendación
- **BLOQUEA STAGING** — superficie de ataque no gestionada
- Crear `middleware.ts` con:
  - Admin API key validation (rutas /admin, /api/bot/leads)
  - CSP headers
  - Rate limiting (basado en IP o token)
  - CSRF protection para webhooks
- Rotar ADMIN_API_KEY antes de staging
- Prioridad: PRD-05 (Pending before Production — READY)

---

## A6 — Observability Audit

### Estado actual
- **Sentry**: SDK instalado en `src/lib/monitoring/sentry.ts` — sin `SENTRY_DSN` configurado (no bloquea, eventos se descartan)
- **Métricas**: Endpoint `GET /api/bot/metrics` existe con métricas básicas de conversación
- **Métricas cognitivas**: `GET /api/bot/metrics/cognitive` implementado en PR-5F
- **Tracing**: No existe tracing distribuido
- **Logging**: `LOG_LEVEL` configurable, actualmente no definido en Vercel

### Hallazgos
1. `SENTRY_DSN` no configurado en Vercel (P0-02 en PROJECT_BOARD)
2. Sin dashboard de operaciones — no hay visibilidad de salud del sistema en staging
3. Sin tracing end-to-end — diagnóstico de problemas requiere logs manuales
4. `LOG_LEVEL=info` no configurado en Vercel (P1-07)

### Recomendación
- **NO BLOQUEA STAGING** — staging no requiere observabilidad completa
- Configurar `SENTRY_DSN` y `LOG_LEVEL=info` como mínimo antes de staging (P0-02, P1-07)
- Dashboard de operaciones es post-staging (Fase 4 del roadmap)

---

## A7 — Deploy Audit

### Build
| Métrica | Valor |
|---|---|
| Compile time | 39.9s |
| Static pages | 7/7 |
| Dynamic routes | 15 total (API) |
| First Load JS | 184kB |
| Lint | ✅ PASS |
| Contracts R1-R4 | ✅ PASS |

### Schema deployment
- `schema.sql` se despliega correctamente en Vercel (verificado en DEBT-14C)
- `process.cwd()` en Vercel = `/var/task` — schema.sql en raíz del bundle
- `fs.existsSync` guard presente

### Pre-commit
- `scripts/precommit-security-check.mjs` existe pero no está hookeado
- No hay `husky` ni `lint-staged` configurados

### Hallazgos
1. Sin pipeline CI/CD formal — `npm run build` + `npm test` manual
2. Sin vercel.json para configuración de despliegue
3. Pre-commit hooks no activos

### Recomendación
- **NO BLOQUEA STAGING** — build y schema verificados
- CI/CD pipeline es post-staging (I4.4 en roadmap)
- Staging puede hacerse con deploy manual desde local

---

## Findings Matrix — Priorizado para Staging

| ID | Área | Hallazgo | Severidad | ¿Bloquea? | Effort estimado | Dependencias |
|---|---|---|---|---|---|---|
| H0A-01 | A3 | 11 flags sin documentar en `.env.example` | **Media** | **SÍ** | 1h | Ninguna |
| H0A-02 | A4 | 4 tests fallando (2 timeout, 1 mock, 1 assertion) | **Media** | **SÍ** | 2-4h | Decisión producto (T3) |
| H0A-03 | A5 | Sin middleware.ts — auth inline, sin CSP/CSRF | **Alta** | **SÍ → DIFERIDO a Post-v1** (ver `docs/architecture/DEFERRED_MIDDLEWARE.md`) | 4-8h | Ninguna |
| H0A-04 | A5 | ADMIN_API_KEY expuesta en chat — requiere rotación | **Alta** | **SÍ** | 0.5h | Acceso a Vercel |
| H0A-05 | A3 | 3 shadow flags sin función wrapper en feature-flags.ts | **Baja** | No | 1h | Ninguna |
| H0A-06 | A6 | SENTRY_DSN no configurado | **Media** | No (post) | 0.5h | Acceso a Sentry |
| H0A-07 | A1 | Memory no conectada al pipeline (wiring gap) | **Baja** | No | 0.5h | Ninguna |
| H0A-08 | A2 | Pattern Discovery: parse bug + DB schema ausente | **Alta** | No (off) | 4-8h | Ninguna |
| H0A-09 | A6 | LOG_LEVEL no configurado en Vercel | **Baja** | No (post) | 0.1h | Acceso a Vercel |
| H0A-10 | A7 | Pre-commit hooks no activos | **Baja** | No | 1h | Ninguna |

---

## Dependencias entre hallazgos

```
H0A-01 (flags)   → (ninguna, independiente)
H0A-02 (tests)   → Decisión de producto (T3 assertion regression)
H0A-03 (middleware) → (ninguna, independiente)
H0A-04 (key rotation) → (ninguna, independiente)
H0A-05 (shadow flags) → H0A-01 (incluir en misma documentación)
H0A-06 (sentry) → Acceso a cuenta Sentry
H0A-07 (memory) → H0A-05 (shadow flag documentada primero)
H0A-08 (pattern) → (independiente, no tocar hasta PR separado)
H0A-09 (log_level) → (ninguna)
H0A-10 (precommit) → (ninguna)
```

---

## Recomendaciones por prioridad

### Para staging inmediato (antes de deploy)
1. **H0A-01**: Agregar 11 flags a `.env.example` con documentación
2. **H0A-04**: Rotar ADMIN_API_KEY (P0-01)
3. **H0A-02**: Fix 4 tests — al menos aumentar timeouts + actualizar sintaxis `vi.mocked`
~~4. **H0A-03**: Crear `middleware.ts` con auth + CSP~~ **DIFERIDO a Post-v1** — no bloquea staging. Ver `docs/architecture/DEFERRED_MIDDLEWARE.md`.

### Para staging (puede esperar hasta Fase 1)
4. **H0A-06**: Configurar SENTRY_DSN (P0-02)
5. **H0A-09**: Configurar LOG_LEVEL=info (P1-07)
6. **H0A-07**: PR futuro de integración Memory
7. **H0A-10**: Activar pre-commit hooks

### Post-staging (Fase 2+)
9. **H0A-08**: Fix Pattern Discovery (PRD-02)
10. **H0A-05**: Migrar shadow flags a función wrapper (mejora)

---

## Checklist de Staging Readiness

### PASA (ready)
- [x] Build compila (39.9s)
- [x] Static pages generadas (7/7)
- [x] Contratos R1-R4 PASS
- [x] Schema.sql se despliega correctamente
- [x] Memory code existe y funciona (off por defecto)
- [x] Evidence Engine opera en shadow mode (off por defecto)
- [x] BKE/DRL deshabilitados por defecto
- [x] Precommit security check script existe

### FALLA (requiere acción antes de staging)
- [ ] `.env.example` documenta TODAS las feature flags (H0A-01)
- [ ] ADMIN_API_KEY rotada (H0A-04)
- [ ] Suite de tests 100% verde (H0A-02)

### DIFERIDO a Post-v1 (no bloquea staging)
- [ ] ~~middleware.ts protege rutas admin (H0A-03)~~ → Diferido. Ver `docs/architecture/DEFERRED_MIDDLEWARE.md`.

### PENDIENTE (no bloquea staging)
- [ ] SENTRY_DSN configurado (H0A-06)
- [ ] LOG_LEVEL=info configurado (H0A-09)
- [ ] Memory conectada al pipeline (H0A-07)
- [ ] Pre-commit hooks activados (H0A-10)
- [ ] Pattern Discovery fix (H0A-08)
- [ ] Shadow flags migradas a función wrapper (H0A-05)

---

## Documentos relacionados
- `docs/project/CHANGELOG.md` — RRR-1 entry con condiciones
- `docs/project/PROJECT_BOARD.md` — PRD-01 a PRD-04, PRD-06, PRD-07 (Pending before Production); PRD-05 (Deferred Post-v1)
- `docs/ROADMAP.md` — Fase 0: Staging Hardening (I0.1-I0.2, I0.4); Post-v1 Infrastructure (middleware diferido)
- `docs/certification/TECHNICAL_DEBT_BASELINE.md` — Deuda técnica vigente
- `docs/architecture/S1A_GLOBAL_IRREDUCIBILITY_AUDIT.md` — S1A hallazgo de ShadowResult descartado
- `docs/architecture/PR-11_COGNITIVE_REALITY_ALIGNMENT.md` — PR-11 veredicto B
