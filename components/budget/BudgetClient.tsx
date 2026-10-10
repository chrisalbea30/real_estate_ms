'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { useApp } from '@/components/app/AppProvider'
import { SetupTab } from '@/components/budget/SetupTab'
import { RevenueMatrix } from '@/components/budget/RevenueMatrix'
import { ExpenseItems } from '@/components/budget/ExpenseItems'
import { RentSchedule } from '@/components/budget/RentSchedule'
import { ControlTab } from '@/components/budget/ControlTab'
import type { ActualRevenueRow, ActualExpenseRow } from '@/components/budget/calc'
import type { BudgetRevenue, BudgetExpense, BudgetRent, BudgetRoomSetup } from '@/lib/types'

type TabKey = 'setup' | 'input' | 'control'

export interface BudgetClientProps {
  year: number
  currentYear: number
  years: number[]
  budgetRevenue: BudgetRevenue[]
  budgetExpenses: BudgetExpense[]
  budgetRent: BudgetRent[]
  roomSetup: BudgetRoomSetup[]
  revenue: ActualRevenueRow[]
  expenses: ActualExpenseRow[]
  actualsCapped: boolean
}

export function BudgetClient({ year, currentYear, years, budgetRevenue, budgetExpenses, budgetRent, roomSetup, revenue, expenses, actualsCapped }: BudgetClientProps) {
  const router = useRouter()
  const { rooms, property } = useApp()
  const [tab, setTab] = useState<TabKey>('input')

  const roomNames = useMemo(() => rooms.filter((r) => r.active).map((r) => r.name), [rooms])
  const setupCount = useMemo(() => roomSetup.filter((s) => roomNames.includes(s.room_name)).length, [roomSetup, roomNames])

  const changeYear = (y: number) => {
    router.push(y === currentYear ? '/app/budget' : `/app/budget?year=${y}`)
  }

  return (
    <div>
      <PageHeader
        title="Budget"
        subtitle={`${property.name} · ${year}${year === currentYear ? ' (current year)' : ''}`}
        actions={
          <label className="flex items-center gap-2 text-sm text-muted">
            Year
            <select className="select w-auto" value={year} onChange={(e) => changeYear(Number(e.target.value))} aria-label="Budget year">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <Tabs<TabKey>
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'setup', label: 'Setup', badge: roomNames.length > 0 ? `${setupCount}/${roomNames.length}` : undefined },
          { key: 'input', label: 'Input', badge: budgetRevenue.length + budgetExpenses.length || undefined },
          { key: 'control', label: 'Control' },
        ]}
      />

      {tab === 'setup' && <SetupTab year={year} rows={roomSetup} roomNames={roomNames} />}
      {tab === 'input' && (
        <div>
          <RevenueMatrix year={year} rows={budgetRevenue} roomNames={roomNames} />
          <ExpenseItems year={year} rows={budgetExpenses} />
          <RentSchedule rows={budgetRent} />
        </div>
      )}
      {tab === 'control' && (
        <ControlTab year={year} budgetRevenue={budgetRevenue} budgetExpenses={budgetExpenses} revenue={revenue} expenses={expenses} roomNames={roomNames} actualsCapped={actualsCapped} />
      )}
    </div>
  )
}
