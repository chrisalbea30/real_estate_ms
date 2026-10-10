'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Chips } from '@/components/ui/Tabs'
import { Modal } from '@/components/ui/Modal'
import { TextField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { cn, formatPct } from '@/lib/format'
import { updateSharePercentageAction } from '@/app/(app)/app/partners/actions'
import type { Partner } from '@/lib/types'

export type BarTone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
const FILL: Record<BarTone, string> = {
  primary: 'bg-primary',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  muted: 'bg-line-2',
}

/** Thin horizontal meter, value relative to `max` (0–100 % of the track). */
export function Meter({ value, max, tone = 'primary', className }: { value: number; max: number; tone?: BarTone; className?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)} aria-hidden>
      <div className={cn('h-full rounded-full transition-[width]', FILL[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Ranked list with a bar per row (amount and share of the total). */
export function RankedBars({ rows, format, tone = 'primary', emptyText = 'No data yet' }: { rows: { label: string; value: number; pct: number }[]; format: (v: number) => string; tone?: BarTone; emptyText?: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted">{emptyText}</p>
  const max = rows[0]?.value ?? 0
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${format(r.value)} (${formatPct(r.pct, 1)})`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-ink">{r.label}</span>
            <span className="shrink-0 tabular">
              <span className="text-ink">{format(r.value)}</span> <span className="text-muted">{formatPct(r.pct, 1)}</span>
            </span>
          </div>
          <Meter value={r.value} max={max} tone={tone} className="mt-1.5" />
        </li>
      ))}
    </ul>
  )
}

export function YearChips({ years, value, onChange }: { years: number[]; value: number; onChange: (y: number) => void }) {
  return <Chips value={String(value)} onChange={(k) => onChange(Number(k))} options={years.map((y) => ({ key: String(y), label: String(y) }))} />
}

export function varianceTone(variance: number | null, kind: 'revenue' | 'expense'): 'success' | 'danger' | 'muted' {
  if (variance == null || variance === 0) return 'muted'
  const good = kind === 'revenue' ? variance > 0 : variance < 0
  return good ? 'success' : 'danger'
}

/** Actual − budget with its percentage; colours inverted for expenses. */
export function VarianceText({ budget, actual, kind, format }: { budget: number; actual: number | null; kind: 'revenue' | 'expense'; format: (v: number) => string }) {
  if (actual == null) return <span className="text-muted">—</span>
  const v = actual - budget
  const tone = varianceTone(v, kind)
  const cls = tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-muted'
  return (
    <span className={cn('tabular', cls)}>
      {format(v)}
      {budget !== 0 && <span className="ml-1 text-xs opacity-80">({formatPct((v / Math.abs(budget)) * 100, 0)})</span>}
    </span>
  )
}

/** Small modal to change a partner's ownership percentage. */
export function SharePctModal({ partner, onClose }: { partner: Partner | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [key, setKey] = useState<string | null>(null)

  const k = partner?.id ?? null
  if (k !== key) {
    setKey(k)
    setValue(partner?.share_percentage == null ? '' : String(partner.share_percentage))
    setError(null)
    setErrors({})
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!partner) return
    setBusy(true)
    setError(null)
    const res = await updateSharePercentageAction({ id: partner.id, share_percentage: value })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success('Ownership updated')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!partner}
      onClose={onClose}
      title="Ownership share"
      subtitle={partner?.name}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-primary" form="share-pct-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Save'}
          </button>
        </div>
      }
    >
      <form id="share-pct-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Ownership %" type="number" inputMode="decimal" step="0.01" min={0} max={100} value={value} onChange={(e) => setValue(e.target.value)} error={errors.share_percentage} containerClassName="sm:col-span-2" autoFocus hint="All partners together should add up to 100%" />
        </FormGrid>
      </form>
    </Modal>
  )
}
