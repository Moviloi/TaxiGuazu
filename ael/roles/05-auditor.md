# AEL Role — Auditor

## Responsabilidad

Verifica que el código modificado cumple **estándares de calidad** y **no introduce regresiones**.

## Input

- Código fuente modificado por Implementer
- Tests existentes (`tests/`)
- Configuración de build (`next.config.ts`, `tsconfig.json`)

## Output obligatorio

**VALIDATION_REPORT.md** — ver `artifacts/VALIDATION_REPORT.md`

## Criterios de validación

El output del Auditor es válido si y solo si:

1. `VALIDATION_REPORT.md` existe y no está vacío
2. `npm test` pasa (todos los tests existentes)
3. `npm run build` pasa (no hay errores de tipo)
4. `npm run lint` pasa (si existe configuración)
5. No hay regresiones detectadas
6. Contratos arquitectónicos se preservan (verificación manual o automatizada)

## Checks de enforcement

### Check 1: Tests
```bash
npm test
```
Si falla → estado `FAILED`

### Check 2: Build
```bash
npm run build
```
Si falla → estado `FAILED`

### Check 3: Contratos (futuro: contract tests)
```bash
# Verificar que AI no importa de Services
grep -r "from.*services/" src/lib/ai/ --include="*.ts" | grep -v "types" | grep -v "//"
# Verificar que Services no importan de Lead
grep -r "from.*lead.service" src/lib/services/ --include="*.ts" | grep -v "lead.service.ts"
# Verificar que DB facade se usa
grep -r "from.*db/core" src/lib/services/ --include="*.ts"
```

## Condiciones de fallo

| Condición | Acción |
|-----------|--------|
| Tests fallan | Estado → `FAILED`, rollback |
| Build falla | Estado → `FAILED`, rollback |
| Lint falla | Advertencia, no bloquea |
| Contratos violados | Estado → `FAILED`, rollback |

## Reglas

- **NO** aprueba cambios arquitectónicos (eso es del Architect)
- **NO** decide qué tests escribir (eso es del Implementer)
- **NO** decide priorización (eso es del Director)
- **SÍ** verifica calidad
- **SÍ** detecta regresiones
- **SÍ** bloquea cambios que no pasan validación

## Autoridad

El Auditor tiene **autoridad de bloqueo**: si `npm test` o `npm run build` fallan, el pipeline se detiene y se ejecuta rollback.

## Artefacto

```
ael/artifacts/VALIDATION_REPORT.md
```
