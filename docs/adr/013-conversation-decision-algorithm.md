# ADR-013 — Conversation Decision Algorithm Ratification

**Estado:** ACEPTADO

**Fecha:** 2026-07-17

**Prerrequisitos:** FUNCTIONAL_BEHAVIOR_SPECIFICATION.md, Conversation Playbook, Principios AITOS LAB (P1-P10), QA1, QA2, QA2B, QA3-S2B, ADR-007, ADR-008, ADR-012

---

# 1. Contexto

## 1.1 Cadena de evidencia previa

Hasta la emisión de este ADR, el sistema se regía por un conjunto de principios arquitectónicos (ADR-007, ADR-008, ADR-012) y una especificación funcional (`FUNCTIONAL_BEHAVIOR_SPECIFICATION.md`), pero **no existía un algoritmo normativo que definiera el comportamiento conversacional esperado paso a paso**.

Las auditorías sucesivas demostraron que las desviaciones observadas no provenían únicamente de la implementación, sino de la **ausencia de una especificación algorítmica precisa** que resolviera ambigüedades entre los documentos existentes:

### QA1 — Architectural Consistency Audit
- **27 hallazgos** clasificados en 18 componentes del pipeline.
- 3 críticos, 4 estructurales, 3 fortalezas + matrices por componente.
- Demostró que el pipeline existente tenía múltiples fuentes de verdad para decisiones conversacionales fundamentales.

### QA2 — Runtime Flow Trace & Authority Verification
- **4 escenarios** trazados en runtime (greeting→booking, price query, full reservation, geo ambiguity).
- **3 hallazgos críticos confirmados** con evidencia dinámica (F-01 pipeline paralelo, F-02 afirmación triplicada, F-03 resolución de campos cuadruplicada).
- **4 hallazgos adicionales** descubiertos (F-04 ambiguity handler falla en "sí", F-05 pricing resuelto 3× por trip, F-06 5/7 rutas bypassan handleMessage, F-07 price query interceptado por ambiguity antes de pricing).
- Matriz de autoridades construida demostrando **múltiples autoridades compitiendo** por las mismas decisiones.

### QA2B — Conversational State Forensics
- **8 hallazgos** documentados (QB-01 a QB-08) sobre el estado conversacional real.
- QB-01: GREETING shortcut pierde contexto de la sesión.
- QB-02: Ambiguity state collapse (estado perdido durante resolución).
- QB-03: Confirmation timeout destruye slots completos.
- QB-04: Múltiples autoridades compiten por "qué campo preguntar".
- QB-05: Segundo core() en handler como fallback no controlado.
- QB-06: prevSlots merge sobrescribe valores nuevos con previos.
- QB-07: Intención cambia cada turno por clasificaciones de baja confianza.
- QB-08: Ambiguity state en slots JSON — frágil, se pierde al actualizar slots.

### QA3-S2B — Hotel Esturión Trace
- **12 puntos de control** trazados contra `FUNCTIONAL_BEHAVIOR_SPECIFICATION.md`.
- **3 desviaciones funcionales** confirmadas:
  - **F01-DG**: Ambiguity se activa sin verificar `clarify_field` — el sistema pregunta al usuario y simultáneamente activa ambigüedad sobre su respuesta.
  - **F02-DG**: Intención no preservada cuando `prevIntent=BOOKING` y se clasifica como `CONSULTA` — la intención se sobrescribe en lugar de preservarse.
  - **F03-DG**: Merge de contexto no ejecutado cuando se activa ambigüedad — el mensaje "Hotel Esturión" no se extrae como posible destination porque la rama de ambigüedad corta el pipeline antes del merge.
- **2 ambigüedades de especificación** detectadas y resueltas (A01-DG: cuándo preservar intención; A02-DG: cuándo activar Ambiguity).
- **Causa raíz compartida**: el sistema no distingue entre "usuario dando nueva información" y "usuario respondiendo a una pregunta del sistema".

## 1.2 Evidencia de necesidad

Las auditorías QA1 → QA2 → QA2B → QA3-S2B revelaron un patrón consistente:

1. **El sistema tiene reglas** (en Specification, ADRs, código) pero **no tiene un algoritmo** que las ordene, priorice y ejecute consistentemente.
2. **Múltiples autoridades** deciden sobre el mismo aspecto (activación de ambigüedad, preservación de intención, merge de contexto) sin coordinación.
3. **Las reglas existentes son incompletas**: la Specification define comportamientos deseados pero no define condiciones de activación, excepciones, ni jerarquía de prioridades.
4. **El código implementa comportamientos** que no están especificados ni auditados — bypasses, shortcuts, paths alternativos que nadie diseñó explícitamente.

## 1.3 Documentos fuente

El Conversation Decision Algorithm (CDA) sintetiza las siguientes fuentes:

| Fuente | Rol en el CDA |
|--------|---------------|
| `FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` | Autoridad funcional de base. Define QUÉ debe hacer el sistema. |
| Conversation Playbook (AITOS LAB) | Principios conversacionales (P1-P10). Define el POR QUÉ. |
| Principios AITOS LAB | Directrices de diseño conversacional. |
| ADR-007 (Conversation Interpreter) | Clasificación de mensajes como etapa del pipeline. |
| ADR-008 (Conversational Decision Architecture) | Ownership único de decisiones estratégicas. |
| ADR-012 (Cognitive Escalation Principle) | Prioridad del conocimiento explícito sobre generación. |
| QA1 (Architectural Consistency Audit) | Evidencia de inconsistencias estructurales. |
| QA2 (Runtime Flow Trace) | Evidencia de múltiples autoridades en runtime. |
| QA2B (Conversational State Forensics) | 8 bugs de estado conversacional documentados. |
| QA3-S2B (Hotel Esturión Trace) | 3 desviaciones funcionales + 2 ambigüedades de especificación. |

---

# 2. Problema

El sistema conversacional de AITOS carece de una **definición algorítmica normativa** que:

1. **Ordene las reglas existentes** en un pipeline lógico determinista (Interpretar → Preservar → Actualizar → Decidir → Responder).

2. **Resuelva ambigüedades** entre documentos fuente. Por ejemplo: la Specification dice en §12 que "si hay ambigüedad, activar resolución", pero en §25.2 muestra una excepción donde el sistema pregunta primero y luego el usuario responde — sin ambigüedad. Las dos reglas coexistían sin jerarquía.

3. **Defina condiciones de activación precisas** para cada decisión conversacional: cuándo se activa Ambiguity (6 condiciones SÍ, 6 condiciones NO), cuándo se preserva la intención (tabla de evolución completa), cuándo es UPDATE vs RESET (tiempos de inactividad, estados de sesión).

4. **Establezca invariantes verificables** (I-01 a I-15) que cualquier implementación debe cumplir, independientemente de cómo se implementen.

5. **Sirva como criterio de aceptación** para bugs y feature requests. Antes del CDA, un bug como "Ambiguity se activó cuando no debía" requería interpretación subjetiva. Con el CDA, la pregunta es objetiva: ¿viola el paso 9 del pipeline? ¿viola I-11?

---

# 3. Decisión

Se ratifica el documento `docs/specifications/CONVERSATION_DECISION_ALGORITHM.md` como la **autoridad funcional del comportamiento conversacional** de AITOS.

## 3.1 Jerarquía normativa

A partir de este ADR, la jerarquía de autoridad para resolver conflictos es:

```
Implementation (código)
        ↓
Conversation Decision Algorithm (CDA)
        ↓
Functional Behavior Specification
        ↓
Architecture Decision Records (ADR)
```

**El nivel superior prevalece sobre el inferior.**

- Si el **código** contradice al **CDA**, el código está incorrecto (bug).
- Si el **CDA** contradice a la **Specification**, prevalece el CDA (resolución de ambigüedad documentada).
- Si el **CDA** contradice a un **ADR**, prevalece el ADR. El CDA debe modificarse para alinearse.
- Si la **Specification** contradice a un **ADR**, prevalece el ADR.

## 3.2 Estatus del Conversation Decision Algorithm

El CDA es:

| Aspecto | Estatus |
|---------|---------|
| Naturaleza | **Normativo** — define el comportamiento esperado |
| Alcance | Pipeline conversacional completo (11 pasos, 15 invariantes) |
| Autoridad | Superior a la Specification en caso de ambigüedad |
| Modificable | Solo mediante nuevo ADR con evidencia |
| Verificable | Cada invariante (I-01 a I-15) es verificable contra código |
| Trazable | Cada regla se origina en Specification, ADR o auditoría |

El CDA **no reemplaza** los documentos existentes:

- La `FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` sigue siendo la autoridad funcional de base.
- Los ADR (007, 008, 012) siguen siendo la autoridad arquitectónica.
- El CDA **concreta** los principios de la Specification en un algoritmo ejecutable conceptualmente, y **resuelve** las ambigüedades detectadas (A01-DG, A02-DG).

## 3.3 Arquitectura de autoridades

```
┌─────────────────────────────────────────────┐
│          ADR (Arquitectura)                 │
│  ADR-007 (CI)  ADR-008 (CDA-Arq)           │
│  ADR-012 (Cognitive Escalation)             │
│                                             │
│  Define: principios, contratos, freezes      │
├─────────────────────────────────────────────┤
│          Specification (Funcional)          │
│  FUNCTIONAL_BEHAVIOR_SPECIFICATION.md       │
│                                             │
│  Define: QUÉ debe hacer el sistema           │
├─────────────────────────────────────────────┤
│     Conversation Decision Algorithm         │
│  CONVERSATION_DECISION_ALGORITHM.md         │
│                                             │
│  Define: CÓMO decide el sistema paso a paso │
│          (11 pasos, 15 invariantes)          │
├─────────────────────────────────────────────┤
│          Implementation (Código)            │
│  src/lib/ai/, src/lib/services/, etc.       │
│                                             │
│  Debe: cumplir el CDA                        │
└─────────────────────────────────────────────┘
```

## 3.4 Contenido del CDA

El documento ratificado contiene:

| Sección | Contenido |
|---------|-----------|
| §1 | Objetivo del algoritmo: Interpretar → Preservar → Actualizar → Decidir → Responder |
| §2 | Pipeline lógico ideal: 11 pasos secuenciales con condiciones de salida |
| §3 | Prioridades del algoritmo: 7 niveles (confirmado > intent > clarify_field > extracción > ambigüedad > LLM > fallback) |
| §4 | Invariantes I-01 a I-15: condiciones que toda implementación debe cumplir |
| §5 | Algoritmo de actualización de contexto: merge incremental, pseudocódigo |
| §6 | Cuándo se activa Ambiguity: 6 condiciones SÍ, 6 condiciones NO, risk nodes, pseudocódigo |
| §7 | Cuándo preservar intención: tabla de evolución, Booking Floating, 5 ejemplos |
| §8 | UPDATE vs RESET: tabla completa de condiciones, tiempos, prioridades |
| §9 | Árbol de decisión completo: diagrama de flujo con transiciones de estado |
| §10 | Trazabilidad: cada regla mapeada a su documento fuente |
| §11 | Verificación: todos los bugs conocidos (QB-01 a QB-08, F01-DG a F03-DG) mapeados contra el algoritmo |

---

# 4. Consecuencias

## 4.1 Impacto en la arquitectura

| Dimensión | Antes de este ADR | Después de este ADR |
|-----------|-------------------|---------------------|
| **Autoridad funcional** | Specification y ADRs como fuentes separadas sin jerarquía clara | CDA como autoridad funcional normativa, Specification como autoridad de base |
| **Criterio de aceptación de bugs** | Juicio subjetivo: "esto no debería pasar" | Juicio objetivo: "¿viola el paso N? ¿viola I-M?" |
| **Resolución de ambigüedades** | Ambigüedades entre Specification y código resueltas ad-hoc | Ambigüedades resueltas formalmente en el CDA (A01-DG, A02-DG) |
| **Pipeline de decisión** | Disperso en múltiples orquestadores | Formalizado en 11 pasos con condiciones explícitas |
| **Invariantes** | Implícitos o ausentes | 15 invariantes explícitos y verificables |

## 4.2 Relación con Architecture Freeze V3

Architecture Freeze V3 (ADR-012, Serie CE certificada) establece el modelo de inteligencia oficial:

```
Business Knowledge Engine → Deterministic Reasoning Layer → Groq → Gemini
```

El CDA **no modifica** este freeze. El CDA opera en un plano diferente:

| Plano | Freeze / Autoridad |
|-------|-------------------|
| **Modelo de inteligencia** (cómo se resuelve cada problema) | ADR-012 (Architecture Freeze V3) |
| **Algoritmo conversacional** (qué decisiones tomar y en qué orden) | ADR-013 (CDA) |

Ambos son complementarios. El CDA define el **qué** y el **cuándo** de las decisiones conversacionales. ADR-012 define el **cómo** (qué nivel de inteligencia usar para cada decisión).

## 4.3 Impacto en la implementación

Este ADR **no exige cambios inmediatos en el código**. El CDA es una especificación normativa que servirá como:

1. **Criterio de aceptación** para futuros cambios: todo cambio en el pipeline debe ser consistente con el CDA.
2. **Guía de corrección de bugs**: los bugs conocidos (F01-DG, F02-DG, F03-DG, QB-01 a QB-08) tienen ahora una definición precisa de cómo DEBE comportarse el sistema.
3. **Documento de diseño**: nuevos desarrolladores pueden entender el comportamiento esperado sin leer toda la base de código.
4. **Base para tests**: los invariantes I-01 a I-15 pueden convertirse en tests de regresión.

## 4.4 Impacto en la evolución futura

- Cualquier modificación del pipeline conversacional deberá ser primero modelada en el CDA y luego aprobada mediante ADR.
- Cualquier nuevo comportamiento que afecte las decisiones conversacionales (activación de ambigüedad, preservación de intención, merge de contexto) deberá ser consistente con los invariantes I-01 a I-15.
- Las auditorías futuras (QA4, QA5, etc.) usarán el CDA como referencia en lugar de solo la Specification.

---

# 5. Alcance

## 5.1 Incluido en el CDA

El CDA cubre el **pipeline conversacional completo** desde que un mensaje entra hasta que se genera una respuesta:

| Fase | Paso CDA | Invariantes |
|------|----------|-------------|
| Pre-procesamiento | 1-3: clasificación de mensaje, detección de estado, clasificación de intención | I-12 (una clasificación), I-13 (estado conversacional) |
| Actualización de contexto | 4-8: preservar intención, interpretar como delta, merge incremental | I-01 (integridad de slots), I-03 (merge correcto), I-04 (intención preservada), I-08 (contradicción) |
| Decisión | 9-10: activación de Ambiguity, validación de consistencia | I-05 (Ambiguity preserva contexto), I-11 (clarify_field), I-14 (autoridad única) |
| Generación de respuesta | 11: resolver siguiente acción | I-15 (respuesta respeta estado) |

## 5.2 Excluido del CDA

El CDA **no cubre**:

- **Estrategia conversacional** (tone, speed, responseLength) — gobernado por ADR-008 (StrategyDecision).
- **Modelo de inteligencia** (BKE, DRL, LLM) — gobernado por ADR-012.
- **Capa cognitiva futura** (Memory, Pattern Discovery) — gobernado por ADR-010, ADR-011.
- **Infraestructura** (deploy, observabilidad, seguridad) — gobernado por ROADMAP, H0A.
- **Casos de negocio específicos** (pricing, dispatch, geo) — gobernado por sus respectivos ADRs y specs.

## 5.3 Relación con QA3-S2B

El CDA resuelve las 3 desviaciones funcionales detectadas en QA3-S2B:

| Hallazgo | Estado | Resolución en CDA |
|----------|--------|-------------------|
| F01-DG | 🔴 Activo (bug) | §6 algoritmo `debeActivarAmbiguity`: clarificar_field + roleLock vacío = NO activar. §6 condiciones [1] y [4]. |
| F02-DG | 🔴 Activo (bug) | §7 tabla de evolución: prevIntent BOOKING + intent CONSULTA = BOOKING. Booking Floating para COMMERCIAL. |
| F03-DG | 🔴 Activo (bug) | §5 regla 1 (merge SIEMPRE se ejecuta). §2 paso 7 (actualizar contexto) obligatorio incluso si hay ambigüedad. |

Y las 2 ambigüedades de especificación:

| Ambigüedad | Resolución en CDA |
|------------|-------------------|
| A01-DG (cuándo preservar intención) | §7 tabla de evolución + Booking Floating |
| A02-DG (cuándo activar Ambiguity) | §6 algoritmo debeActivarAmbiguity |

---

# 6. Compatibilidad

## 6.1 ADR-007 (Conversation Interpreter)

El CDA **incorpora** el Conversation Interpreter como paso 2 del pipeline (clasificar tipo de mensaje). No modifica el diseño ni las responsabilidades del CI. La clasificación de mensajes (cancel, correction, greeting, etc.) sigue siendo la definida en ADR-007.

## 6.2 ADR-008 (Conversational Decision Architecture)

El CDA **complementa** ADR-008. Mientras ADR-008 establece la arquitectura de decisiones estratégicas (StrategyDecision), el CDA establece el algoritmo de decisiones conversacionales (cuándo activar Ambiguity, cuándo preservar intención, cómo mergear contexto). Ambos ADRs son compatibles y operan en planos diferentes:

- ADR-008: Decisiones **estratégicas** (tone, speed, qué campo preguntar).
- ADR-013: Decisiones **conversacionales** (cómo interpretar, cuándo actualizar, cuándo preservar).

## 6.3 ADR-012 (Cognitive Escalation Principle)

El CDA **no interfiere** con ADR-012. Las decisiones del CDA (activar Ambigüedad, extraer slots, mergear contexto) son prerrequisitos para que el modelo de inteligencia de ADR-012 opere. El CDA define qué necesita el sistema para decidir; ADR-012 define cómo ejecutar esa decisión (con BKE, DRL o LLM).

## 6.4 Functional Behavior Specification

El CDA mantiene una **relación de subordinación jerárquica** con la Specification:

| Aspecto | Specification | CDA |
|---------|---------------|-----|
| Rol | Autoridad funcional de base | Algoritmo normativo concreto |
| Define | QUÉ debe pasar | CÓMO decidir qué pasa |
| Ambigüedades | Puede contenerlas (A01-DG, A02-DG) | Las resuelve |
| Completitud | Describe comportamientos | Describe el algoritmo completo |
| Prevalencia | Base | Prevalece en caso de ambigüedad |

## 6.5 Conversation Playbook (AITOS LAB)

El CDA implementa los principios del Conversation Playbook como reglas algorítmicas. Por ejemplo:

| Principio Playbook | Implementación en CDA |
|--------------------|----------------------|
| "No preguntar lo que ya sabés" | §5 merge incremental preserva slots confirmados |
| "Preservar el hilo de la conversación" | §7 preservación de intención sobre baja confianza |
| "Responder al contexto, no al mensaje aislado" | §1 principio rector: "El contexto es la fuente de verdad" |

## 6.6 AITOS LAB Principles (P1-P10)

El CDA es consistente con los 10 principios AITOS LAB. Ver §10 del CDA para la trazabilidad completa.

---

# 7. Estado

**ACEPTADO** — 2026-07-17.

Este ADR ratifica el Conversation Decision Algorithm como autoridad funcional normativa. No requiere implementación inmediata.

## 7.1 Próximos pasos

El siguiente sprint (QA-3 Sprint 3) deberá implementar la **conformidad con el CDA**:

| Prioridad | Tarea | Hallazgo |
|-----------|-------|----------|
| P0 | Corregir Ambiguity sin verificar clarify_field | F01-DG |
| P0 | Corregir preservación de intención | F02-DG |
| P0 | Corregir merge bypass por ambigüedad | F03-DG |

Estos pasos están fuera del alcance de este ADR. Este ADR solo establece la autoridad normativa que guiará dichas correcciones.

---

*Fin de ADR-013 — Conversation Decision Algorithm Ratification*
