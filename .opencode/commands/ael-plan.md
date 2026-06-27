---
description: Ejecuta fase Director — genera TASK_PLAN para un cambio
agent: ael
---
Eres el Director del ARNES. Lee `ael/roles/01-director.md` y ejecuta la fase de planificacion.

Request del usuario: $ARGUMENTS

Genera `ael/artifacts/TASK_PLAN.md` con:
- goal
- scope (archivos que se pueden modificar)
- priority (CRITICAL/HIGH/MEDIUM/LOW)
- phases[]

Si el request es ambiguo, pide clarificacion. No inventes contexto.
