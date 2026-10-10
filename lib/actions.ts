// Shared shape for server action results and a helper that turns thrown
// errors (zod, AppError, PostgREST) into a plain object the client can show.

import { ZodError } from 'zod'
import { AppError } from '@/lib/context'

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data }
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors }
}

export function friendlyDbError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('row-level security')) return 'You do not have permission to do that.'
  if (m.includes('guests_unique_booking')) return 'A booking with the same guest, room and dates already exists.'
  if (m.includes('rooms_property_number_key')) return 'A room with that number already exists in this property.'
  if (m.includes('budget_room_setup_property_year_room_key')) return 'That room already has a setup row for this year.'
  if (m.includes('accounts_organization_id_name_key')) return 'An account with that name already exists.'
  if (m.includes('payment_methods_organization_id_name_key')) return 'A payment method with that name already exists.'
  if (m.includes('org_roles_organization_id_name_key')) return 'A role with that name already exists.'
  if (m.includes('memberships_organization_id_user_id_key')) return 'That person is already a member.'
  if (m.includes('duplicate key')) return 'That record already exists.'
  if (m.includes('violates foreign key')) return 'This record is linked to other data and cannot be changed that way.'
  if (m.includes('jwt expired') || m.includes('not authenticated')) return 'Your session expired. Please sign in again.'
  return message
}

/** Wrap a server action body so every failure returns { ok:false, error }. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    return { ok: true, data }
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of e.issues) {
        const key = issue.path.join('.') || '_'
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      return { ok: false, error: 'Please check the highlighted fields.', fieldErrors }
    }
    if (e instanceof AppError) return { ok: false, error: e.message }
    const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : 'Something went wrong'
    return { ok: false, error: friendlyDbError(msg) }
  }
}

/** Throws a readable error for a PostgREST response. */
export function must<R extends { data: unknown; error: { message: string } | null }>(res: R, what = 'Database request'): NonNullable<R['data']> {
  if (res.error) throw new Error(friendlyDbError(res.error.message))
  if (res.data === null || res.data === undefined) throw new Error(`${what} returned nothing`)
  return res.data as NonNullable<R['data']>
}

export function mustOk(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(friendlyDbError(res.error.message))
}
