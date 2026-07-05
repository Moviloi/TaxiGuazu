// Schema Zod para calendar.json
// Valida la estructura del calendario de eventos y feriados.

import { z } from "zod";

export const CalendarSchema = z.object({
  lunaLlena: z.array(z.string()),
  holidaysArgentina: z.array(z.string()),
  holidaysBrasil: z.array(z.string()),
  holidaysParaguay: z.array(z.string()),
  seasons: z.array(z.string()),
});

export type CalendarData = z.infer<typeof CalendarSchema>;
