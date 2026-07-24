# PR-7E — Pattern Discovery Identity Audit

**Estado:** Borrador de auditoría  
**Fecha:** 2026-07-13  
**Driver:** Determinar la relación arquitectónica entre el Learning definido en ADR-003 (operacional) y el Pattern Discovery definido en PR-7 (cognitivo, renombrado de "Learning cognitivo" a "Pattern Discovery" en PR-11A).

---

## Regla metodológica

Este documento NO asume que ambos "Learning" representan la misma capa. Se analizan cuatro hipótesis desde evidencia arquitectónica exclusivamente. No se propone solución antes de completar el análisis.

---

## Tabla de contenidos

1. [Fuentes de evidencia](#1-fuentes-de-evidencia)
2. [Matriz comparativa completa](#2-matriz-comparativa-completa)
3. [Análisis de hipótesis](#3-análisis-de-hipótesis)
4. [Veredicto](#4-veredicto)
5. [Consecuencias arquitectónicas](#5-consecuencias-arquitectónicas)

---

## 1. Fuentes de evidencia

| Fuente | Contenido | Autoridad |
|--------|-----------|-----------|
| ADR-003 | Learning Domain Architecture (operacional) | Aceptado. Define `services/learning/` como dominio de primer orden. |
| ADR-009 | Evidence Engine Architecture (cognitive pipeline) | Congelado. Define la base cognitiva para capas futuras. |
| ADR-010 | Memory Architecture (cognitive persistence) | Aceptado. Define Memory como predecesor de Pattern Discovery. |
| ADR-011 | Reflection Elimination | Aceptado. Define pipeline: EE → Memory → Pattern Discovery. |
| PR-7A | Learning Ontology Audit | Pattern Discovery como capa independiente. |
| PR-7B | Learning Mathematical Model | L: 𝒲 × Γ → 𝒫(𝒞). c = ⟨P, θ, E⟩. |
| PR-7C | Learning Parameter Space & Evidence | Γ = Γ_detect × Γ_select × Γ_compute. E ⊆ W^k. |
| PR-7D | Learning Contract Derivation | 4 contratos semánticos. |
| Código fuente | `src/lib/services/learning/*.ts` (15 archivos) | Implementación real del Learning operacional. |

---

## 2. Matriz comparativa completa

### 2.1 Ontología

| Dimensión | ADR-003 (Operacional) | PR-7 (Pattern Discovery) |
|-----------|----------------------|-------------------|
| **Naturaleza** | Retroalimentación de negocio: aprende de resultados operacionales para optimizar decisiones comerciales. | Descubrimiento cognitivo: detecta regularidades en el estado cognitivo del sistema para informar decisiones. |
| **Pregunta ontológica** | "¿Qué decisión comercial funciona mejor?" | "¿Qué regularidades existen en el estado cognitivo del sistema?" |
| **Propósito** | Optimizar pricing, oportunidades, políticas, detección de deriva. | Descubrir patrones en el pipeline cognitivo (EE → Memory). |
| **Dominio** | **Business domain**: viajes, tarifas, oportunidades, conductores, carga del sistema. | **Cognitive domain**: Belief, Decision, readiness, missingInfo, validInput. |
| **Rol en el sistema** | Servicio de optimización operacional. | Capa del pipeline cognitivo. |

**Diferencia ontológica: FUNDAMENTAL.** Un dominio opera sobre la realidad del negocio (viajes, tarifas, oportunidades). El otro opera sobre la realidad cognitiva (creencias, decisiones, readiness). No comparten ni el mismo sustrato ontológico.

### 2.2 Dominio de entrada

| Dimensión | ADR-003 (Operacional) | PR-7 (Pattern Discovery) |
|-----------|----------------------|-------------------|
| **Qué recibe** | Datos de negocio: resultados de viajes, tarifas, oportunidades, carga del sistema, comandos admin. | W = secuencia ordenada de snapshots de Memory (11 campos analizables de Belief + Decision). |
| **Estructura** | Múltiples estructuras heterogéneas: `TripOutcome`, `OpportunityInput`, `PricingResult`, `SystemLoad`, `OpportunityContext`. | Homogénea: `W = (s₁, ..., sₙ)` con sᵢ ∈ S (espacio producto de 11 campos). |
| **Fuente** | DB operacional (`db/domains/learning`), servicios de pricing, dispatch. | Memory cognitiva (contrato 1: Memory → Pattern Discovery). |
| **Forma de acceso** | Import directo desde módulos. Sin facade. | Contrato semántico formal. |
| **Volatilidad** | Por evento de negocio (viaje completado, consulta de precio, cambio de política). | Por ventana temporal (cada N turnos). |
| **Mecanismo** | Llamada a función con parámetros de negocio. | Consulta de ventana a Memory. |

**Diferencia de entrada: ABSOLUTA.** No comparten ni una sola fuente de datos. El operacional lee de DB de negocio; el cognitivo lee de Memory.

### 2.3 Dominio de salida

| Dimensión | ADR-003 (Operacional) | PR-7 (Pattern Discovery) |
|-----------|----------------------|-------------------|
| **Qué produce** | Decisiones de negocio: oportunidades rankeadas, ajustes de precio, decisiones de política, logs de eventos, pesos de aprendizaje. | M = {c₁, ..., cₖ} con c = ⟨P, θ, E⟩ (Patterns: claims de segundo orden sobre regularidades cognitivas). |
| **Estructura** | Múltiples tipos heterogéneos: `ScoredOpportunity[]`, `LearningWeights`, `PolicyEngineResult`, `LearningDecision`, `void` (side effects). | Conjunto homogéneo de unidades ⟨P, θ, E⟩. |
| **Consumidor** | Servicios operacionales: `trip-execution.service.ts`, `policy-pipeline.ts`, `command-router.ts`. | Goals (capa cognitiva futura). |
| **Side effects** | **Sí**: escribe en DB (eventos, pesos, logs de decisión), ajusta pesos, modifica estado del sistema. | **No**: función pura sin efectos laterales (PR-7B §6.1). |
| **Formato** | Tipos de TypeScript con estructura de negocio. | Objeto matemático: ⟨P, θ, E⟩. |

**Diferencia de salida: ABSOLUTA.** Un sistema produce efectos laterales en el negocio; el otro produce claims inmutables sin efectos. Son ontológicamente inconmensurables.

### 2.4 Tipo de conocimiento producido

| Dimensión | ADR-003 (Operacional) | PR-7 (Pattern Discovery) |
|-----------|----------------------|-------------------|
| **¿Qué conocimiento?** | "Esta tarifa funciona mejor en esta ruta." / "Esta oportunidad tiene alta probabilidad de conversión." / "El sistema está bajo carga alta." | "Cuando readiness cae, missingInfo crece (θ=0.85)." / "El estado cognitivo tiende a estabilizarse después del turno 3." |
| **Orden lógico** | Primer orden (hechos sobre el negocio). | Segundo orden (regularidades sobre secuencias de estados cognitivos). |
| **Naturaleza epistémica** | Empírica (observación de resultados de negocio). | Abstractiva (generalización a partir de datos cognitivos). |
| **Formalización** | Datos estructurados de negocio (interfaces, records). | c = ⟨P, θ, E⟩ (tripla matemática). |
| **Tipo de inferencia** | Estadística (promedios, tasas, pesos ajustados por resultados). | Estructural (detección de dependencias entre campos cognitivos). |
| **Novelidad** | Conocimiento derivado (nuevos pesos a partir de nuevos datos). | Conocimiento derivativamente nuevo (patterns que no existen en ningún snapshot individual). |

**Diferencia de conocimiento: FUNDAMENTAL.** El operacional produce conocimiento de NEGOCIO (qué funciona comercialmente). El cognitivo produce conocimiento COGNITIVO (cómo se comporta el sistema cognitivo). Difieren en orden lógico, naturaleza epistémica, y tipo de inferencia.

### 2.5 Consumidores

| Dimensión | ADR-003 (Operacional) | PR-7 (Pattern Discovery) |
|-----------|----------------------|-------------------|
| **Consumidores reales** | `trip-execution.service.ts`, `policy-pipeline.ts`, `lead.service.ts`, `command-router.ts`, `comprehension-runner.ts`, `opportunity-response.ts`, `slot-confirmation-handler.ts`, cron routes. | Goals (capa futura, no implementada). |
| **Número de consumidores** | 8 módulos en producción. | 0 (no implementado). |
| **Naturaleza de consumo** | Sincrónico (llamadas a función) y asincrónico (eventos fire-and-forget, cron). | Por definir (contrato 2: Pattern Discovery → Goals). |
| **Tipo de consumidor** | Servicios operacionales del pipeline de conversación. | Capa cognitiva del pipeline cognitivo. |
| **Dependencia** | Servicios dependen de Learning operacional para decisiones de negocio. | Goals depende de Pattern Discovery para patterns. |

**Diferencia de consumidores: ABSOLUTA.** No comparten un solo consumidor. Los consumidores del operacional son servicios de negocio en producción. El consumidor del cognitivo es una capa futura del pipeline cognitivo.

### 2.6 Contratos

| Dimensión | ADR-003 (Operacional) | PR-7 (Pattern Discovery) |
|-----------|----------------------|-------------------|
| **Contrato de entrada** | No formalizado. Cada función define sus parámetros. | Contrato 1: Memory → Pattern Discovery (formal, 6 precondiciones, 6 invariantes). |
| **Contrato de salida** | No formalizado. Tipos de TypeScript como única especificación. | Contrato 2: Pattern Discovery → Goals (formal, 5 invariantes, garantías mutuas). |
| **Contrato de verificación** | No existe. | Contrato 3: Pattern Discovery → Auditoría (formal, trazabilidad). |
| **Contrato de ejecución** | No formalizado. El runtime es Node.js estándar. | Contrato 4: Pattern Discovery → Runtime (formal, 6 invariantes, shadow mode). |
| **Formalidad** | Convenciones de código (ADR-003 define boundaries). | Contratos semánticos derivados del modelo matemático. |

**Diferencia de contratos: ABSOLUTA.** El operacional no tiene contratos formales; solo boundaries por ADR. El cognitivo tiene 4 contratos semánticos derivados de su modelo matemático.

### 2.7 Invariantes

| Dimensión | ADR-003 (Operacional) | PR-7 (Pattern Discovery) |
|-----------|----------------------|-------------------|
| **Invariantes propios** | • No importar de Housekeeping • No ser capa de presentación • Acceso a DB por `db/domains/learning` | L-1 a L-6 (propuestos): read-only respecto de Memory, patterns inmutables, shadow mode, sin estado, dependencia exclusiva de Memory, δ interno. |
| **Invariantes del EE (I1-EE a I6-EE)** | **No aplican** (no participa del pipeline cognitivo). | **Aplican todos** (I1-EE a I6-EE). |
| **Invariantes de Memory (M-1 a M-14)** | **No aplican** (no toca Memory). | **Aplican todos** (M-1 a M-14). |
| **Shadow Mode** | No existe (opera en producción real). | Esencial (I5-EE, L-3). |
| **Pureza** | No es pura (escribe DB, tiene estado). | Es pura (PR-7B §6.1). |
| **Determinismo** | Parcial (depende de estado de DB). | Total (misma W, mismo γ → mismo M). |
| **Inmutabilidad de output** | Los outputs son datos mutables (arrays, objetos). | Los outputs son inmutables (claims congelados). |

**Diferencia de invariantes: ABSOLUTA.** No comparten ni un solo invariante. Los invariantes del operacional son sobre boundaries de código. Los invariantes del cognitivo son sobre el modelo matemático y el pipeline cognitivo.

### 2.8 Independencia evolutiva (CCP)

| Dimensión | ADR-003 (Operacional) | PR-7 (Pattern Discovery) |
|-----------|----------------------|-------------------|
| **Razones de cambio** | • Nuevos tipos de oportunidad • Cambios en pricing • Nuevas políticas • Nueva lógica de drift • Cambios en DB de negocio | • Nuevos campos en EE (requiere ADR) • Nuevos tipos de regularidad • Nuevos parámetros en Γ • Nuevos consumidores (Goals, Analytics) |
| **Frecuencia de cambio** | Alta (sprints de negocio). | Baja (cambios arquitectónicos requieren ADR). |
| **¿Pueden cambiar independientemente?** | Sí (ninguno depende del otro). | Sí (ninguno depende del otro). |
| **CCP — ¿Misma razón de cambio?** | **No.** Cambiar la lógica de oportunidades no tiene nada que ver con cambiar la detección de patrones cognitivos. | **No.** Cambiar la detección de dependencias cognitivas no tiene nada que ver con cambiar tarifas. |
| **Ciclo de vida** | Evolución continua por necesidades del negocio. | Evolución por hitos arquitectónicos. |

**CCP: SE SEPARAN.** Las razones de cambio son completamente disjuntas. El principio de Common Closure Principle sugiere que DEBEN estar en componentes separados.

### 2.9 Reutilización (CRP)

| Dimensión | ADR-003 (Operacional) | PR-7 (Pattern Discovery) |
|-----------|----------------------|-------------------|
| **¿Comparten código?** | No. El operacional tiene 15 archivos en `services/learning/`. El cognitivo es conceptual (sin código). | No. |
| **¿Comparten tipos?** | No. El operacional usa tipos de negocio (`Opportunity`, `TripOutcome`, `SystemLoad`). El cognitivo usa `⟨P, θ, E⟩`. | No. |
| **¿Comparten datos?** | No. El operacional lee de DB de negocio. El cognitivo lee de Memory. | No. |
| **¿Pueden reutilizarse mutuamente?** | No. Los patterns cognitivos no sirven para optimizar pricing. Los pesos de oportunidad no sirven para detectar regularidades cognitivas. | No. |
| **CRP — ¿Misma reutilización?** | **No.** Los consumidores del operacional no reutilizarían nunca al cognitivo, y viceversa. | **No.** |

**CRP: SE SEPARAN.** El principio de Common Reuse Principle sugiere que no deben estar en el mismo componente porque sus consumidores no se superponen.

### 2.10 Lenguaje utilizado

| Dimensión | ADR-003 (Operacional) | PR-7 (Pattern Discovery) |
|-----------|----------------------|-------------------|
| **Vocabulario central** | Oportunidad, tarifa, ruta, conversión, peso, política, deriva, carga del sistema, evento. | Snapshot, readiness, missingInfo, validInput, creencia, decisión, patrón, confianza, evidencia. |
| **Términos compartidos** | "Aprendizaje", "peso", "decisión" — pero con significados radicalmente distintos. | "Aprendizaje", "peso", "decisión" — pero con significados radicalmente distintos. |
| **Ejemplo de "aprendizaje"** | "El sistema aprende que esta tarifa funciona mejor en esta ruta." | "El sistema aprende que cuando readiness cae, missingInfo crece." |
| **Ejemplo de "peso"** | `f7_weight:conversion = 0.4` (peso de objetivo de negocio). | θ = 0.85 (confianza en un pattern). |
| **Ejemplo de "decisión"** | `LearningDecision.selected` (qué oportunidad mostrar). | `readiness = 'ready'` (determinación cognitiva del EE). |

**Diferencia de lenguaje: ABSOLUTA.** Comparten palabras ("aprendizaje", "decisión", "peso") pero con definiciones ontológicas completamente diferentes. Es un caso clásico de **homónimos arquitectónicos**: el mismo significante con diferentes significados.

### 2.11 Responsabilidades

| Dimensión | ADR-003 (Operacional) | PR-7 (Pattern Discovery) |
|-----------|----------------------|-------------------|
| **Responsabilidades** | 1. Evaluación de oportunidades<br>2. Aprendizaje de tarifas<br>3. Ranking de oportunidades (F7)<br>4. Motor de políticas (F8)<br>5. Adaptación / detección de deriva<br>6. Monitoreo de carga del sistema<br>7. Cómputo de métricas globales<br>8. Tracking de eventos<br>9. Comandos admin<br>10. Recalculo de sugerencias | 1. Pattern detection (estado, transición, tendencia, dependencia)<br>2. Pattern selection<br>3. Pattern categorization<br>4. Cross-conversation accumulation<br>5. δ (differencing interno) |
| **Número de responsabilidades** | 10 (contadas) | 5 (más 1 interna) |
| **Naturaleza** | Operacional (afecta el negocio). | Cognitiva (afecta el pipeline de conocimiento). |
| **Duplicación** | **Cero.** Ninguna responsabilidad se superpone. | **Cero.** Ninguna responsabilidad se superpone. |

**Diferencia de responsabilidades: ABSOLUTA.** No comparten una sola responsabilidad. Son dominios completamente ortogonales.

---

## 3. Análisis de hipótesis

### 3.1 Hipótesis A: Son exactamente la misma capa

**Enunciado:** El Learning de ADR-003 y el Pattern Discovery de PR-7 representan la misma capa arquitectónica.

**Evidencia en contra:**

| Dimensión | ¿Compatible con "misma capa"? | Realidad |
|-----------|------------------------------|----------|
| Ontología | Deberían compartir naturaleza ontológica. | ❌ Uno es de negocio; el otro es cognitivo. |
| Input | Deberían compartir tipo de entrada. | ❌ Uno lee de DB operacional; el otro de Memory. |
| Output | Deberían compartir tipo de salida. | ❌ Uno produce decisiones de negocio; el otro produce ⟨P,θ,E⟩. |
| Consumidores | Deberían compartir consumidores. | ❌ Cero consumidores en común. |
| Contratos | Deberían compartir contratos. | ❌ El operacional no tiene contratos formales. |
| Invariantes | Deberían compartir invariantes. | ❌ Cero invariantes en común. |
| Lenguaje | Deberían compartir vocabulario semántico. | ❌ Homónimos: mismas palabras, significados distintos. |
| Responsabilidades | Deberían tener responsabilidades compatibles. | ❌ Cero responsabilidades en común. |

**Conclusión:** ❌ **FALSADA.** No hay evidencia que soporte la identidad. 8/8 dimensiones la contradicen.

---

### 3.2 Hipótesis B: Son una única capa con dos subdominios separados

**Enunciado:** ADR-003 y PR-7 son subdominios de una misma capa "Learning" que tiene dos caras: operacional y cognitiva.

**Evidencia:**

| Requisito para ser subdominios | ¿Se cumple? |
|-------------------------------|-------------|
| Comparten un contrato común de entrada/salida (una interfaz "Learning" unificada) | ❌ No. No hay interfaz común. |
| Comparten invariantes fundamentales | ❌ No. Cero invariantes compartidos. |
| Pueden empaquetarse juntos (misma unidad de despliegue) | ❌ No recomendado (CCP: diferentes razones de cambio; CRP: diferentes reutilizaciones). |
| Tienen un mecanismo de comunicación entre subdominios | ❌ No. No se comunican entre sí. |
| Comparten un lenguaje base | ❌ No. Vocabularios disjuntos. |
| Pueden reemplazarse uno por el otro sin afectar al sistema | ❌ No. Cada uno sirve a consumidores distintos. |
| Existe una abstracción que los unifica | ❌ No. No hay supertipo "Learning" que los contenga. |

**Contraargumento adicional:** Ambos se llaman "Learning", pero el término es homónimo:
- ADR-003 Learning = "aprender del negocio para optimizar operaciones"
- PR-7 Learning = "aprender del estado cognitivo para descubrir patrones"

No hay un concepto arquitectónico común que los subsume. Son dos actividades cognitivamente distintas que el lenguaje natural llama "aprender" pero que la arquitectura debe distinguir.

**Conclusión:** ❌ **FALSADA.** No existe una abstracción unificadora. No hay contrato común, invariantes compartidos, ni mecanismo de comunicación entre subdominios. Forzar una capa única violaría tanto CCP como CRP.

---

### 3.3 Hipótesis C: Son dos capas diferentes que comparten accidentalmente el mismo nombre

**Enunciado:** ADR-003 y PR-7 son capas arquitectónicamente independientes que por accidente histórico comparten la palabra "Learning" en su nombre.

**Evidencia a favor:**

| Dimensión | ADR-003 | PR-7 | ¿Diferentes? |
|-----------|---------|------|--------------|
| Dominio | Business domain | Cognitive domain | ✅ Diferentes |
| Input | DB operacional | Memory (snapshots) | ✅ Diferentes |
| Output | Decisiones de negocio | Patterns (⟨P,θ,E⟩) | ✅ Diferentes |
| Consumidores | Servicios operacionales | Goals (cognitivo) | ✅ Diferentes |
| Contratos | No formalizados | 4 contratos semánticos | ✅ Diferentes |
| Invariantes | Boundaries de código | I1-EE, M-1-M-14, L-1-L-6 | ✅ Diferentes |
| CCP | Cambia por negocio | Cambia por arquitectura | ✅ Diferentes |
| CRP | Reutilizado por servicios | Reutilizado por Goals | ✅ Diferentes |
| Lenguaje | Negocio (tarifas, rutas) | Cognitivo (readiness, missingInfo) | ✅ Diferentes |
| Responsabilidades | 10 operacionales | 5 cognitivas | ✅ Diferentes |
| Pureza | Impura (side effects) | Pura (sin efectos) | ✅ Diferentes |
| Estado | Con estado (DB, pesos) | Sin estado (modelo mínimo) | ✅ Diferentes |

**Total: 12/12 dimensiones diferentes.**

**Análisis del nombre compartido:**

| Término | Significado en ADR-003 | Significado en PR-7 |
|---------|----------------------|---------------------|
| "Learning" | Optimización por feedback de negocio | Descubrimiento de regularidades cognitivas |
| "Pattern" | No usado | Unidad ontológica: ⟨P, θ, E⟩ |
| "Decision" | LearningDecision (qué oportunidad mostrar) | Decision (campo del EE: readiness, validInput) |
| "Weight" | Parámetro de optimización (f7_weight) | No existe (θ es confianza, no peso) |
| "Event" | Log de evento de conversación en DB | No usado |
| "Policy" | Reglas de negocio con condiciones/acciones | No usado |

**Conclusión:** ✅ **VERDADERA.** Toda la evidencia apunta a que son capas arquitectónicamente independientes que comparten accidentalmente el nombre "Learning". Es un caso documentado de **homónimo arquitectónico**.

---

### 3.4 Hipótesis D: PR-7 reemplaza a ADR-003

**Enunciado:** El nuevo Pattern Discovery (PR-7) reemplaza al Learning operacional (ADR-003).

**Evidencia en contra:**

| ¿Puede PR-7 hacer lo que hace ADR-003? | Respuesta |
|----------------------------------------|-----------|
| ¿Puede evaluar oportunidades comerciales? | ❌ No. PR-7 no tiene acceso a datos de negocio (solo a snapshots cognitivos). |
| ¿Puede aprender tarifas de viajes? | ❌ No. PR-7 no recibe trip outcomes. |
| ¿Puede ejecutar políticas de negocio? | ❌ No. PR-7 no tiene motor de políticas. |
| ¿Puede detectar deriva en conversiones? | ❌ No. PR-7 no tiene acceso a tasas de conversión. |
| ¿Puede rankear oportunidades? | ❌ No. PR-7 no conoce el concepto de oportunidad comercial. |
| ¿Puede ajustar pesos de pricing? | ❌ No. PR-7 no produce pesos; produce ⟨P,θ,E⟩. |
| ¿Puede ejecutar comandos admin de precios? | ❌ No. No tiene ese dominio. |

**¿Puede ADR-003 hacer lo que hace PR-7?**

| ¿Puede ADR-003... | Respuesta |
|-------------------|-----------|
| Consumir snapshots de Memory? | ❌ No. ADR-003 no tiene acceso a Memory cognitiva. |
| Producir patterns ⟨P,θ,E⟩? | ❌ No. ADR-003 produce decisiones de negocio, no claims de segundo orden. |
| Detectar dependencias entre readiness y missingInfo? | ❌ No. ADR-003 no conoce esos campos. |
| Ser función pura sin side effects? | ❌ No. ADR-003 existe para producir side effects (escribir DB, ajustar pesos). |
| Servir a Goals? | ❌ No. Goals consume patterns, no oportunidades. |

**Conclusión:** ❌ **FALSADA.** Ninguno puede reemplazar al otro. Son ortogonales. ADR-003 seguirá existiendo independientemente de PR-7, y viceversa.

---

## 4. Veredicto

### 4.1 Decisión

**Hipótesis C es correcta: ADR-003 (Learning Operacional) y PR-7 (Learning Cognitivo) son dos capas arquitectónicas diferentes que comparten accidentalmente el nombre "Learning".**

### 4.2 Justificación

De las 12 dimensiones analizadas, **12/12 son diferentes** entre ambos:

| # | Dimensión | ADR-003 | PR-7 | ¿Difieren? |
|---|-----------|---------|------|:-----------:|
| 1 | Ontología | Business domain | Cognitive domain | ✅ |
| 2 | Input | DB operacional | Memory (W) | ✅ |
| 3 | Output | Decisiones de negocio | Patterns (⟨P,θ,E⟩) | ✅ |
| 4 | Tipo de conocimiento | Primer orden (hechos de negocio) | Segundo orden (regularidades) | ✅ |
| 5 | Consumidores | Servicios operacionales (8) | Goals (1 futuro) | ✅ |
| 6 | Contratos | No formalizados | 4 contratos semánticos | ✅ |
| 7 | Invariantes | Boundaries de código | I1-EE, M-1-M-14, L-1-L-6 | ✅ |
| 8 | CCP (razones de cambio) | Cambios de negocio | Cambios arquitectónicos | ✅ |
| 9 | CRP (reutilización) | Servicios operacionales | Pipeline cognitivo | ✅ |
| 10 | Lenguaje | Tarifas, rutas, políticas | readiness, missingInfo, θ | ✅ |
| 11 | Responsabilidades | 10 operacionales | 5 cognitivas | ✅ |
| 12 | Pureza / Estado | Impura, con estado | Pura, sin estado | ✅ |

### 4.3 ¿Qué hacer con el nombre?

El término "Learning" es un **homónimo arquitectónico**:

```
Learning_operacional (ADR-003)  ≠  Pattern_Discovery (PR-7)
```

Ambos "aprenden" pero de fuentes diferentes, producen resultados diferentes, y sirven a propósitos diferentes. Es como llamar "Motor" al motor de un auto y "Motor" al motor de búsqueda — la palabra es la misma, la función es radicalmente distinta.

**Recomendación de nomenclatura:**

| Nombre actual | Propuesto | Justificación |
|--------------|-----------|--------------|
| ADR-003 Learning | **Operational Learning** (Learning Operacional) | Aprende del negocio para optimizar operaciones. |
| PR-7 Learning | **Pattern Discovery** (Descubrimiento Cognitivo de Patrones) | Descubre regularidades en el estado cognitivo. |

Esto elimina la ambigüedad y refleja la diferencia arquitectónica real.

### 4.4 ¿Deberían renombrarse los módulos de código?

No necesariamente. Los módulos de ADR-003 (en `services/learning/`) pueden mantener su nombre porque:
- Su contexto (service layer) los distingue del cognitivo
- Renombrar 15 archivos y todos sus importadores es costo de refactor sin beneficio arquitectónico
- La documentación (ADRs, ontología) debe usar los nombres completos para evitar ambigüedad

**Pero el pipeline cognitivo debe usar exclusivamente "Pattern Discovery" o similar, NUNCA "Learning" a secas**, para evitar confusiones en el diseño futuro de Goals y Planning.

---

## 5. Consecuencias arquitectónicas

### 5.1 Para el pipeline cognitivo

El pipeline oficial sigue siendo:

```
EE → Memory → [Pattern Discovery] → Goals → Planning
```

Donde "[Pattern Discovery]" es la capa diseñada en PR-7. **No hay conflicto** con Operational Learning porque:

- Ocupan posiciones arquitectónicas distintas
- No comparten datos
- No comparten consumidores
- No comparten invariantes

### 5.2 Para el roadmap

| Componente | Estado | Independiente de |
|-----------|--------|-----------------|
| Operational Learning (ADR-003) | Implementado (producción) | Pattern Discovery |
| Pattern Discovery (PR-7) | Conceptual (pre-implementación) | Operational Learning |

Ambos pueden evolucionar en paralelo sin interferencia.

### 5.3 Para la ontología

La ontología de AITOS debe incluir ambas entidades con nombres distintos:

```
CognitiveDomain:
  Signal → Observation → Fact → Evidence → Knowledge → Belief → Decision
  → Memory → CognitivePatternDiscovery → Goals → Planning

OperationalDomain:
  TripOutcome → FareLearning → RouteWeights
  OpportunityContext → OpportunityEngine → ScoredOpportunity
  SystemLoad → PolicyEngine → PolicyDecision
  ...
```

Son dominios ontológicos separados con sus propias cadenas de transformación.

### 5.4 Riesgo de confusión

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Desarrolladores confunden ambos "Learning" | Media | Documentación explícita en ADR-009, ADR-010, ADR-011, ARCHITECTURE_MILESTONE_v3.0. Usar nombre completo en documentos. |
| Nuevas capas cognitivas (Goals, Planning) asumen acceso a datos operacionales | Alta | Contract boundaries: Goals consume solo Patterns cognitivos. No tiene acceso a Operational Learning. |
| Refactors futuros mueven código entre dominios | Baja | Directorios separados: `services/learning/` vs. `cognitive/` (o similar). |

---

*Este documento es resultado de la auditoría PR-7E. No propone soluciones antes de completar el análisis. La decisión (Hipótesis C) surge exclusivamente de la evidencia arquitectónica presentada en la matriz comparativa.*
