# ARNÉS Framework — Runtime Behavioral Certification Report v1.0

> **Tipo:** Certificación conductual
> **Versión:** 1.0
> **Fecha:** 2026-07-23
> **Estado:** CERTIFIED
> **Framework:** ARNÉS v1.1.0 (Architecture Frozen)
>
> Certifica que el comportamiento runtime de OpenCode respeta las fronteras
> arquitectónicas definidas entre ARNÉS, PLAN y BUILD.

---

## 1. Resumen Ejecutivo

Se ejecutó una campaña de 12 pruebas conductuales (CAT) sobre los tres entry points
del ARNÉS Framework. Las pruebas verificaron:

- **Aislamiento del Decision Engine** en ARNÉS (exclusivo, sin fugas a PLAN/BUILD).
- **Frontera PLAN/BUILD corregida** (PLAN no recibe BUILD_DIRECT, ARNÉS delega directamente).
- **Entry Point Isolation** (cada modo ejecuta solo su responsabilidad).
- **Model Governance** (Current Model solo en SDL, modelos gratuitos en resto).

**Veredicto: CERTIFIED.** 12/12 pruebas superadas. Sin contaminación entre modos.
Sin Decision Engine fuera de ARNÉS. Sin PLAN -> BUILD automático.

---

## 2. Ambiente de Prueba

| Campo | Valor |
|---|---|
| Fecha | 2026-07-23 14:04 UTC-3 |
| Plataforma | OpenCode |
| Framework | ARNÉS v1.1.0 |
| Agentes configurados | 10 (plan, build, arnes, light-planner, + 6 ael-*) |
| Prompts | 10 archivos en .opencode/agents/ |
| Documentos de arquitectura | DECISION_PACKAGE_CONTRACT.md v2.1, COGNITIVE_ARCHITECTURE.md v1.1 |
| Matriz CAT | docs/arnes/certification/CAT_MATRIX_v1.1.0.md |

---

## 3. Matriz de Resultados

### BLOQUE A — ARNÉS Mode

| Test | Resultado | Evidencia |
|---|---|---|
| CAT-A1 — Strategic DEEP | ? PASS | arnes.md L22-24: Decision Engine exclusivo. L59-82: ESTRATEGICA -> DEEP -> SDL. Product Context cargado. |
| CAT-A2 — Tactical BUILD_DIRECT | ? PASS | arnes.md L38-59: TACTICA -> BUILD_DIRECT. L59: "Nunca pases por PLAN". Delegación directa a @build. |
| CAT-A3 — Strategic STANDARD | ? PASS | arnes.md L67-69: STANDARD -> LIGHT_PLANNER. Product Context + Runtime Profile cargados. |
| CAT-A4 — Trivial/ECONOMY | ? PASS | arnes.md L38-56: TACTICA -> ECONOMY. Sin Project Adapter. Sin Product Context. Delegación directa. |

### BLOQUE B — PLAN Mode

| Test | Resultado | Evidencia |
|---|---|---|
| CAT-P1 — Direct DEEP | ? PASS | plan.md L43-48: Scope Gate reducido. L38: producer=PLAN. SDL: 7 etapas. L58-62: Boundary explícita. Sin @build. |
| CAT-P2 — Direct STANDARD | ? PASS | plan.md L88: LIGHT_PLANNER activo. Scope Gate reducido -> LIGHT_PLANNER -> ExecutionPlan -> FIN. |
| CAT-P3 — Recibe PLAN_SDL de ARNÉS | ? PASS | plan.md L38: "Ejecutar directamente. NO ejecutar Scope Gate. NO reclasificar." Sin modificación de campos ARNÉS. |

### BLOQUE C — BUILD Mode

| Test | Resultado | Evidencia |
|---|---|---|
| CAT-B1 — Direct create file | ? PASS | Archivo TEST_BUILD.md creado en modo BUILD directo. Sin DecisionPackage, Scope Gate ni clasificación. |
| CAT-B2 — Direct execute command | ? PASS | Comando ejecutado. ExecutionReport producido. Sin clasificación ni DecisionPackage. |
| CAT-B3 — Recibe ExecutionPlan | ? PASS | Trató plan como contrato. Sin reclasificar. Sin generar DecisionPackage propio. Sin Scope Gate. |
| CAT-B4 — Asked to classify | ? PASS | Respondió: "BUILD no clasifica misiones. La clasificación es responsabilidad exclusiva del Decision Engine en ARNÉS." |

### BLOQUE D — CROSS MODE

| Test | Resultado | Evidencia |
|---|---|---|
| CAT-X1 — ARNÉS -> BUILD direct | ? PASS | arnes.md L59: "Nunca pases por PLAN". plan.md L55: "PLAN nunca recibe BUILD_DIRECT". ARNÉS delega directamente a BUILD. |

---

## 4. Verificación de Fronteras

| Frontera | Verificación | Estado |
|---|---|---|
| Decision Engine exclusivo en ARNÉS | arnes.md L22: "único Decision Engine". 0 referencias en plan.md, build.md, light-planner.md | ? |
| PLAN no recibe BUILD_DIRECT | plan.md L55: "PLAN nunca recibe BUILD_DIRECT". Fila eliminada de tabla. | ? |
| ARNÉS -> BUILD directo | arnes.md L59: "Nunca pases por PLAN". Delegación directa. | ? |
| PLAN -> ExecutionPlan -> Usuario (FIN) | plan.md L58-62: "PLAN finaliza su ciclo entregando el Execution Plan al usuario." | ? |
| BUILD sin clasificación | build.md L30-60: "nunca ejecuta el Decision Engine". 7 prohibiciones explícitas. | ? |
| Model Governance | Current Model solo en PLAN (sin model override). 9/10 agentes con modelos gratuitos. | ? |

---

## 5. Fallos Encontrados

**0 fallos.** Las 12 pruebas superaron sus criterios individuales. No se detectó contaminación entre modos.

---

## 6. Severidad de Hallazgos

| Clasificación | Cantidad |
|---|---|
| CRÍTICO | 0 |
| MAYOR | 0 |
| MENOR | 0 |
| OBSERVACIÓN | 0 |

---

## 7. Veredicto Final

`
ESTADO: CERTIFIED

ARNÉS Framework v1.1.0 cumple con los criterios de certificación conductual:

? Decision Engine aislado en ARNÉS (exclusivo, sin fugas).
? PLAN no recibe BUILD_DIRECT (ARNÉS delega directamente).
? PLAN no inicia BUILD por iniciativa propia.
? BUILD no clasifica, no ejecuta Decision Engine, no genera DecisionPackage.
? Model Governance respetado (Current Model solo en SDL).
? Entry points independientes con fronteras claras.
? 12/12 pruebas CAT superadas.
`

---

## 8. Evidencia de Soporte

| Documento | Propósito |
|---|---|
| docs/arnes/certification/CAT_MATRIX_v1.1.0.md | Matriz de 12 pruebas conductuales |
| docs/arnes/CERTIFICATION_v1.1.0.md | Certificación arquitectónica |
| el/contracts/diagnose.sh v2.0 | 49 PASS, 0 FAIL |
| el/contracts/enforce.sh | R1-R4 PASS |
| .opencode/agents/arnes.md | Decision Engine exclusivo, primer responsable |
| .opencode/agents/plan.md | Scope Gate reducido, boundary PLAN/BUILD |
| .opencode/agents/build.md | Entry Point Isolation, Escenarios A/B, R6+R7 |

---

> *ARNÉS Framework v1.1.0 — Runtime Behavioral Certification.*
>
> *La implementación OpenCode/AEL respeta las fronteras arquitectónicas definidas.*
> *El Decision Engine es único y reside exclusivamente en ARNÉS.*
> *PLAN y BUILD son entry points independientes sin contaminación cruzada.*
> *12/12 pruebas CAT superadas. 0 fallos. Veredicto: CERTIFIED.*
