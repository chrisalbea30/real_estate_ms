'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DoorOpen, AlertTriangle } from 'lucide-react'
import { Section } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ExportMenu } from '@/components/ui/ExportMenu'
import { MoneyField, TextField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { cn, MONTHS, MONTHS_LONG } from '@/lib/format'
import { setRevenueCellAction, clearRevenueCellAction } from '@/app/(app)/app/budget/actions'
import { buildRevenueMatrix, cellKey, type RevenueCell } from '@/components/budget/calc'
import { MatrixTable, MonthHeadRow, MatrixCell, TotalsRow, TD, TD_LABEL, STICKY } from '@/components/budget/Matrix'
import type { BudgetRevenue } from '@/lib/types'

export function RevenueMatrix({ year, rows, roomNames }: { year: number; rows: BudgetRevenue[]; roomNames: string[] }) {
  const { can, fmt } = useApp()
  const [cell, setCell] = useState<RevenueCell | null>(null)
  const data = useMemo(() => buildRevenueMatrix(rows, roomNames), [rows, roomNames])
  const editable = can('budget', 'edit') || can('budget', 'add')

  const unmatchedNames = useMemo(() => [...new Set(data.unmatched.map((r) => r.room_name))].sort(), [data.unmatched])

  const exportRows = useMemo(
    () =>
      roomNames.map((room) => {
        const row: Record<string, string | number> = { Room: room }
        MONTHS.forEach((m, i) => (row[m] = data.cells.get(cellKey(room, i + 1))?.total ?? 0))
        row.Total = data.rowTotals.get(room) ?? 0
        return row
      }),
    [roomNames, data],
  )

  const open = (room: string, month: number) => {
    const existing = data.cells.get(cellKey(room, month))
    setCell(existing ?? { room, month, total: 0, entries: [] })
  }

  return (
    <Section
      title="Revenue matrix"
      description={`Planned revenue per room and month for ${year}. Tap a cell to set it.`}
      actions={roomNames.length > 0 && <ExportMenu rows={exportRows} filename={`budget-revenue-${year}`} title={`Budget revenue ${year}`} />}
    >
      {unmatchedNames.length > 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {data.unmatched.length} budget revenue row{data.unmatched.length === 1 ? '' : 's'} for {year} {data.unmatched.length === 1 ? 'does' : 'do'} not match an active room and {data.unmatched.length === 1 ? 'is' : 'are'} not counted: {unmatchedNames.join(', ')}.
          </span>
        </div>
      )}
      {roomNames.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No active rooms"
          description="The matrix has one row per active room of this property."
          action={
            <Link href="/app/rooms" className="btn-secondary btn-sm">
              Manage rooms
            </Link>
          }
        />
      ) : (
        <MatrixTable>
          <MonthHeadRow first="Room" />
          <tbody>
            {roomNames.map((room) => (
              <tr key={room}>
                <td className={cn(TD_LABEL, STICKY, 'font-medium')}>{room}</td>
                {MONTHS.map((_, i) => {
                  const c = data.cells.get(cellKey(room, i + 1))
                  return (
                    <td key={i} className={TD}>
                      <MatrixCell
                        value={c ? fmt(c.total) : '—'}
                        filled={!!c}
                        onClick={editable ? () => open(room, i + 1) : undefined}
                        title={c && c.entries.length > 1 ? `${c.entries.length} entries` : undefined}
                        className={c && c.entries.length > 1 ? 'underline decoration-dotted underline-offset-4' : undefined}
                      />
                    </td>
                  )
                })}
                <td className={cn(TD, 'px-3 font-semibold')}>{fmt(data.rowTotals.get(room) ?? 0)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <TotalsRow label="Total" months={data.colTotals} total={data.grand} format={fmt} />
          </tfoot>
        </MatrixTable>
      )}
      <RevenueCellModal year={year} cell={cell} onClose={() => setCell(null)} />
    </Section>
  )
}

function RevenueCellModal({ year, cell, onClose }: { year: number; cell: RevenueCell | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can, fmt, baseCurrency } = useApp()
  const [busy, setBusy] = useState<'save' | 'clear' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ amount: '', season: '' })
  const [key, setKey] = useState<string | null>(null)
  const k = cell ? `${cell.room}|${cell.month}|${cell.entries.map((e) => e.id).join(',')}` : null
  if (k !== key) {
    setKey(k)
    const first = cell?.entries[0]
    setForm({ amount: first?.amount_thb != null ? String(first.amount_thb) : '', season: first?.season ?? '' })
    setError(null)
    setErrors({})
  }
  const first = cell?.entries[0]
  const multiple = (cell?.entries.length ?? 0) > 1

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cell) return
    setBusy('save')
    const res = await setRevenueCellAction({ year, month: cell.month, room_name: cell.room, amount_thb: form.amount, season: form.season })
    setBusy(null)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success('Saved')
    onClose()
    router.refresh()
  }

  const clear = async () => {
    if (!cell) return
    const ok = await confirm({
      title: `Clear ${cell.room} · ${MONTHS[cell.month - 1]} ${year}?`,
      message: multiple ? `All ${cell.entries.length} entries in this cell are deleted.` : 'The entry is deleted.',
      confirmLabel: 'Clear',
      danger: true,
    })
    if (!ok) return
    setBusy('clear')
    const res = await clearRevenueCellAction({ year, month: cell.month, room_name: cell.room })
    setBusy(null)
    if (!res.ok) return toast.error(res.error)
    toast.success('Cell cleared')
    onClose()
    router.refresh()
  }

  const canSave = first ? can('budget', 'edit') : can('budget', 'add')

  return (
    <Modal
      open={!!cell}
      onClose={onClose}
      title={cell ? `${cell.room} · ${MONTHS_LONG[cell.month - 1]} ${year}` : ''}
      subtitle="Budget revenue"
      size="sm"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {first && can('budget', 'delete') && (
              <button className="btn-ghost text-danger" type="button" onClick={clear} disabled={busy !== null}>
                {busy === 'clear' ? <Spinner size="sm" /> : 'Clear'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            {canSave && (
              <button className="btn-primary" form="rev-cell-form" disabled={busy !== null}>
                {busy === 'save' ? <Spinner size="sm" /> : 'Save'}
              </button>
            )}
          </div>
        </div>
      }
    >
      <form id="rev-cell-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          {multiple && cell && (
            <div className="rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-xs text-warning sm:col-span-2">
              This cell has {cell.entries.length} entries totalling {fmt(cell.total)}. Saving updates the first entry ({fmt(first?.amount_thb)}); Clear removes all of them.
            </div>
          )}
          <MoneyField label="Amount" currency={baseCurrency} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} error={errors.amount_thb} autoFocus containerClassName="sm:col-span-2" />
          <TextField label="Season" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} error={errors.season} placeholder="High / Low (optional)" list="budget-season-options" containerClassName="sm:col-span-2" />
          <datalist id="budget-season-options">
            <option value="High" />
            <option value="Low" />
            <option value="Shoulder" />
          </datalist>
        </FormGrid>
      </form>
    </Modal>
  )
}
