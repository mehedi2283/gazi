-- Stores sent and reply message history for each lead/campaign pair.
-- Assumption: one row per lead per campaign, with a JSONB array of message events.

BEGIN;

CREATE TABLE IF NOT EXISTS public.lead_message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  instantly_campaign_id text,
  lead_email text NOT NULL,
  lead_first_name text,
  lead_last_name text,
  company_name text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  sent_count int NOT NULL DEFAULT 0,
  reply_count int NOT NULL DEFAULT 0,
  last_sent_at timestamptz,
  last_reply_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS lead_message_threads_campaign_id_idx
  ON public.lead_message_threads (campaign_id);

CREATE INDEX IF NOT EXISTS lead_message_threads_lead_id_idx
  ON public.lead_message_threads (lead_id);

CREATE INDEX IF NOT EXISTS lead_message_threads_instantly_campaign_id_idx
  ON public.lead_message_threads (instantly_campaign_id);

CREATE INDEX IF NOT EXISTS lead_message_threads_messages_gin_idx
  ON public.lead_message_threads USING GIN (messages);

ALTER TABLE public.lead_message_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own org lead threads" ON public.lead_message_threads;
CREATE POLICY "Users see own org lead threads" ON public.lead_message_threads
  FOR ALL USING (
    organization_id = (
      SELECT organization_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

COMMIT;
