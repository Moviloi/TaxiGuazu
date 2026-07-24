# CE-3B — Deterministic Reasoning Layer: Diseño Arquitectónico

> **Fecha:** 2026-07-15  
> **Driver:** Diseñar una nueva capa arquitectónica (DRL) responsable de resolver decisiones mediante reglas determinísticas antes de escalar a un LLM, consumiendo conocimiento del Business Knowledge Engine  
> **Rol:** Arquitecto Principal  
> **Prerrequisitos:** CE-1 (Cognitive Efficiency Audit), CE-2 (Inevitability Classification), CE-3A (Business Knowledge Engine)  
> **Documentos relacionados:** CE-3A (BKE), CE-1 (baseline), CE-2 (clasificación)  

---

> **Estado:** ARCHIVE CANDIDATE — Diseño redefinido por ADR-014 (2026-07-20). Código DRL eliminado de `src/lib/drl/`. El Cognitive Escalation Principle (ADR-012) se preserva como diseño conceptual para re-evaluación post-v1. Este documento se conserva como referencia de diseño y trazabilidad histórica.

## Preámbulo

Este documento define la arquitectura conceptual de la Deterministic Reasoning Layer (DRL), una nueva capa del sistema que aplica reglas determinísticas sobre los datos provistos por el Business Knowledge Engine (BKE) para producir decisiones, antes de escalar a un LLM.

Las tres nuevas capas de la Serie CE forman un stack de inteligencia escalonado:

| Capa | Responsabilidad | Pregunta que responde |
|:----:|-----------------|-----------------------|
| **BKE** | Conocimiento del dominio | ¿Qué datos existen? |
| **DRL** | Razonamiento determinístico | ¿Qué decisión tomamos con esos datos? |
| **LLM** | Generación y comprensión natural | ¿Cómo lo expresamos o interpretamos? |

La DRL **no almacena conocimiento** (esa es responsabilidad del BKE). La DRL **no reemplaza al BKE** (lo consume). La DRL **no genera lenguaje natural** (esa es responsabilidad del LLM). La DRL aplica reglas.

**No se implementan componentes. No se escriben clases ni interfaces finales. No se modifica código existente.** Este documento establece la arquitectura conceptual que completa el stack de escalamiento cognitivo definido en CE-3A.

---

## 1. Propósito

### 1.1 Responsabilidad de la DRL

La Deterministic Reasoning Layer es la capa de **decisión basada en reglas** del sistema. Su responsabilidad es:

1. **Recibir** datos y señales del contexto conversacional (slots, facts, session state, BKE responses)
2. **Aplicar** reglas determinísticas sobre esos datos
3. **Producir** una decisión estructurada que los orquestadores y políticas pueden consumir
4. **Determinar** si el resultado es suficiente o si debe escalar al siguiente nivel (LLM)

### 1.2 Límites de la capa

| Dentro del alcance de la DRL | Fuera del alcance de la DRL |
|------------------------------|------------------------------|
| Decidir si un conjunto de slots está completo | Almacenar datos del dominio |
| Determinar qué campo preguntar a continuación | Consultar la base de datos directamente |
| Validar consistencia entre campos (ej: origen ≠ destino) | Conocer precios, lugares, o alias |
| Decidir si el contexto actual es suficiente para proceder | Generar lenguaje natural |
| Determinar si debe escalar a LLM | Decidir políticas de negocio (AHORA vs RESERVA) |
| Clasificar el tipo de mensaje (afirmación, negación, corrección) | Redactar la respuesta al usuario |
| Inferir el campo faltante más probable | Detectar intención conversacional |
| Aplicar restricciones operativas (límite de pasajeros, rutas válidas) | Controlar el flujo del pipeline |

### 1.3 Problemas arquitectónicos que resuelve

| Problema identificado en CE-1/CE-2/CE-3A | Cómo lo aborda la DRL |
|-------------------------------------------|-----------------------|
| **Lógica de decisión distribuida**: las reglas para decidir qué hacer están repartidas entre `comprehension.ts`, `handler.ts`, `conversation-interpreter.ts`, `client-objective.ts`, `strategy-decision.ts`, y las políticas | Centraliza el **razonamiento determinístico** en una capa visible, dejando a cada componente solo su orquestación |
| **Ausencia de escalamiento explícito**: CE-1 Sección 7.2 documenta que no existe escalamiento de inteligencia; cada orquestador decide independientemente si usar LLM | La DRL es el **gatekeeper** centralizado que decide si el conocimiento + reglas son suficientes o si se necesita LLM |
| **Mezcla de conocimiento y decisión**: los orquestadores actuales mezclan consultas de datos (ej: `searchPlaces()`) con lógica de decisión (ej: `if score < 0.4 → escalate`)| La DRL consume datos del BKE y aplica reglas, separando conocimiento de razonamiento |
| **Dificultad de testeo**: las reglas de decisión están embebidas en el flujo del pipeline, sin unit testing aislado | La DRL es una capa pura de reglas, testeable sin DB, sin LLM, sin IO |

### 1.4 Problemas que NO resuelve

- La DRL **no resuelve** la ambigüedad semántica del lenguaje natural (eso sigue siendo responsabilidad del LLM o, parcialmente, del BKE)
- La DRL **no reemplaza** las políticas de negocio (policyAhora, policyReserva siguen siendo responsables de decidir la acción a tomar)
- La DRL **no reemplaza** la StrategyDecision (que sigue siendo responsable del tono, velocidad, y comportamiento estratégico)
- La DRL **no cachea** resultados (el BKE ya no cachea; la DRL tampoco)

---

## 2. Relación con el Business Knowledge Engine

### 2.1 Flujo de consulta

```
Orquestador / Pipeline
       │
       ▼
┌──────────────────┐
│      DRL         │  "¿Podemos proceder con estos datos?"
│  (razonamiento)  │
└───────┬──────────┘
        │
        ▼ Consulta
┌──────────────────┐
│      BKE         │  "Dame las tarifas para este trayecto"
│  (conocimiento)  │     "Dame los campos requeridos"
└───────┬──────────┘     "Dame los lugares candidatos"
        │
        ▼ Consulta
┌──────────────────┐
│  Fuentes de      │
│  Verdad (Turso,  │
│  Config, JSON,   │
│  Constantes)     │
└──────────────────┘
```

### 2.2 Qué consulta la DRL al BKE

| Consulta DRL | BKE consultado | Datos que recibe la DRL |
|--------------|----------------|--------------------------|
| `¿Faltan campos obligatorios?` | `BKE.obtenerCamposRequeridos(tipoViaje, modo)` | Lista de campos requeridos con prioridad |
| `¿Hay lugares candidatos?` | `BKE.resolverLugar(texto, contexto)` | Lugar canónico + place_id + score |
| `¿Este texto coincide con algún alias?` | `BKE.resolverAlias(texto)` | Lugar canónico o null |
| `¿Cuál es la tarifa?` | `BKE.obtenerTarifa(origen, destino, pax)` | Precio + desglose |
| `¿Este trayecto cruza fronteras?` | `BKE.clasificarTrayecto(origen, destino)` | Tipo de viaje + fronteras |
| `¿Cuál es el límite de pasajeros?` | `BKE.obtenerLimites()` | Límites operativos |
| `¿Qué entidades se detectan?` | `BKE.identificarEntidades(texto)` | Entidades con dominios |
| `¿Qué mensaje usar para este caso?` | `BKE.obtenerMensaje(clave, lang)` | Template de mensaje |

### 2.3 Qué transforma la DRL

La DRL **no transforma datos**. La DRL **aplica reglas** a los datos que recibe del BKE y del contexto conversacional.

| Entrada | Origen | Regla DRL aplicada | Salida |
|---------|--------|--------------------|--------|
| Slots actuales + campos requeridos | BKE + Sesión | `completitud(slots, requeridos)` | Slots faltantes con prioridad |
| Slots + restricciones | BKE + Sesión | `consistencia(slots)` | Válido / Inválido + razón |
| Texto del usuario + entidades detectadas | BKE + Mensaje | `clasificación(texto, entidades)` | Tipo de mensaje + señales |
| Contexto actual + umbrales | BKE + Sesión | `suficiencia(contexto, umbral)` | ¿Es suficiente? (bool) |
| Resultado DRL + umbral de confianza | DRL + BKE | `escalamiento(resultado, umbral)` | ¿Escalar a LLM? (bool + razón) |

### 2.4 Qué devuelve la DRL

La DRL devuelve **decisiones estructuradas**. No devuelve texto, no devuelve datos crudos.

```typescript
// Concepto — NO implementación
DRLDecision = {
  decision: "PROCEED" | "CLARIFY" | "ESCALATE" | "HALT",
  reason: string,               // Regla que activó esta decisión
  missingFields?: string[],      // Solo si decision = CLARIFY
  escalateTo?: "GROQ" | "GEMINI" | null,  // Solo si decision = ESCALATE
  confidence: number,            // 0.0 - 1.0
  context: {                     // Datos usados para la decisión
    slots: string[],
    required: string[],
    completeness: number,
    consistency: boolean,
  }
}
```

---

## 3. Tipos de Decisiones

### 3.1 Decisiones de Completitud

Determinan si la información recolectada es suficiente para avanzar al siguiente estado del flujo.

| Decisión | Pregunta que responde | Señales de entrada |
|----------|-----------------------|--------------------|
| `¿Faltan campos obligatorios?` | "¿Podemos confirmar o necesitamos más datos?" | Slots actuales, campos requeridos del dominio (BKE), estado conversacional |
| `¿Cuál es el siguiente campo?` | "¿Qué debemos preguntar ahora?" | Campos faltantes, prioridad del dominio, historial de preguntas |
| `¿El slot es estable?` | "¿Podemos confiar en este valor o necesitamos confirmación?" | SlotAssignmentConfidence del CORE, cantidad de cambios en el slot |

**Reglas existentes en el código actual:**
- `comprehension.ts` — domain profiles con requiredSlots y slotWeight
- `policy-ahora.ts` y `policy-reserva.ts` — reglas de decisión para CLARIFY vs EXECUTE
- `extract-slots.ts` — decisión de si regex+entity son suficientes o se necesita LLM

### 3.2 Decisiones de Consistencia

Validan que los datos recolectados sean coherentes entre sí y con las reglas del negocio.

| Decisión | Pregunta que responde | Señales de entrada |
|----------|-----------------------|--------------------|
| `¿Origen y destino son válidos?` | "¿El usuario quiere ir de un lugar a otro válido?" | Lugares resueltos (BKE), restricciones de ruta (BKE) |
| `¿La cantidad de pasajeros es válida?` | "¿Está dentro del límite operativo?" | Pax ingresados, límites (BKE) |
| `¿Hay contradicción entre slots?` | "¿El usuario contradijo información previa?" | Slots nuevos vs slots previos, señales de corrección |
| `¿El viaje es factible?` | "¿Existe ruta y tarifa para este trayecto?" | Tarifa (BKE), tipo de trayecto (BKE) |

**Reglas existentes en el código actual:**
- `pricing-engine.ts` — clamping 1-6 pasajeros
- `location-resolver.ts` — validación de rutas (corredor, frontera)
- `conversation-interpreter.ts` — detección de correcciones (isCorrection)

### 3.3 Decisiones de Clasificación

Determinan el tipo semántico del mensaje del usuario o del trayecto solicitado.

| Decisión | Pregunta que responde | Señales de entrada |
|----------|-----------------------|--------------------|
| `¿Qué tipo de mensaje es?` | "¿Es una afirmación, negación, corrección, consulta?" | Texto, patrones detectados, entidades (BKE) |
| `¿Es un mensaje de frustración?` | "¿El usuario está frustrado?" | FRUSTRATION_RE regex, entonación (solo regex disponible) |
| `¿Qué tipo de viaje es?` | "¿Local, fronterizo, aeropuerto, tour?" | Lugares (BKE), clasificación de trayecto (BKE) |
| `¿El usuario confirma o rechaza?` | "¿Está confirmando los datos o pidiendo cambios?" | Texto, patrones de afirmación/negación |

**Reglas existentes en el código actual:**
- `conversation-interpreter.ts` — classification.type (affirmation, negation, correction, etc.)
- `location-resolver.ts` — AIRPORT_RE, HOTEL_RE para clasificación de tramos
- `comprehension-runner.ts` — FRUSTRATION_RE regex
- `patterns.ts` — isAffirmativeMessage, isNegativeMessage

### 3.4 Decisiones de Suficiencia

Determinan si el nivel actual de procesamiento es suficiente o se necesita escalar.

| Decisión | Pregunta que responde | Señales de entrada |
|----------|-----------------------|--------------------|
| `¿El BKE pudo resolver?` | "¿El conocimiento del dominio fue suficiente?" | Resultado del BKE, umbral de confianza |
| `¿La regla DRL es concluyente?` | "¿Podemos decidir con las reglas actuales?" | Resultado de la regla, ambigüedad residual |
| `¿Debemos escalar a LLM?` | "¿Necesitamos inteligencia no determinística?" | Resultado DRL insuficiente, banderas de escalamiento (location_ambiguous, score bajo) |
| `¿Qué provider LLM intentar?` | "¿Groq o Gemini primero?" | Disponibilidad de providers, naturaleza de la tarea |

**Reglas existentes en el código actual:**
- `handler.ts` — skipLLM basado en purchaseIntent y EXECUTE
- `comprehension-runner.ts` — decisión de escalar a humano cuando LLM no puede reinterpretar
- `ambiguity-handler.ts` — decisión de usar LLM cuando risk nodes no cubren

### 3.5 Decisiones de Estrategia

Determinan parámetros de alto nivel para la respuesta.

| Decisión | Pregunta que responde | Señales de entrada |
|----------|-----------------------|--------------------|
| `¿Cuál es el objetivo del cliente?` | "¿Qué busca el usuario: precio, reserva, información?" | Hechos de CORE, texto del usuario |
| `¿La intención de compra es suficiente?` | "¿Merece la pena invertir una llamada LLM?" | purchaseIntent, flags de estrategia |
| `¿Qué prioridad tienen los campos?` | "¿Qué preguntar primero?" | fieldPriority de la estrategia |

**Reglas existentes en el código actual:**
- `client-objective.ts` — computeClientObjective()
- `strategy-decision.ts` — computeStrategyDecision()

---

## 4. Integración con la Arquitectura

### 4.1 Diagrama BEFORE / AFTER

```
ESTADO ACTUAL (desde CE-1 Sección 3.1)          │  CON BKE + DRL
                                                  │
                                                  │         ┌──────────────┐
                                                  │         │   Usuario    │
                                                  │         └──────┬───────┘
                                                  │                │
lead.service.ts                                   │    lead.service.ts (orquestador)
  │                                                │       │
  ├─ runComprehensionCheck()                      │       ├─ runComprehensionCheck()
  │   ├─ C5 (LLM) frustration                     │       │   ├─ DRL.clasificar()
  │   ├─ C4 (LLM) reinterpret                    │       │   ├─ BKE.obtenerMensaje()
  │   └─ C6 (LLM) contextual recovery             │       │   ├─ C5 (LLM) *solo si DRL escala
  │                                                │       │   └─ C4 (LLM) *solo si DRL escala
  ├─ runExtractionPipeline()                      │       │
  │   └─ extractSlots()                           │       ├─ runExtractionPipeline()
  │       ├─ regex-extractor                      │       │   └─ extractSlots()
  │       ├─ entity-extractor                     │       │       ├─ regex-extractor
  │       └─ C1 (LLM) extractSlots                │       │       ├─ entity-extractor
  │                                                │       │       └─ C1 (LLM) *solo si DRL escala
  ├─ startAmbiguityResolution()                   │       │
  │   └─ C3 (LLM) interpretAmbiguity × 4          │       ├─ startAmbiguityResolution()
  │                                                │       │   ├─ BKE.desambiguarLugar()
  └─ handleMessage()                              │       │   └─ C3 (LLM) *solo si DRL escala
      ├─ CORE (determinístico)                    │       │
      ├─ ROUTER (determinístico)                  │       └─ handleMessage()
      ├─ POLICY (determinístico)                  │           ├─ CORE
      └─ C2 (LLM) generateLLMResponse             │           ├─ ROUTER
                                                  │           ├─ DRL.suficiencia()
                                                  │           ├─ BKE.obtenerMensaje()
                                                  │           └─ C2 (LLM) *solo si DRL escala
                                                  │
                                                  │     ┌──────────────────┐
                                                  │     │  DRL (Nivel 1)  │
                                                  │     │  ┌──────────────┴──────┐
                                                  │     │  │ · completitud()     │
                                                  │     │  │ · consistencia()    │
                                                  │     │  │ · clasificacion()   │
                                                  │     │  │ · suficiencia()     │
                                                  │     │  │ · escalamiento()    │
                                                  │     │  └──────────────┬──────┘
                                                  │     └────────┬─────────┘
                                                  │              │ consulta
                                                  │     ┌────────▼─────────┐
                                                  │     │  BKE (Nivel 0)  │
                                                  │     │  · resolverLugar  │
                                                  │     │  · obtenerTarifa  │
                                                  │     │  · clasificar...  │
                                                  │     │  · obtenerMensaje │
                                                  │     └────────┬─────────┘
                                                  │              │ consulta
                                                  │     ┌────────▼─────────┐
                                                  │     │ Fuentes de Verdad │
                                                  │     │ (Turso, Config,   │
                                                  │     │  JSON, Constantes)│
                                                  │     └──────────────────┘
```

### 4.2 Interacción con Handler

**Relación actual:** `handler.ts` (O1) recibe contexto, ejecuta CORE → ROUTER → POLICY → decide skipLLM → ejecuta C2. La decisión de skipLLM está basada en `strategyDecision.behaviorFlags.skipLLM` y `isExecute && !hasPlaceholder`.

**Interacción con DRL:** Handler consulta a la DRL antes de decidir si ejecutar LLM:

```
Handler actual:                   Handler con DRL:
  if (skipLLM) → template           drlResult = DRL.suficiencia(contexto)
  else → generateLLMResponse         if drlResult.decision == "SUFFICIENT"
                                       → BKE.obtenerMensaje() + template
                                     else if drlResult.decision == "ESCALATE"
                                       → generateLLMResponse()
                                     else
                                       → drlResult.decision (CLARIFY/HALT)
```

### 4.3 Interacción con CORE

**Relación actual:** CORE produce `CoreDecision` con intent, confidence, facts. Los facts contienen señales como `"location_ambiguous:true"`, `"origin:aeropuerto"`.

**Interacción con DRL:** DRL consume `CoreDecision` como entrada para sus reglas:
- `DRL.completitud(slots, required)` usa `core.facts` para detectar role locks
- `DRL.consistencia(slots)` usa `core.slotStability` y `core.slotAssignmentConfidence`
- `DRL.clasificacion(texto, entidades)` enriquece la interpretación de CORE con datos del BKE

### 4.4 Interacción con POLICY

**Relación actual:** POLICY recibe `HandlerContext` y produce `PolicyOutput` con decisión (EXECUTE/CLARIFY/ANSWER/SAFE_FALLBACK). POLICY contiene reglas de decisión propias (12 reglas en policy-ahora, 12 en policy-reserva).

**Interacción con DRL:** DRL NO reemplaza POLICY. DRL provee datos de entrada para POLICY:
- `DRL.completitud(slots, required)` → POLICY sabe qué falta y puede decidir CLARIFY
- `DRL.consistencia(slots)` → POLICY sabe si hay errores de validación
- `DRL.clasificacion(texto)` → POLICY sabe qué tipo de mensaje procesa

POLICY sigue siendo responsable de la decisión de negocio. DRL es su fuente de razonamiento determinístico.

### 4.5 Interacción con StrategyDecision

**Relación actual:** `computeStrategyDecision()` produce tone, speed, skipLLM, behaviorFlags. Depende de facts, purchaseIntent, urgency, messageType.

**Interacción con DRL:** DRL asiste a StrategyDecision:
- `DRL.suficiencia(contexto, umbral)` → contribuye a la señal de skipLLM
- `DRL.clasificacion(texto)` → contribuye a messageType y correcciones
- `DRL.completitud(slots)` → contribuye a fieldPriority y fieldAcquisitionMode

### 4.6 Interacción con Conversation Interpreter

**Relación actual:** `interpretMessage()` produce classification.type y análisis conversacional usando CORE facts + texto.

**Interacción con DRL:** Conversation Interpreter puede usar DRL como fuente de clasificación:
- `DRL.clasificacion(texto, entidades)` → classification.type mejorado con datos del BKE
- `DRL.consistencia(slots)` → detección de correcciones mejorada

### 4.7 Interacción con Pattern Discovery

**Relación actual:** Pattern Discovery es puramente algorítmico, no usa LLM ni decisiones en tiempo real.

**Interacción con DRL:** Pattern Discovery puede consultar el historial de decisiones de DRL para análisis retrospectivo:
- Patrones de "decisiones que escalaron a LLM" → identificar qué tipos de input requieren LLM consistentemente
- Patrones de "decisiones CLARIFY" → identificar qué campos son más frecuentemente faltantes

### 4.8 Interacción con Business Knowledge Engine

**Relación actual:** No existe BKE.

**Interacción con DRL:** DRL es el principal consumidor de BKE. Toda consulta de datos del dominio en el pipeline pasa por:
1. DRL decide qué información necesita
2. DRL consulta al BKE
3. BKE obtiene datos de las fuentes de verdad
4. DRL aplica reglas sobre los datos recibidos
5. DRL produce una decisión

### 4.9 Interacción con Providers LLM

**Relación actual:** Los orquestadores llaman directamente a `provider.generateResponse()`, `provider.extractSlots()`, o `provider.interpretAmbiguity()` cuando determinan que se necesita LLM.

**Interacción con DRL:** DRL centraliza la decisión de escalamiento:
- DRL determina si se necesita LLM
- DRL determina qué método LLM se necesita (generateResponse, extractSlots, interpretAmbiguity)
- DRL determina qué provider intentar primero (Groq → Gemini, según la cadena de escalamiento)
- El orquestador ejecuta la llamada LLM solo si DRL indica ESCALATE

---

## 5. Escalamiento Cognitivo

### 5.1 Flujo de decisión completo

```
Mensaje entrante
      │
      ▼
┌──────────────────────────────────────┐
│  Nivel 0: Business Knowledge Engine   │
│                                       │
│  Consulta fuentes de verdad:          │
│  • Lugares, alias, precios, fronteras │
│  • Campos requeridos, límites         │
│  • Mensajes reutilizables             │
│                                       │
│  Salida: datos estructurados          │
└──────────────┬───────────────────────┘
               │ datos
               ▼
┌──────────────────────────────────────┐
│  Nivel 1: Deterministic Reasoning    │
│           Layer                      │
│                                       │
│  Aplica reglas determinísticas:      │
│  • completitud                       │
│  • consistencia                      │
│  • clasificación                     │
│  • suficiencia                       │
│                                       │
│  Salida: DRLDecision                 │
└──────────────┬───────────────────────┘
               │
               ▼
         ┌─────────────┐
         │ ¿Es          │
         │ suficiente?  │──── SI ──► BKE.obtenerMensaje() → responder
         └──────┬──────┘
                │ NO
                ▼
         ┌─────────────┐
         │ ¿Escalar     │
         │ a LLM?       │──── NO ──► HALT o CLARIFY (pedir más datos)
         └──────┬──────┘
                │ SÍ
                ▼
┌──────────────────────────────────────┐
│  Nivel 2: LLM Provider Chain         │
│                                       │
│  Paso 1: Groq (llama-3.3-70b)        │
│  ├─ ¿Resuelto? → SI → responder      │
│  └─ ¿Resuelto? → NO                  │
│                                       │
│  Paso 2: Gemini (gemini-2.0-flash)   │
│  ├─ ¿Resuelto? → SI → responder      │
│  └─ ¿Resuelto? → NO                  │
│                                       │
│  Paso 3: Fallback determinístico     │
│  (BKE.obtenerMensaje + template      │
│   de SAFE_FALLBACK)                  │
└──────────────────────────────────────┘
```

### 5.2 Criterios conceptuales para cada escalamiento

#### De BKE a DRL

El BKE siempre responde. No hay decisión de escalamiento del BKE al DRL — el DRL consume al BKE como paso obligatorio. Toda decisión pasa por BKE → DRL.

#### De DRL a respuesta directa (sin LLM)

La DRL decide NO escalar a LLM cuando se cumple **cualquiera** de estas condiciones:

| Criterio | Señal | Fundamento (CE-2) |
|----------|-------|-------------------|
| **Conocimiento suficiente** | BKE retornó datos con score > umbral | El conocimiento del dominio fue suficiente para la consulta |
| **Regla concluyente** | La regla DRL produjo una decisión con confianza > 0.8 | Las reglas determinísticas cubren el caso |
| **Compra baja** | purchaseIntent es low | No vale la pena invertir una llamada LLM (CE-1: skipLLM existe por esta razón) |
| **Template suficiente** | No hay placeholders en el template seleccionado | El template es autosuficiente (CE-1: EXECUTE sin placeholder → skipLLM) |

#### De DRL a Groq (escalamiento nivel 2)

La DRL decide escalar a Groq cuando se cumple **cualquiera** de estas condiciones:

| Criterio | Señal | Fundamento (CE-2) |
|----------|-------|-------------------|
| **Ambigüedad no resuelta** | BKE no pudo desambiguar con sus reglas de proximidad | C3 es reemplazable, pero si BKE no puede, el LLM es el fallback |
| **Extracción incompleta** | regex + entity + BKE no cubrieron ambos slots | C1 es inevitable — el LLM necesita extraer lo que las reglas no capturaron |
| **Comprensión insuficiente** | DRL clasifica el mensaje como de baja comprensión y los templates de BKE no fueron suficientes | C4/C6 son simplificables — se intenta BKE primero, LLM después |
| **Frustración detectada** | FRUSTRATION_RE coincide y BKE no tiene mensaje de desescalada suficiente | C5 es inevitable — la respuesta empática requiere LLM |

#### De Groq a Gemini (fallback)

La DRL decide escalar de Groq a Gemini cuando Groq falla (retorna null o lanza error). Este escalamiento sigue la cadena de fallback existente documentada en CE-1 (FallbackProvider: Gemini → Groq), pero la DRL la explicita como parte del flujo de decisión.

#### De Gemini a fallback determinístico

Cuando ambos LLM fallan, la DRL retorna al BKE para obtener el mensaje de SAFE_FALLBACK. Esto ya ocurre en producción (CE-1 Sección 6.4), pero ahora es un paso explícito del flujo de escalamiento.

### 5.3 Proveedores LLM en la cadena de escalamiento

La cadena de proveedores LLM sigue el orden documentado en CE-1 Sección 2.1, ahora gobernado por la DRL:

```
DRL decide escalar
       │
       ▼ intentar primero
┌──────────────────┐
│ GroqProvider     │  ← DRL elige Groq si la tarea es estructurada
│ (extractSlots,   │    (extracción, clasificación, desambiguación)
│  generateResponse,│
│  interpretAmbiguity)│
└────────┬─────────┘
         │ ¿falló?
         ├── NO → OK, retornar
         │
         ▼ SÍ
┌──────────────────┐
│ GeminiProvider   │  ← DRL elige Gemini si la tarea es generativa
│ (extractSlots,   │    (respuesta al usuario, transcripción, empatía)
│  generateResponse,│
│  interpretAmbiguity)│
└────────┬─────────┘
         │ ¿falló?
         ├── NO → OK, retornar
         │
         ▼ SÍ (ambos fallaron)
┌──────────────────────────────┐
│ Fallback determinístico      │
│ BKE.obtenerMensaje("error")  │
│ → SAFE_FALLBACK              │
└──────────────────────────────┘
```

La DRL almacena el conocimiento de qué provider es mejor para cada tipo de tarea basándose en:
- CE-1 Sección 2.1: `GroqProvider` usa `llama-3.3-70b-versatile` (rápido, bueno para extracción estructurada)
- CE-1 Sección 2.1: `GeminiProvider` usa `gemini-2.0-flash` (mejor para generación, mejor portugués)

---

## 6. Catálogo Conceptual de Reglas

### 6.1 Familias de reglas

Cada familia agrupa reglas de la misma naturaleza. No se listan reglas específicas — solo las familias que vivirían en la DRL.

| Familia | Propósito | Tipo de entrada | Tipo de salida |
|---------|-----------|-----------------|----------------|
| **Completitud** | Determinar qué información falta para completar una transacción | Slots actuales, campos requeridos (BKE), estado conversacional | Lista de campos faltantes ordenados por prioridad |
| **Consistencia** | Validar que los datos recolectados no tengan contradicciones internas | Slots actuales, slots previos, role locks, restricciones (BKE) | Válido/Inválido + razón + campo conflictivo |
| **Clasificación** | Determinar el tipo semántico del mensaje del usuario | Texto del usuario, entidades detectadas (BKE), patrones determinísticos | Tipo de mensaje + señales + confianza |
| **Suficiencia** | Evaluar si el nivel actual de procesamiento es suficiente | Resultado de otras reglas DRL, datos BKE, umbrales de configuración | Suficiente/Insuficiente + escalamiento sugerido |
| **Prioridad** | Ordenar campos o acciones según relevancia para el estado actual | Campos faltantes, trip type, historial de la sesión | Lista ordenada con scores de prioridad |
| **Validación** | Verificar restricciones operativas y reglas de negocio | Datos del usuario, límites (BKE), reglas de negocio (BKE) | Válido/Inválido + mensaje de error asociado |
| **Escalamiento** | Decidir si, cuándo, y a qué proveedor LLM escalar | Resultado de sufiencia, tipo de tarea, disponibilidad de providers | Proveedor objetivo + método + urgencia |

### 6.2 Mapa de reglas a decisiones actuales

| Familia | Decisión actual | Ubicación actual en CE-1/CE-2 |
|---------|-----------------|-------------------------------|
| Completitud | "¿Faltan slots?" | `comprehension.ts` (domain profiles), `policy-ahora.ts`, `policy-reserva.ts` |
| Consistencia | "¿Origen ≠ destino?" | `location-resolver.ts`, `pricing-engine.ts` (clamping) |
| Clasificación | "¿Afirmación, negación, corrección?" | `conversation-interpreter.ts`, `patterns.ts` |
| Suficiencia | "¿skipLLM?" | `handler.ts` (basado en strategyDecision.behaviorFlags.skipLLM) |
| Prioridad | "¿Qué preguntar primero?" | `strategy-decision.ts` (fieldPriority), `policy-*.ts` (order of rules) |
| Validación | "¿Pasajeros > 6?" | `constants.ts` (max 6), `pricing-engine.ts` (clamping 1-6) |
| Escalamiento | "¿Usar LLM?" | `handler.ts`, `comprehension-runner.ts`, `ambiguity-handler.ts` |

### 6.3 Naturaleza de las reglas

Las reglas de la DRL son:

- **Determinísticas**: dada la misma entrada, producen la misma salida. No hay aleatoriedad, no hay temperatura, no hay sampling.
- **Compuestas**: pueden combinar múltiples señales (BKE + contexto + umbral) en una sola decisión.
- **Ordenadas por prioridad**: para decisiones donde múltiples reglas pueden aplicarse (ej: qué campo preguntar), las reglas tienen prioridad explícita.
- **Fallibles**: toda regla puede retornar "no sé" (confianza baja), lo que activa el escalamiento.
- **Sin estado**: las reglas no mantienen estado entre invocaciones. El estado se pasa explícitamente como parámetro.

---

## 7. Beneficios Arquitectónicos

### 7.1 Presupuesto cognitivo

| Escenario | Sin DRL (CE-1) | Con BKE + DRL | Reducción |
|-----------|:--------------:|:-------------:|:---------:|
| Ambigüedad completa | 4 LLM (C3×4) | 0-1 LLM (BKE + DRL resuelven, LLM fallback) | 75-100% |
| Comprensión baja | 3 LLM (C4, C5, C6) | 0-1 LLM (DRL clasifica + BKE template) | 66-100% |
| Extracción parcial | 1 LLM (C1) | 0-1 LLM (DRL decide si BKE+regex+entity son suficientes) | 0-100% |
| Máximo teórico | 10 LLM | 2-4 LLM | 60-80% |

### 7.2 Mantenibilidad

| Aspecto | Sin DRL | Con DRL |
|---------|---------|---------|
| **Ubicación de reglas** | Dispersas en 10+ archivos (handler, comprehension, policies, strategy, interpreter) | Centralizadas en la DRL |
| **Modificación de reglas** | Requiere entender el flujo completo del pipeline | Requiere entender una familia de reglas en la DRL |
| **Impacto de cambios** | Cambiar una regla de completitud puede afectar el escalamiento a LLM en otro archivo | Cambiar una regla en la DRL solo afecta a la DRL |
| **Documentación de reglas** | Implícita en el código de cada orquestador | Explícita en el catálogo de reglas de la DRL |

### 7.3 Desacoplamiento

| Dependencia actual | Con DRL |
|--------------------|---------|
| `comprehension-runner.ts` importa DB directamente | `comprehension-runner.ts` consulta DRL → DRL consulta BKE → BKE consulta DB |
| `handler.ts` decide skipLLM basado en strategyDecision + policy | `handler.ts` consulta `DRL.suficiencia()` |
| `ambiguity-handler.ts` llama a LLM directamente | `ambiguity-handler.ts` consulta `DRL.escalamiento()` → DRL decide si llamar a LLM |
| Políticas tienen reglas de decisión embebidas | Políticas reciben `DRLDecision` como entrada estructurada |

### 7.4 Observabilidad

| Aspecto | Sin DRL | Con DRL |
|---------|---------|---------|
| **Rastreo de decisiones** | Cada orquestador loguea con su propio formato | DRL produce `DRLDecision` con `reason` y `confidence` — estructura uniforme |
| **Auditoría de escalamiento** | No existe: cada orquestador decide independientemente | DRL loguea cada escalamiento con razón y proveedor destino |
| **Métricas** | No hay métricas de qué reglas se activaron | Cada regla DRL puede contar activaciones, aciertos, escalamientos |
| **Depuración** | "¿Por qué se llamó al LLM?" requiere seguir el flujo completo | "Decisión DRL: ESCALATE porque completitud=0.4 < umbral=0.7" |

### 7.5 Testabilidad

| Aspecto | Sin DRL | Con DRL |
|---------|---------|---------|
| **Aislamiento** | Las reglas están embebidas en orquestadores que dependen de DB, LLM, y sesión | Las reglas DRL son funciones puras (entrada → salida) sin IO |
| **Cobertura** | Probar una regla de completitud requiere montar toda la pipeline | Probar una regla DRL requiere solo pasar parámetros de entrada |
| **Determinismo** | Dependiente del LLM (no determinístico) | Puramente determinístico (misma entrada → misma salida) |
| **Velocidad** | Tests requieren esperar respuestas de LLM (5000ms timeout) | Tests de reglas DRL son sub-milisegundo |

### 7.6 Independencia de proveedores LLM

| Aspecto | Sin DRL | Con DRL |
|---------|---------|---------|
| **Acoplamiento** | Los orquestadores deciden cuándo llamar a LLM — el LLM está embebido en la lógica de negocio | La DRL es el único punto que decide escalar a LLM — cambiar de proveedor no afecta reglas de negocio |
| **Degradación** | Si LLM falla, cada orquestador maneja el error individualmente | Si LLM falla, la DRL retorna al fallback determinístico (BKE → template) en un solo punto |
| **Conmutación** | Cambiar de Groq a Gemini requiere cambiar cada consumidor | Cambiar de proveedor solo requiere actualizar la cadena de escalamiento en la DRL |

---

## 8. Riesgos

### 8.1 Riesgos Arquitectónicos

| ID | Riesgo | Descripción | Mitigación conceptual |
|:--:|--------|-------------|-----------------------|
| R1 | **Duplicación con POLICY** | Las reglas de decisión de la DRL podrían solaparse con las decisiones de POLICY, creando dos fuentes de verdad para la misma decisión | La DRL decide **si** hay información suficiente; POLICY decide **qué acción** tomar. Son preguntas diferentes. La DRL produce `DRLDecision`, POLICY la consume como una señal más |
| R2 | **Sobre-ingeniería de reglas** | El catálogo de reglas podría crecer sin control, intentando cubrir todos los casos posibles y volviéndose imposible de mantener | Las reglas se agregan solo cuando hay evidencia de que un caso concreto ocurre con frecuencia y puede resolverse sin LLM. El criterio de inclusión es: "¿este caso justifica no escalar a LLM?" |
| R3 | **Reglas frágiles** | Reglas determinísticas demasiado específicas pueden romperse cuando cambian los datos del dominio | Las reglas operan sobre abstracciones del BKE (lugar, tarifa, frontera), no sobre IDs concretos. Si un lugar cambia de nombre, el BKE se actualiza, la regla no cambia |
| R4 | **Cascada de escalamiento** | Si la DRL escala todo al LLM por defecto (reglas demasiado conservadoras), el BKE y la DRL no aportan valor | Las reglas de escalamiento deben tener un sesgo hacia "suficiente". El umbral de escalamiento se ajusta por feedback: si un escalamiento frecuente nunca usa LLM (siempre falla), la regla se endurece |
| R5 | **Complejidad de testing** | Aunque las reglas individuales son testeables, el número combinatorio de interacciones entre reglas puede crecer exponencialmente | Las familias de reglas son independientes entre sí. No hay reglas que dependan del resultado de otras reglas de distinta familia. Esto mantiene el espacio de testing lineal |

### 8.2 Riesgos Operativos

| ID | Riesgo | Descripción | Mitigación conceptual |
|:--:|--------|-------------|-----------------------|
| R6 | **Latencia de doble consulta** | Cada decisión DRL requiere consultar al BKE, que a su vez consulta a las fuentes de verdad. Esto agrega latencia respecto al acceso directo actual | Las consultas del DRL al BKE son planas (sin anidamiento). El DRL puede consultar múltiples dominios del BKE en paralelo cuando no tienen dependencias entre sí |
| R7 | **Comportamiento inesperado en producción** | Las reglas determinísticas pueden producir decisiones incorrectas en casos no previstos, sin el colchón de adaptabilidad del LLM | La DRL siempre puede escalar a LLM. Una decisión incorrecta de la DRL (ej: clasificar mal un mensaje) no es catastrófica porque el LLM puede corregirla en el siguiente nivel |
| R8 | **Mantenimiento continuo** | Las reglas de negocio cambian (ej: nuevos tipos de viaje, nuevas restricciones). La DRL debe actualizarse | Las reglas de la DRL son código, no configuración. Tienen tests, revisión, y despliegue. Esto es más costoso que editar un JSON, pero más robusto que tener reglas implícitas en prompts LLM |

### 8.3 Riesgos de Integración

| ID | Riesgo | Descripción | Mitigación conceptual |
|:--:|--------|-------------|-----------------------|
| R9 | **Migración gradual conflictiva** | Durante la migración, algunas rutas usan DRL + BKE y otras usan el acceso directo actual, creando inconsistencias | La migración es por componente: un orquestador completo se migra a DRL + BKE de una vez. No migrar mitades de un orquestador |
| R10 | **Dependencia circular** | Si POLICY consulta a DRL y DRL necesita decisiones de POLICY para operar, se crea una dependencia circular | DRL no depende de POLICY. DRL produce decisiones que POLICY consume. La dirección de dependencia es unidireccional: DRL → BKE → Fuentes; POLICY → DRL; Handler → DRL; Handler → POLICY |

---

## 9. Conclusión

### 9.1 El stack completo de inteligencia

Con la incorporación de la Deterministic Reasoning Layer, el sistema adquiere tres niveles explícitos de procesamiento cognitivo:

```
Nivel 2: LLM
  Responsabilidad: generar, comprender, empatizar
  Método: llamado a provider (Groq → Gemini → fallback)
  Entrada: datos estructurados + contexto conversacional
  Salida: texto o estructura
  Clasificación CE-2: solo llamadas A (C1, C2, C5, C7)
  Frecuencia esperada: reducida 60-80% vs baseline CE-1

Nivel 1: Deterministic Reasoning Layer
  Responsabilidad: decidir, clasificar, validar
  Método: reglas determinísticas sobre datos BKE
  Entrada: datos BKE + contexto conversacional
  Salida: DRLDecision (estructurada)
  Reglas: 7 familias (completitud, consistencia, clasificación,
           suficiencia, prioridad, validación, escalamiento)
  Condición: escala a LLM solo si no puede decidir

Nivel 0: Business Knowledge Engine
  Responsabilidad: conocer el dominio
  Método: consulta a fuentes de verdad (Turso, Config, JSON)
  Entrada: parámetros de consulta
  Salida: datos estructurados del dominio
  Fuentes: 5 categorías (Turso, Config, Constantes, Reglas, Templates)
```

### 9.2 Relación entre BKE y DRL

BKE y DRL son dos capas distintas con responsabilidades complementarias:

| Dimensión | BKE | DRL |
|-----------|-----|-----|
| **Pregunta** | ¿Qué datos existen? | ¿Qué hacemos con esos datos? |
| **Contenido** | Conocimiento del dominio | Reglas de decisión |
| **Datos** | Places, tariffs, alias, borders | Completitud, consistencia, clasificación |
| **Persistencia** | Consulta fuentes de verdad | Sin persistencia |
| **Salida** | Datos estructurados | Decisión estructurada (DRLDecision) |
| **Testeabilidad** | Requiere fuentes de datos | Puramente funcional (sin IO) |
| **Estabilidad** | Cambia cuando cambia el dominio | Cambia cuando cambian las reglas de negocio |

### 9.3 Impacto en la arquitectura actual

Comparado con el baseline de CE-1:

| Métrica | CE-1 (baseline) | Con BKE + DRL | Cambio |
|---------|:---------------:|:-------------:|:------:|
| Puntos de consumo LLM | 7 | 4 (solo A) | -43% |
| Máximo LLM calls/mensaje | 10 | 2-4 | -60-80% |
| Dependencia de proveedores | Total (sin LLM no opera) | Parcial (BKE+DRL operan sin LLM) | Crítica → Resiliente |
| Decisiones centralizadas | No (5 orquestadores independientes) | Sí (DRL unifica reglas) | Nueva capacidad |
| Conocimiento del dominio | En prompts y código disperso | BKE lo encapsula | Nueva capa |
| Escalamiento explícito | No existe | Niveles 0-1-2 definidos | Nueva capacidad |

### 9.4 Preparación para la migración

La combinación BKE + DRL establece la base determinística del sistema. Con estas dos capas:

1. **El sistema puede operar sin LLM**: BKE + DRL cubren todos los casos que las reglas determinísticas pueden resolver. Solo los casos que requieren generación, empatía, o comprensión compleja escalan a LLM.

2. **El sistema conoce explícitamente lo que sabe y lo que no sabe**: Si BKE + DRL no pueden resolver, escalan con una razón explícita ("completitud insuficiente", "ambigüedad no resuelta", "consistencia fallida"). Esto permite auditoría, métricas, y mejora continua.

3. **El sistema puede migrar por fases**: Cada llamada LLM clasificada en CE-2 tiene un plan de migración: las C (C3) van primero a BKE + DRL, las B (C4, C6) son asistidas por BKE + DRL, las A (C1, C2, C5, C7) retienen LLM pero reciben contexto mejorado.

4. **El sistema está listo para cambiar de proveedor LLM**: La DRL es el único punto que decide escalar a LLM y qué proveedor usar. Cambiar de Groq a Gemini, o agregar un nuevo proveedor, no requiere modificar orquestadores, políticas, ni reglas de negocio.

---

*Fin de CE-3B — Deterministic Reasoning Layer: Diseño Arquitectónico. Este documento completa la definición del nuevo primer nivel de inteligencia del sistema junto con CE-3A (Business Knowledge Engine), estableciendo la base para la migración definida en las siguientes etapas de la Serie CE.*
