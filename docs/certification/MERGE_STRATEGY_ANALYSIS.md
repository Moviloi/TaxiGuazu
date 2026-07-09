# MERGE STRATEGY ANALYSIS — AITOS
## 2026-07-08

---

## Flujo del merge

1. `prevSlotsEarly` cargado de sesión (línea 152)
2. `confidenceResult` producido por `calculateSlotConfidence` (línea 288)
3. **Loop de merge** (líneas 457-468): para cada slot en prevSlotsEarly:
   - Si el slot NO está en confidenceResult → insertar con score 0.8
   - Si el slot ESTÁ pero valor difiere Y el valor actual no aparece en el texto → restaurar prevSlots

## Qué resuelve

- **Previene pérdida de contexto**: si el LLM no extrae un slot que ya existía, se preserva
- **Previene alucinaciones**: si el LLM cambia un valor que no está en el texto del usuario, se restaura

## Qué NO puede evitar

- **Asignación incorrecta de rol**: si el extractor asigna `destination = "Aeropuerto IGR"` (con valor extraído), el merge ve que el valor difiere del previo (`"Hotel Amerian"`), verifica que no está en el texto, y RESTAURA. Esto funciona para B3 si el extractor efectivamente devuelve `destination = "Aeropuerto IGR"`.
- **Pero**: si el extractor NO devuelve destination (porque `resolveLocation` no hizo fuzzy match para "argentino"), el merge inserta el valor previo correctamente. ✅

## Conclusión

El merge en su forma actual es correcto y necesario. El problema no está en el merge — está en que el extractor produce resultados que requieren corrección. El merge es un safety net, no debería ser la primera línea de defensa.
