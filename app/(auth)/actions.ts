'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createServerSupabase } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { safeNext } from '@/lib/page'

export interface AuthState {
  error?: string
  sent?: boolean
  message?: string
}

async function siteOrigin() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
  return host ? `${proto}://${host}` : env.siteUrl
}

function friendlyAuthError(message: string) {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Wrong email or password.'
  if (m.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox for the confirmation link.'
  if (m.includes('user already registered')) return 'An account with this email already exists. Try signing in.'
  if (m.includes('password should be at least')) return 'Password must be at least 8 characters.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Please wait a minute and try again.'
  return message
}

const credentials = z.object({
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({ email: formData.get('email'), password: formData.get('password') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check your details' }
  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: friendlyAuthError(error.message) }
  redirect(safeNext(String(formData.get('next') ?? '')))
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const schema = credentials.extend({ full_name: z.string().trim().min(2, 'Tell us your name') })
  const parsed = schema.safeParse({ email: formData.get('email'), password: formData.get('password'), full_name: formData.get('full_name') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check your details' }
  const next = safeNext(String(formData.get('next') ?? ''), '/onboarding')
  const supabase = await createServerSupabase()
  const origin = await siteOrigin()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })
  if (error) return { error: friendlyAuthError(error.message) }
  if (data.session) redirect(next)
  return { sent: true, message: `We sent a confirmation link to ${parsed.data.email}. Open it to finish creating your account.` }
}

export async function forgotPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.email('Enter a valid email address').trim().toLowerCase().safeParse(formData.get('email'))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const supabase = await createServerSupabase()
  const origin = await siteOrigin()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent('/reset-password')}` })
  if (error) return { error: friendlyAuthError(error.message) }
  return { sent: true, message: 'If an account exists for that email, a reset link is on its way.' }
}

export async function resetPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }
  if (password !== confirm) return { error: 'Passwords do not match' }
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your reset link has expired. Request a new one.' }
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: friendlyAuthError(error.message) }
  redirect('/app')
}

export async function signOutAction() {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/login')
}
