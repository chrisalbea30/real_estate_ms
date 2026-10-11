'use client'

import { useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { PUBLIC_PLANS, priceFor, type Plan, type PlanKey } from '@/lib/plans'
import { cn } from '@/lib/format'

function features(p: Plan): string[] {
  if (p.seats == null) {
    return ['As many workspaces as you run', 'People, properties and file storage agreed with you', 'Every screen included', 'Help moving your existing data in', 'Billed by invoice']
  }
  return [
    '1 workspace',
    `${p.seats} people included`,
    p.properties == null ? 'Unlimited properties' : `${p.properties} ${p.properties === 1 ? 'property' : 'properties'} in the workspace`,
    `${p.storageGb} GB for receipts, documents and photos`,
    'Every screen included',
    'Export your data at any time',
  ]
}

/**
 * The plan cards with a monthly / yearly switch and a "how many people" stepper
 * that works out the price of one workspace. Used on the landing page and on
 * the Billing screen (where `currentKey` marks the workspace's plan).
 */
export function PlanCards({
  initialPeople = 3,
  currentKey,
  cta,
}: {
  initialPeople?: number
  currentKey?: PlanKey
  cta: (plan: Plan, people: number, yearly: boolean) => { href: string; label: string }
}) {
  const [yearly, setYearly] = useState(true)
  const [people, setPeople] = useState(Math.max(1, initialPeople))
  // The cheapest public plan for this many people is the best fit.
  const priced = PUBLIC_PLANS.map((p) => ({ key: p.key, total: priceFor(p, people, yearly)?.total })).filter((x): x is { key: PlanKey; total: number } => x.total != null)
  const recommended: PlanKey = priced.sort((x, y) => x.total - y.total)[0]?.key ?? 'starter'

  return (
    <div>
      <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
        <div className="flex items-center gap-3 text-sm">
          <span className={cn(!yearly ? 'font-semibold text-ink' : 'text-muted')}>Monthly</span>
          <button type="button" role="switch" aria-checked={yearly} aria-label="Bill yearly" onClick={() => setYearly((y) => !y)} className={cn('relative inline-flex h-7 w-12 items-center rounded-full transition', yearly ? 'bg-primary' : 'bg-line-2')}>
            <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition', yearly ? 'translate-x-6' : 'translate-x-1')} />
          </button>
          <span className={cn(yearly ? 'font-semibold text-ink' : 'text-muted')}>Yearly</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <label htmlFor="people-count" className="text-muted">People who will sign in</label>
          <div className="inline-flex items-center rounded-xl border border-line-2 bg-surface">
            <button type="button" className="icon-btn" onClick={() => setPeople((n) => Math.max(1, n - 1))} aria-label="Fewer people">
              <Minus className="h-4 w-4" />
            </button>
            <input
              id="people-count"
              inputMode="numeric"
              value={people}
              onChange={(e) => setPeople(Math.min(200, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1)))}
              className="w-12 bg-transparent text-center font-semibold tabular outline-none"
            />
            <button type="button" className="icon-btn" onClick={() => setPeople((n) => Math.min(200, n + 1))} aria-label="More people">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {PUBLIC_PLANS.map((p) => {
          const price = priceFor(p, people, yearly)
          const current = currentKey === p.key
          const highlight = currentKey ? current : p.key === recommended
          const per = yearly ? p.extraSeatYearly : p.extraSeatMonthly
          const action = cta(p, people, yearly)
          return (
            <div key={p.key} className={cn('card relative flex flex-col p-6', highlight && 'border-primary ring-4 ring-primary/10')}>
              {highlight && <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-fg">{current ? 'Your plan' : `Best fit for ${people} ${people === 1 ? 'person' : 'people'}`}</span>}
              <h3 className="font-display text-xl font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted">{p.blurb}</p>
              <div className="mt-5 flex items-baseline gap-1">
                {price ? (
                  <>
                    <span className="font-display text-4xl font-semibold tabular">${price.total}</span>
                    <span className="text-sm text-muted">/ workspace / month</span>
                  </>
                ) : (
                  <span className="font-display text-3xl font-semibold">By quote</span>
                )}
              </div>
              <p className="mt-1 min-h-10 text-xs text-muted">
                {price
                  ? price.extraPeople > 0
                    ? `$${price.base} for the workspace with ${p.seats} people, plus ${price.extraPeople} more at $${per} each. Billed ${yearly ? 'yearly' : 'monthly'}.`
                    : `Covers up to ${p.seats} people. Each extra person is $${per} a month. Billed ${yearly ? 'yearly' : 'monthly'}.`
                  : 'For several workspaces or large teams. Tell us what you run and we will quote.'}
              </p>
              <ul className="mt-4 flex-1 space-y-2.5 text-sm">
                {features(p).map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-ink-2">{f}</span>
                  </li>
                ))}
              </ul>
              <a href={action.href} className={cn('mt-6 w-full', highlight && !current ? 'btn-primary' : 'btn-secondary')}>
                {action.label}
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
