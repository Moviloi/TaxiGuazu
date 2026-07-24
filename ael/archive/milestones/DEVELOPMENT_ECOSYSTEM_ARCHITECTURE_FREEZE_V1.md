# Development Ecosystem Architecture Freeze v1.0

> Congelamiento arquitectónico del ecosistema de desarrollo PLAN → BUILD.
> Fecha: 2026-07-19
> Estado: ✅ FREEZE DECLARADO

---

## 1. Objective

Declarar el congelamiento arquitectónico v1.0 del ecosistema de desarrollo AITOS, compuesto por los contratos PLAN → BUILD, SDL, AEL, Mission Closure y Harness Alignment. A partir de esta fecha, ningún contrato arquitectónico del ecosistema de desarrollo puede modificarse sin un nuevo freeze que derogue explícitamente este documento.

---

## 2. Audit trail

### V-01 — Contract contradictions

Todos los documentos arquitectónicos fueron verificados por contradicciones mutuas:

| Documentos comparados | ¿Contradicción? | Resultado |
|---|---|---|
| MISSION_PHASE_ARCHITECTURE.md ↔ MISSION_CLOSURE_CONTRACT.md | ❌ No | Compatibles — MC extiende MP naturalmente |
| SDL_CONTRACT_CERTIFICATION.md ↔ estado actual | ❌ No | SDL certificado pre-cambio AEL subagent. Certificación válida (certifica concepto SDL, no modo AEL). |
| HARNESS_ALIGNMENT_IMPLEMENTATION.md ↔ opencode.json | ❌ No | Confirma AEL como subagent |
| PLAN_MODE_VISIBILITY_AUDIT.md ↔ opciones de configuración | ❌ No | PLAN y SDL coexisten sin conflicto |
| SPEC.md ↔ ORGANIZATION.md ↔ prompts | ❌ No | SDL es PLAN, AEL es BUILD |

**Hallazgo:** `opencode.json:instructions: ["ael/AGENTS.md"]` apunta a archivo inexistente (deuda pre-existente H-03).

### V-02 — Attempt to eliminate each component

| Componente | ¿Eliminable? | Justificación |
|---|---|---|
| **SDL (Strategic Director)** | ❌ No | Es `default_agent`. Contiene el contrato PLAN→BUILD, formato Execution Plan, delegación a AEL. Sin SDL no hay capa estratégica. |
| **AEL (ARNÉS Director)** | ❌ No | Es el puente operacional entre SDL y subagentes. SDL delega exclusivamente en AEL. Sin AEL, SDL invocaría subagentes directamente (viola SD-I2). |
| **Mission Phase Architecture** | ❌ No | Es el contrato PLAN→BUILD. Separa estrategia de operación. Define invariantes MP-01 a MP-06. |
| **Mission Closure Contract** | ❌ No | Sin él, Learning podría ejecutarse durante misiones abiertas. Define el state machine IN PROGRESS → CLOSED. |
| **Learning Trigger** | ❌ No como concepto | Learning necesita un contrato de activación. Sin MC contract, Learning opera sin restricciones. |

**Veredicto V-02:** 0 componentes eliminables. Todos son arquitectónicamente necesarios.

### V-03 — Single responsibility check

| Componente | Responsabilidad | ¿Cumple SRP? |
|---|---|---|
| SDL | Planificación estratégica | ✅ Sí — sin código, sin herramientas, sin subagentes directos |
| AEL | Ejecución operacional | ✅ Sí — recibe EP, descompone, ejecuta, cierra |
| Mission Phase | Contrato entre PLAN y BUILD | ✅ Sí — define invariantes, no ejecutable |
| Mission Closure | State machine controller | ✅ Sí — define estados y transiciones |
| Learning | Pattern extraction post-closure | ✅ Sí — solo después de CLOSED |

**Overlap detectado:** La sección "Cierre de misión" en AEL (táctico) y MISSION_CLOSURE_CONTRACT (estratégico) coexisten. Es intencional (diferentes niveles), pero puede causar confusión.

### V-04 — OpenCode vs ecosystem decoupling

| Aspecto | OpenCode | Ecosystem |
|---|---|---|
| PLAN mode | Nativo (built-in agent `plan`) | SDL como agente custom con contratos |
| BUILD mode | Nativo (built-in agent `build`) | AEL como subagente con workflow BUILD |
| Task system | Runtime de delegación | SDL → AEL → subagentes |
| Permissions | Sistema de permisos | `edit:deny`, `bash:deny` para SDL |
| Model assignment | Current Session Model | SDL y AEL sin modelo fijo; subagentes con modelos hardcodeados |

**Decoupling:** OpenCode provee el runtime; el ecosistema provee la arquitectura y contratos. El único coupling es `default_agent: "strategic-director"` — intencional.

### V-05 — Remaining technical debt

| ID | Deuda | Severidad | Componente |
|---|---|---|---|
| R-01 | `STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md` obsoleto (4 referencias a GPT-5.4 mini) | 🟡 Media | Documentación |
| R-02 | `opencode.json:instructions: ["ael/AGENTS.md"]` — archivo no existe | 🟡 Media | Configuración |
| H-01 | Nomenclatura inconsistente: `ael.md` usa `@ael-design`, `@ael-implement`, etc. vs `opencode.json` usa `ael-architect`, `ael-implementer` | 🟡 Media | Configuración |
| H-03 | AEL usa Current Session Model por omisión histórica (sin modelo explícito) | 🟢 Baja | Arquitectura |

### V-06 — Operational readiness

| Dimensión | Estado |
|---|---|
| Arquitectura estable | ✅ |
| Contratos documentados y verificados | ✅ |
| Componentes con responsabilidades claras | ✅ |
| OpenCode integration clean | ✅ |
| Deuda restante documentada | ✅ |
| **Ready for freeze** | **✅ SÍ** |

---

## 3. Certified components

### 3.1 Strategic Director (SDL)

- **Rol:** Capa estratégica — análisis, planificación, recomendación
- **Modo:** `primary` (único modo visible del ecosistema)
- **Permisos:** `read/glob/grep/list: allow`, `edit/bash: deny`, `task: { "*": "deny", "ael": "allow" }`
- **Modelo:** Current Session Model (decisión arquitectónica consciente)
- **Formato de salida obligatorio:** Recommendation + Execution Plan (JSON) + Execution Status (READY|NOT READY)
- **Certificado por:** SDL_CONTRACT_CERTIFICATION.md (V-01 a V-08)
- **Invariantes:** SD-I1 a SD-I6

### 3.2 AEL (ARNÉS Director)

- **Rol:** Capa operacional — ejecución de Execution Plans
- **Modo:** `subagent` (convertido desde primary en PR-HARNESS-ALIGNMENT-2)
- **Permisos:** `read/glob/grep/list/webfetch/websearch: allow`, `edit/bash: ask`, `task` a 6 subagentes
- **Modelo:** Current Session Model (por omisión histórica)
- **Workflow:** Recibí → Descomponé → Ejecutá → Cerrá
- **Reglas invariables:** R1-R5
- **Certificado por:** HARNESS_ALIGNMENT_IMPLEMENTATION.md (V-01 a V-07)

### 3.3 Mission Phase Architecture (PLAN → BUILD)

- **Documento canónico:** MISSION_PHASE_ARCHITECTURE.md
- **Fases:** PLAN (estratégico) → BUILD (operacional)
- **Transición:** SDL produce EP → Usuario aprueba → AEL ejecuta
- **Invariantes:** MP-01 a MP-06

### 3.4 Mission Closure Contract

- **Documento canónico:** MISSION_CLOSURE_CONTRACT.md
- **Estados de misión:** IN PROGRESS, CLOSED
- **Quién cierra:** Solo SDL
- **Trigger de Learning:** Solo después de CLOSED
- **Invariantes:** MC-01 a MC-07

### 3.5 Harness Alignment

- **Estado:** AEL convertido a subagente puro
- **Modos visibles:** Strategic Director (único primary)
- **Subagentes:** 6 (ael-explore, ael-architect, ael-implementer, ael-audit, ael-memory, ael-learning)
- **Certificado por:** HARNESS_ALIGNMENT_IMPLEMENTATION.md

### 3.6 PLAN Mode Visibility

- **Estado:** Aceptada la coexistencia de PLAN (nativo), BUILD (nativo) y Strategic Director (custom)
- **Recomendación:** Mejorar descripción de SDL para clarificar rol
- **Certificado por:** PLAN_MODE_VISIBILITY_AUDIT.md

---

## 4. Component responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO                                   │
│  Presenta misión o problema                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  PLAN — STRATEGIC DIRECTOR (primary, default_agent)          │
│  ● Analizar evidencia y estado del proyecto                  │
│  ● Producir Recommendation + Execution Plan + Execution Status│
│  ● Detectar incertidumbre y recomendar escalamiento          │
│  ● Declarar cierre de misión (CLOSED)                        │
│  ● NO ejecuta código, NO modifica archivos, NO invoca tools  │
│  Permisos: edit:deny, bash:deny, task: solo ael              │
└────────────────────────┬────────────────────────────────────┘
                         │ task { "ael": "allow" }
                         │ Execution Plan (JSON)
┌────────────────────────▼────────────────────────────────────┐
│  BUILD — AEL (subagent)                                      │
│  ● Recibir Execution Plan del SDL                            │
│  ● Descomponer en tareas ejecutables                         │
│  ● Seleccionar subagentes según necesidad                    │
│  ● Ejecutar y entregar Execution Report                      │
│  ● Cerrar tácticamente (verificar I1-I6, calidad, docs)      │
│  ● NO ejecutar Learning durante misión IN PROGRESS           │
│  Permisos: edit:ask, bash:ask, task: 6 subagentes            │
└───┬───────┬───────┬───────┬───────┬───────┬──────────────────┘
    │       │       │       │       │       │
    ▼       ▼       ▼       ▼       ▼       ▼
 explore architect implementer audit  memory learning
 (ael-    (ael-    (ael-       (ael-  (ael-   (ael-
 explore) arch.)  implementer) audit) memory) learning)
```

---

## 5. Invariants

### PLAN → BUILD (MP-01 to MP-06)

| ID | Invariante |
|----|-----------|
| MP-01 | PLAN es exclusivamente estratégico. SDL nunca ejecuta código, modifica archivos ni invoca herramientas. |
| MP-02 | BUILD es exclusivamente operacional. AEL nunca redefine objetivos, cambia prioridades ni debate estrategia. |
| MP-03 | Toda respuesta del SDL debe terminar con Recommendation + Execution Plan + Execution Status. |
| MP-04 | Execution Status solo admite READY o NOT READY. |
| MP-05 | BUILD solo puede iniciarse con un Execution Plan READY aprobado por el usuario. |
| MP-06 | AEL ejecuta el plan sin redefinir la estrategia. |

### Mission Closure (MC-01 to MC-07)

| ID | Invariante |
|----|-----------|
| MC-01 | Learning nunca se ejecuta durante una misión IN PROGRESS. |
| MC-02 | El único responsable de cerrar una misión es el Strategic Director. |
| MC-03 | Learning solo procesa conocimiento consolidado de misiones CLOSED. |
| MC-04 | BUILD puede ejecutarse múltiples veces sin disparar Learning. |
| MC-05 | El cierre de misión requiere declaración explícita del SDL. |
| MC-06 | El AEL no puede declarar el cierre de una misión. |
| MC-07 | Learning recibe únicamente: Execution Reports, decisiones registradas, Memory snapshots, PROJECT_BOARD, CHANGELOG. |

### Strategic Director Contract (SD-I1 to SD-I6)

| ID | Invariante |
|----|-----------|
| SD-I1 | El SD nunca ejecuta código. |
| SD-I2 | El SD nunca invoca subagentes directamente. |
| SD-I3 | El SD nunca hardcodea un modelo. |
| SD-I4 | Toda comunicación SD → AEL usa Execution Plan JSON. |
| SD-I5 | El SD no tiene dependencias de proveedor LLM específico. |
| SD-I6 | El SD no reemplaza capacidades del arnés. |

---

## 6. Risks and technical debt

### Active risks

| ID | Riesgo | Severidad | Componente |
|---|---|---|---|
| R-01 | `STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md` obsoleto (4 refs a GPT-5.4 mini) | 🟡 Media | Documentación |
| R-02 | `opencode.json:instructions: ["ael/AGENTS.md"]` — archivo no existe | 🟡 Media | Configuración |
| R-03 | AEL usa Current Session Model por omisión histórica | 🟢 Baja | Arquitectura |
| R-04 | Nomenclatura inconsistente `ael.md` vs `opencode.json` (H-01) | 🟡 Media | Configuración |

### Non-risks (discarded)

| Riesgo | Motivo del descarte |
|--------|---------------------|
| SDL podría ejecutar código | `edit: deny` y `bash: deny` son permisos duros del framework |
| SDL podría invocar subagentes directamente | `task: { "*": "deny" }` solo permite `ael` |
| Cambiar Current Session Model rompe arquitectura | 0/6 escenarios de ruptura en V-08 de SDL_CONTRACT_CERTIFICATION |
| PLAN y SDL son duplicados | PLAN (nativo, permisos `ask`) vs SDL (custom, permisos `deny`, contratos) |
| AEL como subagent pierde delegación | Subagentes se referencian por ID, no por mode |

---

## 7. Configuration

### opencode.json — agent structure

| Agente | mode | model | Rol |
|--------|------|-------|-----|
| `strategic-director` | primary | (Current Session) | Planificación estratégica (default_agent) |
| `ael` | subagent | (Current Session) | Ejecución operacional |
| `ael-explore` | subagent | DeepSeek V4 Flash Freeh | Exploración del código |
| `ael-architect` | subagent | DeepSeek V4 Flash Free | Validación arquitectónica |
| `ael-implementer` | subagent | DeepSeek V4 Flash Free | Implementación |
| `ael-audit` | subagent | Nemotron | Auditoría de calidad |
| `ael-memory` | subagent | North Mini Code Free | Preservación de conocimiento |
| `ael-learning` | subagent | North Mini Code Free | Extracción de patrones |

### Permission model

| Permiso | SDL | AEL | Subagentes |
|---------|-----|-----|------------|
| read | allow | allow | allow |
| glob | allow | allow | allow |
| grep | allow | allow | allow |
| list | allow | allow | allow |
| edit | deny | ask | deny (varía por rol) |
| bash | deny | ask | deny (varía por rol) |
| webfetch | — | allow | — |
| websearch | — | allow | — |
| task | solo ael | 6 subagentes | — |

---

## 8. Files

### Architecture contracts
- `docs/architecture/MISSION_PHASE_ARCHITECTURE.md` — PLAN → BUILD contract (10 secciones, 6 invariantes)
- `docs/architecture/MISSION_CLOSURE_CONTRACT.md` — Mission closure & Learning trigger (12 secciones, 7 invariantes)

### Agent definitions
- `opencode.json` — Configuration (131 líneas, 8 agentes)
- `.opencode/agents/strategic-director.md` — SDL prompt (92 líneas)
- `.opencode/agents/ael.md` — AEL prompt (96 líneas)

### Constitution & governance
- `ael/constitution/SPEC.md` — ARNÉS constitution (243 líneas, 6 invariantes I1-I6)
- `ael/government/ORGANIZATION.md` — Capabilities, roles, authority

### Certifications
- `docs/certification/SDL_CONTRACT_CERTIFICATION.md` — SDL v1.0 certification (723 líneas, V-01 a V-08)
- `docs/certification/HARNESS_ALIGNMENT_AUDIT.md` — Pre-implementation audit (9 secciones)
- `docs/certification/HARNESS_ALIGNMENT_IMPLEMENTATION.md` — AEL → subagent certification (168 líneas, V-01 a V-07)
- `docs/certification/PLAN_MODE_VISIBILITY_AUDIT.md` — PLAN vs SDL visibility audit (235 líneas, V-01 a V-07)
- `docs/certification/PR_VERIFY_STRATEGIC_DIRECTOR_LAYER.md` — SDL layer verification

---

## 9. Recommendations

### Post-freeze actions

1. **R-02** — Remove `"instructions": ["ael/AGENTS.md"]` from `opencode.json` (pre-existing H-03 debt).
2. **R-04** — Align subagent names between `ael.md` capabilities table and `opencode.json` agent IDs.
3. **R-01** — Update `ael/artifacts/STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md` to remove GPT-5.4 mini references.
4. **SDL description** — Update `strategic-director` description in `opencode.json` to clarify: "PLAN estratégico AITOS — produce Execution Plans, delega BUILD a AEL. Modo principal del ecosistema." (per PLAN_MODE_VISIBILITY_AUDIT.md recommendation).

### Frozen (do not modify without new freeze)

- Mission Phase Architecture (MP-01 to MP-06)
- Mission Closure Contract (MC-01 to MC-07)
- Strategic Director contract (SD-I1 to SD-I6)
- AEL as pure operational subagent
- SDL as sole primary agent
- SDL → AEL → subagentes delegation chain

---

## 10. Veredicto final

```
╔══════════════════════════════════════════════════════════════════════╗
║     DEVELOPMENT ECOSYSTEM ARCHITECTURE FREEZE v1.0 — ✅ DECLARADO   ║
║                                                                      ║
║  El ecosistema de desarrollo PLAN → BUILD ha sido auditado,         ║
║  certificado y congelado en su versión 1.0.                          ║
║                                                                      ║
║  Componentes certificados:                                           ║
║  ✓ Strategic Director (SDL) — rol cognitivo, no modelo específico   ║
║  ✓ AEL (ARNÉS Director) — subagente operacional puro                ║
║  ✓ Mission Phase Architecture — contrato PLAN → BUILD               ║
║  ✓ Mission Closure Contract — state machine IN PROGRESS → CLOSED    ║
║  ✓ Harness Alignment — AEL mode: subagent, SDL único primary        ║
║  ✓ PLAN Mode Visibility — coexistencia aceptada                     ║
║                                                                      ║
║  Invariantes congelados: 19 (6 MP + 7 MC + 6 SD-I)                  ║
║  Deuda técnica documentada: 4 ítems (R-01 a R-04)                   ║
║                                                                      ║
║  Fecha: 2026-07-19                                                   ║
║  Próximo freeze: cuando se requiera modificar algún contrato        ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

*This document declares the Development Ecosystem Architecture Freeze v1.0. No architectural contract of the development ecosystem (SDL, AEL, Mission Phase, Mission Closure, Harness Alignment) may be modified without a new freeze that explicitly supersedes this one.*
