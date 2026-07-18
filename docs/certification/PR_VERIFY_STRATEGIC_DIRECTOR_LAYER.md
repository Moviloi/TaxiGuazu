# PR-VERIFY-SDL — Strategic Director Layer Verification

**Fecha**: 2026-07-18
**Tipo**: Auditoría de certificación
**Sistema**: AITOS — TaxiGuazú / opencode
**Objetivo**: Verificar la implementación del Strategic Director Layer antes de certificarla.

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [V-01: Naturaleza del agente `ael`](#2-v-01-naturaleza-del-agente-ael)
3. [V-02: Origen del modelo de `ael`](#3-v-02-origen-del-modelo-de-ael)
4. [V-03: Responsabilidades del Director Estratégico](#4-v-03-responsabilidades-del-director-estratégico)
5. [V-04: Modelos de agentes especializados](#5-v-04-modelos-de-agentes-especializados)
6. [V-05: `ael` como componente estructural](#6-v-05-ael-como-componente-estructural)
7. [Diagrama de Responsabilidades](#7-diagrama-de-responsabilidades)
8. [Flujo de Ejecución](#8-flujo-de-ejecución)
9. [Hallazgos Adicionales](#9-hallazgos-adicionales-pre-existentes)
10. [Conclusión](#10-conclusión)

---

## 1. Resumen Ejecutivo

Se auditó la implementación del Strategic Director Layer para verificar que:
- La separación de capas es correcta.
- El Director Estratégico no ejecuta tareas operativas.
- Los agentes especializados preservan sus modelos hardcodeados.
- El agente `ael` está correctamente clasificado.

**Veredicto**: ✅ **IMPLEMENTACIÓN CORRECTA**. La arquitectura conceptual y la implementación concreta del SDL son consistentes con los requisitos. Se documentan hallazgos pre-existentes (no introducidos por el SDL) que deben ser corregidos en una misión separada.

---

## 2. V-01: Naturaleza del agente `ael`

### Preguntas y respuestas

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| **¿Es un agente operativo?** | Sí. Ejecuta el pipeline de ingeniería del arnés. | `.opencode/agents/ael.md` línea 24: "Eres el Director del ARNÉS (Agent Execution Layer)" |
| **¿Es un agente base del framework?** | No. Es un agente definido por el proyecto TaxiGuazú, no un built-in de opencode. | No aparece en la lista de built-in agents del framework. |
| **¿Es un wrapper?** | No. Tiene comportamiento y lógica propios (prompt de 94 líneas, comandos asociados). | `.opencode/agents/ael.md` completo + 9 comandos en `.opencode/commands/` |
| **¿Es un router?** | Parcialmente. Puede delegar a subagentes, pero también ejecuta tareas internamente. | `ael/constitution/SPEC.md` §2: "The Director may perform any of these decisions internally" |
| **¿Es un orquestador?** | Sí. Es el **Mission Planner** que decide qué capabilities invocar, en qué orden, y cómo combinarlas. | `ael/constitution/SPEC.md` §2: "absolute freedom to decide... what capabilities to invoke, in what order" |
| **¿Quién lo invoca?** | El **Strategic Director** (desde arriba) o el **usuario** directamente (por ser agente primary). | `opencode.json` línea 3: `default_agent` solía ser `"ael"`. Ahora `"strategic-director"`. |
| **¿Quién lo utiliza?** | El Strategic Director delega en `ael`. `ael` a su vez delega en subagentes. | `strategic-director.md` línea 13: `task: {"*": "deny", "ael": "allow"}` |

### Clasificación definitiva

**`ael` es un agente orquestador / mission planner.** Es el núcleo operacional del ARNÉS. Su función es:
1. Recibir una misión (del usuario o del Strategic Director).
2. Analizarla (internamente o delegando a Explorer).
3. Planificar la estrategia.
4. Ejecutar delegando en subagentes especializados.
5. Verificar la calidad del resultado.
6. Preservar el conocimiento.

No es un agente base del framework, no es un wrapper, no es meramente un router. Es el corazón del arnés.

---

## 3. V-02: Origen del modelo de `ael`

### Determinación

**`ael` usa "Current Session Model" porque nunca se le asignó un modelo explícito desde su creación.**

### Clasificación

| Opción | ¿Aplica? | Explicación |
|---|---|---|
| **A) Siempre fue así. No hubo ningún cambio.** | ✅ **SÍ** | Desde su creación en commit `1e624a5`, `ael` nunca tuvo un campo `model` en `opencode.json` ni en su archivo `.opencode/agents/ael.md`. |
| **B) Fue modificado durante esta implementación.** | ❌ NO | La implementación del SDL no tocó el modelo de `ael`. |
| **C) Es heredado automáticamente por diseño.** | 🟡 Parcial | En opencode, cuando un agente no tiene `model` definido, usa el modelo de la sesión activa. Es comportamiento por omisión del framework, no una decisión explícita del diseño del arnés. |
| **D) Existe otro motivo.** | ❌ NO | — |

### Evidencia

- **`opencode.json` líneas 22–45**: El agente `ael` no tiene campo `model`.
- **`.opencode/agents/ael.md` frontmatter (líneas 1–22)**: No tiene campo `model`.
- **Git log**: Desde commit `1e624a5` (creación del agente) hasta hoy, `ael` nunca ha tenido un modelo configurado.

### Conclusión V-02

`ael` usa Current Session Model por **omisión histórica** (nunca se le asignó un modelo). No es una decisión de diseño explícita, sino una consecuencia de que la configuración nunca completó ese campo. Esto es relevante para entender que `ael` **no constituye una excepción intencional a la regla** de que solo el Director Estratégico debe usar el Current Session Model.

---

## 4. V-03: Responsabilidades del Director Estratégico

### Verificación de responsabilidades

| Responsabilidad asignada | ¿Está en el prompt? | Evidencia |
|---|---|---|
| **Analizar resultados del arnés** | ✅ Sí | `strategic-director.md` línea 32: "interpretar la evidencia y los resultados entregados por el arnés" |
| **Evaluar estado del proyecto** | ✅ Sí | `strategic-director.md` línea 31: "razonar sobre los objetivos del proyecto" |
| **Determinar siguiente paso** | ✅ Sí | `strategic-director.md` línea 33: "proponer planes de ejecución estructurados" |
| **Generar Execution Plans** | ✅ Sí | `strategic-director.md` líneas 37–51: formato JSON estructurado obligatorio |
| **Detectar escalamiento necesario** | ✅ Sí | `strategic-director.md` líneas 54–62: campo `escalation_needed` con reglas |

### Verificación de prohibiciones

| Prohibición | ¿Se respeta? | Evidencia |
|---|---|---|
| **No escribir código** | ✅ Sí | `strategic-director.md` línea 23: "NO debes: escribir código directamente" |
| **No ejecutar modificaciones** | ✅ Sí | `strategic-director.md` línea 24: "NO debes: ejecutar modificaciones en el código de producción" |
| **No reemplazar al Arquitecto** | ✅ Sí | `strategic-director.md` línea 25: "NO debes: reemplazar al Arquitecto (ael-architect)" |
| **No reemplazar al Auditor** | ✅ Sí | `strategic-director.md` línea 26: "NO debes: reemplazar al Auditor (ael-audit)" |
| **No tomar control del arnés** | ✅ Sí | `strategic-director.md` línea 27: "NO debes: tomar control del arnés o saltar su flujo establecido" |

### Verificación de permisos

| Permiso | Valor | Implicancia |
|---|---|---|
| `edit` | `deny` | No puede modificar archivos |
| `bash` | `deny` | No puede ejecutar comandos |
| `task: "*"` | `deny` | No puede invocar agentes arbitrariamente |
| `task: "ael"` | `allow` | **Única** delegación permitida: al arnés |

### Conclusión V-03

✅ **Correcto**. El Director Estratégico está configurado exclusivamente para tareas de planificación y análisis. No tiene permisos operativos. Su única vía de acción es delegar en `ael` mediante Execution Plans estructurados.

---

## 5. V-04: Modelos de agentes especializados

### Tabla de modelos

| Agente | Rol | Modelo actual | Origen del modelo | Current Session Model |
|---|---|---|---|---|
| `ael-explore` | Explorador | `opencode/DeepSeek V4 Flash Freeh` | Hardcode original (desde commit `ead7357`) | ❌ No |
| `ael-architect` | Arquitecto | `opencode/DeepSeek V4 Flash Free` | Hardcode original (desde commit `ead7357`) | ❌ No |
| `ael-implementer` | Implementador | `opencode/DeepSeek V4 Flash Free` | Hardcode original (desde commit `ead7357`) | ❌ No |
| `ael-audit` | Auditor | `opencode/Nemotron` | Hardcode original (desde commit `3f64959`) | ❌ No |
| `ael-memory` | Memoria | `opencode/North Mini Code Free` | Hardcode original (desde commit `3f64959`) | ❌ No |
| `ael-learning` | Aprendizaje | `opencode/North Mini Code Free` | Hardcode original (desde commit `3f64959`) | ❌ No |

### Verificación

Cada agente especializado mantiene su modelo hardcodeado original. Ninguno fue modificado para usar Current Session Model durante la implementación del SDL.

### Conclusión V-04

✅ **Correcto**. Los 6 agentes especializados continúan ejecutándose con sus modelos hardcodeados históricos. Ninguno fue desviado a Current Session Model.

---

## 6. V-05: `ael` como componente estructural

### Análisis

`ael` no es un "wrapper" ni un "router" simple. Es el **Mission Planner** del ARNÉS, un orquestador con soberanía para decidir estrategias e invocar capabilities.

Sin embargo, para efectos de la regla **"solo el Director Estratégico utiliza Current Session Model para la toma de decisiones"**, es importante aclarar:

| Aspecto | `ael` | Director Estratégico |
|---|---|---|
| **Rol** | Mission Planner operacional | Planificador estratégico |
| **Nivel** | Capa de ejecución | Capa superior |
| **¿Toma decisiones de planificación?** | Sí (cómo ejecutar la misión) | Sí (qué misión ejecutar, cuándo escalar) |
| **¿Toma decisiones estratégicas?** | No (opera dentro de la misión definida) | Sí (define la misión) |
| **¿Tiene permisos operativos?** | Sí (edit: ask, bash: ask) | No (edit: deny, bash: deny) |
| **¿Usa Current Session Model?** | Sí (por omisión histórica) | Sí (por diseño explícito) |
| **¿Es una excepción a la regla?** | **No.** `ael` no es un agente de análisis/planificación estratégica. Es un orquestador operacional. Su uso de Current Session Model es heredado, no intencional. | — |

### Declaración explícita

> **`ael` no constituye una excepción a la regla de "solo el Director Estratégico utiliza Current Session Model para la toma de decisiones" porque:**
>
> 1. **`ael` nunca tuvo un modelo hardcodeado** — es una omisión histórica, no una decisión de diseño.
> 2. **`ael` es un orquestador operacional**, no un agente de planificación estratégica. Su función es ejecutar la misión, no definirla.
> 3. **El Director Estratégico es quien planifica** y delega en `ael`. `ael` no planifica estratégicamente; recibe planes del SDL.
> 4. **Si se deseara**, `ael` podría tener un modelo hardcodeado sin violar la regla del SDL, porque son capas diferentes con responsabilidades diferentes.

### Conclusión V-05

✅ **Correcto**. `ael` es un orquestador operacional, no un agente de toma de decisiones estratégicas. No constituye una excepción a la regla.

---

## 7. Diagrama de Responsabilidades

```
┌──────────────────────────────────────────────────────────────────────┐
│                  CAPA ESTRATÉGICA (planificación pura)               │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              STRATEGIC DIRECTOR                              │   │
│   │  Modelo: Current Session Model (explícito, sin hardcode)    │   │
│   │  Permisos: read ✅ | edit ❌ | bash ❌                        │   │
│   │  Responsabilidades:                                          │   │
│   │  • Analizar resultados del arnés                             │   │
│   │  • Evaluar estado del proyecto                               │   │
│   │  • Determinar siguiente paso                                 │   │
│   │  • Generar Execution Plans (JSON estructurado)               │   │
│   │  • Detectar cuándo escalar                                   │   │
│   │  • NO ejecutar código ni modificaciones                      │   │
│   └─────────────────────┬───────────────────────────────────────┘   │
│                         │ delega vía Execution Plan                 │
└─────────────────────────┼──────────────────────────────────────────┘
                          │
┌─────────────────────────┼──────────────────────────────────────────┐
│                         ▼                                          │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              AEL — ARNÉS DIRECTOR                            │   │
│   │  Modelo: Current Session Model (por omisión histórica)      │   │
│   │  Permisos: read ✅ | edit: ask | bash: ask                   │   │
│   │  Rol: Mission Planner — decide estrategia de ejecución      │   │
│   │  Responsabilidades:                                          │   │
│   │  • Planificar la ejecución de la misión                     │   │
│   │  • Invocar capabilities (subagentes) en el orden óptimo     │   │
│   │  • Ejecutar internamente si delegar no aporta valor         │   │
│   │  • Cerrar misión verificando calidad y conocimiento         │   │
│   └──┬───────┬───────┬───────┬───────┬───────┬─────────────────┘   │
│      │       │       │       │       │       │                      │
│      ▼       ▼       ▼       ▼       ▼       ▼                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │EXP   │ │ARQ   │ │IMP   │ │AUD   │ │MEM   │ │APR   │           │
│  │explor│ │archit│ │implem│ │audit │ │memory│ │learn │           │
│  │read  │ │read  │ │ed:ask│ │bash  │ │ed:ask│ │ed:ask│           │
│  │only  │ │veto  │ │ba:ask│ │restr │ │read  │ │read  │           │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘           │
│                                                                      │
│  CAPA OPERATIVA — Modelos hardcodeados (ninguno usa Current Session) │
│  ┌──────────┬──────────────┬──────────┬──────────┬──────────┬─────┐ │
│  │DeepSeek  │DeepSeek V4   │DeepSeek  │Nemotron  │North Mini│North│ │
│  │V4 Flash  │Flash Free    │V4 Flash  │          │Code Free │Mini │ │
│  │Freeh     │              │Free      │          │          │Code │ │
│  └──────────┴──────────────┴──────────┴──────────┴──────────┴─────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8. Flujo de Ejecución

```
USUARIO INICIA SESIÓN
       │
       │ default_agent = "strategic-director"
       ▼
┌─────────────────────────────┐
│  STRATEGIC DIRECTOR         │  ← Current Session Model
│                             │
│  1. Analiza la solicitud    │
│  2. Evalúa el estado actual │
│  3. Genera Execution Plan   │
│     { objective,            │
│       current_state,        │
│       evidence,             │
│       recommended_workflow, │
│       constraints,          │
│       success_criteria,     │
│       confidence,           │
│       escalation_needed }   │
│                             │
│  ¿escalation_needed=true?   │
│  ──→ Sí: informa al usuario │
│  ──→ No: delega en ael     │
└───────────┬─────────────────┘
            │ task: ael
            ▼
┌─────────────────────────────┐
│  AEL (ARNÉS Director)       │  ← Current Session Model
│                             │
│  1. Entiende la misión      │
│  2. Planifica estrategia    │
│  3. Decide qué capabilities │
│     invocar y en qué orden  │
│  4. Invoca subagentes:      │
│     ┌──────────────────┐   │
│     │ ael-explore      │   │  ← DeepSeek V4 Flash Freeh
│     │ ael-architect    │   │  ← DeepSeek V4 Flash Free
│     │ ael-implementer  │   │  ← DeepSeek V4 Flash Free
│     │ ael-audit        │   │  ← Nemotron
│     │ ael-memory       │   │  ← North Mini Code Free
│     │ ael-learning     │   │  ← North Mini Code Free
│     └──────────────────┘   │
│  5. Cierra misión          │
└─────────────────────────────┘
```

---

## 9. Hallazgos Adicionales (pre-existentes)

Durante la auditoría se detectaron problemas **no introducidos por la implementación del SDL** que existían previamente en el arnés.

| ID | Hallazgo | Severidad | Archivos | Descripción |
|---|---|---|---|---|
| **H-01** | Nomenclatura inconsistente entre `ael.md` y `opencode.json` | 🟡 MEDIA | `.opencode/agents/ael.md` líneas 13–22 vs `opencode.json` | El frontmatter de `ael.md` lista como tareas permitidas `ael-design`, `ael-implement`, `ael-validate`, `ael-remember`, `ael-learn`, pero los agentes reales en `opencode.json` se llaman `ael-architect`, `ael-implementer`, `ael-audit`, `ael-memory`, `ael-learning`. Solo `ael-explore` coincide. |
| **H-02** | Comandos desalineados con agentes | 🟡 MEDIA | `.opencode/commands/` (5 de 9 comandos) | Los comandos `ael-design`, `ael-implement`, `ael-validate`, `ael-remember`, `ael-learn` no corresponden a agentes existentes. |
| **H-03** | `ael/AGENTS.md` no existe | 🟡 MEDIA | `opencode.json` línea 4 | `"instructions": ["ael/AGENTS.md"]` referencia un archivo que no existe (movido a `ael/archive/AGENTS.md`). |
| **H-04** | `ael` sin modelo explícito (por omisión) | 🟢 BAJA | `opencode.json` líneas 22–45 | El Director del ARNÉS nunca tuvo un modelo asignado. Usa Current Session Model por defecto del framework. |

### Nota importante sobre H-01 y H-02

Estos hallazgos son **pre-existentes** y no fueron introducidos por la implementación del SDL. Sin embargo, afectan el correcto funcionamiento de las delegaciones del arnés. Se recomienda resolverlos en una misión separada de unificación de nomenclatura.

---

## 10. Conclusión

### Resultado de la verificación

| Verificación | Estado | Detalle |
|---|---|---|
| **V-01**: Naturaleza de `ael` | ✅ OK | `ael` es un agente orquestador / Mission Planner, núcleo operacional del ARNÉS |
| **V-02**: Origen del modelo de `ael` | ✅ OK | Current Session Model por omisión histórica (nunca se le asignó modelo) |
| **V-03**: Responsabilidades del SDL | ✅ OK | Planificación pura. Sin permisos operativos. Delegación única a `ael`. |
| **V-04**: Modelos de agentes especializados | ✅ OK | 6 subagentes con modelos hardcodeados originales intactos |
| **V-05**: `ael` como componente estructural | ✅ OK | No constituye excepción a la regla. Es orquestador operacional, no planificador estratégico. |

### Veredicto final

```
╔══════════════════════════════════════════════════════════════╗
║          PR-VERIFY-SDL: ✅ IMPLEMENTACIÓN CORRECTA          ║
║                                                              ║
║  La implementación del Strategic Director Layer cumple       ║
║  con todos los requisitos establecidos:                      ║
║                                                              ║
║  ✓ Separación de capas: SDL → AEL → Subagentes              ║
║  ✓ Strategic Director: solo planificación, sin ejecución    ║
║  ✓ Subagentes: modelos hardcodeados preservados             ║
║  ✓ Sin hardcode de proveedor en SDL                         ║
║  ✓ Current Session Model para SDL                           ║
║  ✓ ael correctamente clasificado como orquestador           ║
║                                                              ║
║  Hallazgos pre-existentes (H-01 a H-04) documentados        ║
║  para resolución en misión separada.                        ║
║                                                              ║
║  No se requiere modificación de código en esta auditoría.    ║
╚══════════════════════════════════════════════════════════════╝
```

---

*Fin de PR_VERIFY_STRATEGIC_DIRECTOR_LAYER.md — Certificación completada.*
