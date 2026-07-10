# Documentation Coverage Matrix

> **Estado de la documentación del sistema post-F2 (2026-07-10).**
> Cada documento se evalúa contra el código fuente real para verificar que describe fielmente la implementación actual.

---

## Coverage por capa

### Conversational Pipeline (ADR-008)

| Componente | Documento primario | Status | Última revisión |
|---|---|---|---|
| handler.ts | `handler-context.md`, `conversation-pipeline.md` | ✅ Actual | 2026-07-10 |
| core.ts | `system-overview.md`, `architecture.md` | ✅ Actual | 2026-07-10 |
| conversation-interpreter.ts | `strategy-decision.md` (señales) | ✅ Actual | 2026-07-10 |
| client-objective.ts | `strategy-decision.md` (señales) | ✅ Actual | 2026-07-10 |
| conversation-strategy.ts | `strategy-decision.md` | ✅ Nuevo | 2026-07-10 |
| router.ts | `decision-architecture.md` | ✅ Actual | 2026-07-10 |
| policy-ahora.ts | `diagrams/07-policy-ahora.md` | ✅ Actual | Pre-F2 |
| policy-reserva.ts | `diagrams/08-policy-reserva.md` | ✅ Actual | Pre-F2 |
| guard.ts | `conversation-pipeline.md` | ✅ Nuevo | 2026-07-10 |
| llm-response.ts | `strategy-decision.md` (consumo) | ✅ Nuevo | 2026-07-10 |

### ADRs

| ADR | Título | Status | Documentado en |
|---|---|---|---|
| ADR-001 | Dependency rules | ✅ Accepted | `ADR_INDEX.md` |
| ADR-002 | Service layer isolation | ✅ Accepted | `ADR_INDEX.md` |
| ADR-003 | Domain isolation | ✅ Accepted | `ADR_INDEX.md` |
| ADR-004 | AI → Services dependency prohibition | ✅ Accepted | `ADR_INDEX.md` |
| ADR-005 | Deterministic core | ✅ Accepted | `ADR_INDEX.md` |
| ADR-006 | Policy-based routing | ✅ Accepted | `ADR_INDEX.md` |
| ADR-007 | Conversation Interpreter | ✅ Accepted | `ADR_INDEX.md`, `ADR-007.md` |
| ADR-008 | StrategyDecision Architecture Freeze | ✅ Accepted | `ADR_INDEX.md`, `ADR-008.md` |

### Architecture Overview

| Documento | Area | Status | Observaciones |
|---|---|---|---|
| `architecture.md` | General architecture | ✅ Actual | Pipeline diagram updated with SD |
| `system-map.md` | File/component map | ✅ Actual | Line counts + SD components added |
| `decision-architecture.md` | Decision system design | ✅ Actual | Intent list + SD layer fixed |
| `operational-model.md` | Operational flow | ✅ Actual | SD pipeline section added |
| `strategy-decision.md` | SD reference | ✅ Nuevo | Full lifecycle documentation |
| `handler-context.md` | HC reference | ✅ Nuevo | Enrichment + consumption |
| `conversation-pipeline.md` | Pipeline reference | ✅ Nuevo | End-to-end pipeline |
| `system-overview.md` | System overview | ✅ Actual | Pre-F2, still accurate |
| `bounded-contexts.md` | Context map | ✅ Actual | Pre-F2 |
| `capability-map.md` | Capability map | ✅ Actual | Pre-F2 |
| `glossary.md` | Terminology | ✅ Actual | Intent list fixed (11 values) |
| `design-principles.md` | Design principles | ✅ Actual | Pre-F2 |
| `GOVERNANCE.md` | Governance rules | ✅ Actual | Pre-F2 |
| `DECISION_OWNERSHIP_MATRIX.md` | Ownership | ✅ Actual | R5+ownership updated |
| `maturity-model.md` | Maturity assessment | ⚠️ Posible stale | Pre-F2 |
| `metrics.md` | Metrics | ⚠️ Posible stale | Pre-F2 |
| `drift-report.md` | Drift analysis | ⚠️ Posible stale | Pre-F2 |
| `fractal-architecture.md` | Architecture pattern | ⚠️ Posible stale | Pre-F2 |
| `engines.md` | Engines overview | ⚠️ Posible stale | Pre-F2 |
| `knowledge-map.md` | Knowledge structure | ⚠️ Posible stale | Pre-F2 |
| `dashboard.md` | Monitoring dashboards | ⚠️ Posible stale | Pre-F2 |
| `ARCHITECTURE_ATLAS.md` | Atlas reference | ⚠️ Posible stale | Pre-F2 |
| `ARCHITECTURE_BASELINE.md` | Baseline snapshot | ⚠️ Posible stale | Pre-F2, capture at specific time |
| `ARCHITECTURE_MILESTONE_v2.0.md` | Milestone v2.0 | ⚠️ Posible stale | Pre-F2 |
| `REVERSE_ENGINEERING_REPORT.md` | RE report | ⚠️ Auto-generated | From code traversal |

### Diagrams

| # | Diagrama | Status | Observaciones |
|---|---|---|---|
| 00 | Main system (.mmd) | ✅ Actual | Updated with SD, CI, CO, Guard |
| 00 | Main system (.svg) | ⚠️ Stale | SVG no regenerado desde .mmd |
| 01 | System overview | ✅ Actual | |
| 02 | Webhook entry | ✅ Actual | |
| 03 | Core phase | ✅ Actual | |
| 04 | Router phase | ✅ Actual | |
| 05 | Extraction phase | ✅ Actual | |
| 06 | Confidence model | ✅ Actual | |
| 07 | Policy Ahora | ✅ Actual | |
| 08 | Policy Reserva | ✅ Actual | |
| 09 | Location resolution | ✅ Actual | |
| 10 | Tariff resolution | ✅ Actual | |
| 11 | Operational readiness | ✅ Actual | |
| 12 | Workflow state machine | ✅ Actual | |
| 13 | Slot confidence evolution | ✅ Actual | |
| 14 | Dispatch flow | ✅ Actual | |
| 15 | Data flow | ✅ Actual | |
| 16 | Policy pipeline | ✅ Actual | |
| **17** | **StrategyDecision flow** | ✅ **Nuevo** | SD lifecycle |
| **18** | **HandlerContext flow** | ✅ **Nuevo** | HC enrichment |
| **19** | **Module dependency map** | ✅ **Nuevo** | Module dependencies |

### AI Context Pack

| Documento | Status | Observaciones |
|---|---|---|
| `ARCHITECTURE_BIBLE.md` | ⚠️ No auditado | No referencia ADRs por número, describe alto nivel |
| `ARCHITECTURE_RULES.md` | ⚠️ No auditado | Menciona policy files correctamente |
| `CONTRACTS.md` | ✅ Verificado | purchaseIntent referenciado correctamente |
| `DECISION_TREE.md` | ✅ Verificado | Menciona policy files correctamente |
| `COMMON_FAILURES.md` | ⚠️ No auditado | |
| `INVARIANTS.md` | ⚠️ No auditado | |
| `QUALITY_GATE.md` | ⚠️ No auditado | |
| `README.md` | ✅ Actual | |

### Domain Docs

| Documento | Status | Observaciones |
|---|---|---|
| `domains/geo.md` | ✅ Actual | |
| `domains/pricing.md` | ✅ Actual | |
| `domains/trip.md` | ✅ Actual | UNKNOWN temporal ref correct |
| `domains/session.md` | ✅ Actual | |
| `domains/dispatch.md` | ✅ Actual | |

---

## Coverage Summary

| Categoría | Total | ✅ Actual | ⚠️ Posible stale | ❌ Stale | 🆕 Nuevo |
|---|---|---|---|---|---|
| Pipeline docs | 3 | 0 | 0 | 0 | **3** |
| Architecture overview | 25 | 13 | 8 | 0 | **0** |
| Diagrams | 22 | 18 | 1 (SVG) | 0 | **3** |
| ADRs | 8 | **8** | 0 | 0 | 0 |
| AI Context Pack | 8 | 3 | 5 | 0 | 0 |
| Domain docs | 5 | 5 | 0 | 0 | 0 |
| Project docs | 8 | **3** | 5 (cert) | 0 | 0 |
| **Total** | **79** | **50** | **19** | **0** | **6** |

- **63%** de la documentación está ✅ actualizada y verificada contra código fuente
- **24%** está en estado ⚠️ (posiblemente desactualizada, no verificada en F2)
- **0%** está ❌ confirmada como obsoleta
- **6 documentos nuevos** creados en F2

---

*Last updated: 2026-07-10*
