-- =============================================================================
-- 0003_plans_and_limits.sql
-- Makes the pricing model enforceable in the database.
--
-- Pricing: per WORKSPACE (organisation), with a number of PEOPLE included and a
-- price per extra person. The app already checks limits when someone invites a
-- person or adds a property; this file adds the same checks in the database so
-- they cannot be bypassed, and stops a workspace owner changing their own plan.
--
-- Adds:
--   * organizations.extra_seats        extra people bought on top of the plan
--   * app_plan_limits(plan)            seats / properties per plan (mirror of lib/plans.ts)
--   * app_seats_used(org)              members + pending invitations
--   * trigger: billing fields (plan, trial_ends_at, extra_seats) can only be
--     changed with the service key (the operator), never by a workspace member
--   * triggers: refuse an invitation, a membership or a property over the limit
--
-- Idempotent. Run after 0002.
-- =============================================================================

alter table organizations add column if not exists extra_seats int not null default 0;

-- Keep in step with lib/plans.ts. null = no limit.
create or replace function app_plan_limits(p_plan text)
returns table (seats int, properties int)
language sql immutable as $$
  select
    case x.p when 'starter' then 3 when 'growth' then 10 when 'enterprise' then null else 5 end,  -- trial (and unknown) = 5
    case x.p when 'starter' then 1 when 'growth' then 5  when 'enterprise' then null else 1 end
  from (select coalesce(nullif(lower(p_plan), ''), 'trial') as p) x;
$$;

create or replace function app_seats_used(p_org uuid)
returns int language sql stable security definer set search_path = public as $$
  select (select count(*) from memberships where organization_id = p_org)::int
       + (select count(*) from invitations where organization_id = p_org and status = 'pending' and expires_at > now())::int;
$$;

-- Only the operator (service key) may change what a workspace is paying for.
create or replace function app_protect_billing_fields()
returns trigger language plpgsql as $$
begin
  if (new.plan is distinct from old.plan
      or new.trial_ends_at is distinct from old.trial_ends_at
      or new.extra_seats is distinct from old.extra_seats)
     and coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'The plan can only be changed by the service operator';
  end if;
  return new;
end $$;

drop trigger if exists protect_billing_fields on organizations;
create trigger protect_billing_fields
  before update on organizations
  for each row execute function app_protect_billing_fields();

-- People limit: a new pending invitation or a new member must fit in the plan.
create or replace function app_enforce_seat_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_limit int;
  v_extra int;
  v_used int;
  v_plan text;
begin
  select plan, extra_seats into v_plan, v_extra from organizations where id = new.organization_id;
  select seats into v_limit from app_plan_limits(v_plan);
  if v_limit is null then return new; end if;

  v_used := app_seats_used(new.organization_id);

  if tg_table_name = 'memberships' then
    -- accepting an invitation swaps a pending invitation for a membership: net zero
    if exists (select 1 from invitations i join profiles p on lower(p.email) = lower(i.email)
               where i.organization_id = new.organization_id and i.status = 'pending' and p.id = new.user_id) then
      return new;
    end if;
    -- the first member (the creator) always fits
    if not exists (select 1 from memberships where organization_id = new.organization_id) then return new; end if;
  elsif new.status <> 'pending' then
    return new;
  end if;

  if v_used + 1 > v_limit + coalesce(v_extra, 0) then
    raise exception 'This workspace has reached its limit of % people. Remove someone or add people to the plan.', v_limit + coalesce(v_extra, 0);
  end if;
  return new;
end $$;

drop trigger if exists enforce_seat_limit on invitations;
create trigger enforce_seat_limit before insert on invitations
  for each row execute function app_enforce_seat_limit();

drop trigger if exists enforce_seat_limit on memberships;
create trigger enforce_seat_limit before insert on memberships
  for each row execute function app_enforce_seat_limit();

-- Property limit.
create or replace function app_enforce_property_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_limit int;
  v_count int;
begin
  if not new.active then return new; end if;
  select l.properties into v_limit from organizations o, app_plan_limits(o.plan) l where o.id = new.organization_id;
  if v_limit is null then return new; end if;
  select count(*) into v_count from properties where organization_id = new.organization_id and active and id <> new.id;
  if v_count + 1 > v_limit then
    raise exception 'This plan allows % active propert% per workspace.', v_limit, case when v_limit = 1 then 'y' else 'ies' end;
  end if;
  return new;
end $$;

drop trigger if exists enforce_property_limit on properties;
create trigger enforce_property_limit before insert or update of active on properties
  for each row execute function app_enforce_property_limit();

notify pgrst, 'reload schema';

-- -----------------------------------------------------------------------------
-- Operator cheat-sheet (run in the SQL editor; the triggers allow it there):
--   update organizations set plan = 'starter'                      where name = '...';
--   update organizations set plan = 'growth', extra_seats = 4      where name = '...';
--   update organizations set trial_ends_at = now() + interval '14 days' where name = '...';
-- -----------------------------------------------------------------------------
