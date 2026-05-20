import { NextResponse } from 'next/server'
import supabase from '../../../../lib/supabase/server'
import { isAuthResponse, requireApiAuth } from '../../../../lib/api/auth'

function scopeLeadQuery(query: any, auth: { userId: string; organizationId: string | null }) {
  if (auth.organizationId) {
    return query.eq('organization_id', auth.organizationId)
  }

  return null
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const id = params.id
    const query = scopeLeadQuery(supabase.from('leads').select('*').eq('id', id), auth)
    if (!query) return NextResponse.json({ data: null, error: 'Lead not found' }, { status: 404 })
    const { data, error } = await query.single()
    if (error) return NextResponse.json({ data: null, error })
    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const id = params.id
    const body = await req.json()
    const query = scopeLeadQuery(supabase.from('leads').update(body).eq('id', id), auth)
    if (!query) return NextResponse.json({ data: null, error: 'Lead not found' }, { status: 404 })
    const { data, error } = await query.select()
    if (error) return NextResponse.json({ data: null, error })
    return NextResponse.json({ data: data?.[0], error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    // Only admins can delete leads
    if (auth.role !== 'admin') {
      return NextResponse.json({ data: null, error: 'Only admins can delete leads' }, { status: 403 })
    }

    const id = params.id
    const query = scopeLeadQuery(supabase.from('leads').delete().eq('id', id), auth)
    if (!query) return NextResponse.json({ data: null, error: 'Lead not found' }, { status: 404 })
    const { data, error } = await query.select()
    if (error) return NextResponse.json({ data: null, error })
    return NextResponse.json({ data: data?.[0], error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
