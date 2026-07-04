# ADR 006: Schema Parity — The Database Is the Source of Truth

**Status:** Accepted  
**Date:** 2026-07-04  
**Driver:** Continuity — `initSchema()` declaraba 33 tablas con columnas parciales
mientras la base de producción tenía 42 tablas completas, creando riesgo de
entornos nuevos con schema inválido.

## Context

El sistema define su schema de base de datos en dos lugares que pueden divergir:

1. **Código versionado** (`initSchema()` en `connection.ts`) — DDL que se ejecuta
   al iniciar una base nueva.
2. **Base de datos real** (Turso en producción) — schema que evoluciona mediante
   migraciones aplicadas directamente.

Históricamente, las migraciones se aplicaban en producción sin actualizar el DDL
en `connection.ts`. Esto funcionaba porque las migraciones eran ALTER TABLE sobre
una base existente, y `initSchema()` solo se ejecutaba en entornos nuevos.

### El hallazgo (DEBT-12, 2026-07-04)

Durante la verificación pre-implementación de AIT-040 (event sourcing para Trip),
se descubrió que:

| Métrica | initSchema() (antes) | DB real Turso |
|---------|---------------------|---------------|
| Tablas declaradas | 33 | 42 |
| Columnas en `trips` | 15 | 28 |
| Columnas en `drivers` | 7 | 31 |
| Columnas en `chat_sessions` | 12 | 16 |
| Columnas huérfanas totales | — | **~110** |
| Tablas sin DDL | — | **10** completas |
| Migraciones sin código | — | **13** en `_migrations` |

Cualquier entorno nuevo levantado desde `initSchema()` arrancaba con un schema
incompleto. Las 13 migraciones acumuladas en `_migrations` (Turso) no tenían
código versionado equivalente. Tres tablas (`trips`, `drivers`, `chat_sessions`)
tenían columnas que existían en la DB real pero que `initSchema()` nunca creaba.

**La causa raíz:** No había una regla que exigiera reflejar cambios de schema
en el código versionado. Las migraciones se aplicaban en producción como
"parches" y el DDL quedaba obsoleto.

## Decision

**El código que declara schema DEBE reflejar siempre el estado real de la base
de datos de producción.** La DB real es la fuente de verdad; el código la
persigue, nunca al revés.

### Reglas

1. **No se permite código que declare un schema distinto al real** por
   conveniencia, brevedad, o pereza de actualizar.

2. **Cualquier cambio de schema en producción debe reflejarse en el código
   versionado en el mismo ciclo de trabajo** en que se aplica, no después.

3. **El DDL en `initSchema()` debe ser un `CREATE TABLE IF NOT EXISTS` completo**
   de cada tabla con todas sus columnas actuales — no un subconjunto que luego
   se completa con ALTER TABLE.

4. **`PRAGMA table_info` contra la DB real es la referencia canónica.**
   Cualquier discrepancia entre el DDL en código y el schema real es un bug
   (categoría: deuda técnica P0 por riesgo de continuidad).

### Excepciones

- Tablas puramente temporales o de caché (ej: `_migrations` es log histórico,
  no se declara en initSchema).
- Columnas agregadas para features en desarrollo activo que aún no están en
  producción — pero deben agregarse al DDL antes del deploy.

## Consequences

### Positive
- Entornos nuevos siempre arrancan con schema completo.
- El código versionado es una fuente confiable del schema actual.
- Se elimina la necesidad de rastrear migraciones aplicadas en producción para
  saber el estado real del schema.

### Negative
- El DDL en initSchema() crece (42 tablas vs 33 originales) — pero es DDL
  declarativo, no lógica de negocio.
- Requiere verificación periódica o automatizada contra la DB real.
- Migraciones ALTER TABLE legacy quedan como código muerto hasta que se limpien
  (ver DEBT-12 Fase C3).

### Enforcement

El script `scripts/validate-schema-parity.ts` (creado junto con este ADR)
verifica automáticamente que el DDL en `initSchema()` coincide con el schema
real de Turso. Se ejecuta vía `npm run validate-schema-parity`.

La integración a pre-commit hooks queda como recomendación (mismo criterio que
AIT-034/validate-knowledge) — el script existe, usarlo en CI es decisión del
equipo.
