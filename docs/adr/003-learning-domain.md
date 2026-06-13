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
  learning-pipeline.service.ts  — Single entry point (facade) for the domain
  policy-engine.ts              — Policy conditions, actions, guardrails, experiments
  opportunity-engine.ts         — Opportunity evaluation, ranking, pricing
  adaptation.ts                 — Drift detection, event logging, adaptation orchestration
  fare-learning-engine.ts       — Fare observation and learning from trip outcomes
  learning-utils.ts             — Weight management, shared helpers
  routing.ts                    — Opportunity ranking with load adjustment
  objectives.ts                 — Objective weight loading and scoring
  system-load.ts                — System load metrics
  economics.ts                  — Economic profile scoring
  event-tracking.ts             — Event logging to DB
  admin.ts                      — Admin commands for learning system
  types.ts                      — Shared type definitions
  opportunity-types.ts          — Opportunity type definitions
```

### Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `learning-pipeline.service.ts` | Single entry point. Orchestrates: weights → load → ranking → policy engine → adaptation |
| `policy-engine.ts` | Policy loading/evaluation, simulation, experiment variant assignment, guardrails |
| `adaptation.ts` | Drift detection (prediction, conversion, entity, policy), event logging, meta-governance |
| `opportunity-engine.ts` | Opportunity scoring, pricing extraction, completeness checking |

### Boundaries

- Learning MUST NOT import from Housekeeping (resolved in H.4.1 by extracting shared logger)
- Learning imports DB exclusively through `db/domains/learning` (gap: not yet through `database.ts` facade)
- Learning is NOT a presentation layer — no WhatsApp message sending
- `learning-pipeline.service.ts` is the ONLY entry point for consumers outside the domain

## Consequences

### Positive
- Single entry point simplifies consumers (they import one file)
- 25 → 14 files, cleaner separation of concerns
- Drift detection and adaptation are cleanly separated from policy evaluation

### Negative
- 103 dead exports remain (side effect of consolidation)
- Some files still large: `policy-engine.ts` (316L), `opportunity-engine.ts` (257L)
- Learning domain still bypasses `database.ts` facade (imports `db/domains/learning` directly)
