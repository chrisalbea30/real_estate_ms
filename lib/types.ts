// Row types for the tables in migrations/0001 + 0002. Numeric columns arrive
// as JSON numbers from PostgREST; dates as 'YYYY-MM-DD' strings.

import type { ModuleKey } from '@/lib/modules'

export type UUID = string
export type ISODate = string // YYYY-MM-DD
export type ISODateTime = string

export type Perm = {
  view: boolean
  add: boolean
  edit: boolean
  delete: boolean
}
export type Permissions = Partial<Record<ModuleKey, Perm>>

export type CategoryKind =
  | 'expense'
  | 'booking_source'
  | 'revenue_source'
  | 'task_department'
  | 'task_project'
  | 'staff_department'
  | 'complaint'
  | 'document'
  | 'inventory'

export type InvoiceSettings = {
  prefix: string
  company_name: string
  address: string
  tax_id: string
  branch: string
  email: string
  phone: string
  signatory: string
  footer: string
  logo_path: string | null
}

export type OrgSettings = {
  base_currency: string
  display_currencies: string[]
  vat_rate: number
  prices_include_vat: boolean
  invoice: InvoiceSettings
  categories: Record<CategoryKind, string[]>
  alerts: {
    fire_extinguisher_days: number
    arrivals_window_days: number
    departures_window_days: number
  }
  external_links: { label: string; url: string }[]
  partner_hour_rate: number
  fiscal_year_start_month: number
}

export type Organization = {
  id: UUID
  name: string
  slug: string | null
  plan: string
  trial_ends_at: ISODateTime | null
  settings: OrgSettings
  created_by: UUID | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type Property = {
  id: UUID
  organization_id: UUID
  name: string
  timezone: string
  address: string | null
  active: boolean
  settings: Record<string, unknown>
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type Profile = {
  id: UUID
  email: string | null
  full_name: string | null
  avatar_url: string | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type OrgRole = {
  id: UUID
  organization_id: UUID
  name: string
  is_system: boolean
  permissions: Permissions
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type Membership = {
  id: UUID
  organization_id: UUID
  user_id: UUID
  role_id: UUID
  status: 'active' | 'suspended'
  display_name: string | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type Invitation = {
  id: UUID
  organization_id: UUID
  email: string
  role_id: UUID
  token: UUID
  invited_by: UUID | null
  status: 'pending' | 'accepted' | 'revoked'
  expires_at: ISODateTime
  accepted_at: ISODateTime | null
  created_at: ISODateTime
}

export type Account = {
  id: UUID
  organization_id: UUID
  name: string
  type: 'bank' | 'cash' | 'wallet' | 'other'
  currency: string | null
  opening_balance: number
  notes: string | null
  active: boolean
  sort: number
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type AccountBalance = Account & {
  balance: number
  last_movement_at: ISODateTime | null
  movement_count: number
}

export type PaymentMethod = {
  id: UUID
  organization_id: UUID
  name: string
  account_id: UUID | null
  active: boolean
  sort: number
}

export type AccountMovement = {
  id: UUID
  organization_id: UUID
  account_id: UUID
  amount: number
  occurred_on: ISODate
  description: string | null
  source_table: string | null
  source_id: UUID | null
  created_by: UUID | null
  created_at: ISODateTime
}

export type Room = {
  id: UUID
  organization_id: UUID
  property_id: UUID
  number: number
  name: string
  active: boolean
  created_at: ISODateTime
}

export type RoomPhoto = {
  id: UUID
  organization_id: UUID
  property_id: UUID | null
  room_id: UUID
  url: string // storage path or external URL
  position: number
  created_at: ISODateTime
}

export type RoomInventory = {
  id: UUID
  organization_id: UUID
  property_id: UUID | null
  room_id: UUID
  name: string
  category: string
  quantity: number
  notes: string | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type FireExtinguisher = {
  id: UUID
  organization_id: UUID
  property_id: UUID | null
  room_id: UUID
  location: string
  serial_number: string | null
  expiry_date: ISODate
  last_inspected: ISODate | null
  notes: string | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type Guest = {
  id: UUID
  organization_id: UUID
  property_id: UUID
  room: number
  room_id: UUID | null
  check_in: ISODate
  check_out: ISODate
  guest_name: string
  guest_count: number | null
  amount_thb_day: number | null
  amount_thb_stay: number | null
  paid: string | null // payment method label
  payment_method_id: UUID | null
  payment: number | null
  notes: string | null
  email: string | null
  phone: string | null
  tm30: boolean | null
  passport_number: string | null
  passport_expiry: ISODate | null
  show_on_legal: boolean
  payment_1_date: ISODate | null
  payment_1_amount: number | null
  payment_2_date: ISODate | null
  payment_2_amount: number | null
  payment_3_date: ISODate | null
  payment_3_amount: number | null
  booking_source: string | null
  add_to_revenue: boolean
  file_url: string | null
  created_by: UUID | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type Revenue = {
  id: UUID
  organization_id: UUID
  property_id: UUID | null
  date: ISODate
  type: string | null
  supplier: string | null
  amount_thb: number | null
  notes: string | null
  guest_id: UUID | null
  file_url: string | null
  show_on_legal: boolean
  created_by: UUID | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type LegalStatus = 'Pending' | 'Accepted' | 'Clarification Needed' | 'Rejected'
export const LEGAL_STATUSES: LegalStatus[] = ['Pending', 'Accepted', 'Clarification Needed', 'Rejected']
export const AUDIT_STATUSES = ['To check', 'Checked', 'YES'] as const

export type Expense = {
  id: UUID
  organization_id: UUID
  property_id: UUID | null
  audit: string | null
  payment_date: ISODate | null
  transaction_number: string | null
  document_number: string | null
  category: string | null
  subcategory: string | null
  supplier: string | null
  amount: number | null
  currency: string | null
  amount_base: number | null
  fx_rate: number | null
  method: string | null
  payment_method_id: UUID | null
  paid_by: string | null
  type: string | null
  description: string | null
  is_legal: boolean | null
  legal_status: LegalStatus | null
  legal_notes: string | null
  legal_reviewed_at: ISODate | null
  file_url: string | null
  created_by: UUID | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type InvoiceLine = {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

export type Invoice = {
  id: UUID
  organization_id: UUID
  property_id: UUID | null
  guest_id: UUID | null
  number: string
  year: number
  seq: number
  issued_date: ISODate
  due_date: ISODate | null
  currency: string
  subtotal: number
  vat_rate: number
  vat_amount: number
  total: number
  deposit: number
  balance_due: number
  bill_to: { name?: string | null; email?: string | null; phone?: string | null; address?: string | null; passport?: string | null }
  lines: InvoiceLine[]
  issuer: Partial<InvoiceSettings> & { property_name?: string }
  notes: string | null
  status: 'issued' | 'void'
  public_token: UUID
  created_by: UUID | null
  created_at: ISODateTime
}

export type Partner = {
  id: UUID
  organization_id: UUID
  name: string
  share_percentage: number | null
  amount_to_found_thb: number | null
  role: string | null
  bio: string | null
  photo_url: string | null
  email: string | null
  phone: string | null
  nationality: string | null
  joined_date: ISODate | null
  hour_rate: number | null
  user_id: UUID | null
  active: boolean
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type FoundingContribution = {
  id: UUID
  organization_id: UUID
  date: ISODate
  method: string | null
  shareholder: string
  shareholder_id: UUID | null
  amount_thb: number | null
  amount_eur: number | null
  notes: string | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type PartnerWork = {
  id: UUID
  organization_id: UUID
  month: ISODate // first of month
  shareholder: string
  shareholder_id: UUID | null
  hours: number | null
  hour_rate: number | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type MeetingAttachment = {
  name: string
  url: string
}

export type Meeting = {
  id: UUID
  organization_id: UUID
  meeting_date: ISODate
  title: string
  participants: string[]
  agenda: string | null
  decisions: string | null
  action_items: string | null
  attachments: MeetingAttachment[]
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type TaskStatus = 'Pending' | 'Ongoing' | 'Complete' | 'Blocked'
export const TASK_STATUSES: TaskStatus[] = ['Pending', 'Ongoing', 'Complete', 'Blocked']

export type Task = {
  id: UUID
  organization_id: UUID
  property_id: UUID | null
  project: string | null
  department: string | null
  topic: string
  responsible_person: string | null
  assignee_user_id: UUID | null
  status_notes: string | null
  target_date: ISODate | null
  status: TaskStatus
  visible_to_gm: boolean
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type StaffHour = {
  id: UUID
  organization_id: UUID
  property_id: UUID | null
  staff_name: string
  role: string | null
  department: string | null
  date: ISODate
  hours: number
  hourly_rate_thb: number | null
  notes: string | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type ComplaintSeverity = 'Low' | 'Medium' | 'High' | 'Critical'
export type ComplaintStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed'
export const COMPLAINT_SEVERITIES: ComplaintSeverity[] = ['Low', 'Medium', 'High', 'Critical']
export const COMPLAINT_STATUSES: ComplaintStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed']

export type Complaint = {
  id: UUID
  organization_id: UUID
  property_id: UUID | null
  date: ISODate
  guest_name: string
  room: number | null
  room_id: UUID | null
  category: string | null
  description: string
  severity: ComplaintSeverity
  status: ComplaintStatus
  resolution_notes: string | null
  resolved_at: ISODate | null
  filed_by: string | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type CompanyDocument = {
  id: UUID
  organization_id: UUID
  property_id: UUID | null
  name: string
  category: string
  document_date: ISODate | null
  file_url: string | null
  notes: string | null
  uploaded_by: string | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type WebCredential = {
  id: UUID
  organization_id: UUID
  service_name: string
  url: string | null
  username: string | null
  password_enc: string | null
  notes: string | null
  created_by: string | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export type BudgetRevenue = {
  id: UUID
  organization_id: UUID
  property_id: UUID | null
  year: number
  month: number
  room_name: string
  amount_thb: number | null
  season: string | null
  created_at: ISODateTime
}

export type BudgetExpense = {
  id: UUID
  organization_id: UUID
  property_id: UUID | null
  year: number
  month: number
  category: string
  subcategory: string | null
  item_name: string
  amount_thb: number | null
  expense_type: 'OPEX' | 'CAPEX'
  created_at: ISODateTime
}

export type BudgetRent = {
  id: UUID
  organization_id: UUID
  property_id: UUID | null
  year_number: number
  year_label: string | null
  rent_thb: number
  vat_amount: number | null
  created_at: ISODateTime
}

export type BudgetRoomSetup = {
  id: UUID
  organization_id: UUID
  property_id: UUID | null
  year: number
  room_name: string
  high_season_rate_thb: number | null
  low_season_rate_thb: number | null
  target_occupancy_pct: number | null
  notes: string | null
}

export type ExchangeRate = {
  id: UUID
  base_currency: string
  quote_currency: string
  rate: number
  source: string
  fetched_at: ISODateTime
}

export type AuditLogRow = {
  id: number
  organization_id: UUID | null
  table_name: string
  row_id: UUID | null
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  actor: UUID | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: ISODateTime
}
