import { NextResponse } from 'next/server'
import supabase from '../../../../lib/supabase/server'
import { callAI } from '../../../../lib/claude/client'

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { leadIds } = body

    const { data: leads, error: fetchErr } = await supabase.from('leads').select('*').in('id', leadIds)
    if (fetchErr) return NextResponse.json({ data: null, error: fetchErr })

    const results: any[] = []
    for (const lead of leads || []) {
      if (lead.personalization) {
        results.push({ id: lead.id, skipped: true })
        continue
      }

      const system = 'You are a cold email personalization expert. Write natural, non-salesy opening lines.'
      const user = `Write ONE personalized opening line (max 2 sentences) for a cold email to:\nName: ${lead.first_name || ''} ${lead.last_name || ''}\nTitle: ${lead.title || ''}\nCompany: ${lead.company_name || ''}\nIndustry: ${lead.industry || ''}\nWebsite: ${lead.website || ''}\nReturn only the opening line, nothing else.`

      const aiResp = await callAI(system, user, 200)
      const text = aiResp.choices?.[0]?.message?.content || aiResp?.output_text || aiResp?.text || ''

      const { data: updated, error: upErr } = await supabase
        .from('leads')
        .update({ personalization: text })
        .eq('id', lead.id)
        .select()

      results.push({ id: lead.id, personalization: text, error: upErr || null })
      // rate limit / politeness
      await delay(300)
    }

    return NextResponse.json({ data: results, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
