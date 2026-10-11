import type { Metadata } from 'next'
import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth/AuthForms'
import { env } from '@/lib/env'

export const metadata: Metadata = { title: 'Reset password' }

export default function ForgotPasswordPage() {
  if (!env.emailEnabled) {
    return (
      <div className="space-y-4 animate-in">
        <h1 className="font-display text-3xl font-semibold text-ink">Reset your password</h1>
        <p className="text-sm text-ink-2">
          Password reset by email is not available yet. If you are signed in on another device, change your password under Settings, Profile. Otherwise ask the person who runs this service to set a new password for you.
        </p>
        <Link href="/login" className="btn-secondary">Back to sign in</Link>
      </div>
    )
  }
  return <ForgotPasswordForm />
}
