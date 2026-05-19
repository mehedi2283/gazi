-- Add lead engagement tracking fields
alter table leads add column if not exists reply_count int default 0;
alter table leads add column if not exists last_reply_date timestamp with time zone;
