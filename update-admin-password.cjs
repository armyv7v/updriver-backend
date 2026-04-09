// update-admin-password.cjs - Update admin password hash
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node update-admin-password.cjs
const https = require('https');

const supabaseUrl = process.env.SUPABASE_URL || 'https://svmkiswoewdcvzxgnone.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const passwordHash = '$2b$10$63pzrVeQz8U6DIBrGov1l.r3Y6F.VxP3dqM8CMxMqDKVJy3ivQyJeBuU5SB1Syt4PdAgA.SL5.';

const updateData = {
  password_hash: passwordHash
};

const options = {
  hostname: 'svmkiswoewdcvzxgnone.supabase.co',
  port: 443,
  path: `/rest/v1/admins?email=eq.enderjpinar@gmail.com`,
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + supabaseServiceKey,
    'apikey': supabaseServiceKey,
    'Content-Length': JSON.stringify(updateData).length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Response:', body);
    
    if (res.statusCode === 200 || res.statusCode === 204) {
      console.log('✅ Admin password updated successfully!');
    } else {
      console.log('❌ Error updating admin');
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(JSON.stringify(updateData));
req.end();
