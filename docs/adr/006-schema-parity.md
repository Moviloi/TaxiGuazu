# ADR 006: Schema Parity — The Database Is the Source of Truth

**Status:** Extended (DEBT-12 Fase C2 + C3)  
**Date:** 2026-07-04 (original), 2026-07-05 (C2 — migration runner, C3 — ALTER TABLE cleanup)  
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
- Migraciones ALTER TABLE legacy fueron eliminadas en DEBT-12 Fase C3.

### Enforcement

El script `scripts/validate-schema-parity.ts` (creado junto con este ADR)
verifica automáticamente que el DDL en `initSchema()` coincide con el schema
real de Turso. Se ejecuta vía `npm run validate-schema-parity`.

La integración a pre-commit hooks queda como recomendación (mismo criterio que
AIT-034/validate-knowledge) — el script existe, usarlo en CI es decisión del
equipo.

---

## Addendum: DEBT-12 Fase C2 — Migration Runner (2026-07-05)

### Problema

Antes de C2, no existía un mecanismo versionado para aplicar migraciones de schema.
Las migraciones se aplicaban como ALTER TABLE inline en `connection.ts:initSchema()`
o como comandos manuales contra Turso. La tabla `_migrations` existía solo como
registro histórico pasivo — nadie la escribía ni la leía desde código.

### Decisión

Se implementó un migration runner real que reemplaza el proceso ad-hoc anterior.
Toda migración FUTURA de schema debe realizarse mediante este mecanismo.

### Mecanismo

1. **`db/migrations/`** — Carpeta con archivos SQL numerados secuencialmente:
   ```
   0001_descripcion.sql
   0002_descripcion.sql
   ```
   - El número es fijo: una vez mergeado, el archivo es inmutable (no se renumera ni edita).
   - Solo migraciones FUTURAS van aquí. Las 13 migraciones históricas ya aplicadas
     en Turso NO se reconstruyen como archivos SQL.

2. **`scripts/run-migrations.ts`** — Runner que:
   - Lee `db/migrations/*.sql` ordenado por nombre.
   - Consulta `_migrations` para saber cuáles ya se aplicaron.
   - Aplica las pendientes en orden, cada una en su propia transacción.
   - Registra cada migración exitosa en `_migrations` (name + unixepoch).
   - Si una migración falla, hace ROLLBACK de ESA migración y se detiene (no aplica las siguientes).
   - **Default**: apunta a DB local (`data/bot.db`).
   - **Producción**: requiere flag `--production` (usa `TURSO_DATABASE_URL`).

3. **`npm run migrate`** — Comando para desarrollo local.
   **Producción**: `npm run migrate -- --production` (o `npx tsx scripts/run-migrations.ts --production`).

4. **`scripts/seed-migrations-history.ts`** — Seed ONE-TIME que registra las 13
   migraciones históricas en `_migrations` con sus timestamps exactos de Turso.
   Se ejecuta una sola vez por entorno vía `npm run migrate:seed-history`.
   No se ejecuta automáticamente como parte de `npm run migrate`.

### Reglas para migraciones futuras

1. Toda migración de schema debe ser un archivo `.sql` en `db/migrations/`.
2. No se permite ALTER TABLE manual contra Turso ni modificación directa sin versionar.
3. El DDL en `initSchema()` debe actualizarse en el MISMO ciclo que la migración.
4. Las migraciones son inmutables una vez mergeadas. No se editan ni se renumeran.
5. Si una migración necesita revertirse, se crea UNA NUEVA migración que deshaga el cambio.

### Fase C3 — Eliminación de ALTER TABLE inline (completada 2026-07-05)

C3 eliminó los 7 bloques de ALTER TABLE inline (36 statements) de `initSchema()`
en `connection.ts`. Todas las columnas que esos bloques agregaban ya están
cubiertas por los CREATE TABLE IF NOT EXISTS completos desde la Fase C1.

**Qué se eliminó:**
1. FASE 5.2.5: ADD COLUMN para chat_sessions (lang, conversational_state, dispatch_state, trip_state, slot_states)
2. GRAFO ZONAS: ADD COLUMN para tariffs (10 columnas: public_price_4p, driver_price_4p, etc.)
3. GRAFO ZONAS: DROP COLUMN para tariffs legacy (price_4p, price_6p, base_price_4p, base_price_6p)
4. ADD COLUMN para zones (surcharge_description, surcharge_pct)
5. ADD COLUMN para places (display_name, zone_id)
6. CATASTRO HOTELERO: ADD COLUMN para places (barrio, corredor_vial, estrellas, etc.)
7. FASE 5.2.7: RENAME + DROP COLUMN para chat_sessions y conversations

**Qué se conservó:**
- Data migration (UPDATEs desde workflow_state a nuevas columnas) — no-op, preservada por seguridad
- FASE 6: Migración alias_lookup → aliases — no es ALTER TABLE, es migración de datos

**Estado final de `connection.ts`:**
- Ya no contiene bloques ALTER TABLE legacy
- Todo el schema histórico vive en `initSchema()` como CREATE TABLE completo (Fase C1)
- Todo cambio futuro pasa por `db/migrations/` (Fase C2)
- Comprobado: DB nueva desde cero sin ALTER TABLE tiene todas las columnas ✅
- `validate-schema-parity`: 44/44 OK, 0 drift ✅

### `_migrations` y validate-schema-parity

- `_migrations` es una tabla de infraestructura, NO se declara en `initSchema()`.
  El runner la crea con `CREATE TABLE IF NOT EXISTS`.
- `validate-schema-parity.ts` ya excluye `_migrations` de la comparación
  (`AND name != '_migrations'` en L194), por lo que no genera falsos positivos.
