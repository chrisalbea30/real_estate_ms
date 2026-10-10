'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, LogOut, MoreHorizontal, Plus, RefreshCw, UserCircle2, Check } from 'lucide-react'
import { APP_NAME } from '@/lib/brand'
import { Logo } from '@/components/Logo'
import { MODULES, MODULE_GROUPS, moduleForPath, type ModuleDef } from '@/lib/modules'
import { useApp } from '@/components/app/AppProvider'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/format'
import { switchOrganizationAction, switchPropertyAction, signOutAction } from '@/app/(app)/app/actions'

function useAllowedModules() {
  const { can } = useApp()
  return useMemo(() => MODULES.filter((m) => can(m.key, 'view')), [can])
}

function isActive(pathname: string, m: ModuleDef) {
  return moduleForPath(pathname)?.key === m.key
}

/* ---------------- Currency toggle ---------------- */
function CurrencyToggle({ className }: { className?: string }) {
  const { currencyOptions, displayCurrency, setDisplayCurrency, ratesFetchedAt, ratesStale: stale } = useApp()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  if (currencyOptions.length < 2) return null
  const refresh = async () => {
    setRefreshing(true)
    try {
      await fetch('/api/cron/fx', { method: 'POST' })
      router.refresh()
    } finally {
      setRefreshing(false)
    }
  }
  return (
    <div className={cn('inline-flex items-center rounded-xl border border-line bg-surface p-1', className)}>
      {currencyOptions.map((c) => (
        <button
          key={c}
          onClick={() => setDisplayCurrency(c)}
          className={cn('rounded-lg px-2.5 py-1 text-xs font-semibold transition', displayCurrency === c ? 'bg-primary text-primary-fg' : 'text-muted hover:text-ink')}
        >
          {c}
        </button>
      ))}
      <button
        type="button"
        onClick={refresh}
        className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-md text-muted hover:text-ink"
        title={ratesFetchedAt ? `ECB rates from ${new Date(ratesFetchedAt).toLocaleDateString()} · click to refresh` : 'No exchange rates loaded yet · click to fetch'}
        aria-label="Refresh exchange rates"
      >
        {refreshing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <span className={cn('h-1.5 w-1.5 rounded-full', stale ? 'bg-warning' : 'bg-success')} />}
      </button>
    </div>
  )
}

/* ---------------- Org / property switcher ---------------- */
function ContextSwitcher({ className, compact }: { className?: string; compact?: boolean }) {
  const { org, property, properties, memberships } = useApp()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const multiOrg = memberships.length > 1
  const multiProp = properties.filter((p) => p.active).length > 1
  const canSwitch = multiOrg || multiProp

  return (
    <>
      <button
        className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition', canSwitch && 'hover:bg-surface-2', className)}
        onClick={() => canSwitch && setOpen(true)}
        disabled={!canSwitch && !compact}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{property.name}</div>
          <div className="truncate text-xs text-muted">{org.name}</div>
        </div>
        {canSwitch && <ChevronDown className="h-4 w-4 shrink-0 text-muted" />}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Switch workspace" size="sm">
        {pending && <p className="mb-3 text-xs text-muted">Switching…</p>}
        {multiOrg && (
          <div className="mb-4">
            <div className="label">Organisation</div>
            <div className="space-y-1">
              {memberships.map((m) => (
                <button
                  key={m.organization_id}
                  className={cn('flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-surface-2', m.organization_id === org.id && 'bg-primary-soft text-primary-soft-fg')}
                  onClick={() => start(() => switchOrganizationAction(m.organization_id))}
                >
                  {m.name}
                  {m.organization_id === org.id && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="label">Property</div>
          <div className="space-y-1">
            {properties
              .filter((p) => p.active)
              .map((p) => (
                <button
                  key={p.id}
                  className={cn('flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-surface-2', p.id === property.id && 'bg-primary-soft text-primary-soft-fg')}
                  onClick={() => start(() => switchPropertyAction(p.id))}
                >
                  {p.name}
                  {p.id === property.id && <Check className="h-4 w-4" />}
                </button>
              ))}
          </div>
        </div>
        <Link href="/onboarding" className="mt-4 flex items-center gap-2 text-sm font-medium text-primary hover:underline" onClick={() => setOpen(false)}>
          <Plus className="h-4 w-4" /> New organisation
        </Link>
      </Modal>
    </>
  )
}

/* ---------------- Desktop sidebar ---------------- */
function Sidebar() {
  const pathname = usePathname()
  const allowed = useAllowedModules()
  const { user, role } = useApp()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-line bg-surface lg:flex">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
        <Logo className="h-9 w-9" />
        <span className="font-display text-xl font-semibold text-ink">{APP_NAME}</span>
      </div>
      <div className="px-3">
        <ContextSwitcher className="border border-line bg-surface-2/60" />
      </div>
      <nav className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
        {MODULE_GROUPS.map((group) => {
          const items = allowed.filter((m) => m.group === group)
          if (items.length === 0) return null
          return (
            <div key={group} className="mb-4">
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{group}</div>
              <ul className="space-y-0.5">
                {items.map((m) => {
                  const active = isActive(pathname, m)
                  return (
                    <li key={m.key}>
                      <Link
                        href={m.href}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                          active ? 'bg-primary text-primary-fg shadow-[0_6px_18px_-8px_var(--primary)]' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                        )}
                      >
                        <m.icon className={cn('h-4.5 w-4.5', active ? 'opacity-100' : 'opacity-70')} />
                        {m.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>
      <div className="space-y-3 border-t border-line p-3">
        <div className="flex items-center justify-between gap-2">
          <CurrencyToggle />
          <ThemeToggle compact />
        </div>
        <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
          <Avatar name={user.name} size="md" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-ink">{user.name}</div>
            <div className="truncate text-xs text-muted">{role.name}</div>
          </div>
          <Link href="/app/settings/profile" className="icon-btn" title="Your profile">
            <UserCircle2 className="h-5 w-5" />
          </Link>
          <form action={signOutAction}>
            <button className="icon-btn" title="Sign out">
              <LogOut className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}

/* ---------------- Mobile top bar + bottom nav ---------------- */
function TopBar({ onMore }: { onMore: () => void }) {
  const { user } = useApp()
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur safe-top lg:hidden">
      <div className="flex h-14 items-center gap-2 px-3">
        <Logo className="h-8 w-8" />
        <div className="min-w-0 flex-1">
          <ContextSwitcher compact className="!px-1 !py-0" />
        </div>
        <CurrencyToggle />
        <button className="icon-btn" onClick={onMore} aria-label="Account">
          <Avatar name={user.name} size="sm" />
        </button>
      </div>
    </header>
  )
}

function BottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname()
  const allowed = useAllowedModules()
  const tabs = allowed.filter((m) => m.mobileTab).sort((a, b) => a.mobileTab! - b.mobileTab!).slice(0, 4)
  // Fill with the first allowed modules when the role lacks the default tabs.
  const fill = allowed.filter((m) => !tabs.includes(m)).slice(0, Math.max(0, 4 - tabs.length))
  const items = [...tabs, ...fill]
  const current = moduleForPath(pathname)
  const moreActive = current ? !items.some((m) => m.key === current.key) : false

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur safe-bottom lg:hidden">
      <ul className="grid h-16" style={{ gridTemplateColumns: `repeat(${items.length + 1}, minmax(0, 1fr))` }}>
        {items.map((m) => {
          const active = current?.key === m.key
          return (
            <li key={m.key}>
              <Link href={m.href} className={cn('flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium', active ? 'text-primary' : 'text-muted')}>
                <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition', active && 'bg-primary-soft')}>
                  <m.icon className="h-5 w-5" />
                </span>
                {m.shortLabel ?? m.label}
              </Link>
            </li>
          )
        })}
        <li>
          <button onClick={onMore} className={cn('flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium', moreActive ? 'text-primary' : 'text-muted')}>
            <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition', moreActive && 'bg-primary-soft')}>
              <MoreHorizontal className="h-5 w-5" />
            </span>
            More
          </button>
        </li>
      </ul>
    </nav>
  )
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const allowed = useAllowedModules()
  const { user, role, org } = useApp()
  return (
    <Modal open={open} onClose={onClose} title="Menu" subtitle={org.name} size="md">
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface-2 p-3">
        <Avatar name={user.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{user.name}</div>
          <div className="truncate text-xs text-muted">{role.name} · {user.email}</div>
        </div>
        <ThemeToggle compact />
      </div>
      {MODULE_GROUPS.map((group) => {
        const items = allowed.filter((m) => m.group === group)
        if (items.length === 0) return null
        return (
          <div key={group} className="mb-4">
            <div className="label">{group}</div>
            <div className="grid grid-cols-2 gap-2">
              {items.map((m) => {
                const active = isActive(pathname, m)
                return (
                  <Link
                    key={m.key}
                    href={m.href}
                    onClick={onClose}
                    className={cn('flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium', active ? 'border-primary bg-primary-soft text-primary-soft-fg' : 'border-line bg-surface text-ink-2')}
                  >
                    <m.icon className="h-4.5 w-4.5 shrink-0" />
                    <span className="truncate">{m.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
      <div className="mt-2 flex gap-2">
        <Link href="/app/settings/profile" onClick={onClose} className="btn-secondary flex-1">
          <UserCircle2 className="h-4 w-4" /> Profile
        </Link>
        <form action={signOutAction} className="flex-1">
          <button className="btn-secondary w-full">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </div>
    </Modal>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [more, setMore] = useState(false)
  return (
    <div className="min-h-dvh lg:pl-72">
      <Sidebar />
      <TopBar onMore={() => setMore(true)} />
      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
      <BottomNav onMore={() => setMore(true)} />
      <MoreSheet open={more} onClose={() => setMore(false)} />
    </div>
  )
}

export function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return <RefreshCw className={cn('h-4 w-4', spinning && 'animate-spin')} />
}
