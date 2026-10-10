'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ExternalLink, FolderArchive } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, CardRow, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Chips } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useApp } from '@/components/app/AppProvider'
import { fileHref } from '@/lib/storage'
import { formatDate } from '@/lib/format'
import { deleteDocumentAction } from '@/app/(app)/app/documents/actions'
import { DocumentModal } from '@/components/documents/DocumentModal'
import { FileTypeIcon, fileKind } from '@/components/documents/FileTypeIcon'
import type { CompanyDocument } from '@/lib/types'

export function DocumentsClient({ documents }: { documents: CompanyDocument[] }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { can } = useApp()
  const [editing, setEditing] = useState<Partial<CompanyDocument> | null>(null)
  const [category, setCategory] = useState('all')

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    documents.forEach((d) => counts.set(d.category, (counts.get(d.category) ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, count]) => ({ key, count }))
  }, [documents])

  const filtered = useMemo(() => (category === 'all' ? documents : documents.filter((d) => d.category === category)), [documents, category])

  const remove = async (d: CompanyDocument) => {
    const ok = await confirm({ title: `Delete "${d.name}"?`, message: d.file_url ? 'The record and its stored file are removed permanently.' : 'The record is removed permanently.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    const res = await deleteDocumentAction(d.id)
    if (!res.ok) return toast.error(res.error)
    toast.success('Document deleted')
    router.refresh()
  }

  const nameCell = (d: CompanyDocument) => {
    const href = fileHref(d.file_url)
    const body = (
      <span className="flex min-w-0 items-center gap-2.5">
        <FileTypeIcon value={d.file_url} className="h-5 w-5 shrink-0" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{d.name}</span>
          {d.notes && <span className="block truncate text-xs text-muted">{d.notes}</span>}
        </span>
      </span>
    )
    return href ? (
      <a href={href} target="_blank" rel="noreferrer" className="block max-w-md hover:text-primary">
        {body}
      </a>
    ) : (
      <div className="max-w-md">{body}</div>
    )
  }

  const columns: Column<CompanyDocument>[] = [
    { key: 'name', header: 'Name', cell: nameCell, sortValue: (d) => d.name },
    { key: 'category', header: 'Category', cell: (d) => <Badge tone="primary">{d.category}</Badge>, sortValue: (d) => d.category, width: '10rem' },
    { key: 'date', header: 'Date', cell: (d) => formatDate(d.document_date), sortValue: (d) => d.document_date ?? '', width: '8rem' },
    { key: 'type', header: 'Type', cell: (d) => <span className="uppercase text-xs text-muted">{fileKind(d.file_url).ext || '—'}</span>, sortValue: (d) => fileKind(d.file_url).ext, hide: 'xl', width: '5rem' },
    { key: 'uploaded_by', header: 'Uploaded by', cell: (d) => d.uploaded_by ?? <span className="text-muted">—</span>, sortValue: (d) => d.uploaded_by ?? '', hide: 'lg' },
  ]

  const actions = (d: CompanyDocument) => (
    <>
      {d.file_url && (
        <a className="icon-btn !h-8 !w-8" title="Open file" href={fileHref(d.file_url)!} target="_blank" rel="noreferrer">
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
      {can('documents', 'edit') && (
        <button className="icon-btn !h-8 !w-8" title="Edit" onClick={() => setEditing(d)}>
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {can('documents', 'delete') && (
        <button className="icon-btn !h-8 !w-8 text-danger" title="Delete" onClick={() => remove(d)}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </>
  )

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle={`${documents.length} document${documents.length === 1 ? '' : 's'} · ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`}
        actions={
          can('documents', 'add') && (
            <button className="btn-primary" onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" /> Add document
            </button>
          )
        }
      />

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(d) => d.id}
        search={(d) => `${d.name} ${d.notes ?? ''} ${d.uploaded_by ?? ''}`}
        searchPlaceholder="Search name, notes, uploader…"
        defaultSort={{ key: 'date', dir: 'desc' }}
        pageSize={25}
        toolbar={<Chips value={category} onChange={setCategory} options={[{ key: 'all', label: 'All', badge: documents.length }, ...categories.map((c) => ({ key: c.key, label: c.key, badge: c.count }))]} />}
        actions={actions}
        empty={
          documents.length === 0 ? (
            <EmptyState icon={FolderArchive} title="No documents yet" description="Keep contracts, licences and company papers in one archive." action={can('documents', 'add') && <button className="btn-primary" onClick={() => setEditing({})}>Add first document</button>} />
          ) : (
            <EmptyState icon={FolderArchive} title="No documents match" description="Try another category or search term." />
          )
        }
        exportName="documents"
        exportRow={(d) => ({
          Name: d.name,
          Category: d.category,
          Date: d.document_date ?? '',
          'Uploaded By': d.uploaded_by ?? '',
          Notes: d.notes ?? '',
        })}
        renderCard={(d) => {
          const href = fileHref(d.file_url)
          const { ext } = fileKind(d.file_url)
          return (
            <>
              <div className="mb-2 flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2">
                  <FileTypeIcon value={d.file_url} className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="block truncate font-semibold text-ink hover:text-primary">
                      {d.name}
                    </a>
                  ) : (
                    <div className="truncate font-semibold text-ink">{d.name}</div>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone="primary">{d.category}</Badge>
                    {ext && <span className="text-xs uppercase text-muted">{ext}</span>}
                  </div>
                </div>
              </div>
              <CardRow label="Date">{formatDate(d.document_date)}</CardRow>
              {d.uploaded_by && <CardRow label="Uploaded by">{d.uploaded_by}</CardRow>}
              {d.notes && <p className="mt-2 line-clamp-2 text-sm text-ink-2">{d.notes}</p>}
            </>
          )
        }}
      />

      <DocumentModal document={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
