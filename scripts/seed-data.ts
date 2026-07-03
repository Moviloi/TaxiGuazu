import { getDb, ensureSchema } from "../src/lib/db/core/connection";

// ═══════════════════════════════════════════════════════════════════════
// GRAFO DE ZONAS — TaxiGuazú (2026-06-29)
// Generado desde DB en producción con 30 zonas, 196 places, ISO country codes
// ═══════════════════════════════════════════════════════════════════════

const ZONES = [
  { zone_id: "600HAS_FONDO", zone_name: "600 Hectáreas Fondo", country: "AR", area_group: "iguazu_norte", dispatch_priority: 5, base_eta_min: 15, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "600HAS_RESTO", zone_name: "600 Hectáreas Resto", country: "AR", area_group: "iguazu_norte", dispatch_priority: 4, base_eta_min: 12, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "ACCESO_RUTA12", zone_name: "Acceso Ruta 12", country: "AR", area_group: "iguazu_norte", dispatch_priority: 2, base_eta_min: 8, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "ADUANA_TN", zone_name: "Aduana Tancredo Neves", country: "AR", area_group: "iguazu_norte", dispatch_priority: 3, base_eta_min: 15, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "AEROPUERTO_IGR", zone_name: "Aeropuerto IGR", country: "AR", area_group: "iguazu_norte", dispatch_priority: 2, base_eta_min: 20, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "AEROPUERTO_IGU", zone_name: "Aeropuerto IGU", country: "BR", area_group: "foz_centro", dispatch_priority: 2, base_eta_min: 20, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "CATARATAS", zone_name: "Cataratas Argentinas", country: "AR", area_group: "iguazu_norte", dispatch_priority: 4, base_eta_min: 20, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "CATARATAS_BR", zone_name: "Cataratas Brasileñas", country: "BR", area_group: "foz_centro", dispatch_priority: 4, base_eta_min: 20, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "CDE_HOTELES", zone_name: "CDE Hoteles", country: "PY", area_group: "cde_centro", dispatch_priority: 2, base_eta_min: 8, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "CDE_MICROCENTRO", zone_name: "CDE Microcentro (Compras)", country: "PY", area_group: "cde_centro", dispatch_priority: 1, base_eta_min: 5, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "CENTRO", zone_name: "Puerto Iguazú Centro", country: "AR", area_group: "iguazu_norte", dispatch_priority: 1, base_eta_min: 5, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "FOZ_AVCATARATAS", zone_name: "Foz Av. Cataratas", country: "BR", area_group: "foz_centro", dispatch_priority: 2, base_eta_min: 10, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "FOZ_CENTRO", zone_name: "Foz Centro", country: "BR", area_group: "foz_centro", dispatch_priority: 1, base_eta_min: 5, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "FOZ_HOTEIS", zone_name: "Foz Hotéis (Resorts)", country: "BR", area_group: "foz_centro", dispatch_priority: 3, base_eta_min: 12, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "HITO_Y_COSTANERA", zone_name: "Hito y Costanera", country: "AR", area_group: "iguazu_norte", dispatch_priority: 3, base_eta_min: 8, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "ITAIPU", zone_name: "Itaipú", country: "BR", area_group: "foz_norte", dispatch_priority: 5, base_eta_min: 20, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "PUENTE_AMISTAD", zone_name: "Puente Amistad", country: "PY", area_group: "cde_centro", dispatch_priority: 2, base_eta_min: 10, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "ZONE_AR_LD_ELDORADO", zone_name: "Eldorado", country: "AR", area_group: null, dispatch_priority: 5, base_eta_min: 10, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "ZONE_AR_LD_ESPERANZA", zone_name: "Esperanza", country: "AR", area_group: null, dispatch_priority: 5, base_eta_min: 10, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "ZONE_AR_LD_MOCONA", zone_name: "Saltos del Moconá", country: "AR", area_group: null, dispatch_priority: 5, base_eta_min: 10, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "ZONE_AR_LD_POSADAS", zone_name: "Posadas", country: "AR", area_group: null, dispatch_priority: 5, base_eta_min: 10, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "ZONE_AR_LD_PTO_LIBERTAD", zone_name: "Puerto Libertad", country: "AR", area_group: null, dispatch_priority: 5, base_eta_min: 10, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "ZONE_AR_LD_SAN_IGNACIO", zone_name: "San Ignacio Miní", country: "AR", area_group: null, dispatch_priority: 5, base_eta_min: 10, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "ZONE_AR_LD_SOBERBIO", zone_name: "El Soberbio", country: "AR", area_group: null, dispatch_priority: 5, base_eta_min: 10, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "ZONE_AR_LD_WANDA", zone_name: "Wanda", country: "AR", area_group: null, dispatch_priority: 5, base_eta_min: 10, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "ZONE_FOZ_ADUANA_BR", zone_name: "Aduana de Foz (lado BR)", country: "BR", area_group: null, dispatch_priority: 5, base_eta_min: 10, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "ZONE_IGR_SANTA_ROSA", zone_name: "Santa Rosa", country: "AR", area_group: "corta_distancia", dispatch_priority: 5, base_eta_min: 15, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "ZONE_IGR_TUPA", zone_name: "Tupá Lodge", country: "AR", area_group: null, dispatch_priority: 5, base_eta_min: 10, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "ZONE_PY_ASUNCION", zone_name: "Asunción", country: "PY", area_group: null, dispatch_priority: 5, base_eta_min: 10, surcharge_description: null, surcharge_pct: 0 },
  { zone_id: "ZONE_PY_CABECERA_PUENTE", zone_name: "Cabecera Puente de la Amistad", country: "PY", area_group: null, dispatch_priority: 5, base_eta_min: 10, surcharge_description: null, surcharge_pct: 0 },
];

// ═══════════════════════════════════════════════════════════════════════
// PLACES
// ═══════════════════════════════════════════════════════════════════════

const PLACES: Array<{
  place_id: string; canonical_name: string; official_name: string | null;
  display_name: string | null; google_maps_name: string | null;
  place_type: string; city: string | null; country: string | null;
  tourist_relevance_score: number | null; zone_id: string | null;
}> = [
  { place_id: "ar_aldeaselva_lodge", canonical_name: "La Aldea de la Selva", official_name: "La Aldea de la Selva", display_name: "La Aldea de la Selva", google_maps_name: "La Aldea de la Selva", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "600HAS_FONDO" },
  { place_id: "ar_miraselva_lodge", canonical_name: "Miraselva Lodge", official_name: "Miraselva Lodge", display_name: "Miraselva Lodge", google_maps_name: "Miraselva Lodge", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "600HAS_FONDO" },
  { place_id: "ar_600_hectareas_area", canonical_name: "Zona 600 Hectáreas", official_name: "Reserva Selva Iryapú - 600 Hectáreas", display_name: null, google_maps_name: "600 Hectáreas", place_type: "tourist_area", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 9, zone_id: "600HAS_RESTO" },
  { place_id: "ar_portaliguazu_landmark", canonical_name: "Portal del Iguazú (acceso)", official_name: "Portal del Iguazú (acceso)", display_name: "Portal del Iguazú (acceso)", google_maps_name: "Portal del Iguazú (acceso)", place_type: "landmark", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "600HAS_RESTO" },
  { place_id: "ar_aripuca_attraction", canonical_name: "La Aripuca", official_name: "Complejo Turístico La Aripuca", display_name: null, google_maps_name: "La Aripuca", place_type: "attraction", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 8, zone_id: "ACCESO_RUTA12" },
  { place_id: "ar_guamini_mision", canonical_name: "Guaminí Misión Hotel", official_name: "Guaminí Misión Hotel", display_name: null, google_maps_name: "Guaminí Misión Hotel", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 8, zone_id: "ACCESO_RUTA12" },
  { place_id: "ar_guira_attraction", canonical_name: "Güirá Oga", official_name: "Refugio de Animales Silvestres GüiráOga", display_name: null, google_maps_name: "GüiráOga", place_type: "attraction", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 8, zone_id: "ACCESO_RUTA12" },
  { place_id: "ar_icebar_attraction", canonical_name: "Icebar Iguazú", official_name: "Icebar Iguazú", display_name: null, google_maps_name: "Icebar Iguazú", place_type: "attraction", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 8, zone_id: "ACCESO_RUTA12" },
  { place_id: "ar_jardinpicaflores_attraction", canonical_name: "Jardín de los Picaflores", official_name: "Jardín de los Picaflores", display_name: "Jardín de los Picaflores", google_maps_name: "Jardín de los Picaflores", place_type: "attraction", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "ACCESO_RUTA12" },
  { place_id: "ar_aduanatn_border", canonical_name: "Aduana Argentina - Puente Tancredo Neves", official_name: "Aduana Argentina - Puente Tancredo Neves", display_name: "Aduana Argentina - Puente Tancredo Neves", google_maps_name: "Aduana Argentina - Puente Tancredo Neves", place_type: "border", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "ADUANA_TN" },
  { place_id: "ar_br_border", canonical_name: "Aduana Argentina-Brasil (Puente Tancredo Neves)", official_name: "Paso Fronterizo Iguazú - Foz de Iguazú", display_name: null, google_maps_name: "Control Migratorio Argentino - Puente Tancredo Neves", place_type: "border_crossing", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 10, zone_id: "ADUANA_TN" },
  { place_id: "ar_puentetn_landmark", canonical_name: "Puente Tancredo Neves - Lado Argentina", official_name: "Puente Tancredo Neves - Lado Argentina", display_name: "Puente Tancredo Neves - Lado Argentina", google_maps_name: "Puente Tancredo Neves - Lado Argentina", place_type: "landmark", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "ADUANA_TN" },
  { place_id: "ar_igr_airport", canonical_name: "Aeropuerto Internacional Cataratas del Iguazú", official_name: "Aeropuerto Internacional Mayor Carlos Eduardo Krause", display_name: null, google_maps_name: "Aeropuerto Internacional Cataratas del Iguazú (IGR)", place_type: "airport", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 10, zone_id: "AEROPUERTO_IGR" },
  { place_id: "ar_rotonda_aeropuerto", canonical_name: "Rotonda del Aeropuerto", official_name: "Rotonda del Aeropuerto", display_name: "Rotonda del Aeropuerto", google_maps_name: "Rotonda del Aeropuerto", place_type: "landmark", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "AEROPUERTO_IGR" },
  { place_id: "br_igu_airport", canonical_name: "Aeroporto Internacional de Foz do Iguaçu", official_name: "Aeroporto Internacional de Foz do Iguaçu/Cataratas", display_name: null, google_maps_name: "Aeroporto Internacional de Foz do Iguaçu (IGU)", place_type: "airport", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 10, zone_id: "AEROPUERTO_IGU" },
  { place_id: "ar_cataratas_attraction", canonical_name: "Parque Nacional Iguazú - Cataratas Argentinas", official_name: "Parque Nacional Iguazú", display_name: null, google_maps_name: "Parque Nacional Iguazú", place_type: "attraction", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 10, zone_id: "CATARATAS" },
  { place_id: "ar_circuitoinferior_attraction", canonical_name: "Circuito Inferior", official_name: "Circuito Inferior", display_name: "Circuito Inferior", google_maps_name: "Circuito Inferior", place_type: "attraction", city: "Parque Nacional Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CATARATAS" },
  { place_id: "ar_circuitosuperior_attraction", canonical_name: "Circuito Superior", official_name: "Circuito Superior", display_name: "Circuito Superior", google_maps_name: "Circuito Superior", place_type: "attraction", city: "Parque Nacional Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CATARATAS" },
  { place_id: "ar_garganta_attraction", canonical_name: "Garganta del Diablo", official_name: "Garganta del Diablo", display_name: "Garganta del Diablo", google_maps_name: "Garganta del Diablo", place_type: "attraction", city: "Parque Nacional Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CATARATAS" },
  { place_id: "ar_senderomacuco_attraction", canonical_name: "Sendero Macuco", official_name: "Sendero Macuco", display_name: "Sendero Macuco", google_maps_name: "Sendero Macuco", place_type: "attraction", city: "Parque Nacional Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CATARATAS" },
  { place_id: "ar_senderoverde_attraction", canonical_name: "Sendero Verde", official_name: "Sendero Verde", display_name: "Sendero Verde", google_maps_name: "Sendero Verde", place_type: "attraction", city: "Parque Nacional Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CATARATAS" },
  { place_id: "ar_trenecologico_attraction", canonical_name: "Tren Ecológico de la Selva", official_name: "Tren Ecológico de la Selva", display_name: "Tren Ecológico de la Selva", google_maps_name: "Tren Ecológico de la Selva", place_type: "attraction", city: "Parque Nacional Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CATARATAS" },
  { place_id: "br_aves_attraction", canonical_name: "Parque das Aves", official_name: "Parque das Aves Ltda.", display_name: null, google_maps_name: "Parque das Aves", place_type: "attraction", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 10, zone_id: "CATARATAS_BR" },
  { place_id: "br_cataratas_attraction", canonical_name: "Parque Nacional do Iguaçu - Cataratas Brasileñas", official_name: "Parque Nacional do Iguaçu", display_name: null, google_maps_name: "Parque Nacional do Iguaçu", place_type: "attraction", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 10, zone_id: "CATARATAS_BR" },
  { place_id: "br_cataratasbr_attraction", canonical_name: "Cataratas do Iguaçu - Lado Brasileiro", official_name: "Cataratas do Iguaçu - Lado Brasileiro", display_name: "Cataratas do Iguaçu - Lado Brasileiro", google_maps_name: "Cataratas do Iguaçu - Lado Brasileiro", place_type: "attraction", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 5, zone_id: "CATARATAS_BR" },
  { place_id: "br_macucosafari_attraction", canonical_name: "Macuco Safari", official_name: "Macuco Safari", display_name: "Macuco Safari", google_maps_name: "Macuco Safari", place_type: "attraction", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 5, zone_id: "CATARATAS_BR" },
  { place_id: "py_casino_acaray_hotel", canonical_name: "Hotel Casino Acaray", official_name: "Hotel Casino Acaray", display_name: null, google_maps_name: "Hotel Casino Acaray", place_type: "hotel", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 9, zone_id: "CDE_HOTELES" },
  { place_id: "py_agt_airport", canonical_name: "Aeropuerto Internacional Guaraní", official_name: "Aeropuerto Internacional Guaraní", display_name: null, google_maps_name: "Aeropuerto Internacional Guaraní (AGT)", place_type: "airport", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 8, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_asunciongran_hotel", canonical_name: "Asunción Gran Hotel", official_name: "Asunción Gran Hotel", display_name: "Asunción Gran Hotel", google_maps_name: "Asunción Gran Hotel", place_type: "hotel", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 5, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_bus_terminal", canonical_name: "Terminal de Ómnibus de Ciudad del Este", official_name: "Terminal de Ómnibus de Ciudad del Este", display_name: null, google_maps_name: "Terminal de Ómnibus de Ciudad del Este", place_type: "bus_terminal", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 8, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_catedral_hotel", canonical_name: "Hotel Catedral", official_name: "Hotel Catedral", display_name: "Hotel Catedral", google_maps_name: "Hotel Catedral", place_type: "hotel", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 5, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_catedralsanblas_attraction", canonical_name: "Catedral de San Blas", official_name: "Catedral de San Blas", display_name: "Catedral de San Blas", google_maps_name: "Catedral de San Blas", place_type: "attraction", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 5, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_cellshop_shopping", canonical_name: "Cellshop Importados", official_name: "Cellshop Paraguay", display_name: null, google_maps_name: "Cellshop Importados", place_type: "shopping", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 10, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_centro_cde_area", canonical_name: "Microcentro de Ciudad del Este", official_name: "Área Comercial Ciudad del Este", display_name: null, google_maps_name: "Microcentro Ciudad del Este", place_type: "tourist_area", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 9, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_china_shopping", canonical_name: "Shopping China Importados", official_name: "Shopping China CDE", display_name: null, google_maps_name: "Shopping China Importados", place_type: "shopping", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 10, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_convair_hotel", canonical_name: "Convair Hotel", official_name: "Convair Hotel CDE", display_name: null, google_maps_name: "Convair Hotel", place_type: "hotel", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 8, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_del_este_shopping", canonical_name: "Shopping del Este", official_name: "Shopping del Este", display_name: null, google_maps_name: "Shopping del Este", place_type: "shopping", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 9, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_hito_attraction", canonical_name: "Hito Tres Fronteras - Paraguay", official_name: "Hito Tres Fronteras Presidente Franco", display_name: null, google_maps_name: "Hito Tres Fronteras CDE", place_type: "attraction", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 8, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_howardjohnson_hotel", canonical_name: "Howard Johnson by Wyndham", official_name: "Howard Johnson by Wyndham", display_name: "Howard Johnson by Wyndham", google_maps_name: "Howard Johnson by Wyndham", place_type: "hotel", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 5, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_lago_attraction", canonical_name: "Lago de la República", official_name: "Lago de la República", display_name: "Lago de la República", google_maps_name: "Lago de la República", place_type: "attraction", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 5, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_mezquita_attraction", canonical_name: "Mezquita Musulmana", official_name: "Mezquita Musulmana", display_name: "Mezquita Musulmana", google_maps_name: "Mezquita Musulmana", place_type: "attraction", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 5, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_monalisa_shopping", canonical_name: "Shopping Monalisa", official_name: "Monalisa Paraguay", display_name: null, google_maps_name: "Shopping Monalisa", place_type: "shopping", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 9, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_monday_attraction", canonical_name: "Saltos del Monday", official_name: "Parque Municipal Monday", display_name: null, google_maps_name: "Saltos del Monday", place_type: "attraction", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 9, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_nissei_shopping", canonical_name: "Casa Nissei", official_name: "Casa Nissei CDE", display_name: null, google_maps_name: "Casa Nissei", place_type: "shopping", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 9, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_nobile_hotel", canonical_name: "Nobile Hotel Convention", official_name: "Nobile Hotel Convention", display_name: "Nobile Hotel Convention", google_maps_name: "Nobile Hotel Convention", place_type: "hotel", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 5, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_paris_shopping", canonical_name: "Shopping Paris", official_name: "Shopping Paris", display_name: null, google_maps_name: "Shopping Paris", place_type: "shopping", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 9, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_plazacity_attraction", canonical_name: "Plaza City", official_name: "Plaza City", display_name: "Plaza City", google_maps_name: "Plaza City", place_type: "attraction", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 5, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_port_franco", canonical_name: "Puerto de Presidente Franco", official_name: "Puerto Histórico Presidente Franco", display_name: null, google_maps_name: "Puerto de Presidente Franco", place_type: "port", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 6, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_rio_bourbon", canonical_name: "Rio Hotel by Bourbon Ciudad del Este", official_name: "Rio Hotel CDE", display_name: null, google_maps_name: "Rio Hotel by Bourbon Ciudad del Este", place_type: "hotel", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 8, zone_id: "CDE_MICROCENTRO" },
  { place_id: "py_sax_shopping", canonical_name: "SAX Department Store", official_name: "S.A.X. S.A.", display_name: null, google_maps_name: "SAX Department Store", place_type: "shopping", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 9, zone_id: "CDE_MICROCENTRO" },
  { place_id: "ar_alamanecer_hostel", canonical_name: "Alojamiento El Amanecer", official_name: "Alojamiento El Amanecer", display_name: "Alojamiento El Amanecer", google_maps_name: "Alojamiento El Amanecer", place_type: "hostel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_amayal_hotel", canonical_name: "Hotel Amayal", official_name: "Hotel Amayal", display_name: "Hotel Amayal", google_maps_name: "Hotel Amayal", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_apiacere_restaurant", canonical_name: "A Piacere", official_name: "A Piacere", display_name: "A Piacere", google_maps_name: "A Piacere", place_type: "restaurant", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_aqva_restaurant", canonical_name: "Aqva Restaurant", official_name: "Aqva Restaurant", display_name: "Aqva Restaurant", google_maps_name: "Aqva Restaurant", place_type: "restaurant", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_bagu7bocas_hotel", canonical_name: "Bagu 7 Bocas", official_name: "Bagu 7 Bocas", display_name: "Bagu 7 Bocas", google_maps_name: "Bagu 7 Bocas", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_beerhotel_hostel", canonical_name: "Beer Hotel Iguazú", official_name: "Beer Hotel Iguazú", display_name: "Beer Hotel Iguazú", google_maps_name: "Beer Hotel Iguazú", place_type: "hostel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_benteveo_hostel", canonical_name: "Benteveo Hostel", official_name: "Benteveo Hostel", display_name: "Benteveo Hostel", google_maps_name: "Benteveo Hostel", place_type: "hostel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_bungalow_hostel", canonical_name: "Bungalow Hostel Iguazú", official_name: "Bungalow Hostel Iguazú", display_name: "Bungalow Hostel Iguazú", google_maps_name: "Bungalow Hostel Iguazú", place_type: "hostel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_bus_terminal", canonical_name: "Terminal de Ómnibus de Puerto Iguazú", official_name: "Terminal de Ómnibus de Puerto Iguazú", display_name: null, google_maps_name: "Terminal de Ómnibus de Puerto Iguazú", place_type: "bus_terminal", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 9, zone_id: "CENTRO" },
  { place_id: "ar_cantera_lodge", canonical_name: "La Cantera Jungle Lodge", official_name: "La Cantera Lodge", display_name: null, google_maps_name: "La Cantera Jungle Lodge", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 8, zone_id: "CENTRO" },
  { place_id: "ar_casino_iguazu", canonical_name: "Casino Iguazú", official_name: "Casino Iguazú / Grand Casino", display_name: null, google_maps_name: "Casino Iguazú", place_type: "casino", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 9, zone_id: "CENTRO" },
  { place_id: "ar_centro_iguazu_area", canonical_name: "Centro de Puerto Iguazú", official_name: "Área Urbana Puerto Iguazú", display_name: null, google_maps_name: "Centro de Puerto Iguazú", place_type: "tourist_area", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 9, zone_id: "CENTRO" },
  { place_id: "ar_colibri_hostel", canonical_name: "Colibri Hostel", official_name: "Colibri Hostel", display_name: "Colibri Hostel", google_maps_name: "Colibri Hostel", place_type: "hostel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_costadelsol_airbnb", canonical_name: "Costa del Sol Iguazú Cabañas", official_name: "Costa del Sol Iguazú Cabañas", display_name: "Costa del Sol Iguazú Cabañas", google_maps_name: "Costa del Sol Iguazú Cabañas", place_type: "airbnb", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_delafonte_restaurant", canonical_name: "De La Fonte", official_name: "De La Fonte", display_name: "De La Fonte", google_maps_name: "De La Fonte", place_type: "restaurant", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_duty_free_shopping", canonical_name: "Duty Free Shop Puerto Iguazú", official_name: "Duty Free Shop Puerto Iguazú S.A.", display_name: null, google_maps_name: "Duty Free Shop Puerto Iguazú", place_type: "shopping", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 9, zone_id: "CENTRO" },
  { place_id: "ar_elmensu_hotel", canonical_name: "El Mensu", official_name: "El Mensu", display_name: "El Mensu", google_maps_name: "El Mensu", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_experiencia_restaurant", canonical_name: "Experiencia Argentina", official_name: "Experiencia Argentina", display_name: "Experiencia Argentina", google_maps_name: "Experiencia Argentina", place_type: "restaurant", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_falls_iguazu_hotel", canonical_name: "Falls Iguazú Hotel & Spa", official_name: "Falls Iguazú Hotel", display_name: null, google_maps_name: "Falls Iguazú Hotel & Spa", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 9, zone_id: "CENTRO" },
  { place_id: "ar_feria_shopping", canonical_name: "La Feirinha de Puerto Iguazú", official_name: "Feria de Puerto Iguazú", display_name: null, google_maps_name: "La Feirinha", place_type: "shopping", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 8, zone_id: "CENTRO" },
  { place_id: "ar_fortin_restaurant", canonical_name: "Fortín Cataratas", official_name: "Fortín Cataratas", display_name: "Fortín Cataratas", google_maps_name: "Fortín Cataratas", place_type: "restaurant", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_grand_crucero", canonical_name: "Grand Crucero Iguazú Hotel", official_name: "Grand Crucero", display_name: null, google_maps_name: "Grand Crucero Iguazú Hotel", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 8, zone_id: "CENTRO" },
  { place_id: "ar_grand_resort", canonical_name: "Iguazu Grand Resort Spa & Casino", official_name: "Iguazu Grand Resort", display_name: null, google_maps_name: "Iguazu Grand Resort Spa & Casino", place_type: "resort", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 9, zone_id: "CENTRO" },
  { place_id: "ar_iguazu_jungle_hotel", canonical_name: "Iguazú Jungle Lodge", official_name: "Iguazú Jungle Lodge", display_name: null, google_maps_name: "Iguazú Jungle Lodge", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 9, zone_id: "CENTRO" },
  { place_id: "ar_iguazufalls_hostel", canonical_name: "Iguazu Falls Hostel", official_name: "Iguazu Falls Hostel", display_name: "Iguazu Falls Hostel", google_maps_name: "Iguazu Falls Hostel", place_type: "hostel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_laribera_airbnb", canonical_name: "La Ribera Apartamento", official_name: "La Ribera Apartamento", display_name: "La Ribera Apartamento", google_maps_name: "La Ribera Apartamento", place_type: "airbnb", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_larueda_restaurant", canonical_name: "La Rueda 1975", official_name: "La Rueda 1975", display_name: "La Rueda 1975", google_maps_name: "La Rueda 1975", place_type: "restaurant", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_loi_suites_hotel", canonical_name: "Loi Suites Iguazú Hotel", official_name: "Loi Suites Iguazú Hotel", display_name: null, google_maps_name: "Loi Suites Iguazú Hotel", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 9, zone_id: "CENTRO" },
  { place_id: "ar_lopez_hostel", canonical_name: "Hostel López", official_name: "Hostel López", display_name: "Hostel López", google_maps_name: "Hostel López", place_type: "hostel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_maderotango_restaurant", canonical_name: "Madero Tango Iguazú", official_name: "Madero Tango Iguazú", display_name: "Madero Tango Iguazú", google_maps_name: "Madero Tango Iguazú", place_type: "restaurant", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_marcopolo_suites", canonical_name: "Marcopolo Suites Iguazu", official_name: "Marcopolo Suites", display_name: null, google_maps_name: "Marcopolo Suites Iguazu", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 7, zone_id: "CENTRO" },
  { place_id: "ar_melia_hotel", canonical_name: "Gran Meliá Iguazú", official_name: "Gran Meliá Iguazú", display_name: null, google_maps_name: "Gran Meliá Iguazú", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 10, zone_id: "CENTRO" },
  { place_id: "ar_mercure_hotel", canonical_name: "Mercure Iguazu Hotel Iru", official_name: "Mercure Iguazu Hotel Iru", display_name: null, google_maps_name: "Mercure Iguazu Hotel Iru", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 9, zone_id: "CENTRO" },
  { place_id: "ar_naipi_restaurant", canonical_name: "Naipi Restaurant", official_name: "Naipi Restaurant", display_name: "Naipi Restaurant", google_maps_name: "Naipi Restaurant", place_type: "restaurant", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_nativa_hostel", canonical_name: "Nativa Iguazu", official_name: "Nativa Iguazu", display_name: "Nativa Iguazu", google_maps_name: "Nativa Iguazu", place_type: "hostel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_nomads_hostel", canonical_name: "Nomads Hostel Iguazu", official_name: "Nomads Hostel Iguazu", display_name: "Nomads Hostel Iguazu", google_maps_name: "Nomads Hostel Iguazu", place_type: "hostel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_o2_hotel", canonical_name: "O2 Hotel Iguazú", official_name: "O2 Hotel Iguazú", display_name: null, google_maps_name: "O2 Hotel Iguazú", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 9, zone_id: "CENTRO" },
  { place_id: "ar_overo_lodge", canonical_name: "Overo Lodge & Selva", official_name: "Overo Lodge & Selva", display_name: null, google_maps_name: "Overo Lodge & Selva", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 8, zone_id: "CENTRO" },
  { place_id: "ar_palma_real", canonical_name: "Palma Real Posada", official_name: "Palma Real Posada", display_name: null, google_maps_name: "Palma Real Posada", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 8, zone_id: "CENTRO" },
  { place_id: "ar_panoramic_grand", canonical_name: "Panoramic Grand Hotel", official_name: "Panoramic Grand", display_name: null, google_maps_name: "Panoramic Grand", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 9, zone_id: "CENTRO" },
  { place_id: "ar_patanegra_restaurant", canonical_name: "Patanegra Gourmet Iguazú", official_name: "Patanegra Gourmet Iguazú", display_name: "Patanegra Gourmet Iguazú", google_maps_name: "Patanegra Gourmet Iguazú", place_type: "restaurant", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_pirayu_resort", canonical_name: "Pirayu Lodge Resort", official_name: "Pirayu Lodge Resort", display_name: null, google_maps_name: "Pirayu Lodge Resort", place_type: "resort", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 7, zone_id: "CENTRO" },
  { place_id: "ar_plazacentro_landmark", canonical_name: "Plaza Principal Puerto Iguazú", official_name: "Plaza Principal Puerto Iguazú", display_name: "Plaza Principal Puerto Iguazú", google_maps_name: "Plaza Principal Puerto Iguazú", place_type: "landmark", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_port_iguazu", canonical_name: "Puerto de Puerto Iguazú", official_name: "Puerto de Puerto Iguazú", display_name: null, google_maps_name: "Puerto de Puerto Iguazú", place_type: "port", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 7, zone_id: "CENTRO" },
  { place_id: "ar_quincho_restaurant", canonical_name: "El Quincho del Tío Querido", official_name: "El Quincho del Tío Querido", display_name: "El Quincho del Tío Querido", google_maps_name: "El Quincho del Tío Querido", place_type: "restaurant", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_raices_esturion", canonical_name: "Raíces Esturión Hotel", official_name: "Raíces Esturión", display_name: null, google_maps_name: "Raíces Esturión Hotel", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 8, zone_id: "CENTRO" },
  { place_id: "ar_saint_george_hotel", canonical_name: "Hotel Saint George", official_name: "Hotel Saint George", display_name: null, google_maps_name: "Hotel Saint George", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 9, zone_id: "CENTRO" },
  { place_id: "ar_selvaje_lodge", canonical_name: "Selvaje Lodge Iguazu", official_name: "Selvaje Lodge Iguazu", display_name: null, google_maps_name: "Selvaje Lodge Iguazu", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 8, zone_id: "CENTRO" },
  { place_id: "ar_sweetguest_house", canonical_name: "Sweet Guest House", official_name: "Sweet Guest House", display_name: "Sweet Guest House", google_maps_name: "Sweet Guest House", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_tatucarreta_restaurant", canonical_name: "Tatu Carreta", official_name: "Tatu Carreta", display_name: "Tatu Carreta", google_maps_name: "Tatu Carreta", place_type: "restaurant", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_thehost_hostel", canonical_name: "The Host", official_name: "The Host", display_name: "The Host", google_maps_name: "The Host", place_type: "hostel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_tucan_hostel", canonical_name: "Tucan Hostel", official_name: "Tucan Hostel", display_name: null, google_maps_name: "Tucan Hostel", place_type: "hostel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 7, zone_id: "CENTRO" },
  { place_id: "ar_venancio_restaurant", canonical_name: "Venancio Parrilla Restaurant", official_name: "Venancio Parrilla Restaurant", display_name: "Venancio Parrilla Restaurant", google_maps_name: "Venancio Parrilla Restaurant", place_type: "restaurant", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_victoriaaguirre_airbnb", canonical_name: "Departamento Centro Victoria Aguirre", official_name: "Departamento Centro Victoria Aguirre", display_name: "Departamento Centro Victoria Aguirre", google_maps_name: "Departamento Centro Victoria Aguirre", place_type: "airbnb", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_victoriaaguirre_area", canonical_name: "Av. Victoria Aguirre", official_name: "Av. Victoria Aguirre", display_name: "Av. Victoria Aguirre", google_maps_name: "Av. Victoria Aguirre", place_type: "area", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "CENTRO" },
  { place_id: "ar_virgin_lodge", canonical_name: "La Reserva Virgin Lodge", official_name: "La Reserva Virgin Lodge", display_name: null, google_maps_name: "La Reserva Virgin Lodge", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 8, zone_id: "CENTRO" },
  { place_id: "ar_yvy_hotel", canonical_name: "Yvy Hotel de Selva", official_name: "Yvy Hotel de Selva", display_name: null, google_maps_name: "Yvy Hotel de Selva", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 8, zone_id: "CENTRO" },
  { place_id: "br_av_cataratas_area", canonical_name: "Corredor Turístico Avenida das Cataratas", official_name: "Avenida das Cataratas Corredor", display_name: null, google_maps_name: "Avenida das Cataratas", place_type: "tourist_area", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 9, zone_id: "FOZ_AVCATARATAS" },
  { place_id: "br_avcataratas_area", canonical_name: "Av. Cataratas", official_name: "Av. Cataratas", display_name: "Av. Cataratas", google_maps_name: "Av. Cataratas", place_type: "area", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 5, zone_id: "FOZ_AVCATARATAS" },
  { place_id: "br_buddhist_attraction", canonical_name: "Templo Budista Chen Tien", official_name: "Templo Budista Chen Tien", display_name: null, google_maps_name: "Templo Budista Chen Tien", place_type: "attraction", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 8, zone_id: "FOZ_AVCATARATAS" },
  { place_id: "br_bella_italia", canonical_name: "Hotel Bella Italia", official_name: "Hotel Bella Italia", display_name: null, google_maps_name: "Hotel Bella Italia", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 8, zone_id: "FOZ_CENTRO" },
  { place_id: "br_bendito_restaurant", canonical_name: "Bendito", official_name: "Bendito", display_name: "Bendito", google_maps_name: "Bendito", place_type: "restaurant", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 5, zone_id: "FOZ_CENTRO" },
  { place_id: "br_bufalobranco_restaurant", canonical_name: "Churrascaria Bufalo Branco", official_name: "Churrascaria Bufalo Branco", display_name: "Churrascaria Bufalo Branco", google_maps_name: "Churrascaria Bufalo Branco", place_type: "restaurant", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 5, zone_id: "FOZ_CENTRO" },
  { place_id: "br_bus_terminal", canonical_name: "Terminal Rodoviário de Foz do Iguaçu", official_name: "Terminal Rodoviário Internacional de Foz do Iguaçu", display_name: null, google_maps_name: "Rodoviária Internacional de Foz do Iguaçu", place_type: "bus_terminal", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 9, zone_id: "FOZ_CENTRO" },
  { place_id: "br_catedral_hotel", canonical_name: "Hotel Catedral", official_name: "Hotel Catedral", display_name: "Hotel Catedral", google_maps_name: "Hotel Catedral", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 5, zone_id: "FOZ_CENTRO" },
  { place_id: "br_catuai_shopping", canonical_name: "Catuaí Palladium Shopping Center", official_name: "Catuaí Palladium", display_name: null, google_maps_name: "Catuaí Palladium Shopping Center", place_type: "shopping", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 8, zone_id: "FOZ_CENTRO" },
  { place_id: "br_centro_foz_area", canonical_name: "Centro de Foz do Iguaçu", official_name: "Área Urbana Central de Foz do Iguaçu", display_name: null, google_maps_name: "Centro de Foz do Iguaçu", place_type: "tourist_area", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 9, zone_id: "FOZ_CENTRO" },
  { place_id: "br_churrascaria_rafain", canonical_name: "Churrascaria Rafain Show", official_name: "Churrascaria Rafain Show", display_name: null, google_maps_name: "Churrascaria Rafain Show", place_type: "restaurant", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 9, zone_id: "FOZ_CENTRO" },
  { place_id: "br_colonial_iguacu", canonical_name: "Hotel Colonial Iguaçu", official_name: "Hotel Colonial Iguaçu", display_name: null, google_maps_name: "Hotel Colonial Iguaçu", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 8, zone_id: "FOZ_CENTRO" },
  { place_id: "br_concept_hostel", canonical_name: "Concept Design Hostel & Suites", official_name: "Concept Design Hostel", display_name: null, google_maps_name: "Concept Design Hostel & Suites", place_type: "hostel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 7, zone_id: "FOZ_CENTRO" },
  { place_id: "br_dreams_attraction", canonical_name: "Dreams Park Show", official_name: "Complexo Dreams Park Show", display_name: null, google_maps_name: "Dreams Park Show Foz do Iguaçu", place_type: "attraction", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 8, zone_id: "FOZ_CENTRO" },
  { place_id: "br_grand_carima", canonical_name: "Grand Carimã Resort & Convention Center", official_name: "Grand Carimã", display_name: null, google_maps_name: "Grand Carimã Resort & Convention Center", place_type: "resort", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 8, zone_id: "FOZ_CENTRO" },
  { place_id: "br_jl_bourbon", canonical_name: "JL Hotel by Bourbon", official_name: "JL Hotel by Bourbon", display_name: null, google_maps_name: "JL Hotel by Bourbon", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 9, zone_id: "FOZ_CENTRO" },
  { place_id: "br_jl_shopping", canonical_name: "Cataratas JL Shopping", official_name: "Cataratas JL Shopping", display_name: null, google_maps_name: "Cataratas JL Shopping", place_type: "shopping", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 8, zone_id: "FOZ_CENTRO" },
  { place_id: "br_luz_hotel", canonical_name: "Luz Hotel by Castelo Itaipava", official_name: "Luz Hotel Foz", display_name: null, google_maps_name: "Luz Hotel by Castelo Itaipava", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 8, zone_id: "FOZ_CENTRO" },
  { place_id: "br_marco_attraction", canonical_name: "Marco das Três Fronteiras - Brasil", official_name: "Marco das Três Fronteiras Foz do Iguaçu", display_name: null, google_maps_name: "Marco das Três Fronteiras", place_type: "attraction", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 9, zone_id: "FOZ_CENTRO" },
  { place_id: "br_mirante_hotel", canonical_name: "Mirante Hotel", official_name: "Mirante Hotel", display_name: null, google_maps_name: "Mirante Hotel", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 8, zone_id: "FOZ_CENTRO" },
  { place_id: "br_port_meira", canonical_name: "Porto Meira", official_name: "Porto Meira Foz", display_name: null, google_maps_name: "Porto Meira", place_type: "port", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 6, zone_id: "FOZ_CENTRO" },
  { place_id: "br_taroba_hotel", canonical_name: "Tarobá Hotel", official_name: "Tarobá Hotel", display_name: null, google_maps_name: "Tarobá Hotel", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 9, zone_id: "FOZ_CENTRO" },
  { place_id: "br_tetris_hostel", canonical_name: "Tetris Container Hostel", official_name: "Tetris Container Hostel", display_name: null, google_maps_name: "Tetris Container Hostel", place_type: "hostel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 7, zone_id: "FOZ_CENTRO" },
  { place_id: "br_viale_cataratas", canonical_name: "Viale Cataratas Hotel & Eventos", official_name: "Viale Cataratas", display_name: null, google_maps_name: "Viale Cataratas Hotel & Eventos", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 9, zone_id: "FOZ_CENTRO" },
  { place_id: "br_wanderlust_hostel", canonical_name: "Hostel Wanderlust", official_name: "Hostel Wanderlust", display_name: null, google_maps_name: "Hostel Wanderlust", place_type: "hostel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 7, zone_id: "FOZ_CENTRO" },
  { place_id: "br_wyndham_foz", canonical_name: "Wyndham Foz do Iguaçu", official_name: "Wyndham Foz do Iguaçu", display_name: null, google_maps_name: "Wyndham Foz do Iguaçu", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 8, zone_id: "FOZ_CENTRO" },
  { place_id: "br_wyndham_golden", canonical_name: "Wyndham Golden Foz Suites", official_name: "Wyndham Golden Foz Suites", display_name: null, google_maps_name: "Wyndham Golden Foz Suites", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 8, zone_id: "FOZ_CENTRO" },
  { place_id: "br_yupstar_attraction", canonical_name: "Yup Star Foz - Rueda Gigante", official_name: "Yup Star Foz Roda Gigante", display_name: null, google_maps_name: "Yup Star Foz", place_type: "attraction", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 8, zone_id: "FOZ_CENTRO" },
  { place_id: "br_belmond_hotel", canonical_name: "Hotel das Cataratas, A Belmond Hotel", official_name: "Hotel das Cataratas", display_name: null, google_maps_name: "Hotel das Cataratas, A Belmond Hotel, Iguassu Falls", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 10, zone_id: "FOZ_HOTEIS" },
  { place_id: "br_bourbon_hotel", canonical_name: "Bourbon Thermas Eco Resort", official_name: "Bourbon Thermas Eco Resort", display_name: "Bourbon Thermas Eco Resort", google_maps_name: "Bourbon Thermas Eco Resort", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 5, zone_id: "FOZ_HOTEIS" },
  { place_id: "br_doubletree_hotel", canonical_name: "DoubleTree by Hilton Foz do Iguaçu", official_name: "DoubleTree by Hilton Resort", display_name: null, google_maps_name: "DoubleTree by Hilton Foz do Iguaçu", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 9, zone_id: "FOZ_HOTEIS" },
  { place_id: "br_eco_cataratas_hotel", canonical_name: "Eco Cataratas Resort by SJ", official_name: "Eco Cataratas Resort by SJ", display_name: "Eco Cataratas Resort by SJ", google_maps_name: "Eco Cataratas Resort by SJ", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 5, zone_id: "FOZ_HOTEIS" },
  { place_id: "br_mabu_hotel", canonical_name: "Mabu Thermas Grand Resort", official_name: "Mabu Thermas Grand Resort", display_name: "Mabu Thermas Grand Resort", google_maps_name: "Mabu Thermas Grand Resort", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 5, zone_id: "FOZ_HOTEIS" },
  { place_id: "br_rafain_convention", canonical_name: "Centro de Convenciones Rafain Palace", official_name: "Centro de Convenções Rafain", display_name: null, google_maps_name: "Rafain Palace Hotel & Convention Center", place_type: "event_center", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 8, zone_id: "FOZ_HOTEIS" },
  { place_id: "br_rafain_palace", canonical_name: "Rafain Palace Hotel & Convention Center", official_name: "Rafain Palace", display_name: null, google_maps_name: "Rafain Palace Hotel & Convention Center", place_type: "resort", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 9, zone_id: "FOZ_HOTEIS" },
  { place_id: "br_recanto_hotel", canonical_name: "Recanto Cataratas Thermas Resort", official_name: "Recanto Cataratas Thermas Resort", display_name: "Recanto Cataratas Thermas Resort", google_maps_name: "Recanto Cataratas Thermas Resort", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 5, zone_id: "FOZ_HOTEIS" },
  { place_id: "br_sanma_hotel", canonical_name: "Sanma Hotel", official_name: "Sanma Hotel", display_name: null, google_maps_name: "Sanma Hotel", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 9, zone_id: "FOZ_HOTEIS" },
  { place_id: "br_vivaz_hotel", canonical_name: "Vivaz Cataratas Resort", official_name: "Vivaz Cataratas Resort", display_name: "Vivaz Cataratas Resort", google_maps_name: "Vivaz Cataratas Resort", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 5, zone_id: "FOZ_HOTEIS" },
  { place_id: "br_wish_hotel", canonical_name: "Wish Foz do Iguaçu Resort", official_name: "Wish Foz do Iguaçu Resort", display_name: "Wish Foz do Iguaçu Resort", google_maps_name: "Wish Foz do Iguaçu Resort", place_type: "hotel", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 5, zone_id: "FOZ_HOTEIS" },
  { place_id: "ar_aguasdanzantes_attraction", canonical_name: "Aguas Danzantes", official_name: "Aguas Danzantes", display_name: "Aguas Danzantes", google_maps_name: "Aguas Danzantes", place_type: "attraction", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "HITO_Y_COSTANERA" },
  { place_id: "ar_amerianportal_hotel", canonical_name: "Gran Amérian Portal del Iguazú", official_name: "Gran Amérian Portal del Iguazú", display_name: "Gran Amérian Portal del Iguazú", google_maps_name: "Gran Amérian Portal del Iguazú", place_type: "hotel", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "HITO_Y_COSTANERA" },
  { place_id: "ar_costanera_area", canonical_name: "Costanera de Puerto Iguazú", official_name: "Costanera de Puerto Iguazú", display_name: "Costanera de Puerto Iguazú", google_maps_name: "Costanera de Puerto Iguazú", place_type: "area", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 5, zone_id: "HITO_Y_COSTANERA" },
  { place_id: "ar_hito_attraction", canonical_name: "Hito Tres Fronteras - Argentina", official_name: "Hito Tres Fronteras Puerto Iguazú", display_name: null, google_maps_name: "Hito de las Tres Fronteras", place_type: "attraction", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 9, zone_id: "HITO_Y_COSTANERA" },
  { place_id: "br_itaipu_attraction", canonical_name: "Represa de Itaipú Binacional", official_name: "Itaipu Binacional - Usina Hidrelétrica", display_name: null, google_maps_name: "Itaipu Binacional", place_type: "attraction", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 10, zone_id: "ITAIPU" },
  { place_id: "br_itaipupanoramica_attraction", canonical_name: "Itaipu Panorâmica", official_name: "Itaipu Panorâmica", display_name: "Itaipu Panorâmica", google_maps_name: "Itaipu Panorâmica", place_type: "attraction", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 5, zone_id: "ITAIPU" },
  { place_id: "py_itaipu_attraction", canonical_name: "Represa de Itaipú Binacional Paraguay", official_name: "Itaipu Binacional - Margen Derecha", display_name: null, google_maps_name: "Itaipu Binacional Paraguay", place_type: "attraction", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 9, zone_id: "ITAIPU" },
  { place_id: "py_itaipu_complejo_attraction", canonical_name: "Complejo Turístico ITAIPU (lado PY)", official_name: "Complejo Turístico ITAIPU (lado PY)", display_name: "Complejo Turístico ITAIPU (lado PY)", google_maps_name: "Complejo Turístico ITAIPU (lado PY)", place_type: "attraction", city: "Hernandarias", country: "PY", tourist_relevance_score: 5, zone_id: "ITAIPU" },
  { place_id: "py_tekotopa_attraction", canonical_name: "Tekotopa Centro Ambiental ITAIPU", official_name: "Tekotopa Centro Ambiental ITAIPU", display_name: "Tekotopa Centro Ambiental ITAIPU", google_maps_name: "Tekotopa Centro Ambiental ITAIPU", place_type: "attraction", city: "Hernandarias", country: "PY", tourist_relevance_score: 5, zone_id: "ITAIPU" },
  { place_id: "py_br_border", canonical_name: "Aduana Paraguay-Brasil (Puente de la Amistad)", official_name: "Administración de Aduana Ciudad del Este", display_name: null, google_maps_name: "Control Migratorio Paraguayo - Puente de la Amistad", place_type: "border_crossing", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 10, zone_id: "PUENTE_AMISTAD" },
  { place_id: "py_puenteamistad_landmark", canonical_name: "Puente de la Amistad - Lado Paraguay", official_name: "Puente de la Amistad - Lado Paraguay", display_name: "Puente de la Amistad - Lado Paraguay", google_maps_name: "Puente de la Amistad - Lado Paraguay", place_type: "landmark", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 5, zone_id: "PUENTE_AMISTAD" },
  { place_id: "ld_eldorado_aca_hotel", canonical_name: "Hotel ACA Eldorado", official_name: "Hotel ACA Eldorado", display_name: "Hotel ACA Eldorado", google_maps_name: "Hotel ACA Eldorado", place_type: "hotel", city: "Eldorado", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_ELDORADO" },
  { place_id: "ld_eldorado_copacabana_hotel", canonical_name: "Complejo Turístico Copacabana", official_name: "Complejo Turístico Copacabana", display_name: "Complejo Turístico Copacabana", google_maps_name: "Complejo Turístico Copacabana", place_type: "hotel", city: "Eldorado", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_ELDORADO" },
  { place_id: "ld_eldorado_sanvalentin_hotel", canonical_name: "Hotel Cabañas San Valentín", official_name: "Hotel Cabañas San Valentín", display_name: "Hotel Cabañas San Valentín", google_maps_name: "Hotel Cabañas San Valentín", place_type: "hotel", city: "Eldorado", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_ELDORADO" },
  { place_id: "ld_eldorado_unlugar_hotel", canonical_name: "Un Lugar Hotel Cabañas", official_name: "Un Lugar Hotel Cabañas", display_name: "Un Lugar Hotel Cabañas", google_maps_name: "Un Lugar Hotel Cabañas", place_type: "hotel", city: "Eldorado", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_ELDORADO" },
  { place_id: "ld_esperanza_area", canonical_name: "Esperanza - Pueblo", official_name: "Esperanza - Pueblo", display_name: "Esperanza - Pueblo", google_maps_name: "Esperanza - Pueblo", place_type: "area", city: "Esperanza", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_ESPERANZA" },
  { place_id: "ar_mocona_attraction", canonical_name: "Saltos del Moconá", official_name: "Parque Provincial Moconá", display_name: null, google_maps_name: "Saltos del Moconá", place_type: "attraction", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 7, zone_id: "ZONE_AR_LD_MOCONA" },
  { place_id: "ld_mocona_guazu_lodge", canonical_name: "Mocona Guazu", official_name: "Mocona Guazu", display_name: "Mocona Guazu", google_maps_name: "Mocona Guazu", place_type: "hotel", city: "Saltos del Moconá", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_MOCONA" },
  { place_id: "ld_mocona_parque_attraction", canonical_name: "Saltos del Moconá - Parque", official_name: "Saltos del Moconá - Parque", display_name: "Saltos del Moconá - Parque", google_maps_name: "Saltos del Moconá - Parque", place_type: "attraction", city: "Saltos del Moconá", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_MOCONA" },
  { place_id: "ld_mocona_piedraagua_lodge", canonical_name: "Piedra y Agua Eco Lodge", official_name: "Piedra y Agua Eco Lodge", display_name: "Piedra y Agua Eco Lodge", google_maps_name: "Piedra y Agua Eco Lodge", place_type: "hotel", city: "Saltos del Moconá", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_MOCONA" },
  { place_id: "ld_mocona_virgin_lodge", canonical_name: "Mocona Virgin Lodge", official_name: "Mocona Virgin Lodge", display_name: "Mocona Virgin Lodge", google_maps_name: "Mocona Virgin Lodge", place_type: "hotel", city: "Saltos del Moconá", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_MOCONA" },
  { place_id: "ld_mocona_yasiyateré_lodge", canonical_name: "Yasí Yateré", official_name: "Yasí Yateré", display_name: "Yasí Yateré", google_maps_name: "Yasí Yateré", place_type: "hotel", city: "Saltos del Moconá", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_MOCONA" },
  { place_id: "ld_posadas_americanpark_attraction", canonical_name: "Parque American Park", official_name: "Parque American Park", display_name: "Parque American Park", google_maps_name: "Parque American Park", place_type: "attraction", city: "Posadas", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_POSADAS" },
  { place_id: "ld_posadas_batista_hotel", canonical_name: "Hotel Batista", official_name: "Hotel Batista", display_name: "Hotel Batista", google_maps_name: "Hotel Batista", place_type: "hotel", city: "Posadas", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_POSADAS" },
  { place_id: "ld_posadas_costanera_area", canonical_name: "Costanera de Posadas", official_name: "Costanera de Posadas", display_name: "Costanera de Posadas", google_maps_name: "Costanera de Posadas", place_type: "area", city: "Posadas", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_POSADAS" },
  { place_id: "ld_posadas_lamision_hotel", canonical_name: "Hotel La Mision", official_name: "Hotel La Mision", display_name: "Hotel La Mision", google_maps_name: "Hotel La Mision", place_type: "hotel", city: "Posadas", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_POSADAS" },
  { place_id: "ld_ptolibertad_bemberg_lodge", canonical_name: "Puerto Bemberg Lodge", official_name: "Puerto Bemberg Lodge", display_name: "Puerto Bemberg Lodge", google_maps_name: "Puerto Bemberg Lodge", place_type: "hotel", city: "Puerto Libertad", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_PTO_LIBERTAD" },
  { place_id: "ld_ptolibertad_pristine_lodge", canonical_name: "Pristine Iguazú Luxury Camp", official_name: "Pristine Iguazú Luxury Camp", display_name: "Pristine Iguazú Luxury Camp", google_maps_name: "Pristine Iguazú Luxury Camp", place_type: "hotel", city: "Puerto Libertad", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_PTO_LIBERTAD" },
  { place_id: "ld_ptolibertad_yvyra_hotel", canonical_name: "YVYRA Hotel & Cabañas", official_name: "YVYRA Hotel & Cabañas", display_name: "YVYRA Hotel & Cabañas", google_maps_name: "YVYRA Hotel & Cabañas", place_type: "hotel", city: "Puerto Libertad", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_PTO_LIBERTAD" },
  { place_id: "ar_san_ignacio_attraction", canonical_name: "Ruinas de San Ignacio Miní", official_name: "Reducción Jesuítica de San Ignacio Miní", display_name: null, google_maps_name: "Ruinas Jesuíticas de San Ignacio Miní", place_type: "attraction", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 8, zone_id: "ZONE_AR_LD_SAN_IGNACIO" },
  { place_id: "ld_sanignacio_carpaazul_restaurant", canonical_name: "La Carpa Azul", official_name: "La Carpa Azul", display_name: "La Carpa Azul", google_maps_name: "La Carpa Azul", place_type: "restaurant", city: "San Ignacio", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_SAN_IGNACIO" },
  { place_id: "ld_sanignacio_delfuego_restaurant", canonical_name: "Del Fuego Resto", official_name: "Del Fuego Resto", display_name: "Del Fuego Resto", google_maps_name: "Del Fuego Resto", place_type: "restaurant", city: "San Ignacio", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_SAN_IGNACIO" },
  { place_id: "ld_sanignacio_misionerita_restaurant", canonical_name: "La Misionerita", official_name: "La Misionerita", display_name: "La Misionerita", google_maps_name: "La Misionerita", place_type: "restaurant", city: "San Ignacio", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_SAN_IGNACIO" },
  { place_id: "ld_sanignacio_montes_hotel", canonical_name: "Hostería Montes", official_name: "Hostería Montes", display_name: "Hostería Montes", google_maps_name: "Hostería Montes", place_type: "hotel", city: "San Ignacio", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_SAN_IGNACIO" },
  { place_id: "ld_elsoberbio_anava_lodge", canonical_name: "Anavá Lodge de Selva", official_name: "Anavá Lodge de Selva", display_name: "Anavá Lodge de Selva", google_maps_name: "Anavá Lodge de Selva", place_type: "hotel", city: "El Soberbio", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_SOBERBIO" },
  { place_id: "ld_elsoberbio_donenrique_hotel", canonical_name: "Hotel y Restaurante Don Enrique", official_name: "Hotel y Restaurante Don Enrique", display_name: "Hotel y Restaurante Don Enrique", google_maps_name: "Hotel y Restaurante Don Enrique", place_type: "hotel", city: "El Soberbio", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_SOBERBIO" },
  { place_id: "ld_elsoberbio_misionmocona_lodge", canonical_name: "La Misión Moconá - Lodge de Selva", official_name: "La Misión Moconá - Lodge de Selva", display_name: "La Misión Moconá - Lodge de Selva", google_maps_name: "La Misión Moconá - Lodge de Selva", place_type: "hotel", city: "El Soberbio", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_SOBERBIO" },
  { place_id: "ld_elsoberbio_puromocona_lodge", canonical_name: "Puro Moconá Lodge", official_name: "Puro Moconá Lodge", display_name: "Puro Moconá Lodge", google_maps_name: "Puro Moconá Lodge", place_type: "hotel", city: "El Soberbio", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_SOBERBIO" },
  { place_id: "ar_wanda_attraction", canonical_name: "Minas de Wanda", official_name: "Compañía Minera Wanda", display_name: null, google_maps_name: "Minas de Wanda", place_type: "attraction", city: "Puerto Iguazú", country: "AR", tourist_relevance_score: 8, zone_id: "ZONE_AR_LD_WANDA" },
  { place_id: "ld_wanda_amatista_hotel", canonical_name: "Hotel Amatista", official_name: "Hotel Amatista", display_name: "Hotel Amatista", google_maps_name: "Hotel Amatista", place_type: "hotel", city: "Wanda", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_WANDA" },
  { place_id: "ld_wanda_lasbrisas_hotel", canonical_name: "Hotel & Restaurant Las Brisas", official_name: "Hotel & Restaurant Las Brisas", display_name: "Hotel & Restaurant Las Brisas", google_maps_name: "Hotel & Restaurant Las Brisas", place_type: "hotel", city: "Wanda", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_WANDA" },
  { place_id: "ld_wanda_mina_attraction", canonical_name: "Mina Wanda", official_name: "Mina Wanda", display_name: "Mina Wanda", google_maps_name: "Mina Wanda", place_type: "attraction", city: "Wanda", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_WANDA" },
  { place_id: "ld_wanda_parqueguarani_attraction", canonical_name: "Parque Guaraní", official_name: "Parque Guaraní", display_name: "Parque Guaraní", google_maps_name: "Parque Guaraní", place_type: "attraction", city: "Wanda", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_AR_LD_WANDA" },
  { place_id: "br_aduanatn_border", canonical_name: "Aduana Brasil - Puente Tancredo Neves", official_name: "Aduana Brasil - Puente Tancredo Neves", display_name: "Aduana Brasil - Puente Tancredo Neves", google_maps_name: "Aduana Brasil - Puente Tancredo Neves", place_type: "border", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 5, zone_id: "ZONE_FOZ_ADUANA_BR" },
  { place_id: "br_ar_border", canonical_name: "Aduana Brasil-Argentina (Ponte Tancredo Neves)", official_name: "Inspetoria da Receita Federal em Foz do Iguaçu", display_name: null, google_maps_name: "Posto de Controle Migratório da Polícia Federal - Ponte Tancredo Neves", place_type: "border_crossing", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 10, zone_id: "ZONE_FOZ_ADUANA_BR" },
  { place_id: "br_puentetn_landmark", canonical_name: "Puente Tancredo Neves - Lado Brasil", official_name: "Puente Tancredo Neves - Lado Brasil", display_name: "Puente Tancredo Neves - Lado Brasil", google_maps_name: "Puente Tancredo Neves - Lado Brasil", place_type: "landmark", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 5, zone_id: "ZONE_FOZ_ADUANA_BR" },
  { place_id: "br_py_border", canonical_name: "Aduana Brasil-Paraguay (Ponte da Amizade)", official_name: "Posto de Controle Fiscal - Receita Federal", display_name: null, google_maps_name: "Posto de Controle Migratório - Ponte da Amizade", place_type: "border_crossing", city: "Foz do Iguaçu", country: "BR", tourist_relevance_score: 10, zone_id: "ZONE_FOZ_ADUANA_BR" },
  { place_id: "ar_tupa_lodge", canonical_name: "Tupá Lodge", official_name: "Tupá Lodge", display_name: "Tupá Lodge", google_maps_name: "Tupá Lodge", place_type: "hotel", city: "Santa Rosa", country: "AR", tourist_relevance_score: 5, zone_id: "ZONE_IGR_TUPA" },
  { place_id: "py_asuncion_area", canonical_name: "Asunción - Centro", official_name: "Asunción - Centro", display_name: "Asunción - Centro", google_maps_name: "Asunción - Centro", place_type: "area", city: "Asunción", country: "PY", tourist_relevance_score: 5, zone_id: "ZONE_PY_ASUNCION" },
  { place_id: "py_cabecerapuente_landmark", canonical_name: "Cabecera Puente de la Amistad - Lado PY", official_name: "Cabecera Puente de la Amistad - Lado PY", display_name: "Cabecera Puente de la Amistad - Lado PY", google_maps_name: "Cabecera Puente de la Amistad - Lado PY", place_type: "landmark", city: "Ciudad del Este", country: "PY", tourist_relevance_score: 5, zone_id: "ZONE_PY_CABECERA_PUENTE" },
];

// ═══════════════════════════════════════════════════════════════════════
// ALIASES
// ═══════════════════════════════════════════════════════════════════════

const ALIASES: Array<{ place_id: string; alias: string; language: string }> = [
  { place_id: "ar_amerianportal_hotel", alias: "amerian", language: "es" },
  { place_id: "ar_amerianportal_hotel", alias: "amerian portal", language: "es" },
  { place_id: "ar_amerianportal_hotel", alias: "amérian", language: "es" },
  { place_id: "ar_aripuca_attraction", alias: "aripuca", language: "es" },
  { place_id: "ar_aripuca_attraction", alias: "la aripuca", language: "es" },
  { place_id: "ar_cataratas_attraction", alias: "argentine falls", language: "en" },
  { place_id: "ar_cataratas_attraction", alias: "cataratas ar", language: "es" },
  { place_id: "ar_cataratas_attraction", alias: "cataratas argentina", language: "es" },
  { place_id: "ar_cataratas_attraction", alias: "cataratas argentinas", language: "es" },
  { place_id: "ar_cataratas_attraction", alias: "lado argentino", language: "es" },
  { place_id: "ar_duty_free_shopping", alias: "duty free", language: "en" },
  { place_id: "ar_duty_free_shopping", alias: "duty free ar", language: "es" },
  { place_id: "ar_duty_free_shopping", alias: "duty free iguazu", language: "en" },
  { place_id: "ar_duty_free_shopping", alias: "duty free puerto iguazu", language: "es" },
  { place_id: "ar_duty_free_shopping", alias: "shop libre de impuestos", language: "es" },
  { place_id: "ar_falls_iguazu_hotel", alias: "falls hotel", language: "en" },
  { place_id: "ar_falls_iguazu_hotel", alias: "falls iguazu", language: "en" },
  { place_id: "ar_feria_shopping", alias: "feirinha", language: "pt" },
  { place_id: "ar_feria_shopping", alias: "la feirinha", language: "es" },
  { place_id: "ar_grand_resort", alias: "iguazu grand", language: "en" },
  { place_id: "ar_grand_resort", alias: "iguazú grand", language: "es" },
  { place_id: "ar_guira_attraction", alias: "guira oga", language: "es" },
  { place_id: "ar_hito_attraction", alias: "hito", language: "es" },
  { place_id: "ar_hito_attraction", alias: "hito ar", language: "es" },
  { place_id: "ar_hito_attraction", alias: "hito de las tres fronteras", language: "es" },
  { place_id: "ar_icebar_attraction", alias: "bar de hielo", language: "es" },
  { place_id: "ar_icebar_attraction", alias: "icebar", language: "en" },
  { place_id: "ar_igr_airport", alias: "aeroporto igr", language: "pt" },
  { place_id: "ar_igr_airport", alias: "aeropuerto de puerto iguazu", language: "es" },
  { place_id: "ar_igr_airport", alias: "aeropuerto igr", language: "es" },
  { place_id: "ar_igr_airport", alias: "argentina airport", language: "en" },
  { place_id: "ar_igr_airport", alias: "igr", language: "es" },
  { place_id: "ar_igr_airport", alias: "iguazu airport argentina", language: "en" },
  { place_id: "ar_igr_airport", alias: "puerto iguazu airport", language: "en" },
  { place_id: "ar_loi_suites_hotel", alias: "hotel loi suites", language: "es" },
  { place_id: "ar_loi_suites_hotel", alias: "loi", language: "es" },
  { place_id: "ar_loi_suites_hotel", alias: "loi suites", language: "es" },
  { place_id: "ar_loi_suites_hotel", alias: "loi suites de la selva", language: "es" },
  { place_id: "ar_loi_suites_hotel", alias: "loi suites hotel", language: "en" },
  { place_id: "ar_loi_suites_hotel", alias: "loi suites iguazu", language: "en" },
  { place_id: "ar_loi_suites_hotel", alias: "loi suites iguazú", language: "es" },
  { place_id: "ar_loi_suites_hotel", alias: "loy suites", language: "en" },
  { place_id: "ar_loi_suites_hotel", alias: "pick up at loy suites", language: "en" },
  { place_id: "ar_melia_hotel", alias: "gran melia", language: "es" },
  { place_id: "ar_melia_hotel", alias: "gran melia iguazu", language: "en" },
  { place_id: "ar_melia_hotel", alias: "gran meliá", language: "es" },
  { place_id: "ar_melia_hotel", alias: "gran meliá iguazú", language: "es" },
  { place_id: "ar_melia_hotel", alias: "hotel melia", language: "es" },
  { place_id: "ar_melia_hotel", alias: "hotel meliá", language: "es" },
  { place_id: "ar_melia_hotel", alias: "melia", language: "es" },
  { place_id: "ar_melia_hotel", alias: "melia argentina", language: "pt" },
  { place_id: "ar_melia_hotel", alias: "melia cataratas", language: "pt" },
  { place_id: "ar_melia_hotel", alias: "melia iguazu", language: "en" },
  { place_id: "ar_melia_hotel", alias: "meliá", language: "es" },
  { place_id: "ar_mercure_hotel", alias: "mercure", language: "es" },
  { place_id: "ar_mercure_hotel", alias: "mercure iguazu", language: "en" },
  { place_id: "ar_mercure_hotel", alias: "mercure iru", language: "es" },
  { place_id: "ar_o2_hotel", alias: "o2", language: "es" },
  { place_id: "ar_o2_hotel", alias: "o2 hotel", language: "en" },
  { place_id: "ar_o2_hotel", alias: "o2 iguazu", language: "en" },
  { place_id: "ar_panoramic_grand", alias: "panoramic", language: "es" },
  { place_id: "ar_panoramic_grand", alias: "panoramic grand", language: "en" },
  { place_id: "ar_saint_george_hotel", alias: "hotel saint george", language: "en" },
  { place_id: "ar_saint_george_hotel", alias: "saint george", language: "en" },
  { place_id: "ar_saint_george_hotel", alias: "saint george hotel", language: "en" },
  { place_id: "ar_saint_george_hotel", alias: "saint jorge", language: "es" },
  { place_id: "ar_saint_george_hotel", alias: "san george", language: "es" },
  { place_id: "ar_san_ignacio_attraction", alias: "ruinas de san ignacio", language: "es" },
  { place_id: "ar_san_ignacio_attraction", alias: "san ignacio", language: "es" },
  { place_id: "ar_wanda_attraction", alias: "minas de wanda", language: "es" },
  { place_id: "ar_wanda_attraction", alias: "wanda", language: "es" },
  { place_id: "br_aves_attraction", alias: "bird park", language: "en" },
  { place_id: "br_aves_attraction", alias: "parque aves", language: "es" },
  { place_id: "br_aves_attraction", alias: "parque das aves", language: "pt" },
  { place_id: "br_aves_attraction", alias: "parque de las aves", language: "es" },
  { place_id: "br_bella_italia", alias: "bella italia", language: "pt" },
  { place_id: "br_bella_italia", alias: "hotel bella italia", language: "pt" },
  { place_id: "br_belmond_hotel", alias: "belmond", language: "en" },
  { place_id: "br_belmond_hotel", alias: "belmond cataratas", language: "pt" },
  { place_id: "br_belmond_hotel", alias: "belmond hotel", language: "en" },
  { place_id: "br_belmond_hotel", alias: "das cataratas", language: "pt" },
  { place_id: "br_belmond_hotel", alias: "hotel das cataratas", language: "pt" },
  { place_id: "br_bourbon_hotel", alias: "bourbon", language: "pt" },
  { place_id: "br_bourbon_hotel", alias: "bourbon cataratas", language: "pt" },
  { place_id: "br_bourbon_hotel", alias: "bourbon resort", language: "en" },
  { place_id: "br_buddhist_attraction", alias: "templo budista", language: "es" },
  { place_id: "br_cataratas_attraction", alias: "brazilian falls", language: "en" },
  { place_id: "br_cataratas_attraction", alias: "cataratas br", language: "es" },
  { place_id: "br_cataratas_attraction", alias: "cataratas brasil", language: "es" },
  { place_id: "br_cataratas_attraction", alias: "cataratas brasileiras", language: "pt" },
  { place_id: "br_cataratas_attraction", alias: "cataratas brasileñas", language: "es" },
  { place_id: "br_cataratas_attraction", alias: "falls brazil", language: "en" },
  { place_id: "br_cataratas_attraction", alias: "lado brasileiro", language: "pt" },
  { place_id: "br_churrascaria_rafain", alias: "churrascaria rafain", language: "pt" },
  { place_id: "br_churrascaria_rafain", alias: "rafain", language: "es" },
  { place_id: "br_churrascaria_rafain", alias: "rafain foz", language: "pt" },
  { place_id: "br_churrascaria_rafain", alias: "rafain show", language: "es" },
  { place_id: "br_churrascaria_rafain", alias: "vamos al rafain", language: "es" },
  { place_id: "br_doubletree_hotel", alias: "double tree", language: "en" },
  { place_id: "br_doubletree_hotel", alias: "doubletree", language: "en" },
  { place_id: "br_doubletree_hotel", alias: "doubletree foz", language: "en" },
  { place_id: "br_doubletree_hotel", alias: "doubletree hilton", language: "en" },
  { place_id: "br_doubletree_hotel", alias: "doubletree hilton foz", language: "en" },
  { place_id: "br_doubletree_hotel", alias: "hilton foz", language: "es" },
  { place_id: "br_igu_airport", alias: "aeroporto de foz", language: "pt" },
  { place_id: "br_igu_airport", alias: "aeroporto foz", language: "pt" },
  { place_id: "br_igu_airport", alias: "foz airport", language: "en" },
  { place_id: "br_igu_airport", alias: "foz do iguacu airport", language: "en" },
  { place_id: "br_igu_airport", alias: "igu", language: "pt" },
  { place_id: "br_igu_airport", alias: "igu airport", language: "en" },
  { place_id: "br_itaipu_attraction", alias: "itaipu", language: "es" },
  { place_id: "br_itaipu_attraction", alias: "itaipu binacional", language: "pt" },
  { place_id: "br_itaipu_attraction", alias: "itaipu dam", language: "en" },
  { place_id: "br_itaipu_attraction", alias: "represa de itaipu", language: "pt" },
  { place_id: "br_mabu_hotel", alias: "mabu", language: "pt" },
  { place_id: "br_mabu_hotel", alias: "mabu resort", language: "en" },
  { place_id: "br_mabu_hotel", alias: "mabu thermas", language: "pt" },
  { place_id: "br_marco_attraction", alias: "marco", language: "pt" },
  { place_id: "br_marco_attraction", alias: "marco das tres fronteiras", language: "pt" },
  { place_id: "br_yupstar_attraction", alias: "rueda gigante", language: "es" },
  { place_id: "br_yupstar_attraction", alias: "yup star", language: "en" },
  { place_id: "py_casino_acaray_hotel", alias: "acaray hotel", language: "es" },
  { place_id: "py_casino_acaray_hotel", alias: "casino acaray", language: "es" },
  { place_id: "py_cellshop_shopping", alias: "cell shop", language: "en" },
  { place_id: "py_cellshop_shopping", alias: "cellshop", language: "en" },
  { place_id: "py_cellshop_shopping", alias: "cellshop cde", language: "es" },
  { place_id: "py_cellshop_shopping", alias: "cellshop paraguay", language: "en" },
  { place_id: "py_china_shopping", alias: "china cde", language: "es" },
  { place_id: "py_china_shopping", alias: "china paraguay", language: "es" },
  { place_id: "py_china_shopping", alias: "shopping china", language: "es" },
  { place_id: "py_del_este_shopping", alias: "compras cde", language: "es" },
  { place_id: "py_del_este_shopping", alias: "compras paraguay", language: "es" },
  { place_id: "py_del_este_shopping", alias: "shopping del este", language: "es" },
  { place_id: "py_itaipu_attraction", alias: "itaipu paraguay", language: "es" },
  { place_id: "py_monalisa_shopping", alias: "monalisa", language: "es" },
  { place_id: "py_monday_attraction", alias: "monday falls", language: "en" },
  { place_id: "py_monday_attraction", alias: "saltos del monday", language: "es" },
  { place_id: "py_monday_attraction", alias: "saltos monday", language: "es" },
  { place_id: "py_nissei_shopping", alias: "nissei", language: "es" },
  { place_id: "py_paris_shopping", alias: "shopping paris", language: "es" },
  { place_id: "py_rio_bourbon", alias: "rio bourbon", language: "pt" },
  { place_id: "py_rio_bourbon", alias: "rio hotel cde", language: "es" },
  { place_id: "py_sax_shopping", alias: "sax", language: "en" },
  { place_id: "py_sax_shopping", alias: "sax paraguay", language: "en" },
  // ═══ ADUANA / BORDER aliases (multi-idioma) ═══
  // AR side — Aduana Tancredo Neves (ar_aduanatn_border)
  { place_id: "ar_aduanatn_border", alias: "aduana argentina", language: "es" },
  { place_id: "ar_aduanatn_border", alias: "aduana tancredo neves", language: "es" },
  { place_id: "ar_aduanatn_border", alias: "argentine customs", language: "en" },
  { place_id: "ar_aduanatn_border", alias: "customs argentina", language: "en" },
  { place_id: "ar_aduanatn_border", alias: "alfândega argentina", language: "pt" },
  { place_id: "ar_aduanatn_border", alias: "aduana lado argentino", language: "es" },
  { place_id: "ar_aduanatn_border", alias: "argentine side", language: "en" },
  { place_id: "ar_aduanatn_border", alias: "lado argentino aduana", language: "es" },
  // BR side — Aduana Brasil (br_aduanatn_border)
  { place_id: "br_aduanatn_border", alias: "aduana brasil", language: "es" },
  { place_id: "br_aduanatn_border", alias: "aduana brasileña", language: "es" },
  { place_id: "br_aduanatn_border", alias: "alfândega brasileira", language: "pt" },
  { place_id: "br_aduanatn_border", alias: "aduana brasileira", language: "pt" },
  { place_id: "br_aduanatn_border", alias: "brazilian customs", language: "en" },
  { place_id: "br_aduanatn_border", alias: "brazil customs", language: "en" },
  { place_id: "br_aduanatn_border", alias: "aduana lado brasileño", language: "es" },
  { place_id: "br_aduanatn_border", alias: "brazilian side", language: "en" },
  // Border crossing — generic
  { place_id: "ar_br_border", alias: "border checkpoint", language: "en" },
  { place_id: "ar_br_border", alias: "border crossing", language: "en" },
  { place_id: "ar_br_border", alias: "paso fronterizo", language: "es" },
  { place_id: "ar_br_border", alias: "frontera argentina brasil", language: "es" },
  { place_id: "ar_br_border", alias: "fronteira argentina brasil", language: "pt" },
  { place_id: "ar_br_border", alias: "puente tancredo neves", language: "es" },
  { place_id: "ar_br_border", alias: "tancredo neves bridge", language: "en" },
  { place_id: "ar_br_border", alias: "tancredo neves border", language: "en" },
  { place_id: "ar_br_border", alias: "aduana argentina brasil", language: "es" },
  { place_id: "ar_br_border", alias: "customs check", language: "en" },
  { place_id: "ar_br_border", alias: "aduana", language: "es" },
  { place_id: "ar_br_border", alias: "customs", language: "en" },
  { place_id: "ar_br_border", alias: "alfândega", language: "pt" },
  { place_id: "ar_br_border", alias: "checkpoint", language: "en" },
  { place_id: "ar_br_border", alias: "aduan", language: "es" },
];

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

interface TariffSeed {
  origin_place_id: string | null;
  destination_place_id: string | null;
  origin_zone_id: string | null;
  destination_zone_id: string | null;
  public_price_4p: number | null;
  public_price_6p: number | null;
  driver_price_4p: number | null;
  driver_price_6p: number | null;
  crosses_border: number;
  resolution_priority: number;
}

function makeTariff(
  oPlace: string | null, dPlace: string | null,
  oZone: string | null, dZone: string | null,
  p4: number | null, p6: number | null,
  dp4: number | null, dp6: number | null,
  cb: number, rp: number,
): TariffSeed {
  return { origin_place_id: oPlace, destination_place_id: dPlace,
    origin_zone_id: oZone, destination_zone_id: dZone,
    public_price_4p: p4, public_price_6p: p6,
    driver_price_4p: dp4, driver_price_6p: dp6,
    crosses_border: cb, resolution_priority: rp };
}

function crossesBorder(oz: string, dz: string): number {
  const countries: Record<string, string> = {
    "600HAS_FONDO": "AR",
    "600HAS_RESTO": "AR",
    "ACCESO_RUTA12": "AR",
    "ADUANA_TN": "AR",
    "AEROPUERTO_IGR": "AR",
    "AEROPUERTO_IGU": "BR",
    "CATARATAS": "AR",
    "CATARATAS_BR": "BR",
    "CDE_HOTELES": "PY",
    "CDE_MICROCENTRO": "PY",
    "CENTRO": "AR",
    "FOZ_AVCATARATAS": "BR",
    "FOZ_CENTRO": "BR",
    "FOZ_HOTEIS": "BR",
    "HITO_Y_COSTANERA": "AR",
    "ITAIPU": "BR",
    "PUENTE_AMISTAD": "PY",
    "ZONE_AR_LD_ELDORADO": "AR",
    "ZONE_AR_LD_ESPERANZA": "AR",
    "ZONE_AR_LD_MOCONA": "AR",
    "ZONE_AR_LD_POSADAS": "AR",
    "ZONE_AR_LD_PTO_LIBERTAD": "AR",
    "ZONE_AR_LD_SAN_IGNACIO": "AR",
    "ZONE_AR_LD_SOBERBIO": "AR",
    "ZONE_AR_LD_WANDA": "AR",
    "ZONE_FOZ_ADUANA_BR": "BR",
    "ZONE_IGR_SANTA_ROSA": "AR",
    "ZONE_IGR_TUPA": "AR",
    "ZONE_PY_ASUNCION": "PY",
    "ZONE_PY_CABECERA_PUENTE": "PY",
  };
  return countries[oz] !== countries[dz] ? 1 : 0;
}

// ═══════════════════════════════════════════════════════════════════════
// OVERRIDE TARIFFS (place→place, resolution_priority 1-3)
// ═══════════════════════════════════════════════════════════════════════

const ZONE_IDS = [
  "600HAS_FONDO",
  "600HAS_RESTO",
  "ACCESO_RUTA12",
  "ADUANA_TN",
  "AEROPUERTO_IGR",
  "AEROPUERTO_IGU",
  "CATARATAS",
  "CATARATAS_BR",
  "CDE_HOTELES",
  "CDE_MICROCENTRO",
  "CENTRO",
  "FOZ_AVCATARATAS",
  "FOZ_CENTRO",
  "FOZ_HOTEIS",
  "HITO_Y_COSTANERA",
  "ITAIPU",
  "PUENTE_AMISTAD",
  "ZONE_AR_LD_ELDORADO",
  "ZONE_AR_LD_ESPERANZA",
  "ZONE_AR_LD_MOCONA",
  "ZONE_AR_LD_POSADAS",
  "ZONE_AR_LD_PTO_LIBERTAD",
  "ZONE_AR_LD_SAN_IGNACIO",
  "ZONE_AR_LD_SOBERBIO",
  "ZONE_AR_LD_WANDA",
  "ZONE_FOZ_ADUANA_BR",
  "ZONE_IGR_SANTA_ROSA",
  "ZONE_IGR_TUPA",
  "ZONE_PY_ASUNCION",
  "ZONE_PY_CABECERA_PUENTE",
];

const OVERRIDES: TariffSeed[] = [
  makeTariff("ar_centro_iguazu_area", "ar_duty_free_shopping", "CENTRO", "CENTRO", 15000, 21000, 12000, 16000, 1, 1),
  makeTariff("ar_igr_airport", "ar_duty_free_shopping", "AEROPUERTO_IGR", "CENTRO", 52000, 72000, 41000, 56000, 1, 1),
  makeTariff("ar_centro_iguazu_area", "br_belmond_hotel", "CENTRO", "FOZ_HOTEIS", 60000, 84000, 48000, 67000, 1, 1),
  makeTariff("ar_igr_airport", "br_centro_foz_area", "AEROPUERTO_IGR", "FOZ_CENTRO", 85000, 97000, 68000, 77000, 1, 2),
  makeTariff("ar_igr_airport", "br_belmond_hotel", "AEROPUERTO_IGR", "FOZ_HOTEIS", 85000, 119000, 68000, 95000, 1, 1),
  makeTariff("ar_igr_airport", "br_igu_airport", "AEROPUERTO_IGR", "AEROPUERTO_IGU", 85000, 119000, 68000, 95000, 1, 2),
  makeTariff("ar_igr_airport", "br_itaipu_attraction", "AEROPUERTO_IGR", "ITAIPU", 130000, 182000, 104000, 145000, 1, 2),
  makeTariff("ar_igr_airport", "py_centro_cde_area", "AEROPUERTO_IGR", "CDE_MICROCENTRO", 137000, 191000, 109000, 152000, 1, 2),
];

// ═══════════════════════════════════════════════════════════════════════
// ZONE→ZONE TARIFFS (resolution_priority 4)
// ═══════════════════════════════════════════════════════════════════════

function generateZonePairs(): TariffSeed[] {
  const result: TariffSeed[] = [];

  // Priced zone→zone pairs (inferred from override analysis)
  const PRICED: Record<string, { p4: number; p6: number; cb: number }> = {
    "ACCESO_RUTA12|CENTRO": { p4: 12000, p6: 16000, cb: 0 },
    "AEROPUERTO_IGR|ACCESO_RUTA12": { p4: 32000, p6: 44000, cb: 0 },
    "AEROPUERTO_IGR|CATARATAS": { p4: 32000, p6: 44000, cb: 0 },
    "AEROPUERTO_IGR|CATARATAS_BR": { p4: 85000, p6: 119000, cb: 1 },
    "AEROPUERTO_IGR|CENTRO": { p4: 32000, p6: 44000, cb: 0 },
    "AEROPUERTO_IGR|FOZ_HOTEIS": { p4: 104000, p6: 145000, cb: 1 },
    "AEROPUERTO_IGR|HITO_Y_COSTANERA": { p4: 32000, p6: 44000, cb: 0 },
    "AEROPUERTO_IGR|ZONE_FOZ_ADUANA_BR": { p4: 65000, p6: 91000, cb: 1 },
    "CENTRO|ACCESO_RUTA12": { p4: 12000, p6: 16000, cb: 0 },
    "CENTRO|ADUANA_TN": { p4: 20000, p6: 28000, cb: 0 },
    "CENTRO|AEROPUERTO_IGR": { p4: 32000, p6: 44000, cb: 0 },
    "CENTRO|AEROPUERTO_IGU": { p4: 55000, p6: 77000, cb: 1 },
    "CENTRO|CATARATAS": { p4: 35000, p6: 49000, cb: 0 },
    "CENTRO|CDE_MICROCENTRO": { p4: 104500, p6: 146000, cb: 1 },
    "CENTRO|FOZ_CENTRO": { p4: 60000, p6: 84000, cb: 1 },
    "CENTRO|FOZ_HOTEIS": { p4: 72000, p6: 100000, cb: 1 },
    "CENTRO|HITO_Y_COSTANERA": { p4: 10000, p6: 14000, cb: 0 },
    "CENTRO|ITAIPU": { p4: 97500, p6: 136000, cb: 1 },
    "CENTRO|ZONE_AR_LD_ELDORADO": { p4: 195000, p6: 273000, cb: 0 },
    "CENTRO|ZONE_AR_LD_ESPERANZA": { p4: 98000, p6: 137000, cb: 0 },
    "CENTRO|ZONE_AR_LD_POSADAS": { p4: 569000, p6: 786000, cb: 0 },
    "CENTRO|ZONE_AR_LD_PTO_LIBERTAD": { p4: 72000, p6: 100000, cb: 0 },
    "CENTRO|ZONE_AR_LD_SAN_IGNACIO": { p4: 475000, p6: 665000, cb: 0 },
    "CENTRO|ZONE_AR_LD_SOBERBIO": { p4: 505000, p6: 707000, cb: 0 },
    "CENTRO|ZONE_AR_LD_WANDA": { p4: 85000, p6: 119000, cb: 0 },
    "CENTRO|ZONE_FOZ_ADUANA_BR": { p4: 32000, p6: 44000, cb: 1 },
    "CENTRO|ZONE_PY_ASUNCION": { p4: 1000000, p6: 1400000, cb: 1 },
    "CENTRO|ZONE_PY_CABECERA_PUENTE": { p4: 80000, p6: 112000, cb: 1 },
  };

  for (const oz of ZONE_IDS) {
    for (const dz of ZONE_IDS) {
      if (oz === dz) continue;
      const key = oz + "|" + dz;
      const p = PRICED[key];
      const cb = crossesBorder(oz, dz);
      if (p) {
        result.push(makeTariff(null, null, oz, dz, p.p4, p.p6, null, null, p.cb, 4));
      } else {
        result.push(makeTariff(null, null, oz, dz, null, null, null, null, cb, 4));
      }
    }
  }
  return result;
}

const ZONE_PAIRS = generateZonePairs();
const TARIFFS = [...OVERRIDES, ...ZONE_PAIRS];

// ═══════════════════════════════════════════════════════════════════════
// SEED EXECUTION
// ═══════════════════════════════════════════════════════════════════════

async function seed() {
  await ensureSchema();
  const db = getDb();

  console.log("🌱 Sembrando grafo de zonas...");

  // ── Zonas ──────────────────────────────────────────────────────
  for (const z of ZONES) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO zones
        (zone_id, zone_name, country, area_group, dispatch_priority, base_eta_min, surcharge_description, surcharge_pct)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [z.zone_id, z.zone_name, z.country, z.area_group, z.dispatch_priority, z.base_eta_min, z.surcharge_description, z.surcharge_pct],
    });
  }
  console.log(`  ✓ ${ZONES.length} zonas`);

  // ── Places ─────────────────────────────────────────────────────
  const COUNTRY_MAP: Record<string, string> = { AR: "Argentina", BR: "Brasil", PY: "Paraguay" };
  for (const p of PLACES) {
    const displayName = p.display_name
      ?? `${p.canonical_name} (${COUNTRY_MAP[p.country ?? ""] ?? p.country ?? ""})`.trim();
    await db.execute({
      sql: `INSERT OR IGNORE INTO places
        (place_id, canonical_name, official_name, display_name, google_maps_name,
         place_type, city, country, tourist_relevance_score, zone_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [p.place_id, p.canonical_name, p.official_name, displayName, p.google_maps_name,
        p.place_type, p.city, p.country, p.tourist_relevance_score, p.zone_id],
    });
  }
  console.log(`  ✓ ${PLACES.length} places`);

  // ── Aliases ────────────────────────────────────────────────────
  let aliasCount = 0;
  for (const a of ALIASES) {
    const exists = await db.execute({
      sql: "SELECT id FROM aliases WHERE place_id = ? AND alias = ? AND language = ?",
      args: [a.place_id, a.alias, a.language],
    });
    if (exists.rows && exists.rows.length > 0) continue;
    await db.execute({
      sql: "INSERT INTO aliases (place_id, alias, language) VALUES (?, ?, ?)",
      args: [a.place_id, a.alias, a.language],
    });
    aliasCount++;
  }
  console.log(`  ✓ ${aliasCount} aliases insertados (${ALIASES.length} definidos)`);

  // ── Tarifas ────────────────────────────────────────────────────
  let tariffCount = 0;
  for (const t of TARIFFS) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO tariffs
        (origin, destination, modality, origin_place_id, destination_place_id,
         origin_zone_id, destination_zone_id,
         public_price_4p, public_price_6p, driver_price_4p, driver_price_6p,
         crosses_border, resolution_priority, active)
        VALUES (?, ?, 'transfer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [
        t.origin_place_id ?? t.origin_zone_id ?? "",
        t.destination_place_id ?? t.destination_zone_id ?? "",
        t.origin_place_id, t.destination_place_id, t.origin_zone_id, t.destination_zone_id,
        t.public_price_4p, t.public_price_6p, t.driver_price_4p, t.driver_price_6p,
        t.crosses_border, t.resolution_priority,
      ],
    });
    tariffCount++;
  }
  console.log(`  ✓ ${tariffCount} tarifas`);

  console.log("✅ Seed completo");
}

seed().catch(console.error);
