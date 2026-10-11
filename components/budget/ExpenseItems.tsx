'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Receipt, Copy } from 'lucide-react'
import { Section } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ExportMenu } from '@/components/ui/ExportMenu'
import { MoneyField, TextField, SelectField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { cn, MONTHS, MONTHS_LONG } from '@/lib/format'
import { saveBudgetExpenseAction, deleteBudgetExpenseAction, copyBudgetExpenseToAllMonthsAction, addBudgetExpenseItemAction } from '@/app/(app)/app/budget/actions'
import { buildExpenseData, type ExpenseType, type ExpenseItemRow, type ExpenseTypeGroup } from '@/components/budget/calc'
import { MatrixTable, MonthHeadRow, MatrixCell, TotalsRow, TD, TD_LABEL, STICKY } from '@/components/budget/Matrix'
import type { BudgetExpense } from '@/lib/types'

interface CellTarget {
  type: ExpenseType
  category: string
  item: string
  subcategory: string | null
  month: number
  entries: BudgetExpense[]
}

const TYPE_LABEL: Record<ExpenseType, string> = { OPEX: 'OPEX · operating', CAPEX: 'CAPEX · capital' }

export function ExpenseItems({ year, rows }: { year: number; rows: BudgetExpense[] }) {
  const { can, fmt, categories } = useApp()
  const cats = categories('expense')
  const data = useMemo(() => buildExpenseData(rows, cats), [rows, cats])
  const [target, setTarget] = useState<CellTarget | null>(null)
  const [adding, setAdding] = useState<ExpenseType | null>(null)
  const editable = can('budget', 'edit') || can('budget', 'add')

  const exportRows = useMemo(() => {
    const out: Record<string, string | number>[] = []
    for (const type of ['OPEX', 'CAPEX'] as const) {
      for (const c of data.groups[type].categories) {
        for (const it of c.items) {
          const row: Record<string, string | number> = { Type: type, Category: c.category, Item: it.item }
          MONTHS.forEach((m, i) => (row[m] = it.months[i] ?? 0))
          row.Total = it.total
          out.push(row)
        }
      }
    }
    return out
  }, [data])

  const openCell = (it: ExpenseItemRow, month: number) => {
    setTarget({ type: it.type, category: it.category, item: it.item, subcategory: it.subcategory, month, entries: it.entries[month - 1] ?? [] })
  }

  const renderGroup = (g: ExpenseTypeGroup) => (
    <tbody key={g.type}>
      <tr>
        <td className={cn(TD_LABEL, 'sticky left-0 z-10 bg-primary-tint font-display text-xs font-semibold uppercase tracking-wide text-primary-soft-fg')}>{TYPE_LABEL[g.type]}</td>
        <td className={cn(TD, 'bg-primary-tint')} colSpan={13}>
          <div className="flex h-9 items-center justify-end gap-2 px-2 text-xs text-muted">
            {can('budget', 'add') && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => setAdding(g.type)}>
                <Plus className="h-3.5 w-3.5" /> Add {g.type} item
              </button>
            )}
          </div>
        </td>
      </tr>
      {g.categories.length === 0 && (
        <tr>
          <td className={cn(TD_LABEL, STICKY, 'text-sm text-muted')} colSpan={1}>
            No {g.type} items yet
          </td>
          <td className={TD} colSpan={13} />
        </tr>
      )}
      {g.categories.map((c) => (
        <CategoryRows key={`${g.type}|${c.category}`} category={c.category} items={c.items} months={c.months} total={c.total} editable={editable} onCell={openCell} fmt={fmt} />
      ))}
      <TotalsRow label={`Total ${g.type}`} months={g.months} total={g.total} soft format={fmt} />
    </tbody>
  )

  return (
    <Section
      title="Expense items"
      description={`Planned OPEX and CAPEX per item and month for ${year}. Categories follow the expense category list so actuals can be matched.`}
      actions={
        <div className="flex items-center gap-2">
          {rows.length > 0 && <ExportMenu rows={exportRows} filename={`budget-expenses-${year}`} title={`Budget expenses ${year}`} />}
          {can('budget', 'add') && (
            <button className="btn-primary btn-sm" onClick={() => setAdding('OPEX')}>
              <Plus className="h-4 w-4" /> Add item
            </button>
          )}
        </div>
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expense items"
          description="Add an item (rent, salaries, utilities…) and fill in its monthly amounts."
          action={
            can('budget', 'add') && (
              <button className="btn-primary btn-sm" onClick={() => setAdding('OPEX')}>
                <Plus className="h-4 w-4" /> Add item
              </button>
            )
          }
        />
      ) : (
        <MatrixTable>
          <MonthHeadRow first="Item" firstWidth="min-w-[13rem]" />
          {renderGroup(data.groups.OPEX)}
          {renderGroup(data.groups.CAPEX)}
          <tfoot>
            <TotalsRow label="Total expenses" months={data.monthly} total={data.total} format={fmt} />
          </tfoot>
        </MatrixTable>
      )}
      {data.invalid.length > 0 && <p className="mt-2 text-xs text-muted">{data.invalid.length} row(s) with an invalid month are not shown.</p>}
      <ExpenseCellModal year={year} target={target} onClose={() => setTarget(null)} />
      <AddItemModal year={year} type={adding} categoryOptions={cats} onClose={() => setAdding(null)} />
    </Section>
  )
}

function CategoryRows({ category, items, months, total, editable, onCell, fmt }: { category: string; items: ExpenseItemRow[]; months: number[]; total: number; editable: boolean; onCell: (it: ExpenseItemRow, month: number) => void; fmt: (v: number | null | undefined) => string }) {
  return (
    <>
      <tr className="font-semibold">
        <td className={cn(TD_LABEL, 'sticky left-0 z-10 bg-surface-2')}>{category}</td>
        {months.map((v, i) => (
          <td key={i} className={cn(TD, 'bg-surface-2 px-3 py-2 text-ink-2')}>
            {v ? fmt(v) : '—'}
          </td>
        ))}
        <td className={cn(TD, 'bg-surface-2 px-3 py-2')}>{fmt(total)}</td>
      </tr>
      {items.map((it) => (
        <tr key={it.item}>
          <td className={cn(TD_LABEL, STICKY, 'pl-6')}>
            <div className="truncate" title={it.item}>
              {it.item}
            </div>
            {it.subcategory && <div className="truncate text-xs text-muted">{it.subcategory}</div>}
          </td>
          {MONTHS.map((_, i) => {
            const entries = it.entries[i] ?? []
            const filled = entries.length > 0
            return (
              <td key={i} className={TD}>
                <MatrixCell
                  value={filled ? fmt(it.months[i]) : '—'}
                  filled={filled}
                  onClick={editable ? () => onCell(it, i + 1) : undefined}
                  title={entries.length > 1 ? `${entries.length} entries` : undefined}
                  className={entries.length > 1 ? 'underline decoration-dotted underline-offset-4' : undefined}
                />
              </td>
            )
          })}
          <td className={cn(TD, 'px-3 font-semibold')}>{fmt(it.total)}</td>
        </tr>
      ))}
    </>
  )
}

function ExpenseCellModal({ year, target, onClose }: { year: number; target: CellTarget | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can, fmt, baseCurrency } = useApp()
  const [busy, setBusy] = useState<'save' | 'copy' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ amount: '', subcategory: '' })
  const [key, setKey] = useState<string | null>(null)
  const k = target ? `${target.type}|${target.category}|${target.item}|${target.month}|${target.entries.map((e) => e.id).join(',')}` : null
  if (k !== key) {
    setKey(k)
    const first = target?.entries[0]
    setForm({ amount: first?.amount_thb != null ? String(first.amount_thb) : '', subcategory: first?.subcategory ?? target?.subcategory ?? '' })
    setError(null)
    setErrors({})
  }
  const first = target?.entries[0]
  const multiple = (target?.entries.length ?? 0) > 1
  const canSave = first ? can('budget', 'edit') : can('budget', 'add')

  const finish = (msg: string) => {
    toast.success(msg)
    onClose()
    router.refresh()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!target) return
    setBusy('save')
    const res = await saveBudgetExpenseAction({
      id: first?.id,
      year,
      month: target.month,
      category: target.category,
      subcategory: form.subcategory,
      item_name: target.item,
      amount_thb: form.amount,
      expense_type: target.type,
    })
    setBusy(null)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    finish('Saved')
  }

  const copyAll = async () => {
    if (!target) return
    const ok = await confirm({
      title: 'Copy to all months?',
      message: `Sets ${target.item} to ${fmt(Number(form.amount || 0))} in every month of ${year}. Existing amounts are overwritten.`,
      confirmLabel: 'Copy',
    })
    if (!ok) return
    setBusy('copy')
    const res = await copyBudgetExpenseToAllMonthsAction({ year, category: target.category, subcategory: form.subcategory, item_name: target.item, amount_thb: form.amount, expense_type: target.type })
    setBusy(null)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    finish('Copied to all months')
  }

  const remove = async () => {
    if (!first || !target) return
    const ok = await confirm({
      title: `Delete ${target.item} · ${MONTHS[target.month - 1]}?`,
      message: multiple ? 'Only the first entry of this cell is deleted; open the cell again for the next one.' : undefined,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    setBusy('delete')
    const res = await deleteBudgetExpenseAction(first.id)
    setBusy(null)
    if (!res.ok) return toast.error(res.error)
    finish('Deleted')
  }

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={target ? `${target.item} · ${MONTHS_LONG[target.month - 1]} ${year}` : ''}
      subtitle={target ? `${target.type} · ${target.category}` : undefined}
      size="sm"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {first && can('budget', 'delete') && (
              <button className="btn-ghost text-danger" type="button" onClick={remove} disabled={busy !== null}>
                {busy === 'delete' ? <Spinner size="sm" /> : 'Delete'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            {canSave && (
              <button className="btn-primary" form="exp-cell-form" disabled={busy !== null}>
                {busy === 'save' ? <Spinner size="sm" /> : 'Save'}
              </button>
            )}
          </div>
        </div>
      }
    >
      <form id="exp-cell-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          {multiple && target && (
            <div className="rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-xs text-warning sm:col-span-2">
              This cell has {target.entries.length} entries. Saving edits the first one ({fmt(first?.amount_thb)}).
            </div>
          )}
          <MoneyField label="Amount" currency={baseCurrency} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} error={errors.amount_thb} autoFocus containerClassName="sm:col-span-2" />
          <TextField label="Subcategory" value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} error={errors.subcategory} placeholder="Optional" containerClassName="sm:col-span-2" />
          {can('budget', 'edit') && can('budget', 'add') && (
            <div className="sm:col-span-2">
              <button type="button" className="btn-secondary btn-sm" onClick={copyAll} disabled={busy !== null}>
                {busy === 'copy' ? <Spinner size="sm" /> : <Copy className="h-4 w-4" />} Copy this amount to all 12 months
              </button>
            </div>
          )}
        </FormGrid>
      </form>
    </Modal>
  )
}

function AddItemModal({ year, type, categoryOptions, onClose }: { year: number; type: ExpenseType | null; categoryOptions: string[]; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { baseCurrency } = useApp()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ item_name: '', category: '', expense_type: 'OPEX' as ExpenseType, amount: '', months: 'all' })
  const [key, setKey] = useState<string | null>(null)
  const k = type ?? null
  if (k !== key) {
    setKey(k)
    setForm({ item_name: '', category: categoryOptions[0] ?? '', expense_type: type ?? 'OPEX', amount: '', months: 'all' })
    setError(null)
    setErrors({})
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const res = await addBudgetExpenseItemAction({ year, category: form.category, item_name: form.item_name, expense_type: form.expense_type, amount_thb: form.amount, months: form.months === 'all' ? 'all' : Number(form.months) })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success('Item added')
    onClose()
    router.refresh()
  }

  const monthOptions = [{ value: 'all', label: 'All 12 months' }, ...MONTHS_LONG.map((m, i) => ({ value: String(i + 1), label: m }))]

  return (
    <Modal
      open={type !== null}
      onClose={onClose}
      title="Add expense item"
      subtitle={`Budget year ${year}`}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" form="exp-add-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Add item'}
          </button>
        </div>
      }
    >
      <form id="exp-add-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Item" required value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} error={errors.item_name} placeholder="Electricity" containerClassName="sm:col-span-2" autoFocus />
          {categoryOptions.length > 0 ? (
            <SelectField label="Category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={categoryOptions} error={errors.category} hint="Matches the expense categories so actuals line up" />
          ) : (
            <TextField label="Category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} error={errors.category} hint="No expense categories are configured in Settings" />
          )}
          <SelectField label="Type" required value={form.expense_type} onChange={(e) => setForm({ ...form, expense_type: e.target.value as ExpenseType })} options={['OPEX', 'CAPEX']} error={errors.expense_type} />
          <MoneyField label="Amount" currency={baseCurrency} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} error={errors.amount_thb} hint="Optional; leave empty to fill cells later" />
          <SelectField label="Apply to" value={form.months} onChange={(e) => setForm({ ...form, months: e.target.value })} options={monthOptions} disabled={form.amount === ''} />
        </FormGrid>
      </form>
    </Modal>
  )
}
