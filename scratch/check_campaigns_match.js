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

  // 1. Get local campaigns with their instantly IDs
  const { data: localCampaigns } = await supabase
    .from('campaigns')
    .select('id, name, instantly_campaign_id')
    .eq('organization_id', '85b073cf-bc4e-400a-b976-e4482d0348a2')

  console.log('=== LOCAL CAMPAIGNS ===')
  for (const c of localCampaigns || []) {
    console.log(`  ${c.name} → instantly_id: ${c.instantly_campaign_id}`)
  }

  // 2. Get all instantly_campaigns
  const { data: instantlyCampaigns } = await supabase
    .from('instantly_campaigns')
    .select('campaign_id, campaign_name')

  console.log('\n=== ALL INSTANTLY_CAMPAIGNS (synced from API) ===')
  console.log(`  Total: ${(instantlyCampaigns || []).length}`)

  // 3. Check which local campaigns have a match in instantly_campaigns
  const instantlyIds = new Set((instantlyCampaigns || []).map(ic => ic.campaign_id))

  console.log('\n=== MATCH CHECK ===')
  for (const c of localCampaigns || []) {
    const found = instantlyIds.has(c.instantly_campaign_id)
    console.log(`  ${c.name} (${c.instantly_campaign_id}) → ${found ? '✓ FOUND' : '✗ MISSING in instantly_campaigns'}`)
  }
}

main()
