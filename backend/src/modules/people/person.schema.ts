// kuhik-core/backend/src/modules/people/person.schema.ts

import { z } from 'zod';

export const createPersonSchema = z.object({
  fullName: z.string().min(1, 'Nimi on kohustuslik').max(200),
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  personalCode: z.string().max(20).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updatePersonSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  personalCode: z.string().max(20).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const createApartmentPersonSchema = z.object({
  personId: z.string().min(1),
  relationshipType: z.enum(['OWNER', 'RESIDENT', 'CONTACT']),
  isPrimary: z.boolean().default(false),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
});

export const updateApartmentPersonSchema = z.object({
  relationshipType: z.enum(['OWNER', 'RESIDENT', 'CONTACT']).optional(),
  isPrimary: z.boolean().optional(),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
export type CreateApartmentPersonInput = z.infer<typeof createApartmentPersonSchema>;
export type UpdateApartmentPersonInput = z.infer<typeof updateApartmentPersonSchema>;