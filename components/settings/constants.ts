import type { LucideIcon } from 'lucide-react'
import { BadgeDollarSign, Building2, CreditCard, Database, FileText, Home, ShieldCheck, Tags, UserCircle2, Users } from 'lucide-react'

export interface SettingsNavItem {
  key: string
  label: string
  href: string
  icon: LucideIcon
  /** Requires settings.view (the profile page is open to every member). */
  admin: boolean
}

export const SETTINGS_NAV: SettingsNavItem[] = [
  { key: 'profile', label: 'Profile', href: '/app/settings/profile', icon: UserCircle2, admin: false },
  { key: 'organisation', label: 'Organisation', href: '/app/settings/organisation', icon: Building2, admin: true },
  { key: 'invoices', label: 'Invoices', href: '/app/settings/invoices', icon: FileText, admin: true },
  { key: 'categories', label: 'Categories', href: '/app/settings/categories', icon: Tags, admin: true },
  { key: 'properties', label: 'Properties', href: '/app/settings/properties', icon: Home, admin: true },
  { key: 'payments', label: 'Payments', href: '/app/settings/payments', icon: CreditCard, admin: true },
  { key: 'team', label: 'Team', href: '/app/settings/team', icon: Users, admin: true },
  { key: 'roles', label: 'Roles', href: '/app/settings/roles', icon: ShieldCheck, admin: true },
  { key: 'data', label: 'Data', href: '/app/settings/data', icon: Database, admin: true },
  { key: 'billing', label: 'Billing', href: '/app/settings/billing', icon: BadgeDollarSign, admin: true },
]

/** Same list as the onboarding form; the current value is added when missing. */
export const TIMEZONES = [
  'Asia/Bangkok', 'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Jakarta', 'Asia/Ho_Chi_Minh', 'Asia/Manila', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Asia/Dubai', 'Asia/Kolkata',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'Europe/Amsterdam', 'Europe/Lisbon', 'Europe/Athens',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'America/Mexico_City', 'America/Sao_Paulo',
  'Australia/Sydney', 'Australia/Perth', 'Pacific/Auckland', 'Africa/Johannesburg', 'Africa/Cairo', 'UTC',
]

export function timezoneOptions(current: string | null | undefined) {
  return current && !TIMEZONES.includes(current) ? [current, ...TIMEZONES] : TIMEZONES
}

/** Plan tiers shown on the billing page. Names match components/marketing/Pricing.tsx. */
export const PLAN_TIERS = [
  { key: 'starter', name: 'Starter', monthly: 29, yearly: 24, blurb: 'One property run by a small team.', features: ['1 property · up to 15 rooms', '3 team members', 'Bookings, occupancy, invoices', 'Expenses with receipt scanning', 'Revenue and cash accounts', 'Exports to Excel, CSV, PDF'] },
  { key: 'growth', name: 'Growth', monthly: 79, yearly: 65, blurb: 'Several properties, partners and advisers.', features: ['Up to 3 properties · 60 rooms', '10 team members', 'Everything in Starter', 'Legal & accounting review', 'Budgets and budget vs actual', 'Partner capital, work hours, meetings', 'Audit log and roles editor'] },
  { key: 'enterprise', name: 'Enterprise', monthly: null, yearly: null, blurb: 'Groups and management companies.', features: ['Unlimited properties and users', 'Consolidated reporting', 'Single sign-on', 'Custom data retention', 'Priority support and onboarding'] },
] as const
