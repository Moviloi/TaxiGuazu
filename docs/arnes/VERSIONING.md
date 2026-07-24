# ARNÉS Framework — Versioning v1.0

> **Nivel:** Gobernanza — define el esquema de versiones y las reglas de compatibilidad del framework.
> **Versión:** 1.0
> **Fecha:** 2026-07-22
> **Estado:** ACTIVE
>
> Este documento establece cómo se versiona el ARNÉS Framework, qué constituye un cambio
> compatible o incompatible, y cómo se relacionan las versiones del framework con las
> de los productos construidos sobre él.

---

## Índice

1. [Esquema de versiones](#1-esquema-de-versiones)
2. [Versión actual del framework](#2-versión-actual-del-framework)
3. [Cambios breaking (MAJOR)](#3-cambios-breaking-major)
4. [Cambios compatibles (MINOR y PATCH)](#4-cambios-compatibles-minor-y-patch)
5. [Criterios para ARNÉS v1.0](#5-criterios-para-arnés-v10)
6. [Criterios para ARNÉS v2.0](#6-criterios-para-arnés-v20)
7. [Versionado de documentos individuales](#7-versionado-de-documentos-individuales)
8. [Relación framework-producto](#8-relación-framework-producto)
9. [Política de deprecación](#9-política-de-deprecación)
10. [CHANGELOG del framework](#10-changelog-del-framework)

---

## 1. Esquema de versiones

### 1.1 Formato

ARNÉS Framework sigue un esquema de tres números:

```
MAJOR.MINOR.PATCH
```

| Componente | Significado | Se incrementa cuando |
|---|---|---|
| **MAJOR** | Versión principal | Hay cambios incompatibles con la versión anterior. |
| **MINOR** | Versión secundaria | Se agregan capacidades, objetos o documentos manteniendo compatibilidad. |
| **PATCH** | Corrección | Se corrigen errores, se clarifica texto, se actualizan referencias sin cambios normativos. |

Ejemplos: `1.0.0`, `1.1.0`, `2.0.0`

### 1.2 Qué se versiona

El versionado aplica al **framework como un todo**: el conjunto de documentos de Nivel 0 y 1 (Constitución, Arquitectura, Objetos, Gobernanza, Versionado) más los documentos de Nivel 2 (Especificación operacional, Organización, Contratos, Roles).

Un cambio en cualquier documento del framework puede requerir un incremento de versión según las reglas definidas en este documento.

### 1.3 Qué NO se versiona con el framework

- **Productos:** Cada producto tiene su propio versionado, independiente del framework.
- **ADRs de producto:** Son del producto, no del framework.
- **Código fuente del producto:** Versionado por el sistema de control de versiones del producto.
- **Documentación operativa del producto:** CHANGELOG, PROJECT_BOARD, ROADMAP, etc.

---

## 2. Versión actual del framework

### 2.1 ARNÉS Framework v1.0.0

La versión actual es **ARNÉS v1.0.0**. Esta versión fue establecida el 2026-07-22 con la publicación de los documentos fundacionales:

| Documento | Versión individual |
|---|---|
| `ARNES_CONSTITUTION.md` | 1.0 |
| `COGNITIVE_ARCHITECTURE.md` | 1.0 |
| `COGNITIVE_OBJECT_MODEL.md` | 1.0 |
| `GOVERNANCE.md` | 1.0 |
| `VERSIONING.md` (este documento) | 1.0 |

### 2.2 Significado de v1.0

ARNÉS v1.0 es una versión **fundacional**. Esto significa:

- La identidad del framework está definida.
- La arquitectura cognitiva está especificada.
- Los objetos cognitivos están modelados.
- Las reglas de evolución están establecidas.
- El framework puede usarse para construir productos.

No significa que el framework sea inmutable. Significa que cualquier cambio debe seguir el proceso de gobernanza definido en GOVERNANCE.md.

---

## 3. Cambios breaking (MAJOR)

### 3.1 Definición

Un cambio es **breaking** (rompe compatibilidad) cuando un producto que funcionaba correctamente con la versión anterior del framework **podría dejar de funcionar** o **requerir adaptación** para funcionar con la nueva versión.

### 3.2 Qué constituye un cambio MAJOR

Cualquiera de los siguientes **incrementa MAJOR**:

| Categoría | Ejemplos de cambios breaking |
|---|---|
| **Principios** | Se elimina o redefine un principio fundamental (P1-P6). |
| **Invariantes** | Se elimina, agrega o modifica un invariante del framework (F1-F6) de forma que productos existentes podrían violarlo. |
| **Arquitectura** | Se modifica la arquitectura de dos planos (ej. se agrega un tercer plano, se elimina el Decision Engine). |
| **Objetos cognitivos** | Se elimina un objeto cognitivo. Se modifica un objeto de forma que su estructura o ciclo de vida cambia (ej. nuevos estados obligatorios, campos requeridos adicionales). |
| **Agentes** | Se elimina una capacidad. Se modifica el contrato de un agente de forma que productos existentes deben adaptarse. |
| **Gobernanza** | Se modifica la jerarquía documental (Niveles 0-3) de forma que documentos cambian de nivel. |
| **Contratos** | Se modifica un contrato entre planos (PLAN↔BUILD) de forma que la interfaz cambia. |

### 3.3 Qué NO es un cambio MAJOR

Los siguientes **no** incrementan MAJOR:

- Agregar un nuevo principio fundamental (no rompe lo existente).
- Agregar un nuevo invariante que productos existentes ya cumplen.
- Agregar un nuevo objeto cognitivo.
- Agregar una nueva capacidad o agente.
- Clarificar o refinar texto sin cambiar normativa.

### 3.4 Consecuencias de un cambio MAJOR

Cuando se incrementa MAJOR:

1. **MINOR y PATCH vuelven a 0** (ej. `1.4.2` → `2.0.0`).
2. **Se requiere guía de migración** para cada producto construido sobre el framework.
3. **Todos los documentos del framework** se actualizan a la nueva versión MAJOR.
4. **Se notifica a todos los productos** afectados antes del cambio.

---

## 4. Cambios compatibles (MINOR y PATCH)

### 4.1 Cambios MINOR

Un cambio **incrementa MINOR** cuando agrega funcionalidad al framework sin romper lo existente.

| Categoría | Ejemplos de cambios MINOR |
|---|---|
| **Documentos** | Se agrega un nuevo documento de Nivel 1 (ej. `TESTING_STRATEGY.md`). |
| **Objetos** | Se agrega un nuevo objeto cognitivo. |
| **Agentes** | Se agrega una nueva capacidad o agente. |
| **Principios** | Se agrega un nuevo principio fundamental (no modifica existentes). |
| **Invariantes** | Se agrega un nuevo invariante que no contradice los existentes. |
| **Guías** | Se agregan guías, ejemplos o documentación no normativa. |

### 4.2 Cambios PATCH

Un cambio **incrementa PATCH** cuando corrige o clarifica sin agregar ni modificar funcionalidad.

| Categoría | Ejemplos de cambios PATCH |
|---|---|
| **Correcciones** | Error tipográfico, referencia rota, inconsistencia menor entre documentos. |
| **Clarificaciones** | Reformulación de un párrafo para mayor claridad sin cambiar su significado normativo. |
| **Ejemplos** | Agregar o corregir ejemplos en documentación no normativa. |
| **Metadatos** | Actualizar fechas, autores, referencias cruzadas. |

### 4.3 Regla de acumulación

- Varios cambios PATCH pueden acumularse y liberarse juntos como un incremento PATCH.
- Varios cambios MINOR pueden incluir cambios PATCH acumulados.
- Un cambio MAJOR puede incluir cambios MINOR y PATCH acumulados.

---

## 5. Criterios para ARNÉS v1.0

### 5.1 Criterios cumplidos

ARNÉS alcanzó v1.0 porque cumple los siguientes criterios:

| Criterio | Estado | Evidencia |
|---|---|---|
| **Identidad definida** | ✅ CUMPLIDO | `ARNES_CONSTITUTION.md` define propósito, principios e invariantes. |
| **Arquitectura especificada** | ✅ CUMPLIDO | `COGNITIVE_ARCHITECTURE.md` define los dos planos, Decision Engine y capa de agentes. |
| **Objetos modelados** | ✅ CUMPLIDO | `COGNITIVE_OBJECT_MODEL.md` define 6 objetos cognitivos con estados y ciclo de vida. |
| **Gobernanza establecida** | ✅ CUMPLIDO | `GOVERNANCE.md` define jerarquía, autoridad y procesos de cambio. |
| **Versionado definido** | ✅ CUMPLIDO | Este documento. |
| **Framework operando** | ✅ CUMPLIDO | El framework ya gobierna la construcción de AITOS vía `ael/`. |
| **Separación framework/producto documentada** | ✅ CUMPLIDO | `ARNES_CONSTITUTION.md` §2 y §10. |

### 5.2 Lo que v1.0 NO requiere

Para ser v1.0, el framework **no** requiere:

- Estar extraído en un repositorio independiente.
- Tener múltiples productos construidos sobre él.
- Tener todos los agentes implementados.
- Tener cobertura de tests del framework mismo.
- Tener un mecanismo de distribución o instalación.

Estos son objetivos de versiones futuras, no prerrequisitos de v1.0.

---

## 6. Criterios para ARNÉS v2.0

### 6.1 Qué justificaría un MAJOR a v2.0

ARNÉS pasará a v2.0 cuando ocurra al menos uno de los siguientes:

1. **Extracción completa.** El framework se separa físicamente de AITOS en un repositorio independiente, con mecanismo de distribución y versionado propio. Esto es un cambio MAJOR porque modifica la relación framework-producto.

2. **Redefinición de planos.** La arquitectura de dos planos se modifica sustancialmente (ej. se agrega un plano de "Verificación" independiente). Esto requeriría que todos los productos adapten su integración.

3. **Cambio de paradigma de objetos cognitivos.** Los 6 objetos cognitivos se reemplazan por un modelo diferente (ej. se unifican Decision+ExecutionPlan, o se elimina el objeto Incident).

4. **Acumulación de cambios MINOR.** Después de suficiente evolución, un cambio MAJOR consolida breaking changes que se fueron acumulando como deuda de compatibilidad.

### 6.2 Qué NO justificaría v2.0

- Agregar nuevos objetos cognitivos (es MINOR).
- Agregar nuevas capacidades o agentes (es MINOR).
- Mejorar la documentación (es PATCH).
- Cambios en la implementación operacional (Nivel 2) que no afectan la arquitectura.

---

## 7. Versionado de documentos individuales

### 7.1 Regla general

Cada documento del framework (Niveles 0 y 1) tiene su propia versión en el encabezado. Esta versión indica cuándo fue modificado por última vez ese documento específico, **no** la versión del framework completo.

Ejemplo: `ARNES_CONSTITUTION.md` podría estar en v2.1 mientras el framework está en v1.3.0. Esto es normal: los documentos pueden evolucionar a ritmos diferentes mientras el framework como un todo mantiene compatibilidad.

### 7.2 Sincronización con versión del framework

| Evento | Efecto en versiones de documentos |
|---|---|
| **Incremento MAJOR del framework** | Todos los documentos del framework pasan a la nueva MAJOR. Sus MINOR y PATCH individuales se reinician. |
| **Incremento MINOR del framework** | Solo el documento modificado incrementa su MINOR. Los demás mantienen su versión. |
| **Incremento PATCH del framework** | Solo el documento modificado incrementa su PATCH. |

### 7.3 Documentos sin versión explícita

Los documentos de Nivel 2 (`ael/constitution/SPEC.md`, etc.) pueden usar su propio esquema de versiones o no tener versión explícita, siempre que sea posible determinar si un cambio en ellos es compatible con la versión del framework.

---

## 8. Relación framework-producto

### 8.1 Independencia de versiones

La versión del framework y la versión de un producto son **independientes**.

```
ARNÉS v1.0.0  ──governa──▶  AITOS v2.3.1
ARNÉS v1.1.0  ──governa──▶  AITOS v2.4.0
ARNÉS v2.0.0  ──governa──▶  AITOS v3.0.0  (migración requerida)
```

El producto declara en su documentación qué versión del framework utiliza.

### 8.2 Compatibilidad declarada

Cada producto debe declarar:

```yaml
product: AITOS
product_version: 2.4.0
arnes_framework: 1.0.0
compatible_with: ">=1.0.0 <2.0.0"
```

Esto indica que el producto funciona con ARNÉS v1.x.x pero requeriría migración para v2.0.0.

### 8.3 Migración de producto por cambio de framework

Cuando el framework incrementa MAJOR, cada producto debe:

1. **Evaluar impacto:** ¿El cambio del framework afecta a este producto?
2. **Planificar migración:** Si afecta, ¿qué debe cambiar en el producto?
3. **Ejecutar migración:** Adaptar el producto a la nueva versión del framework.
4. **Verificar:** Confirmar que el producto sigue cumpliendo los invariantes del framework.

Un producto puede decidir **no** migrar y permanecer en una versión anterior del framework. Esto es válido mientras la versión anterior del framework siga siendo mantenida (ver §9).

---

## 9. Política de deprecación

### 9.1 Ciclo de deprecación

Cuando un elemento del framework (objeto, capacidad, invariante, documento) va a ser eliminado o reemplazado:

| Fase | Duración mínima | Qué ocurre |
|---|---|---|
| **DEPRECATED** | 1 versión MINOR | El elemento se marca como deprecado. Sigue funcionando. La documentación indica el reemplazo. |
| **REMOVED** | Siguiente versión MAJOR | El elemento se elimina. Los productos que lo usaban deben haber migrado. |

### 9.2 Notación de deprecación

Un elemento deprecado se marca en su documentación con:

```
> ⚠️ DEPRECATED since ARNÉS v1.2.0. Use [replacement] instead.
> Will be removed in ARNÉS v2.0.0.
```

### 9.3 Excepciones a la política de deprecación

- **Correcciones de seguridad:** Pueden aplicarse sin período de deprecación.
- **Cambios en documentos no normativos:** No requieren deprecación.
- **Elementos experimentales:** Marcados como `[EXPERIMENTAL]`, pueden eliminarse sin deprecación.

---

## 10. CHANGELOG del framework

### 10.1 Ubicación

El changelog del framework se encuentra en `docs/arnes/CHANGELOG.md`.

Se crea cuando ocurre el primer cambio posterior a v1.0.0 que requiera registro.

### 10.2 Formato

Cada entrada del changelog sigue el formato:

```markdown
## [MAJOR.MINOR.PATCH] — YYYY-MM-DD

### Added
- (nuevas capacidades, objetos, documentos)

### Changed
- (modificaciones a elementos existentes)

### Deprecated
- (elementos marcados para eliminación futura)

### Removed
- (elementos eliminados — solo en MAJOR)

### Fixed
- (correcciones de errores)

### Migration
- (guía de migración — solo en MAJOR)
```

### 10.3 Versión actual en el changelog

La primera entrada del changelog será:

```markdown
## [1.0.0] — 2026-07-22

### Added
- Fundación documental inicial del ARNÉS Framework.
- ARNES_CONSTITUTION.md: identidad, 6 principios, 6 invariantes.
- COGNITIVE_ARCHITECTURE.md: arquitectura de dos planos, Decision Engine, capa de agentes.
- COGNITIVE_OBJECT_MODEL.md: 6 objetos cognitivos con estados y ciclo de vida.
- GOVERNANCE.md: jerarquía documental, autoridad, ADRs de framework, proceso de cambio.
- VERSIONING.md: esquema de versiones semántico, política de deprecación.
- README.md: índice de documentación.
```

---

> *Este documento define las reglas de versionado del ARNÉS Framework. Todo cambio al framework debe reflejarse en un incremento de versión según las categorías aquí definidas. La versión del framework es la promesa de compatibilidad a los productos que dependen de él.*
>
> *Versión 1.0. Documento de Nivel 1. Modificable mediante F-ADR con revisión del SDL.*
