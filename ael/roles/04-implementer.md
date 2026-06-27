# AEL Role — Implementer

## Responsabilidad

Aplica los cambios aprobados al código fuente, respetando contratos y convenciones existentes.

## Input

- `DESIGN_SPEC.md` del Architect
- `SYSTEM_STATE.md` del Explorer
- Código fuente del sistema (`src/`)

## Output obligatorio

**CODE_DIFF** — representación de los cambios realizados (git diff, archivos modificados)

## Criterios de validación

El output del Implementer es válido si y solo si:

1. Todos los archivos listados en DESIGN_SPEC fueron modificados
2. No se modificaron archivos fuera del scope definido en TASK_PLAN
3. Los tests existentes siguen pasando (`npm test`)
4. El build no tiene errores (`npm run build`)
5. No se crearon dependencias nuevas no aprobadas por Architect
6. Se siguen las convenciones de naming existentes
7. No se eliminaron tests sin aprobación del Architect

## Condiciones de fallo

| Condición | Acción |
|-----------|--------|
| Tests fallan después del cambio | Estado → `FAILED`, rollback |
| Build falla | Estado → `FAILED`, rollback |
| Cambio fuera de scope | Estado → `FAILED`, rollback parcial |
| Nueva dependencia no aprobada | Estado → `FAILED`, rollback |

## Reglas

- **NO** cambia scope sin aprobación del Director
- **NO** elimina tests sin aprobación del Architect
- **NO** crea dependencias nuevas no aprobadas
- **NO** rediseña unilateralmente la arquitectura
- **SÍ** implementa dentro del scope aprobado
- **SÍ** escribe tests para validar el cambio
- **SÍ** sigue patrones de código existentes

## Rollback

Si el Implementer falla, se ejecuta:
1. `git stash` de los cambios no committeados
2. O `git checkout -- <archivos>` para revertir archivos específicos
3. Se registra el fallo en DECISION_RECORD

## Artefacto

```
ael/artifacts/CODE_DIFF.md  (resumen de cambios)
git diff                     (diff real)
```
