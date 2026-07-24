# ARNÉS Framework — Governance v1.0

> **Nivel:** Gobernanza — define cómo evoluciona el framework sin perder coherencia.
> **Versión:** 1.0
> **Fecha:** 2026-07-22
> **Estado:** ACTIVE
>
> Este documento establece las reglas de evolución del ARNÉS Framework.
> Todo cambio al framework —documental, arquitectónico u operacional— se rige por estas reglas.

---

## Índice

1. [Principio rector](#1-principio-rector)
2. [Jerarquía documental](#2-jerarquía-documental)
3. [Autoridad por nivel](#3-autoridad-por-nivel)
4. [Proceso de cambio](#4-proceso-de-cambio)
5. [ADR dentro del framework](#5-adr-dentro-del-framework)
6. [Framework ADR vs Product ADR](#6-framework-adr-vs-product-adr)
7. [Evolución del framework vs evolución de productos](#7-evolución-del-framework-vs-evolución-de-productos)
8. [Resolución de conflictos](#8-resolución-de-conflictos)
9. [Registro de cambios](#9-registro-de-cambios)
10. [Gobernanza de la gobernanza](#10-gobernanza-de-la-gobernanza)

---

## 1. Principio rector

> **La gobernanza debe existir antes que la expansión.**

Cada vez que el framework crece —nuevo documento, nuevo agente, nuevo objeto, nuevo invariante— la gobernanza ya debe tener respuesta para: ¿quién lo modifica?, ¿bajo qué proceso?, ¿qué impacto tiene en lo existente?

Una gobernanza débil produce un framework que se contradice a sí mismo. Una gobernanza excesiva produce un framework que no evoluciona. El equilibrio es: **la rigurosidad del proceso debe ser proporcional al impacto del cambio.**

---

## 2. Jerarquía documental

### 2.1 Los cuatro niveles

Todo documento del ecosistema ARNÉS pertenece a exactamente uno de cuatro niveles. El nivel determina su autoridad, su estabilidad y el proceso requerido para modificarlo.

```
NIVEL 0 — Fundacional
    │  ARNES_CONSTITUTION.md
    │  "Define lo que el framework ES."
    │  Modificación: Enmienda constitucional.
    │
    ▼
NIVEL 1 — Arquitectónico
    │  COGNITIVE_ARCHITECTURE.md
    │  COGNITIVE_OBJECT_MODEL.md
    │  COGNITIVE_INVOCATION_LAYER.md
    │  GOVERNANCE.md (este documento)
    │  VERSIONING.md
    │  FRAMEWORK_IMPLEMENTATION_MODEL.md
    │  AEL_BOUNDARY_AUDIT.md
    │  MIGRATION_STRATEGY.md
    │  PRODUCT_CONTEXT_CONTRACT.md
    │  DECISION_PACKAGE_CONTRACT.md
    │  EXECUTION_REPORT_CONTRACT.md
    │  "Define cómo funciona el framework."
    │  Modificación: ADR de framework con revisión cruzada.
    │
    ▼
NIVEL 2 — Operacional
    │  ael/constitution/SPEC.md
    │  ael/government/ORGANIZATION.md
    │  ael/constitution/CONTRACTS.md
    │  ael/government/roles/*.md
    │  PROJECT_ADAPTER_ARCHITECTURE.md
    │  RUNTIME_PROFILE_CONTRACT.md
    │  LIGHT_PLANNER_CONTRACT.md
    │  "Define cómo se implementa el framework."
    │  Modificación: Decisión del Governor con notificación.
    │
    ▼
NIVEL 3 — Producto
    │  Constitución del producto (ej. AITOS_CONSTITUTION.md)
    │  ADRs del producto (ej. docs/adr/001-*.md)
    │  Código fuente, tests, schema, configuración
    │  "Define qué es el producto y cómo funciona."
    │  Modificación: Gobernada por la constitución del producto.
```

### 2.2 Reglas de precedencia

1. **Un nivel superior prevalece sobre uno inferior.** Si un documento de Nivel 2 contradice uno de Nivel 1, el de Nivel 1 tiene autoridad.
2. **Un documento no puede delegar autoridad que no posee.** Un documento de Nivel 2 no puede autorizar algo que el Nivel 1 prohíbe.
3. **La especificidad no otorga autoridad.** Un documento más detallado no prevalece sobre uno más general de nivel superior.
4. **El vacío se resuelve hacia arriba.** Si un nivel no especifica una regla, se aplica la regla del nivel superior más cercano.

### 2.3 Estabilidad por nivel

| Nivel | Estabilidad | Frecuencia de cambio esperada | Ejemplo de cambio |
|---|---|---|---|
| **0 — Fundacional** | Muy alta | Años | Nuevo principio fundamental |
| **1 — Arquitectónico** | Alta | Meses | Nuevo invariante arquitectónico |
| **2 — Operacional** | Media | Semanas | Refinamiento de contrato de agente |
| **3 — Producto** | Variable | Días | Nuevo ADR, refactor, feature |

La estabilidad no es una restricción arbitraria. Es una consecuencia del alcance: cuanto más cosas dependen de un documento, más costoso es cambiarlo.

---

## 3. Autoridad por nivel

### 3.1 Nivel 0 — Enmienda constitucional

**Quién autoriza:** Solo el Governor, con aprobación explícita del SDL.

**Proceso:**
1. Se redacta la enmienda propuesta con:
   - Justificación explícita del cambio.
   - Análisis de impacto sobre todos los documentos derivados (Niveles 1, 2 y 3).
   - Plan de transición (cómo se migra del estado actual al nuevo).
2. El SDL revisa el análisis de impacto y emite recomendación.
3. El Governor aprueba o rechaza.
4. Si se aprueba, se actualiza la Constitución y todos los documentos derivados afectados.

**Umbral especial para principios fundamentales:** Los principios P1-P6 (ARNES_CONSTITUTION.md §3) requieren además:
- Evidencia de que el principio actual causa daño demostrable.
- Propuesta de principio sustituto (no se elimina sin reemplazo).
- Período de revisión (no se aprueba en el mismo ciclo que se propone).

### 3.2 Nivel 1 — Cambio arquitectónico

**Quién autoriza:** El Governor, con revisión del SDL.

**Proceso:**
1. Se documenta el cambio propuesto como **Framework ADR** (ver §5).
2. El ADR debe incluir:
   - Problema que resuelve.
   - Decisión propuesta.
   - Alternativas consideradas.
   - Impacto sobre documentos de Nivel 1 relacionados.
   - Impacto sobre la implementación operacional (Nivel 2).
3. Los documentos de Nivel 1 afectados se revisan para detectar contradicciones.
4. El Governor aprueba o rechaza el ADR.
5. Si se aprueba, los documentos afectados se actualizan referenciando el ADR.

**Regla de coherencia:** Ningún ADR de Nivel 1 puede contradecir la Constitución (Nivel 0). Si un ADR revela una contradicción en la Constitución, se escala a enmienda constitucional.

### 3.3 Nivel 2 — Cambio operacional

**Quién autoriza:** El Governor. No requiere aprobación del SDL, pero debe notificarse.

**Proceso:**
1. Se modifica el documento operacional.
2. Se verifica que el cambio no contradice Niveles 0 ni 1.
3. Se ejecuta `ael/contracts/enforce.sh` para verificar que los contratos siguen cumpliéndose.
4. Se registra el cambio con justificación.

**Cambios que requieren escalar a Nivel 1:**
- Un cambio operacional que introduce un nuevo invariante.
- Un cambio operacional que modifica la arquitectura de capacidades.
- Un cambio operacional que afecta la relación entre agentes.

### 3.4 Nivel 3 — Cambio de producto

**Quién autoriza:** Gobernado por la constitución del producto, no por este documento.

El framework no interfiere en decisiones de producto. Solo verifica que:
- La constitución del producto no contradice la Constitución del framework (Nivel 0).
- Los invariantes del framework (F1-F6) se cumplen.

---

## 4. Proceso de cambio

### 4.1 Ciclo de vida de un cambio

```
DETECCIÓN
    │  Un agente, el SDL o el Governor detecta la necesidad de cambio.
    │
    ▼
FORMULACIÓN
    │  Se determina el nivel del cambio (0, 1, 2, o 3).
    │  Se redacta la propuesta según el formato del nivel correspondiente.
    │
    ▼
REVISIÓN CRUZADA
    │  Nivel 0: Revisa SDL + Governor.
    │  Nivel 1: Revisa Governor; SDL puede opinar.
    │  Nivel 2: Revisa Governor.
    │  Nivel 3: Gobernado por el producto.
    │
    ▼
APROBACIÓN / RECHAZO
    │  La autoridad correspondiente aprueba o rechaza.
    │  Si rechaza, debe indicar por qué y qué falta.
    │
    ▼
IMPLEMENTACIÓN
    │  Se aplica el cambio a los documentos afectados.
    │  Se actualizan las referencias cruzadas.
    │  Se registra en el changelog del framework.
    │
    ▼
VERIFICACIÓN
    │  Se verifica que ningún documento derivado quedó inconsistente.
    │  Se ejecutan validaciones automáticas si existen.
```

### 4.2 Cambios que no requieren proceso

Los siguientes cambios no requieren aprobación formal (aunque deben registrarse):

- Corrección de errores tipográficos u ortográficos.
- Actualización de referencias cruzadas (links rotos).
- Adición de ejemplos o clarificaciones que no cambian normativa.
- Actualización de fechas o metadatos.

**Regla:** Si el cambio no altera el significado normativo del documento, no requiere proceso de gobernanza.

### 4.3 Cambios de emergencia

En situaciones donde un documento contiene un error que bloquea la operación del framework:

1. El Governor puede aprobar un cambio temporal sin proceso completo.
2. El cambio debe marcarse como `[EMERGENCY]` y tener fecha de expiración.
3. Antes de la expiración, debe completarse el proceso formal.
4. Si el proceso formal rechaza el cambio, se revierte.

---

## 5. ADR dentro del framework

### 5.1 Qué es un Framework ADR

Un **Framework ADR** (Architecture Decision Record) es el mecanismo para documentar decisiones que afectan los Niveles 0 y 1 del framework.

A diferencia de los ADR de producto (que documentan decisiones sobre el dominio de negocio), los Framework ADR documentan decisiones sobre la arquitectura del framework mismo.

### 5.2 Cuándo se requiere un Framework ADR

Se requiere un Framework ADR cuando:

- Se crea, modifica o elimina un invariante del framework (F1-F6).
- Se crea, modifica o elimina un principio fundamental (P1-P6).
- Se modifica la arquitectura cognitiva (dos planos, Decision Engine, capa de agentes).
- Se crea, modifica o elimina un objeto cognitivo.
- Se modifica el proceso de gobernanza (este documento).
- Se modifica el esquema de versiones.

No se requiere Framework ADR para:
- Cambios en documentos de Nivel 2 (operacionales).
- Cambios en productos (usan sus propios ADRs).
- Correcciones que no alteran normativa.

### 5.3 Formato de un Framework ADR

```
# F-ADR-XXX: Título descriptivo

> **Nivel:** [0 | 1]
> **Estado:** [PROPOSED | ACCEPTED | REJECTED | SUPERSEDED]
> **Fecha:** YYYY-MM-DD
> **Autor:** [Governor | SDL]

## Contexto
(Qué situación o problema motiva esta decisión.)

## Decisión
(Qué se decide, en términos normativos precisos.)

## Alternativas consideradas
(Qué otras opciones se evaluaron y por qué se descartaron.)

## Impacto
- Documentos afectados: [lista]
- Nivel 2 afectado: [sí/no, cuáles]
- Productos afectados: [sí/no, cuáles]
- ¿Requiere migración?: [sí/no]

## Consecuencias
(Lo que se gana y lo que se pierde con esta decisión.)
```

### 5.4 Ubicación de los Framework ADR

Los Framework ADR se almacenan en `docs/arnes/adr/` y se numeran secuencialmente (F-ADR-001, F-ADR-002, ...).

Los ADR de producto se almacenan en `docs/adr/` (sin prefijo "F-") y son gobernados por la constitución del producto.

---

## 6. Framework ADR vs Product ADR

### 6.1 Tabla comparativa

| Dimensión | Framework ADR | Product ADR |
|---|---|---|
| **Prefijo** | `F-ADR-NNN` | `ADR-NNN` (o `NNN-title`) |
| **Ubicación** | `docs/arnes/adr/` | `docs/adr/` |
| **Alcance** | Cómo funciona el framework | Cómo funciona el producto |
| **Ejemplo** | "Se decide que los objetos cognitivos son inmutables post-cierre" | "Se decide usar PostgreSQL con el patrón Facade" |
| **Autoridad** | Governor | Arquitecto del producto + ADR del producto |
| **Vincula a** | Todo el framework | Solo el producto |
| **Puede contradecir** | Solo la Constitución (vía enmienda) | Solo la constitución del producto |

### 6.2 Relación entre ambos

- Un Framework ADR **puede** imponer restricciones que los ADR de producto deben respetar.
- Un ADR de producto **no puede** contradecir un Framework ADR.
- Si un ADR de producto revela una limitación del framework, se escala a un Framework ADR.

---

## 7. Evolución del framework vs evolución de productos

### 7.1 Diferencia fundamental

| | Framework (ARNÉS) | Producto (ej. AITOS) |
|---|---|---|
| **Evoluciona por** | Abstracción y generalización | Adición de funcionalidad de dominio |
| **Ritmo** | Lento, deliberado | Rápido, impulsado por necesidades de negocio |
| **Estabilidad** | Alta (los productos dependen de él) | Variable (puede cambiar radicalmente entre versiones) |
| **Rompe si** | Cambia un invariante sin migración | Cambia una regla de negocio sin actualizar dependencias |
| **Ejemplo de evolución** | Se agrega el objeto cognitivo "Constraint" | Se agrega soporte para un nuevo canal de mensajería |

### 7.2 Reglas de coevolución

1. **El framework no puede romper productos.** Un cambio en el framework debe ser compatible hacia atrás o incluir un plan de migración para cada producto afectado.

2. **El producto no puede romper el framework.** Un producto no puede modificar capacidades, agentes o contratos del framework. Si necesita algo que el framework no provee, lo solicita vía Framework ADR.

3. **La separación es bidireccional.** El framework no sabe de dominios. El producto no sabe de mecánicas de framework. La interfaz entre ambos es el contrato de capacidades y los invariantes.

4. **La extracción es el test.** El criterio definitivo de que el framework está correctamente separado es que puede extraerse a un repositorio independiente y usarse para construir un segundo producto sin modificar una sola línea del framework.

### 7.3 Señales de acoplamiento indebido

Son señales de que el framework y el producto están indebidamente acoplados:

- Un documento del framework menciona una regla de negocio del producto.
- Un invariante del framework solo tiene sentido en el contexto del producto.
- Un cambio en el producto requiere modificar un documento de Nivel 0 o 1.
- El `enforce.sh` del framework verifica paths del producto.

---

## 8. Resolución de conflictos

### 8.1 Tipos de conflicto

| Conflicto | Ejemplo | Resolución |
|---|---|---|
| **Vertical** | Un documento de Nivel 2 contradice uno de Nivel 1 | Prevalece el nivel superior. Se corrige el inferior. |
| **Horizontal** | Dos documentos del mismo nivel se contradicen | El Governor decide cuál prevalece. Se documenta en F-ADR. |
| **Framework vs Producto** | Un ADR de producto viola un invariante del framework | Prevalece el framework. El producto debe adaptarse o solicitar excepción. |
| **Interpretación** | Dos agentes interpretan el mismo invariante de forma distinta | El Governor emite una clarificación vinculante. |

### 8.2 Escalamiento

Si un conflicto no puede resolverse en el nivel donde se detecta:

1. **Nivel 3 → Nivel 2:** El Arquitecto del producto escala al Governor.
2. **Nivel 2 → Nivel 1:** El Governor escala al SDL para revisión arquitectónica.
3. **Nivel 1 → Nivel 0:** El SDL y el Governor conjuntamente inician enmienda constitucional.

### 8.3 Excepciones

Una excepción es una autorización explícita para violar temporalmente una regla del framework.

**Requisitos:**
- Debe ser aprobada por el Governor.
- Debe tener alcance limitado (qué regla, por cuánto tiempo, bajo qué condiciones).
- Debe tener un plan de resolución (cuándo y cómo se eliminará la excepción).
- Se documenta como incidente o como sección en un F-ADR.

**Una excepción no es un precedente.** Dos excepciones iguales indican que la regla debe cambiar.

---

## 9. Registro de cambios

### 9.1 Qué se registra

Todo cambio en documentos de Nivel 0, 1 y 2 debe registrarse. El registro incluye:

- Qué documento se modificó.
- Qué se cambió (resumen).
- Por qué se cambió (justificación).
- Quién lo autorizó.
- Fecha del cambio.
- Referencia al F-ADR o decisión que lo respalda (si aplica).

### 9.2 Dónde se registra

- **Documentos individuales:** Cada documento incluye su versión y fecha en el encabezado.
- **Changelog agregado:** `docs/arnes/CHANGELOG.md` (a crearse cuando haya cambios que registrar).
- **Framework ADR:** `docs/arnes/adr/F-ADR-NNN.md` para decisiones arquitectónicas.

### 9.3 Trazabilidad

Para cualquier cambio en un documento de Nivel 0, 1 o 2, debe ser posible responder:

1. ¿Qué se cambió? → El diff del documento.
2. ¿Por qué? → La justificación en el registro.
3. ¿Quién autorizó? → El Governor o SDL.
4. ¿Qué impacto tuvo? → Los documentos derivados actualizados.
5. ¿Qué F-ADR lo respalda? → La referencia (si aplica).

---

## 10. Gobernanza de la gobernanza

### 10.1 Quién gobierna al Governor

El Governor es la máxima autoridad operacional del framework. Sin embargo:

- **El Governor no puede modificarse a sí mismo.** Un cambio a GOVERNANCE.md requiere revisión del SDL.
- **El Governor no puede eliminar la Constitución.** La existencia de la Constitución es un hecho fundacional, no una regla modificable.
- **El Governor rinde cuentas.** Toda decisión del Governor debe ser trazable y justificada.

### 10.2 Modificación de este documento

GOVERNANCE.md es un documento de Nivel 1. Se modifica mediante Framework ADR con revisión del SDL. Las mismas reglas que define para otros documentos de Nivel 1 se aplican a sí mismo.

### 10.3 Principio de minimalidad

La gobernanza debe ser **la mínima necesaria** para garantizar coherencia. Cada regla de gobernanza debe poder responder: ¿qué problema concreto resuelve?

Si una regla de gobernanza no resuelve un problema demostrable, debe eliminarse.

---

## 11. Runtime Requirements

### 11.1 Propósito
Esta sección define los requisitos de ejecución (runtime) que el entorno debe satisfacer para que el marco ARNÉS opere correctamente. Estos requisitos son vinculantes para cualquier entorno de desarrollo que ejecute agentes ARNÉS.

### 11.2 Requisitos de Runtime Identificados

| ID | Requisito | Valor Mínimo | Justificación | Descubierto en |
|:---|:----------|:-------------|:--------------|:---------------|
| RR-01 | `subagent_depth` | `>= 2` | La cadena de delegación BUILD → AMC → AEL Domain (explore, implementer, etc.) requiere al menos 2 niveles de anidamiento. Con `subagent_depth: 1` (valor por defecto), AMC no puede delegar en subagentes AEL, bloqueando la ejecución de misiones no triviales. | R-05K / R-05M |

### 11.3 Vinculación
- El archivo `opencode.json` debe mantener `subagent_depth >= 2` en todo momento.
- El contrato `RUNTIME_PROFILE_CONTRACT.md` documenta `subagent_depth` como parámetro obligatorio del Runtime Profile.
- Cualquier cambio en estos requisitos requiere autorización explícita del usuario y actualización de este documento.

### 11.4 Verificación
Al iniciar una misión, el Runtime Profile debe ser verificado contra los requisitos de esta sección. Si el entorno no cumple, la misión debe reportar la brecha antes de proceder.

---

> *Este documento es el sistema operativo de la evolución del ARNÉS Framework. Define quién puede cambiar qué, bajo qué proceso, con qué salvaguardas. Su propósito no es frenar el cambio sino garantizar que cada cambio deja el framework más coherente — no menos.*
>
> *Versión 1.0. Documento de Nivel 1. Modificable mediante F-ADR con revisión del SDL.*
