import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const cookie = req.headers.get('cookie') || ''
    const refreshToken = cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('sb-refresh-token='))
      ?.split('=')
      .slice(1)
      .join('=')

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
    }

    const authClient = getAuthClient()
    const { data, error } = await authClient.auth.refreshSession({ refresh_token: decodeURIComponent(refreshToken) })

    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || 'Failed to refresh session' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })

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
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
