const fs = require('fs');
const path = require('path');
const https = require('https');

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

const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseAnonKey}`;

console.log("Fetching schema OpenAPI spec...");
https.get(url, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const spec = JSON.parse(body);
      const campaignsDef = spec.definitions && spec.definitions.campaigns;
      if (campaignsDef) {
        console.log("Columns of campaigns table from OpenAPI spec:");
        console.log(Object.keys(campaignsDef.properties));
      } else {
        console.error("campaigns definition not found in spec");
        console.log("Definitions available:", Object.keys(spec.definitions || {}));
      }
    } catch (e) {
      console.error("Failed to parse spec:", e.message);
    }
  });
}).on('error', (e) => {
  console.error("Request failed:", e.message);
});
