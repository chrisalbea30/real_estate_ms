import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { InvoicesClient } from '@/components/settings/InvoicesClient'

export const metadata: Metadata = { title: 'Invoice settings' }

export default async function InvoiceSettingsPage() {
  const ctx = await pageContext('settings')
  return <InvoicesClient org={ctx.org} propertyName={ctx.property.name} />
}
