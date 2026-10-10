'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { cn } from '@/lib/format'
import { ExportMenu, type ExportRow } from '@/components/ui/ExportMenu'
import { EmptyState } from '@/components/ui/EmptyState'

export interface Column<T> {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => string | number | null | undefined
  align?: 'left' | 'right' | 'center'
  className?: string
  /** Hide the column below this breakpoint on the desktop table. */
  hide?: 'sm' | 'md' | 'lg' | 'xl'
  width?: string
}

export interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  /** Text used by the search box. Omit to hide the search box. */
  search?: (row: T) => string
  searchPlaceholder?: string
  defaultSort?: { key: string; dir: 'asc' | 'desc' }
  /** 0 disables paging. Default 10. */
  pageSize?: number
  pageSizeOptions?: number[]
  /** Card layout used below the md breakpoint. */
  renderCard: (row: T) => React.ReactNode
  /** Row actions: last table column and the card footer. */
  actions?: (row: T) => React.ReactNode
  /** Filters and other controls, rendered beside the search box. */
  toolbar?: React.ReactNode
  /** Totals for the filtered rows. */
  footer?: (filtered: T[]) => React.ReactNode
  empty?: React.ReactNode
  exportName?: string
  exportRow?: (row: T) => ExportRow
  onRowClick?: (row: T) => void
  /** Layout classes for the phone card list, e.g. 'grid grid-cols-2 gap-3'. Default: vertical stack. */
  cardsClassName?: string
  /** Called with the filtered + sorted rows whenever they change (for totals outside the table). */
  onFiltered?: (rows: T[]) => void
}

const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' }

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  search,
  searchPlaceholder = 'Search…',
  defaultSort,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  renderCard,
  actions,
  toolbar,
  footer,
  empty,
  exportName,
  exportRow,
  onRowClick,
  cardsClassName,
  onFiltered,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(defaultSort ?? null)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(pageSize)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = rows
    if (q && search) list = rows.filter((r) => search(r).toLowerCase().includes(q))
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)
      if (col?.sortValue) {
        const sv = col.sortValue
        const dir = sort.dir === 'asc' ? 1 : -1
        list = [...list].sort((a, b) => {
          const va = sv(a)
          const vb = sv(b)
          if (va == null && vb == null) return 0
          if (va == null) return 1
          if (vb == null) return -1
          if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
          return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' }) * dir
        })
      }
    }
    return list
  }, [rows, query, search, sort, columns])

  useEffect(() => {
    onFiltered?.(filtered)
  }, [filtered, onFiltered])

  const total = filtered.length
  const pages = size > 0 ? Math.max(1, Math.ceil(total / size)) : 1
  const current = Math.min(page, pages)
  const visible = size > 0 ? filtered.slice((current - 1) * size, current * size) : filtered

  const toggleSort = (key: string) => {
    setPage(1)
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  const exportRows = exportRow ? filtered.map(exportRow) : null

  return (
    <div className="space-y-3">
      {(search || toolbar || exportRows) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {search && (
            <div className="relative flex-1 min-w-[12rem]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
                placeholder={searchPlaceholder}
                className="input pl-10"
                type="search"
              />
            </div>
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
          {exportRows && exportName && (
            <div className="sm:ml-auto">
              <ExportMenu rows={exportRows} filename={exportName} />
            </div>
          )}
        </div>
      )}

      {total === 0 ? (
        empty ?? <EmptyState title="Nothing here yet" description={query ? 'No rows match your search.' : 'Add the first record to get started.'} />
      ) : (
        <>
          {/* Phone: cards */}
          <div className={cn('md:hidden', cardsClassName ?? 'space-y-3')}>
            {visible.map((row) => (
              <div key={rowKey(row)} className={cn('card p-4', onRowClick && 'cursor-pointer active:bg-surface-2')} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                {renderCard(row)}
                {actions && (
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-line pt-3" onClick={(e) => e.stopPropagation()}>
                    {actions(row)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="table-wrap hidden md:block">
            <table className="table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      style={c.width ? { width: c.width } : undefined}
                      className={cn(c.hide && HIDE[c.hide], c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.sortValue && 'cursor-pointer select-none hover:text-ink')}
                      onClick={c.sortValue ? () => toggleSort(c.key) : undefined}
                    >
                      <span className={cn('inline-flex items-center gap-1', c.align === 'right' && 'flex-row-reverse')}>
                        {c.header}
                        {c.sortValue &&
                          (sort?.key === c.key ? (
                            sort.dir === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                          ))}
                      </span>
                    </th>
                  ))}
                  {actions && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={rowKey(row)} className={cn(onRowClick && 'cursor-pointer')} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                    {columns.map((c) => (
                      <td key={c.key} className={cn(c.hide && HIDE[c.hide], c.align === 'right' && 'text-right tabular', c.align === 'center' && 'text-center', c.className)}>
                        {c.cell(row)}
                      </td>
                    ))}
                    {actions && (
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-end gap-1">{actions(row)}</div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {footer && <div className="card px-4 py-3 text-sm">{footer(filtered)}</div>}

          {size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
              <div className="flex items-center gap-2">
                <span>
                  {(current - 1) * size + 1}–{Math.min(current * size, total)} of {total}
                </span>
                <select
                  className="select !min-h-9 !py-1 !pl-2 !pr-7 text-xs w-auto"
                  value={size}
                  onChange={(e) => {
                    setSize(Number(e.target.value))
                    setPage(1)
                  }}
                  aria-label="Rows per page"
                >
                  {pageSizeOptions.map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button className="icon-btn" disabled={current <= 1} onClick={() => setPage(current - 1)} aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 tabular">
                  {current} / {pages}
                </span>
                <button className="icon-btn" disabled={current >= pages} onClick={() => setPage(current + 1)} aria-label="Next page">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** Small helpers for consistent card layouts on phones. */
export function CardRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 text-sm', className)}>
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-ink">{children}</span>
    </div>
  )
}

export function CardTitle({ title, subtitle, right }: { title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate font-semibold text-ink">{title}</div>
        {subtitle && <div className="text-xs text-muted">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}
