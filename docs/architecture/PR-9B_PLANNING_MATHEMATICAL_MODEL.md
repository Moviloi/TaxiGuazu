# PR-9B — Planning Mathematical Model Audit

**Estado:** Borrador de auditoría matemática  
**Fecha:** 2026-07-13  
**Driver:** Determinar si Planning posee un modelo matemático que justifique existencia como capa independiente.

---

## 1. Dominio de entrada

```
X = 𝒫(𝒞) × 𝒮
```

- `𝒫(𝒞)`: conjunto de Patterns desde Learning (c = ⟨P, θ, E, τ⟩)
- `𝒮`: estado cognitivo actual (último Decision snapshot)

## 2. Dominio de salida

```
Y = 𝒜
```

- `𝒜`: espacio de acciones del sistema. Conjunto FINITO de acciones predefinidas (enviar mensaje, ejecutar política, llamar API).

**Hallazgo:** El espacio de salida de Planning es FINITO y PREDECIBLE. No hay descubrimiento.

## 3. Transformación

```
P: 𝒫(𝒞) × 𝒮 → 𝒜

P(M, s) = select_action(s, interpret(filter_relevant(M, s)))
```

### 3.1 Descomposición

| Operación | Tipo | ¿Descubrimiento? |
|-----------|------|:-----------------:|
| `filter_relevant(M, s)` → M' ⊆ M | Filtro de conjunto | ❌ No |
| `interpret(M', s)` → intenciones | Lookup table | ❌ No |
| `select_action(intenciones, s)` → a ∈ 𝒜 | Regla de decisión | ❌ No |

**Es una tubería de filtrado + lookup + selección.** Misma estructura que Goals (PR-8B), con un paso adicional de selección de acción.

## 4. Propiedades formales

| Propiedad | ¿Planning la cumple? |
|-----------|:-------------------:|
| **Pureza** (sin side effects) | ❌ **NO** (produce acciones con efectos) |
| **Determinismo** | ✅ Sí (si las reglas son deterministas) |
| **Monotonicidad** | ❌ No (más patrones no implica más acciones) |
| **Idempotencia** | ❌ No (ejecutar acción cambia el estado) |
| **Cerradura** (salida en espacio conocido) | ✅ Sí (𝒜 finito) |
| **Trazabilidad** (acción → Pattern origen) | ✅ Sí (diseñable) |

**Hallazgo crítico:** Planning NO es pura. Producir una acción CON SIDE EFFECTS (enviar un mensaje) rompe la pureza. Es la única capa del pipeline que no puede ser pura porque su propósito es EXACTAMENTE producir efectos en el mundo.

## 5. Kernel mínimo

```
Kernel(Planning) = {accept_patterns, select_action}
```

Sin `select_action`, Planning no produce output. Sin `accept_patterns`, no tiene input.

**Este kernel es TRIVIAL.** Toda capa tiene input y output. El kernel debería tener algo más — una transformación única que solo Planning realiza. Pero no la hay.

## 6. Contraste con Learning

| Dimensión | Learning | Planning |
|-----------|----------|----------|
| Input | W (snapshots) | M (Patterns) |
| Output | ⟨P, θ, E⟩ (descubrimiento) | a ∈ 𝒜 (selección) |
| Espacio de salida | Infinito (𝒞) | Finito (𝒜) |
| Descubrimiento | ✅ SÍ | ❌ NO |
| Kernel | Algorítmico (detección) | Lookup + reglas |
| Pureza | ✅ Pura | ❌ Impura |

## 7. Veredicto

**Planning no posee modelo matemático no trivial.** Su kernel es una función de selección sobre un espacio finito. No hay descubrimiento, no hay cambio de orden lógico, no hay compresión abstractiva. Es una tubería de decisión determinista.

PR-9B confirma PR-9A: **D — Planning debe eliminarse.**

---

*PR-9B. Metodología: modelo matemático mínimo (misma que PR-7B, PR-8B).*
