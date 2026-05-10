alter table campaigns add column if not exists created_by uuid references auth.users(id);
alter table campaigns add column if not exists total_leads int not null default 0;
alter table campaigns add column if not exists emails_sent int not null default 0;
alter table campaigns add column if not exists open_count int not null default 0;
alter table campaigns add column if not exists reply_count int not null default 0;
alter table campaigns add column if not exists bounce_count int not null default 0;

alter table campaigns alter column open_tracking set default false;
alter table campaigns alter column timezone set default 'Etc/GMT+12';