'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Plus, Rows3, DoorOpen } from 'lucide-react'
import { Section } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { MoneyField, SelectField, TextField, TextareaField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { formatPct } from '@/lib/format'
import { saveRoomSetupAction, deleteRoomSetupAction, createSetupRowsForAllRoomsAction } from '@/app/(app)/app/budget/actions'
import type { BudgetRoomSetup } from '@/lib/types'

interface SetupRow {
  room_name: string
  setup: BudgetRoomSetup | null
  /** True when the row's room_name does not match an active room. */
  orphan: boolean
}

export function SetupTab({ year, rows, roomNames }: { year: number; rows: BudgetRoomSetup[]; roomNames: string[] }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can, fmt } = useApp()
  const [editing, setEditing] = useState<Partial<BudgetRoomSetup> | null>(null)
  const [creating, setCreating] = useState(false)

  const list = useMemo<SetupRow[]>(() => {
    const byRoom = new Map(rows.map((r) => [r.room_name, r]))
    const matched = roomNames.map((name) => ({ room_name: name, setup: byRoom.get(name) ?? null, orphan: false }))
    const names = new Set(roomNames)
    const orphans = rows.filter((r) => !names.has(r.room_name)).map((r) => ({ room_name: r.room_name, setup: r, orphan: true }))
    return [...matched, ...orphans]
  }, [rows, roomNames])

  const missing = list.filter((r) => !r.orphan && !r.setup).length

  const createAll = async () => {
    setCreating(true)
    const res = await createSetupRowsForAllRoomsAction(year)
    setCreating(false)
    if (!res.ok) return toast.error(res.error)
    toast.success(res.data.created === 0 ? 'Every room already has a row' : `Created ${res.data.created} row${res.data.created === 1 ? '' : 's'}`)
    router.refresh()
  }

  const remove = async (s: BudgetRoomSetup) => {
    if (!(await confirm({ title: `Delete setup for ${s.room_name}?`, confirmLabel: 'Delete', danger: true }))) return
    const res = await deleteRoomSetupAction(s.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Deleted')
    router.refresh()
  }

  const columns: Column<SetupRow>[] = [
    {
      key: 'room',
      header: 'Room',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{r.room_name}</span>
          {r.orphan && <Badge tone="warning">Not an active room</Badge>}
          {!r.setup && <Badge>Not set</Badge>}
        </div>
      ),
      sortValue: (r) => r.room_name,
    },
    { key: 'high', header: 'High season', cell: (r) => (r.setup?.high_season_rate_thb != null ? fmt(r.setup.high_season_rate_thb) : '—'), sortValue: (r) => r.setup?.high_season_rate_thb ?? 0, align: 'right' },
    { key: 'low', header: 'Low season', cell: (r) => (r.setup?.low_season_rate_thb != null ? fmt(r.setup.low_season_rate_thb) : '—'), sortValue: (r) => r.setup?.low_season_rate_thb ?? 0, align: 'right' },
    { key: 'occ', header: 'Target occ.', cell: (r) => formatPct(r.setup?.target_occupancy_pct ?? null, 0), sortValue: (r) => r.setup?.target_occupancy_pct ?? 0, align: 'right' },
    { key: 'notes', header: 'Notes', cell: (r) => <span className="line-clamp-1 text-muted">{r.setup?.notes ?? ''}</span>, hide: 'lg' },
  ]

  const actions = (r: SetupRow) => (
    <>
      {r.setup
        ? can('budget', 'edit') && (
            <button className="icon-btn !h-8 !w-8" title="Edit" onClick={() => setEditing(r.setup)}>
              <Pencil className="h-4 w-4" />
            </button>
          )
        : can('budget', 'add') && (
            <button className="icon-btn !h-8 !w-8" title="Set up" onClick={() => setEditing({ year, room_name: r.room_name })}>
              <Plus className="h-4 w-4" />
            </button>
          )}
      {r.setup && can('budget', 'delete') && (
        <button className="icon-btn !h-8 !w-8 text-danger" title="Delete" onClick={() => remove(r.setup!)}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </>
  )

  if (roomNames.length === 0 && rows.length === 0) {
    return <EmptyState icon={DoorOpen} title="No active rooms" description="Add rooms to this property first; the budget is planned per room." />
  }

  return (
    <Section
      title={`Room setup ${year}`}
      description="Reference rates and target occupancy per room. These figures are for planning only; they do not feed the matrix."
      actions={
        can('budget', 'add') && (
          <button className="btn-secondary btn-sm" onClick={createAll} disabled={creating || missing === 0} title={missing === 0 ? 'Every active room already has a row' : undefined}>
            {creating ? <Spinner size="sm" /> : <Rows3 className="h-4 w-4" />} Create rows for all rooms{missing > 0 ? ` (${missing})` : ''}
          </button>
        )
      }
    >
      <DataTable
        rows={list}
        columns={columns}
        rowKey={(r) => `${r.room_name}|${r.setup?.id ?? 'new'}`}
        pageSize={0}
        actions={actions}
        exportName={`budget-setup-${year}`}
        exportRow={(r) => ({
          Year: year,
          Room: r.room_name,
          'High season rate': r.setup?.high_season_rate_thb ?? '',
          'Low season rate': r.setup?.low_season_rate_thb ?? '',
          'Target occupancy %': r.setup?.target_occupancy_pct ?? '',
          Notes: r.setup?.notes ?? '',
        })}
        renderCard={(r) => (
          <>
            <CardTitle title={r.room_name} right={r.orphan ? <Badge tone="warning">Not an active room</Badge> : !r.setup ? <Badge>Not set</Badge> : undefined} />
            <CardRow label="High season">{r.setup?.high_season_rate_thb != null ? fmt(r.setup.high_season_rate_thb) : '—'}</CardRow>
            <CardRow label="Low season">{r.setup?.low_season_rate_thb != null ? fmt(r.setup.low_season_rate_thb) : '—'}</CardRow>
            <CardRow label="Target occ.">{formatPct(r.setup?.target_occupancy_pct ?? null, 0)}</CardRow>
            {r.setup?.notes && <CardRow label="Notes">{r.setup.notes}</CardRow>}
          </>
        )}
      />
      <SetupModal setup={editing} year={year} roomNames={roomNames} onClose={() => setEditing(null)} />
    </Section>
  )
}

function SetupModal({ setup, year, roomNames, onClose }: { setup: Partial<BudgetRoomSetup> | null; year: number; roomNames: string[]; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { baseCurrency } = useApp()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ room_name: '', high: '', low: '', occ: '', notes: '' })
  const [key, setKey] = useState<string | null>(null)
  const k = setup ? `${setup.id ?? 'new'}|${setup.room_name ?? ''}` : null
  if (k !== key) {
    setKey(k)
    setForm({
      room_name: setup?.room_name ?? roomNames[0] ?? '',
      high: setup?.high_season_rate_thb != null ? String(setup.high_season_rate_thb) : '',
      low: setup?.low_season_rate_thb != null ? String(setup.low_season_rate_thb) : '',
      occ: setup?.target_occupancy_pct != null ? String(setup.target_occupancy_pct) : '',
      notes: setup?.notes ?? '',
    })
    setError(null)
    setErrors({})
  }
  const options = form.room_name && !roomNames.includes(form.room_name) ? [form.room_name, ...roomNames] : roomNames

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const res = await saveRoomSetupAction({ id: setup?.id, year: setup?.year ?? year, room_name: form.room_name, high_season_rate_thb: form.high, low_season_rate_thb: form.low, target_occupancy_pct: form.occ, notes: form.notes })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success('Saved')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!setup}
      onClose={onClose}
      title={setup?.id ? `Edit ${setup.room_name}` : 'Room setup'}
      subtitle={`Budget year ${setup?.year ?? year}`}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" form="setup-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Save'}
          </button>
        </div>
      }
    >
      <form id="setup-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <SelectField label="Room" required value={form.room_name} onChange={(e) => setForm({ ...form, room_name: e.target.value })} options={options} error={errors.room_name} containerClassName="sm:col-span-2" disabled={!!setup?.id} />
          <MoneyField label="High season rate" currency={baseCurrency} value={form.high} onChange={(e) => setForm({ ...form, high: e.target.value })} error={errors.high_season_rate_thb} placeholder="per night" />
          <MoneyField label="Low season rate" currency={baseCurrency} value={form.low} onChange={(e) => setForm({ ...form, low: e.target.value })} error={errors.low_season_rate_thb} placeholder="per night" />
          <TextField label="Target occupancy %" type="number" inputMode="decimal" min={0} max={100} step="0.1" value={form.occ} onChange={(e) => setForm({ ...form, occ: e.target.value })} error={errors.target_occupancy_pct} />
          <TextareaField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} containerClassName="sm:col-span-2" rows={2} />
        </FormGrid>
      </form>
    </Modal>
  )
}
