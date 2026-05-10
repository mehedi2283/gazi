alter table campaigns
add column if not exists sending_days jsonb default '{"monday":true,"tuesday":true,"wednesday":true,"thursday":true,"friday":true,"saturday":false,"sunday":false}'::jsonb;