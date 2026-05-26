import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import supabase from '../../../../lib/supabase/server'

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: false,
  path: '/'
}

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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json({ data: null, error: 'Email and password are required' }, { status: 400 })
    }

    const authClient = getAuthClient()
    const { data, error } = await authClient.auth.signInWithPassword({ email, password })

    if (error || !data.session) {
      return NextResponse.json({ data: null, error: error?.message || 'Invalid email or password' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id, full_name')
      .eq('id', data.user.id)
      .maybeSingle()

    const response = NextResponse.json({
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          role: profile?.role || 'user',
          organization_id: profile?.organization_id || null,
          full_name: profile?.full_name || null
        }
      },
      error: null
    })

    response.cookies.set('sb-access-token', data.session.access_token, {
      ...COOKIE_OPTIONS,
      maxAge: data.session.expires_in || 3600
    })
    response.cookies.set('sb-refresh-token', data.session.refresh_token, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30
    })
    response.cookies.set('sb-token-expires-at', String(Date.now() + (data.session.expires_in || 3600) * 1000), {
      path: '/',
      sameSite: 'lax',
      secure: false,
      httpOnly: false
    })

    return response
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) }, { status: 500 })
  }
}
