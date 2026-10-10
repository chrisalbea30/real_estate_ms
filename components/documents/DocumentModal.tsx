'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { TextField, SelectField, TextareaField, FormGrid, FormError } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { DEFAULT_DOCUMENT_CATEGORY } from '@/lib/schemas/documents'
import { saveDocumentAction } from '@/app/(app)/app/documents/actions'
import { DocumentFilePicker } from '@/components/documents/DocumentFilePicker'
import type { CompanyDocument } from '@/lib/types'

const emptyForm = (uploadedBy: string) => ({
  name: '',
  category: DEFAULT_DOCUMENT_CATEGORY,
  document_date: '',
  file_url: null as string | null,
  notes: '',
  uploaded_by: uploadedBy,
})
type Form = ReturnType<typeof emptyForm>

function fromDocument(d: Partial<CompanyDocument>, uploadedBy: string): Form {
  return {
    ...emptyForm(uploadedBy),
    name: d.name ?? '',
    category: d.category ?? DEFAULT_DOCUMENT_CATEGORY,
    document_date: d.document_date ?? '',
    file_url: d.file_url ?? null,
    notes: d.notes ?? '',
    uploaded_by: d.uploaded_by ?? uploadedBy,
  }
}

const stripExtension = (filename: string) => filename.replace(/\.[a-z0-9]{1,8}$/i, '').trim()

export function DocumentModal({ document, onClose }: { document: Partial<CompanyDocument> | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { categories, user } = useApp()
  const [form, setForm] = useState<Form>(() => emptyForm(user.name))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [key, setKey] = useState<string | null>(null)

  // Re-initialise when a different document is opened.
  const k = document ? document.id ?? 'new' : null
  if (k !== key) {
    setKey(k)
    if (document) setForm(fromDocument(document, user.name))
    setError(null)
    setErrors({})
  }

  const categoryOptions = useMemo(() => {
    const set = new Set<string>(categories('document'))
    set.add(DEFAULT_DOCUMENT_CATEGORY)
    if (form.category) set.add(form.category)
    return [...set]
  }, [categories, form.category])

  const set = <K extends keyof Form>(name: K, value: Form[K]) => setForm((f) => ({ ...f, [name]: value }))
  const input = (name: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(name, e.target.value as never)

  // The name defaults to the uploaded file's name when still empty.
  const onFile = (path: string | null, file?: File) => setForm((f) => ({ ...f, file_url: path, name: f.name || (file ? stripExtension(file.name) || file.name : '') }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveDocumentAction({ id: document?.id, ...form })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(document?.id ? 'Document updated' : 'Document added')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!document}
      onClose={onClose}
      title={document?.id ? 'Edit document' : 'Add document'}
      persistent
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" form="document-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Save document'}
          </button>
        </div>
      }
    >
      <form id="document-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <DocumentFilePicker value={form.file_url} onChange={onFile} className="sm:col-span-2" />
          <TextField label="Name" required value={form.name} onChange={input('name')} error={errors.name} containerClassName="sm:col-span-2" placeholder="Lease agreement 2026" />
          <SelectField label="Category" value={form.category} onChange={input('category')} options={categoryOptions} error={errors.category} />
          <TextField label="Document date" type="date" value={form.document_date} onChange={input('document_date')} error={errors.document_date} />
          <TextField label="Uploaded by" value={form.uploaded_by} onChange={input('uploaded_by')} error={errors.uploaded_by} autoComplete="off" />
          <TextareaField label="Notes" value={form.notes} onChange={input('notes')} rows={3} containerClassName="sm:col-span-2" error={errors.notes} />
        </FormGrid>
      </form>
    </Modal>
  )
}
