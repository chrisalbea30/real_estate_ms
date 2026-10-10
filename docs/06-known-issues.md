# 06 — Known issues in the current system

Listed so the rebuild does not copy them. Severity: **S** security, **D** wrong data/figures, **U** broken or misleading UI, **L** limitation.

## Security (S)
1. Session cookie is unsigned base64 JSON; any role, including Admin, can be forged without a password.
2. All page data is read and written from the browser with the public anon key; RLS is off; add/edit/delete permissions exist only in the UI. Anyone with the anon key can modify every table.
3. Web credentials are stored and exported in plaintext.
4. The user-seeding script contains plaintext default passwords.
5. The FX refresh route and the OCR route have no abuse protection (the OCR route spends Gemini quota per call).
6. Guest personal data (passport numbers, emails) has no field-level protection and appears in exports.

## Wrong or inconsistent figures (D)
7. GM dashboard "Revenue This Month" reads only the newest 30 revenue rows; its "No invoice" total only the newest 50 expenses, while the Overview uses all expenses.
8. EUR expense amounts are summed as THB on the Overview, Shareholder Dashboard, Expenses and Legal pages; Budget and the Shareholder P&L use a fixed rate of 37 instead of the stored rate, and never the rate on the transaction date.
9. Budget vs actual matches OPEX by exact category name; budget categories (from the imported spreadsheet) rarely match `EXPENSE_CATEGORIES`, so actual OPEX is mostly 0. CAPEX actuals are not tracked, yet a hidden actual-CAPEX value is subtracted on the Shareholder Dashboard. The Shareholder Dashboard counts imported aggregate budget rows that the Budget page excludes.
10. KPIs (ADR, RevPAR, occupancy) use each overlapping guest's full stay amount rather than pro-rating to the month, come from guests rather than revenue, and drop the last night of each month because month end is taken at 00:00.
11. Expense delete does not reverse the account balance (guest delete does). Balance updates are read-then-write from the browser with no transaction. All split payments post to one account.
12. Revenue counts Total Stay even for unpaid bookings (by spec), while the old "guest payments" view counted amounts paid; readers comparing the two see different numbers.
13. Backfilled revenue rows all carry "Direct Booking" because bookings had no source before; the source cards are skewed until bookings are corrected.
14. Founding contributions record THB and EUR separately with no cross-check; Shareholding "nominal vs paid" uses percentages that may not sum to 100.

## Dates and timezones (D/L)
15. Dates are strings parsed as UTC midnight but compared with local time or UTC ISO dates. Effects: in-house/checked-out logic differs between Rooms (string compare, includes check-out day), Overview/GM/Guests (Date compare); the occupancy calendar likely shifts a day in UTC+7; "today" defaults are UTC so Thai evenings count as the next day.

## Broken or misleading UI (U)
16. Rooms: rename and add call an Admin-only API; a GM sees success while the call returned 403; after add, the client reads `json.data` from a response that is the row itself.
17. Revenue modal: the Show to Legal toggle uses the div-onClick + label pattern, so tapping the label text toggles twice and cancels (fixed on the Guests page, not here).
18. GM fire-extinguisher alerts read the room join as an array; the room label probably always shows "Unknown room".
19. The emailed invoice link requires a login, so guests cannot open it. Invoice numbers derive from UUID prefixes: not sequential, can collide.
20. `/change-password`, `/admin/users`, `/admin/data` are reachable but not linked; `/admin/users` cannot create Staff users; `/admin/data` covers only 9 tables.
21. Tasks: the All chip counts every todo regardless of role visibility; quick-status is not permission-gated; "GM can see but not act" is not enforced; Overview task counts ignore role.
22. Several saves ignore Supabase errors and close the modal anyway (Founding, Work, Tasks, Budget, Complaints, Profiles, Meetings, Staff Hours).
23. Budget: no delete for revenue entries or rent years; a matrix cell edits only the first of several entries; year lists are hard-coded (2025–2028; Legal 2024–2027; Overview from 2023).
24. Inconsistent page padding on Legal, SH Profiles, SH Meetings, Staff Hours.
25. Tailwind v4 requires Chrome 111+ / Safari 16.4+; older tablet browsers render broken styles.
26. Mobile forms: any unconditional `col-span-2` inside a `grid-cols-1 sm:grid-cols-2` grid crushes the phone layout (fixed in Guests and Shareholder Work; the pattern is easy to reintroduce).

## Limitations (L)
27. Export and reset skip rooms and room_*, account_balances, documents, credentials, users, role_permissions, budget_room_setup, exchange_rates.
28. The FX cron is not scheduled; the rate updates only when someone presses refresh.
29. Files are never deleted from storage; room photos land in the expenses folder; the bucket is public.
30. Pagination is client-side; every page loads whole tables.
31. No tests, no CI, no staging, no error tracking; ESLint has 28 pre-existing errors.
32. Ownership is stored twice (`shareholders.share_percentage`, `shareholder_profiles.ownership_pct`) and the dashboard profiles tab ignores the profiles table; `bank_balances` is a dead table.
33. The Excel importer is specific to one legacy workbook layout.
34. PAYMENT_METHODS contains the typo "Revolute" mapped to the "Revolut" account; fixing the label changes the mapping key.
35. `guests.paid` holds a payment method, not an amount; `guests.date`, `invoice`, `guest_count` and several expense columns are legacy and unused.
