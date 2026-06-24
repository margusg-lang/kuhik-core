// kuhik-core/backend/prisma/seed-bootstrap.ts
// Bootstrap seed: creates initial admin user + tenant if none exist
// Used for test environment bootstrap only

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("--- BOOTSTRAP SEED ---");

  // 1. Check existing users
  const userCount = await prisma.user.count();
  console.log(`Existing users: ${userCount}`);

  if (userCount > 0) {
    console.log("Users already exist, skipping bootstrap seed.");
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, isActive: true } });
    for (const u of users) {
      console.log(`  User: ${u.name} (${u.email}) active=${u.isActive}`);
    }
    return;
  }

  // 2. Create default tenant
  console.log("Creating default tenant...");
  const tenant = await prisma.tenant.create({
    data: {
      name: "Testühistu",
      slug: "testuhistu",
      registryCode: "12345678",
      address: "Test Address 1",
      contactEmail: "info@testuhistu.ee",
      contactPhone: "+3725000000",
      isActive: true,
    },
  });
  console.log(`  Tenant created: ${tenant.id} (${tenant.slug})`);

  // 3. Create bootstrap admin user
  const email = "admin@kuhik.local";
  const password = "admin123";
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: "Admin",
      email,
      password: hashedPassword,
      isActive: true,
    },
  });
  console.log(`  Admin user created: ${user.id} (${user.email})`);

  // 4. Link user to tenant as admin
  const tu = await prisma.tenantUser.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: "admin",
      isActive: true,
    },
  });
  console.log(`  TenantUser link created: ${tu.id} role=${tu.role}`);

  console.log("");
  console.log("=== BOOTSTRAP COMPLETE ===");
  console.log(`Admin email: ${email}`);
  console.log(`Admin password: ${password}`);
  console.log(`Tenant slug: ${tenant.slug}`);
}

main()
  .catch((e) => {
    console.error("Bootstrap seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });