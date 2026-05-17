import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'missing',
    serviceKeyLength: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
    anonKeyLength: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').length
  })
}
