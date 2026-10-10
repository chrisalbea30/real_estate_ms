'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { TextField, SelectField, TextareaField, MoneyField, CheckboxField, FormGrid, FormSection, FormError } from '@/components/ui/Field'
import { FileUpload } from '@/components/ui/FileUpload'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { savePartnerAction } from '@/app/(app)/app/partners/actions'
import type { Partner } from '@/lib/types'

const emptyForm = (hourRate: string) => ({
  name: '',
  role: '',
  share_percentage: '',
  amount_to_found_thb: '',
  hour_rate: hourRate,
  bio: '',
  photo_url: null as string | null,
  email: '',
  phone: '',
  nationality: '',
  joined_date: '',
  user_id: '',
  active: true,
})
type Form = ReturnType<typeof emptyForm>

const str = (v: number | string | null | undefined) => (v == null ? '' : String(v))

function fromPartner(p: Partial<Partner>, hourRate: string): Form {
  return {
    ...emptyForm(hourRate),
    name: p.name ?? '',
    role: p.role ?? '',
    share_percentage: str(p.share_percentage),
    amount_to_found_thb: str(p.amount_to_found_thb),
    hour_rate: p.hour_rate == null ? hourRate : String(p.hour_rate),
    bio: p.bio ?? '',
    photo_url: p.photo_url ?? null,
    email: p.email ?? '',
    phone: p.phone ?? '',
    nationality: p.nationality ?? '',
    joined_date: p.joined_date ?? '',
    user_id: p.user_id ?? '',
    active: p.active ?? true,
  }
}

export function PartnerModal({ partner, onClose }: { partner: Partial<Partner> | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { members, settings, baseCurrency } = useApp()
  const defaultRate = settings.partner_hour_rate == null ? '' : String(settings.partner_hour_rate)
  const [form, setForm] = useState<Form>(() => emptyForm(defaultRate))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [key, setKey] = useState<string | null>(null)

  // Re-initialise when a different partner is opened.
  const k = partner ? partner.id ?? 'new' : null
  if (k !== key) {
    setKey(k)
    if (partner) setForm(fromPartner(partner, defaultRate))
    setError(null)
    setErrors({})
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const input = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(k, e.target.value as never)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await savePartnerAction({ id: partner?.id, ...form })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(partner?.id ? 'Partner updated' : 'Partner added')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!partner}
      onClose={onClose}
      title={partner?.id ? 'Edit partner' : 'New partner'}
      size="lg"
      persistent
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-primary" form="partner-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Save partner'}
          </button>
        </div>
      }
    >
      <form id="partner-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <FormSection title="Profile">
            <TextField label="Name" required value={form.name} onChange={input('name')} error={errors.name} autoComplete="off" />
            <TextField label="Role" required value={form.role} onChange={input('role')} error={errors.role} placeholder="Managing partner" />
            <TextField label="Nationality" value={form.nationality} onChange={input('nationality')} error={errors.nationality} />
            <TextField label="Joined" type="date" value={form.joined_date} onChange={input('joined_date')} error={errors.joined_date} />
            <TextareaField label="Bio" value={form.bio} onChange={input('bio')} rows={3} containerClassName="sm:col-span-2" error={errors.bio} />
            <FileUpload module="partners" value={form.photo_url} onChange={(p) => set('photo_url', p)} label="Photo" accept="image/*" capture className="sm:col-span-2" />
          </FormSection>

          <FormSection title="Ownership & capital">
            <TextField label="Ownership %" type="number" inputMode="decimal" step="0.01" min={0} max={100} value={form.share_percentage} onChange={input('share_percentage')} error={errors.share_percentage} hint="All partners together should add up to 100%" />
            <MoneyField label="Agreed capital" currency={baseCurrency} value={form.amount_to_found_thb} onChange={input('amount_to_found_thb')} error={errors.amount_to_found_thb} hint="Amount this partner committed to contribute" />
            <MoneyField label="Hour rate" currency={baseCurrency} value={form.hour_rate} onChange={input('hour_rate')} error={errors.hour_rate} hint="Default rate for partner work records" />
          </FormSection>

          <FormSection title="Contact & access">
            <TextField label="Email" type="email" inputMode="email" value={form.email} onChange={input('email')} error={errors.email} />
            <TextField label="Phone" type="tel" inputMode="tel" value={form.phone} onChange={input('phone')} error={errors.phone} />
            <SelectField label="Linked team member" value={form.user_id} onChange={input('user_id')} options={members.map((m) => ({ value: m.user_id, label: m.name }))} placeholder="Not linked" hint="Connects this profile to a login of your team" error={errors.user_id} />
            <CheckboxField label="Active" description="Inactive partners are hidden from forms and excluded from the ownership total." checked={form.active} onChange={(v) => set('active', v)} />
          </FormSection>
        </FormGrid>
      </form>
    </Modal>
  )
}
