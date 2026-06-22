// kuhik-core/backend/src/modules/invoices/invoices.schema.ts

import { z } from 'zod';

export const generateInvoicesSchema = z.object({
  allocationRunId: z.string().min(1),
});

export type GenerateInvoicesInput = z.infer<typeof generateInvoicesSchema>;