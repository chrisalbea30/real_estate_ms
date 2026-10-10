# 01 — System overview

## Purpose

An internal management system for one small hospitality property. It replaced a shared Excel workbook ("Management Board") that had sheets for guests, expenses, legal expenses, revenue, founding capital, shareholder work, to-dos and budgets. The app still has an importer for that workbook.

It is used daily by a General Manager on a phone and tablet, and periodically by four shareholders, an accountant and a lawyer on desktops.

## Who uses it

| Role | What they do in the system | Access model |
|------|---------------------------|--------------|
| Admin | Everything. Manages users, role permissions, rooms, data import/export/reset. | Bypasses all permission checks |
| General Manager (GM) | Bookings, occupancy, rooms, expenses with receipts, tasks assigned to them, staff hours, complaints, TM30 immigration filing. | Bypasses all permission checks (hard-coded) |
| Shareholder | Shareholder dashboard, founding contributions, shareholder work hours, meetings, budget, tasks not assigned to the GM. | Permission matrix |
| Accountant | Expenses, revenue, budget, legal report. | Permission matrix |
| Lawyer | Legal / Accounting page: reviews expenses shared with legal, sees revenue shared with legal. | Permission matrix |
| Staff | Guests and tasks. | Permission matrix |

There is exactly one tenant. There is no concept of organisation, property or site in the data.

## Module map (sidebar order)

| Sidebar label | Route | Module key | Purpose |
|---------------|-------|------------|---------|
| Overview | `/` | `overview` | KPIs (expenses, revenue, capital, net), account balances, in-house and arriving guests, task counts |
| Shareholder | `/shareholder-dashboard` | `shareholder_dashboard` | Financial overview, funding, shareholding, budget vs actual, KPIs, cost structure, forecast, profiles |
| GM Dashboard | `/operations-dashboard` | `gm_dashboard` | Today's check-ins/outs, TM30 pending, fire-extinguisher alerts, bookings windows, collections, tasks, cash control |
| Guests | `/guests` | `guests` | Bookings CRUD, payments, documents, invoice, Add to Revenue / Show on Legal flags |
| Occupancy | `/occupancy` | `occupancy` | Month calendar of rooms × days, occupancy statistics |
| Rooms | `/rooms`, `/rooms/[id]` | `rooms` | Room list with photos, inventory, fire extinguishers, current and upcoming guests |
| Expenses | `/expenses` | `expenses` | Expense CRUD, receipt OCR, attachments, auto numbering, share with Legal |
| Revenue | `/revenue` | `revenue` | Single source of truth for revenue: auto rows from guests plus manual payouts |
| Founding | `/founding` | `founding` | Capital contributions per shareholder |
| SH Work | `/shareholder-work` | `shareholder_work` | Hours worked by shareholders at an hourly rate |
| Tasks | `/tasks` | `tasks` | To-do list with departments, responsible person, GM visibility |
| Budget | `/budget` | `budget` | Budget setup, revenue matrix, expense items, rent schedule, budget vs actual control |
| SH Profiles | `/shareholder-profiles` | `shareholder_profiles` | Profile cards for shareholders |
| SH Meetings | `/shareholder-meetings` | `shareholder_meetings` | Meeting records with participants, agenda, decisions, attachments |
| Staff Hours | `/staff-hours` | `staff_hours` | Hours and pay per staff member |
| Legal | `/legal` | `legal` | Lawyer / accountant report: revenue shared with legal and legal expenses with review workflow |
| Documents | `/documents` | `documents` | Company document archive by category |
| Log-In | `/logins` | `logins` | Stored web credentials for third-party services |
| Complaints | `/complaints` | `complaints` | Guest complaints with severity and status |
| Settings | `/settings` | (none) | Password, users, rooms, role permissions, import, export, reset |

Unlinked pages: `/admin/users`, `/admin/data`, `/change-password` (older duplicates of Settings sections).

## Tech stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 16.2 (App Router, Turbopack), React 19.2, TypeScript 5 | Server components fetch; client components write |
| Styling | Tailwind CSS v4, a little `styled-jsx` for `.label` / `.input` classes | Tailwind v4 needs Chrome 111+ / Safari 16.4+ |
| UI bits | lucide-react icons, date-fns, SheetJS (`xlsx`) for exports and imports | |
| Database | Supabase Postgres, accessed through PostgREST with `@supabase/supabase-js` | One anon-key client used everywhere |
| Storage | Supabase Storage, one public bucket `dms-files` | Public URLs stored on records |
| Auth | Custom: `users` table + bcryptjs, cookie session | Not Supabase Auth |
| Hosting | Vercel, auto-deploy from `master` | No staging, no CI, no tests |
| AI | Google Gemini 2.5 Flash | Reads expense receipts into form fields |
| FX | European Central Bank daily XML | EUR→THB rate, refreshed manually |
| Mobile | Web app manifest + icon (installable PWA) | No service worker, no offline |

## Design principles the current system follows (keep these)

1. **Revenue is the single source of truth.** Every revenue total anywhere is a sum over the `revenue` table. Guest bookings reach it only through an explicit flag, as exactly one row each, dated by check-out, valued at Total Stay.
2. **Two independent flags on a booking:** Add to Revenue and Show on Legal page. Either, both or neither.
3. **Account balances are adjusted by payment method.** A guest payment or an expense moves the matching account (Cash, Bank, Wise, Revolut, GM Bank).
4. **Legal review is a workflow on expenses:** Pending → Accepted / Clarification Needed / Rejected, with notes and a review date.
5. **Role matrix with two super-roles.** Admin and GM see everything; other roles are gated per module for view/add/edit/delete.
6. **Base currency with a display toggle.** All amounts are stored in THB and shown in THB or EUR.
7. **Mobile first for the GM.** Every form has to work at phone width; the GM works from an Android phone and tablet.

## Design decisions the current system made that a SaaS should NOT keep

- Browser writes straight to the database with the anon key and row-level security off.
- Unsigned session cookie (base64 of the user record).
- Hard-coded tenant facts: shareholder names, 10 rooms, VAT rate, EUR fallback rate, invoice legal details, branding, category lists, year ranges.
- Free-text links instead of foreign keys (room numbers, shareholder names, payer names).
- Dates as plain strings compared in a mix of UTC and local time.
- Business logic only in client components; no server-side validation of add/edit/delete permissions.

See [05-saas-requirements.md](05-saas-requirements.md) for what replaces each of these.

## Size

About 20 screens, 26 tables, 14 API routes, one shared sync helper, roughly 12k lines of TypeScript in the app.
