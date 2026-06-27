# VALIDATION_REPORT — Template

Generado por: **Auditor**
Fase del pipeline: `VALIDATING`

---

## Summary

- **Estado:** PASS / FAIL
- **Tests ejecutados:** N
- **Tests pasaron:** N
- **Build:** PASS / FAIL
- **Lint:** PASS / FAIL / SKIP

## Test Results

```
[output de npm test]
```

## Build Results

```
[output de npm run build]
```

## Contract Checks

### R1: Contract Integrity
- AI → Services: PASS / FAIL
- Detalle: ...

### R2: Dependency Rules
- Utils leaf: PASS / FAIL
- DB Facade: PASS / FAIL (N violaciones)
- Circular deps: PASS / FAIL (N violaciones)
- Detalle: ...

### R3: Code Existence
- Archivos referenciados existen: PASS / FAIL
- Detalle: ...

## Regresiones detectadas

| Test | Antes | Después | Impacto |
|------|-------|---------|---------|
| ... | PASS | FAIL | ... |

## Approval

- **Aprobado:** SÍ / NO
- **Condición:** [si es condicional]
- **Próximo paso:** IMPLEMENTING / ROLLBACK
