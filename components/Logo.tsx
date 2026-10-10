import { cn } from '@/lib/format'

/** Brand mark: a burgundy tile with a gold roofline. Inline SVG so it themes. */
export function Logo({ className, mono }: { className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('shrink-0', className)} aria-hidden="true">
      <rect x="4" y="4" width="56" height="56" rx="16" fill={mono ? 'currentColor' : 'var(--burgundy-600)'} />
      <path d="M18 36 L32 22 L46 36" fill="none" stroke={mono ? '#fff' : 'var(--gold-400)'} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="24" y="36" width="16" height="10" rx="2" fill={mono ? '#fff' : '#FBF7F3'} />
      <rect x="30" y="39" width="4" height="7" rx="1" fill={mono ? 'currentColor' : 'var(--burgundy-600)'} />
    </svg>
  )
}
