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
    const body = await req.json()
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken : ''
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : ''
    const expiresIn = Number(body?.expiresIn) > 0 ? Number(body.expiresIn) : 3600

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ success: false, error: 'Missing session tokens' }, { status: 400 })
    }

    const authClient = getAuthClient()
    const { data, error } = await authClient.auth.getUser(accessToken)

    if (error || !data.user?.id) {
      return NextResponse.json({ success: false, error: error?.message || 'Invalid session' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })

    response.cookies.set('sb-access-token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: expiresIn
    })
    response.cookies.set('sb-refresh-token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30
    })
    response.cookies.set('sb-token-expires-at', String(Date.now() + expiresIn * 1000), {
      path: '/',
      sameSite: 'lax',
      secure: false,
      httpOnly: false
    })

    return response
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 500 })
  }
}
