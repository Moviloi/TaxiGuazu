# ARCHITECTURE RECOMMENDATION — Conversation-Aware Pipeline
## 2026-07-08

---

## Pipeline actual vs propuesto

```
ACTUAL:
  text → core(text, prevIntent) → intent
       → [lead.service state zones] → routing
       → extractSlots(text) → entity + LLM → slots
       → merge(prevSlots) → corrected slots
       → workflow → state
       → policy → response

PROPUESTO:
  text → core(text, prevIntent) → intent
       → ConversationInterpreter(text, intent, state, prevSlots)
           → classification: new_request | clarification | correction | confirmation
       → [lead.service state zones] → routing (simplified)
       → extractSlots(text, classification) → entity + LLM → informed extraction
       → merge(prevSlots) → safety net only
       → workflow → state
       → policy → response
```

## Conversation Interpreter

**Nuevo componente**. Responsabilidad única: clasificar el mensaje según su rol conversacional.

**Input**: texto, intent de CORE, estado conversacional, slots previos, historial.

**Output**: `MessageClassification` ∈ { new_request, clarification, correction, confirmation, selection, continuation, cancel, other }.

**Decisiones**:
- `new_request`: el usuario inicia una nueva solicitud. Extracción completa.
- `clarification`: el usuario aclara un slot existente. Asignar al slot correspondiente.
- `correction`: el usuario corrige un slot. Reemplazar y marcar USER_CORRECTED.
- `confirmation`: afirmación/negación. Ya manejado por zonas de estado.
- `selection`: el usuario elige entre opciones. Ya manejado por ambiguity-handler.
- `continuation`: el usuario continúa una conversación existente. Preservar slots.
- `cancel`: el usuario cancela. Resetear o volver atrás.

## Impacto en entity-extractor

El extractor recibe `classification` y:
- Si `new_request`: comportamiento actual (asignar destination por default)
- Si `clarification`: no asignar roles. Retornar ubicaciones encontradas sin asignar.
- Si `correction`: asignar al slot que está siendo corregido.
- Otros: no llamar al extractor.

## Impacto en B3

"argentino" → ConversationInterpreter detecta: estado=collecting_slots, prevSlots={origin, destination} → classification=`clarification`. Entity extractor recibe `clarification` → no asigna destination a fuzzy matches de una palabra. B3 evitado en origen.
