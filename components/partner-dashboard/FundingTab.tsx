'use client'

import { useMemo } from 'react'
import { Landmark, Users, Target, PiggyBank } from 'lucide-react'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { useApp } from '@/components/app/AppProvider'
import { fileHref } from '@/lib/storage'
import { formatPct } from '@/lib/format'
import { partnerFunding, sum, type DashboardData, type Totals } from '@/components/partner-dashboard/calc'
import { Meter } from '@/components/partner-dashboard/shared'
import type { Partner } from '@/lib/types'

export function FundingTab({ data, totals, partners }: { data: DashboardData; totals: Totals; partners: Partner[] }) {
  const { fmt } = useApp()
  const funding = useMemo(() => partnerFunding(partners, data.contributions), [partners, data.contributions])
  const agreedTotal = sum(funding, (f) => f.agreed)
  const assigned = sum(funding, (f) => f.contributed)
  const unassigned = totals.capital - assigned
  const fundedPct = agreedTotal > 0 ? (totals.capital / agreedTotal) * 100 : null

  return (
    <div className="space-y-6">
      <StatGrid>
        <StatCard label="Total capital" sub={`${data.contributions.length} contribution${data.contributions.length === 1 ? '' : 's'}`} value={fmt(totals.capital)} icon={Landmark} tone="primary" />
        <StatCard label="Partners" value={partners.length} icon={Users} />
        <StatCard label="Agreed capital" sub="sum of commitments" value={fmt(agreedTotal)} icon={Target} />
        <StatCard label="Funded" sub="of agreed capital" value={formatPct(fundedPct, 0)} icon={PiggyBank} tone={fundedPct != null && fundedPct >= 100 ? 'success' : 'warning'} />
      </StatGrid>

      {funding.length === 0 ? (
        <div className="card p-4 text-sm text-muted">No partners yet. Add partners to track who has contributed what.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {funding.map((f) => (
            <div key={f.partner.id} className="card p-4">
              <div className="flex items-start gap-3">
                <Avatar name={f.partner.name} src={fileHref(f.partner.photo_url)} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">{f.partner.name}</div>
                  <div className="truncate text-xs text-muted">{f.partner.role ?? '—'}</div>
                </div>
                <Badge tone="primary">{formatPct(f.pct, 2)}</Badge>
              </div>
              <div className="mt-3 flex items-baseline justify-between text-sm">
                <span className="text-muted">Contributed</span>
                <span className="tabular">
                  <strong className="text-ink">{fmt(f.contributed)}</strong>
                  {f.agreed > 0 && <span className="text-muted"> / {fmt(f.agreed)}</span>}
                </span>
              </div>
              <Meter value={f.progress ?? 0} max={100} tone={f.progress != null && f.progress >= 100 ? 'success' : 'primary'} className="mt-1.5" />
              <div className="mt-1 text-xs text-muted">{f.progress == null ? 'No agreed capital set' : `${formatPct(f.progress, 0)} of agreed`}</div>
            </div>
          ))}
        </div>
      )}

      {unassigned > 0.005 && (
        <p className="text-sm text-muted">
          {fmt(unassigned)} of the capital is recorded under names that do not match a partner profile. Link those contributions to a partner on the Capital page.
        </p>
      )}
    </div>
  )
}
