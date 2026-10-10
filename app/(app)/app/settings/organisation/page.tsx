import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { OrganisationClient } from '@/components/settings/OrganisationClient'

export const metadata: Metadata = { title: 'Organisation settings' }

export default async function OrganisationSettingsPage() {
  const ctx = await pageContext('settings')
  return <OrganisationClient org={ctx.org} />
}
