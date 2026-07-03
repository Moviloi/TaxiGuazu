/**
 * MIGRATE-CATASTRO.ts
 *
 * Script único de migración del catastro hotelero:
 *   - Agrega columnas faltantes a places
 *   - Crea nuevas zonas operativas de Foz
 *   - Migra places de FOZ_HOTEIS/FOZ_AVCATARATAS a nuevas zonas
 *   - Inserta 34 hoteles faltantes de Foz do Iguaçu
 *   - Inserta hoteles faltantes de Puerto Iguazú
 *   - Actualiza coordenadas de places existentes
 *   - Inserta aliases de ambos documentos
 *
 * Uso:  npx tsx scripts/migrate-catastro.ts
 */
import { getDb, ensureSchema } from "../src/lib/db/core/connection";

// ═══════════════════════════════════════════════════════════════════════
// 1. NUEVAS ZONAS — Corredor Cataratas (reemplazan FOZ_HOTEIS)
// ═══════════════════════════════════════════════════════════════════════

const ZONES = [
  { zone_id: "FOZ_CORREDOR_INICIAL", zone_name: "Foz Corredor Inicial",       country: "BR", area_group: "foz_centro", dispatch_priority: 2, base_eta_min: 10, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "FOZ_CORREDOR_MEDIO",   zone_name: "Foz Corredor Medio",         country: "BR", area_group: "foz_centro", dispatch_priority: 3, base_eta_min: 15, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "FOZ_PARQUE_NACIONAL",  zone_name: "Parque Nacional do Iguaçu",  country: "BR", area_group: "foz_sur",    dispatch_priority: 5, base_eta_min: 25, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "FOZ_ENTRADA_BR277",    zone_name: "Foz Entrada BR-277",         country: "BR", area_group: "foz_centro", dispatch_priority: 2, base_eta_min: 8,  surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "FOZ_RODOVIARIA",       zone_name: "Foz Rodoviária",             country: "BR", area_group: "foz_centro", dispatch_priority: 2, base_eta_min: 5,  surcharge_description: null, surcharge_pct: 0 },
];

// ═══════════════════════════════════════════════════════════════════════
// 2. MIGRACIÓN DE ZONAS: FOZ_HOTEIS → nuevas zonas
// ═══════════════════════════════════════════════════════════════════════

const ZONE_MIGRATIONS: Record<string, string[]> = {
  "FOZ_CORREDOR_INICIAL": [
    "br_bourbon_hotel",
    "br_doubletree_hotel",
  ],
  "FOZ_CORREDOR_MEDIO": [
    "br_mabu_hotel",
    "br_vivaz_hotel",
    "br_wish_hotel",
    "br_eco_cataratas_hotel",
    "br_sanma_hotel",
  ],
  "FOZ_PARQUE_NACIONAL": [
    "br_belmond_hotel",
  ],
  "FOZ_ENTRADA_BR277": [
    "br_rafain_palace",
    "br_rafain_convention",
  ],
  "FOZ_RODOVIARIA": [
    "br_recanto_hotel",
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// 3. HOTELES FOZ DO IGUAÇU — 34 faltantes (INSERT OR IGNORE)
// ═══════════════════════════════════════════════════════════════════════

interface PlaceSeed {
  place_id: string;
  canonical_name: string;
  official_name: string;
  display_name: string;
  google_maps_name: string;
  place_type: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  tourist_relevance_score: number;
  zone_id: string;
  barrio: string;
  corredor_vial: string;
  estrellas: number;
  direccion: string;
  zona_turistica: string;
  avenida_principal: string;
  acceso_principal: string;
  referencias: string;
}

function p(
  id: string, name: string, official: string, type: string,
  lat: number, lon: number, zone: string, barrio: string, corredor: string,
  stars: number, dir: string, turistica: string, av: string, ac: string, ref: string,
): PlaceSeed {
  return {
    place_id: id,
    canonical_name: name,
    official_name: official,
    display_name: official,
    google_maps_name: name,
    place_type: type,
    city: "Foz do Iguaçu", country: "BR",
    latitude: lat, longitude: lon,
    tourist_relevance_score: stars >= 5 ? 10 : stars >= 4 ? 8 : 5,
    zone_id: zone,
    barrio, corredor_vial: corredor, estrellas: stars,
    direccion: dir, zona_turistica: turistica,
    avenida_principal: av, acceso_principal: ac, referencias: ref,
  };
}

const FOZ_HOTELS: PlaceSeed[] = [
  // ── FOZ_CORREDOR_INICIAL ────────────────────────────────────────
  p("br_tetris_corredor", "Tetris Container Hostel", "Tetris Container Hostel", "hostel",
    -25.553400, -54.571400, "FOZ_CORREDOR_INICIAL", "Vila Yolanda", "Avenida das Cataratas",
    0, "Av. das Cataratas, 639, Vila Yolanda", "Corredor Cataratas (Inicial)", "Avenida das Cataratas", "Avenida das Cataratas",
    "Construido con contenedores marítimos, cerca de Av. Jorge Schimmelpfeng"),

  p("br_charm_pousada", "Pousada Charm Iguassu", "Pousada Charm Iguassu", "hotel",
    -25.560400, -54.566100, "FOZ_CORREDOR_INICIAL", "Vila Yolanda", "Avenida das Cataratas",
    0, "Rua Frederico Engel, 46, Vila Yolanda", "Corredor Cataratas (Inicial) / Residencial", "Avenida das Cataratas", "Rua Frederico Engel",
    "Detrás de la Av. das Cataratas, cerca del Bourbon Eco Resort"),

  p("br_dompedro1_palace", "Dom Pedro I Palace Hotel", "Dom Pedro I Palace Hotel", "hotel",
    -25.570100, -54.553900, "FOZ_CORREDOR_INICIAL", "Vila Yolanda", "Avenida das Cataratas",
    3, "Av. das Cataratas, 2615, Vila Yolanda", "Corredor Cataratas (Inicial)", "Avenida das Cataratas", "Avenida das Cataratas",
    "Estilo clásico colonial, cerca del desvío hacia la frontera de Argentina"),

  p("br_bourbon_thermas", "Bourbon Cataratas do Iguaçu Thermas Eco Resort", "Bourbon Cataratas Eco Resort", "resort",
    -25.565800, -54.558300, "FOZ_CORREDOR_INICIAL", "Vila Yolanda", "Avenida das Cataratas",
    5, "Av. das Cataratas, 2345, Vila Yolanda", "Corredor Cataratas (Inicial)", "Avenida das Cataratas", "Avenida das Cataratas",
    "Cerca de Shopping Catuaí Palladium, a minutos del centro de la ciudad"),

  p("br_doubletree_foz", "DoubleTree by Hilton Foz do Iguaçu", "DoubleTree by Hilton Foz", "hotel",
    -25.574400, -54.550100, "FOZ_CORREDOR_INICIAL", "Vila Yolanda", "Avenida das Cataratas",
    5, "Av. das Cataratas, 2930, Vila Yolanda", "Corredor Cataratas (Inicial)", "Avenida das Cataratas", "Avenida das Cataratas",
    "Frente al Shopping Catuaí Palladium, a metros de la rotonda de la aduana argentina"),

  // ── FOZ_CORREDOR_MEDIO ─────────────────────────────────────────
  p("br_mabu_resort", "Mabu Thermas Grand Resort", "Mabu Thermas Grand Resort", "resort",
    -25.578600, -54.545800, "FOZ_CORREDOR_MEDIO", "Carimã", "Avenida das Cataratas",
    5, "Av. das Cataratas, 3175, Carimã", "Corredor Cataratas (Medio)", "Avenida das Cataratas", "Avenida das Cataratas",
    "Al lado del parque acuático Blue Park, cerca del Shopping Catuaí Palladium"),

  p("br_carima_hotel", "Hotel Carimã", "Hotel Carimã", "hotel",
    -25.589800, -54.531200, "FOZ_CORREDOR_MEDIO", "Carimã", "Avenida das Cataratas",
    4, "Av. das Cataratas, 4790, Carimã", "Corredor Cataratas (Medio)", "Avenida das Cataratas", "Avenida das Cataratas",
    "Amplio predio campestre, cerca del acceso a Argentina"),

  p("br_goldenpark_intl", "Golden Park Internacional Foz", "Golden Park Internacional", "hotel",
    -25.539200, -54.576100, "FOZ_CORREDOR_MEDIO", "Centro", "Avenida Paraná",
    4, "Rua Almirante Barroso, 2006, Centro", "Centro / Av. Paraná", "Avenida Paraná", "Rua Almirante Barroso",
    "Esquina con Avenida Paraná, muy cerca del centro comercial Cataratas JL Shopping"),

  p("br_nacionalinn_foz", "Nacional Inn Foz do Iguaçu", "Nacional Inn Cataratas", "hotel",
    -25.580200, -54.542200, "FOZ_CORREDOR_MEDIO", "Carimã", "Avenida das Cataratas",
    3, "Av. das Cataratas, 3700, Carimã", "Corredor Cataratas (Medio)", "Avenida das Cataratas", "Avenida das Cataratas",
    "Cerca del Blue Park y del Shopping Catuaí Palladium"),

  p("br_catarataspark_hotel", "Cataratas Park Hotel", "Cataratas Park Hotel", "hotel",
    -25.591200, -54.522100, "FOZ_CORREDOR_MEDIO", "Carimã", "Avenida das Cataratas",
    3, "Av. das Cataratas, 5820, Carimã", "Corredor Cataratas (Medio)", "Avenida das Cataratas", "Avenida das Cataratas",
    "Cerca del Hotel Carimã y de la aduana fronteriza con Argentina"),

  p("br_goldenpark_foz", "Hotel Golden Park Foz do Iguaçu", "Golden Park Premium Foz", "hotel",
    -25.579400, -54.544200, "FOZ_CORREDOR_MEDIO", "Carimã", "Avenida das Cataratas",
    4, "Av. das Cataratas, 3200, Carimã", "Corredor Cataratas (Medio)", "Avenida das Cataratas", "Avenida das Cataratas",
    "Cerca del Shopping Catuaí Palladium y Blue Park"),

  p("br_eco_cataratas_resort", "Eco Cataratas Resort", "Eco Cataratas Resort", "resort",
    -25.599500, -54.511200, "FOZ_CORREDOR_MEDIO", "Carimã", "Rodovia das Cataratas (BR-469)",
    4, "Rodovia das Cataratas (BR-469), Km 14.5, Carimã", "Corredor Cataratas (Avanzado)", "Rodovia das Cataratas (BR-469)", "Rodovia das Cataratas (BR-469)",
    "Camino al Aeropuerto y Cataratas, complejo ecológico"),

  p("br_sanmartin_resort", "Hotel San Martin Cataratas Resort & Spa", "San Martin Resort & Spa", "resort",
    -25.613800, -54.485100, "FOZ_CORREDOR_MEDIO", "Tamanduá", "Rodovia das Cataratas (BR-469)",
    4, "Rodovia das Cataratas (BR-469), Km 17, Tamanduá", "Cataratas / Parque Nacional (Extremo)", "Rodovia das Cataratas (BR-469)", "Rodovia das Cataratas (BR-469)",
    "A sólo 400 metros de la entrada al Parque Nacional do Iguaçu y al Parque das Aves"),

  p("br_colonial_foz", "Hotel Colonial Foz", "Hotel Colonial Foz", "hotel",
    -25.611100, -54.491200, "FOZ_CORREDOR_MEDIO", "Tamanduá", "Rodovia das Cataratas (BR-469)",
    3, "Rodovia das Cataratas (BR-469), Km 16.5, Tamanduá", "Cataratas / Parque Nacional", "Rodovia das Cataratas (BR-469)", "Rodovia das Cataratas (BR-469)",
    "Muy cerca de la entrada del Parque Nacional y del Aeropuerto de Foz"),

  p("br_vivaz_cataratas", "Vivaz Cataratas Hotel & Resort", "Vivaz Cataratas Resort", "resort",
    -25.601900, -54.502800, "FOZ_CORREDOR_MEDIO", "Tamanduá", "Avenida das Cataratas (BR-469)",
    4, "Av. das Cataratas, 8450, Tamanduá", "Corredor Cataratas (Avanzado)", "Rodovia das Cataratas (BR-469)", "Rodovia das Cataratas (BR-469)",
    "Al lado del parque acuático Aquamania, camino al Aeropuerto"),

  p("br_wish_resort", "Wish Foz do Iguaçu Resort", "Wish Foz do Iguaçu", "resort",
    -25.597300, -54.516700, "FOZ_CORREDOR_MEDIO", "Tamanduá", "Avenida das Cataratas (BR-469)",
    5, "Av. das Cataratas, 6845, Tamanduá", "Corredor Cataratas (Avanzado)", "Rodovia das Cataratas (BR-469)", "Rodovia das Cataratas (BR-469)",
    "Cerca del Parque das Aves y Aeropuerto, cuenta con campo de golf profesional"),

  // ── FOZ_CENTRO ──────────────────────────────────────────────────
  p("br_bogari_hotel", "Bogari Hotel", "Bogari Hotel", "hotel",
    -25.545300, -54.584700, "FOZ_CENTRO", "Centro", "Avenida Brasil",
    3, "Av. Brasil, 611, Centro", "Centro Comercial / Av. Brasil", "Avenida Brasil", "Avenida Brasil",
    "Ubicado directamente sobre la Avenida Brasil (principal calle de comercios de Foz)"),

  p("br_continental_inn", "Hotel Continental Inn", "Continental Inn", "hotel",
    -25.539800, -54.577900, "FOZ_CENTRO", "Centro", "Avenida Paraná",
    4, "Av. Paraná, 1089, Centro", "Centro / Av. Paraná", "Avenida Paraná", "Avenida Paraná",
    "Cerca del Cataratas JL Shopping, zona urbana residencial y comercial"),

  p("br_ibis_foz", "Ibis Foz do Iguaçu", "Ibis Foz do Iguaçu", "hotel",
    -25.541300, -54.579400, "FOZ_CENTRO", "Centro", "Avenida Paraná",
    3, "Rua Almirante Barroso, 1698, Centro", "Centro Urbano", "Avenida Paraná", "Rua Almirante Barroso",
    "Cerca del cruce de Av. Paraná y Almirante Barroso"),

  p("br_ibisbudget_foz", "Ibis Budget Foz do Iguaçu", "Ibis Budget Foz", "hotel",
    -25.536700, -54.575500, "FOZ_CENTRO", "Centro", "Avenida República Argentina",
    2, "Av. República Argentina, 1150, Centro", "Centro Urbano / Av. República Argentina", "Avenida República Argentina", "Avenida República Argentina",
    "Cerca del Cataratas JL Shopping y de la intersección con la Av. Paraná"),

  p("br_delrey_quality", "Del Rey Quality Hotel", "Del Rey Quality", "hotel",
    -25.540800, -54.582900, "FOZ_CENTRO", "Centro", "Avenida Juscelino Kubitschek",
    3, "Rua Tarobá, 1021, Centro", "Centro / Cerca de TTU", "Avenida Juscelino Kubitschek", "Rua Tarobá",
    "A metros del Terminal de Transporte Urbano (TTU), hotel clásico céntrico"),

  p("br_selina_foz", "Selina Foz do Iguaçu", "Selina Foz do Iguaçu", "hostel",
    -25.552900, -54.577100, "FOZ_CENTRO", "Centro", "Avenida Jorge Schimmelpfeng",
    3, "Av. Jorge Schimmelpfeng, 827, Centro", "Centro / Corredor Gastronómico y Nocturno", "Avenida Jorge Schimmelpfeng", "Avenida Jorge Schimmelpfeng",
    "En la zona bohemia de Av. Jorge Schimmelpfeng, concepto moderno de coworking"),

  p("br_sanjuan_tour", "San Juan Tour Foz do Iguaçu", "San Juan Tour", "hotel",
    -25.541400, -54.577800, "FOZ_CENTRO", "Centro", "Avenida Paraná",
    3, "Rua Marechal Deodoro, 1349, Centro", "Centro Urbano / Área Comercial", "Avenida Paraná", "Rua Marechal Deodoro",
    "Próximo al Cataratas JL Shopping y a la Avenida Paraná"),

  p("br_viale_tower", "Viale Tower Hotel", "Viale Tower Hotel", "hotel",
    -25.547800, -54.581700, "FOZ_CENTRO", "Centro", "Avenida Jorge Schimmelpfeng",
    4, "Av. Jorge Schimmelpfeng, 232, Centro", "Centro / Corredor Gastronómico", "Avenida Jorge Schimmelpfeng", "Avenida Jorge Schimmelpfeng",
    "Ubicado en el principal corredor gastronómico de Foz, alta concentración de bares"),

  p("br_pietroangelo_hotel", "Pietro Angelo Hotel", "Pietro Angelo Hotel", "hotel",
    -25.543500, -54.582600, "FOZ_CENTRO", "Centro", "Avenida Jorge Schimmelpfeng",
    3, "Rua Almirante Barroso, 1164, Centro", "Centro Urbano / Restaurantes", "Avenida Jorge Schimmelpfeng", "Rua Almirante Barroso",
    "A pasos de los restaurantes y bares de la Av. Jorge Schimmelpfeng"),

  p("br_bambu_hostel", "Hostel Bambu Foz", "Bambu Hostel", "hostel",
    -25.545100, -54.579300, "FOZ_CENTRO", "Centro", "Avenida Jorge Schimmelpfeng",
    0, "Rua Edmundo de Barros, 621, Centro", "Centro / Gastronómico", "Avenida Jorge Schimmelpfeng", "Rua Edmundo de Barros",
    "A 200 metros de Av. Jorge Schimmelpfeng y bares principales del centro"),

  p("br_hotelfoz_iguacu", "Hotel Foz do Iguaçu", "Hotel Foz do Iguaçu", "hotel",
    -25.542200, -54.588200, "FOZ_CENTRO", "Centro", "Avenida Brasil",
    3, "Av. Brasil, 97, Centro", "Centro Histórico / Av. Brasil", "Avenida Brasil", "Avenida Brasil",
    "Hotel tradicional, situado en el inicio de la Av. Brasil"),

  p("br_sanremo_hotel", "Hotel San Remo", "Hotel San Remo Foz", "hotel",
    -25.544100, -54.585500, "FOZ_CENTRO", "Centro", "Avenida Juscelino Kubitschek",
    2, "Rua Tarobá, 507, Centro", "Centro / Cerca de Av. Brasil", "Avenida Juscelino Kubitschek", "Rua Tarobá",
    "Muy cerca de la Av. Brasil y de la Terminal TTU, hotel económico"),

  p("br_mariaricca_hotel", "Maria Ricca Hotel", "Maria Ricca Hotel", "hotel",
    -25.542100, -54.580400, "FOZ_CENTRO", "Centro", "Avenida Jorge Schimmelpfeng",
    3, "Rua Almirante Barroso, 1504, Centro", "Centro Urbano", "Avenida Jorge Schimmelpfeng", "Rua Almirante Barroso",
    "Cerca del TTU y de las zonas de ocio de la Av. Jorge Schimmelpfeng"),

  p("br_rouver_hotel", "Rouver Hotel", "Rouver Hotel Foz", "hotel",
    -25.546300, -54.579100, "FOZ_CENTRO", "Centro", "Avenida Jorge Schimmelpfeng",
    3, "Rua Edmundo de Barros, 750, Centro", "Centro Gastronómico", "Avenida Jorge Schimmelpfeng", "Rua Edmundo de Barros",
    "Hotel económico, a una cuadra de Av. Jorge Schimmelpfeng"),

  p("br_plazafoz_hotel", "Plaza Foz Hotel", "Plaza Foz", "hotel",
    -25.540900, -54.578800, "FOZ_CENTRO", "Centro", "Avenida Paraná",
    3, "Rua Almirante Barroso, 1755, Centro", "Centro Urbano", "Avenida Paraná", "Rua Almirante Barroso",
    "Ubicado céntricamente, próximo al Cataratas JL Shopping"),

  p("br_rafain_centro", "Hotel Rafain Centro", "Rafain Centro", "hotel",
    -25.543900, -54.582800, "FOZ_CENTRO", "Centro", "Avenida Jorge Schimmelpfeng",
    3, "Rua Marechal Deodoro, 984, Centro", "Centro Urbano / Restaurantes", "Avenida Jorge Schimmelpfeng", "Rua Marechal Deodoro",
    "En el corazón comercial y gastronómico urbano, clásico de la red Rafain"),

  p("br_taroba_express", "Hotel Tarobá Express", "Tarobá Express", "hotel",
    -25.541500, -54.583500, "FOZ_CENTRO", "Centro", "Avenida Juscelino Kubitschek",
    3, "Rua Tarobá, 990, Centro", "Centro Comercial / TTU", "Avenida Juscelino Kubitschek", "Rua Tarobá",
    "A metros de la terminal TTU, versión ejecutiva de Tarobá Hotel"),

  p("br_dompedro2_hotel", "Hotel Dom Pedro II", "Dom Pedro II", "hotel",
    -25.538500, -54.583800, "FOZ_CENTRO", "Centro", "Avenida Juscelino Kubitschek",
    3, "Rua Benjamin Constant, 142, Centro", "Centro Urbano / Comercial", "Avenida Juscelino Kubitschek", "Rua Benjamin Constant",
    "A pasos de la Av. JK, hotel económico tradicional"),

  p("br_clh_suites_foz", "CLH Suites Foz do Iguaçu", "CLH Suites Foz", "hostel",
    -25.540500, -54.582500, "FOZ_CENTRO", "Centro", "Avenida Juscelino Kubitschek",
    0, "Rua Tarobá, 1020, Centro", "Centro / Cerca de TTU", "Avenida Juscelino Kubitschek", "Rua Tarobá",
    "Cerca del TTU, ideal para turismo joven"),

  p("br_nadai_confort", "Nadai Confort Hotel & Spa", "Nadai Confort Hotel", "hotel",
    -25.535800, -54.573900, "FOZ_CENTRO", "Centro", "Avenida República Argentina",
    4, "Av. República Argentina, 1332, Centro", "Centro Urbano / Av. República Argentina", "Avenida República Argentina", "Avenida República Argentina",
    "Cerca del Cataratas JL Shopping, cuenta con spa completo"),

  p("br_wyndham_golden_foz", "Wyndham Golden Foz Suites", "Wyndham Golden Foz", "apart_hotel",
    -25.541400, -54.582800, "FOZ_CENTRO", "Centro", "Avenida Juscelino Kubitschek",
    4, "Rua Rui Barbosa, 396, Centro", "Centro Comercial y Administrativo", "Avenida Juscelino Kubitschek", "Rua Rui Barbosa",
    "Cerca de Av. Brasil, centro financiero de la ciudad"),

  p("br_taroba_hotel_centro", "Tarobá Hotel", "Tarobá Hotel", "hotel",
    -25.540100, -54.582200, "FOZ_CENTRO", "Centro", "Avenida Juscelino Kubitschek",
    3, "Rua Tarobá, 1048, Centro", "Centro / Cerca de TTU", "Avenida Juscelino Kubitschek", "Rua Tarobá",
    "A 150 metros del Terminal de Transporte Urbano (TTU), ubicación muy céntrica"),

  p("br_wyndham_foz_centro", "Wyndham Foz do Iguaçu", "Wyndham Foz do Iguaçu", "hotel",
    -25.540000, -54.580000, "FOZ_CENTRO", "Centro", "Avenida Paraná",
    4, "Centro", "Centro Urbano", "Avenida Paraná", "Avenida Paraná",
    "Hotel corporativo en el corazón de Foz"),

  // ── FOZ_RODOVIARIA ──────────────────────────────────────────────
  p("br_fallsgalli_hotel", "Falls Galli Hotel", "Falls Galli Hotel", "hotel",
    -25.523800, -54.558200, "FOZ_RODOVIARIA", "Parque Presidente", "Avenida Costa e Silva",
    4, "Av. Costa e Silva, 1602, Parque Presidente", "Portal de Entrada / Av. Costa e Silva", "Avenida Costa e Silva", "Avenida Costa e Silva",
    "Cerca de la Rodoviária e intermedio camino al Cataratas JL Shopping"),

  p("br_luz_hotel_rod", "Luz Hotel Foz do Iguaçu", "Luz Hotel", "hotel",
    -25.518600, -54.561700, "FOZ_RODOVIARIA", "Parque Presidente", "Avenida Costa e Silva",
    3, "Rua Tarobá, 1792, Parque Presidente", "Terminal Rodoviária / BR-277", "Avenida Costa e Silva", "Rua Tarobá (lateral a Av. Costa e Silva)",
    "Frente a la Terminal Rodoviária (Estación de Autobuses)"),

  // ── FOZ_ENTRADA_BR277 ───────────────────────────────────────────
  p("br_rafain_palace_hotel", "Rafain Palace Hotel & Convention", "Rafain Palace Hotel", "resort",
    -25.489500, -54.542200, "FOZ_ENTRADA_BR277", "Parque Imperatriz", "BR-277 / Av. Olímpio Rafain",
    4, "Av. Olímpio Rafain, 4057, Parque Imperatriz", "Entrada de la Ciudad / BR-277", "Rodovia BR-277", "Av. Olímpio Rafain (Marginal BR-277)",
    "Cerca del viaducto de salida a Curitiba, gran centro de convenciones de Foz"),

  // ── FOZ_ITAIPU (norte) ──────────────────────────────────────────
  p("br_bellavista_pousada", "Pousada Bella Vista", "Pousada Bella Vista", "hotel",
    -25.495800, -54.579400, "ITAIPU", "Porto Belo", "Avenida Tancredo Neves",
    0, "Av. Tancredo Neves, 4111, Porto Belo", "Corredor Itaipu (Zona Norte)", "Avenida Tancredo Neves", "Avenida Tancredo Neves",
    "En ruta hacia la Represa Hidroeléctrica de Itaipú Binacional"),

  // ── POUSADAS / OTROS ────────────────────────────────────────────
  p("br_sonhomeu_pousada", "Pousada Sonho Meu Foz", "Pousada Sonho Meu", "hotel",
    -25.534200, -54.580200, "FOZ_CENTRO", "Jardim Festugato", "Avenida Juscelino Kubitschek",
    0, "Rua Men de Sá, 277, Jardim Festugato", "Centro Urbano (Norte) / Cerca de TTU", "Avenida Juscelino Kubitschek", "Rua Men de Sá",
    "A pocas cuadras de la Av. JK y del TTU, ambiente familiar"),

  p("br_quedas_pousada", "Pousada Quedas do Iguaçu", "Pousada Quedas", "hotel",
    -25.539100, -54.581500, "FOZ_CENTRO", "Centro", "Avenida Juscelino Kubitschek",
    0, "Rua Tarobá, 1104, Centro", "Centro / Cerca de TTU", "Avenida Juscelino Kubitschek", "Rua Tarobá",
    "Pousada urbana económica, pegada a la Terminal TTU"),

  // ── DAN INN (zona fronteriza) ───────────────────────────────────
  p("br_daninn_express", "Dan Inn Express Foz do Iguaçu", "Dan Inn Express Foz", "hotel",
    -25.518200, -54.576500, "FOZ_CENTRO", "Vila Portes", "Avenida Juscelino Kubitschek",
    3, "Av. Juscelino Kubitschek, 3485, Vila Portes", "Comercial Frontera / Puente de la Amistad", "Avenida Juscelino Kubitschek", "Avenida Juscelino Kubitschek",
    "Sobre Avenida JK, salida rápida hacia el Puente de la Amistad (Frontera Paraguay)"),
];

// ═══════════════════════════════════════════════════════════════════════
// 4. HOTELES PUERTO IGUAZÚ — 50 del documento (INSERT OR IGNORE)
// ═══════════════════════════════════════════════════════════════════════

interface PtoPlace {
  place_id: string;
  canonical_name: string;
  official_name: string;
  place_type: string;
  lat: number;
  lon: number;
  zone_id: string;
  barrio: string;
  estrellas: number;
  direccion: string;
}

function pp(
  id: string, name: string, official: string, type: string,
  lat: number, lon: number, zone: string, barrio: string,
  stars: number, dir: string,
): PtoPlace {
  return { place_id: id, canonical_name: name, official_name: official,
    place_type: type, lat, lon, zone_id: zone, barrio, estrellas: stars, direccion: dir };
}

const PTO_HOTELS: PtoPlace[] = [
  // ── PARQUE NACIONAL / CATARATAS ─────────────────────────────────
  pp("ar_melia_iguazu", "Gran Meliá Iguazú", "Gran Meliá Iguazú", "resort",
    -25.67996, -54.44535, "CATARATAS", "Parque Nacional Iguazú", 5, "Parque Nacional Iguazú S/N"),

  // ── 600 HECTÁREAS / SELVA IRYAPÚ ────────────────────────────────
  pp("ar_loi_suites_selva", "Loi Suites Iguazú Hotel", "Loi Suites Iguazú Hotel", "resort",
    -25.59670, -54.54558, "600HAS_FONDO", "600 Hectáreas/Selva Iryapú", 5, "Reserva Iryapú S/N"),
  pp("ar_iguazu_grand", "Iguazú Grand Resort Spa & Casino", "Iguazú Grand Resort", "resort",
    -25.60345, -54.55124, "600HAS_FONDO", "600 Hectáreas/Selva Iryapú", 5, "Ruta 12 Km 1640"),
  pp("ar_falls_iguazu_spa", "Falls Iguazú Hotel & Spa", "Falls Iguazú Hotel & Spa", "hotel",
    -25.61000, -54.55000, "600HAS_FONDO", "600 Hectáreas/Selva Iryapú", 5, "Batalla Mbororé S/N Lote 05"),
  pp("ar_mercure_iru", "Mercure Iguazú Hotel Iru", "Mercure Iguazú Hotel Iru", "hotel",
    -25.60348, -54.55136, "600HAS_FONDO", "600 Hectáreas/Selva Iryapú", 4, "Selva Iryapú S/N - Predio 600 Has"),
  pp("ar_village_cataratas", "Village Cataratas", "Village Cataratas", "hotel",
    -25.60800, -54.55500, "600HAS_FONDO", "600 Hectáreas/Selva Iryapú", 4, "Selva Iryapú S/N"),
  pp("ar_selvaje_lodge_selva", "Selvaje Lodge", "Selvaje Lodge", "hotel",
    -25.60500, -54.55200, "600HAS_FONDO", "600 Hectáreas/Selva Iryapú", 4, "Selva Iryapú"),
  pp("ar_tre_iguazu", "Hotel Tré Iguazú", "Hotel Tré Iguazú", "hotel",
    -25.60400, -54.55000, "600HAS_FONDO", "600 Hectáreas/Selva Iryapú", 3, "Calle Batalla Tekoa Lote C-53"),
  pp("ar_rainforest_hotel", "Rainforest Hotel & Cabañas", "Rainforest Hotel & Cabañas", "hotel",
    -25.60200, -54.54800, "600HAS_FONDO", "600 Hectáreas/Selva Iryapú", 3, "Reserva Iryapú"),
  pp("ar_posada_chaman", "Posada del Chamán Iguazú", "Posada del Chamán Iguazú", "hotel",
    -25.60600, -54.55300, "600HAS_FONDO", "600 Hectáreas/Selva Iryapú", 4, "Selva Iryapú"),
  pp("ar_tierra_guarani", "Tierra Guaraní Lodge", "Tierra Guaraní Lodge", "hotel",
    -25.60700, -54.55500, "600HAS_FONDO", "600 Hectáreas/Selva Iryapú", 4, "Selva Iryapú"),
  pp("ar_tekoa_lodge", "Tekoa Lodge", "Tekoa Lodge", "hotel",
    -25.60500, -54.55300, "600HAS_FONDO", "600 Hectáreas/Selva Iryapú", 3, "Selva Iryapú"),
  pp("ar_tupa_lodge_selva", "Tupa Lodge Selva y Río", "Tupa Lodge Selva y Río", "hotel",
    -25.60600, -54.55400, "600HAS_FONDO", "600 Hectáreas/Selva Iryapú", 4, "Selva Iryapú"),
  pp("ar_aldea_selva_lodge", "La Aldea de la Selva Lodge", "La Aldea de la Selva Lodge", "hotel",
    -25.60700, -54.55400, "600HAS_FONDO", "600 Hectáreas/Selva Iryapú", 4, "Selva Iryapú"),
  pp("ar_reserva_virgin_lodge", "La Reserva Virgin Lodge", "La Reserva Virgin Lodge", "hotel",
    -25.60800, -54.55600, "600HAS_FONDO", "600 Hectáreas/Selva Iryapú", 4, "Selva Iryapú"),

  // ── ACCESO RUTA 12 ──────────────────────────────────────────────
  pp("ar_exe_cataratas", "Exe Hotel Cataratas", "Exe Hotel Cataratas", "hotel",
    -25.60688, -54.56389, "ACCESO_RUTA12", "Ruta Nacional 12", 5, "Ruta 12 Km 4"),
  pp("ar_orquideas_hotel", "Orquideas Hotel & Cabañas", "Orquideas Hotel & Cabañas", "hotel",
    -25.61200, -54.57000, "ACCESO_RUTA12", "Ruta Nacional 12", 4, "Ruta 12 Km 5"),
  pp("ar_tourbillon_lodge", "Gran Hotel Tourbillon & Lodge", "Gran Hotel Tourbillon & Lodge", "hotel",
    -25.61000, -54.56700, "ACCESO_RUTA12", "Ruta Nacional 12", 4, "Ruta 12 Km 4½"),
  pp("ar_complejo_americano", "Complejo Americano", "Complejo Americano", "hotel",
    -25.61000, -54.57000, "ACCESO_RUTA12", "Ruta Nacional 12", 3, "Ruta Nacional 12 N°5"),
  pp("ar_marcopolo_suites_r12", "Marcopolo Suites Iguazú", "Marcopolo Suites Iguazú", "hotel",
    -25.60400, -54.56200, "ACCESO_RUTA12", "Ruta Nacional 12", 3, "Ruta 12 Km 3,5"),
  pp("ar_pirayu_resort_r12", "Pirayu Hotel & Resort", "Pirayu Hotel & Resort", "resort",
    -25.60800, -54.56800, "ACCESO_RUTA12", "Ruta Nacional 12", 4, "Ruta 12"),
  pp("ar_carmen_hotel", "Hotel Carmen", "Hotel Carmen", "hotel",
    -25.60800, -54.56500, "ACCESO_RUTA12", "Ruta Nacional 12", 3, "Ruta 12 Km 4,5"),

  // ── CENTRO ──────────────────────────────────────────────────────
  pp("ar_amerian_portal", "Amérian Portal del Iguazú Hotel", "Amérian Portal del Iguazú Hotel", "hotel",
    -25.59420, -54.58050, "CENTRO", "Centro/Costanera", 5, "Av. Tres Fronteras 780"),
  pp("ar_entre_arboles", "Entre Arboles Iguazú Singular Collection", "Entre Arboles Iguazú Singular Collection", "hotel",
    -25.59420, -54.58050, "HITO_Y_COSTANERA", "Centro/Costanera", 5, "Av. Tres Fronteras 780"),
  pp("ar_saint_george_centro", "Hotel Saint George", "Hotel Saint George", "hotel",
    -25.59710, -54.57360, "CENTRO", "Centro", 4, "Av. Córdoba 148"),
  pp("ar_o2_centro", "O2 Hotel Iguazú", "O2 Hotel Iguazú", "hotel",
    -25.59419, -54.57498, "CENTRO", "Centro", 4, "Paraguay 546"),
  pp("ar_raices_esturion_centro", "Hotel Raíces Esturión", "Hotel Raíces Esturión", "hotel",
    -25.59400, -54.58000, "CENTRO", "Centro/Costanera", 4, "Av. Tres Fronteras 650"),
  pp("ar_grand_crucero_centro", "Grand Crucero Hotel", "Grand Crucero Hotel", "hotel",
    -25.59200, -54.57800, "CENTRO", "Centro/Acceso", 4, "Victoria Aguirre y Tordo"),
  pp("ar_el_libertador", "Hotel El Libertador", "Hotel El Libertador", "hotel",
    -25.59600, -54.57400, "CENTRO", "Centro", 3, "Bompland 110"),
  pp("ar_arami_lodge", "Arami Hotel & Lodge", "Arami Hotel & Lodge", "hotel",
    -25.59800, -54.57600, "CENTRO", "Centro", 3, "Gobernador Lanuse 292"),
  pp("ar_jardin_iguazu", "Hotel Jardín de Iguazú", "Hotel Jardín de Iguazú", "hotel",
    -25.59550, -54.57380, "CENTRO", "Centro", 3, "Bompland 274"),
  pp("ar_amayal_centro", "Hotel Amayal", "Hotel Amayal", "hotel",
    -25.59500, -54.57500, "CENTRO", "Centro", 3, "Av. Misiones 28"),
  pp("ar_z_boutique", "Z Hotel Boutique", "Z Hotel Boutique", "hotel",
    -25.59600, -54.57500, "CENTRO", "Centro", 3, "Centro"),
  pp("ar_genova_boutique", "Hotel Boutique Genova", "Hotel Boutique Genova", "hotel",
    -25.59700, -54.57600, "CENTRO", "Centro", 3, "Centro"),
  pp("ar_mensu_grand", "Mensú Grand Hotel", "Mensú Grand Hotel", "hotel",
    -25.59400, -54.57600, "CENTRO", "Centro", 3, "Av. República y Salto Dos"),
  pp("ar_itavera_hotel", "Hotel Itavera", "Hotel Itavera", "hotel",
    -25.59600, -54.57500, "CENTRO", "Centro", 3, "Centro"),
  pp("ar_city_falls", "City Falls Iguazú", "City Falls Iguazú", "hotel",
    -25.59500, -54.57400, "CENTRO", "Centro", 3, "Centro"),
  pp("ar_bagu_7bocas", "Bagu Siete Bocas", "Bagu Siete Bocas", "hotel",
    -25.59600, -54.57600, "CENTRO", "Centro", 3, "Centro"),
  pp("ar_alexander_hotel", "Alexander Hotel", "Alexander Hotel", "hotel",
    -25.59600, -54.57400, "CENTRO", "Centro", 3, "Comandante Andresito"),
  pp("ar_beer_hotel_centro", "Beer Hotel Iguazú", "Beer Hotel Iguazú", "hotel",
    -25.59600, -54.57500, "CENTRO", "Centro", 3, "Centro"),
  pp("ar_iguazu_falls_hostel", "Iguazú Falls Hostel", "Iguazú Falls Hostel", "hostel",
    -25.59600, -54.57400, "CENTRO", "Centro", 2, "Centro"),
  pp("ar_el_pueblito", "El Pueblito Iguazú", "El Pueblito Iguazú", "hotel",
    -25.59550, -54.57450, "CENTRO", "Centro", 3, "Centro"),
  pp("ar_costa_del_sol", "Costa del Sol Iguazú", "Costa del Sol Iguazú", "hotel",
    -25.59000, -54.58000, "CENTRO", "Zona Residencial", 3, "Los Malvones S/N"),
  pp("ar_las_moras", "Las Moras Cabañas Boutique", "Las Moras Cabañas Boutique", "hotel",
    -25.59200, -54.57800, "CENTRO", "Zona Residencial", 3, "Surucua 143"),
  pp("ar_altos_iguazu", "Altos del Iguazú", "Altos del Iguazú", "hotel",
    -25.60000, -54.57000, "CENTRO", "Zona Residencial", 3, "Av. de los Trabajadores"),
  pp("ar_jasy_hotel", "Jasy Hotel", "Jasy Hotel", "hotel",
    -25.59501, -54.56702, "CENTRO", "Zona Residencial", 3, "Zona Residencial"),
  pp("ar_el_hornero", "Cabañas El Hornero", "Cabañas El Hornero", "hotel",
    -25.59400, -54.57800, "CENTRO", "Zona Residencial", 3, "Zona Residencial"),
  pp("ar_iguazu_jungle_centro", "Iguazú Jungle Hotel", "Iguazú Jungle Hotel", "hotel",
    -25.59900, -54.56800, "CENTRO", "Centro/Selva", 4, "Hipólito Yrigoyen y San Lorenzo"),
  pp("ar_guamini_mision_centro", "Hotel Guaminí Misión", "Hotel Guaminí Misión", "hotel",
    -25.59600, -54.57600, "CENTRO", "Centro", 4, "Av. Río Paraná 337"),
  pp("ar_panoramic_grand_centro", "Panoramic Grand Iguazú", "Panoramic Grand Iguazú", "hotel",
    -25.59550, -54.57550, "CENTRO", "Centro", 5, "Paraguay 272"),
];

// ═══════════════════════════════════════════════════════════════════════
// 5. COORDENADAS PARA PLACES EXISTENTES
// ═══════════════════════════════════════════════════════════════════════

interface CoordUpdate {
  place_id: string;
  lat: number;
  lon: number;
  barrio?: string;
  estrellas?: number;
}

const COORD_UPDATES: CoordUpdate[] = [
  // Foz hotels (from document)
  { place_id: "br_belmond_hotel",    lat: -25.689300, lon: -54.437100, barrio: "Parque Nacional", estrellas: 5 },
  { place_id: "br_bourbon_hotel",    lat: -25.565800, lon: -54.558300, barrio: "Vila Yolanda", estrellas: 5 },
  { place_id: "br_mabu_hotel",       lat: -25.578600, lon: -54.545800, barrio: "Carimã", estrellas: 5 },
  { place_id: "br_wish_hotel",       lat: -25.597300, lon: -54.516700, barrio: "Tamanduá", estrellas: 5 },
  { place_id: "br_recanto_hotel",    lat: -25.518300, lon: -54.551100, barrio: "Parque Presidente", estrellas: 5 },
  { place_id: "br_vivaz_hotel",      lat: -25.601900, lon: -54.502800, barrio: "Tamanduá", estrellas: 4 },
  { place_id: "br_doubletree_hotel", lat: -25.574400, lon: -54.550100, barrio: "Vila Yolanda", estrellas: 5 },
  { place_id: "br_rafain_palace",    lat: -25.489500, lon: -54.542200, barrio: "Parque Imperatriz", estrellas: 4 },
  { place_id: "br_rafain_convention",lat: -25.489500, lon: -54.542200, barrio: "Parque Imperatriz", estrellas: 4 },
  { place_id: "br_bella_italia",     lat: -25.533200, lon: -54.571400, barrio: "Centro", estrellas: 4 },
  { place_id: "br_luz_hotel",        lat: -25.518600, lon: -54.561700, barrio: "Parque Presidente", estrellas: 3 },
  { place_id: "br_tetris_hostel",    lat: -25.553400, lon: -54.571400, barrio: "Vila Yolanda" },
  { place_id: "br_eco_cataratas_hotel", lat: -25.599500, lon: -54.511200, barrio: "Carimã", estrellas: 4 },
  { place_id: "br_taroba_hotel",     lat: -25.540100, lon: -54.582200, barrio: "Centro", estrellas: 3 },
  { place_id: "br_jl_bourbon",       lat: -25.531200, lon: -54.568200, barrio: "Centro", estrellas: 4 },
  { place_id: "br_colonial_iguacu",  lat: -25.611100, lon: -54.491200, barrio: "Tamanduá", estrellas: 3 },
  { place_id: "br_viale_cataratas",  lat: -25.567200, lon: -54.557400, barrio: "Vila Yolanda", estrellas: 4 },
  { place_id: "br_wyndham_golden",   lat: -25.541400, lon: -54.582800, barrio: "Centro", estrellas: 4 },
  { place_id: "br_wyndham_foz",      lat: -25.540000, lon: -54.580000, barrio: "Centro", estrellas: 4 },
  { place_id: "br_sanma_hotel",      lat: -25.602000, lon: -54.510000, barrio: "Tamanduá", estrellas: 4 },

  // Puerto Iguazú hotels (from document) — for already seeded places
  { place_id: "ar_melia_hotel",           lat: -25.67996, lon: -54.44535, barrio: "Parque Nacional Iguazú", estrellas: 5 },
  { place_id: "ar_loi_suites_hotel",      lat: -25.59670, lon: -54.54558, barrio: "600 Hectáreas/Selva Iryapú", estrellas: 5 },
  { place_id: "ar_grand_resort",          lat: -25.60345, lon: -54.55124, barrio: "600 Hectáreas/Selva Iryapú", estrellas: 5 },
  { place_id: "ar_amerianportal_hotel",   lat: -25.59420, lon: -54.58050, barrio: "Centro/Costanera", estrellas: 5 },
  { place_id: "ar_falls_iguazu_hotel",    lat: -25.61000, lon: -54.55000, barrio: "600 Hectáreas/Selva Iryapú", estrellas: 5 },
  { place_id: "ar_mercure_hotel",         lat: -25.60348, lon: -54.55136, barrio: "600 Hectáreas/Selva Iryapú", estrellas: 4 },
  { place_id: "ar_saint_george_hotel",    lat: -25.59710, lon: -54.57360, barrio: "Centro", estrellas: 4 },
  { place_id: "ar_o2_hotel",              lat: -25.59419, lon: -54.57498, barrio: "Centro", estrellas: 4 },
  { place_id: "ar_raices_esturion",       lat: -25.59400, lon: -54.58000, barrio: "Centro/Costanera", estrellas: 4 },
  { place_id: "ar_grand_crucero",         lat: -25.59200, lon: -54.57800, barrio: "Centro/Acceso", estrellas: 4 },
  { place_id: "ar_iguazu_jungle_hotel",   lat: -25.59900, lon: -54.56800, barrio: "Centro/Selva", estrellas: 4 },
  { place_id: "ar_selvaje_lodge",         lat: -25.60500, lon: -54.55200, barrio: "600 Hectáreas/Selva Iryapú", estrellas: 4 },
  { place_id: "ar_panoramic_grand",       lat: -25.59550, lon: -54.57550, barrio: "Centro", estrellas: 5 },
  { place_id: "ar_guamini_mision",        lat: -25.59600, lon: -54.57600, barrio: "Centro", estrellas: 4 },
  { place_id: "ar_aldeaselva_lodge",      lat: -25.60700, lon: -54.55400, barrio: "600 Hectáreas/Selva Iryapú", estrellas: 4 },
  { place_id: "ar_marcopolo_suites",      lat: -25.60400, lon: -54.56200, barrio: "Ruta Nacional 12", estrellas: 3 },
  { place_id: "ar_pirayu_resort",         lat: -25.60800, lon: -54.56800, barrio: "Ruta Nacional 12", estrellas: 4 },
  { place_id: "ar_virgin_lodge",          lat: -25.60800, lon: -54.55600, barrio: "600 Hectáreas/Selva Iryapú", estrellas: 4 },
  { place_id: "ar_amayal_hotel",          lat: -25.59500, lon: -54.57500, barrio: "Centro", estrellas: 3 },
  { place_id: "ar_bagu7bocas_hotel",      lat: -25.59600, lon: -54.57600, barrio: "Centro", estrellas: 3 },
  { place_id: "ar_beerhotel_hostel",      lat: -25.59600, lon: -54.57500, barrio: "Centro", estrellas: 3 },
  { place_id: "ar_iguazufalls_hostel",    lat: -25.59600, lon: -54.57400, barrio: "Centro", estrellas: 2 },
];

// ═══════════════════════════════════════════════════════════════════════
// 6. ALIASES — de ambos documentos
// ═══════════════════════════════════════════════════════════════════════

interface AliasSeed {
  place_id: string;
  alias: string;
  language: string;
}

function a(place: string, alias: string, lang = "es"): AliasSeed {
  return { place_id: place, alias: alias.toLowerCase(), language: lang };
}

const ALIASES: AliasSeed[] = [
  // ── Foz do Iguaçu ──────────────────────────────────────────────
  // Belmond
  a("br_belmond_hotel", "belmond hotel das cataratas"),
  a("br_belmond_hotel", "belmond cataratas"),
  a("br_belmond_hotel", "das cataratas"),
  // Bourbon
  a("br_bourbon_hotel", "bourbon cataratas"),
  a("br_bourbon_hotel", "bourbon thermas"),
  a("br_bourbon_hotel", "bourbon foz"),
  // DoubleTree
  a("br_doubletree_hotel", "double tree"),
  a("br_doubletree_hotel", "hilton foz"),
  // Mabu
  a("br_mabu_hotel", "mabu foz"),
  a("br_mabu_hotel", "mabu grand resort"),
  a("br_mabu_hotel", "mabu thermas"),
  // Wish
  a("br_wish_hotel", "wish foz"),
  a("br_wish_hotel", "wish resort"),
  a("br_wish_hotel", "gjp wish"),
  // Recanto
  a("br_recanto_hotel", "recanto cataratas"),
  a("br_recanto_hotel", "recanto thermas"),
  a("br_recanto_hotel", "recanto resort"),
  // Vivaz
  a("br_vivaz_hotel", "vivaz cataratas"),
  a("br_vivaz_hotel", "vivaz resort"),
  a("br_vivaz_hotel", "hotel vivaz"),
  // Eco Cataratas
  a("br_eco_cataratas_hotel", "eco cataratas"),
  a("br_eco_cataratas_hotel", "san juan eco"),
  a("br_eco_cataratas_hotel", "eco cataratas san juan"),
  // Rafain Palace
  a("br_rafain_palace", "rafain palace"),
  a("br_rafain_palace", "rafain convention"),
  a("br_rafain_palace", "hotel rafain"),
  // JL Hotel
  a("br_jl_bourbon", "jl hotel"),
  a("br_jl_bourbon", "jl bourbon"),
  a("br_jl_bourbon", "bourbon jl"),
  // Wyndham Golden
  a("br_wyndham_golden", "golden foz"),
  a("br_wyndham_golden", "wyndham foz suites"),
  // Wyndham
  a("br_wyndham_foz", "wyndham foz"),
  // Viale Cataratas
  a("br_viale_cataratas", "viale cataratas"),
  a("br_viale_cataratas", "viale foz"),
  // Tarobá
  a("br_taroba_hotel", "taroba"),
  a("br_taroba_hotel", "taroba foz"),
  a("br_taroba_hotel", "hotel taroba"),
  // Bella Italia
  a("br_bella_italia", "bella italia"),
  a("br_bella_italia", "bella italia foz"),
  // Luz
  a("br_luz_hotel", "luz hotel"),
  a("br_luz_hotel", "luz foz"),
  // Tetris
  a("br_tetris_hostel", "tetris hostel"),
  a("br_tetris_hostel", "tetris container"),
  a("br_tetris_hostel", "tetris foz"),
  // Sanma
  a("br_sanma_hotel", "sanma"),
  a("br_sanma_hotel", "sanma foz"),
  // Hotel Carimã
  a("br_carima_hotel", "carima"),
  a("br_carima_hotel", "hotel carima"),
  a("br_carima_hotel", "resort carima"),
  // Golden Park Internacional
  a("br_goldenpark_intl", "golden park internacional"),
  a("br_goldenpark_intl", "golden park centro"),
  // Nacional Inn
  a("br_nacionalinn_foz", "nacional inn"),
  a("br_nacionalinn_foz", "nacional inn cataratas"),
  // Cataratas Park
  a("br_catarataspark_hotel", "cataratas park"),
  a("br_catarataspark_hotel", "hotel cataratas park"),
  // Golden Park Premium
  a("br_goldenpark_foz", "golden park foz"),
  a("br_goldenpark_foz", "golden park premium"),
  a("br_goldenpark_foz", "plaza sol"),
  // San Martin
  a("br_sanmartin_resort", "san martin"),
  a("br_sanmartin_resort", "san martin resort"),
  a("br_sanmartin_resort", "hotel san martin"),
  // Colonial
  a("br_colonial_foz", "hotel colonial"),
  a("br_colonial_foz", "colonial foz"),
  a("br_colonial_iguacu", "colonial foz"),
  a("br_colonial_iguacu", "hotel colonial iguacu"),
  // Bogari
  a("br_bogari_hotel", "bogari"),
  a("br_bogari_hotel", "hotel bogari"),
  a("br_bogari_hotel", "bogari foz"),
  // Continental Inn
  a("br_continental_inn", "continental inn"),
  a("br_continental_inn", "continental hotel"),
  a("br_continental_inn", "continental inn foz"),
  // Ibis
  a("br_ibis_foz", "ibis foz"),
  a("br_ibis_foz", "ibis centro"),
  a("br_ibisbudget_foz", "ibis budget"),
  a("br_ibisbudget_foz", "ibis budget foz"),
  // Del Rey
  a("br_delrey_quality", "del rey"),
  a("br_delrey_quality", "del rey foz"),
  a("br_delrey_quality", "hotel del rey"),
  // Selina
  a("br_selina_foz", "selina"),
  a("br_selina_foz", "selina hotel"),
  a("br_selina_foz", "selina hostel"),
  // San Juan Tour
  a("br_sanjuan_tour", "san juan"),
  a("br_sanjuan_tour", "san juan tour"),
  a("br_sanjuan_tour", "san juan foz"),
  // Viale Tower
  a("br_viale_tower", "viale tower"),
  a("br_viale_tower", "viale centro"),
  a("br_viale_tower", "torre viale"),
  // Pietro Angelo
  a("br_pietroangelo_hotel", "pietro angelo"),
  a("br_pietroangelo_hotel", "pietro angelo foz"),
  // Dom Pedro I
  a("br_dompedro1_palace", "dom pedro 1"),
  a("br_dompedro1_palace", "dom pedro i"),
  a("br_dompedro1_palace", "dom pedro palace"),
  // Dom Pedro II
  a("br_dompedro2_hotel", "dom pedro 2"),
  a("br_dompedro2_hotel", "dom pedro ii"),
  // Maria Ricca
  a("br_mariaricca_hotel", "maria ricca"),
  a("br_mariaricca_hotel", "maria ricca foz"),
  // Rouver
  a("br_rouver_hotel", "rouver"),
  a("br_rouver_hotel", "rouver foz"),
  // Plaza Foz
  a("br_plazafoz_hotel", "plaza foz"),
  a("br_plazafoz_hotel", "hotel plaza foz"),
  // Falls Galli
  a("br_fallsgalli_hotel", "falls galli"),
  a("br_fallsgalli_hotel", "galli hotel"),
  a("br_fallsgalli_hotel", "hotel falls galli"),
  // Rafain Centro
  a("br_rafain_centro", "rafain centro"),
  a("br_rafain_centro", "rafain centro hotel"),
  // Pousada Bella Vista
  a("br_bellavista_pousada", "pousada bella vista"),
  a("br_bellavista_pousada", "bella vista foz"),
  a("br_bellavista_pousada", "bella vista itaipu"),
  // Tarobá Express
  a("br_taroba_express", "taroba express"),
  a("br_taroba_express", "corujinha"),
  // Pousada Sonho Meu
  a("br_sonhomeu_pousada", "sonho meu"),
  a("br_sonhomeu_pousada", "pousada sonho meu"),
  // Pousada Quedas
  a("br_quedas_pousada", "pousada quedas"),
  a("br_quedas_pousada", "quedas do iguacu"),
  // CLH Suites
  a("br_clh_suites_foz", "clh suites"),
  a("br_clh_suites_foz", "che lagarto foz"),
  // Dan Inn
  a("br_daninn_express", "dan inn"),
  a("br_daninn_express", "dan inn foz"),
  a("br_daninn_express", "dan inn express"),
  // Nadai
  a("br_nadai_confort", "nadai confort"),
  a("br_nadai_confort", "nadai hotel"),
  // Hotel Foz
  a("br_hotelfoz_iguacu", "hotel foz"),
  a("br_hotelfoz_iguacu", "foz do iguacu hotel"),
  // San Remo
  a("br_sanremo_hotel", "san remo"),
  a("br_sanremo_hotel", "san remo foz"),
  a("br_sanremo_hotel", "hotel san remo"),
  // Bambu
  a("br_bambu_hostel", "bambu hostel"),
  a("br_bambu_hostel", "bambu foz"),
  // Pousada Charm
  a("br_charm_pousada", "charm iguassu"),
  a("br_charm_pousada", "pousada charm"),
  a("br_charm_pousada", "charm foz"),

  // ── Puerto Iguazú (nuevos) ──────────────────────────────────────
  a("ar_melia_iguazu", "gran melia"),
  a("ar_melia_iguazu", "sheraton iguazu"),
  a("ar_melia_iguazu", "melia cataratas"),
  a("ar_loi_suites_selva", "loi suites iguazu"),
  a("ar_loi_suites_selva", "loi de la selva"),
  a("ar_loi_suites_selva", "loi iguazu"),
  a("ar_iguazu_grand", "iguazu grand"),
  a("ar_iguazu_grand", "grand resort iguazu"),
  a("ar_amerian_portal", "amerian portal"),
  a("ar_amerian_portal", "portal del iguazu"),
  a("ar_amerian_portal", "amerian"),
  a("ar_exe_cataratas", "exe cataratas"),
  a("ar_exe_cataratas", "exe hotel cataratas"),
  a("ar_falls_iguazu_spa", "falls iguazu spa"),
  a("ar_entre_arboles", "entre arboles"),
  a("ar_entre_arboles", "singular collection"),
  a("ar_selvaje_lodge_selva", "selvaje lodge"),
  a("ar_saint_george_centro", "saint george"),
  a("ar_o2_centro", "o2 iguazu"),
  a("ar_village_cataratas", "village cataratas"),
  a("ar_raices_esturion_centro", "raices esturion"),
  a("ar_grand_crucero_centro", "grand crucero"),
  a("ar_orquideas_hotel", "orquideas hotel"),
  a("ar_orquideas_hotel", "orquideas palace"),
  a("ar_tourbillon_lodge", "tourbillon"),
  a("ar_tourbillon_lodge", "gran tourbillon"),
  a("ar_iguazu_jungle_centro", "iguazu jungle"),
  a("ar_iguazu_jungle_centro", "jungle hotel"),
  a("ar_el_libertador", "el libertador"),
  a("ar_el_libertador", "libertador hotel"),
  a("ar_complejo_americano", "complejo americano"),
  a("ar_complejo_americano", "americano"),
  a("ar_marcopolo_suites_r12", "marcopolo"),
  a("ar_marcopolo_suites_r12", "marcopolo suites"),
  a("ar_arami_lodge", "arami"),
  a("ar_arami_lodge", "arami lodge"),
  a("ar_carmen_hotel", "carmen hotel"),
  a("ar_carmen_hotel", "hotel carmen"),
  a("ar_rainforest_hotel", "rainforest"),
  a("ar_rainforest_hotel", "rainforest cabanas"),
  a("ar_jardin_iguazu", "jardin de iguazu"),
  a("ar_jardin_iguazu", "jardin iguazu"),
  a("ar_amayal_centro", "amayal"),
  a("ar_amayal_centro", "amayal hotel"),
  a("ar_tre_iguazu", "tre iguazu"),
  a("ar_tre_iguazu", "hotel tre"),
  a("ar_panoramic_grand_centro", "panoramic grand"),
  a("ar_pirayu_resort_r12", "pirayu"),
  a("ar_pirayu_resort_r12", "pirayu resort"),
  a("ar_guamini_mision_centro", "guamini"),
  a("ar_guamini_mision_centro", "guamini mision"),
  a("ar_aldea_selva_lodge", "aldea de la selva"),
  a("ar_aldea_selva_lodge", "selva lodge"),
  a("ar_z_boutique", "z boutique"),
  a("ar_z_boutique", "z hotel"),
  a("ar_genova_boutique", "genova"),
  a("ar_genova_boutique", "boutique genova"),
  a("ar_posada_chaman", "posada del chaman"),
  a("ar_posada_chaman", "chaman"),
  a("ar_tierra_guarani", "tierra guarani"),
  a("ar_tierra_guarani", "guarani lodge"),
  a("ar_reserva_virgin_lodge", "reserva virgin"),
  a("ar_reserva_virgin_lodge", "virgin lodge"),
  a("ar_tupa_lodge_selva", "tupa lodge"),
  a("ar_tupa_lodge_selva", "tupa"),
  a("ar_tekoa_lodge", "tekoa lodge"),
  a("ar_mensu_grand", "mensu grand"),
  a("ar_mensu_grand", "mensu hotel"),
  a("ar_itavera_hotel", "itavera"),
  a("ar_city_falls", "city falls"),
  a("ar_city_falls", "falls city"),
  a("ar_bagu_7bocas", "bagu 7 bocas"),
  a("ar_bagu_7bocas", "siete bocas"),
  a("ar_costa_del_sol", "costa del sol"),
  a("ar_costa_del_sol", "sol iguazu"),
  a("ar_las_moras", "las moras"),
  a("ar_las_moras", "moras cabanas"),
  a("ar_alexander_hotel", "alexander"),
  a("ar_alexander_hotel", "hotel alexander"),
  a("ar_altos_iguazu", "altos del iguazu"),
  a("ar_altos_iguazu", "altos hotel"),
  a("ar_beer_hotel_centro", "beer hotel"),
  a("ar_beer_hotel_centro", "cerveza hotel"),
  a("ar_el_hornero", "el hornero"),
  a("ar_el_hornero", "hornero cabanas"),
  a("ar_iguazu_falls_hostel", "falls hostel"),
  a("ar_iguazu_falls_hostel", "iguazu hostel"),
  a("ar_jasy_hotel", "jasy"),
  a("ar_el_pueblito", "el pueblito"),
  a("ar_el_pueblito", "pueblito iguazu"),
  a("ar_amerianportal_hotel", "amerian portal del iguazu"),
  a("ar_grand_resort", "iguazu grand resort"),
  a("ar_falls_iguazu_hotel", "falls iguazu hotel"),
  a("ar_mercure_hotel", "mercure iguazu iru"),
  a("ar_iguazu_jungle_hotel", "iguazu jungle lodge"),
  a("ar_guamini_mision", "guamini mision hotel"),
  a("ar_pirayu_resort", "pirayu lodge resort"),
];

// ═══════════════════════════════════════════════════════════════════════
// 7. EJECUCIÓN
// ═══════════════════════════════════════════════════════════════════════

async function migrate() {
  await ensureSchema();
  const db = getDb();

  console.log("🌎 1. Creando nuevas zonas...");
  for (const z of ZONES) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO zones (zone_id, zone_name, country, area_group, dispatch_priority, base_eta_min, surcharge_description, surcharge_pct)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [z.zone_id, z.zone_name, z.country, z.area_group, z.dispatch_priority, z.base_eta_min, z.surcharge_description, z.surcharge_pct],
    });
  }
  console.log(`  ✓ ${ZONES.length} zonas creadas`);

  console.log("📍 2. Migrando FOZ_HOTEIS → nuevas zonas...");
  let migrated = 0;
  for (const [newZone, placeIds] of Object.entries(ZONE_MIGRATIONS)) {
    for (const pid of placeIds) {
      const r = await db.execute({
        sql: "UPDATE places SET zone_id = ? WHERE place_id = ?",
        args: [newZone, pid],
      });
      if (r.rowsAffected !== undefined) migrated += Number(r.rowsAffected);
    }
  }
  // Migrar FOZ_AVCATARATAS → FOZ_CORREDOR_INICIAL
  const avResult = await db.execute({
    sql: "UPDATE places SET zone_id = 'FOZ_CORREDOR_INICIAL' WHERE zone_id = 'FOZ_AVCATARATAS'",
  });
  if (avResult.rowsAffected !== undefined) migrated += Number(avResult.rowsAffected);
  console.log(`  ✓ ${migrated} places migrados`);

  console.log("🏨 3. Insertando hoteles faltantes de Foz do Iguaçu...");
  let insertedFoz = 0;
  for (const h of FOZ_HOTELS) {
    try {
      await db.execute({
        sql: `INSERT OR IGNORE INTO places
              (place_id, canonical_name, official_name, display_name, google_maps_name,
               place_type, city, country, latitude, longitude,
               tourist_relevance_score, zone_id,
               barrio, corredor_vial, estrellas, direccion, zona_turistica,
               avenida_principal, acceso_principal, referencias)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          h.place_id, h.canonical_name, h.official_name, h.display_name, h.google_maps_name,
          h.place_type, h.city, h.country, h.latitude, h.longitude,
          h.tourist_relevance_score, h.zone_id,
          h.barrio, h.corredor_vial, h.estrellas, h.direccion, h.zona_turistica,
          h.avenida_principal, h.acceso_principal, h.referencias,
        ],
      });
      insertedFoz++;
    } catch (e) {
      console.log(`  ⚠ Error insertando ${h.place_id}: ${e}`);
    }
  }
  console.log(`  ✓ ${insertedFoz} hoteles insertados`);

  console.log("🇦🇷 4. Insertando hoteles de Puerto Iguazú...");
  let insertedPto = 0;
  for (const h of PTO_HOTELS) {
    try {
      const displayName = `${h.canonical_name} (Argentina)`;
      await db.execute({
        sql: `INSERT OR IGNORE INTO places
              (place_id, canonical_name, official_name, display_name, google_maps_name,
               place_type, city, country, latitude, longitude,
               tourist_relevance_score, zone_id,
               barrio, estrellas, direccion)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          h.place_id, h.canonical_name, h.official_name, displayName, h.canonical_name,
          h.place_type, "Puerto Iguazú", "AR", h.lat, h.lon,
          h.estrellas >= 5 ? 10 : h.estrellas >= 4 ? 8 : 5, h.zone_id,
          h.barrio, h.estrellas, h.direccion,
        ],
      });
      insertedPto++;
    } catch (e) {
      console.log(`  ⚠ Error insertando ${h.place_id}: ${e}`);
    }
  }
  console.log(`  ✓ ${insertedPto} hoteles insertados`);

  console.log("🗺️ 5. Actualizando coordenadas de places existentes...");
  let updatedCoords = 0;
  for (const c of COORD_UPDATES) {
    try {
      const updates: string[] = ["latitude = ?", "longitude = ?"];
      const args: (string | number)[] = [c.lat, c.lon];
      if (c.barrio) { updates.push("barrio = ?"); args.push(c.barrio); }
      if (c.estrellas) { updates.push("estrellas = ?"); args.push(c.estrellas); }
      args.push(c.place_id);
      const r = await db.execute({
        sql: `UPDATE places SET ${updates.join(", ")} WHERE place_id = ? AND (latitude IS NULL OR latitude = 0)`,
        args,
      });
      if (r.rowsAffected !== undefined) updatedCoords += Number(r.rowsAffected);
    } catch (e) {
      console.log(`  ⚠ Error actualizando ${c.place_id}: ${e}`);
    }
  }
  console.log(`  ✓ ${updatedCoords} places actualizados con coordenadas`);

  console.log("🔤 6. Insertando aliases...");
  let insertedAliases = 0;
  for (const al of ALIASES) {
    try {
      const exists = await db.execute({
        sql: "SELECT id FROM aliases WHERE place_id = ? AND alias = ? AND language = ?",
        args: [al.place_id, al.alias, al.language],
      });
      if (exists.rows && exists.rows.length > 0) continue;
      await db.execute({
        sql: "INSERT INTO aliases (place_id, alias, language) VALUES (?, ?, ?)",
        args: [al.place_id, al.alias, al.language],
      });
      insertedAliases++;
    } catch (e) {
      // place_id might not exist yet if insert was IGNORE'd
    }
  }
  console.log(`  ✓ ${insertedAliases} aliases insertados`);

  console.log("");
  console.log("═══════════════════════════════════════");
  console.log("✅ Migración catastral completada");
  console.log("═══════════════════════════════════════");

  // Verificación rápida
  const totalPlaces = await db.execute("SELECT count(*) as c FROM places");
  const brPlaces = await db.execute("SELECT count(*) as c FROM places WHERE country = 'BR'");
  const arPlaces = await db.execute("SELECT count(*) as c FROM places WHERE country = 'AR'");
  const withCoords = await db.execute("SELECT count(*) as c FROM places WHERE latitude IS NOT NULL AND latitude != 0");
  const fozHoteis = await db.execute("SELECT count(*) as c FROM places WHERE zone_id = 'FOZ_HOTEIS'");
  const totalAliases = await db.execute("SELECT count(*) as c FROM aliases");

  const row = (r: any) => (r.rows?.[0] as any)?.c ?? 0;
  console.log(`  Places total:  ${row(totalPlaces)}`);
  console.log(`  BR: ${row(brPlaces)} | AR: ${row(arPlaces)}`);
  console.log(`  Con coordenadas: ${row(withCoords)}`);
  console.log(`  En FOZ_HOTEIS (debería ser 0): ${row(fozHoteis)}`);
  console.log(`  Aliases total: ${row(totalAliases)}`);
}

migrate().catch((e) => {
  console.error("❌ Migración fallida:", e);
  process.exit(1);
});
