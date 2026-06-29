---
description: Auto-diagnostico del ARNES — verifica integridad de todos los componentes
agent: ael
subtask: true
---
Eres el Medico del ARNES. Ejecuta un diagnostico completo de integridad del sistema de agentes.

Contexto: $ARGUMENTS

## Checks de integridad

### 1. Archivos de rol (7)
Verifica que existen todos los archivos en `ael/roles/`:
- [ ] `01-director.md`
- [ ] `02-explorer.md`
- [ ] `03-architect.md`
- [ ] `04-implementer.md`
- [ ] `05-auditor.md`
- [ ] `06-memory.md`
- [ ] `07-learning.md`

### 2. Archivos de comando (8)
Verifica que existen todos los comandos en `.opencode/commands/`:
- [ ] `ael-plan.md`
- [ ] `ael-explore.md`
- [ ] `ael-design.md`
- [ ] `ael-implement.md`
- [ ] `ael-enforce.md`
- [ ] `ael-validate.md`
- [ ] `ael-remember.md`
- [ ] `ael-learn.md`
- [ ] `ael-diagnose.md`

### 3. Configuracion de agentes
Verifica que `.opencode/opencode.json` contiene:
- [ ] Agente `ael` con modo `primary`
- [ ] Agente `ael-explore` con modo `subagent`
- [ ] Agente `ael-architect` con modo `subagent`
- [ ] Agente `ael-implementer` con modo `subagent`
- [ ] Agente `ael-audit` con modo `subagent`
- [ ] Agente `ael-memory` con modo `subagent`
- [ ] Agente `ael-learning` con modo `subagent`
- [ ] Director tiene permisos task para delegar a los 6 subagentes
- [ ] `instructions` apunta a `ael/AGENTS.md`

### 4. Documentacion del pipeline
Verifica que existen:
- [ ] `ael/PIPELINE.md`
- [ ] `ael/HANDOFF.md`
- [ ] `ael/FAILURE.md`
- [ ] `ael/AGENTS.md`

### 5. Contract enforcement
Verifica que existe:
- [ ] `ael/contracts/CONTRACTS.md`
- [ ] `ael/contracts/enforce.sh`

### 6. Artefactos
Verifica que existen los templates/artefactos en `ael/artifacts/`:
- [ ] `TASK_PLAN.md`
- [ ] `SYSTEM_STATE.md`
- [ ] `DESIGN_SPEC.md`
- [ ] `CODE_DIFF.md`
- [ ] `VALIDATION_REPORT.md`
- [ ] `DECISION_RECORD.md`
- [ ] `PATTERN_EXTRACTION.md`

### 7. Referencias cruzadas
- [ ] Todos los comandos referencian `agent: ael` (frontmatter)
- [ ] `ael.md` (Director) referencia los 7 roles en el pipeline
- [ ] `AGENTS.md` lista los 8 comandos y 7 subagentes
- [ ] `PIPELINE.md` referencia todos los artefactos de salida

## Reporte

Genera un reporte con:
```
=== ARNES Diagnostic Report ===
Fecha: {fecha}
Estado: {PASS|FAIL|WARNING}

Roles:        {7/7}  {PASS|FAIL}
Comandos:     {8/8}  {PASS|FAIL}
Agentes:      {7/7}  {PASS|FAIL}
Documentacion: {4/4}  {PASS|FAIL}
Contratos:    {2/2}  {PASS|FAIL}
Artefactos:   {7/7}  {PASS|FAIL}
Referencias:  {4/4}  {PASS|FAIL}

Problemas encontrados:
- {lista de problemas}

Recomendaciones:
- {lista de correcciones}
```

Si todos los checks pasan, el ARNES esta sano y listo para operar.
Si hay fallos, propon las correcciones especificas necesarias.
