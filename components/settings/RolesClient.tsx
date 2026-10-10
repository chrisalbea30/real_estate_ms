'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { TextField, SelectField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { SettingsCard, SaveRow, Note } from '@/components/settings/SettingsCard'
import { ACTIONS, MODULES, MODULE_GROUPS, type Action, type ModuleKey } from '@/lib/modules'
import { ACTION_LABELS, ROLE_TEMPLATES, fullMatrix, type RoleTemplate } from '@/lib/schemas/settings'
import { cn } from '@/lib/format'
import { createRoleAction, deleteRoleAction, renameRoleAction, saveRolePermissionsAction } from '@/app/(app)/app/settings/actions'
import type { OrgRole, Perm } from '@/lib/types'

export type RoleUsage = { members: number; invites: number }
type Matrix = Record<ModuleKey, Perm>

export function RolesClient({ roles, usage, myRoleId }: { roles: OrgRole[]; usage: Record<string, RoleUsage>; myRoleId: string }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can } = useApp()
  const editable = can('settings', 'edit')
  const [selectedId, setSelectedId] = useState<string>(roles.find((r) => !r.is_system)?.id ?? roles[0]?.id ?? '')
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState<OrgRole | null>(null)
  const role = roles.find((r) => r.id === selectedId) ?? roles[0] ?? null

  const remove = async (r: OrgRole) => {
    const u = usage[r.id]
    if (u && (u.members > 0 || u.invites > 0)) {
      return toast.error(`“${r.name}” is still used by ${u.members} member${u.members === 1 ? '' : 's'} and ${u.invites} pending invitation${u.invites === 1 ? '' : 's'}. Move them first.`)
    }
    const ok = await confirm({ title: `Delete the role “${r.name}”?`, message: 'Nobody uses it. This cannot be undone.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    const res = await deleteRoleAction(r.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Role deleted')
    setSelectedId(roles.find((x) => x.id !== r.id && !x.is_system)?.id ?? roles[0]?.id ?? '')
    router.refresh()
  }

  return (
    <div>
      <PageHeader
        title="Roles"
        subtitle="What each role may view, add, edit and delete in every module."
        actions={
          editable && (
            <button className="btn-primary" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Add role
            </button>
          )
        }
      />

      <Tabs
        className="mb-4"
        tabs={roles.map((r) => ({
          key: r.id,
          label: (
            <span className="inline-flex items-center gap-1.5">
              {r.is_system && <Lock className="h-3.5 w-3.5" />}
              {r.name}
            </span>
          ),
          badge: usage[r.id]?.members ?? 0,
        }))}
        value={role?.id ?? ''}
        onChange={setSelectedId}
      />

      {role && (
        <RoleMatrix
          key={`${role.id}-${role.updated_at}`}
          role={role}
          usage={usage[role.id] ?? { members: 0, invites: 0 }}
          editable={editable}
          isMine={role.id === myRoleId}
          onRename={() => setRenaming(role)}
          onDelete={() => remove(role)}
        />
      )}

      <AddRoleModal
        open={adding}
        roles={roles}
        onClose={() => setAdding(false)}
        onCreated={(r) => {
          setAdding(false)
          setSelectedId(r.id)
          router.refresh()
        }}
      />
      <RenameRoleModal role={renaming} onClose={() => setRenaming(null)} />
    </div>
  )
}

function RoleMatrix({ role, usage, editable, isMine, onRename, onDelete }: { role: OrgRole; usage: RoleUsage; editable: boolean; isMine: boolean; onRename: () => void; onDelete: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const [matrix, setMatrix] = useState<Matrix>(() => fullMatrix(role.permissions))
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(fullMatrix(role.permissions)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const locked = role.is_system || !editable
  const dirty = JSON.stringify(matrix) !== snapshot

  /** Settings view/edit stay on for your own role so you cannot lock yourself out. */
  const cellLocked = (m: ModuleKey, a: Action) => locked || (isMine && m === 'settings' && (a === 'view' || a === 'edit'))

  const setCell = (m: ModuleKey, a: Action, v: boolean) =>
    setMatrix((x) => {
      const row = { ...x[m], [a]: v }
      if (a !== 'view' && v) row.view = true
      if (a === 'view' && !v) row.add = row.edit = row.delete = false
      if (isMine && m === 'settings') {
        row.view = true
        row.edit = true
      }
      return { ...x, [m]: row }
    })
  const setRow = (m: ModuleKey, v: boolean) =>
    setMatrix((x) => {
      const row: Perm = { view: v, add: v, edit: v, delete: v }
      if (isMine && m === 'settings') {
        row.view = true
        row.edit = true
      }
      return { ...x, [m]: row }
    })
  const setColumn = (a: Action, v: boolean) =>
    setMatrix((x) => {
      const next = { ...x }
      for (const { key } of MODULES) {
        const row = { ...next[key], [a]: v }
        if (a !== 'view' && v) row.view = true
        if (a === 'view' && !v) row.add = row.edit = row.delete = false
        if (isMine && key === 'settings') {
          row.view = true
          row.edit = true
        }
        next[key] = row
      }
      return next
    })

  const save = async () => {
    setBusy(true)
    setError(null)
    const res = await saveRolePermissionsAction({ role_id: role.id, permissions: matrix })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setSnapshot(JSON.stringify(matrix))
    toast.success(`Permissions of “${role.name}” saved`)
    router.refresh()
  }

  const columnAll = (a: Action) => MODULES.every((m) => matrix[m.key][a])
  const granted = MODULES.filter((m) => matrix[m.key].view).length

  return (
    <form
      id="role-form"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <SettingsCard
        title={
          <span className="inline-flex items-center gap-2">
            {role.name}
            {role.is_system && <Badge tone="primary">System</Badge>}
            {isMine && <Badge tone="info">Your role</Badge>}
          </span>
        }
        description={`${usage.members} member${usage.members === 1 ? '' : 's'} · ${usage.invites} pending invitation${usage.invites === 1 ? '' : 's'} · ${granted} of ${MODULES.length} modules visible`}
        actions={
          editable &&
          !role.is_system && (
            <>
              <button type="button" className="btn-secondary btn-sm" onClick={onRename}>
                <Pencil className="h-4 w-4" /> Rename
              </button>
              <button type="button" className="btn-secondary btn-sm text-danger" onClick={onDelete} disabled={usage.members > 0 || usage.invites > 0} title={usage.members > 0 ? 'Move its members to another role first' : undefined}>
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </>
          )
        }
        footer={!locked && <SaveRow busy={busy} dirty={dirty} form="role-form" hint={dirty ? 'Unsaved. Changes apply to everyone with this role as soon as you save.' : 'Changes apply immediately to everyone with this role.'} />}
      >
        <FormError error={error} />
        {role.is_system ? (
          <Note className="mb-4">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> The Owner role always has every permission and cannot be edited or deleted.
            </span>
          </Note>
        ) : (
          !editable && <Note className="mb-4">You can view this matrix. Changing it needs the Settings → edit permission.</Note>
        )}
        {isMine && !role.is_system && <Note tone="warning" className="mb-4">This is your own role. Settings → view and edit stay on so you cannot lock yourself out.</Note>}

        <div className="table-wrap">
          <table className="table min-w-[30rem]">
            <thead>
              <tr>
                <th className="w-full">Module</th>
                {ACTIONS.map((a) => (
                  <th key={a} className="text-center">
                    <div>{ACTION_LABELS[a]}</div>
                    {!locked && (
                      <div className="mt-1 flex justify-center gap-1 text-[10px] font-medium normal-case tracking-normal">
                        <button type="button" className="text-primary hover:underline" onClick={() => setColumn(a, true)} disabled={columnAll(a)}>
                          all
                        </button>
                        <span className="text-muted">/</span>
                        <button type="button" className="text-muted hover:underline" onClick={() => setColumn(a, false)}>
                          none
                        </button>
                      </div>
                    )}
                  </th>
                ))}
                {!locked && <th className="text-center">Row</th>}
              </tr>
            </thead>
            <tbody>
              {MODULE_GROUPS.map((group) => {
                const items = MODULES.filter((m) => m.group === group)
                if (items.length === 0) return null
                return [
                  <tr key={`g-${group}`} className="bg-surface-2/60">
                    <td colSpan={ACTIONS.length + (locked ? 1 : 2)} className="!py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                      {group}
                    </td>
                  </tr>,
                  ...items.map((m) => {
                    const row = matrix[m.key]
                    const allOn = ACTIONS.every((a) => row[a])
                    return (
                      <tr key={m.key} className={cn(!row.view && 'text-muted')}>
                        <td>
                          <div className="flex items-center gap-2">
                            <m.icon className="h-4 w-4 shrink-0 opacity-70" />
                            <span className="font-medium">{m.label}</span>
                          </div>
                        </td>
                        {ACTIONS.map((a) => (
                          <td key={a} className="text-center">
                            <input
                              type="checkbox"
                              className="h-5 w-5 rounded border-line-2 accent-[var(--primary)] disabled:opacity-60"
                              checked={row[a]}
                              disabled={cellLocked(m.key, a)}
                              onChange={(e) => setCell(m.key, a, e.target.checked)}
                              aria-label={`${m.label}: ${ACTION_LABELS[a]}`}
                            />
                          </td>
                        ))}
                        {!locked && (
                          <td className="text-center">
                            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setRow(m.key, !allOn)}>
                              {allOn ? 'none' : 'all'}
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  }),
                ]
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">Ticking Add, Edit or Delete also ticks View. Clearing View clears the row. Permissions are enforced by the database on every request.</p>
      </SettingsCard>
    </form>
  )
}

function AddRoleModal({ open, roles, onClose, onCreated }: { open: boolean; roles: OrgRole[]; onClose: () => void; onCreated: (r: OrgRole) => void }) {
  const [form, setForm] = useState({ name: '', source: 'template:Viewer' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setForm({ name: '', source: 'template:Viewer' })
      setError(null)
      setErrors({})
    }
  }

  const options = [
    { value: 'template:Empty', label: 'Start empty (no access)' },
    ...ROLE_TEMPLATES.map((t) => ({ value: `template:${t}`, label: `Template: ${t}` })),
    ...roles.map((r) => ({ value: `role:${r.id}`, label: `Copy of “${r.name}”` })),
  ]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const [kind, value] = form.source.split(':') as ['template' | 'role', string]
    const res = await createRoleAction({
      name: form.name,
      template: kind === 'template' && value !== 'Empty' ? (value as RoleTemplate) : undefined,
      copy_from_role_id: kind === 'role' ? value : undefined,
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    onCreated(res.data)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add role"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="btn-primary" form="add-role-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Create role'}
          </button>
        </div>
      }
    >
      <form id="add-role-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Role name" required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="Reception" containerClassName="sm:col-span-2" />
          <SelectField label="Start from" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} options={options} containerClassName="sm:col-span-2" hint="You can adjust every permission after creating the role." />
        </FormGrid>
      </form>
    </Modal>
  )
}

function RenameRoleModal({ role, onClose }: { role: OrgRole | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState<string | null>(null)
  const k = role?.id ?? null
  if (k !== key) {
    setKey(k)
    setName(role?.name ?? '')
    setError(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) return
    setBusy(true)
    const res = await renameRoleAction({ role_id: role.id, name })
    setBusy(false)
    if (!res.ok) return setError(res.fieldErrors?.name ?? res.error)
    toast.success('Role renamed')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!role}
      onClose={onClose}
      title="Rename role"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="btn-primary" form="rename-role-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Rename'}
          </button>
        </div>
      }
    >
      <form id="rename-role-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Role name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} containerClassName="sm:col-span-2" />
        </FormGrid>
      </form>
    </Modal>
  )
}
