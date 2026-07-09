# CACHE POLICY ANALYSIS — AITOS
## 2026-07-08

---

## ¿Existe caché hoy?

| Cache | Tipo | Ubicación | TTL | Invalidación |
|---|---|---|---|---|
| `placeIdCache` | `Map<string,string\|null>` | `hub-discount.ts:73` | ∞ (nunca) | Ninguna |
| `connection_state` | SQLite KV | `connection.ts:52` | Persiste | Manual |
| DB indexes | SQLite | 27 índices | Automático | DB-managed |

**NO existe política formal de caché.** Solo hay una caché ad-hoc en hub-discount que nunca se invalida.

---

## Análisis por dominio

| Dominio | ¿Cachear? | Estrategia | Justificación |
|---|---|---|---|
| **Lugares / Aliases** | ✅ SÍ | LRU (1000 entradas, TTL 5min) | Se consultan hasta 4× por mensaje. Datos casi inmutables. |
| **Geo / Location Resolver** | ✅ SÍ | Hereda de Places | Ver abajo |
| **Tarifas** | ⚠️ PARCIAL | Por request | Se resuelven 3-4× por conversación. Datos estables. |
| **Tours** | ✅ SÍ | LRU (100 entradas, TTL 5min) | Baja frecuencia de cambio |
| **Waiting Rates** | ✅ SÍ | LRU (20 entradas, TTL 1h) | Muy baja frecuencia de cambio |
| **Configuración** | ✅ SÍ | En memoria al iniciar | `constants.ts` ya es estático |
| **Promociones** | ❌ NO | Siempre Turso | Tienen `valid_from`/`valid_until` — necesitan frescura |
| **Drivers** | ❌ NO | Siempre Turso | Estado cambia continuamente (activo/inactivo, shift) |
| **Workflow** | ❌ NO | Siempre Turso | Estado conversacional muta cada turno |
| **Conversation State** | ❌ NO | Siempre Turso | Muta cada turno |

---

## Location Resolver — análisis detallado

Flujo actual: `resolveLocation(texto)` → 4 consultas a DB (exact alias → exact name → fuzzy alias → fuzzy name). Para un mensaje típico (2 ubicaciones × 2 llamadas = 4 consultas). Con caché LRU se reduciría a 0 consultas para aliases repetidos.

**Propuesta**: `alias → memory LRU cache (1000 entries, 5min TTL) → Turso fallback`

**Impacto**: Reducción de 4→0 consultas DB para aliases ya vistos. En una conversación de 10 turnos con "aeropuerto" repetido: 40→4 consultas.
