-- Credential vault for company website / service logins.
-- Passwords are stored as text — Supabase columns are encrypted at rest, but values
-- are reversible by anyone with database access. Treat this as a shared password
-- manager for the team, not a high-security secrets store.

create table if not exists web_credentials (
  id uuid primary key default gen_random_uuid(),
  service_name text not null,
  url text,
  username text,
  password text,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists web_credentials_service_idx on web_credentials(service_name);
