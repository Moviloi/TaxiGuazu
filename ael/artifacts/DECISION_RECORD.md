# Decision Record

## 2026-07-03 — Test: Mockear LLM en tests de ESCALATION para cubrir P3 re-prompt

**Contexto**: El test `comprehension-runner.test.ts` simulaba ESCALATION con `getComprehensionState` mockeado a `"ESCALATION"`, pero no mockeaba el LLM provider. Con el cambio P3 (LLM re-prompt antes de escalar), el test fallaba porque el LLM real retornaba un mensaje de re-prompt en vez de escalar.

**Decisión**: Agregar `vi.mock("@/lib/ai/llm-provider")` y dividir el test en dos:
1. **LLM retorna "NULL"** → prueba el path de escalación (admin notificado)
2. **LLM retorna mensaje** → prueba el path de re-prompt (sin admin)

**Alternativas consideradas**:
1. Actualizar el test existente para esperar re-prompt — rechazado porque perdería cobertura del caso de escalación real.
2. No mockear el LLM — rechazado porque el test dependía de una API externa, haciéndolo no-determinístico.

**Impacto**: Cobertura completa de ambos branches del P3. Tests aislados de la red.

## 2026-07-02 — FUT-01 F3: i18n como servicio transversal

**Contexto**: `src/lib/ai/slot-confirmation.ts` y `src/lib/ai/response-builder.ts` importan `t()` de `src/lib/services/i18n/t.ts`. El contrato R1 prohibía imports de AI → Services (excepto `types`).

**Decisión**: i18n es un servicio transversal (cross-cutting concern) como `types`, necesario en todas las capas. Se actualizó la regla R1 en `ael/contracts/enforce.sh` para excluir imports de `services/i18n/`.

**Alternativas consideradas**:
1. Mover `t.ts` a `@/lib/utils/` — rechazado porque Utils no puede importar del proyecto (ADR-001).
2. Duplicar `t()` en AI layer — rechazado por violar DRY.
3. Mantener R1 estricto y no migrar — rechazado porque dejaría `_lang` ignorado permanentemente.

**Impacto**: Enforce R1 ahora permite AI → services/i18n. Otros servicios de negocio (pricing, extraction, etc.) siguen restringidos.
