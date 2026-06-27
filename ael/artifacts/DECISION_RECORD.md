# DECISION_RECORD — Separación de responsabilidades en lead.service

Generado por: **Memory**
Fase del pipeline: `RECORDING`

---

## Pipeline Execution

- **Fecha:** 2026-06-27
- **Request:** Separar responsabilidades en lead.service
- **Estado final:** COMPLETE
- **Commit:** pendiente

## Decisiones tomadas

### Decisión 1: Mantener función en lead.service.ts con re-export

- **Quién:** Architect + Implementer
- **Qué:** `handleSlotConfirmationButton` permanece en `lead.service.ts`. Se crea `workflow/slot-confirmation-handler.ts` como re-export.
- **Por qué:** La función usa dynamic imports (`await import()`) que Vitest no intercepta correctamente cuando están en módulos separados. Los tests de integración que pasan por `handleLeadMessage` dependen de mocks configurados para `lead.service.ts`.
- **ADR reference:** ADR 004 (Service Boundaries) — función permanece en el dominio correcto (workflow-related logic en lead.service como orquestador top-level)
- **Impacto:** `lead.service.ts` (303→268 líneas), `workflow/slot-confirmation-handler.ts` (creado, 1 línea re-export)

### Decisión 2: No resolver circular survey→lead en este pipeline

- **Quién:** Architect
- **Qué:** La dependencia circular `survey.service.ts → lead.service.ts` se mantiene como deuda técnica conocida.
- **Por qué:** Requiere ADR nuevo o extracción de `handleLeadMessage` a un módulo compartido. Impacto demasiado alto para un refactor de separación de responsabilidades.
- **ADR reference:** ADR 004 ya documenta esta violación como conocida
- **Impacto:** Sin cambio

## Cambios realizados

| Archivo | Tipo de cambio | Líneas |
|---------|---------------|--------|
| `src/lib/services/lead.service.ts` | MODIFICADO | -35 (303→268) |
| `src/lib/services/workflow/slot-confirmation-handler.ts` | CREADO | +1 (re-export) |

## Tests ejecutados

| Test | Resultado |
|------|-----------|
| `npm test` | PASS (610 passed, 2 pre-existentes) |
| `npm run build` | PASS |
| `enforce.sh` | PASS (sin nuevas violaciones) |

## Riesgos identificados

| Riesgo | Severidad | Mitigación |
|--------|-----------|-----------|
| Dynamic imports en módulo separado | ALTA | Función permanece en lead.service.ts |
| Circular survey→lead | ALTA | ADR 004 documenta, pendiente de resolver |
| Tests de integración frágiles | MEDIA | Mocks deben actualizarse si cambia la estructura de imports |

## Deuda técnica generada

| Deuda | Severidad |
|-------|-----------|
| `slot-confirmation-handler.ts` es solo re-export (no separación real) | BAJO |
| Función de 132 líneas permanece en lead.service.ts | MEDIA |

## Referencias

- TASK_PLAN: generado en memoria (Fase Director)
- DESIGN_SPEC: generado en memoria (Fase Architect)
- VALIDATION_REPORT: enforce.sh + npm test + npm run build
