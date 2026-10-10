'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Paperclip, ScanLine, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { TextField, SelectField, TextareaField, MoneyField, CheckboxField, FormGrid, FormSection, FormError } from '@/components/ui/Field'
import { FileUpload } from '@/components/ui/FileUpload'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { createClient } from '@/lib/supabase/client'
import { BUCKET, MAX_UPLOAD_BYTES, buildStoragePath, isAllowedMime } from '@/lib/storage'
import { COMMON_CURRENCIES, rateBetween } from '@/lib/currency'
import { AUDIT_STATUSES, type Expense } from '@/lib/types'
import { saveExpenseAction } from '@/app/(app)/app/expenses/actions'
import { imageToDataUrl, dataUrlToBlob } from '@/components/expenses/receipt'

type AuditStatus = (typeof AUDIT_STATUSES)[number]

/** Response of POST /api/ocr. */
type OcrFields = {
  supplier: string | null
  document_number: string | null
  date: string | null
  amount: number | null
  currency: string | null
  tax_amount: number | null
  description: string | null
  category: string | null
}

const emptyForm = (today: string, currency: string) => ({
  payment_date: today,
  transaction_number: '',
  document_number: '',
  category: '',
  subcategory: '',
  supplier: '',
  amount: '',
  currency,
  payment_method_id: '',
  method: '',
  paid_by: '',
  audit: 'To check' as AuditStatus,
  type: '',
  description: '',
  is_legal: false,
  file_url: null as string | null,
})

type Form = ReturnType<typeof emptyForm>

function fromExpense(e: Partial<Expense>, today: string, currency: string): Form {
  const audit = (AUDIT_STATUSES as readonly string[]).includes(e.audit ?? '') ? (e.audit as AuditStatus) : 'To check'
  return {
    ...emptyForm(today, currency),
    payment_date: e.payment_date ?? today,
    transaction_number: e.transaction_number ?? '',
    document_number: e.document_number ?? '',
    category: e.category ?? '',
    subcategory: e.subcategory ?? '',
    supplier: e.supplier ?? '',
    amount: e.amount == null ? '' : String(e.amount),
    currency: (e.currency ?? currency).toUpperCase(),
    payment_method_id: e.payment_method_id ?? '',
    method: e.method ?? '',
    paid_by: e.paid_by ?? '',
    audit,
    type: e.type ?? '',
    description: e.description ?? '',
    is_legal: e.is_legal ?? false,
    file_url: e.file_url ?? null,
  }
}

type Scan = { file: File; preview: string; attached?: string }

export function ExpenseModal({ expense, onClose }: { expense: Partial<Expense> | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { org, settings, baseCurrency, categories, paymentMethods, partners, members, rates, fmt, today } = useApp()
  const expenseCategories = categories('expense')
  const [form, setForm] = useState<Form>(() => emptyForm(today, baseCurrency))
  // Latest form for the async scan callback (written after render, read in the handler).
  const formRef = useRef(form)
  useEffect(() => {
    formRef.current = form
  }, [form])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [key, setKey] = useState<string | null>(null)
  const [scan, setScan] = useState<Scan | null>(null)
  const [scanning, setScanning] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [lit, setLit] = useState<string[]>([])
  const litTimer = useRef<number | null>(null)
  const scanRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)

  // Re-initialise when a different expense is opened.
  const k = expense ? expense.id ?? 'new' : null
  if (k !== key) {
    setKey(k)
    if (expense) setForm(fromExpense(expense, today, baseCurrency))
    setError(null)
    setErrors({})
    setScan(null)
    setLit([])
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const input = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(k, e.target.value as never)
  const hl = (k: keyof Form) => (lit.includes(k) ? 'ring-2 ring-accent border-accent' : undefined)

  const currencyOptions = useMemo(() => {
    const list = [baseCurrency, ...(settings.display_currencies ?? []), ...COMMON_CURRENCIES, form.currency].map((c) => (c ?? '').toUpperCase()).filter(Boolean)
    return [...new Set(list)]
  }, [baseCurrency, settings.display_currencies, form.currency])

  const categoryOptions = form.category && !expenseCategories.includes(form.category) ? [form.category, ...expenseCategories] : expenseCategories
  const payers = useMemo(() => [...new Set([...partners.map((p) => p.name), ...members.map((m) => m.name), 'Other'].filter(Boolean))], [partners, members])

  const foreign = form.currency !== baseCurrency
  const rate = foreign ? rateBetween(form.currency, baseCurrency, rates) : 1
  const amountNum = Number(form.amount || 0)
  const amountHint = foreign ? (rate == null ? `No ${form.currency} → ${baseCurrency} rate yet; saved without a base value` : amountNum ? `≈ ${fmt(Math.abs(amountNum) * rate)}` : `Converted at the stored ${form.currency} rate`) : undefined

  const runScan = async (file: File) => {
    setScanning(true)
    try {
      const image = await imageToDataUrl(file)
      setScan({ file, preview: image })
      const res = await fetch('/api/ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image }) })
      const json = (await res.json().catch(() => ({}))) as Partial<OcrFields> & { error?: string }
      if (!res.ok) throw new Error(json.error || `Receipt scanning failed (${res.status})`)

      const cur = formRef.current
      const next: Form = { ...cur }
      const filled: string[] = []
      const put = (k: keyof Form, value: string | number | null | undefined, allowed = cur[k] === '') => {
        if (value == null || value === '' || !allowed) return
        const s = String(value)
        if (cur[k] === s) return
        ;(next as Record<string, unknown>)[k] = s
        filled.push(k)
      }
      const isNew = !expense?.id
      put('supplier', json.supplier)
      put('document_number', json.document_number)
      put('payment_date', json.date && /^\d{4}-\d{2}-\d{2}$/.test(json.date) ? json.date : null, isNew || cur.payment_date === '')
      put('amount', json.amount != null && isFinite(json.amount) ? Math.abs(json.amount) : null)
      put('currency', json.currency && /^[A-Z]{3}$/.test(json.currency) ? json.currency : null, isNew && cur.amount === '')
      put('description', json.description)
      put('category', json.category && expenseCategories.includes(json.category) ? json.category : null)

      setForm(next)
      setLit(filled)
      if (litTimer.current) window.clearTimeout(litTimer.current)
      litTimer.current = window.setTimeout(() => setLit([]), 5000)
      toast.success(filled.length ? `Filled ${filled.length} field${filled.length === 1 ? '' : 's'} from the receipt` : 'Receipt read; nothing new to fill in')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Receipt scanning failed')
    } finally {
      setScanning(false)
      if (scanRef.current) scanRef.current.value = ''
      if (camRef.current) camRef.current.value = ''
    }
  }

  /** Uploads the scanned image the same way FileUpload does and stores the path in file_url. */
  const attachScan = async () => {
    if (!scan) return
    setAttaching(true)
    try {
      let blob: Blob = scan.file
      let name = scan.file.name || 'receipt.jpg'
      if (blob.size > MAX_UPLOAD_BYTES || (blob.type && !isAllowedMime(blob.type))) {
        blob = dataUrlToBlob(scan.preview)
        name = 'receipt.jpg'
      }
      const path = buildStoragePath(org.id, 'expenses', name)
      const supabase = createClient()
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false })
      if (upErr) throw upErr
      set('file_url', path)
      setScan({ ...scan, attached: path })
      toast.success('Receipt attached')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setAttaching(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveExpenseAction({ id: expense?.id, ...form })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(expense?.id ? 'Expense updated' : `Expense added as ${res.data.expense.transaction_number ?? 'new'}`)
    if (res.data.warning) toast.info(res.data.warning)
    onClose()
    router.refresh()
  }

  const scanAttached = !!scan?.attached && form.file_url === scan.attached

  return (
    <Modal
      open={!!expense}
      onClose={onClose}
      title={expense?.id ? 'Edit expense' : 'New expense'}
      subtitle={form.transaction_number || (expense?.id ? undefined : 'Transaction and document numbers are assigned on save')}
      size="lg"
      persistent
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-muted">Amount </span>
            <span className="font-semibold tabular">{foreign ? `${form.currency} ${form.amount || '0'}` : fmt(Math.abs(amountNum))}</span>
            {foreign && rate != null && amountNum ? <span className="text-muted"> ≈ {fmt(Math.abs(amountNum) * rate)}</span> : null}
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" form="expense-form" disabled={busy}>
              {busy ? <Spinner size="sm" /> : 'Save expense'}
            </button>
          </div>
        </div>
      }
    >
      <form id="expense-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />

          <div className="rounded-xl border border-dashed border-line bg-surface-2 p-3 sm:col-span-2">
            <input ref={scanRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && runScan(e.target.files[0])} />
            <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && runScan(e.target.files[0])} />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-secondary btn-sm" disabled={scanning} onClick={() => scanRef.current?.click()}>
                {scanning ? <Spinner size="sm" /> : <ScanLine className="h-4 w-4" />} Scan receipt
              </button>
              <button type="button" className="btn-secondary btn-sm sm:hidden" disabled={scanning} onClick={() => camRef.current?.click()}>
                <Camera className="h-4 w-4" /> Camera
              </button>
              <span className="text-xs text-muted">Reads supplier, date, amount and number into the empty fields.</span>
            </div>
            {scan && (
              <div className="mt-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={scan.preview} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1 truncate text-sm">{scan.file.name || 'Receipt'}</div>
                {scanAttached ? (
                  <Badge tone="success">Attached</Badge>
                ) : (
                  <button type="button" className="btn-soft btn-sm" disabled={attaching} onClick={attachScan}>
                    {attaching ? <Spinner size="sm" /> : <Paperclip className="h-4 w-4" />} Attach this image
                  </button>
                )}
                <button type="button" className="icon-btn !h-8 !w-8" onClick={() => setScan(null)} title="Discard scan">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <FormSection title="Document">
            <TextField label="Payment date" type="date" required value={form.payment_date} onChange={input('payment_date')} error={errors.payment_date} className={hl('payment_date')} />
            <TextField label="Transaction #" value={form.transaction_number} onChange={input('transaction_number')} placeholder="Expense 001" hint={expense?.id ? undefined : 'Leave blank to number automatically'} autoComplete="off" />
            <TextField label="Document #" value={form.document_number} onChange={input('document_number')} placeholder="001" hint={expense?.id ? undefined : 'Leave blank to number automatically'} autoComplete="off" className={hl('document_number')} />
            <SelectField label="Category" value={form.category} onChange={input('category')} options={categoryOptions} placeholder="Choose a category" error={errors.category} className={hl('category')} />
            <TextField label="Subcategory" value={form.subcategory} onChange={input('subcategory')} autoComplete="off" />
            <TextField label="Type" value={form.type} onChange={input('type')} placeholder="OPEX, CAPEX, …" autoComplete="off" />
          </FormSection>

          <FormSection title="Amount & payment">
            <TextField label="Supplier" value={form.supplier} onChange={input('supplier')} error={errors.supplier} autoComplete="off" className={hl('supplier')} />
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
              <MoneyField label="Amount" required currency={form.currency} value={form.amount} onChange={input('amount')} error={errors.amount} hint={amountHint} className={hl('amount')} />
              <SelectField label="Currency" value={form.currency} onChange={input('currency')} options={currencyOptions} error={errors.currency} className={hl('currency')} />
            </div>
            <SelectField
              label="Payment method"
              value={form.payment_method_id}
              onChange={input('payment_method_id')}
              options={paymentMethods.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Not set"
              hint={!form.payment_method_id && form.method ? `Recorded as "${form.method}"` : 'Posts the amount to the linked account'}
            />
            <TextField label="Paid by" value={form.paid_by} onChange={input('paid_by')} list="expense-payers" placeholder="Partner, team member or other" autoComplete="off" />
            <datalist id="expense-payers">
              {payers.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <SelectField label="Audit" value={form.audit} onChange={(e) => set('audit', e.target.value as AuditStatus)} options={[...AUDIT_STATUSES]} />
          </FormSection>

          <FormSection title="Description & legal">
            <TextareaField label="Description" value={form.description} onChange={input('description')} rows={3} containerClassName="sm:col-span-2" className={hl('description')} />
            <CheckboxField className="sm:col-span-2" label="Share with legal" description="Appears on the Legal & accounting page for review by the lawyer or accountant." checked={form.is_legal} onChange={(v) => set('is_legal', v)} />
          </FormSection>

          <FormSection title="Attachment">
            <FileUpload module="expenses" value={form.file_url} onChange={(p) => set('file_url', p)} label="Receipt or invoice" capture className="sm:col-span-2" />
          </FormSection>
        </FormGrid>
      </form>
    </Modal>
  )
}
