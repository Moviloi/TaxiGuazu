# Documentation Governance — AITOS

> Rules for keeping the architecture documentation accurate, consistent, and alive.
> This document is the contract between the architecture team and everyone who
> edits documentation.

---

## Principles

1. **The code is the ultimate source of truth.** Documentation describes the code.
2. **The architecture documentation describes only the present state.** History
   lives in Git and, when explicitly needed, in `docs/history/`.
3. **Generated files must not be edited by hand.** They are regenerated from
   scripts.
4. **Manual files must be kept in sync with the code.** When code changes,
   documentation must be reviewed.
5. **No conceptually temporary names.** No versions, phases, stages, iterations,
   or gap numbers in the architecture documentation.

---

## Document Naming Convention

Every document filename in the repository must represent the **function** of the
document, never its **state** or **version**. This applies to all directories
— `docs/`, `ael/`, `tests/`, and any other location containing documentation or
specifications.

### Rule 1 — Name declares function, not status

A filename describes *what the document is about*, not *where it is in its
lifecycle*.

```
✅ CORRECT:
  ARCHITECTURE_BIBLE.md         → Describe la biblia arquitectónica
  ENGINE_CONTRACTS.md           → Describe los contratos entre motores
  CONVERSATION_STATE_MACHINE.md → Describe la máquina de estados
  PR-QA2B_CONVERSATIONAL_STATE_FORENSICS.md → Informe de auditoría específica

❌ INCORRECT:
  ARCHITECTURE_BIBLE_DRAFT.md       → "DRAFT" es estado, no función
  ARCHITECTURE_BIBLE_FINAL.md       → "FINAL" es estado, no función
  ARCHITECTURE_BIBLE_v2.md          → "v2" es versión, no función
  ARCHITECTURE_BIBLE_new.md         → "new" es estado transitorio
  ARCHITECTURE_BIBLE_old.md         → "old" es estado, no función
  ARCHITECTURE_BIBLE_review.md      → "review" es estado del proceso
  CONTRACTS_tmp.md                  → "tmp" es estado transitorio
  CONTRACTS_copy.md                 → "copy" implica duplicación
  CONTRACTS_test.md                 → "test" es estado, no función
  CONVERSATION_STATE_MACHINE_final-final.md → Redundancia de estado
```

### Rule 2 — Prohibited suffixes and prefixes

The following tokens must not appear in document filenames:

| Token | Reason |
|-------|--------|
| `draft` | El borrador es un commit, no un archivo |
| `final` | Lo "final" es el estado en Git tras el merge |
| `final-final` | Variante de `final` |
| `new` | Un archivo nuevo se crea una vez; el nombre persiste |
| `old` | Lo "antiguo" se preserva en Git, no en el nombre |
| `review` | La revisión es un estado del PR, no del archivo |
| `tmp`, `temp` | Nunca se commitean archivos temporales |
| `test` | No es función del documento (salvo que el documento sea sobre testing) |
| `copy` | Nunca debe haber copias no canónicas |
| `v2`, `v3`, etc. | El versionado es responsabilidad de Git |
| `_backup` | Los respaldos son responsabilidad de Git |
| `_original` | El original es el primer commit, no un archivo |
| `working` | El trabajo en progreso vive en ramas, no en nombres |
| `deprecated` | Lo deprecado se elimina o se mueve a `docs/history/` |

Exception: A document whose **topic** is about a version (e.g., a migration
guide from v1 to v2, or a changelog entry describing version N) may include
version identifiers in its **content**, but never in its **filename**.

### Rule 3 — Evolution is tracked by Git, not by filenames

When a document's content changes:

1. **Edit the same file.** Do not create `-v2` or `-new` variants.
2. **Use descriptive commit messages** that explain what changed and why.
3. **Update the document's internal version** (if it has one) or its "Last
   updated" field.
4. **Reference the change in `CHANGELOG.md`** if it is significant.
5. **If the document describes a superseded architecture**, move it to
   `docs/history/` with a date-stamped filename (e.g.,
   `ARCHITECTURE_BASELINE_2026-07-06.json`). This is the **only** case where
   a date or version identifier is permitted in a filename, and even then only
   under `docs/history/`.

### Rule 4 — Each concept has exactly one canonical document (SSOT)

No two files may describe the same concept. If information appears in multiple
files, one must reference the other as its source.

```
✅ CORRECT:
  docs/SYSTEM_BIBLE.md                        → Fuente única de misión/alcance
  docs/ai/ARCHITECTURE_BIBLE.md               → Fuente única de invariantes/principios
  docs/ai/ARCHITECTURE_RULES.md               → Fuente única de reglas
  docs/ai/ENGINE_CONTRACTS.md                        → Fuente única de contratos entre motores

❌ INCORRECT:
  docs/architecture/rules.md                  → Compite con ARCHITECTURE_RULES.md
  docs/ai/rules.md                            → Compite con ARCHITECTURE_RULES.md
  docs/project/ARCHITECTURE_RULES_COPY.md     → "COPY" viola Rule 2 + SSOT
```

When a document needs to reference another concept, it must link to the
canonical document rather than duplicating its content.

### Rule 5 — New documents follow the same convention

When adding a new document to the repository:

1. Choose a name that describes the document's **permanent function**.
2. Do not include `draft`, `tmp`, `WIP`, or any temporary label — even during
   development. The branch name is sufficient to indicate work-in-progress.
3. Register the document in the relevant index or table of contents.
4. If the document may be superseded in the future, the name should still
   describe its function; the superseded copy moves to `docs/history/` with a
   date stamp at that future time, not preemptively.

### Rule 6 — Document Identity

The identity of a document is determined by the **concept** it represents,
not by the version of its content. As long as the concept remains valid, the
same file must evolve through successive commits and never through the creation
of V2, FINAL, DRAFT or other variant files.

```
✅ CORRECT:
  docs/ai/ARCHITECTURE_RULES.md recibe una nueva regla →
    Se edita ARCHITECTURE_RULES.md (mismo archivo, commit nuevo)

❌ INCORRECT:
  docs/ai/ARCHITECTURE_RULES.md cambia →
    Se crea ARCHITECTURE_RULES_v2.md  ← viola identidad
    Se crea ARCHITECTURE_RULES_FINAL.md  ← viola identidad
    Se crea ARCHITECTURE_RULES_DRAFT.md  ← viola identidad
```

A document should only receive a new name when its **concept** changes —
for example, when a policy document is split into two documents each covering
a distinct concern, or when a specification is superseded by a new one that
replaces its conceptual scope. In those cases, the old file moves to
`docs/history/` with a date stamp, and the new file reflects the new concept.

### Exceptions

The following artifact types are exempt from the naming convention rules above:

| Artifact type | Reason for exception |
|---------------|---------------------|
| **Numbered ADRs** (`ADR-001.md`, `ADR-002.md`, ...) | The sequential number is a permanent identifier, not a version. It forms part of the document's function (traceable decision record). New ADRs supersede older ones by reference, not by renaming. |
| **Historical documents** (`docs/history/*`) | These are immutable snapshots. Date stamps (e.g., `ARCHITECTURE_BASELINE_2026-07-06.json`) are permitted because the file's function is to preserve a point-in-time record. |
| **External normative standards** (RFC, ISO, etc.) | When a document is named after an external standard, the standard's own identifier is part of its function, not a version label (e.g., `RFC-8259.md` describes the JSON standard; the number is the standard's designation, not a revision of the document). |
| **Test files** (`*.test.ts`, `*.integration.test.ts`, `*.e2e.test.ts`, `*.performance.test.ts`) | The `.test` suffix and its qualifiers (`integration`, `e2e`, `performance`) are part of the file's semantic type, not a version or state indicator. They describe *what kind* of artifact the file is (see "Naming Convention by Artifact Type" below). |

### Examples applied to existing files

```
EXISTING (correct):
  docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md
    → "FUNCTIONAL_BEHAVIOR_SPECIFICATION" describe la función (especificación de
       comportamiento funcional). Sin estado ni versión en el nombre.

EXISTING (correct):
  docs/certification/PR-QA2B_CONVERSATIONAL_STATE_FORENSICS.md
    → "PR-QA2B" es un identificador de misión (no una versión del documento).
       "CONVERSATIONAL_STATE_FORENSICS" describe la función. Correcto.

HYPOTHETICAL (incorrect):
  docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION_DRAFT.md
    → Violación: "DRAFT" es estado, no función.

HYPOTHETICAL (incorrect):
  docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION_v2.md
    → Violación: "v2" es versión, no función. Git registra la evolución.
```

---

## Naming Convention by Artifact Type

The following rules define how each artifact type in the repository should be
named. Each type has its own semantics; the general principles (function over
status, identity over version) adapt to each context.

### 1. Documentation

- Names represent the **permanent function** of the document.
- Never include states, versions or temporal qualifiers.
- Governed by the full "Document Naming Convention" section above.

### 2. Source code

- Names represent the **responsibility** of the component.
- A file named `pricing-engine.ts` indicates its responsibility is pricing.
- A file named `lead.service.ts` indicates its responsibility is lead orchestration.
- Refactoring a component's responsibility should rename the file; adding a new
  capability to an existing component should keep the same file.

### 3. Tests

Test files must follow the standard project convention:

| Pattern | Purpose |
|---------|---------|
| `<component>.test.ts` | Unit tests for `<component>` |
| `<component>.integration.test.ts` | Integration tests (real DB, real LLM, etc.) |
| `<component>.e2e.test.ts` | End-to-end tests (full pipeline) |
| `<component>.performance.test.ts` | Performance/load tests |

The `.test` suffix and its qualifiers (`integration`, `e2e`, `performance`)
are part of the file's **semantic type**, not a version or state indicator.
They describe *what kind of validation* the file performs. As such, they are
**exempt** from the general prohibition against state-like suffixes in the
"Document Naming Convention" section.

```
✅ CORRECT:
  extraction-runner.test.ts          → Tests unitarios de extraction-runner
  simulate.int.test.ts               → Test de integración (simulación)
  CATS-001-020-conversational-invariants.test.ts → Tests de invariantes

❌ INCORRECT:
  extraction-runner-FINAL.test.ts    → "FINAL" no describe tipo de test
  extraction-runner-v2.test.ts       → "v2" no es tipo de test
  extraction-runner.test.DRAFT.ts    → "DRAFT" no describe tipo de test
```

### 4. Scripts

- Names represent the **action** the script performs.
- Use verb-based names: `seed`, `migrate`, `validate`, `export`, `report`,
  `generate-graphs`, `detect-drift`.
- Do not include execution order or phase numbers in the filename unless the
  script's function depends on a specific sequence (e.g., migration scripts
  `001_initial_schema.sql`, `002_add_users.sql`). In those cases, the sequence
  number is part of the script's function, not a version.

### 5. Experimental artifacts

- Experimental code must not be mixed with production code.
- Place experiments in a directory explicitly designated for exploration
  (e.g., a `sandbox/` or `experimental/` directory at the repository root or
  within the relevant module).
- Experimental artifacts must be removed or promoted to production quality
  before merging into the main branch.
- A file named `experimental-pricing-model.ts` is acceptable **only** if it
  lives under an `experimental/` directory. If moved to `src/`, it must be
  renamed to reflect its production responsibility (e.g., `pricing-model.ts`).

---

## Documentation Taxonomy

Every document in the repository belongs to a **document type** that defines its
purpose, authority, and relationship to other documents. This taxonomy is
normative: the type of a document determines what it may contain, what authority
it carries, and how it must be treated by readers and automated processes.

### Hierarchy

The types form a **conceptual dependency chain**. Each type in the chain depends
on the types that precede it:

```
Tier 0  (Foundational)        Constitution → Vocabulary → Invariant
                                  ↓
Tier 1  (Functional)               Specification
                                  ↓
Tier 2  (Conceptual)               Ontology
                                  ↓
Tier 3  (Structural)               Architecture → ADR → Policy
                                  ↓
Tier 4  (Interface)                Contract
                                  ↓
Tier 5  (Evidence/Reference)       Audit → Certification → Reference → Guideline
```

Two types operate **cross-cutting** across all tiers and are placed at
Constitutional level because their rules apply vertically:

| Type | Tier | Scope |
|------|------|-------|
| Governance | Tier 1 (Constitutional) | Binds all documentation work at every level |
| Standard | Tier 1 (Constitutional) | Mandatory compliance for all artifacts |

### Type definitions

---

### Constitution

| Aspect | Definition |
|--------|------------|
| **Purpose** | Founding document that establishes the fundamental principles, scope, values, and inviolable rules of the system or a subsystem. A Constitution is the highest authority within its domain. |
| **Hierarchical level** | Tier 0 (Foundational) — cannot be contradicted by any other document. |
| **When to use** | When defining the identity, mission, core principles, or non-negotiable rules of the system, a team, or a governance body. |
| **When NOT to use** | Do not use for detailed technical specifications, implementation guides, or transient decisions. A Constitution must be stable and change only through rigorous process. |
| **Real examples** | `docs/SYSTEM_BIBLE.md`, `ael/artifacts/01-CONSTITUTION.md` |

---

### Specification

| Aspect | Definition |
|--------|------------|
| **Purpose** | Detailed, precise description of what a system or component does — its functional behavior, inputs, outputs, states, and observable outcomes. A Specification answers "what" without prescribing "how." |
| **Hierarchical level** | Tier 1 (Functional) — defines functional behavior using Vocabulary terms; the Ontology formalizes its concepts. |
| **When to use** | When defining the expected behavior of a feature, system, or integration point. When a developer or tester needs an unambiguous reference for correct behavior. |
| **When NOT to use** | Do not use for design rationale, implementation details, or architectural principles. A Specification does not explain *why* a behavior exists, only *what* it is. |
| **Real examples** | `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` |

---

### Architecture

| Aspect | Definition |
|--------|------------|
| **Purpose** | Structural and design documentation that describes the system's components, their relationships, boundaries, and the principles that govern their interaction. Architecture documents capture the design decisions that shape the system. |
| **Hierarchical level** | Tier 3 (Structural) — designs the system structure based on the concepts formalized by the Ontology and the behavior defined by the Specification. |
| **When to use** | When documenting the system's structure, layers, modules, data flow, dependency rules, or design patterns. When an engineer needs to understand how the system is built and why. |
| **When NOT to use** | Do not use for behavioral specifications, operational runbooks, or project management content. Architecture describes the *structure*, not the *behavior* or the *process*. |
| **Real examples** | `docs/ai/ARCHITECTURE_BIBLE.md`, `docs/architecture/operational-model.md`, `docs/architecture/bounded-contexts.md` |

---

### ADR (Architecture Decision Record)

| Aspect | Definition |
|--------|------------|
| **Purpose** | A permanent, timestamped record of a significant architectural decision, including its context, options considered, rationale, and consequences. ADRs are the traceable history of why the system is the way it is. |
| **Hierarchical level** | Tier 3 (Structural) — documents decisions made during architectural design; a new ADR can supersede a previous ADR. |
| **When to use** | When making a significant architectural decision that affects the system's structure, dependencies, or principles. When the decision needs to be traceable and reviewable. |
| **When NOT to use** | Do not use for trivial implementation choices, bug fixes, or decisions that are reversible without architectural impact. An ADR is for decisions that are costly to undo. |
| **Real examples** | `docs/adr/ADR-001.md` through `docs/adr/ADR-012.md` |

---

### Contract

| Aspect | Definition |
|--------|------------|
| **Purpose** | A formal agreement between two or more components, layers, or subsystems that defines their interface: inputs, outputs, preconditions, postconditions, invariants, error handling, and fallback behavior. Contracts are the "law" at component boundaries. |
| **Hierarchical level** | Tier 4 (Interface) — specifies component boundaries within the architectural design; implementation must comply. |
| **When to use** | When defining the interface between two system components, especially across layer boundaries (e.g., AI ↔ Services, or Engine ↔ Engine). When a component's obligations to its callers must be formally documented. |
| **When NOT to use** | Do not use for internal implementation details, behavioral specifications of a single component, or non-binding recommendations. A Contract is a binding interface agreement. |
| **Real examples** | `docs/ai/ENGINE_CONTRACTS.md` (engine-to-engine contracts), `ael/constitution/CONTRACTS.md` (governance layer contracts) |

---

### Governance

| Aspect | Definition |
|--------|------------|
| **Purpose** | Rules, processes, and conventions that govern how documentation, architecture, or development work is created, maintained, and evolved. Governance documents prescribe the *meta-rules* of the project. |
| **Hierarchical level** | Tier 1 (Constitutional) — cross-cutting: binds all documentation work at every tier; change requires governance process. |
| **When to use** | When defining conventions, workflows, validation checklists, or rituals that the team must follow. When the project needs a canonical reference for how things should be done. |
| **When NOT to use** | Do not use for technical architecture, behavioral specifications, or project plans. Governance is about *process*, not *product*. |
| **Real examples** | `docs/architecture/GOVERNANCE.md` (this document), `docs/architecture/DIAGRAMS.md` |

---

### Standard

| Aspect | Definition |
|--------|------------|
| **Purpose** | A normative reference that defines a required format, protocol, convention, or practice that the project must follow. Standards may be external (industry standards) or internal (project-wide conventions). |
| **Hierarchical level** | Tier 1 (Constitutional) — cross-cutting: mandatory compliance for all artifacts across every tier. |
| **When to use** | When the project needs to adopt an external specification (RFC, ISO, W3C) as a binding requirement, or when an internal convention needs the force of a standard rather than a mere guideline. |
| **When NOT to use** | Do not use for recommendations, best practices, or optional conventions. A Standard is mandatory. For non-mandatory practices, use Guideline instead. |
| **Real examples** | (None currently in the repository; external standards referenced internally, e.g., RFC-8259 for JSON) |

---

### Policy

| Aspect | Definition |
|--------|------------|
| **Purpose** | Decision rules that determine runtime behavior: what the system should do under specific conditions. Policies translate architectural principles into operational logic. |
| **Hierarchical level** | Tier 3 (Structural) — derives from architecture; constrains implementation. |
| **When to use** | When defining the rules that govern runtime decisions (e.g., pricing policy, dispatch policy, escalation policy). When a developer needs to know what business logic applies in a given scenario. |
| **When NOT to use** | Do not use for low-level implementation logic, database queries, or UI behavior. A Policy describes *decision rules*, not *execution steps*. |
| **Real examples** | `ael/artifacts/05-DECISION_MODEL.md` (captures decision policies), `ael/artifacts/06-COMMITMENT_MODEL.md` (commitment policies) |

---

### Audit

| Aspect | Definition |
|--------|------------|
| **Purpose** | A structured examination of a specific aspect of the system, codebase, or documentation, producing findings, risks, and recommendations. Audits are evidence-driven and time-bound. |
| **Hierarchical level** | Tier 5 (Evidence) — reports findings against Contracts and Architecture; does not prescribe architecture (but may recommend changes). |
| **When to use** | When performing a systematic review of a domain, component, or practice. When evidence needs to be collected, organized, and presented for decision-making. |
| **When NOT to use** | Do not use for ongoing documentation, permanent references, or design documents. An Audit is a point-in-time examination with a clear scope and findings. |
| **Real examples** | `docs/architecture/PR-10A_BOUNDARY_ONTOLOGY.md`, `ael/artifacts/AUDITORIA_07_CONSTITUCIONAL_INTEGRAL.md`, `ael/artifacts/AUDITORIA_TRANSVERSAL.md` |

---

### Certification

| Aspect | Definition |
|--------|------------|
| **Purpose** | An official attestation that a specific aspect of the system meets defined criteria, passes required tests, or complies with specified standards. Certifications are the result of a verification process. |
| **Hierarchical level** | Tier 5 (Evidence) — declares compliance against Contracts and Specifications; does not modify architecture. |
| **When to use** | When a verification process has been completed and the results need to be formally recorded. When a release, feature, or quality gate needs a compliance attestation. |
| **When NOT to use** | Do not use for exploratory analysis, partial findings, or work in progress. A Certification is a conclusive statement about a verified state. |
| **Real examples** | `docs/certification/PR-QA3_S2A_SINGLE_CORE_CERTIFICATION.md`, `docs/certification/PR-CATS-1_CONVERSATION_ACCEPTANCE_SUITE.md`, `docs/certification/PR-QA2B_CONVERSATIONAL_STATE_FORENSICS.md` |

---

### Reference

| Aspect | Definition |
|--------|------------|
| **Purpose** | A lookup document that organizes information for quick access. References index, catalog, or summarize information from other sources. They are the "map" to the project's knowledge. |
| **Hierarchical level** | Tier 5 (Reference) — derives from other documents; does not establish new authority. |
| **When to use** | When creating an index, glossary, catalog, directory, or map that helps readers find and navigate information. When a quick-reference lookup is needed. |
| **When NOT to use** | Do not use for normative definitions, binding rules, or original architectural content. A Reference points to authority; it is not an authority itself. |
| **Real examples** | `docs/architecture/ADR_INDEX.md`, `docs/architecture/glossary.md`, `docs/architecture/system-map.md`, `docs/architecture/knowledge-map.md` |

---

### Ontology

| Aspect | Definition |
|--------|------------|
| **Purpose** | A formal model of entities, their properties, relationships, and the axioms that govern them within a specific domain. An Ontology defines *what exists* in that domain and *how things relate* — it does NOT define the system's behavior. |
| **Hierarchical level** | Tier 2 (Conceptual) — formalizes the entities and relations implied by the Specification; the Architecture then designs structures that implement these concepts. |
| **When to use** | When a domain has well-defined entities with invariant relationships (e.g., the Evidence Engine's cognitive pipeline: Signal → Observation → Fact → Evidence → Belief → Decision). When formal reasoning about domain entities is required. |
| **When NOT to use** | Do not use for general glossaries, terminology lists, or non-formal concept descriptions. An Ontology must have explicit entity types, relation types, and constraints. For terminology without formal structure, use Vocabulary instead. |
| **Real examples** | `docs/certification/EVIDENCE_ONTOLOGY.md` (Evidence Engine cognitive ontology: entities with formal properties, invariants, and epistemic hierarchy) |

---

### Vocabulary

| Aspect | Definition |
|--------|------------|
| **Purpose** | A normative collection of term definitions that establishes the canonical meaning of every significant word used across the project. A Vocabulary is the "dictionary" of the project — it resolves ambiguity, forbids deprecated terms, and prescribes correct usage. |
| **Hierarchical level** | Tier 0 (Foundational) — all documents must use terms as defined in the Vocabulary; a term used differently is erroneous by definition. |
| **When to use** | When the project accumulates terminology debt (overloading, polysemy, ghost concepts) and needs a single authoritative source for what each term means. When onboarding new contributors who need to learn the project's language. |
| **When NOT to use** | Do not use for formal entity-relationship modeling (use Ontology instead). Do not use for project-specific jargon that has no cross-document impact. A Vocabulary is for terms that appear in multiple documents and need a single canonical definition. |
| **Real examples** | `ael/artifacts/SYSTEM_VOCABULARY.md` (normative vocabulary of the AITOS system, superseding scattered terminology from multiple sources) |

---

### Invariant

| Aspect | Definition |
|--------|------------|
| **Purpose** | A statement that must always hold true for the system to be correct. Invariants are non-negotiable properties that the architecture, code, and runtime behavior must preserve at all times. |
| **Hierarchical level** | Tier 0 (Foundational) — an invariant violation is a critical defect by definition. |
| **When to use** | When documenting a property that must never be violated, such as a layer dependency rule, a security constraint, or a data integrity guarantee. When the cost of violation is unacceptable. |
| **When NOT to use** | Do not use for recommendations, best practices, or properties that could reasonably change. An Invariant must be genuinely inviolable — if there is a valid exception, it is not an invariant. |
| **Real examples** | `docs/ai/INVARIANTS.md` (I1-I24: architectural invariants), `docs/certification/EVIDENCE_ONTOLOGY.md` (invariants embedded in entity definitions: S-1, O-1) |

---

### Guideline

| Aspect | Definition |
|--------|------------|
| **Purpose** | A recommended practice, convention, or heuristic that improves quality, consistency, or safety but is not strictly mandatory. Guidelines capture the team's collective wisdom without the force of a Standard or Invariant. |
| **Hierarchical level** | Tier 5 (Reference) — recommended but not required; deviations should be conscious and documented. |
| **When to use** | When documenting patterns that have proven beneficial, pitfalls to avoid, or conventions that improve readability and maintainability. When the team wants to share knowledge without creating a binding rule. |
| **When NOT to use** | Do not use for mandatory rules, compliance criteria, or non-negotiable properties. If a practice must always be followed, use Standard or Invariant instead. |
| **Real examples** | `docs/ai/QUALITY_GATE.md` (checklist for changes), `docs/ai/COMMON_FAILURES.md` (mistakes to avoid), `docs/architecture/design-principles.md` |

---

### Type uniqueness rule

> **Ningún documento nuevo podrá reutilizar uno de estos nombres para representar un concepto diferente.**

This means:
- A new file named `CONTRACTS.md` must represent a **Contract** as defined above.
- A new file named `SPECIFICATION.md` must represent a **Specification** as defined above.
- If a document's content does not match the type definition of its name, the document is misnamed and must be renamed or restructured.
- If a new type of document is needed that does not fit any existing type, a new type must be proposed and added to this taxonomy via the governance change process before the document is created.

---

## File categories

### Manual sources of truth

These files are written and maintained by humans. They are not generated.

| File | Owner | Update trigger |
|------|-------|----------------|
| `docs/SYSTEM_BIBLE.md` | Architecture lead | Mission, scope, or promise changes |
| `docs/ai/ARCHITECTURE_BIBLE.md` | Architecture lead | Invariants, principles, or AI rules change |
| `docs/ai/ARCHITECTURE_RULES.md` | Architecture lead | New rules or rule changes |
| `docs/ai/ENGINE_CONTRACTS.md` | Architecture lead | Engine contracts change |
| `docs/ai/INVARIANTS.md` | Architecture lead | Invariants change |
| `docs/adr/*.md` | Architecture lead | New permanent decisions |
| `docs/architecture/*.md` (conceptual docs) | Architecture lead | Domain, design, or capability changes |
| `docs/architecture/diagrams/*.mmd` | Engineers + Architecture lead | Architectural structure changes |
| `docs/architecture/DIAGRAMS.md` | Architecture lead | Diagram workflow changes |
| `docs/architecture/GOVERNANCE.md` | Architecture lead | Governance rules change |

### Generated files

These files are produced by scripts. Do not edit them manually.

| File | Generator | Regeneration command |
|------|-----------|----------------------|
| `docs/architecture/reverse-engineering/architecture-graphs.md` | `generate-graphs.ts` | `npx tsx scripts/architecture/generate-graphs.ts` |
| `docs/architecture/reverse-engineering/architecture-graphs.json` | `generate-graphs.ts` | `npx tsx scripts/architecture/generate-graphs.ts` |
| `docs/architecture/drift-report.md` | `detect-drift.ts` | `npx tsx scripts/architecture/detect-drift.ts` |
| `docs/architecture/dashboard.md` | `report.ts` | `npx tsx scripts/architecture/report.ts` |
| `docs/architecture/ARCHITECTURE_BASELINE.md` | `report.ts` | `npx tsx scripts/architecture/report.ts` |
| `docs/architecture/metrics.md` | `report.ts` | `npx tsx scripts/architecture/report.ts` |
| `docs/architecture/metrics.json` | `report.ts` | `npx tsx scripts/architecture/report.ts` |
| `docs/architecture/ARCHITECTURE_BASELINE.json` | `report.ts` | `npx tsx scripts/architecture/report.ts --save-baseline` |

### Artifacts

These files are generated once and committed as read-only artifacts.

| File | Source | Notes |
|------|--------|-------|
| `docs/architecture/diagrams/*.svg` | `*.mmd` via Mermaid CLI | Regenerate when `.mmd` changes |
| `docs/history/*` | Snapshot copies | Historical snapshots, immutable |

---

## Change workflow

### When you change code

1. Update affected manual documentation.
2. Run `npx tsx scripts/architecture/report.ts` to update generated docs.
3. Run `npm run build`.
4. Run `npm test` (or at least affected tests).
5. Run `bash ael/contracts/enforce.sh`.
6. Review `docs/architecture/drift-report.md` for unexpected structural changes.

### When you change documentation

1. Prefer editing manual sources of truth.
2. If you edit a `.mmd` file, regenerate the corresponding `.svg`.
3. Run `npx tsx scripts/architecture/validate-docs.ts` to check for broken links.
4. Run `npx tsx scripts/architecture/report.ts` to refresh dashboard, baseline, and metrics.

### When you add a new ADR

1. Place it in `docs/adr/` with the next sequential number.
2. Add it to `docs/architecture/ADR_INDEX.md`.
3. Update any conceptual doc that references the decision area.
4. Do not retroactively version older ADRs; create a new ADR that supersedes.

### When you need to capture history

1. Do not add historical notes to the architecture documentation.
2. Move superseded documents to `docs/history/`.
3. Create snapshots in `docs/history/` with date-stamped filenames when a baseline is superseded.
4. Reference the snapshot sparingly from architecture docs, if at all.

---

## What never changes manually

| File | Why |
|------|-----|
| `architecture-graphs.md` | Auto-generated from code |
| `architecture-graphs.json` | Auto-generated from code |
| `drift-report.md` | Auto-generated from baseline comparison |
| `dashboard.md` | Auto-generated by report script |
| `metrics.md` | Auto-generated by report script |
| `ARCHITECTURE_BASELINE.md` | Auto-generated snapshot by report script |
| `*.svg` diagrams | Generated from `.mmd` |

---

## Validation checklist

Before any documentation change is considered complete:

- [ ] No broken internal links (`validate-docs.ts`)
- [ ] No manually edited generated files
- [ ] Dashboard and baseline regenerated (`report.ts`)
- [ ] Drift report reviewed (`detect-drift.ts`)
- [ ] Build passes (`npm run build`)
- [ ] Contracts pass (`bash ael/contracts/enforce.sh`)
- [ ] No version numbers or temporary labels added to architecture docs

---

## Baseline update ritual

A new baseline should be saved when:

- A significant architectural change is merged.
- A major documentation iteration is completed.
- An audit requires a snapshot.

Steps:

1. Ensure the code and docs reflect the current state.
2. Run `npx tsx scripts/architecture/report.ts --save-baseline`.
3. Review `ARCHITECTURE_BASELINE.md` and `ARCHITECTURE_BASELINE.json`.
4. Commit the updated baseline and generated docs.
5. If the change is historically notable, copy the previous baseline to
   `docs/history/ARCHITECTURE_BASELINE_YYYY-MM-DD.json`.

---

## Related documents

- [`DIAGRAMS.md`](./DIAGRAMS.md) — diagram-specific governance
- [`ADR_INDEX.md`](./ADR_INDEX.md) — how ADRs are indexed and updated
- [`metrics.md`](./metrics.md) — metrics governed by these rules
- [`ARCHITECTURE_BASELINE.md`](./ARCHITECTURE_BASELINE.md) — snapshot produced by governance ritual
- [`dashboard.md`](./dashboard.md) — live dashboard

---

*Last updated: 2026-07-17*
*Authority: documentation governance rules*
