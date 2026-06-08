alter table campaigns add column if not exists channel text not null default 'email_outreach';
alter table campaigns add column if not exists campaign_type text not null default 'email_outreach';
alter table campaigns add column if not exists channel_metadata jsonb not null default '{}'::jsonb;

update campaigns
set
  channel = coalesce(channel, 'email_outreach'),
  campaign_type = coalesce(campaign_type, 'email_outreach'),
  channel_metadata = coalesce(channel_metadata, '{}'::jsonb);

create index if not exists campaigns_channel_created_at_idx
  on campaigns (channel, created_at desc);
