# ADR 001: Layered Architecture

**Status:** Accepted  
**Date:** 2026-06-13  
**Driver:** Architecture normalization (G.4)

## Context

The codebase evolved organically, mixing concerns across layers. AI logic, business rules, persistence, and WhatsApp message formatting were interleaved, making the system hard to reason about and evolve.

## Decision

Adopt a strict layered architecture with the following layers, each with a clear dependency direction (higher layers may import lower layers; lower layers must NOT import higher layers):

```
Config → Auth → Utils
   ↓
DB (core → types → domains → facade)
   ↓
WhatsApp · AI
   ↓
Services (i18n → Geo → Memory → Pricing → Learning → Extraction → Workflow → Dispatch → Trip-execution → Admin → Housekeeping)
   ↓
Lead (orchestrator)
   ↓
API routes
```

### Layer responsibilities

| Layer | Responsibility |
|-------|---------------|
| **Config** | Environment variables, constants, static configuration |
| **Utils** | Pure utility functions (clamp, logger) with no project dependencies |
| **DB core** | Connection management, raw query helpers |
| **DB types** | Row type definitions for database tables |
| **DB domains** | Domain-specific database queries (trips, learning, connection-state) |
| **DB facade** | `database.ts` — unified data access API, re-exports from domains |
| **WhatsApp** | WhatsApp API client wrapper (sender, message formatting) |
| **AI** | LLM interaction, intent classification, response building, policies |
| **Services** | Business logic domains — each with single responsibility |
| **Lead** | Top-level orchestration, wires all services together |
| **API routes** | HTTP handlers — thin, no business logic |

## Consequences

### Positive
- Clear dependency direction enables reasoning about change impact
- Domains can be developed and tested independently
- New developers can understand the system architecture from layer map

### Negative
- Cross-cutting concerns (logging, events) must go through neutral shared layer
- Some domains (extraction, workflow) still mix concerns and need further refactoring
- Strict layering adds indirection cost (facade pattern)
