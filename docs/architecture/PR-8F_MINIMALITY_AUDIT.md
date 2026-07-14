# PR-8F — Goals Minimality Audit

**Estado:** Borrador de auditoría de minimalidad  
**Fecha:** 2026-07-13  
**Driver:** Determinar si Goals tiene un kernel irreducible o si puede eliminarse completamente mediante absorción en Planning.

---

## Regla

Se intenta absorber cada responsabilidad de Goals en Planning. Si TODAS pueden absorberse sin violar invariantes, Goals es eliminable.

Si ALGUNA responsabilidad NO puede absorberse, Goals debe preservarse (contra el veredicto de PR-8A).

---

## 1. Responsabilidades de Goals

De PR-8A §4 y PR-7G:

| ID | Responsabilidad | ¿Absorbible en Planning? |
|----|----------------|:------------------------:|
| G1 | Recepción de M desde Learning | ✅ Sí (Planning recibe M directamente) |
| G2 | Lectura de estado actual s | ✅ Sí (Planning accede al estado actual) |
| G3 | Filtro por relevancia (R10) | ✅ Sí (función interna de Planning) |
| G4 | Dedup funcional (R11 partial) | ✅ Sí (función interna de Planning) |
| G5 | Categorización interpretativa (R12 partial) | ✅ Sí (lookup table en Planning) |
| G6 | Priorización | ✅ Sí (función de ordenación en Planning) |
| G7 | Generación de Commitment | ✅ Sí (formato de salida intermedio en Planning) |
| G8 | Ensamblaje de salida G | ✅ Sí (Planning produce Actions directamente) |

**TODAS las responsabilidades de Goals son absorbibles en Planning.**

## 2. ¿Absorber Goals en Planning viola alguna invariante?

| Invariante | ¿Se viola? | Análisis |
|-----------|:---------:|----------|
| I1-EE: Pipeline completeness | ❌ No | Planning sigue produciendo output |
| I2-EE: Immutability | ❌ No | Planning no modifica Patterns |
| I3-EE: Temporal monotonicity | ❌ No | No aplica |
| I4-EE: No persistence | ❌ No | Planning no persiste |
| I5-EE: No conversation impact | ❌ No | Planning impacta (es su función) |
| I6-EE: Single authority | ❌ No | Planning sigue teniendo autoridad única |
| M-1 a M-14: Memory invariants | ❌ No | Memory no se modifica |
| L-1 a L-6: Learning invariants | ❌ No | Learning no se modifica |

**0 invariantes violados.**

## 3. ¿Absorber Goals aumenta la complejidad de Planning?

Sí, Planning sería más compleja. Pero es COMPLEJIDAD COHESIVA: todas las responsabilidades adicionales pertenecen al dominio de "decidir qué hacer." No es complejidad accidental.

Comparación:
- Planning SIN Goals: recibe Patterns, produce Actions.
- Planning CON Goals absorbido: recibe Patterns, filtra/interpreta/prioriza internamente, produce Actions.

La diferencia es que el filtrado/interpretación/priorización pasa de ser una capa externa a un submódulo interno. La complejidad total del sistema SE REDUCE (menos capas, menos interfaces, menos contratos).

## 4. Intento de refutación

**Intento:** "Planning no puede absorber Goals porque violaría SRP (Planning tendría muchas responsabilidades)."

**Respuesta:** SRP es un principio de DISEÑO, no de ARQUITECTURA. Además, las responsabilidades absorbidas son COHESIVAS con Planning (todas son sobre "decidir qué hacer"). No hay mezcla de dominios.

**Intento:** "Goals necesita evolucionar de forma diferente a Planning."

**Respuesta:** PR-8E demostró que Goals NO puede evolucionar sin afectar a Planning. No hay independencia evolutiva que perder.

**Intento:** "La intención es ontológicamente diferente de la acción."

**Respuesta:** PR-8C demostró que Goal y Action son del mismo tipo ontológico (prescriptivo). Difieren en abstracción, no en tipo.

## 5. Veredicto

**Goals NO tiene kernel irreducible. TODAS sus responsabilidades pueden absorberse en Planning sin violar invariantes. Goals debe eliminarse.**

PR-8F confirma PR-8A: **Goals debe eliminarse.**

---

*PR-8F. Metodología: intento de absorción completa (misma que PR-6F y PR-7F).*
