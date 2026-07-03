// Seed script: adds round_trip entries to `tours` table for common multi-ride routes.
//
// Each round_trip represents a known route where a client can go A→B→A or B→A→B
// with a discounted per-segment price (round_trip_price / 2).
//
// Run: npx tsx scripts/seed-round-trips.ts

import { getDb, ensureSchema } from "@/lib/db/core/connection";
import { query } from "@/lib/db/core/helpers";
import { insertTour } from "@/lib/db/domains/tours";

// ─── 1. Asegurar places que faltan (extraídos de chats reales) ──────────────

const MISSING_PLACES = [
  {
    place_id: "sanma_hotel",
    canonical_name: "Sanma Hotel",
    official_name: "Sanma Hotel",
    google_maps_name: "Sanma Hotel Foz do Iguaçu",
    place_type: "hotel" as const,
    city: "Foz do Iguaçu" as const,
    country: "Brasil" as const,
    display_name: "Sanma Hotel — Rodovia das Cataratas",
    zone_id: "FOZ_HOTEIS",
  },
  {
    place_id: "st_george_hotel",
    canonical_name: "Hotel St George",
    official_name: "Hotel St George",
    google_maps_name: "Hotel St George Puerto Iguazú",
    place_type: "hotel" as const,
    city: "Puerto Iguazú" as const,
    country: "Argentina" as const,
    display_name: "Hotel St George — Centro Puerto Iguazú",
    zone_id: "CENTRO",
  },
  {
    place_id: "viale_tower",
    canonical_name: "Viale Tower Hotel",
    official_name: "Viale Tower Hotel",
    google_maps_name: "Viale Tower Hotel Foz do Iguaçu",
    place_type: "hotel" as const,
    city: "Foz do Iguaçu" as const,
    country: "Brasil" as const,
    display_name: "Viale Tower Hotel — Foz Centro",
    zone_id: "FOZ_CENTRO",
  },
  {
    place_id: "mercure_iru",
    canonical_name: "Mercure Iguazu Hotel Iru",
    official_name: "Mercure Iguazu Hotel Iru",
    google_maps_name: "Mercure Iguazu Hotel Iru",
    place_type: "hotel" as const,
    city: "Puerto Iguazú" as const,
    country: "Argentina" as const,
    display_name: "Mercure Iguazu Hotel Iru",
    zone_id: "CENTRO",
  },
  {
    place_id: "golden_park_internacional",
    canonical_name: "Hotel Golden Park Internacional",
    official_name: "Hotel Golden Park Internacional",
    google_maps_name: "Hotel Golden Park Internacional Foz",
    place_type: "hotel" as const,
    city: "Foz do Iguaçu" as const,
    country: "Brasil" as const,
    display_name: "Hotel Golden Park Internacional — Foz",
    zone_id: "FOZ_CENTRO",
  },
  {
    place_id: "amerian_hotel",
    canonical_name: "Hotel Amerian",
    official_name: "Amerian Portal del Iguazú Hotel",
    google_maps_name: "Amerian Portal del Iguazú",
    place_type: "hotel" as const,
    city: "Puerto Iguazú" as const,
    country: "Argentina" as const,
    display_name: "Hotel Amerian — Puerto Iguazú",
    zone_id: "CENTRO",
  },
  {
    place_id: "grand_carima",
    canonical_name: "Grand Carima Resort",
    official_name: "Grand Carima Resort & Convention Center",
    google_maps_name: "Grand Carima Resort Foz",
    place_type: "resort" as const,
    city: "Foz do Iguaçu" as const,
    country: "Brasil" as const,
    display_name: "Grand Carima Resort — Foz",
    zone_id: "FOZ_AVCATARATAS",
  },
  {
    place_id: "alma_pura",
    canonical_name: "Alma Pura",
    official_name: "Alma Pura Lodge",
    google_maps_name: "Alma Pura Lodge Iguazú",
    place_type: "hotel" as const,
    city: "Puerto Iguazú" as const,
    country: "Argentina" as const,
    display_name: "Alma Pura Lodge",
    zone_id: "CENTRO",
  },
  {
    place_id: "exe_cataratas",
    canonical_name: "Exe Hotel Cataratas",
    official_name: "Exe Hotel Cataratas",
    google_maps_name: "Exe Hotel Cataratas Iguazú",
    place_type: "hotel" as const,
    city: "Puerto Iguazú" as const,
    country: "Argentina" as const,
    display_name: "Exe Hotel Cataratas",
    zone_id: "CENTRO",
  },
];

const ROUND_TRIPS = [
  // Puerto Iguazú Centro ↔ Aduana Argentina
  {
    name: "Puerto Iguazú ↔ Aduana Argentina (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "puerto_iguazu_centro",
    destination_place_id: "aduana_ar",
    wait_hours: 2,
    price_4p: 20000,
    price_6p: 28000,
    driver_price_4p: 12000,
    driver_price_6p: 16000,
    crosses_border: 1,
  },
  // Puerto Iguazú Centro ↔ Aeropuerto IGR
  {
    name: "Puerto Iguazú ↔ Aeropuerto IGR (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "puerto_iguazu_centro",
    destination_place_id: "ar_igr_airport",
    wait_hours: 2,
    price_4p: 20000,
    price_6p: 28000,
    driver_price_4p: 12000,
    driver_price_6p: 16000,
    crosses_border: 0,
  },
  // Puerto Iguazú Centro ↔ Terminal de Ómnibus
  {
    name: "Puerto Iguazú ↔ Terminal (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "puerto_iguazu_centro",
    destination_place_id: "terminal_omnibus",
    wait_hours: 1,
    price_4p: 12000,
    price_6p: 18000,
    driver_price_4p: 8000,
    driver_price_6p: 12000,
    crosses_border: 0,
  },
  // Centro Foz ↔ Puerto Iguazú Centro (transfronterizo común)
  {
    name: "Foz Centro ↔ Puerto Iguazú Centro (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "foz_centro",
    destination_place_id: "puerto_iguazu_centro",
    wait_hours: 2,
    price_4p: 50000,
    price_6p: 70000,
    driver_price_4p: 30000,
    driver_price_6p: 40000,
    crosses_border: 1,
  },
  // Cataratas Argentinas ↔ Aduana (hub discount entre parque y frontera)
  {
    name: "Cataratas Argentinas ↔ Aduana Argentina (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "ar_cataratas_attraction",
    destination_place_id: "aduana_ar",
    wait_hours: 2,
    price_4p: 50000,
    price_6p: 70000,
    driver_price_4p: 30000,
    driver_price_6p: 40000,
    crosses_border: 0,
  },
  // CDE Microcentro ↔ Puerto Iguazú Centro
  {
    name: "CDE ↔ Puerto Iguazú Centro (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "cde_microcentro",
    destination_place_id: "puerto_iguazu_centro",
    wait_hours: 3,
    price_4p: 60000,
    price_6p: 84000,
    driver_price_4p: 35000,
    driver_price_6p: 50000,
    crosses_border: 1,
  },
  // ─── NUEVOS: extraídos de chats reales.docx ────────────────────────────────

  // IGR ↔ Cataratas Argentinas (Craig, Antonio J) — ~50 USD / 70K ARS
  {
    name: "Aeropuerto IGR ↔ Cataratas Argentinas (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "ar_igr_airport",
    destination_place_id: "ar_cataratas_attraction",
    wait_hours: 5,
    price_4p: 70000,
    price_6p: 90000,
    driver_price_4p: 42000,
    driver_price_6p: 54000,
    crosses_border: 0,
  },
  // Centro PI ↔ Cataratas Argentinas (Najum, Danny, Ci) — 60K ARS
  {
    name: "Puerto Iguazú Centro ↔ Cataratas Argentinas (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "puerto_iguazu_centro",
    destination_place_id: "ar_cataratas_attraction",
    wait_hours: 5,
    price_4p: 60000,
    price_6p: 84000,
    driver_price_4p: 36000,
    driver_price_6p: 50000,
    crosses_border: 0,
  },
  // Foz Centro ↔ Cataratas Brasileñas (Ben, Alfon, Andrea) — 500 BRL / ~110K ARS
  {
    name: "Foz Centro ↔ Cataratas Brasileñas (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "foz_centro",
    destination_place_id: "br_cataratas_attraction",
    wait_hours: 4,
    price_4p: 110000,
    price_6p: 150000,
    driver_price_4p: 66000,
    driver_price_6p: 90000,
    crosses_border: 0,
  },
  // IGR → Sanma Hotel (Laura Liu, Rina, Bella) — 80K ARS
  {
    name: "Aeropuerto IGR ↔ Sanma Hotel Foz (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "ar_igr_airport",
    destination_place_id: "br_sanma_hotel",
    wait_hours: 2,
    price_4p: 80000,
    price_6p: 110000,
    driver_price_4p: 48000,
    driver_price_6p: 66000,
    crosses_border: 1,
  },
  // Foz Centro ↔ Cataratas Argentinas (transfronterizo, Yiwei, Maxwell) — 600 BRL / ~130K ARS
  {
    name: "Foz Centro ↔ Cataratas Argentinas (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "foz_centro",
    destination_place_id: "ar_cataratas_attraction",
    wait_hours: 6,
    price_4p: 130000,
    price_6p: 180000,
    driver_price_4p: 78000,
    driver_price_6p: 108000,
    crosses_border: 1,
  },
  // IGU (Brasil Airport) ↔ Puerto Iguazú Centro (Pilar, Jimmie, Igor) — 350 BRL / ~80K ARS
  {
    name: "Aeropuerto IGU ↔ Puerto Iguazú Centro (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "br_igu_airport",
    destination_place_id: "puerto_iguazu_centro",
    wait_hours: 2,
    price_4p: 80000,
    price_6p: 110000,
    driver_price_4p: 48000,
    driver_price_6p: 66000,
    crosses_border: 1,
  },
  // Gran Meliá ↔ Itaipú (Gonzalo) — 110K ARS
  {
    name: "Gran Meliá ↔ Itaipú (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "gran_melia",
    destination_place_id: "br_itaipu_attraction",
    wait_hours: 3,
    price_4p: 110000,
    price_6p: 150000,
    driver_price_4p: 66000,
    driver_price_6p: 90000,
    crosses_border: 1,
  },
  // Centro PI ↔ Itaipú (transfronterizo)
  {
    name: "Puerto Iguazú Centro ↔ Itaipú (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "puerto_iguazu_centro",
    destination_place_id: "br_itaipu_attraction",
    wait_hours: 3,
    price_4p: 120000,
    price_6p: 160000,
    driver_price_4p: 72000,
    driver_price_6p: 96000,
    crosses_border: 1,
  },
  // Centro PI ↔ Cataratas Brasileñas (transfronterizo, varios)
  {
    name: "Puerto Iguazú Centro ↔ Cataratas Brasileñas (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "puerto_iguazu_centro",
    destination_place_id: "br_cataratas_attraction",
    wait_hours: 4,
    price_4p: 100000,
    price_6p: 140000,
    driver_price_4p: 60000,
    driver_price_6p: 84000,
    crosses_border: 1,
  },
  // St George Hotel ↔ Sanma Hotel (Bella) — 50 USD / ~70K ARS
  {
    name: "Hotel St George ↔ Sanma Hotel (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "st_george_hotel",
    destination_place_id: "br_sanma_hotel",
    wait_hours: 2,
    price_4p: 70000,
    price_6p: 95000,
    driver_price_4p: 42000,
    driver_price_6p: 57000,
    crosses_border: 1,
  },
  // IGR ↔ Hotel Alma Pura (Rolando Davila) — 60K ARS ida y vuelta
  {
    name: "Aeropuerto IGR ↔ Hotel Alma Pura (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "ar_igr_airport",
    destination_place_id: "alma_pura",
    wait_hours: 1,
    price_4p: 60000,
    price_6p: 80000,
    driver_price_4p: 36000,
    driver_price_6p: 48000,
    crosses_border: 0,
  },
  // DoubleTree Foz ↔ Cataratas Argentinas (Yiwei)
  {
    name: "DoubleTree Foz ↔ Cataratas Argentinas (ida y vuelta)",
    trip_type: "round_trip" as const,
    origin_place_id: "doubletree_hotel",
    destination_place_id: "ar_cataratas_attraction",
    wait_hours: 6,
    price_4p: 130000,
    price_6p: 180000,
    driver_price_4p: 78000,
    driver_price_6p: 108000,
    crosses_border: 1,
  },
];

async function main() {
  console.log("[SEED] Ensuring schema...");
  await ensureSchema();
  console.log("[SEED] Schema ready.");

  // Insert missing places
  for (const p of MISSING_PLACES) {
    const existing = await query<{ place_id: string }>("SELECT place_id FROM places WHERE place_id = ?", [p.place_id]);
    if (existing.length > 0) {
      console.log(`[SEED] SKIP place (exists): ${p.place_id}`);
      continue;
    }
    await query(
      `INSERT INTO places (place_id, canonical_name, official_name, google_maps_name, place_type, city, country, display_name, zone_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.place_id, p.canonical_name, p.official_name, p.google_maps_name, p.place_type, p.city, p.country, p.display_name, p.zone_id],
    );
    console.log(`[SEED] INSERTED place: ${p.place_id} → ${p.display_name} (zone: ${p.zone_id})`);
  }

  for (const trip of ROUND_TRIPS) {
    try {
      const id = await insertTour(trip);
      console.log(`[SEED] INSERTED id=${id}: "${trip.name}" (${trip.price_4p} ARS)`);
    } catch (e: any) {
      // If duplicate, skip
      if (e?.message?.includes("UNIQUE") || e?.code === "SQLITE_CONSTRAINT_UNIQUE") {
        console.log(`[SEED] SKIP (duplicate): "${trip.name}"`);
      } else {
        console.error(`[SEED] ERROR inserting "${trip.name}":`, e?.message ?? String(e));
      }
    }
  }

  console.log("[SEED] Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error("[SEED] Fatal:", e);
  process.exit(1);
});
