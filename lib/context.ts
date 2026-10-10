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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: memberships }, { data: profile }] = await Promise.all([
    supabase
      .from('memberships')
      .select('*, organizations(id, name, slug, plan)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at'),
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
  ])

  const list = (memberships ?? []) as AppContext['memberships']
  if (list.length === 0) return { needsOnboarding: true, userId: user.id, email: user.email ?? '' }

  const cookieStore = await cookies()
  const wantedOrg = cookieStore.get(ORG_COOKIE)?.value
  const membership = list.find((m) => m.organization_id === wantedOrg) ?? list[0]!

  const [{ data: org }, { data: role }, { data: properties }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', membership.organization_id).single(),
    supabase.from('org_roles').select('*').eq('id', membership.role_id).single(),
    supabase.from('properties').select('*').eq('organization_id', membership.organization_id).order('created_at'),
  ])
  if (!org || !role) return { needsOnboarding: true, userId: user.id, email: user.email ?? '' }

  const props = (properties ?? []) as Property[]
  const wantedProp = cookieStore.get(PROPERTY_COOKIE)?.value
  const property = props.find((p) => p.id === wantedProp && p.active) ?? props.find((p) => p.active) ?? props[0]
  if (!property) return { needsOnboarding: true, userId: user.id, email: user.email ?? '' }

  return {
    userId: user.id,
    email: user.email ?? '',
    profile: (profile as Profile | null) ?? null,
    memberships: list,
    org: org as Organization,
    role: role as OrgRole,
    perms: (role as OrgRole).permissions ?? {},
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
