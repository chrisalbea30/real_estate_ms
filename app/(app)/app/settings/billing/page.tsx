import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { todayIn } from '@/lib/format'
import { BillingPanel } from '@/components/settings/BillingPanel'

export const metadata: Metadata = { title: 'Billing' }

export default async function BillingSettingsPage() {
  const ctx = await pageContext('settings')
  return <BillingPanel org={ctx.org} propertyCount={ctx.properties.length} today={todayIn(ctx.property.timezone)} />
}
