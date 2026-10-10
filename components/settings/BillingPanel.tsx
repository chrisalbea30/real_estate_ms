import { Check, Mail } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { SettingsCard, Note } from '@/components/settings/SettingsCard'
import { PLAN_TIERS } from '@/components/settings/constants'
import { APP_NAME, SUPPORT_EMAIL } from '@/lib/brand'
import { cn, daysBetween, formatDateTime, titleCase } from '@/lib/format'
import type { Organization } from '@/lib/types'

/** Server-rendered: no checkout yet, just the facts and a way to reach us. `today` is YYYY-MM-DD in the property timezone. */
export function BillingPanel({ org, propertyCount, today }: { org: Organization; propertyCount: number; today: string }) {
  const plan = (org.plan || 'trial').toLowerCase()
  const trialEnd = org.trial_ends_at ? org.trial_ends_at.slice(0, 10) : null
  const daysLeft = trialEnd ? daysBetween(today, trialEnd) : null
  const onTrial = plan === 'trial'
  const expired = onTrial && daysLeft !== null && daysLeft < 0

  const subject = encodeURIComponent(`${APP_NAME}: upgrade ${org.name}`)
  const body = encodeURIComponent(`Hello,\n\nWe would like to upgrade "${org.name}" (id ${org.id}).\nCurrent plan: ${titleCase(plan)}. Properties: ${propertyCount}.\nPlan we are interested in: \n\nThanks`)
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`

  return (
    <div>
      <PageHeader title="Billing" subtitle="Your plan and how to change it." />

      <SettingsCard
        title={
          <span className="inline-flex items-center gap-2">
            {titleCase(plan)} plan
            {onTrial && <Badge tone={expired ? 'danger' : daysLeft !== null && daysLeft <= 3 ? 'warning' : 'info'}>{expired ? 'Trial ended' : daysLeft !== null ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'Trial'}</Badge>}
          </span>
        }
        description={onTrial ? (trialEnd ? `Trial ${expired ? 'ended' : 'ends'} ${formatDateTime(org.trial_ends_at)}.` : 'Free trial.') : 'Billed by invoice.'}
        actions={
          <a href={mailto} className="btn-primary btn-sm">
            <Mail className="h-4 w-4" /> Contact us to upgrade
          </a>
        }
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Organisation</dt>
            <dd className="truncate font-medium">{org.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Properties</dt>
            <dd className="font-medium tabular">{propertyCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Member since</dt>
            <dd className="font-medium">{formatDateTime(org.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Payment method</dt>
            <dd className="font-medium">None on file</dd>
          </div>
        </dl>
        <Note className="mt-4">
          Online card payment is not available yet. To move to a paid plan, extend a trial or ask for an invoice, email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium underline">{SUPPORT_EMAIL}</a> and we set it up for you the same day. Nothing is charged automatically.
        </Note>
      </SettingsCard>

      <SettingsCard title="Plans" description="Prices per month, billed yearly (monthly billing is a little more). All plans include every module.">
        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_TIERS.map((t) => {
            const current = t.key === plan
            return (
              <div key={t.key} className={cn('flex flex-col rounded-2xl border p-5', current ? 'border-primary bg-primary-soft/30 ring-4 ring-primary/10' : 'border-line bg-surface')}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold">{t.name}</h3>
                  {current && <Badge tone="primary">Current</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted">{t.blurb}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  {t.yearly == null ? (
                    <span className="font-display text-2xl font-semibold">Custom</span>
                  ) : (
                    <>
                      <span className="font-display text-3xl font-semibold tabular">${t.yearly}</span>
                      <span className="text-sm text-muted">/ month</span>
                    </>
                  )}
                </div>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span className="text-ink-2">{f}</span>
                    </li>
                  ))}
                </ul>
                <a href={mailto} className={cn('mt-5 w-full', current ? 'btn-secondary' : 'btn-primary')}>
                  {current ? 'Your plan' : t.yearly == null ? 'Talk to us' : 'Ask to switch'}
                </a>
              </div>
            )
          })}
        </div>
      </SettingsCard>
    </div>
  )
}
