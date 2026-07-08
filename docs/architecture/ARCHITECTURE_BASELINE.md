# Architecture Baseline — AITOS

> Snapshot of the architectural state at a specific point in time.
> This is a photograph, not a version. It describes the system as it is now.
> For historical snapshots, see `docs/history/`.
> For future plans, see `ael/artifacts/BACKLOG.md`.

---

## Snapshot

| Field | Value |
|-------|-------|
| Generated | 2026-07-06T19:22:36.509Z |
| Commit | `831e2bf` |
| Baseline reference | 2026-07-06T15:14:40.760Z |

## Overall state

| Indicator | Status |
|-----------|--------|
| Documentation | ok |
| Validation | ok |
| Drift | ok |

## Key metrics

| Metric | Value |
|--------|-------|
| Modules | 145 |
| Packages | 21 |
| Engines | 11 |
| Bounded contexts | 8 |
| Contracts | 13 |
| Invariants | 24 |
| Rules | 25 |
| Diagrams | 22 |
| Documents | 71 |
| ADRs | 6 |
| Architecture scripts | 4 |
| Tests | 69 |

## Quality indicators

| Metric | Value | Threshold |
|--------|-------|-----------|
| Circular dependencies | 3 | 0 |
| Layer violations | 4 | 0 |
| Orphan files | 8 | 0 |
| Broken links | 0 | 0 |
| Isolated documents | 0 | 0 |
| Outdated diagrams | 0 | 0 |

## Findings

- **Circular dependencies detected:** 3
- **Layer violations detected:** 4
- **Orphan files:** 8
- No broken links detected.
- No isolated documents detected.
- No outdated diagrams detected.

## Documentation coverage

| Area | Coverage |
|------|----------|
| AI Context Pack | docs/ai/ |
| Architecture conceptual docs | docs/architecture/ |
| ADRs | docs/adr/ |
| Reverse engineering graphs | docs/architecture/reverse-engineering/ |
| Diagrams | docs/architecture/diagrams/ |

## Related documents

- [`dashboard.md`](./dashboard.md) — live dashboard
- [`metrics.md`](./metrics.md) — metric definitions
- [`drift-report.md`](./drift-report.md) — detailed drift analysis
- [`GOVERNANCE.md`](./GOVERNANCE.md) — how to update this baseline
- [`ADR_INDEX.md`](./ADR_INDEX.md) — architecture decision index

## Observations

- This baseline was generated automatically by `scripts/architecture/report.ts`.
- Generated files must not be edited manually.
- Run `npx tsx scripts/architecture/report.ts --save-baseline` to update this snapshot.

---

*Generated: 2026-07-06T19:22:36.509Z*
*Authority: source code and automated analysis*
