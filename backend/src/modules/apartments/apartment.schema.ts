// kuhik-core/backend/src/modules/apartments/apartment.schema.ts

import { z } from 'zod';

export const createApartmentSchema = z.object({
  unitLabel: z.string().min(1, 'Korteri number on kohustuslik').max(100),
  floor: z.number().int().optional().nullable(),
  areaSqm: z.number().positive().optional().nullable(),
  heatedAreaSqm: z.number().positive().optional().nullable(),
  occupancy: z.number().int().default(1),
});

export const updateApartmentSchema = z.object({
  unitLabel: z.string().min(1).max(100).optional(),
  floor: z.number().int().optional().nullable(),
  areaSqm: z.number().positive().optional().nullable(),
  heatedAreaSqm: z.number().positive().optional().nullable(),
  occupancy: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export type CreateApartmentInput = z.infer<typeof createApartmentSchema>;
export type UpdateApartmentInput = z.infer<typeof updateApartmentSchema>;