# ARNÉS Framework — Project Adapter Architecture v1.0

> **Nivel:** Operacional (Nivel 2) — define un componente de la capa de implementación.
> **Versión:** 1.0
> **Fecha:** 2026-07-22
> **Estado:** ACTIVE
> **Deriva de:** `PRODUCT_CONTEXT_CONTRACT.md` v1.0, `FRAMEWORK_IMPLEMENTATION_MODEL.md` v1.0
>
> Este documento especifica la arquitectura del Project Adapter: el componente
> de la capa de implementación responsable de conectar cualquier producto con
> el ARNÉS Framework sin introducir acoplamiento entre ambos.

---

## Índice

1. [Rol en el modelo de tres capas](#1-rol-en-el-modelo-de-tres-capas)
2. [Arquitectura general](#2-arquitectura-general)
3. [Ciclo de vida](#3-ciclo-de-vida)
4. [Qué pertenece al Adapter](#4-qué-pertenece-al-adapter)
5. [Qué pertenece al Framework](#5-qué-pertenece-al-framework)
6. [Múltiples adapters](#6-múltiples-adapters)
7. [Puntos de extensión](#7-puntos-de-extensión)
8. [Relación con el Product Context Contract](#8-relación-con-el-product-context-contract)
9. [Relación con Runtime Profile](#9-relación-con-runtime-profile)
10. [Inconsistencias detectadas](#10-inconsistencias-detectadas)

---

## 1. Rol en el modelo de tres capas

### 1.1 Posición

El Project Adapter es un componente de la **capa de Implementación** (Nivel 2). Reside entre el Mission Analyzer (Nivel 1, plano estratégico) y el Producto (Nivel 3).

```
┌──────────────────────────────────────────┐
│        ARNÉS FRAMEWORK (Nivel 0+1)       │
│                                          │
│  Mission Analyzer                        │
│      │                                   │
│      │ "Necesito contexto del producto"  │
│      ▼                                   │
│  ┌────────────────────────────────┐      │
│  │     PROJECT ADAPTER (Nivel 2)  │      │
│  │                                │      │
│  │  Descubre, carga, valida,      │      │
│  │  construye, entrega, descarta  │      │
│  │  el Product Context.           │      │
│  └────────────┬───────────────────┘      │
│               │                          │
└───────────────┼──────────────────────────┘
                │
                │ Lee documentos del producto
                ▼
┌──────────────────────────────────────────┐
│          PRODUCTO (Nivel 3)              │
│                                          │
│  Constitución, ADRs, reglas, código,     │
│  schema, tests, documentación.           │
└──────────────────────────────────────────┘
```

### 1.2 Responsabilidad fundamental

El Project Adapter responde a la pregunta:

> **¿Cómo obtiene el Mission Analyzer el contexto de un producto específico sin que el framework conozca ese producto?**

Su responsabilidad es **traducir** la información que existe en el producto (documentos, archivos, configuración) al formato de Product Context que el Mission Analyzer espera, según el contrato definido en `PRODUCT_CONTEXT_CONTRACT.md`.

### 1.3 Por qué es necesario

Sin un Project Adapter, el Mission Analyzer tendría que:

- Saber dónde buscar la constitución del producto → **acoplamiento**.
- Conocer la estructura de directorios del producto → **acoplamiento**.
- Interpretar formatos específicos del producto → **acoplamiento**.
- Distinguir entre documentos relevantes e irrelevantes → **acoplamiento**.

El Project Adapter encapsula todo ese conocimiento específico del producto en un componente reemplazable. El Mission Analyzer solo conoce la interfaz del adapter, no el producto.

### 1.4 Invariante de independencia

> **El Mission Analyzer no sabe qué adapter está usando. El adapter no modifica el framework. El producto no sabe que el adapter existe.**

---

## 2. Arquitectura general

### 2.1 Componentes del adapter

```
┌─────────────────────────────────────────────────────┐
│                PROJECT ADAPTER                       │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │DISCOVER  │─▶│  LOAD    │─▶│ VALIDATE │          │
│  │          │  │          │  │          │          │
│  │ ¿Dónde   │  │ Leer     │  │ ¿Está    │          │
│  │ está la  │  │ docs     │  │ completo?│          │
│  │ info?    │  │          │  │          │          │
│  └──────────┘  └──────────┘  └────┬─────┘          │
│                                    │                │
│                                    ▼                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ DISCARD  │◀─│ DELIVER  │◀─│  BUILD   │          │
│  │          │  │          │  │          │          │
│  │ Limpiar  │  │ Entregar │  │Construir │          │
│  │ al final │  │ al MA    │  │Context   │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │        CONFIGURACIÓN DEL ADAPTER           │      │
│  │  • Mapa de documentos                     │      │
│  │  • Reglas de validación                   │      │
│  │  • Puntos de extensión                    │      │
│  └───────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘
```

### 2.2 Flujo de invocación

```
Misión inicia
    │
    ▼
Mission Analyzer — ORIENT
    │
    │ "Necesito contexto del producto activo."
    │
    ▼
PROJECT ADAPTER — activado
    │
    ├── 1. DISCOVER
    ├── 2. LOAD
    ├── 3. VALIDATE
    ├── 4. BUILD
    └── 5. DELIVER ──▶ Product Context ──▶ Mission Analyzer
                                              │
                                              ▼
                                        ANALYZE → EVALUATE → ...
                                              │
                                              ▼
                                        CLOSED
                                              │
                                              ▼
                                    PROJECT ADAPTER — DISCARD
```

### 2.3 El adapter no es un agente

El Project Adapter **no** es una capacidad del framework (como Discovery o Validation). No es un agente que el Director invoca discrecionalmente. Es un **componente de infraestructura** de la capa de implementación que se activa automáticamente al inicio de cada misión.

| Propiedad | Agente (ej. Explorer) | Project Adapter |
|---|---|---|
| **Invocación** | A discreción del Director | Automática al iniciar misión |
| **Alcance** | Una tarea específica | Toda la misión |
| **Contrato** | Definido por el framework (Nivel 1) | Definido por la implementación (Nivel 2) |
| **Reemplazable** | No (es parte del framework) | Sí (por producto o por tipo de producto) |
| **Estado** | Stateless | Mantiene el contexto durante la misión |

---

## 3. Ciclo de vida

### 3.1 Etapa 1 — DISCOVER

**Propósito:** Localizar las fuentes de información del producto.

**Qué hace:**
- Identifica el producto activo (nombre, versión).
- Localiza su directorio raíz.
- Escanea la estructura documental para encontrar:
  - Constitución del producto.
  - ADRs.
  - Reglas de conocimiento/dominio.
  - Documentación de arquitectura.
  - Roadmap, backlog, baseline de deuda.
  - Archivos de configuración (`package.json`, `tsconfig.json`).
  - Estructura de código fuente.

**Entrada:** Identificador del producto activo (provisto por el usuario o el entorno).

**Salida:** Un **mapa de fuentes** — lista de archivos y directorios relevantes con sus paths.

**Regla:** El discovery **no** lee el contenido de los archivos. Solo identifica qué archivos existen y dónde están. Si un archivo esperado no existe, se registra como hallazgo (no como error).

**Punto de decisión:** Si el discovery no encuentra fuentes suficientes para construir un contexto mínimo, el adapter puede:
- Reportar `NOT READY` al Mission Analyzer (la misión no puede comenzar sin contexto).
- Proceder con contexto parcial y advertir al Mission Analyzer.

### 3.2 Etapa 2 — LOAD

**Propósito:** Leer el contenido de las fuentes descubiertas.

**Qué hace:**
- Lee cada archivo identificado en DISCOVER.
- Extrae la información relevante de cada fuente:
  - De `package.json`: nombre, versión, scripts, dependencias.
  - De la constitución: principios, valores, reglas supremas.
  - De los ADRs: decisiones arquitectónicas vigentes, constraints.
  - De los documentos de conocimiento: reglas de negocio, glosario.
  - Del roadmap/backlog: estado del proyecto, prioridades.
  - Del baseline de deuda: items pendientes, severidad.

**Entrada:** Mapa de fuentes (output de DISCOVER).

**Salida:** **Datos crudos** — contenido relevante extraído de cada fuente, sin procesar.

**Regla:** El adapter **no interpreta** el contenido en esta etapa. Solo extrae. La interpretación semántica ocurre en BUILD. Esto permite que LOAD sea genérico (leer archivos) mientras BUILD es específico (entender qué significan).

### 3.3 Etapa 3 — VALIDATE

**Propósito:** Verificar que la información cargada satisface los requisitos mínimos del `PRODUCT_CONTEXT_CONTRACT.md`.

**Qué hace:**
- Verifica que los 12 campos obligatorios del contrato tienen datos:
  - `identity`: nombre y versión presentes.
  - `constitution`: path y resumen presentes.
  - `governance`: proceso de ADR documentado.
  - `architecture`: al menos un ADR o constraint.
  - `functional_requirements`: al menos una capacidad o regla.
  - `non_functional_requirements`: al menos un atributo.
  - `vocabulary`: al menos un término definido.
  - `project_state`: roadmap o backlog accesible.
  - `conventions`: estándares documentados.
  - `document_structure`: paths de documentos.
  - `repository`: URL o path del repositorio.
  - `runtime`: lenguaje, build system, test runner.

**Entrada:** Datos crudos (output de LOAD).

**Salida:**
- **Veredicto:** `VALID` (todos los campos obligatorios presentes) o `INCOMPLETE` (faltan campos).
- **Reporte de completitud:** qué campos están presentes, cuáles faltan, cuáles tienen datos insuficientes.

**Regla:** Si el veredicto es `INCOMPLETE`, el adapter lo reporta al Mission Analyzer. La misión puede continuar con contexto parcial, pero el Mission Analyzer debe ajustar su nivel de confianza.

### 3.4 Etapa 4 — BUILD

**Propósito:** Construir el Product Context a partir de los datos validados.

**Qué hace:**
- Estructura los datos crudos en el formato de Product Context.
- Para cada uno de los 12 campos:
  - `identity`: consolida nombre, versión y descripción.
  - `constitution`: extrae principios clave (no el documento completo).
  - `architecture`: resume ADRs vigentes, constraints activos, stack.
  - `functional_requirements`: lista capacidades, reglas de dominio, comportamientos.
  - `non_functional_requirements`: resume atributos de calidad.
  - `vocabulary`: compila glosario de términos del dominio.
  - `project_state`: resume roadmap, backlog, deuda, certificaciones.
  - `conventions`: resume estándares de código, naming, commits.
  - `document_structure`: mapea tipos de documento a paths.
  - `repository`: consolida URL, branch, estructura de src.
  - `runtime`: consolida lenguaje, build, test, deploy.

**Entrada:** Datos validados (output de VALIDATE).

**Salida:** **Product Context** — estructura de datos que satisface el `PRODUCT_CONTEXT_CONTRACT.md`.

**Regla:** BUILD **no** copia documentos completos. Resume y referencia. El Product Context debe ser ligero: contiene lo esencial para que el Mission Analyzer tome decisiones, no la documentación completa del producto.

### 3.5 Etapa 5 — DELIVER

**Propósito:** Entregar el Product Context al Mission Analyzer.

**Qué hace:**
- Pone el Product Context a disposición del Mission Analyzer.
- El Mission Analyzer lo consume durante ORIENT y lo utiliza en ANALYZE → EVALUATE → DECIDE → PLAN.
- El contexto está disponible para consulta durante toda la misión.

**Entrada:** Product Context (output de BUILD).

**Salida:** Product Context accesible para el Mission Analyzer.

**Regla:** Una vez entregado, el Product Context es **inmutable** durante la misión. Si el producto cambia durante la misión (otro agente modificó un ADR), esos cambios no se reflejan en el contexto actual. Se reflejarán en la próxima misión.

### 3.6 Etapa 6 — DISCARD

**Propósito:** Liberar el contexto al finalizar la misión.

**Qué hace:**
- Elimina el Product Context de la memoria del adapter.
- Libera referencias a archivos del producto.
- Restaura el adapter a su estado inicial (listo para la próxima misión).

**Cuándo se activa:**
- El Mission Analyzer declara la misión CLOSED.
- O la misión es abortada.

**Entrada:** Señal de fin de misión.

**Salida:** Adapter en estado idle. Sin referencias al producto.

**Regla:** Después de DISCARD, el adapter no retiene ninguna información sobre el producto. La próxima misión comienza con DISCOVER desde cero. Esto garantiza que el adapter siempre refleje el estado actual del producto, no un estado anterior.

---

## 4. Qué pertenece al Adapter

### 4.1 Responsabilidades del adapter

El Project Adapter es responsable de:

| Responsabilidad | Descripción |
|---|---|
| **Conocer la estructura del producto** | Sabe dónde están los documentos de un producto específico. |
| **Leer archivos del producto** | Accede al sistema de archivos para leer documentos. |
| **Extraer información relevante** | Sabe qué secciones de cada documento contienen información útil para el contexto. |
| **Validar completitud** | Verifica que el producto provee la información mínima requerida por el contrato. |
| **Construir el contexto** | Estructura la información en el formato de Product Context. |
| **Entregar al Mission Analyzer** | Pone el contexto a disposición cuando se solicita. |
| **Descartar al finalizar** | Libera recursos y referencias al terminar la misión. |
| **Reportar hallazgos** | Informa si falta información, si hay inconsistencias, o si el contexto está desactualizado. |

### 4.2 Lo que el adapter PUEDE hacer

- ✅ Leer cualquier archivo del producto (documentación, configuración, código).
- ✅ Interpretar formatos específicos del producto (Markdown, JSON, YAML, SQL).
- ✅ Aplicar heurísticas para extraer información (ej. "el primer heading de CONSTITUTION.md contiene los principios").
- ✅ Cachear resultados dentro de una misión (no entre misiones).
- ✅ Reportar advertencias sobre contexto incompleto o desactualizado.

### 4.3 Lo que el adapter NO puede hacer

- ❌ **Modificar archivos del producto.** El adapter es de solo lectura.
- ❌ **Modificar el framework.** El adapter no puede cambiar principios, arquitectura ni objetos cognitivos.
- ❌ **Tomar decisiones de ingeniería.** El adapter provee contexto; el Mission Analyzer decide.
- ❌ **Retener información entre misiones.** Después de DISCARD, el adapter no recuerda nada.
- ❌ **Reemplazar al Mission Analyzer.** El adapter no analiza, evalúa ni planifica.
- ❌ **Invocar agentes.** El adapter es un componente de infraestructura, no un orquestador.

---

## 5. Qué pertenece al Framework

### 5.1 Lo que el framework define (el adapter implementa)

| Definido por el Framework (Nivel 0+1) | Implementado por el Adapter (Nivel 2) |
|---|---|
| El concepto de Product Context | La construcción concreta del contexto para un producto |
| Los 12 campos obligatorios | Cómo extraer cada campo de los archivos del producto |
| El ciclo de vida (carga/descarga por misión) | El mecanismo de carga/descarga |
| La interfaz con el Mission Analyzer (ORIENT) | La invocación concreta en la plataforma |
| La garantía de independencia | La verificación de que no se introdujo acoplamiento |

### 5.2 Lo que el framework NO define

El framework **no** define:

- Qué archivos leer para obtener cada campo.
- Cómo parsear formatos de documento (Markdown, JSON, YAML).
- Qué heurísticas usar para extraer información.
- Cómo cachear o indexar documentos grandes.
- El formato de serialización del Product Context.
- La ubicación del adapter en el sistema de archivos.

Estas son decisiones de implementación. Cada adapter las resuelve según el producto y la plataforma.

### 5.3 Garantía de no invasión

El adapter puede implementarse sin modificar una sola línea de los documentos del framework (Niveles 0 y 1). Si un adapter requiere modificar el framework para funcionar, el adapter está mal diseñado.

---

## 6. Múltiples adapters

### 6.1 Un adapter por tipo de producto

Diferentes productos organizan su información de manera diferente. ARNÉS soporta múltiples adapters:

```
┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│  ADAPTER A     │   │  ADAPTER B     │   │  ADAPTER C     │
│  (AITOS)       │   │  (Producto X)  │   │  (Producto Y)  │
│                │   │                │   │                │
│  Sabe leer:    │   │  Sabe leer:    │   │  Sabe leer:    │
│  • docs/adr/   │   │  • decisions/  │   │  • specs/      │
│  • docs/know/  │   │  • rules/      │   │  • design/     │
│  • ael/artif/  │   │  • glossary/   │   │  • api/        │
└───────┬────────┘   └───────┬────────┘   └───────┬────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────┐
│              PROJECT ADAPTER RESOLVER                    │
│  Determina qué adapter usar según el producto activo.    │
│  Un solo adapter por misión.                             │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Adapter por defecto

ARNÉS provee un **adapter genérico** que funciona con cualquier producto que siga convenciones estándar:

- `docs/` para documentación.
- `src/` para código fuente.
- `package.json` para metadata.
- Markdown para documentos.

Si un producto sigue estas convenciones, el adapter genérico puede construir un contexto aceptable sin configuración adicional.

### 6.3 Creación de un nuevo adapter

Para crear un adapter específico para un producto, se requiere:

1. **Mapa de fuentes:** dónde residen los 12 campos obligatorios en la estructura de archivos del producto.
2. **Reglas de extracción:** cómo extraer cada campo de sus fuentes.
3. **Reglas de validación:** criterios específicos del producto para considerar un campo "completo".
4. **Configuración de descubrimiento:** paths, patrones de archivo, exclusiones.

El adapter se registra en la configuración de la implementación ARNÉS. No requiere modificar el framework.

### 6.4 Reglas de convivencia

- **Un adapter por misión.** El Mission Analyzer trabaja con un producto a la vez.
- **El adapter es seleccionado por el Mission Analyzer durante ORIENT**, basado en el producto activo.
- **Dos adapters no pueden estar activos simultáneamente** para el mismo Mission Analyzer.
- **Un adapter puede servir a múltiples misiones** del mismo producto.

---

## 7. Puntos de extensión

### 7.1 Puntos de extensión definidos

El Project Adapter expone los siguientes puntos donde implementaciones futuras pueden extender su comportamiento sin modificar el núcleo:

| Punto de extensión | Etapa | Propósito | Ejemplo de extensión futura |
|---|---|---|---|
| **Source Resolver** | DISCOVER | Cómo encontrar fuentes de información. | Leer de un repositorio git en lugar del filesystem local. Leer de una API de documentación. |
| **Format Parser** | LOAD | Cómo interpretar formatos de archivo. | Soporte para AsciiDoc, reStructuredText, OpenAPI specs. |
| **Field Extractor** | BUILD | Cómo extraer un campo específico del contrato. | Extraer `vocabulary` de comentarios Javadoc. Extraer `architecture` de diagramas C4. |
| **Completeness Rule** | VALIDATE | Qué constituye un campo "completo". | Reglas específicas por dominio (ej. "productos financieros requieren campo `compliance`"). |
| **Context Cache** | DELIVER | Cómo mantener disponible el contexto durante la misión. | Cache en memoria, archivo temporal, base de datos embebida. |
| **Delivery Channel** | DELIVER | Cómo el Mission Analyzer accede al contexto. | Inyección directa en prompt. Archivo de referencia. Variable de entorno. |

### 7.2 Principio de extensión

> **Extender el adapter no debe requerir modificar el núcleo del adapter.**

Cada punto de extensión debe ser reemplazable independientemente. Un nuevo Format Parser no debería requerir reescribir el Field Extractor.

### 7.3 Extensiones futuras previstas (no diseñadas aún)

| Extensión | Descripción | Dependencia |
|---|---|---|
| **Remote Product Context** | Leer contexto de un producto en un repositorio remoto (GitHub, GitLab). | Source Resolver |
| **Incremental Context** | Actualizar solo los campos que cambiaron desde la última misión, en lugar de reconstruir todo. | Context Cache |
| **Context Diff** | Comparar el contexto actual con el de la misión anterior para detectar cambios en el producto. | Context Cache |
| **Multi-repo Adapter** | Construir contexto de un producto cuyo código y documentación están en repositorios separados. | Source Resolver |
| **Validated Context Schema** | Validar el Product Context contra un schema formal (JSON Schema, TypeScript types). | Completeness Rule |

---

## 8. Relación con el Product Context Contract

### 8.1 El contrato define QUÉ; el adapter define CÓMO

| `PRODUCT_CONTEXT_CONTRACT.md` (Nivel 1) | `PROJECT_ADAPTER_ARCHITECTURE.md` (Nivel 2) |
|---|---|
| Define 12 campos obligatorios. | Define cómo descubrir y extraer cada campo. |
| Especifica el ciclo de vida conceptual. | Especifica el ciclo de vida operacional (6 etapas). |
| Es independiente de plataforma. | Es genérico pero asume filesystem local. |
| No define formato de serialización. | No define formato de serialización (delega a BUILD). |
| Establece garantías. | Establece mecanismos. |

### 8.2 Trazabilidad

Cada etapa del adapter satisface una sección del contrato:

| Etapa del adapter | Sección del contrato que satisface |
|---|---|
| DISCOVER | §3.1 (Carga) — localizar fuentes |
| LOAD | §2.2, §2.3 — leer información obligatoria y opcional |
| VALIDATE | §5.2 — verificar que los 12 campos están presentes |
| BUILD | §5.1 — estructurar la información como Product Context |
| DELIVER | §4.3 — poner el contexto a disposición del Mission Analyzer |
| DISCARD | §3.4 (Descarga) — liberar al finalizar la misión |

### 8.3 Conformidad

Un adapter **conforme** es aquel que:

1. Produce un Product Context con los 12 campos obligatorios (o reporta explícitamente cuáles faltan).
2. Carga el contexto al inicio de la misión y lo descarta al finalizar.
3. No modifica archivos del producto.
4. No modifica el framework.
5. No retiene información del producto entre misiones.

---

## 9. Relación con Runtime Profile

### 9.1 Separación clara

| Project Adapter | Runtime Profile (futuro) |
|---|---|
| Responde a "¿qué es este producto?" | Responde a "¿cómo ejecuto esta misión?" |
| Opera en la frontera Producto → Implementación | Opera en la frontera Implementación → Framework |
| Se activa en ORIENT | Se activa durante PLAN (para que BUILD lo use) |
| Produce: Product Context | Produce: configuración de ejecución |
| Uno por producto | Uno por misión (puede variar entre misiones) |

### 9.2 Interfaz futura

Cuando el Runtime Profile se especifique:

- El Runtime Profile **consumirá** campos del Product Context (especialmente `runtime`: lenguaje, build system, test runner).
- El Runtime Profile **no duplicará** información que ya está en el Product Context.
- El adapter **no conocerá** el Runtime Profile. Son componentes independientes.

---

## 10. Inconsistencias detectadas

Durante el diseño del Project Adapter se detectaron las siguientes brechas en documentos existentes. Se registran como recomendaciones PATCH.

### 10.1 `FRAMEWORK_IMPLEMENTATION_MODEL.md` §3.3

**Brecha:** La lista de lo que una implementación PUEDE hacer no menciona explícitamente "implementar adapters de producto".

**Recomendación PATCH:** Agregar una fila a la tabla de §3.3:

```
| **Implementar adapters de producto** | Crear Project Adapters que descubran, carguen y validen el Product Context de productos específicos. |
```

### 10.2 `COGNITIVE_ARCHITECTURE.md` §3.1

**Brecha:** La función del Mission Analyzer dice que "Recibe conocimiento existente (documentación, memoria, reports previos, baseline)" pero no especifica el mecanismo de recepción. El Project Adapter formaliza ese mecanismo.

**Recomendación PATCH:** Agregar una nota en §3.1 que referencie el Project Adapter como el mecanismo estándar de adquisición de conocimiento del producto:

```
El conocimiento existente se adquiere a través del Project Adapter
(definido en PROJECT_ADAPTER_ARCHITECTURE.md), que construye un
Product Context conforme al PRODUCT_CONTEXT_CONTRACT.md.
```

### 10.3 `GOVERNANCE.md` §2.1 — Nivel 2

**Brecha:** La lista de documentos de Nivel 2 incluye `ael/constitution/SPEC.md`, `ORGANIZATION.md`, `CONTRACTS.md` y `roles/`, pero no contempla documentos de arquitectura de componentes de implementación como el Project Adapter.

**Recomendación PATCH:** Agregar `PROJECT_ADAPTER_ARCHITECTURE.md` como ejemplo de documento de Nivel 2 que especifica un componente de implementación. No modificar la lista existente; agregar una nota:

```
La capa de implementación puede incluir documentos de arquitectura
de componentes (ej. PROJECT_ADAPTER_ARCHITECTURE.md) que especifican
el diseño de mecanismos operacionales sin definir el framework.
```

---

> *El Project Adapter es el componente que materializa la independencia del ARNÉS Framework. Permite que el framework construya cualquier producto sin conocer su dominio, su estructura de archivos, ni sus convenciones. El adapter encapsula ese conocimiento específico en un componente reemplazable de la capa de implementación, garantizando que el framework permanezca genérico mientras recibe contexto suficiente para tomar decisiones de ingeniería informadas.*
>
> *Versión 1.0. Documento de Nivel 2. Modificable con aprobación del Governor. Sujeto a refinamiento cuando se implemente el primer adapter concreto.*
