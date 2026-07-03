/**
 * TARIFARIO-CRUD.ts
 *
 * Lee TARIFARIO TRASLADOS.xlsx, clasifica cada fila en:
 *   - Solo ida       → tariffs  (one-way)
 *   - Ida y Vuelta   → tours    (round_trip con espera)
 *   - Adicional      → waiting_rates
 *
 * Uso:
 *   npx tsx scripts/tarifario-crud.ts [--dry-run]
 *
 * --dry-run: muestra que se insertaría sin modificar la DB.
 * Sin flag: ejecuta los INSERTs contra Turso.
 */

import { createRequire } from "module";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env BEFORE any other module that reads process.env
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = val;
    }
  }
} catch {
  console.warn("⚠ No se pudo leer .env");
}

const XLSX = createRequire(import.meta.url)("xlsx");
import { ensureSchema, getDb } from "../src/lib/db/core/connection";
import { queryOne } from "../src/lib/db/core/helpers";
import { insertTour } from "../src/lib/db/domains/tours";
import { insertWaitingRate } from "../src/lib/db/domains/waitingRates";

// ============================================================
// 1. MAPPING: texto Excel → IDs de base de datos
// ============================================================

/**
 * Resuelve el origen "Puerto Iguazú" a zone/place según especificación.
 */
function resolveOrigin(
  origen: string,
  especificacion: string | null,
): { placeId: string | null; zoneId: string | null } {
  const o = (origen ?? "").trim().toLowerCase();

  if (o === "puerto iguazú" || o === "puerto iguazu") {
    const esp = (especificacion ?? "").trim().toLowerCase();

    // "excepto" → excluye esas zonas → ACCESO_RUTA12 (no FONDO)
    if (esp.includes("excepto")) {
      return { placeId: null, zoneId: "ACCESO_RUTA12" };
    }
    if (esp.includes("awasi") || esp.includes("loi") || esp.includes("village")) {
      return { placeId: null, zoneId: "600HAS_FONDO" };
    }
    if (esp.includes("600 hectáreas") || esp.includes("600 hectareas")) {
      return { placeId: null, zoneId: "ACCESO_RUTA12" };
    }
    if (esp.includes("zona centro")) {
      return { placeId: "ar_centro_iguazu_area", zoneId: "CENTRO" };
    }
    if (esp.includes("acceso ruta 12") || esp.includes("guira oga") || esp.includes("aripuca")) {
      return { placeId: null, zoneId: "ACCESO_RUTA12" };
    }

    // Default: Puerto Iguazú centro
    return { placeId: "ar_centro_iguazu_area", zoneId: "CENTRO" };
  }

  if (o.includes("aeropuerto igr") || o.includes("aeropuerto de puerto iguazú")) {
    return { placeId: "ar_igr_airport", zoneId: "AEROPUERTO_IGR" };
  }

  return { placeId: null, zoneId: null };
}

interface DestMapping {
  placeId?: string;
  zoneId?: string;
  crossesBorder: boolean;
}

/**
 * Mapa: texto exacto de destino en Excel → IDs de base de datos.
 * Se matchea normalized (lowercase, sin acentos).
 */
const DESTINATION_MAP: Record<string, DestMapping> = {
  // === BRASIL ===
  "aduana de foz":              { placeId: "aduana_br", crossesBorder: true },
  "hotel belmond":              { placeId: "br_belmond_hotel", crossesBorder: true },
  "zona de hotel recanto / mabu / rafain palace":
                                { zoneId: "FOZ_CORREDOR_INICIAL", crossesBorder: true },
  "itaipú":                     { placeId: "br_itaipu_attraction", crossesBorder: true },
  "itaipú y alrededores":       { placeId: "br_itaipu_attraction", crossesBorder: true },
  "aeropuerto foz (igu)":       { placeId: "br_igu_airport", crossesBorder: true },
  "aeropuerto de foz (igu)":    { placeId: "br_igu_airport", crossesBorder: true },
  "terminal foz (urbana) / rodoviaria foz":
                                { placeId: "br_centro_foz_area", crossesBorder: true },
  "rodoviaria foz":             { placeId: "br_centro_foz_area", crossesBorder: true },
  "ciudad de foz centro":       { placeId: "br_centro_foz_area", crossesBorder: true },
  "centro de foz":              { placeId: "br_centro_foz_area", crossesBorder: true },
  "cataratas brasil (opcional parque das aves)":
                                { placeId: "br_cataratas_attraction", crossesBorder: true },
  "cataratas br":               { placeId: "br_cataratas_attraction", crossesBorder: true },
  "cataratas brasil + rafain almuerzo":
                                { placeId: "br_cataratas_attraction", crossesBorder: true },
  "represa itaipu + templo budista":
                                { placeId: "br_itaipu_attraction", crossesBorder: true },
  "shopping palladium":         { placeId: "br_centro_foz_area", crossesBorder: true },
  "shopping jl":                { placeId: "br_centro_foz_area", crossesBorder: true },
  "cena show rafain":           { placeId: "br_rafain_palace", crossesBorder: true },
  "marco de las 3 fronteras (br)":
                                { placeId: "br_marco_attraction", crossesBorder: true },
  "yup star (rueda)":           { placeId: "br_centro_foz_area", crossesBorder: true },
  "blue park":                  { placeId: "br_centro_foz_area", crossesBorder: true },
  "cabecera puente amistad":    { zoneId: "ZONE_PY_CABECERA_PUENTE", crossesBorder: true },

  // === PARAGUAY ===
  "ciudad del este hasta km4":  { placeId: "py_centro_cde_area", crossesBorder: true },
  "ciudad del este terminal":   { placeId: "py_centro_cde_area", crossesBorder: true },
  "terminal de ciudad del este": { placeId: "py_centro_cde_area", crossesBorder: true },
  "asunción":                   { zoneId: "ZONE_PY_ASUNCION", crossesBorder: true },
  "tour compras cde":           { placeId: "py_centro_cde_area", crossesBorder: true },
  "tour compras cde + cataratas brasil":
                                { placeId: "py_centro_cde_area", crossesBorder: true },
  "saltos del monday":          { placeId: "py_monday_attraction", crossesBorder: true },

  // === ARGENTINA (locales) ===
  "aeropuerto de puerto iguazú (igr)":
                                { placeId: "ar_igr_airport", crossesBorder: false },
  "cataratas argentinas solo ida":
                                { placeId: "ar_cataratas_attraction", crossesBorder: false },
  "cataratas argentinas":       { placeId: "ar_cataratas_attraction", crossesBorder: false },
  "cataratas ar":               { placeId: "ar_cataratas_attraction", crossesBorder: false },
  "cataratas ar y a ciudad de foz":
                                { placeId: "ar_cataratas_attraction", crossesBorder: true },
  "cataratas ar + cataratas br y a pto iguazú":
                                { zoneId: "CATARATAS", crossesBorder: true },
  "cataratas br y regreso aeropuerto igr":
                                { placeId: "br_cataratas_attraction", crossesBorder: true },
  "cataratas ar y a puerto iguazú":
                                { placeId: "ar_cataratas_attraction", crossesBorder: false },
  "cataratas + minas wanda":    { placeId: "ar_cataratas_attraction", crossesBorder: false },
  "minas de wanda":             { zoneId: "ZONE_AR_LD_WANDA", crossesBorder: false },
  "san ignacio + wanda + yerbatera":
                                { zoneId: "ZONE_AR_LD_SAN_IGNACIO", crossesBorder: false },
  "saltos del mocona":          { zoneId: "ZONE_AR_LD_MOCONA", crossesBorder: false },
  "saltos mbocai":              { zoneId: "ZONE_AR_LD_SOBERBIO", crossesBorder: false },
  "centro puerto iguazú":       { placeId: "ar_centro_iguazu_area", crossesBorder: false },
  "hito 3 fronteras":           { placeId: "ar_hito_attraction", crossesBorder: false },
  "hito 3 foronteras":          { placeId: "ar_hito_attraction", crossesBorder: false },
  "aduana de argentina":        { placeId: "ar_br_border", crossesBorder: false },
  "aduana de argentina con migraciones":
                                { placeId: "ar_br_border", crossesBorder: true },
  "duty free shop":             { placeId: "ar_duty_free_shopping", crossesBorder: false },
  "duty free shop iguazú":      { placeId: "ar_duty_free_shopping", crossesBorder: false },
  "full day":                   { zoneId: "AEROPUERTO_IGR", crossesBorder: true },
  "hotel meliá":                { placeId: "ar_melia_hotel", crossesBorder: false },
  "amerian":                    { placeId: "ar_centro_iguazu_area", crossesBorder: false },
  "puerto / costanera":         { placeId: "ar_centro_iguazu_area", crossesBorder: false },
  "hoteles 600 hectáreas":      { zoneId: "ACCESO_RUTA12", crossesBorder: false },
  "hoteles en zona tupá lodge, barrio santa rosa":
                                { zoneId: "ZONE_IGR_SANTA_ROSA_TUPA", crossesBorder: false },
  "hoteles en zona tupa lodge, barrio santa rosa":
                                { zoneId: "ZONE_IGR_SANTA_ROSA_TUPA", crossesBorder: false },
  "hoteles 600 hectareas":      { zoneId: "ACCESO_RUTA12", crossesBorder: false },
  "puerto iguazú centro":       { placeId: "ar_centro_iguazu_area", crossesBorder: false },

  // === ARGENTINA (larga distancia) ===
  "puerto libertad":            { zoneId: "ZONE_AR_LD_PTO_LIBERTAD", crossesBorder: false },
  "wanda":                      { zoneId: "ZONE_AR_LD_WANDA", crossesBorder: false },
  "esperanza":                  { zoneId: "ZONE_AR_LD_ESPERANZA", crossesBorder: false },
  "eldorado":                   { zoneId: "ZONE_AR_LD_ELDORADO", crossesBorder: false },
  "san ignacio":                { zoneId: "ZONE_AR_LD_SAN_IGNACIO", crossesBorder: false },
  "posadas":                    { zoneId: "ZONE_AR_LD_POSADAS", crossesBorder: false },
  "el soberbio":                { zoneId: "ZONE_AR_LD_SOBERBIO", crossesBorder: false },

  // === ACCESO RUTA 12 (IDA SOLO desde origen con especificacion) ===
  "acceso ruta 12: guira oga / aripuca / bar hielo / holetes":
                                { zoneId: "ACCESO_RUTA12", crossesBorder: false },
  "hoteles 600 hectareas":      { zoneId: "ACCESO_RUTA12", crossesBorder: false },
};

/**
 * Mapa normalizado (sin acentos) para lookup rápido.
 */
const NORMALIZED_DEST_MAP: Record<string, DestMapping> = {};
for (const [key, val] of Object.entries(DESTINATION_MAP)) {
  const nk = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  NORMALIZED_DEST_MAP[nk] = val;
}

/**
 * Busca el destino en el mapa normalizando el texto.
 */
function resolveDestination(rawDest: string): DestMapping | null {
  const key = rawDest.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Try exact match first
  if (NORMALIZED_DEST_MAP[key]) return NORMALIZED_DEST_MAP[key];

  // Try prefix match (e.g. "Ciudad del Este hasta KM4" contains "ciudad del este hasta km4")
  for (const [pattern, mapping] of Object.entries(NORMALIZED_DEST_MAP)) {
    if (key.includes(pattern) || pattern.includes(key)) return mapping;
  }

  return null;
}

// ============================================================
// 2. ZONAS/LUGARES FALTANTES a crear
// ============================================================

const MISSING_ZONES: { zone_id: string; zone_name: string; country: string }[] = [
  { zone_id: "ZONE_FOZ_ADUANA_BR",   zone_name: "Aduana de Foz (lado BR)",       country: "BR" },
  { zone_id: "ZONE_PY_ASUNCION",     zone_name: "Asunción",                       country: "PY" },
  { zone_id: "ZONE_PY_CABECERA_PUENTE", zone_name: "Cabecera Puente de la Amistad", country: "PY" },
  { zone_id: "ZONE_AR_LD_POSADAS",   zone_name: "Posadas",                        country: "AR" },
  { zone_id: "ZONE_AR_LD_ELDORADO",  zone_name: "Eldorado",                       country: "AR" },
  { zone_id: "ZONE_AR_LD_PTO_LIBERTAD", zone_name: "Puerto Libertad",             country: "AR" },
  { zone_id: "ZONE_AR_LD_WANDA",     zone_name: "Wanda",                          country: "AR" },
  { zone_id: "ZONE_AR_LD_ESPERANZA", zone_name: "Esperanza",                      country: "AR" },
  { zone_id: "ZONE_AR_LD_SOBERBIO",  zone_name: "El Soberbio",                    country: "AR" },
  { zone_id: "ZONE_AR_LD_MOCONA",    zone_name: "Saltos del Moconá",              country: "AR" },
  { zone_id: "ZONE_AR_LD_SAN_IGNACIO", zone_name: "San Ignacio Miní",             country: "AR" },
  { zone_id: "ZONE_IGR_SANTA_ROSA_TUPA", zone_name: "Santa Rosa / Tupá Lodge",   country: "AR" },
];

const MISSING_PLACES: { place_id: string; canonical_name: string; zone_id: string; country: string }[] = [
  { place_id: "aduana_br", canonical_name: "Aduana de Foz (lado BR)", zone_id: "ZONE_FOZ_ADUANA_BR", country: "BR" },
];

// ============================================================
// 3. CLASIFICACIÓN DE FILAS
// ============================================================

interface ParsedRow {
  excelRow: number;
  tipo: string;
  origen: string;
  espec: string | null;
  destino: string;
  modalidad: string;
  price4p: number;
  price6p: number;
  driverPrice4p: number | null;
  driverPrice6p: number | null;
}

interface TariffAction {
  type: "tariff";
  originText: string;
  destText: string;
  originPlaceId: string | null;
  originZoneId: string | null;
  destPlaceId: string | null;
  destZoneId: string | null;
  publicPrice4p: number;
  publicPrice6p: number;
  driverPrice4p: number;
  driverPrice6p: number;
  crossesBorder: boolean;
  modality: string;
}

interface TourAction {
  type: "tour";
  name: string;
  tripType: "round_trip" | "tour";
  originPlaceId: string | null;
  originZoneId: string | null;
  destPlaceId: string | null;
  destZoneId: string | null;
  waitHours: number;
  price4p: number;
  price6p: number;
  driverPrice4p: number;
  driverPrice6p: number;
  crossesBorder: boolean;
}

interface WaitingRateAction {
  type: "waiting_rate";
  zoneId: string;
  country: "AR" | "BR" | "PY";
  pricePerHour4p: number;
  pricePerHour6p: number;
}

type Action = TariffAction | TourAction | WaitingRateAction;

function classifyRow(row: ParsedRow): Action | null {
  // === ADICIONAL → waiting_rates (check BEFORE destination resolution) ===
  if (row.modalidad.toLowerCase().includes("adicional")) {
    const destLower = row.destino.toLowerCase();
    const country = row.tipo.includes("(Br)") || destLower.includes("(br)") ? "BR" as const
                  : row.tipo.includes("(Py)") || destLower.includes("(py)") ? "PY" as const
                  : row.tipo.includes("(Arg)") || destLower.includes("(arg)") ? "AR" as const
                  : "AR" as const;

    // Try to resolve zone from destino text (e.g. "Hoteles en Zona Tupá...")
    const destMap = resolveDestination(row.destino);
    const zoneId = destMap?.zoneId ?? destMap?.placeId ?? "CENTRO";

    return {
      type: "waiting_rate",
      zoneId,
      country,
      pricePerHour4p: row.price4p,
      pricePerHour6p: row.price6p,
    };
  }

  // === ORIGEN: saltar filas sin origen ===
  if (!row.origen) {
    console.warn(`  ⚠ Fila ${row.excelRow}: origen vacío — se omite`);
    return null;
  }

  // === DESTINO: resolver ===
  const dest = resolveDestination(row.destino);
  if (!dest) {
    console.warn(`  ⚠ Fila ${row.excelRow}: destino no mapeado "${row.destino}" — se omite`);
    return null;
  }

  const origin = resolveOrigin(row.origen, row.espec);
  if (!origin.placeId && !origin.zoneId) {
    console.warn(`  ⚠ Fila ${row.excelRow}: origen no mapeado "${row.origen}" — se omite`);
    return null;
  }

  const d4p = row.driverPrice4p ?? Math.round((row.price4p ?? 0) * 0.75);
  const d6p = row.driverPrice6p ?? Math.round((row.price6p ?? 0) * 0.75);

  // === IDA Y VUELTA → tours ===
  const modLower = row.modalidad.toLowerCase();
  if (modLower.includes("ida y vuelta") || modLower.includes("tour")) {
    const isRoundTrip = modLower.includes("2 tramos");
    // wait_hours: default 2 para round_trip simple, 3 para tour con espera
    return {
      type: "tour",
      name: `Desde ${row.origen} hasta ${row.destino}`,
      tripType: isRoundTrip ? "round_trip" : "tour",
      originPlaceId: origin.placeId,
      originZoneId: origin.zoneId,
      destPlaceId: dest.placeId ?? null,
      destZoneId: dest.zoneId ?? null,
      waitHours: isRoundTrip ? 2 : 3,
      price4p: row.price4p,
      price6p: row.price6p,
      driverPrice4p: d4p,
      driverPrice6p: d6p,
      crossesBorder: dest.crossesBorder,
    };
  }

  // === SOLO IDA → tariffs ===
  if (modLower.includes("solo ida") || modLower === "") {
    return {
      type: "tariff",
      originText: row.origen,
      destText: row.destino,
      originPlaceId: origin.placeId,
      originZoneId: origin.zoneId,
      destPlaceId: dest.placeId ?? null,
      destZoneId: dest.zoneId ?? null,
      publicPrice4p: row.price4p,
      publicPrice6p: row.price6p,
      driverPrice4p: d4p,
      driverPrice6p: d6p,
      crossesBorder: dest.crossesBorder,
      modality: "one_way",
    };
  }

  console.warn(`  ⚠ Fila ${row.excelRow}: modalidad desconocida "${row.modalidad}" — se omite`);
  return null;
}

// ============================================================
// 4. MUESTRA PREVIA / EJECUCIÓN
// ============================================================

function showPreview(actions: Action[]): void {
  const tariffs = actions.filter((a): a is TariffAction => a.type === "tariff");
  const tours = actions.filter((a): a is TourAction => a.type === "tour");
  const rates = actions.filter((a): a is WaitingRateAction => a.type === "waiting_rate");

  console.log("\n========== VISTA PREVIA ==========\n");
  console.log(`Total acciones: ${actions.length}`);
  console.log(`  tariffs:       ${tariffs.length}`);
  console.log(`  tours:         ${tours.length}`);
  console.log(`  waiting_rates: ${rates.length}\n`);

  if (tariffs.length > 0) {
    console.log("--- TARIFFS (one-way) ---");
    for (const t of tariffs) {
      console.log(`  INSERT tariff: ${t.originPlaceId ?? t.originZoneId} → ${t.destPlaceId ?? t.destZoneId} | 4p:${t.publicPrice4p} 6p:${t.publicPrice6p} driver4p:${t.driverPrice4p} driver6p:${t.driverPrice6p} cb:${t.crossesBorder}`);
    }
  }

  if (tours.length > 0) {
    console.log("\n--- TOURS ---");
    for (const t of tours) {
      console.log(`  INSERT tour: "${t.name}" type=${t.tripType} wait=${t.waitHours}h | ${t.originPlaceId ?? t.originZoneId} → ${t.destPlaceId ?? t.destZoneId} | 4p:${t.price4p} 6p:${t.price6p}`);
    }
  }

  if (rates.length > 0) {
    console.log("\n--- WAITING RATES ---");
    for (const r of rates) {
      console.log(`  INSERT waiting_rate: zone=${r.zoneId} country=${r.country} 4p/h:${r.pricePerHour4p} 6p/h:${r.pricePerHour6p}`);
    }
  }
}

async function executeActions(actions: Action[]): Promise<void> {
  await ensureSchema();
  const db = getDb();

  console.log("\n========== EJECUTANDO ==========\n");

  // Step 1: Crear zonas faltantes
  for (const z of MISSING_ZONES) {
    try {
      await db.execute({
        sql: "INSERT OR IGNORE INTO zones (zone_id, zone_name, country) VALUES (?, ?, ?)",
        args: [z.zone_id, z.zone_name, z.country],
      });
      console.log(`  ✅ zone ${z.zone_id}`);
    } catch (e) {
      console.error(`  ❌ zone ${z.zone_id}: ${e}`);
    }
  }

  for (const p of MISSING_PLACES) {
    try {
      await db.execute({
        sql: "INSERT OR IGNORE INTO places (place_id, canonical_name, zone_id, country, place_type) VALUES (?, ?, ?, ?, 'other')",
        args: [p.place_id, p.canonical_name, p.zone_id, p.country],
      });
      console.log(`  ✅ place ${p.place_id}`);
    } catch (e) {
      console.error(`  ❌ place ${p.place_id}: ${e}`);
    }
  }

  // Step 2: Tarifas
  let tariffCount = 0;
  let tourCount = 0;
  let rateCount = 0;

  for (const a of actions) {
    try {
      if (a.type === "tariff") {
        // Check if already exists (same place→place or zone→zone with same prices)
        const existing = await queryOne<{ id: number }>(
          `SELECT id FROM tariffs WHERE active = 1
           AND origin_place_id IS ? AND destination_place_id IS ?
           AND origin_zone_id IS ? AND destination_zone_id IS ?
           AND public_price_4p = ? AND public_price_6p = ?
           LIMIT 1`,
          [a.originPlaceId, a.destPlaceId, a.originZoneId, a.destZoneId,
           a.publicPrice4p, a.publicPrice6p],
        );

        if (existing) {
          console.log(`  ⏭ tariff already exists: id=${existing.id} ${a.originText}→${a.destText}`);
        } else {
          // Find matching row: first by place/zone IDs, then by text origin/destination
          const originName = a.originText ?? a.originPlaceId ?? a.originZoneId ?? "unknown";
          const destName = a.destText ?? a.destPlaceId ?? a.destZoneId ?? "unknown";

          let matchRow = await queryOne<{ id: number }>(
            `SELECT id FROM tariffs WHERE active = 1
             AND origin_place_id IS ? AND destination_place_id IS ?
             AND origin_zone_id IS ? AND destination_zone_id IS ?
             LIMIT 1`,
            [a.originPlaceId, a.destPlaceId, a.originZoneId, a.destZoneId],
          );

          if (!matchRow) {
            // Try matching by text origin/destination (for existing legacy rows without geo IDs)
            matchRow = await queryOne<{ id: number }>(
              `SELECT id FROM tariffs WHERE active = 1
               AND LOWER(origin) = LOWER(?) AND LOWER(destination) = LOWER(?)
               LIMIT 1`,
              [originName, destName],
            );
          }

          // Compute resolution_priority based on specificity
          const isPlace = a.originPlaceId && a.destPlaceId;
          const isZoneOrigin = a.originZoneId && !a.originPlaceId;
          let priority = 4; // zone→zone
          if (isPlace && a.destPlaceId) priority = 1; // place→place
          else if (isPlace) priority = 2; // place→zone
          else if (isZoneOrigin && a.destPlaceId) priority = 3; // zone→place

          if (matchRow) {
            // Update prices and geo IDs
            await db.execute({
              sql: `UPDATE tariffs SET
                    origin_place_id = ?, destination_place_id = ?,
                    origin_zone_id = ?, destination_zone_id = ?,
                    resolution_priority = ?,
                    public_price_4p = ?, public_price_6p = ?,
                    driver_price_4p = ?, driver_price_6p = ?,
                    crosses_border = ?, modality = ?
                    WHERE id = ?`,
              args: [a.originPlaceId, a.destPlaceId, a.originZoneId, a.destZoneId,
                     priority,
                     a.publicPrice4p, a.publicPrice6p, a.driverPrice4p, a.driverPrice6p,
                     a.crossesBorder ? 1 : 0, a.modality, matchRow.id],
            });
            console.log(`  🔄 updated tariff id=${matchRow.id}: ${originName}→${destName} (${a.publicPrice4p}/${a.publicPrice6p})`);
          } else {
            // No matching row — insert new

            await db.execute({
              sql: `INSERT OR IGNORE INTO tariffs (origin, destination, origin_place_id, destination_place_id, origin_zone_id, destination_zone_id,
                    public_price_4p, public_price_6p, driver_price_4p, driver_price_6p,
                    crosses_border, modality, resolution_priority, active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
              args: [originName, destName,
                     a.originPlaceId, a.destPlaceId, a.originZoneId, a.destZoneId,
                     a.publicPrice4p, a.publicPrice6p, a.driverPrice4p, a.driverPrice6p,
                     a.crossesBorder ? 1 : 0, a.modality, priority],
            });
            console.log(`  ✅ INSERT tariff: ${a.originPlaceId ?? a.originZoneId}→${a.destPlaceId ?? a.destZoneId}`);
          }
          tariffCount++;
        }
      } else if (a.type === "tour") {
        // Check if tour already exists with same origin+destination and trip_type
        const existingTour = await queryOne<{ id: number }>(
          `SELECT id FROM tours WHERE active = 1
           AND origin_place_id IS ? AND destination_place_id IS ?
           AND origin_zone_id IS ? AND destination_zone_id IS ?
           AND trip_type = ? AND price_4p = ? AND price_6p = ?
           LIMIT 1`,
          [a.originPlaceId, a.destPlaceId, a.originZoneId, a.destZoneId,
           a.tripType, a.price4p, a.price6p],
        );

        if (existingTour) {
          console.log(`  ⏭ tour already exists: id=${existingTour.id} "${a.name}"`);
        } else {
          await insertTour({
            name: a.name,
            trip_type: a.tripType,
            origin_place_id: a.originPlaceId,
            origin_zone_id: a.originZoneId,
            destination_place_id: a.destPlaceId,
            destination_zone_id: a.destZoneId,
            wait_hours: a.waitHours,
            price_4p: a.price4p,
            price_6p: a.price6p,
            driver_price_4p: a.driverPrice4p,
            driver_price_6p: a.driverPrice6p,
            crosses_border: a.crossesBorder ? 1 : 0,
          });
          console.log(`  ✅ INSERT tour: "${a.name}"`);
          tourCount++;
        }
      } else if (a.type === "waiting_rate") {
        const existing = await queryOne<{ id: number }>(
          "SELECT id FROM waiting_rates WHERE zone_id = ? AND country = ? AND active = 1 LIMIT 1",
          [a.zoneId, a.country],
        );
        if (existing) {
          await db.execute({
            sql: "UPDATE waiting_rates SET price_per_hour_4p = ?, price_per_hour_6p = ? WHERE id = ?",
            args: [a.pricePerHour4p, a.pricePerHour6p, existing.id],
          });
          console.log(`  🔄 updated waiting_rate: ${a.zoneId}/${a.country}`);
        } else {
          await insertWaitingRate({
            zone_id: a.zoneId,
            country: a.country,
            price_per_hour_4p: a.pricePerHour4p,
            price_per_hour_6p: a.pricePerHour6p,
          });
          console.log(`  ✅ INSERT waiting_rate: ${a.zoneId}/${a.country}`);
        }
        rateCount++;
      }
    } catch (e) {
      console.error(`  ❌ error processing action: ${e}`);
    }
  }

  console.log(`\n✅ Resumen: ${tariffCount} tarifas, ${tourCount} tours, ${rateCount} waiting_rates`);
}

// ============================================================
// 5. MAIN
// ============================================================

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  const filePath = "D:\\arauj\\Documents\\PROYECTOS\\GuazuTransfer-Web\\TARIFARIO TRASLADOS.xlsx";
  console.log(`Leyendo ${filePath}...`);

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

  const rows: ParsedRow[] = [];
  let skippedHeader = 0;

  for (const raw of rawData) {
    const id = raw["ID"];
    // Skip header and empty rows
    if (id === "ID" || id == null || typeof id !== "number") {
      skippedHeader++;
      continue;
    }

    const destino = String(raw["Destino"] ?? "").trim();
    if (!destino) {
      skippedHeader++;
      continue;
    }

    rows.push({
      excelRow: id,
      tipo: String(raw["Tipo"] ?? ""),
      origen: String(raw["Origen"] ?? ""),
      espec: raw["Origen: especificación"] ? String(raw["Origen: especificación"]) : null,
      destino,
      modalidad: String(raw["Modalidad"] ?? ""),
      price4p: Number(raw["Precio_4_PAX"] ?? 0),
      price6p: Number(raw["Precio_6_PAX"] ?? 0),
      driverPrice4p: raw["Precio_Chofer_4_PAX"] != null ? Number(raw["Precio_Chofer_4_PAX"]) : null,
      driverPrice6p: raw["Precio_Chofer_6_PAX"] != null ? Number(raw["Precio_Chofer_6_PAX"]) : null,
    });
  }

  console.log(`Filas procesadas: ${rows.length} (${skippedHeader} saltadas)\n`);

  const actions: Action[] = [];

  for (const row of rows) {
    const action = classifyRow(row);
    if (action) actions.push(action);
  }

  if (isDryRun) {
    showPreview(actions);
    console.log("\n🔹 Modo dry-run — no se modificó la DB.");
    console.log("🔹 Ejecutar sin --dry-run para aplicar los cambios.");
  } else {
    showPreview(actions);
    console.log("");
    const answer = "si"; // En un script interactivo se preguntaría, pero asumimos aprobación
    if (answer === "si") {
      await executeActions(actions);
    } else {
      console.log("❌ Cancelado por el usuario.");
    }
  }
}

main().catch(console.error);
