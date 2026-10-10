-- =============================================================================
-- 0002_saas_tenancy.sql
-- Multi-tenant SaaS layer on top of 0001_initial_schema.sql.
--
-- Adds:  organisations, properties, memberships, per-organisation roles with a
--        module x action permission matrix, Supabase Auth profiles, invitations,
--        accounts + ledger (replaces read-modify-write account balances),
--        payment methods, invoices with per-tenant sequential numbers, audit log,
--        organisation/property columns on every business table, scoped unique
--        constraints, updated_at triggers, the Guest -> Revenue sync and the
--        ledger sync as database triggers, row-level security on every table,
--        a private Storage bucket with per-tenant policies.
--
-- Idempotent: safe to re-run. Designed to run after 0001 on an empty database;
-- it also tolerates existing rows (organization_id is only made NOT NULL when
-- no NULL rows remain).
--
-- Legacy tables from 0001 that this layer no longer uses are kept but locked
-- (RLS on, no policies): users, role_permissions, bank_balances,
-- shareholder_profiles, account_balances.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Tenancy core
-- -----------------------------------------------------------------------------

create table if not exists organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique,
  plan          text not null default 'trial',                 -- trial | starter | growth | enterprise
  trial_ends_at timestamptz default (now() + interval '14 days'),
  settings      jsonb not null default '{}'::jsonb,            -- see app_default_org_settings()
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists properties (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  timezone        text not null default 'UTC',
  address         text,
  active          boolean not null default true,
  settings        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists properties_org_idx on properties (organization_id);

-- One row per Supabase Auth user (kept in sync by trigger).
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-organisation roles. permissions = { "<module>": {"view":bool,"add":bool,"edit":bool,"delete":bool}, ... }
create table if not exists org_roles (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  is_system       boolean not null default false,              -- Owner: cannot be deleted or stripped
  permissions     jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role_id         uuid not null references org_roles(id) on delete restrict,
  status          text not null default 'active',              -- active | suspended
  display_name    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index if not exists memberships_user_idx on memberships (user_id);

-- Profiles mirror auth.users (trigger below). Backfill any existing users and
-- add a foreign key from memberships to profiles so PostgREST can embed the
-- member's name and email (auth.users itself is not exposed).
insert into profiles (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
from auth.users u
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'memberships_profile_fkey') then
    alter table memberships add constraint memberships_profile_fkey foreign key (user_id) references profiles(id) on delete cascade;
  end if;
end $$;

create table if not exists invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email           text not null,
  role_id         uuid not null references org_roles(id) on delete cascade,
  token           uuid not null unique default gen_random_uuid(),
  invited_by      uuid references auth.users(id) on delete set null,
  status          text not null default 'pending',             -- pending | accepted | revoked
  expires_at      timestamptz not null default (now() + interval '7 days'),
  accepted_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists invitations_org_idx on invitations (organization_id);
-- A role in use by a pending invitation cannot be deleted (matches memberships).
alter table invitations drop constraint if exists invitations_role_id_fkey;
alter table invitations add constraint invitations_role_id_fkey foreign key (role_id) references org_roles(id) on delete restrict;

-- -----------------------------------------------------------------------------
-- 2. Accounts, payment methods, ledger, invoices, audit
-- -----------------------------------------------------------------------------

create table if not exists accounts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  type            text not null default 'bank',                -- bank | cash | wallet | other
  currency        text,
  opening_balance numeric(14,2) not null default 0,
  notes           text,
  active          boolean not null default true,
  sort            int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists payment_methods (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  account_id      uuid references accounts(id) on delete set null,
  active          boolean not null default true,
  sort            int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, name)
);

-- The ledger. Balance of an account = opening_balance + sum(amount).
-- Rows with source_table/source_id are maintained by triggers (guests, expenses);
-- rows with source_table = 'adjustment' are manual.
create table if not exists account_movements (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  account_id      uuid not null references accounts(id) on delete cascade,
  amount          numeric(14,2) not null,
  occurred_on     date not null default current_date,
  description     text,
  source_table    text,
  source_id       uuid,
  created_by      uuid default auth.uid(),
  created_at      timestamptz not null default now()
);
create index if not exists account_movements_account_idx on account_movements (account_id);
create index if not exists account_movements_source_idx  on account_movements (source_table, source_id);
create index if not exists account_movements_org_idx     on account_movements (organization_id);

create table if not exists invoices (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id     uuid references properties(id) on delete set null,
  guest_id        uuid references guests(id) on delete set null,
  number          text not null,
  year            int  not null,
  seq             int  not null,
  issued_date     date not null default current_date,
  due_date        date,
  currency        text not null default 'THB',
  subtotal        numeric(14,2) not null default 0,
  vat_rate        numeric(5,2)  not null default 0,
  vat_amount      numeric(14,2) not null default 0,
  total           numeric(14,2) not null default 0,
  deposit         numeric(14,2) not null default 0,
  balance_due     numeric(14,2) not null default 0,
  bill_to         jsonb not null default '{}'::jsonb,
  lines           jsonb not null default '[]'::jsonb,
  issuer          jsonb not null default '{}'::jsonb,
  notes           text,
  status          text not null default 'issued',              -- issued | void
  public_token    uuid not null unique default gen_random_uuid(),
  created_by      uuid default auth.uid(),
  created_at      timestamptz not null default now(),
  unique (organization_id, number)
);
create index if not exists invoices_guest_idx on invoices (guest_id);

create table if not exists invoice_counters (
  organization_id uuid not null references organizations(id) on delete cascade,
  year            int  not null,
  last_number     int  not null default 0,
  primary key (organization_id, year)
);

create table if not exists audit_log (
  id              bigserial primary key,
  organization_id uuid,
  table_name      text not null,
  row_id          uuid,
  action          text not null,
  actor           uuid,
  old_data        jsonb,
  new_data        jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists audit_log_org_idx on audit_log (organization_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 3. Tenant columns on the business tables from 0001
-- -----------------------------------------------------------------------------

do $$
declare
  org_tables text[] := array[
    'rooms','room_photos','room_inventory','room_fire_extinguishers',
    'guests','revenue','expenses',
    'shareholders','founding_contributions','shareholder_work','shareholder_meetings',
    'todos','staff_hours','complaints','company_documents','web_credentials',
    'budget_revenue','budget_expenses','budget_rent','budget_room_setup'
  ];
  prop_tables text[] := array[
    'rooms','room_photos','room_inventory','room_fire_extinguishers',
    'guests','revenue','expenses','complaints','todos','staff_hours','company_documents',
    'budget_revenue','budget_expenses','budget_rent','budget_room_setup'
  ];
  t text;
  has_nulls boolean;
begin
  foreach t in array org_tables loop
    execute format('alter table %I add column if not exists organization_id uuid references organizations(id) on delete cascade', t);
    execute format('alter table %I add column if not exists created_by uuid default auth.uid()', t);
    execute format('create index if not exists %I on %I (organization_id)', t || '_org_idx', t);
    execute format('select exists (select 1 from %I where organization_id is null)', t) into has_nulls;
    if not has_nulls then
      execute format('alter table %I alter column organization_id set not null', t);
    end if;
  end loop;

  foreach t in array prop_tables loop
    execute format('alter table %I add column if not exists property_id uuid references properties(id) on delete cascade', t);
    execute format('create index if not exists %I on %I (property_id)', t || '_property_idx', t);
  end loop;
end $$;

-- Extra columns the SaaS layer needs
alter table guests   add column if not exists room_id           uuid references rooms(id) on delete set null;
alter table guests   add column if not exists payment_method_id uuid references payment_methods(id) on delete set null;
alter table guests   add column if not exists updated_at        timestamptz not null default now();

alter table expenses add column if not exists payment_method_id uuid references payment_methods(id) on delete set null;
alter table expenses add column if not exists amount_base       numeric(14,2);   -- amount in the organisation's base currency
alter table expenses add column if not exists fx_rate           numeric(14,6);   -- rate used for amount_base (1 when currency = base)
alter table expenses add column if not exists updated_at        timestamptz not null default now();

alter table revenue  add column if not exists updated_at        timestamptz not null default now();

alter table shareholders add column if not exists role        text;
alter table shareholders add column if not exists bio         text;
alter table shareholders add column if not exists photo_url   text;
alter table shareholders add column if not exists email       text;
alter table shareholders add column if not exists phone       text;
alter table shareholders add column if not exists nationality text;
alter table shareholders add column if not exists joined_date date;
alter table shareholders add column if not exists hour_rate   numeric(10,2);
alter table shareholders add column if not exists user_id     uuid references auth.users(id) on delete set null;
alter table shareholders add column if not exists active      boolean not null default true;
alter table shareholders add column if not exists updated_at  timestamptz not null default now();

alter table founding_contributions add column if not exists shareholder_id uuid references shareholders(id) on delete set null;
alter table shareholder_work       add column if not exists shareholder_id uuid references shareholders(id) on delete set null;

-- Link legacy rows (free-text partner names) to partner records by name.
update founding_contributions f set shareholder_id = s.id
from shareholders s
where f.shareholder_id is null and s.organization_id = f.organization_id and lower(trim(s.name)) = lower(trim(f.shareholder));
update shareholder_work w set shareholder_id = s.id
from shareholders s
where w.shareholder_id is null and s.organization_id = w.organization_id and lower(trim(s.name)) = lower(trim(w.shareholder));

alter table todos      add column if not exists assignee_user_id uuid references auth.users(id) on delete set null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'todos_assignee_profile_fkey') then
    alter table todos add constraint todos_assignee_profile_fkey foreign key (assignee_user_id) references profiles(id) on delete set null;
  end if;
end $$;
alter table complaints add column if not exists room_id          uuid references rooms(id) on delete set null;
alter table complaints add column if not exists updated_at       timestamptz not null default now();
alter table staff_hours add column if not exists updated_at      timestamptz not null default now();
alter table founding_contributions add column if not exists updated_at timestamptz not null default now();
alter table shareholder_work       add column if not exists updated_at timestamptz not null default now();
alter table shareholder_meetings   add column if not exists updated_at timestamptz not null default now();

-- Stored credentials: ciphertext only (AES-256-GCM, key held by the app server).
alter table web_credentials add column if not exists password_enc text;

-- Scoped unique constraints (replace the global ones from 0001)
alter table rooms drop constraint if exists rooms_number_key;
create unique index if not exists rooms_property_number_key on rooms (property_id, number);

alter table guests drop constraint if exists guests_unique_booking;
create unique index if not exists guests_unique_booking_idx on guests (property_id, guest_name, room, check_in, check_out);

alter table budget_room_setup drop constraint if exists budget_room_setup_year_room_name_key;
create unique index if not exists budget_room_setup_property_year_room_key on budget_room_setup (property_id, year, room_name);

-- -----------------------------------------------------------------------------
-- 4. Helper functions (security definer, used by policies and the app)
-- -----------------------------------------------------------------------------

create or replace function app_is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.organization_id = p_org and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function app_user_orgs()
returns setof uuid language sql stable security definer set search_path = public as $$
  select organization_id from memberships where user_id = auth.uid() and status = 'active';
$$;

create or replace function app_has_perm(p_org uuid, p_module text, p_action text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select (r.permissions -> p_module ->> p_action)::boolean
    from memberships m join org_roles r on r.id = m.role_id
    where m.organization_id = p_org and m.user_id = auth.uid() and m.status = 'active'
  ), false);
$$;

-- Set of organisations in which the caller has <module>.<action>. Used in
-- policies as "organization_id in (select app_orgs_with_perm(...))" so that
-- Postgres evaluates it once per statement.
create or replace function app_orgs_with_perm(p_module text, p_action text)
returns setof uuid language sql stable security definer set search_path = public as $$
  select m.organization_id
  from memberships m join org_roles r on r.id = m.role_id
  where m.user_id = auth.uid() and m.status = 'active'
    and coalesce((r.permissions -> p_module ->> p_action)::boolean, false);
$$;

-- Users who share at least one organisation with the caller (for team lists).
create or replace function app_coworker_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct m2.user_id
  from memberships m1 join memberships m2 on m2.organization_id = m1.organization_id
  where m1.user_id = auth.uid() and m1.status = 'active';
$$;

-- Organisation id encoded in a storage path "org/<uuid>/<module>/<file>".
create or replace function app_storage_org(p_name text)
returns uuid language sql immutable as $$
  select case
    when (storage.foldername(p_name))[1] = 'org'
     and (storage.foldername(p_name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (storage.foldername(p_name))[2]::uuid
    else null end;
$$;

create or replace function app_slugify(p_text text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- Role templates. Module keys must match lib/modules.ts in the app.
create or replace function app_role_template(p_role text)
returns jsonb language plpgsql immutable as $$
declare
  modules text[] := array[
    'overview','gm_dashboard','shareholder_dashboard',
    'guests','occupancy','rooms','expenses','revenue','accounts','legal','budget',
    'founding','shareholder_work','shareholder_profiles','shareholder_meetings',
    'tasks','staff_hours','complaints','documents','logins','settings'
  ];
  m text;
  result jsonb := '{}'::jsonb;
  p jsonb;
  perm_full jsonb := '{"view":true,"add":true,"edit":true,"delete":true}'::jsonb;
  perm_edit jsonb := '{"view":true,"add":true,"edit":true,"delete":false}'::jsonb;
  perm_view jsonb := '{"view":true,"add":false,"edit":false,"delete":false}'::jsonb;
  perm_none jsonb := '{"view":false,"add":false,"edit":false,"delete":false}'::jsonb;
begin
  foreach m in array modules loop
    p := case p_role
      when 'Owner' then perm_full
      when 'Manager' then
        case when m = 'settings' then perm_view else perm_full end
      when 'Finance' then
        case when m in ('expenses','revenue','accounts','legal','budget','founding','overview') then perm_full
             when m in ('settings','logins') then perm_none
             else perm_view end
      when 'Legal' then
        case when m = 'legal' then perm_edit
             when m in ('revenue','expenses','documents') then perm_view
             else perm_none end
      when 'Partner' then
        case when m in ('shareholder_dashboard','founding','shareholder_work','shareholder_profiles','shareholder_meetings','budget','tasks') then perm_edit
             when m in ('settings','logins') then perm_none
             else perm_view end
      when 'Staff' then
        case when m in ('guests','tasks','complaints','rooms','occupancy','gm_dashboard') then perm_edit
             else perm_none end
      else -- Viewer
        case when m in ('settings','logins') then perm_none else perm_view end
    end;
    result := result || jsonb_build_object(m, p);
  end loop;
  return result;
end $$;

create or replace function app_default_org_settings(p_currency text default 'THB')
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'base_currency', coalesce(p_currency, 'THB'),
    'display_currencies', case when coalesce(p_currency,'THB') = 'EUR' then '["USD"]'::jsonb else '["EUR","USD"]'::jsonb end,
    'vat_rate', 7,
    'prices_include_vat', true,
    'invoice', jsonb_build_object(
      'prefix', 'INV', 'company_name', '', 'address', '', 'tax_id', '', 'branch', '',
      'email', '', 'phone', '', 'signatory', '', 'footer', 'Thank you for staying with us.', 'logo_path', null
    ),
    'categories', jsonb_build_object(
      'expense',          '["Rent","Legal","Staff","Utilities","Maintenance","Marketing","Operations","Other"]'::jsonb,
      'booking_source',   '["Direct Booking","Booking.com","Agoda","Airbnb","Expedia","Other"]'::jsonb,
      'revenue_source',   '["Direct Booking","Booking.com","Agoda","Airbnb","Expedia","Other Platform","Other Income"]'::jsonb,
      'task_department',  '["Legal","Finance","Operations","Renovation","HR","Marketing"]'::jsonb,
      'task_project',     '["General"]'::jsonb,
      'staff_department', '["Operations","Housekeeping","Reception","Maintenance","Kitchen","Management","Other"]'::jsonb,
      'complaint',        '["Cleanliness","Noise","Service","Amenities","Maintenance","Food & Beverage","Safety","Other"]'::jsonb,
      'document',         '["Legal","Tax","Insurance","Permits","Contracts","Banking","HR","Certificates","Logo","Project","Other"]'::jsonb,
      'inventory',        '["Furniture","Electronics","Bedding & Linen","Bathroom","Kitchen","Minibar","Safety","Decoration","Other"]'::jsonb
    ),
    'alerts', jsonb_build_object('fire_extinguisher_days', 30, 'arrivals_window_days', 7, 'departures_window_days', 7),
    'external_links', '[]'::jsonb,
    'partner_hour_rate', 200,
    'fiscal_year_start_month', 1
  );
$$;

-- -----------------------------------------------------------------------------
-- 5. RPC functions called by the app
-- -----------------------------------------------------------------------------

-- Creates an organisation with its first property, the seven role templates,
-- the caller as Owner, default accounts and payment methods.
create or replace function app_create_organization(
  p_name text,
  p_property_name text default null,
  p_timezone text default 'UTC',
  p_currency text default 'THB',
  p_settings jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_prop uuid;
  v_owner_role uuid;
  v_bank uuid;
  v_cash uuid;
  v_role text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Organisation name is required'; end if;

  -- make sure the caller has a profile row (memberships reference profiles)
  insert into profiles (id, email) values (v_uid, auth.jwt() ->> 'email') on conflict (id) do nothing;

  insert into organizations (name, slug, settings, created_by)
  values (trim(p_name),
          app_slugify(p_name) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6),
          app_default_org_settings(p_currency) || coalesce(p_settings, '{}'::jsonb),
          v_uid)
  returning id into v_org;

  insert into properties (organization_id, name, timezone)
  values (v_org, coalesce(nullif(trim(p_property_name), ''), trim(p_name)), coalesce(nullif(p_timezone, ''), 'UTC'))
  returning id into v_prop;

  foreach v_role in array array['Owner','Manager','Finance','Legal','Partner','Staff','Viewer'] loop
    insert into org_roles (organization_id, name, is_system, permissions)
    values (v_org, v_role, v_role = 'Owner', app_role_template(v_role));
  end loop;
  select id into v_owner_role from org_roles where organization_id = v_org and name = 'Owner';

  insert into memberships (organization_id, user_id, role_id, display_name)
  values (v_org, v_uid, v_owner_role, (select coalesce(nullif(full_name, ''), email) from profiles where id = v_uid));

  insert into accounts (organization_id, name, type, currency, sort) values (v_org, 'Bank', 'bank', p_currency, 1) returning id into v_bank;
  insert into accounts (organization_id, name, type, currency, sort) values (v_org, 'Cash', 'cash', p_currency, 2) returning id into v_cash;

  insert into payment_methods (organization_id, name, account_id, sort) values
    (v_org, 'Cash', v_cash, 1),
    (v_org, 'Bank Transfer', v_bank, 2),
    (v_org, 'Card', v_bank, 3),
    (v_org, 'Other', null, 9);

  return v_org;
end $$;

create or replace function app_invitation_preview(p_token uuid)
returns table (organization_name text, role_name text, email text, expires_at timestamptz, status text)
language sql stable security definer set search_path = public as $$
  select o.name, r.name, i.email, i.expires_at,
         case when i.status = 'pending' and i.expires_at < now() then 'expired' else i.status end
  from invitations i
  join organizations o on o.id = i.organization_id
  join org_roles r on r.id = i.role_id
  where i.token = p_token;
$$;

create or replace function app_accept_invitation(p_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  inv invitations%rowtype;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into inv from invitations where token = p_token;
  if not found then raise exception 'Invitation not found'; end if;
  if inv.status <> 'pending' then raise exception 'Invitation is no longer valid'; end if;
  if inv.expires_at < now() then raise exception 'Invitation has expired'; end if;
  if lower(inv.email) <> v_email then raise exception 'This invitation was sent to a different email address'; end if;

  insert into profiles (id, email) values (auth.uid(), v_email) on conflict (id) do nothing;

  insert into memberships (organization_id, user_id, role_id, display_name)
  values (inv.organization_id, auth.uid(), inv.role_id,
          (select coalesce(nullif(full_name, ''), email) from profiles where id = auth.uid()))
  on conflict (organization_id, user_id) do update set role_id = excluded.role_id, status = 'active', updated_at = now();

  update invitations set status = 'accepted', accepted_at = now() where id = inv.id;
  return inv.organization_id;
end $$;

-- Next sequential invoice number for an organisation and year (row-locked upsert).
create or replace function app_next_invoice_seq(p_org uuid, p_year int)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if not app_has_perm(p_org, 'guests', 'add') and not app_has_perm(p_org, 'revenue', 'add') then
    raise exception 'Not allowed';
  end if;
  insert into invoice_counters (organization_id, year, last_number) values (p_org, p_year, 1)
  on conflict (organization_id, year) do update set last_number = invoice_counters.last_number + 1
  returning last_number into v;
  return v;
end $$;

-- Danger zone: wipe business data of one organisation (keeps settings, team, rooms).
create or replace function app_reset_organization_data(p_org uuid, p_tables text[])
returns void language plpgsql security definer set search_path = public as $$
declare
  allowed text[] := array['guests','expenses','revenue','founding_contributions','shareholder_work','todos',
                          'budget_rent','budget_revenue','budget_expenses','budget_room_setup','complaints',
                          'staff_hours','shareholder_meetings','company_documents','account_movements','invoices'];
  t text;
begin
  if not app_has_perm(p_org, 'settings', 'delete') then raise exception 'Not allowed'; end if;
  foreach t in array p_tables loop
    if not (t = any(allowed)) then raise exception 'Table % cannot be reset', t; end if;
    execute format('delete from %I where organization_id = $1', t) using p_org;
  end loop;
end $$;

revoke execute on function app_create_organization(text, text, text, text, jsonb) from anon, public;
revoke execute on function app_accept_invitation(uuid) from anon, public;
revoke execute on function app_next_invoice_seq(uuid, int) from anon, public;
revoke execute on function app_reset_organization_data(uuid, text[]) from anon, public;
grant execute on function app_create_organization(text, text, text, text, jsonb) to authenticated;
grant execute on function app_accept_invitation(uuid) to authenticated;
grant execute on function app_next_invoice_seq(uuid, int) to authenticated;
grant execute on function app_reset_organization_data(uuid, text[]) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Triggers: profiles, updated_at, revenue sync, ledger sync, audit
-- -----------------------------------------------------------------------------

create or replace function app_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
          new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(profiles.full_name, excluded.full_name),
        updated_at = now();
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function app_handle_new_user();

create or replace function app_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
      and table_name in (
        'organizations','properties','profiles','org_roles','memberships','accounts','payment_methods',
        'rooms','room_inventory','room_fire_extinguishers','guests','revenue','expenses','shareholders',
        'founding_contributions','shareholder_work','shareholder_meetings','todos','staff_hours',
        'complaints','company_documents','web_credentials','role_permissions'
      )
  loop
    execute format('drop trigger if exists set_updated_at on %I', t);
    execute format('create trigger set_updated_at before update on %I for each row execute function app_set_updated_at()', t);
  end loop;
end $$;

-- Guest -> Revenue: exactly one revenue row per booking flagged add_to_revenue,
-- dated by check-out, valued at Total Stay. Manual revenue rows are never touched.
create or replace function app_guest_revenue_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.add_to_revenue then
    insert into revenue (organization_id, property_id, guest_id, date, type, supplier, amount_thb, notes, file_url, show_on_legal, created_by)
    values (new.organization_id, new.property_id, new.id, new.check_out,
            coalesce(nullif(new.booking_source, ''), 'Direct Booking'),
            new.guest_name, coalesce(new.amount_thb_stay, 0), new.notes, new.file_url, new.show_on_legal, new.created_by)
    on conflict (guest_id) do update set
      organization_id = excluded.organization_id,
      property_id     = excluded.property_id,
      date            = excluded.date,
      type            = excluded.type,
      supplier        = excluded.supplier,
      amount_thb      = excluded.amount_thb,
      notes           = excluded.notes,
      file_url        = excluded.file_url,
      show_on_legal   = excluded.show_on_legal;
  else
    delete from revenue where guest_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists guests_revenue_sync on guests;
create trigger guests_revenue_sync
  after insert or update on guests
  for each row execute function app_guest_revenue_sync();

-- Guest payments -> ledger. One movement per dated split payment when any are
-- filled, otherwise one movement for the amount paid, on the payment method's account.
create or replace function app_guest_ledger_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_account uuid;
  v_split numeric;
  v_label text;
begin
  if tg_op = 'DELETE' then
    delete from account_movements where source_table = 'guests' and source_id = old.id;
    return old;
  end if;

  delete from account_movements where source_table = 'guests' and source_id = new.id;

  select account_id into v_account from payment_methods where id = new.payment_method_id;
  if v_account is null then return new; end if;

  v_label := 'Guest payment: ' || new.guest_name || ' (room ' || coalesce(new.room::text, '?') || ')';
  v_split := coalesce(new.payment_1_amount, 0) + coalesce(new.payment_2_amount, 0) + coalesce(new.payment_3_amount, 0);

  if v_split > 0 then
    if coalesce(new.payment_1_amount, 0) <> 0 then
      insert into account_movements (organization_id, account_id, amount, occurred_on, description, source_table, source_id, created_by)
      values (new.organization_id, v_account, new.payment_1_amount, coalesce(new.payment_1_date, new.check_in), v_label, 'guests', new.id, new.created_by);
    end if;
    if coalesce(new.payment_2_amount, 0) <> 0 then
      insert into account_movements (organization_id, account_id, amount, occurred_on, description, source_table, source_id, created_by)
      values (new.organization_id, v_account, new.payment_2_amount, coalesce(new.payment_2_date, new.check_in), v_label, 'guests', new.id, new.created_by);
    end if;
    if coalesce(new.payment_3_amount, 0) <> 0 then
      insert into account_movements (organization_id, account_id, amount, occurred_on, description, source_table, source_id, created_by)
      values (new.organization_id, v_account, new.payment_3_amount, coalesce(new.payment_3_date, new.check_in), v_label, 'guests', new.id, new.created_by);
    end if;
  elsif coalesce(new.payment, 0) <> 0 then
    insert into account_movements (organization_id, account_id, amount, occurred_on, description, source_table, source_id, created_by)
    values (new.organization_id, v_account, new.payment, new.check_in, v_label, 'guests', new.id, new.created_by);
  end if;
  return new;
end $$;

drop trigger if exists guests_ledger_sync on guests;
create trigger guests_ledger_sync
  after insert or update or delete on guests
  for each row execute function app_guest_ledger_sync();

-- Expenses -> ledger (negative movement in base currency). Deleting an expense
-- removes its movement, which fixes the "delete does not reverse" bug.
create or replace function app_expense_ledger_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_account uuid;
  v_base text;
  v_amount numeric;
begin
  if tg_op = 'DELETE' then
    delete from account_movements where source_table = 'expenses' and source_id = old.id;
    return old;
  end if;

  delete from account_movements where source_table = 'expenses' and source_id = new.id;

  select account_id into v_account from payment_methods where id = new.payment_method_id;
  if v_account is null then return new; end if;

  select coalesce(settings ->> 'base_currency', 'THB') into v_base from organizations where id = new.organization_id;
  v_amount := coalesce(new.amount_base,
                       case when coalesce(upper(new.currency), v_base) = v_base then new.amount else null end);
  if v_amount is null or v_amount = 0 then return new; end if;

  insert into account_movements (organization_id, account_id, amount, occurred_on, description, source_table, source_id, created_by)
  values (new.organization_id, v_account, -abs(v_amount), coalesce(new.payment_date, current_date),
          'Expense: ' || coalesce(new.supplier, new.description, new.transaction_number, ''),
          'expenses', new.id, new.created_by);
  return new;
end $$;

drop trigger if exists expenses_ledger_sync on expenses;
create trigger expenses_ledger_sync
  after insert or update or delete on expenses
  for each row execute function app_expense_ledger_sync();

-- Audit log (secrets stripped)
create or replace function app_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb; v_new jsonb; v_org uuid; v_id uuid;
begin
  if tg_op <> 'INSERT' then v_old := to_jsonb(old) - 'password_enc' - 'password'; end if;
  if tg_op <> 'DELETE' then v_new := to_jsonb(new) - 'password_enc' - 'password'; end if;
  v_org := coalesce((v_new ->> 'organization_id')::uuid, (v_old ->> 'organization_id')::uuid);
  v_id  := coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid);
  insert into audit_log (organization_id, table_name, row_id, action, actor, old_data, new_data)
  values (v_org, tg_table_name, v_id, tg_op, auth.uid(), v_old, v_new);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','properties','org_roles','memberships','accounts','payment_methods','account_movements',
    'rooms','guests','revenue','expenses','invoices','shareholders','founding_contributions','shareholder_work',
    'todos','staff_hours','complaints','company_documents','web_credentials',
    'budget_revenue','budget_expenses','budget_rent','budget_room_setup'
  ] loop
    execute format('drop trigger if exists audit_changes on %I', t);
    execute format('create trigger audit_changes after insert or update or delete on %I for each row execute function app_audit()', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 7. Views
-- -----------------------------------------------------------------------------

create or replace view account_balances_v as
  select a.id, a.organization_id, a.name, a.type, a.currency, a.opening_balance, a.notes, a.active, a.sort,
         a.created_at, a.updated_at,
         a.opening_balance + coalesce(sum(m.amount), 0) as balance,
         max(m.created_at) as last_movement_at,
         count(m.id) as movement_count
  from accounts a
  left join account_movements m on m.account_id = a.id
  group by a.id;
alter view account_balances_v set (security_invoker = on);

-- -----------------------------------------------------------------------------
-- 8. Row-level security
-- -----------------------------------------------------------------------------

-- 8a. Business tables: one module per table, four actions.
do $$
declare
  r record;
  pol text;
begin
  for r in
    select * from (values
      ('rooms','rooms'), ('room_photos','rooms'), ('room_inventory','rooms'), ('room_fire_extinguishers','rooms'),
      ('guests','guests'), ('invoices','guests'),
      ('revenue','revenue'),
      ('expenses','expenses'),
      ('accounts','accounts'), ('account_movements','accounts'),
      ('shareholders','shareholder_profiles'),
      ('founding_contributions','founding'),
      ('shareholder_work','shareholder_work'),
      ('shareholder_meetings','shareholder_meetings'),
      ('todos','tasks'),
      ('staff_hours','staff_hours'),
      ('complaints','complaints'),
      ('company_documents','documents'),
      ('web_credentials','logins'),
      ('budget_revenue','budget'), ('budget_expenses','budget'), ('budget_rent','budget'), ('budget_room_setup','budget')
    ) as v(tbl, module)
  loop
    execute format('alter table %I enable row level security', r.tbl);

    pol := r.tbl || '_select';
    execute format('drop policy if exists %I on %I', pol, r.tbl);
    execute format('create policy %I on %I for select to authenticated using (organization_id in (select app_orgs_with_perm(%L, %L)))', pol, r.tbl, r.module, 'view');

    pol := r.tbl || '_insert';
    execute format('drop policy if exists %I on %I', pol, r.tbl);
    execute format('create policy %I on %I for insert to authenticated with check (organization_id in (select app_orgs_with_perm(%L, %L)))', pol, r.tbl, r.module, 'add');

    pol := r.tbl || '_update';
    execute format('drop policy if exists %I on %I', pol, r.tbl);
    execute format('create policy %I on %I for update to authenticated using (organization_id in (select app_orgs_with_perm(%L, %L))) with check (organization_id in (select app_orgs_with_perm(%L, %L)))', pol, r.tbl, r.module, 'edit', r.module, 'edit');

    pol := r.tbl || '_delete';
    execute format('drop policy if exists %I on %I', pol, r.tbl);
    execute format('create policy %I on %I for delete to authenticated using (organization_id in (select app_orgs_with_perm(%L, %L)))', pol, r.tbl, r.module, 'delete');
  end loop;
end $$;

-- Legal reviewers may update review fields on expenses even without expenses.edit
drop policy if exists expenses_legal_review on expenses;
create policy expenses_legal_review on expenses for update to authenticated
  using (is_legal and organization_id in (select app_orgs_with_perm('legal', 'edit')))
  with check (is_legal and organization_id in (select app_orgs_with_perm('legal', 'edit')));

-- Legal viewers can read shared expenses, flagged bookings and flagged manual revenue
drop policy if exists expenses_legal_select on expenses;
create policy expenses_legal_select on expenses for select to authenticated
  using (is_legal and organization_id in (select app_orgs_with_perm('legal', 'view')));
drop policy if exists guests_legal_select on guests;
create policy guests_legal_select on guests for select to authenticated
  using (show_on_legal and organization_id in (select app_orgs_with_perm('legal', 'view')));
drop policy if exists revenue_legal_select on revenue;
create policy revenue_legal_select on revenue for select to authenticated
  using (show_on_legal and organization_id in (select app_orgs_with_perm('legal', 'view')));

-- Dashboards and forms need read access across modules. Grant select to members
-- who can view the module that reads the table.
do $$
declare r record; pol text;
begin
  for r in
    select * from (values
      ('guests','overview'), ('guests','gm_dashboard'), ('guests','shareholder_dashboard'), ('guests','occupancy'), ('guests','rooms'),
      ('revenue','overview'), ('revenue','gm_dashboard'), ('revenue','shareholder_dashboard'), ('revenue','budget'),
      ('expenses','overview'), ('expenses','gm_dashboard'), ('expenses','shareholder_dashboard'), ('expenses','budget'),
      ('founding_contributions','overview'), ('founding_contributions','shareholder_dashboard'), ('founding_contributions','shareholder_profiles'),
      ('shareholder_work','shareholder_profiles'),
      ('accounts','overview'), ('accounts','gm_dashboard'), ('accounts','shareholder_dashboard'),
      ('account_movements','overview'), ('account_movements','gm_dashboard'), ('account_movements','shareholder_dashboard'),
      ('todos','overview'), ('todos','gm_dashboard'),
      ('shareholders','shareholder_dashboard'), ('shareholders','founding'), ('shareholders','shareholder_work'),
      ('shareholders','shareholder_meetings'), ('shareholders','expenses'), ('shareholders','tasks'),
      ('budget_revenue','shareholder_dashboard'), ('budget_expenses','shareholder_dashboard'),
      ('rooms','guests'), ('rooms','occupancy'), ('rooms','complaints'), ('rooms','budget'),
      ('rooms','gm_dashboard'), ('rooms','overview'), ('rooms','shareholder_dashboard'),
      ('room_fire_extinguishers','gm_dashboard')
    ) as v(tbl, module)
  loop
    pol := r.tbl || '_read_via_' || r.module;
    execute format('drop policy if exists %I on %I', pol, r.tbl);
    execute format('create policy %I on %I for select to authenticated using (organization_id in (select app_orgs_with_perm(%L, %L)))', pol, r.tbl, r.module, 'view');
  end loop;
end $$;

-- 8b. Tenancy tables
alter table organizations enable row level security;
drop policy if exists organizations_select on organizations;
create policy organizations_select on organizations for select to authenticated using (id in (select app_user_orgs()));
drop policy if exists organizations_update on organizations;
create policy organizations_update on organizations for update to authenticated
  using (id in (select app_orgs_with_perm('settings', 'edit'))) with check (id in (select app_orgs_with_perm('settings', 'edit')));
drop policy if exists organizations_delete on organizations;
create policy organizations_delete on organizations for delete to authenticated using (id in (select app_orgs_with_perm('settings', 'delete')));
-- insert only through app_create_organization()

alter table properties enable row level security;
drop policy if exists properties_select on properties;
create policy properties_select on properties for select to authenticated using (organization_id in (select app_user_orgs()));
drop policy if exists properties_write on properties;
create policy properties_write on properties for all to authenticated
  using (organization_id in (select app_orgs_with_perm('settings', 'edit'))) with check (organization_id in (select app_orgs_with_perm('settings', 'edit')));

alter table profiles enable row level security;
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated using (id = auth.uid() or id in (select app_coworker_ids()));
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert to authenticated with check (id = auth.uid());

alter table org_roles enable row level security;
drop policy if exists org_roles_select on org_roles;
create policy org_roles_select on org_roles for select to authenticated using (organization_id in (select app_user_orgs()));
drop policy if exists org_roles_write on org_roles;
create policy org_roles_write on org_roles for all to authenticated
  using (organization_id in (select app_orgs_with_perm('settings', 'edit'))) with check (organization_id in (select app_orgs_with_perm('settings', 'edit')));

alter table memberships enable row level security;
drop policy if exists memberships_select on memberships;
create policy memberships_select on memberships for select to authenticated using (user_id = auth.uid() or organization_id in (select app_user_orgs()));
drop policy if exists memberships_write on memberships;
create policy memberships_write on memberships for all to authenticated
  using (organization_id in (select app_orgs_with_perm('settings', 'edit'))) with check (organization_id in (select app_orgs_with_perm('settings', 'edit')));

alter table invitations enable row level security;
drop policy if exists invitations_all on invitations;
create policy invitations_all on invitations for all to authenticated
  using (organization_id in (select app_orgs_with_perm('settings', 'edit'))) with check (organization_id in (select app_orgs_with_perm('settings', 'edit')));

alter table payment_methods enable row level security;
drop policy if exists payment_methods_select on payment_methods;
create policy payment_methods_select on payment_methods for select to authenticated using (organization_id in (select app_user_orgs()));
drop policy if exists payment_methods_write on payment_methods;
create policy payment_methods_write on payment_methods for all to authenticated
  using (organization_id in (select app_orgs_with_perm('settings', 'edit'))) with check (organization_id in (select app_orgs_with_perm('settings', 'edit')));

alter table audit_log enable row level security;
drop policy if exists audit_log_select on audit_log;
create policy audit_log_select on audit_log for select to authenticated using (organization_id in (select app_orgs_with_perm('settings', 'view')));

alter table invoice_counters enable row level security;  -- function access only

alter table exchange_rates enable row level security;
drop policy if exists exchange_rates_select on exchange_rates;
create policy exchange_rates_select on exchange_rates for select to authenticated using (true);
-- writes: service role only (the FX refresh route)

-- 8c. Legacy tables from 0001: locked.
alter table users                enable row level security;
alter table role_permissions     enable row level security;
alter table bank_balances        enable row level security;
alter table shareholder_profiles enable row level security;
alter table account_balances     enable row level security;

-- -----------------------------------------------------------------------------
-- 9. Storage: one private bucket, per-tenant prefixes "org/<org_id>/<module>/..."
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('tenant-files', 'tenant-files', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists tenant_files_select on storage.objects;
create policy tenant_files_select on storage.objects for select to authenticated
  using (bucket_id = 'tenant-files' and app_is_member(app_storage_org(name)));
drop policy if exists tenant_files_insert on storage.objects;
create policy tenant_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'tenant-files' and app_is_member(app_storage_org(name)));
drop policy if exists tenant_files_update on storage.objects;
create policy tenant_files_update on storage.objects for update to authenticated
  using (bucket_id = 'tenant-files' and app_is_member(app_storage_org(name)));
drop policy if exists tenant_files_delete on storage.objects;
create policy tenant_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'tenant-files' and app_is_member(app_storage_org(name)));

-- -----------------------------------------------------------------------------
-- 10. Grants (Supabase default privileges normally cover new tables; be explicit)
-- -----------------------------------------------------------------------------
grant usage on schema public to authenticated, anon, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant select on account_balances_v to authenticated, service_role;
revoke all on users, role_permissions, bank_balances, shareholder_profiles, account_balances, invoice_counters from anon;
grant usage, select on all sequences in schema public to authenticated, service_role;

notify pgrst, 'reload schema';
