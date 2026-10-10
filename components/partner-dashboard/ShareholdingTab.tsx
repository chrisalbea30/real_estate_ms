'use client'

import { useMemo } from 'react'
import { Pencil, Percent, CheckCircle2, AlertCircle, Landmark } from 'lucide-react'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { useApp } from '@/components/app/AppProvider'
import { formatPct } from '@/lib/format'
import { shareholding, sum, type DashboardData, type Shareholding, type Totals } from '@/components/partner-dashboard/calc'
import type { Partner } from '@/lib/types'

export function ShareholdingTab({ data, totals, partners, onEdit }: { data: DashboardData; totals: Totals; partners: Partner[]; onEdit?: (p: Partner) => void }) {
  const { fmt } = useApp()
  const rows = useMemo(() => shareholding(partners, data.contributions, totals.capital), [partners, data.contributions, totals.capital])
  const allocated = sum(rows, (r) => r.nominalPct)
  const allocatedOk = Math.abs(allocated - 100) <= 0.01
  const settled = rows.filter((r) => r.balance <= 0).length
  const outstanding = sum(rows, (r) => Math.max(0, r.balance))

  const balanceCell = (r: Shareholding) => <span className={`font-semibold tabular ${r.balance > 0.005 ? 'text-danger' : 'text-success'}`}>{fmt(r.balance)}</span>

  const columns: Column<Shareholding>[] = [
    { key: 'partner', header: 'Partner', cell: (r) => <span className="font-medium">{r.partner.name}</span>, sortValue: (r) => r.partner.name },
    { key: 'pct', header: 'Ownership', cell: (r) => formatPct(r.nominalPct, 2), sortValue: (r) => r.nominalPct, align: 'right' },
    { key: 'nominal', header: 'Nominal', cell: (r) => fmt(r.nominalAmount), sortValue: (r) => r.nominalAmount, align: 'right', hide: 'lg' },
    { key: 'paid', header: 'Paid in', cell: (r) => fmt(r.actualPaid), sortValue: (r) => r.actualPaid, align: 'right' },
    { key: 'balance', header: 'Balance', cell: balanceCell, sortValue: (r) => r.balance, align: 'right' },
    { key: 'funded', header: 'Funded', cell: (r) => (r.fundedPct == null ? '—' : <Badge tone={r.fundedPct >= 100 ? 'success' : r.fundedPct >= 50 ? 'warning' : 'danger'}>{formatPct(r.fundedPct, 0)}</Badge>), sortValue: (r) => r.fundedPct ?? -1, align: 'right', hide: 'md' },
  ]

  return (
    <div className="space-y-6">
      <StatGrid>
        <StatCard label="Total allocated" sub={allocatedOk ? 'ownership adds up' : 'should be 100%'} value={formatPct(allocated, 2)} icon={Percent} tone={allocatedOk ? 'success' : 'warning'} />
        <StatCard label="Fully settled" sub={`of ${rows.length} partner${rows.length === 1 ? '' : 's'}`} value={settled} icon={CheckCircle2} tone={rows.length > 0 && settled === rows.length ? 'success' : 'default'} />
        <StatCard label="Still owed" sub="sum of positive balances" value={fmt(outstanding)} icon={AlertCircle} tone={outstanding > 0 ? 'danger' : 'success'} />
        <StatCard label="Total capital" sub="basis for nominal amounts" value={fmt(totals.capital)} icon={Landmark} tone="primary" />
      </StatGrid>

      <p className="text-sm text-muted">Nominal = total capital × ownership %. Balance = nominal − paid in; a positive balance means the partner still owes against the capital raised so far.</p>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.partner.id}
        pageSize={0}
        defaultSort={{ key: 'pct', dir: 'desc' }}
        actions={
          onEdit
            ? (r) => (
                <button className="icon-btn !h-8 !w-8" title="Edit ownership %" onClick={() => onEdit(r.partner)}>
                  <Pencil className="h-4 w-4" />
                </button>
              )
            : undefined
        }
        empty={<div className="card p-4 text-sm text-muted">No partners yet.</div>}
        footer={(list) => (
          <div className="flex flex-wrap justify-between gap-2 tabular">
            <span className="text-muted">{list.length} partners · {formatPct(sum(list, (r) => r.nominalPct), 2)} allocated</span>
            <span>
              Still owed <strong className="text-danger">{fmt(sum(list, (r) => Math.max(0, r.balance)))}</strong>
            </span>
          </div>
        )}
        renderCard={(r) => (
          <>
            <CardTitle title={r.partner.name} subtitle={r.partner.role ?? undefined} right={<Badge tone="primary">{formatPct(r.nominalPct, 2)}</Badge>} />
            <CardRow label="Nominal">{fmt(r.nominalAmount)}</CardRow>
            <CardRow label="Paid in">{fmt(r.actualPaid)}</CardRow>
            <CardRow label="Balance">{balanceCell(r)}</CardRow>
            <CardRow label="Funded">{formatPct(r.fundedPct, 0)}</CardRow>
          </>
        )}
      />
    </div>
  )
}
