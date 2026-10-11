import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { formatDate, formatMoney, numberToWords } from '@/lib/format'
import { PrintButton } from '@/components/invoice/PrintButton'
import type { Invoice } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Invoice', robots: { index: false, follow: false } }

// Public, tokenised invoice. The token is an unguessable UUID; no login needed.
export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound()
  const supabase = createAdminSupabase()
  const { data } = await supabase.from('invoices').select('*').eq('public_token', token).maybeSingle()
  if (!data) notFound()
  const inv = data as Invoice
  const issuer = inv.issuer ?? {}
  const cur = inv.currency
  const money = (n: number) => formatMoney(n, cur, { decimals: 2 })

  return (
    <div className="min-h-dvh bg-canvas px-4 py-6 sm:py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between no-print">
          <span className="text-sm text-muted">Invoice {inv.number}</span>
          <PrintButton />
        </div>
        <div className="card overflow-hidden print:border-0 print:shadow-none">
          <div className="gradient-burgundy px-6 py-6 text-white sm:px-10 print:bg-none print:text-black">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-display text-2xl font-semibold">{issuer.company_name || issuer.property_name || 'Invoice'}</div>
                {issuer.property_name && issuer.company_name && <div className="text-sm opacity-80">{issuer.property_name}</div>}
                {issuer.address && <div className="mt-2 whitespace-pre-line text-sm opacity-80">{issuer.address}</div>}
                <div className="mt-1 text-sm opacity-80">
                  {issuer.tax_id && <span>Tax ID {issuer.tax_id}</span>}
                  {issuer.branch && <span> · Branch {issuer.branch}</span>}
                </div>
                <div className="text-sm opacity-80">
                  {issuer.email && <span>{issuer.email}</span>}
                  {issuer.phone && <span> · {issuer.phone}</span>}
                </div>
              </div>
              <div className="sm:text-right">
                <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{inv.vat_rate > 0 ? 'Tax invoice / Receipt' : 'Invoice / Receipt'}</div>
                <div className="font-display text-xl font-semibold">{inv.number}</div>
                <div className="mt-1 text-sm opacity-80">Date {formatDate(inv.issued_date)}</div>
                {inv.status === 'void' && <div className="mt-2 inline-block rounded bg-white/20 px-2 py-0.5 text-xs font-semibold">VOID</div>}
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-10">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <div className="label">Bill to</div>
                <div className="font-semibold">{inv.bill_to?.name}</div>
                {inv.bill_to?.email && <div className="text-sm text-muted">{inv.bill_to.email}</div>}
                {inv.bill_to?.phone && <div className="text-sm text-muted">{inv.bill_to.phone}</div>}
                {inv.bill_to?.passport && <div className="text-sm text-muted">Passport {inv.bill_to.passport}</div>}
              </div>
              <div className="sm:text-right">
                <div className="label">Amount due</div>
                <div className={`font-display text-3xl font-semibold tabular ${inv.balance_due > 0 ? 'text-danger' : 'text-success'}`}>{money(inv.balance_due)}</div>
                <div className="text-xs text-muted">{inv.balance_due > 0 ? 'Balance outstanding' : 'Paid in full'}</div>
              </div>
            </div>

            <table className="mt-8 w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Unit price</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.lines.map((l, i) => (
                  <tr key={i} className="border-b border-line">
                    <td className="py-3">{l.description}</td>
                    <td className="py-3 text-right tabular">{l.quantity}</td>
                    <td className="py-3 text-right tabular">{money(l.unit_price)}</td>
                    <td className="py-3 text-right tabular">{money(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 ml-auto w-full max-w-xs space-y-1.5 text-sm tabular">
              <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{money(inv.subtotal)}</span></div>
              {inv.vat_rate > 0 && (
                <div className="flex justify-between"><span className="text-muted">VAT {inv.vat_rate}%</span><span>{money(inv.vat_amount)}</span></div>
              )}
              <div className="flex justify-between border-t border-line pt-1.5 font-semibold"><span>Total</span><span>{money(inv.total)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Deposit / paid</span><span>− {money(inv.deposit)}</span></div>
              <div className="flex justify-between border-t border-line pt-1.5 text-base font-semibold"><span>Balance due</span><span>{money(inv.balance_due)}</span></div>
            </div>

            <p className="mt-6 text-xs text-muted">
              Amount in words: <span className="font-medium text-ink">{numberToWords(Math.round(inv.total))} {({ THB: 'Baht', EUR: 'Euro', USD: 'US Dollars', GBP: 'Pounds' } as Record<string, string>)[cur] ?? cur} only</span>
              {inv.vat_rate > 0 && ' · VAT included in the price.'}
            </p>

            {inv.notes && <p className="mt-6 whitespace-pre-line text-sm text-ink-2">{inv.notes}</p>}

            {issuer.signatory && (
              <div className="mt-10 flex justify-end">
                <div className="text-center text-sm">
                  <div className="mb-8 border-b border-line-2 w-48" />
                  <div className="font-medium">{issuer.signatory}</div>
                  <div className="text-xs text-muted">Authorised signature</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
