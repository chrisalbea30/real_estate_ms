import Link from 'next/link'
import { APP_NAME, APP_TAGLINE } from '@/lib/brand'
import { Logo } from '@/components/Logo'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { SHOW_PRICING, SIGNUP_CTA } from '@/lib/plans'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <MarketingNav />
      <div className="flex-1">{children}</div>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <Logo className="h-9 w-9" />
              <span className="font-display text-xl font-semibold">{APP_NAME}</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted">{APP_TAGLINE}.</p>
          </div>
          <div>
            <h4 className="label">Product</h4>
            <ul className="space-y-2 text-sm text-ink-2">
              <li><Link href="/#features" className="hover:text-primary">Features</Link></li>
              <li><Link href="/#how" className="hover:text-primary">How it works</Link></li>
              {SHOW_PRICING && <li><Link href="/#pricing" className="hover:text-primary">Pricing</Link></li>}
              <li><Link href="/#faq" className="hover:text-primary">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="label">Account</h4>
            <ul className="space-y-2 text-sm text-ink-2">
              <li><Link href="/login" className="hover:text-primary">Sign in</Link></li>
              <li><Link href="/signup" className="hover:text-primary">{SIGNUP_CTA}</Link></li>
              <li><Link href="/forgot-password" className="hover:text-primary">Reset password</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="label">Legal</h4>
            <ul className="space-y-2 text-sm text-ink-2">
              <li><Link href="/privacy" className="hover:text-primary">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-primary">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <span>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</span>
            <span>Made for small hotels, resorts, villas and serviced apartments.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
