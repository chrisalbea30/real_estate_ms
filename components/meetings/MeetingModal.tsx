'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Paperclip, Trash2, ExternalLink, Check } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { TextField, TextareaField, FormGrid, FormSection, FormError } from '@/components/ui/Field'
import { FileUpload } from '@/components/ui/FileUpload'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { fileHref, fileLabel } from '@/lib/storage'
import { cn } from '@/lib/format'
import { saveMeetingAction } from '@/app/(app)/app/meetings/actions'
import type { Meeting, MeetingAttachment } from '@/lib/types'

const emptyForm = (today: string) => ({
  meeting_date: today,
  title: '',
  participants: [] as string[],
  agenda: '',
  decisions: '',
  action_items: '',
  attachments: [] as MeetingAttachment[],
})
type Form = ReturnType<typeof emptyForm>

export function MeetingModal({ meeting, onClose }: { meeting: Partial<Meeting> | null; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { today, partners, members } = useApp()
  const [form, setForm] = useState<Form>(() => emptyForm(today))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [extra, setExtra] = useState('')
  const [key, setKey] = useState<string | null>(null)

  const k = meeting ? meeting.id ?? 'new' : null
  if (k !== key) {
    setKey(k)
    if (meeting) {
      setForm({
        ...emptyForm(today),
        meeting_date: meeting.meeting_date ?? today,
        title: meeting.title ?? '',
        participants: meeting.participants ?? [],
        agenda: meeting.agenda ?? '',
        decisions: meeting.decisions ?? '',
        action_items: meeting.action_items ?? '',
        attachments: (meeting.attachments ?? []).map((a) => ({ name: a.name, url: a.url })),
      })
    }
    setExtra('')
    setError(null)
    setErrors({})
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const input = (k: 'meeting_date' | 'title' | 'agenda' | 'decisions' | 'action_items') => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value)

  // Partner names, then team members, then any name already on the record.
  const names = Array.from(new Set([...partners.map((p) => p.name), ...members.map((m) => m.name), ...form.participants].map((n) => n.trim()).filter(Boolean)))
  const toggle = (name: string) => set('participants', form.participants.includes(name) ? form.participants.filter((p) => p !== name) : [...form.participants, name])
  const addExtra = () => {
    const n = extra.trim()
    if (!n) return
    if (!form.participants.includes(n)) set('participants', [...form.participants, n])
    setExtra('')
  }

  const updateAttachment = (i: number, patch: Partial<MeetingAttachment>) => set('attachments', form.attachments.map((a, j) => (j === i ? { ...a, ...patch } : a)))
  const removeAttachment = (i: number) => set('attachments', form.attachments.filter((_, j) => j !== i))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveMeetingAction({ id: meeting?.id, ...form })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    toast.success(meeting?.id ? 'Meeting updated' : 'Meeting added')
    onClose()
    router.refresh()
  }

  return (
    <Modal
      open={!!meeting}
      onClose={onClose}
      title={meeting?.id ? 'Edit meeting' : 'New meeting'}
      size="lg"
      persistent
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-primary" form="meeting-form" disabled={busy}>
            {busy ? <Spinner size="sm" /> : 'Save meeting'}
          </button>
        </div>
      }
    >
      <form id="meeting-form" onSubmit={submit}>
        <FormGrid>
          <FormError error={error} />
          <TextField label="Date" type="date" required value={form.meeting_date} onChange={input('meeting_date')} error={errors.meeting_date} />
          <TextField label="Title" required value={form.title} onChange={input('title')} error={errors.title} placeholder="Quarterly partner meeting" />

          <FormSection title="Participants">
            <div className="sm:col-span-2">
              {names.length === 0 ? (
                <p className="text-sm text-muted">Add partners or team members to pick participants, or type a name below.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {names.map((n) => {
                    const on = form.participants.includes(n)
                    return (
                      <button key={n} type="button" onClick={() => toggle(n)} aria-pressed={on} className={cn('badge border px-3 py-1.5 transition', on ? 'border-primary bg-primary text-primary-fg' : 'border-line bg-surface text-ink-2 hover:bg-surface-2')}>
                        {on && <Check className="h-3 w-3" />} {n}
                      </button>
                    )
                  })}
                </div>
              )}
              {errors.participants && <p className="mt-1 text-xs text-danger">{errors.participants}</p>}
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <input
                className="input"
                placeholder="Other participant"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addExtra()
                  }
                }}
              />
              <button type="button" className="btn-secondary shrink-0" onClick={addExtra} disabled={!extra.trim()}>
                Add
              </button>
            </div>
          </FormSection>

          <FormSection title="Minutes">
            <TextareaField label="Agenda" value={form.agenda} onChange={input('agenda')} rows={4} containerClassName="sm:col-span-2" error={errors.agenda} />
            <TextareaField label="Decisions" value={form.decisions} onChange={input('decisions')} rows={4} containerClassName="sm:col-span-2" error={errors.decisions} />
            <TextareaField label="Action items" value={form.action_items} onChange={input('action_items')} rows={4} containerClassName="sm:col-span-2" error={errors.action_items} />
          </FormSection>

          <FormSection title="Attachments">
            <div className="space-y-2 sm:col-span-2">
              {form.attachments.map((a, i) => {
                const href = fileHref(a.url)
                return (
                  <div key={`${a.url}-${i}`} className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2">
                    <Paperclip className="h-4 w-4 shrink-0 text-muted" />
                    <input className="input !min-h-9 flex-1" value={a.name} onChange={(e) => updateAttachment(i, { name: e.target.value })} placeholder="Name" aria-label="Attachment name" />
                    {href && (
                      <a href={href} target="_blank" rel="noreferrer" className="icon-btn !h-8 !w-8" title="Open">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button type="button" className="icon-btn !h-8 !w-8 text-danger" onClick={() => removeAttachment(i)} title="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
              {errors.attachments && <p className="text-xs text-danger">{errors.attachments}</p>}
              <FileUpload
                module="meetings"
                value={null}
                compact
                onChange={(path) => {
                  if (!path) return
                  setForm((f) => ({ ...f, attachments: [...f.attachments, { name: fileLabel(path), url: path }] }))
                }}
              />
              <p className="text-xs text-muted">PDF, Office documents and images up to 10 MB. Rename a file after uploading.</p>
            </div>
          </FormSection>
        </FormGrid>
      </form>
    </Modal>
  )
}
