# PR-7F — Pattern Discovery Minimality Audit

**Estado:** Borrador de auditoría  
**Fecha:** 2026-07-13  
**Driver:** Determinar si Pattern Discovery contiene únicamente responsabilidades irreducibles o si puede simplificarse/eliminarse.

---

## Regla metodológica

Esta auditoría aplica el **mismo nivel de exigencia** que las auditorías PR-6A a PR-6F que eliminaron Reflection.

Se asume que Pattern Discovery es **culpable hasta demostrar lo contrario**. No se aceptan argumentos intuitivos, estéticos ni de conveniencia. Solo demostraciones arquitectónicas formales.

---

## Tabla de contenidos

1. [Enumeración completa de responsabilidades](#1-enumeración-completa-de-responsabilidades)
2. [Clasificación esencial / auxiliar / accidental](#2-clasificación)
3. [Intento formal de mover cada responsabilidad](#3-intento-de-mover-cada-responsabilidad)
4. [Intento de absorción completa](#4-intento-de-absorción-completa)
5. [Kernel mínimo de Pattern Discovery](#5-kernel-mínimo)
6. [Operaciones redundantes](#6-operaciones-redundantes)
7. [Operaciones derivables](#7-operaciones-derivables)
8. [Responsabilidades escondidas](#8-responsabilidades-escondidas)
9. [Responsabilidades mezcladas](#9-responsabilidades-mezcladas)
10. [Violaciones potenciales](#10-violaciones-potenciales)
11. [Veredicto](#11-veredicto)

---

## 1. Enumeración completa de responsabilidades

### 1.1 Descomposición atómica

Pattern Discovery, definido como L_γ(W) = Select_γ(Detect_γ(W)) con salida M = {⟨P, θ, E⟩}, se descompone en las siguientes responsabilidades atómicas:

| ID | Responsabilidad | Descripción | Depende de |
|----|----------------|-------------|------------|
| R1 | Recepción de W | Recibir secuencia ordenada de snapshots desde Memory | — |
| R2 | Cómputo de δ | Calcular diferencias entre snapshots consecutivos | R1 |
| R3 | Detección estado | Identificar condiciones en snapshots individuales | R1 |
| R4 | Detección transición | Identificar relaciones entre pares (s_i, s_i+1) | R1, R2 |
| R5 | Detección tendencia | Identificar patrones en ventanas de ≥3 snapshots | R1, R2 |
| R6 | Detección dependencias | Identificar covarianza entre campos | R1 |
| R7 | Cómputo de confianza θ | Calcular \|E\|/\|W^k_τ\| para cada candidato | R3-R6 |
| R8 | Ensamblaje de evidencia E | Identificar elementos de W^k que soportan cada regularidad | R3-R6 |
| R9 | Selección por umbral θ_min | Filtrar candidatos con θ ≥ θ_min | R7 |
| R10 | Selección por relevancia | Filtrar por criterios de importancia | R7, R8 |
| R11 | Selección por no-redundancia | Eliminar duplicados o subsumidos | R9, R10 |
| R12 | Categorización τ | Asignar tipo semántico a cada regularidad | R9 |
| R13 | Ensamblaje de salida ⟨P,θ,E⟩ | Construir la unidad de salida atómica | R7, R8, R12 |
| R14 | Acumulación cross-conversación | Combinar datos de múltiples conversaciones | R1 |
| R15 | Preservación de trazabilidad | Mantener γ y E para verificación futura | R13 |
| R16 | Garantía de inmutabilidad | Congelar objetos de salida | R13 |
| R17 | Gestión de parámetros Γ | Aplicar configuración actual a la ejecución | — |
| R18 | Shadow Mode | Ejecutar sin afectar la conversación | — |


### 1.2 Agrupación lógica

`
INPUT (R1)
    │
    ├── PREPARACIÓN: R2 (δ)
    │
    ├── DETECCIÓN ESTADO (R3)
    ├── DETECCIÓN TRANSICIÓN (R4)
    ├── DETECCIÓN TENDENCIA (R5)
    ├── DETECCIÓN DEPENDENCIAS (R6)
    │
    ├── CONFIANZA (R7) + EVIDENCIA (R8)
    │
    ├── SELECCIÓN: R9 (θ_min), R10 (relevancia), R11 (no-redundancia)
    ├── CATEGORIZACIÓN (R12)
    │
    ├── ENSAMBLAJE (R13)
    │
    └── SALIDA: R14 (acumulación), R15 (trazabilidad), R16 (inmutabilidad)
`

---

## 2. Clasificación

### 2.1 Criterios

| Categoría | Definición |
|-----------|-----------|
| **Esencial (E)** | Sin esta responsabilidad, Pattern Discovery no puede producir su output mínimo. |
| **Auxiliar (A)** | No esencial para producir output, pero necesaria para calidad, trazabilidad o integridad. |
| **Accidental (X)** | Podría eliminarse sin pérdida de capacidad fundamental. |

### 2.2 Clasificación

| ID | Responsabilidad | Cat. | Justificación |
|----|----------------|------|--------------|
| R1 | Recepción de W | **E** | Sin entrada no hay transformación. |
| R2 | Cómputo de δ | **A** | Necesario para transiciones/tendencias, no para estado. |
| R3 | Detección estado | **E** | Unidad mínima de detección. |
| R4 | Detección transición | **A** | No esencial si solo se buscan regularidades de estado. |
| R5 | Detección tendencia | **A** | Requiere n≥3. No esencial para kernel mínimo. |
| R6 | Detección dependencias | **A** | Extensión. No esencial para kernel mínimo. |
| R7 | Cómputo de confianza θ | **E** | Sin θ, el output no tiene métrica de calidad. |
| R8 | Ensamblaje de evidencia E | **A** | Podría omitirse (perdiendo trazabilidad). |
| R9 | Selección por θ_min | **E** | Sin filtro, output inmanejable. |
| R10 | Selección por relevancia | **A** | Mejora calidad. No esencial. |
| R11 | Selección por no-redundancia | **A** | Reduce ruido. No esencial. |
| R12 | Categorización τ | **A** | Ayuda a Goals. No esencial. |
| R13 | Ensamblaje ⟨P,θ,E⟩ | **E** | Unidad de output. |
| R14 | Acumulación cross-conversación | **A** | Mejora poder estadístico. No esencial. |
| R15 | Preservación de trazabilidad | **A** | Esencial para auditoría, no para transformación. |
| R16 | Garantía de inmutabilidad | **A** | Patrón técnico. |
| R17 | Gestión de parámetros Γ | **E** | Sin γ, L está subdeterminada. |
| R18 | Shadow Mode | **A** | Seguridad, no transformación. |

### 2.3 Resumen

| Categoría | Cantidad | IDs |
|-----------|----------|-----|
| **Esencial (E)** | 6 | R1, R3, R7, R9, R13, R17 |
| **Auxiliar (A)** | 12 | R2, R4, R5, R6, R8, R10, R11, R12, R14, R15, R16, R18 |
| **Accidental (X)** | 0 | — |

**Ninguna responsabilidad es accidental.** Toda responsabilidad tiene propósito justificado.

---

## 3. Intento formal de mover cada responsabilidad

### 3.1 R1 — Recepción de W

| Destino | ¿Posible? | Violaciones |
|---------|-----------|-------------|
| Memory | ❌ No aplica | Memory ya produce W. |
| Goals | ✅ Sí | Goals recibe W directamente. Pierde cadena lineal. |
| Runtime | ✅ Sí | Runtime como proxy. Sin valor arquitectónico. |

**Veredicto:** Movible, pero debilita la cadena lineal del pipeline.

### 3.2 R2 — Cómputo de δ

| Destino | ¿Posible? | Violaciones |
|---------|-----------|-------------|
| Memory | ❌ **No** | M-13: Memory no computa deltas. BLOQUEANTE. |
| Goals | ✅ Sí | Goals computa δ internamente. |
| Helper | ✅ Sí | Librería compartida. 0 consumidores externos (PR-6F). |

**Veredicto:** Movible, pero sin beneficio (0 consumidores fuera de Pattern Discovery).


### 3.3 R3 a R6 — Detección de regularidades

| Responsabilidad | ¿A Goals? | Violación |
|----------------|-----------|-----------|
| R3 — Estado | ✅ Sí | SRP: Goals suma detección a decisión. |
| R4 — Transición | ✅ Sí | SRP: idem. |
| R5 — Tendencia | ✅ Sí | SRP: idem. |
| R6 — Dependencia | ✅ Sí | SRP: idem. |

**Veredicto:** Movible a Goals, pero con **violación SRP GRAVE**: Goals pasa de 1 a 5 responsabilidades.

### 3.4 R7, R8 — Confianza y evidencia

| Resp. | Destino | Violaciones |
|-------|---------|-------------|
| R7 (θ) | ✅ Helper | Ninguna. θ es función matemática pura. |
| R8 (E) | ❌ Memory | M-9: Memory no enriquece datos. BLOQUEANTE. |
| R8 (E) | ✅ Goals | Ninguna. Goals ensambla su evidencia. |

**Veredicto:** R7 movible. R8 movible a Goals (no a Memory).

### 3.5 R9 a R12 — Selección y categorización

| Resp. | Destino | Violaciones |
|-------|---------|-------------|
| R9 (θ_min) | ✅ Goals | **Ninguna.** Goals sabe qué confianza necesita. |
| R10 (relevancia) | ✅ Goals | **Ninguna.** Goals sabe qué es relevante. |
| R11 (no-redundancia) | ✅ Goals | **Ninguna.** Goals puede deduplicar. |
| R12 (categorización) | ✅ Goals | **Ninguna.** Goals define su taxonomía. |

**⚠️ Hallazgo crítico:** R9-R12 pertenecen ONTOLÓGICAMENTE a Goals, no a Pattern Discovery. Los criterios de selección dependen del consumidor (Goals), no del productor (Pattern Discovery). Pattern Discovery no debería decidir qué es "relevante" para Goals.

### 3.6 R13 — Ensamblaje de salida

| Destino | Violaciones |
|---------|-------------|
| ✅ Goals | Ninguna. Goals construye su propia estructura. |

**Veredicto:** Movible. El formato ⟨P,θ,E⟩ es un convenio, no una función.

### 3.7 R14 — Acumulación cross-conversación

| Destino | Violaciones |
|---------|-------------|
| ❌ Memory | M-6: Memory particionada por conversación. BLOQUEANTE. |
| ✅ Goals | **Violación temporal.** Goals mezcla estado per-conversación y cross-conversación. |
| ✅ Runtime | Ninguna, pero mezcla dominios. |

**Veredicto:** Movible a Goals con violación de separación temporal.

### 3.8 R15 a R18 — Responsabilidades transversales

| Resp. | ¿Movible? | Destino | Violación |
|-------|-----------|---------|-----------|
| R15 (trazabilidad) | ✅ Sí | Auditoría | Ninguna |
| R16 (inmutabilidad) | ✅ Sí | Cualquiera | Ninguna (patrón técnico) |
| R17 (Γ) | ❌ **INMOVIBLE** | — | Γ define a L_γ. Sin γ, L no existe. |
| R18 (shadow mode) | ✅ Sí | Runtime | Ninguna |

### 3.9 Resumen de movilidad

| Estado | Cantidad | IDs |
|--------|----------|-----|
| **Inmovibles** | 1 | R17 (Γ) |
| **Movibles sin violación** | 6 | R2, R7, R9, R10, R11, R12, R15, R16, R18 |
| **Movibles con violación SRP** | 5 | R3, R4, R5, R6 (detección a Goals) |
| **Movibles con violación temporal** | 1 | R14 (cross-conversación a Goals) |

**Sorpresa arquitectónica:** Pattern Discovery retiene responsabilidades (R9-R12) que ONTOLÓGICAMENTE pertenecen a Goals. Esto es una **responsabilidad mezclada** (ver §9).

---

## 4. Intento de absorción completa

### 4.1 Absorción por Memory

**Escenario:** Pattern Discovery se elimina. Memory extiende sus responsabilidades.

**Problemas:**
- M-9: "Memory never adds, derives, transforms, or infers fields." **Violación BLOQUEANTE.**
- M-11: "Memory has no operational state, no cache, no runtime."
- M-13: "Memory does NOT compute diffs between consecutive snapshots."

**Conclusión: ABSORCIÓN IMPOSIBLE.** Memory violaría 3 invariantes congelados.

### 4.2 Absorción por Goals

**Escenario:** Pattern Discovery se elimina. Goals recibe W desde Memory y realiza detección + selección + compromiso.

**Nuevas responsabilidades de Goals:**
1. Recibir W desde Memory (R1)
2. Computar δ (R2)
3. Detectar regularidades (R3-R6)
4. Computar confianza (R7)
5. Ensamblar evidencia (R8)
6. Seleccionar regularidades (R9-R11)
7. Categorizar (R12)
8. Acumular cross-conversación (R14)
9. DECIDIR compromisos (responsabilidad original)

**Análisis de violaciones:**

| Principio | ¿Se viola? | Gravedad |
|-----------|-----------|----------|
| **SRP** | ✅ SÍ | **GRAVE.** Goals pasa de 1 a 9 responsabilidades. |
| **Sep. temporal** | ✅ SÍ | **GRAVE.** Goals mezcla per-conversación y cross-conversación. |
| **Lenguaje único** | ✅ SÍ | **MEDIA.** Goals habla Pattern + Commitment. |
| Cadena lineal | ❌ No | Memory → Goals sigue siendo lineal. |
| Inmutabilidad | ❌ No | Aplicable en cualquier capa. |
| Shadow Mode | ❌ No | Gestionable por Runtime. |
| Pureza | ❌ No | Depende del diseño. |

**Tres violaciones graves:**
1. **SRP:** Goals con 9 responsabilidades es un monolito. Dos razones de cambio diferentes (detección de patrones + selección de compromisos) convergen en el mismo componente. Violación CCP.
2. **Separación temporal:** Goals mezcla estado per-conversación (compromisos actuales) con cross-conversación (patrones acumulados). Diferentes ciclos de vida, diferente persistencia.
3. **Lenguaje único:** Goals procesa Patterns internamente. Si Analytics necesita Patterns, debe extraerlos de Goals. Dependencia no deseada.

**Conclusión: ABSORCIÓN POSIBLE pero con 3 violaciones arquitectónicas.** Goals absorber Pattern Discovery crea un monolito con 9 responsabilidades.


### 4.3 Absorción por Planning

**Escenario:** Pattern Discovery se elimina. Planning recibe patrones indirectamente.

**Problemas:**
- Planning está dos niveles detrás de Pattern Discovery. No hay ruta directa.
- Planning no necesita patrones; necesita pasos de acción.
- Planning no tiene contexto para interpretar patrones cognitivos.

**Conclusión: ABSORCIÓN IMPOSIBLE.** Incompatibilidad ontológica.

### 4.4 Absorción por Runtime

**Escenario:** Pattern Discovery se elimina. Runtime ejecuta detección de patrones como servicio.

**Problemas:**
- Runtime es infraestructura, no dominio cognitivo.
- La función quedaría sin hogar arquitectónico: sin ADR, sin invariantes, sin contratos.
- Runtime no es capa del pipeline cognitivo.

**Conclusión: ABSORCIÓN IMPOSIBLE.** Mezcla de dominios.

### 4.5 Resumen de absorción

| Destino | ¿Posible? | Razón |
|---------|-----------|-------|
| Memory | ❌ **Imposible** | 3 invariantes congelados violados (M-9, M-11, M-13) |
| Goals | ✅ **Posible** | 3 violaciones graves (SRP, temporal, lenguaje) |
| Planning | ❌ **Imposible** | Incompatibilidad ontológica |
| Runtime | ❌ **Imposible** | Mezcla de dominios |

**Solo Goals puede absorber Pattern Discovery. El costo son 3 violaciones arquitectónicas graves.**

---

## 5. Kernel mínimo

### 5.1 Definición

El kernel mínimo de Pattern Discovery es el conjunto irreducible de operaciones sin las cuales L_γ(W) = M no puede realizarse.

`
Kernel(Pattern Discovery) = { L_γ(W) = Select_γ(Detect_γ(W)) }
`

### 5.2 Descomposición

K = { R1, R3, R7, R9, R13, R17 }

| Elemento | ¿Por qué es irreducible? |
|----------|--------------------------|
| R1 (recepción de W) | Sin entrada, no hay salida. |
| R3 (detección) | Sin detección, no hay regularidades. |
| R7 (confianza θ) | Sin θ, el output no tiene métrica. Es parte de ⟨P,θ,E⟩. |
| R9 (selección por θ_min) | Sin filtro, output inmanejable. |
| R13 (ensamblaje ⟨P,θ,E⟩) | Sin formato, no hay resultado formal. |
| R17 (gestión de Γ) | Sin γ, L está subdeterminada. |

### 5.3 Demostración de irreductibilidad

| Elemento removido | Resultado | ¿Funcional? |
|-------------------|-----------|:-----------:|
| Sin R1 | L no recibe W | ❌ |
| Sin R3 | Detect no produce candidatos | ❌ |
| Sin R7 | c no tiene θ | ❌ |
| Sin R9 | Output infinito/ruidoso | ❌ |
| Sin R13 | No hay formato de salida | ❌ |
| Sin R17 | L subdeterminada | ❌ |

**K(Pattern Discovery) es irreducible.** No puede reducirse más sin perder la capacidad de producir el output definido.

### 5.4 Kernel extendido (producción)

`
K_prod(Pattern Discovery) = K ∪ {R8 (evidencia), R14 (cross-conversación), R15 (trazabilidad), R18 (shadow mode)}
`

Sin estas extensiones, Pattern Discovery produce patterns sin trazabilidad, sin poder estadístico, sin aislamiento.

---

## 6. Operaciones redundantes

### 6.1 Detecciones duplicadas

| Par | ¿Redundantes? | Razón |
|-----|:-------------:|-------|
| R3 (estado) vs R4 (transición) | ❌ No | Estado describe condiciones estáticas; transición describe cambios. |
| R4 (transición) vs R5 (tendencia) | ❌ No | Transición mira pares; tendencia mira secuencias. |
| R5 (tendencia) vs R6 (dependencia) | ❌ No | Tendencia mira un campo; dependencia mira dos campos. |
| R3 (estado) vs R6 (dependencia) | ❌ No | Estado mira un snapshot; dependencia mira correlación. |

**Conclusión:** No hay detecciones redundantes. Cada tipo captura una dimensión diferente.

### 6.2 Pasos duplicados en el pipeline

| Par | ¿Redundantes? | Razón |
|-----|:-------------:|-------|
| R7 (θ) vs R9 (θ_min) | ❌ No | R7 COMPUTA; R9 FILTRA. |
| R10 (relevancia) vs R11 (no-redundancia) | ❌ No | Uno filtra por importancia; otro por unicidad. |

**Conclusión:** No hay pasos redundantes.

### 6.3 Solapamiento con otras capas

| Operación | ¿Solapa? | Detalle |
|-----------|:--------:|---------|
| R2 (δ) | ❌ No | Solo vive en Pattern Discovery desde PR-6. |
| R3-R6 (detección) | ❌ No | Ninguna capa detecta regularidades. |
| R7 (θ) | ❌ No | Ninguna capa computa confianza probabilística. |
| R9-R11 (selección) | ⚠️ Potencial | Goals también selecciona (compromisos), pero son objetos distintos. |

**Conclusión:** No hay redundancia con otras capas.

---

## 7. Operaciones derivables

### 7.1 ¿Puede alguna operación derivarse de otras?

| Operación | ¿Derivable? | De | ¿Práctico? |
|-----------|:-----------:|:--:|:----------:|
| R4 (transición) | ✅ Parcial | R3 (estado) + R2 (δ) | Sí, una transición es un cambio de estado entre dos snapshots. R4 = detect(R3(s_i), R3(s_i+1)). |
| R5 (tendencia) | ✅ Parcial | R4 (transiciones) | Sí, una tendencia es una secuencia de transiciones en la misma dirección. |
| R3 (estado) | ❌ No | — | Es la base. No deriva de nada. |
| R6 (dependencia) | ❌ No | — | Requiere análisis cross-campo. No deriva de R3-R5. |
| R7 (θ) | ❌ No | — | Requiere datos de detección + evidencia. |
| R9-R11 (selección) | ❌ No | — | Depende de criterios externos (Goals). |

**Hallazgo:** R4 es derivable de R3 + R2. R5 es derivable de R4. Esto sugiere que Pattern Discovery NO necesita implementar R4 y R5 como detectores independientes — pueden componerse a partir de R3.

**Pero la derivación NO elimina la responsabilidad.** El cómputo debe ocurrir en algún lado. La derivación solo dice que no necesita un algoritmo separado.


### 7.2 ¿Puede Pattern Discovery completo derivarse de snapshots + reglas?

En el límite: ¿Puede Goals obtener toda la información que necesita directamente de los snapshots de Memory, sin que Pattern Discovery los transforme en patterns?

Sí, si Goals aplica reglas estáticas directamente sobre W:
- "Si readiness fue 'partial' por 3 turnos consecutivos → hacer clarificación"
- "Si missingInfo contiene el mismo campo 2 veces → ofrecer ayuda"

Estas reglas NO requieren patterns. Requieren acceso a W y lógica condicional.

**Conclusión:** Pattern Discovery es DERIVABLE en el sentido de que su output puede reemplazarse por reglas estáticas en Goals. Pero esto sacrifica:
- Descubrimiento de patrones imprevistos
- Confianza probabilística (θ)
- Trazabilidad (E)
- Adaptabilidad (Γ configurable)

---

## 8. Responsabilidades escondidas

### 8.1 Responsabilidad escondida: gestión de estado cross-conversación

Pattern Discovery necesita acumular datos a través de conversaciones. Esto implica:

- Almacenamiento persistente de snapshots históricos
- Política de retención (cuántas conversaciones mantener)
- Política de expiración (datos antiguos vs. recientes)
- Indexación para consulta eficiente por ventana

**¿Esto es responsabilidad de Pattern Discovery o de Memory?**

Actualmente: Memory (M-6) particiona por conversación. Pattern Discovery cruza conversaciones. Esto implica que Pattern Discovery necesita su propio mecanismo de acumulación o consultar a Memory de forma cross-conversación, lo que Memory no soporta por diseño.

**Problema arquitectónico:** La acumulación cross-conversación no está claramente asignada. Pattern Discovery la necesita, pero Memory tiene los datos. Hay una **responsabilidad implícita** de "gestión de datos históricos cognitivos" que no pertenece explícitamente a ninguna capa.

### 8.2 Responsabilidad escondida: determinación de relevancia

Pattern Discovery decide si un patrón es "relevante" (R10) sin conocer el contexto de Goals. La relevancia es una función de lo que Goals necesita, no de lo que Pattern Discovery descubre.

**Problema arquitectónico:** Pattern Discovery filtra patrones que Goals podría necesitar. Esto es una **decisión delegada incorrectamente**. Goals debería recibir patrones y decidir su relevancia, no al revés.

### 8.3 Responsabilidad escondida: versionado de patrones

Los patrones cambian cuando W cambia. Pattern Discovery no tiene un mecanismo explícito de versionado de patrones. Un consumidor (Goals) podría recibir M₁ en t₁ y M₂ en t₂, y no saber que M₁ quedó obsoleto.

**Problema arquitectónico:** Pattern Discovery produce patrones sin ciclo de vida explícito. La obsolescencia de patrones está implícita (nuevo M reemplaza al anterior). Esto debería estar formalizado.

### 8.4 Responsabilidad escondida: consistencia entre ventanas

Si dos ventanas W₁ y W₂ se solapan (ej. turns 1-10 y turns 5-15), Pattern Discovery puede producir patrones contradictorios para la misma región de datos.

**Problema arquitectónico:** No hay mecanismo de reconciliación. Goals recibe patrones potencialmente contradictorios sin saber cómo resolverlos.

---

## 9. Responsabilidades mezcladas

### 9.1 Mezcla crítica: selección en Pattern Discovery + selección en Goals

**Pattern Discovery** selecciona patrones por θ_min (R9), relevancia (R10), no-redundancia (R11).
**Goals** también selecciona — selecciona COMPROMISOS basados en patrones.

Ambas capas hacen SELECCIÓN. Pattern Discovery selecciona qué patrones reportar. Goals selecciona qué compromisos asumir.

**Problema:** Los criterios de selección de patrones están en Pattern Discovery, pero DEBERÍAN estar en Goals porque:
- Goals sabe qué tipo de patrón necesita para sus compromisos
- Pattern Discovery no tiene contexto de Goals
- Los umbrales de relevancia son específicos del caso de uso de Goals

**Esto es una responsabilidad mezclada.** La selección de patrones está en la capa incorrecta.

### 9.2 Mezcla secundaria: categorización en Pattern Discovery

Pattern Discovery categoriza patrones (R12) para que Goals los entienda. Pero la categorización depende de la TAXONOMÍA DE GOALS, no de Pattern Discovery. Si Goals cambia su taxonomía, Pattern Discovery debe cambiar.

**Esto es una responsabilidad mezclada.** La categorización semántica pertenece al consumidor, no al productor.

### 9.3 ¿Qué responsabilidades están PURAS en Pattern Discovery?

| Responsabilidad | ¿Pura? | ¿Por qué? |
|----------------|:------:|-----------|
| R1 (recepción) | ✅ | Es input. Neutral. |
| R2 (δ) | ✅ | Mecánica. No depende de contexto. |
| R3-R6 (detección) | ✅ | Algorítmica. No depende de Goals. |
| R7 (θ) | ✅ | Matemática. Función pura. |
| R8 (E) | ✅ | Derivable de W + candidatos. |
| R9 (θ_min) | ⚠️ **MEZCLADA** | Depende de lo que Goals necesita. |
| R10 (relevancia) | ⚠️ **MEZCLADA** | Depende de lo que Goals necesita. |
| R11 (no-redundancia) | ⚠️ **MEZCLADA** | Depende de lo que Goals considera duplicado. |
| R12 (categorización) | ⚠️ **MEZCLADA** | Depende de taxonomía de Goals. |
| R13 (ensamblaje) | ✅ | Formato. Neutral. |
| R14 (cross-conversación) | ✅ | Acumulación. Neutral. |
| R15-R18 (transversales) | ✅ | Infraestructura. Neutral. |

**4 responsabilidades mezcladas (R9-R12) que ontológicamente pertenecen a Goals.**

Esto es análogo a lo que ocurrió con Reflection: responsabilidades que no pertenecían a la capa donde estaban.

---

## 10. Violaciones potenciales

### 10.1 SRP — Single Responsibility Principle

**Pattern Discovery actual:** 18 responsabilidades (6 esenciales + 12 auxiliares).

**¿Es esto una violación de SRP?**

SRP dice: "una clase/módulo/capa debe tener una sola razón para cambiar."

Pattern Discovery tiene múltiples razones para cambiar:
- Nuevos tipos de regularidad a detectar (R3-R6)
- Nueva función de confianza (R7)
- Nuevos criterios de selección (R9-R11)
- Nueva taxonomía de categorías (R12)
- Nueva política de acumulación (R14)
- Nuevos parámetros Γ (R17)
- Nuevo mecanismo de shadow mode (R18)

**¿Son estas la MISMA razón de cambio?**

NO. Cambiar la función de confianza no tiene nada que ver con cambiar los tipos de regularidad. Cambiar la taxonomía de categorías no tiene nada que ver con cambiar la acumulación cross-conversación.

**Veredicto: VIOLACIÓN SRP.** Pattern Discovery tiene múltiples razones de cambio no relacionadas.

Sin embargo, esta violación es inherente a una capa que hace "pattern discovery." La detección, confianza, selección y categorización son parte del mismo dominio (descubrimiento de patrones), aunque tengan diferentes razones de cambio.

Contraste con el EE: cada capa del EE tiene EXACTAMENTE una responsabilidad. Pattern Discovery tiene 18.

**Pero:** Las 18 responsabilidades están cohesionadas por el dominio (pattern discovery). No son arbitrarias. La pregunta es si la cohesión del dominio compensa la violación de SRP.

### 10.2 DIP — Dependency Inversion Principle

Pattern Discovery depende de Memory (para W) y es consumido por Goals.

**¿Hay inversión de dependencias?**

Pattern Discovery NO depende de Goals. Goals depende de Pattern Discovery. Esto es correcto (cadena lineal).

Pattern Discovery depende de Memory (para obtener W). Esto también es correcto.

**Veredicto: SIN VIOLACIÓN.** DIP se respeta.

### 10.3 CCP — Common Closure Principle

"Las clases que cambian por las mismas razones deben estar juntas."

¿Las responsabilidades de Pattern Discovery cambian por las mismas razones?

R3-R6 (detección): cambian por nuevos campos cognitivos en EE.
R7 (confianza): cambia por nueva métrica de confianza.
R9-R11 (selección): cambian por nuevos requisitos de Goals.
R12 (categorización): cambia por nueva taxonomía.
R14 (acumulación): cambia por nueva política de retención.
R17 (Γ): cambia por nueva configuración.

**Estas son diferentes razones de cambio.** CCP sugiere que algunas responsabilidades deberían estar en componentes separados.

**Hallazgo:** R9-R12 tienen la MISMA razón de cambio que Goals (nuevos requisitos de decisión). Esto sugiere que DEBERÍAN estar en Goals, no en Pattern Discovery. Esto confirma §9.1.

### 10.4 CRP — Common Reuse Principle

"Las clases que se reutilizan juntas deben estar juntas."

Los consumidores de Pattern Discovery son:
- Goals (consume patrones completos)
- Auditoría (consulta ⟨c, γ, ts, W⟩)

**¿Se reutilizan todas las responsabilidades de Pattern Discovery juntas?**

Goals necesita patrones completos (R13). Pero no necesita δ (R2) ni acumulación (R14) directamente.

Auditoría necesita E (R8) y γ (R17). No necesita detección (R3-R6).

**Veredicto: VIOLACIÓN LEVE DE CRP.** Diferentes consumidores necesitan diferentes subconjuntos de Pattern Discovery. Pero esto es normal en una capa con múltiples contratos.

### 10.5 Arquitectura por capas

**¿Pattern Discovery respeta la cadena lineal?**

- Depende de Memory (capas anteriores): ✅ Sí.
- Es dependido por Goals (capas posteriores): ✅ Sí.
- Salta capas: ❌ No.

**Veredicto: RESPETA la arquitectura por capas.**

### 10.6 Separación ontológica

**¿Pattern Discovery produce un tipo de conocimiento diferente al de Memory?**

Memory: ProjectedState (1er orden, hechos puntuales).
Pattern Discovery: ⟨P, θ, E⟩ (2do orden, regularidades).

**Veredicto: SEPARACIÓN ONTOLÓGICA VÁLIDA.** Ya demostrado en PR-7A.

### 10.7 Tabla de violaciones

| Principio | ¿Violado? | Gravedad | Detalle |
|-----------|:---------:|:--------:|---------|
| SRP | ✅ **SÍ** | **ALTA** | 18 responsabilidades con diferentes razones de cambio |
| DIP | ❌ No | — | Dependencias correctas |
| CCP | ✅ **SÍ** | **MEDIA** | R9-R12 cambian por razones de Goals, no de Pattern Discovery |
| CRP | ✅ **SÍ** | **BAJA** | Diferentes consumidores necesitan diferentes subconjuntos |
| Capas | ❌ No | — | Cadena lineal respetada |
| Sep. ontológica | ❌ No | — | Aprobada en PR-7A |

**2 violaciones activas: SRP (alta) y CCP (media).** Ambas causadas por responsabilidades de selección (R9-R12) que ontológicamente pertenecen a Goals.

---

## 11. Veredicto

### 11.1 Síntesis de hallazgos

| Hallazgo | Sección | Impacto |
|----------|---------|---------|
| 18 responsabilidades en 1 capa | §1 | Alta complejidad |
| 4 responsabilidades mezcladas con Goals (R9-R12) | §9.1, §9.2 | **CRÍTICO** |
| Absorción por Memory: imposible (3 invariantes congelados) | §4.1 | — |
| Absorción por Goals: posible pero con 3 violaciones graves | §4.2 | Costo arquitectónico alto |
| Kernel irreducible de 6 responsabilidades | §5 | Núcleo necesario |
| Sin operaciones redundantes | §6 | — |
| Sin operaciones derivables que eliminen la capa | §7 | — |
| 4 responsabilidades escondidas | §8 | Riesgos latentes |
| Violación SRP y CCP activas | §10 | Requieren atención |

### 11.2 Respuesta a las preguntas de la misión

**¿Pattern Discovery contiene únicamente responsabilidades irreducibles?**

NO. Las responsabilidades R9-R12 (selección por θ_min, relevancia, no-redundancia, categorización) NO son irreducibles en Pattern Discovery. Pertenecen ontológicamente a Goals y pueden moverse sin violar el modelo matemático de Pattern Discovery.

**El núcleo irreducible de Pattern Discovery es:**

`
Kernel(Pattern Discovery) = {L_γ(W) = {⟨P, θ, E⟩ | P ∈ Detect_γ(W) ∧ θ = |E|/|W^k_τ|}}
`

Sin selección, sin categorización. Solo detección + confianza + evidencia.

### 11.3 Veredicto final

**Veredicto: C — Pattern Discovery puede simplificarse.**

**Justificación:**

Pattern Discovery tiene 4 responsabilidades (R9-R12) que ontológicamente pertenecen a Goals:
- Selección por umbral (R9): Goals decide qué confianza aceptar.
- Selección por relevancia (R10): Goals decide qué es relevante.
- Selección por no-redundancia (R11): Goals decide qué es duplicado.
- Categorización (R12): Goals define la taxonomía.

Estas responsabilidades están MEZCLADAS en Pattern Discovery cuando deberían estar en Goals. Su presencia en Pattern Discovery causa:
- **Violación SRP**: Pattern Discovery tiene razones de cambio que no son de pattern discovery sino de consumo de patrones.
- **Violación CCP**: R9-R12 cambian por razones de Goals, no de Pattern Discovery.

**Pattern Discovery simplificado (propuesto):**

`
PatternDiscovery_simplificado(W, γ) = M_raw = {⟨P, θ, E⟩ | P ∈ Detect_γ(W) ∧ θ = |E|/|W^k_τ| ∧ θ ≥ ε}
`

Donde ε es un umbral mínimo ABSOLUTO (no configurable por Goals), y NO hay selección por relevancia, no-redundancia, ni categorización.

Goals recibe M_raw y aplica:
- Su propio filtro por relevancia
- Su propia deduplicación
- Su propia categorización

Esto:
1. Elimina la violación SRP (Pattern Discovery solo detecta; Goals solo decide).
2. Elimina la violación CCP (cada capa cambia por sus propias razones).
3. Preserva el kernel irreducible (detección + confianza + evidencia).
4. Da a Goals control total sobre qué patrones usa.

### 11.4 ¿Por qué C y no D (eliminación)?

Pattern Discovery NO puede eliminarse porque:
1. Su kernel (detección + confianza) es irreducible. Debe existir en algún lado.
2. Absorberlo en Goals crea 3 violaciones graves (SRP, temporal, lenguaje).
3. Memory no puede absorberlo (3 invariantes congelados).
4. Planning y Runtime no pueden absorberlo (incompatibilidad ontológica).

La simplificación (C) es la opción óptima: reduce Pattern Discovery a su kernel irreducible y mueve las responsabilidades mezcladas a su capa ontológica correcta (Goals).

### 11.5 Comparación con Reflection

| Dimensión | Reflection (eliminado) | Pattern Discovery (simplificable) |
|-----------|----------------------|-------------------------|
| Responsabilidades | 1 (δ) | 18 → simplificable a 6 |
| ¿Qué falló? | 0 consumidores fuera de Pattern Discovery | 4 responsabilidades mezcladas con Goals |
| ¿Eliminable? | ✅ **SÍ** (sin violaciones) | ❌ **NO** (kernel irreducible, absorción dañina) |
| ¿Simplificable? | N/A (solo tenía 1) | ✅ **SÍ** (mover R9-R12 a Goals) |

---

*Este documento es resultado de la auditoría PR-7F. Aplica el mismo nivel de exigencia que las auditorías PR-6A a PR-6F que eliminaron Reflection. No propone código, interfaces ni implementaciones. Solo análisis arquitectónico formal.*

---

## Anexo A: Mapa de responsabilidades post-simplificación

### Pattern Discovery simplificado (kernel irreducible)

| ID | Responsabilidad | ¿Permanece? |
|----|----------------|:-----------:|
| R1 | Recepción de W | ✅ Sí |
| R2 | Cómputo de δ | ✅ Sí (interno) |
| R3 | Detección estado | ✅ Sí |
| R4 | Detección transición | ✅ Sí |
| R5 | Detección tendencia | ✅ Sí |
| R6 | Detección dependencias | ✅ Sí |
| R7 | Cómputo de confianza θ | ✅ Sí |
| R8 | Ensamblaje de evidencia E | ✅ Sí |
| R9 | Selección por θ_min | ➡️ **A Goals** |
| R10 | Selección por relevancia | ➡️ **A Goals** |
| R11 | Selección por no-redundancia | ➡️ **A Goals** |
| R12 | Categorización τ | ➡️ **A Goals** |
| R13 | Ensamblaje ⟨P,θ,E⟩ | ✅ Sí (sin categorización) |
| R14 | Acumulación cross-conversación | ✅ Sí |
| R15-R18 | Transversales | ✅ Sí |

### Responsabilidades de Goals (extendidas post-simplificación)

| Nueva responsabilidad | Origen | ¿Por qué Goals? |
|----------------------|--------|-----------------|
| Selección por θ_min | R9 → Goals | Goals sabe qué confianza necesita. |
| Selección por relevancia | R10 → Goals | Goals sabe qué es relevante para decidir. |
| Selección por no-redundancia | R11 → Goals | Goals sabe qué es duplicado en su contexto. |
| Categorización τ | R12 → Goals | Goals define la taxonomía que usa. |

