const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return {}
  const envContent = fs.readFileSync(envPath, 'utf8')
  const env = {}
  envContent.split('\n').forEach(line => {
    const parts = line.split('=')
    if (parts.length >= 2) {
      const key = parts[0].trim()
      const val = parts.slice(1).join('=').trim()
      env[key] = val
    }
  })
  return env
}

async function main() {
  const env = loadEnv()
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(supabaseUrl, serviceKey)

  // Get all instantly_campaigns 
  const { data: allCampaigns } = await supabase
    .from('instantly_campaigns')
    .select('campaign_id, campaign_name, synced_at')
    .order('synced_at', { ascending: false })

  console.log(`Total instantly_campaigns rows: ${(allCampaigns || []).length}\n`)
  
  // The current API only returns these 2 IDs
  const currentApiIds = new Set([
    'a2211a2c-68ed-4aa1-b0ea-7063a35c9958', // Gazi
    '6385de2e-28f9-4dac-a249-d02945602193', // adad
  ])

  // The full campaigns list returns these 5
  const fullListIds = new Set([
    'a2211a2c-68ed-4aa1-b0ea-7063a35c9958', // Gazi
    '83d3e494-1928-4676-b5a2-222bd65395bf', // AI SDR Gazi
    '77604355-16d8-4f02-8c08-93ad2f9c25ff', // awdad
    '6385de2e-28f9-4dac-a249-d02945602193', // adad
    '04da1906-7d16-4a50-8e43-10bc67c1bcd8', // chilies
  ])

  console.log('=== STALE / OLD DATA (not from current API) ===')
  for (const c of allCampaigns || []) {
    if (!fullListIds.has(c.campaign_id)) {
      console.log(`  STALE: ${c.campaign_name} (${c.campaign_id}) synced: ${c.synced_at}`)
    }
  }

  console.log('\n=== CURRENT DATA ===')
  for (const c of allCampaigns || []) {
    if (fullListIds.has(c.campaign_id)) {
      console.log(`  CURRENT: ${c.campaign_name} (${c.campaign_id}) synced: ${c.synced_at}`)
    }
  }
}

main()
