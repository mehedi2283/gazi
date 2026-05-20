const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[match[1]] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching campaigns:", error);
  } else {
    console.log("Success! Columns in 'campaigns' table:");
    if (data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      // If table is empty, select from postgrest api or information_schema if possible,
      // or we can select a dummy to get headers
      console.log("No rows in campaigns, but select returned:", data);
      // Let's try to query RPC or select columns from a new record query
      const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'campaigns' });
      if (colError) {
        console.log("RPC get_table_columns failed, attempting select column names via standard query");
        // We can get headers by selecting single row
        console.log(data);
      } else {
        console.log(cols);
      }
    }
  }
}

checkColumns();
