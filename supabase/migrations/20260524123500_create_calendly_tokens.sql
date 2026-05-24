create table if not exists calendly_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  client_email text not null,
  calendly_token text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Unique index to prevent duplicate tokens for the same client under an organization
create unique index if not exists calendly_tokens_org_email_token_idx 
  on calendly_tokens(organization_id, client_email, calendly_token);

-- Backfill from existing campaigns
insert into calendly_tokens (organization_id, client_email, calendly_token)
select distinct organization_id, client_email, calendly_token
from campaigns
where calendly_token is not null 
  and client_email is not null
  and organization_id is not null
on conflict do nothing;
