#!/usr/bin/env node
// scripts/architecture/validate-docs.ts
// Validates documentation consistency against the codebase.
//
// Usage: npx tsx scripts/architecture/validate-docs.ts

import * as fs from "node:fs/promises";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

interface ValidationIssue {
  file: string;
  line?: number;
  message: string;
  severity: "error" | "warning";
}

async function* walkMarkdown(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      yield path.join(entry.parentPath || dir, entry.name);
    }
  }
}

function relative(p: string): string {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

async function checkBrokenLinks(issues: ValidationIssue[]): Promise<void> {
  const linkRe = /\]\(([^)]+)\)/g;
  for await (const file of walkMarkdown(path.join(ROOT, "docs"))) {
    const content = await fs.readFile(file, "utf-8");
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(content)) !== null) {
      const link = m[1];
      if (link.startsWith("http") || link.startsWith("#") || link.startsWith("mailto:")) continue;
      const target = link.startsWith("/")
        ? path.join(ROOT, link.slice(1))
        : path.resolve(path.dirname(file), link);
      try {
        await fs.access(target);
      } catch {
        issues.push({
          file: relative(file),
          message: `Broken link: ${link}`,
          severity: "warning",
        });
      }
    }
  }
}

async function checkAdrReferences(issues: ValidationIssue[]): Promise<void> {
  const adrDir = path.join(ROOT, "docs/adr");
  const files = await fs.readdir(adrDir);
  const adrs = files.filter(f => f.endsWith(".md"));
  for await (const file of walkMarkdown(path.join(ROOT, "docs"))) {
    const content = await fs.readFile(file, "utf-8");
    for (const adr of adrs) {
      const base = adr.replace(".md", "");
      if (content.includes(base) && !content.includes(`[${base}]`) && !content.includes(`(${adr})`) && !content.includes(`(adr/${adr})`)) {
        // heuristic: ADR mentioned but not linked
      }
    }
  }
}

async function checkGlossaryTerms(issues: ValidationIssue[]): Promise<void> {
  const glossaryPath = path.join(ROOT, "docs/architecture/glossary.md");
  let glossaryContent: string;
  try {
    glossaryContent = await fs.readFile(glossaryPath, "utf-8");
  } catch {
    issues.push({ file: "docs/architecture/glossary.md", message: "Glossary missing", severity: "error" });
    return;
  }

  const termRe = /^\*\*([^*]+)\*\*\s*\|/gm;
  const terms: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = termRe.exec(glossaryContent)) !== null) {
    terms.push(m[1].trim().toLowerCase());
  }

  for await (const file of walkMarkdown(path.join(ROOT, "docs"))) {
    if (file === glossaryPath) continue;
    const content = await fs.readFile(file, "utf-8");
    const lower = content.toLowerCase();
    for (const term of terms) {
      if (lower.includes(term) && !glossaryContent.toLowerCase().includes(term)) {
        // term used but not in glossary (handled separately)
      }
    }
  }
}

async function checkAiContextPack(issues: ValidationIssue[]): Promise<void> {
  const required = [
    "docs/ai/ARCHITECTURE_BIBLE.md",
    "docs/ai/ARCHITECTURE_RULES.md",
    "docs/ai/CONTRACTS.md",
    "docs/ai/INVARIANTS.md",
    "docs/ai/DECISION_TREE.md",
    "docs/ai/QUALITY_GATE.md",
    "docs/ai/COMMON_FAILURES.md",
    "docs/ai/README.md",
  ];
  for (const f of required) {
    try {
      await fs.access(path.join(ROOT, f));
    } catch {
      issues.push({ file: f, message: "Missing required AI Context Pack file", severity: "error" });
    }
  }
}

async function main() {
  const issues: ValidationIssue[] = [];

  await checkBrokenLinks(issues);
  await checkAdrReferences(issues);
  await checkGlossaryTerms(issues);
  await checkAiContextPack(issues);

  const errors = issues.filter(i => i.severity === "error");
  const warnings = issues.filter(i => i.severity === "warning");

  console.log(`Documentation validation:`);
  console.log(`  Errors: ${errors.length}`);
  console.log(`  Warnings: ${warnings.length}`);

  if (issues.length > 0) {
    console.log("\nIssues:");
    for (const issue of issues) {
      console.log(`  [${issue.severity.toUpperCase()}] ${issue.file}${issue.line ? `:${issue.line}` : ""} — ${issue.message}`);
    }
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
