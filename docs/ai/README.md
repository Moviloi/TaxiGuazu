# AI Context Pack — AITOS

> This folder contains documentation specifically designed for AI agents working on the AI Transportation Operating System.
> **Every AI agent must read `ARCHITECTURE_BIBLE.md` first.**

---

## Purpose

The AI Context Pack reduces hallucinations, prevents architectural drift, and preserves design decisions when AI agents modify the system.

It is not a replacement for the full architecture documentation. It is the **minimum required context** for safe modification.

---

## Reading order

Read these files in order before making any change:

1. **[ARCHITECTURE_BIBLE.md](./ARCHITECTURE_BIBLE.md)** — What the system is, what must never break, principles, layers, prohibited dependencies, and how to modify safely.
2. **[ARCHITECTURE_RULES.md](./ARCHITECTURE_RULES.md)** — Strict rules derived from the code. Violations require ADR-level decisions.
3. **[CONTRACTS.md](./CONTRACTS.md)** — Contracts between engines: inputs, outputs, invariants, errors, fallbacks, side effects.
4. **[INVARIANTS.md](./INVARIANTS.md)** — Statements that must always remain true.
5. **[DECISION_TREE.md](./DECISION_TREE.md)** — Runtime decision tree from message to response.
6. **[QUALITY_GATE.md](./QUALITY_GATE.md)** — Checklist for every modification.
7. **[COMMON_FAILURES.md](./COMMON_FAILURES.md)** — Mistakes to avoid.

---

## After the AI Context Pack

Continue with:

- `docs/architecture/glossary.md` — canonical terminology
- `docs/adr/*.md` — architecture decisions
- `docs/architecture/reverse-engineering/architecture-graphs.md` — dependency graphs
- `docs/architecture/system-overview.md` — high-level system view
- `docs/architecture/bounded-contexts.md` — domain boundaries
- `docs/architecture/engines.md` — detailed engine documentation

---

## How to update this pack

When a code change affects:

- **Invariants** → update `INVARIANTS.md`
- **Engine boundaries or contracts** → update `CONTRACTS.md`
- **Rules** → update `ARCHITECTURE_RULES.md`
- **Decision flow** → update `DECISION_TREE.md`
- **Quality checks** → update `QUALITY_GATE.md`
- **New common mistake** → update `COMMON_FAILURES.md`
- **Core truths** → update `ARCHITECTURE_BIBLE.md`

Never leave the AI Context Pack out of sync with the code.

---

## Authority

If this pack contradicts any other document, the code is the highest authority, followed by this pack, then ADRs, then other documentation.

---

*Last updated: 2026-07-06*
