# AITOS Baseline 1.0

> **Tipo:** Línea base oficial del proyecto  
> **Fecha:** 2026-07-21  
> **Autor:** BUILD / AEL  
> **Estado:** BASELINE ACTIVE  
> **Arquitectura:** Freeze V4  
> **Gobernanza:** Constitutional Governance Enabled  

---

## 1. Baseline Identifier

| Campo | Valor |
|-------|-------|
| **Identificador** | `AITOS Baseline 1.0` |
| **Versión** | 1.0 |
| **Fecha de declaración** | 2026-07-21 |
| **Régimen** | Architecture Freeze V4 + Constitutional Governance |
| **Documento fundacional** | `AITOS_CONSTITUTION.md` v2.0 |

---

## 2. Estado del proyecto

### 2.1 Campañas de gobierno constitucional

| Campaña | Estado | Documento de cierre |
|---------|--------|---------------------|
| **CGP-1** — Establecimiento constitucional | ✅ **CERTIFIED** | `docs/audit/CGP1_CERTIFICATION.md` |
| **CGP-2** — Alineación del ecosistema | ✅ **CERTIFIED** | `docs/audit/CGP2_CERTIFICATION.md` |
| **CGP-3** — Cumplimiento constitucional | ✅ **CONSTITUTIONALLY CERTIFIED WITH OBSERVATIONS** | `docs/audit/CGP3_CERTIFICATION.md` |
| **CGP-4** — Trazabilidad constitucional | ✅ **COMPLETE** | `docs/audit/CONSTITUTIONAL_TRACEABILITY_MATRIX.md` |

### 2.2 Métricas consolidadas

| Métrica | Valor |
|---------|-------|
| Disposiciones constitucionales | 118 |
| Cobertura de auditoría | 100% de disposiciones auditables |
| PASS | 106 (92.2%) |
| PARTIAL | 7 (6.1%) |
| FAIL | 0 (0%) |
| Componentes auditados | 25 (P0: 9, P1: 5, P2: 5, DB: 3, Config: 3) |
| ADRs activos | 14 |
| Documentos inventariados | 265 |
| Documentos alineados | 179 analizados, 21 contradicciones resueltas |
| Contradicciones abiertas | 0 |

---

## 3. Activos congelados

Los siguientes activos quedan oficialmente congelados en su estado actual. Toda modificación futura deberá seguir las reglas de evolución definidas en la sección 4.

### 3.1 Constitución

| Activo | Ruta | Versión |
|--------|------|---------|
| Constitución del Sistema | `docs/architecture/AITOS_CONSTITUTION.md` | v2.0 |
| Matriz de cumplimiento constitucional | `docs/audit/CONSTITUTIONAL_COMPLIANCE_MATRIX.md` | 2026-07-21 |
| Reporte de auditoría constitucional | `docs/audit/CONSTITUTIONAL_AUDIT_REPORT.md` | 2026-07-21 |
| Certificación CGP-3 | `docs/audit/CGP3_CERTIFICATION.md` | CONSTITUTIONALLY CERTIFIED WITH OBSERVATIONS |

### 3.2 Arquitectura

| Activo | Ruta |
|--------|------|
| ADRs activos (14) | `docs/architecture/adr/ADR-*.md` |
| Decisiones arquitectónicas indexadas | `docs/architecture/adr/ADR_INDEX.md` |
| Contratos entre capas | `ael/constitution/CONTRACTS.md` |
| Principios arquitectónicos | `ael/constitution/SPEC.md` |

### 3.3 Gobernanza

| Activo | Ruta |
|--------|------|
| Organización y roles | `ael/government/ORGANIZATION.md` |
| Contratos de roles | `ael/government/roles/*.md` |
| Reglas de enforcement | `ael/contracts/enforce.sh` |
| Professional Engineering Doctrine | incorporada en ORGANIZATION.md |

### 3.4 Ecosistema de desarrollo

| Activo | Ruta |
|--------|------|
| Prompts de agentes (BUILD, PLAN, subagentes) | `.opencode/` |
| Workflows y habilidades | `.agents/` |
| Herramientas de certificación | `ael/contracts/` |

### 3.5 Traceability Matrix

| Activo | Ruta |
|--------|------|
| Constitutional Traceability Matrix (CTM) | `docs/audit/CONSTITUTIONAL_TRACEABILITY_MATRIX.md` |

### 3.6 Certificaciones

| Activo | Ruta | Estado |
|--------|------|--------|
| Certificación CGP-1 | `docs/audit/CGP1_CERTIFICATION.md` | CERTIFIED |
| Certificación CGP-2 | `docs/audit/CGP2_CERTIFICATION.md` | CERTIFIED |
| Certificación CGP-3 | `docs/audit/CGP3_CERTIFICATION.md` | CONSTITUTIONALLY CERTIFIED WITH OBSERVATIONS |

---

## 4. Reglas de evolución

Toda modificación futura al proyecto **post-Baseline 1.0** deberá seguir el siguiente ciclo obligatorio:

### Ciclo de cambio gobernado

```
Paso 1 ─ Analizar impacto mediante la CTM
  │         └─ Consultar CONSTITUTIONAL_TRACEABILITY_MATRIX.md
  │         └─ Identificar disposiciones afectadas
  │         └─ Identificar componentes, documentos y tests impactados
  │
Paso 2 ─ Actualizar la documentación afectada
  │         └─ Constitución (si aplica)
  │         └─ ADRs (si aplica)
  │         └─ Contratos, especificaciones, diagramas
  │
Paso 3 ─ Implementar el cambio
  │         └─ Código, configuración, infraestructura
  │
Paso 4 ─ Ejecutar las certificaciones correspondientes
  │         └─ `bash ael/contracts/enforce.sh`
  │         └─ `npm test`
  │         └─ `npm run build`
  │         └─ Auditoría constitucional si el cambio afecta disposiciones
  │
Paso 5 ─ Actualizar nuevamente la CTM
            └─ Reflejar el nuevo estado de trazabilidad
            └─ Actualizar CONSTITUTIONAL_TRACEABILITY_MATRIX.md
```

### Principios de evolución

1. **La CTM es el punto de partida obligatorio** — ningún cambio puede iniciarse sin consultar la matriz de trazabilidad.
2. **Trazabilidad bidireccional** — toda modificación debe poder rastrearse desde la disposición constitucional hasta el componente y viceversa.
3. **Certificación continua** — no se considera un cambio completo hasta que las certificaciones asociadas se hayan ejecutado y aprobado.
4. **Congelamiento de baseline** — mientras la baseline está activa, no se pueden modificar los activos congelados sin pasar por el ciclo completo.

---

## 5. Condiciones para romper la Baseline

La baseline **AITOS Baseline 1.0** se considera activa y vinculante. Solo podrá romperse bajo las siguientes condiciones:

### 5.1 Cambio constitucional

- Modificación de una o más disposiciones de `AITOS_CONSTITUTION.md`.
- Requiere nueva campaña CGP (CGP-5 o superior).
- La nueva baseline deberá reflejar el estado post-cambio.

### 5.2 Cambio arquitectónico mayor

- Modificación que afecte ADR-000 (visión arquitectónica general).
- Modificación que afecte ADR-001, ADR-002, ADR-003 o ADR-004 (contratos entre capas).
- Introducción de una nueva capa arquitectónica.
- Cambio en el patrón de comunicación entre capas.

### 5.3 Nueva versión principal

- Release de AITOS v2.0 o superior.
- Cambio de la interfaz pública del sistema.
- Migración a un nuevo framework o plataforma fundamental.

### 5.4 Procedimiento de ruptura

Cuando se cumpla alguna de las condiciones anteriores:

1. Declarar **BASELINE SUSPENDED** en este documento.
2. Ejecutar el cambio siguiendo el ciclo de evolución (sección 4).
3. Actualizar todos los activos afectados.
4. Emitir **AITOS Baseline X.Y** (nueva versión).
5. Declarar **BASELINE ACTIVE** en el nuevo documento.

---

## 6. Estado

| Dimensión | Estado |
|-----------|--------|
| **Baseline** | 🟢 **BASELINE ACTIVE** |
| **Arquitectura** | ❄️ **Freeze V4** — No se permiten cambios arquitectónicos sin pasar por el ciclo de evolución |
| **Gobernanza constitucional** | ✅ **Constitutional Governance Enabled** — Todas las disposiciones auditadas y trazadas |
| **CGP-3 Observations** | 📋 **7 PARTIAL, 1 INCONCLUSIVE** — Documentados en CGP3_CERTIFICATION.md, no bloquean la baseline |

### 6.1 Observaciones registradas (post-baseline)

Las 7 observaciones PARTIAL y 1 INCONCLUSIVE de CGP-3 quedan registradas como **deuda técnica gobernada**. No impiden la declaración de la baseline, pero deberán abordarse en futuras misiones siguiendo el ciclo de evolución:

| ID | Disposición | Severidad |
|----|-------------|-----------|
| RNF-A04 | No aplica (descontinuado) | N/A |
| RNF-A06 | Observabilidad — no auditado | INC |
| Varias | 7 disposiciones con cumplimiento parcial | PARTIAL |

---

## 7. Firmas

| Rol | Entidad | Fecha |
|-----|---------|-------|
| **Ejecutor operacional** | BUILD / AEL | 2026-07-21 |
| **Gobernanza constitucional** | AITOS Constitution v2.0 | 2026-07-21 |

---

*Este documento constituye la declaración oficial de la primera línea base gobernada del proyecto. A partir de esta fecha, toda modificación queda sujeta a las reglas de evolución aquí establecidas.*
