# ADR-008 — Conversational Decision Architecture

**Estado:** ACCEPTED

**Fecha:** Posterior a R5 — StrategyDecision Activation

**Reemplaza:** Ningún ADR.

---

# 1. Contexto

Durante la evolución de AITOS la inteligencia conversacional estuvo inicialmente distribuida entre múltiples componentes.

Las Policies, Response Builder, LLM, Handler y diversos helpers tomaban decisiones estratégicas propias.

Esto provocaba:

* duplicación de reglas;
* comportamiento inconsistente;
* múltiples fuentes de verdad;
* dificultad para auditar el sistema;
* alto costo de evolución.

La serie de refactors R1–R5 eliminó progresivamente esta situación.

La arquitectura quedó consolidada y preparada para congelarse.

---

# 2. Decisión

AITOS adopta formalmente el siguiente principio arquitectónico:

> **Toda decisión estratégica conversacional deberá originarse exclusivamente en `computeStrategyDecision()`.**

Ningún otro componente podrá decidir estrategia.

Los demás componentes únicamente:

* consumirán decisiones;
* ejecutarán acciones;
* materializarán respuestas.

---

# 3. Pipeline oficial

```text
Cliente
      │
      ▼
CORE
      │
      ▼
Conversation Interpreter
      │
      ▼
Client Objective
      │
      ▼
computeStrategyDecision()
      │
      ▼
StrategyDecision
      │
      ▼
Policies
      │
      ▼
LLM
      │
      ▼
Respuesta
```

Este pipeline constituye el contrato oficial de la arquitectura conversacional.

---

# 4. Responsabilidades

## CORE

Responsable de:

* extracción determinística;
* entidades;
* hechos;
* intención;
* contexto objetivo.

Nunca decide estrategia.

---

## Conversation Interpreter

Responsable de interpretar la conversación.

Produce señales.

Nunca decide comportamiento.

---

## Client Objective

Responsable de sintetizar múltiples señales en un único objetivo conversacional.

No decide cómo responder.

---

## StrategyDecision

Es la única autoridad para decidir:

* estrategia;
* velocidad;
* tono;
* adquisición de información;
* comportamiento conversacional.

No ejecuta acciones.

No genera texto.

---

## Policies

Responsables de ejecutar decisiones.

Nunca generan estrategia.

Nunca reinterpretan señales.

---

## LLM

Responsable únicamente de expresar la estrategia decidida.

No debe modificarla.

No debe reemplazarla.

---

# 5. Qué puede vivir en StrategyDecision

Se permiten únicamente decisiones de alto nivel.

Ejemplos:

* speed
* tone
* responseLength
* greetingLength
* reassuranceNeeded
* callToAction
* minimizeQuestions
* skipConfirmation
* fieldPriority
* fieldAcquisitionMode
* skipFieldResolution
* inhibitNewBooking

En general:

> "¿Qué debe hacer el sistema?"

---

# 6. Qué NO puede vivir en StrategyDecision

Nunca incorporar:

* algoritmos;
* acceso a base de datos;
* consultas SQL;
* construcción de mensajes;
* renderizado;
* lógica de slots;
* workflow;
* geolocalización;
* pricing;
* dispatch;
* implementación operativa.

En general:

> "¿Cómo se hace?"

---

# 7. Regla de Ownership

Cada concern estratégico debe tener exactamente un único owner.

Ejemplo:

| Concern            | Owner            |
| ------------------ | ---------------- |
| Purchase Intent    | StrategyDecision |
| Conversation Speed | StrategyDecision |
| Conversation Tone  | StrategyDecision |
| Field Acquisition  | StrategyDecision |
| Pricing            | Pricing Engine   |
| Slot Resolution    | Field Resolver   |
| Workflow           | Slot Workflow    |
| Dispatch           | Policy           |
| Geo Resolution     | CORE             |

Ownership compartido está prohibido salvo ADR explícito.

---

# 8. Evolución futura

Antes de agregar un nuevo campo a `StrategyDecision`, deben responderse afirmativamente todas estas preguntas:

1. ¿Es una decisión estratégica?
2. ¿No pertenece ya a otro dominio?
3. ¿Existe una única forma correcta de decidirla?
4. ¿Será consumida por más de un componente?
5. ¿Reduce duplicación?
6. ¿Mantiene una única fuente de verdad?

Si alguna respuesta es negativa, el cambio no debe realizarse.

---

# 9. Cambios arquitectónicos

Desde este ADR queda establecido:

No se permite:

* crear nuevos dominios conversacionales;
* introducir nuevas fuentes de verdad;
* mover estrategia fuera de StrategyDecision;
* agregar pipelines paralelos.

Cualquier excepción requiere un ADR aprobado y evidencia técnica.

---

# 10. Architecture Freeze

Con la finalización de R5 se declara:

## AITOS Architecture v2.0 — Architecture Frozen

La arquitectura conversacional deja de estar en evolución.

Los cambios futuros deberán concentrarse en:

* nuevas capacidades de negocio;
* mejoras funcionales;
* optimización;
* observabilidad;
* rendimiento;
* aprendizaje;
* integraciones.

No en rediseñar la arquitectura base.

---

# 11. Consecuencias

## Beneficios

* Una única fuente de verdad para las decisiones estratégicas.
* Menor acoplamiento entre componentes.
* Policies simplificadas.
* LLM desacoplado de la lógica de negocio.
* Auditorías más sencillas.
* Refactors futuros de bajo riesgo.
* Mayor capacidad de prueba y trazabilidad.

## Costos

* Toda nueva decisión estratégica deberá justificarse.
* La evolución arquitectónica será deliberadamente más lenta.
* Cualquier cambio estructural requerirá un ADR respaldado por evidencia.

---

# Estado Final

**Este ADR oficializa el cierre de la etapa de consolidación arquitectónica de AITOS.**

A partir de este punto, el proyecto entra en una nueva fase: **evolución funcional sobre una arquitectura estable**, preservando `StrategyDecision` como la única fuente de verdad para las decisiones conversacionales estratégicas.
