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
    const { data: campaigns } = await supabase.from('campaigns').select('id, name, organization_id, created_by');
    console.log("Campaigns:", campaigns);

    const { data: leads } = await supabase.from('leads').select('id, email, organization_id').limit(5);
    console.log("Leads:", leads);

    const { data: organizations } = await supabase.from('organizations').select('*');
    console.log("Organizations:", organizations);
  } catch (err) {
    console.error(err);
  }
}

check();
