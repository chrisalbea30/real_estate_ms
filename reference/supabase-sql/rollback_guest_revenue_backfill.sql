-- ROLLBACK for the 2026-09-08 "Add to Revenue" backfill.
--
-- State before the backfill (verified 2026-09-08 before running it):
--   * 0 guests had add_to_revenue = true
--   * 0 revenue rows had guest_id set (the only 2 rows were manual 2025 monthly totals)
-- So undoing the backfill is exact: remove every guest-linked revenue row and untick every guest.
--
-- WARNING: this also removes any guest-linked revenue rows created AFTER the backfill by ticking the
-- box in the app. If the GM has ticked bookings since, restore from backups/2026-09-08-pre-backfill/*.json
-- selectively instead of running this blindly.

delete from revenue where guest_id is not null;
update guests set add_to_revenue = false where add_to_revenue = true;

-- Check: both should return 0
-- select count(*) from revenue where guest_id is not null;
-- select count(*) from guests where add_to_revenue = true;
