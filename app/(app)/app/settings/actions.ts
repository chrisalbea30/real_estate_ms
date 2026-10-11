'use server'

import { getWorkspaceUsage } from '@/lib/usage'
import { planOf } from '@/lib/plans'
import { revalidatePath } from 'next/cache'
import { AppError, requireContext, requirePerm, type AppContext } from '@/lib/context'
import { createServerSupabase, type ServerSupabase } from '@/lib/supabase/server'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'
import {
  categoriesSchema,
  exportTableSchema,
  inviteSchema,
  invoiceSettingsSchema,
  memberRoleSchema,
  memberStatusSchema,
  normalisePermissions,
  organisationSchema,
  passwordSchema,
  paymentMethodSchema,
  profileSchema,
  propertySchema,
  resetSchema,
  roleCreateSchema,
  rolePermissionsSchema,
  roleRenameSchema,
  roleTemplate,
  CATEGORY_KINDS,
  type CategoriesInput,
  type ExportTable,
  type InviteInput,
  type InvoiceSettingsInput,
  type MemberRoleInput,
  type MemberStatusInput,
  type OrganisationInput,
  type PasswordInput,
  type PaymentMethodInput,
  type ProfileInput,
  type PropertyInput,
  type ResetInput,
  type RoleCreateInput,
  type RolePermissionsInput,
  type RoleRenameInput,
} from '@/lib/schemas/settings'
import type { CategoryKind, Invitation, Membership, OrgRole, OrgSettings, PaymentMethod, Permissions, Property } from '@/lib/types'

/** Settings, properties, payment methods, roles and memberships feed the shell snapshot. */
function refresh() {
  revalidatePath('/app', 'layout')
}

/* ------------------------------------------------------------------ */
/* Organisation settings (JSON merge)                                  */
/* ------------------------------------------------------------------ */

async function currentSettings(supabase: ServerSupabase, orgId: string): Promise<OrgSettings> {
  const row = must(await supabase.from('organizations').select('settings').eq('id', orgId).single(), 'Organisation')
  return ((row.settings ?? {}) as OrgSettings)
}

async function patchSettings(supabase: ServerSupabase, orgId: string, patch: Partial<OrgSettings>, extra: { name?: string } = {}) {
  const current = await currentSettings(supabase, orgId)
  const next: OrgSettings = { ...current, ...patch }
  mustOk(await supabase.from('organizations').update({ settings: next, ...extra }).eq('id', orgId))
  return next
}

export async function saveOrganisationAction(input: OrganisationInput): Promise<ActionResult<undefined>> {
  return run(async () => {
    const data = organisationSchema.parse(input)
    const ctx = await requirePerm('settings', 'edit')
    const supabase = await createServerSupabase()
    const display = [...new Set(data.display_currencies)].filter((c) => c !== data.base_currency)
    const links = data.external_links.map((l) => ({ label: l.label, url: l.url }))
    await patchSettings(
      supabase,
      ctx.org.id,
      {
        base_currency: data.base_currency,
        display_currencies: display,
        vat_rate: data.vat_rate,
        prices_include_vat: data.prices_include_vat,
        fiscal_year_start_month: data.fiscal_year_start_month,
        alerts: data.alerts,
        partner_hour_rate: data.partner_hour_rate,
        external_links: links,
      },
      { name: data.name },
    )
    refresh()
    return undefined
  })
}

export async function saveInvoiceSettingsAction(input: InvoiceSettingsInput): Promise<ActionResult<undefined>> {
  return run(async () => {
    const data = invoiceSettingsSchema.parse(input)
    const ctx = await requirePerm('settings', 'edit')
    const supabase = await createServerSupabase()
    await patchSettings(supabase, ctx.org.id, { invoice: { ...data, logo_path: data.logo_path || null } })
    refresh()
    return undefined
  })
}

export async function saveCategoriesAction(input: CategoriesInput): Promise<ActionResult<undefined>> {
  return run(async () => {
    const data = categoriesSchema.parse(input)
    const ctx = await requirePerm('settings', 'edit')
    const supabase = await createServerSupabase()
    const current = await currentSettings(supabase, ctx.org.id)
    const categories = { ...(current.categories ?? {}) } as Record<CategoryKind, string[]>
    for (const { key } of CATEGORY_KINDS) {
      const seen = new Set<string>()
      categories[key] = (data[key] ?? []).map((s) => s.trim()).filter((s) => s && !seen.has(s) && seen.add(s))
    }
    mustOk(await supabase.from('organizations').update({ settings: { ...current, categories } }).eq('id', ctx.org.id))
    refresh()
    return undefined
  })
}

/* ------------------------------------------------------------------ */
/* Profile and password                                                */
/* ------------------------------------------------------------------ */

export async function updateProfileAction(input: ProfileInput): Promise<ActionResult<undefined>> {
  return run(async () => {
    const data = profileSchema.parse(input)
    const ctx = await requireContext()
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('profiles').upsert({ id: ctx.userId, email: ctx.email, full_name: data.full_name }, { onConflict: 'id' }))
    // Membership display name: RLS only lets settings editors write memberships; for others this is a silent no-op.
    await supabase.from('memberships').update({ display_name: data.full_name }).eq('organization_id', ctx.org.id).eq('user_id', ctx.userId)
    refresh()
    return undefined
  })
}

export async function changePasswordAction(input: PasswordInput): Promise<ActionResult<undefined>> {
  return run(async () => {
    const data = passwordSchema.parse(input)
    const supabase = await createServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) throw new AppError('Not signed in', 401)
    const check = await supabase.auth.signInWithPassword({ email: user.email, password: data.current })
    if (check.error) {
      const m = check.error.message.toLowerCase()
      if (m.includes('invalid login credentials')) throw new AppError('The current password is incorrect.')
      if (m.includes('rate limit') || m.includes('too many')) throw new AppError('Too many attempts. Please wait a minute and try again.')
      throw new AppError(check.error.message)
    }
    const { error } = await supabase.auth.updateUser({ password: data.next })
    if (error) {
      const m = error.message.toLowerCase()
      if (m.includes('should be different')) throw new AppError('Choose a password you have not used before.')
      throw new AppError(error.message)
    }
    return undefined
  })
}

/* ------------------------------------------------------------------ */
/* Properties                                                          */
/* ------------------------------------------------------------------ */

export async function savePropertyAction(input: PropertyInput): Promise<ActionResult<Property>> {
  return run(async () => {
    const data = propertySchema.parse(input)
    const ctx = await requirePerm('settings', 'edit')
    const supabase = await createServerSupabase()
    if (data.id && !data.active) {
      const others = ctx.properties.filter((p) => p.id !== data.id && p.active)
      if (others.length === 0) throw new AppError('At least one property must stay active.')
    }
    if (data.active) {
      const limit = planOf(ctx.org.plan).properties
      const activeOthers = ctx.properties.filter((p) => p.id !== data.id && p.active).length
      if (limit != null && activeOthers + 1 > limit) {
        throw new AppError(`The ${planOf(ctx.org.plan).name} plan allows ${limit} active ${limit === 1 ? 'property' : 'properties'} per workspace. Ask us to change your plan under Settings, Billing.`)
      }
    }
    const payload = { name: data.name, timezone: data.timezone, address: data.address || null, active: data.active }
    const row = data.id
      ? must(await supabase.from('properties').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update property')
      : must(await supabase.from('properties').insert({ ...payload, organization_id: ctx.org.id }).select().single(), 'Create property')
    refresh()
    return row as Property
  })
}

/* ------------------------------------------------------------------ */
/* Payment methods                                                     */
/* ------------------------------------------------------------------ */

export async function savePaymentMethodAction(input: PaymentMethodInput): Promise<ActionResult<PaymentMethod>> {
  return run(async () => {
    const data = paymentMethodSchema.parse(input)
    const ctx = await requirePerm('settings', 'edit')
    const supabase = await createServerSupabase()
    const payload = { name: data.name, account_id: data.account_id || null, active: data.active, sort: data.sort }
    const row = data.id
      ? must(await supabase.from('payment_methods').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update payment method')
      : must(await supabase.from('payment_methods').insert({ ...payload, organization_id: ctx.org.id }).select().single(), 'Create payment method')
    refresh()
    return row as PaymentMethod
  })
}

export async function deletePaymentMethodAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('settings', 'delete')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('payment_methods').delete().eq('id', id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}

/* ------------------------------------------------------------------ */
/* Team: memberships                                                   */
/* ------------------------------------------------------------------ */

async function loadMembership(supabase: ServerSupabase, ctx: AppContext, id: string): Promise<Membership> {
  return must(await supabase.from('memberships').select('*').eq('id', id).eq('organization_id', ctx.org.id).single(), 'Member') as Membership
}

async function ownerRoleId(supabase: ServerSupabase, ctx: AppContext): Promise<string | null> {
  const { data } = await supabase.from('org_roles').select('id').eq('organization_id', ctx.org.id).eq('is_system', true).limit(1).maybeSingle()
  return data?.id ?? null
}

/** Throws when the membership is the only active Owner of the organisation. */
async function assertNotLastOwner(supabase: ServerSupabase, ctx: AppContext, m: Membership, what: string) {
  const owner = await ownerRoleId(supabase, ctx)
  if (!owner || m.role_id !== owner || m.status !== 'active') return
  const { count } = await supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('organization_id', ctx.org.id).eq('role_id', owner).eq('status', 'active')
  if ((count ?? 0) <= 1) throw new AppError(`This is the only Owner of the organisation and cannot be ${what}. Make someone else an Owner first.`)
}

export async function updateMemberRoleAction(input: MemberRoleInput): Promise<ActionResult<undefined>> {
  return run(async () => {
    const data = memberRoleSchema.parse(input)
    const ctx = await requirePerm('settings', 'edit')
    const supabase = await createServerSupabase()
    const m = await loadMembership(supabase, ctx, data.membership_id)
    if (m.role_id === data.role_id) return undefined
    must(await supabase.from('org_roles').select('id').eq('id', data.role_id).eq('organization_id', ctx.org.id).single(), 'Role')
    await assertNotLastOwner(supabase, ctx, m, 'demoted')
    mustOk(await supabase.from('memberships').update({ role_id: data.role_id }).eq('id', m.id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}

export async function setMemberStatusAction(input: MemberStatusInput): Promise<ActionResult<undefined>> {
  return run(async () => {
    const data = memberStatusSchema.parse(input)
    const ctx = await requirePerm('settings', 'edit')
    const supabase = await createServerSupabase()
    const m = await loadMembership(supabase, ctx, data.membership_id)
    if (m.user_id === ctx.userId) throw new AppError('You cannot suspend your own access.')
    if (data.status === 'suspended') await assertNotLastOwner(supabase, ctx, m, 'suspended')
    mustOk(await supabase.from('memberships').update({ status: data.status }).eq('id', m.id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}

export async function removeMemberAction(membershipId: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('settings', 'edit')
    const supabase = await createServerSupabase()
    const m = await loadMembership(supabase, ctx, membershipId)
    if (m.user_id === ctx.userId) throw new AppError('You cannot remove yourself. Ask another administrator.')
    await assertNotLastOwner(supabase, ctx, m, 'removed')
    mustOk(await supabase.from('memberships').delete().eq('id', m.id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}

/* ------------------------------------------------------------------ */
/* Team: invitations (links are shared by hand; no email is sent)      */
/* ------------------------------------------------------------------ */

async function insertInvitation(supabase: ServerSupabase, ctx: AppContext, email: string, roleId: string): Promise<Invitation> {
  // One live link per address: retire older pending invitations for the same email.
  await supabase.from('invitations').update({ status: 'revoked' }).eq('organization_id', ctx.org.id).eq('email', email).eq('status', 'pending')
  // People limit of the plan: members plus invitations still waiting count as people.
  const usage = await getWorkspaceUsage(ctx)
  if (usage.seatLimit != null && usage.seatsUsed + 1 > usage.seatLimit) {
    throw new AppError(`This workspace has reached its limit of ${usage.seatLimit} people on the ${usage.plan.name} plan. Remove someone, cancel a waiting invitation, or add people to your plan under Settings, Billing.`)
  }
  const row = must(
    await supabase.from('invitations').insert({ organization_id: ctx.org.id, email, role_id: roleId, invited_by: ctx.userId }).select().single(),
    'Create invitation',
  )
  return row as Invitation
}

export async function createInvitationAction(input: InviteInput): Promise<ActionResult<Invitation>> {
  return run(async () => {
    const data = inviteSchema.parse(input)
    const ctx = await requirePerm('settings', 'edit')
    const supabase = await createServerSupabase()
    must(await supabase.from('org_roles').select('id').eq('id', data.role_id).eq('organization_id', ctx.org.id).single(), 'Role')

    type Row = { user_id: string; profiles: { email: string | null } | { email: string | null }[] | null }
    const { data: members } = await supabase.from('memberships').select('user_id, profiles:profiles!memberships_profile_fkey(email)').eq('organization_id', ctx.org.id)
    const taken = ((members ?? []) as Row[]).some((m) => {
      const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      return (p?.email ?? '').toLowerCase() === data.email
    })
    if (taken) throw new AppError('That person is already a member of this organisation.')

    const inv = await insertInvitation(supabase, ctx, data.email, data.role_id)
    revalidatePath('/app/settings/team')
    return inv
  })
}

export async function revokeInvitationAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('settings', 'edit')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('invitations').update({ status: 'revoked' }).eq('id', id).eq('organization_id', ctx.org.id).eq('status', 'pending'))
    revalidatePath('/app/settings/team')
    return undefined
  })
}

/** Issues a fresh token (new row) for the same email and role; the old link stops working. */
export async function resendInvitationAction(id: string): Promise<ActionResult<Invitation>> {
  return run(async () => {
    const ctx = await requirePerm('settings', 'edit')
    const supabase = await createServerSupabase()
    const old = must(await supabase.from('invitations').select('*').eq('id', id).eq('organization_id', ctx.org.id).single(), 'Invitation') as Invitation
    if (old.status === 'accepted') throw new AppError('That invitation was already accepted.')
    const inv = await insertInvitation(supabase, ctx, old.email, old.role_id)
    revalidatePath('/app/settings/team')
    return inv
  })
}

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

async function loadRole(supabase: ServerSupabase, ctx: AppContext, id: string): Promise<OrgRole> {
  return must(await supabase.from('org_roles').select('*').eq('id', id).eq('organization_id', ctx.org.id).single(), 'Role') as OrgRole
}

export async function saveRolePermissionsAction(input: RolePermissionsInput): Promise<ActionResult<undefined>> {
  return run(async () => {
    const data = rolePermissionsSchema.parse(input)
    const ctx = await requirePerm('settings', 'edit')
    const supabase = await createServerSupabase()
    const role = await loadRole(supabase, ctx, data.role_id)
    if (role.is_system) throw new AppError('The Owner role always has every permission and cannot be edited.')
    const permissions: Permissions = normalisePermissions(data.permissions)
    if (role.id === ctx.role.id && !(permissions.settings?.view && permissions.settings?.edit)) {
      throw new AppError('You cannot remove Settings access from your own role.')
    }
    mustOk(await supabase.from('org_roles').update({ permissions }).eq('id', role.id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}

export async function createRoleAction(input: RoleCreateInput): Promise<ActionResult<OrgRole>> {
  return run(async () => {
    const data = roleCreateSchema.parse(input)
    const ctx = await requirePerm('settings', 'edit')
    const supabase = await createServerSupabase()
    let permissions: Permissions
    if (data.copy_from_role_id) {
      const source = await loadRole(supabase, ctx, data.copy_from_role_id)
      permissions = normalisePermissions((source.permissions ?? {}) as Record<string, Partial<Record<'view' | 'add' | 'edit' | 'delete', boolean>>>)
    } else {
      permissions = roleTemplate(data.template ?? 'Empty')
    }
    const row = must(
      await supabase.from('org_roles').insert({ organization_id: ctx.org.id, name: data.name, is_system: false, permissions }).select().single(),
      'Create role',
    )
    refresh()
    return row as OrgRole
  })
}

export async function renameRoleAction(input: RoleRenameInput): Promise<ActionResult<undefined>> {
  return run(async () => {
    const data = roleRenameSchema.parse(input)
    const ctx = await requirePerm('settings', 'edit')
    const supabase = await createServerSupabase()
    const role = await loadRole(supabase, ctx, data.role_id)
    if (role.is_system) throw new AppError('The Owner role cannot be renamed.')
    mustOk(await supabase.from('org_roles').update({ name: data.name }).eq('id', role.id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}

export async function deleteRoleAction(roleId: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('settings', 'edit')
    const supabase = await createServerSupabase()
    const role = await loadRole(supabase, ctx, roleId)
    if (role.is_system) throw new AppError('The Owner role cannot be deleted.')
    const { count: members } = await supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('organization_id', ctx.org.id).eq('role_id', role.id)
    if ((members ?? 0) > 0) throw new AppError(`${members} member${members === 1 ? ' has' : 's have'} this role. Move them to another role first.`)
    const { count: invites } = await supabase.from('invitations').select('id', { count: 'exact', head: true }).eq('organization_id', ctx.org.id).eq('role_id', role.id).eq('status', 'pending')
    if ((invites ?? 0) > 0) throw new AppError(`${invites} pending invitation${invites === 1 ? ' uses' : 's use'} this role. Revoke or resend them with another role first.`)
    mustOk(await supabase.from('org_roles').delete().eq('id', role.id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}

/* ------------------------------------------------------------------ */
/* Data: export and reset                                              */
/* ------------------------------------------------------------------ */

const EXPORT_PAGE = 1000
const EXPORT_MAX_PAGES = 50

/**
 * Returns every row of one table for the current organisation. RLS still
 * applies, so tables the caller cannot view come back empty.
 */
export async function exportTableAction(table: ExportTable): Promise<ActionResult<Record<string, unknown>[]>> {
  return run(async () => {
    const name = exportTableSchema.parse(table)
    const ctx = await requirePerm('settings', 'view')
    const supabase = await createServerSupabase()
    const rows: Record<string, unknown>[] = []
    for (let page = 0; page < EXPORT_MAX_PAGES; page++) {
      const from = page * EXPORT_PAGE
      // The union of table names is narrowed to one literal so the typed client stays simple; the query is identical for every table.
      const res = await supabase
        .from(name as 'rooms')
        .select('*')
        .eq('organization_id', ctx.org.id)
        .order('id', { ascending: true })
        .range(from, from + EXPORT_PAGE - 1)
      mustOk(res)
      const chunk = (res.data ?? []) as unknown as Record<string, unknown>[]
      rows.push(...chunk)
      if (chunk.length < EXPORT_PAGE) break
    }
    return rows
  })
}

export async function resetDataAction(input: ResetInput): Promise<ActionResult<undefined>> {
  return run(async () => {
    const data = resetSchema.parse(input)
    const ctx = await requirePerm('settings', 'delete')
    if (data.confirm.trim() !== ctx.org.name.trim()) throw new AppError('Type the organisation name exactly as shown to confirm.')
    const supabase = await createServerSupabase()
    const tables = [...new Set(data.tables)]
    mustOk(await supabase.rpc('app_reset_organization_data', { p_org: ctx.org.id, p_tables: tables }))
    refresh()
    return undefined
  })
}
