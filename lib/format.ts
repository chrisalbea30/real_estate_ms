// Formatting and date helpers. All stay dates are 'YYYY-MM-DD' strings and are
// compared lexicographically, which avoids the UTC-vs-local bugs of the source
// system. "Today" is computed in the property's timezone.

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  THB: '฿',
  EUR: '€',
  USD: '$',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  AUD: 'A$',
  CHF: 'CHF ',
  SGD: 'S$',
  HKD: 'HK$',
  MYR: 'RM',
  IDR: 'Rp',
  INR: '₹',
  KRW: '₩',
  VND: '₫',
  PHP: '₱',
}

export function currencySymbol(code: string) {
  return CURRENCY_SYMBOLS[code] ?? code + ' '
}

export function formatMoney(amount: number | null | undefined, currency = 'EUR', opts: { decimals?: number; sign?: boolean } = {}) {
  const n = Number(amount ?? 0)
  const decimals = opts.decimals ?? (Math.abs(n) < 100 && n % 1 !== 0 ? 2 : 0)
  const body = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  const sym = currencySymbol(currency)
  const neg = n < 0 ? '−' : opts.sign && n > 0 ? '+' : ''
  return `${neg}${sym}${body}`
}

export function formatNumber(n: number | null | undefined, decimals = 0) {
  return Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function formatPct(n: number | null | undefined, decimals = 1) {
  if (n == null || !isFinite(n)) return '—'
  return `${Number(n).toFixed(decimals)}%`
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTHS = MONTHS_SHORT
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** 'YYYY-MM-DD' -> '12 Mar 2026' */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`
}

/** 'YYYY-MM' -> 'Mar 2026' */
export function formatMonth(ym: string | null | undefined) {
  if (!ym) return '—'
  const [y, m] = ym.slice(0, 7).split('-').map(Number)
  if (!y || !m) return ym
  return `${MONTHS_SHORT[m - 1]} ${y}`
}

export function formatDateTime(iso: string | null | undefined, timeZone?: string) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

/** Today's date as 'YYYY-MM-DD' in the given IANA timezone. */
export function todayIn(timeZone: string | null | undefined): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
    return `${get('year')}-${get('month')}-${get('day')}`
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

/** Days from a 'YYYY-MM-DD' to another (b - a). Calendar days, timezone-free. */
export function daysBetween(a: string, b: string): number {
  const da = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))
  const db = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))
  return Math.round((db - da) / 86_400_000)
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(0, daysBetween(checkIn, checkOut))
}

export function addDays(iso: string, n: number): string {
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n))
  return d.toISOString().slice(0, 10)
}

export function daysInMonth(year: number, month1to12: number) {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate()
}

export function monthStart(year: number, month1to12: number) {
  return `${year}-${String(month1to12).padStart(2, '0')}-01`
}

export function monthEnd(year: number, month1to12: number) {
  return `${year}-${String(month1to12).padStart(2, '0')}-${String(daysInMonth(year, month1to12)).padStart(2, '0')}`
}

/** Nights of a stay that fall inside a month (check-out night excluded). */
export function nightsInMonth(checkIn: string, checkOut: string, year: number, month1to12: number) {
  const start = monthStart(year, month1to12)
  const endExclusive = addDays(monthEnd(year, month1to12), 1)
  const from = checkIn > start ? checkIn : start
  const to = checkOut < endExclusive ? checkOut : endExclusive
  return Math.max(0, daysBetween(from, to))
}

export function ymOf(iso: string | null | undefined) {
  return (iso ?? '').slice(0, 7)
}

export function yearOf(iso: string | null | undefined) {
  const y = Number((iso ?? '').slice(0, 4))
  return isFinite(y) && y > 0 ? y : null
}

export function initials(name: string | null | undefined) {
  return (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function titleCase(s: string) {
  return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.-]/g, ''))
  return isFinite(n) ? n : null
}

/** Source bucketing used on revenue cards. */
export function revenueSourceGroup(type: string | null | undefined): 'Direct Booking' | 'Booking.com' | 'Agoda' | 'Airbnb' | 'Other' {
  const t = (type ?? '').toLowerCase()
  if (t.includes('booking.com')) return 'Booking.com'
  if (t.includes('agoda')) return 'Agoda'
  if (t.includes('airbnb')) return 'Airbnb'
  if (t.includes('direct')) return 'Direct Booking'
  return 'Other'
}

export function numberToWords(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const chunk = (x: number): string => {
    if (x === 0) return ''
    if (x < 20) return ones[x]!
    if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '')
    return ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + chunk(x % 100) : '')
  }
  const whole = Math.floor(Math.abs(n))
  if (whole === 0) return 'Zero'
  const scales = ['', ' Thousand', ' Million', ' Billion']
  const parts: string[] = []
  let rest = whole
  let i = 0
  while (rest > 0 && i < scales.length) {
    const c = rest % 1000
    if (c) parts.unshift(chunk(c) + scales[i])
    rest = Math.floor(rest / 1000)
    i++
  }
  return parts.join(' ')
}
