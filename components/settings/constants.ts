import type { LucideIcon } from 'lucide-react'
import { BadgeDollarSign, Briefcase, Building2, CreditCard, Database, FileText, Home, ShieldCheck, Tags, UserCircle2, Users } from 'lucide-react'

import { SHOW_PRICING } from '@/lib/plans'

export interface SettingsNavItem {
  key: string
  label: string
  href: string
  icon: LucideIcon
  /** Requires settings.view (the profile page is open to every member). */
  admin: boolean
}

export const SETTINGS_NAV: SettingsNavItem[] = [
  { key: 'workspace', label: 'Workspace', href: '/app/settings/workspace', icon: Briefcase, admin: true },
  { key: 'team', label: 'People', href: '/app/settings/team', icon: Users, admin: true },
  { key: 'profile', label: 'Your profile', href: '/app/settings/profile', icon: UserCircle2, admin: false },
  { key: 'organisation', label: 'Organisation', href: '/app/settings/organisation', icon: Building2, admin: true },
  { key: 'invoices', label: 'Invoices', href: '/app/settings/invoices', icon: FileText, admin: true },
  { key: 'categories', label: 'Categories', href: '/app/settings/categories', icon: Tags, admin: true },
  { key: 'properties', label: 'Properties', href: '/app/settings/properties', icon: Home, admin: true },
  { key: 'payments', label: 'Payments', href: '/app/settings/payments', icon: CreditCard, admin: true },
  { key: 'roles', label: 'Roles', href: '/app/settings/roles', icon: ShieldCheck, admin: true },
  { key: 'data', label: 'Data', href: '/app/settings/data', icon: Database, admin: true },
  { key: 'billing', label: SHOW_PRICING ? 'Billing' : 'Limits', href: '/app/settings/billing', icon: BadgeDollarSign, admin: true },
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
