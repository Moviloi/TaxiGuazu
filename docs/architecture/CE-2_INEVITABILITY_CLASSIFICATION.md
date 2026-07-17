# CE-2 — Clasificación de Inevitabilidad Arquitectónica

> **Fecha:** 2026-07-15  
> **Driver:** Clasificar cada punto de consumo LLM identificado en CE-1 según su inevitabilidad arquitectónica, estableciendo la base objetiva para CE-3  
> **Rol:** Arquitecto Principal  
> **Fuente única:** CE-1_COGNITIVE_EFFICIENCY_AUDIT.md (ningún otro archivo fue consultado)  
> **Documentos relacionados:** CE-1_COGNITIVE_EFFICIENCY_AUDIT.md

---

## Preámbulo

Este documento clasifica los 7 puntos de consumo LLM (C1–C7) identificados y documentados en CE-1 según cuatro categorías de inevitabilidad arquitectónica. Cada clasificación se basa exclusivamente en la evidencia registrada en CE-1: archivo, función, línea, método del provider, parámetros, condiciones de activación, frecuencia, presupuesto cognitivo, y estado de producción.

**No se modifica código. No se proponen refactorizaciones. No se diseña arquitectura nueva. No se define el Business Knowledge Engine.** Este documento es una fotografía clasificatoria del estado actual, que servirá como entrada para CE-3.

---

## Categorías

| Categoría | Definición |
|:---------:|------------|
| **A** — Arquitectónicamente Inevitable | La llamada aporta una capacidad que no puede resolverse razonablemente mediante conocimiento explícito, reglas determinísticas o algoritmos convencionales |
| **B** — Simplificable | La llamada sigue siendo necesaria, pero puede reducirse en frecuencia, contexto, complejidad o costo |
| **C** — Reemplazable | La llamada puede ser sustituida por Business Knowledge Engine, lógica determinística, datos existentes o componentes ya presentes en la arquitectura |
| **D** — Eliminable | La llamada no aporta valor arquitectónico suficiente, duplica funcionalidad o nunca debió existir como consumo LLM |

---

## 1. Tabla Completa de Clasificación

### C1 — generateGroqExtraction

| Atributo | Valor |
|----------|-------|
| **Archivo** | `src/lib/ai/groq.ts` |
| **Función** | `generateGroqExtraction()` |
| **Proveedor** | `provider.extractSlots()` (GroqProvider / GeminiProvider / FallbackProvider) |
| **Propósito** | Extraer slots semánticos (origin, destination, passengers, datetime) desde texto libre multilingüe |
| **Componente consumidor** | Extracción — orquestado por `extract-slots.ts` (O3), activado por `extraction-runner.ts` (O5) |
| **Frecuencia de uso** | 0–1 por mensaje. Solo se activa cuando regex + entity layers no producen ambos slots, o cuando hay indicadores multi-ride. En el escenario nominal (regex+entity cubren), frecuencia = 0 |
| **Parámetros** | `GROQ_EXTRACTION_MAX_TOKENS`, `GROQ_EXTRACTION_TEMPERATURE` (constantes, valores no especificados en CE-1) |
| **Clasificación** | **A — Arquitectónicamente Inevitable** |
| **Justificación técnica** | La extracción de slots desde texto libre en 3 idiomas (español, portugués, inglés) con variabilidad natural (apodos de lugares, frases incompletas, información parcial, ortografía no normativa) es una tarea que no puede resolverse razonablemente con reglas determinísticas. CE-1 Sección 4 documenta que regex + entity layers manejan el subset predecible; el LLM cubre los casos donde la variabilidad lingüística es inherente al medio conversacional. Una solución puramente determinística requeriría cubrir manualmente todas las variaciones posibles en 3 idiomas para ~50 lugares de la triple frontera, lo que constituye una carga de mantenimiento irrazonable |
| **Evidencia CE-1** | Sección 2.3 (C1), Sección 2.4 (O3), Sección 4.1 (0–1 llamada), Sección 5.2 (Extracción), Sección 7.3 (método extractSlots) |

---

### C2 — generateLLMResponse

| Atributo | Valor |
|----------|-------|
| **Archivo** | `src/lib/ai/llm-response.ts` |
| **Función** | `generateLLMResponse()` |
| **Proveedor** | `provider.generateResponse()` (GroqProvider / GeminiProvider / FallbackProvider) |
| **Propósito** | Redactar respuesta final al usuario basada en la política seleccionada, transformando datos estructurados (policy output) en lenguaje natural conversacional |
| **Componente consumidor** | Generación — orquestado por `handler.ts` (O1) |
| **Frecuencia de uso** | 0–1 por mensaje. Se salta cuando `skipLLM` es true: EXECUTE sin placeholder O `purchaseIntent` low. En el escenario nominal (consulta con intención de compra), frecuencia = 1 |
| **Parámetros** | `GROQ_RESPONSE_MAX_TOKENS`, `GROQ_RESPONSE_TEMPERATURE` (constantes, valores no especificados en CE-1) |
| **Clasificación** | **A — Arquitectónicamente Inevitable** |
| **Justificación técnica** | La generación de lenguaje natural fluido, contextual y persuasivo a partir de datos estructurados de política es el caso de uso canónico de LLM en sistemas conversacionales. CE-1 Sección 3.1 documenta que el handler transforma `policy.finalResponse` (template con placeholders) en texto natural. Las alternativas determinísticas (templates estáticos) ya existen como fallback en `buildSafeFallback()` y en la ruta `skipLLM`, y CE-1 Sección 6.4 documenta que el sistema opera exclusivamente con estos templates cuando los LLM no están disponibles — produciendo respuestas funcionales pero sin personalización conversacional |
| **Evidencia CE-1** | Sección 2.3 (C2), Sección 2.4 (O1), Sección 4.1 (0–1 llamada), Sección 5.4 (Generación), Sección 6.4 (impacto operativo) |

---

### C3 — interpretAmbiguity

| Atributo | Valor |
|----------|-------|
| **Archivo** | `src/lib/ai/ambiguity-interpreter.ts` |
| **Función** | `interpretAmbiguity()` |
| **Proveedor** | `provider.interpretAmbiguity()` (GroqProvider / GeminiProvider / FallbackProvider) |
| **Propósito** | Desambiguar nombres de lugares usando contexto geográfico de la triple frontera, eligiendo entre candidatos existentes en DB |
| **Componente consumidor** | Ambigüedad — orquestado por `ambiguity-handler.ts` (O2) |
| **Frecuencia de uso** | 0–4 por mensaje. 2 llamadas paralelas si origin AND dest son ambiguos + hasta 2 retry secuenciales si un slot se resolvió y el otro no |
| **Parámetros** | `maxTokens=10`, `temperature=0.1` — los valores más bajos de todos los consumidores CE-1 |
| **Clasificación** | **C — Reemplazable** |
| **Justificación técnica** | La desambiguación opera sobre un espacio de búsqueda acotado a ~30–50 lugares en 3 países (triple frontera), con datos estructurados existentes en la arquitectura: `place_id`, `canonical_name`, `tourist_relevance_score`, `city`, `country` en el dominio Geo de la DB (documentado en CE-1 Sección 3.1 como `searchPlaces()`). La arquitectura ya contiene componentes determinísticos para este dominio: `RISK_NODES` hardcodeados (ambiguity-handler.ts L57–72) que manejan los 3 casos más frecuentes ("aeropuerto", "centro", "aduana") sin LLM, y `entityExtractSlots()` que resuelve lugares conocidos por nombre canónico. El LLM recibe los mismos candidatos que ya están en la DB y retorna un número del 1 al N — una tarea de clasificación sobre datos existentes. La temperatura extremadamente baja (0.1) y el máximo de tokens (10) indican que el LLM se usa como clasificador determinístico, no como generador. CE-1 Sección 4.4 documenta que `interpretAmbiguity` representa el 40% del máximo teórico de llamadas por mensaje (4 de 10) |
| **Evidencia CE-1** | Sección 2.3 (C3), Sección 2.4 (O2), Sección 3.1 (flujo ambigüedad), Sección 4.1 (0–4 llamadas), Sección 4.4 (40% del total), Sección 5.3 (Ambigüedad), Sección 7.3 (método interpretAmbiguity) |

---

### C4 — generateReinterpretResponse

| Atributo | Valor |
|----------|-------|
| **Archivo** | `src/lib/services/extraction/comprehension-runner.ts` |
| **Función** | `generateReinterpretResponse()` |
| **Proveedor** | `provider.generateResponse()` (GroqProvider / GeminiProvider / FallbackProvider) |
| **Propósito** | Reinterpretar el mensaje del usuario libremente antes de escalar a un operador humano, cuando el score de comprensión es muy bajo (estado ESCALATION) |
| **Componente consumidor** | Comprensión — orquestado por `comprehension-runner.ts` (O4) |
| **Frecuencia de uso** | 0–1 por mensaje. Solo se activa en estado ESCALATION (comprehension score < 0.40 + thresholdAdjustment) y solo si frustration no se activó primero |
| **Parámetros** | `maxTokens=150`, `temperature=0.4` — los parámetros más costosos del componente Comprensión |
| **Clasificación** | **B — Simplificable** |
| **Justificación técnica** | La intención arquitectónica (evitar escalación humana cuando el LLM puede reinterpretar) es válida. Sin embargo, CE-1 Sección 3.1 documenta que esta llamada ocurre al inicio del pipeline, antes de extracción y ambigüedad, y que si retorna un mensaje, short-circuita todo el pipeline posterior (extraction, ambiguity, response generation). Es la llamada más costosa del componente Comprensión (150 tokens, 0.4 temp) y opera en el estado más crítico (ESCALATION). CE-1 Sección 4.1 documenta que ocurre ÚNICAMENTE si frustration no se activó, lo que crea una dependencia secuencial entre C5 y C4 dentro del mismo orquestador |
| **Evidencia CE-1** | Sección 2.3 (C4), Sección 2.4 (O4), Sección 3.1 (flujo comprensión), Sección 4.1 (0–1 llamada, condición), Sección 5.1 (Comprensión) |

---

### C5 — generateFrustrationResponse

| Atributo | Valor |
|----------|-------|
| **Archivo** | `src/lib/services/extraction/comprehension-runner.ts` |
| **Función** | `generateFrustrationResponse()` |
| **Proveedor** | `provider.generateResponse()` (GroqProvider / GeminiProvider / FallbackProvider) |
| **Propósito** | Interpretar mensajes con patrón de frustración y generar respuesta empática de desescalada |
| **Componente consumidor** | Comprensión — orquestado por `comprehension-runner.ts` (O4) |
| **Frecuencia de uso** | 0–1 por mensaje. Solo se activa si el texto del usuario coincide con `FRUSTRATION_RE` (regex de escalation.json) |
| **Parámetros** | `maxTokens=120`, `temperature=0.3` |
| **Clasificación** | **A — Arquitectónicamente Inevitable** |
| **Justificación técnica** | La generación de respuestas empáticas contextualmente apropiadas para usuarios frustrados requiere comprensión del tono emocional específico del mensaje y capacidad de generar lenguaje natural de desescalada. CE-1 Sección 3.1 documenta que la detección de frustración es por regex (FRUSTRATION_RE) pero la respuesta la genera el LLM. No existe alternativa determinística para producir respuestas de desescalada que se adapten al contenido específico de la queja del usuario, su idioma (3 idiomas posibles), y el contexto conversacional. CE-1 Sección 5.1 documenta su propósito como "Interpretar mensajes con patrón de frustración y responder con empatía" |
| **Evidencia CE-1** | Sección 2.3 (C5), Sección 2.4 (O4), Sección 3.1 (flujo comprensión), Sección 4.1 (0–1 llamada, condición), Sección 5.1 (Comprensión) |

---

### C6 — generateContextualRecovery

| Atributo | Valor |
|----------|-------|
| **Archivo** | `src/lib/services/extraction/comprehension.ts` |
| **Función** | `generateContextualRecovery()` |
| **Proveedor** | `provider.generateResponse()` (GroqProvider / GeminiProvider / FallbackProvider) |
| **Propósito** | Generar pregunta aclaratoria contextual cuando la comprensión es baja (estado RECOVERY) y hay ambigüedad de ubicación |
| **Componente consumidor** | Comprensión — orquestado por `comprehension-runner.ts` (O4) vía `getRecoveryMessage()` en `comprehension.ts` |
| **Frecuencia de uso** | 0–1 por mensaje. Solo se activa si `facts` contiene `"location_ambiguous:true"` AND hay texto AND el estado de comprensión es RECOVERY |
| **Parámetros** | `maxTokens=80`, `temperature=0.3` — los parámetros más bajos de todas las llamadas generateResponse |
| **Clasificación** | **B — Simplificable** |
| **Justificación técnica** | El caso de uso es el más acotado de todo el componente Comprensión: solo cuando hay ambigüedad de ubicación concurrente con comprensión baja. CE-1 Sección 4.1 documenta que la arquitectura ya tiene ruta de fallback determinística (`buildGenericClarify()` y `t("recovery.contextual")`) que se ejecuta si el LLM retorna null. Los parámetros (80 tokens, 0.3 temp) son los más bajos de todas las llamadas LLM del sistema, lo que indica que su capacidad de generar variación significativa sobre el template determinístico existente es limitada. CE-1 Sección 2.3 documenta que la función existe en `comprehension.ts` y es invocada desde `getRecoveryMessage()` |
| **Evidencia CE-1** | Sección 2.3 (C6), Sección 2.4 (O4), Sección 4.1 (0–1 llamada, condición), Sección 5.1 (Comprensión) |

---

### C7 — transcribeAudio

| Atributo | Valor |
|----------|-------|
| **Archivo** | `src/lib/ai/transcribe.ts` |
| **Función** | `transcribeAudio()` |
| **Proveedor** | Gemini 2.0 Flash (SDK directo — NO via LLMProvider) |
| **Propósito** | Transcribir audios de WhatsApp (ogg/opus, mp3, wav) a texto para pipeline de lead |
| **Componente consumidor** | Transcripción — invocado desde `lead.service.ts` en `handleConversationSetup()` |
| **Frecuencia de uso** | 0–1 por mensaje. Solo si el mensaje entrante contiene audio (no texto) |
| **Parámetros** | Prompt fijo: `"Transcribe el audio al texto exactamente como se escucha. Devolvé SOLO el texto transcribido, sin introducción ni comentarios."`. Sin parámetros de maxTokens/temperature (SDK directo) |
| **Clasificación** | **A — Arquitectónicamente Inevitable** |
| **Justificación técnica** | La transcripción de audio a texto (speech-to-text) es inherentemente una tarea de inteligencia artificial. No existe alternativa determinística o algorítmica para convertir señales de audio sin procesar en texto estructurado. CE-1 Sección 3.3 documenta que esta llamada es arquitectónicamente distinta de las demás porque no utiliza la interfaz `LLMProvider` ni ninguno de los 3 providers registrados, sino que invoca directamente el SDK de GoogleGenerativeAI. CE-1 Sección 6.1 documenta que depende de `GEMINI_API_KEY`, y Sección 6.2 que no está operativa en producción |
| **Evidencia CE-1** | Sección 2.3 (C7), Sección 3.3 (dependencia transversal), Sección 4.1 (0–1 llamada), Sección 5.5 (Transcripción), Sección 6.1-6.2 (estado producción) |

---

## 2. Resumen Cuantitativo

| Categoría | Cantidad | Puntos de consumo |
|:---------:|:--------:|-------------------|
| **A** — Arquitectónicamente Inevitable | **4** | C1 (generateGroqExtraction), C2 (generateLLMResponse), C5 (generateFrustrationResponse), C7 (transcribeAudio) |
| **B** — Simplificable | **2** | C4 (generateReinterpretResponse), C6 (generateContextualRecovery) |
| **C** — Reemplazable | **1** | C3 (interpretAmbiguity) |
| **D** — Eliminable | **0** | — |
| **Total** | **7** | C1–C7 |

### Distribución por método del provider

| Método del provider | Puntos | Clasificaciones |
|---------------------|:------:|-----------------|
| `generateResponse` | 4 (C2, C4, C5, C6) | A (×2): C2, C5 / B (×2): C4, C6 |
| `extractSlots` | 1 (C1) | A: C1 |
| `interpretAmbiguity` | 1 (C3) | C: C3 |
| SDK directo (Gemini) | 1 (C7) | A: C7 |

### Distribución por parámetros de consumo

| Punto | maxTokens | Temperatura | Clasificación |
|:-----:|:---------:|:-----------:|:-------------:|
| C3 | 10 | 0.1 | C — Reemplazable |
| C6 | 80 | 0.3 | B — Simplificable |
| C5 | 120 | 0.3 | A — Inevitable |
| C4 | 150 | 0.4 | B — Simplificable |
| C1 | (constantes) | (constantes) | A — Inevitable |
| C2 | (constantes) | (constantes) | A — Inevitable |
| C7 | N/A | N/A | A — Inevitable |

---

## 3. Distribución por Componente

### 3.1 Comprensión

| Punto | Clasificación | Justificación |
|:-----:|:-------------:|---------------|
| C5 — generateFrustrationResponse | **A** | Respuesta empática contextualmente adaptada al contenido específico de la queja |
| C4 — generateReinterpretResponse | **B** | Intención válida pero es la llamada más costosa del componente (150 tok, 0.4 temp) y short-circuita el pipeline completo |
| C6 — generateContextualRecovery | **B** | Caso acotado con fallback determinístico existente y parámetros mínimos |

**Carga cognitiva del componente:** 3 puntos de consumo, 2 clasificaciones distintas (A, B). Es el componente con mayor cantidad de puntos de consumo y mayor diversidad de clasificaciones.

### 3.2 Extracción

| Punto | Clasificación | Justificación |
|:-----:|:-------------:|---------------|
| C1 — generateGroqExtraction | **A** | Texto libre multilingüe → estructura semántica, variabilidad inherente al lenguaje humano |

**Carga cognitiva del componente:** 1 punto de consumo, clasificación A. Es el único punto A con retorno de objeto JSON estructurado (no texto libre).

### 3.3 Ambigüedad

| Punto | Clasificación | Justificación |
|:-----:|:-------------:|---------------|
| C3 — interpretAmbiguity | **C** | Espacio acotado (~50 lugares), datos DB existentes, RISK_NODES hardcodeados ya implementados, salida es un dígito clasificador |

**Carga cognitiva del componente:** 1 punto de consumo, clasificación C (reemplazable). Aporta el 40% del máximo teórico de llamadas por mensaje (4 de 10).

### 3.4 Generación

| Punto | Clasificación | Justificación |
|:-----:|:-------------:|---------------|
| C2 — generateLLMResponse | **A** | Generación de lenguaje natural conversacional desde datos estructurados |

**Carga cognitiva del componente:** 1 punto de consumo, clasificación A. Es el punto de consumo con mayor impacto en la experiencia del usuario final.

### 3.5 Transcripción

| Punto | Clasificación | Justificación |
|:-----:|:-------------:|---------------|
| C7 — transcribeAudio | **A** | Speech-to-text, inherentemente IA, sin alternativa determinística |

**Carga cognitiva del componente:** 1 punto de consumo, clasificación A. Es el único punto que no utiliza la interfaz LLMProvider.

### 3.6 Resumen de distribución

| Componente | Puntos LLM | Clasificaciones | Carga |
|------------|:----------:|-----------------|:-----:|
| **Comprensión** | 3 | A, B, B | **Más puntos / más diversa** |
| **Extracción** | 1 | A | Unitaria |
| **Ambigüedad** | 1 | C | Unitaria — reemplazable |
| **Generación** | 1 | A | Unitaria — alto impacto UX |
| **Transcripción** | 1 | A | Unitaria — vía SDK directo |
| **Total** | **7** | A=4, B=2, C=1, D=0 | — |

---

## 4. Riesgo Arquitectónico

### 4.1 Componentes con mayor dependencia de LLM

| Componente | Puntos LLM | % del total | Clasificaciones | Factor de riesgo |
|------------|:----------:|:-----------:|:----------------:|:-----------------|
| **Comprensión** | 3 | 42.9% | A, B, B | **Alta concentración**: 3 de los 7 puntos residen en un solo componente funcional. 2 de los 3 son clasificación B (simplificables), lo que indica que el componente tiene tanto dependencias inevitables como optimizables |
| **Ambigüedad** | 1 (×4 llamadas) | 14.3% (40% del tráfico) | C | **Alta frecuencia por mensaje**: aunque es un solo punto de consumo, su tasa de repetición (hasta 4 llamadas por mensaje) lo convierte en el mayor contribuyente individual al presupuesto cognitivo máximo. Su clasificación C (reemplazable) significa que esta alta frecuencia recae sobre una dependencia que la arquitectura podría resolver sin LLM |

### 4.2 Concentración de llamadas por método del provider

| Método | Puntos | Llamadas máximas | % del presupuesto | Riesgo |
|--------|:------:|:----------------:|:-----------------:|--------|
| `generateResponse` | 4 | 4 | 40% | **Alta dependencia**: 4 de 7 puntos usan este método. Si el provider falla, 4 funcionalidades distintas se pierden simultáneamente |
| `interpretAmbiguity` | 1 | 4 | 40% | **Alta frecuencia**: 1 punto pero 4 llamadas. Si falla, se pierde toda la desambiguación LLM |
| `extractSlots` | 1 | 1 | 10% | Baja frecuencia pero alta criticidad (extracción de datos) |
| SDK directo | 1 | 1 | 10% | Aislado, no comparte riesgo con los demás |

### 4.3 Concentración de riesgo por orquestador

| Orquestador | Puntos que activa | Llamadas máximas | Riesgo |
|-------------|:-----------------:|:----------------:|--------|
| O4 — `comprehension-runner.ts` | C4, C5, C6 | 3 | **Alto**: un solo orquestador maneja el 42.9% de los puntos de consumo. Si el orquestador falla o tiene un bug, 3 funcionalidades se ven afectadas |
| O2 — `ambiguity-handler.ts` | C3 | 4 | **Alto por frecuencia**: aunque un solo punto, el orquestador puede dispararlo hasta 4 veces por mensaje. Representa el 40% del tráfico LLM máximo |
| O1 — `handler.ts` | C2 | 1 | **Crítico por impacto UX**: afecta la respuesta al usuario |
| O3 — `extract-slots.ts` | C1 | 1 | **Crítico por datos**: afecta la capacidad de extraer slots |
| O5 — `extraction-runner.ts` | C1 (delega en O3) | 1 | Bajo (delega completamente) |

### 4.4 Dependencias secuenciales

CE-1 Sección 3.1 documenta que el pipeline en `lead.service.ts` ejecuta los componentes en este orden:
1. `runComprehensionCheck()` (O4) — si retorna `halted=true`, el pipeline se detiene aquí
2. `runExtractionPipeline()` (O5 → O3)
3. `startAmbiguityResolution()` (O2)
4. `handleMessage()` (O1)

Esta secuencia implica que:
- C4 y C6 (Comprensión, clasificación B) pueden short-circuitar a C1, C3 y C2 si comprehension falla
- C5 (Comprensión, clasificación A) puede short-circuitar a C4 y al resto del pipeline
- C1 (Extracción, clasificación A) es prerrequisito para C3 (Ambigüedad, clasificación C) — sin slots extraídos no hay ambigüedad que resolver
- C3 (Ambigüedad, clasificación C) es prerrequisito para C2 (Generación, clasificación A) — los slots resueltos alimentan la respuesta

---

## 5. Conclusión Descriptiva

### 5.1 Estado de la inevitabilidad

De los 7 puntos de consumo LLM identificados en CE-1, 4 son clasificados como arquitectónicamente inevitables (A), 2 como simplificables (B), y 1 como reemplazable (C). Ninguno fue clasificado como eliminable (D).

### 5.2 Distribución de la carga inevitable

Las 4 llamadas clasificadas como A representan las capacidades centrales del sistema conversacional: transcripción de audio, extracción de slots de texto libre, generación de respuesta al usuario, y manejo empático de frustración. Estas 4 llamadas cubren 4 categorías funcionales distintas (Transcripción, Extracción, Generación, Comprensión) y utilizan 3 mecanismos de invocación diferentes (extractSlots, generateResponse, SDK directo).

### 5.3 Componente con mayor densidad de consumo

El componente Comprensión concentra 3 de los 7 puntos de consumo (42.9%), distribuidos en 2 clasificaciones (A y B). Es el componente con mayor cantidad de puntos LLM y la única categoría funcional que contiene más de un punto de consumo.

### 5.4 Punto con mayor frecuencia individual

El punto C3 (interpretAmbiguity, clasificación C) puede ser invocado hasta 4 veces por mensaje, representando el 40% del máximo teórico de llamadas. Es el único punto clasificado como C (reemplazable) y también el de mayor frecuencia de repetición.

### 5.5 Ausencia de puntos eliminables

Ningún punto de consumo fue clasificado como D. Todos los puntos LLM existentes tienen una función arquitectónica documentada en CE-1, incluso aquellos que podrían ser reemplazados (C3) o simplificados (C4, C6).

### 5.6 Relación entre clasificación y parámetros

Los puntos con clasificación A presentan parámetros variados: desde sin parámetros (C7, SDK directo) hasta constantes de configuración (C1, C2). Los puntos con clasificación B presentan parámetros intermedios (80–150 tokens, 0.3–0.4 temp). El punto con clasificación C presenta los parámetros más restrictivos (10 tokens, 0.1 temp), lo que indica que el LLM se usa como clasificador determinístico en lugar de generador.

### 5.7 Riesgo por orquestación secuencial

La orquestación secuencial documentada en CE-1 implica que los puntos con clasificación A (inevitables) dependen del éxito de los puntos con clasificación B y C que los preceden en el pipeline. C4 (B) y C6 (B) pueden short-circuitar al resto de la pipeline. C3 (C) opera sobre datos producidos por C1 (A). C2 (A) consume datos producidos por C3 (C) y C1 (A).

---

*Fin de CE-2 — Clasificación de Inevitabilidad Arquitectónica. Este documento constituye la entrada objetiva para CE-3.*
