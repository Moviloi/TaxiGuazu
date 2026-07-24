# ARNÉS Framework — Runtime Profile Contract v1.0

> **Nivel:** Operacional (Nivel 2) — define un contrato de la capa de implementación.
> **Versión:** 1.0
> **Fecha:** 2026-07-22
> **Estado:** ACTIVE
> **Deriva de:** `PRODUCT_CONTEXT_CONTRACT.md` v1.0 §7, `PROJECT_ADAPTER_ARCHITECTURE.md` v1.0 §9
>
> Este documento define el contrato arquitectónico del Runtime Profile:
> el mecanismo mediante el cual una implementación de ARNÉS configura su
> comportamiento de ejecución sin modificar el Framework ni el Producto.

---

## Índice

1. [Propósito y posición](#1-propósito-y-posición)
2. [La tríada de implementación](#2-la-tríada-de-implementación)
3. [Ciclo de vida](#3-ciclo-de-vida)
4. [Categorías configurables](#4-categorías-configurables)
5. [Qué NUNCA se configura](#5-qué-nunca-se-configura)
6. [Reglas de precedencia](#6-reglas-de-precedencia)
7. [Relación con otros componentes](#7-relación-con-otros-componentes)
8. [Ejemplos conceptuales](#8-ejemplos-conceptuales)
9. [Extensiones previstas](#9-extensiones-previstas)

---

## 1. Propósito y posición

### 1.1 Qué es el Runtime Profile

El **Runtime Profile** es una configuración estructurada —independiente del producto y del framework— que define **cómo se ejecuta una misión** dentro de una implementación ARNÉS.

Responde a la pregunta:

> **¿Con qué recursos, restricciones y estrategias se ejecuta esta misión?**

### 1.2 Qué problema resuelve

Sin un Runtime Profile formal, las decisiones de ejecución se dispersan:

- El Director elige un modelo de IA arbitrariamente → **inconsistencia entre misiones**.
- El usuario no puede limitar el costo de una misión → **riesgo de sobreconsumo**.
- Cada agente define su propio timeout → **comportamiento impredecible**.
- Cambiar de proveedor de IA requiere modificar prompts → **acoplamiento**.
- No hay trazabilidad de decisiones de ejecución → **imposible aprender y optimizar**.

El Runtime Profile centraliza todas estas decisiones en un solo artefacto gobernado.

### 1.3 Posición en el modelo de tres capas

```
┌──────────────────────────────────────────┐
│        ARNÉS FRAMEWORK (Nivel 0+1)       │
│                                          │
│  Define: QUÉ hacer, con qué principios,  │
│  bajo qué invariantes.                   │
│  No define: CÓMO ejecutar.               │
└──────────────────┬───────────────────────┘
                   │
                   │ "Ejecutá esta misión"
                   ▼
┌──────────────────────────────────────────┐
│     IMPLEMENTACIÓN ARNÉS (Nivel 2)       │
│                                          │
│  ┌────────────────────────────────┐      │
│  │     RUNTIME PROFILE            │      │
│  │  Define: CÓMO ejecutar.        │      │
│  │  • Modelo de IA                │      │
│  │  • Timeouts                    │      │
│  │  • Paralelismo                 │      │
│  │  • Presupuesto cognitivo       │      │
│  │  • Logging                     │      │
│  └────────────────────────────────┘      │
│                                          │
│  ┌────────────────────────────────┐      │
│  │     PROJECT ADAPTER            │      │
│  │  Provee: Product Context       │      │
│  └────────────────────────────────┘      │
└──────────────────┬───────────────────────┘
                   │
                   │ "Este es el producto"
                   ▼
┌──────────────────────────────────────────┐
│          PRODUCTO (Nivel 3)              │
│  Define: QUÉ es el producto.             │
└──────────────────────────────────────────┘
```

### 1.4 Principio rector

> **El Runtime Profile configura la ejecución. No define el producto, no modifica el framework, no reemplaza al Director.**

---

## 2. La tríada de implementación

La capa de implementación de ARNÉS se compone de tres mecanismos que colaboran sin acoplarse:

```
                    RUNTIME PROFILE
                    "¿Cómo ejecuto?"
                    (efímero, por misión)
                         │
                         │ consulta el runtime del producto
                         ▼
                    PROJECT ADAPTER
                    "¿Qué es este producto?"
                    (estable, por producto)
                         │
                         │ construye
                         ▼
                    PRODUCT CONTEXT
                    "Identidad, arquitectura, reglas"
                    (estable, por producto)
```

| Dimensión | Product Context | Project Adapter | Runtime Profile |
|---|---|---|---|
| **Pregunta** | ¿Qué es este producto? | ¿Cómo obtengo el contexto? | ¿Cómo ejecuto esta misión? |
| **Nivel** | Nivel 1 (contrato) | Nivel 2 (componente) | Nivel 2 (contrato) |
| **Estabilidad** | Cambia con el producto | Cambia con la estructura del producto | Cambia con la misión |
| **Proveedor** | El producto (documentado) | La implementación (construye) | La implementación o el usuario |
| **Consumidor** | Mission Analyzer (SDL) | Mission Analyzer (ORIENT) | Director (AEL), agentes |
| **Ciclo de vida** | Carga/descarga por misión | 6 etapas (DISCOVER→DISCARD) | Carga/validación/uso/descarte |
| **Contiene** | Identidad, ADRs, reglas, vocabulario | Mapa de fuentes, reglas de extracción | Modelo IA, timeouts, presupuestos |
| **Documento** | `PRODUCT_CONTEXT_CONTRACT.md` | `PROJECT_ADAPTER_ARCHITECTURE.md` | Este documento |

### 2.1 Cómo colaboran

1. **ORIENT:** El Mission Analyzer invoca al **Project Adapter**, que construye el **Product Context**.
2. **PLAN:** El Mission Analyzer produce un ExecutionPlan. El **Runtime Profile** se carga para informar las restricciones de ejecución.
3. **BUILD:** El Director ejecuta el plan usando la configuración del **Runtime Profile** (modelo, timeout, paralelismo).
4. **CLOSED:** El Runtime Profile y el Product Context se descartan.

---

## 3. Ciclo de vida

### 3.1 Las cuatro etapas

```
MISIÓN INICIA
    │
    ▼
┌─────────┐
│  LOAD   │  Cargar el perfil adecuado para esta misión.
└────┬────┘
     │
     ▼
┌─────────┐
│VALIDATE │  Verificar que el perfil es válido y no contradice el framework.
└────┬────┘
     │
     ▼
┌─────────┐
│  USE    │  El perfil está activo durante BUILD. Los agentes lo consultan.
└────┬────┘
     │
     ▼
┌─────────┐
│ DISCARD │  Al finalizar la misión, el perfil se descarta.
└─────────┘
     │
     ▼
MISIÓN FINALIZA
```

### 3.2 LOAD — Carga

**Propósito:** Seleccionar y cargar el Runtime Profile para la misión actual.

**Qué ocurre:**
- El Mission Analyzer, durante PLAN, determina qué perfil usar.
- Opciones de selección:
  - **Perfil por defecto:** definido por la implementación ARNÉS.
  - **Perfil por tipo de misión:** exploración, implementación, auditoría, certificación.
  - **Perfil por producto:** hereda configuraciones específicas para el producto activo.
  - **Perfil por misión:** el usuario o el SDL especifican overrides para esta misión.
- Si no se especifica perfil, se usa el perfil por defecto.

**Entrada:** Tipo de misión, producto activo, overrides del usuario/SDL.

**Salida:** Runtime Profile cargado (en memoria, no persistido).

### 3.3 VALIDATE — Validación

**Propósito:** Verificar que el perfil cargado es conforme al contrato.

**Qué verifica:**
- El perfil no configura elementos que pertenecen al framework (ver §5.1).
- El perfil no configura elementos que pertenecen al producto (ver §5.2).
- Los valores están dentro de rangos aceptables (ej. timeout > 0, no negativo).
- Las referencias a modelos o proveedores son válidas (el proveedor existe, el modelo está disponible).
- No hay contradicciones internas (ej. timeout de agente > timeout de misión).

**Entrada:** Runtime Profile cargado.

**Salida:**
- `VALID`: el perfil es conforme.
- `INVALID`: el perfil tiene errores. La misión no puede continuar hasta que se corrijan.
- `WARNINGS`: el perfil tiene advertencias no bloqueantes (ej. valor inusualmente alto).

### 3.4 USE — Utilización

**Propósito:** Los agentes consumen la configuración del perfil durante BUILD.

**Qué ocurre:**
- El Director consulta el perfil para decidir:
  - Qué modelo usar para cada capacidad.
  - Si paralelizar o secuenciar tareas.
  - Cuánto timeout asignar a cada subagente.
- Los subagentes consultan el perfil para conocer:
  - Su presupuesto de tokens.
  - Su temperatura.
  - Su proveedor de IA asignado.
- El perfil es **inmutable** durante la misión. No se modifica sobre la marcha.

**Entrada:** Runtime Profile validado.

**Salida:** Comportamiento de ejecución configurado.

### 3.5 DISCARD — Descarte

**Propósito:** Liberar el perfil al finalizar la misión.

**Qué ocurre:**
- Al declarar CLOSED, el Runtime Profile se descarta.
- No se conserva entre misiones (a menos que se explicite como perfil persistente).
- Si se usaron overrides por misión, se descartan (no contaminan el perfil por defecto).

**Entrada:** Señal de CLOSED.

**Salida:** Sistema en estado limpio. Sin perfil activo.

---

## 4. Categorías configurables

Cada categoría define **qué** se puede configurar, no **cómo** (sin formatos, sin schemas, sin archivos de ejemplo).

### 4.1 Modelos por rol o capacidad

**Qué configura:** Qué modelo de IA se asigna a cada agente o capacidad del framework.

| Elemento configurable | Descripción |
|---|---|
| `model_per_capability` | Asignación de modelo por capacidad (Discovery, Architecture, Implementation, Validation, Memory, Learning). |
| `model_per_agent` | Asignación de modelo por agente específico (SDL, Director, Explorer, Architect, etc.). |
| `default_model` | Modelo por defecto cuando no se especifica asignación. |

**Ejemplo conceptual:** "La capacidad Discovery usa un modelo rápido y barato. La capacidad Architecture usa un modelo con mayor capacidad de razonamiento. El Director usa el modelo por defecto."

**No configura:** Qué capacidades existen (eso es el framework). Qué modelos existen (eso es el proveedor).

### 4.2 Proveedores de IA

**Qué configura:** Qué proveedores de IA están disponibles y cómo acceder a ellos.

| Elemento configurable | Descripción |
|---|---|
| `providers` | Lista de proveedores disponibles (ej. Anthropic, Google, OpenAI, Groq). |
| `provider_priority` | Orden de preferencia entre proveedores. |
| `provider_credentials` | Referencia a las credenciales (nunca las credenciales mismas). |
| `provider_endpoints` | Endpoints alternativos (para proxies, gateways, entornos air-gapped). |

**Ejemplo conceptual:** "Proveedor primario: Anthropic. Proveedor secundario: Google. Groq como fallback de baja latencia para tareas simples."

**No configura:** Las credenciales en texto plano. Los modelos específicos de cada proveedor.

### 4.3 Políticas de fallback

**Qué configura:** Qué hacer cuando un proveedor o modelo falla.

| Elemento configurable | Descripción |
|---|---|
| `fallback_chain` | Cadena de degradación: provider-1 → provider-2 → provider-3 → template determinístico. |
| `fallback_triggers` | Qué condiciones disparan fallback (timeout, rate limit, error 5xx, response malformed). |
| `circuit_breaker` | Después de N fallos consecutivos, pausar el proveedor por T segundos. |
| `graceful_degradation` | Si todos los proveedores fallan, usar templates determinísticos o delegar a humano. |

**Ejemplo conceptual:** "Si Gemini falla por timeout (>30s), reintentar con Groq. Si Groq falla, usar respuesta determinística del response-builder. Si 5 fallos consecutivos en Gemini, pausar por 60s."

**No configura:** La lógica de los templates determinísticos (eso es del producto).

### 4.4 Presupuestos cognitivos

**Qué configura:** Límites de recursos cognitivos por misión, por agente, por tarea.

| Elemento configurable | Descripción |
|---|---|
| `token_budget_per_mission` | Máximo de tokens totales que esta misión puede consumir. |
| `token_budget_per_agent` | Máximo de tokens por agente individual. |
| `token_budget_per_capability` | Máximo de tokens por invocación de capacidad. |
| `context_window_limit` | Porcentaje máximo de la ventana de contexto que un agente puede ocupar. |
| `budget_enforcement` | Qué ocurre al exceder el presupuesto: WARN (advertir y continuar) o HALT (detener la misión). |

**Ejemplo conceptual:** "Misión: 500K tokens máximo. Director: 100K tokens. Explorer: 50K tokens por invocación. Si se excede, advertir pero no detener."

**No configura:** El costo monetario de los tokens (depende del proveedor). La velocidad de generación de tokens.

### 4.5 Límites de costo

**Qué configura:** Límites de consumo económico.

| Elemento configurable | Descripción |
|---|---|
| `cost_limit_per_mission` | Costo máximo en unidades monetarias para esta misión. |
| `cost_limit_per_day` | Costo máximo diario acumulado entre todas las misiones. |
| `cost_estimation` | Si se requiere estimación de costo antes de ejecutar (ENABLED / DISABLED). |
| `cost_enforcement` | WARN o HALT al exceder límites. |

**Ejemplo conceptual:** "Misión: $2.00 máximo. Costo diario total: $10.00. Estimar costo antes de ejecutar. Si se excede el límite diario, HALT."

**No configura:** Los precios de los proveedores. La facturación.

### 4.6 Timeouts

**Qué configura:** Límites de tiempo por misión, por agente, por tarea.

| Elemento configurable | Descripción |
|---|---|
| `mission_timeout` | Tiempo máximo total para la misión completa. |
| `plan_timeout` | Tiempo máximo para la fase PLAN. |
| `build_timeout` | Tiempo máximo para la fase BUILD. |
| `agent_timeout` | Tiempo máximo por invocación de agente. |
| `task_timeout` | Tiempo máximo por tarea individual. |
| `subagent_depth` | `number` | **2** | Profundidad mínima de delegación de subagentes requerida por ARNÉS para la cadena `BUILD → AMC → AEL Domain`. Valor mínimo: 2. |
| `llm_timeout` | Tiempo máximo de espera por respuesta del modelo de IA. |

**Ejemplo conceptual:** "Misión: 30 minutos. PLAN: 5 minutos. BUILD: 25 minutos. Agente individual: 3 minutos. LLM: 60 segundos por request."

**No configura:** La velocidad del modelo (eso es del proveedor). Timeouts de herramientas externas (bash, network).

### 4.7 Paralelismo

**Qué configura:** Estrategia de ejecución concurrente vs secuencial.

| Elemento configurable | Descripción |
|---|---|
| `parallelism_strategy` | SECUENTIAL (una tarea a la vez), OPPORTUNISTIC (paralelizar cuando no hay dependencias), AGGRESSIVE (paralelizar todo lo posible). |
| `max_parallel_agents` | Número máximo de agentes ejecutándose simultáneamente. |
| `dependency_aware` | Si el paralelismo respeta dependencias entre tareas (ENABLED / DISABLED). |

**Ejemplo conceptual:** "Estrategia: OPPORTUNISTIC. Máximo 4 agentes en paralelo. Respetar dependencias: ENABLED. Discovery y Architecture pueden ejecutarse juntos; Implementation espera a Architecture."

**No configura:** Las dependencias entre tareas (eso lo decide el Director en el ExecutionPlan).

### 4.8 Políticas de caché

**Qué configura:** Cuándo y cómo se reutilizan resultados previos.

| Elemento configurable | Descripción |
|---|---|
| `cache_strategy` | NONE, SESSION (dentro de esta misión), PERSISTENT (entre misiones). |
| `cache_scope` | Qué se cachea: agent outputs, file reads, LLM responses, validation results. |
| `cache_invalidation` | Cuándo se invalida el caché: por tiempo, por cambio en el producto, manualmente. |
| `cache_ttl` | Tiempo de vida del caché persistente. |

**Ejemplo conceptual:** "Caché: SESSION. Scope: LLM responses + file reads. Invalidar si el archivo cambió. No persistir entre misiones."

**No configura:** La implementación del almacenamiento del caché. El formato de los datos cacheados.

### 4.9 Logging y observabilidad

**Qué configura:** Nivel de registro y trazabilidad de la ejecución.

| Elemento configurable | Descripción |
|---|---|
| `log_level` | ERROR, WARN, INFO, DEBUG, TRACE. |
| `log_destination` | Dónde se escriben los logs (consola, archivo, servicio externo). |
| `trace_enabled` | Si se registra trazabilidad detallada de decisiones (ENABLED / DISABLED). |
| `metrics_enabled` | Si se recolectan métricas de ejecución (tokens consumidos, tiempo, costo). |

**Ejemplo conceptual:** "Log level: INFO. Destino: archivo `ael/logs/mission.log`. Trazabilidad: ENABLED. Métricas: ENABLED."

**No configura:** El formato de los logs. La herramienta de observabilidad específica.

### 4.10 Feature flags

**Qué configura:** Activación condicional de capacidades experimentales.

| Elemento configurable | Descripción |
|---|---|
| `features` | Mapa de feature flags con estado (ENABLED / DISABLED). |
| `experimental_capabilities` | Capacidades experimentales habilitadas para esta misión. |
| `feature_rollout` | Porcentaje de misiones que usan una feature experimental. |

**Ejemplo conceptual:** "Features: `parallel_validation`=ENABLED, `incremental_context`=DISABLED, `auto_learning`=EXPERIMENTAL(20%)."

**No configura:** Qué features existen (eso es de la implementación). La lógica de cada feature.

### 4.11 Overrides por misión

**Qué configura:** Ajustes puntuales que aplican solo a esta misión.

| Elemento configurable | Descripción |
|---|---|
| `mission_overrides` | Mapa de overrides que modifican temporalmente valores del perfil base. |
| `override_scope` | Qué campos del perfil son overrideables por misión. |
| `override_ttl` | Los overrides expiran al finalizar la misión (siempre). |

**Ejemplo conceptual:** "Para esta misión específica: timeout=45min (en lugar de 30min por defecto), model=claude-opus (en lugar del default). Al finalizar, se descartan los overrides."

**No configura:** Overrides que violen invariantes del framework. Overrides que cambien el producto.

### 4.12 subagent_depth

**Requisito:** `>= 2`

ARNÉS Framework depende de delegación anidada para la ejecución de misiones. La cadena mínima es:

```
BUILD → AMC → AEL Agent (ael-explore | ael-implementer | etc.)
```

Esta cadena requiere 2 niveles de profundidad:
1. BUILD delega en AMC.
2. AMC delega en agentes AEL.

Sin `subagent_depth >= 2`, el framework no puede ejecutar misiones correctamente. Esta configuración se declara en `opencode.json` y debe considerarse un requisito operativo del framework, no una preferencia temporal.

---

## 5. Qué NUNCA se configura

### 5.1 Elementos del Framework (Nivel 0+1)

Estos elementos **nunca** pueden ser configurados por el Runtime Profile. Pertenecen exclusivamente al framework:

| Elemento | Por qué no es configurable |
|---|---|
| Principios fundamentales (P1-P6) | Son la identidad del framework. Configurarlos sería redefinir ARNÉS. |
| Invariantes del framework (F1-F6) | Son condiciones que siempre deben cumplirse. No son opcionales. |
| Arquitectura de dos planos | PLAN y BUILD son estructurales. No se puede deshabilitar un plano. |
| Objetos cognitivos (estructura) | La estructura de Mission, Decision, ExecutionPlan, etc. es fija. |
| Ciclo de vida L1-L4 | Las 4 etapas del Director no son opcionales. |
| Contratos de capacidad | Lo que Discovery debe hacer no es configurable. |
| Separación de tipos de información | Conocimiento, Decisión y Evidencia no se mezclan — nunca. |
| Gobernanza | La jerarquía documental, los procesos de F-ADR, la autoridad del Governor. |
| Versionado del framework | El esquema MAJOR.MINOR.PATCH del framework no se altera por misión. |

**Regla:** Si el Runtime Profile intenta configurar un elemento de esta lista, la validación lo rechaza con `INVALID`. No hay excepción.

### 5.2 Elementos del Producto (Nivel 3)

Estos elementos **nunca** pertenecen al Runtime Profile. Pertenecen al Product Context:

| Elemento | Por qué está en el Product Context |
|---|---|
| Identidad del producto (nombre, versión) | El producto se define a sí mismo. |
| Constitución del producto | Los principios del producto son del producto. |
| ADRs y restricciones arquitectónicas | Decisiones del producto, no de la ejecución. |
| Reglas de negocio | El dominio es del producto. |
| Vocabulario del dominio | La terminología es del producto. |
| Stack tecnológico (lenguaje, DB, framework) | El producto elige su stack. |
| Estructura de directorios | El producto organiza su código. |
| Estado del proyecto (roadmap, backlog, deuda) | El producto gestiona su evolución. |

**Regla:** El Runtime Profile puede **leer** estos elementos del Product Context para informar sus decisiones (ej. "el producto usa TypeScript, usar herramientas de Node.js"), pero nunca **redefinirlos**.

---

## 6. Reglas de precedencia

### 6.1 Jerarquía de autoridad

Cuando múltiples fuentes definen un mismo aspecto de la ejecución, la precedencia es:

```
1. FRAMEWORK (Nivel 0+1)         ← Máxima autoridad. Inmutable.
       │
       │ No puede ser contradicho por ninguna capa inferior.
       ▼
2. RUNTIME PROFILE POR DEFECTO   ← Definido por la implementación.
       │
       │ Aplica a todas las misiones, todos los productos.
       ▼
3. RUNTIME PROFILE POR PRODUCTO  ← Hereda del default, especializa por producto.
       │
       │ Aplica a todas las misiones de este producto.
       ▼
4. RUNTIME PROFILE POR MISIÓN    ← Overrides para esta misión específica.
       │
       │ Mayor especificidad. Expira al finalizar la misión.
       ▼
5. DECISIÓN DEL DIRECTOR         ← Soberanía táctica dentro del ExecutionPlan.
       │
       │ El Director puede ajustar sobre la marcha (ej. "este agente falló,
       │ voy a reintentar con otro modelo"). Debe justificarlo en el ExecutionReport.
```

### 6.2 Regla de especificidad

> **La fuente más específica prevalece sobre la más general, siempre que no contradiga una fuente de mayor autoridad.**

- Un perfil por misión (nivel 4) prevalece sobre un perfil por defecto (nivel 2).
- Pero ningún perfil (niveles 2-4) puede contradecir el framework (nivel 1).
- La decisión del Director (nivel 5) es la más específica pero debe justificarse.

### 6.3 Resolución de conflictos

| Conflicto | Resolución |
|---|---|
| Perfil por defecto dice `timeout=30min`; perfil por misión dice `timeout=45min` | Prevalece el perfil por misión (más específico). |
| Perfil por defecto dice `model=gemini`; el producto no soporta Gemini | El perfil es inválido para este producto. Se escala a WARNING o INVALID. |
| Perfil por misión intenta `parallelism=OFF` pero el invariante F1 requiere validación | El perfil no puede deshabilitar invariantes. INVALID. |
| El Director decide usar otro modelo porque el asignado falló | Permitido (soberanía táctica). Debe registrarse en ExecutionReport. |

### 6.4 Lo que NUNCA puede un perfil inferior

Un perfil de nivel inferior (2-5) **nunca** puede:

- Deshabilitar un invariante del framework.
- Cambiar un principio fundamental.
- Redefinir un objeto cognitivo.
- Alterar la arquitectura de dos planos.
- Modificar la gobernanza.
- Cambiar la identidad o arquitectura del producto.

---

## 7. Relación con otros componentes

### 7.1 Runtime Profile y Product Context

| El Runtime Profile... | El Product Context... |
|---|---|
| **Consume** `runtime.language`, `runtime.build_system`, `runtime.test_runner` del Product Context. | **Provee** información sobre cómo ejecutar el producto. |
| **No redefine** ningún campo del Product Context. | **No contiene** configuración de ejecución de agentes. |
| **Referencia** el Product Context para validar compatibilidad (ej. "¿este modelo de IA existe en esta región?"). | **Es independiente** del Runtime Profile. |
| **Es efímero** (por misión). | **Es estable** (cambia con el producto). |

### 7.2 Runtime Profile y Project Adapter

| El Runtime Profile... | El Project Adapter... |
|---|---|
| **No conoce** al Project Adapter. | **No conoce** al Runtime Profile. |
| Se activa durante PLAN. | Se activa durante ORIENT. |
| Configura cómo ejecutar. | Descubre qué ejecutar. |
| Es consumido por el Director y los agentes. | Es consumido por el Mission Analyzer. |

Son componentes independientes que no se referencian mutuamente. Colaboran a través del Mission Analyzer, que orquesta ambos.

### 7.3 Runtime Profile y Director

El Director es el principal consumidor del Runtime Profile. La relación es:

- El Director **recibe** el Runtime Profile como parte del contexto de BUILD.
- El Director **respeta** la configuración del perfil (timeout, modelo, presupuesto).
- El Director **puede desviarse** del perfil si las condiciones de ejecución lo requieren (fallo de proveedor, tarea más compleja de lo previsto). Debe justificarlo.
- El Director **no modifica** el perfil. Sus decisiones tácticas son para esta misión y no persisten.

### 7.4 Runtime Profile y Governance

- El Runtime Profile por defecto es un documento de Nivel 2. Se modifica con aprobación del Governor.
- Los perfiles por producto son documentos de Nivel 2. Se modifican con aprobación del Governor.
- Los overrides por misión no son documentos. Son decisiones operacionales. No requieren governance formal.
- Un cambio en el schema de Runtime Profile (nuevas categorías configurables) requiere F-ADR de Nivel 1 si afecta la arquitectura de la implementación.

---

## 8. Ejemplos conceptuales

> ⚠️ Los siguientes ejemplos son **ilustraciones conceptuales**. No definen formato, sintaxis ni archivos. Cualquier parecido con JSON, YAML o cualquier formato concreto es incidental.

### 8.1 Perfil por defecto (genérico)

```
perfil: "default"
descripción: "Perfil balanceado para misiones estándar de ingeniería."

modelos:
  default: "claude-sonnet"
  discovery: "claude-haiku"        # rápido y barato para leer archivos
  architecture: "claude-sonnet"    # razonamiento para decisiones arquitectónicas
  implementation: "claude-sonnet"  # balanceado para escribir código
  validation: "claude-haiku"       # validación es verificación, no creación

proveedores:
  primario: "anthropic"
  secundario: "google"
  fallback: "groq"

fallback:
  cadena: [anthropic, google, groq]
  circuit_breaker: { fallos: 5, pausa: 60s }
  graceful_degradation: "templates"

presupuestos:
  tokens_por_mision: 500000
  tokens_por_agente: 100000
  enforcement: "WARN"

timeouts:
  mision: 30min
  plan: 5min
  build: 25min
  agente: 3min
  llm: 60s

paralelismo:
  estrategia: "OPPORTUNISTIC"
  max_agentes: 4
  dependency_aware: true

cache:
  estrategia: "SESSION"
  scope: [llm_responses, file_reads]
  invalidacion: "file_change"

logging:
  nivel: "INFO"
  trace: true
  metrics: true

features:
  parallel_validation: "ENABLED"
  incremental_context: "DISABLED"
```

### 8.2 Perfil para misión de exploración (especializado)

```
perfil: "exploration"
hereda_de: "default"
descripción: "Optimizado para misiones de solo lectura (auditorías, exploración)."

modelos:
  default: "claude-haiku"    # no se necesita razonamiento profundo

presupuestos:
  tokens_por_mision: 200000  # menos tokens: no hay generación de código

timeouts:
  mision: 15min              # misiones de exploración son más cortas

paralelismo:
  estrategia: "AGGRESSIVE"   # leer muchos archivos en paralelo
  max_agentes: 6

features:
  parallel_validation: "DISABLED"  # no hay código que validar
```

### 8.3 Overrides por misión (ajuste puntual)

```
mision: "Refactor del motor de pricing"
perfil_base: "default"
overrides:
  timeouts:
    mision: 45min            # misión compleja, necesita más tiempo
  modelos:
    implementation: "claude-opus"  # refactor crítico, usar modelo más capaz
  presupuestos:
    tokens_por_mision: 800000
    enforcement: "HALT"      # detener si se excede (costo significativo)
```

### 8.4 Nota sobre estos ejemplos

Estos ejemplos muestran **categorías de configuración**, no formatos de implementación. El perfil real podría ser JSON, YAML, TOML, o cualquier formato que la implementación elija. Lo importante es que las categorías y la semántica son las definidas en este contrato.

---

## 9. Extensiones previstas

### 9.1 Capacidades futuras (no diseñadas aún)

| Extensión | Descripción | Dependencia |
|---|---|---|
| **Perfiles dinámicos** | El perfil se ajusta automáticamente según el consumo observado (ej. si la misión va rápido, reducir timeout). | Métricas en tiempo real. |
| **Perfiles por entorno** | Perfiles diferentes para desarrollo, staging, producción. | Configuración de entornos. |
| **Validación de costos en tiempo real** | Bloquear invocaciones si el costo acumulado excede el límite. | API de pricing de proveedores. |
| **A/B testing de configuraciones** | Ejecutar la misma misión con dos perfiles y comparar resultados. | Infraestructura de experimentación. |
| **Perfil auto-optimizado** | Learning sugiere ajustes al perfil basados en misiones anteriores. | Learning capability + histórico de métricas. |
| **Perfil compartido** | Perfiles publicados y reutilizados por la comunidad (ej. "perfil para microservicios Node.js"). | Repositorio de perfiles. |

### 9.2 Lo que este contrato reserva para el futuro

- El formato concreto de serialización (JSON Schema, YAML, etc.).
- El mecanismo de almacenamiento (archivo, base de datos, variable de entorno).
- La herramienta de validación de perfiles.
- La UI/CLI para editar perfiles.
- La integración con sistemas de monitoreo externos.

---

> *El Runtime Profile Contract completa la tríada de implementación de ARNÉS. Junto con el Product Context Contract (qué es el producto) y el Project Adapter (cómo se descubre el contexto), define cómo una implementación configura su comportamiento de ejecución sin modificar el framework ni el producto. Las 11 categorías configurables, las reglas de precedencia de 5 niveles, y los límites explícitos con el framework y el producto garantizan que ARNÉS pueda adaptarse a distintos proyectos y optimizar sus recursos cognitivos sin perder coherencia arquitectónica.*
>
> *Versión 1.0. Documento de Nivel 2. Modificable con aprobación del Governor. Complementa `PRODUCT_CONTEXT_CONTRACT.md` y `PROJECT_ADAPTER_ARCHITECTURE.md` como el tercer pilar de la capa de implementación.*
