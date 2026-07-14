# MOV-1 — Memory Operational Validation Report

> **Fecha:** 2026-07-14  
> **Tipo:** Validación Operacional  
> **Componente:** Memory (IM-1) — ADR-010  
> **Rol:** Arquitecto de Software + SRE  
> **Documentos fuente:** `src/lib/memory/*.ts`, `src/lib/services/lead.service.ts`, `src/lib/db/core/connection.ts`, `src/config/env.ts`, `tests/unit/memory/*.ts`, `tests/integration/memory/*.ts`

---

## Preámbulo: Condición de la validación

**Memory NO ha sido ejecutada en ningún entorno con tráfico real o de staging.**

El piloto operacional del bot está **bloqueado por 4 P0s** (rotación de API key, SENTRY_DSN, seed de choferes, CREATE TABLE faltante en producción). Sin tráfico conversacional en el pipeline, no hay Beliefs, Decisions ni ShadowResults que puedan ser preservados como snapshots.

Esto implica que **ninguna validación dinámica** (persistencia de datos reales, latencia bajo carga, comportamiento con datos reales) pudo realizarse.

Se presenta a continuación una validación **estática + estructural**, complementada con análisis de las condiciones que deberían cumplirse cuando exista tráfico.

---

## 1. Feature Flag — VALIDADO (estático)

### Configuración

| Aspecto | Resultado | Evidencia |
|---------|:---------:|-----------|
| Default value | ✅ `false` | `memory-service.ts:32`: `process.env.COGNITIVE_MEMORY_ENABLED === 'true'` |
| Activación exacta | ✅ Solo `'true'` (string) | Test unitario: `'1'` → false, `'yes'` → false |
| No está en schema Zod | ✅ Intencional | `env.ts:18-21`: documentado como acceso directo a `process.env` |
| Mismo patrón que EE | ✅ Idéntico a `isEvidenceShadowModeEnabled()` | Ambos usan `=== 'true'` directamente de `process.env` |
| Documentado como env var | ✅ | `env.ts:18`, ADR-010 §5.2 C6 |

### Estado actual en .env

```
COGNITIVE_MEMORY_ENABLED    NO DEFINIDO (default false)
```

### Conclusión de Feature Flag

✅ **El flag funciona según especificación.** Sin cambios en `.env`, Memory no se activa. La activación requiere editar `.env` o setear la variable en el entorno de despliegue.

---

## 2. Shadow Mode — VALIDADO (estructural)

### Guard condicional

La zona de Memory en `lead.service.ts` (líneas 88-103) está envuelta en **dos condiciones**:

```
1. isMemoryShadowModeEnabled()        ← flag env var
2. shadowResult?.isComplete            ← EE debe haber producido un resultado válido
```

### Aislamiento del pipeline operacional

| Aspecto | Resultado | Evidencia |
|---------|:---------:|-----------|
| Memory corre DESPUÉS del EE | ✅ | Línea 85: `shadowResult = runShadowCognition(...)` |
| Memory corre ANTES del pipeline | ✅ | Línea 105: `// ZONE: MEMORY + COMPREHENSION + EXTRACTION` |
| Memory no modifica variables del pipeline | ✅ | `shadowResult` es `let` local, nunca reasignado |
| Memory usa try-catch (nunca lanza) | ✅ | `memory-service.ts:58`: `try { ... } catch (err) { return { success: false, error } }` |
| Memory no afecta la respuesta al usuario | ✅ | `store()` retorna `MemoryStoreResult`, no se usa en el flujo |
| Evidence Engine permanece aislado | ✅ | 0 archivos de `src/lib/evidence/` modificados |

### Fire-and-forget

El `await` en `lead.service.ts:95` introduce una espera, pero como `store()` nunca lanza (atrapa errores internamente), no hay riesgo de excepción no capturada que pueda romper el pipeline. El impacto es una espera de latencia de DB, no un riesgo de crash.

### Conclusión de Shadow Mode

✅ **El Shadow Mode está correctamente implementado.** Bajo ninguna condición observable Memory puede modificar la respuesta al usuario, corromper el pipeline operacional o afectar el EE.

---

## 3. Persistencia — NO VALIDADO (sin tráfico)

### Condiciones necesarias para persistencia

Para que un snapshot se persista, deben cumplirse **todas** estas condiciones:

| # | Condición | Estado actual |
|:-:|-----------|:-------------:|
| 1 | `COGNITIVE_MEMORY_ENABLED=true` | ❌ No seteado en `.env` |
| 2 | `EVIDENCE_SHADOW_MODE=true` | ❌ No verificado (probablemente no seteado) |
| 3 | `runShadowCognition()` produce `shadowResult.isComplete=true` | ❌ Sin tráfico, no hay ejecución |
| 4 | La tabla `cognitive_memory_snapshots` existe en la DB | ✅ En initSchema() |
| 5 | La conexión a Turso funciona | ⚠️ Depende de `TURSO_DATABASE_URL` y `TURSO_DATABASE_TOKEN` (están en `.env`) |

### Análisis de la tabla

La tabla fue añadida correctamente en `connection.ts:577-598`:

```sql
CREATE TABLE IF NOT EXISTS cognitive_memory_snapshots (
  conversation_id TEXT NOT NULL,
  memory_id TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  stored_at INTEGER NOT NULL,
  -- 15 campos más (belief_*, decision_*)
  PRIMARY KEY (conversation_id, turn_number)
)
```

**Problema potencial:** `conversation_id` en Memory es un `string`, mientras que en el modelo operacional la tabla `conversations` usa `INTEGER PRIMARY KEY AUTOINCREMENT`. En `lead.service.ts`, el `conversation.id` se convierte a string (`String(conversation.id)`) antes de pasarlo a Memory. Esto es correcto — Memory trata `conversationId` como partition key opaca — pero puede causar confusión si se intentan joins con tablas operacionales en el futuro.

### Control de duplicados

La PK `(conversation_id, turn_number)` garantiza que:
- No pueden existir dos snapshots con el mismo `(conversationId, turnNumber)`
- Si un mismo turno intenta insertarse dos veces, la DB rechazará el segundo INSERT
- `SqliteMemoryStorage.insert()` atrapa el error y retorna `{ success: false, error }`

### Conclusión de Persistencia

❌ **No se pudo validar con datos reales.** El diseño de la tabla es correcto. La PK compuesta previene duplicados. Sin tráfico, no hay snapshots que inspeccionar.

---

## 4. Rendimiento — NO VALIDADO (sin carga)

### Análisis estático

| Aspecto | Estimación | Fundamento |
|---------|:----------:|------------|
| Latencia de `store()` | ~5-50ms (est.) | Una consulta INSERT + una SELECT (getMaxTurnNumber) sobre Turso |
| Throughput | N/A | Sin carga, sin medición |
| Impacto en pipeline | Bajo | Memory se ejecuta en zona temprana, antes de extracción/LLM |
| CPU/Memoria | Insignificante | Sin bucles, sin computación pesada, sin caché en memoria |

### Riesgo de latencia acumulada

El `await memoryService.store()` en `lead.service.ts:95` es bloqueante. Si Turso tiene latencia alta (>500ms), esto sumará demora a cada mensaje entrante. **En IM-1 esto es aceptable** porque el flag está deshabilitado por defecto. Para producción, considerar:
- Timeout explícito en la consulta a Turso
- Patrón fire-and-forget real (sin `await`)
- O mantener la latencia como costo aceptable del Shadow Mode

### Conclusión de Rendimiento

❌ **No se pudo validar bajo carga.** Análisis estático sugiere impacto bajo. No hay datos de latencia, throughput, CPU o memoria.

---

## 5. Integridad — VALIDADO (estructural + código)

### 5.1 turnNumber

| Aspecto | Resultado | Evidencia |
|---------|:---------:|-----------|
| Monotonicidad | ✅ | `memory-service.ts:61`: `const turnNumber = maxTurn + 1` |
| Primero es 1 | ✅ | `memory-storage.ts:104`: `return row.max_turn ?? 0` |
| Independiente por conversación | ✅ | Particionado por `conversationId` via `WHERE conversation_id = ?` |
| PK compuesta | ✅ | `PRIMARY KEY (conversation_id, turn_number)` |

### 5.2 Metadata (memoryId, storedAt)

| Aspecto | Resultado | Evidencia |
|---------|:---------:|-----------|
| memoryId es UUID v4 | ✅ | `build-snapshot.ts:62`: `crypto.randomUUID()` |
| Fallback si crypto no existe | ✅ | `${Date.now()}-${Math.random()...}` |
| storedAt es Date ahora | ✅ | `build-snapshot.ts:63`: `new Date()` |
| storedAt ≠ receivedAt | ✅ | M-14: storedAt es el momento de persistencia, no de recepción |

### 5.3 Append-only

| Aspecto | Resultado | Evidencia |
|---------|:---------:|-----------|
| Solo INSERT | ✅ | `memory-storage.ts:59`: solo `INSERT INTO` |
| Sin UPDATE | ✅ | No hay código UPDATE en el módulo |
| Sin DELETE | ✅ | No hay código DELETE en el módulo |
| Sin TRUNCATE | ✅ | No hay código TRUNCATE en el módulo |

### 5.4 Inmutabilidad

| Aspecto | Resultado | Evidencia |
|---------|:---------:|-----------|
| Object.freeze en snapshot | ✅ | `memory-snapshot.ts:91-93`: freeze anidado |
| Object.freeze en missingInfo | ✅ | `memory-snapshot.ts:85`: `Object.freeze([...params.decision.missingInfo])` |
| Sin setters públicos | ✅ | MemorySnapshot es una interfaz, no una clase mutable |

### 5.5 Claves de partición

La PK es `(conversation_id, turn_number)`. Esto significa que:
- El particionado por `conversationId` es **explícito** en el schema
- El orden por `turnNumber` es **monotónico** dentro de cada partición
- No hay un índice adicional → `getMaxTurnNumber` usa `MAX(turn_number)` que escanea la partición

### Conclusión de Integridad

✅ **Todas las invariantes de integridad se verifican estáticamente.** El diseño es correcto y consistente con ADR-010.

---

## 6. Métricas obtenidas

| Métrica | Valor | Tipo |
|---------|:-----:|:----:|
| Snapshots creados | **0** | ❌ Sin tráfico |
| Snapshots rechazados | **0** | ❌ Sin tráfico |
| Errores de persistencia | **0** | ❌ Sin tráfico |
| Duplicados detectados | **0** | ❌ Sin tráfico |
| Latencia promedio store() | **N/A** | ❌ Sin carga |
| Throughput | **N/A** | ❌ Sin carga |
| Pruebas unitarias Memory | **38/38 PASS** | ✅ |
| Pruebas integración Memory | **7/7 PASS** | ✅ |
| Regresiones del proyecto | **0** | ✅ (única falla pre-existente: fase-22 T2) |
| Build | **✅ Compiled** | ✅ |
| Contratos | **✅ PASS** | ✅ |
| COGNITIVE_MEMORY_ENABLED en .env | **NO DEFINIDO** | ⚠️ |
| Tabla en producción | **NO VERIFICADO** | ❌ P0 CREATE TABLE |

---

## 7. Incidencias

| ID | Severidad | Descripción | Estado |
|:--:|:---------:|-------------|:------:|
| MOV-01 | 🔴 BLOQUEANTE | **No hay tráfico conversacional.** Memory no ha ejecutado una sola vez en ningún entorno. | Sin cambio posible — depende de P0s externos |
| MOV-02 | 🟡 MEDIA | **COGNITIVE_MEMORY_ENABLED no está en `.env`.** Aunque hubiera tráfico, Memory no se activaría. | Documentado como comportamiento esperado (opt-in) |
| MOV-03 | 🟡 MEDIA | **Latencia bloqueante de Turso.** `await store()` introduce riesgo de latencia no controlada. | Aceptable en Shadow Mode. Revisar antes de activación en producción |
| MOV-04 | 🔵 BAJA | **Tabla no verificada en producción.** initSchema la crea, pero no hay confirmación de que la DB real la tenga. | Se resolverá cuando se ejecute initSchema en prod (parte de los P0s) |
| MOV-05 | 🔵 BAJA | **conversationId como string.** Memory almacena el ID como string (operacional es INTEGER). No hay riesgo funcional pero puede confundir en análisis. | Documentar en interfaz de Memory |

---

## 8. Riesgos

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|:--:|--------|:------------:|:-------:|------------|
| R-MOV1 | Memory activada sin monitoreo de latencia | Baja (flag default off) | Alto (suma latencia a cada mensaje) | Agregar timeout explícito antes de activar en prod |
| R-MOV2 | DB de producción sin tabla cognitive_memory_snapshots | Alta (P0 sin resolver) | Alto (error 500 si se activa el flag) | **No activar hasta confirmar tabla** |
| R-MOV3 | Acumulación de snapshots sin límite | Media (depende de tráfico) | Bajo (storage barato, datos chicos) | Definir política de retención futura (fuera de IM-1) |
| R-MOV4 | Duplicados por reintento del mismo turno | Baja (PK lo previene) | Bajo (INSERT falla, store retorna false) | Monitorear errores de UNIQUE constraint |

---

## 9. Cumplimiento contractual

| Contrato | Estado | Evidencia |
|:--------:|:------:|-----------|
| **C1-C10** (IM-1 Contracts) | ✅ Cumplidos | 10/10 — verificados en IM-1 |
| **M-1** a **M-14** (Memory invariants) | ✅ Cumplidos | 14/14 — verificables en código |
| **Shadow Mode isolation** | ✅ Verificado | Memory no toca pipeline, no modifica respuestas, no afecta EE |
| **Feature Flag guard** | ✅ Verificado | `isMemoryShadowModeEnabled()` es la única puerta de entrada |

---

## 10. Recomendación para producción

### No activar COGNITIVE_MEMORY_ENABLED en producción hasta:

1. ✅ **Requisito 1:** Los 4 P0s del piloto estén resueltos (API key, SENTRY, seed, CREATE TABLE)
2. ✅ **Requisito 2:** La tabla `cognitive_memory_snapshots` exista en la DB de producción
3. ✅ **Requisito 3:** Se ejecute una validación con tráfico de staging (simulate endpoint o tráfico real controlado)
4. ✅ **Requisito 4:** Se mida latencia de `store()` en staging (< 200ms p95)

### Pasos para staging:

```
1. Agregar COGNITIVE_MEMORY_ENABLED=true al .env de staging
2. Agregar EVIDENCE_SHADOW_MODE=true al .env de staging (si no está)
3. Enviar 10-20 mensajes de prueba vía /api/bot/simulate o WhatsApp real
4. Verificar en DB: SELECT COUNT(*) FROM cognitive_memory_snapshots;
5. Verificar turnNumber: SELECT conversation_id, turn_number FROM cognitive_memory_snapshots ORDER BY conversation_id, turn_number;
6. Verificar sin regresiones: el bot debe responder igual que sin Memory
7. Medir latencia: comparar tiempo de respuesta con y sin flag
```

### Próximo paso recomendado

Ejecutar la validación dinámica en el entorno de staging existente (Turso configurado, `.env` con credenciales válidas). Esto produciría los primeros snapshots reales, permitiendo verificar persistencia, integridad de datos y latencia.

---

## Veredicto

### REQUIRES OPERATIONAL CORRECTIONS

**Motivo:** No fue posible validar el comportamiento operacional de Memory porque no existe tráfico conversacional (piloto bloqueado por 4 P0s). Memory nunca ha sido ejecutada en ningún entorno. Las validaciones estáticas y estructurales son correctas (Feature Flag, Shadow Mode, Integridad), pero las dinámicas (Persistencia, Rendimiento) no pudieron realizarse.

### Correcciones necesarias antes de la validación completa:

| # | Corrección | Dependencia |
|:-:|-----------|:-----------:|
| 1 | Resolver P0s del piloto (API key, SENTRY, seed, CREATE TABLE) | Operaciones |
| 2 | Agregar `COGNITIVE_MEMORY_ENABLED=true` al entorno de staging | Configuración |
| 3 | Generar tráfico conversacional mínimo (10-20 msgs) | Testing |
| 4 | Verificar persistencia, integridad y latencia | SRE |

Una vez realizadas estas correcciones, MOV-1 puede ejecutarse nuevamente para obtener un veredicto completo.

---

*Fin de MOV-1 — Memory Operational Validation Report*
