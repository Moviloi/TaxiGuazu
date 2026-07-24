# History — AITOS

> Historical snapshots and superseded documents.
> This directory exists so the architecture documentation can describe only the
> present state of the system.

---

## Purpose

The architecture documentation in `docs/architecture/` describes the system as
it is now. Historical context — old proposals, superseded specs, previous
baselines — lives here.

Git remains the primary source of historical truth. This directory holds
documents that are worth preserving for reference but should not influence the
current architecture.

---

## Contents

| Document | What it was | Why it is historical |
|----------|-------------|----------------------|
| [`agent-contracts.md`](./agent-contracts.md) | Redirect to agent role definitions | Superseded by `ael/AGENTS.md` and `ael/roles/` |
| [`COMMERCIAL-MODEL-SPEC.md`](./COMMERCIAL-MODEL-SPEC.md) | Commercial model blueprint | Not implemented; kept as reference |
| [`counterproposal-colleague.md`](./counterproposal-colleague.md) | Counter-proposal to an architecture direction | Superseded by current architecture |
| [`proposal-claude.md`](./proposal-claude.md) | Early architecture proposal | Superseded by current architecture |
| [`skills.md`](./skills.md) | Classification of installed agent skills | Operational note, not part of AITOS domain |
| [`synthesis-final.md`](./synthesis-final.md) | Synthesis of early architecture discussions | Superseded by current documentation |
| [`USECASES.md`](./USECASES.md) | Use case catalog | Outdated; kept as reference |

---

## When to add a document here

Add a document to `docs/history/` when:

- It describes a proposal that was not adopted.
- It was superseded by a newer document.
- It captures a snapshot worth preserving but no longer current.

Do not add documents here that describe the current system. Those belong in
`docs/architecture/`, `docs/ai/`, or `docs/adr/`.

---

## Relationship to other sources of truth

| Source | Purpose |
|--------|---------|
| Git | Complete history of every change |
| `ael/artifacts/BACKLOG.md` | Future planning and current tasks |
| `docs/architecture/ARCHITECTURE_BASELINE.md` | Current architectural snapshot |
| `docs/history/` | Preserved historical documents |

---

*Last updated: 2026-07-06*
