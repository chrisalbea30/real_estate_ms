// CSV and print output of the Legal & accounting page (client only).

import type { Expense, LegalStatus } from '@/lib/types'

export type LegalRevenueRow = {
  key: string
  date: string
  source: string
  description: string
  detail: string
  amount: number
  file_url: string | null
  invoice_url: string | null
  invoice_number: string | null
  origin: 'Booking' | 'Manual'
}

export type LegalGroup = { status: LegalStatus; rows: Expense[]; subtotal: number }

const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
const line = (cells: unknown[]) => cells.map(esc).join(',')
const r2 = (n: number) => Math.round(n * 100) / 100

export function buildLegalCsv(opts: { groups: LegalGroup[]; revenue: LegalRevenueRow[]; revenueTotal: number; base: string; href: (path: string | null) => string }): string {
  const out: string[] = []
  out.push(line(['Status', 'Date', 'Supplier', 'Invoice #', 'Category', 'Amount', 'Currency', 'Description', 'Legal Notes', 'Reviewed Date', 'Attachment']))
  for (const g of opts.groups) {
    if (g.rows.length === 0) continue
    for (const e of g.rows) {
      out.push(
        line([
          g.status,
          e.payment_date ?? '',
          e.supplier ?? '',
          e.document_number ?? '',
          [e.category, e.subcategory].filter(Boolean).join(' / '),
          Math.abs(Number(e.amount ?? 0)),
          (e.currency ?? opts.base).toUpperCase(),
          e.description ?? '',
          e.legal_notes ?? '',
          e.legal_reviewed_at ?? '',
          opts.href(e.file_url),
        ]),
      )
    }
    out.push(line([`Subtotal ${g.status}`, '', '', '', '', r2(g.subtotal), opts.base, '', '', '', '']))
  }
  out.push('')
  out.push('REVENUE SHOWN TO LEGAL')
  out.push(line(['Date', 'Source', 'Description', 'Detail', 'Amount', 'Document', 'Invoice']))
  for (const r of opts.revenue) out.push(line([r.date, r.source, r.description, r.detail, r2(r.amount), opts.href(r.file_url), r.invoice_url ? absolute(r.invoice_url) : '']))
  out.push(line(['Total (Legal)', '', '', '', r2(opts.revenueTotal), '', '']))
  return '﻿' + out.join('\r\n')
}

export function absolute(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return typeof window === 'undefined' ? path : `${window.location.origin}${path}`
}

export function downloadText(text: string, filename: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const h = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function buildLegalPrintHtml(opts: {
  propertyName: string
  period: string
  groups: LegalGroup[]
  revenue: LegalRevenueRow[]
  revenueTotal: number
  expenseTotal: number
  counts: Record<LegalStatus, number>
  money: (n: number | null | undefined) => string
  originalMoney: (e: Expense) => string
  date: (d: string | null | undefined) => string
}): string {
  const expenseBlocks = opts.groups
    .filter((g) => g.rows.length > 0)
    .map(
      (g) => `
  <h2>${h(g.status)} <span class="muted">· ${g.rows.length} · ${h(opts.money(g.subtotal))}</span></h2>
  <table><thead><tr><th>Date</th><th>Supplier</th><th>Doc #</th><th>Category</th><th>Description</th><th>Notes</th><th>Reviewed</th><th class="num">Amount</th></tr></thead><tbody>
  ${g.rows
    .map(
      (e) => `<tr><td>${h(opts.date(e.payment_date))}</td><td>${h(e.supplier ?? '')}</td><td>${h(e.document_number ?? '')}</td><td>${h([e.category, e.subcategory].filter(Boolean).join(' / '))}</td><td>${h(e.description ?? '')}</td><td>${h(e.legal_notes ?? '')}</td><td>${h(e.legal_reviewed_at ? opts.date(e.legal_reviewed_at) : '')}</td><td class="num">${h(opts.originalMoney(e))}</td></tr>`,
    )
    .join('')}
  <tr class="total"><td colspan="7">Subtotal ${h(g.status)}</td><td class="num">${h(opts.money(g.subtotal))}</td></tr>
  </tbody></table>`,
    )
    .join('')

  const revenueRows = opts.revenue
    .map((r) => `<tr><td>${h(opts.date(r.date))}</td><td>${h(r.source)}</td><td>${h(r.description)}</td><td>${h(r.detail)}</td><td>${h(r.invoice_number ?? '')}</td><td class="num">${h(opts.money(r.amount))}</td></tr>`)
    .join('')

  return `<!doctype html><html><head><meta charset="utf-8"><title>Legal / Accounting Report · ${h(opts.period)}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#26161A;padding:24px;font-size:12px}
    h1{font-size:20px;margin:0 0 2px}
    h2{font-size:14px;margin:22px 0 6px}
    .meta{color:#7A6368;font-size:12px;margin-bottom:14px}
    .muted{color:#7A6368;font-weight:normal;font-size:12px}
    .kpis{display:flex;flex-wrap:wrap;gap:8px 20px;margin:10px 0 6px}
    .kpis span b{display:block;font-size:14px}
    table{border-collapse:collapse;width:100%;font-size:11px;page-break-inside:auto}
    tr{page-break-inside:avoid}
    th,td{border:1px solid #EADCD8;padding:5px 7px;text-align:left;vertical-align:top}
    th{background:#F5EDE9;text-transform:uppercase;font-size:9px;letter-spacing:.04em;color:#7A6368}
    .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
    tr.total td{font-weight:600;background:#FBF7F5}
    @page{margin:14mm}
  </style></head><body>
  <h1>Legal / Accounting Report</h1>
  <div class="meta">${h(opts.propertyName)} · ${h(opts.period)} · generated ${h(new Date().toLocaleString())}</div>
  <div class="kpis">
    <span>Expenses<b>${opts.groups.reduce((s, g) => s + g.rows.length, 0)} · ${h(opts.money(opts.expenseTotal))}</b></span>
    <span>Pending<b>${opts.counts.Pending}</b></span>
    <span>Accepted<b>${opts.counts.Accepted}</b></span>
    <span>Clarification<b>${opts.counts['Clarification Needed']}</b></span>
    <span>Rejected<b>${opts.counts.Rejected}</b></span>
    <span>Revenue (legal)<b>${h(opts.money(opts.revenueTotal))}</b></span>
  </div>
  ${expenseBlocks || '<p class="muted">No shared expenses in this period.</p>'}
  <h2>Revenue shown to legal <span class="muted">· ${opts.revenue.length}</span></h2>
  <table><thead><tr><th>Date</th><th>Source</th><th>Description</th><th>Detail</th><th>Invoice</th><th class="num">Amount</th></tr></thead><tbody>
  ${revenueRows || '<tr><td colspan="6" class="muted">None</td></tr>'}
  <tr class="total"><td colspan="5">Total (Legal)</td><td class="num">${h(opts.money(opts.revenueTotal))}</td></tr>
  </tbody></table>
  <script>window.onload=function(){window.print()}</script></body></html>`
}

export function openPrintWindow(html: string): boolean {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(html)
  w.document.close()
  return true
}
