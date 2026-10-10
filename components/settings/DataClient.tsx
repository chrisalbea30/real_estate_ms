'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ChevronDown, ChevronUp, Download, FileJson, FileSpreadsheet, FileText, ScrollText } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { Chips } from '@/components/ui/Tabs'
import { TextField, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { SettingsCard, Note } from '@/components/settings/SettingsCard'
import { EXPORT_TABLES, RESET_TABLES, TABLE_LABELS, type ExportTable, type ResetTable } from '@/lib/schemas/settings'
import { exportCSV, exportJSON, exportXLSX, type ExportRow } from '@/lib/export'
import { cn, formatDateTime } from '@/lib/format'
import { exportTableAction, resetDataAction } from '@/app/(app)/app/settings/actions'
import type { AuditLogRow } from '@/lib/types'

type Format = 'xlsx' | 'csv' | 'json'

function flatten(row: Record<string, unknown>): ExportRow {
  const out: ExportRow = {}
  for (const [k, v] of Object.entries(row)) {
    out[k] = v === null || v === undefined ? null : typeof v === 'object' ? JSON.stringify(v) : (v as string | number | boolean)
  }
  return out
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'export'
}

export function DataClient({ audit, actors, orgName, timezone }: { audit: AuditLogRow[]; actors: Record<string, string>; orgName: string; timezone: string }) {
  const { can } = useApp()
  return (
    <div>
      <PageHeader title="Data" subtitle="Take your data with you, wipe a fresh start, and see who changed what." />
      <ExportCard orgName={orgName} />
      {can('settings', 'delete') && <ResetCard orgName={orgName} />}
      <AuditCard rows={audit} actors={actors} timezone={timezone} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

function ExportCard({ orgName }: { orgName: string }) {
  const toast = useToast()
  const [format, setFormat] = useState<Format>('xlsx')
  const [busy, setBusy] = useState<string | null>(null)
  const stamp = () => new Date().toISOString().slice(0, 10)

  const download = async (rows: ExportRow[], name: string) => {
    if (format === 'xlsx') await exportXLSX(rows, name)
    else if (format === 'csv') exportCSV(rows, name)
    else exportJSON(rows, name)
  }

  const exportOne = async (table: ExportTable): Promise<number> => {
    const res = await exportTableAction(table)
    if (!res.ok) throw new Error(`${TABLE_LABELS[table]}: ${res.error}`)
    const rows = res.data.map(flatten)
    if (rows.length === 0) return 0
    await download(rows, `${slug(orgName)}-${table}-${stamp()}`)
    return rows.length
  }

  const runOne = async (table: ExportTable) => {
    setBusy(table)
    try {
      const n = await exportOne(table)
      if (n === 0) toast.info(`${TABLE_LABELS[table]}: no rows to export`)
      else toast.success(`${TABLE_LABELS[table]}: ${n} rows`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(null)
    }
  }

  const runAll = async () => {
    setBusy('all')
    let files = 0
    let total = 0
    try {
      for (const table of EXPORT_TABLES) {
        setBusy(table)
        const n = await exportOne(table)
        if (n > 0) {
          files++
          total += n
          // Give the browser a moment between downloads.
          await new Promise((r) => setTimeout(r, 400))
        }
      }
      toast.success(`Exported ${total} rows in ${files} file${files === 1 ? '' : 's'}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(null)
    }
  }

  const icon = format === 'xlsx' ? FileSpreadsheet : format === 'csv' ? FileText : FileJson
  const Icon = icon

  return (
    <SettingsCard
      title="Export"
      description="One file per table with every row of this organisation. Tables you cannot view come back empty."
      actions={
        <Chips<Format>
          value={format}
          onChange={setFormat}
          options={[
            { key: 'xlsx', label: 'Excel' },
            { key: 'csv', label: 'CSV' },
            { key: 'json', label: 'JSON' },
          ]}
        />
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className="btn-primary" onClick={runAll} disabled={busy !== null}>
          {busy === 'all' || (busy && busy !== 'all') ? <Spinner size="sm" /> : <Download className="h-4 w-4" />} Export everything
        </button>
        <span className="text-xs text-muted">{busy && busy !== 'all' ? `Exporting ${TABLE_LABELS[busy as ExportTable] ?? busy}…` : `${EXPORT_TABLES.length} tables · your browser may ask to allow multiple downloads.`}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORT_TABLES.map((t) => (
          <button key={t} className={cn('flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left text-sm transition hover:bg-surface-2 disabled:opacity-60', busy === t && 'border-primary')} onClick={() => runOne(t)} disabled={busy !== null}>
            {busy === t ? <Spinner size="sm" className="text-primary" /> : <Icon className="h-4 w-4 shrink-0 text-muted" />}
            <span className="min-w-0 flex-1 truncate font-medium">{TABLE_LABELS[t]}</span>
            <span className="text-[11px] text-muted">{t}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Files attached to records (receipts, documents, photos) are not included; they stay in storage and can be opened from each record.</p>
    </SettingsCard>
  )
}

/* ------------------------------------------------------------------ */
/* Reset (danger zone)                                                 */
/* ------------------------------------------------------------------ */

function ResetCard({ orgName }: { orgName: string }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [selected, setSelected] = useState<ResetTable[]>([])
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const all = selected.length === RESET_TABLES.length
  const matches = typed.trim() === orgName.trim()

  const toggle = (t: ResetTable) => setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))

  const reset = async () => {
    const ok = await confirm({
      title: all ? 'Delete all business data?' : `Delete ${selected.length} table${selected.length === 1 ? '' : 's'}?`,
      message: 'Rows are deleted permanently. Settings, properties, rooms, team and roles are kept. There is no undo; export first.',
      confirmLabel: 'Delete permanently',
      danger: true,
    })
    if (!ok) return
    setBusy(true)
    setError(null)
    const res = await resetDataAction({ tables: selected, confirm: typed })
    setBusy(false)
    if (!res.ok) {
      setError(res.fieldErrors?.tables ?? res.error)
      return
    }
    setSelected([])
    setTyped('')
    toast.success('Data deleted')
    router.refresh()
  }

  return (
    <SettingsCard
      danger
      title="Reset data"
      description="Danger zone. Deletes rows of the chosen tables for this organisation only. Settings, properties, rooms, team and roles stay."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-danger/80">
            {selected.length === 0 ? 'Choose at least one table.' : !matches ? 'Type the organisation name to enable the button.' : `Ready to delete ${selected.length} table${selected.length === 1 ? '' : 's'}.`}
          </span>
          <button className="btn-danger" disabled={busy || selected.length === 0 || !matches} onClick={reset}>
            {busy ? <Spinner size="sm" /> : <AlertTriangle className="h-4 w-4" />} Delete selected data
          </button>
        </div>
      }
    >
      <FormError error={error} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-secondary btn-sm" onClick={() => setSelected(all ? [] : [...RESET_TABLES])}>
          {all ? 'Clear selection' : 'Select all'}
        </button>
        <span className="text-xs text-muted">{selected.length} selected</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {RESET_TABLES.map((t) => (
          <label key={t} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition', selected.includes(t) ? 'border-danger bg-danger-soft/60' : 'border-line bg-surface hover:bg-surface-2')}>
            <input type="checkbox" className="h-5 w-5 rounded border-line-2 accent-[var(--danger)]" checked={selected.includes(t)} onChange={() => toggle(t)} />
            <span className="min-w-0 flex-1 truncate font-medium">{TABLE_LABELS[t]}</span>
          </label>
        ))}
      </div>
      <Note tone="warning" className="mt-4">
        Deleting bookings also removes their revenue rows and ledger movements (database triggers). Deleting account movements resets every account to its opening balance. Invoices already sent to guests stop opening.
      </Note>
      <TextField
        label={
          <>
            Type <span className="font-semibold text-ink">{orgName}</span> to confirm
          </>
        }
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={orgName}
        autoComplete="off"
        containerClassName="mt-4 sm:max-w-md"
      />
    </SettingsCard>
  )
}

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */

type Change = { key: string; before: unknown; after: unknown }

const NOISE = new Set(['updated_at'])

function changesOf(r: AuditLogRow): Change[] {
  const oldD = r.old_data ?? {}
  const newD = r.new_data ?? {}
  if (r.action === 'INSERT') return Object.entries(newD).filter(([, v]) => v !== null && v !== '' && v !== false).map(([key, after]) => ({ key, before: undefined, after }))
  if (r.action === 'DELETE') return Object.entries(oldD).filter(([, v]) => v !== null && v !== '').map(([key, before]) => ({ key, before, after: undefined }))
  const keys = new Set([...Object.keys(oldD), ...Object.keys(newD)])
  const out: Change[] = []
  for (const key of keys) {
    if (NOISE.has(key)) continue
    const before = oldD[key]
    const after = newD[key]
    if (JSON.stringify(before) !== JSON.stringify(after)) out.push({ key, before, after })
  }
  return out
}

function show(v: unknown) {
  if (v === undefined) return '—'
  if (v === null) return 'null'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

const ACTION_TONE: Record<AuditLogRow['action'], BadgeTone> = { INSERT: 'success', UPDATE: 'info', DELETE: 'danger' }

function AuditCard({ rows, actors, timezone }: { rows: AuditLogRow[]; actors: Record<string, string>; timezone: string }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [table, setTable] = useState<string>('all')
  const tables = useMemo(() => [...new Set(rows.map((r) => r.table_name))].sort(), [rows])
  const filtered = table === 'all' ? rows : rows.filter((r) => r.table_name === table)

  const toggle = (id: number) =>
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const actorName = (r: AuditLogRow) => (r.actor ? (actors[r.actor] ?? 'Former member') : 'System')

  const Diff = ({ r }: { r: AuditLogRow }) => {
    const changes = changesOf(r)
    const open = expanded.has(r.id)
    return (
      <div className="min-w-0">
        <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" onClick={() => toggle(r.id)}>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {changes.length} field{changes.length === 1 ? '' : 's'}
        </button>
        {open && (
          <div className="mt-2 max-w-full overflow-x-auto rounded-xl border border-line bg-surface-2/50 text-xs">
            {changes.length === 0 ? (
              <div className="px-3 py-2 text-muted">No visible changes.</div>
            ) : (
              <table className="w-full">
                <tbody>
                  {changes.map((c) => (
                    <tr key={c.key} className="border-b border-line last:border-0">
                      <td className="whitespace-nowrap px-3 py-1.5 align-top font-medium text-ink-2">{c.key}</td>
                      {r.action !== 'INSERT' && <td className="max-w-[14rem] break-words px-3 py-1.5 align-top text-danger line-through decoration-danger/50">{show(c.before)}</td>}
                      {r.action !== 'DELETE' && <td className="max-w-[14rem] break-words px-3 py-1.5 align-top text-success">{show(c.after)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    )
  }

  const columns: Column<AuditLogRow>[] = [
    { key: 'time', header: 'When', cell: (r) => <span className="whitespace-nowrap text-muted">{formatDateTime(r.created_at, timezone)}</span>, sortValue: (r) => r.created_at, width: '11rem' },
    { key: 'table', header: 'Table', cell: (r) => <span className="font-medium">{r.table_name}</span>, sortValue: (r) => r.table_name, width: '11rem' },
    { key: 'action', header: 'Action', cell: (r) => <Badge tone={ACTION_TONE[r.action] ?? 'neutral'}>{r.action}</Badge>, sortValue: (r) => r.action, width: '6rem' },
    { key: 'actor', header: 'By', cell: (r) => actorName(r), sortValue: (r) => actorName(r), hide: 'lg', width: '10rem' },
    { key: 'row', header: 'Row', cell: (r) => <span className="font-mono text-[11px] text-muted" title={r.row_id ?? ''}>{r.row_id ? r.row_id.slice(0, 8) : '—'}</span>, hide: 'xl', width: '6rem' },
    { key: 'changes', header: 'Changes', cell: (r) => <Diff r={r} /> },
  ]

  return (
    <SettingsCard title="Audit log" description={`The last ${rows.length} changes to this organisation's records, newest first.`}>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center text-sm text-muted">
          <ScrollText className="mb-2 h-6 w-6" />
          Nothing recorded yet.
        </div>
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => String(r.id)}
          search={(r) => `${r.table_name} ${r.action} ${actorName(r)} ${r.row_id ?? ''}`}
          searchPlaceholder="Search table, action, person, row id…"
          defaultSort={{ key: 'time', dir: 'desc' }}
          pageSize={25}
          toolbar={
            <select className="select w-auto" value={table} onChange={(e) => setTable(e.target.value)} aria-label="Filter by table">
              <option value="all">All tables</option>
              {tables.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          }
          exportName="audit-log"
          exportRow={(r) => ({ Time: r.created_at, Table: r.table_name, Action: r.action, By: actorName(r), Row: r.row_id ?? '', Changes: changesOf(r).map((c) => `${c.key}: ${show(c.before)} → ${show(c.after)}`).join('; ') })}
          renderCard={(r) => (
            <>
              <CardTitle title={r.table_name} subtitle={formatDateTime(r.created_at, timezone)} right={<Badge tone={ACTION_TONE[r.action] ?? 'neutral'}>{r.action}</Badge>} />
              <CardRow label="By">{actorName(r)}</CardRow>
              <CardRow label="Row">
                <span className="font-mono text-[11px]">{r.row_id ? r.row_id.slice(0, 8) : '—'}</span>
              </CardRow>
              <div className="mt-2">
                <Diff r={r} />
              </div>
            </>
          )}
        />
      )}
    </SettingsCard>
  )
}
