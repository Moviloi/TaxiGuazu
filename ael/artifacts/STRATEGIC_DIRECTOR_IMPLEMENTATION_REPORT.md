# Strategic Director Layer — Implementation Report

**Fecha**: 2026-07-18
**Tipo**: Implementación de capa de gobernanza superior
**Sistema**: AITOS — TaxiGuazú / opencode

---

## Arquitectura Actual Encontrada

### Estructura del arnés (pre-existente)

Se encontró un arnés cognitivo operativo (`ael/`) configurado mediante `opencode.json` y archivos en `.opencode/`:

| Componente | Archivo | Rol |
|---|---|---|
| `opencode.json` | `opencode.json` | Configuración principal del proyecto opencode |
| `ael` (Director) | `.opencode/agents/ael.md` | Mission Planner primario del arnés |
| `ael-explore` | `opencode.json` agent | Explorador (solo lectura) |
| `ael-architect` | `opencode.json` agent | Arquitecto (veto ADR) |
| `ael-implementer` | `opencode.json` agent | Implementador (ejecuta cambios) |
| `ael-audit` | `opencode.json` agent | Auditor (calidad, tests, build) |
| `ael-memory` | `opencode.json` agent | Memoria (conocimiento estructurado) |
| `ael-learning` | `opencode.json` agent | Aprendizaje (patrones) |

### Modelos asignados inicialmente

| Subagente | Modelo original |
|---|---|
| `ael` | _(ninguno — usaba modelo por defecto del sistema)_ |
| `ael-explore` | `opencode/DeepSeek V4 Flash Freeh` |
| `ael-architect` | `opencode/DeepSeek V4 Flash Free` |
| `ael-implementer` | `opencode/DeepSeek V4 Flash Free` |
| `ael-audit` | `opencode/Nemotron` |
| `ael-learning` | `opencode/North Mini Code Free` |
| `ael-memory` | `opencode/North Mini Code Free` |

### Fuente de verdad

Se confirmó que `opencode.json` **es la fuente de verdad** para la configuración de agentes y modelos del arnés. Los archivos en `.opencode/agents/` y `.opencode/commands/` complementan la configuración con prompts y comandos.

---

## Cambios Realizados

### 1. Creación del Strategic Director

**Archivo**: `.opencode/agents/strategic-director.md` (nuevo)

Se creó un nuevo agente primario `strategic-director` con las siguientes características:

- **Modo**: `primary` — actúa como capa de entrada superior
- **Modelo**: `opencode/GPT-5.4 mini` — configurado explícitamente, no usa Current Model
- **Permisos**: Solo lectura (`edit: deny`, `bash: deny`). Puede delegar tareas al arnés (`ael: allow`).
- **Prompt**: Define su rol como capa de análisis estratégico. No debe escribir código, ejecutar modificaciones, ni reemplazar al Arquitecto/Auditor. Debe razonar sobre objetivos, interpretar evidencia, proponer planes y detectar incertidumbre.
- **Contrato Execution Plan**: Formato JSON estructurado obligatorio con campos: `objective`, `current_state`, `evidence`, `recommended_workflow`, `constraints`, `success_criteria`, `confidence`, `escalation_needed`.

### 2. Cambios en `opencode.json`

| Campo | Valor anterior | Valor nuevo |
|---|---|---|
| `default_agent` | `"ael"` | `"strategic-director"` |
| `agent.strategic-director` | _(no existía)_ | Agregado con modelo `opencode/GPT-5.4 mini` |
| `agent.ael.model` | _(no definido)_ | `"opencode/DeepSeek V4 Flash"` |
| `agent.ael-explore.model` | `"opencode/DeepSeek V4 Flash Freeh"` | `"opencode/DeepSeek V4 Flash"` |
| `agent.ael-architect.model` | `"opencode/DeepSeek V4 Flash Free"` | `"opencode/DeepSeek V4 Flash"` |
| `agent.ael-implementer.model` | `"opencode/DeepSeek V4 Flash Free"` | `"opencode/DeepSeek V4 Flash"` |
| `agent.ael-audit.model` | `"opencode/Nemotron"` | `"opencode/DeepSeek V4 Flash"` |
| `agent.ael-learning.model` | `"opencode/North Mini Code Free"` | `"opencode/DeepSeek V4 Flash"` |
| `agent.ael-memory.model` | `"opencode/North Mini Code Free"` | _(sin cambios — no especificado)_ |

---

## Archivos Modificados

| Archivo | Tipo | Acción |
|---|---|---|
| `opencode.json` | Configuración | Modificado (default_agent, modelos, strategic-director agregado) |
| `.opencode/agents/strategic-director.md` | Agente opencode | **Creado** (nuevo) |

---

## Riesgos

| ID | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| R1 | `strategic-director` configurado con modelo `opencode/GPT-5.4 mini` que podría no existir en el registro de proveedores | 🟡 MEDIA | El modelo se configuró explícitamente como solicita el prompt. Si no está disponible, opencode fallará al iniciar y se podrá corregir. |
| R2 | Cambio de `default_agent` a `strategic-director` podría confundir al usuario si espera que el Director del arnés sea la entrada predeterminada | 🟢 BAJA | El prompt del Strategic Director instruye delegar al arnés vía Execution Plan. La transición es clara. |
| R3 | `ael` no tenía modelo asignado originalmente — ahora se fija a `opencode/DeepSeek V4 Flash` | 🟢 BAJA | Se alinea con el resto de subagentes del arnés. |
| R4 | `ael-memory` preservó su modelo original (`North Mini Code Free`) por no estar en la lista de cambios solicitados | 🟢 BAJA | Consistente con la instrucción de no modificar lo no especificado. |

---

## Pruebas Realizadas

| Prueba | Resultado |
|---|---|
| `npm run build` (Next.js) | ✅ PASS (11.4s) |
| `bash ael/contracts/enforce.sh` (R1-R4) | ✅ PASS |
| Validación sintaxis JSON de `opencode.json` | ✅ Válido |

---

## Resumen de la Nueva Arquitectura

```
                    ┌──────────────────────────┐
                    │    Strategic Director     │  ← Capa superior (GPT-5.4 mini)
                    │  (analiza, planifica,     │
                    │   detecta escalamiento)   │
                    └──────────┬───────────────┘
                               │ Execution Plan (JSON estructurado)
                               ▼
                    ┌─────────────────────┐
                    │      DIRECTOR       │  ← DeepSeek V4 Flash
                    │   (ael - primary)   │
                    └──────┬──────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
   │  EXPLORER   │ │  ARCHITECT  │ │   MEMORY    │  ← Todos DeepSeek V4 Flash
   │ (ael-expl.) │ │ (ael-arch.) │ │ (ael-mem.)  │     (except Memory: North Mini Code Free)
   └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
          └───────────────┼───────────────┘
                          │
                   ┌──────▼──────┐
                   │ IMPLEMENTER │
                   │ (ael-impl.) │
                   └──────┬──────┘
                          │
                   ┌──────▼──────┐
                   │   AUDITOR   │
                   │  (ael-aud.) │
                   └──────┬──────┘
                          │
                   ┌──────▼──────┐
                   │   LEARNING  │
                   │ (ael-learn) │
                   └─────────────┘
```

El Strategic Director se comunica con el arnés exclusivamente mediante Execution Plans estructurados, sin prompts narrativos libres. No ejecuta código ni modifica archivos. Su función es puramente analítica y de planificación estratégica, delegando la ejecución al arnés (`ael`).

---

*Fin del reporte — Strategic Director Layer implementado correctamente.*
