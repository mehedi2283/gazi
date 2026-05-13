import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/campaigns',
  '/leads',
  '/analytics',
  '/ai-personalization',
  '/inbox',
  '/integrations',
  '/settings'
]

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/'
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
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

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('next', `${req.nextUrl.pathname}${req.nextUrl.search}`)
  return NextResponse.redirect(loginUrl)
}

export async function middleware(req: NextRequest) {
  if (!isProtectedPath(req.nextUrl.pathname)) {
    return NextResponse.next()
  }

  const accessToken = req.cookies.get('sb-access-token')?.value
  const refreshToken = req.cookies.get('sb-refresh-token')?.value
  const authClient = getAuthClient()

  if (accessToken) {
    const { data } = await authClient.auth.getUser(accessToken)
    if (data.user) {
      return NextResponse.next()
    }
  }

  if (refreshToken) {
    const { data } = await authClient.auth.refreshSession({ refresh_token: refreshToken })
    if (data.session) {
      const response = NextResponse.next()
      response.cookies.set('sb-access-token', data.session.access_token, {
        ...COOKIE_OPTIONS,
        maxAge: data.session.expires_in || 3600
      })
      response.cookies.set('sb-refresh-token', data.session.refresh_token, {
        ...COOKIE_OPTIONS,
        maxAge: 60 * 60 * 24 * 30
      })
      return response
    }
  }

  return redirectToLogin(req)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/campaigns/:path*',
    '/leads/:path*',
    '/analytics/:path*',
    '/ai-personalization/:path*',
    '/inbox/:path*',
    '/integrations/:path*',
    '/settings/:path*'
  ]
}
