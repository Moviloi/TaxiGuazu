#!/usr/bin/env node
// scripts/architecture/generate-graphs.ts
// Genera artefactos de reverse engineering:
// - import graph (módulo a módulo)
// - dependency graph (paquete a paquete)
// - service interaction map
// - circular dependencies
// - orphan files
// - layer violations
//
// Uso: npx tsx scripts/architecture/generate-graphs.ts

import * as fs from "node:fs/promises";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SRC_DIR = path.join(ROOT, "src");
const OUT_DIR = path.join(ROOT, "docs/architecture/reverse-engineering");

interface ImportEdge {
  from: string;
  to: string;
  type: "relative" | "alias" | "external";
  sourceLine: string;
}

interface ModuleNode {
  id: string;
  filePath: string;
  package: string;
  imports: string[];
  importedBy: string[];
}

interface PackageNode {
  id: string;
  files: string[];
  imports: Set<string>;
  importedBy: Set<string>;
}

// ── Helpers ─────────────────────────────────────────────────────────

function relativePath(abs: string): string {
  return path.relative(ROOT, abs).replace(/\\/g, "/");
}

function moduleId(absFile: string): string {
  return relativePath(absFile).replace(/^src\//, "").replace(/\.ts$/, "");
}

function packageOf(moduleId: string): string {
  const parts = moduleId.split("/");
  if (parts[0] === "app") return `app:${parts.slice(0, 3).join("/")}`;
  if (parts[0] === "lib") {
    // group by top-level domain under lib
    if (parts.length >= 2) return `lib:${parts[1]}`;
  }
  if (parts[0] === "config") return "config";
  return parts[0];
}

async function* walkTsFiles(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      yield* walkTsFiles(full);
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      yield full;
    }
  }
}

function parseImports(content: string, fromModule: string): ImportEdge[] {
  const edges: ImportEdge[] = [];
  // import ... from "..."
  const importFromRe = /import\s+(?:(?:type\s+)?\{[^}]*\}|[^"']*?)\s+from\s+["']([^"']+)["']/g;
  // import "..."
  const importSideRe = /import\s+["']([^"']+)["']/g;
  // export ... from "..."
  const exportFromRe = /export\s+(?:(?:type\s+)?\{[^}]*\}|[^"']*?)\s+from\s+["']([^"']+)["']/g;

  for (const re of [importFromRe, importSideRe, exportFromRe]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const spec = m[1];
      let type: ImportEdge["type"] = "external";
      let target = spec;

      if (spec.startsWith("@/")) {
        type = "alias";
        target = spec.replace("@/", "");
      } else if (spec.startsWith(".")) {
        type = "relative";
        // resolve relative to fromModule's directory
        const fromDir = path.dirname(path.join(SRC_DIR, fromModule + ".ts"));
        const resolved = path.resolve(fromDir, spec);
        // if no extension, try .ts / .tsx / index
        const candidates = [resolved, resolved + ".ts", resolved + ".tsx", path.join(resolved, "index.ts")];
        let found = false;
        for (const c of candidates) {
          if (relativePath(c).startsWith("src/")) {
            try {
              const stat = fsSync.statSync(c);
              if (stat.isFile()) {
                target = moduleId(c);
                found = true;
                break;
              }
            } catch { /* ignore */ }
          }
        }
        if (!found) continue;
      } else {
        continue; // skip node_modules / builtins
      }

      edges.push({ from: fromModule, to: target, type, sourceLine: m[0] });
    }
  }
  return edges;
}

import * as fsSync from "node:fs";

function normalizeModuleId(id: string): string {
  // strip index suffix for cleaner IDs
  return id.replace(/\/index$/, "");
}

async function analyze(): Promise<{
  modules: Map<string, ModuleNode>;
  packages: Map<string, PackageNode>;
  edges: ImportEdge[];
}> {
  const modules = new Map<string, ModuleNode>();
  const packages = new Map<string, PackageNode>();
  const edges: ImportEdge[] = [];

  for await (const file of walkTsFiles(SRC_DIR)) {
    const id = normalizeModuleId(moduleId(file));
    const pkg = packageOf(id);
    if (!modules.has(id)) {
      modules.set(id, { id, filePath: relativePath(file), package: pkg, imports: [], importedBy: [] });
    }
    if (!packages.has(pkg)) {
      packages.set(pkg, { id: pkg, files: [], imports: new Set(), importedBy: new Set() });
    }
    packages.get(pkg)!.files.push(id);
  }

  for await (const file of walkTsFiles(SRC_DIR)) {
    const id = normalizeModuleId(moduleId(file));
    const content = await fs.readFile(file, "utf-8");
    const fileEdges = parseImports(content, id);
    for (const e of fileEdges) {
      const toId = normalizeModuleId(e.to);
      if (toId === id) continue; // self import
      if (!modules.has(toId)) continue; // external / unresolved

      edges.push({ ...e, to: toId });
      modules.get(id)!.imports.push(toId);
      modules.get(toId)!.importedBy.push(id);

      const fromPkg = packageOf(id);
      const toPkg = packageOf(toId);
      if (fromPkg !== toPkg) {
        packages.get(fromPkg)!.imports.add(toPkg);
        packages.get(toPkg)!.importedBy.add(fromPkg);
      }
    }
  }

  return { modules, packages, edges };
}

function findCircularDeps(edges: ImportEdge[]): string[][] {
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, new Set());
    adj.get(e.from)!.add(e.to);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string) {
    if (stack.has(node)) {
      const idx = path.indexOf(node);
      cycles.push(path.slice(idx).concat(node));
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    path.push(node);
    for (const neighbor of adj.get(node) || []) {
      dfs(neighbor);
    }
    path.pop();
    stack.delete(node);
  }

  for (const node of adj.keys()) dfs(node);

  // dedupe by normalized cycle key
  const seen = new Set<string>();
  const unique: string[][] = [];
  for (const c of cycles) {
    const key = [...c].sort().join(",");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }
  return unique;
}

function findOrphanFiles(modules: Map<string, ModuleNode>): string[] {
  return Array.from(modules.values())
    .filter(m => m.importedBy.length === 0 && !m.id.startsWith("app/"))
    .map(m => m.id)
    .sort();
}

function detectLayerViolations(edges: ImportEdge[]): string[] {
  const violations: string[] = [];
  for (const e of edges) {
    const fromPkg = packageOf(e.from);
    const toPkg = packageOf(e.to);
    if (fromPkg.startsWith("lib:ai") && toPkg.startsWith("lib:services")) {
      violations.push(`${e.from} → ${e.to} (AI imports Services)`);
    }
    if (fromPkg.startsWith("lib:services") && toPkg === "lib:db:domains") {
      violations.push(`${e.from} → ${e.to} (Service imports db/domains directly)`);
    }
  }
  return violations;
}

// ── Mermaid generators ──────────────────────────────────────────────

function sanitizeMermaidId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^[0-9]/, "_$&");
}

function generateImportGraphMermaid(modules: Map<string, ModuleNode>, edges: ImportEdge[]): string {
  const significant = Array.from(modules.values())
    .filter(m => m.imports.length > 0 || m.importedBy.length > 0)
    .map(m => m.id);
  const set = new Set(significant);
  const relevantEdges = edges.filter(e => set.has(e.from) && set.has(e.to));

  let out = "```mermaid\nflowchart TD\n";
  for (const m of significant.slice(0, 80)) {
    out += `  ${sanitizeMermaidId(m)}["${m}"]\n`;
  }
  const drawn = new Set<string>();
  for (const e of relevantEdges) {
    if (!set.has(e.from) || !set.has(e.to)) continue;
    const key = `${e.from}→${e.to}`;
    if (drawn.has(key)) continue;
    drawn.add(key);
    out += `  ${sanitizeMermaidId(e.from)} --> ${sanitizeMermaidId(e.to)}\n`;
  }
  out += "```\n";
  return out;
}

function generatePackageGraphMermaid(packages: Map<string, PackageNode>): string {
  let out = "```mermaid\nflowchart TD\n";
  for (const [id, pkg] of packages) {
    if (pkg.files.length === 0) continue;
    out += `  ${sanitizeMermaidId(id)}["${id}<br/><small>${pkg.files.length} files</small>"]\n`;
  }
  const drawn = new Set<string>();
  for (const [id, pkg] of packages) {
    for (const imp of pkg.imports) {
      const key = `${id}→${imp}`;
      if (drawn.has(key)) continue;
      drawn.add(key);
      out += `  ${sanitizeMermaidId(id)} --> ${sanitizeMermaidId(imp)}\n`;
    }
  }
  out += "```\n";
  return out;
}

function generateServiceInteractionMap(packages: Map<string, PackageNode>): string {
  const servicePkgs = Array.from(packages.values())
    .filter(p => p.id.startsWith("lib:services"))
    .sort((a, b) => b.files.length - a.files.length);

  let out = "```mermaid\nflowchart LR\n";
  for (const pkg of servicePkgs) {
    out += `  ${sanitizeMermaidId(pkg.id)}["${pkg.id.replace("lib:services:", "")}<br/><small>${pkg.files.length} files</small>"]\n`;
  }
  const drawn = new Set<string>();
  for (const pkg of servicePkgs) {
    for (const imp of pkg.imports) {
      if (!imp.startsWith("lib:services")) continue;
      const key = `${pkg.id}→${imp}`;
      if (drawn.has(key)) continue;
      drawn.add(key);
      out += `  ${sanitizeMermaidId(pkg.id)} --> ${sanitizeMermaidId(imp)}\n`;
    }
  }
  out += "```\n";
  return out;
}

function generateRuntimePipelineMermaid(): string {
  return `\`\`\`mermaid
flowchart TD
  User["Usuario WhatsApp"] -->|mensaje| Webhook["POST /api/whatsapp/webhook"]
  Webhook -->|normaliza phone| Lead["lead.service.ts<br/>handleLeadMessage"]
  Lead --> Commands["Command Shortcuts / Admin"]
  Lead --> Setup["conversation-setup.ts"]
  Lead --> Core["ai/core.ts<br/>detecta intent + facts"]
  Core --> Router["ai/router.ts<br/>outputType"]
  Core --> Laterals["ai/laterals/<br/>enrichment"]
  Lead --> Memory["memory/buildMemory"]
  Lead --> Comprehension["comprehension-runner.ts"]
  Lead --> Extraction["extraction-runner.ts<br/>slots + pricing"]
  Extraction --> Geo["geo engine"]
  Extraction --> Pricing["pricing engine"]
  Extraction --> Workflow["slot-workflow.ts"]
  Lead --> Policy["policy-pipeline.ts"]
  Policy --> TripExec["trip-execution"]
  Policy --> Dispatch["dispatch engine"]
  Policy --> Output["response-builder.ts"]
  Output --> Sender["sendWhatsAppMessage"]
  Sender --> User
\`\`\`
`;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { modules, packages, edges } = await analyze();
  const cycles = findCircularDeps(edges);
  const orphans = findOrphanFiles(modules);
  const violations = detectLayerViolations(edges);

  const summary = {
    generatedAt: new Date().toISOString(),
    totalModules: modules.size,
    totalPackages: packages.size,
    totalImportEdges: edges.length,
    circularDependencies: cycles,
    orphanFiles: orphans,
    layerViolations: violations,
  };

  await fs.writeFile(path.join(OUT_DIR, "architecture-graphs.json"), JSON.stringify(summary, null, 2));

  const md = `# Reverse Engineering — Architecture Graphs

> Generated at ${summary.generatedAt} from real source code.
> Do not edit manually — regenerate with \`npx tsx scripts/architecture/generate-graphs.ts\`.

## Summary

| Metric | Value |
|--------|-------|
| Total modules | ${summary.totalModules} |
| Total packages | ${summary.totalPackages} |
| Import edges | ${summary.totalImportEdges} |
| Circular dependencies | ${cycles.length} |
| Orphan files | ${orphans.length} |
| Layer violations | ${violations.length} |

## Package Dependency Graph

${generatePackageGraphMermaid(packages)}

## Import Graph (module level, top 80 connected modules)

${generateImportGraphMermaid(modules, edges)}

## Service Interaction Map

${generateServiceInteractionMap(packages)}

## Runtime Pipeline

${generateRuntimePipelineMermaid()}

## Circular Dependencies

${cycles.length === 0 ? "No circular dependencies detected." : cycles.map(c => `- \`${c.join(" → ")}\``).join("\n")}

## Orphan Files (not imported by any src module)

${orphans.length === 0 ? "No orphan files detected." : orphans.map(o => `- \`${o}\``).join("\n")}

## Layer Violations

${violations.length === 0 ? "No layer violations detected." : violations.map(v => `- \`${v}\``).join("\n")}
`;

  await fs.writeFile(path.join(OUT_DIR, "architecture-graphs.md"), md);
  console.log(`Generated ${relativePath(path.join(OUT_DIR, "architecture-graphs.md"))}`);
  console.log(`Generated ${relativePath(path.join(OUT_DIR, "architecture-graphs.json"))}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
