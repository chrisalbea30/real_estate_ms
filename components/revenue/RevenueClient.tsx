'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Lock, Paperclip, FileText, Banknote, CalendarDays, Filter, Scale } from 'lucide-react'
import { PageHeader, Section } from '@/components/ui/PageHeader'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Chips } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { fileHref } from '@/lib/storage'
import { cn, formatDate, formatMonth, formatPct, revenueSourceGroup, ymOf, MONTHS } from '@/lib/format'
import { deleteRevenueAction } from '@/app/(app)/app/revenue/actions'
import { RevenueModal } from '@/components/revenue/RevenueModal'
import type { Revenue, Invoice } from '@/lib/types'

export type InvoiceLite = Pick<Invoice, 'id' | 'guest_id' | 'number' | 'public_token'>

const GROUPS = ['Direct Booking', 'Booking.com', 'Agoda', 'Airbnb', 'Other'] as const
type Group = (typeof GROUPS)[number]
type LegalFilter = 'all' | 'yes' | 'no'

const amt = (r: Revenue) => Number(r.amount_thb ?? 0)
const sum = (rows: Revenue[]) => rows.reduce((s, r) => s + amt(r), 0)
const isBooking = (r: Revenue) => !!r.guest_id

export function RevenueClient({ revenue, invoices }: { revenue: Revenue[]; invoices: InvoiceLite[] }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can, fmt, today } = useApp()
  const [editing, setEditing] = useState<Partial<Revenue> | null>(null)
  const [month, setMonth] = useState('')
  const [group, setGroup] = useState<Group | ''>('')
  const [legal, setLegal] = useState<LegalFilter>('all')
  const [gridYearState, setGridYear] = useState<string | null>(null)

  const years = useMemo(() => {
    const s = new Set<string>()
    for (const r of revenue) if (r.date) s.add(r.date.slice(0, 4))
    if (s.size === 0) s.add(today.slice(0, 4))
    return [...s].sort().reverse()
  }, [revenue, today])
  const gridYear = gridYearState && years.includes(gridYearState) ? gridYearState : years.includes(today.slice(0, 4)) ? today.slice(0, 4) : years[0]!

  const monthOptions = useMemo(() => [...new Set(revenue.map((r) => ymOf(r.date)).filter(Boolean))].sort().reverse(), [revenue])

  const totals = useMemo(() => {
    const total = sum(revenue)
    const thisMonth = sum(revenue.filter((r) => ymOf(r.date) === today.slice(0, 7)))
    const byGroup = GROUPS.map((g) => {
      const t = sum(revenue.filter((r) => revenueSourceGroup(r.type) === g))
      return { g, total: t, pct: total > 0 ? (t / total) * 100 : 0 }
    })
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const key = `${gridYear}-${String(i + 1).padStart(2, '0')}`
      return { key, label: MONTHS[i]!, total: sum(revenue.filter((r) => ymOf(r.date) === key)) }
    })
    const yearTotal = monthly.reduce((s, m) => s + m.total, 0)
    return { total, thisMonth, byGroup, monthly, yearTotal, bookings: revenue.filter(isBooking).length }
  }, [revenue, today, gridYear])

  const filtered = useMemo(
    () => revenue.filter((r) => (!month || ymOf(r.date) === month) && (!group || revenueSourceGroup(r.type) === group) && (legal === 'all' || (legal === 'yes') === !!r.show_on_legal)),
    [revenue, month, group, legal],
  )

  const invoiceFor = (r: Revenue) => (r.guest_id ? invoices.find((i) => i.guest_id === r.guest_id) : undefined)

  const remove = async (r: Revenue) => {
    if (isBooking(r)) return
    const ok = await confirm({ title: 'Delete this revenue row?', message: `${r.supplier || r.type || 'Revenue'} · ${formatDate(r.date)} · ${fmt(r.amount_thb)}`, confirmLabel: 'Delete', danger: true })
    if (!ok) return
    const res = await deleteRevenueAction(r.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Revenue deleted')
    router.refresh()
  }

  const columns: Column<Revenue>[] = [
    { key: 'date', header: 'Date', cell: (r) => formatDate(r.date), sortValue: (r) => r.date, width: '7rem' },
    {
      key: 'type',
      header: 'Type / source',
      cell: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <span>{r.type ?? '—'}</span>
          {isBooking(r) && (
            <Badge tone="primary">
              <Lock className="h-3 w-3" /> Booking
            </Badge>
          )}
        </div>
      ),
      sortValue: (r) => r.type ?? '',
    },
    { key: 'supplier', header: 'Description', cell: (r) => <span className="font-medium">{r.supplier ?? '—'}</span>, sortValue: (r) => r.supplier ?? '' },
    { key: 'amount', header: 'Amount', cell: (r) => <span className="font-medium">{fmt(r.amount_thb)}</span>, sortValue: (r) => amt(r), align: 'right' },
    { key: 'notes', header: 'Notes', cell: (r) => <span className="line-clamp-2 max-w-[18rem] text-xs text-muted">{r.notes ?? ''}</span>, hide: 'lg' },
    {
      key: 'flags',
      header: 'Legal',
      cell: (r) => (r.show_on_legal ? <Badge tone="info">Legal</Badge> : <span className="text-muted">—</span>),
      sortValue: (r) => (r.show_on_legal ? 1 : 0),
      hide: 'md',
    },
    {
      key: 'file',
      header: '',
      cell: (r) =>
        r.file_url ? (
          <a href={fileHref(r.file_url)!} target="_blank" rel="noreferrer" className="icon-btn !h-8 !w-8" title="Open document">
            <Paperclip className="h-4 w-4" />
          </a>
        ) : null,
      width: '3rem',
    },
  ]

  const actions = (r: Revenue) => {
    const locked = isBooking(r)
    const inv = invoiceFor(r)
    return (
      <>
        {inv && (
          <a className="icon-btn !h-8 !w-8" title={`Invoice ${inv.number}`} href={`/i/${inv.public_token}`} target="_blank" rel="noreferrer">
            <FileText className="h-4 w-4" />
          </a>
        )}
        {can('revenue', 'edit') && (
          <span title={locked ? 'Edit the booking in Guests' : 'Edit'}>
            <button className="icon-btn !h-8 !w-8" disabled={locked} onClick={() => !locked && setEditing(r)} aria-label="Edit">
              {locked ? <Lock className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </button>
          </span>
        )}
        {can('revenue', 'delete') && (
          <span title={locked ? 'Edit the booking in Guests' : 'Delete'}>
            <button className="icon-btn !h-8 !w-8 text-danger" disabled={locked} onClick={() => remove(r)} aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </span>
        )}
      </>
    )
  }

  return (
    <div>
      <PageHeader
        title="Revenue"
        subtitle={`${revenue.length} row${revenue.length === 1 ? '' : 's'} · ${totals.bookings} from bookings`}
        actions={
          can('revenue', 'add') && (
            <button className="btn-primary" onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" /> Add revenue
            </button>
          )
        }
      />

      <StatGrid className="mb-5">
        <StatCard label="Total revenue" value={fmt(totals.total)} icon={Banknote} tone="primary" sub="All time" />
        <StatCard label="This month" value={fmt(totals.thisMonth)} icon={CalendarDays} tone="success" sub={formatMonth(today.slice(0, 7))} onClick={() => setMonth((m) => (m === today.slice(0, 7) ? '' : today.slice(0, 7)))} active={month === today.slice(0, 7)} />
        <StatCard label="Filtered total" value={fmt(sum(filtered))} icon={Filter} tone="info" sub={`${filtered.length} of ${revenue.length}`} />
        <StatCard label="Shown to legal" value={revenue.filter((r) => r.show_on_legal).length} icon={Scale} tone="accent" onClick={() => setLegal((l) => (l === 'yes' ? 'all' : 'yes'))} active={legal === 'yes'} />
      </StatGrid>

      <Section title="By source" description="Tap a source to filter the list.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {totals.byGroup.map((b) => (
            <StatCard key={b.g} label={b.g} value={fmt(b.total)} sub={formatPct(b.pct)} tone={group === b.g ? 'primary' : 'default'} onClick={() => setGroup((g) => (g === b.g ? '' : b.g))} active={group === b.g} />
          ))}
        </div>
      </Section>

      <Section
        title={`Monthly · ${gridYear}`}
        description={`Year total ${fmt(totals.yearTotal)}`}
        actions={years.length > 1 ? <Chips value={gridYear} onChange={setGridYear} options={years.map((y) => ({ key: y, label: y }))} /> : undefined}
      >
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {totals.monthly.map((m) => {
            const active = month === m.key
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMonth((cur) => (cur === m.key ? '' : m.key))}
                className={cn('card p-3 text-left transition hover:border-primary/40', active && 'border-primary ring-4 ring-primary/10', m.total === 0 && 'opacity-60')}
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">{m.label}</div>
                <div className="mt-1 truncate text-sm font-semibold tabular">{fmt(m.total)}</div>
              </button>
            )
          })}
        </div>
      </Section>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        search={(r) => `${r.type ?? ''} ${r.supplier ?? ''} ${r.notes ?? ''}`}
        searchPlaceholder="Search type, description, notes…"
        defaultSort={{ key: 'date', dir: 'desc' }}
        toolbar={
          <>
            <select className="select w-auto" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
              <option value="">All months</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </select>
            <select className="select w-auto" value={group} onChange={(e) => setGroup(e.target.value as Group | '')} aria-label="Source">
              <option value="">All sources</option>
              {GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <Chips
              value={legal}
              onChange={setLegal}
              options={[
                { key: 'all', label: 'All' },
                { key: 'yes', label: 'Legal: yes' },
                { key: 'no', label: 'Legal: no' },
              ]}
            />
          </>
        }
        actions={actions}
        exportName="revenue"
        exportRow={(r) => ({
          Date: r.date,
          'Type/Source': r.type ?? '',
          Description: r.supplier ?? '',
          Amount: r.amount_thb ?? 0,
          Notes: r.notes ?? '',
          Document: r.file_url ?? '',
          Legal: r.show_on_legal ? 'Yes' : 'No',
          Origin: isBooking(r) ? 'Booking' : 'Manual',
        })}
        footer={(rows) => (
          <div className="flex flex-wrap justify-between gap-2 tabular">
            <span className="text-muted">{rows.length} rows</span>
            <span>
              {month || group || legal !== 'all' ? 'Filtered total' : 'Total'} <strong>{fmt(sum(rows))}</strong>
            </span>
          </div>
        )}
        renderCard={(r) => (
          <>
            <CardTitle
              title={r.supplier || r.type || 'Revenue'}
              subtitle={`${formatDate(r.date)} · ${r.type ?? 'Other'}`}
              right={
                isBooking(r) ? (
                  <Badge tone="primary">
                    <Lock className="h-3 w-3" /> Booking
                  </Badge>
                ) : (
                  <Badge>Manual</Badge>
                )
              }
            />
            <CardRow label="Amount">{fmt(r.amount_thb)}</CardRow>
            {r.notes && <p className="mt-1 line-clamp-2 text-xs text-muted">{r.notes}</p>}
            <div className="mt-2 flex flex-wrap gap-1">
              {r.show_on_legal && <Badge tone="info">Legal</Badge>}
              {r.file_url && (
                <a href={fileHref(r.file_url)!} target="_blank" rel="noreferrer" className="badge bg-surface-2 text-ink-2">
                  <Paperclip className="h-3 w-3" /> Document
                </a>
              )}
            </div>
          </>
        )}
      />

      <RevenueModal revenue={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
