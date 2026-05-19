-- Backfill lead reply counts from existing email_reply_count
-- This sets `reply_count` only for leads where it's currently 0 and
-- we have a non-zero `email_reply_count` value to copy from.
-- Run this in Supabase SQL editor or via your migrations runner.

BEGIN;

UPDATE public.leads
SET reply_count = COALESCE(email_reply_count, 0)
WHERE COALESCE(reply_count, 0) = 0
  AND COALESCE(email_reply_count, 0) > 0;

COMMIT;
