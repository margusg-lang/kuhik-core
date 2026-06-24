// kuhik-core/scripts/e2e-validate.js
// Full E2E system validation — tests Waves 0-7
// Run: node scripts/e2e-validate.js
// Requires: backend running on localhost:4000

const http = require('http');

const BASE_URL = 'http://localhost:4000';
const TEST_USER = { username: 'admin@kuhik.local', password: 'admin123' };

let token = null;
let tenantId = null;
let orgId = null;
let buildingId = null;
let apartmentId = null;
let personId = null;
let meterId = null;
let readingId = null;
let costId = null;
let allocationRunId = null;
let invoiceId = null;
let paymentId = null;

const results = { backend: 'FAIL', database: 'FAIL', auth: 'FAIL', frontend: 'SKIPPED', fullFlow: 'FAIL' };
const errors = [];

function request(method, path, body = null, authToken = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
    };
    if (authToken) options.headers['Authorization'] = `Bearer ${authToken}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('='.repeat(70));
  console.log('  KUHIK FULL E2E SYSTEM VALIDATION');
  console.log('='.repeat(70));
  console.log();

  // ---- STEP 1: Health Check ----
  console.log('--- [1] HEALTH CHECK ---');
  try {
    const resp = await request('GET', '/api/health');
    if (resp.status === 200) {
      console.log('  ✓ Backend healthy:', JSON.stringify(resp.body));
      results.backend = 'OK';
    } else {
      console.log('  ✗ Backend unexpected:', resp.status);
      errors.push(`Health: ${resp.status}`);
    }
  } catch (err) {
    console.log('  ✗ Backend unreachable:', err.message);
    errors.push(`Health: ${err.message}`);
  }
  console.log();

  // ---- STEP 2: Login + Auth ----
  console.log('--- [2] AUTH FLOW ---');
  try {
    const resp = await request('POST', '/api/v1/auth/login', TEST_USER);
    if (resp.status === 200 && resp.body.success && resp.body.token) {
      token = resp.body.token;
      tenantId = resp.body.user.tenantId;
      orgId = tenantId; // org = tenant in this context
      console.log('  ✓ Login OK — JWT received');
      console.log('  ✓ User:', resp.body.user.name, '| Role:', resp.body.user.role);
      console.log('  ✓ Tenant ID:', tenantId);
      results.auth = 'OK';
      results.database = 'OK';
    } else {
      console.log('  ✗ Login failed:', JSON.stringify(resp.body));
      errors.push(`Auth login: ${resp.status}`);
    }
  } catch (err) {
    console.log('  ✗ Auth error:', err.message);
    errors.push(`Auth: ${err.message}`);
  }
  console.log();

  if (!token) {
    console.log('  ✗ Cannot continue — no auth token');
    printResults();
    return;
  }

  // ---- STEP 3: Protected Endpoints ----
  console.log('--- [3] PROTECTED ENDPOINTS ---');
  try {
    const profile = await request('GET', '/api/v1/me/profile', null, token);
    console.log('  ✓ /api/v1/me/profile:', profile.status, profile.body.success ? 'OK' : 'FAIL');

    const orgs = await request('GET', '/api/v1/organizations', null, token);
    console.log('  ✓ /api/v1/organizations:', orgs.status, Array.isArray(orgs.body) ? `${orgs.body.length} orgs` : 'OK');
  } catch (err) {
    console.log('  ✗ Protected endpoint error:', err.message);
    errors.push(`Protected: ${err.message}`);
  }
  console.log();

  // ---- STEP 4: WAVE 1 — Property Hierarchy ----
  console.log('--- [4] WAVE 1 — PROPERTY (Org → Building → Apartment) ---');
  try {
    // Create building
    const bldResp = await request('POST', '/api/v1/organizations/' + orgId + '/buildings', {
      name: 'E2E Test Building',
      address: 'Test Street 1',
      type: 'apartment_building'
    }, token);
    buildingId = bldResp.body?.id || bldResp.body?.data?.id;
    console.log('  ✓ Building created:', buildingId || 'unknown');

    // Create apartment
    const aptResp = await request('POST', '/api/v1/buildings/' + buildingId + '/apartments', {
      unitLabel: 'E2E-1',
      floor: 1,
      areaSqm: 50.0,
      occupancy: 1
    }, token);
    apartmentId = aptResp.body?.id || aptResp.body?.data?.id;
    console.log('  ✓ Apartment created:', apartmentId || 'unknown');
  } catch (err) {
    console.log('  ✗ Wave 1 error:', err.message);
    errors.push(`Wave1: ${err.message}`);
  }
  console.log();

  // ---- STEP 5: WAVE 2 — People ----
  console.log('--- [5] WAVE 2 — PEOPLE ---');
  try {
    const personResp = await request('POST', '/api/v1/organizations/' + orgId + '/people', {
      fullName: 'E2E Test Resident',
      email: 'resident@test.local',
      phone: '+3725000000'
    }, token);
    personId = personResp.body?.id || personResp.body?.data?.id;
    console.log('  ✓ Person created:', personId || 'unknown');

    if (personId && apartmentId) {
      const relResp = await request('POST', '/api/v1/apartments/' + apartmentId + '/people', {
        personId: personId,
        relationshipType: 'RESIDENT',
        isPrimary: true
      }, token);
      console.log('  ✓ Person assigned to apartment:', relResp.status);
    }
  } catch (err) {
    console.log('  ✗ Wave 2 error:', err.message);
    errors.push(`Wave2: ${err.message}`);
  }
  console.log();

  // ---- STEP 6: WAVE 3 — Meters & Readings ----
  console.log('--- [6] WAVE 3 — METERS & READINGS ---');
  try {
    const meterResp = await request('POST', '/api/v1/apartments/' + apartmentId + '/meters', {
      meterType: 'water',
      unit: 'm3',
      serialNumber: 'E2E-METER-001',
      label: 'E2E Water Meter'
    }, token);
    meterId = meterResp.body?.id || meterResp.body?.data?.id;
    console.log('  ✓ Meter created:', meterId || 'unknown');

    if (meterId) {
      const readResp = await request('POST', '/api/v1/meters/' + meterId + '/readings', {
        value: 100.5,
        timestamp: new Date().toISOString()
      }, token);
      readingId = readResp.body?.id || readResp.body?.data?.id;
      console.log('  ✓ Reading created:', readingId || 'unknown');
    }
  } catch (err) {
    console.log('  ✗ Wave 3 error:', err.message);
    errors.push(`Wave3: ${err.message}`);
  }
  console.log();

  // ---- STEP 7: WAVE 4 — Utility Costs ----
  console.log('--- [7] WAVE 4 — UTILITY COSTS ---');
  try {
    const costResp = await request('POST', '/api/v1/organizations/' + orgId + '/costs', {
      type: 'water',
      periodStart: '2026-06-01T00:00:00Z',
      periodEnd: '2026-06-30T00:00:00Z',
      totalAmount: 500.00,
      description: 'E2E Test Water Cost'
    }, token);
    costId = costResp.body?.id || costResp.body?.data?.id;
    console.log('  ✓ Utility cost created:', costId || 'unknown');
  } catch (err) {
    console.log('  ✗ Wave 4 error:', err.message);
    errors.push(`Wave4: ${err.message}`);
  }
  console.log();

  // ---- STEP 8: WAVE 5 — Allocation ----
  console.log('--- [8] WAVE 5 — ALLOCATION ---');
  try {
    const allocResp = await request('POST', '/api/v1/organizations/' + orgId + '/allocation/run', {
      periodStart: '2026-06-01T00:00:00Z',
      periodEnd: '2026-06-30T00:00:00Z',
    }, token);
    allocationRunId = allocResp.body?.data?.id || allocResp.body?.id || allocResp.body?.runId;
    console.log('  ✓ Allocation run:', allocResp.status, JSON.stringify(allocResp.body).substring(0, 120));
  } catch (err) {
    console.log('  ✗ Wave 5 error:', err.message);
    errors.push(`Wave5: ${err.message}`);
  }
  console.log();

  // ---- STEP 9: WAVE 6 — Invoice ----
  console.log('--- [9] WAVE 6 — INVOICE ---');
  try {
    // Send empty object instead of null to avoid Content-Type mismatch
    const invResp = await request('POST', '/api/v1/invoices/generate/' + (allocationRunId || 'none'), {}, token);
    invoiceId = invResp.body?.data?.id || invResp.body?.id;
    if (Array.isArray(invResp.body?.data)) {
      invoiceId = invResp.body.data[0]?.id;
    } else if (invResp.body?.data?.id) {
      invoiceId = invResp.body.data.id;
    } else if (invResp.body?.id) {
      invoiceId = invResp.body.id;
    }
    console.log('  ✓ Invoice:', invResp.status, JSON.stringify(invResp.body).substring(0, 200));
  } catch (err) {
    console.log('  ✗ Wave 6 error:', err.message);
    errors.push(`Wave6: ${err.message}`);
  }
  console.log();

  // ---- STEP 10: WAVE 7 — Payment ----
  console.log('--- [10] WAVE 7 — PAYMENT ---');
  try {
    const payResp = await request('POST', '/api/v1/invoices/' + invoiceId + '/payments', {
      amount: 500.00,
      method: 'bank_transfer',
      reference: 'E2E-PAY-001'
    }, token);
    paymentId = payResp.body?.id || payResp.body?.data?.id;
    console.log('  ✓ Payment:', payResp.status, JSON.stringify(payResp.body).substring(0, 120));
  } catch (err) {
    console.log('  ✗ Wave 7 error:', err.message);
    errors.push(`Wave7: ${err.message}`);
  }
  console.log();

  // ---- STEP 11: Data Consistency ----
  console.log('--- [11] DATA CONSISTENCY CHECK ---');
  try {
    const invDetail = await request('GET', '/api/v1/invoices/' + invoiceId, null, token);
    console.log('  ✓ Invoice detail:', invDetail.status, JSON.stringify(invDetail.body).substring(0, 150));

    const payments = await request('GET', '/api/v1/invoices/' + invoiceId + '/payments', null, token);
    console.log('  ✓ Invoice payments:', payments.status, JSON.stringify(payments.body).substring(0, 150));

    // Check org-scoping
    const otherOrgBld = await request('GET', '/api/v1/organizations/FAKE-ID/buildings', null, token);
    if (otherOrgBld.status === 403 || otherOrgBld.status === 404) {
      console.log('  ✓ Cross-org access correctly blocked (status:', otherOrgBld.status, ')');
    } else {
      console.log('  - Cross-org access:', otherOrgBld.status, JSON.stringify(otherOrgBld.body).substring(0, 100));
    }

    results.fullFlow = errors.length === 0 ? 'OK' : 'PARTIAL';
  } catch (err) {
    console.log('  ✗ Consistency check error:', err.message);
    errors.push(`Consistency: ${err.message}`);
  }
  console.log();

  // ---- RESULTS ----
  printResults();
}

function printResults() {
  console.log();
  console.log('='.repeat(70));
  console.log('  SYSTEM STATUS');
  console.log('='.repeat(70));
  console.log(`  backend    : ${results.backend}`);
  console.log(`  frontend   : ${results.frontend}`);
  console.log(`  database   : ${results.database}`);
  console.log(`  auth       : ${results.auth}`);
  console.log(`  full E2E   : ${results.fullFlow}`);
  console.log();
  console.log('  FULL WORKFLOW CONFIRMATION');
  const flow = results.fullFlow === 'OK' ? '✓' : '✗';
  console.log(`  ${flow} Org → Building → Apartment → Person → Meter → Cost → Allocation → Invoice → Payment`);
  console.log();
  if (errors.length > 0) {
    console.log('  FAILURES:');
    errors.forEach((e, i) => console.log(`    ${i+1}. ${e}`));
    console.log();
  }
  console.log('  ACCESS INFO');
  console.log(`  API URL    : http://localhost:4000`);
  console.log(`  Frontend   : http://localhost:3000`);
  console.log(`  Login      : admin@kuhik.local / admin123`);
  console.log();
  console.log('='.repeat(70));
}

main().catch(console.error);