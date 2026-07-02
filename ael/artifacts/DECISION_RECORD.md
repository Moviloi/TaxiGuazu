# Decision Record

## 2026-07-02 — FUT-01 F3: i18n como servicio transversal

**Contexto**: `src/lib/ai/slot-confirmation.ts` y `src/lib/ai/response-builder.ts` importan `t()` de `src/lib/services/i18n/t.ts`. El contrato R1 prohibía imports de AI → Services (excepto `types`).

**Decisión**: i18n es un servicio transversal (cross-cutting concern) como `types`, necesario en todas las capas. Se actualizó la regla R1 en `ael/contracts/enforce.sh` para excluir imports de `services/i18n/`.

**Alternativas consideradas**:
1. Mover `t.ts` a `@/lib/utils/` — rechazado porque Utils no puede importar del proyecto (ADR-001).
2. Duplicar `t()` en AI layer — rechazado por violar DRY.
3. Mantener R1 estricto y no migrar — rechazado porque dejaría `_lang` ignorado permanentemente.

**Impacto**: Enforce R1 ahora permite AI → services/i18n. Otros servicios de negocio (pricing, extraction, etc.) siguen restringidos.
