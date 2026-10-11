import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { todayIn } from '@/lib/format'
import { getWorkspaceUsage } from '@/lib/usage'
import { trialState } from '@/lib/plans'
import { BillingPanel } from '@/components/settings/BillingPanel'

export const metadata: Metadata = { title: 'Billing' }

export default async function BillingSettingsPage() {
  const ctx = await pageContext('settings')
  const usage = await getWorkspaceUsage(ctx)
  const t = trialState(ctx.org.plan, ctx.org.trial_ends_at, todayIn(ctx.property.timezone))
  return (
    <BillingPanel
      orgId={ctx.org.id}
      orgName={ctx.org.name}
      planKey={usage.plan.key}
      trial={{ ...t, endsOn: ctx.org.trial_ends_at ? ctx.org.trial_ends_at.slice(0, 10) : null }}
      seats={{ used: usage.seatsUsed, limit: usage.seatLimit, members: usage.members, waiting: usage.pendingInvitations, extra: usage.extraSeats }}
      properties={{ used: usage.properties, limit: usage.propertyLimit }}
    />
  )
}
