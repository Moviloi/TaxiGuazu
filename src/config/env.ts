import { z } from "zod";

const envSchema = z.object({
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY es obligatoria. Creala en https://console.groq.com/keys"),
  WHATSAPP_TOKEN: z.string().min(1, "WHATSAPP_TOKEN es obligatorio. Obtenelo del panel de Meta for Developers"),
  WHATSAPP_PHONE_ID: z.string().min(1, "WHATSAPP_PHONE_ID es obligatorio. Obtenelo del panel de Meta for Developers"),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1, "WHATSAPP_VERIFY_TOKEN es obligatorio. Seteá uno seguro en el webhook de Meta"),
  ADMIN_API_KEY: z.string().min(1, "ADMIN_API_KEY es obligatoria. Usá un valor seguro para proteger las rutas admin"),
  BOT_PHONE: z.string().min(1, "BOT_PHONE es obligatorio. El número de WhatsApp del bot"),
  TITULAR_DRIVER_PHONE: z.string().min(1, "TITULAR_DRIVER_PHONE es obligatorio. Teléfono del titular del servicio"),
});

type Env = z.infer<typeof envSchema>;

let _parsed: Env | null = null;
let _error: string | null = null;

export function getEnv(): Env {
  if (_parsed) return _parsed;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map(i => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    _error = `❌ Variables de entorno faltantes o inválidas:\n${missing}`;
    throw new Error(_error);
  }

  _parsed = result.data;
  return _parsed;
}

export function getEnvError(): string | null {
  return _error;
}
