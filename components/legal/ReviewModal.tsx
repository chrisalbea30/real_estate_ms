'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { TextField, SelectField, TextareaField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { formatDate } from '@/lib/format'
import { reviewExpenseAction } from '@/app/(app)/app/legal/actions'
import { ExpenseAmount } from '@/components/expenses/helpers'
import { LEGAL_STATUSES, type Expense, type LegalStatus } from '@/lib/types'

export type ReviewTarget = { expense: Expense; decision: LegalStatus }

/** Decision + notes + review date. Only the three legal_* columns are written. */
export function ReviewModal({ target, onClose }: { target: ReviewTarget | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { today } = useApp()
  const [form, setForm] = useState({ legal_status: 'Pending' as LegalStatus, legal_notes: '', legal_reviewed_at: today })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [key, setKey] = useState<string | null>(null)

  const k = target ? `${target.expense.id}-${target.decision}` : null
  if (k !== key) {
    setKey(k)
    if (target) setForm({ legal_status: target.decision, legal_notes: target.expense.legal_notes ?? '', legal_reviewed_at: today })
    setError(null)
    setErrors({})
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!target) return
    setBusy(true)
    setError(null)
    const res = await reviewExpenseAction({ id: target.expense.id, ...form })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(`Marked as ${form.legal_status}`)
    onClose()
    router.refresh()
  }

  const e = target?.expense

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="Review expense"
      subtitle={e ? `${e.supplier ?? e.description ?? e.transaction_number ?? 'Expense'} · ${formatDate(e.payment_date)}` : undefined}
      size="sm"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">{e && <ExpenseAmount expense={e} className="font-semibold" />}</div>
          <div className="flex gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" form="review-form" disabled={busy}>
              {busy ? <Spinner size="sm" /> : 'Save review'}
            </button>
          </div>
        </div>
      }
    >
      <form id="review-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <SelectField label="Decision" required value={form.legal_status} onChange={(ev) => setForm({ ...form, legal_status: ev.target.value as LegalStatus })} options={LEGAL_STATUSES} error={errors.legal_status} />
          <TextField label="Review date" type="date" required value={form.legal_reviewed_at} onChange={(ev) => setForm({ ...form, legal_reviewed_at: ev.target.value })} error={errors.legal_reviewed_at} />
          <TextareaField label="Notes / reason" value={form.legal_notes} onChange={(ev) => setForm({ ...form, legal_notes: ev.target.value })} rows={4} placeholder={form.legal_status === 'Clarification Needed' ? 'What is missing or unclear?' : undefined} containerClassName="sm:col-span-2" error={errors.legal_notes} />
        </FormGrid>
      </form>
    </Modal>
  )
}
