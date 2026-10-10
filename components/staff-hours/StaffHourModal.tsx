'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { TextField, SelectField, TextareaField, MoneyField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { formatMoney } from '@/lib/format'
import { saveStaffHourAction } from '@/app/(app)/app/staff-hours/actions'
import type { StaffHour } from '@/lib/types'

const emptyForm = (today: string) => ({
  staff_name: '',
  date: today,
  hours: '',
  role: '',
  department: '',
  hourly_rate_thb: '',
  notes: '',
})
type Form = ReturnType<typeof emptyForm>

function fromEntry(e: Partial<StaffHour>, today: string): Form {
  return {
    ...emptyForm(today),
    staff_name: e.staff_name ?? '',
    date: e.date ?? today,
    hours: e.hours == null ? '' : String(e.hours),
    role: e.role ?? '',
    department: e.department ?? '',
    hourly_rate_thb: e.hourly_rate_thb == null ? '' : String(e.hourly_rate_thb),
    notes: e.notes ?? '',
  }
}

/** Most recent entry of a staff member (by date, then creation), used for defaults. */
function lastEntryFor(rows: StaffHour[], name: string): StaffHour | undefined {
  const n = name.trim().toLowerCase()
  if (!n) return undefined
  return rows.filter((r) => r.staff_name.trim().toLowerCase() === n).sort((a, b) => (a.date === b.date ? (a.created_at < b.created_at ? 1 : -1) : a.date < b.date ? 1 : -1))[0]
}

export function StaffHourModal({ entry, rows, onClose }: { entry: Partial<StaffHour> | null; rows: StaffHour[]; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { categories, today, baseCurrency } = useApp()
  const [form, setForm] = useState<Form>(() => emptyForm(today))
  const [rateTouched, setRateTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [key, setKey] = useState<string | null>(null)

  // Re-initialise when a different entry is opened.
  const k = entry ? entry.id ?? `new-${entry.staff_name ?? ''}` : null
  if (k !== key) {
    setKey(k)
    if (entry) {
      const f = fromEntry(entry, today)
      if (!entry.id && f.staff_name) {
        const last = lastEntryFor(rows, f.staff_name)
        if (last?.hourly_rate_thb != null) f.hourly_rate_thb = String(last.hourly_rate_thb)
        if (last?.role) f.role = last.role
        if (last?.department) f.department = last.department
      }
      setForm(f)
      setRateTouched(!!entry.id)
    }
    setError(null)
    setErrors({})
  }

  const staffNames = useMemo(() => [...new Set(rows.map((r) => r.staff_name))].sort((a, b) => a.localeCompare(b)), [rows])
  const departments = useMemo(() => {
    const list = categories('staff_department')
    return form.department && !list.includes(form.department) ? [form.department, ...list] : list
  }, [categories, form.department])

  const set = <K extends keyof Form>(name: K, value: Form[K]) => setForm((f) => ({ ...f, [name]: value }))
  const input = (name: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(name, e.target.value as never)

  // New entry: default the rate (and blank role/department) to the staff member's last entry.
  const chooseStaff = (name: string) => {
    setForm((f) => {
      const next = { ...f, staff_name: name }
      if (entry?.id) return next
      const last = lastEntryFor(rows, name)
      if (!last) return next
      if (!rateTouched && last.hourly_rate_thb != null) next.hourly_rate_thb = String(last.hourly_rate_thb)
      if (!next.role && last.role) next.role = last.role
      if (!next.department && last.department) next.department = last.department
      return next
    })
  }

  const pay = Number(form.hours || 0) * Number(form.hourly_rate_thb || 0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveStaffHourAction({ id: entry?.id, ...form })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(entry?.id ? 'Entry updated' : 'Hours added')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!entry}
      onClose={onClose}
      title={entry?.id ? 'Edit hours' : 'Add hours'}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-muted">Pay </span>
            <span className="font-semibold text-ink tabular">{formatMoney(pay, baseCurrency)}</span>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" form="staff-hour-form" disabled={busy}>
              {busy ? <Spinner size="sm" /> : 'Save'}
            </button>
          </div>
        </div>
      }
    >
      <form id="staff-hour-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Staff member" required value={form.staff_name} onChange={(e) => chooseStaff(e.target.value)} error={errors.staff_name} list="staff-names" placeholder="Name" autoComplete="off" autoFocus />
          <datalist id="staff-names">
            {staffNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <TextField label="Date" type="date" required value={form.date} onChange={input('date')} error={errors.date} />
          <TextField label="Hours" type="number" inputMode="decimal" required min={0} max={24} step={0.5} value={form.hours} onChange={input('hours')} error={errors.hours} placeholder="8" />
          <MoneyField
            label="Hourly rate"
            currency={baseCurrency}
            value={form.hourly_rate_thb}
            onChange={(e) => {
              setRateTouched(true)
              set('hourly_rate_thb', e.target.value)
            }}
            error={errors.hourly_rate_thb}
            hint={!entry?.id && !rateTouched && form.hourly_rate_thb ? 'Last rate used for this person' : undefined}
          />
          <TextField label="Role" value={form.role} onChange={input('role')} error={errors.role} placeholder="Housekeeper" />
          <SelectField label="Department" value={form.department} onChange={input('department')} options={departments} placeholder="None" error={errors.department} />
          <TextareaField label="Notes" value={form.notes} onChange={input('notes')} rows={3} containerClassName="sm:col-span-2" error={errors.notes} />
        </FormGrid>
      </form>
    </Modal>
  )
}
