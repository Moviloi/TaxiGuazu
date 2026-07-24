> **STATUS: ARCHIVED**
> **REASON:** Historical artifact from ARNÉS pre-v1.0 architecture (pipeline de 7 fases).
> **REPLACED BY:** `ael/constitution/SPEC.md` (operational specification) and `ael/government/roles/` (capability contracts).
> **ARCHIVED:** 2026-07-23 — Sprint 9.2

# AEL Pipeline — Agent Execution Layer

Pipeline formal de ejecución agéntica para el sistema TaxGuazú.

## Flujo de ejecución

```
USER REQUEST
    ↓
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌─────────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ DIRECTOR │───→│ EXPLORER  │───→│ ARCHITECT │───→│ IMPLEMENTER │───→│ AUDITOR  │───→│  MEMORY  │───→│ LEARNING │
│          │    │           │    │           │    │             │    │          │    │          │    │          │
│ Decide   │    │ Descubre │    │ Valida   │    │ Ejecuta    │    │ Verifica │    │ Conserva │    │ Detecta  │
│ qué y    │    │ estado   │    │ diseño   │    │ cambios    │    │ calidad  │    │ estado   │    │ patrones │
│ en qué   │    │ real     │    │          │    │            │    │          │    │          │    │          │
│ orden    │    │          │    │          │    │            │    │          │    │          │    │          │
└─────────┘    └───────────┘    └───────────┘    └─────────────┘    └──────────┘    └──────────┘    └──────────┘
    │               │                │                  │                │               │               │
    ▼               ▼                ▼                  ▼                ▼               ▼               ▼
TASK_PLAN    SYSTEM_STATE    DESIGN_SPEC        CODE_DIFF       VALIDATION_    DECISION_     PATTERN_
    .md           .md            .md                              REPORT.md      RECORD.md     EXTRACTION.md
```

## Estado de ejecución

Cada instancia del pipeline tiene un estado:

| Estado | Significado | Transiciones |
|--------|------------|--------------|
| `INIT` | Request recibida, esperando Director | → `PLANNING` |
| `PLANNING` | Director genera TASK_PLAN | → `EXPLORING` o `REJECTED` |
| `EXPLORING` | Explorer genera SYSTEM_STATE | → `DESIGNING` o `BLOCKED` |
| `DESIGNING` | Architect genera DESIGN_SPEC | → `IMPLEMENTING` o `REJECTED` |
| `IMPLEMENTING` | Implementer genera CODE_DIFF | → `VALIDATING` o `FAILED` |
| `VALIDATING` | Auditor genera VALIDATION_REPORT | → `RECORDING` o `FAILED` |
| `RECORDING` | Memory genera DECISION_RECORD | → `LEARNING` |
| `LEARNING` | Learning genera PATTERN_EXTRACTION | → `COMPLETE` |
| `COMPLETE` | Pipeline terminado exitosamente | — |
| `REJECTED` | Rol rechazó la propuesta | → `PLANNING` (retry) o `ABORTED` |
| `BLOCKED` | Información insuficiente | → `EXPLORING` (retry) o `ABORTED` |
| `FAILED` | Error en ejecución | → `ROLLBACK` o `ABORTED` |
| `ROLLBACK` | Revertiendo cambios | → `COMPLETE` o `FAILED` |
| `ABORTED` | Pipeline abortado | — |

## Modos de fallo

Cada fase tiene modos de fallo documentados en `ael/FAILURE.md`. Antes de iniciar cualquier fase, revisa los modos de fallo correspondientes como checklist de riesgos.

## Reglas de ejecución

### Señal de identidad

Cada mensaje del pipeline (Director, Explorer, Architect, Implementer, Auditor, Memory, Learning) debe comenzar con el identificador del rol activo entre corchetes:

- `[ael]` — Director
- `[ael-explore]` — Explorer
- `[ael-architect]` — Architect
- `[ael-implementer]` — Implementer
- `[ael-audit]` — Auditor
- `[ael-memory]` — Memory
- `[ael-learning]` — Learning

Esto aplica a todo output visible para el usuario durante la ejecución del pipeline. No aplica a artefactos internos (archivos .md en ael/artifacts/).

### Secuencialidad

El pipeline es **estrictamente secuencial**. Ninguna fase puede iniciar hasta que la anterior complete con estado `COMPLETE` o transición válida.

### Idempotencia

Cada fase debe ser idempotente: re-ejecutar la misma fase con el mismo input produce el mismo output. Esto permite reintentos seguros.

### Rollback

Si una fase falla después de haber modificado código, el pipeline entra en `ROLLBACK`:
1. Auditor detecta fallo
2. Se ejecuta `git stash` o `git checkout` de los archivos modificados
3. Se registra el fallo en DECISION_RECORD
4. Pipeline termina en `ABORTED`

### Validación cruzada

Cada rol valida el output del rol anterior antes de iniciar su trabajo:
- Explorer valida que TASK_PLAN referencia archivos reales
- Architect valida que SYSTEM_STATE es correcto
- Implementer valida que DESIGN_SPEC es factible
- Auditor valida que CODE_DIFF respeta contratos
- Memory valida que el cambio es significativo
- Learning valida que hay evidencia suficiente

## Trigger de ejecución

El pipeline se ejecuta cuando un usuario (humano o agente) invoca:

```
ael run "<descripción del cambio>"
```

Esto inicia el ciclo completo desde DIRECTOR.

## Condiciones de terminación

| Condición | Estado final | Acción |
|-----------|-------------|--------|
| Pipeline completo | `COMPLETE` | Commit + push |
| Director rechaza | `REJECTED` | Informar al usuario |
| Architect rechaza | `REJECTED` | Volver a Planner o abortar |
| Auditor falla | `FAILED` | Rollback + informar |
| Rollback falla | `FAILED` | Alerta manual |
| Timeout | `ABORTED` | Rollback + informar |

## Closing checklist

Antes de declarar una tarea como `COMPLETE` y pasar a la siguiente, el Director debe verificar **cada uno** de estos puntos con evidencia concreta (no "confiar en que funciona"):

1. **Tests**: `npm test` pasa sin regresiones (reportar count: "N files, M tests, 0 failures")
2. **Build**: `npm run build` compila sin errores (0 warnings blocking)
3. **Contratos**: `bash ael/contracts/enforce.sh` pasa
4. **Git commit**: el código está commiteado en git (verificar con `git log --oneline -1` o `git status --short`). No es suficiente con que "funciona en disco" — si no hay commit, el pipeline no está cerrado. El commit es el sello de que la tarea se completó realmente.
5. **Backlog**: si la tarea tiene una entrada en `ael/artifacts/BACKLOG.md`, actualizarla con el estado real, archivos modificados y commit SHA.

Cualquier ítem de esta lista en `PENDING` o `IN_PROGRESS` impide que el pipeline pase a `COMPLETE`.
