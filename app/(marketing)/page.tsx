import type { Metadata } from 'next'
import Link from 'next/link'
import { PlayCircle, ArrowRight, BedDouble, Receipt, Banknote, Scale, Landmark, ClipboardList, ShieldCheck, Smartphone, Lock, FileSearch, Users, Sparkles, Camera, Download, History } from 'lucide-react'
import { APP_NAME, APP_TAGLINE } from '@/lib/brand'
import { HeroMock } from '@/components/marketing/HeroMock'
import { Pricing } from '@/components/marketing/Pricing'
import { FAQ } from '@/components/marketing/FAQ'
import { SHOW_PRICING, SIGNUP_CTA, TRIAL_DAYS } from '@/lib/plans'

export const metadata: Metadata = {
  title: `${APP_NAME} · ${APP_TAGLINE}`,
  description: 'Bookings, occupancy, revenue, expenses with receipt scanning, legal review, budgets and partner reporting. Mobile-first property operations for small hotels, resorts and serviced apartments.',
}

const FEATURES = [
  { icon: BedDouble, title: 'Bookings, occupancy and invoices', text: 'Record stays in seconds, see the month calendar by room, share a tax invoice by link. Split payments, deposits and balances due are tracked per booking.' },
  { icon: Camera, title: 'Receipts scanned into expenses', text: 'Snap a receipt with your phone. Supplier, date, amount, currency and category are read for you, and you can keep the photo with the expense.' },
  { icon: Banknote, title: 'One revenue table everyone trusts', text: 'A booking becomes exactly one revenue row. Manual income sits beside it. Overview, partner dashboard and budget all sum the same table.' },
  { icon: Scale, title: 'Legal and accounting review', text: 'Share expenses and bookings with your lawyer or accountant. They accept, query or reject with notes, then export the month in one click.' },
  { icon: Landmark, title: 'Budgets and partner reporting', text: 'Revenue matrix by room, OPEX and CAPEX items, rent schedule, budget vs actual, capital contributions, ownership and work hours per partner.' },
  { icon: ClipboardList, title: 'Day-to-day operations', text: "Today's arrivals and departures, tasks by department, complaints, staff hours, room inventory and fire-extinguisher expiry alerts." },
]

const FLOW = [
  { step: 'Guest', title: 'Booking recorded', text: 'Room, dates, rate, payments, passport, source. Two switches: Add to revenue, Show to legal.' },
  { step: 'Revenue', title: 'One row, automatically', text: 'Dated by check-out, valued at the total stay. Read-only on the Revenue page so it can never drift.' },
  { step: 'Legal', title: 'Shared for review', text: 'Flagged bookings and expenses appear in the Legal report with status, notes and review date.' },
  { step: 'Partners', title: 'Reported with confidence', text: 'Dashboards, budget vs actual, KPIs like occupancy, ADR and RevPAR, all from the same numbers.' },
]

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-2 lg:pb-28 lg:pt-24">
          <div className="animate-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-3 py-1 text-xs font-semibold text-gold-300">
              <Sparkles className="h-3.5 w-3.5" /> Property operations, simplified
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] text-balance sm:text-5xl lg:text-6xl">
              Run your property from your phone. Report to partners with confidence.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              {APP_NAME} replaces the shared spreadsheet: bookings, occupancy, revenue, receipts, legal review, budgets and partner reporting in one mobile-first workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="btn bg-gold-400 text-burgundy-950 hover:bg-gold-300 px-6 text-base">
                {SIGNUP_CTA} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/videos" className="btn border border-white/25 bg-white/5 text-white hover:bg-white/10 px-6 text-base">
                <PlayCircle className="h-4 w-4" /> Watch the 2-minute video
              </Link>
            </div>
            <p className="mt-4 text-sm text-white/55">{SHOW_PRICING ? `${TRIAL_DAYS}-day free trial · No card required · Priced per workspace and per person` : 'Set up in a minute · No card required'}</p>
          </div>
          <div className="animate-in [animation-delay:120ms]">
            <HeroMock />
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-xs text-white/55 sm:px-8">
            <span className="font-semibold uppercase tracking-wider text-white/40">Built for</span>
            {['Boutique hotels', 'Resorts', 'Villas', 'Hostels', 'Serviced apartments', 'Guesthouses'].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Everything the back office needs</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-balance sm:text-4xl">From check-in to the partner meeting</h2>
          <p className="mt-4 text-muted">Twenty modules that share one set of numbers, each designed to work on a phone as well as on a desk.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-pop">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-fg">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Flow */}
      <section id="how" className="bg-surface border-y border-line">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-balance sm:text-4xl">Guest → Revenue → Legal → Partners</h2>
            <p className="mt-4 text-muted">One booking flows through the whole business without being typed twice.</p>
          </div>
          <ol className="mt-12 grid gap-4 md:grid-cols-4">
            {FLOW.map((s, i) => (
              <li key={s.step} className="relative card p-6">
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-fg">
                  {i + 1} · {s.step}
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.text}</p>
                {i < FLOW.length - 1 && <ArrowRight className="absolute -right-4 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-primary md:block" />}
              </li>
            ))}
          </ol>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              { n: '1', t: 'Create your workspace', d: 'Organisation, property, timezone, currency and rooms in one short form.' },
              { n: '2', t: 'Invite your people', d: 'Send each person a link and pick their role: Owner, Manager, Finance, Legal, Partner, Staff or Viewer, or build your own.' },
              { n: '3', t: 'Work from your phone', d: 'Record bookings and receipts on the go. Partners and advisers get their dashboards on the desk.' },
            ].map((s) => (
              <div key={s.n} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-400 font-display text-sm font-semibold text-burgundy-950">{s.n}</span>
                <div>
                  <h3 className="font-semibold">{s.t}</h3>
                  <p className="mt-1 text-sm text-muted">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile */}
      <section id="mobile" className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Mobile first</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-balance sm:text-4xl">Designed on a phone, for the person who runs the place</h2>
          <p className="mt-4 text-muted">The general manager lives on a phone. Every screen, form and table was laid out for one thumb first and widened for the desk second.</p>
          <ul className="mt-8 space-y-4">
            {[
              { icon: Smartphone, t: 'Installs like an app', d: 'Add to home screen on Android and iOS. Bottom navigation, bottom-sheet forms, large touch targets.' },
              { icon: Camera, t: 'Camera-first receipts', d: 'Photograph a receipt and the expense form fills itself.' },
              { icon: Download, t: 'Exports anywhere', d: 'Every list exports to Excel, CSV, JSON or a printable PDF of exactly what you filtered.' },
              { icon: History, t: 'Nothing lost', d: 'Every change is written to an audit log your owners can read.' },
            ].map((b) => (
              <li key={b.t} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-fg">
                  <b.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{b.t}</h3>
                  <p className="mt-0.5 text-sm text-muted">{b.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-[3rem] gradient-burgundy opacity-90" />
          <div className="p-6 sm:p-10">
            <HeroMock />
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="bg-burgundy-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-400">Built to be trusted</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-balance sm:text-4xl">Your workspace, your people, your data</h2>
              <p className="mt-4 text-white/70">Each business gets its own workspace. Nobody outside it can see anything inside it, and inside it each person sees only what their role allows.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: ShieldCheck, t: 'A private workspace', d: 'Your bookings, money and files are kept apart from every other customer, and the database itself enforces it.' },
                { icon: Users, t: 'People and roles you control', d: 'Invite people by link and give each a role. Seven ready-made roles, or set view, add, edit and delete screen by screen.' },
                { icon: Lock, t: 'Private files, locked passwords', d: 'Receipts and documents open only for signed-in members. Passwords you store for other services are encrypted.' },
                { icon: FileSearch, t: 'Your data stays yours', d: 'Export every list to Excel whenever you like, and see who changed what and when in the change history.' },
              ].map((s) => (
                <div key={s.t} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <s.icon className="h-5 w-5 text-gold-400" />
                  <h3 className="mt-3 font-semibold">{s.t}</h3>
                  <p className="mt-1 text-sm text-white/65">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing (hidden while SHOW_PRICING is false) */}
      {SHOW_PRICING && (
      <section id="pricing" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Pricing</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-balance sm:text-4xl">One price per workspace. Add people as your team grows.</h2>
          <p className="mt-4 text-muted">Every plan includes every screen. You choose how many people sign in. Try it free for {TRIAL_DAYS} days, no card needed.</p>
        </div>
        <div className="mt-12">
          <Pricing />
        </div>
      </section>
      )}

      {/* FAQ */}
      <section id="faq" className="bg-surface border-y border-line">
        <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 lg:py-24">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Questions</p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Frequently asked</h2>
          </div>
          <div className="mt-10">
            <FAQ />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="relative overflow-hidden rounded-[2rem] gradient-hero px-6 py-14 text-center text-white sm:px-12">
          <Receipt className="pointer-events-none absolute -left-6 -top-6 h-40 w-40 text-white/5" />
          <h2 className="font-display text-3xl font-semibold text-balance sm:text-4xl">Put the spreadsheet away</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">Create your workspace in a minute, add your rooms and record the first booking from your phone tonight.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn bg-gold-400 text-burgundy-950 hover:bg-gold-300 px-6 text-base">
              {SIGNUP_CTA} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn border border-white/25 bg-white/5 text-white hover:bg-white/10 px-6 text-base">
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
