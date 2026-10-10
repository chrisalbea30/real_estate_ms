import Link from 'next/link'
import { APP_NAME, APP_TAGLINE } from '@/lib/brand'
import { Logo } from '@/components/Logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden gradient-hero text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <span className="font-display text-2xl font-semibold">{APP_NAME}</span>
        </Link>
        <div className="max-w-md">
          <h2 className="font-display text-4xl font-semibold leading-tight text-balance">Run the property from your phone. Report to partners from your desk.</h2>
          <p className="mt-4 text-white/75">{APP_TAGLINE}.</p>
          <ul className="mt-8 space-y-3 text-sm text-white/80">
            <li className="flex gap-3"><span className="text-gold-400">◆</span> One revenue table that every dashboard trusts</li>
            <li className="flex gap-3"><span className="text-gold-400">◆</span> Receipts scanned into expenses in seconds</li>
            <li className="flex gap-3"><span className="text-gold-400">◆</span> Legal review, budgets and partner reporting built in</li>
          </ul>
        </div>
        <p className="text-xs text-white/50">© {new Date().getFullYear()} {APP_NAME}</p>
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-gold-400/10 blur-3xl" />
      </aside>
      <main className="flex min-h-dvh flex-col px-5 py-8 sm:px-8 lg:min-h-0 lg:justify-center lg:px-16">
        <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
          <Logo className="h-9 w-9" />
          <span className="font-display text-xl font-semibold text-ink">{APP_NAME}</span>
        </Link>
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
