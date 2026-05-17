create index if not exists campaigns_organization_created_at_idx
  on campaigns (organization_id, created_at desc);

create index if not exists campaigns_created_by_created_at_idx
  on campaigns (created_by, created_at desc);

create index if not exists campaigns_organization_status_idx
  on campaigns (organization_id, status);

create index if not exists campaigns_created_by_status_idx
  on campaigns (created_by, status);

create index if not exists leads_organization_created_at_idx
  on leads (organization_id, created_at desc);

create index if not exists leads_organization_status_idx
  on leads (organization_id, status);

create index if not exists leads_organization_source_idx
  on leads (organization_id, source);

create index if not exists leads_organization_lead_score_idx
  on leads (organization_id, lead_score);

create index if not exists leads_campaign_ids_gin_idx
  on leads using gin (campaign_ids);

create index if not exists campaign_stats_campaign_date_idx
  on campaign_stats (campaign_id, date);

create index if not exists sequences_campaign_step_idx
  on sequences (campaign_id, step_number);

