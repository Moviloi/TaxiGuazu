# ARNÉS Framework — Light Planner Contract v1.0

> **Nivel:** Operacional (Nivel 2) — segundo motor de planificación del dominio PLAN
> **Versión:** 1.0
> **Fecha:** 2026-07-22
> **Estado:** ACTIVE
> **Dominio:** PLAN → Planning Engines → LIGHT_PLANNER
>
> Define el contrato del Light Planner: el primer motor alternativo
> del dominio PLAN. Su propósito es validar la arquitectura multi-motor
> sin competir con SDL.

---

## Purpose

The Light Planner is the **second planning engine** in the PLAN reasoning domain. It produces simplified ExecutionPlans for missions that do not require the full SDL reasoning chain.

It exists to validate that the PLAN domain can host multiple engines — not to replace SDL.

---

## When It Is Selected

The Decision Engine (ARNÉS) selects `planning_engine: LIGHT_PLANNER` when:

- `mission_type: STRATEGIC` AND `reasoning_depth: STANDARD`
- The mission is strategic but does not involve architectural changes, ADR modifications, or high risk

Currently, LIGHT_PLANNER is selected for **non-architectural strategic missions** — those that need planning but not deep analysis.

---

## Contract

### Input

| Field | Source | Description |
|---|---|---|
| `DecisionPackage` | ARNÉS Decision Engine | Full v2.0 DecisionPackage with `planning_engine: LIGHT_PLANNER` |
| `Product Context` | Project Adapter (via ARNÉS) | Context about the product (identity, ADRs, debt, quality) |

### Output

| Field | Description |
|---|---|
| `ExecutionPlan` | Structured plan compatible with BUILD. Contains: objective, current_state, evidence, recommended_workflow, constraints, success_criteria, confidence, escalation_needed |

### Behavior

1. Read the DecisionPackage and Product Context.
2. Produce an ExecutionPlan directly — without executing the full SDL ORIENT→ANALYZE→EVALUATE→... chain.
3. The ExecutionPlan must:
   - Be structurally identical to an SDL-produced ExecutionPlan.
   - Respect all constraints from the Product Context.
   - Include confidence level (may be lower than SDL for complex missions).
4. If the mission is too complex for LIGHT_PLANNER, escalate to SDL.

### Constraints

| Can | Cannot |
|---|---|
| Produce ExecutionPlan for STANDARD missions | Handle DEEP missions (escalate to SDL) |
| Skip ORIENT→ANALYZE→EVALUATE chain | Skip constraints validation |
| Use lower confidence for complex cases | Produce invalid ExecutionPlan format |
| Reuse SDL internally if needed | Modify BUILD or AMC behavior |

---

## Relationship to SDL

| Aspect | SDL | LIGHT_PLANNER |
|---|---|---|
| **Reasoning depth** | Full (SHALLOW to DEEP) | STANDARD only |
| **Flow** | ORIENT→ANALYZE→EVALUATE→DECIDE→PLAN→VERIFY→DELIVER | Direct ExecutionPlan generation |
| **Confidence** | High (full analysis) | Medium (simplified analysis) |
| **Escalation** | N/A (handles all) | Escalates to SDL for DEEP missions |
| **Selection** | `planning_engine: SDL` | `planning_engine: LIGHT_PLANNER` |

---

## Integration

```
Decision Engine (ARNÉS)
    │
    │  reasoning_depth: STANDARD → planning_engine: LIGHT_PLANNER
    ▼
DecisionPackage
    │  planning_engine: LIGHT_PLANNER
    ▼
PLAN (pasivo)
    │
    ├── planning_engine: SDL → delega a SDL
    │
    └── planning_engine: LIGHT_PLANNER → delega a LIGHT_PLANNER ← NUEVO
              │
              ▼
         ExecutionPlan (formato idéntico al de SDL)
              │
              ▼
         BUILD (no sabe qué motor lo produjo)
```

---

## Current Implementation

In this initial version, LIGHT_PLANNER generates a simplified ExecutionPlan by:
1. Reading the DecisionPackage classification reason
2. Consulting the Product Context for constraints
3. Producing a minimal ExecutionPlan with recommended workflow, constraints, and success criteria
4. Setting confidence slightly lower than SDL would for the same mission

For complex missions where LIGHT_PLANNER cannot produce a reliable plan, it escalates to SDL internally.

---

> *The Light Planner validates the PLAN domain's multi-engine architecture. It is intentionally minimal — its purpose is architectural proof, not cognitive optimization. Future sprints may evolve it into a fully independent lightweight reasoning engine.*
