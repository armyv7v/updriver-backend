// verify-admin.cjs - Verify admin exists and password is correct
const https = require('https');

const supabaseUrl = 'https://svmkiswoewdcvzxgnone.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const options = {
  hostname: 'svmkiswoewdcvzxgnone.supabase.co',
  port: 443,
  path: `/rest/v1/admins?email=eq.enderjpinar@gmail.com`,
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + supabaseServiceKey,
    'apikey': supabaseServiceKey,
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    
    try {
      const data = JSON.parse(body);
      if (Array.isArray(data) && data.length > 0) {
        const admin = data[0];
        console.log('✅ Admin found:');
        console.log(`   Email: ${admin.email}`);
        console.log(`   Name: ${admin.name}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Password Hash: ${admin.password_hash.substring(0, 20)}...`);
        console.log(`   Created: ${admin.created_at}`);
        console.log(`   Last Login: ${admin.last_login}`);
      } else {
        console.log('❌ No admin found with email: enderjpinar@gmail.com');
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
      console.log('Raw response:', body);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
