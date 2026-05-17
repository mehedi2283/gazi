import { NextResponse } from 'next/server'
import supabase from '../../../lib/supabase/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaign_id')

    let query = supabase.from('leads').select('*').order('created_at', { ascending: false })

    if (campaignId) {
      query = query.contains('campaign_ids', [campaignId])
    } else {
      query = query.limit(100)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ data: null, error })
    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
