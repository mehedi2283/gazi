import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import supabase from '../../../../lib/supabase/server'

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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!fullName) {
      return NextResponse.json({ data: null, error: 'Full name is required' }, { status: 400 })
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ data: null, error: 'Please enter a valid email address' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ data: null, error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const authClient = getAuthClient()
    const { data, error } = await authClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })

    if (error || !data.user?.id) {
      return NextResponse.json({ data: null, error: error?.message || 'Unable to create account' }, { status: 400 })
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: data.user.id,
          full_name: fullName,
          role: 'member'
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      return NextResponse.json({ data: null, error: profileError.message || 'Account created, but profile could not be saved' }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        id: data.user.id,
        email: data.user.email
      },
      error: null
    })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) }, { status: 500 })
  }
}
