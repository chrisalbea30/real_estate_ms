'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { TextField, MoneyField, FormGrid, FormError } from '@/components/ui/Field'
import { Chips } from '@/components/ui/Tabs'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { adjustBalanceAction } from '@/app/(app)/app/accounts/actions'
import type { AccountBalance } from '@/lib/types'

type Direction = 'in' | 'out'

/** Manual correction of an account balance: one ledger row, source 'adjustment'. */
export function AdjustModal({ account, onClose }: { account: AccountBalance | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { fmt, today, baseCurrency } = useApp()
  const [direction, setDirection] = useState<Direction>('in')
  const [form, setForm] = useState({ amount: '', occurred_on: today, description: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [key, setKey] = useState<string | null>(null)

  const k = account?.id ?? null
  if (k !== key) {
    setKey(k)
    setForm({ amount: '', occurred_on: today, description: '' })
    setDirection('in')
    setError(null)
    setErrors({})
  }

  const magnitude = Math.abs(Number(form.amount || 0))
  const signed = direction === 'out' ? -magnitude : magnitude
  const current = Number(account?.balance ?? 0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return
    setBusy(true)
    setError(null)
    const res = await adjustBalanceAction({ account_id: account.id, amount: signed, occurred_on: form.occurred_on, description: form.description })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success('Balance adjusted')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!account}
      onClose={onClose}
      title="Adjust balance"
      subtitle={account ? `${account.name} · currently ${fmt(account.balance)}` : undefined}
      size="sm"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-muted">New balance </span>
            <span className="font-semibold tabular">{fmt(current + signed)}</span>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" form="adjust-form" disabled={busy || !magnitude}>
              {busy ? <Spinner size="sm" /> : 'Post adjustment'}
            </button>
          </div>
        </div>
      }
    >
      <form id="adjust-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <div className="sm:col-span-2">
            <div className="label">Direction</div>
            <Chips
              value={direction}
              onChange={setDirection}
              options={[
                { key: 'in', label: 'Add money (+)' },
                { key: 'out', label: 'Remove money (−)' },
              ]}
            />
          </div>
          <MoneyField label="Amount" required currency={baseCurrency} min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} error={errors.amount} />
          <TextField label="Date" type="date" required value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })} error={errors.occurred_on} />
          <TextField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Bank fee, cash count correction…" containerClassName="sm:col-span-2" autoComplete="off" />
        </FormGrid>
      </form>
    </Modal>
  )
}
