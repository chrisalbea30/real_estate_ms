import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/format'

type Tone = 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'accent'

const TONES: Record<Tone, { value: string; icon: string }> = {
  default: { value: 'text-ink', icon: 'bg-surface-2 text-ink-2' },
  primary: { value: 'text-primary', icon: 'bg-primary-soft text-primary-soft-fg' },
  success: { value: 'text-success', icon: 'bg-success-soft text-success' },
  danger: { value: 'text-danger', icon: 'bg-danger-soft text-danger' },
  warning: { value: 'text-warning', icon: 'bg-warning-soft text-warning' },
  info: { value: 'text-info', icon: 'bg-info-soft text-info' },
  accent: { value: 'text-accent', icon: 'bg-accent-soft text-accent' },
}

export function StatCard({
  label,
  value,
  sub,
  tone = 'default',
  icon: Icon,
  className,
  onClick,
  active,
}: {
  label: React.ReactNode
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: Tone
  icon?: LucideIcon
  className?: string
  onClick?: () => void
  active?: boolean
}) {
  const t = TONES[tone]
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'card flex items-start gap-3 p-4 text-left min-w-0',
        onClick && 'transition hover:border-primary/40 hover:shadow-pop',
        active && 'border-primary ring-4 ring-primary/10',
        className,
      )}
    >
      {Icon && (
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', t.icon)}>
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
        <div className={cn('mt-1 truncate font-display text-2xl font-semibold leading-none tabular', t.value)}>{value}</div>
        {sub && <div className="mt-1.5 text-xs text-muted">{sub}</div>}
      </div>
    </Comp>
  )
}

export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>{children}</div>
}
