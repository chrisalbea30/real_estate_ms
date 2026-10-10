-- Add up to 3 dated payments per guest, to support per-month revenue allocation.
-- The existing `payment` column stays as a manual-entry fallback for legacy 2025 records.

alter table guests
  add column if not exists payment_1_date date,
  add column if not exists payment_1_amount numeric,
  add column if not exists payment_2_date date,
  add column if not exists payment_2_amount numeric,
  add column if not exists payment_3_date date,
  add column if not exists payment_3_amount numeric;
