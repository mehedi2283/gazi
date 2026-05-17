import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import supabase from '../supabase/server'

type AuthContext = {
  userId: string
  organizationId: string | null
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

export function unauthorizedResponse() {
  return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
}

export async function requireApiAuth(req: Request): Promise<AuthContext | NextResponse> {
  const cookie = req.headers.get('cookie') || ''
  const accessToken = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('sb-access-token='))
    ?.split('=')
    .slice(1)
    .join('=')

  if (!accessToken) {
    return unauthorizedResponse()
  }

  const authClient = getAuthClient()
  const { data, error } = await authClient.auth.getUser(decodeURIComponent(accessToken))

  if (error || !data.user?.id) {
    return unauthorizedResponse()
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', data.user.id)
    .maybeSingle()

  return {
    userId: data.user.id,
    organizationId: profile?.organization_id || null
  }
}

export function isAuthResponse(value: AuthContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}

