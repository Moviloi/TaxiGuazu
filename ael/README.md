# Agent Execution Layer (AEL)

Sistema operativo de ingenieria de software basado en agentes para TaxGuazu.

## Que es la AEL

La AEL es una capa intermedia entre:

```
USER REQUEST → AEL (ARNES) → CODEBASE MODIFICATION
```

Convierte el arnes agéntico conceptual (Director, Architect, Explorer, Implementer, Auditor, Memory, Learning) en un **pipeline de ejecucion formal** capaz de producir cambios consistentes en el sistema.

## Estructura

```
ael/
├── AGENTS.md                ← Entry point, organigrama, comandos
├── PIPELINE.md              ← Flujo de ejecucion formal
├── HANDOFF.md               ← Protocolo de transferencia entre roles
├── FAILURE.md               ← Modos de fallo y rollback
├── roles/                   ← Definicion de cada rol
│   ├── 01-director.md
│   ├── 02-explorer.md
│   ├── 03-architect.md
│   ├── 04-implementer.md
│   ├── 05-auditor.md
│   ├── 06-memory.md
│   └── 07-learning.md
├── artifacts/               ← Artefactos por fase del pipeline
│   ├── TASK_PLAN.md
│   ├── SYSTEM_STATE.md
│   ├── DESIGN_SPEC.md
│   ├── CODE_DIFF.md
│   ├── VALIDATION_REPORT.md
│   ├── DECISION_RECORD.md
│   ├── PATTERN_EXTRACTION.md
│   └── archive/             ← Artefactos de pipelines anteriores
├── contracts/               ← Enforcement de contratos
│   ├── CONTRACTS.md
│   └── enforce.sh
└── archive/                 ← Documentacion de diseno anterior
    └── INTEGRATION.md
```

## Pipeline de ejecucion

```
DIRECTOR → EXPLORER → ARCHITECT → IMPLEMENTER → AUDITOR → MEMORY → LEARNING
    │          │           │            │            │          │          │
    ▼          ▼           ▼            ▼            ▼          ▼          ▼
TASK_PLAN  SYSTEM_     DESIGN_      CODE_DIFF   VALIDATION  DECISION   PATTERN_
    .md      STATE.md    SPEC.md                  _REPORT.md  _RECORD.md EXTRACTION.md
```

## Como se ejecuta

1. El usuario describe el cambio al Director (agente `ael`)
2. El Director ejecuta el pipeline de 7 fases automaticamente
3. Cada fase delega al subagente correspondiente
4. Al finalizar, se ejecuta `bash ael/contracts/enforce.sh`

## Contract enforcement

```bash
# Ejecutar todos los checks
bash ael/contracts/enforce.sh

# Ejecutar un check especifico
bash ael/contracts/enforce.sh --rule R1
bash ael/contracts/enforce.sh --rule R2
bash ael/contracts/enforce.sh --rule R3
```

## Integracion con npm

```bash
npm run ael:enforce   # bash ael/contracts/enforce.sh
npm run ael:validate  # npm test && npm run build && bash ael/contracts/enforce.sh
```

## Estado

| Componente | Estado |
|-----------|--------|
| Pipeline definition | COMPLETO |
| Role specs (7 roles) | COMPLETO |
| Handoff protocol | COMPLETO |
| Contract enforcement | COMPLETO |
| Failure modes | COMPLETO |
| OpenCode integration (7 subagentes, 8 comandos) | COMPLETO |
| Self-diagnosis (`/ael:diagnose`) | COMPLETO |
| CI/CD integration | PENDIENTE (requiere GitHub Actions) |
