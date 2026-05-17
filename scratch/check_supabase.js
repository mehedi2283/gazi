const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
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

if (!supabaseUrl || !serviceKey) {
  console.error("Missing environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  try {
    console.log("Connecting to:", supabaseUrl);
    
    const { count: leadsCount, error: leadsErr } = await supabase.from('leads').select('*', { count: 'exact', head: true });
    console.log("Leads count:", leadsCount, "Error:", leadsErr);

    const { count: campaignsCount, error: campaignsErr } = await supabase.from('campaigns').select('*', { count: 'exact', head: true });
    console.log("Campaigns count:", campaignsCount, "Error:", campaignsErr);

    const { count: statsCount, error: statsErr } = await supabase.from('campaign_stats').select('*', { count: 'exact', head: true });
    console.log("Stats count:", statsCount, "Error:", statsErr);

    const { data: profiles, error: profilesErr } = await supabase.from('profiles').select('*').limit(5);
    console.log("Profiles sample:", profiles, "Error:", profilesErr);

  } catch (err) {
    console.error("Check failed:", err);
  }
}

check();
