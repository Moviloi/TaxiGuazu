// F9: DRIFT DETECTION & LEARNING — frozen (FASE A). Pipeline experimental F7→F8→F9.
// FUTURE RESPONSIBILITY: Detectar drift en predicciones y aprendizaje.
// CURRENT STATUS: Cableado en learning-pipeline.service.ts como pipeline bloqueado. f9-index.ts
//   orquesta housekeeping (limpieza de tablas). No modificar.
// MIGRATION NOTE: Deshabilitar perdería limpieza de tablas. Bloqueado hasta
//   Conversation Core + Pricing + Geo congelados.

import { getDbInstance } from "@/lib/db/database";
import { adjustWeight, setWeight } from "./f6-learning";
import type { AdminCommandAction } from "./f9-types";

const PRICE_RE = /^nuevo precio\s+(.+?)\s*=\s*(\d+)\s*$/i;
const CLASSIFY_RE = /^(.+?)\s+es\s+(.+?),\s*(?:no\s+)?(.+)$/i;
const POLICY_RE = /^bloquear\s+(.+?)\s+en\s+(.+)$/i;
const OPTIMIZE_RE = /^priorizar\s+(.+?)\s+en\s+(.+)$/i;
const WEIGHT_RE = /^ajustar peso\s+(.+?)\s*=\s*(-?\d+\.?\d*)\s*$/i;

export function parseAdminCommand(text: string): { action: AdminCommandAction; target: string; value: unknown } | null {
  const priceMatch = text.match(PRICE_RE);
  if (priceMatch) {
    return { action: "update_price", target: priceMatch[1].trim().toLowerCase(), value: Number(priceMatch[2]) };
  }

  const classifyMatch = text.match(CLASSIFY_RE);
  if (classifyMatch) {
    return { action: "reclassify_entity", target: classifyMatch[1].trim().toLowerCase(), value: { domain: classifyMatch[2].trim(), not: classifyMatch[3]?.trim() } };
  }

  const policyMatch = text.match(POLICY_RE);
  if (policyMatch) {
    return { action: "modify_policy", target: policyMatch[1].trim().toLowerCase(), value: { condition: policyMatch[2].trim(), action: "block" } };
  }

  const optMatch = text.match(OPTIMIZE_RE);
  if (optMatch) {
    return { action: "optimize_routing", target: optMatch[1].trim().toLowerCase(), value: { condition: optMatch[2].trim(), action: "prioritize" } };
  }

  const weightMatch = text.match(WEIGHT_RE);
  if (weightMatch) {
    return { action: "adjust_weight", target: weightMatch[1].trim(), value: Number(weightMatch[2]) };
  }

  return null;
}

export async function executeAdminCommand(
  parsed: { action: AdminCommandAction; target: string; value: unknown },
  author: string,
): Promise<{ ok: boolean; message: string }> {
  const commandText = JSON.stringify(parsed);

  await getDbInstance().execute({
    sql: "INSERT INTO f9_admin_commands (command_text, parsed_action, author, timestamp) VALUES (?, ?, ?, unixepoch())",
    args: [commandText, parsed.action, author],
  });

  switch (parsed.action) {
    case "update_price": {
      await setWeight(`price_factor:${parsed.target}`, Number(parsed.value) / 100);
      return { ok: true, message: `Precio actualizado para "${parsed.target}"` };
    }
    case "reclassify_entity": {
      const v = parsed.value as { domain: string; not: string };
      await setWeight(`entity_domain:${parsed.target}`, 1);
      if (v.not) {
        await setWeight(`entity_exclude:${parsed.target}:${v.not}`, 1);
      }
      return { ok: true, message: `"${parsed.target}" reclasificado como ${v.domain}` };
    }
    case "modify_policy": {
      await setWeight(`policy_block:${parsed.target}`, 1);
      return { ok: true, message: `Política de bloqueo activada para "${parsed.target}"` };
    }
    case "optimize_routing": {
      await adjustWeight(`priority_boost:${parsed.target}`, 1, 0.1);
      return { ok: true, message: `Ruta optimizada: "${parsed.target}" priorizado` };
    }
    case "adjust_weight": {
      await setWeight(parsed.target, Number(parsed.value));
      return { ok: true, message: `Peso "${parsed.target}" = ${parsed.value}` };
    }
    default:
      return { ok: false, message: `Acción desconocida: ${parsed.action}` };
  }
}

export function isAdminCommand(text: string): boolean {
  return !!(text.match(PRICE_RE) || text.match(CLASSIFY_RE) || text.match(POLICY_RE) || text.match(OPTIMIZE_RE) || text.match(WEIGHT_RE));
}
