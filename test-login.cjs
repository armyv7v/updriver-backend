// test-login.cjs - Test login logic directly
const https = require('https');
const bcrypt = require('bcryptjs');

const supabaseUrl = 'https://svmkiswoewdcvzxgnone.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const email = 'enderjpinar@gmail.com';
const password = 'admin2308';

console.log('Testing login flow...');
console.log(`Email: ${email}`);
console.log(`Password: ${password}`);
console.log('');

// Step 1: Fetch admin from database
const options = {
  hostname: 'svmkiswoewdcvzxgnone.supabase.co',
  port: 443,
  path: `/rest/v1/admins?email=eq.${encodeURIComponent(email)}`,
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + supabaseServiceKey,
    'apikey': supabaseServiceKey,
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', async () => {
    try {
      const data = JSON.parse(body);
      if (!Array.isArray(data) || data.length === 0) {
        console.log('❌ Admin not found in database');
        return;
      }

      const admin = data[0];
      console.log('✅ Admin found in database');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password Hash: ${admin.password_hash.substring(0, 20)}...`);
      console.log('');

      // Step 2: Compare password
      console.log('Testing bcrypt password comparison...');
      const passwordMatch = await bcrypt.compare(password, admin.password_hash);
      console.log(`Password: "${password}"`);
      console.log(`Hash: "${admin.password_hash}"`);
      console.log(`Match: ${passwordMatch}`);
      console.log('');

      if (passwordMatch) {
        console.log('✅ Login would succeed!');
      } else {
        console.log('❌ Password mismatch!');
        console.log('The password does not match the hash in the database.');
        console.log('');
        console.log('Possible solutions:');
        console.log('1. Update the admin password hash');
        console.log('2. Check if admin was using a different password');
      }
    } catch (e) {
      console.error('Error:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
