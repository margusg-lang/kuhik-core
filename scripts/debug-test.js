// Debug test - check what's happening with auth
const http = require('http');

function req(method, path, body) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost',
      port: 4000,
      path,
      method,
      headers: {}
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
    }
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', e => resolve({ error: e.message }));
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  console.log('=== DEBUG TESTS ===\n');

  // Test 1: GET health (expect 401)
  let r = await req('GET', '/api/health');
  console.log(`1. GET /api/health → ${r.status} ${r.body.substring(0, 100)}`);

  // Test 2: POST login with correct JSON
  r = await req('POST', '/api/v1/auth/login', JSON.stringify({ username: 'admin@kuhik.local', password: 'admin123' }));
  console.log(`2. POST /api/v1/auth/login → ${r.status} ${r.body.substring(0, 150)}`);

  // Test 3: GET something that doesn't exist
  r = await req('GET', '/api/test-ping');
  console.log(`3. GET /api/test-ping → ${r.status} ${r.body.substring(0, 150)}`);

  // Test 4: POST to a non-existent endpoint
  r = await req('POST', '/api/test-ping', JSON.stringify({ test: true }));
  console.log(`4. POST /api/test-ping → ${r.status} ${r.body.substring(0, 150)}`);

  console.log('\n=== DONE ===');
}
main();