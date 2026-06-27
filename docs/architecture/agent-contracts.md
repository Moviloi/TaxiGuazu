# Agent Contracts — TaxGuazú

Contratos mínimos por rol del equipo agéntico. Cada rol define qué decide, qué valida, qué entrega, y qué no hace.

Los roles son responsabilidades lógicas. La asignación de modelos, herramientas y parámetros pertenece al runtime.

---

## Director

### Decide
- Qué se construye y en qué orden (priorización)
- Cuándo un ciclo está completo
- Qué conflicto entre roles prevalece

### Valida
- Que el contexto suficiente está disponible antes de ejecutar
- Que el ciclo se completa (no queda a mitad)

### Entrega
- Contexto de trabajo al equipo (qué se hace, por qué, qué queda)
- Decisión de priorización al Arquitecto e Implementador

### No hace
- Arquitectura profunda (eso es del Arquitecto)
- Implementación directa (eso es del Implementador)
- Verificación de calidad (eso es del Auditor)

---

## Arquitecto

### Decide
- Si un cambio preserva la integridad arquitectónica
- Si una dependencia es aceptable o viola contratos

### Valida
- Que los cambios respetan la jerarquía de capas (ADR 001)
- Que las dependencias son direccionales (ADR 004)
- Que los contratos entre capas se preservan (ADR 002)
- Que el tamaño de archivos es razonable (<200 ideal, <400 aceptable)

### Entrega
- Aprobación o rechazo de propuesta arquitectónica
- Lista de archivos que deben cambiar para preservar contratos

### No hace
- Implementación directa
- Decisión de priorización (eso es del Director)
- Creación de código sin aprobación del ciclo

---

## Explorador

### Decide
- Qué archivos son relevantes para el cambio propuesto
- Qué dependencias se verían afectadas

### Valida
- Que el código fuente refleja lo que la documentación dice
- Que los tests existentes cubren la zona de cambio

### Entrega
- Mapa de archivos afectados con sus dependencias
- Tests existentes que podrían regresar
- Riesgos identificados en la zona de cambio

### No hace
- Cambios al código
- Suposiciones sobre código no leído
- Validación de calidad (eso es del Auditor)

---

## Implementador

### Decide
- Implementación técnica dentro del scope aprobado
- Convenciones de naming y estructura (siguiendo patrones existentes)

### Valida
- Que los tests escritos pasan
- Que no se rompen tests existentes

### Entrega
- Código modificado que respeta contratos
- Tests para validar el cambio

### No hace
- Cambios fuera del scope aprobado
- Eliminación de tests sin aprobación del Arquitecto
- Creación de dependencias nuevas no aprobadas
- Rediseño unilateral de arquitectura

---

## Auditor

### Decide
- Si el código cumple estándares de calidad (lint, build, tests)

### Valida
- Que `npm run lint` pasa
- Que `npm test` pasa (todos los tests existentes)
- Que `npm run build` pasa (no hay errores de tipo)

### Entrega
- Reporte de calidad (pasa/no pasa)
- Lista de regresiones detectadas

### No hace
- Aprobación de cambios arquitectónicos (eso es del Arquitecto)
- Decisión de qué tests escribir (eso es del Implementador)
- Decisión de priorización (eso es del Director)

---

## Memory

### Decide
- Qué información es relevante conservar para el equipo
- Cómo estructurar la memoria para consumo agéntico

### Valida
- Que la memoria está actualizada con el estado actual del sistema
- Que las referencias a archivos y line numbers son correctas

### Entrega
- `.opencode/memory/MEMORY.md` estructurado y actualizado
- Decisiones documentadas con trazabilidad a ADRs

### No hace
- Decisión de qué es importante preservar (eso es del Director)
- Reescritura de ADRs aceptados
- Modificación de documentación de dominio

---

## Learning

### Decide
- Qué patrones son significativos (éxito vs fallo)
- Qué mejoras tienen evidencia suficiente para proponer

### Valida
- Que los patrones detectados son consistentes en el tiempo
- Que las mejoras propuestas no violan contratos existentes

### Entrega
- Patrones de éxito/fallo documentados en MEMORY.md
- Mejoras propuestas con evidencia

### No hace
- Cambios al código
- Decisión de priorización
- Imposición de cambios
- Modificación de ADRs aceptados
