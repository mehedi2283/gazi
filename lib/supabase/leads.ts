import supabase from './server'

export async function upsertLeadsWithCampaigns(sanitizedLeads: any[]) {
  if (!sanitizedLeads || sanitizedLeads.length === 0) return { data: [], error: null }

  // Extract all emails to check for existing leads
  const emails = sanitizedLeads.map((l) => l.email).filter(Boolean)

  // Fetch existing leads by email
  const { data: existingLeads, error: fetchError } = await supabase
    .from('leads')
    .select('id, email, campaign_ids, campaign_id')
    .in('email', emails)

  if (fetchError) {
    return { data: null, error: fetchError }
  }

  // Build a map of existing leads by email
  const existingByEmail = new Map<string, any>()
  for (const lead of existingLeads || []) {
    existingByEmail.set(lead.email, lead)
  }

  // Merge the campaign_ids array for each lead
  const leadsToUpsert = sanitizedLeads.map((lead) => {
    const existing = existingByEmail.get(lead.email)
    
    // Start with existing campaign_ids or an empty array
    let mergedCampaignIds: string[] = existing?.campaign_ids || []
    
    // If the existing lead has a legacy `campaign_id` that isn't in the array, add it
    if (existing?.campaign_id && !mergedCampaignIds.includes(existing.campaign_id)) {
      mergedCampaignIds.push(existing.campaign_id)
    }

    // Add the new campaign_id if it's not already in the array
    if (lead.campaign_id && !mergedCampaignIds.includes(lead.campaign_id)) {
      mergedCampaignIds.push(lead.campaign_id)
    }

    return {
      ...(existing?.id ? { id: existing.id } : {}), // Preserve the existing ID
      ...lead,
      campaign_ids: mergedCampaignIds
    }
  })

  // Upsert the leads (this will update existing ones by email since email is unique)
  // We use onConflict: 'email' to ensure it updates instead of failing
  const { data, error } = await supabase
    .from('leads')
    .upsert(leadsToUpsert, { onConflict: 'email' })
    .select()

  return { data, error }
}
