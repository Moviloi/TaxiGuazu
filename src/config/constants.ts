import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const BOT_PHONE = process.env.BOT_PHONE || "+543757646648";
export const TITULAR_DRIVER_PHONE = process.env.TITULAR_DRIVER_PHONE || "+543757613215";
export const TIMEOUT_TITULAR_RESPONSE = 2 * 60 * 1000;
export const TIMEOUT_GROUP_RESPONSE = 8 * 60 * 1000;
export const TIMEOUT_HUMAN_RESPONSE = 3 * 60 * 1000;

export const NOTIFY_TITULAR_TIMEOUTS = {
  DISCOUNT_ABOVE_10: true,
  RESERVAS_DIFERIDAS: true,
  GRUPOS_MAYORES_4: true,
};

export const DISCOUNT_MAX_EXPLICIT = 15;

export const DATABASE_PATH = process.env.DATABASE_PATH || "./data/bot.db";

export const PROJECT_ROOT = path.resolve(__dirname, "../../");
export const DATA_DIR = path.join(PROJECT_ROOT, "data");
export const AUTH_DIR = path.join(PROJECT_ROOT, "auth-6648");
export const DB_PATH = path.resolve(DATA_DIR, "bot.db");

export function validateEnv(): void {
  const required = ["GEMINI_API_KEY"];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}