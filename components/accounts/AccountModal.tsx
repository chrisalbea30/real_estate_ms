'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { TextField, SelectField, TextareaField, MoneyField, CheckboxField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { COMMON_CURRENCIES } from '@/lib/currency'
import { ACCOUNT_TYPES, type AccountType } from '@/lib/schemas/accounts'
import { saveAccountAction } from '@/app/(app)/app/accounts/actions'
import type { Account } from '@/lib/types'

const TYPE_LABEL: Record<AccountType, string> = { bank: 'Bank account', cash: 'Cash', wallet: 'E-wallet', other: 'Other' }

const emptyForm = (currency: string) => ({
  name: '',
  type: 'bank' as AccountType,
  currency,
  opening_balance: '',
  notes: '',
  active: true,
})

type Form = ReturnType<typeof emptyForm>

function fromAccount(a: Partial<Account>, currency: string): Form {
  const type = (ACCOUNT_TYPES as readonly string[]).includes(a.type ?? '') ? (a.type as AccountType) : 'bank'
  return {
    name: a.name ?? '',
    type,
    currency: (a.currency ?? currency).toUpperCase(),
    opening_balance: a.opening_balance == null ? '' : String(a.opening_balance),
    notes: a.notes ?? '',
    active: a.active ?? true,
  }
}

export function AccountModal({ account, onClose }: { account: Partial<Account> | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { baseCurrency, settings } = useApp()
  const [form, setForm] = useState<Form>(() => emptyForm(baseCurrency))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [key, setKey] = useState<string | null>(null)

  const k = account ? account.id ?? 'new' : null
  if (k !== key) {
    setKey(k)
    if (account) setForm(fromAccount(account, baseCurrency))
    setError(null)
    setErrors({})
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const input = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(k, e.target.value as never)

  const currencyOptions = useMemo(
    () => [...new Set([baseCurrency, ...(settings.display_currencies ?? []), ...COMMON_CURRENCIES, form.currency].map((c) => (c ?? '').toUpperCase()).filter(Boolean))],
    [baseCurrency, settings.display_currencies, form.currency],
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveAccountAction({ id: account?.id, ...form })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(account?.id ? 'Account updated' : 'Account added')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!account}
      onClose={onClose}
      title={account?.id ? 'Edit account' : 'New account'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" form="account-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Save account'}
          </button>
        </div>
      }
    >
      <form id="account-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Name" required value={form.name} onChange={input('name')} error={errors.name} placeholder="Kasikorn current account" autoComplete="off" />
          <SelectField label="Type" value={form.type} onChange={(e) => set('type', e.target.value as AccountType)} options={ACCOUNT_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} error={errors.type} />
          <SelectField label="Currency" value={form.currency} onChange={input('currency')} options={currencyOptions} error={errors.currency} hint={form.currency !== baseCurrency ? `Movements are still posted in ${baseCurrency}` : undefined} />
          <MoneyField
            label="Opening balance"
            currency={form.currency || baseCurrency}
            value={form.opening_balance}
            onChange={input('opening_balance')}
            error={errors.opening_balance}
            hint={account?.id ? 'Changing this shifts the balance. Prefer "Adjust balance" for corrections.' : 'Balance before any recorded movement'}
          />
          <TextareaField label="Notes" value={form.notes} onChange={input('notes')} rows={2} containerClassName="sm:col-span-2" />
          <CheckboxField className="sm:col-span-2" label="Active" description="Inactive accounts are hidden from the cards and left out of cash on hand." checked={form.active} onChange={(v) => set('active', v)} />
        </FormGrid>
      </form>
    </Modal>
  )
}
