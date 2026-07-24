# ARNES Framework -- Certification Acceptance Tests v1.1.0

## Decision Authority Boundary (Sprint 10.4.0.2)

**Corrected boundary:** ARNES decides the FIRST responsible agent and delegates directly. It does NOT prescribe a workflow chain. PLAN never receives BUILD_DIRECT decisions -- ARNES sends them directly to BUILD.

---

## CAT-X: Cross-Mode Boundary Tests

### CAT-X1 -- ARNES -> BUILD direct (replaces old CAT-P3)

| Field | Value |
|---|---|
| Entry point | ARNES |
| Prompt | "Corregi el typo en el mensaje de error" |
| Expected | 1. Scope Gate classifies TACTICAL. 2. DecisionPackage(producer=ARNES, continuation=BUILD_DIRECT). 3. ARNES delegates DIRECTLY to @build. 4. PLAN is NEVER invoked. |
| Forbidden | PLAN involvement. Routing through PLAN. PLAN receiving BUILD_DIRECT. |
| Evidence | DecisionPackage in ARNES output. @build delegation. Zero references to PLAN. |
| PASS/FAIL | PASS if PLAN is absent from the flow. FAIL if PLAN appears. |

### CAT-H1 -- ARNES -> PLAN -> ARNES -> BUILD Runtime Handoff (new)

| Field | Value |
|---|---|
| Entry point | ARNES |
| Prompt | Any mission requiring strategic planning |
| Expected | 1. ARNES classifies STRATEGIC. DecisionPackage(PLAN_SDL). 2. ARNES delegates to @plan. 3. PLAN produces ExecutionPlan. 4. ARNES receives ExecutionPlan, presents to user. 5. User approves. 6. **ARNES generates handoff to @build** with ExecutionPlan. 7. BUILD executes. |
| Forbidden | PLAN initiating BUILD. User manually switching to BUILD as architectural requirement. PLAN acting as router for BUILD transition. |
| Evidence | ARNES output shows delegation to @plan then later to @build. PLAN output shows ExecutionPlan without BUILD delegation. ARNES manages the handoff. |
| PASS/FAIL | PASS if ARNES manages handoff. FAIL if PLAN initiates BUILD or user forced to switch manually. |

---

## CAT-ARNES: ARNES Mode Tests

### CAT-A1 -- Strategic DEEP

| Field | Value |
|---|---|
| Entry point | ARNES |
| Prompt | "Rediseno de arquitectura del modulo de pricing" |
| Expected | 1. Scope Gate: ESTRATEGICA. 2. DecisionPackage(producer=ARNES, reasoning_depth=DEEP, planning_engine=SDL). 3. Project Adapter + Product Context. 4. Delegates to @plan. |
| Forbidden | Direct execution. File editing. Responding without classification. |
| Evidence | DecisionPackage with producer=ARNES, DEEP, SDL. Product Context loaded. |
| PASS/FAIL | PASS if full classification chain present. FAIL if classification skipped. |

### CAT-A2 -- Tactical direct

| Field | Value |
|---|---|
| Entry point | ARNES |
| Prompt | "Corregi el typo en el mensaje de error" |
| Expected | 1. Scope Gate: TACTICA. 2. DecisionPackage(producer=ARNES, continuation=BUILD_DIRECT). 3. Delegates DIRECTLY to @build. No PLAN. No Product Context. |
| Forbidden | Invoking PLAN. Loading Product Context. Creating ExecutionPlan. |
| Evidence | DecisionPackage with mission_type=TACTICAL. Absence of Product Context. Direct @build delegation. |
| PASS/FAIL | PASS if BUILD_DIRECT without PLAN. FAIL if PLAN is invoked. |

### CAT-A3 -- Strategic STANDARD

| Field | Value |
|---|---|
| Entry point | ARNES |
| Prompt | "Audita el estado de los modelos LLM en el framework" |
| Expected | 1. Scope Gate: ESTRATEGICA. 2. reasoning_depth=STANDARD, planning_engine=LIGHT_PLANNER. 3. Project Adapter activated. 4. Delegates to @plan. |
| Forbidden | Using DEEP for standard mission. Delegating to BUILD without PLAN. |
| Evidence | DecisionPackage with LIGHT_PLANNER. Product Context loaded. |
| PASS/FAIL | PASS if LIGHT_PLANNER selected. FAIL if SDL used unnecessarily. |

### CAT-A4 -- Trivial

| Field | Value |
|---|---|
| Entry point | ARNES |
| Prompt | "Hola" |
| Expected | 1. Scope Gate: TACTICA. 2. cognitive_budget=ECONOMY. 3. No Project Adapter. No Product Context. 4. Direct response or @build delegation. |
| Forbidden | Loading Product Context for a greeting. Invoking PLAN. |
| Evidence | Absence of Product Context. ECONOMY budget. |
| PASS/FAIL | PASS if minimal resources used. FAIL if Product Context loaded. |

---

## CAT-PLAN: PLAN Mode Tests

### CAT-P1 -- PLAN direct, DEEP impact

| Field | Value |
|---|---|
| Entry point | PLAN |
| Prompt | "Rediseno de arquitectura del modulo de pricing" (no DecisionPackage) |
| Expected | 1. Scope Gate reducido: producer=PLAN. 2. planning_engine=SDL. 3. SDL: ORIENT->...->DELIVER. 4. ExecutionPlan + Recommendation. 5. FINALIZA. No inicia BUILD. |
| Forbidden | Deciding PLAN vs BUILD. Auto-delegating to BUILD. Using producer=ARNES. Editing files. |
| Evidence | DecisionPackage with producer=PLAN. ExecutionPlan. Absence of @build invocation. |
| PASS/FAIL | PASS if PLAN cycle ends without BUILD. FAIL if BUILD auto-invoked. |

### CAT-P2 -- PLAN direct, STANDARD

| Field | Value |
|---|---|
| Entry point | PLAN |
| Prompt | "Audita el estado de los modelos LLM en opencode.json" (no DecisionPackage) |
| Expected | 1. Scope Gate reducido: producer=PLAN, reasoning_depth=STANDARD. 2. planning_engine=LIGHT_PLANNER. 3. LIGHT_PLANNER produces ExecutionPlan. 4. FINALIZA. |
| Forbidden | Using SDL for STANDARD. Initiating BUILD. Deciding PLAN vs BUILD. |
| Evidence | DecisionPackage with producer=PLAN, LIGHT_PLANNER. ExecutionPlan. No @build. |
| PASS/FAIL | PASS if LIGHT_PLANNER used and cycle ends. FAIL if SDL or BUILD invoked. |

### CAT-P3 -- PLAN receives PLAN_SDL from ARNES

| Field | Value |
|---|---|
| Entry point | PLAN |
| Prompt | Receives DecisionPackage(producer=ARNES, continuation=PLAN_SDL, planning_engine=SDL) |
| Expected | 1. NO ejecuta Scope Gate. 2. NO reclasifica. 3. Delega a SDL. 4. SDL produces ExecutionPlan. |
| Forbidden | Executing Scope Gate. Modifying planning_engine or reasoning_depth. Deciding PLAN vs BUILD. |
| Evidence | ExecutionPlan produced. No modification of ARNES fields. No Scope Gate. |
| PASS/FAIL | PASS if package consumed as-is. FAIL if reclassification occurs. |

---

## CAT-BUILD: BUILD Mode Tests

### CAT-B1 -- BUILD direct, create file

| Field | Value |
|---|---|
| Entry point | BUILD |
| Prompt | "Crea un archivo TEST.md con 'BUILD directo funcionando'" (no ExecutionPlan) |
| Expected | 1. Scenario B: direct entry. 2. No classification. 3. L1->L3->L4. 4. File created. |
| Forbidden | Generating DecisionPackage. Executing Scope Gate. Determining mission_type. Assigning reasoning_depth. |
| Evidence | File created. Zero occurrences of "DecisionPackage", "Scope Gate", "reasoning_depth", "planning_engine" in output. |
| PASS/FAIL | PASS if no classification artifacts. FAIL if DecisionPackage appears. |

### CAT-B2 -- BUILD direct, execute command

| Field | Value |
|---|---|
| Entry point | BUILD |
| Prompt | "Ejecuta npm test y reporta el resultado" (no ExecutionPlan) |
| Expected | 1. Scenario B. 2. Executes. 3. ExecutionReport with result. |
| Forbidden | Classifying the mission. Generating DecisionPackage. |
| Evidence | Command result in output. No classification. |
| PASS/FAIL | PASS if execution without classification. FAIL if mission_type appears. |

### CAT-B3 -- BUILD receives ExecutionPlan from ARNES

| Field | Value |
|---|---|
| Entry point | BUILD |
| Prompt | Receives ExecutionPlan + DecisionPackage(producer=ARNES) |
| Expected | 1. Scenario A. 2. Uses DecisionPackage as informational context. 3. Does NOT reclassify. 4. Executes L1->L2->L3->L4 per ExecutionPlan. |
| Forbidden | Modifying DecisionPackage. Generating own DecisionPackage. Executing Scope Gate. |
| Evidence | ExecutionReport. DecisionPackage treated as context only. |
| PASS/FAIL | PASS if no reclassification. FAIL if DecisionPackage modified. |

### CAT-B4 -- BUILD asked to classify

| Field | Value |
|---|---|
| Entry point | BUILD |
| Prompt | "Es esta mision estrategica o tactica?" |
| Expected | 1. Responds that BUILD does not classify missions. 2. Points to ARNES Decision Engine. |
| Forbidden | Attempting to classify. Generating DecisionPackage. |
| Evidence | Response stating BUILD does not classify. Reference to ARNES. |
| PASS/FAIL | PASS if classification refused. FAIL if classification attempted. |

---

## PASS/FAIL Matrix

| ID | Mode | Scenario | PASS/FAIL |
|---|---|---|---|
| CAT-X1 | ARNES->BUILD | Boundary test | |
| CAT-H1 | ARNES->PLAN->ARNES->BUILD | Runtime Handoff | |
| CAT-A1 | ARNES | Strategic DEEP | |
| CAT-A2 | ARNES | Tactical direct | |
| CAT-A3 | ARNES | Strategic STANDARD | |
| CAT-A4 | ARNES | Trivial | |
| CAT-P1 | PLAN | Direct DEEP | |
| CAT-P2 | PLAN | Direct STANDARD | |
| CAT-P3 | PLAN | Receives PLAN_SDL from ARNES | |
| CAT-B1 | BUILD | Direct create file | |
| CAT-B2 | BUILD | Direct execute command | |
| CAT-B3 | BUILD | Receives ExecutionPlan | |
| CAT-B4 | BUILD | Asked to classify | |

**Total: 13 tests. Certification PASS: 13/13.**

---

## Decision Authority Boundary Rules

1. ARNES decides the FIRST responsible agent. It does NOT design execution chains.
2. ARNES delegates directly to the chosen agent (BUILD or PLAN). No intermediate routing.
3. PLAN never receives BUILD_DIRECT. ARNES sends those directly to BUILD.
4. PLAN's cycle ends when it delivers the ExecutionPlan to the user.
5. BUILD activation requires either: (a) ARNES direct delegation, or (b) explicit user mode switch.
