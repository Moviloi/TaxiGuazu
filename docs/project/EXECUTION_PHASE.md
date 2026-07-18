# EXECUTION PHASE — AITOS

> Declaración de inicio de la fase **Execution & Functional Certification**.
>
> A partir de este documento, el proyecto abandona la definición metodológica
> y se concentra exclusivamente en la calidad funcional observable.

---

## 1. Objetivo principal

**Incrementar la certificación funcional del sistema** mediante ciclos
iterativos de implementación, validación y revalidación.

Cada ciclo debe producir evidencia funcional medible. La documentación es un
subproducto, no el objetivo.

---

## 2. Criterio de cierre de cada iteración

Toda iteración debe finalizar con **al menos uno** de los siguientes
resultados verificables:

| Resultado | Evidencia |
|-----------|-----------|
| Un defecto funcional `CLOSED` y revalidado | H-CAT2-001 → CLOSED + CAT-2 reejecutada + PASS |
| Una campaña CAT → `CERTIFIED` | CAT-1, CAT-2, CAT-3, ... → CERTIFIED |
| Una mejora del estado de la FBS | Ambigüedad resuelta, desviación corregida, FBS → CERTIFIED |
| Una mejora del `FUNCTIONAL_DASHBOARD` | Tendencia ↑ en al menos un indicador funcional |

No se considera una iteración completa si solo se generó documentación.

---

## 3. Métrica de éxito

**El éxito ya no se mide por documentación generada.**

Se mide por:

| ✅ Incluye | ❌ Excluye |
|------------|------------|
| Defectos funcionales cerrados | Documentos creados |
| Campañas CAT certificadas | ADRs redactados |
| FBS sin desviaciones | Certificaciones declaradas |
| Producto FUNCTIONAL CERTIFIED | Reglas o procesos nuevos |

---

## 4. Restricciones

Todo cambio debe respetar los siguientes documentos, que permanecen
vigentes y vinculantes:

| Documento | Rol |
|-----------|-----|
| **Functional Behavior Specification** (v1.0) | Fuente de verdad funcional. |
| **Conversation Decision Algorithm** (v1.0) | Algoritmo normativo conversacional. |
| **QA_GOVERNANCE.md** | Reglas del proceso de Acceptance Testing. |
| **CERTIFICATION_REGISTRY.md** | Registro central de certificación del sistema. |

Cualquier cambio que viole estos documentos debe ser rechazado hasta que
se corrija la desviación.

---

## 5. Alcance

Este documento **no modifica** procesos existentes, reglas de gobernanza,
contratos entre capas, arquitectura ni flujos de trabajo previamente
establecidos.

Únicamente declara el inicio formal de la etapa **Execution & Functional
Certification** del proyecto.

---

## 6. Transición

| Desde | Hacia |
|-------|-------|
| Governance Design | **Execution & Functional Certification** |
| Definición de reglas | Ciclos iterativos de implementación → validación → revalidación |
| Cantidad de documentos | Comportamiento funcional certificado |
| Documentos metodológicos como entregable | Defectos cerrados + campañas certificadas como entregable |

---

*Declarado: 2026-07-18.*
