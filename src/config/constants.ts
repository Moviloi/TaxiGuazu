import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DISCOUNT_MAX_EXPLICIT = 15;
export const DB_PATH = path.resolve(__dirname, "../../data/bot.db");
