alter table public.campaigns
  add column if not exists upload_status text;

create index if not exists campaigns_upload_status_idx
  on public.campaigns (upload_status);
