const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  try {
    // List users from Supabase Auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error("Auth Admin Error:", error);
    } else {
      console.log("Auth Users Count:", users.length);
      users.forEach(u => {
        console.log(`User ID: ${u.id}, Email: ${u.email}, Created At: ${u.created_at}`);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

check();
