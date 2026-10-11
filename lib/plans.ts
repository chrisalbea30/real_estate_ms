// The one place that defines pricing and plan limits. The landing page, the
// Workspace and Billing screens and the server-side limit checks all read this.
//
// Model: you pay per WORKSPACE. Each plan includes a number of PEOPLE (seats);
// extra people are charged per person. Every plan includes every screen; plans
// differ only in people, properties and file storage.
//
// PRICES ARE PLACEHOLDERS: change the numbers here and they change everywhere.
// Keep app_plan_limits() in migrations/0003_plans_and_limits.sql in step.

export type PlanKey = 'trial' | 'starter' | 'growth' | 'enterprise'

export interface Plan {
  key: PlanKey
  name: string
  blurb: string
  /** Price per workspace per month when billed monthly / yearly (USD). null = by quote. */
  monthly: number | null
  yearly: number | null
  /** People included in the workspace price. null = agreed individually. */
  seats: number | null
  /** Price per extra person per month (monthly / yearly billing). null = cannot add (trial) or by quote. */
  extraSeatMonthly: number | null
  extraSeatYearly: number | null
  /** Properties allowed in one workspace. null = unlimited. */
  properties: number | null
  /** File storage allowance for receipts, documents and photos, in GB. null = agreed individually. */
  storageGb: number | null
  /** Shown as a public plan on the landing page. */
  public: boolean
}

export const TRIAL_DAYS = 14

export const PLANS: Record<PlanKey, Plan> = {
  trial: { key: 'trial', name: 'Free trial', blurb: `${TRIAL_DAYS} days with everything switched on.`, monthly: 0, yearly: 0, seats: 5, extraSeatMonthly: null, extraSeatYearly: null, properties: 1, storageGb: 1, public: false },
  starter: { key: 'starter', name: 'Starter', blurb: 'One property run by a small team.', monthly: 29, yearly: 24, seats: 3, extraSeatMonthly: 6, extraSeatYearly: 5, properties: 1, storageGb: 5, public: true },
  growth: { key: 'growth', name: 'Growth', blurb: 'Several properties, partners and advisers.', monthly: 79, yearly: 65, seats: 10, extraSeatMonthly: 5, extraSeatYearly: 4, properties: 5, storageGb: 25, public: true },
  enterprise: { key: 'enterprise', name: 'Enterprise', blurb: 'Groups and management companies.', monthly: null, yearly: null, seats: null, extraSeatMonthly: null, extraSeatYearly: null, properties: null, storageGb: null, public: true },
}

export const PUBLIC_PLANS: Plan[] = [PLANS.starter, PLANS.growth, PLANS.enterprise]

export function planOf(key: string | null | undefined): Plan {
  return PLANS[(key ?? 'trial').toLowerCase() as PlanKey] ?? PLANS.trial
}

/** People a workspace may have: the plan's included seats plus any extra seats bought. null = no limit. */
export function seatLimit(plan: Plan, extraSeats = 0): number | null {
  return plan.seats == null ? null : plan.seats + Math.max(0, extraSeats)
}

/** Monthly price of one workspace with a given number of people. null when the plan is by quote. */
export function priceFor(plan: Plan, people: number, yearly: boolean): { base: number; extraPeople: number; extraCost: number; total: number } | null {
  const base = yearly ? plan.yearly : plan.monthly
  const per = yearly ? plan.extraSeatYearly : plan.extraSeatMonthly
  if (base == null || plan.seats == null) return null
  const extraPeople = Math.max(0, people - plan.seats)
  if (extraPeople > 0 && per == null) return null
  const extraCost = extraPeople * (per ?? 0)
  return { base, extraPeople, extraCost, total: base + extraCost }
}

/** What counts as a person: active or suspended members plus invitations still waiting to be accepted. */
export function seatsUsed(members: number, pendingInvitations: number) {
  return members + pendingInvitations
}

export function trialState(plan: string | null | undefined, trialEndsAt: string | null | undefined, todayIso: string) {
  const onTrial = planOf(plan).key === 'trial'
  if (!onTrial) return { onTrial: false, daysLeft: null as number | null, ended: false }
  if (!trialEndsAt) return { onTrial: true, daysLeft: null as number | null, ended: false }
  const a = Date.UTC(+todayIso.slice(0, 4), +todayIso.slice(5, 7) - 1, +todayIso.slice(8, 10))
  const b = Date.UTC(+trialEndsAt.slice(0, 4), +trialEndsAt.slice(5, 7) - 1, +trialEndsAt.slice(8, 10))
  const daysLeft = Math.round((b - a) / 86_400_000)
  return { onTrial: true, daysLeft, ended: daysLeft < 0 }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(0, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}
