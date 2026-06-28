# ADR 003: Learning Domain Architecture

**Status:** Accepted  
**Date:** 2026-06-13  
**Driver:** Architecture normalization (G.4 Tier 3b consolidation)

## Context

The learning domain had 25 files with overlapping responsibilities (policies, experiments, decision logs, drift detection, system metrics, fare learning). The consolidation merged files by logical affinity, not by prefix, to eliminate circular dependencies and reduce surface area.

## Decision

### Structure

```
services/learning/
  opportunity-engine.ts         — Opportunity evaluation, ranking, pricing
  fare-learning-engine.ts       — Fare observation and learning from trip outcomes
  learning-utils.ts             — Weight management, shared helpers
  event-tracking.ts             — Event logging to DB
  admin.ts                      — Admin commands for learning system
  opportunity-types.ts          — Opportunity type definitions
  (No implementados) learning-pipeline.service.ts, policy-engine.ts, adaptation.ts, routing.ts, objectives.ts, system-load.ts, economics.ts, types.ts
```

### Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `opportunity-engine.ts` | Opportunity scoring, pricing extraction, completeness checking |
| _(No implementados)_ | `learning-pipeline.service.ts` (facade), `policy-engine.ts` (policies/experiments), `adaptation.ts` (drift detection) |

### Boundaries

- Learning MUST NOT import from Housekeeping (resolved in H.4.1 by extracting shared logger)
- Learning imports DB exclusively through `db/domains/learning` (gap: not yet through `database.ts` facade)
- Learning is NOT a presentation layer — no WhatsApp message sending
- **No dedicated facade yet** — consumers import directly from individual modules

## Consequences

### Positive
- Cleaner organization with focused modules
- 25 → 6 actual files, reduced surface area

### Negative
- No dedicated facade — consumers import directly from individual modules
- Some files still large: `opportunity-engine.ts` (257L)
- Learning domain still bypasses `database.ts` facade (imports `db/domains/learning` directly)
- 8 planned modules not yet implemented: pipeline facade, policy engine, adaptation, routing, objectives, system load, economics, shared types
