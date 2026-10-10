'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { TextField, TextareaField, FormGrid, FormSection, FormError } from '@/components/ui/Field'
import { FileUpload } from '@/components/ui/FileUpload'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { SettingsCard, SaveRow, Note } from '@/components/settings/SettingsCard'
import { fileHref } from '@/lib/storage'
import { formatMoney, formatDate } from '@/lib/format'
import { saveInvoiceSettingsAction } from '@/app/(app)/app/settings/actions'
import type { Organization, InvoiceSettings } from '@/lib/types'

function initial(inv: Partial<InvoiceSettings> | undefined, orgName: string) {
  return {
    prefix: inv?.prefix ?? 'INV',
    company_name: inv?.company_name || orgName,
    address: inv?.address ?? '',
    tax_id: inv?.tax_id ?? '',
    branch: inv?.branch ?? '',
    email: inv?.email ?? '',
    phone: inv?.phone ?? '',
    signatory: inv?.signatory ?? '',
    footer: inv?.footer ?? 'Thank you for staying with us.',
    logo_path: (inv?.logo_path ?? null) as string | null,
  }
}

export function InvoicesClient({ org, propertyName }: { org: Organization; propertyName: string }) {
  const router = useRouter()
  const toast = useToast()
  const { can, baseCurrency, settings, today } = useApp()
  const editable = can('settings', 'edit')
  const [form, setForm] = useState(() => initial(org.settings?.invoice, org.name))
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(initial(org.settings?.invoice, org.name)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const dirty = JSON.stringify(form) !== snapshot

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setErrors({})
    const res = await saveInvoiceSettingsAction(form)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    setSnapshot(JSON.stringify(form))
    toast.success('Invoice settings saved')
    router.refresh()
  }

  const sampleNumber = `${form.prefix || 'INV'}-${today.slice(0, 4)}-0001`
  const logo = fileHref(form.logo_path)
  const vat = Number(settings.vat_rate ?? 0)

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Legal details, numbering prefix and logo printed on every guest invoice." />
      {!editable && <Note className="mb-5">You can view these settings. Changing them needs the Settings → edit permission.</Note>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <form id="invoice-form" onSubmit={submit}>
          <fieldset disabled={!editable} className="contents min-w-0">
            <SettingsCard title="Invoice details" footer={editable && <SaveRow busy={busy} dirty={dirty} form="invoice-form" />}>
              <FormGrid>
                <FormError error={error} />
                <TextField label="Number prefix" required value={form.prefix} onChange={set('prefix')} error={errors.prefix} maxLength={12} hint={`Next numbers look like ${sampleNumber}.`} />
                <TextField label="Company name" value={form.company_name} onChange={set('company_name')} error={errors.company_name} placeholder={org.name} />
                <TextareaField label="Address" rows={3} value={form.address} onChange={set('address')} error={errors.address} containerClassName="sm:col-span-2" placeholder={'Street\nCity, Postcode\nCountry'} />
                <TextField label="Tax ID" value={form.tax_id} onChange={set('tax_id')} error={errors.tax_id} placeholder="0105551234567" />
                <TextField label="Branch" value={form.branch} onChange={set('branch')} error={errors.branch} placeholder="Head office" />
                <TextField label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} placeholder="billing@example.com" />
                <TextField label="Phone" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="+66 …" />
                <FormSection title="Signature and footer">
                  <TextField label="Signatory" value={form.signatory} onChange={set('signatory')} error={errors.signatory} placeholder="Name and title under the signature line" containerClassName="sm:col-span-2" />
                  <TextareaField label="Footer" rows={2} value={form.footer} onChange={set('footer')} error={errors.footer} containerClassName="sm:col-span-2" placeholder="Payment terms, bank details, thank-you note" />
                </FormSection>
                <FormSection title="Logo">
                  <div className="sm:col-span-2">
                    <FileUpload module="branding" label="Logo image" accept="image/*" value={form.logo_path} onChange={(p) => setForm((f) => ({ ...f, logo_path: p }))} />
                    <p className="mt-1 text-xs text-muted">PNG or JPG, ideally wider than tall. Shown top-left of the invoice and on the public invoice page.</p>
                  </div>
                </FormSection>
              </FormGrid>
            </SettingsCard>
          </fieldset>
        </form>

        <div className="card overflow-hidden xl:sticky xl:top-8">
          <div className="border-b border-line bg-surface-2/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted">Preview</div>
          <div className="bg-white p-5 text-[#26161A]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="Logo" className="mb-2 max-h-14 max-w-[9rem] object-contain" />
                ) : (
                  <div className="mb-2 flex h-10 w-24 items-center justify-center rounded border border-dashed border-[#DCC9C4] text-[10px] text-[#7A6368]">No logo</div>
                )}
                <div className="font-semibold leading-tight">{form.company_name || org.name}</div>
                {form.branch && <div className="text-xs text-[#7A6368]">{form.branch}</div>}
                {form.address && <div className="mt-1 whitespace-pre-line text-xs text-[#4A363C]">{form.address}</div>}
                {form.tax_id && <div className="mt-1 text-xs text-[#4A363C]">Tax ID {form.tax_id}</div>}
                {(form.email || form.phone) && <div className="mt-1 text-xs text-[#4A363C]">{[form.email, form.phone].filter(Boolean).join(' · ')}</div>}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-lg font-semibold tracking-wide">INVOICE</div>
                <div className="text-xs text-[#7A6368]">{sampleNumber}</div>
                <div className="text-xs text-[#7A6368]">{formatDate(today)}</div>
              </div>
            </div>
            <div className="my-4 border-t border-[#EADCD8]" />
            <div className="text-xs text-[#7A6368]">Bill to</div>
            <div className="text-sm font-medium">Guest name</div>
            <div className="text-xs text-[#4A363C]">{propertyName} · 3 nights</div>
            <table className="mt-3 w-full text-xs">
              <tbody>
                <tr>
                  <td className="py-1">Accommodation</td>
                  <td className="py-1 text-right tabular">{formatMoney(9000, baseCurrency)}</td>
                </tr>
                {vat > 0 && (
                  <tr className="text-[#7A6368]">
                    <td className="py-1">{settings.prices_include_vat ? `includes VAT ${vat}%` : `VAT ${vat}%`}</td>
                    <td className="py-1 text-right tabular">{formatMoney(settings.prices_include_vat ? (9000 * vat) / (100 + vat) : (9000 * vat) / 100, baseCurrency)}</td>
                  </tr>
                )}
                <tr className="font-semibold">
                  <td className="border-t border-[#EADCD8] py-1.5">Total</td>
                  <td className="border-t border-[#EADCD8] py-1.5 text-right tabular">{formatMoney(settings.prices_include_vat || vat === 0 ? 9000 : 9000 + (9000 * vat) / 100, baseCurrency)}</td>
                </tr>
              </tbody>
            </table>
            {form.signatory && (
              <div className="mt-6 w-40">
                <div className="border-t border-[#26161A]/50 pt-1 text-[11px]">{form.signatory}</div>
              </div>
            )}
            {form.footer && <div className="mt-4 whitespace-pre-line text-[11px] text-[#7A6368]">{form.footer}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
