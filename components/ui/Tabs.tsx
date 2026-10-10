'use client'

import { cn } from '@/lib/format'

export interface TabDef<K extends string = string> {
  key: K
  label: React.ReactNode
  badge?: React.ReactNode
}

export function Tabs<K extends string>({ tabs, value, onChange, className }: { tabs: TabDef<K>[]; value: K; onChange: (k: K) => void; className?: string }) {
  return (
    <div className={cn('-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0', className)} role="tablist">
      {tabs.map((t) => {
        const active = t.key === value
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition',
              active ? 'bg-primary text-primary-fg shadow-[0_6px_18px_-8px_var(--primary)]' : 'bg-surface text-ink-2 border border-line hover:bg-surface-2',
            )}
          >
            {t.label}
            {t.badge !== undefined && t.badge !== null && (
              <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] leading-none', active ? 'bg-white/20' : 'bg-surface-2 text-muted')}>{t.badge}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Chip-style filter (e.g. status filters with counts). */
export function Chips<K extends string>({ options, value, onChange }: { options: TabDef<K>[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.key === value
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cn('badge border px-3 py-1 transition', active ? 'border-primary bg-primary text-primary-fg' : 'border-line bg-surface text-ink-2 hover:bg-surface-2')}
          >
            {o.label}
            {o.badge !== undefined && <span className={cn('ml-0.5 opacity-80')}>{o.badge}</span>}
          </button>
        )
      })}
    </div>
  )
}
