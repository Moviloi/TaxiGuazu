import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DISCOUNT_MAX_EXPLICIT = 15;
export const STANDARD_DISCOUNT = 10;
export const DB_PATH = path.resolve(__dirname, "../../data/bot.db");
export const MIN_MARGIN = 3000;
export const LOW_PISO_FACTOR = 0.8;
export const TIERS = ['premium', 'normal', 'low'] as const;
export type Tier = typeof TIERS[number];

export const TIMEOUT_NIVEL_1_MS = 60 * 60 * 1000;
export const TIMEOUT_NIVEL_2_MS = 30 * 60 * 1000;
export const TIMEOUT_NIVEL_3_MS = 8 * 60 * 1000;
export const TIMEOUT_WAITING_DRIVER_MS = 3 * 60 * 1000;

// Session/inactivity thresholds
export const SESSION_INACTIVITY_48H_S = 172800;
export const CRON_12H_S = 43200;
export const CRON_24H_S = 86400;

// Session cleanup
export const STALE_WORKFLOW_THRESHOLD_S = 86400;

// Confirmation expiration (awaiting_confirmation stale after 30 min)
export const CONFIRMATION_TIMEOUT_S = 1800;

// Context slot staleness (slots older than this are not inherited across turns)
export const CONTEXT_SLOT_TIMEOUT_S = 3600;

// Groq
export const GROQ_MAX_TOKENS = 512;
export const GROQ_TIMEOUT_MS = 8000;
export const GROQ_MODEL = "llama-3.3-70b-versatile";
export const GROQ_EXTRACTION_MAX_TOKENS = 256;
export const GROQ_EXTRACTION_TEMPERATURE = 0.1;

// Confidence-Based Matching + Slot-Filling
export const CONFIDENCE_PROCEED = 0.7;
export const CONFIDENCE_CLARIFY = 0.3;
