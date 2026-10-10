'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { cn } from '@/lib/format'
import { useLocalStorage } from '@/lib/hooks'

type Theme = 'light' | 'dark' | 'system'

export function ThemeToggle({ className, compact }: { className?: string; compact?: boolean }) {
  const [stored, setStored] = useLocalStorage('theme')
  const theme: Theme = stored === 'light' || stored === 'dark' ? stored : 'system'

  const set = (t: Theme) => {
    const el = document.documentElement
    if (t === 'system') el.removeAttribute('data-theme')
    else el.setAttribute('data-theme', t)
    setStored(t === 'system' ? null : t)
  }

  if (compact) {
    const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
    return (
      <button className={cn('icon-btn', className)} onClick={() => set(next)} aria-label={`Theme: ${theme}`} title={`Theme: ${theme}`}>
        <Icon className="h-5 w-5" />
      </button>
    )
  }

  const opts: { key: Theme; icon: typeof Sun; label: string }[] = [
    { key: 'light', icon: Sun, label: 'Light' },
    { key: 'dark', icon: Moon, label: 'Dark' },
    { key: 'system', icon: Monitor, label: 'Auto' },
  ]
  return (
    <div className={cn('inline-flex rounded-xl border border-line bg-surface p-1', className)} role="radiogroup" aria-label="Theme">
      {opts.map((o) => (
        <button
          key={o.key}
          role="radio"
          aria-checked={theme === o.key}
          onClick={() => set(o.key)}
          className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition', theme === o.key ? 'bg-primary text-primary-fg' : 'text-muted hover:text-ink')}
        >
          <o.icon className="h-3.5 w-3.5" />
          {o.label}
        </button>
      ))}
    </div>
  )
}
