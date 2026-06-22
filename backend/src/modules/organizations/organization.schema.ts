// kuhik-core/backend/src/modules/organizations/organization.schema.ts
// Zod validation schemas for organization routes

import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Nimi on kohustuslik').max(200),
  slug: z.string().min(2).max(50).optional(),
  registryCode: z.string().max(20).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  contactEmail: z.string().email().max(200).optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  registryCode: z.string().max(20).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  contactEmail: z.string().email().max(200).optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;