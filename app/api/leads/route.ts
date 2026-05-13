import { NextResponse } from 'next/server'
import supabase from '../../../lib/supabase/server'

export async function GET() {
  try {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(100)
    if (error) return NextResponse.json({ data: null, error })
    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { ...leadBody } = body || {}
    const { data, error } = await supabase.from('leads').insert([leadBody]).select()
    if (error) return NextResponse.json({ data: null, error })

    const savedLead = data?.[0] || body
    return NextResponse.json({ data: savedLead, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
