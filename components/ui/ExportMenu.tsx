'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, FileJson, FileSpreadsheet, FileText, Printer } from 'lucide-react'
import { exportCSV, exportJSON, exportXLSX, printRows, type ExportRow } from '@/lib/export'

export type { ExportRow }

export function ExportMenu({ rows, filename, title }: { rows: ExportRow[]; filename: string; title?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const name = `${filename}-${new Date().toISOString().slice(0, 10)}`
  const item = (label: string, Icon: typeof Download, fn: () => void) => (
    <button
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
      onClick={() => {
        setOpen(false)
        fn()
      }}
    >
      <Icon className="h-4 w-4 text-muted" />
      {label}
    </button>
  )

  return (
    <div className="relative" ref={ref}>
      <button className="btn-secondary btn-sm" onClick={() => setOpen((o) => !o)} disabled={rows.length === 0} type="button">
        <Download className="h-4 w-4" />
        Export
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop animate-in">
          {item('Excel (.xlsx)', FileSpreadsheet, () => exportXLSX(rows, name))}
          {item('CSV', FileText, () => exportCSV(rows, name))}
          {item('JSON', FileJson, () => exportJSON(rows, name))}
          {item('Print / PDF', Printer, () => printRows(rows, title ?? filename))}
        </div>
      )}
    </div>
  )
}
