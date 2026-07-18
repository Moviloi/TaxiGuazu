# GOVERNANCE FREEZE — AITOS

> Declaración de cierre de la fase de diseño de gobernanza del proyecto.

---

## 1. Estado

La capa metodológica del proyecto se considera **completa**.

A partir de esta declaración, el foco del proyecto se traslada de la definición
de reglas a la ejecución funcional: implementación, corrección, revalidación y
certificación.

---

## 2. Documentos oficiales de gobernanza

| Documento | Rol |
|-----------|-----|
| **Architecture Freeze** (ADR-008, V3) | Congela la arquitectura. Toda modificación requiere ADR. |
| **ADRs** (001–013) | Decisiones arquitectónicas ratificadas. |
| **Functional Behavior Specification** (v1.0) | Fuente de verdad funcional. |
| **Conversation Decision Algorithm** (v1.0) | Algoritmo normativo conversacional. |
| **QA_GOVERNANCE.md** | Reglas del proceso de Acceptance Testing. |
| **CAT_CERTIFICATION_REGISTER.md** | Registro detallado de campañas CAT. |
| **CERTIFICATION_REGISTRY.md** | Registro central de certificación del sistema. |

No se requieren nuevos documentos metodológicos en esta fase.

---

## 3. Reglas a partir de este punto

1. **No se crearán nuevos documentos metodológicos** salvo que un incidente,
   una campaña CAT o un defecto demuestre la necesidad explícita. La carga de
   la prueba recae en quien propone el nuevo documento.

2. **Las mejoras a la gobernanza existente** deberán surgir de evidencia
   obtenida durante campañas CAT, incidentes reales o defectos funcionales,
   no de especulación preventiva.

3. **La prioridad del proyecto** a partir de hoy es:

   ```
   1. Implementación   — corregir defectos y desviaciones funcionales
   2. Corrección       — resolver hallazgos documentados (F01-DG, F02-DG, F03-DG, H-CAT2-001)
   3. Revalidación     — reejecutar campañas CAT afectadas por los cambios
   4. Certificación    — llevar el producto a FUNCTIONAL CERTIFIED
   ```

---

## 4. Alcance

Este documento **no modifica** la arquitectura, los procesos existentes, los
contratos entre capas ni las reglas de gobernanza previamente establecidas.
Solo declara el cierre de la fase de definición metodológica.

Todo el marco de gobernanza definido hasta hoy (reglas, estados, motivos,
exit criteria, trazabilidad, jerarquía de autoridad) permanece vigente y
vinculante.

---

*Declarado: 2026-07-18. Vigente hasta nuevo aviso.*
