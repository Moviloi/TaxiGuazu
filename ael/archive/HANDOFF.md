# AEL Handoff Protocol

Protocolo de transferencia entre roles del pipeline.

## Regla general

**Ninguna fase puede iniciar hasta que la anterior haya completado y su output haya sido validado.**

## Handoff por transición

### DIRECTOR → EXPLORER

| Campo | Valor |
|-------|-------|
| **Artefacto transferido** | `TASK_PLAN.md` |
| **Validación previa** | Director verificó que TASK_PLAN tiene goal, scope, priority, phases[] |
| **Validación del receptor** | Explorer verifica que scope lista archivos reales que existen |
| **Condición de bloqueo** | Si TASK_PLAN no existe o está vacío |
| **Reintento** | Director regenera TASK_PLAN con más contexto |

### EXPLORER → ARCHITECT

| Campo | Valor |
|-------|-------|
| **Artefacto transferido** | `SYSTEM_STATE.md` |
| **Validación previa** | Explorer verificó que todos los archivos listados existen |
| **Validación del receptor** | Architect verifica que SYSTEM_STATE es completo y correcto |
| **Condición de bloqueo** | Si SYSTEM_STATE tiene divergencias no documentadas |
| **Reintento** | Explorer actualiza SYSTEM_STATE con más información |

### ARCHITECT → IMPLEMENTER

| Campo | Valor |
|-------|-------|
| **Artefacto transferido** | `DESIGN_SPEC.md` |
| **Validación previa** | Architect verificó compatibilidad con ADR 001-004 |
| **Validación del receptor** | Implementer verifica que DESIGN_SPEC es factible de implementar |
| **Condición de bloqueo** | Si DESIGN_SPEC viola un ADR sin justificación |
| **Reintento** | Architect ajusta DESIGN_SPEC o escala a Director |

### IMPLEMENTER → AUDITOR

| Campo | Valor |
|-------|-------|
| **Artefacto transferido** | Código modificado + `CODE_DIFF.md` |
| **Validación previa** | Implementer verificó que `npm test` pasa |
| **Validación del receptor** | Auditor re-ejecuta `npm test` y `npm run build` |
| **Condición de bloqueo** | Si tests o build fallan |
| **Reintento** | Implementer corrige errores y re-intenta |

### AUDITOR → MEMORY

| Campo | Valor |
|-------|-------|
| **Artefacto transferido** | `VALIDATION_REPORT.md` |
| **Validación previa** | Auditor verificó que todos los checks pasan |
| **Validación del receptor** | Memory verifica que VALIDATION_REPORT es completo |
| **Condición de bloqueo** | Si VALIDATION_REPORT marca FAIL |
| **Reintento** | Auditor re-ejecuta checks |

### MEMORY → LEARNING

| Campo | Valor |
|-------|-------|
| **Artefacto transferido** | `DECISION_RECORD.md` + MEMORY.md actualizado |
| **Validación previa** | Memory verificó que MEMORY.md se actualizó correctamente |
| **Validación del receptor** | Learning verifica que hay suficiente historial para detectar patrones |
| **Condición de bloqueo** | Si MEMORY.md no se pudo actualizar |
| **Reintento** | Memory restaura MEMORY.md desde último commit conocido |

## Cadena de validación

```
Director valida TASK_PLAN
    ↓
Explorer valida que scope es real (R3)
    ↓
Architect valida que diseño preserva contratos (R1, R2)
    ↓
Implementer valida que código cumple DESIGN_SPEC
    ↓
Auditor valida que tests + build pasan
    ↓
Memory valida que MEMORY.md está actualizado
    ↓
Learning valida que hay evidencia suficiente
```

## Escalamiento

Si un rol falla y no puede completar su tarea:

1. **Intento 1:** Re-ejecutar la misma fase con el mismo input
2. **Intento 2:** Re-ejecutar con input ajustado (más contexto)
3. **Intento 3:** Escalar a Director para decisión
4. **Intento 4:** Abortar pipeline

## Bloqueadores permanentes

| Condición | Acción |
|-----------|--------|
| Director no puede definir scope | ABORTED |
| Architect rechaza diseño por ADR violation | REJECTED → Director decide |
| Auditor falla 3 veces consecutivas | ABORTED |
| Rollback falla | ALERTA MANUAL |
