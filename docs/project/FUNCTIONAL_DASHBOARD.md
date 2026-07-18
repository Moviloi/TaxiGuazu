# FUNCTIONAL DASHBOARD — AITOS

> Dashboard de avance funcional del proyecto.
>
> **Regla:** Este documento solo contiene indicadores funcionales observables.
> No incluye métricas metodológicas (ADRs, documentos, certificaciones creadas).

---

## 1. Defectos funcionales

| Métrica | Valor | Tendencia |
|---------|-------|-----------|
| **OPEN** | 1 | N/A |
| **CLOSED** | 0 | N/A |
| **Total detectados** | 1 | N/A |

| ID | Descripción | Campaña origen | Estado | Tendencia |
|----|-------------|----------------|--------|-----------|
| H-CAT2-001 | RECOVERY state pierde slots confirmados y repite preguntas. Viola 9 RF y 8 reglas del CDA. | CAT-2 | `OPEN` | N/A |

---

## 2. Campañas CAT

| Estado | Cantidad | Campañas | Tendencia |
|--------|----------|----------|-----------|
| `NOT_STARTED` | 8 | CAT-3, CAT-4, CAT-5, CAT-6, CAT-7, CAT-8, CAT-9, CAT-10 | N/A |
| `IN_PROGRESS` | 0 | — | N/A |
| `CONDITIONAL` | 2 | CAT-1 (revalidación pendiente), CAT-2 (defecto abierto H-CAT2-001) | N/A |
| `CERTIFIED` | 1 | CATS-1 | N/A |
| `SUPERSEDED` | 0 | — | N/A |

### Desglose por campaña

| Campaña | Estado | Tendencia | Próxima acción requerida |
|---------|--------|-----------|--------------------------|
| CATS-1 | `CERTIFIED` | N/A | — |
| CAT-1 | `CONDITIONAL` | N/A | Implementar QA3-S3-01/02/03/04 → reejecutar |
| CAT-2 | `CONDITIONAL` | N/A | Corregir H-CAT2-001 → reejecutar |
| CAT-3 | `NOT_STARTED` | N/A | Definir y ejecutar |
| CAT-4 | `NOT_STARTED` | N/A | Definir y ejecutar |
| CAT-5 | `NOT_STARTED` | N/A | Definir y ejecutar |
| CAT-6 | `NOT_STARTED` | N/A | Definir y ejecutar |
| CAT-7 | `NOT_STARTED` | N/A | Definir y ejecutar |
| CAT-8 | `NOT_STARTED` | N/A | Definir y ejecutar |
| CAT-9 | `NOT_STARTED` | N/A | Definir y ejecutar |
| CAT-10 | `NOT_STARTED` | N/A | Requiere CAT-1 a CAT-9 certificados primero |

---

## 3. Functional Behavior Specification

| Indicador | Valor | Tendencia |
|-----------|-------|-----------|
| **Estado** | `CONDITIONAL` | N/A |
| **Ambigüedades abiertas** | 2 (A01-DG, A02-DG) | N/A |
| **Desviaciones confirmadas** | 3 (F01-DG, F02-DG, F03-DG) | N/A |

---

## 4. Functional Certification del producto

| Indicador | Valor | Tendencia |
|-----------|-------|-----------|
| **Estado** | ❌ **NO Functional Certified** | N/A |
| **Condiciones pendientes** | 7 de 8 | N/A |
| **Defectos bloqueantes** | 1 (H-CAT2-001) | N/A |

### Checklist de certificación

| Condición | Estado | Tendencia |
|-----------|--------|-----------|
| CAT-1 → CERTIFIED | ❌ | N/A |
| CAT-2 → CERTIFIED | ❌ | N/A |
| CAT-3 → CERTIFIED | ❌ | N/A |
| CAT-4 → CERTIFIED | ❌ | N/A |
| CAT-5 → CERTIFIED | ❌ | N/A |
| CAT-10 → CERTIFIED | ❌ | N/A |
| FBS → CERTIFIED | ❌ | N/A |
| 0 defectos funcionales OPEN | ❌ (1: H-CAT2-001) | N/A |

---

## 5. Último cambio relevante

| Elemento | Detalle |
|----------|---------|
| **Versión del dashboard** | v1 — primera publicación |
| **Cambio** | Creación inicial del dashboard funcional. Todos los indicadores en estado baseline. |
| **Indicador impactado** | Todos (N/A — primera medición) |
| **Próximo objetivo funcional** | Reducir defectos OPEN de 1 → 0. Llevar CAT-2 de `CONDITIONAL` → `CERTIFIED`. |

---

## 6. Próximas acciones

| Prioridad | Acción | Dispara |
|-----------|--------|---------|
| **1** | Implementar corrección de H-CAT2-001 | Cierre del defecto + reejecución CAT-2 |
| **2** | Implementar QA3-S3-01/02/03/04 (F01-DG, F02-DG, F03-DG, UX) | Reejecución CAT-1 |
| **3** | Reejecutar CAT-2 | Verificar cierre H-CAT2-001 |
| **4** | Reejecutar CAT-1 | Verificar correcciones ambigüedad |
| **5** | Definir y ejecutar CAT-3 | Cubrir ambigüedad y resolución geográfica |
| **6** | Definir y ejecutar CAT-4 | Cubrir correcciones y manejo de errores |
| **7** | Definir y ejecutar CAT-5 | Cubrir flujo completo de reserva |

---

## 7. Próxima revalidación pendiente

| Campaña | Disparador |
|---------|-----------|
| **CAT-2** | Inmediatamente después de corregir H-CAT2-001 |
| **CAT-1** | Inmediatamente después de implementar QA3-S3-01/02/03/04 |

---

*Actualizado: 2026-07-18. Próxima actualización: tras cada hito funcional.*
