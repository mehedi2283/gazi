-- Add Calendly and client email columns to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS calendly_token text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS calendly_webhook_id text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS client_email text;
