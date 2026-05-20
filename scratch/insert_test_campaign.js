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
const supabaseAnonKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Inserting test campaign...");
  const { data, error } = await supabase
    .from('campaigns')
    .insert([{ 
      name: 'Temp Test Campaign ' + Date.now(), 
      company_name: 'Temp Company', 
      created_from_company: 'Temp Creator' 
    }])
    .select();

  if (error) {
    console.error("Insertion failed:", error);
  } else {
    console.log("Success! Columns found in campaigns table:");
    console.log(Object.keys(data[0]));
    
    // Clean up
    console.log("Deleting test campaign...");
    const { error: deleteError } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', data[0].id);
      
    if (deleteError) {
      console.error("Failed to delete test campaign:", deleteError);
    } else {
      console.log("Cleaned up successfully.");
    }
  }
}

run();
