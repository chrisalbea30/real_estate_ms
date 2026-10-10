import type { ExchangeRate } from '@/lib/types'

/** Map "EUR->THB" style keys to rates. ECB rates are EUR based. */
export type RateTable = Record<string, number>

export function buildRateTable(rows: ExchangeRate[]): RateTable {
  const t: RateTable = {}
  for (const r of rows) {
    t[`${r.base_currency}->${r.quote_currency}`] = Number(r.rate)
  }
  return t
}

/** Rate from one currency to another using EUR cross rates. 1 when unknown. */
export function rateBetween(from: string, to: string, table: RateTable): number | null {
  if (from === to) return 1
  const direct = table[`${from}->${to}`]
  if (direct) return direct
  const inverse = table[`${to}->${from}`]
  if (inverse) return 1 / inverse
  const eurFrom = from === 'EUR' ? 1 : table[`EUR->${from}`]
  const eurTo = to === 'EUR' ? 1 : table[`EUR->${to}`]
  if (eurFrom && eurTo) return eurTo / eurFrom
  return null
}

export function convert(amount: number, from: string, to: string, table: RateTable): number {
  const r = rateBetween(from, to, table)
  return r == null ? amount : amount * r
}

export const COMMON_CURRENCIES = ['THB', 'EUR', 'USD', 'GBP', 'AUD', 'SGD', 'JPY', 'CHF', 'MYR', 'IDR', 'VND', 'PHP', 'INR', 'HKD', 'CNY', 'KRW']
