// kuhik-core/backend/src/modules/allocation/allocation.schema.ts

import { z } from 'zod';

export const runAllocationSchema = z.object({
  periodStart: z.string().min(1, 'Alguskuupäev on kohustuslik'),
  periodEnd: z.string().min(1, 'Lõppkuupäev on kohustuslik'),
});

export type RunAllocationInput = z.infer<typeof runAllocationSchema>;