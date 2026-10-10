import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  ClipboardList,
  PieChart,
  BedDouble,
  CalendarDays,
  DoorOpen,
  Receipt,
  Banknote,
  Wallet,
  Scale,
  Target,
  Landmark,
  Clock,
  Users,
  MessagesSquare,
  Timer,
  MessageSquareWarning,
  FolderArchive,
  KeyRound,
  Settings,
} from 'lucide-react'

// Module keys must match app_role_template() in migrations/0002_saas_tenancy.sql
export type ModuleKey =
  | 'overview'
  | 'gm_dashboard'
  | 'shareholder_dashboard'
  | 'guests'
  | 'occupancy'
  | 'rooms'
  | 'expenses'
  | 'revenue'
  | 'accounts'
  | 'legal'
  | 'budget'
  | 'founding'
  | 'shareholder_work'
  | 'shareholder_profiles'
  | 'shareholder_meetings'
  | 'tasks'
  | 'staff_hours'
  | 'complaints'
  | 'documents'
  | 'logins'
  | 'settings'

export type Action = 'view' | 'add' | 'edit' | 'delete'
export const ACTIONS: Action[] = ['view', 'add', 'edit', 'delete']

export type ModuleGroup = 'Dashboards' | 'Operations' | 'Finance' | 'Partners' | 'Company' | 'Admin'

export interface ModuleDef {
  key: ModuleKey
  label: string
  shortLabel?: string
  href: string
  icon: LucideIcon
  group: ModuleGroup
  description: string
  /** Order in the phone bottom bar; undefined = only in the "More" sheet */
  mobileTab?: number
}

export const MODULES: ModuleDef[] = [
  { key: 'overview', label: 'Overview', shortLabel: 'Home', href: '/app', icon: LayoutDashboard, group: 'Dashboards', description: 'KPIs, cash position, who is in-house and arriving', mobileTab: 1 },
  { key: 'gm_dashboard', label: 'Operations', shortLabel: 'Ops', href: '/app/operations', icon: ClipboardList, group: 'Dashboards', description: "Today's check-ins and check-outs, alerts, collections, tasks" },
  { key: 'shareholder_dashboard', label: 'Partner dashboard', shortLabel: 'Partners', href: '/app/partner-dashboard', icon: PieChart, group: 'Dashboards', description: 'Financial overview, funding, shareholding, budget vs actual, KPIs, forecast' },

  { key: 'guests', label: 'Guests', href: '/app/guests', icon: BedDouble, group: 'Operations', description: 'Bookings, payments, invoices, revenue and legal flags', mobileTab: 2 },
  { key: 'occupancy', label: 'Occupancy', href: '/app/occupancy', icon: CalendarDays, group: 'Operations', description: 'Month calendar of rooms and nights' },
  { key: 'rooms', label: 'Rooms', href: '/app/rooms', icon: DoorOpen, group: 'Operations', description: 'Photos, inventory, fire safety, current and upcoming guests' },
  { key: 'tasks', label: 'Tasks', href: '/app/tasks', icon: Target, group: 'Operations', description: 'To-dos by department with assignees and due dates' },
  { key: 'complaints', label: 'Complaints', href: '/app/complaints', icon: MessageSquareWarning, group: 'Operations', description: 'Guest complaints with severity and resolution' },
  { key: 'staff_hours', label: 'Staff hours', href: '/app/staff-hours', icon: Timer, group: 'Operations', description: 'Hours and pay per staff member' },

  { key: 'revenue', label: 'Revenue', href: '/app/revenue', icon: Banknote, group: 'Finance', description: 'Single source of truth: booking revenue plus manual income', mobileTab: 4 },
  { key: 'expenses', label: 'Expenses', href: '/app/expenses', icon: Receipt, group: 'Finance', description: 'Expenses with receipt scanning, attachments and legal sharing', mobileTab: 3 },
  { key: 'accounts', label: 'Accounts', href: '/app/accounts', icon: Wallet, group: 'Finance', description: 'Cash position per account and the movement ledger' },
  { key: 'legal', label: 'Legal & accounting', shortLabel: 'Legal', href: '/app/legal', icon: Scale, group: 'Finance', description: 'Review of shared expenses and revenue for the lawyer and accountant' },
  { key: 'budget', label: 'Budget', href: '/app/budget', icon: Landmark, group: 'Finance', description: 'Revenue matrix, expense items, rent schedule, budget vs actual' },

  { key: 'shareholder_profiles', label: 'Partners', href: '/app/partners', icon: Users, group: 'Partners', description: 'Partner and shareholder profiles with ownership' },
  { key: 'founding', label: 'Capital', href: '/app/founding', icon: Landmark, group: 'Partners', description: 'Founding contributions per partner' },
  { key: 'shareholder_work', label: 'Partner work', href: '/app/partner-work', icon: Clock, group: 'Partners', description: 'Hours worked by partners at an hourly rate' },
  { key: 'shareholder_meetings', label: 'Meetings', href: '/app/meetings', icon: MessagesSquare, group: 'Partners', description: 'Meeting minutes, decisions, action items, attachments' },

  { key: 'documents', label: 'Documents', href: '/app/documents', icon: FolderArchive, group: 'Company', description: 'Company document archive by category' },
  { key: 'logins', label: 'Log-in vault', shortLabel: 'Vault', href: '/app/logins', icon: KeyRound, group: 'Company', description: 'Encrypted third-party logins' },

  { key: 'settings', label: 'Settings', href: '/app/settings', icon: Settings, group: 'Admin', description: 'Organisation, properties, rooms, team, roles, categories, invoices, data' },
]

export const MODULE_BY_KEY: Record<ModuleKey, ModuleDef> = Object.fromEntries(
  MODULES.map((m) => [m.key, m]),
) as Record<ModuleKey, ModuleDef>

export const MODULE_GROUPS: ModuleGroup[] = ['Dashboards', 'Operations', 'Finance', 'Partners', 'Company', 'Admin']

/** Longest-prefix match of a pathname to a module. */
export function moduleForPath(pathname: string): ModuleDef | null {
  const sorted = [...MODULES].sort((a, b) => b.href.length - a.href.length)
  for (const m of sorted) {
    if (pathname === m.href || pathname.startsWith(m.href + '/')) return m
  }
  return null
}
