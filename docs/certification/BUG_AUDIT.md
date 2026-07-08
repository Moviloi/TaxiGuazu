# BUG_AUDIT.md — 15 Tests Históricos
## Generado: 2026-07-08

---

## Resumen Ejecutivo

| Métrica | Valor |
|---|---|
| Tests fallando | 15 / 876 (1.7%) |
| Archivos afectados | 4 |
| Causas raíz únicas | **3** |
| Agrupamiento principal | **14 tests comparten la misma causa** |
| Quick wins | **14 tests corregibles con 3 líneas de mock** |
| Bugs reales | **1 test (requiere decisión de producto)** |

---

## Causas Raíz

### CAUSA A: Mock `location-resolver` incompleto — NO EXPORTA `resolveGeoRoute` ni `resolveLocation`

| Atributo | Valor |
|---|---|
| **Tests afectados** | **14** (fase-27: 5, fase-29: 4, fase-29.2: 5) |
| **Dominio** | Geo / Integration |
| **Módulo** | `src/lib/services/geo/location-resolver.ts` |
| **Causa inmediata** | Los tests mockean `@/lib/services/geo/location-resolver` con un objeto `{}` que no incluye `resolveGeoRoute` ni `resolveLocation` |
| **Causa raíz** | **Regresión P1**: el mock se actualizó de `geo-engine` a `location-resolver` pero no se agregaron las funciones que el código real espera encontrar en ese módulo |
| **Clasificación** | **MOCK INCORRECTO** |
| **Costo de reparación** | **BAJO** — 3 líneas por archivo de test |
| **Riesgo** | **BAJO** — no afecta producción, solo tests |

**Mecanismo**: Durante Hardening P1, `geo-engine.ts` fue eliminado y sus exports (`resolveGeoRoute`, `classifyTripLeg`, tipos) se movieron a `location-resolver.ts`. Los tests que mockeaban `geo-engine` fueron actualizados a mockear `location-resolver`. Pero el objeto mock `vi.mock("@/lib/services/geo/location-resolver", () => ({}))` no incluye todas las funciones que el código bajo test espera:
- `resolveGeoRoute` — usado por `policy-pipeline.ts` → `handlePolicyPipeline` → `processLead`
- `resolveLocation` — usado por múltiples consumidores en la cadena de pricing

**Breakdown por archivo**:
| Archivo | Función faltante | Tests fallidos |
|---|---|---|
| `fase-27-contingency-readiness.test.ts` | `resolveLocation` | 5/8 |
| `fase-29-quote-enforcement.test.ts` | `resolveGeoRoute` | 4/4 |
| `fase-29.2-slot-confirmation-routing.test.ts` | `resolveGeoRoute` | 5/6 |

---

### CAUSA B: `fase-22` — origin no se limpia tras corrección parcial

| Atributo | Valor |
|---|---|
| **Tests afectados** | **1** (fase-22 T2) |
| **Dominio** | Extraction / Slot State |
| **Módulo** | `src/lib/services/extraction/extraction-runner.ts` — merge de slots |
| **Causa inmediata** | `expect(slots?.origin?.value).toBeNull()` falla: recibe `'Aeropuerto IGR'` |
| **Causa raíz** | El sistema **preserva** el origin del turno anterior (previous_turn) cuando el usuario corrige solo destination. El test esperaba que el origin se limpiara. |
| **Clasificación** | **BUG REAL o TEST OBSOLETO** |
| **Costo de reparación** | **MEDIO** — requiere decidir si el comportamiento actual es correcto o no |
| **Riesgo** | **MEDIO** — si se "corrige" el código, podría romper el flujo real de corrección |

**Análisis**: El escenario es: usuario dice "estoy en Aeropuerto IGR, voy al Centro" → slots llenos. Luego dice "no, el destino es Cataratas". El sistema extrae destino=Cataratas y preserva origin=Aeropuerto IGR (previous_turn). El test espera `origin.value = null`. 

La pregunta de producto: ¿es correcto preservar el origin en una corrección parcial, o debería pedirse confirmación? El comportamiento actual es preservar (FIX 5/6 introdujeron la preservación de slots previos para evitar pérdida de contexto).

---

## Mapa de Impacto

```
geo-engine.ts ELIMINADO (P1)
    │
    ├── exports movidos a location-resolver.ts
    │       │
    │       ├── resolveGeoRoute → policy-pipeline.ts → handlePolicyPipeline
    │       │       │
    │       │       ├── rompe fase-29-quote-enforcement (4 tests)
    │       │       └── rompe fase-29.2-slot-confirmation (5 tests)
    │       │
    │       └── resolveLocation → múltiples consumers
    │               │
    │               └── rompe fase-27-contingency (5 tests)
    │
    └── tests actualizados: mock geo-engine → location-resolver
            │
            └── mock INCOMPLETO: faltan resolveGeoRoute + resolveLocation

fase-22 T2 (independiente)
    │
    └── BUG REAL: origin preservado en corrección parcial
            │
            └── comportamiento introducido en FIX 5/6
```

---

## Prioridad de Reparación

| # | Causa | Tests | Costo | Riesgo | Orden |
|---|---|---|---|---|---|
| A | Mock `location-resolver` incompleto | 14 | BAJO | BAJO | **PRIMERO** |
| B | fase-22: origin no se limpia | 1 | MEDIO | MEDIO | **SEGUNDO** (requiere decisión) |

---

## Quick Wins

### Arreglar 14 tests (Causa A):

**`fase-27-contingency-readiness.test.ts`** — agregar `resolveLocation` al mock:
```typescript
vi.mock("@/lib/services/geo/location-resolver", () => ({
  resolveLocation: vi.fn().mockResolvedValue({ place_id: "p1", canonical_name: "IGR", zone_id: "Z1", confidence: "alias" }),
}));
```

**`fase-29-quote-enforcement.test.ts`** — agregar `resolveGeoRoute`:
```typescript
vi.mock("@/lib/services/geo/location-resolver", () => ({
  resolveGeoRoute: vi.fn().mockReturnValue({ originNode: "x", destinationNode: "y", originZone: null, destinationZone: null, routeType: "MEDIUM", proximityScore: 0.3 }),
}));
```

**`fase-29.2-slot-confirmation-routing.test.ts`** — ídem.

---

## Riesgos

| Riesgo | Probabilidad | Impacto |
|---|---|---|
| Los 14 tests de mock pasan pero el código subyacente tiene bugs no detectados | BAJA | BAJO |
| Corregir fase-22 rompe el flujo de corrección en producción | MEDIA | ALTO |

---

## Propuesta de orden de corrección

1. **S1.1** (BAJO costo/riesgo): Agregar exports faltantes a los 3 mocks de `location-resolver` → 14 tests verdes.
2. **S1.2** (MEDIO costo/riesgo): Analizar fase-22 con evidencia de producción. Decidir entre:
   - A) Actualizar el test para reflejar el comportamiento actual (el origin se preserva)
   - B) Modificar el código para no preservar origin en correcciones parciales
