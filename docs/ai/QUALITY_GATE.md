# Quality Gate — AITOS

> Checklist that every modification must satisfy before being considered complete.
> Use this before committing, before opening a PR, and before deploying.

---

## Constitutional compliance

- [ ] **AITOS Constitution respected**
  - No change violates any invariant documented in CONST (INV-01..INV-20).
  - No change contradicts any constitutional principle (CC-01..CC-17).
  - No change redefines capabilities, contracts, or governance without amending CONST.
  - The Constitution (`docs/architecture/AITOS_CONSTITUTION.md`) is the supreme authority. If this change requires modifying a derived document, the derived document's hierarchy must be preserved.

## Architectural checks

- [ ] **No new architectural violations**
  - AI files do not import Services (except `services/i18n/*`).
  - Services do not import `db/domains/*` directly.
  - No new circular dependencies introduced.

- [ ] **Dependency order preserved**
  - New service dependencies follow: i18n → Geo → Memory/Pricing → Learning → Extraction → Workflow → Dispatch → Trip-execution → Admin/Housekeeping → Lead.

- [ ] **Pipeline order preserved**
  - CORE → ROUTER → POLICY → OUTPUT.
  - No message sent before policy decides.

- [ ] **State invariants preserved**
  - Phone remains primary identity.
  - Slots remain the operational model.
  - Slot status lifecycle respected.
  - Previous slots preserved unless explicitly contradicted.

- [ ] **LLM not made required**
  - System still works if LLM keys are missing or LLM fails.
  - No business decision depends solely on LLM output.

---

## Code quality checks

- [ ] **No god functions added**
  - New functions under 100 lines when possible.
  - No new file exceeds 300 lines without justification.

- [ ] **No dead code**
  - No unused imports.
  - No commented-out blocks left behind.
  - No unreachable branches.

- [ ] **Error handling**
  - External calls have try/catch.
  - Failures degrade gracefully.
  - Errors are logged with context.

- [ ] **Types**
  - TypeScript types added/updated.
  - No `any` introduced unless strictly necessary.

---

## Database checks

- [ ] **Facade respected**
  - New DB reads/writes go through `src/lib/db/database.ts`.
  - If a new domain query is needed, add it to facade.

- [ ] **Schema parity**
  - If code changes require DB changes, migration script updated.
  - `src/lib/db/core/connection.ts` and `src/lib/db/types.ts` synchronized.

- [ ] **Indexes and constraints**
  - New queries have appropriate indexes.
  - Foreign keys and CHECK constraints considered.

---

## Test checks

- [ ] **Existing tests pass**
  - `npm test` passes.
  - `npm run build` passes.
  - `bash ael/contracts/enforce.sh` passes.

- [ ] **New tests added**
  - New logic has unit or integration tests.
  - Bug fixes have regression tests.
  - Architectural rules have contract tests when possible.

- [ ] **Simulation tested**
  - For conversation changes, verify via `/api/bot/simulate` or real WhatsApp test.

---

## Documentation checks

- [ ] **Glossary updated**
  - New terms added to `docs/architecture/glossary.md`.
  - Existing terms not redefined inconsistently.

- [ ] **AI Context Pack updated**
  - If invariants, rules, contracts, or decision tree changed, update `docs/ai/`.

- [ ] **ADR if needed**
  - Architectural decisions recorded in `docs/adr/`.

- [ ] **Diagrams regenerated**
  - Run `npx tsx scripts/architecture/generate-graphs.ts` if imports changed.
  - Update affected Mermaid diagrams.

---

## Security checks

- [ ] **No secrets in code**
  - No API keys, tokens, or passwords committed.
  - `.env` files not tracked.

- [ ] **Auth preserved**
  - Admin endpoints still require `x-api-key`.
  - Cron endpoints still require `CRON_SECRET`.
  - Webhook still verifies HMAC.

- [ ] **Input validation**
  - User inputs sanitized before DB queries.
  - Phone normalization preserved.

---

## Operational checks

- [ ] **No breaking changes to env vars**
  - If new env var required, add to `.env.example` and `src/config/env.ts`.
  - If env var made optional/required, update docs and deployment notes.

- [ ] **Backward compatibility**
  - Existing sessions/conversations not corrupted.
  - Database migrations are backward-compatible when possible.

- [ ] **Observability**
  - New flows have appropriate logging.
  - Errors are visible in Vercel logs / Sentry.

---

## Final gate

Before considering the change complete, verify:

- [ ] The change can be explained to a new architect using only this documentation and the code.
- [ ] The change does not contradict any ADR.
- [ ] The change does not violate any invariant in `docs/architecture/AITOS_CONSTITUTION.md`.
- [ ] The change does not violate any invariant in `docs/ai/INVARIANTS.md`.
- [ ] The change follows all rules in `docs/ai/ARCHITECTURE_RULES.md`.

---

*Last updated: 2026-07-06*
