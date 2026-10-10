'use client'

import { useRef, useState } from 'react'
import { ExternalLink, Trash2, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BUCKET, MAX_UPLOAD_BYTES, buildStoragePath, fileHref, fileLabel, isAllowedMime } from '@/lib/storage'
import { useApp } from '@/components/app/AppProvider'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'
import { FileTypeIcon } from '@/components/documents/FileTypeIcon'
import { cn } from '@/lib/format'

/**
 * Same upload flow as components/ui/FileUpload (browser → private bucket →
 * storage path), but also hands back the original File so the document name
 * can default to the uploaded file name.
 */
export function DocumentFilePicker({
  value,
  onChange,
  label = 'File',
  className,
}: {
  value: string | null
  onChange: (path: string | null, file?: File) => void
  label?: string
  className?: string
}) {
  const { org } = useApp()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) return toast.error('File is larger than 10 MB')
    if (file.type && !isAllowedMime(file.type)) return toast.error('File type not allowed')
    setBusy(true)
    try {
      const path = buildStoragePath(org.id, 'documents', file.name)
      const supabase = createClient()
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false })
      if (error) throw error
      onChange(path, file)
      toast.success('File uploaded')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const href = fileHref(value)

  return (
    <div className={cn('min-w-0', className)}>
      <div className="label">{label}</div>
      <input ref={fileRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {value ? (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2">
          <FileTypeIcon value={value} className="h-5 w-5 shrink-0" />
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
        <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? <Spinner size="sm" /> : <Upload className="h-4 w-4" />}
          Choose file
        </button>
      )}
    </div>
  )
}
