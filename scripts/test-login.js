// Minimal login test
const http = require('http');

const body = JSON.stringify({ username: 'admin@kuhik.local', password: 'admin123' });

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers));
    try {
      console.log('Body:', JSON.parse(data));
    } catch {
      console.log('Body (raw):', data.substring(0, 500));
    }
  });
});
req.on('error', (e) => console.error('Error:', e.message));
req.write(body);
req.end();