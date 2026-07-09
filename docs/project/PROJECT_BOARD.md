# PROJECT BOARD — AITOS
## Actualizado: 2026-07-08 | Etapa: Human Experience & Pilot Optimization

---

## Leyenda

| Prioridad | Significado |
|---|---|
| **P0** | Bloqueante — debe resolverse antes del próximo paso |
| **P1** | Alta — esta semana |
| **P2** | Media — este mes |
| **P3** | Baja — backlog |

---

## P0 — Bloqueantes

| ID | Tarea | Dominio | Estado | ADR | Origen |
|---|---|---|---|---|---|
| P0-01 | Rotar ADMIN_API_KEY (expuesta en chat) | Ops | READY | N/A | OPS1 | **BLOQUEA PILOTO** |
| P0-02 | Configurar SENTRY_DSN en Vercel | Ops | READY | N/A | OPS1 | **BLOQUEA PILOTO** |
| P0-04 | Seed de choferes reales en Turso | Ops | READY | N/A | OPS1 | **BLOQUEA PILOTO** |
| P0-03 | `connection_cache` sin CREATE TABLE — riesgo de runtime error | DB | READY | N/A | P3 Audit |

## P1 — Alta prioridad

| ID | Tarea | Dominio | Estado | ADR | Origen |
|---|---|---|---|---|---|
| P1-01 | Implementar Conversation Interpreter (ADR-007) | Pipeline | READY | 007 | B3, GEO Audit |
| P1-02 | Fix entity-extractor: no asignar destination a fuzzy matches de 1 palabra sin marcadores | Extraction | READY | N/A | B3 |
| P1-03 | Deshabilitar auto-insert de aliases con Levenshtein ≤3 | DB | READY | N/A | B3, GEO Audit |
| P1-04 | Cerrar fase-22 T2 (decisión de producto: ¿preservar origin en corrección parcial?) | Extraction | ADR_PENDING | N/A | S0 |
| P1-05 | `placeIdCache` nunca se invalida — agregar TTL | Geo | READY | N/A | P3 Audit |
| P1-06 | `is_principal2` nunca se escribe en código | DB | READY | N/A | P3 Audit |
| P1-07 | Configurar LOG_LEVEL=info en Vercel | Ops | READY | N/A | OPS1 |
| P1-08 | PAIR_BASE y CORRIDOR_PAIRS → migrar a tabla DB | Geo | READY | N/A | P3 Audit |
| P1-09 | ENTITY_CATALOG → migrar a tabla DB | Extraction | READY | N/A | P3 Audit |

## P2 — Media prioridad

| ID | Tarea | Dominio | Estado | ADR | Origen |
|---|---|---|---|---|---|
| P2-01 | Eliminar dual engine pricing v2 | Pricing | READY | N/A | P1 Audit |
| P2-02 | LRU cache para resolveLocation (aliases repetidos) | Geo | READY | N/A | Cache Audit |
| P2-03 | Dropear tablas dead: driver_invitations, transfer_priority | DB | READY | N/A | P3 Audit |
| P2-04 | Dropear 30 columnas fantasma (geo-catastral, zones metadata, drivers) | DB | READY | N/A | P3 Audit |
| P2-05 | DEBT-02: Eliminar acoplamiento survey→lead | Services | READY | N/A | DEBT Baseline |
| P2-06 | Completar i18n (15 strings restantes) | I18n | READY | N/A | DEBT Baseline |
| P2-07 | Fix 4 type/DDL mismatches | DB | READY | N/A | P3 Audit |
| P2-08 | Human Layer: templates con variación | UX | READY | N/A | UX Audit |
| P2-09 | Métricas de experiencia conversacional | UX | READY | N/A | UX Audit |

## P3 — Baja prioridad

| ID | Tarea | Dominio | Estado | ADR | Origen |
|---|---|---|---|---|---|
| P3-01 | Hotspots >400L (7 archivos) | Refactor | READY | N/A | Quality Baseline |
| P3-02 | Cobertura en Survey y Admin | Testing | READY | N/A | Coverage Report |
| P3-03 | iguazu-knowledge: migrar 110+ líneas a Turso | Data | READY | N/A | P3 Audit |
| P3-04 | DEBT-04 a DEBT-11 (fragmentar DB facade, split services) | Refactor | READY | N/A | DEBT Baseline |
| P3-05 | FUT-01 a FUT-10 (features futuras) | Features | READY | N/A | BACKLOG |

---

## DONE (desde RC1)

| ID | Tarea | Commit |
|---|---|---|
| D01 | Hardening P0: eliminar código zombie | c09a2c7 |
| D02 | Hardening P1: eliminar geo-engine, pricing ownership | c09a2c7 |
| D03 | Test recovery S0-S2 | c09a2c7 |
| D04 | Lead service refactor A2-A6 (752→264) | 08ce37e |
| D05 | Bug fix B2: post-booking zone | 08ce37e |
| D06 | Quality baseline v1.0 | 08ce37e |
| D07 | ADR-007: Conversation Interpreter | — |

---

## Dependencias

```
P0-01 ──→ (bloquea piloto)
P0-02 ──→ (bloquea piloto)
P1-04 ──→ P1-01 (fase-22 requiere entender corrección parcial)
P1-09 ──→ P1-01 (entity catalog en DB alimenta al interpreter)
P2-01 ──→ P2-02 (sin v2, el pricing cache es más simple)
```
