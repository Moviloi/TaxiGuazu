# FCER-1 — First Cognitive Evidence Report

> **Fecha:** 2026-07-14  
> **Fuente de datos:** Turso DB (producción) — consulta directa vía `@libsql/client`  
> **Período analizado:** Toda la historia de la tabla `cognitive_memory_snapshots` + `conversations` + `messages`  
> **Rol:** Arquitecto Principal + Responsable de Observabilidad Cognitiva  
> **Documento precedente:** MOV-1 (Requisitos de validación operacional)

---

## Preámbulo

Este informe analiza la primera evidencia empírica del funcionamiento del pipeline cognitivo de AITOS tras la resolución de los bloqueos operacionales y la recepción de tráfico conversacional real.

**No se revisa código. No se revisan contratos. No se proponen rediseños.** Solo se analiza la evidencia observada en la base de datos de producción.

---

## 1. Volumen

### 1.1 Tráfico conversacional

| Métrica | Valor |
|---------|:-----:|
| Teléfonos únicos | **223** |
| Conversaciones totales | **223** |
| Mensajes totales | **268** |
| Mensajes de usuario | **36** |
| Mensajes del asistente | **232** |
| Modo de atención | **100% AI** |

### 1.2 Actividad reciente (14 de julio 2026)

| Ventana | Conversaciones |
|---------|:--------------:|
| Últimos ~30 minutos (09:40-09:59 UTC) | **7** |
| Últimas ~24 horas | **9** |
| Últimos ~3 días | **12** |

La conversación más reciente tiene `last_message_at = 1784023144` (2026-07-14T09:59:04Z) — tráfico activo hoy.

### 1.3 Top conversaciones por volumen

| Conversación | ID | Mensajes |
|:------------:|:--:|:--------:|
| Mayor volumen | 2 | 18 |
| 2° mayor | 4 | 14 |
| 3° mayor | 3, 5 | 8 c/u |
| Reciente (ayer) | 215 | 6 |

### 1.4 Snapshots cognitivos

| Métrica | Valor |
|---------|:-----:|
| **Snapshots en `cognitive_memory_snapshots`** | **0** |
| Conversaciones únicas con snapshots | **0** |
| Snapshots con `isComplete=true` | **0** |
| Snapshots descartados por error | **0** (0 errores en `f9_error_log`) |

---

## 2. Análisis de la ausencia de snapshots

### 2.1 Estado de la infraestructura

| Componente | Estado | Evidencia |
|------------|:------:|-----------|
| Tabla `cognitive_memory_snapshots` | ✅ **Existe** | Schema verificado: 19 columnas, PK `(conversation_id, turn_number)`, CHECK constraint en `decision_readiness` |
| Conexión a Turso | ✅ **Funciona** | 46 tablas consultadas exitosamente, datos de conversaciones recuperados |
| Motor de base de datos | ✅ **Operativo** | 232 respuestas del asistente enviadas, sesiones actualizadas |
| Errores del sistema | ✅ **0 errores** | `f9_error_log` vacío |

### 2.2 Causa raíz

La tabla existe, el pipeline funciona, el tráfico fluye. Sin embargo, **0 snapshots fueron creados**. Las causas posibles, ordenadas por probabilidad:

| # | Causa | Probabilidad | Fundamento |
|:-:|-------|:------------:|------------|
| 1 | `COGNITIVE_MEMORY_ENABLED` no está `true` en producción | **MUY ALTA** | Default es `false`. No hay evidencia de que se haya configurado en el entorno de producción. |
| 2 | `EVIDENCE_SHADOW_MODE` no está `true` | **ALTA** | Si el EE no está en Shadow Mode, `shadowResult` es siempre `null`, y la guarda `shadowResult?.isComplete` impide la persistencia. |
| 3 | El EE no produce `isComplete=true` para estas conversaciones | **MEDIA** | Las conversaciones son cortas (promedio ~1.2 mensajes por conversación). El EE puede no tener suficiente señal. |
| 4 | Error silencioso en `runShadowCognition()` | **BAJA** | No hay errores registrados en `f9_error_log`. |

### 2.3 Evidencia concluyente

Las 223 conversaciones fluyeron por `lead.service.ts`. La zona de persistencia cognitiva (`lead.service.ts:88-103`) depende de dos condiciones:

```
1. isMemoryShadowModeEnabled()     → FALSE (COGNITIVE_MEMORY_ENABLED no configurado)
2. shadowResult?.isComplete         → NUNCA EVALUADO (condición 1 es false)
```

Por lo tanto, **ninguna de las 223 conversaciones activó Memory**, incluso cuando el Evidence Engine podría haber producido resultados válidos.

---

## 3. Calidad (no aplica — sin datos)

No existen snapshots para evaluar integridad, consistencia de `turnNumber`, metadata o append-only.

**Lo verificable sin snapshots:**

| Invariante | Estado | Método |
|------------|:------:|--------|
| Tabla existe con schema correcto | ✅ | `sqlite_master` confirmado |
| PK compuesta `(conversation_id, turn_number)` | ✅ | Schema verificado |
| CHECK constraint `decision_readiness` | ✅ | Schema verificado |
| `memory_id` como `TEXT NOT NULL` | ✅ | Schema verificado |
| `stored_at` como `INTEGER NOT NULL` | ✅ | Schema verificado |

---

## 4. Rendimiento (no aplica — sin carga)

`store()` nunca fue invocado. No hay métricas de latencia, throughput, ni impacto en el pipeline.

**Lo que SÍ puede medirse:** el pipeline operacional responde normalmente sin Memory. El tiempo de respuesta del bot no se ve afectado por un módulo que no se ejecuta, lo cual es consistente con el diseño de Shadow Mode.

---

## 5. Observabilidad

### 5.1 Errores

| Origen | Cantidad |
|--------|:--------:|
| `f9_error_log` | **0** |
| `store()` failures | **0** (nunca invocado) |
| Errores en pipeline operacional | **0** |

### 5.2 Logs de aprendizaje (sistema F4/F9)

| Tabla | Registros |
|-------|:---------:|
| `learning_weights` | 3 (solo métricas F4: escalamiento) |
| `f9_events` | **0** |
| `decision_log` | **0** |
| `conversion_outcomes` | **0** |
| `conversation_events` | **0** |
| `conversation_f4_log` | **0** |

Esto indica que el sistema de aprendizaje operacional (F4) tiene actividad mínima, y el sistema cognitivo (F9) no ha registrado eventos.

### 5.3 Feature Flag

| Flag | Estado en producción |
|------|:-------------------:|
| `COGNITIVE_MEMORY_ENABLED` | **NO CONFIGURADO** (default `false`) |
| `EVIDENCE_SHADOW_MODE` | **NO VERIFICABLE desde DB** |

La ausencia del flag es la explicación más parsimoniosa para los 0 snapshots.

### 5.4 Rollback

No aplica — Memory nunca fue activada.

---

## 6. Shadow Mode — Verificación

### 6.1 Impacto en respuestas conversacionales

**Ninguna respuesta fue alterada.** El asistente respondió 232 mensajes sin intervención de Memory. Esto es consistente con el diseño: Memory se ejecuta después del EE y antes del pipeline operacional, pero ambas guardas (`isMemoryShadowModeEnabled` y `shadowResult?.isComplete`) impidieron su ejecución.

### 6.2 Impacto en comportamiento operacional

**Ningún comportamiento cambió.** Las 223 conversaciones fluyeron por el pipeline estándar (CORE → Conversation Interpreter → Policies → Response), con una distribución de estados de sesión esperable:

| Estado de sesión | Conversaciones |
|------------------|:--------------:|
| `slot_confirmation` | 2 |
| `idle` | 1 |
| Sin estado registrado | ~220 |

La gran mayoría de las conversaciones son consultas cortas (1-2 intercambios) que no alcanzan estados avanzados de recolección de slots.

### 6.3 Aislamiento del Evidence Engine

El EE no se verificó directamente, pero la ausencia de errores y la operación normal del bot sugieren que `runShadowCognition()` (si se ejecuta) no afecta al pipeline.

---

## 7. Métricas completas

| Métrica | Valor | Tipo |
|---------|:-----:|:----:|
| **TRÁFICO** | | |
| Conversaciones totales | 223 | Volumen |
| Teléfonos únicos | 223 | Volumen |
| Mensajes totales | 268 | Volumen |
| Asistente / Usuario | 232 / 36 | Proporción |
| Conversaciones últimas 30 min | 7 | Actividad |
| **MEMORY** | | |
| Snapshots creados | **0** | ❌ |
| Snapshots con isComplete | **0** | ❌ |
| Tabla existe | Sí | ✅ |
| Errores de store() | 0 | ✅ |
| **CALIDAD** | | |
| Duplicados | 0 | ✅ |
| memory_id vacío | 0 | ✅ |
| belief_id vacío | 0 | ✅ |
| decision_id vacío | 0 | ✅ |
| **RENDIMIENTO** | | |
| Latencia store() | N/A | Sin datos |
| **OBSERVABILIDAD** | | |
| Errores en f9_error_log | 0 | ✅ |
| Eventos F9 | 0 | Sin actividad |
| Decisiones registradas | 0 | Sin actividad |
| Conversiones registradas | 0 | Sin actividad |

---

## 8. Hallazgos

| ID | Severidad | Hallazgo |
|:--:|:---------:|----------|
| F-01 | 🔴 **BLOQUEANTE** | **Memory no ha creado ningún snapshot.** 223 conversaciones procesadas, 0 snapshots. La causa más probable es que `COGNITIVE_MEMORY_ENABLED` nunca fue configurado como `true` en producción. |
| F-02 | 🟡 **MEDIA** | **No hay evidencia de que `EVIDENCE_SHADOW_MODE` esté habilitado.** Sin el EE en Shadow Mode, `shadowResult` es siempre `null` y Memory no puede persistir aunque el flag esté activo. |
| F-03 | 🔵 **BAJA** | **Las conversaciones son predominantemente cortas** (1.2 mensajes promedio). Esto limita la señal disponible para el EE, incluso si estuviera habilitado. |
| F-04 | 🟢 **INFORMATIVO** | **El Shadow Mode de Memory funciona correctamente.** Con el flag desactivado, Memory no afecta el pipeline, no genera errores, y no consume recursos. |
| F-05 | 🟢 **INFORMATIVO** | **El pipeline operacional responde normalmente.** 232 respuestas del asistente enviadas sin interferencia del módulo cognitivo. |
| F-06 | 🟢 **INFORMATIVO** | **La tabla existe y tiene el schema correcto.** Cuando se active Memory, los datos se persistirán sin necesidad de cambios de infraestructura. |

---

## 9. Respuesta a la pregunta central

> **¿Existe evidencia empírica suficiente para afirmar que la primera capa cognitiva de AITOS funciona correctamente en producción?**

**No.** La evidencia es concluyente pero negativa: Memory está estructuralmente presente (tabla, código, módulos) pero **nunca se ejecutó**. El flag `COGNITIVE_MEMORY_ENABLED` no fue habilitado.

Lo que SÍ se demostró empíricamente:
- ✅ El pipeline operacional funciona con tráfico real (223 conversaciones)
- ✅ La tabla de snapshots existe en la DB de producción
- ✅ El Shadow Mode es inocuo cuando está desactivado (0 errores, 0 impacto)
- ✅ La infraestructura de persistencia está lista

Lo que NO se pudo demostrar:
- ❌ Que `store()` persiste snapshots correctamente
- ❌ Que `turnNumber` es monotónico en secuencias reales
- ❌ Que la latencia de `store()` es aceptable
- ❌ Que el acoplamiento con el EE produce datos coherentes

---

## 10. Recomendación

| # | Acción | Prioridad |
|:-:|--------|:---------:|
| 1 | **Configurar `COGNITIVE_MEMORY_ENABLED=true` en producción o staging** | Inmediata |
| 2 | **Configurar `EVIDENCE_SHADOW_MODE=true` en el mismo entorno** | Inmediata |
| 3 | **Procesar 10-20 conversaciones reales con ambos flags activados** | Inmediata |
| 4 | **Re-ejecutar FCER-1** | Después de 3 |

Sin snapshots reales, no es posible validar empíricamente la capa cognitiva.

---

## Veredicto

### ADDITIONAL OPERATIONAL EVIDENCE REQUIRED

**Fundamento:** La tabla `cognitive_memory_snapshots` contiene **0 filas** tras 223 conversaciones procesadas. Memory nunca fue activada porque `COGNITIVE_MEMORY_ENABLED` no está configurado como `true` en el entorno de producción. Sin snapshots, no es posible evaluar persistencia, calidad, rendimiento, ni integridad del pipeline cognitivo.

**Próximo paso inmediato:** Activar `COGNITIVE_MEMORY_ENABLED=true` (y `EVIDENCE_SHADOW_MODE=true` si corresponde) en el entorno, procesar tráfico real, y re-ejecutar este informe.

---

*Fin de FCER-1 — First Cognitive Evidence Report*
