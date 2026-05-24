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

  console.log('Inspecting active policies in Supabase postgres...')
  const { data, error } = await supabase.rpc('inspect_policies_custom')

  if (error) {
    console.log('Direct RPC failed. Trying raw query on pg_policies...')
    // Since we don't have direct SQL runner RPC defined, let's just query using pg_policies if there is an SQL function,
    // or let's inspect pg_policies using custom query if we can.
    // Wait, let's see if we have schema info or if we can run a SQL statement via RPC or other table queries.
    console.error(error)
  } else {
    console.log(data)
  }
}

main()
