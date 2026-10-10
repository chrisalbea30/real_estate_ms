import { File, FileArchive, FileAudio, FileImage, FileSpreadsheet, FileText, FileVideo, Presentation, type LucideIcon } from 'lucide-react'
import { fileExtension } from '@/lib/schemas/documents'
import { cn } from '@/lib/format'

const KINDS: { icon: LucideIcon; tone: string; test: RegExp }[] = [
  { icon: FileText, tone: 'text-danger', test: /^pdf$/ },
  { icon: FileText, tone: 'text-info', test: /^(doc|docx|odt|rtf|txt|md)$/ },
  { icon: FileSpreadsheet, tone: 'text-success', test: /^(xls|xlsx|ods|csv|tsv)$/ },
  { icon: Presentation, tone: 'text-warning', test: /^(ppt|pptx|odp|key)$/ },
  { icon: FileImage, tone: 'text-accent', test: /^(png|jpe?g|gif|webp|avif|heic|svg|bmp|tiff?)$/ },
  { icon: FileArchive, tone: 'text-ink-2', test: /^(zip|rar|7z|gz|tar)$/ },
  { icon: FileVideo, tone: 'text-primary', test: /^(mp4|mov|m4v|webm|avi|mkv)$/ },
  { icon: FileAudio, tone: 'text-primary', test: /^(mp3|wav|m4a|aac|ogg|flac)$/ },
]

export function fileKind(value: string | null | undefined) {
  const ext = fileExtension(value)
  return { ext, ...(KINDS.find((k) => k.test.test(ext)) ?? { icon: File, tone: 'text-muted' }) }
}

/** Icon chosen by the file extension of a storage path or URL. */
export function FileTypeIcon({ value, className }: { value: string | null | undefined; className?: string }) {
  const { icon: Icon, tone } = fileKind(value)
  return <Icon className={cn(tone, className)} aria-hidden />
}
