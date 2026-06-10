// Location Display — capa explícita de DISPLAY COMERCIAL
//
// Separa el nombre mostrado al cliente de:
//   1. aliases (comprensión del usuario)
//   2. canonical IDs (operación interna)
//   3. tarifario (pricing)
//
// getLocationDisplay(id) retorna el nombre comercial para un ID.
// Si el ID no está registrado, fallback al ID mismo.

export interface LocationDisplay {
  id: string;
  displayName: string;
}

const DISPLAY_MAP: Record<string, string> = {
  // Aeropuertos
  AIRPORT_IGR: "Aeropuerto Internacional de Puerto Iguazú",
  AIRPORT_IGU_FOZ: "Aeropuerto Internacional de Foz do Iguaçu",

  // Centros urbanos
  CITY_CENTER_IGUAZU: "Centro de Puerto Iguazú",
  CITY_CENTER_FOZ: "Centro de Foz do Iguaçu",
  CIUDAD_DEL_ESTE_CENTER: "Centro de Ciudad del Este",

  // Terminales
  BUS_TERMINAL_IGUAZU: "Terminal de Ómnibus de Puerto Iguazú",

  // Puntos turísticos
  THREE_BORDERS: "Hito Tres Fronteras",
  CATARATAS_AR: "Cataratas Argentinas",
  CATARATAS_BR: "Cataratas Brasileñas",

  // Hoteles — Puerto Iguazú
  MELIA_IGUAZU: "Gran Meliá Iguazú",
  AMERIAN_IGUAZU: "Hotel Amerian Portal del Iguazú",
  IRYAPU: "Zona Hotelera Iryapú",

  // Hoteles — Foz do Iguaçu
  MABU_FOZ: "Mabu Thermas Grand Resort",
  RAFAIN_FOZ: "Rafain Palace Hotel",
};

export function getLocationDisplay(id: string): string {
  return DISPLAY_MAP[id] ?? id;
}
