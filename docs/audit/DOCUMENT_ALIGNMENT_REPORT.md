# Constitutional Alignment Report — AITOS

> CGP-1: Constitutional Governance Program — Phase 1
> Propósito: Determinar la alineación documental respecto a la nueva Constitución de AITOS.
> Restricción: Solo análisis. No modificación. No corrección.

---

## 1. Executive Summary

Se analizaron 7 documentos clave del ecosistema para determinar su alineación con la nueva Constitución.

**Hallazgo principal:** Existe una **crisis de autoridad** no resuelta. Cuatro documentos pretenden ser la fuente primaria de verdad del sistema:

| Documento | Autoridad que declara | Consistente con Constitución |
|-----------|----------------------|------------------------------|
| `AITOS_CONSTITUTION.md` | "Máxima autoridad normativa del sistema" (§1.3) | — (es la referencia) |
| `FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` | "Fuente de Verdad funcional" (header) | ❌ — compite directamente |
| `CONVERSATION_DECISION_ALGORITHM.md` | "Documento normativo" (line 6) | ⚠️ — subordinado implícito |
| `SYSTEM_BIBLE.md` | "The non-technical constitution" (subtitle) | ❌ — autoridad no resuelta |
| `docs/ai/ARCHITECTURE_BIBLE.md` | "Minimum required context" (README) | ⚠️ — no referencias Constitución |

**Duplicaciones críticas:** I-C1 a I-C12 aparecen en 3 documentos (FBS, CDA, Constitución) con diferencias de redacción. Los RFs aparecen en 2 documentos (Constitución: 19 RFs; FBS: 10 RFs) con contenidos diferentes. Las invariantes I-01 a I-15 aparecen en 2 documentos (CDA original, Constitución resumida).

**Contradicciones detectadas:** 2 directas y 4 potenciales.

**Recomendación principal:** Establecer formalmente que la Constitución prevalece sobre FBS, CDA y SYSTEM_BIBLE. Los documentos derivados deben convertirse en referencias que desarrollan la Constitución, no en fuentes alternativas.

---

## 2. Current Authority Model

El modelo de autoridad actual no está formalizado. Cada documento declara su propia autoridad sin reconocer una jerarquía superior.

### 2.1 Declaraciones de autoridad por documento

| Documento | Declaración textual | Fuente |
|-----------|-------------------|--------|
| Constitución | "La presente Constitución constituye la **máxima autoridad normativa** del sistema. Sus disposiciones prevalecerán sobre cualquier decisión de implementación, algoritmo, configuración, flujo conversacional o criterio técnico que resulte incompatible con ellas." | §1.3 |
| FBS | "**Fuente de Verdad funcional** del sistema conversacional AITOS. [...] Toda corrección, auditoría o desarrollo nuevo debe **compararse contra esta especificación**." | Header |
| CDA | "**Documento normativo**. Toda implementación o refactor debe **cumplir este algoritmo**." | Line 6-7 |
| CDA | "Autoridad: Deriva de FUNCTIONAL_BEHAVIOR_SPECIFICATION.md, Principios AITOS LAB (P1-P10) [...] ADR-007, ADR-008, CX-1." | Line 5 |
| SYSTEM_BIBLE | "The **non-technical constitution** of the AI Transportation Operating System. Read this before any other document." | Subtitle |
| ARCHITECTURE_BIBLE | "**Every AI agent must read** ARCHITECTURE_BIBLE.md first." | README.md |
| ADR-013 | "Ratifica el Conversation Decision Algorithm como **autoridad funcional normativa** del comportamiento conversacional. Jerarquía: Implementation → CDA → Specification → ADR." | ADR-013 |

### 2.2 Conflictos de autoridad

| Conflicto | Documento A | Documento B | Documento C |
|-----------|------------|------------|------------|
| Fuente de verdad funcional | Constitución (§1-8) | FBS (header) | — |
| Comportamiento conversacional | CDA (normativo) | Constitución (INV, CC, CON) | FBS (I-C, P) |
| Requisitos funcionales | Constitución (19 RFs) | FBS (10 RFs) | — |
| Invariantes conversacionales | Constitución (INV-01 a INV-08) | FBS (I-C1 a I-C12) | CDA (I-01 a I-15) |

### 2.3 Documentos que NO referencian la Constitución

| Documento | Referencia a Constitución | Riesgo |
|-----------|--------------------------|--------|
| FBS | No. FBS es anterior a la Constitución. | ALTO — puede generar RFs divergentes |
| CDA | No. CDA es anterior a la Constitución. | ALTO — invariantes duplicadas sin jerarquía |
| SYSTEM_BIBLE.md | No. Última actualización 2026-07-06. | ALTO — autoridad no resuelta |
| docs/ai/ (ARCHITECTURE_BIBLE, INVARIANTS, etc.) | No. | MEDIO — pueden contener reglas no alineadas |
| ARCHITECTURE_STATUS.md | No. Su §12 no incluye la Constitución. | MEDIO — inventario desactualizado |
| KNOWLEDGE_INVENTORY.md | No. 265 archivos catalogados sin la Constitución. | BAJO — pero SSOT incompleto |

---

## 3. Document Hierarchy Analysis

### 3.1 Jerarquía declarada por la Constitución (§1.4)

```
1. Constitución del Sistema
2. Constituciones Cognitivas
3. Requerimientos Funcionales
4. Requerimientos No Funcionales
5. Reglas de Decisión
6. Heurísticas Cognitivas
7. Invariantes
8. Contratos
9. Implementación
```

### 3.2 Jerarquía declarada por ADR-013

```
Implementation → CDA → Specification → ADR
```

### 3.3 Jerarquía declarada por SYSTEM_BIBLE

```
1. Code and database are the ultimate truth.
2. This Bible and the architecture documents describe the intended truth.
3. The AI provides interpretation, never authority.
4. A human operator has final authority when the system escalates.
```

### 3.4 Análisis de conflictos jerárquicos

| Conflicto | Constitución dice | ADR-013 dice | SYSTEM_BIBLE dice |
|-----------|------------------|--------------|-------------------|
| ¿Quién está arriba? | Constitución | CDA > Spec > ADR | Code > Bible > AI |
| ¿Dónde está el CDA? | Nivel 8 (Contratos) | Nivel 1 (normativo) | No mencionado |
| ¿Dónde está la FBS? | No mencionada | Nivel 2 (Specification) | No mencionado |
| ¿Dónde están los ADRs? | No mencionados (nivel 9 = Implementación) | Nivel 3 | Mencionados como registro |

**Conclusión:** ADR-013 establece una jerarquía (Implementation → CDA → Specification → ADR) que no reconoce a la Constitución. La Constitución establece otra jerarquía (Constitución → CC → RF → RNF → RD → H → INV → CON → Implementación) que no menciona FBS ni CDA.

---

## 4. Constitution vs FBS Analysis

### 4.1 Declaraciones de autoridad

| Aspecto | Constitución | FBS |
|---------|-------------|-----|
| Fecha | CGP-0 (post-2026-07-20) | Versión 1.0 (anterior) |
| Rol declarado | "Máxima autoridad normativa" | "Fuente de Verdad funcional" |
| Ámbito | Todo el sistema | Comportamiento conversacional |
| Jerarquía | §1.4 jerarquía explícita | No declara subordinación |

### 4.2 Comparación de Requerimientos Funcionales

| Aspecto | Constitución (19 RFs) | FBS (10 RFs) |
|---------|----------------------|---------------|
| Cantidad | 19 RFs | 10 RFs |
| Enfoque | Abstracto, orientado a capacidades | Concreto, orientado a implementación |
| Ejemplo RF-01 | "Contexto conversacional persistente" | "Recepción de mensajes: webhook, HMAC, rate limiting, deduplicación" |
| Ejemplo RF-05 | "Clasificar información como confirmada/inferida/pendiente" | "Cotización de tarifas con jerarquía de resolución" |
| Solapamiento | Bajo. Solo 3-4 RFs tienen equivalente directo. | Bajo. La Constitución redefinió los RFs. |

**Conclusión:** Los RFs de la Constitución y los RFs de la FBS son **dos conjuntos diferentes**. No hay duplicación exacta. La Constitución define RFs a nivel de capacidad conceptual; la FBS define RFs a nivel de feature funcional.

### 4.3 Comparación de principios conversacionales

| Principio | Constitución | FBS |
|-----------|-------------|-----|
| P1 — Un solo dato | No presente | §5 P1 |
| P2 — Preservar contexto | CC-04 (parcial) | §5 P2 |
| P3 — No repetir preguntas | No presente | §5 P3 |
| P4 — Confirmar antes de ejecutar | No como principio; como regla de decisión RD-03 | §5 P4 |
| P5 — Ambigüedad se resuelve | No presente | §5 P5 |
| P6 — Lenguaje natural | No presente | §5 P6 |
| P7 — Conversación no es negocio | No presente | §5 P7 |
| P8 — Una sola clasificación | No presente | §5 P8 |
| P9 — Intención evoluciona | CC-02 (parcial) | §5 P9 |
| P10 — Slot_state es verdad | CC-04 (parcial), INV-04 (parcial) | §5 P10 |

**Conclusión:** Los principios P1-P10 de la FBS no fueron incorporados a la Constitución. La Constitución tiene principios diferentes (CC-01 a CC-11) que cubren parcialmente el mismo espacio semántico pero con alcance y redacción distintos.

### 4.4 Comparación de invariantes conversacionales (I-C1 a I-C12)

| Invariante | FBS (§20) | Constitución | Estado |
|------------|-----------|-------------|--------|
| I-C1 — No perder contexto | Texto completo | INV-04 (parcial), CC-04 (parcial) | **Pérdida de precisión** |
| I-C2 — No doble clasificación | Texto completo | No presente | **Ausente** |
| I-C3 — No preguntar lo sabido | Texto completo | RF-02 (parcial) | **Pérdida de precisión** |
| I-C4 — No responder sin clasificar | Texto completo | No presente | **Ausente** |
| I-C5 — No ejecutar sin confirmar | Texto completo | No presente como invariante | **Ausente** |
| I-C6 — No asumir primer lugar | Texto completo | No presente | **Ausente** |
| I-C7 — No silenciar mensajes | Texto completo | No presente | **Ausente** |
| I-C8 — No inventar lugares | Texto completo | No presente | **Ausente** |
| I-C9 — Intención evoluciona | Texto completo | CC-02 (parcial) | **Pérdida de precisión** |
| I-C10 — Un solo estado | Texto completo | INV-01 (equivalente) | **D1 Válida** |
| I-C11 — Slots tienen dueño | Texto completo | RF-05 (parcial) | **Pérdida de precisión** |
| I-C12 — Slot_state determina acción | Texto completo | No presente | **Ausente** |

**Clasificación: D3 — Contradicción normativa (por omisión).** La Constitución omite 5 invariantes críticas (I-C2, I-C4, I-C6, I-C7, I-C8, I-C12) y degrada otras 4 de invariante a RF o CC (pérdida de jerarquía normativa).

---

## 5. Constitution vs CDA Analysis

### 5.1 Declaraciones de autoridad

| Aspecto | Constitución | CDA |
|---------|-------------|-----|
| Fecha | CGP-0 | Versión 1.1 (anterior) |
| Rol declarado | "Máxima autoridad normativa" | "Documento normativo" |
| Ratificado por | — | ADR-013 |
| Ámbito | Todo el sistema | Algoritmo de decisión conversacional |

### 5.2 Comparación de invariantes (I-01 a I-15 del CDA vs Constitución)

| Invariante CDA | Constitución | Clasificación |
|----------------|-------------|---------------|
| I-01 — NUNCA perder slot confirmado | INV-04 (parcial), CC-04 (parcial) | D2 — Peligrosa (pérdida de precisión) |
| I-02 — NUNCA preguntar dato confirmado | RF-02 (parcial) | D2 — Peligrosa (degradada de invariante a RF) |
| I-03 — MERGE incremental | CC-04 (parcial) | D2 — Peligrosa (pérdida del "nunca reemplazo total") |
| I-04 — Intención solo cambia con evidencia | CC-02 (parcial) | D2 — Peligrosa (pérdida de "baja confianza no es evidencia") |
| I-05 — Ambiguity no destruye contexto | No presente | D3 — Contradicción por omisión |
| I-06 — UPDATE no RESET | CC-04 (parcial) | D2 — Peligrosa |
| I-07 — No retroceder estado conversacional | No presente | D3 — Contradicción por omisión |
| I-08 — No abandonar dominio | CC-09 (parcial) | D2 — Peligrosa |
| I-09 — Preguntar solo necesario | CC-05 (parcial) | D2 — Peligrosa |
| I-10 — Minimizar turnos | CC-05 (parcial) | D2 — Peligrosa |
| I-11 — clarify_field determina interpretación | No presente | D3 — Contradicción por omisión |
| I-12 — Una sola clasificación | No presente | D3 — Contradicción por omisión |
| I-13 — Fuente del slot se preserva | RF-05 (parcial) | D2 — Peligrosa |
| I-14 — No múltiples autoridades | No presente | D3 — Contradicción por omisión |
| I-15 — Respuesta respeta estado | No presente | D3 — Contradicción por omisión |

### 5.3 Comparación del pipeline conversacional

| Elemento | CDA | Constitución |
|----------|-----|-------------|
| Pipeline de 11 pasos | §2 detallado | No incluido |
| Jerarquía de 7 niveles | §3 detallado | §4 (no se incluyó en la refactorización) |
| Reglas de merge | §5 detallado | No incluido |
| Árbol de decisión | §9 completo | No incluido |
| CON-01 (Contrato Decisión) | — | Abstracto: "conforme a un algoritmo de decisión conversacional" |

**Conclusión:** La Constitución referencia el CDA en CON-01 pero no incorpora su contenido. El CDA contiene ~900 líneas de reglas de decisión detalladas (merge, pipeline, prioridades) que la Constitución no captura.

---

## 6. SYSTEM_BIBLE Assessment

### 6.1 Perfil del documento

| Aspecto | Valor |
|---------|-------|
| Fecha | 2026-07-06 (última actualización) |
| Extensión | 192 líneas |
| Rol declarado | "The non-technical constitution" |
| Tono | Explicativo, pedagógico, narrativo |
| Estilo | No normativo — describe, no prescribe |
| Referencias | No referencias la Constitución (es anterior) |

### 6.2 Contenido vs Constitución

| Sección SYSTEM_BIBLE | Equivalente en Constitución | Evaluación |
|---------------------|---------------------------|------------|
| §1 Purpose | §1.1 Propósito | D4 — Conocimiento adicional (contexto narrativo) |
| §2 What AITOS is | §1.6 Identidad del Sistema | D1 — Válida (desarrolla sin modificar) |
| §3 What AITOS is not | §1.5 Alcance (fuera de alcance) | D4 — Conocimiento adicional (explica límites) |
| §4 The core promise | §1.3 Naturaleza + §1.6 | D4 — Conocimiento adicional |
| §5 The operational model | CC-07 (parcial) | D4 — Conocimiento adicional (describe slots) |
| §6 Authority and trust | No equivalente | **D3 — Contradicción.** Dice "Code > Bible" pero Constitución dice "Constitución > Implementación" |
| §7 How the system decides | CON-01 (parcial) | D4 — Conocimiento adicional |
| §8 Graceful degradation | No equivalente | D4 — Conocimiento adicional |
| §9 Scope boundaries | §1.5 Alcance | D1 — Válida |
| §10 Evolution principles | PC-01 a PC-06 | D2 — Peligrosa (principios de evolución no alineados) |

### 6.3 Contradicción crítica en §6 (Authority and trust)

SYSTEM_BIBLE §6 declara:
```
1. Code and database are the ultimate truth.
2. This Bible and the architecture documents describe the intended truth.
3. The AI provides interpretation, never authority.
4. A human operator has final authority when the system escalates.
```

La Constitución §1.3 declara:
```
La presente Constitución constituye la máxima autoridad normativa del sistema.
```

**Contradicción:** SYSTEM_BIBLE pone al código como "ultimate truth". La Constitución se pone a sí misma como "máxima autoridad". Si la Constitución es la máxima autoridad, entonces el código debe cumplir la Constitución, no al revés.

### 6.4 Veredicto

| Criterio | Resultado |
|----------|-----------|
| ¿Es equivalente a Constitución? | **No.** Es un documento narrativo, no normativo. |
| ¿Es histórico? | **Sí.** Fue escrito antes de la Constitución. |
| ¿Contiene conocimiento superior? | **No.** Todo su contenido es descriptivo o está cubierto por la Constitución. |
| ¿Debe absorberse? | **Parcialmente.** §8 (Graceful degradation) y §5 (operational model) agregan contexto útil no presente en la Constitución. |
| ¿Debe degradarse a histórico? | **Sí, con absorción selectiva.** Su conocimiento valioso debe migrarse antes de archivarlo. |

---

## 7. Duplication Classification

### 7.1 Tabla completa de duplicaciones

| ID | Documento A | Documento B | Elemento | Clasificación | Acción futura |
|----|------------|------------|----------|---------------|---------------|
| DUP-01 | FBS (§20 I-C1) | CDA (§4 I-01) | No perder slot | **D1** — Válida. CDA refina a FBS. | Mantener. CDA es el refinamiento algorítmico de la FBS. |
| DUP-02 | FBS (§20 I-C1..I-C12) | CONST (INV-01..08, CC) | Invariantes conversacionales | **D2** — Peligrosa. Constitución captura 7/12 con pérdida de precisión. 5 omitidas. | Convertir en referencia explícita. Añadir las 5 omitidas o referenciar FBS/CDA. |
| DUP-03 | CDA (§4 I-01..I-15) | CONST (INV, CC, RF) | Invariantes del CDA | **D2** — Peligrosa. Constitución captura ~10/15 con pérdida de precisión. 5 omitidas. | Convertir en referencia explícita. Añadir referencia al CDA como contrato detallado. |
| DUP-04 | CONST (RF-01..19) | FBS (§3 RF-01..10) | Requerimientos Funcionales | **D3** — Contradicción normativa. Dos conjuntos diferentes de RFs. | Resolver: Constitución debe ser la autoridad; FBS debe referenciar o ser reemplazada. |
| DUP-05 | CONST (CC-01..11) | FBS (§5 P1..P10) | Principios conversacionales | **D3** — Contradicción normativa. Principios diferentes para el mismo dominio. | Armonizar: los P1-P10 de FBS deben incorporarse o referenciarse desde la Constitución. |
| DUP-06 | CONST (§1.4 jerarquía) | ADR-013 (jerarquía) | Jerarquía normativa | **D3** — Contradicción normativa. Dos jerarquías incompatibles. | Resolver: ADR-013 debe actualizarse o la Constitución debe incorporar la subordinación del CDA. |
| DUP-07 | SYSTEM_BIBLE (§6) | CONST (§1.3) | Autoridad del código vs Constitución | **D3** — Contradicción normativa. SYSTEM_BIBLE dice "code > Bible"; CONST dice "Constitución > Implementación". | Resolver: SYSTEM_BIBLE debe alinearse con la Constitución. |
| DUP-08 | docs/ai/INVARIANTS.md | CONST (INV-01..08) | Invariantes del sistema | **D2** — Peligrosa. El Context Pack de IA tiene sus propias invariantes. | Convertir en referencia. El Context Pack debe derivar de la Constitución. |
| DUP-09 | CONST (RF) | docs/knowledge/ (reglas) | Reglas de negocio | **D1** — Válida. Reglas de conocimiento desarrollan los RFs. | Mantener. Son implementaciones detalladas. |

### 7.2 Distribución por tipo

| Clasificación | Cantidad | Documentos |
|---------------|----------|------------|
| **D1** — Duplicación válida | 2 | DUP-01, DUP-09 |
| **D2** — Duplicación peligrosa | 4 | DUP-02, DUP-03, DUP-04 (parcial), DUP-08 |
| **D3** — Contradicción normativa | 4 | DUP-04 (parcial), DUP-05, DUP-06, DUP-07 |
| **D4** — Conocimiento adicional | 3 | SYSTEM_BIBLE §§1,3,4,5,7,8 |

---

## 8. Contradictions Found

### 8.1 Contradicción directa — Jerarquía normativa

**Documento A:** `AITOS_CONSTITUTION.md` §1.4
```
1. Constitución del Sistema.
2. Constituciones Cognitivas.
3. Requerimientos Funcionales.
4. Requerimientos No Funcionales.
5. Reglas de Decisión.
6. Heurísticas Cognitivas.
7. Invariantes.
8. Contratos.
9. Implementación.
```

**Documento B:** `docs/adr/013-conversation-decision-algorithm.md`
```
Implementation → CDA → Specification → ADR
```

**Naturaleza:** D3 — Contradicción normativa.

**Impacto:** No está claro si el CDA está por encima de la Constitución (según ADR-013) o si la Constitución está por encima del CDA (según §1.3). **El CDA es ratificado por ADR, los ADR están en nivel 9 de la Constitución (Implementación), pero ADR-013 dice que CDA > ADR.**

### 8.2 Contradicción directa — Sistema de RFs

**Documento A:** `AITOS_CONSTITUTION.md` §3 (19 RFs)
**Documento B:** `FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` §3 (10 RFs)

**Naturaleza:** D3 — Contradicción normativa.

**Impacto:** Un desarrollador que consulte la Constitución obtendrá un conjunto de requisitos; otro que consulte la FBS obtendrá un conjunto diferente. **No hay SSOT de requisitos funcionales.**

### 8.3 Contradicción potencial — Principios conversacionales

**Documento A:** `AITOS_CONSTITUTION.md` CC-01 a CC-11 (11 principios)
**Documento B:** `FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` P1 a P10 (10 principios)

**Naturaleza:** D3 — Contradicción normativa.

**Impacto:** Los principios no están alineados. Por ejemplo, P1 de FBS (Un solo dato por vez) no tiene equivalente en la Constitución. CC-05 de la Constitución (Economía de la interacción) no tiene equivalente en FBS. **Un mismo comportamiento podría ser válido según un documento e inválido según otro.**

### 8.4 Contradicción — Autoridad del código vs Constitución

**Documento A:** `SYSTEM_BIBLE.md` §6: "Code and database are the ultimate truth."
**Documento B:** `AITOS_CONSTITUTION.md` §1.3: "La presente Constitución constituye la máxima autoridad normativa del sistema."

**Naturaleza:** D3 — Contradicción normativa.

**Impacto:** Si el código es la verdad última, entonces un cambio de código podría justificar el incumplimiento de la Constitución, violando su §1.1 ("Ninguna implementación podrá justificar el incumplimiento de un principio constitucional").

### 8.5 Contradicción potencial — Invariantes omitidas

**Documento A:** `AITOS_CONSTITUTION.md` INV-01 a INV-08 (8 invariantes)
**Documento B:** `FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` I-C1 a I-C12 (12 invariantes)

**Omisiones que generan contradicción:**

| Invariante omitida en CONST | Dónde está | Riesgo |
|---------------------------|-----------|--------|
| I-C2 — No doble clasificación | Sólo en FBS | Un cambio que permita doble clasificación sería válido según CONST pero inválido según FBS |
| I-C4 — No responder sin clasificar | Sólo en FBS | Ídem |
| I-C6 — No asumir primer lugar ambiguo | Sólo en FBS | Ídem |
| I-C7 — No silenciar mensajes | Sólo en FBS | Ídem |
| I-C8 — No inventar lugares | Sólo en FBS | Ídem |
| I-C12 — Slot_state determina acción | Sólo en FBS | Ídem |

### 8.6 Contradicción — Declaraciones de autoridad auto-referenciales

Varios documentos se declaran autoridad sin reconocer a los demás:

```
Constitución: "Máxima autoridad normativa."
FBS:          "Fuente de Verdad funcional."
SYSTEM_BIBLE: "The non-technical constitution."
ARCHITECTURE_BIBLE: "Every AI agent must read this first."
ADR-013:      "Implementation → CDA → Specification → ADR"
```

**Ningún documento declara explícitamente subordinación a otro.**

---

## 9. Proposed Future Hierarchy

### 9.1 Jerarquía normativa oficial propuesta

Basada en el análisis de autoridad, cobertura y relaciones documentales:

```
NIVEL 1 — CONSTITUCIÓN (autoridad suprema)
└── AITOS_CONSTITUTION.md
    ├── Principios Constitucionales (PC)
    ├── Constituciones Cognitivas (CC)
    ├── Requerimientos Funcionales (RF)
    ├── RNF Arquitectónicos y Cognitivos (RNF-A, RNF-C)
    ├── Reglas de Decisión (RD)
    ├── Heurísticas (H)
    ├── Invariantes (INV)
    └── Contratos (CON)

NIVEL 2 — CONTRATOS ARQUITECTÓNICOS (derivan de la Constitución)
├── MISSION_PHASE_ARCHITECTURE.md (MP)
├── MISSION_CLOSURE_CONTRACT.md (MC)
├── STRATEGIC_OPERATIONAL_CONTRACT.md (SO)
├── DUAL_INTERFACE_ARCHITECTURE.md (DI)
└── INTERFACE_FREEZE_V2.md (IF)

NIVEL 3 — ESPECIFICACIONES DETALLADAS (desarrollan la Constitución)
├── Especificación Funcional
│   └── FUNCTIONAL_BEHAVIOR_SPECIFICATION.md
│       └── Debe referenciar y subordinarse a la Constitución
└── Especificación de Decisión
    └── CONVERSATION_DECISION_ALGORITHM.md
        └── Debe referenciar y subordinarse a la Constitución

NIVEL 4 — DECISIONES ARQUITECTÓNICAS (registran decisiones)
└── ADR_INDEX.md → docs/adr/001..014
    └── Deben referenciar la Constitución como autoridad suprema

NIVEL 5 — ARQUITECTURA DEL SISTEMA (mapean el estado)
├── ARCHITECTURE_STATUS.md
├── ARCHITECTURE_BASELINE.md
├── ARCHITECTURE_ATLAS.md
├── Mapas (system-map, capability-map, knowledge-map...)
└── Diagramas

NIVEL 6 — ECOSISTEMA DE DESARROLLO AEL
├── ael/constitution/SPEC.md (reglas operacionales del ecosistema)
├── ael/constitution/CONTRACTS.md (R1-R4)
├── ael/government/ (roles y organización)
└── .opencode/agents/ (prompts PLAN, BUILD)

NIVEL 7 — CONTEXTO PARA IA (derivado)
├── docs/ai/ARCHITECTURE_BIBLE.md
├── docs/ai/ARCHITECTURE_RULES.md
└── docs/ai/INVARIANTS.md
    └── Debe derivar de la Constitución, no ser autónomo

NIVEL 8 — CERTIFICACIÓN Y QA
├── CERTIFICATION_REGISTRY.md
├── QA_GOVERNANCE.md
├── TECHNICAL_DEBT_BASELINE.md
└── docs/certification/ (auditorías históricas)

NIVEL 9 — PROYECTO Y OPERACIONES
├── PROJECT_CONTEXT.md
├── PROJECT_BOARD.md
├── CHANGELOG.md
├── ROADMAP.md
└── docs/operations/

NIVEL 10 — CONOCIMIENTO
├── docs/knowledge/ (reglas de negocio)
└── docs/inventory/KNOWLEDGE_INVENTORY.md
```

### 9.2 Justificación de la propuesta

1. **La Constitución debe ser Nivel 1** porque así se declara a sí misma y porque es el único documento que cubre el sistema completo.

2. **La FBS debe pasar a Nivel 3** (subordinada). La FBS contiene ~1700 líneas de especificación detallada que la Constitución no debe duplicar. Debe referenciar la Constitución como autoridad suprema.

3. **El CDA debe pasar a Nivel 3** (subordinado). El CDA contiene ~1000 líneas de algoritmo detallado. ADR-013 debe actualizarse para que la jerarquía sea `Implementation → ADR → CDA → FBS → Constitution` o similar, reconociendo a la Constitución como tope.

4. **SYSTEM_BIBLE debe degradarse a histórico** o convertirse en un "AITOS Overview" no normativo que referencie la Constitución.

5. **Los ADRs deben estar en Nivel 4** — son registros de decisiones, no autoridad normativa primaria.

6. **El ecosistema AEL (SPEC.md)** debe estar en Nivel 6 — gobierna el proceso de desarrollo, no el producto.

7. **El Context Pack de IA** debe derivar de la Constitución, no ser autónomo.

---

## 10. Recommendations for CGP-1 Phase 2

### 10.1 Acciones inmediatas (CGP-1 Phase 2)

| # | Acción | Documentos afectados | Prioridad |
|---|--------|---------------------|-----------|
| 1 | **Actualizar FBS** para que su header declare subordinación a la Constitución. Cambiar "Fuente de Verdad funcional" por "Especificación detallada derivada de la Constitución". | FBS | CRÍTICA |
| 2 | **Actualizar CDA** para que declare subordinación a la Constitución. El CDA es un contrato (Nivel 8 de la Constitución) que desarrolla CON-01. | CDA | CRÍTICA |
| 3 | **Actualizar ADR-013** para que su jerarquía normativa incluya la Constitución como nivel superior. | ADR-013 | CRÍTICA |
| 4 | **Resolver SYSTEM_BIBLE** — degradar a histórico o convertir en "AITOS Overview" con referencia explícita a la Constitución. | SYSTEM_BIBLE.md | ALTA |
| 5 | **Revisar las 5 invariantes omitidas** (I-C2, I-C4, I-C6, I-C7, I-C8, I-C12) y determinar si deben incorporarse a la Constitución o referenciarse desde FBS. | CONST, FBS | ALTA |
| 6 | **Revisar las 5 invariantes CDA omitidas** (I-05, I-07, I-11, I-12, I-14, I-15) y determinar si deben incorporarse o referenciarse. | CONST, CDA | ALTA |

### 10.2 Acciones estructurales (CGP-2+)

| # | Acción | Justificación |
|---|--------|---------------|
| 7 | **Armonizar principios conversacionales:** Los P1-P10 de FBS y CC-01 a CC-11 de la Constitución deben unificarse. | Resolver DUP-05 |
| 8 | **Resolver dualidad RFs:** Determinar si la Constitución reemplaza completamente a los RFs de la FBS, o si la FBS mantiene RFs detallados que desarrollan los RFs constitucionales. | Resolver DUP-04 |
| 9 | **Actualizar ARCHITECTURE_STATUS.md §12** para incluir la Constitución y el nuevo inventario documental. | Consistencia |
| 10 | **Actualizar KNOWLEDGE_INVENTORY.md** para incluir la Constitución y DOCUMENT_INVENTORY.md. | Consistencia |
| 11 | **Actualizar docs/ai/ Context Pack** para que declare subordinación a la Constitución. | Alineación |
| 12 | **Incorporar §6 de SYSTEM_BIBLE** (Authority and trust) a la Constitución o eliminarlo por contradicción. | Resolver DUP-07 |

### 10.3 Documentos que NO requieren modificación

| Documento | Motivo |
|-----------|--------|
| `docs/architecture/ARCHITECTURE_STATUS.md` | Es documento de estado, no normativo. Puede actualizarse en CGP-2. |
| `docs/architecture/ADR_INDEX.md` | Es índice. Los ADRs individuales deben actualizarse. |
| `docs/project/` | Documentos de proyecto, no normativos. |
| `docs/certification/` | Auditorías históricas. No afectadas. |
| `ael/` | Ecosistema de desarrollo. No compite con la Constitución del producto. |

---

> **Fin de DOCUMENT_ALIGNMENT_REPORT.md — Baseline para CGP-1 Phase 2.**
>
> Este documento identifica contradicciones y duplicaciones, clasifica cada una,
> y propone acciones correctivas. No ejecuta ninguna modificación.
> La Fase 2 de CGP-1 ejecutará las acciones recomendadas en §10.1.
