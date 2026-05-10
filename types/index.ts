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
}
