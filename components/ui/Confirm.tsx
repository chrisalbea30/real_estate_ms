'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'

interface ConfirmOptions {
  title: string
  message?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>
const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const finish = (v: boolean) => {
    resolver.current?.(v)
    resolver.current = null
    setOpts(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!opts}
        onClose={() => finish(false)}
        title={opts?.title ?? ''}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => finish(false)}>
              {opts?.cancelLabel ?? 'Cancel'}
            </button>
            <button className={opts?.danger ? 'btn-danger' : 'btn-primary'} onClick={() => finish(true)} autoFocus>
              {opts?.confirmLabel ?? 'Confirm'}
            </button>
          </div>
        }
      >
        <div className="text-sm text-ink-2">{opts?.message ?? 'Are you sure?'}</div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider')
  return ctx
}
