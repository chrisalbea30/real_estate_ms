import { z } from 'zod'
import { ymd, money, optText } from '@/lib/schemas/guests'

// Hours arrive as a string from the input; '' must fail as "required", not coerce to 0.
const hours = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number({ error: 'Enter the hours worked' }).min(0, 'Hours must be 0 or more').max(24, 'Hours cannot exceed 24 per day'),
)

export const staffHourSchema = z.object({
  id: z.string().uuid().optional(),
  staff_name: z.string().trim().min(1, 'Staff name is required').max(120),
  date: ymd,
  hours,
  role: optText(80),
  department: optText(80),
  hourly_rate_thb: money,
  notes: optText(2000),
})
export type StaffHourInput = z.input<typeof staffHourSchema>

/** Pay for one entry: hours × rate (rate defaults to 0). */
export function staffPay(row: { hours: number | string | null; hourly_rate_thb: number | string | null }) {
  return Number(row.hours ?? 0) * Number(row.hourly_rate_thb ?? 0)
}
