import { NextResponse } from 'next/server'
import { isAuthResponse, requireApiAuth } from '../../../lib/api/auth'
import supabase from '../../../lib/supabase/server'

export async function GET(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

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

    return NextResponse.json({ data: profile, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) }, { status: 500 })
  }
}
