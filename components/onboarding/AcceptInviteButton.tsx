'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptInvitationAction } from '@/app/invite/actions'
import { Spinner } from '@/components/ui/Spinner'

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <button
        className="btn-primary w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          const res = await acceptInvitationAction(token)
          setBusy(false)
          if (!res.ok) return setError(res.error)
          router.push('/app')
          router.refresh()
        }}
      >
        {busy ? <Spinner size="sm" /> : 'Accept invitation'}
      </button>
    </div>
  )
}
