# SLOT MERGE BUG AUDIT — "argentino" → destination overwritten
## B3 | 2026-07-08

---

## 1. Caso reproducible

| Turno | Usuario | Sistema | Estado |
|---|---|---|---|
| 1 | `hola` | GREETING response | idle |
| 2 | `necesito hacer una reserva` | ¿Desde dónde salís? | collecting_slots |
| 3 | `desde el aeropuerto` | ¿A dónde vas? | collecting_slots (origin=Aeropuerto IGR) |
| 4 | `hotel amerian` | Confirma: IGR → Hotel Amerian | slot_confirmation |
| 5 | `argentino` | ❌ destination → Aeropuerto IGR | slot_confirmation |

---

## 2. Árbol causa → efecto

```
"argentino" llega → slotState = slot_confirmation
    │
    ├─→ [SLOT_CONFIRMATION TEXT HANDLER]
    │     │
    │     ├─ isAffirmativeMessage("argentino") → false
    │     ├─ isNegativeMessage("argentino") → false
    │     ├─ isCorrectionMessage("argentino") → false
    │     │
    │     ├─ leadCore.roleLock → { origin: null, dest: null }
    │     │   → no slot updates
    │     │
    │     └─ SIMPLE regex patterns → no match
    │         → fallback message ("Usá los botones")
    │         → destination = "Hotel Amerian" (UNCHANGED here)
    │
    │  ⚠️ PERO: el slot_confirmation text handler fue ENVIADO a producción
    │  en A6. En versiones ANTERIORES a A6, esta lógica estaba inline en
    │  lead.service.ts. Si alguna diferencia de comportamiento se introdujo
    │  durante la extracción, este camino podría diferir.
    │
    ├─→ [ALTERNATIVO: si slotState NO es slot_confirmation]
    │     │
    │     ├─→ [NORMAL PIPELINE: extraction-runner]
    │     │     │
    │     │     ├─ extractSlots("argentino")
    │     │     │   ├─ regexExtractSlots → null
    │     │     │   ├─ entityExtractSlots ← **BUG HERE**
    │     │     │   │
    │     │     │   │   entity-extractor.ts:168
    │     │     │   │   resolveLocation("argentino")
    │     │     │   │     → fuzzy match a "Aeropuerto IGR (Argentina)"
    │     │     │   │     → confidence = "fuzzy"
    │     │     │   │
    │     │     │   │   entity-extractor.ts:189-198
    │     │     │   │   SIN marcadores de origen/destino
    │     │     │   │   → destination = "Aeropuerto IGR"
    │     │     │   │
    │     │     │   │   ⚠️ EL BUG: una palabra que el usuario usa
    │     │     │   │   para CLARIFICAR ("argentino") es tratada como
    │     │     │   │   un NUEVO destino porque el extractor asigna
    │     │     │   │   a destination por default.
    │     │     │   │
    │     │     │   └─ return { origin: null, dest: "Aeropuerto IGR" }
    │     │     │
    │     │     ├─ [MERGE PREVSLOTS] (line 457-468)
    │     │     │   ├─ prevSlotsEarly = { origin: "Aeropuerto IGR",
    │     │     │   │                     destination: "Hotel Amerian" }
    │     │     │   │
    │     │     │   ├─ confidenceResult.slots.destination = "Aeropuerto IGR"
    │     │     │   │
    │     │     │   ├─ line 461: "Aeropuerto IGR" != "Hotel Amerian" ✓
    │     │     │   ├─ line 463: !"argentino".includes("aeropuerto igr") ✓
    │     │     │   └─ line 464: destination RESTORED to "Hotel Amerian"
    │     │     │
    │     │     └─ **MERGE PROTEGE — destination sobrevive**
    │     │
    │     └─→ [UPSERT CHAT SESSION]
    │           → slots persistidos correctamente con ambos valores
    │
    └─→ **CONCLUSIÓN: Si el usuario está en slot_confirmation,**
         el destino NO debería perderse.
         
         Si el usuario está en collecting_slots,
         el extractor de entidades produce un falso positivo.
```

---

## 3. Causa raíz detectada

**Archivo**: `src/lib/services/extraction/entity-extractor.ts:189-198`

```typescript
// Línea 189-198: Sin marcadores → asigna a destination por default
return {
  origin: null,
  destination: resolved.canonical_name,  // ← "Aeropuerto IGR"
  passengers: null,
  ...
};
```

**Mecanismo**: Cuando `resolveLocation("argentino")` hace fuzzy match a "Aeropuerto IGR (Argentina)" (Levenshtein ≤ 3), y el texto NO contiene marcadores explícitos de origen/destino, el extractor asigna el resultado a `destination` por default. Esto hace que una palabra de clarificación ("argentino" = lado argentino) se interprete como un nuevo destino.

**Archivo**: `src/lib/services/geo/location-resolver.ts` — `resolveLocation()` con su búsqueda fuzzy (alias → canonical → accent-insensitive → fuzzy). Si existe un alias con distancia Levenshtein ≤ 3 entre "argentino" y algún nombre de lugar, el matcher devuelve `confidence: "fuzzy"`.

---

## 4. Propuesta mínima de corrección

**Opción A — Modificar entity-extractor.ts (línea 172)**:
Agregar un threshold más estricto para el fuzzy matching cuando el texto es una sola palabra sin marcadores de ubicación. Si `confidence === "fuzzy"` y el texto es una sola palabra, no asignar a destination.

**Riesgo**: BAJO. Afecta solo el caso de fuzzy matching sin marcadores.

**Opción B — Modificar entity-extractor.ts (línea 189-198)**:
Cuando el texto no tiene marcadores de origen/destino, retornar `null` en lugar de asignar a destination. Esto fuerza al LLM a procesar el texto.

**Riesgo**: MEDIO. Puede romper casos donde el usuario dice solo un nombre de lugar (ej: "cataratas") y el sistema debe interpretarlo como destino.

**Opción C (recomendada) — Agregar guard en entity-extractor**:
Si el texto NO contiene un nombre de lugar conocido (hotel, POI, código de aeropuerto) y solo se resuelve por fuzzy matching, NO retornar un resultado del extractor de entidades. Solo usar el fuzzy matching cuando el texto contiene al menos 2 palabras o un marcador de ubicación.

**Riesgo**: BAJO. El LLM sigue disponible como fallback para textos ambiguos.

---

## 5. Riesgos de la modificación

| Riesgo | Probabilidad |
|---|---|
| Romper detección de typos reales (ej: "aeropuerto" mal escrito) | BAJA |
| Regresión en extracción de destinos sin preposición | MEDIA |
| Aumentar llamadas al LLM (sin entity match) | BAJA |

---

*Archivos inspeccionados: `entity-extractor.ts:167-198`, `extraction-runner.ts:457-468`, `slot-confirmation-text-handler.ts:46-84`, `location-resolver.ts:26-64`.*
