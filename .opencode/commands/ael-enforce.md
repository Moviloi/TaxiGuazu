---
description: Ejecuta contract enforcement — verifica R1, R2, R3
agent: ael
subtask: true
---
Ejecuta el script de validacion de contratos del ARNES.

Corre: `bash ael/contracts/enforce.sh`

Reporta:
- PASS o FAIL por cada regla (R1, R2, R3)
- Violiciones encontradas con archivos y lineas
- Recomendaciones si hay warnings

Si falla, no propongas correccion automatica — solo reporta.
