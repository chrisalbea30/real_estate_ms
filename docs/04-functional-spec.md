# 04 — Functional specification, screen by screen

Exact behaviour of the current system. Formulas and column names are literal. "TOTAL_ROOMS" = number of active rooms (10 if none). "now" is whatever `new Date()` returns where the code runs (server = UTC on Vercel; browser = device time).

## 0. Shared building blocks

**Access control** — see 02-architecture §4. In short: Admin and GM see everything; other roles are gated per module for view (server-enforced) and add/edit/delete (UI only); a missing permission row means allow.

**Rooms** — active rooms from the `rooms` table; forms offer them by number and show the name.

**Currency** — `format(amount_thb)` shows `฿` with 0 decimals or `€` as `amount / rate`. Rate from `exchange_rates` (EUR→THB) via `/api/exchange-rate`, fallback 37. The toggle lives in React state only and resets on reload. A green dot means the rate source is not fallback/seed.

**Exports** — every list page has XLSX / CSV / PDF / JSON of the current filtered + sorted rows (Staff Hours exports everything).

**Uploads** — session required, 10 MB max, MIME allow-list, stored in the public bucket under a per-module folder; the public URL is saved on the record.

**Payment method → account** — Cash→Cash, Bank Transfer→Bank, Revolute→Revolut, Wise→Wise, Card→Bank, General Manager→GM Bank, Other→none. `adjustBalance(method, delta)` reads `account_balances.amount` and writes `amount + delta` (read-then-write from the browser, not atomic).

**Revenue source bucketing** — `revenueSourceGroup(type)`: contains "booking.com" → Booking.com; else "agoda" → Agoda; else "direct" → Direct Booking; else Other.

---

## 1. Overview (`/`, module `overview`)

**Reads** (server): todo status counts; guests `(id, check_in, check_out, room, guest_name, amount_thb_stay, payment)`. (browser): expenses `(amount, payment_date)`, revenue `(amount_thb, date)`, founding_contributions `(amount_thb, date)`, account_balances, expenses `(amount, file_url)`.

**Year filter**: one multi-select button per year from 2023 to the current year plus All; cannot deselect the last one. With all years selected, rows with a NULL date are included; otherwise only rows whose year is selected.

**KPIs**
- Total Expenses = Σ |expenses.amount| (currency ignored).
- Total Revenue = Σ revenue.amount_thb (single source of truth).
- Capital Funded = Σ founding_contributions.amount_thb.
- Net Position = Revenue + Funded − Expenses (green ≥ 0, red otherwise).

**Account balances**: one card per `account_balances` row with inline edit (amount, notes, updated_at); "Total cash on hand" = Σ amount; plus an automatic "No Invoice/Receipt" card = Σ |amount| of **all** expenses whose `file_url` is empty.

**Lists**: Currently In-House (`check_in <= now && check_out >= now`): room, guest, check-out, balance = `amount_thb_stay − payment` (red if > 0). Arriving in 7 days (`0 < (check_in − now) ≤ 7 days`): room, guest, check-in, total. Task counts over all todos (no role filter).

Known: balance edit is not permission-gated; header says "Dashboard".

---

## 2. Shareholder Dashboard (`/shareholder-dashboard`, module `shareholder_dashboard`)

**Reads** (server): expenses `(category, amount, currency, payment_date)`; revenue `(amount_thb, date, type)`; founding_contributions `(shareholder, amount_thb, amount_eur)`; account_balances; budget_revenue and budget_expenses for the current year only; guests `(check_in, check_out, amount_thb_stay, payment, room, guest_name)`; shareholders.

**Writes**: Admin-only inline edit of `shareholders.share_percentage`.

**Tabs**
1. *Financial Overview*: Total Revenue (All time) = Σ revenue; Total Expenses = Σ |amount| (no FX); Net Position = Rev + Founded − Exp; Account Total = Σ account_balances; Revenue by Source (4 buckets, amount and %, bars); Monthly Revenue vs Expenses for the current year (revenue by `revenue.date` month, expenses by `payment_date` month, bars scaled to the max month); account list.
2. *Funding & Investment*: Total Capital Funded; "4 shareholders, 25 % each" (text hard-coded); per shareholder (from the SHAREHOLDERS constant): total = Σ contributions with matching name, agreed = `amount_to_found_thb`, pct = `share_percentage` (default 25), progress = total / agreed.
3. *Shareholding*: nominalPct = share_percentage ?? 0; nominalAmount = totalFounded × nominalPct / 100; actualPaid = Σ their contributions; balance = nominalAmount − actualPaid (positive = still owes); fundedPct = actualPaid / nominalAmount × 100; Total Allocated % = Σ share_percentage (green within 0.01 of 100); Fully Settled = count with balance ≤ 0; footer = Σ positive balances.
4. *Budget vs Actual (P&L)*: budget revenue = Σ budget_revenue by room_name (no room-name filter, so imported aggregate rows double count); actual revenue = Σ revenue dated in the current year; OPEX rows in the fixed order Staff Costs, Rooms Department, Utilities, Maintenance & Repairs, General & Admin, Insurance & Licenses, Rent / Lease, Financial Costs, Sales & Marketing, Travel, then any others; OPEX budget = Σ budget_expenses where expense_type='OPEX' and category matches; OPEX actual = Σ |expense.amount| × (37 if currency='EUR' else 1) where `expense.category` equals the budget category **exactly**; CAPEX rows by item_name, budget only, actual shown as "—" but a hidden actual-by-item value is still subtracted; variance = actual − budget with %, colours inverted for expenses; Net = Rev − OPEX − CAPEX.
5. *Business KPIs* (current month, from guests): monthGuests = stays overlapping the month; occupiedNights = Σ ceil((min(check_out, monthEnd) − max(check_in, monthStart)) / day) with monthEnd = last day 00:00 (drops the last night); monthRevenue = Σ **full** amount_thb_stay of those guests (not pro-rated); Occupancy % = occupiedNights / (TOTAL_ROOMS × daysInMonth) × 100; ADR = monthRevenue / occupiedNights; RevPAR = monthRevenue / (TOTAL_ROOMS × days); Avg Stay = occupiedNights / bookings; 12-month table with badges ≥ 70 % green, ≥ 40 % yellow.
6. *Cost Structure*: Σ |amount| by category (null → Other), descending, with % of total.
7. *Forecast*: futureRevenue = Σ amount_thb_stay of guests with check_in > now; remainingBudRev / remainingBudExp = Σ budget rows for months after the current month (revenue shown only); Projected Cash = accountTotal + futureRevenue − remainingBudExp; upcoming bookings list.
8. *Shareholder Profiles*: cards from the SHAREHOLDERS constant (initials, ownership % default 25, contributed, bar vs agreed). Ignores the `shareholder_profiles` table.

---

## 3. GM Dashboard (`/operations-dashboard`, module `gm_dashboard`)

**Reads** (server): guests (all); todos (all); revenue `(amount_thb, date, type)` newest **30**; account_balances; expenses `(amount, payment_date, category, supplier, document_number, file_url)` newest **50**; fire extinguishers expiring within 30 days joined to rooms.

**Task visibility**: todos where responsible_person = 'General Manager' or visible_to_gm.

**Header**: today's date; "TM30 Registration" link to the Thai immigration portal.

**Tabs**
- *Today's Ops*: check-ins today (`check_in` = today's UTC date), check-outs today, in-house; Available = TOTAL_ROOMS − in-house with % = inHouse / TOTAL_ROOMS; arriving list with TM30-pending flag; departing list with balance or Paid; TM30 Pending box (in-house with !tm30); fire-extinguisher alerts: days = ceil((expiry − now)/day) shown as "Expired Nd ago" / "Nd left", tab badge.
- *Bookings*: arriving in 14 days (0 < diff ≤ 14); departing in 7 days (0 ≤ diff ≤ 7) with balance due.
- *Revenue & Collection*: Revenue This Month = Σ of the 30 fetched rows with date ≥ first of month; Outstanding = guests with `amount_thb_stay − payment > 0` sorted desc with total.
- *Tasks & Issues*: overdue = target_date < now and status ≠ Complete (red badge); due today; Pending / Complete counts; lists.
- *Operations Status*: tasks grouped by DEPARTMENTS, first 4 per group, open and blocked counts.
- *Cash Control*: cash on hand, No Invoice card (from the 50 fetched expenses), guest receivables, account cards with "Updated" date, last 10 expenses with a "No invoice" flag.

Known: 30-row and 50-row limits; the fire-alert room join is read as an array so the room label probably always shows "Unknown room"; outstanding includes long-departed guests.

---

## 4. Guests (`/guests`, module `guests`)

**Reads**: guests (all) ordered by check_in desc; duplicate ids dropped client-side.

**Form fields**: room (active rooms), guest_name*, check_in*, check_out*, booking_source (default Direct Booking), amount_thb_day, amount_thb_stay, paid (= payment method), payment (amount paid), payment_1..3 date/amount, email, phone, notes, attached document, add_to_revenue, show_on_legal, passport_number, passport_expiry, tm30. Not in the form: guest_count, date, invoice.

**Calculations**
- nights = max(0, round((check_out − check_in) / 86 400 000)).
- On save: amount_thb_stay = entered value, else amount_thb_day × nights.
- splitSum = Σ payment_i_amount; if > 0 then payment = splitSum and the Amount Paid field is locked.
- balance = stay − effective payment; red "Balance due" box when > 0.
- Row status: Checked Out if check_out < now; In-House if check_in ≤ now; else Upcoming. TM30 badge Filed / Pending.

**Side effects**
1. account_balances: new → +payment on the account for `paid`; edit → −old.payment from old.paid, then +new.payment to new.paid; delete → −payment. All split payments post to the single `paid` method.
2. Revenue sync (`syncGuestRevenue`): if add_to_revenue → upsert `revenue` on conflict guest_id with `{guest_id, date: check_out, type: booking_source || 'Direct Booking', supplier: guest_name, amount_thb: amount_thb_stay, notes, file_url, show_on_legal}`; else delete `revenue where guest_id = id`. Manual revenue is never touched. A failure shows a second alert ("Guest saved, but…"). Deleting a guest deletes the linked row (explicitly and by cascade).

**Row actions**: open attachment; open invoice `/api/invoice/{id}`; mailto with the invoice link; TM30 portal link; edit / delete (permission-gated).

**Search** guest_name, room, email, passport_number. **Sort** room, guest_name, check_in (default desc), check_out, amount_thb_stay, payment. **Page size** 10.

**Export columns**: Room, Guest, Check-In, Check-Out, Nights, Stay Total, Paid, Balance, Payment Method, Booking Source, Pay 1/2/3 Date and Amount, Email, Phone, Passport, TM30, Add to Revenue, Show on Legal, Attachment, Notes.

**Invoice** (`/api/invoice/[id]`): total = amount_thb_stay with VAT included: subtotal = total / 1.07, VAT = total − subtotal, unit price = subtotal / nights; deposit = payment; balance due = total − deposit; service charge 0 %; one line "Room Charge – Room N" qty nights; amount in words "… Baht Only"; invoice no = `INV-` + first 6 hex of the guest UUID upper-cased (not sequential); invoice date = check_out; company name, address, taxpayer ID, branch, email, logo and signatory hard-coded; "TAX INVOICE / RECEIPT" title; requires a logged-in session.

**Mobile**: single-column form; dated-payment rows use `minmax(0,1fr)` tracks; the three checkbox rows are `<label>` elements; a full-width row inside the form must use `sm:col-span-2` (an unconditional `col-span-2` once crushed the whole phone layout).

---

## 5. Occupancy (`/occupancy`, module `occupancy`)

Month calendar: rows = active rooms, columns = days, today highlighted. Cell occupied when `room === r.number && check_in <= day && check_out > day` (check-out night excluded). Colour per guest name (10 classes); first name on the check-in cell; rounded ends. Legend of guest names.

Stats: roomNightsAvailable = TOTAL_ROOMS × daysInMonth; roomNightsSold = Σ round((min(co, monthEnd) − max(ci, monthStart)) / day) with monthEnd = last day 00:00; Occupancy % = sold / available × 100 (1 decimal); Bookings = overlapping stays.

Known: `new Date('YYYY-MM-DD')` is UTC midnight while cells use local midnight, so in UTC+7 bars likely shift one day; overlapping bookings in one room show only the first; no click-through.

---

## 6. Rooms (`/rooms`, `/rooms/[id]`, module `rooms`)

**List**: rooms, room_photos, guests `(room, check_in, check_out)`. Occupied when `check_in <= today && check_out >= today` as ISO strings (includes check-out day). Grid of active rooms with thumbnail (lowest position) and Occupied / Available badge. Inline rename and Add Room call `/api/admin/rooms` (Admin-only; a GM gets 403 but the UI still shows success; after add the UI reads `json.data` from a response that is the row itself).

**Detail**: room, photos (max 5; uploaded with no subject so they land in `expenses/`; delete removes the row only; lightbox), inventory `{name, category, quantity ≥ 1, notes}` grouped by category, fire extinguishers `{location default Room, serial_number, expiry_date*, last_inspected, notes}` with status expired / ≤ 7 days red / ≤ 30 days amber / green and "N expiring soon" (≤ 30 days), current guest (`check_in <= today && check_out >= today`), next 5 upcoming. Amounts shown with a hard-coded `฿`.

---

## 7. Expenses (`/expenses`, module `expenses`)

**Reads**: expenses (all) by payment_date desc.

**Form**: payment_date, transaction_number, document_number, category, subcategory, supplier, amount, currency (free text, default THB), method, paid_by (PAYERS), audit (To check / Checked / YES, default To check), type, description, is_legal ("Shared with Legal"), attachment. Not in the form: lawyers, sent, to_verify, internal_document, document_page.

**Auto numbering on a new expense**: transaction_number = "Expense " + 3-digit (max N from `/^Expense\s+0*(\d+)$/` + 1); document_number = 3-digit (max purely numeric document_number + 1).

**OCR**: image → Gemini → fills supplier, document_number, payment_date, amount, currency, description, category (only if in the list); filled fields highlighted; the OCR image is not stored (a separate Attach button stores a file).

**Side effects on account_balances** (THB rows only): new → −amount from `method`'s account; edit → +old.amount back (if old was THB) then −new.amount; **delete does not reverse** (bug). Raw amount used (no abs) while every display uses |amount|.

**Stats**: Total Expenses, Filtered Total, Legal Expenses (Σ |amount| where is_legal), record count. **Filters**: search supplier / description / transaction_number; category; Legal only. **Page size** 10 / 25 / 50 / 100. **Sort** document_number, payment_date (default desc), category, supplier, |amount|.

**Export**: Date, Transaction #, Document #, Category, Subcategory, Supplier, Description, Amount THB (raw amount in any currency), Currency, Method, Paid By, Audit, Legal, Attachment.

---

## 8. Revenue (`/revenue`, module `revenue`) — single source of truth

**Reads**: revenue (all) by date desc.

**Row types**: guest-linked (`guest_id` set) show a Guest badge and a lock; edit/delete refused with a message pointing to Guests; invoice link. Manual rows: `{date*, type* (REVENUE_SOURCES dropdown, default Booking.com; legacy free text kept as first option when editing), supplier ("Description"), amount_thb, notes, file_url, show_on_legal}`; guest_id never sent.

**Totals**: Total Revenue (All time) = Σ amount_thb; This Month = rows in the current year-month; by-source cards (4 buckets, %; click toggles a source filter); monthly grid for the selected year (years from the data, newest first), Σ by `date` month, year total; click a tile toggles a month filter.

**Filters**: search type / supplier / notes; month (YYYY-MM options from data); source group; Show to Legal All / Yes / No. **Page size** 10. **Sort** date (default desc), type, supplier, amount. Footer shows Total or Filtered Total.

**Export**: Date, Type / Source, Description, Amount THB, Notes, Document, Legal, Origin (Guest booking / Manual).

Known: the Show to Legal row in the modal uses the old div-onClick + label pattern (clicking the label text toggles twice); manual revenue never touches account_balances.

---

## 9. Legal / Accounting (`/legal`, module `legal`)

**Reads** (server, force-dynamic): expenses where is_legal; guests where show_on_legal (by check_out desc); revenue where show_on_legal **and guest_id IS NULL**.

**Visibility rule**: a booking appears through its own flag; guest-linked revenue rows are excluded so nothing appears twice. The two guest flags are independent.

**Revenue table**: guest rows `{date: check_out, source: booking_source || 'Direct Booking', description: guest_name, detail: "Room #N · ci → co", amount: amount_thb_stay, file_url, invoiceUrl}`; manual rows `{date, source: type ?? 'Other', description: supplier || type, detail: notes, amount_thb, file_url}`; sorted by date desc; footer Total (Legal).

**Filters**: year select (hard-coded 2024–2027, default current), month (All or 1–12), status tabs (All + 4 statuses), one search box for both lists (expenses: supplier, description, document_number, category, legal_notes; revenue: source, description, detail). NULL-dated rows only under All Months.

**KPI cards** (ignore search/status): Total count with Σ |amount|, Pending (null or Pending), Accepted, Clarification, Rejected.

**Expense groups**: Accepted, Clarification Needed, Rejected, Pending; subtotal each; first 10 rows then "Show N more"; expandable row with description, method, paid_by, type.

**Review** (needs legal.edit): ✓ / ? / ✗ open a modal with Decision, Notes / Reason, Review Date (default today UTC); saves legal_status, legal_notes, legal_reviewed_at.

**CSV** `legal-report-<YYYY|YYYY-MM>.csv`: header `Status,Date,Supplier,Invoice #,Category,Amount,Currency,Description,Legal Notes,Reviewed Date,Attachment`; one block per status with a Subtotal line; then a "REVENUE SHOWN TO LEGAL" block `Date,Source,Description,Detail,Amount THB,Document,Invoice` with a Total (Legal) line. **Print**: header "Legal / Accounting Report", month label, generated date, counts, revenue total.

---

## 10. Founding (`/founding`, module `founding`)

CRUD on founding_contributions `{date, shareholder (SHAREHOLDERS), method (PAYMENT_METHODS), amount_thb, amount_eur, notes}`; no validation; account_balances untouched. Cards per shareholder: total THB and share = their total / grand total × 100 (share of capital paid, not agreed %). Total Capital Founded = Σ amount_thb. Search shareholder / method / notes; sort date (desc), shareholder, amount_thb; page size 10. EUR shown as `€x` from amount_eur without conversion. Export: Date, Shareholder, Amount THB, Amount EUR, Method, Notes.

## 11. Shareholder Work (`/shareholder-work`, module `shareholder_work`)

CRUD on shareholder_work `{month (type=month → YYYY-MM-01), shareholder, hours, hour_rate default 200}`. Value = hours × (hour_rate ?? 200). Cards per shareholder (THB, hours) and grand total; records grouped by month with group totals. Subtitle hard-codes "200 THB/hr". Export: Month, Shareholder, Hours, Rate THB/hr, Total THB. Hours never feed expenses or payouts.

## 12. Tasks (`/tasks`, module `tasks`)

CRUD on todos `{project default "DMS", department (DEPARTMENTS), topic*, responsible_person (free text with datalist SHAREHOLDERS + General Manager), target_date, status, status_notes, visible_to_gm}`; updates set updated_at. Visibility: GM → responsible = General Manager or visible_to_gm; Shareholder → responsible ≠ General Manager; others → all. The visible_to_gm checkbox appears only when the responsible person is a shareholder; an eye icon toggles it inline; "GM can see but not act" is not enforced. Status chips with counts (All counts every todo); quick-status dropdown per row (not permission-gated); overdue = target_date < now and status ≠ Complete; Load more in steps of 50. Export: Project, Department, Topic, Status, Responsible, Target Date, Visible to GM, Notes.

## 13. Budget (`/budget`, module `budget`)

**Reads**: budget_revenue, budget_expenses, budget_rent, budget_room_setup; actuals from revenue `(amount_thb, date)` and expenses `(amount, currency, payment_date, category)`. Year select hard-coded 2025–2028. ROOMS_LIST hard-coded to 10 names; budget revenue only counts rows whose room_name is in that list.

- *Setup*: CRUD on budget_room_setup; reference only.
- *Input*: Revenue Matrix room × month (cell = Σ entries; click edits only the first entry; no delete); Expense Items OPEX and CAPEX → category → item × 12 months with subtotals (click empty cell pre-fills add; click filled cell edits with delete); Rent Schedule (year_number, label, annual rent; VAT column = rent × 0.0266; monthly = rent / 12; no delete).
- *Control*: budget revenue = Σ rooms; budget expenses = OPEX + CAPEX; budget result = revenue − expenses; actual revenue = Σ revenue by month for the year; actual expenses = Σ amount × 37 if EUR (no abs here); actual result; 6 KPI cards; P&L view like the Shareholder Dashboard (OPEX matched by exact category name; CAPEX actual "—"; actual net = actual revenue − actual OPEX); Monthly view with Bud/Act/Var for revenue, expenses, result.

## 14. SH Profiles (`/shareholder-profiles`)

CRUD on shareholder_profiles `{name*, role*, bio, ownership_pct, photo_url (typed or uploaded with subject profile), email, phone, nationality, joined_date}`. Header: "N shareholders · X % ownership recorded" = Σ ownership_pct. Separate from `shareholders.share_percentage`.

## 15. SH Meetings (`/shareholder-meetings`)

CRUD on shareholder_meetings `{meeting_date*, title*, participants (toggle chips from SHAREHOLDERS), agenda, decisions, action_items, attachments [{name,url}]}`; attachments upload directly to `dms-files/meetings/` (.pdf .doc(x) .xls(x) .png .jpg). Expandable list with participant and file counts; Load more by 20. No export.

## 16. Staff Hours (`/staff-hours`)

CRUD on staff_hours `{staff_name* (datalist of existing), date*, hours* (0–24 step 0.5), role, department (STAFF_DEPARTMENTS), hourly_rate_thb, notes}`. Pay = hours × (hourly_rate_thb ?? 0). Summary cards per staff for the selected month (or current UTC month under All Months), sorted by hours; totals for the filtered rows. Filters staff, month; Load more by 50. Export ignores filters: Date, Staff Name, Role, Department, Hours, Rate THB/hr, Total THB, Notes. Staff costs never post to expenses.

## 17. Documents (`/documents`)

CRUD on company_documents `{name* (defaults to file name), category (default Other), document_date, file_url (subject document), notes, uploaded_by, updated_at}`; delete keeps the file in storage. Search name / notes / uploaded_by; category filter; sort by name, category, date; no paging. Export: Name, Category, Date, Uploaded By, Notes, File URL.

## 18. Log-In / web credentials (`/logins`)

CRUD on web_credentials `{service_name*, url, username, password, notes, created_by, updated_at}`. Passwords stored in plaintext (a banner says so); masked with show/hide and copy; URLs prefixed https:// when missing. Search service / username / url / notes; sort service or username. **Export includes passwords in clear.**

## 19. Complaints (`/complaints`)

CRUD on complaints `{date (default today UTC at module load), guest_name*, room (active rooms or none), category, description*, severity default Medium, status default Open, resolution_notes, resolved_at (manual), filed_by}`. Stats: Open, In Progress, Critical (severity Critical and status ≠ Closed). Status chips; search guest / room / category / description / filed_by; sort date (desc), guest, room, severity (Critical 4 … Low 1), status; page size 10. Export: Date, Guest, Room, Category, Severity, Status, Description, Resolution, Resolved At, Filed By.

## 20. Settings (`/settings`)

Sidebar label "Admin Settings" for Admin, "Settings" otherwise; non-admins see only the password section.
1. *Update Password*: current, new, confirm; min 8; strength meter (classes of [A-Z], [0-9], symbol → Weak / Good / Strong).
2. *User Management*: list `(id, username, display_name, role, created_at)` with search; add (username lower-cased, spaces removed; roles Admin, General Manager, Shareholder, Lawyer, Accountant, Staff; password ≥ 8); reset password; delete (not self). No role/name edit in the UI although the API supports it.
3. *Room Config*: add (number, name), rename, toggle active, delete via `/api/admin/rooms`. Inactive rooms are hidden from forms and the calendar; guests reference rooms by number.
4. *Role Permissions*: roles GM, Shareholder, Lawyer, Accountant, Staff × 19 modules × View/Add/Edit/Delete with tick-all helpers; save upserts every cell; GM rows have no effect (unrestricted in code).
5. *Import Data*: upload the legacy workbook; rows are appended; import log shown.
6. *Export Data*: XLSX of 13 tables (all or one).
7. *Reset Data*: delete all rows of 13 tables; Reset All needs a checkbox plus a browser confirm.

No exchange-rate setting here; the rate refreshes from the sidebar.

## 21. Login (`/login`)

Username + password → `POST /api/auth/login` → cookie → redirect to `/` (Admin, GM) or the first viewable module.

---

## Cross-cutting rules

- **Role model**: six roles; Admin and GM bypass everything; others use the matrix with default-allow; view is server-enforced, add/edit/delete are UI-only; Admin-only API routes check the role server-side; Tasks add row filters; Legal review needs legal.edit; anyone who can edit guests can create revenue via the checkbox regardless of revenue permission (deliberate).
- **Revenue is the single source of truth**: every revenue total is Σ `revenue`. A booking contributes exactly one row (unique guest_id, cascade delete) valued at Total Stay and dated by check-out, read-only on the Revenue page. KPIs, Forecast and Outstanding still read guests. Legal lists guests via `show_on_legal` and manual revenue via `revenue.show_on_legal AND guest_id IS NULL`.
- **Currency**: everything stored in THB except `expenses.currency` (may be EUR) and `founding_contributions.amount_eur`; display toggle THB/EUR at the stored ECB rate (fallback 37); some places print `฿` directly; expense signs are not meaningful (abs everywhere except Budget control and balance adjustments).
- **Dates**: Postgres `date` columns as `YYYY-MM-DD` strings; parsed with `new Date(...)` (UTC midnight) but compared with local time or UTC ISO dates inconsistently; no tenant timezone; "today" is UTC on the server.
- **Attachments**: one public URL per record (or a JSON array for meetings) in the public bucket; never deleted; max 10 MB; guest attachments copied to the linked revenue row.
- **Exports**: shared XLSX/CSV/PDF/JSON on lists; custom CSV and print on Legal; full-table XLSX and reset for Admin.
