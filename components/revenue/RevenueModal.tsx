'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { TextField, SelectField, TextareaField, MoneyField, CheckboxField, FormGrid, FormError } from '@/components/ui/Field'
import { FileUpload } from '@/components/ui/FileUpload'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { saveRevenueAction } from '@/app/(app)/app/revenue/actions'
import type { Revenue } from '@/lib/types'

const emptyForm = (today: string, type: string) => ({
  date: today,
  type,
  supplier: '',
  amount_thb: '',
  notes: '',
  file_url: null as string | null,
  show_on_legal: false,
})

type Form = ReturnType<typeof emptyForm>

function fromRevenue(r: Partial<Revenue>, today: string, type: string): Form {
  return {
    date: r.date ?? today,
    type: r.type ?? type,
    supplier: r.supplier ?? '',
    amount_thb: r.amount_thb == null ? '' : String(r.amount_thb),
    notes: r.notes ?? '',
    file_url: r.file_url ?? null,
    show_on_legal: r.show_on_legal ?? false,
  }
}

/** Manual revenue only: booking rows are edited in Guests. */
export function RevenueModal({ revenue, onClose }: { revenue: Partial<Revenue> | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { categories, today, baseCurrency } = useApp()
  const sources = categories('revenue_source')
  const defaultType = sources.includes('Booking.com') ? 'Booking.com' : sources[0] ?? 'Direct Booking'
  const [form, setForm] = useState<Form>(() => emptyForm(today, defaultType))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [key, setKey] = useState<string | null>(null)

  const k = revenue ? revenue.id ?? 'new' : null
  if (k !== key) {
    setKey(k)
    if (revenue) setForm(fromRevenue(revenue, today, defaultType))
    setError(null)
    setErrors({})
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const input = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(k, e.target.value as never)

  // Legacy free-text sources stay selectable when editing.
  const typeOptions = form.type && !sources.includes(form.type) ? [form.type, ...sources] : sources

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveRevenueAction({ id: revenue?.id, ...form })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(revenue?.id ? 'Revenue updated' : 'Revenue added')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!revenue}
      onClose={onClose}
      title={revenue?.id ? 'Edit revenue' : 'New revenue'}
      subtitle="Manual income. Booking revenue is created from Guests."
      size="md"
      persistent
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" form="revenue-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Save revenue'}
          </button>
        </div>
      }
    >
      <form id="revenue-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Date" type="date" required value={form.date} onChange={input('date')} error={errors.date} />
          <SelectField label="Type / source" required value={form.type} onChange={input('type')} options={typeOptions} placeholder={typeOptions.length ? undefined : 'Add sources in Settings'} error={errors.type} />
          <TextField label="Description" value={form.supplier} onChange={input('supplier')} placeholder="What was this income for?" autoComplete="off" containerClassName="sm:col-span-2" />
          <MoneyField label="Amount" required currency={baseCurrency} value={form.amount_thb} onChange={input('amount_thb')} error={errors.amount_thb} />
          <CheckboxField label="Show to legal" description="Appears in the lawyer / accountant report." checked={form.show_on_legal} onChange={(v) => set('show_on_legal', v)} />
          <TextareaField label="Notes" value={form.notes} onChange={input('notes')} rows={3} containerClassName="sm:col-span-2" />
          <FileUpload module="revenue" value={form.file_url} onChange={(p) => set('file_url', p)} label="Document" className="sm:col-span-2" />
        </FormGrid>
      </form>
    </Modal>
  )
}
