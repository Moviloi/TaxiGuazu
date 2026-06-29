# TASK_PLAN — Sincronización Grafo de Zonas Congelado

Generado por: **Director**
Fase del pipeline: `PLANNING`
Estado: `COMPLETE` (artifact generado)

---

## Goal

Sincronizar todo el sistema (schema DB, tipos TS, seed-data, motores de resolución) con la especificación congelada de zonificación que integra:

- **ASE 32** — Inferencia desde red vial (road network analysis)
- **ASE 33** — Inferencia desde tarifario real (price cluster analysis)

El resultado es un grafo de ~18 zonas operativas en 3 países, con matriz de precios real de mercado, resolución por prioridad (place→place > place→zone > zone→place > zone→zone), y pricing simétrico (public_price / driver_price para 4p y 6p).

## Scope

### Archivos modificables
- `src/lib/db/core/connection.ts` — CREATE TABLE statements (nuevas columnas, CHECK relajados)
- `src/lib/db/types.ts` — TariffRow, new zone/place types, ResolveLocationResult
- `src/lib/db/domains/trips.ts` — findTariffRow() → single query con resolution_priority
- `src/lib/db/database.ts` — facade exports
- `src/lib/services/pricing/tariff-resolver.ts` — unificar 4-queries en 1
- `src/lib/services/geo/location-resolver.ts` — devolver zoneId en vez de operational_zone
- `src/lib/services/geo/geo-engine.ts` — actualizar mapa de zonas
- `src/lib/ai/display-name.ts` — priorizar display_name column
- `src/lib/services/pricing/pricing-engine.ts` — references a new column names
- `src/lib/services/pricing/commercial-pricing-engine.ts` — references a new column names
- `scripts/seed-data.ts` — matriz completa de zonas, places, aliases, tariffs con precios reales
- `src/lib/config/entity-catalog.ts` — agregar nuevas entidades (Recanto, Tupa Lodge, etc.)
- `src/lib/services/extraction/entity-extractor.ts` — agregar patrones

### Archivos NO modificables
- `docs/adr/*` — sin cambios (el diseño respeta ADR 001-004)
- `ael/*` — solo artifacts actualizables
- `docs/architecture/architecture.md` — sin cambios (la zonificación es dato, no arquitectura)

## Priority

**CRITICAL** — El sistema actual tiene 0 filas en tablas geo y schema divergente del runtime. Sin esta sincronización el motor de precios no funciona.

## Phases

### Fase 1: Schema DB — connection.ts
- **Objetivo:** Actualizar CREATE TABLE para tariffs, zones, places con columnas finales
- **Archivos afectados:** `src/lib/db/core/connection.ts`
- **Cambios:**
  - `tariffs`: agregar `public_price_4p`, `public_price_6p`, `driver_price_4p`, `driver_price_6p`, `resolution_priority INTEGER DEFAULT 4`, deprecar `price_4p`/`price_6p` como alias
  - `places`: reemplazar `operational_zone TEXT` por `zone_id TEXT REFERENCES zones(zone_id)`, agregar `display_name TEXT`, relajar CHECK constraints de city/country/place_type
  - `zones`: agregar `surcharge_description TEXT`, `surcharge_pct REAL DEFAULT 0` (para Balsa, etc.)
  - Mantener backward compatibility con columnas legacy
- **Criterio de éxito:** migrate.sql generado, `initSchema()` no rompe DB existente

### Fase 2: Tipos TypeScript — types.ts
- **Objetivo:** Actualizar TariffRow, ZoneRow, PlaceRow, ResolveLocationResult
- **Archivos afectados:** `src/lib/db/types.ts`
- **Cambios:**
  - TariffRow: `public_price_4p`, `public_price_6p`, `driver_price_4p`, `driver_price_6p`, `resolution_priority`
  - ZoneRow: `surcharge_description?`, `surcharge_pct?`
  - PlaceRow: `zone_id` en vez de `operational_zone`, `display_name`
- **Criterio de éxito:** `npx tsc --noEmit` no reporta errores

### Fase 3: Seed data masivo — seed-data.ts
- **Objetivo:** Poblar ~18 zonas, ~30 places, ~150 aliases, ~35+ tariffs con matriz de precios real
- **Archivos afectados:** `scripts/seed-data.ts`
- **Cambios:**
  - Zonas: ZONE_IGR_CENTRO, ZONE_IGR_CATARATAS_AR, ZONE_IGR_600HAS_FONDO, ZONE_IGR_600HAS_ACCESO, ZONE_IGR_SANTA_ROSA_TUPA, ZONE_IGR_HITO, ZONE_IGR_PORT_BALSA, ZONE_IGR_DUTY_FREE, ZONE_IGR_ADUANA, ZONE_IGR_AEROPUERTO, ZONE_FOZ_CENTRO, ZONE_FOZ_AIRPORT, ZONE_FOZ_CORREDOR_CATARATAS, ZONE_FOZ_CORREDOR_EXTENDIDO, ZONE_FOZ_BELMOND, ZONE_FOZ_CORREDOR_NORTE, ZONE_FOZ_ITAIPU, ZONE_CDE_MICROCENTRO, ZONE_CDE_SALTOS_MONDAY
  - Tarifas: matriz completa desde documento congelado (20+ destinos × 3+ orígenes)
  - Prices en AR$ reales (32k-240k)
- **Criterio de éxito:** `npx tsx scripts/seed-data.ts` inserta datos sin error

### Fase 4: Motor de resolución unificado — tariff-resolver.ts
- **Objetivo:** Reescribir `findTariffRow()` a single query con `ORDER BY resolution_priority`
- **Archivos afectados:** `src/lib/db/domains/trips.ts`, `src/lib/services/pricing/tariff-resolver.ts`
- **Cambios:**
  - Single query: `SELECT * FROM tariffs WHERE (origin_place_id = ? OR origin_place_id IS NULL) AND ... ORDER BY resolution_priority LIMIT 1`
  - Resolution priority: 1=place→place, 2=place→zone, 3=zone→place, 4=zone→zone
  - Remover lógica secuencial L1-L4
- **Criterio de éxito:** tests de tariff-resolver pasan (esperados: ~591+)

### Fase 5: Entity catalog y geo-engine
- **Objetivo:** Agregar nuevas entidades al catálogo y mapa de zonas
- **Archivos afectados:** `src/lib/config/entity-catalog.ts`, `src/lib/services/geo/geo-engine.ts`, `src/lib/services/extraction/entity-extractor.ts`
- **Cambios:**
  - entity-catalog: Recanto, Tupa Lodge, Costa del Sol, saltos del Monday, Itaipu, etc.
  - geo-engine: nuevos pesos y asignaciones de zona
  - entity-extractor: nuevos patrones regex
- **Criterio de éxito:** entity resolution tests pasan

### Fase 6: Display name y pricing engines
- **Objetivo:** Actualizar referencias a columnas renombradas
- **Archivos afectados:** `src/lib/ai/display-name.ts`, `src/lib/services/pricing/pricing-engine.ts`, `src/lib/services/pricing/commercial-pricing-engine.ts`
- **Criterio de éxito:** build PASS, tests PASS

### Fase 7: Auditoría final
- **Objetivo:** Validar integridad del sistema completo
- **Ejecución:** `npm test`, `npm run build`, `bash ael/contracts/enforce.sh`
- **Criterio de éxito:** All PASS, 0 violaciones de contrato

## Constraints

- **R1:** No violar contratos entre capas — las nuevas columnas son datos, no dependencias
- **R2:** No violar ADR 001-004 — la zonificación es capa de datos (DB), no nueva capa
- **R3:** No asumir código que no existe — verificar cada archivo antes de editarlo
- **Matriz de precios:** Usar SOLO los valores del documento congelado (no inventar)
- **Zonas:** No fusionar ni dividir zonas sin evidencia de precio
- **Backwards compatibility:** Mantener columnas legacy (price_4p, operational_zone) como alias hasta migración completa

## Success Criteria

1. Schema DB refleja exactamente las columnas del diseño congelado
2. Seed-data inserta matriz completa de 18 zonas + 30 places + tarifas reales
3. `findTariffRow()` funciona con single query y resolution_priority
4. `npm test` — 591+ tests PASS
5. `npm run build` — PASS
6. `bash ael/contracts/enforce.sh` — PASS
7. Turso y SQLite local sincronizados con script de seed
