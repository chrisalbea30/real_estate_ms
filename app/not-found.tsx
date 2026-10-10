import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { APP_NAME } from '@/lib/brand'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5 text-center">
      <Logo className="h-12 w-12" />
      <h1 className="mt-5 font-display text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">The page you are looking for does not exist or you do not have access to it.</p>
      <div className="mt-6 flex gap-2">
        <Link href="/app" className="btn-primary">Go to the app</Link>
        <Link href="/" className="btn-secondary">{APP_NAME} home</Link>
      </div>
    </div>
  )
}
