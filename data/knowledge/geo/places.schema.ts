// Schema Zod para places.json
// Valida la estructura de cada lugar conocido en la triple frontera.

import { z } from "zod";

export const PlaceSchema = z.object({
  name: z.string(),
  aliases: z.array(z.string()),
  type: z.enum(["park", "hotel", "landmark", "airport", "shopping", "customs", "neighborhood", "restaurant"]),
  city: z.string().optional(),
  country: z.string().optional(),
  price: z.string().optional(),
  hours: z.string().optional(),
  tips: z.string().optional(),
  _note: z.string().optional(),
});

export const PlacesArraySchema = z.array(PlaceSchema);

export type Place = z.infer<typeof PlaceSchema>;
