import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import supabase from '../../../lib/supabase/server'
import { isAuthResponse, requireApiAuth } from '../../../lib/api/auth'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

export async function GET(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    // Fetch all users in the organization
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [], error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    // Only admins can create users
    if (auth.role !== 'admin') {
      return NextResponse.json({ data: null, error: 'Only admins can create users' }, { status: 403 })
    }

    const body = await req.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ data: null, error: 'Please enter a valid email address' }, { status: 400 })
    }

    if (!fullName) {
      return NextResponse.json({ data: null, error: 'Full name is required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ data: null, error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const authClient = getAuthClient()
    const { data: signUpData, error: signUpError } = await authClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    })

    if (signUpError || !signUpData.user?.id) {
      return NextResponse.json({ data: null, error: signUpError?.message || 'Unable to create user' }, { status: 400 })
    }

    // Create profile for the new user with 'user' role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: signUpData.user.id,
        organization_id: auth.organizationId,
        full_name: fullName,
        role: 'user'
      })
      .select('id, full_name, role, created_at')
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ data: null, error: profileError?.message || 'User created, but profile could not be saved' }, { status: 500 })
    }

    return NextResponse.json({
      data: profile,
      error: null
    })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) }, { status: 500 })
  }
}
