'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { cn } from '@/lib/format'

// Placeholder pricing. Change the numbers here and in docs/08-app-guide.md.
const TIERS = [
  {
    name: 'Starter',
    monthly: 29,
    yearly: 24,
    blurb: 'One property run by a small team.',
    features: ['1 property · up to 15 rooms', '3 team members', 'Bookings, occupancy, invoices', 'Expenses with receipt scanning', 'Revenue and cash accounts', 'Exports to Excel, CSV, PDF'],
    cta: 'Start free trial',
    href: '/signup',
  },
  {
    name: 'Growth',
    monthly: 79,
    yearly: 65,
    blurb: 'Several properties, partners and advisers.',
    features: ['Up to 3 properties · 60 rooms', '10 team members', 'Everything in Starter', 'Legal & accounting review', 'Budgets and budget vs actual', 'Partner capital, work hours, meetings', 'Audit log and roles editor'],
    cta: 'Start free trial',
    href: '/signup',
    popular: true,
  },
  {
    name: 'Enterprise',
    monthly: null,
    yearly: null,
    blurb: 'Groups and management companies.',
    features: ['Unlimited properties and users', 'Consolidated reporting', 'Single sign-on', 'Custom data retention', 'Priority support and onboarding'],
    cta: 'Talk to us',
    href: 'mailto:hello@example.com',
  },
]

export function Pricing() {
  const [yearly, setYearly] = useState(true)
  return (
    <div>
      <div className="mb-8 flex items-center justify-center gap-3 text-sm">
        <span className={cn(!yearly ? 'font-semibold text-ink' : 'text-muted')}>Monthly</span>
        <button role="switch" aria-checked={yearly} onClick={() => setYearly((y) => !y)} className={cn('relative inline-flex h-7 w-12 items-center rounded-full transition', yearly ? 'bg-primary' : 'bg-line-2')}>
          <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition', yearly ? 'translate-x-6' : 'translate-x-1')} />
        </button>
        <span className={cn(yearly ? 'font-semibold text-ink' : 'text-muted')}>
          Yearly <span className="ml-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">2 months free</span>
        </span>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {TIERS.map((t) => (
          <div key={t.name} className={cn('card relative flex flex-col p-6', t.popular && 'border-primary ring-4 ring-primary/10')}>
            {t.popular && <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-fg">Most popular</span>}
            <h3 className="font-display text-xl font-semibold">{t.name}</h3>
            <p className="mt-1 text-sm text-muted">{t.blurb}</p>
            <div className="mt-5 flex items-baseline gap-1">
              {t.monthly == null ? (
                <span className="font-display text-3xl font-semibold">Custom</span>
              ) : (
                <>
                  <span className="font-display text-4xl font-semibold tabular">${yearly ? t.yearly : t.monthly}</span>
                  <span className="text-sm text-muted">/ month</span>
                </>
              )}
            </div>
            {t.monthly != null && <p className="text-xs text-muted">{yearly ? 'billed yearly' : 'billed monthly'} · 14-day free trial</p>}
            <ul className="mt-5 flex-1 space-y-2.5 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span className="text-ink-2">{f}</span>
                </li>
              ))}
            </ul>
            <Link href={t.href} className={cn('mt-6 w-full', t.popular ? 'btn-primary' : 'btn-secondary')}>
              {t.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
