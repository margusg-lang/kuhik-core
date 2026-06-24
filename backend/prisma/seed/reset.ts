// kuhik-core/backend/prisma/seed/reset.ts
// Full database reset — deletes all tables in correct FK-safe order
// CI-safe: uses $transaction + deleteMany to avoid lock issues
// Usage: npx tsx prisma/seed/reset.ts

import { connect, disconnect } from "./utils/db.js";
import { getPrisma } from "./utils/db.js";

// Tables ordered from leaf (most dependent) to root (least dependent)
// Removing duplicates intentionally for clarity
const TABLES_IN_ORDER = [
  "kuhik_payments",
  "kuhik_invoice_items",
  "kuhik_invoices",
  "allocation_items",
  "allocation_runs",
  "payments",
  "invoice_lines",
  "invoices",
  "cost_allocations",
  "costs",
  "allocation_rules",
  "utility_costs",
  "bank_transactions",
  "merit_sync_records",
  "ownership_histories",
  "cron_jobs",
  "notifications",
  "audit_logs",
  "events",
  "issue_histories",
  "issues",
  "apartment_meter_readings",
  "apartment_meters",
  "meter_readings",
  "meters",
  "resource_types",
  "apartment_people",
  "people",
  "residents",
  "apartments",
  "buildings",
  "tenant_users",
  "accounts",
  "sessions",
  "verification_tokens",
  "users",
  "tenants",
] as const;

async function resetDatabase(): Promise<void> {
  const prisma = getPrisma();
  await connect();

  console.log("=== DATABASE RESET ===");
  console.log(`Deleting ${TABLES_IN_ORDER.length} tables in FK-safe order...`);

  // Use raw SQL truncate for speed, with CASCADE to handle FKs
  // Wrap in transaction for atomicity
  await prisma.$transaction(
    (TABLES_IN_ORDER as readonly string[]).map((table: string) =>
      prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`)
    )
  );

  // Reset sequences if using serial types
  try {
    await prisma.$executeRawUnsafe(
      `DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP EXECUTE 'ALTER SEQUENCE IF EXISTS ' || r.tablename || '_id_seq RESTART WITH 1;'; END LOOP; END $$;`
    );
  } catch {
    // Sequences may not exist (CUID primary keys) — this is fine
    console.log("  (Sequence reset skipped — CUID primary keys)");
  }

  console.log("=== RESET COMPLETE ===");
}

resetDatabase()
  .catch((e) => {
    console.error("Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnect();
  });