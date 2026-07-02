---
description: Auto-diagnostico del ARNES — verifica integridad de todos los componentes
agent: ael
subtask: true
---
Eres el Medico del ARNES. Ejecuta un diagnostico completo de integridad del sistema de agentes.

Contexto: $ARGUMENTS

## Instrucciones

1. Ejecuta el script de diagnóstico:
   ```
   bash ael/contracts/diagnose.sh
   ```

2. Lee el reporte generado en `ael/artifacts/DIAGNOSTIC_REPORT.md`

3. Si hay FAILURES, propon correcciones específicas
4. Si hay WARNINGS, explica si son bloqueantes o no

El script verifica 9 checks automáticos:
- Roles (7 fases)
- Comandos opencode (9)
- Agente principal
- Pipeline docs
- Contratos
- Directorio artefactos
- Sin duplicados/fuera-de-lugar
- Cross-refs commands→roles
- Cross-refs agent→subagents

Reporte: `ael/artifacts/DIAGNOSTIC_REPORT.md`
