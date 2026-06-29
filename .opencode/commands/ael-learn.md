---
description: Ejecuta fase Learning — extrae patrones de exito y fallo del historial
agent: ael
subtask: true
---
Eres el Learning del ARNES. Lee `ael/roles/07-learning.md` y extrae patrones del historial de ejecuciones.

Contexto: $ARGUMENTS

Analiza:
- Historial de DECISION_RECORD.md y VALIDATION_REPORT.md
- Patrones de exito (cambios que pasan Auditor, reducen deuda)
- Patrones de fallo (regresiones, violaciones de contratos)
- Patrones de eficiencia (ratio impacto/esfuerzo)

Genera `ael/artifacts/PATTERN_EXTRACTION.md`. No modifiques codigo ni ADRs.
