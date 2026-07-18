# H-CAT2-001 — RECOVERY: Loss of confirmed slots and repeated questions

| Campo | Valor |
|-------|-------|
| **ID** | H-CAT2-001 |
| **Fecha** | 2026-07-18 |
| **Campaña de origen** | CAT-2 — Context Persistence Acceptance Testing |
| **Severidad propuesta** | 🟡 Alta (viola 8 reglas de especificación + CDA, impacta experiencia de usuario directa) |
| **Estado** | `OPEN` |

---

## Tabla de Contenidos

1. [Conversación que lo evidencia](#1-conversación-que-lo-evidencia)
2. [Comportamiento observado](#2-comportamiento-observado)
3. [Comportamiento esperado](#3-comportamiento-esperado)
4. [RF violados](#4-rf-violados)
5. [RNF violados](#5-rnf-violados)
6. [Reglas del CDA violadas](#6-reglas-del-cda-violadas)
7. [Evidencia precisa (turnos)](#7-evidencia-precisa-turnos)
8. [Relación con defectos existentes (F01-DG, F02-DG, F03-DG)](#8-relación-con-defectos-existentes-f01-dg-f02-dg-f03-dg)
9. [Recomendación para integración en Sprint QA-3](#9-recomendación-para-integración-en-sprint-qa-3)

---

## 1. Conversación que lo evidencia

### Escenario CAT-2-04 (Intención preservada, slots perdidos)

```
👤 T1: quiero reservar un taxi del hotel al aeropuerto
🤖 BOT: Entendí que deseas reservar un taxi desde un hotel hasta el aeropuerto.
       ¿Cuál es el nombre del hotel desde donde deseas partir?

👤 T2: qué tipos de vehículos tienen?
🤖 BOT: [RECOVERY] Entendí que mencionaste "vehículos tienen".
       ¿A dónde necesitás ir?
       ⚠️ Perdió el destino (aeropuerto) durante RECOVERY

👤 T3: quiero seguir con la reserva
🤖 BOT: ¿Desde dónde salís?
       → Intención BOOKING preservada (confidence 0.9)
       → Origen y destino perdidos
```

### Escenario CAT-2-06 (Origen perdido y repreguntado)

```
👤 T1: hola
🤖 BOT: ¡Hola! Soy Cris Virtual... ¿En qué puedo ayudarte?

👤 T2: salgo del aeropuerto
🤖 BOT: ¿Me decís el destino exacto?   ✅ Pregunta destino (correcto)

👤 T3: voy al centro
🤖 BOT: Entendí que tu destino es el centro. ¿Qué te parece si te ayudo a
       encontrar un taxi para ir allí?
       ✅ NO pregunta origen de nuevo (comportamiento correcto)

👤 T4: somos 4
🤖 BOT: ¿Desde dónde salís?   ❌ PREGUNTA ORIGEN DE NUEVO
       → RECOVERY score=0.56
       → origin="aeropuerto" (T2) perdido

👤 T5: confirmo
🤖 BOT: ¿Desde dónde salís?   ❌ REPITE LA MISMA PREGUNTA
       → El slot de origen no se recuperó entre turnos
```

---

## 2. Comportamiento observado

Cuando el sistema entra en estado `RECOVERY` (comprehension score entre 0.40 y 0.64), **pierde los slots previamente confirmados** (origin, destination) y **repite preguntas** que el usuario ya respondió en turnos anteriores.

El patrón específico es:

1. El usuario proporciona `origin` y/o `destination` en turnos anteriores (T2, T3).
2. El usuario envía un mensaje que el CORE clasifica con baja confianza (score ~0.56), activando RECOVERY.
3. El sistema, en estado RECOVERY, trata los slots previamente confirmados como si estuvieran `open`.
4. El sistema pregunta por `origin` o `destination` como si nunca se hubieran proporcionado.
5. En turnos subsiguientes (T5), el sistema **repite la misma pregunta**, confirmando que el slot nunca se recuperó en el contexto de sesión.

**Importante**: La intención (`BOOKING`) SÍ se preserva correctamente a través de RECOVERY (observado en CAT-2-04: `confidence 0.9`). El problema es específico de los **slots** (origin, destination), no de la intención.

---

## 3. Comportamiento esperado

Según la especificación funcional y el CDA, cuando el sistema entra en RECOVERY debe:

| Comportamiento | Esperado |
|----------------|----------|
| Preservar slots confirmados | Origin y destination deben mantenerse en el contexto |
| No repetir preguntas | No preguntar "¿Desde dónde salís?" si ya se respondió |
| Interpretar mensaje como delta | "somos 4" debe actualizar `passengers=4`, no resetear `origin` |
| Solo RECOVERY de comprensión | El sistema puede pedir que repitan el mensaje, PERO sin perder datos previos |

**Ejemplo de respuesta esperada para CAT-2-06 T4:**

> "Disculpá, no entendí bien. Decime de nuevo cuántos pasajeros son. Recordá que tu viaje es desde *Aeropuerto IGR* hasta *Centro*."

La especificación §19 (Política de escalamiento) define RECOVERY como:
> **RECOVERY** (0.40-0.64): "Repreguntar, no ejecutar operaciones"

"Repreguntar" significa pedir al usuario que repita **el mensaje actual**, no preguntar **slots que ya se confirmaron en turnos anteriores**. La abstención es sobre **ejecución de operaciones**, no sobre preservación de datos.

---

## 4. RF violados

| RF | Texto | Línea en Spec | Evidencia |
|----|-------|---------------|-----------|
| **P2 — Preservar el contexto a toda costa** | "El sistema nunca debe 'olvidar' un slot que el usuario ya proporcionó." | §3 (líneas 237–241) | Origin (`aeropuerto`, T2 de CAT-2-06) olvidado en T4 |
| **P3 — No repetir preguntas** | "Si el usuario ya respondió una pregunta, el sistema no debe volver a preguntarla." | §3 (líneas 243–248) | "¿Desde dónde salís?" repetido en T4 y T5 de CAT-2-06 |
| **RF-09 — Actualización incremental de slots** | "El sistema nunca debe sobrescribir slots previos a menos que el mensaje actual contradiga explícitamente el valor anterior." | §13 (líneas 174–176) | Slot `origin` sobrescrito/eliminado sin contradicción del usuario |
| **§10 (Regla 5) — Gestión del contexto** | "El contexto se preserva incluso si el CORE clasifica el mensaje actual con baja confianza. Solo comandos explícitos (`.limpiar`) deben reiniciarlo." | §10 (línea 573) | RECOVERY (baja confianza) causó pérdida de contexto, equivalente a reinicio no autorizado |
| **§13 — Política de actualización incremental** | "Cada turno agrega información al estado existente. Nunca reemplaza el estado a menos que el nuevo mensaje contradiga explícitamente el valor anterior." | §13 (líneas 682–684) | El estado se reemplazó (origin perdió) sin contradicción explícita |
| **I-C1 — No perder contexto** | "El sistema nunca debe olvidar un slot que el usuario ya proporcionó. La única forma de perder contexto es el comando explícito `.limpiar` o una corrección del usuario." | §20 (líneas 988–992) | Origin se perdió sin `.limpiar` ni corrección |
| **I-C3 — No preguntar lo ya sabido** | "El sistema no debe preguntar por un campo que ya está CONFIRMED en el contexto de sesión." | §20 (líneas 998–1001) | Origin (`aeropuerto`) ya estaba en contexto, pero se preguntó igual |
| **VALIDACIÓN 1 — Preservación de contexto** | "DADO: usuario dice 'origen aeropuerto' en turno N, CUANDO: usuario dice 'destino hotel' en turno N+1, ENTONCES: el contexto debe tener BOTH origin='aeropuerto' AND destination='hotel'." | §25.6 (líneas 1672–1676) | Origin se perdió al procesar turno N+1 con RECOVERY |
| **VALIDACIÓN 3 — Sin repreguntas** | "DADO: usuario ya proporcionó destination, CUANDO: el sistema procesa el siguiente turno, ENTONCES: NO debe preguntar '¿A dónde querés ir?'." | §25.6 (líneas 1684–1688) | Destination preguntado de nuevo en CAT-2-04 T3 |

---

## 5. RNF violados

| RNF | Texto | Evidencia |
|-----|-------|-----------|
| **Estabilidad del estado conversacional** | El estado de la conversación no debe cambiar abruptamente por mensajes de baja confianza. | RECOVERY cambió el estado a "perder slots", violando la estabilidad esperada |
| **Recuperación sin pérdida de datos semánticos** | Al recuperarse de un estado de baja confianza, los datos semánticos (slots) deben preservarse. | Los slots se perdieron, y en turnos subsiguientes (T5) no se recuperaron |
| **Preservación de datos entre turnos independientemente del estado de comprensión** | El sistema debe mantener los datos conversacionales incluso cuando no entiende bien el mensaje actual. | Origin y destination no se preservaron al entrar en RECOVERY |

---

## 6. Reglas del CDA violadas

| Regla CDA | Texto | Evidencia |
|-----------|-------|-----------|
| **I-01 — NUNCA perder un slot confirmado** | "Un slot con status CONFIRMED no puede desaparecer del contexto sin intervención explícita del usuario." (§4) | Origin (`aeropuerto`) desapareció del contexto al entrar en RECOVERY |
| **I-02 — NUNCA volver a preguntar un dato confirmado** | "Si un slot está CONFIRMED, el sistema no debe preguntarlo en este turno ni en turnos futuros." (§4) | "¿Desde dónde salís?" se preguntó en T4 y T5 de CAT-2-06 |
| **I-03 — MERGE incremental, nunca reemplazo total** | "El contexto anterior NUNCA se descarta completamente al recibir un mensaje nuevo." (§4) | El contexto anterior (origin + destination) se descartó al procesar "somos 4" |
| **I-06 — UPDATE, no RESET, para cambios de datos** | "Cambiar un slot es una actualización incremental, no un reinicio de la conversación." (§4, §8) | RECOVERY actuó como un RESET PARCIAL no autorizado de slots |
| **§5 Regla 2 — Merge preserva slots no mencionados** | "SI el slot existe en Contexto(t) Y Delta NO menciona el slot → PRESERVAR: Contexto(t+1)[slot] = Contexto(t)[slot]" | Delta "somos 4" no menciona `origin` → debió preservarse. No se preservó. |
| **§5 Regla 5 — CONFIRMED solo cambia por contradicción explícita** | "SI el slot está CONFIRMED en Contexto(t): SOLO se modifica si hay contradicción explícita (regla 3)" | Origin no fue contradicho explícitamente por el usuario, pero se perdió |
| **§8 — Tabla de condiciones de RESET** | "Solo .limpiar, inactividad >48h, 'Cancelar', o 'No' en confirmación causan RESET." | RECOVERY no está listado como condición de RESET en ninguna tabla |
| **§2 Paso 7 — Actualizar contexto** | "Aplicar merge incremental: slots previos NO se tocan si no hay contradicción." (Paso 7, regla de obligatoriedad: ✅ Siempre se ejecuta) | El merge incremental no se ejecutó correctamente; slots previos se perdieron |

---

## 7. Evidencia precisa (turnos)

### CAT-2-06: Traza detallada

| Turno | Usuario | Sistema | Score | Estado slots | ¿Correcto? |
|-------|---------|---------|-------|-------------|------------|
| T1 | "hola" | Saludo, pregunta necesidad | — | — | ✅ |
| T2 | "salgo del aeropuerto" | Pregunta destino | — | `origin="aeropuerto"` | ✅ |
| T3 | "voy al centro" | Entiende destino. NO pregunta origen. | — | `origin="aeropuerto"`, `destination="centro"` | ✅ (P2, P3, I-C3 ok) |
| T4 | "somos 4" | **RECOVERY (score=0.56)**: "¿Desde dónde salís?" | 0.56 | `origin` perdido, `destination` perdido, `passengers` no extraído | ❌ I-C1, I-C3, P2, P3 violados |
| T5 | "confirmo" | "¿Desde dónde salís?" (repite) | — | `origin` sigue perdido | ❌ P3, I-02 violados (repregunta) |

### CAT-2-04: Traza detallada

| Turno | Usuario | Sistema | Score | Estado slots | ¿Correcto? |
|-------|---------|---------|-------|-------------|------------|
| T1 | "quiero reservar un taxi del hotel al aeropuerto" | Pregunta nombre del hotel | — | `origin="hotel"`, `destination="aeropuerto"` | ✅ |
| T2 | "qué tipos de vehículos tienen?" | **RECOVERY**: "¿A dónde necesitás ir?" | 0.56 | `destination` perdido, `origin` preservado temporalmente | ❌ Destination perdido |
| T3 | "quiero seguir con la reserva" | "¿Desde dónde salís?" | BOOKING 0.9 | `origin` perdido también | ❌ Ambos slots perdidos. Intención ✅ preservada. |

### Patrón de desviación

En ambos escenarios, el RECOVERY state (score ~0.56) activa un comportamiento donde:

1. El **comprehension scoring** interpreta `slotStability` como `open` para origin y destination.
2. El **field-resolver** detecta slots "faltantes" (porque RECOVERY los marcó como open).
3. El sistema **pregunta** por esos slots como si fueran nuevos.
4. La **intención** (BOOKING) SÍ se preserva — el problema es exclusivo de los slots.

### Causa técnica probable

El RECOVERY state afecta al componente de **comprehension scoring** que evalúa `slotStability`. Al obtener un score < 0.65, el sistema reinterpreta los slots existentes como "no confiables" o "open", en lugar de preservar su estado previo. Esto sugiere que:

- El RECOVERY state **no consulta el contexto de sesión** antes de determinar qué slots están "open".
- O bien, el RECOVERY state **sobrescribe el slotStability** con un cálculo independiente que ignora los slots ya confirmados.
- El componente de **merge contextual** (definido en CDA §5) no se ejecuta o es bypassado durante RECOVERY.

---

## 8. Relación con defectos existentes (F01-DG, F02-DG, F03-DG)

### 8.1 Descripción de los defectos existentes

| ID | Descripción | Componente | Severidad |
|----|-------------|-----------|-----------|
| **F01-DG** | Ambigüedad activada sin verificar `clarify_field`. El sistema activa `startAmbiguityResolution` sin comprobar si el usuario está respondiendo a una pregunta directa del sistema. | `lead.service.ts:203` | 🔴 Bloqueante |
| **F02-DG** | Intención no preservada contextualmente. `core.ts:277-283` solo preserva `prevIntent` cuando `intent === "PRE_BOOKING"`, pero no cuando intent es CONSULTA/AMBIGUOUS sobre BOOKING. | `core.ts:277-283` | 🟡 Estructural |
| **F03-DG** | Merge de slots no ejecutado por bypass de ambigüedad. `startAmbiguityResolution` retorna `true` → `lead.service.ts:206` hace `return` → el pipeline de extracción nunca se ejecuta. | `lead.service.ts:206` | 🟡 Estructural |

### 8.2 Causa raíz de cada defecto

| Defecto | Causa raíz específica | Mecanismo |
|---------|----------------------|-----------|
| **F01-DG** | Falta guard condicional de `clarify_field` + `roleLock` antes de activar ambigüedad | Pipeline bypass: ambiguity activation |
| **F02-DG** | Regla de preservación de intención limitada a PRE_BOOKING (no cubre CONSULTA/AMBIGUOUS) | Clasificación: intent preservation rule |
| **F03-DG** | `return` temprano en lead.service.ts corta el pipeline antes de `runExtractionPipeline` | Pipeline bypass: early return |
| **H-CAT2-001** | RECOVERY state (score bajo) reinterpreta slots como "open", ignorando contexto de sesión previo | Comprehension scoring: slotStability recalculation |

### 8.3 Análisis de causa raíz compartida

**¿Comparten causa raíz?**

**NO.** Las causas raíz son diferentes tanto en el componente afectado como en el mecanismo:

| Dimensión | F01/F02/F03-DG | H-CAT2-001 |
|-----------|----------------|-------------|
| **Estado gatillo** | `location_ambiguous:true` en facts del CORE | `comprehension score` entre 0.40-0.64 (RECOVERY) |
| **Componente afectado** | Ambiguity handler, lead.service.ts, core.ts | Comprehension scoring / slot stability |
| **Mecanismo de pérdida** | Ambiguity se activa incorrectamente y corta el pipeline (bypass) | RECOVERY recalcula slotStability como "open" |
| **Qué se pierde** | El mensaje actual no se fusiona (F03-DG) | Slots previos confirmados se descartan |
| **Intención** | Se pierde (F02-DG) por regla incompleta | Se preserva correctamente (✅ observado) |
| **Slots** | No se agrega el nuevo valor (F03-DG) | Los existentes se eliminan |
| **Fix conceptual** | Agregar guard de clarify_field, extender regla de preservación, permitir merge post-ambiguity | RECOVERY debe preservar slots previos y solo repreguntar el mensaje actual |

### 8.4 Riesgo de duplicación de trabajo

**Riesgo BAJO** de duplicación.

Los fixes de F01/F02/F03-DG (planificados como QA3-S3-01, QA3-S3-02, QA3-S3-03) abordan el flujo de ambigüedad. No cubren el flujo de RECOVERY porque:

1. **QA3-S3-01 (F01-DG)**: Agregar guard de `clarify_field` en `lead.service.ts:203`. Esto previene ambigüedad incorrecta, pero no evita que RECOVERY pierda slots — son flujos ortogonales.

2. **QA3-S3-02 (F02-DG)**: Extender regla de preservación de intención en `core.ts`. H-CAT2-001 ya preserva intención correctamente — el fix no aporta al problema de slots.

3. **QA3-S3-03 (F03-DG)**: Permitir merge post-ambiguity. No aplica a RECOVERY porque el bypass es diferente: en RECOVERY no hay `startAmbiguityResolution`, hay un recalculo de slotStability que ocurre en el comprehension scoring, no en el ambiguity handler.

### 8.5 Patrón común de alto nivel (no causal)

Aunque las causas raíz son diferentes, existe un **patrón común** en el nivel más abstracto:

> **"El sistema no integra el contexto de sesión previo (slots confirmados, clarify_field, intención) al evaluar el mensaje actual cuando se encuentra en un estado no-normal (ambigüedad, RECOVERY)."**

Sin embargo, este patrón se manifiesta a través de **mecanismos independientes** en cada caso:
- En ambigüedad: el pipeline se corta antes del merge
- En RECOVERY: el scoring recalcula slotStability sin considerar el contexto de sesión

Esto significa que una solución arquitectónica general (ej. "context-preserving pipeline layer") podría potencialmente cubrir ambos casos, pero los fixes específicos son distintos y requieren implementación separada.

---

## 9. Recomendación para integración en Sprint QA-3

### Decisión

**H-CAT2-001 NO comparte causa raíz con F01/F02/F03-DG.** Por lo tanto, no se debe fusionar como sub-tarea de QA3-S3-01/02/03 existentes.

### Riesgo

Si H-CAT2-001 NO se agenda como tarea separada, queda:
- Sin responsable asignado
- Sin seguimiento en el sprint
- Sin trazabilidad de resolución

Esto implica que el defecto podría persistir en producción incluso después de resolver F01/F02/F03-DG.

### Recomendación

| Acción | Recomendación | Justificación |
|--------|---------------|---------------|
| Registrar en PROJECT_BOARD | ✅ Sí, como tarea separada | Causa raíz independiente. No hay duplicación con tareas existentes. |
| Prioridad sugerida | **P1** (Alta) | Viola P2, P3, I-C1, I-C3 — principios fundamentales. Impacta directamente la experiencia del usuario en ~33% de los escenarios RECOVERY. |
| Sprint | QA-3 Sprint 3 (o Sprint 4 si no alcanza) | Comparte el mismo bloque de trabajo de "context preservation" pero requiere implementación específica. |
| Dependencia | Ninguna con QA3-S3-01/02/03 | Los fixes de ambigüedad y RECOVERY son ortogonales. Pueden implementarse en paralelo. |
| Fix conceptual | El RECOVERY state debe consultar el contexto de sesión (`chat_sessions.slots`) ANTES de determinar slotStability. Los slots existentes deben preservarse incluso con score bajo. Solo el mensaje actual debe ser "repreguntado". | Ver CDA §2 (Paso 3: Cargar contexto confirmado) y §5 Regla 2 (preservar slots no mencionados). |

### Riesgo de no accionar

| Escenario | Impacto |
|-----------|---------|
| Usuario da origen, pregunta algo no relacionado, RECOVERY se activa | Usuario ve "¿Desde dónde salís?" — frustración / abandono |
| Usuario da datos parciales, RECOVERY se activa | Slots perdidos → ciclo de repreguntas → usuario se queja "ya te dije" |
| CAT-2-06 (caso real) | El bot preguntó origen en 2 turnos consecutivos (T4 y T5) después de que el usuario ya lo había dado en T2 |

---

## Appendix A: Reglas de especificación que NO tienen excepción para RECOVERY

La especificación funcional NO establece ninguna excepción para el estado RECOVERY en las siguientes reglas:

| Regla | ¿Excepción para RECOVERY? |
|-------|--------------------------|
| P2 — Preservar contexto | ❌ No. Es incondicional. |
| P3 — No repetir preguntas | ❌ No. Es incondicional. |
| RF-09 — Actualización incremental | ❌ No. Nunca sobrescribir sin contradicción explícita. |
| §10 Regla 5 — Contexto con baja confianza | ❌ No. Explícitamente dice "incluso si el CORE clasifica con baja confianza". |
| I-C1 — No perder contexto | ❌ No. Solo `.limpiar` o corrección del usuario. |
| I-C3 — No preguntar lo ya sabido | ❌ No. Es incondicional. |
| CDA I-01 — No perder slot confirmado | ❌ No. Es incondicional. |
| CDA I-02 — No preguntar dato confirmado | ❌ No. Es incondicional. |
| CDA I-06 — UPDATE no RESET | ❌ No. RECOVERY no está en la tabla de condiciones de RESET (§8). |
| CDA §5 Regla 2 — Preservar slots no mencionados | ❌ No. Es incondicional. |

La especificación define RECOVERY como "Repreguntar, no ejecutar operaciones" (§19). "Repreguntar" se refiere al **mensaje actual**, no a slots previos. La abstención es sobre **ejecución**, no sobre preservación de datos.

---

*Documento generado por ARNÉS — Mission Planner / Strategic Director Layer. Defecto funcional H-CAT2-001. Estado: OPEN. Sin implementación de código.*
