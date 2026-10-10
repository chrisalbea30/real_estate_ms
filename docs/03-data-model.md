# 03 — Data model

26 tables in one Postgres schema. Only four foreign keys exist (`room_photos`, `room_inventory`, `room_fire_extinguishers` → `rooms`; `revenue.guest_id` → `guests`). Everything else links by free text or integers. No views, functions, triggers or RLS policies. Column definitions below are copied from the SQL; the sanitised SQL itself is in [../reference/supabase-sql/](../reference/supabase-sql/).

## Relationship sketch

```
rooms ─┬─< room_photos
       ├─< room_inventory
       └─< room_fire_extinguishers
guests ──< revenue (guest_id, unique, cascade delete)      ← the only business FK
guests.room (int)  ~~ rooms.number           (no FK)
complaints.room    ~~ rooms.number           (no FK)
founding_contributions.shareholder, shareholder_work.shareholder,
  expenses.paid_by, todos.responsible_person, shareholder_meetings.participants[]
                   ~~ shareholders.name / SHAREHOLDERS constant   (no FK)
budget_revenue.room_name, budget_room_setup.room_name ~~ room names (no FK)
guests.paid, expenses.method ~~ PAYMENT_METHODS ~~ account_balances.account_type (code map)
users.role ~~ role_permissions.role (free text)
```

## Tables

### guests
Core booking record. `schema.sql`, altered by `guests_passport.sql`, `guests_show_on_legal.sql`, `guests_split_payments.sql`, `guests_unique_constraint.sql`, `guest_revenue_flow.sql`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK default gen_random_uuid() | |
| date | date | legacy, unused in UI |
| room | integer not null | room **number**, no FK |
| check_in, check_out | date not null | |
| guest_name | text not null | |
| guest_count | integer default 1 | not in UI |
| amount_thb_day | numeric | rate per night |
| amount_thb_stay | numeric | Total Stay; computed as day × nights when blank |
| paid | text | **payment method** (misnamed) |
| payment | numeric default 0 | amount paid; = sum of split payments when those are filled |
| invoice | text | legacy, unused |
| notes, email, phone | text | |
| tm30 | boolean default false | immigration notification filed |
| passport_number | text | |
| passport_expiry | date | |
| show_on_legal | boolean not null default false | appears on Legal page |
| payment_1_date / payment_1_amount … payment_3_* | date / numeric | up to 3 dated payments |
| booking_source | text | Direct Booking / Booking.com / Agoda / Other |
| add_to_revenue | boolean not null default false | drives the revenue row |
| file_url | text | attached document (public URL) |
| created_at | timestamptz default now() | |

Constraint `guests_unique_booking UNIQUE (guest_name, room, check_in, check_out)` (not idempotent; run `deduplicate_guests.sql` first on existing data).

### revenue
Single source of truth for revenue. `schema.sql`, altered by `guest_revenue_flow.sql`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| date | date not null | check-out date for guest rows |
| type | text | Type / Source (REVENUE_SOURCES or legacy free text) |
| supplier | text | Description (guest name for guest rows) |
| amount_thb | numeric | |
| notes | text | |
| guest_id | uuid references guests(id) on delete cascade | null for manual rows |
| file_url | text | |
| show_on_legal | boolean not null default false | |
| created_at | timestamptz | |

Unique index `revenue_guest_id_key (guest_id)` — one row per booking; the app upserts on it.

### expenses
`schema.sql` (re-declared identically in `legal_workflow.sql`), plus `expenses_file_url.sql`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| audit | text | To check / Checked / YES |
| lawyers, sent (date), to_verify | text/date | legacy spreadsheet columns, not in UI |
| payment_date | date | |
| transaction_number | text | auto "Expense 001" style |
| document_number | text | auto numeric string |
| category, subcategory | text | EXPENSE_CATEGORIES |
| supplier | text | |
| amount | numeric | sign not meaningful; UI uses abs() |
| currency | text default 'THB' | may be EUR |
| method | text | PAYMENT_METHODS |
| paid_by | text | PAYERS |
| internal_document, document_page | text | legacy |
| type, description | text | |
| is_legal | boolean default false | "Shared with Legal" |
| legal_status | text default 'Pending' | Pending / Accepted / Clarification Needed / Rejected |
| legal_notes | text | |
| legal_reviewed_at | date | |
| file_url | text | |
| created_at | timestamptz | |

RLS disabled, `grant all to anon`.

### founding_contributions
`id, date not null, method text, shareholder text not null, amount_thb numeric, amount_eur numeric, notes, created_at`. Shareholder is free text.

### shareholders
`id, name text not null, share_percentage numeric, amount_to_found_thb numeric, created_at`. Seeded with four rows at 25 % each (names replaced by placeholders in the reference SQL). No unique on `name`, so re-running the seed duplicates rows.

### shareholder_work
`id, month date not null (stored as YYYY-MM-01), shareholder text not null, hours numeric default 0, hour_rate numeric default 200, created_at`.

### todos
`id, project, department, topic text not null, responsible_person, status_notes, target_date date, status text default 'Pending', created_at, updated_at, visible_to_gm boolean not null default false`.

### budget_revenue
`id, year int not null, month int not null, room_name text not null, amount_thb numeric default 0, season text, created_at`.

### budget_expenses
`id, year, month, category text not null, subcategory, item_name text not null, amount_thb numeric default 0, expense_type text default 'OPEX' (OPEX|CAPEX), created_at`.

### budget_rent
`id, year_number int not null, year_label text, rent_thb numeric not null, vat_amount numeric, created_at`. The UI ignores `vat_amount` and computes 2.66 %.

### budget_room_setup
`id, year int, room_name text, high_season_rate_thb, low_season_rate_thb, target_occupancy_pct numeric(5,2), notes, unique(year, room_name)`. Reference only; feeds no calculation. RLS off, anon grant.

### bank_balances
`id, label, amount, recorded_date, status, notes, created_at`. **Dead table** — superseded by `account_balances`, never queried.

### account_balances
`id, account_type text unique not null, amount numeric not null default 0, notes, updated_at`. Seeded: Bank, Cash, Wise, Revolut, GM Bank at 0. Adjusted by guest payments and expenses; editable on the Overview. RLS off, anon grant.

### shareholder_profiles
`id, name, role text not null, bio, ownership_pct numeric(5,2), photo_url, email, phone, nationality, joined_date, created_at`. Not linked to `shareholders`. RLS off, anon grant.

### shareholder_meetings
`id, meeting_date date not null, title text not null, participants text[] default '{}', agenda, decisions, action_items, attachments jsonb default '[]' ([{name,url}]), created_at`. RLS off, anon grant.

### staff_hours
`id, staff_name text not null, role, department, date date not null, hours numeric(5,2) not null, hourly_rate_thb numeric(10,2), notes, created_at`. RLS off, anon grant.

### rooms
`id uuid PK, number int not null unique, name text not null, active boolean not null default true, created_at`. Seeded 1–10 as "Room N".

### room_photos
`id, room_id uuid not null references rooms(id) on delete cascade, url text not null, position int not null default 0, created_at`. Index on room_id. Max 5 per room (UI rule).

### room_inventory
`id, room_id FK cascade, name text not null, category text not null default 'General', quantity int not null default 1, notes, created_at, updated_at`. Index on room_id. UI categories: Furniture, Electronics, Bedding & Linen, Bathroom, Kitchen, Minibar, Safety, Decoration, Other.

### room_fire_extinguishers
`id, room_id FK cascade, location text not null default 'Room', serial_number, expiry_date date not null, last_inspected date, notes, created_at, updated_at`. Indexes on room_id and expiry_date.

### company_documents
`id, name text not null, category text not null default 'Other', document_date date, file_url, notes, uploaded_by, created_at, updated_at`. Indexes on category and document_date desc.

### complaints
`id, date date not null, guest_name text not null, room int, category, description text not null, severity text not null default 'Medium', status text not null default 'Open', resolution_notes, resolved_at date, filed_by, created_at`.

### exchange_rates
`id, base_currency text default 'EUR', quote_currency text default 'THB', rate numeric(12,6) not null, source text default 'ECB', fetched_at timestamptz default now(), unique(base_currency, quote_currency)`. Seeded EUR/THB 37.0 'seed'. RLS off, anon grant.

### role_permissions
`id, role text not null, module text not null, can_view/can_add/can_edit/can_delete boolean not null default true, updated_at, unique(role, module)`. **No seed rows; missing row = allow.**

### users
`id, username text unique not null, display_name text not null, role text not null, password_hash text not null, created_at`. Seeded by a Node script (`scripts/seed-users.js`) that contains plaintext default passwords — never carry that into the SaaS. Roles in use: Admin, General Manager, Shareholder, Lawyer, Accountant, Staff.

### web_credentials
`id, service_name text not null, url, username, password (plaintext), notes, created_by, created_at, updated_at`. Index on service_name.

## RLS summary

- RLS explicitly disabled + `grant all to anon`: expenses, shareholder_profiles, shareholder_meetings, staff_hours, account_balances, budget_room_setup, exchange_rates.
- No RLS statements (Supabase default; app still reads/writes them with anon): everything else.
- No policies anywhere.

## Consolidated migration

[../migrations/0001_initial_schema.sql](../migrations/0001_initial_schema.sql) creates the final structure of all 26 tables in one idempotent file: every column, key, unique constraint and index, with no seed rows and without the source system's anon grants (those are listed in a commented-out block). Use it to stand up a structurally identical empty database. The per-file history below is only needed to understand how the production database got there.

## Apply order for a fresh database (current system)

1. `users.sql`, then seed users with the script (rotate the passwords)
2. `schema.sql` (core tables + shareholder seed)
3. `legal_workflow.sql`, `expenses_file_url.sql`
4. `new_modules.sql`, then create the `dms-files` public bucket in the dashboard
5. `budget_setup.sql`, `exchange_rates.sql`, `account_balances.sql`, `role_permissions.sql`
6. `rooms.sql`, then `room_photos.sql`, `room_inventory.sql`, `room_fire_extinguishers.sql`
7. `complaints.sql`, `company_documents.sql`, `web_credentials.sql`, `todos_visible_to_gm.sql`
8. `guests_passport.sql`, `guests_show_on_legal.sql`, `guests_split_payments.sql`
9. `guests_unique_constraint.sql` (after `deduplicate_guests.sql` on existing data)
10. `guest_revenue_flow.sql`

Data-fix scripts, not schema: `deduplicate_guests.sql`, `rollback_guest_revenue_backfill.sql`, the backfill `update` inside `legal_workflow.sql`.

## Shared TypeScript types and constants (`types/index.ts`)

Interfaces exist for Guest, Expense, Revenue, FoundingContribution, Shareholder, ShareholderWork, Todo, BudgetRevenue, BudgetExpense, BudgetRent, BudgetRoomSetup, BankBalance, CompanyDocument, WebCredential, ShareholderProfile, MeetingAttachment, ShareholderMeeting, StaffHour, Complaint. Rooms, room_*, account_balances, exchange_rates, role_permissions and users are typed locally in the components that use them (duplicated).

Constants (exact values):

| Constant | Values |
|----------|--------|
| SHAREHOLDERS | the four shareholder full names (hard-coded) |
| PAYERS | SHAREHOLDERS + 'General Manager' |
| EXPENSE_CATEGORIES | Rent, Legal, Staff, Utilities, Maintenance, Marketing, Operations, Other |
| PAYMENT_METHODS | Cash, Bank Transfer, Revolute (typo), Wise, Card, General Manager, Other |
| TODO_STATUSES | Pending, Ongoing, Complete, Blocked |
| DEPARTMENTS | Legal, Finance, Operations, Renovation, HR, Marketing |
| MONTHS | Jan … Dec |
| ROOMS | 1..10 |
| LEGAL_STATUSES | Pending, Accepted, Clarification Needed, Rejected |
| BOOKING_SOURCES | Direct Booking, Booking.com, Agoda, Other |
| REVENUE_SOURCES | Direct Booking, Booking.com, Agoda, Other Platform, Other Income |
| REVENUE_SOURCE_GROUPS | Direct Booking, Booking.com, Agoda, Other |
| DOCUMENT_CATEGORIES | Legal, Tax, Insurance, Permits, Contracts, Banking, HR, Certificates, Logo, Project, Other |
| STAFF_DEPARTMENTS | Operations, Housekeeping, Reception, Maintenance, Kitchen, Management, Other |
| COMPLAINT_CATEGORIES | Cleanliness, Noise, Service, Amenities, Maintenance, Food & Beverage, Safety, Other |
| COMPLAINT_SEVERITIES | Low, Medium, High, Critical |
| COMPLAINT_STATUSES | Open, In Progress, Resolved, Closed |

Helpers: `formatTHB` (th-TH currency, 0 decimals), `formatDate` (en-GB "dd Mon yyyy"), `revenueSourceGroup(type)` (lower-case contains: booking.com → Booking.com, agoda → Agoda, direct → Direct Booking, else Other).

Payment method → account map (duplicated in Guests and Expenses): Cash→Cash, Bank Transfer→Bank, Revolute→Revolut, Wise→Wise, Card→Bank, General Manager→GM Bank; Other → no account.

## Mismatches worth knowing

- Several tables have `created_at` in SQL but not in the TS type (Shareholder, Budget*, BankBalance); several TS optionals are NOT NULL in SQL (`show_on_legal`, `add_to_revenue`, `visible_to_gm`).
- Status and category lists exist only in TypeScript; there are no CHECK constraints or lookup tables.
- `shareholders`, `shareholder_profiles` and the `SHAREHOLDERS` constant are three sources of truth for the same people; ownership % is stored twice.
- `ROOMS` (1..10) duplicates the `rooms` table; the Budget page has its own hard-coded list of 10 room names.
- Thai baht is baked into column names (`amount_thb*`, `rent_thb`, `hourly_rate_thb`, `*_rate_thb`, `amount_to_found_thb`).
- No table has a tenant/organisation column; every unique constraint would need the tenant added.
