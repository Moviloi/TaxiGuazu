# OpenCode Configuration Architecture Audit

> Auditoría de fidelidad: ¿`opencode.json` representa la arquitectura actual de doble interfaz o la evolución histórica?
> Fecha: 2026-07-19
> Prohibido modificar archivos.

---

## 1. Objective

Determinar si `opencode.json` refleja fielmente la arquitectura actual (Dual Interface: SDL || AEL como interfaces paralelas) o si conserva estructura heredada del diseño anterior (SDL → AEL → Subagentes como jerarquía).

---

## 2. Evidence

### 2.1 `opencode.json` (131 líneas)

```json
{
  "default_agent": "strategic-director",
  "instructions": ["ael/AGENTS.md"],
  "agent": {
    "strategic-director": {
      "description": "Strategic Director — Capa superior responsable de analizar, evaluar, planificar y recomendar escalamiento",
      "mode": "primary",
      "permission": {
        "edit": "deny",
        "bash": "deny",
        "task": { "*": "deny", "ael": "allow" }
      }
    },
    "ael": {
      "description": "ARNES Director — motor operacional de BUILD",
      "mode": "primary",
      "permission": {
        "edit": "ask",
        "bash": "ask",
        "webfetch": "allow",
        "websearch": "allow",
        "task": {
          "*": "deny",
          "explore": "allow",
          "ael-explore": "allow",
          "ael-architect": "allow",
          "ael-implementer": "allow",
          "ael-audit": "allow",
          "ael-memory": "allow",
          "ael-learning": "allow"
        }
      }
    },
    // 6 subagentes ael-* (mode: subagent)
  }
}
```

### 2.2 Agent prompts

- `strategic-director.md` (92 líneas): "capa superior", "interpretar la evidencia y los resultados entregados por el arnés (ael)", formato Execution Plan que produce planes para AEL, bloque de cierre obligatorio.
- `ael.md` (96 líneas): "recibir un Execution Plan del Strategic Director (SDL) y ejecutarlo", R4/R5 limitan desviación estratégica, 6 capabilities delegadas a subagentes.

### 2.3 Architecture documents

- `DUAL_INTERFACE_ARCHITECTURE.md`: SDL || AEL como interfaces paralelas del ecosistema. DI-04: "Strategic Director es la única interfaz que puede delegar en AEL via task". DI-06: "El flujo principal comienza en Strategic Director (default_agent)".
- `MISSION_PHASE_ARCHITECTURE.md`: PLAN → BUILD. SDL = PLAN, AEL = BUILD.

---

## 3. V-01: Conceptual model of opencode.json

### Modelo actual representado

El archivo describe:

```
default_agent ──► strategic-director (primary)
                       │ task: { "*": "deny", "ael": "allow" }
                       ▼
                  ael (primary)
                       │ task: 6 subagentes ael-*
                       ▼
                  ael-explore, ael-architect, ael-implementer,
                  ael-audit, ael-memory, ael-learning
```

### ¿A o B?

**Ni A ni B puro. Es un modelo híbrido:**

| Elemento | Indica A (jerarquía) | Indica B (paralelo) |
|----------|---------------------|---------------------|
| `mode: primary` en ambos | | ✅ Ambos son interfaces independientes |
| `default_agent: "strategic-director"` | ✅ Punto de entrada único | |
| `task: { "*": "deny", "ael": "allow" }` en SDL | ✅ SDL solo puede delegar en AEL | |
| Descripción "Capa superior" en SDL | ✅ Lenguaje jerárquico | |
| SDL tiene `edit: deny, bash: deny` | ✅ SDL no puede ejecutar sin AEL | |
| AEL tiene `edit: ask, bash: ask` | | ✅ AEL puede operar independientemente |

**Veredicto V-01:** La configuración representa **predominantemente el modelo A (SDL → AEL → Subagentes)**. Aunque ambos son `mode: primary` (independencia de interfaz), el `default_agent`, la delegación exclusiva SDL→AEL, y el lenguaje "Capa superior" describen una relación funcional jerárquica.

---

## 4. V-02: Hierarchical references between SDL and AEL

### En opencode.json

| Línea | Referencia | Texto |
|-------|-----------|-------|
| 3 | `default_agent` | `"strategic-director"` — SDL es el punto de entrada forzado |
| 7 | `description` | `"Capa superior responsable de..."` — lenguaje jerárquico |
| 16-18 | `task` | `{ "*": "deny", "ael": "allow" }` — SDL solo puede delegar en AEL |

### En `strategic-director.md`

| Línea | Referencia | Texto |
|-------|-----------|-------|
| 1 | description | `"Capa superior responsable de analizar, evaluar, planificar y recomendar escalamiento"` |
| 16 | prompt | `"capa superior de análisis estratégico y planificación"` |
| 25-27 | prohibiciones | `"reemplazar al Arquitecto (ael-architect)"`, `"reemplazar al Auditor (ael-audit)"`, `"saltar su flujo establecido"` |
| 31 | dependencia | `"interpretar la evidencia y los resultados entregados por el arnés (ael)"` |
| 35-37 | comunicación | `"Para comunicarte con el arnés (ael), debes generar instrucciones estructuradas"` |
| 46,50 | workflow | `"recommended_workflow": ["string (Lista de pasos recomendados a seguir por el arnés)"]` |
| 92 | inicio BUILD | `"El usuario debe poder iniciar BUILD respondiendo únicamente ok o hacelo"` |

### En `ael.md`

| Línea | Referencia | Texto |
|-------|-----------|-------|
| 28 | dependencia | `"recibir un Execution Plan del Strategic Director (SDL) y ejecutarlo"` |
| 43 | workflow | `"Recibí el Execution Plan del SDL. Es tu contrato de ejecución. No lo reinterpretes estratégicamente."` |
| 66 | R4 | `"No redefinir los objetivos del Execution Plan recibido del SDL."` |
| 67 | R5 | `"No generar un nuevo Execution Plan estratégico. La planificación estratégica es exclusiva del SDL."` |

### En architecture documents

| Documento | Referencia |
|-----------|-----------|
| MISSION_PHASE_ARCHITECTURE.md | SDL = PLAN, AEL = BUILD. Transición formal PLAN→BUILD. |
| MISSION_CLOSURE_CONTRACT.md | MC-02: "El único responsable de cerrar una misión es el Strategic Director". MC-06: "El AEL no puede declarar el cierre de una misión". |
| DUAL_INTERFACE_ARCHITECTURE.md | DI-04: "Strategic Director es la única interfaz que puede delegar en AEL via task". DI-06: "El flujo principal comienza en Strategic Director (default_agent)". |

---

## 5. V-03: Classification of dependencies

| # | Dependencia | Origen | Clasificación |
|---|-------------|--------|---------------|
| 1 | `default_agent: "strategic-director"` | `opencode.json:3` | **ARQUITECTÓNICA** — define el punto de entrada del ecosistema |
| 2 | `description: "Capa superior..."` | `opencode.json:7` | **HISTÓRICA** — lenguaje del diseño original donde SDL se agregó sobre AEL. La arquitectura actual (Dual Interface) no requiere "superior". |
| 3 | `task: { "*": "deny", "ael": "allow" }` | `opencode.json:16-18` | **ARQUITECTÓNICA** — SDL no puede ejecutar sin delegar. Es el mecanismo de transición PLAN→BUILD. |
| 4 | SDL prompt: "capa superior" | `strategic-director.md:16` | **HISTÓRICA** — mismo origen que #2 |
| 5 | SDL prompt: refs a "ael" | `strategic-director.md:31,37,46,50` | **FUNCIONAL** — SDL necesita referirse a su contraparte de ejecución |
| 6 | SDL prompt: prohíbe reemplazar subagentes | `strategic-director.md:25-26` | **ARQUITECTÓNICA** — enforce SD-I2 (no invocar subagentes directamente) |
| 7 | SDL prompt: formato Execution Plan | `strategic-director.md:39-51` | **ARQUITECTÓNICA** — contrato PLAN→BUILD |
| 8 | SDL prompt: bloque de cierre | `strategic-director.md:66-90` | **ARQUITECTÓNICA** — contrato MISSION_CLOSURE |
| 9 | AEL prompt: "recibir un Execution Plan del SDL" | `ael.md:28` | **FUNCIONAL** — describe el modo de operación normal |
| 10 | AEL prompt: R4 "No redefinir objetivos del EP" | `ael.md:66` | **ARQUITECTÓNICA** — enforce MP-02 y MP-06 |
| 11 | AEL prompt: R5 "No generar nuevo EP estratégico" | `ael.md:67` | **ARQUITECTÓNICA** — enforce MP-02 |
| 12 | AEL prompt: subagentes `@ael-design` vs `ael-architect` | `ael.md:50-57` | **ACCIDENTAL** (H-01) — nombres no coinciden con IDs en opencode.json |
| 13 | `instructions: ["ael/AGENTS.md"]` | `opencode.json:4` | **ACCIDENTAL** — archivo no existe (R-02 pre-existing) |
| 14 | AEL prompt: "TaxiGuazú" | `ael.md:24` | **HISTÓRICA** — nombre anterior del proyecto |

**Resumen:**

| Tipo | Cantidad |
|------|----------|
| Arquitectónica | 7 |
| Funcional | 2 |
| Histórica | 3 |
| Accidental | 2 |

---

## 6. V-04: SDL ↔ AEL dependency analysis

### SDL → AEL

| Evidencia | Tipo de dependencia |
|-----------|-------------------|
| SDL no puede editar archivos (`edit: deny`) | Funcional |
| SDL no puede ejecutar comandos (`bash: deny`) | Funcional |
| SDL solo puede delegar en AEL (`task: { "*": "deny", "ael": "allow" }`) | Funcional |
| SDL prompt produce Execution Plans para AEL | Contractual |
| SDL prompt referencia "resultados entregados por el arnés (ael)" | Contractual |

**¿SDL depende de AEL?** ✅ **SÍ, funcionalmente.** SDL no puede ejecutar nada sin AEL. Todo plan del SDL requiere AEL para materializarse.

### AEL → SDL

| Evidencia | Tipo de dependencia |
|-----------|-------------------|
| AEL prompt: "recibir un Execution Plan del SDL" | Contractual |
| AEL R4: "No redefinir objetivos del EP" | Contractual |
| AEL R5: "No generar nuevo EP estratégico" | Contractual |
| AEL puede editar (`edit: ask`) y ejecutar (`bash: ask`) | ✅ Autonomía funcional |
| AEL tiene 6 subagentes propios | ✅ Autonomía funcional |

**¿AEL depende de SDL?** ✅ **SÍ, contractualmente, pero NO funcionalmente.** Si el usuario selecciona AEL directamente (sin pasar por SDL), AEL puede ejecutar tareas operacionales sin un Execution Plan. La dependencia es de diseño (el workflow espera un EP) pero no técnica (permisos permiten operación independiente).

### Asymmetrical dependency

```
SDL ──funcionalmente──► AEL
SDL ◄──contractualmente── AEL
```

SDL **necesita** a AEL para ejecutar. AEL **prefiere** recibir un EP de SDL pero puede operar sin él.

---

## 7. V-05: Can opencode.json be reorganized?

### Respuesta: SÍ, parcialmente.

La estructura actual ya refleja en gran medida la arquitectura de doble interfaz:
- Ambos agentes son `mode: primary` ✅
- SDL tiene permisos restrictivos (solo planifica) ✅
- AEL tiene permisos operacionales ✅
- Subagentes son `mode: subagent` ✅

### Lo que NO refleja la arquitectura actual

| Elemento actual | Arquitectura dual esperada |
|----------------|---------------------------|
| SDL description: "Capa superior..." | Descripción neutral: "Strategic Director — planificación estratégica del ecosistema AITOS" |
| `default_agent: "strategic-director"` | Puede mantenerse (define el flujo principal, DI-06) |
| Orden de agentes en JSON: SDL primero, AEL segundo | Orden que refleje agrupación por capa |
| Sin separación visual entre capas | Comentarios o estructura que distinga ecosistema de plataforma |

### Limitación de OpenCode

OpenCode JSON no soporta comentarios (solo JSONC). No hay forma de agrupar visualmente agentes por capa sin usar comentarios o un esquema de naming.

---

## 8. V-06: Historical debt in configuration

| ID | Deuda | Archivo | Línea | Severidad |
|----|-------|---------|-------|-----------|
| **R-02** | `instructions: ["ael/AGENTS.md"]` — archivo no existe | `opencode.json` | 4 | 🟡 Media |
| **H-01** | `ael.md` capabilities table usa `@ael-design`, `@ael-implement`, `@ael-validate`, `@ael-remember`, `@ael-learn` — pero IDs reales son `ael-architect`, `ael-implementer`, `ael-audit`, `ael-memory`, `ael-learning` | `ael.md` | 50-57 | 🟡 Media |
| **H-NEW-1** | SDL description: "Capa superior" — lenguaje jerárquico pre-dual-interface | `opencode.json` | 7 | 🟢 Baja |
| **H-NEW-2** | SDL description en markdown: "Capa superior" — mismo origen | `strategic-director.md` | 2 | 🟢 Baja |
| **H-NEW-3** | SDL prompt: "capa superior" — mismo origen | `strategic-director.md` | 16 | 🟢 Baja |
| **H-NEW-4** | AEL prompt: "TaxiGuazú" — nombre histórico del proyecto | `ael.md` | 24 | 🟢 Baja |

**Deuda crítica:** 0
**Deuda media:** 2 (R-02, H-01 — pre-existentes, documentadas en SDL_CONTRACT_CERTIFICATION)
**Deuda menor:** 4 (descripciones y nombres históricos)

---

## 9. V-07: Evaluation

| Dimensión | Evaluación | Evidencia |
|-----------|-----------|-----------|
| **Claridad conceptual** | 🟡 Media | `default_agent` y descripción "Capa superior" crean ambigüedad. Un lector nuevo interpretaría SDL > AEL (jerarquía), no SDL \|\| AEL (interfaces paralelas). |
| **Mantenibilidad** | 🟢 Alta | JSON simple, 131 líneas, 8 agentes bien definidos, sin anidamiento complejo. |
| **Portabilidad** | 🟢 Alta | Solo usa features estándar de OpenCode (agent, mode, permission, task, model). Sin extensiones propietarias. |
| **Independencia de OpenCode** | 🟡 Media | `default_agent: "strategic-director"` acopla el flujo a SDL. Si OpenCode cambiara la semántica de `default_agent`, el comportamiento cambiaría. Sin embargo, es un acoplamiento intencional y documentado (DI-06). |

### Scoring

| Dimensión | Puntaje | Justificación |
|-----------|---------|---------------|
| Claridad conceptual | 6/10 | Lenguaje jerárquico ("Capa superior") contradice el modelo de interfaces paralelas |
| Mantenibilidad | 9/10 | Estructura limpia, 131 líneas, sin duplicación |
| Portabilidad | 9/10 | Solo features estándar de OpenCode |
| Independencia | 7/10 | `default_agent` crea acoplamiento direccional |

---

## 10. V-08: Proposed refactoring (no implementar)

### Cambios mínimos

Los siguientes cambios son cosméticos/de documentación. No alteran el comportamiento funcional.

#### 1. SDL description (opencode.json)

Línea 7 actual:
```json
"description": "Strategic Director — Capa superior responsable de analizar, evaluar, planificar y recomendar escalamiento"
```

Propuesta:
```json
"description": "Strategic Director — planificación estratégica del ecosistema AITOS. Produce Execution Plans y delega ejecución a AEL."
```

#### 2. SDL description (strategic-director.md)

Línea 2 actual:
```yaml
description: Strategic Director — Capa superior responsable de analizar, evaluar, planificar y recomendar escalamiento
```

Propuesta:
```yaml
description: Strategic Director — planificación estratégica del ecosistema AITOS. Produce Execution Plans y delega ejecución a AEL.
```

#### 3. SDL prompt (strategic-director.md)

Línea 16 actual:
```
Eres el Strategic Director de AITOS. Tu rol es actuar como una capa superior de análisis estratégico y planificación para el proyecto.
```

Propuesta:
```
Eres el Strategic Director de AITOS. Tu rol es la planificación estratégica: analizar, evaluar y recomendar cursos de acción para el ecosistema de desarrollo.
```

#### 4. `instructions` fix (opencode.json)

Línea 4 actual:
```json
"instructions": ["ael/AGENTS.md"]
```

Propuesta:
```json
"instructions": []
```

O, si se necesita instrucciones, crear el archivo referenciado.

#### 5. AEL prompt name fix (ael.md)

Línea 24 actual:
```
Eres el Director del ARNÉS (Agent Execution Layer) de TaxiGuazú.
```

Propuesta:
```
Eres el Director del ARNÉS (Agent Execution Layer) de AITOS.
```

#### 6. Subagent name alignment (ael.md)

Tabla líneas 50-57: alinear nombres de subagentes con IDs reales en opencode.json.

| Capability actual | Subagente actual | ID real en opencode.json |
|------------------|-----------------|-------------------------|
| Architecture | `@ael-design` | `ael-architect` |
| Implementation | `@ael-implement` | `ael-implementer` |
| Validation | `@ael-validate` | `ael-audit` |
| Memory | `@ael-remember` | `ael-memory` |
| Learning | `@ael-learn` | `ael-learning` |

### Lo que NO debe cambiar

- `default_agent: "strategic-director"` — es la entrada del flujo principal (DI-06)
- `task: { "*": "deny", "ael": "allow" }` — es el mecanismo de transición PLAN→BUILD
- Permisos de SDL (`edit: deny`, `bash: deny`) — enforce SD-I1
- Permisos de AEL (`edit: ask`, `bash: ask`, 6 subagentes) — rol operacional
- Cualquier contrato, invariante o prompt funcional

### Impacto

| Aspecto | Impacto |
|---------|---------|
| Comportamiento | 0 — cambios solo cosméticos/de documentación |
| Contratos | 0 — inalterados |
| Dispatch | 0 — IDs de agente inalterados |
| Permisos | 0 — inalterados |
| Subagentes | 0 — inalterados |

---

## 11. Summary of findings

| Hallazgo | Severidad | Naturaleza | Documentado previamente |
|----------|-----------|-----------|----------------------|
| `instructions: ["ael/AGENTS.md"]` no existe | 🟡 Media | Accidental | ✅ R-02 (SDL_CONTRACT_CERTIFICATION) |
| Nombres de subagentes inconsistentes (ael.md) | 🟡 Media | Accidental | ✅ H-01 (PR-VERIFY-SDL) |
| SDL description "Capa superior" | 🟢 Baja | Histórica | ❌ Nuevo (H-NEW-1) |
| SDL prompt "capa superior" | 🟢 Baja | Histórica | ❌ Nuevo (H-NEW-3) |
| AEL prompt "TaxiGuazú" | 🟢 Baja | Histórica | ❌ Nuevo (H-NEW-4) |

---

## 12. Veredicto final

```
╔══════════════════════════════════════════════════════════════════════╗
║        OPENCODE CONFIGURATION ARCHITECTURE AUDIT — ✅ COMPLETADO    ║
║                                                                      ║
║  ¿Representa opencode.json la arquitectura final o la histórica?    ║
║                                                                      ║
║  Modelo representado: SDL → AEL (jerarquía funcional)               ║
║  Modelo arquitectónico: SDL || AEL (interfaces paralelas)           ║
║                                                                      ║
║  Diferencia: el lenguaje ("Capa superior") y el flujo               ║
║  (default_agent + task exclusivo) crean una apariencia jerárquica   ║
║  que la arquitectura dual no prescribe.                              ║
║                                                                      ║
║  ✓ SDL depende FUNCIONALMENTE de AEL (no puede ejecutar sin él)    ║
║  ✓ AEL depende CONTRACTUALMENTE de SDL (puede operar sin él)       ║
║  ✓ La dependencia es asimétrica y corresponde al contrato PLAN→BUILD║
║  ✓ 0 deuda crítica                                                   ║
║  ✓ 2 deuda media (R-02, H-01 — pre-existentes)                     ║
║  ✓ 4 deuda menor (descripciones históricas)                         ║
║  ✓ Refactorización posible sin alterar comportamiento               ║
║                                                                      ║
║  Conclusión: La configuración ES predominantemente fiel a la        ║
║  arquitectura actual. Las diferencias son de lenguaje, no de        ║
║  estructura. El Architecture Freeze v1.0 está correctamente         ║
║  reflejado en permisos, modos y contratos.                          ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

*Este documento audita la fidelidad de `opencode.json` respecto de la arquitectura actual de doble interfaz. No modifica ningún archivo del sistema.*
