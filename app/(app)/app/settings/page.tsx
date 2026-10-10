import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/context'
import { hasPerm } from '@/lib/permissions'

export default async function SettingsIndexPage() {
  const ctx = await getAppContext()
  if (!ctx) redirect('/login?next=/app/settings')
  if ('needsOnboarding' in ctx) redirect('/onboarding')
  redirect(hasPerm(ctx.perms, 'settings', 'view') ? '/app/settings/organisation' : '/app/settings/profile')
}
