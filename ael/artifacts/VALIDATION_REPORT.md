# VALIDATION_REPORT

Generado por: **Auditor**
Fase del pipeline: `VALIDATING`
Estado: `{{STATE}}`

---

## Resumen

| Check | Resultado |
|-------|-----------|
| `npm test` | {{TEST_RESULT}} |
| `npm run build` | {{BUILD_RESULT}} |
| `npm run lint` | {{LINT_RESULT}} |
| `bash ael/contracts/enforce.sh` | {{ENFORCE_RESULT}} |

## Detalle de tests

{{TEST_DETAIL}}

## Detalle de build

{{BUILD_DETAIL}}

## Violaciones de contrato

{{CONTRACT_VIOLATIONS}}

## Regresiones detectadas

{{REGRESSIONS}}

## Decisión

- [ ] **PASS** — Todos los checks pasan. Pipeline continúa a Memory.
- [ ] **FAIL** — Uno o más checks fallan. Pipeline entra en ROLLBACK.

## Artefactos relacionados

- `CODE_DIFF.md` — cambios validados
- `DESIGN_SPEC.md` — especificación de diseño implementada
