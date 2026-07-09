# CONVERSATION INTERPRETER — Contract
## ADR-007 | 2026-07-08

---

## Responsabilidades

### DEBE
- Clasificar el rol conversacional del mensaje entrante
- Detectar aclaraciones (ej: "argentino" cuando hay destino pendiente)
- Detectar correcciones (ej: "no, el destino es Cataratas")
- Detectar continuaciones (ej: "y también necesito...")
- Detectar respuestas a preguntas específicas (ej: "dos" cuando se preguntó por pasajeros)
- Detectar selección entre opciones (ej: "el primero")
- Detectar cambio de tema (ej: "cambiando de tema, ¿cuánto sale...?")

### NO DEBE
- Extraer entidades (responsabilidad del Entity Extractor)
- Evaluar confianza (responsabilidad de Confidence)
- Decidir transiciones de estado (responsabilidad del Workflow)
- Construir respuestas (responsabilidad de Policy)
- Acceder a DB (solo lectura de estado ya cargado)
- Mantener estado propio (es una función pura)
- Tomar decisiones de negocio (solo clasifica)

---

## Contrato público

### Entrada

```typescript
interface ConversationContext {
  text: string;                          // mensaje del usuario (crudo)
  intent: Intent;                        // de core()
  slotState: ConversationalState | null; // de chat_sessions
  prevSlots: Record<string, any>;        // slots previos (ya parseados)
  lastBotQuestion: string | null;        // última pregunta del bot (opcional)
  history: Message[];                    // últimos N mensajes (opcional)
}
```

### Salida

```typescript
interface MessageClassification {
  type: MessageType;                     // clasificación principal
  confidence: number;                    // 0.0-1.0
  targetSlot: SlotKey | null;            // slot al que se refiere (si aplica)
  isCorrection: boolean;                 // ¿está corrigiendo un valor previo?
  isClarification: boolean;              // ¿está aclarando sin corregir?
  reason: string;                        // justificación para debugging
}

type MessageType =
  | "new_request"      // nueva solicitud de viaje
  | "clarification"    // aclara un slot existente
  | "correction"       // corrige un valor previo
  | "confirmation"     // afirma o niega
  | "selection"        // elige entre opciones
  | "answer"           // responde una pregunta específica
  | "continuation"     // continúa la conversación
  | "topic_change"     // cambia de tema
  | "cancel"           // cancela
  | "small_talk"       // saludo, cortesía
  | "other";           // no clasificable
```

### Ejemplos

| Texto | Estado | Slots | Salida |
|---|---|---|---|
| `"argentino"` | `collecting_slots` | origin=IGR, dest=Hotel Amerian | `{ type: "clarification", targetSlot: null, confidence: 0.6 }` |
| `"no, el destino es Cataratas"` | `slot_confirmation` | origin=IGR, dest=Centro | `{ type: "correction", targetSlot: "destination", confidence: 0.9 }` |
| `"dos"` | `awaiting_passenger` | origin=IGR, dest=Centro | `{ type: "answer", targetSlot: "passengers", confidence: 0.8 }` |
| `"sí"` | `awaiting_confirmation` | origin=IGR, dest=Centro | `{ type: "confirmation", targetSlot: null, confidence: 0.95 }` |
| `"quiero ir al aeropuerto"` | `idle` | {} | `{ type: "new_request", targetSlot: null, confidence: 0.9 }` |
