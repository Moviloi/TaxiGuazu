# Functional & Behavioral Specification — AITOS

> **Versión:** 1.0  
> **Propósito:** Fuente de Verdad funcional del sistema conversacional AITOS.  
> **Autoridad:** Deriva de AITOS LAB, ADRs vigentes, Architecture Freeze, CX-1, QA-1, QA-2, QA-2B, Conversation Acceptance Tests y documentación del proyecto.  
> **Este documento describe el comportamiento *esperado*, no necesariamente el *implementado*.**  
> **Toda corrección, auditoría o desarrollo nuevo debe compararse contra esta especificación.**

---

## Tabla de Contenidos

1. [Objetivos del sistema](#1-objetivos-del-sistema)
2. [Alcance y límites](#2-alcance-y-límites)
3. [Requerimientos Funcionales](#3-requerimientos-funcionales)
4. [Requerimientos No Funcionales](#4-requerimientos-no-funcionales)
5. [Principios Conversacionales](#5-principios-conversacionales-derivados-de-aitos-lab)
6. [Modelo conversacional esperado](#6-modelo-conversacional-esperado)
7. [Ciclo de vida de una conversación](#7-ciclo-de-vida-de-una-conversación)
8. [Estados conversacionales permitidos](#8-estados-conversacionales-permitidos)
9. [Evolución de la intención](#9-evolución-de-la-intención)
10. [Gestión del contexto](#10-gestión-del-contexto)
11. [Gestión de hechos confirmados](#11-gestión-de-hechos-confirmados)
12. [Gestión de ambigüedades](#12-gestión-de-ambigüedades)
13. [Política de actualización incremental del contexto](#13-política-de-actualización-incremental-del-contexto)
14. [Política de repreguntas](#14-política-de-repreguntas)
15. [Política de confirmaciones](#15-política-de-confirmaciones)
16. [Política de resolución de entidades](#16-política-de-resolución-de-entidades)
17. [Política de cotización](#17-política-de-cotización)
18. [Política de reserva](#18-política-de-reserva)
19. [Política de escalamiento](#19-política-de-escalamiento)
20. [Invariantes conversacionales](#20-invariantes-conversacionales)
21. [Casos esperados de actualización de contexto](#21-casos-esperados-de-actualización-de-contexto)
22. [Casos esperados de reemplazo de contexto](#22-casos-esperados-de-reemplazo-de-contexto)
23. [Casos donde sí corresponde reiniciar una conversación](#23-casos-donde-sí-corresponde-reiniciar-una-conversación)
24. [Algoritmo conceptual esperado para cada turno](#24-algoritmo-conceptual-esperado-para-cada-turno)
25. [Expected Behavioral Reference](#25-expected-behavioral-reference)

---

## 1. Objetivos del sistema

El sistema AITOS (AI Transportation Operating System) convierte lenguaje humano ambiguo —recibido principalmente a través de WhatsApp— en operaciones de logística de transporte ejecutables.

### Objetivos primarios

1. **Clasificar** la intención del usuario en cada mensaje (saludo, consulta, reserva, ahora, emergencia, etc.).
2. **Extraer** datos operativos (origen, destino, pasajeros, horario, vuelo) del lenguaje natural.
3. **Resolver** ubicaciones ambiguas mediante interacción contextual o inferencia automática.
4. **Cotizar** tarifas oficiales para traslados simples y multi-tramo.
5. **Ejecutar** viajes inmediatos (AHORA) con despacho a conductores.
6. **Reservar** viajes futuros (RESERVA) con confirmación del usuario.
7. **Escalar** a operador humano cuando la confianza es insuficiente o el caso lo requiere.

### Promesa fundamental

El sistema siempre responde con una de tres acciones:

| Acción | Significado | Cuándo |
|--------|-------------|--------|
| **EXECUTE** | Ejecutar una operación (crear viaje, despachar) | Intención clara + slots completos + confirmación |
| **ANSWER** | Responder una pregunta (precio, información) | Consulta comercial o informativa |
| **CLARIFY** | Pedir más información | Slots incompletos, ambigüedad, baja confianza |

Nunca debe silenciosamente descartar un mensaje ni inventar información.

---

## 2. Alcance y límites

### Dentro del alcance

- Conversaciones en español (primario), portugués e inglés.
- Traslados tipo transfer (privado, puerta a puerta o punto a punto).
- Zona de operación: Triple Frontera (Puerto Iguazú AR, Foz do Iguaçu BR, Ciudad del Este PY).
- Viajes simples (origen ↔ destino) y multi-tramo (varias paradas con descuento por concentración).
- Cotización de tarifas oficiales.
- Despacho a conductores mediante escalamiento por niveles.
- Encuestas post-servicio.
- Aprendizaje de patrones de conversación y tarifas.

### Fuera del alcance

- No es un chatbot de propósito general.
- No es un CRM ni sistema de gestión de clientes.
- No es un motor de reservas estilo "booking.com".
- No es un sistema multi-tenant.
- No maneja pagos directamente (solo cotización, el pago se gestiona fuera del sistema).
- No maneja flota propia (los conductores son partners independientes).
- No reemplaza al operador humano en casos complejos.

---

## 3. Requerimientos Funcionales

### RF-01 — Recepción de mensajes

El sistema debe recibir mensajes de WhatsApp a través del webhook de Meta Cloud API, verificando firma HMAC, aplicando rate limiting por teléfono (10 msg/60s), y deduplicando por ID de mensaje.

### RF-02 — Clasificación de intención

El sistema debe clasificar cada mensaje en una de las siguientes intenciones:

| Intención | Descripción |
|-----------|-------------|
| `GREETING` | Saludo sin contenido operativo |
| `BOOKING` | Solicitud de reserva o viaje |
| `NOW` | Solicitud de viaje inmediato |
| `CONSULTA` | Consulta general |
| `COMMERCIAL` | Pregunta de precio |
| `PRE_BOOKING` | Intención de reservar sin compromiso |
| `EMERGENCY` | Emergencia o urgencia |
| `RESCHEDULE` | Reprogramación |
| `POST_SERVICE` | Mensaje post-viaje |
| `INFORMATIONAL` | Solicitud de información |
| `AMBIGUOUS` | No se pudo determinar la intención |
| `UNKNOWN` | Intención no reconocida |

La clasificación debe ser determinista (basada en patrones, no en LLM).

### RF-03 — Extracción de slots

El sistema debe extraer hasta 6 slots operativos del lenguaje natural:

| Slot | Tipo | Fuente |
|------|------|--------|
| `origin` | Lugar | Texto del usuario + resolución geo |
| `destination` | Lugar | Texto del usuario + resolución geo |
| `passengers` | Número (1-99) | Texto del usuario |
| `scheduled_at` | Fecha/hora | Texto del usuario |
| `flight` | String | Texto del usuario |
| `price` | Número | Motor de tarifas (no del usuario) |

### RF-04 — Resolución geográfica

El sistema debe resolver referencias a lugares utilizando:
1. Alias exactos (ej. "IGR" → "Aeropuerto IGR")
2. Nombres canónicos exactos
3. Fuzzy matching (distancia Levenshtein ≤ 3)
4. Lugares del sistema (base de datos de lugares, no de Google Maps)

### RF-05 — Cotización de tarifas

El sistema debe calcular el precio de un traslado dados origen, destino y cantidad de pasajeros, utilizando una jerarquía de resolución de tarifas:
1. Lugar → Lugar (más específico)
2. Lugar → Zona / Zona → Lugar
3. Zona → Zona
4. No encontrado → precio 0 (escalar a humano)

### RF-06 — Despacho a conductores

El sistema debe despachar viajes AHORA a conductores mediante escalamiento por niveles:
1. Conductor principal (timeout: 1 hora)
2. Conductor secundario (timeout: 30 min)
3. Broadcast a todos (timeout: 8 min)
4. Waiting driver (timeout: 3 min)
5. Escalamiento humano

### RF-07 — Confirmación de usuario

Antes de ejecutar cualquier viaje, el sistema debe:
1. Mostrar resumen con origen, destino, precio y pasajeros.
2. Ofrecer botones de confirmación [Confirmar, Cambiar].
3. Esperar confirmación explícita del usuario.
4. Solo entonces crear el viaje e iniciar despacho.

### RF-08 — Gestión de ambigüedad geográfica

Cuando un lugar tiene múltiples coincidencias en la base de datos (ej. "aeropuerto" → IGR, IGU, AGT), el sistema debe:
1. Intentar resolución automática mediante IA (LLM) con contexto conversacional.
2. Si la IA no puede resolver con alta confianza, preguntar al usuario mostrando opciones.
3. Si un slot se resuelve, usar ese contexto para resolver el otro slot automáticamente.

### RF-09 — Actualización incremental de slots

El sistema nunca debe sobrescribir slots previos a menos que el mensaje actual contradiga explícitamente el valor anterior.

### RF-10 — Post-venta

El sistema debe enviar encuesta de satisfacción 24 horas después de cada viaje completado.

---

## 4. Requerimientos No Funcionales

### RNF-01 — Determinismo del núcleo

El CORE (clasificador de intención) debe ser una función pura, sin efectos secundarios, sin llamadas a LLM, sin acceso a base de datos. Debe producir la misma salida para la misma entrada siempre.

### RNF-02 — LLM opcional

El sistema debe funcionar correctamente si todas las APIs de LLM (Gemini, Groq) no están disponibles. En ese caso, debe degradar gracefulmente usando fallbacks deterministas (regex, plantillas).

### RNF-03 — Triple fallback

Toda ruta crítica debe implementar tres capas de resolución:
```
Rápido determinista → Heurístico/DB → LLM → Null seguro
```

### RNF-04 — Phone como identidad

No deben existir sesiones anónimas. El número de teléfono de WhatsApp es el identificador único de la conversación.

### RNF-05 — Sin escritura directa desde AI

Los módulos de AI (`src/lib/ai/`) no deben escribir directamente en la base de datos. Solo los Services y Lead pueden hacerlo.

### RNF-06 — Idempotencia

Mensajes duplicados de WhatsApp no deben producir acciones duplicadas (viajes duplicados, cargos duplicados).

### RNF-07 — Tiempo de respuesta

El webhook principal debe responder en menos de 10 segundos (límite de Vercel). Operaciones largas deben delegarse a endpoints cron.

### RNF-08 — Política antes de Output

Ninguna respuesta puede generarse sin pasar por la capa de Policy. Policy decide, Output renderiza.

### RNF-09 — Schema Parity

El esquema de base de datos en código (`initSchema`) debe reflejar exactamente el esquema de producción.

---

## 5. Principios Conversacionales derivados de AITOS LAB

Estos principios se extraen de la operación real del sistema, las auditorías CX-1 y QA-2B, y la evolución del proyecto.

### P1 — Un solo dato por vez

El sistema debe preguntar UN campo a la vez. Nunca debe enumerar múltiples campos faltantes en una sola pregunta.

**Fundamento:** Los usuarios de WhatsApp responden mejor a preguntas simples y secuenciales. Preguntar "¿Cuál es el origen y el destino y los pasajeros?" abruma y produce respuestas incompletas.

### P2 — Preservar el contexto a toda costa

El sistema nunca debe "olvidar" un slot que el usuario ya proporcionó. Si el usuario dice "Hotel Amerian" y antes dijo "del aeropuerto", el sistema debe recordar que el origen es "aeropuerto" y el destino es "Hotel Amerian".

**Fundamento:** Es la queja número 1 de los usuarios reales: "ya te dije eso". La pérdida de contexto destruye la confianza.

### P3 — No repetir preguntas

Si el usuario ya respondió una pregunta, el sistema no debe volver a preguntarla en el mismo turno ni en turnos subsiguientes, a menos que el usuario explícitamente la contradiga.

**Fundamento:** La repetición es percibida como incompetencia.

### P4 — Confirmar antes de ejecutar

El sistema nunca debe crear un viaje o despachar un conductor sin confirmación explícita del usuario. La confirmación debe incluir origen, destino, precio y pasajeros.

**Fundamento:** Un viaje incorrecto tiene costos operativos y de confianza. La confirmación es el guardrail final.

### P5 — La ambigüedad se resuelve, no se ignora

Cuando un lugar es ambiguo (múltiples coincidencias), el sistema debe resolverlo activamente, no asumir el primero ni continuar con datos incompletos.

**Fundamento:** Asumir el lugar incorrecto produce cotizaciones y despachos erróneos.

### P6 — Lenguaje natural, no formularios

El sistema debe entender "del aeropuerto al centro" y "origen aeropuerto destino centro" como equivalentes. No debe forzar al usuario a usar un formato específico.

**Fundamento:** Los usuarios de WhatsApp escriben como hablan, no como llenan formularios.

### P7 — La conversación no es el negocio

Los slots operativos (origen, destino, pasajeros, horario, precio) son la verdad canónica. El texto de la conversación es efímero. El sistema opera sobre slots, no sobre el historial de chat.

**Fundamento:** El historial de chat puede tener errores, contradicciones y ruido. Los slots son el estado depurado.

### P8 — Una sola clasificación por mensaje

Cada mensaje debe clasificarse una sola vez en el pipeline. La doble clasificación (como ocurría en QB-05) produce decisiones inconsistentes y duplica procesamiento.

**Fundamento:** Dos ejecuciones de `core()` pueden producir resultados distintos si hay estado compartido o efectos secundarios.

### P9 — La intención evoluciona, no se reemplaza

La intención del usuario debe evolucionar naturalmente: un saludo seguido de un pedido debe resultar en BOOKING, no en GREETING. La intención previa debe influir en la clasificación actual.

**Fundamento:** "Hola" → "necesito un taxi" → "desde el aeropuerto" es una secuencia BOOKING. Clasificar "desde el aeropuerto" como CONSULTA (porque "aeropuerto" es ambiguo) rompe el flujo.

### P10 — El slot_state es la fuente de verdad para slots

Cada slot debe tener un estado (`RAW → INFERRED → CONFIRMATION_PENDING → CONFIRMED`) que determina si puede usarse para pricing, confirmación o despacho. Una vez CONFIRMED, un slot no debe cambiar sin intervención explícita del usuario.

**Fundamento:** El estado del slot protege contra decisiones prematuras basadas en datos no verificados.

---

## 6. Modelo conversacional esperado

### Arquitectura conceptual

```
Mensaje del usuario
    │
    ▼
┌──────────────┐
│  RECEPCIÓN   │  Verificar firma, rate limit, idempotencia
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  CLASIFICAR  │  Determinar intención (CORE) — función pura, determinista
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  INTERPRETAR │  Clasificar tipo de mensaje (nuevo pedido, respuesta a pregunta,
│  MENSAJE     │  afirmación, negación, small talk, etc.)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  COMPRENDER  │  Evaluar confianza general de la conversación
│              │  (FULL_CONTROL → CLARIFICATION → RECOVERY → ESCALATION)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  EXTRAER     │  Extraer slots del mensaje (LLM + regex fallback)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  RESOLVER    │  Resolver ambigüedades geográficas
│  ENTIDADES   │  Ubicar lugares en la base de datos
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  ACTUALIZAR  │  Fusionar slots nuevos con previos (sin sobrescribir)
│  CONTEXTO    │  Actualizar estado conversacional
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  COTIZAR     │  Calcular precio si hay origen + destino + pasajeros
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  DECIDIR     │  Router: ¿EXECUTE, ANSWER o CLARIFY?
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  RESPONDER   │  Policy construye la respuesta según el dominio
│              │  (información, comercial, reserva, ahora)
└──────┬───────┘
       │
       ▼
   Mensaje al usuario
```

### Flujo conceptual por dominio

```
INFORMATION (saludo, consulta general):
  └─ CLARIFY: responder saludo o pedir más datos

COMMERCIAL (pregunta de precio):
  └─ ¿Slots completos? → ANSWER con precio
  └─ ¿Slots incompletos? → CLARIFY para completar

BOOKING / NOW (reserva / viaje inmediato):
  └─ ¿Slots completos + confirmación? → EXECUTE (crear viaje + despachar)
  └─ ¿Slots completos + sin confirmar? → CLARIFY con resumen + pedir confirmación
  └─ ¿Slots incompletos? → CLARIFY preguntando el siguiente campo faltante

AMBIGUOUS / baja confianza:
  └─ SAFE_FALLBACK: respuesta genérica + escalar a humano si persiste
```

---

## 7. Ciclo de vida de una conversación

### Fases de una conversación típica

```
Fase 1: INICIO
  Usuario envía primer mensaje → sistema identifica intención
  │
  ▼
Fase 2: RECOLECCIÓN DE SLOTS
  Sistema pregunta campos de a uno por vez
  Usuario responde con datos parciales
  Cada respuesta se fusiona incrementalmente
  │
  ▼
Fase 3: RESOLUCIÓN DE AMBIGÜEDADES (si aplica)
  Sistema detecta lugares ambiguos
  Resuelve por IA o preguntando al usuario
  │
  ▼
Fase 4: CONFIRMACIÓN DE SLOTS
  Sistema muestra resumen con origen, destino, precio
  Usuario confirma o solicita cambios
  │
  ▼
Fase 5: RECOLECCIÓN DE PASAJEROS (si no se proporcionaron antes)
  Sistema pregunta cantidad de pasajeros
  Usuario responde
  Se recotiza con la cantidad exacta
  │
  ▼
Fase 6: CONFIRMACIÓN FINAL
  Sistema muestra precio final con pasajeros
  Usuario confirma
  │
  ▼
Fase 7: EJECUCIÓN
  Viaje AHORA: se crea el viaje y se inicia despacho a conductores
  Viaje RESERVA: se crea el viaje en estado pendiente
  Sistema envía resumen de confirmación
  │
  ▼
Fase 8: POST-VIAJE (24h después)
  Sistema envía encuesta de satisfacción
  Usuario califica la experiencia
```

### Duración esperada

| Escenario | Turnos esperados | Turnos máximos aceptables |
|-----------|-----------------|--------------------------|
| Consulta de precio simple | 1-2 | 3 |
| Reserva completa sin ambigüedad | 5-7 | 10 |
| Reserva con ambigüedad geográfica | 6-9 | 12 |
| Viaje inmediato (AHORA) | 5-7 | 10 |
| Reprogramación | 2-3 | 4 |

---

## 8. Estados conversacionales permitidos

### Mapa de estados

```
                  ┌─────────────┐
                  │    idle     │  ← Estado inicial / post-ejecución
                  └──────┬──────┘
                         │ Mensaje con intención operativa
                         ▼
                  ┌─────────────┐
             ┌───→│ collecting_ │  ← Recolectando slots (origen, destino, etc.)
             │    │   slots     │
             │    └──────┬──────┘
             │           │ Lugar ambiguo detectado
             │           ▼
             │    ┌─────────────┐
             │    │  ambiguity_ │  ← Resolviendo ambigüedad geográfica
             │    │  pending    │
             │    └──────┬──────┘
             │           │ Ambigüedad resuelta
             │           ▼
             │    ┌─────────────┐
             │    │ collecting_ │  ← Vuelve a recolección si faltan slots
             │    │   slots     │
             │    └──────┬──────┘
             │           │ Slots completos
             │           ▼
             │    ┌─────────────┐
             │    │    slot_    │  ← Mostrando resumen para confirmación
             │    │confirmation │
             │    └──────┬──────┘
             │           │ Usuario confirma / avanza
             │           ▼
             │    ┌─────────────┐
             │    │  awaiting_  │  ← Preguntando cantidad de pasajeros
             │    │  passenger  │
             │    └──────┬──────┘
             │           │ Usuario responde
             │           ▼
             │    ┌─────────────┐
             │    │  awaiting_  │  ← Confirmación final antes de ejecutar
             │    │confirmation │
             │    └──────┬──────┘
             │           │ Usuario confirma
             │           ▼
             │    ┌──────────────────┐
             │    │pending_human_    │  ← Viaje creado, pendiente de operador
             │    │review            │    (RESERVA) o despachando (AHORA)
             │    └────────┬─────────┘
             │             │ Viaje completado / resuelto
             │             ▼
             │    ┌─────────────┐
             └────│    idle     │  ← Vuelve a inicio para nueva conversación
                  └─────────────┘
```

### Estados permitidos (lista completa)

| Estado | Descripción | Transiciones válidas hacia |
|--------|-------------|---------------------------|
| `idle` | Conversación inactiva o recién iniciada | `collecting_slots` |
| `collecting_slots` | Recolectando datos operativos | `ambiguity_pending`, `slot_confirmation`, `idle` (por comando) |
| `ambiguity_pending` | Resolviendo ambigüedad de lugar | `collecting_slots`, `slot_confirmation` |
| `slot_confirmation` | Mostrando resumen para confirmación | `collecting_slots` (si usuario cambia algo), `awaiting_passenger` |
| `awaiting_passenger` | Preguntando cantidad de pasajeros | `collecting_slots` (si usuario no dio un número válido), `awaiting_confirmation` |
| `awaiting_confirmation` | Esperando confirmación final | `collecting_slots` (si usuario cancela), ejecutando (viaje), `idle` |
| `pending_human_review` | Viaje requiere revisión humana | `idle` (cuando operador resuelve) |

### Estados NO permitidos

- `ambiguity_pending` sin slots de ambigüedad almacenados
- `slot_confirmation` sin slots completos
- `awaiting_confirmation` sin precio cotizado
- Múltiples estados simultáneos para el mismo teléfono

---

## 9. Evolución de la intención

### Regla de evolución

La intención del mensaje actual (`core().intent`) se combina con la intención del mensaje anterior (`prevIntent`) según estas reglas:

```
1. Si prevIntent es GREETING o AMBIGUOUS:
   → Usar intent actual (el saludo/ambigüedad no persiste)

2. Si intent actual es PRE_BOOKING:
   → Heredar prevIntent (PRE_BOOKING es un estado transitorio)

3. Si intent actual == prevIntent:
   → Mantener la intención (consolidación)

4. Si intent actual != prevIntent:
   → Usar intent actual, a menos que sea un falso positivo
     (ej. "aeropuerto" clasificado como CONSULTA cuando prevIntent es BOOKING)
```

### Casos de evolución esperados

| Secuencia de mensajes | Evolución de intención esperada |
|-----------------------|-------------------------------|
| "Hola" → "Necesito un taxi" → "Desde el aeropuerto" | GREETING → BOOKING → BOOKING |
| "Hola" → "¿Cuánto sale?" → "Del aeropuerto al centro" | GREETING → COMMERCIAL → COMMERCIAL |
| "Necesito un taxi" → "Ahora" → "OK confirmo" | BOOKING → NOW → BOOKING |
| "Buen día" → "Quiero ir al hotel Amerian" → "Desde IGR" | GREETING → BOOKING → BOOKING |
| "Hola" → "Aeropuerto" (sin contexto previo) | GREETING → AMBIGUOUS (o BOOKING si se infiere) |

### Intenciones que NUNCA deben persistir

- `GREETING`: El saludo es transitorio. Si el usuario saluda y luego pide algo, la intención debe evolucionar.
- `AMBIGUOUS`: La ambigüedad debe resolverse, no persistir.
- `UNKNOWN`: Similar a AMBIGUOUS.

---

## 10. Gestión del contexto

### Contexto conversacional

El sistema mantiene dos tipos de contexto:

| Tipo | Almacenamiento | Duración | Contenido |
|------|---------------|----------|-----------|
| **Contexto de sesión** | `chat_sessions` (DB) | Persistente entre turnos | Slots, estado conversacional, idioma |
| **Contexto de request** | Memoria local | Solo durante el turno actual | Historial del turno, resultados temporales |

### Reglas de gestión

1. **El contexto de sesión es la fuente de verdad.** No debe reconstruirse desde el historial de mensajes.
2. **Los slots existentes nunca se sobrescriben** a menos que el mensaje actual contradiga explícitamente el valor anterior.
3. **El `prevIntent` se almacena** en el contexto de sesión después de cada turno.
4. **El `clarify_field` indica qué slot se está preguntando.** Si el usuario responde, ese slot debe actualizarse.
5. **El contexto se preserva incluso si el CORE clasifica el mensaje actual con baja confianza.** Solo comandos explícitos (`.limpiar`) deben reiniciarlo.

### Datos que componen el contexto de sesión

```
chat_sessions {
  phone: string (PK)
  slots: JSON {
    origin?: { value, display, score, reason, source, status }
    destination?: { value, display, score, reason, source, status }
    passengers?: { value, score, reason, source, status }
    scheduled_at?: { value, score, reason, source, status }
    flight?: { value, score, reason, source, status }
    price?: { value, score, reason, source, status }
    __ambiguity?: AmbiguityState  // estado temporal de ambigüedad
  }
  conversational_state: string  // idle | collecting_slots | ...
  clarify_field: string | null  // slot que se está preguntando actualmente
  lang: string  // idioma detectado
  last_intent: string  // última intención clasificada
}
```

---

## 11. Gestión de hechos confirmados

### Ciclo de vida de un slot

```
RAW ──────────→ INFERRED ──────────→ CONFIRMATION_PENDING ──────────→ CONFIRMED
 │                    │                        │
 │                    │                        ├── USER_CORRECTED ──→ CONFIRMED
 │                    │                        │
 │                    │                        └── USER_CONFIRMED ──→ CONFIRMED
 │                    │
 │                    └── (nunca retrocede a RAW sin intervención explícita)
 │
 └── (nunca se usa directamente para decisiones operativas)
```

### Significado de cada estado

| Estado | Significado | ¿Se usa para pricing? | ¿Se usa para dispatch? |
|--------|-------------|----------------------|------------------------|
| `RAW` | Extraído del texto, no verificado | ❌ | ❌ |
| `INFERRED` | Inferido con confianza media/alta | ✅ (con advertencia) | ❌ |
| `CONFIRMATION_PENDING` | Pendiente de confirmación del usuario | ✅ | ❌ |
| `CONFIRMED` | Explícitamente confirmado por el usuario | ✅ | ✅ |
| `USER_CORRECTED` | Corregido por el usuario tras mostrar resumen | ✅ | ✅ |
| `USER_CONFIRMED` | Confirmado explícitamente por el usuario tras revisión | ✅ | ✅ |

### Reglas de transición

1. Un slot recién extraído comienza como `RAW` o `INFERRED` según la confianza.
2. Solo `CONFIRMED` (y sus variantes) puede usarse para despacho.
3. Cualquier slot puede volver a `RAW` si el usuario explícitamente lo contradice.
4. La transición a `CONFIRMED` ocurre cuando el usuario ve el resumen y confirma.
5. La transición a `USER_CORRECTED` ocurre cuando el usuario modifica un slot durante la revisión.

---

## 12. Gestión de ambigüedades

### Detección de ambigüedad

Un lugar se considera **ambiguo** cuando coincide con el patrón `AMBIGUOUS_LOCATION_RE` o cuando la búsqueda en la base de datos devuelve múltiples resultados para el mismo término.

### Patrones ambiguos conocidos

| Término | Posibles significados |
|---------|-----------------------|
| "aeropuerto" | IGR (Argentina), IGU (Brasil), AGT (Paraguay) |
| "centro" / "microcentro" | Centro de Puerto Iguazú, Centro de Foz, Microcentro de CDE |
| "aduana" / "frontera" | Aduana Tancredo Neves (lado AR), Aduana de Foz (lado BR) |
| "hotel" + nombre | Múltiples hoteles pueden tener el mismo nombre |
| "iguazú" | Puede referirse a Puerto Iguazú (AR) o Foz do Iguaçu (BR) |

### Algoritmo de resolución

```
1. Detectar ambigüedad (patrón o múltiples resultados de DB)
2. Intentar resolución automática con IA (LLM):
   a. Pasar el texto original del usuario + lista de candidatos
   b. Si la IA retorna "high confidence" con un candidato → resolver automáticamente
3. Si la IA no puede resolver:
   a. Detectar si es un "risk node" (aeropuerto, centro, aduana)
   b. Si es risk node → preguntar al usuario con opciones específicas
   c. Si no es risk node → preguntar contextualmente sin listar opciones
4. Si un slot se resuelve y el otro es ambiguo:
   a. Reintentar la resolución del segundo slot usando el primero como contexto
   b. Si hay alta confianza → resolver automáticamente
5. Almacenar estado de ambigüedad en la sesión
6. Cuando ambos slots están resueltos → finalizar ambigüedad y continuar flujo
```

### Reglas de UX para preguntas de ambigüedad

| Caso | Comportamiento esperado |
|------|------------------------|
| Risk node (aeropuerto, centro, aduana) | Mostrar opciones numeradas |
| Lugar no-risk con múltiples DB matches | Pregunta contextual SIN opciones |
| Un slot resuelto, el otro ambiguo | Usar contexto para resolver automáticamente |
| Ambigüedad resuelta por IA | Continuar sin preguntar al usuario |

---

## 13. Política de actualización incremental del contexto

### Principio fundamental

> El contexto conversacional es **acumulativo**. Cada turno agrega información al estado existente. Nunca reemplaza el estado a menos que el nuevo mensaje contradiga explícitamente el valor anterior.

### Reglas de merge

```
DADO: estado actual con slots = { origin: "Aeropuerto IGR", destination: ?, passengers: ? }
      nuevo mensaje: "Hotel Esturión"

1. Ejecutar CORE sobre "Hotel Esturión"
   → facts = ["location_ambiguous:true"], intent = CONSULTA
   → NO extrae origin ni destination explícitos

2. Ejecutar extracción sobre "Hotel Esturión"
   → LLM extrae: destination = "Hotel Esturión"

3. Fusionar con estado actual:
   → origin: "Aeropuerto IGR" (se PRESERVA, no se contradice)
   → destination: "Hotel Esturión" (se AGREGA, no existía antes)
   → passengers: valor previo (se PRESERVA)
```

### Reglas de contradicción

Se considera que un nuevo mensaje **contradice** un slot previo cuando:

1. El mensaje contiene un valor explícito para el mismo slot con signo de cambio.
   - "No, no es el aeropuerto, es el centro" → contradice origin
2. El mensaje contiene una negación explícita seguida de un nuevo valor.
   - "Cambio el destino, quiero ir al hotel" → contradice destination
3. El mensaje es una corrección ("No", "mal", "error", "corrijo") y proporciona un nuevo valor.

Lo que NO constituye contradicción:

1. El nuevo mensaje no menciona el slot en absoluto.
2. El nuevo mensaje confirma el slot ("sí", "correcto", "ok").
3. El nuevo mensaje proporciona información para OTRO slot (ej. pasajeros cuando se preguntaba destino).

### Comportamiento esperado en cada escenario

Ver secciones [21](#21-casos-esperados-de-actualización-de-contexto) y [22](#22-casos-esperados-de-reemplazo-de-contexto).

---

## 14. Política de repreguntas

### Orden de preguntas

El sistema debe preguntar los campos en este orden, UNO a la vez:

```
1. origin          (¿Cuál es el origen / punto de partida?)
2. destination     (¿A dónde querés ir?)
3. passengers      (¿Cuántos pasajeros son?)
4. scheduled_at    (¿Cuándo querés el viaje?) — solo si no hay señales temporales
```

**Excepción:** Si el usuario ya proporcionó un campo en el mensaje actual, se salta automáticamente.

### Reglas de repregunta

1. **Nunca preguntar lo que ya se sabe.** Si un slot está CONFIRMED, no volver a preguntarlo.
2. **Una sola pregunta por turno.** El sistema nunca debe enumerar múltiples campos faltantes.
3. **Usar el `clarify_field`** para indicar qué slot se está preguntando. Si el usuario responde algo que claramente es para OTRO slot, el sistema debe actualizar el slot correcto.
4. **Contexto sobre sintaxis.** Si el usuario dice "Hotel Esturión" y el `clarify_field` es `destination`, el sistema debe interpretarlo como destino aunque la sintaxis no lo indique explícitamente.
5. **No repetir la misma pregunta si el usuario ya respondió** aunque la respuesta sea parcial o diferente a lo esperado.

### Preguntas que NUNCA deben hacerse

- "¿Cuál es el origen?" si el usuario ya lo proporcionó.
- "¿Cuántos pasajeros?" si el usuario ya dijo "2 pasajeros".
- "¿A dónde querés ir?" si el usuario ya dijo "al Hotel Esturión".
- "¿Me repetís tu mensaje?" — en su lugar, usar comprensión o escalar.

---

## 15. Política de confirmaciones

### Cuándo confirmar

El sistema debe solicitar confirmación explícita en estos casos:

1. **Antes de crear cualquier viaje** (AHORA o RESERVA).
2. **Antes de despachar un conductor.**
3. **Cuando el precio supera un umbral** (definido por configuración).
4. **Cuando hay múltiples opciones de ruta** (multi-tramo con descuentos).

### Formato de confirmación

```
🔍 *Resumen de tu viaje*
Origen: Aeropuerto IGR (Argentina)
Destino: Hotel Amerian (Puerto Iguazú)
Pasajeros: 2
Precio: $15.000 ARS

¿Está todo bien?

[Confirmar] [Cambiar]
```

### Flujo de confirmación

```
1. Sistema muestra resumen con botones [Confirmar, Cambiar]
2. Estado → slot_confirmation

   Si usuario hace clic en "Confirmar":
     → Estado → awaiting_passenger (si faltan pasajeros)
     → Estado → awaiting_confirmation (si ya hay pasajeros)
     → Avanzar a pricing + ejecución

   Si usuario hace clic en "Cambiar":
     → Estado → collecting_slots
     → Preguntar qué desea cambiar

   Si usuario responde con texto:
     → "sí", "ok", "confirmo", "dale", "si" → tratar como confirmación
     → "no", "cambio", "modificar", "corregir" → tratar como cambio
     → Cualquier otro texto → extraer posibles correcciones de slots
```

### Reglas de interpretación de respuestas

| Respuesta del usuario | Interpretación esperada |
|-----------------------|------------------------|
| "Sí", "Ok", "Confirmo", "Dale", "Si" | Afirmación → avanzar |
| "No", "Cambio", "Modificar", "Corregir", "Espera" | Negación → volver a recolección |
| "Quiero cambiar el destino" | Cambio específico → actualizar destino |
| "Somos 3" | Respuesta a awaiting_passenger → actualizar pasajeros |
| "Hotel Esturión" (cuando clarify_field es destination) | Valor para destination → actualizar |

---

## 16. Política de resolución de entidades

### Jerarquía de resolución de lugares

```
1. Alias exacto
   "IGR" → place_id = "aeropuerto-igr"
   
2. Nombre canónico exacto (case insensitive)
   "Aeropuerto IGR" → place_id = "aeropuerto-igr"
   
3. Fuzzy match (Levenshtein ≤ 3)
   "Aeropuerto IGR" ~ "Aeropuerto IGR" (distancia 0)
   "Hotel Amerian" ~ "Hotel Amerian" (distancia 0)
   "Esturion" ~ "Esturión" (distancia 1, por acento)
   
4. Búsqueda por término parcial
   "Hotel" → lista de hoteles candidatos (si es ambiguo, resolver)
```

### Resolución de cantidad de pasajeros

```
1. Palabra a número: "uno" → 1, "dos" → 2, "tres" → 3, etc.
2. Número directo: "2", "3", "4"
3. Frase completa: "somos 2 personas" → 2
4. Rango: "hasta 4" → 4 (valor máximo)
5. Si no se puede determinar → preguntar
```

### Resolución de fecha y hora

```
1. Ahora/urgente: "ahora", "ya", "urgente", "inmediato", "al toque" → NOW
2. Hoy: "hoy", "hoy a las 8" → fecha actual + hora extraída
3. Mañana: "mañana", "mañana a las 10" → fecha siguiente + hora extraída
4. Fecha específica: "viernes", "20 de julio", "pasado mañana"
5. Hora específica: "a las 8", "8:30", "las 9 de la noche"
6. Si no se puede determinar → asumir NOW si hay urgencia, si no, preguntar
```

---

## 17. Política de cotización

### Jerarquía de tarifas

```
Prioridad 1: Lugar específico → Lugar específico
  Ej: "Aeropuerto IGR" → "Hotel Amerian"
  → Precio más exacto y confiable

Prioridad 2: Lugar específico → Zona
  Ej: "Aeropuerto IGR" → "Centro de Puerto Iguazú"
  → Precio basado en zona de destino

Prioridad 3: Zona → Lugar específico
  Ej: "Centro de Puerto Iguazú" → "Hotel Amerian"
  → Precio basado en zona de origen

Prioridad 4: Zona → Zona
  Ej: "Centro" → "Zona Norte"
  → Precio genérico por zonas

No encontrado: final_price = 0
  → El precio se omite, el viaje se deriva a revisión humana
```

### Reglas de cotización

1. **El precio siempre proviene de la base de datos de tarifas**, nunca del LLM.
2. **El precio se calcula después de tener origen + destino + pasajeros.**
3. **El precio se actualiza si cambian los pasajeros.**
4. **Si el precio es 0 (no encontrado), el viaje continúa pero requiere revisión humana.**
5. **Para viajes multi-tramo, se aplica descuento por concentración (hub discount).**
6. **El precio incluye markup y ajustes de proveedor.**

---

## 18. Política de reserva

### Flujo de reserva (RESERVA)

```
1. Usuario manifiesta intención de reservar (BOOKING)
2. Recolectar slots:
   a. ¿Origen? → preguntar
   b. ¿Destino? → preguntar
   c. ¿Pasajeros? → preguntar
   d. ¿Cuándo? → detectar o preguntar
3. Resolver ambigüedades geográficas si las hay
4. Cotizar tarifa
5. Mostrar resumen y pedir confirmación de slots
6. Si el usuario confirma slots pero faltan pasajeros → preguntar pasajeros
7. Si el usuario confirma todo → awaiting_confirmation
8. Usuario confirma → crear viaje (trip) en estado QUOTED o CONFIRMED
9. Si es RESERVA (no AHORA) → pending_human_review
10. Si es AHORA → iniciar despacho
```

### Flujo de viaje inmediato (AHORA)

```
Similar a RESERVA, pero:
- Al confirmar, se inicia despacho inmediato
- timeout de confirmación más corto
- Se prioriza velocidad sobre completitud
- Si faltan pasajeros → asumir 1 y recotizar después
```

### Diferencias clave entre RESERVA y AHORA

| Aspecto | RESERVA | AHORA |
|---------|---------|-------|
| Despacho | No inmediato (pendiente de operador) | Inmediato (nivel 1) |
| Pasajeros | Se pregunta antes de confirmar | Se puede asumir 1 si no se sabe |
| Precio | Se muestra siempre | Se muestra siempre |
| Confirmación | Requerida | Requerida |
| Tono | Tranquilo, informativo | Urgente, directo |
| Post-creación | pending_human_review | despacho activo |

---

## 19. Política de escalamiento

### Niveles de comprensión

El sistema evalúa la confianza general de la conversación en cada turno y escala según este criterio:

| Nivel | Score | Comportamiento |
|-------|-------|----------------|
| `FULL_CONTROL` | ≥ 0.85 | Procesar normalmente |
| `CLARIFICATION` | 0.65 - 0.84 | Procesar con cuidado, respuestas más simples |
| `RECOVERY` | 0.40 - 0.64 | Repreguntar, no ejecutar operaciones |
| `ESCALATION` | < 0.40 | Escalar a operador humano |

### Factores que afectan la confianza

| Factor | Peso | Descripción |
|--------|------|-------------|
| Intención clara | 30% | ¿El CORE clasificó con alta confianza? |
| Entidad reconocida | 25% | ¿Se extrajeron entidades conocidas? |
| Completitud de slots | 20% | ¿Hay suficientes slots para operar? |
| Extracción válida | 15% | ¿La extracción LLM fue exitosa? |
| Estabilidad conversacional | 10% | ¿El usuario mantiene el mismo tema? |

### Cuándo escalar a humano

1. **Comprensión ESCALATION** en 2+ turnos consecutivos.
2. **Usuario pide explícitamente un operador humano.**
3. **Precio no encontrado** y usuario quiere continuar.
4. **Error interno del sistema** que impide responder.
5. **Usuario insiste** en un lugar o servicio fuera del alcance.
6. **Múltiples reintentos fallidos** de ambigüedad.

### Mecanismo de escalamiento

```
ESCALATION:
  └─ Mensaje al usuario: "Te conecto con un operador humano..."
  └─ Notificación a admin: "Cliente necesita asistencia: [detalles]"
  └─ Estado: pending_human_review
  └─ Se preserva todo el contexto para el operador
```

---

## 20. Invariantes conversacionales

Estos son los invariantes que NUNCA deben violarse. Si un cambio los viola, debe ser rechazado.

### I-C1 — No perder contexto

El sistema nunca debe olvidar un slot que el usuario ya proporcionó. Específicamente:
- Si el usuario dijo "desde el aeropuerto" en el turno 3, el turno 4 debe recordar `origin: "aeropuerto"`.
- La única forma de perder contexto es el comando explícito `.limpiar` o una corrección del usuario.

### I-C2 — No doble clasificación

Cada mensaje debe clasificarse una sola vez por el CORE. Dos ejecuciones de `core()` sobre el mismo texto pueden producir resultados distintos (QB-05).

### I-C3 — No preguntar lo ya sabido

El sistema no debe preguntar por un campo que ya está CONFIRMED en el contexto de sesión. Ejemplo:
- Usuario ya dijo "al Hotel Esturión" → no preguntar "¿A dónde querés ir?" en el mismo turno ni en el siguiente.

### I-C4 — No responder sin clasificar

Toda respuesta debe estar precedida por una clasificación de intención (`core()`). No se puede enviar un mensaje al usuario sin saber qué quiere.

### I-C5 — No ejecutar sin confirmar

No se puede crear un viaje ni despachar un conductor sin confirmación explícita del usuario.

### I-C6 — No asumir el primer lugar ambiguo

Si un lugar tiene múltiples coincidencias en DB, el sistema no debe asumir automáticamente la primera. Debe resolver la ambigüedad activamente.

### I-C7 — No silenciar mensajes

Todo mensaje recibido debe producir una respuesta visible para el usuario. Incluso si hay un error, debe enviarse un mensaje de fallback.

### I-C8 — No inventar lugares

El sistema no debe devolver un lugar que no existe en la base de datos. Si no encuentra匹配, debe decirlo y escalar.

### I-C9 — La intención evoluciona, no se congela

El `prevIntent` es una guía, no una regla fija. Si el usuario cambia de tema, la intención debe actualizarse.

### I-C10 — Un solo estado conversacional

Cada teléfono debe tener exactamente un estado conversacional en cada momento. No pueden coexistir múltiples estados.

### I-C11 — Los slots tienen dueño

Cada slot extraído debe tener un `source` (CORE, LLM, regex, user) y un `status` (RAW, INFERRED, CONFIRMATION_PENDING, CONFIRMED). No puede haber slots sin origen.

### I-C12 — El slot_state determina la acción

Solo slots CONFIRMED pueden usarse para dispatch. Slots INFERRED pueden usarse para pricing informativo pero no para ejecución.

---

## 21. Casos esperados de actualización de contexto

### Caso A: Usuario proporciona un slot nuevo

```
Contexto actual: origin = "Aeropuerto IGR" (CONFIRMED), destination = ?, passengers = ?
Mensaje: "Hotel Esturión"
clarify_field: "destination"

Comportamiento esperado:
1. El mensaje se interpreta como respuesta a la pregunta de destino
2. CORE: no extrae roleLock (ningún patrón sintáctico coincide)
3. Extracción LLM: detecta "Hotel Esturión" como posible destino
4. Resolución geo: busca "Hotel Esturión" en DB → encuentra 0 o 1 o varios
5. Si 0 coincidencias → preguntar si es correcto
6. Si 1 coincidencia → actualizar destination = "Hotel Esturión" (INFERRED)
7. Si varias → iniciar resolución de ambigüedad para destination
8. Origin: se PRESERVA sin cambios (no se contradice)
9. NO debe activarse ambigüedad de origin por "aeropuerto" en el contexto
```

### Caso B: Usuario confirma un slot

```
Contexto actual: origin = "aeropuerto" (AMBIGUOUS)
Mensaje: "Sí, el aeropuerto IGR"
clarify_field: "origin" (en estado ambiguity_pending)

Comportamiento esperado:
1. El mensaje confirma el origen
2. Ambiguity handler resuelve: origin = "Aeropuerto IGR"
3. Estado: origin → CONFIRMED
4. Si destination también está resuelta → finalizar ambigüedad
5. Si no → continuar con recolección de destination
```

### Caso C: Usuario proporciona pasajeros

```
Contexto actual: origin = "Aeropuerto IGR" (CONFIRMED), destination = "Hotel Amerian" (CONFIRMED)
Mensaje: "Somos 2"
clarify_field: "passengers"

Comportamiento esperado:
1. Extraer: passengers = 2
2. Recalcular precio con passengers = 2 (si ya había precio para 1)
3. Estado: passengers → INFERRED
4. Avanzar a slot_confirmation o awaiting_confirmation
```

### Caso D: Usuario proporciona información mientras se preguntaba otra cosa

```
Contexto actual: origin = ?, destination = ?, clarify_field = "origin"
Mensaje: "Del aeropuerto al Hotel Esturión"

Comportamiento esperado:
1. CORE: detecta "desde X" → roleLock.origin = "aeropuerto"
2. CORE: detecta "al Y" → roleLock.destination = "Hotel Esturión"
3. Extracción: confirma ambos slots
4. Actualizar: origin = "aeropuerto", destination = "Hotel Esturión"
5. Origin: se salta la pregunta de origin (ya respondida)
6. Destination: se salta la pregunta de destination (ya respondida)
7. Si ambos están completos → avanzar a pricing + confirmación
```

### Caso E: Usuario retoma después de un saludo

```
Contexto actual: origin = "Aeropuerto IGR" (CONFIRMED), destination = "Hotel Amerian" (CONFIRMED)
             state = "slot_confirmation"
Mensaje: "Hola"

Comportamiento esperado:
1. CORE: intent = GREETING
2. QB-01: detectar que hay contexto activo (slots existentes)
3. NO usar el shortcut de saludo vacío
4. Enviar saludo breve + continuar con el flujo actual
5. No perder los slots existentes
6. Mantener el estado slot_confirmation
```

---

## 22. Casos esperados de reemplazo de contexto

### Caso F: Usuario corrige un slot

```
Contexto actual: origin = "Aeropuerto IGR" (CONFIRMED), destination = "Hotel Amerian" (CONFIRMED)
Mensaje: "No, quiero ir al centro, no al hotel"

Comportamiento esperado:
1. Detectar negación + nuevo valor para destination
2. Destination: "Hotel Amerian" → REPLACED por "centro" (RAW)
3. Origin: se PRESERVA
4. Si "centro" es ambiguo → iniciar ambigüedad para destination
5. Recalcular precio con nuevo destino
```

### Caso G: Usuario cambia el origen

```
Contexto actual: origin = "Aeropuerto IGR" (CONFIRMED)
Mensaje: "En realidad salgo del hotel, no del aeropuerto"

Comportamiento esperado:
1. Detectar negación + nuevo valor para origin
2. Origin: "Aeropuerto IGR" → REPLACED por "hotel" (RAW)
3. Si "hotel" es ambiguo → iniciar ambigüedad para origin
4. Recalcular precio
```

### Caso H: Usuario cancela y empieza de nuevo

```
Contexto actual: estado avanzado (awaiting_confirmation)
Mensaje: "No, olvidate, necesito otro viaje"

Comportamiento esperado:
1. Detectar cancelación + nueva intención
2. NO reiniciar la sesión completamente
3. Volver a collecting_slots
4. Preservar datos que el usuario NO contradijo
5. Preguntar de nuevo origen y destino
```

### Caso I: Usuario proporciona un valor para el slot equivocado

```
Contexto actual: state = collecting_slots, clarify_field = "destination"
Mensaje: "Somos 4 pasajeros"

Comportamiento esperado:
1. El mensaje NO responde a "destination"
2. Extraer: passengers = 4
3. Actualizar: passengers = 4
4. NO cambiar clarify_field todavía (destination sigue siendo el que falta)
5. Seguir preguntando por destination
6. Cuando se complete destination → si ya hay passengers, ir a pricing directo
```

---

## 23. Casos donde sí corresponde reiniciar una conversación

### Comando explícito: `.limpiar`

El comando `.limpiar` debe reiniciar COMPLETAMENTE la sesión:
- Todos los slots → eliminados
- Estado conversacional → idle
- clarify_field → null
- prevIntent → null

### Comando explícito: `.reset` o `.start`

Similar a `.limpiar`, reinicia la sesión.

### Error irrecuperable

Si el sistema detecta un estado inconsistente (ej. `ambiguity_pending` sin datos de ambigüedad), puede:
1. Intentar preservar slots CONFIRMED
2. Reiniciar el estado a `collecting_slots`
3. No perder slots operativos

### Intención completamente nueva después de un viaje completado

Después de que un viaje se completa, el estado vuelve a `idle`. El siguiente mensaje del usuario con una nueva intención operativa inicia una nueva conversación:
- Si hay un viaje activo → tratar como POST_BOOKING (follow-up)
- Si no hay viaje activo → empezar de cero (nuevo booking)

### Lo que NO debe reiniciar la conversación

- Un saludo en medio de una conversación activa.
- Un cambio de opinión sobre un slot específico (solo debe cambiar ese slot).
- Una negación en slot_confirmation (debe volver a collecting_slots, no a idle).
- Un error temporal del LLM (debe usar fallback, no reiniciar).

---

## 24. Algoritmo conceptual esperado para cada turno

### Pseudocódigo del flujo por turno

```
FUNCTION procesarTurno(phone, text):
    // ── 1. PRE-PROCESAMIENTO ──
    trimmed = text.trim()
    
    // Comandos de control
    IF trimmed IN [".limpiar", ".reset", ".start"]:
        hardReset(phone)
        RETURN "Sesión reiniciada"
    
    // ── 2. CARGA DE CONTEXTO ──
    session = getChatSession(phone)
    history = getMessageHistory(phone)
    memory = buildMemory(session, history)
    
    // ── 3. CLASIFICACIÓN DE INTENCIÓN (UNA VEZ) ──
    leadCore = core(trimmed, memory.lastIntent)
    // leadCore contiene: intent, facts, confidence, roleLock, slotStability
    
    // ── 4. INTERPRETACIÓN DEL MENSAJE ──
    classification = interpretMessage(
        text = trimmed,
        intent = leadCore.intent,
        slotState = session.conversational_state,
        prevSlots = session.slots,
        clarifyField = session.clarify_field
    )
    
    // ── 5. MANEJO DE ESTADOS ESPECIALES ──
    
    // 5a. Saludo sin contexto → respuesta rápida
    IF leadCore.intent == GREETING AND session está vacía:
        RETURN handleGreeting(phone)
    
    // 5b. Saludo con contexto activo → continuar flujo
    IF leadCore.intent == GREETING AND session tiene datos activos:
        enviarSaludoBreve()
        // CONTINUAR al flujo normal (NO hacer early return)
    
    // 5c. Botón de confirmación
    IF trimmed MATCHES slotButtonPattern:
        RETURN handleSlotButton(phone, trimmed)
    
    // 5d. Estado slot_confirmation + texto (no botón)
    IF session.state == "slot_confirmation":
        IF esAfirmación(trimmed):
            avanzar a awaiting_passenger
        IF esNegación(trimmed):
            volver a collecting_slots
        IF esCorrección(trimmed):
            actualizar slot corregido
            volver a collecting_slots
    
    // 5e. Estado awaiting_passenger
    IF session.state == "awaiting_passenger":
        passengers = extraerPasajeros(trimmed)
        IF passengers:
            actualizar sesión con passengers
            recotizar precio
            avanzar a awaiting_confirmation
    
    // 5f. Estado awaiting_confirmation
    IF session.state == "awaiting_confirmation":
        IF esAfirmación(trimmed):
            crearViaje(phone, session)
            IF es AHORA: iniciarDespacho(trip)
            RETURN mensaje de confirmación
        IF esNegación(trimmed):
            volver a collecting_slots
    
    // 5g. Estado ambiguity_pending
    IF session.state == "ambiguity_pending":
        resultado = resolverAmbigüedad(phone, trimmed, session)
        IF resultado:
            RETURN
    
    // ── 6. DETECCIÓN DE AMBIGÜEDAD GEOGRÁFICA ──
    // Solo si NO estamos ya en ambiguity_pending
    IF leadCore.facts contiene "location_ambiguous" 
       AND session.state != "ambiguity_pending":
        // Verificar si el mensaje realmente necesita ambigüedad
        // o si el usuario está respondiendo a una pregunta de otro slot
        IF session.clarify_field apunta a OTRO slot:
            // El usuario está respondiendo a otra cosa,
            // no activar ambigüedad ahora
            CONTINUAR al paso 7
        ELSE:
            ambResuelta = startAmbiguityResolution(phone, trimmed, leadCore, session)
            IF ambResuelta: RETURN
    
    // ── 7. COMPRENSIÓN ──
    comprehension = runComprehensionCheck(text, leadCore, session)
    IF comprehension == ESCALATION:
        escalarAHumano(phone, session)
        RETURN
    
    // ── 8. EXTRACCIÓN ──
    extraction = runExtraction(text, phone, leadCore, history, session)
    IF extraction == null:
        RETURN // ya se envió mensaje preguntando
    
    // ── 9. FUSIÓN DE CONTEXTO ──
    nuevosSlots = mergeSlots(session.slots, extraction.slots)
    // Regla: solo sobrescribir si hay contradicción explícita
    
    // ── 10. COTIZACIÓN (si hay origen + destino) ──
    IF nuevosSlots.origin AND nuevosSlots.destination:
        precio = resolvePricing(nuevosSlots.origin, nuevosSlots.destination, nuevosSlots.passengers ?? 1)
    
    // ── 11. DECISIÓN DE RESPUESTA ──
    router(input: leadCore) → outputType: EXECUTE | ANSWER | CLARIFY
    
    // ── 12. CONSTRUCCIÓN DE RESPUESTA ──
    policy(input: outputType, extraction, precio, session) → respuesta
    
    // ── 13. ENVÍO ──
    enviarRespuesta(phone, respuesta)
    actualizarSesion(phone, nuevosSlots, nuevoEstado, nuevoClarifyField)
    
    RETURN
```

### Reglas de decisión del algoritmo

```
¿EXECUTE?
  - Intención: NOW o BOOKING
  - Todos los slots requeridos: CONFIRMED
  - Usuario confirmó explícitamente

¿ANSWER?
  - Intención: COMMERCIAL, INFORMATIONAL, CONSULTA
  - Slots completos O información suficiente para responder
  - No requiere confirmación del usuario

¿CLARIFY?
  - Intención: cualquier operativa con slots incompletos
  - Intención: GREETING (sin contexto)
  - Intención: AMBIGUOUS o baja confianza
  - Usuario necesita proveer más datos
```

---

## 25. Expected Behavioral Reference

Esta sección describe, mediante diagramas y pseudocódigo, el comportamiento esperado del sistema independientemente de la implementación actual. Es la referencia definitiva para auditorías y correcciones.

### 25.1 Diagrama de flujo esperado

```
┌─────────────────────────────────────────────────────────────────┐
│                        MENSAJE ENTRANTE                         │
│              (texto plano desde WhatsApp)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   PRE-PROCESAMIENTO     │
              │  ─────────────────────  │
              │  • .limpiar → reset     │
              │  • comandos admin       │
              │  • rate limit           │
              │  • idempotencia         │
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │   CARGAR CONTEXTO       │  ← Una vez por turno
              │  ─────────────────────  │
              │  1. Leer chat_sessions  │
              │  2. Leer historial      │
              │  3. buildMemory()       │
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │   CLASIFICAR (CORE)     │  ← UNA SOLA VEZ
              │  ─────────────────────  │     Función pura
              │  • intent               │     Sin LLM
              │  • facts                │     Sin DB
              │  • roleLock             │
              │  • slotStability        │
              │  • confidence           │
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────────┐
              │   INTERPRETAR MENSAJE       │
              │  ────────────────────────   │
              │  • ¿Nuevo pedido?           │
              │  • ¿Respuesta a pregunta?   │
              │  • ¿Afirmación / Negación?  │
              │  • ¿Small talk?             │
              └──────────┬──────────────────┘
                         │
                         ▼
              ┌──────────────────────────────────────┐
              │   MANEJAR ESTADOS ESPECIALES         │
              │  ────────────────────────────────    │
              │  ┌─ GREETING sin contexto → responder│
              │  ├─ Saltos condicionales:            │
              │  │  • slot_confirmation?             │
              │  │  • awaiting_passenger?            │
              │  │  • awaiting_confirmation?         │
              │  │  • ambiguity_pending?             │
              │  └─ Cada uno→ handler específico     │
              └──────────┬───────────────────────────┘
                         │ (si no aplica ningún estado especial)
                         ▼
              ┌──────────────────────────────────────┐
              │   DETECTAR AMBIGÜEDAD               │
              │  ──────────────────────────────      │
              │  ¿location_ambiguous fact?           │
              │  ┌─ SÍ y clarify_field apunta al    │
              │  │   mismo slot → resolver           │
              │  └─ SÍ pero user respondía OTRO     │
              │       slot → NO activar ambigüedad   │
              │  ┌─ NO → continuar                   │
              └──────────┬───────────────────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │   COMPRENSIÓN           │
              │  ───────────────────    │
              │  • FULL_CONTROL → ok    │
              │  • CLARIFICATION → ok   │
              │  • RECOVERY → repetir   │
              │  • ESCALATION → humano  │
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │   EXTRACCIÓN            │
              │  ───────────────────    │
              │  1. LLM extraction      │
              │  2. Regex fallback      │
              │  3. Merge con previos   │
              │  4. Calcular confianza  │
              │  5. Construir slotState │
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │   COTIZACIÓN            │
              │  ───────────────────    │
              │  ¿origin+destination?   │
              │  ┌─ SÍ → pricing        │
              │  └─ NO → omitir         │
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │   DECIDIR (ROUTER)      │
              │  ───────────────────    │
              │  EXECUTE | ANSWER       │
              │  | CLARIFY              │
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │   RESPONDER (POLICY)    │
              │  ───────────────────    │
              │  • Construir mensaje    │
              │  • (Opcional) LLM       │
              │  • Enviar respuesta     │
              │  • Actualizar sesión    │
              └─────────────────────────┘
```

### 25.2 Pseudocódigo de detección de ambigüedad (comportamiento esperado)

```
// Comportamiento ESPERADO para detectar ambigüedad,
// NO necesariamente el implementado actualmente

FUNCTION debeActivarAmbiguedad(leadCore, session, trimmed):
    // 1. ¿El CORE detectó un término ambiguo?
    IF NOT leadCore.facts.contains("location_ambiguous"):
        RETURN false
    
    // 2. ¿Ya estamos resolviendo ambigüedad?
    IF session.state == "ambiguity_pending":
        RETURN false  // Ya lo maneja handleAmbiguityResponse
    
    // 3. ¿El usuario está respondiendo a un clarify_field específico?
    //    Si el sistema preguntó por destination y el usuario da "Hotel Esturión",
    //    NO debemos activar ambigüedad de origin aunque "hotel" sea ambiguo.
    IF session.clarify_field != null:
        clarifyField = session.clarify_field
        
        // El roleLock del CORE puede indicar a qué slot apunta el mensaje
        roleOrigin = leadCore.roleLock?.origin
        roleDest = leadCore.roleLock?.destination
        
        // Si el CORE no detectó roleLock pero el clarify_field apunta a otro slot:
        IF roleOrigin == null AND roleDest == null:
            // El usuario está respondiendo al clarify_field
            // NO activar ambigüedad del slot opuesto
            RETURN false  // ← COMPORTAMIENTO ESPERADO (Puede NO ser el actual)
        
        // Si el roleLock del CORE coincide con el clarify_field:
        IF clarifyField == "origin" AND roleOrigin != null:
            RETURN true  // El usuario está hablando del origen ambiguo
        IF clarifyField == "destination" AND roleDest != null:
            RETURN true  // El usuario está hablando del destino ambiguo
    
    // 4. Por defecto: activar ambigüedad si hay término ambiguo
    RETURN true
```

### 25.3 Pseudocódigo de merge de slots (comportamiento esperado)

```
FUNCTION mergeSlots(slotsActuales, slotsNuevos):
    resultado = copy(slotsActuales)
    
    FOR EACH (key, nuevoValor) IN slotsNuevos:
        IF key NOT IN resultado:
            // Slot nuevo → agregar
            resultado[key] = nuevoValor
        
        ELSE:
            valorActual = resultado[key]
            
            // ¿El nuevo valor contradice explícitamente al actual?
            IF hayContradiccion(valorActual.value, nuevoValor.value):
                // Reemplazar
                resultado[key] = nuevoValor
            
            // ¿El nuevo valor es igual o equivalente?
            ELSE IF sonEquivalentes(valorActual.value, nuevoValor.value):
                // Mantener el existente, actualizar metadata
                resultado[key].score = max(valorActual.score, nuevoValor.score)
                resultado[key].status = promoverEstado(valorActual.status, nuevoValor.status)
            
            ELSE:
                // El nuevo valor no contradice pero es diferente
                // Podría ser un detalle adicional
                // Mantener el actual, no sobrescribir
                CONTINUE
    
    RETURN resultado

FUNCTION hayContradiccion(valorActual, valorNuevo):
    // Detectar negación + nuevo valor
    // "No es el aeropuerto, es el centro"
    // "Cambio el destino"
    // "En realidad salgo del hotel"
    
    palabrasContradiccion = ["no", "cambio", "cambiar", "corregir", "corrijo",
                             "modificar", "rectificar", "en realidad", "mejor",
                             "otro", "diferente", "distinto"]
    
    IF texto contiene alguna de palabrasContradiccion:
        RETURN true
    
    RETURN false
```

### 25.4 Diagrama de evolución de intención esperada

```
Turno 1: "Hola"
  CORE → GREETING (confidence: 0.4)
  prevIntent después: GREETING

Turno 2: "Necesito un taxi"
  CORE → BOOKING (confidence: 0.8)
  prevIntent: GREETING → se reemplaza por BOOKING
  prevIntent después: BOOKING

Turno 3: "Desde el aeropuerto"
  CORE:
    - roleLock.origin = "aeropuerto"
    - facts: ["origin:aeropuerto"]
    - intent: BOOKING (por "aeropuerto" + prevIntent BOOKING)
    - NO location_ambiguous porque roleLock ya fijó origin
  prevIntent después: BOOKING

Turno 4: "Hotel Esturión"
  CORE:
    - facts: ["location_ambiguous:true"] ("hotel" coincide con patrón)
    - intent: CONSULTA (por location_ambiguous sin roleLock)
    - prevIntent: BOOKING
    - Regla: si prevIntent es BOOKING y el nuevo intent es de menor
      confianza operativa, PRESERVAR BOOKING
    - intent FINAL: BOOKING (preservado por contexto)
    - roleLock: null (ningún patrón sintáctico)
    
  Interpretación:
    - clarify_field = "destination" (se estaba preguntando destino)
    - El mensaje NO responde a origin (origin ya está en session)
    - El mensaje NO activa ambigüedad de origin
    - El mensaje se interpreta como respuesta a destination
    
  Extracción:
    - LLM detecta "Hotel Esturión" como destino
    - Merge: origin preservado + destination = "Hotel Esturión"
    
  Flujo:
    - NO activar ambigüedad (el clarify_field apunta a destination)
    - Actualizar destination
    - Si ambos slots listos → pricing → confirmación
```

### 25.5 Mapa de estados y transiciones esperadas

```
ESTADO: collecting_slots
  ┌─ Evento: usuario proporciona origin → mantener collecting_slots
  ├─ Evento: usuario proporciona destination → mantener collecting_slots
  ├─ Evento: usuario proporciona todos los slots → transición a slot_confirmation
  └─ Evento: lugar ambiguo detectado → transición a ambiguity_pending

ESTADO: ambiguity_pending
  ┌─ Evento: ambigüedad resuelta → transición a collecting_slots
  └─ Evento: ambigüedad no resuelta → mantener ambiguity_pending

ESTADO: slot_confirmation
  ┌─ Evento: usuario confirma → transición a awaiting_passenger
  │                                       (si faltan pasajeros)
  │                                    → transición a awaiting_confirmation
  │                                       (si ya hay pasajeros)
  └─ Evento: usuario cambia algo → transición a collecting_slots

ESTADO: awaiting_passenger
  ┌─ Evento: usuario da pasajeros → transición a awaiting_confirmation
  └─ Evento: usuario no da pasajeros válidos → mantener awaiting_passenger

ESTADO: awaiting_confirmation
  ┌─ Evento: usuario confirma → EJECUTAR viaje → transición a idle
  │                              (o pending_human_review)
  └─ Evento: usuario cancela → transición a collecting_slots

ESTADO: pending_human_review
  └─ Evento: operador resuelve → transición a idle

ESTADO: idle
  └─ Evento: nuevo mensaje operativo → transición a collecting_slots
```

### 25.6 Reglas de validación para auditors

Estas reglas permiten verificar si una implementación cumple con esta especificación:

```
VALIDACIÓN 1 — Preservación de contexto:
  DADO: usuario dice "origen aeropuerto" en turno N
  CUANDO: usuario dice "destino hotel" en turno N+1
  ENTONCES: el contexto debe tener BOTH origin="aeropuerto" AND destination="hotel"
  VIOLACIÓN: si destination sobrescribe origin, o si origin se pierde

VALIDACIÓN 2 — Sin doble clasificación:
  DADO: un mensaje entrante
  CUANDO: se procesa el mensaje
  ENTONCES: core() debe ejecutarse EXACTAMENTE UNA VEZ
  VIOLACIÓN: si core() se ejecuta 2+ veces sobre el mismo mensaje

VALIDACIÓN 3 — Sin repreguntas:
  DADO: usuario ya proporcionó destination
  CUANDO: el sistema procesa el siguiente turno
  ENTONCES: NO debe preguntar "¿A dónde querés ir?"
  VIOLACIÓN: si pregunta por destination cuando ya está en contexto

VALIDACIÓN 4 — Ambigüedad contextual:
  DADO: clarify_field = "destination", usuario dice "Hotel Esturión"
  CUANDO: se detecta location_ambiguous en el mensaje
  ENTONCES: NO debe activar ambigüedad para origin
  VIOLACIÓN: si pregunta "¿A qué aeropuerto?" cuando el usuario está dando destino

VALIDACIÓN 5 — Merge sin pérdida:
  DADO: session tiene origin="X", destination=null
  CUANDO: nueva extracción devuelve destination="Y"
  ENTONCES: resultado debe tener origin="X" AND destination="Y"
  VIOLACIÓN: si origin se pierde durante el merge

VALIDACIÓN 6 — Intención contextual:
  DADO: prevIntent = BOOKING
  CUANDO: nuevo mensaje no tiene intención clara (CONSULTA/AMBIGUOUS)
  ENTONCES: la intención final debe heredar BOOKING
  VIOLACIÓN: si la intención "baja" reemplaza a BOOKING sin razón

VALIDACIÓN 7 — Solo una pregunta por turno:
  CUANDO: el sistema responde a un usuario con slots incompletos
  ENTONCES: la respuesta debe preguntar UN SOLO campo faltante
  VIOLACIÓN: si pregunta 2+ campos en el mismo mensaje
```

---

## Apéndice A: Fuentes

| Fuente | Tipo | Relación |
|--------|------|----------|
| SYSTEM_BIBLE.md | Documento constitutivo | Define qué es y qué no es el sistema |
| ADR-001 a ADR-012 | Decisiones arquitectónicas | Definen límites, dependencias e invariantes |
| Architecture Freeze (ADR-008, ADR-009) | Decisiones congeladas | Dominios que no pueden modificarse sin ADR nuevo |
| CX-1 | Certificación de experiencia conversacional | Principios de UX y comportamiento esperado |
| QA-1 | Certificación funcional | Cobertura de escenarios operativos |
| QA-2 | Traza de flujo runtime | Mapa de decisiones reales vs. esperadas |
| QA-2B | Forensia de estado conversacional | 8 break points identificados |
| PR-CATS-1 | Suite de pruebas de invariantes | 26 tests de comportamiento esperado |
| PR-QA1 | Auditoría de consistencia arquitectónica | 27 hallazgos, roadmap de saneamiento |
| docs/ai/ARCHITECTURE_BIBLE.md | Principios arquitectónicos | 10 invariantes fundamentales |
| docs/ai/ARCHITECTURE_RULES.md | Reglas estrictas | 25 reglas de arquitectura |
| docs/ai/ENGINE_CONTRACTS.md | Contratos entre motores | 13 contratos con inputs/outputs/invariantes |
| docs/ai/DECISION_TREE.md | Árbol de decisión runtime | Flujo completo por escenario |
| docs/ai/INVARIANTS.md | Invariantes arquitectónicas | 24 invariantes del sistema |

---

## Apéndice B: Historial de revisiones

| Versión | Fecha | Cambios | Autor |
|---------|-------|---------|-------|
| 1.0 | 2026-07-17 | Versión inicial. Síntesis de todas las fuentes del proyecto AITOS. | ARNÉS (PR-SPEC-1) |

---

*Este documento es la Fuente de Verdad funcional del proyecto AITOS.  
Toda corrección, auditoría o desarrollo nuevo debe compararse contra esta especificación.*
