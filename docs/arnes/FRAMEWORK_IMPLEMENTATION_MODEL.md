# ARNÉS Framework — Implementation Model v1.0

> **Nivel:** Arquitectónico (Nivel 1) — define la separación formal de responsabilidades entre el framework, sus implementaciones y los productos.
> **Versión:** 1.0
> **Fecha:** 2026-07-22
> **Estado:** ACTIVE
>
> Este documento establece la arquitectura de tres capas del ecosistema ARNÉS.
> Al finalizar su lectura, debe ser imposible confundir qué pertenece al framework,
> qué pertenece a una implementación, y qué pertenece a un producto.

---

## Índice

1. [El modelo de tres capas](#1-el-modelo-de-tres-capas)
2. [ARNÉS Framework](#2-arnés-framework)
3. [Implementaciones ARNÉS](#3-implementaciones-arnés)
4. [Productos](#4-productos)
5. [Reglas de dependencia](#5-reglas-de-dependencia)
6. [Validación de fronteras](#6-validación-de-fronteras)
7. [Ejemplos concretos](#7-ejemplos-concretos)
8. [Evolución de las capas](#8-evolución-de-las-capas)

---

## 1. El modelo de tres capas

### 1.1 La arquitectura

El ecosistema ARNÉS se organiza en tres capas con responsabilidades disjuntas:

```
┌──────────────────────────────────────────────┐
│            ARNÉS FRAMEWORK                    │
│  (Especificación abstracta, independiente     │
│   de plataforma y dominio)                    │
│                                               │
│  Define: principios, arquitectura, objetos    │
│  cognitivos, contratos, gobernanza.           │
│                                               │
│  No contiene: código, reglas de negocio,      │
│  conocimiento de dominio.                     │
└──────────────────────┬───────────────────────┘
                       │
                       │ implementa
                       ▼
┌──────────────────────────────────────────────┐
│        IMPLEMENTACIONES ARNÉS                 │
│  (Realizaciones concretas para plataformas    │
│   específicas)                                │
│                                               │
│  Ejemplo: AEL — ARNÉS Agent Execution Layer   │
│  para el ecosistema OpenCode.                 │
│                                               │
│  Puede: implementar agentes, adaptar          │
│  contratos, extender con herramientas.        │
│                                               │
│  No puede: modificar principios, redefinir    │
│  objetos cognitivos, cambiar gobernanza.      │
└──────────────────────┬───────────────────────┘
                       │
                       │ construye
                       ▼
┌──────────────────────────────────────────────┐
│              PRODUCTOS                        │
│  (Sistemas de software con dominio,           │
│   arquitectura y ciclo de vida propios)       │
│                                               │
│  Ejemplo: AITOS — bot de transporte           │
│  inteligente para WhatsApp.                   │
│                                               │
│  Contiene: lógica de negocio, schema,         │
│  ADRs de producto, código fuente.             │
│                                               │
│  No puede: modificar el framework ni          │
│  la implementación. Redefinir principios.     │
└──────────────────────────────────────────────┘
```

### 1.2 Por qué tres capas y no dos

La CONSTITUTION original definió dos entidades: Framework y Producto. La práctica reveló una tercera:

- **AEL no es el framework.** AEL contiene decisiones de implementación que no pertenecen a la especificación abstracta: referencias a paths concretos (`ael/contracts/enforce.sh` verifica `src/lib/services/`), configuración de plataforma (`.opencode/agents/`), y adaptaciones al ecosistema OpenCode.
- **AEL no es un producto.** AEL no tiene dominio de negocio. No sabe de transporte, reservas ni taxis. Es genérico: podría usarse para construir cualquier tipo de software.
- **AEL es una implementación.** Materializa los conceptos abstractos del framework en artefactos concretos para una plataforma específica.

La capa de implementación siempre existió. Este documento le da nombre, responsabilidades y límites formales.

### 1.3 Correspondencia con la jerarquía documental

Este modelo de tres capas se corresponde con la jerarquía de GOVERNANCE.md:

| Capa | Niveles de GOVERNANCE.md | Estabilidad |
|---|---|---|
| **ARNÉS Framework** | Nivel 0 (Fundacional) + Nivel 1 (Arquitectónico) | Muy alta / Alta |
| **Implementación** | Nivel 2 (Operacional) | Media |
| **Producto** | Nivel 3 (Producto) | Variable |

---

## 2. ARNÉS Framework

### 2.1 Qué es

El ARNÉS Framework es la **especificación abstracta** del sistema operativo cognitivo para ingeniería de software asistida por IA. Es independiente de:

- **Plataforma:** no sabe si corre en OpenCode, Cursor, Codex, CLI o cualquier otro entorno.
- **Lenguaje:** no prescribe TypeScript, Python ni ningún lenguaje específico.
- **Dominio:** no sabe de transporte, finanzas, salud ni ningún dominio de negocio.
- **Producto:** no está acoplado a AITOS ni a ningún producto específico.

### 2.2 Qué contiene

| Categoría | Elementos | Documento principal |
|---|---|---|
| **Identidad** | Propósito, principios fundamentales (P1-P6) | `ARNES_CONSTITUTION.md` |
| **Arquitectura** | Dos planos cognitivos (estratégico y operacional), Mission Analyzer, Director, Decision Engine, Cognitive Engines (SDL, LIGHT_PLANNER, AEL), capa de agentes, Cognitive Invocation Layer | `COGNITIVE_ARCHITECTURE.md`, `COGNITIVE_INVOCATION_LAYER.md` |
| **Objetos** | 6 objetos cognitivos con estados, entradas, salidas y ciclo de vida | `COGNITIVE_OBJECT_MODEL.md` |
| **Contratos** | Separación estratégico↔operacional, tipos de información (conocimiento/decision/evidencia), invariantes (F1-F6) | `ARNES_CONSTITUTION.md` §9, `COGNITIVE_ARCHITECTURE.md` §9 |
| **Gobernanza** | Jerarquía documental, autoridad, procesos de cambio, Framework ADRs | `GOVERNANCE.md` |
| **Versiones** | Esquema MAJOR.MINOR.PATCH, política de deprecación | `VERSIONING.md` |
| **Capacidades** | Discovery, Architecture, Implementation, Validation, Memory, Learning, Governance | `ARNES_CONSTITUTION.md` §5, `COGNITIVE_ARCHITECTURE.md` §6 |
| **Invocación** | Cognitive Invocation Layer: matriz de autorización entre Primary Modes y Cognitive Engines | `COGNITIVE_INVOCATION_LAYER.md` |

### 2.3 Qué NO contiene

El framework **no** contiene:

- Código fuente ejecutable.
- Prompts de agentes para plataformas específicas.
- Scripts de enforcement que referencien paths concretos.
- Configuración de herramientas (`.opencode/`, `package.json`, `tsconfig.json`).
- Reglas de negocio de ningún dominio.
- Conocimiento sobre transporte, taxis, reservas, precios, o cualquier otro dominio.
- ADRs de producto (las decisiones arquitectónicas de AITOS no son parte del framework).
- Schema de base de datos o migraciones.

### 2.4 Lo que el framework exige

Toda implementación y todo producto deben satisfacer:

- Los 6 principios fundamentales (P1-P6).
- Los 6 invariantes del framework (F1-F6).
- Los contratos de capacidad (Discovery, Architecture, Implementation, Validation, Memory, Learning, Governance).
- La separación de planos (el plano estratégico consume conocimiento → produce decisiones; el plano operacional consume decisiones → produce evidencia).
- La trazabilidad completa (Decisión → ExecutionPlan → Ejecución → ExecutionReport → Verificación).

---

## 3. Implementaciones ARNÉS

### 3.1 Qué es una implementación

Una implementación ARNÉS es una **realización concreta** del framework para una plataforma o entorno específico. Traduce los conceptos abstractos del framework en artefactos ejecutables: agentes, scripts, configuraciones, prompts.

Una implementación responde a la pregunta: **¿cómo se materializa ARNÉS en esta plataforma?**

### 3.2 Puede haber múltiples implementaciones

El framework no prescribe una única implementación. Pueden coexistir:

| Implementación | Plataforma | Estado |
|---|---|---|
| **AEL** (Agent Execution Layer) | OpenCode | Activa — primera implementación |
| *(futura)* AEL para Cursor | Cursor IDE | No existe |
| *(futura)* AEL para Codex | OpenAI Codex CLI | No existe |
| *(futura)* ARNÉS Standalone | CLI / API independiente | No existe |

Cada implementación adapta el framework a las capacidades y restricciones de su plataforma, pero **no puede contradecir la especificación abstracta.**

### 3.3 Qué puede hacer una implementación

Una implementación **puede**:

| Acción | Ejemplo en AEL |
|---|---|
| **Implementar agentes** | Crear subagentes `@ael-explore`, `@ael-architect`, `@ael-implementer` que ejercen las capacidades definidas por el framework. |
| **Adaptar contratos** | Especificar cómo se verifica el contrato de Validation en esta plataforma (ej. `npm test`, `npm run build`, `bash ael/contracts/enforce.sh`). |
| **Definir herramientas** | Crear scripts de enforcement (`enforce.sh`), diagnóstico (`diagnose.sh`), y artefactos de soporte. |
| **Extender con configuración** | Definir permisos de agentes, reglas de plataforma, configuraciones de entorno. |
| **Especificar formatos** | Definir el formato concreto de ExecutionPlan (JSON, YAML) y ExecutionReport para esta plataforma. |
| **Agregar guías operativas** | Documentar cómo usar ARNÉS en esta plataforma específica. |
| **Optimizar para la plataforma** | Aprovechar capacidades nativas de la plataforma (ej. paralelismo de OpenCode, streaming de Cursor). |
| **Implementar adapters de producto** | Crear Project Adapters que descubran, carguen y validen el Product Context. |
| **Configurar perfiles de ejecución** | Definir Runtime Profiles por defecto, por producto y por tipo de misión. |

### 3.4 Qué NO puede hacer una implementación

Una implementación **no puede**:

| Acción prohibida | Por qué |
|---|---|
| **Modificar principios fundamentales (P1-P6)** | Los principios son del framework, no de la implementación. |
| **Redefinir objetos cognitivos** | La estructura de Mission, Decision, ExecutionPlan, etc. está definida por el framework. Una implementación puede elegir el formato de serialización, no la semántica. |
| **Cambiar la arquitectura de dos planos** | La separación estratégico↔operacional es invariante del framework. Una implementación no puede agregar un tercer plano ni fusionarlos. |
| **Eliminar o modificar invariantes del framework (F1-F6)** | Los invariantes son condiciones que toda implementación debe garantizar. |
| **Alterar los contratos de capacidad** | Lo que Discovery debe hacer, lo que Validation garantiza, etc. está definido por el framework. |
| **Acoplarse a un producto específico** | Una implementación no puede contener referencias a AITOS, sus paths, su schema o sus reglas de negocio. Si lo hace, no es una implementación — es parte del producto. |
| **Modificar la gobernanza** | La jerarquía documental, los procesos de cambio y la autoridad son del framework. |

### 3.5 Lo que una implementación garantiza

Una implementación conforme a ARNÉS garantiza que:

1. Todos los agentes requeridos por el framework existen y cumplen sus contratos.
2. Los mecanismos de validación (tests, build, contratos) están operativos.
3. La trazabilidad (Decisión → Plan → Reporte) es posible dentro de la plataforma.
4. El conocimiento puede preservarse entre misiones.
5. La separación estratégico↔operacional se respeta en toda comunicación entre agentes.

---

## 4. Productos

### 4.1 Qué es un producto

Un producto es un **sistema de software con dominio propio** construido utilizando una implementación de ARNÉS. Tiene:

- **Dominio de negocio:** resuelve problemas en un ámbito específico (transporte, finanzas, salud, etc.).
- **Arquitectura propia:** decisiones técnicas sobre cómo estructurar el código, qué base de datos usar, qué patrones aplicar.
- **Ciclo de vida independiente:** evoluciona según las necesidades de su dominio, no según las del framework.

### 4.2 Qué contiene un producto

| Categoría | Elementos | Ejemplo en AITOS |
|---|---|---|
| **Constitución** | Principios, valores y reglas del producto | `AITOS_CONSTITUTION.md` |
| **ADRs** | Decisiones arquitectónicas del producto | `docs/adr/001-layered-architecture.md` |
| **Código fuente** | Implementación del dominio | `src/lib/services/`, `src/lib/ai/`, `src/lib/db/` |
| **Schema** | Modelo de datos del dominio | `schema.sql` (39 tablas de transporte) |
| **Reglas de negocio** | Lógica específica del dominio | `docs/knowledge/pricing-rules.md`, `dispatch-rules.md` |
| **Tests** | Verificación del comportamiento del producto | `__tests__/`, `*.test.ts` |
| **Configuración** | Variables de entorno, secrets, deploy | `.env`, `vercel.json`, `package.json` |

### 4.3 Qué NO contiene un producto

Un producto **no** contiene:

- Documentos del framework (Niveles 0 y 1).
- Documentos de la implementación (Nivel 2).
- Definiciones de capacidades o agentes del framework.
- Objetos cognitivos redefinidos.
- Principios del framework modificados.

Si un producto contiene这些东西, hay acoplamiento indebido que debe resolverse.

### 4.4 Relación del producto con el framework

El producto **no interactúa directamente con el framework.** Interactúa con una **implementación** del framework.

```
Producto ──usado por──▶ Implementación ARNÉS ──conforme a──▶ ARNÉS Framework
```

El producto:
- Es construido por agentes que operan bajo las reglas de una implementación ARNÉS.
- Declara qué versión del framework utiliza (ver VERSIONING.md §8.2).
- Debe satisfacer los invariantes del framework (F1-F6) — verificados por la implementación, no por el producto.
- Define su propia arquitectura mediante ADRs de producto, que no pueden contradecir el framework.

---

## 5. Reglas de dependencia

### 5.1 Dirección de dependencias

Las dependencias entre capas son **unidireccionales y descendentes:**

```
ARNÉS Framework
    │
    │  "implementa"
    ▼
Implementación ARNÉS
    │
    │  "construye"
    ▼
Producto
```

**Permitido (↓):**
- Una implementación **depende de** la especificación del framework.
- Un producto **es construido usando** una implementación.
- Un producto **hereda** las restricciones del framework a través de la implementación.

**Prohibido (↑):**
- El framework **no puede depender de** una implementación específica.
- El framework **no puede depender de** un producto específico.
- Una implementación **no puede depender de** un producto específico.

### 5.2 Matriz de dependencias

| | Depende de Framework | Depende de Implementación | Depende de Producto |
|---|---|---|---|
| **Framework** | — (autorreferencia) | ❌ PROHIBIDO | ❌ PROHIBIDO |
| **Implementación** | ✅ REQUERIDO | — (autorreferencia) | ❌ PROHIBIDO |
| **Producto** | ❌ PROHIBIDO (solo vía implementación) | ✅ REQUERIDO | — (autorreferencia) |

### 5.3 Consecuencias de violar dependencias

| Violación | Consecuencia | Ejemplo |
|---|---|---|
| **Framework depende de implementación** | El framework deja de ser independiente de plataforma. No puede usarse en otros entornos. | `ARNES_CONSTITUTION.md` referencia `ael/contracts/enforce.sh`. |
| **Framework depende de producto** | El framework se acopla a un dominio. No puede construir otros tipos de productos. | Un invariante del framework dice "todo producto debe tener tabla `trips`". |
| **Implementación depende de producto** | La implementación no es reutilizable. Cada producto requiere su propia implementación. | `ael/constitution/CONTRACTS.md` verifica paths de AITOS. |
| **Producto modifica el framework** | Se rompe la separación de autoridad. El producto se vuelve imposible de auditar. | Un ADR de AITOS modifica un principio fundamental. |

### 5.4 Regla de tránsito

Un producto **hereda** todas las restricciones del framework a través de la implementación, pero **no puede modificar ninguna.**

```
Framework: "Todo cambio debe ser validado (F5)."
    ↓ (hereda)
Implementación: "La validación se ejecuta con `npm test && npm run build`."
    ↓ (hereda)
Producto: "Mis tests pasan. Mi build compila."
```

El producto no elige si validar o no. La implementación no elige si el invariante F5 aplica o no. La cadena de herencia es obligatoria.

### 5.5 Lo que un producto SÍ puede decidir

Dentro de las restricciones del framework, el producto tiene soberanía sobre:

- **Qué construir:** el dominio, las funcionalidades, la experiencia de usuario.
- **Cómo estructurarse:** arquitectura interna, patrones de código, stack tecnológico.
- **Qué reglas de negocio aplicar:** precios, horarios, políticas de despacho.
- **Qué ADRs emitir:** decisiones arquitectónicas del producto que no contradigan el framework.
- **Cuándo versionar:** el producto tiene su propio ciclo de versiones independiente del framework.

---

## 6. Validación de fronteras

### 6.1 Cómo verificar que una capa no invade otra

Cada capa puede ser auditada para detectar violaciones de frontera:

#### Framework (Niveles 0 y 1)

**Test de pureza:** ¿El documento referencia alguna plataforma, herramienta, path concreto o dominio de negocio?

- ❌ `"El Director usará OpenCode para ejecutar bash."` → referencia plataforma.
- ❌ `"Los productos deben tener un servicio de pricing."` → referencia dominio.
- ✅ `"El Director puede invocar cualquier capacidad en cualquier orden."` → abstracto.

#### Implementación (Nivel 2)

**Test de generalidad:** ¿La implementación funcionaría para construir un producto de otro dominio sin modificar una sola línea?

- ❌ `enforce.sh` verifica `src/lib/services/trip-execution/` → referencia producto.
- ❌ Un prompt de agente dice "AITOS es un bot de taxis" → referencia producto.
- ✅ Un prompt de agente dice "executá los tests del proyecto" → genérico.

#### Producto (Nivel 3)

**Test de soberanía:** ¿El producto redefine algún concepto del framework?

- ❌ Un ADR de producto dice "el principio P1 no aplica en este módulo" → invade framework.
- ❌ Un documento del producto redefine qué es un ExecutionPlan → invade framework.
- ✅ Un ADR de producto dice "usamos el patrón Repository para la capa de datos" → soberanía del producto.

### 6.2 Señales de acoplamiento indebido

| Señal | Capas acopladas | Gravedad |
|---|---|---|
| Un documento del framework menciona un path del producto | Framework ↔ Producto | Crítica |
| Un invariante del framework solo tiene sentido en el dominio del producto | Framework ↔ Producto | Crítica |
| Un script de la implementación referencia tablas del producto | Implementación ↔ Producto | Alta |
| Un agente de la implementación menciona reglas de negocio | Implementación ↔ Producto | Alta |
| Un documento del framework menciona una herramienta de plataforma | Framework ↔ Implementación | Media |
| El producto declara su propia versión de un objeto cognitivo | Producto ↔ Framework | Alta |

### 6.3 Principio de extracción

El test definitivo de que las capas están correctamente separadas:

> **Si el framework puede extraerse a un repositorio independiente, y una implementación puede extraerse a otro repositorio independiente, y ambos pueden usarse para construir un segundo producto de un dominio completamente distinto — sin modificar una sola línea del framework ni de la implementación — entonces las capas están correctamente separadas.**

Mientras esto no sea posible, existe acoplamiento residual que debe resolverse.

---

## 7. Ejemplos concretos

### 7.1 AEL como implementación

**AEL** (Agent Execution Layer, ubicado en `ael/`) es la primera implementación de ARNÉS. Materializa el framework para el ecosistema OpenCode.

| Elemento del framework | Concreción en AEL |
|---|---|
| **Capacidad Discovery** | Subagente `@ael-explore` con prompt que describe su contrato. |
| **Capacidad Validation** | Subagente `@ael-audit` + script `ael/contracts/enforce.sh`. |
| **Director (plano operacional)** | Dominio AEL, coordinado por AMC. AMC es invocado por ARNÉS o por el Primary Mode BUILD. |
| **Mission Analyzer (plano estratégico)** | Cognitive Engines SDL y LIGHT_PLANNER, invocados por el Primary Mode PLAN desde `.opencode/agents/plan.md`. |
| **Objetos cognitivos** | ExecutionPlan como JSON estructurado, producido por SDL o LIGHT_PLANNER. |
| **Ciclo de vida L1-L4** | L1 Understanding → L2 Operational Planning → L3 Execution → L4 Closure. Implementado en el prompt de BUILD y en la sección "Cómo trabajás". |
| **Gobernanza** | `ael/government/ORGANIZATION.md` define roles; `ael/constitution/CONTRACTS.md` define enforcement. |

**La relación entre Primary Modes y el dominio AEL sigue la Cognitive Invocation Layer:** los Primary Modes (ARNÉS, BUILD) no contienen la ejecución — delegan en AMC, el coordinador interno del dominio AEL. AMC selecciona y coordina las capacidades AEL. La matriz de autorización completa está en `COGNITIVE_INVOCATION_LAYER.md`.

> **Dependencia de runtime:** Esta cadena de delegación (`BUILD → AMC`) requiere `subagent_depth >= 2` configurado en `opencode.json`. Ver [Runtime Profile Contract](RUNTIME_PROFILE_CONTRACT.md) para más detalles.

**Lo que AEL agrega al framework:**
- Formato concreto de ExecutionPlan (JSON con campos específicos).
- Reglas de enforcement automatizadas (`enforce.sh`, `diagnose.sh`).
- Permisos de herramientas por agente (`.opencode/agents/`).
- Doctrina profesional específica para agentes OpenCode.
- Integración con el sistema de memoria de OpenCode (`.opencode/memory/MEMORY.md`).

**Deuda de implementación conocida en AEL:**
- `CONTRACTS.md` verifica paths de AITOS (`src/lib/services/`, `src/lib/ai/`). Esto es acoplamiento Implementación↔Producto que deberá resolverse al generalizar AEL.

### 7.2 AITOS como producto

**AITOS** (TaxiGuazú / GuazuTransfer-Web) es el primer producto construido sobre ARNÉS vía AEL.

| Elemento | Evidencia en AITOS |
|---|---|
| **Dominio** | Transporte: reservas de taxi, despacho, tarifas. |
| **Constitución** | `AITOS_CONSTITUTION.md` (~118 disposiciones). |
| **ADRs** | 14 ADRs en `docs/adr/` (arquitectura en capas, database facade, AI-first, etc.). |
| **Código** | `src/` — bot de WhatsApp con pipeline conversacional. |
| **Schema** | `schema.sql` — 39 tablas (trips, drivers, pricing, dispatch, learning). |
| **Reglas de negocio** | `docs/knowledge/` — pricing, dispatch, geo, fleet, learning rules. |

**Lo que AITOS NO es:**
- AITOS no es una implementación de ARNÉS. No contiene agentes, contratos de capacidad ni enforcement.
- AITOS no es parte del framework. Sus ADRs, schema y reglas son específicos del dominio de transporte.

---

## 8. Evolución de las capas

### 8.1 Cada capa evoluciona a su propio ritmo

| Capa | Ritmo | Gatillador típico |
|---|---|---|
| **Framework** | Lento (meses/años) | Nuevo principio arquitectónico, generalización desde múltiples implementaciones. |
| **Implementación** | Medio (semanas/meses) | Nueva capacidad de plataforma, optimización, nuevo agente. |
| **Producto** | Rápido (días/semanas) | Nueva funcionalidad de dominio, cambio de reglas de negocio, feedback de usuarios. |

### 8.2 Qué puede disparar una nueva implementación

Una nueva implementación de ARNÉS se justifica cuando:

- Se desea usar ARNÉS en una plataforma diferente (Cursor, Codex, CLI).
- La implementación actual (AEL) está demasiado acoplada a su plataforma y separarla es más costoso que crear una nueva.
- Se requieren capacidades de plataforma que la implementación actual no puede proveer.

### 8.3 Qué puede disparar un cambio en el framework

El framework cambia cuando:

- Múltiples implementaciones revelan un patrón que debería ser parte de la especificación abstracta.
- Un producto revela una limitación del framework que no puede resolverse a nivel de implementación.
- La evolución de la ingeniería de software asistida por IA requiere nuevos conceptos.

El framework **no** cambia porque un producto específico lo necesita. Si AITOS necesita algo que el framework no provee, la solución está en el nivel de implementación o de producto — no en el framework.

---

> *Este documento es el mapa de responsabilidades del ecosistema ARNÉS. Define qué pertenece a cada capa, qué puede hacer cada una, y qué está estrictamente prohibido. Su propósito es garantizar que el framework permanezca independiente, las implementaciones permanezcan reutilizables, y los productos permanezcan gobernables.*
>
> *Versión 1.0. Documento de Nivel 1. Modificable mediante F-ADR con revisión del SDL.*
