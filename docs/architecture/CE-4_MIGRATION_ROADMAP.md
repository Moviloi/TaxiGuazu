# CE-4 — Roadmap de Migración hacia la Arquitectura Cognitiva

> **Fecha:** 2026-07-15  
> **Driver:** Diseñar el roadmap oficial de migración desde la arquitectura actual hacia la arquitectura cognitiva basada en Business Knowledge Engine, Deterministic Reasoning Layer, y Escalamiento Cognitivo  
> **Rol:** Arquitecto Principal  
> **Prerrequisitos:** CE-1 (baseline), CE-2 (clasificación), CE-3A (BKE), CE-3B (DRL)  
> **Documentos relacionados:** CE-1 a CE-3B completos  

---

## Preámbulo

Este documento define el roadmap de migración desde la arquitectura actual de TaxiGuazú (documentada en CE-1) hacia la arquitectura cognitiva objetivo (diseñada en CE-3A y CE-3B), basada en tres niveles de inteligencia:

```
Nivel 2: LLM (Groq → Gemini → fallback)
Nivel 1: Deterministic Reasoning Layer (reglas determinísticas)
Nivel 0: Business Knowledge Engine (conocimiento del dominio)
```

El roadmap es **incremental** (cada fase agrega una capacidad), **reversible** (cada fase tiene feature flag), y **verificable** (cada fase tiene criterios de aceptación objetivos).

**No se modifica código. No se implementan componentes. No se definen PRs.** Este documento es el plan oficial de migración para la Serie CE.

---

## 1. Principios de Migración

### P1 — Preservar comportamiento observable

Toda fase debe mantener el comportamiento visible al usuario. El usuario no debe notar diferencias en las respuestas del sistema, excepto para mejoras de calidad (respuestas más rápidas en LLM, o respuestas donde antes no había ninguna cuando LLM fallaba).

**Verificación:** comparación de respuestas del sistema antes/después para el mismo input, usando los mismos templates y políticas.

### P2 — Mantener compatibilidad con contratos existentes

Ningún cambio puede romper los contratos entre capas documentados en `ael/constitution/CONTRACTS.md` y la arquitectura actual. Las nuevas capas (BKE, DRL) se insertan como consumidores/proveedores de datos, no como reemplazos de los contratos existentes.

### P3 — No degradar UX

Las fases pueden agregar latencia (consulta BKE antes de LLM) pero no pueden aumentar el tiempo de respuesta más allá de un umbral aceptable (definido por fase). Las fases no pueden reducir la calidad de las respuestas (el LLM siempre está como fallback cuando BKE+DRL no alcanzan).

### P4 — Minimizar riesgo

Cada fase debe comenzar con la ruta nueva como **intento** (probar y degradar) y no como reemplazo directo. Solo después de verificar la nueva ruta, se convierte en el camino primario.

### P5 — Permitir rollback

Toda fase debe tener un interruptor (feature flag) que permita volver al comportamiento anterior sin despliegue de código. El rollback debe ser instantáneo (sin migración de datos, sin reinicio).

### P6 — Mantener cobertura de tests

Ninguna fase puede reducir la cobertura de tests existente. Las nuevas capas deben tener tests unitarios (reglas DRL) y tests de integración (BKE → fuentes de verdad). Los tests del pipeline actual deben seguir pasando con las nuevas capas desactivadas.

---

## 2. Etapas de Migración

### Fase 0 — Infraestructura (Preparación)

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Establecer las estructuras base de BKE y DRL en el código sin afectar el comportamiento actual. Definir interfaces, feature flags, y mecanismos de consulta |
| **Alcance** | Creación de directorios, interfaces conceptuales (sin implementación completa), sistema de feature flags, estructura de consultas BKE vacías (retornan null → se ignora BKE) |
| **Componentes involucrados** | Ningún orquestador existente se modifica. Se agregan archivos nuevos: `src/lib/bke/`, `src/lib/drl/`, `src/config/feature-flags.ts` |
| **Dependencias** | Ninguna (es código nuevo sin integración) |
| **Precondiciones** | CE-3A y CE-3B aprobados como diseños arquitectónicos |
| **Criterio de finalización** | Feature flags `bke.enabled`, `drl.enabled` existen y están en `false` por defecto. Consultas BKE retornan `null` sin error. Tests unitarios de estructura base pasan |
| **Riesgo técnico** | Bajo |
| **Feature flag** | `bke.enabled=false`, `drl.enabled=false` |

### Fase 1 — BKE Geo + DRL Desambiguación (Reemplazo C3)

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Implementar el dominio geográfico del BKE (lugares, alias, zonas, proximidad) y reemplazar la llamada LLM C3 (interpretAmbiguity) con consultas al BKE + reglas de desambiguación en DRL. La desambiguación geográfica ya no requiere LLM |
| **Alcance** | 1. BKE.geo: `resolverLugar(texto, contexto)`, `resolverAlias(texto)`, `desambiguarLugar(termino, candidatos, contexto)`, `calcularProximidad(origen, destino)` — consume `searchPlaces()`, `findPlaceByAlias()`, `location-resolver.ts` (PAIR_BASE) |
| | 2. DRL.desambiguación: reglas de scoring basadas en proximidad de zonas, relevancia turística, idioma, risk nodes. Produce selección de candidato con score o `null` si no puede resolver |
| | 3. `ambiguity-handler.ts` modificado: primero consulta BKE.DRL; si retorna selección → OK; si retorna null → fallback a C3 (LLM) |
| **Componentes involucrados** | BKE.geo, DRL.desambiguación, `ambiguity-handler.ts` (O2 — modificación orquestador), `ambiguity-interpreter.ts` (C3 — solo como fallback) |
| **Dependencias** | Fase 0 completa (interfaces BKE, DRL, feature flags) |
| **Precondiciones** | Tests de BKE.geo cubren todos los casos de desambiguación documentados en CE-3A (PAIR_BASE, risk nodes, scores) |
| **Criterio de finalización** | `bke_geo_enabled=true` en staging: C3 se llama 0 veces durante 100 sesiones de prueba con ambigüedad. `bke_geo_enabled=true` en producción: C3 se reduce >90% respecto al baseline de CE-1. Las respuestas de desambiguación son equivalentes o mejores que con LLM |
| **Feature flag** | `bke.geo.enabled=false` → activación gradual |

### Fase 2 — BKE Mensajes + DRL Clasificación (Simplificación C4, C6)

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Implementar el dominio de mensajes del BKE (templates, i18n, disambiguation) y las reglas de clasificación de la DRL (tipo de mensaje, completitud de slots). Las llamadas C4 (generateReinterpretResponse) y C6 (generateContextualRecovery) se simplifican: BKE intenta primero, LLM solo si BKE no puede |
| **Alcance** | 1. BKE.message: `obtenerMensaje(clave, lang, contexto)`, `obtenerTemplateDesambiguacion(contexto, tono, lang)` — consume `catalog.ts`, `disambiguation-templates.ts`, `response-builder.ts` |
| | 2. DRL.completitud: reglas para determinar campos faltantes basadas en domain profiles + slots actuales |
| | 3. DRL.clasificación: reglas para clasificar tipo de mensaje (afirmación, negación, corrección, consulta) basadas en patrones + entidades BKE |
| | 4. `comprehension-runner.ts` modificado: en estados RECOVERY y ESCALATION, primero consulta BKE.getMessage + DRL.clasificación; si es suficiente → responde con template; si no → LLM |
| **Componentes involucrados** | BKE.message, DRL.completitud, DRL.clasificación, `comprehension-runner.ts` (O4 — modificación), `comprehension.ts` (C6 — solo fallback), `handler.ts` (C2 — nuevo path de template) |
| **Dependencias** | Fase 1 completa (BKE.geo ya operativo, risk nodes disponibles) |
| **Precondiciones** | Tests de DRL.clasificación cubren todas las categorías de `conversation-interpreter.ts`. Tests de BKE.message verifican que los 89 templates i18n son accesibles |
| **Criterio de finalización** | `drl_comprehension_enabled=true` en staging: C4 y C6 se llaman 0 veces durante 100 sesiones de prueba con comprensión baja. `drl_comprehension_enabled=true` en producción: C4 y C6 se reducen >80%. Las respuestas de comprensión son funcionalmente equivalentes |
| **Feature flag** | `drl.comprehension.enabled=false` → activación gradual |

### Fase 3 — BKE Extracción + DRL Suficiencia (Asistencia C1, C2, C5)

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Implementar el dominio de entidades del BKE y las reglas de suficiencia de la DRL. Las llamadas LLM clasificadas como A reciben contexto enriquecido del BKE (prompts más cortos, mejor calidad), y la DRL decide si realmente necesitan LLM o si BKE es suficiente |
| **Alcance** | 1. BKE.entity: `extraerUbicaciones(texto)`, `identificarEntidades(texto)`, `resolverEntidad(texto)` — consume `entity-catalog.ts`, `regex-extractor.ts`, `entity-extractor.ts` |
| | 2. BKE.pricing: `obtenerTarifa(origen, destino, pax)`, `obtenerTour(origen, destino, tipo, pax)` — consume `pricing-engine.ts`, `tour-resolver.ts` |
| | 3. DRL.suficiencia: reglas para decidir si BKE + contexto actual son suficientes para responder sin LLM. Produce `DRLDecision { decision: "SUFFICIENT" \| "ESCALATE" \| "CLARIFY" }` |
| | 4. `handler.ts` modificado: DRL.suficiencia() se consulta antes de skipLLM. Si decisión es SUFFICIENT → BKE.getMessage; si ESCALATE → generateLLMResponse con contexto enriquecido (prompts más cortos porque el conocimiento del dominio ya no está en el prompt, viene del BKE) |
| | 5. `extract-slots.ts` modificado: datos de BKE.entity se inyectan como contexto previo a C1, reduciendo la variabilidad que el LLM debe cubrir |
| **Componentes involucrados** | BKE.entity, BKE.pricing (ya existe como lógica, se encapsula), DRL.suficiencia, `handler.ts` (O1 — modificación), `extract-slots.ts` (O3 — modificación), `extraction-runner.ts` (O5 — sin cambios) |
| **Dependencias** | Fase 2 completa (BKE.message + DRL.completitud ya operativos) |
| **Precondiciones** | Tests de DRL.suficiencia verifican que las decisiones de escalamiento coinciden con el comportamiento actual (no regresiones). Tests de BKE.entity cubren todos los patrones de entity-catalog |
| **Criterio de finalización** | `bke_extraction_enabled=true` en staging: C1 se llama con prompts 40% más cortos (el conocimiento de entidades ya no está en el prompt, viene del BKE). C2 se llama con contexto enriquecido. La tasa de éxito de extracción no disminuye vs baseline |
| **Feature flag** | `bke.extraction.enabled=false` → activación gradual |

### Fase 4 — Escalamiento Completo (Activación del Stack)

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Activar el stack completo de escalamiento cognitivo: BKE → DRL → LLM fallback. El camino primario es BKE + DRL. El LLM es solo para los casos que ninguna de las capas determinísticas puede resolver |
| **Alcance** | 1. Feature flag maestro `cognitive_stack.enabled` — cuando está en `true`, el pipeline completo sigue el flujo BKE → DRL → LLM (Groq → Gemini → fallback) |
| | 2. Todos los orquestadores (O1-O5) ya modificados en fases anteriores operan en modo activo |
| | 3. Logging de niveles: cada decisión registra qué nivel resolvió (BKE, DRL, Groq, Gemini, fallback) y la razón |
| | 4. Métricas de escalamiento: % de requests resueltos en cada nivel, tiempo por nivel, tasa de fallback |
| | 5. Desactivación del modo legacy: cuando `cognitive_stack.enabled=true`, las rutas directas a LLM se desactivan. El LLM solo se alcanza via decisión de DRL |
| **Componentes involucrados** | Todos: BKE (todos los dominios), DRL (todas las familias), orquestadores (O1-O5), providers LLM (P1-P3), sistema de logging y métricas |
| **Dependencias** | Fases 1, 2, 3 completas y verificadas individualmente en producción |
| **Precondiciones** | Cada feature flag de fase anterior ha estado en `true` en producción por al menos 7 días sin incidentes. Las métricas de cada fase muestran mejora respecto al baseline CE-1 |
| **Criterio de finalización** | `cognitive_stack.enabled=true` en producción: 100% de las requests pasan por BKE + DRL antes de LLM. Las llamadas LLM se reducen 60-80% respecto al baseline CE-1. El tiempo de respuesta promedio no aumenta más de 10% (la latencia de BKE + DRL se compensa con menos llamadas LLM). Sin regresiones en tasa de éxito conversacional |
| **Feature flag** | `cognitive_stack.enabled=false` → activación gradual con ramping 1%-5%-20%-50%-100% |

---

## 3. Orden de Migración

### 3.1 Justificación técnica del orden

El orden de migración sigue la clasificación de inevitabilidad de CE-2:

**Primero: elementos C (Reemplazables) — Fase 1**

C3 (interpretAmbiguity) es el único punto clasificado como C. Se migra primero porque:

1. **Aislamiento**: C3 es la llamada más independiente. Opera en `ambiguity-handler.ts` (O2) como un paso autocontenido del pipeline. No tiene dependencias de otras llamadas LLM. Puede reemplazarse sin afectar el resto del sistema.

2. **Alto impacto**: C3 representa el 40% del máximo teórico de llamadas LLM por mensaje (4 de 10). Reemplazarlo produce la mayor reducción inmediata del presupuesto cognitivo.

3. **Bajo riesgo de regresión**: El BKE para desambiguación geo ya tiene toda la lógica existente en `location-resolver.ts` (PAIR_BASE, risk nodes, corridor bonus, border penalty). No se crea lógica nueva, solo se encapsula la existente.

4. **Datos completos**: El dominio geo es el mejor documentado del sistema (lugares en Turso, alias, zonas, scores, riesgo nodes en código).

**Segundo: elementos B (Simplificables) — Fase 2**

C4 y C6 son clasificadas como B. Se migran después de C3 porque:

1. **Dependencia de contexto**: C4 y C6 operan en el componente Comprensión, que depende de que la extracción y desambiguación (C3) hayan resuelto los lugares. Con el BKE geo operativo, el contexto disponible para comprensión es más rico.

2. **Bajo riesgo**: Ambas tienen fallback LLM. Si BKE+DRL no pueden resolver, el LLM responde como hoy. No hay degradación de UX.

3. **Reducción de latencia**: C4 (150 tokens, 0.4 temp) y C6 (80 tokens, 0.3 temp) son costosos en tiempo LLM. Reemplazarlos con BKE templates reduce latencia.

**Tercero: elementos A (Inevitales) — Fase 3**

C1, C2, C5 y C7 son clasificadas como A. Se migran al final porque:

1. **No se reemplazan**: Las llamadas A no se eliminan. Solo se les provee mejor contexto. El riesgo de reemplazo es nulo.

2. **Dependencia de fases previas**: Para mejorar el contexto de C1 (extractSlots), el BKE geo y BKE.entity ya deben existir (Fase 1 + Fase 2). Para mejorar el contexto de C2 (generateLLMResponse), BKE.message y DRL.suficiencia ya deben existir (Fase 2).

3. **Menor urgencia**: Las llamadas A son arquitectónicamente inevitables. No hay presión de reemplazo. La mejora es incremental.

**Cuarto: Activación completa — Fase 4**

Se activa al final porque requiere que todas las capas estén operativas y verificadas individualmente.

### 3.2 Resumen del orden

| Orden | Fase | Clasificación CE-2 | Puntos | Tipo de cambio |
|:-----:|:----:|:------------------:|:------:|----------------|
| 1° | Fase 1 | **C** (Reemplazable) | C3 | Reemplazo: BKE geo + DRL desambiguación eliminan la llamada LLM |
| 2° | Fase 2 | **B** (Simplificable) | C4, C6 | Simplificación: BKE mensajes + DRL clasificación reducen frecuencia de llamadas LLM |
| 3° | Fase 3 | **A** (Inevitable) | C1, C2, C5 | Asistencia: BKE entidades + DRL suficiencia enriquecen contexto y deciden escalamiento |
| 4° | Fase 4 | **Stack completo** | Todos | Activación: flujo BKE → DRL → LLM como camino primario |

---

## 4. Riesgo por Etapa

### 4.1 Fase 0 — Infraestructura

| Tipo de riesgo | Clasificación | Descripción |
|:--------------:|:-------------:|-------------|
| **Técnico** | 🟢 **Bajo** | Código nuevo sin integración con componentes existentes. No hay cambio en el pipeline. Los feature flags existen pero están desactivados |
| **Conversacional** | 🟢 **Bajo** | Ningún cambio en el comportamiento del bot |
| **Operativo** | 🟢 **Bajo** | No afecta depliegue, monitoreo, ni operaciones |
| **Regresión** | 🟢 **Bajo** | Sin modificación de código existente |

### 4.2 Fase 1 — BKE Geo + DRL Desambiguación

| Tipo de riesgo | Clasificación | Descripción |
|:--------------:|:-------------:|-------------|
| **Técnico** | 🟡 **Medio** | Primera fase que modifica un orquestador existente (`ambiguity-handler.ts`). El BKE debe implementar correctamente la lógica de proximidad, risk nodes, y scoring. Si el scoring no coincide con el LLM, la desambiguación puede ser incorrecta |
| **Conversacional** | 🟡 **Medio** | Si el BKE selecciona un candidato incorrecto (ej: elige Aeropuerto IGR cuando el usuario quería IGU), el usuario recibe una confirmación incorrecta. Mitigación: el LLM queda como fallback cuando BKE retorna confianza baja; la confirmación del usuario es el filtro final |
| **Operativo** | 🟢 **Bajo** | Feature flag permite rollback instantáneo. La implementación consume datos existentes (Turso, location-resolver) sin nuevas dependencias |
| **Regresión** | 🟡 **Medio** | La modificación de `ambiguity-handler.ts` podría afectar el flujo de ambigüedad incluso con BKE desactivado. Mitigación: tests de integración del flujo actual antes y después del cambio |

### 4.3 Fase 2 — BKE Mensajes + DRL Clasificación

| Tipo de riesgo | Clasificación | Descripción |
|:--------------:|:-------------:|-------------|
| **Técnico** | 🟢 **Bajo** | BKE.message consume templates existentes sin lógica nueva. DRL.clasificación implementa reglas que ya existen en `conversation-interpreter.ts` y `patterns.ts`. La lógica ya está probada |
| **Conversacional** | 🟢 **Bajo** | Si BKE+DRL no pueden clasificar correctamente, el LLM responde como fallback. El usuario no nota diferencia (la misma respuesta que recibiría hoy) |
| **Operativo** | 🟢 **Bajo** | Feature flag permite rollback. Las nuevas reglas DRL son funciones puras sin IO |
| **Regresión** | 🟢 **Bajo** | comprehension-runner ya tiene manejo de errores robusto. Si DRL falla, cae al comportamiento actual |

### 4.4 Fase 3 — BKE Extracción + DRL Suficiencia

| Tipo de riesgo | Clasificación | Descripción |
|:--------------:|:-------------:|-------------|
| **Técnico** | 🟢 **Bajo** | BKE.entity encapsula lógica existente (entity-catalog, regex, entity-extractor). No se crean reglas nuevas. DRL.suficiencia usa umbrales existentes (CE-1: skipLLM usa purchaseIntent y EXECUTE) |
| **Conversacional** | 🟢 **Bajo** | Las llamadas A no se reemplazan, solo reciben mejor contexto. Si el contexto BKE es incorrecto, el LLM lo ignora (tiene el texto original). No hay degradación |
| **Operativo** | 🟢 **Bajo** | Los prompts LLM más cortos reducen el consumo de tokens (menor latencia, menor costo). No hay nuevas dependencias operativas |
| **Regresión** | 🟢 **Bajo** | `handler.ts` modificado: la nueva ruta (DRL.suficiencia) se consulta ANTES de la decisión actual. Si falla, se usa el comportamiento actual. No hay pérdida de funcionalidad |

### 4.5 Fase 4 — Escalamiento Completo

| Tipo de riesgo | Clasificación | Descripción |
|:--------------:|:-------------:|-------------|
| **Técnico** | 🔴 **Alto** | Cambia el camino primario de todo el pipeline. El flujo completo debe funcionar sin errores en todas las combinaciones de inputs. Es la fase más compleja técnicamente |
| **Conversacional** | 🔴 **Alto** | Si BKE+DRL no cubren correctamente algún caso conversacional, la respuesta será incorrecta sin que el LLM pueda corregirla (porque el LLM solo se llama si DRL decide escalar). Mitigación: DRL tiene sesgo a escalar (si no está segura, escala a LLM) |
| **Operativo** | 🟡 **Medio** | Las métricas de escalamiento deben operar correctamente desde el día 1. El equipo debe poder monitorear en tiempo real la tasa de escalamiento por nivel |
| **Regresión** | 🔴 **Alto** | Si la tasa de escalamiento a LLM es demasiado alta (DRL nunca decide que es suficiente), el sistema no mejora respecto al baseline. Si es demasiado baja (DRL decide que es suficiente cuando no lo es), la calidad conversacional se degrada |

### 4.6 Matriz de riesgo resumida

| Fase | Técnico | Conversacional | Operativo | Regresión | General |
|:----:|:-------:|:--------------:|:---------:|:---------:|:-------:|
| **0** | 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | 🟢 Bajo |
| **1** | 🟡 Medio | 🟡 Medio | 🟢 Bajo | 🟡 Medio | 🟡 Medio |
| **2** | 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | 🟢 Bajo |
| **3** | 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | 🟢 Bajo |
| **4** | 🔴 Alto | 🔴 Alto | 🟡 Medio | 🔴 Alto | 🔴 Alto |

---

## 5. Beneficio Esperado

### 5.1 Fase 1 — BKE Geo + DRL Desambiguación

| Métrica | Baseline CE-1 | Post-Fase 1 | Cambio |
|---------|:-------------:|:-----------:|:------:|
| **Llamadas LLM por mensaje (máximo)** | 10 | 6 | -40% |
| **Llamadas C3 por mensaje** | 0-4 | 0 (BKE resuelve) | -100% |
| **Complejidad del componente** | O2 mezcla datos + LLM | O2 usa BKE + DRL | Nuevas capas separadas |
| **Testabilidad de desambiguación** | Solo test de integración con LLM | Tests unitarios de reglas DRL | Tests sub-milisegundo |
| **Mantenibilidad** | Reglas en prompts + código hardcodeado | Reglas en DRL, datos en BKE | Reglas centralizadas |

### 5.2 Fase 2 — BKE Mensajes + DRL Clasificación

| Métrica | Baseline CE-1 | Post-Fase 2 | Cambio |
|---------|:-------------:|:-----------:|:------:|
| **Llamadas LLM por mensaje (máximo)** | 6 | 3-4 | -33-50% |
| **Llamadas C4 + C6 por mensaje** | 0-2 | 0 (BKE + DRL resuelven) | -80-100% |
| **Templates i18n accesibles** | Dispersos en 5 archivos | BKE.message unifica | Punto de acceso único |
| **Observabilidad de comprensión** | Sin registro de qué regla se activó | DRL registra razón + confianza | Rastreable |
| **Complejidad de comprehension** | 3 caminos (frustration, reinterpret, recovery) | 1 camino (DRL → BKE → fallback) | Simplificado |

### 5.3 Fase 3 — BKE Extracción + DRL Suficiencia

| Métrica | Baseline CE-1 | Post-Fase 3 | Cambio |
|---------|:-------------:|:-----------:|:------:|
| **Tamaño del prompt de extracción** | Contiene conocimiento del dominio embebido | Conocimiento inyectado vía BKE | -40% tokens |
| **Tamaño del prompt de respuesta** | Contiene datos de pricing + lugares embebidos | Datos vía BKE | -30% tokens |
| **Contexto de extracción** | Solo texto del usuario + historial | Texto + lugares pre-resueltos + entidades detectadas | Más rico |
| **Calidad de extracción** | LLM sin contexto estructurado | LLM con contexto BKE | Potencialmente mejor |

### 5.4 Fase 4 — Escalamiento Completo

| Métrica | Baseline CE-1 (Sección 7.1) | Post-Fase 4 | Cambio |
|---------|:---------------------------:|:-----------:|:------:|
| **Llamadas LLM por mensaje (máximo)** | 10 | 2-4 | **-60-80%** |
| **Llamadas LLM por mensaje (promedio)** | ~2-3 (estimado) | ~0.5-1 | **-60-80%** |
| **Dependencia de proveedores LLM** | Total: sin LLM no hay respuesta personalizada | Resiliente: BKE + DRL responden sin LLM | **Crítica → Resiliente** |
| **Escalamiento explícito** | No existe (CE-1 Sección 7.2) | Nivel 0, 1, 2 definidos | **Nueva capacidad** |
| **Conocimiento del dominio** | En prompts + código disperso | BKE lo encapsula | **Centralizado** |
| **Testabilidad de reglas de negocio** | Tests de integración lentos + no determinísticos | Tests unitarios rápidos + determinísticos | **Mejorada** |
| **Cambio de proveedor LLM** | Impacta todo el pipeline | Solo cambia la cadena de escalamiento en DRL | **Desacoplado** |

---

## 6. Métricas de Validación

### 6.1 Métricas por fase

#### Fase 0 — Infraestructura

| Indicador | Método de verificación | Criterio de aprobación |
|-----------|------------------------|------------------------|
| Feature flags existen | Verificar código | `bke.enabled` y `drl.enabled` definidos, default `false` |
| BKE retorna null sin error | Test unitario | `BKE.consultarLugar("test")` retorna `null`, no lanza |
| DRL retorna null sin error | Test unitario | `DRL.completitud({})` retorna `null`, no lanza |
| Sin impacto en pipeline | Test de integración | Pipeline actual pasa con flags en `false` y `true` |

#### Fase 1 — BKE Geo + DRL Desambiguación

| Indicador | Método de verificación | Criterio de aprobación |
|-----------|------------------------|------------------------|
| C3 no se llama con BKE activo | Conteo de invocaciones a `provider.interpretAmbiguity` | 0 llamadas durante 100 sesiones de test con ambigüedad |
| Precisión de desambiguación BKE | Comparación manual de selecciones BKE vs selecciones LLM para 50 casos históricos | >90% de coincidencia con la selección que habría hecho el LLM |
| Tasa de fallback a LLM | Métrica de escalamiento: `bke_geo_fallback_count / total_ambiguity_count` | <10% |
| Latencia de desambiguación | Tiempo promedio de BKE.desambiguarLugar() | <50ms (vs ~1000-3000ms de C3 LLM) |

#### Fase 2 — BKE Mensajes + DRL Clasificación

| Indicador | Método de verificación | Criterio de aprobación |
|-----------|------------------------|------------------------|
| C4 no se llama con DRL activo | Conteo de invocaciones a `generateReinterpretResponse` | 0 llamadas durante 100 sesiones de test con comprensión baja |
| C6 no se llama con DRL activo | Conteo de invocaciones a `generateContextualRecovery` | 0 llamadas durante 100 sesiones de test con RECOVERY |
| Precisión de clasificación DRL | Comparación `DRL.clasificacion(texto)` vs `interpretMessage(texto)` actual | >95% de coincidencia |
| Tasa de fallback a C4 + C6 | `drl_classification_fallback / total_comprehension_low` | <10% |
| Mensaje de respuesta adecuado | Usabilidad: 10 casos de prueba revisados manualmente | Respuesta BKE es adecuada para el contexto conversacional |

#### Fase 3 — BKE Extracción + DRL Suficiencia

| Indicador | Método de verificación | Criterio de aprobación |
|-----------|------------------------|------------------------|
| Reducción de tokens en prompt C1 | Comparar tamaño del prompt con/sin BKE | Reducción >30% |
| Tasa de éxito de extracción | `extractions_exitosas / total_extractions` | No disminuye vs baseline |
| Tasa de acierto de DRL.suficiencia | `suficiencia_correcta / total_suficiencia` | >90% (donde "correcta" = la decisión coincide con el skipLLM que habría tomado strategyDecision) |
| Latencia de respuesta de C2 | Tiempo promedio con contexto BKE vs sin BKE | No aumenta (tokens reducidos compensan overhead de inyección) |

#### Fase 4 — Escalamiento Completo

| Indicador | Método de verificación | Criterio de aprobación |
|-----------|------------------------|------------------------|
| Reducción total de llamadas LLM | Conteo de invocaciones a providers LLM vs baseline CE-1 | Reducción 60-80% |
| Tasa de respuesta por nivel | `requests_resueltas_en_nivel / total_requests` | Nivel 0 (BKE) >30%, Nivel 1 (DRL) >30%, Nivel 2 (LLM) <40% |
| Tiempo de respuesta promedio | Latencia total del pipeline | No aumenta más de 10% vs baseline CE-1 |
| Tasa de éxito conversacional | `conversaciones_completadas / total_conversaciones` | No disminuye vs baseline |
| Tasa de fallback total | `fallback_deterministico / total_requests` | <1% (solo cuando ambos LLM fallan) |
| Rollback exitoso | Flip feature flag a `false` | Volver al comportamiento anterior en <1 minuto, sin impacto visible |

### 6.2 Umbrales de rollback

Si cualquiera de estas condiciones se cumple, la fase debe revertirse inmediatamente:

| Condición | Umbral | Acción |
|-----------|--------|--------|
| Tasa de éxito conversacional cae | >5% de reducción respecto al período pre-fase | Rollback inmediato |
| Tasa de error en BKE o DRL | >1% de errores no controlados | Rollback inmediato |
| Latencia de respuesta aumenta | >20% respecto al período pre-fase | Rollback y optimización |
| Tasa de escalamiento a LLM incorrecta | DRL no escala cuando debería (falsos negativos) en >5% de casos | Rollback y ajuste de reglas |

---

## 7. Estrategia de Despliegue

### 7.1 Feature flags

Cada fase introduce un feature flag que controla la nueva ruta:

| Fase | Feature flag | Tipo | Default | Alcance |
|:----:|-------------|:----:|:-------:|---------|
| 0 | `bke.enabled` | Booleano | `false` | Activa/desactiva toda la capa BKE |
| 0 | `drl.enabled` | Booleano | `false` | Activa/desactiva toda la capa DRL |
| 1 | `bke.geo.enabled` | Booleano | `false` | Activa BKE.geo y reemplazo de C3 |
| 2 | `drl.comprehension.enabled` | Booleano | `false` | Activa DRL.clasificación + BKE.message |
| 3 | `bke.extraction.enabled` | Booleano | `false` | Activa BKE.entity + DRL.suficiencia |
| 4 | `cognitive_stack.enabled` | Porcentaje | `0` | Ramping 1%-5%-20%-50%-100% |

### 7.2 Despliegue gradual

Cada fase sigue el mismo patrón de despliegue:

```
Día 1-3:   Staging — tests automatizados + revisión manual
Día 3-5:   Canario — 1% de usuarios + monitoreo
Día 5-7:   Expansión — 5% → 20% → 50% → 100%
Día 7-14:  Estabilización — 100% activo, monitoreo continuo
Día 14:    Siguiente fase
```

### 7.3 Rollback

Mecanismo de rollback para cada fase:

| Fase | Rollback | Tiempo | Efecto |
|:----:|----------|:------:|--------|
| 0 | Flip `bke.enabled=false`, eliminar archivos nuevos | Instantáneo | Sin cambios visibles |
| 1 | Flip `bke.geo.enabled=false` | Instantáneo | O2 vuelve a usar LLM como antes |
| 2 | Flip `drl.comprehension.enabled=false` | Instantáneo | O4 vuelve a usar LLM como antes |
| 3 | Flip `bke.extraction.enabled=false` | Instantáneo | O1, O3 vuelven a prompts sin contexto BKE |
| 4 | Flip `cognitive_stack.enabled=false` | Instantáneo | Toda la arquitectura vuelve a pipeline original |

### 7.4 Monitoreo

Cada fase agrega las siguientes capacidades de monitoreo:

| Fase | Nueva métrica | Dashboard |
|:----:|---------------|-----------|
| 1 | `bke_geo_invocaciones`, `bke_geo_fallback`, `bke_geo_latencia` | Panel BKE Geo |
| 2 | `drl_clasificacion_invocaciones`, `drl_clasificacion_fallback`, `templates_usados` | Panel DRL Comprensión |
| 3 | `bke_entity_invocaciones`, `prompt_tokens_ahorrados`, `drl_suficiencia_decisiones` | Panel BKE Extracción |
| 4 | `nivel_resolucion {bke, drl, groq, gemini, fallback}`, `tiempo_por_nivel`, `tasa_escalamiento` | Panel Escalamiento Cognitivo |

### 7.5 Criterios para avanzar a la siguiente fase

La transición de una fase a la siguiente requiere:

1. **Métricas de la fase actual**: todos los indicadores de la sección 6 cumplen los criterios de aprobación
2. **Estabilidad de 7 días**: la fase ha estado en 100% activo en producción sin incidentes
3. **Sin regresiones conocidas**: no hay bugs abiertos que afecten la calidad conversacional atribuibles a la fase
4. **Aprobación**: revisión del equipo de los resultados de la fase

---

## 8. Estado Objetivo

### 8.1 Diagrama comparativo

```
ARQUITECTURA ACTUAL (CE-1 baseline)              ARQUITECTURA OBJETIVO (Post-Fase 4)
─────────────────────────────────────            ─────────────────────────────────────
                                                  ┌──────────────────────┐
                                                  │      USUARIO        │
                                                  └────────┬─────────────┘
                                                           │
lead.service.ts                                   lead.service.ts (orquestador puro)
  │                                                 │
  ├─ comprehension                                 ├─ comprehension
  │   ├─ C5: generateFrustrationResponse (LLM)     │   │   ├─ DRL.clasificacion(texto)
  │   ├─ C4: generateReinterpretResponse (LLM)     │   │   │   ↓
  │   └─ C6: generateContextualRecovery (LLM)      │   │   ├─ BKE.obtenerMensaje()
  │                                                 │   │   └─ ¿fallback? → C5 (LLM)
  ├─ extraction                                    │   │
  │   └─ extractSlots                              │   ├─ extraction
  │       ├─ regex-extractor                       │   │   └─ extractSlots
  │       ├─ entity-extractor                      │   │       ├─ regex-extractor
  │       └─ C1: generateGroqExtraction (LLM)      │   │       ├─ entity-extractor
  │                                                 │   │       ├─ BKE.entity (contexto)
  ├─ ambiguity                                     │   │       └─ ¿fallback? → C1 (LLM)
  │   └─ C3: interpretAmbiguity × 4 (LLM)          │   │
  │                                                 │   ├─ ambiguity
  └─ handler                                        │   │   ├─ BKE.geo.desambiguarLugar()
  │   ├─ CORE (determinístico)                     │   │   └─ ¿fallback? → C3 (LLM)
  │   ├─ ROUTER (determinístico)                   │   │
  │   └─ POLICY + C2 (LLM)                        │   └─ handler
  │                                                   │   ├─ CORE
  │                                                   │   ├─ ROUTER
  │                                                   │   ├─ DRL.suficiencia()
  │                                                   │   │   ↓
  │                                                   │   ├─ BKE.obtenerMensaje()
  │                                                   │   └─ ¿fallback? → C2 (LLM)
  │
  ┌──────────────────────┐                           ┌──────────────────────┐
  │     LLM PROVIDERS    │                           │  STACK COGNITIVO    │
  │                      │                           │                      │
  │  Groq (429 en prod)  │                           │  Nivel 0: BKE       │
  │  Gemini (sin key)    │                           │  ┌────────────────┐  │
  │  FallbackProvider    │                           │  │ resolverLugar  │  │
  └──────────────────────┘                           │  │ obtenerTarifa  │  │
                                                     │  │ obtenerMensaje │  │
                                                     │  │ clasificarTray.│  │
                                                     │  │ extraerEntidad │  │
                                                     │  └───────┬────────┘  │
                                                     │          │            │
                                                     │  Nivel 1: DRL        │
                                                     │  ┌────────────────┐  │
                                                     │  │ completitud()  │  │
                                                     │  │ consistencia() │  │
                                                     │  │ clasificacion()│  │
                                                     │  │ suficiencia()  │  │
                                                     │  │ escalamiento() │  │
                                                     │  └───────┬────────┘  │
                                                     │          │            │
                                                     │  Nivel 2: LLM        │
                                                     │  ┌────────────────┐  │
                                                     │  │ Groq → Gemini  │  │
                                                     │  │ → fallback     │  │
                                                     │  │ (solo cuando   │  │
                                                     │  │ DRL decide)    │  │
                                                     │  └────────────────┘  │
                                                     └──────────────────────┘
                                                              │
                                                     ┌────────┴────────┐
                                                     │ Fuentes de      │
                                                     │ Verdad (Turso,  │
                                                     │ Config, JSON,   │
                                                     │ Constantes)     │
                                                     └─────────────────┘
```

### 8.2 Flujo de decisión objetivo

```
1. Mensaje entrante
2. comprehension:
   a. DRL.clasificacion(texto, entidades) → tipo de mensaje
   b. Si tipo=FRUSTRATION → BKE.obtenerMensaje("frustration") → responder
   c. Si BKE no tiene mensaje → escalar a C5 (LLM)
   d. Si tipo=LOW_COMPREHENSION → BKE.obtenerMensaje("clarify") → responder
   e. Si BKE no tiene mensaje → escalar a C4/C6 (LLM)
   f. Si tipo=NORMAL → continuar

3. extraction:
   a. regex-extractor + entity-extractor + BKE.entity → slots parciales
   b. Si slots completos → OK
   c. Si slots incompletos → C1 (LLM) con contexto BKE

4. ambiguity:
   a. BKE.geo.desambiguarLugar(termino, candidatos, contexto)
   b. Si BKE retorna selección con confianza > 0.8 → OK
   c. Si BKE retorna confianza baja → C3 (LLM) como fallback

5. handler:
   a. CORE + ROUTER (sin cambios)
   b. POLICY ← DRL.completitud + DRL.consistencia
   c. DRL.suficiencia(contexto):
      - Si SUFFICIENT → BKE.obtenerMensaje() → responder
      - Si CLARIFY → BKE.obtenerMensaje("clarify.field") → responder
      - Si ESCALATE → C2 (LLM) con contexto BKE enriquecido
```

---

## 9. Conclusión

### 9.1 El roadmap de migración

La Serie CE define 5 fases de migración desde la arquitectura actual (CE-1) hacia la arquitectura cognitiva objetivo (CE-3A + CE-3B):

| Fase | ¿Qué agrega? | ¿Qué reemplaza? | Riesgo | Duración estimada |
|:----:|-------------|-----------------|:------:|:-----------------:|
| **0** | Infraestructura BKE + DRL | Nada | 🟢 Bajo | 1 sprint |
| **1** | BKE.geo + DRL.desambiguación | C3 (LLM → BKE) | 🟡 Medio | 2 sprints |
| **2** | BKE.message + DRL.clasificación | C4, C6 (LLM → BKE+DRL) | 🟢 Bajo | 2 sprints |
| **3** | BKE.entity + DRL.suficiencia | Contexto de C1, C2, C5 | 🟢 Bajo | 2 sprints |
| **4** | Stack completo activo | Pipeline completo | 🔴 Alto | 2 sprints |

**Duración total estimada:** 9 sprints (~9 semanas).

### 9.2 Principios cumplidos

El roadmap cumple con los principios definidos en la sección 1:

| Principio | Cómo se cumple |
|-----------|----------------|
| **Preservar comportamiento observable** | El LLM siempre está como fallback en cada fase. El usuario nunca recibe una respuesta peor que la actual |
| **Mantener compatibilidad con contratos** | Las nuevas capas se insertan como consumidores/proveedores, no modifican los contratos entre capas existentes |
| **No degradar UX** | BKE + DRL responden en <50ms vs 1000-3000ms de LLM. Si fallan, el LLM responde como hoy |
| **Minimizar riesgo** | Cada fase comienza como intento antes de ser el camino primario. Solo la Fase 4 tiene riesgo alto |
| **Permitir rollback** | Todas las fases tienen feature flag. Rollback instantáneo sin despliegue |
| **Mantener cobertura de tests** | Las nuevas capas (DRL) son funciones puras, altamente testeables. Los tests del pipeline actual siguen pasando |

### 9.3 Reducción esperada vs baseline CE-1

| Métrica | CE-1 (baseline) | CE-4 (objetivo) | Reducción |
|---------|:---------------:|:---------------:|:---------:|
| Máximo de llamadas LLM por mensaje | 10 | 2-4 | **60-80%** |
| Dependencia de proveedores LLM | Total | Resiliente (BKE+DRL operan sin LLM) | **Estructural** |
| Puntos de consumo LLM | 7 (C1-C7) | 4 (solo A, asistidos) | **43%** |
| Conocimiento del dominio | Disperso en 20+ archivos | Encapsulado en BKE + DRL | **Centralizado** |
| Escalamiento de inteligencia | No existe | 3 niveles explícitos | **Nueva capacidad** |

### 9.4 Preparación para CE-5

Con CE-4 completado, la Serie CE ha establecido:

1. **CE-1**: Línea base del consumo cognitivo actual (qué tenemos)
2. **CE-2**: Clasificación de inevitabilidad arquitectónica (qué podemos cambiar)
3. **CE-3A**: Diseño del Business Knowledge Engine (capa de conocimiento)
4. **CE-3B**: Diseño de la Deterministic Reasoning Layer (capa de decisión)
5. **CE-4**: Roadmap de migración (cómo llegar)

La siguiente etapa (CE-5) será la **implementación** de la Fase 0 (infraestructura), comenzando con la creación de las estructuras base del BKE y DRL, los feature flags, y los primeros tests unitarios de las familias de reglas.

---

*Fin de CE-4 — Roadmap de Migración hacia la Arquitectura Cognitiva. Este documento constituye el plan oficial de migración de la Serie CE y la entrada para CE-5 (Implementación).*
