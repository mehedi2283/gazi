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
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    console.error('Missing Supabase URL or anon key')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, anonKey)

  console.log('Querying instantly_campaigns with ANON KEY...')
  const { data: campaigns, error: campErr } = await supabase
    .from('instantly_campaigns')
    .select('*')

  if (campErr) {
    console.error('Error with anon key:', campErr)
  } else {
    console.log('Campaigns fetched with anon key:', campaigns.length)
  }

  console.log('Querying instantly_daily with ANON KEY...')
  const { data: daily, error: dailyErr } = await supabase
    .from('instantly_daily')
    .select('*')

  if (dailyErr) {
    console.error('Error with anon key:', dailyErr)
  } else {
    console.log('Daily fetched with anon key:', daily.length)
  }
}

main()
