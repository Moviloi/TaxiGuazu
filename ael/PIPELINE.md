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

## Reglas de ejecución

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
