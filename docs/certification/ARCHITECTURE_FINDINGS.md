# ARCHITECTURE FINDINGS — Executive Summary
## 2026-07-08 | Deep Audit

---

## P0 — Bloqueantes

| # | Hallazgo | Archivo |
|---|---|---|
| 1 | `connection_cache` referenciado en código sin CREATE TABLE | `connection-state.ts:48` |
| 2 | `placeIdCache` nunca se invalida (stale forever) | `hub-discount.ts:73` |
| 3 | `resolveAlias()` auto-inserta aliases fuzzy (Levenshtein ≤3) — fuente del bug "argentino" | `database.ts:593-597` |
| 4 | `is_principal2` nunca se escribe, solo se lee | `database.ts:160` |

## P1

| # | Hallazgo |
|---|---|
| 5 | 2 tablas dead (`driver_invitations`, `transfer_priority`) |
| 6 | 30+ columnas DDL nunca accedidas (geo-catastral, zones metadata, drivers) |
| 7 | `PAIR_BASE` (20 pares) y `CORRIDOR_PAIRS` (6 pares) hardcodeados |
| 8 | `ENTITY_CATALOG` 10 entidades + aliases hardcodeados |
| 9 | `iguazu-knowledge.ts`: 110+ líneas de datos no extraídos a Turso |
| 10 | `location-resolver` consulta aliases hasta 4 veces por mensaje — sin caché |
| 11 | `leads` table sin INSERT en código |
| 12 | `cancelled_at`/`cancelled_by` en DDL pero no en TypeScript |
| 13 | `ConversationRow.trip_status` en type pero no en DDL |
| 14 | 13 archivos con ARCHITECTURE NOTE Phase D |
