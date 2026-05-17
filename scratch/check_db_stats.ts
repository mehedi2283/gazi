const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data: leads, error: leadsErr } = await supabase.from('leads').select('*').limit(5);
  console.log('Leads:', leads?.length, leadsErr);

  const { data: campaigns, error: campErr } = await supabase.from('campaigns').select('*').limit(5);
  console.log('Campaigns:', campaigns?.length, campErr);
}
run();
