# Especificación Arquitectónica — COGNITIVE_PRINCIPLES.md

> **Propósito:** Definir exactamente qué es y qué NO es el documento
> `COGNITIVE_PRINCIPLES.md` antes de redactarlo.
>
> **Estado:** Diseño arquitectónico — APROBADO
> **Documentos fuente:** CONSTITUTION_Master_Plan, 01-CONSTITUTION, ONTOLOGY, AUDITORIA_06
> **Fecha:** 2026-07-11

---

## Tabla de contenidos de esta especificación

1. Propósito
2. Autoridad
3. Alcance
4. Dependencias
5. Fronteras detalladas
6. Nivel de abstracción
7. Estructura propuesta
8. Mapeo desde Auditoría #06
9. Riesgos
10. Criterios de aceptación
11. Autoauditoría crítica

---

## 1. Propósito

### 1.1 Función

`COGNITIVE_PRINCIPLES.md` traduce los **principios constitucionales abstractos** en
**principios cognitivos operativos**. Es el puente entre:

```
CONSTITUCIÓN (filosofía, identidad, valores supremos)
    ↓  deriva
COGNITIVE_PRINCIPLES (reglas de operación cognitiva)
    ↓  concreta
ARQUITECTURA COGNITIVA (componentes, flujos, ciclos)
    ↓  implementa
CÓDIGO (sistema ejecutable)
```

Sin `COGNITIVE_PRINCIPLES.md`, el salto de la Constitución a la Arquitectura es
demasiado grande. Los arquitectos interpretarían la Constitución subjetivamente,
y el resultado sería divergente.

### 1.2 Problema que resuelve

**Problema:** La Constitución define QUÉ debe cumplirse, pero no CÓMO opera la
cognición. La Arquitectura define QUÉ componentes existen, pero no POR QUÉ
existen. Hay un vacío entre "el sistema debe basarse en evidencia" (Constitución,
S-P1) y "el Evidence Store es una base de datos append-only con interfaz X"
(Arquitectura). Ese vacío lo llena `COGNITIVE_PRINCIPLES.md`:

- ¿Cómo se acumula la evidencia?
- ¿Cómo se resuelven hipótesis múltiples?
- ¿Cómo se calibra un umbral?
- ¿Bajo qué condiciones se degrada la certidumbre?
- ¿Qué significa "preguntar con propósito" como regla operativa?

### 1.3 Lo que NO resuelve

- No define términos (Ontología)
- No establece identidad del sistema (Constitución)
- No descompone en componentes (Arquitectura)
- No especifica algoritmos (Implementación)
- No define reglas de negocio (Policy/Domain)

---

## 2. Autoridad

### 2.1 Posición en la jerarquía

Según `01-CONSTITUTION.md` Sección 6:

| Posición | Documento | Autoridad |
|----------|-----------|-----------|
| **II-a** | **COGNITIVE_PRINCIPLES.md** | **Nivel II — Structural Authority** |

### 2.2 Qué puede definir

Puede definir:

✅ **Reglas de comportamiento cognitivo:** cómo el sistema percibe, razona,
   recuerda, decide, aprende.

✅ **Restricciones operativas:** condiciones bajo las cuales ciertas operaciones
   cognitivas son válidas o inválidas.

✅ **Relaciones entre principios operativos:** cuándo un principio prevalece
   sobre otro dentro del documento.

✅ **Criterios de verificación conceptual:** cómo determinar si un cambio
   respeta o viola un principio.

✅ **Delegación a nivel inferior:** qué aspectos deben concretarse en
   COGNITIVE_ARCHITECTURE.md, DECISION_MODEL.md, etc.

### 2.3 Qué NO puede definir

❌ **Principios constitucionales:** No puede repetir, redefinir o relajar
   principios de CONSTITUTION.md.

❌ **Definiciones terminológicas:** No puede definir términos — eso pertenece
   a ONTOLOGY.md. Si necesita un término nuevo, debe solicitarse a ONTOLOGY.md.

❌ **Decisiones arquitectónicas:** No puede decidir qué componente implementa
   qué principio. Eso pertenece a COGNITIVE_ARCHITECTURE.md y ADRs.

❌ **Implementaciones específicas:** No puede decir "usar PostgreSQL" o
   "implementar como función Lambda."

❌ **Reglas de negocio:** No puede definir precios, horarios, políticas de
   cancelación, etc.

### 2.4 Límite de autoridad

> Los principios de COGNITIVE_PRINCIPLES.md son VINCULANTES para toda decisión
> arquitectónica y de implementación. Sin embargo, pueden ser temporalmente
> suspendidos mediante S-P9 (Constitutional Integrity) si un cambio de nivel
> inferior no puede cumplirlos inmediatamente.

Esto significa que COGNITIVE_PRINCIPLES.md es **normativo hacia abajo**:
- La Arquitectura NO puede contradecirlo
- La Implementación NO puede contradecirlo
- Pero una violación no es una crisis constitucional — es deuda técnica
  que se gestiona con S-P9

### 2.5 Estabilidad

El Master Plan dice "Estable — Los principios son permanentes. Se agregan,
no se modifican ni eliminan."

La Constitución dice: "Level II — Structural Authority. Changes require review
against Level I compatibility."

**Regla:** Los principios de COGNITIVE_PRINCIPLES.md pueden:
- **Agregarse** libremente (revisión de compatibilidad con Nivel I requerida)
- **Modificarse** solo si no hay alternativa (requiere ADR + revisión Nivel I)
- **Eliminarse** solo si el principio migra a la Constitución o demuestra ser
  incorrecto (requiere enmienda constitucional si afecta principios de Nivel I)

---

## 3. Alcance

### 3.1 Temas que pertenecen a COGNITIVE_PRINCIPLES.md

| Tema | Justificación |
|------|---------------|
| **Ciclo Cognitivo** | Cómo se estructura el flujo percepción→razonamiento→compromiso→proyección. La Constitución solo dice que existe. |
| **Evidencia** | Cómo se acumula, resuelve, prioriza. La Constitución dice que es inmutable y fundacional. |
| **Hipótesis** | Cómo se forman, mantienen, resuelven. La Ontología define el término; los principios definen el comportamiento. |
| **Certidumbre** | Cómo se calcula, actualiza, degrada. La Constitución dice que es continua y debe degradarse. |
| **Compromiso** | Cómo se decide comprometer, qué umbrales aplicar, cómo escalar. La Constitución dice que debe existir un umbral. |
| **Proyección** | Cómo se deriva la vista operacional desde el conocimiento. |
| **Memoria** | Qué se retiene, qué se archiva, qué se olvida y bajo qué condiciones. |
| **Aprendizaje** | Cómo los outcomes retroalimentan el modelo de confianza. |
| **Interacción** | Cómo se conduce una conversación: preguntar con propósito, silencio como evidencia, acompañamiento. |
| **Precedencia entre principios** | Cómo se resuelven conflictos entre principios DENTRO de este documento. |
| **Verificación** | Criterios conceptuales para determinar si un cambio viola un principio. |

### 3.2 Temas EXPLÍCITAMENTE excluidos

| Tema | Excluido porque pertenece a |
|------|---------------------------|
| Definición de términos | ONTOLOGY.md |
| Identidad del sistema | CONSTITUTION.md |
| Valores epistémicos fundacionales | CONSTITUTION.md |
| Principios supremos (S-P*) | CONSTITUTION.md |
| Lista de componentes | COGNITIVE_ARCHITECTURE.md |
| Interfaces entre componentes | COGNITIVE_ARCHITECTURE.md |
| Flujo de datos | COGNITIVE_ARCHITECTURE.md |
| Esquema de base de datos | KNOWLEDGE_MODEL.md |
| Especificación de API | CHANNEL_ADAPTER.md |
| Decisiones arquitectónicas individuales | ADRs |
| Algoritmos específicos | DECISION_MODEL.md (si es decisión), Implementación (si es código) |
| Reglas de pricing | Domain docs |
| Prompts de LLM | Agent instructions |
| Configuración de entornos | Deployment config |
| Roadmap del proyecto | PROJECT_BOARD.md, ROADMAP.md |

---

## 4. Dependencias

### 4.1 Documentos de los que DEPENDE (entrada)

```
NIVEL I
├── 01-CONSTITUTION.md ──────── principios constitucionales de los que deriva
└── 02-ONTOLOGY.md ──────────── términos que usa sin redefinir
       ↓
NIVEL II-a: COGNITIVE_PRINCIPLES.md
```

**Relación con CONSTITUTION.md:**

COGNITIVE_PRINCIPLES.md recibe de la Constitución:
- Los 20 principios constitucionales (P-I1-5, P-E1-5, S-P1-10)
- Las reglas de interpretación (1.6)
- La jerarquía documental (Sección 6)
- Expectativas específicas (ver 4.3)

**Relación con ONTOLOGY.md:**

COGNITIVE_PRINCIPLES.md recibe de la Ontología:
- Todos los términos definidos (Evidence, Belief, Certainty, Hypothesis,
  Commitment, Cognitive Cycle, etc.)
- Las relaciones entre conceptos
- Las restricciones ontológicas

COGNITIVE_PRINCIPLES.md NO define términos. Si necesita un término no definido,
debe solicitarlo a ONTOLOGY.md.

### 4.2 Documentos que DEPENDERÁN de él (salida)

```
COGNITIVE_PRINCIPLES.md
       ↓
NIVEL II-b: ARCHITECTURE.md ─── la arquitectura debe implementar los principios
NIVEL II-c: ADRs ─────────────── las decisiones deben ser compatibles con los principios
       ↓
NIVEL III
├── COGNITIVE_ARCHITECTURE.md ─ componentes que realizan las funciones cognitivas
├── DECISION_MODEL.md ────────── reglas de decisión derivadas de principios de compromiso
├── KNOWLEDGE_MODEL.md ───────── esquemas que realizan principios de memoria/evidencia
├── EVIDENCE_MODEL.md ────────── modelo de datos que implementa principios de evidencia
├── CERTAINTY_CALCULUS.md ────── matemática que implementa principios de certidumbre
├── COMMITMENT_MODEL.md ──────── máquina de estados que implementa principios de compromiso
├── CHANNEL_ADAPTER.md ───────── interfaz que implementa principios de interacción
└── ACTION_EXECUTOR.md ───────── ejecutor que implementa principios de proyección
       ↓
NIVEL IV: Implementación (código, prompts, config)
```

### 4.3 Expectativas que la Constitución ya creó

La Constitución ya exige que COGNITIVE_PRINCIPLES.md contenga:

| Cita constitucional | Expectativa |
|--------------------|-------------|
| 3.3.1: "Certainty must decay over time without confirming Evidence (see COGNITIVE_PRINCIPLES.md)" | Principio(s) de degradación de certidumbre |
| 3.4: "The calibration of thresholds belongs to COGNITIVE_PRINCIPLES.md and DECISION_MODEL.md" | Principio(s) de calibración de umbrales |
| Sección 6, Level II-a: "Operational principles derived from constitutional principles. Defines the 22+ cognitive principles that govern runtime behavior." | Colección completa de principios operativos |

`COGNITIVE_PRINCIPLES.md` DEBE satisfacer todas estas expectativas. Si no lo
hace, la Constitución tiene referencias rotas.

---

## 5. Fronteras detalladas

### 5.1 Frontera con CONSTITUTION.md

| Aspecto | CONSTITUTION | COGNITIVE_PRINCIPLES |
|---------|-------------|---------------------|
| **Naturaleza** | Filosófico, identitario | Operativo, cognitivo |
| **Pregunta que responde** | ¿Qué ES AITOS? ¿Qué DEBE hacer siempre? | ¿CÓMO piensa AITOS? ¿Qué reglas sigue su cognición? |
| **Cambio** | Enmienda constitucional | Revisión de compatibilidad + ADR |
| **Violación** | Crisis constitucional (S-P9) | Deuda técnica |
| **Ejemplo** | "Toda decisión debe basarse en evidencia" (S-P1) | "La evidencia debe resolverse por mayoría ponderada de certidumbre, no por regla de mayoría simple" |
| **Nivel** | Abstracto, inviolable | Concreto, verificable |

**Regla de frontera:** Si un enunciado describe la IDENTIDAD del sistema o
un VALOR FUNDACIONAL, está en la Constitución. Si describe un COMPORTAMIENTO
COGNITIVO derivado de ese valor, está en COGNITIVE_PRINCIPLES.md.

**Prueba de frontera:** Preguntar "¿este enunciado puede violarse sin que
AITOS deje de ser AITOS?" Si sí → COGNITIVE_PRINCIPLES. Si no → CONSTITUTION.

### 5.2 Frontera con ONTOLOGY.md

| Aspecto | ONTOLOGY | COGNITIVE_PRINCIPLES |
|---------|----------|---------------------|
| **Naturaleza** | Léxico, definitorio | Normativo, conductual |
| **Pregunta que responde** | ¿Qué significa X? | ¿Cómo se comporta X? |
| **Contenido** | Definiciones, relaciones, restricciones | Reglas, principios, criterios |
| **Ejemplo** | "Hypothesis: Una proposición que el sistema considera activamente pero aún no sostiene como creencia" | "El sistema debe mantener más de una hipótesis activa cuando la evidencia sea ambigua" |

**Regla de frontera:** Si un enunciado DEFINE un concepto, está en ONTOLOGY.
Si prescribe cómo DEBE USARSE un concepto ya definido, está en
COGNITIVE_PRINCIPLES.

**Prohibición:** COGNITIVE_PRINCIPLES.md NO puede contener definiciones. Si
necesita un concepto no definido, el proceso es:
1. Solicitar la definición a ONTOLOGY.md.
2. Una vez definido, usarlo en COGNITIVE_PRINCIPLES.md.
3. Si la definición ya existe, referenciarla sin redefinir.

### 5.3 Frontera con ARQUITECTURA COGNITIVA (COGNITIVE_ARCHITECTURE.md)

| Aspecto | COGNITIVE_PRINCIPLES | COGNITIVE_ARCHITECTURE |
|---------|---------------------|------------------------|
| **Naturaleza** | Comportamiento cognitivo | Estructura del sistema |
| **Pregunta** | ¿Qué reglas sigue la cognición? | ¿Qué componentes ejecutan la cognición? |
| **Contenido** | Principios, restricciones, relaciones | Componentes, capas, interfaces, flujos |
| **Ejemplo** | "Toda hipótesis debe tener una condición de falsación" | "El Hypothesis Network es un módulo dentro del Reasoning Engine" |

**Regla de frontera:** Si un enunciado describe QUÉ DEBE OCURRIR durante la
cognición (sin decir qué componente lo hace), está en COGNITIVE_PRINCIPLES.
Si describe QUÉ COMPONENTE existe o cómo se conecta, está en la Arquitectura.

**Caso práctico:** "La certidumbre debe degradarse exponencialmente sin
evidencia confirmatoria" → COGNITIVE_PRINCIPLES. "El Decay Engine llama al
Certainty Store cada 5 minutos" → COGNITIVE_ARCHITECTURE.

### 5.4 Frontera con DECISION_MODEL.md

| Aspecto | COGNITIVE_PRINCIPLES | DECISION_MODEL |
|---------|---------------------|----------------|
| **Naturaleza** | Principios de decisión | Mecánica de decisión |
| **Pregunta** | ¿Bajo qué reglas se decide? | ¿CÓMO se calcula la decisión? |
| **Ejemplo** | "El umbral de compromiso debe ser dinámico según costo de error" | "Threshold = min(0.95, 0.7 + cost_of_error * 0.1)" |

**Regla de frontera:** COGNITIVE_PRINCIPLES define los PRINCIPIOS de decisión
(qué debe cumplir el modelo de decisión). DECISION_MODEL define el ALGORITMO
(cómo se cumple exactamente).

### 5.5 Frontera con ADRs

| Aspecto | COGNITIVE_PRINCIPLES | ADR |
|---------|---------------------|-----|
| **Naturaleza** | Reglas generales y reutilizables | Decisiones específicas con contexto |
| **Pregunta** | ¿Qué principios rigen siempre? | ¿Qué decidimos en este caso concreto? |
| **Contenido** | Principios + justificación + verificación | Contexto + alternativas + decisión |
| **Ejemplo** | "Principio de fusión conservadora" | "ADR-011: Adoptamos EventStore como implementación del Evidence Store" |

**Regla de frontera:** Si un enunciado es aplicable a MÚLTIPLES decisiones
futuras, está en COGNITIVE_PRINCIPLES. Si documenta una decisión con fecha,
contexto y alternativas, es un ADR.

### 5.6 Frontera con Prompts y LLM Instructions

| Aspecto | COGNITIVE_PRINCIPLES | Prompts/Instructions |
|---------|---------------------|---------------------|
| **Naturaleza** | Reglas cognitivas | Instrucciones ejecutables |
| **Pregunta** | ¿Qué debe hacer la cognición? | ¿Qué debe hacer el LLM? |
| **Ejemplo** | "El sistema no puede delegar decisiones al LLM" | "You are a helpful assistant. Extract the origin and destination." |

**Regla de frontera:** COGNITIVE_PRINCIPLES rige el COMPORTAMIENTO del sistema
en su totalidad. Los prompts rigen el comportamiento del LLM como UN COMPONENTE
del sistema. Los prompts deben ser compatibles con los principios, pero los
principios no son prompts.

### 5.7 Frontera con INVARIANTS.md

| Aspecto | COGNITIVE_PRINCIPLES | INVARIANTS |
|---------|---------------------|------------|
| **Naturaleza** | Principios conceptuales | Invariantes formales |
| **Pregunta** | ¿Qué reglas rigen la cognición? | ¿Qué condiciones deben verificarse siempre en ejecución? |
| **Contenido** | Principio + justificación + verificación conceptual | Invariante formal + test |
| **Ejemplo** | "La evidencia es inmutable" | "∀ e ∈ EvidenceStore: e.version = 1" |

**Regla de frontera:** COGNITIVE_PRINCIPLES define el PRINCIPIO. INVARIANTS
define la FORMALIZACIÓN MATEMÁTICA y los TESTS que verifican el principio en
ejecución.

### 5.8 Mapa de fronteras (visual)

```
NIVEL I ──────────────────────────────────────────────────────
  CONSTITUTION.md          ONTOLOGY.md
  (identidad, valores)     (definiciones)
       │                        │
       └──────┬─────────────────┘
              │
NIVEL II ─────┼───────────────────────────────────────────────
              │
     COGNITIVE_PRINCIPLES.md
     (comportamiento cognitivo — reglas operativas)
              │
       ┌──────┼──────────────────┐
       │      │                  │
NIVEL III ────┼──────────────────┼────────────────────────────
       │      │                  │
  COGNITIVE   │            ADRs + DECISION_MODEL
  ARCHITECTURE│            (decisiones, mecánica)
  (estructura)│
              │
  KNOWLEDGE_MODEL, EVIDENCE_MODEL, CERTAINTY_CALCULUS,
  COMMITMENT_MODEL, CHANNEL_ADAPTER, ACTION_EXECUTOR
              │
NIVEL IV ─────┼───────────────────────────────────────────────
              │
         CÓDIGO, PROMPTS, CONFIG, RUNBOOKS
```

---

## 6. Nivel de abstracción

### 6.1 Caracterización

`COGNITIVE_PRINCIPLES.md` debe escribir en un nivel de abstracción que sea:

| Es | No es |
|----|-------|
| **Conceptual** — describe comportamientos cognitivos | Técnico — no describe implementaciones |
| **Prescriptivo** — dice qué debe hacerse | Opcional — no hay principios sugeridos |
| **Verificable** — cada principio puede evaluarse | Abstracto — no puede ser imposible de verificar |
| **Estable** — cambia por refinamiento, no por urgencia | Volátil — no cambia con cada sprint |
| **Derivado** — emerge de la Constitución | Originario — no crea nuevos valores fundacionales |

### 6.2 Tipos de contenido permitidos

1. **Principios cognitivos:** reglas de comportamiento del sistema cognitivo.
2. **Restricciones operativas:** condiciones que limitan el espacio de diseño.
3. **Relaciones entre principios:** cómo un principio refuerza o limita a otro.
4. **Criterios de verificación:** cómo determinar si un cambio respeta el
   principio.
5. **Delegaciones explícitas:** qué debe concretar cada documento de Nivel III.

### 6.3 Tipos de contenido prohibidos

1. **Algoritmos:** "la certidumbre se calcula como sum(peso_i * confianza_i)"
   → eso es DECISION_MODEL.md o CERTAINTY_CALCULUS.md.
2. **Diagramas:** los diagramas pertenecen a la Arquitectura.
3. **Código:** ni siquiera pseudocódigo.
4. **Definiciones:** "una hipótesis es..." → eso es ONTOLOGY.md.
5. **Reglas de negocio:** "los viajes al aeropuerto tienen un recargo del 20%."
6. **Especificaciones de API:** "POST /evidence retorna 201."
7. **Estado del proyecto:** no hay roadmaps, fechas, o prioridades aquí.
8. **Argumentos de diseño:** "consideramos usar X pero decidimos Y porque..."
   → eso es un ADR.

---

## 7. Estructura propuesta

### 7.1 Índice completo

```
COGNITIVE_PRINCIPLES.md
│
├── 1. Preliminares
│   ├── 1.1 Propósito
│   ├── 1.2 Autoridad (relación con CONSTITUTION.md y ONTOLOGY.md)
│   ├── 1.3 Estabilidad y cambio
│   └── 1.4 Lectura de este documento
│
├── 2. Principios del Ciclo Cognitivo
│   ├── 2.1 Principio de ciclo completo
│   ├── 2.2 Principio de secuencia estricta
│   ├── 2.3 Principio de completitud por ciclo
│   └── 2.4 Principio de límite temporal
│
├── 3. Principios de Percepción
│   ├── 3.1 Principio de frontera percepción/evidencia
│   ├── 3.2 Principio de registro antes de interpretación
│   └── 3.3 Principio de determinismo perceptual
│
├── 4. Principios de Evidencia
│   ├── 4.1 Principio de inmutabilidad (derivado de S-P5)
│   ├── 4.2 Principio de trazabilidad observacional
│   ├── 4.3 Principio de resolución de evidencia conflictiva
│   ├── 4.4 Principio de silencio como evidencia
│   └── 4.5 Principio de suficiencia mínima
│
├── 5. Principios de Razonamiento e Hipótesis
│   ├── 5.1 Principio de hipótesis múltiples
│   ├── 5.2 Principio de condición de falsación
│   ├── 5.3 Principio de fusión conservadora
│   ├── 5.4 Principio de coexistencia de intenciones
│   └── 5.5 Principio de resolución por evidencia
│
├── 6. Principios de Certidumbre
│   ├── 6.1 Principio de certidumbre continua (derivado de P-E2)
│   ├── 6.2 Principio de degradación temporal
│   ├── 6.3 Principio de actualización por evidencia
│   └── 6.4 Principio de límite epistémico
│
├── 7. Principios de Compromiso
│   ├── 7.1 Principio de compromiso explícito
│   ├── 7.2 Principio de umbral dinámico
│   ├── 7.3 Principio de costo de error (derivado de P-E5 y Sección 3.4)
│   ├── 7.4 Principio de compromiso informativo vs. operacional
│   └── 7.5 Principio de escalamiento por insuficiencia
│
├── 8. Principios de Proyección
│   ├── 8.1 Principio de proyección derivada
│   ├── 8.2 Principio de solo lectura
│   └── 8.3 Principio de reconstrucción desde evidencia
│
├── 9. Principios de Memoria
│   ├── 9.1 Principio de preservación (derivado de S-P6)
│   └── 9.2 Principio de archivo por relevancia
│
├── 10. Principios de Interacción
│   ├── 10.1 Principio de preguntar con propósito
│   ├── 10.2 Principio de acompañamiento continuo
│   ├── 10.3 Principio de no-repregunta
│   ├── 10.4 Principio de explicación antes de acción (derivado de S-P1)
│   └── 10.5 Principio de contexto mínimo
│
├── 11. Principios de Aprendizaje
│   ├── 11.1 Principio de retroalimentación por outcome
│   ├── 11.2 Principio de ajuste de confianza de fuente
│   └── 11.3 Principio de mejora no destructiva
│
├── 12. Precedencia entre principios
│   ├── 12.1 Reglas de resolución de conflictos internos
│   └── 12.2 Relación con precedencia constitucional (S-P8)
│
└── 13. Derivación constitucional
    ├── 13.1 Tabla de derivación (cada principio → fuente constitucional)
    └── 13.2 Mapa a documentos de Nivel III
```

### 7.2 Justificación de cada sección

| Sección | Por qué existe |
|---------|---------------|
| **1. Preliminares** | Establece autoridad, relación con otros documentos, reglas de cambio. Sin esto, el documento es huérfano. |
| **2. Ciclo Cognitivo** | La Constitución (2.1) dice que AITOS opera por ciclo cognitivo. Los principios del ciclo son la base de todo lo demás. Sin ciclo, no hay cognición. |
| **3. Percepción** | Define cómo los señales se convierten en evidencia. Es la puerta de entrada. Sin esto, la evidencia no tiene origen. |
| **4. Evidencia** | Corazón del sistema. La Constitución dedica S-P1, S-P5, P-I1, P-E1 a la evidencia. COGNITIVE_PRINCIPLES concreta cómo se comporta. |
| **5. Razonamiento e Hipótesis** | La Ontología define Hypothesis y Hypothesis Network. La Constitución no dice cómo usarlas. Este principio llena el vacío. |
| **6. Certidumbre** | La Constitución (P-E2, 3.3) exige certidumbre continua y degradación. Este principio define las reglas de la degradación y actualización. |
| **7. Compromiso** | La Constitución (S-P7, P-E5) exige umbral y costo de error. Este principio define las reglas de calibración y escalamiento. |
| **8. Proyección** | La Ontología define Operational Projection. Este principio define cómo se deriva y qué restricciones tiene. |
| **9. Memoria** | La Constitución (S-P6) exige preservación del conocimiento. Este principio define las reglas de retención, archivo y olvido. |
| **10. Interacción** | Las auditorías #04 y #05 identificaron principios conversacionales. Este principio los eleva a reglas cognitivas. |
| **11. Aprendizaje** | La Constitución (P-E4) exige revisabilidad de creencias. Este principio define cómo los outcomes mejoran el sistema. |
| **12. Precedencia** | S-P8 gobierna conflictos entre principios constitucionales. Este principio gobierna conflictos entre principios operativos. |
| **13. Derivación** | Sin esta sección, no hay trazabilidad entre COGNITIVE_PRINCIPLES y CONSTITUTION. Cada principio debe mostrar de qué principio constitucional deriva. |

### 7.3 Formato de cada principio

Cada principio debe tener esta estructura:

```
### CP-NN — Nombre del principio

> **Enunciado:** Una oración normativa.

**Derivación:** ¿De qué artículo/s de la Constitución deriva?

**Justificación:** ¿Por qué existe este principio? ¿Qué problema resuelve?

**Consecuencia de violación:** ¿Qué ocurre si alguien lo viola?
- Si es técnica (deuda): se gestiona por S-P9
- Si es conceptual: invalida la decisión

**Criterio de verificación:** ¿Cómo se determina si un cambio dado viola
este principio? Debe ser una pregunta binaria: ¿sí o no?

**Delegación:** ¿Qué documento de Nivel III o IV concreta este principio?

**Relaciones:** ¿Con qué otros principios de este documento se relaciona?
```

---

## 8. Mapeo desde Auditoría #06

### 8.1 Principios que ya están en la Constitución (NO repetir)

| Principio #06 | En la Constitución |
|---------------|-------------------|
| P1 (Inmutabilidad evidencia) | S-P5 |
| P4 (Certidumbre continua) | P-E2 |
| P14 (LLM expresa, no decide) | S-P4, Sección 2.2 |

### 8.2 Principios que van a COGNITIVE_PRINCIPLES (núcleo)

| Principio #06 | Sección destino | Notas |
|---------------|-----------------|-------|
| P2 (Frontera percepción/interpretación) | 3.2 — Registro antes de interpretación | |
| P3 (Hipótesis múltiples) | 5.1 — Hipótesis múltiples | |
| P5 (Compromiso explícito) | 7.1 — Compromiso explícito | |
| P6 (Costo de error) — principio | 7.3 — Costo de error | El principio (qué debe cumplir) va a CP. La mecánica (cálculo) va a DECISION_MODEL.md (§8.3). |
| P7 (Proyección solo lectura) | 8.2 — Proyección de solo lectura | |
| P9 (Reconstrucción desde evidencia) | 8.3 — Reconstrucción desde evidencia | |
| P10 (Degradación gradual) | 6.2 — Degradación temporal | Delegado explícitamente por Constitución 3.3.1. |
| P11 (Fusión conservadora) | 5.3 — Fusión conservadora | |
| P12 (Preguntar con propósito) | 10.1 — Preguntar con propósito | |
| P13 (Acompañamiento continuo) | 10.2 — Acompañamiento continuo | |
| P15 (Coexistencia de intenciones) | 5.4 — Coexistencia de intenciones | |
| P16 (Compromiso informativo ≠ operacional) | 7.4 — Compromiso informativo vs. operacional | |
| P17 (Silencio es evidencia) | 4.4 — Silencio como evidencia | |
| P18 (Estrategia desde conocimiento) | 7.2 — Umbral dinámico | |
| P19 (Explicación precede acción) | 10.4 — Explicación antes de acción | NO está en la Constitución. P-I5 es retrospectivo (auditabilidad); P19 es prospectivo. |
| P20 (Bucle aprendizaje) | 11.1 — Retroalimentación por outcome | |
| P21 (Umbral dinámico) | 7.2 — Umbral dinámico | |

### 8.3 Principios que van a otros documentos de Nivel III

| Principio #06 | Documento destino | Razón |
|---------------|------------------|-------|
| P8 (Una fuente, una responsabilidad) | RESPONSIBILITY_MODEL.md | Es asignación de responsabilidad, no principio cognitivo |
| P22 (Responsabilidad no superpuesta) | RESPONSIBILITY_MODEL.md | Es asignación de responsabilidad, no principio cognitivo |
| P6 (Costo de error) — mecánica | DECISION_MODEL.md | Es algoritmo de decisión, no principio |
| P4 (Certidumbre continua) — fórmula | CERTAINTY_CALCULUS.md | Es matemática, no principio |

---

## 9. Riesgos

### 9.1 R1 — Duplicar la Constitución

**Riesgo:** Escribir principios que YA ESTÁN en CONSTITUTION.md.

**Ejemplo:** "La evidencia debe ser inmutable" ya está en S-P5. Repetirlo en
COGNITIVE_PRINCIPLES.md crea dos versiones del mismo principio.

**Mitigación:**
- La Sección 13 (Derivación constitucional) mapea cada principio a su fuente.
- Si un principio ya existe en la Constitución, se marca como "Derivado de [ID]"
  y NO se reescribe el principio — solo se refina el comportamiento.
- Regla: "Si el enunciado normativo ya está en la Constitución, no repetirlo.
  Referenciarlo. Concretar el comportamiento."
- Garantía específica para 4.1 (Inmutabilidad/S-P5), 6.1 (Certidumbre continua/P-E2)
  y 9.1 (Preservación/S-P6): cada uno DEBE refinar el comportamiento operativo
  (ej.: "cómo opera la inmutabilidad dentro del ciclo cognitivo"), no repetir el
  enunciado constitucional. Si un principio no agrega valor operativo respecto de
  su fuente constitucional, debe eliminarse de COGNITIVE_PRINCIPLES.md.

### 9.2 R2 — Redefinir la Ontología

**Riesgo:** Definir términos que ya están definidos en ONTOLOGY.md.

**Ejemplo:** "Una hipótesis es una proposición activa..." — eso ya está en
ONTOLOGY.md 6.4.

**Mitigación:**
- Todo término capitalizado (Evidence, Belief, Commitment, etc.) debe
  referenciar a ONTOLOGY.md sin redefinir.
- Si un término no existe en ONTOLOGY.md, no usarlo hasta que se agregue.

### 9.3 R3 — Mezclar principios con implementación

**Riesgo:** Incluir reglas como "la certidumbre se almacena en Redis" o
"el LLM debe usar GPT-4."

**Mitigación:**
- Criterio: ¿El enunciado describe un COMPORTAMIENTO o una TECNOLOGÍA?
- Si menciona una tecnología específica, está fuera de nivel.
- Los criterios de verificación pueden mencionar tecnología como ejemplo,
  pero no como requisito.

### 9.4 R4 — Incluir decisiones de arquitectura

**Riesgo:** Decidir cómo se implementa un principio en lugar de qué debe
lograr.

**Ejemplo:** "El Hypothesis Network debe tener un componente que fusione
hipótesis." Eso es arquitectura, no principio.

**Mitigación:**
- Los principios describen QUÉ debe ocurrir (resultado observable).
- La Arquitectura describe QUÉ componente lo hace.
- Si el texto dice "un componente debe X", está fuera de nivel.

### 9.5 R5 — Convertirse en cajón de sastre

**Riesgo:** Como es el documento de "principios," todo termina aquí:
principios de código, principios de UI, principios de equipo, etc.

**Mitigación:**
- Criterio de inclusión: "¿Este principio describe un comportamiento cognitivo
  del sistema AITOS?" Si no, no pertenece aquí.
- Principios de código → especificaciones técnicas.
- Principios de UI → guías de experiencia de usuario.
- Principios de equipo → GOVERNANCE.md o documentos de equipo.

### 9.6 R6 — Dependencia circular con DECISION_MODEL.md

**Riesgo:** COGNITIVE_PRINCIPLES dice "los umbrales se calibran según
DECISION_MODEL.md" y DECISION_MODEL.md dice "se calibra según
COGNITIVE_PRINCIPLES.md."

**Mitigación:**
- La dependencia es UNIDIRECCIONAL: COGNITIVE_PRINCIPLES define el PRINCIPIO
  (qué debe cumplir el modelo de decisión). DECISION_MODEL define el MECANISMO
  (cómo se cumple).
- COGNITIVE_PRINCIPLES puede decir "el umbral debe ser dinámico."
- DECISION_MODEL puede decir "threshold = f(cost_of_error)."
- DECISION_MODEL no puede decir "según los principios en COGNITIVE_PRINCIPLES,
  el umbral se define como..." — eso es una referencia válida PERO NO una
  dependencia circular porque COGNITIVE_PRINCIPLES no referencia a
  DECISION_MODEL para definir principios — solo para delegar implementación.

### 9.7 R7 — Principios sin verificación

**Riesgo:** Principios tan abstractos que no pueden verificarse.

**Ejemplo:** "El sistema debe ser justo con todos los pasajeros." — sin
definir "justo," es inverificable.

**Mitigación:**
- Cada principio debe tener un criterio de verificación binario.
- Si no se puede definir una verificación, el principio no está listo.
- La verificación puede ser conceptual (no requiere automatización), pero
  debe ser DETERMINISTA: dos evaluadores independientes deben llegar a la
  misma conclusión.

---

## 10. Criterios de aceptación

El documento `COGNITIVE_PRINCIPLES.md` se considerará correcto cuando cumpla
TODOS estos criterios:

### CA1 — Compatibilidad con Nivel I
- ✅ Ningún principio contradice CONSTITUTION.md.
- ✅ Ningún principio contradice ONTOLOGY.md.
- ✅ Todos los principios tienen derivación explícita a CONSTITUTION.md
  (Sección 13).

### CA2 — Sin definiciones
- ✅ No hay definiciones de términos (eso es ONTOLOGY.md).
- ✅ Todo término capitalizado referencia su definición en ONTOLOGY.md.
- ✅ No introduce términos nuevos sin pasarlos por ONTOLOGY.md primero.

### CA3 — Sin decisiones arquitectónicas
- ✅ Ningún principio describe componentes, interfaces o flujos de datos.
- ✅ Ningún principio asigna responsabilidades a componentes específicos.
- ✅ Cada principio incluye una delegación explícita a documentos de Nivel III.

### CA4 — Sin implementaciones
- ✅ No contiene código, pseudocódigo, tecnologías específicas, ni nombres
  de productos.
- ✅ Los criterios de verificación son conceptuales, no técnicos.

### CA5 — Cada principio es verificable
- ✅ Cada principio tiene un criterio de verificación binario.
- ✅ Dos evaluadores independientes llegarían a la misma conclusión.

### CA6 — Satisface las expectativas constitucionales
- ✅ Incluye principio(s) de degradación de certidumbre (Const. 3.3.1).
- ✅ Incluye principio(s) de calibración de umbrales (Const. 3.4).
- ✅ Define 22+ principios operativos (Const. Sección 6, Level II-a).

### CA7 — Sin contradicciones internas
- ✅ Ningún principio contradice a otro dentro del mismo documento.
- ✅ Las reglas de precedencia (Sección 12) pueden resolver cualquier
  conflicto entre principios.

### CA8 — Sin reglas de negocio
- ✅ Ningún principio menciona precios, horarios, políticas de cancelación,
  tipos de vehículo u otras reglas del dominio de TaxiGuazú.

### CA9 — Trazabilidad con Auditoría #06
- ✅ Cada principio de Auditoría #06 está mapeado a su destino
  (Constitución, COGNITIVE_PRINCIPLES, o Nivel III).
- ✅ Ningún principio de Auditoría #06 se perdió (todos tienen destino).

### CA10 — Cobertura completa
- ✅ Hay principios para cada fase del ciclo cognitivo
  (Percepción, Razonamiento, Compromiso, Proyección).
- ✅ Hay principios para cada dominio cognitivo
  (Evidencia, Certidumbre, Hipótesis, Memoria, Interacción, Aprendizaje).

---

## 11. Autoauditoría crítica

> Antes de presentar este diseño como correcto, intento refutarlo.

### 11.1 Intento de refutación 1: "El diseño replica la estructura de la Ontología"

**Crítica:** Las secciones 3–11 siguen la misma estructura que los dominios
de ONTOLOGY.md (Percepción → Evidencia → Conocimiento → Decisión →
Proyección...). Esto sugiere que COGNITIVE_PRINCIPLES.md es una copia
conductual de la Ontología.

**Defensa:** Es intencional. La Ontología define los conceptos en el orden
del ciclo cognitivo. COGNITIVE_PRINCIPLES define los principios operativos
en el MISMO orden porque ambos describen el mismo ciclo desde ángulos
diferentes. Uno define términos; el otro define reglas. No es duplicación
— es paralelismo estructural. Sería PEOR tener una estructura diferente
que obligara a saltar entre documentos para seguir el flujo cognitivo.

**Conclusión:** ✅ El diseño resiste esta crítica.

### 11.2 Intento de refutación 2: "Demasiadas secciones (13) para un documento estable"

**Crítica:** Trece secciones es demasiado. Un documento "Estable" con 13
secciones y ~35 principios será difícil de mantener. La gente no lo leerá.

**Defensa:** La alternativa es concentrar todo en menos secciones, lo que
crea secciones gigantescas (ej: "Principios de Conocimiento" con 15 principios).
La división en 13 secciones sigue la estructura cognitiva natural. Cada
sección tiene ~3–5 principios, que es un tamaño manejable. El documento
total será largo (~100 principios con justificaciones) pero CADA principio es
individualmente verificable. No es necesario leer todo — se consulta por
sección.

**Riesgo real:** El documento podría volverse demasiado largo.
**Mitigación:** Cada principio es autocontenido. Se puede leer uno sin
necesidad de leer los otros.

**Conclusión:** ⚠️ Riesgo mitigado. El diseño se mantiene.

### 11.3 Intento de refutación 3: "La Sección 10 (Interacción) se solapa con COGNITIVE_ARCHITECTURE.md"

**Crítica:** Los principios de interacción (preguntar con propósito,
acompañamiento continuo, no-repregunta) suenan a diseño de conversación,
que es arquitectura, no principios cognitivos.

**Defensa:** Estos principios provienen de Auditoría #04 (Principios
Conversacionales) y describen COMPORTAMIENTOS COGNITIVOS: cómo el sistema
decide qué preguntar, cuándo comunicarse, cómo mantener contexto. No
describen componentes de UI ni flujos de conversación. Describen las REGLAS
que la conversación debe seguir. La implementación concreta (qué componente
genera la pregunta, cómo se envía) pertenece a COGNITIVE_ARCHITECTURE.md y
CHANNEL_ADAPTER.md.

**Ejemplo de frontera:**
- COGNITIVE_PRINCIPLES: "El sistema solo debe preguntar cuando hay un gap
  de evidencia identificado."
- COGNITIVE_ARCHITECTURE: "El Perception Engine llama al SlotWorkflow cuando
  detecta un gap."

**Conclusión:** ✅ El diseño resiste esta crítica.

### 11.4 Intento de refutación 4: "La Sección 13 (Derivación) debería estar en un documento separado"

**Crítica:** La tabla de derivación constitucional es metadata, no contenido
normativo. Hace el documento más pesado.

**Defensa:** Sin la derivación explícita, no hay manera de verificar que
COGNITIVE_PRINCIPLES.md es compatible con la Constitución. La derivación es
EL MECANISMO DE VERIFICACIÓN DE CONSISTENCIA entre Nivel I y Nivel II.
Incluirla en el documento asegura que cualquier cambio en la derivación se
revise junto con el principio. Si estuviera separada, podría desactualizarse.

**Conclusión:** ✅ El diseño resiste esta crítica.

### 11.5 Intento de refutación 5: "Faltan principios de Postura Estratégica"

**Crítica:** El diseño no tiene una sección dedicada a "Strategic Posture"
(ONTOLOGY.md 8.5). Es un concepto ontológico importante sin principios
operativos.

**Defensa:** Strategic Posture es un MECANISMO de modulación de umbrales,
no un dominio cognitivo independiente. Sus principios operativos se
distribuyen:
- Principio de umbral dinámico (7.2): el umbral se ajusta según contexto.
- Principio de costo de error (7.3): el costo determina el ajuste.
- Principio de escalamiento (7.5): cuando el umbral no se alcanza.

Además, la Constitución (P-E5) ya cubre la respuesta proporcional. Una
sección separada para Strategic Posture en COGNITIVE_PRINCIPLES.md sería
artificial.

**Conclusión:** ✅ El diseño resiste esta crítica.

### 11.6 Intento de refutación 6: "Dependencia peligrosa con documentos que no existen"

**Crítica:** El diseño referencia COGNITIVE_ARCHITECTURE.md, DECISION_MODEL.md,
KNOWLEDGE_MODEL.md, etc. como destino de delegación. Estos documentos no
existen. COGNITIVE_PRINCIPLES.md crea expectativas sobre documentos que
quizás nunca se escriban.

**Defensa:** Es el PROPÓSITO del documento. La Constitución (Sección 6)
define la jerarquía. COGNITIVE_PRINCIPLES.md como Nivel II debe crear las
expectativas para Nivel III. Sin estas delegaciones, los documentos de
Nivel III no sabrían qué deben implementar.

**Riesgo:** Si los documentos de Nivel III no se escriben, los principios de
COGNITIVE_PRINCIPLES.md quedan colgados.

**Mitigación:** No es responsabilidad de COGNITIVE_PRINCIPLES.md asegurar que
los documentos de Nivel III existan. Esa es responsabilidad del governance
(Sección 7 de la Constitución). COGNITIVE_PRINCIPLES.md solo establece qué
DEBE implementarse.

**Conclusión:** ✅ El diseño resiste esta crítica.

### 11.7 Intento de refutación 7: "No hay principios de seguridad ni tolerancia a fallos"

**Crítica:** El diseño no incluye una sección dedicada a principios de
seguridad, tolerancia a fallos, o robustez cognitiva.

**Defensa:** Los principios de seguridad están en la Constitución como
principios supremos (S-P4: núcleo determinista, S-P7: escalamiento humano).
No deben repetirse en COGNITIVE_PRINCIPLES.md. Los principios operativos
de tolerancia a fallos están implícitos en:
- Principio de determinismo perceptual (3.3): la percepción no depende de LLM.
- Principio de reconstrucción desde evidencia (8.3): el sistema se recupera.
- Principio de degradación (6.2): la pérdida de evidencia no causa fallo
  abrupto.

Una sección adicional de "seguridad" sería duplicar la Constitución.

**Conclusión:** ✅ El diseño resiste esta crítica.

### 11.8 Intento de refutación 8: "El diseño es demasiado ambicioso"

**Crítica:** 13 secciones, ~35 principios, cada uno con justificación,
derivación, verificación y delegación. Esto es un documento enorme (~200–300
páginas en forma final). Nadie lo leerá completo.

**Defensa:** El tamaño no es un defecto si la estructura es navegable. La
tabla de contenidos permite saltar a la sección relevante. Cada principio
es autocontenido (se puede leer uno solo). Los documentos de Nivel I y II
SON largos por naturaleza — son la fundación del sistema. Prefiero un
documento completo que uno pequeño que deje lagunas.

Además, el Master Plan estimó "1 día" para escribir COGNITIVE_PRINCIPLES.md.
Eso sugiere que el contenido debe ser DENSIDAD CONCEPTUAL ALTA, no extensión
superficial. El diseño propuesto es denso pero no inflado.

**Conclusión:** ⚠️ Acepto que el tamaño es un riesgo real. Pero no hay
alternativa sin sacrificar cobertura.

---

## Resumen de la autoauditoría

| # | Crítica | Verdicto |
|---|---------|----------|
| 1 | Replica estructura de Ontología | ✅ Resistida — es paralelismo intencional |
| 2 | Demasiadas secciones | ✅ Resistida — estructura sigue ciclo cognitivo natural |
| 3 | Interacción se solapa con Arquitectura | ✅ Resistida — describe reglas, no componentes |
| 4 | Derivación debería estar separada | ✅ Resistida — es mecanismo de verificación de consistencia |
| 5 | Falta Postura Estratégica | ✅ Resistida — está distribuido en principios de umbral |
| 6 | Dependencia de documentos inexistentes | ✅ Resistida — es el propósito del documento |
| 7 | No hay principios de seguridad | ✅ Resistida — seguridad está en la Constitución |
| 8 | Demasiado ambicioso | ⚠️ Riesgo aceptado — densidad conceptual es necesaria |

**Ninguna de las refutaciones invalida el diseño.** Algunas identifican
riesgos reales pero mitigables. El diseño es sólido.

---

## Tabla resumen del diseño

| Aspecto | Decisión |
|---------|----------|
| **Propósito** | Traducir principios constitucionales en reglas de operación cognitiva |
| **Autoridad** | Nivel II-a (Structural Authority) — vincula a Arquitectura e Implementación |
| **Estabilidad** | Estable (se agregan principios, no se modifican ni eliminan sin ADR) |
| **Dependencia de entrada** | CONSTITUTION.md + ONTOLOGY.md |
| **Dependencia de salida** | COGNITIVE_ARCHITECTURE.md + DECISION_MODEL.md + KNOWLEDGE_MODEL.md + ... |
| **Secciones** | 13 |
| **Principios estimados** | ~34 |
| **Formato por principio** | Enunciado + Derivación + Justificación + Verificación + Delegación |
| **Nivel de abstracción** | Conceptual-prescriptivo-verificable |
| **Frontera con CONSTITUTION** | No repetir principios constitucionales |
| **Frontera con ONTOLOGY** | No definir términos |
| **Frontera con ARQUITECTURA** | No describir componentes |
| **Frontera con IMPLEMENTACIÓN** | No incluir código o tecnologías |
| **Frontera con ADRs** | No documentar decisiones individuales |

---

*Fin de especificación arquitectónica — COGNITIVE_PRINCIPLES.md*
*Aprobado: diseño listo para redactar contenido*
