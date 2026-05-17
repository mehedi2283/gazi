import { NextResponse } from 'next/server'
import supabase from '../../../lib/supabase/server'
import { isAuthResponse, requireApiAuth } from '../../../lib/api/auth'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeAccountName(value: unknown, email: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : email
}

function formatEmailAccountError(error: any) {
  if (error?.code === 'PGRST205') {
    return {
      message: 'Supabase schema is not installed yet. Run the SQL in supabase/schema.sql to create the email_accounts table.'
    }
  }

  return error
}

export async function GET(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const { data, error } = await supabase
      .from('email_accounts')
      .select('id, email_address, account_name, provider')
      .order('email_address', { ascending: true })

    if (error) {
      return NextResponse.json({ data: null, error: formatEmailAccountError(error) }, { status: 500 })
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

    const body = await req.json()
    const emailAddress = normalizeEmail(body?.email_address)

    if (!EMAIL_REGEX.test(emailAddress)) {
      return NextResponse.json({ data: null, error: 'Please enter a valid email address' }, { status: 400 })
    }

    const accountName = normalizeAccountName(body?.account_name, emailAddress)

    const { data, error } = await supabase
      .from('email_accounts')
      .upsert(
        {
          email_address: emailAddress,
          account_name: accountName,
          provider: body?.provider || 'instantly',
          synced_at: new Date().toISOString()
        },
        { onConflict: 'email_address' }
      )
      .select('id, email_address, account_name, provider')
      .single()

    if (error) {
      return NextResponse.json({ data: null, error: formatEmailAccountError(error) }, { status: 500 })
    }

    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const emailAddress = normalizeEmail(searchParams.get('email_address'))

    if (!id && !emailAddress) {
      return NextResponse.json({ data: null, error: 'Email account id or email address is required' }, { status: 400 })
    }

    let query = supabase.from('email_accounts').delete()
    query = id ? query.eq('id', id) : query.eq('email_address', emailAddress)

    const { error } = await query

    if (error) {
      return NextResponse.json({ data: null, error: formatEmailAccountError(error) }, { status: 500 })
    }

    return NextResponse.json({ data: { id, email_address: emailAddress || null }, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) }, { status: 500 })
  }
}
