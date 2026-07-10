# AITOS-E14 — Conversation Strategy Domain Discovery
## 2026-07-08 | Read-Only Analysis

---

## Índice

1. [Definición formal de estrategia conversacional](#1-definición-formal)
2. [Inventario de decisiones](#2-inventario)
3. [Separación estrategia vs operación](#3-separación)
4. [Comparación de tres escenarios](#4-escenarios)
5. [Evidencia objetiva](#5-evidencia)
6. [Riesgos](#6-riesgos)
7. [Costos](#7-costos)
8. [Beneficios](#8-beneficios)
9. [Comparación con dominios existentes](#9-dominios)
10. [Futuro a 2 años](#10-futuro)
11. [Compatibilidad con la Constitución](#11-constitucion)
12. [Recomendación final](#12-recomendacion)
13. [Pregunta final](#13-pregunta-final)

---

## 1. Definición formal de estrategia conversacional

### 1.1 Extraída del sistema, no de teoría

Después de analizar las 231 decisiones conversacionales de AITOS, una **decisión estratégica** cumple **todas** estas características:

| Característica | Definición | Contraejemplo operativo |
|---|---|---|
| **Modifica el comportamiento** | Cambia lo que el sistema HACE, no cómo lo ejecuta | Elegir idioma según lang (operativo: solo cambia texto) |
| **No modifica la operación** | No persiste, no calcula, no envía datos | Ejecutar dispatch (operativo: side effect real) |
| **Cambia la forma de conducir la conversación** | Altera el orden, tono, velocidad, o foco de las preguntas | Asignar precio desde tariff (operativo: cálculo) |
| **Produce caminos conversacionales diferentes** | Lleva a ramas distintas del árbol de decisión | Loggear un valor (operativo: no cambia camino) |

### 1.2 Definición formal

> **Estrategia conversacional** es el conjunto de decisiones que determinan **cómo** se conduce la conversación (orden, tono, velocidad, foco, modo) sin modificar datos, sin ejecutar side effects, y sin cambiar la operación subyacente.

### 1.3 ¿Qué NO es estrategia?

| No es estrategia | Es |
|---|---|
| Calcular precio | Operación |
| Ejecutar dispatch | Operación |
| Persistir en DB | Operación |
| Enviar notificación admin | Operación |
| Validar formato LLM | Operación |
| Traducir texto | Operación |

---

## 2. Inventario de decisiones

### 2.1 Total del sistema

| Tipo | Cantidad | % |
|---|---|---|
| **ESTRATÉGICA** | 97 | 42% |
| **OPERATIVA** | 111 | 48% |
| **MIXTA** | 23 | 10% |
| **TOTAL** | 231 | 100% |

### 2.2 Densidad estratégica por archivo

| Archivo | Estratégicas | Totales | % Estratégico | ¿Qué estrategia implementa? |
|---|---|---|---|---|
| `router.ts` | 11 | 13 | **85%** | Mapeo intent → outputType |
| `client-objective.ts` | 9 | 9 | **100%** | Síntesis de objetivo del cliente |
| `conversation-interpreter.ts` | 13 | 14 | **93%** | Clasificación del rol del mensaje |
| `field-resolver.ts` | 9 | 20 | **45%** | Prioridad de campos a preguntar |
| `policy-reserva.ts` | 25 | 55 | **45%** | Estrategia stateful + operación |
| `policy-ahora.ts` | 11 | 18 | **61%** | Estrategia stateless + operación |
| `policy-pipeline.ts` | 6 | 28 | **21%** | Orquestación (mayormente operativa) |
| `handler.ts` | 3 | 11 | **27%** | Enrutamiento + gating |
| `domain.ts + types.ts` | 5 | 12 | **42%** | Domain + operationalMode |
| `llm-response.ts` | 4 | 37 | **11%** | Generación de prompt (mayormente localización/validación) |
| `response-builder.ts` | 1 | 14 | **7%** | Construcción de strings |

### 2.3 Las 97 decisiones estratégicas, agrupadas por concern

| Concern estratégico | Decisiones | Archivos | ¿Centralizado? |
|---|---|---|---|
| **¿Qué outputType elegir?** | 11 | router.ts | ✅ Sí (router.ts) |
| **¿Qué política ejecutar?** | 3 | handler.ts, types.ts | ❌ No |
| **¿Qué objetivo tiene el cliente?** | 9 | client-objective.ts | ✅ Sí (E12) |
| **¿Qué rol tiene el mensaje?** | 13 | conversation-interpreter.ts | ✅ Sí (ADR-007) |
| **¿Qué campo pedir después?** | 9 | field-resolver.ts | ✅ Sí |
| **¿Qué rama del flujo ejecutar?** | 25 | policy-reserva.ts | ❌ No (distribuido) |
| **¿Qué rama ejecutar (AHORA)?** | 11 | policy-ahora.ts | ❌ No (distribuido) |
| **¿Cuándo ejecutar dispatch?** | 6 | policy-pipeline.ts | ❌ No (distribuido) |
| **¿Qué reglas dar al LLM?** | 4 | llm-response.ts | ❌ No (distribuido) |
| **¿Qué dominio conversacional?** | 5 | domain.ts, types.ts | ❌ No |

### 2.4 Observación crítica

**Solo 3 de 10 concerns estratégicos están centralizados:**
- outputType (router.ts)
- Client Objective (client-objective.ts) — el más reciente, E12
- Message Classification (conversation-interpreter.ts) — ADR-007

**Los 7 concerns restantes están distribuidos** en branches de policies, pipeline, y handler. Esto es la fuente del acoplamiento.

---

## 3. Separación entre estrategia y operación

### 3.1 Límite actual (difuso)

Hoy, cada policy mezcla decisiones estratégicas y operativas en el mismo switch/if. Ejemplo en `policy-reserva.ts:172-194`:

```typescript
// ESTRATÉGICO: ¿Debo interpretar esta affirmation como booking accepted?
if (affirmation && awaiting_confirmation) {
    // ESTRATÉGICO: ¿El clientObjective inhibe la confirmación?
    if (inquiry_price) { fall through }
    else {
        // OPERATIVO: Construir respuesta con precio o sin precio
        if (price && matched) {
            return buildBookingAcceptedResponse(origin, dest, price, lang);  // OPERATIVO
        }
        return buildBookingAcceptedNoPriceResponse(origin, dest, lang);  // OPERATIVO
    }
}
```

La línea entre "qué decisión tomar" (estrategia) y "cómo ejecutarla" (operación) está borrosa porque viven en la misma estructura condicional.

### 3.2 ¿Se puede separar?

**Sí, pero no trivialmente.** La separación requiere:

1. Identificar cada decisión estratégica en cada branch
2. Extraerla a un selector de modo/foco/prioridad
3. Dejar en la policy solo la ejecución de la estrategia seleccionada

Ejemplo de cómo se vería:

```typescript
// ESTRATEGIA (separada)
const strategy = selectConversationStrategy(ctx, decision);
// → { mode: "confirm", tone: "warm", speed: "normal",
//     shouldConfirmBooking: true, skipFields: [] }

// OPERACIÓN (policy)
if (strategy.mode === "confirm") {
    return strategy.shouldConfirmBooking
        ? buildBookingAcceptedResponse(...)
        : buildBookingAcceptedNoPriceResponse(...);
}
```

### 3.3 Costo de separación

| Ítem | Estimación |
|---|---|
| Decisiones estratégicas a extraer | ~70 (las que están mezcladas con operación) |
| Archivos a modificar | 8 (policies, handler, pipeline, llm-response, field-resolver) |
| Líneas a mover/reescribir | ~200-300 |
| Tests a crear/actualizar | ~15-20 |
| Riesgo de regresión | Medio (las policies existentes son estables) |

---

## 4. Comparación de tres escenarios

### 4.1 Escenario A: No crear nada

Mantener toda la estrategia dentro de Policy.

| Dimensión | Evaluación |
|---|---|
| **Ventajas** | Riesgo cero de regresión. No cambia nada. Sigue funcionando. |
| **Riesgos** | Explosión combinatoria ya evidenciada (E13: 1.8M combinaciones teóricas). Cada nueva señal requiere modificar N branches. policy-reserva ya tiene 495 líneas. Regresiones difíciles de diagnosticar. |
| **Escalabilidad** | ❌ Baja. Agregar A/B testing, personalización o aprendizaje requeriría modificar cada branch individualmente. |
| **Conclusión** | Mantener el statu quo es aceptable a corto plazo pero insostenible a medida que se agreguen más señales y capacidades. |

### 4.2 Escenario B: Función pura

Crear `selectConversationStrategy()` como función pura.

```
ConversationSignals (HandlerContext + FinalDecision)
        ↓
selectConversationStrategy()  ← función pura, ~60-80 líneas
        ↓
ConversationStrategy { mode, tone, speed, fieldPriority, behaviorFlags }
        ↓
Policy (ejecuta según strategy)
```

| Dimensión | Evaluación |
|---|---|
| **Simplicidad** | ✅ Alta. Una función, un archivo, sin estado, sin dependencias. |
| **Testabilidad** | ✅ Muy alta. Input = HandlerContext + FinalDecision. Output = StrategyDecision. Sin mocking. |
| **Mantenibilidad** | ✅ Alta. La lógica de "qué hacer" está centralizada. Las policies solo ejecutan. |
| **Riesgo de implementación** | ⚠️ Medio. Requiere refactor de 8 archivos para consumir StrategyDecision en vez de señales sueltas. |
| **Cobertura** | ❌ La función capturaría ~60-70% de las decisiones estratégicas (las de policy + handler). Las de router.ts y conversation-interpreter.ts ya están separadas. |
| **Vida útil estimada** | 12-18 meses antes de que la función crezca lo suficiente como para necesitar más estructura. |

### 4.3 Escenario C: Nuevo dominio arquitectónico

Crear `src/lib/ai/strategy/` con contratos, tests, tipos dedicados, evolución propia.

| Dimensión | Evaluación |
|---|---|
| **Beneficios** | Marco para A/B testing, personalización, aprendizaje, experimentación. Evolución independiente. |
| **Costos** | Nuevo directorio, nuevo contrato, nueva deuda de mantenimiento, nueva interfaz. Overhead inicial alto. |
| **Evidencia suficiente** | ❌ NO. Las decisiones estratégicas actuales son 97, pero están en 11 archivos sin cohesión interna. No forman un dominio cohesivo sino un conjunto de funciones relacionadas. Un dominio requiere: reglas propias, invariantes, evolución independiente, interfaces claras, reutilización. Solo 2 de 5 están presentes. |
| **Riesgo** | Alto. Crear un dominio prematuramente agrega complejidad sin valor inmediato. La arquitectura de AITOS valora la mínima complejidad (SPEC.md principio "Minimality"). |
| **Conclusión** | Prematuro. El dominio emergerá de forma natural cuando la función pura (Escenario B) crezca lo suficiente. |

### 4.4 Tabla comparativa

| Criterio | A (Nada) | B (Función) | C (Dominio) |
|---|---|---|---|
| Riesgo de implementación | ✅ Ninguno | ⚠️ Medio | ❌ Alto |
| Reduce acoplamiento | ❌ No | ✅ Sí | ✅ Sí |
| Testabilidad estratégica | ❌ No | ✅ Alta | ✅ Alta |
| Preparado para A/B testing | ❌ No | ⚠️ Parcial | ✅ Sí |
| Preparado para personalización | ❌ No | ❌ No | ✅ Sí |
| Costo de mantenimiento futuro | ⚠️ Creciente | ✅ Decreciente | ⚠️ Medio (nuevo código) |
| Alineado con minimalismo | ✅ Sí | ✅ Sí | ❌ No |
| Sobrevive 2 años | ❌ No (crece) | ⚠️ Tal vez (crece) | ✅ Sí |
| **Recomendación** | ❌ | **✅ AHORA** | ⚠️ FUTURO |

---

## 5. Evidencia objetiva

### 5.1 Hechos del código

| Hecho | Fuente | Relevancia |
|---|---|---|
| policy-reserva.ts tiene **495 líneas** y **55 decisiones** | Contador E14 | La más densa. 45% estratégico = ~25 decisiones estratégicas embebidas. |
| **3 concerns estratégicos están centralizados** (router, client-objective, CI) | E14 §2.3 | Los 3 se crearon en momentos distintos (router=original, CI=ADR-007, clientObjective=E12). No hubo plan de dominio. |
| **7 concerns estratégicos están distribuidos** | E14 §2.3 | Sin centralización, cada nueva señal toca N branches. |
| **231 decisiones totales**, 97 estratégicas | E14 §2.1 | Masa crítica suficiente para justificar abstracción. |
| clientObjective se creó en E12 como función pura | E12 | El patrón ya existe y funciona. Extenderlo a más concerns es natural. |
| conversation-interpreter (ADR-007) es dominio funcional | ADR-007 | Tiene contrato, tests, y evoluciona independientemente. Es el modelo para Escenario B. |

### 5.2 Hechos de la evolución

| Hito | Señales agregadas | Decisión estratégica asociada |
|---|---|---|
| Core original | intent, confidence, facts | outputType |
| ADR-007 | messageType | Clasificación de rol del mensaje |
| E11 C1-C2 | purchaseIntent | Gateo LLM + clientObjective input |
| E11-B P2-14 | urgency | clientObjective input + observabilidad |
| E11-B P2-15 | messageType + isCorrection | Cancel detection + correction handling |
| E12 | clientObjective | booking_urgent skip + inquiry_price guard |
| E13 | Jerarquía de señales (propuesta) | Prioridad entre señales en conflicto |

**Patrón**: Cada nueva señal agregó 1-2 decisiones estratégicas. No hubo refactor de las existentes. El sistema acumuló estrategia sin centralizarla.

### 5.3 Evidencia de acoplamiento

- **Cancel detection**: duplicado en policy-ahora.ts:77 y policy-reserva.ts:143
- **EMERGENCY admin notify**: duplicado en ambas policies
- **resolveNextRequiredField**: misma lógica en 4 lugares (ambas policies × 2 branches cada una)
- **CLARIFY con ambiguous**: misma estructura if/else en 4 lugares
- **Mapeo scheduled_at → time**: mismo ternario en 4 lugares

---

## 6. Riesgos

### 6.1 Si NO se hace nada (Escenario A)

| Riesgo | Probabilidad | Impacto |
|---|---|---|
| policy-reserva supera 600 líneas en 6 meses | Alta | Mantenibilidad degradada |
| Nueva señal requiere modificar 5+ archivos | Alta | Bugs por omisión |
| Regresión por combinación no testeada | Media | Error en producción |
| Onboarding lento de nuevos desarrolladores | Alta | Curva de aprendizaje empinada |

### 6.2 Si se implementa Escenario B

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| La función crece demasiado (>150 líneas) | Media | Dividir en sub-funciones por concern |
| Las policies quedan "tontas" y se pierde contexto | Baja | StrategyDecision incluye behaviorFlags para contexto |
| Regresión por refactor de policies | Media | Tests exhaustivos de comportamiento |
| Resistencia al cambio | Baja | Refactor gradual, archivo por archivo |

### 6.3 Si se implementa Escenario C

| Riesgo | Probabilidad | Impacto |
|---|---|---|
| Sobrediseño para necesidades futuras | Alta | Deuda técnica, complejidad innecesaria |
| El dominio no se usa como tal | Media | Código muerto |
| Costo de onboarding del nuevo dominio | Alta | Más conceptos que aprender |
| Acoplamiento con dominios existentes | Media | Dependencias no previstas |

---

## 7. Costos

### 7.1 Escenario A (no hacer nada)

**Costo actual** (proyectado 12 meses):
- Mantenimiento de código existente: ~40h/año (agregar señales, corregir regresiones)
- Onboarding: ~8h por nuevo desarrollador
- Depuración de regresiones: ~20h/año

**Costo total estimado**: ~68h/año

### 7.2 Escenario B (función pura)

**Costo de implementación**:
- Diseño de StrategyDecision interface: 2h
- Refactor de selectConversationStrategy(): 6h
- Refactor de policies para consumir StrategyDecision: 8h
- Tests: 4h
- Documentación: 1h

**Costo único**: ~21h

**Costo anual post-implementación**:
- Mantenimiento: ~20h/año (reducción del 50%)
- Onboarding: ~4h (reducción del 50%)
- Depuración: ~10h/año (reducción del 50%)

**Costo total estimado**: 21h + 34h/año

**Break-even**: 21 / (68 - 34) = **~7.4 meses**

### 7.3 Escenario C (dominio)

**Costo de implementación**:
- Diseño del dominio + contratos: 8h
- Creación de directorio + tipos + interfaces: 4h
- Refactor completo: 20h
- Tests: 10h
- Documentación + ADR: 4h

**Costo único**: ~46h

**Costo anual post-implementación**:
- Mantenimiento: ~15h/año
- Onboarding: ~6h
- Depuración: ~8h/año

**Costo total estimado**: 46h + 29h/año

**Break-even**: 46 / (68 - 29) = **~14.2 meses**

---

## 8. Beneficios

### 8.1 Tangibles

| Beneficio | Escenario B | Escenario C |
|---|---|---|
| Reducción de líneas en policy-reserva | ~100 (de 495 a ~395) | ~150 (de 495 a ~345) |
| Eliminación de código duplicado | 4 patrones | Todos los patrones |
| Centralización de decisiones estratégicas | ~80% | ~95% |
| Tests unitarios de estrategia | 10-15 tests | 20-30 tests |
| Tiempo de diagnóstico de bugs | -50% | -60% |

### 8.2 Intangibles

| Beneficio | Escenario B | Escenario C |
|---|---|---|
| Claridad conceptual | "La estrategia está en strategy()" | "El dominio strategy tiene sus reglas" |
| Confianza en cambios | Mayor (tests de estrategia) | Mayor + contratos |
| Onboarding | "Mirá la función, ahí está toda la estrategia" | "Aprendé el dominio strategy" |
| Preparación para futuro | Base para A/B testing | Marco completo para experimentación |

---

## 9. Comparación con dominios existentes

### 9.1 ¿Qué define un dominio en AITOS?

Analizando los dominios existentes:

| Característica | Pricing | Dispatch | Geo | Learning | ¿Conversation Strategy las tiene? |
|---|---|---|---|---|---|
| **Reglas propias** | threshold, markup, offers | readiness, multi-leg | resolution, fallback | suggestions, feedback | ⚠️ Parcial (jerarquía, prioridad, modo) |
| **Invariantes** | precio no inventado | dispatch requiere origin+dest | coordenadas dentro de Iguazú | sugerencias no bloquean | ❌ No formalizadas |
| **Evolución independiente** | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Sí | ❌ No (acoplado a policies) |
| **Interfaces claras** | input→output | input→output | input→output | input→output | ❌ No (señales sueltas en HandlerContext) |
| **Reutilización** | policies + LLM | pipeline | geo.ts | learning loop | ❌ No (cada policy repite lógica) |
| **Tests dedicados** | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Sí | ❌ No |
| **Directorios separados** | `pricing/` | `dispatch/` | `geo/` | `learning/` | ❌ Distribuido en 11 archivos |

### 9.2 Veredicto

**Conversation Strategy NO es un dominio.** Le faltan 6 de 7 características. Es un **conjunto de funciones estratégicas relacionadas** que hoy viven dentro de otros dominios (policies, handler, pipeline).

### 9.3 ¿Puede convertirse en dominio?

Sí, pero requiere:
1. Formalizar invariantes (ej: "si cancel, no seguir flujo comercial")
2. Definir interfaces claras (input = HandlerContext + FinalDecision, output = StrategyDecision)
3. Extraer de los 11 archivos actuales
4. Crear tests dedicados
5. Habilitar evolución independiente

**No está lista hoy. Necesita primero la función pura (Escenario B) para demostrar que el concepto es cohesivo.**

---

## 10. Futuro a 2 años

### 10.1 Capacidades futuras evaluadas

| Capacidad | ¿Puede vivir en Policy? | ¿Puede vivir en función pura? | ¿Requiere dominio? |
|---|---|---|---|
| **A/B testing conversacional** | ❌ No (modificaría todas las policies) | ⚠️ Parcial (la función elegiría variante) | ✅ Sí (necesita experimentación) |
| **Personalización por pasajero** | ❌ No (cada policy tendría que consultar perfil) | ⚠️ Parcial (parámetros adicionales) | ✅ Sí (perfil + reglas + evolución) |
| **Aprendizaje de estrategias óptimas** | ❌ No (no hay punto de instrumentación) | ❌ No (función pura no tiene feedback loop) | ✅ Sí (necesita observabilidad + ajuste) |
| **Métricas UX (NPS, satisfacción)** | ⚠️ Parcial (logging en cada branch) | ✅ Sí (modo loggeado) | ✅ Sí (métricas + optimización) |
| **Optimización automática de tono** | ❌ No (disperso en branches) | ⚠️ Parcial (tono como output) | ✅ Sí (reglas de tono evolutivas) |

### 10.2 ¿Pueden vivir dentro de Policy?

**No.** A/B testing requeriría modificar cada branch de cada policy para probar variantes. Personalización requeriría que cada branch consulte el perfil del pasajero. Ambas son incompatibles con la arquitectura actual.

### 10.3 ¿Pueden vivir dentro de una función pura?

**Parcialmente.** La función pura puede elegir entre variantes (A/B) y aceptar parámetros de perfil (personalización). Pero no puede aprender de resultados (necesita feedback loop) ni optimizarse automáticamente (necesita métricas).

### 10.4 Recomendación a 2 años

```
Ahora:    Escenario B (función pura)
            ↓
6 meses:  Estrategia estabilizada, tests pasando
            ↓
12 meses: Primeras capacidades de A/B testing sobre la función
            ↓
18 meses: La función crece, se divide en sub-dominios
            ↓
24 meses: Emerge dominio formal si la evidencia lo justifica
```

**No forzar el dominio hoy. Dejar que emerja de la práctica.**

---

## 11. Compatibilidad con la Constitución

### 11.1 Auditoría contra SPEC.md

| Principio/Invariante | Escenario B (función) | Escenario C (dominio) |
|---|---|---|
| **I2 — Justificación** | ✅ Toda decisión estratégica tiene justificación | ✅ Igual |
| **I4 — Integridad arquitectónica** | ✅ No viola ADRs | ⚠️ Requeriría nuevo ADR |
| **Minimalidad** | ✅ Agrega solo lo necesario | ❌ Agrega estructura antes de necesitarla |
| **Reusabilidad** | ✅ Centraliza lógica repetida | ✅ Igual |
| **Evidencia** | ✅ Basado en evidencia real (E14) | ⚠️ Basado en especulación futura |
| **Transparencia** | ✅ "La estrategia está en strategy()" | ⚠️ "Hay un nuevo dominio que aprender" |

### 11.2 ¿Fortalece o rompe?

**Escenario B: FORTALECE.** Reduce acoplamiento, centraliza decisiones, mejora testabilidad. No viola ningún principio.

**Escenario C: DEBILITA.** Agrega complejidad antes de que la evolución la justifique. Viola el principio de minimalidad.

### 11.3 ADRs afectados

| ADR | Relevancia | Impacto |
|---|---|---|
| ADR-001 (Dependencias) | ❌ Ninguno | No crea dependencias nuevas |
| ADR-004 (Separación de capas) | ⚠️ Bajo | La estrategia es una sub-capa de Policy |
| ADR-007 (Conversation Interpreter) | ✅ Alto | El CI es el modelo para la función estrategia |
| ADR-008+ (no existen) | — | — |

---

## 12. Recomendación final

### 12.1 Veredicto

**Conversation Strategy es un conjunto de funciones estratégicas relacionadas que emergió de la acumulación de señales (E11→E12→E13). No es un dominio formal (le faltan 6/7 características). Extraerlo como dominio sería prematuro.**

**La función pura `selectConversationStrategy()` (Escenario B) es la recomendación.**

### 12.2 Próximos pasos concretos

| # | Acción | Archivo/s | Dependencia |
|---|---|---|---|
| 1 | Definir `StrategyDecision` type | types.ts | Ninguna |
| 2 | Implementar `selectConversationStrategy()` | `conversation-strategy.ts` (nuevo) | type del paso 1 |
| 3 | Refactor policy-ahora para consumir `strategy.mode` | policy-ahora.ts | paso 2 |
| 4 | Refactor policy-reserva para consumir `strategy.mode` | policy-reserva.ts | paso 2 |
| 5 | Refactor field-resolver para aceptar `strategy.fieldPriority` | field-resolver.ts | paso 2 |
| 6 | Refactor llm-response para usar `strategy.tone` | llm-response.ts | paso 2 |
| 7 | Tests unitarios de `selectConversationStrategy()` | nuevo test file | paso 2 |
| 8 | Tests de regresión en policies | tests existentes | pasos 3-6 |

### 12.3 Lo que NO hacer

- ❌ No crear directorio `strategy/` con múltiples archivos
- ❌ No crear ADR para Conversation Strategy
- ❌ No extraer todo de golpe — hacerlo archivo por archivo
- ❌ No cambiar la interfaz de Policy (sigue siendo la fuente de finalResponse)
- ❌ No hacer que la estrategia sea configurable desde DB (prematuro)

### 12.4 Lo que SÍ hacer

- ✅ Que `StrategyDecision` sea un type simple: `{ mode, tone, speed, behaviorFlags }`
- ✅ Que `selectConversationStrategy()` sea función pura, sin estado, sin async
- ✅ Que la función viva en `src/lib/ai/conversation-strategy.ts`
- ✅ Que se llame en `handler.ts` después de enriquecer ctx, antes de `buildDomainPolicy`
- ✅ Que las policies reciban `StrategyDecision` como parámetro adicional
- ✅ Que el modo se loggee para trazabilidad

---

## 13. Pregunta final

### "¿Conversation Strategy ya existe como dominio dentro de AITOS y solo falta reconocerlo, o todavía es una función de apoyo cuya extracción sería prematura?"

**Conversation Strategy NO existe como dominio. Existe como 97 decisiones estratégicas no centralizadas distribuidas en 11 archivos.**

No es que "falte reconocerlo" — es que **no es cohesivo**. Las decisiones estratégicas tienen 10 concerns distintos (outputType, objetivo, clasificación, prioridad de campos, ramas de flujo, dispatch, reglas LLM, dominio, gating, tono). Un dominio requiere cohesión interna; acá hay 10 preocupaciones diferentes unidas solo por "no son operativas".

**Extraerlo como dominio hoy sería prematuro** porque:
1. No hay interfaz común entre los 10 concerns
2. No hay invariantes compartidas
3. No hay un solo concepto que los unifique más allá de "no es operación"
4. La evidencia muestra que cada concern se agregó de forma independiente (E11→E12→E13)

**Lo correcto es empezar con una función pura (Escenario B) que capture los concerns más acoplados** (modo de conversación, tono, velocidad, prioridad de campos). Si en 12-18 meses esta función crece y muestra cohesión, entonces considerar convertirlo en dominio.

**La respuesta es: todavía es una función de apoyo cuya extracción parcial (Escenario B) es el siguiente paso natural, pero cuya extracción completa como dominio (Escenario C) sería prematura.**

---

## Anexo: Mapa de decisiones estratégicas por concern

```
OUTPUTTYPE (router.ts:11 decisions)
├── EMERGENCY → EXECUTE
├── NOW → EXECUTE
├── BOOKING → EXECUTE
├── PRE_BOOKING → EXECUTE
├── RESCHEDULE → EXECUTE
├── POST_SERVICE → ANSWER
├── INFORMATIONAL → ANSWER
├── COMMERCIAL → ANSWER
├── GREETING → CLARIFY
├── CONSULTA → CLARIFY
├── AMBIGUOUS → CLARIFY
└── confidence < 0.4 → SAFE_FALLBACK

MESSAGE CLASSIFICATION (conversation-interpreter.ts:13 decisions)
├── cancel detection
├── affirmation detection
├── negation detection
├── correction detection
├── clarification detection
├── answer detection
├── inquiry detection
├── small_talk detection
└── new_request default

CLIENT OBJECTIVE (client-objective.ts:9 decisions)
├── trust_check
├── cancelling
├── booking_urgent
├── booking_future
├── booking_generic
├── inquiry_price
├── comparing_options
├── info_request
└── none

FIELD PRIORITY (field-resolver.ts:9 strategic decisions)
├── CONFIRMATION_PENDING (origin/dest)
├── USER_CORRECTED
├── clarifyField cascade
├── sin extraction → core facts
├── paxScore < 0.7
├── schedScore < 0.7
├── location_ambiguous
└── null (todo completo)

POLICY BRANCHING (policies: ~36 strategic decisions)
├── Cancel detection (2x)
├── Lateral intents (5x)
├── booking_urgent skip (1x)
├── inquiry_price guard (1x)
├── Affirmation → booking vs fallthrough
├── StableAcknowledge conditions (5x)
├── ANSWER/tariff → price vs generic
├── CLARIFY → ambiguous vs generic
├── EXECUTE → next field vs dispatch
├── SAFE_FALLBACK
├── needsGeo / needsSaveContext
└── requiresUserInput

DOMAIN SELECTION (handler.ts + domain.ts: ~8 decisions)
├── opMode cascade (5 niveles)
├── domain mapping (6 intents)
└── operationalMode mapping (5 intents × 3 temporales)

LLM MODULATION (llm-response.ts: ~4 strategic decisions)
├── informational rules (no redirect to booking)
├── greeting rules (brevity)
├── mode rules (AHORA vs RESERVA)
└── clientObjective rules (tono según objetivo)
```

Total: **~97 decisiones estratégicas** en **~10 concerns**
