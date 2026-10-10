'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Timer } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { formatDate, formatMonth, formatNumber, ymOf } from '@/lib/format'
import { staffPay } from '@/lib/schemas/staff-hours'
import { deleteStaffHourAction } from '@/app/(app)/app/staff-hours/actions'
import { StaffHourModal } from '@/components/staff-hours/StaffHourModal'
import type { StaffHour } from '@/lib/types'

export function hoursLabel(h: number | null | undefined) {
  const n = Number(h ?? 0)
  return `${formatNumber(n, n % 1 ? 1 : 0)} h`
}

export function StaffHoursClient({ rows }: { rows: StaffHour[] }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can, fmt, today } = useApp()
  const [editing, setEditing] = useState<Partial<StaffHour> | null>(null)
  const [staff, setStaff] = useState('')
  const [month, setMonth] = useState(ymOf(today))

  const staffNames = useMemo(() => [...new Set(rows.map((r) => r.staff_name))].sort((a, b) => a.localeCompare(b)), [rows])
  const months = useMemo(() => {
    const set = new Set(rows.map((r) => ymOf(r.date)))
    set.add(ymOf(today))
    return [...set].sort().reverse()
  }, [rows, today])

  // Month filter first (summary cards use it), then the staff filter for the table.
  const monthRows = useMemo(() => (month ? rows.filter((r) => ymOf(r.date) === month) : rows), [rows, month])
  const filtered = useMemo(() => (staff ? monthRows.filter((r) => r.staff_name === staff) : monthRows), [monthRows, staff])

  const summary = useMemo(() => {
    const map = new Map<string, { name: string; hours: number; pay: number; entries: number }>()
    for (const r of monthRows) {
      const s = map.get(r.staff_name) ?? { name: r.staff_name, hours: 0, pay: 0, entries: 0 }
      s.hours += Number(r.hours ?? 0)
      s.pay += staffPay(r)
      s.entries++
      map.set(r.staff_name, s)
    }
    return [...map.values()].sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name))
  }, [monthRows])

  const totals = useMemo(() => filtered.reduce((t, r) => ({ hours: t.hours + Number(r.hours ?? 0), pay: t.pay + staffPay(r) }), { hours: 0, pay: 0 }), [filtered])

  const remove = async (r: StaffHour) => {
    const ok = await confirm({ title: `Delete ${hoursLabel(r.hours)} for ${r.staff_name}?`, message: `Entry of ${formatDate(r.date)} is removed permanently.`, confirmLabel: 'Delete', danger: true })
    if (!ok) return
    const res = await deleteStaffHourAction(r.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Entry deleted')
    router.refresh()
  }

  const rate = (r: StaffHour) => (r.hourly_rate_thb == null ? '—' : fmt(r.hourly_rate_thb, { decimals: Number.isInteger(Number(r.hourly_rate_thb)) ? 0 : 2 }))

  const columns: Column<StaffHour>[] = [
    { key: 'date', header: 'Date', cell: (r) => formatDate(r.date), sortValue: (r) => r.date, width: '8rem' },
    {
      key: 'staff',
      header: 'Staff',
      cell: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.staff_name}</div>
          {(r.role || r.department) && <div className="truncate text-xs text-muted lg:hidden">{[r.role, r.department].filter(Boolean).join(' · ')}</div>}
        </div>
      ),
      sortValue: (r) => r.staff_name,
    },
    { key: 'role', header: 'Role', cell: (r) => r.role ?? <span className="text-muted">—</span>, sortValue: (r) => r.role ?? '', hide: 'lg' },
    { key: 'department', header: 'Department', cell: (r) => r.department ?? <span className="text-muted">—</span>, sortValue: (r) => r.department ?? '', hide: 'lg' },
    { key: 'hours', header: 'Hours', cell: (r) => hoursLabel(r.hours), sortValue: (r) => Number(r.hours), align: 'right', width: '6rem' },
    { key: 'rate', header: 'Rate', cell: rate, sortValue: (r) => r.hourly_rate_thb ?? 0, align: 'right', hide: 'md' },
    { key: 'total', header: 'Total', cell: (r) => <span className="font-medium">{fmt(staffPay(r))}</span>, sortValue: (r) => staffPay(r), align: 'right' },
    { key: 'notes', header: 'Notes', cell: (r) => <span className="block max-w-xs truncate text-muted">{r.notes ?? ''}</span>, hide: 'xl' },
  ]

  const actions = (r: StaffHour) => (
    <>
      {can('staff_hours', 'edit') && (
        <button className="icon-btn !h-8 !w-8" title="Edit" onClick={() => setEditing(r)}>
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {can('staff_hours', 'delete') && (
        <button className="icon-btn !h-8 !w-8 text-danger" title="Delete" onClick={() => remove(r)}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </>
  )

  const monthLabel = month ? formatMonth(month) : 'All months'

  return (
    <div>
      <PageHeader
        title="Staff hours"
        subtitle={`${monthLabel} · ${hoursLabel(totals.hours)} · ${fmt(totals.pay)}${staff ? ` · ${staff}` : ''}`}
        actions={
          can('staff_hours', 'add') && (
            <button className="btn-primary" onClick={() => setEditing({ staff_name: staff || undefined })}>
              <Plus className="h-4 w-4" /> Add hours
            </button>
          )
        }
      />

      {summary.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {summary.map((s) => (
            <StatCard
              key={s.name}
              label={s.name}
              value={hoursLabel(s.hours)}
              sub={`${fmt(s.pay)} · ${s.entries} ${s.entries === 1 ? 'entry' : 'entries'}`}
              tone={staff === s.name ? 'primary' : 'default'}
              onClick={() => setStaff((v) => (v === s.name ? '' : s.name))}
              active={staff === s.name}
            />
          ))}
        </div>
      )}

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        search={(r) => `${r.staff_name} ${r.role ?? ''} ${r.department ?? ''} ${r.notes ?? ''}`}
        searchPlaceholder="Search staff, role, notes…"
        defaultSort={{ key: 'date', dir: 'desc' }}
        toolbar={
          <>
            <select className="select !min-h-9 !py-1 !pl-2 !pr-7 text-xs w-auto" value={staff} onChange={(e) => setStaff(e.target.value)} aria-label="Staff member">
              <option value="">All staff</option>
              {staffNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select className="select !min-h-9 !py-1 !pl-2 !pr-7 text-xs w-auto" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
              <option value="">All months</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </select>
          </>
        }
        actions={actions}
        empty={
          rows.length === 0 ? (
            <EmptyState icon={Timer} title="No hours recorded" description="Log the hours each staff member works to see pay per month." action={can('staff_hours', 'add') && <button className="btn-primary" onClick={() => setEditing({})}>Add first entry</button>} />
          ) : (
            <EmptyState icon={Timer} title={`Nothing for ${monthLabel.toLowerCase()}`} description="Choose another month or staff member." />
          )
        }
        exportName={`staff-hours${month ? `-${month}` : ''}`}
        exportRow={(r) => ({
          Date: r.date,
          Staff: r.staff_name,
          Role: r.role ?? '',
          Department: r.department ?? '',
          Hours: Number(r.hours),
          Rate: r.hourly_rate_thb ?? '',
          Total: staffPay(r),
          Notes: r.notes ?? '',
        })}
        footer={(list) => {
          const h = list.reduce((s, r) => s + Number(r.hours ?? 0), 0)
          const p = list.reduce((s, r) => s + staffPay(r), 0)
          return (
            <div className="flex flex-wrap justify-between gap-2 tabular">
              <span className="text-muted">{list.length} entries</span>
              <span>
                Hours <strong>{hoursLabel(h)}</strong> · Pay <strong>{fmt(p)}</strong>
              </span>
            </div>
          )
        }}
        renderCard={(r) => (
          <>
            <CardTitle title={r.staff_name} subtitle={`${formatDate(r.date)}${r.role ? ` · ${r.role}` : ''}`} right={<Badge tone="primary">{hoursLabel(r.hours)}</Badge>} />
            {r.department && <CardRow label="Department">{r.department}</CardRow>}
            <CardRow label="Rate">{rate(r)}</CardRow>
            <CardRow label="Total">{fmt(staffPay(r))}</CardRow>
            {r.notes && <p className="mt-2 text-sm text-ink-2">{r.notes}</p>}
          </>
        )}
      />

      <StaffHourModal entry={editing} rows={rows} onClose={() => setEditing(null)} />
    </div>
  )
}
