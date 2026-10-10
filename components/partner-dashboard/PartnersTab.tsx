'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Pencil, Users, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { useApp } from '@/components/app/AppProvider'
import { fileHref } from '@/lib/storage'
import { formatDate, formatPct } from '@/lib/format'
import { partnerFunding, sum, type DashboardData } from '@/components/partner-dashboard/calc'
import { Meter } from '@/components/partner-dashboard/shared'
import type { Partner } from '@/lib/types'

export function PartnersTab({ data, partners, onEdit }: { data: DashboardData; partners: Partner[]; onEdit?: (p: Partner) => void }) {
  const { fmt, can } = useApp()
  const funding = useMemo(() => partnerFunding(partners, data.contributions), [partners, data.contributions])
  const allocated = sum(funding, (f) => f.pct)
  const allocatedOk = Math.abs(allocated - 100) <= 0.01

  if (funding.length === 0) {
    return <EmptyState icon={Users} title="No partners yet" description="Partner profiles appear here with their ownership and paid-in capital." action={can('shareholder_profiles', 'add') && <Link href="/app/partners" className="btn-primary">Add partners</Link>} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {funding.length} partner{funding.length === 1 ? '' : 's'} · <span className={allocatedOk ? 'text-success' : 'text-warning'}>{formatPct(allocated, 2)} allocated</span>
        </p>
        {can('shareholder_profiles', 'view') && (
          <Link href="/app/partners" className="btn-secondary btn-sm">
            Manage partners <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {funding.map((f) => (
          <div key={f.partner.id} className="card p-4">
            <div className="flex items-start gap-3">
              <Avatar name={f.partner.name} src={fileHref(f.partner.photo_url)} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink">{f.partner.name}</div>
                <div className="truncate text-xs text-muted">{f.partner.role ?? '—'}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <Badge tone="primary">{formatPct(f.pct, 2)} ownership</Badge>
                  {!f.partner.active && <Badge>Inactive</Badge>}
                  {onEdit && (
                    <button className="icon-btn !h-7 !w-7" title="Edit ownership %" onClick={() => onEdit(f.partner)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            {f.partner.bio && <p className="mt-3 line-clamp-3 text-sm text-ink-2">{f.partner.bio}</p>}
            <div className="mt-3 flex items-baseline justify-between text-sm">
              <span className="text-muted">Contributed</span>
              <span className="tabular">
                <strong className="text-ink">{fmt(f.contributed)}</strong>
                {f.agreed > 0 && <span className="text-muted"> / {fmt(f.agreed)}</span>}
              </span>
            </div>
            <Meter value={f.progress ?? 0} max={100} tone={f.progress != null && f.progress >= 100 ? 'success' : 'primary'} className="mt-1.5" />
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>{f.progress == null ? 'No agreed capital set' : `${formatPct(f.progress, 0)} of agreed`}</span>
              {f.partner.joined_date && <span>Joined {formatDate(f.partner.joined_date)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
