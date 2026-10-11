'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Check, Copy, Mail, RefreshCw, Trash2, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { TextField, SelectField, Switch, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { SettingsCard, Note } from '@/components/settings/SettingsCard'
import { APP_NAME } from '@/lib/brand'
import { formatDateTime, formatDate } from '@/lib/format'
import { createInvitationAction, removeMemberAction, resendInvitationAction, revokeInvitationAction, setMemberStatusAction, updateMemberRoleAction } from '@/app/(app)/app/settings/actions'
import type { Invitation } from '@/lib/types'

export type TeamMember = { id: string; user_id: string; role_id: string; status: 'active' | 'suspended'; name: string; email: string; created_at: string }
export type RoleLite = { id: string; name: string; is_system: boolean }

function inviteStatus(i: Invitation): 'pending' | 'expired' | 'accepted' | 'revoked' {
  if (i.status === 'pending' && new Date(i.expires_at).getTime() < Date.now()) return 'expired'
  return i.status
}

export function TeamClient({ members, roles, invitations, currentUserId, seats, planName, openInvite }: { members: TeamMember[]; roles: RoleLite[]; invitations: Invitation[]; currentUserId: string; seats: { used: number; limit: number | null }; planName: string; openInvite?: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can, org } = useApp()
  const editable = can('settings', 'edit')
  const full = seats.limit != null && seats.used >= seats.limit
  const [inviteOpen, setInviteOpen] = useState(Boolean(openInvite) && !full)
  const [share, setShare] = useState<Invitation | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? 'Role'
  const ownerRole = roles.find((r) => r.is_system)
  const activeOwners = members.filter((m) => m.status === 'active' && m.role_id === ownerRole?.id).length

  const changeRole = async (m: TeamMember, roleId: string) => {
    setBusyId(m.id)
    const res = await updateMemberRoleAction({ membership_id: m.id, role_id: roleId })
    setBusyId(null)
    if (!res.ok) return toast.error(res.error)
    toast.success(`${m.name} is now ${roleName(roleId)}`)
    router.refresh()
  }

  const toggleStatus = async (m: TeamMember, active: boolean) => {
    setBusyId(m.id)
    const res = await setMemberStatusAction({ membership_id: m.id, status: active ? 'active' : 'suspended' })
    setBusyId(null)
    if (!res.ok) return toast.error(res.error)
    toast.success(active ? `${m.name} reactivated` : `${m.name} suspended`)
    router.refresh()
  }

  const remove = async (m: TeamMember) => {
    const ok = await confirm({
      title: `Remove ${m.name}?`,
      message: 'They lose access to this organisation immediately. Records they created are kept. You can invite them again later.',
      confirmLabel: 'Remove',
      danger: true,
    })
    if (!ok) return
    const res = await removeMemberAction(m.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Member removed')
    router.refresh()
  }

  const revoke = async (i: Invitation) => {
    const ok = await confirm({ title: `Revoke the invitation for ${i.email}?`, message: 'The link stops working. You can send a new one at any time.', confirmLabel: 'Revoke', danger: true })
    if (!ok) return
    const res = await revokeInvitationAction(i.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Invitation revoked')
    router.refresh()
  }

  const resend = async (i: Invitation) => {
    setBusyId(i.id)
    const res = await resendInvitationAction(i.id)
    setBusyId(null)
    if (!res.ok) return toast.error(res.error)
    setShare(res.data)
    router.refresh()
  }

  const isSelf = (m: TeamMember) => m.user_id === currentUserId
  const lockedOwner = (m: TeamMember) => m.role_id === ownerRole?.id && m.status === 'active' && activeOwners <= 1

  const memberColumns: Column<TeamMember>[] = [
    {
      key: 'name',
      header: 'Member',
      cell: (m) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={m.name} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium">{m.name}</span>
              {isSelf(m) && <Badge tone="primary">You</Badge>}
            </div>
            <div className="truncate text-xs text-muted">{m.email}</div>
          </div>
        </div>
      ),
      sortValue: (m) => m.name,
    },
    {
      key: 'role',
      header: 'Role',
      cell: (m) =>
        editable && !isSelf(m) ? (
          <select className="select !min-h-9 !py-1 w-auto text-sm" value={m.role_id} disabled={busyId === m.id || lockedOwner(m)} onChange={(e) => changeRole(m, e.target.value)} title={lockedOwner(m) ? 'The only Owner cannot be demoted' : undefined}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        ) : (
          <span>{roleName(m.role_id)}</span>
        ),
      sortValue: (m) => roleName(m.role_id),
      width: '11rem',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (m) => (
        <div className="flex items-center gap-2">
          {editable && !isSelf(m) && <Switch checked={m.status === 'active'} onChange={(v) => toggleStatus(m, v)} disabled={busyId === m.id || (m.status === 'active' && lockedOwner(m))} label="Active" />}
          <Badge tone={m.status === 'active' ? 'success' : 'warning'}>{m.status === 'active' ? 'Active' : 'Suspended'}</Badge>
        </div>
      ),
      sortValue: (m) => m.status,
      width: '10rem',
    },
    { key: 'joined', header: 'Joined', cell: (m) => formatDate(m.created_at.slice(0, 10)), sortValue: (m) => m.created_at, hide: 'lg', width: '8rem' },
  ]

  const inviteColumns: Column<Invitation>[] = [
    { key: 'email', header: 'Email', cell: (i) => <span className="font-medium">{i.email}</span>, sortValue: (i) => i.email },
    { key: 'role', header: 'Role', cell: (i) => roleName(i.role_id), sortValue: (i) => roleName(i.role_id), hide: 'lg' },
    { key: 'status', header: 'Status', cell: (i) => <Badge tone={statusTone(inviteStatus(i))}>{inviteStatus(i)}</Badge>, sortValue: (i) => inviteStatus(i), width: '7rem' },
    { key: 'expires', header: 'Expires', cell: (i) => <span className="text-muted">{formatDateTime(i.expires_at)}</span>, sortValue: (i) => i.expires_at, hide: 'md' },
  ]

  const inviteActions = (i: Invitation) => {
    const s = inviteStatus(i)
    return (
      <>
        {s === 'pending' && (
          <button className="icon-btn !h-8 !w-8" title="Show link" onClick={() => setShare(i)}>
            <Copy className="h-4 w-4" />
          </button>
        )}
        {editable && s !== 'accepted' && (
          <button className="icon-btn !h-8 !w-8" title="Resend (new link)" disabled={busyId === i.id} onClick={() => resend(i)}>
            {busyId === i.id ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        )}
        {editable && s === 'pending' && (
          <button className="icon-btn !h-8 !w-8 text-danger" title="Revoke" onClick={() => revoke(i)}>
            <Ban className="h-4 w-4" />
          </button>
        )}
      </>
    )
  }

  const pendingCount = invitations.filter((i) => inviteStatus(i) === 'pending').length

  return (
    <div>
      <PageHeader
        title="People"
        subtitle={`${members.length} member${members.length === 1 ? '' : 's'} · ${pendingCount} invitation${pendingCount === 1 ? '' : 's'} waiting · ${seats.limit == null ? `${seats.used} people` : `${seats.used} of ${seats.limit} people${planName ? ` on ${planName}` : ''}`}`}
        actions={
          editable && (
            <button className="btn-primary" onClick={() => setInviteOpen(true)} disabled={full} title={full ? 'This workspace is full' : undefined}>
              <UserPlus className="h-4 w-4" /> Invite people
            </button>
          )
        }
      />

      {full && (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          This workspace has reached its limit of {seats.limit} people. Members and invitations that are still waiting both count. Remove someone or cancel a waiting invitation, or <a href="/app/settings/billing" className="font-semibold underline">ask us to raise the limit</a>.
        </div>
      )}

      <SettingsCard title="Members" description="Who can sign in to this organisation and with which role. Roles are edited under Roles.">
        {members.length === 0 ? (
          <EmptyState icon={Users} title="No members" />
        ) : (
          <DataTable
            rows={members}
            columns={memberColumns}
            rowKey={(m) => m.id}
            search={(m) => `${m.name} ${m.email} ${roleName(m.role_id)}`}
            searchPlaceholder="Search members…"
            defaultSort={{ key: 'name', dir: 'asc' }}
            pageSize={25}
            actions={(m) =>
              editable &&
              !isSelf(m) && (
                <button className="icon-btn !h-8 !w-8 text-danger" title="Remove from organisation" disabled={lockedOwner(m)} onClick={() => remove(m)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )
            }
            renderCard={(m) => (
              <>
                <CardTitle
                  title={
                    <span className="inline-flex items-center gap-1.5">
                      {m.name} {isSelf(m) && <Badge tone="primary">You</Badge>}
                    </span>
                  }
                  subtitle={m.email}
                  right={<Badge tone={m.status === 'active' ? 'success' : 'warning'}>{m.status === 'active' ? 'Active' : 'Suspended'}</Badge>}
                />
                <CardRow label="Role">
                  {editable && !isSelf(m) ? (
                    <select className="select !min-h-9 !py-1 w-auto text-sm" value={m.role_id} disabled={busyId === m.id || lockedOwner(m)} onChange={(e) => changeRole(m, e.target.value)}>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    roleName(m.role_id)
                  )}
                </CardRow>
                {editable && !isSelf(m) && (
                  <CardRow label="Access">
                    <Switch checked={m.status === 'active'} onChange={(v) => toggleStatus(m, v)} disabled={busyId === m.id || (m.status === 'active' && lockedOwner(m))} label="Active" />
                  </CardRow>
                )}
              </>
            )}
          />
        )}
      </SettingsCard>

      <SettingsCard title="Invitations" description="Links are valid for 7 days and can be used once.">
        <Note className="mb-4">
          No email is sent automatically. After creating an invitation, copy the link (or use the email button) and send it to the person yourself. They sign up or sign in with the invited address and accept.
        </Note>
        {invitations.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No invitations yet.</p>
        ) : (
          <DataTable
            rows={invitations}
            columns={inviteColumns}
            rowKey={(i) => i.id}
            search={(i) => `${i.email} ${roleName(i.role_id)} ${inviteStatus(i)}`}
            searchPlaceholder="Search invitations…"
            defaultSort={{ key: 'expires', dir: 'desc' }}
            actions={inviteActions}
            renderCard={(i) => (
              <>
                <CardTitle title={i.email} subtitle={roleName(i.role_id)} right={<Badge tone={statusTone(inviteStatus(i))}>{inviteStatus(i)}</Badge>} />
                <CardRow label="Expires">{formatDateTime(i.expires_at)}</CardRow>
              </>
            )}
          />
        )}
      </SettingsCard>

      <InviteModal
        open={inviteOpen}
        roles={roles}
        onClose={() => setInviteOpen(false)}
        onCreated={(inv) => {
          setInviteOpen(false)
          setShare(inv)
          router.refresh()
        }}
      />
      <ShareModal invitation={share} roleName={share ? roleName(share.role_id) : ''} orgName={org.name} onClose={() => setShare(null)} />
    </div>
  )
}

function InviteModal({ open, roles, onClose, onCreated }: { open: boolean; roles: RoleLite[]; onClose: () => void; onCreated: (inv: Invitation) => void }) {
  const defaultRole = roles.find((r) => !r.is_system)?.id ?? roles[0]?.id ?? ''
  const [form, setForm] = useState({ email: '', role_id: defaultRole })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [wasOpen, setWasOpen] = useState(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setForm({ email: '', role_id: defaultRole })
      setError(null)
      setErrors({})
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await createInvitationAction(form)
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
      title="Invite a team member"
      subtitle="Creates a link you share with them."
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="btn-primary" form="invite-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Create invitation'}
          </button>
        </div>
      }
    >
      <form id="invite-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Email" type="email" required autoFocus value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} placeholder="name@example.com" containerClassName="sm:col-span-2" hint="They must sign up or sign in with exactly this address." />
          <SelectField label="Role" required value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} options={roles.map((r) => ({ value: r.id, label: r.name }))} error={errors.role_id} containerClassName="sm:col-span-2" />
        </FormGrid>
      </form>
    </Modal>
  )
}

function ShareModal({ invitation, roleName, orgName, onClose }: { invitation: Invitation | null; roleName: string; orgName: string; onClose: () => void }) {
  const toast = useToast()
  // Only rendered after a user action, so reading the origin on the client is safe.
  const [origin] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''))
  const [copied, setCopied] = useState(false)
  const [key, setKey] = useState<string | null>(null)
  const invKey = invitation?.id ?? null
  if (invKey !== key) {
    setKey(invKey)
    setCopied(false)
  }

  if (!invitation) return null
  const url = `${origin}/invite/${invitation.token}`
  const expires = formatDateTime(invitation.expires_at)
  const subject = `Invitation to join ${orgName} on ${APP_NAME}`
  const body = `Hi,\n\nYou are invited to join ${orgName} on ${APP_NAME} as ${roleName}.\n\nOpen this link to accept (valid until ${expires}):\n${url}\n\nSign up or sign in with this email address (${invitation.email}) to accept.\n`
  const mailto = `mailto:${encodeURIComponent(invitation.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.')
    }
  }

  return (
    <Modal
      open={!!invitation}
      onClose={onClose}
      title="Share the invitation"
      subtitle={`${invitation.email} · ${roleName}`}
      size="sm"
      footer={
        <div className="flex justify-end">
          <button className="btn-primary" onClick={onClose} type="button">
            Done
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Note>
          Send this link to {invitation.email}. It works once and expires {expires}. No email has been sent automatically.
        </Note>
        <div>
          <div className="label">Invitation link</div>
          <div className="flex gap-2">
            <input className="input flex-1 text-xs" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="btn-secondary shrink-0" onClick={copy}>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <a href={mailto} className="btn-primary w-full">
          <Mail className="h-4 w-4" /> Open in your email app
        </a>
      </div>
    </Modal>
  )
}
