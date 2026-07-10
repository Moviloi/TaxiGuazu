# AITOS-E13 — Adaptive Conversation Policy Audit
## 2026-07-08 | Read-Only Analysis

---

## Índice

1. [Estado actual](#1-estado-actual)
2. [Matriz de influencia](#2-matriz-de-influencia)
3. [Jerarquía de señales](#3-jerarquía-de-señales)
4. [Conflictos detectados](#4-conflictos-detectados)
5. [Modos de comportamiento](#5-modos-de-comportamiento)
6. [Riesgos de complejidad](#6-riesgos-de-complejidad)
7. [Modelo de decisión propuesto](#7-modelo-de-decisión-propuesto)
8. [Cambios mínimos recomendados](#8-cambios-mínimos-recomendados)
9. [Relación con Etapa 1](#9-relación-con-etapa-1)
10. [Recomendación arquitectónica](#10-recomendación-arquitectónica)
11. [Pregunta final](#11-pregunta-final)

---

## 1. Estado actual

### 1.1 Policies existentes

| Policy | Existe | Propósito |
|---|---|---|
| `policy-ahora.ts` | ✅ | Ejecución inmediata, sin estado |
| `policy-reserva.ts` | ✅ | Flujos multi-step, STATEFUL |
| `policy-consulta.ts` | ❌ **No existe** | El intent CONSULTA cae en CLARIFY genérico |
| `policy-pipeline.ts` | ✅ | Orquestación de efectos secundarios |

### 1.2 Decisiones por clasificación

| Clasificación | policy-ahora | policy-reserva | router | field-resolver |
|---|---|---|---|---|
| **Operativas** | 4 branches | 6 branches | 5 mappings | 0 |
| **Comerciales** | 1 branch | 2 branches | 2 mappings | 0 |
| **UX** | 1 branch | 3 branches | 1 mapping | 0 |
| **Seguridad** | 3 branches | 3 branches | 2 mappings | 0 |
| **Cont. Conversacional** | 4 branches | 8 branches | 3 mappings | 14 prioridades |

### 1.3 Señales que entran a Policy hoy

```
HandlerContext
├── intent              → Router + Policy (determina outputType + branches laterales)
├── decision            → Policy (EXECUTE/ANSWER/CLARIFY/SAFE_FALLBACK)
├── mode                → Policy (AHORA/RESERVA)
├── confidence          → Router (threshold 0.4)
│
├── purchaseIntent      → Observable en Policy, gate LLM en handler
├── urgency             → Observable en Policy + booking_urgent input
├── messageType         → Cancel detection + isCorrection
├── clientObjective     → booking_urgent skip + inquiry_price guard (E12)
│
├── facts               → field-resolver + affirmation detection
├── extraction.slots    → StableAcknowledge + confirmación
├── extraction.tariff   → Price info + booking accepted
├── extraction.conversationalState → branching condicional
├── extraction.clarifyField → CLARIFY branch
├── extraction.roleLock → StableAcknowledge condition
├── extraction.slotStability → StableAcknowledge condition
│
├── domain              → Determina domain policy
├── operationalMode     → Domain calculation
└── lang                → i18n
```

### 1.4 Observaciones críticas del estado actual

**a)** `CONSULTA` no tiene política propia — cae en CLARIFY genérico. El sistema no diferencia una consulta de información de una ambigüedad real. Esto es particularmente relevante porque el intent CONSULTA existe como tipo en core.ts pero no tiene tratamiento especializado.

**b)** purchaseIntent solo se usa para gatear LLM (handler.ts) y como input de clientObjective. No modifica comportamiento de Policy directamente (solo a través de clientObjective).

**c)** urgency es observable pero no modifica comportamiento de Policy directamente — solo influye a través de clientObjective (booking_urgent).

**d)** No hay prioridad explícita entre señales. Si intent=BOOKING y clientObjective=inquiry_price, cada branch decide por su cuenta qué prevalece.

**e)** policy-reserva tiene 14 ramas condicionales comparado con 7 de policy-ahora. La complejidad del flujo stateful es 2× la del flujo stateless.

---

## 2. Matriz de influencia

### 2.1 Señales → ¿Debe modificar?

| Señal | Modifica Policy actualmente | Debería modificar | Peso | Motivo |
|---|---|---|---|---|
| **intent** | ✅ Sí (router entero + branches laterales) | Sí | **MÁXIMO** | Determina el tipo de acción (book, info, emergency). Es la señal fundacional. |
| **decision (outputType)** | ✅ Sí (switch principal en ambas policies) | Sí | **MÁXIMO** | Rama principal del flujo. |
| **clientObjective** | ⚠️ Parcial (2 de 9 valores usados) | Sí | **ALTO** | Sintetiza la intención real del pasajero. Debería modular el comportamiento sobre intent cuando hay conflicto. |
| **confidence** | ⚠️ Solo router (< 0.4 → SAFE_FALLBACK) | Sí | **ALTO** | Debería modular qué tan propositivo es el sistema. Baja confianza = menos acción, más clarificación. |
| **messageType** | ✅ Cancel detection + isCorrection | Sí | **MEDIO** | Define el rol del mensaje actual. Cancel y correction ya se usan. Confirmation y clarification podrían usarse más. |
| **purchaseIntent** | ❌ No directamente (solo LLM gate) | Sí | **MEDIO** | Debería modular la velocidad de cierre (high = cerrar rápido, low = no presionar). |
| **urgency** | ❌ No directamente (solo booking_urgent input) | Sí | **MEDIO** | Debería modular tono (directo si urgente, pausado si no). |
| **conversationalState** | ✅ Sí (policy-reserva entera depende de esto) | Sí | **ALTO** | Es el estado del workflow. Determina en qué punto del flujo estamos. |
| **facts** | ✅ field-resolver + affirmation | Sí | **MEDIO** | Señales específicas (affirmation, location_ambiguous). |
| **slotStability** | ✅ StableAcknowledge | Sí | **BAJO** | Ayuda a decidir si acknowledge o clarify. |
| **history** | ❌ No usado en Policy | No aún | **BAJO** | Podría usarse para detectar patrones (ej: 3 clarifications seguidas = cambiar estrategia). |
| **lang** | ✅ i18n en respuestas | Sí | **BAJO** | Solo afecta el texto, no la estrategia. |

### 2.2 Pesos relativos

```
ALTO (determina flujo)
├── intent
├── decision (outputType)
├── clientObjective
├── confidence
└── conversationalState

MEDIO (modula tono/velocidad)
├── purchaseIntent
├── urgency
├── facts (affirmation, location_ambiguous)
└── messageType

BAJO (refinamiento)
├── slotStability
├── history
└── lang
```

### 2.3 Las señales NO tienen el mismo peso

La arquitectura actual las trata como si todas entraran al mismo nivel en `HandlerContext`. Esto es el problema central: **no hay jerarquía de decisión**.

---

## 3. Jerarquía de señales

### 3.1 Propuesta de prioridad para resolución de conflictos

```
1. SEGURIDAD (intent=EMERGENCY + confidence < 0.4)
   ↓
2. ESTADO (conversationalState + messageType)
   ↓
3. OBJETIVO (clientObjective + purchaseIntent)
   ↓
4. CONTEXTO (urgency + facts + slotStability)
   ↓
5. EJECUCIÓN (decision + mode)
   ↓
6. UX (lang + history)
```

### 3.2 Reglas de prioridad

| Prioridad | Regla | Ejemplo |
|---|---|---|
| **1a** | Seguridad siempre prevalece | Intent=EMERGENCY → siempre EXECUTE + adminNotify, incluso si purchaseIntent=low |
| **1b** | Confianza < 0.4 → SAFE_FALLBACK, incluso si todo lo demás dice EXECUTE | El sistema no sabe qué hacer |
| **2a** | conversationalState = awaiting_confirmation → esperar afirmación, no cambiar de tema | No importa qué señales nuevas lleguen |
| **2b** | messageType = correction → preservar estado, no resetear | Incluso si clientObjective cambió |
| **2c** | messageType = cancel → cortar flujo, responder cancelación | Incluso si el intent es BOOKING |
| **3a** | clientObjective override intent en conflicto comercial | booking_urgent > BOOKING normal, inquiry_price > BOOKING |
| **3b** | purchaseIntent modula velocidad (no dirección) | high = cerrar rápido, low = no presionar |
| **4a** | urgency modula tono (no dirección) | alta = directo, baja = pausado |
| **4b** | facts location_ambiguous pueden forzar CLARIFY incluso en EXECUTE | Ya implementado |
| **5** | decision + mode determinan qué policy ejecuta | AHORA o RESERVA |
| **6** | lang y history solo afectan texto | No cambian decisiones |

---

## 4. Conflictos detectados

### 4.1 Caso A — Intent=BOOKING, clientObjective=inquiry_price

**Situación**: El router dice EXECUTE (por intent=BOOKING), pero clientObjective dice "solo pregunta precio".

**Hoy**: 
- policy-reserva EXECUTE intenta resolver campos para booking
- El guard E12 inhibe affirmation→booking_accepted
- Pero el resto del flujo EXECUTE sigue intentando colectar campos

**Riesgo**: El sistema pregunta "¿cuántos pasajeros?" a alguien que solo preguntó precio.

**Recomendación**: Si clientObjective=inquiry_price, el sistema debería comportarse como ANSWER incluso si el router dijo EXECUTE. clientObjective debería poder **rebajar** el outputType de EXECUTE a ANSWER.

### 4.2 Caso B — intent=INFORMATIONAL/CONSULTA, urgency=HIGH

**Situación**: El usuario pregunta información pero con urgencia ("necesito saber YA el horario").

**Hoy**: 
- Router → ANSWER
- Policy → respuesta informativa genérica (con saludo, etc.)
- Urgency no modifica nada en este path

**Riesgo**: El usuario urgente recibe una respuesta pausada con saludo.

**Recomendación**: Si urgency=HIGH + ANSWER, el sistema debería:
1. Omitir el saludo
2. Responder directamente sin rodeos
3. Preguntar si quiere proceder a booking

### 4.3 Caso C — purchaseIntent=LOW, clientObjective=trust_check

**Situación**: purchaseIntent=LOW bloquea LLM (handler.ts:129), pero trust_check necesita LLM para dar respuesta detallada de confianza.

**Hoy**: 
- handler.ts: `const skipLLM = isLowIntent;` → no se llama al LLM
- Policy retorna template genérico
- trust_check no puede dar respuesta elaborada

**Riesgo**: El pasajero que pregunta "son confiables?" recibe un template genérico sin personalización.

**Recomendación**: clientObjective=trust_check debería sobreescribir purchaseIntent=LOW para el LLM gate. Confianza es un caso especial que merece LLM incluso para low-intent.

### 4.4 Caso D — messageType=correction, conversationalState=booking_confirmed

**Situación**: El usuario corrige un slot después de haber confirmado el booking.

**Hoy**: 
- correction solo loggea y fall through
- extraction pipeline maneja la corrección upstream
- conversationalState sigue siendo booking_confirmed

**Riesgo**: El sistema contradice al usuario ("pero ya confirmaste") o continúa con datos incorrectos.

**Recomendación**: correction debería degradar el estado a collecting_slots para el campo afectado. No un reset completo, pero sí permitir re-colección del slot corregido.

### 4.5 Caso E — clientObjective=booking_urgent + confidence=0.3

**Situación**: Alta urgencia pero baja confianza del sistema.

**Hoy**: 
- Router: confidence < 0.4 → SAFE_FALLBACK (prioridad máxima)
- booking_urgent se pierde

**Riesgo**: Un pasajero que dice "YA, urgente, aeropuerto al centro" recibe "no pude procesar eso" porque el sistema no entendió bien.

**Recomendación**: Si clientObjective=booking_urgent, el threshold de confianza debería relajarse (ej: 0.25 en vez de 0.4) para SAFE_FALLBACK. La urgencia justifica más tolerancia a la ambigüedad.

---

## 5. Modos de comportamiento

### 5.1 Modos actuales (implícitos)

AITOS hoy tiene **7 modos de comportamiento** que emergen de combinaciones de señales, no de una selección explícita:

| Modo | Señales clave | Comportamiento | ¿Explícito? |
|---|---|---|---|
| **Explorar** | intent=INFORMATIONAL/COMMERCIAL/CONSULTA, clientObjective=info_request/inquiry_price/comparing_options | Responde información, NO recolecta slots, NO presiona booking | ❌ Implícito |
| **Guiar** | decision=CLARIFY, conversationalState=collecting_slots | Pregunta un campo a la vez, respeta prioridad field-resolver | ❌ Implícito |
| **Confirmar** | extraction.askForConfirmation=true, conversationalState=awaiting_confirmation/awaiting_passenger | Muestra resumen, espera afirmación, bloquea otras acciones | ❌ Implícito |
| **Resolver** | decision=EXECUTE, conversationalState!=awaiting_* | Ejecuta dispatch o booking, NO preguntas adicionales | ❌ Implícito |
| **Corregir** | messageType=correction o isCorrection=true | Preserva contexto, permite recolección de slot corregido | ❌ Implícito |
| **Cerrar** | messageType=cancel, intent=POST_SERVICE | Responde cancelación o post-servicio, termina flujo | ❌ Implícito |
| **Recuperar** | decision=SAFE_FALLBACK | Admite error, ofrece asistencia humana | ❌ Implícito |

### 5.2 ¿AITOS realmente cambia de comportamiento?

**Sí, pero implícitamente.** AITOS cambia de comportamiento según la combinación de señales, pero no hay un selector de modo explícito. El comportamiento emerge de:

```
intent → router → outputType → policy switch → branches condicionales
                                                      ↓
                                          estado + señales + facts
```

Cada branch implementa un modo sin nombrarlo. Esto hace que:
- Sea difícil predecir el comportamiento ante nuevas combinaciones de señales
- No haya un lugar central donde se decida "qué modo estamos ejecutando"
- La lógica está distribuida: router decide outputType, policy decide branch, handler decide LLM gate

### 5.3 ¿Cambia la respuesta o la estrategia?

**Hoy: cambia la respuesta.** El modo emerge de las condiciones, no es una decisión estratégica. La diferencia es sutil pero crítica:

- **Respuesta**: El template cambia (EXECUTE vs ANSWER vs CLARIFY)
- **Estrategia**: La intención comunicativa cambia (explorar vs resolver vs confirmar)

Hoy AITOS produce respuestas correctas para cada combinación de señales, pero **no tiene una estrategia conversacional explícita**. El "qué queremos lograr en este turno" no está formalizado.

---

## 6. Riesgos de complejidad

### 6.1 Explosión de if/else

Cada nueva señal agregada a HandlerContext multiplica las combinaciones posibles:

```
Señales actuales: intent × decision × clientObjective × purchaseIntent × urgency
                                         × messageType × confidence × conversationalState
                                         × facts × slotStability

Combinaciones: ~11 intents × 4 decisions × 9 objectives × 3 purchaseIntents × 3 urgencies
                                × 12 messageTypes × 2 confidence thresholds × 7 states

= ~11 × 4 × 9 × 3 × 3 × 12 × 2 × 7 = ~1.8M combinaciones
```

El sistema actual **no evalúa 1.8M combinaciones** porque muchas son mutuamente excluyentes. Pero el riesgo es que sin una jerarquía explícita, cada nuevo feature agregue condiciones en 3-4 lugares distintos.

### 6.2 Duplicación de lógica

Hoy:
- Cancel detection está en ambas policies (policy-ahora:77, policy-reserva:143)
- Correction handling está en ambas (policy-ahora no tiene, policy-reserva:151)
- EMERGENCY/RESCHEDULE admin notify está en ambas
- El mismo pattern de `resolveNextRequiredField` está en 4 lugares (policy-ahora CLARIFY, policy-ahora EXECUTE, policy-reserva CLARIFY, policy-reserva EXECUTE)

### 6.3 Conflictos entre Policies

policy-pipeline.ts tiene su propio flujo de decisiones que **corre antes** que handler.ts/policy. Si policy-pipeline decide DISPATCH, handler nunca se ejecuta. Si no, handler + policy deciden. Esto significa que hay **dos capas de decisión** con lógica superpuesta.

### 6.4 Pérdida de mantenibilidad

El archivo `policy-reserva.ts` tiene 495 líneas con 14 ramas. Agregar una nueva señal implica modificar múltiples branches. Sin una jerarquía explícita, el riesgo de regresiones aumenta con cada señal.

---

## 7. Modelo de decisión propuesto

### 7.1 Arquitectura actual (plana)

```
HandlerContext (señales planas, sin jerarquía)
    ↓
handler.ts (enriquece, gated LLM)
    ↓
policy-ahora / policy-reserva (if/else sobre señales planas)
```

### 7.2 Arquitectura propuesta

```
HandlerContext (señales crudas)
    ↓
Conversation Strategy Layer (NUEVA)
    ├── Resuelve conflictos entre señales (jerarquía)
    ├── Selecciona modo explícito (Explorar | Guiar | Confirmar | Resolver | Corregir | Cerrar | Recuperar)
    └── Produce StrategyContext { mode, tone, speed, priority }
        ↓
Policy (usa StrategyContext para elegir rama)
    ├── Ya no evalúa señales sueltas
    ├── Usa mode + state para decidir
    └── Menos if/else, más tablas de decisión
        ↓
LLM (modulación fina de tono)
```

### 7.3 ¿Agrega valor o es sobreingeniería?

**Agrega valor porque:**
1. **Resuelve conflictos en un solo lugar** — No más condiciones duplicadas en 4 branches
2. **Hace explícito el modo** — Se puede loggear, testear y auditar
3. **Reduce el espacio de decisión** — De 1.8M combinaciones a 7 modos × N estados
4. **Protege contra regresiones** — Agregar una señal nueva no requiere modificar N branches

**No agrega valor si:**
1. Se implementa como otra capa con if/else tan complejos como los actuales
2. Se convierte en un "router de modos" que solo duplica la lógica existente

### 7.4 Implementación mínima

No crear una clase separada ni un archivo enorme. La "Conversation Strategy Layer" puede ser una función pura de ~60 líneas que tome HandlerContext y devuelva `{ mode, tone, speed }`:

```typescript
type ConversationMode = "explore" | "guide" | "confirm" | "resolve" | "correct" | "close" | "recover";
type Tone = "direct" | "warm" | "emergent" | "apologetic";
type Speed = "fast" | "normal" | "paused";

interface StrategyDecision {
  mode: ConversationMode;
  tone: Tone;
  speed: Speed;
  priority: string[];
}
```

Esta capa viviría en `handler.ts` o en un nuevo `conversation-strategy.ts` y se llamaría **antes** de `buildDomainPolicy`.

---

## 8. Cambios mínimos recomendados

### 8.1 Prioritarios (bajo esfuerzo, alto impacto)

| # | Cambio | Archivo | Esfuerzo | Impacto |
|---|---|---|---|---|
| **1** | clientObjective=inquiry_price debe rebajar outputType EXECUTE→ANSWER | router.ts | Bajo (~3L) | **Alto**: Evita preguntar slots a quien solo preguntó precio |
| **2** | clientObjective=trust_check debe pasar el LLM gate aunque purchaseIntent=low | handler.ts | Bajo (~3L) | **Alto**: Respuesta de confianza necesita LLM |
| **3** | urgency=HIGH debe omitir saludo en ANSWER + reducir preguntas | policy-ahora.ts | Bajo (~5L) | **Medio**: Usuario urgente recibe respuesta directa |
| **4** | clientObjective=booking_urgent debe relajar threshold confidence para SAFE_FALLBACK | router.ts | Bajo (~3L) | **Medio**: Urgencia tolera más ambigüedad |

### 8.2 Mediano plazo (esfuerzo medio)

| # | Cambio | Archivo | Esfuerzo | Impacto |
|---|---|---|---|---|
| **5** | messageType=correction debe degradar conversationalState a collecting_slots para el campo afectado | policy-reserva.ts o handler.ts | Medio (~15L) | **Alto**: Corrección no contradice estado actual |
| **6** | Agregar ConversationMode selector como función pura | `conversation-strategy.ts` (nuevo) | Medio (~60L) | **Alto**: Unifica la jerarquía de decisión |
| **7** | Unificar cancel detection en handler.ts en vez de ambas policies | handler.ts + policies | Bajo (~10L) | **Medio**: Elimina duplicación |
| **8** | Unificar EMERGENCY/RESCHEDULE admin notify en handler.ts | handler.ts + policies | Bajo (~10L) | **Medio**: Elimina duplicación |

### 8.3 Largo plazo (esfuerzo alto)

| # | Cambio | Archivo | Esfuerzo | Impacto |
|---|---|---|---|---|
| **9** | Tabla de decisión centralizada para field-resolver con prioridades moduladas por clientObjective | field-resolver.ts | Medio (~30L) | **Alto**: booking_urgent no pregunta scheduled_at |
| **10** | Policy para CONSULTA (hoy no existe) | `policy-consulta.ts` (nuevo) | Medio (~40L) | **Medio**: Consultas de información tienen path dedicado |

### 8.4 Orden recomendado

```
Fase 1: Cambios 1-4 (bajo esfuerzo, corrigen conflictos inmediatos)
Fase 2: Cambios 6-8 (conversation-strategy + unificación)
Fase 3: Cambios 5, 9 (mejora corrección + field-resolver)
Fase 4: Cambio 10 (policy-consulta)
```

---

## 9. Relación con Etapa 1

### 9.1 Principios Conversacionales (Etapa 1)

La Etapa 1 definió principios que esta auditoría refuerza:

| Principio | Cómo lo refuerza E13 |
|---|---|
| **El pasajero es el producto** | clientObjective pone al pasajero en el centro de la decisión |
| **La arquitectura es infraestructura** | Conversation Strategy Layer no es un fin en sí mismo, es un medio para reducir complejidad |
| **Decisiones deterministas** | La jerarquía de señales debe ser determinista (if/else sobre modos, no LLM eligiendo modo) |
| **Policy es la fuente de verdad** | El Conversation Mode NO reemplaza a Policy, la alimenta |

### 9.2 Lo que cambia

| Antes | Después |
|---|---|
| Señales planas en HandlerContext | Jerarquía con resolución de conflictos |
| Modos implícitos en branches | Modo explícito seleccionado |
| Cada branch decide prioridad | Prioridad centralizada |
| purchaseIntent solo gatea LLM | purchaseIntent modula velocidad de cierre |
| clientObjective afecta 2 branches | clientObjective afecta outputType + tone + speed |

### 9.3 Lo que NO cambia
- Policy sigue siendo la única fuente de finalResponse
- Las decisiones siguen siendo deterministas (sin LLM en la estrategia)
- No se crean nuevos intents
- No se crean nuevas tablas

---

## 10. Recomendación arquitectónica

### 10.1 Veredicto

**Sí, una capa de Conversation Strategy agrega valor**, pero debe ser **mínima**:

- Una función pura de ~60 líneas (no una clase, no un servicio)
- Sin estado propio (usa HandlerContext como input)
- Sin dependencias externas
- Que produzca `StrategyDecision { mode, tone, speed }`
- Que se llame en handler.ts **antes** de buildDomainPolicy

No es una "capa" en el sentido tradicional. Es un **selector de modo** que reemplaza la evaluación implícita de señales por una explícita.

### 10.2 Lo que NO hacer

- ❌ No crear un ConversationModeManager con estado mutable
- ❌ No agregar una tabla en DB para modos
- ❌ No hacer que el LLM decida el modo
- ❌ No crear un router de modos con más if/else que las policies actuales

### 10.3 Lo que SÍ hacer

- ✅ Una función pura `computeStrategy(ctx: HandlerContext): StrategyDecision`
- ✅ Llamarla en handler.ts después de enriquecer ctx
- ✅ Pasar `StrategyDecision` a buildDomainPolicy en vez de señales sueltas
- ✅ Loggear el modo seleccionado para trazabilidad
- ✅ Que las policies usen `strategy.mode` en vez de evaluar combinaciones

### 10.4 Efecto esperado

| Métrica | Hoy | Con Strategy Layer |
|---|---|---|
| Líneas de policy-ahora.ts | 140 | ~100 (menos branches) |
| Líneas de policy-reserva.ts | 495 | ~350 (menos duplicación) |
| Condicionales en policies | ~25 | ~15 (modo + estado) |
| Tiempo para diagnosticar un bug | Alto | Bajo (modo loggeado) |
| Agregar nueva señal | Modificar N branches | Modificar computeStrategy + 1 branch |

---

## 11. Pregunta final

### "¿Qué debe cambiar primero cuando AITOS entiende mejor al cliente: la respuesta o la estrategia?"

**Debe cambiar la estrategia primero.** Siempre.

Si AITOS entiende que el pasajero solo pregunta precio (inquiry_price), cambiar la respuesta de "¿cuántos pasajeros?" a "el precio es $X" no es suficiente — la estrategia debe cambiar de "recolectar datos para booking" a "informar sin presionar". Si la estrategia no cambia, el sistema sigue en modo "recolectar" y solo cambia el template, lo que genera contradicciones (pregunta pasajeros pero da precio).

**La respuesta es consecuencia de la estrategia, no al revés.**

Ejemplo concreto del caso A (intent=BOOKING, clientObjective=inquiry_price):

```
ESTRATEGIA INCORRECTA:
  "El usuario dijo BOOKING → outputType=EXECUTE → 
   policy pregunta siguiente campo → '¿cuántos pasajeros son?'
   → usuario se confunde porque solo preguntó precio"

ESTRATEGIA CORRECTA:
  "El usuario dijo BOOKING pero clientObjective=inquiry_price
   → strategy.mode = 'explore' (no 'resolve')
   → outputType se rebaja a ANSWER
   → policy da precio sin preguntar nada más
   → usuario obtiene lo que vino a buscar"
```

**Por eso la jerarquía de señales (Sección 3) pone clientObjective por encima de intent en conflicto comercial.** La estrategia debe reflejar lo que el cliente **quiere lograr**, no lo que el sistema **cree que el cliente debería hacer**.

---

## Anexo: Sobre el ARNÉS

El ARNÉS se ejecuta correctamente en esta misión:

1. **Planificación**: Elegí usar un subagente `explore` para la fase de Discovery (lectura de 5+ archivos pesados) porque delegar agregaba valor — el subagente hizo el trabajo pesado de clasificar cada branch de cada policy.

2. **Ejecución**: Yo (el Director) sinteticé el análisis estratégico, identifiqué los conflictos, construí la jerarquía y generé las recomendaciones. El subagente no podía hacer esto porque requiere visión global del sistema.

3. **Cierre**: Verifiqué que el entregable cumple con las 8 secciones requeridas sin modificar código.

La única mejora posible sería usar también `@ael-architect` para validar la propuesta de Conversation Strategy Layer contra los ADRs existentes, pero para una auditoría read-only el `explore` fue suficiente.
