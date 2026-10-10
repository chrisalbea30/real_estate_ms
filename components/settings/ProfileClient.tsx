'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, Check, Eye, EyeOff, LogOut, Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { TextField, FormGrid, FormError } from '@/components/ui/Field'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { SettingsCard, SaveRow, Note } from '@/components/settings/SettingsCard'
import { passwordStrength } from '@/lib/schemas/settings'
import { cn, titleCase } from '@/lib/format'
import { signOutAction } from '@/app/(app)/app/actions'
import { changePasswordAction, updateProfileAction } from '@/app/(app)/app/settings/actions'

type OrgRow = { id: string; name: string; plan: string; role: string; current: boolean }

export function ProfileClient({ email, fullName, displayName, orgs }: { email: string; fullName: string; displayName: string; orgs: OrgRow[] }) {
  const { can, user } = useApp()
  return (
    <div>
      <PageHeader title="Your profile" subtitle="Your name, password and appearance. These apply to you in every organisation." />

      <div className="mb-5 flex items-center gap-3">
        <Avatar name={fullName || displayName || email} size="lg" />
        <div className="min-w-0">
          <div className="truncate font-semibold">{fullName || displayName || user.name}</div>
          <div className="truncate text-sm text-muted">{email}</div>
        </div>
      </div>

      <NameCard fullName={fullName} displayName={displayName} canEditMembership={can('settings', 'edit')} />

      <SettingsCard title="Email" description="Your sign-in address. Contact support to change it.">
        <TextField label="Email" value={email} readOnly className="bg-surface-2 text-muted" containerClassName="sm:max-w-md" />
      </SettingsCard>

      <PasswordCard />

      <SettingsCard title="Appearance" description="Light, dark or follow your device. Saved in this browser only.">
        <ThemeToggle />
      </SettingsCard>

      <SettingsCard
        title="Your organisations"
        description="Everything you are a member of. Switch from the workspace menu at the top of the app."
        actions={
          <Link href="/onboarding" className="btn-secondary btn-sm">
            <Plus className="h-4 w-4" /> New organisation
          </Link>
        }
      >
        <ul className="divide-y divide-line">
          {orgs.map((o) => (
            <li key={o.id} className="flex items-center gap-3 py-3">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', o.current ? 'bg-primary-soft text-primary-soft-fg' : 'bg-surface-2 text-muted')}>
                <Building2 className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{o.name}</span>
                  {o.current && (
                    <Badge tone="primary">
                      <Check className="h-3 w-3" /> Current
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted">
                  {o.role} · {titleCase(o.plan)} plan
                </div>
              </div>
            </li>
          ))}
        </ul>
      </SettingsCard>

      <SettingsCard title="Sign out" description="Sign out of this device. Your data stays where it is.">
        <form action={signOutAction}>
          <button className="btn-secondary">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </SettingsCard>
    </div>
  )
}

function NameCard({ fullName, displayName, canEditMembership }: { fullName: string; displayName: string; canEditMembership: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const [name, setName] = useState(fullName || displayName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const dirty = name.trim() !== (fullName || displayName)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await updateProfileAction({ full_name: name })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    setErrors({})
    toast.success('Name updated')
    router.refresh()
  }

  return (
    <SettingsCard
      title="Display name"
      description={canEditMembership ? 'Shown to your team and on records you create.' : 'Shown on your profile. The name your team sees in this organisation is set by an administrator.'}
      footer={<SaveRow busy={busy} dirty={dirty} form="profile-name-form" />}
    >
      <form id="profile-name-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Full name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.full_name} placeholder="Your name" autoComplete="name" />
          {displayName && displayName !== fullName && (
            <TextField label="Name in this organisation" value={displayName} readOnly className="bg-surface-2 text-muted" hint="Set when you joined; updated with your full name when you have settings access." />
          )}
        </FormGrid>
      </form>
    </SettingsCard>
  )
}

function PasswordCard() {
  const toast = useToast()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const strength = passwordStrength(form.next)
  const dirty = !!(form.current || form.next || form.confirm)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setErrors({})
    const res = await changePasswordAction(form)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    setForm({ current: '', next: '', confirm: '' })
    toast.success('Password changed')
  }

  const type = show ? 'text' : 'password'
  const tone = strength.label === 'Strong' ? 'bg-success' : strength.label === 'Good' ? 'bg-warning' : 'bg-danger'

  return (
    <SettingsCard
      title="Change password"
      description="At least 8 characters. Mixing capitals, numbers and symbols makes it stronger."
      actions={
        <button type="button" className="btn-ghost btn-sm" onClick={() => setShow((s) => !s)}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {show ? 'Hide' : 'Show'}
        </button>
      }
      footer={<SaveRow busy={busy} dirty={dirty} form="profile-password-form" label="Update password" hint={dirty ? 'You stay signed in on this device.' : 'Enter your current password to begin.'} />}
    >
      <form id="profile-password-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Current password" type={type} required value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} error={errors.current} autoComplete="current-password" containerClassName="sm:col-span-2" />
          <TextField label="New password" type={type} required minLength={8} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} error={errors.next} autoComplete="new-password" />
          <TextField label="Confirm new password" type={type} required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={errors.confirm} autoComplete="new-password" />
          {form.next && (
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1" aria-hidden>
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={cn('h-1.5 flex-1 rounded-full transition', n <= strength.score ? tone : 'bg-line-2')} />
                  ))}
                </div>
                <span className={cn('text-xs font-semibold', strength.label === 'Strong' ? 'text-success' : strength.label === 'Good' ? 'text-warning' : 'text-danger')}>{strength.label}</span>
              </div>
              <p className="mt-1 text-xs text-muted">Strength counts capitals (A-Z), numbers (0-9) and symbols.</p>
            </div>
          )}
          <Note className="sm:col-span-2">Forgot the current one? Sign out and use “Forgot password” on the login page.</Note>
        </FormGrid>
      </form>
    </SettingsCard>
  )
}
