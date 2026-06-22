// kuhik-core/backend/src/modules/payments/payments.schema.ts

import { z } from 'zod';

export const createPaymentSchema = z.object({
  amount: z.number().positive('Makse summa peab olema positiivne'),
  method: z.enum(['bank_transfer', 'cash', 'other']).default('bank_transfer'),
  reference: z.string().max(100).optional().nullable(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;