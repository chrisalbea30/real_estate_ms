'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, DoorOpen, Home, MapPin, Pencil, Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { TextField, SelectField, TextareaField, CheckboxField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { Note } from '@/components/settings/SettingsCard'
import { timezoneOptions } from '@/components/settings/constants'
import { cn } from '@/lib/format'
import { switchPropertyAction } from '@/app/(app)/app/actions'
import { savePropertyAction } from '@/app/(app)/app/settings/actions'
import type { Property } from '@/lib/types'

export function PropertiesClient({ properties, currentId }: { properties: Property[]; currentId: string }) {
  const { can } = useApp()
  const editable = can('settings', 'edit')
  const [editing, setEditing] = useState<Partial<Property> | null>(null)
  const [pending, start] = useTransition()
  const activeCount = properties.filter((p) => p.active).length

  return (
    <div>
      <PageHeader
        title="Properties"
        subtitle={`${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} · ${activeCount} active`}
        actions={
          editable && (
            <button className="btn-primary" onClick={() => setEditing({ name: '', timezone: properties.find((p) => p.id === currentId)?.timezone ?? 'UTC', address: '', active: true })}>
              <Plus className="h-4 w-4" /> Add property
            </button>
          )
        }
      />
      <Note className="mb-5">
        Bookings, rooms, tasks and other property-level records belong to the property selected in the workspace switcher. Rooms are configured in{' '}
        <Link href="/app/rooms" className="font-medium underline">
          Rooms
        </Link>
        .
      </Note>

      {properties.length === 0 ? (
        <EmptyState icon={Home} title="No properties" description="Add your first property to start." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {properties.map((p) => {
            const current = p.id === currentId
            return (
              <div key={p.id} className={cn('card p-4', current && 'border-primary ring-4 ring-primary/10')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold">{p.name}</span>
                      {current && <Badge tone="primary">Current</Badge>}
                      {!p.active && <Badge>Inactive</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-muted">{p.timezone}</div>
                    {p.address && (
                      <div className="mt-1 flex items-start gap-1 text-xs text-ink-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                        <span className="whitespace-pre-line">{p.address}</span>
                      </div>
                    )}
                  </div>
                  {editable && (
                    <button className="icon-btn !h-8 !w-8 shrink-0" onClick={() => setEditing(p)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {current ? (
                    <Link href="/app/rooms" className="btn-secondary btn-sm">
                      <DoorOpen className="h-4 w-4" /> Manage rooms
                    </Link>
                  ) : p.active ? (
                    <button className="btn-secondary btn-sm" disabled={pending} onClick={() => start(() => switchPropertyAction(p.id))}>
                      {pending ? <Spinner size="sm" /> : <ArrowLeftRight className="h-4 w-4" />} Switch to this property
                    </button>
                  ) : (
                    <span className="text-xs text-muted">Hidden from the switcher while inactive.</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <PropertyModal property={editing} onClose={() => setEditing(null)} lastActive={activeCount <= 1} />
    </div>
  )
}

function PropertyModal({ property, onClose, lastActive }: { property: Partial<Property> | null; onClose: () => void; lastActive: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ name: '', timezone: 'UTC', address: '', active: true })
  const [key, setKey] = useState<string | null>(null)

  const propKey = property ? `${property.id ?? 'new'}` : null
  if (propKey !== key) {
    setKey(propKey)
    setForm({ name: property?.name ?? '', timezone: property?.timezone ?? 'UTC', address: property?.address ?? '', active: property?.active ?? true })
    setError(null)
    setErrors({})
  }

  const cannotDeactivate = !!property?.id && !!property.active && lastActive

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const res = await savePropertyAction({ id: property?.id, name: form.name, timezone: form.timezone, address: form.address, active: form.active })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(property?.id ? 'Property updated' : 'Property added')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!property}
      onClose={onClose}
      title={property?.id ? 'Edit property' : 'Add property'}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="btn-primary" form="property-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Save'}
          </button>
        </div>
      }
    >
      <form id="property-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="Seaview Resort" containerClassName="sm:col-span-2" autoFocus />
          <SelectField label="Timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} options={timezoneOptions(form.timezone)} error={errors.timezone} hint="Sets “today” for arrivals and departures." containerClassName="sm:col-span-2" />
          <TextareaField label="Address" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} error={errors.address} containerClassName="sm:col-span-2" />
          <CheckboxField
            className="sm:col-span-2"
            label="Active"
            description={cannotDeactivate ? 'This is the only active property and cannot be deactivated.' : 'Inactive properties are hidden from the workspace switcher; their data is kept.'}
            checked={form.active}
            onChange={(v) => setForm({ ...form, active: v })}
            disabled={cannotDeactivate}
          />
        </FormGrid>
      </form>
    </Modal>
  )
}
