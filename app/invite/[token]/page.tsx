import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { APP_NAME } from '@/lib/brand'
import { Logo } from '@/components/Logo'
import { AcceptInviteButton } from '@/components/onboarding/AcceptInviteButton'
import { formatDateTime } from '@/lib/format'

export const metadata: Metadata = { title: 'Invitation' }

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = await supabase.rpc('app_invitation_preview', { p_token: token })
  const inv = (data as { organization_name: string; role_name: string; email: string; expires_at: string; status: string }[] | null)?.[0] ?? null

  const next = `/invite/${token}`

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <Logo className="h-10 w-10" />
        <span className="font-display text-2xl font-semibold">{APP_NAME}</span>
      </Link>
      <div className="card w-full max-w-md p-6 text-center animate-in">
        {!inv ? (
          <>
            <h1 className="font-display text-2xl font-semibold">Invitation not found</h1>
            <p className="mt-2 text-sm text-muted">This link is not valid. Ask your administrator to send a new invitation.</p>
          </>
        ) : inv.status !== 'pending' ? (
          <>
            <h1 className="font-display text-2xl font-semibold">Invitation {inv.status}</h1>
            <p className="mt-2 text-sm text-muted">
              {inv.status === 'accepted' ? 'This invitation was already used.' : 'This invitation can no longer be used. Ask for a new one.'}
            </p>
            <Link href="/app" className="btn-primary mt-5">Go to the app</Link>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">You are invited</p>
            <h1 className="mt-1 font-display text-2xl font-semibold">Join {inv.organization_name}</h1>
            <p className="mt-2 text-sm text-muted">
              as <span className="font-medium text-ink">{inv.role_name}</span> · sent to <span className="font-medium text-ink">{inv.email}</span>
              <br />
              Expires {formatDateTime(inv.expires_at)}
            </p>
            {!user ? (
              <div className="mt-6 space-y-2">
                <Link href={`/signup?next=${encodeURIComponent(next)}`} className="btn-primary w-full">Create account with {inv.email}</Link>
                <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-secondary w-full">I already have an account</Link>
              </div>
            ) : user.email?.toLowerCase() !== inv.email.toLowerCase() ? (
              <div className="mt-6">
                <p className="text-sm text-danger">You are signed in as {user.email}. This invitation was sent to {inv.email}.</p>
                <form action="/auth/signout" method="post" className="mt-3">
                  <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-secondary w-full">Switch account</Link>
                </form>
              </div>
            ) : (
              <div className="mt-6">
                <AcceptInviteButton token={token} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
