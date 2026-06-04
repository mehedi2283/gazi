import { NextResponse } from 'next/server'
import { isAuthResponse, requireApiAuth } from '../../../../lib/api/auth'
import { createClient } from '@supabase/supabase-js'
import supabase from '../../../../lib/supabase/server'

function getAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

function getAccessToken(req: Request) {
  const cookie = req.headers.get('cookie') || ''
  return cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('sb-access-token='))
    ?.split('=')
    .slice(1)
    .join('=')
}

export async function GET(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const accessToken = getAccessToken(req)
    const authClient = getAuthClient()
    const { data: authUser } = accessToken ? await authClient.auth.getUser(decodeURIComponent(accessToken)) : { data: null }

    // Get full profile with email
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, organization_id')
      .eq('id', auth.userId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ data: null, error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        ...profile,
        email: authUser?.user?.email || null
      },
      error: null
    })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) }, { status: 500 })
  }
}
