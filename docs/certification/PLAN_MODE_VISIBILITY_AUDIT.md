# PLAN Mode vs Strategic Director — Visibility Audit

> Auditoría de visibilidad: por qué PLAN, BUILD y Strategic Director aparecen simultáneamente en el selector de OpenCode.

---

## 1. Estado actual

Luego de PR-HARNESS-ALIGNMENT-2 (AEL convertido a subagente), OpenCode presenta en su selector de modos:

```
[PLAN] [BUILD] [Strategic Director]
```

La percepción es que PLAN y Strategic Director son duplicados conceptuales. Esta auditoría determina el origen de cada entrada y su relación arquitectónica.

---

## 2. Cómo OpenCode construye el selector

OpenCode tiene dos fuentes de agentes visibles en el selector de modos:

### Fuente 1: Agentes nativos (built-in)

OpenCode incluye agentes nativos que existen en toda instalación. Los relevantes son:

| Agente | `mode` | ¿Visible en selector? |
|--------|--------|----------------------|
| `build` | `primary` | Sí — etiquetado como **BUILD** |
| `plan` | `primary` | Sí — etiquetado como **PLAN** |
| `general` | `subagent` | No |
| `explore` | `subagent` | No |
| `scout` | `subagent` | No |
| `compaction` | `primary` | No (oculto, uso interno) |
| `title` | `primary` | No (oculto, uso interno) |
| `summary` | `primary` | No (oculto, uso interno) |

**PLAN** y **BUILD** son agentes nativos de OpenCode. No están definidos en `opencode.json`. OpenCode los muestra por defecto.

### Fuente 2: Agentes personalizados (custom)

Todo agente definido en `opencode.json` con `mode: "primary"` aparece en el selector. Actualmente, nuestro único agente primario personalizado es `strategic-director`.

| Agente | `mode` | Fuente | ¿Visible en selector? |
|--------|--------|--------|----------------------|
| `plan` | `primary` | OpenCode nativo | Sí — "PLAN" |
| `build` | `primary` | OpenCode nativo | Sí — "BUILD" |
| `strategic-director` | `primary` | `opencode.json` | Sí — "Strategic Director" |
| `ael` | `subagent` | `opencode.json` | No |
| 6 subagentes `ael-*` | `subagent` | `opencode.json` | No |

---

## 3. Origen de PLAN

**PLAN es un agente nativo de OpenCode** (built-in). No está definido en nuestro `opencode.json`. OpenCode lo incluye por defecto.

Según la documentación de OpenCode:

> *"Build is the **default** primary agent with all tools enabled."*
> *"A restricted agent designed for planning and analysis. We use a permission system to give you more control... all of the following are set to `ask`: file edits, bash."*

El agente nativo `plan` usa permisos `ask` (preguntar antes de ejecutar), no `deny`. Es un modo genérico de planificación — no conoce nuestra arquitectura PLAN → BUILD ni tiene acceso a nuestros contratos.

---

## 4. Origen de Strategic Director

**Strategic Director es un agente personalizado** definido en `opencode.json` con `mode: "primary"` y `default_agent`. 

Su modo visible se origina de:

| Condición | Valor |
|-----------|-------|
| Definido en | `opencode.json` sección `agent.strategic-director` |
| `mode` | `"primary"` |
| `default_agent` | `"strategic-director"` |
| Permisos | `edit: deny`, `bash: deny` (más restrictivo que el nativo `plan`) |
| Prompt personalizado | 92 líneas con Execution Plan, Recommendation, contratos |

---

## 5. Arquitectura real

```
OpenCode: agent/plan (native)     OpenCode: agent/build (native)
   PLAN mode                          BUILD mode
   (generic analysis)                 (generic execution)
        │                                  │
        └──────────┬───────────────────────┘
                   │
        Strategic Director (custom primary agent)
                   │
        Planifica, produce Execution Plan, delega
                   │
              task { "ael": "allow" }
                   │
                   ▼
              AEL (subagent)
                   │
        6 subagentes (ael-explore, ael-architect, ...)
```

---

## 6. Arquitectura visible

Lo que el usuario ve en el selector:

```
┌─────────────────────────────────────┐
│  [PLAN]  [BUILD]  [Strategic Dir]   │  ← 3 modos seleccionables
└─────────────────────────────────────┘
     ↑         ↑            ↑
   Nativo    Nativo      Custom
   OpenCode  OpenCode    primary agent
```

Lo que el usuario experimenta al seleccionar cada modo:

| Modo | Experiencia |
|------|------------|
| **PLAN** | OpenCode genérico — análisis sin restricciones de la arquitectura AITOS. Permisos `ask` (pregunta antes de editar/ejecutar). Sin prompt personalizado. |
| **BUILD** | OpenCode genérico — ejecución con todas las herramientas. Sin prompt personalizado. Sin delegación a AEL. |
| **Strategic Director** | Nuestro agente — planificación estratégica con Execution Plan, Recommendation, contratos PLAN → BUILD, delegación a AEL, bloque de cierre obligatorio. |

---

## 7. Riesgos

| # | Riesgo | Evaluación |
|---|--------|-----------|
| R1 | Usuario elige PLAN nativo esperando comportamiento de SDL | 🟡 Medio — el modo nativo PLAN no tiene Execution Plan ni contrato BUILD. El usuario obtendría análisis genérico, no la arquitectura certificada. |
| R2 | Usuario elige BUILD nativo esperando AEL | 🟡 Medio — BUILD nativo no delega a AEL ni ejecuta el contrato BUILD. El usuario obtendría ejecución genérica sin las capabilities del AEL. |
| R3 | Percepción de duplicación PLAN ↔ SDL | 🟢 Bajo — no es duplicación real. Son dos agentes con diferentes niveles de especialización. |
| R4 | Confusión sobre cuál modo usar | 🟢 Bajo — mitigado por `default_agent: "strategic-director"`. El usuario siempre empieza en SDL. |

---

## 8. Opciones posibles

### Opción A: Aceptar el estado actual (RECOMENDADA)

**Descripción:** Mantener PLAN, BUILD y Strategic Director visibles. El `default_agent` arranca en Strategic Director.

**Fundamento:**
- OpenCode siempre mostrará PLAN y BUILD — son agentes nativos. No podemos eliminarlos sin modificar el harnés.
- Strategic Director es nuestro agente personalizado que implementa los contratos arquitectónicos.
- No existe duplicación real — PLAN y Strategic Director son agentes diferentes con diferentes prompts, permisos y contratos.
- El usuario siempre inicia en Strategic Director (default), por lo que la experiencia principal es PLAN → BUILD → AEL.

**Impacto:** 0 cambios. Sin regresiones. Sin modificar la configuración existente.

### Opción B: Reemplazar Strategic Director sobre el agente nativo `plan`

**Descripción:** Configurar `opencode.json` para sobrescribir el agente nativo `plan` con nuestro prompt y permisos, y usar `plan` como `default_agent`.

```json
{
  "default_agent": "plan",
  "agent": {
    "plan": {
      "description": "Strategic Director — planificación estratégica del ecosistema AITOS",
      "mode": "primary",
      "permission": {
        "edit": "deny",
        "bash": "deny",
        "task": { "*": "deny", "ael": "allow" }
      },
      "prompt": "{file:.opencode/agents/strategic-director.md}"
    }
  }
}
```

**Ventajas:** Unifica PLAN y SDL en un solo modo visible. El selector muestra solo PLAN y BUILD.

**Riesgos:**
- El agente nativo `plan` no puede deshabilitarse completamente (OpenCode lo necesita internamente).
- Sobrescribir `plan` puede tener efectos secundarios no anticipados en el comportamiento del harnés.
- `plan` es referenciado internamente por OpenCode para funcionalidades como compactación, títulos y resúmenes.
- No hay documentación de OpenCode que garantice que sobrescribir `plan` sea seguro.
- Dependencia de implementación interna de OpenCode — podría romperse en actualizaciones.

### Opción C: Agregar descripciones aclaratorias

**Descripción:** Mantener todo igual pero mejorar la descripción de Strategic Director para que el usuario entienda su rol.

```json
"strategic-director": {
  "description": "PLAN estratégico AITOS — produce Execution Plans, delega BUILD a AEL. Modo principal del ecosistema."
}
```

**Ventajas:** Reduce confusión sin cambios arquitectónicos. Sin riesgo de regresiones.

**Riesgos:** Mínimos. Solo mejora la UX.

---

## 9. Recomendación arquitectónica

**Opción A + Opción C — Aceptar y clarificar.**

### Fundamento

1. **OpenCode SIEMPRE mostrará PLAN y BUILD.** Son agentes nativos que no pueden eliminarse sin modificar el harnés. Intentar ocultarlos o reemplazarlos crea dependencias frágiles con la implementación interna de OpenCode.

2. **No existe duplicación real.** PLAN (nativo) es un planificador genérico con permisos `ask`. Strategic Director es nuestro planificador específico con permisos `deny`, contratos arquitectónicos, formato de Execution Plan, delegación a AEL y bloque de cierre obligatorio. Son agentes diferentes con diferentes responsabilidades.

3. **El usuario siempre empieza en Strategic Director.** `default_agent` garantiza que la experiencia principal sea la arquitectura PLAN → BUILD → AEL. Los modos nativos PLAN y BUILD son opcionales para quien quiera análisis genérico.

4. **Luchar contra el harnés es contraproducente.** OpenCode expone PLAN y BUILD por diseño. Intentar ocultarlos o reemplazarlos sería luchar contra el funcionamiento interno de OpenCode, creando fragilidad y posibles regresiones en actualizaciones.

### Acción recomendada

Mejorar la descripción de Strategic Director en `opencode.json` para clarificar su rol como "PLAN estratégico AITOS — planificación con Execution Plans, delegación BUILD a AEL". Esto reduce la confusión sin modificar la arquitectura ni el comportamiento del harnés.

---

## 10. Veredicto final

| Pregunta | Respuesta | Evidencia |
|----------|-----------|-----------|
| ¿Quién genera PLAN? | OpenCode nativo (built-in agent `plan`) | Documentación OpenCode: "Plan is a restricted agent designed for planning and analysis" |
| ¿Quién genera Strategic Director? | `opencode.json` define `strategic-director` con `mode: "primary"` | `opencode.json` líneas 6-21 |
| ¿Existe realmente duplicación? | **NO.** Son dos agentes diferentes: PLAN (nativo, permisos `ask`, sin contratos) vs SDL (custom, permisos `deny`, con contratos PLAN→BUILD, Execution Plan, cierre obligatorio, delega a AEL) | Análisis de `strategic-director.md` (92 líneas, Execution Plan, contratos) vs documentación de OpenCode sobre `plan` nativo |
| ¿Puede eliminarse sin romper el ecosistema? | **NO.** Eliminar Strategic Director como primary rompe: `default_agent`, los contratos PLAN→BUILD, la delegación a AEL, el formato de Execution Plan, y las prohibiciones específicas (`edit: deny`, `bash: deny` más restrictivos que el `ask` nativo). | Análisis de dependencias en §5-6 |
| ¿Coincide la arquitectura certificada con OpenCode? | Sí. La arquitectura certificada (PLAN → SDL → BUILD → AEL) existe dentro del agente `strategic-director` como `default_agent`. Los modos nativos PLAN y BUILD coexisten sin interferir. OpenCode no distingue entre modos nativos y personalizados en el selector — ambos aparecen. | `opencode.json` actual + documentación OpenCode |

**Veredicto final:** Aceptar la coexistencia de PLAN (nativo), BUILD (nativo) y Strategic Director (custom). No existe duplicación funcional. El `default_agent: "strategic-director"` garantiza que la experiencia principal sea la arquitectura certificada.

---

*Auditoría completada el 2026-07-19. Sin modificaciones al código. Sin cambios arquitectónicos.*
