# ADR 002: Database Facade Pattern

**Status:** Accepted  
**Date:** 2026-06-13  
**Driver:** Architecture normalization (G.4)

## Context

Services were importing directly from `db/core` (`getDb()`, `queryOne()`) and `db/types`, and raw SQL was scattered across service files. This created tight coupling to the database implementation and made it impossible to change the DB layer without touching every service.

## Decision

Introduce a three-tier database architecture:

```
db/core/connection.ts      — getDb(), ensureSchema(), DbExecutor type
db/core/helpers.ts          — query(), queryOne(), levenshtein()
db/types.ts                 — Row type definitions
db/domains/                 — Domain-specific query modules
  connection-state.ts       — Connection state CRUD
  trips.ts                  — Trip CRUD
  learning.ts               — Learning table queries (F9, F4, etc.)
db/database.ts              — Facade: 90+ exported functions
```

### Rules

1. **Services MUST import from `database.ts` only** — not from `db/core/` or `db/domains/` directly
2. **`database.ts` MAY re-export from `db/domains/`** — providing a single import surface
3. **Raw SQL MUST live in `db/domains/` or `database.ts`** — not in service files
4. **`getDb()` calls must NOT appear in service files** — all DB access through facade functions
5. **`db/domains/` modules may import from `db/core/` and `db/types`** — and from `utils/logger` only

### Current state

- **connection-state** and **trips** domains are properly re-exported through `database.ts` (22 facade functions)
- **learning** domain is NOT re-exported — services import directly from `db/domains/learning` (14 files). This is a known gap.
- 4 service files still use `getDb()` or `queryOne()` directly from `db/core/`

## Consequences

### Positive
- Single import surface for data access simplifies service code
- DB implementation can change without affecting services
- Query logic is co-located with type definitions

### Negative
- Incomplete adoption — learning domain and 4 service files bypass the facade
- `database.ts` at 809 lines is large; may need future splitting
- 25 `as any` casts remain in db/ layer due to untyped SQL results
