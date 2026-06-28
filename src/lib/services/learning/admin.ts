import { insertF9AdminCommand } from "@/lib/db/database";
import { setWeight } from "./learning-utils";

export type AdminAction = "update_price" | "reclassify_entity";

export interface ParsedAdminCommand {
  action: AdminAction;
  target: string;
  value: unknown;
}

const PRICE_RE = /^nuevo precio\s+(.+?)\s*=\s*(\d+)\s*$/i;
const CLASSIFY_RE = /^(.+?)\s+es\s+(.+?),\s*(?:no\s+)?(.+)$/i;

export function parseAdminCommand(text: string): ParsedAdminCommand | null {
  const priceMatch = text.match(PRICE_RE);
  if (priceMatch) {
    return { action: "update_price", target: priceMatch[1].trim().toLowerCase(), value: Number(priceMatch[2]) };
  }

  const classifyMatch = text.match(CLASSIFY_RE);
  if (classifyMatch) {
    return { action: "reclassify_entity", target: classifyMatch[1].trim().toLowerCase(), value: { domain: classifyMatch[2].trim(), not: classifyMatch[3]?.trim() } };
  }

  return null;
}

export async function executeAdminCommand(
  parsed: ParsedAdminCommand,
  author: string,
): Promise<{ ok: boolean; message: string }> {
  const commandText = JSON.stringify(parsed);

  await insertF9AdminCommand(commandText, parsed.action, author);

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
    default:
      return { ok: false, message: `Acción desconocida: ${parsed.action}` };
  }
}

export function isAdminCommand(text: string): boolean {
  return !!(text.match(PRICE_RE) || text.match(CLASSIFY_RE));
}
