# Knowledge — AITOS

> Business knowledge separated from architectural documentation.
> This folder contains operational rules that drive the system's behavior.
> For architecture, see `docs/architecture/` and `docs/ai/`.

---

## Knowledge areas

| Document | Domain |
|----------|--------|
| [business-rules.md](./business-rules.md) | General business rules |
| [pricing-rules.md](./pricing-rules.md) | Tariff and pricing rules |
| [geo-rules.md](./geo-rules.md) | Location resolution rules |
| [whatsapp-rules.md](./whatsapp-rules.md) | WhatsApp channel rules |
| [fleet-rules.md](./fleet-rules.md) | Driver fleet rules |
| [dispatch-rules.md](./dispatch-rules.md) | Dispatch escalation rules |
| [learning-rules.md](./learning-rules.md) | Learning and opportunity rules |

---

## Principle

Business knowledge lives in:

- `data/knowledge/*.json` — structured knowledge files
- `src/config/constants.ts` — numeric thresholds and timeouts
- `src/lib/ai/*.ts` — regex patterns and heuristics
- `src/lib/services/*/ — domain logic
- This folder — human-readable rule documentation

---

*Last updated: 2026-07-06*
