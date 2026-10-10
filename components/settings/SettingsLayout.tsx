'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useApp } from '@/components/app/AppProvider'
import { SETTINGS_NAV } from '@/components/settings/constants'
import { cn } from '@/lib/format'

/**
 * One place for the whole Settings area: a horizontally scrollable pill row
 * on phones and a sticky left column from the lg breakpoint.
 */
export function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { can } = useApp()
  const items = SETTINGS_NAV.filter((i) => !i.admin || can('settings', 'view'))

  return (
    <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
      <aside className="mb-5 lg:mb-0">
        <div className="mb-2 hidden px-3 text-[11px] font-semibold uppercase tracking-wider text-muted lg:block">Settings</div>
        <nav
          aria-label="Settings sections"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none lg:sticky lg:top-8 lg:mx-0 lg:flex-col lg:gap-0.5 lg:px-0 lg:pb-0"
        >
          {items.map((i) => {
            const active = pathname === i.href || pathname.startsWith(i.href + '/')
            return (
              <Link
                key={i.key}
                href={i.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition lg:rounded-xl lg:border-0 lg:px-3',
                  active
                    ? 'border-primary bg-primary text-primary-fg shadow-[0_6px_18px_-8px_var(--primary)]'
                    : 'border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink lg:bg-transparent',
                )}
              >
                <i.icon className={cn('h-4 w-4', active ? 'opacity-100' : 'opacity-70')} />
                {i.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <div className="min-w-0 animate-in">{children}</div>
    </div>
  )
}
