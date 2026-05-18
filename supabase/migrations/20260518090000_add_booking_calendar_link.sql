-- Add booking_calendar_link to campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS booking_calendar_link text;
