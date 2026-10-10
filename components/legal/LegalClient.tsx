'use client'

import { useMemo, useState } from 'react'
import { Check, HelpCircle, X, ChevronDown, ChevronUp, Download, Printer, Paperclip, FileText, Scale, Clock, CircleCheck, CircleAlert, CircleX, Search } from 'lucide-react'
import { PageHeader, Section } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { fileHref } from '@/lib/storage'
import { cn, formatDate, formatMoney, MONTHS_LONG } from '@/lib/format'
import { ExpenseAmount, expenseBase, isForeign, legalTone } from '@/components/expenses/helpers'
import { ReviewModal, type ReviewTarget } from '@/components/legal/ReviewModal'
import { buildLegalCsv, buildLegalPrintHtml, downloadText, openPrintWindow, absolute, type LegalGroup, type LegalRevenueRow } from '@/components/legal/legalReport'
import type { Expense, Guest, Revenue, Invoice, LegalStatus } from '@/lib/types'

export type LegalInvoice = Pick<Invoice, 'id' | 'guest_id' | 'number' | 'public_token'>

type StatusKey = 'all' | LegalStatus
const GROUP_ORDER: LegalStatus[] = ['Accepted', 'Clarification Needed', 'Rejected', 'Pending']
const PAGE = 10

const statusOf = (e: Expense): LegalStatus => e.legal_status ?? 'Pending'
const sumExpenses = (rows: Expense[]) => rows.reduce((s, e) => s + expenseBase(e), 0)

/** Year/month filter on a 'YYYY-MM-DD' string. Undated rows only appear under "All years / All months". */
function inPeriod(d: string | null | undefined, year: string, month: string) {
  if (!d) return year === 'all' && month === ''
  if (year !== 'all' && !d.startsWith(year)) return false
  if (month && d.slice(5, 7) !== month) return false
  return true
}

function matches(q: string, parts: Array<string | null | undefined>) {
  return !q || parts.some((p) => (p ?? '').toLowerCase().includes(q))
}

export function LegalClient({ expenses, guests, revenue, invoices }: { expenses: Expense[]; guests: Guest[]; revenue: Revenue[]; invoices: LegalInvoice[] }) {
  const toast = useToast()
  const { can, fmt, today, baseCurrency, property } = useApp()
  const [year, setYear] = useState(today.slice(0, 4))
  const [month, setMonth] = useState('')
  const [status, setStatus] = useState<StatusKey>('all')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [shown, setShown] = useState<Record<string, number>>({})
  const [reviewing, setReviewing] = useState<ReviewTarget | null>(null)

  // Years from the data plus the current year.
  const years = useMemo(() => {
    const s = new Set<string>([today.slice(0, 4)])
    for (const e of expenses) if (e.payment_date) s.add(e.payment_date.slice(0, 4))
    for (const g of guests) s.add(g.check_out.slice(0, 4))
    for (const r of revenue) s.add(r.date.slice(0, 4))
    return [...s].sort().reverse()
  }, [expenses, guests, revenue, today])

  const q = query.trim().toLowerCase()

  const periodExpenses = useMemo(() => expenses.filter((e) => inPeriod(e.payment_date, year, month)), [expenses, year, month])

  const kpi = useMemo(() => {
    const by = (s: LegalStatus) => periodExpenses.filter((e) => statusOf(e) === s)
    const counts: Record<LegalStatus, number> = { Pending: by('Pending').length, Accepted: by('Accepted').length, 'Clarification Needed': by('Clarification Needed').length, Rejected: by('Rejected').length }
    return { count: periodExpenses.length, total: sumExpenses(periodExpenses), counts, amounts: { Pending: sumExpenses(by('Pending')), Accepted: sumExpenses(by('Accepted')), 'Clarification Needed': sumExpenses(by('Clarification Needed')), Rejected: sumExpenses(by('Rejected')) } }
  }, [periodExpenses])

  const searched = useMemo(() => periodExpenses.filter((e) => matches(q, [e.supplier, e.description, e.document_number, e.transaction_number, e.category, e.subcategory, e.legal_notes])), [periodExpenses, q])

  const groups: LegalGroup[] = useMemo(
    () =>
      GROUP_ORDER.filter((s) => status === 'all' || status === s).map((s) => {
        const rows = searched.filter((e) => statusOf(e) === s)
        return { status: s, rows, subtotal: sumExpenses(rows) }
      }),
    [searched, status],
  )

  const revenueRows: LegalRevenueRow[] = useMemo(() => {
    const fromGuests: LegalRevenueRow[] = guests
      .filter((g) => inPeriod(g.check_out, year, month))
      .map((g) => {
        const inv = invoices.find((i) => i.guest_id === g.id)
        return {
          key: `g-${g.id}`,
          date: g.check_out,
          source: g.booking_source || 'Direct Booking',
          description: g.guest_name,
          detail: `Room ${g.room} · ${formatDate(g.check_in)} → ${formatDate(g.check_out)}`,
          amount: Number(g.amount_thb_stay ?? 0),
          file_url: g.file_url,
          invoice_url: inv ? `/i/${inv.public_token}` : null,
          invoice_number: inv?.number ?? null,
          origin: 'Booking',
        }
      })
    const fromManual: LegalRevenueRow[] = revenue
      .filter((r) => inPeriod(r.date, year, month))
      .map((r) => ({
        key: `r-${r.id}`,
        date: r.date,
        source: r.type ?? 'Other',
        description: r.supplier || r.type || 'Revenue',
        detail: r.notes ?? '',
        amount: Number(r.amount_thb ?? 0),
        file_url: r.file_url,
        invoice_url: null,
        invoice_number: null,
        origin: 'Manual',
      }))
    return [...fromGuests, ...fromManual].sort((a, b) => b.date.localeCompare(a.date))
  }, [guests, revenue, invoices, year, month])

  const revenueSearched = useMemo(() => revenueRows.filter((r) => matches(q, [r.source, r.description, r.detail, r.invoice_number])), [revenueRows, q])
  const revenueTotal = revenueSearched.reduce((s, r) => s + r.amount, 0)

  const periodLabel = year === 'all' ? 'All time' : month ? `${MONTHS_LONG[Number(month) - 1]} ${year}` : year
  const periodSlug = year === 'all' ? 'all' : month ? `${year}-${month}` : year

  const exportCsv = () => {
    const csv = buildLegalCsv({ groups, revenue: revenueSearched, revenueTotal, base: baseCurrency, href: (p) => absolute(fileHref(p)) })
    downloadText(csv, `legal-report-${periodSlug}.csv`)
  }

  const print = () => {
    const html = buildLegalPrintHtml({
      propertyName: property.name,
      period: periodLabel,
      groups,
      revenue: revenueSearched,
      revenueTotal,
      expenseTotal: groups.reduce((s, g) => s + g.subtotal, 0),
      counts: kpi.counts,
      money: (n) => fmt(n),
      originalMoney: (e) => (isForeign(e, baseCurrency) ? `${formatMoney(Math.abs(Number(e.amount ?? 0)), e.currency!.toUpperCase())} ≈ ${fmt(expenseBase(e))}` : fmt(expenseBase(e))),
      date: formatDate,
    })
    if (!openPrintWindow(html)) toast.error('The print window was blocked. Allow pop-ups for this site and try again.')
  }

  const toggle = (id: string) => setExpanded((x) => ({ ...x, [id]: !x[id] }))
  const canReview = can('legal', 'edit')

  const reviewButtons = (e: Expense) =>
    canReview ? (
      <div className="flex items-center gap-0.5">
        <button className="icon-btn !h-8 !w-8 text-success" title="Accept" onClick={() => setReviewing({ expense: e, decision: 'Accepted' })}>
          <Check className="h-4 w-4" />
        </button>
        <button className="icon-btn !h-8 !w-8 text-warning" title="Needs clarification" onClick={() => setReviewing({ expense: e, decision: 'Clarification Needed' })}>
          <HelpCircle className="h-4 w-4" />
        </button>
        <button className="icon-btn !h-8 !w-8 text-danger" title="Reject" onClick={() => setReviewing({ expense: e, decision: 'Rejected' })}>
          <X className="h-4 w-4" />
        </button>
      </div>
    ) : null

  const expenseRow = (e: Expense) => {
    const open = !!expanded[e.id]
    return (
      <div key={e.id} className="border-t border-line first:border-t-0">
        <div className="flex items-start gap-2 px-3 py-3 sm:px-4">
          <button type="button" className="icon-btn !h-8 !w-8 shrink-0" onClick={() => toggle(e.id)} aria-label={open ? 'Hide details' : 'Show details'}>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="truncate font-medium">{e.supplier ?? e.description ?? e.transaction_number ?? '—'}</span>
              <span className="text-xs text-muted">
                {formatDate(e.payment_date)}
                {e.document_number ? ` · #${e.document_number}` : e.transaction_number ? ` · ${e.transaction_number}` : ''}
              </span>
            </div>
            <div className="truncate text-xs text-muted">
              {[e.category, e.subcategory].filter(Boolean).join(' / ') || 'Uncategorised'}
              {e.legal_reviewed_at ? ` · reviewed ${formatDate(e.legal_reviewed_at)}` : ''}
            </div>
            {e.legal_notes && !open && <div className="mt-0.5 truncate text-xs text-warning">{e.legal_notes}</div>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <ExpenseAmount expense={e} className="font-semibold" />
            <div className="flex items-center gap-0.5">
              {e.file_url && (
                <a href={fileHref(e.file_url)!} target="_blank" rel="noreferrer" className="icon-btn !h-8 !w-8" title="Open attachment">
                  <Paperclip className="h-4 w-4" />
                </a>
              )}
              {reviewButtons(e)}
            </div>
          </div>
        </div>
        {open && (
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 px-3 pb-3 text-sm sm:grid-cols-2 sm:pl-14 sm:pr-4">
            <Detail label="Description">{e.description ?? '—'}</Detail>
            <Detail label="Method">{e.method ?? '—'}</Detail>
            <Detail label="Paid by">{e.paid_by ?? '—'}</Detail>
            <Detail label="Type">{e.type ?? '—'}</Detail>
            <Detail label="Transaction">{e.transaction_number ?? '—'}</Detail>
            <Detail label="Audit">{e.audit ?? '—'}</Detail>
            <Detail label="Legal notes" className="sm:col-span-2">
              {e.legal_notes ?? '—'}
            </Detail>
          </div>
        )}
      </div>
    )
  }

  const revenueColumns: Column<LegalRevenueRow>[] = [
    { key: 'date', header: 'Date', cell: (r) => formatDate(r.date), sortValue: (r) => r.date, width: '7rem' },
    {
      key: 'source',
      header: 'Source',
      cell: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <span>{r.source}</span>
          <Badge tone={r.origin === 'Booking' ? 'primary' : 'neutral'}>{r.origin}</Badge>
        </div>
      ),
      sortValue: (r) => r.source,
      hide: 'md',
    },
    {
      key: 'description',
      header: 'Description',
      cell: (r) => (
        <div className="min-w-0 max-w-[22rem]">
          <div className="truncate font-medium">{r.description}</div>
          {r.detail && <div className="truncate text-xs text-muted">{r.detail}</div>}
        </div>
      ),
      sortValue: (r) => r.description,
    },
    { key: 'amount', header: 'Amount', cell: (r) => <span className="font-medium">{fmt(r.amount)}</span>, sortValue: (r) => r.amount, align: 'right' },
    {
      key: 'docs',
      header: 'Documents',
      cell: (r) => (
        <div className="flex items-center gap-0.5">
          {r.file_url && (
            <a href={fileHref(r.file_url)!} target="_blank" rel="noreferrer" className="icon-btn !h-8 !w-8" title="Open document">
              <Paperclip className="h-4 w-4" />
            </a>
          )}
          {r.invoice_url && (
            <a href={r.invoice_url} target="_blank" rel="noreferrer" className="icon-btn !h-8 !w-8" title={`Invoice ${r.invoice_number ?? ''}`}>
              <FileText className="h-4 w-4" />
            </a>
          )}
        </div>
      ),
      width: '6rem',
    },
  ]

  const tabs: { key: StatusKey; label: string; badge: number }[] = [
    { key: 'all', label: 'All', badge: kpi.count },
    { key: 'Pending', label: 'Pending', badge: kpi.counts.Pending },
    { key: 'Accepted', label: 'Accepted', badge: kpi.counts.Accepted },
    { key: 'Clarification Needed', label: 'Clarification', badge: kpi.counts['Clarification Needed'] },
    { key: 'Rejected', label: 'Rejected', badge: kpi.counts.Rejected },
  ]

  const anyExpense = groups.some((g) => g.rows.length > 0)

  return (
    <div>
      <PageHeader
        title="Legal & accounting"
        subtitle={`${expenses.length} shared expense${expenses.length === 1 ? '' : 's'} · ${guests.length + revenue.length} revenue row${guests.length + revenue.length === 1 ? '' : 's'} shown to legal`}
        actions={
          <>
            <button className="btn-secondary btn-sm" onClick={exportCsv} disabled={!anyExpense && revenueSearched.length === 0}>
              <Download className="h-4 w-4" /> CSV
            </button>
            <button className="btn-secondary btn-sm" onClick={print}>
              <Printer className="h-4 w-4" /> Print
            </button>
          </>
        }
      />

      <div className="card mb-5 flex flex-col gap-2 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:p-4">
        <select className="select w-auto" value={year} onChange={(e) => setYear(e.target.value)} aria-label="Year">
          <option value="all">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select className="select w-auto" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
          <option value="">All months</option>
          {MONTHS_LONG.map((m, i) => (
            <option key={m} value={String(i + 1).padStart(2, '0')}>
              {m}
            </option>
          ))}
        </select>
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input type="search" className="input pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search supplier, description, document #, notes, guest…" />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total" value={kpi.count} sub={fmt(kpi.total)} icon={Scale} tone="primary" onClick={() => setStatus('all')} active={status === 'all'} />
        <StatCard label="Pending" value={kpi.counts.Pending} sub={fmt(kpi.amounts.Pending)} icon={Clock} tone="info" onClick={() => setStatus('Pending')} active={status === 'Pending'} />
        <StatCard label="Accepted" value={kpi.counts.Accepted} sub={fmt(kpi.amounts.Accepted)} icon={CircleCheck} tone="success" onClick={() => setStatus('Accepted')} active={status === 'Accepted'} />
        <StatCard label="Clarification" value={kpi.counts['Clarification Needed']} sub={fmt(kpi.amounts['Clarification Needed'])} icon={CircleAlert} tone="warning" onClick={() => setStatus('Clarification Needed')} active={status === 'Clarification Needed'} />
        <StatCard label="Rejected" value={kpi.counts.Rejected} sub={fmt(kpi.amounts.Rejected)} icon={CircleX} tone="danger" onClick={() => setStatus('Rejected')} active={status === 'Rejected'} />
      </div>

      <Section title="Shared expenses" description={periodLabel}>
        <Tabs tabs={tabs} value={status} onChange={setStatus} className="mb-3" />
        {!anyExpense ? (
          <EmptyState icon={Scale} title="No shared expenses" description={q ? 'Nothing matches your search in this period.' : 'Expenses appear here once "Share with legal" is ticked on them.'} />
        ) : (
          <div className="space-y-4">
            {groups
              .filter((g) => g.rows.length > 0)
              .map((g) => {
                const limit = shown[g.status] ?? PAGE
                return (
                  <div key={g.status} className="card overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-3 py-2.5 sm:px-4">
                      <div className="flex items-center gap-2">
                        <Badge tone={legalTone(g.status)}>{g.status}</Badge>
                        <span className="text-sm text-muted">
                          {g.rows.length} expense{g.rows.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="text-sm">
                        Subtotal <strong className="tabular">{fmt(g.subtotal)}</strong>
                      </div>
                    </div>
                    {g.rows.slice(0, limit).map(expenseRow)}
                    {g.rows.length > limit && (
                      <button type="button" className="btn-ghost btn-sm w-full rounded-none border-t border-line" onClick={() => setShown({ ...shown, [g.status]: limit + PAGE })}>
                        Show {Math.min(PAGE, g.rows.length - limit)} more of {g.rows.length - limit}
                      </button>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </Section>

      <Section title="Revenue shown to legal" description="Bookings flagged on the guest record plus manual revenue flagged on the Revenue page; a booking is never listed twice.">
        <DataTable
          rows={revenueSearched}
          columns={revenueColumns}
          rowKey={(r) => r.key}
          defaultSort={{ key: 'date', dir: 'desc' }}
          empty={<EmptyState title="No revenue shown to legal" description="Tick “Show on legal page” on a booking or a manual revenue row." />}
          footer={(rows) => (
            <div className="flex flex-wrap justify-between gap-2 tabular">
              <span className="text-muted">{rows.length} rows</span>
              <span>
                Total (Legal) <strong>{fmt(rows.reduce((s, r) => s + r.amount, 0))}</strong>
              </span>
            </div>
          )}
          renderCard={(r) => (
            <>
              <CardTitle title={r.description} subtitle={`${formatDate(r.date)} · ${r.source}`} right={<Badge tone={r.origin === 'Booking' ? 'primary' : 'neutral'}>{r.origin}</Badge>} />
              {r.detail && <p className="mb-1 text-xs text-muted">{r.detail}</p>}
              <CardRow label="Amount">{fmt(r.amount)}</CardRow>
              {(r.file_url || r.invoice_url) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.file_url && (
                    <a href={fileHref(r.file_url)!} target="_blank" rel="noreferrer" className="badge bg-surface-2 text-ink-2">
                      <Paperclip className="h-3 w-3" /> Document
                    </a>
                  )}
                  {r.invoice_url && (
                    <a href={r.invoice_url} target="_blank" rel="noreferrer" className="badge bg-surface-2 text-ink-2">
                      <FileText className="h-3 w-3" /> {r.invoice_number ?? 'Invoice'}
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        />
      </Section>

      <ReviewModal target={reviewing} onClose={() => setReviewing(null)} />
    </div>
  )
}

function Detail({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="whitespace-pre-wrap break-words text-ink-2">{children}</div>
    </div>
  )
}
