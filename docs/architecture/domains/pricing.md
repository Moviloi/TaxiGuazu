# Dominio Pricing — Modelo de Dominio

> Derivado de: `src/lib/services/pricing/`, `src/lib/db/domains/trips.ts` (tariffs), `src/config/constants.ts`
> Fecha: 2026-07-04 · AIT-012

---

## 1. Propósito

Calcular el precio de un traslado según origen, destino, pasajeros y reglas comerciales. El sistema opera con **dos tracks en paralelo** (v2 legacy activo + v3 frozen), reconciliados por una fachada unificada.

---

## 2. Arquitectura Dual Track

```
                    resolvePricingForSlots()  ← Fachada unificada
                         ├── v2: tariff-resolver.ts      (activo, single query)
                         └── v3: pricing-engine.ts        (FROZEN, cálculo completo)
                                    └── commercial-pricing-engine.ts
                                    └── hub-discount.ts
                                    └── tour-resolver.ts
```

| Track | Estado | Mecanismo | Cuándo se usa |
|-------|--------|-----------|---------------|
| **v2** (tariff-resolver) | **Activo** | Single SQL query con `ORDER BY resolution_priority` | Todos los flujos de cotización |
| **v3** (pricing-engine) | **FROZEN** | Cálculo completo con markup + adjustments + breakdown | Planeado como reemplazo, no activo |

---

## 3. Track v2 — Tariff Resolver (Activo)

### 3.1 Tabla `tariffs`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK | Identificador |
| `origin` | TEXT | Nombre descriptivo del origen |
| `destination` | TEXT | Nombre descriptivo del destino |
| `modality` | TEXT | Tipo de traslado |
| `crosses_border` | INTEGER | 0/1 — cruza frontera |
| `wait_included` | INTEGER | 0/1 — espera incluida |
| `public_price_4p` | REAL | Precio público hasta 4 pasajeros |
| `public_price_6p` | REAL | Precio público 5-6 pasajeros |
| `driver_price_4p` | REAL | Precio para el chofer hasta 4p |
| `driver_price_6p` | REAL | Precio para el chofer 5-6p |
| `origin_place_id` | TEXT | FK a `places` |
| `destination_place_id` | TEXT | FK a `places` |
| `origin_zone_id` | TEXT | FK a `zones` |
| `destination_zone_id` | TEXT | FK a `zones` |
| `resolution_priority` | INTEGER | 1-4 (nivel de especificidad) |
| `active` | INTEGER | 0/1 |

### 3.2 Resolución por Prioridad (Single Query)

```sql
SELECT * FROM tariffs
WHERE (origin_place_id = ? AND destination_place_id = ?)          -- priority 1: place→place
   OR (origin_place_id = ? AND destination_zone_id = ?)           -- priority 2: place→zone
   OR (origin_zone_id = ? AND destination_place_id = ?)           -- priority 3: zone→place
   OR (origin_zone_id = ? AND destination_zone_id = ?)            -- priority 4: zone→zone
   AND active = 1
ORDER BY resolution_priority ASC
LIMIT 1
```

| Nivel | Especificidad | Ejemplo |
|-------|--------------|---------|
| 1 — place→place | Máxima | Aeropuerto IGR → Centro Puerto Iguazú |
| 2 — place→zone | Alta | Aeropuerto IGR → Zona Centro |
| 3 — zone→place | Alta | Zona Aeropuerto → Centro Puerto Iguazú |
| 4 — zone→zone | Baja (fallback) | Zona Aeropuerto → Zona Centro |

### 3.3 Resultado de Resolución

```typescript
interface TariffV2Match {
  matched: boolean;
  publicPrice4p: number | null;
  publicPrice6p: number | null;
  driverPrice4p: number | null;
  driverPrice6p: number | null;
  price: number;           // precio final según pasajeros (≤4 → 4p, >4 → 6p)
  piso: number;            // costo mínimo
  garantizado: number;     // 85% del precio
  tariffId: number | null;
  level: "place_place" | "place_zone" | "zone_place" | "zone_zone" | "not_found";
  resolutionPriority: number;
}
```

---

## 4. Track v3 — Pricing Engine (FROZEN)

### 4.1 Flujo

```
calculatePrice(input)
  ├── resolveTariff() → base price
  ├── applyCommercialRules() → adjustments
  ├── priceMultiRideLegs() → hub discounts
  └── resolveTour() → tour pricing
```

### 4.2 PricingResult

```typescript
interface PricingResult {
  base_price: number;
  markup: number;
  adjustments: Array<{ type: string; amount: number; description: string }>;
  final_price: number;
  tariff_id: number | null;
  origin: { canonical_name: string; display_name?: string; zone_id?: string };
  destination: { canonical_name: string; display_name?: string; zone_id?: string };
  level: string;
  source: "v2" | "v3";
  explanation: string;
}
```

---

## 5. Reglas Comerciales (`commercial-pricing-engine.ts`)

| Tipo | Origen | Ejemplo |
|------|--------|---------|
| **Promociones** | Tabla `promotions` | -10% en ruta específica, válido hasta fecha |
| **Ajustes por proveedor** | Tabla `provider_adjustments` | -15% para un provider específico |
| **Paquetes** | Tabla `packages` | Round trip con descuento, precio fijo |
| **Campañas TG** | Tabla `promotions` (source=TG) | Descuento promocional TaxiGuazú |
| **Hub discount** | `hub-discount.ts` | Multi-ride: descuento si comparten hub |
| **Tour pricing** | `tour-resolver.ts` | Precio fijo para tours predefinidos |

### 5.1 Regla de Aplicación

1. Se aplican **todos** los ajustes que correspondan (promociones + provider + paquete)
2. Los ajustes son **acumulativos** (varios descuentos se suman)
3. **Nunca por debajo del base_price** (markup cap)
4. Si un paquete es **más caro** que el precio calculado → se ignora (el más barato gana)

---

## 6. Hub Discount (`hub-discount.ts`)

### 6.1 Detección de Hubs

Un **hub** es un lugar que aparece como destino de un leg y origen del siguiente:
```
Leg 1: Aeropuerto → Centro    ← Centro es hub
Leg 2: Centro → Parque        ← Centro es hub
Leg 3: Parque → Aeropuerto
```

### 6.2 Descuento

| Condición | Descuento |
|-----------|-----------|
| 2+ legs comparten hub | Descuento en legs con hub como origen |
| Round trip (A→B→A) | Descuento automático del 10% (`STANDARD_DISCOUNT`) |
| Auto-learning | Si el descuento resulta en conversión, se refuerza; si no, se atenúa |

---

## 7. Tour Resolver (`tour-resolver.ts`)

Resuelve tours predefinidos desde la tabla `tours`:

| Campo | Descripción |
|-------|-------------|
| `trip_type` | `round_trip` o `tour` |
| `origin_place_id` / `origin_zone_id` | FK origen |
| `destination_place_id` / `destination_zone_id` | FK destino |
| `price_4p` / `price_6p` | Precio fijo |
| `driver_price_4p` / `driver_price_6p` | Precio chofer |
| `crosses_border` | 0/1 |
| `wait_hours` | Horas de espera incluidas |

---

## 8. Funciones del Dominio

### 8.1 Fachada Unificada

| Función | Descripción |
|---------|-------------|
| `resolvePricingForSlots(input)` | Punto de entrada único: orquesta v2+v3 |

### 8.2 v2 (Activo)

| Función | Descripción |
|---------|-------------|
| `resolveTariff(origin, dest, pax)` | Single query 4 niveles |
| `resolveTariffByPlaceIds(oId, dId, pax)` | Resolución directa por place_id |

### 8.3 v3 (FROZEN)

| Función | Descripción |
|---------|-------------|
| `calculatePrice(req)` | Cálculo completo con markup |
| `applyCommercialRules(input)` | Aplicar promociones + ajustes |
| `priceMultiRideLegs(legs, pax)` | Hub detection + descuentos |
| `resolveTour(origin, type, pax)` | Tour pricing |

---

## 9. Constantes de Pricing

| Constante | Valor | Uso |
|-----------|-------|-----|
| `DISCOUNT_MAX_EXPLICIT` | 15% | Descuento máximo explícito |
| `STANDARD_DISCOUNT` | 10% | Descuento estándar (round trip) |
| `MIN_MARGIN` | 3000 ARS | Comisión mínima para TaxiGuazú |
| `LOW_PISO_FACTOR` | 0.8 | Factor para choferes low-cost |

---

## 10. Gaps y Decisión Pendiente

| Gap | Estado |
|-----|--------|
| **Unificación v2/v3** | v2 activo, v3 FROZEN. Sin plan de migración. |
| `commercial-pricing-engine.ts` | Semi-frozen. Sin tests de integración con DB real. |
| Festivos/surges | Datos en `iguazu-knowledge.ts` pero no conectados a pricing (FUT-07). |
| Sin caché de tarifas | Cada query de pricing es un hit a DB. |
