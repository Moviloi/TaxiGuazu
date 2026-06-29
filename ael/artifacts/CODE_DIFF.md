# CODE_DIFF

Generado por: **Implementer**
Fase del pipeline: `IMPLEMENTING`
Estado: `{{STATE}}`

---

## Resumen de cambios

| Archivo | Cambio | Líneas +/- |
|---------|--------|------------|
| {{FILE_PATH}} | {{CHANGE_DESCRIPTION}} | {{LINES_CHANGED}} |

## Diff

```diff
// Archivo: {{FILE_PATH}}
// Cambio: {{CHANGE_DESCRIPTION}}
- {{ORIGINAL_LINE}}
+ {{MODIFIED_LINE}}
```

## Tests afectados

| Archivo de test | Estado |
|-----------------|--------|
| {{TEST_FILE}} | {{TEST_STATUS}} |

## Scope compliance

- [ ] Todos los archivos modificados están dentro del scope de TASK_PLAN
- [ ] No se modificaron archivos fuera del scope
- [ ] No se crearon dependencias no aprobadas

## Rollback

```bash
git checkout -- {{FILES_MODIFIED}}
```
