# Dual Interface Architecture — OpenCode + AITOS Development Ecosystem

> Modelo de doble capa que distingue explícitamente las interfaces nativas de OpenCode de las interfaces del ecosistema de desarrollo AITOS.
> Fecha: 2026-07-19

---

## 1. Objective

Formalizar la coexistencia de dos capas de interfaces en el selector de OpenCode:

| Capa | Interfaces | Origen |
|------|-----------|--------|
| **PLATAFORMA** | PLAN, BUILD | OpenCode nativo (built-in agents) |
| **ECOSISTEMA DE DESARROLLO** | Strategic Director, AEL | `opencode.json` (custom agents) |

No son equivalentes. No compiten entre sí. Representan niveles diferentes de abstracción.

---

## 2. Motivation

La auditoría de dispatch (`DISPATCH_RESOLUTION_AUDIT.md`) demostró que:

1. OpenCode distingue entre built-in agents y custom agents solo por su presencia en el `Map<Agent.ID, Agent.Info>`. No existe un flag "built-in" que diferencie su comportamiento.
2. PLAN y Strategic Director coexisten en el selector como dos entradas diferentes — no es duplicación, son agentes con diferentes IDs, prompts, permisos y responsabilidades.
3. BUILD y AEL coexisten análogamente: BUILD es ejecución genérica nativa, AEL es ejecución operacional del ecosistema.

La decisión arquitectónica es:

- **No ocultar** los agentes del ecosistema.
- **No sobrescribir** los built-in de OpenCode.
- **Representar explícitamente** las dos capas como convivencia intencional.

---

## 3. Dual layer model

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│   OPENCODE PLATFORM (Built-in agents)                             │
│                                                                   │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  PLAN                              BUILD                │    │
│   │  (id: "plan")                      (id: "build")        │    │
│   │  Permisos: edit:ask, bash:ask      Permisos: allow/all  │    │
│   │  Prompt: default de OpenCode       Prompt: default      │    │
│   │  Rol: análisis genérico            Rol: ejecución total │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   AITOS DEVELOPMENT ECOSYSTEM (Custom agents)                     │
│                                                                   │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  Strategic Director                   AEL               │    │
│   │  (id: "strategic-director")          (id: "ael")        │    │
│   │  Permisos: edit:deny, bash:deny      Permisos: edit:ask │    │
│   │  task: solo ael                      bash:ask           │    │
│   │                                       task: 6 subagents │    │
│   │  Prompt: 92 líneas                   Prompt: 96 líneas  │    │
│   │  Rol: planificación estratégica      Rol: ejecución     │    │
│   │       con contratos PLAN→BUILD            operacional   │    │
│   │       Execution Plan JSON                BUILD workflow │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│                         6 subagentes (ael-*)                       │
│                         explore, architect, implementer,           │
│                         audit, memory, learning                    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Interface comparison

| Dimensión | PLAN | Strategic Director | BUILD | AEL |
|-----------|------|-------------------|-------|-----|
| **Origen** | OpenCode nativo | `opencode.json` custom | OpenCode nativo | `opencode.json` custom |
| **ID** | `plan` | `strategic-director` | `build` | `ael` |
| **mode** | primary | primary | primary | primary |
| **Capa** | Plataforma | Ecosistema | Plataforma | Ecosistema |
| **Rol** | Análisis genérico | Planificación estratégica | Ejecución genérica | Ejecución operacional |
| **Prompt** | Default OpenCode | 92 líneas (contratos) | Default OpenCode | 96 líneas (BUILD workflow) |
| **edit** | ask | deny | allow | ask |
| **bash** | ask | deny | allow | ask |
| **task** | sin restricción | solo ael | sin restricción | 6 subagentes |
| **Delegación AEL** | ❌ No | ✅ task:ael | ❌ No | N/A (es AEL) |
| **Execution Plan** | ❌ No | ✅ Formato JSON | ❌ No | ❌ No (lo recibe) |
| **Cierre de misión** | ❌ No | ✅ Bloque obligatorio | ❌ No | ✅ Cierre táctico |
| **Contratos** | Ninguno | PLAN→BUILD, Mission Closure | Ninguno | SPEC.md, I1-I6 |

---

## 5. Non-equivalence

Cada interfaz tiene un propósito diferente y no puede reemplazar a otra:

### PLAN ≠ Strategic Director

| Aspecto | PLAN | Strategic Director |
|---------|------|-------------------|
| ¿Puede delegar en AEL? | No | Sí |
| ¿Tiene formato obligatorio de salida? | No | Sí (Recommendation + EP + Status) |
| ¿Puede editar archivos? | ask (pregunta) | deny (bloqueado) |
| ¿Conoce los contratos arquitectónicos? | No | Sí |

### BUILD ≠ AEL

| Aspecto | BUILD | AEL |
|---------|-------|-----|
| ¿Tiene subagentes especializados? | No | Sí (6) |
| ¿Sigue un workflow definido? | No | Sí (Recibí→Descomponé→Ejecutá→Cerrá) |
| ¿Verifica invariantes (I1-I6)? | No | Sí |
| ¿Preserva conocimiento? | No | Sí (Memory capability) |

---

## 6. Usage model

### Flujo principal (recomendado)

1. Usuario inicia en **Strategic Director** (`default_agent`)
2. SDL analiza, produce Execution Plan + Recommendation + Status
3. Usuario aprueba con `ok` / `hacelo`
4. SDL delega a **AEL** via `task`
5. AEL ejecuta el plan, invoca subagentes, entrega Execution Report
6. SDL evalúa resultados y decide: nuevo ciclo o cierre

### Flujo alternativo

- Usuario selecciona **PLAN** para análisis genérico sin contratos
- Usuario selecciona **BUILD** para ejecución directa sin intermediación
- Usuario selecciona **AEL** directamente para tareas operacionales que no requieren planificación estratégica

---

## 7. Invariantes

| ID | Invariante |
|----|-----------|
| DI-01 | PLAN y BUILD nunca se modifican. Son capacidades nativas de OpenCode. |
| DI-02 | Strategic Director y AEL nunca sobrescriben PLAN y BUILD. Son interfaces separadas. |
| DI-03 | Las cuatro interfaces coexisten sin superposición de responsabilidades. |
| DI-04 | Strategic Director es la única interfaz que puede delegar en AEL via `task`. |
| DI-05 | AEL es la única interfaz que puede invocar los 6 subagentes `ael-*`. |
| DI-06 | El flujo principal del ecosistema comienza en Strategic Director (`default_agent`). |

---

## 8. Selector visualization

```
┌──────────────────────────────────────────────────────────────┐
│  [PLAN]  [BUILD]  [Strategic Director]  [AEL]                │
│                                                               │
│  ──────────  ──────────  ─────────────────  ──────────        │
│  Plataforma  Plataforma  Ecosistema         Ecosistema        │
│  OpenCode    OpenCode    AITOS              AITOS             │
└──────────────────────────────────────────────────────────────┘
```

---

## 9. Relation to certified architecture

```
OpenCode Platform
    │
    ├── PLAN (built-in primary)
    │       └── Análisis genérico sin contratos
    │
    ├── BUILD (built-in primary)
    │       └── Ejecución genérica sin contratos
    │
AITOS Ecosystem
    │
    ├── Strategic Director (custom primary) ← default_agent
    │       ├── Planificación estratégica
    │       ├── Execution Plan + Recommendation + Status
    │       ├── Contrato PLAN→BUILD
    │       └── Delegación a AEL (task)
    │
    └── AEL (custom primary)
            ├── Ejecución operacional
            ├── BUILD workflow (Recibí→Descomponé→Ejecutá→Cerrá)
            ├── Verificación I1-I6
            ├── Cierre táctico
            └── 6 subagentes (explore, architect, implementer, audit, memory, learning)
```

---

## 10. Relation to existing contracts

| Contract | ¿Afectado? | Notas |
|----------|-----------|-------|
| MISSION_PHASE_ARCHITECTURE.md | ❌ No | PLAN→BUILD sigue siendo el contrato entre SDL y AEL |
| MISSION_CLOSURE_CONTRACT.md | ❌ No | SDL sigue siendo único responsable de cierre |
| SDL_CONTRACT_CERTIFICATION.md | ❌ No | SDL como rol cognitivo inalterado |
| HARNESS_ALIGNMENT_IMPLEMENTATION.md | ⚠️ Parcial | AEL ahora es primary, no subagent. El cambio es solo de interfaz, no de funcionalidad. |
| DISPATCH_RESOLUTION_AUDIT.md | ❌ No | Dispatch sigue funcionando por lookup de ID |

---

## 11. Veredicto

```
╔══════════════════════════════════════════════════════════════════════╗
║          DUAL INTERFACE ARCHITECTURE — ✅ DOCUMENTADA               ║
║                                                                      ║
║  ✓ PLAN y BUILD son capacidades nativas de OpenCode (inalteradas)   ║
║  ✓ Strategic Director y AEL son interfaces del ecosistema AITOS     ║
║  ✓ No existe superposición conceptual entre las cuatro interfaces   ║
║  ✓ El flujo principal comienza en SDL (default_agent)               ║
║  ✓ La arquitectura certificada PLAN→BUILD se mantiene intacta       ║
║  ✓ Los contratos, prompts y subagentes no se modifican              ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

*Este documento formaliza la arquitectura de doble capa. OpenCode provee la plataforma (PLAN, BUILD). AITOS provee el ecosistema de desarrollo (Strategic Director, AEL). Ambas capas coexisten sin conflicto.*
