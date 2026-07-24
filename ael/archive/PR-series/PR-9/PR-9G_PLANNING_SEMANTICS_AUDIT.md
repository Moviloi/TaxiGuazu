# PR-9G — Planning Semantics Audit

**Estado:** Borrador de auditoría semántica  
**Fecha:** 2026-07-13  
**Driver:** Determinar si "Action" posee propiedades semánticas intrínsecas que justifiquen una capa cognitiva.

---

## 1. Propiedades de una Action

Para una acción a ∈ 𝒜 (ej. "enviar mensaje de clarificación"):

| Propiedad | ¿Intrínseca? | Análisis |
|-----------|:-----------:|----------|
| **Contenido** (qué mensaje enviar) | ❌ Extrínseca | Determinado por el contexto conversacional y las reglas de negocio |
| **Destino** (a quién enviar) | ❌ Extrínseca | Determinado por el canal y el usuario |
| **Timing** (cuándo ejecutar) | ❌ Extrínseca | Determinado por el flujo conversacional |
| **Justificación** (por qué esta acción) | ❌ Extrínseca | Determinada por los Patterns que la motivan |
| **Efecto esperado** (qué debe lograr) | ❌ Extrínseca | Determinado por el objetivo conversacional |

**0 propiedades intrínsecas.** Una acción no "es" nada por sí misma. Su identidad está completamente determinada por su contexto.

## 2. Contraste con otras entidades

| Entidad | Propiedades intrínsecas |
|---------|:----------------------:|
| Pattern ⟨P, θ, E⟩ | **3** (P, θ, E) |
| Decision | **5+** (validInput, readiness, missingInfo, etc.) |
| Goal (eliminado) | **0** |
| **Action** | **0** |

## 3. Veredicto

**Action no posee propiedades semánticas intrínsecas.** Su identidad es completamente contextual. No puede justificar una capa arquitectónica.

PR-9G confirma PR-9A: **D — Planning debe eliminarse.**

---

*PR-9G. Metodología: análisis de propiedades intrínsecas (misma que PR-7G, PR-8G).*
