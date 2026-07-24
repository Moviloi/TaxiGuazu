# FRAMEWORK_EXTRACTION_ASSESSMENT

> **Misión:** STRAT-01 — Framework Extraction Assessment  
> **Rol:** SDL (Strategic Director Layer)  
> **Modo:** PLAN — Strategic analysis only. No changes proposed. No Execution Plan generated.  
> **Fecha:** 2026-07-22  
> **Pregunta:** ¿AITOS sigue siendo el producto principal, o surgió un framework de ingeniería para desarrollo asistido por IA del cual AITOS es solo la primera implementación?

---

## Executive Summary

**Veredicto: H2** — Existe un framework claramente identificable con identidad propia, pero no posee suficiente independencia para separarse del producto. Debe permanecer integrado y evolucionar hacia la extracción gradual.

El Development System de AITOS (ARNÉS + SDL + contratos + gobernanza + capacidades) **constituye un framework de ingeniería de software asistido por IA**. Sus invariantes, contratos, capacidades y principios son **genéricos** — fueron diseñados para gobernar el proceso de desarrollo, no el dominio del transporte. Sin embargo, su implementación actual está acoplada a AITOS: enforce.sh verifica la arquitectura específica de AITOS, los prompts de los agentes referencian documentos de AITOS, y el framework nunca ha sido usado en otro contexto.

La pregunta no es **si** el framework existe. Existe. La pregunta es **cuándo** y **cómo** extraerlo.

---

## 1. Evidencia encontrada

### 1.1 Línea de tiempo de emergencia

Basado en el CHANGELOG y documentos arquitectónicos, reconstruí la evolución del Development System:

| Período | Evento | Sistema afectado |
|---------|--------|-----------------|
| **Pre-junio 2026** | TaxiGuazú bot — código monolítico. Sin sistema de desarrollo. | Solo producto |
| **Junio 13** | ADR-001: Arquitectura en capas del PRODUCTO | Producto |
| **Junio - Julio 13** | Arquitectura cognitiva (EE, Memory, Learning, Goals, Planning). Serie PR completa. | Producto (arquitectura) |
| **Julio 15** | CE Closure (Cognitive Efficiency). RR-1 Release Readiness. | Producto |
| **Julio 16** | PR-H0A staging audit. PR-5G Cognitive Architecture Certification. | Producto |
| **⬆ Julio 17 ⬆** | **NACIMIENTO DEL FRAMEWORK** | **Desarrollo** |
| | PR-SDL-2: Strategic Director Layer Contract Certification | |
| | PR-VERIFY-SDL: Verificación del SDL | |
| | PR-CDA1: Conversation Decision Algorithm | |
| **Julio 17-18** | **CONSOLIDACIÓN DEL FRAMEWORK** | **Desarrollo** |
| | PR-SDL-3A: Mission Phase Architecture (PLAN→BUILD) | |
| | PR-SDL-3B: Mission Closure Contract | |
| | PR-SDL-AEL-CONTRACT-1: Strategic/Operational Contract | |
| | PR-INTERFACE-FREEZE-1: Interface Freeze V2 | |
| **Julio 18-19** | **FORMALIZACIÓN DEL FRAMEWORK** | **Desarrollo** |
| | PR-ARCH-1: Development Ecosystem Architecture Freeze V1 | |
| | PR-HARNESS-ALIGNMENT-1/2/3: Conversión AEL a subagente | |
| | PR-SDL-4A: Project Context Layer | |
| | IN-DG: Documentation Governance Initiative | |
| **Julio 20** | BUILD-AUDIT-1: Eliminación BKE/DRL (~5800 líneas) | Producto |
| **Julio 22** | DOC-01 a DOC-06: Auditoría documental completa | Ambos |

**Hallazgo clave:** El Development System no existía en junio. Nació entre el 17 y 19 de julio de 2026. Es un artefacto **reciente**, creado para resolver los problemas de complejidad que el producto generó.

### 1.2 Evidencia de generalización intencional

La SPEC.md (Appendice: "What was generalized") documenta explícitamente el proceso de abstracción:

```
| Antes | Después |
|-------|---------|
| DAG with formal nodes and edges | Any plan representation the Director chooses |
| 10 mission types | Continuous spectrum from trivial to complex |
| 6 strategy types | Director's judgment |
| 35 operational rules | 6 invariants + 4 constraints + 6 principles |
| 8 mission phases | 4 lifecycle constraints |
| Knowledge Repository with 6 named sections | Memory capability (single store) |
```

**Reducción de complejidad:**
- Conceptos: ~40 → 23 (43% reducción)
- Fases: 8 → 4 (60% reducción)
- Reglas duras: 35 → 10 (71% reducción)
- Contratos de capacidad: 12 → 7 (42% reducción)

Este proceso de simplificación por abstracción ES el proceso de creación de un framework. Se elimina lo específico y se preserva lo esencial. El resultado es una especificación que cabe en un solo documento (244 líneas) y que podría aplicarse a cualquier proyecto de software.

### 1.3 Evidencia de arquitectura de dos planos

DOC-05R estableció formalmente la separación entre Product System y Development System. La AITOS_CONSTITUTION.md (PC-04) declara explícitamente:

> "La Constitución describe el producto oficial y no su proceso de construcción. No deberá contener referencias a versiones, iteraciones, fases, migraciones, experimentos, prototipos, estados de madurez ni cualquier otra evidencia del proceso histórico de desarrollo."

Y la AEL SPEC.md declara:

> "ARNÉS is a constraint-based operating system for AI-assisted software engineering. It governs the evolution of AITOS."

**Análisis lingüístico crítico:** "AI-assisted software engineering" — no "transportation software engineering". El alcance declarado es genérico.

### 1.4 Evidencia de independencia organizacional

ORGANIZATION.md, línea 53:

> "Este documento puede reemplazarse completamente sin tocar la Constitución."

Esto declara que la organización del sistema de desarrollo es **independiente** de la constitución del producto. Es una declaración de desacoplamiento.

---

## 2. Componentes reutilizables

Clasifiqué cada componente del Development System según su generalidad:

### 2.1 Genéricos (aplicables a cualquier proyecto sin modificaciones)

| Componente | Evidencia de genericidad | Confianza |
|------------|------------------------|-----------|
| **AEL SPEC.md** — Invariantes I1-I6 | Validation, Justification, Traceability, Architectural Integrity, Knowledge Preservation, Non-Regression. Ninguno menciona dominio de transporte. | 95% |
| **AEL SPEC.md** — Lifecycle L1-L4 | Understanding, Planning, Execution, Closure. Genérico. | 95% |
| **AEL SPEC.md** — Capabilities | Discovery, Implementation, Validation, Architecture, Memory, Learning, Governance. Responsabilidades universales de ingeniería. | 95% |
| **AEL SPEC.md** — Operating Principles | Minimality, Reusability, Evidence, Parallelism, Transparency, Courage. Genéricos. | 95% |
| **ORGANIZATION.md** — Roles y autoridad | Explorer, Architect, Implementer, Auditor, Keeper, Analyst, Governor. Cualquier proyecto necesita estos roles. | 90% |
| **ORGANIZATION.md** — Professional Engineering Doctrine | 7 deberes + 4 prohibiciones profesionales. Ninguno es específico de transporte. | 95% |
| **CONTRACTS.md** — Reglas R1-R4 | Contract Integrity, Dependency Rules, Code Existence, AI-First Interpretation. Genéricas como concepto. | 80% |
| **GOVERNANCE.md** — Naming convention | Reglas 1-5 de nomenclatura documental. Aplicables a cualquier proyecto. | 95% |
| **GOVERNANCE.md** — Taxonomía documental | 15 tipos + 6 Tiers. Genéricos. | 90% |
| **GOVERNANCE.md** — Política SSOT | Rule 4: un solo SSOT por concepto. Universal. | 95% |
| **MISSION_PHASE_ARCHITECTURE.md** | PLAN→BUILD con 2 fases. Genérico. | 90% |
| **MISSION_CLOSURE_CONTRACT.md** | Cierre de misión + Learning trigger. Genérico. | 90% |
| **STRATEGIC_OPERATIONAL_CONTRACT.md** | Conocimiento → Decisión → Evidencia. Flujo genérico. | 90% |
| **INTERFACE_FREEZE_V2.md** | Arquitectura de 2 interfaces. Patrón genérico. | 85% |
| **SDL_2_0_SDF.md** — Flujo de razonamiento | ORIENT→ANALYZE→EVALUATE→DECIDE→PLAN→VERIFY→DELIVER. Genérico. | 85% |
| **Subagentes ael-*** (6) | Capacidades de ingeniería sin dominio de transporte. | 95% |

### 2.2 Parametrizables (requieren configuración para otro proyecto)

| Componente | Qué debe parametrizarse | Confianza |
|------------|------------------------|-----------|
| **SDL_2_0_SDF.md** — Datos de entrada | CTM, Baseline, ADRs, PROJECT_CONTEXT. Son datos específicos de AITOS. El flujo es genérico. | 85% |
| **PLAN.md** (agente) | Prompt referencia AITOS, CTM, Baseline. El esqueleto del agente PLAN es genérico. | 80% |
| **BUILD.md** (agente) | Prompt referencia `ael/contracts/enforce.sh`, SPEC, ORGANIZATION. El rol BUILD es genérico. | 80% |
| **enforce.sh** — Reglas de enforcement | R1 verifica `src/lib/ai/`, R2 verifica `src/lib/services/`. Las reglas son genéricas; los paths son específicos. | 75% |
| **opencode.json** | Configuración de agentes, permisos. Estructura genérica; contenido específico. | 85% |
| **MEMORY.md** | Conocimiento del equipo AITOS. El formato es genérico. | 80% |

### 2.3 Específicos de AITOS (no reutilizables sin reescritura)

| Componente | Por qué es específico | Confianza |
|------------|----------------------|-----------|
| **AITOS_CONSTITUTION.md** | 118 disposiciones sobre transporte, taxis, reservas. Dominio específico. | 100% |
| **CDA** (Conversation Decision Algorithm) | Algoritmo conversacional para reservas de taxi. Dominio específico. | 100% |
| **FBS** (Functional Behavior Specification) | Comportamiento funcional de un bot de transporte. Dominio específico. | 100% |
| **ADRs 001-014** | Decisiones arquitectónicas del producto AITOS. | 100% |
| **Código en src/** | Bot de WhatsApp para taxis. Dominio específico. | 100% |
| **Schema (schema.sql)** | 39 tablas para gestión de transporte. Dominio específico. | 100% |
| **ARCHITECTURE_STATUS.md** | Estado de la arquitectura de AITOS. | 100% |
| **docs/knowledge/*.md** | Reglas de negocio de transporte. | 100% |

---

## 3. Componentes específicos de AITOS

### Tabla resumen

| Categoría | Cantidad de componentes | Ejemplos |
|-----------|------------------------|----------|
| **Genérico** | 16 | SPEC, ORGANIZATION, GOVERNANCE, Contratos, Capacidades, Invariantes |
| **Parametrizable** | 6 | SDL SDF, PLAN/BUILD prompts, enforce.sh, opencode.json |
| **Específico de AITOS** | 50+ | Constitución, CDA, ADRs, Código, Schema, Knowledge rules |

**Proporción del framework:** ~22 componentes son total o parcialmente reutilizables. Esto representa aproximadamente el 80% del Development System por volumen conceptual, aunque menor por líneas de código/documentación.

---

## 4. Grafo conceptual de dependencias

```
┌──────────────────────────────────────────────────────────────────────┐
│ Capa de dominio (NO reutilizable)                                     │
│                                                                       │
│  AITOS_CONSTITUTION.md                                               │
│  CDA, FBS, ADR-001..014                                              │
│  src/, schema/, tests/                                                │
│  docs/knowledge/                                                      │
│                                                                       │
│  ▲ Depende de (conceptualmente)                                      │
│  │                                                                   │
├──┼───────────────────────────────────────────────────────────────────┤
│  │ Capa de framework (REUTILIZABLE)                                  │
│  │                                                                    │
│  │  ┌──────────────────────────────────────────┐                     │
│  │  │ ARNÉS Operating System (ael/)            │                     │
│  │  │  ├── SPEC.md (Invariants + Lifecycle)    │                     │
│  │  │  ├── CONTRACTS.md (R1-R4)               │                     │
│  │  │  ├── ORGANIZATION.md (Roles + Doctrina)  │                     │
│  │  │  ├── roles/ (6 capability contracts)     │                     │
│  │  │  └── enforce.sh (contract enforcement)   │ ← acoplado a AITOS  │
│  │  └──────────────────────────────────────────┘                     │
│  │                                                                    │
│  │  ┌──────────────────────────────────────────┐                     │
│  │  │ Strategic Director Layer (docs/)         │                     │
│  │  │  ├── SDL 2.0 SDF (reasoning flow)       │                     │
│  │  │  ├── STRATEGIC_OPERATIONAL_CONTRACT      │                     │
│  │  │  ├── MISSION_PHASE_ARCHITECTURE          │                     │
│  │  │  └── MISSION_CLOSURE_CONTRACT            │                     │
│  │  └──────────────────────────────────────────┘                     │
│  │                                                                    │
│  │  ┌──────────────────────────────────────────┐                     │
│  │  │ Governance Layer (docs/governance/)       │                     │
│  │  │  ├── GOVERNANCE.md (naming, taxonomy)    │                     │
│  │  │  └── INTERFACE_FREEZE_V2.md              │                     │
│  │  └──────────────────────────────────────────┘                     │
│  │                                                                    │
│  │  ┌──────────────────────────────────────────┐                     │
│  │  │ Runtime Layer (.opencode/)               │                     │
│  │  │  ├── plan.md (PLAN agent prompt)         │ ← AITOS-specific    │
│  │  │  ├── build.md (BUILD agent prompt)       │ ← AITOS-specific    │
│  │  │  ├── commands/ (9 ael-* commands)        │                     │
│  │  │  ├── memory/MEMORY.md (team knowledge)   │ ← AITOS-specific    │
│  │  │  └── opencode.json (config)              │                     │
│  │  └──────────────────────────────────────────┘                     │
│  │                                                                    │
│  ▲ Depende de (plataforma)                                           │
│  │                                                                    │
├──┼───────────────────────────────────────────────────────────────────┤
│  │ Capa de plataforma (infraestructura)                              │
│  │                                                                    │
│  │  OpenCode (provee runtime de agentes)                             │
│  │  npm (provee gestión de dependencias)                             │
│  │  Git (provee control de versiones)                                │
│  │  Node.js (provee runtime)                                         │
│  │  Vercel (provee deploy)                                           │
└──┴───────────────────────────────────────────────────────────────────┘
```

### Lectura del grafo

- **¿Dónde está el framework?** En la capa intermedia: ARNÉS + SDL + Governance + Runtime.
- **¿Dónde está AITOS?** En la capa superior: Constitución + CDA + ADRs + Código.
- **¿Qué depende de qué?** AITOS (producto) depende conceptualmente del framework (provee el proceso de construcción). El framework no depende de AITOS — depende de la plataforma (OpenCode, npm).
- **¿Dónde está el acoplamiento?** enforce.sh (acoplado a estructura de AITOS), agent prompts (referencian documentos de AITOS), MEMORY.md (contiene conocimiento de AITOS). Estos 3 puntos son los que impiden la extracción inmediata.

### Inversión de dependencia

Actualmente: AITOS contiene el framework (físicamente).  
Deseable: Framework contiene AITOS (conceptualmente) — el framework es la plataforma; AITOS es una aplicación sobre ella.  
Estado actual: **Contención física invertida respecto a la dependencia conceptual.** El framework vive DENTRO de AITOS pero AITOS DEPENDE del framework.

---

## 5. Identidad del framework

Si el framework se extrajera como producto independiente, esta sería su identidad:

| Atributo | Valor |
|----------|-------|
| **Nombre propuesto** | ARNÉS (ya tiene nombre propio en SPEC.md) |
| **Propósito** | Operating system for AI-assisted software engineering — maximize engineering quality while minimizing cost, time, context, and risk |
| **Alcance** | Proceso completo de ingeniería: planificación estratégica, ejecución operacional, validación, gobernanza, memoria y aprendizaje |
| **Responsabilidades** | 1. Definir invariantes del proceso (I1-I6). 2. Proveer ciclo de vida (L1-L4). 3. Definir capacidades (7). 4. Establecer contratos entre fases (PLAN↔BUILD). 5. Gobernar documentación. 6. Proporcionar agentes de ejecución. |
| **Límites** | NO incluye: dominio de negocio, reglas de producto, especificaciones funcionales, código de aplicación. SÍ incluye: proceso, gobernanza, contratos, enforcement. |
| **Interfaces** | PLAN (interfaz estratégica), BUILD (interfaz operacional). Entrada: misión del usuario. Salida: Execution Report. |
| **Consumidores** | Proyectos de software que usan OpenCode como plataforma de agentes. Actualmente: solo AITOS. |
| **Dependencias** | OpenCode (plataforma de agentes), Git (control de versiones), Node.js (runtime) |
| **Constitución** | AEL SPEC.md (ya existe, 244 líneas, auto-contenida) |

---

## 6. Modelo de evolución

### Evaluación de escenarios

| Escenario | Descripción | ¿Representa la realidad actual? |
|-----------|-------------|:---:|
| **A** | AITOS contiene el framework | ✅ Físicamente cierto. El framework vive en `ael/` y `docs/` de AITOS. |
| **B** | Framework contiene AITOS | ❌ No físicamente. Pero conceptualmente es más preciso: el framework es la plataforma; AITOS es una aplicación. |
| **C** | Ambos son productos independientes | ❌ No todavía. El framework no está extraído ni empaquetado. |
| **D** | Ninguno de los anteriores | ❌ |

**Veredicto:** La realidad actual es **A** (AITOS contiene el framework físicamente). La realidad arquitectónica deseable es **B** (el framework es la plataforma; AITOS es una aplicación). El camino de A → B es la extracción progresiva.

### ¿Por qué A es insuficiente a largo plazo?

1. **Acoplamiento asimétrico:** enforce.sh está acoplado a la estructura de AITOS. Si AITOS cambia su arquitectura, el framework debe actualizarse. Pero el framework debería ser estable independientemente del producto.

2. **Confusión de identidad:** BUILD se describe como "interfaz operacional de AITOS" (build.md línea 24). Pero BUILD no es interfaz del producto AITOS — es interfaz del framework de desarrollo que construye AITOS. La identidad del framework está diluida en la identidad del producto.

3. **No reusable:** El framework no puede usarse en otro proyecto sin extracción manual. Su valor como activo de ingeniería está limitado a este repositorio.

### ¿Por qué A es correcto AHORA?

1. **El framework es joven:** Nació hace ~5 días (17-19 de julio 2026). No ha madurado suficiente para ser extraído.

2. **Sin validación externa:** Nunca se ha usado en otro contexto. Extraerlo ahora sería prematuro.

3. **El acoplamiento actual es manejable:** Los 3 puntos de acoplamiento (enforce.sh, agent prompts, MEMORY.md) son conocidos y documentados. No bloquean la evolución.

---

## 7. Evaluación de hipótesis

### H1: "No existe ningún framework. Todo pertenece naturalmente a AITOS."

**Veredicto: REFUTADA.**

**Evidencia en contra:**
1. La SPEC.md se autodefine como "constraint-based operating system for AI-assisted software engineering" — no "for AITOS". Su alcance declarado es genérico.
2. El proceso de generalización documentado en SPEC.md Appendix fue explícito y deliberado (reducción del 71% de reglas, 60% de fases).
3. ORGANIZATION.md declara independencia de la Constitución: "Este documento puede reemplazarse completamente sin tocar la Constitución."
4. DOC-05R estableció formalmente que el Development System NO es parte del Product System.

**Conclusión:** El framework existe. Tiene nombre (ARNÉS), constitución (SPEC.md), gobierno (ORGANIZATION.md), contratos y agentes. Negar su existencia es ignorar la evidencia documental.

---

### H2: "Existe un framework, pero todavía no posee suficiente independencia para separarse del producto. Debe permanecer integrado."

**Veredicto: CONFIRMADA (con matiz).**

**Evidencia a favor:**
1. El framework es identificable pero tiene 3 puntos de acoplamiento con AITOS (enforce.sh paths, agent prompts, MEMORY.md).
2. Nunca ha sido usado en otro proyecto. Extraerlo sin validación externa es prematuro.
3. Nació hace ~5 días. Su diseño es maduro; su extracción no.
4. El costo de extracción inmediata (rewrite de enforce.sh, parametrización de prompts, migración de estructura) es alto respecto al beneficio actual (el framework solo tiene un consumidor).

**Evidencia en contra (matiz):**
- La independencia NO es binaria. El framework YA es independiente en diseño. Solo no lo es en implementación.
- El framework podría extraerse gradualmente sin disrupción.

**Conclusión:** H2 es la hipótesis más precisa para el estado actual. El framework DEBE permanecer integrado a corto plazo, pero DEBE evolucionar hacia la extracción a mediano plazo.

---

### H3: "Existe un framework claramente identificable. AITOS depende de él. La dependencia conceptual debe invertirse. El framework debe considerarse un producto propio."

**Veredicto: PARCIALMENTE CONFIRMADA — dirección correcta, timing incorrecto.**

**Evidencia a favor:**
1. AITOS depende conceptualmente del framework (el framework define CÓMO se construye AITOS).
2. La inversión de dependencia es arquitectónicamente correcta: el framework debería ser la plataforma, AITOS la aplicación.
3. Los componentes del framework (invariantes, contratos, capacidades, gobernanza) tienen identidad propia y nombre propio (ARNÉS).
4. Si mañana se iniciara un segundo proyecto con OpenCode, el 80% del Development System de AITOS sería directamente reutilizable.

**Evidencia en contra:**
1. El framework no está empaquetado como producto independiente.
2. No tiene mecanismo de distribución (npm package, template, etc.).
3. No tiene documentación para consumidores externos.
4. Extraerlo AHORA requeriría una inversión significativa para un beneficio que solo se materializaría con un segundo proyecto.
5. El framework evoluciona rápidamente (cambió significativamente entre el 17 y 22 de julio). Extraerlo ahora congelaría una versión inmadura.

**Conclusión:** H3 describe el ESTADO DESEADO, no el estado actual. Es la dirección correcta, pero adelantarse a la madurez del framework sería un error arquitectónico. La extracción debe ser gradual y condicionada a la estabilización del diseño.

---

## 8. Veredicto

### Respuesta a la pregunta estratégica

> ¿AITOS sigue siendo el producto principal del repositorio o surgió un nuevo producto independiente?

**AITOS sigue siendo el producto principal. Pero durante su evolución emergió un framework de ingeniería (ARNÉS) con identidad propia, diseño genérico y potencial de independencia. Actualmente, el framework está en fase de "gestación" — existe conceptualmente pero no ha sido extraído. La relación correcta es: ARNÉS es el framework; AITOS es su primera aplicación.**

### Estado actual del framework

| Dimensión | Estado | Madurez |
|-----------|--------|:---:|
| **Diseño conceptual** | Invariantes, contratos, capacidades definidos | Alta |
| **Documentación** | SPEC, ORGANIZATION, CONTRACTS, GOVERNANCE completos | Alta |
| **Implementación** | enforce.sh, subagentes, agentes, comandos operativos | Alta |
| **Generalidad** | 16 componentes genéricos, 6 parametrizables | Alta |
| **Independencia física** | Acoplado a estructura de AITOS (3 puntos) | Baja |
| **Validación externa** | 0 usos en otros proyectos | Nula |
| **Mecanismo de distribución** | No existe | Nulo |
| **Estabilidad del diseño** | Cambió significativamente en los últimos 5 días | Baja |

---

## 9. Recomendación estratégica

### Principio rector

**No extraer prematuramente. Madurar primero. Extraer gradualmente.**

El framework es real pero joven. Forzar su extracción ahora sería como empaquetar un compilador que solo ha compilado un programa — técnicamente posible pero arquitectónicamente prematuro.

### Roadmap de largo plazo

| Fase | Objetivo | Condición de entrada | Duración estimada |
|------|----------|---------------------|-------------------|
| **Fase 0: Maduración** (AHORA) | Dejar que el framework se estabilice. Completar DOC-EX-01 a DOC-EX-05. Usar el framework intensivamente en AITOS. | Ya estamos aquí | 2-4 semanas |
| **Fase 1: Desacoplamiento interno** | Parametrizar enforce.sh (paths configurables). Extraer conocimiento AITOS-específico de agent prompts. Generalizar MEMORY.md. | Framework estable (sin cambios mayores en 2 semanas) | 1-2 semanas |
| **Fase 2: Validación externa** | Iniciar un segundo proyecto que use el framework. Identificar qué funciona y qué no. | Fase 1 completada + segundo proyecto disponible | 2-4 semanas |
| **Fase 3: Empaquetado** | Crear mecanismo de distribución (template repo, npm package, o CLI). Documentar para consumidores externos. | Framework validado en al menos 2 proyectos | 2-4 semanas |
| **Fase 4: Extracción física** | Separar el framework en su propio repositorio. AITOS se convierte en consumidor. | Framework estable, documentado, y validado | 1-2 semanas |

### ¿Qué NO hacer?

- ❌ Extraer el framework AHORA. Sería prematuro y crearía deuda de mantenimiento.
- ❌ Crear un repositorio separado sin validación externa.
- ❌ Congelar el diseño del framework antes de que madure con el uso.
- ❌ Forzar la separación física (product/ vs dev/) — ya se demostró que es inviable.

### ¿Qué SÍ hacer?

- ✅ Reconocer formalmente que ARNÉS es un framework con identidad propia.
- ✅ Documentar esta conclusión (este documento).
- ✅ Ejecutar DOC-EX-01 a DOC-EX-05 para clarificar la separación conceptual.
- ✅ Mantener el framework integrado pero consciente de su identidad.
- ✅ Diseñar los agentes y contratos pensando en la futura extracción.
- ✅ Cuando se inicie un segundo proyecto, usar el framework como template.

---

## 10. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|:---:|:---:|-----------|
| **Extracción prematura** — el framework se extrae antes de madurar, resultando en una API inestable que requiere cambios frecuentes | Media | Alto | Seguir el roadmap: no extraer hasta Fase 3 |
| **Nunca extraer** — el framework permanece integrado para siempre, limitando su valor como activo de ingeniería | Media | Medio | Reconocer formalmente su identidad ahora; planificar extracción futura |
| **Sobre-ingeniería del framework** — se agregan features "por si acaso" antes de tener un segundo consumidor | Baja | Medio | YAGNI: solo agregar features que AITOS necesita |
| **Acoplamiento creciente** — nuevos componentes del Development System se crean con dependencias AITOS-específicas | Media | Alto | GOVERNANCE.md debe incluir regla: "nuevo componente D debe ser genérico o declarar su especificidad" |
| **Confusión de identidad** — los agentes siguen describiéndose como "de AITOS" en lugar de "del Ecosistema" | Alta | Bajo | DOC-EX-02 corrige esto |
| **El framework se vuelve obsoleto** — OpenCode evoluciona y absorbe funcionalidad del framework | Baja | Alto | Mantener el framework como capa delgada sobre OpenCode. Si OpenCode absorbe una función, deprecar la capa del framework. |

---

## 11. Nivel de confianza de cada conclusión

| Conclusión | Confianza | Fundamento |
|-----------|:---:|-----------|
| Existe un framework con identidad propia | 95% | SPEC.md se autodefine como "operating system for AI-assisted software engineering". Invariantes, contratos y capacidades son genéricos. |
| El framework no es independiente (H2) | 85% | 3 puntos de acoplamiento (enforce.sh, prompts, MEMORY.md). Sin validación externa. Sin mecanismo de distribución. |
| El framework debe permanecer integrado a corto plazo | 90% | Extraer ahora sería prematuro (5 días de existencia, sin validación externa, diseño en evolución). |
| El framework debe extraerse a mediano plazo | 75% | Depende de: estabilización del diseño, disponibilidad de segundo proyecto, recursos para extracción. Si AITOS sigue siendo el único proyecto, la extracción pierde urgencia. |
| La inversión de dependencia (framework → AITOS) es correcta arquitectónicamente | 90% | El framework es la plataforma; AITOS es la aplicación. Esto es análogo a React (framework) y una app React (producto). |
| El nombre "ARNÉS" es adecuado para el framework | 85% | Ya existe en SPEC.md como nombre propio. Es distintivo, no colisiona con AITOS, y tiene significado (arnés = harness, sistema de restricción). |

---

## Apéndice A: Metodología

Este análisis se basó en:

1. **Línea de tiempo histórica**: CHANGELOG.md completo (911 líneas), ADR_INDEX.md, ARCHITECTURE_STATUS.md
2. **Documentos constitucionales**: AITOS_CONSTITUTION.md (616 líneas), AEL SPEC.md (244 líneas)
3. **Documentos de gobierno**: ORGANIZATION.md, GOVERNANCE.md (628 líneas)
4. **Contratos**: MISSION_PHASE_ARCHITECTURE.md, MISSION_CLOSURE_CONTRACT.md, STRATEGIC_OPERATIONAL_CONTRACT.md, INTERFACE_FREEZE_V2.md
5. **SDL 2.0**: SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md, SDL_2_0_ARCHITECTURAL_CONSOLIDATION.md
6. **Auditorías**: DOC-01 a DOC-06 (7 reportes)
7. **Configuración**: opencode.json, package.json, enforce.sh, agent prompts

**No se utilizó**: estructura de carpetas como criterio principal. El análisis es arquitectónico y conceptual.

---

*Documento generado por SDL como parte de la misión STRAT-01.*  
*Nivel de confianza global: 85%.*  
*No se proponen cambios. No se genera Execution Plan.*  
*Próximo paso: Decisión humana sobre si proceder con el roadmap de extracción a largo plazo.*
