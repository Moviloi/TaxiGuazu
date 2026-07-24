# ARNÉS Framework — Constitution v1.0

> **Nivel:** Fundacional — define la identidad, propósito y principios del framework.
> **Versión:** 1.0
> **Fecha:** 2026-07-22
> **Estado:** ACTIVE
>
> Esta Constitución es la fuente de autoridad del ARNÉS Framework.
> Todo producto construido sobre ARNÉS se rige por esta Constitución.
> Toda especificación operacional deriva de ella.

---

## Índice

1. [Identidad y propósito](#1-identidad-y-propósito)
2. [Separación Framework / Producto](#2-separación-framework--producto)
3. [Principios fundamentales](#3-principios-fundamentales)
4. [Economía cognitiva](#4-economía-cognitiva)
5. [Pensamiento bajo demanda](#5-pensamiento-bajo-demanda)
6. [Agentes](#6-agentes)
7. [Objetos cognitivos](#7-objetos-cognitivos)
8. [Gobernanza](#8-gobernanza)
9. [Invariantes del framework](#9-invariantes-del-framework)
10. [Relación con especificaciones derivadas](#10-relación-con-especificaciones-derivadas)

---

## 1. Identidad y propósito

### 1.1 Qué es ARNÉS

ARNÉS es un **framework de ingeniería de software asistida por IA basado en restricciones**. No es una herramienta. No es un producto. No es un pipeline. Es un sistema operativo cognitivo que gobierna cómo se construye software.

Su propósito es único: **maximizar la calidad de la ingeniería minimizando costo, tiempo, contexto y riesgo.**

ARNÉS no prescribe cómo trabajar. Define lo que debe cumplirse siempre. Dentro de esos límites, la ejecución es soberana.

### 1.2 Qué construye ARNÉS

ARNÉS construye **productos**. Un producto es cualquier sistema de software con dominio, arquitectura y ciclo de vida propios. ARNÉS provee la maquinaria cognitiva para que esos productos nazcan, evolucionen y se mantengan con calidad de ingeniería.

```
ARNÉS Framework
      ↓
Productos construidos sobre él
```

ARNÉS no sabe de dominios. No sabe de transporte, reservas, taxis o precios. Sabe de ingeniería: invariantes, contratos, capacidades, decisiones, evidencia.

### 1.3 Por qué existe

El software asistido por IA requiere un nuevo tipo de gobernanza. Sin ella:

- Las decisiones se dispersan entre agentes sin trazabilidad.
- La calidad se vuelve no verificable.
- El conocimiento se pierde entre misiones.
- La complejidad crece sin control.

ARNÉS existe para que eso no ocurra. Es la respuesta a la pregunta: **¿cómo gobernamos la creación de software cuando quien lo construye no es humano?**

---

## 2. Separación Framework / Producto

### 2.1 El principio de separación

El framework y el producto son entidades distintas con responsabilidades distintas. Esta separación no es organizacional: es arquitectónica.

| Dimensión | Framework (ARNÉS) | Producto |
|---|---|---|
| **Sabe de** | Ingeniería de software | Dominio de negocio |
| **Define** | Cómo se construye | Qué se construye |
| **Contiene** | Invariantes, capacidades, contratos, objetos cognitivos | ADRs, código, schema, reglas de negocio |
| **Cambia** | Excepcionalmente, mediante enmienda | Según su propio ciclo de evolución |
| **Gobierna** | El proceso de creación | El comportamiento del sistema |

### 2.2 Lo que el framework garantiza

El framework garantiza que:

1. Toda decisión de ingeniería es trazable a una necesidad.
2. Todo cambio de estado es validado.
3. El conocimiento valioso es preservado.
4. La arquitectura no se degrada sin autorización explícita.
5. Ninguna misión deja el sistema en peor estado del que lo encontró.

### 2.3 Lo que el framework no garantiza

El framework no garantiza:

- Que el producto resuelva correctamente su dominio.
- Que las reglas de negocio sean correctas.
- Que la experiencia de usuario sea buena.
- Que el producto sea rentable.

Estas son responsabilidades del producto, gobernadas por su propia constitución.

### 2.4 La interfaz Framework-Producto

La interfaz entre el framework y el producto es un contrato bidireccional:

```
Framework → Producto:  "Te construyo bajo estas reglas."
Producto → Framework:  "Estas son mis decisiones arquitectónicas (ADRs)."
```

El framework impone restricciones de proceso. El producto define restricciones de dominio. Ambos conviven sin colisionar porque operan en planos distintos.

---

## 3. Principios fundamentales

Estos principios son irreducibles. No pueden suspenderse, relajarse ni reinterpretarse sin una enmienda a esta Constitución.

### P1 — Soberanía del Director

El Director (capa operacional) es soberano dentro de los límites de un Execution Plan aprobado. Decide cómo ejecutar, qué capacidades invocar, en qué orden, y cuándo detenerse. El framework no prescribe ningún pipeline, secuencia de fases ni flujo de trabajo.

**Fundamento:** La rigidez procesal genera desperdicio. Misiones triviales no necesitan fases. Misiones complejas requieren libertad de maniobra. La soberanía permite que el costo de proceso sea proporcional a la complejidad real.

### P2 — Separación cognitiva

El pensamiento estratégico y la ejecución operacional son funciones cognitivas distintas que no deben mezclarse.

```
Plano Estratégico (SDL, LIGHT_PLANNER):  consume conocimiento → produce decisiones
Plano Operacional (AEL):                 consume decisiones → produce evidencia
```

**Fundamento:** Mezclar planificación y ejecución genera ciclos de reinterpretación infinita. La separación permite que cada plano opere con el contexto mínimo necesario.

**Nota de implementación:** Los Primary Modes PLAN y BUILD son puntos de entrada del usuario que invocan los Cognitive Engines (SDL/LIGHT_PLANNER y AEL respectivamente) a través de la Cognitive Invocation Layer. Los modos no contienen los motores — los invocan. Ver `COGNITIVE_INVOCATION_LAYER.md`.

### P3 — Evidencia sobre supuestos

Toda decisión debe basarse en el estado real del sistema, no en suposiciones sobre él. La inspección del código fuente, los resultados de tests, y las auditorías producen evidencia. Las creencias no verificadas no son evidencia.

**Fundamento:** En ingeniería de software, el código es la verdad. La documentación puede mentir. La memoria puede fallar. Solo la evidencia extraída del sistema real es confiable.

### P4 — Economía cognitiva

Cada acción del framework consume recursos cognitivos: contexto del modelo, tokens, tiempo de cómputo, atención humana. El framework debe maximizar el valor de ingeniería producido por unidad de recurso cognitivo consumido.

**Fundamento:** Los recursos cognitivos son finitos. Cada token gastado en proceso que no produce valor es un token que no se gasta en calidad. El framework debe ser minimalista por diseño.

### P5 — Preservación del conocimiento

El conocimiento adquirido durante una misión —decisiones, patrones, lecciones, deuda descubierta— debe sobrevivir a la misión que lo generó. Lo que se aprende en una misión debe estar disponible para la siguiente.

**Fundamento:** Sin preservación, cada misión parte de cero. El framework no puede mejorar si olvida. El conocimiento es el activo que se acumula con el tiempo.

### P6 — Trazabilidad universal

Para cualquier cambio en cualquier producto construido sobre ARNÉS, debe ser posible responder: qué se cambió, por qué decisión, con qué evidencia, y quién lo autorizó.

**Fundamento:** Sin trazabilidad, la ingeniería es indistinguible de la artesanía. La trazabilidad permite auditoría, aprendizaje y mejora continua.

---

## 4. Economía cognitiva

### 4.1 El principio de mínimo contexto

Cada agente debe operar con el contexto estrictamente necesario para su función. Un agente de ejecución no necesita conocer la estrategia. Un agente de planificación no necesita inspeccionar el código.

El contexto se transmite mediante objetos cognitivos estructurados (ExecutionPlan, ExecutionReport), no mediante narrativa informal. Esto minimiza el volumen de información que cruza cada frontera.

### 4.2 No precomputar

El framework no anticipa trabajo que podría no ser necesario. No genera planes para escenarios hipotéticos. No produce documentación que nadie solicitó. No ejecuta capacidades "por si acaso".

Todo componente debe existir para resolver una necesidad demostrada. Si la necesidad no existe, el componente no existe.

### 4.3 Reutilizar antes de crear

Antes de producir nuevo conocimiento, el framework verifica qué conocimiento ya existe. La memoria del equipo, los patrones detectados, y las decisiones previas son fuentes primarias. Crear conocimiento redundante viola la economía cognitiva.

### 4.4 Proporcionalidad

La rigurosidad del proceso debe ser proporcional a la complejidad de la misión. Un cambio de texto no requiere las mismas validaciones que un cambio de arquitectura. Un typo no requiere un ADR.

---

## 5. Pensamiento bajo demanda

### 5.1 No hay pipeline fijo

ARNÉS no define un pipeline. No hay fases obligatorias. No hay secuencias predefinidas. No hay "siempre hacer X antes de Y".

El Director recibe un Execution Plan y decide —en ese momento, para esa misión— cómo ejecutarlo. Puede invocar cualquier capacidad en cualquier orden, cualquier número de veces, o ninguna.

### 5.2 Capacidades, no fases

Lo que otros frameworks llaman "fases" (análisis, diseño, implementación, testing), ARNÉS los modela como **capacidades**: herramientas disponibles para el Director. El Director elige cuáles usar, no el framework.

| Capacidad | Función |
|---|---|
| **Discovery** | Leer y entender el estado real del sistema. |
| **Architecture** | Validar integridad arquitectónica. |
| **Implementation** | Aplicar cambios al sistema. |
| **Validation** | Verificar calidad (tests, build, contratos). |
| **Memory** | Preservar conocimiento. |
| **Learning** | Extraer patrones de conocimiento acumulado. |
| **Governance** | Gestionar restricciones, autoridad y excepciones. |

### 5.3 Delegación opcional

El Director puede ejecutar cualquier capacidad internamente si juzga que delegar en un subagente no agrega valor. La delegación es una optimización, no un requisito.

---

## 6. Agentes

### 6.1 Qué es un agente

Un agente es una entidad que ejerce una capacidad del framework dentro de un contrato definido. Cada agente tiene:

- **Un rol**: qué función cumple.
- **Un contrato**: qué debe hacer, qué no debe hacer, qué garantiza.
- **Autoridad delimitada**: qué decisiones puede tomar sin consultar.

### 6.2 Qué no es un agente

Un agente no es:

- Un paso en un pipeline.
- Una fase en un proceso.
- Un microservicio.
- Una entidad autónoma con objetivos propios.

Los agentes existen para servir al Director. No tienen agenda propia. No inician trabajo sin ser invocados.

### 6.3 Tipos de agentes

| Agente | Capacidad | Función |
|---|---|---|
| **Strategic Director (SDL)** | Planificación estratégica | Analiza, evalúa, decide, planifica. Opera en el plano estratégico (invocado desde el Primary Mode PLAN). |
| **Director (AEL)** | Ejecución operacional | Recibe planes, descompone, ejecuta. Opera en el plano operacional (invocado desde el Primary Mode BUILD). |
| **Explorer** | Discovery | Lee el sistema real. No modifica. |
| **Architect** | Architecture | Veta diseños que violan restricciones. |
| **Implementer** | Implementation | Aplica cambios autorizados. |
| **Auditor** | Validation | Bloquea misiones si la calidad no se cumple. |
| **Keeper** | Memory | Preserva conocimiento. No inventa. |
| **Analyst** | Learning | Recomienda mejoras. No modifica. |
| **Governor** | Governance | Gestiona restricciones, autoriza excepciones. |

### 6.4 Primary Modes y Cognitive Engines

El ARNÉS Framework distingue dos tipos de entidades operativas:

**Primary Modes** — puntos de entrada del usuario al framework. Pertenecen a la plataforma que implementa ARNÉS (ej. OpenCode). Su función es recibir la intención del usuario y delegar en Cognitive Engines a través de la Cognitive Invocation Layer (`COGNITIVE_INVOCATION_LAYER.md`).

| Propiedad | Definición |
|-----------|------------|
| **Visible al usuario** | El usuario selecciona un Primary Mode al iniciar una interacción. |
| **Sin lógica cognitiva** | No contiene lógica de planificación ni ejecución propia. |
| **Delegador** | Invoca Cognitive Engines autorizados. No posee, aloja ni contiene motores. |
| **Pertenece a la plataforma** | Es una construcción del entorno de ejecución (OpenCode), no del framework. |

Primary Modes vigentes: **ARNÉS** (orquestador), **PLAN** (entrada de planificación), **BUILD** (entrada de ejecución).

**Cognitive Engines** — capacidades cognitivas independientes del framework. Son invocados por Primary Modes autorizados. No pertenecen estructuralmente a ningún modo.

| Cognitive Engine | Plano | Invocado por |
|------------------|-------|-------------|
| **SDL** | Estratégico | PLAN |
| **LIGHT_PLANNER** | Estratégico | PLAN |
| **AEL** | Operacional | BUILD |

### 6.5 Doctrina profesional

Todo agente que opera en ARNÉS actúa como especialista de nivel experto en su dominio. Tiene el deber profesional de:

- Elevar la calidad técnica más allá de lo literalmente solicitado.
- Usar terminología de ingeniería precisa.
- Detectar ambigüedad antes de que se propague.
- Aplicar patrones de ingeniería reconocidos.
- Separar opinión de criterio técnico.
- Preservar la intención funcional del usuario.

---

## 7. Objetos cognitivos

### 7.1 Qué es un objeto cognitivo

Un objeto cognitivo es una estructura de información que transporta significado entre agentes del framework. A diferencia de los documentos narrativos, los objetos cognitivos tienen:

- **Estado definido**: el objeto existe en uno de un conjunto finito de estados.
- **Entradas y salidas declaradas**: se sabe qué información contiene y qué agente la produjo.
- **Ciclo de vida gobernado**: se sabe quién lo crea, quién lo consume, y cuándo se archiva.

### 7.2 Por qué existen

Los objetos cognitivos resuelven el problema de la comunicación entre agentes. Sin ellos, cada agente interpretaría instrucciones informalmente, con pérdida de precisión y trazabilidad.

Los objetos cognitivos son el **lenguaje formal del framework**. Lo que no puede expresarse como objeto cognitivo no puede fluir entre agentes.

### 7.3 Objetos cognitivos definidos

| Objeto | Transporta | Productor | Consumidor |
|---|---|---|---|
| **Mission** | Unidad de trabajo | SDL / Usuario | Todo el framework |
| **Decision** | Determinación estratégica | SDL | Director |
| **ExecutionPlan** | Instrucciones estructuradas para BUILD | SDL | Director |
| **ExecutionReport** | Evidencia de ejecución | Director | SDL |
| **Review** | Análisis retrospectivo | Analyst (Learning) | SDL, Keeper |
| **Incident** | Registro de anomalía | Cualquier agente | SDL, Governor |

El modelo completo de cada objeto cognitivo está definido en [COGNITIVE_OBJECT_MODEL.md](COGNITIVE_OBJECT_MODEL.md).

---

## 8. Gobernanza

### 8.1 Autoridad de la Constitución

Esta Constitución es la máxima autoridad del ARNÉS Framework. Ningún agente, documento, contrato o producto puede contradecirla. Cualquier conflicto se resuelve a favor de esta Constitución.

### 8.2 Evolución de la Constitución

La Constitución puede ser enmendada. Una enmienda requiere:

1. **Justificación explícita**: por qué el cambio es necesario.
2. **Análisis de impacto**: qué documentos derivados se ven afectados.
3. **Transición documentada**: cómo se migra del estado anterior al nuevo.
4. **Aprobación del Governor**: la capacidad de Governance es la única autorizada para modificar esta Constitución.

Los principios fundamentales (sección 3) requieren umbral de enmienda más alto que el resto del documento.

### 8.3 Especificaciones derivadas

Documentos que derivan de esta Constitución:

| Documento | Relación |
|---|---|
| `ael/constitution/SPEC.md` | Especificación operacional — implementa los principios del framework en restricciones de proceso |
| `ael/government/ORGANIZATION.md` | Organización — define roles, autoridad y doctrina profesional |
| `ael/constitution/CONTRACTS.md` | Contratos — reglas de enforcement automatizado |
| `docs/arnes/COGNITIVE_ARCHITECTURE.md` | Arquitectura cognitiva — organización de los componentes del framework |
| `docs/arnes/COGNITIVE_OBJECT_MODEL.md` | Modelo de objetos cognitivos — estructuras formales de información |

### 8.4 Gobernanza de productos

Cada producto construido sobre ARNÉS tiene su propia constitución (ej. `docs/architecture/AITOS_CONSTITUTION.md`). La constitución del producto gobierna el dominio, las reglas de negocio y las decisiones arquitectónicas del producto. No puede contradecir esta Constitución.

---

## 9. Invariantes del framework

Estas condiciones deben cumplirse siempre. No son aspiracionales. Son verificables. Una violación de cualquier invariante es una falla del framework.

### F1 — Separación de planos

**El pensamiento estratégico y la ejecución operacional nunca se mezclan.**
El plano estratégico consume conocimiento y produce decisiones (a través de los Cognitive Engines SDL y LIGHT_PLANNER). El plano operacional consume decisiones y produce evidencia (a través del Cognitive Engine AEL). No existe un tercer plano. No existe superposición.

### F2 — Trazabilidad completa

**Para cada cambio en cualquier producto, existe una cadena ininterrumpida:**
Decisión → ExecutionPlan → Ejecución → ExecutionReport → Verificación.

Si algún eslabón falta, el cambio no está trazado y constituye deuda de gobernanza.

### F3 — No regresión

**Ninguna misión puede dejar el producto en peor estado del que lo encontró.**
Tests que pasaban deben seguir pasando. Build que compilaba debe seguir compilando. Contratos que se cumplían deben seguir cumpliéndose.

### F4 — Preservación del conocimiento

**El conocimiento adquirido en una misión sobrevive a la misión.**
Decisiones significativas, patrones detectados y lecciones aprendidas se registran antes del cierre. Lo que no se registra, se pierde.

### F5 — Validación obligatoria

**Todo cambio de estado debe ser validado antes del cierre de misión.**
Una misión que modifica el sistema sin verificar que las compuertas de calidad se cumplen no está completa.

### F6 — Existencia justificada

**Todo componente del framework existe para resolver una necesidad demostrada.**
No se crean agentes, objetos, documentos o procesos sin una necesidad que los justifique. Si la necesidad desaparece, el componente se elimina.

**Nota sobre F1:** El orquestador ARNÉS no constituye un tercer plano cognitivo. Es infraestructura del framework que aloja los planos estratégico y operacional. Su función es enrutamiento, gestión de contexto y ciclo de vida — no cognición. Ver F-ADR-004. Los Primary Modes (PLAN, BUILD) son puntos de entrada que invocan Cognitive Engines a través de la Cognitive Invocation Layer (`COGNITIVE_INVOCATION_LAYER.md`). No son en sí mismos los planos cognitivos.

---

## 10. Relación con especificaciones derivadas

### 10.1 Jerarquía normativa

```
ARNES_CONSTITUTION.md          ← Fundacional (este documento)
    │
    ├── COGNITIVE_ARCHITECTURE.md   ← Arquitectura del framework
    ├── COGNITIVE_OBJECT_MODEL.md   ← Modelo de objetos cognitivos
    │
    └── ael/constitution/SPEC.md    ← Especificación operacional
            │
            ├── ORGANIZATION.md     ← Roles y autoridad
            └── CONTRACTS.md        ← Reglas de enforcement
```

### 10.2 Lo que esta Constitución no reemplaza

Esta Constitución no reemplaza:

- **AEL SPEC.md**: La especificación operacional define restricciones tácticas del proceso de desarrollo. Esta Constitución define los principios de los que esas restricciones derivan.
- **AITOS Constitution**: La constitución del producto define lo que AITOS es y cómo debe comportarse. Esta Constitución define el framework que lo construye.
- **ADRs**: Las decisiones arquitectónicas son del producto, no del framework.
- **Contratos de agente**: Los contratos específicos de cada agente son implementación, no constitución.

### 10.3 Alcance de esta Constitución

Esta Constitución establece:

- La separación arquitectónica entre el framework y cualquier producto construido sobre él.
- Las condiciones bajo las cuales un producto puede certificarse como conforme al framework.
- La independencia del framework respecto del dominio de cualquier producto.

El framework no está acoplado a ningún producto específico. Puede gobernar la construcción de múltiples productos simultáneamente sin modificar sus invariantes.

---

> *Esta Constitución es la identidad del ARNÉS Framework. Define lo que el framework es, lo que garantiza, y bajo qué principios opera. Todo lo demás —agentes, objetos, contratos, herramientas— es implementación.*
>
> *Versión 1.0. Sujeto a enmienda por el proceso de gobernanza definido en la sección 8.*
