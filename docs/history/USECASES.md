# TaxiGuazú Bot — Casos de Uso

> Documento generado el 13/5/2026. Estado: ✅ funciona, ⚠️ parcial, ❌ pendiente.

---

## 1. Diagrama de flujo general

```
CLIENTE                    BOT (Vercel)                      CHOFER                   TITULAR
   |                          |                                |                        |
   |--- "cuanto sale a..." -->|                                |                        |
   |                          |--- responde tarifa ----------->|                        |
   |<-- "$60.000 ..." -------|                                |                        |
   |                          |                                |                        |
   |--- "confirmo" --------->|                                |                        |
   |                          |--- crea trip + workflow ------>|                        |
   |                          |--- broadcast con botón ------->|                        |
   |                          |                                |--- "✅ Aceptar" ------>|
   |                          |<-- acepta driver --------------|                        |
   |                          |--- asigna atómicamente ------->|                        |
   |                          |--- "Viaje confirmado" -------->|                        |
   |<-- "Tu chofer es X" ----|                                |                        |
   |                          |--- detalles + comisión ------->|                        |
   |                          |--- notifica "tomado" --------->| (a otros choferes)     |
   |                          |                                |                        |
   |                          |    --- 24h después ---         |                        |
   |                          |--- encuesta satisfacción ----->|                        |
   |<-- "¿Cómo estuvo?" -----|                                |                        |
```

---

## 2. Casos de uso — Cliente

### C-01: Consultar precio
| Campo | Valor |
|-------|-------|
| **ID** | C-01 |
| **Trigger** | Cliente envía "cuanto sale a cataratas", "precio aeropuerto", etc. |
| **Flujo** | 1. Bot recibe mensaje → `handleLeadMessage`<br>2. `analyzeClientIntent` detecta `presupuesto`<br>3. `generateGroqReply` responde con tarifa del código CAT-AR, AER-IGR, etc.<br>4. `extractKnownData` extrae datos mencionados (destino, pasajeros) |
| **Estado** | ✅ |

### C-02: Pedir descuento
| Campo | Valor |
|-------|-------|
| **ID** | C-02 |
| **Trigger** | Cliente dice "se puede mejorar?", "descuento?" |
| **Flujo** | 1. Bot detecta `descuento` en intent<br>2. Si cliente lo pide explícitamente → ofrece 10%<br>3. Si son 2 tramos → ofrece 15%<br>4. Si son más de 2 tramos → ofrece 20%<br>5. Urbano mínimo $12.000, no aplica descuento |
| **Reglas** | Regla #1: Solo si el cliente lo pide. Regla #2: Nunca ofrecer por duda/silencio |
| **Estado** | ⚠️ Prompt actualizado, falta verificar que la AI aplique las reglas correctamente |

### C-03: Confirmar viaje con todos los datos
| Campo | Valor |
|-------|-------|
| **ID** | C-03 |
| **Trigger** | Cliente da destino + fecha + hora + pasajeros + confirma |
| **Flujo** | 1. Bot resume datos<br>2. Pide confirmación explícita<br>3. Cliente confirma ("si", "ok", "confirmo", "dale", "procedemos")<br>4. Bot genera marker `[DATOS_VIAJE: CODIGO \| Destino \| Precio \| Pax \| Ahora/Reserva]`<br>5. `lead.service.ts` crea trip en DB<br>6. `escalateToGroup` → broadcast a choferes |
| **Estado** | ✅ |

### C-04: Viaje cruzado (nuevo destino con viaje activo)
| Campo | Valor |
|-------|-------|
| **ID** | C-04 |
| **Trigger** | Cliente tenía viaje a AER asignado, ahora pide CAT-BR |
| **Flujo** | 1. Bot detecta marker con destino distinto al `trip` activo<br>2. Cierra el viaje anterior (`status = completado`)<br>3. Crea nuevo trip<br>4. Escala a choferes con nuevo destino + filtro de país |
| **Estado** | ✅ Fix aplicado |

### C-05: Consulta sin confirmar
| Campo | Valor |
|-------|-------|
| **ID** | C-05 |
| **Trigger** | Cliente pregunta precio y no vuelve a responder |
| **Flujo** | 1. Bot responde tarifa<br>2. Cliente no responde en X tiempo<br>3. Conversación queda en estado "consulta"<br>4. ❌ No se deriva a choferes (pendiente) |
| **Estado** | ❌ No implementado. Pendiente: timeout + broadcast "Cliente interesado en X" |

### C-06: Cliente en Brasil/Paraguay
| Campo | Valor |
|-------|-------|
| **ID** | C-06 |
| **Trigger** | Cliente consulta desde Foz do Iguaçu o en portugués |
| **Flujo** | 1. Bot detecta destino con código BR-* o PY-*<br>2. Broadcast solo a choferes con `country = BR` o `PY`<br>3. ⚠️ Respuestas en español (no portugués) |
| **Estado** | ⚠️ Filtro por país funciona. Prompt no está en portugués. |

### C-07: +6 pasajeros
| Campo | Valor |
|-------|-------|
| **ID** | C-07 |
| **Trigger** | Cliente dice "somos 8 personas" |
| **Flujo** | 1. Bot informa máximo 6 por vehículo<br>2. ❌ Podría ofrecer dividir en 2 autos |
| **Estado** | ❌ No implementado |

### C-08: Cliente vuelve tras viaje completado
| Campo | Valor |
|-------|-------|
| **ID** | C-08 |
| **Trigger** | Cliente que ya tuvo viaje asignado envía nuevo mensaje |
| **Flujo** | 1. Workflow en estado "closed" → `handleLeadMessage` deja pasar<br>2. Se inicia nueva conversación normalmente |
| **Estado** | ✅ |

### C-09: Encuesta post-viaje
| Campo | Valor |
|-------|-------|
| **ID** | C-09 |
| **Trigger** | 24h después de viaje completado (status = 'asignado_chofer') |
| **Flujo** | 1. `checkPostTripSurveys()` encuentra trips sin survey enviado<br>2. Bot envía botones: "😊 Excelente / 😐 Bien / 😠 Mal"<br>3. + "¿Tenés pensado otro viaje? [Sí, Cataratas] [Sí, Foz] [No]"<br>4. Si responde con destino → crear lead, ofrecer viaje<br>5. Si responde "Mal" → notificar titular |
| **Estado** | ❌ Pendiente de implementar |

### C-10: Chat intermediado bot (sin compartir número)
| Campo | Valor |
|-------|-------|
| **ID** | C-10 |
| **Trigger** | Viaje asignado, bot no comparte contacto del pax al chofer |
| **Flujo** | 1. Bot reenvía mensajes entre pax y chofer<br>2. Al final del viaje: "¿Querés compartir tu contacto con el chofer?"<br>3. Si acepta → se comparte. Si no → sigue con bot |
| **Estado** | ❌ Pendiente. Modelo híbrido recomendado. |

---

## 3. Casos de uso — Chofer

### D-01: Registrarse con código
| Campo | Valor |
|-------|-------|
| **ID** | D-01 |
| **Trigger** | Chofer envía `.registrar-juan` |
| **Flujo** | 1. `getDriverCodeByCode("juan")` → verifica código<br>2. Si el código ya tiene teléfono asignado Y es diferente → rechaza<br>3. `getOrCreateConversation(phone)` → inicia ventana 24h<br>4. `registerDriverByCode` → asocia phone al código<br>5. Bot responde "Registrado hasta las 18:30hs" |
| **Estado** | ✅ |

### D-02: Recibir oferta de viaje
| Campo | Valor |
|-------|-------|
| **ID** | D-02 |
| **Trigger** | Cliente confirma viaje, broadcast se envía a choferes |
| **Flujo** | 1. `broadcastTripToDrivers` → filtra por país y capacidad<br>2. Envía botón interactivo "✅ Aceptar"<br>3. Chofer recibe: "🚕 VIAJE DISPONIBLE — Destino: Aeropuerto IGR — Precio: $32.000" |
| **Estado** | ✅ |

### D-03: Aceptar viaje (botón)
| Campo | Valor |
|-------|-------|
| **ID** | D-03 |
| **Trigger** | Chofer toca "✅ Aceptar" |
| **Flujo** | 1. Webhook recibe `message.type = interactive` con `button_reply.id = "aceptar_123"`<br>2. `handleDriverButtonAccept(123, phone)` → `assignWorkflowAtomic`<br>3. UPDATE atómico: solo el primer chofer gana<br>4. Si ganó → recibe detalles + "Recibís: $27.200 (comisión 15%)"<br>5. Cliente notificado "Tu chofer es Juan"<br>6. Otros choferes: "Viaje tomado por otro chofer" |
| **Estado** | ✅ |

### D-04: Aceptar viaje pero ya fue tomado
| Campo | Valor |
|-------|-------|
| **ID** | D-04 |
| **Trigger** | Chofer toca botón pero otro ya aceptó |
| **Flujo** | 1. `assignWorkflowAtomic` retorna false<br>2. Recovery check: re-consulta workflow<br>3. Si otro chofer ganó → "Viaje ya asignado a otro chofer" |
| **Estado** | ✅ |

### D-05: "Llegué" — notificar llegada
| Campo | Valor |
|-------|-------|
| **ID** | D-05 |
| **Trigger** | Chofer registrado envía "llegué" al bot por privado |
| **Flujo** | 1. Webhook: `text = "llegué"` Y `driver = getDriverByPhone(phone)`<br>2. `handleDriverArrived` → busca trip por `assigned_driver_phone`<br>3. Si encuentra → notifica al cliente "🟢 Chofer en camino" |
| **Estado** | ✅ |

### D-06: Ventana 24h vencida
| Campo | Valor |
|-------|-------|
| **ID** | D-06 |
| **Trigger** | Chofer no envía mensaje al bot en más de 24h |
| **Flujo** | 1. `getAvailableDrivers()` filtra por `last_message_at > now - 86400`<br>2. Chofer no está disponible hasta que reenvíe `.registrar-CODIGO` |
| **Estado** | ✅ |

### D-07: Chofer recibe consulta de país equivocado
| Campo | Valor |
|-------|-------|
| **ID** | D-07 |
| **Trigger** | Viaje en Brasil (BR-CAT). Chofer con `country = AR`. |
| **Flujo** | 1. `detectCountry("Cataratas Brasil")` → "BR"<br>2. `getAvailableDrivers({ country: "BR" })`<br>3. Chofer AR no recibe oferta |
| **Estado** | ✅ |

---

## 4. Casos de uso — Admin / Titular

### A-01: Crear chofer
| Campo | Valor |
|-------|-------|
| **ID** | A-01 |
| **Trigger** | Admin envía `.add_chofer juan Juan +543757... sedan 4 rojo ABC123 AR` |
| **Flujo** | 1. Solo el número titular puede ejecutar<br>2. Parsea: code, name, phone, car_type, capacity, color, plate, country<br>3. `createDriverCode` → inserta en `driver_codes` + `drivers` |
| **Estado** | ✅ |

### A-02: Dar de baja chofer
| Campo | Valor |
|-------|-------|
| **ID** | A-02 |
| **Trigger** | Admin envía `.baja_chofer juan` |
| **Flujo** | 1. `deactivateDriverByCode("juan")` → `active = 0`<br>2. Chofer no recibe más ofertas |
| **Estado** | ✅ |

### A-03: Sin choferes disponibles
| Campo | Valor |
|-------|-------|
| **ID** | A-03 |
| **Trigger** | Broadcast encuentra 0 choferes con ventana abierta |
| **Flujo** | 1. `broadcastTripToDrivers` → `drivers.length === 0`<br>2. Notifica al titular: "Viaje sin chofer disponible. Reenviá manualmente."<br>3. Incluye datos: cliente, destino, precio, país |
| **Estado** | ✅ |

### A-04: Timeout de grupo
| Campo | Valor |
|-------|-------|
| **ID** | A-04 |
| **Trigger** | 8 minutos sin que ningún chofer acepte |
| **Flujo** | 1. `checkTimeouts()` → `getExpiredGroupTimeouts(480000)`<br>2. Para cada workflow expirado: close + notificar titular<br>3. Titular recibe: "Ningún chofer tomó el servicio" |
| **Estado** | ✅ |

### A-05: Dashboard
| Campo | Valor |
|-------|-------|
| **ID** | A-05 |
| **Trigger** | Admin accede a `https://taxi-guazu.vercel.app` |
| **Flujo** | 1. Login con API key (almacenada en localStorage)<br>2. Sidebar con conversaciones activas<br>3. Mensajes en tiempo real (poll cada 3s)<br>4. Tomar/release conversación<br>5. Simular mensaje del cliente<br>6. Diseño responsive (funciona en celular) |
| **Estado** | ✅ |

---

## 5. Casos de uso — Sistema

### S-01: Asignación atómica (race condition)
| Campo | Valor |
|-------|-------|
| **ID** | S-01 |
| **Trigger** | Dos choferes tocan "✅ Aceptar" simultáneamente |
| **Flujo** | 1. Ambos ejecutan `assignWorkflowAtomic(convId, phone)`<br>2. SQL: `UPDATE workflows SET ... WHERE conversation_id=? AND state='waiting_group' AND assigned_driver_phone IS NULL`<br>3. Solo el primer UPDATE afecta 1 fila → gana<br>4. Segundo UPDATE afecta 0 filas → "Ya asignado" |
| **Estado** | ✅ |

### S-02: Cold start serverless
| Campo | Valor |
|-------|-------|
| **ID** | S-02 |
| **Trigger** | Instancia de Vercel se apaga por inactividad, luego recibe request |
| **Flujo** | 1. Todo el estado está en Turso (workflows, trips, conversations)<br>2. No hay `setInterval` (usamos Vercel Cron + webhook POST)<br>3. No hay pérdida de datos |
| **Estado** | ✅ |

### S-03: WhatsApp token expirado
| Campo | Valor |
|-------|-------|
| **ID** | S-03 |
| **Trigger** | Meta rechaza token con error 401 OAuthException |
| **Flujo** | 1. `postToWhatsApp` recibe error 401<br>2. Log: `[SEND ERROR] { error: { code: 190, message: 'Authentication Error' } }`<br>3. Bot no responde hasta que se actualice el token<br>4. **Solución:** token de System User (hasta 60d sin expiración) ya configurado |
| **Estado** | ✅ (token permanente seteado) |

### S-04: Turso caído
| Campo | Valor |
|-------|-------|
| **ID** | S-04 |
| **Trigger** | Base de datos Turso no responde |
| **Flujo** | 1. `getDbv().execute(...)` lanza error<br>2. Webhook catch → devuelve 500<br>3. Meta reintenta el mensaje hasta 3 veces<br>4. ❌ Sin fallback local (solo `/tmp/bot.db` si no hay `TURSO_DATABASE_URL`) |
| **Estado** | ❌ Sin plan de contingencia. Recomendación: tener réplica de Turso o backup. |

### S-05: Mensaje malformado de Meta
| Campo | Valor |
|-------|-------|
| **ID** | S-05 |
| **Trigger** | Meta envía payload con estructura inesperada |
| **Flujo** | 1. `POST` handler catch general<br>2. Log: `[WEBHOOK] Error procesando mensaje:`<br>3. Devuelve 200 (para evitar que Meta reintente) |
| **Estado** | ✅ |

### S-06: Consulta sin respuesta → broadcast informativo
| Campo | Valor |
|-------|-------|
| **ID** | S-06 |
| **Trigger** | Cliente preguntó precio, no volvió a responder en N minutos |
| **Flujo** | 1. `checkTimeouts()` detecta conversaciones "estancadas"<br>2. ❌ No implementado aún |
| **Estado** | ❌ Pendiente |

---

## 6. Matriz de prioridades

| ID | Impacto | Esfuerzo | Prioridad |
|----|---------|----------|-----------|
| C-09 | Alto | Medio | 1 |
| A-03 | Alto | Bajo | ✅ hecho |
| D-05 | Medio | Bajo | ✅ hecho |
| C-05 | Alto | Medio | 2 |
| C-06 | Medio | Bajo | ⚠️ parcial |
| C-07 | Medio | Bajo | 3 |
| C-10 | Alto | Alto | 4 (modelo híbrido) |
| S-04 | Alto | Medio | 3 |
| S-06 | Medio | Medio | 2 |

---

## 7. Reglas de comisión

| Concepto | Valor |
|----------|-------|
| **Porcentaje** | 15% del precio base del viaje |
| **Cálculo** | `commission = round(price_base * 0.15)`<br>`driver_payout = price_base - commission` |
| **Momento de cobro** | Pendiente de definir (MP link, débito, fin de mes) |
| **Visibilidad** | El chofer ve al aceptar: "Recibís: $27.200 (comisión 15%)" |
| **Dashboard** | Pendiente: tabla de comisiones pendientes / pagadas |

---

*Fin del documento*
