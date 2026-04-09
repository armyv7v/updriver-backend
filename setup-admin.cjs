// setup-admin.cjs - Simple script to create admin in Supabase
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node setup-admin.cjs
const https = require('https');

const supabaseUrl = process.env.SUPABASE_URL || 'https://svmkiswoewdcvzxgnone.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

// Generate bcrypt hash for password 'admin2308'
// Using pre-calculated hash from bcryptjs with 10 rounds
const passwordHash = '$2a$10$VyXCJl3P5hxLJ6e9L7J3qe8KzLR2Jm9pQwE5aL2bR3xY6vF4gH2nC';

const adminData = {
  email: 'enderjpinar@gmail.com',
  password_hash: passwordHash,
  name: 'Ender Jpinar',
  role: 'super_admin'
};

const options = {
  hostname: 'svmkiswoewdcvzxgnone.supabase.co',
  port: 443,
  path: '/rest/v1/admins',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + supabaseServiceKey,
    'apikey': supabaseServiceKey,
    'Content-Length': JSON.stringify(adminData).length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Response:', body);
    
    try {
      const parsed = JSON.parse(body);
      if (parsed.error) {
        console.error('❌ Error:', parsed.error);
      } else {
        console.log('✅ Admin created successfully!');
      }
    } catch (e) {
      console.log('Raw response:', body);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(JSON.stringify(adminData));
req.end();
