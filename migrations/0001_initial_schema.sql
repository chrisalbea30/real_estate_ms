-- =============================================================================
-- 0001_initial_schema.sql
-- Consolidated DATABASE STRUCTURE of the source property-management system.
--
-- Derived from the source system at commit 9437ed4 (10 October 2026). Every
-- incremental ALTER from the original migration files has been folded into the
-- final CREATE TABLE statements below.
--
-- Structure only:
--   * no seed rows, no data, no names, no credentials
--   * no storage objects (the app also needs a Storage bucket, see the end)
--   * the source system's "disable row level security / grant all to anon"
--     statements are NOT applied; they are listed, commented out, at the end
--
-- Idempotent: safe to run on an empty database or re-run on an existing one.
-- Requires the pgcrypto/gen_random_uuid() that Supabase provides by default.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Authentication and authorisation
-- -----------------------------------------------------------------------------

-- Application users. Custom auth: bcrypt hash, free-text role.
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  display_name  text not null,
  role          text not null,              -- Admin | General Manager | Shareholder | Lawyer | Accountant | Staff
  password_hash text not null,
  created_at    timestamptz default now()
);

-- Role x module permission matrix. A missing row means "allowed" in the app.
create table if not exists role_permissions (
  id          uuid primary key default gen_random_uuid(),
  role        text not null,
  module      text not null,                -- overview, shareholder_dashboard, gm_dashboard, guests, occupancy,
                                            -- rooms, expenses, revenue, founding, shareholder_work, tasks, budget,
                                            -- shareholder_profiles, shareholder_meetings, staff_hours, legal,
                                            -- documents, logins, complaints
  can_view    boolean not null default true,
  can_add     boolean not null default true,
  can_edit    boolean not null default true,
  can_delete  boolean not null default true,
  updated_at  timestamptz not null default now(),
  unique (role, module)
);


-- -----------------------------------------------------------------------------
-- 2. Rooms
-- -----------------------------------------------------------------------------

create table if not exists rooms (
  id         uuid primary key default gen_random_uuid(),
  number     int  not null,
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (number)
);

create table if not exists room_photos (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references rooms(id) on delete cascade,
  url        text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists room_photos_room_id_idx on room_photos (room_id);

create table if not exists room_inventory (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references rooms(id) on delete cascade,
  name       text not null,
  category   text not null default 'General',
  quantity   int  not null default 1,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists room_inventory_room_id_idx on room_inventory (room_id);

create table if not exists room_fire_extinguishers (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references rooms(id) on delete cascade,
  location       text not null default 'Room',
  serial_number  text,
  expiry_date    date not null,
  last_inspected date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists room_fire_extinguishers_room_id_idx on room_fire_extinguishers (room_id);
create index if not exists room_fire_extinguishers_expiry_idx  on room_fire_extinguishers (expiry_date);


-- -----------------------------------------------------------------------------
-- 3. Guests and revenue (the Guest -> Revenue -> Legal flow)
-- -----------------------------------------------------------------------------

create table if not exists guests (
  id               uuid primary key default gen_random_uuid(),
  date             date,                     -- legacy, unused by the UI
  room             integer not null,         -- room NUMBER; no foreign key in the source system
  check_in         date not null,
  check_out        date not null,
  guest_name       text not null,
  guest_count      integer default 1,
  amount_thb_day   numeric,
  amount_thb_stay  numeric,                  -- Total Stay; the revenue amount
  paid             text,                     -- payment METHOD (misnamed)
  payment          numeric default 0,        -- amount paid; equals the sum of split payments when filled
  invoice          text,                     -- legacy, unused
  notes            text,
  email            text,
  phone            text,
  tm30             boolean default false,
  passport_number  text,
  passport_expiry  date,
  show_on_legal    boolean not null default false,
  payment_1_date   date,
  payment_1_amount numeric,
  payment_2_date   date,
  payment_2_amount numeric,
  payment_3_date   date,
  payment_3_amount numeric,
  booking_source   text,                     -- Direct Booking | Booking.com | Agoda | Other
  add_to_revenue   boolean not null default false,
  file_url         text,
  created_at       timestamptz default now(),
  constraint guests_unique_booking unique (guest_name, room, check_in, check_out)
);

-- Single source of truth for revenue. Rows with guest_id were created from a
-- booking (one per booking, dated by check-out); rows without are manual.
create table if not exists revenue (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  type          text,                        -- Type / Source
  supplier      text,                        -- Description (guest name for guest rows)
  amount_thb    numeric,
  notes         text,
  guest_id      uuid references guests(id) on delete cascade,
  file_url      text,
  show_on_legal boolean not null default false,
  created_at    timestamptz default now()
);
create unique index if not exists revenue_guest_id_key on revenue (guest_id);


-- -----------------------------------------------------------------------------
-- 4. Expenses and legal review
-- -----------------------------------------------------------------------------

create table if not exists expenses (
  id                 uuid primary key default gen_random_uuid(),
  audit              text,                   -- To check | Checked | YES
  lawyers            text,                   -- legacy spreadsheet column
  sent               date,                   -- legacy spreadsheet column
  to_verify          text,                   -- legacy spreadsheet column
  payment_date       date,
  transaction_number text,
  document_number    text,
  category           text,
  subcategory        text,
  supplier           text,
  amount             numeric,
  currency           text default 'THB',
  method             text,
  paid_by            text,
  internal_document  text,                   -- legacy
  document_page      text,                   -- legacy
  type               text,
  description        text,
  is_legal           boolean default false,  -- "Shared with Legal"
  legal_status       text default 'Pending', -- Pending | Accepted | Clarification Needed | Rejected
  legal_notes        text,
  legal_reviewed_at  date,
  file_url           text,
  created_at         timestamptz default now()
);


-- -----------------------------------------------------------------------------
-- 5. Shareholders / partners
-- -----------------------------------------------------------------------------

create table if not exists shareholders (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  share_percentage    numeric,
  amount_to_found_thb numeric,
  created_at          timestamptz default now()
);

create table if not exists founding_contributions (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  method      text,
  shareholder text not null,                 -- free text, no FK
  amount_thb  numeric,
  amount_eur  numeric,
  notes       text,
  created_at  timestamptz default now()
);

create table if not exists shareholder_work (
  id          uuid primary key default gen_random_uuid(),
  month       date not null,                 -- stored as the first of the month
  shareholder text not null,
  hours       numeric default 0,
  hour_rate   numeric default 200,
  created_at  timestamptz default now()
);

create table if not exists shareholder_profiles (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  role          text not null,
  bio           text,
  ownership_pct numeric(5,2),
  photo_url     text,
  email         text,
  phone         text,
  nationality   text,
  joined_date   date,
  created_at    timestamptz default now()
);

create table if not exists shareholder_meetings (
  id           uuid primary key default gen_random_uuid(),
  meeting_date date not null,
  title        text not null,
  participants text[] default '{}',
  agenda       text,
  decisions    text,
  action_items text,
  attachments  jsonb default '[]',           -- [{ "name": "...", "url": "..." }]
  created_at   timestamptz default now()
);


-- -----------------------------------------------------------------------------
-- 6. Operations
-- -----------------------------------------------------------------------------

create table if not exists todos (
  id                 uuid primary key default gen_random_uuid(),
  project            text,
  department         text,
  topic              text not null,
  responsible_person text,
  status_notes       text,
  target_date        date,
  status             text default 'Pending', -- Pending | Ongoing | Complete | Blocked
  visible_to_gm      boolean not null default false,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table if not exists staff_hours (
  id              uuid primary key default gen_random_uuid(),
  staff_name      text not null,
  role            text,
  department      text,
  date            date not null,
  hours           numeric(5,2) not null,
  hourly_rate_thb numeric(10,2),
  notes           text,
  created_at      timestamptz default now()
);

create table if not exists complaints (
  id               uuid primary key default gen_random_uuid(),
  date             date not null,
  guest_name       text not null,
  room             integer,
  category         text,
  description      text not null,
  severity         text not null default 'Medium',  -- Low | Medium | High | Critical
  status           text not null default 'Open',    -- Open | In Progress | Resolved | Closed
  resolution_notes text,
  resolved_at      date,
  filed_by         text,
  created_at       timestamptz not null default now()
);

create table if not exists company_documents (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      text not null default 'Other',
  document_date date,
  file_url      text,
  notes         text,
  uploaded_by   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists company_documents_category_idx on company_documents (category);
create index if not exists company_documents_date_idx     on company_documents (document_date desc);

-- Stored third-party logins. In the source system the password column holds
-- PLAINTEXT. A rebuild must encrypt this or drop the feature.
create table if not exists web_credentials (
  id           uuid primary key default gen_random_uuid(),
  service_name text not null,
  url          text,
  username     text,
  password     text,
  notes        text,
  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists web_credentials_service_idx on web_credentials (service_name);


-- -----------------------------------------------------------------------------
-- 7. Budget
-- -----------------------------------------------------------------------------

create table if not exists budget_revenue (
  id         uuid primary key default gen_random_uuid(),
  year       integer not null,
  month      integer not null,
  room_name  text not null,
  amount_thb numeric default 0,
  season     text,
  created_at timestamptz default now()
);

create table if not exists budget_expenses (
  id           uuid primary key default gen_random_uuid(),
  year         integer not null,
  month        integer not null,
  category     text not null,
  subcategory  text,
  item_name    text not null,
  amount_thb   numeric default 0,
  expense_type text default 'OPEX',          -- OPEX | CAPEX
  created_at   timestamptz default now()
);

create table if not exists budget_rent (
  id          uuid primary key default gen_random_uuid(),
  year_number integer not null,
  year_label  text,
  rent_thb    numeric not null,
  vat_amount  numeric,
  created_at  timestamptz default now()
);

create table if not exists budget_room_setup (
  id                   uuid primary key default gen_random_uuid(),
  year                 integer not null,
  room_name            text not null,
  high_season_rate_thb numeric,
  low_season_rate_thb  numeric,
  target_occupancy_pct numeric(5,2),
  notes                text,
  unique (year, room_name)
);


-- -----------------------------------------------------------------------------
-- 8. Cash position and FX
-- -----------------------------------------------------------------------------

-- One row per account (Bank, Cash, Wise, Revolut, GM Bank in the source system).
-- Adjusted in place by guest payments and expenses; not a ledger.
create table if not exists account_balances (
  id           uuid primary key default gen_random_uuid(),
  account_type text unique not null,
  amount       numeric not null default 0,
  notes        text,
  updated_at   timestamptz default now()
);

-- Legacy predecessor of account_balances. Still present in the source schema,
-- never read or written by the current app.
create table if not exists bank_balances (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  amount        numeric not null,
  recorded_date date not null,
  status        text,
  notes         text,
  created_at    timestamptz default now()
);

create table if not exists exchange_rates (
  id             uuid primary key default gen_random_uuid(),
  base_currency  text not null default 'EUR',
  quote_currency text not null default 'THB',
  rate           numeric(12,6) not null,
  source         text not null default 'ECB',
  fetched_at     timestamptz not null default now(),
  unique (base_currency, quote_currency)
);


-- -----------------------------------------------------------------------------
-- 9. Outside this file
-- -----------------------------------------------------------------------------
-- * Storage: the app expects a Storage bucket named "dms-files" (public in the
--   source system) with folders expenses/, guests/, revenue/, documents/,
--   profiles/, rooms/, meetings/. Create it in the Supabase dashboard.
-- * Seed data the source system relies on (NOT included here, create per tenant):
--     rooms            -> one row per room (number, name)
--     account_balances -> one row per account type the payment methods map to
--     exchange_rates   -> one EUR/THB row (the app falls back to 37 without it)
--     shareholders     -> one row per partner with share_percentage
--     users            -> at least one Admin, created through the app, never by script
-- * role_permissions needs no rows: a missing row means "allowed".


-- -----------------------------------------------------------------------------
-- 10. What the SOURCE system does for access, deliberately NOT applied here
-- -----------------------------------------------------------------------------
-- The source app talks to Postgres from the browser with the public anon key,
-- with row-level security off and full grants to anon. Do not reproduce this in
-- a multi-tenant system. Kept only so the original behaviour is documented.
--
-- alter table expenses             disable row level security; grant all on expenses             to anon;
-- alter table shareholder_profiles disable row level security; grant all on shareholder_profiles to anon;
-- alter table shareholder_meetings disable row level security; grant all on shareholder_meetings to anon;
-- alter table staff_hours          disable row level security; grant all on staff_hours          to anon;
-- alter table account_balances     disable row level security; grant all on account_balances     to anon;
-- alter table budget_room_setup    disable row level security; grant all on budget_room_setup    to anon;
-- alter table exchange_rates       disable row level security; grant all on exchange_rates       to anon;
-- (all other tables rely on the project defaults; no policies exist anywhere)

-- notify pgrst, 'reload schema';
