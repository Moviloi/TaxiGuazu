# ADR 004: Service Boundary Rules

**Status:** Accepted  
**Date:** 2026-06-13  
**Driver:** Architecture normalization (G.4, H.3 audit)

## Context

The service layer had reverse dependencies (lower layer importing higher layer), circular dependencies (Learning ↔ Housekeeping), and concerns mixed within domains (business logic + WhatsApp message formatting + DB access).

## Decision

### Dependency rules (strict order)

```
i18n  (leaf — no service imports)
  ↓
Geo
  ↓
Memory / Pricing
  ↓
Learning
  ↓
Extraction
  ↓
Workflow
  ↓
Dispatch
  ↓
Trip-execution
  ↓
Admin / Housekeeping
  ↓
Lead (top-level orchestrator)
```

1. **No circular dependencies** — if A needs B and B needs something from A, extract the shared concern to `services/shared/`
2. **No reverse dependencies** — a lower layer (Geo) must not import from a higher layer (Workflow)
3. **Shared code** goes in `services/shared/` — e.g., error-logger, types used across domains
4. **Domains may only import from**:
   - Their own files (relative imports)
   - Lower-layer domains (per dependency order above)
   - `services/shared/` (neutral shared code)
   - Config, Utils, DB facade, WhatsApp, AI (as appropriate per domain role)
5. **AI must not import from Services** — even type-only imports are a violation (known gap: `response-builder.ts` imports `OpportunityResult` from learning)

### Boundary rules per concern

| Concern | Where it belongs |
|---------|-----------------|
| **Business logic** | In the responsible domain (e.g., dispatch logic in dispatch/) |
| **WhatsApp message formatting** | Should be extracted from business logic into message builder modules |
| **DB queries** | In `db/domains/` or `database.ts` — NOT in services |
| **Logging** | Through `utils/logger.ts` or `services/shared/error-logger.ts` |
| **Error handling** | Catch at domain boundary; log through shared error logger |

### File size guidelines

- **< 200 lines** — ideal
- **200–400 lines** — acceptable for complex domains
- **> 400 lines** — consider splitting
- **Functions > 100 lines** — should be decomposed

## Consequences

### Positive
- Clear contract for developers adding new domains or importing across boundaries
- Circular dependency elimination (H.4.1) proved the shared-layer extraction pattern works
- New developers can determine import validity by checking dependency order

### Negative
- Some domains (Extraction, Dispatch, Workflow) still violate boundary rules (god files, mixed concerns)
- 11 files > 300 lines remain — further decomposition is planned but deferred
- The `services/shared/` directory is new — it will grow as more shared concerns are extracted
- No automated enforcement of dependency rules (no linting rule yet)
