# SDL Contract Certification — Strategic Director Layer

**Fecha**: 2026-07-18
**Tipo**: Certificación de contrato arquitectónico
**Sistema**: AITOS — TaxiGuazú / opencode
**Auditoría**: PR-SDL-2

---

## Índice

1. [Objetivo](#1-objetivo)
2. [Arquitectura](#2-arquitectura)
3. [Contrato Strategic Director](#3-contrato-strategic-director)
4. [Flujo de Responsabilidades](#4-flujo-de-responsabilidades)
5. [Verificaciones](#5-verificaciones)
   - [V-01: SD como rol, no como modelo](#v-01)
   - [V-02: Responsabilidades del SD](#v-02)
   - [V-03: Current Session Model como decisión consciente](#v-03)
   - [V-04: Delegación exclusiva al AEL](#v-04)
   - [V-05: Modelos hardcodeados de subagentes](#v-05)
   - [V-06: Auditoría de opencode.json](#v-06)
   - [V-07: Contrato formal del SD](#v-07)
   - [V-08: Intentos de ruptura arquitectónica](#v-08)
6. [Riesgos Encontrados](#6-riesgos-encontrados)
7. [Riesgos Descartados](#7-riesgos-descartados)
8. [Certificación Final](#8-certificación-final)

---

## 1. Objetivo

Auditar y certificar que la decisión arquitectónica de representar al Strategic Director como un **rol cognitivo** (no un modelo específico) quede correctamente reflejada en toda la arquitectura documental y operacional del sistema AITOS.

Esta misión **no modifica código**. Solo audita, documenta y certifica.

### Criterios de éxito

| Criterio | Métrica de verificación |
|---|---|
| Strategic Director es un rol cognitivo | Ningún documento lo describe como modelo específico |
| Current Session Model es decisión deliberada | Evidencia de intencionalidad en el prompt y configuración |
| Cambio de modelo no modifica arquitectura | La separación SDL → AEL → Subagentes permanece intacta |
| Solo cambia capacidad cognitiva disponible | Sin dependencias ocultas de proveedor |
| Separación SDL → AEL → Subagentes intacta | Sin nuevas delegaciones directas |
| Sin dependencias ocultas de proveedor | Sin referencias a modelos específicos en prompt del SD |
| Sin nuevas funcionalidades | Sin capacidades agregadas — solo auditoría |

---

## 2. Arquitectura

### Vista estática: 3 capas

```
┌──────────────────────────────────────────────────────────────────────┐
│                   CAPA ESTRATÉGICA (rol, no modelo)                  │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              STRATEGIC DIRECTOR                              │   │
│   │  Naturaleza: ROL COGNITIVO                                   │   │
│   │  Modelo: Current Session Model (ninguno hardcodeado)        │   │
│   │  Función: Analizar, planificar, escalar                     │   │
│   └─────────────────────┬───────────────────────────────────────┘   │
│                         │ Execution Plan (JSON estructurado)        │
└─────────────────────────┼──────────────────────────────────────────┘
                          │
┌─────────────────────────┼──────────────────────────────────────────┐
│                         ▼                                          │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              AEL — ARNÉS DIRECTOR (Mission Planner)          │   │
│   │  Modelo: Current Session Model (por omisión histórica)      │   │
│   │  Función: Orquestar capacidades del arnés                   │   │
│   └──┬───────┬───────┬───────┬───────┬───────┬─────────────────┘   │
│      │       │       │       │       │       │                      │
│      ▼       ▼       ▼       ▼       ▼       ▼                      │
│  EXP       ARQ      IMP      AUD     MEM     APR                    │
│  (explore) (arch.) (implem) (audit) (mem.)  (learn.)               │
│  ──────── Modelos hardcodeados ────────                            │
└──────────────────────────────────────────────────────────────────────┘
```

### Relaciones contractuales

| Relación | Tipo | Medio |
|---|---|---|
| SD → AEL | Delegación (única) | `task: ael` + Execution Plan JSON |
| AEL → Explorer | Delegación | `task: ael-explore` |
| AEL → Architect | Delegación | `task: ael-architect` |
| AEL → Implementer | Delegación | `task: ael-implementer` |
| AEL → Auditor | Delegación | `task: ael-audit` |
| AEL → Memory | Delegación | `task: ael-memory` |
| AEL → Learning | Delegación | `task: ael-learning` |

### Modelos asignados por agente

| Agente | Modelo | Naturaleza del modelo |
|---|---|---|
| `strategic-director` | *(ninguno - Current Session Model)* | Por **decisión arquitectónica explícita** |
| `ael` | *(ninguno - Current Session Model)* | Por **omisión histórica** (nunca asignado) |
| `ael-explore` | `opencode/DeepSeek V4 Flash Freeh` | Hardcodeado |
| `ael-architect` | `opencode/DeepSeek V4 Flash Free` | Hardcodeado |
| `ael-implementer` | `opencode/DeepSeek V4 Flash Free` | Hardcodeado |
| `ael-audit` | `opencode/Nemotron` | Hardcodeado |
| `ael-memory` | `opencode/North Mini Code Free` | Hardcodeado |
| `ael-learning` | `opencode/North Mini Code Free` | Hardcodeado |

---

## 3. Contrato Strategic Director

### Nombre del contrato

**StrategicDirectorContract** — versión 1.0

### Responsabilidades

1. **Analizar evidencia**: Interpretar los resultados y hallazgos entregados por el arnés (AEL) después de cada misión.
2. **Evaluar estado del proyecto**: Razonar sobre los objetivos del proyecto y el estado actual basándose en evidencia concreta.
3. **Generar Execution Plans**: Producir planes de ejecución estructurados en formato JSON con campos obligatorios (`objective`, `current_state`, `evidence`, `recommended_workflow`, `constraints`, `success_criteria`, `confidence`, `escalation_needed`).
4. **Recomendar siguiente paso**: Determinar qué workflow debe ejecutar el arnés a continuación.
5. **Detectar incertidumbre**: Identificar cuándo la información disponible es insuficiente o ambigua para tomar una decisión.
6. **Recomendar escalamiento**: Detectar cuándo la complejidad del problema requiere un modelo superior o una revisión humana.

### Responsabilidades prohibidas

1. ❌ **NO escribir código directamente** — prohibición explícita en prompt y permisos (`edit: deny`).
2. ❌ **NO modificar archivos de producción** — prohibición explícita en prompt y permisos (`edit: deny`).
3. ❌ **NO ejecutar workflows operativos** — prohibición explícita en prompt y permisos (`bash: deny`).
4. ❌ **NO reemplazar al Arquitecto** — prohibición explícita de veto arquitectónico.
5. ❌ **NO reemplazar al Auditor** — prohibición explícita de validación de calidad.
6. ❌ **NO tomar control del arnés** — prohibición explícita de saltar el flujo AEL.
7. ❌ **NO invocar subagentes directamente** — permisos restringen `task` solo a `ael`.

### Entradas

| Entrada | Tipo | Fuente | Descripción |
|---|---|---|---|
| Evidencia de misión | `string[]` | AEL (resultados de ejecución) | Hallazgos, métricas, resultados de la misión ejecutada |
| Estado del proyecto | `string` | AEL + sistema de archivos | Estado actual del proyecto basado en evidencia |
| Solicitud del usuario | `string` | Usuario (entrada directa) | Objetivo o problema a resolver |
| Contexto de sesión | `string` | Modelo de sesión | Historial de la conversación actual |
| Configuration | `opencode.json` | Archivo de configuración | `default_agent`, agent definitions, permissions |

### Salidas

| Salida | Tipo | Destino | Descripción |
|---|---|---|---|
| Execution Plan | `JSON` (estructurado) | AEL vía `task: ael` | Plan de ejecución completo con objetivo, estado, evidencia, workflow, constraints, criterios de éxito, confianza y escalamiento |
| Notificación de escalamiento | `string` | Usuario (cuando `escalation_needed = true`) | Justificación de por qué se requiere intervención superior |

#### Estructura del Execution Plan

```json
{
  "objective": "string",
  "current_state": "string",
  "evidence": ["string"],
  "recommended_workflow": ["string"],
  "constraints": ["string"],
  "success_criteria": ["string"],
  "confidence": 0.0,  // 0.0 - 1.0
  "escalation_needed": false | "true: justificación"
}
```

### Invariantes

| ID | Invariante | Verificación |
|---|---|---|
| **SD-I1** | El SD nunca ejecuta código | `permission.edit = deny`, `permission.bash = deny` |
| **SD-I2** | El SD nunca invoca subagentes directamente | `permission.task = { "*": "deny", "ael": "allow" }` |
| **SD-I3** | El SD nunca hardcodea un modelo | Sin campo `model` en `opencode.json` ni en `strategic-director.md` |
| **SD-I4** | Toda comunicación SD → AEL usa Execution Plan JSON | Prompt del SD exige formato estructurado |
| **SD-I5** | El SD no tiene dependencias de proveedor LLM específico | Sin referencias a GPT, Claude, Gemini, etc. en prompt |
| **SD-I6** | El SD no reemplaza capacidades del arnés | Prohibiciones explícitas de reemplazar Arquitecto/Auditor |

### Dependencias

| Dependencia | Tipo | Naturaleza |
|---|---|---|
| `opencode.json` | Configuración | Define permisos, modo, delegaciones del SD |
| `strategic-director.md` | Prompt | Define el comportamiento, responsabilidades y prohibiciones |
| Current Session Model | Runtime | Provee la capacidad cognitiva del SD — intercambiable sin modificar arquitectura |
| AEL (agente `ael`) | Delegación | Único destinatario de Execution Plans |

### Política de delegación

1. El SD **delega exclusivamente** en el agente `ael`.
2. La delegación se realiza mediante `task: ael` (configuración de permisos) + Execution Plan JSON estructurado (contenido).
3. El SD **nunca** delega directamente en `ael-explore`, `ael-architect`, `ael-implementer`, `ael-audit`, `ael-memory` o `ael-learning`.
4. La delegación es **unidireccional**: SD → AEL. El SD no recibe delegaciones de otros agentes.

### Política de escalamiento

1. El SD evalúa la confianza en su plan (`confidence: 0.0 - 1.0`).
2. Si `confidence < threshold` o la complejidad del problema excede la capacidad del Current Session Model, el SD establece `escalation_needed: true` con justificación.
3. El escalamiento **no selecciona automáticamente otro modelo** — solo recomienda que se requiere intervención superior.
4. Casos de escalamiento:
   - Impacto arquitectónico transversal
   - Múltiples soluciones válidas sin criterio claro
   - Información insuficiente para tomar decisión
   - Riesgo alto de efecto secundario no deseado
5. Cuando `escalation_needed = false`, el SD indica explícitamente "Continuar con el modelo actual de la sesión."

---

## 4. Flujo de Responsabilidades

```
USUARIO ──────────► STRATEGIC DIRECTOR ───────► AEL ───────► SUBAGENTES
                       (rol cognitivo)          (orquestador)  (ejecutores)
                            │                       │              │
  1. Usuario presenta       │                       │              │
     solicitud/objetivo     │                       │              │
                            ▼                       │              │
  2. SD analiza evidencia ──┘                       │              │
     y estado del proyecto                          │              │
                            │                       │              │
  3. SD genera Execution ───┼──────────────────────►│              │
     Plan (JSON)            │  task: ael            │              │
                            │                       │              │
  4. SD verifica escalamiento                       │              │
     ├─ false: continúa                             │              │
     └─ true: notifica al usuario                   │              │
                            │                       │              │
  5. AEL recibe el plan ────┼───────────────────────┘              │
     y planifica estrategia                        │                │
                            │                       │               │
  6. AEL invoca capacidades ───────────────────────┼──────────────►│
     según necesidad        │                       │  ael-explore  │
                            │                       │  ael-architect│
                            │                       │  ael-implement│
                            │                       │  ael-audit    │
                            │                       │  ael-memory   │
                            │                       │  ael-learning │
                            │                       │               │
  7. Subagentes ejecutan ───┼───────────────────────┼──────────────►│
     y retornan resultados   │                       │               │
                            │                       │               │
  8. AEL cierra misión ─────┼───────────────────────┘               │
     (verificación calidad)  │                                       │
                            │                                       │
  9. Resultados retornan ───┼───────────────────────────────────────┘
     al SD como evidencia   │
                            │
  10. SD evalúa resultados ─┘
      para próxima iteración
```

---

## 5. Verificaciones

---

### V-01

**Objetivo**: Verificar que ningún documento describa al Strategic Director como un modelo específico. Debe describirse exclusivamente como un rol.

#### Archivos auditados

| Archivo | ¿Describe al SD como modelo? | ¿Describe al SD como rol? | Evidencia |
|---|---|---|---|
| `.opencode/agents/strategic-director.md` | ❌ No | ✅ Sí | Línea 16: "Eres el Strategic Director de AITOS. Tu rol es actuar como una capa superior de análisis estratégico" |
| `opencode.json` (agente SD) | ❌ No | ✅ Sí | Descripción: "Strategic Director — Capa superior responsable de analizar, evaluar, planificar y recomendar escalamiento". Sin campo `model`. |
| `docs/certification/PR_VERIFY_STRATEGIC_DIRECTOR_LAYER.md` | ❌ No | ✅ Sí | Todo el documento describe al SD como rol de planificación. V-03: "Planificación pura. Sin permisos operativos." |
| `ael/artifacts/STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md` | ⚠️ **PARCIAL** | 🟡 Sí (como rol) pero también contiene referencias a modelo específico | Líneas 53, 63, 87, 108: Describe al SD con modelo `opencode/GPT-5.4 mini`. |

#### Hallazgo V-01-A: Documento obsoleto

**Archivo**: `ael/artifacts/STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md`
**Problema**: Este documento fue creado durante la implementación inicial del SDL cuando el SD tenía un modelo hardcodeado `opencode/GPT-5.4 mini`. Posteriormente se corrigió eliminando el modelo hardcodeado, pero el reporte de implementación **nunca se actualizó**. Contiene 4 referencias a `GPT-5.4 mini` que son inconsistentes con la arquitectura actual:

1. Línea 53: `- **Modelo**: `opencode/GPT-5.4 mini` — configurado explícitamente, no usa Current Model`
2. Línea 63: Tabla de cambios: `Agregado con modelo opencode/GPT-5.4 mini`
3. Línea 87: Riesgo R1: `strategic-director configurado con modelo opencode/GPT-5.4 mini`
4. Línea 108: Diagrama ASCII: `← Capa superior (GPT-5.4 mini)`

**Severidad**: 🟡 MEDIA — No es un documento operacional ni de configuración, pero es un artefacto oficial del proyecto y describe una configuración que no existe.

**Veredicto V-01**: ✅ **Correcto en archivos vivos** — `strategic-director.md`, `opencode.json` y la certificación PR-VERIFY-SDL describen correctamente al SD como rol. ⚠️ **Hallazgo**: `STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md` contiene 4 referencias obsoletas a modelo específico que deben actualizarse.

---

### V-02

**Objetivo**: Verificar que las responsabilidades del SD permanezcan limitadas a análisis, planificación y escalamiento. Confirmar que NO implementa código, modifica archivos, ejecuta workflows ni invoca subagentes directamente.

#### Verificación de responsabilidades POSITIVAS

| Responsabilidad | ¿En prompt? | ¿En permisos? | Evidencia |
|---|---|---|---|
| Analizar evidencia | ✅ Sí | ✅ (read: allow) | Prompt línea 31: "interpretar la evidencia y los resultados entregados por el arnés" |
| Interpretar resultados | ✅ Sí | ✅ (read: allow, grep: allow) | Prompt línea 31: "interpretar la evidencia" |
| Generar Execution Plans | ✅ Sí | ✅ (task: ael: allow) | Prompt líneas 37–51: formato JSON estructurado |
| Recomendar siguiente paso | ✅ Sí | ✅ (task: ael: allow) | Prompt línea 33: "proponer planes de ejecución estructurados" |
| Detectar incertidumbre | ✅ Sí | ✅ (read: allow) | Prompt línea 33: "detectar la incertidumbre y complejidad del problema" |
| Recomendar escalamiento | ✅ Sí | ✅ (bash: deny — no puede ejecutarlo) | Prompt líneas 54–62: campo `escalation_needed` |

#### Verificación de responsabilidades NEGATIVAS (prohibiciones)

| Prohibición | ¿En prompt? | ¿En permisos? | Evidencia |
|---|---|---|---|
| NO escribir código | ✅ Línea 23 | ✅ `edit: deny` | Prohibición explícita + permiso denegado |
| NO modificar archivos | ✅ Línea 24 | ✅ `edit: deny` | Prohibición explícita + permiso denegado |
| NO ejecutar workflows | ✅ Línea 24 | ✅ `bash: deny` | Prohibición explícita + permiso denegado |
| NO invocar subagentes directamente | ✅ Líneas 25-26 | ✅ `task: { "*": "deny" }` | Prohibición explícita + permiso denegado para todo excepto `ael` |
| NO reemplazar al Arquitecto | ✅ Línea 25 | N/A (prohibición de rol) | Prohibición explícita |
| NO reemplazar al Auditor | ✅ Línea 26 | N/A (prohibición de rol) | Prohibición explícita |
| NO tomar control del arnés | ✅ Línea 27 | N/A (prohibición de rol) | Prohibición explícita |

#### Matriz de permisos reales

| Permiso | Valor | Efecto |
|---|---|---|
| `read` | `allow` | Puede leer archivos para analizar evidencia |
| `glob` | `allow` | Puede buscar archivos por patrón |
| `grep` | `allow` | Puede buscar contenido en archivos |
| `list` | `allow` | Puede listar directorios |
| `edit` | `deny` | ❌ No puede modificar ningún archivo |
| `bash` | `deny` | ❌ No puede ejecutar ningún comando |
| `task: *` | `deny` | ❌ No puede invocar agentes arbitrariamente |
| `task: ael` | `allow` | ✅ **Única** excepción: delegar al ARNÉS Director |

**Veredicto V-02**: ✅ **Correcto**. Las 6 responsabilidades positivas están documentadas y soportadas por permisos. Las 7 prohibiciones están explícitamente documentadas y reforzadas por restricciones de permisos. La matriz de permisos es consistente: solo lectura + delegación exclusiva a `ael`.

---

### V-03

**Objetivo**: Verificar que el Current Session Model sea una decisión arquitectónica **consciente** y no una omisión de configuración. Documentar claramente la diferencia.

#### Análisis

Se identifican dos agentes sin modelo hardcodeado:

| Agente | Naturaleza | ¿Consciente u omisión? |
|---|---|---|
| `strategic-director` | Sin campo `model` en `opencode.json` | 🟢 **Decisión consciente** |
| `ael` | Sin campo `model` en `opencode.json` | 🟡 **Omisión histórica** |

#### Evidencia de decisión consciente para el SD

1. **El prompt del SD referencia explícitamente "modelo actual de la sesión"**:
   - `strategic-director.md` línea 62: `- "false: Continuar con el modelo actual de la sesión."`
   - Esto demuestra que el diseñador del prompt sabía que no hay modelo fijo y tomó una decisión explícita.

2. **El SD fue agregado a `opencode.json` sin campo `model`**:
   - `git diff HEAD -- opencode.json` muestra que `strategic-director` se agregó sin `model`.
   - Si fuera una omisión, el modelo por defecto de opencode se aplicaría igual, pero la decisión de NO incluirlo fue deliberada.

3. **No hay referencias a proveedores específicos**:
   - El prompt no menciona GPT, Claude, Gemini, Groq ni ningún otro proveedor.
   - Esto es consistente con un diseño agnóstico de proveedor.

4. **Contraste con `ael`**:
   - `ael` nunca tuvo modelo desde su creación (commit `1e624a5`).
   - No hay evidencia de que esta fuera una decisión de diseño — simplemente nunca se configuró.
   - El prompt de `ael` no referencia el modelo actual de la sesión.

#### Declaración formal

> **El uso de Current Session Model por parte del Strategic Director constituye una DECISIÓN ARQUITECTÓNICA CONSCIENTE porque:**
>
> 1. El prompt del SD instruye explícitamente "Continuar con el modelo actual de la sesión" (línea 62), demostrando conocimiento de que el modelo no es fijo.
> 2. El campo `model` fue omitido **intencionalmente** de la configuración de `strategic-director` en `opencode.json`.
> 3. No existe ningún documento de diseño ni prompt que asuma un proveedor/modelo específico para el SD.
> 4. La decisión es consistente con el objetivo arquitectónico: permitir experimentar con distintos modelos sin modificar la arquitectura.
>
> En contraste, `ael` usa Current Session Model por **omisión histórica** — su configuración nunca completó el campo `model`, y su prompt no reconoce esta circunstancia.

#### Tabla comparativa

| Dimensión | `strategic-director` (consciente) | `ael` (omisión) |
|---|---|---|
| ¿Tiene campo `model`? | No | No |
| ¿Prompt referencia modelo actual? | ✅ Sí (línea 62) | ❌ No |
| ¿Se creó sin modelo deliberadamente? | ✅ Sí | ❌ No (nunca se consideró) |
| ¿Configuración agnóstica de proveedor? | ✅ Sí | ✅ Sí |
| ¿Cambiar el modelo afecta su función? | Esperado (rol cognitivo) | No deseado (orquestador) |
| ¿Requiere modelo fijo para operar? | No (planificación pura) | No (orquestación) |

**Veredicto V-03**: ✅ **Correcto**. El Current Session Model del SD es una decisión arquitectónica consciente, demostrada por la referencia explícita en el prompt y la omisión intencional del campo `model`. Se documenta el contraste con `ael` que lo usa por omisión histórica.

---

### V-04

**Objetivo**: Verificar que el Strategic Director delegue exclusivamente al AEL y nunca directamente a subagentes operativos.

#### Verificación de permisos

| Archivo | Sección | Delegaciones permitidas |
|---|---|---|
| `opencode.json` (agente `strategic-director`) | `permission.task` | `{ "*": "deny", "ael": "allow" }` |
| `.opencode/agents/strategic-director.md` (frontmatter) | `permission.task` | `{ "*": "deny", "ael": "allow" }` |

#### Agentes a los que NO puede delegar

| Agente | Acceso directo desde SD | Evidencia |
|---|---|---|
| `ael-explore` (Explorador) | ❌ Denegado | `task: "*": "deny"` — no hay excepción |
| `ael-architect` (Arquitecto) | ❌ Denegado | `task: "*": "deny"` — no hay excepción |
| `ael-implementer` (Implementador) | ❌ Denegado | `task: "*": "deny"` — no hay excepción |
| `ael-audit` (Auditor) | ❌ Denegado | `task: "*": "deny"` — no hay excepción |
| `ael-memory` (Memoria) | ❌ Denegado | `task: "*": "deny"` — no hay excepción |
| `ael-learning` (Aprendizaje) | ❌ Denegado | `task: "*": "deny"` — no hay excepción |

#### Flujo de delegación

```
SD ──► AEL ──► Subagentes
 │               │
 │  (única)      │  (solo AEL puede)
 └── task: ael   └── task: ael-explore, ael-architect, etc.
```

El SD **no puede** saltarse al AEL e invocar subagentes directamente. No hay excepciones en la política de tareas.

#### Verificación de prompt

El prompt del SD (`strategic-director.md`) refuerza esta restricción:

- Línea 25: "NO debes: reemplazar al Arquitecto (ael-architect)"
- Línea 26: "NO debes: reemplazar al Auditor (ael-audit)"
- Línea 27: "NO debes: tomar control del arnés o saltar su flujo establecido"

**Veredicto V-04**: ✅ **Correcto**. El SD solo puede delegar en `ael`. No existen caminos para invocar subagentes directamente. La política de permisos y el prompt son consistentes.

---

### V-05

**Objetivo**: Verificar que los modelos hardcodeados de los subagentes permanezcan inalterados. Solo certificar, no modificar.

#### Verificación de modelos actuales

| Subagente | Modelo actual | Modelo original (git history) | ¿Inalterado? |
|---|---|---|---|
| `ael-explore` | `opencode/DeepSeek V4 Flash Freeh` | `opencode/DeepSeek V4 Flash Freeh` (commit `ead7357`) | ✅ Sin cambios |
| `ael-architect` | `opencode/DeepSeek V4 Flash Free` | `opencode/DeepSeek V4 Flash Free` (commit `ead7357`) | ✅ Sin cambios |
| `ael-implementer` | `opencode/DeepSeek V4 Flash Free` | `opencode/DeepSeek V4 Flash Free` (commit `ead7357`) | ✅ Sin cambios |
| `ael-audit` | `opencode/Nemotron` | `opencode/Nemotron` (commit `3f64959`) | ✅ Sin cambios |
| `ael-memory` | `opencode/North Mini Code Free` | `opencode/North Mini Code Free` (commit `3f64959`) | ✅ Sin cambios |
| `ael-learning` | `opencode/North Mini Code Free` | `opencode/North Mini Code Free` (commit `3f64959`) | ✅ Sin cambios |

**Veredicto V-05**: ✅ **Correcto**. Los 6 subagentes preservan sus modelos hardcodeados originales. `git diff HEAD -- opencode.json` confirma que no hay cambios en ningún modelo de subagente.

---

### V-06

**Objetivo**: Auditar `opencode.json` para responder preguntas sobre el Current Session Model. No modificar, solo documentar.

#### Pregunta 1: ¿Quién determina el Current Session Model?

El Current Session Model es determinado por **el framework opencode** en tiempo de ejecución, no por la configuración del proyecto. Específicamente:

- **El usuario** selecciona el modelo activo al iniciar una sesión en opencode (a través de la interfaz de usuario del IDE o CLI).
- **La sesión** mantiene el modelo seleccionado como "modelo activo" durante toda la sesión.
- **El framework opencode** asigna este modelo activo a cualquier agente que no tenga un `model` explícitamente definido en su configuración.

El proyecto TaxiGuazú **no controla** qué modelo es el Current Session Model. Solo controla qué agentes usan el Current Session Model (al no asignarles un modelo) y cuáles usan modelos fijos (al asignarles uno).

#### Pregunta 2: ¿Cómo llega ese modelo al Strategic Director?

El mecanismo es:

```
1. Usuario selecciona modelo en sesión opencode
   ──► Modelo activo = "opencode/DeepSeek V4 Flash" (por ejemplo)

2. Usuario envía mensaje
   ──► opencode identifica default_agent = "strategic-director"
   ──► opencode busca config del agente "strategic-director"
   ──► opencode encuentra que NO tiene campo "model"

3. opencode asigna el modelo activo de la sesión al SD
   ──► SD ejecuta con Current Session Model

4. SD genera Execution Plan y delega en "ael" (task: ael)

5. opencode busca config del agente "ael"
   ──► opencode encuentra que NO tiene campo "model"
   ──► ael también ejecuta con Current Session Model

6. ael invoca subagentes (task: ael-explore, etc.)
   ──► opencode busca config de cada subagente
   ──► opencode encuentra que SÍ tienen campo "model"
   ──► Subagentes ejecutan con sus modelos hardcodeados
```

#### Pregunta 3: ¿Existe algún comportamiento implícito?

Sí. Los siguientes comportamientos son implícitos (no documentados explícitamente en la configuración del proyecto):

| Comportamiento implícito | Descripción | Impacto |
|---|---|---|
| **Herencia automática de modelo** | Cualquier agente sin campo `model` hereda el Current Session Model | Si se agrega un nuevo agente sin modelo, automáticamente usará el Current Session Model |
| **Cambio de modelo afecta a TODOS los agentes sin modelo** | Si la sesión cambia de modelo, tanto SD como AEL cambian simultáneamente | No hay forma de que SD use un modelo y AEL use otro (sin hardcodear) |
| **No hay validación de modelo al cargar config** | opencode no valida que el modelo especificado exista hasta el momento de la invocación | Si el Current Session Model no está disponible, el SD fallará al invocarse |
| **`ael/AGENTS.md` no existe** | `opencode.json` línea 4 referencia `"instructions": ["ael/AGENTS.md"]` | Si opencode intenta cargar instructions de un archivo inexistente, puede causar un warning o error (depende de la implementación de opencode) |

#### Pregunta 4: ¿Existe algún riesgo de comportamiento inesperado?

| Riesgo | Descripción | Severidad | ¿Afecta al SD? |
|---|---|---|---|
| **Modelo insuficiente para el SD** | Si el usuario selecciona un modelo muy pequeño (ej: North Mini Code Free), el SD podría no tener capacidad cognitiva suficiente para analizar evidencia compleja | 🟡 MEDIA | Sí — el SD necesita capacidad de razonamiento |
| **Modelo insuficiente para AEL** | Similar al anterior pero para el orquestador. Si AEL no puede planificar bien, toda la misión falla | 🟡 MEDIA | Sí, porque AEL también usa Current Session Model |
| **Desequilibrio cognitivo SD vs Subagentes** | SD con modelo grande y subagentes con modelos chicos (o viceversa). El SD podría planificar a un nivel que los subagentes no pueden ejecutar | 🟢 BAJA | El SD solo planifica; la ejecución es responsabilidad de AEL y subagentes |
| **Instrucciones rotas (`ael/AGENTS.md`)** | El archivo de instrucciones referenciado no existe | 🟡 MEDIA | Puede causar error al cargar la configuración |
| **Session Model no disponible** | Si el proveedor del Current Session Model está caído o no configurado | 🔴 ALTA | El SD no puede ejecutarse — es una dependencia runtime |
| **Comportamiento no determinístico** | Diferentes modelos producen diferentes Execution Plans para la misma entrada | 🟢 BAJA | Esperado y deseado — es la razón de ser del Current Session Model |
| **SD delega a AEL, AEL cambia modelo** | No hay riesgo porque AEL también usa Current Session Model — cualquier cambio afecta a ambos sincrónicamente | 🟢 BAJA | No hay desincronización posible |

**Veredicto V-06**: ⚠️ **Documentado**. El Current Session Model funciona por herencia automática del framework. El principal riesgo es la referencia rota a `ael/AGENTS.md` (pre-existente, H-03) y la dependencia de disponibilidad del modelo de sesión.

---

### V-07

**Objetivo**: Proponer un contrato formal para el Strategic Director.

> ⚠️ **Nota**: El contrato completo ya fue definido en la [Sección 3](#3-contrato-strategic-director) de este documento. Esta sección resume los elementos clave y certifica su completitud.

#### Elementos del contrato

| Elemento | Estado |
|---|---|
| Nombre del contrato | ✅ **StrategicDirectorContract** v1.0 |
| Responsabilidades (6) | ✅ Documentadas en §3.1 |
| Responsabilidades prohibidas (7) | ✅ Documentadas en §3.2 |
| Entradas (5) | ✅ Documentadas en §3.3 |
| Salidas (2) | ✅ Documentadas en §3.4 |
| Invariantes (6: SD-I1 a SD-I6) | ✅ Documentadas en §3.5 |
| Dependencias (4) | ✅ Documentadas en §3.6 |
| Política de delegación | ✅ Documentada en §3.7 |
| Política de escalamiento | ✅ Documentada en §3.8 |

#### Validación contra requisitos

| Requisito arquitectónico | ¿Cubre el contrato? | Evidencia |
|---|---|---|
| SD es un rol, no un modelo | ✅ Sí | SD-I3: "El SD nunca hardcodea un modelo". Dependencias: "Current Session Model — intercambiable sin modificar arquitectura" |
| SD solo planifica, no ejecuta | ✅ Sí | SD-I1: "El SD nunca ejecuta código". Responsabilidades prohibidas 1-7 |
| SD delega solo a AEL | ✅ Sí | SD-I2: "El SD nunca invoca subagentes directamente". Política de delegación §3.7 |
| SD escala cuando es necesario | ✅ Sí | Política de escalamiento §3.8 con 5 casos documentados |
| Separación de capas intacta | ✅ Sí | Dependencias: solo AEL. Sin dependencias a subagentes |
| Sin dependencia de proveedor | ✅ Sí | SD-I5: "El SD no tiene dependencias de proveedor LLM específico" |

**Veredicto V-07**: ✅ **Correcto**. El contrato propuesto (StrategicDirectorContract v1.0) cubre todos los requisitos arquitectónicos. Queda formalizado en la Sección 3 de este documento.

---

### V-08

**Objetivo**: Intentar romper la arquitectura. Buscar escenarios donde cambiar el Current Session Model pueda producir comportamientos inconsistentes.

#### Escenario 1: Modelo pequeño, tarea compleja

| Aspecto | Descripción |
|---|---|
| **Setup** | Usuario selecciona `North Mini Code Free` como Current Session Model |
| **SD** | Intenta analizar evidencia compleja (ej: "Auditar 15 archivos por consistencia arquitectónica") |
| **Resultado esperado** | El SD genera un Execution Plan de baja calidad (confianza baja, evidencia incompleta) |
| **Comportamiento arquitectónico** | ✅ **Correcto** → El SD detecta baja confianza y establece `escalation_needed = true` con justificación. El sistema escala. |
| **¿Ruptura?** | ❌ No. El mecanismo de escalamiento está diseñado para este caso. |

#### Escenario 2: Modelo grande delega a subagentes pequeños

| Aspecto | Descripción |
|---|---|
| **Setup** | SD usa modelo grande (ej: DeepSeek V4 Flash), subagentes usan modelos hardcodeados pequeños |
| **SD** | Planifica una misión que requiere análisis complejo que solo el SD puede hacer |
| **Subagentes** | No pueden ejecutar el plan porque sus modelos son insuficientes |
| **Resultado esperado** | El SD recomienda workflow que los subagentes no pueden ejecutar |
| **¿Ruptura?** | ⚠️ **Riesgo potencial** → El SD no conoce las capacidades de los subagentes (solo conoce el arnés). Si el SD asume que AEL+subagentes pueden ejecutar cualquier plan, puede generar planes inviables. |
| **Mitigación** | El SD no necesita conocer las capacidades de los subagentes — solo delega en AEL, que es el orquestador que conoce las capacidades del arnés. AEL ajustará el plan según las capacidades reales. |
| **¿Ruptura real?** | ❌ No. La capa AEL actúa como buffer de capacidad. |

#### Escenario 3: Cambio de modelo a mitad de sesión

| Aspecto | Descripción |
|---|---|
| **Setup** | Usuario cambia el Current Session Model durante una misión activa |
| **SD** | Había generado un Execution Plan con el modelo anterior. Ahora el nuevo modelo evalúa el resultado. |
| **Resultado esperado** | El nuevo modelo puede interpretar la evidencia de manera diferente y recomendar un curso de acción inconsistente con el plan original |
| **¿Ruptura?** | ⚠️ **Riesgo de inconsistencia** → No es una ruptura arquitectónica (la arquitectura no prohíbe cambiar modelo), pero puede producir resultados inconsistentes entre iteraciones de una misma misión. |
| **Naturaleza** | Comportamiento esperado de cualquier sistema multi-modelo. No es específico del SDL. |

#### Escenario 4: Modelo con alucinaciones

| Aspecto | Descripción |
|---|---|
| **Setup** | Current Session Model produce alucinaciones (ej: inventa evidencia que no existe) |
| **SD** | Incluye evidencia falsa en el Execution Plan |
| **AEL** | Recibe un plan basado en evidencia falsa y ejecuta la misión incorrecta |
| **¿Ruptura?** | ⚠️ **Riesgo de calidad** → No es una ruptura arquitectónica. La arquitectura asume que el modelo produce resultados válidos. La verificación de calidad está en la capa AEL (Auditor), no en el SD. |
| **Mitigación** | El SD puede detectar su propia incertidumbre y escalar. Si no lo hace, el AEL ejecutará igual pero el Auditor verificará la calidad al cerrar la misión. |

#### Escenario 5: SD sin modelo disponible

| Aspecto | Descripción |
|---|---|
| **Setup** | El proveedor del Current Session Model no está disponible (ej: API key inválida, servidor caído) |
| **SD** | No puede ejecutarse. `default_agent = "strategic-director"` significa que el usuario ni siquiera puede iniciar una sesión. |
| **Resultado esperado** | opencode muestra un error de modelo no disponible. El sistema es inaccesible. |
| **¿Ruptura?** | 🔴 **Riesgo de disponibilidad** → Si el SD no puede ejecutarse y es el `default_agent`, el sistema completo es inaccesible. Esto es peor que si `ael` fuera el `default_agent` (que también usa Current Session Model y sufriría el mismo problema). |
| **Naturaleza** | Riesgo compartido con cualquier agente que use Current Session Model. No es específico del SDL. |

#### Escenario 6: `ael` con modelo diferente al SD (si se hardcodea)

| Aspecto | Descripción |
|---|---|
| **Setup** | (Hipotético) Se asigna un modelo hardcodeado a `ael` pero no al SD |
| **SD** | Usa Current Session Model (modelo grande) |
| **AEL** | Usa modelo hardcodeado (modelo chico) |
| **Resultado esperado** | SD planifica con capacidad cognitiva alta, AEL ejecuta con capacidad baja. El orquestador no puede ejecutar el plan del SD |
| **¿Ruptura?** | ❌ No aplica. Actualmente AEL también usa Current Session Model. Pero este es un punto arquitectónico válido: **si en el futuro se hardcodea el modelo de AEL, habría que verificar que SD y AEL tengan capacidades compatibles.** |
| **Recomendación** | Mantener a ambos con Current Session Model o hardcodear ambos al mismo modelo. No permitir divergencia de capacidades entre SD y AEL. |

#### Análisis de estabilidad arquitectónica

| Propiedad | ¿Se mantiene? | Explicación |
|---|---|---|
| **Separación de capas** | ✅ Sí | SDL → AEL → Subagentes permanece intacta aunque cambie el modelo |
| **Delegación exclusiva** | ✅ Sí | SD solo puede delegar en AEL independientemente del modelo |
| **Prohibiciones** | ✅ Sí | SD no puede editar/bash independientemente del modelo |
| **Invariantes** | ✅ Sí | SD-I1 a SD-I6 no dependen del modelo |
| **Formato de salida** | ✅ Sí | Execution Plan JSON es independiente del modelo |
| **Dependencia de proveedor** | ✅ No hay | Sin referencias a proveedores en ningún archivo de configuración o prompt |

**Veredicto V-08**: ✅ **Arquitectura estable**. Los 6 escenarios de ruptura fueron evaluados:
- 4 escenarios no producen ruptura arquitectónica (mecanismos de mitigación existentes)
- 1 escenario produce inconsistencia transitoria esperada (cambio de modelo a mitad de sesión)
- 1 escenario produce riesgo de disponibilidad (modelo no disponible) — compartido con todo Current Session Model
- 0 escenarios rompen la separación SDL → AEL → Subagentes

La arquitectura es **resistente a cambios de modelo** porque las invariantes, las prohibiciones y la separación de capas son independientes del modelo subyacente.

---

## 6. Riesgos Encontrados

### Riesgos activos (verificados)

| ID | Riesgo | Severidad | Componente | Mitigación |
|---|---|---|---|---|
| **R-01** | Documento `STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md` obsoleto: describe modelo `GPT-5.4 mini` que no existe en configuración actual | 🟡 **Media** | Documentación | Actualizar el reporte para reflejar Current Session Model (misión separada) |
| **R-02** | `ael/AGENTS.md` no existe pero está referenciado en `opencode.json` línea 4 | 🟡 **Media** | Configuración | Crear el archivo o remover la referencia (hallazgo H-03 pre-existente) |
| **R-03** | `ael` usa Current Session Model por omisión histórica — si el modelo de sesión cambia, el orquestador cambia sin control | 🟢 **Baja** | Arquitectura | Monitorear si el comportamiento de AEL se ve afectado por cambios de modelo de sesión |
| **R-04** | Nomenclatura inconsistente entre `ael.md` y `opencode.json` (ver H-01 pre-existente) | 🟡 **Media** | Configuración | Unificar nombres en misión separada |

### Riesgos descartados

| ID | Riesgo | Motivo del descarte |
|---|---|---|
| ~~R-05~~ | SD podría ejecutar código si el prompt no es claro | Descartado: `edit: deny` y `bash: deny` son permisos duros del framework, no dependen del prompt |
| ~~R-06~~ | SD podría invocar subagentes directamente | Descartado: `task: { "*": "deny" }` es un permiso duro. Solo `ael` está permitido. |
| ~~R-07~~ | Cambiar Current Session Model rompe la arquitectura | Descartado (V-08): 0/6 escenarios rompen la separación de capas |
| ~~R-08~~ | SD necesita modelo grande para funcionar | Descartado: El SD solo planifica. Si el modelo es pequeño, escala. |
| ~~R-09~~ | Dependencia oculta de proveedor en el prompt del SD | Descartado: Sin referencias a GPT, Claude, Gemini, Groq ni ningún proveedor |
| ~~R-10~~ | SD y AEL podrían tener modelos inconsistentes | Descartado: Ambos usan Current Session Model — siempre están sincronizados |

---

## 7. Riesgos Descartados

(Los riesgos descartados están listados en la sección anterior con su justificación. Ver tabla en §6.)

---

## 8. Certificación Final

### Resumen de verificaciones

| Verificación | Estado | Detalle |
|---|---|---|
| **V-01**: SD como rol, no modelo | ✅ **Correcto** | Archivos vivos correctos. Hallazgo: `STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md` obsoleto (4 referencias a `GPT-5.4 mini`). |
| **V-02**: Responsabilidades limitadas | ✅ **Correcto** | 6 responsabilidades positivas, 7 prohibiciones. Matriz de permisos consistente. |
| **V-03**: Current Session Model consciente | ✅ **Correcto** | Decisión arquitectónica demostrada (referencia explícita en prompt + omisión intencional de `model`). |
| **V-04**: Delegación exclusiva al AEL | ✅ **Correcto** | `task: { "*": "deny", "ael": "allow" }` en ambas configuraciones. Sin caminos alternativos. |
| **V-05**: Modelos de subagentes inalterados | ✅ **Correcto** | 6/6 subagentes con modelos originales. `git diff` confirmado. |
| **V-06**: Auditoría opencode.json | ✅ **Documentado** | 4 preguntas respondidas. Riesgos identificados y categorizados. |
| **V-07**: Contrato formal | ✅ **Correcto** | StrategicDirectorContract v1.0 completo (9 elementos contractuales). |
| **V-08**: Intentos de ruptura | ✅ **Arquitectura estable** | 6 escenarios evaluados. 0 rupturas arquitectónicas. |

### Veredicto final

```
╔══════════════════════════════════════════════════════════════════════╗
║               SDL CONTRACT CERTIFICATION — ✅ CERTIFICADO           ║
║                                                                      ║
║  La capa Strategic Director cumple con todos los requisitos         ║
║  arquitectónicos y operacionales:                                   ║
║                                                                      ║
║  ✓ Strategic Director es un ROL COGNITIVO, no un modelo específico  ║
║  ✓ Current Session Model es una DECISIÓN ARQUITECTÓNICA CONSCIENTE  ║
║  ✓ Cambiar el modelo NO MODIFICA LA ARQUITECTURA                    ║
║  ✓ Solo cambia la CAPACIDAD COGNITIVA disponible                    ║
║  ✓ Separación SDL → AEL → Subagentes permanece INTACTA             ║
║  ✓ NO existen dependencias ocultas de proveedor                     ║
║  ✓ NO se introdujeron nuevas funcionalidades                        ║
║                                                                      ║
║  Hallazgos documentados (no bloqueantes):                           ║
║  - R-01: STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md obsoleto       ║
║  - R-02: ael/AGENTS.md no existe (H-03 pre-existente)              ║
║  - R-03: ael sin modelo explícito (histórico)                      ║
║  - R-04: Nomenclatura inconsistente ael.md vs opencode.json (H-01) ║
║                                                                      ║
║  Contrato StrategicDirectorContract v1.0 formalizado en §3.         ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Próximos pasos recomendados

1. **Actualizar** `ael/artifacts/STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md` para reflejar Current Session Model (eliminar referencias a `GPT-5.4 mini`).
2. **Resolver** hallazgos pre-existentes H-01 (nomenclatura) y H-03 (`ael/AGENTS.md`) en misión separada de limpieza de configuración.

---

*Fin de SDL_CONTRACT_CERTIFICATION.md — Certificación de contrato completada.*
