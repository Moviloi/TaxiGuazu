# MESSAGE TAXONOMY — AITOS
## Taxonomía completa de mensajes conversacionales

---

## Categorías

### 1. new_request — Nueva solicitud
- **Definición**: El usuario inicia una solicitud de viaje. No hay slots previos o son de una conversación anterior.
- **Ejemplos**: `"necesito un traslado"`, `"aeropuerto a hotel"`, `"quiero ir a Cataratas"`
- **Pipeline**: Extracción completa. Entity extractor asigna roles normalmente.

### 2. clarification — Aclaración
- **Definición**: El usuario provee información adicional para un slot sin contradecir lo anterior. No es corrección.
- **Ejemplos**: `"argentino"` (aclara lado), `"el de Brasil"` (aclara país), `"con aire"` (aclara vehículo)
- **Pipeline**: Entity extractor debe retornar ubicaciones sin asignar roles. El intérprete decide a qué slot aplica.

### 3. correction — Corrección
- **Definición**: El usuario cambia explícitamente un valor previamente establecido.
- **Ejemplos**: `"no, el destino es Cataratas"`, `"cambia el origen a Foz"`, `"me equivoqué, son 5"`
- **Pipeline**: Marcar slot como USER_CORRECTED. Reemplazar valor.

### 4. confirmation — Confirmación
- **Definición**: Afirmación o negación a una pregunta del bot.
- **Ejemplos**: `"sí"`, `"ok"`, `"dale"`, `"no"`, `"cancelar"`
- **Pipeline**: Ya manejado por state zones. El intérprete lo clasifica pero el routing existente lo procesa.

### 5. selection — Selección
- **Definición**: El usuario elige entre opciones presentadas.
- **Ejemplos**: `"el primero"`, `"la opción 2"`, `"Cataratas argentinas"`
- **Pipeline**: Ya manejado por ambiguity-handler. El intérprete confirma que es selección.

### 6. answer — Respuesta
- **Definición**: El usuario responde una pregunta específica del bot (no es afirmación/negación).
- **Ejemplos**: `"2"` (cuando preguntó pasajeros), `"mañana a las 8"` (cuando preguntó horario)
- **Pipeline**: Asignar respuesta al slot que el bot preguntó (`clarify_field`).

### 7. continuation — Continuación
- **Definición**: El usuario agrega información a una conversación en curso sin cambiar el tema.
- **Ejemplos**: `"y también necesito recoger en el hotel primero"`, `"ah, y somos 4"`
- **Pipeline**: Extracción parcial. Solo extraer lo nuevo, preservar lo existente.

### 8. topic_change — Cambio de tema
- **Definición**: El usuario cambia explícitamente el tema de la conversación.
- **Ejemplos**: `"cambiando de tema, ¿aceptan tarjeta?"`, `"otra cosa, ¿tienen tours?"`
- **Pipeline**: Consulta informativa. No tocar slots de viaje.

### 9. cancel — Cancelación
- **Definición**: El usuario cancela explícitamente la operación actual.
- **Ejemplos**: `"cancelar"`, `"olvidate"`, `"dejalo así"`
- **Pipeline**: Resetear o volver atrás. Ya manejado parcialmente por state zones.

### 10. small_talk — Conversación social
- **Definición**: Saludos, cortesías, mensajes sin intención de negocio.
- **Ejemplos**: `"gracias"`, `"buen día"`, `"👍"`
- **Pipeline**: Respuesta social. No modificar estado.

### 11. other — No clasificable
- **Definición**: El mensaje no encaja en ninguna categoría. Fallback.
- **Ejemplos**: `"asdfghjkl"`, audio sin transcribir, imagen sin caption
- **Pipeline**: Tratar como new_request con baja confianza.
