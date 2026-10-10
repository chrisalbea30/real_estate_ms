'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ChevronDown, Users, Paperclip, MessagesSquare, Search, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { fileHref } from '@/lib/storage'
import { cn, formatDate } from '@/lib/format'
import { deleteMeetingAction } from '@/app/(app)/app/meetings/actions'
import { MeetingModal } from '@/components/meetings/MeetingModal'
import type { Meeting } from '@/lib/types'

const STEP = 20

export function MeetingsClient({ meetings }: { meetings: Meeting[] }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can } = useApp()
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(STEP)
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const [editing, setEditing] = useState<Partial<Meeting> | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? meetings.filter((m) => `${m.title} ${m.agenda ?? ''} ${m.decisions ?? ''}`.toLowerCase().includes(q)) : meetings
    return [...list].sort((a, b) => (a.meeting_date < b.meeting_date ? 1 : a.meeting_date > b.meeting_date ? -1 : 0))
  }, [meetings, query])

  const visible = filtered.slice(0, limit)

  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const remove = async (m: Meeting) => {
    const ok = await confirm({ title: `Delete "${m.title}"?`, message: 'Minutes and attached files are removed.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    const res = await deleteMeetingAction(m.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Meeting deleted')
    router.refresh()
  }

  return (
    <div>
      <PageHeader
        title="Meetings"
        subtitle={`${meetings.length} meeting${meetings.length === 1 ? '' : 's'}`}
        actions={
          can('shareholder_meetings', 'add') && (
            <button className="btn-primary" onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" /> New meeting
            </button>
          )
        }
      />

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          className="input pl-10"
          placeholder="Search title, agenda, decisions…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setLimit(STEP)
          }}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={MessagesSquare} title={query ? 'No meetings match' : 'No meetings yet'} description={query ? 'Try another search.' : 'Record the minutes, decisions and action items of partner meetings.'} action={!query && can('shareholder_meetings', 'add') && <button className="btn-primary" onClick={() => setEditing({})}>New meeting</button>} />
      ) : (
        <div className="space-y-3">
          {visible.map((m) => {
            const expanded = open.has(m.id)
            const participants = m.participants ?? []
            const attachments = m.attachments ?? []
            return (
              <div key={m.id} className="card overflow-hidden">
                <button type="button" className="flex w-full items-start gap-3 p-4 text-left" onClick={() => toggle(m.id)} aria-expanded={expanded}>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted">{formatDate(m.meeting_date)}</div>
                    <div className="font-semibold text-ink">{m.title}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Badge>
                        <Users className="h-3 w-3" /> {participants.length} participant{participants.length === 1 ? '' : 's'}
                      </Badge>
                      {attachments.length > 0 && (
                        <Badge tone="info">
                          <Paperclip className="h-3 w-3" /> {attachments.length} file{attachments.length === 1 ? '' : 's'}
                        </Badge>
                      )}
                      {m.decisions && <Badge tone="success">Decisions</Badge>}
                      {m.action_items && <Badge tone="warning">Action items</Badge>}
                    </div>
                  </div>
                  <ChevronDown className={cn('mt-1 h-5 w-5 shrink-0 text-muted transition', expanded && 'rotate-180')} />
                </button>
                {expanded && (
                  <div className="space-y-4 border-t border-line px-4 py-4 text-sm">
                    {participants.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {participants.map((p) => (
                          <Badge key={p} tone="primary">{p}</Badge>
                        ))}
                      </div>
                    )}
                    <Block label="Agenda" text={m.agenda} />
                    <Block label="Decisions" text={m.decisions} />
                    <Block label="Action items" text={m.action_items} />
                    {attachments.length > 0 && (
                      <div>
                        <div className="label">Attachments</div>
                        <ul className="divide-y divide-line rounded-xl border border-line">
                          {attachments.map((a, i) => (
                            <li key={`${a.url}-${i}`} className="flex items-center gap-2 px-3 py-2">
                              <Paperclip className="h-4 w-4 shrink-0 text-muted" />
                              <span className="min-w-0 flex-1 truncate">{a.name}</span>
                              {fileHref(a.url) && (
                                <a href={fileHref(a.url)!} target="_blank" rel="noreferrer" className="icon-btn !h-8 !w-8" title="Open">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(can('shareholder_meetings', 'edit') || can('shareholder_meetings', 'delete')) && (
                      <div className="flex justify-end gap-2 border-t border-line pt-3">
                        {can('shareholder_meetings', 'edit') && (
                          <button className="btn-secondary btn-sm" onClick={() => setEditing(m)}>
                            <Pencil className="h-4 w-4" /> Edit
                          </button>
                        )}
                        {can('shareholder_meetings', 'delete') && (
                          <button className="btn-secondary btn-sm text-danger" onClick={() => remove(m)}>
                            <Trash2 className="h-4 w-4" /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length > limit && (
            <div className="flex justify-center">
              <button className="btn-secondary" onClick={() => setLimit((l) => l + STEP)}>
                Load more ({filtered.length - limit} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      <MeetingModal meeting={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function Block({ label, text }: { label: string; text: string | null }) {
  if (!text) return null
  return (
    <div>
      <div className="label">{label}</div>
      <p className="whitespace-pre-wrap text-ink-2">{text}</p>
    </div>
  )
}
