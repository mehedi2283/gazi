create extension if not exists pgcrypto;

create table if not exists email_accounts (
  id uuid primary key default gen_random_uuid(),
  email_address text not null unique,
  account_name text,
  provider text default 'instantly',
  synced_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text default 'free',
  instantly_api_key text,
  apollo_api_key text,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id),
  full_name text,
  role text default 'member',
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  created_by uuid references auth.users(id),
  name text not null,
  company_name text,
  created_from_company text,
  status text default 'draft',
  upload_status text,
  instantly_campaign_id text,
  total_leads int default 0,
  emails_sent int default 0,
  open_count int default 0,
  reply_count int default 0,
  bounce_count int default 0,
  daily_limit int default 50,
  email_gap int default 10,
  stop_on_reply boolean default true,
  open_tracking boolean default false,
  link_tracking boolean default true,
  timezone text default 'Etc/GMT+12',
  from_time text default '09:00',
  to_time text default '17:00',
  sending_days jsonb default '{"monday":true,"tuesday":true,"wednesday":true,"thursday":true,"friday":true,"saturday":false,"sunday":false}'::jsonb,
  booking_calendar_link text,
  report_email text,
  calendly_token text,
  calendly_webhook_id text,
  client_email text,
  sender_name text,
  sender_company text,
  sender_company_details text,
  long_message text,
  location text,
  sender_address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists sequences (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  step_number int not null,
  subject_variable text,
  body_variable text,
  subject text,
  body text,
  delay_days int default 0,
  created_at timestamptz default now()
);

alter table sequences add column if not exists subject_variable text;
alter table sequences add column if not exists body_variable text;
update sequences set subject_variable = subject where subject_variable is null and subject is not null;
update sequences set body_variable = body where body_variable is null and body is not null;

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  campaign_id uuid references campaigns(id),
  instantly_lead_id text,
  email text not null,
  first_name text,
  last_name text,
  title text,
  company_name text,
  company_linkedin_url text,
  company_domain text,
  website text,
  linkedin_url text,
  facebook_url text,
  twitter_url text,
  city text,
  state text,
  country text,
  company_address text,
  company_city text,
  company_state text,
  company_country text,
  company_phone text,
  technologies text,
  industry text,
  employees int,
  annual_revenue text,
  total_funding text,
  latest_funding text,
  latest_funding_amount text,
  last_raised_at timestamptz,
  sent_at timestamptz,
  phone text,
  status text default 'new',
  lead_score text default 'cold',
  source text default 'manual',
  email_open_count int default 0,
  email_reply_count int default 0,
  email_click_count int default 0,
  personalization text,
  campaign_ids uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (email)
);

create table if not exists campaign_stats (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  date date not null,
  emails_sent int default 0,
  opens int default 0,
  replies int default 0,
  clicks int default 0,
  bounces int default 0,
  created_at timestamptz default now()
);

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table campaigns enable row level security;
alter table sequences enable row level security;
alter table leads enable row level security;
alter table campaign_stats enable row level security;

drop policy if exists "Users see own org campaigns" on campaigns;
create policy "Users see own org campaigns" on campaigns
  for all using (organization_id = (select organization_id from profiles where id = auth.uid()));

drop policy if exists "Users see own org leads" on leads;
create policy "Users see own org leads" on leads
  for all using (organization_id = (select organization_id from profiles where id = auth.uid()));

drop policy if exists "Users see own org stats" on campaign_stats;
create policy "Users see own org stats" on campaign_stats
  for all using (campaign_id in (
    select id from campaigns where organization_id = (
      select organization_id from profiles where id = auth.uid()
    )
  ));

-- Instantly Analytics Tables

create table if not exists instantly_campaigns (
  campaign_id text primary key,
  campaign_name text,
  campaign_status int,
  leads_count int default 0,
  contacted_count int default 0,
  emails_sent_count int default 0,
  new_leads_contacted_count int default 0,
  open_count_unique int default 0,
  reply_count_unique int default 0,
  link_click_count_unique int default 0,
  bounced_count int default 0,
  unsubscribed_count int default 0,
  completed_count int default 0,
  synced_at timestamptz default now()
);

create table if not exists instantly_daily (
  id uuid primary key default gen_random_uuid(),
  date text not null,
  email_account text not null,
  sent int default 0,
  bounced int default 0,
  opened int default 0,
  unique_opened int default 0,
  replies int default 0,
  unique_replies int default 0,
  clicks int default 0,
  unique_clicks int default 0,
  contacted int default 0,
  new_leads_contacted int default 0,
  synced_at timestamptz default now(),
  unique (date, email_account)
);

create table if not exists instantly_overview (
  id uuid primary key default gen_random_uuid(),
  emails_sent_count int default 0,
  open_count_unique int default 0,
  reply_count_unique int default 0,
  link_click_count_unique int default 0,
  bounced_count int default 0,
  contacted_count int default 0,
  total_interested int default 0,
  total_meeting_booked int default 0,
  total_meeting_completed int default 0,
  total_closed int default 0,
  synced_at timestamptz default now()
);

-- Enable RLS and add public read policies for the dashboard
alter table instantly_campaigns enable row level security;
alter table instantly_daily enable row level security;
alter table instantly_overview enable row level security;

create policy "Allow public read instantly_campaigns" on instantly_campaigns for select using (true);
create policy "Allow public read instantly_daily" on instantly_daily for select using (true);
create policy "Allow public read instantly_overview" on instantly_overview for select using (true);

create table if not exists calendly_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  client_email text not null,
  calendly_token text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists calendly_tokens_token_key 
  on calendly_tokens(calendly_token);

