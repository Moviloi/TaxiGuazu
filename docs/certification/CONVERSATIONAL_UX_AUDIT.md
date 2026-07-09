# CONVERSATIONAL UX AUDIT — AITOS
## 2026-07-08

---

## 1. Arquitectura de respuesta

El bot usa dos capas para generar respuestas:

| Capa | Responsable | Cuándo | Ejemplo |
|---|---|---|---|
| **Templates i18n** | `response-builder.ts` + `catalog.ts` | Respuestas operativas (clarify, price, confirm) | `"¿Desde dónde salís?"` |
| **LLM polish** | `llm-response.ts` | Respuestas informativas, greetings | "¡Hola! Soy Cris..." |

**Hallazgo**: La separación es correcta — policy decide QUÉ, LLM decide CÓMO. Pero las respuestas operativas (que son la mayoría) son templates fijos.

## 2. Personalidad

El bot se identifica como "Cris Virtual, asistente 24/7 de TaxiGuazú". Es honesto: "Sos un bot conversacional — no te hagas pasar por humano". Esto genera confianza.

**Reglas de comportamiento** (por idioma, en `llm-response.ts:121-155`):
- No inventar datos
- Tono natural conversacional
- Máximo 2-3 oraciones (o 5 para informativas)
- Sin viñetas ni formato de lista
- El chofer coordina, no el bot

**Hallazgo**: Bien diseñado. Pero las reglas solo aplican cuando el LLM genera la respuesta. Los templates fijos no pasan por este filtro de naturalidad.

## 3. Calidad de respuestas — por tipo

| Tipo | Generador | Naturalidad | Riesgo |
|---|---|---|---|
| Greeting | LLM polish | ALTA | Bajo |
| Clarify (preguntar campo) | Template i18n | MEDIA | Suena repetitivo después de 3 turnos |
| Price quote | Template i18n | MEDIA | Sin variación — mismo formato siempre |
| Confirmation UI | `slot-confirmation.ts` | ALTA | Botones interactivos |
| Error / fallback | Template i18n | MEDIA | Frío: "Error interno" |
| Dispatch (buscando chofer) | Template i18n | BAJA | Siempre igual: "Buscando chofer disponible" |
| Informational | LLM polish | ALTA | Bueno |
| Emergency | Template i18n | MEDIA | Frío para una emergencia |

## 4. Hallazgos de fricción

| Fricción | Causa | Impacto |
|---|---|---|
| Templates repetitivos | `clarify.origin` siempre es "¿Desde dónde salís?" | Usuario siente que el bot no escucha |
| "Buscando chofer" es muy genérico | Template fijo | No da confianza — parece automático |
| Sin uso del nombre del pasajero | Solo en greeting inicial | Pierde personalización |
| Strings hardcodeados en handlers | Fuera del catálogo i18n | Sin multi-idioma en esos mensajes |
| Sin variación según hora del día | Sin contexto temporal | "Buenos días" no se usa en templates |

## 5. Oportunidad comercial

El bot actualmente:
- ✅ Pregunta por slots sistemáticamente
- ✅ Muestra precio claramente
- ✅ Confirma antes de ejecutar
- ❌ No ofrece alternativas ("¿preferís auto o camioneta?")
- ❌ No hace upsell ("¿aprovechás y vas a las Cataratas?") — solo en oportunidades post-booking
- ❌ No genera urgencia ("quedan 2 choferes disponibles")
- ❌ No personaliza por recurrencia ("la última vez fuiste a Cataratas, ¿esta vez también?")

## 6. Métricas de experiencia (propuesta)

| Métrica | Definición | Cómo medir |
|---|---|---|
| **Conversation Success Rate** | % de conversaciones que terminan en reserva o información resuelta | `trips created / conversations with intent` |
| **Messages to Booking** | Promedio de mensajes hasta crear un trip | `count(messages) per trip` |
| **Clarification Rate** | % de mensajes que requieren re-preguntar | `clarify actions / total actions` |
| **Human Handoff Rate** | % de conversaciones escaladas a admin | `escalation_reason IS NOT NULL / total conversations` |
| **Customer Friction Score** | Suma de: repeticiones de slots + correcciones + escalaciones | Agregado de eventos de fricción |
