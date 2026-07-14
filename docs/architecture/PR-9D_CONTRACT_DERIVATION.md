# PR-9D — Planning Contract Derivation Audit

**Estado:** Borrador de auditoría de contratos  
**Fecha:** 2026-07-13  
**Driver:** Demostrar que el contrato Learning→Planning (heredero de Learning→Goals) puede reemplazarse por un contrato Learning→Sistema Operacional.

---

## 1. Contrato actual: Learning → Planning

Desde PR-7D (modificado en PR-8D):

| Aspecto | Valor |
|---------|-------|
| Frontera | Learning produce M, Planning consume M |
| Output | M = {c₁, ..., cₖ}, c = ⟨P, θ, E, τ⟩ |
| Invariantes | I1-LP a I5-LP (inmutabilidad, completitud, determinismo) |
| Información | P, θ, τ obligatorios; E, γ_id, window_id opcionales |

## 2. Contrato propuesto: Learning → Sistema Operacional

| Aspecto | Valor |
|---------|-------|
| Frontera | Learning produce M, Sistema Operacional consume M |
| Output | M = {c₁, ..., cₖ} (idéntico) |
| Invariantes | I1-LP a I5-LP (idénticos) |
| Información | P, θ, τ (idéntico) |

**Diferencia:** solo cambia el nombre del consumidor.

## 3. ¿Qué contrato se pierde si Planning se elimina?

| Contrato | ¿Se pierde? | Reemplazo |
|----------|:----------:|-----------|
| Learning → Planning | ✅ Se renombra | Learning → Sistema Operacional |
| Planning → Sistema Operacional | ❌ Nunca existió como contrato formal | — |

**Ningún contrato formal se pierde.** El contrato real (Learning → consumidor de Patterns) se preserva.

## 4. Veredicto

**Planning no aporta contratos propios.** El contrato relevante es Learning → (consumidor de Patterns). Ese consumidor puede ser el sistema operacional sin necesidad de una capa intermedia.

PR-9D confirma PR-9A: **D — Planning debe eliminarse.**

---

*PR-9D. Metodología: derivación de contratos (misma que PR-7D, PR-8D).*
