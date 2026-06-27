# Agent Execution Layer (AEL)

Sistema operativo de ingeniería de software basado en agentes para TaxGuazú.

## Qué es la AEL

La AEL es una capa intermedia entre:

```
USER REQUEST → AEL (ARNÉS) → CODEBASE MODIFICATION
```

Convierte el arnés agéntico conceptual (Director, Architect, Explorer, Implementer, Auditor, Memory, Learning) en un **pipeline de ejecución formal** capaz de producir cambios consistentes en el sistema.

## Estructura

```
ael/
├── PIPELINE.md              ← Flujo de ejecución formal
├── HANDOFF.md               ← Protocolo de transferencia entre roles
├── FAILURE.md               ← Modos de fallo y rollback
├── INTEGRATION.md           ← Conexión con ecosistema existente
├── roles/                   ← Definición de cada rol
│   ├── 01-director.md
│   ├── 02-explorer.md
│   ├── 03-architect.md
│   ├── 04-implementer.md
│   ├── 05-auditor.md
│   ├── 06-memory.md
│   └── 07-learning.md
├── artifacts/               ← Templates de artefactos por rol
│   ├── TASK_PLAN.md
│   ├── SYSTEM_STATE.md
│   ├── DESIGN_SPEC.md
│   ├── VALIDATION_REPORT.md
│   ├── DECISION_RECORD.md
│   └── PATTERN_EXTRACTION.md
└── contracts/               ← Enforcement de contratos
    ├── CONTRACTS.md
    └── enforce.sh
```

## Pipeline de ejecución

```
DIRECTOR → EXPLORER → ARCHITECT → IMPLEMENTER → AUDITOR → MEMORY → LEARNING
    │          │           │            │            │          │          │
    ▼          ▼           ▼            ▼            ▼          ▼          ▼
TASK_PLAN  SYSTEM_     DESIGN_      CODE_DIFF   VALIDATION  DECISION   PATTERN_
    .md      STATE.md    SPEC.md                  _REPORT.md  _RECORD.md EXTRACTION.md
```

## Cómo se ejecuta

### Manual (actual)

1. Leer `ael/PIPELINE.md`
2. Seguir el flujo fase por fase
3. Generar artefactos en `ael/artifacts/`
4. Ejecutar `bash ael/contracts/enforce.sh` al final

### Automático (futuro)

```bash
ael run "descripción del cambio"
```

## Contract enforcement

```bash
# Ejecutar todos los checks
bash ael/contracts/enforce.sh

# Ejecutar un check específico
bash ael/contracts/enforce.sh --rule R1
bash ael/contracts/enforce.sh --rule R2
bash ael/contracts/enforce.sh --rule R3
```

## Integración con npm

```bash
# Agregar a package.json
npm run ael:enforce   # bash ael/contracts/enforce.sh
npm run ael:validate  # npm test && npm run build && bash ael/contracts/enforce.sh
```

## Estado

| Componente | Estado |
|-----------|--------|
| Pipeline definition | COMPLETO |
| Role specs | COMPLETO |
| Artifact templates | COMPLETO |
| Handoff protocol | COMPLETO |
| Contract enforcement | COMPLETO |
| Failure modes | COMPLETO |
| Integration plan | COMPLETO |
| OpenCode integration | PENDIENTE (requiere opencode.json) |
| CI/CD integration | PENDIENTE (requiere GitHub Actions) |
| Runtime execution | PENDIENTE (requiere execution engine) |
