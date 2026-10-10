import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/context'
import { createServerSupabase } from '@/lib/supabase/server'
import { MODULES, moduleForPath } from '@/lib/modules'
import { hasPerm, firstViewable } from '@/lib/permissions'
import { buildRateTable } from '@/lib/currency'
import { AppProvider, type AppSnapshot } from '@/components/app/AppProvider'
import { AppShell } from '@/components/app/AppShell'
import type { ExchangeRate, PaymentMethod, Room } from '@/lib/types'

const WEEK_MS = 7 * 86_400_000
function isStale(fetchedAt: string | null) {
  return !fetchedAt || Date.now() - new Date(fetchedAt).getTime() > WEEK_MS
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAppContext()
  if (!ctx) redirect('/login?next=/app')
  if ('needsOnboarding' in ctx) redirect('/onboarding')

  // Module gate (pages also check their own permission).
  const pathname = (await headers()).get('x-pathname') ?? '/app'
  const mod = moduleForPath(pathname)
  if (mod && !hasPerm(ctx.perms, mod.key, 'view') && !pathname.startsWith('/app/settings/profile')) {
    redirect(firstViewable(ctx.perms, MODULES))
  }

  const supabase = await createServerSupabase()
  const [rates, paymentMethods, rooms, partners, members] = await Promise.all([
    supabase.from('exchange_rates').select('*'),
    supabase.from('payment_methods').select('*').eq('organization_id', ctx.org.id).eq('active', true).order('sort'),
    supabase.from('rooms').select('*').eq('property_id', ctx.property.id).order('number'),
    supabase.from('shareholders').select('id, name').eq('organization_id', ctx.org.id).eq('active', true).order('name'),
    supabase.from('memberships').select('user_id, display_name, profiles:profiles!memberships_profile_fkey(full_name, email)').eq('organization_id', ctx.org.id).eq('status', 'active'),
  ])

  const rateRows = (rates.data ?? []) as ExchangeRate[]
  const latest = rateRows.reduce<string | null>((acc, r) => (!acc || r.fetched_at > acc ? r.fetched_at : acc), null)

  type MemberRow = { user_id: string; display_name: string | null; profiles: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null }
  const memberList = ((members.data ?? []) as MemberRow[]).map((m) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return { user_id: m.user_id, name: m.display_name || p?.full_name || p?.email || 'Member' }
  })

  const snapshot: AppSnapshot = {
    user: { id: ctx.userId, email: ctx.email, name: ctx.profile?.full_name || ctx.memberships[0]?.display_name || ctx.email },
    org: ctx.org,
    role: ctx.role,
    perms: ctx.perms,
    properties: ctx.properties,
    property: ctx.property,
    memberships: ctx.memberships.map((m) => ({ organization_id: m.organization_id, name: m.organizations?.name ?? 'Organisation' })),
    rates: buildRateTable(rateRows),
    ratesFetchedAt: latest,
    ratesStale: isStale(latest),
    paymentMethods: (paymentMethods.data ?? []) as PaymentMethod[],
    rooms: (rooms.data ?? []) as Room[],
    partners: (partners.data ?? []) as { id: string; name: string }[],
    members: memberList,
  }

  return (
    <AppProvider snapshot={snapshot}>
      <AppShell>{children}</AppShell>
    </AppProvider>
  )
}
