// kuhik-core/backend/src/modules/buildings/building.schema.ts

import { z } from 'zod';

export const createBuildingSchema = z.object({
  name: z.string().min(1, 'Hoone nimi on kohustuslik').max(200),
  address: z.string().max(300).optional().nullable(),
  type: z.string().default('apartment_building'),
});

export const updateBuildingSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(300).optional().nullable(),
  type: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateBuildingInput = z.infer<typeof createBuildingSchema>;
export type UpdateBuildingInput = z.infer<typeof updateBuildingSchema>;
