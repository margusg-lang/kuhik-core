// kuhik-core/backend/prisma/seed/utils/helpers.ts
// Reusable factory functions for seed data creation

import { Prisma } from "@prisma/client";
import { getPrisma } from "./db.js";

// ─── Tenant (Org) ──────────────────────────────────────────────
export async function createOrg(data: {
  name: string;
  slug: string;
  registryCode?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
}) {
  const prisma = getPrisma();
  return prisma.tenant.create({
    data: {
      name: data.name,
      slug: data.slug,
      registryCode: data.registryCode ?? null,
      address: data.address ?? null,
      contactEmail: data.contactEmail ?? null,
      contactPhone: data.contactPhone ?? null,
      isActive: true,
      settings: {},
    },
  });
}

// ─── User + TenantUser ────────────────────────────────────────
export async function createUserWithTenantRole(data: {
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
}) {
  const prisma = getPrisma();
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: data.passwordHash,
      isActive: true,
    },
  });
  const tu = await prisma.tenantUser.create({
    data: {
      tenantId: data.tenantId,
      userId: user.id,
      role: data.role,
      isActive: true,
    },
  });
  return { user, tenantUser: tu };
}

// ─── Building ──────────────────────────────────────────────────
export async function createBuilding(data: {
  tenantId: string;
  name: string;
  address?: string;
  type?: string;
}) {
  const prisma = getPrisma();
  return prisma.building.create({
    data: {
      tenantId: data.tenantId,
      name: data.name,
      address: data.address ?? null,
      type: data.type ?? "apartment_building",
      metadata: {},
      isActive: true,
    },
  });
}

// ─── Apartment ─────────────────────────────────────────────────
export async function createApartment(data: {
  tenantId: string;
  buildingId: string;
  unitLabel: string;
  floor?: number;
  areaSqm?: number;
  heatedAreaSqm?: number;
  calculatedAreaSqm?: number;
  occupancy?: number;
  ownershipShare?: number;
}) {
  const prisma = getPrisma();
  return prisma.apartment.create({
    data: {
      tenantId: data.tenantId,
      buildingId: data.buildingId,
      unitLabel: data.unitLabel,
      floor: data.floor ?? null,
      areaSqm: data.areaSqm ?? null,
      heatedAreaSqm: data.heatedAreaSqm ?? null,
      calculatedAreaSqm: data.calculatedAreaSqm ?? null,
      occupancy: data.occupancy ?? 1,
      ownershipShare: data.ownershipShare ?? null,
      metadata: {},
      isActive: true,
    },
  });
}

// ─── Person ────────────────────────────────────────────────────
export async function createPerson(data: {
  tenantId: string;
  fullName: string;
  email?: string;
  phone?: string;
  personalCode?: string;
}) {
  const prisma = getPrisma();
  return prisma.person.create({
    data: {
      tenantId: data.tenantId,
      fullName: data.fullName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      personalCode: data.personalCode ?? null,
      isActive: true,
    },
  });
}

// ─── ApartmentPerson (link) ────────────────────────────────────
export async function linkPersonApartment(data: {
  tenantId: string;
  apartmentId: string;
  personId: string;
  relationshipType?: string;
  isPrimary?: boolean;
  validFrom?: Date;
  validTo?: Date;
}) {
  const prisma = getPrisma();
  return prisma.apartmentPerson.create({
    data: {
      tenantId: data.tenantId,
      apartmentId: data.apartmentId,
      personId: data.personId,
      relationshipType: data.relationshipType ?? "RESIDENT",
      isPrimary: data.isPrimary ?? false,
      validFrom: data.validFrom ?? null,
      validTo: data.validTo ?? null,
    },
  });
}

// ─── ResourceType ──────────────────────────────────────────────
export async function createResourceType(data: {
  tenantId: string;
  buildingId?: string;
  name: string;
  code: string;
  category?: string;
  unitLabel?: string;
}) {
  const prisma = getPrisma();
  return prisma.resourceType.create({
    data: {
      tenantId: data.tenantId,
      buildingId: data.buildingId ?? null,
      name: data.name,
      code: data.code,
      category: data.category ?? "utility",
      unitLabel: data.unitLabel ?? "units",
      metadata: {},
      isActive: true,
    },
  });
}

// ─── ApartmentMeter (WAVE 3 style) ────────────────────────────
export async function createApartmentMeter(data: {
  tenantId: string;
  apartmentId: string;
  meterType: string;
  unit?: string;
  serialNumber?: string;
  label?: string;
}) {
  const prisma = getPrisma();
  return prisma.apartmentMeter.create({
    data: {
      tenantId: data.tenantId,
      apartmentId: data.apartmentId,
      meterType: data.meterType,
      unit: data.unit ?? "m3",
      serialNumber: data.serialNumber ?? null,
      label: data.label ?? null,
      isActive: true,
    },
  });
}

// ─── ApartmentMeterReading (WAVE 3 style) ─────────────────────
export async function createApartmentMeterReading(data: {
  meterId: string;
  tenantId: string;
  value: number;
  timestamp: Date;
  source?: string;
}) {
  const prisma = getPrisma();
  return prisma.apartmentMeterReading.create({
    data: {
      meterId: data.meterId,
      tenantId: data.tenantId,
      value: data.value,
      timestamp: data.timestamp,
      source: data.source ?? "manual",
    },
  });
}

// ─── Meter (legacy WAVE 1 style) ──────────────────────────────
export async function createMeter(data: {
  tenantId: string;
  buildingId: string;
  resourceTypeId: string;
  apartmentId?: string;
  serialNumber?: string;
  label?: string;
  multiplier?: number;
}) {
  const prisma = getPrisma();
  return prisma.meter.create({
    data: {
      tenantId: data.tenantId,
      buildingId: data.buildingId,
      resourceTypeId: data.resourceTypeId,
      apartmentId: data.apartmentId ?? null,
      serialNumber: data.serialNumber ?? null,
      label: data.label ?? null,
      multiplier: data.multiplier ?? 1,
      metadata: {},
      isActive: true,
    },
  });
}

// ─── MeterReading (legacy WAVE 1 style) ────────────────────────
export async function createMeterReading(data: {
  meterId: string;
  tenantId: string;
  apartmentId?: string;
  value: number;
  readingDate: Date;
  source?: string;
  isEstimated?: boolean;
}) {
  const prisma = getPrisma();
  return prisma.meterReading.create({
    data: {
      meterId: data.meterId,
      tenantId: data.tenantId,
      apartmentId: data.apartmentId ?? null,
      value: data.value,
      readingDate: data.readingDate,
      source: data.source ?? "manual",
      isEstimated: data.isEstimated ?? false,
      isAnomaly: false,
      metadata: {},
    },
  });
}

// ─── OwnershipHistory ──────────────────────────────────────────
export async function createOwnershipHistory(data: {
  tenantId: string;
  apartmentId: string;
  ownerId: string;
  ownerName: string;
  share?: number;
  startDate: Date;
  endDate?: Date;
  isCurrent?: boolean;
  reason?: string;
}) {
  const prisma = getPrisma();
  return prisma.ownershipHistory.create({
    data: {
      tenantId: data.tenantId,
      apartmentId: data.apartmentId,
      ownerId: data.ownerId,
      ownerName: data.ownerName,
      share: data.share ?? 1.0,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      isCurrent: data.isCurrent ?? true,
      reason: data.reason ?? "purchase",
      metadata: {},
    },
  });
}

// ─── UtilityCost ───────────────────────────────────────────────
export async function createUtilityCost(data: {
  tenantId: string;
  type?: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: number;
  currency?: string;
  supplierName?: string;
  description?: string;
}) {
  const prisma = getPrisma();
  return prisma.utilityCost.create({
    data: {
      tenantId: data.tenantId,
      type: data.type ?? "other",
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      totalAmount: data.totalAmount,
      currency: data.currency ?? "EUR",
      supplierName: data.supplierName ?? null,
      description: data.description ?? null,
      source: "manual",
    },
  });
}

// ─── AllocationRun + Items ─────────────────────────────────────
export async function createAllocationRun(data: {
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  status?: string;
  meta?: Prisma.InputJsonValue;
}) {
  const prisma = getPrisma();
  return prisma.allocationRun.create({
    data: {
      tenantId: data.tenantId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      status: data.status ?? "draft",
      meta: data.meta ?? {},
    },
  });
}

export async function createAllocationItem(data: {
  runId: string;
  apartmentId: string;
  costType: string;
  method?: string;
  amount: number;
  consumptionPct?: number;
}) {
  const prisma = getPrisma();
  return prisma.allocationItem.create({
    data: {
      runId: data.runId,
      apartmentId: data.apartmentId,
      costType: data.costType,
      method: data.method ?? "flat",
      amount: data.amount,
      consumptionPct: data.consumptionPct ?? null,
    },
  });
}

// ─── KuhikInvoice + Items ──────────────────────────────────────
export async function createKuhikInvoice(data: {
  tenantId: string;
  apartmentId: string;
  allocationRunId: string;
  invoiceNumber: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: number;
  status?: string;
  issuedAt?: Date;
}) {
  const prisma = getPrisma();
  return prisma.kuhikInvoice.create({
    data: {
      tenantId: data.tenantId,
      apartmentId: data.apartmentId,
      allocationRunId: data.allocationRunId,
      invoiceNumber: data.invoiceNumber,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      totalAmount: data.totalAmount,
      status: data.status ?? "draft",
      issuedAt: data.issuedAt ?? null,
    },
  });
}

export async function createKuhikInvoiceItem(data: {
  invoiceId: string;
  costType: string;
  amount: number;
  source?: string;
}) {
  const prisma = getPrisma();
  return prisma.kuhikInvoiceItem.create({
    data: {
      invoiceId: data.invoiceId,
      costType: data.costType,
      amount: data.amount,
      source: data.source ?? "allocation",
    },
  });
}

// ─── KuhikPayment ──────────────────────────────────────────────
export async function createKuhikPayment(data: {
  invoiceId: string;
  amount: number;
  paidAt: Date;
  method?: string;
  reference?: string;
}) {
  const prisma = getPrisma();
  return prisma.kuhikPayment.create({
    data: {
      invoiceId: data.invoiceId,
      amount: data.amount,
      paidAt: data.paidAt,
      method: data.method ?? "bank_transfer",
      reference: data.reference ?? null,
    },
  });
}

// ─── Legacy Invoice + Items ────────────────────────────────────
export async function createLegacyInvoice(data: {
  tenantId: string;
  apartmentId: string;
  invoiceNumber: string;
  referenceNumber: string;
  periodYear: number;
  periodMonth: number;
  issueDate: Date;
  dueDate: Date;
  totalAmount: number;
  vatAmount?: number;
  grandTotal?: number;
  paidAmount?: number;
  balanceDue?: number;
  status?: string;
}) {
  const prisma = getPrisma();
  return prisma.invoice.create({
    data: {
      tenantId: data.tenantId,
      apartmentId: data.apartmentId,
      invoiceNumber: data.invoiceNumber,
      referenceNumber: data.referenceNumber,
      periodYear: data.periodYear,
      periodMonth: data.periodMonth,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      totalAmount: data.totalAmount,
      vatAmount: data.vatAmount ?? 0,
      grandTotal: data.grandTotal ?? data.totalAmount,
      paidAmount: data.paidAmount ?? 0,
      balanceDue: data.balanceDue ?? data.totalAmount,
      status: data.status ?? "pending",
      metadata: {},
    },
  });
}

export async function createLegacyInvoiceLine(data: {
  invoiceId: string;
  tenantId: string;
  apartmentId: string;
  resourceTypeId?: string;
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  vatRate?: number;
  vatAmount?: number;
  totalAmount?: number;
  sortOrder?: number;
}) {
  const prisma = getPrisma();
  return prisma.invoiceLine.create({
    data: {
      invoiceId: data.invoiceId,
      tenantId: data.tenantId,
      apartmentId: data.apartmentId,
      resourceTypeId: data.resourceTypeId ?? null,
      description: data.description,
      quantity: data.quantity ?? 1,
      unitPrice: data.unitPrice ?? 0,
      amount: data.amount,
      vatRate: data.vatRate ?? 0.22,
      vatAmount: data.vatAmount ?? 0,
      totalAmount: data.totalAmount ?? data.amount,
      sortOrder: data.sortOrder ?? 0,
      metadata: {},
    },
  });
}

export async function createLegacyPayment(data: {
  tenantId: string;
  invoiceId: string;
  amount: number;
  paymentDate: Date;
  method?: string;
  referenceNumber?: string;
  status?: string;
}) {
  const prisma = getPrisma();
  return prisma.payment.create({
    data: {
      tenantId: data.tenantId,
      invoiceId: data.invoiceId,
      amount: data.amount,
      paymentDate: data.paymentDate,
      method: data.method ?? "bank_transfer",
      referenceNumber: data.referenceNumber ?? null,
      status: data.status ?? "pending",
      metadata: {},
    },
  });
}