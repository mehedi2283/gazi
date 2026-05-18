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
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase URL or service role key (check .env.local)')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // Replace with your org id
  const orgId = process.argv[2] || '262b2606-fc58-4f67-9626-8ff53ab92db0'

  console.log('Querying for organization:', orgId)

  try {
    const { data: campaigns, error: campErr } = await supabase
      .from('campaigns')
      .select('id, name, organization_id, created_by, created_at')
      .eq('organization_id', orgId)

    if (campErr) {
      console.error('Error fetching campaigns:', campErr)
    } else {
      console.log('Campaigns found:', campaigns.length)
      console.log(JSON.stringify(campaigns, null, 2))
    }

    const campaignIds = (campaigns || []).map(c => c.id).filter(Boolean)

    if (campaignIds.length === 0) {
      console.log('No campaigns for org — campaign_stats likely empty.')
    } else {
      const { data: stats, error: statsErr } = await supabase
        .from('campaign_stats')
        .select('*')
        .in('campaign_id', campaignIds)
        .order('date', { ascending: false })
        .limit(50)

      if (statsErr) {
        console.error('Error fetching campaign_stats:', statsErr)
      } else {
        console.log('campaign_stats rows found:', stats.length)
        console.log(JSON.stringify(stats, null, 2))
      }
    }

    const { data: instantlyDaily, error: dailyErr } = await supabase
      .from('instantly_daily')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(50)

    if (dailyErr) {
      console.error('Error fetching instantly_daily:', dailyErr)
    } else {
      console.log('instantly_daily rows:', instantlyDaily.length)
      console.log(JSON.stringify((instantlyDaily || []).slice(0, 10), null, 2))
    }

    const { data: instantlyCampaigns, error: icErr } = await supabase
      .from('instantly_campaigns')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(50)

    if (icErr) {
      console.error('Error fetching instantly_campaigns:', icErr)
    } else {
      console.log('instantly_campaigns rows:', instantlyCampaigns.length)
      console.log(JSON.stringify((instantlyCampaigns || []).slice(0, 10), null, 2))
    }

  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

main()
