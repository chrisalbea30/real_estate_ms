import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { PropertiesClient } from '@/components/settings/PropertiesClient'

export const metadata: Metadata = { title: 'Properties' }

export default async function PropertiesSettingsPage() {
  const ctx = await pageContext('settings')
  return <PropertiesClient properties={ctx.properties} currentId={ctx.property.id} />
}
