# CHANGELOG — AITOS
## 2026-07-08 onward

---

## 2026-07-08

### ADR-007 — Conversation Interpreter
- **Tipo**: ADR
- **Decisión**: Crear Conversation Interpreter como etapa del pipeline entre CORE y Extraction
- **Impacto**: Nuevo componente. Previene B3 y familia de bugs en origen.

### G1 — Stabilization Milestone
- **Commit**: `08ce37e`
- **Tipo**: Release
- **Resumen**: Cierre de hardening. Lead service 752→264 (−65%). 875/876 tests. 5 módulos workflow extraídos.

### A6 — Lead Service Final
- **Commit**: `08ce37e`
- **Tipo**: Refactor
- **Resumen**: Extraer slot-confirmation-text-handler (97L). Lead service ahora es fachada pura.

### A5 — Awaiting Confirmation Handler
- **Commit**: `08ce37e`
- **Tipo**: Refactor
- **Resumen**: Extraer handleAwaitingConfirmation (70L).

### P3.1 — Repository Hygiene Audit
- **Tipo**: Auditoría
- **Resumen**: 3 .gitignore, 55 JSON, 0 residuales. Apto para commit.

### P3 — Repository Hardening Final
- **Tipo**: Auditoría + Cleanup
- **Resumen**: Secretos redactados. 4 etiquetas "Hardening" eliminadas de código.

### B3 — Slot Merge Bug Audit
- **Tipo**: Auditoría
- **Resumen**: Causa raíz: entity-extractor asigna fuzzy match a destination por default.

### QA1 — Functional Certification
- **Tipo**: Certificación
- **Resumen**: 875/876 tests. Cobertura por escenario. Listo para piloto condicional.

### OPS1 — Production Readiness
- **Tipo**: Operaciones
- **Resumen**: 4 ERROR, 5 WARNING. ADMIN_API_KEY + SENTRY_DSN bloqueantes.

### RC1 — Release Candidate
- **Commit**: `c09a2c7`
- **Tipo**: Release
- **Resumen**: Build ✅, 875/876 tests, R1-R4 ✅, 144 archivos, +9114/−2398 líneas.
