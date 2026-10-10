'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { TextField, SelectField, TextareaField, MoneyField, CheckboxField, FormGrid, FormSection, FormError } from '@/components/ui/Field'
import { FileUpload } from '@/components/ui/FileUpload'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { nightsBetween, formatMoney } from '@/lib/format'
import { saveGuestAction } from '@/app/(app)/app/guests/actions'
import type { Guest } from '@/lib/types'

const emptyForm = (today: string, source: string) => ({
  room_id: '',
  guest_name: '',
  guest_count: '1',
  check_in: today,
  check_out: today,
  booking_source: source,
  amount_thb_day: '',
  amount_thb_stay: '',
  payment_method_id: '',
  payment: '',
  payment_1_date: '',
  payment_1_amount: '',
  payment_2_date: '',
  payment_2_amount: '',
  payment_3_date: '',
  payment_3_amount: '',
  email: '',
  phone: '',
  notes: '',
  passport_number: '',
  passport_expiry: '',
  tm30: false,
  add_to_revenue: true,
  show_on_legal: false,
  file_url: null as string | null,
})

type Form = ReturnType<typeof emptyForm>

function fromGuest(g: Partial<Guest>, today: string, source: string): Form {
  const e = emptyForm(today, source)
  return {
    ...e,
    room_id: g.room_id ?? '',
    guest_name: g.guest_name ?? '',
    guest_count: String(g.guest_count ?? 1),
    check_in: g.check_in ?? today,
    check_out: g.check_out ?? today,
    booking_source: g.booking_source ?? source,
    amount_thb_day: g.amount_thb_day == null ? '' : String(g.amount_thb_day),
    amount_thb_stay: g.amount_thb_stay == null ? '' : String(g.amount_thb_stay),
    payment_method_id: g.payment_method_id ?? '',
    payment: g.payment == null ? '' : String(g.payment),
    payment_1_date: g.payment_1_date ?? '',
    payment_1_amount: g.payment_1_amount == null ? '' : String(g.payment_1_amount),
    payment_2_date: g.payment_2_date ?? '',
    payment_2_amount: g.payment_2_amount == null ? '' : String(g.payment_2_amount),
    payment_3_date: g.payment_3_date ?? '',
    payment_3_amount: g.payment_3_amount == null ? '' : String(g.payment_3_amount),
    email: g.email ?? '',
    phone: g.phone ?? '',
    notes: g.notes ?? '',
    passport_number: g.passport_number ?? '',
    passport_expiry: g.passport_expiry ?? '',
    tm30: g.tm30 ?? false,
    add_to_revenue: g.add_to_revenue ?? true,
    show_on_legal: g.show_on_legal ?? false,
    file_url: g.file_url ?? null,
  }
}

export function GuestModal({ guest, onClose }: { guest: Partial<Guest> | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { rooms, paymentMethods, categories, today, baseCurrency } = useApp()
  const sources = categories('booking_source')
  const [form, setForm] = useState<Form>(() => emptyForm(today, sources[0] ?? 'Direct Booking'))
  const [stayTouched, setStayTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [key, setKey] = useState<string | null>(null)

  // Re-initialise when a different booking is opened.
  const k = guest ? guest.id ?? 'new' : null
  if (k !== key) {
    setKey(k)
    if (guest) {
      const f = fromGuest(guest, today, sources[0] ?? 'Direct Booking')
      if (!f.room_id && guest.room != null) f.room_id = rooms.find((r) => r.number === guest.room)?.id ?? ''
      setForm(f)
      setStayTouched(guest.amount_thb_stay != null)
    }
    setError(null)
    setErrors({})
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const input = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(k, e.target.value as never)

  const nights = nightsBetween(form.check_in, form.check_out)
  const rate = Number(form.amount_thb_day || 0)
  const autoStay = rate * nights
  const stay = stayTouched && form.amount_thb_stay !== '' ? Number(form.amount_thb_stay) : autoStay
  const splitSum = [form.payment_1_amount, form.payment_2_amount, form.payment_3_amount].reduce((s, v) => s + Number(v || 0), 0)
  const hasSplits = splitSum > 0
  const paid = hasSplits ? splitSum : Number(form.payment || 0)
  const balance = stay - paid

  const activeRooms = rooms.filter((r) => r.active || r.id === form.room_id)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveGuestAction({
      id: guest?.id,
      room_id: form.room_id,
      guest_name: form.guest_name,
      guest_count: form.guest_count,
      check_in: form.check_in,
      check_out: form.check_out,
      booking_source: form.booking_source,
      amount_thb_day: form.amount_thb_day,
      amount_thb_stay: stayTouched ? form.amount_thb_stay : '',
      payment_method_id: form.payment_method_id,
      payment: form.payment,
      payment_1_date: form.payment_1_date,
      payment_1_amount: form.payment_1_amount,
      payment_2_date: form.payment_2_date,
      payment_2_amount: form.payment_2_amount,
      payment_3_date: form.payment_3_date,
      payment_3_amount: form.payment_3_amount,
      email: form.email,
      phone: form.phone,
      notes: form.notes,
      passport_number: form.passport_number,
      passport_expiry: form.passport_expiry,
      tm30: form.tm30,
      add_to_revenue: form.add_to_revenue,
      show_on_legal: form.show_on_legal,
      file_url: form.file_url,
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(guest?.id ? 'Booking updated' : 'Booking added')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!guest}
      onClose={onClose}
      title={guest?.id ? 'Edit booking' : 'New booking'}
      subtitle={nights > 0 ? `${nights} night${nights === 1 ? '' : 's'}` : 'Same-day stay'}
      size="lg"
      persistent
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-muted">Balance </span>
            <span className={balance > 0 ? 'font-semibold text-danger' : 'font-semibold text-success'}>{formatMoney(balance, baseCurrency)}</span>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="btn-primary" form="guest-form" disabled={busy}>
              {busy ? <Spinner size="sm" /> : 'Save booking'}
            </button>
          </div>
        </div>
      }
    >
      <form id="guest-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <FormSection title="Stay">
            <SelectField label="Room" required value={form.room_id} onChange={input('room_id')} options={activeRooms.map((r) => ({ value: r.id, label: `${r.name} (No. ${r.number})` }))} placeholder="Choose a room" error={errors.room_id} />
            <TextField label="Guest name" required value={form.guest_name} onChange={input('guest_name')} error={errors.guest_name} autoComplete="off" />
            <TextField label="Check-in" type="date" required value={form.check_in} onChange={input('check_in')} error={errors.check_in} />
            <TextField label="Check-out" type="date" required value={form.check_out} onChange={input('check_out')} error={errors.check_out} min={form.check_in} />
            <SelectField label="Booking source" value={form.booking_source} onChange={input('booking_source')} options={sources.includes(form.booking_source) ? sources : [form.booking_source, ...sources]} />
            <TextField label="Guests" type="number" inputMode="numeric" min={1} value={form.guest_count} onChange={input('guest_count')} />
          </FormSection>

          <FormSection title="Pricing">
            <MoneyField label="Rate per night" currency={baseCurrency} value={form.amount_thb_day} onChange={input('amount_thb_day')} error={errors.amount_thb_day} />
            <MoneyField
              label="Total stay"
              currency={baseCurrency}
              value={stayTouched ? form.amount_thb_stay : autoStay ? String(autoStay) : ''}
              onChange={(e) => {
                setStayTouched(true)
                set('amount_thb_stay', e.target.value)
              }}
              hint={stayTouched ? <button type="button" className="text-primary hover:underline" onClick={() => { setStayTouched(false); set('amount_thb_stay', '') }}>Use rate × nights</button> : `Rate × ${nights} nights`}
              error={errors.amount_thb_stay}
            />
          </FormSection>

          <FormSection title="Payment">
            <SelectField label="Payment method" value={form.payment_method_id} onChange={input('payment_method_id')} options={paymentMethods.map((p) => ({ value: p.id, label: p.name }))} placeholder="Not set" hint="Moves the matching account in the ledger" />
            <MoneyField label="Amount paid" currency={baseCurrency} value={hasSplits ? String(splitSum) : form.payment} onChange={input('payment')} disabled={hasSplits} hint={hasSplits ? 'Sum of the dated payments below' : undefined} />
            {([1, 2, 3] as const).map((n) => (
              <div key={n} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
                <TextField label={`Payment ${n} date`} type="date" value={form[`payment_${n}_date`]} onChange={input(`payment_${n}_date`)} />
                <MoneyField label={`Payment ${n} amount`} currency={baseCurrency} value={form[`payment_${n}_amount`]} onChange={input(`payment_${n}_amount`)} />
              </div>
            ))}
          </FormSection>

          <FormSection title="Contact & immigration">
            <TextField label="Email" type="email" inputMode="email" value={form.email} onChange={input('email')} error={errors.email} />
            <TextField label="Phone" type="tel" inputMode="tel" value={form.phone} onChange={input('phone')} />
            <TextField label="Passport number" value={form.passport_number} onChange={input('passport_number')} autoComplete="off" />
            <TextField label="Passport expiry" type="date" value={form.passport_expiry} onChange={input('passport_expiry')} />
            <CheckboxField className="sm:col-span-2" label="TM30 immigration notification filed" checked={form.tm30} onChange={(v) => set('tm30', v)} />
          </FormSection>

          <FormSection title="Reporting">
            <CheckboxField label="Add to revenue" description="Creates exactly one revenue row dated by check-out, valued at the total stay." checked={form.add_to_revenue} onChange={(v) => set('add_to_revenue', v)} />
            <CheckboxField label="Show on legal page" description="Appears in the lawyer / accountant report." checked={form.show_on_legal} onChange={(v) => set('show_on_legal', v)} />
          </FormSection>

          <FormSection title="Notes & attachment">
            <TextareaField label="Notes" value={form.notes} onChange={input('notes')} rows={3} containerClassName="sm:col-span-2" />
            <FileUpload module="guests" value={form.file_url} onChange={(p) => set('file_url', p)} label="Attached document" capture className="sm:col-span-2" />
          </FormSection>
        </FormGrid>
      </form>
    </Modal>
  )
}
