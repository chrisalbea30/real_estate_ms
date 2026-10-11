import type { Metadata } from 'next'
import { APP_NAME } from '@/lib/brand'

export const metadata: Metadata = { title: 'Terms' }

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="font-display text-3xl font-semibold">Terms of service</h1>
      <p className="mt-2 text-sm text-muted">Placeholder. Replace with your own terms before launch.</p>
      <div className="prose-tight mt-8 space-y-4 text-sm leading-relaxed text-ink-2">
        <p>By creating an account you agree to use {APP_NAME} only for lawful property management purposes and to keep your credentials confidential.</p>
        <p>Nothing is charged automatically. Any paid service is agreed with you in writing first. You can export all your data at any time from Settings.</p>
        <p>The service is provided as is. Figures shown in dashboards are computed from the data you enter and are not a substitute for professional accounting advice.</p>
      </div>
    </article>
  )
}
