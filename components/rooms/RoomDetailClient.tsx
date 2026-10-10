'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Flame, Package, ImagePlus, X } from 'lucide-react'
import { PageHeader, Section } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { TextField, SelectField, TextareaField, FormGrid, FormError } from '@/components/ui/Field'
import { FileUpload } from '@/components/ui/FileUpload'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { fileHref } from '@/lib/storage'
import { daysBetween, formatDate } from '@/lib/format'
import { addRoomPhotoAction, deleteRoomPhotoAction, saveInventoryAction, deleteInventoryAction, saveExtinguisherAction, deleteExtinguisherAction } from '@/app/(app)/app/rooms/actions'
import type { Room, RoomPhoto, RoomInventory, FireExtinguisher, Guest } from '@/lib/types'

type StayRow = Pick<Guest, 'id' | 'guest_name' | 'check_in' | 'check_out' | 'amount_thb_stay' | 'payment' | 'room' | 'room_id'>

export function extinguisherStatus(expiry: string, today: string, warnDays: number) {
  const days = daysBetween(today, expiry)
  if (days < 0) return { label: `Expired ${-days}d ago`, tone: 'danger' as const, days }
  if (days <= 7) return { label: `${days}d left`, tone: 'danger' as const, days }
  if (days <= warnDays) return { label: `${days}d left`, tone: 'warning' as const, days }
  return { label: `${days}d left`, tone: 'success' as const, days }
}

export function RoomDetailClient({ room, photos, inventory, extinguishers, guests, today }: { room: Room; photos: RoomPhoto[]; inventory: RoomInventory[]; extinguishers: FireExtinguisher[]; guests: StayRow[]; today: string }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can, fmt, categories, settings } = useApp()
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [item, setItem] = useState<Partial<RoomInventory> | null>(null)
  const [ext, setExt] = useState<Partial<FireExtinguisher> | null>(null)

  const current = guests.find((g) => g.check_in <= today && g.check_out > today)
  const upcoming = guests.filter((g) => g.check_in > today).slice(0, 5)
  const warnDays = settings.alerts?.fire_extinguisher_days ?? 30
  const expiringSoon = extinguishers.filter((e) => daysBetween(today, e.expiry_date) <= warnDays).length

  const byCategory = inventory.reduce<Record<string, RoomInventory[]>>((acc, it) => {
    ;(acc[it.category] ||= []).push(it)
    return acc
  }, {})

  const removePhoto = async (p: RoomPhoto) => {
    if (!(await confirm({ title: 'Remove photo?', confirmLabel: 'Remove', danger: true }))) return
    const res = await deleteRoomPhotoAction(p.id)
    if (!res.ok) return toast.error(res.error)
    router.refresh()
  }

  const removeItem = async (it: RoomInventory) => {
    if (!(await confirm({ title: `Delete ${it.name}?`, confirmLabel: 'Delete', danger: true }))) return
    const res = await deleteInventoryAction(it.id, room.id)
    if (!res.ok) return toast.error(res.error)
    router.refresh()
  }

  const removeExt = async (e: FireExtinguisher) => {
    if (!(await confirm({ title: 'Delete extinguisher record?', confirmLabel: 'Delete', danger: true }))) return
    const res = await deleteExtinguisherAction(e.id, room.id)
    if (!res.ok) return toast.error(res.error)
    router.refresh()
  }

  return (
    <div>
      <PageHeader
        title={room.name}
        subtitle={`Room ${room.number}${room.active ? '' : ' · inactive'}`}
        backHref="/app/rooms"
        actions={current ? <Badge tone="info">Occupied · {current.guest_name}</Badge> : <Badge tone="success">Available tonight</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* Photos */}
          <Section title="Photos" description="Up to 5 photos. The first one is used as the thumbnail.">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {photos.map((p) => {
                const href = fileHref(p.url)
                return (
                  <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-surface-2">
                    {href && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={href} alt="" className="h-full w-full cursor-zoom-in object-cover" onClick={() => setLightbox(href)} />
                    )}
                    {can('rooms', 'edit') && (
                      <button className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100" onClick={() => removePhoto(p)} aria-label="Remove photo">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
              {can('rooms', 'edit') && photos.length < 5 && (
                <div className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-line-2 p-2">
                  <PhotoAdder roomId={room.id} />
                </div>
              )}
            </div>
          </Section>

          {/* Inventory */}
          <Section
            title="Inventory"
            description={`${inventory.length} item${inventory.length === 1 ? '' : 's'}`}
            actions={can('rooms', 'add') && (
              <button className="btn-secondary btn-sm" onClick={() => setItem({ room_id: room.id, category: categories('inventory')[0] ?? 'General', quantity: 1 })}>
                <Plus className="h-4 w-4" /> Add item
              </button>
            )}
          >
            {inventory.length === 0 ? (
              <div className="card flex items-center gap-3 p-4 text-sm text-muted">
                <Package className="h-5 w-5" /> No inventory recorded for this room.
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(byCategory).map(([cat, items]) => (
                  <div key={cat} className="card overflow-hidden">
                    <div className="bg-surface-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">{cat}</div>
                    <ul className="divide-y divide-line">
                      {items.map((it) => (
                        <li key={it.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                          <span className="w-10 shrink-0 rounded-lg bg-primary-soft px-2 py-0.5 text-center text-xs font-semibold text-primary-soft-fg tabular">×{it.quantity}</span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{it.name}</div>
                            {it.notes && <div className="truncate text-xs text-muted">{it.notes}</div>}
                          </div>
                          {can('rooms', 'edit') && (
                            <button className="icon-btn !h-8 !w-8" onClick={() => setItem(it)} aria-label="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {can('rooms', 'delete') && (
                            <button className="icon-btn !h-8 !w-8 text-danger" onClick={() => removeItem(it)} aria-label="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          {/* Fire safety */}
          <Section
            title="Fire safety"
            description={expiringSoon > 0 ? `${expiringSoon} expiring within ${warnDays} days` : 'All extinguishers in date'}
            actions={can('rooms', 'add') && (
              <button className="btn-secondary btn-sm" onClick={() => setExt({ room_id: room.id, location: 'Room' })}>
                <Plus className="h-4 w-4" /> Add
              </button>
            )}
          >
            {extinguishers.length === 0 ? (
              <div className="card flex items-center gap-3 p-4 text-sm text-muted">
                <Flame className="h-5 w-5" /> No fire extinguishers recorded.
              </div>
            ) : (
              <ul className="space-y-2">
                {extinguishers.map((e) => {
                  const s = extinguisherStatus(e.expiry_date, today, warnDays)
                  return (
                    <li key={e.id} className="card flex items-center gap-3 p-3 text-sm">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-${s.tone}-soft text-${s.tone}`}>
                        <Flame className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{e.location}{e.serial_number ? ` · ${e.serial_number}` : ''}</div>
                        <div className="text-xs text-muted">Expires {formatDate(e.expiry_date)}{e.last_inspected ? ` · inspected ${formatDate(e.last_inspected)}` : ''}</div>
                      </div>
                      <Badge tone={s.tone}>{s.label}</Badge>
                      {can('rooms', 'edit') && (
                        <button className="icon-btn !h-8 !w-8" onClick={() => setExt(e)} aria-label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {can('rooms', 'delete') && (
                        <button className="icon-btn !h-8 !w-8 text-danger" onClick={() => removeExt(e)} aria-label="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>

          {/* Guests */}
          <Section title="Current guest">
            {current ? (
              <div className="card p-4 text-sm">
                <div className="font-semibold">{current.guest_name}</div>
                <div className="text-muted">{formatDate(current.check_in)} → {formatDate(current.check_out)}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted">Balance</span>
                  <span className={(current.amount_thb_stay ?? 0) - (current.payment ?? 0) > 0 ? 'font-semibold text-danger' : 'font-semibold text-success'}>
                    {fmt((current.amount_thb_stay ?? 0) - (current.payment ?? 0))}
                  </span>
                </div>
              </div>
            ) : (
              <div className="card p-4 text-sm text-muted">Nobody is staying in this room tonight.</div>
            )}
          </Section>
          <Section title="Upcoming">
            {upcoming.length === 0 ? (
              <div className="card p-4 text-sm text-muted">No upcoming bookings.</div>
            ) : (
              <ul className="card divide-y divide-line">
                {upcoming.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{g.guest_name}</div>
                      <div className="text-xs text-muted">{formatDate(g.check_in)} → {formatDate(g.check_out)}</div>
                    </div>
                    <span className="tabular">{fmt(g.amount_thb_stay)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 p-4" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <InventoryModal item={item} onClose={() => setItem(null)} />
      <ExtinguisherModal ext={ext} onClose={() => setExt(null)} />
    </div>
  )
}

function PhotoAdder({ roomId }: { roomId: string }) {
  const router = useRouter()
  const toast = useToast()
  return (
    <div className="flex flex-col items-center gap-1 text-center text-xs text-muted">
      <ImagePlus className="h-5 w-5" />
      <FileUpload
        module="rooms"
        value={null}
        compact
        accept="image/*"
        capture
        onChange={async (path) => {
          if (!path) return
          const res = await addRoomPhotoAction(roomId, path)
          if (!res.ok) return toast.error(res.error)
          router.refresh()
        }}
      />
    </div>
  )
}

function InventoryModal({ item, onClose }: { item: Partial<RoomInventory> | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { categories } = useApp()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ name: '', category: 'General', quantity: '1', notes: '' })
  const [key, setKey] = useState<string | null>(null)
  const k = item ? item.id ?? 'new' : null
  if (k !== key) {
    setKey(k)
    setForm({ name: item?.name ?? '', category: item?.category ?? categories('inventory')[0] ?? 'General', quantity: String(item?.quantity ?? 1), notes: item?.notes ?? '' })
    setError(null)
    setErrors({})
  }
  const cats = categories('inventory')
  const options = cats.includes(form.category) ? cats : [form.category, ...cats]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item?.room_id) return
    setBusy(true)
    const res = await saveInventoryAction({ id: item.id, room_id: item.room_id, name: form.name, category: form.category, quantity: form.quantity, notes: form.notes })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success('Saved')
    onClose()
    router.refresh()
  }

  return (
    <Modal open={!!item} onClose={onClose} title={item?.id ? 'Edit item' : 'Add inventory item'} size="sm" footer={<div className="flex justify-end gap-2"><button className="btn-secondary" type="button" onClick={onClose}>Cancel</button><button className="btn-primary" form="inv-form" disabled={busy}>{busy ? <Spinner size="sm" /> : 'Save'}</button></div>}>
      <form id="inv-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Item" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} containerClassName="sm:col-span-2" placeholder="Air conditioner" />
          <SelectField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={options} />
          <TextField label="Quantity" type="number" inputMode="numeric" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} error={errors.quantity} />
          <TextareaField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} containerClassName="sm:col-span-2" rows={2} />
        </FormGrid>
      </form>
    </Modal>
  )
}

function ExtinguisherModal({ ext, onClose }: { ext: Partial<FireExtinguisher> | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ location: 'Room', serial_number: '', expiry_date: '', last_inspected: '', notes: '' })
  const [key, setKey] = useState<string | null>(null)
  const k = ext ? ext.id ?? 'new' : null
  if (k !== key) {
    setKey(k)
    setForm({ location: ext?.location ?? 'Room', serial_number: ext?.serial_number ?? '', expiry_date: ext?.expiry_date ?? '', last_inspected: ext?.last_inspected ?? '', notes: ext?.notes ?? '' })
    setError(null)
    setErrors({})
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ext?.room_id) return
    setBusy(true)
    const res = await saveExtinguisherAction({ id: ext.id, room_id: ext.room_id, ...form })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success('Saved')
    onClose()
    router.refresh()
  }

  return (
    <Modal open={!!ext} onClose={onClose} title={ext?.id ? 'Edit fire extinguisher' : 'Add fire extinguisher'} size="sm" footer={<div className="flex justify-end gap-2"><button className="btn-secondary" type="button" onClick={onClose}>Cancel</button><button className="btn-primary" form="ext-form" disabled={busy}>{busy ? <Spinner size="sm" /> : 'Save'}</button></div>}>
      <form id="ext-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Location" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} error={errors.location} placeholder="Room / Corridor / Kitchen" />
          <TextField label="Serial number" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
          <TextField label="Expiry date" type="date" required value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} error={errors.expiry_date} />
          <TextField label="Last inspected" type="date" value={form.last_inspected} onChange={(e) => setForm({ ...form, last_inspected: e.target.value })} error={errors.last_inspected} />
          <TextareaField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} containerClassName="sm:col-span-2" rows={2} />
        </FormGrid>
      </form>
    </Modal>
  )
}
