# Development Ecosystem Alignment Report — CGP-2 Phase 1

> **Programa:** Constitutional Governance Program — Phase 2  
> **Propósito:** Auditar el ecosistema de desarrollo (no el producto AITOS) para verificar que todas las herramientas, agentes y documentos de trabajo respetan la nueva jerarquía documental.  
> **Naturaleza:** Solo lectura. No se modificaron archivos.  
> **Fecha:** 2026-07-21  

---

## 1. Ecosystem Inventory

| Category | Component | Path | Files | Type |
|----------|-----------|------|-------|------|
| **Config** | opencode.json | `opencode.json` | 1 | JSON config |
| **Primary agents** | BUILD prompt | `.opencode/agents/build.md` | 1 | Prompt |
| **Primary agents** | PLAN prompt | `.opencode/agents/plan.md` | 1 | Prompt |
| **Subagents** | AEL roles (opencode.json) | `opencode.json` agent definitions | 6 | Config |
| **Commands** | AEL commands | `.opencode/commands/` | 9 | Prompts |
| **Government** | AEL organization | `ael/government/ORGANIZATION.md` | 1 | Docs |
| **Government** | AEL roles | `ael/government/roles/` | 6 | Docs |
| **AEL constitution** | SPEC | `ael/constitution/SPEC.md` | 1 | Docs |
| **AEL constitution** | Contracts | `ael/constitution/CONTRACTS.md` | 1 | Docs |
| **AEL contracts redirect** | (legacy) | `ael/contracts/CONTRACTS.md` | 1 | Redirect |
| **Contract scripts** | enforce.sh, diagnose.sh | `ael/contracts/` | 2 | Scripts |
| **AI Context Pack** | Agent docs | `docs/ai/` | 8 | Docs |
| **Skills** | Third-party skills | `.agents/skills/` | 8 dirs | Skills |
| **Memory** | Anchored summary | `.opencode/memory/MEMORY.md` | 1 | Docs |
| **AITOS Constitution** | Authority | `docs/architecture/AITOS_CONSTITUTION.md` | 1 | Docs |

---

## 2. Authority Matrix by Component

| Component | Authority Claimed | Docs Referenced | References AITOS CONST? | References deprecated docs? | Compatible? |
|-----------|------------------|-----------------|------------------------|---------------------------|-------------|
| **BUILD prompt** (build.md) | "Interfaz operacional de AITOS" | `ael/constitution/SPEC.md` (como "Constitución"), `ael/constitution/CONTRACTS.md`, `ael/government/ORGANIZATION.md`, `ael/government/roles/` | ❌ No | ❌ Sí — trata `ael/constitution/SPEC.md` como "la Constitución", cuando la verdadera Constitución es `docs/architecture/AITOS_CONSTITUTION.md` | ⚠️ Parcial |
| **PLAN prompt** (plan.md) | "Interfaz estratégica de AITOS" | SDL contract (implícito) | ❌ No | ❌ No referencias explícitas | ⚠️ Parcial |
| **ael-plan command** | "Director del ARNÉS" | `ael/constitution/SPEC.md` ("Tu Constitución"), `ael/government/ORGANIZATION.md` | ❌ No | ❌ Misma referencia incorrecta | ❌ Incompatible |
| **ael-explore command** | "Explorer del ARNÉS" | `ael/government/roles/02-explorer.md` | ❌ No | ❌ No | ✅ Genérico |
| **ael-architect command** | "Architect del ARNÉS" | `ael/government/roles/03-architect.md` | ❌ No | ❌ No | ✅ Genérico |
| **ael-implement command** | "Implementer del ARNÉS" | `ael/government/roles/04-implementer.md` | ❌ No | ❌ No | ✅ Genérico |
| **ael-validate command** | "Auditor del ARNÉS" | `ael/government/roles/05-auditor.md` | ❌ No | ❌ No | ✅ Genérico |
| **ael-remember command** | "Keeper del ARNÉS" | `ael/government/roles/06-memory.md` | ❌ No | ❌ No | ✅ Genérico |
| **ael-learn command** | "Analyst del ARNÉS" | `ael/government/roles/07-learning.md` | ❌ No | ❌ No | ✅ Genérico |
| **ael-diagnose command** | "Medico del ARNES" | Ninguno (ejecuta diagnose.sh) | ❌ No | ❌ No | ✅ Genérico |
| **ael-enforce command** | — | Ninguno (ejecuta enforce.sh) | ❌ No | ❌ No | ✅ Genérico |
| **ael-design command** | "Architect del ARNÉS" | `ael/government/roles/03-architect.md` | ❌ No | ❌ No | ✅ Genérico |
| **ORGANIZATION.md** | "Government level" | `ael/constitution/SPEC.md` ("La Constitución") | ❌ No — cita `ael/constitution/SPEC.md` como "la Constitución" | ❌ Sí | ❌ Incompatible |
| **Role contracts (02-07)** | Capability contracts | None (abstractos) | ❌ No | ❌ No | ✅ Genéricos |
| **ael/constitution/SPEC.md** | "ARNÉS Operational Specification" | None | ❌ No | ❌ No | ⚠️ Específico de AEL, no reclama autoridad sobre producto |
| **ael/constitution/CONTRACTS.md** | "AEL Contracts" | None | ❌ No | ❌ No | ⚠️ Específico de AEL |
| **ael/contracts/CONTRACTS.md** | "Redirect" | `ael/constitution/CONTRACTS.md` | ❌ No | ❌ No (es un redirect) | ✅ |
| **ARCHITECTURE_BIBLE.md** | "Canonical source of architectural truth"; "If this document contradicts any other document, this document prevails" | ADRs, code files | ❌ No | ❌ No | ❌ **CRÍTICO** — contradice directamente CONST §1.3 |
| **ARCHITECTURE_RULES.md** | "Strict rules derived from the code" | ADRs, code files | ❌ No | ❌ No | ⚠️ No referencias, no contradice |
| **INVARIANTS.md** | "Invariants must remain true" | ADRs, code files | ❌ No | ❌ No | ⚠️ No referencias, no contradice |
| **ENGINE_CONTRACTS.md** | "Contracts between engines" | None | ❌ No | ❌ No | ✅ No reclama autoridad |
| **DECISION_TREE.md** | "Decision tree from code" | Code files | ❌ No | ❌ No | ✅ Documentación técnica |
| **QUALITY_GATE.md** | "Checklist for modifications" | ADRs, code files | ❌ No | ❌ No | ⚠️ No incluye verificar contra CONST |
| **COMMON_FAILURES.md** | "Mistakes AI agents make" | Code files | ❌ No | ❌ No | ✅ Documentación técnica |
| **docs/ai/README.md** | "AI Context Pack" | ARCHITECTURE_BIBLE.md | ✅ **SÍ** — tras CGP-1 Phase 4C | ❌ No | ✅ Actualizado |

---

## 3. Inconsistencies Found

### 🔴 CRITICAL — I-01: ARCHITECTURE_BIBLE claims supremacy over all documents

**File:** `docs/ai/ARCHITECTURE_BIBLE.md` lines 4-6  
**Statement:** "This document is the canonical source of architectural truth... If this document contradicts any other document, this document prevails"  
**Problem:** This directly contradicts AITOS_CONSTITUTION.md §1.3: "máxima autoridad normativa del sistema"  
**Impact:** Any AI agent reading ARCHITECTURE_BIBLE.md first (as instructed by docs/ai/README.md) will treat it as supreme, bypassing the Constitution.  
**Severity:** 🔴 Critical — fundamental hierarchy violation  

### 🔴 CRITICAL — I-02: ARCHITECTURE_BIBLE reading order excludes Constitution

**File:** `docs/ai/ARCHITECTURE_BIBLE.md` Section 10 (lines 294-305)  
**Statement:** "After this file, read in this order: 1. ARCHITECTURE_RULES.md 2. ENGINE_CONTRACTS.md ..."  
**Problem:** The AITOS Constitution is not in the reading order. AI agents following this order will never read the Constitution.  
**Impact:** AI agents remain unaware of the Constitution's existence and supremacy.  
**Severity:** 🔴 Critical — agents don't know about the Constitution  

### 🟡 HIGH — I-03: BUILD agent treats ael/constitution/SPEC.md as "la Constitución"

**File:** `.opencode/agents/build.md` lines 36-39  
**Statement:** "Constitución: `ael/constitution/SPEC.md` — invariants, principles, lifecycle constraints."  
**Problem:** After CGP-1, the real Constitution is `docs/architecture/AITOS_CONSTITUTION.md`. The BUILD prompt's "Sources of Truth" are all AEL-level documents and don't include the AITOS Constitution.  
**Impact:** BUILD operates under AEL rules but is unaware of the supreme product Constitution.  
**Severity:** 🟡 High — operational agent has wrong authority reference  

### 🟡 HIGH — I-04: ORGANIZATION.md cites wrong constitution file

**File:** `ael/government/ORGANIZATION.md` line 51  
**Statement:** "La Constitución (`ael/constitution/SPEC.md`) define qué debe cumplirse."  
**Problem:** References the AEL constitution, not the AITOS Constitution.  
**Impact:** Any reader (human or agent) of ORGANIZATION.md will be directed to the wrong source of truth.  
**Severity:** 🟡 High — wrong pointer to authority  

### 🟡 HIGH — I-05: ael-plan command cites wrong constitution

**File:** `.opencode/commands/ael-plan.md` line 5  
**Statement:** "Tu Constitución está en `ael/constitution/SPEC.md`."  
**Problem:** Same as I-04. The "Director" agent references the wrong constitution.  
**Severity:** 🟡 High — agent operates with wrong fundamental reference  

### 🟡 HIGH — I-06: QUALITY_GATE does not verify against Constitution

**File:** `docs/ai/QUALITY_GATE.md`  
**Problem:** The quality checklist includes verification against ADRs, invariants, rules, but NOT against the AITOS Constitution. Changes could violate constitutional provisions without detection.  
**Severity:** 🟡 High — enforcement gap  

### 🟡 MEDIUM — I-07: ARCHITECTURE_BIBLE does not reference Constitution

**File:** `docs/ai/ARCHITECTURE_BIBLE.md`  
**Problem:** Despite being updated 2026-07-06 (after CGP-0 started), the Architecture Bible doesn't reference the Constitution.  
**Impact:** Perpetuates the old hierarchy where the Bible was the top document.  
**Severity:** 🟡 Medium — omission perpetuates outdated hierarchy  

### 🟡 MEDIUM — I-08: ael-explore model name typo in opencode.json

**File:** `opencode.json` line 50  
**Value:** `"model": "opencode/DeepSeek V4 Flash Freeh"`  
**Problem:** Model name has typo "Freeh" instead of "Free". May cause fallback to default model, reducing capability for the Explorer subagent.  
**Severity:** 🟡 Medium — impacts subagent availability  

### 🟢 LOW — I-09: AI Context Pack reading order doesn't promote Constitution

**File:** `docs/ai/README.md` (now includes CONST reference, after CGP-1 4C update)  
**Detail:** README.md correctly says "read the Constitution first" but the rest of the Context Pack files don't reference it internally.  
**Severity:** 🟢 Low — README is correct, individual files aren't  

### 🟢 LOW — I-10: No subagent validates against Constitution

**Detail:** None of the 6 AEL subagents (explore, architect, implementer, audit, memory, learning) include the AITOS Constitution in their authority references or validation scope.  
**Severity:** 🟢 Low — agents are generic capability executors; the Constitution check should be at BUILD/PLAN level  

---

## 4. Risks

| # | Risk | Severity | Current state | Notes |
|---|------|----------|--------------|-------|
| R-01 | AI agent modifies code violating Constitutional invariants | **Critical** | No agent validates against CONST | ARCHITECTURE_BIBLE claims supremacy; agents never read CONST |
| R-02 | Constitutional principles ignored in operational decisions | **Critical** | BUILD agent references wrong constitution | BUILD delegates to subagents that don't know CONST exists |
| R-03 | New developers/admins read wrong hierarchy | **High** | ORGANIZATION.md, build.md point to wrong constit | Anyone reading "how the system works" gets directed to AEL SPEC, not AITOS CONST |
| R-04 | Quality checks miss constitutional violations | **High** | QUALITY_GATE.md has no CONST check | Changes can violate INV-01..INV-20 or CC-01..CC-17 without detection |
| R-05 | ARCHITECTURE_BIBLE "prevails" claim causes insoluble contradictions | **High** | Bible claims supremacy; CONST claims supremacy | Agent forced to pick one: whichever it reads first wins |
| R-06 | ael-explore subagent may not load | **Medium** | Model name typo in opencode.json | getaddrinfo ENOTFOUND on model name → fallback to default |
| R-07 | AEL-level roles duplicating CONST-level governance | **Low** | Roles are abstract — no overlap detected | Risk if roles are later expanded to include product decisions |

---

## 5. Aligned Components

These components are compatible with the Constitution hierarchy and need no changes:

| Component | Reason |
|-----------|--------|
| `ael/contracts/CONTRACTS.md` (redirect) | Properly redirects to canonical source |
| `ael/contracts/enforce.sh` | Enforces ADR-level contracts; doesn't claim authority |
| `ael/contracts/diagnose.sh` | Diagnostics tool; no authority claim |
| `ael/constitution/SPEC.md` | AEL operational spec — governs the *development process*, not the *product*. Legitimate as-is. |
| `ael/constitution/CONTRACTS.md` | AEL contract rules — same reasoning. |
| `ael/government/roles/02-explorer.md` | Generic capability contract. No authority claim. |
| `ael/government/roles/03-architect.md` | Same |
| `ael/government/roles/04-implementer.md` | Same |
| `ael/government/roles/05-auditor.md` | Same |
| `ael/government/roles/06-memory.md` | Same |
| `ael/government/roles/07-learning.md` | Same |
| `docs/ai/ENGINE_CONTRACTS.md` | Technical engine contracts; no authority claim |
| `docs/ai/DECISION_TREE.md` | Technical documentation |
| `docs/ai/COMMON_FAILURES.md` | Technical documentation |
| `docs/ai/README.md` | ✅ Already updated in CGP-1 Phase 4C |
| `.opencode/memory/MEMORY.md` | Mission memory; no authority claim |
| `.agents/skills/` | Third-party skills; orthogonal to hierarchy |
| PLAN prompt (`plan.md`) | Strategic level; doesn't reference product docs directly |

---

## 6. Components Requiring Changes

| # | Component | Change Required | Priority | Effort |
|---|-----------|----------------|----------|--------|
| C-01 | `docs/ai/ARCHITECTURE_BIBLE.md` | Replace "canonical source of architectural truth" and "If this document contradicts any other document, this document prevails" with statement of subordination to CONST. Add CONST reference in reading order (Section 10) as item #0. | **P0** | Low (header only) |
| C-02 | `.opencode/agents/build.md` | Add `docs/architecture/AITOS_CONSTITUTION.md` as primary "Source of Truth" (before `ael/constitution/SPEC.md`). Clarify: AEL SPEC governs development process; AITOS CONST governs product. | **P0** | Low (2-line addition) |
| C-03 | `.opencode/commands/ael-plan.md` | Update "Tu Constitución está en `ael/constitution/SPEC.md`" to reference AITOS CONST first, AEL SPEC second. | **P1** | Low (1-line change) |
| C-04 | `ael/government/ORGANIZATION.md` | Update line 51 to reference `docs/architecture/AITOS_CONSTITUTION.md` as the product constitution, `ael/constitution/SPEC.md` as AEL's operational spec. | **P1** | Low (1-line change) |
| C-05 | `docs/ai/QUALITY_GATE.md` | Add Constitutional checks: "No violation of AITOS CONST invariants (INV-01..INV-20)", "No contradiction with CC principles" | **P1** | Low (4-line addition) |
| C-06 | `docs/ai/ARCHITECTURE_BIBLE.md` §10 | Add `docs/architecture/AITOS_CONSTITUTION.md` as reading item #0 | **P1** | Low (1-line addition) |
| C-07 | `docs/ai/ARCHITECTURE_RULES.md` | Add header note: "These rules are subordinate to the AITOS Constitution (docs/architecture/AITOS_CONSTITUTION.md)" | **P2** | Low (1-line addition) |
| C-08 | `docs/ai/INVARIANTS.md` | Add header note referencing CONST invariants as superset | **P2** | Low (1-line addition) |
| C-09 | `opencode.json` line 50 | Fix model name: `"opencode/DeepSeek V4 Flash Freeh"` → `"deepseek-v4-flash-free"` | **P2** | Trivial |
| C-10 | `ael/government/roles/*.md` | Add optional `docs/architecture/AITOS_CONSTITUTION.md` reference in "Input" section where applicable | **P3** | Low |

**Total: 10 changes required (2 P0, 4 P1, 3 P2, 1 P3)**

---

## 7. Recommendations for CGP-2 Phase 2

1. **Fix P0 issues first** — ARCHITECTURE_BIBLE supremacy claim and BUILD prompt reference. These are the two points where the hierarchy breaks in practice.

2. **No new documents needed** — All changes are edits to existing files (headers, references, reading order). No new files required.

3. **One-shot execution** — All changes are low-effort (header lines, reference updates). Can be executed in a single phase without sub-phases.

4. **Re-validate after changes** — After Phase 2, verify:
   - No document claims supremacy over the Constitution
   - Every agent prompt references the Constitution directly or indirectly
   - The reading order for AI agents begins with the Constitution
   - Quality gates include constitutional validation

5. **Model name fix** — The `ael-explore` model typo should be fixed during Phase 2 as it affects subagent availability.

---

## 8. Summary

| Metric | Count |
|--------|-------|
| Components audited | 37 |
| Aligned components | 19 |
| Components requiring changes | 10 |
| Inconsistencies found | 10 |
| 🔴 Critical inconsistencies | 2 |
| 🟡 High inconsistencies | 4 |
| 🟡 Medium inconsistencies | 2 |
| 🟢 Low inconsistencies | 2 |
| Estimated effort for Phase 2 | Very low (all changes are 1-4 line edits) |

> **Estado:** CGP-2 Phase 1 completa. El ecosistema requiere 10 ajustes en Phase 2 para alinearse completamente con la jerarquía constitucional.
> 
> **Hallazgo principal:** La ARCHITECTURE_BIBLE sigue siendo el documento que los agentes leen primero y la que reclama supremacía. Hasta que esto se corrija, la Constitución no será efectiva en la práctica operacional.
