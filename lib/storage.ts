// Storage conventions: one private bucket, paths "org/<orgId>/<module>/<file>".
// Records store the storage PATH (not a URL). fileHref() turns it into a link
// that resolves to a short-lived signed URL after a membership check.

export const BUCKET = 'tenant-files'
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export type StorageModule = 'expenses' | 'guests' | 'revenue' | 'documents' | 'partners' | 'rooms' | 'meetings' | 'branding'

export const ALLOWED_MIME_PREFIXES = ['image/', 'text/', 'audio/', 'video/']
export const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/zip',
  'application/x-zip-compressed',
  'application/json',
  'application/rtf',
  'application/octet-stream',
])

export function isAllowedMime(type: string) {
  return ALLOWED_MIME.has(type) || ALLOWED_MIME_PREFIXES.some((p) => type.startsWith(p))
}

export function buildStoragePath(orgId: string, module: StorageModule, filename: string) {
  const ext = (filename.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
  const rand = Math.random().toString(36).slice(2, 8)
  return `org/${orgId}/${module}/${Date.now()}-${rand}.${ext}`
}

export function isExternalUrl(value: string | null | undefined) {
  return !!value && /^https?:\/\//i.test(value)
}

/** Link for a stored file (path) or an external URL. */
export function fileHref(value: string | null | undefined): string | null {
  if (!value) return null
  if (isExternalUrl(value)) return value
  return `/api/files/${value.split('/').map(encodeURIComponent).join('/')}`
}

export function fileLabel(value: string | null | undefined) {
  if (!value) return ''
  const last = value.split('/').pop() ?? value
  return last.length > 28 ? last.slice(0, 12) + '…' + last.slice(-12) : last
}

export function isImagePath(value: string | null | undefined) {
  return !!value && /\.(png|jpe?g|gif|webp|avif|heic|svg)$/i.test(value)
}
