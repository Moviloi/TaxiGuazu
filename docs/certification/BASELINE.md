# BASELINE — AITOS
## Reference Snapshot | 2026-07-07

> This is the reference state of AITOS. Subsequent baselines compare against this.

---

## System Identity

| Property | Value |
|---|---|
| **Project** | GuazuTransfer-Web (TaxiGuazu) |
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5.4+ |
| **DB** | SQLite via Turso/libSQL |
| **AI Models** | Gemini (Google), Groq |
| **Messaging** | WhatsApp Cloud API v18 |
| **Bot Persona** | Cris Virtual |
| **Languages** | es (default), en, pt |
| **Deploy** | Vercel |

---

## Architecture

| Layer | Files | Key Entry Points |
|---|---|---|
| **Entry Points** | `src/app/api/` (15 routes) | `whatsapp/webhook/route.ts` (308L) |
| **Services** | `src/lib/services/` (12 subdirectories, 60+ files) | `lead.service.ts` (671L) |
| **AI** | `src/lib/ai/` (25 files, 2 subdirectories) | `handler.ts`, `core.ts`, `policy-reserva.ts` |
| **DB** | `src/lib/db/` (12 files, 2 subdirectories) | `database.ts` (769L facade), `connection.ts` (716L DDL) |
| **Config** | `src/config/`, `src/lib/config/` (3 files) | `env.ts` (31L), `constants.ts` (38L) |
| **Utils** | `src/lib/utils/` (2 files) | `logger.ts` (71L), `clamp.ts` (3L) |
| **Infrastructure** | `src/lib/` (6 top-level files) | `sender.ts` (98L), `timeouts.ts` (240L), `auth.ts` (15L) |

---

## Pipeline

```
CORE (regex intent + facts) → ROUTER (intent → output_type) → POLICY (mode-specific response) → LLM (response polish)
```

**Intents detected (11)**: GREETING, BOOKING, NOW, EMERGENCY, COMMERCIAL, CONSULTA, POST_SERVICE, RESCHEDULE, COMPLAINT, FAREWELL, OTHER

**Operational Modes**: AHORA (immediate), RESERVA (future booking)

---

## Database

| Stat | Value |
|---|---|
| Tables (DDL) | 44 |
| Facade functions | ~63 in database.ts |
| Domain files | 8 in db/domains/ |
| Foreign keys | Enforced at application layer |
| Migrations | `db/migrations/` handled by `scripts/run-migrations.ts` |

---

## Tests

| Stat | Value |
|---|---|
| Test files | 69 |
| Test categories | ai/ (10), services/ (18), integration/ (28), e2e/ (1), policies/ (1), unit/ (2), tools/ (4) |
| Estimated tests | ~771 (from MEMORY records) |
| Framework | Vitest |

---

## Quality Gates

| Gate | Command | Threshold |
|---|---|---|
| Tests | `npm test` | All pass |
| Build | `npm run build` | 0 errors |
| Lint | `npm run lint` | Warning only |
| Contracts | `bash ael/contracts/enforce.sh` | R1-R4 PASS |
| Schema Parity | `npm run validate-schema-parity` | 0 drift |

---

## Known Debt

| ID | Description | Priority | Status |
|---|---|---|---|
| DEBT-04 | database.ts: 769L, 63 functions | P2 | DEFERRED |
| DEBT-05 | lead.service.ts: 27 imports, 11 cross-service | P2 | DEFERRED |
| DEBT-06 | i18n inline in 30+ if/else blocks | P2 | IN_PROGRESS |
| DEBT-07 | AI→Services conceptual coupling (response-builder) | P2 | DEFERRED |
| DEBT-08 | policy-pipeline.ts: 367L, 6 cross-service deps | P2 | DEFERRED |
| DEBT-09 | DB access pattern audit (single facade) | P2 | DEFERRED |
| DEBT-12 | connection.ts initSchema() drift (resolved) | P0 | DONE |
| Circular deps | 3 instances | P2 | Documented |
| Layer violations | 4 instances | P2 | Documented |
| Orphan files | 8 instances | P2 | Documented |

---

*This baseline was generated from code evidence, not from existing documentation.*
*Authority: source code and test execution.*
