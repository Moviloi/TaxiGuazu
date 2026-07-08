# TEST_FAILURE_AUDIT — S0

## 15 FALLAS, 4 ARCHIVOS — TODAS HISTÓRICAS

| Archivo | Fallas | Causa raíz | Desde cuándo | Tipo |
|---|---|---|---|---|
| `fase-22-correction-flow.test.ts` | 1 | Test espera `origin.value = null` pero recibe `"Aeropuerto IGR"` — posible bug real en extracción | Pre-P0 | HISTÓRICO / BUG |
| `fase-27-contingency-readiness.test.ts` | 5 | 2 fallas de timeout (>5000ms), 3 fallas de assert. Inestables con DB mock. | Pre-P0 | HISTÓRICO / FLAKY |
| `fase-29-quote-enforcement.test.ts` | 4 | Timeouts. Tests dependen de cadena completa de mocks que falla intermitentemente. | Pre-P0 | HISTÓRICO / FLAKY |
| `fase-29.2-slot-confirmation-routing.test.ts` | 5 | Timeouts. Misma causa que fase-29. | Pre-P0 | HISTÓRICO / FLAKY |

## Regresiones P1 — CORREGIDAS

| Archivo | Fallas (antes) | Solución |
|---|---|---|
| `tool-pricing.test.ts` | 4 | Mock `findTariffByPriority` separado para `tariff-repository.ts` |
| `dispatch.service.test.ts` | 2 | Ídem — mock separado |
| `fase-27-contingency-readiness.test.ts` | 5 (reducido de 8) | Mock `findTariffByPriority` corregido + geo-engine → location-resolver |
