// update-admin-new-hash.cjs - Update admin with new hash
const https = require('https');

const supabaseUrl = 'https://svmkiswoewdcvzxgnone.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const newHash = '$2b$10$wD2le8Z2D62U.vxjsJxi7elAwVwBl7j4hlBGjPlKqDIl.8jH1Awi6';

const updateData = {
  password_hash: newHash
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
    
    if (res.statusCode === 204) {
      console.log('✅ Admin password updated successfully!');
      console.log(`New hash: ${newHash}`);
    } else {
      console.log('Response:', body);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(JSON.stringify(updateData));
req.end();
