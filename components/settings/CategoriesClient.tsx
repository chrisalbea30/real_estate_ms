'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { FormError } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { SettingsCard, SaveRow, Note } from '@/components/settings/SettingsCard'
import { CATEGORY_KINDS } from '@/lib/schemas/settings'
import { saveCategoriesAction } from '@/app/(app)/app/settings/actions'
import type { CategoryKind } from '@/lib/types'

type Lists = Record<CategoryKind, string[]>

function initial(categories: Partial<Record<CategoryKind, string[]>>): Lists {
  const out = {} as Lists
  for (const { key } of CATEGORY_KINDS) out[key] = [...(categories[key] ?? [])]
  return out
}

export function CategoriesClient({ categories }: { categories: Partial<Record<CategoryKind, string[]>> }) {
  const router = useRouter()
  const toast = useToast()
  const { can } = useApp()
  const editable = can('settings', 'edit')
  const [lists, setLists] = useState<Lists>(() => initial(categories))
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(initial(categories)))
  const [kind, setKind] = useState<CategoryKind>('expense')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty = JSON.stringify(lists) !== snapshot
  const def = CATEGORY_KINDS.find((k) => k.key === kind)!
  const items = lists[kind]

  const update = (next: string[]) => setLists((l) => ({ ...l, [kind]: next }))
  const rename = (i: number, v: string) => update(items.map((x, j) => (j === i ? v : x)))
  const remove = (i: number) => update(items.filter((_, j) => j !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    update(next)
  }
  const add = () => {
    const v = draft.trim()
    if (!v) return
    if (items.some((x) => x.toLowerCase() === v.toLowerCase())) return toast.error(`“${v}” is already in the list`)
    update([...items, v])
    setDraft('')
  }

  const save = async () => {
    setBusy(true)
    setError(null)
    const res = await saveCategoriesAction(lists)
    setBusy(false)
    if (!res.ok) {
      setError(res.fieldErrors ? `${res.error} ${Object.values(res.fieldErrors)[0] ?? ''}` : res.error)
      return
    }
    setSnapshot(JSON.stringify(lists))
    toast.success('Categories saved')
    router.refresh()
  }

  return (
    <div>
      <PageHeader title="Categories" subtitle="The dropdown lists used across the app. Order here is the order in the forms." />
      {!editable && <Note className="mb-5">You can view these lists. Changing them needs the Settings → edit permission.</Note>}

      <Tabs tabs={CATEGORY_KINDS.map((k) => ({ key: k.key, label: k.label.replace(/ categories$/, ''), badge: lists[k.key].length }))} value={kind} onChange={setKind} className="mb-4" />

      <form
        id="categories-form"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <SettingsCard title={def.label} description={def.hint} footer={editable && <SaveRow busy={busy} dirty={dirty} form="categories-form" hint={dirty ? 'Unsaved changes across all lists.' : 'All lists saved.'} />}>
          <FormError error={error} />
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No entries yet. Add the first one below.</p>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((item, i) => (
                <li key={i} className="flex items-center gap-2 py-1.5">
                  <input className="input flex-1" value={item} onChange={(e) => rename(i, e.target.value)} disabled={!editable} aria-label={`Category ${i + 1}`} />
                  <button type="button" className="icon-btn !h-9 !w-9" onClick={() => move(i, -1)} disabled={!editable || i === 0} title="Move up">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" className="icon-btn !h-9 !w-9" onClick={() => move(i, 1)} disabled={!editable || i === items.length - 1} title="Move down">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" className="icon-btn !h-9 !w-9 text-danger" onClick={() => remove(i)} disabled={!editable} title="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <div className="mt-4 flex gap-2">
              <input
                className="input flex-1"
                placeholder={`Add a ${def.label.replace(/ categories$/, '').replace(/s$/, '').toLowerCase()}…`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    add()
                  }
                }}
                maxLength={60}
              />
              <button type="button" className="btn-secondary" onClick={add} disabled={!draft.trim()}>
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          )}
          <Note tone="warning" className="mt-4">
            Renaming or removing a category does not rewrite existing records: they keep the text they were saved with. Forms will show the new list; old values still appear on old rows and in filters.
          </Note>
        </SettingsCard>
      </form>
    </div>
  )
}
