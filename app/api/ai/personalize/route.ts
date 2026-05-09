import { NextResponse } from 'next/server'
import supabase from '../../../../lib/supabase/server'
import { callAI } from '../../../../lib/claude/client'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { leadId, first_name, last_name, title, company_name, industry, website } = body

    const system = 'You are a cold email personalization expert. Write natural, non-salesy opening lines.'
    const user = `Write ONE personalized opening line (max 2 sentences) for a cold email to:\nName: ${first_name || ''} ${last_name || ''}\nTitle: ${title || ''}\nCompany: ${company_name || ''}\nIndustry: ${industry || ''}\nWebsite: ${website || ''}\nReturn only the opening line, nothing else.`

    const aiResp = await callAI(system, user, 200)
    const text = aiResp.choices?.[0]?.message?.content || aiResp?.output_text || aiResp?.text || ''

    // update lead
    const { data, error } = await supabase
      .from('leads')
      .update({ personalization: text })
      .eq('id', leadId)
      .select()

    if (error) return NextResponse.json({ data: null, error })
    return NextResponse.json({ data: { lead: data?.[0], personalization: text }, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
