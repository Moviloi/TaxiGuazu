# G.4 — Architecture Finalization Audit

## Overview
Post-normalization architecture review after G.1 (dead exports), G.2 (database boundary), and G.3 (dynamic SQL). This report identifies remaining structural debt and produces a stabilization roadmap.

**Health Score: 6.5/10**
- Strengths: Clean AI pipeline, well-partitioned workflow, correct overall layering
- Weaknesses: God class database.ts, flat services/ dumping ground, over-split learning/, stale naming, circular dependency

---

## 1. Folder/Domain Structure

### 1.1 Directory tree (skeleton)
```
src/lib/
├── ai/          (12 files, 1,612L) — well-structured pipeline
│   └── laterals/ (3 files) — clean subdomain
├── config/      (2 files, 151L) — static data + constants
├── core/        (1 file, 98L) — pipeline orchestration
├── db/          (2 files, 1,318L) — database.ts is STILL a god class
│   ├── core/    (2 files, 469L) — connection + helpers
│   └── domains/ (3 files, 794L) — partial extraction only
├── services/    (23 FLAT files, 3,848L) — BIGGEST PROBLEM
│   ├── dispatch/       (2 files) — good
│   ├── extraction/     (2 files) — good
│   ├── housekeeping/   (1 file)  — splits with flat housekeeping.ts
│   ├── i18n/           (1 file)  — premature subdirectory
│   ├── learning/       (22 files, 1,350L) — over-split
│   ├── pricing/        (1 file)  — premature subdirectory
│   ├── trip-execution/ (1 file)  — borderline premature
│   └── workflow/       (10 files) — well-partitioned
├── utils/       (1 file, 7L) — premature
└── whatsapp/    (1 file, 105L) — good
```

### 1.2 Critical structural issues

| Issue | Details | Impact |
|-------|---------|--------|
| `services/` flat dumping ground | 23 files (3,848 lines) mixing extraction, pricing, geo, memory, admin, fleet, survey, opportunity, housekeeping | No cohesion; hard to find code; cross-domain imports are messy |
| `database.ts` still a god class | 969 lines, 86 inline exports, 30 re-exports, 13 domain sections | Monolithic; only 3 of ~planned 20 domains extracted |
| Circular dependency | `db/domains/trips.ts` ↔ `db/database.ts` (trips imports getDriverDiscountForTariff from database) | Architectural cycle; ESM handles it at runtime but conceptually wrong |
| `services/learning/` over-split | 22 files for 1,350 lines (avg 61L/file). Files like `errors.ts` (8L), `events.ts` (6L), `experiment.ts` (3L) are single-function wrappers | Too much file overhead; reduces navigability |
| `housekeeping.ts` split | Flat file (`housekeeping.ts`) + subdirectory (`housekeeping/timeouts.ts`) | Ambiguous ownership |

### 1.3 Misplaced files (20 candidates)

| File | Current | Should Be |
|------|---------|-----------|
| entityExtractor.ts | services/ | services/extraction/ |
| regexExtractor.ts | services/ | services/extraction/ |
| extractSlots.ts | services/ | services/extraction/ |
| confidence.ts | services/ | services/extraction/ |
| comprehension.ts | services/ | services/extraction/ |
| slot-workflow.ts | services/ | services/workflow/ |
| geoEngine.ts | services/ | services/geo/ (new) |
| location-resolver.ts | services/ | services/geo/ (new) |
| memory.ts | services/ | services/memory/ (new) |
| contextMemory.ts | services/ | services/memory/ (new) |
| pricing-engine.ts | services/ | services/pricing/ |
| tariff-resolver.ts | services/ | services/pricing/ |
| commercial-pricing-engine.ts | services/ | services/pricing/ |
| predictive-routing.ts | services/ | services/learning/ |
| tripOutcomeTracker.ts | services/ | services/learning/ |
| opportunity-engine.ts | services/ | services/learning/ |
| fleet-validation.ts | services/ | services/dispatch/ |
| admin-commands.ts | services/ | services/admin/ (new) |
| admin.service.ts | services/ | services/admin/ (new) |
| housekeeping.ts | services/ | services/housekeeping/ (merge) |

---

## 2. Naming Audit

### 2.1 Legacy/phase terminology (16 stale comments)

Found in: `database.ts` (lines 96, 553, 586, 756 — "Fase 3 v5.0", "Fase 4D"), `trips.ts` (lines 94, 213 — "FASE 4A + 4B", "FASE 4C"), `tariff-resolver.ts` (line 5 — "v2/v3"), `pipeline.ts` (line 3 — "v5.7", line 54 — "AHORA is legacy"), `core.ts` (line 56 — "v5.x"), all frozen/semi-frozen ARCHITECTURE NOTE comments.

**Verdict**: Noise but harmless. Remove as part of comment cleanup. Safe mechanical edits.

### 2.2 Opaque table/column prefixes (9 tables, 30+ references)

| Table | Meaning of Prefix | Suggested Name |
|-------|------------------|----------------|
| `f9_events` | F9 = feature 9? | `learning_events` |
| `f9_error_log` | unknown | `error_log` |
| `f9_drift_log` | unknown | `drift_log` |
| `f9_admin_commands` | unknown | `admin_command_log` |
| `conversation_f4_log` | F4 = feature 4? | `escalation_log` |
| Column `f4_state` | unknown | `comprehension_state` |
| Key `f4_escalation_rate` | unknown | `escalation_rate` |
| Key `f7_weight:*` | unknown | `objective_weight:*` |

**Verdict**: Schema change — requires SQL migration. Defer to dedicated schema cleanup phase.

### 2.3 Mixed-language identifiers

| Identifier | Language | Suggested | Change Type |
|------------|----------|-----------|-------------|
| `comision_declarada` (column) | Spanish | `commission_declared` | Schema migration |
| `piso_base`, `garantizado_base` (columns) | Spanish | `floor_price`, `guaranteed_base` | Schema migration |
| `reconfirmado_24hs` (status value) | Spanish | `reconfirmed_24h` | DB value change |
| `consulta`, `asignado_chofer`, `completado`, `cancelado` (status values) | Spanish | `inquiry`, `assigned_driver`, `completed`, `cancelled` | DB value change |
| `setComisionDeclarada` (function) | Spanish | `setCommissionDeclared` | Function rename |
| `Oportunity` (typo in comment) | English typo | `Opportunity` | Comment fix |

**Verdict**: Schema changes deferred. The function rename and typo fix are safe mechanical changes.

### 2.4 camelCase vs kebab-case filenames (6 files)

| File | Convention |
|------|-----------|
| `geoEngine.ts` | camelCase |
| `contextMemory.ts` | camelCase |
| `entityExtractor.ts` | camelCase |
| `extractSlots.ts` | camelCase |
| `regexExtractor.ts` | camelCase |
| `tripOutcomeTracker.ts` | camelCase |

**Verdict**: Rename to kebab-case. Update all importers. Safe mechanical change.

### 2.5 Cryptic function name

`getDbv()` → 144 references. The `v` suffix is meaningless. Rename to `getDb()` or `getClient()`.

**Verdict**: Mechanical renaming. Requires updating all 144 call sites plus the mock in 2 test files.

---

## 3. Export Surface

### 3.1 Dead exports in `database.ts` barrel (32 items)

These functions have ZERO external consumers and can be removed:

| Export | File | Notes |
|--------|------|-------|
| `listPendingDrivers` | database.ts | no caller |
| `approveDriver` | database.ts | no caller |
| `setDriverStatus` | database.ts | no caller |
| `registerDriver` | database.ts | no caller |
| `registerDriverByCode` | database.ts | no caller |
| `listDriverInvitations` | database.ts | no caller |
| `createDriverInvitation` | database.ts | no caller |
| `registerDriverFromInvitation` | database.ts | no caller |
| `revokeDriverInvitation` | database.ts | no caller |
| `setClientPreferredDriver` | database.ts | no caller |
| `setBackupDriver` | database.ts | no caller |
| `getSlotsByDayOfWeek` | database.ts | no caller |
| `getDiscountsForTariff` | database.ts | no caller |
| `getDriverDiscounts` | database.ts | no caller |
| `createDriverDiscount` | database.ts | no caller |
| `deleteDriverDiscount` | database.ts | no caller |
| `isMessageProcessed` | database.ts | no caller |
| `getProcessedMessage` | database.ts | no caller |
| `countProcessedMessages` | database.ts | no caller |
| `getPackagePrices` | database.ts | import broken (typo: should be getPackagePrice) |
| `clearPendingOpportunity` | domains/learning.ts | duplicate — live version is in database.ts |
| `updateTripDiscountExplicit` | database.ts (re-export) | no caller |
| `setTripPhase` | database.ts (re-export) | no caller |
| `closeTrip` | database.ts (re-export) | no caller |
| `updateTripScheduledAt` | database.ts (re-export) | no caller |
| `updateTripFlight` | database.ts (re-export) | no caller |
| `updateTripPassengers` | database.ts (re-export) | no caller |
| `updateTripOrigin` | database.ts (re-export) | no caller |
| `updateTripDestination` | database.ts (re-export) | no caller |
| `updateTripPriceBase` | database.ts (re-export) | no caller |
| `updateTripHotel` | database.ts (re-export) | no caller |
| `getTripsScheduledForDate` | database.ts (re-export) | no caller |
| `getUpcomingReservations` | database.ts (re-export) | no caller |
| `getTripByIdWithDiagnostics` | database.ts (re-export) | no caller |
| `getDbInstance` | core/connection.ts | no caller (after G.2.12) |
| `getConnectionValueFlag` | database.ts (re-export) | no external consumers |
| `setConnectionStateBatch` | database.ts (re-export) | no external consumers |
| `validateReaderConsistency` | database.ts (re-export) | internal to trips.ts only |
| `reportTripPhaseNullCount` | database.ts (re-export) | internal to trips.ts only |

**Total dead: ~38 exports**. Removing them would reduce `database.ts` re-export block by ~40 lines and eliminate 1 broken import (`getPackagePrices`).

### 3.2 Consumers bypassing the DB facade

| Bypass Type | Files | Count |
|-------------|-------|-------|
| Direct `getDbv().execute` in services | housekeeping.ts, timeouts.ts, conversation-workflow.ts, dispatch.service.ts, trip-execution.service.ts | 5 files, ~9 calls |
| Direct imports from `db/domains/learning` | dispatch.service.ts, trip-execution.service.ts, memory-and-extraction.ts | 3 bypasses |
| Direct imports from `db/core/helpers` (queryOne) | opportunity-engine.ts, location-resolver.ts, commercial-pricing-engine.ts, tariff-resolver.ts | 4 bypasses |

**Verdict**: All should be consolidated to go through `database.ts` facade for a clean data access layer.

---

## 4. Dependency Review

### 4.1 Circular dependency (1 confirmed)

```
database.ts (line 25) → import from ./domains/trips
domains/trips.ts (line 4) → import { getDriverDiscountForTariff } from ../database
```

**Fix**: Move `getDriverDiscountForTariff` into `domains/trips.ts` or a shared discounts module.

### 4.2 AI → Services reverse dependency (1 confirmed)

```
ai/response-builder.ts → imports OpportunityResult from services/opportunity-engine
```

**Fix**: Extract opportunity display types into a shared types file that both AI and services can import without coupling.

### 4.3 Infrastructure leakage

| Issue | Occurrences | Fix |
|-------|-------------|-----|
| `console.log/error` in business logic | 109 calls across 15+ files | Centralized logger |
| Direct `fetch()` in cron handler | 2 calls in timeouts.ts | Extract to `exchange-rate.ts` |
| Direct `AbortSignal.timeout()` | 2 calls (paired with fetch) | Extract with exchange-rate |
| `process.env` in connection.ts | 3 references | Route through `config/env.ts` |

### 4.4 Architectural observation: pipeline.ts comment contradicts reality

`core/pipeline.ts:54` says `Mode is hardcoded to "RESERVA" (AHORA is legacy/deprecated)`, but `policy-ahora.ts` exists, is functional, and NOW trips are the primary production flow. This comment is actively misleading.

---

## 5. Documentation

### 5.1 README issues
- **Stale path**: `database.ts:555` references `@/lib/utils/conversation-workflow` — should be `@/lib/services/workflow/conversation-workflow`
- **Missing directories**: `db/domains/`, `db/core/`, `ai/laterals/` not shown in tree
- **No mention of test infrastructure** (`tests/`, `vitest`)
- **No mention of architecture plans** (`.opencode/plans/`)
- **No mention of Phase architecture** (C4, D, frozen domains)

### 5.2 No formal ADR directory
5 key decisions need documentation:
1. Domain freeze strategy (Phase C4 vs D)
2. Extract + re-export vs full decomposition rationale
3. `AHORA` vs `RESERVA` resolution
4. `database.ts` partial extraction decision
5. `findTariff()` deprecation status

---

## 6. Final Stabilization Roadmap

### Tier 1 — Safe mechanical fixes (ready to execute, no behavior change)

| # | Task | Files | Effort | Impact |
|---|------|-------|--------|--------|
| 1a | Remove 38 dead exports from database.ts and connection.ts | database.ts, connection.ts, trips.ts, connection-state.ts | 10 min | Removed 33 dead exports (~222 lines); kept validateReaderConsistency + reportTripPhaseNullCount (have callers) |
| 1b | Remove duplicate `clearPendingOpportunity` from database.ts | database.ts | 1 min | Removed duplicate; fixed opportunity-response.ts import |
| 1c | Rename 6 camelCase files to kebab-case | 6 files + 11 importer files, 4 test files | 15 min | ✅ done |
| 1d | Fix stale README path (`@/lib/utils/` → describe utils, `contextMemory` → `context-memory`, `geoEngine` → `geo-engine`) | README.md | 2 min | ✅ done |
| 1e | Fix typo `Oportunity` → `Opportunity` in comment | opportunity-engine.ts | 1 min | ✅ done |
| 1f | Remove stale "Fase 3 v5.0", "Fase 4D", "v5.7" versioned comments | database.ts, trips.ts, pipeline.ts, core.ts | 10 min | ✅ done (7 comments updated) |
| 1g | Resolve pipeline.ts AHORA comment contradiction | pipeline.ts | 2 min | ✅ done |

### Tier 2 — Controlled refactors (behavior-preserving, needs review)

| # | Task | Files | Effort | Risk |
|---|------|-------|--------|------|
| 2a | Break circular dependency: move `getDriverDiscountForTariff` into domains/trips.ts | database.ts, domains/trips.ts | 5 min | ✅ done — made it a private function in trips.ts, removed from database.ts |
| 2b | Rename `getDbv()` → `getDb()` across 120 references | connection.ts + all callers + 2 test mocks | 30 min | ✅ done — mechanical `getDbv` → `getDb` across all 14 files |
| 2c | Rename `setComisionDeclarada` → `setCommissionDeclared` | database.ts, trips.ts, driver.service.ts | 5 min | ✅ done — 3 files, 4 refs |
| 2d | Add centralized logger, replace 160 console.* calls | src/lib/utils/logger.ts + 34 files | 60 min | ✅ done — `log.debug/info/warn/error` with LOG_LEVEL env control |
| 2e | Move `OpportunityContext`, `Opportunity`, `OpportunityType` from db/types.ts to service types | src/lib/services/opportunity-types.ts + db/types.ts + 5 files | 10 min | ✅ done — created opportunity-types.ts, removed duplicate in opportunity-engine.ts |
| 2f | Fix AI → Services reverse dependency (extract opportunity display types) | ai/response-builder.ts, opportunity-engine.ts, opportunity-types.ts | 15 min | ✅ done — moved `OpportunityOffer` + `OpportunityResult` to shared types, removed re-export, no AI→services value imports remain |

### Tier 3 — Structural reorganization (needs planning)

| # | Task | Effort | Risk |
|---|------|--------|------|
| 3a | Restructure `services/` flat directory: move 22 files into subdirs | 22 flat files → admin/ (2), geo/ (2), memory/ (3), extraction/ (5), pricing/ (3), dispatch/ (2), learning/ (3), workflow/ (1), trip-execution/ (1) | 60 min | ✅ done — lead.service.ts, housekeeping.ts stay flat; 2 post-move fixes (import type + relative path) |
| 3b | Consolidate `services/learning/` over-split files (merge 22 → ~12 files) | 30 min | Medium — update internal imports |
| 3c | Merge `housekeeping.ts` into `housekeeping/timeouts.ts` | 15 min | Low — merge logic |
| 3d | Eliminate 5 service file direct `getDbv().execute` calls (create wrappers in database.ts) | 30 min | Low — per G.2.12 pattern |
| 3e | Eliminate direct `db/domains/learning` imports from 3 service files (re-export through database.ts) | 15 min | Low — re-export pattern |
| 3f | Break up `database.ts` (extract 9+ remaining domain sections into individual domain files) | 2 hours | Low — established pattern from G.2 |
| 3g | Rename 9 DB tables with `f4_`/`f9_` prefixes (requires SQL migration) | Deferred | Schema change |
| 3h | Remove legacy `geoEngine.ts` once all 3 remaining callers migrate to `location-resolver.ts` | Deferred | Depends on migration |
| 3i | Draw down `findTariff()` deprecation — migrate 3 remaining callers to `tariff-resolver.resolveTariff()` | 20 min | Low — planned change |

### Tier 4 — Documentation

| # | Task | Effort |
|---|------|--------|
| 4a | Update README with missing directories and test infrastructure | 15 min |
| 4b | Create ADR directory with 5 key decisions | 30 min |
| 4c | Remove stale ARCHITECTURE NOTE phase markers (10 files) | 10 min |

---

## 7. Recommended Execution Order

Immediate (Tier 1 — <30 min total):
1. ✅ Dead export removal (1a, 1b)
2. ✅ camelCase → kebab-case (1c)
3. ✅ README fix + typo fix + comment cleanup (1d, 1e, 1f, 1g)
4. Run `npm test` + `npx tsc --noEmit` to validate

Short-term (Tier 2 — <2h total):
5. Break circular dependency (2a)
6. `getDbv` → `getDb` rename (2b)
7. Type cleanup (2e, 2f)
8. `setComisionDeclarada` → `setCommissionDeclared` (2c)
9. Centralized logger (2d)
10. Validate with tests + tsc

Medium-term (Tier 3 — <4h total):
11. Eliminate direct `getDbv()` calls and domain bypasses (3d, 3e)
12. Consolidate learning/ files (3b)
13. Restructure services/ flat directory (3a)
14. Break up database.ts (3f)
15. Validate with tests + tsc

Deferred (Tier 3-4):
16. Schema renames (3g)
17. geoEngine.ts removal (3h)
18. findTariff() migration (3i)
19. ADR documentation (4b)
20. Phase marker removal (4c)

---

## 8. Validation Gate

After each of the above steps:
- `npm test` — 195 tests must pass
- `npx tsc --noEmit` — zero new errors (3 pre-existing tolerated)
- No runtime behavior changes
