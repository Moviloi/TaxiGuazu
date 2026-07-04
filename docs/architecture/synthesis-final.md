# Síntesis final — Resolución entre proposal-claude.md y counterproposal-colleague.md
> Autor: Claude · Documento con autoridad final en caso de conflicto entre
> `proposal-claude.md` y `counterproposal-colleague.md`.
> No tiene autoridad automática sobre ADRs ya existentes en el repo — si un ADR
> contradice algo de este documento, es una contradicción a reportar, no a resolver acá.

Hay partes de la contrapropuesta del colega que son objetivamente mejores que la
propuesta original de Claude, y una parte que es el error más caro que se podría
cometer con TaxiGuazú en este momento. A continuación, cuál es cuál.

## Lo que la contrapropuesta mejoró de verdad

**Etapa 6 — Knowledge Layer.** Es un hallazgo real que no estaba en la propuesta
original. El conocimiento operacional de TaxiGuazú hoy vive fragmentado entre
prompts, código, tablas y la cabeza del fundador, y eso es más grave que cualquier
brecha de infraestructura señalada en `proposal-claude.md`. Se adopta sin reservas.

**Etapa 4 — Tools para todo, no solo para IA.** Mejora real. La propuesta original
enmarcó MCP como capa de contrato *para el LLM*. La contrapropuesta tiene razón en
que el valor más grande es desacoplar **cualquier** consumidor (WhatsApp, panel
admin, web) de la implementación de Geo/Pricing/Dispatch, tenga o no LLM en el medio.
Se adopta la generalización.

**Etapa 5 — Event Sourcing selectivo.** Ambos documentos llegan a la misma conclusión
(no todo, solo el ciclo de vida del viaje/despacho), pero la contrapropuesta la
justifica mejor: no es "porque es lo moderno", es porque ahí es donde la trazabilidad
tiene valor de negocio real. Se adopta la justificación de la contrapropuesta.

**El ciclo de Learning como loop, no como módulo.** Conceptualmente más rico que en
la propuesta original. Coincide además con lo que ya existe en el código
(`services/learning/`), solo que sin ese marco. Se adopta.

## Donde la contrapropuesta se equivoca — y es el punto que más importa

### La Etapa 3 ("convertir el Core en plataforma") es un riesgo, no una mejora

Es **generalización prematura** — el antipatrón clásico de construir un framework
genérico ("AITOS como plataforma, TaxiGuazú como una implementación") antes de tener
un **segundo consumidor real y validado** que justifique esa abstracción. Hoy ese
segundo caso de uso no existe: cualquier otro producto relacionado (si lo hubiera)
es un negocio aparte, sin relación operativa con TaxiGuazú en este momento. Sin un
segundo caso concreto, "plataformizar" no es una decisión de arquitectura — es una
apuesta especulativa pagada con complejidad real hoy.

Regla aplicada (rule of three): no se generaliza una abstracción hasta tener al
menos dos usos concretos que la necesiten de formas distintas. Con uno solo, la
plataforma que se diseñe hoy va a estar adivinando los requisitos del segundo caso,
y cuando ese caso llegue, casi seguro habrá que rehacerla.

**Resolución:** se ejecuta la Etapa 4 (tools con contratos estables) porque es
gratis y correcta — separa responsabilidades sin inventar generalidad que nadie
pidió. No se diseña para una segunda implementación imaginaria, no se menciona ni
se deja placeholder para ningún otro producto. El día que exista un segundo
consumidor real, ahí se extrae la plataforma — con dos ejemplos reales delante, no
con una expectativa.

### La secuencia "congelar el dominio antes de tocar una línea" es un gate demasiado rígido

Documentar el modelo de dominio antes de refactorizar reduce el riesgo de romper
reglas invisibles — de acuerdo en espíritu. Pero hay issues de producción reales
hoy que no dependen de ningún modelo de dominio para resolverse: el bug
multilingüe (customs/border) y el webhook sin HMAC obligatorio ni rate limiting.
Esperar a que exista un glosario único y diagramas de estado completos antes de
tocarlos es priorizar prolijidad conceptual por sobre un pasajero varado o un
webhook falsificable.

**Resolución:** estos arreglos van en **paralelo** a las etapas de modelado de
dominio, nunca bloqueados detrás de "primero documentar todo el dominio".

### La Operational Intelligence Layer es la visión correcta, pero "sin preguntar nada" contradice el activo real del sistema

Todo lo que hace fuerte a la arquitectura actual es que el determinismo vive en el
centro y el LLM nunca decide solo. Inferir aeropuerto, horario, frontera y
conductor "sin preguntar nada" es exactamente lo opuesto — dejar que el sistema
actúe sobre una suposición no confirmada en una decisión con consecuencia
económica y operativa real.

**Resolución:** se reformula como **"inferir y confirmar"**, no **"inferir y
ejecutar"** — el sistema prepara automáticamente la cotización probable y la
presenta como sugerencia de un tap, pero la confirmación explícita del usuario
sigue siendo la que dispara la ejecución. Esto además depende de que la Etapa 6
(Knowledge Layer) exista primero con datos reales acumulados — se mantiene en P3,
después del Knowledge Layer, no antes.

## Roadmap combinado (con autoridad final sobre este debate)

| Prioridad | Qué | De quién |
|---|---|---|
| P0 (paralelo, no bloqueante) | Fix multilingüe + HMAC obligatorio + rate limiting | Propuesta original — no negociable, riesgo de producción activo |
| P0 | Modelar Trip, Dispatch, Pricing, Geo, Session (no todo el dominio de una vez — estos cinco primero) | Contrapropuesta, acotada |
| P1 | Tools con contratos estables para Geo/Pricing/Dispatch/Fleet, consumidos hoy solo por TaxiGuazú | Fusión — generalización de "tools para todo" de la contrapropuesta, sin el salto a "plataforma" |
| P1 | Knowledge Layer (geográfico, operacional, comercial, políticas) | Contrapropuesta — el mejor aporte del documento |
| P2 | Event sourcing selectivo en ciclo de vida del viaje/despacho | Coincidencia de ambos documentos |
| P2 | Observabilidad + evals | Propuesta original |
| P3 | Operational Intelligence Layer, versión "infiere y confirma" | Contrapropuesta, con ajuste de determinismo |
| Diferido, sin fecha | "AITOS como plataforma" con TaxiGuazú como implementación | Solo el día que exista un segundo consumidor real y validado |

## Conclusión

La contrapropuesta tiene razón en *qué proteger* (el conocimiento operacional),
pero se equivoca en *cómo* protegerlo — construyendo una plataforma especulativa
en vez de blindar el producto único que hoy genera ingresos. Este roadmap combinado
es la versión con autoridad final para la generación del backlog.
