-- Add campaign flow fields
alter table campaigns add column if not exists target_lead_count int default 0;
alter table campaigns add column if not exists attachment_url text;
alter table campaigns add column if not exists signature text;
