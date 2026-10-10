import { cn } from '@/lib/format'
import { Spinner } from '@/components/ui/Spinner'

/** Titled card used for every settings section. */
export function SettingsCard({
  title,
  description,
  actions,
  children,
  footer,
  className,
  danger,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  danger?: boolean
}) {
  return (
    <section className={cn('card mb-5 overflow-hidden', danger && 'border-danger/40', className)}>
      <div className="flex flex-col gap-2 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h2 className={cn('font-display text-lg font-semibold', danger ? 'text-danger' : 'text-ink')}>{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
      {footer && <div className={cn('border-t px-5 py-3 sm:px-6', danger ? 'border-danger/30 bg-danger-soft/40' : 'border-line bg-surface-2/50')}>{footer}</div>}
    </section>
  )
}

/** Right-aligned save row for card footers. */
export function SaveRow({ busy, label = 'Save changes', dirty = true, form, hint }: { busy: boolean; label?: string; dirty?: boolean; form?: string; hint?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-muted">{hint ?? (dirty ? 'You have unsaved changes.' : 'All changes saved.')}</span>
      <button className="btn-primary" form={form} disabled={busy || !dirty} type="submit">
        {busy ? <Spinner size="sm" /> : label}
      </button>
    </div>
  )
}

/** Small inline note with a soft background. */
export function Note({ tone = 'info', children, className }: { tone?: 'info' | 'warning' | 'danger' | 'success'; children: React.ReactNode; className?: string }) {
  const tones = {
    info: 'border-info/30 bg-info-soft text-info',
    warning: 'border-warning/30 bg-warning-soft text-warning',
    danger: 'border-danger/30 bg-danger-soft text-danger',
    success: 'border-success/30 bg-success-soft text-success',
  }
  return <div className={cn('rounded-xl border px-3.5 py-2.5 text-sm', tones[tone], className)}>{children}</div>
}
