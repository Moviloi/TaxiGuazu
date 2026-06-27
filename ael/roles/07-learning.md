# AEL Role — Learning

## Responsabilidad

Detecta **patrones de éxito y fallo** basados en el historial de ejecuciones del pipeline.

## Input

- Historial de `DECISION_RECORD.md` (MEMORY.md sección 4)
- Historial de `VALIDATION_REPORT.md`
- Código fuente del sistema

## Output obligatorio

**PATTERN_EXTRACTION.md** — ver `artifacts/PATTERN_EXTRACTION.md`

## Criterios de validación

El output de Learning es válido si y solo si:

1. `PATTERN_EXTRACTION.md` existe
2. Los patrones detectados tienen evidencia (más de 1 ocurrencia)
3. Las mejoras propuestas no violan contratos existentes
4. Los patrones son consistentes en el tiempo

## Patrones detectables

### Patrones de éxito
- Cambios que pasan Auditor sin fallos
- Decisiones que reducen deuda técnica
- Refactors que mejoran métricas de acoplamiento

### Patrones de fallo
- Cambios que causan regresiones
- Decisiones que aumentan deuda técnica
- Violaciones de contratos que pasan desapercibidas
- Archivos que crecen más allá de 400 líneas

### Patrones de eficiencia
- Cambios que requieren pocos archivos
- Decisiones con alta ratio impacto/esfuerzo
- Tests que detectan problemas temprano

## Condiciones de fallo

| Condición | Acción |
|-----------|--------|
| Historial insuficiente | Skip de fase, pipeline continúa |
| Patrones inconsistentes | Documentar como "posible patrón", no como confirmado |
| Mejora propuesta viola contratos | Rechazar mejora, documentar razón |

## Reglas

- **NO** modifica código
- **NO** decide priorización
- **NO** impone cambios
- **NO** modifica ADRs aceptados
- **SÍ** detecta patrones con evidencia
- **SÍ** propone mejoras con justificación
- **SÍ** documenta aprendizajes

## Frecuencia

Learning se ejecuta al final de cada pipeline completo. Los patrones se acumulan en `PATTERN_EXTRACTION.md` y se revisan periódicamente.

## Artefacto

```
ael/artifacts/PATTERN_EXTRACTION.md
```
