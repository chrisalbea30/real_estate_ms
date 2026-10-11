'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, MailCheck } from 'lucide-react'
import { signInAction, signUpAction, forgotPasswordAction, resetPasswordAction, type AuthState } from '@/app/(auth)/actions'
import { Spinner } from '@/components/ui/Spinner'
import { FormError } from '@/components/ui/Field'

function PasswordInput({ name, placeholder, autoComplete, minLength = 8 }: { name: string; placeholder?: string; autoComplete?: string; minLength?: number }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input name={name} type={show ? 'text' : 'password'} className="input pr-11" placeholder={placeholder ?? '••••••••'} autoComplete={autoComplete} minLength={minLength} required />
      <button type="button" className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-ink" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

function Sent({ message }: { message?: string }) {
  return (
    <div className="card p-6 text-center animate-in">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-success-soft text-success">
        <MailCheck className="h-6 w-6" />
      </span>
      <h2 className="font-display text-xl font-semibold">Check your inbox</h2>
      <p className="mt-2 text-sm text-muted">{message}</p>
      <Link href="/login" className="btn-secondary mt-5">
        Back to sign in
      </Link>
    </div>
  )
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signInAction, {})
  return (
    <form action={action} className="space-y-4 animate-in">
      <input type="hidden" name="next" value={next ?? ''} />
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to your workspace.</p>
      </div>
      {notice && <div className="rounded-xl border border-info/30 bg-info-soft px-3.5 py-2.5 text-sm text-info">{notice}</div>}
      <FormError error={state.error} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" inputMode="email" placeholder="you@property.com" required />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label className="label" htmlFor="password">Password</label>
          <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot?</Link>
        </div>
        <PasswordInput name="password" autoComplete="current-password" minLength={1} />
      </div>
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? <Spinner size="sm" /> : 'Sign in'}
      </button>
      <p className="text-center text-sm text-muted">
        New here?{' '}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'} className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  )
}

export function SignupForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpAction, {})
  if (state.sent) return <Sent message={state.message} />
  return (
    <form action={action} className="space-y-4 animate-in">
      <input type="hidden" name="next" value={next ?? ''} />
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-muted">No card required. You are signed in straight away.</p>
      </div>
      <FormError error={state.error} />
      <div>
        <label className="label" htmlFor="full_name">Your name</label>
        <input id="full_name" name="full_name" className="input" autoComplete="name" placeholder="Alex Rivera" required />
      </div>
      <div>
        <label className="label" htmlFor="email">Work email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" inputMode="email" placeholder="you@property.com" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <PasswordInput name="password" autoComplete="new-password" />
        <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
      </div>
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? <Spinner size="sm" /> : 'Create account'}
      </button>
      <p className="text-center text-xs text-muted">By continuing you agree to the Terms and Privacy Policy.</p>
      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(forgotPasswordAction, {})
  if (state.sent) return <Sent message={state.message} />
  return (
    <form action={action} className="space-y-4 animate-in">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Reset your password</h1>
        <p className="mt-1 text-sm text-muted">We will email you a link to choose a new one.</p>
      </div>
      <FormError error={state.error} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" inputMode="email" required />
      </div>
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? <Spinner size="sm" /> : 'Send reset link'}
      </button>
      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
      </p>
    </form>
  )
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPasswordAction, {})
  return (
    <form action={action} className="space-y-4 animate-in">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Choose a new password</h1>
      </div>
      <FormError error={state.error} />
      <div>
        <label className="label" htmlFor="password">New password</label>
        <PasswordInput name="password" autoComplete="new-password" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Confirm password</label>
        <PasswordInput name="confirm" autoComplete="new-password" />
      </div>
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? <Spinner size="sm" /> : 'Update password'}
      </button>
    </form>
  )
}
