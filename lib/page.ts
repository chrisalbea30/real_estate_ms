import 'server-only'
import { redirect } from 'next/navigation'
import { getAppContext, type AppContext } from '@/lib/context'
import { hasPerm, firstViewable } from '@/lib/permissions'
import { MODULES, type Action, type ModuleKey } from '@/lib/modules'

/**
 * For server pages inside /app: resolves the context and redirects when the
 * user is signed out, has no organisation, or cannot view the module.
 */
export async function pageContext(module: ModuleKey, action: Action = 'view'): Promise<AppContext> {
  const ctx = await getAppContext()
  if (!ctx) redirect('/login')
  if ('needsOnboarding' in ctx) redirect('/onboarding')
  if (!hasPerm(ctx.perms, module, action)) redirect(firstViewable(ctx.perms, MODULES))
  return ctx
}

export function safeNext(value: string | null | undefined, fallback = '/app') {
  if (!value) return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('://')) return fallback
  return value
}
