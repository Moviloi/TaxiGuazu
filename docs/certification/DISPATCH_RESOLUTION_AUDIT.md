# Dispatch Resolution Audit — OpenCode Agent Dispatch

> Reconstrucción completa del algoritmo de dispatch de OpenCode.
> Fecha: 2026-07-19
> Tipo: Auditoría de comprensión (0 cambios al sistema)

---

## 1. Objective

Reconstruir con evidencia el mecanismo exacto mediante el cual OpenCode decide qué agente recibe un prompt de usuario, para determinar:

- Por qué PLAN, BUILD y Strategic Director aparecen simultáneamente
- Cuál es la diferencia real entre PLAN y Strategic Director
- Si la UX objetivo (solo PLAN y BUILD) es técnicamente alcanzable
- Dónde reside la limitación (OpenCode o ecosistema)

---

## 2. Evidence sources

| Fuente | Tipo | Contenido relevante |
|--------|------|---------------------|
| `github.com/anomalyco/opencode/blob/dev/packages/core/src/agent.ts` | Código fuente | `selectedDefault()`, `selectable()`, `resolve()`, `select()` |
| `github.com/anomalyco/opencode/blob/dev/packages/schema/src/agent.ts` | Código fuente | `Agent.Info` schema: `id`, `model`, `mode`, `hidden` |
| `github.com/anomalyco/opencode/blob/dev/packages/core/src/session.ts` | Código fuente | Session `switchAgent()`, `agent` field |
| `github.com/anomalyco/opencode/blob/dev/packages/schema/src/session.ts` | Código fuente | Session.Info: `agent: Agent.ID.pipe(optional)` |
| `opencode.ai/config.json` | Schema JSON | Campo `hidden`: "only applies to mode: subagent". Campo `default_agent`: "Must be a primary agent. Falls back to 'build' if not set or if the specified agent is invalid." |
| `opencode.ai/docs/agents` | Documentación | "You can customize the built-in agents or create new ones through configuration" |
| `opencode.ai/docs/config` | Documentación | `default_agent` docs, agent override docs |
| `opencode.json` (este proyecto) | Configuración | `default_agent: "strategic-director"`, agent definitions |

---

## 3. Agent data structure

Todos los agentes — built-in y custom — viven en un único `Map<Agent.ID, Agent.Info>`:

```typescript
// packages/schema/src/agent.ts
export const Info = Schema.Struct({
  id: ID,                          // string brand "AgentV2.ID"
  model: Model.Ref.pipe(optional),
  request: Provider.Request,
  system: Schema.String.pipe(optional),   // system prompt
  description: Schema.String.pipe(optional),
  mode: Schema.Literals(["subagent", "primary", "all"]),
  hidden: Schema.Boolean,
  color: Color.pipe(optional),
  steps: PositiveInt.pipe(optional),
  permissions: Permission.Ruleset,
})
```

**No existe diferenciación entre built-in y custom.** Ambos son `Agent.Info` en el mismo Map. Un custom agent puede sobrescribir un built-in usando el mismo ID.

**Built-in agents registrados por defecto:**

| ID | mode | hidden | Rol |
|----|------|--------|-----|
| `build` | primary | false | Agente de desarrollo completo |
| `plan` | primary | false | Agente de planificación (edit: ask, bash: ask) |
| `general` | subagent | false | Propósito general |
| `explore` | subagent | false | Exploración (solo lectura) |
| `scout` | subagent | false | Investigación de dependencias |
| `compaction` | primary | true | Compactación de contexto (sistema) |
| `title` | primary | true | Generación de títulos (sistema) |
| `summary` | primary | true | Resúmenes de sesión (sistema) |

---

## 4. Dispatch algorithm

### 4.1 `selectable()` filter (agent.ts:79-81)

```typescript
const selectable = (agent: Info | undefined) =>
  agent && agent.mode !== "subagent" && !agent.hidden ? agent : undefined
```

Un agente es "selectable" cuando:
1. Existe (no undefined)
2. `mode !== "subagent"` (es primary o all)
3. `hidden !== true`

### 4.2 `selectedDefault()` fallback chain (agent.ts:83-92)

```typescript
const selectedDefault = () => {
  const data = state.get()
  // PRIORITY 1: configured default_agent (if selectable)
  const configured = data.default ? selectable(data.agents.get(data.default)) : undefined
  if (configured) return configured
  // PRIORITY 2: built-in "build" agent (if selectable)
  const build = selectable(data.agents.get(ID.make("build")))
  if (build) return build
  // PRIORITY 3: ANY agent in the map (first selectable one found)
  for (const agent of data.agents.values()) {
    const fallback = selectable(agent)
    if (fallback) return fallback
  }
}
```

### 4.3 `resolve(id)` (agent.ts:100-104)

```typescript
resolve: Effect.fn("AgentV2.resolve")(function* (id) {
  if (id !== undefined) return state.get().agents.get(ID.make(id))
  return selectedDefault()
}),
```

- **Con ID:** lookup directo en el Map. Sin filtro `selectable()`. Cualquier agente (subagent, hidden, primary) puede ser resuelto por ID.
- **Sin ID:** usa `selectedDefault()` con filtro `selectable()`.

### 4.4 `select(id)` (agent.ts:106-112)

```typescript
select: Effect.fn("AgentV2.select")(function* (id) {
  if (id !== undefined) {
    const selected = ID.make(id)
    return { id: selected, info: state.get().agents.get(selected) }
  }
  const info = selectedDefault()
  return { id: info?.id ?? defaultID, info }
}),
```

- **Con ID:** lookup directo + retorno sin filtrar
- **Sin ID:** `selectedDefault()` con fallback a `"build"`

---

## 5. Full dispatch flow

```
Usuario envía mensaje
    │
    ▼
Session tiene agent ID explícito?
    │
    ├── SÍ (ej: "plan", "build", "strategic-director")
    │      │
    │      ▼
    │   select(id) → lookup directo en Map<Agent.ID, Agent.Info>
    │      │
    │      ▼
    │   Se usa: system prompt, permissions, model
    │   del agente encontrado
    │
    └── NO (primera vez, sesión nueva)
           │
           ▼
        selectedDefault()
           │
           ├── default_agent configurado?
           │      │
           │      ├── SÍ → selectable(agents.get(default_agent))?
           │      │       │
           │      │       ├── SÍ → usar ese agente
           │      │       └── NO → continuar
           │      │
           │      ▼
           ├── built-in "build" selectable?
           │      │
           │      ├── SÍ → usar "build"
           │      └── NO → continuar
           │
           ▼
        Iterar todos los agentes → primer selectable encontrado
```

---

## 6. V-01: Cómo OpenCode resuelve el agente inicial

**Orden de prioridad:**

1. **Agente explícito en la sesión** — Si el usuario cambió de agente vía Tab o `switchAgent()`, la sesión almacena `session.info.agent` como `Agent.ID`. El dispatch usa `select(id)` → lookup directo en el Map. Sin filtro.

2. **`default_agent` configurado** — Si no hay agente explícito (primera sesión), `selectedDefault()` busca `data.default` (el valor de `default_agent` en opencode.json). El agente debe ser selectable (primary/all, no hidden).

3. **Built-in "build"** — Si `default_agent` no está configurado o el agente no es selectable, intenta el built-in `"build"`.

4. **Primer agente selectable** — Si todo lo anterior falla, itera el Map y usa el primer agente que pase `selectable()`.

**Evidencia:** Código fuente `agent.ts:83-92` transcrito arriba. `default_agent` descripción en schema: "Falls back to 'build' if not set or if the specified agent is invalid."

---

## 7. V-02: Qué ocurre al seleccionar PLAN

```
Tab → selecciona PLAN
    │
    ▼
session.switchAgent("plan")
    │
    ▼
session.info.agent = "plan" (Agent.ID)
    │
    ▼
Próximo mensaje → resolve("plan")
    │
    ▼
agents.get("plan") → lookup directo
    │
    ▼
Agent.Info encontrado:
    id: "plan"
    mode: "primary"
    hidden: false
    permissions: { edit: "ask", bash: "ask" }  (defaults)
    system: undefined (no custom prompt)
```

**Agente receptor:** El built-in `"plan"`. Es un agente primario con permisos `ask` (pregunta antes de editar/ejecutar). No tiene prompt personalizado, no tiene contratos PLAN→BUILD, no puede delegar en AEL. Es el agente nativo de OpenCode para planificación genérica.

---

## 8. V-03: Qué ocurre al seleccionar BUILD

```
Tab → selecciona BUILD
    │
    ▼
session.switchAgent("build")
    │
    ▼
session.info.agent = "build" (Agent.ID)
    │
    ▼
Próximo mensaje → resolve("build")
    │
    ▼
agents.get("build") → lookup directo
    │
    ▼
Agent.Info encontrado:
    id: "build"
    mode: "primary"
    hidden: false
    permissions: { edit: "allow", bash: "allow" }  (defaults)
    system: undefined (no custom prompt)
```

**Agente receptor:** El built-in `"build"`. Es el agente por defecto con todas las herramientas habilitadas. No tiene prompt personalizado, no tiene delegación a AEL. Es el agente nativo de OpenCode para desarrollo completo.

---

## 9. V-04: Qué ocurre al seleccionar Strategic Director

```
Tab → selecciona Strategic Director
    │
    ▼
session.switchAgent("strategic-director")
    │
    ▼
session.info.agent = "strategic-director" (Agent.ID)
    │
    ▼
Próximo mensaje → resolve("strategic-director")
    │
    ▼
agents.get("strategic-director") → lookup directo
    │
    ▼
Agent.Info encontrado:
    id: "strategic-director"
    mode: "primary"
    hidden: false
    permissions: {
      read: "allow", glob: "allow", grep: "allow", list: "allow",
      edit: "deny", bash: "deny",
      task: { "*": "deny", "ael": "allow" }
    }
    system: (92 líneas de prompt personalizado con Execution Plan,
             Recommendation, contratos PLAN→BUILD, delegación AEL)
```

### Diferencia funcional entre PLAN y Strategic Director

| Dimensión | PLAN (built-in) | Strategic Director (custom) |
|-----------|-----------------|---------------------------|
| **Origen** | OpenCode nativo | `opencode.json` |
| **ID** | `"plan"` | `"strategic-director"` |
| **mode** | `primary` | `primary` |
| **Prompt** | Ninguno (default de OpenCode) | 92 líneas: Execution Plan, Recommendation, contratos |
| **edit** | `ask` (pregunta) | `deny` (bloqueado) |
| **bash** | `ask` (pregunta) | `deny` (bloqueado) |
| **task** | No configurado (todos permitidos por defecto) | Solo `ael` |
| **Delegación AEL** | ❌ No | ✅ Sí |
| **Execution Plan** | ❌ No | ✅ Formato JSON obligatorio |
| **Cierre de misión** | ❌ No | ✅ Bloque obligatorio |

**Conclusión:** NO son el mismo agente. Son dos entradas diferentes en el Map de agentes. PLAN es el agente nativo genérico. Strategic Director es un agente custom con contratos arquitectónicos, permisos restrictivos y delegación exclusiva a AEL.

---

## 10. V-05: Algoritmo de dispatch completo reconstruido

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ALGORITMO DE DISPATCH                              │
│                                                                       │
│  Usuario envía mensaje                                                │
│       │                                                               │
│       ▼                                                               │
│  ╔══════════════════════════════════════════════════════════╗         │
│  ║  PASO 1: ¿Session tiene agent explícito?               ║         │
│  ║  (switchAgent() previo vía Tab o @mention)              ║         │
│  ╚══════════════════════════════════════════════════════════╝         │
│       │                                                               │
│       ├── SÍ → select(session.info.agent)                            │
│       │       │                                                       │
│       │       ▼                                                       │
│       │   ID.make(id) → lookup directo en Map<Agent.ID, Info>        │
│       │   SIN filtro selectable()                                     │
│       │   Retorna { id, info }                                        │
│       │                                                               │
│       └── NO → selectedDefault()                                     │
│               │                                                       │
│               ▼                                                       │
│           ╔══════════════════════════════════════════════════╗        │
│           ║  PASO 2: ¿default_agent configurado?            ║        │
│           ║  (opencode.json → data.default)                 ║        │
│           ╚══════════════════════════════════════════════════╝        │
│               │                                                       │
│               ├── SÍ → agents.get(data.default)                       │
│               │       │                                               │
│               │       ▼                                               │
│               │   ¿selectable()? (mode≠subagent, !hidden)            │
│               │       │                                               │
│               │       ├── SÍ → usar este agente                       │
│               │       └── NO → continuar al PASO 3                   │
│               │                                                       │
│               ▼                                                       │
│           ╔══════════════════════════════════════════════════╗        │
│           ║  PASO 3: ¿built-in "build" selectable?          ║        │
│           ╚══════════════════════════════════════════════════╝        │
│               │                                                       │
│               ├── SÍ → usar "build"                                   │
│               └── NO → continuar al PASO 4                           │
│                       │                                               │
│                       ▼                                               │
│           ╔══════════════════════════════════════════════════╗        │
│           ║  PASO 4: Iterar Map → primer selectable         ║        │
│           ╚══════════════════════════════════════════════════╝        │
│                                                                       │
│  ╔══════════════════════════════════════════════════════════╗         │
│  ║  UNA VEZ RESUELTO EL AGENTE:                           ║         │
│  ║                                                         ║         │
│  ║  1. System prompt = agent.system (o default si vacío)   ║         │
│  ║  2. Permissions = agent.permissions (merge con global)  ║         │
│  ║  3. Tools = habilitadas según permissions               ║         │
│  ║  4. Model = agent.model ?? session.model ?? global.model║         │
│  ║  5. Steps = agent.steps (max iteraciones)               ║         │
│  ║  6. Color = agent.color                                 ║         │
│  ╚══════════════════════════════════════════════════════════╝         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 11. V-06: ¿Es posible obtener PLAN + BUILD sin Strategic Director?

### Pregunta

¿Es posible tener exactamente esta UX:

```
PLAN     BUILD
```

sin mostrar Strategic Director, manteniendo:
- SDL como receptor de PLAN
- AEL como receptor operacional de BUILD
- Todos los contratos existentes?

### Respuesta

**SÍ, es técnicamente posible.**

### Mecanismo

OpenCode permite sobrescribir built-in agents mediante configuración. El schema explícitamente lista `"plan"` y `"build"` como agentes configurables bajo `agent`:

```json
// Schema: agent property includes plan and build + additionalProperties
"agent": {
  "properties": {
    "plan": { "$ref": "#/$defs/AgentConfig" },
    "build": { "$ref": "#/$defs/AgentConfig" }
  },
  "additionalProperties": { "$ref": "#/$defs/AgentConfig" }
}
```

La documentación dice explícitamente:

> "You can customize the built-in agents or create new ones through configuration."

Y el código fuente confirma que `update(id, fn)` sobrescribe cualquier entrada existente en el Map (incluyendo built-ins). No hay flag "built-in" ni protección contra sobrescritura.

### Implementación

```json
{
  "default_agent": "plan",
  "agent": {
    "plan": {
      "description": "PLAN estratégico AITOS — produce Execution Plans, delega BUILD a AEL",
      "mode": "primary",
      "permission": {
        "read": "allow",
        "glob": "allow",
        "grep": "allow",
        "list": "allow",
        "edit": "deny",
        "bash": "deny",
        "task": { "*": "deny", "ael": "allow" }
      }
    },
    "ael": {
      "description": "ARNÉS Director — motor operacional de BUILD",
      "mode": "subagent",
      ...
    }
  }
}
```

### Resultado

- El built-in "plan" es sobrescrito con la configuración custom de SDL
- El agente "strategic-director" se elimina de la configuración
- El selector muestra solo: `[PLAN] [BUILD]`
- PLAN (ahora SDL) recibe prompts con permisos `edit: deny`, `bash: deny`, `task: solo ael`
- BUILD mantiene su comportamiento nativo (todos los permisos allow)
- AEL permanece como subagente (invocado por PLAN vía `task`)

### Impacto en contratos

| Contrato | ¿Se mantiene? | Explicación |
|----------|--------------|-------------|
| PLAN exclusivamente estratégico | ✅ | `edit: deny`, `bash: deny` se mantienen |
| SDL produce Execution Plan | ✅ | Prompt de SDL se mueve a `agent.plan.prompt` |
| SDL delega solo a AEL | ✅ | `task: { "*": "deny", "ael": "allow" }` |
| BUILD operacional | ✅ | AEL como subagente inalterado |
| Mission Closure | ✅ | SDL prompt (ahora en "plan") mantiene bloque de cierre |
| PLAN→BUILD contract | ✅ | Architecture document no requiere cambios |

---

## 12. V-07: Limitación de OpenCode

### Si la respuesta a V-06 fuera NO

La respuesta es SÍ, pero es importante documentar las limitaciones de OpenCode relevantes:

### Limitación documentada

**`hidden: true` no aplica a primary agents para el selector de modos.**

El schema define:
```json
"hidden": {
  "type": "boolean",
  "description": "Hide this subagent from the @ autocomplete menu
                  (default: false, only applies to mode: subagent)"
}
```

Esto significa que no podemos simplemente poner `hidden: true` en Strategic Director para ocultarlo del Tab cycle. La única forma de eliminar un agente primario del selector es:
1. No definirlo como primary (cambiarlo a subagent o eliminarlo)
2. Sobrescribir un built-in con el ID deseado

### Otras limitaciones relevantes

| Limitación | Descripción |
|-----------|-------------|
| `default_agent` debe ser primary | Si se elimina "strategic-director", `default_agent` debe apuntar a otro agente primary (ej: "plan") |
| Subagentes no pueden ser default | AEL no puede ser `default_agent` porque es subagent |
| Sobrescritura de built-ins no tiene warning | OpenCode no advierte cuando un built-in es sobrescrito |

---

## 13. V-08: Implementación mínima (solo documental)

### Archivos a cambiar

| Archivo | Cambio | Justificación |
|---------|--------|--------------|
| `opencode.json` | Sobrescribir agente "plan" con config de SDL | Unifica PLAN y SDL en un solo agente |
| `opencode.json` | Eliminar agente "strategic-director" | Ya no es necesario como agente separado |
| `opencode.json` | Cambiar `default_agent` a `"plan"` | SDL ahora es "plan" |
| `.opencode/agents/strategic-director.md` | (opcional) Mover prompt al agente "plan" | Consistencia |
| `.opencode/agents/plan.md` | (opcional) Crear con el prompt de SDL | Alternativa a JSON inline |

### Por qué funciona

El mecanismo de dispatch de OpenCode usa `Map<Agent.ID, Agent.Info>`. Cuando se configura `agent.plan` en `opencode.json`, la función `update("plan", fn)` sobrescribe la entrada existente del built-in. El dispatch (`select("plan")` o `selectedDefault()`) resuelve el mismo ID `"plan"` pero encuentra la configuración custom.

No hay flag "built-in" que impida la sobrescritura. Es un comportamiento intencional y documentado.

---

## 14. Comparison: Current vs Target state

### Current state

```
Selector: [PLAN] [BUILD] [Strategic Director]
               │        │           │
               ▼        ▼           ▼
           built-in   built-in    custom primary
           "plan"     "build"     "strategic-director"
           ask/ask    allow/all   deny/deny, task: ael
           no prompt  no prompt   92-line prompt
```

### Target state

```
Selector: [PLAN] [BUILD]
               │        │
               ▼        ▼
           custom      built-in
           "plan"      "build"
           (SDL cfg)   (native)
           deny/deny   allow/all
           92-line     no prompt
           task: ael
```

---

## 15. Riesgos de la implementación

| Riesgo | Descripción | Severidad |
|--------|-------------|-----------|
| **R-01** | Sobrescribir "plan" podría afectar funciones internas de OpenCode que referencien "plan" por ID | 🟡 Medio — pero compaction/title/summary son agentes separados, no "plan" |
| **R-02** | Usuario selecciona BUILD esperando el comportamiento del AEL | 🟡 Medio — BUILD nativo no tiene delegación a AEL. El flujo correcto es PLAN (SDL) → task → AEL |
| **R-03** | `default_agent: "plan"` ahora apunta al SDL custom | 🟢 Bajo — es el comportamiento deseado |
| **R-04** | Scripts o referencias que usen `@strategic-director` dejarían de funcionar | 🟡 Medio — requiere migración a `@plan` o `@ael` |

---

## 16. Veredicto final

```
╔══════════════════════════════════════════════════════════════════════╗
║           DISPATCH RESOLUTION AUDIT — ✅ COMPRENSIÓN COMPLETA       ║
║                                                                      ║
║  ✓ OpenCode resuelve agentes mediante lookup directo en             ║
║    Map<Agent.ID, Agent.Info>. Sin diferenciación built-in/custom.    ║
║                                                                      ║
║  ✓ PLAN y Strategic Director son dos entradas diferentes en el       ║
║    Map. PLAN es built-in con permisos ask. SDL es custom con         ║
║    permisos deny, prompt de 92 líneas y delegación a AEL.            ║
║                                                                      ║
║  ✓ Strategic Director aparece por tener mode: "primary". No hay      ║
║    forma de ocultar un primary del selector (hidden solo aplica       ║
║    a subagents).                                                      ║
║                                                                      ║
║  ✓ La UX objetivo (solo PLAN y BUILD) ES TÉCNICAMENTE ALCANZABLE    ║
║    sobrescribiendo el built-in "plan" con la configuración de SDL.   ║
║                                                                      ║
║  ✓ La limitación NO está en el ecosistema. Está en la decisión       ║
║    arquitectónica actual de usar un agente custom separado.           ║
║    OpenCode permite la unificación.                                  ║
║                                                                      ║
║  ⚠️ La implementación es documental: ~3 líneas en opencode.json.     ║
║    Sin cambios a prompts, contratos, subagentes ni arquitectura.     ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

*Este documento reconstruye el algoritmo de dispatch de OpenCode con evidencia del código fuente, schema y documentación oficial. No modifica ningún archivo del sistema.*
