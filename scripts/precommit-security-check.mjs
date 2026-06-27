#!/usr/bin/env node

/**
 * Security check script — Pre-commit hook
 * 
 * Ejecuta:
 * - Búsqueda de secretos en código fuente
 * - Verificación de archivos trackeados
 * - Escaneo de archivos staged para commit
 * 
 * Uso:
 *   node scripts/precommit-security-check.mjs
 *   npm run security-check
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();
const issues = [];

// Patterns that indicate secrets
const SECRET_PATTERNS = [
  { pattern: /gsk_[a-zA-Z0-9]{20,}/, name: "Groq API Key" },
  { pattern: /EAA[a-zA-Z0-9]{20,}/, name: "WhatsApp Token" },
  { pattern: /eyJ[a-zA-Z0-9_-]{50,}/, name: "JWT Token" },
  { pattern: /sk-[a-zA-Z0-9]{20,}/, name: "OpenAI API Key" },
  { pattern: /AKIA[A-Z0-9]{16}/, name: "AWS Access Key" },
  { pattern: /tg_[a-zA-Z0-9]{20,}/, name: "Admin API Key" },
  { pattern: /AIzaSy[a-zA-Z0-9_-]{33}/, name: "Google API Key" },
  { pattern: /whatsapp:[a-zA-Z0-9]{20,}/, name: "WhatsApp Secret" },
  { pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, name: "Private Key" },
];

// Files/dirs to skip
const SKIP_DIRS = ["node_modules", ".next", "dist", "build", ".git", "legacy-site", "site"];
const SKIP_FILES = [".env", ".env.local", ".env.production", ".env.development.local", ".env.test.local", ".env.production.local"];

function walkDir(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          if (!SKIP_DIRS.includes(entry)) {
            files.push(...walkDir(fullPath));
          }
        } else if (stat.isFile()) {
          files.push(fullPath);
        }
      } catch {}
    }
  } catch {}
  return files;
}

function checkFileForSecrets(filePath) {
  const rel = filePath.replace(ROOT + "\\", "").replace(ROOT + "/", "").replace(ROOT + "/", "");
  if (SKIP_FILES.some(f => rel.endsWith(f))) return;

  const ext = extname(filePath);
  if (![".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".html", ".env.example"].includes(ext)) return;

  try {
    const content = readFileSync(filePath, "utf-8");
    for (const { pattern, name } of SECRET_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        issues.push({
          file: rel,
          secret: name,
          preview: match[0].slice(0, 8) + "..." + match[0].slice(-4),
        });
      }
    }
  } catch {}
}

function checkGitTracking() {
  try {
    const tracked = execSync("git ls-files", { encoding: "utf-8", cwd: ROOT });
    const envFiles = tracked.split("\n").filter(f => /\.env/.test(f) && !f.includes(".env.example"));
    if (envFiles.length > 0) {
      for (const f of envFiles) {
        issues.push({
          file: f,
          secret: "Tracked .env file",
          preview: "FILE IS TRACKED BY GIT",
        });
      }
    }
  } catch {}
}

function checkStagedFiles() {
  try {
    const staged = execSync("git diff --cached --name-only --diff-filter=ACM", { encoding: "utf-8", cwd: ROOT });
    const files = staged.split("\n").filter(f => f.trim());
    
    for (const rel of files) {
      if (SKIP_FILES.some(f => rel.endsWith(f))) continue;
      
      const ext = extname(rel);
      if (![".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".html"].includes(ext)) continue;
      
      const fullPath = join(ROOT, rel);
      if (!existsSync(fullPath)) continue;
      
      try {
        const content = readFileSync(fullPath, "utf-8");
        for (const { pattern, name } of SECRET_PATTERNS) {
          const match = content.match(pattern);
          if (match) {
            issues.push({
              file: rel,
              secret: name + " (STAGED)",
              preview: match[0].slice(0, 8) + "..." + match[0].slice(-4),
            });
          }
        }
      } catch {}
    }
  } catch {}
}

// Main
console.log("🔒 Security Check — Iniciando...\n");

// 1. Scan source files
console.log("📋 Escaneando archivos fuente...");
const srcFiles = walkDir(join(ROOT, "src"));
for (const f of srcFiles) {
  checkFileForSecrets(f);
}

// 2. Scan ael/ and docs/ for hardcoded secrets
console.log("📋 Escaneando documentación...");
for (const dir of ["ael", "docs", "scripts"]) {
  const dirPath = join(ROOT, dir);
  if (existsSync(dirPath)) {
    const files = walkDir(dirPath);
    for (const f of files) {
      checkFileForSecrets(f);
    }
  }
}

// 3. Check .env tracking
console.log("📋 Verificando archivos trackeados...");
checkGitTracking();

// 4. Check staged files (pre-commit)
console.log("📋 Verificando archivos staged...");
checkStagedFiles();

// 5. Check for hardcoded tokens in webhook route
const webhookRoute = join(ROOT, "src", "app", "api", "whatsapp", "webhook", "route.ts");
if (existsSync(webhookRoute)) {
  const content = readFileSync(webhookRoute, "utf-8");
  if (/["']redcolaborativa/.test(content)) {
    issues.push({
      file: "src/app/api/whatsapp/webhook/route.ts",
      secret: "Hardcoded verify token fallback",
      preview: "redcolaborativa-bot-...",
    });
  }
}

// Results
if (issues.length > 0) {
  console.log("\n❌ SECRETOS ENCONTRADOS:\n");
  for (const issue of issues) {
    console.log(`  🚨 ${issue.file}`);
    console.log(`     Tipo: ${issue.secret}`);
    console.log(`     Valor: ${issue.preview}`);
    console.log("");
  }
  console.log(`Total: ${issues.length} problema(s) encontrado(s)`);
  process.exit(1);
} else {
  console.log("✅ No se encontraron secretos en el código fuente.");
  console.log("✅ No hay archivos .env trackeados por git.");
  console.log("✅ No hay secretos en archivos staged.");
  process.exit(0);
}
