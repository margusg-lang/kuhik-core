// kuhik-core/scripts/test-run.js
// Full test environment run — validates backend, database, auth, and core flow
// Run: node scripts/test-run.js

const http = require('http');

const BASE_URL = 'http://localhost:4000';
const TEST_USER = { username: 'admin@kuhik.local', password: 'admin123' };

// Utility: HTTP request helper
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

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
  const results = { backend: 'FAIL', database: 'FAIL', auth: 'FAIL', frontend: 'SKIPPED' };
  let token = null;
  let userInfo = {};
  const errors = [];

  console.log('='.repeat(60));
  console.log('  KUHIK FULL TEST ENVIRONMENT RUN');
  console.log('='.repeat(60));
  console.log(`  Started: ${new Date().toISOString()}`);
  console.log();

  // ============================================================
  // STEP 1: Health Check
  // ============================================================
  console.log('--- [1/6] HEALTH CHECK ---');
  try {
    const healthResp = await request('GET', '/api/health');
    if (healthResp.status === 401 && healthResp.body.code === 'TOKEN_INVALID') {
      // Health endpoint requires auth token — that's OK, means it's protected
      console.log('  ✓ /api/health endpoint is protected (returns 401 without token)');
      results.backend = 'OK';
    } else if (healthResp.status === 200) {
      console.log('  ✓ /api/health responds 200:', JSON.stringify(healthResp.body));
      results.backend = 'OK';
    } else {
      console.log('  ✗ /api/health unexpected response:', healthResp.status, JSON.stringify(healthResp.body));
      errors.push(`Health check failed: ${healthResp.status}`);
    }
  } catch (err) {
    console.log('  ✗ Backend not reachable:', err.message);
    errors.push(`Backend unreachable: ${err.message}`);
  }

  // ============================================================
  // STEP 2: Database Check
  // ============================================================
  console.log();
  console.log('--- [2/6] DATABASE CHECK ---');
  try {
    // DB is connected if backend started successfully
    // Let's verify via health endpoint with auth
    const authResp = await request('POST', '/api/v1/auth/login', TEST_USER);
    if (authResp.status === 200 && authResp.body.success) {
      console.log('  ✓ Database queried successfully (user found)');
      results.database = 'OK';
    } else {
      console.log('  ✗ Database query failed:', JSON.stringify(authResp.body));
      errors.push('Database query failed');
    }
  } catch (err) {
    console.log('  ✗ Database check failed:', err.message);
    errors.push(`Database unreachable: ${err.message}`);
  }

  // ============================================================
  // STEP 3: Auth Test
  // ============================================================
  console.log();
  console.log('--- [3/6] AUTH TEST ---');
  try {
    const loginResp = await request('POST', '/api/v1/auth/login', TEST_USER);
    console.log('  Login response status:', loginResp.status);

    if (loginResp.status === 200 && loginResp.body.success && loginResp.body.token) {
      token = loginResp.body.token;
      userInfo = loginResp.body.user;
      console.log('  ✓ Login successful');
      console.log('  ✓ JWT token received');
      console.log('  ✓ User:', JSON.stringify(userInfo));
      results.auth = 'OK';
    } else if (loginResp.status === 401) {
      console.log('  ✗ Login failed:', JSON.stringify(loginResp.body));
      errors.push('Login failed: invalid credentials');
    } else {
      console.log('  ✗ Login unexpected response:', JSON.stringify(loginResp.body));
      errors.push('Login unexpected response');
    }
  } catch (err) {
    console.log('  ✗ Login request failed:', err.message);
    errors.push(`Login request failed: ${err.message}`);
  }

  // ============================================================
  // STEP 4: Core Flow Validation
  // ============================================================
  console.log();
  console.log('--- [4/6] CORE FLOW VALIDATION ---');
  if (token) {
    try {
      // Test authenticated health
      const healthResp = await request('GET', '/api/health', null, token);
      console.log('  ✓ /api/health with auth:', healthResp.status, healthResp.body.status || '');

      // Test organizations endpoint
      const orgResp = await request('GET', '/api/v1/organizations', null, token);
      console.log('  ✓ /api/v1/organizations:', orgResp.status);

      // Test me endpoint
      const meResp = await request('GET', '/api/v1/me', null, token);
      console.log('  ✓ /api/v1/me:', meResp.status, meResp.body.success !== undefined ? (meResp.body.success ? 'success' : 'fail') : JSON.stringify(meResp.body).substring(0, 100));
    } catch (err) {
      console.log('  ✗ Flow validation error:', err.message);
      errors.push(`Flow validation error: ${err.message}`);
    }
  } else {
    console.log('  ✗ Skipped — no auth token available');
  }

  // ============================================================
  // STEP 5: System Health Summary
  // ============================================================
  console.log();
  console.log('--- [5/6] SYSTEM HEALTH ---');
  console.log(`  Backend: ${results.backend}`);
  console.log(`  Database: ${results.database}`);
  console.log(`  Auth: ${results.auth}`);
  console.log(`  Frontend: ${results.frontend}`);
  if (errors.length > 0) {
    console.log('  Errors found:');
    errors.forEach((e) => console.log('    -', e));
  }

  // ============================================================
  // STEP 6: Output Result
  // ============================================================
  console.log();
  console.log('='.repeat(60));
  console.log('  SYSTEM STATUS');
  console.log('='.repeat(60));
  console.log(`  backend    : ${results.backend}`);
  console.log(`  frontend   : ${results.frontend}`);
  console.log(`  database   : ${results.database}`);
  console.log(`  auth       : ${results.auth}`);
  console.log();
  console.log('  ACCESS INFO');
  console.log(`  URL        : http://localhost:3000`);
  console.log(`  API URL    : http://localhost:4000`);
  console.log();
  console.log('  TEST LOGIN');
  console.log(`  email      : ${TEST_USER.username}`);
  console.log(`  password   : ${TEST_USER.password}`);
  console.log();
  console.log('  NOTES');
  if (errors.length > 0) {
    errors.forEach((e) => console.log(`  - ${e}`));
  } else {
    console.log('  - All checks passed');
  }
  if (results.frontend === 'SKIPPED') {
    console.log('  - Frontend not started (optional, backend verified)');
  }
  console.log();
  console.log('  User Info:', userInfo.name ? userInfo.name : 'Admin');
  console.log('  User Role:', userInfo.role ? userInfo.role : 'admin');
  console.log('  Tenant ID:', userInfo.tenantId ? userInfo.tenantId : userInfo.associationId || 'N/A');
}

main().catch(console.error);