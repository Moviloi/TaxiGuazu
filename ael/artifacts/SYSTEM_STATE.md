# SYSTEM_STATE — Template

Generado por: **Explorer**
Fase del pipeline: `EXPLORING`

---

## Archivos relevantes

### Archivo: `src/lib/...`

- **Path completo:** `src/lib/...`
- **Líneas relevantes:** 1-50, 100-150
- **Dependencias:** importa de `@/lib/...`
- **Dependientes:** es importado por `src/lib/...`
- **Tests:** `tests/....test.ts`
- **Estado:** funcional / con deuda / con gaps

## Tests afectados

| Test | Archivo | Risk |
|------|---------|------|
| ... | `tests/....test.ts` | ALTO / MEDIO / BAJO |

## Dependencias cruzadas

```
lead.service.ts → [27 imports]
  ├── ai/handler.ts
  ├── ai/core.ts
  ├── db/database.ts
  └── ... (listar todos)
```

## Divergencias código↔documentación

| Documento dice | Código hace | Severidad |
|---------------|------------|-----------|
| ... | ... | ALTA / MEDIA / BAJO |

## Riesgos identificados

- Riesgo 1: ...
- Riesgo 2: ...
