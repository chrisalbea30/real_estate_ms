'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Users, Mail, Phone, AlertTriangle, Link2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { fileHref } from '@/lib/storage'
import { formatDate, formatPct } from '@/lib/format'
import { matchesPartner } from '@/lib/schemas/partners'
import { deletePartnerAction } from '@/app/(app)/app/partners/actions'
import { PartnerModal } from '@/components/partners/PartnerModal'
import type { FoundingContribution, Partner } from '@/lib/types'

export type ContributionLite = Pick<FoundingContribution, 'shareholder_id' | 'shareholder' | 'amount_thb'>

export function contributedBy(partner: Pick<Partner, 'id' | 'name'>, contributions: ContributionLite[]) {
  return contributions.filter((c) => matchesPartner(c, partner)).reduce((s, c) => s + Number(c.amount_thb ?? 0), 0)
}

/** Progress of paid-in capital against the agreed amount, capped at 100. */
export function fundedPct(contributed: number, agreed: number | null | undefined) {
  const a = Number(agreed ?? 0)
  if (a <= 0) return null
  return Math.min(100, (contributed / a) * 100)
}

export function PartnersClient({ partners, contributions }: { partners: Partner[]; contributions: ContributionLite[] }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can, fmt, members } = useApp()
  const [editing, setEditing] = useState<Partial<Partner> | null>(null)
  const [viewing, setViewing] = useState<Partner | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const active = useMemo(() => partners.filter((p) => p.active), [partners])
  const list = showInactive ? partners : active
  const totalPct = active.reduce((s, p) => s + Number(p.share_percentage ?? 0), 0)
  const pctOff = active.length > 0 && Math.abs(totalPct - 100) > 0.01

  const remove = async (p: Partner) => {
    const ok = await confirm({
      title: `Delete ${p.name}?`,
      message: 'Capital contributions and work records keep the partner name as text but lose the link to this profile. Meetings are not affected.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    const res = await deletePartnerAction(p.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Partner deleted')
    setViewing(null)
    router.refresh()
  }

  const memberName = (userId: string | null) => (userId ? members.find((m) => m.user_id === userId)?.name ?? null : null)

  return (
    <div>
      <PageHeader
        title="Partners"
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>
              {active.length} partner{active.length === 1 ? '' : 's'} · {formatPct(totalPct, 2)} ownership recorded
            </span>
            {pctOff && (
              <Badge tone="warning">
                <AlertTriangle className="h-3 w-3" /> Ownership ≠ 100%
              </Badge>
            )}
          </span>
        }
        actions={
          <>
            {partners.length !== active.length && (
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                Show inactive
              </label>
            )}
            {can('shareholder_profiles', 'add') && (
              <button className="btn-primary" onClick={() => setEditing({})}>
                <Plus className="h-4 w-4" /> Add partner
              </button>
            )}
          </>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No partners yet"
          description="Add the partners of the company with their role and ownership share. Capital contributions and work hours are recorded against them."
          action={can('shareholder_profiles', 'add') && <button className="btn-primary" onClick={() => setEditing({})}>Add first partner</button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((p) => {
            const contributed = contributedBy(p, contributions)
            const progress = fundedPct(contributed, p.amount_to_found_thb)
            return (
              <div key={p.id} className="card group relative p-4">
                <button type="button" className="block w-full text-left" onClick={() => setViewing(p)}>
                  <div className="flex items-start gap-3">
                    <Avatar name={p.name} src={fileHref(p.photo_url)} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-ink">{p.name}</div>
                      <div className="truncate text-xs text-muted">{p.role ?? '—'}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge tone="primary">{formatPct(p.share_percentage ?? 0, 2)} ownership</Badge>
                        {!p.active && <Badge>Inactive</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-muted">Contributed</span>
                      <span className="font-medium tabular">
                        {fmt(contributed)}
                        {Number(p.amount_to_found_thb ?? 0) > 0 && <span className="text-muted"> / {fmt(p.amount_to_found_thb)}</span>}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                      <div className="h-full rounded-full bg-primary" style={{ width: `${progress ?? 0}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-muted">{progress == null ? 'No agreed capital set' : `${formatPct(progress, 0)} of agreed capital`}</div>
                  </div>
                </button>
                {(can('shareholder_profiles', 'edit') || can('shareholder_profiles', 'delete')) && (
                  <div className="absolute right-2 top-2 flex gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                    {can('shareholder_profiles', 'edit') && (
                      <button className="icon-btn !h-8 !w-8 bg-surface/90 shadow" onClick={() => setEditing(p)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {can('shareholder_profiles', 'delete') && (
                      <button className="icon-btn !h-8 !w-8 bg-surface/90 text-danger shadow" onClick={() => remove(p)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Read-only profile */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name ?? ''}
        subtitle={viewing?.role ?? undefined}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={() => setViewing(null)}>Close</button>
            {viewing && can('shareholder_profiles', 'edit') && (
              <button
                className="btn-primary"
                type="button"
                onClick={() => {
                  setEditing(viewing)
                  setViewing(null)
                }}
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
            )}
          </div>
        }
      >
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-4">
              <Avatar name={viewing.name} src={fileHref(viewing.photo_url)} size="xl" />
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1">
                  <Badge tone="primary">{formatPct(viewing.share_percentage ?? 0, 2)} ownership</Badge>
                  {!viewing.active && <Badge>Inactive</Badge>}
                </div>
                <div className="mt-2 text-muted">
                  Contributed <strong className="text-ink tabular">{fmt(contributedBy(viewing, contributions))}</strong>
                  {Number(viewing.amount_to_found_thb ?? 0) > 0 && (
                    <>
                      {' '}of <strong className="text-ink tabular">{fmt(viewing.amount_to_found_thb)}</strong> agreed
                    </>
                  )}
                </div>
              </div>
            </div>
            {viewing.bio && <p className="whitespace-pre-wrap text-ink-2">{viewing.bio}</p>}
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
              {viewing.email && (
                <Row label="Email">
                  <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`mailto:${viewing.email}`}>
                    <Mail className="h-3.5 w-3.5" /> {viewing.email}
                  </a>
                </Row>
              )}
              {viewing.phone && (
                <Row label="Phone">
                  <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`tel:${viewing.phone}`}>
                    <Phone className="h-3.5 w-3.5" /> {viewing.phone}
                  </a>
                </Row>
              )}
              {viewing.nationality && <Row label="Nationality">{viewing.nationality}</Row>}
              {viewing.joined_date && <Row label="Joined">{formatDate(viewing.joined_date)}</Row>}
              {viewing.hour_rate != null && <Row label="Hour rate">{fmt(viewing.hour_rate)} / h</Row>}
              {viewing.user_id && (
                <Row label="Team member">
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="h-3.5 w-3.5 text-muted" /> {memberName(viewing.user_id) ?? 'Linked'}
                  </span>
                </Row>
              )}
            </dl>
          </div>
        )}
      </Modal>

      <PartnerModal partner={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="truncate text-ink">{children}</dd>
    </div>
  )
}
