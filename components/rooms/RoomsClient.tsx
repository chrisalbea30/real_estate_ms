'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DoorOpen, Plus, Pencil, Trash2, ImageOff } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { TextField, CheckboxField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { fileHref } from '@/lib/storage'
import { saveRoomAction, deleteRoomAction } from '@/app/(app)/app/rooms/actions'
import type { Room, RoomPhoto, Guest } from '@/lib/types'

type InHouse = Pick<Guest, 'id' | 'room' | 'room_id' | 'guest_name' | 'check_in' | 'check_out'>

export function RoomsClient({ rooms, photos, inHouse }: { rooms: Room[]; photos: RoomPhoto[]; inHouse: InHouse[] }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can } = useApp()
  const [editing, setEditing] = useState<Partial<Room> | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const thumb = (roomId: string) => photos.find((p) => p.room_id === roomId)
  const occupant = (r: Room) => inHouse.find((g) => g.room_id === r.id || g.room === r.number)
  const list = rooms.filter((r) => showInactive || r.active)
  const activeCount = rooms.filter((r) => r.active).length
  const occupiedCount = rooms.filter((r) => r.active && occupant(r)).length

  const remove = async (r: Room) => {
    const ok = await confirm({ title: `Delete ${r.name}?`, message: 'Photos, inventory and fire-safety records of this room are deleted too. Bookings keep their room number.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    const res = await deleteRoomAction(r.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Room deleted')
    router.refresh()
  }

  return (
    <div>
      <PageHeader
        title="Rooms"
        subtitle={`${activeCount} active · ${occupiedCount} occupied tonight`}
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              Show inactive
            </label>
            {can('rooms', 'add') && (
              <button className="btn-primary" onClick={() => setEditing({ number: (rooms.reduce((m, r) => Math.max(m, r.number), 0) || 0) + 1, name: '', active: true })}>
                <Plus className="h-4 w-4" /> Add room
              </button>
            )}
          </>
        }
      />

      {list.length === 0 ? (
        <EmptyState icon={DoorOpen} title="No rooms yet" description="Add your rooms to start recording bookings and the occupancy calendar." action={can('rooms', 'add') && <button className="btn-primary" onClick={() => setEditing({ number: 1, name: 'Room 1', active: true })}>Add first room</button>} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((r) => {
            const p = thumb(r.id)
            const g = occupant(r)
            const href = p ? fileHref(p.url) : null
            return (
              <div key={r.id} className="card group relative overflow-hidden">
                <Link href={`/app/rooms/${r.id}`} className="block">
                  <div className="aspect-[4/3] bg-surface-2">
                    {href ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={href} alt={r.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted/50">
                        <ImageOff className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{r.name}</div>
                        <div className="text-xs text-muted">No. {r.number}</div>
                      </div>
                      {!r.active ? <Badge>Inactive</Badge> : g ? <Badge tone="info">Occupied</Badge> : <Badge tone="success">Available</Badge>}
                    </div>
                    {g && <div className="mt-1 truncate text-xs text-muted">{g.guest_name} · until {g.check_out.slice(5)}</div>}
                  </div>
                </Link>
                {(can('rooms', 'edit') || can('rooms', 'delete')) && (
                  <div className="absolute right-2 top-2 flex gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                    {can('rooms', 'edit') && (
                      <button className="icon-btn !h-8 !w-8 bg-surface/90 shadow" onClick={() => setEditing(r)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {can('rooms', 'delete') && (
                      <button className="icon-btn !h-8 !w-8 bg-surface/90 text-danger shadow" onClick={() => remove(r)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <RoomModal room={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function RoomModal({ room, onClose }: { room: Partial<Room> | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ number: '', name: '', active: true })
  const [key, setKey] = useState<string | null>(null)

  // Reset the form whenever a different room is opened.
  const roomKey = room ? `${room.id ?? 'new'}-${room.number}` : null
  if (roomKey !== key) {
    setKey(roomKey)
    setForm({ number: String(room?.number ?? ''), name: room?.name ?? '', active: room?.active ?? true })
    setError(null)
    setErrors({})
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const res = await saveRoomAction({ id: room?.id, number: form.number, name: form.name, active: form.active })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(room?.id ? 'Room updated' : 'Room added')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!room}
      onClose={onClose}
      title={room?.id ? 'Edit room' : 'Add room'}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose} type="button">Cancel</button>
          <button className="btn-primary" form="room-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Save'}
          </button>
        </div>
      }
    >
      <form id="room-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Room number" type="number" inputMode="numeric" required value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} error={errors.number} />
          <TextField label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="Garden Villa" />
          <CheckboxField className="sm:col-span-2" label="Active" description="Inactive rooms are hidden from booking forms and the calendar." checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
        </FormGrid>
      </form>
    </Modal>
  )
}
