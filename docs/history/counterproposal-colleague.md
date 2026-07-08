# Contrapropuesta — Roadmap de evolución del AITOS
> Autor: colega externo (no Claude, no Cristian) · Documento de discusión estratégica
> Responde a: `proposal-claude.md`

Sí, estoy de acuerdo con la dirección general, pero **no con el orden ni con algunas prioridades**.

Creo que el análisis sigue pensando como un arquitecto de software tradicional: identifica "brechas respecto al estado del arte" y propone cerrarlas. Yo lo haría desde otra perspectiva:

> **¿Qué refactoring aumenta la capacidad del AITOS sin poner en riesgo el conocimiento operacional acumulado?**

Ese cambio de enfoque modifica bastante el roadmap.

---

## Mi principio rector

No tocaría aquello donde el sistema ya es diferencial.

Tus activos no son:

* WhatsApp
* OpenAI
* Turso
* MCP
* Vercel

Tus activos son:

* Modelo operacional del viaje.
* Motor geográfico.
* Motor tarifario.
* Reconstrucción progresiva de intención.
* Reglas de despacho.
* Conocimiento de Triple Frontera.
* Arquitectura determinista.

Todo refactoring debe proteger eso.

---

## Evolucionaría el roadmap en 5 etapas

No por tecnología.

Por madurez arquitectónica.

---

## Etapa 1 — Congelar el dominio (P0)

Esta etapa ni siquiera aparece claramente en el análisis.

Antes de mover una línea de código hay que congelar el dominio.

### Objetivo

Que el conocimiento deje de estar implícito.

### Entregables

* Bounded Contexts definitivos.
* Glosario único.
* Modelo de dominio.
* Diagramas de estados.
* Modelo del Trip.
* Modelo de Session.
* Modelo de Dispatch.
* Modelo de Pricing.
* Modelo de Geo.

Hasta que esto no exista, cualquier refactor corre riesgo de romper reglas invisibles.

---

## Etapa 2 — Desacoplar el Core (P0)

Esta sí coincide con el análisis.

Pero iría más lejos.

No solo desacoplar módulos.

Separar tres mundos.

```
Conversation
↓
Operational Model
↓
Execution
```

Hoy todavía existen puntos donde estas capas se mezclan.

La conversación nunca debería conocer cómo se despacha.

El despacho nunca debería conocer cómo habló el usuario.

El Operational Model debe ser el puente.

---

## Etapa 3 — Convertir el Core en Plataforma (P1)

Este punto creo que el análisis no desarrolla suficiente.

Yo ya dejaría de pensar en TaxiGuazú.

Pensaría en un framework.

Algo así:

```
AI Transportation Operating System
│
├── Conversation Engine
├── Intent Engine
├── Geo Engine
├── Pricing Engine
├── Dispatch Engine
├── Learning Engine
├── Context Engine
└── Policy Engine
```

TaxiGuazú sería solamente una implementación.

Eso cambia completamente la arquitectura.

---

## Etapa 4 — Tool Architecture (P1)

Aquí sí coincido con MCP.

Pero no lo usaría solamente para IA.

Lo usaría para desacoplar absolutamente todo.

Ejemplo

```
Geo.resolve()
Pricing.quote()
Dispatch.offer()
Driver.assign()
Knowledge.search()
Trip.create()
```

Entonces ya no importa si quien llama es

* WhatsApp
* Meta Agent
* Sitio web
* Panel administrativo
* API pública
* Otro agente

Todos consumen exactamente las mismas herramientas.

---

## Etapa 5 — Event Sourcing parcial (P2)

Aquí discrepo un poco con el análisis.

No haría Event Driven general.

Haría Event Sourced únicamente donde agrega valor.

Por ejemplo

```
Trip Created
↓
Trip Updated
↓
Price Calculated
↓
Driver Offered
↓
Driver Accepted
↓
Passenger Confirmed
↓
Completed
```

Pero Geo Engine... no necesita Event Sourcing.

Pricing... tampoco.

No hay que convertir todo en eventos porque sí.

---

## Agregaría una etapa completamente nueva

Esta para mí es la más importante.

Y curiosamente el análisis no la menciona.

---

## Etapa 6 — Ingeniería del conocimiento

Hoy el conocimiento está distribuido.

Parte en prompts. Parte en código. Parte en tablas. Parte en reglas. Parte en documentación.

Yo construiría algo así:

```
Knowledge Layer
│
├── Geographic Knowledge
├── Operational Knowledge
├── Commercial Knowledge
├── Migration Knowledge
├── Business Policies
├── Fleet Policies
├── Dispatch Policies
└── Conversation Policies
```

Toda decisión debería originarse aquí.

No en prompts. No en código.

---

## Después recién...

Pensaría en

* MCP
* Temporal
* Observabilidad
* Prompt Registry
* Langfuse
* OTel
* Vector DB

Porque esas son tecnologías. No arquitectura.

---

## También cambiaría completamente la visión del Learning

Hoy parece un módulo más.

Yo lo convertiría en un ciclo.

```
Conversación
↓
Modelo Operacional
↓
Ejecución
↓
Resultado
↓
Aprendizaje
↓
Nuevas reglas
↓
Nueva conversación
```

Ese ciclo es muchísimo más poderoso.

El sistema empieza a evolucionar solo.

---

## Y agregaría una última etapa

Esta creo que será la que haga realmente diferente al AITOS.

---

### Operational Intelligence Layer

Hoy el sistema responde.

Mañana debería razonar.

Ejemplos.

El pasajero dice

> "Voy al Meliá."

AITOS debería inferir automáticamente

* aeropuerto probable;
* horario probable;
* tiempo estimado;
* congestión;
* frontera recomendada;
* conductor óptimo;
* riesgos.

Sin preguntar nada.

Eso ya no es conversación.

Es inteligencia operacional.

---

## El roadmap que propondría

| Prioridad | Etapa | Objetivo |
|---|---|---|
| P0 | Congelar el dominio | Preservar el conocimiento acumulado antes de refactorizar. |
| P0 | Separar Conversation → Operational Model → Execution | Aislar responsabilidades y convertir el modelo operacional en el núcleo del sistema. |
| P1 | Modularizar como plataforma AITOS | Que TaxiGuazú pase a ser una implementación del núcleo, no el núcleo mismo. |
| P1 | Arquitectura de Tools | Exponer todos los motores mediante contratos estables (MCP es una implementación posible, no un requisito). |
| P2 | Event Sourcing selectivo | Aplicarlo solo al ciclo de vida del viaje y despacho, donde aporta trazabilidad y resiliencia. |
| P2 | Knowledge Layer | Centralizar el conocimiento operativo y de negocio como un activo independiente del código. |
| P3 | Observabilidad y Evals | Instrumentar el sistema y medir la calidad de decisiones, no solo el funcionamiento técnico. |
| P3 | Operational Intelligence Layer | Incorporar capacidades de inferencia y recomendación basadas en el contexto operativo. |

## La diferencia conceptual más importante

El análisis propone **modernizar una arquitectura**.

Yo propondría **cristalizar un producto**.

Esa diferencia parece sutil, pero cambia todo el roadmap. Si el objetivo es solo adoptar patrones modernos, el foco estará en MCP, Event Bus, observabilidad y workflows durables. Si el objetivo es construir un **AI Transportation Operating System** como plataforma, el foco pasa a ser preservar y formalizar el conocimiento operacional que hace único al sistema, y luego envolverlo con tecnologías modernas sin alterar su esencia. Ese orden reduce el riesgo de perder el activo más valioso: la inteligencia operacional acumulada durante la evolución del proyecto.
