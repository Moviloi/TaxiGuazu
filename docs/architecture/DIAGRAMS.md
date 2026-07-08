# Diagram Lifecycle — AITOS

> Rules for creating, maintaining, and regenerating architecture diagrams.
> This document exists so diagrams never become stale or misleading.

---

## Source of truth

The **Mermaid file (`.mmd`)** is the source of truth for every diagram.

The **SVG file (`.svg`)** is a generated artifact for embedding in presentations,
wikis, or printed documents.

| File type | Source of truth | Editable manually | Versioned |
|-----------|-----------------|-------------------|-----------|
| `.mmd`    | Yes             | Yes               | Yes       |
| `.svg`    | No              | No                | Yes       |

Never edit an SVG manually. If a diagram needs to change, edit the `.mmd` and
regenerate the SVG.

---

## File locations

| Location | Contents |
|----------|----------|
| `docs/architecture/diagrams/*.mmd` | Mermaid sources |
| `docs/architecture/diagrams/*.svg` | Generated artifacts |
| `docs/architecture/reverse-engineering/` | Auto-generated graphs from code |

---

## How to regenerate SVGs

### Option 1 — npx (no permanent dependencies)

Install the tool transiently at generation time:

```bash
npx -y @mermaid-js/mermaid-cli@latest \
  -i docs/architecture/diagrams/00-main-system-diagram.mmd \
  -o docs/architecture/diagrams/00-main-system-diagram.svg
```

On Windows, if Chromium is not found automatically, point to a local Chrome:

```powershell
# create a temporary config file
'{ "executablePath": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" }' | Out-File -FilePath puppeteer-config.json

npx -y @mermaid-js/mermaid-cli@latest `
  -i docs/architecture/diagrams/00-main-system-diagram.mmd `
  -o docs/architecture/diagrams/00-main-system-diagram.svg `
  -p puppeteer-config.json
```

Delete the config file after use. Do not commit it.

### Option 2 — Docker

Use a container to avoid installing anything locally:

```bash
docker run --rm -u $(id -u):$(id -g) -v $(pwd):/data \
  ghcr.io/mermaid-js/mermaid-cli/mermaid-cli:latest \
  -i /data/docs/architecture/diagrams/00-main-system-diagram.mmd \
  -o /data/docs/architecture/diagrams/00-main-system-diagram.svg
```

### Option 3 — Mermaid Live Editor

For one-off changes, edit the `.mmd` in
[https://mermaid.live](https://mermaid.live) and export the SVG manually.

---

## Auto-generated diagrams

The reverse-engineering graphs are generated from real source code:

```bash
npx tsx scripts/architecture/generate-graphs.ts
```

This updates:

- `docs/architecture/reverse-engineering/architecture-graphs.json`
- `docs/architecture/reverse-engineering/architecture-graphs.md`

These files are generated. Do not edit them manually.

---

## When to regenerate

| Trigger | Action |
|---------|--------|
| New engine or service | Update `00-main-system-diagram.mmd` and SVG |
| New bounded context | Update relevant conceptual diagrams |
| Dependency graph changes | Run `generate-graphs.ts` |
| Baseline refresh | Run full report: `npx tsx scripts/architecture/report.ts` |

---

## Good practices

1. **Keep diagrams small.** A diagram that tries to show everything shows nothing.
2. **One idea per diagram.** Use multiple focused diagrams instead of one giant chart.
3. **Readable without color.** Use labels, not just colors, to convey meaning.
4. **Stable IDs.** Do not rename Mermaid node IDs unless necessary; it breaks diff reviews.
5. **Commit `.mmd` and `.svg` together.** They must stay in sync.
6. **No hand-edited SVGs.** Ever.

---

## Current diagrams

| Diagram | Mermaid source | SVG artifact | Purpose |
|---------|----------------|--------------|---------|
| Main system diagram | `diagrams/00-main-system-diagram.mmd` | `diagrams/00-main-system-diagram.svg` | All layers and engines |
| System overview | `diagrams/01-system-overview.md` | — | User → webhook → response |
| Webhook entry | `diagrams/02-webhook-entry.md` | — | Security and validation |
| CORE phase | `diagrams/03-core-phase.md` | — | Intent classification |
| Router phase | `diagrams/04-router-phase.md` | — | Decision routing |
| Extraction phase | `diagrams/05-extraction-phase.md` | — | Slot extraction |
| Confidence model | `diagrams/06-confidence-model.md` | — | Slot status lifecycle |
| Policy AHORA | `diagrams/07-policy-ahora.md` | — | Immediate dispatch policy |
| Policy RESERVA | `diagrams/08-policy-reserva.md` | — | Future reservation policy |
| Location resolution | `diagrams/09-location-resolution.md` | — | Place resolution pipeline |
| Tariff resolution | `diagrams/10-tariff-resolution.md` | — | Pricing specificity |
| Operational readiness | `diagrams/11-operational-readiness.md` | — | Quote blockers |
| Workflow state machine | `diagrams/12-workflow-state-machine.md` | — | Conversational states |
| Slot confidence evolution | `diagrams/13-slot-confidence-evolution.md` | — | Slot maturation |
| Dispatch flow | `diagrams/14-dispatch-flow.md` | — | Driver escalation |
| Data flow | `diagrams/15-data-flow.md` | — | Data movement |
| Policy pipeline | `diagrams/16-policy-pipeline.md` | — | Policy gate |
| Reverse-engineering graphs | `reverse-engineering/architecture-graphs.md` | — | Auto-generated from code |

---

## Related documents

- [`ARCHITECTURE_ATLAS.md`](./ARCHITECTURE_ATLAS.md) — visual index to all diagrams
- [`GOVERNANCE.md`](./GOVERNANCE.md) — documentation governance rules
- [`dashboard.md`](./dashboard.md) — architecture dashboard (includes outdated diagram count)
- [`reverse-engineering/architecture-graphs.md`](./reverse-engineering/architecture-graphs.md) — auto-generated graphs from code

---

*Last updated: 2026-07-06*
*Authority: documentation governance rules*
