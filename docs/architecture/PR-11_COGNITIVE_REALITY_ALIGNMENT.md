# PR-11 — Cognitive Architecture Reality Alignment Audit

**Estado:** Documento de auditoría  
**Fecha:** 2026-07-13  
**Driver:** Resolver la divergencia entre arquitectura declarada, implementada y futura detectada en S1A.

---

## Regla metodológica

- No asumir que la arquitectura documentada es correcta.
- No asumir que el código existente es correcto.
- Ambos son hipótesis que deben compararse.

### Categorías de clasificación

| Código | Significado |
|--------|-------------|
| **A** | Existe actualmente y está correctamente implementado. |
| **B** | Existe conceptualmente pero falta implementación. |
| **C** | Existe en código pero pertenece a otro dominio. |
| **D** | Fue una abstracción incorrecta y debe eliminarse. |

---

## Auditoría 1 — Evidence Engine

### 1.1 ¿Qué produce realmente EE?

El EE produce 7 objetos cognitivos por turno en `runShadowCognition()`:

```
Signal → Observation → Fact[] → Evidence → Knowledge → Belief → Decision
```

Cada objeto es un Value Object inmutable, construido mediante builders protegidos por feature flag `EVIDENCE_SHADOW_MODE`. 378 tests unitarios verifican su corrección.

**Veredicto: El EE produce objetos cognitivos correctamente construidos.**

### 1.2 ¿Cuál es su contrato de salida actual?

El contrato de salida documentado (ADR-009) dice que `ShadowResult` es consumido por Memory. El contrato de salida **real** es:

| Aspecto | Documentado | Real |
|---------|-------------|------|
| Output type | `ShadowResult` (contiene Belief + Decision) | `ShadowResult` (7 objetos) |
| Consumidor | Memory (ADR-010) | **Ninguno** — descartado en lead.service.ts:83 |
| Persistencia | Memory preserva snapshots | **Ninguna** — ShadowResult es GC-collected |
| Trazabilidad temporal | `storedAt` en snapshot | **Ninguna** — solo existe `consolidatedAt`/`createdAt` en memoria volátil |

**Hallazgo:** El contrato de salida documentado describe un consumidor que no existe y una persistencia que no ocurre. El contrato real es: "produce objetos que se descartan inmediatamente."

### 1.3 ¿Quién consume ese resultado?

**Nadie.** Verificación exhaustiva:
- `lead.service.ts:83` — llama a `runShadowCognition()` sin capturar el retorno
- Ningún otro archivo en `src/` importa `ShadowResult` desde `lead.service.ts`
- `src/lib/services/` no tiene referencias a `ShadowResult`, `Belief` (cognitivo), ni `Decision` (cognitivo)
- `src/lib/services/learning/` opera con `LearningDecision` (operacional), no con `Decision` (cognitivo)

### 1.4 ¿Existe persistencia?

**No.** `ShadowResult` existe solo en memoria. No hay:
- Escritura a DB
- Archivo de log persistente
- Feature flag `COGNITIVE_MEMORY_ENABLED`
- Código en `src/lib/memory/`

### 1.5 ¿Existe trazabilidad temporal?

**Solo en memoria volátil.** Los objetos tienen timestamps (`receivedAt`, `consolidatedAt`, `createdAt`) pero se pierden cuando termina el request. No hay acumulación histórica.

### 1.6 Clasificación

| Elemento | Categoría | Justificación |
|----------|-----------|---------------|
| Entidades del EE (Signal, Observation, Fact, Evidence, Knowledge, Belief, Decision) | **A** | Existen, correctamente implementados, 378 tests |
| Builders (buildSignal, buildObservation, etc.) | **A** | Existen, correctamente implementados |
| `runShadowCognition()` como función | **A** | Existe, correctamente implementada |
| `runShadowCognition()` como pipeline EE → Memory | **D** | Abstracción incorrecta: no hay conexión a Memory. El output se descarta. |
| ShadowResult como contrato entre EE y Memory | **D** | Abstracción incorrecta: no hay consumidor. |

---

## Auditoría 2 — Memory (cognitiva, ADR-010)

### 2.1 ¿Memory es una necesidad arquitectónica demostrada?

**Argumentos a favor:**
- El EE produce conocimiento efímero que se pierde entre turnos
- Sin persistencia, no hay base histórica para detección de patrones
- SessionMemory operacional persiste datos de sesión pero no datos cognitivos

**Argumentos en contra:**
- No existe evidencia empírica de que los datos cognitivos (Belief + Decision) sean útiles para decisión operacional
- El sistema opera actualmente sin persistencia cognitiva
- SessionMemory ya persiste datos relevantes (intent, slots, etc.)
- El EE mismo podría extenderse para agregar persistencia sin capa separada

**Veredicto:** Memory es una necesidad **potencial** pero no **demostrada**. No hay evidencia de que Belief + Decision tengan valor predictivo o decisional. La necesidad se afirma, no se prueba.

### 2.2 ¿Qué problema resuelve que EE no pueda resolver?

EE está congelado con I4-EE ("no persistence"). Memory existe para resolver la falta de persistencia. Pero esta restricción podría eliminarse:

- **Opción 1:** Memory como capa separada (arquitectura actual)
- **Opción 2:** Modificar I4-EE para permitir persistencia en Decision
- **Opción 3:** Delegar persistencia al sistema operacional (extender SessionMemory)

Las tres resuelven el mismo problema. Memory como capa separada es una de múltiples soluciones, no la única.

### 2.3 ¿Cuál es la mínima implementación necesaria?

En orden creciente de complejidad:

1. **Mínimo absoluto**: Capturar `ShadowResult` en lead.service.ts y escribirlo como JSON en una tabla DB. Sin capa Memory. Sin invariantes.
2. **Mínimo con capa**: Implementar `memoryService.store()` como define ADR-010. 14 invariantes.
3. **Mínimo con consumo**: Implementar Memory + Learning.

Actualmente no existe ninguno. Ni siquiera el mínimo absoluto.

### 2.4 ¿Qué invariantes siguen siendo válidos aunque no exista código?

| ID | Invariante | ¿Válido sin código? | Observación |
|----|-----------|---------------------|-------------|
| M-1 | Append-only | ✅ Válido por definición | Se cumplirá si se implementa |
| M-2 | Read-only durante EE | ✅ Válido por definición | EE y Memory no coexisten |
| M-3 | No feedback a EE | ✅ Válido por definición | No hay feedback sin implementación |
| M-4 | Full turn only | ❌ No verificable | Sin implementación, no hay guard |
| M-5 | Immutable | ✅ Válido por definición | Patrón de Object.freeze |
| M-6 | Partitioned by conversation | ❌ No verificable | Sin DB schema |
| M-7 | Monotonic turnNumber | ❌ No verificable | Sin contador |
| M-8 | Atomic snapshot | ❌ No verificable | Sin constructor |
| M-9 | No enrichment | ✅ Válido por definición | Principio de diseño |
| M-10 | Projection stability | ❌ No verificable | Sin código que proyecte |
| M-11 | No operational state | ✅ Válido por definición | Sin implementación |
| M-12 | No defaults | ❌ No verificable | Sin construcción |
| M-13 | No delta precomputation | ✅ Válido por definición | Sin implementación |
| M-14 | Temporal domain separation | ❌ No verificable | Sin código |

**Solo 6/14 invariantes son verificables sin código.** El resto son aspiraciones.

### 2.5 Clasificación

| Elemento | Categoría | Justificación |
|----------|-----------|---------------|
| ADR-010 (concepto de Memory) | **B** | Existe conceptualmente, sin implementación |
| Memory como necesidad demostrada | **D parcial** | Necesidad afirmada pero no probada empíricamente |
| 14 invariantes de Memory | **B** | Válidos como diseño, 8/14 no verificables sin código |

---

## Auditoría 3 — Learning cognitivo (PR-7) vs. Learning operacional (ADR-003)

### 3.1 Separación explícita

| Dimensión | Learning operacional (ADR-003) | Learning cognitivo (PR-7) |
|-----------|-------------------------------|--------------------------|
| **Ubicación** | `src/lib/services/learning/` | No existe |
| **Input** | Oportunidades de viaje (scored opportunities) | Ventana de snapshots de Memory |
| **Output** | `LearningDecision` (ranked opportunities) | `Pattern[]` (⟨P,θ,E⟩) |
| **Propósito** | Decidir qué oportunidad ofrecer | Descubrir regularidades cognitivas |
| **Consumidor** | Policy pipeline | Goals (eliminado) / API pública |
| **Estado** | ✅ Implementado, 15 archivos | ❌ No implementado |
| **¿Produce conocimiento?** | Produce decisiones operacionales | Produciría conocimiento de segundo orden |
| **¿Es prescriptivo?** | Sí — prescribe qué oportunidad elegir | No — describe regularidades |

### 3.2 ¿Existe realmente el dominio Pattern Discovery?

**No como código.** Pattern Discovery existe solo en documentos (PR-7A a PR-7G). No hay:
- Algoritmos de detección de patrones
- Consumidores de Patterns
- Infraestructura de datos (Memory) que lo alimente

### 3.3 ¿Existe consumidor?

**No.** El consumidor documentado era Goals (eliminado en PR-8). El consumidor actual sería la API pública de Learning, pero esa API no existe.

### 3.4 ¿Existe necesidad independiente?

**No demostrada.** El sistema opera actualmente con Learning operacional que:
- Detecta oportunidades
- Aplica políticas
- Simula resultados
- Adapta pesos según resultados

No hay evidencia de que Pattern Discovery cognitivo agregue valor no cubierto por el sistema actual. La necesidad se afirma desde la teoría, no desde la práctica.

### 3.5 ¿Debe coexistir con el learning operacional?

Los dominios son ortogonales:

```
Learning operacional:    fare learning, routing optimization → policy decisions
Learning cognitivo:      pattern discovery on cognitive data → (sin consumidor)
```

No compiten, pero tampoco se necesitan mutuamente. Podrían coexistir si el cognitivo tuviera un consumidor real. Actualmente no lo tiene.

### 3.6 ¿El nombre compartido genera riesgo arquitectónico?

**SÍ, riesgo confirmado.** Evidencia:

1. `src/lib/services/learning/` es el Learning operacional, pero por su nombre es fácil confundirlo con el Learning cognitivo
2. PR-7E (Learning Identity Audit) documentó esta confusión y recomendó renombrar a "Cognitive Pattern Discovery"
3. Sin embargo, los documentos posteriores (PR-8, PR-9, PR-10) siguen usando "Learning" para referirse al cognitivo
4. Un desarrollador que lea la documentación pensará que `src/lib/services/learning/` implementa el pipeline cognitivo — y no es así

**Riesgo concreto:** Alguien podría intentar conectar el EE al Learning operacional, contaminando ambos dominios.

### 3.7 Clasificación

| Elemento | Categoría | Justificación |
|----------|-----------|---------------|
| Learning operacional (`src/lib/services/learning/`) | **C** | Existe en código, pertenece al dominio operacional (no cognitivo) |
| Pattern Discovery (PR-7, cognitivo) | **B** | Existe conceptualmente, sin implementación |
| Pattern Discovery como necesidad independiente | **D parcial** | Necesidad no demostrada empíricamente |
| Nombre "Learning" compartido | **D** | Riesgo arquitectónico documentado pero no resuelto |
| Goals/Planning (eliminados) | **D** | Eliminados como capas cognitivas, pero sus funciones persisten sin modelar dentro del Learning operacional (policy-engine = Planning, adaptation = Goals) |

---

## Auditoría 4 — Pipeline real vs. documentado

### 4.1 Diagrama del estado actual implementado

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PIPELINE OPERACIONAL (flujo real del sistema)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mensaje entrante (WhatsApp Webhook)
    │
    ▼
[{dev commands}] ──→ early return
    │
    ▼
[{admin/driver commands}] ──→ early return
    │
    ▼
[conversation setup] ──→ session + history + workflow
    │
    ▼
[{opportunity response}] ──→ early return
    │
    ├──→ [EE SHADOW MODE] → (output discarded) ←── paralelo, sin efecto
    │
    ▼
[buildMemory()] ──→ SessionMemory (intent, entities, slots)
    │
    ▼
[core()] ──→ Intent + Facts
    │
    ▼
[conversation interpreter] ──→ classification (message role)
    │
    ├──→ [GREETING shortcut] ──→ policy pipeline → response
    ├──→ [slot confirmation buttons] ──→ handler → response
    ├──→ [slot confirmation text] ──→ handler → response
    ├──→ [awaiting_passenger] ──→ handler → response
    ├──→ [awaiting_confirmation] ──→ handler → response
    ├──→ [ambiguity handler] ──→ resolution → response
    └──→ [post-booking] ──→ policy pipeline → response
    │
    ▼
[predictive routing] ──→ entity predictions
    │
    ▼
[comprehension check] ──→ halt detection
    │
    ▼
[extraction pipeline] ──→ slots + pricing + workflow
    │
    ▼
[policy pipeline] ──→ decision + LLM prompt + response
    │
    ▼
Respuesta al usuario
```

### 4.2 Diagrama del estado arquitectónico objetivo (documentado)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PIPELINE COGNITIVO (documentado, no implementado)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mensaje entrante
    │
    ▼
[Evidence Engine] ──→ Belief + Decision
    │
    ▼
[Memory] ──→ MemorySnapshot (append-only, persistido)
    │
    ▼
[Learning] ──→ Pattern[] (⟨P,θ,E⟩)
    │
    ▼
[API pública] ──→ Patrones disponibles para el sistema operacional
    │
    ▼
[Sistema Operacional] ──→ consume Patterns para informar decisiones

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PIPELINE OPERACIONAL (independiente)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Mensaje] → [Core] → [Extraction] → [Policy] → [LLM] → [Response]
```

### 4.3 Divergencias identificadas

| # | Punto | Documentado | Real |
|---|-------|-------------|------|
| **D1** | Conexión EE → Memory | `ShadowResult` fluye a `memoryService.store()` | Output descartado. No hay captura. |
| **D2** | Memory como capa | Código en `src/lib/memory/` | No existe. 0 archivos. |
| **D3** | Learning cognitivo | Código de Pattern Discovery | No existe. Learning operacional es otro sistema. |
| **D4** | Consumidor de Patterns | Goals (luego API pública) | Goals eliminado. API no existe. |
| **D5** | ShadowResult capturado | `const shadowResult = runShadowCognition(...)` | `runShadowCognition(...)` sin asignación |
| **D6** | Invariantes M-1 a M-14 | Verificables en código | 8/14 no verificables sin implementación |
| **D7** | Learning operacional como cognitivo | Documentación lo trata como capa separada pero comparte nombre | Riesgo de confusión confirmado |
| **D8** | Goals/Planning eliminadas | No existen como capas | Sus funciones persisten dentro de Learning operacional sin modelar |

---

## Auditoría 5 — Decisión de alineamiento

### 5.1 Síntesis de clasificaciones

| Elemento | Categoría |
|----------|:---------:|
| **EE** — entidades y builders (Signal, Observation, Fact, Evidence, Knowledge, Belief, Decision) | **A** ✅ |
| **EE** — `runShadowCognition()` como función | **A** ✅ |
| **EE** — `runShadowCognition()` como nexo con Memory | **D** ❌ |
| **EE** — ShadowResult como contrato inter-capa | **D** ❌ |
| **Memory** (ADR-010) — concepto | **B** ⏳ |
| **Memory** — 14 invariantes | **B** ⏳ |
| **Learning cognitivo** (PR-7, Pattern Discovery) | **B** ⏳ |
| **Learning operacional** (`src/lib/services/learning/`) | **C** 🔄 |
| **Nombre "Learning" compartido** | **D** ❌ |
| **Goals/Planning como capas cognitivas** | **D** ❌ |
| **Goals/Planning functions in Learning operacional** | **C** 🔄 |

### 5.2 Veredicto

## **B — La arquitectura debe documentarse como futura, no existente.**

### 5.3 Justificación

La arquitectura cognitiva documentada (EE → Memory → Learning → API) describe correctamente un **sistema futuro deseado**, no el sistema actual. La divergencia no es por errores de implementación sino por **presentación**: la documentación trata lo aspiracional como si fuera real.

**Problema fundamental:** Los documentos dicen "el pipeline es EE → Memory → Learning" cuando la realidad es "el pipeline podría ser EE → Memory → Learning si se implementan Memory y Learning, y si se captura el output del EE."

### 5.4 Resolución requerida

La contradicción detectada en S1A se resuelve aceptando el veredicto B y aplicando los siguientes cambios:

**1. Renombrar el Learning cognitivo a "Pattern Discovery" (PD)**

El nombre "Learning" está contaminado. El servicio operacional `src/lib/services/learning/` ya ocupó ese nombre. El Pattern Discovery cognitivo debe llamarse explícitamente **Pattern Discovery** o **Cognitive Pattern Discovery** en toda la documentación, eliminando la ambigüedad.

**2. Separar la documentación en dos planos: presente y futuro**

| Plano | Qué contiene |
|-------|-------------|
| **Presente** | EE como observador shadow mode. Pipeline operacional como flujo real. |
| **Futuro** | Memory + Pattern Discovery como extensiones posibles, no como realidad actual. |

**3. Capturar el output del EE (acción mínima)**

El cambio más pequeño que reconecta la arquitectura es capturar `ShadowResult`:

```
  // lead.service.ts línea 82-84
  let shadowResult = null;
  if (isEvidenceShadowModeEnabled()) {
-   runShadowCognition({ text, phone, conversationId: conversation.id });
+   shadowResult = runShadowCognition({ text, phone, conversationId: conversation.id });
  }
```

Esto no implementa Memory. Pero **elimina la contradicción** entre la documentación y el código: el EE produce output que ES capturado, aunque todavía no sea persistido.

**4. Mover Goals/Planning functions del Learning operacional a su propia documentación**

Las funciones de policy-engine (Planning-like) y adaptation (Goals-like) dentro de `src/lib/services/learning/` deben documentarse explícitamente como parte del sistema operacional, no como remanentes del pipeline cognitivo. El Learning operacional debe renombrarse a "Operational Optimization Engine" para eliminar la confusión.

### 5.5 Postergaciones deliberadas

No se decide aquí:
- Si Memory debe implementarse (requiere PR separado con evidencia de necesidad)
- Si Pattern Discovery debe implementarse (requiere PR separado con evidencia de necesidad)
- Si la arquitectura futura debe ser 3 capas o 2 capas o pipeline único
- Qué diseño debe tener Memory o Pattern Discovery

### 5.6 Acciones inmediatas (próximo paso)

1. ✅ S1A completada (contradicción detectada)
2. ✅ PR-11 completada (alineamiento diagnosticado, veredicto B emitido)
3. **⬜ PR-11A**: Aplicar cambios de documentación (separar presente/futuro)
4. **⬜ PR-11B**: Capturar ShadowResult en lead.service.ts (acción mínima)
5. **⬜ PR-11C**: Renombrar Learning operacional → Operational Optimization Engine
6. **⬜ PR-11D**: Renombrar Learning cognitivo → Pattern Discovery en documentos

---

*Documento generado como parte de S1 (Global Architecture Soundness Audit).*
*Próximo: S1B (Global Invariant Consistency) — post-alineamiento.*
