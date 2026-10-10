'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, FileText, Mail, Paperclip, ExternalLink, BedDouble, LogIn, LogOut, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { DataTable, CardRow, CardTitle, type Column } from '@/components/ui/DataTable'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Chips } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { fileHref } from '@/lib/storage'
import { daysBetween, formatDate, nightsBetween } from '@/lib/format'
import { deleteGuestAction, issueInvoiceAction } from '@/app/(app)/app/guests/actions'
import { GuestModal } from '@/components/guests/GuestModal'
import type { Guest, Invoice } from '@/lib/types'

type InvoiceLite = Pick<Invoice, 'id' | 'guest_id' | 'number' | 'public_token' | 'status' | 'total' | 'balance_due'>
type StatusKey = 'all' | 'upcoming' | 'inhouse' | 'out'

export function guestStatus(g: Pick<Guest, 'check_in' | 'check_out'>, today: string): 'Upcoming' | 'In-House' | 'Checked Out' {
  if (g.check_out <= today) return 'Checked Out'
  if (g.check_in <= today) return 'In-House'
  return 'Upcoming'
}

export function balanceOf(g: Pick<Guest, 'amount_thb_stay' | 'payment'>) {
  return Number(g.amount_thb_stay ?? 0) - Number(g.payment ?? 0)
}

export function GuestsClient({ guests, invoices }: { guests: Guest[]; invoices: InvoiceLite[] }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can, fmt, today, settings, rooms } = useApp()
  const [editing, setEditing] = useState<Partial<Guest> | null>(null)
  const [status, setStatus] = useState<StatusKey>('all')

  const roomName = (g: Guest) => rooms.find((r) => r.id === g.room_id || r.number === g.room)?.name ?? `Room ${g.room}`
  const invoiceFor = (g: Guest) => invoices.find((i) => i.guest_id === g.id)

  const stats = useMemo(() => {
    const inHouse = guests.filter((g) => guestStatus(g, today) === 'In-House')
    const arriving = guests.filter((g) => g.check_in > today && daysBetween(today, g.check_in) <= (settings.alerts?.arrivals_window_days ?? 7))
    const departing = guests.filter((g) => g.check_out >= today && daysBetween(today, g.check_out) <= (settings.alerts?.departures_window_days ?? 7) && g.check_in <= today)
    const outstanding = guests.filter((g) => balanceOf(g) > 0).reduce((s, g) => s + balanceOf(g), 0)
    return { inHouse: inHouse.length, arriving: arriving.length, departing: departing.length, outstanding }
  }, [guests, today, settings])

  const filtered = useMemo(() => {
    if (status === 'all') return guests
    return guests.filter((g) => {
      const s = guestStatus(g, today)
      return status === 'upcoming' ? s === 'Upcoming' : status === 'inhouse' ? s === 'In-House' : s === 'Checked Out'
    })
  }, [guests, status, today])

  const counts = useMemo(
    () => ({
      all: guests.length,
      upcoming: guests.filter((g) => guestStatus(g, today) === 'Upcoming').length,
      inhouse: guests.filter((g) => guestStatus(g, today) === 'In-House').length,
      out: guests.filter((g) => guestStatus(g, today) === 'Checked Out').length,
    }),
    [guests, today],
  )

  const remove = async (g: Guest) => {
    const ok = await confirm({ title: `Delete booking for ${g.guest_name}?`, message: 'The linked revenue row and ledger movements are removed too. Issued invoices are kept for the record.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    const res = await deleteGuestAction(g.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Booking deleted')
    router.refresh()
  }

  const openInvoice = async (g: Guest, mode: 'view' | 'email') => {
    let inv = invoiceFor(g)
    if (!inv) {
      const res = await issueInvoiceAction(g.id)
      if (!res.ok) return toast.error(res.error)
      inv = res.data
      router.refresh()
    }
    const url = `${window.location.origin}/i/${inv.public_token}`
    if (mode === 'view') {
      window.open(url, '_blank', 'noopener')
    } else {
      const subject = encodeURIComponent(`Invoice ${inv.number}`)
      const body = encodeURIComponent(`Dear ${g.guest_name},\n\nPlease find your invoice ${inv.number} here:\n${url}\n\nThank you for staying with us.`)
      window.location.assign(`mailto:${g.email ?? ''}?subject=${subject}&body=${body}`)
    }
  }

  const columns: Column<Guest>[] = [
    { key: 'room', header: 'Room', cell: (g) => <span className="font-medium">{roomName(g)}</span>, sortValue: (g) => g.room, width: '7rem' },
    {
      key: 'guest',
      header: 'Guest',
      cell: (g) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{g.guest_name}</span>
            {g.file_url && <Paperclip className="h-3.5 w-3.5 text-muted" />}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            <Badge tone={statusTone(guestStatus(g, today))}>{guestStatus(g, today)}</Badge>
            {g.booking_source && <Badge>{g.booking_source}</Badge>}
            <Badge tone={g.tm30 ? 'success' : 'warning'}>TM30 {g.tm30 ? 'filed' : 'pending'}</Badge>
          </div>
        </div>
      ),
      sortValue: (g) => g.guest_name,
    },
    { key: 'check_in', header: 'Check-in', cell: (g) => formatDate(g.check_in), sortValue: (g) => g.check_in, hide: 'lg' },
    { key: 'check_out', header: 'Check-out', cell: (g) => formatDate(g.check_out), sortValue: (g) => g.check_out, hide: 'lg' },
    { key: 'nights', header: 'Nights', cell: (g) => nightsBetween(g.check_in, g.check_out), sortValue: (g) => nightsBetween(g.check_in, g.check_out), align: 'right', hide: 'xl' },
    { key: 'total', header: 'Total', cell: (g) => fmt(g.amount_thb_stay), sortValue: (g) => g.amount_thb_stay ?? 0, align: 'right' },
    { key: 'paid', header: 'Paid', cell: (g) => fmt(g.payment), sortValue: (g) => g.payment ?? 0, align: 'right', hide: 'lg' },
    {
      key: 'balance',
      header: 'Balance',
      cell: (g) => <span className={balanceOf(g) > 0 ? 'font-semibold text-danger' : 'text-success'}>{fmt(balanceOf(g))}</span>,
      sortValue: (g) => balanceOf(g),
      align: 'right',
    },
    {
      key: 'flags',
      header: 'Flags',
      cell: (g) => (
        <div className="flex gap-1">
          {g.add_to_revenue && <Badge tone="primary">Revenue</Badge>}
          {g.show_on_legal && <Badge tone="info">Legal</Badge>}
        </div>
      ),
      hide: 'xl',
    },
  ]

  const actions = (g: Guest) => (
    <>
      <button className="icon-btn !h-8 !w-8" title={invoiceFor(g) ? `Invoice ${invoiceFor(g)!.number}` : 'Create invoice'} onClick={() => openInvoice(g, 'view')}>
        <FileText className="h-4 w-4" />
      </button>
      <button className="icon-btn !h-8 !w-8" title="Email invoice" onClick={() => openInvoice(g, 'email')}>
        <Mail className="h-4 w-4" />
      </button>
      {g.file_url && (
        <a className="icon-btn !h-8 !w-8" title="Open attachment" href={fileHref(g.file_url)!} target="_blank" rel="noreferrer">
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
      {can('guests', 'edit') && (
        <button className="icon-btn !h-8 !w-8" title="Edit" onClick={() => setEditing(g)}>
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {can('guests', 'delete') && (
        <button className="icon-btn !h-8 !w-8 text-danger" title="Delete" onClick={() => remove(g)}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </>
  )

  return (
    <div>
      <PageHeader
        title="Guests"
        subtitle={`${guests.length} booking${guests.length === 1 ? '' : 's'}`}
        actions={
          <>
            {settings.external_links?.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
                <ExternalLink className="h-4 w-4" /> {l.label}
              </a>
            ))}
            {can('guests', 'add') && (
              <button className="btn-primary" onClick={() => setEditing({})}>
                <Plus className="h-4 w-4" /> Add booking
              </button>
            )}
          </>
        }
      />

      <StatGrid className="mb-5">
        <StatCard label="In-house" value={stats.inHouse} icon={BedDouble} tone="info" onClick={() => setStatus('inhouse')} active={status === 'inhouse'} />
        <StatCard label={`Arriving ${settings.alerts?.arrivals_window_days ?? 7}d`} value={stats.arriving} icon={LogIn} tone="success" onClick={() => setStatus('upcoming')} active={status === 'upcoming'} />
        <StatCard label={`Departing ${settings.alerts?.departures_window_days ?? 7}d`} value={stats.departing} icon={LogOut} tone="warning" />
        <StatCard label="Outstanding" value={fmt(stats.outstanding)} icon={Wallet} tone={stats.outstanding > 0 ? 'danger' : 'default'} />
      </StatGrid>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(g) => g.id}
        search={(g) => `${g.guest_name} ${g.room} ${roomName(g)} ${g.email ?? ''} ${g.phone ?? ''} ${g.passport_number ?? ''} ${g.booking_source ?? ''}`}
        searchPlaceholder="Search guest, room, email, passport…"
        defaultSort={{ key: 'check_in', dir: 'desc' }}
        toolbar={
          <Chips
            value={status}
            onChange={setStatus}
            options={[
              { key: 'all', label: 'All', badge: counts.all },
              { key: 'upcoming', label: 'Upcoming', badge: counts.upcoming },
              { key: 'inhouse', label: 'In-house', badge: counts.inhouse },
              { key: 'out', label: 'Checked out', badge: counts.out },
            ]}
          />
        }
        actions={actions}
        exportName="guests"
        exportRow={(g) => ({
          Room: roomName(g),
          Guest: g.guest_name,
          'Check-In': g.check_in,
          'Check-Out': g.check_out,
          Nights: nightsBetween(g.check_in, g.check_out),
          'Stay Total': g.amount_thb_stay ?? 0,
          Paid: g.payment ?? 0,
          Balance: balanceOf(g),
          'Payment Method': g.paid ?? '',
          'Booking Source': g.booking_source ?? '',
          'Pay 1 Date': g.payment_1_date ?? '',
          'Pay 1 Amount': g.payment_1_amount ?? '',
          'Pay 2 Date': g.payment_2_date ?? '',
          'Pay 2 Amount': g.payment_2_amount ?? '',
          'Pay 3 Date': g.payment_3_date ?? '',
          'Pay 3 Amount': g.payment_3_amount ?? '',
          Email: g.email ?? '',
          Phone: g.phone ?? '',
          Passport: g.passport_number ?? '',
          TM30: g.tm30 ? 'Filed' : 'Pending',
          'Add to Revenue': g.add_to_revenue ? 'Yes' : 'No',
          'Show on Legal': g.show_on_legal ? 'Yes' : 'No',
          Attachment: g.file_url ?? '',
          Notes: g.notes ?? '',
        })}
        footer={(rows) => (
          <div className="flex flex-wrap justify-between gap-2 tabular">
            <span className="text-muted">{rows.length} bookings</span>
            <span>
              Total <strong>{fmt(rows.reduce((s, g) => s + Number(g.amount_thb_stay ?? 0), 0))}</strong> · Paid <strong>{fmt(rows.reduce((s, g) => s + Number(g.payment ?? 0), 0))}</strong> · Balance{' '}
              <strong className="text-danger">{fmt(rows.reduce((s, g) => s + Math.max(0, balanceOf(g)), 0))}</strong>
            </span>
          </div>
        )}
        renderCard={(g) => (
          <>
            <CardTitle title={g.guest_name} subtitle={`${roomName(g)} · ${g.booking_source ?? 'Direct'}`} right={<Badge tone={statusTone(guestStatus(g, today))}>{guestStatus(g, today)}</Badge>} />
            <CardRow label="Stay">
              {formatDate(g.check_in)} → {formatDate(g.check_out)} · {nightsBetween(g.check_in, g.check_out)}n
            </CardRow>
            <CardRow label="Total">{fmt(g.amount_thb_stay)}</CardRow>
            <CardRow label="Balance">
              <span className={balanceOf(g) > 0 ? 'text-danger' : 'text-success'}>{fmt(balanceOf(g))}</span>
            </CardRow>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge tone={g.tm30 ? 'success' : 'warning'}>TM30 {g.tm30 ? 'filed' : 'pending'}</Badge>
              {g.add_to_revenue && <Badge tone="primary">Revenue</Badge>}
              {g.show_on_legal && <Badge tone="info">Legal</Badge>}
            </div>
          </>
        )}
      />

      <GuestModal guest={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
