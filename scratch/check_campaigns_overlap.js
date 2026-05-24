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

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase URL or service key')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  console.log('Querying all rows in local campaigns table...')
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('id, name, organization_id, instantly_campaign_id')

  if (error) {
    console.error('Error fetching campaigns:', error)
  } else {
    console.log('Total local campaigns:', campaigns.length)
    console.log(JSON.stringify(campaigns, null, 2))
  }

  console.log('Querying instantly_campaigns in database...')
  const { data: instantlyCampaigns, error: icError } = await supabase
    .from('instantly_campaigns')
    .select('campaign_id, campaign_name')

  if (icError) {
    console.error('Error fetching instantly_campaigns:', icError)
  } else {
    console.log('Total instantly_campaigns:', instantlyCampaigns.length)
  }
}

main()
