-- add campaign snapshot fields to leads
alter table leads add column if not exists campaign_company_name text;
alter table leads add column if not exists campaign_creator text;
