# LEGACY RESIDUALS — AITOS
## 2026-07-08

---

## Tablas legacy

| Tabla | Estado | Acción |
|---|---|---|
| `workflows` | 0 callers, documentado como "candidata a DROP" | **DROP** |
| `driver_invitations` | 0 consumers en código | **DROP** |
| `transfer_priority` | 0 consumers | **DROP** |
| `alias_lookup` | Ya dropeado en migración | ✅ |

## Columnas legacy

| Tabla | Columna | Acción |
|---|---|---|
| `conversations` | `trip_status` | **DROP** (candidata documentada) |
| `chat_sessions` | `workflow_state` | **DROP** (poblado pero no leído) |
| `chat_sessions` | `confirmed_fields` | **DROP** |
| `chat_sessions` | `source_message_ids` | **DROP** |
| `places` | `barrio`, `corredor_vial`, `direccion`, `zona_turistica`, `avenida_principal`, `acceso_principal`, `referencias` | **DROP** (7 columnas geo-catastrales nunca accedidas) |
| `zones` | `area_group`, `base_eta_min`, `surcharge_description`, `surcharge_pct` | **DROP** (4 columnas nunca accedidas) |
| `drivers` | `is_low_cost`, `rating`, `rating_count`, `approved_at`, `approved_by`, `group_id` | **DROP** (6 columnas nunca accedidas) |
| `trips` | `discount_explicit`, `contact_shared_at` | **DROP** (2 columnas nunca accedidas) |

## Backward compat wrappers (7 patrones activos)

| Archivo | Patrón |
|---|---|
| `tool-pricing.ts` | Dual camelCase + snake_case output |
| `load-previous-slots.ts` | slot_states → slots fallback |
| `ambiguity-handler.ts` | String options → object conversion |
| `extraction-runner.ts` | Multi-ride → legacy pricing wrapper |
| `policy-pipeline.ts` | OperationalMode → Mode derivation |
| `trips.ts` | LEGACY_STATUS_TO_PHASE dual reader |
| `connection.ts` | Auto-migration de workflow_state |

## Type/DDL mismatches

| Type | Columna | Problema |
|---|---|---|
| `ConversationRow` | `trip_status` | En type, no en DDL |
| `TripRow` | `commission_paid` | En type, no en DDL |
| `trips` | `cancelled_at` | En DDL, no en type |
| `trips` | `cancelled_by` | En DDL, no en type |

## 13 archivos con ARCHITECTURE NOTE Phase D
