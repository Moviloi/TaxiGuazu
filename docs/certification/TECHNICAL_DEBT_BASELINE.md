# TECHNICAL DEBT BASELINE v1.0 — AITOS
## Generated: 2026-07-08 | Last reviewed: 2026-07-17 (ADR-013 — CDA Ratification)

---

## Deuda resuelta (desde auditorías 000-005 + Hardening P0/P1 + PR-3E)

| ID | Descripción | Resuelto en |
|---|---|---|
| DEBT-01 | AFFIRMATION_RE duplicado | v2 |
| DEBT-03 | guard.ts global state | v2 |
| DEBT-12 | connection.ts initSchema() drift | v3.4 |
| DEBT-13 | trip_status references eliminadas de código ejecutable | v3.5 |
| DEBT-14 | import.meta.dirname → process.cwd() (Vercel TypeError fix) | v3.5 |
| Z3.1-3 | guard.ts no-ops (setRequestState, assertCoreRouterPolicy, resetRequestState) | P0 |
| Z3.4-6 | tool wrappers sin consumers (tool-geo, tool-dispatch, tool-fleet) | P0 |
| L2.3 | handleDriverAccept legacy stub | P0 |
| L2.6 | SlotConversationalState type alias | P0 |
| L2.1 | geo-engine.ts DEPRECATED | P1 (eliminado) |
| C001 | findTariffByPriority ownership → pricing | P1 |
| CODE_DIFF.md | Template vacío | P0 |
| R5 | Híbrido StrategyDecision + señales originales (`??` fallbacks en policies) | R5 Phase 2 |
| EE-S1 | Signal.create() no validaba receivedAt futuro | PR-3E (S-1) |
| EE-O1 | Observation.create() no validaba validatedAt >= signal.receivedAt | PR-3E (O-1) |

---

## Deuda P1 (alta prioridad — corregir en Stabilization)

| ID | Descripción | Archivos | Impacto |
|---|---|---|---|
| P1-01 | Fix 17 test failures | 6 test files | Estabiliza CI/CD |
| P1-02 | `updateTripTariff` ownership (Trip vs Pricing) | `trips.ts` | Claridad de dominio |
| P1-03 | DEBT-02: survey→lead dependency documentada pero no resuelta | `lead-event-helpers.ts` | Eliminar acoplamiento vertical |
| P1-04 | DEBT-13: nombres de tabla con tags de fase | `connection.ts` | Higiene de schema |
| P1-05 | ai/display-name.ts importa de db/ | `display-name.ts` | Violación de capa AI→DB |

## Deuda P2 (media — planificar en próximos sprints)

| ID | Descripción | Archivos |
|---|---|---|
| P2-01 | DEBT-04: Fragmentar database.ts (870L) | `database.ts` |
| P2-02 | DEBT-05: Reducir acoplamiento lead.service (750L) | `lead.service.ts` |
| P2-03 | DEBT-06: i18n inline restante (~15 bloques) | `ai/`, `timeouts.ts` |
| P2-04 | DEBT-07: AI→Services: response-builder OpportunityResult | `response-builder.ts` |
| P2-05 | DEBT-08: policy-pipeline.ts acoplamiento (367L) | `policy-pipeline.ts` |
| P2-06 | DEBT-09: Auditar consumo DB (single facade) | Todos los servicios |
| P2-07 | DEBT-10: seed-data.ts cobertura incompleta | `scripts/seed-data.ts` |
| P2-08 | DEBT-11: policy-pipeline PricingToolOutput conversion | `policy-pipeline.ts` |
| P2-09 | GAP-01 a GAP-12: gaps documentados | Varios |
| P2-10 | Pricing dual engine (v2/v3) — eliminar v2 | `resolve-pricing-for-slots.ts` |

## Deuda P3 (baja — futuras mejoras)

| ID | Descripción |
|---|---|
| P3-01 | Hotspots >400L (7 archivos) |
| P3-02 | Cobertura en Survey y Admin |
| P3-03 | Zombie DB columns (trip_status, workflows table) |
| P3-04 | Dead params (_history, _customerName, etc.) |
| P3-05 | Zombie comments en connection.ts |
| P3-06 | FUT-01 a FUT-10 (features futuras) |

## Deuda detectada en H0A (Staging Hardening Audit)

| ID | Descripción | Prioridad | Dominio | Origen |
|---|---|---|---|---|
| H0A-01 | 11 feature flags sin documentar en `.env.example` — operadores no pueden configurar BKE/DRL | **P0 (BLOQUEA STAGING)** | Ops/Config | H0A Audit |
| H0A-02 | 4 tests fallando (2 timeout LLM, 1 mock API, 1 assertion DRL geo) — CI/CD nunca 100% verde | **P0 (BLOQUEA STAGING)** | Testing | H0A Audit |
| H0A-03 | Sin middleware.ts — auth inline en 15 routes, sin CSP, sin CSRF | **DIFERIDO a Post-v1** (ver `docs/architecture/DEFERRED_MIDDLEWARE.md`) | Security | H0A Audit |
| H0A-04 | ADMIN_API_KEY expuesta en chat — requiere rotación urgente | **P0 (BLOQUEA PILOTO)** | Security/Ops | H0A Audit, P0-01 |
| H0A-05 | 3 shadow flags leídas de process.env sin función wrapper (COGNITIVE_MEMORY_ENABLED, EVIDENCE_SHADOW_MODE, EVIDENCE_SHADOW_LOGGING) | P2 | Config | H0A Audit |
| H0A-06 | SENTRY_DSN no configurado en Vercel — eventos descartados silenciosamente | P1 | Ops | H0A Audit, P0-02 |
| H0A-07 | Memory no conectada al pipeline — lead.service.ts tiene 0 referencias a Memory (wiring gap) | P2 | Memory | H0A Audit |
| H0A-08 | Pattern Discovery: bug parseo acceptance_json + DB schema ausente — runtime error garantizado si se activa | P1 | Pattern Discovery | H0A Audit |
| H0A-09 | LOG_LEVEL no configurado en Vercel — sin visibilidad operacional | P2 | Ops | H0A Audit, P1-07 |
| H0A-10 | Pre-commit hooks no activos — security check script existe pero no se ejecuta automáticamente | P3 | Ops | H0A Audit |

## Algorithmic Conformance Debt (detectada en PR-QA3-S2B, referencia CDA)

Deuda funcional por desviación del Conversation Decision Algorithm (CDA) certificado en ADR-013. NO es deuda técnica común — representa brechas entre el comportamiento actual y el algoritmo normativo.

| ID | Descripción | Violación CDA | Archivo/Línea | Prioridad |
|---|---|---|---|---|
| **F01-DG** | Ambiguity se activa sin verificar `session.clarify_field` ni `leadCore.roleLock` | §6 condiciones [1][4], I-11 | `lead.service.ts:203` | **P0** |
| **F02-DG** | Intención no preservada cuando `prevIntent=BOOKING` y se clasifica como `CONSULTA` | §7 regla 1, I-04 | `core.ts:277-283` | **P0** |
| **F03-DG** | Merge de contexto no ejecutado cuando se activa ambigüedad — mensaje no se extrae como delta | §2 paso 7, §5 regla 1, I-03 | Pipeline de ambigüedad | **P0** |

**Nota**: Estas deudas no se resuelven con refactor técnico. Requieren cambios funcionales en el pipeline para alinear el comportamiento con el CDA. Planificadas en QA-3 Sprint 3.
