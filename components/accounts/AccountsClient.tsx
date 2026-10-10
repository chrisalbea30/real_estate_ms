'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Wallet, Landmark, Banknote, CreditCard, ArrowDownLeft, ArrowUpRight, SlidersHorizontal, Layers } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader, Section } from '@/components/ui/PageHeader'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { cn, formatDate, formatDateTime, titleCase } from '@/lib/format'
import { deleteAccountAction, deleteMovementAction } from '@/app/(app)/app/accounts/actions'
import { AccountModal } from '@/components/accounts/AccountModal'
import { AdjustModal } from '@/components/accounts/AdjustModal'
import type { Account, AccountBalance, AccountMovement } from '@/lib/types'

const SOURCE_LABEL: Record<string, string> = { guests: 'Guest payment', expenses: 'Expense', adjustment: 'Adjustment' }
const sourceLabel = (s: string | null) => SOURCE_LABEL[s ?? ''] ?? (s ? titleCase(s) : 'Other')
const sourceTone = (s: string | null): BadgeTone => (s === 'guests' ? 'success' : s === 'expenses' ? 'danger' : s === 'adjustment' ? 'info' : 'neutral')
const TYPE_ICON: Record<string, LucideIcon> = { bank: Landmark, cash: Banknote, wallet: Wallet, other: CreditCard }
const TYPE_LABEL: Record<string, string> = { bank: 'Bank', cash: 'Cash', wallet: 'Wallet', other: 'Other' }

export function AccountsClient({ accounts, movements }: { accounts: AccountBalance[]; movements: AccountMovement[] }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can, fmt, baseCurrency, property } = useApp()
  const [editing, setEditing] = useState<Partial<Account> | null>(null)
  const [adjusting, setAdjusting] = useState<AccountBalance | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [accountFilter, setAccountFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'Unknown account'
  const visible = accounts.filter((a) => showInactive || a.active)
  const cash = useMemo(() => accounts.filter((a) => a.active).reduce((s, a) => s + Number(a.balance ?? 0), 0), [accounts])

  const filtered = useMemo(
    () => movements.filter((m) => (!accountFilter || m.account_id === accountFilter) && (!from || m.occurred_on >= from) && (!to || m.occurred_on <= to)),
    [movements, accountFilter, from, to],
  )
  const flows = useMemo(() => {
    let inflow = 0
    let outflow = 0
    for (const m of filtered) {
      const n = Number(m.amount ?? 0)
      if (n >= 0) inflow += n
      else outflow += -n
    }
    return { inflow, outflow }
  }, [filtered])

  const removeAccount = async (a: AccountBalance) => {
    const ok = await confirm({
      title: `Delete ${a.name}?`,
      message: `${a.movement_count} movement${a.movement_count === 1 ? '' : 's'} on this account are deleted too, and payment methods linked to it stop posting. Consider marking it inactive instead.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    const res = await deleteAccountAction(a.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Account deleted')
    router.refresh()
  }

  const removeMovement = async (m: AccountMovement) => {
    const ok = await confirm({ title: 'Delete this adjustment?', message: `${m.description ?? 'Adjustment'} · ${formatDate(m.occurred_on)} · ${fmt(m.amount, { sign: true })}`, confirmLabel: 'Delete', danger: true })
    if (!ok) return
    const res = await deleteMovementAction(m.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Adjustment deleted')
    router.refresh()
  }

  const columns: Column<AccountMovement>[] = [
    { key: 'occurred_on', header: 'Date', cell: (m) => formatDate(m.occurred_on), sortValue: (m) => `${m.occurred_on} ${m.created_at}`, width: '7rem' },
    { key: 'account', header: 'Account', cell: (m) => <span className="font-medium">{nameOf(m.account_id)}</span>, sortValue: (m) => nameOf(m.account_id), hide: 'md' },
    { key: 'description', header: 'Description', cell: (m) => <span className="line-clamp-2 max-w-[24rem]">{m.description ?? '—'}</span>, sortValue: (m) => m.description ?? '' },
    {
      key: 'amount',
      header: 'Amount',
      cell: (m) => <span className={cn('font-semibold', Number(m.amount) < 0 ? 'text-danger' : 'text-success')}>{fmt(m.amount, { sign: true })}</span>,
      sortValue: (m) => Number(m.amount ?? 0),
      align: 'right',
    },
    { key: 'source', header: 'Source', cell: (m) => <Badge tone={sourceTone(m.source_table)}>{sourceLabel(m.source_table)}</Badge>, sortValue: (m) => sourceLabel(m.source_table), hide: 'lg' },
  ]

  const actions = (m: AccountMovement) =>
    m.source_table === 'adjustment' && can('accounts', 'delete') ? (
      <button className="icon-btn !h-8 !w-8 text-danger" title="Delete adjustment" onClick={() => removeMovement(m)}>
        <Trash2 className="h-4 w-4" />
      </button>
    ) : (
      <span className="text-xs text-muted" title="Posted automatically from the booking or expense">
        auto
      </span>
    )

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle={`${accounts.filter((a) => a.active).length} active account${accounts.filter((a) => a.active).length === 1 ? '' : 's'} · balances in ${baseCurrency}`}
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              Show inactive
            </label>
            {can('accounts', 'add') && (
              <button className="btn-primary" onClick={() => setEditing({})}>
                <Plus className="h-4 w-4" /> Add account
              </button>
            )}
          </>
        }
      />

      <StatGrid className="mb-5">
        <StatCard label="Total cash on hand" value={fmt(cash)} icon={Wallet} tone={cash < 0 ? 'danger' : 'primary'} sub="Active accounts" />
        <StatCard label="Accounts" value={accounts.filter((a) => a.active).length} icon={Layers} sub={accounts.length !== accounts.filter((a) => a.active).length ? `${accounts.length - accounts.filter((a) => a.active).length} inactive` : undefined} />
        <StatCard label="Inflows" value={fmt(flows.inflow)} icon={ArrowDownLeft} tone="success" sub="Filtered movements" />
        <StatCard label="Outflows" value={fmt(flows.outflow)} icon={ArrowUpRight} tone="danger" sub="Filtered movements" />
      </StatGrid>

      <Section title="Balances" description="Opening balance plus every posted movement. Nothing is read-modify-written.">
        {visible.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No accounts yet"
            description="Add your bank, cash and wallet accounts, then link payment methods to them in Settings so bookings and expenses post automatically."
            action={can('accounts', 'add') && <button className="btn-primary" onClick={() => setEditing({})}>Add first account</button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((a) => {
              const Icon = TYPE_ICON[a.type] ?? CreditCard
              const bal = Number(a.balance ?? 0)
              return (
                <div key={a.id} className={cn('card p-4', !a.active && 'opacity-60')}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-fg">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-semibold">{a.name}</span>
                        <Badge>{TYPE_LABEL[a.type] ?? titleCase(a.type)}</Badge>
                        {!a.active && <Badge tone="warning">Inactive</Badge>}
                        {a.currency && a.currency !== baseCurrency && <Badge tone="info">{a.currency}</Badge>}
                      </div>
                      <div className={cn('mt-1 font-display text-2xl font-semibold leading-none tabular', bal < 0 ? 'text-danger' : 'text-ink')}>{fmt(bal)}</div>
                      <div className="mt-1.5 text-xs text-muted">
                        {a.movement_count} movement{Number(a.movement_count) === 1 ? '' : 's'}
                        {a.last_movement_at ? ` · last ${formatDateTime(a.last_movement_at, property.timezone)}` : ' · no movements yet'}
                      </div>
                      {a.notes && <div className="mt-1 line-clamp-2 text-xs text-muted">{a.notes}</div>}
                    </div>
                  </div>
                  {(can('accounts', 'add') || can('accounts', 'edit') || can('accounts', 'delete')) && (
                    <div className="mt-3 flex items-center justify-end gap-1 border-t border-line pt-3">
                      {can('accounts', 'add') && (
                        <button className="btn-soft btn-sm" onClick={() => setAdjusting(a)}>
                          <SlidersHorizontal className="h-4 w-4" /> Adjust balance
                        </button>
                      )}
                      {can('accounts', 'edit') && (
                        <button className="icon-btn !h-8 !w-8" title="Edit" onClick={() => setEditing(a)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {can('accounts', 'delete') && (
                        <button className="icon-btn !h-8 !w-8 text-danger" title="Delete" onClick={() => removeAccount(a)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section title="Movements" description={`Latest ${movements.length} ledger rows. Guest payments and expenses are posted by the database; only adjustments can be removed here.`}>
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(m) => m.id}
          search={(m) => `${m.description ?? ''} ${nameOf(m.account_id)} ${sourceLabel(m.source_table)}`}
          searchPlaceholder="Search description, account…"
          defaultSort={{ key: 'occurred_on', dir: 'desc' }}
          toolbar={
            <>
              <select className="select w-auto" value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} aria-label="Account">
                <option value="">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <input type="date" className="input w-auto" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
              <span className="text-xs text-muted">to</span>
              <input type="date" className="input w-auto" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
              {(from || to || accountFilter) && (
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => {
                    setFrom('')
                    setTo('')
                    setAccountFilter('')
                  }}
                >
                  Clear
                </button>
              )}
            </>
          }
          actions={actions}
          exportName="account-movements"
          exportRow={(m) => ({
            Date: m.occurred_on,
            Account: nameOf(m.account_id),
            Description: m.description ?? '',
            Amount: m.amount ?? 0,
            Source: sourceLabel(m.source_table),
          })}
          footer={(rows) => {
            const net = rows.reduce((s, m) => s + Number(m.amount ?? 0), 0)
            return (
              <div className="flex flex-wrap justify-between gap-2 tabular">
                <span className="text-muted">{rows.length} movements</span>
                <span>
                  Net <strong className={net < 0 ? 'text-danger' : 'text-success'}>{fmt(net, { sign: true })}</strong>
                </span>
              </div>
            )
          }}
          renderCard={(m) => (
            <>
              <CardTitle title={m.description ?? sourceLabel(m.source_table)} subtitle={`${formatDate(m.occurred_on)} · ${nameOf(m.account_id)}`} right={<Badge tone={sourceTone(m.source_table)}>{sourceLabel(m.source_table)}</Badge>} />
              <CardRow label="Amount">
                <span className={Number(m.amount) < 0 ? 'text-danger' : 'text-success'}>{fmt(m.amount, { sign: true })}</span>
              </CardRow>
            </>
          )}
        />
      </Section>

      <AccountModal account={editing} onClose={() => setEditing(null)} />
      <AdjustModal account={adjusting} onClose={() => setAdjusting(null)} />
    </div>
  )
}
