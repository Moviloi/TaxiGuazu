// ARCHITECTURE NOTE (Phase D): Imports ADMIN_PHONE from frozen admin.service.ts.
// admin-commands.ts is the admin interface layer — distinct from admin.service.ts
// which manages dispatch/system notifications. Keep this import boundary clean:
// admin-commands reads configuration; admin.service manages dispatch.

import { sendWhatsAppMessage } from "@/lib/sender";
import { createDriverCode, deactivateDriverByCode, getDriverCodeByCode, setPackagePrice, createReservationSlot, getActiveSlots, deleteReservationSlot, updateDriverTier, updateDriverMinPayout, updateDriverLanguages, updateDriverGuide, updateDriverByCode, getDriverByPhone, searchTariffs } from "@/lib/db/database";
import { TIERS, type Tier } from "@/config/constants";
import { assertAdmin } from "@/lib/services/shared/admin-helpers";

export async function handleAdminCommand(phone: string, text: string): Promise<boolean> {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith(".add_chofer") || lower.startsWith(".add-chofer")) {
    await handleAddChofer(phone, trimmed);
    return true;
  }

  if (lower.startsWith(".update_chofer") || lower.startsWith(".update-chofer")) {
    await handleUpdateChofer(phone, trimmed);
    return true;
  }

  if (lower.startsWith(".baja_chofer") || lower.startsWith(".baja-chofer")) {
    await handleBajaChofer(phone, trimmed);
    return true;
  }

  if (lower.startsWith(".set_paquete") || lower.startsWith(".set-paquete")) {
    await handleSetPaquete(phone, trimmed);
    return true;
  }

  if (lower.startsWith(".add_slot") || lower.startsWith(".add-slot")) {
    await handleAddSlot(phone, trimmed);
    return true;
  }

  if (lower.startsWith(".remove_slot") || lower.startsWith(".remove-slot") || lower.startsWith(".rm_slot") || lower.startsWith(".rm-slot")) {
    await handleRemoveSlot(phone, trimmed);
    return true;
  }

  if (lower.startsWith(".list_slots") || lower.startsWith(".list-slots") || lower === ".slots") {
    await handleListSlots(phone);
    return true;
  }

  if (lower.startsWith(".set_tier") || lower.startsWith(".set-tier")) {
    await handleSetTier(phone, trimmed);
    return true;
  }

  if (lower.startsWith(".set_minimo") || lower.startsWith(".set-minimo")) {
    await handleSetMinimo(phone, trimmed);
    return true;
  }

  if (lower === ".low_cost" || lower === ".low-cost") {
    await handleToggleLowCost(phone);
    return true;
  }

  if (lower.startsWith(".idiomas") || lower.startsWith(".languages")) {
    await handleSetLanguages(phone, trimmed);
    return true;
  }

  if (lower === ".guia" || lower === ".guide") {
    await handleToggleGuide(phone);
    return true;
  }

  if (lower.startsWith(".tarifas") || lower.startsWith(".tariffs")) {
    await handleSearchTariffs(phone, trimmed);
    return true;
  }

  return false;
}

const DAY_NAMES: Record<string, number> = {
  dom: 0, domingo: 0,
  lun: 1, lunes: 1,
  mar: 2, martes: 2,
  mie: 3, miercoles: 3, miércoles: 3,
  jue: 4, jueves: 4,
  vie: 5, viernes: 5,
  sab: 6, sabado: 6, sábado: 6,
};

function parseDay(dayStr: string): number | null {
  const d = dayStr.toLowerCase();
  if (DAY_NAMES[d] !== undefined) return DAY_NAMES[d];
  const n = parseInt(d);
  if (n >= 0 && n <= 6) return n;
  return null;
}

async function handleAddSlot(phone: string, text: string): Promise<void> {
  const parts = text.split(/\s+/);
  if (parts.length < 4) {
    await sendWhatsAppMessage(phone, "Usá: .add_slot DIA HH:MM HH:MM [ETIQUETA] [max]\nEj: .add_slot lunes 08:00 12:00 Mañana 2\nDías: lun,mar,mie,jue,vie,sab,dom");
    return;
  }

  if (!(await assertAdmin(phone, "configurar slots"))) return;

  const dayOfWeek = parseDay(parts[1]);
  if (dayOfWeek === null) {
    await sendWhatsAppMessage(phone, `❌ Día inválido: "${parts[1]}". Usá lun,mar,mie,jue,vie,sab,dom.`);
    return;
  }

  const timeRegex = /^(\d{1,2}):(\d{2})$/;
  const startMatch = parts[2].match(timeRegex);
  const endMatch = parts[3].match(timeRegex);
  if (!startMatch || !endMatch) {
    await sendWhatsAppMessage(phone, "❌ Formato de hora inválido. Usá HH:MM (ej: 08:00).");
    return;
  }

  let label: string | undefined;
  let maxBookings = 1;
  for (let i = 4; i < parts.length; i++) {
    const n = parseInt(parts[i]);
    if (!isNaN(n) && n > 0) {
      maxBookings = n;
    } else if (!label) {
      label = parts[i];
    }
  }

  const result = await createReservationSlot(dayOfWeek, parts[2], parts[3], label, maxBookings);
  if (result.ok) {
    const dayName = Object.entries(DAY_NAMES).find(([, v]) => v === dayOfWeek)?.[0] || String(dayOfWeek);
    await sendWhatsAppMessage(phone, `✅ Slot agregado: ${dayName} ${parts[2]}-${parts[3]}${label ? ` (${label})` : ""} máx ${maxBookings} reserva(s).`);
  } else {
    await sendWhatsAppMessage(phone, `❌ Error: ${result.error || "no se pudo crear el slot"}.`);
  }
}

async function handleRemoveSlot(phone: string, text: string): Promise<void> {
  const parts = text.split(/\s+/);
  if (parts.length < 2) {
    await sendWhatsAppMessage(phone, "Usá: .remove_slot ID\nUsá .list_slots para ver los IDs.");
    return;
  }

  if (!(await assertAdmin(phone, "eliminar slots"))) return;

  const id = parseInt(parts[1]);
  if (isNaN(id)) {
    await sendWhatsAppMessage(phone, "❌ ID inválido.");
    return;
  }

  const ok = await deleteReservationSlot(id);
  if (ok) {
    await sendWhatsAppMessage(phone, `✅ Slot #${id} eliminado.`);
  } else {
    await sendWhatsAppMessage(phone, `❌ Slot #${id} no encontrado.`);
  }
}

async function handleListSlots(phone: string): Promise<void> {
  if (!(await assertAdmin(phone, "listar slots"))) return;
  const slots = await getActiveSlots();
  if (slots.length === 0) {
    await sendWhatsAppMessage(phone, "📅 No hay slots configurados. Usá .add_slot para agregar.");
    return;
  }

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  let msg = "📅 *Slots disponibles:*\n";
  for (const s of slots) {
    const dayName = dayNames[s.day_of_week] || `Día ${s.day_of_week}`;
    msg += `\n#${s.id} ${dayName} ${s.start_time}-${s.end_time}`;
    if (s.label) msg += ` (${s.label})`;
    msg += ` máx ${s.max_bookings}`;
  }
  await sendWhatsAppMessage(phone, msg);
}

async function handleAddChofer(phone: string, text: string): Promise<void> {
  const parts = text.split(/\s+/);
  if (parts.length < 3) {
    await sendWhatsAppMessage(phone, "Usá: .add_chofer CODIGO NOMBRE [TELÉFONO] [TIPO SEDAN/SUV/VAN] [PAX 4/6] [TURNO DIA/NOCHE] [PAGO EFECTIVO/TRANSF/MIXTO] [IDIOMA ES/EN/PT] [COLOR] [PATENTE] [PAIS AR/BR/PY]");
    return;
  }

  if (!(await assertAdmin(phone, "agregar choferes"))) return;

  const code = parts[1].toLowerCase();
  const knownCarTypes = ["sedan", "suv", "van", "pickup"];
  const knownCountries = ["ar", "br", "py"];
  const knownShifts = ["dia", "noche"];
  const knownPaymentMethods = ["efectivo", "transferencia", "transfer", "mixto"];
  const knownLanguages = ["es", "en", "pt"];

  let nameTokens: string[] = [];
  let phoneArg: string | undefined;
  let carType: string | undefined;
  let carCapacity: number | undefined;
  let color: string | undefined;
  let plate: string | undefined;
  let country: string | undefined;
  let shift: string | undefined;
  let paymentMethod: string | undefined;
  let idiom: string | undefined;

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
    } else if (!shift && knownShifts.includes(p.toLowerCase())) {
      shift = p.toLowerCase() === "dia" ? "day" : "night";
    } else if (!paymentMethod && knownPaymentMethods.includes(p.toLowerCase())) {
      const v = p.toLowerCase();
      paymentMethod = v === "transfer" || v === "transferencia" ? "transferencia" : v === "mixto" ? "mixto" : "efectivo";
    } else if (!idiom && knownLanguages.includes(p.toLowerCase())) {
      idiom = p.toLowerCase();
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
    carType ? { carType, carCapacity, color, plate, country, shift, paymentMethod, idiom } : undefined
  );

  if (result.ok) {
    let msg = `✅ Código "${code}" creado para ${name}.`;
    if (phoneArg) msg += ` 📞 ${phoneArg}.`;
    if (carType) msg += ` 🚗 ${carType}${carCapacity ? " " + carCapacity + "p" : ""}.`;
    if (shift) msg += ` ${shift === "day" ? "☀️ Día" : "🌙 Noche"}.`;
    if (paymentMethod) msg += ` 💳 ${paymentMethod}.`;
    if (idiom) msg += ` 🌐 ${idiom}.`;
    if (color) msg += ` 🎨 ${color}.`;
    if (plate) msg += ` 🏷️ ${plate}.`;
    if (country && country !== "AR") msg += ` (${country}).`;
    msg += ` Decile que envíe -activar al bot.`;
    await sendWhatsAppMessage(phone, msg);
  } else {
    await sendWhatsAppMessage(phone, `❌ ${result.error || "Error al crear código."}`);
  }
}

async function handleUpdateChofer(phone: string, text: string): Promise<void> {
  const parts = text.split(/\s+/);
  if (parts.length < 3) {
    await sendWhatsAppMessage(phone, "Usá: .update_chofer CODIGO [NOMBRE] [TIPO SEDAN/SUV/VAN] [PAX 4/6] [TURNO DIA/NOCHE] [PAGO EFECTIVO/TRANSF/MIXTO] [IDIOMA ES/EN/PT] [COLOR] [PATENTE] [PAIS AR/BR/PY]");
    return;
  }

  if (!(await assertAdmin(phone, "actualizar choferes"))) return;

  const code = parts[1].toLowerCase();
  const knownCarTypes = ["sedan", "suv", "van", "pickup"];
  const knownCountries = ["ar", "br", "py"];
  const knownShifts = ["dia", "noche"];
  const knownPaymentMethods = ["efectivo", "transferencia", "transfer", "mixto"];
  const knownLanguages = ["es", "en", "pt"];

  let nameTokens: string[] = [];
  let carType: string | undefined;
  let carCapacity: number | undefined;
  let color: string | undefined;
  let plate: string | undefined;
  let country: string | undefined;
  let shift: string | undefined;
  let paymentMethod: string | undefined;
  let idiom: string | undefined;

  let i = 2;
  while (i < parts.length) {
    const p = parts[i];

    if (!carType && knownCarTypes.includes(p.toLowerCase())) {
      carType = p.toLowerCase();
    } else if (carCapacity === undefined && (p === "4" || p === "6")) {
      carCapacity = parseInt(p);
    } else if (!shift && knownShifts.includes(p.toLowerCase())) {
      shift = p.toLowerCase() === "dia" ? "day" : "night";
    } else if (!paymentMethod && knownPaymentMethods.includes(p.toLowerCase())) {
      const v = p.toLowerCase();
      paymentMethod = v === "transfer" || v === "transferencia" ? "transferencia" : v === "mixto" ? "mixto" : "efectivo";
    } else if (!idiom && knownLanguages.includes(p.toLowerCase())) {
      idiom = p.toLowerCase();
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

  const name = nameTokens.join(" ") || undefined;

  const result = await updateDriverByCode(code, { name, carType, carCapacity, color, plate, country, shift, paymentMethod, idiom });

  if (result.ok) {
    let msg = `✅ Chofer "${code}" actualizado.`;
    if (name) msg += ` Nombre: ${name}.`;
    if (carType) msg += ` ${carType}${carCapacity ? " " + carCapacity + "p" : ""}.`;
    if (shift) msg += ` ${shift === "day" ? "☀️ Día" : "🌙 Noche"}.`;
    if (paymentMethod) msg += ` ${paymentMethod}.`;
    if (idiom) msg += ` ${idiom}.`;
    if (color) msg += ` ${color}.`;
    if (plate) msg += ` Patente: ${plate}.`;
    if (country && country !== "AR") msg += ` (${country}).`;
    await sendWhatsAppMessage(phone, msg);
  } else {
    await sendWhatsAppMessage(phone, `❌ ${result.error || "Error al actualizar chofer."}`);
  }
}

async function handleBajaChofer(phone: string, text: string): Promise<void> {
  const parts = text.split(/\s+/);
  if (parts.length < 2) {
    await sendWhatsAppMessage(phone, "Usá: .baja_chofer CODIGO");
    return;
  }

  if (!(await assertAdmin(phone, "dar de baja choferes"))) return;

  const code = parts[1].toLowerCase();
  const ok = await deactivateDriverByCode(code);
  if (ok) {
    await sendWhatsAppMessage(phone, `✅ Chofer "${code}" dado de baja.`);
  } else {
    await sendWhatsAppMessage(phone, `❌ Código "${code}" no encontrado.`);
  }
}

async function handleSetPaquete(phone: string, text: string): Promise<void> {
  const parts = text.split(/\s+/);
  if (parts.length < 4) {
    await sendWhatsAppMessage(phone, "Usá: .set_paquete CODIGO TIPO MONTO\nTIPO: in_out / three_leg\nEj: .set_paquete cristian in_out 23000");
    return;
  }

  if (!(await assertAdmin(phone, "configurar precios de paquete"))) return;

  const code = parts[1].toLowerCase();
  const packageType = parts[2].toLowerCase();
  const monto = parseInt(parts[3].replace(/[^0-9]/g, ""));

  if (!packageType || !["in_out", "three_leg"].includes(packageType)) {
    await sendWhatsAppMessage(phone, '❌ Tipo inválido. Usá: in_out (2 tramos) o three_leg (3+ tramos).');
    return;
  }

  if (isNaN(monto) || monto <= 0) {
    await sendWhatsAppMessage(phone, "❌ Monto inválido. Debe ser un número positivo (ARS).");
    return;
  }

  const codeEntry = await getDriverCodeByCode(code);
  if (!codeEntry || !codeEntry.phone) {
    await sendWhatsAppMessage(phone, `❌ Código "${code}" no encontrado o el chofer no se registró aún.`);
    return;
  }

  await setPackagePrice(codeEntry.phone, packageType, monto);
  const tipoLabel = packageType === "in_out" ? "2 tramos (IN+OUT)" : "3+ tramos";
  await sendWhatsAppMessage(phone, `✅ Paquete ${tipoLabel} para "${code}": piso $${monto.toLocaleString("es-AR")} por tramo.`);
}

async function handleSetTier(phone: string, text: string): Promise<void> {
  const parts = text.split(/\s+/);
  if (parts.length < 3) {
    await sendWhatsAppMessage(phone, `Usá: .set_tier CODIGO TIER\nTiers: ${TIERS.join(', ')}`);
    return;
  }

  if (!(await assertAdmin(phone, "cambiar tiers"))) return;

  const code = parts[1].toLowerCase();
  const tier = parts[2].toLowerCase();

  if (!TIERS.includes(tier as Tier)) {
    await sendWhatsAppMessage(phone, `❌ Tier inválido. Tiers válidos: ${TIERS.join(', ')}`);
    return;
  }

  const codeEntry = await getDriverCodeByCode(code);
  if (!codeEntry || !codeEntry.phone) {
    await sendWhatsAppMessage(phone, `❌ Código "${code}" no encontrado o el chofer no se registró aún.`);
    return;
  }

  await updateDriverTier(codeEntry.phone, tier);
  const tierLabels: Record<string, string> = { premium: '⭐ Premium', normal: '🔵 Normal', low: '🟢 Low Cost' };
  await sendWhatsAppMessage(phone, `✅ ${tierLabels[tier] || tier} para "${code}".`);
}

async function handleSetMinimo(phone: string, text: string): Promise<void> {
  const parts = text.split(/\s+/);
  if (parts.length < 3) {
    await sendWhatsAppMessage(phone, "Usá: .set_minimo CODIGO MONTO\nPara eliminar el mínimo: .set_minimo CODIGO 0");
    return;
  }

  if (!(await assertAdmin(phone, "configurar mínimos"))) return;

  const code = parts[1].toLowerCase();
  const monto = parseInt(parts[2].replace(/[^0-9]/g, ""));

  const codeEntry = await getDriverCodeByCode(code);
  if (!codeEntry || !codeEntry.phone) {
    await sendWhatsAppMessage(phone, `❌ Código "${code}" no encontrado o el chofer no se registró aún.`);
    return;
  }

  const finalMonto = isNaN(monto) || monto <= 0 ? null : monto;
  await updateDriverMinPayout(codeEntry.phone, finalMonto);
  if (finalMonto) {
    await sendWhatsAppMessage(phone, `✅ Mínimo de $${finalMonto.toLocaleString("es-AR")} para "${code}".`);
  } else {
    await sendWhatsAppMessage(phone, `✅ Mínimo eliminado para "${code}". Usa el piso del tarifario.`);
  }
}

async function handleToggleLowCost(phone: string): Promise<void> {
  const driver = await getDriverByPhone(phone);
  if (!driver) {
    await sendWhatsAppMessage(phone, "❌ No estás registrado como chofer. Usá .registrar-CODIGO primero.");
    return;
  }

  const isLow = driver.tier === 'low';
  const newTier = isLow ? 'normal' : 'low';
  await updateDriverTier(phone, newTier);

  if (newTier === 'low') {
    await sendWhatsAppMessage(phone, "🟢 Ahora sos *Low Cost*. Aceptarás viajes con piso reducido y tendrás prioridad en viajes de margen bajo.");
  } else {
    await sendWhatsAppMessage(phone, "🔵 Ahora sos *Normal*. Participás en viajes con piso estándar.");
  }
}

async function handleSetLanguages(phone: string, text: string): Promise<void> {
  const driver = await getDriverByPhone(phone);
  if (!driver) {
    await sendWhatsAppMessage(phone, "❌ No estás registrado como chofer.");
    return;
  }

  const parts = text.split(/\s+/);
  if (parts.length < 2) {
    const current = driver.languages || "ninguno";
    await sendWhatsAppMessage(phone, `🌐 Tus idiomas: ${current}\n\nPara actualizar: .idiomas es,en,pt`);
    return;
  }

  const langs = parts.slice(1).join(",").toLowerCase().trim();
  await updateDriverLanguages(phone, langs);
  await sendWhatsAppMessage(phone, `✅ Idiomas actualizados: ${langs}`);
}

async function handleToggleGuide(phone: string): Promise<void> {
  const driver = await getDriverByPhone(phone);
  if (!driver) {
    await sendWhatsAppMessage(phone, "❌ No estás registrado como chofer.");
    return;
  }

  const newVal = !driver.is_guide;
  await updateDriverGuide(phone, newVal);
  if (newVal) {
    await sendWhatsAppMessage(phone, "✅ Registrado como guía. Podés optar a la categoría Premium si cumplís los demás requisitos.");
  } else {
    await sendWhatsAppMessage(phone, "❌ Desactivado modo guía.");
  }
}


async function handleSearchTariffs(phone: string, text: string): Promise<void> {
  const parts = text.split(/\s+/);
  if (parts.length < 2) {
    await sendWhatsAppMessage(phone, "Usá: .tarifas PALABRA_CLAVE\nEj: .tarifas aeropuerto");
    return;
  }

  const query = parts.slice(1).join(" ");
  const results = await searchTariffs(query);
  if (results.length === 0) {
    await sendWhatsAppMessage(phone, `❌ No se encontraron tarifas para "${query}".`);
    return;
  }

  let msg = `📋 *Tarifas encontradas:*\n`;
  for (const t of results.slice(0, 10)) {
    msg += `\n#${t.id} ${t.origin} → ${t.destination}`;
    msg += `\n   4p: $${t.price_4p.toLocaleString("es-AR")} | 6p: $${t.price_6p.toLocaleString("es-AR")}`;
  }
  if (results.length > 10) msg += `\n... y ${results.length - 10} más. Usá una búsqueda más específica.`;
  await sendWhatsAppMessage(phone, msg);
}
