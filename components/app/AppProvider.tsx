'use client'

import { createContext, useCallback, useContext, useMemo } from 'react'
import { useLocalStorage } from '@/lib/hooks'
import type { Action, ModuleKey } from '@/lib/modules'
import { hasPerm } from '@/lib/permissions'
import { convert, type RateTable } from '@/lib/currency'
import { formatMoney, todayIn } from '@/lib/format'
import type { OrgRole, OrgSettings, Organization, PaymentMethod, Permissions, Property, Room, CategoryKind } from '@/lib/types'

export interface AppSnapshot {
  user: { id: string; email: string; name: string }
  org: Organization
  role: OrgRole
  perms: Permissions
  properties: Property[]
  property: Property
  memberships: { organization_id: string; name: string }[]
  rates: RateTable
  ratesFetchedAt: string | null
  /** True when rates are missing or older than a week (computed on the server). */
  ratesStale: boolean
  paymentMethods: PaymentMethod[]
  rooms: Room[]
  partners: { id: string; name: string }[]
  members: { user_id: string; name: string }[]
}

export interface AppContextValue extends AppSnapshot {
  settings: OrgSettings
  can: (module: ModuleKey, action?: Action) => boolean
  categories: (kind: CategoryKind) => string[]
  baseCurrency: string
  displayCurrency: string
  setDisplayCurrency: (c: string) => void
  currencyOptions: string[]
  /** Format an amount stored in the base currency, in the selected display currency. */
  fmt: (amountBase: number | null | undefined, opts?: { decimals?: number; sign?: boolean }) => string
  /** Convert a base amount to the display currency (number). */
  toDisplay: (amountBase: number | null | undefined) => number
  today: string
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ snapshot, children }: { snapshot: AppSnapshot; children: React.ReactNode }) {
  const settings = snapshot.org.settings
  const baseCurrency = settings?.base_currency ?? 'THB'
  const currencyOptions = useMemo(() => [baseCurrency, ...(settings?.display_currencies ?? []).filter((c) => c !== baseCurrency)], [baseCurrency, settings?.display_currencies])

  const [saved, setSaved] = useLocalStorage(`display_currency:${snapshot.org.id}`)
  const displayCurrency = saved && currencyOptions.includes(saved) ? saved : baseCurrency
  const setDisplayCurrency = useCallback((c: string) => setSaved(c), [setSaved])

  const toDisplay = useCallback(
    (amount: number | null | undefined) => convert(Number(amount ?? 0), baseCurrency, displayCurrency, snapshot.rates),
    [baseCurrency, displayCurrency, snapshot.rates],
  )

  const fmt = useCallback(
    (amount: number | null | undefined, opts?: { decimals?: number; sign?: boolean }) => formatMoney(toDisplay(amount), displayCurrency, { decimals: opts?.decimals ?? 0, sign: opts?.sign }),
    [toDisplay, displayCurrency],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      ...snapshot,
      settings,
      can: (module, action = 'view') => hasPerm(snapshot.perms, module, action),
      categories: (kind) => settings?.categories?.[kind] ?? [],
      baseCurrency,
      displayCurrency,
      setDisplayCurrency,
      currencyOptions,
      fmt,
      toDisplay,
      today: todayIn(snapshot.property.timezone),
    }),
    [snapshot, settings, baseCurrency, displayCurrency, setDisplayCurrency, currencyOptions, fmt, toDisplay],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

export function useCan(module: ModuleKey, action: Action = 'view') {
  return useApp().can(module, action)
}
