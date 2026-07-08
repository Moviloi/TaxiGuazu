# Architecture Atlas — AITOS

> A visual index to all architecture diagrams and conceptual documents.
> Use this file to navigate the documentation by topic rather than by filename.

---

## System-level views

| View | Diagram / Document | What it shows |
|------|--------------------|---------------|
| Mission and boundaries | [`../SYSTEM_BIBLE.md`](../SYSTEM_BIBLE.md) | What AITOS is and is not |
| High-level pipeline | [`architecture.md`](./architecture.md) | Core pipeline and layers |
| End-to-end flow | [`system-overview.md`](./system-overview.md) | Conversation → Operational Model → Execution → Learning |
| Main system diagram | [`diagrams/00-main-system-diagram.mmd`](./diagrams/00-main-system-diagram.mmd) | All layers and engines in one diagram |
| Operational model | [`operational-model.md`](./operational-model.md) | Slots, states, persistence |
| Decision architecture | [`decision-architecture.md`](./decision-architecture.md) | How the system decides |
| Knowledge map | [`knowledge-map.md`](./knowledge-map.md) | Where knowledge lives |
| Capability map | [`capability-map.md`](./capability-map.md) | What the system can do |
| Maturity model | [`maturity-model.md`](./maturity-model.md) | Maturity levels and priorities |

---

## Runtime diagrams

| Topic | Diagram | What it shows |
|-------|---------|---------------|
| System overview | [`diagrams/01-system-overview.md`](./diagrams/01-system-overview.md) | User → webhook → lead → response |
| Webhook entry | [`diagrams/02-webhook-entry.md`](./diagrams/02-webhook-entry.md) | HMAC, rate limit, idempotency |
| CORE phase | [`diagrams/03-core-phase.md`](./diagrams/03-core-phase.md) | Intent classification + facts |
| Router phase | [`diagrams/04-router-phase.md`](./diagrams/04-router-phase.md) | CoreDecision → OutputType |
| Extraction phase | [`diagrams/05-extraction-phase.md`](./diagrams/05-extraction-phase.md) | Text → slots |
| Confidence model | [`diagrams/06-confidence-model.md`](./diagrams/06-confidence-model.md) | Slot status lifecycle |
| Policy AHORA | [`diagrams/07-policy-ahora.md`](./diagrams/07-policy-ahora.md) | Immediate dispatch policy |
| Policy RESERVA | [`diagrams/08-policy-reserva.md`](./diagrams/08-policy-reserva.md) | Future reservation policy |
| Location resolution | [`diagrams/09-location-resolution.md`](./diagrams/09-location-resolution.md) | Place resolution pipeline |
| Tariff resolution | [`diagrams/10-tariff-resolution.md`](./diagrams/10-tariff-resolution.md) | Pricing specificity cascade |
| Operational readiness | [`diagrams/11-operational-readiness.md`](./diagrams/11-operational-readiness.md) | What blocks a quote |
| Workflow state machine | [`diagrams/12-workflow-state-machine.md`](./diagrams/12-workflow-state-machine.md) | Conversational states |
| Slot confidence evolution | [`diagrams/13-slot-confidence-evolution.md`](./diagrams/13-slot-confidence-evolution.md) | How slots mature |
| Dispatch flow | [`diagrams/14-dispatch-flow.md`](./diagrams/14-dispatch-flow.md) | 4-level driver escalation |
| Data flow | [`diagrams/15-data-flow.md`](./diagrams/15-data-flow.md) | Data movement across layers |
| Policy pipeline | [`diagrams/16-policy-pipeline.md`](./diagrams/16-policy-pipeline.md) | The policy gate |

---

## State and sequence diagrams

| Topic | Document | What it shows |
|-------|----------|---------------|
| All state machines | [`diagrams/state-machines.md`](./diagrams/state-machines.md) | Trip, dispatch, conversation, slot |
| Sequence diagrams | [`diagrams/sequence-diagrams.md`](./diagrams/sequence-diagrams.md) | Request lifecycles |
| Runtime flow | [`diagrams/runtime-flow.md`](./diagrams/runtime-flow.md) | Turn-by-turn execution |
| Event flow | [`diagrams/event-flow.md`](./diagrams/event-flow.md) | How events propagate |
| DFD levels | [`diagrams/dfd-levels.md`](./diagrams/dfd-levels.md) | Data flow diagrams L0-L3 |

---

## Domain deep dives

| Domain | Document | What it covers |
|--------|----------|----------------|
| Trip | [`domains/trip.md`](./domains/trip.md) | Trip lifecycle and transitions |
| Dispatch | [`domains/dispatch.md`](./domains/dispatch.md) | Escalation and assignment |
| Pricing | [`domains/pricing.md`](./domains/pricing.md) | Tariffs and commercial rules |
| Geo | [`domains/geo.md`](./domains/geo.md) | Place resolution |
| Session | [`domains/session.md`](./domains/session.md) | Conversational state |

---

## Design and principles

| Topic | Document | What it covers |
|-------|----------|----------------|
| Design principles | [`design-principles.md`](./design-principles.md) | Principles with code examples |
| Fractal patterns | [`fractal-architecture.md`](./fractal-architecture.md) | Patterns that repeat at all scales |
| Bounded contexts | [`bounded-contexts.md`](./bounded-contexts.md) | Real bounded contexts |
| Engines | [`engines.md`](./engines.md) | Engine contracts and status |
| System map | [`system-map.md`](./system-map.md) | Modification guide |

---

## Governance

| Topic | Document | What it covers |
|-------|----------|---------------|
| Glossary | [`glossary.md`](./glossary.md) | Canonical terminology |
| ADRs | [`../adr/`](../adr/) | Permanent architecture decisions |
| AI rules | [`../ai/ARCHITECTURE_RULES.md`](../ai/ARCHITECTURE_RULES.md) | Strict rules for agents |
| AI contracts | [`../ai/CONTRACTS.md`](../ai/CONTRACTS.md) | Engine contracts |
| Invariants | [`../ai/INVARIANTS.md`](../ai/INVARIANTS.md) | Non-negotiable invariants |
| Decision tree | [`../ai/DECISION_TREE.md`](../ai/DECISION_TREE.md) | Runtime decision tree |
| Quality gate | [`../ai/QUALITY_GATE.md`](../ai/QUALITY_GATE.md) | Change checklist |
| Drift report | [`drift-report.md`](./drift-report.md) | Architecture drift tracking |
| Reverse engineering | [`reverse-engineering/architecture-graphs.md`](./reverse-engineering/architecture-graphs.md) | Auto-generated graphs |

---

## How to use this atlas

1. **New to the system?** Start with [`../SYSTEM_BIBLE.md`](../SYSTEM_BIBLE.md),
   then [`system-overview.md`](./system-overview.md).
2. **Debugging production?** Use [`system-map.md`](./system-map.md) and
   [`diagrams/02-webhook-entry.md`](./diagrams/02-webhook-entry.md).
3. **Designing a feature?** Read [`decision-architecture.md`](./decision-architecture.md)
   and [`design-principles.md`](./design-principles.md).
4. **Writing AI prompts?** Start with [`../ai/ARCHITECTURE_BIBLE.md`](../ai/ARCHITECTURE_BIBLE.md)
   and [`knowledge-map.md`](./knowledge-map.md).
5. **Planning roadmap?** Read [`capability-map.md`](./capability-map.md) and
   [`maturity-model.md`](./maturity-model.md).

---

*Last updated: 2026-07-06*
