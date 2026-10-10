-- Guest → Revenue → Legal → Shareholder Dashboard flow
-- Run once in the Supabase SQL editor BEFORE deploying the matching app version.
-- Safe to re-run: every statement is idempotent.

-- 1. Guests: booking source, "Add to Revenue" checkbox, attached document.
alter table guests
  add column if not exists booking_source text,
  add column if not exists add_to_revenue boolean not null default false,
  add column if not exists file_url text;

-- 2. Revenue: link back to the originating guest booking, attached document, "Show on Legal" flag.
--    Deleting a guest removes its auto-created revenue record.
alter table revenue
  add column if not exists guest_id uuid references guests(id) on delete cascade,
  add column if not exists file_url text,
  add column if not exists show_on_legal boolean not null default false;

-- 3. One revenue record per guest booking. This is what makes "tick the box again" a no-op
--    instead of a duplicate: the app upserts on guest_id.
create unique index if not exists revenue_guest_id_key on revenue (guest_id);

-- notify pgrst, 'reload schema';
