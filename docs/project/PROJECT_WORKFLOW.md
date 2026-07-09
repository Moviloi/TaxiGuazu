# PROJECT WORKFLOW — Protocolo permanente
## v1.0 | 2026-07-08

---

## Checklist obligatorio al finalizar cualquier misión

Toda misión (auditoría, ADR, implementación, investigación) se considera **incompleta** hasta que:

### 1. Backlog
- [ ] Revisar `docs/project/PROJECT_BOARD.md`
- [ ] Marcar tareas completadas como `DONE` (con commit SHA si aplica)
- [ ] Crear nuevas tareas para hallazgos no resueltos
- [ ] Cancelar tareas que ya no aplican (marcar `CANCELLED` con motivo)
- [ ] Verificar que no haya tareas duplicadas
- [ ] Actualizar prioridades si cambiaron

### 2. Roadmap
- [ ] Revisar `docs/ROADMAP.md`
- [ ] Actualizar hitos completados
- [ ] Ajustar fechas si es necesario

### 3. ADR
- [ ] Si la misión involucró una decisión arquitectónica, crear/actualizar ADR en `docs/adr/`
- [ ] Si una ADR existente fue implementada, marcar como `ACCEPTED`

### 4. Deuda técnica
- [ ] Revisar `docs/certification/TECHNICAL_DEBT_BASELINE.md`
- [ ] Marcar deuda resuelta
- [ ] Agregar nueva deuda identificada

### 5. Documentación
- [ ] Si se modificó comportamiento, actualizar docs afectados
- [ ] Si se creó un nuevo módulo, documentar en `SYSTEM_BASELINE_REPORT.md`

### 6. Validación
- [ ] `npm run build` ✅
- [ ] `npm test` (875/876 o mejor)
- [ ] `bash ael/contracts/enforce.sh` ✅

### 7. Changelog
- [ ] Agregar entrada en `docs/project/CHANGELOG.md`

### 8. Git
- [ ] Commit con mensaje descriptivo
- [ ] Push a `origin/main`

---

## Tipos de misión y sus entregables mínimos

| Tipo | Entregables |
|---|---|
| **Auditoría** | Informe en `docs/certification/` + tareas en PROJECT_BOARD |
| **ADR** | Archivo en `docs/adr/` + tareas creadas/modificadas en PROJECT_BOARD |
| **Implementación** | Código + tests + informe en `docs/certification/` + PROJECT_BOARD actualizado |
| **Investigación** | Informe en `docs/certification/` + hallazgos como tareas en PROJECT_BOARD |

---

## Convención de commits

```
<tipo>(<dominio>): <descripción breve>

<detalle>
```

Tipos: `feat`, `fix`, `refactor`, `docs`, `audit`, `adr`, `release`

Ejemplo: `refactor(lead): extract awaiting-confirmation handler (A5)`
