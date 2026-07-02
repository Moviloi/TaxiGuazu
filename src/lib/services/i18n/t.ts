// t() — Función de traducción simple.
// Uso: t("greeting.intro", lang) o t("price.quote", lang, { origin: "IGR", dest: "Centro", price: "15000" })
//
// lookup: key → lang → string | function
// fallback: catalán → español si no hay traducción para el idioma solicitado

import type { Lang } from "@/lib/ai/types";
import { CATALOG, type CatalogEntry } from "./catalog";

export function t(key: string, lang: Lang, params?: Record<string, string>): string {
  const entry: CatalogEntry | undefined = (CATALOG as Record<string, CatalogEntry>)[key];
  if (!entry) {
    // En desarrollo, el key faltante es visible; en producción se cae a español
    if (process.env.NODE_ENV === "development") {
      console.warn(`[i18n] MISSING KEY: ${key}`);
    }
    return `[${key}]`;
  }

  const raw = entry[lang] ?? entry.es;
  if (raw === undefined) {
    return `[${key}:${lang}]`;
  }

  if (typeof raw === "function") {
    return raw(params ?? {});
  }

  if (!params) return raw;

  return Object.entries(params).reduce(
    (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, "g"), v),
    raw,
  );
}
