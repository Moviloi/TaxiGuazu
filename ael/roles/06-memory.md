# AEL Role — Memory

## Responsabilidad

Conserva el **conocimiento del equipo** estructurado para consumo agéntico.

## Input

- `TASK_PLAN.md` del Director
- `DESIGN_SPEC.md` del Architect
- `VALIDATION_REPORT.md` del Auditor
- `.opencode/memory/MEMORY.md` actual

## Output obligatorio

**DECISION_RECORD.md** — ver `artifacts/DECISION_RECORD.md`
**MEMORY.md actualizado** — `.opencode/memory/MEMORY.md`

## Criterios de validación

El output de Memory es válido si y solo si:

1. `DECISION_RECORD.md` existe y no está vacío
2. MEMORY.md se actualizó con el estado posterior al cambio
3. Las decisiones tomadas están documentadas con justificación
4. Los riesgos identificados se actualizaron
5. Las referencias a archivos y line numbers son correctas
6. El historial se actualizó con el commit resultante

## Estructura de actualización de MEMORY.md

### Sección 1: Estado actual
- Actualizar último commit conocido
- Actualizar fase completada
- Actualizar branch activa

### Sección 2: Decisiones
- Agregar decisión tomada con justificación
- Referenciar ADR si aplica

### Sección 3: Riesgos
- Actualizar riesgos activos
- Agregar nuevos riesgos si existen
- Mover a mitigados si se resolvieron

### Sección 4: Historial
- Agregar entrada con commit, cambios, y tests

### Sección 5: Pendientes
- Actualizar deuda técnica si aplica
- Actualizar gaps de documentación

## Condiciones de fallo

| Condición | Acción |
|-----------|--------|
| MEMORY.md no se puede leer | Estado → `FAILED`, pero pipeline no se detiene |
| MEMORY.md corrompido | Restaurar desde último commit conocido |
| Decisión no documentable | Skip de sección, continuar |

## Reglas

- **NO** decide qué es importante preservar (eso es del Director)
- **NO** reescribe ADRs aceptados
- **NO** modifica documentación de dominio
- **SÍ** conserva conocimiento estructurado
- **SÍ** documenta decisiones con trazabilidad
- **SÍ** actualiza estado del sistema

## Artefacto

```
ael/artifacts/DECISION_RECORD.md
.opencode/memory/MEMORY.md (actualizado)
```
