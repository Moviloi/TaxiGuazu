# SYSTEM STATE AUDIT — AITOS + ARNÉS
## Auditoría completa del ecosistema | 2026-07-08 14:50 UTC

---

## SECCIÓN A — Evolución del arnés Ael

### A1. Estructura completa de ael/

```
ael/
├── archive/
│   ├── 01-director.md              (1430 bytes) — ARCHIVED
│   ├── AGENTS.md                   (5458 bytes) — ARCHIVED
│   ├── FAILURE.md                  (4246 bytes) — ARCHIVED
│   ├── HANDOFF.md                  (3785 bytes) — ARCHIVED
│   ├── INTEGRATION.md              (4194 bytes) — ARCHIVED
│   └── PIPELINE.md                 (6540 bytes) — ARCHIVED
├── artifacts/
│   ├── archive/
│   │   └── SECRET_MIGRATION.md     (2057 bytes)
│   ├── BACKLOG.md                  (77317 bytes) — ACTIVO v3.12
│   ├── DECISION_RECORD.md          (2143 bytes) — HISTÓRICO
│   ├── DESIGN_SPEC.md              (3045 bytes) — HISTÓRICO
│   ├── DIAGNOSTIC_REPORT.md        (662 bytes) — ÚLTIMA: 2026-07-07
│   ├── PATTERN_EXTRACTION.md       (4121 bytes) — HISTÓRICO
│   ├── SECRET_AUDIT.md             (2912 bytes) — HISTÓRICO 2026-06-27
│   ├── SYSTEM_STATE.md             (5643 bytes) — HISTÓRICO
│   ├── TASK_PLAN.md                (1329 bytes) — HISTÓRICO
│   └── VALIDATION_REPORT.md        (1466 bytes) — HISTÓRICO
├── constitution/
│   ├── CONTRACTS.md                (5038 bytes) — ACTIVO
│   └── SPEC.md                     (11171 bytes) — ACTIVO
├── contracts/
│   ├── CONTRACTS.md                (264 bytes) — REDIRECT a constitution/
│   ├── diagnose.sh                 (11923 bytes) — ACTIVO
│   └── enforce.sh                  (4255 bytes) — ACTIVO
├── government/
│   ├── ORGANIZATION.md             (2430 bytes) — ACTIVO
│   └── roles/
│       ├── 02-explorer.md          (906 bytes)
│       ├── 03-architect.md         (1033 bytes)
│       ├── 04-implementer.md       (1030 bytes)
│       ├── 05-auditor.md           (936 bytes)
│       ├── 06-memory.md            (963 bytes)
│       └── 07-learning.md          (1021 bytes)
├── tools/                           — DIRECTORIO VACÍO
└── README.md                       (1849 bytes) — ACTIVO
```

### A2. Mecanismo de decisión por tareas

El ARNÉS migró de un "pipeline de 7 fases" a un **Mission Operating System** basado en restricciones. La Constitución (`ael/constitution/SPEC.md`, 227 líneas) define:

- **6 invariantes** (I1-I6): Validation, Justification, Traceability, Architectural Integrity, Knowledge Preservation, Non-Regression
- **7 capabilities**: Discovery, Architecture, Implementation, Validation, Memory, Learning, Governance
- **4 lifecycle constraints** (L1-L4): Understanding, Planning, Execution, Closure
- **6 operating principles**: Minimality, Reusability, Evidence, Parallelism, Transparency, Courage

El Director es soberano dentro de estas restricciones. No hay lógica de ruteo por tipo de tarea ni asignación de modelo — el Director decide qué capabilities invocar y en qué orden.

### A3. Subagentes

6 subagentes definidos en `opencode.json` (líneas 30-113):

| Subagente | Rol | Modelo | Permisos |
|---|---|---|---|
| `ael-explore` | Explorer | DeepSeek V4 Flash Free | read, glob, grep, list (no edit/bash) |
| `ael-architect` | Architect | DeepSeek V4 Flash Free | read, glob, grep, list (no edit/bash) |
| `ael-implementer` | Implementer | DeepSeek V4 Flash Free | read, glob, grep, list, edit:ask, bash:ask |
| `ael-audit` | Auditor | Nemotron | read, glob, grep, list, bash: npm test/build/lint/enforce |
| `ael-memory` | Keeper | North Mini Code Free | read, glob, grep, list, edit:ask (no bash) |
| `ael-learning` | Analyst | North Mini Code Free | read, glob, grep, list, edit:ask (no bash) |

Los contratos de cada capability están en `ael/government/roles/02-07-*.md`. Cada uno define Purpose, Responsibility, Authority, Input, Output, Contract (Must/Must Not/Guarantees).

### A4. Optimización de recursos

- **No hay caching formal de contexto** entre misiones.
- **No hay reducción automática de tokens**.
- El Director puede omitir capabilities (skip conditions basados en SPEC §4: "The Director may use any subset, in any order, as many times as needed, or not at all").
- Las capabilities no son fases obligatorias — el Director decide cuáles son necesarias.

### A5. Registro y estados

- **No hay schema formal de estados** para tareas/misiones.
- `ael/artifacts/DIAGNOSTIC_REPORT.md` registra integridad del arnés (9 checks: roles, comandos, agente principal, docs, contratos, artefactos, duplicados, cross-refs).
- El enforcement de contratos (`enforce.sh`) verifica R1-R4 automáticamente.
- No hay mecanismo automático de registro de estado de misión — depende del Director.
- BACKLOG.md es el registro manual de planificación (v3.12, 2026-07-05).

---

## SECCIÓN B — Backlog → Baseline

### B6. BACKLOG.md

**Archivo**: `ael/artifacts/BACKLOG.md` (77317 bytes, 415 líneas)
**Última actualización**: v3.12 — 2026-07-05
**Estado**: NO actualizado desde las misiones 000-005 ni P0/P1/S0/S1/S2/A2/A3.

El archivo contiene:
- Sección A: Backlog Activo (DGM, DEBT, UC) — parcialmente desactualizada
- Sección B: Diagramas (15+DGM-16, todos DONE)
- Sección C: Deuda técnica (DEBT-01 a DEBT-13, GAP-01 a GAP-07)
- Sección D: Features futuras (FUT-01 a FUT-10)
- Sección E: Features eliminadas (REM-01 a REM-08)
- Sección F: Dependencias
- Sección G: Plan AITOS (35 tareas en 7 fases)
- Sección H: Post-AITOS findings (GAP-08 a GAP-12, DEBT-13, Launch Readiness)

Los hallazgos de las auditorías 000-005 y los hardening P0/P1 no están registrados en el changelog.

### B7. Registros de contexto

- `ael/artifacts/DIAGNOSTIC_REPORT.md` — integridad del arnés (última: 2026-07-07)
- `ael/artifacts/SECRET_AUDIT.md` — auditoría de secretos (2026-06-27)
- `docs/certification/` — 10+ informes de certificación (misiones 000-005, P0-P2, S0-S2, A2-A3)
- `docs/ROADMAP.md` — plan maestro de evolución
- `.opencode/memory/MEMORY.md` — memoria operativa del agente (392 líneas)

---

## SECCIÓN C — Documentación visual

### C9. Inventario de diagramas

24 archivos en `docs/architecture/diagrams/`:

| Archivo | Tipo | Tamaño |
|---|---|---|
| `00-main-system-diagram.mmd` | Mermaid fuente | 2477B |
| `00-main-system-diagram.svg` | SVG renderizado | 69507B |
| `01-system-overview.md` | Documentación | 4753B |
| `02-webhook-entry.md` | Documentación | 2943B |
| `03-core-phase.md` | Documentación | 4278B |
| `04-router-phase.md` | Documentación | 2144B |
| `05-extraction-phase.md` | Documentación | 3803B |
| `06-confidence-model.md` | Documentación | 2758B |
| `07-policy-ahora.md` | Documentación | 2561B |
| `08-policy-reserva.md` | Documentación | 3824B |
| `09-location-resolution.md` | Documentación | 2639B |
| `10-tariff-resolution.md` | Documentación | 3028B |
| `11-operational-readiness.md` | Documentación | 2713B |
| `12-workflow-state-machine.md` | Documentación | 3192B |
| `13-slot-confidence-evolution.md` | Documentación | 3253B |
| `14-dispatch-flow.md` | Documentación | 3470B |
| `15-data-flow.md` | Documentación | 2885B |
| `16-policy-pipeline.md` | Documentación | 5087B |
| `dfd-levels.md` | DFD | 3641B |
| `diagrama-entidades.svg` | SVG entidades | 23738B |
| `event-flow.md` | Event flow | 2693B |
| `runtime-flow.md` | Runtime flow | 3663B |
| `sequence-diagrams.md` | Secuencia | 6933B |
| `state-machines.md` | State machines | 4316B |

**GAP-11 (documentación visual):**
- ✅ Tools/contratos: AIT-020-025 tools están documentados en BACKLOG pero sin diagramas dedicados
- ✅ Event sourcing: `trip_events` y `dispatch_events` existen con DDL
- ✅ Knowledge Layer: `validate-knowledge.ts` cubre 11 archivos
- ✅ P3-OI: AIT-060/061 implementados (airport_code, pickup time)
- ✅ Migration runner: `scripts/run-migrations.ts` implementado
- ✅ ADR-006: Creado y verificado con `validate-schema-parity`
- ❌ Diagrama de despliegue: NO existe en los diagramas
- ❌ Diagrama de entidades completo (44+ tablas): Solo existe `diagrama-entidades.svg` (parcial)

---

## SECCIÓN D — Estado del incidente de producción

### D10. LOG_LEVEL

**No verificado.** El archivo `.env` local NO contiene la variable `LOG_LEVEL`. No se puede verificar el valor en Vercel Production sin acceso a las variables de entorno de Vercel.

### D11. Hallazgos de confiabilidad del resolver de lugares

**ESTADO: NO VERIFICADO.** No hay evidencia en el código actual de que estos hallazgos hayan sido abordados:
- **P0 Levenshtein ≤3 + auto-insert**: No se encontró código de auto-insert con Levenshtein en los archivos actuales de `geo/location-resolver.ts` o `db/domains/geo.ts`. El resolver actual usa `findPlaceByAlias` y `findPlaceByName` con 4 niveles de fallback. No hay lógica de Levenshtein.
- **P0 extractLocationFromText**: Esta función no existe en el código actual.
- **P1 parseSelection paso 2c**: No se encontró esta función.
- **P2 LLM extrae "hotel" genérico**: La detección de términos ambiguos existe en `patterns.ts:AMBIGUOUS_LOCATION_RE`.

**Conclusión**: Los hallazgos parecen referirse a una versión anterior del sistema o a un análisis que no se implementó. El código actual no contiene las funciones mencionadas.

### D12. Verificación de integridad de datos — aliases

**NO VERIFICADO.** No se pudo ejecutar consulta contra Turso real. Las credenciales (`TURSO_DATABASE_URL`, `TURSO_DATABASE_TOKEN`) están en `.env` pero no se ejecutó una consulta directa. El script `scripts/query-places.ts` fue archivado.

**Riesgo**: Sin acceso a Turso, no se puede verificar si hay aliases insertados automáticamente.

### D13. Bug de PÉRDIDA TOTAL DE CONTEXTO

**NO INVESTIGADO.** Este bug (usuario confirma con "si" y el sistema vuelve a preguntar "¿Desde dónde salís?") no fue diagnosticado con logs reales. No hay evidencia de investigación posterior.

El código relevante (`lead.service.ts:396-441`, awaiting_confirmation handler) muestra que tras una afirmación:
1. Resuelve pricing para los slots confirmados
2. Si es NOW → `executeNowTrip` → `setConversationalState("idle")`
3. Si es FUTURO → `setConversationalState("pending_human_review")`

El bug podría ocurrir si `executeNowTrip` falla silenciosamente o si los slots no se cargan correctamente desde la sesión.

**Estado**: Sin diagnosticar. Es el hallazgo más grave sin cerrar.

### D14. Estado del webhook en producción

**NO VERIFICADO.** No se puede hacer un test real sin enviar un mensaje a WhatsApp. El último commit (`831e2bf`) está deployed en Vercel. El webhook responde a tests locales (`tests/simulate.int.test.ts` pasa, 875/876 tests totales).

---

## SECCIÓN E — Estado general del código y despliegue

### E15. Git log (últimos 20 commits)

```
831e2bf docs: reconstruct AITOS architecture documentation for AI agents
1226c15 fix(detect-lang): make detectLeadLang wrapper over detectLangWithFallback + migrate 5 call sites
760431a instrument: [OBSERVABILITY] logs turno a turno en extraction-runner
37e50c4 fix: track data/knowledge/ + .gitignore (unblocks Vercel build)
c47d530 fix(lang): sessionLang overridea deteccion borderline, merge slots restaura previo si LLM alucina, DESDE_RE captura 'del'
1e61ce3 docs: formalize architectural review findings (GAP-08 to GAP-12, DEBT-13, launch readiness)
8fc6a3f feat(AIT-064): learning loop para ajustar confianza de sugerencias
368992c feat(AIT-063): unconfirmed suggestion system
97eb857 docs: AEL closing checklist + backlog + memory update
f1f3cfc feat(AIT-052): evals system
3fb10a5 feat(AIT-051): metrics endpoint
c8aa580 feat(AIT-050): Sentry integration
6675f4e chore: shared infra — structured logger, i18n log, airport_mention fact
91791fc feat(AIT-043): dispatch events + trip events audit log
8dc2445 refactor(DEBT-12): remove legacy ALTER TABLE migrations + ADR-006 extension
0050f54 chore: remove debris file '0' (merge artifact from AIT-041) + track db/migrations/
c8638db feat: AIT-062 border inference - árbol de decisión 3 países
6261e28 feat(AIT-061): inferred pickup time based on attraction opening hours
0cf3179 feat(AIT-060): airport_code detection, slot state and confirmation UI
e8ce3db checkpoint: AIT-041 dispatch_events schema done
```

Último commit: `831e2bf` (docs: reconstruct AITOS architecture documentation for AI agents). Fecha estimada: 2026-07-06.

### E16. Git status

**MASIVOS CAMBIOS SIN COMMITEAR.** 80+ archivos modificados/eliminados/creados correspondientes a las misiones P0, P1, S0, S1, S2, A2, A3:

- **Modificados (M)**: ~50 archivos (lead.service.ts, guard.ts, handler.ts, database.ts, location-resolver.ts, route.ts, tariff-resolver.ts, + 30+ test files, + package.json, + ael/ configs)
- **Eliminados (D)**: ~30 archivos (ael/AGENTS.md, PIPELINE.md, HANDOFF.md, FAILURE.md, roles/01-07, geo-engine.ts, tool-*.ts, scripts legacy, CODE_DIFF.md)
- **Nuevos (??)**: ~20 archivos (ael/constitution/, ael/government/, docs/certification/, docs/ROADMAP.md, slot-confirmation-handler.ts, passenger-count.ts, tariff-repository.ts)

**⚠️ REPETICIÓN DEL INCIDENTE**: Igual que la sesión anterior, hay cambios masivos sin commitear. Las misiones P0-P1-S0-S1-S2-A2-A3 (al menos 7 misiones completadas con modificaciones de código) no tienen commits.

### E17. Repositorio

```
origin  https://github.com/Moviloi/TaxiGuazu.git (fetch)
origin  https://github.com/Moviloi/TaxiGuazu.git (push)
```

Sin cambios. El repo sigue en `github.com/Moviloi/TaxiGuazu`.

### E18. Validación de schema y knowledge

**validate-schema-parity**: ✅ 44/44 tablas — PARITY CONFIRMED. Sin drift.

**validate-knowledge**: ❌ 6/11 FAIL:
- `places.json`: hash mismatch + Zod error (4 lugares con type inválido)
- `borders.json`: hash mismatch
- `attractions.json`: hash mismatch
- `migration.json`: hash mismatch
- `calendar.json`: hash mismatch
- `escalation.json`: hash mismatch + Zod error (externalRefs: expected array, received undefined)

### E19. ADMIN_API_KEY

**⚠️ NO ROTADA.** La key en `.env` es la misma que apareció en esta conversación anteriormente. **Requiere rotación inmediata.**
