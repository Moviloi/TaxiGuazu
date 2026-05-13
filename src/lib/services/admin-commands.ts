import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { createDriverCode, deactivateDriverByCode } from "@/lib/db/database";

const TITULAR_PHONE = process.env.TITULAR_DRIVER_PHONE || "+543757613215";

export async function handleAdminCommand(phone: string, text: string): Promise<boolean> {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith(".add_chofer") || lower.startsWith(".add-chofer")) {
    await handleAddChofer(phone, trimmed);
    return true;
  }

  if (lower.startsWith(".baja_chofer") || lower.startsWith(".baja-chofer")) {
    await handleBajaChofer(phone, trimmed);
    return true;
  }

  return false;
}

async function handleAddChofer(phone: string, text: string): Promise<void> {
  const parts = text.split(/\s+/);
  if (parts.length < 3) {
    await sendWhatsAppMessage(phone, "Usá: .add_chofer CODIGO NOMBRE [TELÉFONO] [TIPO SEDAN/SUV/VAN] [CAPACIDAD 4/6] [COLOR] [PATENTE] [PAIS AR/BR/PY]");
    return;
  }

  if (phone !== TITULAR_PHONE) {
    await sendWhatsAppMessage(phone, "❌ Solo el administrador puede agregar choferes.");
    return;
  }

  const code = parts[1].toLowerCase();
  const knownCarTypes = ["sedan", "suv", "van", "pickup"];
  const knownCountries = ["ar", "br", "py"];

  let nameTokens: string[] = [];
  let phoneArg: string | undefined;
  let carType: string | undefined;
  let carCapacity: number | undefined;
  let color: string | undefined;
  let plate: string | undefined;
  let country: string | undefined;

  let i = 2;
  while (i < parts.length) {
    const p = parts[i];
    const cleaned = p.replace(/\D/g, "");

    if (!phoneArg && cleaned.length >= 10 && /^\+?\d+$/.test(p)) {
      phoneArg = p;
    } else if (!carType && knownCarTypes.includes(p.toLowerCase())) {
      carType = p.toLowerCase();
    } else if (carCapacity === undefined && (p === "4" || p === "6")) {
      carCapacity = parseInt(p);
    } else if (!color && /^[a-záéíóúñü]+$/i.test(p) && !knownCountries.includes(p.toLowerCase())) {
      color = p;
    } else if (!plate && /^[a-z0-9]{4,7}$/i.test(p) && !knownCountries.includes(p.toLowerCase())) {
      plate = p.toUpperCase();
    } else if (!country && knownCountries.includes(p.toLowerCase())) {
      country = p.toUpperCase();
    } else {
      nameTokens.push(p);
    }
    i++;
  }

  const name = nameTokens.join(" ") || "Sin nombre";

  const result = await createDriverCode(code, name, phone, phoneArg,
    carType ? { carType, carCapacity, color, plate, country } : undefined
  );

  if (result.ok) {
    let msg = `✅ Código "${code}" creado para ${name}.`;
    if (phoneArg) msg += ` Teléfono: ${phoneArg}.`;
    if (carType) msg += ` ${carType}${carCapacity ? " " + carCapacity + "p" : ""}.`;
    if (color) msg += ` ${color}.`;
    if (country && country !== "AR") msg += ` (${country}).`;
    msg += ` Decile que envíe .registrar-${code} al bot.`;
    await sendWhatsAppMessage(phone, msg);
  } else {
    await sendWhatsAppMessage(phone, `❌ ${result.error || "Error al crear código."}`);
  }
}

async function handleBajaChofer(phone: string, text: string): Promise<void> {
  const parts = text.split(/\s+/);
  if (parts.length < 2) {
    await sendWhatsAppMessage(phone, "Usá: .baja_chofer CODIGO");
    return;
  }

  if (phone !== TITULAR_PHONE) {
    await sendWhatsAppMessage(phone, "❌ Solo el administrador puede dar de baja choferes.");
    return;
  }

  const code = parts[1].toLowerCase();
  const ok = await deactivateDriverByCode(code);
  if (ok) {
    await sendWhatsAppMessage(phone, `✅ Chofer "${code}" dado de baja.`);
  } else {
    await sendWhatsAppMessage(phone, `❌ Código "${code}" no encontrado.`);
  }
}
