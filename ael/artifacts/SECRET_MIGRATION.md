# SECRET_MIGRATION — Plan de migración de secretos

Generado por: **ARNÉS Pipeline**
Fecha: 2026-06-27

---

## Estado actual

- `.env` con valores reales en disco — NO trackeado por git
- `.env.example` completo — versionado
- Secretos en historial git — solo OIDC tokens (expiran automáticamente)
- Precommit security check — activo

## Plan de migración

### Fase 1: OIDC Tokens en historial (SIN ACCIÓN REQUERIDA)

Los OIDC tokens de Vercel en commits `91b8198` y `78113a8^` expiran automáticamente en 1 hora. No requieren rotación manual.

### Fase 2: Limpieza de historial (OPCIONAL, requiere aprobación)

#### Opción A: BFG Repo Cleaner (recomendado)

```bash
# 1. Clonar repo sin historia
git clone --mirror https://github.com/user/repo.git

# 2. Ejecutar BFG
bfg --replace-text secrets.txt repo.git

# 3. Push
cd repo.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push
```

#### Opción B: git filter-branch (nativo)

```bash
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env.vercel .env.vercel.prod' \
  --prune-empty --tag-name-filter cat -- --all
```

**Advertencia:** Ambas opciones reescriben el historial. Requiere que todos los colaboradores re-clonen el repo.

### Fase 3: Precommit automatizado (COMPLETADA)

- `scripts/precommit-security-check.mjs` — escanea staged files + source code
- `package.json` — script `security-check` agregado
- `.gitignore` — protección completa

### Fase 4: Documentación (COMPLETADA)

- `docs/security/secrets.md` — guía de secretos
- `ael/artifacts/SECRET_AUDIT.md` — auditoría completa
- `ael/artifacts/SECRET_MIGRATION.md` — este archivo

## Checklist de migración

- [ ] Verificar OIDC tokens de Vercel (expiran automáticamente)
- [ ] Ejecutar `npm run security-check` antes de cada commit
- [ ] Actualizar Vercel dashboard con secretos si es necesario

## Compatible con

- ✅ Vercel (dashboard variables)
- ✅ OpenCode (commit/push automático)
- ✅ Local development (.env)
- ✅ CI/CD (futuro)
