'use client'

import { useEffect } from 'react'
import { useIsClient } from '@/lib/hooks'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/format'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Keep the sheet open when the backdrop is tapped (long forms). */
  persistent?: boolean
}

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' }

/**
 * Bottom sheet on phones, centred dialog from the `sm` breakpoint up.
 * Sticky header, scrolling body, optional sticky footer, Escape to close.
 */
export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', persistent }: ModalProps) {
  const mounted = useIsClient()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-burgundy-950/60 backdrop-blur-[2px]" onClick={persistent ? undefined : onClose} />
      <div
        className={cn(
          'relative flex w-full flex-col bg-surface shadow-pop animate-sheet',
          'max-h-[92dvh] rounded-t-3xl sm:max-h-[90dvh] sm:rounded-2xl',
          SIZES[size],
        )}
      >
        <div className="sm:hidden pt-2 flex justify-center">
          <div className="h-1.5 w-10 rounded-full bg-line-2" />
        </div>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold leading-tight text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          <button className="icon-btn -mr-2 -mt-1" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line bg-surface px-5 py-3 safe-bottom">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
