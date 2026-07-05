// Schema Zod para migration.json
// Valida la estructura de procedimientos migratorios.

import { z } from "zod";

export const MigrationSchema = z.object({
  requiredDocs: z.array(z.string()),
  qrInfo: z.string(),
  minorsInfo: z.string(),
  taxFreeInfo: z.string(),
  insuranceInfo: z.string(),
  eVisaInfo: z.string(),
  byNationality: z.array(z.string()),
});

export type MigrationData = z.infer<typeof MigrationSchema>;
