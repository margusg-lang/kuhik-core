// kuhik-core/backend/src/modules/apartment-meters/meter.schema.ts

import { z } from 'zod';

export const createMeterSchema = z.object({
  meterType: z.enum(['water', 'electricity', 'heating', 'gas']),
  unit: z.enum(['m3', 'kWh', 'MWh', 'm3_h']).default('m3'),
  serialNumber: z.string().max(100).optional().nullable(),
  label: z.string().max(200).optional().nullable(),
});

export const updateMeterSchema = z.object({
  meterType: z.enum(['water', 'electricity', 'heating', 'gas']).optional(),
  unit: z.enum(['m3', 'kWh', 'MWh', 'm3_h']).optional(),
  serialNumber: z.string().max(100).optional().nullable(),
  label: z.string().max(200).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateMeterInput = z.infer<typeof createMeterSchema>;
export type UpdateMeterInput = z.infer<typeof updateMeterSchema>;