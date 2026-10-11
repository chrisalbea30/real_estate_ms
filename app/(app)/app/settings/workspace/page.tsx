import type { Metadata } from 'next'
import Link from 'next/link'
import { BadgeDollarSign, Building2, Database, FileText, Home, Plus, ShieldCheck, Tags, UserPlus, Users, CreditCard, DoorOpen, HardDrive } from 'lucide-react'
import { pageContext } from '@/lib/page'
import { createServerSupabase } from '@/lib/supabase/server'
import { getStorageUsage, getWorkspaceUsage } from '@/lib/usage'
import { formatBytes, priceFor, trialState, PLANS } from '@/lib/plans'
import { formatDate, formatNumber, todayIn } from '@/lib/format'
import { hasPerm } from '@/lib/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { SettingsCard } from '@/components/settings/SettingsCard'

export const metadata: Metadata = { title: 'Workspace' }

function Meter({ icon: Icon, label, used, limit, unit, note }: { icon: typeof Users; label: string; used: number; limit: number | null; unit?: string; note?: string }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : null
  const tone = pct == null ? 'bg-primary' : pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-primary'
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold tabular">
        {unit ?? formatNumber(used)}
        {limit != null && !unit && <span className="text-base font-normal text-muted"> of {formatNumber(limit)}</span>}
      </div>
      {pct != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${pct}% used`}>
          <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(3, pct)}%` }} />
        </div>
      )}
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </div>
  )
}

export default async function WorkspacePage() {
  const ctx = await pageContext('settings')
  const supabase = await createServerSupabase()
  const today = todayIn(ctx.property.timezone)
  const canEdit = hasPerm(ctx.perms, 'settings', 'edit')

  const count = (table: 'guests' | 'expenses' | 'revenue' | 'company_documents' | 'invoices') => supabase.from(table).select('id', { count: 'exact', head: true }).eq('organization_id', ctx.org.id)
  const [usage, storage, people, guests, expenses, revenue, documents, invoices] = await Promise.all([
    getWorkspaceUsage(ctx),
    getStorageUsage(ctx.org.id),
    supabase
      .from('memberships')
      .select('id, user_id, display_name, status, org_roles!memberships_role_id_fkey(name), profiles:profiles!memberships_profile_fkey(full_name, email)')
      .eq('organization_id', ctx.org.id)
      .order('created_at')
      .limit(8),
    count('guests'),
    count('expenses'),
    count('revenue'),
    count('company_documents'),
    count('invoices'),
  ])

  const plan = usage.plan
  const trial = trialState(ctx.org.plan, ctx.org.trial_ends_at, today)
  const price = priceFor(plan, usage.seatsUsed, true)
  const starter = priceFor(PLANS.starter, usage.seatsUsed, true)
  const growth = priceFor(PLANS.growth, usage.seatsUsed, true)
  const storageLimitBytes = plan.storageGb == null ? null : plan.storageGb * 1024 ** 3
  const seatsFull = usage.seatLimit != null && usage.seatsUsed >= usage.seatLimit

  type PersonRow = { id: string; user_id: string; display_name: string | null; status: string; org_roles: { name: string } | { name: string }[] | null; profiles: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null }
  const first = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v)
  const peopleRows = ((people.data ?? []) as unknown as PersonRow[]).map((m) => {
    const p = first(m.profiles)
    return { id: m.id, name: m.display_name || p?.full_name || p?.email || 'Member', email: p?.email ?? '', role: first(m.org_roles)?.name ?? '', status: m.status, you: m.user_id === ctx.userId }
  })

  const links = [
    { href: '/app/settings/team', icon: Users, label: 'People', text: 'Invite, change roles, remove' },
    { href: '/app/settings/roles', icon: ShieldCheck, label: 'Roles', text: 'What each role can see and do' },
    { href: '/app/settings/organisation', icon: Building2, label: 'Organisation', text: 'Name, currency, VAT, alerts' },
    { href: '/app/settings/properties', icon: Home, label: 'Properties', text: 'Sites in this workspace' },
    { href: '/app/rooms', icon: DoorOpen, label: 'Rooms', text: 'Rooms of the current property' },
    { href: '/app/settings/invoices', icon: FileText, label: 'Invoices', text: 'Company details and logo' },
    { href: '/app/settings/categories', icon: Tags, label: 'Categories', text: 'Your drop-down lists' },
    { href: '/app/settings/payments', icon: CreditCard, label: 'Payments', text: 'Payment methods and accounts' },
    { href: '/app/settings/data', icon: Database, label: 'Data', text: 'Export, change history, reset' },
    { href: '/app/settings/billing', icon: BadgeDollarSign, label: 'Billing', text: 'Plan and price' },
  ]

  return (
    <div>
      <PageHeader
        title={ctx.org.name}
        subtitle={`Workspace · created ${formatDate(ctx.org.created_at.slice(0, 10))}`}
        actions={
          canEdit && (
            <Link href={seatsFull ? '/app/settings/billing' : '/app/settings/team?invite=1'} className="btn-primary">
              <UserPlus className="h-4 w-4" /> {seatsFull ? 'Add people to your plan' : 'Invite people'}
            </Link>
          )
        }
      />

      <SettingsCard
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {plan.name}
            {trial.onTrial && <Badge tone={trial.ended ? 'danger' : trial.daysLeft !== null && trial.daysLeft <= 3 ? 'warning' : 'info'}>{trial.ended ? 'Trial ended' : trial.daysLeft !== null ? `${trial.daysLeft} day${trial.daysLeft === 1 ? '' : 's'} left` : 'Trial'}</Badge>}
          </span>
        }
        description={
          trial.onTrial
            ? `Free until ${ctx.org.trial_ends_at ? formatDate(ctx.org.trial_ends_at.slice(0, 10)) : 'the trial ends'}. With your ${usage.seatsUsed} ${usage.seatsUsed === 1 ? 'person' : 'people'} a paid plan would be ${starter ? `$${starter.total} a month on Starter` : ''}${starter && growth ? ' or ' : ''}${growth ? `$${growth.total} on Growth` : ''}, billed yearly.`
            : price
              ? `$${price.total} a month for this workspace, billed yearly${price.extraPeople > 0 ? ` ($${price.base} plus ${price.extraPeople} extra ${price.extraPeople === 1 ? 'person' : 'people'})` : ''}.`
              : 'Priced by agreement.'
        }
        actions={
          <Link href="/app/settings/billing" className="btn-secondary btn-sm">
            <BadgeDollarSign className="h-4 w-4" /> Plan and price
          </Link>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Meter icon={Users} label="People" used={usage.seatsUsed} limit={usage.seatLimit} note={`${usage.members} ${usage.members === 1 ? 'member' : 'members'}, ${usage.pendingInvitations} invited and waiting`} />
          <Meter icon={Home} label="Properties" used={usage.properties} limit={usage.propertyLimit} note={usage.propertyLimit == null ? 'No limit on your plan' : undefined} />
          <Meter icon={DoorOpen} label="Rooms" used={usage.rooms} limit={null} note="Not limited on any plan" />
          <Meter
            icon={HardDrive}
            label="Files"
            used={storage?.bytes ?? 0}
            limit={storageLimitBytes}
            unit={storage ? formatBytes(storage.bytes) : 'Not available'}
            note={storage ? `${formatNumber(storage.files)} files${plan.storageGb != null ? ` of ${plan.storageGb} GB` : ''}` : undefined}
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title="People"
        description="Everyone who can sign in to this workspace. Each person, and each invitation still waiting, counts towards your plan."
        actions={
          <Link href="/app/settings/team" className="btn-secondary btn-sm">
            Manage people
          </Link>
        }
      >
        <ul className="divide-y divide-line">
          {peopleRows.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              <Avatar name={p.name} size="md" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {p.name} {p.you && <span className="text-muted">(you)</span>}
                </div>
                <div className="truncate text-xs text-muted">{p.email}</div>
              </div>
              {p.status !== 'active' && <Badge tone="warning">Suspended</Badge>}
              <Badge tone={p.role === 'Owner' ? 'primary' : 'neutral'}>{p.role}</Badge>
            </li>
          ))}
        </ul>
        {usage.members > peopleRows.length && <p className="mt-2 text-xs text-muted">And {usage.members - peopleRows.length} more.</p>}
      </SettingsCard>

      <SettingsCard
        title="Your data"
        description="Records are not capped on any plan. Only files (receipts, documents, photos) count towards the storage allowance."
        actions={
          <Link href="/app/settings/data" className="btn-secondary btn-sm">
            <Database className="h-4 w-4" /> Export
          </Link>
        }
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-5">
          {[
            ['Bookings', guests.count],
            ['Expenses', expenses.count],
            ['Revenue lines', revenue.count],
            ['Invoices', invoices.count],
            ['Documents', documents.count],
          ].map(([label, n]) => (
            <div key={label as string}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-display text-xl font-semibold tabular">{formatNumber((n as number | null) ?? 0)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted">Only people in this workspace can see this data. You can export every list to Excel, CSV or JSON at any time, and every change is kept in the change history.</p>
      </SettingsCard>

      <SettingsCard title="Manage" description="Everything that belongs to this workspace.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 transition hover:border-primary/40 hover:bg-surface-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-fg">
                <l.icon className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{l.label}</span>
                <span className="block truncate text-xs text-muted">{l.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Another business?" description="Each workspace keeps its own data, people and plan, and is priced separately. You switch between your workspaces from the name at the top of the menu.">
        <Link href="/onboarding" className="btn-secondary">
          <Plus className="h-4 w-4" /> Create another workspace
        </Link>
      </SettingsCard>
    </div>
  )
}
