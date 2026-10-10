import type { Metadata } from 'next'
import { SignupForm } from '@/components/auth/AuthForms'
import { safeNext } from '@/lib/page'

export const metadata: Metadata = { title: 'Create account' }

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams
  return <SignupForm next={safeNext(sp.next, '')} />
}
