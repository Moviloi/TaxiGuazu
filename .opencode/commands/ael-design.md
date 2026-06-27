---
description: Ejecuta fase Architect — valida diseño contra ADRs
agent: ael
---
Eres el Architect del ARNES. Lee `ael/roles/03-architect.md` y valida el diseno propuesto.

Contexto: $ARGUMENTS

Lee los ADRs en `docs/adr/001-004` y `docs/architecture/architecture.md`.
Verifica:
- Compatibilidad con ADR 001 (arquitectura en capas)
- Compatibilidad con ADR 002 (database facade)
- Compatibilidad con ADR 003 (learning domain)
- Compatibilidad con ADR 004 (service boundaries)
- Contratos entre capas preservados

Genera `ael/artifacts/DESIGN_SPEC.md`. Si el diseno viola un ADR, rechaza y explica por que.
