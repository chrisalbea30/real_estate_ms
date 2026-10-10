'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { TextField, TextareaField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { saveCredentialAction } from '@/app/(app)/app/logins/actions'
import type { WebCredentialSafe } from '@/lib/schemas/logins'

const emptyForm = () => ({ service_name: '', url: '', username: '', password: '', notes: '' })
type Form = ReturnType<typeof emptyForm>

function fromCredential(c: Partial<WebCredentialSafe>): Form {
  // The password is write-only: it is never loaded into the form.
  return { ...emptyForm(), service_name: c.service_name ?? '', url: c.url ?? '', username: c.username ?? '', notes: c.notes ?? '' }
}

export function CredentialModal({ credential, onClose }: { credential: Partial<WebCredentialSafe> | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const [form, setForm] = useState<Form>(emptyForm)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [key, setKey] = useState<string | null>(null)

  // Re-initialise when a different log-in is opened.
  const k = credential ? credential.id ?? 'new' : null
  if (k !== key) {
    setKey(k)
    if (credential) setForm(fromCredential(credential))
    setShowPassword(false)
    setError(null)
    setErrors({})
  }

  const set = <K extends keyof Form>(name: K, value: Form[K]) => setForm((f) => ({ ...f, [name]: value }))
  const input = (name: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(name, e.target.value)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveCredentialAction({ id: credential?.id, ...form })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(credential?.id ? 'Log-in updated' : 'Log-in added')
    setForm(emptyForm())
    onClose()
    router.refresh()
  }

  const editing = !!credential?.id

  return (
    <Modal
      open={!!credential}
      onClose={onClose}
      title={editing ? 'Edit log-in' : 'Add log-in'}
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" form="credential-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Save'}
          </button>
        </div>
      }
    >
      <form id="credential-form" onSubmit={submit} autoComplete="off">
        <FormGrid>
          <FormError error={error} />
          <TextField label="Service" required value={form.service_name} onChange={input('service_name')} error={errors.service_name} placeholder="Booking.com extranet" autoFocus />
          <TextField label="URL" type="text" inputMode="url" value={form.url} onChange={input('url')} error={errors.url} placeholder="admin.booking.com" hint="https:// is added when missing" />
          <TextField label="Username" value={form.username} onChange={input('username')} error={errors.username} autoComplete="off" />
          <div className="relative">
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={input('password')}
              error={errors.password}
              autoComplete="new-password"
              className="pr-11"
              placeholder={editing ? 'Leave blank to keep the current password' : ''}
              hint={editing ? 'Encrypted before it is stored. Only type a value to change it.' : 'Encrypted before it is stored.'}
            />
            <button type="button" className="icon-btn absolute right-1 top-[1.65rem] !h-9 !w-9" onClick={() => setShowPassword((v) => !v)} title={showPassword ? 'Hide password' : 'Show password'} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <TextareaField label="Notes" value={form.notes} onChange={input('notes')} rows={3} containerClassName="sm:col-span-2" error={errors.notes} placeholder="Recovery email, 2FA device, who owns the account…" />
        </FormGrid>
      </form>
    </Modal>
  )
}
