# Cognitive Ontology — AITOS Evidence Engine

> Definición formal de las entidades cognitivas, sus relaciones y su jerarquía epistémica.
> Documento oficial del Architecture Freeze (ADR-009).

---

## 1. Propósito

Esta ontología define el **vocabulario cognitivo** del Evidence Engine. Cada entidad representa un nivel de abstracción en el pipeline que transforma un mensaje crudo en una decisión cognitiva. La ontología es el contrato semántico entre capas.

---

## 2. Jerarquía epistémica

```
Message                          [RAW] — lo que el usuario dijo
    ↓
Signal                           [CAPTURE] — lo que el sistema recibió
    ↓
Observation                      [VALIDATE] — lo que el sistema observó
    ↓
Fact                             [EXTRACT] — lo que el sistema extrajo
    ↓
Evidence                         [GROUP] — lo que el sistema agrupa
    ↓
Knowledge                        [CONSOLIDATE] — lo que el sistema sabe
    ↓
Belief                           [COMMIT] — lo que el sistema cree
    ↓
Decision                         [DETERMINE] — lo que el sistema decide
```

Cada nivel **incluye** al anterior y agrega una capa de significado.

---

## 3. Entidades

### 3.1 Message

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `text` | `string` | Contenido crudo del mensaje |
| `channel` | `string` | Canal de entrada (whatsapp, web) |
| `phone` | `string` | Identificador del remitente |
| `conversationId` | `number` | ID de la conversación |

**Rol ontológico**: Punto de entrada. El mensaje existe en el mundo externo. El Evidence Engine no posee ni controla Messages — los recibe del pipeline conversacional.

---

### 3.2 Signal

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `id` | `string` (UUID) | Identificador único |
| `rawContent` | `string` | Contenido del mensaje |
| `channel` | `ChannelType` | Canal de recepción |
| `subtype` | `SignalSubtype` | Subtipo (message, system, etc.) |
| `receivedAt` | `Date` | Timestamp de recepción (debe ser ≤ now) |
| `metadata` | `Record<string, unknown>` | Metadatos contextuales |

**Rol ontológico**: Primera representación cognitiva. Signal captura el hecho bruto de que un mensaje fue recibido.

**Invariante S-1**: `receivedAt` no puede ser futuro.

---

### 3.3 Observation

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `id` | `string` (UUID) | Identificador único |
| `signalId` | `string` | Signal de origen |
| `status` | `ObservationValidationStatus` | Estado de validación |
| `validatedAt` | `Date` | Timestamp de validación |

**Rol ontológico**: Segunda representación cognitiva. Observation testifica que el sistema observó y validó el Signal. Es el primer acto cognitivo deliberado.

**Invariante O-1**: `validatedAt >= signal.receivedAt`.

---

### 3.4 Fact

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `type` | `FactType` | Tipo de hecho (solo `"note"` en PR-3) |
| `proposition` | `string` | Proposición atómica |
| `source` | `Source` | Origen epistémico del hecho |
| `confidence` | `Confidence` | Certeza del hecho |

**Rol ontológico**: Proposición atómica. Un Fact es la unidad mínima de conocimiento que el sistema puede afirmar. No hay interpretación semántica — solo estructura.

**Facts estructurales** (siempre construidos):
1. "observation validated with status {status}"
2. "signal received via {channel} channel"
3. "message content present" (si rawContent no está vacío)
4. "received at {receivedAt}"
5. "conversation identified as {conversationId}" (si metadata.conversationId existe)

---

### 3.5 Evidence

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `id` | `string` (UUID) | Identificador único |
| `observationId` | `string` | Observation de origen |
| `facts` | `Fact[]` | Hechos agrupados |
| `type` | `EvidenceType` | Tipo de evidencia (`"user_input"`) |
| `createdAt` | `Date` | Timestamp de creación |
| `provenance` | `string[]` | Trazabilidad futura (vacío en PR-3) |

**Rol ontológico**: Agrupación epistémica. Evidence reúne todos los Facts derivados de una misma Observation bajo un mismo contenedor. Representa "todo lo que sabemos sobre este input de usuario".

**Anticipatory field**: `provenance` está reservado para trazas de Memory (futura capa cognitiva).

---

### 3.6 Knowledge

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `id` | `string` (UUID) | Identificador único |
| `evidenceId` | `string` | Evidence de origen (anticipatorio) |
| `observationStatus` | `string` | Status consolidado desde Observation |
| `channel` | `string \| null` | Canal consolidado desde Signal |
| `hasContent` | `boolean` | Si hay contenido presente |
| `receivedAt` | `string \| null` | Timestamp ISO consolidado |
| `conversationId` | `string \| null` | ID de conversación consolidado |
| `isFullyConsolidated` | `boolean` | Todos los campos presentes |

**Rol ontológico**: Primer comportamiento cognitivo. Knowledge extrae fields estructurados de Facts no estructurados. No infiere nada nuevo — solo consolida.

**Anticipatory field**: `evidenceId` permite a Knowledge referenciar su Evidence fuente sin requerir un árbol de objetos.

---

### 3.7 Belief

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `id` | `string` (UUID) | Identificador único |
| `knowledgeId` | `string` | Knowledge de origen (anticipatorio) |
| `createdAt` | `Date` | Timestamp de creación |
| `observationValid` | `boolean` | Compromiso epistémico sobre la observación |
| `channel` | `string \| null` | Canal transferido desde Knowledge |
| `hasContent` | `boolean` | Contenido presente |
| `receivedAt` | `string \| null` | Timestamp de recepción |
| `conversationId` | `string \| null` | ID de conversación |
| `isWellFormed` | `boolean` | Creencia completa (core fields presentes) |

**Rol ontológico**: Compromiso epistémico. Belief representa "el sistema cree que...". Es la postura del sistema frente al conocimiento consolidado. Belief no es certeza, no es decisión — es postura.

**Anticipatory field**: `knowledgeId` permite a Belief referenciar su Knowledge fuente.

---

### 3.8 Decision

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `id` | `string` (UUID) | Identificador único |
| `beliefId` | `string` | Belief de origen (anticipatorio) |
| `createdAt` | `Date` | Timestamp de creación |
| `validInput` | `boolean` | Determinación sobre la validez del input |
| `hasContent` | `boolean` | Contenido presente |
| `readiness` | `CognitiveReadiness` | Nivel de readiness cognitivo |
| `missingInfo` | `readonly string[]` | Auto-diagnóstico de campos ausentes |
| `isDecided` | `boolean` | Readiness === "ready" |

**Rol ontológico**: Determinación cognitiva. Decision representa "el sistema decide que...". Es el output final del pipeline cognitivo. Decision no es una decisión operacional — es una determinación sobre el estado cognitivo.

**CognitiveReadiness**:
- `"ready"`: el sistema tiene información suficiente para operar
- `"partial"`: falta información no crítica
- `"insufficient"`: falta información crítica

**Anticipatory field**: `beliefId` permite a Decision referenciar su Belief fuente.

---

## 4. Relaciones

### 4.1 Dependencias lineales

```
Message → Signal → Observation → Fact → Evidence → Knowledge → Belief → Decision
```

Cada entidad solo conoce a su predecesor inmediato:

| Entidad | Conoce a | A través de |
|---------|----------|-------------|
| Signal | Message (external) | `rawContent` |
| Observation | Signal | `signalId` |
| Fact | Observation + Signal | Construcción en `buildFact` |
| Evidence | Observation + Facts | `observationId` + `facts[]` |
| Knowledge | Evidence | `evidenceId` |
| Belief | Knowledge | `knowledgeId` |
| Decision | Belief | `beliefId` |

### 4.2 Cardinalidades

| Relación | Cardinalidad |
|----------|-------------|
| Message → Signal | 1:1 |
| Signal → Observation | 1:1 |
| Observation → Fact | 1:N (siempre 5 estructurales) |
| Observation → Evidence | 1:1 |
| Evidence → Knowledge | 1:1 |
| Knowledge → Belief | 1:1 |
| Belief → Decision | 1:1 |

---

## 5. Principios ontológicos

### 5.1 Monotonicidad epistémica

Cada nivel agrega conocimiento sin contradecir niveles anteriores. Una vez que un Fact afirma una proposición, ningún nivel superior puede negarla.

### 5.2 Separación de concerns cognitivos

| Nivel | Pregunta que responde | NO responde |
|-------|----------------------|-------------|
| Signal | ¿Qué se recibió? | ¿Es válido? |
| Observation | ¿Es válido? | ¿Qué significa? |
| Fact | ¿Qué proposiciones hay? | ¿Qué implican? |
| Evidence | ¿Qué Facts agrupa? | ¿Qué conclusiones sacar? |
| Knowledge | ¿Qué sabemos estructuradamente? | ¿Qué creemos? |
| Belief | ¿Qué creemos? | ¿Qué decidimos? |
| Decision | ¿Qué decidimos? | ¿Qué hacemos? |

### 5.3 Inmutabilidad ontológica

Una vez creada, una entidad cognitiva no puede cambiar. El tiempo avanza en una dirección; el conocimiento se acumula, no se modifica.

---

## 6. Memory — Cognitive Persistence Layer (ADR-010)

**Estado:** Conceptual (ADR-010 Accepted — No Implementation)

### Definición ontológica

Memory es la capa de persistencia cognitiva que preserva el output completo del Evidence Engine (Belief + Decision) como un snapshot inmutable por turno de conversación.

**Rol ontológico:** Preservación histórica. Memory no transforma, no enriquece, no infiere — solo congela el estado cognitivo al finalizar cada turno.

### Relación con el pipeline

```
... → Belief → Decision ──→ [Memory.store()] ──→ (turn complete)
                            ↓
                    Snapshot persistido
                    (Belief + Decision)
```

Memory existe **después** del pipeline cognitivo. No es parte del pipeline. No produce cognición.

### Invariantes (14)

| ID | Invariante | Descripción |
|----|-----------|-------------|
| M-1 | Append-only | Los snapshots nunca se eliminan ni actualizan |
| M-2 | Read-only durante EE | Memory no se consulta mientras el pipeline cognitivo corre |
| M-3 | No feedback a EE | Memory nunca retroalimenta Signal→Observation→Fact→Evidence→Knowledge→Belief→Decision |
| M-4 | Turno completo | Snapshot solo se escribe si Belief + Decision están completos |
| M-5 | Inmutable | Una vez persistido, el snapshot no cambia |
| M-6 | Particionado por conversación | `conversationId` es la única clave de partición |
| M-7 | Monotónico | `turnNumber` incrementa exactamente en 1 por snapshot |
| M-8 | Atómico | Cada snapshot contiene exactamente un Belief + un Decision |
| M-9 | Sin enriquecimiento | Memory nunca agrega, deriva, transforma ni infiere campos |
| M-10 | Estabilidad de proyección | Los campos persistidos deben coincidir con los del EE al momento del snapshot |
| M-11 | Sin estado operacional | Memory no tiene estado interno, caché ni runtime propio |
| M-12 | Sin defaults | Cada campo proviene de Belief o Decision, nunca de un default hardcodeado |
| M-13 | Sin precomputación de deltas | Memory no computa diferencias entre snapshots consecutivos |
| M-14 | Separación temporal | `storedAt` (tiempo de Memory) es distinto de `receivedAt` (tiempo del EE) |

### Atomic unit

```
MemorySnapshot = {
  conversationId: string,   // partition key
  memoryId: string,         // UUID v4
  turnNumber: number,       // monotónico
  storedAt: Date,           // timestamp de persistencia
  belief: {                 // 7 campos del Belief
    id, observationValid, channel, hasContent, receivedAt,
    conversationId, isWellFormed, factCount
  },
  decision: {               // 7 campos del Decision
    id, validInput, hasContent, readiness,
    missingInfo, isDecided, factCount
  },
}
```

### Diferenciación de SessionMemory (operacional)

| Aspecto | SessionMemory (`buildMemory`) | Cognitive Memory (`memoryService.store`) |
|---------|------------------------------|------------------------------------------|
| Fuente | ChatSessionRow + MessageRow | Belief + Decision (Evidence Engine) |
| Propósito | Contexto operacional para extracción | Preservación cognitiva para Learning |
| Mutabilidad | Mutable (upsert por turno) | Inmutable (append-only) |
| Volatilidad | Persistido en DB de sesión | Persistido en almacenamiento cognitivo |
| Epistemic level | Pre-cognitivo (operacional) | Post-cognitivo (histórico) |

---

## 7. Arquitectura cognitiva final

### 7.1 Pipeline cognitivo

```
COGNITIVO:    EE → Memory → Learning
                                     │
                                     ▼ [API pública: Learning.getPatterns()]
                                     │
OPERACIONAL:  Handler → Policy → LLM → Response
```

3 capas cognitivas (EE, Memory, Learning).
Sin capas intermedias entre cognición y acción.
Sin boundary como entidad separada (PR-10).
Planning, Goals y Reflection eliminadas.

### 7.2 Entidades del pipeline cognitivo

| Entidad | Predecesor | Rol | Estado |
|---------|-----------|-----|--------|
| **EE** (7 capas) | Mensaje entrante | Producir Signal→Observation→Fact→Evidence→Knowledge→Belief→Decision | ✅ **Freeze** (ADR-009) |
| **Memory** | Belief + Decision | Preservar snapshots cognitivos (append-only) | ✅ **Freeze** (ADR-010) |
| **Learning** | Memory (ventana W) | Descubrir patrones: L: 𝒲 × Γ → 𝒫(𝒞), c = ⟨P, θ, E⟩ | ✅ **Cerrado** (PR-7G) |

### 7.3 Reglas de frontera (no entidad, solo políticas)

1. **Solo Patterns cruzan** del dominio cognitivo al operacional. Nunca snapshots raw, configuración de Learning, ni metadatos de ejecución.
2. **Importación unidireccional**: el sistema operacional importa tipos del cognitivo. El cognitivo nunca importa del operacional.
3. **Patterns inmutables**: el sistema operacional lee Patterns, nunca los modifica.

### 7.4 Capas eliminadas

| Capa | Eliminada en | Razón |
|------|:-----------:|-------|
| **Reflection** | PR-6 (ADR-011) | Sin boundary, sin conocimiento nuevo, δ absorbida por Learning |
| **Goals** | PR-8 | Mismo tipo ontológico que Action, absorbida en Planning |
| **Planning** | PR-9 | Produce instrucciones no conocimiento, absorbida en sistema operacional |
| **Boundary** | PR-10 | No es entidad, es API pública de Learning |

### 7.5 Contador de auditorías

| Serie | Capa | Auditorías | Resultado |
|-------|------|:----------:|:---------:|
| PR-3 | EE | — | ✅ Freeze |
| PR-5 | Memory | 3 (A, B, C) | ✅ Freeze |
| PR-6 | Reflection | 7 (A-G) | ❌ Eliminada |
| PR-7 | Learning | 7 (A-G) | ✅ Preservada |
| PR-8 | Goals | 7 (A-G) | ❌ Eliminada |
| PR-9 | Planning | 7 (A-G) | ❌ Eliminada |
| PR-10 | Boundary | 6 (A-F) | ❌ Eliminada como entidad |
| S1A | Pipeline completo | 1 | **D — Contradicción detectada** |
| PR-11 | Alineamiento real | 5 | **B — Documentar como futuro** |
| **Total** | | **43 auditorías** | **3 preservadas · 4 eliminadas · 1 contradicción · 1 alineamiento** |

---

*Última actualización: 2026-07-13 (S1A completada)*
*Autoridad: ADR-009 (EE Freeze) + ADR-010 (Memory) + ADR-011 (Reflection Elimination)*

---

## 8. Estado S1A — Contradicción detectada

### 8.1 Hallazgo

La auditoría S1A (Irreducibilidad Global) encontró una **contradicción verificable** entre la teoría arquitectónica y el código real:

| Afirmación arquitectónica | Realidad en código |
|--------------------------|-------------------|
| EE → Memory (flujo de datos) | `runShadowCognition()` descarta su retorno en lead.service.ts:83. ShadowResult nunca se captura. |
| Memory preserva para Learning | Memory no existe (0 archivos en `src/lib/memory/`). |
| Learning descubre patrones | Learning cognitivo no existe. Learning operacional (ADR-003) es un sistema distinto. |

### 8.2 Veredicto S1A

**D — La arquitectura contiene una contradicción que obliga a rediseñar el pipeline.**

La premisa fundamental "EE produce conocimiento que Memory preserva para que Learning descubra patrones" es falsa en el sistema actual. La contradicción debe resolverse antes de continuar con S1B-S1F.

Documento: `docs/architecture/S1A_GLOBAL_IRREDUCIBILITY_AUDIT.md`

### 8.3 Resolución (PR-11)

PR-11 resolvió la contradicción emitiendo **Veredicto B**: la arquitectura cognitiva describe un sistema futuro, no el actual. Clasificación oficial por elemento:

| Elemento | Categoría | Significado |
|----------|:---------:|-------------|
| EE — entidades y builders | **A** | Existen, correctamente implementados |
| EE — conexión a Memory | **D** | Abstracción incorrecta (output descartado) |
| Memory (ADR-010) | **B** | Conceptual, sin implementación |
| Learning cognitivo (PR-7) | **B** | Conceptual, sin implementación |
| Learning operacional (`src/lib/services/learning/`) | **C** | Pertenece al dominio operacional |
| Nombre "Learning" compartido | **D** | Riesgo de confusión |

**Acciones próximas**: PR-11A (documentación presente/futuro), PR-11B (capturar ShadowResult), PR-11C (renombrar Learning operacional), PR-11D (renombrar Learning cognitivo a Pattern Discovery).

Documento: `docs/architecture/PR-11_COGNITIVE_REALITY_ALIGNMENT.md`
