import { z } from 'zod'
import { ACTIONS, MODULES, type Action, type ModuleKey } from '@/lib/modules'
import type { CategoryKind, Perm, Permissions } from '@/lib/types'

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export const CATEGORY_KINDS: { key: CategoryKind; label: string; hint: string }[] = [
  { key: 'expense', label: 'Expense categories', hint: 'Used on the expense form and the budget.' },
  { key: 'booking_source', label: 'Booking sources', hint: 'Where a booking came from (direct, OTAs).' },
  { key: 'revenue_source', label: 'Revenue sources', hint: 'Types of manual income on the revenue page.' },
  { key: 'task_department', label: 'Task departments', hint: 'Departments on the task board.' },
  { key: 'task_project', label: 'Task projects', hint: 'Projects a task can belong to.' },
  { key: 'staff_department', label: 'Staff departments', hint: 'Departments on the staff-hours page.' },
  { key: 'complaint', label: 'Complaint categories', hint: 'Categories of guest complaints.' },
  { key: 'document', label: 'Document categories', hint: 'Folders of the company document archive.' },
  { key: 'inventory', label: 'Inventory categories', hint: 'Categories of room inventory items.' },
]

export const CATEGORY_KIND_KEYS = CATEGORY_KINDS.map((k) => k.key) as [CategoryKind, ...CategoryKind[]]

const categoryItem = z.string().trim().min(1, 'Empty category').max(60, 'Keep categories under 60 characters')

export const categoriesSchema = z.record(z.enum(CATEGORY_KIND_KEYS), z.array(categoryItem).max(100, 'Too many categories'))
export type CategoriesInput = z.input<typeof categoriesSchema>

/* ------------------------------------------------------------------ */
/* Organisation                                                        */
/* ------------------------------------------------------------------ */

const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code')

export const organisationSchema = z.object({
  name: z.string().trim().min(2, 'Organisation name is required').max(80),
  base_currency: currencyCode,
  display_currencies: z.array(currencyCode).max(8, 'At most 8 display currencies').default([]),
  vat_rate: z.coerce.number().min(0, 'VAT rate must be 0 or more').max(100, 'VAT rate cannot exceed 100').default(0),
  prices_include_vat: z.boolean().default(true),
  fiscal_year_start_month: z.coerce.number().int().min(1).max(12).default(1),
  alerts: z.object({
    fire_extinguisher_days: z.coerce.number().int().min(0).max(365).default(30),
    arrivals_window_days: z.coerce.number().int().min(0).max(90).default(7),
    departures_window_days: z.coerce.number().int().min(0).max(90).default(7),
  }),
  partner_hour_rate: z.coerce.number().min(0).max(10_000_000).default(0),
  external_links: z
    .array(
      z.object({
        label: z.string().trim().min(1, 'Label is required').max(60),
        url: z.url({ message: 'Enter a full URL starting with https://' }).max(500),
      }),
    )
    .max(20, 'At most 20 links')
    .default([]),
})
export type OrganisationInput = z.input<typeof organisationSchema>

/* ------------------------------------------------------------------ */
/* Invoice details                                                     */
/* ------------------------------------------------------------------ */

export const invoiceSettingsSchema = z.object({
  prefix: z.string().trim().min(1, 'Prefix is required').max(12, 'Keep the prefix short'),
  company_name: z.string().trim().max(120).default(''),
  address: z.string().trim().max(600).default(''),
  tax_id: z.string().trim().max(60).default(''),
  branch: z.string().trim().max(60).default(''),
  email: z.union([z.email('Enter a valid email'), z.literal('')]).default(''),
  phone: z.string().trim().max(40).default(''),
  signatory: z.string().trim().max(80).default(''),
  footer: z.string().trim().max(600).default(''),
  logo_path: z.union([z.string().max(500), z.null()]).default(null),
})
export type InvoiceSettingsInput = z.input<typeof invoiceSettingsSchema>

/* ------------------------------------------------------------------ */
/* Properties                                                          */
/* ------------------------------------------------------------------ */

function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export const propertySchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, 'Name is required').max(80),
  timezone: z.string().trim().min(1, 'Choose a timezone').max(64).refine(isValidTimezone, 'Unknown timezone'),
  address: z.union([z.string().trim().max(400), z.null()]).optional(),
  active: z.boolean().default(true),
})
export type PropertyInput = z.input<typeof propertySchema>

/* ------------------------------------------------------------------ */
/* Payment methods                                                     */
/* ------------------------------------------------------------------ */

export const paymentMethodSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, 'Name is required').max(60),
  account_id: z.union([z.uuid(), z.literal(''), z.null()]).optional(),
  active: z.boolean().default(true),
  sort: z.coerce.number().int().min(0).max(999).default(0),
})
export type PaymentMethodInput = z.input<typeof paymentMethodSchema>

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */

export const inviteSchema = z.object({
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  role_id: z.uuid('Choose a role'),
})
export type InviteInput = z.input<typeof inviteSchema>

export const memberRoleSchema = z.object({ membership_id: z.uuid(), role_id: z.uuid('Choose a role') })
export type MemberRoleInput = z.input<typeof memberRoleSchema>

export const memberStatusSchema = z.object({ membership_id: z.uuid(), status: z.enum(['active', 'suspended']) })
export type MemberStatusInput = z.input<typeof memberStatusSchema>

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

export const ROLE_TEMPLATES = ['Owner', 'Manager', 'Finance', 'Legal', 'Partner', 'Staff', 'Viewer'] as const
export type RoleTemplate = (typeof ROLE_TEMPLATES)[number]

export const permSchema = z.object({ view: z.boolean(), add: z.boolean(), edit: z.boolean(), delete: z.boolean() })

export const rolePermissionsSchema = z.object({
  role_id: z.uuid(),
  permissions: z.record(z.string(), permSchema),
})
export type RolePermissionsInput = z.input<typeof rolePermissionsSchema>

export const roleCreateSchema = z.object({
  name: z.string().trim().min(2, 'Role name is required').max(40),
  template: z.enum(ROLE_TEMPLATES).optional(),
  copy_from_role_id: z.union([z.uuid(), z.literal('')]).optional(),
})
export type RoleCreateInput = z.input<typeof roleCreateSchema>

export const roleRenameSchema = z.object({ role_id: z.uuid(), name: z.string().trim().min(2, 'Role name is required').max(40) })
export type RoleRenameInput = z.input<typeof roleRenameSchema>

export const PERM_FULL: Perm = { view: true, add: true, edit: true, delete: true }
export const PERM_EDIT: Perm = { view: true, add: true, edit: true, delete: false }
export const PERM_VIEW: Perm = { view: true, add: false, edit: false, delete: false }
export const PERM_NONE: Perm = { view: false, add: false, edit: false, delete: false }

/**
 * TypeScript mirror of app_role_template() in migrations/0002_saas_tenancy.sql.
 * Kept here because the typed Supabase client does not expose that function.
 */
export function roleTemplate(role: RoleTemplate | 'Empty'): Permissions {
  const result: Permissions = {}
  for (const { key: m } of MODULES) {
    let p: Perm
    switch (role) {
      case 'Owner':
        p = PERM_FULL
        break
      case 'Manager':
        p = m === 'settings' ? PERM_VIEW : PERM_FULL
        break
      case 'Finance':
        p = ['expenses', 'revenue', 'accounts', 'legal', 'budget', 'founding', 'overview'].includes(m) ? PERM_FULL : ['settings', 'logins'].includes(m) ? PERM_NONE : PERM_VIEW
        break
      case 'Legal':
        p = m === 'legal' ? PERM_EDIT : ['revenue', 'expenses', 'documents'].includes(m) ? PERM_VIEW : PERM_NONE
        break
      case 'Partner':
        p = ['shareholder_dashboard', 'founding', 'shareholder_work', 'shareholder_profiles', 'shareholder_meetings', 'budget', 'tasks'].includes(m)
          ? PERM_EDIT
          : ['settings', 'logins'].includes(m)
            ? PERM_NONE
            : PERM_VIEW
        break
      case 'Staff':
        p = ['guests', 'tasks', 'complaints', 'rooms', 'occupancy', 'gm_dashboard'].includes(m) ? PERM_EDIT : PERM_NONE
        break
      case 'Viewer':
        p = ['settings', 'logins'].includes(m) ? PERM_NONE : PERM_VIEW
        break
      default:
        p = PERM_NONE
    }
    result[m] = { ...p }
  }
  return result
}

/** Keeps only known module keys and boolean cells. */
export function normalisePermissions(input: Record<string, Partial<Perm> | undefined>): Permissions {
  const out: Permissions = {}
  for (const { key } of MODULES) {
    const cell = input[key] ?? {}
    const perm = {} as Perm
    for (const a of ACTIONS) perm[a] = Boolean(cell[a])
    out[key] = perm
  }
  return out
}

export function fullMatrix(perms: Permissions | null | undefined): Record<ModuleKey, Perm> {
  const out = {} as Record<ModuleKey, Perm>
  for (const { key } of MODULES) {
    const c = perms?.[key]
    out[key] = { view: !!c?.view, add: !!c?.add, edit: !!c?.edit, delete: !!c?.delete }
  }
  return out
}

export const ACTION_LABELS: Record<Action, string> = { view: 'View', add: 'Add', edit: 'Edit', delete: 'Delete' }

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export const profileSchema = z.object({ full_name: z.string().trim().min(2, 'Enter your name').max(80) })
export type ProfileInput = z.input<typeof profileSchema>

export const passwordSchema = z
  .object({
    current: z.string().min(1, 'Enter your current password'),
    next: z.string().min(8, 'Use at least 8 characters').max(72),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })
  .refine((d) => d.next !== d.current, { message: 'Choose a different password', path: ['next'] })
export type PasswordInput = z.input<typeof passwordSchema>

export type PasswordStrength = { score: 0 | 1 | 2 | 3; label: 'Weak' | 'Good' | 'Strong' }

/** Strength = number of character classes among [A-Z], [0-9], symbol (min length 8). */
export function passwordStrength(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: 'Weak' }
  let classes = 0
  if (/[A-Z]/.test(pw)) classes++
  if (/[0-9]/.test(pw)) classes++
  if (/[^A-Za-z0-9]/.test(pw)) classes++
  if (pw.length < 8 || classes <= 1) return { score: 1, label: 'Weak' }
  if (classes === 2) return { score: 2, label: 'Good' }
  return { score: 3, label: 'Strong' }
}

/* ------------------------------------------------------------------ */
/* Data: export and reset                                              */
/* ------------------------------------------------------------------ */

export const EXPORT_TABLES = [
  'guests',
  'expenses',
  'revenue',
  'founding_contributions',
  'shareholder_work',
  'todos',
  'budget_rent',
  'budget_revenue',
  'budget_expenses',
  'budget_room_setup',
  'complaints',
  'staff_hours',
  'shareholder_meetings',
  'shareholders',
  'company_documents',
  'rooms',
  'accounts',
  'account_movements',
  'invoices',
  'audit_log',
] as const
export type ExportTable = (typeof EXPORT_TABLES)[number]

/** Must match the allowed list in app_reset_organization_data() (migration 0002). */
export const RESET_TABLES = [
  'guests',
  'expenses',
  'revenue',
  'founding_contributions',
  'shareholder_work',
  'todos',
  'budget_rent',
  'budget_revenue',
  'budget_expenses',
  'budget_room_setup',
  'complaints',
  'staff_hours',
  'shareholder_meetings',
  'company_documents',
  'account_movements',
  'invoices',
] as const
export type ResetTable = (typeof RESET_TABLES)[number]

export const TABLE_LABELS: Record<ExportTable, string> = {
  guests: 'Guests / bookings',
  expenses: 'Expenses',
  revenue: 'Revenue',
  founding_contributions: 'Capital contributions',
  shareholder_work: 'Partner work hours',
  todos: 'Tasks',
  budget_rent: 'Budget: rent',
  budget_revenue: 'Budget: revenue',
  budget_expenses: 'Budget: expenses',
  budget_room_setup: 'Budget: room setup',
  complaints: 'Complaints',
  staff_hours: 'Staff hours',
  shareholder_meetings: 'Meetings',
  shareholders: 'Partners',
  company_documents: 'Documents',
  rooms: 'Rooms',
  accounts: 'Accounts',
  account_movements: 'Account movements (ledger)',
  invoices: 'Invoices',
  audit_log: 'Audit log',
}

export const exportTableSchema = z.enum(EXPORT_TABLES)

export const resetSchema = z.object({
  tables: z.array(z.enum(RESET_TABLES)).min(1, 'Choose at least one table'),
  confirm: z.string(),
})
export type ResetInput = z.input<typeof resetSchema>
