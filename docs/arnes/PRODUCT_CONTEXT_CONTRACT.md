# ARNÉS Framework — Product Context Contract v1.0

> **Nivel:** Arquitectónico (Nivel 1)
> **Versión:** 1.0
> **Fecha:** 2026-07-22
> **Estado:** ACTIVE
>
> Este documento define el contrato mediante el cual cualquier producto
> puede conectarse cognitivamente al ARNÉS Framework sin que el framework
> pierda su independencia de dominio.

---

## Índice

1. [Propósito](#1-propósito)
2. [Responsabilidades](#2-responsabilidades)
3. [Ciclo de vida](#3-ciclo-de-vida)
4. [Relación con ARNÉS](#4-relación-con-arnés)
5. [Contrato conceptual](#5-contrato-conceptual)
6. [Ejemplo conceptual — AITOS](#6-ejemplo-conceptual--aitos)
7. [Límites con Runtime Profile](#7-límites-con-runtime-profile)

---

## 1. Propósito

### 1.1 Qué es un Product Context

Un **Product Context** es un documento estructurado —o conjunto de referencias a documentos— que describe todo lo que el ARNÉS Framework necesita saber sobre un producto para poder tomar decisiones de ingeniería sobre él.

Es el **contrato cognitivo** entre el framework y el producto. El framework no conoce el producto. El Product Context le dice al framework lo que necesita saber para trabajar con él.

### 1.2 Qué problema resuelve

Sin un Product Context formal, el framework se enfrenta a uno de dos problemas:

1. **Amnesia:** El framework no sabe nada del producto. Cada misión comienza con el Mission Analyzer preguntando "¿qué es este producto? ¿cómo funciona? ¿dónde está su documentación?". Esto viola la economía cognitiva (P4).

2. **Acoplamiento:** Para evitar la amnesia, el framework incorpora conocimiento del producto en sus propios documentos. El agente PLAN menciona "AITOS", los contratos referencian la constitución del producto, los scripts de enforcement verifican paths del producto. Esto viola la separación Framework/Producto (P2).

El Product Context resuelve ambos: **el framework permanece independiente, pero recibe contexto bajo demanda.**

### 1.3 Qué NO es un Product Context

Un Product Context **no** es:

- ❌ Una copia del código fuente del producto.
- ❌ Un reemplazo de la constitución del producto.
- ❌ Un perfil de ejecución (Runtime Profile) — eso es una capacidad futura distinta.
- ❌ Una configuración de herramientas o agentes.
- ❌ Un mecanismo para que el producto modifique el framework.
- ❌ Un formato de serialización concreto (JSON, YAML) — este documento define el contrato conceptual, no el formato de implementación.

### 1.4 Principio fundamental

> **ARNÉS no incorpora conocimiento del producto. ARNÉS consume un Product Context durante la ejecución de una misión. Finalizada la misión, el framework permanece independiente.**

Este principio es la garantía de que el framework puede construir cualquier producto sin acoplarse a ninguno.

---

## 2. Responsabilidades

### 2.1 Responsabilidad del producto

El producto es responsable de **proveer** su Product Context. El framework no lo descubre, no lo infiere, no lo busca. El producto lo declara.

Si un producto no provee su contexto, el framework opera con conocimiento incompleto. Las decisiones de ingeniería serán de menor calidad. No es una falla del framework: es una omisión del producto.

### 2.2 Información obligatoria

Todo producto DEBE proporcionar la siguiente información en su Product Context:

| Categoría | Información requerida | Propósito |
|---|---|---|
| **Identidad** | Nombre del producto, versión actual, descripción breve. | El framework necesita saber con qué producto está trabajando. |
| **Constitución** | Referencia al documento constitucional del producto. | Define los principios, valores y reglas supremas que gobiernan el producto. |
| **Gobernanza** | Cómo se toman decisiones en el producto (proceso de ADRs, autoridad). | El framework debe respetar la gobernanza del producto al proponer cambios. |
| **Arquitectura** | ADRs vigentes, restricciones arquitectónicas, patrones obligatorios, stack tecnológico. | El framework debe conocer las decisiones arquitectónicas para no violarlas. |
| **Requisitos funcionales** | Qué debe hacer el producto. Funcionalidades, comportamientos esperados, reglas de dominio. | El framework debe entender qué constituye una funcionalidad correcta. |
| **Requisitos no funcionales** | Restricciones de calidad: performance, seguridad, disponibilidad, escalabilidad. | El framework debe conocer los atributos de calidad que debe preservar. |
| **Vocabulario** | Glosario de términos específicos del dominio. | El framework debe usar la terminología correcta al comunicarse sobre el producto. |
| **Estado del proyecto** | Roadmap, backlog, technical debt baseline, certificaciones activas. | El framework debe planificar en función del estado real del proyecto. |
| **Convenciones** | Estándares de código, nomenclatura, estilo, estructura de commits. | El framework debe producir artefactos que respeten las convenciones del producto. |
| **Estructura documental** | Dónde reside cada tipo de documento (ADRs en `docs/adr/`, reglas en `docs/knowledge/`, etc.). | El framework debe saber dónde leer y dónde escribir documentación. |
| **Repositorio** | Ubicación del código fuente, estructura de directorios principal. | El framework debe saber dónde está el código para inspeccionarlo y modificarlo. |
| **Runtime del producto** | Cómo se ejecuta el producto: lenguaje, runtime, build system, test runner, deploy target. | El framework debe saber cómo compilar, testear y ejecutar el producto. |

### 2.3 Información opcional

El producto PUEDE proporcionar adicionalmente:

| Categoría | Información opcional | Cuándo es útil |
|---|---|---|
| **Historial de misiones** | Resumen de misiones anteriores y lecciones aprendidas. | Productos con historial largo donde los patrones de misión son relevantes. |
| **Métricas** | Cobertura de tests, complejidad ciclomática, tamaño del codebase. | Cuando el framework necesita evaluar riesgo cuantitativamente. |
| **Dependencias externas** | APIs, servicios, bases de datos externas. | Cuando los cambios pueden afectar integraciones. |
| **Restricciones de dominio** | Regulaciones, compliance, certificaciones requeridas. | Productos en dominios regulados (finanzas, salud). |
| **Equipo** | Roles, responsabilidades, puntos de contacto. | Productos con múltiples stakeholders humanos. |

### 2.4 Lo que el producto NO debe incluir en su contexto

El Product Context NO debe contener:

- ❌ Código fuente (el framework lo lee del repositorio).
- ❌ Secrets, tokens, credenciales (eso es configuración de entorno, no contexto de producto).
- ❌ Instrucciones para el framework ("usá el modelo X", "ejecutá en paralelo") — eso pertenece al Runtime Profile.
- ❌ Modificaciones a principios o invariantes del framework.
- ❌ Redefiniciones de objetos cognitivos.

---

## 3. Ciclo de vida

### 3.1 Carga

El Product Context se carga al **inicio de cada misión**, durante la etapa ORIENT del Mission Analyzer.

```
Misión inicia
    │
    ▼
ORIENT: ¿Qué producto es este? ¿Dónde está su contexto?
    │
    ▼
Carga del Product Context
    │  El Mission Analyzer lee el contexto del producto.
    │  El contexto informa las etapas ANALYZE → EVALUATE → DECIDE.
    │
    ▼
Misión en ejecución
    │  El contexto está disponible durante toda la misión.
    │  No se recarga a menos que la misión lo requiera explícitamente.
```

**Regla:** El Product Context se carga una vez por misión. Si el producto cambia durante la misión (otro agente modificó un ADR, se agregó deuda), esos cambios se reflejarán en la siguiente misión, no en la actual.

### 3.2 Actualización

El Product Context **no se actualiza automáticamente.** El producto es responsable de mantenerlo actualizado.

| Evento | ¿Requiere actualizar el contexto? |
|---|---|
| Nuevo ADR aprobado | Sí — la sección de arquitectura cambió. |
| Nueva funcionalidad | Sí — los requisitos funcionales cambiaron. |
| Cambio en el backlog | Sí — el estado del proyecto cambió. |
| Cambio de versión del producto | Sí — la identidad cambió. |
| Refactor interno (sin cambio de arquitectura) | No — si los ADRs no cambiaron. |
| Corrección de bug | No — a menos que revele un nuevo requisito no funcional. |

**Regla:** La desactualización del Product Context es deuda del producto, no del framework. Si el contexto está desactualizado, las decisiones del framework pueden ser subóptimas. El framework puede advertirlo, pero no puede corregirlo.

### 3.3 Invalidación

El Product Context **deja de ser válido** cuando:

1. **Cambio de versión MAJOR del producto.** La arquitectura, los ADRs o los requisitos pueden haber cambiado radicalmente. El contexto anterior no es confiable.
2. **Cambio de constitución del producto.** Los principios fundamentales cambiaron. El framework debe conocer los nuevos.
3. **Migración de repositorio.** Las rutas y la estructura documental cambiaron.
4. **Declaración explícita del producto.** El producto marca su contexto como `[DEPRECATED]`.

**Regla:** Un Product Context inválido no debe usarse. Si el framework detecta que el contexto está desactualizado (ej. referencia un ADR que ya no existe), debe señalarlo como hallazgo en el ExecutionReport.

### 3.4 Descarga

Al finalizar la misión, el Product Context **se descarga.** El framework no retiene conocimiento del producto entre misiones — excepto lo que el producto mismo preserva en su memoria (MEMORY.md, CHANGELOG, etc.).

```
Misión finaliza
    │
    ▼
CLOSED (SDL declara)
    │
    ▼
Product Context se descarta
    │  El framework vuelve a su estado independiente.
    │  No conserva referencias al producto.
    │
    ▼
Próxima misión → nuevo ORIENT → nueva carga del contexto
```

---

## 4. Relación con ARNÉS

### 4.1 El framework no conoce al producto

ARNÉS Framework no contiene, en ninguno de sus documentos (Niveles 0 y 1), referencias a productos específicos. No sabe qué productos existen, qué dominios cubren, ni cómo funcionan.

El framework sabe de **ingeniería**: cómo planificar, ejecutar, validar y aprender. No sabe de **dominios**: transporte, finanzas, salud.

### 4.2 El Product Context es el puente

```
┌──────────────────┐         ┌──────────────────┐
│  ARNÉS Framework │         │    Producto       │
│                  │         │                   │
│  • Principios    │         │  • Constitución    │
│  • Arquitectura  │         │  • ADRs           │
│  • Objetos       │         │  • Código         │
│  • Gobernanza    │         │  • Reglas         │
│                  │         │                   │
└────────┬─────────┘         └────────┬──────────┘
         │                            │
         │    PRODUCT CONTEXT         │
         └────────────────────────────┘
              "Soy AITOS v2.4.0.
               Mi constitución está en docs/
               Mis ADRs están en docs/adr/
               Mi código está en src/
               Uso TypeScript + PostgreSQL.
               Mis reglas de pricing están en docs/knowledge/"
```

### 4.3 Flujo durante una misión

```
1. USUARIO solicita misión sobre el producto AITOS.
        │
        ▼
2. MISSION ANALYZER — ORIENT
   "Necesito contexto sobre AITOS."
        │
        ▼
3. CARGA DEL PRODUCT CONTEXT
   "AITOS v2.4.0. Transporte. WhatsApp bot.
    ADRs: arquitectura en capas, database facade, AI-first.
    Deuda: 21 items (5 P1, 10 P2, 6 P3).
    Tests: 771. Build: pasa.
    Estructura: src/lib/ai/, src/lib/services/, src/lib/db/."
        │
        ▼
4. MISSION ANALYZER — ANALYZE, EVALUATE, DECIDE, PLAN
   "El cambio propuesto afecta el servicio de pricing (ADR-005).
    Debo verificar que no viole la arquitectura en capas (ADR-001).
    La deuda P1 no debe aumentar."
        │
        ▼
5. BUILD ejecuta → ExecutionReport
        │
        ▼
6. MISIÓN FINALIZA → CLOSED
   Product Context se descarta.
   El framework no retiene información sobre AITOS.
```

### 4.4 Garantías

El Product Context garantiza que:

1. **El framework permanece independiente.** Ningún documento del framework referencia un producto específico.
2. **El contexto es explícito.** El framework no infiere nada sobre el producto. Todo lo que sabe está declarado en el contexto.
3. **El contexto es temporal.** No sobrevive a la misión. Cada misión comienza con una carga limpia.
4. **El contexto es responsabilidad del producto.** Si está desactualizado, es deuda del producto — no del framework.

---

## 5. Contrato conceptual

### 5.1 Qué define este contrato

Este contrato define **qué información** debe proveer un producto y **qué garantías** ofrece el framework al consumirla. No define el formato de serialización (eso es responsabilidad de cada implementación ARNÉS).

### 5.2 Entradas (lo que el producto provee)

El producto provee al framework:

| Entrada | Tipo conceptual | Obligatorio | Descripción |
|---|---|---|---|
| `identity` | `{ name, version, description }` | ✅ Sí | Quién es el producto. |
| `constitution` | `{ path, summary }` | ✅ Sí | Dónde está su constitución y qué establece. |
| `governance` | `{ adr_process, authority_model }` | ✅ Sí | Cómo toma decisiones arquitectónicas. |
| `architecture` | `{ adrs[], constraints[], patterns[], stack }` | ✅ Sí | Decisiones arquitectónicas vigentes. |
| `functional_requirements` | `{ capabilities[], domain_rules[], behaviors[] }` | ✅ Sí | Qué debe hacer el producto. |
| `non_functional_requirements` | `{ performance, security, availability, ... }` | ✅ Sí | Atributos de calidad. |
| `vocabulary` | `{ terms: [{ name, definition, domain }] }` | ✅ Sí | Terminología del dominio. |
| `project_state` | `{ roadmap, backlog_summary, debt_baseline, certifications }` | ✅ Sí | Estado actual del proyecto. |
| `conventions` | `{ code_style, naming, commit_format, doc_structure }` | ✅ Sí | Estándares del producto. |
| `document_structure` | `{ adrs_path, rules_path, specs_path, ... }` | ✅ Sí | Dónde reside cada tipo de documento. |
| `repository` | `{ url, main_branch, src_structure }` | ✅ Sí | Dónde está el código. |
| `runtime` | `{ language, build_system, test_runner, deploy_target }` | ✅ Sí | Cómo se ejecuta el producto. |

### 5.3 Salidas (lo que el framework garantiza)

Al recibir un Product Context válido, el framework garantiza:

| Garantía | Descripción |
|---|---|
| **Decisiones informadas** | El Mission Analyzer usará el contexto para evaluar impacto, riesgo y alineación. |
| **Respeto arquitectónico** | BUILD no violará ADRs, restricciones ni patrones declarados en el contexto. |
| **Terminología correcta** | Los agentes usarán el vocabulario del producto, no términos genéricos. |
| **Validación pertinente** | Los criterios de éxito reflejarán los requisitos funcionales y no funcionales del producto. |
| **Trazabilidad** | Las decisiones del framework referenciarán ADRs y documentos del producto cuando corresponda. |
| **No acoplamiento** | El framework no retendrá referencias al producto después de la misión. |

### 5.4 Obligaciones mutuas

| Parte | Obligación |
|---|---|
| **Producto** | Mantener el Product Context actualizado. Proveerlo al inicio de cada misión. |
| **Framework** | Consumir el contexto sin modificarlo. No retenerlo después de la misión. No acoplarse al producto. |
| **Implementación** | Proveer el mecanismo para cargar el contexto (lectura de archivos, parsing, validación). |

---

## 6. Ejemplo conceptual — AITOS

> ⚠️ AITOS se utiliza aquí **solo como ejemplo ilustrativo.** Cualquier otro producto —de cualquier dominio— puede proporcionar un Product Context equivalente. El framework no sabe que AITOS existe. Este ejemplo muestra cómo AITOS declararía su contexto; el framework lo consumiría sin conocer su dominio.

### 6.1 Identidad

```
name: "AITOS"
version: "2.4.0"
description: "AI Transportation Operating System — bot inteligente de transporte para WhatsApp"
```

### 6.2 Constitución

```
constitution:
  path: "docs/architecture/AITOS_CONSTITUTION.md"
  summary: "118 disposiciones. Principios: operación basada en evidencia,
           preservación del conocimiento, humildad ante la incertidumbre,
           auditabilidad, no regresión."
```

### 6.3 Gobernanza

```
governance:
  adr_process: "ADRs numerados secuencialmente en docs/adr/. Aprobados por el arquitecto del producto."
  authority: "Constitution > ADRs > Code. Los ADRs pueden contradecir la constitución solo mediante enmienda."
```

### 6.4 Arquitectura

```
architecture:
  adrs:
    - "ADR-001: Arquitectura en capas (utils → db → services → ai → app)"
    - "ADR-002: Database Facade — services usan facade, no db/core directamente"
    - "ADR-005: AI-First Interpretation — sin heurísticas hardcodeadas para contexto ambiguo"
  constraints:
    - "AI no importa de Services (excepto types)"
    - "Utils no importa de nada del proyecto"
  patterns:
    - "Repository pattern para acceso a datos"
    - "Policy pipeline para decisiones conversacionales"
  stack:
    language: "TypeScript"
    runtime: "Node.js"
    framework: "Next.js 14 (App Router)"
    database: "PostgreSQL (Turso)"
    ai: "Gemini (primary), Groq (fallback)"
```

### 6.5 Requisitos funcionales

```
functional_requirements:
  capabilities:
    - "Reserva de transporte vía WhatsApp"
    - "Extracción de slots (origen, destino, pasajeros, fecha, precio)"
    - "Despacho multinivel con timeout progresivo"
    - "Aprendizaje de oportunidades perdidas"
  domain_rules:
    - "Tarifas por par origen-destino con especificidad geográfica"
    - "Precios en ARS y PYG"
    - "Idempotencia de mensajes WhatsApp"
  behaviors:
    - "El bot debe responder en el idioma del usuario"
    - "No se confirma un viaje sin origen y destino"
    - "Un precio no puede fabricarse sin tarifa"
```

### 6.6 Requisitos no funcionales

```
non_functional_requirements:
  performance: "Respuesta < 3 segundos (p95)"
  availability: "99.5% uptime"
  security: "HMAC validation en webhooks. Secrets en variables de entorno."
  data_integrity: "No pérdida de sesiones. Backups diarios."
```

### 6.7 Vocabulario (extracto)

```
vocabulary:
  terms:
    - { name: "slot", definition: "Campo del modelo de viaje (origen, destino, etc.)" }
    - { name: "lead", definition: "Sesión de conversación con un cliente" }
    - { name: "policy", definition: "Regla de decisión que determina la respuesta del bot" }
    - { name: "dispatch", definition: "Proceso de asignación de un viaje a un conductor" }
```

### 6.8 Estado del proyecto

```
project_state:
  roadmap: "docs/ROADMAP.md v1.6b"
  backlog_summary: "~40 tareas abiertas. P0: 2. P1: 5. P2: 15. P3: 18."
  debt_baseline:
    path: "docs/certification/TECHNICAL_DEBT_BASELINE.md"
    summary: "21 items: 5 P1, 10 P2, 6 P3"
  certifications:
    - "CGP1, CGP2, CGP3 — certificaciones de quality gates"
    - "RC1 — release readiness"
```

### 6.9 Convenciones

```
conventions:
  code_style: "ESLint + Prettier. No `any`. No clases para servicios."
  naming: "kebab-case para archivos. camelCase para funciones."
  commit_format: "Conventional Commits (feat:, fix:, refactor:, docs:)"
  doc_structure: "Documentación en docs/. ADRs en docs/adr/. Reglas en docs/knowledge/."
```

### 6.10 Estructura documental

```
document_structure:
  adrs: "docs/adr/"
  architecture: "docs/architecture/"
  knowledge: "docs/knowledge/"
  project: "docs/project/"
  certification: "docs/certification/"
  audit: "docs/audit/"
  incidents: "docs/incidents/"
```

### 6.11 Repositorio

```
repository:
  url: "github.com/taxiguazu/GuazuTransfer-Web"
  main_branch: "master"
  src_structure:
    ai: "src/lib/ai/"
    services: "src/lib/services/"
    db: "src/lib/db/"
    utils: "src/lib/utils/"
    config: "src/config/"
    app: "src/app/"
```

### 6.12 Runtime

```
runtime:
  language: "TypeScript 5.x"
  build_system: "Next.js (npm run build)"
  test_runner: "Jest (npm test) — 771 tests"
  deploy_target: "Vercel"
  package_manager: "npm"
```

### 6.13 Nota sobre este ejemplo

Este ejemplo **no** es una especificación de formato. Es una ilustración de la **información** que un producto debe proveer. La implementación concreta (JSON, YAML, Markdown estructurado) es responsabilidad de cada implementación ARNÉS y no está definida por este contrato.

Cualquier producto —un sistema de facturación, una plataforma de e-learning, un motor de recomendaciones— puede proveer un contexto equivalente con su propia identidad, arquitectura, vocabulario y reglas de dominio. El framework lo consumiría exactamente igual.

---

## 7. Límites con Runtime Profile

### 7.1 Dos conceptos distintos

El **Product Context** y el **Runtime Profile** son conceptos diferentes que no deben confundirse:

| Dimensión | Product Context | Runtime Profile |
|---|---|---|
| **Responde a** | ¿Qué es este producto? | ¿Cómo ejecuto esta misión? |
| **Estabilidad** | Cambia con el producto (semanas/meses) | Cambia con la misión (minutos/horas) |
| **Alcance** | Todo el producto | Esta misión específica |
| **Contiene** | Identidad, arquitectura, ADRs, reglas, vocabulario | Modelo de IA, temperatura, timeout, paralelismo, presupuesto de tokens |
| **Proveedor** | El producto (parte de su documentación) | La implementación o el usuario |
| **Consumidor** | Mission Analyzer (SDL) | Director (AEL), agentes |

### 7.2 Qué pertenece al Product Context

✅ **SÍ pertenece al Product Context:**

- Qué lenguaje usa el producto.
- Qué base de datos utiliza.
- Cómo se compila y testea.
- Cuál es su arquitectura de capas.
- Qué reglas de negocio deben respetarse.
- Dónde están sus documentos.
- Cuál es su vocabulario de dominio.

### 7.3 Qué NO pertenece al Product Context (pertenece al Runtime Profile)

❌ **NO pertenece al Product Context. Pertenece al Runtime Profile:**

- Qué modelo de IA usar (Gemini, Claude, GPT-4).
- Con qué temperatura operar.
- Cuánto timeout por tarea.
- Si paralelizar o secuenciar subagentes.
- Cuántos tokens de presupuesto por misión.
- Qué nivel de logging activar.
- Si ejecutar en modo "rápido" o "exhaustivo".
- Estrategia de reintentos ante fallos.

### 7.4 Por qué la separación es importante

Si el Product Context incluyera configuración de ejecución:

1. **Cambiar el modelo de IA requeriría modificar el contexto del producto.** Pero el modelo de IA es una decisión de implementación, no del producto.
2. **Dos implementaciones ARNÉS no podrían compartir el mismo contexto.** AEL en OpenCode podría necesitar un timeout diferente que AEL en Cursor.
3. **Se violaría la independencia del framework.** El framework empezaría a conocer detalles de ejecución que pertenecen a la implementación.

La separación garantiza que:

- El **producto** define qué es y cómo debe comportarse (Product Context).
- La **implementación** define cómo ejecutar las misiones (Runtime Profile).
- El **framework** consume ambos sin acoplarse a ninguno.

### 7.5 Interfaz entre Product Context y Runtime Profile

El Runtime Profile (definido en RUNTIME_PROFILE_CONTRACT.md) deberá:

1. **Referenciar el Product Context** como fuente de verdad sobre el producto.
2. **No duplicar** información que ya está en el Product Context.
3. **Extender** el contexto con decisiones de ejecución (modelo, timeout, estrategia).
4. **Ser efímero:** puede cambiar entre misiones sin que el producto cambie.

```
Product Context (estable)    +    Runtime Profile (efímero)    =    Contexto completo de misión
        │                                    │
        ▼                                    ▼
  "Soy AITOS v2.4.0.                 "Usar Gemini.
   TypeScript + PostgreSQL.           Timeout 120s.
   771 tests.                         Paralelizar Discovery + Architecture.
   21 items de deuda."                Presupuesto: 200K tokens."
```

### 7.6 Lo que este contrato no define

Este contrato **no** define:

- El formato de serialización del Product Context (JSON, YAML, TOML).
- Cómo se valida que un Product Context está completo.
- Cómo se versiona el Product Context respecto al framework.
- Cómo se almacena o distribuye el Product Context.
- El mecanismo de carga (lectura de archivo, API, variable de entorno).

Estos detalles son responsabilidad de cada implementación ARNÉS (Nivel 2) y se definirán en documentos operacionales futuros.

---

> *El Product Context Contract es el puente cognitivo entre ARNÉS Framework y cualquier producto construido sobre él. Define qué información debe proveer el producto, cómo la consume el framework, y qué garantías ofrece cada parte. Permite que el framework permanezca independiente de dominio mientras recibe contexto suficiente para tomar decisiones de ingeniería informadas.*
>
> *Versión 1.0. Documento de Nivel 1. Modificable mediante F-ADR con revisión del SDL. El Runtime Profile será objeto de una especificación independiente futura.*
