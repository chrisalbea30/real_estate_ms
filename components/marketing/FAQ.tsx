import { ChevronDown } from 'lucide-react'
import { PLANS, TRIAL_DAYS } from '@/lib/plans'

const ITEMS = [
  {
    q: 'How is the price worked out?',
    a: `You pay per workspace, and each plan includes a number of people: ${PLANS.starter.seats} on Starter and ${PLANS.growth.seats} on Growth. If more people need to sign in, each extra person is added for a small monthly amount. Every plan includes every screen, so you never pay more to unlock a feature.`,
  },
  {
    q: 'What is a workspace, and who counts as a person?',
    a: 'A workspace is one business with its own data, team and settings. A person is anyone who can sign in to it, plus any invitation you have sent that is still waiting. Guests, suppliers and partners you only keep records about do not count.',
  },
  {
    q: 'How does the free trial work?',
    a: `You get ${TRIAL_DAYS} days with everything switched on and up to ${PLANS.trial.seats} people, without giving a card. When you want to continue, tell us which plan you want and we set it up. Online card payment is not available yet, so nothing is ever charged automatically.`,
  },
  {
    q: 'Who owns the data, and can we get it out?',
    a: 'You do. Bookings, expenses and other records are not capped on any plan. You can export every list to Excel, CSV or JSON at any time. Only files such as receipts, documents and photos count towards a storage allowance.',
  },
  {
    q: 'Is this a booking engine or channel manager?',
    a: 'No. It is the back office: you record bookings that arrive from your channels or directly, and the system turns them into occupancy, revenue, invoices and reports. It works alongside Booking.com, Agoda, Airbnb or a channel manager.',
  },
  {
    q: 'How does revenue stay accurate?',
    a: 'Revenue has one list. A booking marked "Add to revenue" creates exactly one revenue line dated by check-out and valued at the total stay. Other income is added separately. Every dashboard adds up that same list, so the numbers never disagree.',
  },
  {
    q: 'What does receipt scanning do?',
    a: 'Photograph a receipt from your phone. The scanner reads the supplier, date, amount, currency, document number and category and fills in the expense form for you to check. One more tap keeps the photo with the expense.',
  },
  {
    q: 'Can my accountant and lawyer use it?',
    a: 'Yes. Invite them with the Finance or Legal role. They see only what is shared with them, can mark expenses as accepted, needing clarification or rejected, and export the legal report for any month. Each of them counts as one person on your plan.',
  },
  {
    q: 'Can I run more than one property?',
    a: `A workspace can hold several properties, each with its own rooms, timezone and calendar: ${PLANS.starter.properties} on Starter and up to ${PLANS.growth.properties} on Growth. Finance and partner reporting is kept for the workspace as a whole. A separate business is better as its own workspace.`,
  },
  {
    q: 'Is my data kept apart from other customers?',
    a: 'Yes. Every record belongs to your workspace and the database refuses to show it to anyone outside it. Files are private and open only for signed-in members. Passwords you store for other services are encrypted.',
  },
  {
    q: 'Does it work on a phone?',
    a: 'It was designed on a phone first. Add it to your home screen from the browser menu and it opens like an app, with a bottom bar, large buttons and forms you can use with one hand. It needs an internet connection.',
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
