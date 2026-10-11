'use client'

import { PlanCards } from '@/components/plans/PlanCards'
import { SUPPORT_EMAIL } from '@/lib/brand'
import { TRIAL_DAYS } from '@/lib/plans'

/** Landing-page pricing. Numbers come from lib/plans.ts. */
export function Pricing() {
  return (
    <div>
      <PlanCards
        initialPeople={3}
        cta={(plan) => (plan.seats == null ? { href: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Enterprise plan')}`, label: 'Talk to us' } : { href: '/signup', label: `Start ${TRIAL_DAYS}-day free trial` })}
      />
      <div className="mx-auto mt-8 grid max-w-4xl gap-4 text-sm text-ink-2 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <h4 className="font-semibold text-ink">What is a workspace?</h4>
          <p className="mt-1">One business with its own data, team and settings. A second business is a second workspace with its own price.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <h4 className="font-semibold text-ink">Who counts as a person?</h4>
          <p className="mt-1">Anyone who can sign in to your workspace, plus invitations still waiting. Guests, suppliers and partners you only record do not count.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <h4 className="font-semibold text-ink">What about our data?</h4>
          <p className="mt-1">It is yours. Bookings and records are not capped on any plan, and you can export every list to Excel whenever you like.</p>
        </div>
      </div>
    </div>
  )
}
