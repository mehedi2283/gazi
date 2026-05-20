const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iqthgcxmhxxejqprzdys.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdGhnY3htaHh4ZWpxcHJ6ZHlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMwNTU4MiwiZXhwIjoyMDkzODgxNTgyfQ.xRW59WkElTtzC8FLk1tPkJl2AJDq9QljyCEJwRCQ0NQ';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .select('id, email, lead_score, lead_gpt_score');
  if (leadsErr) {
    console.error('Error fetching leads:', leadsErr);
  } else {
    console.log('Leads detail list:');
    leads.forEach(l => {
      console.log(`- Email: ${l.email}, GPT Score: ${l.lead_gpt_score}, Lead Score (Temp): ${l.lead_score}`);
    });
  }
}
run();
