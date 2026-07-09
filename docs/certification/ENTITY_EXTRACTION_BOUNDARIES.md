# ENTITY EXTRACTION BOUNDARIES — AITOS
## 2026-07-08

---

## Contrato actual

```typescript
entityExtractSlots(text: string): TripExtraction | null
```

**Entrada**: solo texto. Sin contexto conversacional.

**Salida**: `TripExtraction` con origin/destination asignados por reglas heurísticas.

## Suposiciones del extractor

1. **Default destination** (línea 189-198): si `resolveLocation()` encuentra algo sin marcadores, es destino.
2. **Hotel → destination** (línea 121): hoteles siempre son destino.
3. **POI → origin** (línea 155): puntos de interés sin marcadores son origen.
4. **Airport code → destination** (línea 102): códigos IATA sin marcadores son destino.

**Todas estas suposiciones son válidas para mensajes NUEVOS, pero incorrectas para aclaraciones.**

## Qué debería hacer el extractor

Retornar ubicaciones encontradas sin asignar roles:
```typescript
{
  locations: [
    { text: "argentino", resolved: "Aeropuerto IGR", confidence: "fuzzy" }
  ],
  hotels: ["amerian"],
  pois: [],
  airport_codes: []
}
```

La asignación de roles (origin/destination) debería hacerla un componente con acceso al estado conversacional.

## Por qué hoy no puede

El extractor no recibe parámetros de contexto. Su firma es `(text: string)`. Agregar contexto requeriría cambiar el contrato del extractor y de todos sus consumers.
