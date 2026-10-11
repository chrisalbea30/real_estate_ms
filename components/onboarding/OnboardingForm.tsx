'use client'

import { useState } from 'react'
import { useBrowserTimezone } from '@/lib/hooks'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Check } from 'lucide-react'
import { createOrganizationAction } from '@/app/onboarding/actions'
import { TextField, SelectField, MoneyField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { COMMON_CURRENCIES, DEFAULT_CURRENCY } from '@/lib/currency'

const TIMEZONES = [
  'Asia/Bangkok', 'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Jakarta', 'Asia/Ho_Chi_Minh', 'Asia/Manila', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Asia/Dubai', 'Asia/Kolkata',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'Europe/Amsterdam', 'Europe/Lisbon', 'Europe/Athens',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'America/Mexico_City', 'America/Sao_Paulo',
  'Australia/Sydney', 'Australia/Perth', 'Pacific/Auckland', 'Africa/Johannesburg', 'Africa/Cairo', 'UTC',
]

export function OnboardingForm({ hasOrg }: { hasOrg: boolean }) {
  const router = useRouter()
  const [form, setForm] = useState({ org_name: '', property_name: '', timezone: '', currency: DEFAULT_CURRENCY, vat_rate: '0', room_count: '10', room_prefix: 'Room' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Empty timezone = use the browser's timezone until the user picks one.
  const browserTz = useBrowserTimezone('UTC')
  const timezone = form.timezone || browserTz

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setErrors({})
    const res = await createOrganizationAction({
      org_name: form.org_name,
      property_name: form.property_name || form.org_name,
      timezone,
      currency: form.currency,
      vat_rate: Number(form.vat_rate || 0),
      room_count: Number(form.room_count || 0),
      room_prefix: form.room_prefix,
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    router.push('/app')
    router.refresh()
  }

  const tzOptions = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES]

  return (
    <div className="animate-in">
      <div className="mb-6">
        <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-fg">
          <Building2 className="h-6 w-6" />
        </span>
        <h1 className="font-display text-3xl font-semibold text-ink">{hasOrg ? 'Create another workspace' : 'Set up your workspace'}</h1>
        <p className="mt-1 text-sm text-muted">{hasOrg ? 'A new workspace has its own data, people and settings.' : 'Takes a minute. Everything can be changed later in Settings.'}</p>
        {hasOrg && (
          <p className="mt-2 text-sm">
            <Link href="/app" className="font-medium text-primary hover:underline">← Back to your workspace</Link>
          </p>
        )}
      </div>

      <form onSubmit={submit} className="card p-5 sm:p-6">
        <FormGrid>
          <FormError error={error} />
          <TextField label="Workspace name (your business)" required value={form.org_name} onChange={set('org_name')} error={errors.org_name} placeholder="Seaview Resort Co." containerClassName="sm:col-span-2" autoFocus />
          <TextField label="First property name" value={form.property_name} onChange={set('property_name')} error={errors.property_name} placeholder="Seaview Resort" hint="Defaults to the organisation name" containerClassName="sm:col-span-2" />
          <SelectField label="Property timezone" value={timezone} onChange={set('timezone')} options={tzOptions} error={errors.timezone} />
          <SelectField label="Base currency" value={form.currency} onChange={set('currency')} options={COMMON_CURRENCIES} error={errors.currency} hint="All amounts are stored in this currency" />
          <MoneyField label="VAT rate (%)" value={form.vat_rate} onChange={set('vat_rate')} min={0} max={100} step="0.01" error={errors.vat_rate} hint="Used on invoices. Prices are treated as VAT-inclusive." />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Rooms to create" type="number" inputMode="numeric" min={0} max={200} value={form.room_count} onChange={set('room_count')} error={errors.room_count} />
            <TextField label="Room name prefix" value={form.room_prefix} onChange={set('room_prefix')} placeholder="Room" />
          </div>
        </FormGrid>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ul className="space-y-1 text-xs text-muted">
            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> You become the Owner of this workspace and can invite your people next</li>
            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Bank and Cash accounts plus payment methods are created</li>
          </ul>
          <button className="btn-primary sm:min-w-44" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Create workspace'}
          </button>
        </div>
      </form>
    </div>
  )
}
