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

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    const base64Url = parts[1]
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    const jsonPayload = atob(base64)
    const payload = JSON.parse(jsonPayload)
    if (!payload.exp) return true
    
    // Add a 10-second buffer
    const now = Math.floor(Date.now() / 1000)
    return now >= (payload.exp - 10)
  } catch (e) {
    return true
  }
}

export async function middleware(req: NextRequest) {
  if (!isProtectedPath(req.nextUrl.pathname)) {
    return NextResponse.next()
  }

  const accessToken = req.cookies.get('sb-access-token')?.value
  const refreshToken = req.cookies.get('sb-refresh-token')?.value

  // If the access token is present and valid/not expired, allow navigation instantly (takes 0ms)
  if (accessToken && !isTokenExpired(accessToken)) {
    return NextResponse.next()
  }

  // If this is a client-side navigation/prefetch RSC request, and we have a refresh token,
  // allow the transition instantly. The client-side TokenRefresher or API requests will handle refresh if needed.
  const isRsc = req.headers.has('x-next-rsc') || req.headers.has('rsc') || req.nextUrl.searchParams.has('_rsc')
  if (isRsc && refreshToken) {
    return NextResponse.next()
  }

  // If access token is missing or expired, attempt to refresh session
  if (refreshToken) {
    const authClient = getAuthClient()
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
      response.cookies.set('sb-token-expires-at', String(Date.now() + (data.session.expires_in || 3600) * 1000), {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false
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
