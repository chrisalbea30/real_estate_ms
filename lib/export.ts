// Client-side exports of the rows currently shown (filtered + sorted).

export type ExportRow = Record<string, string | number | boolean | null | undefined>

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function headers(rows: ExportRow[]) {
  const set = new Set<string>()
  rows.forEach((r) => Object.keys(r).forEach((k) => set.add(k)))
  return [...set]
}

export function exportCSV(rows: ExportRow[], filename: string) {
  const cols = headers(rows)
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [cols.map(esc).join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))]
  downloadBlob(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`)
}

export function exportJSON(rows: ExportRow[], filename: string) {
  downloadBlob(new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }), `${filename}.json`)
}

export async function exportXLSX(rows: ExportRow[], filename: string) {
  const mod = await import('write-excel-file/browser')
  const writeXlsxFile = mod.default
  type SheetData = import('write-excel-file/browser').SheetData
  const cols = headers(rows)
  const head = cols.map((c) => ({ value: c, fontWeight: 'bold' as const }))
  const body = rows.map((r) =>
    cols.map((c) => {
      const v = r[c]
      if (v === null || v === undefined) return { value: '' }
      if (typeof v === 'number') return { value: v, type: Number }
      if (typeof v === 'boolean') return { value: v ? 'Yes' : 'No' }
      return { value: String(v) }
    }),
  )
  const data = [head, ...body] as unknown as SheetData
  const blob = await writeXlsxFile(data, { sheet: 'Data' }).toBlob()
  downloadBlob(blob, `${filename}.xlsx`)
}

export function printRows(rows: ExportRow[], title: string) {
  const cols = headers(rows)
  const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#26161A;padding:24px}
    h1{font-size:18px;margin:0 0 4px}
    .meta{color:#7A6368;font-size:12px;margin-bottom:16px}
    table{border-collapse:collapse;width:100%;font-size:12px}
    th,td{border:1px solid #EADCD8;padding:6px 8px;text-align:left;vertical-align:top}
    th{background:#F5EDE9;text-transform:uppercase;font-size:10px;letter-spacing:.04em;color:#7A6368}
    td.num{text-align:right;font-variant-numeric:tabular-nums}
    @page{margin:14mm}
  </style></head><body>
  <h1>${esc(title)}</h1><div class="meta">Generated ${new Date().toLocaleString()} · ${rows.length} rows</div>
  <table><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td class="${typeof r[c] === 'number' ? 'num' : ''}">${esc(typeof r[c] === 'number' ? (r[c] as number).toLocaleString() : r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table>
  <script>window.onload=function(){window.print()}</script></body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
}
