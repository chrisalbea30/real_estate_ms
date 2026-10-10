'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Paperclip, Receipt, Filter, Scale, Hash } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Chips } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { fileHref } from '@/lib/storage'
import { cn, formatDate } from '@/lib/format'
import { deleteExpenseAction } from '@/app/(app)/app/expenses/actions'
import { ExpenseModal } from '@/components/expenses/ExpenseModal'
import { ExpenseAmount, expenseBase, legalTone } from '@/components/expenses/helpers'
import type { Expense } from '@/lib/types'

const sum = (rows: Expense[]) => rows.reduce((s, e) => s + expenseBase(e), 0)

export function ExpensesClient({ expenses }: { expenses: Expense[] }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can, fmt, categories, today } = useApp()
  const [editing, setEditing] = useState<Partial<Expense> | null>(null)
  const [category, setCategory] = useState('')
  const [legalOnly, setLegalOnly] = useState(false)
  const [year, setYear] = useState('all')

  // Years come from the data plus the current year: nothing hard-coded.
  const years = useMemo(() => {
    const s = new Set<string>([today.slice(0, 4)])
    for (const e of expenses) {
      const y = e.payment_date?.slice(0, 4)
      if (y) s.add(y)
    }
    return [...s].sort().reverse()
  }, [expenses, today])

  const categoryOptions = useMemo(() => {
    const s = new Set<string>(categories('expense'))
    for (const e of expenses) if (e.category) s.add(e.category)
    return [...s]
  }, [expenses, categories])

  const filtered = useMemo(
    () => expenses.filter((e) => (!category || e.category === category) && (!legalOnly || !!e.is_legal) && (year === 'all' || (e.payment_date ?? '').startsWith(year))),
    [expenses, category, legalOnly, year],
  )

  const stats = useMemo(
    () => ({ total: sum(expenses), filtered: sum(filtered), legal: sum(expenses.filter((e) => e.is_legal)), count: expenses.length, missingRate: expenses.filter((e) => e.amount_base == null && e.amount != null).length }),
    [expenses, filtered],
  )

  const remove = async (e: Expense) => {
    const ok = await confirm({ title: `Delete ${e.transaction_number ?? 'this expense'}?`, message: `${e.supplier ?? 'Expense'} · ${formatDate(e.payment_date)}. The ledger movement it posted is removed too.`, confirmLabel: 'Delete', danger: true })
    if (!ok) return
    const res = await deleteExpenseAction(e.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Expense deleted')
    router.refresh()
  }

  const columns: Column<Expense>[] = [
    { key: 'payment_date', header: 'Date', cell: (e) => formatDate(e.payment_date), sortValue: (e) => e.payment_date ?? '', width: '7rem' },
    { key: 'transaction_number', header: 'Transaction #', cell: (e) => <span className="text-muted">{e.transaction_number ?? '—'}</span>, sortValue: (e) => e.transaction_number ?? '', hide: 'xl' },
    { key: 'document_number', header: 'Doc #', cell: (e) => <span className="text-muted">{e.document_number ?? '—'}</span>, sortValue: (e) => e.document_number ?? '', hide: 'lg', width: '5rem' },
    {
      key: 'category',
      header: 'Category',
      cell: (e) => (
        <div className="min-w-0">
          <div className="truncate">{e.category ?? '—'}</div>
          {e.subcategory && <div className="truncate text-xs text-muted">{e.subcategory}</div>}
        </div>
      ),
      sortValue: (e) => e.category ?? '',
      hide: 'md',
    },
    {
      key: 'supplier',
      header: 'Supplier',
      cell: (e) => (
        <div className="min-w-0 max-w-[20rem]">
          <div className="truncate font-medium">{e.supplier ?? '—'}</div>
          {e.description && <div className="truncate text-xs text-muted">{e.description}</div>}
        </div>
      ),
      sortValue: (e) => e.supplier ?? '',
    },
    { key: 'amount', header: 'Amount', cell: (e) => <ExpenseAmount expense={e} className="font-medium" />, sortValue: (e) => expenseBase(e), align: 'right' },
    { key: 'method', header: 'Method', cell: (e) => e.method ?? '—', sortValue: (e) => e.method ?? '', hide: 'lg' },
    { key: 'paid_by', header: 'Paid by', cell: (e) => e.paid_by ?? '—', sortValue: (e) => e.paid_by ?? '', hide: 'xl' },
    { key: 'audit', header: 'Audit', cell: (e) => <Badge tone={statusTone(e.audit)}>{e.audit ?? 'To check'}</Badge>, sortValue: (e) => e.audit ?? '', hide: 'lg' },
    {
      key: 'legal',
      header: 'Legal',
      cell: (e) => (e.is_legal ? <Badge tone={legalTone(e.legal_status)}>{e.legal_status ?? 'Pending'}</Badge> : <span className="text-muted">—</span>),
      sortValue: (e) => (e.is_legal ? e.legal_status ?? 'Pending' : ''),
      hide: 'md',
    },
    {
      key: 'file',
      header: '',
      cell: (e) =>
        e.file_url ? (
          <a href={fileHref(e.file_url)!} target="_blank" rel="noreferrer" className="icon-btn !h-8 !w-8" title="Open attachment">
            <Paperclip className="h-4 w-4" />
          </a>
        ) : null,
      width: '3rem',
    },
  ]

  const actions = (e: Expense) => (
    <>
      {can('expenses', 'edit') && (
        <button className="icon-btn !h-8 !w-8" title="Edit" onClick={() => setEditing(e)}>
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {can('expenses', 'delete') && (
        <button className="icon-btn !h-8 !w-8 text-danger" title="Delete" onClick={() => remove(e)}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </>
  )

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={`${expenses.length} record${expenses.length === 1 ? '' : 's'}${stats.missingRate ? ` · ${stats.missingRate} without an exchange rate` : ''}`}
        actions={
          can('expenses', 'add') && (
            <button className="btn-primary" onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" /> Add expense
            </button>
          )
        }
      />

      <StatGrid className="mb-5">
        <StatCard label="Total expenses" value={fmt(stats.total)} icon={Receipt} tone="primary" />
        <StatCard label="Filtered total" value={fmt(stats.filtered)} icon={Filter} tone="info" sub={`${filtered.length} of ${expenses.length}`} />
        <StatCard label="Legal expenses" value={fmt(stats.legal)} icon={Scale} tone="accent" onClick={() => setLegalOnly((v) => !v)} active={legalOnly} />
        <StatCard label="Records" value={stats.count} icon={Hash} />
      </StatGrid>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(e) => e.id}
        search={(e) => `${e.supplier ?? ''} ${e.description ?? ''} ${e.transaction_number ?? ''} ${e.document_number ?? ''}`}
        searchPlaceholder="Search supplier, description, transaction or document #…"
        defaultSort={{ key: 'payment_date', dir: 'desc' }}
        toolbar={
          <>
            <select className="select w-auto" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
              <option value="">All categories</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setLegalOnly((v) => !v)}
              className={cn('badge border px-3 py-1 transition', legalOnly ? 'border-primary bg-primary text-primary-fg' : 'border-line bg-surface text-ink-2 hover:bg-surface-2')}
            >
              <Scale className="h-3 w-3" /> Legal only
            </button>
            <Chips value={year} onChange={setYear} options={[{ key: 'all', label: 'All years' }, ...years.map((y) => ({ key: y, label: y }))]} />
          </>
        }
        actions={actions}
        exportName="expenses"
        exportRow={(e) => ({
          Date: e.payment_date ?? '',
          'Transaction #': e.transaction_number ?? '',
          'Document #': e.document_number ?? '',
          Category: e.category ?? '',
          Subcategory: e.subcategory ?? '',
          Supplier: e.supplier ?? '',
          Description: e.description ?? '',
          Amount: e.amount ?? '',
          Currency: e.currency ?? '',
          'Amount (base)': e.amount_base ?? '',
          Method: e.method ?? '',
          'Paid By': e.paid_by ?? '',
          Audit: e.audit ?? '',
          Legal: e.is_legal ? 'Yes' : 'No',
          'Legal Status': e.is_legal ? e.legal_status ?? 'Pending' : '',
          Attachment: e.file_url ?? '',
        })}
        footer={(rows) => (
          <div className="flex flex-wrap justify-between gap-2 tabular">
            <span className="text-muted">{rows.length} expenses</span>
            <span>
              Total <strong>{fmt(sum(rows))}</strong>
            </span>
          </div>
        )}
        renderCard={(e) => (
          <>
            <CardTitle title={e.supplier ?? e.description ?? e.transaction_number ?? 'Expense'} subtitle={`${formatDate(e.payment_date)} · ${e.category ?? 'Uncategorised'}${e.subcategory ? ` / ${e.subcategory}` : ''}`} right={<ExpenseAmount expense={e} className="font-semibold" />} />
            {e.description && e.supplier && <p className="mb-2 line-clamp-2 text-xs text-muted">{e.description}</p>}
            <CardRow label="Numbers">
              {e.transaction_number ?? '—'} · Doc {e.document_number ?? '—'}
            </CardRow>
            <CardRow label="Method">
              {e.method ?? '—'}
              {e.paid_by ? ` · ${e.paid_by}` : ''}
            </CardRow>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <Badge tone={statusTone(e.audit)}>{e.audit ?? 'To check'}</Badge>
              {e.is_legal && <Badge tone={legalTone(e.legal_status)}>Legal · {e.legal_status ?? 'Pending'}</Badge>}
              {e.file_url && (
                <a href={fileHref(e.file_url)!} target="_blank" rel="noreferrer" className="badge bg-surface-2 text-ink-2">
                  <Paperclip className="h-3 w-3" /> File
                </a>
              )}
            </div>
          </>
        )}
      />

      <ExpenseModal expense={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
