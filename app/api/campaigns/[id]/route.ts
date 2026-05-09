import { NextResponse } from 'next/server'
import supabase from '../../../../../lib/supabase/server'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase.from('campaigns').select('*').eq('id', params.id).single()
    if (error) return NextResponse.json({ data: null, error: error.message })
    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { data, error } = await supabase.from('campaigns').update(body).eq('id', params.id).select()
    if (error) return NextResponse.json({ data: null, error: error.message })
    return NextResponse.json({ data: data?.[0], error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase.from('campaigns').delete().eq('id', params.id).select()
    if (error) return NextResponse.json({ data: null, error: error.message })
    return NextResponse.json({ data: data?.[0], error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
