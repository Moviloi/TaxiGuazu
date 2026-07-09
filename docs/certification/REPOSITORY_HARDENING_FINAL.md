# REPOSITORY HARDENING FINAL — P3
## 2026-07-08

---

## 1. Secretos

| Hallazgo | Estado |
|---|---|
| ADMIN_API_KEY en `.env` | ✅ Gitignored — no trackeado |
| ADMIN_API_KEY en `SYSTEM_STATE_AUDIT.md` | ✅ Redactado (RC1 commit) |
| ADMIN_API_KEY en `RELEASE_READINESS.md` | ✅ Redactado (RC1 commit) |
| API keys/tokens en código fuente | ✅ 0 hallazgos (SECRET_AUDIT.md confirmado) |
| Logs imprimiendo secretos | ✅ 0 hallazgos |
| Credenciales en ejemplos | ✅ `.env.example` tiene valores vacíos |

**ADMIN_API_KEY sigue sin rotar** — es el mismo valor en `.env`. La rotación es operativa (requiere acceso a Vercel dashboard y actualización de `.env`), no de repositorio.

---

## 2. Gitignore

| Archivo | Estado |
|---|---|
| `.gitignore` (raíz) | ✅ ÚNICO — cubre `.env*`, `*.pem`, `*.key`, `node_modules/`, `.next/`, `data/bot.db` |

No hay `.gitignore` duplicados ni redundantes.

---

## 3. Referencias de versionado eliminadas

| Archivo | Referencia | Acción |
|---|---|---|
| `trips.ts:601` | `(Hardening P1)` | Eliminado |
| `location-resolver.ts:3` | `(Hardening P1)` | Eliminado |
| `guard.ts:6` | `en Hardening P0` | Eliminado |
| `database.ts:835` | `(Hardening P1)` | Eliminado |

### Referencias conservadas como excepciones justificadas

| Tipo | Ejemplos | Justificación |
|---|---|---|
| **FASE X** en tests | `describe("FASE 22 — ...")` en 15+ archivos | Protocolo de test naming; no es versionado de código |
| **ARCHITECTURE NOTE (Phase D)** | 8 archivos (pricing, geo, dispatch, admin, driver, fleet, learning) | Documentación de diseño; marca dominios semi-congelados |
| **P0.x / P1** en comentarios | `// P0.9.5: Si ambState era null` en lead.service, ambiguity-handler | Contexto histórico de bug fixes; útil para debugging |
| **v2/v3** en pricing | `tariff-resolver.ts:2 ("v2: resolución unificada")`, `tool-pricing.ts:7 ("tracks v2/v3")` | Contrato público documentado; dual engine activo |
| **v18.0** en sender.ts | `graph.facebook.com/v18.0/` | API version de Meta, no versionado nuestro |
| **Phase G** en connection.ts | `verificado Phase G` | Contexto de migración legacy; backward compat |

---

## 4. Nomenclatura

### Hallazgos — conservados

| Nombre | Por qué no renombrar |
|---|---|
| `pricing-v2` / `pricing-v3` (dual engine) | Contrato público activo. `resolveTariff` (v2) vs `calculatePrice` (v3). Eliminar v2 es una misión de roadmap (Fase 2), no de hardening. |
| `Phase D` ARCHITECTURE NOTES | Documentación de diseño activa. Marca dominios que no deben tocarse. |

### Hallazgos — sin acción necesaria

| Nombre | Justificación |
|---|---|
| `fase-*` test files | Convención de nombres de tests — no es versionado de producción |

---

## 5. Validación final

| Gate | Resultado |
|---|---|
| Build | ✅ PASS |
| Tests (suite completa) | 873/876 (1 histórico + 2 flaky) |
| Contratos R1-R4 | ✅ PASS |
| Schema parity | ✅ 44/44 |

---

## 6. Archivos modificados (4)

| Archivo | Cambio |
|---|---|
| `src/lib/db/domains/trips.ts` | Eliminada etiqueta "Hardening P1" en comentario |
| `src/lib/services/geo/location-resolver.ts` | Eliminada etiqueta "Hardening P1" en comentario |
| `src/lib/ai/guard.ts` | Eliminada etiqueta "Hardening P0" en comentario |
| `src/lib/db/database.ts` | Eliminada etiqueta "Hardening P1" en comentario |

## 7. Riesgos residuales

| Riesgo | Estado |
|---|---|
| ADMIN_API_KEY sin rotar | Pendiente — operación manual en Vercel |
| SENTRY_DSN sin configurar | Pendiente — operación manual en Vercel |
| Phase D dominios congelados | Documentado — roadmap Fase 2+ |
| Dual engine v2/v3 | Documentado — roadmap Fase 2 |
