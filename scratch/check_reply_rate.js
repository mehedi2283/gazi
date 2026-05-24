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
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  // Check campaign_stats
  const { data: stats, count } = await supabase
    .from('campaign_stats')
    .select('*', { count: 'exact' })
    .limit(5)
  
  console.log('campaign_stats count:', count)
  console.log('campaign_stats sample:', JSON.stringify(stats, null, 2))

  // Check campaigns for reply_count, open_count columns
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, total_leads, reply_count, open_count, total_booking_count')
    .limit(10)
  
  console.log('\ncampaigns data:', JSON.stringify(campaigns, null, 2))
}

main()
