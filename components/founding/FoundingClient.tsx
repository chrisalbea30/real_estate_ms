'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Landmark, Users, Receipt } from 'lucide-react'
import { PageHeader, Section } from '@/components/ui/PageHeader'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { TextField, SelectField, TextareaField, MoneyField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { formatDate, formatMoney, formatPct } from '@/lib/format'
import { matchesPartner } from '@/lib/schemas/partners'
import { saveContributionAction, deleteContributionAction } from '@/app/(app)/app/founding/actions'
import type { FoundingContribution, Partner } from '@/lib/types'

export type PartnerLite = Pick<Partner, 'id' | 'name' | 'active' | 'share_percentage' | 'amount_to_found_thb'>

export function FoundingClient({ contributions, partners }: { contributions: FoundingContribution[]; partners: PartnerLite[] }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can, fmt } = useApp()
  const [editing, setEditing] = useState<Partial<FoundingContribution> | null>(null)

  const grandTotal = useMemo(() => contributions.reduce((s, c) => s + Number(c.amount_thb ?? 0), 0), [contributions])

  // One card per partner (profiles first, then legacy names without a profile).
  const cards = useMemo(() => {
    const used = new Set<FoundingContribution>()
    const rows = partners.map((p) => {
      const mine = contributions.filter((c) => matchesPartner(c, p))
      mine.forEach((c) => used.add(c))
      return { key: p.id, name: p.name, active: p.active, total: mine.reduce((s, c) => s + Number(c.amount_thb ?? 0), 0), count: mine.length, agreed: p.amount_to_found_thb }
    })
    const orphans = new Map<string, { total: number; count: number }>()
    for (const c of contributions) {
      if (used.has(c)) continue
      const k = c.shareholder.trim() || 'Unknown'
      const o = orphans.get(k) ?? { total: 0, count: 0 }
      o.total += Number(c.amount_thb ?? 0)
      o.count += 1
      orphans.set(k, o)
    }
    for (const [name, o] of orphans) rows.push({ key: `name:${name}`, name, active: false, total: o.total, count: o.count, agreed: null })
    return rows.filter((r) => r.count > 0 || r.active)
  }, [contributions, partners])

  const remove = async (c: FoundingContribution) => {
    const ok = await confirm({ title: `Delete contribution of ${formatMoney(c.amount_thb)}?`, message: `${c.shareholder} · ${formatDate(c.date)}`, confirmLabel: 'Delete', danger: true })
    if (!ok) return
    const res = await deleteContributionAction(c.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Contribution deleted')
    router.refresh()
  }

  const columns: Column<FoundingContribution>[] = [
    { key: 'date', header: 'Date', cell: (c) => formatDate(c.date), sortValue: (c) => c.date, width: '8rem' },
    { key: 'shareholder', header: 'Partner', cell: (c) => <span className="font-medium">{c.shareholder}</span>, sortValue: (c) => c.shareholder },
    { key: 'method', header: 'Method', cell: (c) => c.method ?? '—', sortValue: (c) => c.method ?? '', hide: 'lg' },
    { key: 'amount', header: 'Amount', cell: (c) => <span className="font-semibold">{fmt(c.amount_thb)}</span>, sortValue: (c) => c.amount_thb ?? 0, align: 'right' },
    { key: 'eur', header: 'EUR (as paid)', cell: (c) => (c.amount_eur == null ? '—' : formatMoney(c.amount_eur, 'EUR')), sortValue: (c) => c.amount_eur ?? 0, align: 'right', hide: 'xl' },
    { key: 'notes', header: 'Notes', cell: (c) => <span className="line-clamp-1 text-muted">{c.notes ?? ''}</span>, hide: 'xl' },
  ]

  const actions = (c: FoundingContribution) => (
    <>
      {can('founding', 'edit') && (
        <button className="icon-btn !h-8 !w-8" title="Edit" onClick={() => setEditing(c)}>
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {can('founding', 'delete') && (
        <button className="icon-btn !h-8 !w-8 text-danger" title="Delete" onClick={() => remove(c)}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </>
  )

  return (
    <div>
      <PageHeader
        title="Capital"
        subtitle={`${contributions.length} contribution${contributions.length === 1 ? '' : 's'} · ${fmt(grandTotal)} founded`}
        actions={
          can('founding', 'add') && (
            <button className="btn-primary" onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" /> Add contribution
            </button>
          )
        }
      />

      <StatGrid className="mb-5">
        <StatCard label="Total capital founded" value={fmt(grandTotal)} icon={Landmark} tone="primary" />
        <StatCard label="Partners" value={cards.filter((c) => c.count > 0).length} sub="with contributions" icon={Users} />
        <StatCard label="Contributions" value={contributions.length} icon={Receipt} className="hidden lg:flex" />
        <StatCard label="Latest" value={contributions[0] ? formatDate(contributions[0].date) : '—'} sub={contributions[0] ? `${contributions[0].shareholder} · ${fmt(contributions[0].amount_thb)}` : undefined} className="hidden lg:flex" />
      </StatGrid>

      {cards.length > 0 && (
        <Section title="By partner" description="Share = paid-in capital of the partner over all capital paid in">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((p) => {
              const share = grandTotal > 0 ? (p.total / grandTotal) * 100 : 0
              return (
                <div key={p.key} className="card min-w-0 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
                    {!p.active && <Badge>Inactive</Badge>}
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold tabular text-ink">{fmt(p.total)}</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, share)}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-muted">
                    <span>{formatPct(share, 1)} of capital</span>
                    <span>{p.count} payment{p.count === 1 ? '' : 's'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      <DataTable
        rows={contributions}
        columns={columns}
        rowKey={(c) => c.id}
        search={(c) => `${c.shareholder} ${c.method ?? ''} ${c.notes ?? ''}`}
        searchPlaceholder="Search partner, method, notes…"
        defaultSort={{ key: 'date', dir: 'desc' }}
        actions={actions}
        exportName="capital-contributions"
        exportRow={(c) => ({ Date: c.date, Partner: c.shareholder, Amount: c.amount_thb ?? 0, 'Amount EUR': c.amount_eur ?? '', Method: c.method ?? '', Notes: c.notes ?? '' })}
        footer={(rows) => (
          <div className="flex flex-wrap justify-between gap-2 tabular">
            <span className="text-muted">{rows.length} contributions</span>
            <span>
              Total <strong>{fmt(rows.reduce((s, c) => s + Number(c.amount_thb ?? 0), 0))}</strong>
            </span>
          </div>
        )}
        renderCard={(c) => (
          <>
            <CardTitle title={c.shareholder} subtitle={`${formatDate(c.date)}${c.method ? ` · ${c.method}` : ''}`} right={<span className="font-semibold tabular">{fmt(c.amount_thb)}</span>} />
            {c.amount_eur != null && <CardRow label="EUR (as paid)">{formatMoney(c.amount_eur, 'EUR')}</CardRow>}
            {c.notes && <div className="mt-1 text-xs text-muted">{c.notes}</div>}
          </>
        )}
      />

      <ContributionModal contribution={editing} partners={partners} onClose={() => setEditing(null)} />
    </div>
  )
}

function ContributionModal({ contribution, partners, onClose }: { contribution: Partial<FoundingContribution> | null; partners: PartnerLite[]; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { today, baseCurrency, paymentMethods } = useApp()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ date: today, shareholder_id: '', method: '', amount_thb: '', amount_eur: '', notes: '' })
  const [key, setKey] = useState<string | null>(null)

  const k = contribution ? contribution.id ?? 'new' : null
  if (k !== key) {
    setKey(k)
    if (contribution) {
      // Legacy rows carry only the name: pre-select the matching profile.
      const byName = contribution.shareholder_id ? null : partners.find((p) => p.name.trim().toLowerCase() === (contribution.shareholder ?? '').trim().toLowerCase())
      setForm({
        date: contribution.date ?? today,
        shareholder_id: contribution.shareholder_id ?? byName?.id ?? '',
        method: contribution.method ?? '',
        amount_thb: contribution.amount_thb == null ? '' : String(contribution.amount_thb),
        amount_eur: contribution.amount_eur == null ? '' : String(contribution.amount_eur),
        notes: contribution.notes ?? '',
      })
    }
    setError(null)
    setErrors({})
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const options = partners.filter((p) => p.active || p.id === form.shareholder_id).map((p) => ({ value: p.id, label: p.name }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveContributionAction({ id: contribution?.id, ...form })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(contribution?.id ? 'Contribution updated' : 'Contribution added')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!contribution}
      onClose={onClose}
      title={contribution?.id ? 'Edit contribution' : 'New contribution'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-primary" form="contribution-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Save'}
          </button>
        </div>
      }
    >
      <form id="contribution-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Date" type="date" required value={form.date} onChange={set('date')} error={errors.date} />
          <SelectField label="Partner" required value={form.shareholder_id} onChange={set('shareholder_id')} options={options} placeholder="Choose a partner" error={errors.shareholder_id} />
          <MoneyField label="Amount" currency={baseCurrency} required value={form.amount_thb} onChange={set('amount_thb')} error={errors.amount_thb} min={0} />
          <MoneyField label="Amount in EUR (as paid)" currency="EUR" value={form.amount_eur} onChange={set('amount_eur')} error={errors.amount_eur} min={0} hint="Optional, for the record only" />
          <TextField label="Method" value={form.method} onChange={set('method')} error={errors.method} list="contribution-methods" placeholder="Bank transfer" containerClassName="sm:col-span-2" />
          <datalist id="contribution-methods">
            {paymentMethods.map((m) => (
              <option key={m.id} value={m.name} />
            ))}
          </datalist>
          <TextareaField label="Notes" value={form.notes} onChange={set('notes')} rows={2} containerClassName="sm:col-span-2" error={errors.notes} />
        </FormGrid>
      </form>
    </Modal>
  )
}
