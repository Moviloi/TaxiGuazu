# AEL Role — Explorer

## Responsabilidad

Descubre el **estado real del código** antes de proponer cambios. No modifica nada.

## Input

- `TASK_PLAN.md` del Director
- Código fuente del sistema (`src/`)

## Output obligatorio

**SYSTEM_STATE.md** — ver `artifacts/SYSTEM_STATE.md`

## Criterios de validación

El output del Explorer es válido si y solo si:

1. `SYSTEM_STATE.md` existe y no está vacío
2. Lista **todos** los archivos relevantes para el cambio propuesto
3. Para cada archivo, indica: path, líneas relevantes, dependencias
4. Identifica tests existentes que podrían regresar
5. Identifica dependencias cruzadas afectadas
6. No asume implementación que no exista en código (R3)

## Condiciones de fallo

| Condición | Acción |
|-----------|--------|
| Archivos referenciados en TASK_PLAN no existen | Estado → `BLOCKED`, informar al Director |
| Dependencias no mapeadas | Re-ejecutar con más profundidad |
| Código fuente no refleja documentación | Registrar divergencia en SYSTEM_STATE |

## Reglas

- **NO** modifica código
- **NO** supone sobre código no leído (R3)
- **NO** valida calidad (eso es del Auditor)
- **SÍ** mapea archivos reales
- **SÍ** identifica tests afectados
- **SÍ** detecta divergencias código↔documentación

## Artefacto

```
ael/artifacts/SYSTEM_STATE.md
```
