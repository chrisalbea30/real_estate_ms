'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Clock, Wallet, CalendarDays, Users } from 'lucide-react'
import { PageHeader, Section } from '@/components/ui/PageHeader'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ExportMenu } from '@/components/ui/ExportMenu'
import { Modal } from '@/components/ui/Modal'
import { TextField, SelectField, MoneyField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { formatMonth, formatNumber, formatMoney, ymOf } from '@/lib/format'
import { matchesPartner } from '@/lib/schemas/partners'
import { saveWorkAction, deleteWorkAction } from '@/app/(app)/app/partner-work/actions'
import type { PartnerWork, Partner } from '@/lib/types'

export type WorkPartner = Pick<Partner, 'id' | 'name' | 'hour_rate' | 'active'>

export function PartnerWorkClient({ rows, partners }: { rows: PartnerWork[]; partners: WorkPartner[] }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can, fmt, settings } = useApp()
  const [editing, setEditing] = useState<Partial<PartnerWork> | null>(null)
  const [partnerFilter, setPartnerFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')

  const defaultRate = Number(settings.partner_hour_rate ?? 0)
  const partnerOf = (r: PartnerWork) => partners.find((p) => matchesPartner(r, p))
  const rateOf = (r: PartnerWork) => Number(r.hour_rate ?? partnerOf(r)?.hour_rate ?? defaultRate)
  const valueOf = (r: PartnerWork) => Number(r.hours ?? 0) * rateOf(r)
  const partnerKey = (r: PartnerWork) => partnerOf(r)?.id ?? `name:${r.shareholder.trim().toLowerCase()}`

  const years = useMemo(() => Array.from(new Set(rows.map((r) => r.month.slice(0, 4)))).sort().reverse(), [rows])

  const filtered = useMemo(
    () => rows.filter((r) => (!partnerFilter || partnerKey(r) === partnerFilter) && (!yearFilter || r.month.startsWith(yearFilter))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, partnerFilter, yearFilter, partners],
  )

  const totals = useMemo(() => {
    const hours = filtered.reduce((s, r) => s + Number(r.hours ?? 0), 0)
    const value = filtered.reduce((s, r) => s + valueOf(r), 0)
    const months = new Set(filtered.map((r) => ymOf(r.month))).size
    return { hours, value, months }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, partners, defaultRate])

  // Per-partner cards: profiles first, then legacy names without a profile.
  const cards = useMemo(() => {
    const map = new Map<string, { key: string; name: string; active: boolean; hours: number; value: number }>()
    for (const p of partners) map.set(p.id, { key: p.id, name: p.name, active: p.active, hours: 0, value: 0 })
    for (const r of filtered) {
      const k = partnerKey(r)
      const c = map.get(k) ?? { key: k, name: r.shareholder, active: false, hours: 0, value: 0 }
      c.hours += Number(r.hours ?? 0)
      c.value += valueOf(r)
      map.set(k, c)
    }
    return Array.from(map.values()).filter((c) => c.hours > 0 || c.active)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, partners, defaultRate])

  const groups = useMemo(() => {
    const byMonth = new Map<string, PartnerWork[]>()
    for (const r of filtered) {
      const k = ymOf(r.month)
      ;(byMonth.get(k) ?? byMonth.set(k, []).get(k)!).push(r)
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([ym, list]) => ({ ym, list, hours: list.reduce((s, r) => s + Number(r.hours ?? 0), 0), value: list.reduce((s, r) => s + valueOf(r), 0) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, partners, defaultRate])

  const remove = async (r: PartnerWork) => {
    const ok = await confirm({ title: `Delete ${formatNumber(r.hours, 1)} h of ${r.shareholder}?`, message: formatMonth(r.month), confirmLabel: 'Delete', danger: true })
    if (!ok) return
    const res = await deleteWorkAction(r.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Work record deleted')
    router.refresh()
  }

  const partnerOptions = Array.from(new Map(cards.map((c) => [c.key, c.name])).entries())

  return (
    <div>
      <PageHeader
        title="Partner work"
        subtitle={`${rows.length} record${rows.length === 1 ? '' : 's'} · default rate ${fmt(defaultRate)} / h`}
        actions={
          can('shareholder_work', 'add') && (
            <button className="btn-primary" onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" /> Add hours
            </button>
          )
        }
      />

      <StatGrid className="mb-5">
        <StatCard label="Total value" value={fmt(totals.value)} icon={Wallet} tone="primary" />
        <StatCard label="Total hours" value={formatNumber(totals.hours, 1)} icon={Clock} />
        <StatCard label="Months" value={totals.months} icon={CalendarDays} className="hidden lg:flex" />
        <StatCard label="Partners" value={cards.filter((c) => c.hours > 0).length} icon={Users} className="hidden lg:flex" />
      </StatGrid>

      {cards.length > 0 && (
        <Section title="By partner">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.key} className="card min-w-0 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate text-sm font-semibold text-ink">{c.name}</div>
                  {!c.active && <Badge>Inactive</Badge>}
                </div>
                <div className="mt-1 font-display text-xl font-semibold tabular text-ink">{fmt(c.value)}</div>
                <div className="mt-1 text-xs text-muted tabular">{formatNumber(c.hours, 1)} hours</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <select className="select sm:w-auto" value={partnerFilter} onChange={(e) => setPartnerFilter(e.target.value)} aria-label="Partner">
          <option value="">All partners</option>
          {partnerOptions.map(([k, name]) => (
            <option key={k} value={k}>
              {name}
            </option>
          ))}
        </select>
        <select className="select sm:w-auto" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} aria-label="Year">
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <div className="sm:ml-auto">
          <ExportMenu rows={filtered.map((r) => ({ Month: ymOf(r.month), Partner: r.shareholder, Hours: r.hours ?? 0, Rate: rateOf(r), Total: valueOf(r) }))} filename="partner-work" />
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={Clock} title="No hours recorded" description="Record the hours partners work for the company each month. Value = hours × rate." action={can('shareholder_work', 'add') && <button className="btn-primary" onClick={() => setEditing({})}>Add hours</button>} />
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.ym} className="card overflow-hidden">
              <div className="flex items-center justify-between gap-3 bg-surface-2 px-4 py-2 text-sm">
                <span className="font-semibold text-ink">{formatMonth(g.ym)}</span>
                <span className="text-muted tabular">
                  {formatNumber(g.hours, 1)} h · <strong className="text-ink">{fmt(g.value)}</strong>
                </span>
              </div>
              <ul className="divide-y divide-line">
                {g.list.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-ink">{r.shareholder}</div>
                      <div className="text-xs text-muted tabular">
                        {formatNumber(r.hours, 1)} h × {fmt(rateOf(r))}
                      </div>
                    </div>
                    <span className="font-semibold tabular">{fmt(valueOf(r))}</span>
                    {can('shareholder_work', 'edit') && (
                      <button className="icon-btn !h-8 !w-8" onClick={() => setEditing(r)} aria-label="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {can('shareholder_work', 'delete') && (
                      <button className="icon-btn !h-8 !w-8 text-danger" onClick={() => remove(r)} aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <WorkModal record={editing} partners={partners} onClose={() => setEditing(null)} />
    </div>
  )
}

function WorkModal({ record, partners, onClose }: { record: Partial<PartnerWork> | null; partners: WorkPartner[]; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { today, baseCurrency, settings } = useApp()
  const defaultRate = settings.partner_hour_rate == null ? '' : String(settings.partner_hour_rate)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ month: today.slice(0, 7), shareholder_id: '', hours: '', hour_rate: defaultRate })
  const [rateTouched, setRateTouched] = useState(false)
  const [key, setKey] = useState<string | null>(null)

  const rateFor = (partnerId: string) => {
    const p = partners.find((x) => x.id === partnerId)
    return p?.hour_rate == null ? defaultRate : String(p.hour_rate)
  }

  const k = record ? record.id ?? 'new' : null
  if (k !== key) {
    setKey(k)
    if (record) {
      const byName = record.shareholder_id ? null : partners.find((p) => p.name.trim().toLowerCase() === (record.shareholder ?? '').trim().toLowerCase())
      const pid = record.shareholder_id ?? byName?.id ?? ''
      setForm({
        month: record.month ? ymOf(record.month) : today.slice(0, 7),
        shareholder_id: pid,
        hours: record.hours == null ? '' : String(record.hours),
        hour_rate: record.hour_rate == null ? rateFor(pid) : String(record.hour_rate),
      })
      setRateTouched(record.hour_rate != null)
    }
    setError(null)
    setErrors({})
  }

  const options = partners.filter((p) => p.active || p.id === form.shareholder_id).map((p) => ({ value: p.id, label: p.name }))
  const value = Number(form.hours || 0) * Number(form.hour_rate || 0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveWorkAction({ id: record?.id, ...form })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(record?.id ? 'Work record updated' : 'Hours added')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!record}
      onClose={onClose}
      title={record?.id ? 'Edit work record' : 'Add hours'}
      size="sm"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-muted">Value </span>
            <span className="font-semibold tabular">{formatMoney(value, baseCurrency)}</span>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="btn-primary" form="work-form" disabled={busy}>
              {busy ? <Spinner size="sm" /> : 'Save'}
            </button>
          </div>
        </div>
      }
    >
      <form id="work-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Month" type="month" required value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} error={errors.month} />
          <SelectField
            label="Partner"
            required
            value={form.shareholder_id}
            onChange={(e) => {
              const pid = e.target.value
              setForm((f) => ({ ...f, shareholder_id: pid, hour_rate: rateTouched ? f.hour_rate : rateFor(pid) }))
            }}
            options={options}
            placeholder="Choose a partner"
            error={errors.shareholder_id}
          />
          <TextField label="Hours" type="number" inputMode="decimal" step="0.25" min={0} required value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} error={errors.hours} />
          <MoneyField
            label="Rate per hour"
            currency={baseCurrency}
            value={form.hour_rate}
            onChange={(e) => {
              setRateTouched(true)
              setForm({ ...form, hour_rate: e.target.value })
            }}
            error={errors.hour_rate}
            hint={rateTouched ? undefined : "Partner's rate, else the organisation default"}
          />
        </FormGrid>
      </form>
    </Modal>
  )
}
