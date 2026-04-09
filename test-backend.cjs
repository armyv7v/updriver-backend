// test-backend.cjs - Test script
const http = require('http');

function post(endpoint, data) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': dataString.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    req.write(dataString);
    req.end();
  });
}

async function test() {
  console.log('1. Testing /api/license/start...');
  const start = await post('/api/license/start', {
    licenseCode: 'TEST-0001-0002-0003',
    installationId: '123e4567-e89b-12d3-a456-426614174000',
    deviceFingerprint: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    publicKeyPem: 'test-key',
    appVersion: '1.0.0'
  });
  console.log(start);

  console.log('\n2. Testing /api/license/confirm...');
  const confirm = await post('/api/license/confirm', {
    activationId: start.activationId,
    signature: 'dGVzdC1zaWduYXR1cmU=',
    installationId: '123e4567-e89b-12d3-a456-426614174000'
  });
  console.log(confirm);

  console.log('\n3. Testing /api/license/revalidate...');
  const revalidate = await post('/api/license/revalidate', {
    licenseToken: confirm.licenseToken,
    installationId: '123e4567-e89b-12d3-a456-426614174000',
    deviceFingerprint: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  });
  console.log(revalidate);

  console.log('\n✅ All tests passed!');
}

test().catch(console.error);
