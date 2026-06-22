// kuhik-core/backend/src/modules/utility-costs/cost.schema.ts

import { z } from 'zod';

export const createCostSchema = z.object({
  type: z.enum(['electricity', 'water', 'heating', 'gas', 'other']),
  periodStart: z.string().min(1, 'Alguskuupäev on kohustuslik'),
  periodEnd: z.string().min(1, 'Lõppkuupäev on kohustuslik'),
  totalAmount: z.number().positive('Summa peab olema positiivne'),
  currency: z.string().default('EUR'),
  supplierName: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

export const updateCostSchema = z.object({
  type: z.enum(['electricity', 'water', 'heating', 'gas', 'other']).optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  totalAmount: z.number().positive().optional(),
  currency: z.string().optional(),
  supplierName: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

export type CreateCostInput = z.infer<typeof createCostSchema>;
export type UpdateCostInput = z.infer<typeof updateCostSchema>;