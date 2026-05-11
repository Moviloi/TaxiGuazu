import "./env-loader.js";
import { startWhatsApp } from "../src/lib/baileys/client.js";
import { validateEnv } from "../src/config/constants.js";

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  🚕 TAXIGUAZÚ BOT - Iniciando...");
  console.log("═══════════════════════════════════════════");

  try {
    validateEnv();
    console.log("[CONFIG] Variables de entorno validadas");
  } catch (error) {
    console.error("[ERROR] Configuración inválida:", (error as Error).message);
    process.exit(1);
  }

  try {
    await startWhatsApp();
    console.log("[BOT] Bot iniciado correctamente");
  } catch (error) {
    console.error("[ERROR FATAL] No se pudo iniciar el bot:", error);
    process.exit(1);
  }
}

main();
