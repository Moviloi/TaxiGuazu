import path from "node:path";
import fs from "node:fs";

function loadEnvFile(envPath: string): boolean {
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, "utf-8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
    console.log(`[ENV] Variables de entorno cargadas desde ${envPath}`);
    return true;
  }
  return false;
}

const envFiles = [".env.local", ".env.production", ".env"];
let loaded = false;

for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (loadEnvFile(envPath)) {
    loaded = true;
    break;
  }
}

if (!loaded) {
  console.warn("[ENV] No se encontró archivo .env, usando variables del sistema");
}