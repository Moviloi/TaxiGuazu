#!/usr/bin/env node
// scripts/architecture/report.ts
// Generates the Architecture Dashboard, Baseline, and Metrics.
//
// Usage:
//   npx tsx scripts/architecture/report.ts
//   npx tsx scripts/architecture/report.ts --save-baseline

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const ROOT = path.resolve(import.meta.dirname, "../..");
const ARCH_DIR = path.join(ROOT, "docs/architecture");
const REV_DIR = path.join(ARCH_DIR, "reverse-engineering");
const BASELINE_MD = path.join(ARCH_DIR, "ARCHITECTURE_BASELINE.md");
const BASELINE_JSON = path.join(ARCH_DIR, "ARCHITECTURE_BASELINE.json");
const DASHBOARD_MD = path.join(ARCH_DIR, "dashboard.md");
const METRICS_MD = path.join(ARCH_DIR, "metrics.md");
const METRICS_JSON = path.join(ARCH_DIR, "metrics.json");

interface GraphSummary {
  generatedAt: string;
  totalModules: number;
  totalPackages: number;
  totalImportEdges: number;
  circularDependencies: string[][];
  orphanFiles: string[];
  layerViolations: string[];
}

interface ValidationIssue {
  file: string;
  line?: number;
  message: string;
  severity: "error" | "warning";
}

interface Metric {
  name: string;
  description: string;
  value: number | string;
  expected: string;
  threshold: string;
  source: string;
  automated: boolean;
}

interface MetricsData {
  generatedAt: string;
  commit: string;
  general: {
    architectureBaseline: string;
    lastGeneration: string;
    documentationStatus: "ok" | "warnings" | "errors";
    validationStatus: "ok" | "warnings" | "errors";
    driftStatus: "ok" | "drift" | "no-baseline";
  };
  counts: {
    modules: number;
    packages: number;
    engines: number;
    boundedContexts: number;
    contracts: number;
    invariants: number;
    rules: number;
    diagrams: number;
    documents: number;
    adrs: number;
    architectureScripts: number;
    tests: number;
  };
  quality: {
    circularDependencies: number;
    layerViolations: number;
    orphanFiles: number;
    brokenLinks: number;
    isolatedDocs: number;
    outdatedDiagrams: number;
  };
  drift: {
    previousBaseline: string | null;
    changes: Record<string, { baseline: number | string; current: number | string; diff: number | string }>;
  };
  metrics: Metric[];
}

// ── Helpers ─────────────────────────────────────────────────────────

function relative(p: string): string {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

async function runScript(script: string): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execAsync(`npx tsx ${script}`, { cwd: ROOT, encoding: "utf-8" });
  return { stdout, stderr };
}

async function getGitCommit(): Promise<string> {
  try {
    const { stdout } = await execAsync("git rev-parse --short HEAD", { cwd: ROOT });
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

async function* walkFiles(dir: string, ext?: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const full = path.join(entry.parentPath || dir, entry.name);
    if (ext && !entry.name.endsWith(ext)) continue;
    yield full;
  }
}

async function countFiles(dir: string, ext?: string): Promise<number> {
  let n = 0;
  try {
    for await (const _ of walkFiles(dir, ext)) n++;
  } catch {
    return 0;
  }
  return n;
}

async function countMarkdownDocuments(dir: string): Promise<number> {
  let n = 0;
  for await (const file of walkFiles(dir, ".md")) {
    const rel = relative(file);
    if (rel.startsWith("docs/history/")) continue;
    const name = path.basename(file);
    if (name === "README.md") continue;
    n++;
  }
  return n;
}

async function countEngines(): Promise<number> {
  // Count top-level service directories under src/lib/services
  const servicesDir = path.join(ROOT, "src/lib/services");
  try {
    const entries = await fs.readdir(servicesDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).length;
  } catch {
    return 0;
  }
}

async function countBoundedContexts(): Promise<number> {
  // Count sections in bounded-contexts.md (## N. pattern)
  const file = path.join(ARCH_DIR, "bounded-contexts.md");
  try {
    const content = await fs.readFile(file, "utf-8");
    const matches = content.match(/^## \d+\. /gm);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

async function countRowsInTable(filePath: string, tableHeader: string): Promise<number> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const idx = content.indexOf(tableHeader);
    if (idx === -1) return 0;
    const slice = content.slice(idx);
    const lines = slice.split("\n");
    let count = 0;
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("| ") && line.includes(" | ")) {
        count++;
      } else if (line.startsWith("## ") || line.startsWith("# ")) {
        break;
      }
    }
    return count;
  } catch {
    return 0;
  }
}

async function countContracts(): Promise<number> {
  try {
    const content = await fs.readFile(path.join(ROOT, "docs/ai/CONTRACTS.md"), "utf-8");
    const matches = content.match(/^## C\d+\s+/gm);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

async function countInvariants(): Promise<number> {
  try {
    const content = await fs.readFile(path.join(ROOT, "docs/ai/INVARIANTS.md"), "utf-8");
    const matches = content.match(/^### I\d+\s+/gm);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

async function countRules(): Promise<number> {
  try {
    const content = await fs.readFile(path.join(ROOT, "docs/ai/ARCHITECTURE_RULES.md"), "utf-8");
    const matches = content.match(/^### R\d+\s+/gm);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

async function countDiagrams(): Promise<number> {
  const diagramsDir = path.join(ARCH_DIR, "diagrams");
  let n = 0;
  for await (const file of walkFiles(diagramsDir, ".md")) {
    const name = path.basename(file);
    if (name === "README.md") continue;
    n++;
  }
  for await (const _ of walkFiles(diagramsDir, ".mmd")) n++;
  return n;
}

async function countArchitectureScripts(): Promise<number> {
  return countFiles(path.join(ROOT, "scripts/architecture"), ".ts");
}

async function countTests(): Promise<number> {
  return countFiles(path.join(ROOT, "tests"), ".ts");
}

async function findBrokenLinks(): Promise<{ count: number; issues: ValidationIssue[] }> {
  const issues: ValidationIssue[] = [];
  const linkRe = /\]\(([^)]+)\)/g;
  for await (const file of walkFiles(path.join(ROOT, "docs"), ".md")) {
    if (relative(file).startsWith("docs/history/")) continue;
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
  return { count: issues.length, issues };
}

async function findIsolatedDocs(): Promise<number> {
  // A doc is isolated if it has no outgoing links to other docs and no incoming links.
  const docsDir = path.join(ROOT, "docs");
  const outgoing = new Map<string, number>();
  const incoming = new Map<string, number>();

  for await (const file of walkFiles(docsDir, ".md")) {
    if (relative(file).startsWith("docs/history/")) continue;
    outgoing.set(relative(file), 0);
    incoming.set(relative(file), 0);
  }

  const linkRe = /\]\(([^)]+)\)/g;
  for await (const file of walkFiles(docsDir, ".md")) {
    if (relative(file).startsWith("docs/history/")) continue;
    const content = await fs.readFile(file, "utf-8");
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(content)) !== null) {
      const link = m[1];
      if (link.startsWith("http") || link.startsWith("mailto:")) continue;
      const target = link.startsWith("#")
        ? relative(file)
        : relative(link.startsWith("/") ? path.join(ROOT, link.slice(1)) : path.resolve(path.dirname(file), link));
      if (target.endsWith(".md")) {
        outgoing.set(relative(file), (outgoing.get(relative(file)) || 0) + 1);
        incoming.set(target, (incoming.get(target) || 0) + 1);
      }
    }
  }

  let isolated = 0;
  for (const [file] of outgoing) {
    if ((outgoing.get(file) || 0) === 0 && (incoming.get(file) || 0) === 0) {
      // Exclude README files and index files
      const name = path.basename(file);
      if (name === "README.md" || name === "architecture.md" || name === "SYSTEM_BIBLE.md") continue;
      isolated++;
    }
  }
  return isolated;
}

async function findOutdatedDiagrams(): Promise<number> {
  const diagramsDir = path.join(ARCH_DIR, "diagrams");
  let outdated = 0;
  for await (const mmd of walkFiles(diagramsDir, ".mmd")) {
    const svg = mmd.replace(/\.mmd$/, ".svg");
    try {
      const mmdStat = await fs.stat(mmd);
      const svgStat = await fs.stat(svg);
      if (svgStat.mtime < mmdStat.mtime) outdated++;
    } catch {
      // SVG missing
      outdated++;
    }
  }
  return outdated;
}

async function loadGraphSummary(): Promise<GraphSummary | null> {
  try {
    const raw = await fs.readFile(path.join(REV_DIR, "architecture-graphs.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadBaselineSummary(): Promise<GraphSummary | null> {
  try {
    const raw = await fs.readFile(path.join(REV_DIR, "architecture-graphs.baseline.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function computeDriftChanges(current: GraphSummary, baseline: GraphSummary | null): MetricsData["drift"]["changes"] {
  if (!baseline) return {};
  return {
    totalModules: { baseline: baseline.totalModules, current: current.totalModules, diff: current.totalModules - baseline.totalModules },
    totalPackages: { baseline: baseline.totalPackages, current: current.totalPackages, diff: current.totalPackages - baseline.totalPackages },
    totalImportEdges: { baseline: baseline.totalImportEdges, current: current.totalImportEdges, diff: current.totalImportEdges - baseline.totalImportEdges },
    circularDependencies: { baseline: baseline.circularDependencies.length, current: current.circularDependencies.length, diff: current.circularDependencies.length - baseline.circularDependencies.length },
    orphanFiles: { baseline: baseline.orphanFiles.length, current: current.orphanFiles.length, diff: current.orphanFiles.length - baseline.orphanFiles.length },
    layerViolations: { baseline: baseline.layerViolations.length, current: current.layerViolations.length, diff: current.layerViolations.length - baseline.layerViolations.length },
  };
}

// ── Generators ──────────────────────────────────────────────────────

async function generateMetricsData(saveBaseline: boolean): Promise<MetricsData> {
  const generatedAt = new Date().toISOString();
  const commit = await getGitCommit();

  // Run sub-scripts
  console.log("Running generate-graphs.ts...");
  await runScript("scripts/architecture/generate-graphs.ts");
  console.log("Running detect-drift.ts...");
  await runScript("scripts/architecture/detect-drift.ts");

  const graph = await loadGraphSummary();
  if (!graph) throw new Error("Could not load architecture-graphs.json");

  const baselineGraph = await loadBaselineSummary();

  console.log("Collecting file metrics...");
  const counts = {
    modules: graph.totalModules,
    packages: graph.totalPackages,
    engines: await countEngines(),
    boundedContexts: await countBoundedContexts(),
    contracts: await countContracts(),
    invariants: await countInvariants(),
    rules: await countRules(),
    diagrams: await countDiagrams(),
    documents: await countMarkdownDocuments(path.join(ROOT, "docs")),
    adrs: await countFiles(path.join(ROOT, "docs/adr"), ".md"),
    architectureScripts: await countArchitectureScripts(),
    tests: await countTests(),
  };

  const { count: brokenLinksCount } = await findBrokenLinks();

  const quality = {
    circularDependencies: graph.circularDependencies.length,
    layerViolations: graph.layerViolations.length,
    orphanFiles: graph.orphanFiles.length,
    brokenLinks: brokenLinksCount,
    isolatedDocs: await findIsolatedDocs(),
    outdatedDiagrams: await findOutdatedDiagrams(),
  };

  const validationStatus: MetricsData["general"]["validationStatus"] =
    brokenLinksCount > 0 ? "warnings" : "ok";

  const driftStatus: MetricsData["general"]["driftStatus"] = baselineGraph
    ? (Object.values(computeDriftChanges(graph, baselineGraph)).some(c => (c.diff as number) !== 0)
      ? "drift"
      : "ok")
    : "no-baseline";

  const documentationStatus: MetricsData["general"]["documentationStatus"] =
    quality.brokenLinks > 0 || quality.isolatedDocs > 0 || quality.outdatedDiagrams > 0
      ? "warnings"
      : "ok";

  const metrics: Metric[] = [
    {
      name: "Total modules",
      description: "Number of TypeScript modules in src/",
      value: counts.modules,
      expected: "Stable or decreasing",
      threshold: "Growth > 10% between baselines requires review",
      source: "scripts/architecture/generate-graphs.ts",
      automated: true,
    },
    {
      name: "Total packages",
      description: "Number of package-level groupings in src/",
      value: counts.packages,
      expected: "Stable",
      threshold: "New package requires ADR or architecture review",
      source: "scripts/architecture/generate-graphs.ts",
      automated: true,
    },
    {
      name: "Engines",
      description: "Number of domain engines in src/lib/services",
      value: counts.engines,
      expected: "Stable",
      threshold: "New engine requires documentation update",
      source: "scripts/architecture/report.ts",
      automated: true,
    },
    {
      name: "Bounded contexts",
      description: "Number of bounded contexts documented",
      value: counts.boundedContexts,
      expected: "Matches code structure",
      threshold: "Context without code mapping is a documentation gap",
      source: "scripts/architecture/report.ts",
      automated: true,
    },
    {
      name: "Contracts",
      description: "Number of engine contracts in docs/ai/CONTRACTS.md",
      value: counts.contracts,
      expected: "One per engine",
      threshold: "Engine without contract is a governance gap",
      source: "scripts/architecture/report.ts",
      automated: true,
    },
    {
      name: "Invariants",
      description: "Number of architectural invariants",
      value: counts.invariants,
      expected: "Stable or increasing",
      threshold: "Invariant violation is a critical issue",
      source: "scripts/architecture/report.ts",
      automated: true,
    },
    {
      name: "Rules",
      description: "Number of architecture rules in docs/ai/ARCHITECTURE_RULES.md",
      value: counts.rules,
      expected: "Stable or increasing",
      threshold: "Rule violation is a critical issue",
      source: "scripts/architecture/report.ts",
      automated: true,
    },
    {
      name: "Diagrams",
      description: "Number of architecture diagrams",
      value: counts.diagrams,
      expected: "Covers all critical flows",
      threshold: "Critical flow without diagram is a documentation gap",
      source: "scripts/architecture/report.ts",
      automated: true,
    },
    {
      name: "Documents",
      description: "Number of markdown documents in docs/",
      value: counts.documents,
      expected: "Sufficient, not excessive",
      threshold: "Document without purpose is removed",
      source: "scripts/architecture/report.ts",
      automated: true,
    },
    {
      name: "ADRs",
      description: "Number of Architecture Decision Records",
      value: counts.adrs,
      expected: "One per permanent decision",
      threshold: "Permanent decision without ADR is a governance gap",
      source: "scripts/architecture/report.ts",
      automated: true,
    },
    {
      name: "Architecture scripts",
      description: "Number of scripts in scripts/architecture",
      value: counts.architectureScripts,
      expected: "Minimal but sufficient",
      threshold: "Redundant scripts consolidated",
      source: "scripts/architecture/report.ts",
      automated: true,
    },
    {
      name: "Tests",
      description: "Number of test files",
      value: counts.tests,
      expected: "Growing with code",
      threshold: "Feature without tests is incomplete",
      source: "scripts/architecture/report.ts",
      automated: true,
    },
    {
      name: "Circular dependencies",
      description: "Cycles detected in the module graph",
      value: quality.circularDependencies,
      expected: "0",
      threshold: "> 0 is a critical issue",
      source: "scripts/architecture/generate-graphs.ts",
      automated: true,
    },
    {
      name: "Layer violations",
      description: "Imports that violate ADR-001/004",
      value: quality.layerViolations,
      expected: "0",
      threshold: "> 0 is a critical issue",
      source: "scripts/architecture/generate-graphs.ts",
      automated: true,
    },
    {
      name: "Orphan files",
      description: "Source files not imported by any other module",
      value: quality.orphanFiles,
      expected: "0",
      threshold: "> 0 requires review",
      source: "scripts/architecture/generate-graphs.ts",
      automated: true,
    },
    {
      name: "Broken links",
      description: "Internal markdown links pointing to missing files",
      value: quality.brokenLinks,
      expected: "0",
      threshold: "> 0 is a documentation bug",
      source: "scripts/architecture/report.ts",
      automated: true,
    },
    {
      name: "Isolated documents",
      description: "Docs with no incoming or outgoing links",
      value: quality.isolatedDocs,
      expected: "0",
      threshold: "> 0 requires cross-reference audit",
      source: "scripts/architecture/report.ts",
      automated: true,
    },
    {
      name: "Outdated diagrams",
      description: "SVGs older than their .mmd source",
      value: quality.outdatedDiagrams,
      expected: "0",
      threshold: "> 0 requires SVG regeneration",
      source: "scripts/architecture/report.ts",
      automated: true,
    },
  ];

  const data: MetricsData = {
    generatedAt,
    commit,
    general: {
      architectureBaseline: baselineGraph?.generatedAt || "none",
      lastGeneration: generatedAt,
      documentationStatus,
      validationStatus,
      driftStatus,
    },
    counts,
    quality,
    drift: {
      previousBaseline: baselineGraph?.generatedAt || null,
      changes: computeDriftChanges(graph, baselineGraph),
    },
    metrics,
  };

  if (saveBaseline) {
    await fs.writeFile(BASELINE_JSON, JSON.stringify(data, null, 2));
    console.log(`Baseline saved to ${relative(BASELINE_JSON)}`);
  }

  return data;
}

function renderBaseline(data: MetricsData): string {
  return `# Architecture Baseline — AITOS

> Snapshot of the architectural state at a specific point in time.
> This is a photograph, not a version. It describes the system as it is now.
> For historical snapshots, see \`docs/history/\`.
> For future plans, see \`ael/artifacts/BACKLOG.md\`.

---

## Snapshot

| Field | Value |
|-------|-------|
| Generated | ${data.generatedAt} |
| Commit | \`${data.commit}\` |
| Baseline reference | ${data.general.architectureBaseline === "none" ? "First baseline" : data.general.architectureBaseline} |

## Overall state

| Indicator | Status |
|-----------|--------|
| Documentation | ${data.general.documentationStatus} |
| Validation | ${data.general.validationStatus} |
| Drift | ${data.general.driftStatus} |

## Key metrics

| Metric | Value |
|--------|-------|
| Modules | ${data.counts.modules} |
| Packages | ${data.counts.packages} |
| Engines | ${data.counts.engines} |
| Bounded contexts | ${data.counts.boundedContexts} |
| Contracts | ${data.counts.contracts} |
| Invariants | ${data.counts.invariants} |
| Rules | ${data.counts.rules} |
| Diagrams | ${data.counts.diagrams} |
| Documents | ${data.counts.documents} |
| ADRs | ${data.counts.adrs} |
| Architecture scripts | ${data.counts.architectureScripts} |
| Tests | ${data.counts.tests} |

## Quality indicators

| Metric | Value | Threshold |
|--------|-------|-----------|
| Circular dependencies | ${data.quality.circularDependencies} | 0 |
| Layer violations | ${data.quality.layerViolations} | 0 |
| Orphan files | ${data.quality.orphanFiles} | 0 |
| Broken links | ${data.quality.brokenLinks} | 0 |
| Isolated documents | ${data.quality.isolatedDocs} | 0 |
| Outdated diagrams | ${data.quality.outdatedDiagrams} | 0 |

## Findings

${data.quality.circularDependencies > 0 ? `- **Circular dependencies detected:** ${data.quality.circularDependencies}` : "- No circular dependencies detected."}
${data.quality.layerViolations > 0 ? `- **Layer violations detected:** ${data.quality.layerViolations}` : "- No layer violations detected."}
${data.quality.orphanFiles > 0 ? `- **Orphan files:** ${data.quality.orphanFiles}` : "- No orphan files detected."}
${data.quality.brokenLinks > 0 ? `- **Broken links:** ${data.quality.brokenLinks}` : "- No broken links detected."}
${data.quality.isolatedDocs > 0 ? `- **Isolated documents:** ${data.quality.isolatedDocs}` : "- No isolated documents detected."}
${data.quality.outdatedDiagrams > 0 ? `- **Outdated diagrams:** ${data.quality.outdatedDiagrams}` : "- No outdated diagrams detected."}

## Documentation coverage

| Area | Coverage |
|------|----------|
| AI Context Pack | docs/ai/ |
| Architecture conceptual docs | docs/architecture/ |
| ADRs | docs/adr/ |
| Reverse engineering graphs | docs/architecture/reverse-engineering/ |
| Diagrams | docs/architecture/diagrams/ |

## Related documents

- [\`dashboard.md\`](./dashboard.md) — live dashboard
- [\`metrics.md\`](./metrics.md) — metric definitions
- [\`drift-report.md\`](./drift-report.md) — detailed drift analysis
- [\`GOVERNANCE.md\`](./GOVERNANCE.md) — how to update this baseline
- [\`ADR_INDEX.md\`](./ADR_INDEX.md) — architecture decision index

## Observations

- This baseline was generated automatically by \`scripts/architecture/report.ts\`.
- Generated files must not be edited manually.
- Run \`npx tsx scripts/architecture/report.ts --save-baseline\` to update this snapshot.

---

*Generated: ${data.generatedAt}*
*Authority: source code and automated analysis*
`;
}

function renderDashboard(data: MetricsData): string {
  const driftRows = Object.entries(data.drift.changes).map(([key, change]) => {
    const diffStr = (change.diff as number) > 0 ? `+${change.diff}` : `${change.diff}`;
    return `| ${key} | ${change.baseline} | ${change.current} | ${diffStr} |`;
  });

  return `# Architecture Dashboard — AITOS

> Live view of the architectural state.
> This file is generated automatically. Do not edit manually.
> Last generation: ${data.generatedAt}

---

## General state

| Field | Value |
|-------|-------|
| Architecture Baseline | ${data.general.architectureBaseline === "none" ? "First baseline" : data.general.architectureBaseline} |
| Last generation | ${data.general.lastGeneration} |
| Commit | \`${data.commit}\` |
| Documentation status | ${data.general.documentationStatus} |
| Validation status | ${data.general.validationStatus} |
| Architecture drift | ${data.general.driftStatus} |

## Metrics

| Category | Count |
|----------|-------|
| Modules | ${data.counts.modules} |
| Packages | ${data.counts.packages} |
| Engines | ${data.counts.engines} |
| Bounded contexts | ${data.counts.boundedContexts} |
| Contracts | ${data.counts.contracts} |
| Invariants | ${data.counts.invariants} |
| Rules | ${data.counts.rules} |
| Diagrams | ${data.counts.diagrams} |
| Documents | ${data.counts.documents} |
| ADRs | ${data.counts.adrs} |
| Architecture scripts | ${data.counts.architectureScripts} |
| Tests | ${data.counts.tests} |

## Quality

| Metric | Value | Status |
|--------|-------|--------|
| Circular dependencies | ${data.quality.circularDependencies} | ${data.quality.circularDependencies === 0 ? "OK" : "ALERT"} |
| Layer violations | ${data.quality.layerViolations} | ${data.quality.layerViolations === 0 ? "OK" : "ALERT"} |
| Orphan files | ${data.quality.orphanFiles} | ${data.quality.orphanFiles === 0 ? "OK" : "REVIEW"} |
| Broken links | ${data.quality.brokenLinks} | ${data.quality.brokenLinks === 0 ? "OK" : "FIX"} |
| Isolated documents | ${data.quality.isolatedDocs} | ${data.quality.isolatedDocs === 0 ? "OK" : "REVIEW"} |
| Outdated diagrams | ${data.quality.outdatedDiagrams} | ${data.quality.outdatedDiagrams === 0 ? "OK" : "REGENERATE"} |

## Drift vs previous baseline

${data.drift.previousBaseline ? `Previous baseline: ${data.drift.previousBaseline}` : "No previous baseline available."}

| Metric | Baseline | Current | Diff |
|--------|----------|---------|------|
${driftRows.length > 0 ? driftRows.join("\n") : "| — | — | — | — |"}

## Related documents

- [\`ARCHITECTURE_BASELINE.md\`](./ARCHITECTURE_BASELINE.md) — full snapshot
- [\`metrics.md\`](./metrics.md) — metric definitions
- [\`drift-report.md\`](./drift-report.md) — detailed drift analysis
- [\`GOVERNANCE.md\`](./GOVERNANCE.md) — how to update this dashboard
- [\`ADR_INDEX.md\`](./ADR_INDEX.md) — architecture decision index
- [\`DIAGRAMS.md\`](./DIAGRAMS.md) — diagram lifecycle

---

*Generated by \`scripts/architecture/report.ts\`*
`;
}

function renderMetrics(data: MetricsData): string {
  const rows = data.metrics.map(m => {
    const valueStr = typeof m.value === "number" ? m.value.toString() : m.value;
    return `| **${m.name}** | ${m.description} | ${valueStr} | ${m.expected} | ${m.threshold} | ${m.source} | ${m.automated ? "Yes" : "No"} |`;
  });

  return `# Architecture Metrics — AITOS

> Definitions and current values for all architectural metrics.
> This file is generated automatically. Do not edit manually.
> Last generation: ${data.generatedAt}

---

## Metric catalog

| Metric | Description | Current | Expected | Threshold | Source | Automated |
|--------|-------------|---------|----------|-----------|--------|-----------|
${rows.join("\n")}

## How these metrics are used

1. **Dashboard** — metrics feed the architecture dashboard.
2. **Baseline** — each baseline captures metric values at a point in time.
3. **Drift detection** — changes between baselines highlight structural drift.
4. **Governance** — metrics outside thresholds trigger review.

## Manual metrics

All metrics listed above are automated. If a new metric cannot be automated,
add it here with explicit instructions for obtaining it manually.

| Metric | Why not automated | How to obtain |
|--------|-------------------|---------------|
| _None currently_ | — | — |

## Related documents

- [\`dashboard.md\`](./dashboard.md) — live dashboard
- [\`ARCHITECTURE_BASELINE.md\`](./ARCHITECTURE_BASELINE.md) — current snapshot
- [\`drift-report.md\`](./drift-report.md) — drift details
- [\`GOVERNANCE.md\`](./GOVERNANCE.md) — update rules
- [\`ADR_INDEX.md\`](./ADR_INDEX.md) — architecture decision index

---

*Generated by \`scripts/architecture/report.ts\`*
`;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const saveBaseline = process.argv.includes("--save-baseline");

  console.log("Generating architecture report...");
  const data = await generateMetricsData(saveBaseline);

  await fs.writeFile(BASELINE_MD, renderBaseline(data));
  console.log(`Generated ${relative(BASELINE_MD)}`);

  await fs.writeFile(DASHBOARD_MD, renderDashboard(data));
  console.log(`Generated ${relative(DASHBOARD_MD)}`);

  await fs.writeFile(METRICS_MD, renderMetrics(data));
  console.log(`Generated ${relative(METRICS_MD)}`);

  await fs.writeFile(METRICS_JSON, JSON.stringify(data, null, 2));
  console.log(`Generated ${relative(METRICS_JSON)}`);

  console.log("\nReport complete.");
  console.log(`  Documentation status: ${data.general.documentationStatus}`);
  console.log(`  Validation status: ${data.general.validationStatus}`);
  console.log(`  Drift status: ${data.general.driftStatus}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
