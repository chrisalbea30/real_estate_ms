import type { Metadata } from 'next'
import { pageContext } from '@/lib/page'
import { CategoriesClient } from '@/components/settings/CategoriesClient'

export const metadata: Metadata = { title: 'Categories' }

export default async function CategoriesSettingsPage() {
  const ctx = await pageContext('settings')
  return <CategoriesClient categories={ctx.org.settings?.categories ?? {}} />
}
