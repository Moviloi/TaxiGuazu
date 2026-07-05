// Schema Zod para borders.json
// Valida la estructura de la información de cruces fronterizos.

import { z } from "zod";

export const BorderSchema = z.object({
  tancredoNeves: z.array(z.string()),
  puenteAmistad: z.array(z.string()),
  corredorTuristico: z.array(z.string()),
  manifiesto: z.array(z.string()),
  customsDuty: z.array(z.string()),
});

export type BorderData = z.infer<typeof BorderSchema>;
