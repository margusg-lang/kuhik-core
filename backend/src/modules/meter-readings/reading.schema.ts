// kuhik-core/backend/src/modules/meter-readings/reading.schema.ts

import { z } from 'zod';

export const createReadingSchema = z.object({
  value: z.number().min(0, 'Näit peab olema positiivne'),
  timestamp: z.string().optional().nullable(),
  source: z.enum(['manual', 'import']).default('manual'),
});

export type CreateReadingInput = z.infer<typeof createReadingSchema>;