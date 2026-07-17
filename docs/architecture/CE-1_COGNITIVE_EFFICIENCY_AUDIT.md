# CE-1 — Cognitive Efficiency Audit

> **Fecha:** 2026-07-15  
> **Driver:** Establecer la línea base (baseline) del consumo cognitivo del sistema — inventario, dependencias, presupuesto, y estado actual de producción  
> **Rol:** Arquitecto Principal  
> **Precedencia:** BLACKBOX-15 (simulación externa), DEBT-14F (auditoría camino de fallo LLM)  
> **Documentos relacionados:** FCER-1 (First Cognitive Evidence Report), ADR-005 (AI-first architecture)

---

## Preámbulo

Este documento constituye la auditoría formal del consumo cognitivo del sistema TaxiGuazú. Se inventarían, clasifican y mapean todos los puntos de consumo de Large Language Models (LLM) en la base de código, sin emitir juicios de diseño, sin clasificar llamadas como adecuadas o inadecuadas, y sin proponer refactorizaciones.

**No se revisan contratos. No se proponen rediseños. No se emiten recomendaciones arquitectónicas.** Solo se registra objetivamente el estado actual del sistema para servir como línea base (baseline) de la Serie CE.

---

## 1. Resumen Ejecutivo

### 1.1 Objetivo de la auditoría

Establecer el inventario completo, el mapa de dependencias, el presupuesto cognitivo, y el estado actual de producción de todos los puntos de consumo LLM en el sistema TaxiGuazú, creando la línea base arquitectónica para la Serie CE de optimización cognitiva.

### 1.2 Alcance

| Dimensión | Cobertura |
|-----------|-----------|
| Código fuente | `src/lib/ai/`, `src/lib/services/extraction/`, `src/lib/services/workflow/`, `src/lib/pattern-discovery/`, `src/lib/memory/` |
| Providers | Groq, Gemini, Fallback |
| Consumidores directos | 6 módulos orquestadores + 1 transcripción |
| Archivos de soporte | Prompt generators, knowledge data, escalation policies |
| Archivos excluidos | Tests (`*.test.ts`, `*.spec.ts`), migraciones, configuración de infraestructura |

### 1.3 Metodología utilizada

1. **Búsqueda sistemática**: grep de todos los patrones `getLLMProvider()`, `provider.extractSlots()`, `provider.generateResponse()`, `provider.interpretAmbiguity()`, `transcribeAudio()`, y cualquier llamada directa a SDKs de IA (GoogleGenAI, Groq SDK) en el directorio `src/lib/`
2. **Trazado de flujo**: para cada punto de consumo, se identificó archivo, línea, tipo de llamada (método del provider), modo de invocación (directa o vía wrapper), y consumer que la dispara
3. **Verificación de productor**: confirmación de que cada llamada LLM tiene un provider registrado que la implementa
4. **Mapeo de orquestación**: reconstrucción del flujo de ejecución desde el webhook entrante hasta cada punto de consumo LLM
5. **Cómputo de presupuesto**: para cada ruta de ejecución, cálculo del mínimo y máximo de llamadas LLM posibles por mensaje

---

## 2. Inventario Completo

### 2.1 Providers

| # | Archivo | Clase | Métodos LLM expuestos | SDK | Líneas |
|---|---------|-------|-----------------------|-----|--------|
| P1 | `src/lib/ai/providers/groq-provider.ts` | `GroqProvider` | `extractSlots` (L19), `generateResponse` (L42), `interpretAmbiguity` (L62) | `groq-sdk` (llama-3.3-70b-versatile) | 81 |
| P2 | `src/lib/ai/providers/gemini-provider.ts` | `GeminiProvider` | `extractSlots` (L22), `generateResponse` (L44), `interpretAmbiguity` (L64) | `@google/generative-ai` (gemini-2.0-flash) | 83 |
| P3 | `src/lib/ai/providers/fallback-provider.ts` | `FallbackProvider` | `extractSlots` (L24), `generateResponse` (L35), `interpretAmbiguity` (L46) | Composicion: Gemini → Groq | 56 |

**Total providers: 3**

Cada provider expone exactamente 3 métodos:
- `extractSlots(prompt, maxTokens, temperature) → Promise<Record<string, any> | null>`
- `generateResponse(prompt, maxTokens, temperature) → Promise<string | null>`
- `interpretAmbiguity(prompt, maxTokens, temperature) → Promise<string | null>`

### 2.2 Factory / Wrapper

| # | Archivo | Función | Propósito | Líneas |
|---|---------|---------|-----------|--------|
| W1 | `src/lib/ai/llm-provider.ts` | `getLLMProvider()` | Factory singleton: lee `LLM_PROVIDER` env var (default `"fallback"`), retorna `GeminiProvider`, `GroqProvider`, o `FallbackProvider` | L27 |

**Total wrappers: 1**

### 2.3 Consumidores Directos

Llaman a un método de `LLMProvider` directamente (no a través de otro wrapper):

| # | Archivo | Función | Método provider | Parámetros (maxTokens, temp) | Línea |
|---|---------|---------|-----------------|------------------------------|-------|
| C1 | `src/lib/ai/groq.ts` | `generateGroqExtraction()` | `provider.extractSlots()` | `GROQ_EXTRACTION_MAX_TOKENS`, `GROQ_EXTRACTION_TEMPERATURE` | L60 |
| C2 | `src/lib/ai/llm-response.ts` | `generateLLMResponse()` | `provider.generateResponse()` | `GROQ_RESPONSE_MAX_TOKENS`, `GROQ_RESPONSE_TEMPERATURE` | L375 |
| C3 | `src/lib/ai/ambiguity-interpreter.ts` | `interpretAmbiguity()` | `provider.interpretAmbiguity()` | `10`, `0.1` | L84 |
| C4 | `src/lib/services/extraction/comprehension-runner.ts` | `generateReinterpretResponse()` | `provider.generateResponse()` | `150`, `0.4` | L181 |
| C5 | `src/lib/services/extraction/comprehension-runner.ts` | `generateFrustrationResponse()` | `provider.generateResponse()` | `120`, `0.3` | L221 |
| C6 | `src/lib/services/extraction/comprehension.ts` | `generateContextualRecovery()` | `provider.generateResponse()` | `80`, `0.3` | L260 |

**Total consumidores directos: 6**

Adicionalmente, existe un consumidor directo de un SDK de IA que **no** utiliza la interfaz `LLMProvider`:

| # | Archivo | Función | SDK | Modelo | Línea |
|---|---------|---------|-----|--------|-------|
| C7 | `src/lib/ai/transcribe.ts` | `transcribeAudio()` | `GoogleGenerativeAI` directo | `gemini-2.0-flash` | L55 |

### 2.4 Orquestadores

Módulos que deciden **cuándo y si** se invocan los consumidores directos. No contienen llamadas LLM propias, sino que activan condicionalmente a los consumidores:

| # | Archivo | Función/es | Consumidores que activa | Condiciones de activación |
|---|---------|------------|------------------------|---------------------------|
| O1 | `src/lib/ai/handler.ts` | `handleMessage()` | `generateLLMResponse()` (C2) | `policy.decision !== "SAFE_FALLBACK"` AND NOT `skipLLM` (EXECUTE sin placeholder O purchaseIntent low) |
| O2 | `src/lib/services/workflow/ambiguity-handler.ts` | `startAmbiguityResolution()` | `interpretAmbiguity()` (C3) vía `ambiguity-interpreter.ts` | Hasta 2 llamadas paralelas si origin/dest son ambiguos; hasta 2 retry secuenciales si un slot se resolvió y el otro no |
| O3 | `src/lib/services/extraction/extract-slots.ts` | `extractSlots()` | `generateGroqExtraction()` (C1) | SÓLO si regex + entity layers no produjeron ambos slots (origin AND destination); o si hay indicadores multi-ride |
| O4 | `src/lib/services/extraction/comprehension-runner.ts` | `runComprehensionCheck()` | `generateReinterpretResponse()` (C4), `generateFrustrationResponse()` (C5), `generateContextualRecovery()` (C6 vía `comprehension.ts`) | Frustration: si el texto coincide con `FRUSTRATION_RE`. Reinterpret: si comprehensionState es ESCALATION. Recovery: si comprehensionState es RECOVERY |
| O5 | `src/lib/services/extraction/extraction-runner.ts` | `runExtractionPipeline()` | `generateGroqExtraction()` (C1) vía `extract-slots.ts` | Delega en `extractSlots()` (O3) |

**Total orquestadores: 5**

### 2.5 Resumen de inventario

| Categoría | Cantidad |
|-----------|:--------:|
| Providers | 3 |
| Wrappers (factory) | 1 |
| Consumidores directos (vía LLMProvider) | 6 |
| Consumidores directos (vía SDK propio) | 1 |
| Orquestadores | 5 |
| **Puntos de consumo LLM totales** | **12 archivos** |

---

## 3. Mapa de Dependencias

### 3.1 Diagrama de flujo completo

```
Webhook entrante (POST /api/webhook)
  │
  ▼
lead.service.ts ───────────────────────────────────────────────────┐
  │                                                                │
  ├─ handleConversationSetup() ←───────────────────────────────────┤
  │  ├─ Si audio: transcribeAudio() (C7 → Gemini SDK directo)      │
  │  └─ Si texto: continúa                                         │
  │                                                                │
  ├─ runComprehensionCheck() (O4)                                  │
  │  ├─ Si frustration detectada: generateFrustrationResponse()    │
  │  │   └─ C5 → provider.generateResponse() (120 tok, 0.3)       │
  │  ├─ Si ESCALATION: generateReinterpretResponse()               │
  │  │   └─ C4 → provider.generateResponse() (150 tok, 0.4)       │
  │  ├─ Si ESCALATION falla: escalación humana (sin LLM)          │
  │  └─ Si RECOVERY: generateContextualRecovery()                  │
  │      └─ C6 → provider.generateResponse() (80 tok, 0.3)        │
  │                                                                │
  ├─ runExtractionPipeline() (O5)                                  │
  │  └─ extractSlots() (O3)                                        │
  │     ├─ Si multi-ride indicators → directo a C1                 │
  │     ├─ regexExtractSlots() (sin LLM)                           │
  │     ├─ entityExtractSlots() (sin LLM)                          │
  │     └─ Si regex+entity no produjeron ambos slots:              │
  │         └─ generateGroqExtraction() (C1)                       │
  │            └─ provider.extractSlots()                          │
  │                                                                │
  ├─ startAmbiguityResolution() (O2)                               │
  │  └─ Si origin/dest tienen >1 candidato en DB:                   │
  │     ├─ interpretAmbiguity() (C3) x2 paralelas (origin+dest)    │
  │     │   └─ provider.interpretAmbiguity() (10 tok, 0.1)         │
  │     └─ Si 1 slot resuelto y otro no:                           │
  │        └─ interpretAmbiguity() (C3) x1 o x2 retry con contexto │
  │                                                                │
  └─ handleMessage() (O1)                                          │
     └─ Si NOT skipLLM:                                            │
        └─ generateLLMResponse() (C2)                              │
           └─ provider.generateResponse()                          │
              (GROQ_RESPONSE_MAX_TOKENS, GROQ_RESPONSE_TEMPERATURE)│
```

### 3.2 Dependencias entre capas

```
Provider Layer                    │  Wrapper Layer       │  Consumer Layer
──────────────────────────────────│──────────────────────│────────────────────
GeminiProvider (gemini-2.0-flash) │                     │  groq.ts (C1)
GroqProvider (llama-3.3-70b)     │  llm-provider.ts     │  llm-response.ts (C2)
FallbackProvider                  │  (getLLMProvider)   │  ambiguity-interpreter.ts (C3)
  ├─ GeminiProvider (primary)     │   └─ singleton      │  comprehension-runner.ts (C4, C5)
  └─ GroqProvider (fallback)     │                      │  comprehension.ts (C6)
                                  │                      │  transcribe.ts (C7 — NO via wrapper)
                                  │                      │     └─ GoogleGenAI directo
```

### 3.3 Dependencia transversal (transcripción)

`transcribeAudio()` (C7) utiliza `GoogleGenerativeAI` directamente con `gemini-2.0-flash`, sin pasar por `llm-provider.ts`. Lee `GEMINI_API_KEY` desde `getEnv()`. Si la clave no está configurada, retorna un fallback textual `"🎤 [mensaje de voz]"` sin llamar a la API.

---

## 4. Presupuesto Cognitivo

### 4.1 Por componente

| Componente | Llamadas mínimas | Llamadas máximas | Condición de activación |
|------------|:----------------:|:-----------------:|-------------------------|
| `transcribeAudio()` (C7) | 0 | 1 | Solo si el mensaje contiene audio |
| `generateFrustrationResponse()` (C5) | 0 | 1 | Solo si texto coincide con `FRUSTRATION_RE` |
| `generateReinterpretResponse()` (C4) | 0 | 1 | Solo si comprehension ESCALATION (y frustration no activó) |
| `generateContextualRecovery()` (C6) | 0 | 1 | Solo si comprehension RECOVERY |
| `generateGroqExtraction()` (C1) | 0 | 1 | Solo si regex+entity no produjeron ambos slots (o multi-ride) |
| `interpretAmbiguity()` (C3) | 0 | 4 | 2 paralelas si origin AND dest ambiguos + hasta 2 retry |
| `generateLLMResponse()` (C2) | 0 | 1 | Solo si NOT skipLLM (EXECUTE con placeholder O purchaseIntent no low) |

### 4.2 Escenarios de consumo

| Escenario | Llamadas | Composición |
|-----------|:--------:|-------------|
| **Mínimo teórico** (mensaje simple, sin audio, regex+entity cubren todo, sin ambigüedad, comprehension FULL_CONTROL, skipLLM) | **0** | Ninguna llamada LLM |
| **Mínimo con respuesta LLM** (sin audio, regex+entity cubren, sin ambigüedad, FULL_CONTROL, skipLLM=false) | **1** | generateLLMResponse |
| **Audio simple** (sin comprehension, regex+entity cubren, sin ambigüedad, skipLLM) | **1** | transcribeAudio |
| **Comprehensión media** (RECOVERY, sin audio, regex+entity cubren, sin ambigüedad) | **2** | generateContextualRecovery + generateLLMResponse |
| **Ambigüedad completa** (FULL_CONTROL, regex+entity fallan, origin+dest ambiguos, LLM resuelve ambos) | **6** | generateGroqExtraction + interpretAmbiguity×4 + generateLLMResponse |
| **Audio + comprensión baja + extracción + ambigüedad completa + respuesta** | **10** | transcribeAudio + generateFrustrationResponse + generateGroqExtraction + interpretAmbiguity×4 + generateReinterpretResponse + generateLLMResponse |

### 4.3 Máximo teórico por mensaje

**10 llamadas LLM** por mensaje individual de usuario, compuesto por:

```
 1. transcribeAudio          (C7 — solo si audio)
 2. generateFrustrationResponse  (C5 — solo si frustration detectada)
 3. generateGroqExtraction   (C1 — si extracción incompleta)
 4. interpretAmbiguity (origin)     (C3 — si origin ambiguo)
 5. interpretAmbiguity (dest)       (C3 — si dest ambiguo)
 6. interpretAmbiguity retry (dest) (C3 — si origin resuelto, dest no)
 7. interpretAmbiguity retry (origin)(C3 — si dest resuelto, origin no)
 8. generateReinterpretResponse (C4 — si comprehension ESCALATION)
 9. generateContextualRecovery  (C6 — si comprehension RECOVERY)
10. generateLLMResponse      (C2 — si NOT skipLLM)
```

### 4.4 Distribución por método del provider

| Método del provider | Consumidores | Llamadas máximas | % del total |
|---------------------|:------------:|:----------------:|:-----------:|
| `generateResponse` | C2, C4, C5, C6 | 4 | 40% |
| `interpretAmbiguity` | C3 | 4 | 40% |
| `extractSlots` | C1 | 1 | 10% |
| Gemini SDK directo | C7 | 1 | 10% |

---

## 5. Clasificación Funcional

### 5.1 Comprensión

| Punto | Archivo | Función | Llamada LLM | Propósito |
|-------|---------|---------|-------------|-----------|
| C5 | `comprehension-runner.ts` | `generateFrustrationResponse()` | `provider.generateResponse()` | Interpretar mensajes con patrón de frustración y responder con empatía |
| C4 | `comprehension-runner.ts` | `generateReinterpretResponse()` | `provider.generateResponse()` | Reinterpretar mensaje libremente antes de escalar a humano |
| C6 | `comprehension.ts` | `generateContextualRecovery()` | `provider.generateResponse()` | Generar pregunta aclaratoria contextual cuando la comprensión es baja |

### 5.2 Extracción

| Punto | Archivo | Función | Llamada LLM | Propósito |
|-------|---------|---------|-------------|-----------|
| C1 | `groq.ts` | `generateGroqExtraction()` | `provider.extractSlots()` | Extraer slots (origin, destination, passengers, datetime) de texto libre |

### 5.3 Ambigüedad

| Punto | Archivo | Función | Llamada LLM | Propósito |
|-------|---------|---------|-------------|-----------|
| C3 | `ambiguity-interpreter.ts` | `interpretAmbiguity()` | `provider.interpretAmbiguity()` | Desambiguar nombres de lugares con contexto geográfico |

### 5.4 Generación

| Punto | Archivo | Función | Llamada LLM | Propósito |
|-------|---------|---------|-------------|-----------|
| C2 | `llm-response.ts` | `generateLLMResponse()` | `provider.generateResponse()` | Redactar respuesta final al usuario basada en la política seleccionada |

### 5.5 Transcripción

| Punto | Archivo | Función | Llamada LLM | Propósito |
|-------|---------|---------|-------------|-----------|
| C7 | `transcribe.ts` | `transcribeAudio()` | `Gemini 2.0 Flash` (SDK directo) | Transcribir audios WhatsApp a texto |

### 5.6 Resumen de clasificación

| Categoría | Cantidad de puntos | % del total |
|-----------|:------------------:|:-----------:|
| Comprensión | 3 | 30% |
| Extracción | 1 | 10% |
| Ambigüedad | 1 | 10% |
| Generación | 1 | 10% |
| Transcripción | 1 | 10% |
| **Total puntos de consumo (calls)** | **10** | 100% |

---

## 6. Estado Actual de Producción

### 6.1 Providers disponibles

| Provider | Variable de entorno requerida | Configurado en Vercel | Estado en producción |
|----------|------------------------------|:---------------------:|:--------------------:|
| Groq (llama-3.3-70b-versatile) | `GROQ_API_KEY` | ✅ Sí | ⚠️ **429 Rate Limit** (100K tokens/día excedido) |
| Gemini (gemini-2.0-flash) | `GEMINI_API_KEY` | ❌ **No configurado** | ❌ **No disponible** |
| Fallback (Gemini → Groq) | Ambas | Parcial | ❌ **Ambos providers fallan** |

### 6.2 Providers operativos en producción

| Provider | Operativo | Causa de no operatividad |
|----------|:---------:|--------------------------|
| GroqProvider | ❌ | Rate limit diario excedido (HTTP 429) |
| GeminiProvider | ❌ | `GEMINI_API_KEY` no definida en entorno de producción |
| FallbackProvider | ❌ | Gemini no puede inicializar (sin API key), cae a Groq que responde 429 |
| Transcripción (Gemini directo) | ❌ | Depende de `GEMINI_API_KEY` — no configurada en Vercel |

### 6.3 Bloqueantes actuales

| ID | Bloqueante | Componentes afectados | Detalle |
|:--:|------------|-----------------------|---------|
| B1 | GROQ rate limit 100K TPD | Todos los consumidores (C1-C6) vía GroqProvider o FallbackProvider → Groq | 429 Too Many Requests. No se puede restablecer hasta nuevo ciclo de rate limit |
| B2 | GEMINI_API_KEY no configurada en Vercel | GeminiProvider (no puede instanciarse), transcribe.ts | El FallbackProvider detecta que Gemini no puede inicializar y cae a Groq — que también falla |

### 6.4 Impacto operativo

- **0% de llamadas LLM funcionales en producción**
- Todos los consumidores LLM (C1-C7) retornan `null` tras intentar y fallar
- El sistema opera exclusivamente con:
  - Templates estáticos (POLICY: policyAhora, policyReserva, SAFE_FALLBACK)
  - Extracción sin LLM (regex + entity layers en extract-slots.ts)
  - Transcripción con fallback `"🎤 [mensaje de voz]"`
  - Desambiguación sin LLM (risk nodes hardcodeados + preguntas genéricas)
- Los mensajes se envían al usuario, pero sin personalización LLM

---

## 7. Baseline Arquitectónico

### 7.1 Métricas cuantitativas

| Métrica | Valor |
|---------|:-----:|
| Proveedores de LLM (implementaciones de interfaz) | 3 |
| Proveedores de LLM (vía SDK directo, sin interfaz) | 1 |
| Interfaces de provider | 1 (`LLMProvider` con 3 métodos) |
| Wrappers / factory | 1 (`getLLMProvider()` singleton) |
| Consumidores directos de provider | 6 |
| Consumidores directos de SDK (no provider) | 1 |
| Orquestadores | 5 |
| Archivos con consumo LLM | 12 |
| Puntos de llamada LLM en código | 10 (llamadas individuales a provider/SDK) |
| **Total puntos de consumo LLM** | **12 archivos** |
| **Máximo teórico de llamadas por mensaje** | **10** |
| **Mínimo teórico de llamadas por mensaje** | **0** |

### 7.2 Infraestructura cognitiva

| Componente | Existencia | Detalle |
|------------|:----------:|---------|
| Cache de respuestas LLM | ❌ **No existe** | No se almacenan respuestas previas para reutilización |
| Circuit breaker para providers | ❌ **No existe** | No hay mecanismo que detenga llamadas tras N fallos consecutivos |
| Presupuesto cognitivo por request | ❌ **No existe** | No hay límite de llamadas LLM por mensaje; el máximo teórico es 10 |
| Presupuesto cognitivo por sesión | ❌ **No existe** | No hay acumulador de consumo LLM por conversación |
| Rate limiting interno | ❌ **No existe** | No hay control de frecuencia entre componentes |
| Escalamiento explícito de inteligencia | ❌ **No existe** | No hay un mecanismo centralizado que decida qué nivel de procesamiento aplicar; cada orquestador decide independientemente |
| Feature flag de LLM | ❌ **No existe** | No hay un interruptor global que desactive el consumo LLM |
| Tiempo de espera (timeout) por provider | ✅ **Existe** | 5000ms en GroqProvider; timeout implícito en Gemini SDK |
| Logging de llamado a LLM | ✅ **Existe** | Logs por componente con prefijo `[GROQ_*]`, `[GEMINI_*]`, `[LLM_RESPONSE]`, `[AMBIGUITY_LLM]`, `[REINTERPRET_LLM]`, `[FRUSTRATION_LLM]`, `[RECOVERY_LLM]` |
| Logging de errores de LLM | ✅ **Existe** | Cada consumidor captura y registra errores vía `log.warn`/`log.error` |

### 7.3 Distribución de métodos del provider

| Método | Implementado por | Consumidores |
|--------|-----------------|:------------:|
| `extractSlots` | GroqProvider, GeminiProvider, FallbackProvider | 1 (C1) |
| `generateResponse` | GroqProvider, GeminiProvider, FallbackProvider | 4 (C2, C4, C5, C6) |
| `interpretAmbiguity` | GroqProvider, GeminiProvider, FallbackProvider | 1 (C3) |
| (SDK directo) | Solo Gemini (transcribe) | 1 (C7) |

### 7.4 Proveedores no LLM (sin consumo cognitivo)

| Módulo | Archivo | Verificación |
|--------|---------|:------------:|
| Pattern Discovery | `src/lib/pattern-discovery/` | ✅ 0 llamadas LLM — procesamiento puramente algorítmico |
| Memory Service | `src/lib/memory/` | ✅ 0 llamadas LLM — solo persistencia y consulta de datos |
| Slot Confirmation | `src/lib/services/workflow/slot-confirmation-handler.ts` | ✅ 0 llamadas LLM — flujo determinista |
| Slot Confirmation Text | `src/lib/services/workflow/slot-confirmation-text-handler.ts` | ✅ 0 llamadas LLM — flujo determinista |

---

## 8. Conclusiones

### 8.1 Estado del inventario

El sistema TaxiGuazú contiene 12 archivos que participan directa o indirectamente en el consumo de LLM, distribuidos en 3 providers, 1 factory, 7 consumidores (6 a través de la interfaz `LLMProvider`, 1 vía SDK directo), y 5 orquestadores. Cada provider implementa exactamente 3 métodos, totalizando 9 implementaciones de método sobre una interfaz común.

Existe un consumidor (`transcribe.ts`) que no utiliza la interfaz `LLMProvider` ni ninguno de los providers registrados, sino que invoca directamente el SDK de GoogleGenerativeAI para transcripción de audio.

### 8.2 Estado del presupuesto

El sistema no tiene límite explícito de llamadas LLM por mensaje. El máximo teórico es de 10 llamadas por mensaje entrante, compuesto por 1 transcripción + 3 comprensión + 1 extracción + 4 desambiguación + 1 generación de respuesta. El mínimo teórico es 0 llamadas (cuando regex+entity cubren extracción, no hay ambigüedad, comprehension es FULL_CONTROL, y skipLLM se activa).

### 8.3 Estado de la orquestación

El flujo de decisión para activar o no una llamada LLM está distribuido en 5 orquestadores independientes: `handler.ts` decide si genera respuesta LLM, `comprehension-runner.ts` decide sobre comprensión, `extract-slots.ts` decide sobre extracción, `ambiguity-handler.ts` decide sobre desambiguación, y `extraction-runner.ts` delega en `extract-slots.ts`. Cada orquestador opera con criterios propios y sin coordinación centralizada sobre el presupuesto cognitivo total.

### 8.4 Estado de infraestructura cognitiva

El sistema carece de: cache de respuestas LLM, circuit breaker para providers, presupuesto cognitivo por request o sesión, rate limiting interno, escalamiento explícito de inteligencia, y feature flag global de LLM. Existe logging individual por componente y timeout de 5000ms configurado en GroqProvider.

### 8.5 Estado de producción

Ninguno de los providers LLM se encuentra operativo en el entorno de producción al momento de esta auditoría. GroqProvider responde con HTTP 429 (rate limit excedido) y GeminiProvider no puede instanciarse por ausencia de `GEMINI_API_KEY`. El sistema continúa funcionando mediante templates estáticos, extracción sin LLM, y desambiguación por reglas hardcodeadas. Todos los mensajes se entregan al usuario, pero sin personalización ni procesamiento inteligente.

---

*Fin de CE-1 — Cognitive Efficiency Audit. Este documento constituye la línea base oficial del consumo cognitivo del sistema para la Serie CE.*
