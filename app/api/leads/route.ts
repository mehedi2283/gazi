import { NextResponse } from 'next/server'
import supabase from '../../../lib/supabase/server'
import { isAuthResponse, requireApiAuth } from '../../../lib/api/auth'

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(Math.floor(parsed), max)
}

export async function GET(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaign_id')
    const page = parsePositiveInt(searchParams.get('page'), 1, 100000)
    const perPage = parsePositiveInt(searchParams.get('per_page'), 25, 250)
    const exportAll = searchParams.get('export') === '1'
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('lead_gpt_score', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (campaignId) {
      const campaignQuery = supabase
        .from('campaigns')
        .select('id')
        .eq('id', campaignId)

      if (auth.organizationId) {
        campaignQuery.eq('organization_id', auth.organizationId)
      } else {
        campaignQuery.eq('created_by', auth.userId)
      }

      const { data: campaign, error: campaignError } = await campaignQuery.maybeSingle()
      if (campaignError) return NextResponse.json({ data: null, error: campaignError.message }, { status: 500 })
      if (!campaign) return NextResponse.json({ data: null, error: 'Campaign not found' }, { status: 404 })

      query = query.or(`campaign_id.eq.${campaignId},campaign_ids.cs.{${campaignId}}`)
    } else if (auth.organizationId) {
      query = query.eq('organization_id', auth.organizationId)
    } else {
      return NextResponse.json({
        data: [],
        error: null,
        meta: { page, perPage, total: 0 }
      })
    }

    // Search across name, company, industry and title
    const search = searchParams.get('search')
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = `%${search.trim().replace(/%/g, '\\%')}%`
      // search first_name, last_name, company_name, industry, title, email
      query = query.or(`first_name.ilike.${q},last_name.ilike.${q},company_name.ilike.${q},industry.ilike.${q},title.ilike.${q},email.ilike.${q}`)
    }

    // Filter by lead_score (cold/warm/hot) - legacy support
    const leadScore = searchParams.get('lead_score')
    if (leadScore) {
      query = query.eq('lead_score', leadScore)
    }

    // Filter by lead_gpt_score buckets
    const leadGptScoreBucket = searchParams.get('lead_gpt_score_bucket')
    if (leadGptScoreBucket) {
      const bucket = leadGptScoreBucket.toLowerCase()
      if (bucket === 'high') {
        query = query.gte('lead_gpt_score', 8).lte('lead_gpt_score', 10)
      } else if (bucket === 'medium') {
        query = query.gte('lead_gpt_score', 4).lte('lead_gpt_score', 7)
      } else if (bucket === 'low') {
        query = query.gte('lead_gpt_score', 0).lte('lead_gpt_score', 3)
      } else if (bucket === 'none') {
        query = query.is('lead_gpt_score', null)
      }
    }

    // Filter by source
    const source = searchParams.get('source')
    if (source) {
      query = query.eq('source', source)
    }

    if (exportAll) {
      // Only admins can export leads
      if (auth.role !== 'admin') {
        return NextResponse.json({ data: null, error: 'Only admins can export leads' }, { status: 403 })
      }
      query = query.limit(50000)
    } else {
      query = query.range(from, to)
    }

    const { data, error, count } = await query
    if (error) return NextResponse.json({ data: null, error })
    return NextResponse.json({
      data,
      error: null,
      meta: { page, perPage, total: count ?? data?.length ?? 0 }
    })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
