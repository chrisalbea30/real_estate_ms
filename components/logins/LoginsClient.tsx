'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ExternalLink, KeyRound, Eye, EyeOff, Copy, X, ShieldAlert, Lock } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { formatDate } from '@/lib/format'
import { deleteCredentialAction, revealPasswordAction } from '@/app/(app)/app/logins/actions'
import { CredentialModal } from '@/components/logins/CredentialModal'
import type { WebCredentialSafe } from '@/lib/schemas/logins'

const HIDE_AFTER_MS = 30_000
const MASK = '••••••••••'
const KEY_COMMAND = `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

type Revealed = { value: string; shown: boolean }

export function LoginsClient({ credentials, encryptionReady }: { credentials: WebCredentialSafe[]; encryptionReady: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can } = useApp()
  const [editing, setEditing] = useState<Partial<WebCredentialSafe> | null>(null)
  const [revealed, setRevealed] = useState<Record<string, Revealed>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const timers = useRef<Record<string, number>>({})

  const canView = can('logins', 'view')
  const canWrite = encryptionReady

  // Purge any decrypted passwords when leaving the page.
  useEffect(() => {
    const t = timers.current
    return () => Object.values(t).forEach((id) => window.clearTimeout(id))
  }, [])

  const hide = (id: string) => {
    window.clearTimeout(timers.current[id])
    delete timers.current[id]
    setRevealed((r) => {
      if (!(id in r)) return r
      const next = { ...r }
      delete next[id]
      return next
    })
  }

  const reveal = async (id: string) => {
    if (!canView) return
    setLoading(id)
    const res = await revealPasswordAction(id)
    setLoading(null)
    if (!res.ok) return toast.error(res.error)
    setRevealed((r) => ({ ...r, [id]: { value: res.data, shown: false } }))
    window.clearTimeout(timers.current[id])
    timers.current[id] = window.setTimeout(() => hide(id), HIDE_AFTER_MS)
  }

  const toggleShown = (id: string) => setRevealed((r) => (r[id] ? { ...r, [id]: { ...r[id], shown: !r[id].shown } } : r))

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${what} copied`)
    } catch {
      toast.error('Clipboard is not available in this browser')
    }
  }

  const remove = async (c: WebCredentialSafe) => {
    const ok = await confirm({ title: `Delete the ${c.service_name} log-in?`, message: 'The stored password cannot be recovered afterwards.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    const res = await deleteCredentialAction(c.id)
    if (!res.ok) return toast.error(res.error)
    hide(c.id)
    toast.success('Log-in deleted')
    router.refresh()
  }

  const passwordCell = (c: WebCredentialSafe) => {
    const r = revealed[c.id]
    if (r) {
      return (
        <span className="inline-flex max-w-full items-center gap-1">
          <code className="max-w-[12rem] truncate rounded-md bg-surface-2 px-2 py-1 font-mono text-xs text-ink" title={r.shown ? r.value : undefined}>
            {r.shown ? r.value : MASK}
          </code>
          <button className="icon-btn !h-8 !w-8" title={r.shown ? 'Hide' : 'Show'} onClick={() => toggleShown(c.id)}>
            {r.shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button className="icon-btn !h-8 !w-8" title="Copy password" onClick={() => copy(r.value, 'Password')}>
            <Copy className="h-4 w-4" />
          </button>
          <button className="icon-btn !h-8 !w-8" title="Forget" onClick={() => hide(c.id)}>
            <X className="h-4 w-4" />
          </button>
        </span>
      )
    }
    if (!canView) return <span className="text-muted">{MASK}</span>
    return (
      <button className="btn-secondary btn-sm" disabled={!encryptionReady || loading === c.id} onClick={() => reveal(c.id)}>
        {loading === c.id ? <Spinner size="sm" /> : <KeyRound className="h-4 w-4" />} Reveal
      </button>
    )
  }

  const columns: Column<WebCredentialSafe>[] = useMemo(
    () => [
      {
        key: 'service',
        header: 'Service',
        cell: (c) => (
          <div className="min-w-0 max-w-xs">
            <div className="truncate font-medium">{c.service_name}</div>
            {c.url && (
              <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-xs text-muted hover:text-primary">
                <ExternalLink className="h-3 w-3 shrink-0" /> <span className="truncate">{c.url.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </div>
        ),
        sortValue: (c) => c.service_name,
      },
      {
        key: 'username',
        header: 'Username',
        cell: (c) =>
          c.username ? (
            <span className="inline-flex items-center gap-1">
              <span className="truncate">{c.username}</span>
              <button className="icon-btn !h-7 !w-7" title="Copy username" onClick={() => copy(c.username!, 'Username')}>
                <Copy className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : (
            <span className="text-muted">—</span>
          ),
        sortValue: (c) => c.username ?? '',
      },
      { key: 'password', header: 'Password', cell: passwordCell, width: '16rem' },
      { key: 'notes', header: 'Notes', cell: (c) => <span className="block max-w-xs truncate text-muted">{c.notes ?? ''}</span>, hide: 'xl' },
      { key: 'created_by', header: 'Added by', cell: (c) => c.created_by ?? <span className="text-muted">—</span>, sortValue: (c) => c.created_by ?? '', hide: 'xl' },
    ],
    [revealed, loading, canView, encryptionReady], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const actions = (c: WebCredentialSafe) => (
    <>
      {can('logins', 'edit') && (
        <button className="icon-btn !h-8 !w-8" title={canWrite ? 'Edit' : 'Encryption key missing'} disabled={!canWrite} onClick={() => setEditing(c)}>
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {can('logins', 'delete') && (
        <button className="icon-btn !h-8 !w-8 text-danger" title="Delete" onClick={() => remove(c)}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </>
  )

  return (
    <div>
      <PageHeader
        title="Log-in vault"
        subtitle={`${credentials.length} stored log-in${credentials.length === 1 ? '' : 's'} · passwords encrypted at rest`}
        actions={
          can('logins', 'add') && (
            <button className="btn-primary" disabled={!canWrite} onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" /> Add log-in
            </button>
          )
        }
      />

      {!encryptionReady && (
        <div className="card mb-5 flex gap-3 border-warning/40 bg-warning-soft p-4 text-sm">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="min-w-0 space-y-2">
            <div className="font-semibold text-ink">The vault is locked: encryption is not configured</div>
            <p className="text-ink-2">
              Passwords are encrypted with <code className="kbd">CREDENTIALS_ENCRYPTION_KEY</code> before they are stored. Set it in the server environment (32 random bytes, base64) and restart the app. Adding, editing and revealing log-ins is disabled until then.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-surface px-2 py-1.5 font-mono text-xs text-ink">{KEY_COMMAND}</code>
              <button className="btn-secondary btn-sm" onClick={() => copy(KEY_COMMAND, 'Command')}>
                <Copy className="h-4 w-4" /> Copy
              </button>
            </div>
          </div>
        </div>
      )}

      <DataTable
        rows={credentials}
        columns={columns}
        rowKey={(c) => c.id}
        search={(c) => `${c.service_name} ${c.username ?? ''} ${c.url ?? ''} ${c.notes ?? ''}`}
        searchPlaceholder="Search service, username, URL, notes…"
        defaultSort={{ key: 'service', dir: 'asc' }}
        actions={actions}
        empty={
          credentials.length === 0 ? (
            <EmptyState icon={Lock} title="No log-ins stored" description="Keep the team's third-party logins in one place. Passwords are encrypted and only revealed on demand." action={can('logins', 'add') && canWrite && <button className="btn-primary" onClick={() => setEditing({})}>Add first log-in</button>} />
          ) : undefined
        }
        exportName="logins"
        exportRow={(c) => ({
          Service: c.service_name,
          URL: c.url ?? '',
          Username: c.username ?? '',
          Notes: c.notes ?? '',
          'Created By': c.created_by ?? '',
        })}
        renderCard={(c) => (
          <>
            <CardTitle
              title={c.service_name}
              subtitle={
                c.url ? (
                  <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
                    <ExternalLink className="h-3 w-3" /> {c.url.replace(/^https?:\/\//, '')}
                  </a>
                ) : undefined
              }
            />
            <CardRow label="Username">
              {c.username ? (
                <span className="inline-flex items-center gap-1">
                  {c.username}
                  <button className="icon-btn !h-7 !w-7" title="Copy username" onClick={() => copy(c.username!, 'Username')}>
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </span>
              ) : (
                '—'
              )}
            </CardRow>
            <CardRow label="Password">{passwordCell(c)}</CardRow>
            {c.notes && <p className="mt-2 text-sm text-ink-2">{c.notes}</p>}
            {c.created_by && (
              <p className="mt-2 text-xs text-muted">
                Added by {c.created_by} · {formatDate(c.created_at)}
              </p>
            )}
          </>
        )}
      />

      <CredentialModal credential={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
