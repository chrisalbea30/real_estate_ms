import type { Metadata } from 'next'
import { APP_NAME } from '@/lib/brand'

export const metadata: Metadata = { title: 'Privacy' }

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="font-display text-3xl font-semibold">Privacy policy</h1>
      <p className="mt-2 text-sm text-muted">Placeholder. Replace with your own policy before launch.</p>
      <div className="prose-tight mt-8 space-y-4 text-sm leading-relaxed text-ink-2">
        <p>{APP_NAME} stores the data you enter (bookings, guests, expenses, documents) on behalf of your organisation. You control who in your organisation can see it through roles and permissions.</p>
        <p>Guest personal data such as passport numbers, emails and phone numbers is stored for the purpose of running your property and issuing invoices. You can delete a booking at any time; deletion is recorded in the audit log.</p>
        <p>Files are stored in a private bucket and served through short-lived signed links. Stored third-party logins are encrypted at rest.</p>
        <p>We do not sell data. Receipt images sent for scanning are processed by the AI provider configured by the operator and are not used for training by that provider under its API terms.</p>
      </div>
    </article>
  )
}
