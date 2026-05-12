export type Campaign = {
  id: string
  organization_id: string | null
  created_by?: string | null
  name: string
  status: string
  instantly_campaign_id?: string | null
  daily_limit?: number | null
  email_gap?: number | null
  stop_on_reply?: boolean | null
  open_tracking?: boolean | null
  link_tracking?: boolean | null
  timezone?: string | null
  from_time?: string | null
  to_time?: string | null
  total_leads?: number | null
  emails_sent?: number | null
  open_count?: number | null
  reply_count?: number | null
  bounce_count?: number | null
}

export type Lead = {
  id: string
  email: string
  first_name?: string
  last_name?: string
  title?: string
  company_name?: string
  company_linkedin_url?: string | null
  company_domain?: string | null
  website?: string | null
  linkedin_url?: string | null
  facebook_url?: string | null
  twitter_url?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  company_address?: string | null
  company_city?: string | null
  company_state?: string | null
  company_country?: string | null
  company_phone?: string | null
  technologies?: string | null
  industry?: string | null
  employees?: string | number | null
  annual_revenue?: string | null
  total_funding?: string | null
  latest_funding?: string | null
  latest_funding_amount?: string | null
  last_raised_at?: string | null
  phone?: string | null
  status?: string | null
}
