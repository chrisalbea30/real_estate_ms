import { cn } from '@/lib/format'

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  primary: 'bg-primary-soft text-primary-soft-fg',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  accent: 'bg-accent-soft text-accent',
}

export function Badge({ tone = 'neutral', children, className, dot }: { tone?: BadgeTone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('badge', TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Common status → tone mappings used across modules. */
export function statusTone(status: string | null | undefined): BadgeTone {
  switch ((status ?? '').toLowerCase()) {
    case 'complete':
    case 'resolved':
    case 'closed':
    case 'accepted':
    case 'checked':
    case 'yes':
    case 'filed':
    case 'paid':
    case 'active':
      return 'success'
    case 'ongoing':
    case 'in progress':
    case 'in-house':
    case 'checked-in':
      return 'info'
    case 'pending':
    case 'to check':
    case 'open':
    case 'upcoming':
    case 'clarification needed':
      return 'warning'
    case 'blocked':
    case 'rejected':
    case 'critical':
    case 'expired':
    case 'overdue':
      return 'danger'
    case 'high':
      return 'warning'
    default:
      return 'neutral'
  }
}
