# DB CODE PARITY — AITOS
## 2026-07-08

---

## Tablas que el código USA

36 de 39 tablas tienen consumidores activos en `src/`. Mapping completo en `ARCHITECTURE_FINDINGS.md`.

## Tablas que el código NO usa

| Tabla | DDL existe | Estado |
|---|---|---|
| `driver_invitations` | `connection.ts:227` | 0 consumers |
| `transfer_priority` | `connection.ts:533` | 0 consumers |
| `workflows` | Fuera del DDL | Legacy, documentado |

## Tabla que el código USA pero NO está en DDL

| Tabla | Referenciada en |
|---|---|
| `connection_cache` | `connection-state.ts:48` — **FALTA CREATE TABLE** |

## Divergencias DDL vs TypeScript

| Type | Campo | Dónde |
|---|---|---|
| `ConversationRow` | `trip_status` | En type, NO en DDL |
| `TripRow` | `commission_paid` | En type, NO en DDL |
| `trips` | `cancelled_at` | En DDL, NO en type |
| `trips` | `cancelled_by` | En DDL, NO en type |

## Columnas DDL sin acceso en código (~30)
Ver `DB_REAL_AUDIT.md` — sección Columnas nunca accedidas.

## Conclusión
El código y la DB están razonablemente alineados. Las divergencias son:
- 2 columnas fantasma en TypeScript (ya dropeadas del DDL)
- 2 columnas nuevas en DDL sin type coverage
- 1 tabla referenciada en código que falta en DDL (posible runtime error)
