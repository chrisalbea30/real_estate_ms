import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/context'
import { APP_NAME } from '@/lib/brand'
import { Logo } from '@/components/Logo'
import { OnboardingForm } from '@/components/onboarding/OnboardingForm'

export const metadata: Metadata = { title: 'Set up your workspace' }

export default async function OnboardingPage() {
  const ctx = await getAppContext()
  if (!ctx) redirect('/login?next=/onboarding')
  const hasOrg = !('needsOnboarding' in ctx)
  const email = 'needsOnboarding' in ctx ? ctx.email : ctx.email

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="h-9 w-9" />
          <span className="font-display text-xl font-semibold">{APP_NAME}</span>
        </Link>
        <span className="text-xs text-muted">{email}</span>
      </header>
      <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-4 sm:px-8">
        <OnboardingForm hasOrg={hasOrg} />
      </main>
    </div>
  )
}
