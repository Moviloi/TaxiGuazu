> **STATUS: ARCHIVED**
> **REASON:** Historical artifact from ARNÉS pre-v1.0 architecture (pipeline de 7 fases).
> **REPLACED BY:** `ael/constitution/SPEC.md` (operational specification) and `ael/government/roles/` (capability contracts).
> **ARCHIVED:** 2026-07-23 — Sprint 9.2

# AEL Integration

Cómo la AEL interactúa con el ecosistema existente.

## Integración con OpenCode

### Estado actual

- OpenCode tiene `@opencode-ai/plugin: 1.15.12`
- No hay `opencode.json` (sin configuración de proyecto)
- No hay roles definidos en OpenCode
- No hay memory hooks

### Integración propuesta

| Componente AEL | Integración con OpenCode |
|---------------|-------------------------|
| PIPELINE.md | OpenCode lee como contexto |
| roles/*.md | OpenCode usa como instrucciones por rol |
| artifacts/*.md | OpenCode genera como output |
| contracts/CONTRACTS.md | OpenCode usa como reglas de validación |

### Configuración necesaria

```json
// opencode.json (futuro)
{
  "memory": {
    "path": ".opencode/memory/MEMORY.md"
  },
  "agents": {
    "ael": {
      "instructions": "ael/PIPELINE.md",
      "memory": ".opencode/memory/MEMORY.md"
    }
  }
}
```

## Integración con npm

### Commands existentes

| Command | Uso en AEL |
|---------|-----------|
| `npm test` | Auditor verifica regresiones |
| `npm run build` | Auditor verifica tipos |
| `npm run lint` | Auditor verifica estilo (futuro) |

### Commands propuestos

| Command | Uso en AEL |
|---------|-----------|
| `npm run ael:enforce` | Ejecuta contract checks (R1, R2, R3) |
| `npm run ael:validate` | Ejecuta todo el pipeline de validación |

### package.json addition

```json
{
  "scripts": {
    "ael:enforce": "bash ael/contracts/enforce.sh",
    "ael:validate": "npm test && npm run build && bash ael/contracts/enforce.sh"
  }
}
```

## Integración con git

### Workflow actual

```
main ← commits
```

### Workflow propuesto con AEL

```
main ← commits (con artifacts generados por AEL)
    ↑
    └── ael/artifacts/ (documentación de cada cambio)
```

### Commit convention

Al completar un pipeline AEL:

```
git add -A
git commit -m "ael: [descripción del cambio]

- TASK_PLAN: [goal]
- DESIGN_SPEC: [decisión clave]
- VALIDATION: PASS
- DECISION: [decisión tomada]
```

## Integración con MEMORY.md

### Flujo actual

1. Humano actualiza MEMORY.md manualmente
2. MEMORY.md se desactualiza

### Flujo con AEL

1. Memory role actualiza MEMORY.md automáticamente al final de cada pipeline
2. MEMORY.md siempre refleja el estado actual
3. Learning role detecta patrones en el historial

### Estructura de MEMORY.md (compatible con AEL)

```markdown
## 1. Estado actual
- Último commit: [hash] (generado por AEL)
- Último pipeline: [fecha] (generado por AEL)

## 2. Decisiones
- [decisión] (generado por Memory role)

## 3. Riesgos
- [riesgo] (generado por Architect/Explorer)

## 4. Historial
- [pipeline execution] (generado por Memory role)

## 5. Pendientes
- [deuda técnica] (generado por Learning role)

## 6. Constantes
- [constantes del sistema]

## 7. Glosario
- [términos del dominio]
```

## Integración con scripts legacy

### Scripts que se reutilizan

| Script | Uso en AEL |
|--------|-----------|
| `scripts/regex_debug.ts` | Explorer usa para debug de patterns |

### Scripts que se reemplazan

| Script | Reemplazado por |
|--------|----------------|
| `scripts/test_5b2.ts` - `test_8_0.ts` | `tests/` (vitest) |
| `scripts/test_role_lock.ts` | `tests/` (vitest) |

### Scripts que se eliminan

| Script | Razón |
|--------|-------|
| `scripts/analyze-legacy-flow.ts` | Obsoleto |

## Integración con CI/CD (futuro)

### GitHub Actions propuesto

```yaml
name: AEL Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: bash ael/contracts/enforce.sh
```

## Fricciones identificadas

| Fricción | Impacto | Mitigación |
|----------|---------|-----------|
| Sin `opencode.json` | AEL no puede configurar OpenCode automáticamente | Crear `opencode.json` como parte del pipeline |
| Sin CI/CD | Enforcement manual | `npm run ael:validate` como pre-commit hook |
| Sin contract tests | R1/R2/R3 manuales | `ael/contracts/enforce.sh` |
| 22 skills irrelevantes | Contexto polluted | No mitigable sin cambio de OpenCode |
