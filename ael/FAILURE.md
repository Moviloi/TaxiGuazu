# AEL Failure Modes

Análisis de modos de fallo y estrategias de recuperación.

## Failure Modes por fase

### Director Falla

| Modo de fallo | Detectado por | Acción |
|---------------|--------------|--------|
| Request ambigua | Director mismo | Estado → `BLOCKED`, solicitar clarificación |
| Scope indefinido | Explorer (R3) | Director regenera TASK_PLAN |
| Prioridad contradictoria | Architect | Director resuelve conflicto |
| Request fuera de scope | Director mismo | Estado → `REJECTED` |

**Rollback:** No aplica (no hay código modificado).

### Explorer Falla

| Modo de fallo | Detectado por | Acción |
|---------------|--------------|--------|
| Archivos no existen | Explorer mismo (R3) | Estado → `BLOCKED`, informar Director |
| Dependencias no mapeadas | Architect | Explorer actualiza SYSTEM_STATE |
| Divergencia código↔docs | Explorer mismo | Documentar en SYSTEM_STATE |

**Rollback:** No aplica (no hay código modificado).

### Architect Falla

| Modo de fallo | Detectado por | Acción |
|---------------|--------------|--------|
| Diseño viola ADR | Architect mismo | Estado → `REJECTED`, escalar a Director |
| Contratos no preservados | Architect mismo | Estado → `REJECTED` |
| Diseño no factible | Implementer | Architect ajusta DESIGN_SPEC |

**Rollback:** No aplica (no hay código modificado).

### Implementer Falla

| Modo de fallo | Detectado por | Acción |
|---------------|--------------|--------|
| Tests fallan | Auditor | `git stash` + rollback |
| Build falla | Auditor | `git stash` + rollback |
| Scope excedido | Auditor | `git checkout -- <archivos>` |
| Dependencia no aprobada | Auditor | `git stash` + rollback |

**Rollback:**
```bash
git stash
# O para archivos específicos:
git checkout -- src/lib/...
```

### Auditor Falla

| Modo de fallo | Detectado por | Acción |
|---------------|--------------|--------|
| Tests fallan | Auditor mismo | Estado → `FAILED`, rollback |
| Build falla | Auditor mismo | Estado → `FAILED`, rollback |
| Contratos violados | Auditor mismo | Estado → `FAILED`, rollback |

**Rollback:** Implementer revierte cambios.

### Memory Falla

| Modo de fallo | Detectado por | Acción |
|---------------|--------------|--------|
| MEMORY.md no legible | Memory mismo | Pipeline continúa (no bloquea) |
| MEMORY.md corrupto | Memory mismo | Restaurar desde último commit |
| Decisión no documentable | Memory mismo | Skip de sección |

**Rollback:** No aplica (no hay código modificado).

### Learning Falla

| Modo de fallo | Detectado por | Acción |
|---------------|--------------|--------|
| Historial insuficiente | Learning mismo | Skip de fase, pipeline completa |
| Patrones inconsistentes | Learning mismo | Documentar como "posible patrón" |
| Mejora viola contratos | Learning mismo | Rechazar mejora |

**Rollback:** No aplica (no hay código modificado).

## Cascade Failures

### Implementer → Auditor → Rollback

```
Implementer modifica código
    ↓
Auditor detecta fallo en tests
    ↓
Pipeline entra en ROLLBACK
    ↓
Implementer revierte cambios (git stash)
    ↓
Auditor re-verifica (tests pasan)
    ↓
Pipeline → ABORTED
    ↓
Memory documenta fallo
```

### Architect → Director → Rediseño

```
Architect rechaza diseño por ADR violation
    ↓
Director recibe escalamiento
    ↓
Director decide: corregir o crear ADR
    ↓
Si corregir → Architect genera nuevo DESIGN_SPEC
    ↓
Si crear ADR → Director documenta en ADR, pipeline re-inicia
```

## Idempotencia

Cada fase debe ser idempotente:
- Re-ejecutar Director con el mismo request produce el mismo TASK_PLAN
- Re-ejecutar Explorer con el mismo TASK_PLAN produce el mismo SYSTEM_STATE
- Re-ejecutar Architect con el mismo SYSTEM_STATE produce el mismo DESIGN_SPEC
- Re-ejecutar Implementer con el mismo DESIGN_SPEC produce los mismos cambios
- Re-ejecutar Auditor con los mismos cambios produce el mismo VALIDATION_REPORT

Excepción: Memory y Learning pueden producir output diferente si el estado de MEMORY.md cambió.

## Timeout

Si una fase tarda más de 5 minutos:
1. Pipeline entra en `FAILED`
2. Se ejecuta rollback si hay código modificado
3. Se documenta timeout en DECISION_RECORD
4. Se informa al usuario
