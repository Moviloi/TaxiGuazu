# PIPELINE V2 PROPOSAL — Conversation-Aware
## 2026-07-08

---

## Pipeline actual vs V2

```
ACTUAL (v1):
  WhatsApp → lead.service → core() → [state zones] → extractSlots()
           → merge → workflow → policy → response

  Problemas:
  - Entity extractor no conoce el contexto conversacional
  - Solo slot_confirmation tiene clasificación de mensajes
  - Merge corrige resultados que no deberían producirse
  - B3 y familia de bugs existen porque el extractor opera a ciegas

PROPUESTO (v2):
  WhatsApp → lead.service → core() → ConversationInterpreter
           → [state zones simplificadas]
           → extractSlots(text, classification)
           → merge (safety net only)
           → workflow → policy → response

  Mejoras:
  - El extractor recibe classification: new_request | clarification | correction | answer
  - Las state zones se simplifican (el intérprete ya clasificó)
  - Merge solo corrige errores residuales, no es primera línea de defensa
  - B3 prevenido en el intérprete, no parcheado en el extractor
```

## Conversation Interpreter en el flujo

```
text = "argentino"
  │
  ├─ core("argentino") → intent=PRE_BOOKING, facts=["affirmation:true"]
  │
  ├─ ConversationInterpreter({
  │     text: "argentino",
  │     intent: "PRE_BOOKING",
  │     slotState: "collecting_slots",
  │     prevSlots: { origin: "Aeropuerto IGR", destination: "Hotel Amerian" }
  │   })
  │   → { type: "clarification", targetSlot: null, confidence: 0.6 }
  │
  ├─ [Si classification = "clarification" y no es slot_confirmation]
  │   → NO llamar a extractSlots
  │   → Preservar slots actuales
  │   → Re-preguntar o confirmar
  │
  └─ B3 EVITADO en origen
```

## Reglas de simplificación de state zones

Actualmente lead.service tiene 8 zonas de estado. Con el Conversation Interpreter:

| Zona actual | Con Intérprete | Cambio |
|---|---|---|
| Command shortcuts | Sin cambio | — |
| Conversation setup | Sin cambio | — |
| GREETING shortcut | Sin cambio | — |
| Slot confirmation buttons | Sin cambio | — |
| Slot confirmation text | **Simplificada** | El intérprete ya clasificó el mensaje |
| Awaiting passenger | **Simplificada** | El intérprete detecta "answer" con targetSlot=passengers |
| Awaiting confirmation | **Simplificada** | El intérprete detecta "confirmation" |
| Ambiguity handler | Sin cambio | — |
| Post-booking zone | Sin cambio | — |
