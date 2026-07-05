// Schema Zod para operations.json
// Valida la estructura de información operacional de TaxiGuazú.

import { z } from "zod";

export const OperationsSchema = z.object({
  coordination: z.array(z.string()),
  borderCrossing: z.array(z.string()),
  pricing: z.array(z.string()),
  tripTypes: z.array(z.string()),
  communication: z.array(z.string()),
  tips: z.array(z.string()),
  driverAssistance: z.array(z.string()),
  airportProtocol: z.array(z.string()),
});

export type OperationsData = z.infer<typeof OperationsSchema>;
