# CE-5 PRE — Implementation Readiness Audit

> **Fecha:** 2026-07-15
> **Driver:** Determinar si el proyecto está preparado técnicamente para iniciar la implementación de la Serie CE (Fase 0 del roadmap CE-4)
> **Prerrequisitos confirmados:** CE-1, CE-2, CE-3A, CE-3B, CE-4, ADR-012 ✅
> **Rol:** Arquitecto Principal
> **Tipo:** Auditoría de preparación — no modifica código, no inicia implementación
> **Estado:** HISTÓRICO — Readiness previo a implementación de la Serie CE. La implementación fue ejecutada (PR-5A a PR-5G) y luego removida por ADR-014 (2026-07-20) por higiene. Principio de escalamiento cognitivo preservado como diseño conceptual. Este documento se conserva como registro de auditoría y trazabilidad histórica.

---

1. [Inventario de componentes afectados](#1-inventario-de-componentes-afectados)
2. [Contratos que deben preservarse](#2-contratos-que-deben-preservarse)
3. [Riesgos de implementación](#3-riesgos-de-implementación)
4. [Orden óptimo de implementación](#4-orden-óptimo-de-implementación)
5. [Estrategia de validación](#5-estrategia-de-validación)
6. [Criterios de Go / No-Go](#6-criterios-de-go--no-go)

---

## 1. Inventario de componentes afectados

### 1.1 Fase 0 — Infraestructura (Preparación)

**Objetivo:** Crear las estructuras base de BKE y DRL sin afectar el comportamiento actual.

#### Archivos a crear

| Archivo propuesto | Propósito | Dependencias | Tamaño estimado |
|-------------------|-----------|--------------|-----------------|
| `src/lib/bke/index.ts` | Re-export público del BKE | Ninguna (nuevo) | ~10 líneas |
| `src/lib/bke/types.ts` | Tipos del BKE (dominios, consultas, resultados) | Ninguna | ~80 líneas |
| `src/lib/bke/bke-engine.ts` | Orquestador BKE — router de dominios | `types.ts`, fuentes de verdad | ~50 líneas |
| `src/lib/bke/domains/geo.ts` | Dominio geográfico (stub) | `types.ts` | ~20 líneas |
| `src/lib/bke/domains/message.ts` | Dominio de mensajes (stub) | `types.ts` | ~20 líneas |
| `src/lib/bke/domains/entity.ts` | Dominio de entidades (stub) | `types.ts` | ~20 líneas |
| `src/lib/bke/domains/pricing.ts` | Dominio de tarifas (stub) | `types.ts` | ~20 líneas |
| `src/lib/drl/index.ts` | Re-export público del DRL | Ninguna (nuevo) | ~10 líneas |
| `src/lib/drl/types.ts` | Tipos del DRL (reglas, decisiones, resultados) | Ninguna | ~60 líneas |
| `src/lib/drl/drl-engine.ts` | Orquestador DRL — aplica reglas | `types.ts`, posiblemente `bke/types.ts` | ~50 líneas |
| `src/lib/drl/rules/completitud.ts` | Regla de completitud (stub) | `types.ts` | ~20 líneas |
| `src/lib/drl/rules/clasificacion.ts` | Regla de clasificación (stub) | `types.ts` | ~20 líneas |
| `src/lib/drl/rules/suficiencia.ts` | Regla de suficiencia (stub) | `types.ts` | ~20 líneas |
| `src/lib/drl/rules/consistencia.ts` | Regla de consistencia (stub) | `types.ts` | ~20 líneas |
| `src/lib/drl/rules/escalamiento.ts` | Regla de escalamiento (stub) | `types.ts` | ~20 líneas |
| `src/config/feature-flags.ts` | Feature flags del stack cognitivo | Ninguna | ~30 líneas |

**Total archivos a crear:** ~16 archivos
**Tamaño total estimado:** ~450 líneas (todo stubs + tipos)

#### Archivos existentes que NO se modifican (pero son referencias)

| Archivo | Rol en la Fase 0 |
|---------|------------------|
| `src/config/env.ts` | Referencia para nuevos feature flags |
| `src/config/constants.ts` | Referencia para constantes existentes |
| `src/lib/ai/llm-provider.ts` | Referencia de patrón de interfaz (para diseñar BKE/DRL types) |
| `ael/constitution/CONTRACTS.md` | Referencia de contratos a preservar |

#### Dependencias entre archivos nuevos

```
feature-flags.ts        (independiente)
    │
bke/types.ts            (independiente — define tipos base)
    │
drl/types.ts            (puede importar bke/types.ts o ser independiente)
    │
bke/domains/*.ts        (importan bke/types.ts)
bke/bke-engine.ts       (importa bke/types.ts + bke/domains/*)
    │
drl/rules/*.ts          (importan drl/types.ts)
drl/drl-engine.ts       (importa drl/types.ts + drl/rules/* + bke/types.ts)
    │
bke/index.ts            (re-exporta bke-engine.ts)
drl/index.ts            (re-exporta drl-engine.ts)
```

---

### 1.2 Fase 1 — BKE Geo + DRL Desambiguación (Reemplazo C3)

#### Archivos que se modifican

| Archivo | Cambio propuesto | Líneas actuales | Riesgo |
|---------|------------------|:----------------:|:------:|
| `src/lib/services/workflow/ambiguity-handler.ts` | Insertar consulta BKE.geo + DRL.desambiguación antes de C3; C3 como fallback | ~200 | 🟡 Medio |
| `src/lib/bke/domains/geo.ts` | Implementar `resolverLugar()`, `resolverAlias()`, `desambiguarLugar()`, `calcularProximidad()` | stub→~150 | 🟢 Bajo |
| `src/lib/bke/bke-engine.ts` | Conectar dominio geo al router | ~50→~60 | 🟢 Bajo |
| `src/lib/drl/rules/escalamiento.ts` | Implementar reglas de scoring de desambiguación | stub→~80 | 🟡 Medio |

#### Archivos existentes que la BKE Geo consume directamente

| Archivo | Función a consumir | Tipo de consumo |
|---------|-------------------|-----------------|
| `src/lib/db/domains/geo.ts` | `searchPlaces()`, `findPlaceByName()`, `findPlaceByAlias()` | DB query (Turso) |
| `src/lib/services/geo/location-resolver.ts` | `resolveLocation()`, `classifyTripLeg()`, PAIR_BASE matrix | Lógica pura + DB query |
| `src/lib/services/extraction/regex-extractor.ts` | `parseRouteFromText()` | Regex puro |
| `src/lib/services/extraction/entity-extractor.ts` | Airport codes, hotel/POI detection | Regex puro + DB |
| `src/config/entity-catalog.ts` | `resolveEntityFromCatalog()` | Regex puro |

**Ninguno de estos archivos se modifica.** La BKE los consume pero no los altera.

#### Archivos que permanecen como fallback (sin cambios)

| Archivo | Rol post-Fase 1 |
|---------|-----------------|
| `src/lib/ai/ambiguity-interpreter.ts` | Fallback C3 — solo se llama si DRL devuelve null |
| `src/lib/ai/providers/groq-provider.ts` | Proveedor para C3 cuando es necesario |
| `src/lib/ai/providers/gemini-provider.ts` | Proveedor para C3 cuando es necesario |

---

### 1.3 Fase 2 — BKE Mensajes + DRL Clasificación (Simplificación C4, C6)

#### Archivos que se modifican

| Archivo | Cambio propuesto | Líneas actuales | Riesgo |
|---------|------------------|:----------------:|:------:|
| `src/lib/services/extraction/comprehension-runner.ts` | Agregar ruta DRL.clasificación+BKE.message en ESCALATION/RECOVERY; LLM como fallback | ~250 | 🟡 Medio |
| `src/lib/services/extraction/comprehension.ts` | `getRecoveryMessage()` — intentar BKE.getMessage primero | ~260 | 🟢 Bajo |
| `src/lib/bke/domains/message.ts` | Implementar `obtenerMensaje()`, `obtenerTemplateDesambiguacion()` | stub→~120 | 🟢 Bajo |
| `src/lib/drl/rules/clasificacion.ts` | Implementar reglas de clasificación de mensaje | stub→~80 | 🟢 Bajo |
| `src/lib/drl/rules/completitud.ts` | Implementar reglas de completitud de slots | stub→~60 | 🟢 Bajo |

#### Archivos existentes que la BKE Message consume

| Archivo | Función a consumir | Tipo de consumo |
|---------|-------------------|-----------------|
| `src/lib/services/i18n/catalog.ts` | `t()` o similar (89 entradas en 3 idiomas) | Llamada a función |
| Templates de desambiguación | `disambiguation-templates.ts` (si existe) o sus contenidos | Constantes |
| `src/lib/ai/response-builder.ts` | Builders de respuesta existentes | Llamada a función |

#### Archivos que permanecen como fallback (sin cambios)

| Archivo | Rol post-Fase 2 |
|---------|-----------------|
| comprehension-runner.ts (`generateReinterpretResponse`) | Fallback C4 |
| comprehension.ts (`generateContextualRecovery`) | Fallback C6 |

---

### 1.4 Fase 3 — BKE Extracción + DRL Suficiencia (Asistencia C1, C2, C5)

#### Archivos que se modifican

| Archivo | Cambio propuesto | Líneas actuales | Riesgo |
|---------|------------------|:----------------:|:------:|
| `src/lib/ai/handler.ts` | Insertar DRL.suficiencia() antes de skipLLM; contexto enriquecido via BKE | ~180 | 🟡 Medio |
| `src/lib/services/extraction/extract-slots.ts` | Inyectar BKE.entity como contexto previo a C1 | ~200 | 🟢 Bajo |
| `src/lib/bke/domains/entity.ts` | Implementar `extraerUbicaciones()`, `identificarEntidades()`, `resolverEntidad()` | stub→~120 | 🟢 Bajo |
| `src/lib/bke/domains/pricing.ts` | Implementar `obtenerTarifa()`, `obtenerTour()` | stub→~80 | 🟢 Bajo |
| `src/lib/drl/rules/suficiencia.ts` | Implementar reglas de suficiencia | stub→~100 | 🟡 Medio |

#### Archivos existentes que la BKE Entity consume

| Archivo | Función a consumir | Tipo de consumo |
|---------|-------------------|-----------------|
| `src/lib/services/extraction/entity-extractor.ts` | `entityExtractSlots()` | DB + regex |
| `src/lib/services/extraction/regex-extractor.ts` | `regexExtractSlots()` | Regex puro |
| `src/config/entity-catalog.ts` | `resolveEntityFromCatalog()`, `extractEntitiesFromCatalog()` | Regex puro |
| `src/lib/services/geo/location-resolver.ts` | `resolveLocation()`, `resolveLocationToPlaceId()` | DB + alias |
| `src/lib/services/pricing/tariff-repository.ts` | Consultas de tarifa | DB query |
| `src/lib/services/pricing/commercial-pricing-engine.ts` | Lógica de pricing comercial | Lógica pura |
| `src/lib/services/pricing/tour-resolver.ts` | Resolución de tours | DB + lógica |

---

### 1.5 Fase 4 — Escalamiento Completo (Activación del Stack)

#### Archivos que se modifican

| Archivo | Cambio propuesto | Líneas actuales | Riesgo |
|---------|------------------|:----------------:|:------:|
| `src/lib/services/lead.service.ts` | Insertar `cognitiveStack.escalate()` como paso central del pipeline | ~300 | 🔴 Alto |
| `src/lib/ai/handler.ts` | Conectar DRL output a StrategyDecision para skipLLM | ~180 | 🟡 Medio |
| `src/lib/drl/rules/escalamiento.ts` | Implementar cadena completa BKE→DRL→Groq→Gemini→fallback | ~80→~120 | 🔴 Alto |
| Sistema de logging | Agregar logging por nivel de resolución | (nuevo o existente) | 🟢 Bajo |
| Sistema de métricas | Agregar métricas de escalamiento (count, latencia, % por nivel) | (nuevo) | 🟢 Bajo |

---

## 2. Contratos que deben preservarse

### 2.1 Contratos entre capas (R1 — AEL)

| Contrato | Descripción | Archivos involucrados | Cómo se preserva en CE-5 |
|-----------|-------------|-----------------------|--------------------------|
| **AI ↔ Services** | AI no importa de Services (excepto types) | `src/lib/ai/*.ts`, `src/lib/services/*.ts` | BKE y DRL viven en su propio directorio (`src/lib/bke/`, `src/lib/drl/`), NO dentro de AI ni Services. Los orquestadores modificados (ambiguity-handler, comprehension-runner, handler, extract-slots) ya están en Services — consumen BKE/DRL desde ahí, no al revés |
| **DRL → BKE** | DRL consume BKE, nunca al revés | `src/lib/drl/` → `src/lib/bke/` | DRL puede importar tipos de BKE. BKE nunca importa DRL. Verificable con `grep -rn "from.*drl" src/lib/bke/` |
| **Orquestador → DRL** | Orquestadores consumen DRL, no implementan reglas | `src/lib/services/*/` → `src/lib/drl/` | Los orquestadores modificados llaman `drlEngine.decide()` en lugar de implementar lógica de decisión inline |
| **BKE → Fuentes** | BKE consume fuentes existentes sin modificarlas | `src/lib/bke/` → `src/lib/db/`, `src/lib/services/`, etc. | BKE no modifica las fuentes. Las consulta y retorna datos. Verificable con revisión de código |

### 2.2 Interfaces públicas existentes que no deben cambiar

| Interfaz / Tipo | Archivo | Uso | Debe permanecer |
|-----------------|---------|-----|-----------------|
| `LLMProvider` | `src/lib/ai/llm-provider.ts` | 3 providers, factory | ✅ Sin cambios. BKE/DRL no modifican la abstracción de proveedores |
| `getLLMProvider()` | `src/lib/ai/llm-provider.ts` | Singleton factory | ✅ Sin cambios. BKE/DRL pueden consultar LLM como fallback, pero no reemplazan el provider |
| `PolicyOutput` | `src/lib/ai/types.ts` (inferido) | Output del pipeline de políticas | ✅ Sin cambios. DRL produce decisiones complementarias, no reemplaza PolicyOutput |
| `StrategyDecision` | `src/lib/ai/conversation-strategy.ts` (inferido) | Decisiones estratégicas | ✅ Sin cambios. DRL.suficiencia informa a StrategyDecision, no lo reemplaza |
| `CoreDecision` | `src/lib/ai/core.ts` (inferido) | Intent + facts | ✅ Sin cambios. BKE enriquece datos, no reemplaza CORE |
| `ComprehensionSignals` | `src/lib/services/extraction/comprehension.ts` | Señales de comprensión | ✅ Sin cambios. DRL.clasificación es complementaria, no reemplaza |
| `TripExtraction` | `src/lib/services/extraction/types.ts` (inferido) | Slots extraídos | ✅ Sin cambios. BKE.entity enriquece contexto, no cambia el tipo de salida |

### 2.3 Comportamiento observable que no debe cambiar

| Comportamiento | Dónde se verifica | Riesgo si cambia |
|----------------|-------------------|------------------|
| El usuario nunca recibe una respuesta peor que la actual | Tests de integración + blackbox | 🔴 Crítico |
| La extracción de slots nunca es peor que con LLM | `extract-slots.ts` + tests | 🟡 Medio |
| La desambiguación de lugares nunca selecciona un candidato incorrecto | `ambiguity-handler.ts` + interacción usuario | 🔴 Crítico |
| Las respuestas de frustración siempre son empáticas | UX testing manual | 🟡 Medio |
| La transcripción de audio nunca falla silenciosamente | `transcribe.ts` + tests | 🟢 Bajo |

### 2.4 Tests que validan contratos existentes

| Test file (existente) | Qué valida | Relevancia para CE-5 |
|-----------------------|------------|----------------------|
| `tests/services/comprehension.test.ts` (inferido) | Pipeline de comprensión C4-C6 | Las fases 1-2 no deben romper estos tests |
| `tests/services/geo/` (inferido) | Resolución de ubicaciones | La BKE geo debe pasar los mismos tests |
| `tests/services/extraction/` (inferido) | Extracción de slots | La BKE entity + DRL no deben degradar extracción |
| `tests/unit/evidence/*.test.ts` (21 files) | Evidence Engine | No deben verse afectados (EE frozen) |
| `tests/integration/persistence-smoke.test.ts` | DB facade | No debe verse afectado (nuevas capas no tocan DB facade) |
| Blackbox tests (`.limpiar`) | 14 escenarios end-to-end | No deben romperse bajo ninguna combinación de feature flags |

---

## 3. Riesgos de implementación

### 3.1 Fase 0 — Infraestructura

| Riesgo | Tipo | Severidad | Justificación | Mitigación |
|--------|:----:|:---------:|---------------|------------|
| **F0-R1:** Over-engineering de tipos | Técnico | 🟢 Baja | Los tipos de BKE/DRL se diseñan antes de tener implementación real; podrían no reflejar las necesidades exactas de las fases 1-3 | Usar tipos mínimos (interfaces angostas). Refactorizar en fase 1-3 si es necesario. Los tipos son baratos de cambiar porque no hay código que los consuma en fase 0 |
| **F0-R2:** Feature flags sobran o faltan | Técnico | 🟢 Baja | `bke.enabled`, `drl.enabled` son flags booleanos que no controlan comportamiento (todo es stub). Podrían no ser necesarios hasta fase 1 | Crear flags con default `false`. Verificar que el sistema opere idénticamente con flags en `true` (stubs retornan null) |
| **F0-R3:** Conflicto con CONTRACTS.md | Regulatorio | 🟢 Baja | Los nuevos directorios `bke/` y `drl/` no están cubiertos por las reglas actuales de AEL | No hay reglas que violar porque son directorios nuevos. Agregar reglas en CONTRACTS.md en fase 4 |
| **F0-R4:** Dependencia circular entre BKE y DRL | Arquitectónico | 🟡 Media | Si `drl/types.ts` importa de `bke/types.ts` y viceversa, se crea una dependencia circular | Regla estricta: DRL puede importar BKE, BKE nunca importa DRL. Verificar con test de build |

### 3.2 Fase 1 — BKE Geo + DRL Desambiguación (Reemplazo C3)

| Riesgo | Tipo | Severidad | Justificación | Mitigación |
|--------|:----:|:---------:|---------------|------------|
| **F1-R1:** Scoring de desambiguación incorrecto | Técnico | 🔴 Alto | El BKE debe seleccionar el mismo candidato que el LLM seleccionaría. Si el scoring difiere, el usuario recibe una sugerencia incorrecta. CE-2 documenta que C3 usa temperature=0.1 y maxTokens=10 — el LLM opera como clasificador casi determinístico. El BKE debe alcanzar >90% de coincidencia con el LLM para 50 casos de prueba históricos | 1. Usar PAIR_BASE existente (20 pares de zonas) como base del scoring 2. Validar contra 50 casos históricos antes de activar en producción 3. El fallback a LLM se activa cuando confianza < 0.8 4. Confirmación del usuario es el filtro final |
| **F1-R2:** Modificación de ambiguity-handler.ts introduce bug | Regresión | 🟡 Media | `ambiguity-handler.ts` maneja el flujo de ambigüedad interactivo (preguntas al usuario, respuestas, retry). Insertar un paso BKE antes de C3 podría alterar el flujo incluso con BKE desactivado | 1. Tests de integración del flujo actual antes y después del cambio 2. El código nuevo se ejecuta solo si `bke.geo.enabled=true` 3. Flag en `false` → código original sin cambios 4. Feature flag verificado en CI |
| **F1-R3:** BKE.geo duplica lógica de location-resolver.ts | Técnico | 🟢 Baja | `location-resolver.ts` ya tiene `resolveLocation()`, PAIR_BASE, risk nodes. El BKE podría terminar duplicando esta lógica en lugar de consumirla | BKE.geo debe **consumir** `location-resolver.ts`, no duplicarlo. El BKE es una capa de orquestación de consultas, no de implementación de lógica de geolocalización |
| **F1-R4:** Latencia adicional sin beneficio | Rendimiento | 🟡 Media | Consultar BKE.geo + DRL antes de C3 agrega ~20-50ms de latencia. Si el BKE no puede resolver y cae a LLM, la latencia total aumenta respecto al baseline | El tiempo de BKE+DRL (~20-50ms) es despreciable comparado con LLM (~1000-3000ms). Incluso en el peor caso (fallback a LLM), el aumento de latencia es <5% |

### 3.3 Fase 2 — BKE Mensajes + DRL Clasificación (Simplificación C4, C6)

| Riesgo | Tipo | Severidad | Justificación | Mitigación |
|--------|:----:|:---------:|---------------|------------|
| **F2-R1:** DRL.clasificación no coincide con interpretMessage() actual | Funcional | 🟡 Media | El `ConversationInterpreter` (ADR-007) clasifica mensajes en 12 tipos. DRL.clasificación debe producir la misma clasificación que el intérprete actual. Si difiere, el pipeline toma decisiones incorrectas (ej: tratar una negación como afirmación) | 1. Validar contra 100 mensajes históricos etiquetados 2. DRL.clasificación se ejecuta en paralelo al intérprete actual durante staging 3. Solo se activa cuando `drl.comprehension.enabled=true` 4. Si DRL retorna null, se usa el intérprete actual |
| **F2-R2:** BKE.message no tiene el template adecuado para el contexto | Conversacional | 🟡 Media | Los 89 templates i18n existentes cubren escenarios genéricos. Para contextos muy específicos (ej: usuario confundido después de 3 intentos de extracción), el template puede no ser adecuado y sonar robótico | 1. BKE.message retorna null si no hay template exacto → fallback a LLM 2. Los templates existentes ya se usan como fallback hoy (CE-1 Sección 6.4) — la calidad no será peor que la actual 3. Fase 4 incluye logging de niveles para identificar templates faltantes |
| **F2-R3:** DRL.completitud duplica lógica de domain profiles | Técnico | 🟢 Baja | `comprehension.ts` ya tiene `GetDomainConfig()` con perfiles por dominio (campos requeridos, pesos). DRL.completitud podría duplicar esta lógica | DRL.completitud debe **consumir** `GetDomainConfig()` desde comprehension.ts, no reimplementarlo. La DRL es capa de razonamiento, no de datos |

### 3.4 Fase 3 — BKE Extracción + DRL Suficiencia (Asistencia C1, C2, C5)

| Riesgo | Tipo | Severidad | Justificación | Mitigación |
|--------|:----:|:---------:|---------------|------------|
| **F3-R1:** DRL.suficiencia decide SUFFICIENT cuando no debería | Conversacional | 🔴 Alto | Si la DRL decide que BKE es suficiente y el sistema responde con un template en lugar de llamar al LLM, la respuesta puede ser genérica y no personalizada. El usuario nota la diferencia | 1. DRL.suficiencia tiene sesgo a ESCALATE (si no está segura, escala) 2. Validación contra el comportamiento actual de skipLLM 3. Métricas de "suficiencia correcta" deben estar >90% antes de activar 4. Feature flag permite rollback instantáneo |
| **F3-R2:** BKE.entity inyecta contexto incorrecto en C1 | Técnico | 🟡 Media | Si el BKE pre-resuelve un lugar incorrectamente y lo inyecta como contexto en el prompt de C1, el LLM podría verse sesgado a aceptar ese lugar aunque el texto del usuario diga otra cosa | 1. El texto original del usuario siempre está en el prompt (el BKE solo agrega contexto, no reemplaza) 2. El LLM puede ignorar el contexto BKE si no es relevante 3. Validar que la tasa de éxito de extracción no disminuye vs baseline |
| **F3-R3:** Reducción de tokens no es significativa | Costo | 🟢 Baja | El BKE puede no reducir los tokens del prompt de C1 tanto como se espera (~30-40%) porque el conocimiento del dominio puede seguir siendo necesario en el prompt para casos no cubiertos por el BKE | 1. Medir tamaño del prompt con/sin BKE durante staging 2. Si la reducción es <20%, revisar qué conocimiento no está cubriendo el BKE 3. La reducción de tokens es beneficiosa pero no crítica para el éxito de la fase |

### 3.5 Fase 4 — Escalamiento Completo (Activación del Stack)

| Riesgo | Tipo | Severidad | Justificación | Mitigación |
|--------|:----:|:---------:|---------------|------------|
| **F4-R1:** DRL nunca decide SUFFICIENT → el sistema sigue usando LLM para todo | Técnico | 🔴 Alto | Si las reglas de DRL.suficiencia son demasiado conservadoras, el sistema nunca escala a BKE+DRL y el stack cognitivo no aporta mejora. El sistema opera como hoy pero con más latencia (la consulta BKE+DRL antes de LLM es overhead) | 1. Métricas de nivel de resolución (CE-4 Sección 6.1 Fase 4) 2. Si nivel 0+1 < 20% después de 1 semana, ajustar reglas de suficiencia 3. Feature flag ramping (1%-5%-20%-50%-100%) permite detectar el problema temprano |
| **F4-R2:** DRL decide SUFFICIENT cuando no debería → degradación conversacional | Conversacional | 🔴 Alto | Si la DRL responde con template cuando el LLM daría una respuesta más personalizada, la calidad conversacional se degrada. El usuario nota que el bot es "menos inteligente" | 1. Umbral de rollback: tasa de éxito conversacional cae >5% → rollback inmediato (CE-4 Sección 6.2) 2. DRL.suficiencia con sesgo a ESCALATE 3. Validación contra baseline de CE-1 antes de activar 4. Ramping gradual permite detectar degradación temprano |
| **F4-R3:** Fallback completo (DRL→Groq→Gemini→fallback) nunca se prueba en producción | Operativo | 🟡 Medio | La cadena completa de fallback (BKE→DRL→Groq→Gemini→fallback estático) nunca se ha ejecutado en producción. Groq tiene rate limit y Gemini no tiene API key. La ruta de fallback puede tener errores no detectados | 1. Forzar la ruta de fallback en staging con feature flags 2. Simular fallo de Groq y Gemini en tests de integración 3. El fallback estático (templates) es el mismo que opera hoy (CE-1 Sección 6.4) — es conocido y estable |
| **F4-R4:** Cambios en lead.service.ts afectan el pipeline completo | Regresión | 🔴 Alto | `lead.service.ts` es el orquestador central. Modificar su flujo para insertar el cognitive stack puede tener efectos secundarios en cualquiera de los pasos del pipeline (comprensión, extracción, ambigüedad, respuesta) | 1. Feature flag `cognitive_stack.enabled=false` → sin cambios en el pipeline 2. Tests de integración del pipeline completo con flag en true y false 3. Los cambios en lead.service.ts son mínimos (una llamada a cognitiveStack antes del LLM) 4. Rollback es flip de flag |

### 3.6 Matriz de riesgo resumida

| Fase | Técnico | Funcional | Conversacional | Regresión | General |
|:----:|:-------:|:---------:|:--------------:|:---------:|:-------:|
| **0** | 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | 🟢 **Bajo** |
| **1** | 🔴 Alto (scoring) | 🟡 Medio | 🟡 Medio | 🟡 Medio | 🟡 **Medio** |
| **2** | 🟢 Bajo | 🟡 Medio | 🟡 Medio | 🟢 Bajo | 🟡 **Medio** |
| **3** | 🟡 Medio | 🟡 Medio | 🔴 Alto (suficiencia) | 🟢 Bajo | 🟡 **Medio** |
| **4** | 🔴 Alto (stack) | 🔴 Alto | 🔴 Alto | 🔴 Alto | 🔴 **Alto** |

---

## 4. Orden óptimo de implementación

### 4.1 Secuencia propuesta de PRs

Basado en el análisis de riesgos, dependencias y complejidad, la implementación debe seguir esta secuencia de 6 PRs:

---

### PR-5A — Infraestructura base (Fase 0)

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Crear la estructura base del stack cognitivo: tipos BKE, tipos DRL, feature flags, stubs de dominios y reglas. Sin integración en orquestadores. |
| **Archivos a crear** | `src/lib/bke/types.ts`, `src/lib/bke/index.ts`, `src/lib/bke/bke-engine.ts`, `src/lib/bke/domains/geo.ts`, `src/lib/bke/domains/message.ts`, `src/lib/bke/domains/entity.ts`, `src/lib/bke/domains/pricing.ts`, `src/lib/drl/types.ts`, `src/lib/drl/index.ts`, `src/lib/drl/drl-engine.ts`, `src/lib/drl/rules/completitud.ts`, `src/lib/drl/rules/clasificacion.ts`, `src/lib/drl/rules/suficiencia.ts`, `src/lib/drl/rules/consistencia.ts`, `src/lib/drl/rules/escalamiento.ts`, `src/lib/config/feature-flags.ts` |
| **Archivos a modificar** | Ninguno |
| **Tamaño estimado** | ~450 líneas (stubs + tipos) |
| **Complejidad** | 🟢 Baja — código nuevo sin integración |
| **Dependencias** | Ninguna |
| **Duración estimada** | 2-3 días |
| **Feature flags** | `bke.enabled=false`, `drl.enabled=false` — default false |
| **Criterios de aceptación** | 1. `bke.enabled` y `drl.enabled` existen y default `false` 2. Todas las consultas BKE retornan `null` sin error 3. Todas las reglas DRL retornan `null` sin error 4. Build compila 5. 0 tests existentes fallan 6. Contratos R1-R4 pasan |
| **Riesgo principal** | F0-R1: Over-engineering de tipos |

---

### PR-5B — BKE Geo + DRL Desambiguación (Fase 1)

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Implementar el dominio geográfico del BKE consumiendo `location-resolver.ts` y las reglas de desambiguación de la DRL. Modificar `ambiguity-handler.ts` para consultar BKE+DRL antes de C3. |
| **Archivos a modificar** | `src/lib/services/workflow/ambiguity-handler.ts`, `src/lib/bke/domains/geo.ts`, `src/lib/bke/bke-engine.ts`, `src/lib/drl/rules/escalamiento.ts` |
| **Archivos a crear** | Tests de BKE.geo, Tests de DRL.desambiguación |
| **Archivos que se consumen pero no modifican** | `location-resolver.ts`, `entity-catalog.ts`, `regex-extractor.ts`, `entity-extractor.ts` |
| **Tamaño estimado** | ~300 líneas (implementación) + ~200 líneas (tests) |
| **Complejidad** | 🟡 Media — primera integración con orquestador existente |
| **Dependencias** | PR-5A completo |
| **Duración estimada** | 4-5 días |
| **Feature flag** | `bke.geo.enabled=false` |
| **Criterios de aceptación** | 1. C3 se llama 0 veces durante 100 sesiones de test con `bke.geo.enabled=true` 2. Precisión de desambiguación BKE >90% vs LLM para 50 casos históricos 3. Tasa de fallback a C3 <10% 4. Latencia de desambiguación <50ms 5. Tests de ambiguity-handler existentes siguen pasando con flag en false y true 6. Build compila, contratos pasan |
| **Riesgo principal** | F1-R1: Scoring de desambiguación incorrecto |

---

### PR-5C — BKE Mensajes + DRL Clasificación (Fase 2)

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Implementar el dominio de mensajes del BKE (consumiendo i18n y templates) y las reglas de clasificación de la DRL. Modificar `comprehension-runner.ts` y `comprehension.ts` para usar BKE+DRL antes que C4/C6. |
| **Archivos a modificar** | `src/lib/services/extraction/comprehension-runner.ts`, `src/lib/services/extraction/comprehension.ts`, `src/lib/bke/domains/message.ts`, `src/lib/bke/bke-engine.ts`, `src/lib/drl/rules/clasificacion.ts`, `src/lib/drl/rules/completitud.ts` |
| **Archivos a crear** | Tests de BKE.message, Tests de DRL.clasificación |
| **Tamaño estimado** | ~250 líneas (implementación) + ~200 líneas (tests) |
| **Complejidad** | 🟡 Media — comprensión tiene lógica existente compleja (3 estados, overrides) |
| **Dependencias** | PR-5A completo (BKE geo no es prerrequisito estricto pero recomendado) |
| **Duración estimada** | 4-5 días |
| **Feature flag** | `drl.comprehension.enabled=false` |
| **Criterios de aceptación** | 1. C4 y C6 se llaman 0 veces durante 100 sesiones de test con flag en true 2. Precisión de DRL.clasificación >95% vs Conversation Interpreter actual 3. Tasa de fallback a C4+C6 <10% 4. Tests de comprehension-runner existentes pasan con flag en false y true 5. Build compila, contratos pasan |
| **Riesgo principal** | F2-R1: DRL.clasificación no coincide con interpretMessage() |

---

### PR-5D — BKE Extracción + DRL Suficiencia (Fase 3)

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Implementar el dominio de entidades del BKE y las reglas de suficiencia de la DRL. Modificar `handler.ts` y `extract-slots.ts` para inyectar contexto BKE antes de C1/C2. |
| **Archivos a modificar** | `src/lib/ai/handler.ts`, `src/lib/services/extraction/extract-slots.ts`, `src/lib/bke/domains/entity.ts`, `src/lib/bke/domains/pricing.ts`, `src/lib/bke/bke-engine.ts`, `src/lib/drl/rules/suficiencia.ts` |
| **Archivos a crear** | Tests de BKE.entity, Tests de DRL.suficiencia |
| **Tamaño estimado** | ~300 líneas (implementación) + ~250 líneas (tests) |
| **Complejidad** | 🟡 Media — modifica handler.ts (punto crítico del pipeline) |
| **Dependencias** | PR-5A + PR-5B (BKE geo y entity comparten fuentes) |
| **Duración estimada** | 4-5 días |
| **Feature flag** | `bke.extraction.enabled=false` |
| **Criterios de aceptación** | 1. Prompt de C1 se reduce >30% tokens 2. Tasa de éxito de extracción no disminuye vs baseline 3. DRL.suficiencia acierta >90% vs skipLLM actual 4. Tasa de éxito conversacional no disminuye 5. Tests de handler existentes pasan con flag en false y true 6. Build compila, contratos pasan |
| **Riesgo principal** | F3-R1: DRL.suficiencia decide SUFFICIENT incorrectamente |

---

### PR-5E — Stack Completo + Métricas (Fase 4, parte 1)

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Activar el stack completo de escalamiento cognitivo: BKE → DRL → LLM fallback. Conectar DRL a StrategyDecision. Agregar logging por nivel de resolución. |
| **Archivos a modificar** | `src/lib/services/lead.service.ts`, `src/lib/ai/handler.ts`, `src/lib/drl/rules/escalamiento.ts` |
| **Archivos a crear** | Sistema de logging de niveles, Feature flag maestro `cognitive_stack.enabled` |
| **Tamaño estimado** | ~150 líneas (modificaciones) + ~100 líneas (logging/métricas) |
| **Complejidad** | 🔴 Alta — cambia el camino primario del pipeline |
| **Dependencias** | PR-5B, PR-5C, PR-5D completos y verificados |
| **Duración estimada** | 5-7 días |
| **Feature flag** | `cognitive_stack.enabled=0%` (ramping 1%-5%-20%-50%-100%) |
| **Criterios de aceptación** | 1. 100% de requests pasan por BKE+DRL antes de LLM 2. Llamadas LLM reducidas 60-80% vs baseline CE-1 3. Tiempo de respuesta promedio no aumenta más de 10% 4. Tasa de éxito conversacional no disminuye 5. Logging de niveles funciona correctamente 6. Rollback con flip de flag es instantáneo |
| **Riesgo principal** | F4-R2: Degradación conversacional por falsos SUFFICIENT |

---

### PR-5F — Métricas de Escalamiento + Dashboard (Fase 4, parte 2)

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Agregar métricas de escalamiento, dashboard de niveles, y sistema de alertas para el stack cognitivo. |
| **Archivos a modificar** | Sistema de métricas existente (si existe), sistema de logging |
| **Archivos a crear** | Dashboard de escalamiento cognitivo (si aplica), alertas de rollback |
| **Tamaño estimado** | ~200 líneas |
| **Complejidad** | 🟡 Media — solo métricas, no lógica de negocio |
| **Dependencias** | PR-5E (stack operativo) |
| **Duración estimada** | 2-3 días |
| **Feature flag** | `cognitive_stack.enabled` (heredado de PR-5E) |
| **Criterios de aceptación** | 1. Métricas `nivel_resolucion`, `tiempo_por_nivel`, `tasa_escalamiento` se generan 2. Dashboard muestra niveles en tiempo real 3. Alertas de rollback configuradas según umbrales CE-4 Sección 6.2 |
| **Riesgo principal** | F4-R3: Ruta de fallback completa no probada |

---

### 4.2 Resumen de la secuencia

```
PR-5A ──── PR-5B ──── PR-5C ──── PR-5D ──── PR-5E ──── PR-5F
  │          │          │          │          │          │
  │          ▼          ▼          ▼          ▼          ▼
  │     Fase 0     Fase 1     Fase 2     Fase 3     Fase 4     Fase 4
  │     (base)    (C3 repl.) (C4,C6 simpl) (C1,C2 asist.) (stack)  (métricas)
  │
  └── 2-3d ──┴── 4-5d ──┴── 4-5d ──┴── 4-5d ──┴── 5-7d ──┴── 2-3d ──→
  └────────────── ~22-28 días hábiles (~5-6 semanas) ──────────────→
```

**Nota:** La duración es estimada y supone dedicación completa. Los PRs pueden tener overlap parcial (ej: PR-5C puede comenzar antes de que PR-5B termine si las dependencias lo permiten).

---

## 5. Estrategia de validación

### 5.1 Validación por PR

#### PR-5A (Infraestructura)

| Tipo | Qué verificar | Herramienta | Criterio |
|------|---------------|-------------|----------|
| **Build** | Compilación con `tsc --noEmit` y `npm run build` | TypeScript + Next.js | ✅ PASS |
| **Contratos** | R1-R4 (AEL) | `bash ael/contracts/enforce.sh` | ✅ PASS |
| **Tests existentes** | 0 regresiones | `npm test` | ✅ Todos PASS |
| **Tests nuevos** | BKE/DRL stubs retornan null | Tests unitarios nuevos | ✅ PASS |
| **Feature flags** | `bke.enabled=false`, `drl.enabled=false` | Test unitario | ✅ Valores correctos |
| **Observabilidad** | N/A (no hay cambio funcional) | — | — |

#### PR-5B (BKE Geo)

| Tipo | Qué verificar | Herramienta | Criterio |
|------|---------------|-------------|----------|
| **Build** | Compilación | `tsc --noEmit` | ✅ PASS |
| **Contratos** | R1-R4 | `bash ael/contracts/enforce.sh` | ✅ PASS |
| **Tests existentes** | 0 regresiones | `npm test` | ✅ Todos PASS |
| **Tests BKE.geo** | Precisión de desambiguación vs 50 casos históricos | Tests parametrizados | >90% coincidencia |
| **Tests DRL.desambiguación** | Scoring correcto para PAIR_BASE + risk nodes | Tests unitarios | ✅ Todas las reglas cubren los casos documentados |
| **Tests ambiguity-handler** | Flujo actual intacto con flag en false | Tests de integración | ✅ Mismo comportamiento |
| **Comparación staging** | Respuestas BKE vs LLM para 100 inputs | Script de comparación | >90% coincidencia |
| **Latencia** | BKE.desambiguarLugar() | Test de rendimiento | <50ms promedio |
| **Observabilidad** | Logging de Nivel 0/1/2 | Revisión de logs | ✅ Se registra qué nivel resolvió |
| **Compatibilidad** | Flag en false → comportamiento original | Test de integración | ✅ Pipeline original intacto |
| **Rollback** | Flip flag a false | Prueba manual | ✅ Instantáneo, sin efecto visible |

#### PR-5C (BKE Mensajes)

| Tipo | Qué verificar | Herramienta | Criterio |
|------|---------------|-------------|----------|
| **Build** | Compilación | `tsc --noEmit` | ✅ PASS |
| **Contratos** | R1-R4 | `bash ael/contracts/enforce.sh` | ✅ PASS |
| **Tests existentes** | 0 regresiones | `npm test` | ✅ Todos PASS |
| **Tests DRL.clasificación** | Precisión vs Conversation Interpreter actual | Tests parametrizados | >95% coincidencia sobre 100 casos |
| **Tests BKE.message** | 89 templates accesibles desde BKE | Test unitario | ✅ Todos los templates se resuelven |
| **Tests comprehension** | Flujo actual intacto con flag en false | Tests de integración | ✅ Mismo comportamiento |
| **Comparación staging** | Mensajes BKE vs LLM para 50 casos de RECOVERY/ESCALATION | Revisión manual | ✅ Respuesta BKE es adecuada para el contexto |
| **Observabilidad** | Logging de nivel de resolución de comprensión | Revisión de logs | ✅ Se registra |

#### PR-5D (BKE Extracción)

| Tipo | Qué verificar | Herramienta | Criterio |
|------|---------------|-------------|----------|
| **Build** | Compilación | `tsc --noEmit` | ✅ PASS |
| **Contratos** | R1-R4 | `bash ael/contracts/enforce.sh` | ✅ PASS |
| **Tests existentes** | 0 regresiones | `npm test` | ✅ Todos PASS |
| **Tests BKE.entity** | Resolución de entidades vs entity-catalog + regex-extractor | Tests parametrizados | ✅ 100% de patrones cubiertos |
| **Tests DRL.suficiencia** | Decisiones correctas vs skipLLM actual | Tests unitarios | >90% precisión |
| **Tamaño de prompt C1** | Con vs sin BKE | Script de medición | Reducción >30% tokens |
| **Tasa de extracción** | Con vs sin BKE en staging | Métrica de extracción | No disminuye |
| **Observabilidad** | Logging de contexto BKE inyectado | Revisión de logs | ✅ Se registra |

#### PR-5E (Stack Completo — Canario)

| Tipo | Qué verificar | Herramienta | Criterio |
|------|---------------|-------------|----------|
| **Build** | Compilación | `tsc --noEmit` | ✅ PASS |
| **Contratos** | R1-R4 | `bash ael/contracts/enforce.sh` | ✅ PASS |
| **Tests existentes** | 0 regresiones | `npm test` | ✅ Todos PASS |
| **Tests de integración** | Pipeline completo con stack activo | Tests de integración | ✅ 100% de escenarios cubiertos |
| **Verificación canario** | 1% de usuarios durante 3 días | Monitoreo en vivo | Sin incidentes |
| **Métrica: llamadas LLM** | Reducción respecto a baseline CE-1 | Dashboard | 60-80% reducción |
| **Métrica: tiempo respuesta** | Aumento respecto a baseline | Dashboard | <10% aumento |
| **Métrica: éxito conversacional** | Tasa vs pre-fase | Dashboard | No disminuye >5% |
| **Métrica: tasa de fallback** | Fallback determinístico | Dashboard | <1% (solo cuando LLM falla) |
| **Rollback** | `cognitive_stack.enabled=0%` | Prueba en producción | ✅ Instantáneo, sin efecto visible |
| **Umbrales de rollback** | Ver CE-4 Sección 6.2 | Dashboard + alertas | Configurados y operativos |

### 5.2 Estrategia de métricas

Cada PR agrega las siguientes métricas al sistema:

| PR | Nueva métrica | Tipo | Dashboard | Alerta |
|:--:|---------------|:----:|:---------:|:------:|
| 5B | `bke_geo_invocaciones` | Contador | BKE Geo | — |
| 5B | `bke_geo_fallback_count` | Contador | BKE Geo | >10% del total |
| 5B | `bke_geo_latencia_ms` | Histograma | BKE Geo | >100ms promedio |
| 5C | `drl_clasificacion_invocaciones` | Contador | DRL Clasificación | — |
| 5C | `drl_clasificacion_fallback_count` | Contador | DRL Clasificación | >10% del total |
| 5D | `bke_entity_invocaciones` | Contador | BKE Entity | — |
| 5D | `prompt_tokens_ahorrados_c1` | Contador | Extracción | <20% reducción |
| 5D | `drl_suficiencia_decision` | Contador por tipo | DRL Suficiencia | — |
| 5E | `nivel_resolucion` | Contador por nivel | Stack Cognitivo | Nivel 0+1 <20% tras 1 semana |
| 5E | `tiempo_por_nivel_ms` | Histograma | Stack Cognitivo | >500ms promedio en N0 |
| 5E | `tasa_escalamiento` | Porcentaje | Stack Cognitivo | Escalamiento a LLM >80% tras 1 semana |
| 5E | `fallback_total_count` | Contador | Stack Cognitivo | >1% del total |

### 5.3 Estrategia de compatibilidad

| Aspecto | Cómo se garantiza |
|---------|-------------------|
| **Behavioral** | Cada PR ejecuta `npm test` completo (88+ files) con y sin feature flags activados |
| **Contractual** | Cada PR ejecuta `bash ael/contracts/enforce.sh` (R1-R4) |
| **Build** | Cada PR ejecuta `npm run build` (o `tsc --noEmit`) |
| **Integración** | Tests de integración existentes verifican que el pipeline opera correctamente con flags en `true` y `false` |
| **Rollback** | Cada feature flag puede flipearse sin despliegue. El comportamiento anterior se restaura instantáneamente |
| **Datos** | BKE no escribe en DB, no migra datos, no modifica esquemas. Rollback no requiere migración inversa |

### 5.4 Estrategia de rollback

Ver CE-4 Sección 7.3 para el mecanismo detallado. En resumen:

| PR | Rollback | Tiempo | Efecto |
|:--:|----------|:------:|--------|
| 5A | Eliminar archivos nuevos | Bajo | Sin cambios visibles |
| 5B | Flip `bke.geo.enabled=false` | Instantáneo | O2 vuelve a usar LLM |
| 5C | Flip `drl.comprehension.enabled=false` | Instantáneo | O4 vuelve a usar LLM |
| 5D | Flip `bke.extraction.enabled=false` | Instantáneo | O1/O3 vuelven a prompts sin BKE |
| 5E | Flip `cognitive_stack.enabled=false` | Instantáneo | Pipeline original restaurado |

---

## 6. Criterios de Go / No-Go

### 6.1 Pregunta fundamental

> **¿Está el proyecto listo para iniciar CE-5?**

### 6.2 Bloqueantes reales (si existen)

Tras la auditoría completa del repositorio, los documentos de diseño, y los contratos existentes, se identifican los siguientes bloqueantes:

| ID | Bloqueante | Severidad | Fase afectada | Requisito para desbloquear |
|:--:|------------|:---------:|:-------------:|----------------------------|
| **B1** | `src/lib/bke/` y `src/lib/drl/` no existen | 🔴 Alto | Fase 0 (PR-5A) | Crear directorios con estructura base. Es el propósito del PR-5A |
| **B2** | No existe feature flag `bke.enabled` ni `drl.enabled` en `env.ts` o `feature-flags.ts` | 🔴 Alto | Fase 0 (PR-5A) | Agregar flags. Es parte del PR-5A |
| **B3** | No existen tipos compartidos entre BKE y DRL para dominios geográficos, mensajes, entidades | 🟡 Medio | Fase 0 (PR-5A) | Definir tipos en PR-5A. Riesgo de over-engineering mitigable |
| **B4** | `transcribeAudio()` (C7) usa Gemini SDK directo, no la interfaz LLMProvider | 🟢 Bajo | Fase 3 (PR-5D) | No es bloqueante para iniciar CE-5. Se puede refactorizar en PR-5D o en un PR separado. No afecta fases 0-2 |
| **B5** | Groq rate limit (429) y Gemini sin API key en producción | 🟡 Medio | Fase 4 (PR-5E) | No bloquea fases 0-3 (el LLM sigue siendo fallback opcional). Para PR-5E (stack completo) se necesita al menos un proveedor LLM funcional para verificar la cadena de escalamiento. Se puede mitigar con tests de integración que simulen respuestas LLM |
| **B6** | Tests existentes pueden tener 1 fallo preexistente (fase-22 T2) | 🟢 Bajo | Todas | No bloquea. El fallo es preexistente y no relacionado con CE-5. Documentado en PROJECT_BOARD como P1-04 |

### 6.3 Veredicto

> **✅ SÍ — El proyecto está listo para iniciar CE-5.**

**Justificación:**

1. **Diseño completo**: CE-1 a CE-4 y ADR-012 están completos y aprobados. El roadmap de migración es detallado, con fases incrementales, feature flags, criterios de aceptación y umbrales de rollback.

2. **Base técnica sólida**: La auditoría del código reveló que las bases determinísticas necesarias para el BKE ya existen (`location-resolver.ts`, `regex-extractor.ts`, `entity-extractor.ts`, `entity-catalog.ts`) y son puras, testeables, y sin dependencias LLM. No se necesita crear lógica nueva desde cero — solo encapsular la existente.

3. **Contratos claros**: Los contratos entre capas (R1-R4) están documentados y son verificables automáticamente. Los nuevos directorios `src/lib/bke/` y `src/lib/drl/` no violan ningún contrato existente.

4. **Riesgo manejable**: El análisis de riesgos muestra que:
   - Fase 0 (PR-5A): riesgo 🟢 Bajo — código nuevo sin integración
   - Fase 1-3 (PR-5B a PR-5D): riesgo 🟡 Medio — cada fase tiene feature flag, fallback a LLM, y criterios de aceptación objetivos
   - Fase 4 (PR-5E): riesgo 🔴 Alto — mitigado por ramping gradual, umbrales de rollback, y tests de integración exhaustivos

5. **Sin bloqueantes críticos**: Ninguno de los bloqueantes identificados impide iniciar la Fase 0 (PR-5A). B1 y B2 son el propósito mismo del PR-5A. B3 es un riesgo menor de over-engineering. B4 y B5 no afectan las primeras fases. B6 es preexistente.

6. **Feature flags como mecanismo de seguridad**: Cada fase está protegida por feature flags. Si alguna fase introduce regresiones, el rollback es instantáneo y no requiere despliegue.

### 6.4 Condiciones de No-Go (para referencia futura)

CE-5 debe detenerse y reevaluarse si ocurre cualquiera de las siguientes condiciones:

| Condición | Acción |
|-----------|--------|
| PR-5A no compila o rompe contratos existentes | Reevaluar diseño de tipos BKE/DRL |
| PR-5B no alcanza >80% de coincidencia con LLM en desambiguación | Revisar algoritmo de scoring; considerar enfoque híbrido |
| PR-5C no alcanza >90% de coincidencia con Conversation Interpreter | Revisar reglas de clasificación; aumentar corpus de entrenamiento |
| PR-5D no reduce >20% tokens de C1 | Revisar qué conocimiento del dominio no cubre el BKE |
| PR-5E: tasa de éxito conversacional cae >5% en canario (1%) | Rollback inmediato; revisar reglas de suficiencia |
| PR-5E: tiempo de respuesta aumenta >20% en canario | Rollback; optimizar consultas BKE |

---

## Anexo A: Mapa de dependencias entre archivos existentes y nuevos

```
Archivos existentes (NO se modifican)              Archivos nuevos (CE-5)
─────────────────────────────────────────          ───────────────────────
                                                  src/config/feature-flags.ts
src/config/constants.ts
src/config/env.ts

                                                  src/lib/bke/types.ts
                                                  src/lib/bke/bke-engine.ts
                                                  src/lib/bke/domains/geo.ts
src/lib/db/domains/geo.ts ◄──── consumes ────┐     src/lib/bke/domains/message.ts
src/lib/services/geo/location-resolver.ts ◄──┤     src/lib/bke/domains/entity.ts
src/lib/services/extraction/regex-extractor.ts◄┤    src/lib/bke/domains/pricing.ts
src/lib/services/extraction/entity-extractor.ts◄┤  src/lib/bke/index.ts
src/config/entity-catalog.ts ◄───────────────┤     │
src/lib/services/pricing/tariff-repository.ts◄┤    ├── src/lib/drl/types.ts
src/lib/services/pricing/tour-resolver.ts ◄───┘    │   src/lib/drl/drl-engine.ts
                                                   │   src/lib/drl/rules/completitud.ts
Archivos existentes (SE modifican)                  │   src/lib/drl/rules/clasificacion.ts
────────────────────────────                       │   src/lib/drl/rules/suficiencia.ts
src/lib/services/workflow/ambiguity-handler.ts      │   src/lib/drl/rules/consistencia.ts
  └── inserta: BKE.geo.consultar()                  │   src/lib/drl/rules/escalamiento.ts
      └── DRL.desambiguacion.escalar()               │   src/lib/drl/index.ts
          └── fallback: C3 (existente)              │
                                                   │
src/lib/services/extraction/comprehension-runner.ts │
  └── inserta: DRL.clasificar()                     │
      └── BKE.message.obtener()                    │
          └── fallback: C4/C6 (existente)           │
                                                   │
src/lib/services/extraction/comprehension.ts        │
  └── inserta: BKE.message.obtener()                │
      └── fallback: C6 (existente)                  │
                                                   │
src/lib/ai/handler.ts                               │
  └── inserta: BKE.entity.consultar()               │
      └── DRL.suficiencia.decidir()                │
          └── fallback: C2 (existente)              │
                                                   │
src/lib/services/extraction/extract-slots.ts        │
  └── inserta: BKE.entity.contexto()                │
      └── fallback: C1 con prompt más corto        │
                                                   │
src/lib/services/lead.service.ts (solo Fase 4)      │
  └── inserta: cognitiveStack.escalar()             │
```

---

## Anexo B: Glosario de términos CE-5

| Término | Definición |
|---------|------------|
| **BKE** | Business Knowledge Engine — capa Nivel 0 del stack cognitivo. Encapsula el conocimiento del dominio en una API de consultas de alto nivel |
| **DRL** | Deterministic Reasoning Layer — capa Nivel 1 del stack cognitivo. Aplica reglas determinísticas sobre datos del BKE para producir decisiones |
| **C1-C7** | Los 7 puntos de consumo LLM identificados en CE-1. C1=extractSlots, C2=generateResponse, C3=interpretAmbiguity, C4=generateReinterpretResponse, C5=generateFrustrationResponse, C6=generateContextualRecovery, C7=transcribeAudio |
| **O1-O5** | Los 5 orquestadores identificados en CE-1. O1=handler.ts, O2=ambiguity-handler.ts, O3=extract-slots.ts, O4=comprehension-runner.ts, O5=extraction-runner.ts |
| **Feature flag** | Variable de entorno o configuración que permite activar/desactivar una funcionalidad sin cambiar código ni redeployar |
| **Ramping** | Activación gradual de una feature flag (1% → 5% → 20% → 50% → 100%) para monitorear impacto incremental |
| **Stack cognitivo** | Conjunto de 3 niveles (BKE → DRL → LLM) que implementan el escalamiento de inteligencia definido en ADR-012 |

---

*Fin de CE-5_IMPLEMENTATION_READINESS.md — Documento de autorización técnica para CE-5*
