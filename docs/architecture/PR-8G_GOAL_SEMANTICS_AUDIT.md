# PR-8G — Goal Semantics Audit

**Estado:** Borrador de auditoría semántica  
**Fecha:** 2026-07-13  
**Driver:** Determinar si "Goal" posee propiedades semánticas intrínsecas que justifiquen una capa independiente, o si todas sus propiedades son extrínsecas (derivadas de su relación con Planning).

---

## Regla

Si un concepto no tiene propiedades intrínsecas (propias, no derivadas de su relación con otros), no puede justificar una capa arquitectónica. Se aplica el mismo análisis que PR-7G para Patterns.

---

## 1. Propiedades candidatas de un Goal

Se analiza cada posible propiedad de un Goal g = ⟨intention, priority, rationale⟩:

| Propiedad | ¿Intrínseca? | ¿O extrínseca? | Análisis |
|-----------|:-----------:|:--------------:|----------|
| **intention** (contenido) | ❌ Extrínseca | Derivada de Pattern + regla de interpretación. No existe sin un Pattern que la justifique. |
| **priority** (prioridad) | ❌ Extrínseca | Relativa a otros Goals y al contexto del sistema. No existe en el vacío. |
| **rationale** (justificación) | ❌ Extrínseca | Vinculación con Pattern(s). No es propiedad del Goal mismo. |
| **alcanzabilidad** | ❌ Extrínseca | Depende del estado del sistema y de las capacidades de Planning. |
| **duración** (ciclo de vida) | ❌ Extrínseca | Definida por Planning (¿cuándo se considera cumplido/abandonado?). |
| **intención como categoría** | ❌ Extrínseca | La taxonomía de intenciones es definida externamente (diseñador del sistema). |

## 2. Resultado

**0 propiedades intrínsecas.**

Toda propiedad de un Goal es extrínseca: depende de su relación con Patterns, Planning, o el contexto del sistema. Un Goal no "es" nada por sí mismo; su identidad está COMPLETAMENTE determinada por sus relaciones externas.

## 3. Contraste con Pattern (PR-7G)

| Propiedad | Pattern (⟨P, θ, E⟩) | Goal (⟨intention, priority, rationale⟩) |
|-----------|--------------------|------------------------------------------|
| Propiedades intrínsecas | **3** (P, θ, E) | **0** |
| Propiedades extrínsecas | 4 (relevancia, categoría interpretativa, etc.) | **6** (todas) |

**Un Pattern tiene identidad propia (define qué regularidad se observó, con qué confianza, con qué evidencia). Un Goal no tiene identidad propia — su existencia depende totalmente de entidades externas.**

## 4. Veredicto

**Goals no posee propiedades semánticas intrínsecas. Su identidad es completamente relacional. No puede justificar una capa arquitectónica independiente.**

PR-8G confirma PR-8A: **Goals debe eliminarse.**

---

*PR-8G. Metodología: análisis ontológico de propiedades intrínsecas vs extrínsecas (misma que PR-7G).*
