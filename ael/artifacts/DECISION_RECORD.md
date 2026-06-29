# DECISION_RECORD — Congelamiento del Grafo de Zonas

Generado por: **Memory**
Fase del pipeline: `RECORDING`
Estado: `COMPLETE`

---

## Decisión: Congelamiento del Grafo de Zonas Operativas

### Contexto

El sistema TaxiGuazú necesita un modelo de zonificación para calcular tarifas de transporte en la Triple Frontera (AR, BR, PY). El modelo anterior tenía 7 zonas genéricas con precios placeholder y sin validación operativa. Se realizaron dos análisis complementarios:

1. **ASE 32** — Inferencia desde red vial: identificar bifurcaciones, corredores de acceso, y comportamiento vehicular usando Google Maps / Street View.
2. **ASE 33** — Inferencia desde tarifario real: agrupar destinos que comparten precios desde múltiples orígenes independientes.

Ambos análisis se integraron en un documento único que constituye la especificación congelada.

### Decisión

Se acepta el **Grafo de Zonas Congelado** con ~18 zonas operativas, matriz de precios reales, y las siguientes reglas de diseño:

1. **Zonas definidas por comportamiento vehicular, no por geografía.** Dos lugares están en la misma zona si un vehículo se comporta igual para llegar a ambos (mismo corredor, misma maniobra, tiempo homogéneo).
2. **Pricing simétrico:** Cada tarifa tiene `public_price` (cliente) y `driver_price` (chofer). La diferencia es el margen bruto.
3. **Resolución por prioridad:** 1=place→place, 2=place→zone, 3=zone→place, 4=zone→zone. Query única con `ORDER BY resolution_priority LIMIT 1`.
4. **Sin tarifas intra-zona:** Si dos places están en la misma zona, no puede haber tarifa entre ellos. Si se necesita precio diferente, están en zonas incorrectas.
5. **Excepciones solas si el costo operativo difiere significativamente** del default de zona.

### Alternativas consideradas

| Alternativa | Rechazada por |
|-------------|---------------|
| Zonas administrativas (barrios, distritos) | No reflejan comportamiento vehicular real |
| Zonas por tipo de lugar (ZONE_HOTELES) | Mezcla hoteles con accesos muy distintos (Recanto vs Mabu) |
| 4 queries secuenciales L1-L4 | Mantenible pero menos eficiente y prioridad hardcodeada |
| price_4p + driver_discounts | El descuento no refleja el pago real del chofer; mejor tener ambos precios explícitos |
| No subdividir 600 Hectáreas | La diferencia de precio (12k vs 15k) y de camino (asfalto vs tierra 2.8km) justifica la subdivisión |

### Impacto

- **Schema DB:** 3 tablas modificadas (tariffs, places, zones), ~6 columnas nuevas
- **Seed-data:** Expansión de 7 a ~18 zonas, 12 a ~30 places, 20 a ~60+ tarifas
- **Código:** tariff-resolver.ts reescrito a single query, location-resolver.ts retorna zoneId
- **Tests:** 591 tests existentes deben seguir pasando
- **Turso:** Tabla location_aliases (120 filas) debe ser respaldada y eliminada

### Prerrequisitos para implementación

- [ ] TASK_PLAN aprobado por Director
- [ ] DESIGN_SPEC validado contra ADRs
- [ ] Seed-data revisado por stakeholder (precios reales)
- [ ] Backup de DB Turso actual
- [ ] Borrador de migraciones M0-M2 listo
