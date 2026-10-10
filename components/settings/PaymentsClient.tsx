'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CreditCard, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { TextField, SelectField, CheckboxField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { Note } from '@/components/settings/SettingsCard'
import { titleCase } from '@/lib/format'
import { deletePaymentMethodAction, savePaymentMethodAction } from '@/app/(app)/app/settings/actions'
import type { Account, PaymentMethod } from '@/lib/types'

type AccountLite = Pick<Account, 'id' | 'name' | 'type' | 'currency' | 'active'>

export function PaymentsClient({ methods, accounts }: { methods: PaymentMethod[]; accounts: AccountLite[] }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can } = useApp()
  const editable = can('settings', 'edit')
  const [editing, setEditing] = useState<Partial<PaymentMethod> | null>(null)

  const accountName = (id: string | null) => (id ? (accounts.find((a) => a.id === id)?.name ?? 'Account') : null)

  const remove = async (m: PaymentMethod) => {
    const ok = await confirm({
      title: `Delete “${m.name}”?`,
      message: 'Bookings and expenses recorded with this method keep their text label but lose the link to it. Prefer deactivating if it was used.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    const res = await deletePaymentMethodAction(m.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Payment method deleted')
    router.refresh()
  }

  const columns: Column<PaymentMethod>[] = [
    { key: 'sort', header: '#', cell: (m) => <span className="text-muted">{m.sort}</span>, sortValue: (m) => m.sort, width: '3rem', align: 'right' },
    { key: 'name', header: 'Name', cell: (m) => <span className="font-medium">{m.name}</span>, sortValue: (m) => m.name },
    {
      key: 'account',
      header: 'Account',
      cell: (m) => (accountName(m.account_id) ? <span>{accountName(m.account_id)}</span> : <span className="text-muted">No account</span>),
      sortValue: (m) => accountName(m.account_id) ?? '',
    },
    { key: 'active', header: 'Status', cell: (m) => (m.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>), sortValue: (m) => (m.active ? 1 : 0), width: '7rem' },
  ]

  return (
    <div>
      <PageHeader
        title="Payment methods"
        subtitle="How guests pay you and how you pay suppliers."
        actions={
          editable && (
            <button className="btn-primary" onClick={() => setEditing({ name: '', account_id: null, active: true, sort: (methods.reduce((mx, m) => Math.max(mx, m.sort), 0) || 0) + 1 })}>
              <Plus className="h-4 w-4" /> Add method
            </button>
          )
        }
      />

      <Note className="mb-5">
        Each method can point at one of your accounts. A guest payment recorded with the method <strong>adds</strong> money to that account, and an expense paid with it <strong>takes</strong> money out, so the balances in{' '}
        <Link href="/app/accounts" className="font-medium underline">
          Accounts
        </Link>{' '}
        follow automatically. Methods without an account only label the record.
      </Note>
      {accounts.length === 0 && <Note tone="warning" className="mb-5">No accounts are visible. Create them in Accounts (or ask for the Accounts permission) to link methods to balances.</Note>}

      {methods.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payment methods" description="Add Cash, Bank transfer, Card and any platform payouts you receive." />
      ) : (
        <DataTable
          rows={methods}
          columns={columns}
          rowKey={(m) => m.id}
          defaultSort={{ key: 'sort', dir: 'asc' }}
          pageSize={0}
          actions={(m) =>
            editable && (
              <>
                <button className="icon-btn !h-8 !w-8" title="Edit" onClick={() => setEditing(m)}>
                  <Pencil className="h-4 w-4" />
                </button>
                {can('settings', 'delete') && (
                  <button className="icon-btn !h-8 !w-8 text-danger" title="Delete" onClick={() => remove(m)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </>
            )
          }
          renderCard={(m) => (
            <>
              <CardTitle title={m.name} subtitle={`Order ${m.sort}`} right={m.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>} />
              <CardRow label="Account">
                <span className="inline-flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5 text-muted" /> {accountName(m.account_id) ?? 'No account'}
                </span>
              </CardRow>
            </>
          )}
        />
      )}

      <PaymentMethodModal method={editing} accounts={accounts} onClose={() => setEditing(null)} />
    </div>
  )
}

function PaymentMethodModal({ method, accounts, onClose }: { method: Partial<PaymentMethod> | null; accounts: AccountLite[]; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ name: '', account_id: '', active: true, sort: '0' })
  const [key, setKey] = useState<string | null>(null)

  const mKey = method ? `${method.id ?? 'new'}-${method.sort ?? ''}` : null
  if (mKey !== key) {
    setKey(mKey)
    setForm({ name: method?.name ?? '', account_id: method?.account_id ?? '', active: method?.active ?? true, sort: String(method?.sort ?? 0) })
    setError(null)
    setErrors({})
  }

  const accountOptions = accounts.map((a) => ({ value: a.id, label: `${a.name}${a.currency ? ` (${a.currency})` : ''} · ${titleCase(a.type)}${a.active ? '' : ' · inactive'}` }))
  // Keep a linked account selectable even when it is no longer visible.
  if (form.account_id && !accounts.some((a) => a.id === form.account_id)) accountOptions.push({ value: form.account_id, label: 'Linked account' })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const res = await savePaymentMethodAction({ id: method?.id, name: form.name, account_id: form.account_id, active: form.active, sort: form.sort })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(method?.id ? 'Payment method updated' : 'Payment method added')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!method}
      onClose={onClose}
      title={method?.id ? 'Edit payment method' : 'Add payment method'}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="btn-primary" form="payment-method-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Save'}
          </button>
        </div>
      }
    >
      <form id="payment-method-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="Bank transfer" containerClassName="sm:col-span-2" autoFocus />
          <SelectField label="Account" value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} options={accountOptions} placeholder="No account" error={errors.account_id} hint="Receives guest payments and pays expenses recorded with this method." containerClassName="sm:col-span-2" />
          <TextField label="Order" type="number" inputMode="numeric" min={0} max={999} value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} error={errors.sort} hint="Lower comes first in forms." />
          <CheckboxField className="sm:col-span-2" label="Active" description="Inactive methods are hidden from forms but kept on old records." checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
        </FormGrid>
      </form>
    </Modal>
  )
}
