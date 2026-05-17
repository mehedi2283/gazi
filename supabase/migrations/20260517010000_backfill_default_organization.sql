do $$
declare
  default_org_id uuid;
  owner_user_id uuid;
begin
  select id into default_org_id
  from organizations
  order by created_at asc
  limit 1;

  if default_org_id is null then
    insert into organizations (name)
    values ('LeadGen AI')
    returning id into default_org_id;
  end if;

  select id into owner_user_id
  from profiles
  order by created_at asc
  limit 1;

  update profiles
  set organization_id = default_org_id
  where organization_id is null;

  update campaigns
  set
    organization_id = default_org_id,
    created_by = coalesce(created_by, owner_user_id)
  where organization_id is null;

  update leads
  set organization_id = default_org_id
  where organization_id is null;
end $$;

