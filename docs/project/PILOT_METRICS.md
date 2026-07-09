# PILOT METRICS — AITOS
## v1.0 | 2026-07-08

---

## Métricas oficiales

| # | Métrica | Definición | Objetivo piloto |
|---|---|---|---|
| 1 | **Conversation Success Rate** | % de conversaciones que terminan en reserva o info resuelta | > 60% |
| 2 | **Quote Success Rate** | % de intentos de cotización que producen precio > 0 | > 80% |
| 3 | **Booking Conversion Rate** | % de conversaciones con ruta que crean trip | > 40% |
| 4 | **Avg Messages to Quote** | Promedio de mensajes hasta obtener precio | < 4 |
| 5 | **Avg Messages to Booking** | Promedio de mensajes hasta trip creado | < 8 |
| 6 | **Clarification Rate** | % de mensajes que requieren re-preguntar | < 20% |
| 7 | **Misunderstanding Rate** | % de mensajes donde el bot escala o pide reformular | < 10% |
| 8 | **Human Intervention Rate** | % de conversaciones escaladas a admin | < 5% |
| 9 | **Dispatch Success Rate** | % de trips que encuentran chofer | > 70% |
| 10 | **Customer Friction Score** | Suma de repeticiones + correcciones + escalaciones por conversación | < 2 |
| 11 | **Avg Response Time** | Tiempo promedio desde mensaje hasta respuesta del bot | < 5s |
| 12 | **Conversation Completion Rate** | % de conversaciones que llegan a un estado terminal (reserva, info, cancel) | > 80% |

---

## Fuentes de datos

| Métrica | Fuente |
|---|---|
| 1-5, 12 | `trips` + `conversations` + `messages` |
| 6-7 | Extraction logs: `[CLARIFY]`, `[COMPREHENSION]` |
| 8 | `chat_sessions` con `escalation_reason` |
| 9 | `dispatch_events` |
| 10 | Agregado de eventos: `[CORRECTION]`, `[AMBIGUITY]`, `[ESCALATION]` |
| 11 | Vercel logs / middleware timing |
