# DESIGN_SPEC — Grafo de Zonas Congelado + Schema Final

Generado por: **Architect**
Fase del pipeline: `DESIGNING`
Estado: `COMPLETE`

---

## ADR Compliance

| ADR | Compatibilidad | Notas |
|-----|---------------|-------|
| ADR 001 (Layered Architecture) | SÍ | Zonificación es dato en DB, no nueva capa. No altera dirección de dependencias. |
| ADR 002 (Database Facade) | SÍ | Todo acceso a nuevas columnas pasa por facade (`database.ts`). No se crean nuevos accesos directos a `db/core/`. |
| ADR 003 (Learning Domain) | SÍ | No se toca learning/. Las zonas no afectan al subsistema de aprendizaje. |
| ADR 004 (Service Boundaries) | SÍ | Pricing sigue siendo dominio de `services/pricing/`. Geo sigue en `services/geo/`. Sin nuevas dependencias cross-service. |

## Contract Preservation

| Contrato | Se preserva | Detalle |
|----------|------------|---------|
| DB Facade → Services | SÍ | `database.ts` exporta nuevas funciones `findTariffByPriority()`, `getZoneById()`, etc. |
| AI → Services | SÍ | AI no importa de Services (excepto types). `display-name.ts` ya usa facade. |
| Services → Lead | SÍ | Lead sigue siendo orquestador. Pricing engine NO importa de lead. |
| Services internos (ADR 004) | SÍ | Pricing → Geo sigue respetando orden de dependencia. |

## Schema Definitivo — Tablas Geo

### `zones`

```sql
CREATE TABLE IF NOT EXISTS zones (
  zone_id TEXT PRIMARY KEY,
  zone_name TEXT NOT NULL,
  country TEXT NOT NULL,
  area_group TEXT,
  dispatch_priority INTEGER DEFAULT 5,
  base_eta_min INTEGER DEFAULT 10,
  crosses_border INTEGER DEFAULT 0,
  surcharge_description TEXT,        -- NUEVO: ej. "25% por espera en balsa"
  surcharge_pct REAL DEFAULT 0,      -- NUEVO: 0.25 = 25%
  active INTEGER DEFAULT 1
);
```

### `places`

```sql
CREATE TABLE IF NOT EXISTS places (
  place_id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  official_name TEXT DEFAULT '',
  display_name TEXT DEFAULT '',       -- NUEVO: nombre para mostrar (prioridad: display > official > canonical)
  google_maps_name TEXT DEFAULT '',
  place_type TEXT NOT NULL DEFAULT 'other',  -- CHECK RELAJADO (app-level validation)
  city TEXT DEFAULT '',               -- CHECK RELAJADO
  country TEXT DEFAULT '',            -- CHECK RELAJADO
  latitude REAL,
  longitude REAL,
  tourist_relevance_score INTEGER DEFAULT 5,
  zone_id TEXT REFERENCES zones(zone_id),  -- REEMPLAZA operational_zone
  active_status TEXT NOT NULL DEFAULT 'active' CHECK(active_status IN ('active','inactive'))
);
```

### `tariffs`

```sql
CREATE TABLE IF NOT EXISTS tariffs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  origin TEXT,                              -- LEGACY (mantener para backward compat)
  destination TEXT,                         -- LEGACY
  modality TEXT,
  crosses_border INTEGER DEFAULT 0,
  wait_included INTEGER DEFAULT 0,
  -- NUEVAS columnas de pricing simétrico
  public_price_4p REAL,                     -- Precio al cliente (4 pax)
  public_price_6p REAL,                     -- Precio al cliente (6 pax)
  driver_price_4p REAL,                     -- Pago al chofer (4 pax)
  driver_price_6p REAL,                     -- Pago al chofer (6 pax)
  -- Columnas legacy (deprecadas, mantener para backward compat)
  price_4p REAL,                            -- DEPRECATED → public_price_4p
  price_6p REAL,                            -- DEPRECATED → public_price_6p
  base_price_4p REAL,                       -- DEPRECATED
  base_price_6p REAL,                       -- DEPRECATED
  -- Columnas geo (ya existen)
  origin_place_id TEXT,
  destination_place_id TEXT,
  origin_zone_id TEXT,
  destination_zone_id TEXT,
  -- NUEVA: prioridad de resolución
  resolution_priority INTEGER DEFAULT 4 CHECK(resolution_priority BETWEEN 1 AND 4),
  active INTEGER DEFAULT 1
);
```

### `alias_lookup` (sin cambios estructurales)

```sql
CREATE TABLE IF NOT EXISTS alias_lookup (
  alias TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  place_id TEXT,
  normalized_alias TEXT NOT NULL DEFAULT '',
  location_code TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','fuzzy','migration')),
  created_at INTEGER DEFAULT (unixepoch())
);
```

## Mapa de Zonas — Grafo Congelado

### Argentina (Puerto Iguazú)

| Zone ID | Nombre | Incluye | Surcharge |
|---------|--------|---------|-----------|
| ZONE_IGR_AEROPUERTO | Aeropuerto IGR | IGR, acceso inmediato | — |
| ZONE_IGR_CENTRO | Centro PI | Terminal, O2, Amayal, Jardín, Casino, microcentro | — |
| ZONE_IGR_CATARATAS_AR | Cataratas AR | Parque Nacional, Gran Meliá | — |
| ZONE_IGR_600HAS_ACCESO | 600 Has Acceso | La Cantera, Selvaje, El Pueblito, La Aldea | — |
| ZONE_IGR_600HAS_FONDO | 600 Has Fondo | Loi Suites, Awasi, Village (camino de tierra 2.8km) | — |
| ZONE_IGR_SANTA_ROSA_TUPA | Santa Rosa / Tupá | Tupá Lodge, Barrio Santa Rosa | Recargo por camino de tierra (vel < 5km/h) |
| ZONE_IGR_HITO | Hito Tres Fronteras | Hito (lado AR) | — |
| ZONE_IGR_PORT_BALSA | Puerto/Dársena Balsa | Balsa internacional | 25% por espera de embarque |
| ZONE_IGR_DUTY_FREE | Duty Free Shop | Estacionamiento lateral (colectora segregada) | — |
| ZONE_IGR_ADUANA | Paso Fronterizo | Aduana AR, cola migratoria | Recargo por espera |

### Brasil (Foz do Iguaçu)

| Zone ID | Nombre | Incluye | Surcharge |
|---------|--------|---------|-----------|
| ZONE_FOZ_CENTRO | Centro Foz | Microcentro, Catedral, restaurantes | — |
| ZONE_FOZ_AIRPORT | Aeropuerto IGU | IGU, acceso inmediato | — |
| ZONE_FOZ_CORREDOR_CATARATAS | Corredor Cataratas Urbano | Mabu, Bourbon, DoubleTree (Av. das Cataratas km 2-5) | — |
| ZONE_FOZ_CORREDOR_EXTENDIDO | Corredor Cataratas Extendido | Parque das Aves, CRV, entrada Parque BR (km 10-17) | Recargo por km + espera parque |
| ZONE_FOZ_BELMOND | Hotel Belmond | Belmond Das Cataratas (área restringida Parque BR) | Recargo por acceso restringido |
| ZONE_FOZ_CORREDOR_NORTE | Corredor Norte (BR-277) | Recanto, Rafain Palace, Costa e Silva | Recargo por cruce urbano |
| ZONE_FOZ_ITAIPU | Itaipu Binacional | Centro de Visitantes, Itaipu By Night | — |

### Paraguay (Ciudad del Este)

| Zone ID | Nombre | Incluye | Surcharge |
|---------|--------|---------|-----------|
| ZONE_CDE_MICROCENTRO | Microcentro CDE | Centro comercial, zonas bancarias | — |
| ZONE_CDE_SALTOS_MONDAY | Saltos del Monday | Parque Salto Monday, aventura | Recargo por distancia + peaje |

## Matriz de Precios de Referencia (AR$)

### Desde Aeropuerto IGR (4 pax)

| Destino | Precio Público | Price Code | 
|---------|:-:|:-:|
| Centro PI | 32.000 | P1 |
| Cataratas AR | 32.000 | P1 |
| 600 Has Acceso | 32.000 | P1 |
| 600 Has Fondo | 35.000 | P2 |
| Tupá Lodge | 52.000 | P3 |
| Hito | 32.000 | P1 |
| Puerto Balsa | 32.000 | P1 |
| Duty Free | 52.000 | P3 |
| Aduana AR | 65.000 | P4 |

### Desde Centro Puerto Iguazú (4 pax)

| Destino | Precio Público | Price Code |
|---------|:-:|:-:|
| Centro PI | 10.000 | C1 |
| Cataratas AR | 35.000 | C2 |
| 600 Has Acceso | 12.000 | C3 |
| 600 Has Fondo | 15.000 | C4 |
| Tupá Lodge | 30.000 | C5 |
| Hito | 10.000 | C1 |
| Puerto Balsa | 10.000 | C1 |
| Duty Free | 15.000 | C4 |
| Aduana AR | 20.000 | C6 |

### Desde Centro Foz (BRL, convertido a AR$ en seed)

| Destino | BRL | AR$ ref (4 pax) |
|---------|:-:|:-:|
| Centro Foz | 30 | 10.000 |
| Aeropuerto IGU | 150 | 50.000 |
| Corredor Cataratas Urbano | 250 | 83.000 |
| Corredor Cataratas Extendido | 350 | 116.000 |
| Belmond | 600 | 200.000 |
| Corredor Norte (Recanto) | 220 | 73.000 |
| Itaipu | 300 | 100.000 |
| Microcentro CDE | 450 | 150.000 |
| Saltos Monday | 500 | 166.000 |

> **Nota:** Los precios AR$ son referencia. La semilla usará valores en AR$ del documento congelado. Para rutas BR→BR y PY→BR se usará el valor en BRL convertido al tipo de cambio referencial.

## Resolución de Tarifas — Single Query

```sql
SELECT * FROM tariffs
WHERE active = 1
  AND (
    (origin_place_id = ? AND destination_place_id = ?)   -- place→place (priority 1)
    OR (origin_place_id = ? AND destination_zone_id = ?)  -- place→zone (priority 2)
    OR (origin_zone_id = ? AND destination_place_id = ?)  -- zone→place (priority 3)
    OR (origin_zone_id = ? AND destination_zone_id = ?)   -- zone→zone (priority 4)
  )
ORDER BY resolution_priority ASC
LIMIT 1;
```

Donde los 4 pares de parámetros se pasan con los valores correspondientes. La columna `resolution_priority` se asigna:
- 1 = place→place
- 2 = place→zone  
- 3 = zone→place
- 4 = zone→zone (default)

## Archivos a modificar

| Archivo | Cambio | Líneas approx |
|---------|--------|---------------|
| `src/lib/db/core/connection.ts` | CREATE TABLE con nuevas columnas, CHECK relajados | 40 |
| `src/lib/db/types.ts` | TariffRow, PlaceRow, ZoneRow actualizados | 30 |
| `src/lib/db/domains/trips.ts` | findTariffRow() → single query | 20 |
| `src/lib/db/database.ts` | nuevas exports (findTariffByPriority, etc.) | 15 |
| `src/lib/services/pricing/tariff-resolver.ts` | unificar L1-L4 en single call | 25 |
| `src/lib/services/geo/location-resolver.ts` | zoneId en vez de operational_zone | 10 |
| `src/lib/services/geo/geo-engine.ts` | mapa de zonas expandido | 30 |
| `src/lib/ai/display-name.ts` | priorizar display_name | 5 |
| `src/lib/services/pricing/pricing-engine.ts` | references new column names | 5 |
| `src/lib/services/pricing/commercial-pricing-engine.ts` | references new column names | 5 |
| `scripts/seed-data.ts` | matriz completa 18 zonas + 30 places + tarifas | 200 |
| `src/lib/config/entity-catalog.ts` | Recanto, Tupa Lodge, Saltos Monday, etc. | 40 |
| `src/lib/services/extraction/entity-extractor.ts` | patrones nuevos | 10 |

## Archivos a crear

| Archivo | Propósito |
|---------|-----------|
| `scripts/migrations/M0-add-tariff-columns.sql` | ADD COLUMN en DB existente |
| `scripts/migrations/M1-update-places.sql` | ADD COLUMN display_name, zone_id |

## Design Decisions

### Decisión 1: Pricing simétrico (public_price / driver_price) en lugar de price_4p + discount_pct
- **Por qué:** El margen del chofer no es un descuento sobre el precio público. Es un precio independiente que refleja su pago garantizado. Tener ambas columnas permite auditoría directa.
- **Alternativas consideradas:** price_4p + driver_discounts (actual), price_4p + margin pct
- **Impacto:** seed-data debe especificar ambos valores. El margen se calcula como `public - driver`.

### Decisión 2: CHECK constraints relajadas en places
- **Por qué:** Las restricciones actuales (14 place_types exactos, 3 cities, 3 countries) son frágiles y requieren migración cada vez que se agrega un tipo. Se reemplazan por validación en app layer.
- **Alternativas consideradas:** Mantener CHECK y migrarlos. Agregar nuevos valores vía ALTER.
- **Impacto:** DB no valida place_type, city, country a nivel schema. La app debe hacerlo.

### Decisión 3: resolution_priority como columna en tariffs en vez de lógica hardcodeada
- **Por qué:** Permite cambiar prioridades sin modificar código. Una tarifa zone→zone con priority=2 podría anular a una place→place con priority=3 si se necesita.
- **Alternativas consideradas:** Lógica secuencial L1-L4 (actual), enum en código.
- **Impacto:** Seed-data debe asignar resolution_priority correctamente. Query única simplifica el código.

### Decisión 4: display_name como columna separada
- **Por qué:** El nombre canónico (canonical_name) no siempre es el mejor para mostrar al usuario. display_name permite nombres comerciales ("Gran Meliá Iguazú" vs "Iguazú National Park").
- **Alternativas consideradas:** Usar official_name con fallback a canonical_name.
- **Impacto:** seed-data debe incluir display_name. La prioridad en display-name.ts es: display_name > official_name > canonical_name.

## Risks

| Riesgo | Mitigación |
|--------|-----------|
| Seed-data con precios incorrectos descalibra el sistema | Toda price reference viene del documento congelado. Validar con stakeholder antes de producción. |
| CHECK constraints relajadas permiten datos inválidos | Agregar validación en app layer (pricing-engine.ts validará country/place_type). |
| Columnas legacy (price_4p, operational_zone) causan confusión | Documentar como DEPRECATED en types.ts. Remover en migración futura (M5). |
| Matriz de precios incompleta (faltan pares BR→PY, PY→BR) | Marcar como "price TBD" en seed. El sistema debe fallback a zone→zone con precio 0 o error. |
| Single query ORDER BY resolution_priority más lenta que 4 queries separadas | Agregar índice compuesto: `(origin_place_id, destination_place_id, origin_zone_id, destination_zone_id, resolution_priority)` |
