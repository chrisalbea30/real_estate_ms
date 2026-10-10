import { ChevronDown } from 'lucide-react'

const ITEMS = [
  {
    q: 'Is this a booking engine or channel manager?',
    a: 'No. It is the back office: you record bookings that arrive from your channels or directly, and the system turns them into occupancy, revenue, invoices and reports. It works alongside Booking.com, Agoda, Airbnb or a channel manager.',
  },
  {
    q: 'How does revenue stay accurate?',
    a: 'Revenue has one table. A booking flagged "Add to revenue" creates exactly one revenue row dated by check-out and valued at the total stay. Manual income is added separately. Every dashboard sums that same table, so numbers never disagree.',
  },
  {
    q: 'What does receipt scanning do?',
    a: 'Photograph a receipt from your phone. The scanner reads the supplier, date, amount, currency, document number and category and pre-fills the expense form for you to confirm. The image is attached to the expense.',
  },
  {
    q: 'Can my accountant and lawyer use it?',
    a: 'Yes. Invite them with the Finance or Legal role. They see only what is shared with them, can mark expenses as accepted, needing clarification or rejected, and export the legal report for any month.',
  },
  {
    q: 'Can I run more than one property?',
    a: 'An organisation can hold several properties, each with its own rooms, timezone and calendar. Finance and partner reporting is kept at organisation level.',
  },
  {
    q: 'Is my data isolated from other customers?',
    a: 'Every row carries your organisation id and the database enforces row-level security on every table. Files live in a private bucket under your organisation prefix and are served through short-lived signed links. Stored third-party logins are encrypted.',
  },
  {
    q: 'Does it work on a phone?',
    a: 'It was designed on a phone first. Install it from the browser menu and it opens like an app with a bottom navigation bar, large touch targets and forms that work one-handed.',
  },
]

export function FAQ() {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {ITEMS.map((it) => (
        <details key={it.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-medium text-ink marker:hidden [&::-webkit-details-marker]:hidden">
            {it.q}
            <ChevronDown className="h-4 w-4 shrink-0 text-muted transition group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5 text-sm leading-relaxed text-ink-2">{it.a}</div>
        </details>
      ))}
    </div>
  )
}
