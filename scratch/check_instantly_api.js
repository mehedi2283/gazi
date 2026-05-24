const axios = require('axios')
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
  const apiKey = env.INSTANTLY_API_KEY
  const BASE = 'https://api.instantly.ai/api/v2'
  const headers = { Authorization: `Bearer ${apiKey}` }

  // 1. Get all campaigns from analytics endpoint (what sync uses)
  console.log('=== INSTANTLY API: /campaigns/analytics ===')
  try {
    const res = await axios.get(`${BASE}/campaigns/analytics`, { headers })
    const campaigns = res.data || []
    console.log(`  Total campaigns returned: ${campaigns.length}`)
    for (const c of campaigns) {
      console.log(`  - ${c.campaign_name} (${c.campaign_id}) [status: ${c.campaign_status}]`)
    }
  } catch (e) {
    console.error('Error fetching analytics:', e.message)
  }

  // 2. Also try the campaigns list endpoint 
  console.log('\n=== INSTANTLY API: /campaigns (list) ===')
  try {
    const res = await axios.get(`${BASE}/campaigns`, { headers, params: { limit: 100 } })
    const items = res.data?.items || res.data || []
    console.log(`  Total campaigns listed: ${Array.isArray(items) ? items.length : 'not array'}`)
    if (Array.isArray(items)) {
      for (const c of items) {
        console.log(`  - ${c.name || c.campaign_name} (${c.id || c.campaign_id})`)
      }
    } else {
      console.log('  Response:', JSON.stringify(res.data).substring(0, 500))
    }
  } catch (e) {
    console.error('Error fetching campaign list:', e.message)
  }

  // 3. Check for specific campaign IDs
  console.log('\n=== CHECK SPECIFIC IDs ===')
  const idsToCheck = {
    'awdad': '77604355-16d8-4f02-8c08-93ad2f9c25ff',
    'chilies': '04da1906-7d16-4a50-8e43-10bc67c1bcd8',
  }
  for (const [name, id] of Object.entries(idsToCheck)) {
    try {
      const res = await axios.get(`${BASE}/campaigns/${id}`, { headers })
      console.log(`  ${name} (${id}): FOUND - ${JSON.stringify(res.data).substring(0, 200)}`)
    } catch (e) {
      console.log(`  ${name} (${id}): NOT FOUND - ${e.response?.status} ${e.message}`)
    }
  }
}

main()
