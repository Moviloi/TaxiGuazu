# G.3 — Dynamic SQL / Persistence Safety Audit

## Goal
Normalize the 6 remaining dynamic SQL constructions and eliminate duplicated raw query wrappers across service files. No behavior changes.

## Audit Summary

| Metric | Value |
|---|---|
| Total SQL occurrences | 237 |
| SAFE (static, parameterized) | 231 (97.5%) |
| LOW risk | 1 (0.4%) |
| MEDIUM risk | 5 (2.1%) |
| HIGH/CRITICAL | 0 |
| Injection vectors | 0 |

The codebase is in good shape — 97.5% of SQL is static and fully parameterized. The 6 items below are the only anomalies.

---

## Findings Table

| # | File | Line | Pattern | SQL | Risk | Current |
|---|---|---|---|---|---|---|
| F1 | database.ts | 390 | dynamic SET | `UPDATE drivers SET ${sets.join(", ")} WHERE phone = ?` | MEDIUM | Column names built from controlled `if` mapping (name, car_type, ...), values always `?` args |
| F2 | database.ts | 414-416 | dynamic WHERE | `WHERE ${conditions.join(" AND ")}` | MEDIUM | Conditions from controlled `if` blocks (status, capacity, country), args always `?` |
| F3 | housekeeping.ts | 22 | dynamic table/col | `DELETE FROM ${name} WHERE ${dateColumn} < ?` | MEDIUM | name/dateColumn from hardcoded TABLE constant array |
| F4 | tariff-resolver.ts | 58 | dynamic WHERE | `WHERE ${conditions.join(" AND ")} LIMIT 1` | MEDIUM | Conditions from controlled `if` blocks (place_id, zone_id, active), args always `?` |
| F5 | database.ts | 839-841 | template key | `customer_name_${phone}` in INSERT key | LOW | phone is function parameter, key is VARCHAR (not SQL), no injection vector |
| F6 | opportunity-engine.ts | 10-12 | duplicated wrapper | own `queryOne<T>` calling `getDbv().execute` | LOW | Duplicates `helpers.ts:queryOne`; same pattern in tariff-resolver, commercial-pricing-engine, location-resolver (4 files) |

---

## Risk Classification & Strategy

### Tier 1 — Safe Mechanical Fixes (no refactoring, no behavior change)

**G.3.1 — Replace local `queryOne` wrappers with shared `helpers.ts:queryOne`**
4 files define their own `queryOne<T>` that just delegates to `getDbv().execute({sql, args})`. Import from `@/lib/db/core/helpers` instead.
- `src/lib/services/opportunity-engine.ts:10`
- `src/lib/services/tariff-resolver.ts:15`
- `src/lib/services/commercial-pricing-engine.ts:14`
- `src/lib/services/location-resolver.ts:19`

**G.3.2 — Replace `getDbv().execute` calls with `query`/`queryOne` where possible**
Several raw `getDbv().execute({sql, args})` calls in `database.ts`, `domains/`, and service files could use `query<T>` or `queryOne<T>` from `helpers.ts`. These are simple SELECT queries where the return type is immediately cast. Mechanical substitution — same SQL, same args, different caller.

**G.3.3 — Remove duplicate `housekeeping_log` INSERT**
`INSERT INTO housekeeping_log (job, rows_deleted, duration_ms) VALUES (?, ?, ?)` appears 3 times (housekeeping.ts:30, :38, learning.ts:232). Consolidate into one wrapper function.

### Tier 2 — Controlled Dynamic SQL (medium risk, refactoring required)

**G.3.4 — Refactor `updateDriverByCode` (F1, database.ts:374-392)**
Replace `UPDATE drivers SET ${sets.join(", ")}` with a dedicated multi-column update that passes all possible columns and lets each update decide:
- Option A: Individual `UPDATE drivers SET name = COALESCE(?, name), car_type = COALESCE(?, car_type), ... WHERE phone = ?` — one statement, nulls for unchanged cols
- Option B: Static `UPDATE drivers SET name = ?, car_type = ?, ... WHERE phone = ?` — caller passes full set
- Option C: Keep the dynamic SET but extract to a domain function in `domains/drivers.ts` with safety validation (whitelist the column names)

Recommended: Option A (single COALESCE UPDATE, 1 query, no dynamic SQL, no injection vector).

**G.3.5 — Refactor `getAvailableDrivers` (F2, database.ts:396-417)**
Replace `WHERE ${conditions.join(" AND ")}` with static SQL that uses `OR IS NULL` or COALESCE logic:
```sql
WHERE d.status = 'active'
  AND c.last_message_at > ?
  AND (? IS NULL OR d.car_capacity >= ?)
  AND (? IS NULL OR d.country = ? OR d.country IS NULL)
```
Pass the filter values as nullable params. Single static query, no dynamic WHERE.

**G.3.6 — Refactor `findTariffRow` (F4, tariff-resolver.ts:20-61)**
Replace `WHERE ${conditions.join(" AND ")} LIMIT 1` with static SQL using NULL-coalescing:
```sql
WHERE active = 1
  AND (? IS NULL OR origin_place_id = ?)
  AND (? IS NULL OR destination_place_id = ?)
  AND (? IS NULL OR origin_zone_id = ?)
  AND (? IS NULL OR destination_zone_id = ?)
LIMIT 1
```
Pass 8 params (4 field-value pairs). Single static query, no dynamic WHERE. Guarantees identical behavior because current if-blocks only add `=` predicates.

**G.3.7 — Refactor `runHousekeeping` (F3, housekeeping.ts:14-43)**
Replace `DELETE FROM ${name} WHERE ${dateColumn} < ?` by unrolling the TABLES loop into individual static DELETE statements:
```ts
const cutoff = Math.floor(Date.now() / 1000) - 30 * 86400;
await cleanTable("system_metrics", "recorded_at", cutoff, db);
await cleanTable("simulations", "timestamp", cutoff, db);
await cleanTable("f9_events", "timestamp", cutoff, db);
// ...
```
Where `cleanTable` still takes string params but only from controlled call sites. Alternatively, inline each DELETE for maximum static safety.

**G.3.8 — Fix `getCustomerName` key interpolation (F5, database.ts:837-843)**
Current: `SELECT value FROM connection_state WHERE key = ?` with `args: [\`customer_name_${phone}\`]`. This is SAFE in practice (key is a VARCHAR field, not SQL syntax) but the pattern is inconsistent with how `connection-state.ts` uses `setConnectionValue`. Fix: call `getConnectionValue(\`customer_name_\${phone}\`)` from `connection-state.ts` instead of raw SQL.

### Tier 3 — Deferred (cosmetic / low priority)

**G.3.9 — Deduplicate pricing queries**
`opportunity-engine.ts` and `commercial-pricing-engine.ts` both query the same `promotions`, `provider_adjustments`, and `packages` tables with nearly identical WHERE clauses. Extract to shared wrappers in a new `domains/pricing.ts` or existing domain file. Deferred because G.1/G.2 already established the re-export pattern and these would benefit from a dedicated pricing domain extraction (future phase).

**G.3.10 — Deduplicate trip-count validation queries**
`SELECT COUNT(*) as cnt FROM trips WHERE ...` appears 6 times with minor variations (legacy vs phase semantics). Could consolidate into one `countTripsByClient(clientPhone, usePhaseLogic?)` function. Low priority — no risk, just redundancy.

---

## Implementation Order

1. **G.3.1** — Replace local queryOne wrappers (4 files, mechanical, 5min)
2. **G.3.2** — Replace getDbv().execute with query/queryOne (mechanical, 5min)
3. **G.3.3** — Deduplicate housekeeping_log INSERT (mechanical, 2min)
4. **G.3.5** — Refactor getAvailableDrivers (controlled WHERE → static COALESCE, 10min)
5. **G.3.6** — Refactor findTariffRow (controlled WHERE → static COALESCE, 10min)
6. **G.3.4** — Refactor updateDriverByCode (dynamic SET → static COALESCE, 10min)
7. **G.3.7** — Refactor runHousekeeping (dynamic table → unrolled static, 10min)
8. **G.3.8** — Fix getCustomerName (use getConnectionValue, 2min)

---

## Validation
After each step:
- `npm test` — 195 tests must still pass
- `npx tsc --noEmit` — zero new errors
- Verify query results are identical (same SQL where static, same args)

## Risk
- F1-F4 are controlled dynamic SQL with no user input path. Code review confirms no injection vector exists. The refactor is for hygiene, not security.
- G.3.4 (updateDriverByCode): COALESCE refactor changes behavior if column was previously NULL and update wanted to keep it NULL. Must use ISNULL-compatible logic.
- G.3.5 (getAvailableDrivers): COALESCE(?, column) passes `null` when filter not provided; must verify `? IS NULL OR column >= ?` pattern is logically equivalent.
- All refactors preserve column names, table names, and parameter bindings — no query result changes.
