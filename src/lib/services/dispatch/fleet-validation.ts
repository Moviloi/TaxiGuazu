// FLEET VALIDATION — frozen. ARCHITECTURE NOTE: Módulo congelado.
// No modificar. Valida capacidad de flota antes de aceptar un booking.
// Cualquier cambio requiere aprobación de arquitectura.

import { getMaxFleetCapacity, validateFleetCanHandle, insertMessage } from "@/lib/db/database";
import { sendWhatsAppMessage } from "@/lib/sender";
import { notifyAdmin } from "@/lib/services/admin/admin.service";
import { buildFleetCapacityMessage, buildFleetTariffMessage } from "@/lib/ai/response-builder";
import { resolveTariff } from "@/lib/services/pricing/tariff-resolver";
import { log } from "@/lib/utils/logger";

export interface FleetValidationContext {
  phone: string;
  convId: number;
  origin?: string | null;
  destination?: string | null;
  source?: string;
}

export interface FleetValidationResult {
  ok: boolean;
  maxCapacity: number | null;
  rejected: boolean;
  reason?: "no_capacity" | "no_tariff" | "no_fleet";
}

const TARIFF_MAX_PAX = 6;

async function rejectAndNotify(
  pax: number,
  context: FleetValidationContext,
  reason: FleetValidationResult["reason"],
  clientMsg: string,
  logEvent: string,
  extraLogFields: Record<string, unknown> = {}
): Promise<FleetValidationResult> {
  await sendWhatsAppMessage(context.phone, clientMsg);
  await insertMessage(context.convId, "assistant", clientMsg);

  const max = await getMaxFleetCapacity();
  log.info(JSON.stringify({
    event: logEvent,
    requested_pax: pax,
    max_pax: max,
    phone: `******${context.phone.slice(-4)}`,
    conv_id: context.convId,
    source: context.source ?? "unknown",
    reason,
    timestamp: Math.floor(Date.now() / 1000),
    ...extraLogFields,
  }));

  return { ok: false, maxCapacity: max, rejected: true, reason };
}

export async function ensureFleetCanHandle(
  pax: number,
  context: FleetValidationContext
): Promise<FleetValidationResult> {
  if (!Number.isFinite(pax) || pax <= 0) {
    return { ok: true, maxCapacity: await getMaxFleetCapacity(), rejected: false };
  }

  const fleet = await validateFleetCanHandle(pax);

  if (!fleet.ok) {
    if (fleet.max === null) {
      const clientMsg = buildFleetCapacityMessage(null);
      await rejectAndNotify(pax, context, "no_fleet", clientMsg, "fleet_capacity_exceeded");
      await notifyAdmin(`🚨 *FLOTA SIN VEHÍCULOS CONFIGURADOS*

No hay conductores activos con car_capacity configurada.
Bloqueada la creación de un viaje de ${pax} pasajeros para ${context.phone}.
Origen: ${context.origin ?? "?"} → ${context.destination ?? "?"}

Revisar inventario de choferes y completar capacidades en la base.`);
    } else {
      const clientMsg = buildFleetCapacityMessage(fleet.max);
      await rejectAndNotify(pax, context, "no_capacity", clientMsg, "fleet_capacity_exceeded");
      await notifyAdmin(`⚠️ *CAPACIDAD INSUFICIENTE*

Cliente ${context.phone} solicitó ${pax} pasajeros.
Capacidad máxima activa: ${fleet.max} pasajeros.
Origen: ${context.origin ?? "?"} → ${context.destination ?? "?"}
Reasignar manualmente o coordinar vehículo de mayor capacidad.`);
    }
    return { ok: false, maxCapacity: fleet.max, rejected: true, reason: fleet.max === null ? "no_fleet" : "no_capacity" };
  }

  if (pax > TARIFF_MAX_PAX || (context.origin && context.destination)) {
    if (pax > TARIFF_MAX_PAX) {
      const clientMsg = buildFleetTariffMessage();
      await rejectAndNotify(pax, context, "no_tariff", clientMsg, "missing_capacity_tariff");
      await notifyAdmin(`⚠️ *TARIFA FALTANTE PARA CAPACIDAD SOLICITADA*

Cliente ${context.phone} solicitó ${pax} pasajeros.
Origen: ${context.origin ?? "?"} → ${context.destination ?? "?"}
La tabla tariffs actual solo admite hasta ${TARIFF_MAX_PAX} pasajeros. Configurar tarifa para ${pax} pax o rechazar.`);
      return { ok: false, maxCapacity: fleet.max, rejected: true, reason: "no_tariff" };
    }

    if (context.origin && context.destination) {
      const match = await resolveTariff(context.origin, context.destination, pax);
      if (!match.matched) {
        const clientMsg = buildFleetTariffMessage();
        await rejectAndNotify(pax, context, "no_tariff", clientMsg, "missing_capacity_tariff");
        await notifyAdmin(`⚠️ *TARIFA FALTANTE*

Cliente ${context.phone} solicitó ${pax} pasajeros.
Origen: ${context.origin} → ${context.destination}
No existe tarifa configurada para esta ruta. Configurar manualmente.`);
        return { ok: false, maxCapacity: fleet.max, rejected: true, reason: "no_tariff" };
      }
    }
  }

  return { ok: true, maxCapacity: fleet.max, rejected: false };
}

