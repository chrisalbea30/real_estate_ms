import { z } from 'zod'
import { money, optText } from '@/lib/schemas/guests'

export const budgetYear = z.coerce.number().int().min(2000, 'Choose a year').max(2100, 'Choose a year')
export const budgetMonth = z.coerce.number().int().min(1, 'Choose a month').max(12, 'Choose a month')
export const expenseType = z.enum(['OPEX', 'CAPEX'])

export const roomSetupSchema = z.object({
  id: z.string().uuid().optional(),
  year: budgetYear,
  room_name: z.string().trim().min(1, 'Choose a room').max(120),
  high_season_rate_thb: money,
  low_season_rate_thb: money,
  target_occupancy_pct: z.union([z.coerce.number().min(0, '0–100').max(100, '0–100'), z.literal(''), z.null()]).optional(),
  notes: optText(2000),
})
export type RoomSetupInput = z.input<typeof roomSetupSchema>

/** Identifies one cell of the revenue matrix. */
export const revenueCellKeySchema = z.object({
  year: budgetYear,
  month: budgetMonth,
  room_name: z.string().trim().min(1, 'Choose a room').max(120),
})
export type RevenueCellKey = z.input<typeof revenueCellKeySchema>

export const revenueCellSchema = revenueCellKeySchema.extend({
  amount_thb: money,
  season: optText(40),
})
export type RevenueCellInput = z.input<typeof revenueCellSchema>

export const expenseItemSchema = z.object({
  id: z.string().uuid().optional(),
  year: budgetYear,
  month: budgetMonth,
  category: z.string().trim().min(1, 'Choose a category').max(120),
  subcategory: optText(120),
  item_name: z.string().trim().min(1, 'Item name is required').max(160),
  amount_thb: money,
  expense_type: expenseType,
})
export type ExpenseItemInput = z.input<typeof expenseItemSchema>

/** Sets the same amount on every month of an item (update first entry or insert). */
export const expenseCopySchema = z.object({
  year: budgetYear,
  category: z.string().trim().min(1, 'Choose a category').max(120),
  subcategory: optText(120),
  item_name: z.string().trim().min(1, 'Item name is required').max(160),
  amount_thb: money,
  expense_type: expenseType,
})
export type ExpenseCopyInput = z.input<typeof expenseCopySchema>

/** Creates a new item row in the expense matrix. */
export const expenseNewItemSchema = z.object({
  year: budgetYear,
  category: z.string().trim().min(1, 'Choose a category').max(120),
  item_name: z.string().trim().min(1, 'Item name is required').max(160),
  expense_type: expenseType,
  amount_thb: money,
  /** 'all' = every month, otherwise a single month (1–12). */
  months: z.union([z.literal('all'), budgetMonth]).default('all'),
})
export type ExpenseNewItemInput = z.input<typeof expenseNewItemSchema>

export const rentSchema = z.object({
  id: z.string().uuid().optional(),
  year_number: z.coerce.number().int().min(1, 'Year number is required').max(99),
  year_label: optText(60),
  rent_thb: z.coerce.number().min(0, 'Enter the annual rent'),
  vat_amount: money,
})
export type RentInput = z.input<typeof rentSchema>
