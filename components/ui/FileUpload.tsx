'use client'

import { useRef, useState } from 'react'
import { Camera, FileText, Paperclip, Trash2, Upload, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BUCKET, MAX_UPLOAD_BYTES, buildStoragePath, fileHref, fileLabel, isAllowedMime, isImagePath, type StorageModule } from '@/lib/storage'
import { useApp } from '@/components/app/AppProvider'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/format'

/**
 * Uploads straight from the browser to the private tenant bucket (storage
 * policies enforce organisation membership) and returns the storage path.
 */
export function FileUpload({
  module,
  value,
  onChange,
  onFile,
  label = 'Attachment',
  accept,
  capture,
  className,
  compact,
}: {
  module: StorageModule
  value: string | null | undefined
  onChange: (path: string | null) => void
  /** Called with the original File after a successful upload (e.g. to default a name). */
  onFile?: (file: File, path: string) => void
  label?: string
  accept?: string
  /** Offer the phone camera for receipts/photos. */
  capture?: boolean
  className?: string
  compact?: boolean
}) {
  const { org } = useApp()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) return toast.error('File is larger than 10 MB')
    if (file.type && !isAllowedMime(file.type)) return toast.error('File type not allowed')
    setBusy(true)
    try {
      const path = buildStoragePath(org.id, module, file.name)
      const supabase = createClient()
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false })
      if (error) throw error
      onChange(path)
      onFile?.(file, path)
      toast.success('File uploaded')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const href = fileHref(value)

  return (
    <div className={cn('min-w-0', className)}>
      {!compact && <div className="label">{label}</div>}
      <input ref={fileRef} type="file" className="hidden" accept={accept} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <input ref={camRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {value ? (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2">
          {isImagePath(value) && href ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={href} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <FileText className="h-5 w-5 shrink-0 text-muted" />
          )}
          <span className="min-w-0 flex-1 truncate text-sm">{fileLabel(value)}</span>
          {href && (
            <a href={href} target="_blank" rel="noreferrer" className="icon-btn !h-8 !w-8" title="Open">
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button type="button" className="icon-btn !h-8 !w-8 text-danger" onClick={() => onChange(null)} title="Remove">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <Spinner size="sm" /> : compact ? <Paperclip className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            {compact ? 'Attach' : 'Choose file'}
          </button>
          {capture && (
            <button type="button" className="btn-secondary btn-sm sm:hidden" disabled={busy} onClick={() => camRef.current?.click()}>
              <Camera className="h-4 w-4" /> Camera
            </button>
          )}
        </div>
      )}
    </div>
  )
}
