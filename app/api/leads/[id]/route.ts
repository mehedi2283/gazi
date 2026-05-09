import { NextResponse } from 'next/server'
import supabase from '../../../../lib/supabase/server'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const { data, error } = await supabase.from('leads').select('*').eq('id', id).single()
    if (error) return NextResponse.json({ data: null, error })
    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await req.json()
    const { data, error } = await supabase.from('leads').update(body).eq('id', id).select()
    if (error) return NextResponse.json({ data: null, error })
    return NextResponse.json({ data: data?.[0], error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const { data, error } = await supabase.from('leads').delete().eq('id', id).select()
    if (error) return NextResponse.json({ data: null, error })
    return NextResponse.json({ data: data?.[0], error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
