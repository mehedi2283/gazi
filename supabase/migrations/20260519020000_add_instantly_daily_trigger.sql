-- Add trigger to sync leads from instantly_daily inserts
-- Safe behavior:
--  - Only updates when `replies` > 0
--  - Matches lead by `lead_id` if present, otherwise by `email` or `recipient_email`
--  - Increments `reply_count` and sets `last_reply_date` to the greatest known value

BEGIN;

-- Function: public.sync_leads_from_instantly_daily()
CREATE OR REPLACE FUNCTION public.sync_leads_from_instantly_daily()
RETURNS trigger AS $$
BEGIN
  -- Only act when there are replies to apply
  IF COALESCE(NEW.replies, 0) = 0 THEN
    RETURN NEW;
  END IF;

  -- Prefer direct lead id matching when available
  IF NEW.lead_id IS NOT NULL THEN
    UPDATE public.leads
    SET reply_count = COALESCE(reply_count, 0) + COALESCE(NEW.replies, 0),
        last_reply_date = GREATEST(COALESCE(last_reply_date, '1970-01-01'::timestamptz), COALESCE(NEW.last_reply_date, now()))
    WHERE id = NEW.lead_id;

    RETURN NEW;
  END IF;

  -- Fallbacks: match by known email fields
  IF NEW.email IS NOT NULL THEN
    UPDATE public.leads
    SET reply_count = COALESCE(reply_count, 0) + COALESCE(NEW.replies, 0),
        last_reply_date = GREATEST(COALESCE(last_reply_date, '1970-01-01'::timestamptz), COALESCE(NEW.last_reply_date, now()))
    WHERE email = NEW.email;

    RETURN NEW;
  END IF;

  IF NEW.recipient_email IS NOT NULL THEN
    UPDATE public.leads
    SET reply_count = COALESCE(reply_count, 0) + COALESCE(NEW.replies, 0),
        last_reply_date = GREATEST(COALESCE(last_reply_date, '1970-01-01'::timestamptz), COALESCE(NEW.last_reply_date, now()))
    WHERE email = NEW.recipient_email;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure no duplicate trigger exists, then create trigger
DROP TRIGGER IF EXISTS instantly_daily_sync_leads ON public.instantly_daily;
CREATE TRIGGER instantly_daily_sync_leads
AFTER INSERT ON public.instantly_daily
FOR EACH ROW
EXECUTE FUNCTION public.sync_leads_from_instantly_daily();

COMMIT;

-- Notes:
--  - This migration assumes `public.instantly_daily` may contain `lead_id`, `email`, or `recipient_email` fields
--  - If your actual column names differ, edit this migration before running
--  - The trigger increments `reply_count` by `NEW.replies` and updates `last_reply_date` if provided
