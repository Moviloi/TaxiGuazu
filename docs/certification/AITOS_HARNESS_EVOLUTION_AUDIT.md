# AITOS HARNESS EVOLUTION AUDIT
## 2026-07-08 | Auditoría del arnés de evolución

---

## 1. Arquitectura actual del arnés

```
ael/
├── constitution/          ← PERMANENTE. Cambia muy raramente.
│   ├── SPEC.md            ← invariants, principles, lifecycle constraints
│   └── CONTRACTS.md       ← R1-R4 enforcement rules
│
├── government/            ← EVOLUTIVO. Cambia cuando la organización evoluciona.
│   ├── ORGANIZATION.md     ← capabilities, roles, authority
│   └── roles/             ← 6 capability contracts (02-07)
│
├── contracts/             ← ADMINISTRACIÓN. Implementación concreta.
│   ├── enforce.sh         ← contract enforcement (PASS en cada cambio)
│   └── diagnose.sh        ← self-diagnostic
│
├── artifacts/             ← REGISTRO HISTÓRICO.
│   └── BACKLOG.md          ← plan de trabajo (v3.12, 2026-07-05)
│
└── archive/               ← DOCUMENTOS SUPERSEDIDOS.
    └── PIPELINE.md, HANDOFF.md, AGENTS.md, etc.
```

**Evaluación**: La separación Constitution/Government/Administration es correcta y está implementada. El arnés define capacidades, roles y contratos. Lo que falta es el eslabón entre el arnés y el ciclo de evolución documental.

---

## 2. Roles y responsabilidades reales

| Rol | Definido en | Responsable de | ¿Participa en evolución? |
|---|---|---|---|
| **Director** | `.opencode/agents/ael.md` | Mission Planner soberano. Decide estrategia. | ✅ Orquesta todo el ciclo |
| **Explorer** | `government/roles/02-explorer.md` | Descubrir estado real del código | ✅ Produce hallazgos |
| **Architect** | `government/roles/03-architect.md` | Validar diseño contra ADRs | ✅ Evalúa impacto arquitectónico |
| **Implementer** | `government/roles/04-implementer.md` | Aplicar cambios autorizados | ✅ Ejecuta |
| **Auditor** | `government/roles/05-auditor.md` | Validar calidad (tests, build, contratos) | ✅ Verifica |
| **Keeper** | `government/roles/06-memory.md` | Preservar conocimiento | ⚠️ Actualiza MEMORY.md pero NO PROJECT_BOARD |
| **Analyst** | `government/roles/07-learning.md` | Detectar patrones, recomendar mejoras | ⚠️ Definido pero subutilizado en la práctica |

**Gap**: El Keeper y el Analyst tienen contratos definidos pero su rol en el ciclo de evolución documental no está formalizado. El Keeper actualiza MEMORY.md pero no PROJECT_BOARD.md ni CHANGELOG.md. El Analyst recomienda pero no crea tareas en el backlog.

---

## 3. Mecanismo actual de memoria

| Componente | ¿Qué registra? | ¿Cubre decisiones arquitectónicas? | ¿Cubre cambios de principios? |
|---|---|---|---|
| `MEMORY.md` (.opencode) | Decisiones técnicas, bugs, fixes | Parcial — registra decisiones históricas | No — solo cambios de código |
| `BACKLOG.md` (ael/artifacts) | Tareas, deuda, features | Parcial — AIT-001 a AIT-064 | No — no registra principios |
| `PROJECT_BOARD.md` (docs/project) | Tareas priorizadas P0-P3 | ✅ Reciente — creado en esta etapa | No — tareas, no principios |
| `CHANGELOG.md` (docs/project) | Timeline de misiones | ✅ Reciente | No |
| `docs/adr/` | Decisiones arquitectónicas | ✅ ADR-001 a ADR-007 | ✅ Los ADRs documentan principios |

**Evaluación**: La memoria está fragmentada. MEMORY.md (agente), BACKLOG.md (tareas), PROJECT_BOARD.md (estado), y ADRs (decisiones) son 4 fuentes distintas sin mecanismo de sincronización automática.

---

## 4. Mecanismo actual de backlog

| Mecanismo | ¿Formalizado? | ¿Actualizado automáticamente? | ¿Quién lo actualiza? |
|---|---|---|---|
| `BACKLOG.md` | ✅ v3.12 | ❌ Manual, desactualizado | Director (manual) |
| `PROJECT_BOARD.md` | ✅ Nuevo | ❌ Manual | Director (manual) |
| `PROJECT_WORKFLOW.md` | ✅ Checklist definido | ❌ No aplica | Protocolo documentado |

**Evaluación**: El PROJECT_WORKFLOW.md define un protocolo de 8 pasos para cerrar misiones. Pero el protocolo no está integrado con el arnés — depende de que el Director lo ejecute manualmente. Las capabilities Memory y Learning no están configuradas para seguir este protocolo.

---

## 5. Capacidades faltantes

| Capacidad | ¿Existe en el arnés? | ¿Implementada? |
|---|---|---|
| **Discovery** (explorar código) | ✅ Explorer | ✅ |
| **Assessment** (evaluar hallazgos) | ✅ Architect | ✅ |
| **Decision** (elegir curso de acción) | ✅ Director | ✅ |
| **Implementation** (ejecutar cambios) | ✅ Implementer | ✅ |
| **Validation** (verificar calidad) | ✅ Auditor | ✅ |
| **Memory** (preservar conocimiento) | ✅ Keeper | ⚠️ Solo MEMORY.md |
| **Learning** (detectar patrones) | ✅ Analyst | ⚠️ Subutilizado |
| **Backlog Sync** (sincronizar tareas) | ❌ No existe | ❌ |
| **ADR Sync** (vincular ADRs con tareas) | ❌ No existe | ❌ |
| **Changelog Sync** (registrar misiones) | ❌ No existe | ❌ |
| **Principle Audit** (verificar alineación) | ❌ No existe | ❌ — E6 fue manual |
| **Context Evolution** (evolucionar modelo) | ❌ No existe | ❌ — E9-E10 fueron manuales |

**Gap principal**: El arnés cubre el ciclo de CAMBIOS DE CÓDIGO (Explore → Architect → Implement → Audit → Memory → Learning) pero NO cubre el ciclo de EVOLUCIÓN DOCUMENTAL (Auditoría de principios → Decisión de backlog → Sincronización de ADRs → Actualización de documentación viva).

---

## 6. Duplicidades

| Concepto | Archivo 1 | Archivo 2 | ¿Redundante? |
|---|---|---|---|
| Tareas | `BACKLOG.md` (ael/artifacts) | `PROJECT_BOARD.md` (docs/project) | ⚠️ BACKLOG es histórico, BOARD es activo. Pero se solapan. |
| Decisiones | `MEMORY.md` (.opencode) | `docs/adr/` | ✅ ADRs son formales; MEMORY es operativo. Bien separados. |
| Roadmap | `ROADMAP.md` (docs/) | `BACKLOG.md` sección D/G | ⚠️ ROADMAP es estratégico; BACKLOG es táctico. Pero duplican información. |

**Recomendación**: Consolidar BACKLOG.md y PROJECT_BOARD.md. BACKLOG queda como histórico (AIT-001 a AIT-064). PROJECT_BOARD es el estado actual (P0-P3).

---

## 7. Mejoras necesarias

| # | Mejora | Prioridad | Archivos afectados |
|---|---|---|---|
| 1 | **Formalizar el Keeper para PROJECT_BOARD** — que actualice PROJECT_BOARD.md al final de cada misión, no solo MEMORY.md | P1 | `government/roles/06-memory.md` |
| 2 | **Formalizar el Analyst para principios** — que verifique alineación con principios tras cambios | P2 | `government/roles/07-learning.md` |
| 3 | **Integrar PROJECT_WORKFLOW.md con el arnés** — que el Director ejecute el checklist al cerrar misiones | P1 | `.opencode/agents/ael.md` |
| 4 | **Consolidar BACKLOG.md → PROJECT_BOARD.md** — mantener BACKLOG como histórico, BOARD como activo | P2 | Ambos archivos |
| 5 | **Agregar capability de "Documentation Sync"** al pipeline — o extender Memory para cubrir docs vivos | P3 | Nuevo o extensión de Memory |

---

## 8. Cómo incorporar E6-E10 correctamente

Los hallazgos de las auditorías E6-E10 tienen ubicación natural en el sistema actual:

| Auditoría | Hallazgos → dónde van | Tareas creadas |
|---|---|---|
| **E6** (Conversational Principles) | Matriz de principios → `PROJECT_BOARD.md` como tareas de evolución | 6 tareas (P0.7 inferencia semántica, P0.17 trip bundles, etc.) |
| **E9** (Intent Model) | Recomendación de no multiplicar intents → `docs/adr/` como ADR-008 si se formaliza | 3 tareas (persistir intent, usar purchaseIntent, derivar client_objective) |
| **E10** (Context Persistence) | Propuesta de 2 columnas en chat_sessions → `PROJECT_BOARD.md` como P2 | 2 tareas (last_intent, client_objective) |
| **E11** (no auditado aún) | — | — |
| **E12** (no auditado aún) | — | — |

---

## Respuesta final

**"¿El arnés actual permite que AITOS evolucione de manera controlada o todavía depende de gestión manual?"**

**Todavía depende de gestión manual para la evolución documental.** El arnés cubre excelentemente el ciclo de CAMBIOS DE CÓDIGO (Explore → Architect → Implement → Audit → Memory → Learning) con contratos formales y enforcement automático. Pero el ciclo de EVOLUCIÓN DOCUMENTAL (auditoría de principios → decisión de backlog → sincronización de ADRs → actualización de docs vivos) depende de que el Director siga manualmente el PROJECT_WORKFLOW.md.

**Lo que falta**: Extender los contratos de Memory (Keeper) y Learning (Analyst) para cubrir explícitamente la sincronización de PROJECT_BOARD.md, CHANGELOG.md y ADRs. Con 3 cambios en los role contracts y 1 actualización del system prompt del Director, el arnés cubriría ambos ciclos.
