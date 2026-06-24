// kuhik-core/backend/prisma/seed/base/demo-org.ts
// Creates the Demo Ühistu tenant + admin user

import bcrypt from "bcryptjs";
import { getPrisma } from "../utils/db.js";
import { createOrg, createUserWithTenantRole } from "../utils/helpers.js";
import { setSeedIds, getSeedIds } from "../utils/ids.js";
import { seedFinancialMasterData } from "../financial-master-data.js";
import { seedChartAccounts } from "../chart-accounts.js";

export async function seedDemoOrg(): Promise<{ tenantId: string; userId: string; tenantUserId: string }> {
  const prisma = getPrisma();

  // Idempotency: check if tenant already exists by slug
  const existingTenant = await prisma.tenant.findUnique({ where: { slug: "demo-uhistu" } });
  if (existingTenant) {
    const existingUser = await prisma.user.findFirst({ where: { email: "admin@kuhik.local" } });
    const existingTU = await prisma.tenantUser.findFirst({
      where: { tenantId: existingTenant.id, userId: existingUser?.id },
    });
    console.log(`  Tenant already exists: ${existingTenant.id} (${existingTenant.slug}) — skipping`);

    setSeedIds({
      tenantId: existingTenant.id,
      userId: existingUser?.id ?? "",
      tenantUserId: existingTU?.id ?? "",
    });

    return {
      tenantId: existingTenant.id,
      userId: existingUser?.id ?? "",
      tenantUserId: existingTU?.id ?? "",
    };
  }

  console.log("[seed] Creating Demo Ühistu organisation...");
  const tenant = await createOrg({
    name: "Demo Ühistu",
    slug: "demo-uhistu",
    registryCode: "12345678",
    address: "Pärnu mnt 10, Tallinn 10148",
    contactEmail: "info@demouhistu.ee",
    contactPhone: "+37250001234",
  });
  console.log(`  Tenant: ${tenant.id} (${tenant.slug})`);

  // Seed financial classification master data for the new tenant
  await seedFinancialMasterData({ tenantId: tenant.id });

  // Seed standard Estonian chart of accounts
  await seedChartAccounts(tenant.id);

  const passwordHash = await bcrypt.hash("admin123", 10);
  const { user, tenantUser } = await createUserWithTenantRole({
    tenantId: tenant.id,
    name: "Admin",
    email: "admin@kuhik.local",
    passwordHash,
    role: "admin",
  });
  console.log(`  Admin user: ${user.id} (${user.email})`);

  setSeedIds({
    tenantId: tenant.id,
    userId: user.id,
    tenantUserId: tenantUser.id,
  });

  return { tenantId: tenant.id, userId: user.id, tenantUserId: tenantUser.id };
}