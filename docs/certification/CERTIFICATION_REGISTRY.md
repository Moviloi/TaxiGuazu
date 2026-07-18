# CERTIFICATION REGISTRY — AITOS

> Registro central de certificación funcional y arquitectónica del sistema.
>
> **Propósito:** Única fuente de verdad sobre el estado de certificación de cada
> artefacto, capa y campaña de validación del proyecto.
>
> **Gobernanza:** Las reglas de este registro están definidas en
> `docs/certification/QA_GOVERNANCE.md` y en las secciones siguientes.

---

## Tabla de Contenidos

1. [Estados de certificación](#1-estados-de-certificación)
2. [Reglas](#2-reglas)
3. [Estado de certificación arquitectónica y funcional](#3-estado-de-certificación-arquitectónica-y-funcional)
4. [Estado de ADRs](#4-estado-de-adrs)
5. [Estado de campañas CAT](#5-estado-de-campañas-cat)
6. [Estado general del producto](#6-estado-general-del-producto)
7. [Historial de cambios](#7-historial-de-cambios)

---

## 1. Estados de certificación

| Estado | Motivo posible | Significado |
|--------|----------------|-------------|
| `CERTIFIED` | — | Evaluado sin defectos abiertos. Cumple con su especificación. No requiere justificación adicional. |
| `CONDITIONAL` | **Defecto funcional abierto** — existe uno o más defectos funcionales OPEN que afectan el artefacto o campaña. **Especificación incompleta** — el artefacto contiene ambigüedades, contradicciones o vacíos documentados que impiden la certificación plena. **Revalidación pendiente** — el artefacto fue evaluado y pasó, pero existen cambios o hallazgos externos que requieren re-ejecución de la evaluación para confirmar que sigue siendo válido. | Evaluado con hallazgos que no bloquean pero requieren seguimiento. |
| `SUPERSEDED` | **Cambio funcional posterior** — un cambio en el sistema (implementación, refactor, cambio de proveedor, etc.) puede afectar el área cubierta. La decisión la toma el SDL o Mission Planner. Basta con posibilidad razonable, no se requiere prueba de afectación. | Un cambio posterior puede afectar el área cubierta. Requiere re-evaluación. |
| `NOT_STARTED` | **No ejecutado** — la campaña o evaluación está definida pero no se ha ejecutado ninguna vez. | Definido pero no evaluado. |

---

## 2. Reglas

### Regla 1 — Product CERTIFIED solo si todas las campañas obligatorias lo están

El producto solo podrá declararse **"Funcionalmente Certificado"** (Functional
Certified) cuando todas las campañas CAT obligatorias estén en estado
`CERTIFIED`. Las campañas obligatorias son:

- CAT-1 (aceptación general)
- CAT-2 (persistencia de contexto)
- CAT-3 (ambigüedad y resolución)
- CAT-4 (correcciones y manejo de errores)
- CAT-5 (flujo completo de reserva)
- CAT-10 (regresión integral)

*(La lista de campañas obligatorias puede ser modificada por el SDL con ADR.)*

### Regla 2 — Defectos abiertos impiden certificación

Una campaña con defectos funcionales abiertos (estado `OPEN`) asociados no
puede estar `CERTIFIED`. Su estado debe ser `CONDITIONAL` o `SUPERSEDED`
hasta que los defectos se resuelvan y la campaña se reejecute.

### Regla 3 — Cambio funcional → SUPERSEDED

Si un cambio funcional (implementación, refactor, cambio de proveedor LLM,
etc.) puede afectar el área cubierta por una campaña certificada, su estado
cambia automáticamente a `SUPERSEDED` hasta ser revalidada.

La decisión la toma el Mission Planner o Strategic Director Layer. Basta con
que exista una posibilidad razonable de afectación — no se requiere prueba.

### Regla 4 — Jerarquía de autoridad

Para resolver conflictos entre este registro y otros documentos:

1. `CERTIFICATION_REGISTRY.md` — estado agregado actual
2. `CAT_CERTIFICATION_REGISTER.md` — detalle por campaña CAT
3. `QA_GOVERNANCE.md` — reglas del proceso QA
4. Documentos individuales de certificación (PR-CAT1, CAT2_RESULT_REPORT, etc.)

---

## 3. Estado de certificación arquitectónica y funcional

| Artefacto | Versión | Estado | Motivo | Exit Criteria | Evidencia asociada |
|-----------|---------|--------|--------|---------------|-------------------|
| **Arquitectura** | Architecture Freeze V3 | `CERTIFIED` | — | — | `docs/certification/PR-5G` — Architecture Freeze V3 declarado. ADR-008 (Conversational Decision Architecture) congelado. 13 ADRs ratificados. |
| **ADRs** | 001–013 | `CERTIFIED` | — | — | Todos los ADRs vigentes están ACCEPTED. Ninguno en DRAFT o PROPOSED. Ver `docs/adr/ADR_INDEX.md`. |
| **Functional Behavior Specification** | v1.0 | `CONDITIONAL` | **Especificación incompleta** (2 ambigüedades documentadas: A01-DG conflicto §9 vs §25.4, A02-DG conflicto §12 vs §25.2). **Revalidación pendiente** (3 desviaciones confirmadas: F01-DG, F02-DG, F03-DG — pendientes de implementación en QA-3 Sprint 3). | 1. Resolver ambigüedades A01-DG y A02-DG en la especificación.<br>2. Implementar correcciones de F01-DG, F02-DG, F03-DG.<br>3. Revalidar contra escenario "Hotel Esturión".<br>4. Sin desviaciones funcionales abiertas. | `docs/certification/PR-QA3_S2B_HOTEL_ESTURION_TRACE.md` — secciones 5 (hallazgos) y 7 (invariantes violados). |
| **Conversation Decision Algorithm** | v1.0 | `CERTIFIED` | — | — | `docs/adr/013-conversation-decision-algorithm.md` — ADR-013 ratifica el CDA como norma arquitectónica. 15 invariantes definidos. Jerarquía normativa establecida. |
| **QA Governance** | v1.0 | `CERTIFIED` | — | — | `docs/certification/QA_GOVERNANCE.md` — reglas de Acceptance Testing (no cierre sin revalidación, trazabilidad obligatoria). `docs/certification/CAT_CERTIFICATION_REGISTER.md` — registro central de campañas. |

---

## 4. Estado de ADRs

Todos los ADRs (001–013) están en estado `ACCEPTED`. Ninguno requiere
justificación adicional de certificación. Ver `docs/adr/ADR_INDEX.md` para
el detalle completo.

| ADR | Título | Estado | Implementación |
|-----|--------|--------|----------------|
| 001 | Layered Architecture | ✅ ACCEPTED | Fundacional |
| 002 | Database Facade Pattern | ✅ ACCEPTED | Fundacional |
| 003 | Learning Domain Architecture | ✅ ACCEPTED | Operational Learning existente |
| 004 | Service Boundary Rules | ✅ ACCEPTED | Fundacional |
| 005 | AI-First Interpretation | ✅ ACCEPTED | Parcialmente modificado por ADR-012 |
| 006 | Schema Parity | ✅ ACCEPTED | Schema.sql es SSOT |
| 007 | Conversation Interpreter | ✅ ACCEPTED | Implementado |
| 008 | Conversational Decision Architecture | ✅ ACCEPTED | Architecture Freeze activo |
| 009 | Evidence Engine Architecture | ✅ ACCEPTED | Frozen desde PR-3E |
| 010 | Cognitive Memory Architecture | ✅ ACCEPTED | IM-1 implementado (7 archivos, 45 tests) |
| 011 | Elimination of Reflection Layer | ✅ ACCEPTED | Aplica a pipeline futuro |
| 012 | Cognitive Escalation Principle | ✅ ACEPTADO | BKE/DRL implementados (flags false por defecto) |
| 013 | Conversation Decision Algorithm Ratification | ✅ ACEPTADO | Normativo. Jerarquía establecida. |

---

## 5. Estado de campañas CAT

### 5.1 Campañas ejecutadas

| Campaña | Objetivo | Fecha | Commit | Defectos abiertos | Estado | Motivo | Exit Criteria | Evidencia asociada |
|---------|----------|-------|--------|-------------------|--------|--------|---------------|-------------------|
| **CATS-1** | Suite de tests invariantes conversacionales (26 tests, CAT-001 a CAT-026). Verifica propiedades que deben cumplirse siempre: estabilidad de intención, resolución de campos, reconocimiento de patrones, máquina de estados. | 2026-07-17 | `f2dc91c` | — | `CERTIFIED` | — | — | `docs/certification/PR-CATS-1_CONVERSATION_ACCEPTANCE_SUITE.md` — 26/26 tests PASS. Infraestructura de tests automatizados, sin cambios de código de producción. |
| **CAT-1** | Campaña de aceptación externa (caja negra). 13 escenarios contra sistema real (Turso, Gemini/Groq). Cobertura: 21 escenarios CAT, 9 RF, 5 reglas CDA. Veredicto: 🟡 ACEPTABLE CON HALLAZGOS. | 2026-07-17 | `f2dc91c` | — | `CONDITIONAL` | **Revalidación pendiente** — 4 hallazgos documentados (F01-DG, F02-DG, F03-DG, UX S13) trackeados como QA3-S3-01/02/03/04. Pendientes de implementación y re-ejecución de CAT-1. | 1. Implementar correcciones QA3-S3-01/02/03/04.<br>2. Reejecutar CAT-1 (13 escenarios).<br>3. Obtener PASS en todos los escenarios (sin timeouts).<br>4. Sin defectos funcionales abiertos. | `docs/certification/PR-CAT1_EXTERNAL_ACCEPTANCE_CAMPAIGN.md` — 11/13 PASS funcionales, 2 timeouts por latencia LLM. Hallazgos documentados en secciones 7 y 9. |
| **CAT-2** | Persistencia del contexto conversacional. 6 escenarios black-box: preservación de origen, destino, pasajeros, intención, no-reinicio, no-repetición. | 2026-07-18 | `32811ba` | H-CAT2-001 (RECOVERY slot loss, OPEN) | `CONDITIONAL` | **Defecto funcional abierto** — H-CAT2-001 OPEN. RECOVERY state pierde slots confirmados y repite preguntas, violando 9 RF y 8 reglas del CDA. | 1. Implementar corrección de H-CAT2-001.<br>2. Reejecutar CAT-2 (6 escenarios).<br>3. Obtener PASS en todos los escenarios.<br>4. Cerrar H-CAT2-001 (campaña reejecutada + certificada). | `docs/incidents/CAT2_RESULT_REPORT.md` — 6/6 PASS (3 hallazgos). `docs/incidents/H-CAT2-001_RECOVERY_SLOT_LOSS.md` — defecto formal con evidencia por turno. |

### 5.2 Campañas planificadas

| Campaña | Objetivo | Fecha | Commit | Defectos abiertos | Estado | Motivo | Exit Criteria | Evidencia asociada |
|---------|----------|-------|--------|-------------------|--------|--------|---------------|-------------------|
| **CAT-3** | Ambigüedad y resolución geográfica. Validación de detección, resolución automática y preguntas de clarificación para términos ambiguos. | — | — | — | `NOT_STARTED` | **No ejecutado** | 1. Definir escenarios de ambigüedad (mínimo 6).<br>2. Ejecutar campaña contra sistema real.<br>3. Sin defectos funcionales abiertos.<br>4. Todos los escenarios PASS. | — |
| **CAT-4** | Correcciones y manejo de errores. Validación de cambio de origen, destino, pasajeros; negaciones; cancelaciones; mensajes no reconocidos. | — | — | — | `NOT_STARTED` | **No ejecutado** | 1. Definir escenarios de corrección y error (mínimo 6).<br>2. Ejecutar campaña contra sistema real.<br>3. Sin defectos funcionales abiertos.<br>4. Todos los escenarios PASS. | — |
| **CAT-5** | Flujo completo de reserva. Validación end-to-end: saludo → slots → confirmación → ejecución → post-booking. | — | — | — | `NOT_STARTED` | **No ejecutado** | 1. Definir escenarios de flujo completo (mínimo 4).<br>2. Ejecutar campaña contra sistema real.<br>3. Sin defectos funcionales abiertos.<br>4. Todos los escenarios PASS. | — |
| **CAT-6** | Cotizaciones y consultas de precio. Validación de respuestas sobre tarifas, descuentos, tiempos de viaje. | — | — | — | `NOT_STARTED` | **No ejecutado** | 1. Definir escenarios de consulta de precio (mínimo 4).<br>2. Ejecutar campaña contra sistema real.<br>3. Sin defectos funcionales abiertos.<br>4. Todos los escenarios PASS. | — |
| **CAT-7** | Escalamiento y recovery. Validación de RECOVERY state, ESCALATION a humano, límites del dominio. | — | — | — | `NOT_STARTED` | **No ejecutado** | 1. Definir escenarios de escalamiento (mínimo 4).<br>2. Ejecutar campaña contra sistema real.<br>3. Sin defectos funcionales abiertos.<br>4. Todos los escenarios PASS. | — |
| **CAT-8** | Comandos de sistema y operaciones. Validación de `.limpiar`, admin commands, reinicio de sesión, inactividad. | — | — | — | `NOT_STARTED` | **No ejecutado** | 1. Definir escenarios de comandos (mínimo 4).<br>2. Ejecutar campaña contra sistema real.<br>3. Sin defectos funcionales abiertos.<br>4. Todos los escenarios PASS. | — |
| **CAT-9** | Viajes multi-etapa y casos complejos. Validación de multi-leg trips, grupos grandes, fechas programadas. | — | — | — | `NOT_STARTED` | **No ejecutado** | 1. Definir escenarios multi-etapa (mínimo 4).<br>2. Ejecutar campaña contra sistema real.<br>3. Sin defectos funcionales abiertos.<br>4. Todos los escenarios PASS. | — |
| **CAT-10** | Regresión integral. Re-ejecución completa de todas las campañas previas para certificación funcional global. | — | — | — | `NOT_STARTED` | **No ejecutado** | 1. CAT-1 a CAT-9 individualmente CERTIFIED.<br>2. Re-ejecutar todas las campañas previas.<br>3. Sin defectos funcionales abiertos.<br>4. Todos los escenarios PASS.<br>5. Producto pasa a FUNCTIONAL CERTIFIED. | — |

---

## 6. Estado general del producto

| Dimensión | Estado | Motivo | Exit Criteria | Evidencia |
|-----------|--------|--------|---------------|-----------|
| **Build** | ✅ PASS | — | — | Compilación correcta en todos los entornos. |
| **Tests** | ✅ PASS | — | — | 1653/1657 PASS (4 fallas pre-existentes clasificadas como no bloqueantes). |
| **Contratos R1-R4** | ✅ PASS | — | — | `bash ael/contracts/enforce.sh` verde. |
| **Arquitectura** | ✅ `CERTIFIED` | — | — | Architecture Freeze V3 activo. 13/13 ADRs ACCEPTED. |
| **Especificación funcional** | 🟡 `CONDITIONAL` | **Especificación incompleta** (2 ambigüedades) + **Revalidación pendiente** (3 desviaciones). | 1. Resolver ambigüedades A01-DG y A02-DG.<br>2. Implementar correcciones F01-DG, F02-DG, F03-DG.<br>3. Sin desviaciones funcionales abiertas. | FBS v1.0. Hallazgos documentados en PR-QA3-S2B. |
| **CDA** | ✅ `CERTIFIED` | — | — | Algoritmo normativo ratificado por ADR-013. |
| **Campañas CAT** | 🟡 `CONDITIONAL` | **Defecto funcional abierto** (H-CAT2-001) + **Revalidación pendiente** (CAT-1 hallazgos) + **No ejecutado** (7 campañas planificadas). | Ver Exit Criteria individuales en §5. Cada campaña debe cumplir su propio criterio para alcanzar CERTIFIED. | CAT-1 CONDITIONAL, CAT-2 CONDITIONAL, 8 campañas NOT_STARTED. |
| **QA Governance** | ✅ `CERTIFIED` | — | — | Reglas definidas y registro central creado. |
| **Deuda técnica** | 🟡 21 items pendientes | — | — | 5 P1 + 10 P2 + 6 P3. Ver `docs/certification/TECHNICAL_DEBT_BASELINE.md`. |

### Functional Certified

**El producto NO está Functional Certified.**

**Exit Criteria del producto** (condiciones acumulativas para declarar FUNCTIONAL CERTIFIED):

1. **CAT-1** → `CERTIFIED` (hoy CONDITIONAL).
2. **CAT-2** → `CERTIFIED` (hoy CONDITIONAL, H-CAT2-001 OPEN).
3. **CAT-3** → `CERTIFIED` (hoy NOT_STARTED).
4. **CAT-4** → `CERTIFIED` (hoy NOT_STARTED).
5. **CAT-5** → `CERTIFIED` (hoy NOT_STARTED).
6. **CAT-10** → `CERTIFIED` (hoy NOT_STARTED).
7. **Functional Behavior Specification** → `CERTIFIED` (hoy CONDITIONAL).
8. **Cero defectos funcionales OPEN** en todo el sistema.

| Condición | Estado actual | Motivo |
|-----------|---------------|--------|
| CAT-1 → `CERTIFIED` | ❌ `CONDITIONAL` | Revalidación pendiente (hallazgos QA3-S3-01/02/03/04) |
| CAT-2 → `CERTIFIED` | ❌ `CONDITIONAL` | Defecto funcional abierto (H-CAT2-001) |
| CAT-3 → `CERTIFIED` | ❌ `NOT_STARTED` | No ejecutado |
| CAT-4 → `CERTIFIED` | ❌ `NOT_STARTED` | No ejecutado |
| CAT-5 → `CERTIFIED` | ❌ `NOT_STARTED` | No ejecutado |
| CAT-10 → `CERTIFIED` | ❌ `NOT_STARTED` | No ejecutado |
| FBS → `CERTIFIED` | 🟡 `CONDITIONAL` | Especificación incompleta + revalidación pendiente |
| 0 defectos funcionales OPEN | ❌ 1 OPEN | H-CAT2-001 |

### Transición a Functional Certified

```
Estado actual:
  Arquitectura: ✅ CERTIFIED      Motivo: —
  ADRs:         ✅ CERTIFIED      Motivo: —
  CDA:          ✅ CERTIFIED      Motivo: —
  QA Gov:       ✅ CERTIFIED      Motivo: —
  ──────────────────────────────────────────────────────
  FBS:          🟡 CONDITIONAL    Motivo: Especificación incompleta + Revalidación pendiente
  CAT campañas: 🟡 CONDITIONAL    Motivo: Defecto abierto + Revalidación pendiente + No ejecutado
  ──────────────────────────────────────────────────────
  Producto:     🟡 NO Functional Certified

Estado objetivo:
  Todas las campañas obligatorias → CERTIFIED    Motivo: —
  FBS → CERTIFIED                                Motivo: — (ambigüedades resueltas, desviaciones corregidas)
  0 defectos funcionales OPEN
  ──────────────────────────────────────────────────────
  Producto:     ✅ FUNCTIONAL CERTIFIED
```

---

## 7. Historial de cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2026-07-18 | Creación del registro. Estado inicial documentado. | ARNÉS / SDL |
| 2026-07-18 | V2: Se agrega columna "Motivo" y "Evidencia asociada" a cada tabla. Se definen motivos estandarizados por estado. Se aplica trazabilidad a todos los artefactos y campañas. | ARNÉS / SDL |
| 2026-07-18 | V3: Se agrega columna "Exit Criteria" a todas las tablas. Cada artefacto, campaña y el producto ahora definen condiciones concretas y verificables para alcanzar CERTIFIED. | ARNÉS / SDL |

---

## Referencias

- `docs/certification/QA_GOVERNANCE.md` — Reglas de gobernanza QA.
- `docs/certification/CAT_CERTIFICATION_REGISTER.md` — Registro detallado de campañas CAT.
- `docs/architecture/ARCHITECTURE_STATUS.md` — Estado arquitectónico detallado.
- `docs/adr/ADR_INDEX.md` — Índice completo de ADRs.
- `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` — FBS v1.0.
- `docs/specifications/CONVERSATION_DECISION_ALGORITHM.md` — CDA v1.0.
- `docs/incidents/CAT2_RESULT_REPORT.md` — Reporte de CAT-2.
- `docs/incidents/H-CAT2-001_RECOVERY_SLOT_LOSS.md` — Defecto abierto.
- `docs/project/PROJECT_BOARD.md` — Tareas de implementación.
- `docs/ROADMAP.md` — Roadmap del producto.
