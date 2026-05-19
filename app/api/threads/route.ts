import { NextResponse } from 'next/server'
import supabase from '../../../lib/supabase/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const leadId = searchParams.get('lead_id')
    const campaignId = searchParams.get('campaign_id')

    if (!leadId || !campaignId) {
      return NextResponse.json({ data: null, error: 'lead_id and campaign_id required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('lead_message_threads')
      .select('*')
      .eq('lead_id', leadId)
      .eq('campaign_id', campaignId)
      .maybeSingle()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) }, { status: 500 })
  }
}
