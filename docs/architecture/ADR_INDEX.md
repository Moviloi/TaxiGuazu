# Architecture Decision Index — AITOS

> Navigable index of all Architecture Decision Records.
> This file groups decisions by domain and links them to related documentation.
> For the full text of each decision, see `docs/adr/`.
> **Authority:** The AITOS Constitution (`docs/architecture/AITOS_CONSTITUTION.md`) is the supreme normative authority. ADRs are subordinate to the Constitution.

---

## How to use this index

| If you want to understand... | Start here |
|----------------------------|------------|
| Overall structure and layering | [Core](#core) |
| How the system talks to users | [Conversation](#conversation) |
| **Who decides what** | [Decision Ownership Matrix](DECISION_OWNERSHIP_MATRIX.md) |
| How knowledge is organized | [Knowledge](#knowledge) |
| How places are resolved | [Geo](#geo) |
| How prices are calculated | [Pricing](#pricing) |
| How drivers are assigned | [Dispatch](#dispatch) |
| How data is stored and accessed | [Persistence](#persistence) |
| How the system improves | [Learning](#learning) |
| How the system is deployed and validated | [Infrastructure](#infrastructure) |

---

## Core

Decisions that define the fundamental shape of the system.

| ADR | Decision | Status | Impact | Related docs |
|-----|----------|--------|--------|--------------|
| [ADR 001: Layered Architecture](../adr/001-layered-architecture.md) | Strict layered dependency direction | Accepted | Defines how all code is organized and what can import what | `design-principles.md`, `engines.md`, `bounded-contexts.md` |
| [ADR 005: AI-First Interpretation](../adr/005-ai-first-interpretation.md) | Heuristic patches forbidden for context-sensitive interpretation; use LLM with raw data | Accepted | Shapes ambiguity resolution, recovery messages, and geo queries | `operational-model.md`, `decision-architecture.md`, `knowledge-map.md` |

---

## Conversation

Decisions that govern dialogue flow and language handling.

| ADR | Decision | Status | Impact | Related docs |
|-----|----------|--------|--------|--------------|
| ADR 001 | Layered architecture (conversation lives in Services/AI layers) | Accepted | Determines where state machines, policies, and responses belong | `operational-model.md`, `decision-architecture.md` |
| ADR 005 | AI-first interpretation for ambiguous user input | Accepted | Recovery messages and ambiguity resolution use LLM instead of hardcoded rankings | `decision-architecture.md`, `fractal-architecture.md` |
| [ADR 007: Conversation Interpreter](../adr/007-conversation-interpreter.md) | Nueva etapa del pipeline entre CORE y Extraction para clasificar rol conversacional | Accepted | Previene bug B3 y su familia. Separa interpretación de la conversación de las decisiones del sistema. | `decision-architecture.md`, `strategy-decision.md` |
| [ADR 008: Conversational Decision Architecture](../adr/008-conversational-decision-architecture.md) | `computeStrategyDecision()` es la única fuente de verdad para decisiones estratégicas; Architecture Freeze | Accepted | Cierra la Serie R. Policies ya no reinterpretan señales. LLM expresa, no decide. Ownership único por concern. | `decision-architecture.md`, `strategy-decision.md`, `ARCHITECTURE_MILESTONE_v2.0.md` |

---

## Knowledge

Decisions about how business and operational knowledge is stored.

| ADR | Decision | Status | Impact | Related docs |
|-----|----------|--------|--------|--------------|
| ADR 003: Learning Domain Architecture | Learning is a first-class domain with its own boundary rules | Accepted | Establishes learning as a peer domain, not an afterthought | `knowledge-map.md`, `maturity-model.md`, `engines.md` |
| ADR 005 | AI-first interpretation over heuristic data patches | Accepted | Knowledge extraction uses raw data + LLM rather than priority maps | `knowledge-map.md`, `design-principles.md` |

---

## Geo

Decisions about place and zone resolution.

| ADR | Decision | Status | Impact | Related docs |
|-----|----------|--------|--------|--------------|
| ADR 005 | No heuristic ORDER BY or priority maps in geo queries | Accepted | `searchPlaces()` returns raw candidates; LLM interprets context | `domains/geo.md`, `operational-model.md` |

---

## Pricing

Decisions about tariffs, commercial rules, and price calculation.

| ADR | Decision | Status | Impact | Related docs |
|-----|----------|--------|--------|--------------|
| ADR 001 | Layered architecture keeps pricing in Services layer | Accepted | Pricing engine depends on Geo and DB, not on AI or Routes | `domains/pricing.md`, `engines.md` |

---

## Dispatch

Decisions about driver assignment and escalation.

| ADR | Decision | Status | Impact | Related docs |
|-----|----------|--------|--------|--------------|
| ADR 001 | Layered architecture places dispatch above trip-execution | Accepted | Dispatch depends on Trip Execution and Fleet, not on Conversation | `domains/dispatch.md`, `engines.md` |
| ADR 004 | Service boundaries enforce dependency order | Accepted | Dispatch cannot be imported by lower layers | `engines.md`, `system-map.md` |

---

## Persistence

Decisions about data storage, access patterns, and schema.

| ADR | Decision | Status | Impact | Related docs |
|-----|----------|--------|--------|--------------|
| [ADR 002: Database Facade Pattern](../adr/002-database-facade.md) | All services access the DB through `database.ts` | Accepted (with gaps) | Defines the single entry point for persistence; learning still bypasses facade | `design-principles.md`, `engines.md`, `system-map.md` |
| [ADR 006: Schema Parity](../adr/006-schema-parity.md) | `initSchema()` must reflect the real production database | Extended | New environments start with complete schema; migration runner introduced | `domains/session.md`, `metrics.md`, `GOVERNANCE.md` |

---

## Learning

Decisions about events, opportunities, and fare adjustment.

| ADR | Decision | Status | Impact | Related docs |
|-----|----------|--------|--------|--------------|
| [ADR 003: Learning Domain Architecture](../adr/003-learning-domain.md) | Learning is a first-class bounded context | Accepted | Creates dedicated learning modules; facade and 8 planned modules not yet implemented | `knowledge-map.md`, `maturity-model.md`, `capability-map.md` |

---

## Infrastructure

Decisions about deployment, validation, and tooling.

| ADR | Decision | Status | Impact | Related docs |
|-----|----------|--------|--------|--------------|
| ADR 001 | Layered architecture separates Config, DB, AI, Services, Lead, Routes | Accepted | Determines file layout and import rules | `architecture.md`, `design-principles.md` |
| [ADR 004: Service Boundary Rules](../adr/004-service-boundaries.md) | Strict dependency order and no circular dependencies | Accepted (with gaps) | Guides refactoring and new domain creation | `bounded-contexts.md`, `engines.md`, `fractal-architecture.md` |
| ADR 006 | Schema parity enforced by `validate-schema-parity` | Extended | All schema changes must be versioned and verified | `GOVERNANCE.md`, `metrics.md` |

---

## Cognitive Architecture

Decisions that define the cognitive pipeline (Evidence Engine).

| ADR | Decision | Status | Impact | Related docs |
|-----|----------|--------|--------|--------------|
| [ADR 009: Evidence Engine Architecture](../adr/009-evidence-engine-architecture.md) | 7-layer cognitive pipeline frozen. Signal→Observation→Fact→Evidence→Knowledge→Belief→Decision. Base for Memory→Reflection→Learning→Goals→Planning. | Accepted | Freezes `src/lib/evidence/`. Any future cognitive layer requires new ADR. Anticipatory fields justified as architectural contract. | `EVIDENCE_ONTOLOGY.md`, `ENGINES.md`, `knowledge-map.md`, `system-map.md` |
| [ADR 012: Cognitive Escalation Principle](../adr/012-cognitive-escalation-principle.md) | Stack 3 niveles: BKE → DRL → LLM. Prioridad del conocimiento explícito sobre la generación. El conocimiento y las reglas determinísticas tienen prioridad sobre los modelos generativos. | Accepted | Modifica parcialmente ADR-005. Define el modelo oficial de inteligencia. Formaliza el presupuesto cognitivo como métrica arquitectónica. | `CE-1_COGNITIVE_EFFICIENCY_AUDIT.md`, `CE-2_INEVITABILITY_CLASSIFICATION.md`, `CE-3A_BUSINESS_KNOWLEDGE_ENGINE.md`, `CE-3B_DETERMINISTIC_REASONING_LAYER.md`, `CE-4_MIGRATION_ROADMAP.md` |
| [ADR 013: Conversation Decision Algorithm Ratification](../adr/013-conversation-decision-algorithm.md) | Ratifica el Conversation Decision Algorithm como autoridad funcional normativa del comportamiento conversacional. Jerarquía: Implementation → CDA → Specification → ADR. Complementa Architecture Freeze V3 con autoridad funcional. | Accepted | Crea la primera autoridad funcional algorítmica. Resuelve ambigüedades A01-DG, A02-DG. Establece 15 invariantes verificables (I-01 a I-15). Sirve como criterio de aceptación para bugs conversacionales. | `CONVERSATION_DECISION_ALGORITHM.md`, `FUNCTIONAL_BEHAVIOR_SPECIFICATION.md`, ADR-007, ADR-008, ADR-012 |
| [ADR 014: Experimental Layers Hygiene](../adr/014-experimental-layers-hygiene.md) | Higiene de capas experimentales: mantiene Evidence Engine (shadow), elimina Pattern Discovery, BKE, DRL; protege hard-reset con flag. | Accepted | Reduce ~23% de archivos en src/, elimina 5,800 líneas de código muerto. Preserva ADR-009 y ADR-012 como diseño conceptual. | `AUDIT_REPORT_COMPLETE.md`, ADR-009, ADR-012, `TECHNICAL_DEBT_BASELINE.md` |

---

## Decision status legend

| Status | Meaning |
|--------|---------|
| Accepted | Decision is active and guides the architecture |
| Extended | Decision was expanded after new findings |
| Partial | Decision accepted but adoption has known gaps |
| Superseded | Replaced by a newer ADR (none currently) |

---

## Gaps and known violations

| ADR | Gap | Where it appears |
|-----|-----|------------------|
| ADR 002 | Learning domain imports directly from `db/domains/learning` | `services/learning/*.ts` |
| ADR 004 | `ai/response-builder.ts` imports `OpportunityResult` from learning | `src/lib/ai/response-builder.ts` |
| ADR 004 | Several service files exceed 300 lines | `lead.service.ts`, `policy-pipeline.ts`, `opportunity-engine.ts` |

These gaps are tracked in `ael/artifacts/BACKLOG.md`.

---

## Related documents

- [`../adr/`](../adr/) — authoritative source text of each decision
- [`design-principles.md`](./design-principles.md) — principles derived from ADRs
- [`engines.md`](./engines.md) — how ADRs shape engine boundaries
- [`bounded-contexts.md`](./bounded-contexts.md) — contexts that ADRs define
- [`GOVERNANCE.md`](./GOVERNANCE.md) — how to add or update ADRs
- [`ael/artifacts/BACKLOG.md`](../../ael/artifacts/BACKLOG.md) — gaps and planned remediation

---

*Last updated: 2026-07-20 (ADR-014 added)*
*Authority: `docs/adr/`*
