import { cn, initials } from '@/lib/format'

const PALETTE = ['bg-burgundy-600', 'bg-burgundy-500', 'bg-gold-600', 'bg-burgundy-800', 'bg-burgundy-400', 'bg-gold-500']

function hashStr(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function Avatar({ name, src, size = 'md', className }: { name: string | null | undefined; src?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const s = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm', xl: 'h-20 w-20 text-xl' }[size]
  const label = name ?? '?'
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={label} className={cn('rounded-full object-cover', s, className)} />
  }
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', s, PALETTE[hashStr(label) % PALETTE.length], className)} aria-label={label}>
      {initials(label) || '?'}
    </span>
  )
}
