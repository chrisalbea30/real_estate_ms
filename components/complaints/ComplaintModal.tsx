'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { TextField, SelectField, TextareaField, FormGrid, FormSection, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { saveComplaintAction } from '@/app/(app)/app/complaints/actions'
import { COMPLAINT_SEVERITIES, COMPLAINT_STATUSES, type Complaint, type ComplaintSeverity, type ComplaintStatus } from '@/lib/types'

const emptyForm = (today: string, filedBy: string) => ({
  date: today,
  guest_name: '',
  room_id: '',
  category: '',
  description: '',
  severity: 'Medium' as ComplaintSeverity,
  status: 'Open' as ComplaintStatus,
  resolution_notes: '',
  resolved_at: '',
  filed_by: filedBy,
})
type Form = ReturnType<typeof emptyForm>

function fromComplaint(c: Partial<Complaint>, today: string, filedBy: string): Form {
  return {
    ...emptyForm(today, filedBy),
    date: c.date ?? today,
    guest_name: c.guest_name ?? '',
    room_id: c.room_id ?? '',
    category: c.category ?? '',
    description: c.description ?? '',
    severity: c.severity ?? 'Medium',
    status: c.status ?? 'Open',
    resolution_notes: c.resolution_notes ?? '',
    resolved_at: c.resolved_at ?? '',
    filed_by: c.filed_by ?? filedBy,
  }
}

const isDone = (s: ComplaintStatus) => s === 'Resolved' || s === 'Closed'

export function ComplaintModal({ complaint, onClose }: { complaint: Partial<Complaint> | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { rooms, categories, today, user } = useApp()
  const [form, setForm] = useState<Form>(() => emptyForm(today, user.name))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [key, setKey] = useState<string | null>(null)

  // Re-initialise when a different complaint is opened.
  const k = complaint ? complaint.id ?? 'new' : null
  if (k !== key) {
    setKey(k)
    if (complaint) {
      const f = fromComplaint(complaint, today, user.name)
      // Legacy rows carry only the room number.
      if (!f.room_id && complaint.room != null) f.room_id = rooms.find((r) => r.number === complaint.room)?.id ?? ''
      setForm(f)
    }
    setError(null)
    setErrors({})
  }

  const activeRooms = rooms.filter((r) => r.active || r.id === form.room_id)
  const categoryOptions = useMemo(() => {
    const list = categories('complaint')
    return form.category && !list.includes(form.category) ? [form.category, ...list] : list
  }, [categories, form.category])

  const set = <K extends keyof Form>(name: K, value: Form[K]) => setForm((f) => ({ ...f, [name]: value }))
  const input = (name: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(name, e.target.value as never)

  // Resolving or closing without a date fills in today (the server does the same).
  const chooseStatus = (s: ComplaintStatus) => setForm((f) => ({ ...f, status: s, resolved_at: isDone(s) && !f.resolved_at ? today : f.resolved_at }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveComplaintAction({ id: complaint?.id, ...form })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(complaint?.id ? 'Complaint updated' : 'Complaint logged')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!complaint}
      onClose={onClose}
      title={complaint?.id ? 'Edit complaint' : 'Log complaint'}
      size="lg"
      persistent
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" form="complaint-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Save complaint'}
          </button>
        </div>
      }
    >
      <form id="complaint-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <FormSection title="Complaint">
            <TextField label="Date" type="date" required value={form.date} onChange={input('date')} error={errors.date} />
            <TextField label="Guest name" required value={form.guest_name} onChange={input('guest_name')} error={errors.guest_name} autoComplete="off" autoFocus />
            <SelectField label="Room" value={form.room_id} onChange={input('room_id')} options={activeRooms.map((r) => ({ value: r.id, label: `${r.name} (No. ${r.number})` }))} placeholder="No room" error={errors.room_id} />
            <SelectField label="Category" value={form.category} onChange={input('category')} options={categoryOptions} placeholder="None" error={errors.category} />
            <TextareaField label="Description" required value={form.description} onChange={input('description')} rows={4} containerClassName="sm:col-span-2" error={errors.description} />
            <SelectField label="Severity" value={form.severity} onChange={input('severity')} options={COMPLAINT_SEVERITIES} error={errors.severity} />
            <SelectField label="Status" value={form.status} onChange={(e) => chooseStatus(e.target.value as ComplaintStatus)} options={COMPLAINT_STATUSES} error={errors.status} />
          </FormSection>

          <FormSection title="Resolution">
            <TextareaField label="Resolution notes" value={form.resolution_notes} onChange={input('resolution_notes')} rows={3} containerClassName="sm:col-span-2" error={errors.resolution_notes} />
            <TextField label="Resolved on" type="date" value={form.resolved_at} onChange={input('resolved_at')} error={errors.resolved_at} hint={isDone(form.status) ? undefined : 'Filled in automatically when the status becomes Resolved or Closed'} />
            <TextField label="Filed by" value={form.filed_by} onChange={input('filed_by')} error={errors.filed_by} autoComplete="off" />
          </FormSection>
        </FormGrid>
      </form>
    </Modal>
  )
}
