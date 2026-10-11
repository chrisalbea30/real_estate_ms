import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { createServerSupabase } from '@/lib/supabase/server'
import { hasPerm } from '@/lib/permissions'
import type { Action, ModuleKey } from '@/lib/modules'
import type { Membership, OrgRole, Organization, Permissions, Property, Profile } from '@/lib/types'

export const ORG_COOKIE = 'rems_org'
export const PROPERTY_COOKIE = 'rems_property'

export interface AppContext {
  userId: string
  email: string
  profile: Profile | null
  memberships: (Membership & { organizations: Pick<Organization, 'id' | 'name' | 'slug' | 'plan'> | null })[]
  org: Organization
  role: OrgRole
  perms: Permissions
  properties: Property[]
  property: Property
}

export class AppError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

/**
 * Resolves the signed-in user, their current organisation (cookie, else first
 * membership), the role and permissions, and the current property.
 * Returns null when not signed in; { needsOnboarding: true } when signed in
 * without any membership.
 */
export const getAppContext = cache(async (): Promise<AppContext | null | { needsOnboarding: true; userId: string; email: string }> => {
  const supabase = await createServerSupabase()
  // Verifies the session token (locally when the project uses signing keys).
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  if (!claims?.sub) return null
  const user = { id: claims.sub as string, email: (claims.email as string | undefined) ?? '' }

  // One parallel round trip: memberships with their organisation and role,
  // the profile, and every property the user can see (RLS limits it).
  const [{ data: memberships }, { data: profile }, { data: allProps }] = await Promise.all([
    supabase
      .from('memberships')
      .select('*, organizations(*), org_roles!memberships_role_id_fkey(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at'),
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('properties').select('*').order('created_at'),
  ])

  type Row = Membership & { organizations: Organization | null; org_roles: OrgRole | null }
  const rows = (memberships ?? []) as unknown as Row[]
  if (rows.length === 0) return { needsOnboarding: true, userId: user.id, email: user.email ?? '' }

  const cookieStore = await cookies()
  const wantedOrg = cookieStore.get(ORG_COOKIE)?.value
  const membership = rows.find((m) => m.organization_id === wantedOrg) ?? rows[0]!
  const org = membership.organizations
  const role = membership.org_roles
  if (!org || !role) return { needsOnboarding: true, userId: user.id, email: user.email ?? '' }

  const list = rows.map(({ organizations: o, ...m }) => ({ ...m, org_roles: undefined, organizations: o ? { id: o.id, name: o.name, slug: o.slug, plan: o.plan } : null })) as AppContext['memberships']

  const props = ((allProps ?? []) as Property[]).filter((p) => p.organization_id === org.id)
  const wantedProp = cookieStore.get(PROPERTY_COOKIE)?.value
  const property = props.find((p) => p.id === wantedProp && p.active) ?? props.find((p) => p.active) ?? props[0]
  if (!property) return { needsOnboarding: true, userId: user.id, email: user.email ?? '' }

  return {
    userId: user.id,
    email: user.email ?? '',
    profile: (profile as Profile | null) ?? null,
    memberships: list,
    org,
    role,
    perms: role.permissions ?? {},
    properties: props,
    property,
  }
})

/** For server actions: throws when not signed in or not a member. */
export async function requireContext(): Promise<AppContext> {
  const ctx = await getAppContext()
  if (!ctx) throw new AppError('Not signed in', 401)
  if ('needsOnboarding' in ctx) throw new AppError('No organisation', 403)
  return ctx
}

export async function requirePerm(module: ModuleKey, action: Action): Promise<AppContext> {
  const ctx = await requireContext()
  if (!hasPerm(ctx.perms, module, action)) {
    throw new AppError(`You do not have permission to ${action} ${module.replace(/_/g, ' ')}`, 403)
  }
  return ctx
}

export function can(ctx: AppContext, module: ModuleKey, action: Action) {
  return hasPerm(ctx.perms, module, action)
}
