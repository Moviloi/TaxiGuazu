# PATTERN_EXTRACTION — Environment Boundary Pattern

Generado por: **Learning**
Fase del pipeline: `LEARNING`

---

## Patrones detectados

### Patrones de éxito

#### Patrón 1: Environment Boundary Pattern (completo)
- **Evidencia:** 2 pipelines ARNÉS de hardening de secretos
- **Frecuencia:** 2 veces en 2 pipelines
- **Impacto:** Secretos completamente separados del repositorio
- **Recomendación:** Mantener 3 capas:
  1. `.env.example` (sin valores) — versionado, documentado
  2. `.env` (con valores) — local, gitignored, nunca versionado
  3. Dashboard Vercel (producción) — configurado manualmente
- **Regla:** Los secretos nunca pertenecen al Product System ni al Control Plane versionado.

#### Patrón 2: Pre-commit Security Gate
- **Evidencia:** `precommit-security-check.mjs` escanea staged files + source + docs
- **Frecuencia:** 2 veces en 2 pipelines
- **Impacto:** Previene que secretos entren al repo
- **Recomendación:** Ejecutar `npm run security-check` antes de cada commit. Futuro: git hook automático.

#### Patrón 3: Historical Secret Audit
- **Evidencia:** `git log --diff-filter=A -- "*.env*"` reveló OIDC tokens en commits antiguos
- **Frecuencia:** 1 vez en 1 pipeline
- **Impacto:** Identificó OIDC tokens en historial (expiran automáticamente)
- **Recomendación:** Siempre auditar historial git antes de declarar "limpio". Los .gitignore actuales no borran el pasado.

### Patrones de fallo

#### Patrón 1: Hardcoded Fallback Pattern
- **Evidencia:** `route.ts:68` tenía `"redcolaborativa-bot-2025"` como fallback
- **Frecuencia:** 1 vez en 1 pipeline
- **Impacto:** Token real visible en código fuente
- **Recomendación:** Nunca usar fallbacks con valores reales. Retornar error si falta configuración crítica.

#### Patrón 2: Secret Documentation Anti-pattern
- **Evidencia:** `SECRET_MIGRATION.md` incluyó API key real en documentación
- **Frecuencia:** 1 vez en 1 pipeline
- **Impacto:** Security check detectó el patrón en docs
- **Recomendación:** Nunca incluir valores reales en documentación, ni siquiera como ejemplo. Usar `[REDACTED]` o `[VER SECRET_AUDIT.md]`.

### Patrones de eficiencia

#### Patrón 1: Staged Files Scanning
- **Evidencia:** Precommit escanea archivos staged para commit
- **Frecuencia:** 1 vez en 1 pipeline
- **Impacto:** Detecta secretos antes de que entren al repo
- **Recomendación:** Siempre escanear staged files, no solo source code.

## Métricas acumuladas

| Métrica | Valor |
|---------|-------|
| Pipelines ejecutados | 3 |
| Tasa de éxito | 100% |
| Secretos eliminados de código | 1 (hardcoded fallback) |
| Secretos detectados en historial | 1 (OIDC tokens, expiran automáticamente) |
| Archivos creados | 5 (.env.example, secrets.md, precommit, SECRET_AUDIT, SECRET_MIGRATION) |

## Mejoras propuestas

### Mejora 1: Git Hook Pre-commit Automático
- **Basado en:** Pre-commit Security Gate
- **Propuesta:** Integrar `precommit-security-check.mjs` como git hook pre-commit
- **Evidencia:** Actualmente requiere ejecución manual
- **Violación de contratos:** NO

### Mejora 2: Secret Rotation Policy
- **Basado en:** Historical Secret Audit
- **Propuesta:** Documentar política de rotación de secretos (90 días)
- **Evidencia:** No hay política actual, secretos en historial no rotados
- **Violación de contratos:** NO

### Mejora 3: Git History Cleaning
- **Basado en:** Historical Secret Audit
- **Propuesta:** Usar BFG Repo Cleaner para limpiar historial
- **Evidencia:** OIDC tokens visibles en commits antiguos (expiran automáticamente)
- **Violación de contratos:** NO (requiere aprobación)

## Next Steps

#### Patrón 4: LLM Mocking Pattern
- **Evidencia:** Test `comprehension-runner.test.ts` fallaba porque P3 agregó un LLM re-prompt antes de escalación, y el test no mockeaba el LLM provider.
- **Frecuencia:** 1 vez en 1 pipeline (2026-07-03)
- **Impacto:** Tests ahora cubren ambos branches del LLM re-prompt (fallo → escalación, éxito → re-prompt) sin depender de una API externa.
- **Recomendación:** Siempre que se agregue una llamada a LLM en medio de un pipeline de decisión, mockear el LLM provider en los tests y crear tests separados para cada branch (LLM retorna NULL vs LLM retorna mensaje). Usar `vi.mock("@/lib/ai/llm-provider")` con `mockResolvedValue` para controlar la respuesta.
- **Regla:** Los tests nunca deben depender del LLM real. Siempre mockear `getLLMProvider` para evitar no-determinismo y dependencia de red.

- [ ] Verificar OIDC tokens de Vercel (expiran automáticamente)
- [ ] Integrar precommit como git hook
- [ ] Documentar política de rotación de secretos
- [ ] Evaluar limpieza de historial git con BFG
