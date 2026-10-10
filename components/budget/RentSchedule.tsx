'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Section } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { MoneyField, TextField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { saveRentAction, deleteRentAction } from '@/app/(app)/app/budget/actions'
import type { BudgetRent } from '@/lib/types'

const monthly = (r: BudgetRent) => Number(r.rent_thb ?? 0) / 12

export function RentSchedule({ rows }: { rows: BudgetRent[] }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can, fmt, settings } = useApp()
  const [editing, setEditing] = useState<Partial<BudgetRent> | null>(null)

  const remove = async (r: BudgetRent) => {
    if (!(await confirm({ title: `Delete rent year ${r.year_number}?`, confirmLabel: 'Delete', danger: true }))) return
    const res = await deleteRentAction(r.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Deleted')
    router.refresh()
  }

  const nextYear = rows.reduce((m, r) => Math.max(m, r.year_number), 0) + 1

  const columns: Column<BudgetRent>[] = [
    { key: 'year', header: 'Year', cell: (r) => <span className="font-medium">Year {r.year_number}</span>, sortValue: (r) => r.year_number, width: '6rem' },
    { key: 'label', header: 'Label', cell: (r) => r.year_label ?? <span className="text-muted">—</span>, sortValue: (r) => r.year_label ?? '' },
    { key: 'rent', header: 'Annual rent', cell: (r) => fmt(r.rent_thb), sortValue: (r) => r.rent_thb, align: 'right' },
    { key: 'vat', header: `VAT`, cell: (r) => (r.vat_amount != null ? fmt(r.vat_amount) : '—'), sortValue: (r) => r.vat_amount ?? 0, align: 'right', hide: 'md' },
    { key: 'monthly', header: 'Monthly', cell: (r) => fmt(monthly(r)), sortValue: (r) => monthly(r), align: 'right' },
  ]

  return (
    <Section
      title="Rent schedule"
      description={`Annual rent per lease year. VAT defaults to rent × ${settings.vat_rate ?? 0}%; monthly = rent ÷ 12.`}
      actions={
        can('budget', 'add') && (
          <button className="btn-secondary btn-sm" onClick={() => setEditing({ year_number: nextYear })}>
            <Plus className="h-4 w-4" /> Add year
          </button>
        )
      }
    >
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        pageSize={0}
        defaultSort={{ key: 'year', dir: 'asc' }}
        empty={<div className="card p-6 text-center text-sm text-muted">No rent years yet.</div>}
        actions={(r) => (
          <>
            {can('budget', 'edit') && (
              <button className="icon-btn !h-8 !w-8" title="Edit" onClick={() => setEditing(r)}>
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {can('budget', 'delete') && (
              <button className="icon-btn !h-8 !w-8 text-danger" title="Delete" onClick={() => remove(r)}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </>
        )}
        footer={(list) => (
          <div className="flex flex-wrap justify-between gap-2 tabular">
            <span className="text-muted">{list.length} year{list.length === 1 ? '' : 's'}</span>
            <span>
              Rent <strong>{fmt(list.reduce((s, r) => s + Number(r.rent_thb ?? 0), 0))}</strong> · VAT <strong>{fmt(list.reduce((s, r) => s + Number(r.vat_amount ?? 0), 0))}</strong>
            </span>
          </div>
        )}
        exportName="budget-rent"
        exportRow={(r) => ({ Year: r.year_number, Label: r.year_label ?? '', 'Annual rent': r.rent_thb, VAT: r.vat_amount ?? '', Monthly: monthly(r) })}
        renderCard={(r) => (
          <>
            <CardTitle title={`Year ${r.year_number}`} subtitle={r.year_label ?? undefined} right={<span className="font-semibold tabular">{fmt(r.rent_thb)}</span>} />
            <CardRow label="VAT">{r.vat_amount != null ? fmt(r.vat_amount) : '—'}</CardRow>
            <CardRow label="Monthly">{fmt(monthly(r))}</CardRow>
          </>
        )}
      />
      <RentModal rent={editing} onClose={() => setEditing(null)} />
    </Section>
  )
}

function RentModal({ rent, onClose }: { rent: Partial<BudgetRent> | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { baseCurrency, settings, fmt } = useApp()
  const vatRate = Number(settings.vat_rate ?? 0)
  const defaultVat = (rentValue: string) => {
    const r = Number(rentValue)
    return isFinite(r) && rentValue !== '' ? String(Math.round(r * vatRate) / 100) : ''
  }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ year_number: '', year_label: '', rent: '', vat: '' })
  const [vatTouched, setVatTouched] = useState(false)
  const [key, setKey] = useState<string | null>(null)
  const k = rent ? rent.id ?? 'new' : null
  if (k !== key) {
    setKey(k)
    const rentStr = rent?.rent_thb != null ? String(rent.rent_thb) : ''
    setForm({ year_number: rent?.year_number != null ? String(rent.year_number) : '', year_label: rent?.year_label ?? '', rent: rentStr, vat: rent?.vat_amount != null ? String(rent.vat_amount) : defaultVat(rentStr) })
    setVatTouched(rent?.vat_amount != null)
    setError(null)
    setErrors({})
  }

  const onRent = (v: string) => setForm((f) => ({ ...f, rent: v, vat: vatTouched ? f.vat : defaultVat(v) }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const res = await saveRentAction({ id: rent?.id, year_number: form.year_number, year_label: form.year_label, rent_thb: form.rent, vat_amount: form.vat })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success('Saved')
    onClose()
    router.refresh()
  }

  const rentNum = Number(form.rent)
  return (
    <Modal
      open={!!rent}
      onClose={onClose}
      title={rent?.id ? `Edit rent year ${rent.year_number}` : 'Add rent year'}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" form="rent-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Save'}
          </button>
        </div>
      }
    >
      <form id="rent-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Year number" type="number" inputMode="numeric" min={1} required value={form.year_number} onChange={(e) => setForm({ ...form, year_number: e.target.value })} error={errors.year_number} />
          <TextField label="Label" value={form.year_label} onChange={(e) => setForm({ ...form, year_label: e.target.value })} error={errors.year_label} placeholder="2026–2027" />
          <MoneyField label="Annual rent" required currency={baseCurrency} value={form.rent} onChange={(e) => onRent(e.target.value)} error={errors.rent_thb} />
          <MoneyField
            label="VAT"
            currency={baseCurrency}
            value={form.vat}
            onChange={(e) => {
              setVatTouched(true)
              setForm({ ...form, vat: e.target.value })
            }}
            error={errors.vat_amount}
            hint={`Default rent × ${vatRate}%`}
          />
          <div className="text-sm text-muted sm:col-span-2">Monthly: {isFinite(rentNum) && form.rent !== '' ? fmt(rentNum / 12) : '—'}</div>
        </FormGrid>
      </form>
    </Modal>
  )
}
