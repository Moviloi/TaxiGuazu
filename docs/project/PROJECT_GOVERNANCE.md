# PROJECT GOVERNANCE — AITOS
## v1.0 | 2026-07-08

---

## Fuentes de verdad

| Información | Archivo canónico | Formato |
|---|---|---|
| **Estado del proyecto** | `docs/project/PROJECT_BOARD.md` | Tareas con ID, estado, prioridad |
| **Roadmap** | `docs/ROADMAP.md` | Fases y milestones |
| **Decisiones arquitectónicas** | `docs/adr/` | ADR-001 a ADR-007 |
| **Deuda técnica** | `docs/certification/TECHNICAL_DEBT_BASELINE.md` | Clasificada P1/P2/P3 |
| **Calidad** | `docs/certification/QUALITY_BASELINE.md` | Métricas de build/tests/coverage |
| **Historial de cambios** | `docs/project/CHANGELOG.md` | Timeline de misiones |
| **Protocolo de desarrollo** | `docs/project/PROJECT_WORKFLOW.md` | Checklist por misión |

**Regla**: Ninguna información de gestión se duplica entre estos archivos. BACKLOG.md (`ael/artifacts/`) es el registro histórico; PROJECT_BOARD.md es el estado actual.

---

## Estados de tareas

| Estado | Significado | Cuándo se usa |
|---|---|---|
| `DISCOVERY` | Investigando el problema | Nueva tarea de una auditoría |
| `ADR_PENDING` | Requiere decisión arquitectónica | Se necesita ADR antes de implementar |
| `READY` | Lista para implementar | ADR aprobada o no requiere ADR |
| `IN_PROGRESS` | En implementación activa | Desarrollo comenzado |
| `REVIEW` | Implementada, pendiente de revisión | PR abierto o esperando validación |
| `DONE` | Completada y verificada | Build ✅, tests ✅, contratos ✅ |
| `BLOCKED` | Bloqueada por dependencia | Otra tarea debe completarse primero |
| `CANCELLED` | Descartada explícitamente | Ya no es relevante |

---

## Trazabilidad obligatoria

Toda tarea en PROJECT_BOARD.md debe incluir:
- **ADR**: qué ADR la respalda (o `N/A` si no aplica)
- **Origen**: qué documento/auditoría la generó
- **Implementación**: qué commit(s) la resolvieron
- **Dominio**: a qué bounded context pertenece

---

## Protocolo de cierre de misión

Al finalizar cualquier misión, se ejecuta este checklist:

1. Revisar `PROJECT_BOARD.md`
2. Marcar tareas completadas como `DONE`
3. Crear nuevas tareas derivadas de hallazgos
4. Cerrar o cancelar tareas obsoletas
5. Actualizar `CHANGELOG.md`
6. Actualizar `ROADMAP.md` si cambió el plan
7. Actualizar `TECHNICAL_DEBT_BASELINE.md` si aplica
8. Emitir resumen de estado en el commit message
