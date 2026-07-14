# PR-8D — Goals Contract Derivation Audit

**Estado:** Borrador de auditoría de contratos  
**Fecha:** 2026-07-13  
**Driver:** Demostrar que el contrato Learning→Goals (PR-7D) puede reemplazarse por Learning→Planning sin pérdida arquitectónica, y que Goals→Planning no constituye un contrato válido entre capas independientes.

---

## Regla metodológica

Se toma el contrato Learning→Goals de PR-7D y se evalúa:
1. ¿Qué cambiaría si el consumidor fuera Planning en lugar de Goals?
2. ¿Goals→Planning tiene las características de un contrato entre capas?
3. ¿La eliminación de Goals rompe algún contrato existente?

---

## 1. Contrato Learning→Goals (PR-7D)

### 1.1 Contrato original

PR-7D §2 definió:

| Aspecto | Valor |
|---------|-------|
| Frontera | Learning produce M, Goals consume M |
| Output | M = {c₁, ..., cₖ}, c = ⟨P, θ, E⟩ |
| Precondiciones | P1-LG a P4-LG |
| Postcondiciones | Q1-LG a Q5-LG |
| Invariantes | I1-LG a I5-LG |
| Información obligatoria | P, θ, τ |
| Información opcional | E, γ_id, window_id |

### 1.2 Contrato propuesto: Learning→Planning

Si Goals se elimina, el contrato Learning→Planning sería IDÉNTICO:

| Aspecto | Cambio | Justificación |
|---------|--------|---------------|
| Frontera | Learning → Planning | Misma dirección, mismo flujo de datos |
| Output | M = {c₁, ..., cₖ} | Sin cambios — Pattern es el output de Learning |
| Precondiciones | P1-LG a P4-LG | Aplican igual (Planning también debe interpretar P) |
| Postcondiciones | Q1-LG a Q5-LG | Sin cambios |
| Invariantes | I1-LG a I5-LG | Sin cambios (inmutabilidad, completitud, determinismo) |
| Información obligatoria | P, θ, τ | Planning también necesita estas |
| Información opcional | E, γ_id, window_id | Planning también puede usarlas |
| Causas de rechazo | Las mismas | θ fuera de rango, P mal formado, etc. |

**Hallazgo:** El contrato Learning→Planning es IDÉNTICO a Learning→Goals. Solo cambia el nombre del consumidor. No se pierde nada.

### 1.3 Verificación

```
Contrato original:    Learning ──M──→ Goals
Contrato propuesto:   Learning ──M──→ Planning
Diferencia:           Goals reemplazado por Planning en la etiqueta
Impacto arquitectónico: NINGUNO
```

---

## 2. Contrato Goals→Planning

### 2.1 Contrato propuesto (si Goals existiera)

| Aspecto | Valor |
|---------|-------|
| Frontera | Goals produce G, Planning consume G |
| Output | G = {g₁, ..., gₘ}, g = ⟨intention, priority, rationale⟩ |
| Precondiciones | P1-GP: Goals ha recibido M desde Learning |
| Postcondiciones | Q1-GP: Planning recibe G |
| Invariantes | I1-GP: Goals no modifica G después de producirlo |

### 2.2 ¿Es este un contrato real entre capas?

Un contrato entre capas requiere (PR-7D §1):

| Requisito | ¿Lo cumple Goals→Planning? |
|-----------|:--------------------------:|
| Las capas pueden evolucionar independientemente | ❌ **NO.** Goals no puede cambiar sin afectar a Planning (PR-8A §6). |
| El consumidor no necesita saber cómo el productor genera el output | ❌ **NO.** Planning necesita entender la taxonomía de intenciones de Goals. |
| El productor no necesita saber cómo el consumidor usa el output | ❌ **NO.** Goals genera intenciones SABIENDO que Planning las ejecutará. |
| Existen causas de rechazo | ❌ **NO.** ¿Qué haría Planning si rechaza un Goal? No hay fallback. |
| Existe más de un consumidor | ❌ **NO.** Planning es el único consumidor. |

**Hallazgo:** Goals→Planning NO cumple los requisitos mínimos de un contrato entre capas. Es un contrato DEBILITADO donde la frontera es arbitraria.

### 2.3 Comparación con contratos reales

| Contrato | ¿Contrato real? | ¿Por qué? |
|----------|:--------------:|-----------|
| Memory→Learning (PR-7D) | ✅ SÍ | Capas independientes. Consumidor no afecta al productor. Causas de rechazo reales. |
| Learning→Goals (PR-7D) | ⚠️ PARCIAL | Asume Goals existe. Pero funciona igual con Planning. |
| Goals→Planning | ❌ **NO** | Frontera artificial. Dependencia total. Sin causas de rechazo reales. |

### 2.4 Conclusión

**Goals→Planning no es un contrato válido.** La frontera entre Goals y Planning es una línea de diseño, no un boundary arquitectónico.

---

## 3. Impacto de eliminar Goals en los contratos existentes

| Contrato afectado | ¿Cambia? | Detalle |
|------------------|:--------:|---------|
| Memory→Learning (PR-7D) | ❌ No | Sin cambios |
| Learning→Goals (PR-7D) | ✅ Sí | Se renombra a Learning→Planning con el mismo contenido |
| Learning→Auditoría (PR-7D) | ❌ No | Auditoría consume directamente de Learning |
| Learning→Runtime (PR-7D) | ❌ No | Runtime sigue igual |

**Ningún contrato existente se rompe.**

---

## 4. Veredicto

**El contrato Learning→Goals puede reemplazarse por Learning→Planning sin pérdida arquitectónica. El contrato Goals→Planning no es válido como contrato entre capas independientes.**

PR-8D confirma PR-8A: **Goals debe eliminarse.**

---

*PR-8D. Metodología: derivación de contratos semánticos (misma que PR-7D).*
