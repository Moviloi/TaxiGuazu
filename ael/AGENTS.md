# AGENTS.md — TaxGuazu

## ARNES (Agent Execution Layer)

Pipeline de 7 fases que gobierna la evolucion del sistema. OpenCode entra por aqui.

**Ubicacion:** `ael/`
**Pipeline:** `ael/PIPELINE.md`
**Roles:** `ael/roles/01-director.md` ... `07-learning.md`
**Contratos:** `ael/contracts/CONTRACTS.md`
**Enforcement:** `bash ael/contracts/enforce.sh`

## Reglas

- **R1:** No modificar contratos entre capas sin actualizar autoridad arquitectonica.
- **R2:** No crear dependencias que violen ADR 001-004.
- **R3:** No asumir implementacion que no exista en codigo fuente real.

## Autoridad

| Decision | Autoridad |
|----------|-----------|
| Arquitectura | `docs/adr/001-004` |
| Contratos | `docs/architecture/architecture.md` |
| Estado | `.opencode/memory/MEMORY.md` |

## Commands

- `/ael:plan` — Fase Director
- `/ael:explore` — Fase Explorer
- `/ael:design` — Fase Architect
- `/ael:enforce` — Contract enforcement
- `/ael:validate` — Tests + build + enforce
