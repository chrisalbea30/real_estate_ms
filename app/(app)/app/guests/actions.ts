'use server'

import { revalidatePath } from 'next/cache'
import { requirePerm } from '@/lib/context'
import { createServerSupabase } from '@/lib/supabase/server'
import { run, must, mustOk, type ActionResult } from '@/lib/actions'
import { guestSchema, num, type GuestInput } from '@/lib/schemas/guests'
import { nightsBetween, todayIn } from '@/lib/format'
import type { Guest, Invoice, InvoiceLine } from '@/lib/types'

function refresh() {
  revalidatePath('/app/guests')
  revalidatePath('/app')
  revalidatePath('/app/revenue')
  revalidatePath('/app/occupancy')
  revalidatePath('/app/operations')
}

export async function saveGuestAction(input: GuestInput): Promise<ActionResult<Guest>> {
  return run(async () => {
    const data = guestSchema.parse(input)
    const ctx = await requirePerm('guests', data.id ? 'edit' : 'add')
    const supabase = await createServerSupabase()

    const room = must(await supabase.from('rooms').select('id, number, name').eq('id', data.room_id).eq('property_id', ctx.property.id).single(), 'Room')

    let paidLabel: string | null = null
    if (data.payment_method_id) {
      const pm = must(await supabase.from('payment_methods').select('name').eq('id', data.payment_method_id).eq('organization_id', ctx.org.id).single(), 'Payment method')
      paidLabel = pm.name
    }

    const nights = nightsBetween(data.check_in, data.check_out)
    const rate = num(data.amount_thb_day)
    const enteredStay = num(data.amount_thb_stay)
    const stay = enteredStay ?? (rate != null ? rate * nights : null)

    const splits = [num(data.payment_1_amount), num(data.payment_2_amount), num(data.payment_3_amount)]
    const splitSum = splits.reduce<number>((s, v) => s + (v ?? 0), 0)
    const payment = splitSum > 0 ? splitSum : (num(data.payment) ?? 0)

    const payload = {
      room: room.number,
      room_id: room.id,
      guest_name: data.guest_name,
      guest_count: num(data.guest_count) ?? 1,
      check_in: data.check_in,
      check_out: data.check_out,
      booking_source: data.booking_source || null,
      amount_thb_day: rate,
      amount_thb_stay: stay,
      paid: paidLabel,
      payment_method_id: data.payment_method_id || null,
      payment,
      payment_1_date: data.payment_1_date || null,
      payment_1_amount: splits[0],
      payment_2_date: data.payment_2_date || null,
      payment_2_amount: splits[1],
      payment_3_date: data.payment_3_date || null,
      payment_3_amount: splits[2],
      email: data.email || null,
      phone: data.phone || null,
      notes: data.notes || null,
      passport_number: data.passport_number || null,
      passport_expiry: data.passport_expiry || null,
      tm30: data.tm30,
      add_to_revenue: data.add_to_revenue,
      show_on_legal: data.show_on_legal,
      file_url: data.file_url || null,
    }

    const row = data.id
      ? must(await supabase.from('guests').update(payload).eq('id', data.id).eq('organization_id', ctx.org.id).select().single(), 'Update booking')
      : must(await supabase.from('guests').insert({ ...payload, organization_id: ctx.org.id, property_id: ctx.property.id }).select().single(), 'Create booking')
    refresh()
    return row as Guest
  })
}

export async function deleteGuestAction(id: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('guests', 'delete')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('guests').delete().eq('id', id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}

/** Quick toggle used from the list (TM30 filed, flags). */
export async function patchGuestAction(id: string, patch: Partial<Pick<Guest, 'tm30' | 'add_to_revenue' | 'show_on_legal'>>): Promise<ActionResult<undefined>> {
  return run(async () => {
    const ctx = await requirePerm('guests', 'edit')
    const supabase = await createServerSupabase()
    mustOk(await supabase.from('guests').update(patch).eq('id', id).eq('organization_id', ctx.org.id))
    refresh()
    return undefined
  })
}

/**
 * Issues (or returns the existing) invoice for a booking. Sequential number
 * per organisation and year; a snapshot of issuer, bill-to and lines is stored
 * so the public link keeps rendering the same document.
 */
export async function issueInvoiceAction(guestId: string, opts: { regenerate?: boolean } = {}): Promise<ActionResult<Invoice>> {
  return run(async () => {
    const ctx = await requirePerm('guests', 'add')
    const supabase = await createServerSupabase()

    const existing = await supabase.from('invoices').select('*').eq('guest_id', guestId).eq('status', 'issued').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (existing.data && !opts.regenerate) return existing.data as Invoice

    const guest = must(await supabase.from('guests').select('*').eq('id', guestId).eq('organization_id', ctx.org.id).single(), 'Booking') as Guest
    const room = guest.room_id ? (await supabase.from('rooms').select('name').eq('id', guest.room_id).maybeSingle()).data : null

    const settings = ctx.org.settings
    const vatRate = Number(settings.vat_rate ?? 0)
    const total = Number(guest.amount_thb_stay ?? 0)
    const nights = Math.max(1, nightsBetween(guest.check_in, guest.check_out))
    let subtotal: number
    let vat: number
    let grand: number
    if (settings.prices_include_vat) {
      subtotal = vatRate > 0 ? total / (1 + vatRate / 100) : total
      vat = total - subtotal
      grand = total
    } else {
      subtotal = total
      vat = (total * vatRate) / 100
      grand = subtotal + vat
    }
    const r2 = (n: number) => Math.round(n * 100) / 100
    const deposit = Number(guest.payment ?? 0)

    const today = todayIn(ctx.property.timezone)
    const year = Number(guest.check_out.slice(0, 4)) || Number(today.slice(0, 4))
    const seq = must(await supabase.rpc('app_next_invoice_seq', { p_org: ctx.org.id, p_year: year }), 'Invoice number') as number
    const number = `${settings.invoice?.prefix || 'INV'}-${year}-${String(seq).padStart(4, '0')}`

    const lines: InvoiceLine[] = [
      {
        description: `Room charge – ${room?.name ?? `Room ${guest.room}`} (${guest.check_in} → ${guest.check_out})`,
        quantity: nights,
        unit_price: r2(subtotal / nights),
        amount: r2(subtotal),
      },
    ]

    if (existing.data && opts.regenerate) {
      await supabase.from('invoices').update({ status: 'void' }).eq('id', existing.data.id)
    }

    const row = must(
      await supabase
        .from('invoices')
        .insert({
          organization_id: ctx.org.id,
          property_id: ctx.property.id,
          guest_id: guest.id,
          number,
          year,
          seq,
          issued_date: guest.check_out <= today ? guest.check_out : today,
          currency: settings.base_currency ?? 'EUR',
          subtotal: r2(subtotal),
          vat_rate: vatRate,
          vat_amount: r2(vat),
          total: r2(grand),
          deposit: r2(deposit),
          balance_due: r2(grand - deposit),
          bill_to: { name: guest.guest_name, email: guest.email, phone: guest.phone, passport: guest.passport_number },
          lines,
          issuer: { ...(settings.invoice ?? {}), property_name: ctx.property.name, address: settings.invoice?.address || ctx.property.address || '' },
          notes: settings.invoice?.footer ?? null,
        })
        .select()
        .single(),
      'Create invoice',
    )
    revalidatePath('/app/guests')
    return row as Invoice
  })
}
