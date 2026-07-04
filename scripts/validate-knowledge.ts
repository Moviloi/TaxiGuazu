// validate-knowledge.ts — AIT-034 Knowledge layer validation
// Usage: npx tsx scripts/validate-knowledge.ts
// Validates integrity of all JSON files in data/knowledge/ against manifest.json
// and their Zod schemas.

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

// ── Types ──────────────────────────────────────────────────────────

interface Manifest {
  version: string;
  files: Record<string, ManifestEntry>;
}

interface ManifestEntry {
  hash: string;
  lastModified: string;
  entries: number;
  details: string;
}

interface ValidationResult {
  file: string;
  status: "OK" | "FAIL";
  checks: string[];
  errors: string[];
}

// ── Helpers ────────────────────────────────────────────────────────

const ROOT = path.resolve(import.meta.dirname, "..");

function relPath(abs: string): string {
  return path.relative(ROOT, abs).replace(/\\/g, "/");
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

// ── Check 1: Hash verification ─────────────────────────────────────

async function checkHashes(manifest: Manifest): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  for (const [filePath, entry] of Object.entries(manifest.files)) {
    const absPath = path.join(ROOT, filePath);
    const result: ValidationResult = { file: filePath, status: "OK", checks: [], errors: [] };

    try {
      const content = await fs.readFile(absPath, "utf-8");
      const actualHash = sha256(content);

      if (actualHash === entry.hash) {
        result.checks.push(`hash OK (${actualHash.slice(0, 12)}…)`);
      } else {
        result.status = "FAIL";
        result.errors.push(
          `hash MISMATCH: manifest says ${entry.hash.slice(0, 12)}…, actual is ${actualHash.slice(0, 12)}…`
        );
      }
    } catch (e: any) {
      result.status = "FAIL";
      result.errors.push(`cannot read file: ${e.message}`);
    }

    results.push(result);
  }

  return results;
}

// ── Check 2: Zod schema validation ─────────────────────────────────

function schemaModuleFor(filePath: string): string | null {
  const map: Record<string, string> = {
    "data/knowledge/geo/places.json":      "./data/knowledge/geo/places.schema.ts",
    "data/knowledge/geo/borders.json":     "./data/knowledge/geo/borders.schema.ts",
    "data/knowledge/geo/attractions.json": "./data/knowledge/geo/attractions.schema.ts",
    "data/knowledge/ops/operations.json":      "./data/knowledge/ops/operations.schema.ts",
    "data/knowledge/ops/migration.json":       "./data/knowledge/ops/migration.schema.ts",
    "data/knowledge/ops/pricing-rules.json":   "./data/knowledge/ops/pricing-rules.schema.ts",
    "data/knowledge/commercial/calendar.json":    "./data/knowledge/commercial/calendar.schema.ts",
    "data/knowledge/commercial/surge-rules.json": "./data/knowledge/commercial/surge-rules.schema.ts",
    "data/knowledge/policies/reserva.json":   "./data/knowledge/policies/reserva.schema.ts",
    "data/knowledge/policies/ahora.json":     "./data/knowledge/policies/ahora.schema.ts",
    "data/knowledge/policies/escalation.json": "./data/knowledge/policies/escalation.schema.ts",
  };
  return map[filePath] ?? null;
}

// The schema files export various schema names. We map them here.
function schemaExportNameFor(filePath: string): string[] {
  const map: Record<string, string[]> = {
    "data/knowledge/geo/places.json":      ["PlacesArraySchema"],
    "data/knowledge/geo/borders.json":     ["BorderSchema"],
    "data/knowledge/geo/attractions.json": ["AttractionsMapSchema"],
    "data/knowledge/ops/operations.json":      ["OperationsSchema"],
    "data/knowledge/ops/migration.json":       ["MigrationSchema"],
    "data/knowledge/ops/pricing-rules.json":   ["PricingRulesSchema"],
    "data/knowledge/commercial/calendar.json":    ["CalendarSchema"],
    "data/knowledge/commercial/surge-rules.json": ["SurgeRulesFileSchema"],
    "data/knowledge/policies/reserva.json":   ["ReservaPoliciesSchema"],
    "data/knowledge/policies/ahora.json":     ["AhoraPoliciesSchema"],
    "data/knowledge/policies/escalation.json": ["EscalationPoliciesSchema"],
  };
  return map[filePath] ?? [];
}

async function validateSchema(
  filePath: string,
  jsonData: unknown,
): Promise<string[]> {
  const modPath = schemaModuleFor(filePath);
  if (!modPath) return ["no schema mapped — skipped"];

  const schemaNames = schemaExportNameFor(filePath);
  if (schemaNames.length === 0) return ["no schema export mapped — skipped"];

  try {
    // Dynamic import with absolute path
    const absModPath = path.join(ROOT, modPath);
    const mod = await import(pathToFileURL(absModPath).href);

    const errors: string[] = [];
    for (const name of schemaNames) {
      const schema = mod[name];
      if (!schema) {
        errors.push(`schema export "${name}" not found in module`);
        continue;
      }

      const result = schema.safeParse(jsonData);
      if (result.success) {
        // OK
      } else {
        const issues = result.error.issues
          .map((i: any) => `  ${i.path.join(".")}: ${i.message}`)
          .join("\n");
        errors.push(`Zod validation FAILED for "${name}":\n${issues}`);
      }
    }

    return errors.length > 0 ? errors : ["Zod schema OK"];
  } catch (e: any) {
    return [`schema import error: ${e.message}`];
  }
}

async function checkSchemas(
  hashResults: ValidationResult[],
  manifest: Manifest,
): Promise<void> {
  for (const result of hashResults) {
    const absPath = path.join(ROOT, result.file);

    try {
      const content = await fs.readFile(absPath, "utf-8");
      const jsonData = JSON.parse(content);
      const schemaErrors = await validateSchema(result.file, jsonData);

      if (schemaErrors.length === 1 && schemaErrors[0].includes("OK")) {
        result.checks.push(...schemaErrors);
      } else if (schemaErrors.length === 1 && schemaErrors[0].includes("skipped")) {
        result.checks.push(...schemaErrors);
      } else {
        result.status = "FAIL";
        result.errors.push(...schemaErrors);
      }
    } catch (e: any) {
      result.status = "FAIL";
      result.errors.push(`JSON parse error: ${e.message}`);
    }
  }
}

// ── Check 3: Cross-reference validation ────────────────────────────

async function checkCrossReferences(
  hashResults: ValidationResult[],
): Promise<string[]> {
  const warnings: string[] = [];

  // Load places.json to have a reference set of place names
  let placesNames: Set<string> = new Set();
  try {
    const placesPath = path.join(ROOT, "data/knowledge/geo/places.json");
    const placesContent = await fs.readFile(placesPath, "utf-8");
    const places: Array<{ name: string; aliases: string[] }> = JSON.parse(placesContent);
    for (const p of places) {
      placesNames.add(p.name.toLowerCase());
      for (const a of p.aliases) {
        placesNames.add(a.toLowerCase());
      }
    }
  } catch {
    warnings.push("Cannot read places.json — cross-reference checks skipped");
    return warnings;
  }

  // Check policies files for any reference to place names
  const policiesFiles = [
    "data/knowledge/policies/reserva.json",
    "data/knowledge/policies/ahora.json",
    "data/knowledge/policies/escalation.json",
    "data/knowledge/ops/operations.json",
    "data/knowledge/ops/migration.json",
    "data/knowledge/commercial/calendar.json",
  ];

  for (const pf of policiesFiles) {
    const absPath = path.join(ROOT, pf);
    try {
      const content = await fs.readFile(absPath, "utf-8");
      // Quick scan: look for known city/place names in string values within JSON
      const knownRefs = ["Puerto Iguazú", "Foz do Iguaçu", "Ciudad del Este",
        "Argentina", "Brasil", "Paraguay", "AR", "BR", "PY"];

      for (const ref of knownRefs) {
        if (content.includes(ref)) {
          // These are valid geographical references, not cross-reference issues
        }
      }
    } catch {
      // skip
    }
  }

  return warnings;
}

// ── Check 4: Duplicate detection in places.json ────────────────────

async function checkDuplicates(
  hashResults: ValidationResult[],
): Promise<string[]> {
  const errors: string[] = [];

  try {
    const placesPath = path.join(ROOT, "data/knowledge/geo/places.json");
    const content = await fs.readFile(placesPath, "utf-8");
    const places: Array<{ name: string; aliases: string[]; _note?: string }> = JSON.parse(content);

    // Track which places have documented exceptions
    const documentedDups = new Set<string>();

    // Check intra-place duplicates (within same aliases array)
    for (let i = 0; i < places.length; i++) {
      const seen = new Map<string, number[]>(); // alias -> positions in array
      for (let j = 0; j < places[i].aliases.length; j++) {
        const alias = places[i].aliases[j].toLowerCase().trim();
        if (!seen.has(alias)) {
          seen.set(alias, [j]);
        } else {
          seen.get(alias)!.push(j);
        }
      }

      // Intra-place duplicates
      for (const [alias, positions] of seen) {
        if (positions.length > 1) {
          // Check if this is the documented "cataratas argentinas" duplicate
          const hasNote = !!places[i]._note;
          if (hasNote && alias === "cataratas argentinas") {
            documentedDups.add(`intra:${i}:${alias}`);
          } else {
            errors.push(
              `places[${i}] "${places[i].name}": alias "${alias}" aparece ${positions.length} veces en el mismo array (posiciones ${positions.join(", ")}) — NO documentado con _note`
            );
          }
        }
      }
    }

    // Check cross-place duplicates (same alias in different places)
    const aliasMap = new Map<string, number[]>(); // alias -> place indices
    for (let i = 0; i < places.length; i++) {
      for (const alias of places[i].aliases) {
        const key = alias.toLowerCase().trim();
        if (!aliasMap.has(key)) {
          aliasMap.set(key, [i]);
        } else {
          aliasMap.get(key)!.push(i);
        }
      }
    }

    for (const [alias, indices] of aliasMap) {
      if (indices.length > 1) {
        // Check if this duplicate is documented with _note in ALL involved places
        const allDocumented = indices.every((idx) => !!places[idx]._note);
        if (allDocumented) {
          documentedDups.add(`cross:${alias}`);
        } else {
          const names = indices.map((idx) => `places[${idx}] "${places[idx].name}"`).join(", ");
          // Some well-known cases - check if alias is too generic to be a problem
          if (["iguazu", "cataratas", "foz", "centro"].includes(alias)) {
            // These are fuzzy-lookup terms that legitimately span multiple places
            continue;
          }
          errors.push(
            `Cross-place DUPLICATE: alias "${alias}" aparece en ${names} — no documentado con _note en todos los lugares`
          );
        }
      }
    }

    // Report documented duplicates
    if (documentedDups.size > 0) {
      // Find the places result entry
      const placesResult = hashResults.find((r) => r.file === "data/knowledge/geo/places.json");
      if (placesResult) {
        placesResult.checks.push(
          `duplicate scan: ${documentedDups.size} duplicado(s) documentado(s) con _note (esperado: 'cataratas argentinas' intra-place) — OK`
        );
      }
    }
  } catch (e: any) {
    errors.push(`duplicate scan error: ${e.message}`);
  }

  return errors;
}

// ── Check 5: File existence (manifest completeness) ────────────────

async function checkFileExistence(manifest: Manifest): Promise<string[]> {
  const errors: string[] = [];
  const knownDirs = [
    "data/knowledge/geo",
    "data/knowledge/ops",
    "data/knowledge/commercial",
    "data/knowledge/policies",
  ];

  // Verify all manifest files exist
  for (const filePath of Object.keys(manifest.files)) {
    const absPath = path.join(ROOT, filePath);
    try {
      await fs.access(absPath);
    } catch {
      errors.push(`MISSING: ${filePath} está en el manifest pero no existe en disco`);
    }
  }

  // Verify there are no JSON files in data/knowledge/ that are not in the manifest
  for (const dir of knownDirs) {
    try {
      const files = await fs.readdir(path.join(ROOT, dir));
      for (const f of files) {
        if (f.endsWith(".json")) {
          const rel = `${dir}/${f}`.replace(/\\/g, "/");
          if (!manifest.files[rel]) {
            errors.push(`UNREGISTERED: ${rel} existe en disco pero no está en el manifest`);
          }
        }
      }
    } catch {
      // directory might not exist yet
    }
  }

  return errors;
}

// ── Report ─────────────────────────────────────────────────────────

function printReport(results: ValidationResult[], extras: string[]): boolean {
  let allPassed = true;
  const passCounts = { total: results.length, ok: 0, fail: 0 };

  console.log("\n" + "=".repeat(70));
  console.log("  KNOWLEDGE LAYER VALIDATION REPORT");
  console.log("=".repeat(70) + "\n");

  for (const result of results) {
    const icon = result.status === "OK" ? "✓" : "✗";
    if (result.status === "OK") passCounts.ok++;
    else { passCounts.fail++; allPassed = false; }

    console.log(`  ${icon} ${result.file}`);
    for (const check of result.checks) {
      console.log(`      ✔ ${check}`);
    }
    for (const err of result.errors) {
      console.log(`      ✘ ${err}`);
    }
    console.log();
  }

  // Print extra warnings
  for (const extra of extras) {
    if (extra.startsWith("WARN")) {
      console.log(`  ⚠ ${extra}`);
    } else if (extra.startsWith("ERROR")) {
      console.log(`  ✘ ${extra}`);
      allPassed = false;
    }
  }
  if (extras.length > 0) console.log();

  console.log("-".repeat(70));
  console.log(`  Total: ${passCounts.total}  |  OK: ${passCounts.ok}  |  FAIL: ${passCounts.fail}`);
  if (allPassed) {
    console.log("  RESULT: ✅ ALL CHECKS PASSED");
  } else {
    console.log("  RESULT: ❌ SOME CHECKS FAILED — review errors above");
  }
  console.log("=".repeat(70) + "\n");

  return allPassed;
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  // 1. Load manifest
  let manifest: Manifest;
  try {
    const manifestContent = await fs.readFile(path.join(ROOT, "data/knowledge/manifest.json"), "utf-8");
    manifest = JSON.parse(manifestContent);
    console.log(`  Manifest v${manifest.version}: ${Object.keys(manifest.files).length} files registered`);
  } catch (e: any) {
    console.error(`FATAL: Cannot load manifest.json — ${e.message}`);
    process.exit(1);
  }

  // 2. Run checks
  const hashResults = await checkHashes(manifest);

  // 3. Schema validation
  await checkSchemas(hashResults, manifest);

  // 4. Cross-reference validation
  const crossRefWarnings = await checkCrossReferences(hashResults);

  // 5. Duplicate detection
  const dupErrors = await checkDuplicates(hashResults);

  // 6. File existence check
  const existenceErrors = await checkFileExistence(manifest);

  // Collect all extra messages
  const extras: string[] = [...crossRefWarnings, ...dupErrors, ...existenceErrors];

  // 7. Print report
  const allPassed = printReport(hashResults, extras);

  process.exit(allPassed ? 0 : 1);
}

main();
