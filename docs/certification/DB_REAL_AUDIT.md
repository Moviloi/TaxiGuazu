# DB REAL AUDIT — AITOS
## 2026-07-08 | Basado en schema DDL de `connection.ts`

---

## Tablas (39 CREATE TABLE en `initSchema()`)

### Activas (36)
36 de 39 tablas tienen consumidores en `src/`. Ver `DB_CODE_PARITY.md` para detalle.

### Legacy / Dead (3)

| Tabla | Estado |
|---|---|
| `workflows` | 0 callers. Candidata a DROP. Fuera del DDL actual. |
| `driver_invitations` | DDL existe. 0 consumers en código. |
| `transfer_priority` | DDL existe. 0 consumers. |
| `alias_lookup` | Ya dropeado via migración `connection.ts:709` |

### Solo escritura (7)
`processed_messages`, `conversion_outcomes`, `decision_log`, `f9_admin_commands`, `f9_error_log`, `housekeeping_log`, `conversation_f4_log` — solo INSERT, nunca SELECT.

## Columnas nunca accedidas (~30)

| Tabla | Columnas | Count |
|---|---|---|
| `places` | `barrio`, `corredor_vial`, `estrellas`, `direccion`, `zona_turistica`, `avenida_principal`, `acceso_principal`, `referencias`, `google_maps_name`, `operational_zone` | 10 |
| `zones` | `area_group`, `dispatch_priority`, `base_eta_min`, `surcharge_description`, `surcharge_pct` | 5 |
| `drivers` | `is_low_cost`, `rating`, `rating_count`, `approved_at`, `approved_by`, `group_id` | 6 |
| `trips` | `discount_explicit`, `contact_shared_at` | 2 |
| `conversations` | `trip_status` (candidata a DROP) | 1 |
| `tariffs` | `modality`, `crosses_border`, `wait_included` | 3 |

## Type/DDL mismatches (4)

| Tipo | Problema |
|---|---|
| `ConversationRow.trip_status` | En type, no en DDL |
| `TripRow.commission_paid` | En type, no en DDL |
| `trips.cancelled_at` | En DDL, no en type |
| `trips.cancelled_by` | En DDL, no en type |

## Índices (27)

1 índice cubre tabla dead (`idx_driver_invitations_status`). Resto OK.

## Constraints

- 4 CHECK en packages, provider_adjustments, places, aliases
- 2 FK (places→zones, waiting_rates→zones)
- 4 triggers (tariffs resolution_priority, crosses_border)
- Sin FK para: trips.tariff_id, tariff rows → places

## Datos — no verificados

No se pudo conectar a Turso real. Validación limitada al schema DDL.
