# PR-7D — Pattern Discovery Contract Derivation Audit

**Estado:** Borrador de auditoría  
**Fecha:** 2026-07-13  
**Driver:** Derivar contratos semánticos exclusivamente del modelo matemático cerrado (PR-7A + PR-7B + PR-7C — documentos históricos, renombrados a Pattern Discovery en PR-11A).

---

## Regla metodológica

Este documento NO diseña APIs, DTOs, clases ni interfaces de código. Deriva únicamente contratos semánticos a partir del modelo matemático:

```
L: 𝒲 × Γ → 𝒫(𝒞)
c = ⟨P, θ, E⟩ ∈ 𝒞
```

Cada contrato define: qué cruza la frontera, bajo qué condiciones, con qué garantías.

---

## Pregunta fundamental

Antes de derivar los contratos, debe responderse:

**¿Γ forma parte de la identidad matemática de un Pattern o solamente del contexto de ejecución?**

### Análisis

Del modelo matemático:

```
L_γ(W) = M = {c₁, c₂, ..., cₖ}
c = ⟨P, θ, E⟩
```

γ **no aparece dentro de c**. El claim `⟨P, θ, E⟩` se define exclusivamente por su predicado, su confianza y su evidencia. γ determina QUÉ claims se producen, pero no es una propiedad del claim individual.

### Dos identidades

| Identidad | Definición | Incluye γ | Para qué se usa |
|-----------|-----------|-----------|-----------------|
| **Identidad matemática** | `⟨P, θ, E⟩` | ❌ No | Consumo por Goals |
| **Identidad de verificación** | `⟨P, θ, E, γ⟩` | ✅ Sí | Auditoría y reproducibilidad |

### Resolución

**Γ NO forma parte de la identidad matemática de un Pattern.** Dos claims con el mismo `⟨P, θ, E⟩` producidos por diferentes γ son matemáticamente idénticos. La identidad matemática es suficiente para el consumo.

**Γ SÍ forma parte de la identidad de verificación.** Para auditar, reproducir o depurar un claim, se necesita saber qué γ lo produjo.

Esta distinción se refleja en los contratos:
- **Pattern Discovery → Goals**: usa identidad matemática (sin γ).
- **Pattern Discovery → Auditoría**: usa identidad de verificación (con γ).
- **Pattern Discovery → Runtime**: γ es parámetro de ejecución, no parte del resultado.

---

## Contrato 1: Memory → Pattern Discovery

### Frontera

Memory entrega una secuencia ordenada de snapshots W a Pattern Discovery. Es la entrada de la función L.

```
Memory ──W──→ Pattern Discovery
```

### Del modelo matemático

```
W = (s₁, s₂, ..., sₙ) con sᵢ ∈ S (espacio producto de 19 campos — 11 analizables por Pattern Discovery, 8 de metadata)
n ≥ 1 (al menos un snapshot; n ≥ 2 para claims no triviales)
∀i: turnNumber(sᵢ) = i (monotonicidad, M-7)
∀i: storedAt(sᵢ) ≤ storedAt(s_{i+1}) (orden temporal, M-14)
```

### Precondiciones

| # | Precondición | Fuente |
|---|-------------|--------|
| P1-ML | Memory contiene al menos un snapshot completo para la ventana solicitada | M-4, M-8 |
| P2-ML | Los snapshots están ordenados por turnNumber estrictamente creciente | M-7 |
| P3-ML | Cada snapshot contiene Belief + Decision completos | M-4, M-8 |
| P4-ML | La ventana está definida (turno inicial, turno final, o cantidad de turnos) | — |
| P5-ML | conversationId está disponible como clave de partición | M-6 |
| P6-ML | El pipeline del EE no está en ejecución (Memory no se consulta durante el pipeline) | M-2 |

### Postcondiciones

| # | Postcondición | Derivación |
|---|--------------|-----------|
| Q1-ML | Pattern Discovery recibe `W = (s₁, ..., sₙ)` con n ≥ 1 | PR-7B §1.4 |
| Q2-ML | Todos los snapshots son inmutables (Pattern Discovery no puede modificarlos) | M-5 |
| Q3-ML | La secuencia está particionada por conversationId | M-6 |
| Q4-ML | Los 11 campos analizables (subconjunto de los 19 campos del MemorySnapshot) están presentes en cada snapshot | PR-7B §1.1 |

### Invariantes durante la transferencia

| # | Invariante | Violación |
|---|-----------|-----------|
| I1-ML | Memory no modifica los snapshots mientras los sirve | M-5 |
| I2-ML | Memory no computa derivaciones sobre los datos servidos | M-9, M-13 |
| I3-ML | Pattern Discovery no escribe en Memory | M-1, M-3 |
| I4-ML | Pattern Discovery no retroalimenta el pipeline del EE | M-3 |

### Información

| Categoría | Contenido | Cardinalidad |
|-----------|-----------|-------------|
| **Obligatoria** | Secuencia ordenada de snapshots completos (Belief + Decision) | n ≥ 1 |
| **Obligatoria** | conversationId (clave de partición) | 1 |
| **Obligatoria** | turnNumber por snapshot (para verificar monotonicidad) | n |
| **Obligatoria** | storedAt por snapshot (para verificar orden temporal) | n |
| **Opcional** | Metadatos de ventana (startTime, endTime, tamaño) | 0-1 |
| **Opcional** | Metadatos de conversación (duración, cantidad de mensajes) | 0-1 |
| **Prohibida** | Datos operacionales (session state, pricing, dispatch) | 0 |
| **Prohibida** | Estado interno de Memory (índices, ubicaciones de almacenamiento) | 0 |
| **Prohibida** | Mensajes crudos de la conversación (texto del usuario) | 0 |

### Garantías mutuas

| Memory garantiza | Pattern Discovery garantiza |
|-----------------|-------------------|
| Integridad: todos los campos presentes | Solo lectura: no modifica snapshots |
| Orden: turnNumber monótono | Sin feedback: no escribe en Memory |
| Completitud: Belief + Decision por snapshot | Sin retroalimentación al EE |
| Inmutabilidad: snapshots no cambian durante la consulta | Ciclo de vida acotado: no retiene referencias |

### Causas válidas de rechazo

| Causa | Síntoma | Acción |
|-------|---------|--------|
| Ventana vacía (n=0) | No hay datos para aprender | Rechazar; Pattern Discovery no produce claims |
| Snapshot incompleto | Falta Belief o Decision | Rechazar; viola M-4 |
| turnNumber no monótono | secuencia desordenada | Rechazar; viola M-7 |
| conversationId ausente | No se puede particionar | Rechazar; viola M-6 |
| snapshot no inmutable | Cambia durante la consulta | Rechazar; viola M-5 |

---

## Contrato 2: Pattern Discovery → Goals

### Frontera

Pattern Discovery entrega un conjunto de claims M a Goals. Es la salida de la función L.

```
Pattern Discovery ──M──→ Goals
```

### Del modelo matemático

```
M = L_γ(W) = {c₁, c₂, ..., cₖ} con k ≥ 0
c = ⟨P, θ, E⟩ ∈ 𝒞
P: predicado de segundo orden sobre W^k (tipo de regularidad)
θ ∈ [0, 1]: confianza
E ⊆ W^k: evidencia (opcional en este contrato)
```

### Precondiciones

| # | Precondición | Fuente |
|---|-------------|--------|
| P1-LG | Pattern Discovery ha sido invocado con W válido y γ ∈ Γ | PR-7B §4.1 |
| P2-LG | L_γ(W) ha completado su ejecución | — |
| P3-LG | El conjunto M está completamente generado (no parcial) | — |
| P4-LG | Goals puede interpretar P (conoce la taxonomía de predicados) | — |

### Postcondiciones

| # | Postcondición | Derivación |
|---|--------------|-----------|
| Q1-LG | Goals recibe M ⊆ 𝒞 con k ≥ 0 | PR-7B §4.1 |
| Q2-LG | Cada c = ⟨P, θ, E⟩ está bien formado | PR-7B §3.1 |
| Q3-LG | Los claims son inmutables (Goals no los modifica) | PR-7B §6.1 |
| Q4-LG | θ ∈ [0, 1] para cada claim | PR-7C §B.5.3 |
| Q5-LG | Si E está presente, E ⊆ W^k para el W original | PR-7C §B.2.3 |

### Invariantes

| # | Invariante | Violación |
|---|-----------|-----------|
| I1-LG | Pattern Discovery no modifica claims después de producirlos | Pureza (PR-7B §6.1) |
| I2-LG | Goals no escribe en Pattern Discovery | Unidireccionalidad del pipeline |
| I3-LG | Goals no puede modificar claims | Inmutabilidad (PR-7B §6.1) |
| I4-LG | El conjunto M es completo para (W, γ) dado | L es función pura |
| I5-LG | Dos invocaciones con mismo (W, γ) producen mismo M | Determinismo (PR-7B §6.2) |

### Información

| Categoría | Contenido | Justificación |
|-----------|-----------|--------------|
| **Obligatoria** | P (predicado): descripción de la regularidad detectada | Sin P, Goals no sabe qué ocurrió |
| **Obligatoria** | θ (confianza): valor en [0,1] | Sin θ, Goals no sabe qué tan confiable es |
| **Obligatoria** | τ (tipo de regularidad): estado, transición, tendencia, dependencia | Goals necesita saber qué tipo de claim es |
| **Opcional** | E (evidencia): subconjunto de W^k | Goals no necesita la evidencia para decidir, pero puede usarla para depuración |
| **Opcional** | γ_id: identificador de la configuración que produjo el claim | Útil si Goals necesita distinguir entre fuentes |
| **Opcional** | Referencia a la ventana W (window_id) | Para trazabilidad |
| **Prohibida** | Snapshots crudos de Memory | Goals no debe acceder a Memory a través de Pattern Discovery |
| **Prohibida** | Datos operacionales | Fuera del dominio cognitivo |
| **Prohibida** | γ completo (todos los parámetros) | Goals no necesita la configuración interna |

### Garantías mutuas

| Pattern Discovery garantiza | Goals garantiza |
|-------------------|-----------------|
| Validez: los claims son correctos para (W, γ) | Solo lectura: no modifica claims |
| Inmutabilidad: los claims no cambian | Interpretación correcta de P según taxonomía |
| Completitud: M es el conjunto completo para (W, γ) | Sin re-escritura: no retroalimenta a Pattern Discovery |
| Pureza: misma entrada produce misma salida | Decisión basada en claims, no en supuestos externos |

### Causas válidas de rechazo

| Causa | Síntoma | Acción |
|-------|---------|--------|
| θ fuera de [0,1] | θ = -0.3 o θ = 1.5 | Rechazar claim; viola postcondición Q4-LG |
| P mal formado | Predicado ininterpretable | Rechazar claim; viola Q2-LG |
| E referencia snapshots inexistentes | (solo si E está presente) | Rechazar claim; evidencia no verificable |
| Claims contradictorios en M | c₁ afirma "readiness sube" y c₂ afirma "readiness baja" sobre misma ventana | Goals decide cómo manejar (no es error de Pattern Discovery per se, pero Goals puede rechazar el lote) |

---

## Contrato 3: Pattern Discovery → Auditoría

### Frontera

Un auditor (humano o sistema) verifica que un claim producido por Pattern Discovery es correcto.

```
Pattern Discovery ──⟨c, γ, timestamp⟩──→ Auditoría
```

Este contrato es de **solo lectura retrospectiva**. El auditor no interactúa con Pattern Discovery en tiempo real.

### Del modelo matemático

```
c = ⟨P, θ, E⟩  con E ⊆ W^k
γ ∈ Γ que produjo c
W: ventana original (o accesible)
```

### Precondiciones

| # | Precondición | Fuente |
|---|-------------|--------|
| P1-LA | El claim c existe y fue producido por L_γ(W) | — |
| P2-LA | γ_version está disponible (identificador de la configuración) | PR-7C §A.6 |
| P3-LA | La ventana original W está disponible O E contiene referencias suficientes para reconstruir la verificación | PR-7C §B.8 |
| P4-LA | El timestamp de producción está disponible | — |

### Postcondiciones

| # | Postcondición | Derivación |
|---|--------------|-----------|
| Q1-LA | El auditor puede verificar ∀e ∈ E: P(e) = true | PR-7C §B.6.2 |
| Q2-LA | El auditor puede verificar que θ = |E| / |W^k_τ| (dada la función de confianza de γ) | PR-7C §B.5.3 |
| Q3-LA | El auditor puede confirmar que L_γ(W) produciría c (reproducibilidad) | PR-7B §6.2 |
| Q4-LA | La auditoría queda registrada (append-only, no modificable) | — |

### Invariantes

| # | Invariante | Violación |
|---|-----------|-----------|
| I1-LA | El registro de auditoría es append-only (nunca se modifica un registro existente) | — |
| I2-LA | La verificación es determinista (mismo c, mismo W, mismo γ → mismo resultado de verificación) | PR-7B §6.2 |
| I3-LA | El auditor no modifica el claim ni su evidencia | Solo lectura |
| I4-LA | El resultado de la auditoría (PASS/FAIL) se registra junto con el claim | — |

### Información

| Categoría | Contenido | Justificación |
|-----------|-----------|--------------|
| **Obligatoria** | c completo = ⟨P, θ, E⟩ | Sin el claim completo no hay qué auditar |
| **Obligatoria** | γ_version (hash o identificador) | Sin γ no se puede reproducir |
| **Obligatoria** | Timestamp de producción | Para correlación temporal |
| **Obligatoria** | W completa (o referencia a almacenamiento permanente) | Sin W no se puede verificar E |
| **Obligatoria** | τ (tipo de regularidad) | Define la aridad k y la regla de extracción ε_τ |
| **Opcional** | Logs intermedios de Detect_γ (candidatos antes de Select_γ) | Para depuración de falsos negativos |
| **Opcional** | Decisiones de Select_γ (por qué se incluyó/excluyó cada claim) | Para auditar la selección |
| **Prohibida** | Secretos operacionales (API keys, tokens de base de datos) | Seguridad |
| **Prohibida** | PII de mensajes originales (texto del usuario) | Privacidad |

### Garantías mutuas

| Pattern Discovery garantiza | Auditoría garantiza |
|-------------------|---------------------|
| Producción correcta: el claim fue generado por L_γ(W) | Verificación independiente: usa el mismo modelo matemático |
| Trazabilidad: E ⊆ W^k es verificable | Registro inmutable: no modifica claims |
| Reproducibilidad: L_γ(W) = M reproducible | No alteración: no modifica evidencia |

### Causas válidas de rechazo

| Causa | Demostración | Acción |
|-------|-------------|--------|
| Evidencia falsa | ∃e ∈ E: P(e) = false | RECHAZAR — claim inválido |
| Confianza incorrecta | θ ≠ |E|/|W^k_τ| | RECHAZAR — error de cómputo |
| γ no disponible | γ_version no corresponde a ningún γ registrado | RECHAZAR — no reproducible |
| W no disponible | No se puede verificar E contra W original | RECHAZAR — no verificable |
| Claim no reproducible | L_γ(W) no produce c | RECHAZAR — origen no verificado |

---

## Contrato 4: Pattern Discovery → Runtime

### Frontera

El runtime invoca la función L con parámetros específicos. Este contrato define las condiciones de ejecución.

```
Runtime ──(W, γ)──→ Pattern Discovery ──M──→ Runtime
```

### Del modelo matemático

```
L_γ(W) = M
γ = (γ_detect, γ_select, γ_compute) ∈ Γ
Runtime provee: W (datos), γ (configuración), flag de shadow mode
```

### Precondiciones

| # | Precondición | Fuente |
|---|-------------|--------|
| P1-LR | Runtime tiene acceso a Memory para obtener W | — |
| P2-LR | Runtime dispone de un γ ∈ Γ válido | PR-7C §A.1 |
| P3-LR | El feature flag de Pattern Discovery está habilitado (EVIDENCE_SHADOW_MODE o similar) | I5-EE |
| P4-LR | Los recursos de cómputo necesarios están disponibles (CPU, memoria, tiempo) | — |
| P5-LR | conversationId está disponible para particionar la consulta | M-6 |

### Postcondiciones

| # | Postcondición | Derivación |
|---|--------------|-----------|
| Q1-LR | L_γ(W) produce M = {c₁, ..., cₖ} | PR-7B §4.1 |
| Q2-LR | La ejecución es pura: cero efectos laterales | PR-7B §6.1 |
| Q3-LR | La ejecución es determinista: misma (W, γ) → mismo M | PR-7B §6.2 |
| Q4-LR | La ejecución no afecta la conversación (Shadow Mode) | I5-EE |
| Q5-LR | La ejecución no persiste datos en DB operacional | I4-EE |
| Q6-LR | M se entrega al llamante (Runtime) | — |

### Invariantes

| # | Invariante | Violación |
|---|-----------|-----------|
| I1-LR | Pattern Discovery no produce side effects | I5-EE, M-3 |
| I2-LR | Pattern Discovery no escribe en Memory | M-1, M-3 |
| I3-LR | Pattern Discovery no escribe en DB operacional | I4-EE |
| I4-LR | Pattern Discovery no envía mensajes | I5-EE |
| I5-LR | Pattern Discovery no modifica el pipeline del EE | I6-EE, M-3 |
| I6-LR | Pattern Discovery no retiene estado entre invocaciones (en modelo mínimo) | PR-7B §8.4 |

### Información

| Categoría | Contenido | Justificación |
|-----------|-----------|--------------|
| **Obligatoria** | W (secuencia de snapshots) | Sin W no hay entrada |
| **Obligatoria** | γ (configuración completa de Pattern Discovery) | Sin γ la función está subdeterminada |
| **Obligatoria** | Feature flag (habilitado/deshabilitado) | Controla si Pattern Discovery se ejecuta |
| **Opcional** | Contexto de ejecución (request_id, correlation_id) | Para trazabilidad distribuida |
| **Opcional** | Presupuesto de recursos (timeout, memoria máxima) | Para control de calidad de servicio |
| **Opcional** | Nivel de logging (debug, info, error) | Para diagnóstico |
| **Prohibido** | Acceso a servicios operacionales (pricing, dispatch) | Fuera del dominio cognitivo |
| **Prohibido** | Acceso a canales de salida (WhatsApp, web) | I5-EE |
| **Prohibido** | Modificación de estado global | Pureza (PR-7B §6.1) |

### Garantías mutuas

| Runtime garantiza | Pattern Discovery garantiza |
|------------------|-------------------|
| W válido: secuencia ordenada, completa, con conversationId | Pureza: sin efectos laterales |
| γ ∈ Γ válido: configuración consistente | Determinismo: misma entrada → misma salida |
| Shadow Mode respetado: no se espera efecto en conversación | Sin IO: no escribe, no envía, no persiste |
| Recursos suficientes: tiempo y memoria para completar | Bounded execution: completa en tiempo finito |

### Causas válidas de rechazo

| Causa | Síntoma | Acción |
|-------|---------|--------|
| γ ∉ Γ | Configuración inválida o incompleta | No ejecutar L |
| W inválido | Snapshots incompletos, no monótonos, o vacíos | No ejecutar L |
| Feature flag deshabilitado | Pattern Discovery no debe ejecutarse | No ejecutar L (éxito silencioso) |
| Recursos insuficientes | Timeout o memoria agotada | Abortar ejecución, reportar error |
| conversationId ausente | No se puede particionar | No ejecutar L |

---

## Mapa de contratos

```
                     ┌─────────────────────────────┐
                     │         CONTRATO 4          │
                     │      Pattern Discovery → Runtime     │
                     │  (W, γ) ──→ L ──→ M        │
                     └───────────┬─────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                   ▼
   ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
   │   CONTRATO 1     │ │   CONTRATO 2     │ │   CONTRATO 3     │
    │ Memory → Pattern Discovery│ │ Pattern Discovery → Goals │ │Pattern Discovery → Auditoría│
   │     W (datos)    │ │   M = {c@...}    │ │  ⟨c, γ, ts, W⟩   │
   └──────────────────┘ └──────────────────┘ └──────────────────┘
```

| Contrato | Dirección | Información clave | γ visible? |
|----------|-----------|-------------------|-----------|
| 1. Memory → Pattern Discovery | Memory → L | W (snapshots ordenados) | No |
| 2. Pattern Discovery → Goals | L → Goals | M (conjunto de claims) | No (opcional) |
| 3. Pattern Discovery → Auditoría | L → Auditor | ⟨c, γ, ts, W⟩ (para verificar) | **Sí** |
| 4. Pattern Discovery → Runtime | Runtime ↔ L | (W, γ) → M (ejecución) | **Sí** (parámetro) |

---

## Consistencia entre contratos

### Cambio de tipo a través de los contratos

Cada contrato cruza una frontera donde el tipo de información cambia:

```
Memory ──W (estados 1er orden)──→ [Contrato 1]
                                    Pattern Discovery transforma: L_γ(W) = M
[Contrato 2] ──M (claims 2do orden)──→ Goals
[Contrato 3] ──⟨c,γ,ts,W⟩ (verificación)──→ Auditoría
[Contrato 4] ──(W,γ)↦M (ejecución)──→ Runtime
```

El salto ontológico (1er orden → 2do orden) ocurre DENTRO de Pattern Discovery, entre el Contrato 1 y el Contrato 2. Los contratos reflejan este salto: el Contrato 1 habla de snapshots; el Contrato 2 habla de claims.

### γ a través de los contratos

| Contrato | γ está presente | Como |
|----------|---------------|------|
| 1. Memory → Pattern Discovery | ❌ Ausente | Memory no conoce γ |
| 2. Pattern Discovery → Goals | ❌ Ausente (opcional) | Goals consume claims, no configuración |
| 3. Pattern Discovery → Auditoría | ✅ Presente | Necesario para reproducibilidad |
| 4. Pattern Discovery → Runtime | ✅ Presente | Como parámetro de ejecución |

### E a través de los contratos

| Contrato | E está presente | Como |
|----------|---------------|------|
| 1. Memory → Pattern Discovery | ❌ No aplica | W contiene los datos; E se deriva internamente |
| 2. Pattern Discovery → Goals | ❌ Ausente (opcional) | Goals no necesita E para decidir |
| 3. Pattern Discovery → Auditoría | ✅ Presente | E es esencial para verificación |
| 4. Pattern Discovery → Runtime | ❌ No aplica | E es resultado de L, no insumo |

---

## Relación con invariantes existentes

### Invariantes de ADR-009 (EE) relevantes

| Invariante | Contratos que la preservan |
|-----------|---------------------------|
| I1-EE — Pipeline completeness | 1 (Memory sirve datos completos), 4 (Pattern Discovery se ejecuta completo) |
| I2-EE — Immutability | 1 (snapshots inmutables), 2 (claims inmutables) |
| I3-EE — Temporal monotonicity | 1 (turnNumber monótono) |
| I4-EE — No persistence | 4 (Pattern Discovery no persiste) |
| I5-EE — No conversation impact | 4 (Shadow Mode) |
| I6-EE — Single authority | 1 (datos vienen de EE, no de operaciones) |

### Invariantes de ADR-010 (Memory) relevantes

| Invariante | Contratos que la preservan |
|-----------|---------------------------|
| M-1 — Append-only | 1 (Pattern Discovery no escribe) |
| M-2 — Read-only durante EE | 1 (Memory no se consulta durante pipeline) |
| M-3 — No feedback a EE | 1, 4 (Pattern Discovery no retroalimenta) |
| M-4 — Turno completo | 1 (solo snapshots completos) |
| M-5 — Inmutable | 1 (snapshots no cambian) |
| M-6 — Particionado | 1 (conversationId como clave) |
| M-7 — Monotónico | 1 (turnNumber ordenado) |
| M-13 — Sin precomputación de deltas | 1, 4 (δ es interno de Pattern Discovery) |

---

## Resumen de obligaciones por rol

| Rol | Obligaciones |
|-----|-------------|
| **Memory** | Proveer W: secuencia ordenada, completa, inmutable, particionada |
| **Pattern Discovery** | Transformar W → M: pura, determinista, sin efectos, trazable |
| **Goals** | Consumir M: solo lectura, interpretación correcta de P y θ |
| **Auditoría** | Verificar c contra (W, γ): reproducción, verificación de E y θ |
| **Runtime** | Proveer (W, γ): válidos, con recursos suficientes, shadow mode |

---

*Este documento es resultado de la auditoría PR-7D. No contiene APIs, DTOs, clases ni interfaces de código. Deriva exclusivamente contratos semánticos del modelo matemático cerrado en PR-7A, PR-7B y PR-7C.*
