import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/AuthForms'
import { safeNext } from '@/lib/page'

export const metadata: Metadata = { title: 'Sign in' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; notice?: string }> }) {
  const sp = await searchParams
  const notice = sp.error === 'link' ? 'That link is invalid or has expired. Please sign in or request a new one.' : sp.notice === 'signed_out' ? 'You have been signed out.' : sp.notice === 'confirmed' ? 'Email confirmed. You can sign in now.' : undefined
  return <LoginForm next={safeNext(sp.next, '')} notice={notice} />
}
