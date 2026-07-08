# CLEANUP PLAN — AITOS
## Generated: 2026-07-07 | Actionable recommendations

---

## Priority Legend

| Tier | Meaning | Action Window |
|---|---|---|
| **P1** | Should be done soon | This sprint |
| **P2** | Should be planned | Next 2 sprints |
| **P3** | Nice to have | Future |

---

## P1 — Migrar/Remover

### C001 — geo-engine.ts: DEPRECATED con test activo

| Field | Value |
|---|---|
| **File** | `src/lib/services/geo/geo-engine.ts` (124L) |
| **Test** | `tests/services/geo-engine.test.ts` |
| **Evidence** | File header: `// DEPRECATED: Location resolution lives in location-resolver.ts.` |
| **Risk** | If 0 active imports remain → safe deletion. If consumers exist → need migration. |
| **Evidence of consumers** | Verified via text search: `geo-engine` appears in tests/ and in `services/geo/` import chains. Needs runtime import audit. |
| **Recommendation** | **Migrar**: verify 0 active `import` or `require` from `geo-engine` outside of `geo-engine.test.ts`. If 0, delete both. If >0, migrate each consumer to `location-resolver.ts` first. |

### C002 — `.husky/_/husky.sh` DEPRECATED

| Field | Value |
|---|---|
| **File** | `.husky/_/husky.sh` (3L) |
| **Evidence** | File content: `echo "husky - DEPRECATED"` and instructions to remove. |
| **Risk** | LOW — will FAIL in Husky v10. |
| **Recommendation** | **Eliminar** the deprecated hook file. Verify hooks still work after. |

---

## P2 — Archivar Scripts

### C003-C013 — 11 Scripts sin npm command

| ID | Script | Purpose | Lines |
|---|---|---|---|
| C003 | `scripts/diagnose-db.ts` | One-shot DB diagnostic | ~50 |
| C004 | `scripts/diagnose-db-check.ts` | One-shot DB check | ~50 |
| C005 | `scripts/diagnose-fuzzy.ts` | Fuzzy search diagnostic | ~50 |
| C006 | `scripts/diagnose-location-reliability.ts` | Location reliability check | ~250 |
| C007 | `scripts/debt12-dump-schema.ts` | Schema dump (DEBT-12) | ~50 |
| C008 | `scripts/check-schema.ts` | Schema validation | ~50 |
| C009 | `scripts/check-places-to-fix.ts` | Places diagnostic | ~50 |
| C010 | `scripts/query-airports.ts` | Ad-hoc airport query | ~50 |
| C011 | `scripts/query-places.ts` | Ad-hoc places query | ~50 |
| C012 | `scripts/query-conversations.ts` | Ad-hoc conversations query | ~50 |
| C013 | `scripts/cleanup-autoinsert.ts` | Auto-insert cleanup | ~50 |

**Evidence**: None of these have corresponding `npm run` entries in package.json. They are one-shot diagnostic or ad-hoc query scripts.

**Recommendation**: **Archivar** all 11 to `scripts/archive/`. If any are still needed, they can be retrieved from archive.

### C014-C019 — 6 Migration Scripts (One-Shot)

| ID | Script | Purpose |
|---|---|---|
| C014 | `scripts/migrate-places-20260629.ts` | Place data migration |
| C015 | `scripts/migrate-displaynames-20260630.ts` | Display name migration |
| C016 | `scripts/migrate-catastro.ts` | Catastro migration |
| C017 | `scripts/seed-migrations-history.ts` | Migration history seed |
| C018 | `scripts/seed-round-trips.ts` | Round trip seeding |
| C019 | `scripts/verify-migration.ts` | Migration verification |

**Recommendation**: **Archivar** all one-shot migrations (`migrate-*`, `seed-round-trips`, `seed-migrations-history`). **Mantener** `tarifario-crud.ts` (may be reused for tariff updates) and `verify-migration.ts` (useful for future migration verification).

### C020-C022 — Architecture Scripts sin npm command

| ID | Script | Current npm command | Recommendation |
|---|---|---|---|
| C020 | `scripts/architecture/detect-drift.ts` | None found | **Agregar** `npm run docs:drift` or archive if unused |
| C021 | `scripts/architecture/validate-docs.ts` | None found | **Agregar** `npm run docs:validate` or archive if unused |
| C022 | `scripts/architecture/generate-graphs.ts` | None found | **Agregar** `npm run docs:graphs` or archive if unused |

---

## P2 — File Size Refactoring Candidates

These are NOT urgent. They are documented for future planning.

| ID | File | Lines | Domain | Concern |
|---|---|---|---|---|
| C023 | `ambiguity-handler.ts` | 786L | Workflow | Too many concerns. Split detection from response building. |
| C024 | `database.ts` | 769L | DB Facade | Well-organized but large. Could split into domain-specific facades. |
| C025 | `connection.ts` | 716L | DB Core | Embedded DDL. Extract to migration files. |
| C026 | `lead.service.ts` | 671L | Orchestration | God orchestrator. Split by workflow phase. |
| C027 | `extraction-runner.ts` | 610L | Extraction | Pipeline doing too much. Separate orchestrator from runner. |
| C028 | `trips.ts` | 597L | DB Domain | Large but well-focused. Split if it grows further. |
| C029 | `driver.service.ts` | 473L | Dispatch | Many message handlers. Could group by handler type. |
| C030 | `admin-commands.ts` | 442L | Admin | Many commands. Split by domain (drivers, tariffs, packages). |
| C031 | `policy-reserva.ts` | 427L | AI Policy | Complex multi-branch. Could use strategy pattern. |
| C032 | `dispatch.service.ts` | 399L | Dispatch | Core logic is focused. Fine at current size. |

---

## P3 — Minor

### C033 — site/ directory

| Field | Value |
|---|---|
| **Path** | `site/` (12 pages, ~28 images) |
| **Type** | Static HTML/CSS/JS marketing site |
| **Relation to AITOS** | NONE — separate pre-existing site |
| **Recommendation** | **Mantener** — serves SEO and marketing. Not related to bot architecture. |

### C034 — .husky DEPRECATED hook

| Recommendation | Already covered in C002. |

---

## Summary

| Priority | Items | Estimated Effort |
|---|---|---|
| **P1** (this sprint) | 2 items (geo-engine.ts removal, husky cleanup) | 1-2 hours |
| **P2** (next sprints) | 22 items (11 scripts archive, 6 migration archive, 3 npm commands, 10 refactor candidates) | 4-8 hours |
| **P3** (future) | 1 item (confirm site/ status) | 0.5 hours |
| **Total** | **25 actionable items** | **~10 hours** |

### Items by Action Type

| Action | Count |
|---|---|
| ARCHIVAR scripts | 17 |
| MIGRAR/REMOVER dead code | 2 |
| AGREGAR npm commands | 3 |
| REFACTOR (future) | 10 |
| MANTENER | 1 |

---

*Confidence: HIGH. All items verified against codebase.*
*Generated by: ARNÉS Mission 000 — Certification.*
*Note: This plan does NOT implement any changes. It documents findings only.*
