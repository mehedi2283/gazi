const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iqthgcxmhxxejqprzdys.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdGhnY3htaHh4ZWpxcHJ6ZHlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMwNTU4MiwiZXhwIjoyMDkzODgxNTgyfQ.xRW59WkElTtzC8FLk1tPkJl2AJDq9QljyCEJwRCQ0NQ';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data: leads, error: leadsErr } = await supabase.from('leads').select('id, source, status, lead_score, created_at, email_open_count, email_reply_count');
  console.log('Leads:', leads?.length, leadsErr);
}
run();
