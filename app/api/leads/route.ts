import { NextResponse } from 'next/server'
import supabase from '../../../lib/supabase/server'
import { addLead } from '../../../lib/instantly/client'

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
    const { data, error } = await supabase.from('leads').insert([body]).select()
    if (error) return NextResponse.json({ data: null, error })

    // push to Instantly (async, fire-and-forget)
    try {
      await addLead(body)
    } catch (e) {
      // ignore; Instantly retry exists in client
    }

    return NextResponse.json({ data: data?.[0], error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
