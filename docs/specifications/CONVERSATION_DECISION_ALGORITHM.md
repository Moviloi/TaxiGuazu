# Conversation Decision Algorithm — AITOS

> **Versión:** 1.2  
> **Propósito:** Algoritmo conversacional detallado que implementa el Contrato de Decisión Conversacional (CON-01) de la Constitución de AITOS.  
> **Autoridad:** Documento técnico derivado de la Constitución de AITOS (`docs/architecture/AITOS_CONSTITUTION.md`).  
> **Jerarquía:** CONST §1.4 (nivel 8: Contratos). CON-01 es el contrato; este documento es su implementación algorítmica.  
> **En caso de conflicto, prevalece la Constitución.**

---

## Tabla de Contenidos

1. [Objetivo del algoritmo](#1-objetivo-del-algoritmo)
2. [Pipeline lógico ideal](#2-pipeline-lógico-ideal)
3. [Prioridades del algoritmo](#3-prioridades-del-algoritmo)
4. [Invariantes del algoritmo](#4-invariantes-del-algoritmo)
5. [Algoritmo de actualización de contexto](#5-algoritmo-de-actualización-de-contexto)
6. [Cuándo se activa Ambiguity](#6-cuándo-se-activa-ambiguity)
7. [Cuándo preservar intención](#7-cuándo-preservar-intención)
8. [UPDATE vs RESET](#8-update-vs-reset)
9. [Árbol de decisión completo](#9-árbol-de-decisión-completo)
10. [Trazabilidad](#10-trazabilidad)
11. [Verificación contra bugs conocidos](#11-verificación-contra-bugs-conocidos)

---

## 1. Objetivo del algoritmo

### Propósito fundamental

AITOS **no** procesa mensajes aislados. AITOS **gestiona conversaciones**. Cada mensaje es un movimiento dentro de una conversación que tiene historia, estado e intención acumulada.

El algoritmo debe, en orden y para cada mensaje:

```
1. INTERPRETAR  →  ¿Qué dice el usuario?
2. PRESERVAR    →  ¿Qué ya sabíamos?
3. ACTUALIZAR   →  ¿Qué cambia con este mensaje?
4. DECIDIR      →  ¿Qué hacemos ahora?
5. RESPONDER    →  ¿Qué le decimos al usuario?
```

### Principio rector

> **El contexto es la fuente de verdad. El mensaje es un delta sobre ese contexto.**

Cada turno:
1. Comienza con el contexto de sesión (todo lo que el sistema sabe).
2. Recibe un mensaje del usuario.
3. Interpreta el mensaje como un **delta** (cambio incremental) sobre el contexto.
4. Fusiona el delta sin perder el contexto anterior.
5. Decide la siguiente acción basado en el nuevo contexto.

### Lo que el algoritmo NO hace

- No procesa mensajes como si fueran independientes.
- No descarta el contexto anterior al recibir un mensaje nuevo.
- No ejecuta acciones sin pasar por todos los pasos de decisión.
- No permite que la ambigüedad destruya contexto confirmado.
- No permite que la extracción LLM sobrescriba slots confirmados sin evidencia de contradicción.

---

## 2. Pipeline lógico ideal

### Diagrama de flujo conceptual

```
ENTRADA: Mensaje del usuario + Phone
  │
  ▼
1. RECIBIR MENSAJE
   • Verificar integridad (HMAC)
   • Rate limiting (10 msg/60s)
   • Deduplicación (message ID)
   • Comandos de sistema (.limpiar)
  │
  ▼
2. CARGAR SESIÓN
   • Obtener o crear conversación
   • Obtener chat_sessions (estado + slots + contexto)
   • Verificar expiración (inactividad > umbral)
   • Construir memoria de sesión (prevIntent, slots previos)
  │
  ▼
3. CARGAR CONTEXTO CONFIRMADO
   • Leer slots CONFIRMED de la sesión (inmutables salvo contradicción explícita)
   • Leer slots INFERRED/RAW (modificables por nuevo mensaje)
   • Leer conversational_state actual
   • Leer clarify_field (qué espera el sistema)
   • Leer lastIntent (intención del turno anterior)
  │
  ▼
4. PRESERVAR INTENCIÓN PREVIA
   • Si prevIntent existe y no es GREETING/AMBIGUOUS:
     - Es la intención activa del usuario
     - Solo cambia si el nuevo mensaje contiene evidencia suficiente de cambio
   • La intención previa tiene prioridad sobre clasificaciones de baja confianza
  │
  ▼
5. DETERMINAR QUÉ ESPERA EL SISTEMA (clarify_field)
   • Si conversational_state indica que esperamos un dato específico:
     - Ese dato es lo que esperamos recibir
     - El mensaje debe interpretarse como respuesta a ese dato
   • Si no hay clarify_field → el mensaje es iniciativa del usuario
  │
  ▼
6. INTERPRETAR EL MENSAJE COMO RESPUESTA ESPERADA
   • Si hay clarify_field:
     - El mensaje es una respuesta a ese campo
     - No activar ambigüedad de otros campos basada en el mensaje
   • Si NO hay clarify_field:
     - Clasificar intención normalmente
     - Extraer facts y roleLock
   • En ambos casos:
     - Detectar afirmación/negación/corrección
     - Detectar datos adicionales (pasajeros, horario, etc.)
  │
  ▼
7. ACTUALIZAR ÚNICAMENTE LOS DATOS MODIFICADOS
   • Aplicar merge incremental:
     - Slots previos NO se tocan si no hay contradicción
     - Slots nuevos se AGREGAN
     - Slots contradichos se REEMPLAZAN
     - Slots CONFIRMED solo cambian por contradicción explícita
   • Preservar source + status de cada slot
   • Preservar intent (a menos que haya evidencia de cambio)
  │
  ▼
8. VALIDAR CONSISTENCIA
   • Verificar que no haya conflictos entre slots
   • Verificar que origin y destination no sean iguales
   • Verificar que el estado conversacional sea coherente con los slots
   • Verificar que ningún invariante se haya violado
  │
  ▼
9. ACTIVAR AMBIGUITY (SOLO si no se pudo resolver)
   • Solo si: el término NO es respuesta a clarify_field, tiene múltiples
     coincidencias en DB, y el LLM no pudo resolver automáticamente
   • NUNCA: si el mensaje responde a clarify_field, si slots están CONFIRMED
  │
  ▼
10. ESCALAR (SOLO si Ambiguity falla)
    • Lugar no existe en DB → preguntar si es correcto
    • Si confirma → agregar como INFERRED
    • Baja confianza → RECOVERY o ESCALATION a humano
  │
  ▼
11. GENERAR RESPUESTA
    • Decidir: EXECUTE | ANSWER | CLARIFY
    • Construir respuesta según el dominio
    • Enviar mensaje al usuario
    • Persistir estado actualizado en DB
  │
  ▼
SALIDA: Respuesta al usuario + Estado actualizado
```

### Reglas de obligatoriedad

| Paso | ¿Siempre se ejecuta? | ¿Puede omitirse? |
|------|---------------------|-------------------|
| 1. Recibir mensaje | ✅ Siempre | ❌ |
| 2. Cargar sesión | ✅ Siempre | ❌ |
| 3. Cargar contexto confirmado | ✅ Siempre | ❌ |
| 4. Preservar intención previa | ✅ Siempre | ❌ |
| 5. Determinar clarify_field | ✅ Siempre | ❌ |
| 6. Interpretar mensaje | ✅ Siempre | ❌ |
| 7. Actualizar contexto | ✅ Siempre | ❌ |
| 8. Validar consistencia | ✅ Siempre | ❌ |
| 9. Activar Ambiguity | Solo si condición | ✅ Si no aplica |
| 10. Escalar | Solo si Ambiguity falla | ✅ Si no aplica |
| 11. Generar respuesta | ✅ Siempre | ❌ |

---

## 3. Prioridades del algoritmo

### Jerarquía de decisión

Cuando múltiples fuentes de información entran en conflicto, el algoritmo debe resolver usando esta jerarquía (de mayor a menor prioridad):

```
1. CONTEXTO CONFIRMADO
   → Slots con status = CONFIRMED
   → No se modifican sin contradicción explícita

2. INTENCIÓN ACTIVA
   → prevIntent del turno anterior
   → Solo cambia con evidencia suficiente

3. CLARIFY_FIELD
   → Indica qué espera el sistema
   → Determina cómo interpretar el mensaje

4. EXTRACCIÓN DEL MENSAJE ACTUAL
   → Facts + roleLock del CORE
   → Extracción LLM del mensaje actual

5. AMBIGUITY
   → Solo si hay términos sin resolver
   → Nunca sobre slots CONFIRMED o en respuesta a clarify_field

6. LLM
   → Fallback interpretativo
   → Solo cuando los métodos deterministas no alcanzan

7. FALLBACK / DEFAULT
   → SAFE_FALLBACK: respuesta genérica segura
   → ESCALATION: transferir a operador humano
```

### Justificación de cada prioridad

| Prioridad | Justificación | Principio AITOS LAB |
|-----------|---------------|---------------------|
| **1. Contexto confirmado** | El usuario ya verificó. Cambiar sin evidencia destruye confianza. | P2, P10 |
| **2. Intención activa** | La conversación tiene dirección. Clasificar desde cero ignora historia. | P9 |
| **3. clarify_field** | El sistema preguntó. El usuario respondió. Interpretar como otra cosa es incorrecto. | P3 |
| **4. Extracción del mensaje** | El mensaje contiene datos que deben extraerse. Pero no sobrescribir lo confirmado. | P6 |
| **5. Ambiguity** | Se resuelve activamente, solo cuando realmente existe. | P5 |
| **6. LLM** | Poderoso pero no determinista. Solo cuando métodos anteriores no alcanzan. | RNF-02, RNF-03 |
| **7. Fallback** | Último recurso. Mejor respuesta segura que incorrecta. | P4 |

### Regla de resolución de conflictos

Cuando dos fuentes de igual prioridad entran en conflicto:

1. **La fuente más específica gana sobre la más genérica.**
   - Ej: "Hotel Esturión" (extracción LLM) es más específico que "centro" (slot previo) si el usuario responde a clarify_field=destination.

2. **La fuente más reciente gana si la anterior no está CONFIRMED.**
   - Ej: "No, quiero ir a IGR" (Turno 3) reemplaza "aeropuerto" (Turno 1, RAW).

3. **La fuente CONFIRMED siempre gana sobre fuentes no confirmadas.**
   - Ej: destination CONFIRMED = "Hotel Amerian" no se reemplaza por extracción LLM que devuelve "Hotel American" (typo).

---

## 4. Invariantes del algoritmo

### Invariantes (I-01 a I-15)

Estos invariantes **nunca** deben violarse. Cualquier implementación o cambio que los viole debe ser rechazado.

**I-01 — NUNCA perder un slot confirmado**
Un slot con status CONFIRMED no puede desaparecer del contexto sin intervención explícita del usuario (corrección, cancelación, .limpiar).
*Fuente: I-C1, P2, P10.*

**I-02 — NUNCA volver a preguntar un dato confirmado**
Si un slot está CONFIRMED, el sistema no debe preguntarlo en este turno ni en turnos futuros, a menos que el usuario lo contradiga.
*Fuente: I-C3, P3, §14.2.*

**I-03 — MERGE incremental, nunca reemplazo total**
El contexto anterior + el nuevo mensaje = nuevo contexto. El contexto anterior NUNCA se descarta completamente al recibir un mensaje nuevo.
*Fuente: §13.1, P2, §21 Caso A.*

**I-04 — La intención solo cambia con evidencia suficiente**
prevIntent se preserva a menos que el nuevo mensaje contenga evidencia explícita de cambio de intención. Una clasificación de baja confianza (CONSULTA, AMBIGUOUS) no es evidencia suficiente.
*Fuente: §9, §25.4, P9.*

**I-05 — Ambiguity NUNCA puede destruir contexto**
Al activar ambiguity, el estado de la sesión (slots, intención, estado conversacional) debe preservarse intacto. Ambiguity solo agrega metadatos, nunca reemplaza slots existentes.
*Fuente: QB-02, QB-08, P5.*

**I-06 — UPDATE, no RESET, para cambios de datos**
Cambiar un slot (destino, pasajeros, fecha) es una actualización incremental, no un reinicio de la conversación.
*Fuente: §13, §21, §22.*

**I-07 — Una respuesta nunca puede retroceder el estado conversacional**
Si el usuario está en slot_confirmation, una respuesta afirmativa debe avanzar (awaiting_passenger o awaiting_confirmation), no retroceder a collecting_slots.
*Fuente: §8, §15.*

**I-08 — No abandonar el dominio TaxiGuazú**
El sistema nunca debe generar respuestas sobre temas fuera del dominio de transporte (política, clima, deportes, etc.). Si no reconoce la intención, debe escalar.
*Fuente: §2 (Alcance y límites).*

**I-09 — Preguntar únicamente información necesaria**
El sistema solo debe preguntar los campos requeridos para cotizar o ejecutar un viaje: origin, destination, passengers, scheduled_at. No debe preguntar datos personales, motivos del viaje, etc.
*Fuente: §3 (RF-01 a RF-10), §14.*

**I-10 — Minimizar turnos**
El sistema debe resolver en la menor cantidad de turnos posible. Cada turno adicional es fricción para el usuario.
*Fuente: §7 (Duración esperada).*

**I-11 — El clarify_field determina la interpretación del mensaje**
Si clarify_field está definido, el mensaje del usuario debe interpretarse primariamente como respuesta a ese campo. No debe activarse ambigüedad para otros campos basada en este mensaje.
*Fuente: §14.4, §25.2, F01-DG.*

**I-12 — Una sola clasificación por mensaje**
core() debe ejecutarse exactamente una vez por mensaje entrante. No puede haber una segunda clasificación en el pipeline.
*Fuente: I-C2, P8, QB-05, F04-DG.*

**I-13 — La fuente del slot se preserva**
Cada slot debe mantener su source (CORE, LLM, regex, user) y su status (RAW, INFERRED, CONFIRMATION_PENDING, CONFIRMED) durante todo su ciclo de vida. El merge no debe perder estos metadatos.
*Fuente: I-C11, P10, §11.*

**I-14 — No hay múltiples autoridades para decidir qué preguntar**
Debe existir un único punto de decisión para determinar "qué campo preguntar a continuación". No pueden coexistir 4 componentes compitiendo por esta decisión.
*Fuente: QB-04, F-03 (PR-QA2).*

**I-15 — La respuesta respeta el estado conversacional**
La respuesta del sistema debe ser coherente con el estado conversacional actual. No se puede enviar un saludo genérico cuando el sistema está en plena cotización.
*Fuente: QB-01, §8.*

### Mapa de invariantes contra Specification

| Invariante | Especificación | Auditado en |
|-----------|---------------|-------------|
| I-01 | §10, §11 (slot lifecycle), §20 (I-C1) | QA2B (P3, P4) |
| I-02 | §14.2, §20 (I-C3) | QA2B (P7), QA3-S2B (I-C3) |
| I-03 | §13.1, §13.2, §21, §25.3 | QA3-S2B (F03-DG) |
| I-04 | §9, §25.4, §25.6 (VAL-6) | QA3-S2B (F02-DG) |
| I-05 | §12, §20 (I-C1) | QA2B (QB-02, QB-08) |
| I-06 | §13, §21, §22 | QA2B (P3, P4) |
| I-07 | §8 (transiciones válidas) | QA2B (Escenario 2) |
| I-08 | §2 (alcance) | CX-1 |
| I-09 | §14.1, RF-01 a RF-10 | CX-1 |
| I-10 | §7 (duración esperada) | CX-1 |
| I-11 | §14.4, §25.2 | QA3-S2B (F01-DG) |
| I-12 | §6, §20 (I-C2) | QA3-S2A (QB-05), QA3-S2B (F04-DG) |
| I-13 | §11, I-C11, P10 | QA2B (§5.1) |
| I-14 | QB-04, F-03 (PR-QA2) | PR-QA2, PR-QA2B |
| I-15 | §8, §20 | QA2B (QB-01) |

---

## 5. Algoritmo de actualización de contexto

### Principio fundamental

El contexto conversacional es **acumulativo**. Cada turno agrega información al estado existente. Nunca reemplaza el estado a menos que el nuevo mensaje contradiga explícitamente el valor anterior.

### Fórmula conceptual

```
Contexto(t+1) = merge(Contexto(t), Delta(mensaje))
```

Donde:
- `Contexto(t)` = estado de la sesión ANTES de procesar el mensaje (slots, intención, estado conversacional, clarify_field)
- `mensaje` = texto del usuario en el turno actual
- `Delta(mensaje)` = interpretación del mensaje (extracción, facts, roleLock, afirmación/negación)
- `merge` = función que combina ambos preservando lo anterior y agregando lo nuevo

### Reglas de merge

```
1. SI el slot NO existe en Contexto(t):
   → AGREGAR: Contexto(t+1)[slot] = Delta[slot]
     (Ej: destination no existía → se agrega "Hotel Esturión")

2. SI el slot existe en Contexto(t) Y Delta NO menciona el slot:
   → PRESERVAR: Contexto(t+1)[slot] = Contexto(t)[slot]
     (Ej: origin="hotel" se preserva porque el nuevo mensaje no lo menciona)

3. SI el slot existe en Contexto(t) Y Delta contradice explícitamente:
   → REEMPLAZAR: Contexto(t+1)[slot] = Delta[slot]
   Condiciones de contradicción explícita:
   a. Negación + nuevo valor: "No el hotel, el aeropuerto"
   b. Verbo de cambio: "Cambio el destino", "Corrijo el origen"
   c. Corrección directa: "Mal, es el centro", "Error, quiero ir a..."
   d. Nueva dirección completa: "Del centro al hotel"

4. SI el slot existe en Contexto(t) Y Delta tiene un valor equivalente:
   → CONSOLIDAR: preservar valor, actualizar metadata (score, source)

5. SI el slot está CONFIRMED en Contexto(t):
   → SOLO se modifica si hay contradicción explícita (regla 3)
   → Una extracción LLM con confianza baja NO es suficiente para cambiar
     un slot CONFIRMED
```

### Pseudocódigo conceptual

```
FUNCTION actualizarContexto(contextoActual, delta):
    resultado = copiar(contextoActual)
    
    PARA CADA (slot, valorNuevo) EN delta.slots:
        valorActual = resultado.slots[slot]
        
        SI valorActual == null:
            // Slot nuevo → agregar
            resultado.slots[slot] = valorNuevo
            
        SINO SI hayContradiccionExplicita(texto):
            // Contradicción → reemplazar
            resultado.slots[slot] = valorNuevo
            
        SINO SI sonEquivalentes(valorActual.valor, valorNuevo.valor):
            // Equivalente → consolidar metadata
            resultado.slots[slot].score = max(valorActual.score, valorNuevo.score)
            resultado.slots[slot].source = priorizarSource(valorActual.source, valorNuevo.source)
            
        SINO:
            // Diferente pero sin contradicción → PRESERVAR valor actual
            CONTINUAR
    
    // Preservar intención a menos que el delta la cambie explícitamente
    SI delta.intencionCambiaExplicitamente:
        resultado.intent = delta.intent
    SINO:
        resultado.intent = contextoActual.intent
    
    RETORNAR resultado


FUNCTION hayContradiccionExplicita(texto):
    palabrasContradiccion = ["no", "cambio", "cambiar", "corregir", "corrijo",
                             "modificar", "rectificar", "en realidad", "mejor",
                             "otro", "diferente", "distinto", "mal", "error"]
    
    SI texto contiene alguna de palabrasContradiccion:
        RETORNAR verdadero
    
    // Nueva dirección completa reemplaza la anterior
    SI texto contiene patronEstoyEn Y texto contiene patronIrA:
        RETORNAR verdadero
    
    RETORNAR falso
```

### Lo que NO es merge correcto

```
❌ MAL: Reemplazar TODO el contexto con la extracción del nuevo mensaje
   Contexto(t): { origin: "Aeropuerto IGR", destination: "centro" }
   Delta: { destination: "Hotel Esturión" }
   Resultado INCORRECTO: { destination: "Hotel Esturión" }
   → origin se perdió

❌ MAL: Sobrescribir un slot CONFIRMED con un valor LLM de baja confianza
   Contexto(t): { origin: { value: "Aeropuerto IGR", status: "CONFIRMED" } }
   Delta: { origin: { value: "Aeropuerto IGR AR", score: 0.4 } }
   Resultado INCORRECTO: { origin: { value: "Aeropuerto IGR AR", score: 0.4 } }
   → Un CONFIRMED no se degrada por un score bajo
```

---

## 6. Cuándo se activa Ambiguity

### Condiciones para activar Ambiguity (CUÁNDO SÍ)

```
SE activa ambiguity CUANDO TODAS las siguientes condiciones son verdaderas:

[A] El CORE detectó un término que coincide con AMBIGUOUS_LOCATION_RE
    (hotel, aeropuerto, centro, aduana, iguazú, etc.)
    O la búsqueda en DB devuelve múltiples resultados para un término.

[B] El término NO es respuesta a un clarify_field.
    Si el sistema preguntó "¿A dónde querés ir?" y el usuario responde
    "Hotel Esturión", el término "hotel" no debería activar ambigüedad
    porque el usuario está respondiendo a una pregunta directa.

[C] El slot que contiene el término ambiguo NO está CONFIRMED.
    Si el usuario ya confirmó "Aeropuerto IGR", no se activa ambigüedad
    aunque "aeropuerto" sea ambiguo.

[D] El término tiene efectivamente múltiples significados en DB.
    "Hotel Esturión" (específico) puede no ser ambiguo si solo hay un
    resultado en DB, aunque "hotel" como palabra sea ambigua.

[E] El LLM no pudo resolver la ambigüedad automáticamente con alta confianza.
```

### Condiciones para NO activar Ambiguity (CUÁNDO NO)

```
NO se activa ambiguity CUANDO CUALQUIERA de las siguientes es verdadera:

[1] Hay un clarify_field definido y el roleLock del CORE está vacío.
    → El usuario está respondiendo a una pregunta del sistema.
    → Caso: clarify_field=destination, usuario dice "Hotel Esturión",
      roleLock vacío → NO ACTIVAR ambigüedad de origin.

[2] Hay un clarify_field definido y el roleLock del CORE coincide con
    el clarify_field.
    → El usuario está respondiendo específicamente al campo preguntado.

[3] El slot involucrado ya está CONFIRMED.
    → El usuario ya verificó este dato. No se puede poner en duda.

[4] El término ambiguo proviene de un slot previo, no del mensaje actual.
    → El mensaje actual no contiene el término; el sistema lo heredó
      del contexto de sesión.

[5] El usuario está en medio de un flujo de confirmación
    (slot_confirmation, awaiting_passenger, awaiting_confirmation).

[6] El mensaje es una afirmación o negación simple ("sí", "no", "ok").
```

### Ejemplos

| Mensaje | Contexto de sesión | ¿Activar Ambiguity? | Motivo |
|---------|-------------------|---------------------|--------|
| "Hotel Esturión" | clarify_field=destination, slots={origin:"hotel"} | **NO** | Responde a clarify_field. roleLock vacío. [1] |
| "Del hotel al centro" | clarify_field=null, slots={} | **SÍ** | Sin clarify_field. Términos ambiguos. [A] |
| "Aeropuerto IGR" | clarify_field=origin, slots={} | **SÍ (solo origin)** | clarify_field=origin, roleLock coincide. [2] |
| "Sí, confirmo" | state=slot_confirmation | **NO** | Estado de confirmación. [5] |
| "Somos 4" | clarify_field=passengers | **NO** | Sin término ambiguo. [A] falsa |
| "centro" | clarify_field=destination, origin CONFIRMED | **SÍ** | clarify_field=destination, "centro" ambiguo. |

### Algoritmo de decisión de Ambiguity

```
FUNCTION debeActivarAmbiguity(leadCore, session, texto):
    // 1. ¿El estado conversacional permite ambiguity?
    SI session.estado EN ["slot_confirmation", "awaiting_passenger",
                          "awaiting_confirmation", "pending_human_review"]:
        RETORNAR falso  // Condición [5]

    // 2. ¿El CORE detectó un término ambiguo?
    SI NO leadCore.facts.contiene("location_ambiguous:"):
        RETORNAR falso  // Condición [A] falsa

    // 3. ¿Hay un clarify_field definido?
    SI session.clarify_field != null:
        clarifyField = session.clarify_field
        roleOrigin = leadCore.roleLock?.origin
        roleDest = leadCore.roleLock?.destination

        // 3a. roleLock vacío → usuario responde a pregunta
        SI roleOrigin == null Y roleDest == null:
            RETORNAR falso  // Condición [1]

        // 3b. roleLock apunta al mismo slot que clarify_field
        SI clarifyField == "origin" Y roleOrigin != null:
            CONTINUAR  // Activar solo para origin
        SI clarifyField == "destination" Y roleDest != null:
            CONTINUAR  // Activar solo para destination

        // 3c. roleLock apunta al slot opuesto al clarify_field
        SI clarifyField == "origin" Y roleDest != null:
            RETORNAR falso  // Usuario adelanta destino
        SI clarifyField == "destination" Y roleOrigin != null:
            RETORNAR falso  // Usuario adelanta origen

    // 4. ¿Los slots involucrados están CONFIRMED?
    rawOrigin = leadCore.roleLock?.origin ?? session.origin.valor
    rawDest = leadCore.roleLock?.destination ?? session.destination.valor
    
    SI rawOrigin != null Y session.origin?.status == "CONFIRMED":
        NO activar para origin  // Condición [3]
    SI rawDest != null Y session.destination?.status == "CONFIRMED":
        NO activar para destination  // Condición [3]

    // 5. ¿Los términos ambiguos vienen de la sesión, no del mensaje?
    SI leadCore.roleLock?.origin == null Y leadCore.roleLock?.destination == null:
        RETORNAR falso  // Condición [4]

    // 6. Por defecto, activar ambigüedad
    RETORNAR verdadero
```

---

## 7. Cuándo preservar intención

### Regla general

La intención del mensaje actual se combina con la intención del mensaje anterior según estas reglas, en orden de prioridad:

```
1. PREVALECE prevIntent cuando:
   - prevIntent existe Y no es GREETING ni AMBIGUOUS
   - Y el nuevo intent es de "menor confianza operativa"
     (CONSULTA, AMBIGUOUS, UNKNOWN, INFORMATIONAL sin evidencia fuerte)

2. CAMBIA a nuevo intent cuando:
   - prevIntent es GREETING o AMBIGUOUS (no persisten)
   - El nuevo mensaje contiene evidencia operativa fuerte
     (booking:, now:, emergency:, reschedule:, post_service:)
   - El nuevo mensaje tiene señales de COMPRA (passengers + flight + time + urgency)

3. CONSOLIDA (prevIntent == intent) cuando:
   - Ambos son iguales → mantener, confirmar
```

### Tabla de evolución de intención

| prevIntent | intent actual | ¿Evidencia fuerte? | intención FINAL | Regla |
|-----------|--------------|-------------------|-----------------|-------|
| BOOKING | CONSULTA | No ("Hotel Esturión") | **BOOKING** | 1 |
| BOOKING | AMBIGUOUS | No | **BOOKING** | 1 |
| BOOKING | COMMERCIAL | Sí ("¿Cuánto sale?") | **COMMERCIAL** | 2 |
| BOOKING | INFORMATIONAL | No ("gracias") | **BOOKING** | 1 |
| BOOKING | BOOKING | — | **BOOKING** | 3 |
| BOOKING | NOW | Sí ("ahora") | **NOW** | 2 |
| BOOKING | PRE_BOOKING | — | **BOOKING** | 1 |
| COMMERCIAL | BOOKING | Sí (slots completos) | **BOOKING** | 2 |
| COMMERCIAL | CONSULTA | No | **COMMERCIAL** | 1 |
| GREETING | cualquiera | — | **intent actual** | no persiste |
| AMBIGUOUS | cualquiera | — | **intent actual** | no persiste |
| null | cualquiera | — | **intent actual** | sin previo |

### Ejemplos contextuales

```
Ejemplo 1: Preservar BOOKING
  Turno 1: "Necesito un taxi del aeropuerto al centro" → BOOKING
  Turno 2: "Hotel Esturión" → CORE detecta CONSULTA
            prevIntent=BOOKING, intent=CONSULTA → BOOKING (preservado)
  Justificación: El usuario sigue hablando del mismo viaje.

Ejemplo 2: Preservar BOOKING con dato adicional
  Turno 1: "Quiero ir del hotel Meliá a Cataratas" → BOOKING
  Turno 2: "Somos 4" → PRE_BOOKING → BOOKING (PRE_BOOKING es transitorio)

Ejemplo 3: Cambio legítimo de BOOKING a COMMERCIAL
  Turno 1: "Reservame un taxi del hotel al centro" → BOOKING
  Turno 2: "Aceptan tarjeta de crédito?" → COMMERCIAL
  Justificación: BOOKING queda como intención de fondo (booking_floating).

Ejemplo 4: Booking Floating
  Turno 1: "Del aeropuerto al centro" → BOOKING
  Turno 2: "Aceptan tarjeta?" → COMMERCIAL (BOOKING en segundo plano)
  Turno 3: "Sí, dale" → BOOKING (retoma intención de fondo)

Ejemplo 5: No preservar con reinicio explícito
  Turno 1: "Del aeropuerto al centro" → BOOKING
  Turno 2: ".limpiar" → RESET TOTAL
  Turno 3: "Hola" → GREETING (sin previo)
```

### Concepto de "Booking Floating"

Cuando un usuario con intención BOOKING activa hace una consulta periférica, el sistema debe:

1. Responder la consulta (la pregunta del usuario tiene prioridad inmediata).
2. Mantener BOOKING como **intención de fondo** (booking_floating): no visible en la respuesta, disponible para el próximo turno.
3. En el próximo turno, si el usuario retoma con datos operativos o confirmación, reactivar BOOKING automáticamente.
4. Si el usuario hace múltiples consultas sin retomar, la intención de fondo expira después de N turnos (configurable, sugerido: 3).

---

## 8. UPDATE vs RESET

### Definición

Un **UPDATE** modifica un slot específico sin afectar el resto del contexto.
Un **RESET** destruye parcial o totalmente el contexto de la sesión.

### Tabla de condiciones

| Evento | Tipo | Efecto |
|--------|------|--------|
| Usuario cambia destino | **UPDATE** | destination → nuevo valor. Origin, passengers, precio preservados. |
| Usuario cambia origen | **UPDATE** | origin → nuevo valor. Destination, passengers, precio preservados. |
| Usuario cambia pasajeros | **UPDATE** | passengers → nuevo valor. Precio se recotiza. |
| Usuario cambia fecha/hora | **UPDATE** | scheduled_at → nuevo valor. |
| Usuario dice "No" en confirmación | **RESET PARCIAL** | Vuelve a collecting_slots. Slots preservados. |
| Usuario dice "Cancelar viaje" | **RESET PARCIAL** | Viaje cancelado. Slots preservados. |
| Usuario dice ".limpiar" | **RESET TOTAL** | Todo el contexto eliminado. Vuelve a idle. |
| Inactividad > umbral (48h) | **RESET TOTAL** | Sesión expirada. Contexto eliminado. |
| Usuario dice "Hola" con contexto activo | **NO RESET** | Preservar contexto. Saludo breve + continuar. |
| Dirección completa nueva | **UPDATE DOBLE** | origin y destination se actualizan simultáneamente. |
| Corrección con negación | **UPDATE** | Slot específico se reemplaza. |

### Árbol de decisión de RESET

```
¿El mensaje del usuario indica RESET?
  │
  ├── ".limpiar" ─────────────────────────→ RESET TOTAL
  │
  ├── Inactividad > umbral ───────────────→ RESET TOTAL
  │
  ├── "Cancelar", "Cancelar Viaje" ───────→ RESET PARCIAL (viaje)
  │
  ├── "No" en slot_confirmation ──────────→ RESET PARCIAL (vuelve a collecting_slots)
  │
  ├── "Hola" con contexto activo ─────────→ NO RESET (preservar todo)
  │
  ├── Nuevos datos operativos ────────────→ UPDATE (merge incremental)
  │
  └── Corrección con negación ────────────→ UPDATE (slot específico)

---

## 9. Árbol de decisión completo

### Diagrama de flujo completo

El siguiente diagrama representa el algoritmo conversacional completo, desde la recepción del mensaje hasta la respuesta. Cada nodo de decisión tiene una referencia al paso del pipeline lógico (§2) y a la regla que lo gobierna.

```
INICIO: Mensaje entrante + Phone
  │
  ├── [PASO 1] ¿Es comando de sistema?
  │     ├── ".limpiar" → RESET TOTAL → responder → FIN
  │     ├── Comando admin → procesar → FIN
  │     └── No → continuar
  │
  ├── [PASO 2] Cargar sesión
  │     ├── ¿Existe conversación? → cargar
  │     ├── ¿Expirada? → RESET TOTAL → iniciar nueva
  │     └── Cargar chat_sessions (estado, slots, contexto)
  │
  ├── [PASO 3] Cargar contexto confirmado (I-01)
  │     ├── Leer slots CONFIRMED (inmutables)
  │     ├── Leer slots INFERRED/RAW (modificables)
  │     ├── Leer conversational_state
  │     ├── Leer clarify_field
  │     └── Leer lastIntent
  │
  ├── [PASO 4] Preservar intención previa (I-04, §7)
  │     ├── prevIntent existe y no es GREETING/AMBIGUOUS?
  │     │     ├── Sí → es la intención activa (solo cambia con evidencia fuerte)
  │     │     └── No → clasificar mensaje desde cero
  │     └── Aplicar Booking Floating si aplica
  │
  ├── [PASO 5] Determinar qué espera el sistema (I-11)
  │     ├── conversational_state indica estado especial?
  │     │     ├── ambiguity_pending → delegar a handler de ambigüedad
  │     │     ├── slot_confirmation → delegar a handler de confirmación
  │     │     ├── awaiting_passenger → delegar a handler de pasajeros
  │     │     └── awaiting_confirmation → delegar a handler de confirmación final
  │     └── En collecting_slots o idle → continuar
  │
  ├── [PASO 6] Interpretar mensaje
  │     ├── ¿Hay clarify_field? (I-11)
  │     │     ├── Sí → interpretar como respuesta a ese campo
  │     │     │     ├── ¿El mensaje contiene el valor esperado? → actualizar
  │     │     │     ├── ¿El mensaje es afirmación/negación? → procesar
  │     │     │     └── ¿El mensaje da OTRO slot? → actualizar ese slot también
  │     │     └── No → clasificar intención normalmente con CORE
  │     │
  │     ├── Ejecutar CORE (UNA VEZ, I-12)
  │     │     ├── Extraer facts
  │     │     ├── Detectar roleLock y slotStability
  │     │     └── Clasificar intent
  │     │
  │     └── Ejecutar interpretMessage (conversation-interpreter)
  │
  ├── [PASO 7] Actualizar contexto (I-03, §5)
  │     ├── Aplicar merge incremental
  │     │     ├── ¿Slot nuevo? → AGREGAR
  │     │     ├── ¿Slot existente sin contradicción? → PRESERVAR
  │     │     ├── ¿Slot contradicho explícitamente? → REEMPLAZAR
  │     │     └── ¿Slot CONFIRMED? → solo cambiar con contradicción explícita
  │     ├── Preservar source + status de cada slot (I-13)
  │     └── Preservar intent (a menos que el delta lo cambie)
  │
  ├── [PASO 7b] Extraer datos del mensaje
  │     ├── Ejecutar extracción LLM
  │     ├── Aplicar regex fallback
  │     ├── Calcular confianza
  │     └── Construir slotState para cada slot
  │
  ├── [PASO 7c] Resolver lugares en DB
  │     ├── Buscar origin en DB (si se extrajo)
  │     ├── Buscar destination en DB (si se extrajo)
  │     └── Clasificar cada resultado: encontrado / ambiguo / no encontrado
  │
  ├── [PASO 8] Validar consistencia
  │     ├── ¿origin == destination? → pedir corrección
  │     ├── ¿Estado coherente con slots? → corregir si no
  │     ├── ¿Invariantes violados? → rechazar operación
  │     └── Todo OK → continuar
  │
  ├── [PASO 9] ¿Activar Ambiguity? (§6)
  │     ├── NO → continuar al paso 10
  │     └── SÍ
  │           ├── Resolución automática (LLM)
  │           │     ├── ¿Alta confianza? → resolver automáticamente → continuar
  │           │     └── Baja confianza → preguntar al usuario
  │           │           ├── ¿Risk node? → mostrar opciones
  │           │           └── No risk node → pregunta contextual
  │           └── Almacenar estado de ambigüedad (sin perder contexto, I-05)
  │
  ├── [PASO 10] Escalar si Ambiguity falla
  │     ├── ¿Lugar no encontrado en DB?
  │     │     ├── Preguntar si es correcto
  │     │     ├── Usuario confirma → INFERRED
  │     │     └── Usuario no sabe → escalar a humano
  │     ├── ¿Baja confianza de comprensión?
  │     │     ├── RECOVERY → pedir repetir
  │     │     └── ESCALATION → transferir a operador
  │     └── OK → continuar
  │
  ├── [PASO 10b] Pricing
  │     ├── ¿origin + destination + passengers conocidos?
  │     │     ├── Sí → cotizar precio
  │     │     └── No → omitir pricing
  │     └── Almacenar precio en contexto
  │
  ├── [PASO 11] Decidir (Router)
  │     ├── ¿Slots completos + confirmación? → EXECUTE
  │     ├── ¿Slots completos + sin confirmar? → CLARIFY (pedir confirmación)
  │     ├── ¿Slots incompletos? → CLARIFY (preguntar siguiente campo, I-02, I-09)
  │     ├── ¿Consulta de precio? → ANSWER
  │     └── ¿Baja confianza? → SAFE_FALLBACK
  │
  ├── [PASO 11b] Responder (Policy)
  │     ├── Construir respuesta según dominio
  │     ├── (Opcional) Generar con LLM
  │     └── I-15: Respuesta respeta estado conversacional
  │
  └── [FIN] Enviar respuesta + persistir estado
        ├── Enviar mensaje al usuario
        ├── Actualizar chat_sessions (slots + estado + intent)
        └── Actualizar conversation_history
```

### Transiciones de estado esperadas

```
ESTADO ACTUAL         EVENTO                               NUEVO ESTADO
─────────────────────────────────────────────────────────────────────────
idle                  Mensaje con intención operativa       collecting_slots
collecting_slots      Lugar ambiguo detectado               ambiguity_pending
collecting_slots      Todos los slots listos                slot_confirmation
collecting_slots      Usuario cancela                       idle (por .limpiar)
ambiguity_pending     Ambigüedad resuelta                   collecting_slots (faltan datos)
ambiguity_pending     Ambigüedad resuelta + slots listos    slot_confirmation
ambiguity_pending     Ambigüedad no resuelta                pending_human_review
slot_confirmation     Usuario confirma                      awaiting_passenger (sin pax)
slot_confirmation     Usuario confirma                      awaiting_confirmation (con pax)
slot_confirmation     Usuario cambia algo                   collecting_slots
awaiting_passenger    Usuario da pasajeros válidos          awaiting_confirmation
awaiting_passenger    Usuario no da pasajeros válidos       awaiting_passenger
awaiting_confirmation Usuario confirma                      pending_human_review
awaiting_confirmation Usuario cancela                       collecting_slots
pending_human_review  Operador resuelve                     idle
```

---

## 10. Trazabilidad

### Mapa de reglas del algoritmo contra documentos fuente

Cada regla definida en este documento debe poder rastrearse hasta su fuente normativa.

| Regla / Concepto | Sección en CDA | Fuente primaria | Fuente secundaria |
|-----------------|---------------|----------------|-------------------|
| Mensaje como delta del contexto | §1 | §10 (Gestión del contexto) | P2 (Preservar contexto) |
| Pipeline 11 pasos | §2 | §24 (Algoritmo conceptual) | §6 (Modelo conversacional) |
| Jerarquía de prioridades | §3 | §20 (I-C1 a I-C12) | P2, P3, P5, P9, P10 |
| I-01: No perder slot confirmado | §4 | I-C1, §11 (slot lifecycle) | P2, P10 |
| I-02: No preguntar lo sabido | §4 | I-C3, §14.2 | P3 |
| I-03: Merge incremental | §4 | §13.1, §21 Caso A, §25.3 | P2 |
| I-04: Intención con evidencia | §4 | §9, §25.4, §25.6 VAL-6 | P9 |
| I-05: Ambiguity no destruye contexto | §4 | QB-02, QB-08, §12 | P5 |
| I-06: UPDATE no RESET | §4 | §13, §21, §22 | — |
| I-07: No retroceder estado | §4 | §8 (transiciones), §15 | — |
| I-08: Dominio TaxiGuazú | §4 | §2 (alcance) | — |
| I-09: Solo información necesaria | §4 | §14.1, RF-01 a RF-10 | — |
| I-10: Minimizar turnos | §4 | §7 (duración esperada) | — |
| I-11: clarify_field determina interpretación | §4 | §14.4, §25.2 | F01-DG |
| I-12: Una sola clasificación | §4 | I-C2, §6 | P8, QB-05 |
| I-13: Source + status se preservan | §4 | I-C11, P10, §11 | — |
| I-14: Autoridad única qué preguntar | §4 | QB-04, F-03 (PR-QA2) | — |
| I-15: Respuesta respeta estado | §4 | QB-01, §8 | — |
| Merge: reglas 1-5 | §5 | §13 (Actualización incremental), §25.3 | P2, P7 |
| Merge: contradicción explícita | §5 | §13.2, §22 | — |
| Merge: pseudocódigo | §5 | §25.3 | — |
| Ambiguity: cuándo SÍ (A-E) | §6 | §12 (Algoritmo de resolución) | P5 |
| Ambiguity: cuándo NO (1-6) | §6 | §25.2, §14.4 | F01-DG |
| Ambiguity: risk nodes | §6 | §12 (Reglas UX) | — |
| Ambiguity: resolución LLM + contextual | §6 | §12.2-12.4 | ADR-005 |
| Intención: preservar sobre baja confianza | §7 | §9 (Regla 4), §25.4 | §25.6 VAL-6 |
| Intención: evidencia fuerte | §7 | §9 | — |
| Intención: Booking Floating | §7 | §9 (evolución natural) | P9 |
| UPDATE vs RESET | §8 | §13, §21, §22 | QB-01 |
| Transiciones de estado | §9 | §8 (Mapa de estados) | — |
| Decision tree / Router | §9 | §6 (Flujo por dominio) | §24 |

### Mapa de hallazgos de auditorías contra CDA

| Hallazgo | Auditoría | Violación en CDA |
|----------|----------|-----------------|
| QB-01: GREETING shortcut pierde contexto | QA2B | §2 paso 5, I-15, §8 (NO RESET) |
| QB-02: Ambiguity reset | QA2B | §6 condición [4], I-05 |
| QB-03: Confirmation timeout | QA2B | §8 (RESET solo por inactividad > umbral) |
| QB-04: Múltiples autoridades qué preguntar | QA2B | §3 prioridad 4, I-14 |
| QB-05: Segundo core() | QA2B | §2 paso 6 (UNA VEZ), I-12 |
| QB-06: prevSlots merge sobrescribe | QA2B | §5 regla 2 (preservar si no hay contradicción) |
| QB-07: Intención cambia cada turno | QA2B | §7 regla 1 (preservar sobre baja confianza) |
| QB-08: Ambiguity state en slots | QA2B | §6 (I-05: no destruir contexto) |
| F01-DG: Ambiguity sin verificar clarify_field | QA3-S2B | §6 condiciones [1][4], I-11 |
| F02-DG: Intención no preservada | QA3-S2B | §7 regla 1, I-04 |
| F03-DG: Merge no ejecutado por bypass | QA3-S2B | §2 paso 7 obligatorio, §5 regla 1, I-03 |
| F04-DG: Sin doble core() ✅ | QA3-S2B | I-12 (cumple) |
| F05-DG: Triple fallback ✅ | QA3-S2B | §2 paso 7b (cumple) |

---

## 11. Verificación contra bugs conocidos

### Metodología

Para cada bug conocido (QB-01 a QB-08 de QA2B, F01-DG a F03-DG de QA3-S2B), se indica:

1. **¿Es desviación respecto de este algoritmo?** → Sí / No / Parcial
2. **¿Qué paso del algoritmo viola?** → Referencia al paso del pipeline lógico (§2) o regla específica
3. **¿Qué invariante viola?** → Referencia al invariante (§4)
4. **Comportamiento esperado según CDA** → Lo que DEBE ocurrir

### QB-01 — GREETING shortcut pierde contexto

| Aspecto | Respuesta |
|---------|-----------|
| ¿Desviación del CDA? | **Sí** |
| Paso violado | §2 paso 5: debe detectar estado especial (slot_confirmation, collecting_slots) ANTES de responder. También §2 paso 7: debe cargar contexto confirmado. |
| Invariante violado | I-15 (respuesta respeta estado conversacional), I-01 (pierde slots) |
| Comportamiento esperado | Si hay contexto activo (slots existentes), el saludo debe preservarlo y continuar el flujo después de una respuesta breve. Ver §8: NO RESET para "Hola" con contexto. |

### QB-02 — Ambiguity state collapse (estado perdido)

| Aspecto | Respuesta |
|---------|-----------|
| ¿Desviación del CDA? | **Sí** |
| Paso violado | §2 paso 9: al activar Ambiguity, el estado debe preservarse intacto (I-05). El código actual permite que el estado `ambiguity_pending` se pierda si `ambState` es null. |
| Invariante violado | I-05 (Ambiguity no destruye contexto), I-01 (pérdida de slots) |
| Comportamiento esperado | Ambiguity almacena su estado como metadato adicional, nunca reemplaza slots existentes. Si el estado de ambigüedad se pierde, los slots previos deben preservarse. |

### QB-03 — Confirmation timeout

| Aspecto | Respuesta |
|---------|-----------|
| ¿Desviación del CDA? | **Parcial** |
| Paso violado | §2 paso 8: la validación de consistencia debe considerar timeouts como RESET TOTAL solo si la inactividad supera el umbral (48h). Timeouts menores deben preservar contexto. |
| Invariante violado | I-01 (pérdida de slots por timeout prematuro) |
| Comportamiento esperado | Timeout de confirmación corto → preservar slots pero retroceder estado a collecting_slots. No resetear completamente. Timeout largo (>48h) → RESET TOTAL. |

### QB-04 — Múltiples autoridades qué preguntar

| Aspecto | Respuesta |
|---------|-----------|
| ¿Desviación del CDA? | **Sí** |
| Paso violado | §2 paso 11: debe existir un único punto de decisión para determinar qué campo preguntar. §3 prioridad 4. |
| Invariante violado | I-14 (autoridad única) |
| Comportamiento esperado | Un solo componente (field-resolver o equivalente) determina el siguiente campo a preguntar basado en: (1) slots disponibles, (2) clarify_field, (3) prioridad de campos (origin > destination > passengers > scheduled_at). |

### QB-05 — Segundo core() en handler

| Aspecto | Respuesta |
|---------|-----------|
| ¿Desviación del CDA? | **Sí** (corregido en S2A) |
| Paso violado | §2 paso 6: CORE debe ejecutarse UNA SOLA VEZ por mensaje. |
| Invariante violado | I-12 (una sola clasificación) |
| Comportamiento esperado | `core()` se ejecuta exactamente una vez. El resultado se reutiliza en todo el pipeline. No hay doble clasificación. (PR-QA3-S2A ya corrigió esto.) |

### QB-06 — prevSlots merge sobrescribe valor nuevo

| Aspecto | Respuesta |
|---------|-----------|
| ¿Desviación del CDA? | **Sí** |
| Paso violado | §5 regla 2: slots previos se PRESERVAN si el nuevo mensaje no los menciona. Pero también §5 regla 1: slots nuevos se AGREGAN. El merge actual puede sobrescribir un valor nuevo con uno previo. |
| Invariante violado | I-03 (merge incremental correcto) |
| Comportamiento esperado | Ver §5 pseudocódigo: cada slot se evalúa individualmente. Si es nuevo → agregar. Si existe y no hay contradicción → preservar. Si existe y hay contradicción → reemplazar. Nunca sobrescribir un valor nuevo con uno previo. |

### QB-07 — Intención cambia cada turno

| Aspecto | Respuesta |
|---------|-----------|
| ¿Desviación del CDA? | **Sí** |
| Paso violado | §2 paso 4: preservar intención previa. §7 regla 1: prevIntent prevalece sobre clasificaciones de baja confianza. |
| Invariante violado | I-04 (intención solo cambia con evidencia suficiente) |
| Comportamiento esperado | Ver §7 tabla de evolución: BOOKING + CONSULTA sin evidencia fuerte → BOOKING. La intención no debe cambiar por clasificaciones de baja confianza. |

### QB-08 — Ambiguity state en slots JSON

| Aspecto | Respuesta |
|---------|-----------|
| ¿Desviación del CDA? | **Sí** |
| Paso violado | §2 paso 9: Ambiguity debe almacenar su estado como metadato SIN reemplazar slots existentes. El almacenamiento en `__ambiguity` dentro del JSON `slots` es frágil porque cualquier operación que sobrescriba `slots` sin preservar `__ambiguity` lo pierde. |
| Invariante violado | I-05 (Ambiguity no destruye contexto) |
| Comportamiento esperado | El estado de ambigüedad debe persistirse de manera que: (a) no se pierda al actualizar slots, (b) no contamine los slots operativos, (c) sea atómico con el estado de la sesión. |

### F01-DG — Ambiguity sin verificar clarify_field

| Aspecto | Respuesta |
|---------|-----------|
| ¿Desviación del CDA? | **Sí** |
| Paso violado | §2 paso 9: la activación de Ambiguity debe verificar clarify_field ANTES de activarse. §6 condiciones [1] y [4]. |
| Invariante violado | I-11 (clarify_field determina interpretación) |
| Comportamiento esperado | Ver §6 algoritmo `debeActivarAmbiguity`: si clarify_field está definido y roleLock está vacío, RETORNAR falso. El mensaje es respuesta a una pregunta, no un nuevo término ambiguo. |

### F02-DG — Intención no preservada

| Aspecto | Respuesta |
|---------|-----------|
| ¿Desviación del CDA? | **Sí** |
| Paso violado | §2 paso 4: preservar intención previa. §7 regla 1. |
| Invariante violado | I-04 (intención solo cambia con evidencia suficiente) |
| Comportamiento esperado | `prevIntent=BOOKING, intent=CONSULTA` → BOOKING. La regla de preservación debe aplicarse a cualquier intent de baja confianza (CONSULTA, AMBIGUOUS) cuando prevIntent es BOOKING o NOW. Ver §7 tabla de evolución. |

### F03-DG — Merge no ejecutado por bypass de ambigüedad

| Aspecto | Respuesta |
|---------|-----------|
| ¿Desviación del CDA? | **Sí** |
| Paso violado | §2 paso 7 (actualizar contexto) y paso 7b (extraer datos) son OBLIGATORIOS. El bypass por ambigüedad no debe impedir que el mensaje se interprete y sus datos se fusionen. |
| Invariante violado | I-03 (merge incremental siempre debe ejecutarse) |
| Comportamiento esperado | El merge de contexto y la extracción de datos deben ejecutarse SIEMPRE, incluso si se activa ambigüedad. El mensaje "Hotel Esturión" debe extraerse como posible destination aunque luego se active ambigüedad para otros términos. Ver §5 regla 1. |

---

## Apéndice A: Corrección de ambigüedades de Specification detectadas

Durante la creación de este algoritmo se detectaron dos ambigüedades en la `FUNCTIONAL_BEHAVIOR_SPECIFICATION.md`. Este documento resuelve ambas:

| Ambigüedad | Secciones en conflicto | Resolución en CDA |
|-----------|----------------------|-------------------|
| A01-DG: ¿Cuándo preservar intención? | §9 (Regla 4) vs §25.4 (Turno 4) | §7 tabla de evolución: prevIntent prevalece sobre CONSULTA/AMBIGUOUS sin evidencia fuerte. Booking Floating para COMMERCIAL. |
| A02-DG: ¿Cuándo activar Ambiguity? | §12 (paso 1) vs §25.2 (excepción clarify_field) | §6 algoritmo `debeActivarAmbiguity`: clarify_field + roleLock vacío = NO activar. |

---

## Apéndice B: Historial de revisiones

| Versión | Fecha | Cambios | Autor |
|---------|-------|---------|-------|
| 1.0 | 2026-07-17 | Versión inicial. Síntesis de FUNCTIONAL_BEHAVIOR_SPECIFICATION.md, QA2B, QA3-S2B, principios AITOS LAB. | ARNÉS (PR-CDA1) |
| 1.1 | 2026-07-20 | Apéndice C agregado con referencias de verificación externas (CX-1, SLOT_MERGE_BUG_AUDIT). | BUILD (KNOWLEDGE_INVENTORY) |

---

## Apéndice C: Referencias de verificación externas

Este apéndice documenta las fuentes externas que verifican experimentalmente el CDA contra escenarios reales. El CDA es normativo; estas referencias son evidencia de que el algoritmo ha sido auditado contra implementación real.

### C.1 Batería de verificación CX-1 (Conversation Experience Certification)

El documento `CX-1_CONVERSATION_EXPERIENCE_CERTIFICATION.md` contiene una batería de **21 escenarios conversacionales auditados** (C1–C21) trazados contra el pipeline real de AITOS. Cada caso documenta: flujo, puntos de escalamiento, llamadas LLM, y estado del arte.

| # | Escenario | LLM calls | Verifica en CDA |
|---|---|---|---|
| **C1** | "Hotel Meliá → aeropuerto IGR" | 0 | §2 pasos 1-5 (extracción regex + entity), §5 merge |
| **C2** | "Terminal → centro" | 0 | §6 ambigüedad con 1 candidato, §9 transición |
| **C3** | "Aeropuerto → hotel Rafain, viernes" | 1 (rephrase) | §2 paso 7b (fecha inferida), §5 merge |
| **C4** | "Hotel Amerian → Cataratas, 4 pax, mañana 8am" | 1 (rephrase) | §5 merge múltiples slots |
| **C5** | "Centro → aduana Argentina, 5 pax" | 0 | §9 fleet capacity check |
| **C6** | Multi-ride (hotel → aeropuerto → cataratas) | 1 (estructura) | §2 paso 7b multi-leg |
| **C7** | "Aeropuerto IGR → hotel Mabu" | 0 | §5 regex + entity |
| **C8** | "Necesito ir al aeropuerto" (ambiguo) | 1 | §6 ambigüedad, §7 preservar intención |
| **C9** | "Parque Nacional Iguazú" | 0 | §5 entity, §9 inferPickupTime |
| **C10** | "Aduana → centro" (lado explícito) | 0 | §5 entity + border inference |
| **C11** | "Aduana → cataratas" (lado implícito) | 0-1 | §5 border inference sin LLM posible |
| **C12** | "Cuánto sale...?" (consulta precio) | 0 | §9 skipLLM para low intent |
| **C13** | "Precio 4 pax Meliá → cataratas" | 1 (rephrase) | §9 pricing + §5 merge |
| **C14** | Corrección en slot_confirmation | 0 | §7 preserveContext, §8 UPDATE |
| **C15** | "Cancelá el viaje" | 0 | §9 inhibitNewBooking |
| **C16** | Spanglish + chino | 1-2 | §6 ambigüedad cross-language |
| **C17** | "Hola" (solo saludo) | 0 | §2 paso 5 GREETING shortcut |
| **C18** | "Sí" (afirmación) | 0-1 | §9 isAffirmativeMessage |
| **C19** | "Quiero ir..." (incompleto) | 1 | §2 paso 9 RECOVERY, §6 ambigüedad |
| **C20** | Audio de voz | 1 (transcripción) | §2 paso 1 pre-procesamiento |
| **C21** | Conversación larga (15 turnos) | 3-5 | §2 paso 4 conversationStability |

> **Métrica clave CX-1**: Turnos promedio por conversación exitosa: **3.2**. LLM calls por conversación: **0.8** (flags false). LLM calls evitables con DRL: **40-60%** (ver §9.3 de CX-1).
>
> **Veredicto CX-1**: 🟡 **READY FOR STAGING WITH OBSERVATIONS** — 0 bloqueantes, 5 importantes, 12 menores, 8 mejoras futuras.

### C.2 Escenario de riesgo documentado — SLOT_MERGE_BUG_AUDIT

El documento `SLOT_MERGE_BUG_AUDIT.md` contiene el análisis del bug de merge B3 (slot merge sobrescribe contexto). Este escenario verifica:

| Aspecto | Referencia en CDA |
|---------|-------------------|
| Merge preserva slot previo si nuevo mensaje no lo menciona | §5 regla 2 |
| Merge agrega slot nuevo sin sobrescribir existentes | §5 regla 1 |
| Contradicción explícita → reemplazo controlado | §5 regla 3 |
| Pseudocódigo de merge atómico | §5 pseudocódigo |
| Invariante I-03: merge incremental correcto | §4 |

### C.3 Nota sobre documentos históricos

Los siguientes documentos históricos contienen información redefinida o cubierta por el CDA. Se preservan como referencia hasta completar la migración de información única:

| Documento | Estado | Razón |
|-----------|--------|-------|
| `PIPELINE_V2_PROPOSAL.md` | 🗑️ **Eliminado** | Redefinido por CDA §2 (pipeline 11 pasos) y §9 (árbol de decisión) |
| `CONVERSATION_PIPELINE_AUDIT.md` | 🗑️ **Eliminado** | Cubierto por CDA §2, §5, §6, §9. Info única migrada a este apéndice. |
| `CX-1_CONVERSATION_EXPERIENCE_CERTIFICATION.md` | 📌 **Preservado** | Contiene métricas detalladas, hallazgos CX-01 a CX-15, y metodología de auditoría no reducibles al CDA. Referenciado desde §C.1. |
| `SLOT_MERGE_BUG_AUDIT.md` | 📌 **Preservado** | Contiene trazado B3 detallado y data forense de implementación. Referenciado desde §C.2. |

---

*Este documento es la autoridad funcional del algoritmo conversacional de AITOS.  
Toda implementación o refactor debe cumplir estas reglas.  
Ningún cambio de código puede realizarse sin verificar que no viola los invariantes I-01 a I-15.*
