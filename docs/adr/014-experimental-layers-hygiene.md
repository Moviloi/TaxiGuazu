# ADR-014 — Experimental Layers Hygiene

**Estado:** ACEPTADO

**Fecha:** 2026-07-20

**Prerrequisitos:** AUDIT_REPORT_COMPLETE.md, ADR-009, ADR-012, TECHNICAL_DEBT_BASELINE.md, ARCHITECTURE_FREEZE_V3, INTERFACE_FREEZE_V2

---

## Resumen de decisiones

| # | Componente | Decisión | Acción |
|---|-----------|----------|--------|
| 1 | Evidence Engine (`src/lib/evidence/`) | **KEEP** — Mantener como shadow mode | Documentar estado; activar post-v1 |
| 2 | Pattern Discovery (`src/lib/pattern-discovery/`) | **REMOVE** — Eliminar de `src/` | Código preservado en git history |
| 3 | Cognitive Collector (`src/lib/cognitive/`) | **KEEP** — Mantener como debug metrics | Documentar como métricas en memoria |
| 4 | hard-reset (`src/lib/dev/hard-reset.ts`) | **PROTECT** — Proteger con flag | Guard `DEV_MODE_ENABLED` agregado |
| 5 | BKE + DRL (`src/lib/bke/` + `src/lib/drl/`) | **REMOVE** — Eliminar de `src/` | Código preservado en git history |

---

## 1. Contexto

Como parte de la auditoría sistémica completa de AITOS (BUILD misión 2026-07-20), se identificó que aproximadamente **26% del código en `src/`** corresponde a capas experimentales que:

- No tienen efecto en producción (flags default false, shadow mode)
- Contienen bugs conocidos (Pattern Discovery: JSON.parse sin validación)
- Crean tablas fuera de `schema.sql` (violación ADR-007)
- Generan ruido operacional (console.logs en Pattern Discovery)
- No son consumidas por ningún módulo de producción (0 imports externos verificados)

La auditoría clasificó estos componentes como **REFACTOR** o **REMOVE**. Este ADR formaliza las decisiones de higiene arquitectónica adoptadas por BUILD.

### 1.1 Principios aplicados

1. **Código higiénico** (mandato BUILD): el código en `src/` debe ser intencional, mantenible y libre de peso muerto.
2. **Preservación de historia**: todo el código removido permanece accesible en git history. No se pierde inversión intelectual.
3. **Congelamientos activos**: Architecture Freeze V3 e Interface Freeze V2 no se modifican. ADR-009 (Evidence Engine) permanece vigente.
4. **Sin impacto funcional**: ninguna de estas decisiones altera el comportamiento conversacional del producto.

---

## 2. Decisiones

### 2.1 Decisión 1: Evidence Engine — KEEP (shadow mode)

**Componente:** `src/lib/evidence/` (22 archivos, 2,881 líneas, 19 test files, 3,720 líneas de test)

**Decisión:** Mantener en su ubicación actual con documentación explícita de su estado "shadow mode". No modificar ni eliminar.

**Fundamento:**
- 378 tests pasan exitosamente. El código es funcional y probado.
- El flag `EVIDENCE_SHADOW_MODE` ya existe como guarda de runtime.
- El diseño completo de 7 capas (Signal→Observation→Fact→Evidence→Knowledge→Belief→Decision) está documentado en ADR-009 y la ontología.
- La activación está planificada para post-v1. Eliminar código probado para re-implementarlo después es contraproducente.
- El "shadow mode" es un patrón válido de despliegue gradual.

**Consecuencias:**
- El código sigue en `src/` pero no tiene efecto en producción hasta que `EVIDENCE_SHADOW_MODE=true`.
- ADR-009 permanece vigente y vinculante.
- El overhead de mantenimiento es bajo (0 imports externos, cambios solo internos al directorio).

---

### 2.2 Decisión 2: Pattern Discovery — REMOVE

**Componente:** `src/lib/pattern-discovery/` (12 archivos, 2,040 líneas, 3 test files, 798 líneas de test)

**Decisión:** Eliminar completamente de `src/`. No mover a branch — el código está preservado en git history.

**Fundamento:**
- **Bug conocido:** `repository.ts:188,204` — `JSON.parse(acceptance_json)` sin validación de tipo. Causa crashes silenciosos.
- **Violación ADR-007:** Las tablas `pd_*` se crean dinámicamente en `ensureSchema()` dentro del código, no en `schema/schema.sql`. Rompe el principio de Single Source of Truth.
- **Ruido operacional:** Múltiples `console.log` sin control en pipeline de producción.
- **Sin consumidores:** 0 imports desde código de producción. Solo referenciado en comentarios de `env.ts`.
- **Sin plan de activación:** No hay hoja de ruta para activar Pattern Discovery post-v1.

**Consecuencias:**
- Las variables de entorno `PATTERN_DISCOVERY_ENABLED` y `PATTERN_DISCOVERY_DRY_RUN` dejan de tener efecto.
- Los comentarios en `env.ts` fueron actualizados para reflejar la remoción.
- Si en el futuro se requiere, se puede recuperar de git history o re-implementar con las lecciones aprendidas.

---

### 2.3 Decisión 3: Cognitive Collector — KEEP (debug metrics)

**Componente:** `src/lib/cognitive/` (4 archivos, 525 líneas, 1 test file, 377 líneas de test)

**Decisión:** Mantener como recolector de métricas de depuración en memoria.

**Fundamento:**
- **Tiene un consumidor:** la API `/api/bot/metrics/cognitive` expone los datos del collector para debugging.
- **Bajo costo de mantenimiento:** 4 archivos, 525 líneas. No tiene dependencias externas.
- **Arquitectura limpia:** Buffer circular en memoria (10k eventos, 100 requests). Sin efectos secundarios en el flujo principal.
- **Patrón sin-efecto-secundario:** Si el collector falla, el flujo principal no se ve afectado (try/catch silencioso).
- **Potencial utilidad futura:** Las métricas pueden servir para monitoreo cognitivo en staging.

**Consecuencias:**
- Se documenta como "métricas de debug en memoria, sin persistencia".
- No se invierte en persistencia ni dashboards hasta post-v1.

---

### 2.4 Decisión 4: hard-reset.ts — PROTECT

**Componente:** `src/lib/dev/hard-reset.ts` (1 archivo, 136 líneas → 158 líneas post-guard)

**Decisión:** Mantener en `src/lib/dev/` pero protegido con guarda `DEV_MODE_ENABLED=true`.

**Fundamento:**
- **Utilidad comprobada:** La función `.limpiar` es usada activamente en desarrollo para resetear conversaciones.
- **Peligro en producción:** Elimina TODOS los mensajes, sesiones y datos de un número telefónico. No debe ejecutarse en producción.
- **Solución higiénica:** Agregar guarda de seguridad es más limpio que eliminar la herramienta.

**Consecuencias:**
- `hardReset()` ahora lanza `Error` si `DEV_MODE_ENABLED !== "true"`.
- La ejecución accidental en producción queda prevenida.
- El flag `DEV_MODE_ENABLED` debe documentarse en `.env.example` como variable de desarrollo.

---

### 2.5 Decisión 5: BKE + DRL — REMOVE

**Componente:** `src/lib/bke/` (10 archivos, 1,234 líneas) + `src/lib/drl/` (12 archivos, 2,476 líneas)

**Decisión:** Eliminar completamente de `src/`. Código preservado en git history.

**Fundamento:**
- **Sin consumidores:** 0 imports desde código de producción. Verificado con búsqueda en todo `src/`.
- **Flags muertas:** Ninguna de las 10 flags en `feature-flags.ts` es consultada por ningún módulo. Son funciones que siempre retornan `false` (ahora marcadas `@deprecated`).
- **Sin tests:** No existen tests unitarios para BKE ni DRL.
- **Sin plan de activación:** ADR-012 (Cognitive Escalation) definió la arquitectura, pero no hay hoja de ruta para implementación.
- **Peso muerto:** 22 archivos, 2,476 líneas de código que nunca se ejecutan y no tienen verificaciones de calidad.

**Consecuencias:**
- Las funciones de `feature-flags.ts` se mantienen como stubs `@deprecated` que retornan `false` para no romper posibles imports residuales. Se eliminarán en OLA 5 tras verificación.
- Las variables de entorno `BKE_ENABLED`, `DRL_ENABLED`, etc. dejan de tener efecto.
- ADR-012 (Cognitive Escalation) permanece vigente como **diseño conceptual**. La implementación concreta se re-evaluará post-v1.

---

## 3. Estado post-ejecución

| Métrica | Antes | Después | Δ |
|---------|-------|---------|---|
| Archivos en `src/` | ~145 | ~111 | -34 (~23%) |
| Líneas en `src/` | ~38,400 | ~32,600 | -5,800 (~15%) |
| Tests | ~1,657 | ~1,654 | -3 (pattern-discovery) |
| ADRs activos | 13 | 14 | +1 (este) |
| Archivos huérfanos en raíz | 4 | 0 | -4 |

---

## 4. Documentos afectados

| Documento | Cambio |
|-----------|--------|
| `src/config/env.ts` | Comentarios de `PATTERN_DISCOVERY_*` actualizados |
| `src/config/feature-flags.ts` | Funciones BKE/DRL marcadas `@deprecated`, retornan `false` |
| `src/lib/dev/hard-reset.ts` | Guarda `guardDevMode()` agregada |
| `.env.example` | Agregar `DEV_MODE_ENABLED` (documentación) |
| `docs/architecture/ADR_INDEX.md` | Agregar entrada para ADR-014 |

---

## 5. Referencias

- `AUDIT_REPORT_COMPLETE.md` — Auditoría completa con hallazgos clasificados
- `TECHNICAL_DEBT_BASELINE.md` — Línea base de deuda técnica
- `ADR-009` — Evidence Engine Architecture
- `ADR-012` — Cognitive Escalation Principle
- `ARCHITECTURE_FREEZE_V3` — Congelamiento arquitectónico vigente
- `INTERFACE_FREEZE_V2` — Congelamiento de interfaces vigente
- `CE-3A_BKE_SPECIFICATION.md` — **Redefinido por este ADR.** Especificación BKE original. (Histórico, candidato a eliminación.)
- `CE-3B_DRL_SPECIFICATION.md` — **Redefinido por este ADR.** Especificación DRL original. (Histórico, candidato a eliminación.)

---

*Authority: BUILD misión 2026-07-20*
*Próxima revisión: post-v1 o al activar shadow mode*
