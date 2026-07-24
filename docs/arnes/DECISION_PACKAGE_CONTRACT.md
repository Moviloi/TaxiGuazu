# ARNÉS Framework — Decision Package Contract v2.3

> **Nivel:** Arquitectónico (Nivel 1)
> **Versión:** 2.3
> **Fecha:** 2026-07-23
> **Estado:** ACTIVE
> **Deriva de:** `COGNITIVE_ARCHITECTURE.md` §5 (Decision Engine)
> **Sucede a:** v2.2
>
> Define la estructura de decisión que el Decision Engine produce.
> v2.3 renombra el valor `execution_engine` de `BUILD` a `AEL`, alineando
> el contrato con el Cardinal Architectural Principle: Primary Modes no son
> Cognitive Engines. BUILD es un Primary Mode. AEL (coordinado por AMC) es
> el dominio de ejecución.

---

## Purpose

The DecisionPackage is the **single authoritative decision** produced by the Decision Engine. It encapsulates:

1. **Execution routing** — what path the mission follows (v1.0).
2. **Cognitive budget** — how much reasoning is warranted (v2.0).
3. **Producer identity** — who produced this DecisionPackage (v2.1).

### Dual-Producer Model

The DecisionPackage can be produced by two entities, but **only one Decision Engine exists in the framework.** The Decision Engine belongs exclusively to ARNÉS.

| Producer | Scenario | Authority |
|---|---|---|
| **ARNÉS** | User enters through ARNÉS mode | Full classification: `planning_engine` (SDL/LIGHT_PLANNER/NONE), `execution_engine` (AEL/NONE), `reasoning_depth`, `cognitive_budget`. |
| **PLAN** | User enters directly through PLAN mode | Limited classification: `planning_engine` (SDL vs LIGHT_PLANNER) and `reasoning_depth` only. Never decides `execution_engine` (user already chose PLAN entry point). |

**PLAN does not re-classify DecisionPackages produced by ARNÉS.** When PLAN receives a DecisionPackage with `producer: ARNES`, it executes the package as-is — no Scope Gate, no re-classification, no field override.

### DecisionPackage Semantics

The DecisionPackage captures ARNÉS's **routing decision** — which engines the mission requires. It does NOT describe a workflow, an execution chain, or a sequence of steps. Each field represents:
- **Decision:** what planning engine (`planning_engine`) and execution engine (`execution_engine`) are needed.
- **Context:** information for the receiving agent (e.g., reasoning_depth, cognitive_budget).
- **Authority:** who made the decision (`producer`).

The `planning_engine` field determines whether strategic planning is needed and which planning motor to use. The `execution_engine` field determines whether AEL execution is needed. These two fields replace the old `continuation` field, separating concerns: a mission can have planning without execution, or execution without planning.

### DecisionPackage vs Execution Handoff

The DecisionPackage governs the **initial routing**. The **execution handoff** (PLAN → BUILD transition) is a separate act managed by ARNÉS after the user approves the ExecutionPlan:

1. **Initial routing** (DecisionPackage): ARNÉS determines `planning_engine: SDL|LIGHT_PLANNER` → delegates to PLAN.
2. **Execution handoff** (ARNÉS-managed): PLAN produces ExecutionPlan → user approves → **ARNÉS generates handoff to BUILD** with the approved ExecutionPlan.

The DecisionPackage does NOT control the execution handoff. ARNÉS retains routing authority throughout the mission lifecycle. PLAN never initiates the BUILD transition — ARNÉS does.

---

## Structure

### Identity Field (v2.1 — new)

| Field | Type | Description |
|---|---|---|
| `producer` | `ARNES` \| `PLAN` | Which entity produced this DecisionPackage. Required for all DecisionPackages. |

### Execution Fields (v2.2 — refactored)

| Field | Type | Description |
|---|---|---|
| `mission_type` | `TACTICAL` \| `STRATEGIC` | Classification of the mission. |
| `execution_required` | `boolean` | Whether AEL execution is needed. |
| `execution_engine` | `AEL` \| `NONE` | Which execution domain handles the mission. `AEL` → ARNÉS delegates to the AEL domain (coordinated by AMC) after planning (if any). `NONE` → no execution needed. Replaces `continuation: BUILD_DIRECT`. |
| `planning_engine` | `SDL` \| `LIGHT_PLANNER` \| `NONE` | Which planning engine to use. `SDL` → full strategic planning. `LIGHT_PLANNER` → simplified planning. `NONE` → no planning needed (tactical). Replaces `continuation: PLAN_SDL`. |
| `requires_user_approval` | `boolean` | Whether user must approve before BUILD. |
| `existing_execution_plan` | `object` \| `null` | Pre-existing ExecutionPlan if available. |
| `classification_reason` | `string` | Brief justification for the classification. |

### Cognitive Fields (v2.0 — stable)

| Field | Type | Description |
|---|---|---|
| `reasoning_required` | `boolean` | Whether strategic analysis is needed at all. |
| `reasoning_depth` | `SHALLOW` \| `STANDARD` \| `DEEP` | Intensity of reasoning warranted. |
| `cognitive_budget` | `ECONOMY` \| `STANDARD` \| `FULL` | Recommended cognitive resource allocation. |

### Reasoning Depth Semantics

| Depth | Planning Engine | Execution Engine | Description |
|---|---|---|---|
| `NONE` | `NONE` | `AEL` | No planning required. AEL direct. Trivial/tactical changes. |
| `SHALLOW` | `LIGHT_PLANNER` | `AEL` | Minimal planning. Simple strategic tasks, well-scoped. |
| `STANDARD` | `LIGHT_PLANNER` | `AEL` | Standard planning. Strategic missions without architectural impact. |
| `DEEP` | `SDL` | `AEL` | Full architectural planning. ADR impact, high risk, multi-component. |

### Cognitive Budget Semantics

| Budget | When | Implies |
|---|---|---|
| `ECONOMY` | NONE, SHALLOW | Minimal tokens, BUILD direct or LIGHT_PLANNER |
| `STANDARD` | STANDARD | Balanced token allocation |
| `FULL` | DEEP | Maximum reasoning, all capabilities available

### Planning Engine (engine selector)

`planning_engine` selects which planning engine the PLAN entry point uses. Values:

| Value | Status | Description |
|---|---|---|
| `SDL` | **Active** | Strategic Director Layer. Full SDL flow. Used for DEEP missions. |
| `LIGHT_PLANNER` | **Active** | Lightweight planner. Used for SHALLOW/STANDARD strategic missions without architectural impact. |
| `NONE` | **Active** | No planning needed. BUILD direct (tactical missions). |

The Decision Engine sets this field based on `reasoning_depth`:
- `NONE` → `planning_engine: NONE`, `execution_engine: AEL` (tactical, direct execution)
- `SHALLOW` → `planning_engine: LIGHT_PLANNER`, `execution_engine: AEL`
- `STANDARD` → `planning_engine: LIGHT_PLANNER`, `execution_engine: AEL`
- `DEEP` → `planning_engine: SDL`, `execution_engine: AEL`

### Execution Engine (engine selector)

`execution_engine` selects whether AEL execution is needed. Values:

| Value | Status | Description |
|---|---|---|
| `AEL` | **Active** | AEL domain handles execution, coordinated by AMC. Used for all missions requiring code changes. |
| `NONE` | **Active** | No execution needed. Planning-only or informational missions. |

---

## Values by Reasoning Depth

### NONE — No Planning

```
mission_type: TACTICAL
reasoning_required: false
reasoning_depth: NONE
planning_engine: NONE
execution_engine: AEL
execution_required: true
requires_user_approval: false
cognitive_budget: ECONOMY
existing_execution_plan: null
classification_reason: "Trivial change. No planning required."
```

**Action:** BUILD direct. No PLAN involvement. No ExecutionPlan.

### SHALLOW — Minimal Planning

```
mission_type: STRATEGIC
reasoning_required: true
reasoning_depth: SHALLOW
planning_engine: LIGHT_PLANNER
execution_engine: AEL
execution_required: true
requires_user_approval: true
cognitive_budget: ECONOMY
existing_execution_plan: null
classification_reason: "Simple strategic task. Well-scoped. Minimal planning."
```

**Action:** LIGHT_PLANNER produces simplified ExecutionPlan. BUILD executes.

### STANDARD — Standard Planning

```
mission_type: STRATEGIC
reasoning_required: true
reasoning_depth: STANDARD
planning_engine: LIGHT_PLANNER
execution_engine: AEL
execution_required: true
requires_user_approval: true
cognitive_budget: STANDARD
existing_execution_plan: null
classification_reason: "Strategic mission. No architectural impact."
```

**Action:** LIGHT_PLANNER produces ExecutionPlan. BUILD executes.

### DEEP — Architectural Planning

```
mission_type: STRATEGIC
reasoning_required: true
reasoning_depth: DEEP
planning_engine: SDL
execution_engine: AEL
execution_required: true
requires_user_approval: true
cognitive_budget: FULL
existing_execution_plan: null
classification_reason: "Architectural impact. ADR modifications. High risk."
```

**Action:** SDL produces full ExecutionPlan (ORIENT→ANALYZE→...→DELIVER). BUILD executes.

---

## Compatibility

v2.2 breaks backward compatibility with v2.1 in one field:
- `continuation` (v2.0/v2.1) is removed and replaced by `execution_engine` + `planning_engine`.
- All other fields remain unchanged.
- Migration: `continuation: BUILD_DIRECT` → `execution_engine: AEL, planning_engine: NONE`.
- Migration: `continuation: PLAN_SDL` → `execution_engine: AEL, planning_engine: SDL|LIGHT_PLANNER`.

---

## Authority

### When producer = ARNES

- **Producer:** ARNÉS Decision Engine (ARNÉS agent, Scope Gate)
- **Consumer:** PLAN (entry point, hosting SDL or LIGHT_PLANNER)
- **PLAN must:** execute the DecisionPackage as-is
- **PLAN must NOT:** re-classify, override `mission_type`, change `execution_engine` or `planning_engine`, modify `reasoning_depth`, or run Scope Gate
- **PLAN may:** elaborate on the decision; use cognitive fields to inform planning strategy

### When producer = PLAN

- **Producer:** PLAN Scope Gate (entry adapter for direct PLAN invocation)
- **Consumer:** SDL or LIGHT_PLANNER (internal to PLAN entry point)
- **PLAN Scope Gate decides only:** `planning_engine` (SDL vs LIGHT_PLANNER), `reasoning_depth` (STANDARD vs DEEP)
- **PLAN Scope Gate never decides:** `execution_engine` (always `AEL` when entry is PLAN), `planning_engine: NONE` (user chose PLAN to plan), `mission_type` (always STRATEGIC when entering through PLAN directly)
- **PLAN may:** set `cognitive_budget` based on mission complexity

### Cross-producer rule

When PLAN receives a DecisionPackage with `producer: ARNES`, it MUST NOT execute its own Scope Gate. The ARNÉS Decision Engine has already resolved all fields (`planning_engine`, `execution_engine`, `reasoning_depth`, `cognitive_budget`). PLAN's Scope Gate is exclusively an **entry adapter** for direct PLAN invocation — never a secondary classifier.

---

## Relationship to Other Contracts

| Contract | Relationship |
|---|---|
| `COGNITIVE_ARCHITECTURE.md` §5 | DecisionPackage is the concrete output of the Decision Engine |
| `RUNTIME_PROFILE_CONTRACT.md` | DecisionPackage `cognitive_budget` informs Runtime Profile token allocation |
| `DECISION_PACKAGE_CONTRACT.md` v1.0 / v2.1 | Superseded. v2.2 replaces `continuation` with `execution_engine` + `planning_engine`. |

---

> *v2.3 refines the DecisionPackage by renaming the `execution_engine` value from `BUILD` (a Primary Mode) to `AEL` (the execution domain, coordinated internally by AMC). This aligns with the Cardinal Architectural Principle: Primary Modes (BUILD) are NOT cognitive engines — AEL is. The field semantics are unchanged: `AEL` means "execution is needed and will be handled by the AEL domain." The migration is transparent: `execution_engine: BUILD` → `execution_engine: AEL`. All other fields and values remain identical.*
