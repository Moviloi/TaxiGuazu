# ARNÉS Stage 2B — Project Adapter Implementation Report

> **Mission:** ARNÉS Stage 2B — Project Adapter Implementation
> **Date:** 2026-07-22
> **Status:** COMPLETED
> **Blueprint Reference:** DEPLOYMENT_BLUEPRINT_v1.0.0, Stage 2

---

## 1. Design Implemented

### Architecture Decision

The Project Adapter architecture (`PROJECT_ADAPTER_ARCHITECTURE.md`) specifies a 6-stage component (DISCOVER→LOAD→VALIDATE→BUILD→DELIVER→DISCARD) as Nivel 2 infrastructure. In this stage, the adapter is implemented as a **protocol within the ARNÉS agent prompt** — not as a separate runtime component. This is the minimal viable implementation that achieves the architectural goal (independence from product structure) without requiring new runtime infrastructure.

### What was removed

| Before (Stage 2A) | After (Stage 2B) |
|---|---|
| ARNÉS hardcoded `docs/project/PROJECT_CONTEXT.md` | ARNÉS discovers context dynamically |
| ARNÉS knew AITOS document structure | ARNÉS discovers structure via adapter protocol |
| Single fallback path | Structured fallback: adapter → document reading |

### What was added — The 6-stage cycle

```
ARNÉS (estrategico)
  │
  ▼
┌─────────────────────────────────────────┐
│          PROJECT ADAPTER                 │
│                                         │
│  DISCOVER → LOAD → VALIDATE → BUILD     │
│                                         │
│  Busca       Lee      Verifica  Estruct. │
│  PROJECT_    fuentes  complet.  contexto │
│  CONTEXT.md  descub.  (12 camp) (ligero) │
│                                         │
│  DELIVER ──▶ Product Context ──▶ PLAN   │
│                                         │
│  DISCARD ◀── CLOSED                     │
└─────────────────────────────────────────┘
```

---

## 2. Files Modified

| File | Action | Lines |
|---|---|---|
| `.opencode/agents/arnes.md` | Replaced "Flujo completo" section + updated rules | 98 → 127 (+29 lines) |

**Files NOT modified:** plan.md, build.md, opencode.json, ael/, subagents, PROJECT_CONTEXT.md

---

## 3. Adapter Protocol Details

### DISCOVER
- Searches for `PROJECT_CONTEXT.md` or `PRODUCT_CONTEXT.md` recursively in `docs/` — no hardcoded path.
- Reads `package.json` for project identity.
- Identifies document structure (where are ADRs? rules? constitution?).
- Reports found and missing sources.

### LOAD
- Loads formal Product Context file if found.
- Falls back to direct document reading if no formal context exists.
- Extracts relevant information without copying full documents.

### VALIDATE
- Checks minimum fields: identity, architecture (active ADRs), governance (constitution), quality (tests, build).
- Warns if critical information is missing. Does not block the mission.
- Reports excessive incompleteness as risk.

### BUILD
- Structures context as lightweight summary for PLAN consumption.
- Identity, architecture, active ADRs, known debt, quality status, knowledge map.
- Context is essential information — not full documentation.

### DELIVER
- Context is available. Proceed to PLAN delegation.

### DISCARD
- On CLOSED (step 7 of execution), destroy workspace and all adapter state.
- Only Keeper-preserved knowledge survives.

---

## 4. Integration with ARNÉS Flow

```
Usuario
  │
  ▼
ARNÉS Router (Scope Gate)        ← FIRST, always
  │
  ├── TÁCTICO ──▶ BUILD directo
  │               (sin adapter, sin contexto, sin PLAN)
  │
  └── ESTRATÉGICO
        │
        ▼
      Project Adapter             ← DISCOVER (no hardcoded paths)
        │
        ├── DISCOVER
        ├── LOAD
        ├── VALIDATE
        ├── BUILD
        └── DELIVER
              │
              ▼
         Product Context
              │
              ▼
         Runtime Profile (stub)
              │
              ▼
         PLAN (SDL)
              │
              ▼
         BUILD (AEL)
              │
              ▼
         CLOSED → DISCARD
```

---

## 5. Fallback Compatibility

| Scenario | Adapter behavior |
|---|---|
| `PROJECT_CONTEXT.md` found | Loaded as primary source |
| `PROJECT_CONTEXT.md` not found | Adapter searches for alternative context files |
| No context file at all | Fallback: direct document reading (existing behavior) |
| Context incomplete | Warnings emitted. Mission proceeds with partial context. |
| Tactical task | Adapter NOT activated. No context loaded. |

**AITOS is not broken.** The adapter discovers `docs/project/PROJECT_CONTEXT.md` dynamically and produces the same result as the hardcoded reference. PLAN, BUILD, and all subagents remain untouched.

---

## 6. Validation Results

| Check | Result |
|---|---|
| Scope Gate first | ✅ Line 22 (Scope Gate) → Line 58 (Project Adapter) |
| All 6 stages present | ✅ DISCOVER, LOAD, VALIDATE, BUILD, DELIVER, DISCARD |
| No hardcoded product path | ✅ `docs/project/PROJECT_CONTEXT.md` not referenced |
| Tactical skips adapter | ✅ "No actives el Project Adapter" rule active |
| Fallback documented | ✅ "Si no existe" → direct reading |
| Adapter rule in rules section | ✅ "No asumas ubicaciones fijas" |
| JSON validity | ✅ PASS |
| PLAN integrity | ✅ "Eres PLAN, la interfaz estratégica de ARNÉS" |
| BUILD integrity | ✅ "Eres BUILD, la interfaz operacional de ARNÉS" |
| Enforcement (R1-R4) | ✅ PASS |

---

## 7. Deployment Blueprint Progress

| Stage | Status |
|---|---|
| Stage 1: BOOTSTRAP | ✅ COMPLETED |
| Stage 2A: Product Context | ✅ COMPLETED |
| **Stage 2B: Project Adapter** | **✅ COMPLETED** |
| Stage 3: ENFORCEMENT DECOUPLING | ⬜ Pending |
| Stage 4: RUNTIME ACTIVATION | ⬜ Pending |
| Stage 5: OPERATIONAL VALIDATION | ⬜ Pending |

---

## 8. Next Step

> **Stage 3: ENFORCEMENT DECOUPLING** — Parametrizar el sistema de enforcement (`CONTRACTS.md` + `enforce.sh`) para que no dependa de paths de AITOS. Crear `product-rules.json` y `product-rules.schema.json`. Verificar equivalencia de output.

**Rationale:** Con Product Context y Project Adapter activos, ARNÉS ya no sabe cómo está organizado AITOS. Pero `enforce.sh` todavía verifica paths hardcodeados de AITOS (`src/lib/ai/`, `src/lib/services/`). Stage 3 elimina este último acoplamiento estructural.

---

> **Stage 2B completed.** ARNÉS ahora interactúa con los productos a través del Project Adapter en lugar de asumir ubicaciones fijas de documentos. El ciclo DISCOVER→LOAD→VALIDATE→BUILD→DELIVER→DISCARD está implementado como protocolo del agente ARNÉS. El adapter descubre dinámicamente dónde está el contexto del producto, lo valida, lo estructura y lo entrega a PLAN — sin que ARNÉS conozca la organización interna de AITOS. El fallback a lectura documental directa se mantiene para productos sin Product Context formal. El Scope Gate preserva la economía cognitiva para tareas tácticas.
