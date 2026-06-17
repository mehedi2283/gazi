-- Safely delete a campaign after detaching leads that may reference it.
-- This runs inside one database transaction, avoiding partial lead cleanup.

create or replace function public.delete_campaign_safely(
  p_campaign_id uuid,
  p_organization_id uuid default null,
  p_user_id uuid default null
)
returns table (
  deleted_campaign jsonb,
  detached_leads_count integer,
  deleted_sequences_count integer,
  deleted_message_threads_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_deleted_campaign jsonb;
  v_detached_leads_count integer := 0;
  v_deleted_sequences_count integer := 0;
  v_deleted_message_threads_count integer := 0;
begin
  select *
    into v_campaign
  from public.campaigns
  where id = p_campaign_id
    and (
      (p_organization_id is not null and organization_id = p_organization_id)
      or (p_organization_id is null and p_user_id is not null and created_by = p_user_id)
    )
  for update;

  if not found then
    return query select null::jsonb, 0, 0, 0;
    return;
  end if;

  with matching_leads as (
    select
      id,
      case when campaign_id = p_campaign_id then null else campaign_id end as next_campaign_id,
      array_remove(coalesce(campaign_ids, '{}'::uuid[]), p_campaign_id) as next_campaign_ids
    from public.leads
    where campaign_id = p_campaign_id
      or coalesce(campaign_ids, '{}'::uuid[]) @> array[p_campaign_id]::uuid[]
  ),
  updated_leads as (
    update public.leads lead
      set
        campaign_id = matching_leads.next_campaign_id,
        campaign_ids = matching_leads.next_campaign_ids,
        status = case
          when matching_leads.next_campaign_id is null
            and cardinality(matching_leads.next_campaign_ids) = 0
            then 'unassigned'
          else lead.status
        end,
        updated_at = now()
    from matching_leads
    where lead.id = matching_leads.id
    returning lead.id
  )
  select count(*)::integer
    into v_detached_leads_count
  from updated_leads;

  with deleted_threads as (
    delete from public.lead_message_threads
    where campaign_id = p_campaign_id
    returning id
  )
  select count(*)::integer
    into v_deleted_message_threads_count
  from deleted_threads;

  with deleted_sequences as (
    delete from public.sequences
    where campaign_id = p_campaign_id
    returning id
  )
  select count(*)::integer
    into v_deleted_sequences_count
  from deleted_sequences;

  delete from public.campaigns as campaign
  where campaign.id = p_campaign_id
  returning to_jsonb(campaign)
    into v_deleted_campaign;

  return query select
    v_deleted_campaign,
    v_detached_leads_count,
    v_deleted_sequences_count,
    v_deleted_message_threads_count;
end;
$$;
