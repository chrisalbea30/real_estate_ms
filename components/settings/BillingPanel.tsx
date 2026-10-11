'use client'

import Link from 'next/link'
import { Mail } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { SettingsCard, Note } from '@/components/settings/SettingsCard'
import { PlanCards } from '@/components/plans/PlanCards'
import { APP_NAME, SUPPORT_EMAIL } from '@/lib/brand'
import { formatDate } from '@/lib/format'
import { PLANS, priceFor, type PlanKey } from '@/lib/plans'

export interface BillingProps {
  orgId: string
  orgName: string
  planKey: PlanKey
  trial: { onTrial: boolean; daysLeft: number | null; ended: boolean; endsOn: string | null }
  seats: { used: number; limit: number | null; members: number; waiting: number; extra: number }
  properties: { used: number; limit: number | null }
}

/** No online checkout yet: shows the plan, what it costs for this team, and how to change it. */
export function BillingPanel({ orgId, orgName, planKey, trial, seats, properties }: BillingProps) {
  const plan = PLANS[planKey]
  const price = priceFor(plan, seats.used, true)

  const mail = (wanted: string, people: number) => {
    const subject = encodeURIComponent(`${APP_NAME}: plan for ${orgName}`)
    const body = encodeURIComponent(`Hello,\n\nWorkspace: "${orgName}" (id ${orgId})\nCurrent plan: ${plan.name}\nPeople now: ${seats.used} (${seats.members} members, ${seats.waiting} invitations waiting)\n\nPlan we would like: ${wanted}\nPeople we need: ${people}\n\nThanks`)
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <div>
      <PageHeader title="Billing" subtitle="What this workspace pays for, and how to change it." />

      <SettingsCard
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {plan.name}
            {trial.onTrial && <Badge tone={trial.ended ? 'danger' : trial.daysLeft !== null && trial.daysLeft <= 3 ? 'warning' : 'info'}>{trial.ended ? 'Trial ended' : trial.daysLeft !== null ? `${trial.daysLeft} day${trial.daysLeft === 1 ? '' : 's'} left` : 'Trial'}</Badge>}
          </span>
        }
        description={trial.onTrial ? (trial.endsOn ? `Free trial ${trial.ended ? 'ended' : 'ends'} on ${formatDate(trial.endsOn)}.` : 'Free trial.') : 'Priced per workspace, with people included. Billed by invoice.'}
        actions={
          <a href={mail(trial.onTrial ? 'Starter or Growth' : plan.name, seats.used)} className="btn-primary btn-sm">
            <Mail className="h-4 w-4" /> Contact us to change
          </a>
        }
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">People</dt>
            <dd className="font-medium tabular">{seats.limit == null ? seats.used : `${seats.used} of ${seats.limit}`}</dd>
            <dd className="text-xs text-muted">{seats.members} members, {seats.waiting} waiting{seats.extra > 0 ? `, ${seats.extra} extra bought` : ''}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Properties</dt>
            <dd className="font-medium tabular">{properties.limit == null ? properties.used : `${properties.used} of ${properties.limit}`}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{trial.onTrial ? 'After the trial' : 'Price'}</dt>
            <dd className="font-medium tabular">{trial.onTrial ? 'Choose a plan below' : price ? `$${price.total} a month` : 'By quote'}</dd>
            {!trial.onTrial && price && <dd className="text-xs text-muted">billed yearly{price.extraPeople > 0 ? `, incl. ${price.extraPeople} extra people` : ''}</dd>}
          </div>
          <div>
            <dt className="text-xs text-muted">Payment method</dt>
            <dd className="font-medium">None on file</dd>
          </div>
        </dl>
        <Note className="mt-4">
          Online card payment is not available yet, and nothing is charged automatically. To pick a plan, add people or extend a trial, write to <span className="font-medium select-all">{SUPPORT_EMAIL}</span> and we set it up for you. See everything this workspace uses on the <Link href="/app/settings/workspace" className="font-medium underline">Workspace</Link> page.
        </Note>
      </SettingsCard>

      <SettingsCard title="Plans" description="You pay per workspace. Each plan includes a number of people, and extra people are added one by one. Every plan includes every screen.">
        <PlanCards
          initialPeople={Math.max(1, seats.used)}
          currentKey={trial.onTrial ? undefined : planKey}
          cta={(p, people) => ({ href: mail(p.name, people), label: p.key === planKey && !trial.onTrial ? 'Change the number of people' : p.seats == null ? 'Talk to us' : `Ask for ${p.name}` })}
        />
      </SettingsCard>
    </div>
  )
}
