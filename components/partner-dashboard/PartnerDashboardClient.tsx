'use client'

import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs, type TabDef } from '@/components/ui/Tabs'
import { useApp } from '@/components/app/AppProvider'
import { computeTotals, contributedBy, yearsAvailable, type DashboardData } from '@/components/partner-dashboard/calc'
import { SharePctModal } from '@/components/partner-dashboard/shared'
import { FinancialTab } from '@/components/partner-dashboard/FinancialTab'
import { FundingTab } from '@/components/partner-dashboard/FundingTab'
import { ShareholdingTab } from '@/components/partner-dashboard/ShareholdingTab'
import { BudgetTab } from '@/components/partner-dashboard/BudgetTab'
import { KpiTab } from '@/components/partner-dashboard/KpiTab'
import { CostTab } from '@/components/partner-dashboard/CostTab'
import { ForecastTab } from '@/components/partner-dashboard/ForecastTab'
import { PartnersTab } from '@/components/partner-dashboard/PartnersTab'
import type { Partner } from '@/lib/types'

type TabKey = 'financial' | 'funding' | 'shareholding' | 'budget' | 'kpis' | 'costs' | 'forecast' | 'partners'

const TABS: TabDef<TabKey>[] = [
  { key: 'financial', label: 'Financial overview' },
  { key: 'funding', label: 'Funding & investment' },
  { key: 'shareholding', label: 'Shareholding' },
  { key: 'budget', label: 'Budget vs actual' },
  { key: 'kpis', label: 'Business KPIs' },
  { key: 'costs', label: 'Cost structure' },
  { key: 'forecast', label: 'Forecast' },
  { key: 'partners', label: 'Partners' },
]

export function PartnerDashboardClient({ data }: { data: DashboardData }) {
  const { today, can, rooms, property } = useApp()
  const [tab, setTab] = useState<TabKey>('financial')
  const currentYear = Number(today.slice(0, 4))
  const [year, setYear] = useState(currentYear)
  const [editPct, setEditPct] = useState<Partner | null>(null)

  const totals = useMemo(() => computeTotals(data), [data])
  const years = useMemo(() => yearsAvailable(data, currentYear), [data, currentYear])
  const totalRooms = rooms.filter((r) => r.active).length

  // Active partners, plus inactive ones that still hold paid-in capital.
  const partners = useMemo(() => data.partners.filter((p) => p.active || contributedBy(p, data.contributions) > 0), [data.partners, data.contributions])

  const canEditPct = can('shareholder_profiles', 'edit')
  const onEditPct = canEditPct ? (p: Partner) => setEditPct(p) : undefined

  return (
    <div>
      <PageHeader title="Partner dashboard" subtitle={`${property.name} · ${partners.length} partner${partners.length === 1 ? '' : 's'} · as of ${today}`} />

      <Tabs tabs={TABS} value={tab} onChange={setTab} className="mb-5" />

      {tab === 'financial' && <FinancialTab data={data} totals={totals} year={year} years={years} onYear={setYear} />}
      {tab === 'funding' && <FundingTab data={data} totals={totals} partners={partners} />}
      {tab === 'shareholding' && <ShareholdingTab data={data} totals={totals} partners={partners} onEdit={onEditPct} />}
      {tab === 'budget' && <BudgetTab data={data} year={year} years={years} onYear={setYear} />}
      {tab === 'kpis' && <KpiTab guests={data.guests} totalRooms={totalRooms} />}
      {tab === 'costs' && <CostTab expenses={data.expenses} />}
      {tab === 'forecast' && <ForecastTab data={data} totals={totals} />}
      {tab === 'partners' && <PartnersTab data={data} partners={partners} onEdit={onEditPct} />}

      <SharePctModal partner={editPct} onClose={() => setEditPct(null)} />
    </div>
  )
}
