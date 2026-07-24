# Auditoría #06 — Arquitectura Cognitiva

> **Fecha:** 2026-07-11
> **Tipo:** Auditoría fundacional
> **Propósito:** Definir cómo piensa AITOS — no cómo responde, no cómo procesa, no cómo programa.
> **Método:** Síntesis de 5 auditorías previas + revisión crítica de toda la documentación arquitectónica.
> **Restricción:** 100% conceptual. Cero código, cero tablas, cero clases, cero APIs.

---

## Prefacio: El estado de las fuentes

### Auditorías #01 y #02: AUSENTES

Las auditorías #01 (Modelo Cognitivo Actual) y #02 (Modelo Cognitivo Ideal) **no existen como archivos en el repositorio**. Fueron producidas en una sesión efímera de AE L que no preservó sus artefactos.

**Esto es un problema grave.** Auditoría #03 las cita como referencia fundamental y su estructura interna (clasificación del backlog) depende de la existencia del contraste entre el modelo actual y el ideal. Sin los originales, no podemos verificar:

- Qué brechas específicas identificó #01 que hoy siguen abiertas
- Qué principios del modelo ideal (#02) fueron priorizados correctamente vs. cuáles no
- Si el análisis de #03 es consistente con lo que #01 y #02 realmente dijeron

**Corrección propuesta:** Esta auditoría (#06) debe cumplir la función de #01 y #2 simultáneamente: definir el modelo ideal Y evaluar la distancia al actual. No es ideal hacerlo en un solo documento, pero es necesario porque los originales se perdieron.

### Contradicciones detectadas entre documentos existentes

Se detectaron las siguientes contradicciones entre fuentes:

1. **SYSTEM_BIBLE §5 vs. operacional-model.md §2**: SYSTEM_BIBLE dice que el operational model son 6 slots (origin, destination, passengers, scheduled_at, price, vehicle). El operational-model.md dice que incluye flight y vehicle_type. Ambas deberían coincidir — el modelo conceptual no debería tener ambigüedad en su definición canónica.

2. **ARCHITECTURE_BIBLE §3.1 vs. ADR-001**: La ARCHITECTURE_BIBLE muestra AI debajo de Services en el layering. ADR-001 y el código muestran que el AI layer (CORE, Router, Policies) se ejecuta DENTRO del pipeline de Services (lead.service llama a handler.ts que llama a core → router → policy). No hay contradicción funcional pero la representación es engañosa.

3. **DECISION_TREE vs. decision-architecture.md**: El DECISION_TREE muestra un flujo lineal con comprehensión check ANTES de extracción. decision-architecture.md muestra comprehensión como una compuerta (gate) que ocurre DESPUÉS de extracción. Ambas representaciones existen en el código real en diferentes momentos, pero la documentación las trata como el mismo concepto.

4. **ARCHITECTURE_BIBLE §7.1 vs. operacional-model.md §2**: El slot lifecycle en ARCHITECTURE_BIBLE muestra RAW → INFERRED → CONFIRMATION_PENDING → CONFIRMED con USER_CORRECTED / USER_CONFIRMED. operational-model.md muestra RAW → INFERRED → CONFIRMATION_PENDING → CONFIRMED. Hay 3 estados faltantes en operational-model.md.

5. **PROJECT_BOARD vs. BACKLOG (AITOS Plan)**: El PROJECT_BOARD lista P0-P3 tasks ; el BACKLOG lista AIT-001 a AIT-064 organizados por fases. Ningún documento referencia al otro. Existen dos backlogs paralelos sin reconciliación.

6. **ADR-008 vs. H2.1 de las simulaciones**: ADR-008 congela la arquitectura; las simulaciones de Etapa 3 (roleLock defectuoso, COMBINED_GREETING como punto único de fallo) revelan bugs que no pueden arreglarse bajo el freeze sin nuevas ADRs.

---

## 0. Resumen ejecutivo

**Pregunta:** *¿Cómo piensa AITOS?*

**Respuesta corta:** AITOS no piensa. Procesa.

Su arquitectura cognitiva actual es un **pipeline de clasificación determinista** que transforma mensajes en operaciones de negocio. No hay un modelo de creencias, no hay hipótesis múltiples, no hay evaluación probabilística del conocimiento. Hay un flujo secuencial: clasificar → extraer → resolver → decidir → responder.

El sistema actual es **competente pero no consciente**. Resuelve el problema de transformar lenguaje en operaciones con alta precisión (96% en evals), pero no tiene las propiedades fundamentales de un sistema cognitivo: no puede sostener incertidumbre, no puede cambiar de opinión gradualmente, no puede integrar evidencia contradictoria.

**La brecha:** El sistema actual opera con un modelo de estados (state machine + slots + intención única). El modelo cognitivo ideal opera con un modelo de evidencia (Evidence Store + Hypothesis Network + Commitment Engine). La diferencia no es técnica — es **conceptual**. No se necesita más código; se necesita una reorganización fundamental de cómo el sistema representa el conocimiento.

**Score de madurez cognitiva: ~15%**

El 85% restante no es implementación — es **definición**. El sistema actual refleja fielmente la arquitectura que fue diseñada para él. Si queremos un sistema cognitivo, necesitamos una arquitectura cognitiva.

---

## 1. ¿Qué significa percibir?

### Definición

Percibir es el proceso de **transformar un fenómeno del mundo exterior en una observación registrada**, sin añadir significado.

La percepción termina en el momento exacto en que se asigna significado a lo observado. Ese acto ya no es percepción — es **interpretación**.

### ¿Qué entra al sistema?

Entra un **evento de canal**: un mensaje de WhatsApp con:
- Una secuencia de caracteres (texto)
- Un identificador de origen (número de teléfono)
- Un momento (timestamp de recepción)
- Un metadato de canal (tipo de mensaje: texto, botón, audio, imagen)

Esto es todo lo que entra. Nada más.

El sistema no percibe:
- La intención del usuario (eso es interpretación)
- El estado emocional del usuario (eso es inferencia)
- El contexto cultural (eso es conocimiento previo)
- La veracidad del mensaje (eso es evaluación)

### ¿Qué todavía NO es conocimiento?

Lo que entra es un **fenómeno bruto**. No es conocimiento hasta que:
1. Ha sido registrado como evidencia (percepción completa)
2. Ha sido contrastado con otras evidencias (interpretación en curso)
3. Ha generado una hipótesis (conocimiento naciente)

Entre el mensaje bruto y la primera hipótesis hay una frontera clara: **el registro como evidencia**.

### ¿Qué parte solamente observa?

La **capa de recepción** (hoy: WhatsApp webhook) solamente observa. Recibe, valida integridad (HMAC), verifica que no sea duplicado, y entrega el fenómeno bruto al siguiente nivel.

Su función termina cuando entrega: *"Esto fue lo que llegó: texto X, desde teléfono Y, a las Z, por canal W."*

### ¿Qué parte interpreta?

La **capa cognitiva** interpreta. Toma la evidencia registrada y la contrasta con:
- Evidencia previa (historial de la conversación)
- Conocimiento base (lugares, horarios, reglas)
- Hipótesis activas (lo que el sistema cree que está pasando)

### ¿Qué parte registra?

La **Evidence Store** registra. Es el único componente que escribe evidencia. Nadie más tiene permiso de escribir en la Evidence Store.

### ¿Cuál es el límite entre observación e interpretación?

El límite es la **Evidence Store**.

Todo lo que está antes del registro en la Evidence Store es observación.
Todo lo que está después es interpretación.

El acto de registrar "mensaje recibido: texto=`hola`, phone=`+549...`" es observación.
El acto de decir "este mensaje es un saludo porque contiene 'hola'" es interpretación.

**En el sistema actual:** Este límite no existe. El webhook entrega directamente a `handleLeadMessage`, que comienza a interpretar inmediatamente. No hay un paso de registro puro antes de la interpretación.

**Corrección:** Debe existir un paso explícito de registro en la Evidence Store antes de cualquier intento de interpretación. El flujo debe ser:

```
Mensaje → Webhook → [REGISTRO EN EVIDENCE STORE] → Recién aquí comienza la interpretación
```

---

## 2. ¿Qué significa conocer?

### Definición

Conocer es el proceso de **mantener evidencia integrada** de manera que pueda ser usada para generar hipótesis, tomar decisiones y guiar acción.

No todo lo percibido es conocido. Algo es conocido cuando:
1. Está registrado como evidencia (percibido)
2. Está vinculado con otras evidencias (integrado)
3. Puede influir en decisiones futuras (accesible)

### ¿Qué información pasa a formar parte del conocimiento?

Pasa a formar parte del conocimiento cuando la evidencia es:

1. **Registrada inmutablamente** en la Evidence Store
2. **Indexada** para recuperación por: phone, tipo, ventana temporal, chain_id
3. **No borrada ni modificada** — la evidencia es permanente

No hay un juicio de relevancia en el momento del registro. Toda evidencia se registra. La relevancia se determina después, durante la interpretación.

### ¿Cuándo deja de ser un mensaje y pasa a ser evidencia?

Un mensaje deja de ser un mensaje en el momento exacto en que es registrado en la Evidence Store. Antes del registro, es un fenómeno transitorio (el mensaje en la cola de Meta). Después del registro, es evidencia permanente.

El cambio de estado es:

```
Mensaje (transitorio, no registrado) → [REGISTRO] → Evidencia (permanente, registrada)
```

### ¿Cuándo una evidencia deja de ser útil?

Una evidencia nunca deja de ser útil en términos absolutos. Puede volverse **no relevante** para las hipótesis actuales, pero eso no significa que deba eliminarse.

Una evidencia es relevante cuando:
- Su phone coincide con la sesión activa
- Su timestamp está dentro de la ventana de atención del sistema
- Su tipo puede informar hipótesis activas

Una evidencia es **no relevante** cuando:
- Su phone no tiene sesión activa
- Su timestamp está fuera de la ventana (ej: >48h)
- No existen hipótesis que pueda informar

### ¿Puede desaparecer?

**No.** La evidencia registrada es inmutable. Nunca desaparece.

Lo que puede desaparecer es **la atención del sistema sobre ella**. Las hipótesis pueden morir, los compromisos pueden expirar, la proyección puede recalcularse. Pero la evidencia original permanece.

### ¿Puede degradarse?

**La evidencia no se degrada.** El hecho registrado es lo que es, para siempre.

Lo que se degrada es **la confianza en las hipótesis basadas en evidencia antigua**. Una evidencia de hace 48 horas tiene el mismo peso ontológico que una de hace 5 minutos, pero el sistema puede (y debe) asignarle menor peso en el cálculo de confianza actual.

---

## 3. ¿Qué significa creer?

### Definiciones formales

#### Belief (Creencia)

Una **creencia** es una hipótesis que el sistema mantiene como verdadera para efectos de decisión. No es verdad objetiva — es una apuesta del sistema sobre el estado del mundo.

Toda creencia tiene:
- Un **objeto**: aquello sobre lo que se cree (el viaje, el destino, la hora)
- Un **valor**: el contenido de la creencia (Aeropuerto IGR, 2 pasajeros, 9:00)
- Una **fuerza**: qué tan seguro está el sistema (0.0 - 1.0)
- Una **fuente**: qué evidencia la sustenta (lista de referencias a evidencia)
- Un **momento de creación**: timestamp de cuándo se formó
- Un **momento de última actualización**: timestamp de cuándo se revisó

#### Hypothesis (Hipótesis)

Una **hipótesis** es una creencia en formación que aún no alcanzó el umbral de decisión.

Diferencias con creencia:

| Atributo | Creencia | Hipótesis |
|----------|----------|-----------|
| Fuerza mínima | ≥ umbral de decisión | < umbral de decisión |
| Impacta decisiones | Sí | No directamente |
| Se proyecta | Sí (a Operational Projection) | No |
| Puede coexistir | Con otras creencias compatibles | Con otras hipótesis contradictorias |
| Requiere confirmación | No (ya es decisión) | Sí |
| Tiempo de vida | Indefinido (hasta refutación) | Limitado (decae si no se confirma) |

#### Certainty (Certidumbre)

La **certidumbre** es la probabilidad estimada de que una creencia sea correcta. Se expresa como un valor entre 0.0 y 1.0.

- 0.0 = certeza absoluta de falsedad
- 1.0 = certeza absoluta de verdad
- 0.5 = equivalente a una moneda al aire

La certidumbre NO es una probabilidad frecuentista. Es una **probabilidad epistémica**: cuánta confianza tiene el sistema en su propio conocimiento.

El cálculo de certidumbre considera:
1. **Calidad de la fuente**: regex > entidad DB > LLM > inferencia heurística
2. **Cantidad de evidencia**: más fuentes independientes → mayor certidumbre
3. **Coherencia**: la evidencia nueva es coherente con la previa → la certidumbre sube; contradictoria → baja
4. **Recencia**: evidencia más reciente tiene mayor peso
5. **Estabilidad**: el valor no ha cambiado en múltiples turnos → mayor certidumbre

#### Confidence (Confianza)

La **confianza** es la fiabilidad atribuida a una **fuente** de evidencia. Es independiente de la creencia específica.

| Fuente | Confianza base | Fundamento |
|--------|---------------|------------|
| Regex determinista | Alta (0.95) | Regla explícita, sin ambigüedad |
| Entidad con DB | Alta (0.90) | Match contra conocimiento canónico |
| LLM con contexto | Media (0.70) | Interpretación probabilística |
| Inferencia heurística | Media-baja (0.55) | Regla basada en patrón, no en evidencia directa |
| LLM sin contexto | Baja (0.40) | Riesgo de alucinación |
| Silencio / ausencia | Muy baja (0.20) | No hay evidencia afirmativa |

La confianza de fuente es un **dato ontológico**, no un juicio. No debería cambiar por contexto. Cambia solo cuando hay evidencia de que la fuente es más o menos fiable (ej: un `pattern` que produce falsos positivos documentados → su confianza base baja).

#### Commitment (Compromiso)

Un **compromiso** es una creencia que ha cruzado el umbral de decisión y ha sido **actuada**: el sistema se ha comprometido con ella ante el usuario (o ante el negocio).

Características del compromiso:
- Es **vinculante**: el sistema actuó basado en él
- Es **reversible** pero con costo: deshacer un compromiso tiene costo (cancelar un viaje, desdeñar una confirmación)
- Tiene **timestamp de compromiso**: cuándo se tomó la decisión
- Tiene **umbral de compromiso**: qué certidumbre tenía en el momento de decidir
- Tiene **costo de error asociado**: qué se pierde si el compromiso resulta incorrecto

El compromiso es la **frontera entre cognición y acción**. Antes del compromiso, el sistema piensa. Después del compromiso, el sistema opera.

### Diferencia fundamental entre todos

| Concepto | ¿Qué es? | ¿Quién lo crea? | ¿Se modifica? | ¿Expira? |
|----------|----------|-----------------|---------------|----------|
| **Evidencia** | Un hecho registrado | Percepción | No (inmutable) | No (permanente) |
| **Belief** | Hipótesis con suficiente certidumbre | Cognición | Sí (se actualiza con nueva evidencia) | Sí (si es refutada) |
| **Hypothesis** | Interpretación candidata | Cognición | Sí (evoluciona con evidencia) | Sí (decae sin confirmación) |
| **Certainty** | Probabilidad de una creencia | Calculada desde evidencia | Sí (continuamente) | N/A (no es una entidad) |
| **Confidence** | Fiabilidad de una fuente | Asignada por diseño | Raramente (solo con meta-evidencia) | No |
| **Commitment** | Una creencia actuada | Decisión | Sí (puede revocarse con costo) | Sí (se cumple o se cancela) |

### En el sistema actual

El sistema actual **confunde todos estos conceptos**:

- `confidence` en el código actual es un score 0-1 sobre un slot, pero se usa indistintamente como "qué tan seguro está el sistema" y "cuán buena es la fuente". Deberían ser dos conceptos separados.
- `status` (RAW → INFERRED → CONFIRMATION_PENDING → CONFIRMED) mezcla certidumbre con compromiso. Un slot CONFIRMED es un compromiso, no solo una creencia.
- `purchaseIntent` es una creencia sobre la intención del usuario, pero se computa como una señal derivada en lugar de emerger de la Hypothesis Network.
- `commitment` no existe como concepto. La confirmación del usuario es binaria (Sí/No) sin umbral probabilístico.

---

## 4. ¿Cómo evolucionan las creencias?

### 4.1 ¿Cómo nacen?

Una creencia nace cuando:

1. **Entra nueva evidencia** que no puede ser explicada por creencias existentes
2. La evidencia es **evaluada** contra:
   - Las creencias actuales (¿es coherente?)
   - El conocimiento base (¿tiene sentido?)
   - El contexto (¿es relevante ahora?)
3. Si la evidencia es coherente con creencias existentes, **fortalece** esas creencias
4. Si la evidencia contradice creencias existentes, **genera una hipótesis alternativa**
5. Si la evidencia no se relaciona con creencias existentes, **genera una hipótesis nueva**

En el sistema actual:
- Las creencias "nacen" en `core.ts` (intención) y `extraction-runner.ts` (slots)
- Nacen **de a una por vez** — el sistema elige UNA intención y UN set de slots
- No hay nacimiento de hipótesis alternativas

En el modelo ideal:
- Pueden nacer múltiples hipótesis simultáneamente
- "IGR" → hipótesis: destino del viaje (60%), código de aeropuerto para origen (30%), referencia a vuelo (10%)
- El nacimiento es un proceso, no un evento — la hipótesis se forma gradualmente a medida que la evidencia se acumula

### 4.2 ¿Cómo crecen?

Una creencia crece cuando:

1. **Evidencia confirmatoria** se acumula: cada nueva pieza que respalda la misma hipótesis aumenta su certidumbre
2. **Evidencia contradictoria se resuelve**: cuando una contradicción aparente se explica consistentemente
3. **El tiempo pasa sin refutación**: la estabilidad en el tiempo aumenta la certidumbre (si no hay evidencia en contra después de N oportunidades, la creencia se fortalece)
4. **Otras creencias la respaldan**: una creencia consistente con otras creencias firmes gana certidumbre

Factor de crecimiento:

```
new_certainty = old_certainty + (evidence_weight × source_confidence × coherence_factor)
```

Donde:
- `evidence_weight`: qué tanto aporta esta evidencia (proporcional a su especificidad)
- `source_confidence`: fiabilidad de la fuente (0.2-0.95)
- `coherence_factor`: 1 si la evidencia confirma, -1 si contradice, 0 si es irrelevante

### 4.3 ¿Cómo compiten?

Las hipótesis compiten por la **certidumbre disponible**. La suma de certidumbre de todas las hipótesis para un mismo objeto no puede exceder 1.0.

Cuando dos hipótesis explican la misma evidencia:

```
H1: "El usuario quiere reservar un viaje" — certidumbre 0.7
H2: "El usuario solo quiere saber el precio" — certidumbre 0.3
```

La evidencia nueva puede:
- **Favorecer a H1**: H1 sube (ej: 0.85), H2 baja (ej: 0.15)
- **Favorecer a H2**: H2 sube, H1 baja
- **Ser irrelevante**: ambas mantienen su certidumbre
- **Contradecir a ambas**: ambas bajan, posiblemente nace H3

En el sistema actual:
- NO hay competencia — hay selección. CORE elige una intención.
- No hay "H1 70%, H2 30%". Hay "intención = BOOKING" (única).
- La competencia real (cuando CORE duda) produce `AMBIGUOUS` que escala, no hipótesis alternativas.

### 4.4 ¿Cómo se fusionan?

Dos hipótesis se fusionan cuando:

1. **Predicen el mismo resultado**: ambas llevan a la misma proyección operacional
2. **No hay evidencia que las distinga**: la información disponible no permite diferenciarlas
3. **Su fusión produce una hipótesis más simple**: la navaja de Occam aplicada al espacio de hipótesis

Ejemplo:
```
H1: "El usuario quiere ir al aeropuerto IGR" — origin = Aeropuerto IGR
H2: "El usuario quiere ir al aeropuerto Cataratas" — origin = Aeropuerto IGR
```
Fusión: "El usuario quiere ir al Aeropuerto IGR" (certidumbre resultante: H1 + H2 combinadas)

**Regla de fusión:** La certidumbre de la hipótesis fusionada no puede exceder la certidumbre de la hipótesis más fuerte de las originales. La fusión no crea certidumbre — la consolida.

### 4.5 ¿Cómo se dividen?

Una hipótesis se divide cuando:

1. **Evidencia discriminatoria** aparece: nueva información que permite distinguir entre dos casos que antes eran indistinguibles
2. **La hipótesis cubre demasiado**: intenta explicar evidencia que en realidad apunta a fenómenos distintos

Ejemplo:
```
H1: "El usuario quiere ir al centro" — certidumbre 0.8
```
Nueva evidencia: el usuario menciona "Hotel Amerian"
```
H1a: "El usuario quiere ir al Hotel Amerian (en el centro)" — certidumbre 0.6
H1b: "El usuario quiere ir al centro (otra ubicación que no es el hotel)" — certidumbre 0.3
```

### 4.6 ¿Cómo mueren?

Una hipótesis muere cuando:

1. **Su certidumbre cae por debajo del umbral de abandono** (ej: < 0.05)
2. **Es refutada explícitamente** por el usuario ("no, no es ahí")
3. **Su ventana de relevancia expira** (ej: una hipótesis de booking que no se confirma después de 48h)
4. **Es reemplazada** por una hipótesis con mayor certidumbre que cubre la misma evidencia

La muerte no es eliminación. La hipótesis se marca como `DORMANT` y puede reactivarse si nueva evidencia la respalda.

En el sistema actual:
- Las hipótesis mueren por **reemplazo directo**: CORE asigna una nueva intención en cada turno
- No hay umbral de abandono — la intención previa se pierde completamente
- No hay hipótesis DORMANT — no hay reactivación

### 4.7 ¿Cómo reaparecen?

Una hipótesis reaparece cuando:

1. **Evidencia nueva** es coherente con una hipótesis DORMANT
2. **El contexto cambia** de vuelta a un estado donde la hipótesis es relevante
3. **Se detecta un patrón repetido** consistente con la hipótesis dormante

Ejemplo:
- Turno 1: Usuario pide precio de aeropuerto→centro → H1: "commercial inquiry" (activa)
- Turno 2: Usuario dice "gracias" → H1: "commercial inquiry" (DORMANT, reemplazada por saludo)
- Turno 3: Usuario dice "cuánto sale el hotel" → H1: "commercial inquiry" (REACTIVADA)
- El sistema no debería empezar de cero — debería recuperar H1 y combinarla con la nueva evidencia

### 4.8 ¿Cómo se degradan?

La degradación no es de la hipótesis en sí, sino de su **certidumbre por paso del tiempo** sin evidencia confirmatoria o refutatoria.

Factor de degradación:

```
degraded_certainty = certainty × e^(-λ × Δt)
```

Donde:
- `λ` (lambda) es la tasa de degradación, específica por tipo de hipótesis
- `Δt` es el tiempo desde la última evidencia relevante

Hipótesis de corto plazo (ej: "el usuario quiere saber el precio") → λ alto (decae rápido)
Hipótesis de largo plazo (ej: "el usuario prefiere pagar en efectivo") → λ bajo (decae lento)

---

## 5. Objetivo del cliente

### ¿Qué es?

El **objetivo del cliente** es la respuesta a la pregunta: *"¿Qué intenta lograr el usuario con esta interacción?"*

No es una clasificación de intención (booking, consulta, saludo). Es una **síntesis** que combina:
- La(s) intención(es) detectada(s)
- La evidencia de la conversación
- El contexto del usuario (recurrente, nuevo, con urgencia)
- El estado actual del compromiso (si hay un viaje en curso)

### ¿Cómo emerge?

En el modelo actual: `clientObjective` es computado por `client-objective.ts` a partir de señales derivadas (purchaseIntent, urgency, messageType, intent, facts, conversationState). Produce una clasificación: `booking_urgent`, `inquiry_price`, `comparing_options`, `trust_check`, etc.

En el modelo ideal: el objetivo EMERGE de la Hypothesis Network. No es una clasificación separada — es la **hipótesis dominante sobre la intención del usuario** después de integrar toda la evidencia disponible.

```
[Hypothesis Network]
  └─ H1: "El usuario quiere reservar" (0.7)
  └─ H2: "El usuario solo compara precios" (0.2)
  └─ H3: "El usuario saluda" (0.1)

       ↓

[Objetivo emergente] = el que domina la proyección operacional
Si H1 domina → proyección: "necesita un viaje completo"
Si H2 domina → proyección: "necesita información de precios"
```

### ¿Cómo cambia?

El objetivo cambia cuando la Hypothesis Network cambia su distribución de certidumbre. Cada nueva evidencia puede:

- **Confirmar el objetivo actual**: la hipótesis dominante se fortalece
- **Refutar el objetivo actual**: una hipótesis alternativa toma el liderazgo
- **Matizar el objetivo actual**: el objetivo se refina (ej: de "reservar" a "reservar para hoy con urgencia")

El cambio de objetivo NO es un evento discreto — es una **transición gradual**. El sistema nunca debería "cambiar de opinión" abruptamente sobre lo que el usuario quiere. Debería mostrar evidencia de la transición.

En el sistema actual: `clientObjective` se recalcula desde cero en cada turno. No hay gradualidad. No hay memoria del objetivo anterior.

### ¿Cómo se refina?

El objetivo se refina mediante:

1. **Acumulación de evidencia**: cada turno agrega precisión
2. **Confirmaciones explícitas**: "sí, quiero reservar" → refina el objetivo
3. **Rechazos**: "no, solo preguntaba" → descarta hipótesis
4. **Silencio**: la ausencia de mensaje después de una oferta también es evidencia

El refinamiento es cíclico:

```
Objetivo amplio (turno 1) → [evidencia] → Objetivo más preciso (turno 2) → ...
```

### ¿Cómo convive con múltiples intenciones?

El usuario puede tener múltiples intenciones simultáneas. No son excluyentes.

Ejemplo real:
- "Hola, ¿cuánto sale del aeropuerto al centro? Somos 2."

Intenciones simultáneas:
1. Saludar (social)
2. Preguntar precio (comercial)
3. Indicar pasajeros (preparar reserva)
4. Indicar ruta (geo)

En el modelo actual: CORE elige UNA intención (BOOKING, COMMERCIAL, o GREETING). Las otras se pierden.

En el modelo ideal: La Hypothesis Network mantiene múltiples intenciones simultáneas:

```
H_intent_social: "El usuario saluda" (0.3)
H_intent_commercial: "El usuario quiere precio" (0.9)
H_intent_booking: "El usuario quiere reservar" (0.6)
```

Cada intención informa una dimensión diferente de la respuesta:
- El saludo → tono de la respuesta
- El precio → contenido informativo
- La reserva → acción siguiente

---

## 6. Estrategia

### Premisa fundamental

**La estrategia NO puede depender de estados.** Debe depender del conocimiento acumulado.

Esto es una ruptura radical con el sistema actual, donde:
- `StrategyDecision` se computa desde señales derivadas (purchaseIntent, urgency, messageType)
- El flujo está gobernado por una state machine (`collecting_slots → slot_confirmation → awaiting_passenger → awaiting_confirmation`)
- Las políticas (`policy-ahora`, `policy-reserva`) deciden basadas en el estado conversacional

### ¿Qué consume la estrategia?

La estrategia consume **tres dimensiones del conocimiento acumulado**:

#### Dimensión 1: Estado de la evidencia
- ¿Cuánta evidencia tenemos? (cantidad)
- ¿Qué tan buena es? (calidad de fuentes)
- ¿Qué tan reciente es? (recencia)
- ¿Hay evidencia contradictoria? (coherencia)

#### Dimensión 2: Estado de la Hypothesis Network
- ¿Cuántas hipótesis activas hay? (diversidad)
- ¿Hay una hipótesis dominante? (concentración)
- ¿La hipótesis dominante es estable? (persistencia entre turnos)
- ¿Hay hipótesis en conflicto? (tensión)

#### Dimensión 3: Estado del Commitment
- ¿Hay compromisos activos? (viajes en curso, reservas)
- ¿Qué tan costoso sería equivocarse ahora? (costo de error)
- ¿El usuario ha dado señales de compromiso? (urgencia, intención de compra)

### ¿Qué produce la estrategia?

La estrategia produce una **postura estratégica**:

```
Postura = {
  modo: "acelerar" | "indagar" | "confirmar" | "ejecutar" | "escalar",
  profundidad: "superficial" | "normal" | "profunda",
  riesgo: "conservador" | "balanceado" | "audaz",
  iniciativa: "reactivo" | "proactivo" | "sugerente"
}
```

| Postura | Cuándo ocurre | Comportamiento |
|---------|---------------|----------------|
| **Acelerar** | Alta certidumbre + bajo costo de error | Saltar pasos, inferir, ejecutar directo |
| **Indagar** | Baja certidumbre + bajo costo de error | Preguntar, explorar, mantener opciones |
| **Confirmar** | Certidumbre media + alto costo de error | Presentar resumen, pedir confirmación explícita |
| **Ejecutar** | Alta certidumbre + compromiso explícito | Actuar sin más preguntas |
| **Escalar** | Baja certidumbre + alto costo de error | Derivar a humano con contexto |

### ¿Qué jamás debe modificar la estrategia?

La estrategia **jamás modifica**:

1. **La Evidence Store.** La evidencia es inmutable. La estrategia la lee, la pondera, la prioriza — pero no la cambia.
2. **Las hipótesis.** La estrategia no crea ni destruye hipótesis. Solo decide cuál priorizar para la acción.
3. **El conocimiento base.** Lugares, horarios, reglas de negocio — la estrategia no los modifica.

La estrategia SOLO modifica:
- La proyección operacional (qué slots se presentan como confirmados)
- La secuencia de acción (qué preguntar ahora)
- El tono y velocidad de la respuesta

---

## 7. Operación

### ¿Cuándo el pensamiento termina?

El pensamiento termina cuando se alcanza un **Compromiso** (ver §3). Es decir, cuando:

1. Hay una creencia con certidumbre suficiente
2. Esa creencia ha cruzado el umbral de costo de error
3. El sistema ha decidido actuar basado en ella

En ese momento:
- La Hypothesis Network deja de generar alternativas para ese objeto
- La proyección operacional se congela como "verdad actual"
- Se dispara la ejecución (crear viaje, iniciar dispatch, enviar respuesta)

### ¿Cuándo comienza el negocio?

El negocio comienza exactamente en el instante posterior al Compromiso.

Antes del compromiso: el sistema piensa (interpreta, evalúa, decide).
Después del compromiso: el sistema opera (crea, ejecuta, notifica, registra).

### ¿Dónde está exactamente esa frontera?

La frontera es el **commitment event** — el momento en que el sistema dice "sí, esto es verdad" y actúa en consecuencia.

En el sistema actual:
- La frontera existe pero está difusa
- `awaiting_confirmation` es "antes del compromiso" (estado de pensamiento)
- La confirmación del usuario cruza la frontera → se ejecuta el viaje
- Pero el sistema también "se compromete" antes: cuando muestra el precio en la confirmación, está comprometiendo un precio. Si el precio cambia entre la cotización y la ejecución, el sistema violó su compromiso implícito.

**Corrección:** El compromiso debe ser explícito y consciente. El sistema debe saber cuándo se está comprometiendo y con qué nivel de certidumbre.

```
Compromiso implícito: mostrar precio (el usuario asume que ese es el precio final)
Compromiso explícito: "Confirmo el precio de $45.000 ARS por este viaje" (el usuario confirma)
Compromiso operacional: viaje creado con ese precio (el sistema ejecuta)
```

Hoy, el primer compromiso (mostrar precio) no es tratado como compromiso — es tratado como información. Pero el usuario lo percibe como compromiso. Hay un **descalce ontológico**.

---

## 8. Memoria

### Redefinición completa

El sistema actual tiene **5 sistemas de memoria fragmentados**:
1. `context-memory.ts` — merge semántico de contexto
2. `memory.ts` — session memory  
3. `chat_sessions.slots` — slot persistence
4. `chat_sessions.conversational_state` — state machine
5. `data/knowledge/` — knowledge layer (extracted but disconnected)

En el modelo cognitivo ideal, la memoria se reorganiza en **6 capas**:

---

### 8.1 Memoria Inmediata (Request Scope)

**¿Qué es?** La evidencia de un solo mensaje. Existe solo durante el procesamiento del request.

**Contenido:**
- Texto del mensaje actual
- Metadatos: phone, timestamp, tipo de mensaje
- Resultados de extracción crudos (regex output, LLM output)

**Tiempo de vida:** Duración del request. Se descarta después de responder.

**Dueño:** Percepción (capa de recepción)

**Regla:** La memoria inmediata NUNCA se escribe en almacenamiento persistente en su forma cruda. Solo pasa a la Evidence Store después de ser registrada como evidencia.

---

### 8.2 Evidence Store

**¿Qué es?** El registro inmutable de toda evidencia que el sistema ha percibido.

**Contenido:**
- Cada mensaje recibido, registrado como evidencia
- Cada inferencia del sistema, registrada como evidencia (con fuente explícita)
- Cada confirmación del usuario, registrada como evidencia
- Cada decisión del sistema, registrada como evidencia
- Cada evento operacional (trip creado, dispatch enviado), registrado como evidencia

**Schema conceptual (sin tablas):**
```
{
  id: identificador único (generado en el momento de registro)
  phone: identificador de la conversación
  type: tipo de evidencia (message_received, inference, confirmation, decision, event)
  payload: el contenido de la evidencia (el texto, el slot inferido, la decisión tomada)
  source: fuente de la evidencia (regex, llm, entity-lookup, user, system)
  source_confidence: confianza de la fuente (0.0-1.0)
  timestamp: cuándo ocurrió
  chain_id: identificador de la cadena de evidencia (para reconstrucción)
  previous_id: referencia a la evidencia que causó esta (para reconstrucción)
}
```

**Tiempo de vida:** Permanente. La evidencia nunca se elimina.

**Dueño:** Percepción (escribe) / Cognición (lee)

**Reglas:**
- Append-only. Nadie modifica ni borra evidencia.
- Quien registra evidencia debe especificar: type, source, source_confidence.
- La evidencia se registra ANTES de cualquier interpretación.
- Consultas por: phone + type + ventana temporal.

---

### 8.3 Hypothesis Network

**¿Qué es?** El conjunto activo de hipótesis que el sistema mantiene actualmente. Es la memoria de "lo que el sistema cree que está pasando".

**Contenido:**
- Múltiples hipótesis con certidumbre
- Para cada hipótesis: qué evidencia la sustenta, cuándo se creó, cuándo se actualizó
- Relaciones entre hipótesis: competencia, respaldo, contradicción

**Schema conceptual:**
```
{
  id: identificador único
  phone: conversación asociada
  object: objeto de la hipótesis (intent, slot_value, client_goal)
  value: valor propuesto (booking, "Aeropuerto IGR", inquiry_price)
  certainty: certidumbre actual (0.0-1.0)
  evidence_ids: lista de evidencia que la respalda
  created_at: timestamp de creación
  updated_at: timestamp de última actualización
  status: active | dormant | refuted | committed
  parent_id: hipótesis de la que se deriva
}
```

**Tiempo de vida:** Duración de la sesión activa. Las hipótesis DORMANT pueden persistir hasta 48h.

**Dueño:** Cognición (único propietario)

**Reglas:**
- Solo la Cognición crea, modifica o destruye hipótesis
- La Cognición lee evidencia de la Evidence Store (nunca escribe allí)
- Las hipótesis expiran después de N tiempo sin actualización
- Las hipótesis COMMITTED se archivan (son históricas)

---

### 8.4 Operational Projection

**¿Qué es?** Una vista de solo lectura de "qué significan las hipótesis actuales para el negocio". Es la respuesta a la pregunta: "dado lo que creemos, ¿cuál es el estado operacional actual?"

**Contenido:**
- Slots proyectados (origin, destination, passengers, scheduled_at, price)
- Modo operacional (AHORA, RESERVA, CONSULTA, INFORMACION)
- Estado del viaje (draft, quoted, confirmed, in_progress, closed)
- Lista de acciones disponibles (preguntar, confirmar, ejecutar, escalar)

**Tiempo de vida:** Se recalcula en cada turno. No es almacenamiento — es computación.

**Dueño:** Cognición (produce) / Estrategia y Negocio (consumen)

**Reglas:**
- Solo lectura para Estrategia y Negocio
- Nunca se escribe directamente. Siempre se recalcula desde la Hypothesis Network.
- Si desaparece (ej: crash), se reconstruye desde la Evidence Store.

---

### 8.5 Business State

**¿Qué es?** El estado real del negocio: viajes confirmados, dispatch en curso, choferes asignados, pagos procesados. Esto es el "mundo real" del sistema — no lo que cree, sino lo que ha ocurrido.

**Contenido:**
- Trip: viajes creados, su estado, su precio, su ruta
- Dispatch: niveles de escalamiento, chofer asignado
- Driver: disponibilidad, historial
- Payment: registros de pago

**Tiempo de vida:** Permanente (hasta que el negocio decida archivarlo).

**Dueño:** Negocio / Ejecución (Operational Projection es la única que lee para proyectar)

**Regla fundamental:** El Business State ES la verdad operacional. Si un trip está CONFIRMED en el Business State, existe en el mundo real. La Cognition Store puede creer algo diferente — y eso es un problema que debe resolverse con evidencia.

---

### 8.6 Conversation Memory

**¿Qué es?** El registro de la interacción pasada con el usuario, incluyendo lo que el sistema dijo y lo que el usuario respondió. No es evidencia (eso es la Evidence Store) — es el **diálogo**.

**Contenido:**
- Historial de mensajes (turnos)
- Respuestas del sistema (lo que se dijo)
- Metadatos de interacción (tiempos de respuesta, canales)

**Tiempo de vida:** Ventana de sesión (48h) con resumen comprimido para persistencia más larga.

**Dueño:** Percepción (escribe mensajes entrantes) / Expresión (escribe respuestas)

**Reglas:**
- Separada de la Evidence Store (son propósitos diferentes)
- Se usa para generar contexto en respuestas LLM
- Se resume (no se replica) en la Evidence Store

---

### Quién es dueño de cada uno

| Capa de memoria | ¿Quién escribe? | ¿Quién lee? | ¿Quién modifica? |
|-----------------|-----------------|-------------|------------------|
| Inmediata | Percepción | Cognición | Nadie (se descarta) |
| Evidence Store | Percepción | Cognición, Negocio | Nadie (append-only) |
| Hypothesis Network | Cognición | Estrategia, Proyección | Solo Cognición |
| Operational Projection | Cognición | Estrategia, Negocio | Solo Cognición (recalcula) |
| Business State | Negocio | Cognición (lee), Proyección (lee) | Solo Negocio |
| Conversation Memory | Percepción, Expresión | Cognición (contexto LLM) | Nadie (append-only) |

---

## 9. Ciclo Cognitivo Completo

### El ciclo, no el pipeline

Un pipeline es lineal. Un ciclo es un **bucle que se retroalimenta**.

El ciclo cognitivo de AITOS tiene 8 etapas, y la salida de cada vuelta alimenta la siguiente:

```
                    ┌──────────────────────────────────────────────┐
                    │                                              │
                    ▼                                              │
┌─────────┐   ┌──────────┐   ┌──────────┐   ┌─────────────┐       │
│ OBSERVAR │──▶│ REGISTRAR│──▶│ INTERPRET│──▶│ INTEGRAR    │       │
│          │   │          │   │          │   │             │       │
│Mensaje   │   │Evidencia │   │Hipótesis │   │Creencias    │       │
│bruto     │   │inmutable │   │candidatas│   │actualizadas │       │
└─────────┘   └──────────┘   └──────────┘   └──────┬──────┘       │
                                                    │              │
                                                    ▼              │
                                            ┌──────────────┐      │
                                            │ EVALUAR      │      │
                                            │              │      │
                                            │¿Suficiente   │      │
                                            │para actuar?  │      │
                                            └──────┬───────┘      │
                                                   │              │
                                    ┌──────────────┼──────────────┘
                                    ▼              ▼
                            ┌───────────┐   ┌───────────┐
                            │ COMPROMETER│   │ PROYECTAR │
                            │            │   │           │
                            │Decisión    │   │Estado op. │
                            │de actuar   │   │(solo lect.)│
                            └─────┬─────┘   └───────────┘
                                  │
                                  ▼
                          ┌───────────────┐
                          │ ACTUAR        │
                          │               │
                          │→ Ejecutar     │
                          │→ Preguntar    │
                          │→ Escalar      │
                          └───────┬───────┘
                                  │
                                  ▼
                          ┌───────────────┐
                          │ EXPRESAR      │
                          │               │
                          │Responder al   │
                          │usuario        │
                          └───────┬───────┘
                                  │
                                  ▼
                          ┌───────────────┐
                          │ APRENDER      │
                          │               │
                          │→ Outcome     │
                          │→ Actualizar  │
                          │  confianza    │
                          └───────────────┘
                                  │
                                  └──→ (nuevo ciclo con próx. mensaje)
```

---

### Etapa 1: OBSERVAR

**Qué entra:** Mensaje bruto desde el canal (texto + metadata)

**Qué ocurre:**
- Validación de integridad (HMAC, rate limit, idempotency)
- Extracción de metadatos (phone, timestamp, tipo de mensaje)
- Normalización mínima (trim, encoding)

**Qué sale:** Un paquete de observación: `{ phone, text, timestamp, channel, raw }`

**Qué NO ocurre aquí:**
- No se clasifica intención
- No se extraen entidades
- No se interpreta nada

**Es pura observación.** El sistema registra "esto pasó" sin decir "esto significa".

---

### Etapa 2: REGISTRAR

**Qué entra:** Paquete de observación

**Qué ocurre:**
- El paquete se registra como evidencia en la Evidence Store
- Se asigna: id, type="message_received", source="channel", source_confidence=1.0
- Se enlaza con evidencia previa del mismo phone (chain_id)
- Se registra ANTES de cualquier procesamiento

**Qué sale:** Una entrada en la Evidence Store: evidencia registrada y accesible

**Regla fundamental:** Esta etapa es la frontera entre percepción e interpretación. Todo lo que sigue es interpretación. Todo lo que precede es observación pura.

---

### Etapa 3: INTERPRETAR

**Qué entra:** La evidencia registrada + toda la evidencia previa del mismo phone

**Qué ocurre:**
- Se generan hipótesis candidatas (múltiples)
- Cada hipótesis se evalúa contra la evidencia
- Se asigna certidumbre inicial a cada hipótesis

**Qué sale:** Hipótesis candidatas en la Hypothesis Network

**Ejemplo concreto (conceptual):**
```
Evidencia: "hola necesito un taxi del aeropuerto IGR al centro somos 2"

H1 (intent=GREETING): certidumbre 0.2 — contiene "hola" pero también mucho más
H2 (intent=BOOKING): certidumbre 0.7 — contiene origen, destino, pasajeros
H3 (intent=NOW): certidumbre 0.05 — no hay marcador de urgencia
H4 (slot:origin=Aeropuerto IGR): certidumbre 0.9 — regex "del X" match
H5 (slot:destination=centro): certidumbre 0.6 — match parcial, ambigüedad
H6 (slot:passengers=2): certidumbre 0.95 — regex "somos N" match claro
```

Todas estas hipótesis coexisten. No se elige una.

---

### Etapa 4: INTEGRAR

**Qué entra:** Hipótesis nuevas + hipótesis previas (si existen)

**Qué ocurre:**
- Las hipótesis nuevas se comparan con las previas
- Se actualiza la certidumbre:
  - Hipótesis confirmada por nueva evidencia → sube
  - Hipótesis contradicha → baja
  - Hipótesis nueva → se agrega con certidumbre inicial
  - Hipótesis sin evidencia nueva → se degrada ligeramente
- Se chequea coherencia: hipótesis incompatibles no deberían tener alta certidumbre simultáneamente
- Se identifican conflictos que requieren más evidencia

**Qué sale:** Hypothesis Network actualizada

**Ejemplo:**
```
Turno 1 → hipótesis iniciales
Turno 2: "sí, confirma el viaje"
  - H2 (intent=BOOKING) sube de 0.7 a 0.9 (evidencia coherente)
  - H1 (intent=GREETING) baja de 0.2 a 0.1 (inactiva)
  - H3 (intent=NOW) baja de 0.05 a 0.02 (no hay urgencia)
```

---

### Etapa 5: EVALUAR

**Qué entra:** Hypothesis Network actualizada

**Qué ocurre:**
- Se evalúa si la certidumbre acumulada es suficiente para COMPROMETERSE
- Se calcula el costo de error para cada posible compromiso
- Se compara el costo de error con el beneficio de actuar ahora vs. esperar más evidencia

**Pregunta fundamental:** *"¿Sabemos suficiente para actuar, o debemos preguntar?"*

**Tres resultados posibles:**

1. **Suficiente certidumbre + bajo costo de error** → COMPROMETER (Etapa 6)
2. **Certidumbre insuficiente + alto costo de error** → PROYECTAR y PREGUNTAR (ir a Etapa 5b)
3. **Certidumbre alta + alto costo de error** → COMPROMETER pero con confirmación explícita (Compromiso condicional)

**Qué sale:** Juicio de evaluación: "Comprometer", "Preguntar", o "Comprometer con condición"

---

### Etapa 5b: PROYECTAR (cuando se Evalúa que se debe preguntar)

**Qué entra:** Hypothesis Network

**Qué ocurre:**
- Se genera la Operational Projection: "esto es lo que sabemos hasta ahora"
- Los slots se proyectan desde las hipótesis dominantes
- Se identifica QUÉ evidencia falta y CUÁNTO cuesta obtenerla
- Se determina la próxima pregunta: la que maximiza reducción de incertidumbre ÷ costo de preguntar

**Qué sale:** Operational Projection + Gap Analysis (qué falta saber)

---

### Etapa 6: COMPROMETER

**Qué entra:** Evaluación positiva (certidumbre suficiente)

**Qué ocurre:**
- Una o más hipótesis se marcan como COMMITTED
- Se registra el compromiso como evidencia en la Evidence Store
- Se determina el tipo de acción: ejecutar, confirmar con usuario, escalar

**Qué sale:** Compromiso registrado + directiva de acción

**Niveles de compromiso:**
1. **Compromiso informativo**: "Este es el precio." (compromiso de que el precio es correcto)
2. **Compromiso de acción**: "Voy a buscar un chofer." (compromiso de ejecutar)
3. **Compromiso con el usuario**: "Confirmo tu viaje." (compromiso que vincula al sistema)

---

### Etapa 7: ACTUAR

**Qué entra:** Compromiso

**Qué ocurre:**
- Se ejecuta la acción determinada por el compromiso
- Puede ser: crear un trip, iniciar dispatch, enviar una respuesta, escalar a humano
- Se registra el resultado de la acción como evidencia

**Qué sale:** Acción ejecutada + evidencia de la acción

---

### Etapa 8: EXPRESAR

**Qué entra:** Resultado de la acción + Operational Projection

**Qué ocurre:**
- Se genera la respuesta al usuario
- La respuesta refleja:
  - El compromiso tomado
  - La certidumbre con la que se tomó
  - Las opciones disponibles (si hay)
- El tono y la extensión se determinan por la postura estratégica

**Qué sale:** Mensaje para el usuario

---

### Etapa 9: APRENDER

**Qué entra:** Outcome de la acción (respuesta del usuario, resultado del viaje)

**Qué ocurre:**
- Se evalúa si el outcome confirma o refuta las hipótesis
- Se ajustan los pesos de confianza de las fuentes
- Se documentan patrones (para aprendizaje a largo plazo)

**Qué sale:** Actualizaciones al modelo de confianza + patrones detectados

---

### El ciclo se repite

Cuando el usuario responde, el ciclo comienza de nuevo en OBSERVAR. Pero ahora la Hypothesis Network ya tiene contenido — las nuevas observaciones se integran con el estado cognitivo existente.

No es un pipeline que se reinicia. Es un **ciclo que acumula**.

---

## 10. Principios Permanentes

Cada principio es una **regla conceptual** que debe poder traducirse a un invariante técnico en la implementación. Son verificables. No son sugerencias.

---

### P1 — Inmutabilidad de la evidencia

> Una vez registrada, la evidencia nunca se modifica ni elimina.

**Verificación:** Si existe algún código que modifique o borre un registro de evidencia, el principio está violado.

---

### P2 — Frontera percepción/interpretación

> Ninguna interpretación puede ocurrir antes de que la evidencia sea registrada.

**Verificación:** La secuencia RECEPCIÓN → REGISTRO → INTERPRETACIÓN debe ser verificable en el ciclo de cada mensaje. Si la interpretación comienza antes del registro, el principio está violado.

---

### P3 — Hipótesis múltiples

> El sistema debe mantener más de una hipótesis activa siempre que la evidencia lo permita.

**Verificación:** Si en algún punto el sistema reduce todas las hipótesis a una antes de que el compromiso ocurra, el principio está violado.

---

### P4 — Certidumbre continua

> Toda creencia debe tener una certidumbre asociada. La certidumbre no puede ser binaria.

**Verificación:** Si existe algún concepto de "verdadero/falso" que no tenga un continuo de certidumbre entre 0 y 1, el principio está violado.

---

### P5 — Compromiso explícito

> Ninguna acción operacional puede ocurrir sin un compromiso explícito registrado.

**Verificación:** Si un trip se crea, un dispatch se inicia, o un precio se muestra sin un registro de compromiso asociado, el principio está violado.

---

### P6 — Costo de error en la decisión

> Toda decisión de compromiso debe considerar el costo de equivocarse.

**Verificación:** Si algún camino de decisión no evalúa el costo potencial del error antes de comprometer, el principio está violado.

---

### P7 — Proyección de solo lectura

> La Operational Projection es una vista derivada. Nadie escribe directamente en ella.

**Verificación:** Si existe código que modifique directamente el estado proyectado sin pasar por la Hypothesis Network, el principio está violado.

---

### P8 — Una fuente, una responsabilidad

> Cada tipo de memoria tiene un único propietario que puede escribir.

**Verificación:** Si dos componentes diferentes escriben en la misma capa de memoria, el principio está violado.

---

### P9 — Reconstrucción desde evidencia

> El estado cognitivo completo debe poder reconstruirse desde la Evidence Store.

**Verificación:** Si se pierde la Hypothesis Network (crash, reinicio), el sistema debe poder reconstruir el mismo estado desde la evidencia registrada.

---

### P10 — Degradación gradual

> La certidumbre de hipótesis no soportadas por evidencia reciente debe degradarse gradualmente, no desaparecer abruptamente.

**Verificación:** Si una hipótesis se descarta sin pasar por un período de degradación decreciente, el principio está violado.

---

### P11 — Fusión conservadora

> La fusión de hipótesis no puede aumentar la certidumbre más allá de la de la hipótesis más fuerte de las fusionadas.

**Verificación:** Si la certidumbre post-fusión > max(certidumbre pre-fusión), el principio está violado.

---

### P12 — Preguntar con propósito

> Toda pregunta debe responder a un gap de evidencia identificado.

**Verificación:** Si el sistema pregunta sin tener un gap específico en la Operational Projection que motive la pregunta, el principio está violado.

---

### P13 — Acompañamiento continuo

> El sistema nunca debe desaparecer entre el compromiso y la ejecución del servicio.

**Verificación:** Si después de un compromiso hay un período de silencio prolongado sin comunicación proactiva, el principio está violado.

---

### P14 — El LLM expresa, no decide

> El LLM puede refinar la expresión de una decisión, pero no puede cambiar la decisión misma.

**Verificación:** Si la respuesta del LLM contradice la PolicyOutput o el compromiso registrado, y el sistema no detecta ni corrige esa contradicción, el principio está violado.

---

### P15 — Coexistencia de intenciones

> El sistema debe poder mantener intenciones múltiples simultáneas cuando la evidencia lo justifica.

**Verificación:** Si en algún punto el sistema reduce todas las intenciones a una sin evidencia que descarte las demás, el principio está violado.

---

### P16 — Compromiso informativo ≠ compromiso operacional

> Mostrar información (precio, opciones) es un compromiso informativo. Ejecutar una acción es un compromiso operacional. Deben diferenciarse explícitamente.

**Verificación:** Si el sistema trata un compromiso informativo como operacional (ej: ejecuta basado en una cotización mostrada), el principio está violado.

---

### P17 — El silencio es evidencia

> La ausencia de mensaje después de una oferta o pregunta también debe registrarse como evidencia.

**Verificación:** Si el sistema no considera el tiempo transcurrido sin respuesta como un factor en la certidumbre de sus hipótesis, el principio está violado.

---

### P18 — Estrategia desde conocimiento, no desde estado

> La postura estratégica debe derivarse del estado del conocimiento (certidumbre, gaps, costo de error), no del estado de la máquina conversacional.

**Verificación:** Si la estrategia depende del estado de la state machine en lugar de la Hypothesis Network y el costo de error, el principio está violado.

---

### P19 — La explicación precede a la acción

> El sistema debe poder explicar cada decisión en términos de la evidencia que la sustenta.

**Verificación:** Si el sistema toma una decisión y no puede responder "¿por qué?" señalando la evidencia que la motivó, el principio está violado.

---

### P20 — Bucle de aprendizaje cognitivo

> Cada outcome (confirmación, rechazo, corrección) debe retroalimentar la confianza en las fuentes de evidencia que participaron en la decisión.

**Verificación:** Si un outcome no produce ninguna actualización en el modelo de confianza de fuentes, el principio está violado.

---

### P21 — Umbral dinámico de compromiso

> El umbral de certidumbre requerido para comprometerse debe ajustarse según el costo de error y la urgencia, no ser un valor fijo.

**Verificación:** Si el umbral de decisión es constante para todos los tipos de compromiso, el principio está violado.

---

### P22 — Responsabilidad no superpuesta

> Ninguna responsabilidad cognitiva (observar, extraer, creer, proyectar, decidir, actuar) puede estar asignada a más de un componente.

**Verificación:** Si dos componentes tienen la misma responsabilidad sobre el mismo objeto cognitivo, el principio está violado.

---

## 11. Responsabilidades

### Asignación conceptual de responsabilidades

| Responsabilidad | Componente | ¿Qué hace exactamente? | ¿Qué NO hace? |
|----------------|------------|----------------------|---------------|
| **Observar** | Percepción | Recibe el fenómeno bruto, valida integridad, extrae metadata | No interpreta, no clasifica, no decide |
| **Registrar** | Evidence Store | Almacena la evidencia de manera inmutable e indexada | No interpreta, no prioriza, no descarta |
| **Interpretar** | Cognición (Hypothesis Network) | Genera hipótesis desde la evidencia, asigna certidumbre inicial | No registra evidencia, no ejecuta acciones |
| **Integrar** | Cognición (Integrator) | Actualiza la Hypothesis Network con nueva evidencia, ajusta certidumbres | No genera hipótesis nuevas, no decide |
| **Recordar** | Memoria (todas las capas) | Mantiene evidencia accesible, mantiene hipótesis activas, mantiene proyecciones | No interpreta, no decide |
| **Inferir** | Cognición (Inference Engine) | Genera hipótesis donde la evidencia directa es insuficiente | No integra, no evalúa |
| **Creer** | Cognición (Hypothesis Network) | Mantiene el estado de creencia actual (qué hipótesis están activas con qué certidumbre) | No decide, no ejecuta |
| **Actualizar** | Cognición (Integrator) | Modifica la certidumbre de hipótesis basado en nueva evidencia | No genera hipótesis, no evalúa compromiso |
| **Proyectar** | Cognición (Projection Engine) | Genera la Operational Projection desde la Hypothesis Network | No modifica hipótesis, no decide |
| **Evaluar** | Cognición (Commitment Evaluator) | Evalúa si la certidumbre es suficiente para compromiso, considerando costo de error | No genera proyección, no ejecuta |
| **Decidir** | Estrategia | Determina la postura estratégica basada en el estado del conocimiento | No modifica hipótesis, no ejecuta |
| **Comprometerse** | Cognición (Commitment Engine) | Registra el compromiso, determina tipo de acción | No evalúa, no proyecta |
| **Actuar** | Negocio / Ejecución | Ejecuta la acción operacional (crear viaje, dispatch, notificar) | No decide, no interpreta |
| **Expresar** | Expresión | Genera la respuesta al usuario | No modifica estado cognitivo |
| **Explicar** | Expresión (incluye LLM) | Responde "¿por qué?" mostrando la evidencia que sustenta la decisión | No cambia la decisión |
| **Aprender** | Aprendizaje | Actualiza el modelo de confianza de fuentes basado en outcomes | No modifica hipótesis activas |

### Mapa de responsabilidades vs. componentes

```
                    PERCEPCIÓN
                    ┌──────────────────┐
                    │ Observar         │
                    │ Registrar        │ ← escribe en Evidence Store
                    └──────────────────┘
                            │
                            ▼
                    COGNICIÓN
                    ┌──────────────────┐
                    │ Interpretar      │ ← lee de Evidence Store, escribe en Hypothesis Network
                    │ Integrar         │ ← modifica Hypothesis Network
                    │ Inferir          │ ← genera hipótesis donde faltan
                    │ Creer            │ ← mantiene Hypothesis Network
                    │ Actualizar       │ ← modifica certidumbre
                    │ Proyectar        │ ← genera Operational Projection (solo lectura)
                    │ Evaluar          │ ← evalúa compromiso
                    │ Comprometerse    │ ← registra compromiso en Evidence Store
                    └──────────────────┘
                            │
                            ▼
                    ESTRATEGIA
                    ┌──────────────────┐
                    │ Decidir          │ ← produce postura estratégica
                    └──────────────────┘
                            │
                            ▼
                    NEGOCIO / EJECUCIÓN
                    ┌──────────────────┐
                    │ Actuar           │ ← escribe en Business State
                    └──────────────────┘
                            │
                            ▼
                    EXPRESIÓN
                    ┌──────────────────┐
                    │ Expresar         │ ← genera respuesta
                    │ Explicar         │ ← genera explicación
                    └──────────────────┘
                            │
                            ▼
                    APRENDIZAJE
                    ┌──────────────────┐
                    │ Aprender         │ ← actualiza modelo de confianza
                    └──────────────────┘
```

Cada componente tiene responsabilidades exclusivas. Ninguna responsabilidad está duplicada. Ninguna responsabilidad está compartida.

---

## 12. Fronteras

### ¿Qué componente tiene permiso de modificar qué?

| Componente | Evidence Store | Hypothesis Network | Operational Projection | Business State | Conversation Memory |
|------------|---------------|-------------------|----------------------|---------------|-------------------|
| **Percepción** | ✅ ESCRIBE (append) | ❌ | ❌ | ❌ | ✅ ESCRIBE (append) |
| **Cognición** | ✅ ESCRIBE (commitment events) | ✅ LEE + ESCRIBE + MODIFICA | ✅ PRODUCE (solo escritura inicial) | ❌ | ❌ |
| **Estrategia** | ❌ | ❌ | ❌ (solo define modo) | ❌ | ❌ |
| **Negocio/Ejecución** | ❌ | ❌ | ❌ (solo consumo) | ✅ LEE + ESCRIBE + MODIFICA | ❌ |
| **Expresión** | ❌ | ❌ | ❌ (solo consumo) | ❌ | ✅ LEE (para contexto) |
| **Aprendizaje** | ❌ | ❌ | ❌ | ❌ | ❌ |

### Reglas de frontera

1. **Evidence Store**: Solo Percepción escribe (evidencia de entrada). Cognición escribe solo compromisos (evidencia de salida). Nadie más. Nadie borra. Nadie modifica.

2. **Hypothesis Network**: Exclusividad de Cognición. Nadie más lee o escribe directamente. Otros componentes acceden a través de la Operational Projection (que es una vista derivada, no el almacén real).

3. **Operational Projection**: Solo Cognición la produce. Estrategia y Negocio la consumen. Nadie la modifica directamente — si necesita cambiar, la Cognición recalcula.

4. **Business State**: Solo Negocio lo modifica. Cognición lo lee para informar hipótesis ("el trip ya fue confirmado por el negocio → la hipótesis de booking se fortalece"). Cognición nunca escribe en Business State.

5. **Conversation Memory**: Percepción escribe mensajes entrantes. Expresión escribe respuestas. Cognición lee para contexto del LLM.

---

## 13. Modelo de actualización

### Clasificación de elementos según su comportamiento

#### Inmutables

*No cambian nunca después de ser creados. Son la base de toda reconstrucción.*

| Elemento | Comportamiento |
|----------|---------------|
| Evidencia registrada | Una vez escrita en la Evidence Store, no se modifica ni elimina |
| Knowledge semilla | El conocimiento base (lugares, horarios, reglas) se carga y no cambia durante la ejecución. Cambia solo mediante deploys explícitos |
| Compromiso registrado | El registro del compromiso es inmutable. El compromiso puede ser superado por otro, pero el registro original permanece |

#### Acumulativos

*Crece con el tiempo. No se reduce — solo se agrega.*

| Elemento | Comportamiento |
|----------|---------------|
| Evidence Store | Siemse agrega. Nunca se quita |
| Conversation Memory | Siempre se agregan turnos. Nunca se eliminan |
| Historial de compromisos | Cada compromiso se agrega al historial |

#### Probabilísticos

*Tienen un valor numérico que fluctúa entre 0 y 1 según la evidencia disponible.*

| Elemento | Comportamiento |
|----------|---------------|
| Certidumbre de hipótesis | Sube con evidencia confirmatoria, baja con evidencia contradictoria, decae con el tiempo |
| Confianza de fuente | Se ajusta lentamente con outcomes acumulados |
| Umbral de compromiso | Varía según costo de error y urgencia |

#### Revisables

*Pueden cambiar completamente basados en nueva información. No son inmutables.*

| Elemento | Comportamiento |
|----------|---------------|
| Hypothesis Network activa | Se revisa completamente en cada ciclo cognitivo. Hipótesis nacen, mueren, se fusionan |
| Postura estratégica | Se recalcula en cada ciclo. No tiene memoria entre ciclos |
| Operational Projection | Se recalcula desde la Hypothesis Network en cada ciclo |

#### Descartables

*Pueden perderse sin consecuencias graves. Son reconstruibles.*

| Elemento | Comportamiento |
|----------|---------------|
| Cache de proyección | Se pierde → se recalcula desde la Hypothesis Network |
| Hypothesis Network (in-memory) | Se pierde → se reconstruye desde la Evidence Store |
| Resultados de extracción del request | Se pierden → se re-extraen desde la evidencia |
| Estrategia del request actual | Se pierde → se recalcula en el próximo ciclo |

#### Reconstruibles

*Puede perderse el estado activo pero debe poder reconstruirse desde la evidencia inmutable.*

| Elemento | Fuente de reconstrucción |
|----------|--------------------------|
| Hypothesis Network | Evidence Store (phone + ventana temporal) |
| Operational Projection | Hypothesis Network |
| Postura estratégica | Hypothesis Network + costo de error |
| Compromisos activos | Evidence Store (commitment events) |
| Business State | Tablas de negocio (son fuente de verdad para lo ejecutado) |

---

## 14. Comparación con la arquitectura actual

### Qué conceptos actuales SOBREVIVEN

| Concepto actual | Estado | Notas |
|----------------|--------|-------|
| Los slots como representación operacional | ✅ SOBREVIVE pero se redefine | Los slots pasan de ser "valores que se llenan" a "proyección de evidencia" |
| La triple fuente de extracción (regex → entidad → LLM) | ✅ SOBREVIVE | Es un mecanismo sólido. Pasa a ser parte de la etapa de Interpretación |
| El sistema de fallback en cascada | ✅ SOBREVIVE | Sigue siendo correcto. Se integra como estrategia de degradación |
| La identidad por teléfono | ✅ SOBREVIVE | El phone como identity sigue siendo correcto |
| El LLM como expresión, no como decisión | ✅ SOBREVIVE | Principio P14 lo refuerza |
| Los eventos de Trip y Dispatch como audit log | ✅ SOBREVIVE | Pasan a ser un subconjunto de la Evidence Store |
| El knowledge layer extraído a `data/knowledge/` | ✅ SOBREVIVE | Es la materia prima para poblar la Evidence Store |
| La separación de responsabilidades AI vs Services | ✅ SOBREVIVE | Se refuerza con fronteras más claras |

### Qué conceptos deben ELIMINARSE

| Concepto actual | Razón de eliminación |
|----------------|---------------------|
| **State machine conversacional** (`idle → collecting_slots → slot_confirmation → ...`) | El modelo cognitivo no tiene "estados" — tiene evidencia acumulada. La state machine fuerza un orden lineal que no existe en la cognición real |
| **Single intent** (CORE elige una intención) | Reemplazado por la Hypothesis Network con intenciones múltiples y probabilísticas |
| **Slots como escritura directa** (chat_sessions.slots) | Reemplazado por Operational Projection: los slots se proyectan desde la evidencia, no se escriben directamente |
| **Conversational state persistido** (chat_sessions.conversational_state) | El estado conversacional se deriva de la evidencia, no se almacena como valor único |
| **last_intent** (columna en chat_sessions) | No existe "última intención" — existen hipótesis activas con certidumbre |
| **Persistence de session state como fuente de verdad** | La fuente de verdad es la Evidence Store, no las columnas de session |
| **post_booking state** | No hay "estado después de reservar" — hay evidencia de que se confirmó un viaje |
| **Comprensión binaria** (comprehension score → FULL_CONTROL / CLARIFICATION / RECOVERY / ESCALATION) | Reemplazado por: "¿sabemos suficiente? → evaluar → comprometer o preguntar" |

### Qué conceptos deben REDEFINIRSE

| Concepto actual | Redefinición |
|----------------|--------------|
| **CORE** (intent classifier) | Debe pasar de "clasificador determinista de intención única" a "generador de hipótesis iniciales para la Hypothesis Network" |
| **StrategyDecision** (ADR-008) | Debe pasar de "estrategia basada en señales computadas" a "estrategia basada en estado de evidencia y costo de error" |
| **Policy** (policy-ahora, policy-reserva) | Debe pasar de "árbol de decisión cableado" a "proyección operacional desde la Hypothesis Network" |
| **Router** | Debe pasar de "mapeo determinista intención→outputType" a "determinación de modo según certidumbre" |
| **Slots** (slot-state, slot-confirmation) | Deben pasar de "contenedores de valores" a "proyección de evidencia" |
| **Comprehension** | Debe pasar de "score de comprensión" a "evaluación de suficiencia de evidencia para compromiso" |
| **Extraction** | Debe pasar de "llenar slots" a "generar evidencia" |
| **Context memory** | Debe pasar de "merge semántico" a "integración en la Hypothesis Network" |
| **Client Objective** | Debe pasar de "clasificación" a "hipótesis dominante de la Hypothesis Network" |
| **Confidence** (slot-level score) | Debe dividirse en dos: certidumbre de la creencia y confianza de la fuente |

### Qué ADRs quedarían obsoletos

| ADR | Estado | Razón |
|-----|--------|-------|
| **ADR-005** (AI-First Interpretation) | ⚠️ Parcialmente obsoleto | El principio "deterministic core, probabilistic edge" sigue vigente, pero la interpretación del "core" cambia radicalmente. La AI-first es ahora la Hypothesis Network, no CORE. |
| **ADR-007** (Conversation Interpreter) | ⚠️ Parcialmente obsoleto | El Conversation Interpreter clasifica roles de mensaje (new_request, clarification, correction). Esta información pasa a ser evidencia en la Evidence Store, no una capa separada. |
| **ADR-008** (Conversational Decision Architecture) | 🔴 **OBSOLETO en su forma actual** | La arquitectura congelada fue diseñada para el modelo state-dominant. El nuevo modelo requiere una arquitectura cognitiva diferente. La congelación debe reemplazarse por una nueva arquitectura de referencia. |
| **ADR-006** (Schema Parity) | ✅ Vigente | La paridad de schema sigue siendo necesaria. El principio "código y DB deben coincidir" es independiente del modelo cognitivo. |

**Nota:** Los ADRs no necesitan eliminarse — necesitan **reemplazarse**. Una nueva serie de ADRs (009-015, ver roadmap) debe establecer la nueva arquitectura cognitiva, y los ADR obsoletos deben marcarse como `SUPERSEDED` con referencia al ADR que los reemplaza.

### Qué backlog deja de tener sentido

Basado en esta auditoría y confirmando/reforzando los hallazgos de Auditoría #03:

| ID | ¿Por qué deja de tener sentido bajo el nuevo modelo? |
|----|------------------------------------------------------|
| **P2-10** — Persistir last_intent | No existe "last intent" en el modelo cognitivo |
| **P2-12** — Formalizar post_booking state | No hay post_booking state en el modelo cognitivo |
| **P3-03** — Knowledge a Turso | El knowledge debe poblar la Evidence Store, no Turso |
| **P3-08** — Smart fill slots | Los slots no se "llenan" — se proyectan |
| **AIT-014** — Modelar Session | No hay "sesión" como entidad — hay evidencia acumulada |
| **AIT-024a-d** — Integrar tools en policy-pipeline | El pipeline cognitivo reemplaza a policy-pipeline |
| **I2.1** — Split Lead Service | Lead service será reemplazado por el nuevo pipeline |
| **I2.3** — Fragmentar Ambiguity Handler | La ambigüedad es gestionada por la Hypothesis Network, no por un handler |
| **I2.5** — Eliminar dual engine v2 | Pricing necesita ser re-evaluado bajo el nuevo modelo |
| **DEBT-05/DEBT-08** — Acoplamiento lead/policy | Serán reemplazados, no refactorizados |

### Qué roadmap debe reorganizarse

El roadmap actual (Fase 1-5 del ROADMAP.md y las 7 fases del BACKLOG.md) fue diseñado para el modelo state-dominant. Debe reemplazarse por un **roadmap cognitivo** (ver §15).

---

## 15. Roadmap Conceptual

No son tareas técnicas. Son épicas de evolución conceptual. Cada épica representa un cambio en la forma en que el sistema representa y procesa el conocimiento. NO contienen implementación — contienen definiciones.

---

### Épica A: Fundación Cognitiva

**Objetivo:** Establecer el lenguaje y los conceptos comunes. Sincronizar a todo el equipo (humano y agente) en la nueva arquitectura cognitiva.

**Qué incluye:**
1. Publicar esta auditoría como documento fundacional
2. Redefinir el glosario (AIT-015 se mantiene pero con nuevos términos)
3. Crear ADR-009: Cognitive Architecture Baseline
4. Marcar ADR-008 como SUPERSEDED por ADR-009
5. Establecer los 22 principios permanentes (§10) como check de toda decisión futura

**Duración conceptual:** 1 ciclo (aprobación + sincronización)

**Dependencias:** Ninguna. Esta épica es prerequisito de todo lo demás.

---

### Épica B: Evidence Store

**Objetivo:** Que el sistema tenga un registro inmutable de toda evidencia antes de cualquier interpretación.

**Qué incluye:**
1. Definir conceptualmente el schema de evidencia (qué tipos, qué fuentes, cómo se encadenan)
2. Definir el punto exacto donde la recepción termina y el registro comienza
3. Definir cómo se migran los event sourcing actuales (trip_events, dispatch_events) al modelo de evidencia
4. Definir cómo el conocimiento semilla (data/knowledge/) se integra como evidencia base
5. Definir la política de retención: la evidencia es permanente, pero ¿por cuánto tiempo debe ser rápidamente accesible?

**Entregable:** Definición completa de la Evidence Store como concepto, incluyendo sus interfaces con Percepción (escritura) y Cognición (lectura).

**Dependencias:** Épica A

---

### Épica C: Hypothesis Network

**Objetivo:** Que el sistema pueda mantener múltiples interpretaciones simultáneas con certidumbre probabilística.

**Qué incluye:**
1. Definir el modelo matemático de certidumbre: cómo se calcula, cómo se combina, cómo se degrada
2. Definir las reglas de competencia entre hipótesis: cuándo coexisten, cuándo se excluyen
3. Definir el ciclo de vida de una hipótesis: nacimiento, crecimiento, competencia, fusión, división, muerte, reactivación
4. Definir cómo CORE (el clasificador actual) se transforma en un generador de hipótesis iniciales
5. Definir cómo el Conversation Interpreter y Client Objective se integran como fuentes de hipótesis

**Entregable:** Definición completa de la Hypothesis Network, incluyendo su interacción con la Evidence Store (entrada) y la Operational Projection (salida).

**Dependencias:** Épica B

---

### Épica D: Commitment Model

**Objetivo:** Que el sistema pueda decidir cuándo actuar basado en umbrales probabilísticos y costo de error, no en reglas fijas.

**Qué incluye:**
1. Definir el Costo de Error: para cada tipo de decisión (cotizar precio, confirmar origen, ejecutar viaje), ¿cuánto cuesta equivocarse?
2. Definir el umbral de compromiso: ¿qué certidumbre mínima se necesita para cada tipo de acción?
3. Definir los niveles de compromiso: informativo, condicional, operacional
4. Definir cómo el compromiso se registra como evidencia
5. Definir cómo la estrategia (postura) modula los umbrales

**Entregable:** Definición completa del modelo de compromiso, incluyendo su integración con la Evaluación (salida de Hypothesis Network) y la Ejecución (entrada a Negocio).

**Dependencias:** Épica C

---

### Épica E: Operational Projection

**Objetivo:** Que los slots sean una vista de solo lectura de la evidencia, no un almacén de escritura directa.

**Qué incluye:**
1. Definir cómo se proyectan los slots desde la Hypothesis Network
2. Definir qué slot se proyecta desde qué hipótesis (o combinación de hipótesis)
3. Definir cómo la proyección cambia cuando la Hypothesis Network cambia
4. Definir qué información se pierde en la proyección (por diseño) y qué se preserva
5. Definir cómo la Operational Projection reemplaza a `chat_sessions.slots`

**Entregable:** Definición de la Operational Projection como concepto, incluyendo la relación entre slots proyectados y evidencia fuente.

**Dependencias:** Épica C, Épica D

---

### Épica F: Conversational Strategy

**Objetivo:** Que la estrategia conversacional emerja del estado del conocimiento, no de señales computadas.

**Qué incluye:**
1. Redefinir StrategyDecision: de señales derivadas (purchaseIntent, urgency) a inputs del conocimiento (certidumbre de hipótesis, gaps de evidencia, costo de error)
2. Definir cómo la postura estratégica (acelerar, indagar, confirmar, ejecutar, escalar) se determina desde el Commitment Model
3. Definir cómo la estrategia influye en la expresión (tono, longitud, contenido) sin modificar la decisión subyacente
4. Definir cómo la estrategia desaparece como capa separada y se integra en el ciclo cognitivo

**Entregable:** Definición de la estrategia conversacional como consecuencia del ciclo cognitivo, no como capa independiente.

**Dependencias:** Épica D, Épica E

---

### Épica G: Expression & Explanation

**Objetivo:** Que el sistema pueda explicar sus decisiones en términos de la evidencia que las sustenta, y que su expresión sea coherente con el estado cognitivo.

**Qué incluye:**
1. Definir cómo cada respuesta debe reflejar: (a) el compromiso tomado, (b) la certidumbre con la que se tomó, (c) las opciones disponibles
2. Definir cómo el LLM recibe el estado cognitivo completo (no solo señales derivadas) para generar expresión
3. Definir cómo el sistema responde "¿por qué?" — mostrando las evidencias que sustentan la decisión
4. Definir cómo la voz única (sin dualidad LLM/template) se logra a través de la proyección del estado cognitivo

**Entregable:** Definición del modelo de expresión cognitivamente informada.

**Dependencias:** Épica E, Épica F

---

### Épica H: Learning Loop

**Objetivo:** Que cada outcome retroalimente el modelo de confianza de fuentes y los umbrales de compromiso.

**Qué incluye:**
1. Definir cómo se registra cada outcome como evidencia
2. Definir cómo el outcome se compara con la proyección (acierto o error)
3. Definir cómo se actualizan las confianzas de fuente basado en outcomes acumulados
4. Definir cómo los umbrales de compromiso se ajustan basado en outcomes históricos
5. Definir cómo el aprendizaje opera sobre la confianza de fuentes, no sobre las hipótesis individuales

**Entregable:** Definición del ciclo de aprendizaje cognitivo.

**Dependencias:** Épica B, Épica C, Épica D

---

### Mapa de dependencias entre épicas

```
A (Fundación)
└── B (Evidence Store)
    └── C (Hypothesis Network)
        ├── D (Commitment Model)
        │   └── F (Conversational Strategy)
        └── E (Operational Projection)
            └── G (Expression & Explanation)
                └── H (Learning Loop)
```

Cada épica produce: una **definición conceptual completa** que sirve como especificación para la implementación. Las definiciones NO contienen código — contienen el modelo de conocimiento que el código debe reflejar.

---

## Conclusión

### ¿Cómo piensa AITOS?

**Hoy:** AITOS no piensa. Procesa.

Su arquitectura actual es un pipeline determinista que transforma mensajes en operaciones. Es rápido, preciso (96% en evals), y predecible. También es rígido, de una sola interpretación, y ciegamente secuencial.

El sistema actual puede clasificar una intención con alta precisión, pero no puede sostener la duda. Puede extraer un destino con alta confianza, pero no puede mantener dos destinos posibles mientras se resuelve la ambigüedad. Puede decidir cuándo preguntar, pero no evalúa el costo de equivocarse.

**AITOS es un prodigio de la ingeniería conversacional. Cognitivamente, es un recién nacido.**

### Lo que falta no es código

La distancia entre el sistema actual y el modelo cognitivo ideal no se resuelve con:
- Más líneas de TypeScript
- Más tablas en Turso
- Más funciones en el pipeline
- Más tests

La distancia se resuelve con **una reorganización fundamental de cómo el sistema representa el conocimiento**.

El cambio no es arquitectónico en el sentido técnico. No se trata de mover carpetas o refactorizar clases. Se trata de cambiar la **ontología del sistema**: qué conceptos existen, cómo se relacionan, quién es dueño de qué, qué es mutable y qué no.

### Los 3 cambios conceptuales que todo lo determinan

1. **De estado a evidencia.** El sistema deja de preguntarse "¿en qué estado estoy?" y empieza a preguntarse "¿qué evidencia tengo?". La state machine conversacional desaparece. El sistema sabe qué hacer porque sabe qué ha observado.

2. **De única interpretación a hipótesis múltiples.** El sistema deja de elegir "esto significa X" y empieza a mantener "esto podría significar X (70%), Y (20%), o Z (10%)". Las hipótesis compiten, se fusionan, se degradan, y eventualmente una alcanza certidumbre suficiente para el compromiso.

3. **De decisión por reglas a compromiso por umbral.** El sistema deja de aplicar "si X entonces Y" y empieza a evaluar "con la evidencia actual y el costo de error, ¿es momento de comprometerse?".

### El verdadero cuello de botella

El sistema actual fue diseñado para un propósito: **conversación estructurada → operación de negocio**. Resuelve ese problema excelentemente bien.

El próximo salto no es hacia mejor conversación o más operaciones. Es hacia **cognición**: la capacidad de mantener incertidumbre, integrar evidencia contradictoria, explicar decisiones, y aprender de outcomes.

Ese salto no es técnico. Es conceptual.

El cuello de botella de AITOS no está en su código ni en su arquitectura. Está en su **modelo de conocimiento**. Mientras el sistema siga pensando en términos de estados, intenciones únicas, y slots que se llenan, no importa cuánto código se agregue — la cognición real estará ausente.

Esta auditoría define el **qué**. El próximo paso es definir el **cómo** en un ADR que establezca la nueva arquitectura cognitiva (ADR-009).

---

*Fin de Auditoría #06 — Arquitectura Cognitiva*

---

### Anexo: Inconsistencias detectadas entre auditorías y documentos

Durante esta auditoría se detectaron las siguientes inconsistencias entre fuentes que deben resolverse antes de avanzar:

| # | Inconsistencia | Fuentes | Resolución propuesta |
|---|---------------|---------|---------------------|
| 1 | Auditorías #01 y #02 no existen en el repositorio | #03 las referencia, #06 las necesita | Reconstruir su contenido desde las referencias en #03 o aceptar que #06 las reemplaza |
| 2 | SYSTEM_BIBLE vs. operational-model.md difieren en los slots canónicos (6 vs. 7) | SYSTEM_BIBLE §5, operational-model.md §2 | Unificar en 7 slots (agregar vehicle_type al SYSTEM_BIBLE) |
| 3 | DECISION_TREE vs. operational-model.md difieren en el orden de comprehensión vs. extracción | DECISION_TREE, operational-model.md §5.3-5.4 | Resolver en ADR-009: comprehensión debe ser evaluación, no etapa del pipeline |
| 4 | PROJECT_BOARD y BACKLOG son dos backlogs paralelos sin reconciliación | PROJECT_BOARD.md, BACKLOG.md (Sección G) | Fusionar o eliminar uno. La existencia de dos backlogs independientes garantiza que eventualmente divergirán |
| 5 | ARCHITECTURE_BIBLE §2.1 invariant 3 vs. operational-model.md §5 | "Operational Model represents the truth" vs. "Slots represent the truth" | Las slots son proyección de evidencia, no verdad. El invariant debe actualizarse |
| 6 | ADR-008 freeze vs. bugs detectados en simulaciones (H2.1, H3.1) | ADR-008, Simulaciones Etapa 3 | El freeze cubre cambios arquitectónicos, no bugs. Pero bugs como roleLock defectuoso requieren cambios que cruzan capas. Debe definirse explícitamente qué se permite bajo freeze |
