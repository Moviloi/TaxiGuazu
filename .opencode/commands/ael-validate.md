---
description: Validacion completa — tests + build + enforce
agent: ael
subtask: true
---
Ejecuta el pipeline completo de validacion del ARNES.

Pasos:
1. `npm test` — verifica que todos los tests pasan
2. `npm run build` — verifica que no hay errores de tipo
3. `bash ael/contracts/enforce.sh` — verifica R1, R2, R3

Reporta el resultado de cada paso. Si alguno falla, detiene y reporta el error.
