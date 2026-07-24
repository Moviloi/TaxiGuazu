# CGP-1 — Constitutional Gate Review

> **Gate:** CGP-1 Architectural Gate — Constitutional Boundary Review
> **Propósito:** Autorizar o bloquear el inicio de CGP-1 Phase 4 (Post-Audit Actions)
> **Restricción:** No reabrir la auditoría. Solo validar límites.

---

## Resultado del Gate

**APPROVED WITH MINOR ADJUSTMENTS**

La arquitectura documental es fundamentalmente correcta. La Constitución es la autoridad normativa máxima. Los documentos derivados están identificados. Existen 3 ajustes obligatorios en la clasificación de absorción antes de iniciar Phase 4.

---

## Gate 1 — Constitutional Boundary Review

### 38 elementos ABSORB re-clasificados

De los 38 elementos identificados en la matriz de absorción, **22 pertenecen realmente a la Constitución**. Los 16 restantes deben permanecer en SPECIFICATION (FBS, CDA) o ARCHITECTURE.

### CONSTITUTION (22 elementos)

| # | Elemento | Origen | Destino en CONST |
|---|----------|--------|------------------|
| 1 | I-C2/I-12 — Una sola clasificación por mensaje | FBS / CDA | INV |
| 2 | I-C5 — No ejecutar sin confirmar | FBS | CC o INV |
| 3 | I-C6 — No asumir primer lugar ambiguo | FBS | CC o INV |
| 4 | I-C8 — No inventar lugares | FBS | CC o INV |
| 5 | I-C12 — Slot_state determina acción | FBS | INV |
| 6 | CDA-I05 — Ambiguity no destruye contexto | CDA | INV |
| 7 | CDA-I07 — No retroceder estado conversacional | CDA | INV |
| 8 | CDA-I11 — clarify_field determina interpretación | CDA | INV |
| 9 | CDA-I14 — No múltiples autoridades | CDA | INV |
| 10 | P1 — Un solo dato por vez | FBS | CC |
| 11 | P3 — No repetir preguntas | FBS | CC o INV |
| 12 | P4 — Confirmar antes de ejecutar (reforzar RD-03) | FBS | CC |
| 13 | P5 — La ambigüedad se resuelve, no se ignora | FBS | CC |
| 14 | P6 — Lenguaje natural, no formularios | FBS | CC |
| 15 | P7 — La conversación no es el negocio | FBS | CC |
| 16 | P8 — Una sola clasificación por mensaje | FBS | CC (mismo que I-C2) |
| 17 | P10 — Slot_state RAW→INFERRED→CONFIRMED | FBS | CC o INV |
| 18 | CDA-01 — Principio rector: contexto > mensaje | CDA | CC |
| 19 | CDA-05 — 3 reglas de resolución de conflictos | CDA | INV |
| 20 | ADR12-01 — Conocimiento explícito > generación | ADR-012 | CC |
| 21 | SB-03 — What AITOS is not (5 exclusiones) | SYSTEM_BIBLE | §1.5 Identidad |
| 22 | FBS-RNF01 — Determinismo del núcleo | FBS | RNF-A |
| 23 | FBS-RNF02 — LLM opcional | FBS | RNF-A |
| 24 | FBS-RNF03 — Triple fallback | FBS | RNF-A |
| 25 | FBS-RNF04 — Phone como identidad | FBS | RNF-A |
| 26 | FBS-RNF06 — Idempotencia | FBS | RNF-A |
| 27 | FBS-RNF08 — Política antes de Output | FBS | RNF-A |

**Total: 27 elementos para CONST**

### SPECIFICATION (9 elementos — quedan en FBS o CDA)

| # | Elemento | Motivo | Destino |
|---|----------|--------|---------|
| 28 | CDA-04 — Jerarquía 7 niveles | Arquitectura de decisión detallada. El principio (existe jerarquía) es CONST. La tabla específica es SPEC. | FBS o CDA |
| 29 | FBS-RF02 — 12 intents específicos | La capacidad "clasificar" es CONST. La lista de 12 intents es SPEC. | FBS |
| 30 | FBS-RF03 — 6 slots específicos | La capacidad "extraer" es CONST. La lista de 6 slots es SPEC. | FBS |
| 31 | FBS-RF05 — Jerarquía de cotización | Regla de negocio detallada (Lugar→Zona→0). La capacidad "cotizar" es CONST. | FBS |
| 32 | FBS-RF06 — Despacho por niveles con timeouts | Regla de negocio detallada (1h→30min→8min→3min). La capacidad "despachar" es CONST. | FBS |
| 33 | FBS-RF07 — Confirmación explícita | Flujo detallado (resumen + botones + espera). El principio (I-C5) ya está en CONST. | FBS |
| 34 | FBS-RF08 — Ambigüedad geográfica | Flujo detallado de resolución. La capacidad "resolver ambigüedad" es CONST. | FBS |
| 35 | SB-08 — 5 escenarios de degradación | Los escenarios específicos (provider failover, templates, etc.) son SPEC. El principio de degradación graceful es CONST. | FBS o ARCH |
| 36 | SB-05 — Modelo de 6 slots | El concepto "AITOS opera sobre slots" es CONST. Los 6 slots con definiciones son SPEC. | FBS |

### ARCHITECTURE (1 elemento — queda en ADR o ARCH)

| # | Elemento | Motivo | Destino |
|---|----------|--------|---------|
| 37 | SB-07 — Pipeline 7 pasos | El pipeline conceptual es una referencia arquitectónica valiosa. La Constitución debe definir el flujo fundamental pero los 7 pasos detallados pertenecen a la documentación arquitectónica. | ARCH (system-map, pipeline docs) |

### AJUSTE OBLIGATORIO 1

Reclasificar estos 10 elementos de ABSORB (según la matriz) a SPECIFICATION o ARCHITECTURE. Actualizar la matriz antes de Phase 4.

---

## Gate 2 — FBS Boundary

**Veredicto: Correcto con ajuste.**

La FBS debe continuar siendo la especificación funcional detallada. Contiene:
- ✅ Comportamientos observables (12 intents, 6 slots, pipelines)
- ✅ Escenarios y casos de uso (§21-25)
- ✅ Reglas funcionales detalladas (tarifas, despacho, confirmación)
- ✅ Flujos conversacionales (§6-19)

| Riesgo | Acción |
|--------|--------|
| La FBS se autodenomina "Fuente de Verdad funcional" | Cambiar header para declarar subordinación a CONST (ya planificado en Deprecation Plan §8.4) |
| 10 RFs de FBS vs 19 RFs de CONST (conjuntos diferentes) | Los RFs de CONST son capacidades; los RFs de FBS deben alinearse como especificación detallada de esas capacidades |
| Principios P1-P10 no existen en CONST | Los principios P1,P3,P4,P5,P6,P7,P8,P10 deben incorporarse a CONST CC (ver Gate 1) |
| Invariantes I-C1..I-C12 en FBS y CONST | Las 8 invariantes no cubiertas en CONST deben incorporarse. Las ya cubiertas deben referenciar CONST |

**Ajuste requerido:** Los principios P y las invariantes I-C deben migrar a CONST. La FBS debe mantener solo especificación detallada.

---

## Gate 3 — CDA Boundary

**Veredicto: Correcto con ajuste.**

El CDA debe conservar:
- ✅ Algoritmo conversacional detallado (§2, §5, §9)
- ✅ Decisiones técnicas de implementación
- ✅ Implementación del Contrato CON-01

| Riesgo | Acción |
|--------|--------|
| El CDA se autodenomina "Documento normativo" (autoridad autónoma) | Cambiar header para declarar subordinación a CONST como implementación de CON-01 |
| CDA define principios constitucionales (§1 principio rector, §3 jerarquía, §4 invariantes) | Los principios e invariantes deben migrar a CONST. CDA debe referenciarlos |

**Ajuste requerido:** El principio rector, la jerarquía de decisión (en su forma de principio), y las invariantes deben migrar a CONST. El CDA debe mantener solo el algoritmo detallado.

---

## Gate 4 — Authority

**Veredicto: Correcto.**

La jerarquía propuesta es:

```
Constitución
    ↓
Contracts / Governance
    ↓
Specifications (FBS, CDA)
    ↓
Architecture Decisions (ADRs)
    ↓
Architecture Documentation
    ↓
Implementation (código)
    ↓
Certification / QA
    ↓
History / Archive
```

| Condición | Estado |
|-----------|--------|
| La Constitución es la máxima autoridad | ✅ Declarado en CONST §1.3 |
| Ningún derivado reclama autoridad superior | ⚠️ FBS, CDA y SYSTEM_BIBLE lo hacían. Deprecation Plan corrige esto. |
| Los ADRs registran decisiones, no son normativos | ✅ Correcto. ADR-013 necesita ajuste jerárquico (P0-03). |
| La implementación no puede contradecir la CONST | ✅ Declarado en CONST §1.1 |

**Sin ajustes.** La autoridad está correctamente definida. Los ajustes documentales para subordinar FBS, CDA y SYSTEM_BIBLE ya están en el Deprecation Plan.

---

## Gate 5 — RF Classification

**Veredicto: Requiere ajuste.**

La separación conceptual actual es:

```
NIVEL 1 — Capacidades fundamentales (CONST)
    AITOS deberá [clasificar, extraer, resolver, cotizar, ejecutar, 
    reservar, escalar, gestionar contexto, gestionar incertidumbre, 
    construir soluciones, reconocer dominio, coordinar actores...]

NIVEL 2 — Comportamiento funcional observable (FBS)
    Las intenciones son: GREETING, BOOKING, NOW, CONSULTA, ...
    Los slots son: origin, destination, passengers, scheduled_at, flight, price
    La jerarquía tarifaria es: Lugar→Lugar > Lugar→Zona > Zona→Zona > 0
    El despacho escala: 1h → 30min → 8min → 3min → humano

NIVEL 3 — Diseño e implementación (CDA + ARQUITECTURA + CÓDIGO)
    Pipeline de 11 pasos (CDA)
    Pseudocódigo de merge (CDA)
    Árbol de decisión completo (CDA)
    Diagramas de secuencia (ARQUITECTURA)
```

| Problema | Estado |
|----------|--------|
| CONST RF-05 (Clasificación del conocimiento) es confuso | CONST RF-05 dice "clasificar información como confirmada/inferida/pendiente". Esto es un INV (I-C11), no un RF. Debe moverse a INV. |
| CONST no tiene la capacidad "clasificar intención" como RF explícito | La capacidad fundamental de clasificar intención debe estar en CONST RF. |
| CONST no tiene la capacidad "cotizar" como RF explícito | Debe estar en CONST RF. |
| CONST no tiene la capacidad "despachar" como RF explícito | Debe estar en CONST RF. |

### AJUSTE OBLIGATORIO 2

Revisar los 19 RFs actuales de CONST para asegurar que las capacidades fundamentales del producto estén cubiertas. Agregar como mínimo:
- Clasificación de intención
- Extracción de slots
- Cotización de tarifas
- Despacho de servicios
- Resolución geográfica

Estas capacidades existen en FBS como RF-02, RF-03, RF-05, RF-06, RF-04 respectivamente. No se trata de copiar el detalle, sino de reflejar la capacidad en CONST.

---

## Gate 6 — SYSTEM_BIBLE

**Veredicto: Dividir y degradar.**

| Opción | Decisión |
|--------|----------|
| ¿Debe convertirse en documento histórico? | **Parcialmente.** §6 (autoridad) y §4 (promesa) son históricos. |
| ¿Debe convertirse en onboarding? | **Sí.** §§1,2,9,10,11 tienen valor de onboarding contextual. |
| ¿Debe dividirse? | **Sí.** §3, §5, §7, §8 deben migrar a CONST o SPEC. El resto debe convertirse en un documento de onboarding no normativo. |

**Recomendación final:**
1. Migrar §3 (identidad), §5 (slots como concepto), §7 (pipeline como principio), §8 (principio de degradación) a CONST
2. Migrar §5 (slots detalle), §8 (escenarios específicos) a SPEC
3. Eliminar §6 (contradice CONST) y §4 (duplicado)
4. Convertir §1, §2, §9, §10, §11 en un documento de onboarding llamado "AITOS Overview"
5. Archivar en `docs/history/` o mantener en raíz con nuevo rol

---

## Riesgos críticos

| ID | Riesgo | Severidad | Mitigación |
|----|--------|-----------|------------|
| R-01 | Los principios P1-P10 no están en CONST. Si no se absorben, CONST carece de los principios conversacionales fundamentales del producto. | ALTA | Absorber P1,P3,P4,P5,P6,P7,P8,P10 en CONST CC (Gate 1, items 10-17) |
| R-02 | Las invariantes I-C2..I-C12 (8 faltantes) no están en CONST. Si no se absorben, bugs conocidos no tienen cobertura normativa. | ALTA | Absorber I-C2,I-C4,I-C5,I-C6,I-C7,I-C8,I-C11,I-C12 en CONST INV (Gate 1, items 1-5) |
| R-03 | CONST RF-05 (Clasificación del conocimiento) es un invariante disfrazado de RF. Su posición actual es incorrecta. | MEDIA | Mover de RF a INV en la próxima actualización de CONST |
| R-04 | Las capacidades fundamentales (clasificar, cotizar, despachar) no están explícitas como RFs en CONST. | MEDIA | Agregar RFs de capacidad a CONST, dejando el detalle en FBS |
| R-05 | ADR-013 mantiene una jerarquía que ignora la CONST. Sin actualizarlo, existe ambigüedad de autoridad. | ALTA | Actualizar ADR-013 como parte de P0-03 |

---

## Ajustes obligatorios (3) antes de Phase 4

| # | Ajuste | Documentos | Esfuerzo |
|---|--------|------------|----------|
| **A-01** | **Reclasificar 10 elementos ABSORB a SPECIFICATION/ARCHITECTURE** en la matriz de absorción (Gate 1, items 28-37). Actualizar DOCUMENT_ABSORPTION_MATRIX.md. | DOCUMENT_ABSORPTION_MATRIX.md | 30 min |
| **A-02** | **Revisar CONST RF-05** — no es un Requerimiento Funcional, es un Invariante (I-C11). Mover a INV o eliminar y reemplazar por las capacidades fundamentales faltantes (clasificar, extraer, cotizar, despachar, resolver). | AITOS_CONSTITUTION.md | 1 h |
| **A-03** | **Agregar capacidades fundamentales a CONST §3** como RFs de nivel 1. No copiar detalle de FBS. Ejemplo: "RF-XX — Clasificación de intención: AITOS deberá clasificar la intención del cliente en cada mensaje." El detalle (12 intents) queda en FBS. | AITOS_CONSTITUTION.md | 1 h |

---

## Decisión final

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║          ✅  APPROVED WITH MINOR ADJUSTMENTS                      ║
║                                                                   ║
║  La arquitectura documental es fundamentalmente correcta.         ║
║  La Constitución es la autoridad normativa máxima.               ║
║  Los límites entre niveles documentales son válidos.             ║
║                                                                   ║
║  Se requieren 3 ajustes obligatorios (A-01, A-02, A-03)          ║
║  antes de iniciar CGP-1 Phase 4.                                 ║
║                                                                   ║
║  Una vez ejecutados, Phase 4 puede comenzar sin restricciones.   ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
```

### Resumen de acciones para Phase 4

| Acción | Prioridad | Documento |
|--------|-----------|-----------|
| Reclasificar 10 elementos ABSORB → SPEC/ARCH | Pre-Phase 4 | DOCUMENT_ABSORPTION_MATRIX.md |
| Corregir CONST RF-05 (es INV, no RF) | Pre-Phase 4 | AITOS_CONSTITUTION.md |
| Agregar 5 RFs de capacidad a CONST | Pre-Phase 4 | AITOS_CONSTITUTION.md |
| Migrar 27 elementos a CONST | Phase 4 | AITOS_CONSTITUTION.md |
| Restructurar FBS, CDA, SYSTEM_BIBLE | Phase 4 | 3 documentos |
| Archivar PR series, milestones, certification | Phase 4 | ~70 archivos |
| Actualizar ADR-013 jerarquía | Phase 4 | ADR-013 |

**El CGP-1 Architectural Gate está abierto. Phase 4 puede proceder.**
